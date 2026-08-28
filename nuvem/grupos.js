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

async function sairDoGrupo(grupoId, perfilId) {
  const { error } = await supabaseClient
    .from("grupo_membros").delete().eq("grupo_id", grupoId).eq("perfil_id", perfilId);
  return { error };
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

// (declaração duplicada de contarMembrosGrupo removida em 21/08/2026 —
// esta primeira versão era sobrescrita silenciosamente pela de baixo.)

async function buscarComparacaoGrupo(grupoId) {
  const { data, error } = await supabaseClient
    .from("grupo_comparacao").select("*").eq("grupo_id", grupoId);
  if (error) {
    console.error("Erro ao carregar comparação do grupo:", error);
    return [];
  }
  return data || [];
}

// Qual cédula (salvamento) a pessoa escolheu pra representar ela NESSE
// grupo específico (migração 15) — null = ainda não escolheu nada, cai na
// oficial global (comportamento de sempre).
async function minhaEscolhaNoGrupo(grupoId, perfilId) {
  const { data, error } = await supabaseClient
    .from("grupo_membros")
    .select("salvamento_escolhido_id")
    .eq("grupo_id", grupoId)
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar escolha de cédula do grupo:", error);
    return null;
  }
  return data ? data.salvamento_escolhido_id : null;
}

// Define (ou limpa, passando null) qual cédula depositada representa a
// pessoa nesse grupo — só afeta esse grupo, os outros grupos da pessoa
// continuam como estavam.
async function escolherCedulaGrupo(grupoId, perfilId, salvamentoId) {
  const { error } = await supabaseClient
    .from("grupo_membros")
    .update({ salvamento_escolhido_id: salvamentoId })
    .eq("grupo_id", grupoId)
    .eq("perfil_id", perfilId);
  return { error };
}

// Vagas pagas (migração 24): o dono amplia a capacidade do grupo — 1 vaga
// = 10 créditos, teto de 30 imposto no banco. Devolve { capacidade } ou
// { semSaldo } ou { erro }.
async function ampliarCapacidadeGrupo(grupoId, vagas) {
  const { data, error } = await supabaseClient.rpc("ampliar_capacidade_grupo", {
    p_grupo_id: grupoId, p_vagas: vagas,
  });
  if (error) return { erro: error.message };
  if (data === null) return { semSaldo: true };
  return { capacidade: data };
}

// Total de membros do grupo (pra mostrar "X/N vagas") — count sem baixar
// as linhas. Se a policy não deixar, devolve null e a tela mostra só a
// capacidade.
async function contarMembrosGrupo(grupoId) {
  const { count, error } = await supabaseClient
    .from("grupo_membros")
    .select("*", { count: "exact", head: true })
    .eq("grupo_id", grupoId);
  if (error) return null;
  return count;
}
