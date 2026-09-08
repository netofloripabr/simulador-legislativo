// Seleção de candidatos (montar o palpite): painel eleitoral, Senador (faders
// + alça mestra), Deputados (cards de partido com faders aninhados), projeções,
// busca, auto-preenchimento/zerar e listeners. Ordem de carga no index.html.

// ---------- Seleção de candidatos: painel eleitoral + sanfona por partido ----------
// Tela única que substitui os antigos "boxes" (só número de vagas) e o
// checklist separado: aqui a pessoa já marca os candidatos específicos e,
// se quiser, a votação de cada um, com a referência de 2022 ao lado. Opera
// direto em pcState.palpiteEdicao (nuvem/palpites.js: montarEstadoPalpite).



function fatorCrescimentoEleitorado() {
  // Por estado quando a tabela oficial tem a UF (REF_ELEITORADO_POR_UF,
  // dados/base-2022.js); sem entrada, a razão de SC serve de aproximação
  // nacional até os dados dos 27 serem preenchidos (auditoria 21/08).
  const r = typeof refEleitoradoDe === "function" ? refEleitoradoDe(pcState.estado) : null;
  if (r && r.eleitorado2026) return r.eleitorado2026 / r.eleitorado2022;
  return ELEITORADO_2026 / REF_2022.eleitorado;
}

// Votos válidos do ESTADO inteiro projetados pra 2026 pela metodologia
// oficial (comparecimento 2022 − brancos − nulos, × crescimento do
// eleitorado) — null quando a UF ainda não tem entrada na tabela; quem
// chama cai em totalValidosProjetado2026 (projeção pelos partidos
// modelados). Antes era um `estado === "SC"` cravado em 3 lugares.
function validosOficiaisProjetados() {
  const r = typeof refEleitoradoDe === "function" ? refEleitoradoDe(pcState.estado) : null;
  if (!r) return null;
  // Sem aptos-2026 oficial da UF, cresce pelo proxy nacional (razão de SC).
  const fator = r.eleitorado2026 ? (r.eleitorado2026 / r.eleitorado2022) : (ELEITORADO_2026 / REF_2022.eleitorado);
  return (r.comparecimento2022 - r.brancos2022 - r.nulos2022) * fator;
}

// Total de votos válidos PROJETADO pra 2026, mas CONFINADO aos partidos que
// o simulador de fato modela pro cargo/estado ativo — soma o voto real de
// 2022 de cada candidato carregado (candidatosEstadoCargo) e escala pelo
// crescimento do eleitorado. Importante usar essa versão confinada, não o
// total válido do estado inteiro: ~14 partidos pequenos de SC não têm
// cadeira eleita e não estão carregados aqui, então o total "cheio"
// embute uma fatia de votos que este simulador nunca vai conseguir
// preencher — usar ele como meta faria a automação inflar os partidos
// modelados além do realista. É uma referência FIXA (não muda com o que a
// pessoa vai preenchendo), diferente do quociente ATUAL (calculado só com a
// votação já digitada, que começa bem menor e sobe conforme mais partidos
// são preenchidos).
function totalValidosProjetado2026(cargo) {
  const totalValidos2022 = (candidatosEstadoCargo(pcState.estado, cargo || pcState.cargoAtivo) || [])
    .reduce((s, p) => s + p.candidatos.reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
  return totalValidos2022 * fatorCrescimentoEleitorado();
}

// dados/partidos-brasil.js guarda a sigla de alguns partidos por extenso ou
// com grafia diferente da usada no resto do app (ex.: "Podemos" em vez de
// "PODE", "Novo" em vez de "NOVO") — sem isso, a busca abaixo não encontra o
// registro e o app cai num fallback bem menos confiável (soma só a fatia dos
// candidatos de 2026 que casaram com 2022, em vez do total oficial do
// partido inteiro).
const PARTIDO_SIGLA_ALIAS = {
  NOVO: "Novo",
  PODE: "Podemos",
  "UNIÃO": "União Brasil",
  REPUBLICANOS: "Republicanos",
  AVANTE: "Avante",
  PATRIOTA: "Patriota",
  "PC do B": "PCdoB",
  REDE: "Rede",
  CIDADANIA: "Cidadania",
  SOLIDARIEDADE: "Solidariedade",
};

// Referência de 2022 no nível do partido (votos totais + vagas) — vem da
// lista oficial (dados/partidos-brasil.js), que cobre os 27 partidos, não só
// os 13 que elegeram alguém. Partidos adicionados manualmente pela pessoa
// (sem essa referência) caem no fallback dentro de cada função abaixo.
function partido2022Ref(nomePartido) {
  return PARTIDOS_BRASIL.find((p) => p.sigla === nomePartido)
    || PARTIDOS_BRASIL.find((p) => p.sigla === PARTIDO_SIGLA_ALIAS[nomePartido])
    || null;
}

// Soma a votação real de 2022 de um GRUPO (pode ser federação, "PT / PC
// do B / PV" — soma cada sigla separada). Usada tanto no auto-preenchimento
// do Senador (forçaDoGrupo, mesma ideia) quanto na referência visível no
// card do partido — pedido do usuário 25/08/2026: "ajudava a orientar a
// quantidade de votos do partido na barra de 2026", tinha sumido do card.
function votos2022DoGrupo(nomeGrupo) {
  return String(nomeGrupo).split("/").reduce((s, sigla) => {
    const ref = partido2022Ref(sigla.trim());
    return s + (ref && Number(ref.votos2022) > 0 ? Number(ref.votos2022) : 0);
  }, 0);
}

// Total de vagas do cargo ativo — 40 pra Dep. Estadual, 16 pra Dep. Federal,
// 1 pro Senador (SC/2022). Vem de vagasFixasCargo (dados/estados/registro-2022.js),
// nunca de pcState.palpiteEdicao: esse número é fixo por lei, não pode
// variar conforme quantos partidos já têm ata de 2026 processada.
function totalVagasCargoAtivo() {
  if (!pcState.palpiteEdicao) return 0;
  return vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
}

function totalMarcadosCargoAtivo() {
  if (!pcState.palpiteEdicao) return 0;
  return pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).length, 0);
}

// Não dá pra eleger mais gente do que existe cadeira — trava o total geral
// (somando todos os partidos), não o de um partido isolado: um partido pode
// legitimamente crescer além da própria vagas2022 de 2022 (é isso que o app
// deixa a pessoa prever), só não pode fazer o total passar do número de
// cadeiras do cargo.
function podeMarcarMaisUmEleito() {
  return totalMarcadosCargoAtivo() < totalVagasCargoAtivo();
}

// "Não receber essa mensagem novamente" do aviso de limite de vagas — fica
// salvo no navegador (sobrevive a recarregar a página), separado de
// pcState.avisoLimiteVagasAberto (que só controla se o modal está na tela
// agora). Falha silenciosa se localStorage não estiver disponível.
const CHAVE_AVISO_LIMITE_OCULTO = "simulador-legislativo-aviso-limite-vagas-oculto";
function avisoLimiteVagasOcultoSalvo() {
  try { return localStorage.getItem(CHAVE_AVISO_LIMITE_OCULTO) === "1"; } catch (e) { return false; }
}
function salvarAvisoLimiteVagasOculto(oculto) {
  try { localStorage.setItem(CHAVE_AVISO_LIMITE_OCULTO, oculto ? "1" : "0"); } catch (e) { /* localStorage indisponível, ignora */ }
}

// Tutorial da 1ª visita (a dinâmica dos 3 toques): mostra UMA vez por
// navegador — sem esta flag ele reabria a cada recarregada da página
// (bug achado em 21/08/2026 durante verificação no preview).
const CHAVE_TUTORIAL_VISTO = "simulador-legislativo-tutorial-visto";
function tutorialVistoSalvo() {
  try { return localStorage.getItem(CHAVE_TUTORIAL_VISTO) === "1"; } catch (e) { return false; }
}
function salvarTutorialVisto() {
  try { localStorage.setItem(CHAVE_TUTORIAL_VISTO, "1"); } catch (e) { /* localStorage indisponível, ignora */ }
}
function abrirAvisoLimiteVagasSeNecessario() {
  if (avisoLimiteVagasOcultoSalvo()) return;
  pcState.avisoLimiteVagasAberto = true;
  renderCargoEstadual();
}

// Confirmação antes do autopreenchimento (✦, por partido ou "Auto" geral) —
// pedido do usuário em 11/08/2026: a automação preenche os candidatos
// marcados como eleito proporcionalmente até bater a votação necessária pra
// fechar essas vagas (função balancearPartidoSelecao/balancearTudoSelecao já
// faz isso), mas precisa perguntar antes de aplicar. Mesmo padrão de "não
// mostrar novamente" salvo no navegador que o aviso de limite de vagas usa.
const CHAVE_CONFIRMAR_AUTO_OCULTO = "simulador-legislativo-confirmar-autopreenchimento-oculto";
function confirmarAutoOcultoSalvo() {
  try { return localStorage.getItem(CHAVE_CONFIRMAR_AUTO_OCULTO) === "1"; } catch (e) { return false; }
}
function salvarConfirmarAutoOculto(oculto) {
  try { localStorage.setItem(CHAVE_CONFIRMAR_AUTO_OCULTO, oculto ? "1" : "0"); } catch (e) { /* localStorage indisponível, ignora */ }
}
function pedirConfirmacaoAutoPreenchimento(partido) {
  if (confirmarAutoOcultoSalvo()) {
    executarAutoPreenchimento(partido);
    return;
  }
  pcState.confirmAutoPreenchimentoAcao = partido ? { partido } : null;
  pcState.confirmAutoPreenchimentoAberto = true;
  renderCargoEstadual();
}
function executarAutoPreenchimento(partido) {
  snapshotPalpite();
  if (pcState.cargoAtivo === "senador") {
    autoPreenchimentoSenador();
    renderCargoEstadual();
    return;
  }
  if (!partido) {
    // Abas de deputado no modelo fader: distribuição realista + normalização
    // pra fechar a barra em 100% (gate do Avançar).
    autoPreenchimentoDeputadosFader(totalValidosProjetado2026());
    agendarReordenacaoSuave(null, 600);
    renderCargoEstadual();
    return;
  }
  if (partido) {
    balancearPartidoSelecao(partido);
    aplicarQuantidadeMarcados(partido, partido.candidatos.filter((c) => c.marcadoEleito).length);
    agendarReordenacaoSuave(partido.nome, 600);
  } else {
    balancearTudoSelecao();
    // Preencheu votos de todos os partidos do cargo — a votação de alguém
    // pode ter ultrapassado outro já marcado em qualquer um deles, então
    // recalcula quem fica marcado em cada partido, um por um.
    pcState.palpiteEdicao.forEach((p) => {
      aplicarQuantidadeMarcados(p, p.candidatos.filter((c) => c.marcadoEleito).length);
    });
    agendarReordenacaoSuave(null, 600);
  }
  renderCargoEstadual();
}

function snapshotPalpite() {
  pcState.historicoPalpite.push(JSON.parse(JSON.stringify(pcState.palpiteEdicao)));
  if (pcState.historicoPalpite.length > 30) pcState.historicoPalpite.shift();
  // Ação nova invalida o "refazer" — mesmo contrato de qualquer editor.
  pcState.historicoRefazer = [];
}

function desfazerPalpite() {
  if (!pcState.historicoPalpite.length) return;
  if (!pcState.historicoRefazer) pcState.historicoRefazer = [];
  pcState.historicoRefazer.push(JSON.parse(JSON.stringify(pcState.palpiteEdicao)));
  pcState.palpiteEdicao = pcState.historicoPalpite.pop();
  renderCargoEstadual();
}

// Contrário do Desfazer (pedido do usuário em 17/08/2026): volta pra
// frente o passo desfeito, enquanto nenhuma ação nova tiver acontecido.
function refazerPalpite() {
  if (!pcState.historicoRefazer || !pcState.historicoRefazer.length) return;
  pcState.historicoPalpite.push(JSON.parse(JSON.stringify(pcState.palpiteEdicao)));
  pcState.palpiteEdicao = pcState.historicoRefazer.pop();
  renderCargoEstadual();
}

// Versão "escalada" dos partidos pra cálculo de corte/quociente: sobe o
// total de CADA partido, na mesma proporção, até o total geral bater com a
// projeção confinada de 2026 (totalValidosProjetado2026). Não mexe
// candidato por candidato — dhondtComCorte só precisa do total por partido
// (partyVotos), então um partido sintético com só "votosManual" já serve.
//
// Por que escalar proporcionalmente em vez de tentar "completar" candidatos
// que faltam: o motivo do total atual estar tão abaixo do projetado não é
// falta de crescimento do eleitorado (isso é só ~4,5%) — é que boa parte dos
// candidatos reais de 2022 ainda nem foi carregada no pool de 2026
// (candidatos2026EstadoCargo é um subconjunto). Reconstruir candidato por
// candidato seria muito mais complexo; escalar o total de cada partido pela
// mesma proporção preserva a força relativa entre eles (o que decide o
// corte/D'Hondt) sem precisar saber exatamente quem está faltando.
// "base" é opcional — uma FOTO fixa de pcState.palpiteEdicao tirada antes de
// começar a preencher vários partidos em sequência (ver balancearTudoSelecao
// abaixo). Sem isso, cada partido preenchido ia inflando o total já
// preenchido, e o próximo partido calculava a própria escala em cima desse
// total maior — empurrando o total geral bem acima da projeção (efeito
// observado: quociente do cargo ficando ~20% ACIMA da meta depois do "Auto"
// geral, quando devia só se aproximar dela). Sem "base", usa o estado atual
// (certo pro Auto de um partido só, sem esse efeito cascata).
function partidosEscaladosProjecao2026(base) {
  const lista = base || pcState.palpiteEdicao;
  const totalVagasCargo = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const totalValidosAtual = lista.reduce((s, p) => s + partyVotos(p), 0);
  const totalValidosMeta = totalValidosProjetado2026();
  const escala = totalValidosAtual > 0 ? totalValidosMeta / totalValidosAtual : 1;
  return {
    totalVagasCargo,
    qeMeta: quocienteEleitoral(totalValidosMeta, totalVagasCargo),
    partidos: lista.map((p) => ({ nome: p.nome, candidatos: [], votosManual: partyVotos(p) * escala })),
  };
}

// Quantos votos um partido precisa de verdade pra fechar N vagas — mesmo
// corte de dhondtComCorte já usado na Revisão (classificarEleitosPorPartido),
// só que generalizado de "mais uma vaga" pra "N vagas", calculado sobre a
// projeção escalada de 2026 (partidosEscaladosProjecao2026, acima) — não
// sobre o palpite ainda incompleto — pra a votação nascer coerente com o
// quociente eleitoral esperado, não com um cenário pela metade. Também
// separa quantas dessas N vagas vêm de quociente partidário direto (art.
// 107) e quantas de sobra/método das médias (art. 109) — a mesma distinção
// que os selos "QP"/"média" já mostram na Revisão, só que visível aqui
// desde a hora de marcar os candidatos.
//
// Histórico: já tentamos (a) fatia de vagas marcadas sobre o total de votos
// válidos estimados ("tapete curto" — tratava fração-de-vagas como
// fração-de-votos, o que não é verdade num sistema proporcional), (b)
// crescimento histórico de 2022 dos próprios candidatos marcados (mantinha
// a proporção de cada um, mas não tinha nenhuma relação com o quociente de
// verdade), (c) o corte real, mas calculado só em cima do que já estava
// preenchido (ficava artificialmente baixo enquanto o cenário estava
// incompleto) e (d) tentar "completar" candidato por candidato com uma
// estimativa de 2022×crescimento (não fechava a lacuna — a lacuna é de
// candidatos faltando, não de crescimento). Esta versão escala o total de
// cada partido proporcionalmente até bater com a projeção confinada, o mais
// próximo do alvo final desde o início.
function necessarioParaVagas(n, base) {
  if (!n) return null;
  const { totalVagasCargo, qeMeta, partidos } = partidosEscaladosProjecao2026(base);
  const { corte } = dhondtComCorte(partidos, totalVagasCargo);
  const necessario = Math.max(0, Math.floor(corte * n) + 1);
  const qp = qeMeta ? Math.min(n, Math.floor(necessario / qeMeta)) : 0;
  const sobra = n - qp;
  return { necessario, qp, sobra, qe: qeMeta };
}

function metaVotosMarcados(marcados, base) {
  const info = necessarioParaVagas(marcados.length, base);
  return info ? info.necessario : 0;
}


// Teto de "naturalidade" do autopreenchimento — pedido do usuário em
// 08/08/2026: nenhum candidato que recebe voto de forma automática (tanto
// os "vazios" do bloco 1 quanto a curva decrescente do bloco 2, abaixo)
// pode passar de 80% da votação do candidato mais votado em 2022 pra
// aquele cargo, contando TODOS os partidos juntos — evita que a meta de
// vagas ou o crescimento do eleitorado empurre alguém sozinho pra um
// número fora da realidade histórica. Só vale pro auto-preenchimento —
// quem o usuário digita à mão (votosEditado) nunca passa por aqui.
function tetoAutoPreenchimento(uf, cargo) {
  const todos = candidatosEstadoCargo(uf, cargo);
  let maior = 0;
  todos.forEach((p) => p.candidatos.forEach((c) => {
    if (c.fonte === "legenda") return;
    const v = Number(c.votos) || 0;
    if (v > maior) maior = v;
  }));
  return Math.round(maior * 0.8);
}

// "Selecione apenas os candidatos que você acha que serão eleitos, por
// ordem, e ele faz todo o resto" (legenda do preenchimento automático).
// Dois passos, com uma distinção importante entre eles:
// 1. Os marcados como eleito SEMPRE são recalculados (a menos que a pessoa
//    já tenha digitado o voto à mão) — marcar alguém como eleito é a
//    decisão explícita da pessoa, então esse candidato precisa refletir uma
//    votação condizente com ser eleito, mesmo que já tivesse algum número
//    (ex.: o próprio voto pequeno de 2022) parado ali. Dividem entre si o
//    que falta pra bater a expectativa do partido, proporcional ao peso de
//    cada um em 2022 (ver metaVotosMarcados acima).
// 2. Já "o resto" (quem a pessoa NÃO marcou) só é tocado se estiver em
//    branco — não sobrescreve um valor que já esteja ali, editado ou não.
//    Do mais votado de 2022 pro menos votado: quem tem histórico próprio
//    usa ele (escalado pelo crescimento do eleitorado); quem não tem
//    (fictício/estreante) continua a MESMA curva decrescente de quem veio
//    antes na lista, em vez de cair pra zero de repente assim que acaba
//    quem tem dado real — é assim que uma lista de partido de verdade se
//    comporta (declínio suave, não penhasco).
function balancearPartidoSelecao(p, base) {
  const teto = tetoAutoPreenchimento(pcState.estado, pcState.cargoAtivo);
  const marcados = p.candidatos.filter((c) => c.marcadoEleito);
  if (marcados.length) {
    const alvo = metaVotosMarcados(marcados, base);
    const jaPreenchidos = marcados.filter((c) => c.votosEditado).reduce((s, c) => s + (Number(c.votos) || 0), 0);
    const vazios = marcados.filter((c) => !c.votosEditado);
    const restante = Math.max(0, alvo - jaPreenchidos);
    const somaShare = vazios.reduce((s, c) => s + (Number(c.votos2022) || 1), 0) || 1;
    // Teto nunca abaixo do próprio voto real de 2022 do candidato — ele
    // impede INFLAÇÃO artificial, não apaga um dado histórico real que já
    // era mais alto (achado testando ao vivo em 09/08/2026).
    vazios.forEach((c) => { c.votos = Math.min(Math.max(teto, Number(c.votos2022) || 0), Math.round(restante * ((Number(c.votos2022) || 1) / somaShare))); });
  }

  const fator = fatorCrescimentoEleitorado();
  const DECAIMENTO = 0.82; // cada candidato sem histórico próprio recebe 82% do anterior na lista
  // Congelados (desistência/sub judice) ficam FORA da curva do mágico —
  // não recebem votos em nenhuma automação (política 21/08/2026).
  const ordenados = [...p.candidatos].filter((c) => !c.status).sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
  // ultimoValorReal guarda o valor SEM arredondar — arredondar a cada passo
  // travava a curva num piso artificial (round(1 × 0,82) = round(0,82) = 1
  // pra sempre), fazendo uma fila inteira de candidatos "cair" e empacar em
  // 1 voto em vez de continuar decrescendo suavemente até perto de zero.
  // Também é aparada pelo teto acima ANTES de virar base do próximo da fila
  // — sem isso, um candidato capado ainda empurraria o próximo pra baixo
  // como se não tivesse sido limitado, e a curva "pularia" de volta pra
  // cima assim que a votação real de 2022 caísse abaixo do teto de novo.
  let ultimoValorReal = null;
  ordenados.forEach((c) => {
    if (c.fonte === "legenda") return;
    if (c.marcadoEleito || c.votosEditado || Number(c.votos) > 0) {
      ultimoValorReal = Number(c.votos) || ultimoValorReal;
      return;
    }
    if (Number(c.votos2022) > 0) {
      ultimoValorReal = Number(c.votos2022) * fator;
      // Mesmo ajuste do bloco 1 acima: nunca suprimir abaixo do próprio
      // voto real de 2022 do candidato.
      ultimoValorReal = Math.min(Math.max(teto, Number(c.votos2022)), ultimoValorReal);
    } else if (ultimoValorReal !== null) {
      ultimoValorReal = ultimoValorReal * DECAIMENTO;
      ultimoValorReal = Math.min(teto, ultimoValorReal);
    } else {
      return;
    }
    c.votos = Math.round(ultimoValorReal);
  });
}

// Botão "mágico" da Revisão (readicionado em 06/08/2026, com escolha de
// método): dá direto pro PRÓPRIO candidato do aviso os votos que faltam
// pra ele ultrapassar quem hoje ocupa a última vaga real do partido —
// nunca mexe em mais ninguém. É a forma mais simples de ajudar esse
// candidato especificamente: quem preenche cada vaga dentro de um partido
// é sempre decidido pela votação individual de cada um contra os outros,
// nunca pelo total do partido — então reforçar OUTRAS pessoas (marcadas ou
// não) só deixaria a concorrência interna mais forte contra o próprio
// candidato do aviso, sem ajudá-lo. Marca votosEditado pra não ser
// sobrescrito depois pelo Auto geral. Aviso importante (mostrado no menu):
// como o total de votos do partido muda, isso ainda pode alterar o
// resultado geral do cálculo das sobras entre partidos — confirmado ao
// vivo (corrigir 1 candidato do MDB derrubou outro do PL).
function fecharVagaPartido(nomePartido, chaveCandidato, acrescimo, listaParam) {
  const lista = listaParam || pcState.palpiteEdicao;
  const p = lista.find((p) => p.nome === nomePartido);
  if (!p || !acrescimo) return;
  const alvo = p.candidatos.find((c) => String(c.chave) === chaveCandidato);
  if (!alvo) return;
  alvo.votos = (Number(alvo.votos) || 0) + acrescimo;
  alvo.votosEditado = true;
}

// Segunda opção do menu do botão mágico: em vez de dar os votos direto pro
// candidato do aviso, distribui o total que falta pro partido (gapPartido)
// entre os OUTROS candidatos do partido que já têm menos votos que ele —
// sem nenhum deles ultrapassá-lo.
function distribuirComQuemTemMenos(nomePartido, chaveCandidato, gapPartido, listaParam) {
  const lista = listaParam || pcState.palpiteEdicao;
  const p = lista.find((p) => p.nome === nomePartido);
  if (!p || !gapPartido) return;
  const alvo = p.candidatos.find((c) => String(c.chave) === chaveCandidato);
  if (!alvo) return;
  const votosAlvo = Number(alvo.votos) || 0;
  const recipientes = p.candidatos.filter((c) => !c.marcadoEleito && c.fonte !== "legenda" && !c.status && (Number(c.votos) || 0) < votosAlvo);
  if (!recipientes.length) return;
  // Distribui proporcional ao voto ATUAL de cada um (quem já tem mais,
  // recebe mais — proporcionalidade decrescente) entre quem ainda tem
  // espaço (teto = ficar 1 voto abaixo do alvo, nunca ultrapassar). O teto
  // pode sobrar voto não distribuído numa rodada (quem bateu no teto não
  // recebe a parte inteira) — sem redistribuir essa sobra entre quem ainda
  // tem espaço, o total ficava sempre abaixo do gap pedido e a pessoa
  // precisava clicar de novo várias vezes pra fechar a vaga (achado com o
  // usuário em 08/08/2026). Repete em rodadas até esgotar o gap ou o
  // espaço de todo mundo.
  let restante = gapPartido;
  for (let rodada = 0; rodada < recipientes.length && restante > 0; rodada++) {
    const comEspaco = recipientes.filter((c) => (Number(c.votos) || 0) < votosAlvo - 1);
    if (!comEspaco.length) break;
    const somaPeso = comEspaco.reduce((s, c) => s + (Number(c.votos) || 1), 0) || 1;
    let distribuidoNaRodada = 0;
    comEspaco.forEach((c) => {
      const atual = Number(c.votos) || 0;
      const parte = Math.round(restante * ((Number(c.votos) || 1) / somaPeso));
      const teto = Math.max(0, votosAlvo - 1 - atual);
      const dado = Math.min(parte, teto);
      c.votos = atual + dado;
      c.votosEditado = true;
      distribuidoNaRodada += dado;
    });
    restante -= distribuidoNaRodada;
    if (distribuidoNaRodada === 0) break;
  }
  // Esgotou o espaço de todo mundo (todos a 1 voto do alvo) e ainda sobrou
  // diferença — não dá mais pra manter "sem passar do voto dele" mantendo
  // todos abaixo; o restante vai pro próprio alvo, senão a vaga nunca
  // fechava e a pessoa ficava clicando pra sempre sem efeito.
  if (restante > 0) {
    alvo.votos = votosAlvo + restante;
    alvo.votosEditado = true;
  }
}

// Versão do botão "Auto" geral (fora de cada partido): roda
// balancearPartidoSelecao em todos os partidos de uma vez, em vez de precisar
// abrir um por um. Tira uma FOTO do cenário antes de começar — todos os
// partidos calculam a própria escala em cima dessa mesma foto, não do total
// já inflado pelos partidos anteriores no loop (ver partidosEscaladosProjecao2026).
//
// Mesmo com a foto fixa, sobra um desvio: cada partido calcula a PRÓPRIA
// meta olhando só pra si (quantos votos ELE precisa pra fechar as vagas
// marcadas dele), sem saber que os outros 39 partidos também estão
// crescendo ao mesmo tempo — a soma de 40 metas "individualmente corretas"
// passa do total geral (observado: ~20% acima da projeção). Por isso, no
// fim do preenchimento de todos os partidos, reescala TUDO numa segunda
// passada pra bater exatamente com a projeção confinada de 2026, mantendo a
// proporção que cada partido conquistou entre si na primeira passada. Só
// roda aqui (Auto geral) — o Auto de um partido só não reescala o resto,
// pra não mexer em partidos que a pessoa não pediu.
function balancearTudoSelecao() {
  const fotoAntes = pcState.palpiteEdicao.map((p) => ({ nome: p.nome, vagas2022: p.vagas2022, candidatos: p.candidatos.map((c) => ({ ...c })) }));
  pcState.palpiteEdicao.forEach((p) => balancearPartidoSelecao(p, fotoAntes));

  const totalVagasCargo = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const totalDepoisDoPreenchimento = pcState.palpiteEdicao.reduce((s, p) => s + partyVotos(p), 0);
  const meta = totalVagasCargo ? totalValidosProjetado2026() : 0;
  if (meta > 0 && totalDepoisDoPreenchimento > 0) {
    const escalaFinal = meta / totalDepoisDoPreenchimento;
    const teto = tetoAutoPreenchimento(pcState.estado, pcState.cargoAtivo);
    pcState.palpiteEdicao.forEach((p) => {
      p.candidatos.forEach((c) => {
        if (c.fonte === "legenda") { c.votos = Math.round((Number(c.votos) || 0) * escalaFinal); return; }
        c.votos = Math.round((Number(c.votos) || 0) * escalaFinal);
        // Bug encontrado testando ao vivo em 08/08/2026: essa reescala geral
        // roda DEPOIS do teto já ter sido aplicado em balancearPartidoSelecao
        // (candidato a candidato) e pode empurrar alguém de volta pra cima
        // do limite — reaplica o teto aqui, no valor final de verdade.
        // Nunca toca em quem a pessoa editou o voto à mão (votosEditado), e
        // nunca suprime abaixo do próprio voto real de 2022 do candidato
        // (ajuste de 09/08/2026, mesma lógica de balancearPartidoSelecao).
        if (!c.votosEditado) c.votos = Math.min(c.votos, Math.max(teto, Number(c.votos2022) || 0));
      });
    });
  }
}

// Versão do botão "Zerar" no topo da tela (fora de cada partido): roda
// zerarPartidoSelecao (a mesma borracha de dentro de cada partido) em todos
// os partidos de uma vez — zera e desmarca todo mundo, não só os marcados.
// Retomar 2022 (21/08/2026): o par do Zerar tudo — em vez do zero
// absoluto, volta pro retrato de 2022 (o default do primeiro acesso):
// votação real de 2022 em quem concorreu, novos zerados, boxes limpos.
function restaurarTudo2022() {
  pcState.palpiteEdicao.forEach((p) => {
    // Candidatura congelada (desistência/sub judice) NUNCA recebe voto —
    // nem na volta pro retrato de 2022 (o histórico dela fica só na
    // legenda "2022: Xk votos" do card).
    p.candidatos.forEach((c) => { c.votos = c.status ? 0 : (Number(c.votos2022) || 0); c.votosEditado = false; });
    delete p.vagasIndicadas;
  });
  if (pcState.cargoAtivo === "senador") recalcularMarcadosSenador();
  else recalcularMarcadosDeputados();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
}

function zerarTudoSelecao() {
  pcState.palpiteEdicao.forEach((p) => {
    zerarPartidoSelecao(p);
    // "Zerar TUDO" (pedido do usuário, 21/08/2026): além da votação, limpa
    // também a quantidade de eleitos indicada no box do partido — o
    // palpite volta ao zero absoluto, sem bancada nenhuma marcada.
    delete p.vagasIndicadas;
  });
}

// Restaura a votação de 2022 em todos os candidatos do partido — volta ao
// mesmo ponto de partida de montarEstadoPalpite(), inclusive "destravando"
// o votosEditado (deixa de contar como edição manual).
function resetarPartidoSelecao(p) {
  p.candidatos.forEach((c) => { c.votos = c.status ? 0 : (c.votos2022 || 0); c.votosEditado = false; });
  // Mesma regra de qualquer outra mudança de votação (ver comentário de
  // aplicarQuantidadeMarcados, abaixo): quem fica "eleito" nunca é uma
  // escolha direta, é sempre os N mais votados AGORA — restaurar 2022 muda
  // a votação de todo mundo, então precisa recalcular quem são os N mais
  // votados com esses valores novos, preservando o N (quantidade) que já
  // estava escolhida no contador do partido. Faltava essa chamada — os
  // votos voltavam pra 2022 mas a etiqueta "eleito" ficava presa em quem
  // estava marcado antes. Achado pelo usuário em 16/08/2026.
  aplicarQuantidadeMarcados(p, p.candidatos.filter((c) => c.marcadoEleito).length);
}

// Zera a votação de todos os candidatos do partido — volta o quadro pro
// estado "em branco" de verdade (votosEditado:false), não pra "editado à
// mão com valor zero". Se marcasse votosEditado aqui, o Preenchimento
// automático ficaria travado depois: a pessoa zera, marca 40 candidatos
// diferentes como eleito e clica em "Auto" esperando os votos aparecerem —
// mas cada um deles ainda carregaria o votosEditado grudado do zerar, e o
// preenchimento pularia todo mundo (bug real, reportado com um caso assim).
function zerarPartidoSelecao(p) {
  p.candidatos.forEach((c) => { c.votos = 0; c.votosEditado = false; c.marcadoEleito = false; });
}

// Quem fica marcado como eleito num partido NUNCA é uma escolha direta —
// é sempre os N mais votados AGORA (votação 2026 atual, não 2022), N =
// quantidade escolhida no contador do partido. Pedido do usuário em
// 11/08/2026, depois de um bug real: editar o voto de um candidato pra
// ultrapassar outro já marcado não atualizava ninguém, porque marcação e
// votação eram dois estados independentes. Toda vez que a votação de
// alguém muda (blur do campo de voto) ou a quantidade muda (steppers,
// contador digitado, autopreenchimento), essa função roda de novo e
// redefine do zero quem está marcado — nunca soma/subtrai em cima do
// estado anterior. Nunca marca voto de legenda (não é uma pessoa).
function aplicarQuantidadeMarcados(p, quantidade) {
  // Nem congelado (desistência/sub judice) — mesmo com tudo zerado, os
  // "N mais votados" não podem incluir quem não disputa (21/08/2026).
  const elegiveis = p.candidatos.filter((c) => c.fonte !== "legenda" && !c.status);
  const ordenados = [...elegiveis].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const alvo = Math.max(0, Math.min(Math.round(Number(quantidade) || 0), ordenados.length));
  const chavesMarcadas = new Set(ordenados.slice(0, alvo).map((c) => c.chave));
  p.candidatos.forEach((c) => { c.marcadoEleito = c.fonte !== "legenda" && !c.status && chavesMarcadas.has(c.chave); });
}

// Versão do princípio acima pro Senador (majoritário, lista única — ver
// PROJETO.md §8.2): a marcação é 100% derivada da votação, cruzando TODOS
// os partidos — os N mais votados do cargo inteiro (N = vagas, 2 em 2026)
// ficam marcados, desde que tenham voto > 0. Roda depois de QUALQUER
// mudança de voto na aba Senador (arrasto, box nominal, alça mestra,
// zerar, desfazer), sempre do zero, nunca incremental.
function recalcularMarcadosSenador() {
  pcState.palpiteEdicao.forEach((p) => p.candidatos.forEach((c) => {
    if (typeof c.votos === "number" && !Number.isInteger(c.votos)) c.votos = Math.round(c.votos);
  }));
  const vagas = vagasFixasCargo(pcState.estado, "senador");
  const todos = [];
  pcState.palpiteEdicao.forEach((p) => {
    p.candidatos.filter((c) => c.fonte !== "legenda" && !c.status).forEach((c) => todos.push(c));
  });
  const ordenados = [...todos].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const chavesEleitas = new Set(ordenados.slice(0, vagas).filter((c) => (Number(c.votos) || 0) > 0).map((c) => c.chave));
  pcState.palpiteEdicao.forEach((p) => {
    p.candidatos.forEach((c) => { c.marcadoEleito = chavesEleitas.has(c.chave); });
  });
}

// ===== Aba Senador — padrão "Fader" (PROJETO.md §8.2) =====
// Lista única de candidatos (sem cards de partido — eleição majoritária,
// art. 46), com barra-fader por candidato, cabeçalho com barra de
// eleitorado + alça mestra, e a FMD (calculo/eleitoral.js) como regra de
// distribuição. Prototipado e validado com o usuário em 17/08/2026.


function montarItensSenador() {
  // Candidatura congelada (status) fica FORA dos itens — fader, alça
  // mestra e mágico do Senador operam sobre _senItens, então excluir aqui
  // fecha o invariante "congelado não recebe voto" também neste cargo
  // (latente — nenhum senador com status hoje; o tratamento visual
  // completo entra quando houver caso real).
  _senItens = [];
  pcState.palpiteEdicao.forEach((p) => {
    p.candidatos.filter((c) => c.fonte !== "legenda" && !c.status).forEach((c) => {
      _senItens.push({ c, partido: p.nome, partidoOriginal: c.partidoOriginal || p.nome });
    });
  });
}

// Auto-preenchimento próprio do Senado (17/08/2026) — a lógica das abas
// proporcionais não serve aqui: ela parte do voto de 2022 de CADA
// candidato (curva decrescente, metas por partido), e os candidatos ao
// Senado de 2026 são estreantes na disputa, sem histórico individual.
// Regra do Senado:
// 1. Voto digitado à mão (votosEditado) é intocável — vira reserva fixa.
// 2. O peso de cada candidato restante é a força do PARTIDO dele em 2022
//    (PARTIDOS_BRASIL, votação de Dep. Estadual em SC — a régua de força
//    partidária disponível), dividida entre os candidatos que o partido
//    lançou ao Senado; partido sem voto em 2022 entra com um piso pequeno.
// 3. Uma variação determinística de ±6% por candidato (hash da chave)
//    evita empates artificiais entre colegas de partido.
// 4. O orçamento restante (T − editados) é distribuído pela FMD, que já
//    aplica o teto individual com saturação — a lista fecha em 100%.
function autoPreenchimentoSenador() {
  const E = validosOficiaisProjetados() || totalValidosProjetado2026("senador");
  const T = E * 2;
  montarItensSenador();
  const fixo = (it) => it.c.votosEditado && Number(it.c.votos) > 0;
  const somaFixos = _senItens.reduce((s, it) => s + (fixo(it) ? Number(it.c.votos) : 0), 0);
  const alvo = Math.max(0, T - somaFixos);
  // A força de um grupo soma as siglas que o compõem: "UNIÃO / PP" pesa
  // UNIÃO + PP (numa majoritária o candidato herda a máquina da federação
  // inteira). O nome do grupo não casa direto com PARTIDOS_BRASIL — é
  // preciso quebrar em siglas (bug pego em teste: o PL, sigla pura, era o
  // único que casava e dominava com 75% da lista).
  const forcaDoGrupo = (nomeGrupo) => {
    const soma = String(nomeGrupo).split("/")
      .reduce((s, sigla) => {
        const ref = partido2022Ref(sigla.trim());
        return s + (ref && Number(ref.votos2022) > 0 ? Number(ref.votos2022) : 0);
      }, 0);
    return soma > 0 ? soma : 30000;
  };
  const candidatosDoGrupo = {};
  _senItens.forEach((it) => { candidatosDoGrupo[it.partido] = (candidatosDoGrupo[it.partido] || 0) + 1; });
  const base = _senItens.map((it, i) => {
    if (fixo(it)) return 0;
    const peso = forcaDoGrupo(it.partido) / (candidatosDoGrupo[it.partido] || 1);
    const h = [...String(it.c.chave || i)].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 997, 7);
    return peso * (0.94 + (h / 997) * 0.12);
  });
  const dist = fmdEscalarProporcional(base, alvo, E);
  _senItens.forEach((it, i) => {
    if (fixo(it)) return;
    it.c.votos = dist[i];
    it.c.votosEditado = false;
  });
  recalcularMarcadosSenador();
}

// Cabeçalho da aba Senador (vai no slot fixo #pcPainelSlot): linha
// "VOTOS (i) … pct · nominal", funil explicativo, régua em perspectiva,
// trilho verde com marco central e a mini alça mestra, escala de extremos.
function renderPainelSenador(E, comandos) {
  const TETO = E * 2;
  const soma = pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
  const pct = Math.round(soma / TETO * 100);
  const w = Math.min(100, soma / TETO * 100);
  // Funil com os números REAIS da metodologia do app: aptos/comparecimento
  // só existem como dado oficial pra SC (REF_2022/ELEITORADO_2026, dados/
  // base-2022.js) — nos outros estados o funil mostra só a etapa final.
  const fator = fatorCrescimentoEleitorado();
  const refUf = typeof refEleitoradoDe === "function" ? refEleitoradoDe(pcState.estado) : null;
  const temAptos = !!(refUf && refUf.eleitorado2026);
  const aptos = temAptos ? refUf.eleitorado2026 : null;
  const compar = temAptos ? Math.round(refUf.comparecimento2022 * fator) : null;
  const funilLinha = (rotulo, valor, larg, total) => `
    <div class="pc-sen-fu-row">
      <div class="pc-sen-fu-l"><span>${rotulo}</span><b${total ? ' style="color:var(--pc-accent);"' : ""}>${formatVotosCompacto(valor)}</b></div>
      <div class="pc-sen-fu-b${total ? " tot" : ""}" style="width:${larg}%;"></div>
    </div>`;
  const botoes = renderBotoesComandos(comandos || []);
  return `
    <div class="pc-sen-hdr pc-console">
      <div class="pc-sen-osub">
        <span class="pc-sen-lbl">Votos <button type="button" id="pcSenInf" class="pc-sen-inf${pcState.funilVotosAberto ? " aberto" : ""}">i</button></span>
        <span class="pc-sen-num"><b id="pcSenPct">${pct}%</b> · <span id="pcSenNom">${formatVotosCompacto(soma)} de ${formatVotosCompacto(TETO)}</span></span>
      </div>
      ${pcState.funilVotosAberto ? `
      <div class="pc-sen-funil">
        <div class="pc-sen-fu-t">De onde vem o teto de <b>${formatVotosCompacto(TETO)}</b>: projeção dos votos válidos de 2026 a partir do resultado real de 2022 (TSE), escalada pelo crescimento do eleitorado — mantendo as taxas históricas de comparecimento, brancos e nulos.</div>
        ${temAptos ? funilLinha("Eleitores aptos 2026 (TSE)", aptos, 100) : ""}
        ${temAptos ? funilLinha("Comparecem (taxa hist. 2022)", compar, Math.round(compar / aptos * 100)) : ""}
        ${funilLinha("Votos válidos projetados", Math.round(E), temAptos ? Math.round(E / aptos * 100) : 100)}
        ${funilLinha("× 2 votos por eleitor (Senado)", TETO, 100, true)}
        <div class="pc-sen-fu-src">Fonte: resultados oficiais TSE 2022 + evolução do eleitorado.</div>
      </div>` : ""}
      <div class="pc-sen-regua"></div>
      <div class="pc-sen-zone" id="pcSenZone">
        <div class="pc-sen-trk">
          <div class="pc-sen-trkf" id="pcSenFill" style="width:${w}%"></div>
          <div class="pc-sen-trkm"></div>
        </div>
        <div class="pc-sen-mgrip" id="pcSenMg" style="left:${w}%"></div>
      </div>
      <div class="pc-sen-escala"><span>0</span><span>${formatVotosCompacto(Math.round(E))} — 1 voto por eleitor</span><span>${formatVotosCompacto(TETO)}</span></div>
      <div class="pc-console-cmds">
        <div class="pc-cmd-painel">
          ${botoes}
          <button type="button" id="pcCmdLegendaToggle" class="pc-cmd-info${pcState.legendaComandosAberta ? " aberto" : ""}" title="O que faz cada botão">i</button>
        </div>
      </div>
    </div>`;
}

// "i" que explica o que cada badge de eleito significa (E-QP/E-M em
// Deputados, só E no Senador majoritário) — mesmo padrão/classes do "i"
// do painel de comandos (pc-cmd-info/pc-cmd-legenda-painel), protótipo
// aprovado 28/08/2026.
function renderBotaoLegendaBadge() {
  return `<button type="button" id="pcBtnLegendaBadge" class="pc-legenda-badge-btn${pcState.legendaBadgeAberta ? " aberto" : ""}" title="O que significa cada badge">i</button>`;
}
function renderLegendaBadge(ehSenador) {
  if (!pcState.legendaBadgeAberta) return "";
  const itens = ehSenador
    ? [{ icone: "E", titulo: "Eleito", sub: "Candidato mais votado (majoritário) — Senado não tem quociente partidário nem sobra." }]
    : [
      { icone: "E-QP", titulo: "Eleito por quociente", sub: "Vaga fechada direto pelo quociente partidário (art. 107) — o partido tem votos suficientes pra bancar essa cadeira sozinho." },
      { icone: "E-M", titulo: "Eleito pela média", sub: "Vaga conquistada na disputa de sobras (método das médias, art. 109) — mesma coisa que \"SOBRA\" indicava antes." },
      { icone: "—", titulo: "Sem badge", sub: "Tem votos, mas não fecha vaga com a votação de hoje." },
    ];
  const linhas = itens.map((it) => `
    <div class="pc-legenda-badge-item">
      <div class="pc-legenda-badge-icone${it.icone === "—" ? " vazio" : ""}">${it.icone}</div>
      <div><div class="pc-legenda-badge-titulo">${it.titulo}</div><div class="pc-legenda-badge-sub">${it.sub}</div></div>
    </div>`).join("");
  return `<div class="pc-legenda-badge-painel" id="pcLegendaBadgePainel">${linhas}</div>`;
}

// Lista única de candidatos ao Senado, ordenada pela votação DECRESCENTE
// indicada pelo usuário. Busca (painel de comandos) filtra por nome de
// candidato OU partido. Partidos sem candidatura viram uma nota única no
// rodapé (não cards bloqueados — decisão do protótipo).
function renderListaSenador(totalVagas, E) {
  montarItensSenador();
  const filtro = normalizarBusca(pcState.buscaPartido || "");
  const ordenados = _senItens
    .map((item, idx) => ({ ...item, idx }))
    .sort((a, b) => (Number(b.c.votos) || 0) - (Number(a.c.votos) || 0));
  const visiveis = filtro
    ? ordenados.filter((it) => normalizarBusca(nomeExibicao(it.c)).includes(filtro) || normalizarBusca(nomePartidoExibicao(it.partido)).includes(filtro))
    : ordenados;
  const semAta = pcState.palpiteEdicao.filter((p) => p.semAta2026).map((p) => nomePartidoExibicao(p.nome));
  const cards = visiveis.map((it) => {
    const c = it.c;
    const posRanking = ordenados.findIndex((o) => o.idx === it.idx) + 1;
    const eleito = !!c.marcadoEleito;
    // Duas réguas de propósito: a BARRA mede o teto individual (E, "1 voto
    // por eleitor" — é o curso físico do fader), mas o NÚMERO usa a mesma
    // régua do cabeçalho (T = 2E, total de votos), pra soma de todos os
    // candidatos fechar em 100% — decisão do usuário em 17/08/2026 depois
    // de estranhar a soma passar de 100.
    const pctBarra = E > 0 ? (Number(c.votos) || 0) / E * 100 : 0;
    // O rótulo de % ACIMA da agulha usa 2E (T, o total de votos da
    // disputa — 2 votos por eleitor), não E: E é só o teto de UM
    // candidato (não dá pra um eleitor votar 2x na mesma pessoa), mas a
    // % que aparece pro usuário precisa bater com o padrão do TSE (fração
    // do total de votos válidos da disputa, não do teto individual) —
    // achado do usuário 02/09/2026 comparando com o resultado real de
    // 2018. Mesma régua T=2E que a barra do cabeçalho já usa.
    const pctLabel = E > 0 ? (Number(c.votos) || 0) / (E * 2) * 100 : 0;
    const linkInsta = linkInstagramDe(c.chave);
    const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 14)}</a>` : "";
    const { icone: iconeFinanceiro, painel: painelFinanceiro } = financeiroIconeHtml(c);
    const lapisAdmin = pcState.souAdmin ? ` <button type="button" class="pc-mini-btn pc-mini-btn-sm" data-pc-editar-instagram="${c.chave}" data-pc-editar-instagram-nome="${escaparAtributoHtml(nomeExibicao(c))}" title="${linkInsta ? "Editar" : "Adicionar"} link do Instagram">${iconeSvg("editar", 11)}</button>` : "";
    // Majoritário (Senador) não tem quociente partidário nem sobra — só
    // "E" (eleito = mais votado), sem sufixo QP/M (esses só existem em
    // Deputados). Protótipo aprovado 28/08/2026.
    const badge = eleito ? '<span class="pc-sen-chip" title="Eleito (mais votado)">E</span>' : "";
    return `
    <div class="pc-sen-card${eleito ? " eleito" : ""}${c.votosEditado ? " manual" : ""}" data-sen-idx="${it.idx}">
      <div class="pc-sen-l1">
        ${badge}
        <span class="pc-sen-nm"><span class="pc-sen-nm-txt">${nomeExibicao(c)}</span>${instaDepois}${iconeFinanceiro}${lapisAdmin}</span>
        <span class="pc-sen-pct" data-pc-sen-editar="${it.idx}"><span class="valNum">${(Number(c.votos) || 0).toLocaleString("pt-BR")}</span><span class="valRot">votos</span></span>
      </div>
      <div class="pc-sen-sub">${posRanking}º · ${nomePartidoExibicao(it.partido)}${it.partidoOriginal && it.partidoOriginal !== it.partido ? ` (${it.partidoOriginal})` : ""}</div>
      ${painelFinanceiro}
      ${c.fonte === "ficticio" ? `<div class="pc-dep-provisorio">candidato fictício — nome de preenchimento até a ata real sair</div>` : c.fonte === "rrc" ? `<div class="pc-dep-provisorio">registro oficial (TSE) — ata de convenção ainda não publicada</div>` : ""}
      <div class="pc-fader-linha">
        ${setaFinoHtml("data-pc-seta-sen", String(it.idx), "menos")}
        <div class="pc-sen-slider" data-sen-idx="${it.idx}">
          <div class="pc-sen-bar"><div class="pc-sen-ticks"></div><div class="pc-sen-fill" style="width:${Math.min(100, pctBarra)}%"></div></div>
          <div class="pc-sen-votos"></div>
          <div class="pc-sen-grip-pct" style="left:${Math.min(100, pctBarra)}%">${pctLabel.toFixed(1)}%</div>
          <div class="pc-sen-grip" style="left:${Math.min(100, pctBarra)}%"></div>
        </div>
        ${setaFinoHtml("data-pc-seta-sen", String(it.idx), "mais")}
      </div>
    </div>`;
  }).join("");
  const rodape = semAta.length
    ? `<div class="pc-sen-rod">Sem candidatura ao Senado: ${semAta.join(" · ")}</div>`
    : "";
  const dica = `<div class="pc-sen-dica" style="display:flex; align-items:center; justify-content:space-between; gap:8px;"><span>arraste a barra pra votar · toque no número pra digitar · alça de cima escala tudo</span>${renderBotaoLegendaBadge()}</div>${renderLegendaBadge(true)}`;
  return cards ? cards + rodape + dica : "";
}

// Posiciona o rótulo de votos DENTRO do preenchimento (texto claro, junto
// à ponta) ou fora dele (na parte vazia) quando a fatia é estreita demais
// — depende da largura real da barra, por isso roda pós-render e a cada
// atualização de arrasto.
// A barra perdeu o rótulo com número (protótipo aprovado 28/08/2026 —
// "podemos retirar a porcentagem da barra de votos") — a votação já
// aparece na caixinha ao lado do nome. O elemento .pc-sen-votos continua
// existindo (sem texto) só como alvo de toque próximo à alça, pra digitar
// direto sem precisar mirar num número específico.
function posicionarVotosSenador(card, c, E) {
  const lbl = card.querySelector(".pc-sen-votos");
  const bar = card.querySelector(".pc-sen-bar");
  if (!lbl || !bar) return;
  lbl.textContent = "";
  const barW = bar.getBoundingClientRect().width || 300;
  const fill = card.querySelector(".pc-sen-fill");
  const fillPx = (parseFloat(fill.style.width) || 0) / 100 * barW;
  lbl.style.right = "auto";
  lbl.style.left = Math.max(0, fillPx - 20) + "px";
}

function atualizarCardSenador(idx, E) {
  const card = document.querySelector('.pc-sen-card[data-sen-idx="' + idx + '"]');
  if (!card) return;
  const c = _senItens[idx].c;
  // Mesma dupla de réguas do render (ver renderListaSenador): barra sobre
  // E (curso do fader), número sobre 2E (régua do cabeçalho).
  const pctBarra = E > 0 ? (Number(c.votos) || 0) / E * 100 : 0;
  const pctLabel = E > 0 ? (Number(c.votos) || 0) / (E * 2) * 100 : 0;
  card.querySelector(".pc-sen-pct").innerHTML = `<span class="valNum">${(Number(c.votos) || 0).toLocaleString("pt-BR")}</span><span class="valRot">votos</span>`;
  card.querySelector(".pc-sen-fill").style.width = Math.min(100, pctBarra) + "%";
  card.querySelector(".pc-sen-grip").style.left = Math.min(100, pctBarra) + "%";
  const gripPct = card.querySelector(".pc-sen-grip-pct");
  gripPct.style.left = Math.min(100, pctBarra) + "%";
  gripPct.textContent = pctLabel.toFixed(1) + "%";
  posicionarVotosSenador(card, c, E);
}

function atualizarPainelSenador(E) {
  const TETO = E * 2;
  const soma = pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
  const elPct = document.getElementById("pcSenPct");
  const elNom = document.getElementById("pcSenNom");
  const elFill = document.getElementById("pcSenFill");
  const elMg = document.getElementById("pcSenMg");
  if (!elPct) return;
  elPct.textContent = Math.round(soma / TETO * 100) + "%";
  elNom.textContent = formatVotosCompacto(soma) + " de " + formatVotosCompacto(TETO);
  const w = Math.min(100, soma / TETO * 100);
  elFill.style.width = w + "%";
  elMg.style.left = w + "%";
}

// Fecha um gesto de edição do Senador: rederiva os eleitos, agenda o
// autosave e reacomoda o ranking ~450ms depois (a pausa é a decisão de
// UX validada — reordenar no meio do gesto travava o arrasto).
function concluirGestoSenador() {
  recalcularMarcadosSenador();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
  clearTimeout(_senTimer);
  _senTimer = setTimeout(() => { renderCargoEstadual(); }, 450);
}

function attachListenersSenador(E) {
  const TETO = E * 2;
  // rótulos de votos dependem da largura real da barra — posiciona agora
  document.querySelectorAll(".pc-sen-card").forEach((card) => {
    const idx = Number(card.dataset.senIdx);
    if (_senItens[idx]) posicionarVotosSenador(card, _senItens[idx].c, E);
  });

  const inf = document.getElementById("pcSenInf");
  if (inf) inf.addEventListener("click", () => {
    pcState.funilVotosAberto = !pcState.funilVotosAberto;
    renderCargoEstadual();
  });

  const somaOutrosDe = (idx) => _senItens.reduce((s, it, i) => i === idx ? s : s + (Number(it.c.votos) || 0), 0);

  // Setas de ajuste fino nas pontas da barra (protótipo aprovado
  // 28/08/2026) — mesmo comportamento das setas de Deputados.
  document.querySelectorAll("[data-pc-seta-sen]").forEach((btn) => {
    const partes = btn.dataset.pcSetaSen.split("|"); // idx|dir
    const idxSeta = +partes[0];
    const delta = partes[1] === "mais" ? 1 : -1;
    const passo = Math.max(1, Math.round(E * 0.01));
    let timerRep = null, intRep = null, mexeu = false;
    const aplicarPasso = () => {
      const c = _senItens[idxSeta] && _senItens[idxSeta].c;
      if (!c) return;
      c.votos = fmdTravaIndividual((Number(c.votos) || 0) + delta * passo, E, TETO, somaOutrosDe(idxSeta));
      c.votosEditado = true;
      atualizarCardSenador(idxSeta, E);
      atualizarPainelSenador(E);
      mexeu = true;
    };
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (_senEditAberto) return;
      // Re-render pendente do gesto anterior (450ms) destruiria este botão
      // no meio do "segurar" — cancela; o release reagenda via
      // concluirGestoSenador().
      clearTimeout(_senTimer);
      snapshotPalpite();
      aplicarPasso();
      timerRep = setTimeout(() => { intRep = setInterval(aplicarPasso, 90); }, 420);
    });
    const soltarSeta = () => {
      clearTimeout(timerRep); clearInterval(intRep);
      if (mexeu) { mexeu = false; concluirGestoSenador(); }
    };
    btn.addEventListener("pointerup", soltarSeta);
    btn.addEventListener("pointerleave", soltarSeta);
    btn.addEventListener("pointercancel", soltarSeta);
  });

  document.querySelectorAll(".pc-sen-slider").forEach((el) => {
    const idx = Number(el.dataset.senIdx);
    const lbl = el.querySelector(".pc-sen-votos");
    // box de votação nominal — toque no número abre a edição inline
    lbl.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
    lbl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (_senEditAberto) return;
      _senEditAberto = true;
      const div = document.createElement("div");
      div.className = "pc-sen-edit";
      div.innerHTML = '<input inputmode="numeric" value="' + (Number(_senItens[idx].c.votos) || 0) + '">';
      el.appendChild(div);
      const inp = div.querySelector("input");
      setTimeout(() => { inp.focus(); inp.select(); }, 30);
      const aplicar = () => {
        _senEditAberto = false;
        const v = Number(String(inp.value).replace(/\D/g, "")) || 0;
        snapshotPalpite();
        _senItens[idx].c.votos = fmdTravaIndividual(v, E, TETO, somaOutrosDe(idx));
        _senItens[idx].c.votosEditado = true;
        recalcularMarcadosSenador();
        agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
        renderCargoEstadual();
      };
      inp.addEventListener("blur", aplicar);
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") inp.blur(); });
    });
    // Caixinha de votos no topo (onde a % ficava) também abre a digitação
    // — é o número visível agora que a barra perdeu o rótulo com texto.
    const caixaTopo = el.closest(".pc-sen-card")?.querySelector(`[data-pc-sen-editar="${idx}"]`);
    if (caixaTopo) caixaTopo.addEventListener("click", (e) => { e.stopPropagation(); lbl.click(); });
    // arrasto fluido — só o próprio card atualiza durante o gesto
    const mover = (e) => {
      const r = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      _senItens[idx].c.votos = fmdTravaIndividual(Math.round(frac * E), E, TETO, somaOutrosDe(idx));
      _senItens[idx].c.votosEditado = true;
      atualizarCardSenador(idx, E);
      atualizarPainelSenador(E);
    };
    el.addEventListener("pointerdown", (e) => {
      if (_senEditAberto) return;
      snapshotPalpite();
      _senDragIdx = idx;
      el.classList.add("ativo");
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(_senTimer);
      mover(e);
    });
    el.addEventListener("pointermove", (e) => { if (_senDragIdx === idx) mover(e); });
    const soltar = () => {
      if (_senDragIdx !== idx) return;
      _senDragIdx = null;
      el.classList.remove("ativo");
      concluirGestoSenador();
    };
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
  });

  // alça mestra — escala proporcional com saturação (FMD, decisão (b)):
  // fotografa a base no INÍCIO do gesto e resolve o fator exato a cada
  // movimento a partir dela (nunca dos valores já escalados).
  const zone = document.getElementById("pcSenZone");
  if (zone) {
    let base = null;
    const moverMestre = (e) => {
      if (!base) return;
      const r = zone.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const novos = fmdEscalarProporcional(base, frac * TETO, E);
      _senItens.forEach((it, i) => { it.c.votos = novos[i]; });
      _senItens.forEach((it, i) => atualizarCardSenador(i, E));
      atualizarPainelSenador(E);
    };
    zone.addEventListener("pointerdown", (e) => {
      const soma = _senItens.reduce((s, it) => s + (Number(it.c.votos) || 0), 0);
      if (soma <= 0) return;
      snapshotPalpite();
      base = _senItens.map((it) => Number(it.c.votos) || 0);
      _senMasterAtivo = true;
      zone.classList.add("ativo");
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(_senTimer);
      moverMestre(e);
    });
    zone.addEventListener("pointermove", (e) => { if (_senMasterAtivo) moverMestre(e); });
    const soltarMestre = () => {
      if (!_senMasterAtivo) return;
      _senMasterAtivo = false;
      base = null;
      zone.classList.remove("ativo");
      concluirGestoSenador();
    };
    zone.addEventListener("pointerup", soltarMestre);
    zone.addEventListener("pointercancel", soltarMestre);
  }
}

// ===== Abas de Deputado (Estadual/Federal) — modelo fader (17/08/2026) =====
// Substitui a seleção antiga (marcar eleitos por interruptor) pelo modelo
// aprovado em protótipo: console A3 no cabeçalho fixo (VOTOS + alça mestra
// + painel de comandos claro) e cards de partido como faders com os
// candidatos aninhados dentro (FMD em dois níveis). O selo ELEITO deriva
// da apuração real ao vivo (QE art. 106 + QP art. 107 + sobras D'Hondt),
// não de marcação manual. Decisões em memória alesc-deputados-prototipo-
// primeiro; espec visual em PROJETO.md §8.2.


// Vagas apuradas por grupo com a votação ATUAL (mesma conta da Revisão:
// dhondtComCorte distribui QP e sobras numa passada). marcadoEleito de
// cada candidato = estar entre os N mais votados do próprio grupo.
// A etiqueta ELEITO segue o PALPITE (o número indicado no box "− N +" de
// cada partido, ou a apuração real como valor de partida enquanto a
// pessoa não mexe nele) — nunca a apuração real sozinha. Decisão do
// usuário em 24/08/2026, depois do caso "caixa em 12, mas 15 marcados":
// as duas coisas tinham virado fontes de verdade diferentes (apuração
// real vs. caixa), e isso é que confundia. Agora só existe uma fonte pra
// etiqueta; a apuração real vira ORIENTAÇÃO (texto abaixo da barra de
// votos), nunca mais uma segunda contagem competindo com a etiqueta.
function recalcularMarcadosDeputados() {
  // Saneamento: rascunhos salvos antes do arredondamento da trava podem
  // carregar voto fracionário — normaliza uma vez por passada (idempotente).
  pcState.palpiteEdicao.forEach((p) => p.candidatos.forEach((c) => {
    if (typeof c.votos === "number" && !Number.isInteger(c.votos)) c.votos = Math.round(c.votos);
  }));
  const totalVagas = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const { counts } = dhondtComCorte(pcState.palpiteEdicao, totalVagas);
  pcState.palpiteEdicao.forEach((p, i) => {
    // O indicado É o box — nunca só um "valor padrão" recalculado a
    // cada passada. Sem isso, enquanto a pessoa não mexe no box, o
    // "indicado" ficava seguindo a apuração real por baixo dos panos: a
    // meta/curso da barra (vagasIndicadasDe, no render) mudava sozinha
    // toda vez que um voto cruzava um degrau de vaga, e a barra "saltava"
    // mesmo sem ninguém tocar no box — o próprio bug que a folga de 1 QE
    // tentou (e não conseguiu) resolver. Fixa aqui, na primeira passada,
    // o valor que a pessoa está vendo no box; só muda de novo quando ELA
    // mexe nele (ou some com "delete p.vagasIndicadas", ex.: Zerar tudo).
    // Achado do usuário, 24/08/2026.
    if (!Number.isFinite(Number(p.vagasIndicadas))) p.vagasIndicadas = counts[i];
    const alvo = vagasIndicadasDe(p, counts[i]);
    const reais = p.candidatos.filter((c) => c.fonte !== "legenda" && !c.status);
    const ordenados = [...reais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const chaves = new Set(ordenados.slice(0, alvo).filter((c) => (Number(c.votos) || 0) > 0).map((c) => c.chave));
    p.candidatos.forEach((c) => { c.marcadoEleito = chaves.has(c.chave); });
  });
}

function vagasApuradasPorGrupo() {
  const totalVagas = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  return dhondtComCorte(pcState.palpiteEdicao, totalVagas).counts;
}

// Curso da BARRA do candidato (regra do usuário, 17/08/2026): régua fixa
// baseada no mais votado de 2022 do cargo — SC estadual = 250 mil redondos
// Régua do fader por candidato — ver o comentário dentro da função (regra
// única de 21/08/2026: 125% do maior voto de 2022 do estado+cargo).
function capCandidatoDeputado() {
  // Régua ÚNICA derivada do recorte de 2022 do próprio estado+cargo
  // (decisão do usuário, 21/08/2026): 125% do maior voto individual de
  // 2022, arredondado PRA CIMA em múltiplos de 50k. Em SC/Estadual dá
  // exatamente os 250k usados desde o início (196.571 da Ana Campagnolo
  // × 1,25 = 245,7k → 250k) — e limita palpite desproporcional em
  // qualquer estado, na escala local. É limite do DESENHO, não do voto:
  // quem digitar acima mostra o número real com a barra cravada no fim.
  const todos = candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) || [];
  let maior = 0;
  todos.forEach((p) => p.candidatos.forEach((c) => {
    if (c.fonte === "legenda") return;
    const v = Number(c.votos) || 0;
    if (v > maior) maior = v;
  }));
  return Math.max(50000, Math.ceil((maior * 1.25) / 50000) * 50000);
}

function somaVotosGrupo(p) {
  return p.candidatos.reduce((s, c) => s + (Number(c.votos) || 0), 0);
}
function somaVotosCargo() {
  return pcState.palpiteEdicao.reduce((s, p) => s + somaVotosGrupo(p), 0);
}


// Console A3 do cabeçalho fixo (protótipo aprovado): card elevado com a
// linha VOTOS, régua em perspectiva, barra verde com alça mestra, escala
// com QE, e o painel de comandos DENTRO (botões claros A3.2 via CSS).
// A legenda dos comandos abre fora do console (no conteúdo) pra não
// esticar o cabeçalho fixo.
function renderPainelDeputadosFader(E, totalVagas, comandos) {
  const soma = somaVotosCargo();
  // Indicadores da escala (pedido de 18/08, no lugar do "40 vagas · QE"
  // fixo): vagas já indicadas nos boxes / total, e QE ATUAL (votação
  // digitada, art. 106) / meta (QE projetado 2026).
  const countsConsole = vagasApuradasPorGrupo();
  const vagasIndTotal = pcState.palpiteEdicao.reduce((s2, p2, i2) => s2 + (p2.semAta2026 ? 0 : vagasIndicadasDe(p2, countsConsole[i2] || 0)), 0);
  const qeAtualConsole = quocienteEleitoral(soma, totalVagas) || 0;
  const qeMetaConsole = quocienteEleitoral(Math.round(E), totalVagas) || 0;
  const pct = E > 0 ? Math.round(soma / E * 100) : 0;
  const w = E > 0 ? Math.min(100, soma / E * 100) : 0;
  const fator = fatorCrescimentoEleitorado();
  const refUf = typeof refEleitoradoDe === "function" ? refEleitoradoDe(pcState.estado) : null;
  const temAptos = !!(refUf && refUf.eleitorado2026);
  const aptosDep = temAptos ? refUf.eleitorado2026 : null;
  const comparDep = temAptos ? Math.round(refUf.comparecimento2022 * fator) : null;
  const funilLinha = (rotulo, valor, larg, tot) => `
    <div class="pc-sen-fu-row">
      <div class="pc-sen-fu-l"><span>${rotulo}</span><b${tot ? ' style="color:#34E84A;"' : ""}>${formatVotosCompacto(valor)}</b></div>
      <div class="pc-sen-fu-b${tot ? " tot" : ""}" style="width:${larg}%;"></div>
    </div>`;
  return montarConsoleHtml({
    rotuloHtml: `Votos <button type="button" id="pcDepInf" class="pc-sen-inf${pcState.funilVotosAberto ? " aberto" : ""}">i</button>`,
    numHtml: `<b id="pcDepPct">${pct}%</b> · <span id="pcDepNom">${formatVotosCompacto(soma)} de ${formatVotosCompacto(Math.round(E))}</span>`,
    extraHtml: pcState.funilVotosAberto ? `
      <div class="pc-sen-funil">
        <div class="pc-sen-fu-t">De onde vem o teto de <b>${formatVotosCompacto(Math.round(E))}</b>: projeção dos votos válidos de 2026 pro cargo, a partir do resultado real de 2022 (TSE) dos partidos modelados, escalada pelo crescimento do eleitorado.</div>
        ${temAptos ? funilLinha("Eleitores aptos 2026 (TSE)", aptosDep, 100) : ""}
        ${temAptos ? funilLinha("Comparecem (taxa hist. 2022)", comparDep, Math.round(comparDep / aptosDep * 100)) : ""}
        ${funilLinha("Votos válidos projetados", Math.round(E), temAptos ? Math.round(E / aptosDep * 100) : 100, true)}
        <div class="pc-sen-fu-src">Fonte: resultados oficiais TSE 2022 + evolução do eleitorado.</div>
      </div>` : "",
    reguaStyle: `background:repeating-linear-gradient(90deg, rgba(174,181,187,.55) 0 1px, transparent 1px ${(100 / totalVagas).toFixed(3)}%); background-size:100% 100%;`,
    idZone: "pcDepZone", idFill: "pcDepFill", idGrip: "pcDepMg", w,
    escalaHtml: `<span>0</span><span class="pc-meta-linha">vagas <b class="pc-meta-num${vagasIndTotal < totalVagas ? " pend" : ""}" id="pcDepVagasInd">${vagasIndTotal}</b>/${totalVagas}<span style="margin:0 12px;">·</span>QE <b class="pc-meta-num${qeAtualConsole < qeMetaConsole ? " pend" : ""}" id="pcDepQeAtual">${formatVotosCompacto(qeAtualConsole)}</b>/${formatVotosCompacto(qeMetaConsole)}</span><span>${formatVotosCompacto(Math.round(E))}</span>`,
    comandos,
    idLegendaToggle: "pcCmdLegendaToggle",
    legendaAberta: pcState.legendaComandosAberta,
  });
}


// Lista de cards de partido (nível 1) com candidatos aninhados (nível 2).
// Grupos ordenados pela votação indicada (reordena 450ms após o gesto);
// dentro do card aberto, a LISTA COMPLETA de candidatos, também por
// votação. Grupo sem ata 2026 vira o card opaco travado de sempre.
// Vagas indicadas pelo usuário no box do card (campo novo p.vagasIndicadas,
// persiste junto com o rascunho). Default = apuração atual do grupo.
function vagasIndicadasDe(p, padrao) {
  const v = Number(p.vagasIndicadas);
  return Math.max(0, Number.isFinite(v) ? v : (padrao || 0));
}

// Curso (extensão total) da barra de votos do partido — 1 QE de folga
// depois do maior entre meta/soma/QE, pra sempre sobrar um pouco de
// trilho vazio no fim (mesma razão do arrasto: dar espaço de passar da
// meta). Usado tanto no render estático quanto no arrasto ao vivo — os
// dois PRECISAM da mesma conta, senão a barra muda de tamanho sozinha
// ao soltar o dedo (mesma soma de votos rendia % diferente antes/depois
// do gesto — parecia um "salto" pra frente, achado do usuário em
// 24/08/2026, o curso ao vivo já tinha a folga e o estático não).
function cursoBarraPartido(meta, soma, qeProj) {
  return Math.max(meta, soma, qeProj) + qeProj;
}

// Mensagem da linha de notificação do card — o sistema fala a informação
// mais útil do momento (decisão de 17/08: a linha de info virou canal de
// notificações, com o "i" à direita).
function notificacaoDep(soma, meta, vagasInd, qeProj) {
  if (soma <= 0 && vagasInd <= 0) return "Use o box pra indicar vagas ou arraste a barra pra começar";
  if (soma <= 0) return "Arraste a barra ou use o mágico pra dar a primeira votação";
  if (meta > 0 && soma > meta * 1.005) return `<b>+${formatVotosCompacto(soma - meta)} além da meta</b> — selecione a ${vagasInd + 1}ª vaga ou realoque os votos`;
  if (meta > 0 && soma >= meta * 0.995) return `Meta das <b>${vagasInd} vaga${vagasInd === 1 ? "" : "s"} fechada</b> — votação completa`;
  const proxima = Math.max(1, Math.min(vagasInd, Math.floor(soma / qeProj) + 1));
  return `Faltam <b>${formatVotosCompacto(Math.max(0, proxima * qeProj - soma))}</b> votos pra fechar a ${proxima}ª vaga`;
}

// Segunda linha, abaixo da notificação de votos — ORIENTAÇÃO sobre a
// apuração real (D'Hondt cruzando todos os partidos), nunca uma segunda
// contagem de eleitos: a etiqueta de cada candidato já segue o palpite
// (recalcularMarcadosDeputados), isso aqui só avisa quando a nominata
// (a votação de hoje, cargo inteiro) diria outra coisa — pra decisão
// continuar sendo do usuário. Mesmo tom apagado da referência "2022:
// X votos" no candidato (pedido do usuário, 24/08/2026), não mais um
// alerta colorido.
function orientacaoNominata(vg, vagasInd, corte, soma, proximoNome) {
  if (vg === vagasInd) return "";
  if (vg > vagasInd) {
    const diff = vg - vagasInd;
    // Total por extenso (achado do usuário, 25/08/2026: "mais 7" obrigava
    // somar de cabeça com o box pra entender que dava 19 — o box não se
    // move sozinho quando a votação muda, então essa diferença pode ficar
    // grande sem ser bug nenhum, só o D'Hondt real puxando mais pra um
    // partido com o resto do campo fragmentado).
    return diff === 1
      ? `Pela votação da nominata hoje, ${proximoNome} também estaria eleito — ${vg} no total`
      : `Pela votação da nominata hoje, mais ${diff} candidatos também estariam eleitos (${vg} no total) — a começar por ${proximoNome}`;
  }
  if (corte <= 0) return "";
  const necessario = Math.floor(corte * vagasInd) + 1;
  const faltam = Math.max(0, necessario - soma);
  if (faltam <= 0) return "";
  return `Faltam <b>${formatVotosCompacto(faltam)}</b> votos na nominata pra fechar a ${vagasInd}ª vaga de verdade`;
}

// Barra fina do partido no formato do console: régua com um traço por vaga
// (verde passou / laranja em disputa / branco sem votos + pontinho laranja
// quando há votos pra vaga não somada no box), preenchimento verde com
// excedente em tom mais claro, alça-lâmina A1.3 com plaqueta de votos e
// placa fixa da meta embaixo. `course` = extensão total do trilho.
function barraPartidoDepHtml(gi, soma, meta, vagasInd, qeProj, course, chips) {
  const pos = (v) => Math.min(100, course > 0 ? v / course * 100 : 0);
  // A barra preenche NORMALMENTE até a soma; o excedente (meta → soma) é
  // marcado por um fio verde vivo sobreposto no centro, com 1/3 da altura
  // do trilho (decisão do usuário, 18/08/2026 — substitui o trecho claro
  // e os pontinhos laranja).
  const fillW = pos(soma);
  const metaPos = pos(meta);
  const extraW = soma > meta ? pos(soma) - metaPos : 0;
  const nTicks = Math.min(60, Math.max(vagasInd, Math.ceil(soma / qeProj || 0)));
  let ticks = "";
  for (let i = 1; i <= nTicks; i++) {
    const st = soma >= i * qeProj ? "on" : soma > (i - 1) * qeProj ? "disp" : "off";
    ticks += `<span class="pc-dep-tick ${st}" style="left:${pos(i * qeProj)}%"></span>`;
    if (i > vagasInd && soma > (i - 1) * qeProj) ticks += `<span class="pc-dep-tick-dot" style="left:${pos(i * qeProj)}%"></span>`;
  }
  const finaPasso = Math.max(1.5, 100 / Math.max(20, nTicks * 4));
  return `
    <div class="pc-dep-regua${chips ? " com-chips" : ""}">${chips || ""}<div class="pc-dep-regua-fina" style="background:repeating-linear-gradient(90deg, rgba(138,144,150,.18) 0 1px, transparent 1px ${finaPasso.toFixed(3)}%);"></div>${ticks}</div>
    <div class="pc-dep-zone" data-dep-fader="p|${gi}" data-course="${Math.round(course)}" data-meta="${Math.round(meta)}" data-qe="${Math.round(qeProj)}" data-vagas="${vagasInd}">
      <div class="pc-dep-trk">
        <div class="pc-dep-fill" style="width:${fillW}%; background-size:${fillW > 0 ? (10000 / fillW).toFixed(1) : "100"}% 100%;"></div>
        ${extraW > 0 ? `<div class="pc-dep-extra" style="left:${metaPos}%; width:${extraW}%"></div>` : ""}
      </div>
      <div class="pc-dep-grip" style="left:${pos(soma)}%">
        <div class="pc-dep-grip-haste"></div>
        <div class="pc-dep-grip-plq">${formatVotosCompacto(soma)}</div>
      </div>
    </div>`;
}

// Atualização ao vivo da barra do partido durante um gesto (sem re-render):
// refaz preenchimento, excedente, plaqueta e os traços da régua do card.
function atualizarBarraPartidoDom(zone, soma) {
  const course = Number(zone.dataset.course) || 1;
  const meta = Number(zone.dataset.meta) || 0;
  const qeProj = Number(zone.dataset.qe) || 1;
  const vagasInd = Number(zone.dataset.vagas) || 0;
  const pos = (v) => Math.min(100, v / course * 100);
  const fillEl = zone.querySelector(".pc-dep-fill");
  const fw = pos(soma);
  fillEl.style.width = fw + "%";
  // Degradê ancorado no CURSO inteiro (claro → escuro → claro nas mesmas
  // posições do trilho, como no console) — o background estica na razão
  // inversa da largura do preenchimento.
  fillEl.style.backgroundSize = (fw > 0 ? (10000 / fw).toFixed(1) : "100") + "% 100%";
  let extra = zone.querySelector(".pc-dep-extra");
  if (soma > meta) {
    if (!extra) {
      extra = document.createElement("div");
      extra.className = "pc-dep-extra";
      zone.querySelector(".pc-dep-trk").appendChild(extra);
    }
    extra.style.left = pos(meta) + "%";
    extra.style.width = (pos(soma) - pos(meta)) + "%";
  } else if (extra) extra.remove();
  const grip = zone.querySelector(".pc-dep-grip");
  grip.style.left = pos(soma) + "%";
  grip.querySelector(".pc-dep-grip-plq").textContent = formatVotosCompacto(soma);
  const regua = zone.parentElement.querySelector(".pc-dep-regua");
  if (regua) regua.querySelectorAll(".pc-dep-tick").forEach((t, idx) => {
    const i = idx + 1;
    t.className = "pc-dep-tick " + (soma >= i * qeProj ? "on" : soma > (i - 1) * qeProj ? "disp" : "off");
  });
}

// Lista de cards de partido — design final de 17/08/2026 (5 linhas):
// nome + box de vagas · régua/barra com meta · notificação + "i" ·
// subpainel de botões · candidatos aninhados (lista completa).
// Vagas que a apuração de agora já entrega mas o usuário ainda não marcou
// no box (conceito aprovado em protótipo, 31/08/2026): pra cada partido,
// compara as cadeiras do D'Hondt (calcularDisputaSobra) com os marcados
// e aponta o próximo da fila (mais votado sem marcação e sem status).
function vagasEmAbertoDoCargo(totalVagasCargo) {
  const lista = pcState.palpiteEdicao || [];
  if (!lista.length) return { emAberto: 0, marcadas: 0, linhas: [] };
  const disputa = calcularDisputaSobra(lista, totalVagasCargo);
  const counts = disputa.cadeirasPorPartido;
  const qeAtual = quocienteEleitoral(somaVotosCargo(), totalVagasCargo);
  let emAberto = 0, marcadas = 0;
  const linhas = [];
  // Candidatos marcados SEM respaldo do voto atual (selo laranja "E" no
  // card, k >= vg do próprio partido) — em qualquer cargo com todas as
  // vagas já marcadas, cada vaga em aberto corresponde 1:1 a um desses
  // (a soma de vg por partido = total de vagas do cargo, sempre — então se
  // "marcadas" bateu no total, todo excesso em um partido é déficit em
  // outro). É quem PERDE a cadeira se esta vaga for confirmada.
  const semRespaldo = [];
  lista.forEach((p, gi) => {
    if (p.semAta2026) return;
    const reais = (p.candidatos || []).filter((c) => c.fonte !== "legenda");
    const nMarc = reais.filter((c) => c.marcadoEleito).length;
    marcadas += nMarc;
    const vg = counts[gi] || 0;
    const ordenados = [...reais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    ordenados.forEach((c, k) => {
      if (!c.marcadoEleito || k < vg) return;
      semRespaldo.push({ partido: p.nome, nome: nomeExibicao(c), votos: Number(c.votos) || 0, chave: c.chave });
    });
    if (vg <= nMarc) return;
    const soma = somaVotosGrupo(p);
    const qpDireto = qeAtual ? Math.min(vg, Math.floor(soma / qeAtual)) : 0;
    // as cadeiras em aberto do partido são as posições k < vg ocupadas por
    // candidato ainda sem marcação — o mesmo critério do selo fantasma no card
    ordenados.forEach((c, k) => {
      if (k >= vg || c.marcadoEleito || c.status) return;
      emAberto++;
      const rodada = (disputa.rodadaSobraPorPartido[gi] || [])[k];
      linhas.push({
        partido: p.nome, cadeira: k + 1,
        qual: k < qpDireto ? "QP" : (rodada !== undefined ? rodada + "\u00aa M" : "M"),
        nome: nomeExibicao(c), votos: Number(c.votos) || 0,
      });
    });
  });
  linhas.sort((a, b) => b.votos - a.votos);
  // Pareamento só é honesto quando não há capacidade livre sobrando (todas
  // as vagas do cargo já marcadas) — só aí toda vaga aberta É, por
  // definição, uma cadeira presa em outro partido. Sobrando capacidade
  // (marcadas < totalVagasCargo), a vaga pode simplesmente estar livre de
  // verdade, sem ninguém pra "perder" nada.
  if (marcadas >= totalVagasCargo && semRespaldo.length) {
    semRespaldo.sort((a, b) => a.votos - b.votos); // o mais fraco perde primeiro
    linhas.forEach((l, i) => { if (semRespaldo[i]) l.perde = semRespaldo[i]; });
  }
  return { emAberto, marcadas, linhas };
}

function renderFaixaVagasAbertas(totalVagasCargo) {
  const dados = vagasEmAbertoDoCargo(totalVagasCargo);
  if (!dados.emAberto) return "";
  // Só aparece com a lista pelo menos 85% marcada (pedido do usuário,
  // 31/08/2026): abaixo disso a lista ainda é muito primária — o usuário
  // nem decidiu a maioria das vagas ainda, então "vagas em aberto" seria
  // uma lista enorme e sem sentido, não um sinal de algo faltando.
  if (!totalVagasCargo || dados.marcadas / totalVagasCargo < 0.85) return "";
  const abertaChave = "faixaVagas_" + pcState.cargoAtivo;
  const aberta = !!pcState.expandido[abertaChave];
  const linhas = dados.linhas.map((l) => `
    <div class="pc-fva-lin">
      <div class="pc-fva-lin-top">
        <span class="pc-fva-sigla">${nomePartidoExibicao(l.partido)}</span>
        <span class="pc-fva-qual">${l.cadeira}\u00aa \u00b7 ${l.qual}</span>
        <button type="button" class="pc-fva-conf" data-pc-fva-conf="${escaparAtributoHtml(l.partido)}"${l.perde ? ` data-pc-fva-perde="${escaparAtributoHtml(l.perde.partido)}"` : ""} title="${l.perde ? `Confirma ${l.nome} e desmarca ${l.perde.nome} (${l.perde.partido}), que hoje segura a vaga sem respaldo do voto` : `Confirmar: marca ${l.nome} como eleito (sobe 1 vaga no box do partido)`}">${iconeSvg("confere", 13)}</button>
        <button type="button" class="pc-fva-ir" data-pc-fva-ir="${escaparAtributoHtml(l.partido)}" title="Abrir o card do partido">${iconeSvg("setaDireita", 11)}</button>
      </div>
      <span class="pc-fva-cand"><span class="n">${l.nome}</span><span class="v">${l.votos.toLocaleString("pt-BR")} votos \u00b7 pr\u00f3ximo da fila</span>${l.perde ? `<span class="perde">no lugar de ${l.perde.nome} (${nomePartidoExibicao(l.perde.partido)}) \u2014 marcado sem respaldo do voto atual</span>` : ""}</span>
    </div>`).join("");
  return `
    <div class="glass-card pc-fva${aberta ? " aberta" : ""}" id="pcFaixaVagas" style="padding:12px 14px; cursor:pointer;">
      <div class="pc-fva-cab">
        <div class="pc-fva-cab-top">
          <span class="pc-fva-num">${dados.marcadas}<span class="dim">/${totalVagasCargo}</span> <b>\u00b7 ${dados.emAberto} em aberto</b></span>
          <svg class="pc-fva-chev" width="12" height="12" viewBox="0 0 16 16"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </div>
        <span class="pc-fva-tx">pela vota\u00e7\u00e3o atual, ${dados.emAberto === 1 ? "essa vaga j\u00e1 tem dono" : "essas vagas j\u00e1 t\u00eam dono"} \u2014 <b>falta voc\u00ea confirmar</b></span>
      </div>
      <div class="pc-fva-corpo${aberta ? " aberto" : ""}" id="pcFvaCorpo">
        <div class="pc-fva-corpo-int">
          ${linhas}
          <div class="pc-fva-nota"><b>QP</b> = vaga pelo quociente partid\u00e1rio \u00b7 <b>N\u00aa M</b> = rodada da sobra (m\u00e9dia) \u00b7 o nome \u00e9 o candidato mais votado ainda sem marca\u00e7\u00e3o naquele partido \u2014 a setinha abre o card.</div>
        </div>
      </div>
    </div>`;
}

function renderListaDeputadosFader(grupos, E, totalVagas) {
  const capCand = capCandidatoDeputado();
  // calcularDisputaSobra devolve os mesmos counts do dhondtComCorte E o
  // mapa de rodadas de sobra por cadeira — é o que deixa o selo E-M dizer
  // "· 1ª"/"· 7ª" (pedido do usuário, 30/08/2026: mesmo detalhe que a
  // Revisão já mostrava no tooltip, agora no card do palpite).
  const disputa = calcularDisputaSobra(pcState.palpiteEdicao, totalVagas);
  const counts = disputa.cadeirasPorPartido, corte = disputa.corte;
  const qeProj = quocienteEleitoral(Math.round(E), totalVagas) || 1;
  const qeAtual = quocienteEleitoral(somaVotosCargo(), totalVagas);
  const idxDe = new Map(pcState.palpiteEdicao.map((p, i) => [p, i]));
  // A ordem já vem decidida (e possivelmente CONGELADA) de quem chama —
  // ordemPartidosFixa em renderCargoEstadual, com o critério "mais
  // eleitos indicados no box primeiro; votos como desempate" (17/08).
  // Não re-sortear aqui: era o sort duplicado que furava o congelamento
  // e fazia o card pular na hora (21/08/2026).
  const ordenados = grupos;
  return ordenados.map((p) => {
    const gi = idxDe.get(p);
    if (p.semAta2026) {
      return `
      <div class="pc-dep-card sematq">
        <div class="pc-dep-l1">
          <span class="pc-dep-nm">${nomePartidoExibicao(p.nome)}</span>
          <span class="pc-dep-sub">${p.temAtaOutroCargo ? "sem chapa neste cargo" : "não registrou ata"}</span>
        </div>
      </div>`;
    }
    const reais = p.candidatos.filter((c) => c.fonte !== "legenda");
    const soma = somaVotosGrupo(p);
    const vg = counts[gi] || 0;
    const vagasInd = vagasIndicadasDe(p, vg);
    const meta = vagasInd * qeProj;
    const v2022 = votos2022DoGrupo(p.nome);
    const course = cursoBarraPartido(meta, soma, qeProj);
    const qpDireto = qeAtual ? Math.min(vg, Math.floor(soma / qeAtual)) : 0;
    const sobras = vg - qpDireto;
    const chaveAberto = "faderAberto_" + pcState.cargoAtivo + "_" + p.nome;
    const aberto = !!pcState.expandido[chaveAberto];
    const infoAberto = !!pcState.expandido["depInfo_" + pcState.cargoAtivo + "_" + p.nome];
    // Mesma lógica de timing dos cards de partido, um nível abaixo
    // (pedido 21/08 à noite): a ordem dos candidatos DENTRO do card fica
    // congelada enquanto a pessoa mexe — só reordena junto com o
    // reagrupamento suave (reordenarComTransicao zera as duas ordens).
    if (!pcState.ordemCandidatosFixa) pcState.ordemCandidatosFixa = {};
    const chaveOrdC = pcState.cargoAtivo + "::" + p.nome;
    let candsOrd = null;
    const fixaC = pcState.ordemCandidatosFixa[chaveOrdC];
    if (fixaC && fixaC.length === reais.length) {
      const porChave = new Map(reais.map((c) => [c.chave, c]));
      const remontada = fixaC.map((k) => porChave.get(k)).filter(Boolean);
      if (remontada.length === reais.length) candsOrd = remontada;
    }
    if (!candsOrd) {
      candsOrd = [...reais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      pcState.ordemCandidatosFixa[chaveOrdC] = candsOrd.map((c) => c.chave);
    }
    // Sempre montada (não só quando "aberto") desde 08/09/2026: o corpo do
    // card fica sempre no DOM (escondido por altura, não removido), pra
    // abrir/fechar animado sem re-render — precisa do conteúdo pronto de
    // antemão, senão abriria uma caixa vazia na primeira vez.
    const cands = candsOrd.map((c, k) => {
      const cv = Number(c.votos) || 0;
      // Badge compacto na linha do nome (protótipo aprovado 28/08/2026):
      // E-QP = eleito direto pelo quociente partidário (art. 107); E-M =
      // eleito pela sobra/método das médias (art. 109, era "SOBRA"). Sem
      // badge quando tem votos mas não fecha vaga (era "FORA") — informação
      // ainda visível pela barra/votação, não precisa de selo à parte.
      // Marcado no box mas a APURAÇÃO DE AGORA não dá essa cadeira ao
      // partido (refino 30/08/2026, 2ª rodada: a régua por marcas de QE
      // pintava de laranja até vaga de MÉDIA legítima — sobra, por
      // definição, fica abaixo de um quociente cheio). Régua certa: vg,
      // o que o D'Hondt cruzando todos os partidos entrega já.
      const marcadoSemVoto = c.marcadoEleito && k >= vg;
      const rodadaSobraCand = (disputa.rodadaSobraPorPartido[gi] || [])[k];
      // Fantasma "E?" (aprovado 31/08/2026): a apura\u00e7\u00e3o de agora d\u00e1 esta
      // cadeira ao partido, mas ningu\u00e9m marcou \u2014 mostra quem est\u00e1 ganhando.
      const naFila = !c.marcadoEleito && !c.status && k < vg;
      const selo = c.marcadoEleito
        ? (marcadoSemVoto
          ? '<span class="pc-sen-chip semvoto" title="Marcado eleito no box, mas ainda sem votação atribuída — arraste a barra ou digite os votos pra apuração contar.">E</span>'
          : (k < qpDireto
            ? '<span class="pc-sen-chip" title="Eleito direto pelo quociente partidário (art. 107)">E-QP</span>'
            : `<span class="pc-sen-chip em" title="Eleito pela sobra (método das médias, art. 109)${rodadaSobraCand !== undefined ? ` — foi a ${rodadaSobraCand}ª sobra distribuída de ${disputa.totalSobrasCargo} no cargo` : ""}">E-M${rodadaSobraCand !== undefined ? ` · ${rodadaSobraCand}ª` : ""}</span>`))
        : (naFila ? `<span class="pc-sen-chip fila" title="Pela vota\u00e7\u00e3o atual este candidato est\u00e1 ganhando a ${k + 1}\u00aa vaga do partido \u2014 marque no box pra confirmar o palpite.">E?</span>` : "");
      // Posição do candidato na lista do partido (pedido do usuário,
      // 24/08/2026) — discreto, só a colocação por votação de hoje.
      const posicao = `<span class="pc-dep-pos">${k + 1}º</span>`;
      const linkInsta = linkInstagramDe(c.chave);
      // Ícone do Instagram MONOCROMÁTICO à DIREITA do nome (refino 20/08) —
      // só aparece pra quem tem link alimentado na planilha/admin.
      const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 16)}</a>` : "";
      const { icone: iconeFinanceiro, painel: painelFinanceiro } = financeiroIconeHtml(c);
      const lapisAdmin = pcState.souAdmin ? ` <button type="button" class="pc-mini-btn pc-mini-btn-sm" data-pc-editar-instagram="${c.chave}" data-pc-editar-instagram-nome="${escaparAtributoHtml(nomeExibicao(c))}" title="${linkInsta ? "Editar" : "Adicionar"} link do Instagram">${iconeSvg("editar", 11)}</button>` : "";
      if (c.status) {
        // Célula CONGELADA: etiqueta branca, linha transparente, barra
        // travada no zero sem alça de arrasto (nenhum data-dep-fader —
        // nenhum listener gruda nela) e o motivo legível embaixo.
        const st = infoStatusCandidato(c.status);
        return `
      <div class="pc-dep-crow pc-dep-crow-cong" data-dep-cong="${escaparAtributoHtml(st.motivo)}">
        <div class="pc-dep-cl1">
          ${posicao}
          <span class="pc-sen-chip statusbranco">${st.etiqueta}</span>
          <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">${nomeExibicao(c)}</span>${instaDepois}${financeiroIconeHtml(c).icone}${lapisAdmin}</span>
          <span class="pc-dep-cpct">—</span>
        </div>
        ${Number(c.votos2022) > 0 ? `<div class="pc-dep-c2022">2022: ${Number(c.votos2022).toLocaleString("pt-BR")} votos${c.eleito2022 ? " · eleito" : ""}${c.partidoOrigem2022 ? `${c.eleito2022 ? " pelo" : " · veio do"} ${c.partidoOrigem2022}` : ""}</div>` : ""}
        <div class="pc-dep-zone pc-dep-zone-cong">
          <div class="pc-dep-trk"></div>
          <div class="pc-dep-grip" style="left:0%;"><div class="pc-dep-grip-haste"></div></div>
        </div>
        <div class="pc-dep-cong-motivo">${st.motivo}</div>
      </div>`;
      }
      return `
      <div class="pc-dep-crow${c.votosEditado ? " manual" : ""}${marcadoSemVoto ? " marcado-semvoto" : ""}${naFila ? " na-fila" : ""}" data-dep-cand="${escaparAtributoHtml(c.chave)}">
        <div class="pc-dep-cl1">
          ${posicao}
          ${selo}
          <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">${nomeExibicao(c)}</span>${instaDepois}${iconeFinanceiro}${lapisAdmin}</span>
          <span class="pc-dep-cpct" data-pc-dep-editar="${escaparAtributoHtml(c.chave)}"><span class="valNum">${cv.toLocaleString("pt-BR")}</span><span class="valRot">votos</span></span>
        </div>
        ${painelFinanceiro}
        ${naFila ? `<div class="pc-dep-fila-tag">ganhando a ${k + 1}\u00aa vaga pela vota\u00e7\u00e3o \u2014 marque pra confirmar</div>` : ""}
        ${c.fonte === "ficticio" ? `<div class="pc-dep-provisorio">candidato fictício — nome de preenchimento até a ata real sair</div>` : c.fonte === "rrc" ? `<div class="pc-dep-provisorio">registro oficial (TSE) — ata de convenção ainda não publicada</div>` : ""}
        ${Number(c.votos2022) > 0 ? `<div class="pc-dep-c2022">2022: ${Number(c.votos2022).toLocaleString("pt-BR")} votos${c.eleito2022 ? " · eleito" : ""}${c.partidoOrigem2022 ? `${c.eleito2022 ? " pelo" : " · veio do"} ${c.partidoOrigem2022}` : ""}</div>` : ""}
        ${faderDepHtml("c|" + gi + "|" + c.chave, cv, capCand, true)}
      </div>`;
    }).join("");
    // Card sintético "Legenda" (pedido do usuário, 31/08/2026): o voto dado
    // só na sigla, editável como um candidato — soma pro QP do partido, mas
    // nunca é marcável nem ocupa vaga. Fica fixo no fim da lista do grupo.
    const legendaCand = p.candidatos.find((c) => c.fonte === "legenda");
    const cvLeg = legendaCand ? (Number(legendaCand.votos) || 0) : 0;
    const legendaHtml = legendaCand ? `
      <div class="pc-dep-crow pc-dep-crow-legenda" data-dep-cand="${escaparAtributoHtml(legendaCand.chave)}">
        <div class="pc-dep-cl1">
          <span class="pc-sen-chip chiplegenda" title="Voto dado apenas na sigla do partido — soma pro quociente partid\u00e1rio, mas n\u00e3o elege ningu\u00e9m sozinho.">LEG</span>
          <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">Legenda</span></span>
          <span class="pc-dep-cpct" data-pc-dep-editar="${escaparAtributoHtml(legendaCand.chave)}"><span class="valNum">${cvLeg.toLocaleString("pt-BR")}</span><span class="valRot">votos</span></span>
        </div>
        ${Number(legendaCand.votos2022) > 0 ? `<div class="pc-dep-c2022">2022: ${Number(legendaCand.votos2022).toLocaleString("pt-BR")} votos s\u00f3 na sigla (TSE)</div>` : ""}
        ${faderDepHtml("c|" + gi + "|" + legendaCand.chave, cvLeg, capCand, true)}
      </div>` : "";
    // Marcador "preenchido" (prototipado e aprovado, 31/08/2026, variante
    // B2 — filete sutil): box de vagas com meta definida E a votação do
    // partido batendo essa meta (a mesma condição que já fecha a barra em
    // 100%) — reúne as duas coisas que hoje só apareciam separadas.
    const partidoCompleto = vagasInd > 0 && soma >= meta;
    return `
    <div class="pc-dep-card${partidoCompleto ? " completo" : ""}" data-dep-idx="${gi}" data-dep-nome="${escaparAtributoHtml(p.nome)}">
      <div class="pc-dep-l1" data-dep-toggle="${gi}">
        <span class="pc-dep-nmcol">
          <span class="pc-dep-nm">${nomePartidoExibicao(p.nome)}</span>
          ${v2022 > 0 ? `<span class="pc-dep-meta2 pc-dep-meta2-2022">2022: ${formatVotosCompacto(v2022)}</span>` : ""}
        </span>
        <div class="pc-dep-boxcol">
          <div class="pc-dep-metabox">
            <div class="pc-dep-stepper" data-dep-stepper="${gi}">
              <button type="button" data-dep-vaga-menos="${gi}">−</button>
              <span class="pc-dep-stepper-num" data-dep-vaga-edit="${gi}" title="Toque pra digitar">${vagasInd}<i>vagas</i></span>
              <button type="button" data-dep-vaga-mais="${gi}">+</button>
            </div>
            ${meta > 0 ? `<span class="pc-dep-meta-inbox">meta ${formatVotosCompacto(meta)}</span>` : ""}
          </div>
        </div>
      </div>
      ${barraPartidoDepHtml(gi, soma, meta, vagasInd, qeProj, course, (() => {
        // Agulhas na régua (refino do usuário 30/08/2026, 2ª rodada): as
        // etiquetas voltaram pra linha própria embaixo (alinhamento), e a
        // POSIÇÃO das marcas vira uma mini agulha na régua — cinza na
        // marca onde o quociente fecha, verde na da última vaga por média.
        if (vg <= 0) return "";
        // Régua das agulhas = a MESMA dos rótulos (QE da apuração de
        // agora, qeAtual) — corrige o cenário do usuário 30/08/2026 em
        // que "12×QP / 2×M" apareciam plantadas na régua da PROJEÇÃO,
        // à frente do preenchimento, lendo como "não chegou na sobra"
        // quando a apuração já dava as vagas.
        const posN = (n) => Math.min(100, course > 0 ? (n * (qeAtual || qeProj)) / course * 100 : 0);
        const posQp = posN(qpDireto), posM = posN(qpDireto + sobras);
        // Variante C aprovada (30/08/2026): o rótulo mora NA agulha. Se as
        // duas marcas encostam (< 15 pontos de largura), o rótulo do QP
        // sobe uma linha pra não atropelar o da média.
        const perto = qpDireto > 0 && sobras > 0 && Math.abs(posM - posQp) < 15;
        let agulhas = "";
        if (qpDireto > 0) agulhas += `<span class="pc-dep-agulha" style="left:${posQp.toFixed(2)}%"></span><span class="pc-dep-agulha-rot${perto ? " alto" : ""}" style="left:${posQp.toFixed(2)}%">${qpDireto}×QP</span>`;
        if (sobras > 0) agulhas += `<span class="pc-dep-agulha media" style="left:${posM.toFixed(2)}%"></span><span class="pc-dep-agulha-rot media" style="left:${posM.toFixed(2)}%">${sobras}×M</span>`;
        return agulhas;
      })())}
      <div class="pc-dep-notif">
        <span class="pc-dep-notif-luz"></span>
        <span class="pc-dep-notif-txt" data-normal="${escaparAtributoHtml(notificacaoDep(soma, meta, vagasInd, qeProj))}">${notificacaoDep(soma, meta, vagasInd, qeProj)}</span>
        <button type="button" class="pc-dep-inf${infoAberto ? " aberto" : ""}" data-dep-info="${gi}" title="Detalhes do partido">i</button>
      </div>
      ${infoAberto ? `<div class="pc-dep-infopainel">${reais.length} candidato${reais.length === 1 ? "" : "s"} · QP ${qeAtual ? (soma / qeAtual).toFixed(1).replace(".", ",") : "0,0"} = ${qpDireto} por quociente${sobras > 0 ? ` + ${sobras} sobra${sobras === 1 ? "" : "s"}` : ""} pela apuração de agora.<br>Régua: <b style="color:rgba(52,232,74,.9);">verde</b> vaga com votação fechada · <b style="color:#FF9A2E;">laranja</b> em disputa · branco sem votos. Pontinho laranja em cima: há votos, mas a vaga não foi somada no box.<br>Agulhas na régua = a apuração de agora: a <b style="color:#AEB5BB;">cinza</b> marca onde o quociente fecha (N×QP) e a <b style="color:rgba(52,232,74,.9);">verde</b> onde entra vaga pela média (N×M) — elas respondem à votação de todos os partidos, não ao box.</div>` : ""}
      <div class="pc-dep-corpo${aberto ? " aberto" : ""}" id="pcDepCorpo-${gi}">
        <div class="pc-dep-subpainel">
          <div class="pc-cmd-b22">
            <div class="pc-cmd-b22-ano">2022</div>
            <div class="pc-cmd-b22-metades">
              <button type="button" data-pc-ver2022="${p.nome}" title="Nominata completa de 2022">${iconeSvg("lista", 12)}</button>
              <button type="button" data-pc-reset="${p.nome}" title="Restaurar votação de 2022 deste partido">${iconeSvg("relogio", 12)}</button>
            </div>
          </div>
          <button type="button" class="pc-cmd-acao" data-pc-zerar="${p.nome}" title="Zerar votação do partido">${iconeSvg("borracha", 12)}</button>
          <button type="button" class="pc-cmd-acao" data-dep-magico="${gi}" title="Preencher só este partido automaticamente">${iconeSvg("completar", 13)}</button>
        </div>
        <div class="pc-dep-cands">${(cands + legendaHtml) || '<div class="pc-sen-rod">Nenhum candidato carregado neste grupo.</div>'}</div>
      </div>
      ${candsOrd.length ? `<div class="pc-dep-preview" style="display:${aberto ? "none" : ""};">
        <div class="pc-dep-cl1">
          ${candsOrd[0].marcadoEleito ? '<span class="pc-sen-chip">E</span>' : ""}
          <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">${nomeExibicao(candsOrd[0])}</span></span>
          <span class="pc-dep-cpct"><span class="valNum">${(Number(candsOrd[0].votos) || 0).toLocaleString("pt-BR")}</span><span class="valRot">votos</span></span>
        </div>
      </div>` : ""}
      <div class="pc-dep-puxador${aberto ? " aberto" : ""}" data-dep-toggle="${gi}" title="${aberto ? "Recolher candidatos" : "Abrir candidatos"}"><span></span></div>
    </div>`;
  }).join("");
}

// Escala os candidatos de um grupo pra um novo total usando a FMD; se o
// grupo está zerado, semeia pesos pelo voto de 2022 de cada candidato
// (fallback 1 — a regra "zero fica zero" da alça mestra vale pro gesto
// coletivo, mas um partido zerado precisa poder nascer pelo próprio fader).
function escalarGrupoDeputados(p, alvo, capCand) {
  const reais = p.candidatos.filter((c) => c.fonte !== "legenda" && !c.status);
  let base = reais.map((c) => Number(c.votos) || 0);
  if (base.every((v) => v === 0)) base = reais.map((c) => Number(c.votos2022) || 1);
  const novos = fmdEscalarProporcional(base, alvo, capCand);
  reais.forEach((c, i) => { c.votos = novos[i]; });
}

function concluirGestoDeputados() {
  recalcularMarcadosDeputados();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
  // Votos são desempate da ordem dos cards — o gesto do fader também
  // agenda o reagrupamento suave (senão a ordem congelada ficava velha
  // no celular, onde mouseleave não existe).
  agendarReordenacaoSuave(null, 1200);
  clearTimeout(_depTimer);
  // 150ms (era 450): depois de SOLTAR não existe mais dedo pra alça fugir —
  // a pausa longa só atrasava a reacomodação do ranking (reclamação do
  // usuário em 17/08). O Senador mantém 450ms validados.
  _depTimer = setTimeout(() => { renderCargoEstadual(); }, 150);
}

function atualizarHeaderDeputados(E) {
  const soma = somaVotosCargo();
  const elPct = document.getElementById("pcDepPct");
  if (!elPct) return;
  elPct.textContent = (E > 0 ? Math.round(soma / E * 100) : 0) + "%";
  document.getElementById("pcDepNom").textContent = formatVotosCompacto(soma) + " de " + formatVotosCompacto(Math.round(E));
  const w = E > 0 ? Math.min(100, soma / E * 100) : 0;
  document.getElementById("pcDepFill").style.width = w + "%";
  document.getElementById("pcDepMg").style.left = w + "%";
  const elQe = document.getElementById("pcDepQeAtual");
  if (elQe) {
    const totalVagasAtual = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
    const qeAtual = quocienteEleitoral(soma, totalVagasAtual) || 0;
    elQe.textContent = formatVotosCompacto(qeAtual);
    // Laranja enquanto a meta não fecha (protótipo refino v3) — atualiza
    // junto com o arrasto, não só no re-render completo.
    elQe.classList.toggle("pend", qeAtual < (quocienteEleitoral(Math.round(E), totalVagasAtual) || 0));
  }
}

// Acende a luz laranja + troca a notificação do card quando um arrasto
// (candidato OU partido) esbarra no teto de votos válidos do CARGO
// INTEIRO — trava real (não dá pra ter mais votos que o total do cargo),
// mas até 24/08/2026 era invisível: a alça só parava de responder, sem
// nenhuma explicação (achado do usuário, depois de editar uma lista já
// preenchida). `card` pode ser null se o gesto começar/terminar entre um
// re-render; nesse caso não faz nada, sem quebrar o arrasto.
function avisarSemEspacoCargo(card, semEspaco) {
  if (!card) return;
  const txt = card.querySelector(".pc-dep-notif-txt");
  const luz = card.querySelector(".pc-dep-notif-luz");
  if (!txt || !luz) return;
  if (semEspaco) {
    if (!txt.classList.contains("aviso-cargo")) {
      txt.textContent = "Sem espaço — o total de votos do cargo já bateu o teto. Diminua outro candidato pra liberar espaço aqui.";
      txt.classList.add("aviso-cargo");
    }
    luz.classList.remove("piscar");
    void luz.offsetWidth; // reinicia a animação a cada nova tentativa de arrastar além do teto
    luz.classList.add("piscar");
  } else if (txt.classList.contains("aviso-cargo")) {
    txt.textContent = txt.getAttribute("data-normal") || "";
    txt.classList.remove("aviso-cargo");
  }
}

function atualizarFaderDep(sl, v, cap, E) {
  const pct = Math.min(100, cap > 0 ? v / cap * 100 : 0);
  sl.querySelector(".pc-sen-fill").style.width = pct + "%";
  sl.querySelector(".pc-sen-grip").style.left = pct + "%";
  posicionarVotosDep(sl, v, cap, E);
  // Caixa de votos sobe pro lugar de onde a % ficava (protótipo aprovado
  // 28/08/2026) — atualiza ao vivo durante o arrasto, igual sempre foi
  // o rótulo de votos que ela substituiu.
  const crow = sl.closest(".pc-dep-crow");
  const valNum = crow && crow.querySelector(".pc-dep-cpct .valNum");
  if (valNum) valNum.textContent = (Number(v) || 0).toLocaleString("pt-BR");
}

// A barra perdeu o rótulo com número (protótipo aprovado 28/08/2026 —
// "podemos retirar a porcentagem da barra de votos") — a votação já
// aparece na caixinha ao lado do nome. O elemento .pc-sen-votos continua
// existindo (sem texto) só como alvo de toque próximo à alça.
function posicionarVotosDep(sl, v, cap, E) {
  const lbl = sl.querySelector(".pc-sen-votos");
  const bar = sl.querySelector(".pc-sen-bar");
  if (!lbl || !bar) return;
  lbl.textContent = "";
  const barW = bar.getBoundingClientRect().width || 300;
  const fillPx = Math.min(100, cap > 0 ? v / cap * 100 : 0) / 100 * barW;
  lbl.style.right = "auto";
  lbl.style.left = Math.max(0, fillPx - 20) + "px";
}

function attachListenersDeputadosFader(E, totalVagas) {
  const capCand = capCandidatoDeputado();
  const qeProj = quocienteEleitoral(Math.round(E), totalVagas) || 1;
  const candidatoDe = (gi, chave) => pcState.palpiteEdicao[gi].candidatos.find((c) => c.chave === chave);

  document.querySelectorAll("[data-dep-fader]").forEach((sl) => {
    const key = sl.dataset.depFader;
    const partes = key.split("|");
    const ehPartido = partes[0] === "p";
    const gi = +partes[1];

    if (!ehPartido) {
      posicionarVotosDep(sl, Number(candidatoDe(gi, partes[2])?.votos) || 0, capCand, E);
      const lbl = sl.querySelector(".pc-sen-votos");
      // Sem pointer-events (CSS: none) — esse alvo invisível ficava bem em
      // cima de onde o mouse passa pra arrastar e roubava o pointerdown do
      // arrasto (achado do usuário, 28/08/2026). O click ainda funciona via
      // lbl.click() disparado por JS na caixinha do topo, que ignora
      // pointer-events da CSS.
      lbl.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
      lbl.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirEdicaoDep(sl, key);
      });
      // Caixinha de votos no topo (onde a % ficava) também abre a
      // digitação — é o número visível agora que a barra perdeu o texto.
      const caixaTopo = sl.closest(".pc-dep-crow")?.querySelector(`[data-pc-dep-editar="${partes[2]}"]`);
      if (caixaTopo) caixaTopo.addEventListener("click", (e) => { e.stopPropagation(); abrirEdicaoDep(sl, key); });
    } else {
      const plq = sl.querySelector(".pc-dep-grip-plq");
      plq.style.pointerEvents = "auto";
      plq.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
      plq.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirEdicaoDep(sl, key);
      });
    }

    let base = null;
    const mover = (e) => {
      const r = sl.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const card = sl.closest(".pc-dep-card");
      if (ehPartido) {
        const p2 = pcState.palpiteEdicao[gi];
        const pedido = Math.round(frac * base.course);
        const alvo = fmdTravaIndividual(pedido, E, E, base.outrosTotal);
        const reais = p2.candidatos.filter((c) => c.fonte !== "legenda" && !c.status);
        const novos = fmdEscalarProporcional(base.membros, alvo, capCand);
        reais.forEach((c, i) => { c.votos = novos[i]; });
        atualizarBarraPartidoDom(sl, somaVotosGrupo(p2));
        if (card) card.querySelectorAll('[data-dep-fader^="c|"]').forEach((s2) => {
          const k2 = s2.dataset.depFader.split("|");
          atualizarFaderDep(s2, Number(candidatoDe(+k2[1], k2[2])?.votos) || 0, capCand, E);
        });
        // tetoIndividual e tetoColetivo são os DOIS iguais a E aqui — todo
        // clamping possível nesse ramo só pode vir do teto do cargo.
        avisarSemEspacoCargo(card, pedido > alvo);
      } else {
        const c = candidatoDe(gi, partes[2]);
        if (!c) return;
        const pedido = Math.round(frac * capCand);
        const limiteCargo = E - base.outrosTotal;
        c.votos = fmdTravaIndividual(pedido, capCand, E, base.outrosTotal);
        c.votosEditado = true;
        atualizarFaderDep(sl, Number(c.votos) || 0, capCand, E);
        const zoneP = document.querySelector('[data-dep-fader="p|' + gi + '"]');
        if (zoneP) atualizarBarraPartidoDom(zoneP, somaVotosGrupo(pcState.palpiteEdicao[gi]));
        // Só acende quando quem trava é o teto do CARGO (limiteCargo menor
        // que o teto individual do próprio candidato) — travar no teto
        // individual é normal (candidato só, sem nada a ver com o cargo)
        // e não precisa de aviso.
        avisarSemEspacoCargo(card, limiteCargo < capCand && pedido > limiteCargo);
      }
      atualizarHeaderDeputados(E);
    };
    sl.addEventListener("pointerdown", (e) => {
      if (_depEditAberto) return;
      snapshotPalpite();
      if (ehPartido) {
        const p2 = pcState.palpiteEdicao[gi];
        let membros = p2.candidatos.filter((c) => c.fonte !== "legenda" && !c.status).map((c) => Number(c.votos) || 0);
        if (membros.every((vv) => vv === 0)) membros = p2.candidatos.filter((c) => c.fonte !== "legenda" && !c.status).map((c) => Number(c.votos2022) || 1);
        // Curso do GESTO: fixo do início ao fim do arrasto (curso elástico
        // no meio do gesto faria a alça fugir do dedo) — mesma conta do
        // render estático (cursoBarraPartido), senão a barra "salta" ao
        // soltar (ver comentário da função).
        const soma0 = somaVotosGrupo(p2);
        const meta0 = Number(sl.dataset.meta) || 0;
        const course = cursoBarraPartido(meta0, soma0, qeProj);
        sl.dataset.course = String(Math.round(course));
        base = { membros, outrosTotal: somaVotosCargo() - soma0, course };
      } else {
        const c = candidatoDe(gi, partes[2]);
        base = { outrosTotal: somaVotosCargo() - (Number(c?.votos) || 0) };
      }
      _depDragKey = key;
      sl.classList.add("ativo");
      try { sl.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(_depTimer);
      mover(e);
    });
    sl.addEventListener("pointermove", (e) => { if (_depDragKey === key) mover(e); });
    const soltar = () => {
      if (_depDragKey !== key) return;
      _depDragKey = null;
      base = null;
      sl.classList.remove("ativo");
      concluirGestoDeputados();
    };
    sl.addEventListener("pointerup", soltar);
    sl.addEventListener("pointercancel", soltar);
  });

  // Setas de ajuste fino nas pontas da barra do candidato (protótipo
  // aprovado 28/08/2026): clique dá um passo de 1% da régua; segurar
  // repete (stepper estilo iOS). Fecha o gesto igual ao arrasto.
  document.querySelectorAll("[data-pc-seta-dep]").forEach((btn) => {
    const partes = btn.dataset.pcSetaDep.split("|"); // c|gi|chave|dir
    if (partes[0] !== "c") return;
    const giS = +partes[1];
    const chaveC = partes[2];
    const delta = partes[3] === "mais" ? 1 : -1;
    const passo = Math.max(1, Math.round(capCand * 0.01));
    let timerRep = null, intRep = null, mexeu = false;
    const aplicarPasso = () => {
      const c = candidatoDe(giS, chaveC);
      if (!c) return;
      const outros = somaVotosCargo() - (Number(c.votos) || 0);
      c.votos = fmdTravaIndividual((Number(c.votos) || 0) + delta * passo, capCand, E, outros);
      c.votosEditado = true;
      const sl2 = document.querySelector('[data-dep-fader="c|' + giS + '|' + chaveC + '"]');
      if (sl2) atualizarFaderDep(sl2, Number(c.votos) || 0, capCand, E);
      const zoneP = document.querySelector('[data-dep-fader="p|' + giS + '"]');
      if (zoneP) atualizarBarraPartidoDom(zoneP, somaVotosGrupo(pcState.palpiteEdicao[giS]));
      atualizarHeaderDeputados(E);
      mexeu = true;
    };
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (_depEditAberto) return;
      // Re-renders pendentes de um gesto ANTERIOR (re-render de 150ms +
      // reagrupamento de 1200ms) destruiriam este botão no meio do
      // "segurar" e matariam a repetição — cancela os dois; o release
      // reagenda tudo via concluirGestoDeputados().
      clearTimeout(_depTimer);
      clearTimeout(window._pcReordTimer);
      snapshotPalpite();
      aplicarPasso();
      timerRep = setTimeout(() => { intRep = setInterval(aplicarPasso, 90); }, 420);
    });
    const soltarSeta = () => {
      clearTimeout(timerRep); clearInterval(intRep);
      if (mexeu) { mexeu = false; concluirGestoDeputados(); }
    };
    btn.addEventListener("pointerup", soltarSeta);
    btn.addEventListener("pointerleave", soltarSeta);
    btn.addEventListener("pointercancel", soltarSeta);
  });

  // Box de edição nominal (toque na plaqueta do partido ou no rótulo do
  // candidato) — compartilhado pelos dois níveis.
  function abrirEdicaoDep(sl, key) {
    if (_depEditAberto) return;
    _depEditAberto = true;
    const partes = key.split("|");
    const atual = partes[0] === "p"
      ? somaVotosGrupo(pcState.palpiteEdicao[+partes[1]])
      : (Number(candidatoDe(+partes[1], partes[2])?.votos) || 0);
    const div = document.createElement("div");
    div.className = "pc-sen-edit";
    div.innerHTML = '<input inputmode="numeric" value="' + atual + '">';
    sl.appendChild(div);
    const inp = div.querySelector("input");
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const aplicar = () => {
      _depEditAberto = false;
      const pedido = Number(String(inp.value).replace(/\D/g, "")) || 0;
      snapshotPalpite();
      if (partes[0] === "p") {
        const p2 = pcState.palpiteEdicao[+partes[1]];
        const outros = somaVotosCargo() - somaVotosGrupo(p2);
        escalarGrupoDeputados(p2, fmdTravaIndividual(pedido, E, E, outros), capCand);
      } else {
        const c = candidatoDe(+partes[1], partes[2]);
        if (c) {
          const outros = somaVotosCargo() - (Number(c.votos) || 0);
          // Teto individual da DIGITAÇÃO é E (o real): a barra tem régua
          // fixa (capCand), mas quem digitar acima dela fica com o número
          // verdadeiro e a barra cravada no fim (regra de 17/08).
          c.votos = fmdTravaIndividual(pedido, E, E, outros);
          c.votosEditado = true;
        }
      }
      recalcularMarcadosDeputados();
      agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
      agendarReordenacaoSuave(null, 1200);
      renderCargoEstadual();
    };
    inp.addEventListener("blur", aplicar);
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") inp.blur();
      // Tab: aplica e pula pro box do candidato logo abaixo (pedido do
      // usuário, 18/08/2026) — a chave do próximo é capturada ANTES do
      // re-render e o box novo abre depois que o DOM volta.
      if (ev.key === "Tab") {
        ev.preventDefault();
        const linha = sl.closest(".pc-dep-crow");
        const proxima = linha ? linha.nextElementSibling : null;
        if (proxima && proxima.classList.contains("pc-dep-crow")) _depEditProximo = proxima.dataset.depCand;
        inp.blur();
      }
    });
  }

  // Reabre o box de edição no candidato seguinte após o Tab (o apply
  // re-renderiza tudo; a chave sobrevive no módulo).
  if (_depEditProximo) {
    const chaveProx = _depEditProximo;
    _depEditProximo = null;
    const alvo = document.querySelector(`.pc-dep-crow[data-dep-cand="${CSS.escape(chaveProx)}"] [data-dep-fader]`);
    if (alvo) abrirEdicaoDep(alvo, alvo.dataset.depFader);
  }

  // Box de vagas (− N +): comanda o volume — mudar a quantidade reescala a
  // votação do grupo pra nova meta (lógica anterior de quantidade, agora
  // movendo os faders pela FMD).
  const aplicarVagas = (gi, novoBruto) => {
    const p2 = pcState.palpiteEdicao[gi];
    const counts = vagasApuradasPorGrupo();
    const atual = vagasIndicadasDe(p2, counts[gi] || 0);
    // TAPETE CURTO das vagas (bug corrigido em 19/08/2026): o clamp
    // antigo limitava só o partido individual ao total do cargo — a SOMA
    // entre partidos podia passar de 40/16 (ex.: 20+20+20). Mesma regra
    // da FMD dos votos (invariante 3, PROJETO.md §8.2): o pedido é
    // limitado ao que ainda cabe no cargo descontando as vagas já
    // indicadas nos OUTROS partidos.
    const somaOutras = pcState.palpiteEdicao.reduce(
      (s, pp, i) => (i === gi ? s : s + vagasIndicadasDe(pp, counts[i] || 0)), 0);
    const novo = Math.max(0, Math.min(novoBruto, Math.max(0, totalVagas - somaOutras)));
    if (novo === atual) return;
    snapshotPalpite();
    p2.vagasIndicadas = novo;
    // O box muda SÓ O ESPAÇO (a meta/curso da barra) — a votação já dada
    // aos candidatos fica exatamente como está; preencher o espaço novo é
    // gesto do usuário (arrasto, digitação ou mágico). Decisão final do
    // usuário em 17/08/2026, corrigindo a versão que reescalava os votos.
    recalcularMarcadosDeputados();
    agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
    agendarReordenacaoSuave(p2.nome);
    renderCargoEstadual();
  };
  const vagasAtuais = (gi) => vagasIndicadasDe(pcState.palpiteEdicao[gi], vagasApuradasPorGrupo()[gi] || 0);
  document.querySelectorAll("[data-dep-vaga-mais]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); aplicarVagas(+b.dataset.depVagaMais, vagasAtuais(+b.dataset.depVagaMais) + 1); }));
  document.querySelectorAll("[data-dep-vaga-menos]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); aplicarVagas(+b.dataset.depVagaMenos, vagasAtuais(+b.dataset.depVagaMenos) - 1); }));
  // Toque no NÚMERO do box abre edição direta (pedido de 18/08 — os +/−
  // reordenam o card a cada clique, digitar evita perseguir o partido).
  document.querySelectorAll("[data-dep-vaga-edit]").forEach((sp) => sp.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sp.querySelector("input")) return;
    const gi = +sp.dataset.depVagaEdit;
    const atual = vagasAtuais(gi);
    sp.innerHTML = '<input inputmode="numeric" value="' + atual + '" style="width:30px; text-align:center; font:inherit; color:inherit; background:transparent; border:none; outline:none; padding:0;">';
    const inp = sp.querySelector("input");
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const aplicar = () => {
      // Só aceita se sobrar pelo menos um dígito de verdade — texto puro
      // ("abc") não pode virar "0" silencioso (bug achado em revisão,
      // 18/08/2026: zerava as vagas do partido sem o usuário perceber).
      const digitos = String(inp.value).replace(/\D/g, "");
      if (digitos !== "") aplicarVagas(gi, Number(digitos));
      else renderCargoEstadual();
    };
    inp.addEventListener("blur", aplicar);
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") inp.blur(); });
    inp.addEventListener("pointerdown", (ev) => ev.stopPropagation());
  }));

  document.querySelectorAll("[data-dep-info]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const p2 = pcState.palpiteEdicao[+b.dataset.depInfo];
    const chave = "depInfo_" + pcState.cargoAtivo + "_" + p2.nome;
    pcState.expandido[chave] = !pcState.expandido[chave];
    renderCargoEstadual();
  }));

  document.querySelectorAll("[data-dep-toggle]").forEach((h) => h.addEventListener("click", (e) => {
    if (e.target.closest("[data-dep-stepper]") || e.target.closest("[data-dep-magico]") || e.target.closest("a") || e.target.closest("[data-pc-editar-instagram]")) return;
    const gi2 = h.dataset.depToggle;
    const p2 = pcState.palpiteEdicao[+gi2];
    const chave = "faderAberto_" + pcState.cargoAtivo + "_" + p2.nome;
    const abrindo = !pcState.expandido[chave];
    pcState.expandido[chave] = abrindo;
    // Mesmo padrão do Plenário/faixa de vagas (08/09/2026): abre/fecha
    // animado em vez de recarregar o card inteiro. O conteúdo (lista de
    // candidatos + faders) já nasce sempre presente no DOM — só escondido
    // por altura zero quando fechado — então os próprios controles de
    // arrastar voto continuam funcionando normalmente, aberto ou não.
    const corpo = document.getElementById("pcDepCorpo-" + gi2);
    if (corpo) {
      if (abrindo) {
        corpo.style.maxHeight = corpo.scrollHeight + "px";
        corpo.classList.add("aberto");
      } else {
        corpo.style.maxHeight = corpo.scrollHeight + "px";
        void corpo.offsetHeight;
        corpo.style.maxHeight = "0px";
        corpo.classList.remove("aberto");
      }
    }
    document.querySelectorAll(`[data-dep-toggle="${gi2}"]`).forEach((el) => {
      el.classList.toggle("aberto", abrindo);
      if (el.classList.contains("pc-dep-puxador")) el.title = abrindo ? "Recolher candidatos" : "Abrir candidatos";
    });
    // A prévia (1º candidato) só faz sentido fechado — sem ela animar,
    // só troca de visibilidade junto com o corpo abrindo/fechando.
    const preview = h.closest(".pc-dep-card")?.querySelector(".pc-dep-preview");
    if (preview) preview.style.display = abrindo ? "none" : "";
  }));

  document.querySelectorAll("[data-dep-magico]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const p2 = pcState.palpiteEdicao[+b.dataset.depMagico];
    snapshotPalpite();
    autoPreenchimentoDeputadosFader(E, p2);
    agendarReordenacaoSuave(p2.nome, 600);
    renderCargoEstadual();
  }));

  const inf = document.getElementById("pcDepInf");
  if (inf) inf.addEventListener("click", () => {
    pcState.funilVotosAberto = !pcState.funilVotosAberto;
    renderCargoEstadual();
  });

  const zone = document.getElementById("pcDepZone");
  if (zone) {
    let baseM = null;
    const moverMestre = (e) => {
      if (!baseM) return;
      const r = zone.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const novosTotais = fmdEscalarProporcional(baseM.totais, frac * E, E);
      pcState.palpiteEdicao.forEach((p, i) => {
        // A legenda tamb\u00e9m escala com a al\u00e7a mestra (31/08/2026) — o
        // "aumento dos votos v\u00e1lidos" cresce sigla junto com os nominais.
        const reais = p.candidatos.filter((c) => !c.status);
        const novos = fmdEscalarProporcional(baseM.membros[i], novosTotais[i], capCand);
        reais.forEach((c, j) => { c.votos = novos[j]; });
      });
      document.querySelectorAll("[data-dep-fader]").forEach((sl) => {
        const k = sl.dataset.depFader.split("|");
        if (k[0] === "p") atualizarBarraPartidoDom(sl, somaVotosGrupo(pcState.palpiteEdicao[+k[1]]));
        else atualizarFaderDep(sl, Number(candidatoDe(+k[1], k[2])?.votos) || 0, capCand, E);
      });
      atualizarHeaderDeputados(E);
    };
    zone.addEventListener("pointerdown", (e) => {
      if (somaVotosCargo() <= 0) return;
      snapshotPalpite();
      baseM = {
        totais: pcState.palpiteEdicao.map((p) => somaVotosGrupo(p)),
        membros: pcState.palpiteEdicao.map((p) => p.candidatos.filter((c) => !c.status).map((c) => Number(c.votos) || 0)),
      };
      _depMasterAtivo = true;
      zone.classList.add("ativo");
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(_depTimer);
      moverMestre(e);
    });
    zone.addEventListener("pointermove", (e) => { if (_depMasterAtivo) moverMestre(e); });
    const soltarMestre = () => {
      if (!_depMasterAtivo) return;
      _depMasterAtivo = false;
      baseM = null;
      zone.classList.remove("ativo");
      concluirGestoDeputados();
    };
    zone.addEventListener("pointerup", soltarMestre);
    zone.addEventListener("pointercancel", soltarMestre);
  }
}

// Mágico do modelo fader: passo 1 usa a distribuição realista já existente
// (balancearPartidoSelecao — voto de 2022 escalado + curva decrescente);
// passo 2 normaliza os NÃO editados à mão pra soma fechar exatamente em E
// (100% — o gate do Avançar exige lista completa). Com `soPartido`, roda
// só naquele grupo e o alvo do grupo é a fatia proporcional à força de
// 2022 dele, sem mexer nos demais.
function autoPreenchimentoDeputadosFader(E, soPartido) {
  const capCand = capCandidatoDeputado();
  const grupos = soPartido ? [soPartido] : pcState.palpiteEdicao.filter((p) => !p.semAta2026);
  grupos.forEach((p) => { balancearPartidoSelecao(p); });
  if (soPartido) {
    recalcularMarcadosDeputados();
    agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
    return;
  }
  // Escala um conjunto de candidatos até `alvoConj` votos, preservando os
  // fixos (editados à mão) e repartindo o resto proporcional à base viva
  // (a curva 2022+decaimento que balancearPartidoSelecao acabou de semear).
  // Base toda zerada (partido novo, sem histórico) reparte por igual.
  const escalarConjunto = (cands, alvoConj) => {
    const eFixo = (c) => c.votosEditado && Number(c.votos) > 0;
    const somaFixos = cands.reduce((s, c) => s + (eFixo(c) ? Number(c.votos) : 0), 0);
    const alvoLivre = Math.max(0, alvoConj - somaFixos);
    let base = cands.map((c) => eFixo(c) ? 0 : (Number(c.votos) || 0));
    if (!base.some((v) => v > 0)) base = cands.map((c) => eFixo(c) ? 0 : 1);
    // O teto por candidato é limite do DESENHO da barra, não do voto — se
    // ele impedir o conjunto de absorver a cota (n × teto < alvo), sobe o
    // necessário pra cota caber; sem isso a vaga indicada escapava pra
    // outro partido no arremate (achado em 21/08/2026, Federal).
    const livresN = cands.filter((c) => !eFixo(c)).length;
    const capEfetivo = Math.max(capCand, livresN ? Math.ceil(alvoLivre / livresN) : capCand);
    const dist = fmdEscalarProporcional(base, alvoLivre, capEfetivo);
    cands.forEach((c, i) => {
      if (eFixo(c)) return;
      c.votos = dist[i];
      c.votosEditado = false;
    });
  };
  const candidatosDe = (p) => p.candidatos.filter((c) => c.fonte !== "legenda");
  const somaDe = (p) => candidatosDe(p).reduce((s, c) => s + (Number(c.votos) || 0), 0);
  // O mágico HONRA as bancadas indicadas nos boxes (promessa do tutorial:
  // "proporcional às vagas que você selecionou" — bug achado pelo usuário
  // em 21/08/2026: preencher ignorando os boxes fazia a apuração divergir
  // do indicado e o console somar 62/40). Partido com box explícito vai
  // pra vagas × QE projetado (art. 106: votos exatos em múltiplos do
  // quociente dão a cada um exatamente as vagas indicadas); o restante do
  // eleitorado se reparte entre os partidos sem box, proporcional à força
  // histórica — de onde saem as vagas não indicadas, pela própria apuração.
  const totalVagasAuto = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const qeProj = quocienteEleitoral(Math.round(E), totalVagasAuto) || 1;
  const comAta = pcState.palpiteEdicao.filter((p) => !p.semAta2026);
  const explicitos = comAta.filter((p) => Number.isFinite(Number(p.vagasIndicadas)) && Number(p.vagasIndicadas) > 0);
  const somaVagasExpl = explicitos.reduce((s, p) => s + Number(p.vagasIndicadas), 0);
  if (explicitos.length && somaVagasExpl > 0) {
    // Normaliza se (por dado legado) os boxes somarem mais que o total —
    // o tapete curto impede isso nos edits novos, mas rascunho antigo pode
    // carregar excesso.
    const fatorNorm = Math.min(1, totalVagasAuto / somaVagasExpl);
    explicitos.forEach((p) => {
      escalarConjunto(candidatosDe(p), Math.round(Number(p.vagasIndicadas) * fatorNorm * qeProj));
    });
    const somaExplReal = explicitos.reduce((s, p) => s + somaDe(p), 0);
    const livres = comAta.filter((p) => !explicitos.includes(p));
    const vagasRestantes = Math.max(0, totalVagasAuto - Math.round(somaVagasExpl * fatorNorm));
    if (livres.length && vagasRestantes > 0) {
      // As vagas NÃO indicadas são alocadas entre os partidos livres pelo
      // método das médias (D'Hondt) sobre a força semeada (curva 2022) — e
      // cada livre é escalado pra sua cota exata (vagas × QE). Sem isso, a
      // votação fragmentada dos livres deixava sobras escorrerem pros
      // partidos COM box, que apuravam mais do que o usuário indicou
      // (12 indicadas → 14 apuradas, achado em 21/08/2026).
      const forca = livres.map((p) => somaDe(p) || 0);
      const alocadas = new Array(livres.length).fill(0);
      for (let s = 0; s < vagasRestantes; s++) {
        let melhor = -1, melhorMedia = -1;
        forca.forEach((f, i) => {
          const m = f / (alocadas[i] + 1);
          if (m > melhorMedia) { melhorMedia = m; melhor = i; }
        });
        if (melhor < 0) break;
        alocadas[melhor]++;
      }
      livres.forEach((p, i) => escalarConjunto(candidatosDe(p), alocadas[i] * qeProj));
    } else if (livres.length) {
      // Boxes já somam o total: livres ficam sem cota (zerados de propósito
      // — o usuário indicou todas as vagas em outros partidos).
      livres.forEach((p) => escalarConjunto(candidatosDe(p), 0));
    } else if (somaExplReal > 0 && Math.abs(E - somaExplReal) > 1) {
      // Todos os partidos têm box: estica o conjunto inteiro até E
      // mantendo as proporções das bancadas.
      const todosCands = [];
      explicitos.forEach((p) => candidatosDe(p).forEach((c) => todosCands.push(c)));
      escalarConjunto(todosCands, E);
    }
  } else {
    // Sem nenhuma bancada indicada: distribuição realista global (curva
    // 2022), comportamento original.
    const todos = [];
    pcState.palpiteEdicao.forEach((p) => candidatosDe(p).forEach((c) => todos.push(c)));
    escalarConjunto(todos, E);
  }
  // Arremate: o teto por candidato pode impedir um partido de absorver a
  // cota inteira e o total parar abaixo de E (94% no Federal, bug achado
  // em 21/08/2026 — "não preencheu toda a votação"). Escalar TODO o
  // conjunto proporcionalmente até E preserva as razões entre partidos —
  // e portanto a apuração — enquanto fecha a barra em 100%.
  const somaFinal = pcState.palpiteEdicao.reduce((s, p) => s + somaDe(p), 0);
  if (E - somaFinal > E * 0.001) {
    const todosFinal = [];
    pcState.palpiteEdicao.filter((p) => !p.semAta2026).forEach((p) => candidatosDe(p).forEach((c) => todosFinal.push(c)));
    escalarConjunto(todosFinal, E);
  }
  recalcularMarcadosDeputados();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
}


// Setas ao lado do contador "marcados/vagas2022": ajustam a quantidade em 1,
// sem precisar digitar. Quem preenche essa quantidade é sempre recalculado
// (ver aplicarQuantidadeMarcados acima) — a seta só muda o número.
function incrementarEleitosPartido(p) {
  const atual = p.candidatos.filter((c) => c.marcadoEleito).length;
  aplicarQuantidadeMarcados(p, atual + 1);
}

function decrementarEleitosPartido(p) {
  const atual = p.candidatos.filter((c) => c.marcadoEleito).length;
  aplicarQuantidadeMarcados(p, Math.max(0, atual - 1));
}

// Digitar direto no número do contador — mesma trava de vagas do cargo
// inteiro que incrementar/decrementar respeitavam antes, só que aplicada de
// uma vez (não precisa mais de loop candidato a candidato).
function definirEleitosPartido(p, alvo) {
  const marcadosOutrosPartidos = totalMarcadosCargoAtivo() - p.candidatos.filter((c) => c.marcadoEleito).length;
  const limiteDisponivel = Math.max(0, totalVagasCargoAtivo() - marcadosOutrosPartidos);
  const alvoValido = Math.max(0, Math.round(Number(alvo) || 0));
  aplicarQuantidadeMarcados(p, Math.min(alvoValido, limiteDisponivel));
}

function adicionarCandidatoNoPartido(p) {
  const nome = prompt(`Nome do candidato (${p.nome}):`);
  if (!nome || !nome.trim()) return;
  snapshotPalpite();
  p.candidatos.push({
    chave: chaveCandidato(nome.trim(), p.nome), nome: nome.trim(), municipio: "",
    votos2022: 0, fonte: "manual", eleito2022: false, invalidado2022: false,
    votos: 0, votosEditado: false, marcadoEleito: false,
  });
  renderCargoEstadual();
}

// Tela pai: desenha o interruptor de cargo (Dep. Estadual / Dep. Federal /
// Senador) e delega o conteúdo pro cargo ativo. Só "estadual" tem candidatos
// carregados — os outros dois mostram um aviso, sem inventar dado fictício
// no código real (ver CARGOS acima e PROJETO.md, Fase 2.8).
async function renderSelecaoCandidatos() {
  pcState._farolContexto = "palpite";
  const el = document.getElementById("pcConteudo");
  // Garante pcState.palpiteEdicao do cargo ativo ANTES de montar os
  // pontinhos das abas — sem isso o pontinho do cargo recém-clicado usava
  // o dado do cargo anterior (ver garantirPalpiteEdicaoAtivo).
  const cargoAtivoInfo = CARGOS.find((c) => c.id === pcState.cargoAtivo);
  if (cargoAtivoInfo.disponivel) await garantirPalpiteEdicaoAtivo();
  // Pontinho aceso (.pc-tab-dot.done, já existia no CSS mas nunca era
  // aplicado) = esse cargo já tem todas as vagas marcadas — mesma regra
  // que já habilita o botão "Avançar" daquele cargo. Só olha cargos que já
  // têm rascunho carregado (ativo, ou já visitado antes e cacheado em
  // pcState.palpitesPorCargo) — não força carregar um cargo que a pessoa
  // ainda nem abriu só pra decidir a cor do pontinho.
  const botoes = CARGOS.map((c) => {
    const lista = c.id === pcState.cargoAtivo ? pcState.palpiteEdicao : (pcState.palpitesPorCargo && pcState.palpitesPorCargo[c.id]);
    const totalVagasC = vagasFixasCargo(pcState.estado, c.id);
    const totalIndicadoC = lista ? lista.reduce((s, p) => s + p.candidatos.filter((cc) => cc.marcadoEleito).length, 0) : 0;
    const concluido = !!lista && totalVagasC > 0 && totalIndicadoC === totalVagasC;
    // Rótulo da aba sem o prefixo "Dep." — o que precisa ficar claro numa
    // tela estreita é a palavra-chave do cargo (Estadual/Federal/Senador),
    // não a abreviação. "Dep. Estadual" completo continua em uso em todo
    // resto do app (CARGOS.label não muda) — é só esta aba específica.
    // Pedido do usuário em 17/08/2026, junto com a caixa de estatísticas
    // não depender mais de scroll escondido pra caber.
    const rotuloAba = c.label.replace(/^Dep\.\s*/, "");
    return `
    <button data-pc-cargo="${c.id}" class="${pcState.cargoAtivo === c.id ? "active" : ""}${c.disponivel ? "" : " indisponivel"}">
      ${rotuloAba}<span class="pc-tab-dot${concluido ? " done" : ""}" title="${concluido ? "Todas as vagas marcadas" : ""}"></span>
    </button>`;
  }).join("");
  el.innerHTML = `
    <div id="pcFarolBloco"></div>
    <div id="pcStickyHeader">
      <div class="pc-farol-linha-abas">
        <span id="pcFarolPontosSlot"></span>
        <div class="pc-cargo-switch">${botoes}</div>
        <span class="pc-cab-acoes">
          <button type="button" id="pcBtnImprimirCabecalho" class="pc-mini-btn pc-mini-btn-sm" title="Imprimir">${iconeSvg("impressora", 12)}</button>
        </span>
      </div>
      <div id="pcPainelSlot"></div>
      <div id="pcBuscaSlot"></div>
    </div>
    <div id="pcCargoConteudo"></div>
  `;
  document.querySelectorAll("[data-pc-cargo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Sem isso, o cargo que a pessoa está DEIXANDO perdia o rascunho de
      // pcState.palpitesPorCargo (só existia em pcState.palpiteEdicao,
      // esvaziado na troca) — o pontinho de "concluído" apagava ao voltar
      // pra essa aba depois, mesmo com tudo ainda marcado. Achado testando
      // o pontinho em 06/08/2026.
      if (pcState.palpiteEdicao) {
        if (!pcState.palpitesPorCargo) pcState.palpitesPorCargo = {};
        pcState.palpitesPorCargo[pcState.cargoAtivo] = pcState.palpiteEdicao;
      }
      pcState.cargoAtivo = btn.dataset.pcCargo;
      renderSelecaoCandidatos();
    });
  });
  if (cargoAtivoInfo.disponivel) renderCargoEstadual();
  else renderCargoIndisponivel(cargoAtivoInfo);
}

// Cargos ainda sem candidatos carregados (Dep. Federal, Senador) — estrutura
// pronta pra receber dados reais, sem simular nome de candidato.
function renderCargoIndisponivel(cargo) {
  const slotPainel = document.getElementById("pcPainelSlot");
  if (slotPainel) slotPainel.innerHTML = "";
  document.getElementById("pcCargoConteudo").innerHTML = `
    <div class="glass-card">
      ${estadoVazio({ icone: "calendario", titulo: `${cargo.label} ainda não disponível`, texto: "A lista de candidatos desse cargo ainda não foi carregada. Continue pelo Dep. Estadual por enquanto." })}
    </div>`;
}

// Garante que pcState.palpiteEdicao já é o rascunho do CARGO ATIVO —
// extraído do topo de renderCargoEstadual (abaixo) porque o interruptor de
// cargo (renderSelecaoCandidatos) também precisa disso PRONTO antes de
// decidir o pontinho de "concluído" de cada aba. Sem isso, o pontinho do
// cargo recém-clicado sempre mostrava o estado do cargo anterior — a
// aba trocava de conteúdo mas o dot ficava "um clique atrasado" (achado
// testando o interruptor de cargo em 06/08/2026). Idempotente: chamar de
// novo não recarrega nada se já está em dia.
// Um rascunho salvo (autosave, "onde eu parei") fica ÓRFÃO quando a fonte
// oficial de candidatos daquele estado+cargo muda de forma DEPOIS que a
// pessoa já tinha mexido nele — ex.: alguém marca eleitos no Senador
// enquanto esse cargo ainda caía no fallback de 2022 (sem ata real
// processada ainda); quando a ata real de 2026 chega e substitui o
// fallback, o pool oficial passa a ser gente inteiramente diferente, mas
// o rascunho salvo (que tem prioridade, ver garantirPalpiteEdicaoAtivo)
// continua de pé mostrando o elenco antigo pra sempre — nenhuma correção
// nos dados resolve isso sozinha, porque o rascunho nem olha pro dado
// oficial de novo depois de salvo uma vez. Regra: se NENHUM id de
// candidato do rascunho aparece no pool oficial fresco, o rascunho é
// tratado como órfão e descartado (recomeça do pool atual, como se nunca
// tivesse sido salvo) — mantém rascunhos normais intactos (basta 1 id em
// comum) e só reage quando o elenco trocou por completo. Regra geral,
// não é gambiarra pontual pro Senador/SC — vale pra qualquer estado/cargo
// em que isso se repita. Achado com o usuário (Senador/SC preso nos
// candidatos de 2022) em 16/08/2026.
// Lista salva da ERA ANTIGA (política de 21/08/2026): se QUALQUER cargo
// da lista carrega um elenco que a fonte oficial já substituiu (mesma
// régua de rascunhoEhOrfao), a lista é INVÁLIDA pra edição e pra depósito
// — "não podemos imaginar que a lista seria guardada com a base errada"
// (decisão do usuário). Cédulas JÁ depositadas permanecem imutáveis como
// retrato histórico; a validade é tratada na apuração de pontos
// (RANQUEAMENTO.md: candidatura retirada/invalidada/sub judice não pontua).
function listaEhDaEraAntiga(palpitesPorCargo, uf) {
  if (!palpitesPorCargo) return false;
  return CARGOS.some((c) => {
    const lista = palpitesPorCargo[c.id];
    if (!lista || !lista.length) return false;
    const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, uf);
    return rascunhoEhOrfao(lista, poolOficial);
  });
}

function rascunhoEhOrfao(rascunho, poolOficial) {
  if (!rascunho || !rascunho.length) return false;
  if (!poolOficial || !poolOficial.length) return false;
  // ERRO CRÍTICO corrigido em 21/08/2026: a comparação usava c.id, campo
  // que os candidatos de montarEstadoPalpite NÃO têm — undefined casava
  // com undefined e NENHUM rascunho era descartado, então rascunhos da
  // era pré-atas (elenco de 2022 escalado pelo fator) sobreviviam e o
  // usuário abria a página com candidatos de 2022 no lugar do elenco
  // real de 2026. Agora compara por CHAVE (o identificador real) e exige
  // que a MAIORIA dos candidatos do rascunho ainda exista no elenco
  // oficial — rascunho meio-órfão também é inutilizável.
  const chaveDe = (c) => c.chave || c.id || null;
  const oficiais = new Set();
  poolOficial.forEach((p) => p.candidatos.forEach((c) => {
    const k = chaveDe(c);
    if (k != null && c.fonte !== "legenda") oficiais.add(k);
  }));
  const doRascunho = [];
  rascunho.forEach((p) => p.candidatos.forEach((c) => {
    const k = chaveDe(c);
    if (k != null && c.fonte !== "legenda") doRascunho.push(k);
  }));
  if (!doRascunho.length) return true; // sem identificador nenhum = era antiga
  const sobreviventes = doRascunho.filter((k) => oficiais.has(k)).length;
  return sobreviventes / doRascunho.length < 0.5;
}

// Complemento da regra de rascunho órfão (acima): ela só descarta o
// rascunho quando o elenco INTEIRO mudou — mas uma correção de dados pode
// remover só UM grupo do pool oficial (ex.: o "SEM PARTIDO" com o Marcos
// Vieira duplicado, removido em 16/08/2026) e o rascunho salvo antes da
// correção continua de pé (a maioria dos ids ainda bate), trazendo o
// grupo fantasma de volta pra tela pra sempre. Achado pelo usuário em
// 17/08/2026 ("Marcos Vieira duplicado. Parece que devemos descartar
// essa ata, sendo que sequer existe partido" — a ata já tinha sido
// corrigida; o que sobrava era o rascunho antigo dele).
// Regra geral: remove do rascunho/lista os GRUPOS cujo nome não existe
// mais no pool oficial. Poda por grupo (não por candidato) de propósito —
// candidato individual pode ser adição manual legítima da pessoa dentro
// de um partido real; um grupo inteiro que o dado oficial não conhece é
// sempre resquício de dado antigo. Vale pra qualquer estado/cargo.
// Caso extra: quando o pool diz que o partido está SEM ATA de 2026 (card
// vazio e bloqueado, ver registro-2026.js), o grupo do rascunho — que
// pode carregar a chapa placeholder de 2022 de antes de 08/08 — é
// SUBSTITUÍDO pela versão vazia do pool, não mantido (senão o card
// bloqueado mostraria candidatos que o dado oficial não confirma).
function podarGruposForaDoPool(lista, poolOficial) {
  if (!lista || !lista.length || !poolOficial || !poolOficial.length) return lista;
  const poolPorNome = {};
  poolOficial.forEach((p) => { poolPorNome[p.nome] = p; });
  // Chaves oficiais de TODOS os candidatos do pool (qualquer grupo) — a
  // poda POR CANDIDATO abaixo compara contra o conjunto inteiro, não só o
  // grupo homônimo, pra não derrubar quem trocou de partido legitimamente.
  const chavesOficiais = new Set();
  const _oficialPorChave = new Map();
  poolOficial.forEach((p) => p.candidatos.forEach((c) => {
    if (c.chave != null) { chavesOficiais.add(c.chave); _oficialPorChave.set(c.chave, c); }
  }));
  const podada = lista
    .filter((p) => poolPorNome[p.nome])
    // Sincroniza nos DOIS sentidos: usa a versão fresca do pool quando ele
    // quer travar AGORA (semAta2026 verdadeiro) — igual sempre foi — mas
    // também quando o rascunho JÁ estava travado (nada de edição real
    // pra perder ali) e o pool destravou nesse meio tempo (ata nova ou
    // registro oficial chegou depois do rascunho ser salvo). Sem o
    // segundo caso, um candidato novo (ex.: registro RRC antes da ata)
    // nunca aparecia pra quem já tinha rascunho daquele cargo — bug
    // achado em 18/08/2026 com o caso do Lunelli (MDB/Senador).
    .map((p) => (poolPorNome[p.nome].semAta2026 || p.semAta2026) ? poolPorNome[p.nome] : p)
    // Poda POR CANDIDATO (REGRA MESTRA, 2ª rodada — 21/08/2026 à noite): a
    // régua de rascunhoEhOrfao só descarta o rascunho quando a MAIORIA
    // sumiu. Um rascunho da era pré-atas em que muitos candidatos de 2022
    // também concorrem em 2026 SOBREVIVE pela maioria — e os que não
    // concorrem (Julio Garcia, Zé Caramori...) voltavam pra tela como se
    // fossem elenco de 2026, dentro dos grupos sobreviventes (regressão
    // achada pelo usuário com print). Regra: candidato do rascunho que
    // não existe em NENHUM grupo do pool oficial sai — exceto adição
    // manual do próprio usuário (fonte:"manual") e voto de legenda.
    .map((p) => {
      const fantasmas = p.candidatos.some((c) => c.fonte !== "manual" && c.fonte !== "legenda" && c.chave != null && !chavesOficiais.has(c.chave));
      if (!fantasmas) return p;
      return { ...p, candidatos: p.candidatos.filter((c) => c.fonte === "manual" || c.fonte === "legenda" || c.chave == null || chavesOficiais.has(c.chave)) };
    })
    // Complemento: candidato que EXISTE no grupo do pool mas falta no
    // rascunho (ata/RRC processado depois do rascunho ser salvo) entra
    // ZERADO de verdade (votos:0 — o {...c} cru trazia o voto de 2022 do
    // pool e podia estourar a soma acima de 100%, achado da revisão de
    // 22/08).
    .map((p) => {
      const oficial = poolPorNome[p.nome];
      if (!oficial || oficial === p) return p;
      const chavesNoRascunho = new Set(p.candidatos.map((c) => c.chave));
      const faltantes = oficial.candidatos.filter((c) => c.chave != null && !chavesNoRascunho.has(c.chave));
      if (!faltantes.length) return p;
      return { ...p, candidatos: [...p.candidatos, ...faltantes.map((c) => ({ ...c, votos: 0, votosEditado: false, marcadoEleito: false }))] };
    })
    // STATUS do pool VENCE no candidato sobrevivente (CRÍTICO da revisão
    // de 22/08, mesma família da recontaminação por rascunho): o campo
    // status (desistência/sub judice) só nasce no pool fresco — rascunho
    // salvo ANTES da desistência mantinha o objeto antigo sem o campo, e
    // o candidato congelado seguia recebendo votos e podendo ser ELEITO.
    // Sincroniza status a partir do pool e, congelado, zera na hora.
    .map((p) => {
      let mudou = false;
      const cands = p.candidatos.map((c) => {
        const oficialC = c.chave != null ? _oficialPorChave.get(c.chave) : null;
        const statusOficial = oficialC ? (oficialC.status || null) : (c.status || null);
        if ((c.status || null) === statusOficial) return c;
        mudou = true;
        return statusOficial
          ? { ...c, status: statusOficial, votos: 0, votosEditado: false, marcadoEleito: false }
          : { ...c, status: null };
      });
      return mudou ? { ...p, candidatos: cands } : p;
    })
    // Duplicata de CADASTRO — mesma pessoa, dois identificadores (achado
    // real 01/09/2026: Esperidião Amin duas vezes numa lista salva; causa
    // mais provável é adição manual anterior à ata oficial confirmar o
    // registro, cujo identificador nunca bateu com o novo, então o passo
    // "faltantes" acima somou os dois). Todas as podas anteriores comparam
    // por CHAVE — nenhuma pega isso, já que os dois identificadores são
    // legitimamente diferentes. Aqui compara por NOME normalizado dentro
    // do mesmo grupo: sobrevive quem tem identificador oficial (bate em
    // chavesOficiais); no empate ou quando nenhum bate, sobrevive quem o
    // usuário marcou eleito ou tem mais voto — nunca perde a marcação/voto
    // real por causa de uma duplicata administrativa.
    .map((p) => {
      // Agrupa por NOME **ou** NOME DE URNA (achado 01/09/2026: o oficial
      // é "Esperidião Amin Helou Filho"/urna "Esperidião Amin" — uma
      // entrada cadastrada só com o nome curto não batia comparando só
      // por `nome` cheio). União por qualquer um dos dois batendo, via
      // union-find simples — cobre entrada com nome completo batendo o
      // nomeUrna do outro lado e vice-versa.
      const pai = p.candidatos.map((_, i) => i);
      const acha = (i) => (pai[i] === i ? i : (pai[i] = acha(pai[i])));
      const junta = (i, j) => { const ri = acha(i), rj = acha(j); if (ri !== rj) pai[ri] = rj; };
      const porVariante = new Map();
      p.candidatos.forEach((c, i) => {
        [normalizarBusca(c.nome || ""), normalizarBusca(c.nomeUrna || "")]
          .filter(Boolean)
          .forEach((variante) => {
            if (porVariante.has(variante)) junta(i, porVariante.get(variante));
            else porVariante.set(variante, i);
          });
      });
      const porNome = new Map();
      p.candidatos.forEach((c, i) => {
        const raiz = acha(i);
        if (!porNome.has(raiz)) porNome.set(raiz, []);
        porNome.get(raiz).push(c);
      });
      let teveDuplicata = false;
      // Número oficial de candidatura (via chave no pool) — quando os DOIS
      // lados de um "mesmo nome" têm número conhecido e DIFERENTE, não é
      // duplicata de cadastro, são duas pessoas reais e distintas com nome
      // igual: não junta nada nesse caso (pedido do usuário 01/09/2026,
      // lembrando que o número já resolve isso desde a conferência com o
      // RRC — só faltava esse dado chegar até aqui).
      const numeroDe = (c) => {
        const oficialC = c.chave != null ? _oficialPorChave.get(c.chave) : null;
        return oficialC && oficialC.numero != null ? oficialC.numero : null;
      };
      const cands = [...porNome.values()].flatMap((grupo) => {
        if (grupo.length === 1) return grupo[0];
        const numerosConhecidos = new Set(grupo.map(numeroDe).filter((n) => n != null));
        if (numerosConhecidos.size > 1) return grupo; // números diferentes = pessoas diferentes, não mexe
        teveDuplicata = true;
        // A IDENTIDADE (chave/id/fonte) vem de quem bate no pool oficial —
        // é o registro que continua valendo daqui pra frente. Mas os
        // DADOS REAIS do usuário (voto, marcação) vêm de qualquer entrada
        // do grupo que os tenha — nunca zera o que a pessoa já fez só
        // porque a entrada "vencedora" da identidade não tinha voto ainda.
        const base = [...grupo].sort((a, b) => {
          const oficialA = a.chave != null && chavesOficiais.has(a.chave) ? 1 : 0;
          const oficialB = b.chave != null && chavesOficiais.has(b.chave) ? 1 : 0;
          if (oficialA !== oficialB) return oficialB - oficialA;
          return (Number(b.votos) || 0) - (Number(a.votos) || 0);
        })[0];
        const comDados = [...grupo].sort((a, b) => {
          const eleitoA = a.marcadoEleito ? 1 : 0, eleitoB = b.marcadoEleito ? 1 : 0;
          if (eleitoA !== eleitoB) return eleitoB - eleitoA;
          return (Number(b.votos) || 0) - (Number(a.votos) || 0);
        })[0];
        return base === comDados ? base : { ...base, votos: comDados.votos, votosEditado: comDados.votosEditado, marcadoEleito: comDados.marcadoEleito };
      });
      return teveDuplicata ? { ...p, candidatos: cands } : p;
    });
  // Duplicata ENTRE GRUPOS — mesma CHAVE aparecendo em dois partidos ao
  // mesmo tempo (achado real 01/09/2026, caso Esperidião Amin: uma cópia
  // ficou presa em "SEM PARTIDO" — de quando o partido dele ainda não
  // tinha sido resolvido pela ata — com os votos de verdade, e a ata
  // resolvida depois criou a cópia oficial em "UNIÃO/PP", zerada, pelo
  // mesmo motivo do passo "faltantes" acima. A poda por candidato não
  // pega isso: ela só olha se a chave existe em ALGUM grupo do pool
  // oficial, nunca se está no grupo CERTO — a chave existe (é oficial),
  // só que na cópia errada também. Aqui: acha o grupo oficial de cada
  // chave e, se ela aparecer em outro grupo além do certo, funde os
  // dados reais (voto, marcação) pra dentro da cópia do grupo certo e
  // descarta a(s) cópia(s) do(s) grupo(s) errado(s).
  const grupoOficialPorChave = new Map();
  poolOficial.forEach((p) => p.candidatos.forEach((c) => {
    if (c.chave != null) grupoOficialPorChave.set(c.chave, p.nome);
  }));
  const porChaveTodosOsGrupos = new Map();
  podada.forEach((p) => p.candidatos.forEach((c) => {
    if (c.chave == null) return;
    if (!porChaveTodosOsGrupos.has(c.chave)) porChaveTodosOsGrupos.set(c.chave, []);
    porChaveTodosOsGrupos.get(c.chave).push(c);
  }));
  const dadosRealPorChave = new Map();
  porChaveTodosOsGrupos.forEach((ocorrencias, chave) => {
    if (ocorrencias.length < 2) return;
    const grupoCerto = grupoOficialPorChave.get(chave);
    if (!grupoCerto) return; // sem grupo oficial resolvido — não mexe
    const comDados = [...ocorrencias].sort((a, b) => {
      const eleitoA = a.marcadoEleito ? 1 : 0, eleitoB = b.marcadoEleito ? 1 : 0;
      if (eleitoA !== eleitoB) return eleitoB - eleitoA;
      return (Number(b.votos) || 0) - (Number(a.votos) || 0);
    })[0];
    dadosRealPorChave.set(chave, { grupoCerto, votos: comDados.votos, votosEditado: comDados.votosEditado, marcadoEleito: comDados.marcadoEleito });
  });
  const podadaEntreGrupos = dadosRealPorChave.size
    ? podada.map((p) => ({
        ...p,
        candidatos: p.candidatos
          .filter((c) => {
            const dado = c.chave != null ? dadosRealPorChave.get(c.chave) : null;
            return !dado || dado.grupoCerto === p.nome; // fora do grupo certo? sai
          })
          .map((c) => {
            const dado = c.chave != null ? dadosRealPorChave.get(c.chave) : null;
            if (!dado || dado.grupoCerto !== p.nome) return c;
            return { ...c, votos: dado.votos, votosEditado: dado.votosEditado, marcadoEleito: dado.marcadoEleito };
          }),
      }))
    : podada;
  if (!podadaEntreGrupos.length) return lista;
  // Sentido inverso da mesma sincronização: grupo que EXISTE no pool mas
  // não no rascunho (ata processada depois do rascunho ser salvo, ou o
  // card "sem ata" criado em 17/08/2026) entra no fim — sem isso, quem já
  // tinha um rascunho nunca via partido novo nenhum até zerar tudo.
  const nomesNaLista = new Set(podadaEntreGrupos.map((p) => p.nome));
  poolOficial.forEach((p) => { if (!nomesNaLista.has(p.nome)) podadaEntreGrupos.push(p); });
  return podadaEntreGrupos;
}

async function garantirPalpiteEdicaoAtivo() {
  const chaveCargoEstado = `${pcState.estado}::${pcState.cargoAtivo}`;
  if (!pcState.palpiteEdicao || pcState.cargoPalpiteEdicao !== chaveCargoEstado) {
    // Cargo/estado mudou: a ordem congelada era do CONJUNTO anterior — com
    // a mesma contagem de grupos ela "casava" e a aba nova abria na ordem
    // errada (ou até derrubava cards entre estados). E o timer de
    // reagrupamento agendado na aba anterior não pode disparar em cima do
    // DOM novo (achados 3 e 6 da revisão de 22/08).
    pcState.ordemPartidosFixa = null;
    pcState.ordemCandidatosFixa = null;
    clearTimeout(window._pcReordTimer);
    await garantirRascunhosCarregados();
    // Prioridade: rascunho salvo (autosave, ver garantirRascunhosCarregados)
    // > cada partido começando com a própria vagas2022 real daquele
    // estado+cargo (fallback em montarEstadoPalpite) — não usa mais um
    // "padrão" fixo de um estado só, que ficava errado assim que outro
    // estado carregasse. Exceto quando o rascunho é órfão (ver
    // rascunhoEhOrfao acima) — nesse caso ele é ignorado e o pool oficial
    // fresco vira o ponto de partida, do mesmo jeito que um rascunho
    // inexistente.
    // Bug real achado pelo usuário (01/09/2026, mesma família do achado
    // de 22/08 citado acima, mas caso não coberto por ele): abrirListaParaEdicao
    // só sela cargoPalpiteEdicao quando existe cargoPendente — uma lista
    // JÁ COMPLETA (as 3 abas fechadas) nunca sela nada, então trocar de
    // aba dispara este bloco de novo e SUBSTITUÍA o conteúdo da lista
    // salva (pcState.palpitesPorCargo, já sincronizado/podado por
    // abrirListaParaEdicao) pelo rascunho de autosave — que pode estar
    // desatualizado (é o que trazia o "Esperidião Amin" duplicado de
    // volta mesmo depois da limpeza rodar). Se já existe a lista salva
    // pra este cargo, ela é a fonte de verdade — só cai pro autosave
    // quando não há lista salva carregada pra este cargo.
    const daListaSalva = pcState.palpitesPorCargo && pcState.palpitesPorCargo[pcState.cargoAtivo];
    const rascunho = (daListaSalva && daListaSalva.length)
      ? daListaSalva
      : (pcState.rascunhosCache && pcState.rascunhosCache[pcState.cargoAtivo]);
    const poolOficial = montarEstadoPalpite("assembleia", null, null, pcState.cargoAtivo, pcState.estado);
    pcState.palpiteEdicao = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial))
      ? podarGruposForaDoPool(rascunho, poolOficial)
      : poolOficial;
    if (pcState.palpitesPorCargo) pcState.palpitesPorCargo[pcState.cargoAtivo] = pcState.palpiteEdicao;
    pcState.cargoPalpiteEdicao = chaveCargoEstado;
  }
}

// Links de Instagram por candidato (nuvem/candidato-links.js) — busca todos
// de uma vez pro estado+cargo ativo (mesma escala da lista de candidatos
// já carregada), cacheado em pcState.linksCandidatosCache pra não refazer
// a consulta a cada re-render (marcar eleito, editar voto etc. re-
// renderizam a tela inteira o tempo todo, ver renderCargoEstadual).
async function garantirLinksCandidatos() {
  const chaveCache = `${pcState.estado}::${pcState.cargoAtivo}`;
  if (!pcState.linksCandidatosCache[chaveCache]) {
    pcState.linksCandidatosCache[chaveCache] = await obterLinksCandidatos(pcState.estado, pcState.cargoAtivo);
  }
  if (!pcState.financeiroCandidatosCache) pcState.financeiroCandidatosCache = {};
  if (!pcState.financeiroCandidatosCache[chaveCache]) {
    pcState.financeiroCandidatosCache[chaveCache] = await obterFinanceiroCandidatos(pcState.estado, pcState.cargoAtivo);
  }
}

// Ícone de moeda (bens/recursos financeiros, dados do TSE) + painel que
// abre embaixo do nome — mesmo padrão visual/posição do .pc-insta-mini,
// ver DESIGN.md. Só aparece quando o candidato tem tse_id importado
// (ferramentas/importar_financeiro.py); "Ver detalhes no TSE" sempre linka
// mesmo se bens/recebido vierem em branco (dado não declarado ainda).
function financeiroIconeHtml(c) {
  const fin = financeiroDe(c.chave);
  if (!fin) return { icone: "", painel: "" };
  const aberto = pcState.financeiroAbertoChave === c.chave;
  const icone = `<span class="pc-financeiro-mini${aberto ? " aberto" : ""}" data-pc-toggle-financeiro="${c.chave}" title="Bens e recursos declarados" onclick="event.stopPropagation()">${iconeSvg("credito", 14)}</span>`;
  if (!aberto) return { icone, painel: "" };
  const fmtMoeda = (v) => v == null ? "não declarado" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const painel = `
      <div class="pc-financeiro-painel" onclick="event.stopPropagation()">
        <div class="pc-financeiro-linha"><span class="k">Total em bens</span><span class="v">${fmtMoeda(fin.bens)}</span></div>
        <div class="pc-financeiro-linha"><span class="k">Recursos recebidos (campanha)</span><span class="v">${fmtMoeda(fin.recebido)}</span></div>
        <a class="pc-financeiro-link" href="${escaparAtributoHtml(linkTseDoCandidato(fin.tseId))}" target="_blank" rel="noopener noreferrer">Ver detalhes no TSE ${iconeSvg("externo", 11)}</a>
      </div>`;
  return { icone, painel };
}

// Instagram de UM candidato, já carregado pra pcState.estado/cargoAtivo
// atuais (ver garantirLinksCandidatos, chamado antes de qualquer render que
// precise disso) — null quando não tem link cadastrado.
function linkInstagramDe(chave) {
  const mapa = pcState.linksCandidatosCache[`${pcState.estado}::${pcState.cargoAtivo}`];
  return (mapa && mapa[chave]) || null;
}

// Dados financeiros (bens/recursos recebidos, TSE) de UM candidato, mesmo
// cache-por-estado+cargo do Instagram — null quando não tem tse_id
// importado (candidato ainda não homologado na base oficial do TSE).
function financeiroDe(chave) {
  const mapa = pcState.financeiroCandidatosCache && pcState.financeiroCandidatosCache[`${pcState.estado}::${pcState.cargoAtivo}`];
  return (mapa && mapa[chave]) || null;
}

async function renderCargoEstadual() {
  // Lista antiga (salva/rascunho antes de 31/08/2026) não tem a linha de
  // legenda — entra aqui zerada, sem alterar a soma que o usuário fechou.
  if (pcState.palpiteEdicao && typeof injetarVotosLegenda === "function") {
    injetarVotosLegenda(pcState.palpiteEdicao, pcState.cargoAtivo, pcState.estado, 0);
  }
  const conteudo = document.getElementById("pcCargoConteudo");
  // Mesmo problema (e mesma correção) do botão ✦ na Revisão, achado pelo
  // usuário em 12/08/2026: qualquer interação nesta tela reconstrói o HTML
  // inteiro de novo, o que sozinho jogaria a rolagem de volta pro topo.
  // Captura aqui, ANTES até da tela de carregamento substituir o conteúdo,
  // e restaura no fim da função — só quando já havia conteúdo real antes
  // (reRenderizando), pra não interferir na primeira entrada na tela.
  // (O card do Painel Eleitoral mora no slot do cabeçalho fixo, fora de
  // pcCargoConteudo, desde 16/08/2026 — o marcador de "já tinha conteúdo
  // real" passa a ser o botão de recolher o Plenário, que só existe no
  // render completo desta tela.)
  // No Senador não existe Plenário — os marcadores são o card fader ou o
  // estado vazio da busca (qualquer um indica que o render completo já rodou).
  const reRenderizando = !!conteudo.querySelector("#pcBtnColapsarPlenario, .pc-sen-card, .pc-estado-vazio");
  const scrollAnterior = window.scrollY;
  // Só mostra a tela de carregando na PRIMEIRA entrada (troca de cargo,
  // que de fato pode esperar um fetch de rascunho) — numa re-renderização
  // (busca, marcar eleito, etc.) o conteúdo antigo já está certo até o
  // novo ficar pronto, e trocar por um placeholder bem mais curto no meio
  // do caminho encolhia a página por uma fração de segundo, empurrando a
  // rolagem pra cima (o navegador ajusta o scroll sozinho quando o
  // conteúdo fica mais baixo que a posição atual) — daí "pulava" de volta
  // quando o conteúdo real voltava. Restaurar scrollAnterior no fim não
  // evitava esse flash intermediário ser visível. Achado pelo usuário
  // (busca de partido) em 16/08/2026.
  if (!reRenderizando) conteudo.innerHTML = telaCarregando();
  await garantirPalpiteEdicaoAtivo();
  await garantirLinksCandidatos();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
  // Senador (lista única, PROJETO.md §8.2): a marcação de eleito é SEMPRE
  // derivada da votação (top-N global) — alinhar aqui cobre também
  // rascunhos antigos salvos na época do modelo por partido/stepper.
  if (pcState.cargoAtivo === "senador") recalcularMarcadosSenador();
  else recalcularMarcadosDeputados();
  // A troca de aba de cargo re-renderiza só esta tela (sem passar pelo
  // roteador), então o tema Fader precisa ser alternado aqui também.
  // Desde 17/08/2026 as TRÊS abas estão no modelo fader — tema sempre on.
  document.getElementById("modoColaborativoWrap").classList.add("pc-tema-fader");

  const cargoInfo = CARGOS.find((c) => c.id === pcState.cargoAtivo);
  // Total de vagas do cargo ativo (40 pra Dep. Estadual, 16 pra Dep.
  // Federal, 1 pra Senador em SC/2022) — número fixo, vem de
  // vagasFixasCargo, nunca de somar o dado carregado (ver comentário em
  // dados/estados/registro-2022.js).
  const totalVagasCargo = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const totalIndicado = pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).length, 0);
  // "Válidos estimados" precisa ser do ESTADO/cargo ativo, não fixo em SC —
  // antes usava direto REF_2022 (só de SC), então em estados maiores (ex.:
  // SP) a soma de votos marcados passava longe do "total" mostrado. Soma o
  // voto real de 2022 de TODOS os candidatos que concorreram naquele
  // estado+cargo (dado oficial do TSE) e projeta com o mesmo fator de
  // crescimento do eleitorado usado no resto do app.
  //
  // Importante: soma sempre a partir do registro PURO de 2022
  // (candidatosEstadoCargo), nunca de pcState.palpiteEdicao — desde que o
  // pool de 2026 (candidatos2026EstadoCargo, ver montarEstadoPalpite) entrou
  // em cena, palpiteEdicao passou a ter uma mistura de gente real e
  // fictícia com votos2022:0 (quem não tem histórico), e usar esse pool
  // aqui fazia a estimativa de válidos desabar pra quase zero.
  const totalValidos2022Estado = (candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) || [])
    .reduce((s, p) => s + p.candidatos.reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
  // Pro Senado a versão confinada não serve: os candidatos de 2026 são
  // novos (sem voto de 2022 pra somar), o que zeraria o teto. Eleição
  // majoritária usa a projeção de válidos do ESTADO inteiro (TSE 2022 ×
  // crescimento do eleitorado) — mesma metodologia do funil explicativo.
  const votosValidos2026Proj = pcState.cargoAtivo === "senador"
    ? (validosOficiaisProjetados() || totalValidosProjetado2026())
    : totalValidosProjetado2026();
  // Quociente ATUAL "de verdade" (só com a votação já digitada) e o
  // PROJETADO pra 2026 (referência fixa) — hoje calculados de novo dentro
  // de cada partido expandido (ver refQuociente mais abaixo). Hoisted pra
  // cá porque agora também aparecem no Painel Eleitoral, sempre visíveis,
  // não só depois de expandir um partido e marcar alguém (pedido do
  // usuário em 12/08/2026 — "o quociente é um ponto central, deveria estar
  // no card geral do cabeçalho"). Não existe pra Senador (majoritário, sem
  // quociente/QP/sobra — mesma ressalva de refQuociente).
  // Quociente eleitoral REAL de 2022 (não a projeção de 2026) — usado só
  // pra explicar, no rodapé "2022" de cada partido, quantas das vagas
  // vieram de quociente partidário puro (art. 107) e quantas vieram de
  // sobra (método das médias, art. 109).
  const qe2022 = quocienteEleitoral(totalValidos2022Estado, totalVagasCargo);

  // A contagem/ranking de vagas roda por federação (p.nome, ver
  // montarEstadoPalpite) — é assim que o quociente partidário funciona de
  // verdade quando tem federação. Mas o hemiciclo e a legenda mostram o
  // assento pelo partido de fato de cada eleito (c.partidoOriginal), não
  // pela federação — junta os candidatos de TODOS os partidos primeiro, sem
  // olhar de qual "card" eles vieram.
  const composicao = Object.values(
    pcState.palpiteEdicao.reduce((acc, p) => {
      p.candidatos.filter((c) => c.marcadoEleito).forEach((c) => {
        const nome = c.partidoOriginal || p.nome;
        if (!acc[nome]) acc[nome] = { nome, seats: 0 };
        acc[nome].seats++;
      });
      return acc;
    }, {})
  );
  // Plenário recolhível (pedido do usuário em 12/08/2026) — estado por
  // cargo (Estadual/Federal/Senador têm plenários diferentes, cada um
  // lembra se está recolhido ou não), guardado no mesmo mapa genérico que
  // já existe pra outros "expandido/recolhido" da tela (pcState.expandido).
  // Plenário INICIA FECHADO por padrão (pedido do usuário, 18/08/2026) —
  // o valor guardado só existe depois do primeiro toque na setinha.
  const _plenChave = "plenarioColapsado_" + pcState.cargoAtivo;
  const plenarioColapsado = pcState.expandido[_plenChave] === undefined ? true : !!pcState.expandido[_plenChave];
  // Plenário "terreno dinâmico" (protótipo v14, paleta 1, aprovado
  // 30/08/2026) — substitui tanto o hemiciclo em arco (era exclusivo de SC
  // Estadual) quanto a grade de cápsulas (demais estados/cargos): agora um
  // único desenho pra todo mundo (ver renderPlenarioTerreno em
  // calculo/eleitoral.js). Responde às VAGAS INDICADAS nos boxes (não à
  // apuração automática): cada grupo aloca as suas N cadeiras com os N
  // candidatos mais votados dele, contadas pelo partido de origem —
  // achado do usuário em 18/08 (box em 4 e case mostrando 6).
  let composicaoPlenario = composicao;
  if (pcState.cargoAtivo !== "senador") {
    const countsCase = vagasApuradasPorGrupo();
    const porOriginal = {};
    let alocadas = 0;
    pcState.palpiteEdicao.forEach((pg, ig) => {
      if (pg.semAta2026) return;
      const reaisCase = pg.candidatos.filter((c) => c.fonte !== "legenda").sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      const n = Math.min(vagasIndicadasDe(pg, countsCase[ig] || 0), reaisCase.length);
      for (let k = 0; k < n && alocadas < totalVagasCargo; k++, alocadas++) {
        const orig = reaisCase[k].partidoOriginal || pg.nome;
        porOriginal[orig] = (porOriginal[orig] || 0) + 1;
      }
    });
    composicaoPlenario = Object.entries(porOriginal).map(([nome, seats]) => ({ nome, seats }));
  }
  const hemiciclo = renderPlenarioTerreno(composicaoPlenario, totalVagasCargo);
  // Resumo visual embaixo do plenário: mesma composição do desenho, em
  // lista — bolinha na MESMA cor do bloco no plenário (corTerreno, mesma
  // ordem de rank por cadeiras) + sigla + quantidade + fração da
  // representação no total de vagas do cargo, do maior pro menor.
  const _plenarioOrdenado = [...composicaoPlenario].sort((a, b) => b.seats - a.seats);
  const legendaPlenario = `
    <div style="display:flex; flex-wrap:wrap; gap:4px; opacity:0.55;">
      ${_plenarioOrdenado.map((o, _idx) => `
        <div style="display:inline-flex; align-items:center; justify-content:center; gap:3px; padding:4px 6px; border:1px solid rgba(242,244,245,.12); border-radius:6px; white-space:nowrap;">
          <span style="width:5px; height:5px; border-radius:50%; background:${corTerreno(_idx)}; flex-shrink:0;"></span>
          <span style="font-size:9px; font-weight:600;">${siglaCurta(o.nome)}: ${o.seats} (${(o.seats / totalVagasCargo * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</span>
        </div>`).join("")}
    </div>`;

  // A ordem da lista fica "congelada" (pcState.ordemPartidosFixa) enquanto a
  // pessoa mexe num partido — sem isso, clicar na seta ou marcar um
  // candidato reordena a lista na hora e o card pula de lugar embaixo do
  // cursor, atrapalhando cliques seguidos. Só reordena de fato quando o
  // mouse sai do card do partido (ver mouseleave em attachListenersSelecao).
  // Critério REAL de ordem (o mesmo que os cards usam desde 17/08: mais
  // eleitos indicados no box primeiro, votos como desempate, sem-ata no
  // fim). Antes o congelamento ordenava por outro critério (marcados +
  // bancada 2022) e o renderizador dos cards re-sorteava por conta
  // própria a cada render — era ESSA briga que fazia o card pular de
  // posição na hora, ignorando o congelamento (achado em 21/08/2026).
  if (!pcState.ordemPartidosFixa || pcState.ordemPartidosFixa.length !== pcState.palpiteEdicao.length) {
    const countsOrd = vagasApuradasPorGrupo();
    const vagasDeOrd = (i) => {
      const pp = pcState.palpiteEdicao[i];
      return pp.semAta2026 ? -1 : vagasIndicadasDe(pp, countsOrd[i] || 0);
    };
    pcState.ordemPartidosFixa = [...pcState.palpiteEdicao.keys()]
      .sort((ia, ib) => (vagasDeOrd(ib) - vagasDeOrd(ia))
        || (somaVotosGrupo(pcState.palpiteEdicao[ib]) - somaVotosGrupo(pcState.palpiteEdicao[ia])))
      .map((i) => pcState.palpiteEdicao[i].nome);
  }
  const partidosOrdenados = pcState.ordemPartidosFixa
    .map((nome) => pcState.palpiteEdicao.find((p) => p.nome === nome))
    .filter(Boolean);

  // Busca de partido pelo nome — filtra a lista inteira (útil com ~24
  // partidos na tela); mesmo padrão da busca de candidato dentro de cada
  // partido, só que em cima da lista de partidos.
  const filtroPartido = normalizarBusca(pcState.buscaPartido || "");
  // Pedido do usuário (21/08/2026): a busca também encontra por NOME DE
  // CANDIDATO — "napoleão b" devolve o card do partido dele. Quando o
  // termo casa pelo candidato (e o resultado é curto — não é um "a" que
  // casa com todo mundo), o card já vem ABERTO, com a pessoa à vista.
  let partidosParaMostrar = partidosOrdenados;
  // Busca limpa: fecha os cards que a PRÓPRIA busca abriu (achado 8 da
  // revisão 22/08 — acumulavam abertos pra sempre); o que o usuário abriu
  // à mão fica como está.
  if (!filtroPartido && pcState._abertosPelaBusca) {
    Object.keys(pcState._abertosPelaBusca).forEach((k) => { delete pcState.expandido[k]; });
    pcState._abertosPelaBusca = null;
  }
  if (filtroPartido) {
    const comMotivo = partidosOrdenados
      .map((p) => {
        const porNome = normalizarBusca(nomePartidoExibicao(p.nome)).includes(filtroPartido);
        const porCandidato = !porNome && p.candidatos.some((c) => c.fonte !== "legenda" && normalizarBusca(nomeExibicao(c)).includes(filtroPartido));
        return { p, porNome, porCandidato };
      })
      .filter((m) => m.porNome || m.porCandidato);
    partidosParaMostrar = comMotivo.map((m) => m.p);
    if (filtroPartido.length >= 3 && comMotivo.length <= 4) {
      comMotivo.forEach((m) => {
        if (!m.porCandidato) return;
        const k = "faderAberto_" + pcState.cargoAtivo + "_" + m.p.nome;
        if (!pcState.expandido[k]) {
          pcState.expandido[k] = true;
          (pcState._abertosPelaBusca = pcState._abertosPelaBusca || {})[k] = true;
        }
      });
    }
  }

  const blocos = pcState.cargoAtivo === "senador"
    ? renderListaSenador(totalVagasCargo, votosValidos2026Proj)
    : renderListaDeputadosFader(partidosParaMostrar, votosValidos2026Proj, totalVagasCargo);

  const instrucaoAberta = pcState.instrucaoSelecaoAberta !== false && !tutorialVistoSalvo();
  // Card do Painel Eleitoral — renderizado no slot do cabeçalho fixo
  // (#pcPainelSlot, criado por renderSelecaoCandidatos), NÃO dentro de
  // pcCargoConteudo: abas de cargo + este card formam um bloco único
  // grudado no topo ao rolar, sem espaçamento entre eles (padrão pedido
  // pelo usuário em 16/08/2026, no lugar do esquema antigo de dois
  // stickies separados + camada de blur que gerava "sombra fantasma").
  // Comandos definidos ANTES do painel: no modelo fader dos deputados o
  // painel de comandos mora DENTRO do console A3 (cabeçalho fixo); no
  const gateDeputados = somaVotosCargo() >= 0.995 * votosValidos2026Proj;
  const comandosSelecao = [
    {
      id: "pcBtnBuscaPartidoToggle", icone: "buscar", tamanho: 14, titulo: "Buscar partido", mini: true,
      legenda: "Abre um campo de busca: filtra os partidos pelo nome — ou pelo nome de um candidato, aí o card do partido dele já abre.",
      classeExtra: pcState.buscaPartidoAberta ? "ativo" : "",
    },
    {
      id: "pcBtnVoltarSelecao", icone: "desfazer", tamanho: 15, titulo: "Desfazer",
      legenda: "Desfaz a última alteração feita nesta tela — um voto editado, um arrasto de barra. Só volta um passo por vez.",
      disabled: !pcState.historicoPalpite.length,
    },
    {
      id: "pcBtnRefazerSelecao", icone: "refazer", tamanho: 15, titulo: "Refazer",
      legenda: "Refaz o passo que o Desfazer voltou — disponível até você fazer uma alteração nova.",
      disabled: !(pcState.historicoRefazer && pcState.historicoRefazer.length),
    },
    {
      id: "pcBtnZerarTudo", icone: "borracha", tamanho: 14, titulo: "Zerar tudo",
      legenda: "Limpa de uma vez a votação de todos os candidatos E as vagas indicadas nos boxes dos partidos. Indicado pra quem quer montar do zero absoluto.",
    },
    {
      id: "pcBtnTop2022", icone: "lista22", tamanho: 15, titulo: "Top 100 de 2022",
      legenda: "Mostra os 100 candidatos mais votados na eleição real de 2022, de todos os partidos — só de referência, não muda seu palpite.",
    },
    {
      id: "pcBtnRestaurar2022", icone: "relogio22", tamanho: 15, titulo: "Retomar votação de 2022",
      legenda: "Volta o cargo INTEIRO pro retrato de 2022: a votação real de todos os candidatos daquele ano, candidatos novos zerados e os boxes de vagas limpos. O Desfazer recupera o que estava antes.",
    },
    {
      id: "pcBtnPreencherAutoTudo", icone: "completar", tamanho: 18, titulo: "Mágico — preenchimento automático",
      legenda: pcState.cargoAtivo === "senador"
        ? "Distribui uma votação simulada entre todos os candidatos, pela força do partido de cada um em 2022. O que você já digitou à mão fica como está."
        : "Distribui uma votação simulada realista entre todos os partidos e candidatos (com base em 2022) e fecha a barra em 100%. O que você já digitou à mão fica como está.",
      classeExtra: "destaque",
    },
    {
      // O botão ">" (Prosseguir pra Revisão) foi removido daqui em
      // 28/08/2026 (teste mobile do usuário): o Salvar cumpre o papel — o
      // caminho pra Revisão é por Minhas Listas (atalho "Revisão" de
      // 26/08), sem precisar de um segundo botão de avanço no console.
      id: "pcBtnSalvarSelecao", icone: "salvar", tamanho: 17, titulo: "Salvar", classeExtra: "destaque",
      legenda: "Salva sua lista do jeito que está agora — mesmo incompleta. Depois é só voltar aqui e continuar marcando de onde parou. Fica disponível em \"Minhas listas\", onde você também revisa e deposita.",
    },
  ];
  const painelHtml = pcState.cargoAtivo === "senador" ? renderPainelSenador(votosValidos2026Proj, comandosSelecao) : renderPainelDeputadosFader(votosValidos2026Proj, totalVagasCargo, comandosSelecao);

  conteudo.innerHTML = `
    ${instrucaoAberta ? `
    <div id="pcInstrucaoOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:400px; width:100%; max-height:88vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px 18px; box-shadow:0 20px 60px rgba(0,0,0,.5); text-align:center;">
        <div id="pcTutTela1"${pcState._tutTela2 ? ' style="display:none;"' : ""}>
          <div style="display:flex; align-items:center; justify-content:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:14px;">${iconeSvg("alerta", 13)} ATENÇÃO</div>
          <div class="pc-tut-aviso">Esta função vai te orientar a preencher a lista com <b class="verde">agilidade</b>.<div class="pc-tut-aviso-sub">O painel de notificação lhe orienta a cada passo. Ao clicar no ícone indicado ele aumenta o nível de detalhamento, conforme a ilustração.</div></div>
          <div class="pc-tut-ilustra">
            <span class="pc-tut-pontos" style="cursor:default;"><i class="on"></i><i class="on"></i><i></i></span>
            <span class="pc-tut-ilustra-leg">ilustração — o ícone real está na tela seguinte</span>
          </div>
          <button class="primary" id="pcTutProsseguir" style="width:100%; margin-top:16px;">Prosseguir</button>
          <div class="pc-tut-recorte">
            <div class="pc-tut-recorte-img">
              <img src="interface/assets/tutorial-cabecalho.png" alt="Cabeçalho do app">
              <span class="pc-tut-argola"></span>
            </div>
          </div>
        </div>
        <div id="pcTutTela2"${pcState._tutTela2 ? "" : ' style="display:none;"'}>
          <div class="pc-tut-chame">Clique e entenda:</div>
          <span class="pc-tut-pontos" id="pcTutPontos"><i class="on"></i><i></i><i></i></span>
          <div class="pc-tut-palco" id="pcTutPalco">
            <div class="pc-tut-lin"><span class="pc-tut-minipontos"><i class="on"></i><i></i><i></i></span> <b style="color:var(--pc-accent);">1 ponto</b> — sinaliza que existe orientação</div>
          </div>
          <button class="primary" id="pcTutAvancar" style="width:100%; margin-top:14px;" disabled>Concluir</button>
        </div>
      </div>
    </div>` : ""}
    ${pcState.avisoLimiteVagasAberto ? `
    <div id="pcAvisoLimiteOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:420px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11.5px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("alerta", 14)} IMPORTANTE</div>
        <h2 style="margin-bottom:6px;">LIMITE DE VAGAS ATINGIDO</h2>
        <div style="font-size:13.5px; line-height:1.7; color:var(--pc-ink-dim);">
          Só é possível indicar candidatos eleitos até a quantidade de vagas em disputa nesse cargo (<b style="color:var(--pc-ink);">${totalVagasCargoAtivo()}</b> no total, somando todos os partidos). Pra marcar mais alguém, desmarque outro candidato antes — em algum partido, não necessariamente nesse.
        </div>
        <button class="primary" id="pcFecharAvisoLimite" style="width:100%; margin-top:20px;">Entendi</button>
        <label style="display:flex; align-items:center; gap:8px; margin-top:14px; font-size:12px; color:var(--pc-ink-dim); cursor:pointer;">
          <input type="checkbox" id="pcNaoMostrarAvisoLimite" style="width:15px; height:15px; flex-shrink:0;">
          Não receber essa mensagem novamente
        </label>
      </div>
    </div>` : ""}
    ${pcState.confirmAutoPreenchimentoAberto ? (() => {
      const acao = pcState.confirmAutoPreenchimentoAcao;
      const alvo = acao ? `do partido <b style="color:var(--pc-ink);">${acao.partido.nome}</b>` : "de todos os partidos deste cargo";
      return `
    <div id="pcConfirmAutoOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:420px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11.5px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("completar", 14)} PREENCHIMENTO AUTOMÁTICO</div>
        <h2 style="margin-bottom:6px;">Preencher automaticamente?</h2>
        <div style="font-size:13.5px; line-height:1.7; color:var(--pc-ink-dim);">
          ${pcState.cargoAtivo === "senador"
            ? "Vou distribuir uma votação simulada entre todos os candidatos, proporcional à força que o partido de cada um mostrou na eleição de 2022 — a lista fecha em 100% dos votos e os 2 mais votados ficam com o selo ELEITO. Números que você já digitou à mão não são alterados."
            : "Vou distribuir uma votação simulada realista entre todos os partidos e candidatos (com base no desempenho de 2022) e fechar a barra de votos em 100% — as vagas, sobras e selos ELEITO se recalculam sozinhos. Números que você já digitou à mão não são alterados."}
        </div>
        <div style="display:flex; gap:8px; margin-top:20px;">
          <button class="ghost" id="pcBtnCancelarAuto" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarAuto" style="flex:1;">Preencher</button>
        </div>
        <label style="display:flex; align-items:center; gap:8px; margin-top:14px; font-size:12px; color:var(--pc-ink-dim); cursor:pointer;">
          <input type="checkbox" id="pcNaoConfirmarAuto" style="width:15px; height:15px; flex-shrink:0;">
          Não perguntar de novo — preencher direto a partir de agora
        </label>
      </div>
    </div>`;
    })() : ""}
    ${pcState.candidatos2022Aberto ? (() => {
      const nomePartido = pcState.candidatos2022Aberto;
      const membros = (typeof MEMBROS_POR_FEDERACAO !== "undefined" && MEMBROS_POR_FEDERACAO[nomePartido]) || [nomePartido];
      const doEstado = (typeof candidatosEstadoCargo === "function" ? candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) : null) || [];
      const candidatos = membros.flatMap((m) => {
        const entrada = doEstado.find((x) => x.nome === m);
        return entrada ? entrada.candidatos.map((c) => ({ ...c, _partido: m })) : [];
      }).sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      const linhasCand = candidatos.map((c, i) => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(242,244,245,.08);">
          <span style="width:26px; font-size:12px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${i + 1}º</span>
          <span style="flex:1; font-size:13.5px; font-weight:600;">${nomeExibicao(c)}${membros.length > 1 ? ` <span style="font-size:10.5px; color:var(--pc-accent); font-weight:700;">(${c._partido})</span>` : ""}${c.eleito2022 ? ' <span style="font-size:10.5px; color:var(--pc-accent-2);">· eleito</span>' : ""}</span>
          <span style="font-size:13px; font-weight:600; color:var(--pc-ink-dim);">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      // Soma total (e por partido, quando é federação) da nominata inteira
      // exibida acima — mesma fonte de dado das linhas, só somada.
      const totalGeral = candidatos.reduce((s, c) => s + (Number(c.votos) || 0), 0);
      const totalHtml = membros.length > 1
        ? `<div style="display:flex; flex-direction:column; gap:2px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(242,244,245,.12); font-size:12.5px; color:var(--pc-ink-dim);">
            ${membros.map((m) => `<div>${m}: <b style="color:var(--pc-ink);">${candidatos.filter((c) => c._partido === m).reduce((s, c) => s + (Number(c.votos) || 0), 0).toLocaleString("pt-BR")}</b></div>`).join("")}
            <div style="margin-top:2px;">Total: <b style="color:var(--pc-ink);">${totalGeral.toLocaleString("pt-BR")}</b></div>
          </div>`
        : `<div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(242,244,245,.12); font-size:12.5px; color:var(--pc-ink-dim);">Total: <b style="color:var(--pc-ink);">${totalGeral.toLocaleString("pt-BR")}</b></div>`;
      return `
      <div id="pcCandidatos2022Overlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:80vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <h2 style="margin-bottom:4px;">${nomePartidoExibicao(nomePartido)} — nominata 2022</h2>
          <div class="pc-sub" style="margin-bottom:2px;">${candidatos.length} candidato${candidatos.length === 1 ? "" : "s"}, do mais votado pro menos votado.</div>
          ${qe2022 ? `<div class="pc-sub" style="margin-bottom:14px;">Quociente eleitoral 2022: <b style="color:var(--pc-ink);">~${Math.round(qe2022).toLocaleString("pt-BR")}</b> votos/vaga</div>` : ""}
          ${linhasCand || estadoVazio({ icone: "buscar", titulo: "Nenhum candidato encontrado", texto: "Confira o nome digitado." })}
          ${candidatos.length ? totalHtml : ""}
          <button class="primary" id="pcFecharCandidatos2022" style="width:100%; margin-top:18px;">Fechar</button>
        </div>
      </div>`;
    })() : ""}
    ${pcState.top2022Aberto ? (() => {
      const doEstadoTop = candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) || [];
      const top100 = doEstadoTop
        .flatMap((p) => p.candidatos.filter((c) => c.fonte !== "legenda").map((c) => ({ ...c, _partido: p.nome })))
        .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0))
        .slice(0, 100);
      const linhasTop100 = top100.map((c, i) => `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(242,244,245,.08);">
          <span style="width:26px; font-size:12px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${i + 1}º</span>
          <span style="flex:1; min-width:0; font-size:13.5px; font-weight:600;">${nomeExibicao(c)}<br><span style="font-size:10.5px; font-weight:400; color:var(--pc-ink-dim);">${nomePartidoExibicao(c._partido)}</span></span>
          <span style="font-size:13px; font-weight:600; color:var(--pc-ink-dim); flex-shrink:0;">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      return `
      <div id="pcTop2022Overlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:80vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <h2 style="margin-bottom:4px;">${cargoInfo.label} — top ${top100.length} de 2022</h2>
          <div class="pc-sub" style="margin-bottom:14px;">Os candidatos mais votados na eleição real de 2022, de todos os partidos, do mais votado pro menos votado — só de referência, não muda seu palpite.</div>
          ${linhasTop100 || estadoVazio({ icone: "buscar", titulo: "Nenhum candidato encontrado", texto: "Confira o nome digitado." })}
          <button class="primary" id="pcFecharTop2022" style="width:100%; margin-top:18px;">Fechar</button>
        </div>
      </div>`;
    })() : ""}
    ${pcState.cargoAtivo === "senador" ? "" : `
    <div class="glass-card" style="padding:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="pc-sub" style="margin:0;">Plenário — ${totalVagasCargo} vagas</div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${renderBotaoLegendaBadge()}
          <button id="pcBtnColapsarPlenario" class="pc-mini-btn" title="${plenarioColapsado ? "Expandir" : "Recolher"}">
            <svg viewBox="0 0 16 16" width="13" height="13" style="transform:${plenarioColapsado ? "rotate(-90deg)" : "none"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>
        </div>
      </div>
      <div id="pcPlenarioCorpo" class="pc-plen-corpo${plenarioColapsado ? "" : " aberto"}">
        <div style="margin-top:14px;">
          ${hemiciclo}
          <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);">${legendaPlenario}</div>
        </div>
      </div>
    </div>
    ${renderFaixaVagasAbertas(totalVagasCargo)}
    ${renderLegendaBadge(false)}`}
    ${pcState.listaSalvaNome ? `
    <div style="display:flex; align-items:center; gap:6px; margin:0 0 10px 2px; font-size:11.5px; color:var(--pc-ink-dim);">
      ${iconeSvg("salvar", 12)} Editando a lista <b style="color:var(--pc-ink); font-weight:600;">"${escaparAtributoHtml(pcState.listaSalvaNome)}"</b>
    </div>` : ""}
    ${pcState.legendaComandosAberta ? renderLegendaComandos(comandosSelecao) : ""}
    <div class="pc-status" id="pcSelecaoStatus" style="text-align:right; margin:-14px 0 14px;"></div>
    ${pcState.modalSalvarDestinoAberto ? renderModalSalvarDestino() : ""}
    ${pcState.modalInstagramInfo ? renderModalInstagram() : ""}
    ${blocos || estadoVazio({ icone: "buscar", titulo: pcState.cargoAtivo === "senador" ? "Nenhum candidato encontrado" : "Nenhum partido encontrado", texto: "Confira o nome digitado." })}
  `;

  const slotPainel = document.getElementById("pcPainelSlot");
  if (slotPainel) slotPainel.innerHTML = painelHtml;
  // Busca mora no cabeçalho FIXO, logo abaixo do console (teste mobile do
  // usuário, 28/08/2026): antes ela abria só no topo do conteúdo — quem
  // estava no fim de uma lista longa tocava a lupa e não via nada
  // acontecer. No slot fixo, aparece na hora em qualquer ponto da rolagem.
  const slotBusca = document.getElementById("pcBuscaSlot");
  if (slotBusca) slotBusca.innerHTML = pcState.buscaPartidoAberta ? `
    <div style="position:relative; margin-top:8px;">
      <svg viewBox="0 0 16 16" width="14" height="14" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--pc-ink-dim); pointer-events:none;"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
      <input type="text" id="pcBuscaPartidoInput" class="cell" placeholder="${pcState.cargoAtivo === "senador" ? "Buscar candidato ou partido" : "Buscar partido ou candidato"}" value="${pcState.buscaPartido || ""}" style="width:100%; padding-left:34px;">
    </div>` : "";
  attachListenersSelecao();
  if (pcState.cargoAtivo === "senador") attachListenersSenador(votosValidos2026Proj);
  else attachListenersDeputadosFader(votosValidos2026Proj, totalVagasCargo);
  atualizarFarol();
  if (reRenderizando) window.scrollTo(0, scrollAnterior);
}



// Reordenação SUAVE dos cards de partido (protótipo aprovado 21/08/2026):
// alterar o box de vagas não reordena na hora — depois de um respiro de
// 1,2s sem novas alterações, a lista se reagrupa com uma transição FLIP
// (cada card desliza da posição antiga pra nova, ~0,5s) e o card editado
// viaja com a borda verde acesa, pra pessoa acompanhar pra onde ele foi.
// Cada toque no − / + reinicia o respiro — sequência de cliques não faz o
// card fugir do dedo.
// Lembrete flutuante da célula congelada — tocar/arrastar numa linha de
// desistência/sub judice explica em vez de ignorar o gesto em silêncio.
function mostrarToastCongelada(texto) {
  let el = document.getElementById("pcToastCongelada");
  if (!el) {
    el = document.createElement("div");
    el.id = "pcToastCongelada";
    el.className = "pc-toast-cong";
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add("on");
  clearTimeout(window._pcToastCongTimer);
  window._pcToastCongTimer = setTimeout(() => el.classList.remove("on"), 1800);
}

function agendarReordenacaoSuave(nomePartido, delayMs) {
  if (nomePartido) window._pcReordCardEditado = nomePartido;
  clearTimeout(window._pcReordTimer);
  window._pcReordTimer = setTimeout(reordenarComTransicao, delayMs || 1200);
}

async function reordenarComTransicao() {
  if (!pcState.palpiteEdicao || pcState.cargoAtivo === "senador") return;
  if (!pcState.ordemPartidosFixa) return; // nada congelado — nada a reagrupar
  // Dedo no fader AGORA (alça capturada): reagrupar no meio do arrasto
  // arrancaria o elemento de baixo do dedo — adia e tenta de novo.
  if (document.querySelector(".pc-dep-zone.ativo")) { agendarReordenacaoSuave(null, 600); return; }
  // Escala (pensando em SP, com centenas de candidatos — decisão do
  // usuário 21/08): só entra na animação quem está NA JANELA VISÍVEL
  // (com margem) — quem está fora da tela não precisa deslizar, ninguém
  // vê; o custo do FLIP fica limitado ao viewport, não ao tamanho do
  // estado. O reposicionamento em si continua valendo pra todos.
  const MARGEM_VIS = 300;
  const visivel = (r) => r.bottom > -MARGEM_VIS && r.top < window.innerHeight + MARGEM_VIS;
  const antes = {};
  let algumCard = false;
  document.querySelectorAll(".pc-dep-card[data-dep-nome]").forEach((el) => {
    algumCard = true;
    const r = el.getBoundingClientRect();
    if (visivel(r)) antes[el.dataset.depNome] = r.top;
  });
  if (!algumCard) return; // tela de palpite não está visível
  // Linhas de candidato: posição RELATIVA ao próprio card — o card também
  // pode estar viajando, e o delta em coordenadas de tela somaria os dois
  // movimentos (a linha andaria em dobro).
  const antesLinhas = {};
  document.querySelectorAll(".pc-dep-crow[data-dep-cand]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!visivel(r)) return;
    const card = el.closest(".pc-dep-card[data-dep-nome]");
    if (card) antesLinhas[el.dataset.depCand] = r.top - card.getBoundingClientRect().top;
  });
  pcState.ordemPartidosFixa = null; // libera a ordem de verdade
  pcState.ordemCandidatosFixa = null; // e a dos candidatos dentro dos cards
  await renderCargoEstadual();
  const editado = window._pcReordCardEditado;
  window._pcReordCardEditado = null;
  const cards = [...document.querySelectorAll(".pc-dep-card[data-dep-nome]")];
  const emMovimento = [];
  cards.forEach((el) => {
    const de = antes[el.dataset.depNome];
    if (de === undefined) return;
    const r = el.getBoundingClientRect();
    if (!visivel(r)) return; // saiu da janela — reposiciona sem animar
    const delta = de - r.top;
    if (!delta) return;
    if (el.dataset.depNome === editado) el.classList.add("pc-dep-movendo");
    el.style.transition = "none";
    el.style.transform = `translateY(${delta}px)`;
    emMovimento.push(el);
  });
  document.querySelectorAll(".pc-dep-crow[data-dep-cand]").forEach((el) => {
    const de = antesLinhas[el.dataset.depCand];
    if (de === undefined) return;
    const r = el.getBoundingClientRect();
    if (!visivel(r)) return;
    const card = el.closest(".pc-dep-card[data-dep-nome]");
    if (!card) return;
    const delta = de - (r.top - card.getBoundingClientRect().top);
    if (!delta) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${delta}px)`;
    emMovimento.push(el);
  });
  // Teto de segurança: passe com movimento demais (estado gigante + tudo
  // mudando) sai INSTANTÂNEO em vez de animado — o resultado final é o
  // mesmo, só sem o deslize, e o aparelho fraco não engasga.
  if (emMovimento.length > 60) {
    emMovimento.forEach((el) => { el.style.transition = ""; el.style.transform = ""; el.classList.remove("pc-dep-movendo"); });
    return;
  }
  if (!emMovimento.length) return;
  // dois rAF: o primeiro garante o layout com o transform aplicado, o
  // segundo dispara a transição de volta pro lugar
  requestAnimationFrame(() => requestAnimationFrame(() => {
    // Velocidade percebida CONSTANTE nos caminhos longos (pedido do
    // usuário, 30/08/2026): com duração fixa, um card que viaja meia tela
    // cruzava voando. Até ~2 alturas de card (280px) vale a duração base
    // de .625s; acima disso a duração cresce com a distância (velocidade
    // fixa de 280/.625 ≈ 448px/s), com teto de 1.6s pra não virar lesma.
    const DIST_BASE = 280, DUR_BASE = 0.625, DUR_MAX = 1.6;
    let durMax = DUR_BASE;
    emMovimento.forEach((el) => {
      const dist = Math.abs(parseFloat((el.style.transform.match(/-?[\d.]+/) || [0])[0]));
      const dur = dist <= DIST_BASE ? DUR_BASE : Math.min(DUR_MAX, dist / (DIST_BASE / DUR_BASE));
      if (dur > durMax) durMax = dur;
      el.style.transition = `transform ${dur.toFixed(3)}s cubic-bezier(.22,.9,.26,1)`;
      el.style.transform = "";
    });
    setTimeout(() => emMovimento.forEach((el) => {
      el.style.transition = "";
      el.classList.remove("pc-dep-movendo");
    }), Math.round(durMax * 1000) + 180);
  }));
}

function attachListenersSelecao() {
  // A pessoa pode trocar de tela ENQUANTO o render assíncrono da Seleção
  // ainda está em voo — o innerHTML novo chega, mas é substituído pela
  // outra tela antes deste attach rodar, e o primeiro getElementById
  // estourava em null (rejeição vista na varredura de 22/08). Se o
  // console da Seleção não está mais no DOM, não há o que ligar.
  if (!document.getElementById("pcBtnSalvarSelecao")) return;
  const btnImprimirCab = document.getElementById("pcBtnImprimirCabecalho");
  // Leva pra Revisão com o painel de opções de impressão (cargos/recorte/
  // ordenação/registrar/anônima) já aberto — pedido do usuário 01/09/2026:
  // o ícone do cabeçalho imprimia direto num formato fixo, sem deixar
  // escolher nada. pcState._abrirImpressaoAoEntrar é consumida uma vez
  // pelo listener de pcBtnImprimir em renderRevisaoDeposito.
  if (btnImprimirCab) btnImprimirCab.addEventListener("click", () => {
    pcState._abrirImpressaoAoEntrar = true;
    if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
    else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  });
  const btnColapsarPlenario = document.getElementById("pcBtnColapsarPlenario");
  if (btnColapsarPlenario) {
    btnColapsarPlenario.addEventListener("click", () => {
      const chave = "plenarioColapsado_" + pcState.cargoAtivo;
      const atualCol = pcState.expandido[chave] === undefined ? true : !!pcState.expandido[chave];
      const novoCol = !atualCol;
      pcState.expandido[chave] = novoCol;
      // Só troca a classe do próprio corpo (sem re-render da tela inteira)
      // — é isso que deixa o CSS animar a abertura/fechamento em vez de
      // trocar na hora (achado do usuário, 08/09/2026: telas "abruptas").
      // Altura calculada na hora (scrollHeight), não um teto fixo genérico
      // — pedido do usuário, 08/09/2026: um teto bem maior que o conteúdo
      // real fazia a animação "chegar" quase toda de uma vez no começo e
      // passar o resto do tempo sem nada visível acontecendo.
      const corpo = document.getElementById("pcPlenarioCorpo");
      if (corpo) {
        if (novoCol) {
          // fechando: primeiro fixa a altura atual (senão não há de onde
          // a transição partir), só depois manda pra 0.
          corpo.style.maxHeight = corpo.scrollHeight + "px";
          void corpo.offsetHeight;
          corpo.style.maxHeight = "0px";
          corpo.classList.remove("aberto");
        } else {
          corpo.style.maxHeight = corpo.scrollHeight + "px";
          corpo.classList.add("aberto");
        }
      }
      const seta = btnColapsarPlenario.querySelector("svg");
      if (seta) seta.style.transform = novoCol ? "rotate(-90deg)" : "none";
      btnColapsarPlenario.title = novoCol ? "Expandir" : "Recolher";
    });
  }
  const faixaVagas = document.getElementById("pcFaixaVagas");
  if (faixaVagas) {
    faixaVagas.addEventListener("click", (ev) => {
      const conf = ev.target.closest("[data-pc-fva-conf]");
      if (conf) {
        ev.stopPropagation();
        const nomeP = conf.getAttribute("data-pc-fva-conf");
        const nomePerdeP = conf.getAttribute("data-pc-fva-perde");
        const gi = pcState.palpiteEdicao.findIndex((pp) => pp.nome === nomeP);
        if (gi < 0) return;
        const p = pcState.palpiteEdicao[gi];
        const counts = vagasApuradasPorGrupo();
        snapshotPalpite();
        // Quando as 40/40 vagas já estão marcadas, não existe espaço livre
        // no total — a única forma honesta de confirmar é desmarcando quem
        // hoje segura a cadeira sem respaldo do voto atual (nomePerdeP,
        // achado do usuário 31/08/2026: "o sistema indica a eleição do
        // candidato, mas não indica quem perde"). Reduz o box do partido
        // que perde ANTES de subir o box do que ganha, senão o tapete
        // curto (aplicarVagas) barra o pedido como se não houvesse vaga.
        if (nomePerdeP) {
          const giPerde = pcState.palpiteEdicao.findIndex((pp) => pp.nome === nomePerdeP);
          if (giPerde >= 0) {
            const pPerde = pcState.palpiteEdicao[giPerde];
            const atualPerde = vagasIndicadasDe(pPerde, counts[giPerde] || 0);
            pPerde.vagasIndicadas = Math.max(0, atualPerde - 1);
          }
        }
        // Mesma semântica do "+" do box de vagas (tapete curto incluso):
        // sobe 1 vaga indicada e o recálculo marca o mais votado sem selo.
        const atual = vagasIndicadasDe(p, counts[gi] || 0);
        const somaOutras = pcState.palpiteEdicao.reduce(
          (soma, pp, i) => (i === gi ? soma : soma + vagasIndicadasDe(pp, counts[i] || 0)), 0);
        const totalCargo = totalVagasCargoAtivo();
        const novoVal = Math.min(atual + 1, Math.max(0, totalCargo - somaOutras));
        if (novoVal === atual) return;
        p.vagasIndicadas = novoVal;
        recalcularMarcadosDeputados();
        // Mesma família do bug achado 01/09/2026 (ordem congelada dos cards
        // — ver "Aceitar o ajuste"): este botão também muda vagasIndicadas
        // de dois partidos (o que ganha e, quando aplicável, o que perde)
        // sem passar por aplicarVagas — precisa agendar a reordenação na
        // mão, senão os cards ficam com a posição de antes pra sempre.
        agendarReordenacaoSuave(null, 1200);
        agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
        renderCargoEstadual();
        return;
      }
      const ir = ev.target.closest("[data-pc-fva-ir]");
      if (ir) {
        ev.stopPropagation();
        const nomeP = ir.getAttribute("data-pc-fva-ir");
        pcState.expandido["faderAberto_" + pcState.cargoAtivo + "_" + nomeP] = true;
        renderCargoEstadual();
        setTimeout(() => {
          const card = document.querySelector(`[data-dep-nome="${(window.CSS && CSS.escape) ? CSS.escape(nomeP) : nomeP}"]`);
          if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
        return;
      }
      const chave = "faixaVagas_" + pcState.cargoAtivo;
      const novaAberta = !pcState.expandido[chave];
      pcState.expandido[chave] = novaAberta;
      // Mesmo padrão do Plenário (08/09/2026): só alterna classe + altura
      // real do conteúdo, sem re-render da tela inteira, pra CSS animar
      // em vez de trocar na hora.
      const corpo = document.getElementById("pcFvaCorpo");
      if (corpo) {
        if (novaAberta) {
          corpo.style.maxHeight = corpo.scrollHeight + "px";
          corpo.classList.add("aberto");
        } else {
          corpo.style.maxHeight = corpo.scrollHeight + "px";
          void corpo.offsetHeight;
          corpo.style.maxHeight = "0px";
          corpo.classList.remove("aberto");
        }
      }
      faixaVagas.classList.toggle("aberta", novaAberta);
    });
  }
  const btnLegendaBadge = document.getElementById("pcBtnLegendaBadge");
  if (btnLegendaBadge) {
    btnLegendaBadge.addEventListener("click", () => {
      pcState.legendaBadgeAberta = !pcState.legendaBadgeAberta;
      renderCargoEstadual();
    });
  }
  document.querySelectorAll("[data-pc-toggle-partido]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.expandido[btn.dataset.pcTogglePartido] = !pcState.expandido[btn.dataset.pcTogglePartido];
      renderCargoEstadual();
    });
  });
  // O interruptor "eleito" (data-pc-marca) não é mais clicável — é só
  // leitura (checkbox disabled no template acima), calculado por
  // aplicarQuantidadeMarcados. Não precisa de listener de clique/change.
  document.querySelectorAll("input[data-pc-voto]").forEach((inp) => {
    inp.addEventListener("blur", (e) => {
      const [nomePartido, chave] = e.target.dataset.pcVoto.split("::");
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === nomePartido);
      const c = p.candidatos.find((cc) => String(cc.chave) === chave);
      let val = Number(String(e.target.value).replace(/\D/g, "")) || 0;
      // A soma dos votos de candidatos MARCADOS como eleito nunca pode
      // passar da projeção de votos válidos de 2026 pro cargo/estado (é a
      // mesma soma que "Soma de Votos" mostra no Painel Eleitoral, logo
      // acima) — não existe eleição real onde a soma dos eleitos supera o
      // total de votos válidos. Candidato NÃO marcado fica livre (pode ser
      // um número provisório de rascunho, ainda não decidiu se é eleito).
      if (c.marcadoEleito) {
        const somaSemEste = pcState.palpiteEdicao.reduce((s, pp) => s + pp.candidatos
          .filter((cc) => cc.marcadoEleito && cc !== c)
          .reduce((s2, cc) => s2 + (Number(cc.votos) || 0), 0), 0);
        const tetoProjecao = Math.round(totalValidosProjetado2026());
        val = Math.min(val, Math.max(0, tetoProjecao - somaSemEste));
      }
      if (val === c.votos) return;
      snapshotPalpite();
      c.votos = val;
      c.votosEditado = true;
      // Esse voto pode ter feito o candidato ultrapassar (ou cair atrás de)
      // outro do mesmo partido — recalcula quem fica marcado, mantendo a
      // MESMA quantidade de eleitos que já estava escolhida pro partido
      // (só muda QUEM preenche, nunca quantos).
      const quantidadeAtual = p.candidatos.filter((cc) => cc.marcadoEleito).length;
      aplicarQuantidadeMarcados(p, quantidadeAtual);
      renderCargoEstadual();
    });
    // Enter e Tab pulam direto pro próximo quadro de votação (não pro
    // interruptor "eleito" do candidato seguinte, que é o que o Tab do
    // navegador faria por padrão) — Shift+Tab volta pro anterior. O blur
    // (acima) já salva o valor e pode reconstruir a lista inteira; por
    // isso o "próximo" é encontrado de novo pelo atributo depois do blur,
    // nunca guardado como referência de elemento (ela pode não existir
    // mais assim que o DOM é reconstruído).
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== "Tab") return;
      e.preventDefault();
      const todos = [...document.querySelectorAll("input[data-pc-voto]")];
      const idx = todos.indexOf(e.target);
      const voltar = e.key === "Tab" && e.shiftKey;
      const alvo = voltar ? todos[idx - 1] : todos[idx + 1];
      const atributoAlvo = alvo ? alvo.getAttribute("data-pc-voto") : null;
      e.target.blur();
      if (atributoAlvo) {
        const novo = document.querySelector(`input[data-pc-voto="${atributoAlvo}"]`);
        if (novo) { novo.focus(); novo.select(); }
      }
    });
  });
  document.querySelectorAll("input[data-pc-busca-candidato]").forEach((inp) => {
    // Esc limpa e fecha a busca deste partido (pedido do usuário, 21/08/2026).
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      const nomePartido = e.target.dataset.pcBuscaCandidato;
      if (pcState.buscaCandidato) pcState.buscaCandidato[nomePartido] = "";
      if (pcState.buscaCandidatoAberta) pcState.buscaCandidatoAberta[nomePartido] = false;
      renderCargoEstadual();
    });
    inp.addEventListener("input", async (e) => {
      const nomePartido = e.target.dataset.pcBuscaCandidato;
      const valor = e.target.value;
      const cursor = e.target.selectionStart;
      if (!pcState.buscaCandidato) pcState.buscaCandidato = {};
      pcState.buscaCandidato[nomePartido] = valor;
      // Mesmo await da busca de partido: o render é assíncrono e o foco só
      // pode ser devolvido DEPOIS do DOM novo existir.
      await renderCargoEstadual();
      // A busca reconstrói o innerHTML inteiro (renderSelecaoCandidatos), então
      // o input original perde o foco — reencontra o novo pelo mesmo atributo
      // e devolve o cursor à posição de antes, senão cada letra digitada faria
      // o campo perder o foco.
      const novoInp = document.querySelector(`input[data-pc-busca-candidato="${nomePartido}"]`);
      if (novoInp) {
        // preventScroll:true — sem isso, focar um input que ficou fora da
        // área visível (pode acontecer depois do reconstruir do innerHTML)
        // faz o navegador rolar a tela sozinho até ele, por cima da rolagem
        // que renderCargoEstadual() já tinha acabado de restaurar
        // manualmente (ver scrollAnterior/reRenderizando no topo dessa
        // função) — na prática a tela "pulava" pro topo a cada letra
        // digitada na busca. Achado pelo usuário em 16/08/2026.
        novoInp.focus({ preventScroll: true });
        novoInp.setSelectionRange(cursor, cursor);
      }
    });
  });
  const btnCmdLegendaToggle = document.getElementById("pcCmdLegendaToggle");
  if (btnCmdLegendaToggle) {
    btnCmdLegendaToggle.addEventListener("click", () => {
      pcState.legendaComandosAberta = !pcState.legendaComandosAberta;
      renderCargoEstadual();
    });
  }
  const btnBuscaPartidoToggle = document.getElementById("pcBtnBuscaPartidoToggle");
  if (btnBuscaPartidoToggle) {
    btnBuscaPartidoToggle.addEventListener("click", async () => {
      pcState.buscaPartidoAberta = !pcState.buscaPartidoAberta;
      // await: o render é assíncrono — sem ele, o focus rodava antes do
      // input novo existir (mesma lição do bug de 17/08 no input da busca).
      await renderCargoEstadual();
      if (pcState.buscaPartidoAberta) {
        const inp = document.getElementById("pcBuscaPartidoInput");
        if (inp) inp.focus({ preventScroll: true });
      }
    });
  }
  const inputBuscaPartido = document.getElementById("pcBuscaPartidoInput");
  if (inputBuscaPartido) {
    // Esc limpa e fecha a busca (pedido do usuário, 21/08/2026).
    inputBuscaPartido.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      pcState.buscaPartido = "";
      pcState.buscaPartidoAberta = false;
      renderCargoEstadual();
    });
    inputBuscaPartido.addEventListener("input", async (e) => {
      const cursor = e.target.selectionStart;
      pcState.buscaPartido = e.target.value;
      // renderCargoEstadual é ASSÍNCRONO — sem o await, a devolução de foco
      // abaixo rodava antes do re-render e focava o input antigo, que era
      // destruído em seguida: só dava pra digitar uma letra por vez (bug
      // achado pelo usuário em 17/08/2026, no modelo fader).
      await renderCargoEstadual();
      // O innerHTML inteiro é reconstruído (renderSelecaoCandidatos), então
      // o input original perde o foco — reencontra o novo e devolve o
      // cursor à posição de antes, senão cada letra digitada tira o foco.
      // preventScroll:true (ver comentário acima, mesmo motivo) — sem isso
      // essa era a busca que jogava a tela pro topo a cada tecla.
      const novoInp = document.getElementById("pcBuscaPartidoInput");
      if (novoInp) {
        novoInp.focus({ preventScroll: true });
        novoInp.setSelectionRange(cursor, cursor);
      }
    });
  }
  document.querySelectorAll("[data-pc-busca-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nomePartido = btn.dataset.pcBuscaToggle;
      if (!pcState.buscaCandidatoAberta) pcState.buscaCandidatoAberta = {};
      pcState.buscaCandidatoAberta[nomePartido] = !pcState.buscaCandidatoAberta[nomePartido];
      renderCargoEstadual();
      if (pcState.buscaCandidatoAberta[nomePartido]) {
        const inp = document.querySelector(`input[data-pc-busca-candidato="${nomePartido}"]`);
        if (inp) inp.focus({ preventScroll: true });
      }
    });
  });
  document.querySelectorAll("[data-pc-balancear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcBalancear);
      pedirConfirmacaoAutoPreenchimento(p);
    });
  });
  document.querySelectorAll("[data-pc-reset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcReset);
      snapshotPalpite();
      resetarPartidoSelecao(p);
      agendarReordenacaoSuave(p.nome, 600);
      renderCargoEstadual();
    });
  });
  document.querySelectorAll("[data-pc-zerar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcZerar);
      snapshotPalpite();
      zerarPartidoSelecao(p);
      agendarReordenacaoSuave(p.nome, 600);
      renderCargoEstadual();
    });
  });
  document.querySelectorAll("[data-pc-inc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!podeMarcarMaisUmEleito()) { abrirAvisoLimiteVagasSeNecessario(); return; }
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcInc);
      snapshotPalpite();
      incrementarEleitosPartido(p);
      renderCargoEstadual();
    });
  });
  document.querySelectorAll("[data-pc-dec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcDec);
      snapshotPalpite();
      decrementarEleitosPartido(p);
      renderCargoEstadual();
    });
  });
  document.querySelectorAll("input[data-pc-count]").forEach((inp) => {
    inp.addEventListener("blur", (e) => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === e.target.dataset.pcCount);
      const marcadosAtuais = p.candidatos.filter((c) => c.marcadoEleito).length;
      const alvo = Number(String(e.target.value).replace(/\D/g, "")) || 0;
      if (alvo === marcadosAtuais) { e.target.value = marcadosAtuais; return; }
      if (alvo > marcadosAtuais && alvo - marcadosAtuais > totalVagasCargoAtivo() - totalMarcadosCargoAtivo()) {
        abrirAvisoLimiteVagasSeNecessario();
      }
      snapshotPalpite();
      definirEleitosPartido(p, alvo);
      renderCargoEstadual();
    });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  });
  document.querySelectorAll("[data-pc-add-cand]").forEach((btn) => {
    btn.addEventListener("click", () => {
      adicionarCandidatoNoPartido(pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcAddCand));
    });
  });
  document.querySelectorAll("[data-dep-cong]").forEach((row) => {
    row.addEventListener("pointerdown", () => mostrarToastCongelada(row.dataset.depCong));
  });
  document.querySelectorAll("[data-pc-partido-card]").forEach((card) => {
    card.addEventListener("mouseleave", () => {
      if (!pcState.ordemPartidosFixa) return;
      // Também suave (21/08/2026): saiu do card, o reagrupamento vem com o
      // mesmo deslize FLIP — só com um respiro menor, porque o gesto acabou.
      agendarReordenacaoSuave(null, 350);
    });
  });
  document.getElementById("pcBtnVoltarSelecao").addEventListener("click", desfazerPalpite);
  const btnRefazer = document.getElementById("pcBtnRefazerSelecao");
  if (btnRefazer) btnRefazer.addEventListener("click", refazerPalpite);
  document.getElementById("pcBtnPreencherAutoTudo").addEventListener("click", () => {
    pedirConfirmacaoAutoPreenchimento(null);
  });
  document.getElementById("pcBtnZerarTudo").addEventListener("click", () => {
    snapshotPalpite();
    zerarTudoSelecao();
    agendarReordenacaoSuave(null, 600);
    renderCargoEstadual();
  });
  document.getElementById("pcBtnRestaurar2022").addEventListener("click", () => {
    snapshotPalpite();
    restaurarTudo2022();
    agendarReordenacaoSuave(null, 600);
    renderCargoEstadual();
  });
  // Tutorial em 2 telas (refeito 01/09/2026, pedido do usuário): tela 1 só
  // o aviso + ilustração estática + recorte real do app com o ícone
  // circulado, botão "Prosseguir" sempre ativo. Tela 2 é onde o ícone dos
  // pontos VIRA clicável de verdade e roda a demo de 3 passos — o botão
  // "Concluir" só libera depois do ciclo completo.
  const tutProsseguir = document.getElementById("pcTutProsseguir");
  if (tutProsseguir && !tutProsseguir.dataset.ligado) {
    tutProsseguir.dataset.ligado = "1";
    tutProsseguir.addEventListener("click", () => {
      pcState._tutTela2 = true;
      renderCargoEstadual();
    });
  }
  const tutPontosClicavel = document.getElementById("pcTutPontos");
  const tutAvancar = document.getElementById("pcTutAvancar");
  if (tutPontosClicavel && tutAvancar && !tutPontosClicavel.dataset.ligado) {
    tutPontosClicavel.dataset.ligado = "1";
    let tutNivel = 1;
    const janelas = {
      1: '<div class="pc-tut-lin"><span class="pc-tut-minipontos"><i class="on"></i><i></i><i></i></span> <b style="color:var(--pc-accent);">1 ponto</b> — sinaliza que existe orientação</div>',
      2: '<div class="pc-tut-lin"><span class="pc-tut-minipontos"><i class="on"></i><i class="on"></i><i></i></span><span class="pc-tut-passo">Passo 1</span> Preencha as vagas por partido — 12 de 40 <span class="pc-tut-min">−</span></div>',
      3: '<div class="pc-tut-lin" style="border-bottom:1px solid rgba(242,244,245,.08); padding-bottom:6px;"><span class="pc-tut-minipontos"><i class="on"></i><i class="on"></i><i class="on"></i></span><span class="pc-tut-passo">Sua trilha</span><span class="pc-tut-min">−</span></div><div class="pc-tut-item on">① Preencher as vagas por partido — <b style="color:var(--pc-accent);">12 de 40</b></div><div class="pc-tut-item">② Distribuir a votação pelos candidatos</div><div class="pc-tut-item">③ Avançar pra Revisão</div>',
    };
    tutPontosClicavel.addEventListener("click", () => {
      if (tutNivel >= 3) return;
      tutNivel++;
      tutPontosClicavel.querySelectorAll("i").forEach((el, idx) => { el.className = idx < tutNivel ? "on" : ""; });
      document.getElementById("pcTutPalco").innerHTML = janelas[tutNivel];
      if (tutNivel === 3) tutAvancar.disabled = false;
    });
    tutAvancar.addEventListener("click", () => {
      pcState.instrucaoSelecaoAberta = false;
      pcState._tutTela2 = false;
      salvarTutorialVisto();
      renderCargoEstadual();
    });
  }
  const overlayInstrucao = document.getElementById("pcInstrucaoOverlay");
  if (overlayInstrucao) {
    overlayInstrucao.addEventListener("click", (e) => {
      if (e.target.id === "pcInstrucaoOverlay") {
        pcState.instrucaoSelecaoAberta = false;
        pcState._tutTela2 = false;
        salvarTutorialVisto();
        renderCargoEstadual();
      }
    });
  }
  const fecharAvisoLimite = document.getElementById("pcFecharAvisoLimite");
  if (fecharAvisoLimite) {
    fecharAvisoLimite.addEventListener("click", () => {
      const naoMostrar = document.getElementById("pcNaoMostrarAvisoLimite");
      if (naoMostrar && naoMostrar.checked) salvarAvisoLimiteVagasOculto(true);
      pcState.avisoLimiteVagasAberto = false;
      renderCargoEstadual();
    });
  }
  const overlayAvisoLimite = document.getElementById("pcAvisoLimiteOverlay");
  if (overlayAvisoLimite) {
    overlayAvisoLimite.addEventListener("click", (e) => {
      if (e.target.id === "pcAvisoLimiteOverlay") {
        pcState.avisoLimiteVagasAberto = false;
        renderCargoEstadual();
      }
    });
  }
  const cancelarAuto = document.getElementById("pcBtnCancelarAuto");
  if (cancelarAuto) {
    cancelarAuto.addEventListener("click", () => {
      pcState.confirmAutoPreenchimentoAberto = false;
      pcState.confirmAutoPreenchimentoAcao = null;
      renderCargoEstadual();
    });
  }
  const confirmarAuto = document.getElementById("pcBtnConfirmarAuto");
  if (confirmarAuto) {
    confirmarAuto.addEventListener("click", () => {
      const naoConfirmar = document.getElementById("pcNaoConfirmarAuto");
      if (naoConfirmar && naoConfirmar.checked) salvarConfirmarAutoOculto(true);
      const acao = pcState.confirmAutoPreenchimentoAcao;
      pcState.confirmAutoPreenchimentoAberto = false;
      pcState.confirmAutoPreenchimentoAcao = null;
      executarAutoPreenchimento(acao ? acao.partido : null);
    });
  }
  const overlayConfirmAuto = document.getElementById("pcConfirmAutoOverlay");
  if (overlayConfirmAuto) {
    overlayConfirmAuto.addEventListener("click", (e) => {
      if (e.target.id === "pcConfirmAutoOverlay") {
        pcState.confirmAutoPreenchimentoAberto = false;
        pcState.confirmAutoPreenchimentoAcao = null;
        renderCargoEstadual();
      }
    });
  }
  document.querySelectorAll("[data-pc-ver2022]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.candidatos2022Aberto = btn.dataset.pcVer2022;
      renderCargoEstadual();
    });
  });
  const fecharCandidatos2022 = document.getElementById("pcFecharCandidatos2022");
  if (fecharCandidatos2022) {
    fecharCandidatos2022.addEventListener("click", () => {
      pcState.candidatos2022Aberto = null;
      renderCargoEstadual();
    });
  }
  const overlayCandidatos2022 = document.getElementById("pcCandidatos2022Overlay");
  if (overlayCandidatos2022) {
    overlayCandidatos2022.addEventListener("click", (e) => {
      if (e.target.id === "pcCandidatos2022Overlay") {
        pcState.candidatos2022Aberto = null;
        renderCargoEstadual();
      }
    });
  }
  document.getElementById("pcBtnTop2022").addEventListener("click", () => {
    pcState.top2022Aberto = true;
    renderCargoEstadual();
  });
  const fecharTop2022 = document.getElementById("pcFecharTop2022");
  if (fecharTop2022) {
    fecharTop2022.addEventListener("click", () => {
      pcState.top2022Aberto = false;
      renderCargoEstadual();
    });
  }
  const overlayTop2022 = document.getElementById("pcTop2022Overlay");
  if (overlayTop2022) {
    overlayTop2022.addEventListener("click", (e) => {
      if (e.target.id === "pcTop2022Overlay") {
        pcState.top2022Aberto = false;
        renderCargoEstadual();
      }
    });
  }
  // (Botão ">" Prosseguir pra Revisão removido do console em 28/08/2026 —
  // o caminho pra Revisão é pelo atalho "Revisão" de Minhas Listas.)
  // "Salvar" da Seleção — ao contrário de "Avançar" (acima), não exige a
  // lista completa: grava o que já foi marcado e mantém a pessoa editando
  // na mesma tela (pedido do usuário em 16/08/2026 — vinha perdendo
  // simulações por não conseguir salvar antes de terminar). Reaproveita o
  // mesmo modal de nomear e a mesma execução de gravação da Revisão
  // (executarSalvarLista), só que com manterTela:true pra não navegar embora.
  document.getElementById("pcBtnSalvarSelecao").addEventListener("click", async () => {
    garantirPalpitesPorCargo();
    // O disquete SEMPRE abre a tela de SLOTS (decisão 21-22/08; versão
    // final "linha com anel"): lista em edição pré-selecionada, vazio com
    // o campo de nome no lugar, trancado com o preço além dos 2 grátis.
    const todas = await _carregarMinhasListasNormalizado();
    pcState._destinosSalvar = todas.filter((l) => !l.depositadoEm);
    if (pcState.perfil) {
      try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) { /* mostra o último conhecido */ }
    }
    // A lista em edição entra selecionada — Salvar direto = sobrescrever
    // o slot que estou editando (com a confirmação SIM/NÃO).
    pcState._destinoSelecionado = pcState.listaSalvaId && pcState._destinosSalvar.some((l) => l.id === pcState.listaSalvaId)
      ? pcState.listaSalvaId : null;
    pcState._destinoNomeDigitado = null;
    pcState._destinoDesbloqueado = false;
    pcState._destinoConfirmando = false;
    pcState.modalSalvarDestinoAberto = true;
    renderCargoEstadual();
  });
  if (pcState.modalSalvarDestinoAberto) {
    const limparTransitorios = () => {
      pcState._destinoSelecionado = null;
      pcState._destinoNomeDigitado = null;
      pcState._destinoDesbloqueado = false;
      pcState._destinoConfirmando = false;
    };
    const fecharDestino = () => {
      pcState.modalSalvarDestinoAberto = false;
      limparTransitorios();
      renderCargoEstadual();
    };
    const inpDestino = document.getElementById("pcInputDestinoNome");
    if (inpDestino) {
      inpDestino.addEventListener("input", () => { pcState._destinoNomeDigitado = inpDestino.value; });
      inpDestino.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmarDestino(); } });
      inpDestino.addEventListener("pointerdown", (e) => e.stopPropagation());
      if (pcState._destinoSelecionado === "novo") setTimeout(() => inpDestino.focus({ preventScroll: true }), 40);
    }
    document.querySelectorAll("[data-pc-destino-slot]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pcState._destinoSelecionado = btn.getAttribute("data-pc-destino-slot");
        pcState._destinoConfirmando = false;
        renderCargoEstadual();
      });
    });
    document.querySelectorAll("[data-pc-destino-vazio]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (e.target.id === "pcInputDestinoNome") return;
        if (pcState._destinoSelecionado === "novo") return;
        pcState._destinoSelecionado = "novo";
        pcState._destinoConfirmando = false;
        renderCargoEstadual();
      });
    });
    document.querySelectorAll("[data-pc-destino-trancado]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        // Convidado não tem crédito — desbloquear slot pede conta.
        if (!pcState.perfil) {
          pcState.modalSalvarDestinoAberto = false;
          limparTransitorios();
          pcState.pendenteRegistro = true;
          pcState.tela = "cadastro";
          renderColaborativo();
          return;
        }
        // Logado: o slot abre já aqui; o crédito só é cobrado NO SALVAR
        // (cancelar não custa nada).
        pcState._destinoDesbloqueado = true;
        pcState._destinoSelecionado = "novo";
        pcState._destinoConfirmando = false;
        renderCargoEstadual();
      });
    });
    const salvarNoAlvo = async (id, nome) => {
      pcState.modalSalvarDestinoAberto = false;
      limparTransitorios();
      pcState.listaSalvaId = id;
      pcState.listaSalvaNome = nome;
      await persistirListaAtivaLocal();
      garantirPalpitesPorCargo();
      const ok = await executarSalvarLista({ manterTela: true });
      if (ok) {
        await renderCargoEstadual();
        mostrarStatusSalvamento(`Salvo em "${nome}". Pode continuar editando.`);
      } else {
        // Falha (rede/banco): sem isto o modal ficava congelado na tela
        // sem nenhuma mensagem — o clique parecia morto (achado do
        // usuário, 30/08/2026). Reabre com o erro visível pra pessoa
        // tentar de novo.
        pcState.modalSalvarDestinoAberto = true;
        pcState._destinoSelecionado = id;
        await renderCargoEstadual();
        const erroEl = document.getElementById("pcErroDestino");
        if (erroEl) erroEl.textContent = pcState._statusSalvamentoMsg || "Não consegui salvar — confira a conexão e tente de novo.";
      }
    };
    const confirmarDestino = async () => {
      const destinos = (pcState._destinosSalvar || []).filter((l) => !l.depositadoEm);
      const sel = pcState._destinoSelecionado;
      if (!sel) return;
      if (sel === "novo") {
        const inp = document.getElementById("pcInputDestinoNome");
        const nome = (inp ? inp.value : (pcState._destinoNomeDigitado || "")).trim();
        if (!nome) {
          const erro = document.getElementById("pcErroDestino");
          if (erro) erro.textContent = "Dê um nome pra lista.";
          if (inp) inp.focus();
          return;
        }
        // Slot além dos 2 grátis: cobra o crédito agora (mesma RPC do "+").
        if (destinos.length >= 2) {
          const { consumiu, error } = await consumirCreditoConta(pcState.perfil.id);
          if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
          if (!consumiu) {
            const erro = document.getElementById("pcErroDestino");
            if (erro) erro.textContent = "Sem crédito pro slot novo — sobreponha uma lista, ou convide um amigo pra ganhar créditos.";
            return;
          }
          pcState.perfil.creditos = Math.max(0, (pcState.perfil.creditos || 0) - 1);
        }
        pcState.modalSalvarDestinoAberto = false;
        limparTransitorios();
        pcState.listaSalvaId = null;
        pcState.listaSalvaNome = nome;
        await persistirListaAtivaLocal();
        garantirPalpitesPorCargo();
        const ok = await executarSalvarLista({ manterTela: true });
        if (ok) {
          await renderCargoEstadual();
          mostrarStatusSalvamento(`Lista "${nome}" salva. Pode continuar editando.`);
        } else {
          pcState.modalSalvarDestinoAberto = true;
          pcState._destinoSelecionado = "novo";
          pcState._destinoNomeDigitado = nome;
          await renderCargoEstadual();
          const erroEl = document.getElementById("pcErroDestino");
          if (erroEl) erroEl.textContent = pcState._statusSalvamentoMsg || "Não consegui salvar — confira a conexão e tente de novo.";
        }
        return;
      }
      const alvo = destinos.find((l) => l.id === sel);
      if (!alvo) return;
      // Sobrescrever slot ocupado: a confirmação clássica SIM/NÃO aparece
      // antes de gravar (protótipo aprovado — sem surpresa de perda).
      if (!pcState._destinoConfirmando) {
        pcState._destinoConfirmando = true;
        renderCargoEstadual();
        return;
      }
      await salvarNoAlvo(alvo.id, alvo.nome);
    };
    const btnConfirmarDestino = document.getElementById("pcBtnConfirmarDestino");
    if (btnConfirmarDestino) btnConfirmarDestino.addEventListener("click", confirmarDestino);
    const confirmSim = document.getElementById("pcSlotConfirmSim");
    if (confirmSim) confirmSim.addEventListener("click", async () => {
      const destinos = (pcState._destinosSalvar || []).filter((l) => !l.depositadoEm);
      const alvo = destinos.find((l) => l.id === pcState._destinoSelecionado);
      if (alvo) await salvarNoAlvo(alvo.id, alvo.nome);
    });
    const confirmNao = document.getElementById("pcSlotConfirmNao");
    if (confirmNao) confirmNao.addEventListener("click", () => {
      pcState._destinoConfirmando = false;
      renderCargoEstadual();
    });
    const btnCancelarDestino = document.getElementById("pcBtnCancelarDestino");
    if (btnCancelarDestino) btnCancelarDestino.addEventListener("click", fecharDestino);
    const overlayDestino = document.getElementById("pcModalSalvarDestinoOverlay");
    if (overlayDestino) overlayDestino.addEventListener("click", (e) => { if (e.target.id === "pcModalSalvarDestinoOverlay") fecharDestino(); });
  }
  // Lápis de editar Instagram — só existe no DOM quando pcState.souAdmin
  // (ver o card do candidato), mas o querySelectorAll cobre o caso normal
  // (nenhum encontrado, forEach não roda) sem precisar de outro if.
  document.querySelectorAll("[data-pc-editar-instagram]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const chave = btn.dataset.pcEditarInstagram;
      pcState.modalInstagramInfo = {
        chave,
        nome: btn.dataset.pcEditarInstagramNome,
        valorAtual: linkInstagramDe(chave),
      };
      renderCargoEstadual();
    });
  });
  if (pcState.modalInstagramInfo) {
    attachListenersModalInstagram(renderCargoEstadual);
  }
  // Ícone de moeda — abre/fecha o painel de bens e recursos do candidato
  // (só um aberto por vez, clicar de novo no mesmo fecha).
  document.querySelectorAll("[data-pc-toggle-financeiro]").forEach((el) => {
    el.addEventListener("click", () => {
      const chave = el.dataset.pcToggleFinanceiro;
      pcState.financeiroAbertoChave = pcState.financeiroAbertoChave === chave ? null : chave;
      renderCargoEstadual();
    });
  });
}
