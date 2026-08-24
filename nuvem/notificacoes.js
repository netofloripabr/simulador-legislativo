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
