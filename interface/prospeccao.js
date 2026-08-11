// Prospecção Coletiva — telas de cadastro/login, editor de palpite (modo
// detalhado), quadro de médias e placeholder de ranking. Depende de tudo em
// nuvem/*.js (carregado antes) e reaproveita helpers de dados/calculo/interface
// já existentes (BASE_2022, dhondt, desenharHemiciclo, chevron, infoTip,
// selosCandidato2022, corDoPartido). Não toca em `state`/app.js — estado
// próprio (`pcState`) para não arriscar quebrar o Simulador individual.

let pcState = {
  iniciado: false,
  sessao: null,
  perfil: null,
  // carregando | erro-conexao | landing | estado | selecao-convidado |
  // revisao-convidado | deposito-confirmado | lobby | detalhado-convidado |
  // login | cadastro | app
  tela: "carregando",
  subaba: "selecao", // selecao | painel | palpite | medias | ranking (só usado dentro de "app", logado)
  estado: null, // sigla do estado escolhido (ver dados/estados-brasil.js) — só "SC" tem dados por enquanto
  cargoAtivo: "estadual", // estadual | federal | senador
  vagasPorPartido: null,
  ultimoEditadoPartido: null,
  palpiteEdicao: null,
  cargoPalpiteEdicao: null, // qual cargo o palpiteEdicao atual pertence — recarrega quando muda de aba
  palpitesPorCargo: null, // { estadual, federal, senador } — usado só na Revisão, pra editar os 3 cargos ali sem perder o que já foi mexido em cada um (ver garantirPalpitesPorCargo)
  rascunhosCache: null, // { estadual, federal, senador } — rascunho salvo (autosave) de cada cargo pro estado atual, carregado 1x por garantirRascunhosCarregados()
  rascunhosCacheEstado: null, // qual estado o rascunhosCache acima pertence — invalida o cache se o estado mudar
  verPerfilId: null, // perfil_id sendo visto em tela "compartilhado" (link ?ver=)
  pendenteAcao: null, // "compartilhar" | "grupo" | null — pra onde ir depois de completar o cadastro vindo do Lobby
  telaGrupo: null, // null (hub) | "criar" | "entrar" | "membro" — sub-navegação dentro da subaba "grupo"
  meusGrupos: null, // cache dos grupos da pessoa (array), carregado 1x por sessão
  grupoAtivo: null, // grupo sendo visto em telaGrupo "membro"
  grupoComparacao: null, // cache do resultado de buscarComparacaoGrupo(grupoAtivo.id)
  cargoAtivoGrupo: "estadual", // qual cargo a comparação do grupo está mostrando (estadual|federal|senador)
  historicoPalpite: [], // snapshots pro botão "Voltar" da tela de seleção
  avisoLimiteVagasAberto: false, // modal "só dá pra marcar até o total de vagas"
  confirmAutoPreenchimentoAberto: false, // modal de confirmação antes do autopreenchimento (✦)
  confirmAutoPreenchimentoAcao: null, // { partido: <objeto do partido> } pro botão por partido, ou null pro "Auto" geral
  candidatos2022Aberto: null, // nome do partido (ou federação) com o modal "nominata completa de 2022" aberto
  top2022Aberto: false, // modal "100 mais votados de 2022" (todos os partidos do cargo/estado) aberto ou não
  buscaCandidatoAberta: {}, // nome do partido -> campo de busca por nome visível ou não (fica escondido por padrão)
  buscaPartidoAberta: false, // campo de busca de PARTIDO (lista inteira, na barra de botões) visível ou não
  buscaPartido: "", // termo digitado na busca de partido
  expandido: {},
  modoPartido: {}, // nome do partido -> "detalhado" (default é o modo simplificado)
  erro: "",
  status: "",
  modalNomeListaAberto: false, // modal "dê um nome pra essa lista" no primeiro Salvar da Revisão
  listaSalvaId: null, // id exclusivo gerado no primeiro Salvar — reaproveitado nos salvamentos seguintes da mesma lista (edição, não duplicata)
  listaSalvaNome: null, // nome escolhido pela pessoa nesse modal — só pergunta de novo se vier null (ex.: depois de "Sair")
  modoAgrupadoRevisao: {}, // cargo -> true/false — filtro "lista única" (default) vs "agrupado por partido/federação" na Revisão
  listaEmVisualizacao: null, // lista depositada aberta em modo "Ver" (renderMinhasListas) — null = mostrando a lista de listas
  modalDepositarListaId: null, // id da lista com o modal de confirmação de depósito aberto
  avisoLimiteListaAberto: false, // aviso "compre crédito" ao tentar criar 2ª lista sem pagar
  avisoLimiteGrupoAberto: false, // aviso "compre crédito" ao tentar criar 2º grupo sem pagar
};

// Cargos simuláveis por estado. Os 3 têm candidatos reais de 2022 carregados
// pra SC (dados/base-2022.js, dados/estados/sc-2022-federal.js,
// dados/estados/sc-2022-senador.js) — ver renderCargoIndisponivel pro caso de
// um estado sem dado nenhum ainda entrar aqui no futuro.
const CARGOS = [
  { id: "estadual", label: "Dep. Estadual", disponivel: true },
  { id: "federal", label: "Dep. Federal", disponivel: true },
  { id: "senador", label: "Senador", disponivel: true },
];

// Ícones de contorno em SVG (não emoji — emoji carrega cor própria e ignora
// CSS, o que já causou inconsistência visual nos protótipos). currentColor
// deixa a cor sempre controlada pelo CSS do elemento pai.
const PC_ICONES = {
  ballot: '<path d="M2.5 6.5h11v7a1.2 1.2 0 01-1.2 1.2H3.7A1.2 1.2 0 012.5 13.5v-7z" fill="none" stroke="currentColor" stroke-width="1.3"></path><path d="M4.5 6.5h7" stroke="currentColor" stroke-width="1.3"></path><rect x="6.6" y="2" width="3.4" height="4.8" rx=".5" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(12 8.3 4.4)"></rect>',
  send: '<path d="M13.3 2.6L2 7.2l4.3 1.6M13.3 2.6L8.8 13l-2.5-4.2M13.3 2.6L6.3 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  grupos: '<circle cx="6" cy="5.3" r="2" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M2.3 13c0-2.2 1.6-3.9 3.7-3.9s3.7 1.7 3.7 3.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><circle cx="11.2" cy="6.2" r="1.6" fill="none" stroke="currentColor" stroke-width="1.1"></circle><path d="M10 9.5c1.9.1 3.5 1.7 3.6 3.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>',
  chart: '<path d="M2.5 13.5h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><rect x="3.4" y="9.2" width="2.1" height="3.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="6.9" y="6.2" width="2.1" height="6.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="10.4" y="3.4" width="2.1" height="9.6" fill="none" stroke="currentColor" stroke-width="1.2"></rect>',
  ranking: '<path d="M5 2.5h6v3a3 3 0 01-6 0v-3z" fill="none" stroke="currentColor" stroke-width="1.3"></path><path d="M5 3.3H3.2a1.8 1.8 0 001.8 1.8M11 3.3h1.8A1.8 1.8 0 0111 5.1" fill="none" stroke="currentColor" stroke-width="1.1"></path><path d="M8 8.5v2.3M6.2 13h3.6M6.6 10.8h2.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  reset: '<circle cx="8" cy="8.6" r="5.1" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M8 5.6v3l2.2 1.3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.3 2.3L6 3.9 4.2 4.9z" fill="currentColor"></path><path d="M4 4.4c.9-.9 2-1.5 3.3-1.7" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>',
  desfazer: '<path d="M8.33 5.33c-1.77 0-3.37 0.66-4.6 1.73L1.33 4.67v6h6l-2.41-2.41c0.93-0.77 2.11-1.25 3.41-1.25 2.36 0 4.37 1.54 5.07 3.67l1.58-0.52C14.05 7.35 11.43 5.33 8.33 5.33z" fill="currentColor"></path>',
  borracha: '<path d="M4.6 11.6L9.7 4a1.3 1.3 0 011.8-.35l2.5 1.65a1.3 1.3 0 01.35 1.8l-4.6 6.9-5.2-2.4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path><path d="M7.2 6.9l4.5 2.75" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path><path d="M2.6 13.4h6.9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>',
  alerta: '<path d="M8 2.3l6.2 10.7a1 1 0 01-.87 1.5H2.67a1 1 0 01-.87-1.5L8 2.3z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M8 6.6v3.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><circle cx="8" cy="11.7" r=".9" fill="currentColor"></circle>',
  completar: '<path d="M8.6 2L9.7 5.3 13 6.4 9.7 7.5 8.6 10.8 7.5 7.5 4.2 6.4 7.5 5.3z" fill="currentColor"></path><path d="M12.8 9.6l.55 1.65L15 12l-1.65.55L12.8 14l-.55-1.45L10.6 12l1.65-.75z" fill="currentColor"></path>',
  ano2022: '<text x="8" y="7.3" text-anchor="middle" font-size="6" font-weight="800" fill="currentColor" font-family="var(--sans)">20</text><text x="8" y="13.6" text-anchor="middle" font-size="6" font-weight="800" fill="currentColor" font-family="var(--sans)">22</text>',
  mais: '<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>',
  chave: '<circle cx="5.2" cy="5.2" r="2.4" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M7 7l6.3 6.3M11 9.3l1.6 1.6M13 7.3l1.3 1.3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  lista: '<path d="M2.5 4.5h2M6 4.5h7.5M2.5 8h2M6 8h7.5M2.5 11.5h2M6 11.5h7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  calendario: '<rect x="2.5" y="3.3" width="11" height="10.2" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.2"></rect><path d="M2.5 6.4h11M5.3 2v2.4M10.7 2v2.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>',
  convidar: '<circle cx="6.3" cy="6" r="2.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M2.3 14c0-2.4 1.8-4.3 4-4.3s4 1.9 4 4.3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><path d="M12 5v4M10 7h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  compartilhar: '<circle cx="12" cy="3.6" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><circle cx="4" cy="8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><circle cx="12" cy="12.4" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><path d="M5.5 7.1l5-2.6M5.5 8.9l5 2.6" stroke="currentColor" stroke-width="1.1"></path>',
  checkCirculo: '<circle cx="8" cy="8" r="5.7" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M5.4 8.2l1.8 1.8 3.4-3.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  home: '<path d="M2.5 7.2L8 2.8l5.5 4.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 6.3v6.4a.9.9 0 00.9.9h6.2a.9.9 0 00.9-.9V6.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>',
  perfil: '<circle cx="8" cy="5.6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M3 13.2c0-2.7 2.2-4.6 5-4.6s5 1.9 5 4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  impressora: '<rect x="4" y="1.8" width="8" height="3.4" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="2.3" y="5.2" width="11.4" height="5.6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="4.3" y="9.4" width="7.4" height="4.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><circle cx="11" cy="7.4" r=".6" fill="currentColor"></circle>',
  setaEsquerda: '<path d="M10 3.2L5 8l5 4.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>',
};
function iconeSvg(nome, tamanho) {
  const t = tamanho || 16;
  return `<svg viewBox="0 0 16 16" width="${t}" height="${t}">${PC_ICONES[nome] || ""}</svg>`;
}

function trocarModo(modo) {
  const wrapSim = document.getElementById("modoSimuladorWrap");
  const wrapColab = document.getElementById("modoColaborativoWrap");
  const btnSim = document.getElementById("btnModoSimulador");
  const btnColab = document.getElementById("btnModoColaborativo");
  const header = document.getElementById("siteHeader");
  const modeTabs = document.querySelector(".mode-tabs");
  if (modo === "colaborativo") {
    wrapSim.style.display = "none";
    wrapColab.style.display = "block";
    btnColab.classList.add("active");
    btnSim.classList.remove("active");
    // P-01 é a porta de entrada do site inteiro agora — nada do cabeçalho/
    // abas do Simulador antigo aparece por cima dela (ver conversa). O
    // Simulador continua existindo, só sem esse quadro em volta; a volta
    // pra ele fica num link discreto dentro da própria capa (renderLanding).
    header.style.display = "none";
    modeTabs.style.display = "none";
    if (!pcState.iniciado) {
      pcState.iniciado = true;
      initColaborativo();
    }
  } else {
    wrapSim.style.display = "";
    wrapColab.style.display = "none";
    btnSim.classList.add("active");
    btnColab.classList.remove("active");
    header.style.display = "";
    modeTabs.style.display = "";
  }
}

document.getElementById("btnModoSimulador").addEventListener("click", () => trocarModo("simulador"));
document.getElementById("btnModoColaborativo").addEventListener("click", () => trocarModo("colaborativo"));

// Link de Compartilhar (ver mostrarLinkCompartilhavel) — index.html?ver=<id>.
// Query string, não hash: sobrevive a preview de link (WhatsApp etc.), que
// costuma cortar fragmento depois de #. Quem abre esse link não precisa de
// conta nem login — passa direto pra tela de leitura, sem chamar
// initColaborativo()/checar sessão, igual o resto do fluxo faz.
const _paramsIniciais = new URLSearchParams(window.location.search);
const _perfilCompartilhado = _paramsIniciais.get("ver");

// O sistema inteiro começa pela P-01 (capa da Prospecção Coletiva) — não mais
// pelo Simulador individual. O Simulador antigo continua existindo e
// acessível pela aba, mas deixou de ser a tela padrão (ver conversa: ele vai
// virar outra função dentro do sistema, ainda não tratada).
if (_perfilCompartilhado) {
  document.getElementById("modoSimuladorWrap").style.display = "none";
  document.getElementById("modoColaborativoWrap").style.display = "block";
  document.getElementById("siteHeader").style.display = "none";
  document.querySelector(".mode-tabs").style.display = "none";
  pcState.iniciado = true;
  pcState.tela = "compartilhado";
  pcState.verPerfilId = _perfilCompartilhado;
  renderColaborativo();
} else {
  trocarModo("colaborativo");
}

async function initColaborativo() {
  if (!supabaseClient) {
    pcState.tela = "erro-conexao";
    renderColaborativo();
    return;
  }
  pcState.sessao = await sessaoAtual();
  if (pcState.sessao) {
    pcState.perfil = await meuPerfil();
    if (!pcState.perfil) {
      // Sessão existe mas ainda não tem linha em "perfis" — hoje só acontece
      // com quem acabou de entrar pelo Google (o Google não manda CPF nem
      // aceite de LGPD, então falta completar isso antes de liberar o app).
      pcState.tela = "completar-perfil";
      renderColaborativo();
      return;
    }
    const salvo = await carregarMeuPalpite(pcState.perfil.id);
    if (salvo && salvo.candidatos && salvo.candidatos.length) {
      pcState.palpiteEdicao = salvo.candidatos;
      normalizarPalpiteEdicao();
    }
    // primeira vez (sem nada salvo) começa na seleção; quem já preencheu
    // antes cai direto no painel principal.
    pcState.subaba = pcState.palpiteEdicao ? "painel" : "selecao";
    pcState.estado = "SC";
    await garantirRascunhosCarregados();
    pcState.tela = "app";
    renderColaborativo();
    return;
  }
  // Sem sessão: não pede login de cara — começa pela tela de abertura. Login
  // só é pedido mais adiante, quando a pessoa decide "prosseguir" (ver
  // renderPainelPrincipal, chamado como "painel-convidado" nesse fluxo).
  pcState.tela = "landing";
  renderColaborativo();
}

// Dados salvos antes desta versão podem não ter o campo `votosEditado`
// (distingue "a pessoa mexeu nesse número" de "ainda é o valor padrão de
// 2022") — sem isso o botão "Balancear vazios" da tela de seleção
// sobrescreveria votação que a pessoa já tinha ajustado à mão.
function normalizarPalpiteEdicao() {
  pcState.palpiteEdicao.forEach((p) => {
    p.candidatos.forEach((c) => { if (c.votosEditado === undefined) c.votosEditado = false; });
  });
}

// ===== Rascunho por cargo (autosave contínuo) =====
// Chave de rascunho no modo convidado (sem perfil) — window.storage tem o
// shim pra localStorage definido em index.html, funciona igual com ou sem
// claude.ai. Logado usa Supabase (rascunho_estadual/federal/senador em
// "palpites", nuvem/palpites.js + nuvem/migracao-6-rascunho-por-cargo.sql).
function _chaveRascunhoConvidado(uf, cargo) {
  return `pc-rascunho:${uf}:${cargo}`;
}

// Carrega o rascunho salvo dos 3 cargos pro estado atual e guarda em
// pcState.rascunhosCache — 1x por estado escolhido (ver os 2 únicos lugares
// que atribuem pcState.estado: initColaborativo e o picker de estado). O
// resto do app consulta esse cache de forma síncrona (renderCargoEstadual,
// garantirPalpitesPorCargo) em vez de cada um precisar virar async.
async function garantirRascunhosCarregados() {
  if (!pcState.estado || pcState.rascunhosCacheEstado === pcState.estado) return;
  const cache = {};
  if (pcState.perfil) {
    const dados = await carregarRascunhosPorCargo(pcState.perfil.id);
    CARGOS.forEach((c) => {
      const coluna = COLUNA_RASCUNHO_POR_CARGO[c.id];
      const lista = dados ? dados[coluna] : null;
      cache[c.id] = (lista && lista.length) ? lista : null;
    });
  } else {
    for (const c of CARGOS) {
      try {
        const r = await window.storage.get(_chaveRascunhoConvidado(pcState.estado, c.id));
        const lista = r && r.value ? JSON.parse(r.value) : null;
        cache[c.id] = (lista && lista.length) ? lista : null;
      } catch (e) { cache[c.id] = null; }
    }
  }
  pcState.rascunhosCache = cache;
  pcState.rascunhosCacheEstado = pcState.estado;
}

// Salva (com debounce — não dispara 1 request por tecla) o rascunho de um
// cargo, logado ou convidado. Chamado depois de toda edição relevante nas
// telas de Seleção e Revisão.
const _timersAutoSaveRascunho = {};
function agendarAutoSaveRascunho(cargo, lista) {
  if (!pcState.estado || !lista || !lista.length) return;
  clearTimeout(_timersAutoSaveRascunho[cargo]);
  _timersAutoSaveRascunho[cargo] = setTimeout(() => {
    if (pcState.perfil) {
      salvarRascunhoCargo(pcState.perfil.id, cargo, lista);
    } else {
      try { window.storage.set(_chaveRascunhoConvidado(pcState.estado, cargo), JSON.stringify(lista)); } catch (e) { /* localStorage indisponível, ignora */ }
    }
  }, 900);
}

// ===== Minhas listas (nomeadas, com id exclusivo, salvas OU depositadas) =====
// Diferente do rascunho acima (autosave silencioso, "onde eu parei"): isso
// aqui é o registro deliberado que a pessoa cria ao clicar "Salvar" na
// Revisão pela primeira vez — pede um nome, gera um id que nunca muda
// depois (mesmo id em salvamentos seguintes da mesma lista, ver
// executarSalvarLista). Guarda um ARRAY de listas por estado (não só uma):
// a pessoa vê todas em "Minhas listas" (renderMinhasListas), edita as em
// aberto e deposita (trava pra sempre) quando quiser. Hoje só persiste
// local (window.storage) — serve tanto convidado quanto logado; a
// sincronização com o Supabase (nuvem/salvamentos.js, listas_salvas) fica
// pra quando esse schema for reconferido.
function gerarIdLista() {
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "lista-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// Identifica de quem é o armazenamento local — perfil.id se logado, ou uma
// chave fixa de convidado. Sem isso, duas contas diferentes testadas no
// MESMO navegador (ex.: várias contas de teste) enxergavam as listas
// salvas umas das outras, porque a chave só levava o estado (SC) em conta.
// Achado com o usuário em 08/08/2026 testando contas de teste múltiplas.
function _idConta() {
  return pcState.perfil ? pcState.perfil.id : "convidado";
}

function _chaveListasSalvasLocal(uf) {
  return `simulador-legislativo-listas-salvas:${uf}:${_idConta()}`;
}

async function carregarListasSalvasLocais(uf) {
  if (!uf) return [];
  try {
    const r = await window.storage.get(_chaveListasSalvasLocal(uf));
    return r && r.value ? JSON.parse(r.value) : [];
  } catch (e) { return []; }
}

async function salvarListasSalvasLocais(uf, listas) {
  try { await window.storage.set(_chaveListasSalvasLocal(uf), JSON.stringify(listas)); } catch (e) { /* localStorage indisponível, ignora */ }
}

// Créditos de verdade: nuvem/creditos.js (obterSaldoCreditos/
// consumirCreditoConta), saldo mora no Supabase (creditos_conta, migração
// 9) — nunca local, nunca solto em "perfis" (ver comentário lá pro
// motivo de segurança). Só conta logada tem crédito; convidado é sempre
// redirecionado pro cadastro ao bater o limite (ver renderMinhasListas).

// Cria (1ª vez, pcState.listaSalvaId ainda null antes de executarSalvarLista
// gerar um) ou atualiza (salvamentos seguintes, mesmo id) a lista ATIVA
// dentro do array — nunca mexe nas outras listas da pessoa.
async function persistirListaSalvaLocal() {
  if (!pcState.estado || !pcState.listaSalvaId) return;
  const listas = await carregarListasSalvasLocais(pcState.estado);
  const idx = listas.findIndex((l) => l.id === pcState.listaSalvaId);
  const agora = new Date().toISOString();
  const registro = {
    id: pcState.listaSalvaId,
    nome: pcState.listaSalvaNome,
    criadoEm: idx >= 0 ? listas[idx].criadoEm : agora,
    atualizadoEm: agora,
    depositadoEm: idx >= 0 ? listas[idx].depositadoEm : null,
    anonimo: idx >= 0 ? !!listas[idx].anonimo : false,
    palpitesPorCargo: pcState.palpitesPorCargo,
  };
  if (idx >= 0) listas[idx] = registro; else listas.push(registro);
  await salvarListasSalvasLocais(pcState.estado, listas);
}

// Deposita (trava) uma lista já salva — ação separada e irreversível, só
// muda depositadoEm/anonimo, nunca os candidatos/votos da lista em si.
async function depositarListaLocal(uf, id, anonimo) {
  const listas = await carregarListasSalvasLocais(uf);
  const idx = listas.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  listas[idx] = { ...listas[idx], depositadoEm: new Date().toISOString(), anonimo: !!anonimo };
  await salvarListasSalvasLocais(uf, listas);
  return true;
}

// ===== Menu fixo (barra de atalhos embaixo, estilo do Painel) =====
// Substitui o botão "← Painel principal" ad-hoc que cada subaba tinha —
// combinado com o usuário em 08/08/2026 ("isso não deverá ser necessário
// se tivermos a barra de atalhos aérea"). Aparece em toda tela alcançada
// DEPOIS do Painel, exceto Seleção, Revisão e o próprio Painel (esses já
// têm os mesmos destinos embutidos ou pedem foco sem distração — mesma
// regra combinada pro filtro da Revisão não mudar mais nada da estrutura
// além do pedido). destinoAtivo null = mostra a barra sem destacar nada.
function renderMenuFixo(destinoAtivo) {
  const gateConvidado = !pcState.perfil;
  const itens = [
    { id: "painel", icone: "home", label: "Início" },
    { id: "minhas-listas", icone: "ballot", label: "Minhas listas" },
    { id: "medias", icone: "chart", label: "Médias", gate: gateConvidado },
    { id: "grupo", icone: "grupos", label: "Grupos", gate: gateConvidado },
    { id: "ranking", icone: "ranking", label: "Ranking", disabled: true },
  ];
  const botoes = itens.map((it) => {
    const ativo = it.id === destinoAtivo;
    const cor = it.disabled ? "#3f5a4e" : (ativo ? "var(--pc-accent)" : "var(--pc-ink-dim)");
    const titulo = it.disabled ? "Disponível depois do resultado oficial de 2026" : (it.gate ? "Precisa se cadastrar" : "");
    return `<button data-pc-menu-fixo="${it.id}" ${it.disabled ? "disabled" : ""} title="${titulo}" style="flex:1; background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 2px; color:${cor}; font-family:var(--sans); cursor:${it.disabled ? "default" : "pointer"}; position:relative;">
      ${ativo && !it.disabled ? `<span style="position:absolute; top:2px; left:50%; transform:translateX(9px); width:5px; height:5px; border-radius:50%; background:var(--pc-accent);"></span>` : ""}
      ${iconeSvg(it.icone, 20)}
      <span style="font-size:10px; font-weight:600;">${it.label}</span>
    </button>`;
  }).join("");
  return `<div style="position:fixed; left:0; right:0; bottom:0; z-index:40; display:flex; justify-content:center; background:#0c1c16; border-top:1px solid #1c2f26;">
    <div style="display:flex; width:100%; max-width:640px; padding:8px 4px calc(8px + env(safe-area-inset-bottom, 0px));">${botoes}</div>
  </div>`;
}

// Chamado no fim de todo render de tela (renderColaborativo direto pras
// telas "-convidado", renderAppColaborativo pras subabas) — mostra ou
// esconde a barra e ajusta o respiro embaixo do conteúdo pra ela não
// cobrir a última linha. destino null esconde a barra nessa tela.
function atualizarMenuFixo(destino) {
  const existente = document.getElementById("pcMenuFixoWrap");
  if (existente) existente.remove();
  const pcConteudo = document.getElementById("pcConteudo");
  if (!destino) {
    if (pcConteudo) pcConteudo.style.paddingBottom = "";
    return;
  }
  const wrap = document.getElementById("modoColaborativoWrap");
  if (!wrap) return;
  const div = document.createElement("div");
  div.id = "pcMenuFixoWrap";
  div.innerHTML = renderMenuFixo(destino);
  wrap.appendChild(div);
  if (pcConteudo) pcConteudo.style.paddingBottom = "76px";
  document.querySelectorAll("[data-pc-menu-fixo]:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => irParaDestinoMenuFixo(btn.getAttribute("data-pc-menu-fixo")));
  });
}

function irParaDestinoMenuFixo(destino) {
  const gateConvidado = !pcState.perfil;
  if (destino === "painel") {
    if (pcState.perfil) { pcState.subaba = "painel"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
    return;
  }
  if (destino === "minhas-listas") {
    if (pcState.perfil) { pcState.subaba = "minhas-listas"; renderAppColaborativo(); }
    else { pcState.tela = "minhas-listas-convidado"; renderColaborativo(); }
    return;
  }
  // Médias e Grupos pedem cadastro pro convidado (mesma regra do Painel) —
  // pendenteAcao já sabe levar direto pra lá depois de criar a conta.
  if (gateConvidado && (destino === "medias" || destino === "grupo")) {
    pcState.pendenteRegistro = true;
    pcState.pendenteAcao = destino;
    pcState.tela = "cadastro";
    renderColaborativo();
    return;
  }
  if (pcState.perfil) { pcState.subaba = destino; renderAppColaborativo(); }
}

function renderColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  if (pcState.tela === "erro-conexao") {
    el.innerHTML = `<div class="glass-card">
      <h2>Prospecção Coletiva</h2>
      <div class="pc-erro">Não consegui conectar ao backend compartilhado agora (o Simulador individual continua funcionando normalmente). Verifique sua conexão e recarregue a página.</div>
    </div>`;
    return;
  }
  if (pcState.tela === "carregando") {
    el.innerHTML = telaCarregando();
    return;
  }
  if (pcState.tela === "landing") return renderLanding();
  if (pcState.tela === "estado") return renderTelaEstado();
  if (pcState.tela === "selecao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderSelecaoCandidatos(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "revisao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderRevisaoDeposito(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "deposito-confirmado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderDepositoConfirmado(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "painel-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderPainelPrincipal(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "minhas-listas-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderMinhasListas(); atualizarMenuFixo("minhas-listas"); return; }
  if (pcState.tela === "detalhado-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderMeuPalpite(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "login") return renderTelaLogin();
  if (pcState.tela === "recuperar-senha") return renderTelaRecuperarSenha();
  if (pcState.tela === "nova-senha") return renderTelaNovaSenha();
  if (pcState.tela === "cadastro") return renderTelaCadastro();
  if (pcState.tela === "completar-perfil") return renderTelaCompletarPerfil();
  if (pcState.tela === "termos") return renderTelaLegal("termos");
  if (pcState.tela === "privacidade") return renderTelaLegal("privacidade");
  if (pcState.tela === "app") return renderAppColaborativo();
  if (pcState.tela === "compartilhado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderCompartilhado(); atualizarMenuFixo(null); return; }
}

// ---------- Abertura (sem login) ----------

function renderLanding() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:540px; margin:0 auto; min-height:70vh; display:flex; flex-direction:column; justify-content:center; text-align:center; padding:2.5rem 1.5rem;">
      <div style="font-size:28px; font-weight:800; line-height:1.15; letter-spacing:-.01em; color:var(--pc-ink); margin-bottom:20px;">Simulador Eleitoral — Legislativo 2026</div>
      <div style="width:64px; height:64px; margin:0 auto 18px; border-radius:50%; background:linear-gradient(135deg,#3dffb0,#0dbf7c); display:flex; align-items:center; justify-content:center;">
        <svg viewBox="0 0 16 16" style="width:28px; height:28px; color:#04140d;">
          <path d="M2 6.3L8 2.5l6 3.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M3.4 7.3v5M6.3 7.3v5M9.7 7.3v5M12.6 7.3v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>
          <path d="M2 13h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>
        </svg>
      </div>
      <h2 style="font-size:22px; margin-bottom:10px;">Pronto pra testar seu faro político?</h2>
      <div class="pc-sub" style="margin:0 auto; max-width:420px;">Monte, publique e compare a sua lista com seus amigos.</div>
      <button class="primary" id="pcBtnComecar" style="margin:90px auto 0; padding:16px 30px; font-size:16px; width:352px; max-width:100%; align-self:center; box-shadow:0 0 9px rgba(61,255,176,.5);">Começar</button>
      <div style="margin-top:14px;"><button class="ghost" id="pcBtnJaTenhoConta" style="font-size:12px; padding:6px 14px;">já tenho conta — entrar</button></div>

      <div style="margin-top:90px; padding:0 6px;">
        <div style="font-size:13.5px; font-weight:700; line-height:1.4; color:var(--pc-accent);">Desafie aquele seu amigo, vizinho ou familiar neste game criativo e dinâmico.</div>
      </div>
      <div style="margin-top:30px; font-size:10.5px; color:var(--pc-ink-dim); opacity:.7;">Este game não é aposta online ou mercado preditivo.</div>
      <div style="margin-top:10px;"><button class="ghost" id="pcBtnModoSimulador" style="font-size:9px; padding:2px 8px; opacity:.4; border:none; background:none;">modo simulador (antigo)</button></div>
    </div>`;
  document.getElementById("pcBtnComecar").addEventListener("click", () => {
    pcState.tela = "estado";
    renderColaborativo();
  });
  document.getElementById("pcBtnJaTenhoConta").addEventListener("click", () => {
    pcState.tela = "login";
    renderColaborativo();
  });
  document.getElementById("pcBtnModoSimulador").addEventListener("click", () => trocarModo("simulador"));
}

// Segunda tela do convite: escolher o estado antes de qualquer coisa. Só
// Santa Catarina tem candidatos carregados hoje (dados/estados-brasil.js) —
// os demais aparecem na lista, desabilitados, preparando a expansão futura.
function renderTelaEstado() {
  const el = document.getElementById("modoColaborativoWrap");
  const itens = ESTADOS_BRASIL.map((e) => `
    <div class="pc-picker-item${e.disponivel ? "" : " pc-picker-disabled"}" data-uf="${e.sigla}">${e.nome}</div>
  `).join("");

  el.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto; min-height:70vh; display:flex; flex-direction:column; justify-content:center;">
      <div style="font-size:11px; color:var(--pc-ink-dim); text-transform:uppercase; letter-spacing:.06em; text-align:center;">2 de 8</div>
      <h2 style="text-align:center; margin-bottom:4px;">Onde você vai palpitar?</h2>
      <div class="pc-sub" style="text-align:center; margin-bottom:6px;">Gire e solte no seu estado.</div>

      <div class="pc-picker" id="pcPicker">
        <div class="pc-picker-center-band"></div>
        <div class="pc-picker-pad"></div>
        ${itens}
        <div class="pc-picker-pad"></div>
      </div>

      <div style="border:1px solid var(--pc-accent); background:rgba(61,255,176,.06); border-radius:12px; padding:14px 16px; text-align:center; margin-top:14px;">
        <span id="pcEstadoConfirmNome" style="font-weight:700; color:var(--pc-accent);"></span>
        <div id="pcEstadoConfirmMsg" style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:4px;"></div>
      </div>
      <button class="primary" id="pcBtnConfirmarEstado" style="margin-top:14px; align-self:center;" disabled>Confirmar</button>
    </div>`;

  const picker = document.getElementById("pcPicker");
  const itensEls = picker.querySelectorAll(".pc-picker-item");
  let ufCentralizado = null;

  function atualizarPicker() {
    const centerY = picker.scrollTop + picker.clientHeight / 2;
    let maisProximo = null, menorDist = Infinity;
    itensEls.forEach((it) => {
      const itCenter = it.offsetTop + it.offsetHeight / 2;
      const dist = Math.abs(centerY - itCenter);
      const norm = Math.min(dist / 44, 1);
      it.style.opacity = String(1 - norm * 0.8);
      it.style.transform = `scale(${1 - norm * 0.3})`;
      if (dist < menorDist) { menorDist = dist; maisProximo = it; }
    });
    if (!maisProximo) return;
    ufCentralizado = maisProximo.dataset.uf;
    const estado = ESTADOS_BRASIL.find((e) => e.sigla === ufCentralizado);
    document.getElementById("pcEstadoConfirmNome").textContent = estado.nome;
    document.getElementById("pcEstadoConfirmMsg").textContent = estado.disponivel
      ? "Lista de candidatos pronta."
      : "Ainda sem candidatos carregados — em breve.";
    document.getElementById("pcBtnConfirmarEstado").disabled = !estado.disponivel;
  }
  picker.addEventListener("scroll", () => requestAnimationFrame(atualizarPicker));

  itensEls.forEach((it) => {
    if (it.classList.contains("pc-picker-disabled")) return;
    it.addEventListener("click", () => {
      picker.scrollTop = it.offsetTop + it.offsetHeight / 2 - picker.clientHeight / 2;
    });
  });

  const scItem = picker.querySelector('[data-uf="SC"]');
  picker.scrollTop = scItem.offsetTop + scItem.offsetHeight / 2 - picker.clientHeight / 2;
  atualizarPicker();

  document.getElementById("pcBtnConfirmarEstado").addEventListener("click", async () => {
    pcState.estado = ufCentralizado;
    await garantirRascunhosCarregados();
    if (!pcState.palpiteEdicao) pcState.palpiteEdicao = montarEstadoPalpite("assembleia", null, null, "estadual", pcState.estado);
    pcState.tela = "selecao-convidado";
    renderColaborativo();
  });
}

// Tela de leitura de um link de Compartilhar (?ver=<perfil_id>) — sem
// login, sem edição, só mostra os 3 cargos que aquela pessoa já preencheu
// (rascunho_estadual/federal/senador, ver nuvem/migracao-7-rascunhos-publicos.sql).
// Reaproveita classificarEleitosPorPartido/proximosSuplentes (mesma lógica
// de montarSecaoImpressaoCargo), só que renderizado pra tela em vez de PDF.
async function renderCompartilhado() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando();
  const dados = await buscarRascunhoPublicoDe(pcState.verPerfilId);
  if (!dados) {
    el.innerHTML = `<div class="glass-card" style="max-width:520px; margin:0 auto; text-align:center;">
      <h2>Link não encontrado</h2>
      <div class="pc-sub">Esse link não é válido, ou a pessoa apagou a própria lista.</div>
      <button class="primary" id="pcBtnCompartilhadoVoltar" style="margin-top:14px;">Montar minha própria lista</button>
    </div>`;
    document.getElementById("pcBtnCompartilhadoVoltar").addEventListener("click", () => { window.location.href = window.location.pathname; });
    return;
  }
  // Só SC tem dado carregado hoje (ver CLAUDE.md/PROJETO.md) — classificarEleitosPorPartido
  // precisa de pcState.estado pra achar vagasFixasCargo/candidatosEstadoCargo.
  pcState.estado = "SC";
  const linha = (c, i, rotulo) => `
    <div style="display:flex; align-items:baseline; gap:8px; padding:6px 0; border-bottom:1px solid #16241e; font-size:12.5px;">
      <span style="width:22px; color:var(--pc-ink-dim); flex-shrink:0;">${i + 1}º</span>
      <span style="flex:1; min-width:0;">${c.nome}<br><span style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}${rotulo ? ` · ${rotulo}` : ""}</span></span>
      <span style="flex-shrink:0; color:var(--pc-ink-dim);">${c.votos.toLocaleString("pt-BR")}</span>
    </div>`;
  const secaoCargo = (cargoDef) => {
    const lista = dados[`rascunho_${cargoDef.id}`];
    if (!lista || !lista.length) {
      return `<div class="glass-card" style="margin-bottom:12px;"><h2 style="margin-bottom:2px;">${cargoDef.label}</h2><div class="pc-sub">Ainda não preencheu esse cargo.</div></div>`;
    }
    const eleitos = classificarEleitosPorPartido(lista, cargoDef.id);
    const suplentes = proximosSuplentes(15, lista);
    return `<div class="glass-card" style="margin-bottom:12px;">
      <h2 style="margin-bottom:2px;">${cargoDef.label}</h2>
      <div class="pc-sub" style="margin-bottom:8px;">${eleitos.length} eleitos marcados${suplentes.length ? ` + ${suplentes.length} próximos da vaga` : ""}</div>
      ${eleitos.map((c, i) => linha(c, i)).join("") || '<div class="pc-sub">Nenhum candidato marcado ainda.</div>'}
      ${suplentes.map((c, i) => linha(c, eleitos.length + i, "próximo")).join("")}
    </div>`;
  };
  el.innerHTML = `
    <div class="glass-card" style="max-width:640px; margin:0 auto 12px;">
      <div style="font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:var(--pc-ink-dim); margin-bottom:4px;">Palpite compartilhado</div>
      <h2 style="margin-bottom:2px;">${dados.nome_exibicao}</h2>
      <div class="pc-sub">Prospecção Coletiva — Simulador Eleitoral — Legislativo 2026 — Santa Catarina</div>
    </div>
    <div style="max-width:640px; margin:0 auto;">
      ${CARGOS.map(secaoCargo).join("")}
      <div class="glass-card" style="text-align:center;">
        <div class="pc-sub" style="margin-bottom:10px;">Curioso? Monte sua própria lista.</div>
        <button class="primary" id="pcBtnCompartilhadoMontar">Começar minha lista</button>
      </div>
    </div>`;
  document.getElementById("pcBtnCompartilhadoMontar").addEventListener("click", () => { window.location.href = window.location.pathname; });
}

// ---------- Login / Cadastro ----------

// Volta pra onde fazia sentido antes de entrar em Login/Cadastro — pro
// Painel principal (convidado) se a pessoa já tem lista em andamento
// (veio de um gate tipo Grupos/Médias), senão pra abertura (primeira vez
// no site). Sem isso as duas telas eram becos sem saída — achado pelo
// usuário em 08/08/2026 depois de clicar num item travado do Lobby.
function voltarDeLoginOuCadastro() {
  pcState.erro = "";
  if (pcState.estado) { pcState.tela = "painel-convidado"; } else { pcState.tela = "landing"; }
  renderColaborativo();
}

// ---------- Termos de Uso / Política de Privacidade ----------

// Conteúdo revisado com o usuário em 08/08/2026: sem nome pessoal nem
// e-mail dele no texto, só o nome fantasia "Simulador Eleitoral
// Legislativo, por meio de seus representantes legais".
//
// E-mail de contato dedicado (não é mais o pessoal do usuário) criado por
// ele em 09/08/2026 — resolve o placeholder temporário que existia antes.
const PC_EMAIL_CONTATO_LEGAL = "simulalegis@gmail.com";

const PC_TEXTO_TERMOS = [
  { t: "1. O que é este site", c: `O Simulador Eleitoral — Legislativo 2026 é uma ferramenta para simular e
    projetar resultados do processo eleitoral legislativo de 2026 — Deputado
    Estadual, Deputado Federal e Senador —, começando por Santa Catarina, com
    base em dados públicos oficiais de eleições anteriores e nas atas de
    convenção partidária divulgadas pelo TSE. O plano é expandir gradualmente
    esse mesmo modelo pros demais estados do país.<br><br>
    <b>Este site é independente e não tem nenhum vínculo institucional com
    nenhum órgão do poder legislativo, com o TSE, com nenhum tribunal
    eleitoral regional, partido político ou candidato.</b> As projeções aqui
    geradas são simulações feitas por você e por outros usuários — não são
    pesquisa eleitoral registrada, não têm validade oficial e não
    representam a opinião nem o resultado real da eleição.<br><br>
    Este site também é um <b>game no estilo arcade</b> — pontuação, ranking e
    disputa amistosa entre você e seus grupos — e não envolve apostas nem
    jogo de azar nos termos da lei: não há cobrança para participar da
    disputa em si, nem qualquer prêmio em dinheiro atrelado ao resultado do
    seu palpite.<br><br>
    Mantido por Simulador Eleitoral Legislativo, por meio de seus representantes legais.` },
  { t: "2. Cadastro e conta", c: `Pra usar as funções que exigem conta (salvar listas, participar de grupos,
    aparecer no ranking), você precisa se cadastrar com nome, e-mail, senha e
    CPF. O CPF é usado só pra evitar que a mesma pessoa crie várias contas e
    distorça o ranking/estatísticas — ele nunca é armazenado em texto puro (ver
    a Política de Privacidade). Você é responsável por manter sua senha em
    sigilo e por tudo que acontecer usando sua conta.` },
  { t: "3. Uso permitido", c: `Você pode usar o site pra montar suas próprias projeções, participar de
    grupos, comparar palpites e acompanhar o quadro de médias públicas. Não é
    permitido: tentar acessar dados de outras contas, automatizar cadastros em
    massa, usar o site pra divulgar conteúdo que não seja sobre a própria
    simulação, ou tentar burlar as regras de limite (créditos, uma lista
    oficial por vez, etc.).` },
  { t: "4. Créditos", c: `O site usa um sistema de créditos pra liberar listas e grupos extras além
    do primeiro gratuito. Hoje esse sistema ainda não processa pagamento real —
    créditos são concedidos manualmente enquanto essa parte não estiver pronta.
    Quando existir cobrança de verdade, este documento será atualizado antes
    disso entrar no ar, com as condições de preço, reembolso e forma de
    pagamento.` },
  { t: "5. Isenção de responsabilidade", c: `As projeções são estimativas baseadas em dados históricos e nos palpites
    dos usuários — não constituem previsão eleitoral, aconselhamento político
    nem qualquer garantia de resultado. O site é oferecido "como está", sem
    garantia de disponibilidade contínua. Erros de dados podem acontecer (ex.
    atas de convenção ainda não processadas); se você encontrar um, pode
    reportar pelo próprio site.` },
  { t: "6. Alterações", c: `Estes termos podem ser atualizados conforme o site evolui. Mudanças
    relevantes serão avisadas na tela. O uso continuado do site depois de uma
    atualização vale como concordância com a nova versão.` },
  { t: "7. Contato", c: `Dúvidas sobre estes termos: <b>${PC_EMAIL_CONTATO_LEGAL}</b>` },
];

const PC_TEXTO_PRIVACIDADE = [
  { t: null, c: `Esta política explica quais dados pessoais o Simulador Eleitoral —
    Legislativo 2026 coleta, por quê, e quais direitos você tem sobre eles,
    conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).` },
  { t: "1. Quem trata os seus dados", c: `Simulador Eleitoral Legislativo, por meio de seus representantes legais,
    responsável pelo tratamento dos dados coletados através deste site.
    Contato pra qualquer assunto de privacidade: <b>${PC_EMAIL_CONTATO_LEGAL}</b>` },
  { t: "2. Quais dados coletamos", c: `<ul style="margin:0; padding-left:18px;">
    <li><b>Pra criar sua conta:</b> nome, e-mail, senha e CPF.</li>
    <li><b>CPF:</b> usado só pra impedir cadastro duplicado da mesma pessoa. Nunca é
      guardado em texto puro — passa por um processo de hash (transformação
      irreversível) antes de ser salvo, então nem nós conseguimos "ver" o
      número original a partir do que fica armazenado.</li>
    <li><b>Senha:</b> também nunca é guardada em texto puro — fica a cargo do
      provedor de autenticação (Supabase Auth), que usa hash e criptografia
      padrão de mercado.</li>
    <li><b>Dados de uso do produto:</b> as listas de candidatos que você monta e
      salva, os grupos que você cria ou participa, se prefere aparecer com
      nome ou anônimo nas cédulas depositadas, e o histórico de créditos da
      sua conta.</li>
    <li><b>Dados técnicos automáticos:</b> informações padrão de navegação
      (necessárias pro site funcionar) via nosso provedor de hospedagem
      (GitHub Pages) e banco de dados (Supabase) — não coletamos dados de
      localização, câmera, microfone ou contatos.</li>
    </ul><br>Não coletamos dados sensíveis (saúde, biometria, origem racial, opinião
    religiosa) e não pedimos nenhuma informação além do necessário pra fazer o
    site funcionar.` },
  { t: "3. Por que coletamos (base legal)", c: `<ul style="margin:0; padding-left:18px;">
    <li><b>Execução de contrato:</b> nome, e-mail, senha e CPF são necessários pra
      criar e manter sua conta — sem eles o serviço de cadastro não funciona.</li>
    <li><b>Consentimento:</b> você marca explicitamente, no cadastro, que concorda
      com o uso dos seus dados nos termos desta política.</li>
    <li><b>Legítimo interesse:</b> dados de uso (listas, grupos, créditos) são
      necessários pro funcionamento das próprias funcionalidades que você
      escolhe usar (salvar uma lista, entrar num grupo).</li>
    </ul>` },
  { t: "4. Com quem compartilhamos", c: `Não vendemos nem compartilhamos seus dados com terceiros pra fins de
    marketing ou publicidade. Seus dados ficam armazenados na infraestrutura
    dos nossos provedores técnicos — <b>Supabase</b> (banco de dados e
    autenticação) e <b>GitHub Pages</b> (hospedagem do site) — que atuam só como
    operadores técnicos, seguindo nossas instruções, não como donos dos dados.<br><br>
    Se você optar por depositar uma lista de forma pública (não anônima), seu
    nome e a lista de candidatos ficam visíveis pra outros usuários no Quadro
    de Médias — essa é uma escolha sua, feita no momento do depósito, e pode
    ser trocada pra anônima em depósitos futuros.` },
  { t: "5. Por quanto tempo guardamos", c: `Enquanto sua conta existir. Se você pedir a exclusão da conta, apagamos
    seus dados pessoais (nome, e-mail, CPF em hash) — listas já depositadas de
    forma pública podem ser mantidas de forma desvinculada da sua identidade
    (anonimizadas), já que fazem parte do histórico agregado de outras
    pessoas que usaram o Quadro de Médias.` },
  { t: "6. Seus direitos", c: `Conforme o artigo 18 da LGPD, você pode a qualquer momento pedir:
    <ul style="margin:8px 0; padding-left:18px;">
    <li>Confirmação de que tratamos seus dados, e acesso a eles.</li>
    <li>Correção de dados incompletos ou desatualizados.</li>
    <li>Exclusão dos seus dados pessoais.</li>
    <li>Portabilidade dos seus dados pra outro serviço.</li>
    <li>Revogação do consentimento dado no cadastro.</li>
    </ul>
    Pra exercer qualquer um desses direitos, escreva pra
    <b>${PC_EMAIL_CONTATO_LEGAL}</b>. Vamos responder o quanto antes.` },
  { t: "7. Segurança", c: `Usamos práticas técnicas pra proteger seus dados: senhas e CPF nunca
    ficam em texto puro, o banco de dados usa controle de acesso por linha
    (cada pessoa só edita o que é dela) e toda comunicação com o site é
    criptografada (HTTPS). Nenhum sistema é 100% infalível, mas trabalhamos
    continuamente pra manter essas proteções em dia — inclusive corrigindo
    falhas assim que identificadas.` },
  { t: "8. Menores de idade", c: `Este site é voltado a eleitores(as) — pessoas com 16 anos ou mais (idade
    mínima pra votar no Brasil). Não coletamos intencionalmente dados de
    crianças.` },
  { t: "9. Cookies e armazenamento local", c: `O site usa armazenamento local do navegador (localStorage) pra guardar
    preferências e, no caso de visitantes sem conta, rascunhos temporários de
    listas — isso fica só no seu próprio dispositivo, não é enviado pra
    nenhum servidor. Não usamos cookies de rastreamento de terceiros nem
    publicidade.` },
  { t: "10. Alterações nesta política", c: `Podemos atualizar esta política conforme o site evolui. Mudanças
    relevantes serão avisadas na tela antes de valerem.` },
];

// tipo: "termos" | "privacidade". Chegável hoje só pelo link no Cadastro
// (pcState.telaLegalOrigem guarda onde a pessoa estava pra "← Voltar"
// devolver pro lugar certo, hoje sempre "cadastro").
function renderTelaLegal(tipo) {
  const el = document.getElementById("modoColaborativoWrap");
  const titulo = tipo === "termos" ? "Termos de uso" : "Política de privacidade";
  const secoes = tipo === "termos" ? PC_TEXTO_TERMOS : PC_TEXTO_PRIVACIDADE;
  el.innerHTML = `
    <div class="glass-card" style="max-width:520px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarLegal" style="margin-bottom:14px;">← Voltar</button>
      <h2>${titulo}</h2>
      <div class="pc-sub" style="margin-bottom:18px;">Última atualização: 08/08/2026</div>
      ${secoes.map((s) => `
        <div style="margin-bottom:18px;">
          ${s.t ? `<div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); margin-bottom:6px;">${s.t}</div>` : ""}
          <div style="font-size:12.5px; line-height:1.65; color:var(--pc-ink-dim);">${s.c}</div>
        </div>`).join("")}
    </div>`;
  document.getElementById("pcBtnVoltarLegal").addEventListener("click", () => {
    pcState.tela = pcState.telaLegalOrigem || "cadastro";
    renderColaborativo();
  });
}

function renderTelaLogin() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarLogin" style="margin-bottom:14px;">← Voltar</button>
      <h2>Entrar no Simulador Eleitoral — Legislativo 2026</h2>
      <div class="pc-sub">Previsões compartilhadas de votação para Deputado Estadual, Deputado Federal e Senador.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcLoginEmail" type="email"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcLoginSenha" type="password"></div>
      <div style="text-align:right; margin-top:-8px;"><a href="#" id="pcLinkEsqueciSenha" style="color:var(--pc-accent); font-size:12px; text-decoration:underline;">Esqueci minha senha</a></div>
      <div class="pc-erro" id="pcLoginErro">${pcState.erro || ""}</div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnEntrar">Entrar</button>
        <button class="ghost" id="pcBtnIrCadastro">Criar conta</button>
      </div>
      <div style="display:flex; align-items:center; gap:10px; margin:16px 0; color:var(--pc-ink-dim); font-size:12px;">
        <div style="flex:1; height:1px; background:var(--pc-ink-dim); opacity:.3;"></div>ou<div style="flex:1; height:1px; background:var(--pc-ink-dim); opacity:.3;"></div>
      </div>
      <button class="ghost" id="pcBtnEntrarGoogle" style="width:100%;">Entrar com Google</button>
    </div>`;

  document.getElementById("pcBtnVoltarLogin").addEventListener("click", voltarDeLoginOuCadastro);
  document.getElementById("pcBtnIrCadastro").addEventListener("click", () => {
    pcState.erro = "";
    pcState.tela = "cadastro";
    renderColaborativo();
  });
  document.getElementById("pcLinkEsqueciSenha").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.erro = "";
    pcState.tela = "recuperar-senha";
    renderColaborativo();
  });
  document.getElementById("pcBtnEntrarGoogle").addEventListener("click", async () => {
    const { error } = await entrarComGoogle();
    if (error) { pcState.erro = "Não consegui abrir o login do Google: " + error.message; renderTelaLogin(); }
  });

  document.getElementById("pcBtnEntrar").addEventListener("click", async () => {
    const email = document.getElementById("pcLoginEmail").value.trim();
    const senha = document.getElementById("pcLoginSenha").value;
    if (!email || !senha) {
      pcState.erro = "Preencha e-mail e senha.";
      renderTelaLogin();
      return;
    }
    const { error } = await entrar({ email, senha });
    if (error) {
      pcState.erro = "Não consegui entrar: " + error.message;
      renderTelaLogin();
      return;
    }
    pcState.erro = "";
    await initColaborativo();
  });
}

function renderTelaRecuperarSenha() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarRecuperar" style="margin-bottom:14px;">← Voltar</button>
      <h2>Esqueci minha senha</h2>
      <div class="pc-sub">Digite o e-mail da sua conta — mandamos um link pra você definir uma senha nova.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcRecuperarEmail" type="email"></div>
      <div class="pc-erro" id="pcRecuperarErro"></div>
      <div class="pc-status" id="pcRecuperarStatus"></div>
      <button class="primary" id="pcBtnEnviarRecuperacao" style="margin-top:6px;">Enviar link</button>
    </div>`;
  document.getElementById("pcBtnVoltarRecuperar").addEventListener("click", () => {
    pcState.tela = "login";
    renderColaborativo();
  });
  document.getElementById("pcBtnEnviarRecuperacao").addEventListener("click", async (e) => {
    const email = document.getElementById("pcRecuperarEmail").value.trim();
    if (!email) { document.getElementById("pcRecuperarErro").textContent = "Digite seu e-mail."; return; }
    e.target.disabled = true;
    const { error } = await solicitarRecuperacaoSenha(email);
    e.target.disabled = false;
    if (error) { document.getElementById("pcRecuperarErro").textContent = "Não consegui enviar: " + error.message; return; }
    document.getElementById("pcRecuperarErro").textContent = "";
    document.getElementById("pcRecuperarStatus").textContent = "Se esse e-mail tiver uma conta, o link de recuperação já foi enviado. Confira sua caixa de entrada (e o spam).";
    e.target.style.display = "none";
  });
}

function renderTelaNovaSenha() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <h2>Defina uma nova senha</h2>
      <div class="pc-sub">Você clicou no link de recuperação — escolha sua nova senha abaixo.</div>
      <div class="field-row"><label>Nova senha</label><input class="cell" id="pcNovaSenhaInput" type="password"></div>
      <div class="pc-erro" id="pcNovaSenhaErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnConfirmarNovaSenha" style="margin-top:6px;">Salvar nova senha</button>
    </div>`;
  document.getElementById("pcBtnConfirmarNovaSenha").addEventListener("click", async (e) => {
    const novaSenha = document.getElementById("pcNovaSenhaInput").value;
    if (!novaSenha || novaSenha.length < 6) {
      document.getElementById("pcNovaSenhaErro").textContent = "A senha precisa ter pelo menos 6 caracteres.";
      return;
    }
    e.target.disabled = true;
    const { error } = await redefinirSenha(novaSenha);
    e.target.disabled = false;
    if (error) { document.getElementById("pcNovaSenhaErro").textContent = "Não consegui salvar: " + error.message; return; }
    pcState.erro = "";
    await initColaborativo();
  });
}

// Resolve CEP → município/UF via ViaCEP (serviço público, sem chave). Não
// pedimos município por texto livre nem numa lista pra digitar: o CEP é
// mais rápido pra pessoa preencher e devolve o nome do município já
// padronizado, o que importa pros painéis/pesquisas que vão agregar por
// cidade (pedido do usuário, 11/08/2026).
async function buscarCep(cep) {
  const limpo = String(cep || "").replace(/\D/g, "");
  if (limpo.length !== 8) return { error: "CEP inválido. Confira os números digitados." };
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const dados = await resp.json();
    if (dados.erro) return { error: "CEP não encontrado. Confira o número." };
    return { municipio: dados.localidade, uf: dados.uf };
  } catch (e) {
    return { error: "Não consegui consultar esse CEP agora. Confira sua internet e tente de novo." };
  }
}

// Última etapa de quem entrou pelo Google: já existe sessão (nome/e-mail
// vieram do Google), só falta CPF (anti-duplicidade) e o aceite da LGPD, que
// o Google não fornece. Chamada por initColaborativo quando há sessão sem
// perfil ainda.
function renderTelaCompletarPerfil() {
  const nomeGoogle = (pcState.sessao && pcState.sessao.user.user_metadata
    && (pcState.sessao.user.user_metadata.full_name || pcState.sessao.user.user_metadata.name)) || "";
  // Essa tela também é usada pelo raro caso de sessão criada por e-mail/senha
  // cujo insert em "perfis" falhou antes de terminar o cadastro (ex.: erro
  // de rede) — nesse caso não veio do Google, então o texto não pode afirmar
  // isso.
  const veioDoGoogle = pcState.sessao && pcState.sessao.user.app_metadata
    && pcState.sessao.user.app_metadata.provider === "google";
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <h2>Só mais um passo</h2>
      <div class="pc-sub">${veioDoGoogle ? "Sua conta Google já está conectada — falta só isto pra liberar o Simulador." : "Falta só isto pra liberar o Simulador."}</div>
      <div class="field-row"><label>Nome</label><input class="cell" id="pcCompNome" value="${nomeGoogle}"></div>
      <div class="field-row">
        <label>CPF</label>
        <input class="cell" id="pcCompCpf" inputmode="numeric" placeholder="Só números" maxlength="14">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CPF só pra impedir que a mesma pessoa crie mais de uma conta (protege o ranking) — guardamos um código derivado dele, nunca o CPF em texto puro.</div>
      <div class="field-row"><label>Telefone</label><input class="cell" id="pcCompTelefone" inputmode="tel" placeholder="(00) 00000-0000"></div>
      <div class="field-row">
        <label>CEP</label>
        <input class="cell" id="pcCompCep" inputmode="numeric" placeholder="00000-000" maxlength="9">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CEP só pra saber seu município — ajuda a gente a entender melhor quem está usando o Simulador.</div>
      <div class="field-row">
        <label>Gênero</label>
        <select class="cell" id="pcCompGenero">
          <option value="">Selecione</option>
          <option value="Masculino">Masculino</option>
          <option value="Feminino">Feminino</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCompLgpd" style="margin-top:2px;">
        <span>Li e concordo com o uso dos meus dados (nome, e-mail, telefone, CPF, CEP/município e gênero) para criar minha conta, conforme a
          <a href="#" id="pcLinkPrivacidadeComp" style="color:var(--pc-accent); text-decoration:underline;">Política de Privacidade</a>
          e os
          <a href="#" id="pcLinkTermosComp" style="color:var(--pc-accent); text-decoration:underline;">Termos de Uso</a>.
          Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCompErro">${pcState.erro || ""}</div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnConcluirPerfil">Concluir cadastro</button>
        <button class="ghost" id="pcBtnCancelarPerfil">Cancelar</button>
      </div>
    </div>`;

  document.getElementById("pcLinkPrivacidadeComp").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "completar-perfil";
    pcState.tela = "privacidade";
    renderColaborativo();
  });
  document.getElementById("pcLinkTermosComp").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "completar-perfil";
    pcState.tela = "termos";
    renderColaborativo();
  });
  document.getElementById("pcBtnCancelarPerfil").addEventListener("click", async () => {
    await sair();
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "landing", subaba: "selecao", estado: null, vagasPorPartido: null, ultimoEditadoPartido: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, modoPartido: {}, erro: "", status: "" };
    renderColaborativo();
  });
  document.getElementById("pcBtnConcluirPerfil").addEventListener("click", async (e) => {
    const nome = document.getElementById("pcCompNome").value.trim();
    const cpf = document.getElementById("pcCompCpf").value.trim();
    const telefone = document.getElementById("pcCompTelefone").value.trim();
    const cep = document.getElementById("pcCompCep").value.trim();
    const genero = document.getElementById("pcCompGenero").value;
    const lgpdAceito = document.getElementById("pcCompLgpd").checked;
    if (!nome || !cpf || !cep || !genero) {
      pcState.erro = "Preencha nome, CPF, CEP e gênero.";
      renderTelaCompletarPerfil();
      return;
    }
    if (!lgpdAceito) {
      pcState.erro = "Marque a concordância com o uso dos dados pra continuar.";
      renderTelaCompletarPerfil();
      return;
    }
    e.target.disabled = true;
    const cepResolvido = await buscarCep(cep);
    if (cepResolvido.error) {
      e.target.disabled = false;
      pcState.erro = cepResolvido.error;
      renderTelaCompletarPerfil();
      return;
    }
    const { error } = await completarPerfilGoogle({
      nome, cpf, telefone, lgpdAceito, genero,
      cep: cep.replace(/\D/g, ""), municipioResidencia: cepResolvido.municipio, ufResidencia: cepResolvido.uf,
    });
    if (error) {
      e.target.disabled = false;
      pcState.erro = "Não consegui concluir: " + error.message;
      renderTelaCompletarPerfil();
      return;
    }
    pcState.erro = "";
    await initColaborativo();
  });
}

function renderTelaCadastro() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarCadastro" style="margin-bottom:14px;">← Voltar</button>
      <h2>Criar conta</h2>
      <button class="ghost" id="pcBtnCadastrarGoogle" style="width:100%;">Cadastrar com Google</button>
      <div style="display:flex; align-items:center; gap:10px; margin:16px 0; color:var(--pc-ink-dim); font-size:12px;">
        <div style="flex:1; height:1px; background:var(--pc-ink-dim); opacity:.3;"></div>ou<div style="flex:1; height:1px; background:var(--pc-ink-dim); opacity:.3;"></div>
      </div>
      <div class="field-row"><label>Nome</label><input class="cell" id="pcCadNome"></div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Você pode divulgar seu palpite de forma anônima — essa escolha é feita depois, na hora de depositar cada cédula, não aqui.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcCadEmail" type="email"></div>
      <div class="field-row"><label>Telefone</label><input class="cell" id="pcCadTelefone" inputmode="tel" placeholder="(00) 00000-0000"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcCadSenha" type="password"></div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Pelo menos 8 caracteres, com letra, número e caractere especial.</div>
      <div class="field-row">
        <label>CPF</label>
        <input class="cell" id="pcCadCpf" inputmode="numeric" placeholder="Só números" maxlength="14">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CPF só pra impedir que a mesma pessoa crie mais de uma conta (protege o ranking) — guardamos um código derivado dele, nunca o CPF em texto puro.</div>
      <div class="field-row">
        <label>CEP</label>
        <input class="cell" id="pcCadCep" inputmode="numeric" placeholder="00000-000" maxlength="9">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CEP só pra saber seu município — ajuda a gente a entender melhor quem está usando o Simulador.</div>
      <div class="field-row">
        <label>Gênero</label>
        <select class="cell" id="pcCadGenero">
          <option value="">Selecione</option>
          <option value="Masculino">Masculino</option>
          <option value="Feminino">Feminino</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCadLgpd" style="margin-top:2px;">
        <span>Li e concordo com o uso dos meus dados (nome, e-mail, telefone, CPF, CEP/município e gênero) para criar minha conta, conforme a
          <a href="#" id="pcLinkPrivacidade" style="color:var(--pc-accent); text-decoration:underline;">Política de Privacidade</a>
          e os
          <a href="#" id="pcLinkTermos" style="color:var(--pc-accent); text-decoration:underline;">Termos de Uso</a>.
          Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCadErro">${pcState.erro || ""}</div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnCadastrar">Criar conta</button>
        <button class="ghost" id="pcBtnIrLogin">Já tenho conta</button>
      </div>
    </div>`;

  document.getElementById("pcBtnVoltarCadastro").addEventListener("click", voltarDeLoginOuCadastro);
  document.getElementById("pcBtnIrLogin").addEventListener("click", () => {
    pcState.erro = "";
    pcState.tela = "login";
    renderColaborativo();
  });
  document.getElementById("pcBtnCadastrarGoogle").addEventListener("click", async () => {
    const { error } = await entrarComGoogle();
    if (error) { pcState.erro = "Não consegui abrir o cadastro com Google: " + error.message; renderTelaCadastro(); }
  });
  document.getElementById("pcLinkPrivacidade").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "cadastro";
    pcState.tela = "privacidade";
    renderColaborativo();
  });
  document.getElementById("pcLinkTermos").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "cadastro";
    pcState.tela = "termos";
    renderColaborativo();
  });

  document.getElementById("pcBtnCadastrar").addEventListener("click", async (e) => {
    const nome = document.getElementById("pcCadNome").value.trim();
    const email = document.getElementById("pcCadEmail").value.trim();
    const telefone = document.getElementById("pcCadTelefone").value.trim();
    const senha = document.getElementById("pcCadSenha").value;
    const cpf = document.getElementById("pcCadCpf").value.trim();
    const cep = document.getElementById("pcCadCep").value.trim();
    const genero = document.getElementById("pcCadGenero").value;
    const lgpdAceito = document.getElementById("pcCadLgpd").checked;

    if (!nome || !email || !senha || !cpf || !cep || !genero) {
      pcState.erro = "Preencha nome, e-mail, senha, CPF, CEP e gênero.";
      renderTelaCadastro();
      return;
    }
    if (!lgpdAceito) {
      pcState.erro = "Marque a concordância com o uso dos dados pra continuar.";
      renderTelaCadastro();
      return;
    }
    e.target.disabled = true;
    const cepResolvido = await buscarCep(cep);
    if (cepResolvido.error) {
      e.target.disabled = false;
      pcState.erro = cepResolvido.error;
      renderTelaCadastro();
      return;
    }
    const { error, data } = await cadastrar({
      nome, email, senha, telefone, modoPreenchimento: "detalhado", cpf, lgpdAceito, genero,
      cep: cep.replace(/\D/g, ""), municipioResidencia: cepResolvido.municipio, ufResidencia: cepResolvido.uf,
    });
    if (error) {
      e.target.disabled = false;
      pcState.erro = "Não consegui criar sua conta: " + error.message;
      renderTelaCadastro();
      return;
    }
    pcState.erro = "";
    // veio do fluxo de convidado (seleção de candidatos preenchida sem
    // login) — salva o que já foi montado direto no perfil recém-criado, em
    // vez de começar do zero.
    if (pcState.pendenteRegistro && data && data.user) {
      if (pcState.palpiteEdicao) await salvarPalpiteCompleto(data.user.id, pcState.palpiteEdicao);
      pcState.pendenteRegistro = false;
    }
    // Veio do botão "Compartilhar"/"Criar grupos" sem conta ainda — depois
    // do cadastro, cai direto na tela certa em vez do painel genérico.
    const acaoPendente = pcState.pendenteAcao;
    pcState.pendenteAcao = null;
    await initColaborativo();
    if (acaoPendente === "compartilhar") { pcState.subaba = "painel"; renderAppColaborativo(); }
    else if (acaoPendente === "grupo") { pcState.subaba = "grupo"; renderAppColaborativo(); }
    else if (acaoPendente === "medias") { pcState.subaba = "medias"; renderAppColaborativo(); }
  });
}

// ---------- App (logado) ----------

function renderAppColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <div><h2 style="margin:0;">Olá, ${pcState.perfil ? pcState.perfil.nome : "visitante"}</h2>
      <div class="pc-sub" style="margin:4px 0 0;">${pcState.perfil && pcState.perfil.escopo === "partido" ? `Prevendo: ${pcState.perfil.partido_escopo}` : "Prevendo: chapa completa"}</div></div>
      ${pcState.perfil ? `<button class="ghost" id="pcBtnSair">Sair</button>` : ""}
    </div>
    <div id="pcConteudo"></div>
  `;
  if (pcState.perfil) {
    document.getElementById("pcBtnSair").addEventListener("click", async () => {
      await sair();
      pcState = { iniciado: true, sessao: null, perfil: null, tela: "login", subaba: "selecao", estado: null, vagasPorPartido: null, ultimoEditadoPartido: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, modoPartido: {}, erro: "", status: "" };
      renderColaborativo();
    });
  }

  // Destino ativo do menu fixo por subaba — null pras telas que não mostram
  // a barra (Seleção, Revisão, o próprio Painel, e a tela antiga "palpite",
  // órfã desde que "Preencher votação completa" virou "Minhas listas").
  if (pcState.subaba === "selecao") { renderSelecaoCandidatos(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "revisao") { renderRevisaoDeposito(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "deposito-confirmado") { renderDepositoConfirmado(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "painel") { renderPainelPrincipal(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "minhas-listas") { renderMinhasListas(); atualizarMenuFixo("minhas-listas"); }
  else if (pcState.subaba === "palpite") { renderMeuPalpite(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "medias") { renderQuadroMedias(); atualizarMenuFixo("medias"); }
  else if (pcState.subaba === "grupo") { renderGrupoHub(); atualizarMenuFixo("grupo"); }
  else { renderRankingPlaceholder(); atualizarMenuFixo("ranking"); }
}

// Primeiro domingo de outubro de 2026 (calendário eleitoral — 1º turno das
// eleições gerais). Só usado pro contador de dias do Lobby.
const DATA_ELEICAO_2026 = new Date("2026-10-04T00:00:00-03:00");

function diasAteEleicao() {
  return Math.max(0, Math.ceil((DATA_ELEICAO_2026 - new Date()) / 86400000));
}

// Painel principal ("Lobby") — padrão flat 2D confirmado com o usuário em
// 04/08/2026 depois de várias rodadas de protótipo (ver ferramenta de
// visualização da conversa): profundidade só por camada de tom (nunca
// blur/glow/gradiente), sobretons de verde, sem barra inferior de atalhos
// (ela já mostraria os mesmos destinos do menu daqui, duplicado).
async function renderPainelPrincipal() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando seu painel…");

  await garantirRascunhosCarregados();
  // Convidado (sem cadastro) não tem perfil_id pra carregar grupos —
  // pcState.meusGrupos fica null, o resto da função já trata isso como
  // "sem grupo" (ver atividadeAmigo abaixo).
  if (pcState.perfil) await garantirMeusGruposCarregados();

  // Status "geral" soma os 3 cargos (Estadual+Federal+Senador) — diferente
  // do resto do app, que sempre trabalha 1 cargo ativo por vez.
  let totalMarcado = 0, totalVagas = 0;
  CARGOS.forEach((c) => {
    const lista = pcState.rascunhosCache[c.id] || montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
    totalMarcado += lista.reduce((s, p) => s + p.candidatos.filter((cc) => cc.marcadoEleito).length, 0);
    totalVagas += vagasFixasCargo(pcState.estado, c.id);
  });
  const completa = totalVagas > 0 && totalMarcado >= totalVagas;
  const fracaoPreenchida = totalVagas ? Math.min(1, totalMarcado / totalVagas) : 0;
  // 3 tons de verde repartindo a barra pelo PESO de cada cargo no total de
  // vagas (não por quanto já foi preenchido em cada um) — é só pra mostrar
  // visualmente "isto soma os 3 cargos", ver conversa com o usuário.
  const pesoEstadual = totalVagas ? vagasFixasCargo(pcState.estado, "estadual") / totalVagas : 0;
  const pesoFederal = totalVagas ? vagasFixasCargo(pcState.estado, "federal") / totalVagas : 0;
  const pesoSenador = totalVagas ? 1 - pesoEstadual - pesoFederal : 0;

  // Atividade de amigos: melhor esforço, olha só o primeiro grupo da pessoa
  // (se tiver) — quem atualizou a lista por último, excluindo ela mesma.
  // Convidado nunca tem grupo carregado (ver guarda acima), então isso já
  // fica null pra ele sem precisar de checagem extra.
  let atividadeAmigo = null;
  if (pcState.meusGrupos && pcState.meusGrupos.length) {
    const comparacao = await buscarComparacaoGrupo(pcState.meusGrupos[0].id);
    const outros = comparacao
      .filter((r) => r.perfil_id !== pcState.perfil.id)
      .sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em));
    if (outros.length) atividadeAmigo = outros[0].nome_exibicao;
  }

  // Convidado só mexe na própria lista sem cadastro — compartilhar, grupos
  // e quadro de médias pedem conta (mesma regra combinada com o usuário
  // pro Lobby antigo, agora aplicada aqui). Fica visualmente apagado pra
  // sinalizar que precisa se cadastrar, em vez de sumir — mantém a
  // estrutura do painel igual pra logado e convidado.
  const gateConvidado = !pcState.perfil;
  const estiloApagado = gateConvidado ? "opacity:.45;" : "";
  const tituloApagado = gateConvidado ? "Precisa se cadastrar" : "";

  el.innerHTML = `
    <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:14px;">
      ${completa && !gateConvidado ? `<button class="pc-lobby-icon-btn" id="pcBtnCompartilharLobby" title="Compartilhar minha lista">${iconeSvg("compartilhar", 16)}</button>` : ""}
      <button class="pc-lobby-icon-btn" id="pcBtnConvidarLobby" title="${gateConvidado ? tituloApagado : "Convidar amigos"}" style="${estiloApagado}">${iconeSvg("convidar", 16)}</button>
    </div>

    <div class="pc-lobby-card">
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:6px; color:var(--pc-ink);">${completa ? `<span style="color:var(--pc-accent); display:flex;">${iconeSvg("checkCirculo", 14)}</span>Lista completa` : "Sua lista"}</span>
          <span style="font-size:11.5px; font-weight:600; color:${completa ? "var(--pc-accent)" : "var(--pc-ink-dim)"};">${totalMarcado}<span style="color:#4c6459;">/${totalVagas}</span></span>
        </div>
        <div class="pc-lobby-barra">
          <div style="width:${(fracaoPreenchida * pesoEstadual * 100).toFixed(1)}%; background:var(--pc-accent);"></div>
          <div style="width:${(fracaoPreenchida * pesoFederal * 100).toFixed(1)}%; background:var(--pc-lobby-verde-media);"></div>
          <div style="width:${(fracaoPreenchida * pesoSenador * 100).toFixed(1)}%; background:var(--pc-lobby-verde-forte);"></div>
        </div>
      </div>
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:6px;">${iconeSvg("calendario", 14)}Faltam ${diasAteEleicao()} dias pra eleição</span>
      </div>
      ${atividadeAmigo ? `<div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-accent); font-weight:600; display:flex; align-items:center; gap:6px;">${iconeSvg("grupos", 14)}${atividadeAmigo} atualizou a lista</span>
      </div>` : ""}
    </div>

    <div class="pc-lobby-menu-tit">Menu</div>
    <div class="pc-lobby-menu-faixa">
      <button class="pc-lobby-menu-item" id="pcMenuListas">${iconeSvg("ballot", 28)}<span>Minhas listas</span></button>
      <button class="pc-lobby-menu-item" id="pcMenuMedias" style="${estiloApagado}" title="${tituloApagado}">${iconeSvg("chart", 28)}<span>Médias</span></button>
      <button class="pc-lobby-menu-item" id="pcMenuGrupos" style="${estiloApagado}" title="${tituloApagado}">${iconeSvg("grupos", 28)}<span>Grupos</span></button>
      <button class="pc-lobby-menu-item" id="pcMenuRanking" disabled title="Disponível depois do resultado oficial de 2026">${iconeSvg("ranking", 28)}<span>Ranking</span></button>
    </div>

    <div id="pcLinkCompartilhavelWrap"></div>
  `;

  // Convidado sem cadastro: qualquer destino que precise de conta
  // (compartilhar, grupos, quadro de médias) leva pro cadastro em vez de
  // quebrar tentando usar pcState.perfil.id — pendenteAcao decide pra onde
  // volta depois de criar a conta (ver renderTelaCadastro).
  const irParaCadastro = (acao) => {
    pcState.pendenteRegistro = true;
    pcState.pendenteAcao = acao;
    pcState.tela = "cadastro";
    renderColaborativo();
  };
  document.getElementById("pcMenuListas").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "minhas-listas"; renderAppColaborativo(); }
    else { pcState.tela = "minhas-listas-convidado"; renderColaborativo(); }
  });
  document.getElementById("pcMenuMedias").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("medias");
    pcState.subaba = "medias"; renderAppColaborativo();
  });
  document.getElementById("pcMenuGrupos").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcMenuRanking").addEventListener("click", () => { pcState.subaba = "ranking"; renderAppColaborativo(); });
  document.getElementById("pcBtnConvidarLobby").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  const btnCompartilhar = document.getElementById("pcBtnCompartilharLobby");
  if (btnCompartilhar) btnCompartilhar.addEventListener("click", mostrarLinkCompartilhavel);
}

// Revela o link somente-leitura logo abaixo dos cards do Painel — reaproveita
// o mesmo perfil_id que já é público via rascunhos_publicos (Migração 7),
// não precisa gerar nem guardar nada novo, só montar a URL.
function mostrarLinkCompartilhavel() {
  const link = `${window.location.origin}${window.location.pathname}?ver=${pcState.perfil.id}`;
  const wrap = document.getElementById("pcLinkCompartilhavelWrap");
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="field-row" style="margin-top:14px;">
      <label>Link pra compartilhar (qualquer pessoa consegue abrir, sem precisar de conta)</label>
      <div style="display:flex; gap:8px;">
        <input class="cell" id="pcCampoLinkCompartilhar" readonly value="${link}" style="flex:1;">
        <button class="ghost" id="pcBtnCopiarLink">Copiar</button>
      </div>
    </div>
    <div class="pc-status" id="pcStatusCopiarLink"></div>`;
  document.getElementById("pcBtnCopiarLink").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(link);
      document.getElementById("pcStatusCopiarLink").textContent = "Link copiado!";
    } catch (e) {
      document.getElementById("pcCampoLinkCompartilhar").select();
      document.getElementById("pcStatusCopiarLink").textContent = "Não consegui copiar sozinho — selecionei o texto, use Cmd/Ctrl+C.";
    }
  });
}

// ---------- Minhas listas (salvas + depositadas) ----------
// Alcançada pelo atalho "Minhas listas" do Painel (pcMenuListas). Mostra as
// listas em aberto (editáveis) e as depositadas (travadas), deixa depositar
// uma lista em aberto (com aviso de irreversibilidade + opção de anonimato)
// e ver o conteúdo de uma depositada em modo leitura — nunca deixa editar
// uma lista já depositada pela mesma tela de Revisão, pra não arriscar
// mudar o conteúdo por baixo do selo "travada".
// Carrega Minhas Listas no mesmo formato não importa a fonte: conta
// logada vem do Supabase de verdade (salvamentos, trava por RLS de
// verdade); convidado continua local (window.storage), porque
// "salvamentos" exige perfil_id — sem cadastro não tem onde gravar isso
// no banco. criadoEm serve de "atualizadoEm" também pro caso logado, já
// que "salvamentos" não guarda um segundo timestamp de edição — perde um
// pouco de nuance ("editada hoje" vs "criada em X"), aceitável por ora.
async function _carregarMinhasListasNormalizado() {
  if (pcState.perfil) {
    const salvamentos = await carregarSalvamentosDe(pcState.perfil.id);
    return salvamentos.filter((s) => s.estado === pcState.estado).map((s) => ({
      id: s.id, nome: s.nome, criadoEm: s.criado_em, atualizadoEm: s.criado_em,
      depositadoEm: s.depositado_em, anonimo: !!s.anonimo,
    }));
  }
  return await carregarListasSalvasLocais(pcState.estado);
}

async function renderMinhasListas() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando suas listas…");
  const listas = await _carregarMinhasListasNormalizado();

  if (pcState.listaEmVisualizacao) {
    // Local já vem com os candidatos junto; logado precisa buscar o
    // salvamento completo (a lista resumida acima não traz candidatos).
    let palpitesPorCargo;
    if (pcState.perfil) {
      const completo = await carregarSalvamentoCompleto(pcState.listaEmVisualizacao);
      if (!completo) { pcState.listaEmVisualizacao = null; return renderMinhasListas(); }
      palpitesPorCargo = completo.cargos;
    } else {
      const lista = listas.find((l) => l.id === pcState.listaEmVisualizacao);
      if (!lista) { pcState.listaEmVisualizacao = null; return renderMinhasListas(); }
      palpitesPorCargo = lista.palpitesPorCargo;
    }
    const lista = listas.find((l) => l.id === pcState.listaEmVisualizacao);
    const secoes = CARGOS.map((cargoDef) => {
      const listaCargo = palpitesPorCargo ? palpitesPorCargo[cargoDef.id] : null;
      if (!listaCargo || !listaCargo.length) return "";
      const unificada = listaUnificadaRevisao(listaCargo, cargoDef.id);
      const linhas = unificada.map((c) => `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 3px; border-bottom:1px solid rgba(120,130,180,0.14); font-size:12.5px;">
          <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.posicaoEleicao ? `<b style="color:var(--pc-accent);">${c.posicaoEleicao}º</b> ` : ""}${c.nome} <span style="color:var(--pc-ink-dim);">· ${c.partido}</span></span>
          <span style="font-family:var(--mono); color:var(--pc-ink-dim); flex-shrink:0;">${c.votos.toLocaleString("pt-BR")}</span>
        </div>`).join("");
      return `<details class="pc-acc"><summary>${cargoDef.label}</summary><div class="pc-acc-body">${linhas}</div></details>`;
    }).join("");
    el.innerHTML = `
      <button class="ghost" id="pcBtnVoltarMinhasListas" style="margin-bottom:14px;">← Minhas listas</button>
      <h2 style="margin-bottom:2px;">${lista ? lista.nome : ""}</h2>
      <div class="pc-sub" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}Depositada em ${lista ? new Date(lista.depositadoEm).toLocaleDateString("pt-BR") : ""} · travada, não pode mais mudar.</div>
      ${secoes}`;
    document.getElementById("pcBtnVoltarMinhasListas").addEventListener("click", () => {
      pcState.listaEmVisualizacao = null;
      renderMinhasListas();
    });
    return;
  }

  const abertas = listas.filter((l) => !l.depositadoEm).sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
  const depositadas = listas.filter((l) => l.depositadoEm).sort((a, b) => new Date(b.depositadoEm) - new Date(a.depositadoEm));
  const jaTemLista = listas.length >= 1;

  const linhaAberta = (l) => `
    <div class="pc-lobby-linha" style="align-items:center; gap:10px;">
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Salva em ${new Date(l.atualizadoEm).toLocaleDateString("pt-BR")}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button class="ghost" data-pc-depositar-lista="${l.id}" style="padding:8px 12px; font-size:12px;">Depositar</button>
        <button class="primary" data-pc-editar-lista="${l.id}" style="padding:8px 14px; font-size:12px;">Editar</button>
      </div>
    </div>`;
  const linhaDepositada = (l) => `
    <div class="pc-lobby-linha" style="align-items:center; gap:10px; opacity:.8;">
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 12)}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</span></div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Depositada em ${new Date(l.depositadoEm).toLocaleDateString("pt-BR")}${l.anonimo ? " · anônima" : ""}</div>
      </div>
      <button class="ghost" data-pc-ver-lista="${l.id}" style="padding:8px 14px; font-size:12px; flex-shrink:0;">Ver</button>
    </div>`;

  const listaModal = pcState.modalDepositarListaId ? listas.find((l) => l.id === pcState.modalDepositarListaId) : null;

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
      <h2 style="margin:0;">Minhas listas</h2>
      <button class="pc-lobby-icon-btn" id="pcBtnNovaLista" title="Nova lista">${iconeSvg("mais", 16)}</button>
    </div>
    <div class="pc-sub" style="margin-bottom:16px;">Listas em aberto podem ser editadas à vontade. Depositadas ficam travadas.</div>
    ${pcState.avisoLimiteListaAberto ? `
    <div style="background:var(--pc-lobby-tom-3); border:1px solid #234134; border-radius:12px; padding:14px; margin-bottom:16px;">
      <div style="font-size:12.5px; font-weight:700; color:var(--pc-ink); margin-bottom:4px;">Ops...</div>
      <div style="font-size:11.5px; color:var(--pc-ink-dim); line-height:1.5;">Nós conseguimos espaço gratuito para o usuário cadastrar até uma lista, mas precisamos de espaço remunerado no servidor $$.<br><br>Compre crédito e utilize para criação de novas listas e grupos.</div>
    </div>` : ""}
    ${abertas.length ? `<div class="pc-lobby-menu-tit">Em aberto</div><div class="pc-lobby-card">${abertas.map(linhaAberta).join("")}</div>` : ""}
    ${depositadas.length ? `<div class="pc-lobby-menu-tit">Depositadas</div><div class="pc-lobby-card">${depositadas.map(linhaDepositada).join("")}</div>` : ""}
    ${!listas.length ? `<div class="pc-sub">Você ainda não salvou nenhuma lista.</div>` : ""}
    ${listaModal ? `
    <div id="pcModalDepositarOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(15,35,27,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("alerta", 14)} IMPORTANTE</div>
        <h2 style="margin-bottom:6px; font-size:15px;">Depositar "${listaModal.nome}"?</h2>
        <div style="font-size:12.5px; line-height:1.6; color:var(--pc-ink-dim);">Depois de depositada, essa lista trava — não dá mais pra editar nem excluir. É a sua cédula pra valer.</div>
        <label style="display:flex; align-items:center; gap:10px; margin:16px 0; font-size:13px; color:var(--pc-ink); cursor:pointer;">
          <label class="switch"><input type="checkbox" id="pcCheckAnonimo"><span class="slider"></span></label>
          Depositar de forma anônima
        </label>
        <div style="display:flex; gap:8px;">
          <button class="ghost" id="pcBtnCancelarDepositar" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarDepositar" style="flex:1;">Depositar</button>
        </div>
      </div>
    </div>` : ""}
  `;

  document.getElementById("pcBtnNovaLista").addEventListener("click", async () => {
    if (jaTemLista) {
      // Convidado não tem como ter crédito de verdade (sem conta não tem
      // onde guardar isso no banco) — vai direto pro cadastro. Logado
      // consome 1 crédito de verdade via RPC (consumir_credito_proprio,
      // migração 9); sem saldo, mostra o aviso.
      if (!pcState.perfil) {
        pcState.pendenteRegistro = true;
        pcState.tela = "cadastro";
        renderColaborativo();
        return;
      }
      const { consumiu, error } = await consumirCreditoConta(pcState.perfil.id);
      if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
      if (!consumiu) {
        pcState.avisoLimiteListaAberto = true;
        renderMinhasListas();
        return;
      }
      // Limpa o aviso "compre crédito" assim que a pessoa consegue criar
      // uma lista de verdade — sem isso, o aviso de uma tentativa antiga
      // sem saldo ficava preso na tela pra sempre, mesmo depois de ela
      // conseguir crédito e criar novas listas com sucesso.
      pcState.avisoLimiteListaAberto = false;
      pcState.perfil.creditos = Math.max(0, (pcState.perfil.creditos || 0) - 1);
    }
    pcState.listaSalvaId = null;
    pcState.listaSalvaNome = null;
    pcState.palpitesPorCargo = null;
    pcState.palpiteEdicao = null;
    if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
    else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
  });
  document.querySelectorAll("[data-pc-editar-lista]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-pc-editar-lista");
      const lista = listas.find((l) => l.id === id);
      if (!lista) return;
      pcState.listaSalvaId = lista.id;
      pcState.listaSalvaNome = lista.nome;
      if (pcState.perfil) {
        const completo = await carregarSalvamentoCompleto(id);
        if (!completo) return;
        pcState.palpitesPorCargo = completo.cargos;
      } else {
        pcState.palpitesPorCargo = lista.palpitesPorCargo;
      }
      pcState.palpiteEdicao = pcState.palpitesPorCargo ? pcState.palpitesPorCargo[pcState.cargoAtivo] : null;
      if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
      else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
    });
  });
  document.querySelectorAll("[data-pc-depositar-lista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Depositar de verdade exige conta (é o que dá identidade — mesmo
      // anônima — pra cédula travada) — convidado vai pro cadastro antes.
      if (!pcState.perfil) {
        pcState.pendenteRegistro = true;
        pcState.tela = "cadastro";
        renderColaborativo();
        return;
      }
      pcState.modalDepositarListaId = btn.getAttribute("data-pc-depositar-lista");
      renderMinhasListas();
    });
  });
  document.querySelectorAll("[data-pc-ver-lista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.listaEmVisualizacao = btn.getAttribute("data-pc-ver-lista");
      renderMinhasListas();
    });
  });
  if (listaModal) {
    document.getElementById("pcBtnCancelarDepositar").addEventListener("click", () => {
      pcState.modalDepositarListaId = null;
      renderMinhasListas();
    });
    document.getElementById("pcBtnConfirmarDepositar").addEventListener("click", async () => {
      const anonimo = document.getElementById("pcCheckAnonimo").checked;
      if (pcState.perfil) {
        const { error } = await depositarSalvamento(listaModal.id, anonimo);
        if (error) { pcState.erro = "Erro ao depositar: " + error.message; }
      } else {
        await depositarListaLocal(pcState.estado, listaModal.id, anonimo);
      }
      pcState.modalDepositarListaId = null;
      renderMinhasListas();
    });
  }
}

// ---------- Grupos privados de comparação ----------
// Ver nuvem/migracao-8-grupos.sql (schema) e nuvem/grupos.js (CRUD). Uma
// pessoa cria um grupo com nome e ganha um código de convite de 6
// caracteres; quem tem o código entra; a comparação usa os rascunhos por
// cargo (Migração 7), não o palpite público de um cargo só (mesma razão de
// Compartilhar, acima).

async function garantirMeusGruposCarregados() {
  if (pcState.meusGrupos) return;
  pcState.meusGrupos = await meusGrupos(pcState.perfil.id);
}

async function renderGrupoHub() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando seus grupos…");
  await garantirMeusGruposCarregados();

  const linhasGrupo = pcState.meusGrupos.map((g) => `
    <button class="pc-lobby-linha" data-pc-abrir-grupo="${g.id}" style="width:100%; background:none; border:none; cursor:pointer; text-align:left; font-family:var(--sans);">
      <span style="display:flex; align-items:center; gap:10px; color:var(--pc-ink); min-width:0;">
        <span style="color:var(--pc-accent); display:flex; flex-shrink:0;">${iconeSvg("grupos", 16)}</span>
        <span style="font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.nome}</span>
      </span>
      <span style="font-size:11px; color:var(--pc-ink-dim); font-family:var(--mono); flex-shrink:0;">${g.codigo_convite}</span>
    </button>`).join("");

  conteudo.innerHTML = `
    <h2 style="margin-bottom:14px;">Grupos</h2>
    ${pcState.avisoLimiteGrupoAberto ? `
    <div style="background:var(--pc-lobby-tom-3); border:1px solid #234134; border-radius:12px; padding:14px; margin-bottom:16px;">
      <div style="font-size:12.5px; font-weight:700; color:var(--pc-ink); margin-bottom:4px;">Ops...</div>
      <div style="font-size:11.5px; color:var(--pc-ink-dim); line-height:1.5;">Nós conseguimos espaço gratuito para o usuário criar até um grupo, mas precisamos de espaço remunerado no servidor $$.<br><br>Compre crédito e utilize para criação de novas listas e grupos.</div>
    </div>` : ""}
    <div class="pc-lobby-card">
      ${pcState.meusGrupos.length ? linhasGrupo : `<div class="pc-lobby-linha"><span style="font-size:12.5px; color:var(--pc-ink-dim);">Você ainda não está em nenhum grupo.</span></div>`}
    </div>
    <div class="pc-lobby-menu-tit">Novo grupo</div>
    <div class="pc-lobby-menu-faixa">
      <button class="pc-lobby-menu-item" id="pcBtnCriarGrupo">${iconeSvg("mais", 28)}<span>Criar grupo</span></button>
      <button class="pc-lobby-menu-item" id="pcBtnEntrarGrupo">${iconeSvg("chave", 28)}<span>Entrar com código</span></button>
    </div>`;

  document.getElementById("pcBtnCriarGrupo").addEventListener("click", async () => {
    // A partir do 2º grupo criado (não conta os que a pessoa só ENTROU
    // com código de outro dono — só quem tem criado_por === o próprio
    // perfil) precisa de 1 crédito de verdade (RPC consumir_credito_proprio,
    // migração 9) — mesma regra e mesmo texto de "Minhas listas". Grupos só
    // é alcançado logado, então não precisa do desvio pro cadastro que
    // Minhas Listas tem pro convidado.
    const jaCriouGrupo = pcState.meusGrupos.some((g) => g.criado_por === pcState.perfil.id);
    if (jaCriouGrupo) {
      const { consumiu, error } = await consumirCreditoConta(pcState.perfil.id);
      if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
      if (!consumiu) {
        pcState.avisoLimiteGrupoAberto = true;
        renderGrupoHub();
        return;
      }
      // Mesmo ajuste feito em "Minhas listas" (pcBtnNovaLista): sem isso, o
      // aviso de uma tentativa antiga sem saldo ficava preso na tela pra
      // sempre, mesmo depois de conseguir crédito e criar grupos novos.
      pcState.avisoLimiteGrupoAberto = false;
      pcState.perfil.creditos = Math.max(0, (pcState.perfil.creditos || 0) - 1);
    }
    pcState.telaGrupo = "criar";
    renderGrupoCriar();
  });
  document.getElementById("pcBtnEntrarGrupo").addEventListener("click", () => { pcState.telaGrupo = "entrar"; renderGrupoEntrar(); });
  document.querySelectorAll("[data-pc-abrir-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.grupoAtivo = pcState.meusGrupos.find((g) => g.id === btn.getAttribute("data-pc-abrir-grupo"));
      pcState.grupoComparacao = null;
      renderGrupoMembro();
    });
  });
}

function renderGrupoCriar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;">← Grupos</button>
      <h2>Criar grupo</h2>
      <div class="field-row"><label>Nome do grupo</label><input class="cell" id="pcNomeGrupo" placeholder="ex: Amigos do bairro"></div>
      <div class="pc-erro" id="pcErroGrupo"></div>
      <button class="primary" id="pcBtnConfirmarCriarGrupo" style="margin-top:6px;">Criar</button>
    </div>`;
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => { pcState.telaGrupo = null; renderGrupoHub(); });
  document.getElementById("pcBtnConfirmarCriarGrupo").addEventListener("click", async () => {
    const nome = document.getElementById("pcNomeGrupo").value.trim();
    if (!nome) { document.getElementById("pcErroGrupo").textContent = "Dá um nome pro grupo."; return; }
    const { data, error } = await criarGrupo(pcState.perfil.id, nome);
    if (error) { document.getElementById("pcErroGrupo").textContent = error.message; return; }
    pcState.meusGrupos = [...(pcState.meusGrupos || []), data];
    pcState.grupoAtivo = data;
    pcState.grupoComparacao = null;
    renderGrupoMembro();
  });
}

function renderGrupoEntrar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;">← Grupos</button>
      <h2>Entrar com código</h2>
      <div class="field-row"><label>Código de convite</label><input class="cell" id="pcCodigoGrupo" maxlength="6" style="text-transform:uppercase; font-family:var(--mono); letter-spacing:0.1em;" placeholder="ABC123"></div>
      <div class="pc-erro" id="pcErroGrupo"></div>
      <button class="primary" id="pcBtnConfirmarEntrarGrupo" style="margin-top:6px;">Entrar</button>
    </div>`;
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => { pcState.telaGrupo = null; renderGrupoHub(); });
  document.getElementById("pcBtnConfirmarEntrarGrupo").addEventListener("click", async () => {
    const codigo = document.getElementById("pcCodigoGrupo").value.trim();
    if (!codigo) { document.getElementById("pcErroGrupo").textContent = "Digita o código que te passaram."; return; }
    const { data, error } = await entrarNoGrupo(pcState.perfil.id, codigo);
    if (error) { document.getElementById("pcErroGrupo").textContent = error.message; return; }
    if (!pcState.meusGrupos.some((g) => g.id === data.id)) pcState.meusGrupos = [...pcState.meusGrupos, data];
    pcState.grupoAtivo = data;
    pcState.grupoComparacao = null;
    renderGrupoMembro();
  });
}

// Mesma lógica de agregação do Quadro de Médias (calcularMedianaPalpites +
// dhondt), só que a partir da comparação de UM grupo e UM cargo por vez —
// diferente de renderQuadroMedias, não pode fixar "40"/BASE_2022, porque
// aqui o cargo muda (interruptor Estadual/Federal/Senador abaixo).
//
// Fonte trocada em 08/08/2026: só entra na comparação quem já DEPOSITOU a
// cédula daquele cargo (grupo_comparacao, migração 10, lê de
// listas_salvas_publicas) — antes usava o rascunho ao vivo (o que a pessoa
// está editando agora, mesmo sem confirmar nada), decisão revertida a
// pedido do usuário. calcularMedianaPalpites espera cada registro com uma
// chave "rascunho_<cargo>" (usada também pelo Quadro de Médias, que lê de
// rascunhos_publicos de verdade) — aqui só remapeamos "lista_<cargo>" (nome
// real da coluna nova) pra esse mesmo formato, sem tocar na função
// compartilhada.
function montarComparacaoGrupo(registros, cargo) {
  const remapeados = registros
    .filter((r) => r[`lista_${cargo}`] && r[`lista_${cargo}`].length)
    .map((r) => ({ perfil_id: r.perfil_id, [`rascunho_${cargo}`]: r[`lista_${cargo}`] }));
  if (!remapeados.length) {
    return '<div class="pc-sub">Ninguém do grupo depositou esse cargo ainda.</div>';
  }
  const { parties, totalPalpites } = calcularMedianaPalpites(remapeados, cargo, pcState.estado);
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargo);
  // Senador é majoritário (mesmo motivo do branch em
  // classificarEleitosPorPartido, achado em 04/08/2026) — aqui as "vagas"
  // por partido vêm de contar quantos dos totalVagasCargo mais votados
  // (juntando todos os partidos numa fila só) são de cada um, não de
  // D'Hondt. Sem quociente eleitoral: esse conceito não existe pra cargo
  // majoritário.
  let seatsProj, qe;
  if (cargo === "senador") {
    const todosCand = [];
    parties.forEach((p, i) => p.candidatos.forEach((c) => todosCand.push({ partidoIdx: i, votos: Number(c.votos) || 0 })));
    const vencedores = [...todosCand].sort((a, b) => b.votos - a.votos).slice(0, totalVagasCargo);
    seatsProj = parties.map((_, i) => vencedores.filter((c) => c.partidoIdx === i).length);
    qe = null;
  } else {
    seatsProj = dhondt(parties, totalVagasCargo);
    qe = quocienteEleitoral(parties.reduce((s, p) => s + partyVotos(p), 0), totalVagasCargo);
  }
  const listaSeats = parties.map((p, i) => ({ nome: p.nome, seats: seatsProj[i] || 0 }));
  const linhasPartido = parties
    .map((p, i) => ({ p, votos: partyVotos(p), vagas: seatsProj[i] || 0 }))
    .sort((a, b) => b.vagas - a.vagas)
    .map(({ p, votos, vagas }) => `
      <tr><td>${p.nome}</td><td class="num">${p.vagas2022}</td>
        <td class="num" style="font-family:var(--mono)">${votos.toLocaleString("pt-BR")}</td>
        <td class="num" style="font-weight:700">${vagas}</td></tr>`).join("");
  return `
    <div class="pc-sub" style="margin-bottom:8px;">Baseado em ${totalPalpites} pessoa${totalPalpites === 1 ? "" : "s"} do grupo que já depositou a cédula desse cargo.</div>
    ${desenharHemiciclo(listaSeats, totalVagasCargo)}
    <table style="margin-top:10px;">
      <thead><tr><th>Partido</th><th class="num">Vagas 22</th><th class="num">Votos (mediana)</th><th class="num">Vagas (mediana)</th></tr></thead>
      <tbody>${linhasPartido}</tbody>
    </table>
    ${qe ? `<div class="pc-sub" style="margin-top:8px;">Quociente eleitoral (mediana do grupo): ${qe.toLocaleString("pt-BR")} votos/vaga.</div>` : ""}`;
}

async function renderGrupoMembro() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando comparação do grupo…");
  pcState.estado = "SC"; // único estado com dado hoje — ver CLAUDE.md
  if (!pcState.grupoComparacao) {
    pcState.grupoComparacao = await buscarComparacaoGrupo(pcState.grupoAtivo.id);
  }
  const registros = pcState.grupoComparacao;
  const botoesCargo = CARGOS.map((c) => `
    <button data-pc-cargo-grupo="${c.id}" class="${pcState.cargoAtivoGrupo === c.id ? "active" : ""}">${c.label}</button>`).join("");

  conteudo.innerHTML = `
    <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;">← Grupos</button>
    <h2 style="margin-bottom:4px;">${pcState.grupoAtivo.nome}</h2>
    <div class="pc-lobby-card">
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim);">${registros.length} pessoa${registros.length === 1 ? "" : "s"} com cédula depositada</span>
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}<b style="font-family:var(--mono); color:var(--pc-ink); font-weight:600;">${pcState.grupoAtivo.codigo_convite}</b></span>
      </div>
    </div>
    <div class="glass-card">
      ${registros.length > 1 ? `
      <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
      <div id="pcGrupoComparacaoConteudo">${montarComparacaoGrupo(registros, pcState.cargoAtivoGrupo)}</div>
      <div style="margin-top:14px;">
        <div class="pc-sub" style="margin-bottom:6px;">Quem já depositou:</div>
        ${registros.map((r) => `<span style="display:inline-block; margin:2px 4px 2px 0; padding:3px 10px; border-radius:999px; background:var(--pc-lobby-tom-3); font-size:11.5px; color:var(--pc-ink-dim);">${r.nome_exibicao}</span>`).join("")}
      </div>` : `
      <div style="text-align:center; padding:20px 10px;">
        ${iconeSvg("convidar", 32)}
        <h2 style="margin:10px 0 4px; font-size:15px;">Aguardando cédulas depositadas</h2>
        <div class="pc-sub" style="max-width:280px; margin:0 auto 16px;">A comparação só aparece quando pelo menos 2 pessoas do grupo tiverem depositado a própria cédula (não basta preencher, precisa confirmar o depósito). Convide mais gente com o código abaixo.</div>
        <div style="display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:999px; background:var(--pc-lobby-tom-3);">
          ${iconeSvg("chave", 14)}<b style="font-family:var(--mono); font-size:15px; letter-spacing:.05em;">${pcState.grupoAtivo.codigo_convite}</b>
        </div>
      </div>`}
    </div>`;

  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => { pcState.grupoAtivo = null; pcState.grupoComparacao = null; renderGrupoHub(); });
  document.querySelectorAll("[data-pc-cargo-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoGrupo = btn.getAttribute("data-pc-cargo-grupo");
      renderGrupoMembro();
    });
  });
}

// ---------- Seleção de candidatos: painel eleitoral + sanfona por partido ----------
// Tela única que substitui os antigos "boxes" (só número de vagas) e o
// checklist separado: aqui a pessoa já marca os candidatos específicos e,
// se quiser, a votação de cada um, com a referência de 2022 ao lado. Opera
// direto em pcState.palpiteEdicao (nuvem/palpites.js: montarEstadoPalpite).

// Normaliza pra busca (sem acento, minúsculo) — assim "psol" acha "PSOL" e
// "uniao" acha "União Brasil".
function normalizarBusca(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Padrão de exibição do app: nome de urna (como aparece na cédula de
// verdade), não o nome completo de registro — mais reconhecível pra quem tá
// prevendo. Cai pro nome completo quando o candidato ainda não tem nomeUrna
// cadastrado (caso de hoje pros dados de SC 2022, que são anteriores a essa
// convenção — passam a mostrar nome de urna assim que forem migrados pro
// novo formato do pipeline de resultados 2022 Brasil).
function nomeExibicao(c) {
  return c.nomeUrna || c.nome;
}

// Tela de "Carregando…" padrão — mesmo ícone com brilho de renderLanding
// (a capa), reaproveitado em toda tela que precisa buscar algo antes de
// mostrar conteúdo (troca de cargo, grupos, quadro de médias etc.), pra não
// cada uma inventar o próprio "Carregando" sem graça. mensagem (opcional)
// troca o texto padrão quando faz sentido ser mais específico.
function telaCarregando(mensagem) {
  return `<div class="glass-card" style="max-width:420px; margin:0 auto; min-height:50vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
    <div class="pc-loading-icon" style="width:64px; height:64px; margin:0 auto 16px; border-radius:50%; background:linear-gradient(135deg,#3dffb0,#0dbf7c); display:flex; align-items:center; justify-content:center; box-shadow:0 0 9px rgba(61,255,176,.5);">
      <svg viewBox="0 0 16 16" style="width:28px; height:28px; color:#04140d;">
        <path d="M2 6.3L8 2.5l6 3.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M3.4 7.3v5M6.3 7.3v5M9.7 7.3v5M12.6 7.3v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>
        <path d="M2 13h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>
      </svg>
    </div>
    <div class="pc-status">${mensagem || "Carregando…"}</div>
  </div>`;
}

// Nome de federação (ex.: "PT/PC do B/PV", "UNIÃO/PP") armazenado sem
// espaço em volta da barra — é a mesma string usada como chave de
// agrupamento/comparação em vários lugares (nome do grupo, chaveCandidato
// etc.), então não dá pra mudar o dado. Aqui só formata pra EXIBIÇÃO: some
// espaço, melhora a leitura de "UNIÃO/PP" pra "UNIÃO / PP".
function nomePartidoExibicao(nome) {
  return (nome || "").split("/").join(" / ");
}

// Número compacto pro rodapé de uma linha só do card de partido (ex.:
// 441063 -> "441k") — só usado nesse rodapé; em qualquer lugar com mais
// espaço (modal, contadores expandidos) o número continua por extenso.
function formatVotosCompacto(n) {
  n = Number(n) || 0;
  return n >= 1000 ? Math.round(n / 1000) + "k" : String(n);
}

// Mini-tabela padrão usada pelos dois contadores de federação (referência
// de 2022 e soma de votos indicados) — sempre centralizada (na página e
// dentro de cada célula) pra ficarem visualmente iguais uma à outra.
// linhas: [{ valores:[...], total:bool }] — total:true deixa a linha em
// negrito/destaque e com uma borda por cima, separando do resto.
function pcMiniTabela(colunas, linhas) {
  // Mesma fonte/cor neutra do resto das informações de referência (ex.:
  // "eleição 2022: 506.374 votos · 6 Deputados eleitos") — sem negrito nem
  // cor de destaque, só o conteúdo de cada célula centralizado. A tabela em
  // si fica alinhada à direita do card (margin-left:auto), não no centro.
  const estiloCelula = "font-size:11.5px; color:var(--pc-ink-dim); text-align:center; vertical-align:middle; padding:2px 12px;";
  const cabecalho = colunas.map((c) => `<th style="${estiloCelula} font-weight:400;">${c}</th>`).join("");
  const corpo = linhas.map((linha) => {
    const tds = linha.valores.map((v) => `<td style="${estiloCelula} font-weight:400;">${v}</td>`).join("");
    return `<tr${linha.total ? ' style="border-top:1px solid #2a4438;"' : ""}>${tds}</tr>`;
  }).join("");
  return `<table style="width:auto; margin-left:auto; border-collapse:collapse;"><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
}

function fatorCrescimentoEleitorado() {
  return ELEITORADO_2026 / REF_2022.eleitorado;
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
function abrirAvisoLimiteVagasSeNecessario() {
  if (avisoLimiteVagasOcultoSalvo()) return;
  pcState.avisoLimiteVagasAberto = true;
  renderSelecaoCandidatos();
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
  renderSelecaoCandidatos();
}
function executarAutoPreenchimento(partido) {
  snapshotPalpite();
  if (partido) balancearPartidoSelecao(partido);
  else balancearTudoSelecao();
  renderSelecaoCandidatos();
}

function snapshotPalpite() {
  pcState.historicoPalpite.push(JSON.parse(JSON.stringify(pcState.palpiteEdicao)));
  if (pcState.historicoPalpite.length > 30) pcState.historicoPalpite.shift();
}

function desfazerPalpite() {
  if (!pcState.historicoPalpite.length) return;
  pcState.palpiteEdicao = pcState.historicoPalpite.pop();
  renderSelecaoCandidatos();
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

function statusPartidoSelecao(p) {
  const marcados = p.candidatos.filter((c) => c.marcadoEleito);
  if (marcados.length === 0) return { cor: "var(--pc-ink-dim)", texto: "" };
  const esperado = metaVotosMarcados(marcados);
  const soma = marcados.reduce((s, c) => s + (Number(c.votos) || 0), 0);
  return soma >= esperado * 0.9
    ? { cor: "var(--pc-accent-2)", texto: "ok" }
    : { cor: "var(--pc-warning)", texto: "faltam votos" };
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
  const ordenados = [...p.candidatos].sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
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
  const recipientes = p.candidatos.filter((c) => !c.marcadoEleito && c.fonte !== "legenda" && (Number(c.votos) || 0) < votosAlvo);
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
        if (c.fonte === "legenda") return;
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
function zerarTudoSelecao() {
  pcState.palpiteEdicao.forEach((p) => zerarPartidoSelecao(p));
}

// Restaura a votação de 2022 em todos os candidatos do partido — volta ao
// mesmo ponto de partida de montarEstadoPalpite(), inclusive "destravando"
// o votosEditado (deixa de contar como edição manual).
function resetarPartidoSelecao(p) {
  p.candidatos.forEach((c) => { c.votos = c.votos2022 || 0; c.votosEditado = false; });
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

// Setas ao lado do contador "marcados/vagas2022": ajustam 1 eleito por vez
// sem precisar abrir o partido e clicar candidato por candidato. Pegam
// sempre a posição seguinte à do último marcado na lista ordenada pela
// votação REAL de 2022 (não pelos votos projetados de 2026, que mudam toda
// hora e podem se afastar de quem realmente tem chance — ver comentário em
// renderCargoEstadual) — e nunca marcam voto de legenda, que não é pessoa
// (mesma regra de zerarPartidoSelecao).
function incrementarEleitosPartido(p) {
  const ordenados = [...p.candidatos].sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
  let idxUltimoMarcado = -1;
  ordenados.forEach((c, i) => { if (c.marcadoEleito) idxUltimoMarcado = i; });
  const proximo = ordenados.slice(idxUltimoMarcado + 1).find((c) => c.fonte !== "legenda");
  if (proximo) proximo.marcadoEleito = true;
}

function decrementarEleitosPartido(p) {
  const ordenados = [...p.candidatos].sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
  for (let i = ordenados.length - 1; i >= 0; i--) {
    if (ordenados[i].marcadoEleito) { ordenados[i].marcadoEleito = false; return; }
  }
}

// Digitar direto no número do contador (em vez de clicar +/- um de cada
// vez) — repete a mesma lógica de incrementar/decrementar até bater o
// alvo, respeitando a mesma trava de vagas do cargo inteiro e parando se a
// lista do partido esgotar antes de chegar lá.
function definirEleitosPartido(p, alvo) {
  const alvoValido = Math.max(0, Math.round(Number(alvo) || 0));
  let atual = p.candidatos.filter((c) => c.marcadoEleito).length;
  while (atual < alvoValido && podeMarcarMaisUmEleito()) {
    incrementarEleitosPartido(p);
    const novo = p.candidatos.filter((c) => c.marcadoEleito).length;
    if (novo === atual) break;
    atual = novo;
  }
  while (atual > alvoValido) {
    decrementarEleitosPartido(p);
    const novo = p.candidatos.filter((c) => c.marcadoEleito).length;
    if (novo === atual) break;
    atual = novo;
  }
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
  renderSelecaoCandidatos();
}

// Tela pai: desenha o interruptor de cargo (Dep. Estadual / Dep. Federal /
// Senador) e delega o conteúdo pro cargo ativo. Só "estadual" tem candidatos
// carregados — os outros dois mostram um aviso, sem inventar dado fictício
// no código real (ver CARGOS acima e PROJETO.md, Fase 2.8).
async function renderSelecaoCandidatos() {
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
    return `
    <button data-pc-cargo="${c.id}" class="${pcState.cargoAtivo === c.id ? "active" : ""}${c.disponivel ? "" : " indisponivel"}">
      ${c.label}<span class="pc-tab-dot${concluido ? " done" : ""}" title="${concluido ? "Todas as vagas marcadas" : ""}"></span>
    </button>`;
  }).join("");
  el.innerHTML = `
    <div id="pcStickyBackdrop"><div id="pcStickyBackdropFill"></div></div>
    <div class="pc-cargo-switch">${botoes}</div>
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
  document.getElementById("pcCargoConteudo").innerHTML = `
    <div class="glass-card" style="text-align:center; padding:2rem 1.5rem;">
      <h2 style="margin-bottom:6px;">${cargo.label} ainda não disponível</h2>
      <div class="pc-sub">A lista de candidatos desse cargo ainda não foi carregada. Continue pelo Dep. Estadual por enquanto.</div>
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
async function garantirPalpiteEdicaoAtivo() {
  const chaveCargoEstado = `${pcState.estado}::${pcState.cargoAtivo}`;
  if (!pcState.palpiteEdicao || pcState.cargoPalpiteEdicao !== chaveCargoEstado) {
    await garantirRascunhosCarregados();
    // Prioridade: rascunho salvo (autosave, ver garantirRascunhosCarregados)
    // > cada partido começando com a própria vagas2022 real daquele
    // estado+cargo (fallback em montarEstadoPalpite) — não usa mais um
    // "padrão" fixo de um estado só, que ficava errado assim que outro
    // estado carregasse.
    const rascunho = pcState.rascunhosCache && pcState.rascunhosCache[pcState.cargoAtivo];
    pcState.palpiteEdicao = rascunho || montarEstadoPalpite("assembleia", null, null, pcState.cargoAtivo, pcState.estado);
    pcState.cargoPalpiteEdicao = chaveCargoEstado;
  }
}

async function renderCargoEstadual() {
  const conteudo = document.getElementById("pcCargoConteudo");
  conteudo.innerHTML = telaCarregando();
  await garantirPalpiteEdicaoAtivo();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);

  const cargoInfo = CARGOS.find((c) => c.id === pcState.cargoAtivo);
  // Total de vagas do cargo ativo (40 pra Dep. Estadual, 16 pra Dep.
  // Federal, 1 pra Senador em SC/2022) — número fixo, vem de
  // vagasFixasCargo, nunca de somar o dado carregado (ver comentário em
  // dados/estados/registro-2022.js).
  const totalVagasCargo = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const totalIndicado = pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).length, 0);
  const somaTotal = pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
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
  const votosValidos2026Proj = totalValidosProjetado2026();
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
  // Fora de Santa Catarina, o hemiciclo vira grade waffle (1 quadrado = 1
  // cadeira) — formato que se adapta melhor a qualquer número de vagas sem
  // depender do arco pensado pra 40 cadeiras da Assembleia de SC. Ver desenharHemiciclo
  // em calculo/eleitoral.js (coresMono.forcarGrade).
  const hemiciclo = desenharHemiciclo(composicao, totalVagasCargo, {
    preenchido: "var(--pc-glass-border)", texto: "var(--pc-ink)", porPartido: true,
    forcarGrade: pcState.estado !== "SC",
  });
  // Resumo visual embaixo do plenário: mesma composição do hemiciclo, em
  // lista — bolinha com a cor ideológica do partido (corPartidoIdeologico,
  // calculo/eleitoral.js) + sigla + quantidade de cadeiras + fração da
  // representação no total de vagas do cargo, do maior pro menor.
  const legendaPlenario = `
    <div style="display:flex; flex-wrap:wrap; gap:4px; opacity:0.55;">
      ${[...composicao].sort((a, b) => b.seats - a.seats).map((o) => `
        <div style="display:inline-flex; align-items:center; justify-content:center; gap:3px; padding:4px 6px; border:1px solid rgba(120,130,180,0.2); border-radius:6px; white-space:nowrap;">
          <span style="width:5px; height:5px; border-radius:50%; background:${corPartidoIdeologico(o.nome)}; flex-shrink:0;"></span>
          <span style="font-size:9px; font-weight:600;">${nomePartidoExibicao(o.nome)}: ${o.seats} (${(o.seats / totalVagasCargo * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</span>
        </div>`).join("")}
    </div>`;

  // A ordem da lista fica "congelada" (pcState.ordemPartidosFixa) enquanto a
  // pessoa mexe num partido — sem isso, clicar na seta ou marcar um
  // candidato reordena a lista na hora e o card pula de lugar embaixo do
  // cursor, atrapalhando cliques seguidos. Só reordena de fato quando o
  // mouse sai do card do partido (ver mouseleave em attachListenersSelecao).
  // Critério de desempate quando o número de marcados empata (inclusive na
  // posição inicial, antes de qualquer palpite pra 2026): quantidade de
  // Deputados eleitos de fato em 2022 (p.vagas2022 — já vem certo pra
  // federação também, soma dos membros, ver registro-2026.js), não votos.
  if (!pcState.ordemPartidosFixa || pcState.ordemPartidosFixa.length !== pcState.palpiteEdicao.length) {
    pcState.ordemPartidosFixa = [...pcState.palpiteEdicao]
      .sort((a, b) => {
        const ma = a.candidatos.filter((c) => c.marcadoEleito).length;
        const mb = b.candidatos.filter((c) => c.marcadoEleito).length;
        if (mb !== ma) return mb - ma;
        return (Number(b.vagas2022) || 0) - (Number(a.vagas2022) || 0);
      })
      .map((p) => p.nome);
  }
  const partidosOrdenados = pcState.ordemPartidosFixa
    .map((nome) => pcState.palpiteEdicao.find((p) => p.nome === nome))
    .filter(Boolean);

  // Busca de partido pelo nome — filtra a lista inteira (útil com ~24
  // partidos na tela); mesmo padrão da busca de candidato dentro de cada
  // partido, só que em cima da lista de partidos.
  const filtroPartido = normalizarBusca(pcState.buscaPartido || "");
  const partidosParaMostrar = filtroPartido
    ? partidosOrdenados.filter((p) => normalizarBusca(nomePartidoExibicao(p.nome)).includes(filtroPartido))
    : partidosOrdenados;

  // Base do termômetro (barraTermometro, abaixo): D'Hondt rodado direto
  // sobre o voto BRUTO já digitado (pcState.palpiteEdicao, sem escala) —
  // a mesma fonte que listaUnificadaRevisao usa na Revisão. Antes o
  // termômetro comparava com necessarioParaVagas (que escala TODOS os
  // partidos pra uma projeção fixa de 2026), o que divergia da Revisão de
  // verdade sempre que os outros partidos ainda não tinham sido
  // preenchidos — auditoria com revisor-regra-eleitoral em 06/08/2026
  // encontrou casos de até 40 vagas de diferença nesse cenário (normal:
  // é assim que a tela pede pra preencher, partido por partido). Rodado
  // uma vez só aqui fora do .map, não a cada card.
  const { counts: cadeirasReaisPorPartido, corte: corteRealCargo } = dhondtComCorte(pcState.palpiteEdicao, totalVagasCargo);
  const totalValidosRealCargo = pcState.palpiteEdicao.reduce((s, pp) => s + partyVotos(pp), 0);
  const qeRealCargo = quocienteEleitoral(totalValidosRealCargo, totalVagasCargo);

  // Senador é majoritário (art. 46) — não existe quociente/QP/sobra, quem
  // tem mais voto entre TODOS os candidatos de TODOS os partidos vence,
  // sem olhar partido. O termômetro precisa da mesma comparação cruzada
  // que classificarEleitosMajoritario já usa, não da conta proporcional
  // acima — bug encontrado testando ao vivo em 06/08/2026 (a barra estava
  // rotulando vaga de Senador como "sobra", conceito que só existe em
  // eleição proporcional).
  let rankingSenador = null;
  if (pcState.cargoAtivo === "senador") {
    const todosReais = [];
    pcState.palpiteEdicao.forEach((pp) => {
      pp.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todosReais.push(c));
    });
    const ordenados = [...todosReais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    rankingSenador = {
      chavesEleitos: new Set(ordenados.slice(0, totalVagasCargo).map((c) => c.chave)),
      votosDoUltimoEleito: totalVagasCargo > 0 && ordenados[totalVagasCargo - 1] ? (Number(ordenados[totalVagasCargo - 1].votos) || 0) : 0,
    };
  }

  const blocos = partidosParaMostrar.map((p) => {
    const marcados = p.candidatos.filter((c) => c.marcadoEleito).length;
    const st = statusPartidoSelecao(p);
    const isExpanded = !!pcState.expandido[p.nome];
    // partido2022Ref só vale pra Dep. Estadual (dados/partidos-brasil.js é
    // a lista de vagas da Assembleia) — em Federal/Senador teria que usar
    // igual pra todo mundo, senão mistura vagas de cargos diferentes pro
    // mesmo partido (ex.: mostrar "11 eleitos" da Assembleia numa aba que é
    // de Dep. Federal, onde o PL elegeu 6).
    // PARTIDOS_BRASIL (partido2022Ref) é a referência de vagas da Assembleia
    // de SC especificamente — só serve pra Dep. Estadual DE SC. Qualquer
    // outro estado (mesmo em Dep. Estadual) usa o fallback, calculado a
    // partir dos próprios candidatos daquele estado.
    const ref = (pcState.cargoAtivo === "estadual" && pcState.estado === "SC") ? partido2022Ref(p.nome) : null;
    // Sem ref oficial (partido não está em PARTIDOS_BRASIL — ex.: legenda
    // nova, sem histórico em 2022): usa a nominata REAL completa de 2022
    // (mesma fonte do ícone "20/22"), nunca só a fatia dos candidatos de
    // 2026 que casaram com 2022 — essa fatia pequena já deu número
    // inconsistente com a nominata (ver ícone 20/22) no passado.
    const doEstadoRef = !ref ? ((typeof candidatosEstadoCargo === "function" ? candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) : null) || []) : null;
    const entradaEstadoRef = doEstadoRef ? doEstadoRef.find((x) => x.nome === p.nome) : null;
    const votos2022 = ref ? ref.votos2022
      : entradaEstadoRef ? entradaEstadoRef.candidatos.reduce((s, c) => s + (Number(c.votos) || 0), 0)
      : p.candidatos.reduce((s, c) => s + (Number(c.votos2022) || 0), 0);
    const vagas2022 = ref ? ref.vagas2022 : (entradaEstadoRef ? entradaEstadoRef.vagas2022 : p.vagas2022);

    // p.nome pode ser uma federação (ex.: "PT/PC do B/PV") — a contagem de
    // vagas/quociente é sempre da federação inteira (assim que funciona de
    // verdade: os partidos membros somam os votos pra disputar juntos), mas
    // cada candidato continua sendo do seu próprio partido (partidoOriginal).
    // Lista de membros: usa a tabela fixa da federação (registro-2026.js)
    // quando existir, pra mostrar TODOS os partidos membros mesmo quando um
    // deles ainda não tem candidato cadastrado nesse cargo (ex.: PV só tem
    // candidato a Dep. Federal em SC — na aba Estadual continua listado,
    // só que com 0 votos). Sem essa tabela, cai pro que os candidatos já
    // carregados indicam.
    const membrosFederacao = (typeof MEMBROS_POR_FEDERACAO !== "undefined" && MEMBROS_POR_FEDERACAO[p.nome])
      || [...new Set(p.candidatos.map((c) => c.partidoOriginal || p.nome))];
    // "Contador 1" — referência de 2022, sempre visível (fechado ou aberto),
    // como um rodapé de uma linha só (trunca com "…" se não couber, ver
    // white-space/overflow no style abaixo). Mesmo formato por extenso pros
    // dois casos, pra legenda ficar padronizada: partido sozinho é "X votos
    // · N eleitos"; federação repete esse mesmo padrão por partido membro,
    // sem "total combinado" (cada membro tem seu próprio dado real de 2022 —
    // somar os dois já deu número inconsistente antes, ver histórico).
    const resumoVotos2022Html = membrosFederacao.length > 1
      ? (() => {
          const doEstado = (typeof candidatosEstadoCargo === "function" ? candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) : null) || [];
          return membrosFederacao
            .map((nome) => {
              const refMembro = (pcState.cargoAtivo === "estadual" && pcState.estado === "SC") ? partido2022Ref(nome) : null;
              const entradaEstado = doEstado.find((x) => x.nome === nome);
              const votosMembro = refMembro ? refMembro.votos2022 : (entradaEstado ? entradaEstado.candidatos.reduce((s, c) => s + (Number(c.votos) || 0), 0) : 0);
              const vagasMembro = refMembro ? refMembro.vagas2022 : (entradaEstado ? entradaEstado.vagas2022 : 0);
              return { nome, votosMembro, vagasMembro };
            })
            .sort((a, b) => b.votosMembro - a.votosMembro)
            .map(({ nome, votosMembro, vagasMembro }) => `${nome} ${votosMembro.toLocaleString("pt-BR")} votos · ${vagasMembro} eleito${vagasMembro === 1 ? "" : "s"}`)
            .join("   ");
        })()
      : `${votos2022.toLocaleString("pt-BR")} votos · ${vagas2022} eleito${vagas2022 === 1 ? "" : "s"}`;

    // "Contador 2" — não é um fato de 2022, é só uma calculadora: soma dos
    // votos de TODOS os candidatos daquela janela (partido ou federação
    // inteira), marcados como eleito ou não — mesmo total usado de verdade
    // no cálculo do quociente partidário (partyVotos, calculo/eleitoral.js).
    // Não é só a soma de quem está marcado — isso subestimava o total real.
    const somaVotosIndicados = partyVotos(p);
    // Classificação QP/sobra/fora de cada candidato MARCADO — mesma lógica
    // do termômetro (barraTermometro, mais abaixo), calculada aqui em cima
    // (antes do corpo/lista de candidatos) pra também colorir o
    // interruptor "eleito" de cada linha, não só a barra: o interruptor
    // deve refletir a mesma disputa de sobra/fora que a barra já mostra,
    // não só ligado/desligado. Pedido do usuário em 07/08/2026.
    const classificacaoPorChave = new Map();
    if (marcados > 0) {
      const marcadosOrdenadosClassif = [...p.candidatos].filter((c) => c.marcadoEleito).sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      if (rankingSenador) {
        marcadosOrdenadosClassif.forEach((c) => {
          classificacaoPorChave.set(c.chave, { tipo: rankingSenador.chavesEleitos.has(c.chave) ? "qp" : "fora" });
        });
      } else {
        const pIdxClassif = pcState.palpiteEdicao.indexOf(p);
        const cadeirasReaisTotalClassif = cadeirasReaisPorPartido[pIdxClassif] || 0;
        const qpRealTotalClassif = qeRealCargo ? Math.min(cadeirasReaisTotalClassif, Math.floor(somaVotosIndicados / qeRealCargo)) : 0;
        const cadeirasReaisClassif = Math.min(cadeirasReaisTotalClassif, marcados);
        const qpRealClassif = Math.min(qpRealTotalClassif, marcados);
        marcadosOrdenadosClassif.forEach((c, i) => {
          const k = i + 1;
          // Pra sobra, guarda também QUAL sobra (1ª, 2ª...) deste partido —
          // dá pra referenciar o caso específico na legenda, em vez de um
          // texto genérico igual pra qualquer sobra. Pedido do usuário em
          // 09/08/2026.
          const tipo = k <= qpRealClassif ? "qp" : k <= cadeirasReaisClassif ? "sobra" : "fora";
          classificacaoPorChave.set(c.chave, tipo === "sobra" ? { tipo, numeroSobra: k - qpRealClassif } : { tipo });
        });
      }
    }
    // Referência real (quociente + sobra, ver necessarioParaVagas acima) pra
    // lembrar a lógica eleitoral enquanto a pessoa preenche — nunca trava
    // nada, só avisa quando a soma ainda não fecha essa conta (ver infoTip
    // na própria mensagem: puramente informativo).
    const infoVagas = necessarioParaVagas(marcados);
    const faltamQuociente = infoVagas ? Math.max(0, infoVagas.necessario - somaVotosIndicados) : 0;
    // Quociente ATUAL "de verdade" (sem estimativa embutida pros candidatos
    // ainda não tocados) — só pro badge de progresso "Quociente do cargo".
    // infoVagas.qe (acima) já é a versão com estimativa realista, usada só
    // no cálculo do alvo/automação — as duas precisam ficar separadas, senão
    // o badge de progresso pularia pra perto da meta sem a pessoa ter
    // preenchido nada de verdade.
    const qeAtualLive = quocienteEleitoral(
      pcState.palpiteEdicao.reduce((s, pp) => s + partyVotos(pp), 0),
      totalVagasCargo
    );

    let corpo = "";
    if (isExpanded) {
      const candidatosOrdenados = [...p.candidatos].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      // Busca por candidato dentro do partido — não muda o "Nº" exibido (a
      // posição continua sendo a posição real na lista inteira, não na
      // filtrada, pra não confundir a ordem de votação de verdade).
      const termoBuscaCand = (pcState.buscaCandidato && pcState.buscaCandidato[p.nome]) || "";
      const filtroCand = normalizarBusca(termoBuscaCand);
      const candidatosParaMostrar = (filtroCand
        ? candidatosOrdenados.map((c, i) => ({ c, i })).filter(({ c }) => normalizarBusca(c.nome).includes(filtroCand) || normalizarBusca(c.nomeUrna).includes(filtroCand))
        : candidatosOrdenados.map((c, i) => ({ c, i }))
      );
      // Busca vira só um ícone — clicar abre o campo de texto de verdade
      // logo abaixo, no mesmo lugar de sempre.
      const buscaAberta = !!(pcState.buscaCandidatoAberta && pcState.buscaCandidatoAberta[p.nome]);
      // Ícone de busca e "soma dos votos" (Contador 2) na mesma linha — a
      // busca à esquerda, a soma à direita (alinhada com a coluna das
      // caixas de votação, mesmo espírito de padrão usado em todas as
      // janelas de partido). Vale pra toda janela de partido do sistema,
      // não só essa.
      const buscaCandidatoHtml = `
        <div style="display:flex; align-items:center; gap:8px; margin:6px 0 4px;">
          <button data-pc-busca-toggle="${p.nome}" class="pc-mini-btn" title="Buscar candidato por nome" style="${buscaAberta ? "background:rgba(61,255,176,.18); border-color:var(--pc-accent); color:var(--pc-accent);" : ""}">
            <svg viewBox="0 0 16 16" width="13" height="13"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
          </button>
          <div style="flex:1;"></div>
        </div>
        ${marcados > 0 && faltamQuociente > 0 ? `<div style="text-align:right; font-size:10px; color:#8fe8c4; opacity:.85; margin:0 0 4px; padding-right:3px;">${marcados} vaga${marcados === 1 ? "" : "s"}, faltam <b>${faltamQuociente.toLocaleString("pt-BR")}</b> votos pra fechar essas vagas${infoTip("Essa métrica é só pra ajudar na lógica da lista — não impede você de indicar do jeito que quiser.")}</div>` : ""}
        <div style="text-align:right; font-size:11px; color:var(--pc-ink-dim); margin:0 0 8px; padding-right:3px;">soma dos votos <b style="color:var(--pc-ink); font-size:14.5px; font-weight:600; font-family:var(--sans);">${somaVotosIndicados.toLocaleString("pt-BR")}</b></div>
        <div style="position:relative; margin:0 0 8px; ${buscaAberta ? "" : "display:none;"}">
          <svg viewBox="0 0 16 16" width="13" height="13" style="position:absolute; left:11px; top:50%; transform:translateY(-50%); color:var(--pc-ink-dim); pointer-events:none;"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
          <input type="text" data-pc-busca-candidato="${p.nome}" class="cell" value="${termoBuscaCand}" style="padding-left:32px; font-size:12.5px;">
        </div>`;
      const linhas = candidatosParaMostrar.length ? candidatosParaMostrar.map(({ c, i: posIdx }) => `
        <div style="display:flex; align-items:center; gap:10px; padding:11px 3px; border-bottom:1px solid rgba(120,130,180,0.14);">
          <span style="width:24px; font-size:13px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${posIdx + 1}º</span>
          ${c.fonte === "legenda"
            ? `<span title="Voto de legenda não elege ninguém — soma no total do partido, mas não é uma pessoa marcável como eleita." style="width:46px; height:19px; flex-shrink:0;"></span>`
            : (() => {
                // Interruptor reflete a mesma disputa QP/sobra/fora do
                // termômetro (barraTermometro) — não é só ligado/desligado.
                // Pedido do usuário em 07/08/2026.
                const classif = c.marcadoEleito ? classificacaoPorChave.get(c.chave) : null;
                const claseExtra = classif?.tipo === "sobra" ? " pc-switch-sobra" : classif?.tipo === "fora" ? " pc-switch-fora" : "";
                const tituloExtra = classif?.tipo === "sobra" ? ` — levando a ${classif.numeroSobra}ª sobra do partido nesta rodada, por disputa de médias (art. 109)` : classif?.tipo === "fora" ? " — marcado, mas não fecharia vaga com a votação de hoje" : "";
                return `<label class="pc-switch${claseExtra}" title="${c.marcadoEleito ? "Marcado como eleito" + tituloExtra : "Marcar como eleito"}"><input type="checkbox" data-pc-marca="${p.nome}::${c.chave}" ${c.marcadoEleito ? "checked" : ""}><span class="pc-switch-slider"></span></label>`;
              })()}
          <span style="flex:1; font-size:15px; font-weight:600; line-height:1.4;">${nomeExibicao(c)}${c.partidoOriginal && c.partidoOriginal !== p.nome ? ` <span style="font-size:11px; font-weight:700; color:var(--pc-accent);">(${c.partidoOriginal})</span>` : ""}${c.fonte === "legenda" ? ' <span style="font-size:10.5px; font-weight:400; color:var(--pc-ink-dim);">(legenda)</span>' : ""}${c.fonte === "2022-sem-ata-2026" ? ` <span style="font-size:10.5px; font-weight:600; color:var(--pc-warning);">sem ata 2026</span>${warnTip("Esse partido ainda não teve a ata de convenção de 2026 processada — este é o candidato real de 2022, usado só como referência temporária até a lista de 2026 chegar. Pode não ser candidato em 2026, pode ter trocado de cargo ou de partido.")}` : ""}${c.fonte === "ficticio" ? ` <span style="font-size:10.5px; font-weight:600; color:var(--pc-warning);">candidato fictício</span>${warnTip("Esse partido ainda não teve a ata de convenção de 2026 processada. Este NÃO é um candidato real — é um nome de preenchimento (placeholder) só pra manter a chapa completa até a ata sair. Será substituído pelo candidato real assim que a ata for processada.")}` : ""}<br><span style="font-size:12.5px; font-weight:400; color:var(--pc-ink-dim); opacity:0.9;">eleição 2022: ${Number(c.votos2022 || 0).toLocaleString("pt-BR")} votos${c.eleito2022 ? ` · eleito${c.partidoOrigem2022 ? " " + c.partidoOrigem2022 : ""}` : ""}</span>${c.invalidado2022 ? warnTip(`<b>Voto invalidado em 2022</b><br><br>${c.motivoInvalidacao || "Candidatura sub júdice — votação não contou no resultado final."}`) : ""}</span>
          <input class="cell${c.votosEditado ? " pc-voto-manual" : ""}" title="${c.votosEditado ? "Ajustado manualmente" : "Valor automático/padrão"}" data-pc-voto="${p.nome}::${c.chave}" value="${(Number(c.votos) || 0).toLocaleString("pt-BR")}" style="width:120px; font-size:14.5px; font-weight:600; text-align:right; flex-shrink:0;">
        </div>`).join("") : `<div class="pc-sub" style="text-align:center; padding:10px 0;">Nenhum candidato encontrado.</div>`;
      // Mesma distinção QP ("quociente direto", art. 107) vs média/sobra
      // (art. 109) que a Revisão já mostra nos selos "eleito · QP"/"eleito ·
      // média" — só que calculada aqui, na hora de marcar, com o mesmo
      // dhondtComCorte (ver necessarioParaVagas acima). Deixa explícito de
      // onde cada vaga marcada realmente viria, em vez de uma suposição fixa
      // de "todas menos a última são QP".
      // Senador é majoritário (art. 46) — quociente eleitoral/QP/sobra só
      // existem em eleição proporcional (Estadual e Federal), por isso essa
      // caixa de referência não faz sentido nessa aba (PROJETO.md, Fase
      // 2.8). Achado ao testar o Interruptor de cargo em 06/08/2026.
      const refQuociente = marcados > 0 && pcState.cargoAtivo !== "senador" && infoVagas && infoVagas.qe ? (() => {
        const parteQp = infoVagas.qp > 0 ? `<b style="color:var(--pc-ink);">${infoVagas.qp}</b> por quociente direto (art. 107)` : "";
        const parteSobra = infoVagas.sobra > 0 ? `<b style="color:var(--pc-ink);">${infoVagas.sobra}</b> por sobra/média (art. 109${infoVagas.qp === 0 ? " — depende de como os outros partidos se saem" : ""})` : "";
        const breakdown = parteQp && parteSobra ? `${parteQp} + ${parteSobra}` : (parteQp || parteSobra || "nenhuma vaga garantida ainda");
        // Quociente PROJETADO (fixo, 2022 escalado pro eleitorado de 2026) ao
        // lado do quociente ATUAL (sobe conforme mais partidos são
        // preenchidos) — sem essa referência fixa, o número atual pode
        // parecer errado (começa bem mais baixo que os ~94.599 conhecidos de
        // 2022) quando na real é só o cálculo ainda incompleto. Mostrado no
        // mesmo estilo visual do "Seus Eleitos" do Painel Eleitoral (número
        // grande colorido + meta pequena do lado) — texto sozinho passava
        // batido; a pessoa precisa notar de cara que o quociente ainda está
        // longe da meta pra simulação parecer com uma eleição real.
        const qeProjetado = quocienteEleitoral(totalValidosProjetado2026(), totalVagasCargo);
        const diffPct = qeProjetado ? Math.round(((qeAtualLive - qeProjetado) / qeProjetado) * 100) : null;
        const legenda = diffPct === null ? ""
          : diffPct < 0 ? `Ainda <b style="color:var(--pc-warning);">${Math.abs(diffPct)}% abaixo</b> da votação esperada pra 2026 — quanto mais perto da meta, mais realista fica a simulação.`
          : diffPct > 0 ? `Já <b style="color:var(--pc-accent-2);">${diffPct}% acima</b> da votação esperada pra 2026.`
          : `Bateu a votação esperada pra 2026.`;
        return `<div style="display:flex; align-items:center; gap:14px; background:#0c1c16; border-radius:10px; padding:10px 12px; margin-bottom:8px;">
          <div style="flex-shrink:0;">
            <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-bottom:2px; display:flex; align-items:center; gap:4px;">Quociente do cargo ${infoTip("O número grande é o quociente ATUAL (art. 106) — calculado só com a votação já digitada, sobe conforme mais partidos são preenchidos. A meta pequena é o quociente PROJETADO pra 2026 (referência fixa: 2022 escalado pelo crescimento do eleitorado, confinada aos partidos que este simulador modela). Pra a simulação se aproximar de uma eleição real, o atual precisa chegar perto da meta.")}</div>
            <div style="font-size:26px; font-weight:700; line-height:1.1;${qeAtualLive < qeProjetado ? " color:#ff9500; text-shadow:0 0 12px rgba(255,149,0,.6);" : " color:var(--pc-accent);"}">${formatVotosCompacto(Math.round(qeAtualLive))}<span style="font-size:12px; color:var(--pc-ink-dim); font-weight:400;"> /${formatVotosCompacto(Math.round(qeProjetado))}</span></div>
          </div>
          <div style="font-size:11px; color:var(--pc-ink-dim); line-height:1.5;">
            ${legenda}<br>
            Pra ${marcados} vaga${marcados === 1 ? "" : "s"}: ${breakdown} — total mínimo de <b style="color:var(--pc-ink);">${infoVagas.necessario.toLocaleString("pt-BR")}</b> votos.
          </div>
        </div>`;
      })() : "";
      corpo = `
        ${refQuociente}
        ${buscaCandidatoHtml}
        ${linhas}
      `;
    }

    // Termômetro de quociente/sobra — mostra, POSIÇÃO por posição (nunca
    // nome de candidato), se cada vaga marcada estaria garantida por
    // quociente partidário (art. 107), por sobra/método das médias (art.
    // 109) ou fora hoje — reaproveita necessarioParaVagas (já validado, é a
    // mesma conta da caixa "Quociente do cargo" acima) rodada pra cada
    // posição k=1..marcados, em vez de inventar uma matemática nova. Só
    // informativo, nunca trava o preenchimento.
    const barraTermometro = (() => {
      if (!marcados) return "";
      const marcadosOrdenados = [...p.candidatos].filter((c) => c.marcadoEleito).sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));

      if (rankingSenador) {
        // Majoritário: só existe "eleito" (entre os mais votados do cargo
        // inteiro, cruzando todos os partidos) ou "fora" — sem QP nem
        // sobra, esses dois só existem em eleição proporcional.
        let eleitoCount = 0;
        const segmentos = marcadosOrdenados.map((c, i) => {
          const k = i + 1;
          if (rankingSenador.chavesEleitos.has(c.chave)) {
            eleitoCount++;
            return `<div class="pc-term-seg qp"><span class="tip-box"><b>${k}ª colocação do partido</b> — está entre os ${totalVagasCargo} mais votados do cargo (eleição majoritária, art. 46), cruzando todos os partidos.</span></div>`;
          }
          const faltam = Math.max(0, rankingSenador.votosDoUltimoEleito - (Number(c.votos) || 0));
          return `<div class="pc-term-seg fora"><span class="tip-box"><b>${k}ª colocação do partido — fora hoje</b> — não está entre os ${totalVagasCargo} mais votados do cargo. Faltam ${Math.round(faltam).toLocaleString("pt-BR")} votos pra esse candidato entrar na disputa.</span></div>`;
        }).join("");
        const legendaPartes = [];
        if (eleitoCount > 0) legendaPartes.push(`<span><span class="pc-term-dot" style="background:var(--pc-lobby-verde-media);"></span>${eleitoCount} eleito${eleitoCount === 1 ? "" : "s"}</span>`);
        if (marcados - eleitoCount > 0) legendaPartes.push(`<span><span class="pc-term-dot" style="background:var(--pc-danger);"></span>fora</span>`);
        return `<div class="pc-term-bar">${segmentos}</div><div class="pc-term-legenda">${legendaPartes.join("")}</div>`;
      }

      const pIdx = pcState.palpiteEdicao.indexOf(p);
      // cadeirasReaisTotal/qpRealTotal são o direito de VERDADE do partido
      // (pode passar de "marcados", se o partido já teria direito a mais
      // vagas do que a pessoa marcou até agora) — mas a barra só tem um
      // segmento por candidato MARCADO, então capa os dois em "marcados"
      // antes de montar a legenda, senão "3 Sobra" aparecia na legenda sem
      // nenhum segmento correspondente na barra (achado testando ao vivo
      // em 06/08/2026).
      const cadeirasReaisTotal = cadeirasReaisPorPartido[pIdx] || 0;
      const qpRealTotal = qeRealCargo ? Math.min(cadeirasReaisTotal, Math.floor(somaVotosIndicados / qeRealCargo)) : 0;
      const cadeirasReais = Math.min(cadeirasReaisTotal, marcados);
      const qpReal = Math.min(qpRealTotal, marcados);
      const sobraCount = cadeirasReais - qpReal;
      const foraCount = Math.max(0, marcados - cadeirasReais);
      const segmentos = marcadosOrdenados.map((c, i) => {
        const k = i + 1;
        if (k <= qpReal) {
          return `<div class="pc-term-seg qp"><span class="tip-box"><b>${k}ª vaga</b> — quociente partidário (art. 107): garantida com a votação de hoje, não depende de sobra.</span></div>`;
        }
        if (k <= cadeirasReais) {
          return `<div class="pc-term-seg sobra"><span class="tip-box"><b>${k}ª vaga (sobra — art. 109)</b> — garantida com a votação já digitada: o partido está entre os ${totalVagasCargo} melhores quocientes do cargo neste momento.</span></div>`;
        }
        const necessarioK = Math.max(0, Math.floor(corteRealCargo * k) + 1);
        const faltam = Math.max(0, necessarioK - somaVotosIndicados);
        return `<div class="pc-term-seg fora"><span class="tip-box"><b>${k}ª — fora hoje</b> — com a votação já digitada por todo mundo, essa posição não fecharia vaga agora. Faltam ${Math.round(faltam).toLocaleString("pt-BR")} votos no total do partido pra entrar na disputa.</span></div>`;
      }).join("");
      const legendaPartes = [];
      if (qpReal > 0) legendaPartes.push(`<span><span class="pc-term-dot" style="background:var(--pc-lobby-verde-media);"></span>${qpReal} QE</span>`);
      if (sobraCount > 0) legendaPartes.push(`<span><span class="pc-term-dot" style="background:var(--pc-warning);"></span>${sobraCount} Sobra</span>`);
      if (foraCount > 0) legendaPartes.push(`<span><span class="pc-term-dot" style="background:var(--pc-danger);"></span>fora</span>`);
      return `<div class="pc-term-bar">${segmentos}</div><div class="pc-term-legenda">${legendaPartes.join("")}</div>`;
    })();

    return `
      <div data-pc-partido-card="${p.nome}" style="border:1px solid rgba(120,130,180,0.2); border-radius:10px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; flex-wrap:wrap; row-gap:10px; gap:8px; padding:13px 14px 10px;">
          <button data-pc-toggle-partido="${p.nome}" style="display:flex; align-items:center; gap:10px; flex:1 1 auto; min-width:70px; text-align:left; background:none; border:none; cursor:pointer; color:var(--pc-ink); font-family:var(--sans); padding:0;">
            <span style="width:9px; height:9px; border-radius:50%; background:${st.cor}; flex-shrink:0;"></span>
            <span style="font-weight:700; font-size:15.5px;">${nomePartidoExibicao(p.nome)}</span>
          </button>
          <div style="display:flex; align-items:center; gap:9px; flex-shrink:0;">
            <button data-pc-ver2022="${p.nome}" class="pc-mini-btn">${iconeSvg("ano2022", 16)}<span class="pc-mini-tip">Ver nominata completa de 2022</span></button>
            <button data-pc-reset="${p.nome}" class="pc-mini-btn">${iconeSvg("reset", 16)}<span class="pc-mini-tip" style="white-space:normal; width:170px; text-align:center;">Restaurar votação de 2022 — só tem efeito pra quem recebeu votos naquela eleição</span></button>
            <button data-pc-zerar="${p.nome}" class="pc-mini-btn">${iconeSvg("borracha", 16)}<span class="pc-mini-tip">Zerar votação de todos</span></button>
            <button data-pc-balancear="${p.nome}" class="pc-mini-btn">${iconeSvg("completar", 16)}<span class="pc-mini-tip" style="white-space:normal; width:220px; text-align:center;">PREENCHIMENTO AUTOMÁTICO (PARTIDO)<br><br>Precisa de agilidade?<br><br>Este botão aciona a função de preenchimento de votação automática de todos os candidatos, mas limitado a esta lista.<br><br>Selecione apenas os candidatos que você acha que serão eleitos por ordem e ele faz todo o resto.</span></button>
            <div class="pc-stepper-chip" title="Quantidade de Deputados eleitos indicados pra esse partido">
              <div class="pc-stepper">
                <button data-pc-inc="${p.nome}" class="pc-stepper-btn" title="Adicionar 1 eleito" ${p.candidatos.some((c) => !c.marcadoEleito && c.fonte !== "legenda") && podeMarcarMaisUmEleito() ? "" : "disabled"}>
                  <svg viewBox="0 0 16 16" width="10" height="10"><path d="M8 4l4 6H4z" fill="currentColor"></path></svg>
                </button>
                <button data-pc-dec="${p.nome}" class="pc-stepper-btn" title="Remover 1 eleito" ${marcados > 0 ? "" : "disabled"}>
                  <svg viewBox="0 0 16 16" width="10" height="10"><path d="M8 12L4 6h8z" fill="currentColor"></path></svg>
                </button>
              </div>
              <input type="text" inputmode="numeric" class="pc-stepper-count" data-pc-count="${p.nome}" value="${marcados}">
            </div>
          </div>
        </div>
        ${barraTermometro ? `<div style="margin:0 14px 10px;">${barraTermometro}</div>` : ""}
        <div style="margin:0 14px; padding:8px 0 10px; border-top:1px solid rgba(120,130,180,0.14); font-size:11px; color:var(--pc-ink-dim); font-family:var(--mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Eleições 2022 · ${resumoVotos2022Html}</div>
        <button data-pc-toggle-partido="${p.nome}" class="pc-expand-handle" title="${isExpanded ? "Recolher" : "Ver candidatos"}">
          <span></span>
        </button>
        ${isExpanded ? `<div style="padding:0 12px 12px;">${corpo}</div>` : ""}
      </div>`;
  }).join("");

  const instrucaoAberta = pcState.instrucaoSelecaoAberta !== false;
  conteudo.innerHTML = `
    ${instrucaoAberta ? `
    <div id="pcInstrucaoOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:400px; width:100%; max-height:88vh; overflow-y:auto; background:rgba(15,35,27,.72); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:20px 20px 18px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:6px;">${iconeSvg("alerta", 13)} IMPORTANTE</div>
        <h2 style="margin-bottom:4px; font-size:15px;">COMO MONTAR A LISTA</h2>
        <div style="font-size:11px; line-height:1.4; color:var(--pc-ink-dim); font-style:italic; margin-bottom:10px;">Trilha ágil. Monte como quiser, mas este é o caminho mais rápido.</div>
        <div style="font-size:12.5px; line-height:1.4; color:var(--pc-ink-dim);">
          <div style="margin-bottom:6px;">
            <b style="color:var(--pc-ink);">1.</b> Selecione a quantidade de vagas por partido.
            <div style="margin:5px 0 0; text-align:center; transform:scale(0.85); transform-origin:center;">
              <div class="pc-stepper-chip" style="display:inline-flex;">
                <div class="pc-stepper">
                  <button class="pc-stepper-btn" disabled style="opacity:1;"><svg viewBox="0 0 16 16" width="10" height="10"><path d="M8 4l4 6H4z" fill="currentColor"></path></svg></button>
                  <button class="pc-stepper-btn" disabled style="opacity:1;"><svg viewBox="0 0 16 16" width="10" height="10"><path d="M8 12L4 6h8z" fill="currentColor"></path></svg></button>
                </div>
                <span class="pc-stepper-count" style="pointer-events:none;">6</span>
              </div>
            </div>
          </div>
          <div style="margin-bottom:6px;">
            <b style="color:var(--pc-ink);">2.</b> Com a quantidade selecionada, é hora de indicar a votação dos candidatos eleitos.
            <div style="margin:5px 0 0; text-align:center;">
              <input class="cell" disabled value="67065" style="width:95px; font-size:12px; font-weight:600; text-align:right; padding:5px 8px;">
            </div>
          </div>
          <div style="margin:8px 0; padding:8px 10px; background:#0c1c16; border-radius:8px; font-size:11.5px; line-height:1.4;">
            <b style="color:var(--pc-accent-2);">DICA BÔNUS</b><br>
            Se você optar pela trilha ágil, não esqueça de selecionar o preenchimento automático no botão "auto" — ele garante que os demais candidatos tenham uma votação simulada, o que aumenta sua pontuação no ranqueamento.
            <div style="margin-top:6px; text-align:center;">
              <span style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px; font-size:11.5px; font-weight:700; border-radius:999px; background:rgba(61,255,176,.08); border:1px solid var(--pc-accent); color:#c8ffe8;">${iconeSvg("completar", 12)} Auto</span>
            </div>
          </div>
          <div>
            <b style="color:var(--pc-ink);">3. AVANÇAR</b><br>
            Quando indicar a quantidade de votos eleitos proporcional ao número de vagas, a opção avançar será selecionável. Ao ativá-la, você acessa a sua lista de palpite dos parlamentares eleitos e dos suplentes, pronta pra revisar. Depois disso, você pode salvar a sua lista — dá pra editar depois quando quiser — e, se preferir, imprimir. Quando estiver pronto de verdade, é no lobby que você deposita a cédula pra valer: aí sim ela trava e não pode mais ser alterada.
            <div style="margin:6px 0 0; text-align:center;">
              <span style="display:inline-flex; align-items:center; padding:5px 16px; font-size:11.5px; font-weight:700; border-radius:999px; background:rgba(61,255,176,.08); border:1px solid var(--pc-accent); color:#c8ffe8;">Avançar</span>
            </div>
          </div>
          <div style="font-size:10.5px; opacity:0.75; margin-top:8px;">Depois disso, você pode continuar sua trilha com outras funções, como a criação de grupos, ranqueamento e outras funcionalidades.</div>
        </div>
        <button class="primary" id="pcFecharInstrucao" style="width:100%; margin-top:20px;">Entendi</button>
      </div>
    </div>` : ""}
    ${pcState.avisoLimiteVagasAberto ? `
    <div id="pcAvisoLimiteOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:420px; width:100%; background:rgba(15,35,27,.72); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
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
    <div id="pcConfirmAutoOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:420px; width:100%; background:rgba(15,35,27,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11.5px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("completar", 14)} PREENCHIMENTO AUTOMÁTICO</div>
        <h2 style="margin-bottom:6px;">Preencher automaticamente?</h2>
        <div style="font-size:13.5px; line-height:1.7; color:var(--pc-ink-dim);">
          Vou distribuir a votação dos candidatos marcados como eleito ${alvo}, proporcionalmente ao peso de cada um em 2022, até bater a votação necessária pra fechar essas vagas — e completar o resto da lista com uma estimativa. Números que você já ajustou à mão (borda verde) não são alterados.
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
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(120,130,180,0.14);">
          <span style="width:26px; font-size:12px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${i + 1}º</span>
          <span style="flex:1; font-size:13.5px; font-weight:600;">${nomeExibicao(c)}${membros.length > 1 ? ` <span style="font-size:10.5px; color:var(--pc-accent); font-weight:700;">(${c._partido})</span>` : ""}${c.eleito2022 ? ' <span style="font-size:10.5px; color:var(--pc-accent-2);">· eleito</span>' : ""}</span>
          <span style="font-size:13px; font-weight:600; color:var(--pc-ink-dim);">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      // Soma total (e por partido, quando é federação) da nominata inteira
      // exibida acima — mesma fonte de dado das linhas, só somada.
      const totalGeral = candidatos.reduce((s, c) => s + (Number(c.votos) || 0), 0);
      const totalHtml = membros.length > 1
        ? `<div style="display:flex; flex-direction:column; gap:2px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(120,130,180,0.25); font-size:12.5px; color:var(--pc-ink-dim);">
            ${membros.map((m) => `<div>${m}: <b style="color:var(--pc-ink);">${candidatos.filter((c) => c._partido === m).reduce((s, c) => s + (Number(c.votos) || 0), 0).toLocaleString("pt-BR")}</b></div>`).join("")}
            <div style="margin-top:2px;">Total: <b style="color:var(--pc-ink);">${totalGeral.toLocaleString("pt-BR")}</b></div>
          </div>`
        : `<div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(120,130,180,0.25); font-size:12.5px; color:var(--pc-ink-dim);">Total: <b style="color:var(--pc-ink);">${totalGeral.toLocaleString("pt-BR")}</b></div>`;
      return `
      <div id="pcCandidatos2022Overlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:80vh; overflow-y:auto; background:rgba(15,35,27,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <h2 style="margin-bottom:4px;">${nomePartidoExibicao(nomePartido)} — nominata 2022</h2>
          <div class="pc-sub" style="margin-bottom:2px;">${candidatos.length} candidato${candidatos.length === 1 ? "" : "s"}, do mais votado pro menos votado.</div>
          ${qe2022 ? `<div class="pc-sub" style="margin-bottom:14px;">Quociente eleitoral 2022: <b style="color:var(--pc-ink);">~${Math.round(qe2022).toLocaleString("pt-BR")}</b> votos/vaga</div>` : ""}
          ${linhasCand || '<div class="pc-sub">Nenhum candidato de 2022 encontrado.</div>'}
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
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(120,130,180,0.14);">
          <span style="width:26px; font-size:12px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${i + 1}º</span>
          <span style="flex:1; min-width:0; font-size:13.5px; font-weight:600;">${nomeExibicao(c)}<br><span style="font-size:10.5px; font-weight:400; color:var(--pc-ink-dim);">${nomePartidoExibicao(c._partido)}</span></span>
          <span style="font-size:13px; font-weight:600; color:var(--pc-ink-dim); flex-shrink:0;">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      return `
      <div id="pcTop2022Overlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:80vh; overflow-y:auto; background:rgba(15,35,27,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:26px 24px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <h2 style="margin-bottom:4px;">${cargoInfo.label} — top ${top100.length} de 2022</h2>
          <div class="pc-sub" style="margin-bottom:14px;">Os candidatos mais votados na eleição real de 2022, de todos os partidos, do mais votado pro menos votado — só de referência, não muda seu palpite.</div>
          ${linhasTop100 || '<div class="pc-sub">Nenhum candidato de 2022 encontrado.</div>'}
          <button class="primary" id="pcFecharTop2022" style="width:100%; margin-top:18px;">Fechar</button>
        </div>
      </div>`;
    })() : ""}
    <div id="pcPainelEleitoralCard" class="glass-card" style="padding:18px 24px; position:relative;">
      <button id="pcAbrirInstrucao" class="pc-mini-btn" style="position:absolute; top:10px; right:10px; z-index:1;" title="Dica, como montar a lista?">${iconeSvg("alerta", 14)}</button>
      <div style="display:flex; align-items:center; gap:28px; flex-wrap:wrap; padding-right:32px;">
        <div style="flex-shrink:0; text-align:center; line-height:1.25;">
          <div id="pcTituloPainelLinha1" style="font-size:12.5px; font-weight:700; color:var(--pc-ink); white-space:nowrap;">PAINEL</div>
          <div id="pcTituloPainelLinha2" style="font-size:12.5px; font-weight:700; color:var(--pc-ink); white-space:nowrap;">ELEITORAL</div>
        </div>
        <div style="width:1px; height:34px; background:rgba(120,130,180,0.18); flex-shrink:0;"></div>
        <div style="flex-shrink:0;">
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-bottom:2px;">Seus Eleitos</div>
          <div style="font-size:28px; font-weight:700; line-height:1.1;${totalIndicado !== 0 && totalIndicado !== totalVagasCargo ? " color:#ff9500; text-shadow:0 0 12px rgba(255,149,0,.6);" : " color:var(--pc-ink);"}">${totalIndicado}<span style="font-size:13px; color:var(--pc-ink-dim); font-weight:400;"> /${totalVagasCargo}</span></div>
        </div>
        <div style="width:1px; height:34px; background:rgba(120,130,180,0.18); flex-shrink:0;"></div>
        <div style="flex:1; min-width:160px;">
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-bottom:2px; display:flex; align-items:center; gap:4px;">Soma de Votos ${infoTip("Referência de votos válidos estimados: projeta o total de 2022 pelo crescimento do eleitorado até 2026, mantendo as taxas históricas de branco, nulo e comparecimento.")}</div>
          <div style="font-size:16px; font-weight:700; color:var(--pc-ink); line-height:1.2; overflow-wrap:break-word;">${somaTotal.toLocaleString("pt-BR")} <span style="font-size:10.5px; color:var(--pc-ink-dim); font-weight:400;">de ~${Math.round(votosValidos2026Proj).toLocaleString("pt-BR")}</span></div>
        </div>
      </div>
    </div>
    <div class="glass-card" style="padding:14px;">
      <div class="pc-sub" style="margin:0 0 14px;">Plenário — ${totalVagasCargo} vagas</div>
      ${hemiciclo}
      <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);">${legendaPlenario}</div>
    </div>
    <div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:20px;">
      <button id="pcBtnBuscaPartidoToggle" class="pc-mini-btn" title="Buscar partido por nome" style="${pcState.buscaPartidoAberta ? "background:rgba(61,255,176,.18); border-color:var(--pc-accent); color:var(--pc-accent);" : ""}">
        <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
      </button>
      <button id="pcBtnVoltarSelecao" class="pc-mini-btn" title="Desfaz a última alteração feita nesta tela" ${pcState.historicoPalpite.length ? "" : "disabled"}>${iconeSvg("desfazer", 15)}</button>
      <button class="ghost" id="pcBtnZerarTudo" title="Zerar votação de todos" style="display:flex; align-items:center; gap:5px;">${iconeSvg("borracha", 14)}${infoTip("Zere o jogo!<br><br>Aqui você limpa a votação de todo mundo.<br><br>Indicado para aquele jogador mais avançado que deseja indicar a votação de muitos candidatos.")}</button>
      <button id="pcBtnTop2022" class="pc-mini-btn" title="Top 100 mais votados em 2022">${iconeSvg("ano2022", 15)}</button>
      <div style="flex:1;"></div>
      <button id="pcBtnPreencherAutoTudo" class="primary" style="display:flex; align-items:center; gap:8px;">${iconeSvg("completar", 18)} Auto${infoTip("PREENCHIMENTO AUTOMÁTICO<br><br>Precisa de agilidade?<br><br>Este botão aciona a função de preenchimento de votação automática de todos os candidatos.<br><br>Selecione apenas os candidatos que você acha que serão eleitos por ordem e ele faz todo o resto.")}</button>
      <button class="primary" id="pcBtnDepositar" ${totalIndicado === totalVagasCargo ? "" : "disabled"} style="display:flex; align-items:center; gap:8px;">Avançar${infoTip(`Esse é o botão de avançar pro próximo passo. Só fica ativo depois que você indicar todos os ${totalVagasCargo} eleitos — por enquanto está desabilitado.`)}</button>
    </div>
    ${pcState.buscaPartidoAberta ? `
    <div style="position:relative; margin:-12px 0 20px;">
      <svg viewBox="0 0 16 16" width="14" height="14" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--pc-ink-dim); pointer-events:none;"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
      <input type="text" id="pcBuscaPartidoInput" class="cell" placeholder="Buscar partido por nome" value="${pcState.buscaPartido || ""}" style="width:100%; padding-left:34px;">
    </div>` : ""}
    <div class="glass-card">
      ${blocos || `<div class="pc-sub" style="text-align:center; padding:10px 0;">Nenhum partido encontrado.</div>`}
    </div>
  `;

  ajustarTituloPainelEleitoral();
  ajustarBackdropSticky();
  ajustarBarrasTermometro();
  attachListenersSelecao();
}

// Tamanho dos segmentos do termômetro (barraTermometro, acima) — decidido
// aqui, depois do card já estar no DOM, porque depende da largura real
// (varia por aparelho). Duas prioridades, na ordem que o usuário pediu em
// 06/08/2026: (1) se os marcados cabem numa linha só, os segmentos esticam
// pra preencher a largura toda, sem limite de tamanho — mesmo efeito do
// desenho original; (2) só quando não cabem nem no tamanho mínimo (11px,
// vira círculo) é que quebra em várias linhas — e todas as linhas usam o
// MESMO tamanho fixo (calculado dividindo os marcados em linhas
// equilibradas), pra nunca ter uma linha maior que a outra (bug encontrado
// testando com um partido de ~33 marcados, tipo São Paulo: com flex puro,
// a última linha — com poucos itens sobrando — esticava mais que a
// primeira; com grid puro, ele preferia empilhar linhas no tamanho máximo
// em vez de encolher, o oposto do que foi pedido).
function ajustarBarrasTermometro() {
  document.querySelectorAll("#modoColaborativoWrap .pc-term-bar").forEach((bar) => {
    const n = bar.children.length;
    if (!n) return;
    const GAP = 5, MIN = 11, MAX = 32;
    const largura = bar.clientWidth;
    if (!largura) return;
    const larguraNumaLinhaSo = (largura - (n - 1) * GAP) / n;
    let largItem;
    if (larguraNumaLinhaSo >= MIN) {
      largItem = larguraNumaLinhaSo;
    } else {
      const cabemPorLinha = Math.max(1, Math.floor((largura + GAP) / (MIN + GAP)));
      const linhas = Math.ceil(n / cabemPorLinha);
      const porLinha = Math.ceil(n / linhas);
      largItem = Math.min(MAX, (largura - (porLinha - 1) * GAP) / porLinha);
    }
    bar.style.setProperty("--pc-term-w", Math.max(MIN, largItem) + "px");
  });
}

// "PAINEL" / "ELEITORAL" tratado como logotipo: duas linhas centralizadas
// formando um retângulo — mede a largura real de "ELEITORAL" (mais larga,
// já que tem mais letras) e espalha as letras de "PAINEL" (letter-spacing)
// até bater a mesma largura. Não dá pra fazer só em CSS porque a largura de
// cada palavra depende da fonte renderizada; por isso mede depois do render.
function ajustarTituloPainelEleitoral() {
  const linha1 = document.getElementById("pcTituloPainelLinha1");
  const linha2 = document.getElementById("pcTituloPainelLinha2");
  if (!linha1 || !linha2) return;
  linha1.style.letterSpacing = "0px";
  const alvo = linha2.getBoundingClientRect().width;
  const natural = linha1.getBoundingClientRect().width;
  const letras = linha1.textContent.length;
  const espaco = (alvo - natural) / letras;
  linha1.style.letterSpacing = `${espaco}px`;
}

// Estica o preenchimento do backdrop (ver #pcStickyBackdrop no CSS) até
// cobrir exatamente do topo até o fim do card "Painel eleitoral" — cobre o
// vão entre o interruptor de cargo e o card, e o card inteiro, pra nada
// aparecer vazado por trás quando a lista rola por baixo dos dois fixos.
function ajustarBackdropSticky() {
  const preenchimento = document.getElementById("pcStickyBackdropFill");
  const card = document.getElementById("pcPainelEleitoralCard");
  const interruptor = document.querySelector("#pcConteudo > .pc-cargo-switch");
  if (!preenchimento || !card || !interruptor) return;
  // offsetHeight (não getBoundingClientRect) porque o card e o interruptor
  // são sticky — a posição deles na tela muda com a rolagem, mas a altura
  // própria de cada um (offsetHeight) não, então essa soma dá certo em
  // qualquer momento, rolado ou não. Usar getBoundingClientRect aqui já deu
  // bug: depois de rolar e a tela re-renderizar, a conta inflava e o blur
  // cobria a página inteira.
  const margemInterruptor = parseFloat(getComputedStyle(interruptor).marginBottom) || 0;
  const alturaAteFimDoCard = interruptor.offsetHeight + margemInterruptor + card.offsetHeight;
  preenchimento.style.height = `${alturaAteFimDoCard}px`;
}

function attachListenersSelecao() {
  document.querySelectorAll("[data-pc-toggle-partido]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.expandido[btn.dataset.pcTogglePartido] = !pcState.expandido[btn.dataset.pcTogglePartido];
      renderSelecaoCandidatos();
    });
  });
  document.querySelectorAll("input[data-pc-marca]").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const [nomePartido, chave] = e.target.dataset.pcMarca.split("::");
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === nomePartido);
      const c = p.candidatos.find((cc) => String(cc.chave) === chave);
      if (e.target.checked && !podeMarcarMaisUmEleito()) {
        e.target.checked = false;
        abrirAvisoLimiteVagasSeNecessario();
        return;
      }
      snapshotPalpite();
      c.marcadoEleito = e.target.checked;
      renderSelecaoCandidatos();
    });
  });
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
      renderSelecaoCandidatos();
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
    inp.addEventListener("input", (e) => {
      const nomePartido = e.target.dataset.pcBuscaCandidato;
      const valor = e.target.value;
      const cursor = e.target.selectionStart;
      if (!pcState.buscaCandidato) pcState.buscaCandidato = {};
      pcState.buscaCandidato[nomePartido] = valor;
      renderSelecaoCandidatos();
      // A busca reconstrói o innerHTML inteiro (renderSelecaoCandidatos), então
      // o input original perde o foco — reencontra o novo pelo mesmo atributo
      // e devolve o cursor à posição de antes, senão cada letra digitada faria
      // o campo perder o foco.
      const novoInp = document.querySelector(`input[data-pc-busca-candidato="${nomePartido}"]`);
      if (novoInp) {
        novoInp.focus();
        novoInp.setSelectionRange(cursor, cursor);
      }
    });
  });
  const btnBuscaPartidoToggle = document.getElementById("pcBtnBuscaPartidoToggle");
  if (btnBuscaPartidoToggle) {
    btnBuscaPartidoToggle.addEventListener("click", () => {
      pcState.buscaPartidoAberta = !pcState.buscaPartidoAberta;
      renderSelecaoCandidatos();
      if (pcState.buscaPartidoAberta) {
        const inp = document.getElementById("pcBuscaPartidoInput");
        if (inp) inp.focus();
      }
    });
  }
  const inputBuscaPartido = document.getElementById("pcBuscaPartidoInput");
  if (inputBuscaPartido) {
    inputBuscaPartido.addEventListener("input", (e) => {
      const cursor = e.target.selectionStart;
      pcState.buscaPartido = e.target.value;
      renderSelecaoCandidatos();
      // O innerHTML inteiro é reconstruído (renderSelecaoCandidatos), então
      // o input original perde o foco — reencontra o novo e devolve o
      // cursor à posição de antes, senão cada letra digitada tira o foco.
      const novoInp = document.getElementById("pcBuscaPartidoInput");
      if (novoInp) {
        novoInp.focus();
        novoInp.setSelectionRange(cursor, cursor);
      }
    });
  }
  document.querySelectorAll("[data-pc-busca-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nomePartido = btn.dataset.pcBuscaToggle;
      if (!pcState.buscaCandidatoAberta) pcState.buscaCandidatoAberta = {};
      pcState.buscaCandidatoAberta[nomePartido] = !pcState.buscaCandidatoAberta[nomePartido];
      renderSelecaoCandidatos();
      if (pcState.buscaCandidatoAberta[nomePartido]) {
        const inp = document.querySelector(`input[data-pc-busca-candidato="${nomePartido}"]`);
        if (inp) inp.focus();
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
      renderSelecaoCandidatos();
    });
  });
  document.querySelectorAll("[data-pc-zerar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcZerar);
      snapshotPalpite();
      zerarPartidoSelecao(p);
      renderSelecaoCandidatos();
    });
  });
  document.querySelectorAll("[data-pc-inc]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!podeMarcarMaisUmEleito()) { abrirAvisoLimiteVagasSeNecessario(); return; }
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcInc);
      snapshotPalpite();
      incrementarEleitosPartido(p);
      renderSelecaoCandidatos();
    });
  });
  document.querySelectorAll("[data-pc-dec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcDec);
      snapshotPalpite();
      decrementarEleitosPartido(p);
      renderSelecaoCandidatos();
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
      renderSelecaoCandidatos();
    });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  });
  document.querySelectorAll("[data-pc-add-cand]").forEach((btn) => {
    btn.addEventListener("click", () => {
      adicionarCandidatoNoPartido(pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcAddCand));
    });
  });
  document.querySelectorAll("[data-pc-partido-card]").forEach((card) => {
    card.addEventListener("mouseleave", () => {
      if (!pcState.ordemPartidosFixa) return;
      pcState.ordemPartidosFixa = null; // libera a reordenação de verdade só agora, com o mouse já fora
      renderSelecaoCandidatos();
    });
  });
  document.getElementById("pcBtnVoltarSelecao").addEventListener("click", desfazerPalpite);
  document.getElementById("pcBtnPreencherAutoTudo").addEventListener("click", () => {
    pedirConfirmacaoAutoPreenchimento(null);
  });
  document.getElementById("pcBtnZerarTudo").addEventListener("click", () => {
    snapshotPalpite();
    zerarTudoSelecao();
    renderSelecaoCandidatos();
  });
  const fecharInstrucao = document.getElementById("pcFecharInstrucao");
  if (fecharInstrucao) {
    fecharInstrucao.addEventListener("click", () => {
      pcState.instrucaoSelecaoAberta = false;
      renderSelecaoCandidatos();
    });
  }
  const overlayInstrucao = document.getElementById("pcInstrucaoOverlay");
  if (overlayInstrucao) {
    overlayInstrucao.addEventListener("click", (e) => {
      if (e.target.id === "pcInstrucaoOverlay") {
        pcState.instrucaoSelecaoAberta = false;
        renderSelecaoCandidatos();
      }
    });
  }
  const abrirInstrucao = document.getElementById("pcAbrirInstrucao");
  if (abrirInstrucao) {
    abrirInstrucao.addEventListener("click", () => {
      pcState.instrucaoSelecaoAberta = true;
      renderSelecaoCandidatos();
    });
  }
  const fecharAvisoLimite = document.getElementById("pcFecharAvisoLimite");
  if (fecharAvisoLimite) {
    fecharAvisoLimite.addEventListener("click", () => {
      const naoMostrar = document.getElementById("pcNaoMostrarAvisoLimite");
      if (naoMostrar && naoMostrar.checked) salvarAvisoLimiteVagasOculto(true);
      pcState.avisoLimiteVagasAberto = false;
      renderSelecaoCandidatos();
    });
  }
  const overlayAvisoLimite = document.getElementById("pcAvisoLimiteOverlay");
  if (overlayAvisoLimite) {
    overlayAvisoLimite.addEventListener("click", (e) => {
      if (e.target.id === "pcAvisoLimiteOverlay") {
        pcState.avisoLimiteVagasAberto = false;
        renderSelecaoCandidatos();
      }
    });
  }
  const cancelarAuto = document.getElementById("pcBtnCancelarAuto");
  if (cancelarAuto) {
    cancelarAuto.addEventListener("click", () => {
      pcState.confirmAutoPreenchimentoAberto = false;
      pcState.confirmAutoPreenchimentoAcao = null;
      renderSelecaoCandidatos();
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
        renderSelecaoCandidatos();
      }
    });
  }
  document.querySelectorAll("[data-pc-ver2022]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.candidatos2022Aberto = btn.dataset.pcVer2022;
      renderSelecaoCandidatos();
    });
  });
  const fecharCandidatos2022 = document.getElementById("pcFecharCandidatos2022");
  if (fecharCandidatos2022) {
    fecharCandidatos2022.addEventListener("click", () => {
      pcState.candidatos2022Aberto = null;
      renderSelecaoCandidatos();
    });
  }
  const overlayCandidatos2022 = document.getElementById("pcCandidatos2022Overlay");
  if (overlayCandidatos2022) {
    overlayCandidatos2022.addEventListener("click", (e) => {
      if (e.target.id === "pcCandidatos2022Overlay") {
        pcState.candidatos2022Aberto = null;
        renderSelecaoCandidatos();
      }
    });
  }
  document.getElementById("pcBtnTop2022").addEventListener("click", () => {
    pcState.top2022Aberto = true;
    renderSelecaoCandidatos();
  });
  const fecharTop2022 = document.getElementById("pcFecharTop2022");
  if (fecharTop2022) {
    fecharTop2022.addEventListener("click", () => {
      pcState.top2022Aberto = false;
      renderSelecaoCandidatos();
    });
  }
  const overlayTop2022 = document.getElementById("pcTop2022Overlay");
  if (overlayTop2022) {
    overlayTop2022.addEventListener("click", (e) => {
      if (e.target.id === "pcTop2022Overlay") {
        pcState.top2022Aberto = false;
        renderSelecaoCandidatos();
      }
    });
  }
  document.getElementById("pcBtnDepositar").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
    else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  });
}

// ---------- Revisão + cerimônia de depósito da cédula ----------

// Tela revisora: lista nominal completa, ordem decrescente de votação
// (cruzando todos os partidos), agrupada por cargo em acordeões — hoje só
// Dep. Estadual tem dado real, os outros dois cargos entram aqui quando
// tiverem candidatos carregados (mesmo componente, ver CARGOS).
// Classifica os 40 marcados como "eleito por QP" (quociente partidário direto,
// art. 107) ou "eleito por média" (sobra distribuída pelo método das médias,
// art. 109) — mesma distinção que o TSE usa nos dados reais (ver
// ferramentas/tratar_resultados_2022.py, DS_SIT_TOT_TURNO). QE calculado com
// o total de votos de TODOS os candidatos de todos os partidos (marcados ou
// não, incluindo legenda — é assim que QP é calculado de verdade: o voto de
// legenda soma no total do partido mesmo sem elegar ninguém sozinho).
// A marcação da pessoa continua sendo o que decide quem aparece como eleito
// aqui — nunca troca ninguém sozinho. Mas cada indicação que não bateria com
// o resultado "de verdade" (calculado só a partir da votação digitada, sem
// olhar quem está marcado — ver dhondtComCorte em calculo/eleitoral.js)
// ganha um aviso com o tanto de votos que faltaria, pro partido ou pro
// próprio candidato, pra virar eleição de fato. Pura informação; a escolha
// continua inteira da pessoa.
function classificarEleitosPorPartido(listaParam, cargo) {
  const lista = listaParam || pcState.palpiteEdicao;
  // Número fixo (não soma a partir de "lista", que pode estar parcial
  // enquanto nem todo partido tem ata de 2026 processada) — precisa do
  // "cargo" explícito porque essa função é chamada com listas de cargos
  // diferentes do pcState.cargoAtivo (Revisão e impressão mostram os 3
  // cargos ao mesmo tempo, ver renderRevisaoDeposito/montarSecaoImpressaoCargo).
  const cargoResolvido = cargo || pcState.cargoAtivo;
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargoResolvido);
  // Senador é cargo MAJORITÁRIO (art. 46 da Constituição) — as vagas em
  // disputa (2 no ciclo 2026, ver VAGAS_SENADOR_2026) vão pra quem tiver
  // mais voto individual, sem quociente eleitoral nem D'Hondt: esses dois
  // são regra de proporcional (Dep. Estadual/Federal), não existem pra
  // Senado. Ramo separado, achado em 04/08/2026 — antes disso a Revisão
  // tratava Senador como se fosse proporcional, o que podia marcar como
  // "inconsistente" um candidato que na verdade venceria (ou o contrário).
  if (cargoResolvido === "senador") {
    return classificarEleitosMajoritario(lista, totalVagasCargo);
  }
  const totalValidos = lista.reduce((s, p) => s + partyVotos(p), 0);
  const qe = quocienteEleitoral(totalValidos, totalVagasCargo);
  const { counts: cadeirasPorPartido, corte } = dhondtComCorte(lista, totalVagasCargo);
  const resultado = [];
  lista.forEach((p, pIdx) => {
    const marcados = p.candidatos.filter((c) => c.marcadoEleito && c.fonte !== "legenda");
    if (!marcados.length) return;
    const votosPartido = partyVotos(p);
    const qp = qe ? Math.min(marcados.length, Math.floor(votosPartido / qe)) : 0;

    // Quem o partido elegeria de verdade com a votação atual, ordenado só
    // pelos votos de cada candidato real (nunca pela marcação manual).
    const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
    const reaisOrdenados = [...p.candidatos]
      .filter((c) => c.fonte !== "legenda")
      .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const verdadeirosEleitos = new Set(reaisOrdenados.slice(0, cadeirasReais).map((c) => c.chave));
    // dhondtComCorte calcula cadeiras a partir dos VOTOS do partido, sem
    // saber quantos candidatos de verdade existem na lista (pode ficar
    // maior que reaisOrdenados.length se a chapa do partido estiver
    // incompleta — ex.: só fictício/real parcial ainda, ou um "palpite"
    // salvo de uma rodada de dados anterior). Sem essa proteção, a tela de
    // Revisão inteira quebrava com "Cannot read properties of undefined
    // (reading 'votos')" — achado em 04/08/2026.
    const ultimoEleitoDeVerdade = cadeirasReais > 0 ? reaisOrdenados[cadeirasReais - 1] : null;
    const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;

    const ordenados = [...marcados].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    ordenados.forEach((c, i) => {
      const consistente = verdadeirosEleitos.has(c.chave);
      let gap = null;
      if (!consistente) {
        const ultimoRealEleito = cadeirasReais > 0 ? reaisOrdenados[cadeirasReais - 1] : null;
        // O que importa não é "quantos foram marcados" — é se a vaga que
        // seria disputada (a última vaga real, hoje) já é de OUTRO
        // candidato marcado. Se for, ultrapassar essa pessoa por 1-2 votos
        // só troca um problema pelo outro (ping-pong). Se a vaga for de
        // alguém que não foi marcado, ultrapassar é seguro — sobra a vaga
        // real de qualquer forma.
        const gapIndividual = cadeirasReais > 0 ? Math.max(0, votosDoUltimoEleitoDeVerdade - (Number(c.votos) || 0) + 1) : null;
        const necessarioPartido = Math.floor(corte * (cadeirasReais + 1)) + 1;
        const gapPartido = Math.max(0, necessarioPartido - votosPartido);
        // Mesma correção de listaUnificadaRevisao: se tem outro não-eleito do
        // mesmo partido com mais voto que este candidato (ranqueado acima
        // dele, abaixo do corte), só bater o partido/último eleito não
        // basta — precisa também superar esse rival de cima.
        const posAtual = reaisOrdenados.findIndex((rc) => rc.chave === c.chave);
        const rivalDeCima = posAtual > cadeirasReais ? reaisOrdenados[cadeirasReais] : null;
        const gapRivalDeCima = rivalDeCima ? Math.max(0, (Number(rivalDeCima.votos) || 0) - (Number(c.votos) || 0) + 1) : 0;
        const acrescimo = Math.max(gapPartido, gapIndividual || 0, gapRivalDeCima);
        gap = { individual: gapIndividual, partido: gapPartido, acrescimo };
      }
      resultado.push({ chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos: Number(c.votos) || 0, tag: i < qp ? "QP" : "média", consistente, gap });
    });
  });
  return resultado.sort((a, b) => b.votos - a.votos);
}

// Vencedores de cargo MAJORITÁRIO (Senador — ver ramo em
// classificarEleitosPorPartido acima). As N vagas em disputa vão pra quem
// tiver mais votos individuais, juntando os candidatos de TODOS os
// partidos numa fila só — sem quociente eleitoral, sem D'Hondt, sem
// "cadeira por partido" (o partido/coligação só decide QUEM pode
// concorrer, não quantas vagas ele "ganha"). Mesmo formato de retorno de
// classificarEleitosPorPartido (chave/nome/partido/votos/tag/consistente/
// gap), pra servir nos mesmos lugares (Revisão, impressão, compartilhado)
// sem precisar adaptar quem chama.
function classificarEleitosMajoritario(lista, totalVagasCargo) {
  // "partido" aqui precisa ser p.nome (o nome do card/federação), igual ao
  // ramo proporcional acima — é essa string que o editor de voto da
  // Revisão (data-pc-voto-revisao) usa pra achar de volta o partido em
  // pcState.palpitesPorCargo; usar c.partidoOriginal aqui quebraria esse
  // lookup sempre que o candidato for de federação.
  const todosReais = [];
  lista.forEach((p) => {
    p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => {
      todosReais.push({ ...c, _partidoExibicao: p.nome });
    });
  });
  const ordenados = [...todosReais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const verdadeirosEleitos = new Set(ordenados.slice(0, totalVagasCargo).map((c) => c.chave));
  const ultimoEleitoDeVerdade = totalVagasCargo > 0 ? ordenados[totalVagasCargo - 1] : null;
  const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;

  const marcados = todosReais.filter((c) => c.marcadoEleito);
  const marcadosOrdenados = [...marcados].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const resultado = marcadosOrdenados.map((c) => {
    const consistente = verdadeirosEleitos.has(c.chave);
    let gap = null;
    if (!consistente) {
      // gap.partido fica null de propósito (não existe "quociente
      // partidário" pra cargo majoritário) — o texto/botão da Revisão que
      // usa gap.partido (linha ~2451/2458) já trata null como "não se
      // aplica a este cargo", ver comentário lá.
      const gapIndividual = Math.max(0, votosDoUltimoEleitoDeVerdade - (Number(c.votos) || 0) + 1);
      gap = { individual: gapIndividual, partido: null, acrescimo: gapIndividual };
    }
    return { chave: c.chave, nome: nomeExibicao(c), partido: c._partidoExibicao, votos: Number(c.votos) || 0, tag: "majoritário", consistente, gap };
  });
  return resultado.sort((a, b) => b.votos - a.votos);
}

// Próximos mais votados fora dos 40 marcados — mesmo espírito de "suplente"
// (quem ficaria em seguida na fila, por votação, se algum titular saísse).
// Não é o cálculo oficial de suplência (que segue a ordem dentro do próprio
// partido do titular) — aqui é um ranking simples entre todos os partidos,
// só pra dar visibilidade a quem quase entrou.
function proximosSuplentes(limite, listaParam) {
  const lista = listaParam || pcState.palpiteEdicao;
  const todos = [];
  lista.forEach((p) => {
    p.candidatos.filter((c) => !c.marcadoEleito && c.fonte !== "legenda").forEach((c) => {
      todos.push({ chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos: Number(c.votos) || 0 });
    });
  });
  return todos.sort((a, b) => b.votos - a.votos).slice(0, limite);
}

// Garante que os 3 cargos tenham uma lista pronta em pcState.palpitesPorCargo
// — usa o palpite JÁ EM MEMÓRIA (pcState.palpiteEdicao) pro cargo ativo
// agora (preserva o que a pessoa acabou de editar), e carrega do zero (base
// 2022 + candidatos 2026) pros outros dois na primeira vez que a Revisão é
// aberta nesta sessão — depois disso, qualquer edição feita ali dentro (em
// qualquer um dos 3 cargos) fica guardada aqui e sobrevive a re-renders.
function garantirPalpitesPorCargo() {
  if (!pcState.palpitesPorCargo) pcState.palpitesPorCargo = {};
  CARGOS.forEach((c) => {
    if (c.id === pcState.cargoAtivo && pcState.palpiteEdicao) {
      pcState.palpitesPorCargo[c.id] = pcState.palpiteEdicao;
    } else if (!pcState.palpitesPorCargo[c.id]) {
      // Prioridade: rascunho salvo (já carregado em pcState.rascunhosCache
      // por garantirRascunhosCarregados, chamado antes de qualquer tela
      // aparecer — ver initColaborativo e o picker de estado) > base nova.
      const rascunho = pcState.rascunhosCache && pcState.rascunhosCache[c.id];
      pcState.palpitesPorCargo[c.id] = rascunho || montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
    }
  });
  CARGOS.forEach((c) => agendarAutoSaveRascunho(c.id, pcState.palpitesPorCargo[c.id]));
}

// Monta uma seção limpa (sem caixa de voto editável, sem botões de ajuste —
// só texto) pra impressão/PDF de um cargo, a partir do que está em
// pcState.palpitesPorCargo (mesma fonte que a Revisão edita).
function montarSecaoImpressaoCargo(cargo) {
  const cargoInfo = CARGOS.find((c) => c.id === cargo);
  const lista = pcState.palpitesPorCargo[cargo];
  const eleitos = classificarEleitosPorPartido(lista, cargo);
  const suplentes = proximosSuplentes(30, lista);
  const linha = (c, i, rotulo) => `
    <div style="display:flex; justify-content:space-between; gap:10px; padding:4px 0; border-bottom:1px solid #ddd; font-size:12px;">
      <span style="width:28px; flex-shrink:0;">${i + 1}º</span>
      <span style="flex:1; min-width:0;">${c.nome} <span style="color:#666;">— ${c.partido}</span>${rotulo ? ` <span style="font-size:10px; color:#888;">(${rotulo})</span>` : ""}</span>
      <span style="flex-shrink:0;">${c.votos.toLocaleString("pt-BR")}</span>
    </div>`;
  return `
    <h2 style="margin:22px 0 3px; font-size:15px;">${cargoInfo.label}</h2>
    <div style="font-size:11px; color:#666; margin-bottom:8px;">${eleitos.length} eleitos + ${suplentes.length} suplentes</div>
    ${eleitos.map((c, i) => linha(c, i)).join("") || '<div style="font-size:12px; color:#888;">Nenhum candidato marcado ainda pra este cargo.</div>'}
    ${suplentes.map((c, i) => linha(c, eleitos.length + i, "suplente")).join("")}
  `;
}

// Texto do tooltip "i" no selo "eleito · QP/média/majoritário" da Revisão
// — explica o MECANISMO de verdade por trás de cada tag, em vez de deixar
// a sigla sozinha. Pedido do usuário em 05/08/2026 (junto com a correção
// do texto "você não marcou esse" que estava quebrando linha feio — virou
// tooltip próprio, ver warnTip em linhaEleitoReal).
// `detalhe` (opcional, ver eleitosReaisPorPartido) acrescenta os números
// DESSE caso específico depois da explicação genérica da regra — pedido do
// usuário em 06/08/2026: "é possível indicar a votação do caso específico?
// Quantos votos para cada cargo, e qual foi a votação da sobra?".
function explicacaoTag(tag, detalhe) {
  if (tag === "QP") {
    const generico = "Elegeu-se pelo <b>quociente partidário</b> (Código Eleitoral, art. 107): o partido teve votos suficientes pra garantir essa vaga direto, sem depender de sobra.";
    if (!detalhe) return generico;
    return `${generico}<br><br>Nesse caso: o partido teve <b>${detalhe.votosPartido.toLocaleString("pt-BR")}</b> votos, o quociente eleitoral do cargo é <b>${detalhe.qe.toLocaleString("pt-BR")}</b> — ${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.qe.toLocaleString("pt-BR")} = <b>${detalhe.qp}</b> vaga${detalhe.qp === 1 ? "" : "s"} garantida${detalhe.qp === 1 ? "" : "s"} por quociente (essa é uma delas).`;
  }
  if (tag === "média") {
    const generico = "Elegeu-se pela <b>distribuição de sobras</b> (método das médias, art. 109): depois das vagas garantidas pelo quociente partidário, as vagas restantes vão pro partido com a maior média (votos ÷ (vagas já obtidas + 1)) a cada rodada — por isso alguém com menos voto individual pode se eleger antes de outro com mais voto, se o partido dele estiver melhor posicionado nessa média.";
    if (!detalhe) return generico;
    return `${generico}<br><br>Nesse caso: essa foi a <b>${detalhe.cadeiraDoPartido}ª</b> cadeira do partido — ${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.cadeiraDoPartido} = média de <b>${Math.round(detalhe.mediaConquistada).toLocaleString("pt-BR")}</b> votos, a que garantiu essa vaga na disputa de sobra.`;
  }
  if (tag === "majoritário") {
    const generico = "Cargo majoritário (Senado): não existe quociente partidário nem sobra aqui — as vagas vão direto pra quem tiver mais voto individual, juntando todos os partidos numa fila só.";
    if (!detalhe) return generico;
    return `${generico}<br><br>Nesse caso: <b>${detalhe.posicaoGeral}º</b> colocado entre todos os candidatos ao cargo, que tem <b>${detalhe.totalVagasCargo}</b> vaga${detalhe.totalVagasCargo === 1 ? "" : "s"} em disputa.`;
  }
  return "";
}

// Lista única da Revisão (substitui as 3 listas separadas — eleitos,
// pendentes, suplentes — usadas até 06/08/2026): TODOS os candidatos
// reais do cargo, ordenados por votação decrescente, cada um já marcado
// com "eleito" (e a tag/detalhe de por quê) ou, se não eleito, o "gap"
// (quanto falta pra fechar vaga) — a mesma informação que antes só
// existia pros candidatos marcados pelo usuário, agora calculada pra
// todo mundo. `posicaoEleicao` é sequencial só entre quem é eleito (1,
// 2, 3... até o total de vagas), na ordem em que aparecem nesta lista —
// não é a posição geral de voto, é a ordem de eleição (pedido do usuário
// em 06/08/2026: "mesmo que tenha um deputado com mais votos e não
// eleito na frente").
function listaUnificadaRevisao(listaParam, cargo) {
  const lista = listaParam || pcState.palpiteEdicao;
  const cargoResolvido = cargo || pcState.cargoAtivo;
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargoResolvido);
  const resultado = [];

  if (cargoResolvido === "senador") {
    const todos = [];
    lista.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todos.push({ ...c, _partidoExibicao: p.nome })));
    const ordenados = [...todos].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const votosDoUltimo = totalVagasCargo > 0 && ordenados[totalVagasCargo - 1] ? (Number(ordenados[totalVagasCargo - 1].votos) || 0) : 0;
    ordenados.forEach((c, i) => {
      const eleito = i < totalVagasCargo;
      const votos = Number(c.votos) || 0;
      resultado.push({
        chave: c.chave, nome: nomeExibicao(c), partido: c._partidoExibicao, votos, eleito,
        tag: eleito ? "majoritário" : null,
        detalhe: eleito ? { posicaoGeral: i + 1, totalVagasCargo } : null,
        gap: eleito ? null : { individual: Math.max(0, votosDoUltimo - votos + 1), partido: null, acrescimo: Math.max(0, votosDoUltimo - votos + 1) },
        marcadoPeloUsuario: !!c.marcadoEleito,
      });
    });
  } else {
    const { counts: cadeirasPorPartido, corte } = dhondtComCorte(lista, totalVagasCargo);
    const totalValidos = lista.reduce((s, p) => s + partyVotos(p), 0);
    const qe = quocienteEleitoral(totalValidos, totalVagasCargo);
    lista.forEach((p, pIdx) => {
      const votosPartido = partyVotos(p);
      const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
      const qp = qe ? Math.min(cadeirasReais, Math.floor(votosPartido / qe)) : 0;
      const reaisOrdenados = [...p.candidatos]
        .filter((c) => c.fonte !== "legenda")
        .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      const ultimoEleitoDeVerdade = cadeirasReais > 0 ? reaisOrdenados[cadeirasReais - 1] : null;
      const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;
      reaisOrdenados.forEach((c, i) => {
        const eleito = i < cadeirasReais;
        const votos = Number(c.votos) || 0;
        if (eleito) {
          const cadeiraDoPartido = i + 1;
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: true,
            tag: i < qp ? "QP" : "média",
            detalhe: { votosPartido, qe, qp, cadeirasReais, cadeiraDoPartido, mediaConquistada: votosPartido / cadeiraDoPartido },
            gap: null, marcadoPeloUsuario: !!c.marcadoEleito,
          });
        } else {
          const necessarioPartido = Math.floor(corte * (cadeirasReais + 1)) + 1;
          const gapPartido = Math.max(0, necessarioPartido - votosPartido);
          const gapIndividual = cadeirasReais > 0 ? Math.max(0, votosDoUltimoEleitoDeVerdade - votos + 1) : null;
          // Quando tem outro candidato NÃO ELEITO do mesmo partido com mais
          // voto que este (ranqueado entre ele e o corte — ex.: usuário
          // marcou o 2º da fila, não o 1º), só bater o partido/último eleito
          // não basta: a vaga nova iria pro rival de cima, não pra este.
          // reaisOrdenados[cadeirasReais] é sempre quem tem MAIS voto entre
          // os não eleitos (lista ordenada decrescente) — superar só ele já
          // garante superar os outros rivais de cima também.
          const rivalDeCima = i > cadeirasReais ? reaisOrdenados[cadeirasReais] : null;
          const gapRivalDeCima = rivalDeCima ? Math.max(0, (Number(rivalDeCima.votos) || 0) - votos + 1) : 0;
          const acrescimo = Math.max(gapPartido, gapIndividual || 0, gapRivalDeCima);
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: false,
            tag: null, detalhe: null,
            gap: { individual: gapIndividual, partido: gapPartido, acrescimo, votosPartido, temRivalAcima: !!rivalDeCima },
            marcadoPeloUsuario: !!c.marcadoEleito,
          });
        }
      });
    });

    // Caso extremo: se TODO o cargo estiver com voto zerado (ex.: pessoa
    // clicou "Zerar"), dhondtComCorte devolve todas as cadeiras em 0
    // (atalho em calculo/eleitoral.js, não dá pra distribuir vaga sem
    // nenhum voto pra comparar) — sem essa proteção, a lista mostrava "0
    // eleitos" e quebrava a garantia de "sempre N eleitos" (confirmada
    // com o usuário em 05/08/2026). Sem sinal de voto nenhum, não tem
    // base matemática pra escolher quem "ganharia" de verdade — promove
    // pra eleito, de forma determinística, quem tem mais voto de 2022
    // (maior primeiro) até fechar o total de vagas. Reaproveita a mesma
    // ideia de fallback que a função antiga (eleitosReaisPorPartido)
    // tinha, adaptada pra lista única. Achado testando ao vivo em
    // 07/08/2026.
    if (resultado.filter((c) => c.eleito).length < totalVagasCargo) {
      const votos2022PorChave = {};
      lista.forEach((p) => p.candidatos.forEach((c) => { votos2022PorChave[c.chave] = Number(c.votos2022) || 0; }));
      const faltam = totalVagasCargo - resultado.filter((c) => c.eleito).length;
      resultado.filter((c) => !c.eleito)
        .sort((a, b) => (votos2022PorChave[b.chave] || 0) - (votos2022PorChave[a.chave] || 0))
        .slice(0, faltam)
        .forEach((c) => {
          c.eleito = true;
          c.tag = "média";
          c.detalhe = { votosPartido: 0, qe: 0, qp: 0, cadeirasReais: 0, cadeiraDoPartido: 0, mediaConquistada: 0 };
          c.gap = null;
        });
    }
  }

  resultado.sort((a, b) => b.votos - a.votos);
  let contador = 0;
  resultado.forEach((c) => { if (c.eleito) { contador++; c.posicaoEleicao = contador; } });
  return resultado;
}

// Efetiva o Salvar depois que a lista já tem nome (primeira vez, via modal
// de nomear — ver pcBtnConfirmarNomeLista) ou já tinha (salvamento
// seguinte da mesma lista, silencioso). gera o id exclusivo na primeira
// vez só, e reaproveita depois — cada clique de Salvar é uma ATUALIZAÇÃO
// da mesma lista, não uma lista nova.
async function executarSalvarLista() {
  // Logado grava em "salvamentos"/"listas_salvas" de verdade (Supabase) —
  // cria na 1ª vez (listaSalvaId ainda null), atualiza em cima da mesma
  // linha nas vezes seguintes (nunca duplica). Convidado continua local
  // (window.storage), porque "salvamentos" exige perfil_id — sem cadastro
  // não tem onde gravar isso no banco.
  if (pcState.perfil) {
    if (!pcState.listaSalvaId) {
      const { data, error } = await salvarSalvamento(pcState.perfil.id, pcState.estado, pcState.listaSalvaNome, pcState.palpitesPorCargo);
      if (error) { document.getElementById("pcDepositoStatus").textContent = "Erro ao salvar: " + error.message; return; }
      pcState.listaSalvaId = data.id;
    } else {
      const { error } = await atualizarSalvamento(pcState.listaSalvaId, pcState.palpitesPorCargo);
      if (error) { document.getElementById("pcDepositoStatus").textContent = "Erro ao salvar: " + error.message; return; }
    }
  } else {
    pcState.listaSalvaId = pcState.listaSalvaId || gerarIdLista();
    await persistirListaSalvaLocal();
  }
  // Continua gravando em "palpites" também (Quadro de Médias público) —
  // tabela separada, 1 linha por pessoa, não mexe com "salvamentos".
  if (pcState.perfil) {
    const { error } = await salvarPalpiteCompleto(pcState.perfil.id, pcState.palpiteEdicao);
    if (error) { document.getElementById("pcDepositoStatus").textContent = "Erro ao salvar: " + error.message; return; }
    pcState.subaba = "deposito-confirmado";
    renderAppColaborativo();
  } else {
    pcState.tela = "deposito-confirmado";
    renderColaborativo();
  }
}

function renderRevisaoDeposito() {
  const conteudo = document.getElementById("pcConteudo");
  garantirPalpitesPorCargo();

  let temInconsistenciaGeral = false;

  const secoesHtml = CARGOS.map((cargoDef) => {
    const lista = pcState.palpitesPorCargo[cargoDef.id];
    // Lista única — TODOS os candidatos reais do cargo, ordenados por
    // votação decrescente, cada um já marcado "eleito" (com a tag/detalhe
    // de por quê) ou, se não, o "gap" pra fechar vaga. Substitui as 3
    // listas separadas (eleitos/pendentes/suplentes) usadas até
    // 06/08/2026 — pedido do usuário: parecer mais com o boletim oficial
    // (uma lista só por votação, com o selo "eleito" só em quem realmente
    // ganhou, mesmo que outro acima dele na lista tenha mais voto e não
    // seja eleito).
    const listaCompleta = listaUnificadaRevisao(lista, cargoDef.id);
    const totalEleitos = listaCompleta.filter((c) => c.eleito).length;
    const marcadosInconsistentes = listaCompleta.filter((c) => !c.eleito && c.marcadoPeloUsuario);
    const temInconsistencia = marcadosInconsistentes.length > 0;
    if (temInconsistencia) temInconsistenciaGeral = true;

    // "Mínimo pra eleger" — referência única de folga/progresso, mostrada
    // em toda barra desta seção (eleito ou não): o corte de
    // dhondtComCorte (proporcional) ou o voto do último colocado real
    // (majoritário) — mesmo conceito de "linha de corte" já usado em
    // outros lugares do app, agora também visível na Revisão. Pedido do
    // usuário em 06/08/2026.
    const totalVagasCargoDef = vagasFixasCargo(pcState.estado, cargoDef.id);
    let minimoParaEleger = 0;
    if (cargoDef.id === "senador") {
      const todosReaisOrdenados = [];
      lista.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todosReaisOrdenados.push(c)));
      todosReaisOrdenados.sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      minimoParaEleger = totalVagasCargoDef > 0 && todosReaisOrdenados[totalVagasCargoDef - 1] ? (Number(todosReaisOrdenados[totalVagasCargoDef - 1].votos) || 0) : 0;
    } else {
      const { corte } = dhondtComCorte(lista, totalVagasCargoDef);
      minimoParaEleger = Math.ceil(corte);
    }

    // Barra fina (mesma família visual do termômetro da Seleção) no lugar
    // do texto corrido — eleito mostra a folga acima do mínimo, quem não
    // é eleito mostra o progresso até fechar a vaga (agora calculado pra
    // TODO mundo, não só pra quem foi marcado — pedido do usuário em
    // 06/08/2026). opacidade mais baixa pros eleitos (sempre 100% cheios
    // — não precisam chamar atenção, já estão garantidos) e cheia pros
    // demais (é o que ainda pode mudar).
    const barraProgresso = (pct, opacidade = 1) => `
      <div style="position:relative; flex:1; height:4px; border-radius:999px; background:#182f24; overflow:hidden;">
        <div style="position:absolute; left:0; top:0; height:100%; width:${Math.max(0, Math.min(100, pct))}%; border-radius:999px; background:var(--pc-accent); opacity:${opacidade};"></div>
      </div>`;

    // Card fechado (fundo + borda + cantos arredondados) em vez de linha
    // com traço embaixo — separação mais visível entre candidatos, pedido
    // do usuário em 06/08/2026.
    // --pc-lobby-tom-3 é a camada de tom mais clara já definida no padrão
    // "Lobby" (css/estilo.css) — antes usava um verde quase idêntico ao
    // fundo do acordeão (#0e1f17 vs #0c1c16), então os cards praticamente
    // sumiam um dentro do outro. Pedido do usuário em 06/08/2026.
    const cardCandidato = (conteudo) => `<div style="background:var(--pc-lobby-tom-3); border:1px solid #1d3a2c; border-radius:12px; padding:12px 14px; margin-bottom:8px;">${conteudo}</div>`;

    // Uma linha só, pra eleito ou não — o selo numerado (1, 2, 3... na
    // ORDEM DE ELEIÇÃO, não na posição de voto da lista) só aparece em
    // quem é eleito, sem reservar espaço em quem não é (senão sobrava um
    // "buraco" à esquerda nas linhas sem selo — achado testando ao vivo
    // em 06/08/2026). Etiqueta "eleito · QP/média/majoritário" só em quem
    // ganhou; ninguém mais tem etiqueta (nem "seu palpite", nem
    // "suplente" — dispensadas a pedido do usuário, a barra com "faltam X
    // votos" já carrega a informação sozinha). Botão mágico só aparece em
    // quem VOCÊ marcou — não faz sentido "consertar" a votação de gente
    // que você nem escolheu no seu palpite.
    const linhaCandidato = (c) => {
      const votos = Number(c.votos) || 0;

      if (c.eleito) {
        const margem = Math.max(0, votos - minimoParaEleger);
        // "Mínimo pra eleger" só é uma comparação justa no Senador (voto
        // individual direto). Em Estadual/Federal é uma média do CARGO
        // inteiro — comparar com o voto pessoal de alguém eleito por
        // quociente partidário (QP) dava "+0 de folga" mesmo pra quem
        // está 100% garantido pelo total do partido, não pelo próprio
        // voto. Achado testando ao vivo em 06/08/2026 — só mostra a
        // margem onde ela é matematicamente correta.
        const mostrarMargem = cargoDef.id === "senador";
        return cardCandidato(`
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="flex-shrink:0; width:30px; height:30px; border-radius:9px; background:rgba(61,255,176,.1); border:1px solid rgba(61,255,176,.3); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:var(--pc-accent);">${c.posicaoEleicao}</div>
            <div style="min-width:0; flex:1;">
              <div style="font-size:16px; font-weight:700; color:var(--pc-ink); display:flex; align-items:center; gap:5px;">
                ${c.nome}
                ${!c.marcadoPeloUsuario ? warnTip("Você não marcou esse candidato como eleito no seu palpite — é quem realmente fecharia essa vaga com a votação de hoje.") : ""}
              </div>
              <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                <span style="width:7px; height:7px; border-radius:50%; background:var(--pc-accent); flex-shrink:0;"></span>
                <span style="font-size:11px; font-weight:600; color:var(--pc-accent);">${c.partido}</span>
              </div>
            </div>
            <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:112px; font-size:16px; font-weight:800; text-align:right; flex-shrink:0;">
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px;">
            ${barraProgresso(100, 0.4)}
            <span style="flex-shrink:0; display:flex; align-items:center; gap:3px; font-size:9.5px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; border-radius:6px; padding:3px 8px; color:var(--pc-accent); background:rgba(61,255,176,.12);">eleito · ${c.tag}${infoTip(explicacaoTag(c.tag, c.detalhe), "right")}</span>
          </div>
          ${mostrarMargem ? `<div style="display:flex; justify-content:space-between; font-size:10px; color:var(--pc-ink-dim); margin-top:6px;">
            <span>mínimo pra eleger seria ${minimoParaEleger.toLocaleString("pt-BR")}</span><span style="color:var(--pc-accent);">+${margem.toLocaleString("pt-BR")} de folga</span>
          </div>` : ""}
        `);
      }

      const acrescimo = c.gap.acrescimo || 0;
      const necessario = votos + acrescimo;
      const pct = necessario > 0 ? Math.round((votos / necessario) * 100) : 0;
      const usaIndividual = c.gap.individual !== null && c.gap.acrescimo === c.gap.individual;
      const legendaFaltam = acrescimo > 0
        ? (usaIndividual
            ? `faltam ${acrescimo.toLocaleString("pt-BR")} votos próprios`
            : `faltam ${acrescimo.toLocaleString("pt-BR")} votos · partido tem ${(c.gap.votosPartido || 0).toLocaleString("pt-BR")} no total`)
        : "";
      const menuAberto = pcState.menuMagicoAberto === c.chave;
      // Distribuir só ajuda quando não tem ninguém do mesmo partido, ainda
      // não eleito, com mais voto que este candidato — essa opção só mexe
      // em quem tem MENOS voto que ele, então não resolveria um rival de
      // cima (aí só "Direto pra ele" funciona, ver acrescimo acima).
      const distribuivel = c.gap.partido !== null && c.gap.partido > 0 && !c.gap.temRivalAcima;
      const mostrarMagico = c.marcadoPeloUsuario && acrescimo > 0;
      const botaoMagico = mostrarMagico ? `<button data-pc-abrir-magico="${c.chave}" class="pc-mini-btn" style="flex-shrink:0; width:26px; height:26px; border-radius:50%; color:var(--pc-accent); border-color:rgba(61,255,176,.4); background:${menuAberto ? "rgba(61,255,176,.18)" : "rgba(61,255,176,.08)"};">${iconeSvg("completar", 13)}</button>` : "";
      const menuMagico = menuAberto ? `
        <div style="margin-top:10px; background:#0e1f17; border:1px solid rgba(61,255,176,.3); border-radius:10px; padding:6px;">
          <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--pc-ink-dim); padding:6px 8px 4px;">Como completar os ${acrescimo.toLocaleString("pt-BR")} votos?</div>
          <button data-pc-fechar-vaga="${c.partido}" data-pc-chave="${c.chave}" data-pc-acrescimo="${acrescimo}" data-pc-cargo="${cargoDef.id}" style="width:100%; text-align:left; background:none; border:none; padding:9px 8px; border-radius:7px; cursor:pointer; display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12.5px; font-weight:700; color:var(--pc-ink);">Direto pra ${c.nome}</span>
            <span style="font-size:10.5px; color:var(--pc-ink-dim); line-height:1.4;">Soma os ${acrescimo.toLocaleString("pt-BR")} votos só na conta dele — mais simples, mas ele fica com um número redondo "de fora".</span>
          </button>
          ${distribuivel ? `<div style="height:1px; background:#1d3a2c; margin:2px 4px;"></div>
          <button data-pc-distribuir-menores="${c.partido}" data-pc-chave-menores="${c.chave}" data-pc-gap-menores="${c.gap.partido}" data-pc-cargo-menores="${cargoDef.id}" style="width:100%; text-align:left; background:none; border:none; padding:9px 8px; border-radius:7px; cursor:pointer; display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12.5px; font-weight:700; color:var(--pc-ink);">Distribuir com quem tem menos</span>
            <span style="font-size:10.5px; color:var(--pc-ink-dim); line-height:1.4;">Reparte os ${c.gap.partido.toLocaleString("pt-BR")} votos entre os colegas de partido que já têm menos voto que ele — sem passar do voto dele.</span>
          </button>` : ""}
          <div style="margin-top:4px; padding:6px 8px 2px; font-size:9.5px; color:var(--pc-warning); line-height:1.4; border-top:1px solid #1d3a2c;">Qualquer uma das opções ainda pode mudar o resultado de outro partido — a disputa de sobra é entre todos ao mesmo tempo.</div>
        </div>` : "";

      return cardCandidato(`
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="min-width:0; flex:1;">
            <div style="font-size:16px; font-weight:700; color:var(--pc-ink);">${c.nome}</div>
            <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">${c.partido}</div>
          </div>
          <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:112px; font-size:16px; font-weight:800; text-align:right; flex-shrink:0;">
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:12px;">
          ${botaoMagico}
          ${barraProgresso(pct)}
        </div>
        ${menuMagico}
        ${legendaFaltam ? `<div style="display:flex; justify-content:space-between; font-size:10px; color:var(--pc-ink-dim); margin-top:6px;">
          <span>${legendaFaltam}</span><span>${pct}%</span>
        </div>` : ""}
      `);
    };

    // Filtro "lista única" (default, ordem só por voto cruzando partidos) vs
    // "agrupado por partido/federação" (pedido do usuário em 08/08/2026) — só
    // muda como listaCompleta é agrupada pra exibição, cardCandidato/
    // linhaCandidato continuam os mesmos, sem mexer no resto da estrutura.
    const agrupado = !!pcState.modoAgrupadoRevisao[cargoDef.id];
    let linhas;
    if (!agrupado) {
      linhas = listaCompleta.map(linhaCandidato).join("");
    } else {
      const porPartido = new Map();
      listaCompleta.forEach((c) => {
        if (!porPartido.has(c.partido)) porPartido.set(c.partido, []);
        porPartido.get(c.partido).push(c);
      });
      linhas = [...porPartido.entries()]
        .sort((a, b) => b[1].filter((c) => c.eleito).length - a[1].filter((c) => c.eleito).length)
        .map(([partido, candidatosPartido]) => {
          const qtdEleitos = candidatosPartido.filter((c) => c.eleito).length;
          // Soma de votos do partido + quanto falta pra próxima vaga — pedido
          // do usuário em 09/08/2026. gap.partido é igual pra todo mundo não
          // eleito do mesmo partido (é uma conta por PARTIDO, não por
          // candidato), então pega do primeiro não-eleito que achar.
          const votosPartidoTotal = candidatosPartido.reduce((s, c) => s + (Number(c.votos) || 0), 0);
          const naoEleito = candidatosPartido.find((c) => !c.eleito && c.gap);
          const faltamProximaVaga = naoEleito ? naoEleito.gap.partido : null;
          return `
          <div style="display:flex; align-items:center; gap:6px; padding:10px 3px 6px; color:var(--pc-accent); font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; flex-wrap:wrap;">
            <span style="width:7px; height:7px; border-radius:50%; background:var(--pc-accent); display:inline-block; flex-shrink:0;"></span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${partido}</span>
            <span style="color:var(--pc-ink-dim); font-weight:400; text-transform:none; flex-shrink:0;">— ${qtdEleitos} eleito${qtdEleitos === 1 ? "" : "s"} · ${votosPartidoTotal.toLocaleString("pt-BR")} votos${faltamProximaVaga ? ` (faltam ${faltamProximaVaga.toLocaleString("pt-BR")} para a próxima vaga)` : ""}</span>
          </div>
          ${candidatosPartido.map(linhaCandidato).join("")}
        `;
        }).join("");
    }

    const filtroAgrupado = `
      <div style="display:flex; background:#0c1c16; border:1px solid #2a4438; border-radius:8px; padding:2px; gap:2px; flex-shrink:0;">
        <button data-pc-modo-revisao="lista" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Lista única, ordenada por votos" style="width:24px; height:22px; border:none; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:${agrupado ? "transparent" : "var(--pc-accent)"}; color:${agrupado ? "var(--pc-ink-dim)" : "#04140d"};">${iconeSvg("lista", 12)}</button>
        <button data-pc-modo-revisao="grupo" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Agrupado por partido/federação" style="width:24px; height:22px; border:none; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:${agrupado ? "var(--pc-accent)" : "transparent"}; color:${agrupado ? "#04140d" : "var(--pc-ink-dim)"};">${iconeSvg("grupos", 12)}</button>
      </div>`;

    return `
      <details class="pc-acc">
        <summary><span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cargoDef.label} <span style="font-weight:400; color:var(--pc-ink-dim); font-size:11px;">— ${totalEleitos} eleitos${temInconsistencia ? ` · ${marcadosInconsistentes.length} do seu palpite pendente${marcadosInconsistentes.length === 1 ? "" : "s"}` : ""}</span></span>${filtroAgrupado}<svg class="pc-chev" viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary>
        <div class="pc-acc-body">${linhas}</div>
      </details>`;
  }).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <h2>Revisão</h2>
      <div class="pc-sub">Revise os três cargos antes de salvar — dá pra ajustar cada um aqui mesmo, sem voltar pra outra tela.</div>
      ${pcState.listaSalvaId ? `<div class="pc-sub" style="color:var(--pc-warning); margin-top:6px;">${iconeSvg("alerta", 12)} Você está editando "${pcState.listaSalvaNome || "uma lista salva"}". As mudanças só ficam valendo se clicar em Salvar de novo antes de sair — senão se perdem.</div>` : ""}

      <div style="display:flex; align-items:center; justify-content:space-between;">
        <button id="pcBtnVoltarRevisao" class="pc-mini-btn" title="Ajustar">${iconeSvg("setaEsquerda", 15)}</button>
        <button class="primary" id="pcBtnConfirmarDeposito">Salvar</button>
      </div>
      <div class="pc-status" id="pcDepositoStatus" style="text-align:right; margin-top:6px;"></div>

      <button class="ghost" id="pcBtnImprimir" ${pcState.listaSalvaId ? "" : "disabled"} title="${pcState.listaSalvaId ? "Impressão / PDF" : "Salve a lista primeiro pra poder imprimir"}" style="width:100%; margin-top:10px; display:flex; align-items:center; justify-content:center; gap:8px;">${iconeSvg("impressora", 16)}${iconeSvg("send", 15)}</button>
      <div id="pcImprimirPergunta" style="display:none; margin-top:10px;">
        <div class="pc-sub" style="text-align:center; margin:6px 0;">Deseja gerar a lista de quais cargos?</div>
        <div class="pc-cargo-switch">
          <button data-pc-imprimir-cargo="estadual">Estadual</button>
          <button data-pc-imprimir-cargo="federal">Federal</button>
          <button data-pc-imprimir-cargo="senador">Senador</button>
          <button data-pc-imprimir-cargo="tudo" class="active">Tudo</button>
        </div>
        <button class="primary" id="pcBtnGerarImpressao" style="width:100%; margin-top:8px;">Gerar</button>
      </div>

      <div style="margin:18px 0 16px; border-top:1px solid var(--pc-glass-border);"></div>

      ${temInconsistenciaGeral ? `<details class="pc-acc" style="margin:0 0 14px;">
        <summary style="display:flex; align-items:center; gap:7px; font-size:11px; color:var(--pc-ink-dim);">${iconeSvg("alerta", 14)}<b style="color:var(--pc-ink);">Você não precisa zerar todos os avisos pra salvar</b></summary>
        <div class="pc-acc-body" style="font-size:11px; color:var(--pc-ink-dim); line-height:1.5; padding-top:6px;">— dá pra salvar assim mesmo. As vagas de cada cargo são disputadas entre todos os partidos ao mesmo tempo, então corrigir um candidato de cada vez pode não resolver (fechar uma vaga aqui pode abrir um aviso novo em outro partido — é a disputa por sobras funcionando, não um erro). Use a barra e o botão ✦ de cada candidato pendente pra ajustar aos poucos, ou edite os votos direto na caixa.</div>
      </details>` : ""}

      ${secoesHtml}
    </div>
    ${pcState.modalNomeListaAberto ? `
    <div id="pcModalNomeListaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(15,35,27,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px;">Nomeie a sua lista</h2>
        <div style="font-size:11.5px; line-height:1.4; color:var(--pc-ink-dim); margin-bottom:14px;">A nomeação é importante para gerar palpites diferentes conforme determinados grupos, ou para o cadastro de novas listas por conta da mudança de cenário durante o período eleitoral.</div>
        <input class="cell" id="pcInputNomeLista" placeholder="otimista - ${new Date().toLocaleDateString("pt-BR")}" style="width:100%; margin-bottom:6px;">
        <div class="pc-erro" id="pcErroNomeLista" style="min-height:16px;"></div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" id="pcBtnCancelarNomeLista" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarNomeLista" style="flex:1;">Salvar</button>
        </div>
      </div>
    </div>` : ""}`;
  if (pcState.modalNomeListaAberto) {
    const inputNome = document.getElementById("pcInputNomeLista");
    inputNome.focus();
    const confirmarNome = async () => {
      const valor = inputNome.value.trim();
      if (!valor) {
        document.getElementById("pcErroNomeLista").textContent = "Digite um nome pra continuar.";
        inputNome.focus();
        return;
      }
      pcState.listaSalvaNome = valor;
      pcState.modalNomeListaAberto = false;
      await executarSalvarLista();
    };
    document.getElementById("pcBtnCancelarNomeLista").addEventListener("click", () => {
      pcState.modalNomeListaAberto = false;
      renderRevisaoDeposito();
    });
    document.getElementById("pcBtnConfirmarNomeLista").addEventListener("click", confirmarNome);
    inputNome.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmarNome(); } });
  }
  // Filtro lista única vs. agrupado por partido/federação, no cabeçalho de
  // cada cargo — preventDefault/stopPropagation pra não deixar o clique
  // também abrir/fechar o <details> por baixo (pedido do usuário em
  // 08/08/2026: só incluir os 2 ícones, sem mudar mais nada da estrutura).
  document.querySelectorAll("[data-pc-modo-revisao]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cargo = btn.getAttribute("data-pc-modo-revisao-cargo");
      pcState.modoAgrupadoRevisao[cargo] = btn.getAttribute("data-pc-modo-revisao") === "grupo";
      renderRevisaoDeposito();
    });
  });
  // Botão mágico (✦) de cada candidato pendente — abre/fecha o menu com as
  // 2 formas de completar o voto que falta. Clique, não hover (pedido do
  // usuário em 06/08/2026).
  document.querySelectorAll("[data-pc-abrir-magico]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const chave = btn.getAttribute("data-pc-abrir-magico");
      pcState.menuMagicoAberto = pcState.menuMagicoAberto === chave ? null : chave;
      renderRevisaoDeposito();
    });
  });
  document.querySelectorAll("[data-pc-fechar-vaga]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lista = pcState.palpitesPorCargo[btn.getAttribute("data-pc-cargo")];
      fecharVagaPartido(btn.getAttribute("data-pc-fechar-vaga"), btn.getAttribute("data-pc-chave"), Number(btn.getAttribute("data-pc-acrescimo")), lista);
      pcState.menuMagicoAberto = null;
      renderRevisaoDeposito();
    });
  });
  document.querySelectorAll("[data-pc-distribuir-menores]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lista = pcState.palpitesPorCargo[btn.getAttribute("data-pc-cargo-menores")];
      distribuirComQuemTemMenos(btn.getAttribute("data-pc-distribuir-menores"), btn.getAttribute("data-pc-chave-menores"), Number(btn.getAttribute("data-pc-gap-menores")), lista);
      pcState.menuMagicoAberto = null;
      renderRevisaoDeposito();
    });
  });
  // Ajuste manual direto na revisão — mesma lógica de edição da tela de
  // seleção (ver input[data-pc-voto] ali), só que reconstrói a revisão em
  // vez da seleção depois de salvar, pra pessoa poder corrigir um aviso
  // "no olho" sem precisar voltar pra tela anterior. O atributo carrega
  // cargo::partido::chave agora (não só partido::chave) porque a Revisão
  // edita os 3 cargos ao mesmo tempo, não só o ativo.
  document.querySelectorAll("input[data-pc-voto-revisao]").forEach((inp) => {
    inp.addEventListener("blur", (e) => {
      const [cargo, nomePartido, chave] = e.target.dataset.pcVotoRevisao.split("::");
      const lista = pcState.palpitesPorCargo[cargo];
      const p = lista.find((pp) => pp.nome === nomePartido);
      const c = p.candidatos.find((cc) => String(cc.chave) === chave);
      let val = Number(String(e.target.value).replace(/\D/g, "")) || 0;
      // Mesmo teto do input da tela de Seleção (ver data-pc-voto ali) — a
      // soma dos votos dos candidatos marcados como eleito NESSE cargo não
      // pode passar da projeção de votos válidos de 2026 pra ele.
      if (c.marcadoEleito) {
        const somaSemEste = lista.reduce((s, pp) => s + pp.candidatos
          .filter((cc) => cc.marcadoEleito && cc !== c)
          .reduce((s2, cc) => s2 + (Number(cc.votos) || 0), 0), 0);
        const tetoProjecao = Math.round(totalValidosProjetado2026(cargo));
        val = Math.min(val, Math.max(0, tetoProjecao - somaSemEste));
      }
      if (val === c.votos) return;
      // Desfazer (Seleção) só sabe voltar o cargo ativo — snapshot só faz
      // sentido pra edição desse cargo especificamente aqui na Revisão.
      if (cargo === pcState.cargoAtivo) snapshotPalpite();
      c.votos = val;
      c.votosEditado = true;
      renderRevisaoDeposito();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== "Tab") return;
      e.preventDefault();
      const todos = [...document.querySelectorAll("input[data-pc-voto-revisao]")];
      const idx = todos.indexOf(e.target);
      const voltar = e.key === "Tab" && e.shiftKey;
      const alvo = voltar ? todos[idx - 1] : todos[idx + 1];
      const atributoAlvo = alvo ? alvo.getAttribute("data-pc-voto-revisao") : null;
      e.target.blur();
      if (atributoAlvo) {
        const novo = document.querySelector(`input[data-pc-voto-revisao="${atributoAlvo}"]`);
        if (novo) { novo.focus(); novo.select(); }
      }
    });
  });
  document.getElementById("pcBtnVoltarRevisao").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
    else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
  });
  document.getElementById("pcBtnConfirmarDeposito").addEventListener("click", async () => {
    // Primeiro Salvar dessa lista (ainda sem nome) pede o nome antes de
    // gravar qualquer coisa — ver executarSalvarLista pra o que acontece
    // depois de confirmado. Salvamentos seguintes da MESMA lista (já tem
    // nome) não perguntam de novo, só atualizam.
    if (!pcState.listaSalvaNome) {
      pcState.modalNomeListaAberto = true;
      renderRevisaoDeposito();
      return;
    }
    await executarSalvarLista();
  });
  document.getElementById("pcBtnImprimir").addEventListener("click", (e) => {
    document.getElementById("pcImprimirPergunta").style.display = "block";
    e.target.style.display = "none";
  });
  document.querySelectorAll("[data-pc-imprimir-cargo]:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-pc-imprimir-cargo]").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  document.getElementById("pcBtnGerarImpressao").addEventListener("click", () => {
    const cargoEscolhido = document.querySelector("[data-pc-imprimir-cargo].active").getAttribute("data-pc-imprimir-cargo");
    const cargosParaGerar = cargoEscolhido === "tudo" ? CARGOS.map((c) => c.id) : [cargoEscolhido];
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) {
      container = document.createElement("div");
      container.id = "pcImpressaoConteudo";
      document.body.appendChild(container);
    }
    container.innerHTML = `
      <h1 style="font-size:18px; margin-bottom:2px;">Prospecção Coletiva — Simulador Eleitoral — Legislativo 2026${pcState.perfil ? ` — ${pcState.perfil.nome}` : ""}</h1>
      <div style="font-size:11px; color:#666; margin-bottom:6px;">${pcState.estado || "SC"} · gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
      ${cargosParaGerar.map(montarSecaoImpressaoCargo).join("")}
    `;
    window.print();
  });
}

function renderDepositoConfirmado() {
  const conteudo = document.getElementById("pcConteudo");
  const tiles = [
    { icone: "send", label: "Convide os amigos", info: "Gere um link único e envie por WhatsApp ou redes sociais. Quem entra pelo seu link já chega sabendo quem convidou." },
    { icone: "grupos", label: "Crie grupos particulares", info: "Monte um grupo, convide por código ou link, e acompanhe um ranking só entre vocês — todo mundo vê o palpite de todo mundo ali dentro." },
    { icone: "chart", label: "Avance na pontuação", info: "Você pontua por candidato eleito certo, pela proximidade da votação de cada um, pelas cadeiras por partido, pela enquete eleitoral e por um bônus de quem entrega a lista mais cedo." },
    { icone: "ranking", label: "Ranqueamento", info: "Você entra em 4 rankings ao mesmo tempo: geral (nacional), do seu estado, por categorias, e dos grupos particulares que você criar ou entrar." },
  ];
  const tilesHtml = tiles.map((t) => `
    <div class="pc-tile">
      <svg class="pc-tile-icon" viewBox="0 0 16 16">${PC_ICONES[t.icone]}</svg>
      <span class="pc-tile-label">${t.label}${infoTip(t.info)}</span>
    </div>`).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto; text-align:center; padding:2rem 1.5rem;">
      ${iconeSvg("ballot", 30)}
      <h2 style="margin-top:8px;">Sua lista foi salva</h2>
      <div style="font-size:16px; font-weight:700; color:var(--pc-accent); margin:6px 0 4px;">Agora o game começa de verdade</div>
      <div class="pc-tile-grid">${tilesHtml}</div>
      <button class="primary" id="pcBtnIrPainel">Avançar</button>
      <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:8px;">O acesso a essas ferramentas fica disponível a partir do cadastro simples.</div>
    </div>`;
  document.getElementById("pcBtnIrPainel").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "painel"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
  });
}

function renderRankingPlaceholder() {
  document.getElementById("pcConteudo").innerHTML = `
    <div class="glass-card">
      <h2>Ranking</h2>
      <div class="pc-sub">Disponível depois do resultado oficial da eleição de 2026.</div>
      <div style="font-size:13px; color:var(--pc-ink-dim);">
        Critério principal: quem mais acertar a composição real da lista de eleitos.
        Critério de desempate: menor distância entre os votos previstos e os votos reais.
      </div>
    </div>`;
}

async function renderMeuPalpite() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando seu palpite…");

  if (!pcState.palpiteEdicao) {
    await garantirRascunhosCarregados();
    const rascunho = pcState.rascunhosCache && pcState.rascunhosCache.estadual;
    if (rascunho) {
      pcState.palpiteEdicao = rascunho;
    } else if (pcState.perfil) {
      const salvo = await carregarMeuPalpite(pcState.perfil.id);
      pcState.palpiteEdicao = salvo ? salvo.candidatos : montarEstadoPalpite(pcState.perfil.escopo, pcState.perfil.partido_escopo, pcState.vagasPorPartido, "estadual", pcState.estado);
    } else {
      // convidado (veio da tela de conclusão sem cadastro): sempre a Assembleia toda
      pcState.palpiteEdicao = montarEstadoPalpite("assembleia", null, pcState.vagasPorPartido, "estadual", pcState.estado);
    }
  }
  agendarAutoSaveRascunho("estadual", pcState.palpiteEdicao);

  // partidos em modo "detalhado" derivam os marcados da própria votação
  // (top N por votos, N = vagas2022); partidos em modo simplificado usam
  // exatamente o que a pessoa marcou manualmente.
  pcState.palpiteEdicao.forEach((p) => { if (pcState.modoPartido[p.nome] === "detalhado") recalcularMarcados(p); });

  const totalMarcado = pcState.palpiteEdicao.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).length, 0);
  const listaSeats = pcState.palpiteEdicao.map((p) => ({ nome: p.nome, seats: p.candidatos.filter((c) => c.marcadoEleito).length }));

  const blocos = pcState.palpiteEdicao.map((partido, pIdx) => renderBlocoPartidoPalpite(partido, pIdx)).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
      <div>
        <div class="pc-sub" style="margin:0;">Marque quem você acha que vai se eleger — sem precisar digitar votos.</div>
        <div style="font-size:11.5px; color:var(--pc-ink-dim); opacity:0.75; margin-top:4px;">Lista provisória: todos os candidatos são de 2022, usados como ponto de partida até sair a lista oficial homologada de 2026.</div>
      </div>
      <div style="display:flex; align-items:center; gap:14px;">
        <span style="font-size:20px; font-weight:700; color:${totalMarcado === 40 ? "var(--pc-accent-2)" : "var(--pc-ink)"};">${totalMarcado}/40 marcados</span>
        <button class="ghost" id="pcBtnAutoCompletar">Completar automaticamente</button>
      </div>
    </div>
    <div class="glass-card">
      ${blocos}
      <div style="display:flex; gap:10px; align-items:center; margin-top:10px;">
        <button class="primary" id="pcBtnSalvarPalpite">${pcState.perfil ? "Salvar meu palpite" : "Continuar"}</button>
        <span class="pc-status" id="pcSalvarStatus"></span>
      </div>
    </div>
    <div class="glass-card">
      <h2>Prévia da sua projeção</h2>
      ${desenharHemiciclo(listaSeats, 40)}
    </div>
  `;

  attachListenersPalpite();

  document.getElementById("pcBtnAutoCompletar").addEventListener("click", () => {
    completarAutomaticamente();
    renderMeuPalpite();
  });

  document.getElementById("pcBtnSalvarPalpite").addEventListener("click", async () => {
    if (!pcState.perfil) {
      pcState.tela = "painel-convidado";
      renderColaborativo();
      return;
    }
    const { error } = await salvarPalpite(pcState.perfil.id, pcState.palpiteEdicao);
    document.getElementById("pcSalvarStatus").textContent = error
      ? "Erro ao salvar: " + error.message
      : "Palpite salvo — " + new Date().toLocaleString("pt-BR");
  });
}

// No modo detalhado, "marcado como eleito" não é um clique manual — é
// derivado da própria votação: os N mais votados do partido (N = meta de
// vagas definida nos boxes, ou vagas2022 se a pessoa nunca passou pelos
// boxes) ficam marcados. Mantém o contador de 40 coerente entre os dois
// modos, sem precisar de duas fontes de verdade.
function recalcularMarcados(partido) {
  const meta = partido.metaVagas ?? partido.vagas2022;
  const ordenados = partido.candidatos
    .filter((c) => c.fonte !== "legenda") // voto de legenda não é pessoa, não pode "ser eleito"
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (Number(b.c.votos) || 0) - (Number(a.c.votos) || 0));
  partido.candidatos.forEach((c) => { c.marcadoEleito = false; });
  ordenados.slice(0, meta).forEach(({ c }) => { c.marcadoEleito = true; });
}

// Preenche o restante da lista até 40, respeitando a meta de vagas de cada
// partido (dos boxes, ou vagas2022 como reserva): marca os mais votados de
// 2022 nos partidos ainda incompletos.
function completarAutomaticamente() {
  pcState.palpiteEdicao.forEach((p) => {
    const meta = p.metaVagas ?? p.vagas2022;
    const marcados = p.candidatos.filter((c) => c.marcadoEleito).length;
    if (marcados >= meta) return;
    const faltam = meta - marcados;
    p.candidatos
      .filter((c) => !c.marcadoEleito && c.fonte !== "legenda")
      .sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0))
      .slice(0, faltam)
      .forEach((c) => { c.marcadoEleito = true; });
  });
}

function rotuloIncumbente(c) {
  if (!c.eleito2022) return "";
  return ` <span style="font-size:11.5px; opacity:0.55;">Deputado — ${Number(c.votos2022 || 0).toLocaleString("pt-BR")} votos em 2022</span>`;
}

function renderBlocoPartidoPalpite(partido, pIdx) {
  const isAssembleia = !pcState.perfil || pcState.perfil.escopo === "assembleia";
  const isExpanded = !isAssembleia || !!pcState.expandido[partido.nome];
  const modoDetalhado = pcState.modoPartido[partido.nome] === "detalhado";
  const marcadosPartido = partido.candidatos.filter((c) => c.marcadoEleito).length;

  const linhaAcao = `<button class="ghost" data-pc-modo="${partido.nome}" style="font-size:12px; padding:6px 10px;">
      ${modoDetalhado ? "← voltar pra marcar direto" : "Preencher com votos completos"}
    </button>
    ${!modoDetalhado ? infoTip("Preencher com votos, em vez de só marcar quem se elege, deixa o resultado mais preciso: a projeção passa a usar a fórmula eleitoral oficial (quociente + sobras) em vez da ordem que você escolheu.") : ""}`;

  const linhas = partido.candidatos.map((c, cIdx) => {
    if (modoDetalhado) {
      return `<tr>
        <td>${nomeExibicao(c)}${c.fonte === "legenda" ? ' <span style="font-size:9px; color:var(--pc-ink-dim);">(legenda)</span>' : ""}${rotuloIncumbente(c)}${c.invalidado2022 ? warnTip(c.motivoInvalidacao || "Voto invalidado em 2022.") : ""}</td>
        <td class="num" style="color:var(--pc-ink-dim);">${Number(c.votos2022 || 0).toLocaleString("pt-BR")}</td>
        <td class="num"><input class="cell" data-pc-partido="${pIdx}" data-pc-cand="${cIdx}" value="${c.votos}"></td>
      </tr>`;
    }
    if (c.fonte === "legenda") {
      return `<label style="display:flex; align-items:center; gap:10px; padding:7px 2px; font-size:13.5px; border-bottom:1px solid rgba(120,130,180,0.1);">
        <span style="width:16px; height:16px; flex-shrink:0;"></span>
        <span>${nomeExibicao(c)} <span style="font-size:9px; color:var(--pc-ink-dim);">(legenda)</span></span>
      </label>`;
    }
    return `<label style="display:flex; align-items:center; gap:10px; padding:7px 2px; font-size:13.5px; cursor:pointer; border-bottom:1px solid rgba(120,130,180,0.1);">
        <input type="checkbox" data-pc-marca="${pIdx}:${cIdx}" ${c.marcadoEleito ? "checked" : ""} style="width:16px; height:16px; flex-shrink:0;">
        <span>${nomeExibicao(c)}${rotuloIncumbente(c)}${c.invalidado2022 ? warnTip(c.motivoInvalidacao || "Voto invalidado em 2022.") : ""}</span>
      </label>`;
  }).join("");

  const meta = partido.metaVagas ?? partido.vagas2022;
  const legendaMeta = `meta (boxes): ${meta} · 2022: ${partido.vagas2022} vagas · agora: ${marcadosPartido} marcado${marcadosPartido === 1 ? "" : "s"}`;
  return `
    <div style="margin-bottom:14px;">
      ${isAssembleia
        ? `<button class="ghost" data-pc-toggle="${partido.nome}" style="width:100%; text-align:left; margin-bottom:8px; display:flex; justify-content:space-between;">
             <span>${chevron(isExpanded)} <b>${partido.nome}</b></span>
             <span style="font-size:12px; color:var(--pc-ink-dim);">${legendaMeta}</span>
           </button>`
        : `<h2>${partido.nome} <span style="font-size:12px; font-weight:400; color:var(--pc-ink-dim);">— ${legendaMeta}</span></h2>`}
      ${isExpanded ? `
      <div style="margin-bottom:8px;">${linhaAcao}</div>
      ${modoDetalhado ? `
      <table>
        <thead><tr><th>Candidato</th><th class="num">Votos 2022 (ref.)</th><th class="num">Seu palpite 2026</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>` : linhas}` : ""}
    </div>`;
}

function attachListenersPalpite() {
  document.querySelectorAll("[data-pc-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nome = btn.dataset.pcToggle;
      pcState.expandido[nome] = !pcState.expandido[nome];
      renderMeuPalpite();
    });
  });
  document.querySelectorAll("[data-pc-modo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nome = btn.dataset.pcModo;
      const partido = pcState.palpiteEdicao.find((p) => p.nome === nome);
      if (pcState.modoPartido[nome] === "detalhado") {
        delete pcState.modoPartido[nome];
      } else {
        pcState.modoPartido[nome] = "detalhado";
        recalcularMarcados(partido);
      }
      renderMeuPalpite();
    });
  });
  document.querySelectorAll("input[data-pc-marca]").forEach((inp) => {
    inp.addEventListener("change", (e) => {
      const [pIdx, cIdx] = e.target.dataset.pcMarca.split(":").map(Number);
      pcState.palpiteEdicao[pIdx].candidatos[cIdx].marcadoEleito = e.target.checked;
      renderMeuPalpite();
    });
  });
  document.querySelectorAll("input[data-pc-partido]").forEach((inp) => {
    inp.addEventListener("input", (e) => {
      const pIdx = Number(e.target.dataset.pcPartido);
      const cIdx = Number(e.target.dataset.pcCand);
      const val = Number(e.target.value.replace(/\D/g, "")) || 0;
      pcState.palpiteEdicao[pIdx].candidatos[cIdx].votos = val;
    });
  });
  document.querySelectorAll('input[data-pc-partido]').forEach((inp) => {
    inp.addEventListener("blur", () => renderMeuPalpite());
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  });
}

// ---------- Quadro de médias ----------

// Quadro de médias — pesquisa em tempo real. Diferente do resto do app
// (que trabalha o palpite de UMA pessoa), aqui é a agregação pública de
// TODA gente cadastrada: cada candidato usa a mediana aparada dos votos
// que cada pessoa deu pra ele (calcularMedianaPalpites em
// nuvem/palpites.js — mais resistente a resposta isolada/bloco de
// respostas extremas do que média simples), e quem "estaria eleito" sai
// da MESMA regra eleitoral real usada em todo o resto do app (quociente +
// D'Hondt pra Estadual/Federal, majoritário pro Senador — ver
// projetarEleitosMediana). Concebido com o usuário em 04/08/2026.
async function renderQuadroMedias() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Calculando a mediana de todos os palpites…");

  if (!pcState.cargoAtivoMedias) pcState.cargoAtivoMedias = "estadual";
  const cargo = pcState.cargoAtivoMedias;
  const registros = await buscarTodosRascunhosPublicos();
  const { parties, totalPalpites } = calcularMedianaPalpites(registros, cargo, pcState.estado);
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargo);
  // Limite de exibição: vagas do cargo + 50% de margem pra suplentes —
  // regra combinada com o usuário em 04/08/2026, pensada pra funcionar em
  // QUALQUER disputa do país (não um número fixo tipo "70", que só valia
  // pro Estadual de 40 vagas). Senador é exceção: cargo majoritário, poucas
  // vagas (1 ou 2 por ciclo) — a mesma fórmula daria um número pequeno
  // demais pra dar contexto (3), então usa um teto fixo de 5 candidatos.
  const limiteExibicao = cargo === "senador" ? 5 : Math.round(totalVagasCargo * 1.5);
  const projecao = projetarEleitosMediana(parties, cargo, pcState.estado, limiteExibicao);

  const seatsProj = cargo === "senador"
    ? Object.values(projecao.filter((c) => c.eleito).reduce((acc, c) => {
        acc[c.partido] = acc[c.partido] || { nome: c.partido, seats: 0 };
        acc[c.partido].seats++;
        return acc;
      }, {}))
    : (() => {
        const { counts } = dhondtComCorte(parties, totalVagasCargo);
        return parties.map((p, i) => ({ nome: p.nome, seats: counts[i] || 0 }));
      })();

  const botoesCargo = CARGOS.map((c) => `
    <button data-pc-cargo-medias="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");

  const linha = (c, i) => `
    <div class="pc-lobby-linha">
      <span style="display:flex; align-items:baseline; gap:10px; min-width:0;">
        <span style="width:24px; flex-shrink:0; font-size:11px; font-weight:600; color:${c.eleito ? "var(--pc-accent)" : "var(--pc-ink-dim)"};">${i + 1}º</span>
        <span style="min-width:0;">
          <div style="font-size:13px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.nomeUrna || c.nome}${c.eleito ? ` <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#04140d; background:var(--pc-accent); border-radius:999px; padding:1px 6px;">eleito</span>` : ""}</div>
          <div style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}${c.semPalpites ? " · sem palpite (usa 2022)" : ` · ${c.amostras} palpite${c.amostras === 1 ? "" : "s"}`}</div>
        </span>
      </span>
      <span style="font-size:12.5px; font-weight:600; color:var(--pc-ink-dim); font-variant-numeric:tabular-nums; flex-shrink:0;">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
    </div>`;

  conteudo.innerHTML = `
    <h2 style="margin-bottom:4px;">Quadro de médias</h2>
    <div class="pc-sub" style="margin-bottom:14px;">Pesquisa em tempo real — mediana aparada de ${totalPalpites} palpite${totalPalpites === 1 ? "" : "s"} público${totalPalpites === 1 ? "" : "s"}. Quem estaria eleito, pela mesma regra do resultado oficial.</div>
    <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
    <div class="pc-lobby-card" style="padding:14px;">
      ${desenharHemiciclo(seatsProj, totalVagasCargo, { preenchido: "rgba(61,255,176,.14)", vago: "#182f24", borda: "var(--pc-ink)", texto: "var(--pc-ink)", porPartido: false })}
    </div>
    <div class="pc-lobby-card">
      ${projecao.length ? projecao.map(linha).join("") : `<div class="pc-lobby-linha"><span style="font-size:12.5px; color:var(--pc-ink-dim);">Ninguém preencheu esse cargo ainda.</span></div>`}
    </div>
  `;

  document.querySelectorAll("[data-pc-cargo-medias]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoMedias = btn.getAttribute("data-pc-cargo-medias");
      renderQuadroMedias();
    });
  });
}
