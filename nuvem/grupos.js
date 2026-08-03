// CRUD dos grupos privados de comparação (ver nuvem/migracao-8-grupos.sql).
// Depende de supabaseClient (nuvem/cliente.js), carregado antes deste
// arquivo em index.html.

function gerarCodigoConvite() {
  // Sem 0/O/1/I — evita confusão de quem for digitar o código à mão.
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return codigo;
}

async function criarGrupo(perfilId, nome) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigoConvite();
    const { data, error } = await supabaseClient
      .from("grupos")
      .insert({ nome, codigo_convite: codigo, criado_por: perfilId })
      .select()
      .single();
    if (!error) return { data, error: null };
    const colisao = error.code === "23505" || /duplicate|unique/i.test(error.message || "");
    if (!colisao) return { data: null, error };
    // colidiu com um código já existente — tenta de novo com outro
  }
  return { data: null, error: { message: "Não consegui gerar um código único, tente de novo." } };
}

async function entrarNoGrupo(perfilId, codigoDigitado) {
  const codigo = String(codigoDigitado || "").trim().toUpperCase();
  const { data: grupo, error: erroBusca } = await supabaseClient
    .from("grupos").select("*").eq("codigo_convite", codigo).maybeSingle();
  if (erroBusca) return { error: erroBusca };
  if (!grupo) return { error: { message: "Código não encontrado. Confira com quem te convidou." } };
  const { error } = await supabaseClient
    .from("grupo_membros").insert({ grupo_id: grupo.id, perfil_id: perfilId });
  if (error && !/duplicate|unique/i.test(error.message || "")) return { error };
  return { data: grupo, error: null };
}

async function meusGrupos(perfilId) {
  const { data, error } = await supabaseClient
    .from("grupo_membros")
    .select("entrou_em, grupos(id, nome, codigo_convite, criado_por, criado_em)")
    .eq("perfil_id", perfilId);
  if (error) {
    console.error("Erro ao carregar grupos:", error);
    return [];
  }
  return data.map((r) => r.grupos).filter(Boolean);
}

async function contarMembrosGrupo(grupoId) {
  const { count, error } = await supabaseClient
    .from("grupo_membros")
    .select("*", { count: "exact", head: true })
    .eq("grupo_id", grupoId);
  if (error) {
    console.error("Erro ao contar membros:", error);
    return 0;
  }
  return count || 0;
}

async function buscarComparacaoGrupo(grupoId) {
  const { data, error } = await supabaseClient
    .from("grupo_comparacao").select("*").eq("grupo_id", grupoId);
  if (error) {
    console.error("Erro ao carregar comparação do grupo:", error);
    return [];
  }
  return data || [];
}
