// Central de notificações (migração 28) — sino da barra superior +
// central. Escrita é sempre interna (triggers/RPCs do banco); o cliente
// só lê e marca como lida.

async function contarNotificacoesNaoLidas() {
  const { data, error } = await supabaseClient.rpc("contar_notificacoes_nao_lidas");
  if (error) { console.error("Erro ao contar notificações:", error); return 0; }
  return data || 0;
}

async function listarMinhasNotificacoes(limite) {
  const { data, error } = await supabaseClient.rpc("listar_minhas_notificacoes", { p_limite: limite || 30 });
  if (error) { console.error("Erro ao listar notificações:", error); return []; }
  return data || [];
}

async function marcarNotificacoesLidas() {
  const { error } = await supabaseClient.rpc("marcar_notificacoes_lidas");
  if (error) console.error("Erro ao marcar notificações como lidas:", error);
}

// Migração 47 (04/09/2026): a única escrita que NÃO é interna — chamada
// por admin depois de editar dados/estados/*.js (candidato incluído,
// alterado ou excluído), broadcasta uma notificação real pra todos os
// admins. Ver CLAUDE.md, "Mudança no elenco de candidatos".
async function adminNotificarMudancaCandidatos(uf, resumo, detalhe) {
  const { error } = await supabaseClient.rpc("admin_notificar_mudanca_candidatos", { p_uf: uf, p_resumo: resumo, p_detalhe: detalhe || null });
  if (error) console.error("Erro ao notificar mudança no elenco:", error);
  return !error;
}
