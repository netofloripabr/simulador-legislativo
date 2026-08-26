// Desafios 1×1 — duelo sobre um recorte de candidatos (cargo inteiro ou
// escolhidos a dedo), migração 33. Regras de negócio (custo, prêmio,
// expiração, transições de status, validação do recorte) vivem TODAS no
// banco (RPCs security definer) — este arquivo só chama e traduz erro.

// A comparação do desafio É uma cédula com código próprio (mesmo padrão
// de gerarCodigoCedula, nuvem/salvamentos.js), gerada no cliente e só
// validada quanto ao formato no banco — prefixo "DS" pra distinguir de
// "SL" nas telas de suporte/depuração.
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
  await supabaseClient.rpc("expirar_meus_desafios_vencidos");
  const { data, error } = await supabaseClient
    .from("desafios")
    .select("*, criador:criador_id(nome), desafiado:desafiado_id(nome)")
    .order("criado_em", { ascending: false });
  if (error) { console.error("Erro ao listar desafios:", error); return []; }
  return data || [];
}

// escopo: [{chave, nome, partido}, ...] — o recorte travado do duelo.
// meusVotos: [{chave, votos}, ...], mesmas chaves do escopo.
async function criarDesafio(desafiadoId, nome, estado, cargo, escopo, meusVotos) {
  const { data, error } = await supabaseClient.rpc("criar_desafio", {
    p_desafiado_id: desafiadoId, p_nome: nome, p_estado: estado, p_cargo: cargo,
    p_escopo: escopo, p_meus_votos: meusVotos, p_codigo: gerarCodigoDesafio(),
  });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, desafio: data };
}

// meusVotos: [{chave, votos}, ...] — precisa bater exatamente com o
// escopo_candidatos do desafio (o banco valida, não confia no cliente).
async function aceitarDesafio(desafioId, meusVotos) {
  const { data, error } = await supabaseClient.rpc("aceitar_desafio", {
    p_desafio_id: desafioId, p_meus_votos: meusVotos,
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
