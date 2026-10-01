// Painel da tela de Resultados salvo na conta (migração 57, 01/10/2026).
// Uma linha por perfil com o mesmo JSON que o app guarda no aparelho.
async function painelResultadosCarregar(perfilId) {
  if (!supabaseClient || !perfilId) return null;
  const { data, error } = await supabaseClient.from("painel_resultados").select("dados, atualizado_em").eq("perfil_id", perfilId).maybeSingle();
  if (error) { console.warn("painel: carregar", error.message); return null; }
  return data;
}
async function painelResultadosSalvar(perfilId, dados) {
  if (!supabaseClient || !perfilId) return false;
  const { error } = await supabaseClient.from("painel_resultados").upsert({ perfil_id: perfilId, dados, atualizado_em: new Date().toISOString() }, { onConflict: "perfil_id" });
  if (error) { console.warn("painel: salvar", error.message); return false; }
  return true;
}
