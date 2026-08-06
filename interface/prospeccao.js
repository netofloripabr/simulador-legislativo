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
  candidatos2022Aberto: null, // nome do partido (ou federação) com o modal "nominata completa de 2022" aberto
  top2022Aberto: false, // modal "100 mais votados de 2022" (todos os partidos do cargo/estado) aberto ou não
  buscaCandidatoAberta: {}, // nome do partido -> campo de busca por nome visível ou não (fica escondido por padrão)
  buscaPartidoAberta: false, // campo de busca de PARTIDO (lista inteira, na barra de botões) visível ou não
  buscaPartido: "", // termo digitado na busca de partido
  expandido: {},
  modoPartido: {}, // nome do partido -> "detalhado" (default é o modo simplificado)
  erro: "",
  status: "",
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
    if (pcState.perfil) {
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
  }
  // Sem sessão (ou sessão sem perfil ainda): não pede login de cara — começa
  // pela tela de abertura. Login só é pedido mais adiante, quando a pessoa
  // decide "prosseguir" (ver renderLobby).
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
  if (pcState.tela === "selecao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; return renderSelecaoCandidatos(); }
  if (pcState.tela === "revisao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; return renderRevisaoDeposito(); }
  if (pcState.tela === "deposito-confirmado") { el.innerHTML = `<div id="pcConteudo"></div>`; return renderDepositoConfirmado(); }
  if (pcState.tela === "lobby") return renderLobby();
  if (pcState.tela === "detalhado-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; return renderMeuPalpite(); }
  if (pcState.tela === "login") return renderTelaLogin();
  if (pcState.tela === "cadastro") return renderTelaCadastro();
  if (pcState.tela === "app") return renderAppColaborativo();
  if (pcState.tela === "compartilhado") { el.innerHTML = `<div id="pcConteudo"></div>`; return renderCompartilhado(); }
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

// Tela depois que a pessoa deposita a cédula (ou pede a lista detalhada) sem
// estar logada. Salvar em PDF fica de propósito discreto — o destaque vai
// pras opções que envolvem voltar (compartilhar, aprofundar, ranking).
// Chamado de "Lobby": só desbloqueia de verdade (compartilhar / grupos)
// depois do cadastro + mini pesquisa por estado — isso ainda não está
// implementado (ver PROJETO.md), por enquanto as duas opções abaixo ficam
// abertas e o resto evolui depois.
function renderLobby() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <div style="font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:var(--pc-ink-dim); margin-bottom:4px;">Lobby</div>
      <h2>Sua cédula foi depositada</h2>
      <div class="pc-sub" style="margin-bottom:18px;">O que você quer fazer agora?</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="primary" id="pcBtnCompartilhar" style="text-align:left; padding:14px 16px;">Compartilhar com amigos</button>
        <button class="primary" id="pcBtnListaCompleta" style="text-align:left; padding:14px 16px;">Criar a lista completa e detalhada de todos os candidatos</button>
        <button class="primary" id="pcBtnRegistrar" style="text-align:left; padding:14px 16px;">Registrar minha lista para entrar no ranking de quem mais acertar</button>
      </div>
      <div style="text-align:center; margin-top:18px;">
        <button class="ghost" id="pcBtnSalvarPdf" style="font-size:12px;">Salvar em PDF</button>
      </div>
      <div class="pc-status" id="pcConclusaoStatus" style="text-align:center; margin-top:8px;"></div>
    </div>`;

  document.getElementById("pcBtnCompartilhar").addEventListener("click", () => {
    // Lobby só aparece pra quem ainda não tem conta (renderDepositoConfirmado
    // só cai aqui no ramo "sem perfil") — gerar link de compartilhamento
    // exige uma linha em "palpites" (RLS: só o dono escreve), por isso
    // precisa de cadastro antes. pendenteRegistro migra o palpite de
    // convidado; pendenteAcao decide pra onde ir depois de criar a conta.
    pcState.pendenteRegistro = true;
    pcState.pendenteAcao = "compartilhar";
    pcState.tela = "cadastro";
    renderColaborativo();
  });
  document.getElementById("pcBtnListaCompleta").addEventListener("click", () => {
    pcState.tela = "detalhado-convidado";
    renderColaborativo();
  });
  document.getElementById("pcBtnRegistrar").addEventListener("click", () => {
    pcState.pendenteRegistro = true;
    pcState.tela = "cadastro";
    renderColaborativo();
  });
  document.getElementById("pcBtnSalvarPdf").addEventListener("click", () => {
    window.print();
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
      <div class="pc-sub">Prospecção Coletiva ALESC 2026 — Santa Catarina</div>
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

function renderTelaLogin() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <h2>Entrar na Prospecção Coletiva</h2>
      <div class="pc-sub">Previsões compartilhadas de votação para Deputado Estadual — ALESC 2026.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcLoginEmail" type="email"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcLoginSenha" type="password"></div>
      <div class="pc-erro" id="pcLoginErro">${pcState.erro || ""}</div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnEntrar">Entrar</button>
        <button class="ghost" id="pcBtnIrCadastro">Criar conta</button>
      </div>
    </div>`;

  document.getElementById("pcBtnIrCadastro").addEventListener("click", () => {
    pcState.erro = "";
    pcState.tela = "cadastro";
    renderColaborativo();
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

function renderTelaCadastro() {
  const el = document.getElementById("modoColaborativoWrap");
  const opcoesPartido = PARTIDOS_BRASIL.map((p) => `<option value="${p.sigla}">${p.sigla}</option>`).join("");
  el.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <h2>Criar conta</h2>
      <div class="pc-sub">Seu nome, e-mail e senha ficam guardados com segurança (via Supabase Auth) — nunca em texto puro em nenhum arquivo deste site.</div>
      <div class="field-row"><label>Nome</label><input class="cell" id="pcCadNome"></div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcCadEmail" type="email"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcCadSenha" type="password"></div>
      <div class="field-row">
        <label>CPF</label>
        <input class="cell" id="pcCadCpf" inputmode="numeric" placeholder="Só números" maxlength="14">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CPF só pra impedir que a mesma pessoa crie mais de uma conta (protege o ranking) — guardamos um código derivado dele, nunca o CPF em texto puro.</div>

      <div class="field-row">
        <label>O que você quer prever?</label>
        <div style="display:flex; gap:16px; margin-top:4px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px;"><input type="radio" name="pcEscopo" value="partido" checked> Só um partido</label>
          <label style="display:flex; align-items:center; gap:6px; font-size:13px;"><input type="radio" name="pcEscopo" value="assembleia"> A Assembleia toda</label>
        </div>
      </div>
      <div class="field-row" id="pcCadPartidoWrap">
        <label>Qual partido</label>
        <select class="cell" id="pcCadPartido">${opcoesPartido}</select>
      </div>

      <div class="toggle-row">
        <label>Mostrar meu nome publicamente</label>
        <label class="switch">
          <input type="checkbox" id="pcCadMostrarNome" checked>
          <span class="slider"></span>
        </label>
      </div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCadLgpd" style="margin-top:2px;">
        <span>Li e concordo com o uso dos meus dados (nome, e-mail e CPF) para criar minha conta, evitar cadastros duplicados e calcular o ranking, conforme a LGPD (Lei 13.709/2018). Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCadErro">${pcState.erro || ""}</div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnCadastrar">Criar conta</button>
        <button class="ghost" id="pcBtnIrLogin">Já tenho conta</button>
      </div>
    </div>`;

  document.querySelectorAll('input[name="pcEscopo"]').forEach((r) => {
    r.addEventListener("change", (e) => {
      document.getElementById("pcCadPartidoWrap").style.display = e.target.value === "partido" ? "" : "none";
    });
  });

  document.getElementById("pcBtnIrLogin").addEventListener("click", () => {
    pcState.erro = "";
    pcState.tela = "login";
    renderColaborativo();
  });

  document.getElementById("pcBtnCadastrar").addEventListener("click", async () => {
    const nome = document.getElementById("pcCadNome").value.trim();
    const email = document.getElementById("pcCadEmail").value.trim();
    const senha = document.getElementById("pcCadSenha").value;
    const cpf = document.getElementById("pcCadCpf").value.trim();
    const lgpdAceito = document.getElementById("pcCadLgpd").checked;
    const escopo = document.querySelector('input[name="pcEscopo"]:checked').value;
    const partidoEscopo = document.getElementById("pcCadPartido").value;
    const mostrarNome = document.getElementById("pcCadMostrarNome").checked;

    if (!nome || !email || !senha || !cpf) {
      pcState.erro = "Preencha nome, e-mail, senha e CPF.";
      renderTelaCadastro();
      return;
    }
    if (!lgpdAceito) {
      pcState.erro = "Marque a concordância com o uso dos dados pra continuar.";
      renderTelaCadastro();
      return;
    }
    const { error, data } = await cadastrar({
      nome, email, senha, escopo,
      partidoEscopo, modoPreenchimento: "detalhado", mostrarNome, cpf, lgpdAceito,
    });
    if (error) {
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
  });
}

// ---------- App (logado) ----------

function renderAppColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  const mostrarVoltar = ["selecao", "revisao", "palpite", "medias", "ranking", "grupo"].includes(pcState.subaba);
  el.innerHTML = `
    <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <div><h2 style="margin:0;">Olá, ${pcState.perfil.nome}</h2>
      <div class="pc-sub" style="margin:4px 0 0;">${pcState.perfil.escopo === "partido" ? `Prevendo: ${pcState.perfil.partido_escopo}` : "Prevendo: Assembleia toda"}</div></div>
      <button class="ghost" id="pcBtnSair">Sair</button>
    </div>
    ${mostrarVoltar ? `<button class="ghost" id="pcBtnVoltarPainel" style="margin-bottom:14px;">← Painel principal</button>` : ""}
    <div id="pcConteudo"></div>
  `;
  document.getElementById("pcBtnSair").addEventListener("click", async () => {
    await sair();
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "login", subaba: "selecao", estado: null, vagasPorPartido: null, ultimoEditadoPartido: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, modoPartido: {}, erro: "", status: "" };
    renderColaborativo();
  });
  if (mostrarVoltar) {
    document.getElementById("pcBtnVoltarPainel").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  }

  if (pcState.subaba === "selecao") renderSelecaoCandidatos();
  else if (pcState.subaba === "revisao") renderRevisaoDeposito();
  else if (pcState.subaba === "deposito-confirmado") renderDepositoConfirmado();
  else if (pcState.subaba === "painel") renderPainelPrincipal();
  else if (pcState.subaba === "palpite") renderMeuPalpite();
  else if (pcState.subaba === "medias") renderQuadroMedias();
  else if (pcState.subaba === "grupo") renderGrupoHub();
  else renderRankingPlaceholder();
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
  await garantirMeusGruposCarregados();

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
  let atividadeAmigo = null;
  if (pcState.meusGrupos && pcState.meusGrupos.length) {
    const comparacao = await buscarComparacaoGrupo(pcState.meusGrupos[0].id);
    const outros = comparacao
      .filter((r) => r.perfil_id !== pcState.perfil.id)
      .sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em));
    if (outros.length) atividadeAmigo = outros[0].nome_exibicao;
  }

  el.innerHTML = `
    <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:14px;">
      ${completa ? `<button class="pc-lobby-icon-btn" id="pcBtnCompartilharLobby" title="Compartilhar minha lista">${iconeSvg("compartilhar", 16)}</button>` : ""}
      <button class="pc-lobby-icon-btn" id="pcBtnConvidarLobby" title="Convidar amigos">${iconeSvg("convidar", 16)}</button>
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
      <button class="pc-lobby-menu-item" id="pcMenuPalpite">${iconeSvg("ballot", 28)}<span>Preencher votação completa</span></button>
      <button class="pc-lobby-menu-item" id="pcMenuMedias">${iconeSvg("chart", 28)}<span>Quadro de médias</span></button>
      <button class="pc-lobby-menu-item" id="pcMenuGrupos">${iconeSvg("grupos", 28)}<span>Grupos</span></button>
      <button class="pc-lobby-menu-item" id="pcMenuRanking" disabled title="Disponível depois do resultado oficial de 2026">${iconeSvg("ranking", 28)}<span>Ranking</span></button>
    </div>

    <button class="pc-lobby-cta" id="pcBtnContinuarLista">
      <span>${completa ? "Revisar minha lista" : "Continuar minha lista"}</span>
      ${iconeSvg("send", 18)}
    </button>
    <div id="pcLinkCompartilhavelWrap"></div>
  `;

  document.getElementById("pcBtnContinuarLista").addEventListener("click", () => { pcState.subaba = "selecao"; renderAppColaborativo(); });
  document.getElementById("pcMenuPalpite").addEventListener("click", () => { pcState.subaba = "palpite"; renderAppColaborativo(); });
  document.getElementById("pcMenuMedias").addEventListener("click", () => { pcState.subaba = "medias"; renderAppColaborativo(); });
  document.getElementById("pcMenuGrupos").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
  document.getElementById("pcMenuRanking").addEventListener("click", () => { pcState.subaba = "ranking"; renderAppColaborativo(); });
  document.getElementById("pcBtnConvidarLobby").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
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
    <div class="pc-lobby-card">
      ${pcState.meusGrupos.length ? linhasGrupo : `<div class="pc-lobby-linha"><span style="font-size:12.5px; color:var(--pc-ink-dim);">Você ainda não está em nenhum grupo.</span></div>`}
    </div>
    <div class="pc-lobby-menu-tit">Novo grupo</div>
    <div class="pc-lobby-menu-faixa">
      <button class="pc-lobby-menu-item" id="pcBtnCriarGrupo">${iconeSvg("mais", 28)}<span>Criar grupo</span></button>
      <button class="pc-lobby-menu-item" id="pcBtnEntrarGrupo">${iconeSvg("chave", 28)}<span>Entrar com código</span></button>
    </div>`;

  document.getElementById("pcBtnCriarGrupo").addEventListener("click", () => { pcState.telaGrupo = "criar"; renderGrupoCriar(); });
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

// Mesma lógica de agregação do Quadro de Médias (calcularMediaPalpites +
// dhondt), só que a partir da comparação de UM grupo e UM cargo por vez —
// diferente de renderQuadroMedias, não pode fixar "40"/BASE_2022, porque
// aqui o cargo muda (interruptor Estadual/Federal/Senador abaixo).
function montarComparacaoGrupo(registros, cargo) {
  const remapeados = registros
    .map((r) => ({ perfil_id: r.perfil_id, candidatos: r[`rascunho_${cargo}`] }))
    .filter((r) => r.candidatos && r.candidatos.length);
  if (!remapeados.length) {
    return '<div class="pc-sub">Ninguém do grupo preencheu esse cargo ainda.</div>';
  }
  const { parties, totalPalpites } = calcularMediaPalpites(remapeados, cargo, pcState.estado);
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
    <div class="pc-sub" style="margin-bottom:8px;">Baseado em ${totalPalpites} pessoa${totalPalpites === 1 ? "" : "s"} do grupo que já preencheu esse cargo.</div>
    ${desenharHemiciclo(listaSeats, totalVagasCargo)}
    <table style="margin-top:10px;">
      <thead><tr><th>Partido</th><th class="num">Vagas 22</th><th class="num">Votos médios</th><th class="num">Vagas (média)</th></tr></thead>
      <tbody>${linhasPartido}</tbody>
    </table>
    ${qe ? `<div class="pc-sub" style="margin-top:8px;">Quociente eleitoral (médias do grupo): ${qe.toLocaleString("pt-BR")} votos/vaga.</div>` : ""}`;
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
        <span style="font-size:12px; color:var(--pc-ink-dim);">${registros.length} membro${registros.length === 1 ? "" : "s"}</span>
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}<b style="font-family:var(--mono); color:var(--pc-ink); font-weight:600;">${pcState.grupoAtivo.codigo_convite}</b></span>
      </div>
    </div>
    <div class="glass-card">
      <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
      <div id="pcGrupoComparacaoConteudo">${montarComparacaoGrupo(registros, pcState.cargoAtivoGrupo)}</div>
      <div style="margin-top:14px;">
        <div class="pc-sub" style="margin-bottom:6px;">Quem está no grupo:</div>
        ${registros.map((r) => `<span style="display:inline-block; margin:2px 4px 2px 0; padding:3px 10px; border-radius:999px; background:var(--pc-lobby-tom-3); font-size:11.5px; color:var(--pc-ink-dim);">${r.nome_exibicao}</span>`).join("")}
      </div>
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
// cadeira na Alesc e não estão carregados aqui, então o total "cheio"
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
const CHAVE_AVISO_LIMITE_OCULTO = "alesc-pc-aviso-limite-vagas-oculto";
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
  const marcados = p.candidatos.filter((c) => c.marcadoEleito);
  if (marcados.length) {
    const alvo = metaVotosMarcados(marcados, base);
    const jaPreenchidos = marcados.filter((c) => c.votosEditado).reduce((s, c) => s + (Number(c.votos) || 0), 0);
    const vazios = marcados.filter((c) => !c.votosEditado);
    const restante = Math.max(0, alvo - jaPreenchidos);
    const somaShare = vazios.reduce((s, c) => s + (Number(c.votos2022) || 1), 0) || 1;
    vazios.forEach((c) => { c.votos = Math.round(restante * ((Number(c.votos2022) || 1) / somaShare)); });
  }

  const fator = fatorCrescimentoEleitorado();
  const DECAIMENTO = 0.82; // cada candidato sem histórico próprio recebe 82% do anterior na lista
  const ordenados = [...p.candidatos].sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0));
  // ultimoValorReal guarda o valor SEM arredondar — arredondar a cada passo
  // travava a curva num piso artificial (round(1 × 0,82) = round(0,82) = 1
  // pra sempre), fazendo uma fila inteira de candidatos "cair" e empacar em
  // 1 voto em vez de continuar decrescendo suavemente até perto de zero.
  let ultimoValorReal = null;
  ordenados.forEach((c) => {
    if (c.fonte === "legenda") return;
    if (c.marcadoEleito || c.votosEditado || Number(c.votos) > 0) {
      ultimoValorReal = Number(c.votos) || ultimoValorReal;
      return;
    }
    if (Number(c.votos2022) > 0) {
      ultimoValorReal = Number(c.votos2022) * fator;
    } else if (ultimoValorReal !== null) {
      ultimoValorReal = ultimoValorReal * DECAIMENTO;
    } else {
      return;
    }
    c.votos = Math.round(ultimoValorReal);
  });
}

// "Harmonizar tudo" — substitui a lógica de "corrigir um candidato/partido
// de cada vez" (fecharVagaPartido/distribuirComQuemTemMenos abaixo), que
// nunca convergia: D'Hondt decide as vagas de TODOS os partidos JUNTOS, um
// corte só vale pro cargo inteiro — corrigir o partido A desloca esse
// corte, o que pode tirar a vaga de quem estava por último no partido B,
// gerando um aviso novo lá. Achado com o usuário em 05/08/2026 (relato:
// "aplico a correção sugerida e gera erro em efeito cascata, soma pra um e
// falta pra outro" — o usuário tinha razão, é uma limitação real do
// método de sugestão candidato-a-candidato, não erro de uso).
//
// Prova matemática por trás da harmonização (por que resolve em UM passo
// só, sem cascata): existe sempre um "corte" C tal que, se cada partido
// com s(P) vagas MARCADAS tiver votos = s(P) × C exatamente, o resultado
// de D'Hondt bate exatamente com as vagas marcadas — a última cadeira de
// cada partido (quociente votos/s(P)) empata exatamente em C, e a cadeira
// seguinte (votos/(s(P)+1)) fica abaixo de C pra todo mundo ao mesmo
// tempo. Usa a mesma projeção de votos válidos já mostrada em "Soma de
// Votos" como referência de C (não inventa total novo), e distribui o
// total de cada partido entre os marcados por peso relativo (2022).
// Partido sem ninguém marcado é escalado pra ficar com folga ABAIXO de C,
// senão "invadiria" uma vaga que ninguém pediu pra ele.
function harmonizarCargo(lista, cargo) {
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargo);
  if (!totalVagasCargo) return;
  if (cargo === "senador") { harmonizarCargoMajoritario(lista, totalVagasCargo); return; }

  const meta = totalValidosProjetado2026(cargo);
  const corte = meta / totalVagasCargo;

  lista.forEach((p) => {
    const marcados = p.candidatos.filter((c) => c.marcadoEleito && c.fonte !== "legenda");
    const naoMarcados = p.candidatos.filter((c) => !c.marcadoEleito && c.fonte !== "legenda");
    if (marcados.length > 0) {
      const alvoPartido = Math.round(marcados.length * corte);
      const pesoBase = marcados.reduce((s, c) => s + (Number(c.votos2022) || 1), 0) || 1;
      let acumulado = 0;
      marcados.forEach((c, i) => {
        const parte = i === marcados.length - 1
          ? Math.max(1, alvoPartido - acumulado) // último absorve o resto do arredondamento
          : Math.max(1, Math.round(alvoPartido * ((Number(c.votos2022) || 1) / pesoBase)));
        c.votos = parte;
        c.votosEditado = true;
        acumulado += parte;
      });
      // Não marcados: reduz a SOMA deles a quase zero — não basta limitar
      // cada um individualmente abaixo do menor marcado (bug achado pela
      // auditoria eleitoral em 05/08/2026: partyVotos() soma TODO MUNDO do
      // partido, marcado ou não; numa chapa real com 30-40 não-marcados,
      // cada um abaixo do piso mas a SOMA deles ainda pesa dezenas de
      // milhares de votos — o suficiente pra inflar o total do partido e
      // deslocar o corte real do D'Hondt pra bem longe do "corte" teórico
      // usado aqui, quebrando a garantia matemática da harmonização).
      // Preserva a ORDEM relativa entre os não-marcados (escala
      // proporcional, não zera igual pra todos), só encolhe a escala —
      // assim a lista de suplentes ainda reflete quem tinha mais peso.
      const somaNaoMarcadosAtual = naoMarcados.reduce((s, c) => s + (Number(c.votos) || 0), 0);
      const pisoNaoMarcado = Math.max(0, Math.min(...marcados.map((c) => c.votos)) - 1);
      const somaAlvoNaoMarcados = Math.min(pisoNaoMarcado, Math.round(alvoPartido * 0.001));
      if (somaNaoMarcadosAtual > 0) {
        const escalaNaoMarcados = somaAlvoNaoMarcados / somaNaoMarcadosAtual;
        naoMarcados.forEach((c) => {
          c.votos = Math.min(pisoNaoMarcado, Math.round((Number(c.votos) || 0) * escalaNaoMarcados));
          c.votosEditado = true;
        });
      }
    } else {
      // Partido sem ninguém marcado: garante que o total do partido fica
      // com folga abaixo do corte.
      const totalAtual = partyVotos(p);
      if (totalAtual >= corte) {
        const escala = totalAtual > 0 ? (corte * 0.95) / totalAtual : 0;
        p.candidatos.forEach((c) => {
          c.votos = Math.round((Number(c.votos) || 0) * escala);
          c.votosEditado = true;
        });
      }
    }
  });
}

// Versão majoritária (Senador) do "Harmonizar tudo" — não existe partido
// nem corte aqui (ver classificarEleitosMajoritario), é fila única por
// voto individual. Só precisa garantir que todo marcado fique ACIMA de
// qualquer não-marcado, preservando a ordem relativa entre os marcados.
function harmonizarCargoMajoritario(lista, totalVagasCargo) {
  const todos = [];
  lista.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todos.push(c)));
  const marcados = todos.filter((c) => c.marcadoEleito);
  const naoMarcados = todos.filter((c) => !c.marcadoEleito);
  if (!marcados.length) return;
  const pisoNaoMarcado = naoMarcados.length ? Math.max(...naoMarcados.map((c) => Number(c.votos) || 0)) : 0;
  [...marcados]
    .sort((a, b) => (Number(b.votos2022) || 0) - (Number(a.votos2022) || 0))
    .forEach((c, i) => {
      c.votos = pisoNaoMarcado + (marcados.length - i) * 1000;
      c.votosEditado = true;
    });
}

// Botão "Ajustar automaticamente" que aparece junto do aviso de vaga
// inconsistente (ver classificarEleitosPorPartido/linhaEleito): dá direto
// pro PRÓPRIO candidato do aviso os votos que faltam pra ele ultrapassar
// quem hoje ocupa a última vaga real do partido — nunca mexe em mais
// ninguém. É a única forma que garante ajudar esse candidato especificamente:
// quem preenche cada vaga dentro de um partido é sempre decidido pela
// votação individual de cada um contra os outros, nunca pelo total do
// partido — então reforçar OUTRAS pessoas (marcadas ou não) só deixaria a
// concorrência interna mais forte contra o próprio candidato do aviso, sem
// ajudá-lo. Marca votosEditado pra não ser sobrescrito depois pelo Auto geral.
function fecharVagaPartido(nomePartido, chaveCandidato, acrescimo, listaParam) {
  const lista = listaParam || pcState.palpiteEdicao;
  const p = lista.find((p) => p.nome === nomePartido);
  if (!p || !acrescimo) return;
  const alvo = p.candidatos.find((c) => String(c.chave) === chaveCandidato);
  if (!alvo) return;
  alvo.votos = (Number(alvo.votos) || 0) + acrescimo;
  alvo.votosEditado = true;
}

// Segunda opção, ao lado de "Ajustar automaticamente": em vez de dar os
// votos direto pro candidato do aviso, distribui o total que falta pro
// partido (gapPartido) entre os OUTROS candidatos do partido que já têm
// menos votos que ele — sem nenhum deles ultrapassá-lo. Pensada pra ser
// usada DEPOIS de a pessoa já ter ajustado manualmente o próprio candidato
// (na caixa de votos ao lado): dá pra pedir esse reforço nos concorrentes
// mais fracos do partido pra fechar o total sem "inflar" ninguém acima
// de quem já foi decidido manualmente.
function distribuirComQuemTemMenos(nomePartido, chaveCandidato, gapPartido, listaParam) {
  const lista = listaParam || pcState.palpiteEdicao;
  const p = lista.find((p) => p.nome === nomePartido);
  if (!p || !gapPartido) return;
  const alvo = p.candidatos.find((c) => String(c.chave) === chaveCandidato);
  if (!alvo) return;
  const votosAlvo = Number(alvo.votos) || 0;
  const naoEleitosAbaixo = p.candidatos.filter((c) => !c.marcadoEleito && c.fonte !== "legenda" && (Number(c.votos) || 0) < votosAlvo);
  if (!naoEleitosAbaixo.length) return;
  const somaPeso = naoEleitosAbaixo.reduce((s, c) => s + (Number(c.votos) || 1), 0) || 1;
  naoEleitosAbaixo.forEach((c) => {
    const atual = Number(c.votos) || 0;
    const parte = Math.round(gapPartido * ((Number(c.votos) || 1) / somaPeso));
    const teto = Math.max(0, votosAlvo - 1 - atual);
    c.votos = atual + Math.min(parte, teto);
    c.votosEditado = true;
  });
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
    pcState.palpiteEdicao.forEach((p) => {
      p.candidatos.forEach((c) => {
        if (c.fonte === "legenda") return;
        c.votos = Math.round((Number(c.votos) || 0) * escalaFinal);
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
function renderSelecaoCandidatos() {
  const el = document.getElementById("pcConteudo");
  const botoes = CARGOS.map((c) => `
    <button data-pc-cargo="${c.id}" class="${pcState.cargoAtivo === c.id ? "active" : ""}${c.disponivel ? "" : " indisponivel"}">
      ${c.label}<span class="pc-tab-dot"></span>
    </button>`).join("");
  el.innerHTML = `
    <div id="pcStickyBackdrop"><div id="pcStickyBackdropFill"></div></div>
    <div class="pc-cargo-switch">${botoes}</div>
    <div id="pcCargoConteudo"></div>
  `;
  document.querySelectorAll("[data-pc-cargo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivo = btn.dataset.pcCargo;
      renderSelecaoCandidatos();
    });
  });
  const cargo = CARGOS.find((c) => c.id === pcState.cargoAtivo);
  if (cargo.disponivel) renderCargoEstadual();
  else renderCargoIndisponivel(cargo);
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

async function renderCargoEstadual() {
  const conteudo = document.getElementById("pcCargoConteudo");
  conteudo.innerHTML = telaCarregando();
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
  // depender do arco pensado pra 40 cadeiras da ALESC. Ver desenharHemiciclo
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
            : `<label class="pc-switch" title="${c.marcadoEleito ? "Marcado como eleito" : "Marcar como eleito"}"><input type="checkbox" data-pc-marca="${p.nome}::${c.chave}" ${c.marcadoEleito ? "checked" : ""}><span class="pc-switch-slider"></span></label>`}
          <span style="flex:1; font-size:15px; font-weight:600; line-height:1.4;">${nomeExibicao(c)}${c.partidoOriginal && c.partidoOriginal !== p.nome ? ` <span style="font-size:11px; font-weight:700; color:var(--pc-accent);">(${c.partidoOriginal})</span>` : ""}${c.fonte === "legenda" ? ' <span style="font-size:10.5px; font-weight:400; color:var(--pc-ink-dim);">(legenda)</span>' : ""}${c.fonte === "2022-sem-ata-2026" ? ` <span style="font-size:10.5px; font-weight:600; color:var(--pc-warning);">sem ata 2026</span>${warnTip("Esse partido ainda não teve a ata de convenção de 2026 processada — este é o candidato real de 2022, usado só como referência temporária até a lista de 2026 chegar. Pode não ser candidato em 2026, pode ter trocado de cargo ou de partido.")}` : ""}${c.fonte === "ficticio" ? ` <span style="font-size:10.5px; font-weight:600; color:var(--pc-warning);">candidato fictício</span>${warnTip("Esse partido ainda não teve a ata de convenção de 2026 processada. Este NÃO é um candidato real — é um nome de preenchimento (placeholder) só pra manter a chapa completa até a ata sair. Será substituído pelo candidato real assim que a ata for processada.")}` : ""}<br><span style="font-size:12.5px; font-weight:400; color:var(--pc-ink-dim); opacity:0.9;">eleição 2022: ${Number(c.votos2022 || 0).toLocaleString("pt-BR")} votos${c.eleito2022 ? ` · eleito${c.partidoOrigem2022 ? " " + c.partidoOrigem2022 : ""}` : ""}</span>${c.invalidado2022 ? warnTip(`<b>Voto invalidado em 2022</b><br><br>${c.motivoInvalidacao || "Candidatura sub júdice — votação não contou no resultado final."}`) : ""}</span>
          <input class="cell" data-pc-voto="${p.nome}::${c.chave}" value="${(Number(c.votos) || 0).toLocaleString("pt-BR")}" style="width:120px; font-size:14.5px; font-weight:600; text-align:right; flex-shrink:0;">
        </div>`).join("") : `<div class="pc-sub" style="text-align:center; padding:10px 0;">Nenhum candidato encontrado.</div>`;
      // Mesma distinção QP ("quociente direto", art. 107) vs média/sobra
      // (art. 109) que a Revisão já mostra nos selos "eleito · QP"/"eleito ·
      // média" — só que calculada aqui, na hora de marcar, com o mesmo
      // dhondtComCorte (ver necessarioParaVagas acima). Deixa explícito de
      // onde cada vaga marcada realmente viria, em vez de uma suposição fixa
      // de "todas menos a última são QP".
      const refQuociente = marcados > 0 && infoVagas && infoVagas.qe ? (() => {
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

    return `
      <div data-pc-partido-card="${p.nome}" style="border:1px solid rgba(120,130,180,0.2); border-radius:10px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; padding:13px 14px 10px;">
          <button data-pc-toggle-partido="${p.nome}" style="display:flex; align-items:center; gap:10px; flex:1; min-width:0; text-align:left; background:none; border:none; cursor:pointer; color:var(--pc-ink); font-family:var(--sans); padding:0;">
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
            Quando indicar a quantidade de votos eleitos proporcional ao número de vagas, a opção avançar será selecionável. Ao ativá-la, você acessa a sua lista de palpite dos parlamentares eleitos e dos suplentes. Depois disso, você pode "depositar a cédula" (salvar) e, se preferir, imprimir a sua lista.
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
    <div id="pcPainelEleitoralCard" class="glass-card" style="padding:18px 24px;">
      <div style="display:flex; align-items:center; gap:28px;">
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
        <div style="flex:1; min-width:0;">
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-bottom:2px; display:flex; align-items:center; gap:4px;">Soma de Votos ${infoTip("Referência de votos válidos estimados: projeta o total de 2022 pelo crescimento do eleitorado até 2026, mantendo as taxas históricas de branco, nulo e comparecimento.")}</div>
          <div style="font-size:16px; font-weight:700; color:var(--pc-ink); line-height:1.2;">${somaTotal.toLocaleString("pt-BR")} <span style="font-size:10.5px; color:var(--pc-ink-dim); font-weight:400;">de ~${Math.round(votosValidos2026Proj).toLocaleString("pt-BR")}</span></div>
        </div>
        <button id="pcAbrirInstrucao" class="pc-mini-btn" style="flex-shrink:0;" title="Dica, como montar a lista?">${iconeSvg("alerta", 14)}</button>
      </div>
    </div>
    <div class="glass-card" style="padding:14px;">
      <div class="pc-sub" style="margin:0 0 14px;">Plenário — ${totalVagasCargo} vagas</div>
      ${hemiciclo}
      <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);">${legendaPlenario}</div>
    </div>
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px;">
      <button id="pcBtnBuscaPartidoToggle" class="pc-mini-btn" title="Buscar partido por nome" style="${pcState.buscaPartidoAberta ? "background:rgba(61,255,176,.18); border-color:var(--pc-accent); color:var(--pc-accent);" : ""}">
        <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
      </button>
      <button class="ghost" id="pcBtnVoltarSelecao" title="Desfaz a última alteração feita nesta tela" ${pcState.historicoPalpite.length ? "" : "disabled"}>Desfazer</button>
      <button class="ghost" id="pcBtnZerarTudo" style="display:flex; align-items:center; gap:5px;">${iconeSvg("borracha", 14)} Zerar${infoTip("Zere o jogo!<br><br>Aqui você limpa a votação de todo mundo.<br><br>Indicado para aquele jogador mais avançado que deseja indicar a votação de muitos candidatos.")}</button>
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
  attachListenersSelecao();
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
      snapshotPalpite();
      balancearPartidoSelecao(p);
      renderSelecaoCandidatos();
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
    snapshotPalpite();
    balancearTudoSelecao();
    renderSelecaoCandidatos();
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
        const trocariaOutroMarcado = !!(ultimoRealEleito && ultimoRealEleito.marcadoEleito && ultimoRealEleito.fonte !== "legenda");
        const gapIndividual = cadeirasReais > 0 ? Math.max(0, votosDoUltimoEleitoDeVerdade - (Number(c.votos) || 0) + 1) : null;
        const necessarioPartido = Math.floor(corte * (cadeirasReais + 1)) + 1;
        const gapPartido = Math.max(0, necessarioPartido - votosPartido);
        const acrescimo = gapIndividual === null || trocariaOutroMarcado ? gapPartido : gapIndividual;
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
  // ramo proporcional acima — é essa string que os editores de voto da
  // Revisão (data-pc-voto-revisao, data-pc-fechar-vaga) usam pra achar de
  // volta o partido em pcState.palpitesPorCargo; usar c.partidoOriginal
  // aqui quebraria esse lookup sempre que o candidato for de federação.
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

function renderRevisaoDeposito() {
  const conteudo = document.getElementById("pcConteudo");
  garantirPalpitesPorCargo();

  let temInconsistenciaGeral = false;

  const secoesHtml = CARGOS.map((cargoDef) => {
    const lista = pcState.palpitesPorCargo[cargoDef.id];
    const eleitos = classificarEleitosPorPartido(lista, cargoDef.id);
    const suplentes = proximosSuplentes(30, lista);
    const temInconsistencia = eleitos.some((c) => !c.consistente);
    if (temInconsistencia) temInconsistenciaGeral = true;

    const linhaEleito = (c, i) => `
      <div style="padding:7px 0; border-bottom:1px solid #16241e; font-size:12.5px;">
        <div style="display:flex; align-items:baseline; gap:8px;">
          <span style="width:22px; color:var(--pc-ink-dim); flex-shrink:0;">${i + 1}º</span>
          <span style="flex-shrink:0; font-family:var(--mono); font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#04140d; background:var(--pc-accent); border-radius:999px; padding:2px 7px;">eleito · ${c.tag}</span>
          <span style="flex:1; min-width:0;">${c.nome}<br><span style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}</span></span>
          <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${c.votos.toLocaleString("pt-BR")}" style="width:100px; font-size:12.5px; font-weight:600; text-align:right; flex-shrink:0;">
        </div>
        ${!c.consistente ? `<div style="margin:4px 0 0 30px; font-size:10.5px; color:var(--pc-warning); line-height:1.45;">
          ${c.gap.partido !== null
            ? `Com a votação atual, essa vaga ainda não fecha: o partido precisaria de mais <b>${c.gap.partido.toLocaleString("pt-BR")}</b> votos no total${c.gap.individual !== null ? `, ou ${c.nome} de pelo menos <b>${(c.votos + c.gap.individual).toLocaleString("pt-BR")}</b> votos próprios` : ""}.`
            : `Com a votação atual, essa vaga ainda não fecha: ${c.nome} precisaria de pelo menos <b>${(c.votos + c.gap.individual).toLocaleString("pt-BR")}</b> votos próprios pra ultrapassar quem hoje ocupa essa vaga (cargo majoritário — não existe "quociente do partido" aqui, é voto individual direto).`}
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
            ${(() => {
              const acrescimo = c.gap.acrescimo;
              if (!acrescimo) return "";
              return `<button data-pc-fechar-vaga="${c.partido}" data-pc-chave="${c.chave}" data-pc-acrescimo="${acrescimo}" data-pc-cargo="${cargoDef.id}" class="pc-mini-btn">${iconeSvg("completar", 14)}<span class="pc-mini-tip" style="white-space:normal; width:230px; text-align:left; line-height:1.45; font-weight:400; padding:9px 11px;"><b style="display:block; margin-bottom:4px; color:var(--pc-accent); font-size:10.5px; text-transform:uppercase; letter-spacing:.03em;">Ajustar automaticamente</b>Dá direto pra ${c.nome} os <b>${acrescimo.toLocaleString("pt-BR")}</b> votos que faltam — sem tocar na votação de mais ninguém. Se a vaga disputada hoje é de alguém que você não marcou, é só o suficiente pra ${c.nome} ultrapassar essa pessoa; se é de outro candidato que você também marcou, é o necessário pro partido ganhar mais uma vaga real (senão o ajuste só empurraria esse outro marcado pra fora). Como o total de votos do partido muda, isso ainda pode alterar o resultado geral do cálculo das sobras entre partidos.</span></button>`;
            })()}
            ${c.gap.partido > 0 ? `<button data-pc-distribuir-menores="${c.partido}" data-pc-chave-menores="${c.chave}" data-pc-gap-menores="${c.gap.partido}" data-pc-cargo-menores="${cargoDef.id}" class="pc-mini-btn">${iconeSvg("chart", 14)}<span class="pc-mini-tip" style="white-space:normal; width:230px; text-align:left; line-height:1.45; font-weight:400; padding:9px 11px;"><b style="display:block; margin-bottom:4px; color:var(--pc-accent); font-size:10.5px; text-transform:uppercase; letter-spacing:.03em;">Distribuir com quem tem menos</b>Primeiro ajuste manualmente a votação de ${c.nome} na caixa ao lado, do jeito que você achar certo. Depois, este botão pega o total que ainda falta pro partido (<b>${c.gap.partido.toLocaleString("pt-BR")}</b> votos) e distribui proporcionalmente entre os OUTROS candidatos do partido que já têm menos votos que ${c.nome} — sem nenhum deles ultrapassá-lo.</span></button>` : ""}
          </div>
        </div>` : ""}
      </div>`;

    const linhaSuplente = (c, i) => `
      <div style="display:flex; align-items:baseline; gap:8px; padding:7px 0; border-bottom:1px solid #16241e; font-size:12.5px;">
        <span style="width:22px; color:var(--pc-ink-dim); flex-shrink:0;">${eleitos.length + i + 1}º</span>
        <span style="flex-shrink:0; font-family:var(--mono); font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--pc-ink-dim); border:1px solid #2a4438; border-radius:999px; padding:2px 7px;">suplente</span>
        <span style="flex:1; min-width:0; color:var(--pc-ink-dim);">${c.nome}<br><span style="font-size:10.5px;">${c.partido}</span></span>
        <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${c.votos.toLocaleString("pt-BR")}" style="width:100px; font-size:12.5px; font-weight:600; text-align:right; flex-shrink:0; color:var(--pc-ink-dim);">
      </div>`;

    const linhas = eleitos.map(linhaEleito).join("") + suplentes.map(linhaSuplente).join("");

    return `
      <details class="pc-acc" ${cargoDef.id === pcState.cargoAtivo ? "open" : ""}>
        <summary><span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cargoDef.label} <span style="font-weight:400; color:var(--pc-ink-dim); font-size:11px;">— ${eleitos.length} eleitos + ${suplentes.length} suplentes${temInconsistencia ? " · avisos pendentes" : ""}</span></span>${temInconsistencia ? `<button data-pc-harmonizar="${cargoDef.id}" class="pc-mini-btn" style="flex-shrink:0; width:auto; height:28px; border-radius:999px; padding:0 12px; margin-right:6px; white-space:nowrap; gap:5px;" title="Harmonizar tudo">${iconeSvg("completar", 13)} Harmonizar tudo</button>` : ""}<svg class="pc-chev" viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary>
        <div class="pc-acc-body">${linhas}</div>
      </details>`;
  }).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <h2>Revisão</h2>
      <div class="pc-sub">Revise os três cargos antes de salvar — dá pra ajustar cada um aqui mesmo, sem voltar pra outra tela.</div>

      <div style="display:flex; align-items:center; justify-content:space-between;">
        <button class="ghost" id="pcBtnVoltarRevisao">← Ajustar</button>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="primary" id="pcBtnConfirmarDeposito" ${pcState.perfil ? "" : "disabled"}>Depositar cédula</button>
          ${pcState.perfil ? "" : infoTip("Para salvar sua lista, você precisa se cadastrar.")}
        </div>
      </div>
      <div class="pc-status" id="pcDepositoStatus" style="text-align:right; margin-top:6px;"></div>

      <button class="ghost" id="pcBtnImprimir" style="width:100%; margin-top:10px;">Impressão / PDF</button>
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

      ${temInconsistenciaGeral ? `<div style="display:flex; gap:9px; margin:0 0 14px; padding:10px 12px; border:1px solid #2a4438; border-radius:8px; font-size:11px; color:var(--pc-ink-dim); line-height:1.5;">
        <div style="flex-shrink:0; color:var(--pc-ink-dim); margin-top:1px;">${iconeSvg("alerta", 14)}</div>
        <div><b style="color:var(--pc-ink);">Você não precisa zerar todos os avisos pra depositar a cédula</b> — dá pra salvar assim mesmo. As vagas de cada cargo são disputadas entre todos os partidos ao mesmo tempo, então corrigir um candidato de cada vez pode não resolver (fechar uma vaga aqui pode abrir um aviso novo em outro partido — é a disputa por sobras funcionando, não um erro). Se quiser mesmo assim deixar tudo consistente de uma vez, use o botão <b style="color:var(--pc-ink);">"Harmonizar tudo"</b> dentro de cada cargo — ele recalcula todos os partidos juntos, sem esse efeito cascata.</div>
      </div>` : ""}

      ${secoesHtml}
    </div>`;

  document.querySelectorAll("[data-pc-harmonizar]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cargo = btn.getAttribute("data-pc-harmonizar");
      harmonizarCargo(pcState.palpitesPorCargo[cargo], cargo);
      renderRevisaoDeposito();
    });
  });
  document.querySelectorAll("[data-pc-fechar-vaga]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lista = pcState.palpitesPorCargo[btn.getAttribute("data-pc-cargo")];
      fecharVagaPartido(btn.getAttribute("data-pc-fechar-vaga"), btn.getAttribute("data-pc-chave"), Number(btn.getAttribute("data-pc-acrescimo")), lista);
      renderRevisaoDeposito();
    });
  });
  document.querySelectorAll("[data-pc-distribuir-menores]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const lista = pcState.palpitesPorCargo[btn.getAttribute("data-pc-cargo-menores")];
      distribuirComQuemTemMenos(btn.getAttribute("data-pc-distribuir-menores"), btn.getAttribute("data-pc-chave-menores"), Number(btn.getAttribute("data-pc-gap-menores")), lista);
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
    // Botão só fica habilitado com perfil cadastrado (ver disabled acima) —
    // sem cadastro não tem onde salvar de verdade, por isso nem chega aqui.
    const { error } = await salvarPalpiteCompleto(pcState.perfil.id, pcState.palpiteEdicao);
    if (error) { document.getElementById("pcDepositoStatus").textContent = "Erro ao salvar: " + error.message; return; }
    pcState.subaba = "deposito-confirmado";
    renderAppColaborativo();
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
      <h1 style="font-size:18px; margin-bottom:2px;">Prospecção Coletiva ALESC 2026${pcState.perfil ? ` — ${pcState.perfil.nome}` : ""}</h1>
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
      <h2 style="margin-top:8px;">Sua cédula foi depositada</h2>
      <div style="font-size:16px; font-weight:700; color:var(--pc-accent); margin:6px 0 4px;">Agora o game começa de verdade</div>
      <div class="pc-tile-grid">${tilesHtml}</div>
      <button class="primary" id="pcBtnIrPainel">Avançar</button>
      <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:8px;">O acesso a essas ferramentas fica disponível a partir do cadastro simples.</div>
    </div>`;
  document.getElementById("pcBtnIrPainel").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "painel"; renderAppColaborativo(); }
    else { pcState.tela = "lobby"; renderColaborativo(); }
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
      pcState.tela = "lobby";
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
