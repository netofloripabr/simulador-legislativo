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
  // REGRA MESTRA (21/08/2026): onde EXISTE elenco 2026, o de 2022 JAMAIS
  // pode aparecer no lugar dele. O fallback abaixo é legítimo só pros
  // estados que ainda não têm dado 2026 gerado — pra SC, cair aqui
  // significa que sc-2026-provisorio.js falhou em carregar (ex.: erro de
  // sintaxe no gerador, 'const' em vez de 'var') e o app estaria vestindo
  // candidatos de 2022 como se fossem de 2026. Grita alto no console pra
  // nunca mais passar despercebido.
  const UFS_COM_DADO_2026 = ["SC"];
  if (!origem2026 && UFS_COM_DADO_2026.includes(uf)) {
    console.error(`REGRA MESTRA VIOLADA: ${uf}/${cargo} deveria ter elenco 2026 e caiu no fallback de 2022 — sc-2026-provisorio.js não carregou ou está quebrado.`);
  }
  const origem = origem2026 || candidatosEstadoCargo(uf, cargo);
  const base = origem.map((p) => ({
    nome: p.nome,
    vagas2022: p.vagas2022,
    // Partido sem nenhuma ata de 2026 processada — card vazio e bloqueado
    // na Seleção ("não registrou ata"), ver registro-2026.js. Propagado
    // aqui pra chegar até pcState.palpiteEdicao.
    semAta2026: !!p.semAta2026,
    temAtaOutroCargo: !!p.temAtaOutroCargo,
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
      status: c.status || null,
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
      .filter((c) => c.fonte !== "legenda" && !c.status)
      .sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
    const marcarChaves = new Set(candidatosOrdenados.slice(0, metaVagas).map((c) => chaveCandidato(c.nome, p.nome, c.id)));
    return {
      nome: p.nome,
      vagas2022: p.vagas2022,
      semAta2026: !!p.semAta2026,
      temAtaOutroCargo: !!p.temAtaOutroCargo,
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
          status: c.status || null,
          // ponto de partida do palpite: o valor real de 2022 — exceto
          // candidatura congelada (desistência/sub judice), que nasce em 0
          votos: c.status ? 0 : c.votos2022,
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

async function salvarRascunhoCargo(perfilId, cargo, lista, estado) {
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
  const linha = {
    perfil_id: perfilId,
    candidatos: atual ? atual.candidatos : [],
    rascunho_estadual: atual ? atual.rascunho_estadual : null,
    rascunho_federal: atual ? atual.rascunho_federal : null,
    rascunho_senador: atual ? atual.rascunho_senador : null,
    [coluna]: lista,
    atualizado_em: new Date().toISOString(),
  };
  // Estado dos rascunhos (migração 27, auditoria dos 27 estados) — só
  // manda a coluna se veio; em banco sem a migração o upsert sem ela
  // continua funcionando igual.
  if (estado) linha.estado = estado;
  let { error } = await supabaseClient.from("palpites").upsert(linha);
  if (error && estado && /estado/.test(String(error.message))) {
    // Banco ainda sem a coluna (migração 27 não rodada) — regrava sem ela.
    delete linha.estado;
    ({ error } = await supabaseClient.from("palpites").upsert(linha));
  }
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



// Igual a buscarTodosPalpitesPublicos, mas via "rascunhos_publicos"
// (Migração 7) — cobre os 3 cargos (rascunho_estadual/federal/senador) de
// TODA pessoa cadastrada, não só o último cargo depositado por cada uma.
// Alimenta calcularMedianaPalpites abaixo.
async function buscarTodosRascunhosPublicos() {
  const { data, error } = await supabaseClient.from("rascunhos_publicos").select("*");
  if (error) {
    console.error("Erro ao carregar rascunhos públicos:", error);
    return [];
  }
  return data || [];
}

// Mediana aparada: ordena as amostras, descarta os 10% mais altos e mais
// baixos ANTES de tirar a mediana — protege contra um BLOCO de respostas
// extremas na mesma direção (ex.: 15% de gente testando número aleatório
// alto), coisa que a mediana pura sozinha já resiste bem a outlier ISOLADO,
// mas não a um bloco assim. Só apara com amostra suficiente (N≥10) —
// combinado e confirmado com o usuário em 04/08/2026: abaixo disso, aparar
// 10% de cada ponta pode sobrar pouca coisa (ou nada) pra calcular em cima.
function medianaAparada(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = ordenados.length;
  if (n === 0) return 0;
  const apara = n >= 10 ? Math.floor(n * 0.1) : 0;
  const aparados = apara > 0 ? ordenados.slice(apara, n - apara) : ordenados;
  const m = aparados.length;
  const meio = Math.floor(m / 2);
  return m % 2 === 0 ? Math.round((aparados[meio - 1] + aparados[meio]) / 2) : aparados[meio];
}

// Mesma forma de retorno de calcularMediaPalpites (parties/totalPalpites,
// pronta pra dhondt()/quocienteEleitoral()/desenharHemiciclo()) — mas cada
// candidato usa a MEDIANA APARADA dos votos que todo mundo deu pra ele em
// vez da média simples. "amostras" (quantas pessoas votaram nesse
// candidato específico) e "semPalpites" vão junto, pra tela poder mostrar
// o tamanho da amostra por trás do número.
function calcularMedianaPalpites(registros, cargo, uf) {
  cargo = cargo || "estadual";
  uf = uf || "SC";
  const amostras = {}; // chave -> [votos...]
  registros.forEach((r) => {
    (r[`rascunho_${cargo}`] || []).forEach((partido) => {
      (partido.candidatos || []).forEach((c) => {
        const chave = c.chave || chaveCandidato(c.nome, partido.nome);
        if (!amostras[chave]) amostras[chave] = [];
        amostras[chave].push(Number(c.votos) || 0);
      });
    });
  });

  const baseCargo = candidatosEstadoCargo(uf, cargo);
  const partiesMediana = baseCargo.map((p) => {
    const candidatos = p.candidatos.map((c) => {
      const chave = chaveCandidato(c.nome, p.nome, c.id);
      const valores = amostras[chave];
      // Sem fallback pro voto de 2022 (removido a pedido do usuário,
      // 16/08/2026) — a Mediana é só a mediana dos palpites de verdade
      // (inclusive dos 155 usuários fictícios), nunca dado da eleição
      // passada. Quem ainda não recebeu nenhum palpite entra com 0.
      const votos = valores && valores.length ? medianaAparada(valores) : 0;
      return {
        chave, nome: c.nome, nomeUrna: c.nomeUrna || "", municipio: c.municipio,
        votos2022: c.votos, fonte: c.fonte, eleito2022: !!c.eleito2022, invalidado2022: !!c.invalidado2022,
        votos, amostras: valores ? valores.length : 0, semPalpites: !valores || !valores.length,
      };
    });
    return { nome: p.nome, vagas2022: p.vagas2022, candidatos };
  });

  const participantes = new Set(registros.map((r) => r.perfil_id));
  return { parties: partiesMediana, totalPalpites: participantes.size };
}

// Projeta quem seria eleito a partir de uma agregação já calculada
// (calcularMedianaPalpites) — reaproveita a MESMA regra eleitoral do resto
// do app: proporcional (quociente + D'Hondt, dhondtComCorte) pra
// Estadual/Federal, majoritário (mais votado individual, juntando todos os
// partidos numa fila só) pro Senador — mesmo motivo do branch em
// classificarEleitosPorPartido (interface/prospeccao.js, achado em
// 04/08/2026). Devolve tudo ordenado por votos (eleitos misturados com os
// mais próximos da vaga — "suplentes"), cada item com `eleito:true/false`.
function projetarEleitosMediana(parties, cargo, uf, limiteExibicao) {
  const totalVagasCargo = vagasFixasCargo(uf, cargo);
  let resultado = [];

  if (cargo === "senador") {
    const todos = [];
    // Mesmo filtro de classificarEleitosMajoritario (interface/prospeccao.js)
    // — voto de legenda não é uma pessoa, não pode "ganhar vaga" aqui.
    // Nenhum dado de Senador carregado hoje tem fonte:"legenda", mas sem
    // esse filtro um dado futuro assim poderia concorrer por engano —
    // achado pela auditoria eleitoral em 05/08/2026.
    parties.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todos.push({ ...c, partido: p.nome })));
    const ordenados = [...todos].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    resultado = ordenados.map((c, i) => ({ ...c, eleito: i < totalVagasCargo }));
  } else {
    const { counts } = dhondtComCorte(parties, totalVagasCargo);
    parties.forEach((p, i) => {
      const cadeiras = counts[i] || 0;
      const ordenados = [...p.candidatos].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      ordenados.forEach((c, j) => resultado.push({ ...c, partido: p.nome, eleito: j < cadeiras }));
    });
    resultado.sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  }

  if (!limiteExibicao) return resultado;
  // O corte de limiteExibicao NUNCA pode esconder um eleito de verdade —
  // achado pela auditoria eleitoral em 05/08/2026: cortar "cego" pela
  // posição no ranking geral de votos individuais escondia eleitos de
  // partido pequeno/eficiente no D'Hondt (que elege gente com voto
  // individual mais baixo que muito não-eleito de partido grande),
  // quebrando a promessa de a lista bater com o hemiciclo. Todo eleito
  // sempre entra; o limite só reduz quantos suplentes (não-eleitos, os
  // mais votados primeiro) completam a lista.
  const eleitos = resultado.filter((c) => c.eleito);
  const naoEleitos = resultado.filter((c) => !c.eleito);
  const vagasSuplentes = Math.max(0, limiteExibicao - eleitos.length);
  return [...eleitos, ...naoEleitos.slice(0, vagasSuplentes)]
    .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
}

// Busca o rascunho público (3 cargos) de UMA pessoa — usado pelo link de
// Compartilhar (ver renderCompartilhado em interface/prospeccao.js) e por
// buscarComparacaoGrupo (nuvem/grupos.js). Diferente de
// buscarTodosPalpitesPublicos: essa vem de "rascunhos_publicos"
// (nuvem/migracao-7-rascunhos-publicos.sql), que cobre os 3 cargos —
// "palpites_publicos" só guarda o último cargo depositado.
async function buscarRascunhoPublicoDe(perfilId) {
  const { data, error } = await supabaseClient
    .from("rascunhos_publicos")
    .select("*")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar rascunho público:", error);
    return null;
  }
  return data;
}

