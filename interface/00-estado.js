// Estado compartilhado, constantes, ícones e helpers puros de UI usados por
// várias telas (pcState, CARGOS, PC_ICONES/iconeSvg, DESAFIO_TIPOS, DOC_*, lets
// de módulo…). Primeiro arquivo da interface — a ordem de carga está no
// index.html (interface/00-… até 99-…, scripts globais, sem módulos ES).

// Prospecção Coletiva — telas de cadastro/login, editor de palpite (modo
// detalhado), quadro de médias e placeholder de ranking. Depende de tudo em
// nuvem/*.js (carregado antes) e reaproveita helpers de dados/calculo/interface
// já existentes (BASE_2022, dhondt, desenharHemiciclo, chevron, infoTip,
// paleta ideológica do hemiciclo). Não toca em estado de DOM — regra:
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
  adminBotsEstado: "SC", // UF selecionada na aba Bots do admin (lançamento é SC-only, decisão 28/08/2026)
  adminBotsStatus: null, // feedback da última ação da aba Bots ({tipo:"ok"|"erro", texto})
  adminAnaliticoIncluiBots: false, // aba Analítico: false = só contas reais (o "sistema de verdade", padrão da estruturação 28/08/2026)
  adminHistOrigem: "todos", // filtro client-side do "Histórico de ações" (migração 46): "todos" | "organico" | "bots"
  adminHistAcoes: null, // Set das chaves de HISTORICO_ACAO_ROTULOS ligadas no filtro; null = todas ligadas (padrão)
  adminHistBusca: "", // texto livre do filtro (nome/e-mail/município, case-insensitive)
  adminPesquisaFiltro: null, // { genero, uf } — último filtro usado na seção "Pesquisa" do admin
  adminPesquisaResultados: null, // cache do resultado de adminPesquisaAgregada()
  adminPesquisaCargo: "estadual", // qual cargo a seção "Pesquisa" do admin está mostrando
  adminUsuariosFiltro: null, // { genero, uf, desde, ate, statusCedula, tipoConta } — seção "Usuários"
  adminUsuariosResultados: null, // cache do resultado de adminListarUsuarios()
  ufPesquisaFiltro: null, // { genero, uf } — último filtro usado no Painel do usuário final
  ufPesquisaResultados: null, // cache do resultado de usuarioFinalPesquisaAgregada()
  ufPesquisaCargo: "estadual", // qual cargo o Painel do usuário final está mostrando
  // carregando | erro-conexao | landing | estado | selecao-convidado |
  // revisao-convidado | deposito-confirmado |
  // login | cadastro | app
  tela: "carregando",
  subaba: "selecao", // selecao | painel | palpite | medias | ranking (só usado dentro de "app", logado)
  estado: null, // sigla do estado escolhido (ver dados/estados-brasil.js) — só "SC" tem dados por enquanto
  cargoAtivo: "estadual", // estadual | federal | senador
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
  erro: "",
  cadRascunho: null, // { nome, email, lgpd } — preserva o formulário de cadastro quando dá erro, pra não fazer a pessoa digitar tudo de novo (achado do usuário, 24/08/2026)
  status: "",
  modalNomeListaAberto: false, // modal "dê um nome pra essa lista" no primeiro Salvar da Revisão
  listaSalvaId: null, // id exclusivo gerado no primeiro Salvar — reaproveitado nos salvamentos seguintes da mesma lista (edição, não duplicata)
  listaSalvaNome: null, // nome escolhido pela pessoa nesse modal — só pergunta de novo se vier null (ex.: depois de "Sair")
  modoAgrupadoRevisao: {}, // cargo -> true/false — filtro "lista única" (default) vs "agrupado por partido/federação" na Revisão
  filtroEleitoRevisao: {}, // cargo -> true/false — 3º filtro "só eleitos" na Revisão (01/09/2026)
  listaEmVisualizacao: null, // lista depositada aberta em modo "Ver" (renderMinhasListas) — null = mostrando a lista de listas
  modalDepositarListaId: null, // id da lista com o modal de confirmação de depósito aberto
  avisoVagaNaoMarcadaResumo: null, // [{cargo, nomes:[...]}] — vagas que a votação real já garantiria mas a pessoa não marcou; null enquanto não checou
  avisoVagaNaoMarcadaConfirmado: false, // true depois do 2º clique em "Depositar mesmo assim" — reseta a cada abertura do modal
  _anonimoPreAviso: false, // escolha do switch "anônimo" preservada durante o re-render do aviso acima
  modalCompartilharListaId: null, // id da lista com o modal de compartilhamento (código + imagem) aberto
  dadosCompartilhar: null, // { carregando, lista, eleitos, imagemUrl } do modal de compartilhar acima — cache pra não recarregar a cada render
  avisoLimiteListaAberto: false, // aviso "compre crédito" ao tentar criar 2ª lista sem pagar
  avisoLimiteGrupoAberto: false, // aviso ao tentar criar 2º grupo sem saldo (10 créditos)
  avisoLimiteCedulaAberto: false, // aviso ao tentar depositar 2ª cédula sem saldo (70 créditos)
  linksCandidatosCache: {}, // "estado::cargo" -> { chave: instagram }, ver garantirLinksCandidatos
  financeiroCandidatosCache: {}, // "estado::cargo" -> { chave: {tseId,bens,recebido} }, ver garantirLinksCandidatos
  financeiroAbertoChave: null, // chave do candidato com o painel de bens/recursos aberto (só um por vez), ou null
  modalInstagramInfo: null, // { chave, nome, valorAtual } do candidato com o modal de editar Instagram aberto (só admin), ou null
  legendaComandosAberta: false, // painel único de legenda do painel de comandos da Seleção (o "i" no fim da linha de ícones)
  legendaBadgeAberta: false, // "i" que explica os badges E-QP/E-M/E na lista de candidatos (protótipo aprovado 28/08/2026)
  legendaListasAberta: false, // legenda compartilhada dos botões de ícone de Minhas listas (o "i" ao lado de "Em aberto")
  modalSalvarDestinoAberto: false, // seletor de destino do Salvar (lista ativa · outro slot · nova) — pedido 21/08
  _destinosSalvar: null, // listas em aberto carregadas na hora de abrir o seletor
  _destinoSelecionado: null, // slot escolhido no seletor (id da lista ou "novo")
  _destinoNomeDigitado: null, // nome digitado no slot vazio (sobrevive ao re-render)
  _destinoDesbloqueado: false, // slot além dos 2 grátis destravado nesta abertura (cobra ao salvar)
  _destinoConfirmando: false, // "Sobrescrever?" SIM/NÃO na tela de slots
  historicoRefazer: [], // par do historicoPalpite pro Refazer (desfeitos ficam aqui)
  funilVotosAberto: false, // funil explicativo dos votos válidos (o "i" do cabeçalho da aba Senador, PROJETO.md §8.2)
  sobraInfoAberta: false, // explicação da regra de sobra (o "i" do quadro-resumo no painel Disputa de Sobra, Revisão)

  // ===== Desafios 1×1 (migração 33 — recorte de candidatos, 25/08/2026;
  // era cédula inteira na migração 28) =====
  desafiosCache: null, // lista crua de listarMeusDesafios(), recarregada a cada entrada na tela
  desafiosGratisRestantes: null, // desafiosGratisRestantes() — null = ainda não carregado
  telaDesafio: "hub", // "hub" | "criar" | "aceitar"
  desafioAceitarId: null, // id do desafio sendo aceito (telaDesafio === "aceitar")
  desafioAceitarVotos: null, // {chave: votos} — só pros candidatos do escopo_candidatos do desafio
  desafioCriarNome: "",
  desafioCriarCargo: null, // "estadual" | "federal" | "senador"
  desafioCriarModo: null, // "cargo" (todo mundo do cargo) | "candidatos" (recorte escolhido)
  desafioCriarPartidoFiltro: null, // chip selecionado no modo "candidatos"
  desafioCriarBusca: "",
  desafioCriarSelecionados: null, // Set de chaves — só usado no modo "candidatos"
  desafioCriarVotos: null, // {chave: votos}
  desafioCriarAlvo: null, // {id, nome} — por código (migração 34) ou escolhido na lista de amigos
  desafioCriarCodigoInput: "",
  desafioCriarCodigoStatus: "",
  desafioCriarAmigos: null, // cache de listarAmigosParaDesafio()
  desafioStatus: "", // linha de status (erro/sucesso) das telas de desafio

  // ===== Notificações (migração 28) =====
  notificacoesNaoLidas: 0, // carregado no boot, revalidado ao voltar pro painel
  notificacoesCache: null,
  telaNotificacoes: false, // sobrepõe o subaba atual quando aberta (ver renderNotificacoes)

  // ===== Termômetro — revelações pagas (migração 28) =====
  termometroRevelacoesCache: {}, // "estado::cargo" -> Set de chaves reveladas
  termometroPainelPrecos: false, // caixa "Revelar agora" expandida
  termometroCoringaResultado: null, // { candidato, raridade } do último sorteio, pra animação de abertura
  termometroCoringaAbrindo: false,
  termometroStatus: "", // linha de status do painel de preços do Termômetro

  // ===== Loja / pagamento real (migração 29, Mercado Pago) =====
  lojaStatus: "", // linha de status da Loja (erro ao iniciar compra, ou aviso de volta do Mercado Pago)
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
// Feedback de clique rápido (variante D aprovada 30/08/2026): o :active
// só dura enquanto o dedo aperta — num toque relâmpago o efeito nem chega
// a aparecer. O pointerdown pendura .pulsando por 220ms no botão (ou nos
// clicáveis que se comportam como botão), garantindo que TODO clique
// mostre a resposta visual completa. Listener único no documento — vale
// pra qualquer tela renderizada depois, sem religar nada.
// Lista de clicáveis-que-não-são-botão estendida em 08/09/2026 (auditoria
// de consistência do toque): .pc-mini-card (card de lista em Minhas
// Listas — o mesmo componente em Grupos já é <button>, este não pode ser
// por ter botões de ação aninhados dentro), #pcFaixaVagas (faixa de vagas
// em aberto na Seleção, mesmo motivo) e .pc-cand-row (linha de candidato
// no criar-duelo, um <label> de checkbox).
document.addEventListener("pointerdown", (e) => {
  const alvo = e.target.closest("#modoColaborativoWrap button, #modoColaborativoWrap .pc-lobby-tile, #modoColaborativoWrap .pc-lobby-mais-item, #modoColaborativoWrap .pc-amigo-op, #modoColaborativoWrap .pc-notif-acao, #modoColaborativoWrap .pc-mini-card, #modoColaborativoWrap .pc-fva, #modoColaborativoWrap .pc-cand-row");
  if (!alvo || alvo.disabled) return;
  alvo.classList.add("pulsando");
  clearTimeout(alvo._pulsoTimer);
  alvo._pulsoTimer = setTimeout(() => alvo.classList.remove("pulsando"), 220);
});

const PC_ICONES = {
  // cadeado (voto oculto no Duelo) e confere (check simples da comparação)
  // — mesmo traço 1.3-1.4 do resto do mapa, migração 38.
  // pino de mapa (Trocar estado, 30/08/2026)
  mapa: '<path d="M8 14.5s-4.6-4.2-4.6-7.6A4.6 4.6 0 018 2.3a4.6 4.6 0 014.6 4.6c0 3.4-4.6 7.6-4.6 7.6z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><circle cx="8" cy="6.8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.3"></circle>',
  cadeado: '<rect x="3.2" y="7" width="9.6" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"></rect><path d="M5.2 7V5a2.8 2.8 0 015.6 0v2" fill="none" stroke="currentColor" stroke-width="1.4"></path>',
  confere: '<path d="M3 8.4l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>',
  ballot: '<path d="M2.5 6.5h11v7a1.2 1.2 0 01-1.2 1.2H3.7A1.2 1.2 0 012.5 13.5v-7z" fill="none" stroke="currentColor" stroke-width="1.3"></path><path d="M4.5 6.5h7" stroke="currentColor" stroke-width="1.3"></path><rect x="6.6" y="2" width="3.4" height="4.8" rx=".5" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(12 8.3 4.4)"></rect>',
  lixeira: '<path d="M3 4.6h10M6.2 4.6V3.2a.9.9 0 01.9-.9h1.8a.9.9 0 01.9.9v1.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.1 4.6l.6 8.3a1 1 0 001 .9h4.6a1 1 0 001-.9l.6-8.3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.6 7v4M9.4 7v4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>',
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
  relogio: '<circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M8 4.8v3.4l2.3 1.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>',
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
  whatsapp: '<path d="M8 1.6A6.4 6.4 0 001.6 8c0 1.13.3 2.2.81 3.13L1.6 14.4l3.36-.78A6.4 6.4 0 108 1.6z" fill="none" stroke="currentColor" stroke-width="1.2"></path><path d="M5.7 5.4c.5 1.9 1.9 3.4 3.9 3.9l.9-.9 1.5.8c-.3 1-1.1 1.4-2 1.2-2.5-.5-4.9-2.9-5.4-5.4-.2-.9.2-1.7 1.2-2l.8 1.5-.9.9z" fill="currentColor"></path>',
  baixar: '<path d="M8 2.5v7.3M5 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M2.8 12.2v1a1 1 0 001 1h8.4a1 1 0 001-1v-1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"></path>',
  buscar: '<circle cx="6.8" cy="6.8" r="4" fill="none" stroke="currentColor" stroke-width="1.3"></circle><path d="M9.7 9.7l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>',
  salvar: '<path d="M3 2.8h8.2l2 2v8.4H3V2.8z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M5 2.8v3.6h4.6V2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path><rect x="4.8" y="9" width="6.4" height="4.2" fill="none" stroke="currentColor" stroke-width="1.2"></rect>',
  instagram: '<rect x="2" y="2" width="12" height="12" rx="3.6" fill="none" stroke="currentColor" stroke-width="1.3"></rect><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"></circle><circle cx="11.5" cy="4.5" r=".9" fill="currentColor"></circle>',
  externo: '<path d="M6.3 9.7L13 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path><path d="M9 3h4v4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11.3 8.6v3.4a1 1 0 01-1 1H3.7a1 1 0 01-1-1V4.7a1 1 0 011-1h3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  // Moeda SL (desenho fechado com o usuário em 24/08/2026): a haste sai por
  // cima do S, volta por baixo e dobra pra direita virando o pé do L — de
  // longe lê "dinheiro", de perto lê o monograma SL. Substituiu o alvo
  // genérico que não dizia nada.
  credito: '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.15"></circle><path d="M10.3 5.9c0-.95-1-1.6-2.2-1.6s-2.2.65-2.2 1.55c0 2 4.4 1.05 4.4 3.15 0 .95-1 1.65-2.25 1.65s-2.25-.65-2.25-1.6" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><path d="M7.8 2.8v1.7" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><path d="M7.8 10.4v2.75h2.95" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path>',
  // Urna — a peça-chave do projeto (memória alesc_visual_identity): é por
  // ela que se chega às listas e se deposita a cédula.
  urna: '<path d="M2.8 6.2h10.4l-.7 6.7a1 1 0 01-1 .9H4.5a1 1 0 01-1-.9z" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"></path><rect x="2.1" y="4.1" width="11.8" height="2.1" rx=".8" fill="none" stroke="currentColor" stroke-width="1.15"></rect><path d="M6.2 5.15h3.6" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"></path><path d="M8 1.1v2.2M8 1.1L6.7 2.4M8 1.1l1.3 1.3" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"></path>',
  // Loja — onde se compra SL e desbloqueio do Termômetro.
  loja: '<path d="M2.9 5.7h10.2l-.75 6.8a.95.95 0 01-.95.8H4.6a.95.95 0 01-.95-.8z" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"></path><path d="M2.1 5.7l1.3-2.8h9.2l1.3 2.8" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"></path><path d="M6.1 8.1a1.9 1.9 0 003.8 0" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"></path>',
  // Desafio 1×1 — espadas cruzadas.
  desafio: '<path d="M2.6 13.4L12 4M9.3 4h2.7v2.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path><path d="M13.4 13.4L4 4M6.7 4H4v2.7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>',
  // Termômetro eleitoral (ex-Mediana).
  termometro: '<path d="M6.4 2.6a1.6 1.6 0 013.2 0v6.2a3.1 3.1 0 11-3.2 0z" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"></path><circle cx="8" cy="11.6" r="1.5" fill="currentColor"></circle><path d="M8 10.2V5.6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path>',
  // Sino de notificações — barra superior do Painel.
  sino: '<path d="M4.3 6.7a3.7 3.7 0 017.4 0c0 2.1.55 3.1 1.05 3.7.3.35.05.95-.4.95H3.65c-.45 0-.7-.6-.4-.95.5-.6 1.05-1.6 1.05-3.7z" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linejoin="round"></path><path d="M6.6 13a1.5 1.5 0 002.8 0" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"></path>',
  cadeadoSlot: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" stroke-width="1.3"></path>',
};
// Candidatura congelada (desistência / sub judice) — política 21/08/2026:
// fica no elenco com etiqueta branca antes do nome e a célula travada
// (sem receber votos, sem pontuar). Protótipo aprovado no mesmo dia.
function infoStatusCandidato(status) {
  if (status === "sub-judice" || status === "subjudice") {
    return { etiqueta: "SUB JUDICE", motivo: "Registro aguardando decisão da Justiça Eleitoral — congelado até a definição." };
  }
  return { etiqueta: "DESISTIU", motivo: "Candidatura retirada — não recebe votos e não pontua na apuração." };
}

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
// "Retrato de 2022" ativo: a votação na tela é IDÊNTICA à base de 2022
// (o padrão de abertura — equivale a ter apertado o relógio). Vale pro
// cargo ativo; candidatura congelada conta como retrato com 0 voto (o
// restaurar-2022 também a deixa em 0). Aprovado em 22/08/2026: o botão
// do relógio no console respira devagar enquanto isso for verdade — o
// usuário liga a abertura pré-preenchida à lógica do 2022 sem texto.
function retratoDe2022Ativo() {
  if (!pcState.palpiteEdicao) return false;
  return pcState.palpiteEdicao.every((p) => (p.candidatos || []).every((c) => {
    if (c.fonte === "legenda") return true;
    const v = Number(c.votos) || 0;
    if (c.status) return v === 0;
    return v === (Number(c.votos2022) || 0);
  }));
}

function renderBotoesComandos(comandos) {
  const out = [];
  for (let i = 0; i < comandos.length; i++) {
    const c = comandos[i];
    const prox = comandos[i + 1];
    if (c.id === "pcBtnVoltarSelecao" && prox && prox.id === "pcBtnRefazerSelecao") {
      // Desfazer|Refazer: círculo dividido por fio (protótipo aprovado).
      out.push(`<div class="pc-cmd-acao pc-cmd-dupla">
        <button type="button" id="${c.id}" title="${escaparAtributoHtml(c.titulo)}" ${c.disabled ? "disabled" : ""}>${iconeSvg(c.icone, 13)}</button>
        <button type="button" id="${prox.id}" title="${escaparAtributoHtml(prox.titulo)}" ${prox.disabled ? "disabled" : ""}>${iconeSvg(prox.icone, 13)}</button>
      </div>`);
      i++;
      continue;
    }
    if (c.id === "pcBtnTop2022" && prox && prox.id === "pcBtnRestaurar2022") {
      // Botão 2022 (protótipo "console completo" aprovado em 21/08/2026):
      // o ano por extenso no cabeçalho e as duas divisórias embaixo —
      // lista (nominata/top) | relógio (retomar) — ícones limpos, sem
      // o mini-22 (o cabeçalho já diz o ano).
      const retrato2022 = retratoDe2022Ativo();
      out.push(`<div class="pc-cmd-b22${retrato2022 ? " retrato-ativo" : ""}"${retrato2022 ? ' title="Votação idêntica à de 2022 — o retrato de abertura está intacto"' : ""}>
        <div class="pc-cmd-b22-ano">2022</div>
        <div class="pc-cmd-b22-metades">
          <button type="button" id="${c.id}" title="${escaparAtributoHtml(c.titulo)}">${iconeSvg("lista", 14)}</button>
          <button type="button" id="${prox.id}" title="${escaparAtributoHtml(prox.titulo)}">${iconeSvg("relogio", 14)}</button>
        </div>
      </div>`);
      i++;
      continue;
    }
    out.push(comandoIcone(c));
  }
  return out.join("");
}

function comandoIcone(opcoes) {
  const { id, icone, tamanho, titulo, disabled, classeExtra, atributosExtra, mini } = opcoes;
  // mini: botão auxiliar vazado da família do "i" (metade do tamanho) —
  // a lupa usa isso pra liberar espaço na linha (aprovado 21/08/2026).
  const classe = mini ? "pc-cmd-mini" : "pc-cmd-acao";
  return `<button type="button" id="${id}" class="${classe}${classeExtra ? " " + classeExtra : ""}" title="${escaparAtributoHtml(titulo)}" ${disabled ? "disabled" : ""} ${atributosExtra || ""}>${iconeSvg(icone, mini ? 12 : (tamanho || 15))}</button>`;
}

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

// Não existe rotina automática rodando sozinha no sistema — tudo aqui é
// disparado manualmente (ex.: o agente atualizador-atas-2026, sob pedido,
// nunca sozinho — ver CLAUDE.md). "Programado" é a cadência ESPERADA de
// quem dispara, não um agendamento de verdade. Catálogo fixo porque não
// tem de onde descobrir isso no banco (decisão do usuário, 24/08/2026).
const ROTINAS_CONHECIDAS = [
  {
    chave: "pesquisa-rrc-diaria",
    nome: "Pesquisa diária do RRC (TSE, 27 UFs)",
    descricao: "Baixa o Registro de Candidatura oficial do TSE pros 27 estados, cruza contra os provisórios e escreve os relatórios {uf}-2026-rrc-conferencia.md. Nunca altera os provisórios sozinha.",
    programado: "Diária, sob pedido — roda quando alguém abre o TSE num navegador e dispara ferramentas/rrc_diario.py (o TSE bloqueia acesso automatizado desde 21/08).",
  },
  {
    chave: "atualizador-atas-sc-2026",
    nome: "Atualizador de atas (TSE, SC)",
    descricao: "Verifica ata nova ou retificadora de convenção partidária no TSE e atualiza dados/estados/sc-2026-provisorio.js pra revisão.",
    programado: "Diária, sob pedido — nunca dispara sozinha.",
  },
];

const HISTORICO_ACAO_ROTULOS = {
  cadastro: { rot: "Cadastro", cor: "var(--pc-accent)" },
  palpite_salvo: { rot: "Palpite salvo", cor: "#AEB5BB" },
  cedula_depositada: { rot: "Cédula depositada", cor: "var(--pc-accent)" },
  credito_adquirido: { rot: "Crédito adquirido", cor: "#7fa895" },
  credito_utilizado: { rot: "Crédito utilizado", cor: "#FF9A2E" },
  duelo_cadastrado: { rot: "Duelo cadastrado", cor: "#8ecbe8" },
};

let _pcHistBuscaDebounce = null;

// Em celular, navigator.share abre o menu nativo do SO com WhatsApp entre
// os alvos (o app se registra como destino de compartilhamento). Em
// desktop (inclusive Mac com Safari/Chrome recentes, que também tem
// navigator.share), o menu do sistema não lista o WhatsApp Desktop — cai
// num monte de apps genéricos (Mail, Notas, AirDrop…) sem WhatsApp
// nenhum, porque o app não se registra como extensão de compartilhamento
// do macOS. Achado do usuário, 05/09/2026. Por isso os fluxos de
// convite/compartilhar preferem ir direto pro WhatsApp Web (wa.me) em
// telas sem toque, e só usam o menu nativo em celular/tablet.
function _ehDispositivoMovel() {
  // maxTouchPoints > 0 já separa Mac/PC (sempre 0, mesmo com trackpad) de
  // celular/tablet — inclusive iPad, que desde o iPadOS 13 manda um
  // userAgent de desktop por padrão (checar só a string de UA erraria o
  // iPad). userAgent entra só como reforço pra navegador antigo que não
  // reporta maxTouchPoints.
  if (navigator.maxTouchPoints > 0) return true;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function _baixarImagemCedula(dataUrl, nomeArquivo) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nomeArquivo || "minha-lista-2026.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const DESAFIO_TIPOS = [
  { id: "eleitos", rotulo: "Eleitos", dica: "Puxa o plenário de uma das suas listas salvas — vence quem acertar a composição." },
  { id: "cargo", rotulo: "Cargo", dica: "Todos os candidatos do cargo — votação completa." },
  { id: "partido", rotulo: "Partido", dica: "Um ou mais partidos inteiros — só a votação deles." },
  { id: "candidato", rotulo: "Candidato", dica: "Nomes escolhidos a dedo — até um único candidato." },
];

// O nome do duelo às vezes já vem digitado com aspas ("Duelo X") — os
// templates põem as deles e a tela mostrava ""Duelo X"" (bug visto no
// teste real de 31/08/2026). Normaliza uma vez, exibe com UMA aspa.
function _nomeDueloLimpo(nome) {
  return String(nome || "").replace(/^[\s"\u201c\u201d']+|[\s"\u201c\u201d']+$/g, "") || "duelo";
}

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
  if (window.SEL_DEMO) return nomeFicticioPara(c.chave || c.nome);
  return c.nomeUrna || c.nome;
}

// Tela de "Carregando…" padrão — a logo oficial pulsando, reaproveitada em
// toda tela que precisa buscar algo antes de mostrar conteúdo (troca de
// cargo, grupos, quadro de médias etc.). Sem legenda de propósito (pedido
// do usuário, 25/08/2026): a respiração já entrega "carregando" sozinha —
// mensagem (ainda aceita por compatibilidade com quem chama) não aparece
// mais na tela. Ver DESIGN.md §3.4c pra composição completa da logo.
function telaCarregando(mensagem) {
  return `<div class="pc-carregando-wrap">
    <div class="pc-carregando-halo"></div>
    <div class="pc-logo-mark">
      <div class="pc-logo-fill cheio"></div>
      <div class="pc-logo-fill degrade"></div>
      <span class="pc-logo-icone">${iconeSvg("ballot", 31)}</span>
    </div>
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

// Itens achatados do cargo (TODOS os candidatos reais, sem filtro de
// busca) — o índice deste array é o data-sen-idx dos cards e a ordem do
// vetor `base` da alça mestra. Reconstruído a cada render.
let _senItens = [];
let _senDragIdx = null, _senTimer = null, _senEditAberto = false, _senMasterAtivo = false;

let _depDragKey = null, _depTimer = null, _depEditAberto = false, _depMasterAtivo = false, _depEditProximo = null;

// Fader reutilizando as classes pc-sen-* (mesma família visual §8.2);
// "mini" reduz barra e alça pros candidatos aninhados.
// Glifos das setas de ajuste fino (protótipo aprovado 28/08/2026).
function setaFinoHtml(dataAttr, valor, dir) {
  const glifo = dir === "menos"
    ? '<path d="M10.5 3.5L5.5 8l5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'
    : '<path d="M5.5 3.5l5 4.5-5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>';
  const titulo = dir === "menos" ? "Diminuir votos" : "Aumentar votos";
  return `<button type="button" class="pc-seta-fino" ${dataAttr}="${escaparAtributoHtml(valor)}|${dir}" title="${titulo}" aria-label="${titulo}"><svg viewBox="0 0 16 16" width="9" height="9">${glifo}</svg></button>`;
}

// Abre/fecha um bloco animando a ALTURA REAL (scrollHeight) — padrão único
// dos abrir/fechar suaves de 08/09/2026 (Plenário, faixa de vagas, card do
// partido, painel "i"). max-height não anima de/para "auto", então o JS
// fixa o número exato nas duas pontas; ao terminar, LIMPA o style inline —
// senão conteúdo que crescer depois (painel financeiro de um candidato,
// mais uma linha na faixa…) ficaria cortado no valor calculado no clique.
// A classe .aberto tem um max-height de reserva grande em css/estilo.css,
// que cobre esse caso e o re-render inteiro (que recria o elemento sem
// passar por aqui).
function animarAlturaCorpo(el, abrir) {
  if (!el) return;
  clearTimeout(el._pcTimerAltura);
  el.style.maxHeight = el.scrollHeight + "px";
  if (abrir) {
    el.classList.add("aberto");
  } else {
    void el.offsetHeight; // força o navegador a "ver" a altura atual antes de mandar pra 0
    el.style.maxHeight = "0px";
    el.classList.remove("aberto");
  }
  el._pcTimerAltura = setTimeout(() => { el.style.maxHeight = ""; }, 650);
}

function faderDepHtml(chaveDrag, v, cap, mini) {
  const pct = Math.min(100, cap > 0 ? v / cap * 100 : 0);
  return `
    <div class="pc-fader-linha">
      ${setaFinoHtml("data-pc-seta-dep", chaveDrag, "menos")}
      <div class="pc-sen-slider${mini ? " pc-sen-slider-mini" : ""}" data-dep-fader="${escaparAtributoHtml(chaveDrag)}">
        <div class="pc-sen-bar"><div class="pc-sen-ticks"></div><div class="pc-sen-fill" style="width:${pct}%"></div></div>
        <div class="pc-sen-votos"></div>
        <div class="pc-sen-grip" style="left:${pct}%"></div>
        <div class="pc-sen-grip-alvo" style="left:${pct}%"></div>
      </div>
      ${setaFinoHtml("data-pc-seta-dep", chaveDrag, "mais")}
    </div>`;
}

// Esqueleto do console (card elevado: linha VOTOS + "i", régua, barra com
// alça mestra, escala e o painel de comandos dentro) — extraído em
// 07/09/2026 pra a tela de aceitar Duelo usar o MESMO console da lista
// (regra do projeto: reusar as classes exatas, não só as cores). Quem
// chama entrega só o conteúdo dos slots; a estrutura/classes são únicas.
function montarConsoleHtml(o) {
  return `
    <div class="pc-console"${o.idConsole ? ` id="${o.idConsole}"` : ""}>
      <div class="pc-sen-osub">
        <span class="pc-sen-lbl">${o.rotuloHtml}</span>
        <span class="pc-sen-num">${o.numHtml}</span>
      </div>
      ${o.extraHtml || ""}
      <div class="pc-sen-regua" style="${o.reguaStyle || ""}"></div>
      <div class="pc-sen-zone" id="${o.idZone}">
        <div class="pc-sen-trk">
          <div class="pc-sen-trkf" id="${o.idFill}" style="width:${o.w}%"></div>
        </div>
        <div class="pc-sen-mgrip" id="${o.idGrip}" style="left:${o.w}%"></div>
      </div>
      <div class="pc-sen-escala">${o.escalaHtml}</div>
      ${o.comandos ? `
      <div class="pc-console-cmds">
        <div class="pc-cmd-painel">
          ${renderBotoesComandos(o.comandos)}
          <button type="button" id="${o.idLegendaToggle}" class="pc-cmd-info${o.legendaAberta ? " aberto" : ""}" title="O que faz cada botão">i</button>
        </div>
      </div>` : ""}
    </div>`;
}

const DOC_APP_URL = "netofloripabr.github.io/simulador-legislativo";
// QR de https://netofloripabr.github.io/simulador-legislativo/ (33×33,
// correção M) — gerado offline uma única vez; um path SVG por linha de
// módulos, sem dependência de biblioteca nem de rede na hora de imprimir.
const DOC_QR_PATH = "M0 0h7v1h-7zM8 0h1v1h-1zM10 0h1v1h-1zM12 0h2v1h-2zM16 0h4v1h-4zM21 0h1v1h-1zM23 0h1v1h-1zM26 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h2v1h-2zM12 1h2v1h-2zM18 1h1v1h-1zM20 1h4v1h-4zM26 1h1v1h-1zM32 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM10 2h3v1h-3zM15 2h1v1h-1zM18 2h1v1h-1zM23 2h2v1h-2zM26 2h1v1h-1zM28 2h3v1h-3zM32 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM14 3h1v1h-1zM16 3h3v1h-3zM22 3h1v1h-1zM24 3h1v1h-1zM26 3h1v1h-1zM28 3h3v1h-3zM32 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM9 4h1v1h-1zM12 4h3v1h-3zM19 4h1v1h-1zM21 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM28 4h3v1h-3zM32 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h2v1h-2zM12 5h2v1h-2zM17 5h3v1h-3zM24 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h7v1h-7zM8 7h1v1h-1zM10 7h2v1h-2zM17 7h1v1h-1zM19 7h1v1h-1zM23 7h2v1h-2zM0 8h1v1h-1zM2 8h2v1h-2zM5 8h3v1h-3zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h6v1h-6zM26 8h1v1h-1zM29 8h1v1h-1zM31 8h2v1h-2zM0 9h1v1h-1zM3 9h1v1h-1zM7 9h1v1h-1zM9 9h2v1h-2zM17 9h4v1h-4zM23 9h1v1h-1zM26 9h2v1h-2zM29 9h2v1h-2zM32 9h1v1h-1zM2 10h2v1h-2zM5 10h4v1h-4zM14 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM23 10h7v1h-7zM31 10h2v1h-2zM0 11h2v1h-2zM3 11h3v1h-3zM9 11h8v1h-8zM18 11h1v1h-1zM23 11h3v1h-3zM27 11h1v1h-1zM29 11h1v1h-1zM32 11h1v1h-1zM1 12h3v1h-3zM6 12h1v1h-1zM8 12h2v1h-2zM15 12h1v1h-1zM18 12h1v1h-1zM20 12h1v1h-1zM22 12h4v1h-4zM27 12h3v1h-3zM0 13h1v1h-1zM3 13h3v1h-3zM11 13h2v1h-2zM16 13h2v1h-2zM19 13h1v1h-1zM21 13h2v1h-2zM24 13h1v1h-1zM27 13h1v1h-1zM29 13h3v1h-3zM3 14h1v1h-1zM5 14h2v1h-2zM8 14h1v1h-1zM10 14h1v1h-1zM12 14h1v1h-1zM15 14h7v1h-7zM26 14h4v1h-4zM0 15h3v1h-3zM5 15h1v1h-1zM9 15h2v1h-2zM12 15h1v1h-1zM14 15h1v1h-1zM16 15h1v1h-1zM21 15h2v1h-2zM25 15h3v1h-3zM29 15h2v1h-2zM0 16h2v1h-2zM3 16h6v1h-6zM13 16h3v1h-3zM18 16h5v1h-5zM25 16h2v1h-2zM28 16h3v1h-3zM2 17h3v1h-3zM7 17h1v1h-1zM13 17h1v1h-1zM15 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h4v1h-4zM28 17h2v1h-2zM32 17h1v1h-1zM3 18h4v1h-4zM8 18h1v1h-1zM11 18h1v1h-1zM14 18h4v1h-4zM20 18h1v1h-1zM24 18h5v1h-5zM30 18h2v1h-2zM3 19h2v1h-2zM7 19h2v1h-2zM12 19h1v1h-1zM16 19h1v1h-1zM20 19h1v1h-1zM22 19h4v1h-4zM28 19h1v1h-1zM31 19h1v1h-1zM4 20h3v1h-3zM8 20h3v1h-3zM18 20h2v1h-2zM21 20h1v1h-1zM29 20h2v1h-2zM32 20h1v1h-1zM0 21h2v1h-2zM3 21h3v1h-3zM7 21h1v1h-1zM9 21h1v1h-1zM14 21h2v1h-2zM17 21h5v1h-5zM23 21h1v1h-1zM25 21h2v1h-2zM29 21h1v1h-1zM32 21h1v1h-1zM4 22h1v1h-1zM6 22h1v1h-1zM12 22h3v1h-3zM16 22h2v1h-2zM20 22h2v1h-2zM23 22h3v1h-3zM31 22h2v1h-2zM1 23h1v1h-1zM5 23h1v1h-1zM7 23h1v1h-1zM13 23h2v1h-2zM16 23h1v1h-1zM18 23h3v1h-3zM22 23h1v1h-1zM24 23h4v1h-4zM29 23h1v1h-1zM31 23h2v1h-2zM0 24h1v1h-1zM2 24h1v1h-1zM4 24h4v1h-4zM10 24h1v1h-1zM15 24h3v1h-3zM22 24h8v1h-8zM31 24h1v1h-1zM8 25h2v1h-2zM13 25h7v1h-7zM21 25h1v1h-1zM24 25h1v1h-1zM28 25h2v1h-2zM0 26h7v1h-7zM8 26h3v1h-3zM13 26h1v1h-1zM16 26h1v1h-1zM19 26h1v1h-1zM23 26h2v1h-2zM26 26h1v1h-1zM28 26h1v1h-1zM31 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM8 27h2v1h-2zM14 27h2v1h-2zM21 27h1v1h-1zM23 27h2v1h-2zM28 27h5v1h-5zM0 28h1v1h-1zM2 28h3v1h-3zM6 28h1v1h-1zM10 28h3v1h-3zM15 28h1v1h-1zM17 28h1v1h-1zM21 28h8v1h-8zM30 28h2v1h-2zM0 29h1v1h-1zM2 29h3v1h-3zM6 29h1v1h-1zM8 29h1v1h-1zM10 29h2v1h-2zM13 29h1v1h-1zM18 29h1v1h-1zM20 29h4v1h-4zM27 29h1v1h-1zM29 29h1v1h-1zM32 29h1v1h-1zM0 30h1v1h-1zM2 30h3v1h-3zM6 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM20 30h2v1h-2zM23 30h2v1h-2zM26 30h2v1h-2zM29 30h2v1h-2zM0 31h1v1h-1zM6 31h1v1h-1zM9 31h4v1h-4zM15 31h3v1h-3zM20 31h1v1h-1zM22 31h3v1h-3zM26 31h3v1h-3zM32 31h1v1h-1zM0 32h7v1h-7zM8 32h2v1h-2zM11 32h1v1h-1zM14 32h8v1h-8zM25 32h2v1h-2zM28 32h1v1h-1zM30 32h1v1h-1z";
