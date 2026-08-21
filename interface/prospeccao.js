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
  avisoLimiteGrupoAberto: false, // aviso ao tentar criar 2º grupo sem saldo (10 créditos)
  avisoLimiteCedulaAberto: false, // aviso ao tentar depositar 2ª cédula sem saldo (70 créditos)
  linksCandidatosCache: {}, // "estado::cargo" -> { chave: instagram }, ver garantirLinksCandidatos
  modalInstagramInfo: null, // { chave, nome, valorAtual } do candidato com o modal de editar Instagram aberto (só admin), ou null
  legendaComandosAberta: false, // painel único de legenda do painel de comandos da Seleção (o "i" no fim da linha de ícones)
  funilVotosAberto: false, // funil explicativo dos votos válidos (o "i" do cabeçalho da aba Senador, PROJETO.md §8.2)
  sobraInfoAberta: false, // explicação da regra de sobra (o "i" do quadro-resumo no painel Disputa de Sobra, Revisão)
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
  lista22: '<path d="M2.6 3.4h7.2M2.6 6.4h7.2M2.6 9.4h4.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><text x="11.6" y="14" text-anchor="middle" font-size="6.4" font-weight="800" fill="currentColor" font-family="var(--sans)">22</text>',
  relogio22: '<circle cx="6.4" cy="6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M6.4 3.6v2.5l1.8 1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path><text x="11.8" y="14.2" text-anchor="middle" font-size="6.4" font-weight="800" fill="currentColor" font-family="var(--sans)">22</text>',
  refazer: '<path d="M7.67 5.33c1.77 0 3.37 0.66 4.6 1.73l2.4-2.39v6h-6l2.41-2.41c-0.93-0.77-2.11-1.25-3.41-1.25-2.36 0-4.37 1.54-5.07 3.67l-1.58-0.52C1.95 7.35 4.57 5.33 7.67 5.33z" fill="currentColor"></path>',
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
  credito: '<circle cx="8" cy="8" r="5.7" fill="none" stroke="currentColor" stroke-width="1.3"></circle><circle cx="8" cy="8" r="2.7" fill="none" stroke="currentColor" stroke-width="1.2"></circle><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>',
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
// Linha de botões a partir da lista de comandos, fundindo Desfazer+Refazer
// num círculo DIVIDIDO (2 alvos de toque na área de 1 botão — protótipo
// "refino v3" aprovado em 20/08/2026). A legenda continua listando os dois
// separados; só o desenho da linha muda.
function renderBotoesComandos(comandos) {
  const out = [];
  for (let i = 0; i < comandos.length; i++) {
    const c = comandos[i];
    const prox = comandos[i + 1];
    if (c.id === "pcBtnVoltarSelecao" && prox && prox.id === "pcBtnRefazerSelecao") {
      out.push(`<div class="pc-cmd-acao pc-cmd-dupla">
        <button type="button" id="${c.id}" title="${escaparAtributoHtml(c.titulo)}" ${c.disabled ? "disabled" : ""}>${iconeSvg(c.icone, 13)}</button>
        <button type="button" id="${prox.id}" title="${escaparAtributoHtml(prox.titulo)}" ${prox.disabled ? "disabled" : ""}>${iconeSvg(prox.icone, 13)}</button>
      </div>`);
      i++;
      continue;
    }
    out.push(comandoIcone(c));
  }
  return out.join("");
}

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
// Só o painel expandível de legendas (sem a fileira de botões) — usado no
// modelo fader dos deputados, onde os botões moram no console do cabeçalho
// fixo mas a legenda abre no conteúdo (pra não esticar o sticky).
function renderLegendaComandos(comandos) {
  const itens = comandos.map((c) => `
    <div class="pc-cmd-legenda-item">
      <div class="pc-cmd-legenda-icone">${iconeSvg(c.icone, 15)}</div>
      <div>
        <div class="pc-cmd-legenda-titulo">${c.titulo}</div>
        <div class="pc-cmd-legenda-sub">${c.legenda || ""}</div>
      </div>
    </div>`).join("");
  return `<div class="pc-cmd-legenda-painel aberto" id="pcCmdLegendaPainel">${itens}</div>`;
}

function renderPainelComandos(comandos, aberta) {
  const botoes = renderBotoesComandos(comandos);
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

// ===== Auxiliares herdadas do Simulador individual (removido 18/08/2026,
// decisão do usuário: todas as funções dele já foram absorvidas pela
// Prospecção Coletiva — código completo no histórico do git, interface/
// app.js até o commit 57a5138). Só estas 4 eram usadas aqui. =====
function infoTip(html, alinhamento) {
  const classeExtra = alinhamento === "right" ? " tip-box-right" : "";
  return `<span class="info-tip">i<span class="tip-box${classeExtra}">${html}</span></span>`;
}
function warnTip(html) {
  return `<span class="info-tip warn">!<span class="tip-box">${html}</span></span>`;
}
function chevron(open) {
  return `<svg width="11" height="11" viewBox="0 0 16 16" style="vertical-align:middle; transform:rotate(${open ? 90 : 0}deg); transition:transform .15s;">
    <path d="M5 3 L11 8 L5 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function selosCandidato2022(c) {
  let html = "";
  if (c.eleito2022) html += `<span class="badge-eleito2022">eleito 2022</span>`;
  if (c.invalidado2022) html += warnTip(`<b>Voto invalidado em 2022</b><br><br>${c.motivoInvalidacao || "Candidatura sub júdice — votação não contou no resultado final."}`);
  return html;
}

// Link de Compartilhar (ver mostrarLinkCompartilhavel) — index.html?ver=<id>.
// Query string, não hash: sobrevive a preview de link (WhatsApp etc.), que
// costuma cortar fragmento depois de #. Quem abre esse link não precisa de
// conta nem login — passa direto pra tela de leitura, sem chamar
// initColaborativo()/checar sessão, igual o resto do fluxo faz.
const _paramsIniciais = new URLSearchParams(window.location.search);
const _perfilCompartilhado = _paramsIniciais.get("ver");
// Convite pessoal (?conv=SL-XXXXXX, migração 26): guarda até o cadastro —
// quem chega pelo link de um amigo fica atribuído a ele quando criar a
// conta (nuvem/autenticacao.js, _resolverConvidadoPor).
const _convitePendente = _paramsIniciais.get("conv");
if (_convitePendente) localStorage.setItem("sl_convite_pendente", _convitePendente.trim().toUpperCase());

document.getElementById("modoColaborativoWrap").style.display = "block";
if (_perfilCompartilhado) {
  pcState.iniciado = true;
  pcState.tela = "compartilhado";
  pcState.verPerfilId = _perfilCompartilhado;
  renderColaborativo();
} else {
  pcState.iniciado = true;
  initColaborativo();
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
  // Presença/marcos (migração 26): registra o dia (streak) e concede
  // marcos únicos direto no banco. Fire-and-forget — se a migração não
  // rodou ainda, só loga e segue.
  if (pcState.perfil) registrarPresenca();
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

// Qual "lista salva" (nomeada, com id) o rascunho ATUAL deste estado
// pertence — pcState.listaSalvaId/listaSalvaNome viviam só na memória,
// nunca gravados em lugar nenhum. Resultado: a pessoa editava uma lista já
// salva (via "Editar" em Minhas Listas), a página recarregava (aba
// suspensa no celular, fechar e abrir de novo...) e o app continuava
// mostrando o rascunho certinho, mas tinha esquecido COMPLETAMENTE que
// aquele conteúdo era a lista "X" — Salvar virava "criar uma lista nova
// do zero" (duplicava, em vez de atualizar) e nem mostrava o nome de
// referência. Achado pelo usuário em 17/08/2026 ("aqui não existe nenhuma
// referência sobre qual lista eu salvei"). Guardado por window.storage
// (mesmo mecanismo do rascunho) tanto pra convidado quanto logado — é só
// um atalho local, não precisa sincronizar entre aparelhos.
function _chaveListaAtivaLocal(uf) {
  return `pc-lista-ativa:${uf}`;
}
async function persistirListaAtivaLocal() {
  if (!pcState.estado) return;
  try {
    if (pcState.listaSalvaId) {
      await window.storage.set(_chaveListaAtivaLocal(pcState.estado), JSON.stringify({ id: pcState.listaSalvaId, nome: pcState.listaSalvaNome }));
    } else {
      await window.storage.delete(_chaveListaAtivaLocal(pcState.estado));
    }
  } catch (e) { /* localStorage indisponível, ignora — só perde o atalho, não o conteúdo */ }
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
  // Restaura de qual lista salva (se alguma) este rascunho é — só quando a
  // sessão atual ainda não sabe (não sobrescreve um listaSalvaId que já
  // veio de "Editar" nesta mesma navegação). Ver persistirListaAtivaLocal.
  if (!pcState.listaSalvaId) {
    try {
      const r = await window.storage.get(_chaveListaAtivaLocal(pcState.estado));
      const ativa = r && r.value ? JSON.parse(r.value) : null;
      if (ativa && ativa.id) {
        pcState.listaSalvaId = ativa.id;
        pcState.listaSalvaNome = ativa.nome || null;
      }
    } catch (e) { /* sem atalho local, segue como lista nova */ }
  }
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
  pcState.farolTemDeposito = true; // Farol de Orientação — passo "Depositar" concluído
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
  return `<div style="position:fixed; left:0; right:0; bottom:0; z-index:40; display:flex; justify-content:center; background:rgba(16,18,20,.96); border-top:1px solid #23262A;">
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


// ===== Farol de Orientação (ORIENTACAO.md §3) =====
// UM elemento global que acompanha o usuário pelo projeto inteiro
// (palpite → revisão → depósito → convite). Design fechado em 20/08/2026:
// sinalizador "3 pontos" sem moldura e sem animação — a quantidade de
// pontos acesos é o nível aberto (1 bolha / 2 barra / 3 painel completo);
// sem pendência, os três ficam apagados. Ciclo pelo toque 1→2→3→1, o
// "−" volta direto pra bolha, NUNCA abre sozinho, o nível persiste.

function farolNivelAtual() {
  const n = parseInt(localStorage.getItem("pcFarolNivel"), 10);
  // Sem escolha salva (1ª visita), o painel completo vem ABERTO (nível 3)
  // — decisão do usuário em 20/08/2026; o tutorial ensina a fechar no "−".
  // Depois da primeira escolha, vale sempre o nível salvo.
  return n >= 1 && n <= 3 ? n : 3;
}

function definirFarolNivel(n) {
  localStorage.setItem("pcFarolNivel", String(Math.min(3, Math.max(1, n))));
  atualizarFarol();
}

// Lista mais fresca disponível de um cargo, sem forçar carregamento: a
// edição ativa > cache de troca de aba > rascunho carregado no boot.
function _farolListaDoCargo(cid) {
  if (cid === pcState.cargoAtivo && pcState.palpiteEdicao) return pcState.palpiteEdicao;
  if (pcState.palpitesPorCargo && pcState.palpitesPorCargo[cid]) return pcState.palpitesPorCargo[cid];
  if (pcState.rascunhosCache && pcState.rascunhosCache[cid]) return pcState.rascunhosCache[cid];
  return null;
}

// Predicados do cargo (ORIENTACAO.md §4) calculados de qualquer lista, não
// só da ativa. Vagas: pro proporcional soma vagasIndicadas (o invariante do
// tapete curto); pro Senador conta marcadoEleito. Votos: o mesmo gate de
// 99,5% que habilita o Avançar.
function _farolStatusCargo(cid) {
  const totalVagas = vagasFixasCargo(pcState.estado, cid);
  const lista = _farolListaDoCargo(cid);
  if (!lista) return { vagasOk: false, votosOk: false, ind: 0, totalVagas, pct: 0 };
  let ind;
  if (cid === "senador") {
    ind = lista.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).length, 0);
  } else {
    const { counts } = dhondtComCorte(lista, totalVagas);
    ind = lista.reduce((s, p, i) => s + vagasIndicadasDe(p, counts[i] || 0), 0);
  }
  const soma = lista.reduce((s, p) => s + p.candidatos.reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
  const proj = totalValidosProjetado2026(cid);
  return {
    vagasOk: totalVagas > 0 && ind >= totalVagas,
    votosOk: proj > 0 && soma >= 0.995 * proj,
    ind: Math.min(ind, totalVagas), totalVagas,
    pct: proj > 0 ? Math.min(1, soma / proj) : 0,
  };
}

// O passo pendente mais eficiente a partir do estado atual — ou null quando
// está tudo em dia (aí os 3 pontos ficam apagados). Fase A: montagem dos 3
// cargos (passos 1-2 da trilha por cargo). Fase B: revisar+salvar (4),
// depositar (5... exibido como 5? ver nota), convidar. Numeração exibida
// segue ORIENTACAO.md §2.3 com o 4 e o 5 fundidos em "revise e salve"
// (revisitar a Revisão não é detectável por estado — farol, não trilho).
function farolPassoAtual() {
  if (!pcState.estado) return null;
  const pendentes = CARGOS.filter((c) => {
    const st = _farolStatusCargo(c.id);
    return !(st.vagasOk && st.votosOk);
  });
  if (pendentes.length) {
    const naTelaPalpite = pcState.tela === "selecao-convidado" || (pcState.tela === "app" && pcState.subaba === "selecao");
    // Cargo ativo completo mas outros pendentes, na tela de palpite: o
    // próximo gesto da pessoa é AVANÇAR (passo 3 da trilha do cargo), não
    // a trilha do outro cargo — achado pelo usuário em 20/08/2026 ("mesmo
    // tendo completado os passos, o sistema não pulou para a etapa 3").
    if (naTelaPalpite && !pendentes.some((c) => c.id === pcState.cargoAtivo)) {
      const ativo = CARGOS.find((c) => c.id === pcState.cargoAtivo);
      const rotuloAtivo = ativo.label.replace(/^Dep\.\s*/, "");
      return { num: 3, fase: "A", cargoId: ativo.id, rotuloCargo: rotuloAtivo, rotulo: "Avance — " + rotuloAtivo + " completo", progresso: "" };
    }
    const foco = (naTelaPalpite && pendentes.some((c) => c.id === pcState.cargoAtivo))
      ? CARGOS.find((c) => c.id === pcState.cargoAtivo)
      : pendentes[0];
    const st = _farolStatusCargo(foco.id);
    const rotuloCargo = foco.label.replace(/^Dep\.\s*/, "");
    if (!st.vagasOk) {
      if (foco.id === "senador") return { num: 1, fase: "A", cargoId: foco.id, rotuloCargo, rotulo: "Indique os " + st.totalVagas + " eleitos", progresso: st.ind + " de " + st.totalVagas };
      return { num: 1, fase: "A", cargoId: foco.id, rotuloCargo, rotulo: "Preencha as vagas por partido — " + rotuloCargo, progresso: st.ind + " de " + st.totalVagas };
    }
    return { num: 2, fase: "A", cargoId: foco.id, rotuloCargo, rotulo: "Distribua a votação — " + rotuloCargo, progresso: Math.round(st.pct * 100) + "% preenchida" };
  }
  if (!pcState.listaSalvaId) return { num: 4, fase: "B", rotulo: "Revise e salve sua lista", progresso: "" };
  if (!pcState.farolTemDeposito) return { num: 5, fase: "B", rotulo: "Deposite a cédula — vale no ranking", progresso: "" };
  if (!(pcState.meusGrupos && pcState.meusGrupos.length)) return { num: 6, fase: "B", rotulo: "Convide amigos e compare palpites", progresso: "" };
  return null;
}

// Dados que o passo 5/6 precisa e não estão em memória no boot — melhor
// esforço, sem travar render nenhum; quando chega, o farol se atualiza.
async function garantirDadosFarol() {
  if (pcState._farolDadosPedidos || !pcState.estado) return;
  pcState._farolDadosPedidos = true;
  try {
    if (pcState.farolTemDeposito === undefined) await _carregarMinhasListasNormalizado();
    if (pcState.perfil && !pcState.meusGrupos) await garantirMeusGruposCarregados();
  } catch (e) { /* melhor esforço — sem dado, o farol segue com o que tem */ }
  atualizarFarol();
}

// qtd pontos acesos; comId=true só no uso clicável da bolha (nível 1).
function farolPontosHtml(qtd, comId) {
  const pontos = [1, 2, 3].map((i) => `<i class="${i <= qtd ? "on" : ""}"></i>`).join("");
  if (comId) return `<button type="button" id="pcFarolPontos" class="pc-farol-pontos" title="Painel de orientação">${pontos}</button>`;
  return `<span class="pc-farol-pontos">${pontos}</span>`;
}

function _farolLinhaTrilha(chip, titulo, opcoes) {
  const o = opcoes || {};
  const cls = o.atual ? "atual" : (o.feito ? "feito" : "futuro");
  return `<div class="pc-farol-item ${cls}">
    <span class="pc-farol-item-chip">${chip}</span>
    <div class="pc-farol-item-corpo">
      <div class="pc-farol-item-tit">${titulo}${o.progresso ? ` <span class="pc-farol-item-prog">— ${o.progresso}</span>` : ""}</div>
      ${o.texto ? `<div class="pc-farol-item-txt">${o.texto}</div>` : ""}
    </div>
  </div>`;
}

// A trilha do nível 3. Fase A mostra a trilha do cargo em foco (miniaturas
// dos controles REAIS — box de vagas, mágico, avançar); fase B, a reta
// final. Tudo em dia = tudo com check.
function farolTrilhaHtml(passo) {
  const ck = `<svg viewBox="0 0 16 16" width="11" height="11"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  if (passo && passo.fase === "A") {
    const st = _farolStatusCargo(passo.cargoId);
    const ehSen = passo.cargoId === "senador";
    return `
      ${_farolLinhaTrilha(st.vagasOk ? ck : "1", ehSen ? "Indicar os " + st.totalVagas + " eleitos" : "Preencher as vagas por partido", {
        feito: st.vagasOk, atual: passo.num === 1, progresso: st.ind + " de " + st.totalVagas,
        texto: passo.num === 1 ? (ehSen ? "Toque no candidato ou arraste a barra dele até o selo ELEITO acender." : `Comece decidindo o tamanho das bancadas: toque no box <span class="pc-farol-minibox">− 8 +</span> de cada partido e marque quantas cadeiras ele ganha, até fechar as ${st.totalVagas}.`) : "",
      })}
      ${_farolLinhaTrilha(st.votosOk ? ck : "2", "Distribuir a votação pelos candidatos", {
        feito: st.votosOk, atual: passo.num === 2, progresso: Math.round(st.pct * 100) + "%",
        texto: passo.num === 2 ? `Atribua o seu palpite para os candidatos que você conhece: arraste a alça ou digite os votos do candidato. Depois, você palpita nos candidatos que não conhece, ou utiliza o mágico <span class="pc-farol-minicmd">${iconeSvg("completar", 11)}</span> que completa a votação com os votos proporcionais para completar o número de vagas que você selecionou — sem mexer no que você preencheu.` : "",
      })}
      ${_farolLinhaTrilha("3", "Avançar", {
        atual: passo.num === 3,
        texto: `Fechou a votação? O botão <span class="pc-farol-minicmd">${iconeSvg("setaDireita", 11)}</span> avança. Repita nos três cargos e siga pra Revisão.`,
      })}`;
  }
  const num = passo ? passo.num : 99;
  return `
    ${_farolLinhaTrilha(ck, "Montar os 3 cargos", { feito: true })}
    ${_farolLinhaTrilha(num > 4 ? ck : "4", "Revisar e salvar a lista", { feito: num > 4, atual: num === 4, texto: num === 4 ? `Confira os três cargos e salve — o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span> na Revisão. A lista fica em Minhas listas, editável.` : "" })}
    ${_farolLinhaTrilha(num > 5 ? ck : "5", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? "Em Minhas listas, toque em Depositar — trava a lista e ela passa a valer no ranking. A primeira é grátis." : "" })}
    ${_farolLinhaTrilha(num > 6 ? ck : "6", "Convidar e comparar", { feito: num > 6, atual: num === 6, texto: num === 6 ? `Compartilhe o cartão-desafio ou crie um grupo <span class="pc-farol-minicmd">${iconeSvg("convidar", 11)}</span> — cada amigo que entrar e depositar rende créditos.` : "" })}`;
}

// O bloco dos níveis 2 e 3 (e, nas telas sem seletor de cargos, também a
// linha da bolha do nível 1 — soPontosNaLinha).
function farolConteudoBloco(soPontosNaLinha) {
  const nivel = farolNivelAtual();
  const passo = farolPassoAtual();
  if (nivel === 1) {
    return soPontosNaLinha ? `<div class="pc-farol-linha1">${farolPontosHtml(passo ? 1 : 0, true)}</div>` : "";
  }
  if (nivel === 2) {
    return `<div class="pc-farol-barra" id="pcFarolBarra" role="button" tabindex="0">
      ${farolPontosHtml(passo ? 2 : 0, false)}
      ${passo
        ? `<span class="pc-farol-passo">Passo ${passo.num}</span><span class="pc-farol-txt">${passo.rotulo}${passo.progresso ? " — " + passo.progresso : ""}</span>`
        : `<span class="pc-farol-txt" style="color:var(--pc-ink-dim);">Tudo em dia — nada pendente</span>`}
      <button type="button" class="pc-farol-min" id="pcFarolMin" title="Recolher">−</button>
    </div>`;
  }
  const titulo = passo
    ? (passo.fase === "A" ? "Sua trilha — " + passo.rotuloCargo : "Sua trilha — reta final")
    : "Sua trilha — tudo em dia";
  return `<div class="pc-farol-painel">
    <div class="pc-farol-cab" id="pcFarolCabecalho" role="button" tabindex="0">
      ${farolPontosHtml(passo ? 3 : 0, false)}
      <span class="pc-farol-cab-tit">${titulo}</span>
      <button type="button" class="pc-farol-min" id="pcFarolMin" title="Recolher">−</button>
    </div>
    ${farolTrilhaHtml(passo)}
  </div>`;
}

// Recalcula e redesenha o farol nos slots presentes na tela atual — barato
// (predicados sobre listas já em memória), chamado no fim de todo render
// que mostra o farol e a cada troca de nível.
function atualizarFarol() {
  const bloco = document.getElementById("pcFarolBloco");
  const slotPontos = document.getElementById("pcFarolPontosSlot");
  if (!bloco && !slotPontos) return;
  const nivel = farolNivelAtual();
  if (bloco) bloco.innerHTML = farolConteudoBloco(!slotPontos);
  if (slotPontos) slotPontos.innerHTML = nivel === 1 ? farolPontosHtml(farolPassoAtual() ? 1 : 0, true) : "";
  const pontos = document.getElementById("pcFarolPontos");
  if (pontos) pontos.addEventListener("click", () => definirFarolNivel(2));
  const barra = document.getElementById("pcFarolBarra");
  if (barra) barra.addEventListener("click", (ev) => { if (ev.target.closest("#pcFarolMin")) return; definirFarolNivel(3); });
  const cab = document.getElementById("pcFarolCabecalho");
  if (cab) cab.addEventListener("click", (ev) => { if (ev.target.closest("#pcFarolMin")) return; definirFarolNivel(1); });
  const min = document.getElementById("pcFarolMin");
  if (min) min.addEventListener("click", () => definirFarolNivel(1));
  garantirDadosFarol();
}

function renderColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  // Tema Fader (identidade 2.0) agora GLOBAL em toda a Prospecção
  // Coletiva (18/08/2026 — começou só na tela de palpite, expandido pra
  // todo o app a pedido do usuário, começando pela capa). O Simulador
  // individual (fora de #modoColaborativoWrap) não é afetado.
  el.classList.add("pc-tema-fader");
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
  // Capa no padrão "Fader" (18/08/2026): o card central usa o mesmo
  // material do console das telas de palpite (#2C3239/#4D545C), o
  // círculo do ícone reaproveita o estilo exato dos botões do console
  // (translúcido claro), e o verde vivo aparece só no botão principal —
  // único acento de cor da tela inteira, mesma escassez do resto do app.
  el.innerHTML = `
    <div class="pc-capa-console">
      <div class="pc-capa-icone">${iconeSvg("ballot", 30)}</div>
      <div class="pc-capa-marca">
        <span class="pc-capa-wordmark"><i>Simula</i>LEGIS</span>
        <span class="pc-capa-marca-sub">Simulador Eleitoral Legislativo 2026</span>
      </div>
      <h2 class="pc-capa-h2">Pronto pra testar seu faro político?</h2>
      <div class="pc-capa-sub">Monte, publique e compare a sua lista com seus amigos.</div>
      <button class="primary pc-capa-cta" id="pcBtnComecar">Começar</button>
      <button class="ghost pc-capa-entrar" id="pcBtnJaTenhoConta">já tenho conta — entrar</button>

      <div class="pc-capa-divisor"></div>
      <div class="pc-capa-desafio">${iconeSvg("grupos", 15)}Desafie aquele seu amigo, vizinho ou familiar neste game criativo e dinâmico.</div>
      <div class="pc-capa-aviso">Este game não é aposta online ou mercado preditivo.</div>
    </div>`;
  document.getElementById("pcBtnComecar").addEventListener("click", () => {
    pcState.tela = "estado";
    renderColaborativo();
  });
  document.getElementById("pcBtnJaTenhoConta").addEventListener("click", () => {
    pcState.tela = "login";
    renderColaborativo();
  });
}

// Segunda tela do convite: escolher o estado antes de qualquer coisa. Só
// Santa Catarina tem candidatos carregados hoje (dados/estados-brasil.js) —
// os demais aparecem na lista, desabilitados, preparando a expansão futura.
function renderTelaEstado() {
  const el = document.getElementById("modoColaborativoWrap");
  // Ordem alfabética SÓ na exibição da roleta (a ordem de ESTADOS_BRASIL é
  // de dados) — com SC no meio da roda, a abertura já mostra vizinhos dos
  // dois lados e a roleta fica visualmente centrada.
  const listaEstados = [...ESTADOS_BRASIL].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  const itens = listaEstados.map((e) => `
    <div class="pc-picker-item${e.disponivel ? "" : " pc-picker-disabled"}" data-uf="${e.sigla}">${e.nome}</div>
  `).join("");

  el.innerHTML = `
    <div class="pc-acesso" style="min-height:min(70vh, 560px); display:flex; flex-direction:column; justify-content:center;">
      ${cascaAcessoTopo("pcBtnVoltarEstado")}
      <div class="pc-acesso-h2">Onde você vai palpitar?</div>
      <div class="pc-acesso-sub">Role e centralize o seu estado.</div>

      <div class="pc-picker" id="pcPicker">
        <div class="pc-picker-center-band"></div>
        <div class="pc-picker-pad"></div>
        ${itens}
        <div class="pc-picker-pad"></div>
      </div>

      <div class="pc-acesso-confirm">
        <div id="pcEstadoConfirmMsg"></div>
      </div>
      <button class="primary" id="pcBtnConfirmarEstado" disabled>Continuar</button>
    </div>`;
  document.getElementById("pcBtnVoltarEstado").addEventListener("click", () => {
    pcState.tela = "landing";
    renderColaborativo();
  });

  const picker = document.getElementById("pcPicker");
  const itensEls = picker.querySelectorAll(".pc-picker-item");
  let ufCentralizado = null;

  function atualizarPicker() {
    const centerY = picker.scrollTop + picker.clientHeight / 2;
    let maisProximo = null, menorDist = Infinity;
    itensEls.forEach((it) => {
      const itCenter = it.offsetTop + it.offsetHeight / 2;
      const dist = Math.abs(centerY - itCenter);
      const norm = Math.min(dist / 82, 1);
      it.style.opacity = String(1 - norm * 0.75);
      it.style.transform = `scale(${1 - norm * 0.25})`;
      // Desfoque progressivo nas linhas longe do centro (pedido do usuário,
      // 20/08/2026) — junto com opacidade+escala dá o efeito de roda 3D.
      it.style.filter = `blur(${(norm * 2.2).toFixed(2)}px)`;
      it.classList.remove("pc-picker-alvo");
      if (dist < menorDist) { menorDist = dist; maisProximo = it; }
    });
    if (!maisProximo) return;
    maisProximo.classList.add("pc-picker-alvo");
    ufCentralizado = maisProximo.dataset.uf;
    const estado = ESTADOS_BRASIL.find((e) => e.sigla === ufCentralizado);
    // Sem repetir o nome (ele já está verde na própria roda) — só a legenda
    // com as vagas em disputa do estado centralizado.
    document.getElementById("pcEstadoConfirmMsg").textContent = estado.disponivel
      ? `${vagasFixasCargo(estado.sigla, "estadual")} vagas de Dep. Estadual · ${vagasFixasCargo(estado.sigla, "federal")} de Federal · ${vagasFixasCargo(estado.sigla, "senador")} de Senador`
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
      <button class="pc-mini-btn" id="pcBtnVoltarLegal" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
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


// ===== Casca padrão do fluxo de acesso (aprovada 20/08/2026) =====
// Card no material do console da capa + cabeçalho constante (voltar à
// esquerda quando cabível + rótulo de marca centralizado). Todas as telas
// entre a capa e o app usam esta casca — ver task de padronização.
function cascaAcessoTopo(voltarId) {
  return `<div class="pc-acesso-topo">
    ${voltarId ? `<button class="pc-acesso-voltar" id="${voltarId}" title="Voltar">${iconeSvg("setaEsquerda", 14)}</button>` : ""}
    <span class="pc-acesso-marca${voltarId ? " com-voltar" : ""}">
      <span class="pc-acesso-wordmark"><i>Simula</i>LEGIS</span>
      <span class="pc-acesso-marca-sub">Simulador Eleitoral Legislativo 2026</span>
    </span>
  </div>`;
}

// Pílulas de gênero (substituem o <select>, mesmo id num input hidden pra
// não mexer nos handlers de submit).
function pilulasGenero(idCampo) {
  return `<input type="hidden" id="${idCampo}" value="">
  <div class="pc-acesso-genero" data-pc-genero-alvo="${idCampo}">
    ${["Feminino", "Masculino", "Outro"].map((g) => `<button type="button" data-pc-genero="${g}">${g}</button>`).join("")}
  </div>`;
}
function attachPilulasGenero() {
  document.querySelectorAll("[data-pc-genero-alvo]").forEach((grupo) => {
    const alvo = document.getElementById(grupo.getAttribute("data-pc-genero-alvo"));
    grupo.querySelectorAll("[data-pc-genero]").forEach((btn) => {
      btn.addEventListener("click", () => {
        grupo.querySelectorAll("[data-pc-genero]").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        alvo.value = btn.getAttribute("data-pc-genero");
      });
    });
  });
}

function renderTelaLogin() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso">
      ${cascaAcessoTopo("pcBtnVoltarLogin")}
      <div class="pc-acesso-h2">Que bom te ver de novo</div>
      <div class="pc-acesso-sub">Entre pra continuar seus palpites de onde parou.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcLoginEmail" type="email"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcLoginSenha" type="password"></div>
      <div class="pc-erro" id="pcLoginErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnEntrar">Entrar</button>
      <div class="pc-acesso-divisor">ou</div>
      <button class="ghost pc-acesso-ghost" id="pcBtnEntrarGoogle">${GOOGLE_G_SVG}Entrar com Google</button>
      <div class="pc-acesso-links">
        <button type="button" class="pc-acesso-link" id="pcLinkEsqueciSenha">Esqueci minha senha</button> ·
        <button type="button" class="pc-acesso-link destaque" id="pcBtnIrCadastro">Criar conta</button>
      </div>
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
    <div class="pc-acesso">
      ${cascaAcessoTopo("pcBtnVoltarRecuperar")}
      <div class="pc-acesso-h2">Esqueci minha senha</div>
      <div class="pc-acesso-sub">Digite o e-mail da sua conta — mandamos um link pra você definir uma senha nova.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcRecuperarEmail" type="email"></div>
      <div class="pc-erro" id="pcRecuperarErro"></div>
      <div class="pc-status" id="pcRecuperarStatus"></div>
      <button class="primary" id="pcBtnEnviarRecuperacao">Enviar link</button>
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
    <div class="pc-acesso">
      ${cascaAcessoTopo(null)}
      <div class="pc-acesso-h2">Defina uma nova senha</div>
      <div class="pc-acesso-sub">Você clicou no link de recuperação — escolha sua nova senha abaixo.</div>
      <div class="field-row"><label>Nova senha</label><input class="cell" id="pcNovaSenhaInput" type="password"></div>
      <div class="pc-erro" id="pcNovaSenhaErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnConfirmarNovaSenha">Salvar nova senha</button>
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
    <div class="pc-acesso">
      ${cascaAcessoTopo(null)}
      <div class="pc-acesso-h2">Só mais um passo</div>
      <div class="pc-acesso-sub">${veioDoGoogle ? "Sua conta Google já está conectada — falta só isto pra liberar o Simulador." : "Falta só isto pra liberar o Simulador."}</div>
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
        ${pilulasGenero("pcCompGenero")}
      </div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCompLgpd" style="margin-top:2px;">
        <span>Li e concordo com o uso dos meus dados (nome, e-mail, telefone, CPF, CEP/município e gênero) para criar minha conta, conforme a
          <a href="#" id="pcLinkPrivacidadeComp" class="pc-link">Política de Privacidade</a>
          e os
          <a href="#" id="pcLinkTermosComp" class="pc-link">Termos de Uso</a>.
          Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCompErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnConcluirPerfil">Concluir cadastro</button>
      <div class="pc-acesso-links"><button type="button" class="pc-acesso-link" id="pcBtnCancelarPerfil">Cancelar</button></div>
    </div>`;

  attachPilulasGenero();
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
    <div class="pc-acesso" style="max-width:380px;">
      ${cascaAcessoTopo(null)}
      <div style="display:flex; justify-content:space-between; align-items:center; margin:-6px 0 14px;">
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
    <div class="pc-acesso" style="max-width:460px;">
      ${cascaAcessoTopo(null)}
      <div class="pc-acesso-h2">Antes de começar, seu palpite rápido</div>
      <div class="pc-acesso-sub" style="max-width:none;">Só uma vez: quem você acha que vence cada disputa em 2026. Pra Presidente e Governador (não cobertos em detalhe aqui), é só o nome mesmo — pra Senador, Dep. Federal e Dep. Estadual você vai montar a cédula completa daqui a pouco.</div>

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
    <div class="pc-acesso" style="max-width:460px;">
      ${cascaAcessoTopo("pcBtnVoltarCadastro")}
      <div class="pc-acesso-h2">Crie sua conta</div>
      <div class="pc-acesso-sub">Grátis. Deposite sua cédula, entre em grupos e dispute o ranking.</div>
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
        ${pilulasGenero("pcCadGenero")}
      </div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCadLgpd" style="margin-top:2px;">
        <span>Li e concordo com o uso dos meus dados (nome, e-mail, telefone, CPF, CEP/município e gênero) para criar minha conta, conforme a
          <a href="#" id="pcLinkPrivacidade" class="pc-link">Política de Privacidade</a>
          e os
          <a href="#" id="pcLinkTermos" class="pc-link">Termos de Uso</a>.
          Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCadErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnCadastrar">Criar conta</button>
      <div class="pc-acesso-divisor">ou</div>
      <button class="ghost pc-acesso-ghost" id="pcBtnCadastrarGoogle">${GOOGLE_G_SVG}Continuar com Google</button>
      <div class="pc-acesso-links">Já tenho conta — <button type="button" class="pc-acesso-link destaque" id="pcBtnIrLogin">entrar</button></div>
    </div>`;

  document.getElementById("pcBtnVoltarCadastro").addEventListener("click", voltarDeLoginOuCadastro);
  attachPilulasGenero();
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
    <button class="pc-mini-btn" id="pcBtnVoltarMeuPerfil" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
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
      <div style="width:52px; height:52px; border-radius:50%; background:#2C3239; border:1px solid #4D545C; display:flex; align-items:center; justify-content:center; font-size:19px; font-weight:700; color:var(--pc-accent); flex-shrink:0;">${(p.nome || "?").trim().charAt(0).toUpperCase()}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:16px; font-weight:700;">${p.nome || "Sem nome"}</div>
        <div style="font-size:12px; color:var(--pc-ink-dim); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(pcState.sessao && pcState.sessao.user.email) || ""}</div>
      </div>
      <button id="pcBtnEditarPerfilMenu" class="pc-mini-btn" title="Editar meus dados" style="flex-shrink:0;">${iconeSvg("editar", 15)}</button>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Conta</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuDados", "perfil", "#2C3239", "Meus dados", "Telefone, CEP, município, gênero")}
      ${linhaMenu("pcBtnMenuSenha", "chave", "#2C3239", "Trocar senha", "Atualize sua senha de acesso")}
      ${linhaMenu("pcBtnMenuCreditos", "credito", "#2C3239", "Créditos", "Saldo e extrato da sua conta")}
      <div style="display:flex; align-items:center; gap:13px; padding:14px 16px; border-bottom:1px solid var(--pc-glass-border);">
        <div style="width:36px; height:36px; border-radius:10px; background:#2C3239; border:1px solid #4D545C; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconeSvg("alerta", 17)}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:600;">Notificações por e-mail</div>
          <div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:1px;">Avisos de grupo e da eleição (em breve)</div>
        </div>
        <label class="pc-switch" style="flex-shrink:0;"><input type="checkbox" id="pcToggleNotifEmail" ${p.notif_email ? "checked" : ""}><span class="pc-switch-slider"></span></label>
      </div>
      ${linhaMenu("pcBtnMenuReportar", "alerta", "rgba(198,230,42,.12)", "Reportar um problema", "Achou um bug? Nos conta aqui")}
      ${linhaMenu("pcBtnMenuConvidar", "convidar", "#2C3239", "Convidar amigos", "Seu grupo e código de convite")}
      ${pcState.souAdmin ? linhaMenu("pcBtnMenuAdmin", "chart", "#2C3239", "Painel do administrador", null) : ""}
      ${pcState.souUsuarioFinal ? linhaMenu("pcBtnMenuUsuarioFinal", "chart", "#2C3239", "Painel de dados estratégicos", null) : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Sobre</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuAjuda", "ajuda", "#2C3239", "Central de ajuda", "Como funciona o quociente, sobra e Senador")}
      ${linhaMenu("pcBtnMenuTermos", "ballot", "#2C3239", "Termos de uso", null)}
      ${linhaMenu("pcBtnMenuPrivacidade", "chave", "#2C3239", "Política de privacidade", null)}
    </div>

    <button id="pcBtnMenuExcluirConta" class="ghost" style="width:100%; margin-bottom:10px; color:var(--pc-danger); border-color:var(--pc-danger); opacity:.75;">Excluir conta</button>
    <button id="pcBtnMenuSair" class="ghost" style="width:100%; color:var(--pc-danger); border-color:var(--pc-danger);">Sair da conta</button>

    <div style="text-align:center; font-size:11px; color:var(--pc-ink-dim); margin-top:18px;">
      Simulador Eleitoral · Legislativo 2026
      <div style="margin-top:4px; opacity:.7;">versão ${PC_VERSAO_APP}</div>
    </div>

    ${pcState.modalReportarProblema ? renderModalReportarProblema() : ""}
    ${pcState.modalExcluirConta ? renderModalExcluirConta() : ""}
    ${pcState.modalCreditos ? renderModalCreditos() : ""}`;

  document.getElementById("pcBtnEditarPerfilMenu").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuDados").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuSenha").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcToggleNotifEmail").addEventListener("change", async (e) => {
    const valor = e.target.checked;
    pcState.perfil = { ...p, notif_email: valor };
    await atualizarPerfil(p.id, { notif_email: valor });
  });
  document.getElementById("pcBtnMenuReportar").addEventListener("click", () => { pcState.modalReportarProblema = true; renderMenuConta(); });
  document.getElementById("pcBtnMenuCreditos").addEventListener("click", async () => {
    pcState.modalCreditos = { carregando: true };
    renderMenuConta();
    const [saldo, extrato] = await Promise.all([
      obterSaldoCreditos(p.id),
      obterExtratoCreditos(p.id, 50),
    ]);
    // extrato null = migração 21 ainda não rodou no banco — o modal avisa
    // em vez de quebrar (mesmo espírito dos outros acessos ao Supabase).
    pcState.modalCreditos = { carregando: false, saldo, extrato };
    renderMenuConta();
  });
  document.getElementById("pcBtnMenuConvidar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
  const fecharCreditos = document.getElementById("pcFecharModalCreditos");
  if (fecharCreditos) fecharCreditos.addEventListener("click", () => { pcState.modalCreditos = null; renderMenuConta(); });
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
    <div id="pcModalExcluirContaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(232,67,42,.4); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
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
    <button class="pc-mini-btn" id="pcBtnVoltarAjuda" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
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

// Modal "Créditos" do Menu — saldo + extrato da própria conta (economia
// fase 1, MONETIZACAO.md v3 §11.2 etapa 1). Material do padrão
// informativo (DESIGN.md §3.4b). Dados carregados no listener da linha
// do Menu; extrato null = migração 21 ainda não rodada no banco.
function renderModalCreditos() {
  const m = pcState.modalCreditos;
  if (!m) return "";
  const corpo = m.carregando
    ? `<div class="pc-sub" style="text-align:center; padding:20px 0;">Carregando…</div>`
    : `
      <div style="display:flex; align-items:baseline; justify-content:space-between; background:#101214; border:1px solid #23262A; border-radius:10px; padding:12px 14px; margin-bottom:12px;">
        <span style="font-size:12px; color:var(--pc-ink-dim);">Saldo atual</span>
        <span style="font-size:22px; font-weight:750; font-variant-numeric:tabular-nums;">${Number(m.saldo || 0).toLocaleString("pt-BR")} <span style="font-size:11px; font-weight:600; color:var(--pc-ink-dim);">crédito${m.saldo === 1 ? "" : "s"}</span></span>
      </div>
      ${m.extrato === null
        ? `<div class="pc-sub">O extrato ainda não está disponível (atualização do banco pendente).</div>`
        : m.extrato.length === 0
          ? `<div class="pc-sub" style="text-align:center; padding:8px 0;">Nenhuma movimentação ainda — convide amigos pra ganhar os primeiros créditos.</div>`
          : m.extrato.map((t) => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 2px; border-top:1px solid #23262A; font-size:12px;">
              <span style="min-width:0;">
                <span style="display:block; font-weight:600;">${ROTULO_TRANSACAO[t.tipo] || t.tipo}</span>
                <span style="font-size:10px; color:var(--pc-ink-dim);">${new Date(t.criado_em).toLocaleString("pt-BR")}${t.referencia ? " · " + t.referencia : ""}</span>
              </span>
              <span style="flex-shrink:0; text-align:right; font-variant-numeric:tabular-nums;">
                <span style="font-weight:750; color:${t.valor >= 0 ? "var(--pc-accent)" : "var(--pc-ink)"};">${t.valor >= 0 ? "+" : ""}${t.valor}</span>
                <span style="display:block; font-size:9.5px; color:var(--pc-ink-faint);">saldo ${t.saldo_apos}</span>
              </span>
            </div>`).join("")}`;
  return `
    <div id="pcModalCreditosOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(29,32,35,.97); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;">
          <div>
            <h2 style="margin:0; font-size:16px;">Créditos</h2>
            <div class="pc-sub" style="margin-top:3px;">Extrato completo da sua conta — toda entrada e saída fica registrada aqui.</div>
          </div>
          <button id="pcFecharModalCreditos" class="pc-mini-btn" title="Fechar" style="font-size:16px; line-height:1;">×</button>
        </div>
        ${corpo}
      </div>
    </div>`;
}

function renderModalReportarProblema() {
  return `
    <div id="pcModalReportarProblemaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
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

// Aba "Créditos e Financeiro" (economia fase 1, MONETIZACAO.md v3 §8):
// conceder/ajustar créditos por e-mail (ferramenta dos jogadores base),
// saldos e extrato geral. Exige a migração 21 no banco — sem ela, as
// listas avisam em vez de quebrar.
async function montarAdminFinanceiro() {
  const [stats, saldos, extrato] = await Promise.all([
    adminEstatisticasCreditos(),
    adminSaldos(100),
    adminExtratoGeral(50),
  ]);
  if (!stats) return `<div class="pc-sub">Não consegui carregar os dados financeiros.</div>`;
  const s = pcState.adminCreditoStatus;
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

    <div class="glass-card" style="margin-top:14px; padding:16px;">
      <div style="font-size:13px; font-weight:700; margin-bottom:4px;">Conceder / ajustar créditos</div>
      <div class="pc-sub" style="margin-bottom:12px;">Quantidade negativa remove (o saldo nunca fica abaixo de zero). Tudo vira linha no extrato — nada é silencioso.</div>
      <div class="field-row"><label>E-mail da conta</label><input class="cell" id="pcAdminCreditoEmail" type="email" placeholder="pessoa@exemplo.com"></div>
      <div style="display:flex; gap:10px;">
        <div class="field-row" style="flex:1;"><label>Quantidade (+/-)</label><input class="cell" id="pcAdminCreditoQtd" type="number" step="1" placeholder="10"></div>
        <div class="field-row" style="flex:2;"><label>Motivo (vai pro extrato)</label><input class="cell" id="pcAdminCreditoMotivo" placeholder="jogador base — lançamento"></div>
      </div>
      <button class="primary" id="pcBtnAdminConcederCredito" style="width:100%;">Aplicar</button>
      <div class="pc-status" id="pcAdminCreditoStatus" style="margin-top:8px; min-height:14px;">${s || ""}</div>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Saldos (contas com crédito)</div>
    ${saldos === null
      ? `<div class="pc-sub">Indisponível — rode a migração 21 (nuvem/migracao-21-ledger-creditos.sql) no SQL Editor.</div>`
      : saldos.length === 0
        ? `<div class="pc-sub">Nenhuma conta com saldo ainda.</div>`
        : `<div class="pc-lobby-card">${saldos.map((l) => `
          <div class="pc-lobby-linha">
            <span style="min-width:0; font-size:12.5px;"><b>${l.nome}</b> <span style="color:var(--pc-ink-dim); font-size:11px;">${l.email}</span></span>
            <span style="flex-shrink:0; font-weight:750; font-variant-numeric:tabular-nums;">${l.saldo}</span>
          </div>`).join("")}</div>`}

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Extrato geral (últimas 50)</div>
    ${extrato === null
      ? `<div class="pc-sub">Indisponível — rode a migração 21 no SQL Editor.</div>`
      : extrato.length === 0
        ? `<div class="pc-sub">Nenhuma movimentação registrada ainda.</div>`
        : `<div class="pc-lobby-card">${extrato.map((t) => `
          <div class="pc-lobby-linha" style="align-items:flex-start;">
            <span style="min-width:0; font-size:12px;">
              <b>${t.nome}</b> · ${ROTULO_TRANSACAO[t.tipo] || t.tipo}${t.referencia ? ` <span style="color:var(--pc-ink-dim);">(${t.referencia})</span>` : ""}
              <span style="display:block; font-size:10px; color:var(--pc-ink-dim);">${new Date(t.criado_em).toLocaleString("pt-BR")} · ${t.email}</span>
            </span>
            <span style="flex-shrink:0; text-align:right; font-variant-numeric:tabular-nums;">
              <b style="color:${t.valor >= 0 ? "var(--pc-accent)" : "var(--pc-ink)"};">${t.valor >= 0 ? "+" : ""}${t.valor}</b>
              <span style="display:block; font-size:9.5px; color:var(--pc-ink-faint);">saldo ${t.saldo_apos}</span>
            </span>
          </div>`).join("")}</div>`}`;
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
    el.innerHTML = `<div class="glass-card"><h2>Acesso restrito</h2><div class="pc-sub">Essa área é só pra administradores.</div><button class="ghost" id="pcBtnVoltarAdminRestrito" style="width:100%; margin-top:10px; display:flex; align-items:center; justify-content:center; gap:7px;">${iconeSvg("setaEsquerda", 14)}Voltar</button></div>`;
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
    <button class="pc-mini-btn" id="pcBtnVoltarAdmin" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
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

  if (pcState.adminSecao === "financeiro") {
    document.getElementById("pcBtnAdminConcederCredito").addEventListener("click", async (e) => {
      const email = document.getElementById("pcAdminCreditoEmail").value.trim();
      const qtd = parseInt(document.getElementById("pcAdminCreditoQtd").value, 10);
      const motivo = document.getElementById("pcAdminCreditoMotivo").value.trim();
      const status = document.getElementById("pcAdminCreditoStatus");
      if (!email || !qtd) { status.textContent = "Preencha e-mail e quantidade (diferente de zero)."; return; }
      e.target.disabled = true;
      const r = await adminConcederCreditosPorEmail(email, qtd, motivo);
      e.target.disabled = false;
      pcState.adminCreditoStatus = r.ok
        ? `Feito: ${r.aplicado >= 0 ? "+" : ""}${r.aplicado} pra ${r.nome} — novo saldo ${r.novoSaldo}.`
        : `Não deu: ${r.mensagem}`;
      renderAdminPainel();
    });
  }
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
    <button class="pc-mini-btn" id="pcBtnVoltarUsuarioFinal" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
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
    <div id="pcFarolBloco"></div>
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
  atualizarFarol();
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
  let listas;
  if (pcState.perfil) {
    const salvamentos = await carregarSalvamentosDe(pcState.perfil.id);
    listas = salvamentos.filter((s) => s.estado === pcState.estado).map((s) => ({
      id: s.id, nome: s.nome, criadoEm: s.criado_em, atualizadoEm: s.criado_em,
      depositadoEm: s.depositado_em, anonimo: !!s.anonimo, codigo: s.codigo || null,
      edicoes: s.edicoes || 0, editadaEm: s.editada_em || null,
    }));
  } else {
    listas = await carregarListasSalvasLocais(pcState.estado);
  }
  // Alimenta o passo "Depositar" do Farol de Orientação de carona — toda
  // tela que lista salvamentos já passa por aqui, então a flag se corrige
  // sozinha depois de qualquer depósito.
  pcState.farolTemDeposito = listas.some((l) => l.depositadoEm);
  return listas;
}

// Cartão-desafio "Meu palpite" (PNG de DIVULGAÇÃO, 3 cargos juntos) —
// identidade Fader 2.0, conceito convite/desafio. Protótipo aprovado pelo
// usuário em 18-19/08/2026 (artifact "Cartão-desafio — versão final",
// várias rodadas: direção C "console ao vivo", sem a palavra "aposta",
// 3 consoles na mesma proporção, etiqueta de cargo compacta): frase
// "Quem acerta mais?", console por cargo com 3 nomes (2 nítidos + 1 com
// blur de teaser; no Senador o 3º é o primeiro DE FORA, sem selo ELEITO,
// já que só 2 vagas estão em disputa em 2026), votação dentro das barras,
// CTA único verde "Agora é a sua vez" + código de convite.
// cargosCompletos (opcional) = mapa cargoId → lista completa do palpite;
// alimenta o % (fração do total de votos do cargo), o 1º de fora do
// Senador e o "+ N nomes na lista completa".

// Uma linha de candidato (chip ELEITO + nome + % à direita, barra-fader
// com votos dentro e alça de metal). Desenha em (rx,ry,rw) no ctx dado
// (pode ser um canvas offscreen, pro blur do teaser) e devolve a altura.
function _cartaoDesafioLinha(ctx, r, rx, ry, rw) {
  let xCursor = rx;
  if (r.chip) {
    ctx.font = "800 17px Inter, sans-serif";
    const wt = ctx.measureText("ELEITO").width;
    const chipW = wt + 20;
    ctx.fillStyle = "#34E84A";
    ctx.beginPath(); ctx.roundRect(rx, ry + 2, chipW, 27, 7); ctx.fill();
    ctx.fillStyle = "#07230C"; ctx.textAlign = "left";
    ctx.fillText("ELEITO", rx + 10, ry + 22);
    xCursor = rx + chipW + 14;
  }
  let pctW = 0;
  if (r.pct) {
    ctx.font = "700 20px Inter, sans-serif";
    const wPc = ctx.measureText("%").width;
    ctx.font = "800 32px Inter, sans-serif";
    const wNum = ctx.measureText(r.pct).width;
    ctx.textAlign = "right"; ctx.fillStyle = "#F2F4F5";
    ctx.fillText(r.pct, rx + rw - wPc - 3, ry + 26);
    ctx.textAlign = "left"; ctx.fillStyle = "#AEB5BB"; ctx.font = "700 20px Inter, sans-serif";
    ctx.fillText("%", rx + rw - wPc, ry + 26);
    pctW = wNum + wPc + 16;
  }
  ctx.textAlign = "left"; ctx.fillStyle = "#F2F4F5"; ctx.font = "700 28px Inter, sans-serif";
  const maxW = rx + rw - pctW - xCursor;
  let nome = r.nome;
  while (nome.length > 3 && ctx.measureText(nome === r.nome ? nome : nome + "…").width > maxW) nome = nome.slice(0, -1);
  if (nome !== r.nome) nome += "…";
  ctx.fillText(nome, xCursor, ry + 26);

  const by = ry + 42, bh = 30;
  ctx.fillStyle = "#0C0E10";
  ctx.beginPath(); ctx.roundRect(rx, by, rw, bh, 15); ctx.fill();
  ctx.strokeStyle = "#23262A"; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(rx, by, rw, bh, 15); ctx.clip();
  ctx.fillStyle = "rgba(138,144,150,.2)";
  for (let i = 1; i <= 9; i++) ctx.fillRect(rx + (rw * i) / 10, by, 1.5, bh);
  const fw = Math.max(rw * 0.14, rw * (r.frac || 0));
  const grad = ctx.createLinearGradient(rx, 0, rx + fw, 0);
  grad.addColorStop(0, "rgba(42,46,50,.85)"); grad.addColorStop(1, "rgba(60,65,70,.97)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(rx, by, fw, bh, [15, 0, 0, 15]); ctx.fill();
  const tVotos = (Number(r.votos) || 0).toLocaleString("pt-BR") + " votos";
  ctx.font = "700 17px Inter, sans-serif";
  const wV = ctx.measureText(tVotos).width;
  if (fw > wV + 30) {
    ctx.textAlign = "right"; ctx.fillStyle = "#F2F4F5";
    ctx.fillText(tVotos, rx + fw - 14, by + 21);
  }
  ctx.restore();
  if (fw <= wV + 30) {
    ctx.textAlign = "left"; ctx.fillStyle = "#8A9096"; ctx.font = "700 17px Inter, sans-serif";
    ctx.fillText(tVotos, rx + fw + 26, by + 21);
  }
  const cx = rx + fw;
  ctx.fillStyle = "rgba(10,12,14,.5)";
  ctx.beginPath(); ctx.roundRect(cx - 14, by - 11, 28, 52, 12); ctx.fill();
  const metal = ctx.createLinearGradient(0, by - 8, 0, by - 8 + 46);
  metal.addColorStop(0, "#5B6168"); metal.addColorStop(0.6, "#3A3F45"); metal.addColorStop(1, "#2A2E33");
  ctx.fillStyle = metal;
  ctx.beginPath(); ctx.roundRect(cx - 11, by - 8, 22, 46, 9); ctx.fill();
  ctx.strokeStyle = "rgba(242,244,245,.25)"; ctx.lineWidth = 1.5; ctx.stroke();
  return 72;
}

// Um console de cargo (material #2C3239/#4D545C, pílula do rótulo, N
// linhas — as com r.blur passam por um canvas offscreen com ctx.filter
// blur, mesmo truque do teaser antigo). Devolve o Y de baixo do console.
function _cartaoDesafioConsole(ctx, { rotulo, rows }, x, y, w) {
  const padIn = 28, pillH = 34, rowAlt = 72, gapRow = 26;
  const h = padIn + pillH + 16 + rows.length * rowAlt + (rows.length - 1) * gapRow + 26;
  ctx.fillStyle = "#2C3239";
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 32); ctx.fill();
  ctx.strokeStyle = "#4D545C"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = "800 20px Inter, sans-serif";
  const rot = rotulo.toUpperCase();
  const pw = ctx.measureText(rot).width + 40;
  ctx.fillStyle = "rgba(232,236,239,.35)";
  ctx.beginPath(); ctx.roundRect(x + padIn, y + padIn, pw, pillH, 10); ctx.fill();
  ctx.strokeStyle = "rgba(242,244,245,.4)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#F2F4F5"; ctx.textAlign = "left";
  ctx.fillText(rot, x + padIn + 20, y + padIn + 24);
  let ry = y + padIn + pillH + 16;
  const rx = x + padIn, rw = w - padIn * 2;
  rows.forEach((r) => {
    if (r.blur) {
      const off = document.createElement("canvas");
      off.width = rw + 44; off.height = rowAlt + 24;
      const octx = off.getContext("2d");
      octx.filter = "blur(7px)";
      _cartaoDesafioLinha(octx, r, 22, 11, rw);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(off, rx - 22, ry - 11);
      ctx.globalAlpha = 1;
    } else {
      _cartaoDesafioLinha(ctx, r, rx, ry, rw);
    }
    ry += rowAlt + gapRow;
  });
  return y + h;
}

function gerarImagemCedulaResumo({ nomeExibido, cargosEleitos, codigo, cargosCompletos }) {
  const W = 1080, H = 1920, PAD = 60;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const fundo = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, 1500);
  fundo.addColorStop(0, "#1B1E22"); fundo.addColorStop(0.52, "#101214"); fundo.addColorStop(1, "#0C0E10");
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);

  // Wordmark SimulaLEGIS (decisão 20/08/2026): "Simula" verde vivo +
  // "LEGIS" branco — mesma marca do cabeçalho do fluxo de acesso.
  ctx.font = "800 40px Inter, sans-serif";
  const wSim = ctx.measureText("Simula").width, wLeg = ctx.measureText("LEGIS").width;
  const xm = W / 2 - (wSim + wLeg) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#34E84A"; ctx.fillText("Simula", xm, 112);
  ctx.fillStyle = "#F2F4F5"; ctx.fillText("LEGIS", xm + wSim, 112);

  ctx.textAlign = "center";
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 48px Inter, sans-serif";
  ctx.fillText("Eu já cravei os meus eleitos.", W / 2, 208);
  ctx.fillStyle = "#34E84A";
  ctx.fillText("Quem acerta mais?", W / 2, 268);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 29px Inter, sans-serif";
  const nomeEstado = (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome || pcState.estado;
  ctx.fillText(`${nomeExibido} · ${nomeEstado} · Eleições 2026`, W / 2, 320);

  // Denominador do % = a MESMA régua única do app (DESIGN.md/PROJETO §8.2):
  // fração de T = k·E (votos válidos projetados do cargo, × votos por
  // eleitor no Senado) — nunca a soma do palpite, que faria o líder de um
  // cargo pouco preenchido mostrar 100%.
  const tetoCargo = (cid) => {
    if (cid === "senador") {
      const E = pcState.estado === "SC"
        ? REF_2022.validos * fatorCrescimentoEleitorado()
        : totalValidosProjetado2026("senador");
      return E * (typeof VAGAS_SENADOR_2026 !== "undefined" ? VAGAS_SENADOR_2026 : 2);
    }
    return totalValidosProjetado2026(cid);
  };
  const fmtPct = (votos, total) => {
    if (!total) return "";
    const v = (votos / total) * 100;
    if (v >= 10) return String(Math.round(v));
    const s = v.toFixed(1).replace(".", ",");
    return s.endsWith(",0") ? s.slice(0, -2) : s;
  };

  const secoes = [];
  let eleitosExibidos = 0;
  CARGOS.forEach((cargoDef) => {
    const els = cargosEleitos[cargoDef.id] || [];
    if (!els.length) return;
    const total = tetoCargo(cargoDef.id);
    const rows = [];
    if (cargoDef.id === "senador") {
      els.slice(0, 2).forEach((c) => rows.push({ nome: c.nome, votos: c.votos, chip: true, blur: false }));
      eleitosExibidos += Math.min(2, els.length);
      const fora = cargosCompletos && cargosCompletos.senador && cargosCompletos.senador.length
        ? proximosSuplentes(1, cargosCompletos.senador)[0] : null;
      if (fora) rows.push({ nome: fora.nome, votos: fora.votos, chip: false, blur: true });
    } else {
      els.slice(0, 3).forEach((c, i) => rows.push({ nome: c.nome, votos: c.votos, chip: true, blur: i === 2 }));
      eleitosExibidos += Math.min(3, els.length);
    }
    const maxV = rows.reduce((m, r) => Math.max(m, Number(r.votos) || 0), 0) || 1;
    rows.forEach((r) => {
      r.pct = fmtPct(Number(r.votos) || 0, total);
      r.frac = ((Number(r.votos) || 0) / maxV) * 0.72;
    });
    secoes.push({ rotulo: cargoDef.label, rows });
  });

  let y = 356;
  secoes.forEach((sec) => {
    y = _cartaoDesafioConsole(ctx, sec, PAD, y, W - PAD * 2) + 24;
  });

  const totalEleitos = CARGOS.reduce((s, c) => s + ((cargosEleitos[c.id] || []).length), 0);
  const restantes = Math.max(0, totalEleitos - eleitosExibidos);
  if (restantes > 0) {
    ctx.textAlign = "center"; ctx.fillStyle = "#AEB5BB"; ctx.font = "400 22px Inter, sans-serif";
    ctx.fillText(`+ ${restantes} nomes na lista completa`, W / 2, y + 16);
  }

  const ctaH = 86, ctaY = H - 218;
  ctx.fillStyle = "#34E84A";
  ctx.beginPath(); ctx.roundRect(PAD, ctaY, W - PAD * 2, ctaH, ctaH / 2); ctx.fill();
  ctx.fillStyle = "#07230C"; ctx.font = "800 34px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Agora é a sua vez", W / 2, ctaY + 55);

  const t1 = "entre com o código ";
  ctx.font = "400 25px Inter, sans-serif";
  const w1 = ctx.measureText(t1).width;
  ctx.font = "800 25px Inter, sans-serif";
  const w2 = ctx.measureText(codigo).width;
  const xc = W / 2 - (w1 + w2) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#8A9096"; ctx.font = "400 25px Inter, sans-serif"; ctx.fillText(t1, xc, ctaY + ctaH + 46);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 25px Inter, sans-serif"; ctx.fillText(codigo, xc + w1, ctaY + ctaH + 46);

  ctx.textAlign = "center"; ctx.fillStyle = "#5C6268"; ctx.font = "400 21px Inter, sans-serif";
  ctx.fillText("Simulador Eleitoral · Legislativo 2026", W / 2, H - 54);

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
    <div id="pcModalCompartilharOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:340px; width:100%; background:rgba(29,32,35,.97); border:1px solid #2B2F33; border-radius:18px; padding:30px 20px; text-align:center;">
        <div style="color:var(--pc-ink-dim); font-size:13px; margin-bottom:16px;">Carregando…</div>
        <button class="ghost" id="pcBtnFecharCompartilhar" style="border:none; font-size:11.5px; color:var(--pc-ink-dim);">Cancelar</button>
      </div>
    </div>`;
  }
  const anonimo = lista.anonimo;
  const nomeExibido = anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || lista.nome);
  return `
    <div id="pcModalCompartilharOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:340px; width:100%; max-height:90vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("chave", 14)} CÉDULA DEPOSITADA</div>
        <h2 style="margin-bottom:4px; font-size:15px;">Compartilhar "${lista.nome}"</h2>
        <div style="font-size:12px; color:var(--pc-ink-dim); margin-bottom:16px; line-height:1.5;">Esse código é único dessa cédula — qualquer pessoa pode usá-lo pra conferir sua posição no ranking.</div>
        ${anonimo ? `<div style="font-size:11px; color:var(--pc-ink-dim); background:#101214; border:1px solid #23262A; border-radius:8px; padding:9px 11px; margin-bottom:16px; line-height:1.5; display:flex; gap:8px; align-items:flex-start;">${iconeSvg("chave", 13)}<span>Essa lista foi depositada de forma anônima — seu nome não aparece na imagem nem em nenhum link gerado aqui.</span></div>` : ""}
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#101214; border:1px solid #23262A; border-radius:10px; padding:10px 12px; margin-bottom:16px;">
          <span style="font-family:var(--mono); font-size:15px; font-weight:700; letter-spacing:.06em; color:var(--pc-ink);">${lista.codigo}</span>
          <button class="ghost" id="pcBtnCopiarCodigoCedula" style="padding:5px 10px; font-size:11px; display:flex; align-items:center; gap:4px;">${iconeSvg("copiar", 12)}COPIAR</button>
        </div>
        <div style="width:150px; aspect-ratio:9/16; margin:0 auto 16px; border-radius:14px; overflow:hidden; border:1px solid #23262A; display:flex; align-items:center; justify-content:center; background:#101214;">
          ${d.imagemUrl ? `<img src="${d.imagemUrl}" alt="Prévia da imagem compartilhável" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:11px; color:var(--pc-ink-dim);">Gerando…</span>`}
        </div>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <button class="ghost" id="pcBtnShareWhatsapp" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("send", 14)}WhatsApp</button>
          <button class="ghost" id="pcBtnShareInstagram" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("compartilhar", 14)}Instagram</button>
        </div>
        <button class="ghost" id="pcBtnBaixarImagemCedula" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("baixar", 14)}Baixar imagem</button>
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
      <div class="pc-sub" style="margin:0 0 14px 2px; display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}Depositada em ${lista ? new Date(lista.depositadoEm).toLocaleDateString("pt-BR") : ""}${lista && lista.editadaEm ? ` · <span style="color:var(--pc-warning);">editada em ${new Date(lista.editadaEm).toLocaleDateString("pt-BR")} (${lista.edicoes}ª)</span>` : ""} · travada.</div>
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
  // Economia v3 §3: 2 rascunhos (listas em aberto) grátis — depositadas
  // não contam aqui, têm limite próprio (1 grátis, ver o gate do depósito).
  const jaTemLista = listas.filter((l) => !l.depositadoEm).length >= 2;

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
      <div class="pc-mini-card-icone" style="background:rgba(198,230,42,.12); color:var(--pc-warning);">${iconeSvg("chave", 16)}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Depositada em ${new Date(l.depositadoEm).toLocaleDateString("pt-BR")}${l.anonimo ? " · anônima" : ""}${l.codigo ? ` · <span style="font-family:var(--mono);">${l.codigo}</span>` : ""}${l.editadaEm ? ` · <span style="color:var(--pc-warning);">editada em ${new Date(l.editadaEm).toLocaleDateString("pt-BR")}</span>` : ""}</div>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        ${pcState.perfil ? (l.edicoes < 3
          ? `<button class="ghost" data-pc-editar-depositada="${l.id}" title="${l.edicoes + 1}ª edição de 3 — a cédula fica com a marca de editada" style="padding:8px 10px; font-size:12px;">Editar · ${[20, 35, 50][l.edicoes]}c</button>`
          : `<button class="ghost" disabled title="Limite de 3 edições — pra mudar de novo, deposite uma nova cédula (70 créditos)" style="padding:8px 10px; font-size:12px; opacity:.4;">3/3</button>`) : ""}
        ${l.codigo ? `<button class="ghost" data-pc-compartilhar-lista="${l.id}" style="padding:8px 10px; font-size:12px; display:flex; align-items:center; gap:5px;">${iconeSvg("compartilhar", 13)}<span class="pc-btn-label">Compartilhar</span></button>` : ""}
        <button class="ghost" data-pc-ver-lista="${l.id}" style="padding:8px 14px; font-size:12px;">Ver</button>
      </div>
    </div>`;

  const listaModal = pcState.modalDepositarListaId ? listas.find((l) => l.id === pcState.modalDepositarListaId) : null;

  el.innerHTML = `
    <div id="pcFarolBloco"></div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
      <div style="font-size:20px; font-weight:700; margin-left:2px;">Minhas listas</div>
      <button class="pc-lobby-icon-btn" id="pcBtnNovaLista" title="Nova lista">${iconeSvg("mais", 16)}</button>
    </div>
    <div class="pc-sub" style="margin:4px 0 16px 2px;">Listas em aberto podem ser editadas à vontade. Depositadas ficam travadas.</div>
    ${pcState.avisoEdicaoStatus ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Edição de cédula</div>
      <div class="pc-aviso-corpo">${pcState.avisoEdicaoStatus}</div>
    </div>` : ""}
    ${pcState.avisoLimiteCedulaAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Sua cédula oficial já está na urna</div>
      <div class="pc-aviso-corpo">Cada conta deposita <b>1 cédula grátis</b> — é ela que vale no ranking. Depositar uma segunda (cenário paralelo) custa <b>70 créditos</b>.<br><br>Créditos vêm de convites: cada amigo que entra e deposita a primeira cédula rende <b>10</b> (Menu → Convidar amigos).</div>
    </div>` : ""}
    ${pcState.avisoLimiteListaAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Você chegou no limite grátis</div>
      <div class="pc-aviso-corpo">Sua conta tem espaço grátis pra <b>2 listas em aberto</b> — e as duas já estão em uso. Criar mais uma custa <b>1 crédito</b>.<br><br>O jeito grátis de ganhar créditos: <b>convide um amigo</b> — quando ele criar conta e depositar a primeira cédula, você ganha <b>10 créditos</b> (Menu → Convidar amigos).</div>
    </div>` : ""}
    ${abertas.length ? `<div class="pc-lobby-menu-tit">Em aberto</div>${abertas.map(linhaAberta).join("")}` : ""}
    ${depositadas.length ? `<div class="pc-lobby-menu-tit" style="margin-top:${abertas.length ? "18px" : "0"};">Depositadas</div>${depositadas.map(linhaDepositada).join("")}` : ""}
    ${!listas.length ? estadoVazio({ icone: "lista", titulo: "Nenhuma lista ainda", texto: "Monte sua primeira previsão e ela aparece aqui.", botaoLabel: "Criar minha lista", botaoId: "pcBtnEstadoVazioNovaLista" }) : ""}
    ${listaModal ? `
    <div id="pcModalDepositarOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
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

  atualizarFarol();
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
    persistirListaAtivaLocal();
    if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
    else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
  });
  if (document.getElementById("pcBtnEstadoVazioNovaLista")) {
    document.getElementById("pcBtnEstadoVazioNovaLista").addEventListener("click", () => {
      document.getElementById("pcBtnNovaLista").click();
    });
  }
  // Carrega uma lista (aberta OU depositada já paga) no editor — corpo
  // compartilhado entre "Editar" das abertas e a edição paga das
  // depositadas (economia v3 §6).
  const abrirListaParaEdicao = async (lista) => {
      pcState.listaSalvaId = lista.id;
      pcState.listaSalvaNome = lista.nome;
      persistirListaAtivaLocal();
      if (pcState.perfil) {
        const completo = await carregarSalvamentoCompleto(id);
        if (!completo) return;
        pcState.palpitesPorCargo = completo.cargos;
      } else {
        pcState.palpitesPorCargo = lista.palpitesPorCargo;
      }
      // Mesma poda de grupos fantasma aplicada aos rascunhos (ver
      // podarGruposForaDoPool) — uma lista salva ANTES de uma correção de
      // dados pode carregar um grupo que não existe mais no pool oficial.
      if (pcState.palpitesPorCargo) {
        CARGOS.forEach((c) => {
          if (pcState.palpitesPorCargo[c.id]) {
            const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
            pcState.palpitesPorCargo[c.id] = podarGruposForaDoPool(pcState.palpitesPorCargo[c.id], poolOficial);
          }
        });
      }
      pcState.palpiteEdicao = pcState.palpitesPorCargo ? pcState.palpitesPorCargo[pcState.cargoAtivo] : null;
      if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
      else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  };
  document.querySelectorAll("[data-pc-editar-lista]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lista = listas.find((l) => l.id === btn.getAttribute("data-pc-editar-lista"));
      if (lista) await abrirListaParaEdicao(lista);
    });
  });
  // Edição PAGA de cédula depositada: cobra no servidor (20/35/50
  // progressivo, migração 25) e só então abre no editor. Limite de 3 e
  // "sem saldo" viram mensagem no card da lista.
  document.querySelectorAll("[data-pc-editar-depositada]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lista = listas.find((l) => l.id === btn.getAttribute("data-pc-editar-depositada"));
      if (!lista || !pcState.perfil) return;
      btn.disabled = true;
      const r = await editarCedulaDepositada(lista.id);
      if (r.semSaldo) {
        pcState.avisoEdicaoStatus = "Saldo insuficiente pra essa edição — convide amigos: cada convite convertido rende 10 créditos.";
        renderMinhasListas();
        return;
      }
      if (r.erro) {
        pcState.avisoEdicaoStatus = r.erro;
        renderMinhasListas();
        return;
      }
      pcState.avisoEdicaoStatus = "";
      await abrirListaParaEdicao(lista);
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
        // Economia v3 §3/§6: a 1ª cédula depositada é grátis; a partir da
        // 2ª é "nova cédula" (cenário paralelo) — 70 créditos. Cobra ANTES
        // de depositar; sem saldo, avisa e não deposita nada.
        const jaDepositou = listas.some((l) => l.depositadoEm && l.id !== listaModal.id);
        if (jaDepositou) {
          const { gastou, error: erroGasto } = await gastarCreditosConta(pcState.perfil.id, 70, "gasto_cedula", "nova cédula depositada");
          if (erroGasto) { pcState.erro = "Erro ao conferir crédito: " + erroGasto.message; }
          if (!gastou) {
            pcState.modalDepositarListaId = null;
            pcState.avisoLimiteCedulaAberto = true;
            renderMinhasListas();
            return;
          }
          pcState.avisoLimiteCedulaAberto = false;
        }
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
  // Peça ÚNICA de compartilhamento desde 19/08/2026: o cartão-desafio
  // (gerarImagemCedulaResumo, 3 cargos juntos). O cartão de cargo único
  // (gerarImagemCedula) foi aposentado na mesma data — decisão do usuário,
  // uma peça só de divulgação, uma identidade só. Código no histórico git.
  const completo = pcState.perfil ? await carregarSalvamentoCompleto(id) : null;
  const cargosEleitos = {};
  CARGOS.forEach((cargoDef) => {
    const listaCargo = completo && completo.cargos ? completo.cargos[cargoDef.id] : null;
    cargosEleitos[cargoDef.id] = listaCargo && listaCargo.length ? classificarEleitosPorPartido(listaCargo, cargoDef.id) : [];
  });
  const nomeExibido = lista.anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || lista.nome);
  const temEleitos = CARGOS.some((c) => cargosEleitos[c.id].length);
  const cargosCompletos = completo && completo.cargos ? completo.cargos : null;
  const imagemUrl = temEleitos && lista.codigo
    ? gerarImagemCedulaResumo({ nomeExibido, cargosEleitos, codigo: lista.codigo, cargosCompletos }).toDataURL("image/png")
    : null;
  pcState.dadosCompartilhar = { carregando: false, lista, cargosEleitos, imagemUrl, cargosCompletos };
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
    <div id="pcFarolBloco"></div>
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Grupos</div>
    ${pcState.perfil && pcState.perfil.codigo_convite ? `
    <div class="pc-lobby-banner" style="margin-bottom:16px;">
      <div class="pc-lobby-banner-eyebrow">Convide e ganhe</div>
      <div class="pc-lobby-banner-titulo">Seu link pessoal de convite</div>
      <div class="pc-lobby-banner-corpo">Cada amigo que entrar pelo seu link e depositar a primeira cédula rende <b>10 créditos</b> pra você (até 5 por dia).</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="pc-lobby-banner-btn" id="pcBtnCopiarConvite">${iconeSvg("copiar", 13)} Copiar link</button>
        <button class="pc-lobby-banner-btn" id="pcBtnZapConvite" style="background:none; border:1px solid #4D545C; color:var(--pc-ink);">${iconeSvg("send", 13)} WhatsApp</button>
      </div>
      <div class="pc-status" id="pcConviteStatus" style="margin-top:6px; min-height:12px;"></div>
    </div>` : ""}
    ${pcState.avisoLimiteGrupoAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Você chegou no limite grátis</div>
      <div class="pc-aviso-corpo">Sua conta tem espaço grátis pra <b>1 grupo criado</b>. Abrir outro custa <b>10 créditos</b> — exatamente o que <b>1 convite convertido</b> rende: convide um amigo, ele deposita a primeira cédula, e o próximo grupo sai de graça (Menu → Convidar amigos).</div>
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
      // Economia v3 §2.5: abrir grupo além do 1º custa 10 créditos (o
      // valor de 1 convite convertido — a promoção que virou regra).
      const { gastou, error } = await gastarCreditosConta(pcState.perfil.id, 10, "gasto", "abrir grupo");
      if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
      if (!gastou) {
        pcState.avisoLimiteGrupoAberto = true;
        renderGrupoHub();
        return;
      }
      pcState.avisoLimiteGrupoAberto = false;
    }
    pcState.telaGrupo = "criar";
    renderGrupoCriar();
  });
  atualizarFarol();
  document.getElementById("pcBtnEntrarGrupo").addEventListener("click", () => { pcState.telaGrupo = "entrar"; renderGrupoEntrar(); });
  const btnCopiarConvite = document.getElementById("pcBtnCopiarConvite");
  if (btnCopiarConvite) {
    const linkConvite = window.location.origin + window.location.pathname + "?conv=" + pcState.perfil.codigo_convite;
    const textoConvite = `Eu já cravei os meus eleitos de 2026 no SIMULALEGIS. Quem acerta mais? Entra pelo meu link: ${linkConvite}`;
    btnCopiarConvite.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(linkConvite);
        const s = document.getElementById("pcConviteStatus");
        if (s) s.textContent = "Link copiado.";
      } catch (err) { /* clipboard indisponível */ }
    });
    document.getElementById("pcBtnZapConvite").addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(textoConvite)}`, "_blank");
    });
  }
  document.querySelectorAll("[data-pc-abrir-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.grupoAtivo = pcState.meusGrupos.find((g) => g.id === btn.getAttribute("data-pc-abrir-grupo"));
      pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
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
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
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
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
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
  // Vagas (economia v3 §3.1/§5): capacidade vem do grupo (migração 22,
  // default 5 se o banco ainda não tiver a coluna); contagem de membros
  // pode falhar por policy — aí mostra só a capacidade.
  const capacidade = pcState.grupoAtivo.capacidade || 5;
  if (pcState.grupoMembrosTotal === undefined) {
    pcState.grupoMembrosTotal = await contarMembrosGrupo(pcState.grupoAtivo.id);
  }
  const souDono = pcState.perfil && pcState.grupoAtivo.criado_por === pcState.perfil.id;
  const ehVip = capacidade > 5;
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
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:7px;">
          Vagas: <b style="color:var(--pc-ink); font-variant-numeric:tabular-nums;">${pcState.grupoMembrosTotal !== null && pcState.grupoMembrosTotal !== undefined ? `${pcState.grupoMembrosTotal}/${capacidade}` : capacidade}</b>
          ${ehVip ? `<span style="font-size:8.5px; font-weight:800; letter-spacing:.06em; background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4); color:var(--pc-ink); border-radius:5px; padding:2px 7px;">VIP · entrada livre pra convidados</span>` : ""}
        </span>
      </div>
      ${souDono && capacidade < 30 ? `
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:8px;">
        <span style="font-size:11px; color:var(--pc-ink-dim);">Amplie o grupo — quem entra pelo seu código nunca paga nada:</span>
        <div style="display:flex; gap:8px;">
          <button class="ghost" id="pcBtnVaga1" style="flex:1; font-size:12px; padding:9px;">+1 vaga · 10 créditos</button>
          <button class="ghost" id="pcBtnVaga5" style="flex:1; font-size:12px; padding:9px;" ${capacidade + 5 > 30 ? "disabled" : ""}>+5 vagas · 50 créditos</button>
        </div>
        <div class="pc-status" id="pcVagasStatus" style="min-height:12px;">${pcState.grupoVagasStatus || ""}</div>
      </div>` : ""}
      ${souDono && capacidade >= 30 ? `<div class="pc-lobby-linha"><span style="font-size:11px; color:var(--pc-ink-dim);">Teto de 30 pessoas atingido — grupos maiores são pra contas institucionais (fale com a gente).</span></div>` : ""}
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

  const btnVaga1 = document.getElementById("pcBtnVaga1");
  const btnVaga5 = document.getElementById("pcBtnVaga5");
  const comprarVagas = async (n, btn) => {
    btn.disabled = true;
    const r = await ampliarCapacidadeGrupo(pcState.grupoAtivo.id, n);
    if (r.semSaldo) {
      pcState.grupoVagasStatus = `Saldo insuficiente (precisa de ${n * 10} créditos) — convide amigos: cada convite convertido rende 10.`;
    } else if (r.erro) {
      pcState.grupoVagasStatus = "Não deu: " + r.erro;
    } else {
      pcState.grupoAtivo = { ...pcState.grupoAtivo, capacidade: r.capacidade };
      pcState.meusGrupos = pcState.meusGrupos.map((g) => g.id === pcState.grupoAtivo.id ? pcState.grupoAtivo : g);
      pcState.grupoVagasStatus = `Feito — o grupo agora tem ${r.capacidade} vagas.`;
    }
    renderGrupoMembro();
  };
  if (btnVaga1) btnVaga1.addEventListener("click", (e) => comprarVagas(1, e.target));
  if (btnVaga5) btnVaga5.addEventListener("click", (e) => comprarVagas(5, e.target));
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => {
    pcState.grupoAtivo = null;
    pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
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
      pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = ""; // força recarregar — a view grupo_comparacao muda com a escolha
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
  // Ícone no mesmo círculo dos botões do console (18/08/2026) — antes
  // era um gradiente verde-neon fixo, agora usa a variável de tema (fica
  // verde vivo #34E84A onde o tema Fader está ativo, sem herdar cor
  // nenhuma fora dele).
  return `<div class="glass-card pc-carregando-card" style="max-width:420px; margin:0 auto; min-height:50vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
    <div class="pc-loading-icon pc-carregando-icone">
      ${iconeSvg("ballot", 26)}
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
  if (pcState.cargoAtivo === "senador") {
    autoPreenchimentoSenador();
    renderCargoEstadual();
    return;
  }
  if (!partido) {
    // Abas de deputado no modelo fader: distribuição realista + normalização
    // pra fechar a barra em 100% (gate do Avançar).
    autoPreenchimentoDeputadosFader(totalValidosProjetado2026());
    renderCargoEstadual();
    return;
  }
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
    p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todos.push(c));
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

// Itens achatados do cargo (TODOS os candidatos reais, sem filtro de
// busca) — o índice deste array é o data-sen-idx dos cards e a ordem do
// vetor `base` da alça mestra. Reconstruído a cada render.
let _senItens = [];
let _senDragIdx = null, _senTimer = null, _senEditAberto = false, _senMasterAtivo = false;

function montarItensSenador() {
  _senItens = [];
  pcState.palpiteEdicao.forEach((p) => {
    p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => {
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
  const E = pcState.estado === "SC" && typeof REF_2022 !== "undefined"
    ? REF_2022.validos * fatorCrescimentoEleitorado()
    : totalValidosProjetado2026("senador");
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
  const temAptos = pcState.estado === "SC";
  const aptos = temAptos ? ELEITORADO_2026 : null;
  const compar = temAptos ? Math.round(REF_2022.comparecimento * fator) : null;
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
    const pct = E > 0 ? (Number(c.votos) || 0) / (E * 2) * 100 : 0;
    const linkInsta = linkInstagramDe(c.chave);
    const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 14)}</a>` : "";
    const lapisAdmin = pcState.souAdmin ? ` <button type="button" class="pc-mini-btn pc-mini-btn-sm" data-pc-editar-instagram="${c.chave}" data-pc-editar-instagram-nome="${escaparAtributoHtml(nomeExibicao(c))}" title="${linkInsta ? "Editar" : "Adicionar"} link do Instagram">${iconeSvg("editar", 11)}</button>` : "";
    return `
    <div class="pc-sen-card${eleito ? " eleito" : ""}" data-sen-idx="${it.idx}">
      <div class="pc-sen-l1">
        ${eleito ? '<span class="pc-sen-chip">ELEITO</span>' : ""}
        <span class="pc-sen-nm">${nomeExibicao(c)}${instaDepois}${lapisAdmin}</span>
        <span class="pc-sen-pct">${pct.toFixed(0)}<small>%</small></span>
      </div>
      <div class="pc-sen-sub">${posRanking}º · ${nomePartidoExibicao(it.partido)}${it.partidoOriginal && it.partidoOriginal !== it.partido ? ` (${it.partidoOriginal})` : ""}</div>
      ${c.fonte === "ficticio" ? `<div class="pc-dep-provisorio">candidato fictício — nome de preenchimento até a ata real sair</div>` : c.fonte === "rrc" ? `<div class="pc-dep-provisorio">registro oficial (TSE) — ata de convenção ainda não publicada</div>` : ""}
      <div class="pc-sen-slider" data-sen-idx="${it.idx}">
        <div class="pc-sen-bar"><div class="pc-sen-ticks"></div><div class="pc-sen-fill" style="width:${Math.min(100, pctBarra)}%"></div></div>
        <div class="pc-sen-votos"></div>
        <div class="pc-sen-grip" style="left:${Math.min(100, pctBarra)}%"></div>
      </div>
    </div>`;
  }).join("");
  const rodape = semAta.length
    ? `<div class="pc-sen-rod">Sem candidatura ao Senado: ${semAta.join(" · ")}</div>`
    : "";
  const dica = `<div class="pc-sen-dica">arraste a barra pra votar · toque no número pra digitar · alça de cima escala tudo</div>`;
  return cards ? cards + rodape + dica : "";
}

// Posiciona o rótulo de votos DENTRO do preenchimento (texto claro, junto
// à ponta) ou fora dele (na parte vazia) quando a fatia é estreita demais
// — depende da largura real da barra, por isso roda pós-render e a cada
// atualização de arrasto.
function posicionarVotosSenador(card, c) {
  const lbl = card.querySelector(".pc-sen-votos");
  const bar = card.querySelector(".pc-sen-bar");
  if (!lbl || !bar) return;
  const barW = bar.getBoundingClientRect().width || 300;
  const fill = card.querySelector(".pc-sen-fill");
  const fillPx = (parseFloat(fill.style.width) || 0) / 100 * barW;
  const txt = (Number(c.votos) || 0).toLocaleString("pt-BR") + " votos";
  lbl.textContent = txt;
  const txtPx = txt.length * 5.6 + 12;
  if (fillPx > txtPx + 20) {
    lbl.className = "pc-sen-votos dentro";
    lbl.style.left = "auto";
    lbl.style.right = (barW - fillPx + 15) + "px";
  } else {
    lbl.className = "pc-sen-votos fora";
    lbl.style.right = "auto";
    lbl.style.left = (fillPx + 15) + "px";
  }
}

function atualizarCardSenador(idx, E) {
  const card = document.querySelector('.pc-sen-card[data-sen-idx="' + idx + '"]');
  if (!card) return;
  const c = _senItens[idx].c;
  // Mesma dupla de réguas do render (ver renderListaSenador): barra sobre
  // E (curso do fader), número sobre 2E (régua do cabeçalho).
  const pctBarra = E > 0 ? (Number(c.votos) || 0) / E * 100 : 0;
  const pct = E > 0 ? (Number(c.votos) || 0) / (E * 2) * 100 : 0;
  card.querySelector(".pc-sen-pct").innerHTML = pct.toFixed(0) + "<small>%</small>";
  card.querySelector(".pc-sen-fill").style.width = Math.min(100, pctBarra) + "%";
  card.querySelector(".pc-sen-grip").style.left = Math.min(100, pctBarra) + "%";
  posicionarVotosSenador(card, c);
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
    if (_senItens[idx]) posicionarVotosSenador(card, _senItens[idx].c);
  });

  const inf = document.getElementById("pcSenInf");
  if (inf) inf.addEventListener("click", () => {
    pcState.funilVotosAberto = !pcState.funilVotosAberto;
    renderCargoEstadual();
  });

  const somaOutrosDe = (idx) => _senItens.reduce((s, it, i) => i === idx ? s : s + (Number(it.c.votos) || 0), 0);

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

let _depDragKey = null, _depTimer = null, _depEditAberto = false, _depMasterAtivo = false, _depEditProximo = null;

// Vagas apuradas por grupo com a votação ATUAL (mesma conta da Revisão:
// dhondtComCorte distribui QP e sobras numa passada). marcadoEleito de
// cada candidato = estar entre os N mais votados do próprio grupo.
function recalcularMarcadosDeputados() {
  // Saneamento: rascunhos salvos antes do arredondamento da trava podem
  // carregar voto fracionário — normaliza uma vez por passada (idempotente).
  pcState.palpiteEdicao.forEach((p) => p.candidatos.forEach((c) => {
    if (typeof c.votos === "number" && !Number.isInteger(c.votos)) c.votos = Math.round(c.votos);
  }));
  const totalVagas = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  const { counts } = dhondtComCorte(pcState.palpiteEdicao, totalVagas);
  pcState.palpiteEdicao.forEach((p, i) => {
    const reais = p.candidatos.filter((c) => c.fonte !== "legenda");
    const ordenados = [...reais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const chaves = new Set(ordenados.slice(0, counts[i]).filter((c) => (Number(c.votos) || 0) > 0).map((c) => c.chave));
    p.candidatos.forEach((c) => { c.marcadoEleito = chaves.has(c.chave); });
  });
}

function vagasApuradasPorGrupo() {
  const totalVagas = vagasFixasCargo(pcState.estado, pcState.cargoAtivo);
  return dhondtComCorte(pcState.palpiteEdicao, totalVagas).counts;
}

// Curso da BARRA do candidato (regra do usuário, 17/08/2026): régua fixa
// baseada no mais votado de 2022 do cargo — SC estadual = 250 mil redondos
// (200% da Ana Campagnolo, 196.571); SC federal = mais votado + 50%;
// demais estados = mais votado + 100%. É limite do DESENHO, não do voto:
// quem passar disso mostra o número verdadeiro com a barra cravada no fim.
function capCandidatoDeputado() {
  if (pcState.estado === "SC" && pcState.cargoAtivo === "estadual") return 250000;
  const todos = candidatosEstadoCargo(pcState.estado, pcState.cargoAtivo) || [];
  let maior = 0;
  todos.forEach((p) => p.candidatos.forEach((c) => {
    if (c.fonte === "legenda") return;
    const v = Number(c.votos) || 0;
    if (v > maior) maior = v;
  }));
  const mult = pcState.estado === "SC" && pcState.cargoAtivo === "federal" ? 1.5 : 2;
  return Math.max(50000, Math.round(maior * mult));
}

function somaVotosGrupo(p) {
  return p.candidatos.reduce((s, c) => s + (Number(c.votos) || 0), 0);
}
function somaVotosCargo() {
  return pcState.palpiteEdicao.reduce((s, p) => s + somaVotosGrupo(p), 0);
}

// Fader reutilizando as classes pc-sen-* (mesma família visual §8.2);
// "mini" reduz barra e alça pros candidatos aninhados.
function faderDepHtml(chaveDrag, v, cap, mini) {
  const pct = Math.min(100, cap > 0 ? v / cap * 100 : 0);
  return `
    <div class="pc-sen-slider${mini ? " pc-sen-slider-mini" : ""}" data-dep-fader="${escaparAtributoHtml(chaveDrag)}">
      <div class="pc-sen-bar"><div class="pc-sen-ticks"></div><div class="pc-sen-fill" style="width:${pct}%"></div></div>
      <div class="pc-sen-votos"></div>
      <div class="pc-sen-grip" style="left:${pct}%"></div>
    </div>`;
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
  const temAptos = pcState.estado === "SC" && typeof ELEITORADO_2026 !== "undefined";
  const funilLinha = (rotulo, valor, larg, tot) => `
    <div class="pc-sen-fu-row">
      <div class="pc-sen-fu-l"><span>${rotulo}</span><b${tot ? ' style="color:#34E84A;"' : ""}>${formatVotosCompacto(valor)}</b></div>
      <div class="pc-sen-fu-b${tot ? " tot" : ""}" style="width:${larg}%;"></div>
    </div>`;
  const botoes = renderBotoesComandos(comandos);
  return `
    <div class="pc-console">
      <div class="pc-sen-osub">
        <span class="pc-sen-lbl">Votos <button type="button" id="pcDepInf" class="pc-sen-inf${pcState.funilVotosAberto ? " aberto" : ""}">i</button></span>
        <span class="pc-sen-num"><b id="pcDepPct">${pct}%</b> · <span id="pcDepNom">${formatVotosCompacto(soma)} de ${formatVotosCompacto(Math.round(E))}</span></span>
      </div>
      ${pcState.funilVotosAberto ? `
      <div class="pc-sen-funil">
        <div class="pc-sen-fu-t">De onde vem o teto de <b>${formatVotosCompacto(Math.round(E))}</b>: projeção dos votos válidos de 2026 pro cargo, a partir do resultado real de 2022 (TSE) dos partidos modelados, escalada pelo crescimento do eleitorado.</div>
        ${temAptos ? funilLinha("Eleitores aptos 2026 (TSE)", ELEITORADO_2026, 100) : ""}
        ${temAptos ? funilLinha("Comparecem (taxa hist. 2022)", Math.round(REF_2022.comparecimento * fator), Math.round(REF_2022.comparecimento * fator / ELEITORADO_2026 * 100)) : ""}
        ${funilLinha("Votos válidos projetados", Math.round(E), temAptos ? Math.round(E / ELEITORADO_2026 * 100) : 100, true)}
        <div class="pc-sen-fu-src">Fonte: resultados oficiais TSE 2022 + evolução do eleitorado.</div>
      </div>` : ""}
      <div class="pc-sen-regua" style="background:repeating-linear-gradient(90deg, rgba(174,181,187,.55) 0 1px, transparent 1px ${(100 / totalVagas).toFixed(3)}%); background-size:100% 100%;"></div>
      <div class="pc-sen-zone" id="pcDepZone">
        <div class="pc-sen-trk">
          <div class="pc-sen-trkf" id="pcDepFill" style="width:${w}%"></div>
        </div>
        <div class="pc-sen-mgrip" id="pcDepMg" style="left:${w}%"></div>
      </div>
      <div class="pc-sen-escala"><span>0</span><span class="pc-meta-linha">vagas <b class="pc-meta-num${vagasIndTotal < totalVagas ? " pend" : ""}" id="pcDepVagasInd">${vagasIndTotal}</b>/${totalVagas}<span style="margin:0 12px;">·</span>QE <b class="pc-meta-num${qeAtualConsole < qeMetaConsole ? " pend" : ""}" id="pcDepQeAtual">${formatVotosCompacto(qeAtualConsole)}</b>/${formatVotosCompacto(qeMetaConsole)}</span><span>${formatVotosCompacto(Math.round(E))}</span></div>
      <div class="pc-console-cmds">
        <div class="pc-cmd-painel">
          ${botoes}
          <button type="button" id="pcCmdLegendaToggle" class="pc-cmd-info${pcState.legendaComandosAberta ? " aberto" : ""}" title="O que faz cada botão">i</button>
        </div>
      </div>
    </div>`;
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

// Barra fina do partido no formato do console: régua com um traço por vaga
// (verde passou / laranja em disputa / branco sem votos + pontinho laranja
// quando há votos pra vaga não somada no box), preenchimento verde com
// excedente em tom mais claro, alça-lâmina A1.3 com plaqueta de votos e
// placa fixa da meta embaixo. `course` = extensão total do trilho.
function barraPartidoDepHtml(gi, soma, meta, vagasInd, qeProj, course) {
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
  const metaLabelPos = Math.min(90, Math.max(10, metaPos));
  return `
    <div class="pc-dep-regua"><div class="pc-dep-regua-fina" style="background:repeating-linear-gradient(90deg, rgba(138,144,150,.18) 0 1px, transparent 1px ${finaPasso.toFixed(3)}%);"></div>${ticks}</div>
    <div class="pc-dep-zone" data-dep-fader="p|${gi}" data-course="${Math.round(course)}" data-meta="${Math.round(meta)}" data-qe="${Math.round(qeProj)}" data-vagas="${vagasInd}">
      <div class="pc-dep-trk">
        <div class="pc-dep-fill" style="width:${fillW}%; background-size:${fillW > 0 ? (10000 / fillW).toFixed(1) : "100"}% 100%;"></div>
        ${extraW > 0 ? `<div class="pc-dep-extra" style="left:${metaPos}%; width:${extraW}%"></div>` : ""}
      </div>
      ${meta > 0 ? `<span class="pc-dep-meta" style="left:${metaLabelPos}%">meta ${formatVotosCompacto(meta)}</span>` : ""}
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
function renderListaDeputadosFader(grupos, E, totalVagas) {
  const capCand = capCandidatoDeputado();
  const counts = vagasApuradasPorGrupo();
  const qeProj = quocienteEleitoral(Math.round(E), totalVagas) || 1;
  const qeAtual = quocienteEleitoral(somaVotosCargo(), totalVagas);
  const idxDe = new Map(pcState.palpiteEdicao.map((p, i) => [p, i]));
  // Ordem dos cards: mais ELEITOS INDICADOS no box primeiro; votos como
  // desempate (pedido do usuário em 17/08 — antes era só por votos).
  const vagasDe = (p) => p.semAta2026 ? -1 : vagasIndicadasDe(p, counts[idxDe.get(p)] || 0);
  const ordenados = [...grupos].sort((a, b) => vagasDe(b) - vagasDe(a) || somaVotosGrupo(b) - somaVotosGrupo(a));
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
    const course = Math.max(meta, soma, qeProj);
    const qpDireto = qeAtual ? Math.min(vg, Math.floor(soma / qeAtual)) : 0;
    const sobras = vg - qpDireto;
    const chaveAberto = "faderAberto_" + pcState.cargoAtivo + "_" + p.nome;
    const aberto = !!pcState.expandido[chaveAberto];
    const infoAberto = !!pcState.expandido["depInfo_" + pcState.cargoAtivo + "_" + p.nome];
    const avisoMais = vg > vagasInd;
    const candsOrd = [...reais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const cands = aberto ? candsOrd.map((c, k) => {
      const cv = Number(c.votos) || 0;
      const cpct = E > 0 ? cv / E * 100 : 0;
      const selo = c.marcadoEleito
        ? (k < qpDireto ? '<span class="pc-sen-chip">ELEITO</span>' : '<span class="pc-sen-chip sobra" title="Vaga conquistada na disputa de sobras (método das médias, art. 109)">SOBRA</span>')
        : (cv > 0 ? '<span class="pc-sen-chip fora" title="Tem votos, mas não fecha vaga com a votação de hoje">FORA</span>' : "");
      const linkInsta = linkInstagramDe(c.chave);
      // Ícone do Instagram MONOCROMÁTICO à DIREITA do nome (refino 20/08) —
      // só aparece pra quem tem link alimentado na planilha/admin.
      const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 16)}</a>` : "";
      const lapisAdmin = pcState.souAdmin ? ` <button type="button" class="pc-mini-btn pc-mini-btn-sm" data-pc-editar-instagram="${c.chave}" data-pc-editar-instagram-nome="${escaparAtributoHtml(nomeExibicao(c))}" title="${linkInsta ? "Editar" : "Adicionar"} link do Instagram">${iconeSvg("editar", 11)}</button>` : "";
      return `
      <div class="pc-dep-crow" data-dep-cand="${escaparAtributoHtml(c.chave)}">
        <div class="pc-dep-cl1">
          ${selo}
          <span class="pc-dep-cnm">${nomeExibicao(c)}${instaDepois}${lapisAdmin}</span>
          <span class="pc-dep-cpct">${cpct.toFixed(1).replace(".", ",")}<small>%</small></span>
        </div>
        ${c.fonte === "ficticio" ? `<div class="pc-dep-provisorio">candidato fictício — nome de preenchimento até a ata real sair</div>` : c.fonte === "rrc" ? `<div class="pc-dep-provisorio">registro oficial (TSE) — ata de convenção ainda não publicada</div>` : ""}
        ${Number(c.votos2022) > 0 ? `<div class="pc-dep-c2022">2022: ${Number(c.votos2022).toLocaleString("pt-BR")} votos${c.eleito2022 ? ` · eleito${c.partidoOrigem2022 ? " " + c.partidoOrigem2022 : ""}` : ""}</div>` : ""}
        ${faderDepHtml("c|" + gi + "|" + c.chave, cv, capCand, true)}
      </div>`;
    }).join("") : "";
    return `
    <div class="pc-dep-card" data-dep-idx="${gi}">
      <div class="pc-dep-l1" data-dep-toggle="${gi}">
        <span class="pc-dep-nm">${nomePartidoExibicao(p.nome)}</span>
        <div class="pc-dep-stepper" data-dep-stepper="${gi}">
          <button type="button" data-dep-vaga-menos="${gi}">−</button>
          <span data-dep-vaga-edit="${gi}" title="Toque pra digitar">${vagasInd}</span>
          <button type="button" data-dep-vaga-mais="${gi}">+</button>
        </div>
      </div>
      ${barraPartidoDepHtml(gi, soma, meta, vagasInd, qeProj, course)}
      <div class="pc-dep-notif">
        <span class="pc-dep-notif-txt">${notificacaoDep(soma, meta, vagasInd, qeProj)}</span>
        <button type="button" class="pc-dep-inf${infoAberto ? " aberto" : ""}" data-dep-info="${gi}" title="Detalhes do partido">i</button>
      </div>
      ${infoAberto ? `<div class="pc-dep-infopainel">${reais.length} candidato${reais.length === 1 ? "" : "s"} · QP ${qeAtual ? (soma / qeAtual).toFixed(1).replace(".", ",") : "0,0"} = ${qpDireto} por quociente${sobras > 0 ? ` + ${sobras} sobra${sobras === 1 ? "" : "s"}` : ""} pela apuração de agora.<br>Régua: <b style="color:rgba(52,232,74,.9);">verde</b> vaga com votação fechada · <b style="color:#FF9A2E;">laranja</b> em disputa · branco sem votos. Pontinho laranja em cima: há votos, mas a vaga não foi somada no box.</div>` : ""}
      ${aberto ? `<div class="pc-dep-subpainel">
        <button type="button" class="pc-cmd-acao${avisoMais ? " avisovg" : ""}" ${avisoMais ? `title="A matemática eleitoral dá a este partido ${vg} vaga${vg === 1 ? "" : "s"} — você indicou ${vagasInd}. Só um aviso, a decisão é sua."` : 'disabled style="opacity:.15;"'}>${iconeSvg("alerta", 12)}</button>
        <button type="button" class="pc-cmd-acao" data-pc-ver2022="${p.nome}" title="Nominata completa de 2022">${iconeSvg("lista22", 13)}</button>
        <button type="button" class="pc-cmd-acao" data-pc-reset="${p.nome}" title="Restaurar votação de 2022">${iconeSvg("relogio22", 13)}</button>
        <button type="button" class="pc-cmd-acao" data-pc-zerar="${p.nome}" title="Zerar votação do partido">${iconeSvg("borracha", 12)}</button>
        <button type="button" class="pc-cmd-acao" data-dep-magico="${gi}" title="Preencher só este partido automaticamente">${iconeSvg("completar", 13)}</button>
      </div>` : ""}
      ${aberto ? `<div class="pc-dep-cands">${cands || '<div class="pc-sen-rod">Nenhum candidato carregado neste grupo.</div>'}</div>` : ""}
      ${!aberto && candsOrd.length ? `<div class="pc-dep-preview">
        <div class="pc-dep-cl1">
          ${candsOrd[0].marcadoEleito ? '<span class="pc-sen-chip">ELEITO</span>' : ""}
          <span class="pc-dep-cnm">${nomeExibicao(candsOrd[0])}</span>
          <span class="pc-dep-cpct">${(E > 0 ? (Number(candsOrd[0].votos) || 0) / E * 100 : 0).toFixed(1).replace(".", ",")}<small>%</small></span>
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
  const reais = p.candidatos.filter((c) => c.fonte !== "legenda");
  let base = reais.map((c) => Number(c.votos) || 0);
  if (base.every((v) => v === 0)) base = reais.map((c) => Number(c.votos2022) || 1);
  const novos = fmdEscalarProporcional(base, alvo, capCand);
  reais.forEach((c, i) => { c.votos = novos[i]; });
}

function concluirGestoDeputados() {
  recalcularMarcadosDeputados();
  agendarAutoSaveRascunho(pcState.cargoAtivo, pcState.palpiteEdicao);
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

function atualizarFaderDep(sl, v, cap) {
  const pct = Math.min(100, cap > 0 ? v / cap * 100 : 0);
  sl.querySelector(".pc-sen-fill").style.width = pct + "%";
  sl.querySelector(".pc-sen-grip").style.left = pct + "%";
  posicionarVotosDep(sl, v, cap);
}

function posicionarVotosDep(sl, v, cap) {
  const lbl = sl.querySelector(".pc-sen-votos");
  const bar = sl.querySelector(".pc-sen-bar");
  if (!lbl || !bar) return;
  const barW = bar.getBoundingClientRect().width || 300;
  const fillPx = Math.min(100, cap > 0 ? v / cap * 100 : 0) / 100 * barW;
  const txt = (Number(v) || 0).toLocaleString("pt-BR") + " votos";
  lbl.textContent = txt;
  const txtPx = txt.length * 5.6 + 12;
  if (fillPx > txtPx + 20) {
    lbl.className = "pc-sen-votos dentro";
    lbl.style.left = "auto";
    lbl.style.right = (barW - fillPx + 15) + "px";
  } else {
    lbl.className = "pc-sen-votos fora";
    lbl.style.right = "auto";
    lbl.style.left = (fillPx + 15) + "px";
  }
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
      posicionarVotosDep(sl, Number(candidatoDe(gi, partes[2])?.votos) || 0, capCand);
      const lbl = sl.querySelector(".pc-sen-votos");
      lbl.style.pointerEvents = "auto";
      lbl.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
      lbl.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirEdicaoDep(sl, key);
      });
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
      if (ehPartido) {
        const p2 = pcState.palpiteEdicao[gi];
        const alvo = fmdTravaIndividual(Math.round(frac * base.course), E, E, base.outrosTotal);
        const reais = p2.candidatos.filter((c) => c.fonte !== "legenda");
        const novos = fmdEscalarProporcional(base.membros, alvo, capCand);
        reais.forEach((c, i) => { c.votos = novos[i]; });
        atualizarBarraPartidoDom(sl, somaVotosGrupo(p2));
        const card = sl.closest(".pc-dep-card");
        if (card) card.querySelectorAll('[data-dep-fader^="c|"]').forEach((s2) => {
          const k2 = s2.dataset.depFader.split("|");
          atualizarFaderDep(s2, Number(candidatoDe(+k2[1], k2[2])?.votos) || 0, capCand);
        });
      } else {
        const c = candidatoDe(gi, partes[2]);
        if (!c) return;
        c.votos = fmdTravaIndividual(Math.round(frac * capCand), capCand, E, base.outrosTotal);
        c.votosEditado = true;
        atualizarFaderDep(sl, Number(c.votos) || 0, capCand);
        const zoneP = document.querySelector('[data-dep-fader="p|' + gi + '"]');
        if (zoneP) atualizarBarraPartidoDom(zoneP, somaVotosGrupo(pcState.palpiteEdicao[gi]));
      }
      atualizarHeaderDeputados(E);
    };
    sl.addEventListener("pointerdown", (e) => {
      if (_depEditAberto) return;
      snapshotPalpite();
      if (ehPartido) {
        const p2 = pcState.palpiteEdicao[gi];
        let membros = p2.candidatos.filter((c) => c.fonte !== "legenda").map((c) => Number(c.votos) || 0);
        if (membros.every((vv) => vv === 0)) membros = p2.candidatos.filter((c) => c.fonte !== "legenda").map((c) => Number(c.votos2022) || 1);
        // Curso do GESTO: fixo do início ao fim do arrasto (curso elástico
        // no meio do gesto faria a alça fugir do dedo) — meta + 1 QE de
        // folga pra dar espaço de passar da meta sem soltar.
        const soma0 = somaVotosGrupo(p2);
        const meta0 = Number(sl.dataset.meta) || 0;
        const course = Math.max(meta0, soma0, qeProj) + qeProj;
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
    const p2 = pcState.palpiteEdicao[+h.dataset.depToggle];
    const chave = "faderAberto_" + pcState.cargoAtivo + "_" + p2.nome;
    pcState.expandido[chave] = !pcState.expandido[chave];
    renderCargoEstadual();
  }));

  document.querySelectorAll("[data-dep-magico]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const p2 = pcState.palpiteEdicao[+b.dataset.depMagico];
    snapshotPalpite();
    autoPreenchimentoDeputadosFader(E, p2);
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
        const reais = p.candidatos.filter((c) => c.fonte !== "legenda");
        const novos = fmdEscalarProporcional(baseM.membros[i], novosTotais[i], capCand);
        reais.forEach((c, j) => { c.votos = novos[j]; });
      });
      document.querySelectorAll("[data-dep-fader]").forEach((sl) => {
        const k = sl.dataset.depFader.split("|");
        if (k[0] === "p") atualizarBarraPartidoDom(sl, somaVotosGrupo(pcState.palpiteEdicao[+k[1]]));
        else atualizarFaderDep(sl, Number(candidatoDe(+k[1], k[2])?.votos) || 0, capCand);
      });
      atualizarHeaderDeputados(E);
    };
    zone.addEventListener("pointerdown", (e) => {
      if (somaVotosCargo() <= 0) return;
      snapshotPalpite();
      baseM = {
        totais: pcState.palpiteEdicao.map((p) => somaVotosGrupo(p)),
        membros: pcState.palpiteEdicao.map((p) => p.candidatos.filter((c) => c.fonte !== "legenda").map((c) => Number(c.votos) || 0)),
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

// Plenário "case de cápsulas" (protótipo aprovado em 18/08/2026): grade
// fixa de nichos (um por vaga) que vai sendo preenchida com cápsulas —
// quadrado de cantos arredondados com o fundo dos BOTÕES do console
// (translúcido claro), borda na cor ideológica do partido e a sigla
// inscrita. Usado em todo plenário exceto a Assembleia de SC (40 vagas),
// que mantém o hemiciclo em arco exclusivo.
function renderCasePlenario(composicao, totalVagas) {
  const assentos = [];
  [...composicao].sort((a, b) => b.seats - a.seats).forEach((o) => {
    for (let i = 0; i < o.seats; i++) assentos.push(o.nome);
  });
  while (assentos.length < totalVagas) assentos.push(null);
  const celulas = assentos.slice(0, totalVagas).map((partido) => partido
    ? `<span class="pc-case-cap" title="${escaparAtributoHtml(partido)}">${siglaCurta(partido)}</span>`
    : '<span class="pc-case-nicho" title="vaga em aberto"></span>').join("");
  const poucos = totalVagas <= 5;
  // Linhas com a MESMA quantidade de cápsulas sempre que possível: procura
  // um número de colunas (8→14, depois 7→5) que divida as vagas por igual;
  // sem divisor razoável, cai no arranjo mais compacto com a última linha
  // centralizada pela própria grade. 16 vagas = 2 linhas de 8 (pedido do
  // usuário em 18/08/2026).
  let colunas = 8;
  if (!poucos) {
    colunas = 0;
    for (let c = 8; c <= 14 && !colunas; c++) if (totalVagas % c === 0) colunas = c;
    for (let c = 7; c >= 5 && !colunas; c--) if (totalVagas % c === 0) colunas = c;
    if (!colunas) colunas = Math.min(12, Math.ceil(totalVagas / Math.ceil(totalVagas / 12)));
  }
  return `<div class="pc-case-grade${poucos ? " poucos" : ""}"${poucos ? "" : ` style="grid-template-columns:repeat(${colunas}, 1fr);"`}>${celulas}</div>`;
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
    <div id="pcFarolBloco"></div>
    <div id="pcStickyHeader">
      <div class="pc-farol-linha-abas">
        <span id="pcFarolPontosSlot"></span>
        <div class="pc-cargo-switch">${botoes}</div>
      </div>
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
    .map((p) => (poolPorNome[p.nome].semAta2026 || p.semAta2026) ? poolPorNome[p.nome] : p);
  if (!podada.length) return lista;
  // Sentido inverso da mesma sincronização: grupo que EXISTE no pool mas
  // não no rascunho (ata processada depois do rascunho ser salvo, ou o
  // card "sem ata" criado em 17/08/2026) entra no fim — sem isso, quem já
  // tinha um rascunho nunca via partido novo nenhum até zerar tudo.
  const nomesNaLista = new Set(podada.map((p) => p.nome));
  poolOficial.forEach((p) => { if (!nomesNaLista.has(p.nome)) podada.push(p); });
  return podada;
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
    pcState.palpiteEdicao = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial))
      ? podarGruposForaDoPool(rascunho, poolOficial)
      : poolOficial;
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
  // Pro Senado a versão confinada não serve: os candidatos de 2026 são
  // novos (sem voto de 2022 pra somar), o que zeraria o teto. Eleição
  // majoritária usa a projeção de válidos do ESTADO inteiro (TSE 2022 ×
  // crescimento do eleitorado) — mesma metodologia do funil explicativo.
  const votosValidos2026Proj = pcState.cargoAtivo === "senador" && pcState.estado === "SC"
    ? REF_2022.validos * fatorCrescimentoEleitorado()
    : totalValidosProjetado2026();
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
  // Plenário INICIA FECHADO por padrão (pedido do usuário, 18/08/2026) —
  // o valor guardado só existe depois do primeiro toque na setinha.
  const _plenChave = "plenarioColapsado_" + pcState.cargoAtivo;
  const plenarioColapsado = pcState.expandido[_plenChave] === undefined ? true : !!pcState.expandido[_plenChave];
  // Fora de Santa Catarina, o hemiciclo vira grade waffle (1 quadrado = 1
  // cadeira) — formato que se adapta melhor a qualquer número de vagas sem
  // depender do arco pensado pra 40 cadeiras da Assembleia de SC. Ver desenharHemiciclo
  // em calculo/eleitoral.js (coresMono.forcarGrade).
  // Case de cápsulas pra todo plenário EXCETO a Assembleia de SC (que
  // mantém o hemiciclo em arco) — decisão do usuário em 18/08/2026.
  const usarCasePlenario = !(pcState.estado === "SC" && pcState.cargoAtivo === "estadual");
  // A case responde às VAGAS INDICADAS nos boxes (não à apuração
  // automática): cada grupo aloca as suas N cápsulas com os N candidatos
  // mais votados dele, contadas pelo partido de origem — achado do
  // usuário em 18/08 (box em 4 e case mostrando 6).
  let composicaoPlenario = composicao;
  if (usarCasePlenario && pcState.cargoAtivo !== "senador") {
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
  const hemiciclo = usarCasePlenario
    ? renderCasePlenario(composicaoPlenario, totalVagasCargo)
    : desenharHemiciclo(composicao, totalVagasCargo, {
      preenchido: "var(--pc-glass-border)", texto: "var(--pc-ink)", porPartido: true,
    });
  // Resumo visual embaixo do plenário: mesma composição do hemiciclo, em
  // lista — bolinha com a cor ideológica do partido (corPartidoIdeologico,
  // calculo/eleitoral.js) + sigla + quantidade de cadeiras + fração da
  // representação no total de vagas do cargo, do maior pro menor.
  const legendaPlenario = `
    <div style="display:flex; flex-wrap:wrap; gap:4px; opacity:0.55;">
      ${[...composicaoPlenario].sort((a, b) => b.seats - a.seats).map((o) => `
        <div style="display:inline-flex; align-items:center; justify-content:center; gap:3px; padding:4px 6px; border:1px solid rgba(120,130,180,0.2); border-radius:6px; white-space:nowrap;">
          ${usarCasePlenario ? "" : `<span style="width:5px; height:5px; border-radius:50%; background:${corPartidoIdeologico(o.nome)}; flex-shrink:0;"></span>`}
          <span style="font-size:9px; font-weight:600;">${usarCasePlenario ? siglaCurta(o.nome) : nomePartidoExibicao(o.nome)}: ${o.seats} (${(o.seats / totalVagasCargo * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</span>
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

  const blocos = pcState.cargoAtivo === "senador"
    ? renderListaSenador(totalVagasCargo, votosValidos2026Proj)
    : renderListaDeputadosFader(partidosParaMostrar, votosValidos2026Proj, totalVagasCargo);
  // Seleção antiga (marcar eleitos por interruptor) — substituída pelo
  // modelo fader em 17/08/2026; o map abaixo fica fora do fluxo (função
  // imediatamente descartada) até a limpeza definitiva.

  const instrucaoAberta = pcState.instrucaoSelecaoAberta !== false;
  // Card do Painel Eleitoral — renderizado no slot do cabeçalho fixo
  // (#pcPainelSlot, criado por renderSelecaoCandidatos), NÃO dentro de
  // pcCargoConteudo: abas de cargo + este card formam um bloco único
  // grudado no topo ao rolar, sem espaçamento entre eles (padrão pedido
  // pelo usuário em 16/08/2026, no lugar do esquema antigo de dois
  // stickies separados + camada de blur que gerava "sombra fantasma").
  // Comandos definidos ANTES do painel: no modelo fader dos deputados o
  // painel de comandos mora DENTRO do console A3 (cabeçalho fixo); no
  // Senador ele segue no conteúdo (renderPainelComandos, mais abaixo).
  const gateDeputados = somaVotosCargo() >= 0.995 * votosValidos2026Proj;
  const comandosSelecao = [
    {
      id: "pcBtnBuscaPartidoToggle", icone: "buscar", tamanho: 14, titulo: "Buscar partido",
      legenda: "Abre um campo pra filtrar a lista de partidos pelo nome.",
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
      id: "pcBtnTop2022", icone: "ano2022", tamanho: 15, titulo: "Top 100 de 2022",
      legenda: "Mostra os 100 candidatos mais votados na eleição real de 2022, de todos os partidos — só de referência, não muda seu palpite.",
    },
    {
      id: "pcBtnSalvarSelecao", icone: "salvar", tamanho: 17, titulo: "Salvar",
      legenda: "Salva sua lista do jeito que está agora — mesmo incompleta. Depois é só voltar aqui e continuar marcando de onde parou. Fica disponível em \"Minhas listas\".",
    },
    {
      id: "pcBtnPreencherAutoTudo", icone: "completar", tamanho: 18, titulo: "Mágico — preenchimento automático",
      legenda: pcState.cargoAtivo === "senador"
        ? "Distribui uma votação simulada entre todos os candidatos, pela força do partido de cada um em 2022. O que você já digitou à mão fica como está."
        : "Distribui uma votação simulada realista entre todos os partidos e candidatos (com base em 2022) e fecha a barra em 100%. O que você já digitou à mão fica como está.",
      classeExtra: "destaque",
    },
    {
      id: "pcBtnDepositar", icone: "setaDireita", tamanho: 19, titulo: "Prosseguir pra Revisão",
      legenda: pcState.cargoAtivo === "senador"
        ? `Avança pro próximo passo. Só fica ativo depois que você indicar todos os ${totalVagasCargo} eleitos${totalIndicado === totalVagasCargo ? "" : " — por enquanto está desabilitado"}.`
        : `Avança pro próximo passo. Só fica ativo quando a barra de votos fecha em 100%${gateDeputados ? "" : " — o mágico completa o resto num toque"}.`,
      disabled: pcState.cargoAtivo === "senador" ? totalIndicado !== totalVagasCargo : !gateDeputados,
      classeExtra: "destaque",
    },
  ];
  const painelHtml = pcState.cargoAtivo === "senador" ? renderPainelSenador(votosValidos2026Proj, comandosSelecao) : renderPainelDeputadosFader(votosValidos2026Proj, totalVagasCargo, comandosSelecao);

  conteudo.innerHTML = `
    ${instrucaoAberta ? `
    <div id="pcInstrucaoOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:400px; width:100%; max-height:88vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px 18px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("alerta", 13)} ATENÇÃO</div>
        <div class="pc-tut-aviso">Esta função vai te orientar para preencher a lista com <b class="verde">agilidade e acertividade</b>.<div class="pc-tut-aviso-sub">O painel de notificação lhe orienta a cada passo.<br>Para utilizar, basta selecionar o ícone:</div></div>
        <div class="pc-tut-hero">
          <div class="pc-tut-chame">Clique e entenda:</div>
          <button type="button" class="pc-tut-pontos" id="pcTutPontos" title="Clique"><i class="on"></i><i></i><i></i></button>
          <div class="pc-tut-palco" id="pcTutPalco">
            <div class="pc-tut-lin"><span class="pc-tut-minipontos"><i class="on"></i><i></i><i></i></span> <b style="color:var(--pc-accent);">1 ponto</b> — sinaliza que existe orientação</div>
          </div>
        </div>
        <button class="primary" id="pcFecharInstrucao" style="width:100%; margin-top:14px;" disabled>Iniciar</button>
      </div>
    </div>` : ""}
    ${pcState.avisoLimiteVagasAberto ? `
    <div id="pcAvisoLimiteOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
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
    <div id="pcConfirmAutoOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
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
      <div id="pcCandidatos2022Overlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
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
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(120,130,180,0.14);">
          <span style="width:26px; font-size:12px; font-weight:700; color:var(--pc-ink-dim); text-align:right; flex-shrink:0;">${i + 1}º</span>
          <span style="flex:1; min-width:0; font-size:13.5px; font-weight:600;">${nomeExibicao(c)}<br><span style="font-size:10.5px; font-weight:400; color:var(--pc-ink-dim);">${nomePartidoExibicao(c._partido)}</span></span>
          <span style="font-size:13px; font-weight:600; color:var(--pc-ink-dim); flex-shrink:0;">${Number(c.votos || 0).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      return `
      <div id="pcTop2022Overlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
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
    </div>`}
    ${pcState.listaSalvaNome ? `
    <div style="display:flex; align-items:center; gap:6px; margin:0 0 10px 2px; font-size:11.5px; color:var(--pc-ink-dim);">
      ${iconeSvg("salvar", 12)} Editando a lista <b style="color:var(--pc-ink); font-weight:600;">"${escaparAtributoHtml(pcState.listaSalvaNome)}"</b>
    </div>` : ""}
    ${pcState.legendaComandosAberta ? renderLegendaComandos(comandosSelecao) : ""}
    <div class="pc-status" id="pcSelecaoStatus" style="text-align:right; margin:-14px 0 14px;"></div>
    ${pcState.modalNomeListaAberto ? renderModalNomeLista() : ""}
    ${pcState.modalInstagramInfo ? renderModalInstagram() : ""}
    ${pcState.buscaPartidoAberta ? `
    <div style="position:relative; margin:-12px 0 20px;">
      <svg viewBox="0 0 16 16" width="14" height="14" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--pc-ink-dim); pointer-events:none;"><circle cx="6.6" cy="6.6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7L13.5 13.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path></svg>
      <input type="text" id="pcBuscaPartidoInput" class="cell" placeholder="Buscar partido por nome" value="${pcState.buscaPartido || ""}" style="width:100%; padding-left:34px;">
    </div>` : ""}
    ${blocos || estadoVazio({ icone: "buscar", titulo: pcState.cargoAtivo === "senador" ? "Nenhum candidato encontrado" : "Nenhum partido encontrado", texto: "Confira o nome digitado." })}
  `;

  const slotPainel = document.getElementById("pcPainelSlot");
  if (slotPainel) slotPainel.innerHTML = painelHtml;
  ajustarBarrasTermometro();
  attachListenersSelecao();
  if (pcState.cargoAtivo === "senador") attachListenersSenador(votosValidos2026Proj);
  else attachListenersDeputadosFader(votosValidos2026Proj, totalVagasCargo);
  atualizarFarol();
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
      const atualCol = pcState.expandido[chave] === undefined ? true : !!pcState.expandido[chave];
      pcState.expandido[chave] = !atualCol;
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
  const btnRefazer = document.getElementById("pcBtnRefazerSelecao");
  if (btnRefazer) btnRefazer.addEventListener("click", refazerPalpite);
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
  // Tutorial de página única (21/08/2026): aviso → ícone → JANELA REAL.
  // Cada clique no ícone abre a função igual à dinâmica do sistema
  // (bolha → painel simples → painel completo); após o 3º clique,
  // libera o "Iniciar". Manipula o DOM do overlay direto.
  const tutPontos = document.getElementById("pcTutPontos");
  if (tutPontos && !tutPontos.dataset.ligado) {
    tutPontos.dataset.ligado = "1";
    let tutNivel = 1, tutToques = 0;
    const janelas = {
      1: '<div class="pc-tut-lin"><span class="pc-tut-minipontos"><i class="on"></i><i></i><i></i></span> <b style="color:var(--pc-accent);">1 ponto</b> — sinaliza que existe orientação</div>',
      2: '<div class="pc-tut-lin"><span class="pc-tut-minipontos"><i class="on"></i><i class="on"></i><i></i></span><span class="pc-tut-passo">Passo 1</span> Preencha as vagas por partido — 12 de 40 <span class="pc-tut-min">−</span></div>',
      3: '<div class="pc-tut-lin" style="border-bottom:1px solid rgba(242,244,245,.08); padding-bottom:6px;"><span class="pc-tut-minipontos"><i class="on"></i><i class="on"></i><i class="on"></i></span><span class="pc-tut-passo">Sua trilha</span><span class="pc-tut-min">−</span></div><div class="pc-tut-item on">① Preencher as vagas por partido — <b style="color:var(--pc-accent);">12 de 40</b></div><div class="pc-tut-item">② Distribuir a votação pelos candidatos</div><div class="pc-tut-item">③ Avançar pra Revisão</div>',
    };
    tutPontos.addEventListener("click", () => {
      tutNivel = tutNivel === 3 ? 1 : tutNivel + 1;
      tutToques++;
      tutPontos.querySelectorAll("i").forEach((el, idx) => { el.className = idx < tutNivel ? "on" : ""; });
      document.getElementById("pcTutPalco").innerHTML = janelas[tutNivel];
      if (tutToques >= 3) document.getElementById("pcFecharInstrucao").disabled = false;
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
      pcState.palpitesPorCargo[c.id] = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial))
        ? podarGruposForaDoPool(rascunho, poolOficial)
        : poolOficial;
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

  // Candidatos reais de cada partido em ordem de voto — a vaga de sobra que
  // o partido ganha vai pro próximo dessa fila (pedido do usuário em
  // 18/08/2026: o painel agora NOMEIA quem levou cada vaga, não só o
  // partido). Ordenação feita uma vez fora do loop de rodadas.
  const candidatosOrdenadosPorPartido = lista.map((p) => [...p.candidatos]
    .filter((c) => c.fonte !== "legenda")
    .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0)));

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
      const candidatoVencedor = candidatosOrdenadosPorPartido[pIdxVencedor][novaCadeira - 1];
      rodadas.push({
        numero: totalSobrasCargo, vencedorNome: lista[pIdxVencedor].nome,
        vencedorMedia: medias.find((m) => m.venceu).media, medias,
        vencedorCandidato: candidatoVencedor ? nomeExibicao(candidatoVencedor) : null,
        vencedorPosicao: novaCadeira,
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
  // Grava (ou atualiza) o atalho local "de qual lista salva é este
  // rascunho" — é o que permite um Salvar futuro, depois de recarregar a
  // página, reconhecer que já existe uma lista pra ATUALIZAR em vez de
  // criar outra (ver persistirListaAtivaLocal e o achado do usuário em
  // 17/08/2026, logo acima da função).
  await persistirListaAtivaLocal();
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
    <div id="pcModalNomeListaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
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
    <div id="pcModalInstagramOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
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

    // Lista de EXIBIÇÃO (pedido do usuário em 18/08/2026): nem todo
    // candidato precisa aparecer aqui, só listaCompleta continua completa
    // (usada pros cálculos acima — total de eleitos, avisos de
    // inconsistência, disputa de sobra — não pode ser cortada). Senador
    // (majoritário, poucas vagas): eleitos + os 2 próximos mais votados,
    // 4 no total. Estadual/Federal (proporcional, muitos candidatos):
    // eleitos + os 50% mais votados de quem não elegeu — sempre inclui
    // quem gerou aviso de inconsistência, mesmo fora desse corte, pra não
    // esconder um aviso real atrás do corte de exibição.
    let listaExibida;
    if (cargoDef.id === "senador") {
      listaExibida = listaCompleta.slice(0, 4);
    } else {
      const naoEleitosOrdenados = listaCompleta.filter((c) => !c.eleito);
      const corteMetade = Math.ceil(naoEleitosOrdenados.length / 2);
      const chavesVisiveis = new Set(naoEleitosOrdenados.slice(0, corteMetade).map((c) => c.chave));
      marcadosInconsistentes.forEach((c) => chavesVisiveis.add(c.chave));
      listaExibida = listaCompleta.filter((c) => c.eleito || chavesVisiveis.has(c.chave));
    }

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

    // Card fechado (fundo + borda + cantos arredondados) em vez de linha
    // com traço embaixo — separação mais visível entre candidatos, pedido
    // do usuário em 06/08/2026.
    // --pc-lobby-tom-3 é a camada de tom mais clara já definida no padrão
    // "Lobby" (css/estilo.css) — antes usava um verde quase idêntico ao
    // fundo do acordeão (#0e1f17 vs #0c1c16), então os cards praticamente
    // sumiam um dentro do outro. Pedido do usuário em 06/08/2026.
    // Tom deliberadamente mais claro que o fundo do acordeão (--pc-glass,
    // ~#1D2023) — com --pc-lobby-tom-3 (#1B1E22) os cards praticamente
    // desapareciam dentro dele (feedback do usuário, 18/08/2026).
    const cardCandidato = (conteudo) => `<div style="background:#23272C; border:1px solid #2F343A; border-radius:12px; padding:12px 14px; margin-bottom:8px;">${conteudo}</div>`;

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
          <div class="pc-sen-l1" style="flex-wrap:wrap; row-gap:4px;">
            <span class="pc-sen-chip" title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="cursor:help;">ELEITO</span>
            <span class="pc-sen-nm">${c.nome}</span>
            ${c.tag === "média" && c.detalhe.rodadaSobra !== undefined ? `<span class="pc-sen-chip sobra" title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="cursor:help;">SOBRA · ${c.detalhe.rodadaSobra}/${c.detalhe.totalSobrasCargo}</span>` : ""}
          </div>
          <div class="pc-sen-sub">${c.posicaoEleicao}º · ${c.partido}</div>
          <div style="display:flex; align-items:center; justify-content:flex-end; margin-top:10px;">
            <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:94px; font-size:15px; font-weight:800; text-align:right; flex-shrink:0; padding:9px 6px;">
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
      const menuMagico = menuAberto ? `
        <div style="margin-top:10px; background:#16181B; border:1px solid #2B2F33; border-radius:10px; padding:6px;">
          <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--pc-ink-dim); padding:6px 8px 4px;">Como completar os ${acrescimo.toLocaleString("pt-BR")} votos?</div>
          <button data-pc-fechar-vaga="${c.partido}" data-pc-chave="${c.chave}" data-pc-acrescimo="${acrescimo}" data-pc-cargo="${cargoDef.id}" style="width:100%; text-align:left; background:none; border:none; padding:9px 8px; border-radius:7px; cursor:pointer; display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12.5px; font-weight:700; color:var(--pc-ink);">Direto pra ${c.nome}</span>
            <span style="font-size:10.5px; color:var(--pc-ink-dim); line-height:1.4;">Soma os ${acrescimo.toLocaleString("pt-BR")} votos só na conta dele — mais simples, mas ele fica com um número redondo "de fora".</span>
          </button>
          ${distribuivel ? `<div style="height:1px; background:#23262A; margin:2px 4px;"></div>
          <button data-pc-distribuir-menores="${c.partido}" data-pc-chave-menores="${c.chave}" data-pc-gap-menores="${c.gap.partido}" data-pc-cargo-menores="${cargoDef.id}" style="width:100%; text-align:left; background:none; border:none; padding:9px 8px; border-radius:7px; cursor:pointer; display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12.5px; font-weight:700; color:var(--pc-ink);">Distribuir com quem tem menos</span>
            <span style="font-size:10.5px; color:var(--pc-ink-dim); line-height:1.4;">Reparte os ${c.gap.partido.toLocaleString("pt-BR")} votos entre os colegas de partido que já têm menos voto que ele — sem passar do voto dele.</span>
          </button>` : ""}
          <div style="margin-top:4px; padding:6px 8px 2px; font-size:9.5px; color:var(--pc-warning); line-height:1.4; border-top:1px solid #23262A;">Qualquer uma das opções ainda pode mudar o resultado de outro partido — a disputa de sobra é entre todos ao mesmo tempo.</div>
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
        <div style="margin-top:12px; padding:10px 12px; background:rgba(198,230,42,.1); border:1px solid rgba(198,230,42,.3); border-radius:10px; display:flex; gap:8px; align-items:flex-start;">
          <span style="color:var(--pc-warning); font-size:13px; flex-shrink:0;">${iconeSvg("alerta", 13)}</span>
          <span style="font-size:11.5px; color:var(--pc-warning); line-height:1.5;">${cargoDef.id === "senador"
            ? `A votação de hoje indica que ${c.nome} estaria entre os mais votados (eleição majoritária, voto direto) — mas não está no seu palpite. Fica valendo sua escolha; isso é só um aviso.`
            : `A matemática real (quociente + sobra) indica que ${c.nome} garantiria vaga com a votação de hoje — mas não está no seu palpite. Fica valendo sua escolha; isso é só um aviso.`}</span>
        </div>` : `
        ${menuMagico}
        ${legendaFaltam ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:var(--pc-ink-dim); margin-top:8px;">
          <span>${legendaFaltam}</span>
          <span style="display:flex; align-items:center; gap:6px;">
            <span>${pct}%</span>
            ${mostrarMagico ? `<button data-pc-abrir-magico="${c.chave}" class="pc-mini-btn" title="Como completar os votos" style="width:20px; height:20px; padding:0; border-radius:50%; flex-shrink:0; ${menuAberto ? "color:#34E84A; border-color:#34E84A; background:rgba(52,232,74,.12);" : ""}"><svg viewBox="0 0 16 16" width="12" height="12" style="transform:rotate(${menuAberto ? "180deg" : "0deg"}); transition:transform .15s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>` : ""}
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
      linhas = listaExibida.map(linhaCandidato).join("");
    } else {
      const porPartido = new Map();
      listaExibida.forEach((c) => {
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
      <div class="pc-console" style="display:inline-block; padding:2px; flex-shrink:0; border-radius:8px;">
        <div class="pc-cmd-painel" style="width:auto; justify-content:flex-start; gap:2px; margin-bottom:0;">
          <button data-pc-modo-revisao="lista" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Lista única, ordenada por votos" class="pc-cmd-acao${agrupado ? "" : " ativo"}" style="flex:none; width:24px; min-height:22px; aspect-ratio:auto;">${iconeSvg("lista", 12)}</button>
          <button data-pc-modo-revisao="grupo" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Agrupado por partido/federação" class="pc-cmd-acao${agrupado ? " ativo" : ""}" style="flex:none; width:24px; min-height:22px; aspect-ratio:auto;">${iconeSvg("grupos", 12)}</button>
        </div>
      </div>`;

    return `
      <details class="pc-acc" data-pc-cargo-acc="${cargoDef.id}"${pcState.expandido["revisao-" + cargoDef.id] ? " open" : ""}>
        <summary style="align-items:flex-start;"><span style="flex:1; min-width:0; line-height:1.35;">${cargoDef.label} <span style="font-weight:400; color:var(--pc-ink-dim);">— ${totalEleitos} eleitos${temInconsistencia ? ` · ${marcadosInconsistentes.length} aviso${marcadosInconsistentes.length === 1 ? "" : "s"}` : ""}</span></span><svg class="pc-chev" viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0; margin-top:3px;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary>
        <div class="pc-acc-body">
          ${listaExibida.length < listaCompleta.length ? `<div style="font-size:10.5px; color:var(--pc-ink-dim); margin-bottom:10px;">Mostrando os eleitos + ${listaExibida.length - totalEleitos} mais votados entre quem não elegeu (${listaCompleta.length - listaExibida.length} candidato${listaCompleta.length - listaExibida.length === 1 ? "" : "s"} com menos voto ficaram de fora dessa lista).</div>` : ""}
          <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">${filtroAgrupado}</div>
          ${disputaSobra && disputaSobra.rodadas.length > 0 ? `<button data-pc-abrir-disputa-sobra="${cargoDef.id}" class="ghost" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-bottom:12px; font-size:12.5px; border-radius:10px; padding:10px;">Ver disputa de sobra completa (${disputaSobra.rodadas.length} rodada${disputaSobra.rodadas.length === 1 ? "" : "s"})</button>` : ""}
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

    // Quadro-resumo "quem levou cada vaga" + partidos zerados fora das
    // rodadas + candidato vencedor nomeado + "i" com a regra ilustrada
    // pela 1ª sobra real — pedidos do usuário em 18/08/2026, mockup
    // aprovado (artifact "Disputa de Sobra — proposta"). Material Fader
    // (o vidro-verde 1.0 saiu daqui na mesma rodada).
    const linhasResumo = disputaSobra.rodadas.map((r) => {
      const v = r.medias.find((m) => m.venceu);
      return `
      <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; padding:6px 0; border-top:1px solid rgba(242,244,245,.08); font-size:12px;">
        <span style="font-size:9px; font-weight:800; background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4); color:#F2F4F5; border-radius:999px; padding:2px 7px; font-variant-numeric:tabular-nums; white-space:nowrap;">${r.numero}ª</span>
        <span style="min-width:0;">
          <span style="font-weight:700; color:#F2F4F5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block;">${r.vencedorCandidato || "—"}</span>
          <span style="font-size:10.5px; color:#AEB5BB;">${r.vencedorNome}</span>
        </span>
        <span style="font-size:11px; font-weight:700; color:#AEB5BB; font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right;">${Math.round(r.vencedorMedia).toLocaleString("pt-BR")}<span style="display:block; font-weight:400; font-size:9px; color:#5C6268;">média ${v.votos.toLocaleString("pt-BR")} ÷ ${v.cadeiraAtual + 1}</span></span>
      </div>`;
    }).join("");

    const r1 = disputaSobra.rodadas[0];
    const v1 = r1 ? r1.medias.find((m) => m.venceu) : null;
    const infoAberta = !!pcState.sobraInfoAberta;
    const blocoInfo = infoAberta && r1 && v1 ? `
      <div style="margin-top:10px; padding:10px 12px; background:#101214; border:1px solid #23262A; border-radius:10px; font-size:11.5px; color:#8A9096; line-height:1.6;">
        Depois que as vagas por quociente partidário se esgotam, cada vaga que
        sobra vai pro partido com a <b style="color:#F2F4F5;">maior média</b>:
        votos do partido ÷ (vagas que ele já tem + 1) — art. 109 do Código
        Eleitoral, rodada a rodada.<br><br>
        <b style="color:#F2F4F5;">Exemplo real, a 1ª sobra deste cálculo:</b>
        ${r1.vencedorNome} tinha ${v1.cadeiraAtual} vaga${v1.cadeiraAtual === 1 ? "" : "s"}
        e ${v1.votos.toLocaleString("pt-BR")} votos → média
        ${v1.votos.toLocaleString("pt-BR")} ÷ ${v1.cadeiraAtual + 1} =
        <b style="color:#C6E62A;">${Math.round(r1.vencedorMedia).toLocaleString("pt-BR")}</b>,
        a maior da rodada. A vaga fica com o partido e vai pro próximo mais
        votado da lista dele${r1.vencedorCandidato ? `: <b style="color:#F2F4F5;">${r1.vencedorCandidato}</b>` : ""}.
        Ao ganhar, a média do partido cai na rodada seguinte (÷ ${v1.cadeiraAtual + 2}) —
        é o que deixa a disputa equilibrada entre todos.
      </div>` : "";

    const linhasRodadas = disputaSobra.rodadas.map((r) => `
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid #23262A;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span style="font-size:10px; color:#F2F4F5; background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4); padding:2px 8px; border-radius:999px; font-weight:800;">Rodada ${r.numero}</span>
          <span style="font-size:11px; color:var(--pc-ink-dim);">votos ÷ (vagas atuais + 1)</span>
        </div>
        ${r.medias.filter((m) => m.votos > 0).map((m) => `
          <div style="display:grid; grid-template-columns:1fr auto; align-items:center; gap:8px; padding:6px 8px; border-radius:8px; font-size:12px;${m.venceu ? " background:rgba(242,244,245,.05); border:1px solid rgba(242,244,245,.18);" : ""}">
            <span style="color:${m.venceu ? "var(--pc-ink)" : "var(--pc-ink-dim)"}; min-width:0; overflow:hidden; text-overflow:ellipsis;">${m.nome}${m.venceu && r.vencedorCandidato ? `<span style="display:block; font-size:10.5px; color:#8A9096; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">vaga vai pra <b style="color:#F2F4F5;">${r.vencedorCandidato}</b> (${r.vencedorPosicao}º mais votado)</span>` : ""}</span>
            <span style="font-weight:700; font-variant-numeric:tabular-nums; color:${m.venceu ? "#F2F4F5" : "var(--pc-ink-dim)"};">${Math.round(m.media).toLocaleString("pt-BR")}</span>
          </div>`).join("")}
      </div>`).join("");

    return `
      <div id="pcDisputaSobraOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,10,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(29,32,35,.97); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
            <div>
              <h2 style="margin:0; font-size:16px;">Disputa de sobra — ${cargoDef.label}</h2>
              <div class="pc-sub" style="margin-top:4px;">${disputaSobra.rodadas.length} vaga${disputaSobra.rodadas.length === 1 ? "" : "s"} decidida${disputaSobra.rodadas.length === 1 ? "" : "s"} por média, uma rodada de cada vez, entre os partidos com voto</div>
            </div>
            <button id="pcFecharDisputaSobra" class="pc-mini-btn" title="Fechar" style="font-size:16px; line-height:1;">×</button>
          </div>
          <div style="display:flex; gap:16px; margin:16px 0 0; padding:10px 12px; background:#0C0E10; border:1px solid #23262A; border-radius:10px;">
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Quociente eleitoral</div><div style="font-size:15px; font-weight:700; font-variant-numeric:tabular-nums;">${Math.round(disputaSobra.qe).toLocaleString("pt-BR")}</div></div>
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Vagas por QP</div><div style="font-size:15px; font-weight:700; font-variant-numeric:tabular-nums;">${disputaSobra.totalQP}</div></div>
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Vagas por sobra</div><div style="font-size:15px; font-weight:700; font-variant-numeric:tabular-nums;">${disputaSobra.totalSobrasCargo}</div></div>
          </div>
          <div style="margin-top:14px; background:#2C3239; border:1px solid #4D545C; border-radius:12px; padding:12px 14px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#AEB5BB; margin-bottom:8px;">Quem levou cada vaga de sobra <button type="button" id="pcSobraInfoToggle" class="pc-sen-inf${infoAberta ? " aberto" : ""}" title="Como funciona o cálculo da sobra">i</button></div>
            ${blocoInfo}
            ${linhasResumo}
          </div>
          ${linhasRodadas}
        </div>
      </div>`;
  })();

  conteudo.innerHTML = `
    <div id="pcFarolBloco"></div>
    ${painelDisputaSobraHtml}
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <h2>Revisão</h2>
      <div class="pc-sub">Revise os três cargos antes de salvar — dá pra ajustar cada um aqui mesmo, sem voltar pra outra tela.</div>
      ${pcState.listaSalvaId ? `<div class="pc-sub" style="color:var(--pc-warning); margin-top:6px;">${iconeSvg("alerta", 12)} Você está editando "${pcState.listaSalvaNome || "uma lista salva"}". As mudanças só ficam valendo se clicar em Salvar de novo antes de sair — senão se perdem.</div>` : ""}

      <div class="pc-console" style="margin-top:12px; padding:7px 10px;">
        <div class="pc-cmd-painel" style="margin-bottom:0;">
          <button id="pcBtnVoltarRevisao" class="pc-cmd-acao" title="Voltar e ajustar">${iconeSvg("setaEsquerda", 15)}</button>
          <button id="pcBtnImprimir" class="pc-cmd-acao" ${pcState.listaSalvaId ? "" : "disabled"} title="${pcState.listaSalvaId ? "Impressão / PDF" : "Salve a lista primeiro pra poder imprimir"}">${iconeSvg("impressora", 15)}</button>
          <button id="pcBtnConfirmarDeposito" class="pc-cmd-acao destaque" title="Salvar">${iconeSvg("salvar", 16)}</button>
        </div>
      </div>
      <div class="pc-status" id="pcDepositoStatus" style="text-align:right; margin-top:6px;"></div>
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
      pcState.sobraInfoAberta = false;
      renderRevisaoDeposito();
    });
  }
  const btnSobraInfo = document.getElementById("pcSobraInfoToggle");
  if (btnSobraInfo) {
    btnSobraInfo.addEventListener("click", () => {
      pcState.sobraInfoAberta = !pcState.sobraInfoAberta;
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
  atualizarFarol();
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
  // Conta-gotas (economia v3 §4, migração 23): logado registra o dia de
  // acesso (+2 linhas/dia, idempotente) e recebe o total revelado. null =
  // migração ainda não rodou OU convidado — nos dois casos, degrada pro
  // mínimo do dia (2 linhas) sem quebrar. Pós-eleição: tudo aberto.
  const posEleicao = new Date() > DATA_ELEICAO_2026;
  let linhasReveladas = 2;
  if (pcState.perfil && !posEleicao) {
    const r = await registrarAcessoMediana();
    if (r !== null) linhasReveladas = r;
  }
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

  const linha = (c, i, borrada) => `
    <div class="pc-lobby-linha"${borrada ? ` style="filter:blur(4px); opacity:.5; pointer-events:none; user-select:none;" aria-hidden="true"` : ""}>
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
      ${desenharHemiciclo(seatsProj, totalVagasCargo, { preenchido: "rgba(52,232,74,.14)", vago: "#1B1E22", borda: "var(--pc-ink)", texto: "var(--pc-ink)", porPartido: false })}
    </div>
    <div class="pc-lobby-card">
      ${projecao.length ? projecao.map((c, i) => linha(c, i, !posEleicao && i >= linhasReveladas)).join("") : estadoVazio({ icone: "chart", titulo: "Ninguém preencheu esse cargo", texto: "Assim que alguém depositar uma cédula pública desse cargo, a mediana aparece aqui." })}
    </div>
    ${!posEleicao && projecao.length > linhasReveladas ? `
    <div style="margin-top:12px; padding:12px 14px; background:#101214; border:1px solid #23262A; border-radius:10px; font-size:11.5px; color:#8A9096; line-height:1.6;">
      A mediana se revela <b style="color:#F2F4F5;">2 linhas por dia de acesso</b> — você já abriu <b style="color:#F2F4F5;">${linhasReveladas}</b>. Volte amanhã pra mais 2, ou acelere agora:
      <button class="ghost" id="pcBtnAcelerarMediana" style="width:100%; margin-top:10px; font-size:12px; padding:9px;">+10 linhas por 2 créditos</button>
      <div class="pc-status" id="pcMedianaStatus" style="margin-top:6px; min-height:12px;">${pcState.medianaStatus || ""}</div>
    </div>` : ""}
  `;
  pcState.medianaStatus = "";

  document.querySelectorAll("[data-pc-cargo-medias]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoMedias = btn.getAttribute("data-pc-cargo-medias");
      renderQuadroMedias();
    });
  });
  const btnAcelerar = document.getElementById("pcBtnAcelerarMediana");
  if (btnAcelerar) {
    btnAcelerar.addEventListener("click", async (e) => {
      if (!pcState.perfil) return;
      e.target.disabled = true;
      const r = await acelerarMediana();
      if (r.semSaldo) {
        pcState.medianaStatus = "Saldo insuficiente (precisa de 2 créditos) — convide um amigo: cada convite convertido rende 10.";
      } else if (r.erro) {
        pcState.medianaStatus = "Não deu: " + r.erro;
      } else {
        pcState.medianaStatus = "";
      }
      renderQuadroMedias();
    });
  }
}
