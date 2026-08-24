// Desafios 1×1 — duelo entre cédulas depositadas (migração 28). Regras de
// negócio (custo, prêmio, expiração, transições de status) vivem TODAS no
// banco (RPCs security definer) — este arquivo só chama e traduz erro.

async function listarMinhasListasDepositadas(estado) {
  const { data, error } = await supabaseClient
    .from("salvamentos")
    .select("id, nome, codigo, estado, depositado_em")
    .not("depositado_em", "is", null)
    .eq("estado", estado)
    .order("depositado_em", { ascending: false });
  if (error) { console.error("Erro ao listar cédulas depositadas:", error); return []; }
  return data || [];
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

async function criarDesafio(desafiadoId, nome, cedulaId) {
  const { data, error } = await supabaseClient.rpc("criar_desafio", {
    p_desafiado_id: desafiadoId, p_nome: nome, p_cedula_id: cedulaId,
  });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, desafio: data };
}

async function aceitarDesafio(desafioId, cedulaId) {
  const { data, error } = await supabaseClient.rpc("aceitar_desafio", {
    p_desafio_id: desafioId, p_cedula_id: cedulaId,
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
