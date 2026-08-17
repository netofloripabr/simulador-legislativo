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

// instagram vazio/null apaga o link (a função no banco trata string vazia
// como null, ver nullif(trim(...), '') na migração).
async function definirLinkCandidato(estado, cargo, chave, instagram) {
  const { error } = await supabaseClient.rpc("admin_definir_instagram_candidato", {
    p_estado: estado, p_cargo: cargo, p_chave: chave, p_instagram: instagram || null,
  });
  return { error };
}
