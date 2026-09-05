// Desafios 1×1 — duelo sobre um recorte de candidatos (cargo inteiro ou
// escolhidos a dedo), migração 33. Regras de negócio (custo, prêmio,
// expiração, transições de status, validação do recorte) vivem TODAS no
// banco (RPCs security definer) — este arquivo só chama e traduz erro.

// A comparação do desafio É uma cédula com código próprio (mesmo padrão
// de gerarCodigoCedula, nuvem/salvamentos.js), gerada no cliente e só
// validada quanto ao formato no banco — prefixo "DS" pra distinguir de
// "SL" nas telas de suporte/depuração.
// Corre uma promise contra um prazo — usado nas chamadas "preguiçosas"
// que rodam de passagem ao abrir a tela (expiração, lembrete): se o banco
// travar nelas, a tela segue em frente em vez de ficar presa pra sempre
// (bug real visto em 01/09/2026, ligado à função de estorno de créditos).
function _comLimiteDeTempo(promise, ms, rotulo) {
  return Promise.race([
    promise,
    new Promise((_, rejeita) => setTimeout(() => rejeita(new Error(`Tempo esgotado: ${rotulo}`)), ms)),
  ]);
}

function gerarCodigoDesafio() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const sorteia = (n) => Array.from({ length: n }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join("");
  return `DS${sorteia(2)}-${sorteia(4)}`;
}

async function contarMeusDesafiosAtivos() {
  const { data, error } = await supabaseClient.rpc("contar_meus_desafios_ativos");
  if (error) { console.error("Erro ao contar desafios ativos:", error); return 0; }
  return data || 0;
}

async function desafiosGratisRestantes(perfilId) {
  const { data, error } = await supabaseClient.rpc("desafios_gratis_restantes", { p_perfil_id: perfilId });
  if (error) { console.error("Erro ao checar desafios grátis:", error); return 0; }
  return data || 0;
}

// Expira (com estorno) o que já venceu ANTES de listar — mesmo espírito
// preguiçoso de registrarAcessoMediana: quem "cobra" a passagem do tempo
// é a própria visita à tela.
async function listarMeusDesafios() {
  try {
    await _comLimiteDeTempo(supabaseClient.rpc("expirar_meus_desafios_vencidos"), 8000, "expirar desafios vencidos");
  } catch (e) { console.error("Erro/tempo esgotado ao expirar desafios vencidos:", e); }
  // Lembrete de duelo parado (migração 41): 3 dias sem aceite → sino do
  // criador; roda "preguiçoso" aqui pelo mesmo motivo da expiração.
  try { await _comLimiteDeTempo(supabaseClient.rpc("lembrar_meus_desafios_parados"), 8000, "lembrete de duelo parado"); } catch (_) { /* migração 41 ainda não rodada, ou travou — segue sem bloquear a tela */ }
  // Colunas explícitas, SEM as de voto/plenário — a migração 38 revogou o
  // SELECT direto delas (voto oculto é oculto de verdade); quem precisa
  // dos votos usa desafioDetalhe abaixo. select("*") aqui quebraria com
  // "permission denied" pra qualquer usuário.
  const { data, error } = await supabaseClient
    .from("desafios")
    .select("id, criador_id, desafiado_id, nome, estado, cargo, codigo, status, custo_sl, tipo_disputa, votos_visiveis, escopo_candidatos, pontos_criador, pontos_desafiado, vencedor_id, criado_em, respondido_em, expira_em, modelo_de, criador:criador_id(nome), desafiado:desafiado_id(nome)")
    .order("criado_em", { ascending: false });
  if (error) { console.error("Erro ao listar desafios:", error); return []; }
  // Migração 48: convite aberto é um MOLDE — cada aceite vira um duelo
  // novo com modelo_de apontando pro molde. Conta os aceites aqui (os
  // clones são visíveis pro criador, mesma policy de um duelo normal).
  const lista = data || [];
  const aceitesPorMolde = {};
  lista.forEach((d) => { if (d.modelo_de) aceitesPorMolde[d.modelo_de] = (aceitesPorMolde[d.modelo_de] || 0) + 1; });
  lista.forEach((d) => { if (!d.desafiado_id) d.aceites = aceitesPorMolde[d.id] || 0; });
  return lista;
}

// Resolve um link de convite de duelo (?duelo=DSXX-XXXX) — só devolve
// duelo AGUARDANDO que está aberto (sem desafiado) ou endereçado ao
// próprio chamador. Null quando o código não vale mais.
async function desafioPorCodigo(codigo) {
  const { data, error } = await supabaseClient.rpc("desafio_por_codigo", { p_codigo: codigo });
  if (error) { console.error("Erro ao resolver convite de duelo:", error); return null; }
  return data;
}

// O desafio completo, com votos/plenário — única porta pra essas colunas
// (migração 38). O banco mascara votos_criador/eleitos_criador quando o
// duelo é oculto e ainda aguarda resposta do próprio chamador.
async function desafioDetalhe(desafioId) {
  const { data, error } = await supabaseClient.rpc("desafio_detalhe", { p_desafio_id: desafioId });
  if (error) { console.error("Erro ao carregar desafio:", error); return null; }
  return data;
}

// escopo: [{chave, nome, partido}, ...] — o recorte travado do duelo
// (tipos cargo/partido/candidato). meusVotos: [{chave, votos}, ...],
// mesmas chaves do escopo. Pro tipo "eleitos", escopo/votos vão vazios e
// eleitos = [{chave, nome, partido}, ...] é a composição do plenário.
async function criarDesafio(desafiadoId, nome, estado, cargo, escopo, meusVotos, tipo, visiveis, eleitos) {
  const { data, error } = await supabaseClient.rpc("criar_desafio", {
    p_desafiado_id: desafiadoId, p_nome: nome, p_estado: estado, p_cargo: cargo,
    p_escopo: escopo, p_meus_votos: meusVotos, p_codigo: gerarCodigoDesafio(),
    p_tipo: tipo, p_visiveis: visiveis, p_eleitos: eleitos || null,
  });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, desafio: data };
}

// meusVotos: [{chave, votos}, ...] — precisa bater exatamente com o
// escopo_candidatos do desafio (o banco valida, não confia no cliente).
// meusEleitos: só no tipo "eleitos" — mesma quantidade de cadeiras do
// plenário do criador.
async function aceitarDesafio(desafioId, meusVotos, meusEleitos) {
  const { data, error } = await supabaseClient.rpc("aceitar_desafio", {
    p_desafio_id: desafioId, p_meus_votos: meusVotos || [], p_meus_eleitos: meusEleitos || null,
  });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, desafio: data };
}

async function recusarDesafio(desafioId) {
  const { error } = await supabaseClient.rpc("recusar_desafio", { p_desafio_id: desafioId });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true };
}

async function cancelarDesafio(desafioId) {
  const { error } = await supabaseClient.rpc("cancelar_desafio", { p_desafio_id: desafioId });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true };
}

// Resolve o código pessoal de alguém (o mesmo "Menu → Convidar amigos",
// migração 26) pra {id, nome} — permite desafiar sem precisar estar no
// mesmo grupo, migração 34.
async function buscarUsuarioPorCodigo(codigo) {
  const { data, error } = await supabaseClient.rpc("perfil_publico_por_codigo", { p_codigo: codigo });
  if (error) return { ok: false, mensagem: error.message };
  if (!data || !data.length) return { ok: false, mensagem: "Código não encontrado." };
  return { ok: true, usuario: data[0] };
}

// Amigos pra listar na tela de criação: gente do(s) mesmo(s) grupo(s) do
// usuário — reaproveita buscarMeusGrupos/buscarComparacaoGrupo já
// existentes em nuvem/grupos.js, sem tabela nova de "amizade".
async function listarAmigosParaDesafio(meusGrupos) {
  if (!meusGrupos || !meusGrupos.length) return [];
  const vistos = new Map();
  for (const g of meusGrupos) {
    const membros = await buscarComparacaoGrupo(g.id);
    membros.forEach((m) => {
      if (m.perfil_id !== pcState.perfil.id && !vistos.has(m.perfil_id)) {
        vistos.set(m.perfil_id, { id: m.perfil_id, nome: m.nome_exibicao, grupo: g.nome });
      }
    });
  }
  return [...vistos.values()];
}
