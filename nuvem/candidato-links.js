// Link de Instagram por candidato — ver nuvem/migracao-24-instagram-candidato.sql.
// Leitura pública (qualquer pessoa, mesmo convidada); escrita só via RPC,
// checada de novo no banco (o front só decide se MOSTRA o botão de editar).

// Busca todos os links de um estado+cargo de uma vez (não um por
// candidato) — é a mesma tela (Seleção) que já lista todos os candidatos
// daquele estado+cargo juntos, então uma consulta só é suficiente. Devolve
// um objeto { [chave]: instagram }, só com quem TEM link definido.
async function obterLinksCandidatos(estado, cargo) {
  const { data, error } = await supabaseClient
    .from("candidato_links")
    .select("chave, instagram")
    .eq("estado", estado)
    .eq("cargo", cargo);
  if (error) { console.error("Erro ao carregar links de Instagram:", error); return {}; }
  const mapa = {};
  (data || []).forEach((linha) => { if (linha.instagram) mapa[linha.chave] = linha.instagram; });
  return mapa;
}

// Dados financeiros (bens/recursos recebidos, TSE) importados em lote pelo
// endpoint público divulgacandcontas.tse.jus.br — ver dados/estados/*.js
// para os candidatos e ferramentas de importação (não há RPC de escrita
// aqui, é só leitura; o preenchimento é manual/administrativo via SQL).
// Devolve { [chave]: { tseId, bens, recebido } }, só com quem TEM tse_id.
async function obterFinanceiroCandidatos(estado, cargo) {
  const { data, error } = await supabaseClient
    .from("candidato_links")
    .select("chave, tse_id, total_de_bens, total_recebido")
    .eq("estado", estado)
    .eq("cargo", cargo)
    .not("tse_id", "is", null);
  if (error) { console.error("Erro ao carregar dados financeiros:", error); return {}; }
  const mapa = {};
  (data || []).forEach((linha) => {
    mapa[linha.chave] = { tseId: linha.tse_id, bens: linha.total_de_bens, recebido: linha.total_recebido };
  });
  return mapa;
}

// Monta a URL pública da página do candidato no TSE a partir do id interno
// (tse_id). SC está sempre na região SUL e na eleição 20322002026 (2026) —
// mesmo padrão usado para todos os cargos do estado.
function linkTseDoCandidato(tseId) {
  return `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/SUL/SC/20322002026/${tseId}/2026/SC`;
}

// instagram vazio/null apaga o link (a função no banco trata string vazia
// como null, ver nullif(trim(...), '') na migração).
async function definirLinkCandidato(estado, cargo, chave, instagram) {
  const { error } = await supabaseClient.rpc("admin_definir_instagram_candidato", {
    p_estado: estado, p_cargo: cargo, p_chave: chave, p_instagram: instagram || null,
  });
  return { error };
}
