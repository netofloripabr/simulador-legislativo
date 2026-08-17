// Prospecção Coletiva — telas de cadastro/login, editor de palpite (modo
// detalhado), quadro de médias e placeholder de ranking. Depende de tudo em
// nuvem/*.js (carregado antes) e reaproveita helpers de dados/calculo/interface
// já existentes (BASE_2022, dhondt, desenharHemiciclo, chevron, infoTip,
// selosCandidato2022, corDoPartido). Não toca em `state`/app.js — estado
// próprio (`pcState`) para não arriscar quebrar o Simulador individual.

// Número de cache-busting (?cb=NN) lido direto do próprio <script src> —
// mostrado no rodapé do Menu (renderMenuConta) pra facilitar reportar bug
// ("isso é na versão X?"). Lido do DOM em vez de um valor fixo aqui pra
// nunca precisar lembrar de bumpar em 2 lugares — já é obrigatório subir
// esse número em TODAS as tags <script> junto (regra do CLAUDE.md), isso
// só aproveita o que já teria que estar certo de qualquer forma.
const PC_VERSAO_APP = (() => {
  try {
    const src = document.currentScript && document.currentScript.src;
    const m = src && src.match(/[?&]cb=(\d+)/);
    return m ? m[1] : "?";
  } catch (e) { return "?"; }
})();

let pcState = {
  iniciado: false,
  sessao: null,
  perfil: null,
  souAdmin: false, // carregado em initColaborativo() logo depois do perfil — ver migração 18 (tabela admins)
  souUsuarioFinal: false, // carregado junto com souAdmin — ver migração 19 (tabela usuarios_finais)
  modalReportarProblema: false, // ver renderMenuConta() / renderModalReportarProblema()
  modalExcluirConta: false, // ver renderMenuConta() / renderModalExcluirConta()
  adminSecao: "usuarios", // qual aba do Painel Admin está ativa
  adminPesquisaFiltro: null, // { genero, uf } — último filtro usado na seção "Pesquisa" do admin
  adminPesquisaResultados: null, // cache do resultado de adminPesquisaAgregada()
  adminPesquisaCargo: "estadual", // qual cargo a seção "Pesquisa" do admin está mostrando
  ufPesquisaFiltro: null, // { genero, uf } — último filtro usado no Painel do usuário final
  ufPesquisaResultados: null, // cache do resultado de usuarioFinalPesquisaAgregada()
  ufPesquisaCargo: "estadual", // qual cargo o Painel do usuário final está mostrando
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
  grupoMinhasCedulas: null, // cache das cédulas depositadas da própria pessoa, pro seletor "sua cédula neste grupo" (migração 15)
  grupoCedulaEscolhida: null, // salvamento_id escolhido pra esse grupo, ou null = cai na oficial global
  buscaCedulaTermo: "", // texto digitado na consulta pública de cédula (tela de Ranking)
  buscaCedulaResultados: null, // null = ainda não buscou; array = resultado da última busca (pode ser vazio)
  buscaCedulaCarregando: false,
  buscaCedulaDetalhe: null, // resultado clicado, mostrando a lista completa de eleitos
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
  modalCompartilharListaId: null, // id da lista com o modal de compartilhamento (código + imagem) aberto
  dadosCompartilhar: null, // { carregando, lista, eleitos, imagemUrl } do modal de compartilhar acima — cache pra não recarregar a cada render
  avisoLimiteListaAberto: false, // aviso "compre crédito" ao tentar criar 2ª lista sem pagar
  avisoLimiteGrupoAberto: false, // aviso "compre crédito" ao tentar criar 2º grupo sem pagar
  linksCandidatosCache: {}, // "estado::cargo" -> { chave: instagram }, ver garantirLinksCandidatos
  modalInstagramInfo: null, // { chave, nome, valorAtual } do candidato com o modal de editar Instagram aberto (só admin), ou null
  legendaComandosAberta: false, // painel único de legenda do painel de comandos da Seleção (o "i" no fim da linha de ícones)
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
  editar: '<path d="M11.1 2.6a1.5 1.5 0 012.1 2.1L5.6 12.3l-2.9.7.7-2.9z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  ajuda: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M6.2 6.3a1.9 1.9 0 013.6.8c0 1.3-1.8 1.3-1.8 2.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><circle cx="8" cy="11.6" r=".8" fill="currentColor"></circle>',
  lista: '<path d="M2.5 4.5h2M6 4.5h7.5M2.5 8h2M6 8h7.5M2.5 11.5h2M6 11.5h7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  calendario: '<rect x="2.5" y="3.3" width="11" height="10.2" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.2"></rect><path d="M2.5 6.4h11M5.3 2v2.4M10.7 2v2.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>',
  convidar: '<circle cx="6.3" cy="6" r="2.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M2.3 14c0-2.4 1.8-4.3 4-4.3s4 1.9 4 4.3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><path d="M12 5v4M10 7h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  compartilhar: '<circle cx="12" cy="3.6" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><circle cx="4" cy="8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><circle cx="12" cy="12.4" r="1.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><path d="M5.5 7.1l5-2.6M5.5 8.9l5 2.6" stroke="currentColor" stroke-width="1.1"></path>',
  checkCirculo: '<circle cx="8" cy="8" r="5.7" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M5.4 8.2l1.8 1.8 3.4-3.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  home: '<path d="M2.5 7.2L8 2.8l5.5 4.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 6.3v6.4a.9.9 0 00.9.9h6.2a.9.9 0 00.9-.9V6.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>',
  perfil: '<circle cx="8" cy="5.6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M3 13.2c0-2.7 2.2-4.6 5-4.6s5 1.9 5 4.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  impressora: '<rect x="4" y="1.8" width="8" height="3.4" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="2.3" y="5.2" width="11.4" height="5.6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="4.3" y="9.4" width="7.4" height="4.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><circle cx="11" cy="7.4" r=".6" fill="currentColor"></circle>',
  setaEsquerda: '<path d="M10 3.2L5 8l5 4.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>',
  setaDireita: '<path d="M6 3.2L11 8l-5 4.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>',
  copiar: '<rect x="6" y="6" width="7.5" height="7.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.2"></rect><path d="M4 9.5V3.7a1.2 1.2 0 011.2-1.2H9.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>',
  baixar: '<path d="M8 2.5v7.3M5 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M2.8 12.2v1a1 1 0 001 1h8.4a1 1 0 001-1v-1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>',
  buscar: '<circle cx="6.8" cy="6.8" r="4" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  salvar: '<path d="M3 2.8h8.2l2 2v8.4H3V2.8z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M5 2.8v3.6h4.6V2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path><rect x="4.8" y="9" width="6.4" height="4.2" fill="none" stroke="currentColor" stroke-width="1.2"></rect>',
  instagram: '<rect x="2" y="2" width="12" height="12" rx="3.6" fill="none" stroke="currentColor" stroke-width="1.3"></rect><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><circle cx="11.5" cy="4.5" r=".9" fill="currentColor"></circle>',
};
function iconeSvg(nome, tamanho) {
  const t = tamanho || 16;
  return `<svg viewBox="0 0 16 16" width="${t}" height="${t}">${PC_ICONES[nome] || ""}</svg>`;
}

// Painel de comandos padronizado (Seleção, barra no fim da tela) — TODOS
// os botões numa linha só, só ícone, sem "i" embutido em cada um (antes o
// "i" ficava dentro do próprio <button> da ação — infoTip/warnTip
// aninhado — e em celular qualquer toque ali corria o risco de ser lido
// como "abrir a dica" em vez de "clicar", porque o navegador simula
// :hover no primeiro toque de um elemento com essa regra CSS, deixando o
// botão "travado" pro usuário). Um único "i" discreto no fim da linha
// abre/fecha uma legenda compartilhada com a explicação de TODOS os
// comandos de uma vez — não precisa mais separar toque-rápido de
// toque-mantido em cada botão, porque agora nenhum botão de ação tem
// nada de hover embutido nele. Prototipado com o usuário em 17/08/2026
// antes de implementar (várias rodadas de ajuste, inclusive a
// responsividade — ver o CSS de .pc-cmd-painel pro motivo de ser só CSS,
// sem JS medindo largura).
//
// comandoIcone: só o botão (chamado pra cada item, dentro de .pc-cmd-painel).
function comandoIcone(opcoes) {
  const { id, icone, tamanho, titulo, disabled, classeExtra, atributosExtra } = opcoes;
  return `<button type="button" id="${id}" class="pc-cmd-acao${classeExtra ? " " + classeExtra : ""}" title="${escaparAtributoHtml(titulo)}" ${disabled ? "disabled" : ""} ${atributosExtra || ""}>${iconeSvg(icone, tamanho || 15)}</button>`;
}

// renderPainelComandos: monta a linha inteira de ícones + o "i" + o painel
// de legenda (fechado por padrão) a partir da MESMA lista de comandos —
// uma fonte só de verdade, sem repetir título/ícone/explicação em dois
// lugares. `comandos` é um array de { id, icone, tamanho, titulo, legenda,
// disabled, classeExtra, atributosExtra }; `aberta` é
// pcState.legendaComandosAberta (ou equivalente) pra lembrar o estado
// entre re-renders.
function renderPainelComandos(comandos, aberta) {
  const botoes = comandos.map((c) => comandoIcone(c)).join("");
  const itensLegenda = comandos.map((c) => `
    <div class="pc-cmd-legenda-item">
      <div class="pc-cmd-legenda-icone">${iconeSvg(c.icone, 15)}</div>
      <div>
        <div class="pc-cmd-legenda-titulo">${c.titulo}</div>
        <div class="pc-cmd-legenda-sub">${c.legenda || ""}</div>
      </div>
    </div>`).join("");
  return `
    <div class="pc-cmd-painel">
      ${botoes}
      <button type="button" id="pcCmdLegendaToggle" class="pc-cmd-info${aberta ? " aberto" : ""}" title="O que faz cada botão">i</button>
    </div>
    <div class="pc-cmd-legenda-painel${aberta ? " aberto" : ""}" id="pcCmdLegendaPainel">${itensLegenda}</div>`;
}

// Escapa aspas pra usar valor de texto livre (ex.: link de Instagram
// cadastrado por um admin) dentro de um atributo HTML sem quebrar o resto
// da tag — o resto do app não escapa texto livre em innerHTML (convenção
// já existente, ex.: nome de lista), mas um href é fácil de quebrar/
// sequestrar com uma aspa mal colocada, então esse ganha o cuidado extra.
function escaparAtributoHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Logo oficial de 4 cores do Google, pros botões "Entrar/Cadastrar com
// Google" (pedido do usuário, 15/08/2026 — facilita reconhecer o botão à
// primeira vista). Não usa iconeSvg()/PC_ICONES porque aquele padrão é
// monocromático (currentColor); a marca do Google é sempre colorida.
const GOOGLE_G_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
</svg>`;

// Estado vazio padronizado (ícone + título + texto + botão de ação
// opcional) — mockup validado com o usuário em 14/08/2026, substitui os 3
// jeitos diferentes que existiam antes pra dizer "não tem nada aqui ainda"
// (achado numa auditoria: .pc-sub solto, linha de lista fake, cor
// hardcoded fora do tema). botaoLabel/botaoId só quando existe uma ação
// real de próximo passo pra oferecer — telas de busca/filtro não têm CTA.
function estadoVazio({ icone, titulo, texto, botaoLabel, botaoId }) {
  return `
    <div class="pc-estado-vazio">
      <div class="pc-estado-vazio-icone">${iconeSvg(icone, 20)}</div>
      <div class="pc-estado-vazio-titulo">${titulo}</div>
      <div class="pc-estado-vazio-texto">${texto}</div>
      ${botaoLabel ? `<button class="primary" id="${botaoId}" style="margin-top:14px;">${botaoLabel}</button>` : ""}
    </div>`;
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
    pcState.souAdmin = await souAdmin();
    pcState.souUsuarioFinal = await souUsuarioFinal();
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
    // Onboarding + mini-pesquisa obrigatória (migração 20) — PAUSADAS a
    // pedido do usuário em 15/08/2026, depois de testar ao vivo: quer
    // pensar num onboarding melhor, e trocar a mini-pesquisa por uma
    // "pesquisa estimulada" (candidatos reais pra escolher, não nome
    // livre) — os dois ficam pra depois da primeira versão do sistema.
    // Código mantido (renderTelaOnboarding/renderTelaMiniPesquisa,
    // abaixo) pra reativar fácil quando chegar a hora — só o gate abaixo
    // está desligado. Sem isso, cadastro/login cai direto no app, igual
    // era antes dessas duas telas existirem.
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
    { id: "medias", icone: "chart", label: "Mediana", gate: gateConvidado },
    { id: "grupo", icone: "grupos", label: "Grupos", gate: gateConvidado },
    { id: "ranking", icone: "ranking", label: "Ranking" },
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
  // Ranking: a pontuação em si depende do resultado oficial (ver aviso na
  // própria tela), mas a consulta pública de cédula por nome/código não
  // depende — por isso, diferente de Médias/Grupos, não pede cadastro.
  if (destino === "ranking") {
    if (pcState.perfil) { pcState.subaba = "ranking"; renderAppColaborativo(); }
    else { pcState.tela = "ranking-convidado"; renderColaborativo(); }
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
  if (pcState.tela === "ranking-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderRankingPlaceholder(); atualizarMenuFixo("ranking"); return; }
  if (pcState.tela === "ajuda-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderCentralAjuda(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "detalhado-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderMeuPalpite(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "login") return renderTelaLogin();
  if (pcState.tela === "recuperar-senha") return renderTelaRecuperarSenha();
  if (pcState.tela === "nova-senha") return renderTelaNovaSenha();
  if (pcState.tela === "cadastro") return renderTelaCadastro();
  if (pcState.tela === "completar-perfil") return renderTelaCompletarPerfil();
  if (pcState.tela === "onboarding") return renderTelaOnboarding();
  if (pcState.tela === "mini-pesquisa") return renderTelaMiniPesquisa();
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
      <div class="pc-sub" style="text-align:center; margin-bottom:6px;">Selecione o estado.</div>

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
      ${eleitos.map((c, i) => linha(c, i)).join("") || estadoVazio({ icone: "ballot", titulo: "Nenhum candidato marcado", texto: "Essa pessoa ainda não marcou ninguém como eleito nesse cargo." })}
      ${suplentes.map((c, i) => linha(c, eleitos.length + i, "próximo")).join("")}
    </div>`;
  };
  el.innerHTML = `
    <div class="glass-card" style="max-width:640px; margin:0 auto 12px;">
      <div style="font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:var(--pc-accent); font-weight:700; margin-bottom:4px;">Palpite compartilhado</div>
      <div style="font-size:20px; font-weight:700; margin:0 0 4px;">${dados.nome_exibicao}</div>
      <div class="pc-sub" style="margin:0;">Prospecção Coletiva — Simulador Eleitoral — Legislativo 2026 — Santa Catarina</div>
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
    nome e a lista de candidatos ficam visíveis pra outros usuários na
    Mediana — essa é uma escolha sua, feita no momento do depósito, e pode
    ser trocada pra anônima em depósitos futuros.` },
  { t: "5. Por quanto tempo guardamos", c: `Enquanto sua conta existir. Se você pedir a exclusão da conta, apagamos
    seus dados pessoais (nome, e-mail, CPF em hash) — listas já depositadas de
    forma pública podem ser mantidas de forma desvinculada da sua identidade
    (anonimizadas), já que fazem parte do histórico agregado de outras
    pessoas que usaram a Mediana.` },
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
      <div style="font-size:20px; font-weight:700; margin:0 0 4px;">${titulo}</div>
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
      <button class="ghost" id="pcBtnEntrarGoogle" style="width:100%; display:flex; align-items:center; justify-content:center; gap:10px;">${GOOGLE_G_SVG}Entrar com Google</button>
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

// Onboarding de primeiro acesso, 4 telas, uma vez só (PROJETO.md, Fase 3 —
// "telas de introdução/tutorial", nunca implementado). Mockup validado com
// o usuário em 14/08/2026. Usa o mesmo sinal de gate da mini-pesquisa
// (perfil.mini_pesquisa_em null — ver initColaborativo) porque as duas
// sempre andam juntas: não precisa de coluna própria no banco, já que
// "Pular" e terminar as 4 telas levam pro mesmo lugar (mini-pesquisa) e o
// que marca "já vi isso tudo" é sempre o fim da mini-pesquisa.
const PC_ONBOARDING_PASSOS = [
  { icone: "ballot", titulo: "O que é o Simulador", texto: "Você monta sua própria previsão de quem se elege em 2026 — como se fosse seu próprio instituto de pesquisa." },
  { icone: "lista", titulo: "Como montar sua cédula", texto: "Escolha detalhado (voto a voto) ou simplificado (só quem se elege) — os dois valem pro ranking." },
  { icone: "ranking", titulo: "Ranking e grupos", texto: "Deposite sua cédula pra entrar no ranking geral, ou compare em privado com um grupo de amigos." },
  { icone: "completar", titulo: "Pronto pra começar", texto: "Antes de entrar, um palpite rápido pra Presidente e Governador — leva 1 minuto." },
];

function renderTelaOnboarding() {
  if (!pcState.onboardingPasso) pcState.onboardingPasso = 0;
  const passo = pcState.onboardingPasso;
  const dados = PC_ONBOARDING_PASSOS[passo];
  const ultimo = passo === PC_ONBOARDING_PASSOS.length - 1;
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:380px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
        <span style="font-size:11px; color:var(--pc-ink-dim);">${passo + 1} de ${PC_ONBOARDING_PASSOS.length}</span>
        <button class="ghost" id="pcBtnOnboardingPular" style="padding:5px 12px; font-size:11.5px;">Pular</button>
      </div>
      ${estadoVazio({ icone: dados.icone, titulo: dados.titulo, texto: dados.texto })}
      <div style="display:flex; gap:10px; margin-top:8px;">
        ${passo > 0 ? `<button class="ghost" id="pcBtnOnboardingVoltar" style="flex:1;">Voltar</button>` : ""}
        <button class="primary" id="pcBtnOnboardingProximo" style="flex:2;">${ultimo ? "Começar" : "Próximo"}</button>
      </div>
    </div>`;

  document.getElementById("pcBtnOnboardingPular").addEventListener("click", () => {
    pcState.tela = "mini-pesquisa";
    renderColaborativo();
  });
  if (passo > 0) {
    document.getElementById("pcBtnOnboardingVoltar").addEventListener("click", () => {
      pcState.onboardingPasso = passo - 1;
      renderTelaOnboarding();
    });
  }
  document.getElementById("pcBtnOnboardingProximo").addEventListener("click", () => {
    if (ultimo) {
      pcState.tela = "mini-pesquisa";
      renderColaborativo();
    } else {
      pcState.onboardingPasso = passo + 1;
      renderTelaOnboarding();
    }
  });
}

// Mini-pesquisa obrigatória, uma vez só, logo depois do cadastro (ver
// initColaborativo — só quem tem perfil.mini_pesquisa_em null cai aqui;
// contas de antes da migração 20 foram marcadas como já respondidas).
// PROJETO.md, Fase 2.7: 5 cargos (Presidente/Governador/Senador/Dep.
// Federal/Dep. Estadual) + 2º turno. Presidente e Governador são os únicos
// cargos majoritários com 2º turno de verdade no sistema eleitoral
// brasileiro (Senador é decidido em 1 turno só) — por isso só esses dois
// perguntam sobre 2º turno; "simplificar" isso pro resto seria incorreto
// (mesmo cuidado eleitoral documentado em CLAUDE.md).
function renderTelaMiniPesquisa() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <h2>Antes de começar, seu palpite rápido</h2>
      <div class="pc-sub" style="margin-bottom:16px;">Só uma vez: quem você acha que vence cada disputa em 2026. Pra Presidente e Governador (não cobertos em detalhe aqui), é só o nome mesmo — pra Senador, Dep. Federal e Dep. Estadual você vai montar a cédula completa daqui a pouco.</div>

      <div class="field-row"><label>Presidente</label><input class="cell" id="pcMpPresidente" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Vai ter 2º turno?</label>
        <select class="cell" id="pcMpPresidente2t">
          <option value="">Selecione</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div style="margin:16px 0; border-top:1px solid var(--pc-glass-border);"></div>

      <div class="field-row"><label>Governador (SC)</label><input class="cell" id="pcMpGovernador" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Vai ter 2º turno?</label>
        <select class="cell" id="pcMpGovernador2t">
          <option value="">Selecione</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div style="margin:16px 0; border-top:1px solid var(--pc-glass-border);"></div>

      <div class="field-row"><label>Senador (SC)</label><input class="cell" id="pcMpSenador" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Dep. Federal (SC)</label><input class="cell" id="pcMpFederal" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Dep. Estadual (SC)</label><input class="cell" id="pcMpEstadual" placeholder="Nome do candidato"></div>

      <div class="pc-erro" id="pcMpErro"></div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnMpContinuar" style="flex:1;">Continuar</button>
        <button class="ghost" id="pcBtnMpSair">Sair</button>
      </div>
    </div>`;

  document.getElementById("pcBtnMpSair").addEventListener("click", async () => {
    await sair();
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "landing", subaba: "selecao", estado: null, vagasPorPartido: null, ultimoEditadoPartido: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, modoPartido: {}, erro: "", status: "" };
    renderColaborativo();
  });
  document.getElementById("pcBtnMpContinuar").addEventListener("click", async (e) => {
    const respostas = {
      presidente: document.getElementById("pcMpPresidente").value.trim(),
      presidente_2_turno: document.getElementById("pcMpPresidente2t").value,
      governador: document.getElementById("pcMpGovernador").value.trim(),
      governador_2_turno: document.getElementById("pcMpGovernador2t").value,
      senador: document.getElementById("pcMpSenador").value.trim(),
      dep_federal: document.getElementById("pcMpFederal").value.trim(),
      dep_estadual: document.getElementById("pcMpEstadual").value.trim(),
    };
    const erroEl = document.getElementById("pcMpErro");
    if (!respostas.presidente || !respostas.governador || !respostas.senador || !respostas.dep_federal || !respostas.dep_estadual) {
      erroEl.textContent = "Preenche um nome pra cada cargo — pode ser um palpite rápido, dá pra errar.";
      return;
    }
    if (!respostas.presidente_2_turno || !respostas.governador_2_turno) {
      erroEl.textContent = "Falta dizer se acha que vai ter 2º turno pra Presidente e Governador.";
      return;
    }
    erroEl.textContent = "";
    e.target.disabled = true;
    const { error } = await salvarMiniPesquisa(pcState.perfil.id, respostas);
    if (error) {
      e.target.disabled = false;
      erroEl.textContent = error.message;
      return;
    }
    pcState.perfil = { ...pcState.perfil, mini_pesquisa_respostas: respostas, mini_pesquisa_em: new Date().toISOString() };
    pcState.tela = "app";
    renderColaborativo();
  });
}

function renderTelaCadastro() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarCadastro" style="margin-bottom:14px;">← Voltar</button>
      <h2>Criar conta</h2>
      <button class="ghost" id="pcBtnCadastrarGoogle" style="width:100%; display:flex; align-items:center; justify-content:center; gap:10px;">${GOOGLE_G_SVG}Acessar com o Google</button>
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
      ${pcState.perfil ? `<button class="pc-mini-btn" id="pcBtnAbrirPerfil" title="Menu">${iconeSvg("perfil", 18)}</button>` : ""}
    </div>
    <div id="pcConteudo"></div>
  `;
  if (pcState.perfil) {
    document.getElementById("pcBtnAbrirPerfil").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
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
  else if (pcState.subaba === "menu") { renderMenuConta(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "meu-perfil") { renderMeuPerfil(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "ajuda") { renderCentralAjuda(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "admin") { renderAdminPainel(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "usuario-final") { renderPainelUsuarioFinal(); atualizarMenuFixo(null); }
  else { renderRankingPlaceholder(); atualizarMenuFixo("ranking"); }
}

// Tela "Meus dados" — só os campos editáveis da conta + trocar senha.
// Reportar problema, admin, notificações, ajuda e Sair moraram aqui até
// 16/08/2026, agora vivem na tela "Menu" (renderMenuConta, abaixo) — essa
// aqui ficou só com edição de dados de conta, acessada a partir de lá.
async function renderMeuPerfil() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando seus dados…");
  const p = pcState.perfil;
  const sessao = pcState.sessao || await sessaoAtual();
  const email = sessao ? sessao.user.email : "";

  el.innerHTML = `
    <button class="ghost" id="pcBtnVoltarMeuPerfil" style="margin-bottom:14px;">← Voltar</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Meus dados</div>
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <div class="pc-sub" style="margin-bottom:16px;">${email}</div>

      <div class="field-row"><label>Nome</label><input class="cell" id="pcPerfilNome" value="${p.nome || ""}"></div>
      <div class="field-row"><label>Telefone</label><input class="cell" id="pcPerfilTelefone" value="${p.telefone || ""}" placeholder="(48) 99999-9999"></div>
      <div class="field-row"><label>CEP</label><input class="cell" id="pcPerfilCep" value="${p.cep || ""}"></div>
      <div class="field-row"><label>Município</label><input class="cell" id="pcPerfilMunicipio" value="${p.municipio_residencia || ""}"></div>
      <div class="field-row"><label>Gênero</label>
        <select class="cell" id="pcPerfilGenero">
          <option value="" ${!p.genero ? "selected" : ""}>Selecione</option>
          <option value="Masculino" ${p.genero === "Masculino" ? "selected" : ""}>Masculino</option>
          <option value="Feminino" ${p.genero === "Feminino" ? "selected" : ""}>Feminino</option>
          <option value="Outro" ${p.genero === "Outro" ? "selected" : ""}>Outro</option>
        </select>
      </div>
      <div class="pc-erro" id="pcPerfilErro"></div>
      <button class="primary" id="pcBtnSalvarPerfil" style="width:100%; margin-top:6px;">Salvar alterações</button>
      <div class="pc-status" id="pcPerfilStatus" style="text-align:center; margin-top:8px;"></div>

      <div style="margin:22px 0 16px; border-top:1px solid var(--pc-glass-border);"></div>

      <h2 style="font-size:15px; margin-bottom:10px;">Trocar senha</h2>
      <div class="field-row"><label>Nova senha</label><input class="cell" type="password" id="pcPerfilNovaSenha" placeholder="mín. 8 caracteres, letra, número e símbolo"></div>
      <div class="pc-erro" id="pcSenhaErro"></div>
      <button class="ghost" id="pcBtnTrocarSenha" style="width:100%;">Trocar senha</button>
      <div class="pc-status" id="pcSenhaStatus" style="text-align:center; margin-top:8px;"></div>
    </div>`;

  document.getElementById("pcBtnVoltarMeuPerfil").addEventListener("click", () => {
    pcState.subaba = "menu";
    renderAppColaborativo();
  });
  document.getElementById("pcBtnSalvarPerfil").addEventListener("click", async () => {
    const nome = document.getElementById("pcPerfilNome").value.trim();
    const erroEl = document.getElementById("pcPerfilErro");
    if (!nome) { erroEl.textContent = "O nome não pode ficar em branco."; return; }
    erroEl.textContent = "";
    const campos = {
      nome,
      telefone: document.getElementById("pcPerfilTelefone").value.trim() || null,
      cep: document.getElementById("pcPerfilCep").value.trim() || null,
      municipio_residencia: document.getElementById("pcPerfilMunicipio").value.trim() || null,
      genero: document.getElementById("pcPerfilGenero").value || null,
    };
    const { error } = await atualizarPerfil(p.id, campos);
    const status = document.getElementById("pcPerfilStatus");
    if (error) { erroEl.textContent = error.message; return; }
    pcState.perfil = { ...p, ...campos };
    status.textContent = "Salvo.";
    setTimeout(() => { if (status) status.textContent = ""; }, 2500);
  });
  document.getElementById("pcBtnTrocarSenha").addEventListener("click", async () => {
    const novaSenha = document.getElementById("pcPerfilNovaSenha").value;
    const erroEl = document.getElementById("pcSenhaErro");
    const { error } = await trocarSenhaLogado(novaSenha);
    if (error) { erroEl.textContent = error.message; return; }
    erroEl.textContent = "";
    document.getElementById("pcPerfilNovaSenha").value = "";
    document.getElementById("pcSenhaStatus").textContent = "Senha alterada.";
  });
}

// Zera pcState e manda pro login — mesmo bloco usado no botão "Sair da
// conta" de renderMenuConta, extraído aqui só pra não duplicar.
async function executarSairDaConta() {
  await sair();
  pcState = { iniciado: true, sessao: null, perfil: null, tela: "login", subaba: "selecao", estado: null, vagasPorPartido: null, ultimoEditadoPartido: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, modoPartido: {}, erro: "", status: "" };
  renderColaborativo();
}

// Tela "Menu" — recepção de conta (card de perfil + Conta/Sobre/Sair),
// redesenhada em 16/08/2026 a partir de referências visuais trazidas pelo
// usuário (mockup aprovado antes de programar, ver histórico da conversa).
// Cada linha daqui é só navegação/gatilho — a lógica de verdade continua
// nas telas de destino (renderMeuPerfil, renderCentralAjuda, o modal de
// reportar problema, etc.), sem duplicar nada.
function renderMenuConta() {
  const el = document.getElementById("pcConteudo");
  const p = pcState.perfil;
  const linhaMenu = (id, icone, cor, titulo, subtitulo) => `
    <button id="${id}" style="all:unset; box-sizing:border-box; cursor:pointer; width:100%; display:flex; align-items:center; gap:13px; padding:14px 16px; border-bottom:1px solid var(--pc-glass-border);">
      <div style="width:36px; height:36px; border-radius:10px; background:${cor}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconeSvg(icone, 17)}</div>
      <div style="flex:1; text-align:left; min-width:0;">
        <div style="font-size:14px; font-weight:600; color:var(--pc-ink);">${titulo}</div>
        ${subtitulo ? `<div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:1px;">${subtitulo}</div>` : ""}
      </div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
    </button>`;

  el.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Menu</div>

    <div class="glass-card" style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
      <div style="width:52px; height:52px; border-radius:50%; background:rgba(61,255,176,.12); border:1px solid rgba(61,255,176,.3); display:flex; align-items:center; justify-content:center; font-size:19px; font-weight:700; color:var(--pc-accent); flex-shrink:0;">${(p.nome || "?").trim().charAt(0).toUpperCase()}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:16px; font-weight:700;">${p.nome || "Sem nome"}</div>
        <div style="font-size:12px; color:var(--pc-ink-dim); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(pcState.sessao && pcState.sessao.user.email) || ""}</div>
      </div>
      <button id="pcBtnEditarPerfilMenu" class="pc-mini-btn" title="Editar meus dados" style="flex-shrink:0;">${iconeSvg("editar", 15)}</button>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Conta</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuDados", "perfil", "rgba(61,255,176,.1)", "Meus dados", "Telefone, CEP, município, gênero")}
      ${linhaMenu("pcBtnMenuSenha", "chave", "rgba(61,255,176,.1)", "Trocar senha", "Atualize sua senha de acesso")}
      <div style="display:flex; align-items:center; gap:13px; padding:14px 16px; border-bottom:1px solid var(--pc-glass-border);">
        <div style="width:36px; height:36px; border-radius:10px; background:rgba(61,255,176,.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconeSvg("alerta", 17)}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:600;">Notificações por e-mail</div>
          <div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:1px;">Avisos de grupo e da eleição (em breve)</div>
        </div>
        <label class="pc-switch" style="flex-shrink:0;"><input type="checkbox" id="pcToggleNotifEmail" ${p.notif_email ? "checked" : ""}><span class="pc-switch-slider"></span></label>
      </div>
      ${linhaMenu("pcBtnMenuReportar", "alerta", "rgba(201,138,43,.12)", "Reportar um problema", "Achou um bug? Nos conta aqui")}
      ${linhaMenu("pcBtnMenuConvidar", "convidar", "rgba(61,255,176,.1)", "Convidar amigos", "Seu grupo e código de convite")}
      ${pcState.souAdmin ? linhaMenu("pcBtnMenuAdmin", "chart", "rgba(61,255,176,.1)", "Painel do administrador", null) : ""}
      ${pcState.souUsuarioFinal ? linhaMenu("pcBtnMenuUsuarioFinal", "chart", "rgba(61,255,176,.1)", "Painel de dados estratégicos", null) : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Sobre</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuAjuda", "ajuda", "rgba(61,255,176,.1)", "Central de ajuda", "Como funciona o quociente, sobra e Senador")}
      ${linhaMenu("pcBtnMenuTermos", "ballot", "rgba(61,255,176,.1)", "Termos de uso", null)}
      ${linhaMenu("pcBtnMenuPrivacidade", "chave", "rgba(61,255,176,.1)", "Política de privacidade", null)}
    </div>

    <button id="pcBtnMenuExcluirConta" class="ghost" style="width:100%; margin-bottom:10px; color:var(--pc-danger); border-color:var(--pc-danger); opacity:.75;">Excluir conta</button>
    <button id="pcBtnMenuSair" class="ghost" style="width:100%; color:var(--pc-danger); border-color:var(--pc-danger);">Sair da conta</button>

    <div style="text-align:center; font-size:11px; color:var(--pc-ink-dim); margin-top:18px;">
      Simulador Eleitoral · Legislativo 2026
      <div style="margin-top:4px; opacity:.7;">versão ${PC_VERSAO_APP}</div>
    </div>

    ${pcState.modalReportarProblema ? renderModalReportarProblema() : ""}
    ${pcState.modalExcluirConta ? renderModalExcluirConta() : ""}`;

  document.getElementById("pcBtnEditarPerfilMenu").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuDados").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuSenha").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcToggleNotifEmail").addEventListener("change", async (e) => {
    const valor = e.target.checked;
    pcState.perfil = { ...p, notif_email: valor };
    await atualizarPerfil(p.id, { notif_email: valor });
  });
  document.getElementById("pcBtnMenuReportar").addEventListener("click", () => { pcState.modalReportarProblema = true; renderMenuConta(); });
  document.getElementById("pcBtnMenuConvidar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
  if (pcState.souAdmin) {
    document.getElementById("pcBtnMenuAdmin").addEventListener("click", () => { pcState.subaba = "admin"; renderAppColaborativo(); });
  }
  if (pcState.souUsuarioFinal) {
    document.getElementById("pcBtnMenuUsuarioFinal").addEventListener("click", () => { pcState.subaba = "usuario-final"; renderAppColaborativo(); });
  }
  document.getElementById("pcBtnMenuAjuda").addEventListener("click", () => { pcState.subaba = "ajuda"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuTermos").addEventListener("click", () => { pcState.telaLegalOrigem = "app"; pcState.tela = "termos"; renderColaborativo(); });
  document.getElementById("pcBtnMenuPrivacidade").addEventListener("click", () => { pcState.telaLegalOrigem = "app"; pcState.tela = "privacidade"; renderColaborativo(); });
  document.getElementById("pcBtnMenuExcluirConta").addEventListener("click", () => { pcState.modalExcluirConta = true; renderMenuConta(); });
  document.getElementById("pcBtnMenuSair").addEventListener("click", executarSairDaConta);

  if (pcState.modalReportarProblema) {
    document.getElementById("pcBtnFecharReportarProblema").addEventListener("click", () => {
      pcState.modalReportarProblema = false;
      renderMenuConta();
    });
    document.getElementById("pcBtnEnviarProblema").addEventListener("click", async () => {
      const mensagem = document.getElementById("pcProblemaMensagem").value.trim();
      const erroEl = document.getElementById("pcProblemaErro");
      if (!mensagem) { erroEl.textContent = "Descreve o que aconteceu, mesmo que curto."; return; }
      erroEl.textContent = "";
      const { error } = await reportarProblema(p.id, mensagem, pcState.subaba);
      if (error) { erroEl.textContent = error.message; return; }
      pcState.modalReportarProblema = false;
      pcState.status = "Problema reportado — obrigado! A gente vai olhar.";
      renderMenuConta();
    });
  }

  if (pcState.modalExcluirConta) {
    document.getElementById("pcBtnFecharExcluirConta").addEventListener("click", () => {
      pcState.modalExcluirConta = false;
      renderMenuConta();
    });
    document.getElementById("pcBtnConfirmarExcluirConta").addEventListener("click", async () => {
      const erroEl = document.getElementById("pcExcluirContaErro");
      // Não temos acesso de servidor (service_role) pra apagar a conta de
      // Auth de verdade a partir do site — só o registro da SOLICITAÇÃO,
      // na mesma tabela/fluxo de "reportar problema" (problemas_reportados,
      // já visível no Painel do administrador), pra alguém com acesso ao
      // Supabase completar a exclusão manualmente. Deixar isso claro na
      // tela em vez de fingir que já apagou tudo. Ver tarefa correspondente
      // no BACKLOG antes de prometer exclusão automática de verdade.
      const { error } = await reportarProblema(p.id, "Solicitação de exclusão de conta.", "exclusao-conta");
      if (error) { erroEl.textContent = error.message; return; }
      pcState.modalExcluirConta = false;
      await executarSairDaConta();
    });
  }
}

function renderModalExcluirConta() {
  return `
    <div id="pcModalExcluirContaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(15,35,27,.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(224,96,122,.4); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px; color:var(--pc-danger);">Excluir conta</h2>
        <div class="pc-sub" style="margin-bottom:14px; line-height:1.6;">Isso remove seu acesso e registra um pedido de exclusão dos seus dados (listas, grupos, palpites). Não dá pra desfazer depois de processado. Confirma?</div>
        <div class="pc-erro" id="pcExcluirContaErro"></div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="ghost" id="pcBtnFecharExcluirConta" style="flex:1;">Cancelar</button>
          <button id="pcBtnConfirmarExcluirConta" style="flex:1; background:var(--pc-danger); border:1px solid var(--pc-danger); color:#2a0a10; font-family:var(--sans); font-weight:700; border-radius:8px; cursor:pointer;">Excluir</button>
        </div>
      </div>
    </div>`;
}

// Central de ajuda — consolida num só lugar as explicações de regra
// eleitoral que hoje só existem espalhadas em tooltips (ⓘ) pela tela de
// Seleção (interface/prospeccao.js) e app.js — pedido do usuário,
// 16/08/2026, junto do redesenho do Menu.
function renderCentralAjuda() {
  const el = document.getElementById("pcConteudo");
  const secao = (titulo, corpo) => `
    <div class="glass-card" style="margin-bottom:12px;">
      <h2 style="font-size:15px; margin-bottom:8px;">${titulo}</h2>
      <div style="font-size:13px; line-height:1.7; color:var(--pc-ink-dim);">${corpo}</div>
    </div>`;
  el.innerHTML = `
    <button class="ghost" id="pcBtnVoltarAjuda" style="margin-bottom:14px;">← Voltar</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Central de ajuda</div>

    ${secao("Dep. Estadual e Dep. Federal — proporcional", `
      Essas duas eleições distribuem as vagas por <b style="color:var(--pc-ink);">partido</b>, não direto por candidato:<br><br>
      <b style="color:var(--pc-ink);">Quociente eleitoral (QE)</b> — votos válidos ÷ vagas do cargo (art. 106). É o "preço" de uma vaga.<br>
      <b style="color:var(--pc-ink);">Quociente partidário (QP)</b> — votos do partido ÷ QE, parte inteira (art. 107). Quantas vagas o partido já garante de cara.<br>
      <b style="color:var(--pc-ink);">Sobra (método das médias, art. 109)</b> — vagas que sobram depois do QP de todos, distribuídas uma de cada vez pro partido com a maior média (votos ÷ (cadeiras atuais + 1)) naquela rodada — sem piso mínimo de votação (o piso do art. 109 §2º foi derrubado pelo STF em fevereiro/2024).<br><br>
      Dentro do partido, quem primeiro ocupa as vagas é sempre quem tem mais voto — QP e sobra decidem QUANTAS vagas o partido leva, não QUEM dentro dele.
    `)}

    ${secao("Senador — majoritário", `
      Diferente dos outros dois, o Senado é <b style="color:var(--pc-ink);">voto direto</b> (art. 46): não tem quociente, não tem partido "ganhando vagas" — os candidatos mais votados do estado inteiro, cruzando todos os partidos, são eleitos. Em SC, 2026 é ano de elegar 2 das 3 cadeiras.
    `)}

    ${secao("\"Eleito\" no simulador", `
      Quem está marcado como eleito na sua lista é sempre a <b style="color:var(--pc-ink);">sua escolha</b> — nunca é substituído automaticamente pela matemática. Quando um candidato não marcado bateria a vaga pela conta real, você recebe um aviso — mas a decisão final é sempre sua.
    `)}

    ${secao("Isso é uma simulação", `
      Os números de 2026 são estimativas (baseadas no resultado real de 2022, escalado pelo crescimento do eleitorado) até a eleição de verdade acontecer em outubro. Nenhuma lista aqui é uma pesquisa oficial nem uma aposta.
    `)}`;

  document.getElementById("pcBtnVoltarAjuda").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "menu"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
  });
}

function renderModalReportarProblema() {
  return `
    <div id="pcModalReportarProblemaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(15,35,27,.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px;">Reportar um problema</h2>
        <div class="pc-sub" style="margin-bottom:14px;">Conta o que aconteceu — bug, tela travada, número que parece errado, qualquer coisa.</div>
        <textarea class="cell" id="pcProblemaMensagem" rows="5" style="width:100%; resize:vertical; font-family:var(--sans);" placeholder="Descreva o problema..."></textarea>
        <div class="pc-erro" id="pcProblemaErro"></div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="ghost" id="pcBtnFecharReportarProblema" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnEnviarProblema" style="flex:1;">Enviar</button>
        </div>
      </div>
    </div>`;
}

// ---------- Painel do administrador ----------
// Acesso restrito por pcState.souAdmin (carregado em initColaborativo via
// souAdmin(), que só é true se a conta estiver na tabela "admins" —
// migração 18). Cada seção busca seus próprios dados sob demanda; nada é
// pré-carregado pra quem não é admin.

async function montarAdminUsuarios() {
  const stats = await adminEstatisticasUsuarios();
  if (!stats) return `<div class="pc-sub">Não consegui carregar as estatísticas.</div>`;
  // Padrão 8.1: métrica em cartão de tom (mesmo .pc-metric do Painel
  // Eleitoral), não mais glass-card avulso.
  const cartao = (label, valor) => `
    <div class="pc-metric" style="text-align:center;">
      <div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${Number(valor || 0).toLocaleString("pt-BR")}</div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">${label}</div>
    </div>`;
  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      ${cartao("Total de cadastros", stats.total_cadastros)}
      ${cartao("Cadastros (7 dias)", stats.cadastros_7_dias)}
      ${cartao("Cadastros (30 dias)", stats.cadastros_30_dias)}
      ${cartao("Grupos criados", stats.total_grupos)}
      ${cartao("Cédulas depositadas", stats.total_cedulas_depositadas)}
      ${cartao("Depositadas (7 dias)", stats.cedulas_depositadas_7_dias)}
    </div>`;
}

async function montarAdminProblemas() {
  const problemas = await adminListarProblemas();
  if (!problemas.length) return estadoVazio({ icone: "alerta", titulo: "Nenhum problema reportado", texto: "Quando alguém reportar algo pelo Menu, aparece aqui." });
  return problemas.map((p) => `
    <div class="pc-mini-card" style="flex-direction:column; align-items:stretch; gap:6px; ${p.status === "resolvido" ? "opacity:.6;" : ""}">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <span style="font-size:12.5px; font-weight:600;">${p.nome || "—"}</span>
        <span style="font-size:10px; color:var(--pc-ink-dim); flex-shrink:0;">${new Date(p.criado_em).toLocaleDateString("pt-BR")}</span>
      </div>
      <div style="font-size:12.5px; color:var(--pc-ink-dim); line-height:1.5;">${p.mensagem}</div>
      ${p.tela ? `<div style="font-size:10px; color:var(--pc-ink-faint);">tela: ${p.tela}</div>` : ""}
      ${p.status === "aberto"
        ? `<button data-pc-resolver-problema="${p.id}" class="ghost" style="align-self:flex-start; font-size:11px; padding:5px 10px;">Marcar resolvido</button>`
        : `<span style="font-size:10.5px; color:var(--pc-accent);">✓ resolvido</span>`}
    </div>`).join("");
}

async function montarAdminPesquisa() {
  const filtro = pcState.adminPesquisaFiltro || {};
  let resultadoHtml = "";
  if (pcState.adminPesquisaResultados) {
    const registros = pcState.adminPesquisaResultados;
    if (!registros.length) {
      resultadoHtml = estadoVazio({ icone: "buscar", titulo: "Nenhuma cédula encontrada", texto: "Ninguém oficial bateu com esses filtros — tenta afrouxar o recorte." });
    } else {
      const cargo = pcState.adminPesquisaCargo || "estadual";
      const botoesCargo = CARGOS.map((c) => `<button data-pc-admin-pesquisa-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");
      resultadoHtml = `
        <div class="pc-sub" style="margin:14px 0 8px;">${registros.length} cédula${registros.length === 1 ? "" : "s"} encontrada${registros.length === 1 ? "" : "s"}</div>
        <div class="pc-cargo-switch" style="margin-bottom:12px;">${botoesCargo}</div>
        ${montarComparacaoGrupo(registros, cargo)}`;
    }
  }
  return `
    <div class="pc-sub" style="margin-bottom:12px;">Filtra as cédulas OFICIAIS já depositadas (SC) por recorte demográfico — dado disponível hoje é só gênero e UF de residência (idade ainda não é coletada no cadastro).</div>
    <div class="field-row"><label>Gênero</label>
      <select class="cell" id="pcAdminFiltroGenero">
        <option value="">Todos</option>
        <option value="Masculino" ${filtro.genero === "Masculino" ? "selected" : ""}>Masculino</option>
        <option value="Feminino" ${filtro.genero === "Feminino" ? "selected" : ""}>Feminino</option>
        <option value="Outro" ${filtro.genero === "Outro" ? "selected" : ""}>Outro</option>
      </select>
    </div>
    <div class="field-row"><label>UF de residência</label><input class="cell" id="pcAdminFiltroUf" value="${filtro.uf || ""}" placeholder="ex: SC" maxlength="2" style="text-transform:uppercase;"></div>
    <button class="primary" id="pcBtnAdminPesquisar" style="width:100%;">Buscar</button>
    ${resultadoHtml}`;
}

async function montarAdminFinanceiro() {
  const stats = await adminEstatisticasCreditos();
  if (!stats) return `<div class="pc-sub">Não consegui carregar os dados financeiros.</div>`;
  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <div class="glass-card" style="padding:14px 16px; text-align:center;">
        <div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${Number(stats.contas_com_credito || 0).toLocaleString("pt-BR")}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">Contas com saldo</div>
      </div>
      <div class="glass-card" style="padding:14px 16px; text-align:center;">
        <div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${Number(stats.total_creditos_em_circulacao || 0).toLocaleString("pt-BR")}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">Créditos em circulação</div>
      </div>
    </div>
    <div class="pc-sub" style="margin-top:14px; line-height:1.6;">Sem cobrança de verdade ainda — a única forma de conceder crédito hoje é rodar <code>select public.conceder_credito('&lt;uuid&gt;', N);</code> direto no SQL Editor do Supabase (ver nuvem/migracao-9-creditos.sql).</div>`;
}

async function montarAdminRotinas() {
  const execucoes = await adminListarExecucoesRotina();
  if (!execucoes.length) {
    return estadoVazio({ icone: "calendario", titulo: "Nenhuma execução registrada", texto: "As rotinas automáticas ainda não avisam aqui quando rodam." });
  }
  return `<div class="pc-lobby-card">${execucoes.map((e) => `
    <div class="pc-lobby-linha">
      <span style="font-size:12.5px; font-weight:600;">${e.rotina}</span>
      <span style="font-size:11px; color:${e.sucesso ? "var(--pc-accent)" : "var(--pc-danger)"}; flex-shrink:0;">${e.sucesso ? "✓ ok" : "✗ falhou"} · ${new Date(e.executado_em).toLocaleString("pt-BR")}</span>
    </div>`).join("")}</div>`;
}

async function renderAdminPainel() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando painel do administrador…");
  if (!pcState.souAdmin) {
    // Sem isso, quem cair aqui sem ser admin (ex.: pcState.subaba="admin"
    // restaurado de uma sessão antiga, depois de perder o acesso) ficava
    // preso — nem botão de voltar nem menu fixo aparecem nessa subaba
    // (atualizarMenuFixo(null), renderAppColaborativo). Achado em revisão
    // de código, 15/08/2026, antes do primeiro teste com admin de verdade.
    el.innerHTML = `<div class="glass-card"><h2>Acesso restrito</h2><div class="pc-sub">Essa área é só pra administradores.</div><button class="ghost" id="pcBtnVoltarAdminRestrito" style="width:100%; margin-top:10px;">← Voltar</button></div>`;
    document.getElementById("pcBtnVoltarAdminRestrito").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
    });
    return;
  }

  const secoes = [
    { id: "usuarios", label: "Usuários" },
    { id: "problemas", label: "Problemas" },
    { id: "pesquisa", label: "Pesquisa" },
    { id: "financeiro", label: "Financeiro" },
    { id: "rotinas", label: "Rotinas" },
  ];
  const botoesSecao = secoes.map((s) => `<button data-pc-admin-secao="${s.id}" class="${pcState.adminSecao === s.id ? "active" : ""}">${s.label}</button>`).join("");

  let conteudoSecao = "";
  if (pcState.adminSecao === "usuarios") conteudoSecao = await montarAdminUsuarios();
  else if (pcState.adminSecao === "problemas") conteudoSecao = await montarAdminProblemas();
  else if (pcState.adminSecao === "pesquisa") conteudoSecao = await montarAdminPesquisa();
  else if (pcState.adminSecao === "financeiro") conteudoSecao = await montarAdminFinanceiro();
  else conteudoSecao = await montarAdminRotinas();

  el.innerHTML = `
    <button class="ghost" id="pcBtnVoltarAdmin" style="margin-bottom:14px;">← Voltar</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Painel do administrador</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Visão operacional do sistema — não substitui o Supabase, cobre só o essencial do dia a dia.</div>
    <div class="pc-cargo-switch" style="margin-bottom:16px; flex-wrap:wrap; height:auto;">${botoesSecao}</div>
    <div id="pcAdminConteudo">${conteudoSecao}</div>`;

  document.getElementById("pcBtnVoltarAdmin").addEventListener("click", () => {
    pcState.subaba = "menu";
    renderAppColaborativo();
  });
  document.querySelectorAll("[data-pc-admin-secao]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.adminSecao = btn.getAttribute("data-pc-admin-secao");
      renderAdminPainel();
    });
  });

  if (pcState.adminSecao === "problemas") {
    document.querySelectorAll("[data-pc-resolver-problema]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await adminMarcarProblemaResolvido(btn.getAttribute("data-pc-resolver-problema"));
        renderAdminPainel();
      });
    });
  }
  if (pcState.adminSecao === "pesquisa") {
    document.getElementById("pcBtnAdminPesquisar").addEventListener("click", async () => {
      const genero = document.getElementById("pcAdminFiltroGenero").value;
      const uf = document.getElementById("pcAdminFiltroUf").value.trim().toUpperCase();
      pcState.adminPesquisaFiltro = { genero, uf };
      pcState.adminPesquisaResultados = await adminPesquisaAgregada(pcState.estado || "SC", genero, uf);
      renderAdminPainel();
    });
    document.querySelectorAll("[data-pc-admin-pesquisa-cargo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pcState.adminPesquisaCargo = btn.getAttribute("data-pc-admin-pesquisa-cargo");
        renderAdminPainel();
      });
    });
  }
}

// ---------- Painel do usuário final ----------
// Acesso restrito por pcState.souUsuarioFinal (migração 19, tabela
// usuarios_finais — concedido manualmente, mesmo padrão do admin). PROJETO.md
// seção 3: "parceiro estratégico" (partido, empresário) que não prevê, só
// consome dados agregados — nunca perfil individual de quem previu (ponto em
// aberto #1). Por isso reaproveita montarComparacaoGrupo, que já só agrega
// por partido/vagas, igual à seção "Pesquisa" do admin — só troca a função
// de origem dos dados (usuarioFinalPesquisaAgregada em vez de
// adminPesquisaAgregada) e não tem as outras 4 abas administrativas.
async function renderPainelUsuarioFinal() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando painel de dados estratégicos…");
  if (!pcState.souUsuarioFinal) {
    // Mesmo ajuste de renderAdminPainel — sem botão de voltar, essa tela
    // vira um beco sem saída (menu fixo fica escondido nessa subaba).
    el.innerHTML = `<div class="glass-card"><h2>Acesso restrito</h2><div class="pc-sub">Essa área é só pra parceiros com acesso liberado.</div><button class="ghost" id="pcBtnVoltarUsuarioFinalRestrito" style="width:100%; margin-top:10px;">← Voltar</button></div>`;
    document.getElementById("pcBtnVoltarUsuarioFinalRestrito").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
    });
    return;
  }

  const filtro = pcState.ufPesquisaFiltro || {};
  let resultadoHtml = "";
  if (pcState.ufPesquisaResultados) {
    const registros = pcState.ufPesquisaResultados;
    if (!registros.length) {
      resultadoHtml = estadoVazio({ icone: "buscar", titulo: "Nenhuma cédula encontrada", texto: "Ninguém oficial bateu com esses filtros — tenta afrouxar o recorte." });
    } else {
      const cargo = pcState.ufPesquisaCargo || "estadual";
      const botoesCargo = CARGOS.map((c) => `<button data-pc-uf-pesquisa-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");
      resultadoHtml = `
        <div class="pc-sub" style="margin:14px 0 8px;">${registros.length} cédula${registros.length === 1 ? "" : "s"} encontrada${registros.length === 1 ? "" : "s"}</div>
        <div class="pc-cargo-switch" style="margin-bottom:12px;">${botoesCargo}</div>
        ${montarComparacaoGrupo(registros, cargo)}`;
    }
  }

  el.innerHTML = `
    <button class="ghost" id="pcBtnVoltarUsuarioFinal" style="margin-bottom:14px;">← Voltar</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Dados estratégicos</div>
    <div class="pc-sub" style="margin:0 0 16px 2px;">Resultados agregados das cédulas oficiais já depositadas — sem nome nem perfil individual de quem previu.</div>
    <div class="glass-card">
      <div class="pc-sub" style="margin-bottom:12px;">Filtra por recorte demográfico — dado disponível hoje é só gênero e UF de residência (idade ainda não é coletada no cadastro).</div>
      <div class="field-row"><label>Gênero</label>
        <select class="cell" id="pcUfFiltroGenero">
          <option value="">Todos</option>
          <option value="Masculino" ${filtro.genero === "Masculino" ? "selected" : ""}>Masculino</option>
          <option value="Feminino" ${filtro.genero === "Feminino" ? "selected" : ""}>Feminino</option>
          <option value="Outro" ${filtro.genero === "Outro" ? "selected" : ""}>Outro</option>
        </select>
      </div>
      <div class="field-row"><label>UF de residência</label><input class="cell" id="pcUfFiltroUf" value="${filtro.uf || ""}" placeholder="ex: SC" maxlength="2" style="text-transform:uppercase;"></div>
      <button class="primary" id="pcBtnUfPesquisar" style="width:100%;">Buscar</button>
      ${resultadoHtml}
    </div>`;

  document.getElementById("pcBtnVoltarUsuarioFinal").addEventListener("click", () => {
    pcState.subaba = "menu";
    renderAppColaborativo();
  });
  document.getElementById("pcBtnUfPesquisar").addEventListener("click", async () => {
    const genero = document.getElementById("pcUfFiltroGenero").value;
    const uf = document.getElementById("pcUfFiltroUf").value.trim().toUpperCase();
    pcState.ufPesquisaFiltro = { genero, uf };
    pcState.ufPesquisaResultados = await usuarioFinalPesquisaAgregada(pcState.estado || "SC", genero, uf);
    renderPainelUsuarioFinal();
  });
  document.querySelectorAll("[data-pc-uf-pesquisa-cargo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.ufPesquisaCargo = btn.getAttribute("data-pc-uf-pesquisa-cargo");
      renderPainelUsuarioFinal();
    });
  });
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
    const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
    const rascunho = pcState.rascunhosCache[c.id];
    // rascunhoEhOrfao: mesma regra de garantirPalpiteEdicaoAtivo — não
    // conta rascunho preso num elenco antigo que a fonte oficial já
    // substituiu.
    const lista = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial)) ? rascunho : poolOficial;
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

  // Subtítulos dos atalhos — só dado já disponível/barato de buscar aqui
  // (rascunhosCache e meusGrupos já carregados acima); Mediana fica com
  // texto fixo porque contar palpites públicos de verdade puxaria TODOS os
  // rascunhos públicos do estado só pra um número no Painel, caro demais
  // pra essa tela. Redesenho pedido pelo usuário em 16/08/2026 (referência
  // Nubank/BYD), mockup aprovado antes de programar.
  const totalListas = (await _carregarMinhasListasNormalizado()).length;
  const totalGrupos = pcState.meusGrupos ? pcState.meusGrupos.length : 0;

  el.innerHTML = `
    ${completa && !gateConvidado ? `
    <div style="display:flex; justify-content:flex-end; margin-bottom:14px;">
      <button class="pc-lobby-icon-btn" id="pcBtnCompartilharLobby" title="Compartilhar minha lista">${iconeSvg("compartilhar", 16)}</button>
    </div>` : ""}

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

    <div class="pc-lobby-banner">
      <div class="pc-lobby-banner-eyebrow">Convide amigos</div>
      <div class="pc-lobby-banner-titulo">Desafie quem mais entende de política</div>
      <div class="pc-lobby-banner-corpo">Compare sua lista lado a lado com a de amigos, num grupo só seu.</div>
      <button class="pc-lobby-banner-btn" id="pcBtnConviteBanner">Criar grupo ${iconeSvg("setaDireita", 13)}</button>
    </div>

    <div class="pc-lobby-menu-tit">Atalhos</div>
    <div class="pc-lobby-atalhos">
      <button class="pc-lobby-atalho" id="pcMenuListas">
        <div class="pc-lobby-atalho-icone">${iconeSvg("ballot", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Minhas listas</div><div class="pc-lobby-atalho-sub">${totalListas ? `${totalListas} lista${totalListas === 1 ? "" : "s"}` : "Nenhuma ainda"}</div></div>
      </button>
      <button class="pc-lobby-atalho" id="pcMenuMedias" style="${estiloApagado}" title="${tituloApagado}">
        <div class="pc-lobby-atalho-icone">${iconeSvg("chart", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Mediana</div><div class="pc-lobby-atalho-sub">${gateConvidado ? "Precisa se cadastrar" : "Pesquisa pública"}</div></div>
      </button>
      <button class="pc-lobby-atalho" id="pcMenuGrupos" style="${estiloApagado}" title="${tituloApagado}">
        <div class="pc-lobby-atalho-icone">${iconeSvg("grupos", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Grupos</div><div class="pc-lobby-atalho-sub">${gateConvidado ? "Precisa se cadastrar" : (totalGrupos ? `${totalGrupos} grupo${totalGrupos === 1 ? "" : "s"}` : "Nenhum ainda")}</div></div>
      </button>
      <button class="pc-lobby-atalho" id="pcMenuRanking">
        <div class="pc-lobby-atalho-icone">${iconeSvg("ranking", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Ranking</div><div class="pc-lobby-atalho-sub">Em breve</div></div>
      </button>
    </div>

    <div class="pc-lobby-mais-tit">Mais funções</div>
    <div class="pc-lobby-mais">
      <button class="pc-lobby-mais-item" id="pcMenuAjudaLobby">${iconeSvg("ajuda", 15)}<span>Central de ajuda</span>${iconeSvg("setaDireita", 13)}</button>
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
  document.getElementById("pcMenuRanking").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "ranking"; renderAppColaborativo(); }
    else { pcState.tela = "ranking-convidado"; renderColaborativo(); }
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
  document.getElementById("pcBtnConviteBanner").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcMenuAjudaLobby").addEventListener("click", () => {
    // Central de ajuda é conteúdo fixo (regras do jogo), sem depender de
    // conta — diferente de Mediana/Grupos, não faz sentido pedir cadastro
    // só pra ler isso.
    if (pcState.perfil) { pcState.subaba = "ajuda"; renderAppColaborativo(); }
    else { pcState.tela = "ajuda-convidado"; renderColaborativo(); }
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
      depositadoEm: s.depositado_em, anonimo: !!s.anonimo, codigo: s.codigo || null,
    }));
  }
  return await carregarListasSalvasLocais(pcState.estado);
}

// Quebra texto num <canvas> em várias linhas, sem passar de larguraMax —
// usado só pelo título da imagem de compartilhamento (gerarImagemCedula),
// que pode não caber numa linha só dependendo do nome da pessoa.
function _quebrarLinhasCanvas(ctx, texto, larguraMax) {
  const palavras = texto.split(" ");
  const linhas = [];
  let atual = "";
  palavras.forEach((palavra) => {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width > larguraMax && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  });
  if (atual) linhas.push(atual);
  return linhas;
}

// Imagem compartilhável (formato Stories, 1080x1920) da cédula depositada —
// agora cobre os 3 cargos (Dep. Estadual, Dep. Federal, Senador), um por
// vez conforme cargoLabel — antes só existia pra Estadual, estendida a
// pedido do usuário em 13/08/2026 (já registrado no backlog). Respeita a
// mesma escolha anônimo/com nome feita no depósito (nuvem/salvamentos.js:
// depositarSalvamento) — nunca mostra o nome de quem pediu pra ficar
// anônimo.
function gerarImagemCedula({ nomeExibido, eleitos, codigo, cargoLabel }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  const fundo = ctx.createLinearGradient(0, 0, 0, canvas.height);
  fundo.addColorStop(0, "#0c2a1e");
  fundo.addColorStop(0.55, "#081712");
  fundo.addColorStop(1, "#050d0a");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#3dffb0";
  ctx.font = "700 34px sans-serif";
  ctx.fillText("SIMULALEGIS", canvas.width / 2, 150);

  ctx.fillStyle = "#eefff6";
  ctx.font = "700 56px sans-serif";
  const linhasTitulo = _quebrarLinhasCanvas(ctx, "Minha lista pros eleitos de 2026", 860);
  linhasTitulo.forEach((linha, i) => ctx.fillText(linha, canvas.width / 2, 250 + i * 64));

  let y = 250 + linhasTitulo.length * 64;
  if (cargoLabel) {
    y += 56;
    ctx.textAlign = "center";
    ctx.fillStyle = "#7fa895";
    ctx.font = "700 30px sans-serif";
    ctx.fillText(cargoLabel.toUpperCase(), canvas.width / 2, y);
  }
  y += 90;
  ctx.textAlign = "left";
  const maxNaImagem = 12;
  eleitos.slice(0, maxNaImagem).forEach((c, i) => {
    ctx.fillStyle = "#3dffb0";
    ctx.font = "700 32px monospace";
    ctx.fillText(`${i + 1}º`, 130, y);
    ctx.fillStyle = "#eefff6";
    ctx.font = "600 34px sans-serif";
    ctx.fillText(c.nome, 210, y);
    ctx.fillStyle = "#7fa895";
    ctx.font = "400 26px sans-serif";
    ctx.fillText(c.partido, 210, y + 34);
    y += 84;
  });
  if (eleitos.length > maxNaImagem) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#7fa895";
    ctx.font = "400 28px sans-serif";
    ctx.fillText(`+ ${eleitos.length - maxNaImagem} eleitos`, canvas.width / 2, y + 14);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#eefff6";
  ctx.font = "600 32px sans-serif";
  ctx.fillText(nomeExibido, canvas.width / 2, 1760);
  ctx.fillStyle = "#3dffb0";
  ctx.font = "700 38px monospace";
  ctx.fillText(codigo, canvas.width / 2, 1815);
  ctx.fillStyle = "#547566";
  ctx.font = "400 24px sans-serif";
  ctx.fillText("Agora é a sua vez de palpitar", canvas.width / 2, 1870);

  return canvas;
}

// Desenha um "mini-card" de candidato (moldura + nome + cotação) em
// (x,y,largura) e devolve a altura ocupada — usado tanto direto (linhas
// visíveis) quanto dentro de um canvas OFFSCREEN que depois recebe blur +
// fade (linhas "escondidas", ver _desenharColunaCedulaResumo).
function _desenharMiniCardCandidato(ctx, c, x, y, largura) {
  const altura = 96;
  ctx.fillStyle = "#0e2018";
  ctx.strokeStyle = "#1d3a2c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, largura, altura, 12);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#3dffb0";
  ctx.font = "800 26px monospace";
  ctx.fillText(`${c.posicao}º`, x + 16, y + 38);
  const larguraPos = ctx.measureText(`${c.posicao}º`).width;
  ctx.fillStyle = "#eefff6";
  ctx.font = "600 26px sans-serif";
  const nomeMax = largura - 32 - larguraPos - 12;
  let nome = c.nome;
  while (ctx.measureText(nome).width > nomeMax && nome.length > 3) nome = nome.slice(0, -1);
  if (nome !== c.nome) nome = nome.replace(/\s*\S*$/, "") + "…";
  ctx.fillText(nome, x + 16 + larguraPos + 12, y + 38);

  ctx.fillStyle = "#7fa895";
  ctx.font = "400 22px sans-serif";
  ctx.fillText(`cotação ${Number(c.votos || 0).toLocaleString("pt-BR")}`, x + 16, y + 74);

  return altura;
}

// Desenha uma coluna de cargo (rótulo + N mini-cards visíveis + M
// "escondidos" com blur/fade) — os escondidos são desenhados num canvas
// OFFSCREEN primeiro (blur real via ctx.filter) e depois recortados com um
// degradê de opacidade (globalCompositeOperation "destination-in") antes
// de colar no canvas principal, pra sumir suavemente embaixo em vez de
// cortar seco. Devolve a altura total ocupada.
function _desenharColunaCedulaResumo(ctxPrincipal, { rotulo, candidatos, x, y, largura, visiveis }) {
  ctxPrincipal.textAlign = "center";
  ctxPrincipal.fillStyle = "#3dffb0";
  ctxPrincipal.font = "700 24px sans-serif";
  ctxPrincipal.fillText(rotulo.toUpperCase(), x + largura / 2, y + 20);
  ctxPrincipal.strokeStyle = "#1d3a2c";
  ctxPrincipal.lineWidth = 2;
  ctxPrincipal.beginPath();
  ctxPrincipal.moveTo(x, y + 40);
  ctxPrincipal.lineTo(x + largura, y + 40);
  ctxPrincipal.stroke();

  let cursorY = y + 62;
  const gap = 14;
  const visiveisLista = candidatos.slice(0, visiveis);
  const escondidos = candidatos.slice(visiveis, visiveis + 2);

  visiveisLista.forEach((c) => {
    const altura = _desenharMiniCardCandidato(ctxPrincipal, c, x, cursorY, largura);
    cursorY += altura + gap;
  });

  if (escondidos.length) {
    const alturaOff = escondidos.length * 96 + (escondidos.length - 1) * gap;
    const off = document.createElement("canvas");
    off.width = largura;
    off.height = alturaOff;
    const ctxOff = off.getContext("2d");
    ctxOff.filter = "blur(4px)";
    let yOff = 0;
    escondidos.forEach((c) => {
      const altura = _desenharMiniCardCandidato(ctxOff, c, 0, yOff, largura);
      yOff += altura + gap;
    });
    ctxOff.filter = "none";
    const degrade = ctxOff.createLinearGradient(0, 0, 0, alturaOff);
    degrade.addColorStop(0, "rgba(0,0,0,1)");
    degrade.addColorStop(0.75, "rgba(0,0,0,.4)");
    degrade.addColorStop(1, "rgba(0,0,0,0)");
    ctxOff.globalCompositeOperation = "destination-in";
    ctxOff.fillStyle = degrade;
    ctxOff.fillRect(0, 0, largura, alturaOff);
    ctxPrincipal.drawImage(off, x, cursorY);
    cursorY += alturaOff;
  }

  return cursorY - y;
}

// Card-convite "Meu palpite - eleições 2026" — diferente de
// gerarImagemCedula (cédula oficial de UM cargo por vez, pra quem já
// depositou conferir posição no ranking), este é o card de DIVULGAÇÃO:
// os 3 cargos juntos numa imagem só, cortados em 4 (Estadual/Federal) e 1
// (Senador — cargo majoritário, corte natural é bem menor) com o resto da
// lista escondido atrás de blur, terminando num convite pra ver a lista
// completa. Pedido do usuário em 16/08/2026, protótipo aprovado antes de
// programar (3 rodadas de ajuste no mockup).
function gerarImagemCedulaResumo({ nomeExibido, cargosEleitos, codigo }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  const fundo = ctx.createLinearGradient(0, 0, 0, canvas.height);
  fundo.addColorStop(0, "#0c2a1e");
  fundo.addColorStop(0.55, "#081712");
  fundo.addColorStop(1, "#050d0a");
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#3dffb0";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("SIMULALEGIS", canvas.width / 2, 110);

  ctx.fillStyle = "#3dffb0";
  ctx.font = "700 24px sans-serif";
  ctx.fillText("MEU PALPITE", canvas.width / 2, 190);
  ctx.fillStyle = "#eefff6";
  ctx.font = "700 52px sans-serif";
  ctx.fillText("Eleições 2026", canvas.width / 2, 250);
  ctx.fillStyle = "#7fa895";
  ctx.font = "400 28px sans-serif";
  const nomeEstado = (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome || pcState.estado;
  ctx.fillText(`${nomeExibido} · ${nomeEstado}`, canvas.width / 2, 296);

  const preparar = (cargoId, corte) => (cargosEleitos[cargoId] || [])
    .slice(0, corte + 2)
    .map((c, i) => ({ nome: c.nome, votos: c.votos, posicao: i + 1 }));
  const estaduais = preparar("estadual", 4);
  const federais = preparar("federal", 4);
  const senadores = preparar("senador", 1);

  const margem = 60;
  const gapColunas = 36;
  const larguraColuna = (canvas.width - margem * 2 - gapColunas) / 2;
  let y = 350;

  const alturaEstadual = estaduais.length ? _desenharColunaCedulaResumo(ctx, { rotulo: "Dep. Estadual", candidatos: estaduais, x: margem, y, largura: larguraColuna, visiveis: 4 }) : 0;
  const alturaFederal = federais.length ? _desenharColunaCedulaResumo(ctx, { rotulo: "Dep. Federal", candidatos: federais, x: margem + larguraColuna + gapColunas, y, largura: larguraColuna, visiveis: 4 }) : 0;
  y += Math.max(alturaEstadual, alturaFederal) + 36;

  if (senadores.length) {
    y += _desenharColunaCedulaResumo(ctx, { rotulo: "Senador", candidatos: senadores, x: margem, y, largura: canvas.width - margem * 2, visiveis: 1 }) + 36;
  }

  ctx.fillStyle = "rgba(61,255,176,.1)";
  ctx.strokeStyle = "rgba(61,255,176,.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(margem, y, canvas.width - margem * 2, 130, 16);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#3dffb0";
  ctx.font = "700 30px sans-serif";
  ctx.fillText("Quer ver a lista completa e fazer a sua?", canvas.width / 2, y + 58);
  ctx.fillStyle = "#9fc9b3";
  ctx.font = "400 26px sans-serif";
  ctx.fillText(`Código ${codigo}`, canvas.width / 2, y + 98);
  y += 130 + 50;

  ctx.fillStyle = "#547566";
  ctx.font = "400 24px sans-serif";
  ctx.fillText("Simulador Eleitoral · Legislativo 2026", canvas.width / 2, y);

  return canvas;
}

// Painel de compartilhamento de uma cédula depositada — código + prévia da
// imagem (gerarImagemCedula) + WhatsApp/Instagram/baixar. Dados vêm de
// pcState.dadosCompartilhar, carregado de forma assíncrona pelo handler de
// "Compartilhar" (ver renderMinhasListas) antes desta função ser chamada.
function renderModalCompartilhar() {
  const d = pcState.dadosCompartilhar;
  if (!d) return "";
  const lista = d.lista;
  if (d.carregando) {
    return `
    <div id="pcModalCompartilharOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:340px; width:100%; background:rgba(15,35,27,.92); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:30px 20px; text-align:center;">
        <div style="color:var(--pc-ink-dim); font-size:13px; margin-bottom:16px;">Carregando…</div>
        <button class="ghost" id="pcBtnFecharCompartilhar" style="border:none; font-size:11.5px; color:var(--pc-ink-dim);">Cancelar</button>
      </div>
    </div>`;
  }
  const anonimo = lista.anonimo;
  const nomeExibido = anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || lista.nome);
  return `
    <div id="pcModalCompartilharOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:340px; width:100%; max-height:90vh; overflow-y:auto; background:rgba(15,35,27,.92); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("chave", 14)} CÉDULA DEPOSITADA</div>
        <h2 style="margin-bottom:4px; font-size:15px;">Compartilhar "${lista.nome}"</h2>
        <div style="font-size:12px; color:var(--pc-ink-dim); margin-bottom:16px; line-height:1.5;">Esse código é único dessa cédula — qualquer pessoa pode usá-lo pra conferir sua posição no ranking.</div>
        ${anonimo ? `<div style="font-size:11px; color:var(--pc-ink-dim); background:#0c1c16; border-radius:8px; padding:9px 11px; margin-bottom:16px; line-height:1.5; display:flex; gap:8px; align-items:flex-start;">${iconeSvg("chave", 13)}<span>Essa lista foi depositada de forma anônima — seu nome não aparece na imagem nem em nenhum link gerado aqui.</span></div>` : ""}
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#0c1c16; border:1px solid #2a4438; border-radius:10px; padding:10px 12px; margin-bottom:16px;">
          <span style="font-family:var(--mono); font-size:15px; font-weight:700; letter-spacing:.06em; color:var(--pc-ink);">${lista.codigo}</span>
          <button class="ghost" id="pcBtnCopiarCodigoCedula" style="padding:5px 10px; font-size:11px; display:flex; align-items:center; gap:4px;">${iconeSvg("copiar", 12)}COPIAR</button>
        </div>
        ${CARGOS.filter((c) => d.cargosEleitos && d.cargosEleitos[c.id] && d.cargosEleitos[c.id].length).length > 1 ? `
        <div class="pc-cargo-switch" style="margin-bottom:16px;">
          ${CARGOS.map((c) => `<button data-pc-compartilhar-cargo="${c.id}" class="${c.id === d.cargoAtivo ? "active" : ""}" ${d.cargosEleitos[c.id].length ? "" : "disabled style=\"opacity:.35; cursor:default;\""}>${c.label}</button>`).join("")}
        </div>` : ""}
        <div style="width:150px; aspect-ratio:9/16; margin:0 auto 16px; border-radius:14px; overflow:hidden; border:1px solid #1c3a2c; display:flex; align-items:center; justify-content:center; background:#081712;">
          ${d.imagemUrl ? `<img src="${d.imagemUrl}" alt="Prévia da imagem compartilhável" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:11px; color:var(--pc-ink-dim);">Gerando…</span>`}
        </div>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <button class="ghost" id="pcBtnShareWhatsapp" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("send", 14)}WhatsApp</button>
          <button class="ghost" id="pcBtnShareInstagram" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("compartilhar", 14)}Instagram</button>
        </div>
        <button class="ghost" id="pcBtnBaixarImagemCedula" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("baixar", 14)}Baixar imagem</button>
        <div style="margin:14px 0; border-top:1px solid var(--pc-glass-border);"></div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-bottom:8px; line-height:1.5;">Card de divulgação com os 3 cargos juntos (Estadual, Federal e Senador) e o resto da lista escondido, pra chamar gente pra conhecer sua cédula completa.</div>
        <button class="ghost" id="pcBtnBaixarCardResumo" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px; color:var(--pc-accent); border-color:rgba(61,255,176,.4);">${iconeSvg("send", 14)}Baixar "Meu palpite" (3 cargos)</button>
        <div id="pcCompartilharStatus" style="font-size:11px; color:var(--pc-ink-dim); text-align:center; margin-top:10px; min-height:14px;"></div>
        <div style="text-align:center; margin-top:4px;"><button class="ghost" id="pcBtnFecharCompartilhar" style="border:none; font-size:11.5px; color:var(--pc-ink-dim);">Fechar</button></div>
      </div>
    </div>`;
}

// Monta os 3 acordeões de cargo (Estadual/Federal/Senador) com a lista de
// eleitos/votos de um palpite já fechado — usado tanto em "Minhas listas"
// (ver a própria cédula) quanto na busca pública de cédula (Ranking, ver
// renderRankingPlaceholder). Extraído em 14/08/2026 pra não duplicar essa
// montagem nos dois lugares.
function montarSecoesCargosDetalhe(palpitesPorCargo) {
  return CARGOS.map((cargoDef) => {
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
    const secoes = montarSecoesCargosDetalhe(palpitesPorCargo);
    el.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px;">
        <button class="ghost" id="pcBtnVoltarMinhasListas">← Minhas listas</button>
        ${lista && lista.codigo ? `<button class="ghost" id="pcBtnCompartilharDetalheLista" style="display:flex; align-items:center; gap:6px; padding:8px 12px; font-size:12px;">${iconeSvg("compartilhar", 13)}<span class="pc-btn-label">Compartilhar</span></button>` : ""}
      </div>
      <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">${lista ? lista.nome : ""}</div>
      <div class="pc-sub" style="margin:0 0 14px 2px; display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}Depositada em ${lista ? new Date(lista.depositadoEm).toLocaleDateString("pt-BR") : ""} · travada, não pode mais mudar.</div>
      ${secoes}
      ${pcState.modalCompartilharListaId ? renderModalCompartilhar() : ""}`;
    document.getElementById("pcBtnVoltarMinhasListas").addEventListener("click", () => {
      pcState.listaEmVisualizacao = null;
      renderMinhasListas();
    });
    if (lista && lista.codigo) {
      document.getElementById("pcBtnCompartilharDetalheLista").addEventListener("click", () => abrirModalCompartilharLista(lista.id, listas));
    }
    attachListenersModalCompartilhar();
    return;
  }

  const abertas = listas.filter((l) => !l.depositadoEm).sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
  const depositadas = listas.filter((l) => l.depositadoEm).sort((a, b) => new Date(b.depositadoEm) - new Date(a.depositadoEm));
  const jaTemLista = listas.length >= 1;

  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): cada lista é um mini-card
  // com moldura própria em vez de linha solta dentro de um card único —
  // mesmos data-attributes de antes, listeners intactos.
  const linhaAberta = (l) => `
    <div class="pc-mini-card" style="flex-wrap:wrap;">
      <div class="pc-mini-card-icone">${iconeSvg("ballot", 17)}</div>
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
    <div class="pc-mini-card" style="flex-wrap:wrap; opacity:.85;">
      <div class="pc-mini-card-icone" style="background:rgba(201,138,43,.12); color:var(--pc-warning);">${iconeSvg("chave", 16)}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Depositada em ${new Date(l.depositadoEm).toLocaleDateString("pt-BR")}${l.anonimo ? " · anônima" : ""}${l.codigo ? ` · <span style="font-family:var(--mono);">${l.codigo}</span>` : ""}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        ${l.codigo ? `<button class="ghost" data-pc-compartilhar-lista="${l.id}" style="padding:8px 10px; font-size:12px; display:flex; align-items:center; gap:5px;">${iconeSvg("compartilhar", 13)}<span class="pc-btn-label">Compartilhar</span></button>` : ""}
        <button class="ghost" data-pc-ver-lista="${l.id}" style="padding:8px 14px; font-size:12px;">Ver</button>
      </div>
    </div>`;

  const listaModal = pcState.modalDepositarListaId ? listas.find((l) => l.id === pcState.modalDepositarListaId) : null;

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
      <div style="font-size:20px; font-weight:700; margin-left:2px;">Minhas listas</div>
      <button class="pc-lobby-icon-btn" id="pcBtnNovaLista" title="Nova lista">${iconeSvg("mais", 16)}</button>
    </div>
    <div class="pc-sub" style="margin:4px 0 16px 2px;">Listas em aberto podem ser editadas à vontade. Depositadas ficam travadas.</div>
    ${pcState.avisoLimiteListaAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Ops...</div>
      <div class="pc-aviso-corpo">Nós conseguimos espaço gratuito para o usuário cadastrar até uma lista, mas precisamos de espaço remunerado no servidor $$.<br><br>Compre crédito e utilize para criação de novas listas e grupos.</div>
    </div>` : ""}
    ${abertas.length ? `<div class="pc-lobby-menu-tit">Em aberto</div>${abertas.map(linhaAberta).join("")}` : ""}
    ${depositadas.length ? `<div class="pc-lobby-menu-tit" style="margin-top:${abertas.length ? "18px" : "0"};">Depositadas</div>${depositadas.map(linhaDepositada).join("")}` : ""}
    ${!listas.length ? estadoVazio({ icone: "lista", titulo: "Nenhuma lista ainda", texto: "Monte sua primeira previsão e ela aparece aqui.", botaoLabel: "Criar minha lista", botaoId: "pcBtnEstadoVazioNovaLista" }) : ""}
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
    ${pcState.modalCompartilharListaId ? renderModalCompartilhar() : ""}
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
  if (document.getElementById("pcBtnEstadoVazioNovaLista")) {
    document.getElementById("pcBtnEstadoVazioNovaLista").addEventListener("click", () => {
      document.getElementById("pcBtnNovaLista").click();
    });
  }
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
  document.querySelectorAll("[data-pc-compartilhar-lista]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalCompartilharLista(btn.getAttribute("data-pc-compartilhar-lista"), listas));
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
  attachListenersModalCompartilhar();
}

// Abre o modal de compartilhamento (código + imagem da cédula) de uma
// lista depositada — extraído em 16/08/2026 pra ser chamado tanto da
// listagem de "Minhas listas" quanto de dentro do detalhe de uma lista já
// depositada (pcState.listaEmVisualizacao), que antes não tinha como abrir
// esse modal sem voltar pra listagem primeiro.
async function abrirModalCompartilharLista(id, listas) {
  const lista = listas.find((l) => l.id === id);
  if (!lista) return;
  pcState.modalCompartilharListaId = id;
  pcState.dadosCompartilhar = { carregando: true, lista };
  renderMinhasListas();
  // Imagem cobre os 3 cargos agora (13/08/2026) — monta um mapa
  // cargoId → eleitos e deixa a pessoa trocar dentro do modal
  // (renderModalCompartilhar), em vez de fixar só Dep. Estadual.
  const completo = pcState.perfil ? await carregarSalvamentoCompleto(id) : null;
  const cargosEleitos = {};
  CARGOS.forEach((cargoDef) => {
    const listaCargo = completo && completo.cargos ? completo.cargos[cargoDef.id] : null;
    cargosEleitos[cargoDef.id] = listaCargo && listaCargo.length ? classificarEleitosPorPartido(listaCargo, cargoDef.id) : [];
  });
  const cargoAtivo = CARGOS.find((c) => cargosEleitos[c.id].length)?.id || "estadual";
  const nomeExibido = lista.anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || lista.nome);
  const eleitos = cargosEleitos[cargoAtivo];
  const cargoLabel = CARGOS.find((c) => c.id === cargoAtivo)?.label || "";
  const imagemUrl = eleitos.length && lista.codigo ? gerarImagemCedula({ nomeExibido, eleitos, codigo: lista.codigo, cargoLabel }).toDataURL("image/png") : null;
  pcState.dadosCompartilhar = { carregando: false, lista, cargosEleitos, cargoAtivo, imagemUrl };
  renderMinhasListas();
}

// Liga os botões DE DENTRO do modal de compartilhar (trocar cargo, copiar
// código, WhatsApp/Instagram/baixar) — extraído em 16/08/2026 pelo mesmo
// motivo de abrirModalCompartilharLista, chamado de qualquer tela que
// possa ter esse modal aberto (checa pcState.modalCompartilharListaId
// sozinho, seguro chamar sempre).
function attachListenersModalCompartilhar() {
  if (!pcState.modalCompartilharListaId) return;
  document.getElementById("pcBtnFecharCompartilhar").addEventListener("click", () => {
    pcState.modalCompartilharListaId = null;
    pcState.dadosCompartilhar = null;
    renderMinhasListas();
  });
  const d = pcState.dadosCompartilhar;
  if (d && !d.carregando) {
    document.querySelectorAll("[data-pc-compartilhar-cargo]").forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        const cargoId = btn.getAttribute("data-pc-compartilhar-cargo");
        const eleitos = d.cargosEleitos[cargoId];
        const cargoLabel = CARGOS.find((c) => c.id === cargoId)?.label || "";
        const nomeExibido = d.lista.anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || d.lista.nome);
        const imagemUrl = eleitos.length ? gerarImagemCedula({ nomeExibido, eleitos, codigo: d.lista.codigo, cargoLabel }).toDataURL("image/png") : null;
        pcState.dadosCompartilhar = { ...d, cargoAtivo: cargoId, imagemUrl };
        renderMinhasListas();
      });
    });
    const origem = window.location.origin + window.location.pathname;
    const textoCompartilhar = `Esta é a minha lista dos Deputados e Senadores eleitos para 2026. Agora é a sua vez!\n\n${origem} — código ${d.lista.codigo}`;
    document.getElementById("pcBtnCopiarCodigoCedula").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(d.lista.codigo);
        const status = document.getElementById("pcCompartilharStatus");
        if (status) status.textContent = "Código copiado.";
      } catch (err) { /* clipboard indisponível, ignora */ }
    });
    document.getElementById("pcBtnShareWhatsapp").addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartilhar)}`, "_blank");
    });
    document.getElementById("pcBtnShareInstagram").addEventListener("click", async () => {
      const status = document.getElementById("pcCompartilharStatus");
      if (!d.imagemUrl) return;
      if (navigator.share && navigator.canShare) {
        try {
          const resp = await fetch(d.imagemUrl);
          const blob = await resp.blob();
          const arquivo = new File([blob], "minha-lista-2026.png", { type: "image/png" });
          if (navigator.canShare({ files: [arquivo] })) {
            await navigator.share({ files: [arquivo], text: textoCompartilhar });
            return;
          }
        } catch (err) { /* cancelou o compartilhamento nativo ou falhou — cai no fallback abaixo */ }
      }
      _baixarImagemCedula(d.imagemUrl);
      if (status) status.textContent = "Imagem baixada — abra o Instagram e poste nos Stories.";
    });
    document.getElementById("pcBtnBaixarImagemCedula").addEventListener("click", () => {
      if (d.imagemUrl) _baixarImagemCedula(d.imagemUrl);
    });
    document.getElementById("pcBtnBaixarCardResumo").addEventListener("click", () => {
      const status = document.getElementById("pcCompartilharStatus");
      if (!d.cargosEleitos || !CARGOS.some((c) => (d.cargosEleitos[c.id] || []).length)) {
        if (status) status.textContent = "Essa lista ainda não tem eleitos marcados em nenhum cargo.";
        return;
      }
      const nomeExibido = d.lista.anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || d.lista.nome);
      const url = gerarImagemCedulaResumo({ nomeExibido, cargosEleitos: d.cargosEleitos, codigo: d.lista.codigo }).toDataURL("image/png");
      _baixarImagemCedula(url, "meu-palpite-eleicoes-2026.png");
      if (status) status.textContent = "Card baixado.";
    });
  }
}

function _baixarImagemCedula(dataUrl, nomeArquivo) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nomeArquivo || "minha-lista-2026.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
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

  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): cada grupo é um mini-card
  // com ícone-em-quadrado + nome + membros/código + seta; as duas ações de
  // "novo grupo" usam a mesma grade de atalhos do Painel (.pc-lobby-atalho),
  // substituindo a faixa horizontal antiga (.pc-lobby-menu-faixa).
  const linhasGrupo = pcState.meusGrupos.map((g) => `
    <button class="pc-mini-card" data-pc-abrir-grupo="${g.id}">
      <div class="pc-mini-card-icone">${iconeSvg("grupos", 17)}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px; font-family:var(--mono);">código ${g.codigo_convite}</div>
      </div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
    </button>`).join("");

  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Grupos</div>
    ${pcState.avisoLimiteGrupoAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Ops...</div>
      <div class="pc-aviso-corpo">Nós conseguimos espaço gratuito para o usuário criar até um grupo, mas precisamos de espaço remunerado no servidor $$.<br><br>Compre crédito e utilize para criação de novas listas e grupos.</div>
    </div>` : ""}
    ${pcState.meusGrupos.length ? `<div class="pc-lobby-menu-tit">Seus grupos</div>${linhasGrupo}` : `<div class="pc-lobby-card">${estadoVazio({ icone: "grupos", titulo: "Nenhum grupo ainda", texto: "Crie um grupo ou entre com um código de convite, logo abaixo." })}</div>`}
    <div class="pc-lobby-menu-tit" style="margin-top:18px;">Novo grupo</div>
    <div class="pc-lobby-atalhos">
      <button class="pc-lobby-atalho" id="pcBtnCriarGrupo">
        <div class="pc-lobby-atalho-icone">${iconeSvg("mais", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Criar grupo</div><div class="pc-lobby-atalho-sub">Você escolhe o nome</div></div>
      </button>
      <button class="pc-lobby-atalho" id="pcBtnEntrarGrupo">
        <div class="pc-lobby-atalho-icone">${iconeSvg("chave", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Entrar com código</div><div class="pc-lobby-atalho-sub">Convite de um amigo</div></div>
      </button>
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
      pcState.grupoMinhasCedulas = null;
      pcState.grupoCedulaEscolhida = null;
      renderGrupoMembro();
    });
  });
}

function renderGrupoCriar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;">← Grupos</button>
      <div style="font-size:20px; font-weight:700; margin:0 0 14px;">Criar grupo</div>
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
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
    renderGrupoMembro();
  });
}

function renderGrupoEntrar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;">← Grupos</button>
      <div style="font-size:20px; font-weight:700; margin:0 0 14px;">Entrar com código</div>
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
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
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
    return estadoVazio({ icone: "grupos", titulo: "Ninguém depositou ainda", texto: "Assim que alguém do grupo depositar a cédula desse cargo, a comparação aparece aqui." });
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
  // Escolha de cédula por grupo (migração 15, pedido do usuário 13/08/2026)
  // — só faz sentido oferecer a troca se a pessoa tiver mais de uma cédula
  // depositada; com uma só não existe escolha real (cai na oficial de
  // qualquer forma).
  if (pcState.perfil && !pcState.grupoMinhasCedulas) {
    const todas = await carregarSalvamentosDe(pcState.perfil.id);
    pcState.grupoMinhasCedulas = todas.filter((s) => s.depositado_em);
    pcState.grupoCedulaEscolhida = pcState.grupoMinhasCedulas.length > 1
      ? await minhaEscolhaNoGrupo(pcState.grupoAtivo.id, pcState.perfil.id)
      : null;
  }
  const minhasCedulas = pcState.grupoMinhasCedulas || [];
  const registros = pcState.grupoComparacao;
  const botoesCargo = CARGOS.map((c) => `
    <button data-pc-cargo-grupo="${c.id}" class="${pcState.cargoAtivoGrupo === c.id ? "active" : ""}">${c.label}</button>`).join("");

  conteudo.innerHTML = `
    <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;">← Grupos</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 10px 2px;">${pcState.grupoAtivo.nome}</div>
    <div class="pc-lobby-card">
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim);">${registros.length} pessoa${registros.length === 1 ? "" : "s"} com cédula depositada</span>
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}<b style="font-family:var(--mono); color:var(--pc-ink); font-weight:600;">${pcState.grupoAtivo.codigo_convite}</b></span>
      </div>
    </div>
    ${minhasCedulas.length > 1 ? `
    <div class="pc-lobby-card" style="margin-top:10px;">
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:6px;">
        <span style="font-size:12px; color:var(--pc-ink-dim);">Sua cédula neste grupo</span>
        <select id="pcSelectCedulaGrupo" class="cell">
          <option value="">Oficial (a que vale na Mediana pública)</option>
          ${minhasCedulas.map((s) => `<option value="${s.id}" ${pcState.grupoCedulaEscolhida === s.id ? "selected" : ""}>${s.nome}${s.oficial ? " · oficial" : ""}</option>`).join("")}
        </select>
      </div>
    </div>` : ""}
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

  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => {
    pcState.grupoAtivo = null;
    pcState.grupoComparacao = null;
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
    renderGrupoHub();
  });
  document.querySelectorAll("[data-pc-cargo-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoGrupo = btn.getAttribute("data-pc-cargo-grupo");
      renderGrupoMembro();
    });
  });
  const selectCedula = document.getElementById("pcSelectCedulaGrupo");
  if (selectCedula) {
    selectCedula.addEventListener("change", async () => {
      const salvamentoId = selectCedula.value || null;
      selectCedula.disabled = true;
      const { error } = await escolherCedulaGrupo(pcState.grupoAtivo.id, pcState.perfil.id, salvamentoId);
      if (error) { pcState.erro = "Erro ao trocar a cédula do grupo: " + error.message; }
      pcState.grupoCedulaEscolhida = salvamentoId;
      pcState.grupoComparacao = null; // força recarregar — a view grupo_comparacao muda com a escolha
      renderGrupoMembro();
    });
  }
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
  // "M" pra milhão (ex.: Soma de Votos, na casa dos milhões) além do "k" já
  // usado pra quociente (dezenas/centenas de milhar) — sem isso, Soma de
  // Votos aparecia como "1530k" em vez de "1,53M" (pedido do usuário em
  // 12/08/2026, Painel Eleitoral compacto numa linha só).
  if (n >= 1000000) return (n / 1000000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
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
  if (partido) {
    balancearPartidoSelecao(partido);
    aplicarQuantidadeMarcados(partido, partido.candidatos.filter((c) => c.marcadoEleito).length);
  } else {
    balancearTudoSelecao();
    // Preencheu votos de todos os partidos do cargo — a votação de alguém
    // pode ter ultrapassado outro já marcado em qualquer um deles, então
    // recalcula quem fica marcado em cada partido, um por um.
    pcState.palpiteEdicao.forEach((p) => {
      aplicarQuantidadeMarcados(p, p.candidatos.filter((c) => c.marcadoEleito).length);
    });
  }
  renderCargoEstadual();
}

function snapshotPalpite() {
  pcState.historicoPalpite.push(JSON.parse(JSON.stringify(pcState.palpiteEdicao)));
  if (pcState.historicoPalpite.length > 30) pcState.historicoPalpite.shift();
}

function desfazerPalpite() {
  if (!pcState.historicoPalpite.length) return;
  pcState.palpiteEdicao = pcState.historicoPalpite.pop();
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
  const elegiveis = p.candidatos.filter((c) => c.fonte !== "legenda");
  const ordenados = [...elegiveis].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const alvo = Math.max(0, Math.min(Math.round(Number(quantidade) || 0), ordenados.length));
  const chavesMarcadas = new Set(ordenados.slice(0, alvo).map((c) => c.chave));
  p.candidatos.forEach((c) => { c.marcadoEleito = c.fonte !== "legenda" && chavesMarcadas.has(c.chave); });
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
    <div id="pcStickyHeader">
      <div class="pc-cargo-switch">${botoes}</div>
      <div id="pcPainelSlot"></div>
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
function rascunhoEhOrfao(rascunho, poolOficial) {
  if (!rascunho || !rascunho.length) return false;
  if (!poolOficial || !poolOficial.length) return false;
  const idsOficiais = new Set();
  poolOficial.forEach((p) => p.candidatos.forEach((c) => idsOficiais.add(c.id)));
  const idsRascunho = [];
  rascunho.forEach((p) => p.candidatos.forEach((c) => idsRascunho.push(c.id)));
  if (!idsRascunho.length) return false;
  return !idsRascunho.some((id) => idsOficiais.has(id));
}

async function garantirPalpiteEdicaoAtivo() {
  const chaveCargoEstado = `${pcState.estado}::${pcState.cargoAtivo}`;
  if (!pcState.palpiteEdicao || pcState.cargoPalpiteEdicao !== chaveCargoEstado) {
    await garantirRascunhosCarregados();
    // Prioridade: rascunho salvo (autosave, ver garantirRascunhosCarregados)
    // > cada partido começando com a própria vagas2022 real daquele
    // estado+cargo (fallback em montarEstadoPalpite) — não usa mais um
    // "padrão" fixo de um estado só, que ficava errado assim que outro
    // estado carregasse. Exceto quando o rascunho é órfão (ver
    // rascunhoEhOrfao acima) — nesse caso ele é ignorado e o pool oficial
    // fresco vira o ponto de partida, do mesmo jeito que um rascunho
    // inexistente.
    const rascunho = pcState.rascunhosCache && pcState.rascunhosCache[pcState.cargoAtivo];
    const poolOficial = montarEstadoPalpite("assembleia", null, null, pcState.cargoAtivo, pcState.estado);
    pcState.palpiteEdicao = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial)) ? rascunho : poolOficial;
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
  if (pcState.linksCandidatosCache[chaveCache]) return;
  pcState.linksCandidatosCache[chaveCache] = await obterLinksCandidatos(pcState.estado, pcState.cargoAtivo);
}

// Instagram de UM candidato, já carregado pra pcState.estado/cargoAtivo
// atuais (ver garantirLinksCandidatos, chamado antes de qualquer render que
// precise disso) — null quando não tem link cadastrado.
function linkInstagramDe(chave) {
  const mapa = pcState.linksCandidatosCache[`${pcState.estado}::${pcState.cargoAtivo}`];
  return (mapa && mapa[chave]) || null;
}

async function renderCargoEstadual() {
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
  const reRenderizando = !!conteudo.querySelector("#pcBtnColapsarPlenario");
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
  // Quociente ATUAL "de verdade" (só com a votação já digitada) e o
  // PROJETADO pra 2026 (referência fixa) — hoje calculados de novo dentro
  // de cada partido expandido (ver refQuociente mais abaixo). Hoisted pra
  // cá porque agora também aparecem no Painel Eleitoral, sempre visíveis,
  // não só depois de expandir um partido e marcar alguém (pedido do
  // usuário em 12/08/2026 — "o quociente é um ponto central, deveria estar
  // no card geral do cabeçalho"). Não existe pra Senador (majoritário, sem
  // quociente/QP/sobra — mesma ressalva de refQuociente).
  const qeAtualLive = pcState.cargoAtivo !== "senador"
    ? quocienteEleitoral(pcState.palpiteEdicao.reduce((s, pp) => s + partyVotos(pp), 0), totalVagasCargo)
    : null;
  const qeProjetadoTopo = pcState.cargoAtivo !== "senador"
    ? quocienteEleitoral(votosValidos2026Proj, totalVagasCargo)
    : null;
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
  const plenarioColapsado = !!pcState.expandido["plenarioColapsado_" + pcState.cargoAtivo];
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
    // Aviso "vaga não marcada" (conceito fechado com o usuário em
    // 12/08/2026, BACKLOG.md — pausado só por preocupação de performance,
    // resolvida em 14/08/2026 ao notar que cadeirasReaisPorPartido já é
    // calculado 1x por render, fora do .map, pro Quociente do Cargo — reusar
    // aqui não custa NADA a mais, nunca roda a cada tecla digitada. Só
    // informa, nunca marca sozinho — quem decide continua sendo o usuário
    // (interruptor "eleito" nunca é sobrescrito por isso).
    const faltamMarcarVagas = rankingSenador ? 0 : Math.max(0, (cadeirasReaisPorPartido[pcState.palpiteEdicao.indexOf(p)] || 0) - marcados);
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
    // como um rodapé. Quebra em 2+ linhas se não couber numa linha só (não
    // corta com "…" — achado do usuário em federações com 2-3 partidos
    // membro, 13/08/2026: "PSDB 211.313 votos · 2 eleitos · CIDADANIA
    // 25.109 votos · 0 eleitos" não cabia numa linha em celular real).
    // Mesmo formato por extenso pros dois casos, pra legenda ficar
    // padronizada: partido sozinho é "X votos
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
    // qeAtualLive: "de verdade" (sem estimativa embutida pros candidatos
    // ainda não tocados), diferente de infoVagas.qe (versão com estimativa
    // realista, usada só no cálculo do alvo/automação) — agora hoisted pro
    // topo de renderSelecaoCandidatos (também usado no Painel Eleitoral).

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
        <div class="pc-cand-linha" style="display:flex; align-items:center; gap:10px; padding:11px 3px; border-bottom:1px solid rgba(120,130,180,0.14);">
          <span style="width:24px; font-size:13px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${posIdx + 1}º</span>
          <span style="flex:1 1 160px; min-width:160px; font-size:15px; font-weight:600; line-height:1.4;">${(() => {
            // Selo ELEITO/SOBRA/FORA no lugar do antigo interruptor — mesma
            // disputa QP/sobra/fora do termômetro (barraTermometro), só que
            // como selo de texto em vez de toggle colorido. Não é
            // clicável (mesma razão de sempre, ver histórico abaixo):
            // 100% calculado por aplicarQuantidadeMarcados, a pessoa só
            // influencia editando voto ou a quantidade do partido.
            if (c.fonte === "legenda") return "";
            const classif = c.marcadoEleito ? classificacaoPorChave.get(c.chave) : null;
            if (!c.marcadoEleito) return "";
            const claseExtra = classif?.tipo === "sobra" ? " sobra" : classif?.tipo === "fora" ? " fora" : "";
            const texto = classif?.tipo === "sobra" ? "SOBRA" : classif?.tipo === "fora" ? "FORA" : "ELEITO";
            const tituloExtra = classif?.tipo === "sobra" ? ` — levando a ${classif.numeroSobra}ª sobra do partido nesta rodada, por disputa de médias (art. 109)` : classif?.tipo === "fora" ? " — marcado, mas não fecharia vaga com a votação de hoje" : "";
            const titulo = "Eleito — está entre os mais votados do partido" + tituloExtra;
            return `<span class="pc-cand-chip${claseExtra}" title="${titulo}">${texto}</span>`;
          })()}${nomeExibicao(c)}${(() => {
            // Ícone do Instagram (visível pra todo mundo, só quando tem link
            // cadastrado) + lápis de editar (só admin, sempre visível pra
            // poder cadastrar o primeiro link também). Pedido do usuário em
            // 16/08/2026 — link é responsabilidade do admin, não da pessoa
            // comum, por isso não existe campo de texto solto aqui.
            const linkInsta = linkInstagramDe(c.chave);
            if (!linkInsta && !pcState.souAdmin) return "";
            return ` <span style="display:inline-flex; align-items:center; gap:3px; vertical-align:middle;">${linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram" style="display:inline-flex; color:var(--pc-accent);" onclick="event.stopPropagation()">${iconeSvg("instagram", 14)}</a>` : ""}${pcState.souAdmin ? `<button type="button" class="pc-mini-btn pc-mini-btn-sm" data-pc-editar-instagram="${c.chave}" data-pc-editar-instagram-nome="${escaparAtributoHtml(nomeExibicao(c))}" title="${linkInsta ? "Editar" : "Adicionar"} link do Instagram">${iconeSvg("editar", 11)}</button>` : ""}</span>`;
          })()}${c.partidoOriginal && c.partidoOriginal !== p.nome ? ` <span style="font-size:11px; font-weight:700; color:var(--pc-accent);">(${c.partidoOriginal})</span>` : ""}${c.fonte === "legenda" ? ' <span style="font-size:10.5px; font-weight:400; color:var(--pc-ink-dim);">(legenda)</span>' : ""}${c.fonte === "2022-sem-ata-2026" ? ` <span style="font-size:10.5px; font-weight:600; color:var(--pc-warning);">sem ata 2026</span>${warnTip("Esse partido ainda não teve a ata de convenção de 2026 processada — este é o candidato real de 2022, usado só como referência temporária até a lista de 2026 chegar. Pode não ser candidato em 2026, pode ter trocado de cargo ou de partido.")}` : ""}${c.fonte === "ficticio" ? ` <span style="font-size:10.5px; font-weight:600; color:var(--pc-warning);">candidato fictício</span>${warnTip("Esse partido ainda não teve a ata de convenção de 2026 processada. Este NÃO é um candidato real — é um nome de preenchimento (placeholder) só pra manter a chapa completa até a ata sair. Será substituído pelo candidato real assim que a ata for processada.")}` : ""}<br><span style="font-size:12.5px; font-weight:400; color:var(--pc-ink-dim); opacity:0.9;">2022: ${Number(c.votos2022 || 0).toLocaleString("pt-BR")} votos${c.eleito2022 ? ` · eleito${c.partidoOrigem2022 ? " " + c.partidoOrigem2022 : ""}` : ""}</span>${c.invalidado2022 ? warnTip(`<b>Voto invalidado em 2022</b><br><br>${c.motivoInvalidacao || "Candidatura sub júdice — votação não contou no resultado final."}`) : ""}</span>
          <input class="cell pc-cand-voto${c.votosEditado ? " pc-voto-manual" : ""}" title="${c.votosEditado ? "Ajustado manualmente" : "Valor automático/padrão"}" data-pc-voto="${p.nome}::${c.chave}" value="${(Number(c.votos) || 0).toLocaleString("pt-BR")}" style="font-size:14.5px; font-weight:600; text-align:right;">
        </div>`).join("") : estadoVazio({ icone: "buscar", titulo: "Nenhum candidato encontrado", texto: "Confira o nome digitado." });
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
        const qeProjetado = qeProjetadoTopo;
        const diffPct = qeProjetado ? Math.round(((qeAtualLive - qeProjetado) / qeProjetado) * 100) : null;
        const legenda = diffPct === null ? ""
          : diffPct < 0 ? `Ainda <b style="color:var(--pc-warning);">${Math.abs(diffPct)}% abaixo</b> da votação esperada pra 2026 — quanto mais perto da meta, mais realista fica a simulação.`
          : diffPct > 0 ? `Já <b style="color:var(--pc-accent-2);">${diffPct}% acima</b> da votação esperada pra 2026.`
          : `Bateu a votação esperada pra 2026.`;
        // flex-wrap: quando número + texto não cabem lado a lado (cartão
        // estreito), o texto desce pra linha de baixo com a largura toda,
        // em vez de espremer numa coluna estreitíssima (uma palavra por
        // linha) — mesma lógica do painel de comandos, prototipado com o
        // usuário em 17/08/2026, aprovado sem alterações.
        return `<div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; background:#0c1c16; border-radius:10px; padding:10px 12px; margin-bottom:8px;">
          <div style="flex-shrink:0;">
            <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-bottom:2px; display:flex; align-items:center; gap:4px;">Quociente do cargo ${infoTip("O número grande é o quociente ATUAL (art. 106) — calculado só com a votação já digitada, sobe conforme mais partidos são preenchidos. A meta pequena é o quociente PROJETADO pra 2026 (referência fixa: 2022 escalado pelo crescimento do eleitorado, confinada aos partidos que este simulador modela). Pra a simulação se aproximar de uma eleição real, o atual precisa chegar perto da meta.")}</div>
            <div style="font-size:26px; font-weight:700; line-height:1.1;${qeAtualLive < qeProjetado ? " color:#ff9500; text-shadow:0 0 12px rgba(255,149,0,.6);" : " color:var(--pc-accent);"}">${formatVotosCompacto(Math.round(qeAtualLive))}<span style="font-size:12px; color:var(--pc-ink-dim); font-weight:400;"> /${formatVotosCompacto(Math.round(qeProjetado))}</span></div>
          </div>
          <div style="flex:1 1 200px; min-width:200px; font-size:11px; color:var(--pc-ink-dim); line-height:1.5;">
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
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
            ${faltamMarcarVagas > 0 ? `<button class="pc-mini-btn pc-mini-btn-sm" style="color:var(--pc-warning);" title="Aviso: mais ${faltamMarcarVagas} vaga${faltamMarcarVagas === 1 ? "" : "s"} pela matemática real">${iconeSvg("alerta", 13)}<span class="pc-mini-tip" style="white-space:normal; width:220px; text-align:center;">A matemática eleitoral (quociente + sobra) indica que esse partido teria direito a mais ${faltamMarcarVagas} vaga${faltamMarcarVagas === 1 ? "" : "s"} do que você marcou até agora. Só um aviso — quem decide quantos eleitos marcar continua sendo você.</span></button>` : ""}
            <button data-pc-ver2022="${p.nome}" class="pc-mini-btn pc-mini-btn-sm">${iconeSvg("ano2022", 13)}<span class="pc-mini-tip">Ver nominata completa de 2022</span></button>
            <button data-pc-reset="${p.nome}" class="pc-mini-btn pc-mini-btn-sm">${iconeSvg("reset", 13)}<span class="pc-mini-tip" style="white-space:normal; width:170px; text-align:center;">Restaurar votação de 2022 — só tem efeito pra quem recebeu votos naquela eleição</span></button>
            <button data-pc-zerar="${p.nome}" class="pc-mini-btn pc-mini-btn-sm">${iconeSvg("borracha", 13)}<span class="pc-mini-tip">Zerar votação de todos</span></button>
            <button data-pc-balancear="${p.nome}" class="pc-mini-btn pc-mini-btn-sm">${iconeSvg("completar", 13)}<span class="pc-mini-tip" style="white-space:normal; width:220px; text-align:center;">PREENCHIMENTO AUTOMÁTICO (PARTIDO)<br><br>Precisa de agilidade?<br><br>Este botão aciona a função de preenchimento de votação automática de todos os candidatos, mas limitado a esta lista.<br><br>Selecione apenas os candidatos que você acha que serão eleitos por ordem e ele faz todo o resto.</span></button>
          </div>
          <div class="pc-stepper-chip" style="margin-left:auto;" title="Quantidade de Deputados eleitos indicados pra esse partido">
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
        ${barraTermometro ? `<div style="margin:0 14px 10px;">${barraTermometro}</div>` : ""}
        <div style="margin:0 14px; padding:8px 0 10px; border-top:1px solid rgba(120,130,180,0.14); font-size:11px; color:var(--pc-ink-dim); font-family:var(--mono); line-height:1.5;">Eleições 2022 · ${resumoVotos2022Html}</div>
        <button data-pc-toggle-partido="${p.nome}" class="pc-expand-handle" title="${isExpanded ? "Recolher" : "Ver candidatos"}">
          <span></span>
        </button>
        ${isExpanded ? `<div style="padding:0 12px 12px;">${corpo}</div>` : ""}
      </div>`;
  }).join("");

  const instrucaoAberta = pcState.instrucaoSelecaoAberta !== false;
  // Card do Painel Eleitoral — renderizado no slot do cabeçalho fixo
  // (#pcPainelSlot, criado por renderSelecaoCandidatos), NÃO dentro de
  // pcCargoConteudo: abas de cargo + este card formam um bloco único
  // grudado no topo ao rolar, sem espaçamento entre eles (padrão pedido
  // pelo usuário em 16/08/2026, no lugar do esquema antigo de dois
  // stickies separados + camada de blur que gerava "sombra fantasma").
  const painelHtml = `
    <div id="pcPainelEleitoralCard" class="glass-card" style="padding:16px 18px;">
      <div class="pc-stats-row">
        <div class="pc-stats-item">
          <div class="pc-stats-lbl">Seus Eleitos</div>
          <div class="pc-stats-val${totalIndicado !== 0 && totalIndicado !== totalVagasCargo ? " baixo" : ""}">${totalIndicado}<span class="pc-stats-meta"> /${totalVagasCargo}</span></div>
        </div>
        ${qeAtualLive !== null ? `
        <div class="pc-stats-div"></div>
        <div class="pc-stats-item">
          <div class="pc-stats-lbl">Quociente ${infoTip("O número grande é o quociente ATUAL (art. 106) — calculado só com a votação já digitada, sobe conforme mais partidos são preenchidos. A meta pequena é o quociente PROJETADO pra 2026 (referência fixa: 2022 escalado pelo crescimento do eleitorado, confinada aos partidos que este simulador modela). Pra a simulação se aproximar de uma eleição real, o atual precisa chegar perto da meta.")}</div>
          <div class="pc-stats-val${qeAtualLive < qeProjetadoTopo ? " baixo" : ""}">${formatVotosCompacto(Math.round(qeAtualLive))}<span class="pc-stats-meta"> /${formatVotosCompacto(Math.round(qeProjetadoTopo))}</span></div>
        </div>` : ""}
        <div class="pc-stats-div"></div>
        <div class="pc-stats-item">
          <div class="pc-stats-lbl">Soma de Votos ${infoTip("Referência de votos válidos estimados: projeta o total de 2022 pelo crescimento do eleitorado até 2026, mantendo as taxas históricas de branco, nulo e comparecimento.")}</div>
          <div class="pc-stats-val">${formatVotosCompacto(somaTotal)}<span class="pc-stats-meta"> /~${formatVotosCompacto(Math.round(votosValidos2026Proj))}</span></div>
        </div>
        <div class="pc-stats-div"></div>
        <button type="button" id="pcAbrirInstrucao" class="pc-stats-dica" title="Como montar a lista">${iconeSvg("alerta", 14)}</button>
      </div>
    </div>`;

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
          ${linhasTop100 || estadoVazio({ icone: "buscar", titulo: "Nenhum candidato encontrado", texto: "Confira o nome digitado." })}
          <button class="primary" id="pcFecharTop2022" style="width:100%; margin-top:18px;">Fechar</button>
        </div>
      </div>`;
    })() : ""}
    <div class="glass-card" style="padding:14px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div class="pc-sub" style="margin:0;">Plenário — ${totalVagasCargo} vagas</div>
        <button id="pcBtnColapsarPlenario" class="pc-mini-btn" title="${plenarioColapsado ? "Expandir" : "Recolher"}">
          <svg viewBox="0 0 16 16" width="13" height="13" style="transform:${plenarioColapsado ? "rotate(-90deg)" : "none"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
      ${plenarioColapsado ? "" : `
      <div style="margin-top:14px;">
        ${hemiciclo}
        <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);">${legendaPlenario}</div>
      </div>`}
    </div>
    ${renderPainelComandos([
      {
        id: "pcBtnBuscaPartidoToggle", icone: "buscar", tamanho: 14, titulo: "Buscar partido",
        legenda: "Abre um campo pra filtrar a lista de partidos pelo nome.",
        classeExtra: pcState.buscaPartidoAberta ? "ativo" : "",
      },
      {
        id: "pcBtnVoltarSelecao", icone: "desfazer", tamanho: 15, titulo: "Desfazer",
        legenda: "Desfaz a última alteração feita nesta tela — um voto editado, um candidato marcado. Só volta um passo por vez.",
        disabled: !pcState.historicoPalpite.length,
      },
      {
        id: "pcBtnZerarTudo", icone: "borracha", tamanho: 14, titulo: "Zerar votação",
        legenda: "Limpa a votação de todos os candidatos de uma vez. Indicado pra quem já sabe o que quer marcar do zero.",
      },
      {
        id: "pcBtnTop2022", icone: "ano2022", tamanho: 15, titulo: "Top 100 de 2022",
        legenda: "Mostra os 100 candidatos mais votados na eleição real de 2022, de todos os partidos — só de referência, não muda seu palpite.",
      },
      {
        id: "pcBtnSalvarSelecao", icone: "salvar", tamanho: 17, titulo: "Salvar",
        legenda: "Salva sua lista do jeito que está agora — mesmo incompleta. Depois é só voltar aqui e continuar marcando de onde parou. Fica disponível em \"Minhas listas\".",
      },
      {
        id: "pcBtnPreencherAutoTudo", icone: "completar", tamanho: 18, titulo: "Mágico — preenchimento automático",
        legenda: "Preenche a votação simulada dos demais candidatos automaticamente. Marque antes quem você acha que será eleito — o resto ele completa.",
        classeExtra: "destaque",
      },
      {
        id: "pcBtnDepositar", icone: "setaDireita", tamanho: 19, titulo: "Prosseguir pra Revisão",
        legenda: `Avança pro próximo passo. Só fica ativo depois que você indicar todos os ${totalVagasCargo} eleitos${totalIndicado === totalVagasCargo ? "" : " — por enquanto está desabilitado"}.`,
        disabled: totalIndicado !== totalVagasCargo,
        classeExtra: "destaque",
      },
    ], pcState.legendaComandosAberta)}
    <div class="pc-status" id="pcSelecaoStatus" style="text-align:right; margin:-14px 0 14px;"></div>
    ${pcState.modalNomeListaAberto ? renderModalNomeLista() : ""}
    ${pcState.modalInstagramInfo ? renderModalInstagram() : ""}
    ${pcState.buscaPartidoAberta ? `
    <div style="position:relative; margin:-12px 0 20px;">
      <svg viewBox="0 0 16 16" width="14" height="14" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--pc-ink-dim); pointer-events:none;"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
      <input type="text" id="pcBuscaPartidoInput" class="cell" placeholder="Buscar partido por nome" value="${pcState.buscaPartido || ""}" style="width:100%; padding-left:34px;">
    </div>` : ""}
    <div class="glass-card">
      ${blocos || estadoVazio({ icone: "buscar", titulo: "Nenhum partido encontrado", texto: "Confira o nome digitado." })}
    </div>
  `;

  const slotPainel = document.getElementById("pcPainelSlot");
  if (slotPainel) slotPainel.innerHTML = painelHtml;
  ajustarBarrasTermometro();
  attachListenersSelecao();
  if (reRenderizando) window.scrollTo(0, scrollAnterior);
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

// (ajustarBackdropSticky foi removida em 16/08/2026 — o cabeçalho fixo da
// Seleção virou um bloco único #pcStickyHeader com fundo próprio, sem
// precisar de camada de blur calculada em JS pra tapar vão entre stickies.)

function attachListenersSelecao() {
  const btnColapsarPlenario = document.getElementById("pcBtnColapsarPlenario");
  if (btnColapsarPlenario) {
    btnColapsarPlenario.addEventListener("click", () => {
      const chave = "plenarioColapsado_" + pcState.cargoAtivo;
      pcState.expandido[chave] = !pcState.expandido[chave];
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
    inp.addEventListener("input", (e) => {
      const nomePartido = e.target.dataset.pcBuscaCandidato;
      const valor = e.target.value;
      const cursor = e.target.selectionStart;
      if (!pcState.buscaCandidato) pcState.buscaCandidato = {};
      pcState.buscaCandidato[nomePartido] = valor;
      renderCargoEstadual();
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
    btnBuscaPartidoToggle.addEventListener("click", () => {
      pcState.buscaPartidoAberta = !pcState.buscaPartidoAberta;
      renderCargoEstadual();
      if (pcState.buscaPartidoAberta) {
        const inp = document.getElementById("pcBuscaPartidoInput");
        if (inp) inp.focus({ preventScroll: true });
      }
    });
  }
  const inputBuscaPartido = document.getElementById("pcBuscaPartidoInput");
  if (inputBuscaPartido) {
    inputBuscaPartido.addEventListener("input", (e) => {
      const cursor = e.target.selectionStart;
      pcState.buscaPartido = e.target.value;
      renderCargoEstadual();
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
      renderCargoEstadual();
    });
  });
  document.querySelectorAll("[data-pc-zerar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = pcState.palpiteEdicao.find((pp) => pp.nome === btn.dataset.pcZerar);
      snapshotPalpite();
      zerarPartidoSelecao(p);
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
  document.querySelectorAll("[data-pc-partido-card]").forEach((card) => {
    card.addEventListener("mouseleave", () => {
      if (!pcState.ordemPartidosFixa) return;
      pcState.ordemPartidosFixa = null; // libera a reordenação de verdade só agora, com o mouse já fora
      renderCargoEstadual();
    });
  });
  document.getElementById("pcBtnVoltarSelecao").addEventListener("click", desfazerPalpite);
  document.getElementById("pcBtnPreencherAutoTudo").addEventListener("click", () => {
    pedirConfirmacaoAutoPreenchimento(null);
  });
  document.getElementById("pcBtnZerarTudo").addEventListener("click", () => {
    snapshotPalpite();
    zerarTudoSelecao();
    renderCargoEstadual();
  });
  const fecharInstrucao = document.getElementById("pcFecharInstrucao");
  if (fecharInstrucao) {
    fecharInstrucao.addEventListener("click", () => {
      pcState.instrucaoSelecaoAberta = false;
      renderCargoEstadual();
    });
  }
  const overlayInstrucao = document.getElementById("pcInstrucaoOverlay");
  if (overlayInstrucao) {
    overlayInstrucao.addEventListener("click", (e) => {
      if (e.target.id === "pcInstrucaoOverlay") {
        pcState.instrucaoSelecaoAberta = false;
        renderCargoEstadual();
      }
    });
  }
  const abrirInstrucao = document.getElementById("pcAbrirInstrucao");
  if (abrirInstrucao) {
    abrirInstrucao.addEventListener("click", () => {
      pcState.instrucaoSelecaoAberta = true;
      renderCargoEstadual();
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
  document.getElementById("pcBtnDepositar").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
    else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  });
  // "Salvar" da Seleção — ao contrário de "Avançar" (acima), não exige a
  // lista completa: grava o que já foi marcado e mantém a pessoa editando
  // na mesma tela (pedido do usuário em 16/08/2026 — vinha perdendo
  // simulações por não conseguir salvar antes de terminar). Reaproveita o
  // mesmo modal de nomear e a mesma execução de gravação da Revisão
  // (executarSalvarLista), só que com manterTela:true pra não navegar embora.
  document.getElementById("pcBtnSalvarSelecao").addEventListener("click", async () => {
    garantirPalpitesPorCargo();
    if (!pcState.listaSalvaNome) {
      pcState.modalNomeListaAberto = true;
      renderCargoEstadual();
      return;
    }
    // Só re-renderiza (e só aí mostra "Lista salva") quando deu certo — em
    // caso de erro, a mensagem já foi escrita na caixa de status ATUAL por
    // executarSalvarLista; re-renderizar de qualquer jeito apagaria ela
    // antes da pessoa conseguir ler.
    const ok = await executarSalvarLista({ manterTela: true });
    if (ok) {
      // renderCargoEstadual é assíncrona (await garantirPalpiteEdicaoAtivo
      // lá dentro) — sem esperar ela terminar, esta mensagem era escrita
      // ANTES do conteudo.innerHTML ser trocado e sumia junto com o DOM
      // antigo assim que o render de fato acontecia.
      await renderCargoEstadual();
      mostrarStatusSalvamento("Lista salva. Pode continuar editando.");
    }
  });
  if (pcState.modalNomeListaAberto) {
    attachListenersModalNomeLista(renderCargoEstadual, async () => {
      garantirPalpitesPorCargo();
      const ok = await executarSalvarLista({ manterTela: true });
      if (ok) {
        await renderCargoEstadual();
        mostrarStatusSalvamento("Lista salva. Pode continuar editando.");
      }
    });
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
      // rascunhoEhOrfao: mesma regra de garantirPalpiteEdicaoAtivo — não
      // usa rascunho preso num elenco que a fonte oficial já substituiu.
      const rascunho = pcState.rascunhosCache && pcState.rascunhosCache[c.id];
      const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
      pcState.palpitesPorCargo[c.id] = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial)) ? rascunho : poolOficial;
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
    // Simplificado (pedido do usuário em 12/08/2026) — a regra dos
    // 80%/20% do QE pra concorrer à sobra (art. 109 §2º) foi DERRUBADA
    // pelo STF em fevereiro/2024, valendo já a partir das eleições de
    // 2024 — por isso não aparece aqui. Não é uma simplificação nossa,
    // é a regra vigente: todo partido concorre à sobra, sem piso mínimo.
    const generico = "Elegeu-se pela <b>distribuição de sobras</b> (método das médias, art. 109): depois das vagas garantidas por quociente, o resto vai pro partido com a maior média de voto a cada rodada — não necessariamente pra quem tem mais voto individual.";
    if (!detalhe) return generico;
    // rodadaSobra pode não existir: eleito é a marcação da pessoa (ver
    // listaUnificadaRevisao), então dá pra marcar mais candidatos de um
    // partido do que a matemática real garantiria — nesse caso não tem uma
    // "rodada de sobra" de verdade pra citar, só o resto da explicação.
    if (detalhe.rodadaSobra === undefined) {
      return `${generico}<br><br>Nesse caso: a <b>${detalhe.cadeiraDoPartido}ª</b> cadeira marcada deste partido, com média de <b>${Math.round(detalhe.mediaConquistada).toLocaleString("pt-BR")}</b> votos (${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.cadeiraDoPartido}) — além do que a matemática real (quociente + sobra) garantiria hoje pra este partido.`;
    }
    return `${generico}<br><br>Nesse caso: essa foi a <b>${detalhe.rodadaSobra}ª</b> vaga de sobra distribuída nesse cargo (de <b>${detalhe.totalSobrasCargo}</b> no total, disputadas entre todos os partidos) — a <b>${detalhe.cadeiraDoPartido}ª</b> cadeira deste partido, com média de <b>${Math.round(detalhe.mediaConquistada).toLocaleString("pt-BR")}</b> votos (${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.cadeiraDoPartido}).`;
  }
  if (tag === "majoritário") {
    const generico = "Cargo majoritário (Senado): não existe quociente partidário nem sobra aqui — as vagas vão direto pra quem tiver mais voto individual, juntando todos os partidos numa fila só.";
    if (!detalhe) return generico;
    return `${generico}<br><br>Nesse caso: <b>${detalhe.posicaoGeral}º</b> colocado entre todos os candidatos ao cargo, que tem <b>${detalhe.totalVagasCargo}</b> vaga${detalhe.totalVagasCargo === 1 ? "" : "s"} em disputa.`;
  }
  return "";
}

// Versão sem HTML de explicacaoTag, pro atributo title="" (selo compacto
// do card de candidato eleito, Revisão — layout lateral com o campo de
// voto pedido pelo usuário em 13/08/2026: sem espaço pro ícone "i" de
// tooltip, a explicação fica só no toque/hover nativo do navegador).
function explicacaoTagTexto(tag, detalhe) {
  return explicacaoTag(tag, detalhe)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?b>/gi, "")
    .replace(/"/g, "'");
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
// Calcula a disputa de sobra completa de um cargo proporcional — QE, QP por
// partido, e o detalhe RODADA A RODADA de quem competiu e quem venceu cada
// vaga de sobra (método das médias, art. 109). Fonte única usada tanto pra
// marcar cada candidato eleito por média (rodadaSobra/totalSobrasCargo, ver
// listaUnificadaRevisao logo abaixo) quanto pro painel "Disputa de Sobra"
// na Revisão (pedido do usuário em 12/08/2026, com mockup confirmado).
// Só guarda o detalhe de médias das rodadas que SÃO sobra (depois que o
// partido já esgotou o próprio QP) — rodadas de QP não entram em `rodadas`,
// só contam pro histórico interno de cadeiras.
function calcularDisputaSobra(lista, totalVagasCargo) {
  const { cadeirasPorPartido, corte, historico } = (() => {
    const r = dhondtComCorte(lista, totalVagasCargo);
    return { cadeirasPorPartido: r.counts, corte: r.corte, historico: r.historico };
  })();
  const votosPorPartido = lista.map((p) => partyVotos(p));
  const totalValidos = votosPorPartido.reduce((s, v) => s + v, 0);
  const qe = quocienteEleitoral(totalValidos, totalVagasCargo);
  const qpPorPartido = lista.map((p, pIdx) => {
    const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
    return qe ? Math.min(cadeirasReais, Math.floor(votosPorPartido[pIdx] / qe)) : 0;
  });
  const totalQP = qpPorPartido.reduce((s, n) => s + n, 0);

  const contadorPorPartido = lista.map(() => 0);
  const rodadaSobraPorPartido = lista.map(() => []); // [pIdx][cadeiraDoPartido - 1] = nº da rodada de sobra (1-based) ou undefined se essa cadeira foi por QP
  const rodadas = [];
  let totalSobrasCargo = 0;

  historico.forEach((pIdxVencedor) => {
    const novaCadeira = contadorPorPartido[pIdxVencedor] + 1;
    if (novaCadeira > qpPorPartido[pIdxVencedor]) {
      totalSobrasCargo++;
      rodadaSobraPorPartido[pIdxVencedor][novaCadeira - 1] = totalSobrasCargo;
      // Média de TODOS os partidos nesta rodada, no instante exato da
      // disputa (contadorPorPartido ainda não incrementado pro vencedor).
      const medias = lista.map((p, pIdx) => ({
        nome: p.nome, votos: votosPorPartido[pIdx], cadeiraAtual: contadorPorPartido[pIdx],
        media: votosPorPartido[pIdx] / (contadorPorPartido[pIdx] + 1), venceu: pIdx === pIdxVencedor,
      })).sort((a, b) => b.media - a.media);
      rodadas.push({
        numero: totalSobrasCargo, vencedorNome: lista[pIdxVencedor].nome,
        vencedorMedia: medias.find((m) => m.venceu).media, medias,
      });
    }
    contadorPorPartido[pIdxVencedor]++;
  });

  return { qe, cadeirasPorPartido, corte, qpPorPartido, totalQP, rodadaSobraPorPartido, totalSobrasCargo, rodadas };
}

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
    // Mesmo princípio do ramo proporcional abaixo (eleito soberano do
    // usuário) — Senador é majoritário (sem QP/sobra), mas a regra de
    // nunca substituir a marcação vale igual.
    ordenados.forEach((c, i) => {
      const eleito = !!c.marcadoEleito;
      const votos = Number(c.votos) || 0;
      const consistenteComMatematicaReal = i < totalVagasCargo;
      resultado.push({
        chave: c.chave, nome: nomeExibicao(c), partido: c._partidoExibicao, votos, eleito,
        tag: eleito ? "majoritário" : null,
        detalhe: eleito ? { posicaoGeral: i + 1, totalVagasCargo } : null,
        gap: eleito ? null : { individual: consistenteComMatematicaReal ? 0 : Math.max(0, votosDoUltimo - votos + 1), partido: null, acrescimo: consistenteComMatematicaReal ? 0 : Math.max(0, votosDoUltimo - votos + 1) },
        marcadoPeloUsuario: eleito, consistenteComMatematicaReal,
      });
    });
  } else {
    const { qe, cadeirasPorPartido, corte, qpPorPartido, rodadaSobraPorPartido, totalSobrasCargo } = calcularDisputaSobra(lista, totalVagasCargo);
    lista.forEach((p, pIdx) => {
      const votosPartido = partyVotos(p);
      const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
      const qp = qpPorPartido[pIdx];
      const reaisOrdenados = [...p.candidatos]
        .filter((c) => c.fonte !== "legenda")
        .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      const ultimoEleitoDeVerdade = cadeirasReais > 0 ? reaisOrdenados[cadeirasReais - 1] : null;
      const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;
      // "eleito" soberano do usuário (conceito fechado 12/08/2026, retomado
      // 14/08/2026 com mockup validado) — nunca mais é quem a matemática
      // real elegeria, é sempre e só quem a pessoa marcou em Seleção
      // (c.marcadoEleito). cadeirasReais/qp/corte continuam calculados do
      // mesmo jeito, só que agora são puramente informativos (viram aviso
      // quando divergem, nunca substituem a marcação — ver
      // consistenteComMatematicaReal abaixo e o aviso em linhaCandidato).
      const marcadosOrdenados = reaisOrdenados.filter((c) => c.marcadoEleito);
      reaisOrdenados.forEach((c, i) => {
        const eleito = !!c.marcadoEleito;
        const votos = Number(c.votos) || 0;
        // Esse candidato específico é quem a matemática real elegeria
        // nessa posição de voto — independente de estar marcado ou não.
        const consistenteComMatematicaReal = i < cadeirasReais;
        if (eleito) {
          const cadeiraDoPartido = marcadosOrdenados.findIndex((m) => m.chave === c.chave) + 1;
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: true,
            tag: cadeiraDoPartido <= qp ? "QP" : "média",
            detalhe: { votosPartido, qe, qp, cadeirasReais, cadeiraDoPartido, mediaConquistada: votosPartido / cadeiraDoPartido, rodadaSobra: rodadaSobraPorPartido[pIdx][cadeiraDoPartido - 1], totalSobrasCargo },
            gap: null, marcadoPeloUsuario: true, consistenteComMatematicaReal,
          });
        } else if (consistenteComMatematicaReal) {
          // Real vencedor, mas a pessoa não marcou — vira só um aviso (ver
          // linhaCandidato), nunca reaparece como "eleito" sozinho: gap
          // zerado de propósito, já que pela matemática real essa vaga já
          // está garantida, só falta a pessoa marcar se concordar.
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: false,
            tag: null, detalhe: null,
            gap: { individual: 0, partido: 0, acrescimo: 0, votosPartido, temRivalAcima: false },
            marcadoPeloUsuario: false, consistenteComMatematicaReal: true,
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
            marcadoPeloUsuario: false, consistenteComMatematicaReal: false,
          });
        }
      });
    });

    // (Removido 14/08/2026: o fallback antigo de "sempre N eleitos" que
    // promovia candidatos extras por voto de 2022 quando o cargo inteiro
    // estava zerado. Fazia sentido enquanto "eleito" era decidido pela
    // matemática real — agora que é sempre a marcação da pessoa, forçar
    // uma promoção extra violaria exatamente o princípio que este item
    // implementa. Também ficou comprovadamente inatingível: o botão
    // "Avançar" da Seleção só libera com totalIndicado === totalVagasCargo
    // pra cada cargo, então quem chega na Revisão sempre já tem o número
    // certo de marcados.)
  }

  resultado.sort((a, b) => b.votos - a.votos);
  let contador = 0;
  resultado.forEach((c) => { if (c.eleito) { contador++; c.posicaoEleicao = contador; } });
  return resultado;
}

// Mensagem de erro/status de salvamento — mostrada em qualquer tela que
// chame executarSalvarLista (Revisão tem #pcDepositoStatus, Seleção tem
// #pcSelecaoStatus, ver renderCargoEstadual). Silenciosa se nenhuma das
// duas existir no momento (não deveria acontecer, mas evita TypeError).
function mostrarStatusSalvamento(msg) {
  const el = document.getElementById("pcDepositoStatus") || document.getElementById("pcSelecaoStatus");
  if (el) el.textContent = msg;
}

// Efetiva o Salvar depois que a lista já tem nome (primeira vez, via modal
// de nomear — ver attachListenersModalNomeLista) ou já tinha (salvamento
// seguinte da mesma lista, silencioso). Gera o id exclusivo na primeira
// vez só, e reaproveita depois — cada clique de Salvar é uma ATUALIZAÇÃO
// da mesma lista, não uma lista nova.
//
// manterTela:true é o caso da Seleção (botão Salvar, ver
// attachListenersSelecao) — grava a lista, mesmo incompleta, e devolve o
// controle pra quem chamou continuar na mesma tela em vez de navegar pra
// "lista salva"/painel, que é o comportamento certo só quando o salvamento
// vem do fim da trilha (Revisão → pcBtnConfirmarDeposito). Nesse caso a
// função só GRAVA e devolve true/false — não mostra "Lista salva" nem
// re-renderiza nada, porque quem chamou ainda vai re-renderizar a tela
// (pra fechar o modal de nome) e só DEPOIS disso a mensagem tem uma caixa
// de status nova pra aparecer; mostrar aqui seria apagado pelo re-render
// logo em seguida.
async function executarSalvarLista({ manterTela = false } = {}) {
  // Guarda ANTES de qualquer escrita — as duas ramificações abaixo
  // preenchem pcState.listaSalvaId assim que salvam, então precisa
  // capturar "ainda não tinha id" logo no início pra saber depois se
  // este Salvar foi o primeiro ou uma atualização de uma lista já
  // existente (ver uso no fim da função).
  const primeiraVez = !pcState.listaSalvaId;
  // Logado grava em "salvamentos"/"listas_salvas" de verdade (Supabase) —
  // cria na 1ª vez (listaSalvaId ainda null), atualiza em cima da mesma
  // linha nas vezes seguintes (nunca duplica). Convidado continua local
  // (window.storage), porque "salvamentos" exige perfil_id — sem cadastro
  // não tem onde gravar isso no banco.
  if (pcState.perfil) {
    if (!pcState.listaSalvaId) {
      const { data, error } = await salvarSalvamento(pcState.perfil.id, pcState.estado, pcState.listaSalvaNome, pcState.palpitesPorCargo);
      if (error) { mostrarStatusSalvamento("Erro ao salvar: " + error.message); return false; }
      pcState.listaSalvaId = data.id;
    } else {
      const { error } = await atualizarSalvamento(pcState.listaSalvaId, pcState.palpitesPorCargo);
      if (error) { mostrarStatusSalvamento("Erro ao salvar: " + error.message); return false; }
    }
  } else {
    pcState.listaSalvaId = pcState.listaSalvaId || gerarIdLista();
    await persistirListaSalvaLocal();
  }
  // Continua gravando em "palpites" também (Quadro de Médias público) —
  // tabela separada, 1 linha por pessoa, não mexe com "salvamentos".
  if (pcState.perfil) {
    const { error } = await salvarPalpiteCompleto(pcState.perfil.id, pcState.palpiteEdicao);
    if (error) { mostrarStatusSalvamento("Erro ao salvar: " + error.message); return false; }
    if (manterTela) return true;
    // A tela "Sua lista foi salva" (renderDepositoConfirmado) é a
    // recepção de PRIMEIRA vez — convite pra convidar amigos, criar
    // grupo etc. Salvamentos seguintes da MESMA lista (edição) não são
    // primeira vez de nada, então pulam direto pro painel, que é onde o
    // botão "Avançar" daquela tela levaria de qualquer forma. Pedido do
    // usuário em 16/08/2026.
    if (primeiraVez) { pcState.subaba = "deposito-confirmado"; } else { pcState.subaba = "painel"; }
    renderAppColaborativo();
    return true;
  } else if (manterTela) {
    return true;
  } else if (primeiraVez) {
    pcState.tela = "deposito-confirmado";
    renderColaborativo();
  } else {
    pcState.tela = "painel-convidado";
    renderColaborativo();
  }
  return true;
}

// Modal "nomeie a sua lista" — pedido só no primeiro Salvar de uma lista
// (sem nome ainda), de qualquer tela que tenha um botão Salvar (Seleção e
// Revisão, ver attachListenersModalNomeLista). Extraído em 16/08/2026 pra
// não duplicar o markup/lógica quando o Salvar ganhou um segundo ponto de
// entrada na Seleção.
function renderModalNomeLista() {
  return `
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
    </div>`;
}

// aoCancelar/aoConfirmar são callbacks de quem chamou (cada tela decide o
// que fazer depois): Revisão passa executarSalvarLista puro (navega pra
// "lista salva"/painel ao terminar); Seleção passa uma versão com
// manterTela:true seguida de um re-render da própria tela (ver
// attachListenersSelecao).
function attachListenersModalNomeLista(aoCancelar, aoConfirmar) {
  const inputNome = document.getElementById("pcInputNomeLista");
  inputNome.focus();
  const confirmar = async () => {
    const valor = inputNome.value.trim();
    if (!valor) {
      document.getElementById("pcErroNomeLista").textContent = "Digite um nome pra continuar.";
      inputNome.focus();
      return;
    }
    pcState.listaSalvaNome = valor;
    pcState.modalNomeListaAberto = false;
    await aoConfirmar();
  };
  document.getElementById("pcBtnCancelarNomeLista").addEventListener("click", () => {
    pcState.modalNomeListaAberto = false;
    aoCancelar();
  });
  document.getElementById("pcBtnConfirmarNomeLista").addEventListener("click", confirmar);
  inputNome.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } });
}

// Modal de editar o link de Instagram de UM candidato — só abre pra quem já
// tem pcState.souAdmin true (o botão de lápis nem aparece pra quem não é
// admin, ver o card do candidato em renderCargoEstadual); a escrita de
// verdade é sempre reconferida no banco (admin_definir_instagram_candidato,
// nuvem/migracao-24-instagram-candidato.sql), então nada aqui é a defesa
// real contra alguém driblar o front. pcState.modalInstagramInfo = { chave,
// nome, valorAtual } de quem está sendo editado, ou null.
function renderModalInstagram() {
  const info = pcState.modalInstagramInfo;
  return `
    <div id="pcModalInstagramOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(15,35,27,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(61,255,176,.35); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px;">Instagram — ${info.nome}</h2>
        <div style="font-size:11.5px; line-height:1.4; color:var(--pc-ink-dim); margin-bottom:14px;">Link visível pra todo mundo, ao lado do nome do candidato na Seleção. Cole o endereço completo do perfil.</div>
        <input class="cell" id="pcInputInstagram" placeholder="https://instagram.com/..." value="${escaparAtributoHtml(info.valorAtual || "")}" style="width:100%; margin-bottom:6px;">
        <div class="pc-erro" id="pcErroInstagram" style="min-height:16px;"></div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" id="pcBtnCancelarInstagram" style="flex:1;">Cancelar</button>
          ${info.valorAtual ? `<button class="ghost" id="pcBtnRemoverInstagram" style="flex:1; color:var(--pc-danger); border-color:var(--pc-danger);">Remover</button>` : ""}
          <button class="primary" id="pcBtnConfirmarInstagram" style="flex:1;">Salvar</button>
        </div>
      </div>
    </div>`;
}

function attachListenersModalInstagram(aoFechar) {
  const info = pcState.modalInstagramInfo;
  const input = document.getElementById("pcInputInstagram");
  input.focus();
  input.select();
  const salvar = async (valor) => {
    const { error } = await definirLinkCandidato(pcState.estado, pcState.cargoAtivo, info.chave, valor);
    if (error) {
      document.getElementById("pcErroInstagram").textContent = "Erro ao salvar: " + error.message;
      return;
    }
    // Atualiza o cache local na hora — sem isso o ícone só refletiria o
    // link novo depois de trocar de cargo/estado e voltar (garantirLinksCandidatos
    // só busca de novo quando o cache daquele estado+cargo ainda não existe).
    const chaveCache = `${pcState.estado}::${pcState.cargoAtivo}`;
    if (!pcState.linksCandidatosCache[chaveCache]) pcState.linksCandidatosCache[chaveCache] = {};
    if (valor) pcState.linksCandidatosCache[chaveCache][info.chave] = valor;
    else delete pcState.linksCandidatosCache[chaveCache][info.chave];
    pcState.modalInstagramInfo = null;
    aoFechar();
  };
  document.getElementById("pcBtnConfirmarInstagram").addEventListener("click", () => salvar(input.value.trim()));
  const btnRemover = document.getElementById("pcBtnRemoverInstagram");
  if (btnRemover) btnRemover.addEventListener("click", () => salvar(""));
  document.getElementById("pcBtnCancelarInstagram").addEventListener("click", () => {
    pcState.modalInstagramInfo = null;
    aoFechar();
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); salvar(input.value.trim()); } });
}

function renderRevisaoDeposito() {
  const conteudo = document.getElementById("pcConteudo");
  // Toda ação dentro da Revisão (abrir o menu ✦, editar voto, trocar
  // lista/grupo...) reconstrói o HTML inteiro de novo (mesmo padrão do
  // resto do app). Sem isso, cada clique fechava os cards <details> que
  // já estavam abertos e jogava a rolagem de volta pro topo da tela —
  // achado pelo usuário em 12/08/2026 clicando no botão ✦ de um
  // candidato pendente. `reRenderizando` distingue esse caso (preservar)
  // de entrar na tela pela primeira vez (começar do topo, é o esperado).
  const reRenderizando = !!conteudo.querySelector(".pc-acc");
  const scrollAnterior = window.scrollY;
  garantirPalpitesPorCargo();

  let temInconsistenciaGeral = false;
  // Guarda a disputaSobra de cada cargo (calculada dentro do loop abaixo)
  // pra reaproveitar no painel "Disputa de Sobra" — sem precisar calcular
  // de novo fora do loop nem mudar o que CARGOS.map() devolve.
  const disputaSobraPorCargo = {};

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
    // Antes (até 14/08/2026) contava candidatos marcados que a matemática
    // real rejeitava — não existe mais, "eleito" agora É a marcação (ver
    // listaUnificadaRevisao). O aviso que sobra é o oposto: candidatos que
    // a matemática real elegeria e a pessoa não marcou.
    const marcadosInconsistentes = listaCompleta.filter((c) => !c.eleito && c.consistenteComMatematicaReal);
    const temInconsistencia = marcadosInconsistentes.length > 0;
    if (temInconsistencia) temInconsistenciaGeral = true;

    // "Mínimo pra eleger" — referência única de folga/progresso, mostrada
    // em toda barra desta seção (eleito ou não): o corte de
    // dhondtComCorte (proporcional) ou o voto do último colocado real
    // (majoritário) — mesmo conceito de "linha de corte" já usado em
    // outros lugares do app, agora também visível na Revisão. Pedido do
    // usuário em 06/08/2026.
    const totalVagasCargoDef = vagasFixasCargo(pcState.estado, cargoDef.id);
    // Disputa de sobra completa deste cargo (painel "Disputa de Sobra",
    // pedido do usuário em 12/08/2026, mockup confirmado) — null pro
    // Senador, que não tem QE/QP/sobra (majoritário).
    const disputaSobra = cargoDef.id !== "senador" ? calcularDisputaSobra(lista, totalVagasCargoDef) : null;
    disputaSobraPorCargo[cargoDef.id] = disputaSobra;
    let minimoParaEleger = 0;
    if (cargoDef.id === "senador") {
      const todosReaisOrdenados = [];
      lista.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todosReaisOrdenados.push(c)));
      todosReaisOrdenados.sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      minimoParaEleger = totalVagasCargoDef > 0 && todosReaisOrdenados[totalVagasCargoDef - 1] ? (Number(todosReaisOrdenados[totalVagasCargoDef - 1].votos) || 0) : 0;
    } else {
      minimoParaEleger = Math.ceil(disputaSobra.corte);
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
        // "Mínimo pra eleger" só é uma comparação justa no Senador (voto
        // individual direto). Em Estadual/Federal é uma média do CARGO
        // inteiro — comparar com o voto pessoal de alguém eleito por
        // quociente partidário (QP) dava "+0 de folga" mesmo pra quem
        // está 100% garantido pelo total do partido, não pelo próprio
        // voto. Achado testando ao vivo em 06/08/2026 — só mostra o
        // mínimo onde ele é matematicamente correto. A "folga" (margem
        // acima do mínimo) foi retirada a pedido do usuário em
        // 13/08/2026 — não fazia sentido junto do conceito de sobra, que
        // nem existe no majoritário.
        const mostrarMargem = cargoDef.id === "senador";
        return cardCandidato(`
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="flex-shrink:0; width:30px; height:30px; border-radius:9px; background:rgba(61,255,176,.1); border:1px solid rgba(61,255,176,.3); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:var(--pc-accent);">${c.posicaoEleicao}</div>
            <div style="min-width:0; flex:1;">
              <div style="font-size:16px; font-weight:700; color:var(--pc-ink); display:flex; align-items:center; gap:5px;">
                ${c.nome}
              </div>
              <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                <span style="width:7px; height:7px; border-radius:50%; background:var(--pc-accent); flex-shrink:0;"></span>
                <span style="font-size:11px; font-weight:600; color:var(--pc-accent);">${c.partido}</span>
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:4px 10px; margin-top:10px; flex-wrap:wrap;">
            <div style="display:flex; flex-direction:column; align-items:flex-start; gap:6px; flex-shrink:0;">
              <span title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="display:block; font-size:9px; font-weight:700; letter-spacing:.01em; text-transform:uppercase; border-radius:6px; padding:3px 6px; white-space:nowrap; box-sizing:border-box; color:var(--pc-accent); background:rgba(61,255,176,.12); cursor:help;">${c.tag === "majoritário" ? "eleito" : `eleito · ${c.tag}`}</span>
              ${c.tag === "média" && c.detalhe.rodadaSobra !== undefined ? `<span title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="display:block; font-size:9px; font-weight:700; letter-spacing:.01em; border-radius:6px; padding:3px 6px; white-space:nowrap; box-sizing:border-box; color:var(--pc-warning); background:rgba(201,138,43,.14); border:1px solid rgba(201,138,43,.35); cursor:help;">sobra · rodada ${c.detalhe.rodadaSobra}/${c.detalhe.totalSobrasCargo}</span>` : ""}
            </div>
            <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:94px; font-size:15px; font-weight:800; text-align:right; flex-shrink:0; padding:9px 6px;">
          </div>
          <div style="margin-top:12px;">
            ${barraProgresso(100, 0.4)}
          </div>
          ${mostrarMargem ? `<div style="font-size:10px; color:var(--pc-ink-dim); margin-top:6px;">para eleger: ${minimoParaEleger.toLocaleString("pt-BR")}</div>` : ""}
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
        <div style="min-width:0;">
          <div style="font-size:16px; font-weight:700; color:var(--pc-ink);">${c.nome}</div>
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">${c.partido}</div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:112px; font-size:16px; font-weight:800; text-align:right; flex-shrink:0;">
        </div>
        ${c.consistenteComMatematicaReal ? `
        <div style="margin-top:12px; padding:10px 12px; background:rgba(201,138,43,.1); border:1px solid rgba(201,138,43,.3); border-radius:10px; display:flex; gap:8px; align-items:flex-start;">
          <span style="color:var(--pc-warning); font-size:13px; flex-shrink:0;">${iconeSvg("alerta", 13)}</span>
          <span style="font-size:11.5px; color:var(--pc-warning); line-height:1.5;">${cargoDef.id === "senador"
            ? `A votação de hoje indica que ${c.nome} estaria entre os mais votados (eleição majoritária, voto direto) — mas não está no seu palpite. Fica valendo sua escolha; isso é só um aviso.`
            : `A matemática real (quociente + sobra) indica que ${c.nome} garantiria vaga com a votação de hoje — mas não está no seu palpite. Fica valendo sua escolha; isso é só um aviso.`}</span>
        </div>` : `
        <div style="display:flex; align-items:center; gap:10px; margin-top:12px;">
          ${botaoMagico}
          ${barraProgresso(pct)}
        </div>
        ${menuMagico}
        ${legendaFaltam ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:var(--pc-ink-dim); margin-top:6px;">
          <span>${legendaFaltam}</span>
          <span style="display:flex; align-items:center; gap:6px;">
            <span>${pct}%</span>
            ${mostrarMagico ? `<button data-pc-abrir-magico="${c.chave}" class="pc-mini-btn" title="Como completar os votos" style="width:20px; height:20px; padding:0; border-radius:50%; flex-shrink:0; color:var(--pc-accent); border-color:rgba(61,255,176,.4); background:${menuAberto ? "rgba(61,255,176,.18)" : "transparent"};"><svg viewBox="0 0 16 16" width="12" height="12" style="transform:rotate(${menuAberto ? "180deg" : "0deg"}); transition:transform .15s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>` : ""}
          </span>
        </div>` : ""}`}
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
          // Prefere um não-eleito que realmente precisa de voto (ignora quem
          // já é vencedor real só não marcado — esse tem gap.partido zerado
          // de propósito, ver listaUnificadaRevisao, e não representa "falta
          // pra próxima vaga" de verdade).
          const naoEleito = candidatosPartido.find((c) => !c.eleito && c.gap && !c.consistenteComMatematicaReal)
            || candidatosPartido.find((c) => !c.eleito && c.gap);
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
      <details class="pc-acc" data-pc-cargo-acc="${cargoDef.id}"${pcState.expandido["revisao-" + cargoDef.id] ? " open" : ""}>
        <summary style="align-items:flex-start;"><span style="flex:1; min-width:0; line-height:1.35;">${cargoDef.label} <span style="font-weight:400; color:var(--pc-ink-dim);">— ${totalEleitos} eleitos${temInconsistencia ? ` · ${marcadosInconsistentes.length} aviso${marcadosInconsistentes.length === 1 ? "" : "s"}` : ""}</span></span><svg class="pc-chev" viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0; margin-top:3px;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary>
        <div class="pc-acc-body">
          <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">${filtroAgrupado}</div>
          ${disputaSobra && disputaSobra.rodadas.length > 0 ? `<button data-pc-abrir-disputa-sobra="${cargoDef.id}" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-bottom:12px; background:rgba(201,138,43,.08); border:1px solid rgba(201,138,43,.3); color:var(--pc-warning); font-family:var(--sans); font-size:12.5px; font-weight:700; border-radius:10px; padding:10px; cursor:pointer;">Ver disputa de sobra completa (${disputaSobra.rodadas.length} rodada${disputaSobra.rodadas.length === 1 ? "" : "s"})</button>` : ""}
          ${linhas}
        </div>
      </details>`;
  }).join("");

  // Painel "Disputa de Sobra" (overlay) — pcState.disputaSobraAberta guarda
  // o id do cargo aberto (ou null). Mesmo padrão visual dos outros overlays
  // desta tela (pcInstrucaoOverlay/pcTop2022Overlay): fundo desfocado,
  // cartão central, botão fechar. Pedido do usuário em 12/08/2026, mockup
  // confirmado antes de implementar.
  const painelDisputaSobraHtml = (() => {
    const cargoAbertoId = pcState.disputaSobraAberta;
    if (!cargoAbertoId) return "";
    const cargoDef = CARGOS.find((c) => c.id === cargoAbertoId);
    const disputaSobra = disputaSobraPorCargo[cargoAbertoId];
    if (!cargoDef || !disputaSobra) return "";
    const linhasRodadas = disputaSobra.rodadas.map((r) => `
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--pc-glass-border);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:10px; color:#2b1600; background:var(--pc-warning); padding:2px 8px; border-radius:999px; font-weight:800;">Rodada ${r.numero}</span>
          <span style="font-size:11px; color:var(--pc-ink-dim);">votos ÷ (vagas atuais + 1)</span>
        </div>
        ${r.medias.map((m) => `
          <div style="display:grid; grid-template-columns:16px 1fr auto; align-items:center; gap:8px; padding:6px 8px; border-radius:8px; font-size:12px;${m.venceu ? " background:rgba(201,138,43,.1); border:1px solid rgba(201,138,43,.3);" : ""}">
            <span style="text-align:center;">${m.venceu ? "🏆" : ""}</span>
            <span style="color:${m.venceu ? "var(--pc-ink)" : "var(--pc-ink-dim)"}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.nome}${m.venceu ? ` — ${r.vencedorNome}` : ""}</span>
            <span style="font-weight:700; color:${m.venceu ? "var(--pc-warning)" : "var(--pc-ink-dim)"};">${Math.round(m.media).toLocaleString("pt-BR")}</span>
          </div>`).join("")}
      </div>`).join("");
    return `
      <div id="pcDisputaSobraOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(4,10,8,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(15,35,27,.9); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(201,138,43,.3); border-radius:18px; padding:22px 20px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
            <div>
              <h2 style="margin:0; font-size:16px;">Disputa de sobra — ${cargoDef.label}</h2>
              <div class="pc-sub" style="margin-top:4px;">${disputaSobra.rodadas.length} vaga${disputaSobra.rodadas.length === 1 ? "" : "s"} decidida${disputaSobra.rodadas.length === 1 ? "" : "s"} por média, uma rodada de cada vez, entre todos os partidos</div>
            </div>
            <button id="pcFecharDisputaSobra" class="pc-mini-btn" title="Fechar" style="font-size:16px; line-height:1;">×</button>
          </div>
          <div style="display:flex; gap:16px; margin:16px 0 4px; padding:10px 12px; background:#081712; border-radius:10px;">
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Quociente eleitoral</div><div style="font-size:15px; font-weight:700;">${Math.round(disputaSobra.qe).toLocaleString("pt-BR")}</div></div>
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Vagas por QP</div><div style="font-size:15px; font-weight:700;">${disputaSobra.totalQP}</div></div>
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Vagas por sobra</div><div style="font-size:15px; font-weight:700;">${disputaSobra.totalSobrasCargo}</div></div>
          </div>
          ${linhasRodadas}
        </div>
      </div>`;
  })();

  conteudo.innerHTML = `
    ${painelDisputaSobraHtml}
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
    ${pcState.modalNomeListaAberto ? renderModalNomeLista() : ""}`;
  if (pcState.modalNomeListaAberto) {
    attachListenersModalNomeLista(renderRevisaoDeposito, executarSalvarLista);
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
  // Lembra se cada card de cargo (Dep. Estadual/Federal/Senador) estava
  // aberto ou fechado — sem isso, toda ação dentro da Revisão (inclusive
  // o botão ✦ abaixo) reconstrói o HTML e os <details> voltam pro estado
  // fechado do zero (ver `reRenderizando`/`scrollAnterior` no topo desta
  // função). O evento nativo "toggle" não precisa de re-render, só grava
  // o estado pra próxima vez.
  document.querySelectorAll("details.pc-acc[data-pc-cargo-acc]").forEach((det) => {
    det.addEventListener("toggle", () => {
      pcState.expandido["revisao-" + det.getAttribute("data-pc-cargo-acc")] = det.open;
    });
  });
  // Painel "Disputa de Sobra" — abre com o id do cargo clicado, fecha
  // voltando pra null. Mesmo padrão dos outros overlays desta tela.
  document.querySelectorAll("[data-pc-abrir-disputa-sobra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.disputaSobraAberta = btn.getAttribute("data-pc-abrir-disputa-sobra");
      renderRevisaoDeposito();
    });
  });
  const btnFecharDisputaSobra = document.getElementById("pcFecharDisputaSobra");
  if (btnFecharDisputaSobra) {
    btnFecharDisputaSobra.addEventListener("click", () => {
      pcState.disputaSobraAberta = null;
      renderRevisaoDeposito();
    });
  }
  // Botão mágico (✦) de cada candidato pendente — abre/fecha o menu com as
  // 2 formas de completar o voto que falta. Clique, não hover (pedido do
  // usuário em 06/08/2026). Duas entradas pro mesmo menu: o ✦ ao lado da
  // barra de progresso, e a seta ao lado de "faltam X votos" (pedido do
  // usuário em 12/08/2026, mais visível pra quem não reparou no ✦).
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

  if (reRenderizando) window.scrollTo(0, scrollAnterior);
}

function renderDepositoConfirmado() {
  const conteudo = document.getElementById("pcConteudo");
  const tiles = [
    { icone: "send", label: "Convide os amigos", info: "Gere um link único e envie por WhatsApp ou redes sociais. Quem entra pelo seu link já chega sabendo quem convidou." },
    { icone: "grupos", label: "Crie grupos particulares", info: "Monte um grupo, convide por código ou link, e acompanhe um ranking só entre vocês — todo mundo vê o palpite de todo mundo ali dentro." },
    { icone: "chart", label: "Avance na pontuação", info: "Você pontua por candidato eleito certo, pela proximidade da votação de cada um, pelas cadeiras por partido, pela enquete eleitoral e por um bônus de quem entrega a lista mais cedo." },
    { icone: "ranking", label: "Ranqueamento", info: "Você entra em 4 rankings ao mesmo tempo: geral (nacional), do seu estado, por categorias, e dos grupos particulares que você criar ou entrar." },
  ];
  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): os 4 quadrados antigos
  // (.pc-tile, ícone gigante com rótulo por cima) viraram a grade de
  // atalhos padrão — ícone-em-círculo + título + tooltip ⓘ preservado.
  const tilesHtml = tiles.map((t) => `
    <div class="pc-lobby-atalho" style="cursor:default;">
      <div class="pc-lobby-atalho-icone">${iconeSvg(t.icone, 19)}</div>
      <div style="display:flex; align-items:center; gap:4px;"><div class="pc-lobby-atalho-titulo" style="font-size:12.5px; text-align:left;">${t.label}</div>${infoTip(t.info)}</div>
    </div>`).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto; text-align:center; padding:2rem 1.5rem;">
      ${iconeSvg("ballot", 30)}
      <h2 style="margin-top:8px;">Sua lista foi salva</h2>
      <div style="font-size:16px; font-weight:700; color:var(--pc-accent); margin:6px 0 4px;">Agora o game começa de verdade</div>
      <div class="pc-lobby-atalhos" style="margin:18px 0; text-align:left;">${tilesHtml}</div>
      <button class="primary" id="pcBtnIrPainel">Avançar</button>
      <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:8px;">O acesso a essas ferramentas fica disponível a partir do cadastro simples.</div>
    </div>`;
  document.getElementById("pcBtnIrPainel").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "painel"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
  });
}

// Consulta pública de cédula (nome ou código) — pedido do usuário, ver
// BACKLOG.md "Cédula depositada / Compartilhamento": a pontuação/ranking
// de verdade depende do resultado oficial de 2026, mas achar e ver uma
// cédula específica não depende disso, então já funciona agora, dentro
// da mesma tela (placeholder do ranking em si).
function renderRankingPlaceholder() {
  const conteudo = document.getElementById("pcConteudo");

  if (pcState.buscaCedulaDetalhe) {
    const r = pcState.buscaCedulaDetalhe;
    const secoes = montarSecoesCargosDetalhe({ estadual: r.lista_estadual, federal: r.lista_federal, senador: r.lista_senador });
    conteudo.innerHTML = `
      <button class="ghost" id="pcBtnVoltarBuscaCedula" style="margin-bottom:14px;">← Voltar pra busca</button>
      <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">${r.nome_exibicao}</div>
      <div class="pc-sub" style="margin:0 0 14px 2px;">${r.estado}${r.codigo ? ` · código ${r.codigo}` : ""}</div>
      ${secoes || `<div class="glass-card"><div class="pc-sub" style="margin:0;">Essa cédula não tem candidatos registrados.</div></div>`}`;
    document.getElementById("pcBtnVoltarBuscaCedula").addEventListener("click", () => {
      pcState.buscaCedulaDetalhe = null;
      renderRankingPlaceholder();
    });
    return;
  }

  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): cabeçalho vira banner de
  // destaque (o Ranking em si ainda não abriu — o banner explica quando e
  // como, no lugar de um card comum), resultados da busca viram mini-cards.
  const resultados = pcState.buscaCedulaResultados;
  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Ranking</div>
    <div class="pc-lobby-banner">
      <div class="pc-lobby-banner-eyebrow">Depois da eleição</div>
      <div class="pc-lobby-banner-titulo">Quem acertou mais, sobe</div>
      <div class="pc-lobby-banner-corpo">O ranking abre com o resultado oficial de 2026: vale quem mais acertar a lista real de eleitos; o desempate é a menor distância entre votos previstos e reais.</div>
      <div style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--pc-accent); font-weight:700;">${iconeSvg("calendario", 14)}Faltam ${diasAteEleicao()} dias</div>
    </div>
    <div class="pc-lobby-menu-tit">Consultar uma cédula</div>
    <div class="pc-lobby-card" style="padding:14px 16px;">
      <div class="pc-sub" style="margin:0 0 12px;">Busque pelo nome de quem depositou ou pelo código da cédula (ex.: SL01-AB3D) — isso já funciona agora, não depende do resultado oficial.</div>
      <div style="display:flex; gap:8px;">
        <input class="cell" id="pcBuscaCedulaInput" placeholder="Nome ou código" value="${pcState.buscaCedulaTermo || ""}" style="flex:1;">
        <button class="primary" id="pcBtnBuscarCedula" style="flex-shrink:0;">Buscar</button>
      </div>
    </div>
    <div id="pcBuscaCedulaResultado" style="margin-top:14px;">
      ${pcState.buscaCedulaCarregando ? `<div class="pc-sub">Buscando…</div>` : ""}
      ${!pcState.buscaCedulaCarregando && resultados && resultados.length === 0 ? estadoVazio({ icone: "buscar", titulo: "Nada encontrado", texto: "Confira o nome ou código digitado." }) : ""}
      ${!pcState.buscaCedulaCarregando && resultados && resultados.length > 0 ? resultados.map((r) => `
        <button data-pc-ver-cedula-publica="${r.salvamento_id}" class="pc-mini-card">
          <div class="pc-mini-card-icone">${iconeSvg("ballot", 17)}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.nome_exibicao}</div>
            <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px;">${r.estado}${r.codigo ? ` · <span style="font-family:var(--mono);">${r.codigo}</span>` : ""}</div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
        </button>`).join("") : ""}
    </div>`;

  const input = document.getElementById("pcBuscaCedulaInput");
  const disparar = async () => {
    pcState.buscaCedulaTermo = input.value;
    pcState.buscaCedulaCarregando = true;
    renderRankingPlaceholder();
    pcState.buscaCedulaResultados = await buscarCedulaPublica(pcState.buscaCedulaTermo);
    pcState.buscaCedulaCarregando = false;
    renderRankingPlaceholder();
  };
  document.getElementById("pcBtnBuscarCedula").addEventListener("click", disparar);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") disparar(); });
  document.querySelectorAll("[data-pc-ver-cedula-publica]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-pc-ver-cedula-publica");
      pcState.buscaCedulaDetalhe = pcState.buscaCedulaResultados.find((r) => r.salvamento_id === id);
      renderRankingPlaceholder();
    });
  });
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
          <div style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}${c.semPalpites ? " · sem palpite ainda" : ` · ${c.amostras} palpite${c.amostras === 1 ? "" : "s"}`}</div>
        </span>
      </span>
      <span style="font-size:12.5px; font-weight:600; color:var(--pc-ink-dim); font-variant-numeric:tabular-nums; flex-shrink:0;">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
    </div>`;

  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Mediana</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Pesquisa em tempo real — mediana aparada de ${totalPalpites} palpite${totalPalpites === 1 ? "" : "s"} público${totalPalpites === 1 ? "" : "s"}. Quem estaria eleito, pela mesma regra do resultado oficial.</div>
    <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
    <div class="pc-lobby-card" style="padding:14px;">
      ${desenharHemiciclo(seatsProj, totalVagasCargo, { preenchido: "rgba(61,255,176,.14)", vago: "#182f24", borda: "var(--pc-ink)", texto: "var(--pc-ink)", porPartido: false })}
    </div>
    <div class="pc-lobby-card">
      ${projecao.length ? projecao.map(linha).join("") : estadoVazio({ icone: "chart", titulo: "Ninguém preencheu esse cargo", texto: "Assim que alguém depositar uma cédula pública desse cargo, a mediana aparece aqui." })}
    </div>
  `;

  document.querySelectorAll("[data-pc-cargo-medias]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoMedias = btn.getAttribute("data-pc-cargo-medias");
      renderQuadroMedias();
    });
  });
}
