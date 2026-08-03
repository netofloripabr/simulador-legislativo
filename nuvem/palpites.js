// CRUD do palpite de cada pessoa + cálculo do quadro de médias (agregação
// pública de todos os palpites). Depende de BASE_2022 (dados/base-2022.js) e
// de cloneBase()/partyVotos() (calculo/eleitoral.js), carregados antes.

// Chave estável do candidato. Prioridade: o campo `id` gravado no dado
// (dados/base-2022.js / dados/candidatos-extra-2022.js) — um código fixo,
// definido uma vez a partir do nome original e nunca recalculado depois. Só
// cai pra gerar a partir do nome atual (menos seguro — muda se o nome mudar)
// quando o candidato ainda não tem `id` gravado. Ver dados/correcoes-nomes.md
// pro motivo disso existir: renomear um candidato (nome de urna vs. registro)
// não pode "perder" os palpites já salvos com o nome antigo.
function chaveCandidato(nome, partido, idFixo) {
  if (idFixo) return idFixo;
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${partido}::${limpo}`;
}

// Monta o array de partidos+candidatos pro editor de palpite, no mesmo
// formato de state.parties, restrito ao escopo escolhido pela pessoa.
//
// vagasPorPartido (opcional): o resultado da tela de boxes (sigla -> número).
// Quando presente, vira a "meta" de vagas de cada partido no checklist — os
// N mais votados de 2022 (N = meta) já entram marcados como eleito, em vez
// de usar sempre o vagas2022 real. Isso é o que conecta as duas telas.
//
// cargo (opcional, default "estadual"): "estadual" | "federal" | "senador".
// uf (opcional, default "SC"): sigla do estado — dados/estados/registro-2022.js
// (RESULTADOS_2022_POR_ESTADO, candidatosEstadoCargo) cobre os 27 estados,
// todos no mesmo formato de dados/base-2022.js (array de {nome, vagas2022,
// candidatos}); [] quando aquele estado não modela o cargo (ex.: Dep.
// Estadual no DF, que elege Distrital em vez disso).
function montarEstadoPalpite(escopo, partidoEscopo, vagasPorPartido, cargo, uf) {
  cargo = cargo || "estadual";
  uf = uf || "SC";
  // Prioriza o pool de candidatos 2026 (real de ata + fictício de
  // preenchimento, ver dados/estados/registro-2026.js) quando já existe pra
  // esse estado+cargo; cai pro histórico puro de 2022 (candidatosEstadoCargo)
  // nos poucos casos sem dado 2026 gerado ainda.
  const origem2026 = (typeof candidatos2026EstadoCargo === "function")
    ? candidatos2026EstadoCargo(uf, CARGO_LABEL[cargo])
    : null;
  const origem = origem2026 || candidatosEstadoCargo(uf, cargo);
  const base = origem.map((p) => ({
    nome: p.nome,
    vagas2022: p.vagas2022,
    candidatos: p.candidatos.map((c) => ({
      id: c.id,
      nome: c.nome,
      nomeUrna: c.nomeUrna || "",
      municipio: c.municipio || "",
      votos2022: c.votos,
      fonte: c.fonte,
      eleito2022: !!c.eleito2022,
      invalidado2022: !!c.invalidado2022,
      motivoInvalidacao: c.motivoInvalidacao,
      partidoOrigem2022: c.partidoOrigem2022 || null,
      partidoOriginal: c.partidoOriginal || p.nome,
    })),
  }));
  const todos = base;
  const partidos = escopo === "partido" ? todos.filter((p) => p.nome === partidoEscopo) : todos;
  return partidos.map((p) => {
    const metaVagas = (vagasPorPartido && vagasPorPartido[p.nome] !== undefined) ? vagasPorPartido[p.nome] : p.vagas2022;
    // Voto de legenda não é uma pessoa — não pode "ocupar" uma das vagas de
    // Deputado eleito, mesmo quando o número de votos dele seria grande o
    // suficiente pra entrar no topo do ranking. Fica de fora da seleção
    // automática (mas continua contando no total de votos do partido).
    const candidatosOrdenados = [...p.candidatos]
      .filter((c) => c.fonte !== "legenda")
      .sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
    const marcarChaves = new Set(candidatosOrdenados.slice(0, metaVagas).map((c) => chaveCandidato(c.nome, p.nome, c.id)));
    return {
      nome: p.nome,
      vagas2022: p.vagas2022,
      metaVagas,
      candidatos: p.candidatos.map((c) => {
        const chave = chaveCandidato(c.nome, p.nome, c.id);
        return {
          chave,
          nome: c.nome,
          nomeUrna: c.nomeUrna || "",
          municipio: c.municipio,
          votos2022: c.votos2022,
          fonte: c.fonte,
          eleito2022: !!c.eleito2022,
          invalidado2022: !!c.invalidado2022,
          partidoOrigem2022: c.partidoOrigem2022 || null,
          partidoOriginal: c.partidoOriginal,
          votos: c.votos2022, // ponto de partida do palpite: o valor real de 2022
          // ponto de partida do modo simplificado: os mais votados de 2022 até
          // a meta de vagas (dos boxes, se houver) entram marcados. Só vale
          // enquanto o partido está no modo "simplificado" — no modo
          // "detalhado" isso é recalculado a partir da votação (ver
          // recalcularMarcados em interface/prospeccao.js).
          marcadoEleito: marcarChaves.has(chave),
        };
      }),
    };
  });
}

async function salvarPalpite(perfilId, partidosPalpite) {
  const { error } = await supabaseClient.from("palpites").upsert({
    perfil_id: perfilId,
    candidatos: partidosPalpite,
    atualizado_em: new Date().toISOString(),
  });
  return { error };
}

async function carregarMeuPalpite(perfilId) {
  const { data, error } = await supabaseClient
    .from("palpites")
    .select("candidatos, vagas_por_partido, atualizado_em")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar palpite:", error);
    return null;
  }
  return data;
}

// vagas por partido é salvo junto do mesmo registro de palpite (coluna
// separada, ver nuvem/schema.sql). Faz um upsert preservando os candidatos
// já salvos, se houver.
async function salvarVagasPorPartido(perfilId, vagasPorPartido) {
  const atual = await carregarMeuPalpite(perfilId);
  const { error } = await supabaseClient.from("palpites").upsert({
    perfil_id: perfilId,
    candidatos: atual ? atual.candidatos : [],
    vagas_por_partido: vagasPorPartido,
    atualizado_em: new Date().toISOString(),
  });
  return { error };
}

// Salva candidatos + vagas_por_partido (derivado dos próprios candidatos
// marcados) num upsert só — usado pela tela única de seleção de candidatos
// (interface/prospeccao.js: renderSelecaoCandidatos), que não trabalha mais
// com vagas_por_partido como fonte separada, só como resumo pro banco.
async function salvarPalpiteCompleto(perfilId, palpiteEdicao) {
  const vagasPorPartido = {};
  palpiteEdicao.forEach((p) => { vagasPorPartido[p.nome] = p.candidatos.filter((c) => c.marcadoEleito).length; });
  const { error } = await supabaseClient.from("palpites").upsert({
    perfil_id: perfilId,
    candidatos: palpiteEdicao,
    vagas_por_partido: vagasPorPartido,
    atualizado_em: new Date().toISOString(),
  });
  return { error };
}

// Rascunho por cargo — autosave contínuo enquanto a pessoa edita (ver
// nuvem/migracao-6-rascunho-por-cargo.sql), pra reabrir o app e continuar
// de onde parou em vez de recomeçar do zero. Diferente de
// salvarPalpiteCompleto/candidatos (que alimenta o Quadro de Médias
// público) e diferente de "listas_salvas" (versões nomeadas que a pessoa
// decide guardar de propósito, ver migracao-5) — isso aqui é só "onde eu
// parei", privado, sobrescrito a cada edição.
const COLUNA_RASCUNHO_POR_CARGO = { estadual: "rascunho_estadual", federal: "rascunho_federal", senador: "rascunho_senador" };

async function salvarRascunhoCargo(perfilId, cargo, lista) {
  const coluna = COLUNA_RASCUNHO_POR_CARGO[cargo];
  if (!coluna) return { error: new Error(`cargo desconhecido: ${cargo}`) };
  // Lê a linha inteira antes de escrever (mesmo cuidado de
  // salvarVagasPorPartido acima) pra não zerar as outras colunas
  // (candidatos, os outros 2 rascunhos) que esse upsert não está mexendo.
  const { data: atual } = await supabaseClient
    .from("palpites")
    .select("candidatos, rascunho_estadual, rascunho_federal, rascunho_senador")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  const { error } = await supabaseClient.from("palpites").upsert({
    perfil_id: perfilId,
    candidatos: atual ? atual.candidatos : [],
    rascunho_estadual: atual ? atual.rascunho_estadual : null,
    rascunho_federal: atual ? atual.rascunho_federal : null,
    rascunho_senador: atual ? atual.rascunho_senador : null,
    [coluna]: lista,
    atualizado_em: new Date().toISOString(),
  });
  return { error };
}

async function carregarRascunhosPorCargo(perfilId) {
  const { data, error } = await supabaseClient
    .from("palpites")
    .select("rascunho_estadual, rascunho_federal, rascunho_senador")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar rascunhos:", error);
    return null;
  }
  return data;
}

// Ponto de partida dos boxes: a distribuição real de 2022 (soma sempre 40).
function vagasPorPartidoPadrao() {
  const vagas = {};
  PARTIDOS_BRASIL.forEach((p) => { vagas[p.sigla] = p.vagas2022; });
  return vagas;
}

async function buscarTodosPalpitesPublicos() {
  const { data, error } = await supabaseClient.from("palpites_publicos").select("*");
  if (error) {
    console.error("Erro ao carregar palpites públicos:", error);
    return [];
  }
  return data || [];
}

// Agrega todos os palpites públicos num único cenário "médio" — mesma forma
// de state.parties, pronto pra alimentar dhondt()/quocienteEleitoral()/
// desenharHemiciclo() já existentes. Cobre os 27 partidos de BASE_2022.
// Partidos/candidatos sem nenhum palpite caem de volta no valor real de 2022
// (marcado como "sem palpites ainda").
function calcularMediaPalpites(palpitesPublicos) {
  const somas = {}; // chave -> { soma, contagem }
  palpitesPublicos.forEach((registro) => {
    (registro.candidatos || []).forEach((partido) => {
      (partido.candidatos || []).forEach((c) => {
        const chave = c.chave || chaveCandidato(c.nome, partido.nome);
        if (!somas[chave]) somas[chave] = { soma: 0, contagem: 0 };
        somas[chave].soma += Number(c.votos) || 0;
        somas[chave].contagem += 1;
      });
    });
  });

  // BASE_2022 já cobre os 27 partidos (ver montarEstadoPalpite acima) —
  // CANDIDATOS_EXTRA_2022 não entra mais aqui, senão duplica partido.
  const partiesMedia = BASE_2022.map((p) => {
    const candidatos = p.candidatos.map((c) => {
      const chave = chaveCandidato(c.nome, p.nome, c.id);
      const agregado = somas[chave];
      const votos = agregado ? Math.round(agregado.soma / agregado.contagem) : c.votos;
      return {
        chave,
        nome: c.nome,
        nomeUrna: c.nomeUrna || "",
        municipio: c.municipio,
        votos2022: c.votos,
        fonte: c.fonte,
        eleito2022: !!c.eleito2022,
        invalidado2022: !!c.invalidado2022,
        votos,
        semPalpites: !agregado,
      };
    });
    return { nome: p.nome, vagas2022: p.vagas2022, candidatos };
  });

  const participantes = new Set(palpitesPublicos.map((r) => r.perfil_id));
  return { parties: partiesMedia, totalPalpites: participantes.size };
}
