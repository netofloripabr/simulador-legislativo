// CRUD dos "salvamentos" nomeados — versões nomeadas de uma prospecção que
// a pessoa decide guardar de propósito (ver nuvem/migracao-5-listas-salvas.sql),
// diferente de "palpites" (nuvem/palpites.js: 1 linha por pessoa, sobrescrita
// a cada depósito) e diferente do autosave "rascunho_<cargo>" (privado, "onde
// eu parei"). Um salvamento é 1 nome + 1 estado + os 3 cargos (Estadual/
// Federal/Senador) daquele estado, guardados juntos e apagados/comparados
// juntos. Depende de supabaseClient (nuvem/cliente.js), carregado antes
// deste arquivo em index.html.
//
// Dois momentos distintos, não confundir (ver comentário grande no topo de
// nuvem/migracao-5-listas-salvas.sql pro porquê):
//   - "Salvar" (tela de Revisão) = salvarSalvamento, sempre editável, sem
//     compromisso, quantas vezes a pessoa quiser. Nasce com oficial:false.
//   - "Depositar cédula" (painel principal) = depositarSalvamento, escolhe
//     UM salvamento já existente e o torna definitivo (depositado_em
//     preenchido) — a partir daí, nem o dono consegue mais editar aquele
//     salvamento nem as listas de cargo dentro dele (travado no banco via
//     RLS, ver migração 5 — não é só uma trava de tela).
//
// Ligado a interface/prospeccao.js (renderMinhasListas, executarSalvarLista)
// desde 08/08/2026 — só pra CONTA LOGADA (pcState.perfil). Convidado
// continua usando o armazenamento local (carregarListasSalvasLocais etc.,
// em interface/prospeccao.js) porque "salvamentos.perfil_id" exige uma
// conta de verdade — sem cadastro não tem onde gravar isso no banco.
// Requer que nuvem/migracao-5-listas-salvas.sql já tenha rodado no
// Supabase (ver topo daquele arquivo pro texto exato a colar).

const CARGOS_SALVAMENTO = ["estadual", "federal", "senador"];

// Cria um salvamento novo com os 3 cargos de uma vez.
//
// palpitesPorCargo: { estadual: [...], federal: [...], senador: [...] } —
// mesmo formato de pcState.palpitesPorCargo (interface/prospeccao.js,
// garantirPalpitesPorCargo), cada lista no formato de state.parties.
// Os 3 cargos são obrigatórios (mesmo que algum esteja vazio/zerado) —
// "listas_salvas.cargo" tem CHECK fixo nos 3 valores, e a Revisão sempre
// monta os 3 juntos (ver garantirPalpitesPorCargo).
//
// opts.oficial (default false): "Salvar" não implica mais "vale pra
// verdade" — por padrão este salvamento nasce como só mais uma versão
// nomeada, sem mexer no que já está oficial pra aquele estado. Só
// depositarSalvamento (abaixo) marca oficial:true de verdade, junto com
// depositado_em. Passar opts.oficial:true aqui força a marcação sem
// depositar (existe pra flexibilidade, mas não é o caminho normal do
// produto — o caminho normal pra "isto vale" é depositar).
//
// Não é atômico (2 chamadas separadas ao Supabase: insere o salvamento,
// depois as 3 listas) — se a segunda falhar, desfaz a primeira (apaga o
// salvamento órfão) em vez de deixar um salvamento "vazio" (sem nenhum
// cargo) salvo. Uma função Postgres (rpc, transação de verdade) resolveria
// isso com mais segurança, mas fica pra quando este fluxo estiver validado
// em uso — ver mesmo tipo de ressalva em salvarVagasPorPartido/
// salvarRascunhoCargo (nuvem/palpites.js), que também fazem leitura+escrita
// em passos separados.
async function salvarSalvamento(perfilId, estado, nome, palpitesPorCargo, opts) {
  const oficial = opts && typeof opts.oficial === "boolean" ? opts.oficial : false;

  const { data: salvamento, error: erroSalvamento } = await supabaseClient
    .from("salvamentos")
    .insert({ perfil_id: perfilId, estado, nome, oficial })
    .select()
    .single();
  if (erroSalvamento) return { data: null, error: erroSalvamento };

  const linhas = CARGOS_SALVAMENTO.map((cargo) => ({
    salvamento_id: salvamento.id,
    cargo,
    candidatos: palpitesPorCargo[cargo] || [],
  }));
  const { error: erroListas } = await supabaseClient.from("listas_salvas").insert(linhas);
  if (erroListas) {
    // Compensa a inserção anterior — sem isso sobraria um salvamento sem
    // nenhum cargo dentro, quebrando a garantia de "sempre 3 linhas".
    await supabaseClient.from("salvamentos").delete().eq("id", salvamento.id);
    return { data: null, error: erroListas };
  }

  return { data: salvamento, error: null };
}

// Lista os salvamentos de uma pessoa (metadados só — sem os candidatos, que
// podem ser pesados) pra montar uma tela tipo "Meus salvamentos", mais
// recente primeiro.
async function carregarSalvamentosDe(perfilId) {
  const { data, error } = await supabaseClient
    .from("salvamentos")
    .select("id, estado, nome, oficial, depositado_em, anonimo, criado_em, codigo")
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: false });
  if (error) {
    console.error("Erro ao carregar salvamentos:", error);
    return [];
  }
  return data || [];
}

// Atualiza os 3 cargos de um salvamento JÁ EXISTENTE (upsert por
// salvamento_id+cargo, aproveitando a unique constraint da migração 5) —
// usado quando "Salvar" é clicado de novo pra uma lista que já tem id
// (edição da mesma lista, não uma lista nova). Diferente de
// salvarSalvamento (que sempre cria linha nova). Bloqueado pela RLS se o
// salvamento já estiver depositado, mesma trava de sempre.
async function atualizarSalvamento(salvamentoId, palpitesPorCargo) {
  const linhas = CARGOS_SALVAMENTO.map((cargo) => ({
    salvamento_id: salvamentoId,
    cargo,
    candidatos: palpitesPorCargo[cargo] || [],
  }));
  const { error } = await supabaseClient.from("listas_salvas").upsert(linhas, { onConflict: "salvamento_id,cargo" });
  return { error };
}

// Carrega um salvamento inteiro (metadados + os 3 cargos), pronto pra abrir
// pra edição/impressão ou pra um dos dois lados de uma comparação.
// Devolve null se o id não existir (ou não for visível pela RLS).
async function carregarSalvamentoCompleto(salvamentoId) {
  const { data: salvamento, error: erroSalvamento } = await supabaseClient
    .from("salvamentos")
    .select("id, perfil_id, estado, nome, oficial, criado_em")
    .eq("id", salvamentoId)
    .maybeSingle();
  if (erroSalvamento || !salvamento) {
    if (erroSalvamento) console.error("Erro ao carregar salvamento:", erroSalvamento);
    return null;
  }

  const { data: listas, error: erroListas } = await supabaseClient
    .from("listas_salvas")
    .select("cargo, candidatos")
    .eq("salvamento_id", salvamentoId);
  if (erroListas) {
    console.error("Erro ao carregar listas do salvamento:", erroListas);
    return null;
  }

  const cargos = { estadual: [], federal: [], senador: [] };
  (listas || []).forEach((l) => { cargos[l.cargo] = l.candidatos; });
  return { ...salvamento, cargos };
}

// Marca um salvamento como oficial SEM depositar (o trigger
// salvamentos_oficial_unica cuida de desmarcar o anterior da mesma
// pessoa+estado automaticamente). Diferente de depositarSalvamento: isto só
// troca "o que conta agora" no Quadro de Médias — o salvamento continua
// editável depois (depositado_em não é tocado). Bloqueado pela RLS se o
// salvamento já estiver depositado (não deveria acontecer via UI, já que um
// depositado não aparece como opção de "tornar oficial" de novo, mas a
// trava real é no banco).
async function marcarSalvamentoOficial(salvamentoId) {
  // .select() depois do update pra pegar o mesmo caso de "RLS bloqueou sem
  // gerar erro" já corrigido em excluirSalvamento — sem isso, tentar marcar
  // como oficial um salvamento de outra pessoa (ou já depositado por engano)
  // pareceria "sucesso" sem ter mudado nada.
  const { data, error } = await supabaseClient.from("salvamentos").update({ oficial: true }).eq("id", salvamentoId).select();
  if (error) return { error };
  if (!data || !data.length) return { error: { message: "Não foi possível marcar essa lista como oficial." } };
  return { error: null };
}

// "Depositar cédula": torna um salvamento definitivo. Marca depositado_em
// (timestamp de agora) e oficial:true na mesma chamada — depositar sempre
// promove aquele salvamento a "o que vale" pro estado dele (não faz sentido
// depositar uma cédula e ela não contar). A partir daqui a RLS bloqueia
// qualquer update futuro neste salvamento e nas listas de cargo dentro dele
// (nem o próprio dono edita mais — ver migração 5), então isto só deve ser
// chamado depois de confirmação explícita da pessoa na tela (ação
// irreversível, "não pode mais mudar de ideia").
//
// anonimo (default false): a pessoa escolhe NA HORA de depositar se quer
// aparecer com nome ou como "Participante anônimo" nas views públicas
// (listas_salvas_publicas) — é uma escolha por cédula, não da conta
// inteira. Pedido do usuário em 07/08/2026.
//
// Se o salvamento já estiver depositado (chamado de novo por engano, ex.:
// duplo clique), a RLS não encontra a linha pra atualizar e o Supabase
// devolve erro "no rows" — trate isso na tela como "já estava depositado",
// não como falha de rede.
// Código curto da cédula (ex.: "SL7X-2K9Q") — usado pra compartilhar e,
// depois, pra consulta pública por código. Mesmo alfabeto/estilo do código
// de convite de grupo (gerarCodigoConvite, nuvem/grupos.js): sem 0/O/1/I,
// pra ninguém confundir na hora de digitar à mão.
function gerarCodigoCedula() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const sorteia = (n) => Array.from({ length: n }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join("");
  return `SL${sorteia(2)}-${sorteia(4)}`;
}

async function depositarSalvamento(salvamentoId, anonimo) {
  // Gera o código só agora (nunca antes do depósito) e tenta de novo em
  // caso de colisão rara com um código já existente (mesmo padrão de
  // criarGrupo, nuvem/grupos.js) — a constraint de unicidade é quem decide
  // se colidiu, não uma checagem prévia (evita corrida entre checar e salvar).
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigoCedula();
    const { data, error } = await supabaseClient
      .from("salvamentos")
      .update({ depositado_em: new Date().toISOString(), oficial: true, anonimo: !!anonimo, codigo })
      .eq("id", salvamentoId)
      .select()
      .single();
    if (!error) return { data, error: null };
    const colisao = error.code === "23505" || /duplicate|unique/i.test(error.message || "");
    if (!colisao) return { data: null, error };
  }
  return { data: null, error: { message: "Não consegui gerar um código único pra essa cédula. Tente depositar de novo." } };
}

async function renomearSalvamento(salvamentoId, novoNome) {
  // Mesmo ajuste de marcarSalvamentoOficial/excluirSalvamento: sem
  // .select(), um rename bloqueado pela RLS (lista de outra pessoa, ou já
  // depositada) voltava "sem erro" mesmo sem ter mudado nada no banco.
  const { data, error } = await supabaseClient.from("salvamentos").update({ nome: novoNome }).eq("id", salvamentoId).select();
  if (error) return { error };
  if (!data || !data.length) return { error: { message: "Não foi possível renomear essa lista." } };
  return { error: null };
}

// Apaga o salvamento e as 3 listas de cargo junto (on delete cascade, ver
// migração) — se este era o oficial, o estado fica sem nenhum salvamento
// oficial daquele estado (ninguém é promovido automaticamente; é decisão da
// pessoa marcar outro como oficial depois, via marcarSalvamentoOficial).
//
// Decidido em 08/08/2026: salvamento depositado NÃO pode ser excluído
// (RLS "salvamentos_delete_proprio" já bloqueia isso no banco). O Supabase
// não devolve erro quando a RLS simplesmente não acha nenhuma linha pra
// apagar — só apaga 0 linhas silenciosamente — por isso o .select() abaixo:
// sem ele, tentar excluir um depositado pareceria "sucesso" pra tela sem
// ter apagado nada de verdade.
async function excluirSalvamento(salvamentoId) {
  const { data, error } = await supabaseClient.from("salvamentos").delete().eq("id", salvamentoId).select();
  if (error) return { error };
  if (!data || !data.length) return { error: { message: "Essa lista já foi depositada — não dá mais pra excluir." } };
  return { error: null };
}

// Busca os salvamentos OFICIAIS de todo mundo, pro Quadro de Médias — 1
// linha por pessoa+estado, já com os 3 cargos juntos (lista_estadual/
// lista_federal/lista_senador), via listas_salvas_publicas (migração 5).
// Mesmo uso de buscarTodosPalpitesPublicos/buscarTodosRascunhosPublicos
// (nuvem/palpites.js), mas cobrindo o modelo de "salvamentos nomeados" em
// vez do palpite único ou do rascunho de trabalho em progresso.
async function buscarSalvamentosPublicosOficiais(estado) {
  let query = supabaseClient.from("listas_salvas_publicas").select("*");
  if (estado) query = query.eq("estado", estado);
  const { data, error } = await query;
  if (error) {
    console.error("Erro ao carregar salvamentos públicos:", error);
    return [];
  }
  return data || [];
}
