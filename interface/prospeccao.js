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
  cadRascunho: null, // { nome, email, telefone, cpf, cep, genero, lgpd } — preserva o formulário de cadastro quando dá erro, pra não fazer a pessoa digitar tudo de novo (achado do usuário, 24/08/2026)
  status: "",
  modalNomeListaAberto: false, // modal "dê um nome pra essa lista" no primeiro Salvar da Revisão
  listaSalvaId: null, // id exclusivo gerado no primeiro Salvar — reaproveitado nos salvamentos seguintes da mesma lista (edição, não duplicata)
  listaSalvaNome: null, // nome escolhido pela pessoa nesse modal — só pergunta de novo se vier null (ex.: depois de "Sair")
  modoAgrupadoRevisao: {}, // cargo -> true/false — filtro "lista única" (default) vs "agrupado por partido/federação" na Revisão
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
document.addEventListener("pointerdown", (e) => {
  const alvo = e.target.closest("#modoColaborativoWrap button, #modoColaborativoWrap .pc-lobby-tile, #modoColaborativoWrap .pc-lobby-mais-item, #modoColaborativoWrap .pc-amigo-op, #modoColaborativoWrap .pc-notif-acao");
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
// Convite de DUELO (?duelo=DSXX-XXXX, migração 40): guarda até a pessoa
// estar logada — aí o boot abre direto a tela de aceitar aquele duelo.
const _dueloPendente = _paramsIniciais.get("duelo");
if (_dueloPendente) localStorage.setItem("sl_duelo_pendente", _dueloPendente.trim().toUpperCase());

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
    // Saldo REAL da carteira (creditos_conta) — pcState.perfil vem da
    // tabela "perfis", que não tem essa coluna: sem esta carga, todo
    // "saldo: X" da interface (slot trancado, gates) mostrava 0 pra
    // sempre, mesmo com créditos (achado de 22/08/2026 na conferência do
    // caixa). A cobrança em si sempre foi validada no servidor.
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) { /* melhor esforço */ }
    // Pontinho do sino (migração 28) — melhor esforço, igual ao saldo:
    // sem isso a barra superior simplesmente não mostra o indicador.
    try { pcState.notificacoesNaoLidas = await contarNotificacoesNaoLidas(); } catch (e) { /* sem indicador */ }
    // Volta do Mercado Pago (?compra=ok|falhou|pendente na URL, ver
    // back_urls em nuvem/edge-functions/criar-pagamento) — só faz
    // sentido pra quem está logado, que é sempre quem inicia uma compra.
    tratarVoltaDoPagamento();
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
    // Volta do Mercado Pago: pousa direto na Loja pra mostrar o status
    // da compra, em vez de deixar a pessoa procurar.
    if (new URLSearchParams(window.location.search).get("compra")) pcState.subaba = "loja";
    // Convite de duelo pendente (?duelo=, migração 40): resolve o código
    // e pousa direto na tela de aceitar — é o caminho de quem entrou no
    // jogo POR um duelo aberto de WhatsApp.
    try {
      const codigoDuelo = localStorage.getItem("sl_duelo_pendente");
      if (codigoDuelo) {
        const d = await desafioPorCodigo(codigoDuelo);
        localStorage.removeItem("sl_duelo_pendente");
        if (d && !d.sou_o_criador) {
          pcState.desafioAceitarId = d.id;
          pcState.desafioAceitarFase = "convite";
          pcState.desafioAceitarVotos = {};
          pcState.desafioAceitarCadeiras = null;
          pcState._abrirAceitarDueloNoBoot = true;
          pcState.subaba = "desafios";
        } else if (d && d.sou_o_criador) {
          // Criador clicou no PRÓPRIO link (teste comum): em vez de
          // sumir em silêncio, leva pro card do duelo no hub — de lá
          // ele reenvia o convite (achado do usuário, 30/08/2026).
          pcState.desafioDestacadoId = d.id;
          pcState.subaba = "desafios";
        }
      }
    } catch (e) { /* código inválido/expirado — segue o boot normal */ }
    // Estado do logado (auditoria #41, 21/08/2026): lembra a última
    // escolha feita na roleta NESTE aparelho; sem escolha registrada,
    // SC segue como padrão de nascimento do produto.
    try {
      const rEstado = await window.storage.get("pc-estado-escolhido");
      pcState.estado = (rEstado && rEstado.value) || "SC";
    } catch (e) { pcState.estado = "SC"; }
    await garantirRascunhosCarregados();
    // Também pré-carrega os grupos aqui (não só dentro de
    // renderPainelPrincipal) — sem isso, o primeiro render do Painel
    // logo após login/boot sempre esbarrava num "await" ainda não
    // resolvido, e a tela de carregamento própria do Painel piscava de
    // novo por cima da que o boot já tinha acabado de mostrar (achado do
    // usuário, 24/08/2026: "parece carregar duas vezes"). Com os dois
    // caches já quentes antes do primeiro render, renderPainelPrincipal
    // (abaixo) pula a própria tela de carregamento nesse caso.
    if (pcState.perfil) await garantirMeusGruposCarregados();
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
  // EXCEÇÃO: quem chegou por um link de convite (?conv=) pula a capa e
  // vai direto pro cadastro — pedido do usuário, 24/08/2026 ("quando
  // clico ele abre o link do app, a minha ideia é que ele gere o acesso
  // direto para o site"). Antes o código ficava só guardado em silêncio
  // pro cadastro (_resolverConvidadoPor) e a pessoa caía na mesma capa
  // de sempre, sem nenhum sinal de que veio de um convite.
  if (_convitePendente) {
    pcState.pendenteRegistro = true;
    pcState.tela = "cadastro";
  } else {
    pcState.tela = "landing";
  }
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
      salvarRascunhoCargo(pcState.perfil.id, cargo, lista, pcState.estado);
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

// Apaga uma lista local EM ABERTO (convidado). Espelha a trava do banco
// (excluirSalvamento, nuvem/salvamentos.js): nunca chamada pra lista já
// depositada — o botão nem aparece nesse caso (ver linhaDepositada).
async function excluirListaLocal(uf, id) {
  const listas = await carregarListasSalvasLocais(uf);
  const restantes = listas.filter((l) => l.id !== id);
  await salvarListasSalvasLocais(uf, restantes);
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
  // Urna (Minhas listas) no centro, Termômetro no lugar que ela ocupava —
  // pedido do usuário, 25/08/2026. "Menu"/perfil não volta (já tem porta
  // própria no ícone do cabeçalho, pcBtnAbrirPerfil, em toda tela).
  const itens = [
    { id: "painel", icone: "home", label: "Início" },
    { id: "medias", icone: "termometro", label: "Termômetro", gate: gateConvidado },
    { id: "minhas-listas", icone: "ballot", label: "Minhas listas" },
    { id: "grupo", icone: "grupos", label: "Grupos", gate: gateConvidado },
    { id: "ranking", icone: "ranking", label: "Ranking" },
  ];
  // Pill sólido no item ativo (mesmo tratamento de .pc-cargo-switch
  // button.active e das abas do painel admin) em vez de só ponto+texto
  // verde — pedido do usuário, 24/08/2026: "melhorar o padrão visual do
  // painel fixo ao padrão atual". Sem legenda embaixo do ícone (confirmado
  // no protótipo); title/aria-label seguram a acessibilidade.
  const botoes = itens.map((it) => {
    const ativo = it.id === destinoAtivo;
    const cor = it.disabled ? "#5C6268" : (ativo ? "#04140d" : "var(--pc-ink-dim)");
    const titulo = it.disabled ? "Disponível depois do resultado oficial de 2026" : (it.gate ? `${it.label} — precisa se cadastrar` : it.label);
    return `<button data-pc-menu-fixo="${it.id}" ${it.disabled ? "disabled" : ""} title="${titulo}" aria-label="${it.label}" style="flex:1; background:none; border:none; display:flex; justify-content:center; cursor:${it.disabled ? "default" : "pointer"};">
      <span style="display:flex; align-items:center; justify-content:center; padding:11.5px; border-radius:14px; background:${ativo && !it.disabled ? "var(--pc-accent)" : "transparent"}; color:${cor};">
        ${iconeSvg(it.icone, 25)}
      </span>
    </button>`;
  }).join("");
  const aberto = !!pcState.menuFixoAberto;
  return `<div class="pc-menufixo-wrap">
    <button id="pcMenuFixoAlca" aria-label="${aberto ? "Fechar menu de navegação" : "Abrir menu de navegação"}" title="${aberto ? "Fechar menu" : "Abrir menu"}" class="pc-menufixo-grip${aberto ? "" : " fechada"}"></button>
    <div class="pc-menufixo-icones${aberto ? " aberto" : ""}" style="display:flex; padding:0 4px;">${botoes}</div>
  </div>`;
}

// Chamado no fim de todo render de tela (renderColaborativo direto pras
// telas "-convidado", renderAppColaborativo pras subabas) — mostra ou
// esconde a barra. destino null esconde a barra nessa tela. Pílula
// flutuante (redesign 28/08/2026): abre sozinha na primeira tela principal
// de cada sessão e fecha em 3s — só a alça (sempre no mesmo lugar/tamanho)
// fica visível depois disso; navegar entre telas na mesma sessão NÃO reabre
// de novo (senão ficaria piscando a cada troca de aba).
function atualizarMenuFixo(destino) {
  const existente = document.getElementById("pcMenuFixoWrap");
  if (existente) existente.remove();
  clearTimeout(pcState._menuFixoAutoCloseTimer);
  const pcConteudo = document.getElementById("pcConteudo");
  if (!destino) {
    if (pcConteudo) pcConteudo.style.paddingBottom = "";
    return;
  }
  // Respiro fixo (cabe a pílula aberta + a folga de 16px até a borda),
  // independente do estado — ela flutua por CIMA do conteúdo, então o
  // espaço reservado tem que já contar com o caso mais alto (aberta).
  if (pcConteudo) pcConteudo.style.paddingBottom = "92px";
  pcState._menuFixoDestinoAtual = destino;
  const wrap = document.getElementById("modoColaborativoWrap");
  if (!wrap) return;
  // Só a primeira tela principal da sessão abre sozinha (e arma o
  // fechamento automático); trocar de tela depois, ou reabrir manualmente
  // mais tarde, não reagenda o fechamento — senão o menu "piscaria"
  // sozinho de novo a cada navegação.
  if (!pcState._menuFixoAbriuNaSessao) {
    pcState.menuFixoAberto = true;
    pcState._menuFixoAbriuNaSessao = true;
    pcState._menuFixoAutoClosePendente = true;
  }
  const div = document.createElement("div");
  div.id = "pcMenuFixoWrap";
  div.innerHTML = renderMenuFixo(destino);
  wrap.appendChild(div);
  document.getElementById("pcMenuFixoAlca").addEventListener("click", () => {
    pcState.menuFixoAberto = !pcState.menuFixoAberto;
    clearTimeout(pcState._menuFixoAutoCloseTimer);
    pcState._menuFixoAutoClosePendente = false; // abriu/fechou na mão — o automático não interfere mais
    atualizarMenuFixo(pcState._menuFixoDestinoAtual);
  });
  document.querySelectorAll("[data-pc-menu-fixo]:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => irParaDestinoMenuFixo(btn.getAttribute("data-pc-menu-fixo")));
  });
  // Flag "pendente" em vez de armar só na abertura: qualquer re-render da
  // tela dentro dos 3s (o modal de tutorial abrindo, um refresh assíncrono)
  // passa por esta função de novo e cancelava o timer no clearTimeout do
  // topo — a barra ficava aberta pra sempre (achado do usuário, 28/08/2026,
  // testando no site publicado). Enquanto o fechamento automático estiver
  // pendente e a barra aberta, re-arma a cada render até disparar.
  if (pcState._menuFixoAutoClosePendente && pcState.menuFixoAberto) {
    pcState._menuFixoAutoCloseTimer = setTimeout(() => {
      pcState._menuFixoAutoClosePendente = false;
      pcState.menuFixoAberto = false;
      atualizarMenuFixo(pcState._menuFixoDestinoAtual);
    }, 3000);
  }
}

function irParaDestinoMenuFixo(destino) {
  // Fecha de volta pra alça ao navegar — abrir e já sair não deve deixar
  // a barra aberta "grudada" na tela seguinte.
  pcState.menuFixoAberto = false;
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
  if (gateConvidado && (destino === "medias" || destino === "grupo" || destino === "menu")) {
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
  // Mesma régua da TELA (achado 9 da revisão 22/08): no Senador a tela usa
  // a projeção oficial do estado (validosOficiaisProjetados) — o farol
  // usava só a genérica e podia marcar pendente com a barra em 100%.
  const proj = cid === "senador"
    ? (validosOficiaisProjetados() || totalValidosProjetado2026(cid))
    : totalValidosProjetado2026(cid);
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
  if (passo && passo.fase === "A" && (pcState._farolContexto || "palpite") === "palpite") {
    const st = _farolStatusCargo(passo.cargoId);
    const ehSen = passo.cargoId === "senador";
    return `
      ${_farolLinhaTrilha(st.vagasOk ? ck : "1", ehSen ? "Indicar os " + st.totalVagas + " eleitos" : "Preencher as vagas por partido", {
        feito: st.vagasOk, atual: passo.num === 1, progresso: st.ind + " de " + st.totalVagas,
        texto: passo.num === 1 ? (ehSen ? "Toque no candidato ou arraste a barra dele até o selo ELEITO acender." : `Comece decidindo o tamanho das bancadas: toque no box <span class="pc-farol-minibox">− 8 +</span> de cada partido e marque quantas cadeiras ele ganha, até fechar as ${st.totalVagas}.`) : "",
      })}
      ${_farolLinhaTrilha(st.votosOk ? ck : "2", "Distribuir a votação pelos candidatos", {
        feito: st.votosOk, atual: passo.num === 2, progresso: Math.round(st.pct * 100) + "%",
        texto: passo.num === 2 ? `Atribua o seu palpite para os candidatos que você conhece: arraste a alça ou digite os votos do candidato. Depois, você palpita nos candidatos que não conhece, ou utiliza o mágico <span class="pc-farol-minicmd">${iconeSvg("completar", 11)}</span> que completa a votação com os votos proporcionais para completar o número de vagas que você selecionou — sem mexer no que você preencheu.<br><br>Repare nas agulhas que nascem na régua do partido: a cinza mostra onde o quociente fecha (N×QP) e a verde onde entra vaga pela média (N×M) — é a apuração reagindo à sua votação em tempo real.` : "",
      })}
      ${_farolLinhaTrilha("3", "Salvar e revisar", {
        atual: passo.num === 3,
        texto: `Fechou a votação? Salve com o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span>. Repita nos três cargos e siga pra Revisão por "Minhas listas".`,
      })}`;
  }
  // Fora da tela de palpite a trilha muda de conversa conforme a tela
  // (farol dinâmico, aprovado em 21/08/2026): mesma moldura e nível, mas o
  // conteúdo fala do que dá pra fazer AQUI — inclusive quando a montagem
  // (fase A) ainda está pendente, em vez de explicar controles que não
  // estão nesta tela.
  const ctx = pcState._farolContexto || "palpite";
  const faseA = !!(passo && passo.fase === "A");
  const num = passo ? (faseA ? 3 : passo.num) : 99;
  if (ctx === "listas") {
    return `
      ${_farolLinhaTrilha(num > 4 ? ck : "1", "Ter uma lista completa e salva", { feito: num > 4, atual: num <= 4, texto: num <= 4 ? (faseA ? `Seu palpite ainda não fechou os 3 cargos — toque na lista pra continuar de onde parou.` : `Confira os três cargos na Revisão e salve — o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span>.`) : "" })}
      ${_farolLinhaTrilha(num > 5 ? ck : "2", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? `A urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> deposita: trava a lista e ela passa a valer no ranking. A primeira é grátis.` : "" })}
      ${_farolLinhaTrilha(num > 6 ? ck : "3", "Convidar e comparar", { feito: num > 6, atual: num === 6, texto: num === 6 ? "Compartilhe o convite de duelo — cada amigo que entrar e depositar rende créditos." : "" })}`;
  }
  if (ctx === "duelos") {
    const temLista = !(passo && passo.fase === "A");
    return `
      ${_farolLinhaTrilha(temLista ? ck : "1", "Ter um palpite pra apostar", { feito: temLista, atual: !temLista, texto: !temLista ? "O duelo puxa os votos da sua lista — continue o palpite primeiro (o farol te guia lá dentro)." : "" })}
      ${_farolLinhaTrilha("2", "Criar o duelo e enviar o convite", { atual: temLista, texto: temLista ? `Toque em <b>Criar duelo</b>, escolha a disputa e envie o cartão pro seu amigo no WhatsApp — duelar é sempre grátis.` : "" })}
      ${_farolLinhaTrilha("3", "Acompanhar o duelo selado", { texto: "Quando o rival depositar, o sino avisa — a comparação fica aqui e em Minhas listas → Cédulas de duelo até a apuração." })}`;
  }
  if (ctx === "grupos") {
    const temDeposito = !!pcState.farolTemDeposito;
    return `
      ${_farolLinhaTrilha(temDeposito ? ck : "1", "Ter uma cédula depositada", { feito: temDeposito, atual: !temDeposito, texto: !temDeposito ? `O grupo compara cédulas DEPOSITADAS — termine o palpite e deposite a sua primeiro (a urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> em Minhas listas).` : "" })}
      ${_farolLinhaTrilha("2", "Criar ou entrar num grupo", { atual: temDeposito, texto: temDeposito ? "Crie o seu grupo (família, trabalho, bar...) ou entre com o código que te mandaram." : "" })}
      ${_farolLinhaTrilha("3", "Convidar e comparar", { texto: "Convide os amigos pro grupo — o ranking interno compara as cédulas de todo mundo na apuração." })}`;
  }
  if (ctx === "revisao") {
    return `
      ${_farolLinhaTrilha(num > 4 ? ck : "1", "Conferir os 3 cargos", { feito: num > 4, atual: num <= 4, texto: num <= 4 ? "Os blocos abaixo mostram os eleitos que a sua votação fecha em cada cargo — confira antes de salvar." : "" })}
      ${_farolLinhaTrilha(num > 4 ? ck : "2", "Salvar a lista", { feito: num > 4, atual: num === 4, texto: num === 4 ? `O botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span> guarda a lista em Minhas listas — editável até depositar.` : "" })}
      ${_farolLinhaTrilha(num > 5 ? ck : "3", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? `Em Minhas listas, a urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> deposita — trava e vale no ranking.` : "" })}`;
  }
  // ctx "painel" (e qualquer outra tela com o bloco): a reta completa; se a
  // montagem está pendente, o passo 1 vira o atual e aponta pro palpite.
  let progMontar = "";
  if (faseA) {
    const sts = CARGOS.map((c) => _farolStatusCargo(c.id));
    progMontar = sts.reduce((t, x) => t + x.ind, 0) + " de " + sts.reduce((t, x) => t + x.totalVagas, 0) + " vagas";
  }
  return `
    ${_farolLinhaTrilha(faseA ? "1" : ck, "Montar os 3 cargos", { feito: !faseA, atual: faseA, progresso: progMontar, texto: faseA ? "Toque em <b>Continuar palpite</b> — lá dentro o farol te guia cargo a cargo." : "" })}
    ${_farolLinhaTrilha(num > 4 ? ck : "4", "Revisar e salvar a lista", { feito: num > 4, atual: num === 4, texto: num === 4 ? `Confira os três cargos e salve — o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span> na Revisão. A lista fica em Minhas listas, editável.` : "" })}
    ${_farolLinhaTrilha(num > 5 ? ck : "5", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? `Em Minhas listas, a urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> deposita — trava a lista e ela passa a valer no ranking. A primeira é grátis.` : "" })}
    ${_farolLinhaTrilha(num > 6 ? ck : "6", "Convidar e comparar", { feito: num > 6, atual: num === 6, texto: num === 6 ? `Compartilhe o convite de duelo ou crie um grupo <span class="pc-farol-minicmd">${iconeSvg("convidar", 11)}</span> — cada amigo que entrar e depositar rende créditos.` : "" })}`;
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
      ${(() => {
        const ctxB = pcState._farolContexto || "palpite";
        if (ctxB === "duelos") return `<span class="pc-farol-txt">${passo && passo.fase === "A" ? "O duelo usa a sua lista — continue o palpite primeiro" : "Crie um duelo e envie o convite pro seu amigo — é grátis"}</span>`;
        if (ctxB === "grupos") return `<span class="pc-farol-txt">${pcState.farolTemDeposito ? "Crie ou entre num grupo e convide os amigos" : "Deposite a sua cédula primeiro — o grupo compara cédulas depositadas"}</span>`;
        return passo
          ? `<span class="pc-farol-passo">Passo ${passo.num}</span><span class="pc-farol-txt">${ctxB !== "palpite" && passo.fase === "A" ? "Continue o palpite — " + passo.rotuloCargo : passo.rotulo}${passo.progresso ? " — " + passo.progresso : ""}</span>`
          : `<span class="pc-farol-txt" style="color:var(--pc-ink-dim);">Tudo em dia — nada pendente</span>`;
      })()}
      <button type="button" class="pc-farol-min" id="pcFarolMin" title="Recolher">−</button>
    </div>`;
  }
  const ctxTitulo = pcState._farolContexto || "palpite";
  const titulo = !passo
    ? "Sua trilha — tudo em dia"
    : ctxTitulo === "listas" ? "Sua trilha — minhas listas"
    : ctxTitulo === "duelos" ? "Sua trilha — duelos"
    : ctxTitulo === "grupos" ? "Sua trilha — grupos"
    : ctxTitulo === "revisao" ? "Sua trilha — revisão"
    : ctxTitulo === "painel" ? "Sua trilha"
    : (passo.fase === "A" ? "Sua trilha — " + passo.rotuloCargo : "Sua trilha — reta final");
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
      <div class="pc-erro">Não consegui conectar ao servidor agora. Verifique sua conexão e recarregue a página — seu rascunho local continua guardado neste aparelho.</div>
    </div>`;
    return;
  }
  if (pcState.tela === "carregando") {
    el.innerHTML = telaCarregando();
    return;
  }
  if (pcState.tela === "landing") return renderLanding();
  if (pcState.tela === "estado") return renderTelaEstado();
  if (pcState.tela === "selecao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderSelecaoCandidatos(); atualizarMenuFixo("selecao"); return; }
  if (pcState.tela === "revisao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderRevisaoDeposito(); atualizarMenuFixo("revisao"); return; }
  if (pcState.tela === "deposito-confirmado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderDepositoConfirmado(); atualizarMenuFixo("deposito-confirmado"); return; }
  if (pcState.tela === "painel-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderPainelPrincipal(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "minhas-listas-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderMinhasListas(); atualizarMenuFixo("minhas-listas"); return; }
  if (pcState.tela === "ranking-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderRankingPlaceholder(); atualizarMenuFixo("ranking"); return; }
  if (pcState.tela === "ajuda-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderCentralAjuda(); atualizarMenuFixo(null); return; }
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
    // Modo "trocar estado" do usuário logado (30/08/2026): voltar cai no
    // Painel, não na capa de acesso.
    if (pcState.trocaEstadoLogado) {
      pcState.trocaEstadoLogado = false;
      pcState.subaba = "painel";
      renderAppColaborativo();
      return;
    }
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
    const confirmMsg = document.getElementById("pcEstadoConfirmMsg");
    const btnConfirmar = document.getElementById("pcBtnConfirmarEstado");
    // A roleta agenda este código via requestAnimationFrame — se a pessoa
    // confirmar o estado no meio de um scroll, o quadro chega DEPOIS da
    // tela trocar e os elementos já não existem (TypeError visto no
    // console em 21/08/2026). Sem eles, não há mais o que atualizar.
    if (!confirmMsg || !btnConfirmar) return;
    confirmMsg.textContent = estado.disponivel
      ? `${vagasFixasCargo(estado.sigla, "estadual")} vagas de Dep. Estadual · ${vagasFixasCargo(estado.sigla, "federal")} de Federal · ${vagasFixasCargo(estado.sigla, "senador")} de Senador`
      : "Ainda sem candidatos carregados — em breve.";
    btnConfirmar.disabled = !estado.disponivel;
  }
  picker.addEventListener("scroll", () => requestAnimationFrame(atualizarPicker));

  itensEls.forEach((it) => {
    if (it.classList.contains("pc-picker-disabled")) return;
    it.addEventListener("click", () => {
      picker.scrollTop = it.offsetTop + it.offsetHeight / 2 - picker.clientHeight / 2;
    });
  });

  // Nasce centralizada em SP (decisão 21/08/2026 — maior eleitorado e
  // tendência de mais acessos); fallback SC se SP sumir da lista.
  const scItem = picker.querySelector('[data-uf="SP"]') || picker.querySelector('[data-uf="SC"]');
  picker.scrollTop = scItem.offsetTop + scItem.offsetHeight / 2 - picker.clientHeight / 2;
  atualizarPicker();

  document.getElementById("pcBtnConfirmarEstado").addEventListener("click", async () => {
    pcState.estado = ufCentralizado;
    try { window.storage.set("pc-estado-escolhido", ufCentralizado); } catch (e) { /* sem storage, segue */ }
    // Logado trocando de estado: limpa TODO cache por-estado (rascunhos,
    // palpites em edição, ordem congelada) — cada UF tem os próprios
    // rascunhos no banco (migração 27), nada se perde na troca.
    if (pcState.trocaEstadoLogado) {
      pcState.trocaEstadoLogado = false;
      pcState.palpitesPorCargo = {};
      pcState.palpiteEdicao = null;
      pcState.ordemPartidosFixa = null;
      pcState.desafioCriarCadeiras = null;
      await garantirRascunhosCarregados();
      pcState.subaba = "painel";
      renderAppColaborativo();
      return;
    }
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
  // Estado da lista compartilhada (coluna "estado" da migração 27) — SC
  // de reserva pra linhas antigas, de antes da coluna existir.
  pcState.estado = (dados && dados.estado) || "SC";
  const linha = (c, i, rotulo) => `
    <div style="display:flex; align-items:baseline; gap:8px; padding:6px 0; border-bottom:1px solid #23262A; font-size:12.5px;">
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
      <div class="pc-sub" style="margin:0;">Simulador Eleitoral — Legislativo 2026 — ${(typeof ESTADOS_BRASIL !== "undefined" && (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome) || pcState.estado}</div>
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
  pcState.cadRascunho = null;
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
function pilulasGenero(idCampo, valorInicial) {
  return `<input type="hidden" id="${idCampo}" value="${valorInicial || ""}">
  <div class="pc-acesso-genero" data-pc-genero-alvo="${idCampo}">
    ${["Feminino", "Masculino", "Outro"].map((g) => `<button type="button" data-pc-genero="${g}"${g === valorInicial ? ' class="on"' : ""}>${g}</button>`).join("")}
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
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "landing", subaba: "selecao", estado: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, erro: "", status: "" };
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
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "landing", subaba: "selecao", estado: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, erro: "", status: "" };
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
  // Preserva o que a pessoa já digitou quando a tela volta por erro
  // (achado do usuário, 24/08/2026: antes o formulário inteiro limpava,
  // mesmo pra um erro isolado tipo "CEP não encontrado" — obrigava
  // redigitar tudo). Senha de propósito NÃO entra aqui — a pessoa digita
  // de novo, mesmo padrão de qualquer formulário de senha.
  const r = pcState.cadRascunho || {};
  // Convite pessoal (?conv=, ver o boot em initColaborativo): a pessoa já
  // pulou a capa direto pra cá — esse aviso é o único sinal visual de que
  // ela veio de um link de amigo, já que o código em si fica silencioso
  // no localStorage até o cadastro terminar (_resolverConvidadoPor).
  const veioDeConvite = !!localStorage.getItem("sl_convite_pendente");
  el.innerHTML = `
    <div class="pc-acesso" style="max-width:460px;">
      ${cascaAcessoTopo("pcBtnVoltarCadastro")}
      <div class="pc-acesso-h2">Crie sua conta</div>
      ${veioDeConvite ? `<div class="pc-aviso-card" style="margin-bottom:14px;"><div class="pc-aviso-corpo">Você entrou por um convite de amigo — crie sua conta grátis e cravem os palpites de 2026.</div></div>` : ""}
      <div class="pc-acesso-sub">Grátis. Deposite sua cédula, entre em grupos e dispute o ranking.</div>
      <div class="field-row"><label>Nome</label><input class="cell" id="pcCadNome" value="${escaparAtributoHtml(r.nome || "")}"></div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Você pode divulgar seu palpite de forma anônima — essa escolha é feita depois, na hora de depositar cada cédula, não aqui.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcCadEmail" type="email" value="${escaparAtributoHtml(r.email || "")}"></div>
      <div class="field-row"><label>Telefone</label><input class="cell" id="pcCadTelefone" inputmode="tel" placeholder="(00) 00000-0000" value="${escaparAtributoHtml(r.telefone || "")}"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcCadSenha" type="password"></div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Pelo menos 8 caracteres, com letra, número e caractere especial.</div>
      <div class="field-row">
        <label>CPF</label>
        <input class="cell" id="pcCadCpf" inputmode="numeric" placeholder="Só números" maxlength="14" value="${escaparAtributoHtml(r.cpf || "")}">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CPF só pra impedir que a mesma pessoa crie mais de uma conta (protege o ranking) — guardamos um código derivado dele, nunca o CPF em texto puro.</div>
      <div class="field-row">
        <label>CEP</label>
        <input class="cell" id="pcCadCep" inputmode="numeric" placeholder="00000-000" maxlength="9" value="${escaparAtributoHtml(r.cep || "")}">
      </div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Usamos seu CEP só pra saber seu município — ajuda a gente a entender melhor quem está usando o Simulador.</div>
      <div class="field-row">
        <label>Gênero</label>
        ${pilulasGenero("pcCadGenero", r.genero)}
      </div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCadLgpd" style="margin-top:2px;"${r.lgpd ? " checked" : ""}>
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
    pcState.cadRascunho = null;
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
    // Guarda ANTES de validar — qualquer branch de erro abaixo re-renderiza
    // a tela, e é esse rascunho que a repovoa (senha fica de fora, de
    // propósito).
    pcState.cadRascunho = { nome, email, telefone, cpf, cep, genero, lgpd: lgpdAceito };

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
    pcState.cadRascunho = null;
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
    else if (acaoPendente === "desafios") { pcState.subaba = "desafios"; renderAppColaborativo(); }
    else if (acaoPendente === "loja") { pcState.subaba = "loja"; renderAppColaborativo(); }
  });
}

// ---------- App (logado) ----------

function renderAppColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  // O Painel tem barra própria (logo + saldo + convidar + sino + perfil,
  // ver renderPainelPrincipal) — repetir "Olá, nome" + botão de perfil
  // aqui virava duplicação visual (achado do usuário, 24/08/2026). Nas
  // demais subabas, sem barra própria, o card genérico segue existindo.
  const semCardGenerico = pcState.subaba === "painel";
  el.innerHTML = `
    ${semCardGenerico ? "" : `
    <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <div><h2 style="margin:0;">Olá, ${pcState.perfil ? pcState.perfil.nome : "visitante"}</h2>
      <div class="pc-sub" style="margin:4px 0 0;">${pcState.perfil && pcState.perfil.escopo === "partido" ? `Prevendo: ${pcState.perfil.partido_escopo}` : "Prevendo: chapa completa"}</div></div>
      ${pcState.perfil ? `<button class="pc-mini-btn" id="pcBtnAbrirPerfil" title="Menu">${iconeSvg("perfil", 18)}</button>` : ""}
    </div>`}
    <div id="pcConteudo"></div>
  `;
  if (pcState.perfil && !semCardGenerico) {
    document.getElementById("pcBtnAbrirPerfil").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
    });
  }

  // Seleção/Revisão/confirmação de depósito voltaram a mostrar a barra
  // (pedido do usuário, 25/08/2026: "já podemos incluir o menu fixo na
  // maioria das telas, agora que temos a função da alça") — fechada por
  // padrão, não rouba espaço do foco da tarefa. Só o Painel continua null:
  // ele já tem barra própria (logo + saldo + convidar + sino + perfil,
  // ver o header de renderPainelPrincipal), duplicar aqui seria redundante.
  if (pcState.subaba === "selecao") { renderSelecaoCandidatos(); atualizarMenuFixo("selecao"); }
  else if (pcState.subaba === "revisao") { renderRevisaoDeposito(); atualizarMenuFixo("revisao"); }
  else if (pcState.subaba === "deposito-confirmado") { renderDepositoConfirmado(); atualizarMenuFixo("deposito-confirmado"); }
  else if (pcState.subaba === "painel") { renderPainelPrincipal(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "minhas-listas") { renderMinhasListas(); atualizarMenuFixo("minhas-listas"); }
  else if (pcState.subaba === "medias") { renderQuadroMedias(); atualizarMenuFixo("medias"); }
  else if (pcState.subaba === "grupo") {
    // Sub-navegação dentro de "grupo" (telaGrupo: criar/entrar/membro) —
    // antes esse roteador ignorava telaGrupo e sempre voltava pro hub
    // (bug: reabrir o app com "criar grupo" ou uma comparação de grupo
    // aberta perdia o lugar e caía no hub sem aviso). grupoAtivo some em
    // qualquer re-render fora dessa sessão (nunca persiste), então
    // "membro" sem grupoAtivo também cai no hub — não tem o que reabrir.
    if (pcState.telaGrupo === "criar") renderGrupoCriar();
    else if (pcState.telaGrupo === "entrar") renderGrupoEntrar();
    else if (pcState.telaGrupo === "membro" && pcState.grupoAtivo) renderGrupoMembro();
    else renderGrupoHub();
    atualizarMenuFixo("grupo");
  }
  else if (pcState.subaba === "menu") { renderMenuConta(); atualizarMenuFixo("menu"); }
  else if (pcState.subaba === "ranking") { renderRankingPlaceholder(); atualizarMenuFixo("ranking"); }
  // Essas 8 eram telas "sem saída" — só o botão de voltar no topo, sem
  // jeito de pular direto pro lobby ou outra aba (achado do usuário,
  // 24/08/2026). Nenhuma delas é um dos 6 destinos da barra, então
  // passar o próprio nome da subaba mostra a barra sem nada aceso —
  // mesmo efeito de "nenhum destino ativo", só que com a barra visível.
  else if (pcState.subaba === "meu-perfil") { renderMeuPerfil(); atualizarMenuFixo("meu-perfil"); }
  else if (pcState.subaba === "ajuda") { renderCentralAjuda(); atualizarMenuFixo("ajuda"); }
  else if (pcState.subaba === "admin") { renderAdminPainel(); atualizarMenuFixo("admin"); }
  else if (pcState.subaba === "usuario-final") { renderPainelUsuarioFinal(); atualizarMenuFixo("usuario-final"); }
  else if (pcState.subaba === "desafios") {
    if (pcState._abrirAceitarDueloNoBoot) {
      pcState._abrirAceitarDueloNoBoot = false;
      renderAceitarDesafio();
      atualizarMenuFixo("desafios");
    } else { renderDesafiosHub(); atualizarMenuFixo("desafios"); }
  }
  else if (pcState.subaba === "carteira") { renderCarteira(); atualizarMenuFixo("carteira"); }
  else if (pcState.subaba === "loja") { renderLoja(); atualizarMenuFixo("loja"); }
  else if (pcState.subaba === "notificacoes") { renderNotificacoes(); atualizarMenuFixo("notificacoes"); }
  // Subaba desconhecida (typo, sessão antiga restaurada): cai no PAINEL,
  // não mais no Ranking por acidente — o ranking ganhou ramo explícito
  // acima (auditoria de telas, 22/08/2026; antes 3 setters dependiam do
  // else final e qualquer valor inválido sumia calado no Ranking).
  else { pcState.subaba = "painel"; renderPainelPrincipal(); atualizarMenuFixo("painel"); }
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
  pcState = { iniciado: true, sessao: null, perfil: null, tela: "login", subaba: "selecao", estado: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, erro: "", status: "" };
  renderColaborativo();
}

// Tela "Menu" — recepção de conta (card de perfil + Conta/Sobre/Sair),
// redesenhada em 16/08/2026 a partir de referências visuais trazidas pelo
// usuário (mockup aprovado antes de programar, ver histórico da conversa).
// Cada linha daqui é só navegação/gatilho — a lógica de verdade continua
// nas telas de destino (renderMeuPerfil, renderCentralAjuda, o modal de
// reportar problema, etc.), sem duplicar nada.
function renderMenuConta() {
  // Revalida o saldo em segundo plano ao abrir o Menu — se mudou (convite
  // que rendeu, gasto em outro aparelho), o cartão atualiza sozinho.
  if (pcState.perfil && !pcState._saldoRevalidando) {
    pcState._saldoRevalidando = true;
    obterSaldoCreditos(pcState.perfil.id).then((s2) => {
      pcState._saldoRevalidando = false;
      if (pcState.perfil && pcState.perfil.creditos !== s2) {
        pcState.perfil.creditos = s2;
        if (pcState.subaba === "menu") renderMenuConta();
      }
    }).catch(() => { pcState._saldoRevalidando = false; });
  }
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
      <span title="Sua carteira — toque em Créditos pro extrato" style="flex-shrink:0; display:flex; align-items:center; gap:5px; background:#101214; border:1px solid #23262A; border-radius:999px; padding:5px 10px; font-size:11px; font-weight:750; color:var(--pc-accent); font-variant-numeric:tabular-nums;">${iconeSvg("credito", 12)}${Number(p.creditos ?? 0).toLocaleString("pt-BR")}</span>
      <button id="pcBtnEditarPerfilMenu" class="pc-mini-btn" title="Editar meus dados" style="flex-shrink:0;">${iconeSvg("editar", 15)}</button>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Conta</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuDados", "perfil", "#2C3239", "Meus dados", "Telefone, CEP, município, gênero")}
      ${linhaMenu("pcBtnMenuSenha", "chave", "#2C3239", "Trocar senha", "Atualize sua senha de acesso")}
      ${linhaMenu("pcBtnMenuCreditos", "credito", "#2C3239", "Créditos", `Saldo: ${Number(p.creditos ?? 0).toLocaleString("pt-BR")} crédito${(p.creditos ?? 0) === 1 ? "" : "s"} — toque pro extrato`)}
      <div style="display:flex; align-items:center; gap:13px; padding:14px 16px; border-bottom:1px solid var(--pc-glass-border);">
        <div style="width:36px; height:36px; border-radius:10px; background:#2C3239; border:1px solid #4D545C; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconeSvg("alerta", 17)}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:600;">Notificações por e-mail</div>
          <div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:1px;">Avisos de grupo e da eleição (em breve)</div>
        </div>
        <label class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcToggleNotifEmail" ${p.notif_email ? "checked" : ""}><span class="pc-switch-slider"></span></label>
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
          <button id="pcBtnConfirmarExcluirConta" style="flex:1; background:var(--pc-danger); border:1px solid var(--pc-danger); color:#fff; font-family:var(--sans); font-weight:700; border-radius:8px; cursor:pointer;">Excluir</button>
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

const ROTULO_TIPO_CONTA = { admin: "Admin", usuario_final: "Usuário final", padrao: "Padrão" };

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

  const f = pcState.adminUsuariosFiltro || {};
  // Lista individual abaixo do painel analítico, com filtro por categoria
  // (gênero/UF/período/status de cédula/tipo de conta) — mesma linguagem
  // visual do "relatório" já usada no documento impresso e no extrato do
  // Financeiro: nome em destaque + linha de metadados discreta + métrica
  // alinhada à direita (pedido do usuário, 24/08/2026).
  let listaHtml = "";
  if (pcState.adminUsuariosResultados) {
    const linhas = pcState.adminUsuariosResultados;
    listaHtml = !linhas.length
      ? estadoVazio({ icone: "buscar", titulo: "Nenhum usuário encontrado", texto: "Ninguém bateu com esses filtros — tenta afrouxar o recorte." })
      : `
      <div class="pc-sub" style="margin:14px 0 8px;">${linhas.length} conta${linhas.length === 1 ? "" : "s"} encontrada${linhas.length === 1 ? "" : "s"}${linhas.length === 200 ? " (mostrando as 200 mais recentes)" : ""}</div>
      <div class="pc-lobby-card">${linhas.map((u) => `
        <div class="pc-lobby-linha" style="align-items:flex-start;">
          <span style="min-width:0;">
            <div style="font-size:12.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${u.nome}${u.tipo_conta !== "padrao" ? ` <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#07230C; background:var(--pc-accent); border-radius:999px; padding:1px 6px;">${ROTULO_TIPO_CONTA[u.tipo_conta]}</span>` : ""}</div>
            <div style="font-size:10.5px; color:var(--pc-ink-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${u.email}</div>
            <div style="font-size:10px; color:var(--pc-ink-faint); margin-top:2px;">${u.genero || "gênero —"} · ${u.uf_residencia || "UF —"} · cadastro ${new Date(u.criado_em).toLocaleDateString("pt-BR")}</div>
          </span>
          <span style="flex-shrink:0; text-align:right;">
            <b style="font-size:11px; color:${u.cedulas_depositadas > 0 ? "var(--pc-accent)" : "var(--pc-ink-faint)"};">${u.cedulas_depositadas} cédula${u.cedulas_depositadas === 1 ? "" : "s"}</b>
            ${u.cargos_depositados ? `<div style="font-size:9.5px; color:var(--pc-ink-faint); max-width:110px;">${u.cargos_depositados}</div>` : ""}
          </span>
        </div>`).join("")}</div>`;
  }

  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      ${cartao("Total de cadastros", stats.total_cadastros)}
      ${cartao("Cadastros (7 dias)", stats.cadastros_7_dias)}
      ${cartao("Cadastros (30 dias)", stats.cadastros_30_dias)}
      ${cartao("Grupos criados", stats.total_grupos)}
      ${cartao("Cédulas depositadas", stats.total_cedulas_depositadas)}
      ${cartao("Depositadas (7 dias)", stats.cedulas_depositadas_7_dias)}
    </div>

    <div class="glass-card" style="margin-top:14px; padding:16px;">
      <div style="font-size:13px; font-weight:700; margin-bottom:10px;">Lista de usuários</div>
      <div class="field-row"><label>Gênero</label>
        <select class="cell" id="pcAdminUsuGenero">
          <option value="">Todos</option>
          <option value="Masculino" ${f.genero === "Masculino" ? "selected" : ""}>Masculino</option>
          <option value="Feminino" ${f.genero === "Feminino" ? "selected" : ""}>Feminino</option>
          <option value="Outro" ${f.genero === "Outro" ? "selected" : ""}>Outro</option>
        </select>
      </div>
      <div class="field-row"><label>UF de residência</label><input class="cell" id="pcAdminUsuUf" value="${f.uf || ""}" placeholder="ex: SC" maxlength="2" style="text-transform:uppercase;"></div>
      <div class="field-row"><label>Cadastro de</label><input class="cell" id="pcAdminUsuDesde" type="date" value="${f.desde || ""}"></div>
      <div class="field-row"><label>Cadastro até</label><input class="cell" id="pcAdminUsuAte" type="date" value="${f.ate || ""}"></div>
      <div class="field-row"><label>Cédula</label>
        <select class="cell" id="pcAdminUsuStatusCedula">
          <option value="">Todos</option>
          <option value="depositou" ${f.statusCedula === "depositou" ? "selected" : ""}>Depositou</option>
          <option value="nao_depositou" ${f.statusCedula === "nao_depositou" ? "selected" : ""}>Não depositou</option>
        </select>
      </div>
      <div class="field-row"><label>Tipo de conta</label>
        <select class="cell" id="pcAdminUsuTipoConta">
          <option value="">Todos</option>
          <option value="padrao" ${f.tipoConta === "padrao" ? "selected" : ""}>Padrão</option>
          <option value="usuario_final" ${f.tipoConta === "usuario_final" ? "selected" : ""}>Usuário final</option>
          <option value="admin" ${f.tipoConta === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </div>
      <button class="primary" id="pcBtnAdminListarUsuarios" style="width:100%;">Buscar</button>
    </div>
    ${listaHtml}`;
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
  const reais = (centavos) => (Number(centavos || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const faturamentoIndisponivel = stats.valor_faturado_centavos === undefined;
  return `
    <div class="glass-card" style="margin-bottom:10px; padding:16px; text-align:center; border-color:rgba(52,232,74,.35);">
      <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim);">Valor faturado</div>
      ${faturamentoIndisponivel
        ? `<div class="pc-sub" style="margin-top:6px;">Indisponível — rode a migração 31 (nuvem/migracao-31-financeiro-valor-faturado.sql) no SQL Editor.</div>`
        : `<div style="font-size:28px; font-weight:800; color:var(--pc-accent); margin-top:4px;">${reais(stats.valor_faturado_centavos)}</div>
           <div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:2px;">${reais(stats.valor_faturado_30_dias_centavos)} nos últimos 30 dias · ${Number(stats.pedidos_aprovados || 0).toLocaleString("pt-BR")} pedido${stats.pedidos_aprovados === 1 ? "" : "s"} aprovado${stats.pedidos_aprovados === 1 ? "" : "s"}</div>
           <div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:6px;">Só compra real pela Loja (Mercado Pago) — créditos concedidos manualmente abaixo não entram aqui.</div>`}
    </div>

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
      <div class="pc-sub" style="margin-bottom:12px;">Pra compra real feita pela Loja (Mercado Pago), o crédito já é automático — não use isto pra ela. Tudo que sai daqui entra no relatório financeiro como <b>concedido</b> (nunca como vendido) — é o que separa, no relatório, o que foi atribuído de graça do que foi de fato vendido. Tudo vira linha no extrato, nada é silencioso.</div>
      <div class="field-row"><label>E-mail da conta</label><input class="cell" id="pcAdminCreditoEmail" type="email" placeholder="pessoa@exemplo.com"></div>
      <div class="field-row"><label>Motivo</label>
        <select class="cell" id="pcAdminCreditoCanal">
          <option value="">Selecione</option>
          <option value="Cortesia">Cortesia</option>
          <option value="Correção de erro">Correção de erro</option>
          <option value="Jogador base">Jogador base</option>
          <option value="Patrocínio">Patrocínio</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div class="field-row"><label>SL (+/-)</label><input class="cell" id="pcAdminCreditoQtd" type="number" step="1" placeholder="10"></div>
      <div class="field-row"><label>Observação (vai pro extrato)</label><input class="cell" id="pcAdminCreditoMotivo" placeholder="opcional"></div>
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

async function montarAdminRotinas() {
  const execucoes = await adminListarExecucoesRotina();
  const ultimaPorRotina = {};
  execucoes.forEach((e) => { if (!ultimaPorRotina[e.rotina]) ultimaPorRotina[e.rotina] = e; }); // já vem ordenado desc

  const catalogoHtml = `<div class="pc-lobby-card">${ROTINAS_CONHECIDAS.map((r) => {
    const ultima = ultimaPorRotina[r.chave];
    return `
    <div class="pc-lobby-linha" style="align-items:flex-start;">
      <span style="min-width:0;">
        <div style="font-size:12.5px; font-weight:700;">${r.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px; line-height:1.5;">${r.descricao}</div>
        <div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:4px;">Programado: ${r.programado}</div>
      </span>
      <span style="flex-shrink:0; text-align:right; font-size:11px; ${ultima ? (ultima.sucesso ? "color:var(--pc-accent);" : "color:var(--pc-danger);") : "color:var(--pc-ink-faint);"}">
        ${ultima ? `${ultima.sucesso ? "✓ ok" : "✗ falhou"}<br><span style="font-size:9.5px;">${new Date(ultima.executado_em).toLocaleString("pt-BR")}</span>` : "sem execução registrada"}
      </span>
    </div>`;
  }).join("")}</div>`;

  const historicoHtml = !execucoes.length
    ? estadoVazio({ icone: "calendario", titulo: "Nenhuma execução registrada", texto: "Quando uma rotina rodar, o histórico aparece aqui." })
    : `<div class="pc-lobby-card">${execucoes.map((e) => `
      <div class="pc-lobby-linha" style="align-items:flex-start;">
        <span style="min-width:0;">
          <div style="font-size:12.5px; font-weight:600;">${e.rotina}</div>
          ${e.detalhe ? `<div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:3px; line-height:1.5; word-break:break-word;">${e.detalhe}</div>` : ""}
        </span>
        <span style="font-size:11px; color:${e.sucesso ? "var(--pc-accent)" : "var(--pc-danger)"}; flex-shrink:0; text-align:right;">${e.sucesso ? "✓ ok" : "✗ falhou"}<br><span style="font-size:9.5px; color:var(--pc-ink-faint);">${new Date(e.executado_em).toLocaleString("pt-BR")}</span></span>
      </div>`).join("")}</div>`;

  return `
    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Rotinas conhecidas</div>
    ${catalogoHtml}
    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Histórico de execuções</div>
    ${historicoHtml}`;
}

// ---------- Aba Bots (migração 36, estruturação aprovada 28/08/2026) ----------
// Lista de referência por estado + regulação dos 155 usuários fictícios.
// FASE 1: o painel grava referência/config; a geração de contas continua
// no script local (gerar_usuarios_ficticios.py), que lê daqui — o botão
// "Gerar" só marca o pedido. Lançamento é SC-only (decisão 28/08/2026).
async function montarAdminBots() {
  const uf = pcState.adminBotsEstado || "SC";
  const [cfg, refs, depositosReais] = await Promise.all([
    botsCarregarConfig(uf),
    botsCarregarReferencias(uf),
    (async () => {
      const { data, error } = await supabaseClient.rpc("contagem_depositos_reais");
      return error ? null : Number(data);
    })(),
  ]);
  if (!cfg) return `<div class="pc-sub">Não consegui carregar a configuração dos bots — a migração 36 já foi rodada no Supabase?</div>`;

  const refAtiva = refs.find((r) => r.ativa) || null;
  const seletorUf = `<select id="pcAdminBotsUf" class="cell" style="width:auto; padding:8px 12px;">${[...ESTADOS_BRASIL].sort((a, b) => a.sigla.localeCompare(b.sigla)).map((e) => `<option value="${e.sigla}" ${e.sigla === uf ? "selected" : ""}>${e.sigla} — ${e.nome}</option>`).join("")}</select>`;
  const status = pcState.adminBotsStatus
    ? `<div style="margin:10px 0; font-size:12px; color:${pcState.adminBotsStatus.tipo === "ok" ? "var(--pc-accent)" : "var(--pc-danger)"};">${pcState.adminBotsStatus.texto}</div>`
    : "";

  // Pré-visualização da referência ativa: contagem por cargo + top 3.
  let previewRef = "";
  if (refAtiva) {
    const cargosRef = ["estadual", "federal", "senador"].filter((cg) => refAtiva.referencia && refAtiva.referencia[cg] && refAtiva.referencia[cg].length);
    previewRef = cargosRef.map((cg) => {
      const grupos = refAtiva.referencia[cg];
      const todos = [];
      grupos.forEach((g) => (g.candidatos || []).forEach((c) => todos.push(c)));
      todos.sort((a, b) => (b.votos || 0) - (a.votos || 0));
      const top = todos.slice(0, 3).map((c) => `${c.nome} (${(c.votos || 0).toLocaleString("pt-BR")})`).join(" · ");
      return `<div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;"><b style="color:var(--pc-ink);">${cg === "estadual" ? "Dep. Estadual" : cg === "federal" ? "Dep. Federal" : "Senador"}</b> — ${grupos.length} partidos, ${todos.length} candidatos. Top: ${top}</div>`;
    }).join("");
  }
  const historicoRef = refs.filter((r) => !r.ativa).slice(0, 4).map((r) =>
    `<div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:3px;">· substituída — criada em ${new Date(r.criado_em).toLocaleString("pt-BR")}</div>`).join("");

  const botsAtivos = Math.max(0, (cfg.lote || 155) - (depositosReais || 0));

  return `
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
      <span style="font-size:12px; color:var(--pc-ink-dim);">Estado:</span>${seletorUf}
    </div>
    ${status}

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">① Referência</div>
    <div class="glass-card" style="padding:14px;">
      ${refAtiva ? `
        <div style="font-size:12.5px; color:var(--pc-ink);">Referência ativa desde <b>${new Date(refAtiva.criado_em).toLocaleString("pt-BR")}</b>${refAtiva.salvamento_id ? " · veio de uma cédula depositada" : ""}.</div>
        ${previewRef}` : `
        <div style="font-size:12.5px; color:var(--pc-ink-dim);">Sem referência ativa em ${uf} ainda. A referência dos bots é sempre uma <b>cédula depositada de verdade</b> — deposite a sua neste estado e aponte ela aqui.</div>`}
      <button class="ghost" id="pcBtnBotsUsarCedula" style="width:100%; margin-top:12px; display:flex; align-items:center; justify-content:center; gap:7px;">${iconeSvg("ballot", 14)}Escolher cédula ou lista salva como referência</button>
      ${pcState.adminBotsFontes ? (pcState.adminBotsFontes.length ? `
      <div style="margin-top:10px; border-top:1px solid var(--pc-glass-border); padding-top:8px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--pc-ink-faint); margin-bottom:6px;">Minhas fontes em ${uf}</div>
        ${pcState.adminBotsFontes.map((f) => `
        <button class="ghost" data-pc-bots-fonte="${f.id}" style="width:100%; margin-bottom:6px; display:flex; align-items:center; gap:8px; text-align:left;">
          ${iconeSvg(f.depositado_em ? "ballot" : "salvar", 13)}
          <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escaparAtributoHtml(f.nome || "(sem nome)")}</span>
          <span style="flex-shrink:0; font-size:10px; color:var(--pc-ink-dim);">${f.depositado_em ? "cédula · " + new Date(f.depositado_em).toLocaleDateString("pt-BR") : "lista salva"}</span>
        </button>`).join("")}
      </div>` : `<div style="font-size:11px; color:var(--pc-ink-dim); margin-top:8px;">Nenhuma cédula ou lista salva sua em ${uf} ainda.</div>`) : ""}
      ${historicoRef ? `<div style="margin-top:10px; border-top:1px solid var(--pc-glass-border); padding-top:8px;"><div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--pc-ink-faint);">Histórico</div>${historicoRef}</div>` : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">② Regulação</div>
    <div class="glass-card" style="padding:14px;">
      <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:13px; color:var(--pc-ink); cursor:pointer;">
        <span>Bots ligados em ${uf}</span>
        <input type="checkbox" id="pcAdminBotsLigado" ${cfg.ligado ? "checked" : ""} style="width:18px; height:18px; accent-color:var(--pc-accent);">
      </label>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <label style="flex:1; font-size:11px; color:var(--pc-ink-dim);">Tamanho do lote
          <input type="number" id="pcAdminBotsLote" class="cell" value="${cfg.lote}" min="1" max="500" style="width:100%; margin-top:4px;">
        </label>
        <label style="flex:1; font-size:11px; color:var(--pc-ink-dim);">Variação por candidato (±%)
          <input type="number" id="pcAdminBotsVariacao" class="cell" value="${cfg.variacao_pct}" min="0" max="100" style="width:100%; margin-top:4px;">
        </label>
      </div>
      <button class="primary" id="pcBtnBotsSalvarConfig" style="width:100%; margin-top:12px;">Salvar regulação</button>
      <div style="border-top:1px solid var(--pc-glass-border); margin-top:14px; padding-top:12px;">
        <button class="ghost" id="pcBtnBotsGerar" style="width:100%;" ${refAtiva ? "" : "disabled"}>Gerar / atualizar bots de ${uf}</button>
        <div style="font-size:10.5px; color:var(--pc-ink-faint); line-height:1.5; margin-top:8px;">
          ${cfg.geracao_solicitada_em ? `Pedido de geração aberto desde ${new Date(cfg.geracao_solicitada_em).toLocaleString("pt-BR")} — rode <b>ferramentas/gerar_usuarios_ficticios.py</b> no computador pra concluir.` : "O botão marca o pedido; a criação das contas roda pelo script no computador (precisa da chave administrativa, que não fica no site)."}
          ${cfg.gerado_em ? `<br>Última geração concluída: ${new Date(cfg.gerado_em).toLocaleString("pt-BR")}${cfg.gerado_detalhe ? ` — ${cfg.gerado_detalhe}` : ""}` : ""}
        </div>
      </div>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">③ Efeito boot</div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
      <div class="pc-metric" style="text-align:center;"><div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${depositosReais === null ? "—" : depositosReais.toLocaleString("pt-BR")}</div><div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">cédulas reais depositadas</div></div>
      <div class="pc-metric" style="text-align:center;"><div style="font-size:22px; font-weight:800; color:var(--pc-ink);">${botsAtivos.toLocaleString("pt-BR")}</div><div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">bots ainda na média</div></div>
      <div class="pc-metric" style="text-align:center;"><div style="font-size:22px; font-weight:800; color:var(--pc-ink-dim);">${(cfg.lote || 155).toLocaleString("pt-BR")}</div><div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">lote total</div></div>
    </div>
    <div style="font-size:10.5px; color:var(--pc-ink-faint); line-height:1.5; margin-top:8px;">Cada cédula real depositada desativa 1 bot da média pública (do índice mais alto pro mais baixo) — com o tempo, os usuários de verdade assumem a média sozinhos.</div>`;
}

// ---------- Aba Analítico, nível Sistema (migração 37, 28/08/2026) ----------
// Leitura de tendência do sistema com gráficos em SVG puro (sem biblioteca
// — o site é estático), no padrão Fader: grafite de base, verde só no
// destaque. Complementa Usuários/Financeiro (listas operacionais); o
// nível Usuário (busca individual + ponte com o "ver como") fica pra
// terceira etapa da estruturação.
const HISTORICO_ACAO_ROTULOS = {
  cadastro: { rot: "Cadastro", cor: "var(--pc-accent)" },
  palpite_salvo: { rot: "Palpite salvo", cor: "#AEB5BB" },
  cedula_depositada: { rot: "Cédula depositada", cor: "var(--pc-accent)" },
  credito_adquirido: { rot: "Crédito adquirido", cor: "#7fa895" },
  credito_utilizado: { rot: "Crédito utilizado", cor: "#FF9A2E" },
  duelo_cadastrado: { rot: "Duelo cadastrado", cor: "#8ecbe8" },
};

async function montarAdminAnalitico() {
  const [d, historico] = await Promise.all([
    adminAnalitico(pcState.adminAnaliticoIncluiBots),
    adminHistoricoAcoes(pcState.adminAnaliticoIncluiBots, 300),
  ]);
  if (!d) return `<div class="pc-sub">Não consegui carregar o analítico — a migração 37 já foi rodada no Supabase?</div>`;

  const cartao = (valor, label, cor) => `
    <div class="pc-metric" style="text-align:center;">
      <div style="font-size:22px; font-weight:800; color:${cor || "var(--pc-ink)"};">${valor}</div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">${label}</div>
    </div>`;

  // Linha de novos usuários por dia (30 dias) — preenche os dias sem
  // cadastro com zero pra linha não "pular" buracos do calendário.
  const porDiaBruto = {};
  (d.usuarios_por_dia || []).forEach((p) => { porDiaBruto[p.dia] = Number(p.n) || 0; });
  const serie = [];
  for (let i = 29; i >= 0; i--) {
    const dia = new Date(Date.now() - i * 86400000);
    const chave = dia.toISOString().slice(0, 10);
    serie.push({ chave, n: porDiaBruto[chave] || 0 });
  }
  const maxSerie = Math.max(1, ...serie.map((p) => p.n));
  const W = 300, H = 72, PAD = 4;
  const pontos = serie.map((p, i) => {
    const x = PAD + (i / (serie.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (p.n / maxSerie) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linhaSvg = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;" preserveAspectRatio="none">
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#26292D" stroke-width="1"></line>
      <polyline points="${pontos.join(" ")}" fill="none" stroke="#34E84A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></polyline>
      <circle cx="${pontos[pontos.length - 1].split(",")[0]}" cy="${pontos[pontos.length - 1].split(",")[1]}" r="2.6" fill="#34E84A"></circle>
    </svg>`;

  // Barras: cédulas por cargo.
  const cargosRot = { estadual: "Dep. Estadual", federal: "Dep. Federal", senador: "Senador" };
  const porCargo = ["estadual", "federal", "senador"].map((cg) => {
    const item = (d.cedulas_por_cargo || []).find((c) => c.cargo === cg);
    return { rot: cargosRot[cg], n: item ? Number(item.n) : 0 };
  });
  const maxCargo = Math.max(1, ...porCargo.map((c) => c.n));
  const barrasCargo = porCargo.map((c) => `
    <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
      <span style="flex:none; width:86px; font-size:10.5px; color:var(--pc-ink-dim); text-align:right;">${c.rot}</span>
      <div style="flex:1; height:12px; background:#0C0E10; border:1px solid #23262A; border-radius:6px; overflow:hidden;">
        <div style="width:${Math.round((c.n / maxCargo) * 100)}%; height:100%; background:linear-gradient(90deg, rgba(42,46,50,.75), rgba(60,65,70,.97));"></div>
      </div>
      <span style="flex:none; min-width:30px; font-size:11px; font-weight:700; color:var(--pc-ink); font-variant-numeric:tabular-nums;">${c.n.toLocaleString("pt-BR")}</span>
    </div>`).join("");

  // Funil cadastrou → preencheu → depositou (proporções sobre o 1º degrau).
  const funil = [
    { rot: "Cadastraram", n: Number(d.funil_cadastraram) || 0 },
    { rot: "Preencheram palpite", n: Number(d.funil_preencheram) || 0 },
    { rot: "Depositaram cédula", n: Number(d.funil_depositaram) || 0 },
  ];
  const baseFunil = Math.max(1, funil[0].n);
  const funilHtml = funil.map((f, i) => `
    <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
      <span style="flex:none; width:120px; font-size:10.5px; color:var(--pc-ink-dim); text-align:right;">${f.rot}</span>
      <div style="flex:1; height:14px; background:#0C0E10; border:1px solid #23262A; border-radius:7px; overflow:hidden;">
        <div style="width:${Math.round((f.n / baseFunil) * 100)}%; height:100%; background:${i === funil.length - 1 ? "rgba(52,232,74,.55)" : "linear-gradient(90deg, rgba(42,46,50,.75), rgba(60,65,70,.97))"};"></div>
      </div>
      <span style="flex:none; min-width:52px; font-size:11px; font-weight:700; color:var(--pc-ink); font-variant-numeric:tabular-nums;">${f.n.toLocaleString("pt-BR")} <span style="color:var(--pc-ink-faint); font-weight:600;">(${Math.round((f.n / baseFunil) * 100)}%)</span></span>
    </div>`).join("");

  const estadosTxt = (d.cedulas_por_estado || []).slice(0, 8).map((e) => `${e.estado} ${Number(e.n).toLocaleString("pt-BR")}`).join(" · ");

  return `
    <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin-bottom:14px; cursor:pointer;">
      <input type="checkbox" id="pcAdminAnaliticoBots" ${pcState.adminAnaliticoIncluiBots ? "checked" : ""} style="width:16px; height:16px; accent-color:var(--pc-accent);">
      Incluir bots nos números <span style="color:var(--pc-ink-faint);">(desligado = só contas reais)</span>
    </label>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      ${cartao(Number(d.usuarios_total).toLocaleString("pt-BR"), `usuários (+${Number(d.usuarios_7d).toLocaleString("pt-BR")} na semana)`, "var(--pc-accent)")}
      ${cartao(Number(d.cedulas_total).toLocaleString("pt-BR"), "cédulas depositadas")}
      ${cartao(`${Number(d.desafios_criados).toLocaleString("pt-BR")} / ${Number(d.desafios_selados).toLocaleString("pt-BR")}`, "desafios criados / selados")}
      ${cartao(`${Number(d.sl_creditados).toLocaleString("pt-BR")} / ${Number(d.sl_gastos).toLocaleString("pt-BR")}`, "SL creditados / gastos")}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Novos usuários por dia — 30 dias</div>
    <div class="glass-card" style="padding:14px;">${linhaSvg}</div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Cédulas por cargo</div>
    <div class="glass-card" style="padding:14px;">${barrasCargo}
      ${estadosTxt ? `<div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:10px; border-top:1px solid var(--pc-glass-border); padding-top:8px;">Por estado: ${estadosTxt}</div>` : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Funil</div>
    <div class="glass-card" style="padding:14px;">${funilHtml}</div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Engajamento</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      ${cartao(Number(d.revelacoes_termometro).toLocaleString("pt-BR"), "revelações no Termômetro")}
      ${cartao(Number(d.desafios_criados).toLocaleString("pt-BR"), "desafios 1×1 criados")}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Histórico de ações — últimas ${(historico || []).length}</div>
    <div class="glass-card" style="padding:6px 14px;">
      ${historico === null ? `<div class="pc-sub" style="padding:8px 0;">Não consegui carregar o histórico — a migração 39 já foi rodada no Supabase?</div>`
      : !historico.length ? `<div class="pc-sub" style="padding:8px 0;">Nenhuma ação registrada ainda.</div>`
      : historico.map((h) => {
        const rot = HISTORICO_ACAO_ROTULOS[h.acao] || { rot: h.acao, cor: "var(--pc-ink-dim)" };
        const dt = new Date(h.data);
        return `
        <div style="display:flex; align-items:baseline; gap:8px; padding:7px 0; border-bottom:.5px solid #1a1d20; font-size:11px;">
          <span style="flex:none; width:78px; color:var(--pc-ink-dim); font-variant-numeric:tabular-nums;">${dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span style="flex:none; width:112px; font-size:9px; font-weight:800; letter-spacing:.03em; text-transform:uppercase; color:${rot.cor};">${rot.rot}</span>
          <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            <b>${h.nome || "—"}</b>
            <span style="color:var(--pc-ink-dim);">${h.municipio ? " · " + h.municipio : ""}${h.email ? " · " + h.email : ""}${h.detalhe ? " · " + h.detalhe : ""}</span>
          </span>
        </div>`;
      }).join("")}
    </div>`;
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
    { id: "bots", label: "Bots" },
    { id: "analitico", label: "Analítico" },
  ];
  const botoesSecao = secoes.map((s) => `<button data-pc-admin-secao="${s.id}" class="${pcState.adminSecao === s.id ? "active" : ""}">${s.label}</button>`).join("");

  let conteudoSecao = "";
  if (pcState.adminSecao === "usuarios") conteudoSecao = await montarAdminUsuarios();
  else if (pcState.adminSecao === "problemas") conteudoSecao = await montarAdminProblemas();
  else if (pcState.adminSecao === "pesquisa") conteudoSecao = await montarAdminPesquisa();
  else if (pcState.adminSecao === "financeiro") conteudoSecao = await montarAdminFinanceiro();
  else if (pcState.adminSecao === "bots") conteudoSecao = await montarAdminBots();
  else if (pcState.adminSecao === "analitico") conteudoSecao = await montarAdminAnalitico();
  else conteudoSecao = await montarAdminRotinas();

  el.innerHTML = `
    <button class="pc-mini-btn" id="pcBtnVoltarAdmin" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Painel do administrador</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Visão operacional do sistema — não substitui o Supabase, cobre só o essencial do dia a dia.</div>
    <div class="pc-cargo-switch pc-admin-abas" style="margin-bottom:16px;">${botoesSecao}</div>
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
      const canal = document.getElementById("pcAdminCreditoCanal").value;
      const qtd = parseInt(document.getElementById("pcAdminCreditoQtd").value, 10);
      const obs = document.getElementById("pcAdminCreditoMotivo").value.trim();
      const status = document.getElementById("pcAdminCreditoStatus");
      if (!email || !qtd) { status.textContent = "Preencha e-mail e quantidade de SL (diferente de zero)."; return; }
      if (!canal) { status.textContent = "Escolhe o motivo da concessão."; return; }
      const motivo = `${canal}${obs ? " — " + obs : ""}`;
      const resumo = `Conceder ${qtd >= 0 ? "+" : ""}${qtd} SL pra ${email}\nMotivo: ${motivo}\n\nConfirma?`;
      if (!window.confirm(resumo)) return;
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
  if (pcState.adminSecao === "usuarios") {
    document.getElementById("pcBtnAdminListarUsuarios").addEventListener("click", async () => {
      const filtro = {
        genero: document.getElementById("pcAdminUsuGenero").value,
        uf: document.getElementById("pcAdminUsuUf").value.trim().toUpperCase(),
        desde: document.getElementById("pcAdminUsuDesde").value,
        ate: document.getElementById("pcAdminUsuAte").value,
        statusCedula: document.getElementById("pcAdminUsuStatusCedula").value,
        tipoConta: document.getElementById("pcAdminUsuTipoConta").value,
      };
      pcState.adminUsuariosFiltro = filtro;
      pcState.adminUsuariosResultados = await adminListarUsuarios(filtro);
      renderAdminPainel();
    });
  }
  if (pcState.adminSecao === "bots") {
    const selUf = document.getElementById("pcAdminBotsUf");
    if (selUf) selUf.addEventListener("change", () => {
      pcState.adminBotsEstado = selUf.value;
      pcState.adminBotsStatus = null;
      renderAdminPainel();
    });
    const btnCedula = document.getElementById("pcBtnBotsUsarCedula");
    if (btnCedula) btnCedula.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      if (pcState.adminBotsFontes) { pcState.adminBotsFontes = null; renderAdminPainel(); return; }
      btnCedula.disabled = true;
      pcState.adminBotsFontes = await botsListarFontesReferencia(uf);
      renderAdminPainel();
    });
    document.querySelectorAll("[data-pc-bots-fonte]").forEach((b) => b.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      const fonte = (pcState.adminBotsFontes || []).find((f) => String(f.id) === b.dataset.pcBotsFonte);
      const rotulo = fonte && fonte.depositado_em ? "a cédula depositada" : "a lista salva";
      if (!window.confirm(`Usar ${rotulo} "${fonte ? fonte.nome : ""}" como referência dos bots de ${uf}?\n\nA referência anterior (se houver) vira histórico. Os bots já gerados NÃO mudam sozinhos — só no próximo "Gerar".`)) return;
      b.disabled = true;
      const r = await botsUsarSalvamentoComoReferencia(uf, b.dataset.pcBotsFonte);
      pcState.adminBotsFontes = null;
      pcState.adminBotsStatus = r.ok
        ? { tipo: "ok", texto: `Referência de ${uf} atualizada a partir de ${r.depositadaEm ? `cédula depositada em ${new Date(r.depositadaEm).toLocaleDateString("pt-BR")}` : "lista salva"} — "${r.nome}".` }
        : { tipo: "erro", texto: r.mensagem };
      renderAdminPainel();
    }));
    const btnSalvarCfg = document.getElementById("pcBtnBotsSalvarConfig");
    if (btnSalvarCfg) btnSalvarCfg.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      const lote = parseInt(document.getElementById("pcAdminBotsLote").value, 10);
      const variacao = parseInt(document.getElementById("pcAdminBotsVariacao").value, 10);
      if (!lote || lote < 1 || lote > 500) { pcState.adminBotsStatus = { tipo: "erro", texto: "Lote precisa estar entre 1 e 500." }; renderAdminPainel(); return; }
      if (isNaN(variacao) || variacao < 0 || variacao > 100) { pcState.adminBotsStatus = { tipo: "erro", texto: "Variação precisa estar entre 0 e 100%." }; renderAdminPainel(); return; }
      const ok = await botsSalvarConfig({ estado: uf, ligado: document.getElementById("pcAdminBotsLigado").checked, lote, variacao_pct: variacao });
      pcState.adminBotsStatus = ok ? { tipo: "ok", texto: `Regulação de ${uf} salva.` } : { tipo: "erro", texto: "Não consegui salvar — a migração 36 já foi rodada?" };
      renderAdminPainel();
    });
    const btnGerar = document.getElementById("pcBtnBotsGerar");
    if (btnGerar) btnGerar.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      if (!window.confirm(`Marcar pedido de geração dos bots de ${uf}?\n\nAs contas em si são criadas rodando ferramentas/gerar_usuarios_ficticios.py no computador — o pedido fica registrado aqui até o script concluir.`)) return;
      const ok = await botsSolicitarGeracao(uf);
      pcState.adminBotsStatus = ok ? { tipo: "ok", texto: `Pedido de geração de ${uf} registrado — agora rode o script no computador.` } : { tipo: "erro", texto: "Não consegui registrar o pedido." };
      renderAdminPainel();
    });
  }
  if (pcState.adminSecao === "analitico") {
    const chkBots = document.getElementById("pcAdminAnaliticoBots");
    if (chkBots) chkBots.addEventListener("change", () => {
      pcState.adminAnaliticoIncluiBots = chkBots.checked;
      renderAdminPainel();
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
    el.innerHTML = `<div class="glass-card"><h2>Acesso restrito</h2><div class="pc-sub">Essa área é só pra parceiros com acesso liberado.</div><button class="ghost" id="pcBtnVoltarUsuarioFinalRestrito" style="width:100%; margin-top:10px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Voltar</button></div>`;
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
// Letreiro dinâmico (protótipo aprovado 30/08/2026): faixa que rola sozinha
// alternando Orientação (como usar algo na tela) e Dica (algo que vale a
// pena saber) — só na tela principal (Painel). A lista de mensagens
// aparece 2x seguidas no trilho pra loop ficar sem costura visível (anda
// -50% da largura total, que é exatamente 1 volta da lista).
// EM STANDBY (pedido do usuário, 30/08/2026): construído e testado, mas
// desligado por enquanto — trocar LETREIRO_ATIVO pra true quando for a
// hora de ligar de novo. Não apagar as mensagens/CSS junto.
const LETREIRO_ATIVO = false;
const LETREIRO_MENSAGENS = [
  { tag: "Dica", texto: "Convide amigos: quando alguém entra pelo seu link e deposita a 1ª cédula, você ganha 1 SL" },
  { tag: "Orientação", texto: "Arraste a barra do candidato pra distribuir os votos — ou toque duas vezes pra digitar o número direto" },
  { tag: "Orientação", texto: "O botão \"Salvar\" já registra o palpite — não precisa de mais nenhum passo depois" },
  { tag: "Dica", texto: "Depois do quociente partidário, o resto das vagas vai pra aba \"Disputa das sobras\"" },
];
function montarLetreiroPainel() {
  if (!LETREIRO_ATIVO) return "";
  const itens = LETREIRO_MENSAGENS.map((m) => `<span><span class="pc-letreiro-tag">${m.tag}</span>${m.texto}</span>`).join("");
  // Velocidade reduzida (pedido do usuário, 30/08/2026): de 6.5s por
  // mensagem pra 11s — dá mais tempo de ler cada frase antes de rolar.
  const duracao = Math.max(28, LETREIRO_MENSAGENS.length * 11);
  return `
    <div class="pc-letreiro" id="pcLetreiroPainel" title="Toque pra pausar">
      <span class="pc-letreiro-marcador"></span>
      <div class="pc-letreiro-faixa">
        <div class="pc-letreiro-trilho" style="--pc-letreiro-duracao:${duracao}s;">${itens}${itens}</div>
      </div>
    </div>`;
}

async function renderPainelPrincipal() {
  pcState._farolContexto = "painel";
  const el = document.getElementById("pcConteudo");
  // Só mostra a tela de carregando própria do Painel se os dados AINDA
  // não estão quentes — logo após login/boot, initColaborativo() já
  // pré-carregou os dois caches, então esse "carregando" nem chega a
  // aparecer (era ele que piscava por cima do carregando do boot, lendo
  // como "carrega duas vezes" — achado do usuário, 24/08/2026).
  const jaQuente = pcState.rascunhosCacheEstado === pcState.estado && (!pcState.perfil || pcState.meusGrupos);
  if (!jaQuente) el.innerHTML = telaCarregando("Carregando seu painel…");

  await garantirRascunhosCarregados();
  // Convidado (sem cadastro) não tem perfil_id pra carregar grupos —
  // pcState.meusGrupos fica null, o resto da função já trata isso como
  // "sem grupo" (ver atividadeAmigo abaixo).
  if (pcState.perfil) await garantirMeusGruposCarregados();
  // Revalida o contador do sino sempre que volta pro painel — antes só
  // carregava uma vez no boot (initColaborativo), então quem recebia um
  // desafio/notificação nova enquanto navegava nunca via o indicador
  // acender sem recarregar a página inteira (achado 28/08/2026).
  if (pcState.perfil) {
    try { pcState.notificacoesNaoLidas = await contarNotificacoesNaoLidas(); } catch (e) { /* sem indicador */ }
  }

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
  const minhasListasPainel = await _carregarMinhasListasNormalizado();
  const totalListas = minhasListasPainel.length;
  // Lista mais recente DEPOSITADA (com código) — é o que o botão de
  // compartilhar do Painel abre agora (correção 28/08/2026: o botão
  // antigo injetava um campo de link ?ver= no RODAPÉ da tela, fora da
  // vista no celular — parecia simplesmente não funcionar).
  const listaDepositadaPainel = minhasListasPainel
    .filter((l) => l.depositadoEm && l.codigo)
    .sort((a, b) => new Date(b.depositadoEm) - new Date(a.depositadoEm))[0] || null;
  const totalGrupos = pcState.meusGrupos ? pcState.meusGrupos.length : 0;
  const totalDesafiosAtivos = gateConvidado ? 0 : await contarMeusDesafiosAtivos();

  el.innerHTML = `
    <div id="pcFarolBloco"></div>

    <div class="pc-topbar">
      <div class="pc-topbar-marca"><span class="pc-topbar-nome"><b>Simula</b>LEGIS</span><span class="pc-topbar-prevendo">${pcState.perfil && pcState.perfil.escopo === "partido" ? `Prevendo: ${pcState.perfil.partido_escopo}` : "Prevendo: chapa completa"}</span></div>
      ${pcState.perfil ? `<button class="pc-topbar-cred" id="pcBtnSaldoTopo" title="Seus créditos">${iconeSvg("credito", 14)}<span>${Number((pcState.perfil && pcState.perfil.creditos) || 0)}</span></button>` : ""}
      <button class="pc-topbar-btn" id="pcBtnConvidarTopo" title="Convidar amigos">${iconeSvg("convidar", 17)}</button>
      ${pcState.perfil ? `<button class="pc-topbar-btn" id="pcBtnSinoTopo" title="Notificações" style="position:relative;">${iconeSvg("sino", 17)}${pcState.notificacoesNaoLidas ? `<span class="pc-topbar-pip"></span>` : ""}</button>` : ""}
      <button class="pc-topbar-btn" id="pcBtnPerfilTopo" title="${gateConvidado ? "Precisa se cadastrar" : "Menu e perfil"}">${iconeSvg("perfil", 17)}</button>
    </div>

    ${montarLetreiroPainel()}

    <div class="pc-lobby-card">
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:6px; color:var(--pc-ink);">${completa ? `<span style="color:var(--pc-accent); display:flex;">${iconeSvg("checkCirculo", 14)}</span>Lista completa` : "Sua lista"}</span>
          <span style="font-size:11.5px; font-weight:600; color:${completa ? "var(--pc-accent)" : "var(--pc-ink-dim)"};">${totalMarcado}<span style="color:var(--pc-ink-dim);">/${totalVagas}</span></span>
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
      <div class="pc-lobby-banner-titulo">Desafie quem entende de política</div>
      <div class="pc-lobby-banner-corpo">Compare sua lista lado a lado com a de amigos, num grupo só seu.</div>
      <button class="pc-lobby-banner-btn" id="pcBtnConviteBanner">Criar grupo ${iconeSvg("setaDireita", 13)}</button>
    </div>

    <button class="pc-urna" id="pcBtnUrna">
      <span class="pc-urna-btn">${iconeSvg("urna", 52)}</span>
      <span class="pc-urna-rot">Minhas listas${totalListas ? `<span class="pc-urna-badge">${totalListas}</span>` : ""}</span>
      <span class="pc-urna-sub">montar, revisar e depositar a cédula</span>
    </button>

    ${listaDepositadaPainel && !gateConvidado ? `
    <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <button class="pc-lobby-icon-btn" id="pcBtnCompartilharLobby" title="Compartilhar minha cédula (convite de duelo)">${iconeSvg("compartilhar", 16)}</button>
    </div>` : ""}

    <button class="pc-lobby-duelo" id="pcBtnDueloLobby" style="${estiloApagado}" title="${tituloApagado}">
      <span class="pc-lobby-duelo-ic">${iconeSvg("desafio", 18)}</span>
      <span class="pc-lobby-duelo-tx"><b>Duelo 1×1</b><i>desafie alguém pra bater palpite</i></span>
      ${iconeSvg("setaDireita", 14)}
    </button>

    <div class="pc-lobby-menu-tit">Atalhos</div>
    <div class="pc-lobby-tiles">
      <button class="pc-lobby-tile" id="pcMenuListas">
        <span class="pc-lobby-tile-ic">${iconeSvg("lista", 24)}</span>
        <span class="pc-lobby-tile-rot">Listas</span>
        ${totalListas ? `<span class="pc-lobby-tile-badge">${totalListas}</span>` : ""}
      </button>
      <button class="pc-lobby-tile" id="pcMenuMedias" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("termometro", 24)}</span>
        <span class="pc-lobby-tile-rot">Termômetro<br>eleitoral</span>
      </button>
      <button class="pc-lobby-tile" id="pcMenuGrupos" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("grupos", 24)}</span>
        <span class="pc-lobby-tile-rot">Grupos</span>
        ${totalGrupos ? `<span class="pc-lobby-tile-badge">${totalGrupos}</span>` : ""}
      </button>
      <button class="pc-lobby-tile" id="pcMenuRanking">
        <span class="pc-lobby-tile-ic">${iconeSvg("ranking", 24)}</span>
        <span class="pc-lobby-tile-rot">Ranking<br>(usuários)</span>
      </button>
      <button class="pc-lobby-tile" id="pcMenuDesafios" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("desafio", 24)}</span>
        <span class="pc-lobby-tile-rot">Duelos</span>
        ${totalDesafiosAtivos ? `<span class="pc-lobby-tile-badge">${totalDesafiosAtivos}</span>` : ""}
      </button>
      <button class="pc-lobby-tile" id="pcMenuLoja" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("loja", 24)}</span>
        <span class="pc-lobby-tile-rot">Loja</span>
      </button>
    </div>

    <div class="pc-lobby-mais-tit">Mais funções</div>
    <div class="pc-lobby-mais">
      <button class="pc-lobby-mais-item" id="pcMenuTrocarEstado">${iconeSvg("mapa", 15)}<span>Trocar estado · <b style="color:var(--pc-accent);">${pcState.estado}</b></span>${iconeSvg("setaDireita", 13)}</button>
      <button class="pc-lobby-mais-item" id="pcMenuAjudaLobby">${iconeSvg("ajuda", 15)}<span>Central de ajuda</span>${iconeSvg("setaDireita", 13)}</button>
    </div>
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
  const irParaListas = () => {
    if (pcState.perfil) { pcState.subaba = "minhas-listas"; renderAppColaborativo(); }
    else { pcState.tela = "minhas-listas-convidado"; renderColaborativo(); }
  };
  // A urna é a porta principal do Painel (desenho de 24/08/2026): leva pro
  // mesmo destino do atalho "Listas", que é de onde se monta, revisa e
  // deposita a cédula.
  document.getElementById("pcBtnUrna").addEventListener("click", irParaListas);
  document.getElementById("pcMenuListas").addEventListener("click", irParaListas);
  document.getElementById("pcBtnConvidarTopo").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcBtnPerfilTopo").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro(null);
    pcState.subaba = "menu"; renderAppColaborativo();
  });
  const btnSaldoTopo = document.getElementById("pcBtnSaldoTopo");
  if (btnSaldoTopo) btnSaldoTopo.addEventListener("click", () => { pcState.subaba = "carteira"; renderAppColaborativo(); });
  const btnSinoTopo = document.getElementById("pcBtnSinoTopo");
  if (btnSinoTopo) btnSinoTopo.addEventListener("click", () => { pcState.subaba = "notificacoes"; renderAppColaborativo(); });
  // Letreiro: no celular não existe hover pra pausar sozinho — um toque
  // alterna pausado/rolando (achado do próprio padrão de marquee mobile).
  const letreiro = document.getElementById("pcLetreiroPainel");
  if (letreiro) letreiro.addEventListener("click", () => letreiro.classList.toggle("pausado"));
  const btnDueloLobby = document.getElementById("pcBtnDueloLobby");
  if (btnDueloLobby) btnDueloLobby.addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("desafios");
    pcState.subaba = "desafios"; renderAppColaborativo();
  });
  const btnDesafios = document.getElementById("pcMenuDesafios");
  if (btnDesafios) btnDesafios.addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("desafios");
    pcState.subaba = "desafios"; renderAppColaborativo();
  });
  const btnLoja = document.getElementById("pcMenuLoja");
  if (btnLoja) btnLoja.addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("loja");
    pcState.subaba = "loja"; renderAppColaborativo();
  });
  document.getElementById("pcMenuRanking").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "ranking"; renderAppColaborativo(); }
    else { pcState.tela = "ranking-convidado"; renderColaborativo(); }
  });
  document.getElementById("pcMenuMedias").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("medias");
    pcState.subaba = "medias"; renderAppColaborativo();
  });
  document.querySelectorAll('[data-pc-gate="1"]').forEach((b) => b.classList.add("pc-lobby-tile-gate"));
  document.getElementById("pcMenuGrupos").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcBtnConviteBanner").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcMenuTrocarEstado").addEventListener("click", () => {
    pcState.trocaEstadoLogado = true;
    renderTelaEstado();
  });
  document.getElementById("pcMenuAjudaLobby").addEventListener("click", () => {
    // Central de ajuda é conteúdo fixo (regras do jogo), sem depender de
    // conta — diferente de Mediana/Grupos, não faz sentido pedir cadastro
    // só pra ler isso.
    if (pcState.perfil) { pcState.subaba = "ajuda"; renderAppColaborativo(); }
    else { pcState.tela = "ajuda-convidado"; renderColaborativo(); }
  });
  // Correção 28/08/2026 (achado do usuário no teste mobile: "o botão não
  // funciona"): o antigo mostrarLinkCompartilhavel injetava um campo de
  // link ?ver= no RODAPÉ do Painel — fora da vista no celular, parecia
  // morto. Agora abre o MESMO modal de compartilhar de Minhas Listas
  // (cartão-desafio + código), com a cédula depositada mais recente —
  // uma peça só de divulgação, um comportamento só no app inteiro.
  const btnCompartilhar = document.getElementById("pcBtnCompartilharLobby");
  if (btnCompartilhar && listaDepositadaPainel) btnCompartilhar.addEventListener("click", async () => {
    if (pcState.perfil) pcState.subaba = "minhas-listas";
    else pcState.tela = "minhas-listas-convidado";
    await abrirModalCompartilharLista(listaDepositadaPainel.id, minhasListasPainel);
  });
}

// (mostrarLinkCompartilhavel foi aposentada em 28/08/2026 — o link
// ?ver=<perfil_id> de rascunho ao vivo era um TERCEIRO conceito de
// compartilhamento, redundante com o cartão-desafio da cédula depositada.
// A tela de LEITURA ?ver= continua funcionando pra links antigos.)

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

// Cartão-imagem do CONVITE DE DUELO (arte aprovada em protótipo,
// 31/08/2026): 1080×1350 (4:5, aparece grande na conversa do WhatsApp).
// Composição: wordmark, selo Duelo 1×1, avatares [criador] VS [?] com a
// vaga do rival em círculo tracejado, nome do duelo, recorte e provocação.
// Card de VITÓRIA do duelo (arte aprovada em protótipo v6, 31/08/2026):
// vencedor grande com anel verde e faixa VENCEU, perdedor apagado, placar.
// Gerado em 4:5 (WhatsApp) e 9:16 (Stories) a partir da mesma composição.
function gerarImagemCardVitoria({ nomeVencedor, nomePerdedor, ptsV, ptsP, nomeDuelo }, H) {
  const W = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const fundo = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, H * 0.95);
  fundo.addColorStop(0, "#1B1E22"); fundo.addColorStop(0.52, "#101214"); fundo.addColorStop(1, "#0C0E10");
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);

  ctx.font = "800 44px Inter, sans-serif";
  const wSim = ctx.measureText("Simula").width, wLeg = ctx.measureText("LEGIS").width;
  const xm = W / 2 - (wSim + wLeg) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#34E84A"; ctx.fillText("Simula", xm, 120);
  ctx.fillStyle = "#F2F4F5"; ctx.fillText("LEGIS", xm + wSim, 120);
  ctx.textAlign = "center"; ctx.fillStyle = "#5C6268"; ctx.font = "800 20px Inter, sans-serif";
  ctx.fillText("S I M U L A D O R   E L E I T O R A L   L E G I S L A T I V O   2 0 2 6", W / 2, 158);

  const cy = H / 2, seloY = cy - 410;
  ctx.strokeStyle = "rgba(52,232,74,.5)"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(52,232,74,.08)";
  ctx.beginPath(); ctx.roundRect(W / 2 - 215, seloY, 430, 86, 43); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 26px Inter, sans-serif";
  ctx.fillText("D U E L O   1 × 1", W / 2, seloY + 38);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 30px Inter, sans-serif";
  ctx.fillText("RESULTADO", W / 2, seloY + 72);

  const avY = cy - 110, gapAv = 250;
  ctx.save();
  ctx.shadowColor = "rgba(52,232,74,.55)"; ctx.shadowBlur = 60;
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#34E84A"; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(W / 2 - gapAv, avY, 120, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 92px Inter, sans-serif";
  ctx.fillText((nomeVencedor || "?")[0].toUpperCase(), W / 2 - gapAv, avY + 34);
  ctx.fillStyle = "#34E84A";
  ctx.beginPath(); ctx.roundRect(W / 2 - gapAv - 92, avY - 168, 184, 46, 23); ctx.fill();
  ctx.fillStyle = "#07230C"; ctx.font = "800 24px Inter, sans-serif";
  ctx.fillText("V E N C E U", W / 2 - gapAv, avY - 137);
  ctx.globalAlpha = .55;
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#4D545C"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(W / 2 + gapAv, avY, 105, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#8A9096"; ctx.font = "800 80px Inter, sans-serif";
  ctx.fillText((nomePerdedor || "?")[0].toUpperCase(), W / 2 + gapAv, avY + 28);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 60px Inter, sans-serif";
  ctx.fillText("VS", W / 2, avY + 20);
  ctx.font = "800 40px Inter, sans-serif";
  ctx.fillText(nomeVencedor, W / 2 - gapAv, avY + 188);
  ctx.fillStyle = "#8A9096"; ctx.fillText(nomePerdedor, W / 2 + gapAv, avY + 188);
  ctx.fillStyle = "#34E84A"; ctx.font = "800 64px Inter, sans-serif";
  ctx.fillText(ptsV.toLocaleString("pt-BR") + " pts", W / 2 - gapAv, avY + 266);
  ctx.fillStyle = "#8A9096"; ctx.fillText(ptsP.toLocaleString("pt-BR") + " pts", W / 2 + gapAv, avY + 266);

  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 46px Inter, sans-serif";
  ctx.fillText(nomeVencedor + " venceu o duelo", W / 2, cy + 330);
  ctx.fillText('"' + nomeDuelo + '"', W / 2, cy + 388);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 30px Inter, sans-serif";
  ctx.fillText("por " + ptsV.toLocaleString("pt-BR") + " pontos a " + ptsP.toLocaleString("pt-BR") + " \u00b7 apura\u00e7\u00e3o oficial de 2026", W / 2, cy + 444);

  ctx.fillStyle = "#5C6268"; ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText("quer medir o seu faro pol\u00edtico? monte o seu palpite", W / 2, H - 70);
  return canvas;
}

function gerarImagemConviteDuelo({ nomeCriador, nomeDuelo, infoRecorte }) {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const fundo = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, H * 0.95);
  fundo.addColorStop(0, "#1B1E22"); fundo.addColorStop(0.52, "#101214"); fundo.addColorStop(1, "#0C0E10");
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);

  const cy = H / 2;
  ctx.font = "800 44px Inter, sans-serif";
  const wSim = ctx.measureText("Simula").width, wLeg = ctx.measureText("LEGIS").width;
  const xm = W / 2 - (wSim + wLeg) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#34E84A"; ctx.fillText("Simula", xm, 120);
  ctx.fillStyle = "#F2F4F5"; ctx.fillText("LEGIS", xm + wSim, 120);
  ctx.textAlign = "center"; ctx.fillStyle = "#5C6268";
  ctx.font = "800 20px Inter, sans-serif";
  ctx.fillText("S I M U L A D O R   E L E I T O R A L   L E G I S L A T I V O   2 0 2 6", W / 2, 158);

  const seloY = cy - 400;
  ctx.strokeStyle = "rgba(52,232,74,.5)"; ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(52,232,74,.08)";
  ctx.beginPath(); ctx.roundRect(W / 2 - 170, seloY, 340, 86, 43); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 26px Inter, sans-serif";
  ctx.fillText("D U E L O", W / 2, seloY + 38);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 34px Inter, sans-serif";
  ctx.fillText("1 × 1", W / 2, seloY + 72);

  const avY = cy - 130, avR = 110, gapAv = 250;
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#34E84A"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(W / 2 - gapAv, avY, avR, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 88px Inter, sans-serif";
  ctx.fillText((nomeCriador || "?")[0].toUpperCase(), W / 2 - gapAv, avY + 32);
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#4D545C"; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.arc(W / 2 + gapAv, avY, avR, 0, 7); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#8A9096"; ctx.font = "800 96px Inter, sans-serif";
  ctx.fillText("?", W / 2 + gapAv, avY + 36);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 64px Inter, sans-serif";
  ctx.fillText("VS", W / 2, avY + 24);
  ctx.font = "800 40px Inter, sans-serif";
  ctx.fillText(nomeCriador, W / 2 - gapAv, avY + avR + 66);
  ctx.fillStyle = "#8A9096";
  ctx.fillText("Você?", W / 2 + gapAv, avY + avR + 66);

  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 58px Inter, sans-serif";
  ctx.fillText('"' + nomeDuelo + '"', W / 2, cy + 180);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 30px Inter, sans-serif";
  ctx.fillText(infoRecorte, W / 2, cy + 232);

  ctx.fillStyle = "#34E84A"; ctx.font = "800 46px Inter, sans-serif";
  ctx.fillText("Tem coragem de encarar?", W / 2, cy + 330);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 28px Inter, sans-serif";
  ctx.fillText("Meu palpite já está travado. Toque no link,", W / 2, cy + 384);
  ctx.fillText("indique o seu e o duelo fica selado até a apuração.", W / 2, cy + 422);

  ctx.fillStyle = "#5C6268"; ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText("quem chegar mais perto do resultado real vence", W / 2, H - 70);
  return canvas;
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
  ctx.fillText("Te desafio pra um duelo 1×1.", W / 2, 268);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 29px Inter, sans-serif";
  const nomeEstado = (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome || pcState.estado;
  ctx.fillText(`${nomeExibido} · ${nomeEstado} · Eleições 2026`, W / 2, 320);

  // Denominador do % = a MESMA régua única do app (DESIGN.md/PROJETO §8.2):
  // fração de T = k·E (votos válidos projetados do cargo, × votos por
  // eleitor no Senado) — nunca a soma do palpite, que faria o líder de um
  // cargo pouco preenchido mostrar 100%.
  const tetoCargo = (cid) => {
    if (cid === "senador") {
      const E = validosOficiaisProjetados() || totalValidosProjetado2026("senador");
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
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 3px; border-bottom:1px solid rgba(242,244,245,.08); font-size:12.5px;">
        <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.posicaoEleicao ? `<b style="color:var(--pc-accent);">${c.posicaoEleicao}º</b> ` : ""}${c.nome} <span style="color:var(--pc-ink-dim);">· ${c.partido}</span></span>
        <span style="font-family:var(--mono); color:var(--pc-ink-dim); flex-shrink:0;">${c.votos.toLocaleString("pt-BR")}</span>
      </div>`).join("");
    return `<details class="pc-acc"><summary>${cargoDef.label}</summary><div class="pc-acc-body">${linhas}</div></details>`;
  }).join("");
}

async function renderMinhasListas() {
  pcState._farolContexto = "listas";
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando suas listas…");
  const listas = await _carregarMinhasListasNormalizado();
  // Duelos selados também são cédulas depositadas (decisão do usuário,
  // 30/08/2026): o palpite do duelo trava igual e vale na apuração —
  // então ele aparece aqui, junto das depositadas, com o código DS.
  let duelosSelados = [];
  if (pcState.perfil) {
    try {
      duelosSelados = (await listarMeusDesafios()).filter((d) => ["selado", "apuracao", "encerrado"].includes(d.status));
    } catch (e) { /* sem duelos, segue */ }
  }

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
        <button class="ghost" id="pcBtnVoltarMinhasListas" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Minhas listas</button>
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
    <div class="pc-mini-card" data-pc-abrir-lista="${l.id}" style="flex-wrap:wrap; cursor:pointer;" title="Toque para continuar editando">
      <div class="pc-mini-card-icone">${iconeSvg("ballot", 17)}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Salva em ${new Date(l.atualizadoEm).toLocaleDateString("pt-BR")}</div>
      </div>
      <div class="pc-ml-acoes">
        <button type="button" class="pc-cmd-acao" data-pc-revisar-lista="${l.id}" title="Ver Revisão desta lista, mesmo incompleta">${iconeSvg("lista", 14)}</button>
        <button type="button" class="pc-cmd-acao" data-pc-depositar-lista="${l.id}" title="Depositar — vira sua cédula: trava e entra no ranking">${iconeSvg("ballot", 16)}</button>
        <button type="button" class="pc-cmd-acao pc-ml-excluir" data-pc-excluir-lista="${l.id}" data-pc-excluir-lista-nome="${escaparAtributoHtml(l.nome)}" title="Excluir a lista">${iconeSvg("lixeira", 14)}</button>
      </div>
    </div>`;
  const linhaDepositada = (l) => `
    <div class="pc-mini-card" style="flex-wrap:wrap; opacity:.85;">
      <div class="pc-mini-card-icone" style="background:rgba(198,230,42,.12); color:var(--pc-warning);">${iconeSvg("chave", 16)}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Depositada em ${new Date(l.depositadoEm).toLocaleDateString("pt-BR")}${l.anonimo ? " · anônima" : ""}${l.codigo ? ` · <span style="font-family:var(--mono);">${l.codigo}</span>` : ""}${l.editadaEm ? ` · <span style="color:var(--pc-warning);">editada em ${new Date(l.editadaEm).toLocaleDateString("pt-BR")}</span>` : ""}</div>
      </div>
      <div class="pc-ml-acoes">
        ${l.codigo ? `<button type="button" class="pc-cmd-acao" data-pc-compartilhar-lista="${l.id}" title="Compartilhar o convite de duelo">${iconeSvg("compartilhar", 14)}</button>` : ""}
        <button type="button" class="pc-cmd-acao" data-pc-ver-lista="${l.id}" title="Ver a lista (só leitura)">${iconeSvg("buscar", 14)}</button>
      </div>
    </div>`;

  const listaModal = pcState.modalDepositarListaId ? listas.find((l) => l.id === pcState.modalDepositarListaId) : null;

  el.innerHTML = `
    <div id="pcFarolBloco"></div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
      <div style="font-size:20px; font-weight:700; margin-left:2px;">Minhas listas</div>
      <button class="pc-lobby-icon-btn" id="pcBtnNovaLista" title="Nova lista">${iconeSvg("mais", 16)}</button>
    </div>
    <div class="pc-sub" style="margin:4px 0 16px 2px;">Toque numa lista em aberto pra continuar editando. Depositadas ficam travadas.</div>
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
    ${abertas.length ? `<div class="pc-lobby-menu-tit" style="display:flex; align-items:center; gap:8px;">Em aberto <button type="button" id="pcMlLegendaToggle" class="pc-ml-inf${pcState.legendaListasAberta ? " aberto" : ""}" title="O que faz cada botão">i</button></div>${pcState.legendaListasAberta ? renderLegendaComandos([
      { icone: "ballot", titulo: "Urna — depositar", legenda: "Deposita a lista: vira sua cédula pra valer — trava e entra no ranking. A primeira é grátis." },
      { icone: "lixeira", titulo: "Lixeira — excluir", legenda: "Apaga a lista em aberto pra sempre. Só existe pra listas ainda não depositadas — cédula depositada nunca pode ser excluída." },
      { icone: "buscar", titulo: "Lupa — ver", legenda: "Só olhar a lista, sem mexer (listas depositadas)." },
      { icone: "compartilhar", titulo: "Compartilhar", legenda: "Manda o convite de duelo pros amigos." },
    ]) : ""}${abertas.map(linhaAberta).join("")}` : ""}
    ${depositadas.length ? `<div class="pc-lobby-menu-tit" style="margin-top:${abertas.length ? "18px" : "0"};">Depositadas</div>${depositadas.map(linhaDepositada).join("")}` : ""}
    ${duelosSelados.length ? `<div class="pc-lobby-menu-tit" style="margin-top:18px;">Cédulas de duelo</div>${duelosSelados.map((d) => {
      const souCriador = d.criador_id === pcState.perfil.id;
      const rival = souCriador ? (d.desafiado ? d.desafiado.nome : "?") : (d.criador ? d.criador.nome : "?");
      return `
      <div class="pc-lobby-card" style="padding:12px 14px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="pc-lobby-atalho-icone" style="width:34px; height:34px; flex-shrink:0;">${iconeSvg("desafio", 16)}</span>
          <span style="flex:1; min-width:0;">
            <span style="display:block; font-size:12.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${d.nome}" · vs ${rival}</span>
            <span style="display:block; font-size:10px; color:var(--pc-ink-dim);">${d.codigo || ""} · selado em ${new Date(d.respondido_em || d.criado_em).toLocaleDateString("pt-BR")} · ${d.status === "encerrado" ? "apurado" : "aguarda apuração"}</span>
          </span>
          <button type="button" class="pc-cmd-acao" data-pc-ml-duelo="${d.id}" title="Ver comparação">${iconeSvg("buscar", 14)}</button>
        </div>
      </div>`;
    }).join("")}` : ""}
    ${!listas.length && !duelosSelados.length ? estadoVazio({ icone: "lista", titulo: "Nenhuma lista ainda", texto: "Monte sua primeira previsão e ela aparece aqui.", botaoLabel: "Criar minha lista", botaoId: "pcBtnEstadoVazioNovaLista" }) : ""}
    ${listaModal ? `
    <div id="pcModalDepositarOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("alerta", 14)} IMPORTANTE</div>
        <h2 style="margin-bottom:6px; font-size:15px;">Depositar "${listaModal.nome}"?</h2>
        <div style="font-size:12.5px; line-height:1.6; color:var(--pc-ink-dim);">Depois de depositada, <b style="color:var(--pc-ink);">não será mais possível alterar nem excluir essa cédula</b> — é definitivo.</div>
        ${pcState.avisoVagaNaoMarcadaResumo ? `
        <div class="pc-aviso-card" style="margin:14px 0 0;">
          <div class="pc-aviso-titulo">Lembrete</div>
          <div class="pc-aviso-corpo">Você não preencheu a lista completa.</div>
        </div>` : ""}
        <label style="display:flex; align-items:center; gap:10px; margin:16px 0; font-size:13px; color:var(--pc-ink); cursor:pointer;">
          <span class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcCheckAnonimo"${pcState._anonimoPreAviso ? " checked" : ""}><span class="pc-switch-slider"></span></span>
          Anônimo
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
      // BUG corrigido em 21/08/2026: era carregarSalvamentoCompleto(id) com
      // `id` inexistente no escopo — pra logado, o Editar falhava mudo.
      let cargosDaLista;
      if (pcState.perfil) {
        const completo = await carregarSalvamentoCompleto(lista.id);
        if (!completo) return;
        cargosDaLista = completo.cargos;
      } else {
        cargosDaLista = lista.palpitesPorCargo;
      }
      // Política de 21/08/2026: lista da era antiga (elenco de 2022
      // embutido) não abre pra edição — ver listaEhDaEraAntiga.
      if (listaEhDaEraAntiga(cargosDaLista, pcState.estado)) {
        pcState.avisoEdicaoStatus = `"${lista.nome}" foi salva numa versão antiga do elenco de candidatos e não pode mais ser editada nem depositada — os candidatos dela já não correspondem aos registrados pra 2026. Crie uma lista nova a partir do palpite atual.`;
        renderMinhasListas();
        return;
      }
      pcState.listaSalvaId = lista.id;
      pcState.listaSalvaNome = lista.nome;
      persistirListaAtivaLocal();
      pcState.palpitesPorCargo = cargosDaLista;
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
      // Continuar de onde parou (pedido do usuário, 21/08/2026): lista com
      // cargo pela metade abre direto no PALPITE, já no primeiro cargo
      // pendente — a Revisão só é destino de lista completa. Mesma régua
      // de completude do farol (vagas fechadas + votação >= 99,5%).
      const cargoPendente = CARGOS.find((c) => {
        const st = _farolStatusCargo(c.id);
        return !(st.vagasOk && st.votosOk);
      });
      if (cargoPendente) {
        pcState.cargoAtivo = cargoPendente.id;
        pcState.palpiteEdicao = pcState.palpitesPorCargo ? pcState.palpitesPorCargo[cargoPendente.id] : null;
        // SELA a chave estado::cargo da edição (CRÍTICO da revisão 22/08):
        // sem isso, garantirPalpiteEdicaoAtivo via a chave divergente e
        // SUBSTITUÍA o conteúdo da lista aberta pelo rascunho de autosave
        // (possivelmente de OUTRA lista) — e o próximo Salvar gravava esse
        // conteúdo alheio por cima da lista nomeada.
        pcState.cargoPalpiteEdicao = `${pcState.estado}::${cargoPendente.id}`;
        pcState.ordemPartidosFixa = null;
        pcState.ordemCandidatosFixa = null;
        if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
        else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
        return;
      }
      if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
      else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  };
  // Atalho "Revisão" dentro do card (pedido do usuário, 26/08/2026): igual
  // a abrirListaParaEdicao, mas SEM o redirecionamento pro cargo pendente —
  // vai direto pra Revisão mesmo com a lista incompleta, pra dar uma
  // conferida sem precisar terminar tudo primeiro.
  const abrirListaParaRevisao = async (lista) => {
      let cargosDaLista;
      if (pcState.perfil) {
        const completo = await carregarSalvamentoCompleto(lista.id);
        if (!completo) return;
        cargosDaLista = completo.cargos;
      } else {
        cargosDaLista = lista.palpitesPorCargo;
      }
      if (listaEhDaEraAntiga(cargosDaLista, pcState.estado)) {
        pcState.avisoEdicaoStatus = `"${lista.nome}" foi salva numa versão antiga do elenco de candidatos e não pode mais ser editada nem depositada — os candidatos dela já não correspondem aos registrados pra 2026. Crie uma lista nova a partir do palpite atual.`;
        renderMinhasListas();
        return;
      }
      pcState.listaSalvaId = lista.id;
      pcState.listaSalvaNome = lista.nome;
      persistirListaAtivaLocal();
      pcState.palpitesPorCargo = cargosDaLista;
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
  document.querySelectorAll("[data-pc-revisar-lista]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lista = listas.find((l) => l.id === btn.getAttribute("data-pc-revisar-lista"));
      if (lista) await abrirListaParaRevisao(lista);
    });
  });
  // Toque na lista inteira abre pra edição — antes era só pelo lápis
  // dedicado, que saiu (pedido do usuário, 24/08/2026: "não preciso
  // clicar no botão de editar"). O guard em .pc-ml-acoes evita que um
  // toque na urna/lixeira (dentro do mesmo card) dispare os dois.
  document.querySelectorAll("[data-pc-abrir-lista]").forEach((card) => {
    card.addEventListener("click", async (e) => {
      if (e.target.closest(".pc-ml-acoes")) return;
      const lista = listas.find((l) => l.id === card.getAttribute("data-pc-abrir-lista"));
      if (lista) await abrirListaParaEdicao(lista);
    });
  });
  document.querySelectorAll("[data-pc-excluir-lista]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-pc-excluir-lista");
      const nome = btn.getAttribute("data-pc-excluir-lista-nome") || "essa lista";
      if (!window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;
      if (pcState.perfil) {
        const { ok, error } = await excluirSalvamento(id);
        if (!ok) { pcState.erro = error && error.message ? error.message : "Não consegui excluir a lista."; renderMinhasListas(); return; }
      } else {
        await excluirListaLocal(pcState.estado, id);
      }
      // Se a lista excluída fosse a ativa no editor, solta a referência —
      // senão "Salvar" de novo revive uma lista que não existe mais.
      if (pcState.listaSalvaId === id) {
        pcState.listaSalvaId = null;
        pcState.listaSalvaNome = null;
        persistirListaAtivaLocal();
      }
      renderMinhasListas();
    });
  });
  // Edição paga de cédula depositada REMOVIDA (decisão do usuário,
  // 24/08/2026): imutabilidade é elemento de valor da cédula — o único
  // jeito de mudar de voto depois de depositar volta a ser uma cédula
  // NOVA (70 créditos, cenário paralelo), nunca reabrir a mesma. Histórico
  // de código: editarCedulaDepositada (nuvem/palpites.js) e a RPC da
  // migração 25 continuam existindo no banco, só não são mais chamadas
  // daqui — nada foi apagado no servidor, só o gatilho no app.
  const mlLegendaToggle = document.getElementById("pcMlLegendaToggle");
  if (mlLegendaToggle) {
    mlLegendaToggle.addEventListener("click", () => {
      pcState.legendaListasAberta = !pcState.legendaListasAberta;
      renderMinhasListas();
    });
  }
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
      pcState.avisoVagaNaoMarcadaResumo = null;
      pcState._anonimoPreAviso = false;
      pcState.avisoVagaNaoMarcadaConfirmado = false;
      renderMinhasListas();
    });
  });
  document.querySelectorAll("[data-pc-ver-lista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.listaEmVisualizacao = btn.getAttribute("data-pc-ver-lista");
      renderMinhasListas();
    });
  });
  document.querySelectorAll("[data-pc-ml-duelo]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioComparacaoId = btn.getAttribute("data-pc-ml-duelo");
    renderComparacaoDesafio();
  }));
  document.querySelectorAll("[data-pc-compartilhar-lista]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalCompartilharLista(btn.getAttribute("data-pc-compartilhar-lista"), listas));
  });
  if (listaModal) {
    document.getElementById("pcBtnCancelarDepositar").addEventListener("click", () => {
      pcState.modalDepositarListaId = null;
      pcState.avisoVagaNaoMarcadaResumo = null;
      pcState._anonimoPreAviso = false;
      pcState.avisoVagaNaoMarcadaConfirmado = false;
      renderMinhasListas();
    });
    document.getElementById("pcBtnConfirmarDepositar").addEventListener("click", async () => {
      const anonimo = document.getElementById("pcCheckAnonimo").checked;
      // 2º clique (botão já virou "Depositar mesmo assim", o aviso abaixo
      // já está na tela) — a pessoa decidiu, não pergunta de novo.
      if (pcState.avisoVagaNaoMarcadaResumo) pcState.avisoVagaNaoMarcadaConfirmado = true;
      // Política de 21/08/2026: lista da era antiga (elenco de 2022
      // embutido) NÃO pode virar cédula — o depósito é imutável, e uma
      // cédula não pode nascer com a base errada. Valida o conteúdo real
      // antes de cobrar/depositar qualquer coisa.
      let cargosPraValidar = null;
      if (pcState.perfil) {
        const completoVal = await carregarSalvamentoCompleto(listaModal.id);
        cargosPraValidar = completoVal ? completoVal.cargos : null;
      } else {
        cargosPraValidar = listaModal.palpitesPorCargo;
      }
      if (listaEhDaEraAntiga(cargosPraValidar, pcState.estado)) {
        pcState.modalDepositarListaId = null;
        pcState.avisoEdicaoStatus = `"${listaModal.nome}" foi salva numa versão antiga do elenco de candidatos e não pode ser depositada — os candidatos dela já não correspondem aos registrados pra 2026. Monte uma lista nova a partir do palpite atual.`;
        renderMinhasListas();
        return;
      }
      // Vaga que a votação de hoje já garantiria, mas a pessoa não marcou
      // como eleito (conceito fechado 12/08/2026, retomado hoje) — não
      // bloqueia o depósito, só avisa ANTES dele virar irreversível.
      // Reaproveita listaUnificadaRevisao (mesma régua soberana-do-usuário
      // da Revisão) em vez de recalcular do zero. Só checa na 1ª tentativa
      // dessa abertura do modal — depois de "Depositar mesmo assim" o
      // 2º clique já deposita direto, sem recalcular de novo.
      if (cargosPraValidar && !pcState.avisoVagaNaoMarcadaConfirmado) {
        const resumo = [];
        CARGOS.forEach((cargoDef) => {
          const listaCargo = cargosPraValidar[cargoDef.id];
          if (!listaCargo || !listaCargo.length) return;
          const naoMarcados = listaUnificadaRevisao(listaCargo, cargoDef.id)
            .filter((c) => !c.eleito && c.consistenteComMatematicaReal);
          if (naoMarcados.length) resumo.push({ cargo: cargoDef.label, nomes: naoMarcados.map((c) => c.nome) });
        });
        if (resumo.length) {
          pcState.avisoVagaNaoMarcadaResumo = resumo;
          // Preserva a escolha "anônima" no re-render do aviso — senão o
          // checkbox voltava desmarcado no meio do fluxo.
          pcState._anonimoPreAviso = anonimo;
          renderMinhasListas();
          return;
        }
      }
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
      pcState.avisoVagaNaoMarcadaResumo = null;
      pcState._anonimoPreAviso = false;
      pcState.avisoVagaNaoMarcadaConfirmado = false;
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
  pcState._farolContexto = "grupos";
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
      <div class="pc-lobby-banner-corpo">Cada amigo que entrar pelo seu link e <b>depositar a primeira cédula</b> rende <b>1 SL</b> pra você, automaticamente. Você recebe uma notificação a cada convite convertido.</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="pc-lobby-banner-btn" id="pcBtnCopiarConvite">${iconeSvg("copiar", 13)} Copiar link</button>
        <button class="pc-lobby-banner-btn" id="pcBtnZapConvite" style="background:none; border:1px solid #4D545C; color:var(--pc-ink);">${iconeSvg("send", 13)} WhatsApp</button>
      </div>
      <div class="pc-status" id="pcConviteStatus" style="margin-top:6px; min-height:12px;"></div>
    </div>` : ""}
    ${pcState.avisoLimiteGrupoAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Você chegou no limite grátis</div>
      <div class="pc-aviso-corpo">Sua conta tem espaço grátis pra <b>1 grupo criado</b>. Abrir outro custa <b>10 SL</b> — dá pra juntar convidando amigos: cada convite que vira cédula depositada rende <b>1 SL</b> (Menu → Convidar amigos), além dos SL dos marcos de presença e da Loja.</div>
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
    const textoConvite = `Eu já cravei os meus eleitos de 2026 no SIMULALEGIS. Te desafio pra um duelo 1×1 — entra pelo meu link: ${linkConvite}`;
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
      pcState.telaGrupo = "membro";
      renderGrupoMembro();
    });
  });
}

// ===== Desafios 1×1 (migração 28) — protótipos v6/v7, 23-24/08/2026 =====
// Duelo entre cédulas DEPOSITADAS: quem faz mais pontos na apuração leva.
// A pontuação de verdade (RANQUEAMENTO.md) ainda não existe — desafios
// selados ficam em "apuração" esperando essa peça; tudo antes disso
// (criar/aceitar/recusar/cancelar/expirar/prêmio) já funciona de ponta a
// ponta pelas RPCs do banco.
function _iniciaisNome(nome) {
  const partes = (nome || "?").trim().split(/\s+/);
  return ((partes[0] || "")[0] || "?").toUpperCase() + ((partes[1] || "")[0] || "").toUpperCase();
}

function _chipStatusDesafio(status) {
  const mapa = {
    aguardando: `<span class="pc-chip-lima">aguardando</span>`,
    selado: `<span class="pc-chip-neutro">apuração</span>`,
    apuracao: `<span class="pc-chip-neutro">apuração</span>`,
    encerrado: `<span class="pc-chip-verde">encerrado</span>`,
    recusado: `<span class="pc-chip-neutro">recusado</span>`,
    cancelado: `<span class="pc-chip-neutro">cancelado</span>`,
    expirado: `<span class="pc-chip-neutro">expirado</span>`,
  };
  return mapa[status] || "";
}

async function renderDesafiosHub() {
  pcState._farolContexto = "duelos";
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando seus desafios…");
  pcState.telaDesafio = "hub";
  const [desafios, gratis] = await Promise.all([listarMeusDesafios(), desafiosGratisRestantes(pcState.perfil.id)]);
  pcState.desafiosCache = desafios;
  pcState.desafiosGratisRestantes = gratis;

  const meuId = pcState.perfil.id;
  const recebidos = desafios.filter((d) => d.status === "aguardando" && d.desafiado_id === meuId);
  const andamento = desafios.filter((d) =>
    (d.status === "aguardando" && d.criador_id === meuId) || d.status === "selado" || d.status === "apuracao");
  const encerrados = desafios.filter((d) => ["encerrado", "recusado", "cancelado", "expirado"].includes(d.status));

  const linhaDuelo = (d) => {
    const souCriador = d.criador_id === meuId;
    const euNome = souCriador ? "Você" : (d.criador ? d.criador.nome : "Você");
    const dueloAberto = souCriador && !d.desafiado_id && d.status === "aguardando";
    const outroNome = souCriador ? (d.desafiado ? d.desafiado.nome : (dueloAberto ? "Convite aberto" : "?")) : (d.criador ? d.criador.nome : "?");
    const outroIniciais = _iniciaisNome(outroNome);
    const pendenteRecebido = d.status === "aguardando" && d.desafiado_id === meuId;
    const pendenteEnviado = d.status === "aguardando" && d.criador_id === meuId;
    const encerradoComPontos = d.status === "encerrado" && d.pontos_criador != null && d.pontos_desafiado != null;
    const meusPontos = souCriador ? d.pontos_criador : d.pontos_desafiado;
    const pontosOutro = souCriador ? d.pontos_desafiado : d.pontos_criador;
    const venci = d.vencedor_id && d.vencedor_id === meuId;
    const destacado = pcState.desafioDestacadoId && d.id === pcState.desafioDestacadoId;
    return `
    <div class="pc-duelo-card"${destacado ? ' id="pcDesafioDestacado" style="outline:2px solid var(--pc-accent); outline-offset:2px;"' : ""}>
      <div class="pc-duelo-cab">
        <span class="pc-duelo-nome">"${d.nome}"${pendenteEnviado ? ` <span style="color:var(--pc-ink-dim); font-weight:600;">· você desafiou</span>` : ""}</span>
        ${encerradoComPontos ? `<span class="${venci ? "pc-chip-verde" : "pc-chip-neutro"}">${venci ? "vitória" : "derrota"}</span>` : _chipStatusDesafio(d.status)}
      </div>
      <div class="pc-duelo-duo">
        <span class="pc-duelo-lado">
          <span class="pc-duelo-avatar ${souCriador ? "eu" : ""}">${_iniciaisNome(euNome)}</span>
          <span class="pc-duelo-tx"><span class="pc-duelo-p">${souCriador ? "Você" : euNome}</span><span class="pc-duelo-c">${encerradoComPontos ? Number(meusPontos).toLocaleString("pt-BR") + " pts" : ""}</span></span>
        </span>
        <span class="pc-duelo-vs">VS</span>
        <span class="pc-duelo-lado dir">
          <span class="pc-duelo-avatar">${outroIniciais}</span>
          <span class="pc-duelo-tx"><span class="pc-duelo-p">${outroNome}</span><span class="pc-duelo-c">${encerradoComPontos ? Number(pontosOutro).toLocaleString("pt-BR") + " pts" : (pendenteRecebido ? d.estado : "")}</span></span>
        </span>
      </div>
      ${pendenteRecebido ? `
      <div class="pc-duelo-acoes">
        <button class="primary" data-pc-aceitar="${d.id}" style="flex:1;">Aceitar</button>
        <button class="ghost" data-pc-recusar="${d.id}" style="flex:1;">Recusar</button>
      </div>` : ""}
      ${pendenteEnviado ? `
      <div class="pc-duelo-rodape">
        <span>${dueloAberto ? "convite aberto" : "enviado"} ${new Date(d.criado_em).toLocaleDateString("pt-BR")} · expira ${new Date(d.expira_em).toLocaleDateString("pt-BR")}</span>
      </div>
      ${dueloAberto ? `
      <div class="pc-duelo-acoes">
        <button class="primary" data-pc-duelo-cartao="${d.codigo}" data-pc-duelo-nome="${escaparAtributoHtml(d.nome)}" data-pc-duelo-cargo="${d.cargo}" data-pc-duelo-ncand="${(d.escopo_candidatos || []).length}" data-pc-duelo-uf="${d.estado}" style="flex:1; font-size:12px;">Enviar o convite</button>
        <button class="ghost" data-pc-duelo-whats="${d.codigo}" data-pc-duelo-nome="${escaparAtributoHtml(d.nome)}" style="flex:1; font-size:12px;">Só texto</button>
        <button class="ghost" data-pc-duelo-copiar="${d.codigo}" style="flex:1; font-size:12px;">Copiar link</button>
      </div>` : ""}
      <div class="pc-duelo-acoes"><button class="ghost" data-pc-cancelar="${d.id}" style="font-size:11.5px; padding:8px 12px;">Cancelar${d.custo_sl ? ` e recuperar ${d.custo_sl} SL` : ""}</button></div>` : ""}
      ${(d.status === "selado" || d.status === "apuracao") ? `<div class="pc-duelo-rodape"><span>selado em ${new Date(d.respondido_em || d.criado_em).toLocaleDateString("pt-BR")}</span><span>${d.estado}</span></div>` : ""}
      ${["selado", "apuracao", "encerrado"].includes(d.status) ? `<div class="pc-duelo-acoes"><button class="ghost" data-pc-comparar="${d.id}" style="flex:1; font-size:11.5px;">Ver comparação</button></div>` : ""}
    </div>`;
  };

  conteudo.innerHTML = `
    <div id="pcFarolBloco"></div>
    <button class="ghost" id="pcBtnVoltarDesafios" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Duelos</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Quem faz mais pontos na apuração leva. A régua é a mesma do documento e do ranking.</div>
    <button class="primary" id="pcBtnCriarDesafio" style="width:100%; margin-bottom:6px;">Criar duelo</button>
    <div style="font-size:11px; color:var(--pc-ink-dim); text-align:center; margin-bottom:18px;">Duelar é sempre grátis — desafie quantos quiser.</div>

    ${recebidos.length ? `<div class="pc-lobby-menu-tit" style="margin-top:0;">Te desafiaram · ${recebidos.length}</div>${recebidos.map(linhaDuelo).join("")}` : ""}
    ${andamento.length ? `<div class="pc-lobby-menu-tit">Em andamento · ${andamento.length}</div>${andamento.map(linhaDuelo).join("")}` : ""}
    ${encerrados.length ? `<div class="pc-lobby-menu-tit">Encerrados</div>${encerrados.slice(0, 10).map(linhaDuelo).join("")}` : ""}
    ${!desafios.length ? `<div class="pc-lobby-card">${estadoVazio({ icone: "desafio", titulo: "Nenhum duelo ainda", texto: "Crie o primeiro — o custo do duelo já está descrito acima." })}</div>` : ""}
    <div class="pc-status" id="pcDesafiosStatus" style="margin-top:10px; min-height:12px;"></div>
  `;
  atualizarFarol();
  if (pcState.desafioDestacadoId) {
    const alvo = document.getElementById("pcDesafioDestacado");
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    pcState.desafioDestacadoId = null; // só destaca na primeira renderização vinda da notificação
  }
  document.getElementById("pcBtnVoltarDesafios").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.getElementById("pcBtnCriarDesafio").addEventListener("click", () => {
    pcState.desafioCriarPasso = 1; pcState.desafioCriarAlvoModo = null;
    pcState.desafioCriarNome = ""; pcState.desafioCriarAlvo = null;
    pcState.desafioCriarCodigoInput = ""; pcState.desafioCriarCodigoStatus = "";
    pcState.desafioCriarCargo = null; pcState.desafioCriarModo = null;
    pcState.desafioCriarPartidoFiltro = null; pcState.desafioCriarBusca = "";
    pcState.desafioCriarSelecionados = new Set(); pcState.desafioCriarVotos = {};
    pcState.desafioStatus = "";
    renderCriarDesafio();
  });
  document.querySelectorAll("[data-pc-aceitar]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioAceitarId = btn.getAttribute("data-pc-aceitar");
    pcState.desafioAceitarFase = "convite";
    pcState.desafioAceitarVotos = {};
    pcState.desafioStatus = "";
    renderAceitarDesafio();
  }));
  document.querySelectorAll("[data-pc-recusar]").forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const r = await recusarDesafio(btn.getAttribute("data-pc-recusar"));
    if (!r.ok) { document.getElementById("pcDesafiosStatus").textContent = "Não deu: " + r.mensagem; btn.disabled = false; return; }
    renderDesafiosHub();
  }));
  document.querySelectorAll("[data-pc-cancelar]").forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const r = await cancelarDesafio(btn.getAttribute("data-pc-cancelar"));
    if (!r.ok) { document.getElementById("pcDesafiosStatus").textContent = "Não deu: " + r.mensagem; btn.disabled = false; return; }
    if (pcState.perfil) { try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {} }
    renderDesafiosHub();
  }));
  document.querySelectorAll("[data-pc-comparar]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioComparacaoId = btn.getAttribute("data-pc-comparar");
    renderComparacaoDesafio();
  }));
  // Convite do duelo aberto (migração 40): o link carrega o código do
  // duelo E o código de convite pessoal — a pessoa que entrar por ele
  // conta como convite convertido (1 SL) além de cair direto no duelo.
  const _linkDuelo = (codigoDuelo) => {
    const base = window.location.origin + window.location.pathname + "?duelo=" + codigoDuelo;
    return pcState.perfil && pcState.perfil.codigo_convite ? base + "&conv=" + pcState.perfil.codigo_convite : base;
  };
  document.querySelectorAll("[data-pc-duelo-cartao]").forEach((btn) => btn.addEventListener("click", async () => {
    const nomeDuelo = btn.getAttribute("data-pc-duelo-nome") || "duelo";
    const cargoInfo = CARGOS.find((c) => c.id === btn.getAttribute("data-pc-duelo-cargo")) || {};
    const nCand = Number(btn.getAttribute("data-pc-duelo-ncand")) || 0;
    const ufSigla = btn.getAttribute("data-pc-duelo-uf") || pcState.estado;
    const nomeEstado = ((ESTADOS_BRASIL.find((e) => e.sigla === ufSigla) || {}).nome) || ufSigla;
    const infoRecorte = [cargoInfo.label, nCand ? nCand + " candidatos" : null, nomeEstado].filter(Boolean).join(" \u00b7 ");
    const texto = `Bora pro x1? Este \u00e9 o meu palpite eleitoral legislativo 2026. Tem coragem de encarar?: "${nomeDuelo}". ${_linkDuelo(btn.getAttribute("data-pc-duelo-cartao"))}`;
    const canvas = gerarImagemConviteDuelo({ nomeCriador: (pcState.perfil && pcState.perfil.nome) || "Eu", nomeDuelo, infoRecorte });
    const dataUrl = canvas.toDataURL("image/png");
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const arquivo = new File([blob], "convite-duelo.png", { type: "image/png" });
        if (navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], text: texto });
          return;
        }
      } catch (_) { /* cancelou o nativo ou falhou — cai no fallback */ }
    }
    // Computador (sem compartilhamento nativo): baixa a imagem e deixa o
    // texto+link no clipboard pra colar junto.
    _baixarImagemCedula(dataUrl, "convite-duelo.png");
    try { await navigator.clipboard.writeText(texto); } catch (_) {}
  }));
  document.querySelectorAll("[data-pc-duelo-whats]").forEach((btn) => btn.addEventListener("click", () => {
    const nomeDuelo = btn.getAttribute("data-pc-duelo-nome");
    const texto = `Bora pro x1? Este é o meu palpite eleitoral legislativo 2026. Tem coragem de encarar?: "${nomeDuelo}". ${_linkDuelo(btn.getAttribute("data-pc-duelo-whats"))}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }));
  document.querySelectorAll("[data-pc-duelo-copiar]").forEach((btn) => btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(_linkDuelo(btn.getAttribute("data-pc-duelo-copiar")));
      btn.textContent = "Link copiado!";
      setTimeout(() => { btn.textContent = "Copiar link"; }, 1800);
    } catch (e) {
      document.getElementById("pcDesafiosStatus").textContent = "Não consegui copiar — segure o link e copie: " + _linkDuelo(btn.getAttribute("data-pc-duelo-copiar"));
    }
  }));
}

// Achata pcState.palpitesPorCargo[cargo] (partidos → candidatos) numa
// lista simples {chave, nome, partido} — é o pool oficial do cargo (2026,
// REGRA MESTRA), a mesma fonte que a tela de palpite já usa.
function _poolCandidatosDesafio(cargo) {
  // Fonte dos palpites, em ordem: (1) a LISTA SALVA escolhida no seletor
  // do Criar duelo (pcState._desafioFonteCargos, decisão do usuário
  // 30/08/2026 — quem tem várias listas escolhe qual alimenta o duelo);
  // (2) o rascunho em edição; (3) o pool oficial 2026 zerado.
  const daFonte = pcState._desafioFonteCargos && pcState._desafioFonteCargos[cargo] && pcState._desafioFonteCargos[cargo].length
    ? pcState._desafioFonteCargos[cargo] : null;
  const grupos = daFonte
    || ((pcState.palpitesPorCargo && pcState.palpitesPorCargo[cargo] && pcState.palpitesPorCargo[cargo].length)
      ? pcState.palpitesPorCargo[cargo]
      : montarEstadoPalpite("assembleia", null, null, cargo, pcState.estado));
  const lista = [];
  (grupos || []).forEach((p) => {
    if (p.semAta2026) return;
    (p.candidatos || []).forEach((c) => {
      if (c.fonte === "legenda") return;
      // "votos" acompanha (decisão do usuário 30/08/2026): o duelo puxa
      // os palpites da lista em edição como ponto de partida — ninguém
      // digita 30 números do zero de novo.
      lista.push({ chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos: Number(c.votos) || 0, marcadoEleito: !!c.marcadoEleito });
    });
  });
  return lista;
}

// Criar desafio (protótipo aprovado 30/08/2026): pílula de CARGO + pílula
// de DISPUTA (Eleitos/Cargo/Partido/Candidato) com uma linha explicando a
// opção ativa, visibilidade dos votos (abertos/ocultos) e o recorte
// "Eleitos" — plenário com o número fixo de cadeiras do cargo, preenchido
// cadeira a cadeira pela gaveta. Tudo numa tela só, recarregada a cada
// interação (mesmo padrão do resto do app).
const DESAFIO_TIPOS = [
  { id: "eleitos", rotulo: "Eleitos", dica: "Monte o plenário cadeira a cadeira — vence quem acertar a composição." },
  { id: "cargo", rotulo: "Cargo", dica: "Todos os candidatos do cargo — votação completa." },
  { id: "partido", rotulo: "Partido", dica: "Um ou mais partidos inteiros — só a votação deles." },
  { id: "candidato", rotulo: "Candidato", dica: "Nomes escolhidos a dedo — até um único candidato." },
];

function _duelaCorPartido(partido) {
  return corPartidoIdeologico(partido);
}

function _duelaIniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/);
  return ((partes[0] || " ")[0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Grade de cadeiras do recorte Eleitos — compartilhada entre Criar e
// Aceitar. cadeiras: [{chave,nome,partido} | null]; ativa: índice da
// cadeira selecionada (anel verde) ou null.
function _duelaGradeCadeiras(cadeiras, ativa, prefixoData) {
  const poucos = cadeiras.length <= 5;
  const celulas = cadeiras.map((c, i) => {
    const cls = "pc-duelo-cadeira" + (c ? " cheia" : "") + (i === ativa ? " ativa" : "") + (poucos ? " grande" : "");
    const estilo = c ? ` style="background:${_duelaCorPartido(c.partido)};"` : "";
    const conteudo = c
      ? `<span class="ini">${_duelaIniciais(c.nome)}</span>${poucos ? `<span class="quem">${c.nome}</span><span class="pt">${siglaCurta(c.partido)}</span>` : ""}`
      : (i === ativa ? '<span class="mais">+</span>' : "");
    return `<button type="button" class="${cls}"${estilo} data-${prefixoData}="${i}" title="Cadeira ${i + 1}${c ? " — " + escaparAtributoHtml(c.nome) : ""}">${conteudo}</button>`;
  }).join("");
  return `<div class="pc-duelo-grade${poucos ? " poucos" : ""}">${celulas}</div>`;
}

// Gaveta que sobe ao tocar numa cadeira: busca no pool (menos quem já está
// sentado) + "Sentar aqui"; cadeira ocupada ganha "Esvaziar".
function _duelaGavetaCadeira(cadeiras, ativa, pool, busca, prefixoData) {
  if (ativa == null) return "";
  const sentados = new Set(cadeiras.filter(Boolean).map((c) => c.chave));
  const ocupante = cadeiras[ativa];
  const termo = (busca || "").trim().toLowerCase();
  const candidatos = pool
    .filter((c) => !sentados.has(c.chave))
    .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || c.partido.toLowerCase().includes(termo))
    .slice(0, 8);
  return `
    <div class="pc-duelo-gaveta">
      <div class="pc-duelo-gaveta-alca"></div>
      <div class="pc-duelo-gaveta-cab">
        <span>Cadeira ${ativa + 1}</span>
        <span class="dim">${ocupante ? escaparAtributoHtml(ocupante.nome) : "quem ocupa?"}</span>
      </div>
      ${ocupante ? `<button type="button" class="ghost" id="pcBtnEsvaziarCadeira" style="width:100%; margin-bottom:8px; font-size:11.5px;">Esvaziar esta cadeira</button>` : ""}
      <input class="cell" id="pcBuscaCadeira" placeholder="Buscar candidato…" value="${escaparAtributoHtml(busca || "")}" style="width:100%; margin-bottom:4px;">
      ${candidatos.map((c) => `
        <div class="pc-voto-linha">
          <span class="txt"><span class="nome">${c.nome}</span><span class="partido">${c.partido}</span></span>
          <button type="button" class="pc-chip-partido sel" data-${prefixoData}-sentar="${escaparAtributoHtml(c.chave)}" style="cursor:pointer;">Sentar aqui</button>
        </div>`).join("") || `<div class="pc-sub" style="padding:8px 0;">Nenhum candidato disponível nessa busca.</div>`}
    </div>`;
}

function _duelaPoolPorChave(pool) {
  const m = new Map();
  pool.forEach((c) => m.set(c.chave, c));
  return m;
}

async function renderCriarDesafio() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando…");
  const gratis = await desafiosGratisRestantes(pcState.perfil.id);
  if (!pcState.desafioCriarCargo) pcState.desafioCriarCargo = (CARGOS.find((c) => c.disponivel) || CARGOS[0]).id;
  if (!pcState.desafioCriarTipo) pcState.desafioCriarTipo = "eleitos";
  if (!pcState.desafioCriarPasso) pcState.desafioCriarPasso = 1;
  if (!pcState.desafioCriarSelecionados) pcState.desafioCriarSelecionados = new Set();
  if (!pcState.desafioCriarPartidosSel) pcState.desafioCriarPartidosSel = new Set();
  if (!pcState.desafioCriarVotos) pcState.desafioCriarVotos = {};
  if (!pcState.desafioCriarAmigos) {
    if (pcState.perfil) await garantirMeusGruposCarregados();
    pcState.desafioCriarAmigos = await listarAmigosParaDesafio(pcState.meusGrupos);
  }
  const amigos = pcState.desafioCriarAmigos;
  const custo = gratis > 0 ? 0 : 10;
  if (!pcState._desafioMinhasListas) pcState._desafioMinhasListas = await _carregarMinhasListasNormalizado();
  const minhasListasFonte = pcState._desafioMinhasListas || [];

  const cargo = pcState.desafioCriarCargo;
  const tipo = pcState.desafioCriarTipo;
  const passo = pcState.desafioCriarPasso;
  const pool = _poolCandidatosDesafio(cargo);
  const vagas = vagasFixasCargo(pcState.estado, cargo);
  if (!pcState.desafioCriarCadeiras || pcState.desafioCriarCadeiras.length !== vagas || pcState._desafioCadeirasCargo !== cargo) {
    pcState.desafioCriarCadeiras = new Array(vagas).fill(null);
    // Cadeiras já nascem com os ELEITOS MARCADOS na fonte escolhida
    // (decisão do usuário, 30/08/2026).
    const jaEleitos = pool.filter((c) => c.marcadoEleito)
      .sort((a, b) => (b.votos || 0) - (a.votos || 0)).slice(0, vagas);
    jaEleitos.forEach((c, i) => {
      pcState.desafioCriarCadeiras[i] = { chave: c.chave, nome: c.nome, partido: c.partido };
    });
    pcState._desafioCadeirasCargo = cargo;
    pcState.desafioCriarCadeiraAtiva = null;
  }
  const cadeiras = pcState.desafioCriarCadeiras;
  const preenchidas = cadeiras.filter(Boolean).length;

  const partidos = [...new Set(pool.map((c) => c.partido))].sort();
  const contagemPartido = {};
  pool.forEach((c) => { contagemPartido[c.partido] = (contagemPartido[c.partido] || 0) + 1; });
  const busca = (pcState.desafioCriarBusca || "").trim().toLowerCase();
  const poolBusca = tipo === "candidato" ? pool.filter((c) => !busca || c.nome.toLowerCase().includes(busca)).slice(0, 30) : [];

  let selecionados = [];
  if (tipo === "cargo") selecionados = pool;
  else if (tipo === "partido") selecionados = pool.filter((c) => pcState.desafioCriarPartidosSel.has(c.partido));
  else if (tipo === "candidato") selecionados = pool.filter((c) => pcState.desafioCriarSelecionados.has(c.chave));

  const tipoInfo = DESAFIO_TIPOS.find((t) => t.id === tipo);
  const cargoRotulo = ((CARGOS.find((c) => c.id === cargo) || {}).label || "").replace(/^Dep\.\s*/, "");
  const fonteNome = pcState.desafioCriarFonteId
    ? ((minhasListasFonte.find((l) => l.id === pcState.desafioCriarFonteId) || {}).nome || "lista salva")
    : "lista em edição";

  // Indicador 1-2-3 no topo — mesma família do Farol (pontos com check).
  const ck = `<svg viewBox="0 0 16 16" width="11" height="11"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  const passosHtml = `
    <div class="pc-duelo-passos">
      ${[["Disputa", 1], ["Palpite", 2], ["Rival", 3]].map(([rot, n], i) => `
        ${i > 0 ? `<span class="pc-duelo-passo-fio${passo > i ? " on" : ""}"></span>` : ""}
        <span class="pc-duelo-passo${passo === n ? " atual" : passo > n ? " feito" : ""}">
          <span class="bol">${passo > n ? ck : n}</span><span class="rot">${rot}</span>
        </span>`).join("")}
    </div>`;

  const resumoHtml = (texto, voltaPra) => `
    <div class="pc-duelo-resumo">
      <span class="ic">${ck}</span>
      <span class="tx">${texto}</span>
      <button type="button" class="mudar" data-pc-duelo-volta="${voltaPra}">mudar</button>
    </div>`;

  const okPasso1 = tipo === "cargo" || tipo === "eleitos"
    || (tipo === "partido" && pcState.desafioCriarPartidosSel.size > 0)
    || (tipo === "candidato" && pcState.desafioCriarSelecionados.size > 0);
  const okPasso2 = tipo === "eleitos" ? preenchidas === vagas : selecionados.length > 0;
  const resumoDisputa = `${cargoRotulo} · ${tipoInfo.rotulo}${tipo === "partido" ? ` · <b>${[...pcState.desafioCriarPartidosSel].join(", ")}</b> (${selecionados.length})` : tipo === "candidato" ? ` · <b>${selecionados.length} candidato${selecionados.length === 1 ? "" : "s"}</b>` : tipo === "eleitos" ? ` · <b>${vagas} cadeiras</b>` : ` · <b>${pool.length} candidatos</b>`}`;

  const maxVotoSel = Math.max(1, ...selecionados.map((c) => Number(pcState.desafioCriarVotos[c.chave] ?? c.votos) || 0));

  let corpo = "";
  if (passo === 1) {
    corpo = `
      <label class="pc-campo-label">Cargo</label>
      <div class="pc-cargo-switch" style="margin-bottom:12px;">
        ${CARGOS.filter((c) => c.disponivel).map((c) => `<button type="button" class="${c.id === cargo ? "active" : ""}" data-pc-cargo-desafio="${c.id}">${c.label.replace(/^Dep\.\s*/, "")}</button>`).join("")}
      </div>

      <label class="pc-campo-label">Disputa</label>
      <div class="pc-cargo-switch" style="margin-bottom:6px;">
        ${DESAFIO_TIPOS.map((t) => `<button type="button" class="${t.id === tipo ? "active" : ""}" data-pc-tipo-desafio="${t.id}">${t.rotulo}</button>`).join("")}
      </div>
      <div class="pc-sub" style="margin:0 2px 14px;">${tipoInfo.dica}</div>

      ${tipo === "partido" ? `
        <label class="pc-campo-label">Quais partidos</label>
        <div style="margin-bottom:8px;">
          ${partidos.map((p) => `<span class="pc-chip-partido ${pcState.desafioCriarPartidosSel.has(p) ? "sel" : ""}" data-pc-chip-partido="${escaparAtributoHtml(p)}">${p} · ${contagemPartido[p]}</span>`).join("")}
        </div>
      ` : ""}

      ${tipo === "candidato" ? `
        <label class="pc-campo-label">Quais candidatos</label>
        <input class="cell" id="pcBuscaCandDesafio" placeholder="Buscar candidato…" value="${escaparAtributoHtml(pcState.desafioCriarBusca || "")}" style="width:100%; margin-bottom:10px;">
        <div class="pc-grade-cand">
          ${poolBusca.map((c) => `
            <label class="pc-cand-row">
              <input type="checkbox" data-pc-cand-check="${escaparAtributoHtml(c.chave)}" ${pcState.desafioCriarSelecionados.has(c.chave) ? "checked" : ""}>
              <span class="txt"><span class="nome">${c.nome}</span><span class="partido">${c.partido}</span></span>
            </label>`).join("") || `<div class="pc-sub">Nenhum candidato encontrado.</div>`}
        </div>
      ` : ""}

      ${okPasso1 && tipo !== "eleitos" && tipo !== "cargo" ? `<div class="pc-sub" style="margin:2px 2px 4px;">${selecionados.length} candidato${selecionados.length === 1 ? "" : "s"} no duelo.</div>` : ""}
      ${tipo === "cargo" ? `<div class="pc-sub" style="margin:2px 2px 4px;">Todos os ${pool.length} candidatos de ${cargoRotulo} entram no duelo.</div>` : ""}

      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="ghost" id="pcBtnVoltarCriarDesafio" style="flex:1;">Cancelar</button>
        <button class="primary" id="pcBtnPassoAvancar" style="flex:2;" ${okPasso1 ? "" : "disabled"}>Continuar</button>
      </div>`;
  } else if (passo === 2) {
    corpo = `
      ${resumoHtml(resumoDisputa, 1)}

      ${minhasListasFonte.length ? `
      <label class="pc-campo-label">Puxar palpites de</label>
      <select class="cell" id="pcSelFonteDuelo" style="width:100%; margin-bottom:12px;">
        <option value="">Lista em edição (rascunho atual)</option>
        ${minhasListasFonte.map((l) => `<option value="${l.id}" ${pcState.desafioCriarFonteId === l.id ? "selected" : ""}>${escaparAtributoHtml(l.nome)}${l.depositadoEm ? " · depositada" : ""}</option>`).join("")}
      </select>` : ""}

      ${tipo === "eleitos" ? `
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px;">
          <label class="pc-campo-label" style="margin:0;">Seu plenário</label>
          <span style="font-size:11px; font-weight:800; color:var(--pc-accent); font-variant-numeric:tabular-nums;">${preenchidas}<span style="color:var(--pc-ink-dim); font-weight:600;"> / ${vagas}</span></span>
        </div>
        <div class="pc-duelo-progresso"><i style="width:${vagas ? (preenchidas / vagas * 100).toFixed(1) : 0}%;"></i></div>
        ${_duelaGradeCadeiras(cadeiras, pcState.desafioCriarCadeiraAtiva, "pc-cadeira")}
        ${_duelaGavetaCadeira(cadeiras, pcState.desafioCriarCadeiraAtiva, pool, pcState.desafioCriarBuscaCadeira, "pc-cadeira")}
      ` : `
        <label class="pc-campo-label">Seus votos indicados</label>
        <button class="ghost" id="pcBtnCopiarPalpiteRival" style="width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:7px; border-color:rgba(52,232,74,.4); color:var(--pc-accent);">${iconeSvg("magico", 14)} Copiar o palpite de ${nomeDesafiante.split(" ")[0]} como ponto de partida</button>
        <div class="pc-duelo-colcab"><span class="cand">Candidato</span><span class="rival">Rival</span><span class="voce" style="width:118px;">Você</span></div>
        <div class="pc-lobby-card" style="padding:2px 14px; margin-bottom:14px; max-height:420px; overflow-y:auto;">
          ${(() => {
            // Agrupado por partido; o ajuste vive nas caixinhas de cada linha
            // (aprovado no protótipo v6, 31/08/2026): tocar no valor do RIVAL
            // copia ele pro seu palpite; −/+ ao lado do seu campo andam 5% do
            // voto do rival naquele candidato (mínimo 10) por toque.
            const grupos = new Map();
            escopo.forEach((c) => { if (!grupos.has(c.partido)) grupos.set(c.partido, []); grupos.get(c.partido).push(c); });
            const rivalDe = (c) => votosRivalPorChave.get(c.chave) || 0;
            const ordemG = [...grupos.entries()].sort((a, b) =>
              b[1].reduce((t, c) => t + rivalDe(c), 0) - a[1].reduce((t, c) => t + rivalDe(c), 0));
            return ordemG.map(([partido, cands]) => `
              <div class="pc-aceitar-gcab"><span class="sigla">${partido}</span><span class="dica">toque no valor do rival pra copiar</span></div>
              ${[...cands].sort((a, b) => rivalDe(b) - rivalDe(a)).map((c) => `
              <div class="pc-voto-linha">
                <span class="txt"><span class="nome">${c.nome}</span></span>
                <button type="button" class="pc-voto-rival clicavel" data-pc-voto-copiar="${escaparAtributoHtml(c.chave)}" title="Copiar este valor pro seu palpite">${rivalDe(c).toLocaleString("pt-BR")}</button>
                <span class="pc-voto-ajuste">
                  <button type="button" class="pc-mini-passo" data-pc-voto-passo="${escaparAtributoHtml(c.chave)}|-1">&minus;</button>
                  <input type="number" min="0" inputmode="numeric" data-pc-voto-aceitar="${escaparAtributoHtml(c.chave)}" value="${pcState.desafioAceitarVotos[c.chave] ?? ""}" placeholder="0">
                  <button type="button" class="pc-mini-passo" data-pc-voto-passo="${escaparAtributoHtml(c.chave)}|1">+</button>
                </span>
              </div>`).join("")}`).join("");
          })()}
        </div>
      `}

      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="ghost" id="pcBtnPassoVoltar" style="flex:1;">Voltar</button>
        <button class="primary" id="pcBtnPassoAvancar" style="flex:2;" ${okPasso2 ? "" : "disabled"}>Continuar</button>
      </div>`;
  } else {
    const alvoModo = pcState.desafioCriarAlvoModo;
    corpo = `
      ${resumoHtml(`${resumoDisputa} · votos da <b>${escaparAtributoHtml(fonteNome)}</b>`, 2)}

      <label class="pc-campo-label">Quem você desafia</label>
      ${pcState.desafioCriarAlvo ? `
        <div class="pc-amigo-op" style="border-bottom:none; padding-left:0;">
          <span class="pc-cedula-anel" style="width:16px; height:16px; border-color:var(--pc-accent); background:radial-gradient(circle at center, var(--pc-accent) 0 40%, transparent 45%);"></span>
          <span class="pc-duelo-avatar eu" style="width:28px; height:28px; font-size:10px;">${pcState.desafioCriarAlvo.aberto ? iconeSvg("convidar", 13) : _iniciaisNome(pcState.desafioCriarAlvo.nome)}</span>
          <span style="flex:1; font-size:12.5px; font-weight:600;">${pcState.desafioCriarAlvo.nome}${pcState.desafioCriarAlvo.aberto ? `<br><span style="font-size:10px; font-weight:400; color:var(--pc-ink-dim);">o link do convite aparece depois de enviar</span>` : ""}</span>
          <button type="button" class="ghost" id="pcBtnTrocarAlvo" style="font-size:10.5px; padding:5px 10px;">Trocar</button>
        </div>
      ` : `
        <button type="button" class="pc-duelo-aberto-op" id="pcBtnDueloAberto">
          <span class="pc-duelo-aberto-ic">${iconeSvg("convidar", 16)}</span>
          <span class="pc-duelo-aberto-tx"><b>Quem ainda não está no jogo</b><i>Convite de WhatsApp — a pessoa entra e cai direto no seu duelo.</i></span>
        </button>
        ${amigos.length ? `
        <button type="button" class="pc-duelo-aberto-op neutro" id="pcBtnAlvoGrupo">
          <span class="pc-duelo-aberto-ic neutro">${iconeSvg("grupos", 16)}</span>
          <span class="pc-duelo-aberto-tx"><b>Alguém do meu grupo</b><i>${amigos.slice(0, 2).map((a) => a.nome.split(" ")[0]).join(", ")}${amigos.length > 2 ? ` e mais ${amigos.length - 2}` : ""}</i></span>
        </button>
        ${alvoModo === "grupo" ? `
        <div class="pc-lobby-card" style="padding:4px 14px; margin-bottom:8px;">${amigos.map((a) => `
          <button type="button" class="pc-amigo-op" data-pc-alvo-amigo="${a.id}" data-pc-alvo-nome="${escaparAtributoHtml(a.nome)}" style="width:100%; background:none; border:none; border-bottom:1px solid var(--pc-glass-border); cursor:pointer; font-family:inherit;">
            <span class="pc-duelo-avatar" style="width:28px; height:28px; font-size:10px;">${_iniciaisNome(a.nome)}</span>
            <span style="flex:1; font-size:12.5px; font-weight:600; text-align:left;">${a.nome}</span>
            <span style="font-size:10px; color:var(--pc-ink-dim);">${a.grupo}</span>
          </button>`).join("")}</div>` : ""}` : ""}
        <button type="button" class="pc-duelo-aberto-op neutro" id="pcBtnAlvoCodigo">
          <span class="pc-duelo-aberto-ic neutro">${iconeSvg("chave", 15)}</span>
          <span class="pc-duelo-aberto-tx"><b>Pelo código do usuário</b><i>SL-XXXXXX de quem já joga.</i></span>
        </button>
        ${alvoModo === "codigo" ? `
        <div style="display:flex; gap:8px; margin-bottom:6px;">
          <input class="cell" id="pcInputCodigoDesafio" placeholder="Código do usuário (SL-XXXXXX)" maxlength="9" value="${escaparAtributoHtml(pcState.desafioCriarCodigoInput || "")}" style="flex:1;">
          <button type="button" class="ghost" id="pcBtnBuscarCodigo" style="flex-shrink:0;">Buscar</button>
        </div>
        ${pcState.desafioCriarCodigoStatus ? `<div class="pc-sub" style="margin:-2px 0 10px;">${pcState.desafioCriarCodigoStatus}</div>` : ""}` : ""}
      `}

      <label class="pc-campo-label" style="margin-top:12px;">Nome do duelo</label>
      <input class="cell" id="pcInputNomeDesafio" placeholder='"Duelo de Titãs"' maxlength="40" value="${escaparAtributoHtml(pcState.desafioCriarNome || "")}" style="width:100%; margin-bottom:10px;">

      <div class="pc-precinho">
        <span class="pc-precinho-txt"><b>Grátis</b> — duelar não custa SL, desafie quantos quiser.</span>
        <span class="pc-precinho-val" style="color:var(--pc-accent);">grátis</span>
      </div>

      <div style="display:flex; gap:8px;">
        <button class="ghost" id="pcBtnPassoVoltar" style="flex:1;">Voltar</button>
        <button class="primary" id="pcBtnEnviarDesafio" style="flex:2;" ${pcState.desafioCriarAlvo ? "" : "disabled"}>Enviar duelo</button>
      </div>
      <div class="pc-status" id="pcCriarDesafioStatus" style="margin-top:8px; min-height:12px;"></div>`;
  }

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnSairCriarDesafio" style="margin-bottom:12px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Duelos</button>
      <h2 style="margin-bottom:10px;">Criar duelo</h2>
      ${passosHtml}
      ${corpo}
    </div>`;

  const irPara = (n) => { pcState.desafioCriarPasso = n; renderCriarDesafio(); };
  document.getElementById("pcBtnSairCriarDesafio").addEventListener("click", () => renderDesafiosHub());
  const btnVoltarP = document.getElementById("pcBtnPassoVoltar");
  if (btnVoltarP) btnVoltarP.addEventListener("click", () => irPara(passo - 1));
  const btnVoltarCriar = document.getElementById("pcBtnVoltarCriarDesafio");
  if (btnVoltarCriar) btnVoltarCriar.addEventListener("click", () => renderDesafiosHub());
  const btnAvancar = document.getElementById("pcBtnPassoAvancar");
  if (btnAvancar) btnAvancar.addEventListener("click", () => irPara(passo + 1));
  document.querySelectorAll("[data-pc-duelo-volta]").forEach((b) => b.addEventListener("click", () => irPara(Number(b.getAttribute("data-pc-duelo-volta")))));

  // --- Passo 1 ---
  document.querySelectorAll("[data-pc-cargo-desafio]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioCriarCargo = btn.getAttribute("data-pc-cargo-desafio");
    pcState.desafioCriarSelecionados = new Set();
    pcState.desafioCriarPartidosSel = new Set();
    pcState.desafioCriarVotos = {};
    renderCriarDesafio();
  }));
  document.querySelectorAll("[data-pc-tipo-desafio]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioCriarTipo = btn.getAttribute("data-pc-tipo-desafio");
    pcState.desafioCriarVotos = {};
    pcState.desafioCriarBusca = "";
    renderCriarDesafio();
  }));
  document.querySelectorAll("[data-pc-chip-partido]").forEach((chip) => chip.addEventListener("click", () => {
    const p = chip.getAttribute("data-pc-chip-partido");
    if (pcState.desafioCriarPartidosSel.has(p)) pcState.desafioCriarPartidosSel.delete(p);
    else pcState.desafioCriarPartidosSel.add(p);
    renderCriarDesafio();
  }));
  const inputBusca = document.getElementById("pcBuscaCandDesafio");
  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => { pcState.desafioCriarBusca = e.target.value; renderCriarDesafio(); });
    if (pcState.desafioCriarBusca) { inputBusca.focus(); inputBusca.setSelectionRange(inputBusca.value.length, inputBusca.value.length); }
  }
  document.querySelectorAll("[data-pc-cand-check]").forEach((chk) => chk.addEventListener("change", (e) => {
    const chave = chk.getAttribute("data-pc-cand-check");
    if (e.target.checked) pcState.desafioCriarSelecionados.add(chave);
    else { pcState.desafioCriarSelecionados.delete(chave); delete pcState.desafioCriarVotos[chave]; }
    renderCriarDesafio();
  }));

  // --- Passo 2 ---
  const selFonte = document.getElementById("pcSelFonteDuelo");
  if (selFonte) selFonte.addEventListener("change", async () => {
    const id = selFonte.value || null;
    pcState.desafioCriarFonteId = id;
    pcState.desafioCriarVotos = {};
    pcState.desafioCriarCadeiras = null;
    if (!id) {
      pcState._desafioFonteCargos = null;
      renderCriarDesafio();
      return;
    }
    selFonte.disabled = true;
    const completo = await carregarSalvamentoCompleto(id);
    pcState._desafioFonteCargos = completo ? completo.cargos : null;
    renderCriarDesafio();
  });
  document.querySelectorAll("[data-pc-cadeira]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.getAttribute("data-pc-cadeira"));
    pcState.desafioCriarCadeiraAtiva = pcState.desafioCriarCadeiraAtiva === i ? null : i;
    pcState.desafioCriarBuscaCadeira = "";
    renderCriarDesafio();
  }));
  document.querySelectorAll("[data-pc-cadeira-sentar]").forEach((btn) => btn.addEventListener("click", () => {
    const chave = btn.getAttribute("data-pc-cadeira-sentar");
    const cand = pool.find((c) => c.chave === chave);
    if (cand == null || pcState.desafioCriarCadeiraAtiva == null) return;
    cadeiras[pcState.desafioCriarCadeiraAtiva] = { chave: cand.chave, nome: cand.nome, partido: cand.partido };
    const proxima = cadeiras.findIndex((c) => !c);
    pcState.desafioCriarCadeiraAtiva = proxima === -1 ? null : proxima;
    pcState.desafioCriarBuscaCadeira = "";
    renderCriarDesafio();
  }));
  const btnEsvaziar = document.getElementById("pcBtnEsvaziarCadeira");
  if (btnEsvaziar) btnEsvaziar.addEventListener("click", () => {
    cadeiras[pcState.desafioCriarCadeiraAtiva] = null;
    renderCriarDesafio();
  });
  const buscaCadeira = document.getElementById("pcBuscaCadeira");
  if (buscaCadeira) {
    buscaCadeira.addEventListener("input", (e) => {
      pcState.desafioCriarBuscaCadeira = e.target.value;
      renderCriarDesafio();
    });
    if (pcState.desafioCriarBuscaCadeira) { buscaCadeira.focus(); buscaCadeira.setSelectionRange(buscaCadeira.value.length, buscaCadeira.value.length); }
  }
  document.querySelectorAll("[data-pc-voto]").forEach((inp) => inp.addEventListener("input", () => {
    pcState.desafioCriarVotos[inp.getAttribute("data-pc-voto")] = inp.value;
  }));

  // --- Passo 3 ---
  const btnDueloAberto = document.getElementById("pcBtnDueloAberto");
  if (btnDueloAberto) btnDueloAberto.addEventListener("click", () => {
    pcState.desafioCriarAlvo = { id: null, nome: "Convite aberto — quem clicar primeiro", aberto: true };
    pcState.desafioCriarAlvoModo = null;
    renderCriarDesafio();
  });
  const btnAlvoGrupo = document.getElementById("pcBtnAlvoGrupo");
  if (btnAlvoGrupo) btnAlvoGrupo.addEventListener("click", () => {
    pcState.desafioCriarAlvoModo = pcState.desafioCriarAlvoModo === "grupo" ? null : "grupo";
    renderCriarDesafio();
  });
  const btnAlvoCodigo = document.getElementById("pcBtnAlvoCodigo");
  if (btnAlvoCodigo) btnAlvoCodigo.addEventListener("click", () => {
    pcState.desafioCriarAlvoModo = pcState.desafioCriarAlvoModo === "codigo" ? null : "codigo";
    renderCriarDesafio();
  });
  document.querySelectorAll("[data-pc-alvo-amigo]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioCriarAlvo = { id: btn.getAttribute("data-pc-alvo-amigo"), nome: btn.getAttribute("data-pc-alvo-nome") };
    pcState.desafioCriarAlvoModo = null;
    renderCriarDesafio();
  }));
  const btnTrocarAlvo = document.getElementById("pcBtnTrocarAlvo");
  if (btnTrocarAlvo) btnTrocarAlvo.addEventListener("click", () => {
    pcState.desafioCriarAlvo = null; pcState.desafioCriarCodigoStatus = "";
    renderCriarDesafio();
  });
  const inputCodigo = document.getElementById("pcInputCodigoDesafio");
  if (inputCodigo) inputCodigo.addEventListener("input", (e) => { pcState.desafioCriarCodigoInput = e.target.value; });
  const btnBuscarCodigo = document.getElementById("pcBtnBuscarCodigo");
  if (btnBuscarCodigo) btnBuscarCodigo.addEventListener("click", async () => {
    const codigo = (document.getElementById("pcInputCodigoDesafio").value || "").trim();
    if (!codigo) { pcState.desafioCriarCodigoStatus = "Digite um código."; renderCriarDesafio(); return; }
    btnBuscarCodigo.disabled = true;
    const r = await buscarUsuarioPorCodigo(codigo);
    if (!r.ok) { pcState.desafioCriarCodigoStatus = r.mensagem; renderCriarDesafio(); return; }
    if (r.usuario.id === pcState.perfil.id) { pcState.desafioCriarCodigoStatus = "Esse é o seu próprio código."; renderCriarDesafio(); return; }
    pcState.desafioCriarAlvo = r.usuario;
    pcState.desafioCriarCodigoStatus = "";
    pcState.desafioCriarAlvoModo = null;
    renderCriarDesafio();
  });
  const inputNomeD = document.getElementById("pcInputNomeDesafio");
  if (inputNomeD) inputNomeD.addEventListener("input", (e) => { pcState.desafioCriarNome = e.target.value; });

  const btnEnviar = document.getElementById("pcBtnEnviarDesafio");
  if (btnEnviar) btnEnviar.addEventListener("click", async () => {
    const nome = (pcState.desafioCriarNome || "").trim();
    const status = document.getElementById("pcCriarDesafioStatus");
    if (!nome) { status.textContent = "Dê um nome pro duelo."; return; }
    if (!pcState.desafioCriarAlvo) { status.textContent = "Escolha quem você desafia."; return; }
    let escopo = [], meusVotos = [], eleitos = null;
    if (tipo === "eleitos") {
      if (preenchidas !== vagas) { status.textContent = `Preencha as ${vagas} cadeiras antes de enviar.`; return; }
      eleitos = cadeiras.map((c) => ({ chave: c.chave, nome: c.nome, partido: c.partido }));
    } else {
      if (!selecionados.length) { status.textContent = "Escolha ao menos 1 candidato."; return; }
      escopo = selecionados.map((c) => ({ chave: c.chave, nome: c.nome, partido: c.partido }));
      meusVotos = selecionados.map((c) => ({ chave: c.chave, votos: Number(pcState.desafioCriarVotos[c.chave] ?? c.votos) || 0 }));
    }
    btnEnviar.disabled = true;
    status.textContent = "Enviando…";
    const r = await criarDesafio(pcState.desafioCriarAlvo.aberto ? null : pcState.desafioCriarAlvo.id, nome, pcState.estado, cargo, escopo, meusVotos, tipo, true, eleitos);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; btnEnviar.disabled = false; return; }
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    if (pcState.desafioCriarAlvo.aberto && r.desafio) pcState.desafioDestacadoId = r.desafio.id;
    pcState.desafioCriarAmigos = null;
    pcState.desafioCriarCadeiras = null;
    pcState._desafioMinhasListas = null;
    pcState._desafioFonteCargos = null;
    pcState.desafioCriarFonteId = null;
    pcState.desafioCriarPasso = 1;
    pcState.desafioCriarAlvoModo = null;
    renderDesafiosHub();
  });
}

// O nome do duelo às vezes já vem digitado com aspas ("Duelo X") — os
// templates põem as deles e a tela mostrava ""Duelo X"" (bug visto no
// teste real de 31/08/2026). Normaliza uma vez, exibe com UMA aspa.
function _nomeDueloLimpo(nome) {
  return String(nome || "").replace(/^[\s"\u201c\u201d']+|[\s"\u201c\u201d']+$/g, "") || "duelo";
}

async function renderAceitarDesafio() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando…");
  // desafio_detalhe é a única porta pros votos (migração 38).
  const desafio = await desafioDetalhe(pcState.desafioAceitarId);
  if (!desafio) { renderDesafiosHub(); return; }
  if (!pcState.desafioAceitarVotos) pcState.desafioAceitarVotos = {};
  if (!pcState.desafioAceitarFase) pcState.desafioAceitarFase = "convite";
  const fase = pcState.desafioAceitarFase;
  const nomeDesafiante = desafio.criador ? desafio.criador.nome : "Alguém";
  const escopo = desafio.escopo_candidatos || [];
  const cargoLabel = (CARGOS.find((c) => c.id === desafio.cargo) || {}).label || "";
  const ehEleitos = desafio.tipo_disputa === "eleitos";
  const votosRivalPorChave = new Map((desafio.votos_criador || []).map((v) => [v.chave, Number(v.votos) || 0]));

  const vagasDuelo = ehEleitos ? (desafio.eleitos_criador ? desafio.eleitos_criador.length : vagasFixasCargo(desafio.estado, desafio.cargo)) : 0;
  if (ehEleitos && (!pcState.desafioAceitarCadeiras || pcState.desafioAceitarCadeiras.length !== vagasDuelo)) {
    pcState.desafioAceitarCadeiras = new Array(vagasDuelo).fill(null);
    pcState.desafioAceitarCadeiraAtiva = null;
  }
  const cadeiras = pcState.desafioAceitarCadeiras || [];
  const preenchidas = cadeiras.filter(Boolean).length;
  const poolAceitar = ehEleitos ? _poolCandidatosDesafio(desafio.cargo) : [];

  const vsCard = `
      <div class="pc-duelo-card" style="margin-bottom:16px;">
        <div class="pc-duelo-duo">
          <span class="pc-duelo-lado"><span class="pc-duelo-avatar">${_iniciaisNome(nomeDesafiante)}</span><span class="pc-duelo-tx"><span class="pc-duelo-p">${nomeDesafiante}</span><span class="pc-duelo-c">${desafio.estado}</span></span></span>
          <span class="pc-duelo-vs">VS</span>
          <span class="pc-duelo-lado dir"><span class="pc-duelo-avatar eu">${_iniciaisNome(pcState.perfil.nome || "Você")}</span><span class="pc-duelo-tx"><span class="pc-duelo-p">Você</span><span class="pc-duelo-c">${ehEleitos ? `${vagasDuelo} cadeiras` : `${escopo.length} candidato${escopo.length === 1 ? "" : "s"}`}</span></span></span>
        </div>
      </div>`;

  if (fase === "convite") {
    // ===== Fase 1: o CONVITE — logo centralizada, a provocação e a
    // decisão Aceitar × Rejeitar. A lista só abre depois do aceite
    // (fluxo aprovado pelo usuário, 30/08/2026). =====
    conteudo.innerHTML = `
      <div class="glass-card" style="max-width:420px; margin:0 auto; text-align:center;">
        <div class="pc-logo-mark" style="margin:6px auto 10px;">
          <div class="pc-logo-fill cheio"></div>
          <span class="pc-logo-icone">
            <svg viewBox="0 0 16 16" width="26" height="26">
              <path d="M2.5 6.5h11v7a1.2 1.2 0 01-1.2 1.2H3.7A1.2 1.2 0 012.5 13.5v-7z" fill="none" stroke="currentColor" stroke-width="1.3"></path>
              <path d="M4.5 6.5h7" stroke="currentColor" stroke-width="1.3"></path>
              <rect x="6.6" y="2" width="3.4" height="4.8" rx=".5" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(12 8.3 4.4)"></rect>
            </svg>
          </span>
        </div>
        <div style="font-size:11px; font-weight:800; letter-spacing:.08em; color:var(--pc-ink-dim); margin-bottom:14px;"><b style="color:var(--pc-accent);">Simula</b><span style="color:var(--pc-ink);">LEGIS</span></div>

        <h2 style="margin-bottom:6px;">Duelo 1×1</h2>
        <div class="pc-sub" style="margin-bottom:16px;">${nomeDesafiante} te desafiou para o 1×1 <b style="color:var(--pc-ink);">"${_nomeDueloLimpo(desafio.nome)}"</b> — indique o seu palpite para os candidatos da lista.</div>

        ${vsCard}

        <div style="display:flex; gap:8px;">
          <button class="ghost" id="pcBtnRejeitarConvite" style="flex:1;">Rejeitar</button>
          <button class="primary" id="pcBtnAceitarConvite" style="flex:2;">Aceitar</button>
        </div>
        <div class="pc-status" id="pcAceitarStatus" style="margin-top:8px; min-height:12px;"></div>
      </div>`;
    document.getElementById("pcBtnAceitarConvite").addEventListener("click", () => {
      pcState.desafioAceitarFase = "palpite";
      renderAceitarDesafio();
    });
    document.getElementById("pcBtnRejeitarConvite").addEventListener("click", async (e) => {
      e.target.disabled = true;
      const r = await recusarDesafio(pcState.desafioAceitarId);
      if (!r.ok) { document.getElementById("pcAceitarStatus").textContent = "Não deu: " + r.mensagem; e.target.disabled = false; return; }
      renderDesafiosHub();
    });
    return;
  }

  // ===== Fase 2: o PALPITE — a lista do desafiante com a coluna Rival
  // visível; fecha com "Depositar" (o aceite de verdade). =====
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <div style="text-align:center;"><div class="pc-selo-desafio" style="margin:0 auto;">
        <span class="pc-selo-desafio-ic">${iconeSvg("desafio", 17)}</span>
        <span class="pc-selo-desafio-tx">Duelo<b>1 × 1</b></span>
      </div></div>
      <h2 style="margin:10px 0 2px; text-align:center;">"${_nomeDueloLimpo(desafio.nome)}"</h2>
      <div class="pc-sub" style="margin-bottom:14px; text-align:center;">${ehEleitos
        ? `Monte o SEU plenário de ${cargoLabel} (${vagasDuelo} cadeira${vagasDuelo === 1 ? "" : "s"}). Ao depositar, fica travado até a apuração.`
        : `Indique seus votos na lista do desafio.`}</div>

      ${ehEleitos ? `
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px;">
          <label class="pc-campo-label" style="margin:0;">Seu plenário</label>
          <span style="font-size:11px; font-weight:800; color:var(--pc-accent); font-variant-numeric:tabular-nums;">${preenchidas}<span style="color:var(--pc-ink-dim); font-weight:600;"> / ${vagasDuelo}</span></span>
        </div>
        <div class="pc-duelo-progresso"><i style="width:${vagasDuelo ? (preenchidas / vagasDuelo * 100).toFixed(1) : 0}%;"></i></div>
        ${_duelaGradeCadeiras(cadeiras, pcState.desafioAceitarCadeiraAtiva, "pc-acadeira")}
        ${_duelaGavetaCadeira(cadeiras, pcState.desafioAceitarCadeiraAtiva, poolAceitar, pcState.desafioAceitarBuscaCadeira, "pc-acadeira")}
      ` : `
        <label class="pc-campo-label">Seus votos indicados</label>
        <button class="ghost" id="pcBtnCopiarPalpiteRival" style="width:100%; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:7px;">${iconeSvg("magico", 14)} Copiar o palpite de ${nomeDesafiante.split(" ")[0]} como ponto de partida</button>
        <div class="pc-duelo-colcab"><span class="cand">Candidato</span><span class="rival">Rival</span><span class="voce">Você</span></div>
        <div class="pc-lobby-card" style="padding:2px 14px; margin-bottom:14px; max-height:380px; overflow-y:auto;">
          ${(() => {
            // Agrupado por partido (pedido do usuário, 31/08/2026): cabeçalho
            // com −/+ que sobe/desce 5% os votos "Você" do partido inteiro —
            // ninguém precisa digitar candidato a candidato.
            const grupos = new Map();
            escopo.forEach((c) => { if (!grupos.has(c.partido)) grupos.set(c.partido, []); grupos.get(c.partido).push(c); });
            const ordemG = [...grupos.entries()].sort((a, b) =>
              b[1].reduce((t, c) => t + (votosRivalPorChave.get(c.chave) || 0), 0) -
              a[1].reduce((t, c) => t + (votosRivalPorChave.get(c.chave) || 0), 0));
            return ordemG.map(([partido, cands]) => `
              <div class="pc-aceitar-grupo-cab">
                <span class="sigla">${partido}</span>
                <span class="caps">
                  <button type="button" data-pc-aceitar-menos="${escaparAtributoHtml(partido)}" title="Reduzir 5% os seus votos neste partido">&minus;</button>
                  <span class="rot">5%</span>
                  <button type="button" data-pc-aceitar-mais="${escaparAtributoHtml(partido)}" title="Aumentar 5% os seus votos neste partido">+</button>
                </span>
              </div>
              ${[...cands].sort((a, b) => (votosRivalPorChave.get(b.chave) || 0) - (votosRivalPorChave.get(a.chave) || 0)).map((c) => `
              <div class="pc-voto-linha">
                <span class="txt"><span class="nome">${c.nome}</span><span class="partido">${c.partido}</span></span>
                <span class="pc-voto-rival">${(votosRivalPorChave.get(c.chave) || 0).toLocaleString("pt-BR")}</span>
                <input type="number" min="0" inputmode="numeric" data-pc-voto-aceitar="${escaparAtributoHtml(c.chave)}" value="${pcState.desafioAceitarVotos[c.chave] ?? ""}" placeholder="0">
              </div>`).join("")}`).join("");
          })()}
        </div>
      `}

      <button class="primary" id="pcBtnConfirmarAceite" style="width:100%;" ${ehEleitos && preenchidas !== vagasDuelo ? "disabled" : ""}>Depositar</button>
      <button class="ghost" id="pcBtnVoltarConvite" style="width:100%; margin-top:6px; border:none; color:var(--pc-ink-dim);">Voltar</button>
      <div class="pc-status" id="pcAceitarStatus" style="margin-top:8px; min-height:12px;"></div>
    </div>`;

  document.getElementById("pcBtnVoltarConvite").addEventListener("click", () => {
    pcState.desafioAceitarFase = "convite";
    renderAceitarDesafio();
  });

  const btnCopiarRival = document.getElementById("pcBtnCopiarPalpiteRival");
  if (btnCopiarRival) btnCopiarRival.addEventListener("click", () => {
    escopo.forEach((c) => { pcState.desafioAceitarVotos[c.chave] = votosRivalPorChave.get(c.chave) || 0; });
    renderAceitarDesafio();
  });
  const _sincronizarVotosAceitar = () => {
    document.querySelectorAll("[data-pc-voto-aceitar]").forEach((inp) => {
      const v = inp.value === "" ? undefined : Math.max(0, Math.round(Number(inp.value) || 0));
      if (v === undefined) delete pcState.desafioAceitarVotos[inp.getAttribute("data-pc-voto-aceitar")];
      else pcState.desafioAceitarVotos[inp.getAttribute("data-pc-voto-aceitar")] = v;
    });
  };
  document.querySelectorAll("[data-pc-voto-copiar]").forEach((b) => b.addEventListener("click", () => {
    _sincronizarVotosAceitar();
    const chave = b.getAttribute("data-pc-voto-copiar");
    pcState.desafioAceitarVotos[chave] = votosRivalPorChave.get(chave) || 0;
    renderAceitarDesafio();
  }));
  document.querySelectorAll("[data-pc-voto-passo]").forEach((b) => b.addEventListener("click", () => {
    _sincronizarVotosAceitar();
    const [chave, dirTxt] = b.getAttribute("data-pc-voto-passo").split("|");
    const rival = votosRivalPorChave.get(chave) || 0;
    const passoV = Math.max(10, Math.round(rival * 0.05));
    pcState.desafioAceitarVotos[chave] = Math.max(0, (pcState.desafioAceitarVotos[chave] || 0) + Number(dirTxt) * passoV);
    renderAceitarDesafio();
  }));

  document.querySelectorAll("[data-pc-acadeira]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.getAttribute("data-pc-acadeira"));
    pcState.desafioAceitarCadeiraAtiva = pcState.desafioAceitarCadeiraAtiva === i ? null : i;
    pcState.desafioAceitarBuscaCadeira = "";
    renderAceitarDesafio();
  }));
  document.querySelectorAll("[data-pc-acadeira-sentar]").forEach((btn) => btn.addEventListener("click", () => {
    const chave = btn.getAttribute("data-pc-acadeira-sentar");
    const cand = poolAceitar.find((c) => c.chave === chave);
    if (cand == null || pcState.desafioAceitarCadeiraAtiva == null) return;
    cadeiras[pcState.desafioAceitarCadeiraAtiva] = { chave: cand.chave, nome: cand.nome, partido: cand.partido };
    const proxima = cadeiras.findIndex((c) => !c);
    pcState.desafioAceitarCadeiraAtiva = proxima === -1 ? null : proxima;
    pcState.desafioAceitarBuscaCadeira = "";
    renderAceitarDesafio();
  }));
  const btnEsvaziarA = document.getElementById("pcBtnEsvaziarCadeira");
  if (btnEsvaziarA) btnEsvaziarA.addEventListener("click", () => {
    cadeiras[pcState.desafioAceitarCadeiraAtiva] = null;
    renderAceitarDesafio();
  });
  const buscaCadeiraA = document.getElementById("pcBuscaCadeira");
  if (buscaCadeiraA) {
    buscaCadeiraA.addEventListener("input", (e) => {
      pcState.desafioAceitarBuscaCadeira = e.target.value;
      renderAceitarDesafio();
    });
    if (pcState.desafioAceitarBuscaCadeira) { buscaCadeiraA.focus(); buscaCadeiraA.setSelectionRange(buscaCadeiraA.value.length, buscaCadeiraA.value.length); }
  }

  document.querySelectorAll("[data-pc-voto-aceitar]").forEach((inp) => inp.addEventListener("input", () => {
    pcState.desafioAceitarVotos[inp.getAttribute("data-pc-voto-aceitar")] = inp.value;
  }));
  document.getElementById("pcBtnConfirmarAceite").addEventListener("click", async (e) => {
    const status = document.getElementById("pcAceitarStatus");
    e.target.disabled = true;
    status.textContent = "Depositando…";
    let r;
    if (ehEleitos) {
      if (preenchidas !== vagasDuelo) { status.textContent = `Preencha as ${vagasDuelo} cadeiras.`; e.target.disabled = false; return; }
      r = await aceitarDesafio(pcState.desafioAceitarId, null, cadeiras.map((c) => ({ chave: c.chave, nome: c.nome, partido: c.partido })));
    } else {
      const meusVotos = escopo.map((c) => ({ chave: c.chave, votos: Number(pcState.desafioAceitarVotos[c.chave]) || 0 }));
      r = await aceitarDesafio(pcState.desafioAceitarId, meusVotos, null);
    }
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; e.target.disabled = false; return; }
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (err) {}
    pcState.desafioAceitarVotos = {};
    pcState.desafioAceitarCadeiras = null;
    pcState.desafioAceitarFase = null;
    renderDueloSelado(r.desafio || desafio, nomeDesafiante);
  });
}

// Tela pós-aceite (pedido do usuário 30/08/2026): parabeniza quem selou
// o duelo, explica que o resultado sai junto com a apuração oficial das
// eleições, aponta pro sistema de pontos (Central de ajuda) e convida a
// montar a própria lista e desafiar outras pessoas — é a porta de entrada
// de quem chegou pelo convite de WhatsApp.
function renderDueloSelado(desafio, nomeDesafiante) {
  pcState._dueloImpressao = { desafio, nomeDesafiante };
  const conteudo = document.getElementById("pcConteudo");
  const nomeLimpo = _nomeDueloLimpo(desafio && desafio.nome);
  const codigo = (desafio && desafio.codigo) || "";
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto; text-align:center;">
      <div class="pc-selo-desafio" style="margin:0 auto 12px;">
        <span class="pc-selo-desafio-ic">${iconeSvg("desafio", 17)}</span>
        <span class="pc-selo-desafio-tx">Duelo<b>1 × 1</b></span>
      </div>
      <h2 style="margin-bottom:6px;">Cédula do duelo depositada!</h2>
      <div class="pc-sub" style="margin-bottom:14px;">Seu palpite em <b style="color:var(--pc-ink);">"${nomeLimpo}"</b> contra ${nomeDesafiante} está travado até a apuração oficial de 2026 — <b style="color:var(--pc-ink);">quem chegar mais perto do resultado real vence.</b></div>

      ${codigo ? `
      <div class="pc-duelo-codigo">
        <span><span class="rot">Código do duelo</span><span class="val">${codigo}</span></span>
        <button type="button" class="cop" id="pcBtnCopiarCodigoDuelo">COPIAR</button>
      </div>` : ""}
      <div class="pc-sub" style="margin-bottom:14px;">Acesse quando quiser: aba <b style="color:var(--pc-ink);">Duelos</b> ou Minhas Listas → <b style="color:var(--pc-ink);">Cédulas de duelo</b>.</div>

      <div style="display:flex; gap:12px; justify-content:center; margin-bottom:4px;">
        <button class="pc-console-btn" id="pcBtnCompartilharDuelo" title="Compartilhar o duelo" aria-label="Compartilhar o duelo">${iconeSvg("compartilhar", 17)}</button>
        <button class="pc-console-btn" id="pcBtnImprimirDuelo" title="Imprimir o duelo" aria-label="Imprimir o duelo">${iconeSvg("impressora", 17)}</button>
        <button class="pc-console-btn" id="pcBtnComoPontua" title="Como funciona a pontuação" aria-label="Como funciona a pontuação">${iconeSvg("ajuda", 17)}</button>
      </div>
      <div style="display:flex; gap:20px; justify-content:center; font-size:8px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:var(--pc-ink-dim); margin-bottom:2px;">
        <span>compartilhar</span><span>imprimir</span><span>pontuação</span>
      </div>
      ${desafio && desafio.id ? `<button class="ghost" id="pcBtnVerDueloSelado" style="width:100%; border:none; margin-top:4px;">Ver o duelo na aba Duelos</button>` : ""}

      <div class="pc-duelo-caixa2">
        <div style="font-size:13px; font-weight:800; margin-bottom:4px;">Agora é a sua vez</div>
        <div class="pc-sub" style="margin-bottom:12px;">Você acabou de palpitar — você também pode montar o seu próprio desafio com a lista completa das eleições ou segmentada: por partido, candidatos e outras. Monte a sua lista personalizada e desafie os seus amigos.</div>
        <div style="display:flex; gap:8px; align-items:stretch;">
          <button class="ghost" id="pcBtnIrLobby" style="width:52px; flex:none; display:flex; align-items:center; justify-content:center;" title="Ir pro início">${iconeSvg("home", 16)}</button>
          <button class="primary" id="pcBtnMontarMinhaLista" style="flex:1;">Montar a minha própria lista</button>
        </div>
      </div>
    </div>`;
  const btnCopCod = document.getElementById("pcBtnCopiarCodigoDuelo");
  if (btnCopCod) btnCopCod.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(codigo); btnCopCod.textContent = "COPIADO"; setTimeout(() => { btnCopCod.textContent = "COPIAR"; }, 1600); } catch (_) {}
  });
  const btnCompartilhar = document.getElementById("pcBtnCompartilharDuelo");
  if (btnCompartilhar) btnCompartilhar.addEventListener("click", async () => {
    const texto = `Selei um duelo 1×1 "${nomeLimpo}" contra ${nomeDesafiante} no SimulaLEGIS — o resultado sai na apuração oficial de 2026. Quer medir o seu faro político também? ${window.location.origin + window.location.pathname}`;
    if (navigator.share) { try { await navigator.share({ text: texto }); return; } catch (_) {} }
    try { await navigator.clipboard.writeText(texto); mostrarStatusSalvamento && mostrarStatusSalvamento; } catch (_) {}
  });
  const btnVerDuelo = document.getElementById("pcBtnVerDueloSelado");
  if (btnVerDuelo) btnVerDuelo.addEventListener("click", () => { pcState.desafioComparacaoId = desafio.id; renderComparacaoDesafio(); });
  const btnImpDuelo = document.getElementById("pcBtnImprimirDuelo");
  if (btnImpDuelo) btnImpDuelo.addEventListener("click", () => {
    const info = pcState._dueloImpressao;
    if (!info || !info.desafio) return;
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) {
      container = document.createElement("div");
      container.id = "pcImpressaoConteudo";
      document.body.appendChild(container);
    }
    container.innerHTML = montarImpressaoDuelo(info.desafio, info.nomeDesafiante);
    window.print();
  });
  document.getElementById("pcBtnComoPontua").addEventListener("click", () => { pcState.subaba = "ajuda"; renderAppColaborativo(); });
  document.getElementById("pcBtnMontarMinhaLista").addEventListener("click", () => { pcState.subaba = "selecao"; renderAppColaborativo(); });
  const btnLobby = document.getElementById("pcBtnIrLobby");
  if (btnLobby) btnLobby.addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
}

// ===== Painel de comparação do duelo (protótipo aprovado 30/08/2026) =====
// A organização do documento impresso (colunas Você/Rival/Resultado/Pts,
// ícone E do eleito, legenda) nas cores do sistema. Resultado e Pts ficam
// em "—" até a apuração oficial existir — mesma promessa das outras telas.
async function renderComparacaoDesafio() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando comparação…");
  const d = await desafioDetalhe(pcState.desafioComparacaoId);
  if (!d) { renderDesafiosHub(); return; }
  const meuId = pcState.perfil.id;
  const souCriador = d.criador_id === meuId;
  const nomeEu = "Você";
  const nomeOutro = souCriador ? (d.desafiado ? d.desafiado.nome : "Rival") : (d.criador ? d.criador.nome : "Rival");
  const cargoLabel = (CARGOS.find((c) => c.id === d.cargo) || {}).label || "";
  const ehEleitos = d.tipo_disputa === "eleitos";
  const encerrado = d.status === "encerrado" && d.pontos_criador != null;
  const meusPontos = souCriador ? d.pontos_criador : d.pontos_desafiado;
  const pontosOutro = souCriador ? d.pontos_desafiado : d.pontos_criador;
  const venci = d.vencedor_id && d.vencedor_id === meuId;

  const votosEu = new Map(((souCriador ? d.votos_criador : d.votos_desafiado) || []).map((v) => [v.chave, Number(v.votos) || 0]));
  const votosOutro = new Map(((souCriador ? d.votos_desafiado : d.votos_criador) || []).map((v) => [v.chave, Number(v.votos) || 0]));
  const eleitosEu = (souCriador ? d.eleitos_criador : d.eleitos_desafiado) || [];
  const eleitosOutro = (souCriador ? d.eleitos_desafiado : d.eleitos_criador) || [];
  const setEu = new Set(eleitosEu.map((c) => c.chave));
  const setOutro = new Set(eleitosOutro.map((c) => c.chave));

  let linhas = "";
  if (ehEleitos) {
    // União das duas composições: consenso primeiro (os dois sentaram),
    // depois só-eu, depois só-rival — mostra onde o duelo diverge.
    const todos = new Map();
    eleitosEu.forEach((c) => todos.set(c.chave, c));
    eleitosOutro.forEach((c) => { if (!todos.has(c.chave)) todos.set(c.chave, c); });
    const ordenados = [...todos.values()].sort((a, b) => {
      const pesoA = (setEu.has(a.chave) ? 1 : 0) + (setOutro.has(a.chave) ? 1 : 0);
      const pesoB = (setEu.has(b.chave) ? 1 : 0) + (setOutro.has(b.chave) ? 1 : 0);
      return pesoB - pesoA || a.nome.localeCompare(b.nome);
    });
    linhas = ordenados.map((c, i) => `
      <div class="pc-cmp-linha">
        <span class="pc-cmp-pos">${i + 1}º</span>
        <span class="pc-cmp-cand"><span class="n">${c.nome}</span><span class="p">${c.partido}</span></span>
        <span class="pc-cmp-val ${setEu.has(c.chave) ? "marcado" : ""}">${setEu.has(c.chave) ? iconeSvg("confere", 13) : "—"}</span>
        <span class="pc-cmp-val ${setOutro.has(c.chave) ? "marcado" : ""}">${setOutro.has(c.chave) ? iconeSvg("confere", 13) : "—"}</span>
        <span class="pc-cmp-res">—</span>
        <span class="pc-cmp-pts">—</span><span class="pc-cmp-pts">—</span>
      </div>`).join("");
  } else {
    const escopo = d.escopo_candidatos || [];
    const ordenados = [...escopo].sort((a, b) => (votosEu.get(b.chave) || 0) - (votosEu.get(a.chave) || 0));
    linhas = ordenados.map((c, i) => {
      const vEu = votosEu.get(c.chave) || 0;
      const vOutro = votosOutro.get(c.chave) || 0;
      return `
      <div class="pc-cmp-linha">
        <span class="pc-cmp-pos">${i + 1}º</span>
        <span class="pc-cmp-cand"><span class="n">${c.nome}</span><span class="p">${c.partido}</span></span>
        <span class="pc-cmp-val num">${vEu.toLocaleString("pt-BR")}</span>
        <span class="pc-cmp-val num">${vOutro.toLocaleString("pt-BR")}</span>
        <span class="pc-cmp-res">—</span>
        <span class="pc-cmp-pts">—</span><span class="pc-cmp-pts">—</span>
      </div>`;
    }).join("");
  }

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:520px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarComparacao" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Duelos</button>

      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--pc-glass-border); padding-bottom:12px; margin-bottom:14px;">
        <div>
          <div style="font-size:18px; font-weight:800;"><b style="color:var(--pc-accent);">Simula</b>LEGIS</div>
          <div style="font-size:8px; font-weight:800; letter-spacing:.1em; color:var(--pc-ink-dim);">SIMULADOR ELEITORAL LEGISLATIVO 2026</div>
        </div>
        <div style="text-align:right; font-size:11px;">
          <b>${d.estado}</b> · Duelo "${d.nome}"<br>
          <span style="font-size:9.5px; color:var(--pc-ink-dim);">${d.respondido_em ? "selado em " + new Date(d.respondido_em).toLocaleDateString("pt-BR") : ""} · ${encerrado ? "apurado" : "aguarda apuração"} · ${d.codigo || ""}</span>
        </div>
      </div>

      <div class="pc-podio">
        <span class="pc-podio-lado${encerrado && venci ? " venceu" : ""}">
          ${encerrado && venci ? '<span class="pc-podio-faixa">VENCEU</span>' : ""}
          <span class="pc-podio-av${encerrado && venci ? " venceu" : ""}">${_iniciaisNome(pcState.perfil.nome || "Você")}</span>
          <span class="pc-podio-nm">${nomeEu}</span>
          <span class="pc-podio-pts${encerrado && venci ? " venceu" : ""}">${encerrado ? Number(meusPontos).toLocaleString("pt-BR") + ' <i>pts</i>' : "aguarda"}</span>
        </span>
        <span class="pc-podio-vs">VS</span>
        <span class="pc-podio-lado${encerrado && !venci && d.vencedor_id ? " venceu" : ""}">
          ${encerrado && !venci && d.vencedor_id ? '<span class="pc-podio-faixa">VENCEU</span>' : ""}
          <span class="pc-podio-av${encerrado && !venci && d.vencedor_id ? " venceu" : ""}">${_iniciaisNome(nomeOutro)}</span>
          <span class="pc-podio-nm">${nomeOutro}</span>
          <span class="pc-podio-pts${encerrado && !venci && d.vencedor_id ? " venceu" : ""}">${encerrado ? Number(pontosOutro).toLocaleString("pt-BR") + ' <i>pts</i>' : "aguarda"}</span>
        </span>
      </div>
      ${encerrado && d.vencedor_id ? `
      <div style="text-align:center; font-size:10.5px; color:var(--pc-ink-dim); margin:2px 0 10px;">${venci ? "Você venceu" : nomeOutro + " venceu"} o duelo <b style="color:var(--pc-ink);">"${_nomeDueloLimpo(d.nome)}"</b> por ${Number(venci ? meusPontos : pontosOutro).toLocaleString("pt-BR")} pontos a ${Number(venci ? pontosOutro : meusPontos).toLocaleString("pt-BR")}.</div>
      <div class="pc-vitoria-box">
        ${iconeSvg("compartilhar", 16)}
        <span style="flex:1;"></span>
        <button type="button" class="pc-console-btn" style="width:42px; height:42px;" id="pcBtnVitoriaWhats" title="Enviar no WhatsApp">${iconeSvg("whatsapp", 17)}</button>
        <button type="button" class="pc-console-btn" style="width:42px; height:42px;" id="pcBtnVitoriaStories" title="Stories do Instagram">${iconeSvg("instagram", 17)}</button>
        <button type="button" class="pc-console-btn" style="width:42px; height:42px;" id="pcBtnVitoriaBaixar" title="Baixar a imagem">${iconeSvg("baixar", 17)}</button>
      </div>` : ""}

      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:2px;">
        <span style="font-size:14px; font-weight:800;">${cargoLabel} — comparação do duelo</span>
        <button type="button" class="pc-mini-btn" id="pcBtnLegendaCmp" title="O que significa cada coluna">${iconeSvg("ajuda", 13)}</button>
      </div>
      ${pcState.legendaCmpAberta ? `
      <div style="background:#15181B; border:1px solid #23262A; border-radius:10px; padding:10px 12px; font-size:9.5px; color:var(--pc-ink-dim); line-height:1.6; margin:6px 0 8px;">
        <b style="color:var(--pc-ink);">Você / Rival</b> — ${ehEleitos ? "quem cada um sentou na composição" : "os votos que cada um indicou pro candidato"}.<br>
        <b style="color:var(--pc-ink);">Result.</b> — a votação oficial da apuração de 2026.<br>
        <b style="color:var(--pc-ink);">P·V</b> — seus pontos na linha (acerto de eleição + proximidade de votos).<br>
        <b style="color:var(--pc-ink);">P·R</b> — os pontos do rival na mesma linha.
      </div>` : ""}
      <div class="pc-sub" style="margin:1px 0 12px;">${ehEleitos
        ? `${Math.max(setEu.size, setOutro.size)} cadeiras por lado · a coluna de resultado preenche na apuração oficial · pontos = acerto da composição.`
        : `${(d.escopo_candidatos || []).length} candidatos no recorte · resultado e pontos preenchem na apuração oficial · pontos = acerto de eleição + proximidade do voto.`}</div>

      <div class="pc-cmp-cols">
        <span class="pc-cmp-pos"></span>
        <span class="pc-cmp-cand">Candidato</span>
        <span class="pc-cmp-val">Você</span>
        <span class="pc-cmp-val">Rival</span>
        <span class="pc-cmp-res">Result.</span>
        <span class="pc-cmp-pts">P·V</span><span class="pc-cmp-pts">P·R</span>
      </div>
      <div style="max-height:52vh; overflow-y:auto;">${linhas}</div>

      <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:14px; padding-top:10px; border-top:1px solid var(--pc-glass-border); font-size:9px; color:var(--pc-ink-dim);">
        ${ehEleitos ? `<span style="display:flex; align-items:center; gap:4px;">${iconeSvg("confere", 11)} sentou o candidato nessa composição</span>` : ""}
        <span>Result. e pontos (P·V = seus, P·R = do rival) preenchem na apuração oficial.</span>
      </div>
    </div>`;
  document.getElementById("pcBtnVoltarComparacao").addEventListener("click", () => renderDesafiosHub());
  const btnLegCmp = document.getElementById("pcBtnLegendaCmp");
  if (btnLegCmp) btnLegCmp.addEventListener("click", () => { pcState.legendaCmpAberta = !pcState.legendaCmpAberta; renderComparacaoDesafio(); });
  // Box de vitória (só com duelo encerrado): gera o card e compartilha.
  const nomeVencedor = venci ? (pcState.perfil.nome || "Você") : nomeOutro;
  const nomePerdedor = venci ? nomeOutro : (pcState.perfil.nome || "Você");
  const ptsV = Number(venci ? meusPontos : pontosOutro) || 0;
  const ptsP = Number(venci ? pontosOutro : meusPontos) || 0;
  const dadosCard = { nomeVencedor, nomePerdedor, ptsV, ptsP, nomeDuelo: _nomeDueloLimpo(d.nome) };
  const textoVitoria = `${nomeVencedor} venceu o duelo "${dadosCard.nomeDuelo}" por ${ptsV} pontos a ${ptsP} no SimulaLEGIS. Quer medir o seu faro político? ${window.location.origin + window.location.pathname}`;
  const compartilharCard = async (altura, nomeArq) => {
    const canvas = gerarImagemCardVitoria(dadosCard, altura);
    const dataUrl = canvas.toDataURL("image/png");
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const arquivo = new File([blob], nomeArq, { type: "image/png" });
        if (navigator.canShare({ files: [arquivo] })) { await navigator.share({ files: [arquivo], text: textoVitoria }); return; }
      } catch (_) { /* cancelou/falhou — cai no download */ }
    }
    _baixarImagemCedula(dataUrl, nomeArq);
    try { await navigator.clipboard.writeText(textoVitoria); } catch (_) {}
  };
  const bW = document.getElementById("pcBtnVitoriaWhats");
  if (bW) bW.addEventListener("click", () => compartilharCard(1350, "vitoria-duelo.png"));
  const bS = document.getElementById("pcBtnVitoriaStories");
  if (bS) bS.addEventListener("click", () => compartilharCard(1920, "vitoria-duelo-stories.png"));
  const bB = document.getElementById("pcBtnVitoriaBaixar");
  if (bB) bB.addEventListener("click", () => {
    _baixarImagemCedula(gerarImagemCardVitoria(dadosCard, 1350).toDataURL("image/png"), "vitoria-duelo.png");
    _baixarImagemCedula(gerarImagemCardVitoria(dadosCard, 1920).toDataURL("image/png"), "vitoria-duelo-stories.png");
  });
}

// ===== Notificações (migração 28) =====
function _tempoRelativo(dataIso) {
  const diffMs = Date.now() - new Date(dataIso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${Math.max(1, min)}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function _iconeNotificacao(tipo) {
  if (tipo && tipo.indexOf("desafio") === 0) return "desafio";
  if (tipo === "convite_convertido") return "convidar";
  if (tipo === "termometro_abriu") return "termometro";
  return "ajuda";
}

async function renderNotificacoes() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando notificações…");
  const lista = await listarMinhasNotificacoes(40);
  await marcarNotificacoesLidas();
  pcState.notificacoesNaoLidas = 0;

  const novas = lista.filter((n) => !n.lida_em);
  const antes = lista.filter((n) => n.lida_em);
  const linha = (n) => `
    <div class="pc-notif-item">
      <div class="pc-notif-ic">${iconeSvg(_iconeNotificacao(n.tipo), 16)}</div>
      <div class="pc-notif-corpo">
        <div class="pc-notif-titulo">${n.titulo}</div>
        ${n.corpo ? `<div class="pc-notif-desc">${n.corpo}</div>` : ""}
        ${n.tipo === "desafio_recebido" ? `<button class="pc-notif-acao" data-pc-ver-desafio="${n.referencia_id}">Ver duelo</button>` : ""}
        ${n.tipo === "desafio_aceito" ? `<button class="pc-notif-acao" data-pc-ver-desafio="${n.referencia_id}">Ver o duelo selado</button>` : ""}
        ${n.tipo === "desafio_lembrete" ? `<button class="pc-notif-acao" data-pc-ver-desafio="${n.referencia_id}">Reenviar o convite</button>` : ""}
      </div>
      <div class="pc-notif-hora">${_tempoRelativo(n.criado_em)}</div>
    </div>`;

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarNotif" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
      <h2 style="margin-bottom:2px;">Notificações</h2>
      <div class="pc-sub" style="margin-bottom:14px;">Tudo que aconteceu com você no app.</div>
      ${novas.length ? `<div class="pc-lobby-menu-tit" style="margin-top:0;">Novas · ${novas.length}</div><div class="pc-lobby-card" style="padding:2px 14px;">${novas.map(linha).join("")}</div>` : ""}
      ${antes.length ? `<div class="pc-lobby-menu-tit">Antes</div><div class="pc-lobby-card" style="padding:2px 14px;">${antes.map(linha).join("")}</div>` : ""}
      ${!lista.length ? estadoVazio({ icone: "ajuda", titulo: "Nada por aqui ainda", texto: "Duelos, convites e créditos aparecem aqui conforme forem acontecendo." }) : ""}
    </div>`;
  document.getElementById("pcBtnVoltarNotif").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.querySelectorAll("[data-pc-ver-desafio]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioDestacadoId = btn.getAttribute("data-pc-ver-desafio");
    pcState.subaba = "desafios"; renderAppColaborativo();
  }));
}

// ===== Carteira (migração 28) =====
async function renderCarteira() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando sua carteira…");
  try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
  const extrato = (await obterExtratoCreditos(pcState.perfil.id, 30)) || [];
  const saldo = Number(pcState.perfil.creditos) || 0;

  const linhaExtrato = (t) => {
    const positivo = t.valor > 0;
    return `
    <div class="pc-ex-linha">
      <span class="pc-ex-ic ${positivo ? "mais" : "menos"}">${positivo
        ? `<svg width="13" height="13" viewBox="0 0 16 16"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`
        : `<svg width="13" height="13" viewBox="0 0 16 16"><path d="M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`}</span>
      <span class="pc-ex-corpo">
        <span class="pc-ex-tit">${ROTULO_TRANSACAO[t.tipo] || t.tipo}</span>
        <span class="pc-ex-desc">${new Date(t.criado_em).toLocaleDateString("pt-BR")}${t.referencia ? " · " + t.referencia : ""}</span>
      </span>
      <span class="pc-ex-val ${positivo ? "mais" : "menos"}">${positivo ? "+" : ""}${t.valor}</span>
      <span class="pc-ex-saldo">${t.saldo_apos}</span>
    </div>`;
  };

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarCarteira" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
      <div class="pc-cart-hero">
        <div class="pc-cart-lbl">Seu saldo</div>
        <div class="pc-cart-num">${iconeSvg("credito", 28)}${saldo}</div>
        <div class="pc-cart-eq">dá pra ${saldo >= 10 ? "1 desafio ou 1 grupo novo" : "acumular mais um pouco"}</div>
        <div class="pc-cart-btns">
          <button class="primary" id="pcBtnIrLoja" style="flex:1;">Comprar SL</button>
          <button class="ghost" id="pcBtnIrGanhar" style="flex:1;">Ganhar convidando</button>
        </div>
      </div>

      <div class="pc-lobby-menu-tit">Histórico</div>
      ${extrato.length ? `<div class="pc-lobby-card" style="padding:4px 14px;">${extrato.map(linhaExtrato).join("")}</div>`
        : `<div class="pc-lobby-card">${estadoVazio({ icone: "credito", titulo: "Nenhuma movimentação ainda", texto: "Assim que você ganhar ou gastar SL, aparece aqui." })}</div>`}
    </div>`;
  document.getElementById("pcBtnVoltarCarteira").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.getElementById("pcBtnIrLoja").addEventListener("click", () => { pcState.subaba = "loja"; renderAppColaborativo(); });
  document.getElementById("pcBtnIrGanhar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
}

// ===== Loja (migração 28) =====
// Comprar SL ainda não tem gateway de pagamento (mesma situação de
// creditos.js: "sem cobrança de verdade ainda" — MONETIZACAO.md §2.1).
// Os pacotes aparecem por transparência de preço; o botão de fato
// funcional continua sendo "convide amigos" (ganha 1 SL por convite,
// teto 25) e os desafios/termômetro, que já gastam SL de verdade.
function renderLoja() {
  const conteudo = document.getElementById("pcConteudo");
  const saldo = Number((pcState.perfil && pcState.perfil.creditos) || 0);
  const pacote = (id, dados, desc, selo) => `
    <div class="pc-pacote ${selo ? "destaque" : ""}">
      <div class="pc-pacote-linha1">
        <span class="pc-pacote-q">${iconeSvg("credito", 16)}${dados.sl}</span>
        <span class="pc-pacote-d"><b>${desc}</b>${selo ? `<span class="pc-pacote-selo">${selo}</span>` : ""}</span>
      </div>
      <button type="button" class="primary" data-pc-comprar="${id}" style="align-self:flex-end; padding:8px 12px; font-size:12px;">${dados.preco}</button>
    </div>`;

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarLoja" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
      <h2 style="margin-bottom:2px;">Loja</h2>
      <div class="pc-sub" style="margin-bottom:4px;">Seu saldo: <b style="color:var(--pc-ink);">${saldo} SL</b></div>
      <div class="pc-sub" style="margin-bottom:14px;">Pagamento via Mercado Pago (PIX ou cartão) — você é redirecionado, paga lá e volta com o saldo já creditado.</div>

      <div class="pc-lobby-menu-tit" style="margin-top:0;">Comprar SL</div>
      ${pacote("p10", PACOTES_SL.p10, "1 desafio ou 1 vaga de grupo")}
      ${pacote("p50", PACOTES_SL.p50, "abre 10 candidatos no Termômetro", "+10% desconto")}
      ${pacote("p200", PACOTES_SL.p200, "a lista completa do Termômetro", "+25% desconto")}
      <div class="pc-status" id="pcLojaStatus" style="margin:4px 0 14px; min-height:12px;">${pcState.lojaStatus || ""}</div>

      <div class="pc-lobby-menu-tit">Como ganhar de graça</div>
      <button class="pc-mini-card" id="pcBtnLojaConvidar">
        <div class="pc-mini-card-icone">${iconeSvg("convidar", 17)}</div>
        <div style="flex:1; min-width:0; text-align:left;">
          <div style="font-size:13.5px; font-weight:600;">Convidar amigos</div>
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px;">+1 SL por amigo que depositar a cédula, até 25</div>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
      </button>
      <button class="pc-mini-card" id="pcBtnLojaDesafiar" style="margin-top:8px;">
        <div class="pc-mini-card-icone">${iconeSvg("desafio", 17)}</div>
        <div style="flex:1; min-width:0; text-align:left;">
          <div style="font-size:13.5px; font-weight:600;">Duelar com alguém</div>
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px;">+5 SL no 1º aceite com cada pessoa, até 5</div>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
      </button>
    </div>`;
  pcState.lojaStatus = "";
  document.getElementById("pcBtnVoltarLoja").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.getElementById("pcBtnLojaConvidar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
  document.getElementById("pcBtnLojaDesafiar").addEventListener("click", () => { pcState.subaba = "desafios"; renderAppColaborativo(); });
  document.querySelectorAll("[data-pc-comprar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("[data-pc-comprar]").forEach((b) => (b.disabled = true));
      const status = document.getElementById("pcLojaStatus");
      status.textContent = "Abrindo o pagamento…";
      const r = await iniciarCompraSL(btn.getAttribute("data-pc-comprar"));
      if (!r.ok) {
        status.textContent = "Não deu: " + r.mensagem;
        document.querySelectorAll("[data-pc-comprar]").forEach((b) => (b.disabled = false));
      }
      // r.ok já redirecionou a página — nada mais a fazer aqui.
    });
  });
}

// Volta do Mercado Pago (?compra=ok|falhou|pendente, ver back_urls na
// Edge Function criar-pagamento) — mostra o aviso e, se "ok", tenta
// revalidar o saldo algumas vezes (o webhook costuma ser quase
// instantâneo, mas pode chegar 1-2s depois do redirect).
async function tratarVoltaDoPagamento() {
  const params = new URLSearchParams(window.location.search);
  const compra = params.get("compra");
  if (!compra) return;
  window.history.replaceState({}, "", window.location.pathname);
  pcState.lojaStatus = compra === "ok"
    ? "Pagamento aprovado — atualizando seu saldo…"
    : compra === "pendente"
      ? "Pagamento em análise (comum em boleto/PIX fora do horário) — o saldo entra assim que compensar."
      : "Pagamento não foi concluído — nada foi cobrado.";
  if (compra === "ok" && pcState.perfil) {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      await new Promise((r) => setTimeout(r, 1500));
      try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) { break; }
    }
    pcState.lojaStatus = "Pagamento aprovado — saldo atualizado!";
  }
  // Essa função roda em paralelo ao primeiro render (chamada sem await
  // em initColaborativo) — se a pessoa ainda estiver na Loja quando o
  // resultado final chegar, atualiza a tela sozinha.
  if (pcState.subaba === "loja") renderAppColaborativo();
}


function renderGrupoCriar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Grupos</button>
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
    // Faltava esta linha (achado em auditoria de QA, 25/08/2026) — sem
    // ela, criar um grupo e depois navegar pra outra aba e voltar pra
    // Grupos caía no formulário vazio de novo, mesmo com grupoAtivo já
    // preenchido certo. Mesmo padrão de renderGrupoEntrar logo abaixo.
    pcState.telaGrupo = "membro";
    renderGrupoMembro();
  });
}

function renderGrupoEntrar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Grupos</button>
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
    pcState.telaGrupo = "membro";
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
    <div style="overflow-x:auto; margin-top:10px;">
    <table style="min-width:420px;">
      <thead><tr><th>Partido</th><th class="num">Vagas 22</th><th class="num">Votos (mediana)</th><th class="num">Vagas (mediana)</th></tr></thead>
      <tbody>${linhasPartido}</tbody>
    </table>
    </div>
    ${qe ? `<div class="pc-sub" style="margin-top:8px;">Quociente eleitoral (mediana do grupo): ${qe.toLocaleString("pt-BR")} votos/vaga.</div>` : ""}`;
}

async function renderGrupoMembro() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando comparação do grupo…");
  // Não sobrescreve o estado já escolhido na sessão — SC só como padrão de
  // nascimento (grupo ainda não carrega o próprio estado; entra no guarda-
  // chuva da tarefa #36 quando os 27 abrirem de fato).
  pcState.estado = pcState.estado || "SC";
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
    <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Grupos</button>
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
    </div>
    ${pcState.perfil ? `
    <div style="text-align:center; margin-top:14px;">
      <button class="ghost" id="pcBtnSairGrupo" style="font-size:11.5px; color:var(--pc-danger);">Sair deste grupo</button>
    </div>` : ""}`;

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
  const voltarPraHub = () => {
    pcState.telaGrupo = null;
    pcState.grupoAtivo = null;
    pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
    pcState.meusGrupos = null; // força recarregar — a lista de grupos mudou
    renderGrupoHub();
  };
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", voltarPraHub);
  const btnSairGrupo = document.getElementById("pcBtnSairGrupo");
  if (btnSairGrupo) {
    btnSairGrupo.addEventListener("click", async () => {
      if (!confirm(`Sair do grupo "${pcState.grupoAtivo.nome}"? Você pode voltar depois com o código de convite.`)) return;
      btnSairGrupo.disabled = true;
      const { error } = await sairDoGrupo(pcState.grupoAtivo.id, pcState.perfil.id);
      if (error) { pcState.erro = "Erro ao sair do grupo: " + error.message; btnSairGrupo.disabled = false; return; }
      voltarPraHub();
    });
  }
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

// Itens achatados do cargo (TODOS os candidatos reais, sem filtro de
// busca) — o índice deste array é o data-sen-idx dos cards e a ordem do
// vetor `base` da alça mestra. Reconstruído a cada render.
let _senItens = [];
let _senDragIdx = null, _senTimer = null, _senEditAberto = false, _senMasterAtivo = false;

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
    const linkInsta = linkInstagramDe(c.chave);
    const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 14)}</a>` : "";
    const lapisAdmin = pcState.souAdmin ? ` <button type="button" class="pc-mini-btn pc-mini-btn-sm" data-pc-editar-instagram="${c.chave}" data-pc-editar-instagram-nome="${escaparAtributoHtml(nomeExibicao(c))}" title="${linkInsta ? "Editar" : "Adicionar"} link do Instagram">${iconeSvg("editar", 11)}</button>` : "";
    // Majoritário (Senador) não tem quociente partidário nem sobra — só
    // "E" (eleito = mais votado), sem sufixo QP/M (esses só existem em
    // Deputados). Protótipo aprovado 28/08/2026.
    const badge = eleito ? '<span class="pc-sen-chip" title="Eleito (mais votado)">E</span>' : "";
    return `
    <div class="pc-sen-card${eleito ? " eleito" : ""}${c.votosEditado ? " manual" : ""}" data-sen-idx="${it.idx}">
      <div class="pc-sen-l1">
        ${badge}
        <span class="pc-sen-nm"><span class="pc-sen-nm-txt">${nomeExibicao(c)}</span>${instaDepois}${lapisAdmin}</span>
        <span class="pc-sen-pct" data-pc-sen-editar="${it.idx}"><span class="valNum">${(Number(c.votos) || 0).toLocaleString("pt-BR")}</span><span class="valRot">votos</span></span>
      </div>
      <div class="pc-sen-sub">${posRanking}º · ${nomePartidoExibicao(it.partido)}${it.partidoOriginal && it.partidoOriginal !== it.partido ? ` (${it.partidoOriginal})` : ""}</div>
      ${c.fonte === "ficticio" ? `<div class="pc-dep-provisorio">candidato fictício — nome de preenchimento até a ata real sair</div>` : c.fonte === "rrc" ? `<div class="pc-dep-provisorio">registro oficial (TSE) — ata de convenção ainda não publicada</div>` : ""}
      <div class="pc-fader-linha">
        ${setaFinoHtml("data-pc-seta-sen", String(it.idx), "menos")}
        <div class="pc-sen-slider" data-sen-idx="${it.idx}">
          <div class="pc-sen-bar"><div class="pc-sen-ticks"></div><div class="pc-sen-fill" style="width:${Math.min(100, pctBarra)}%"></div></div>
          <div class="pc-sen-votos"></div>
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
  card.querySelector(".pc-sen-pct").innerHTML = `<span class="valNum">${(Number(c.votos) || 0).toLocaleString("pt-BR")}</span><span class="valRot">votos</span>`;
  card.querySelector(".pc-sen-fill").style.width = Math.min(100, pctBarra) + "%";
  card.querySelector(".pc-sen-grip").style.left = Math.min(100, pctBarra) + "%";
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

let _depDragKey = null, _depTimer = null, _depEditAberto = false, _depMasterAtivo = false, _depEditProximo = null;

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

function faderDepHtml(chaveDrag, v, cap, mini) {
  const pct = Math.min(100, cap > 0 ? v / cap * 100 : 0);
  return `
    <div class="pc-fader-linha">
      ${setaFinoHtml("data-pc-seta-dep", chaveDrag, "menos")}
      <div class="pc-sen-slider${mini ? " pc-sen-slider-mini" : ""}" data-dep-fader="${escaparAtributoHtml(chaveDrag)}">
        <div class="pc-sen-bar"><div class="pc-sen-ticks"></div><div class="pc-sen-fill" style="width:${pct}%"></div></div>
        <div class="pc-sen-votos"></div>
        <div class="pc-sen-grip" style="left:${pct}%"></div>
      </div>
      ${setaFinoHtml("data-pc-seta-dep", chaveDrag, "mais")}
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
  const refUf = typeof refEleitoradoDe === "function" ? refEleitoradoDe(pcState.estado) : null;
  const temAptos = !!(refUf && refUf.eleitorado2026);
  const aptosDep = temAptos ? refUf.eleitorado2026 : null;
  const comparDep = temAptos ? Math.round(refUf.comparecimento2022 * fator) : null;
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
        ${temAptos ? funilLinha("Eleitores aptos 2026 (TSE)", aptosDep, 100) : ""}
        ${temAptos ? funilLinha("Comparecem (taxa hist. 2022)", comparDep, Math.round(comparDep / aptosDep * 100)) : ""}
        ${funilLinha("Votos válidos projetados", Math.round(E), temAptos ? Math.round(E / aptosDep * 100) : 100, true)}
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
      <span class="pc-fva-sigla">${nomePartidoExibicao(l.partido)}</span>
      <span class="pc-fva-qual">${l.cadeira}\u00aa \u00b7 ${l.qual}</span>
      <span class="pc-fva-cand"><span class="n">${l.nome}</span><span class="v">${l.votos.toLocaleString("pt-BR")} votos \u00b7 pr\u00f3ximo da fila</span>${l.perde ? `<span class="perde">no lugar de ${l.perde.nome} (${nomePartidoExibicao(l.perde.partido)}) \u2014 marcado sem respaldo do voto atual</span>` : ""}</span>
      <button type="button" class="pc-fva-conf" data-pc-fva-conf="${escaparAtributoHtml(l.partido)}"${l.perde ? ` data-pc-fva-perde="${escaparAtributoHtml(l.perde.partido)}"` : ""} title="${l.perde ? `Confirma ${l.nome} e desmarca ${l.perde.nome} (${l.perde.partido}), que hoje segura a vaga sem respaldo do voto` : `Confirmar: marca ${l.nome} como eleito (sobe 1 vaga no box do partido)`}">${iconeSvg("confere", 12)} confirmar</button>
      <button type="button" class="pc-fva-ir" data-pc-fva-ir="${escaparAtributoHtml(l.partido)}" title="Abrir o card do partido">${iconeSvg("setaDireita", 11)}</button>
    </div>`).join("");
  return `
    <div class="glass-card pc-fva${aberta ? " aberta" : ""}" id="pcFaixaVagas" style="padding:12px 14px; cursor:pointer;">
      <div class="pc-fva-cab">
        <span class="pc-fva-num">${dados.marcadas}<span class="dim">/${totalVagasCargo}</span> <b>\u00b7 ${dados.emAberto} em aberto</b></span>
        <span class="pc-fva-tx">pela vota\u00e7\u00e3o atual, ${dados.emAberto === 1 ? "essa vaga j\u00e1 tem dono" : "essas vagas j\u00e1 t\u00eam dono"} \u2014 <b>falta voc\u00ea confirmar</b></span>
        <svg class="pc-fva-chev" width="12" height="12" viewBox="0 0 16 16"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>
      </div>
      ${aberta ? `
      <div class="pc-fva-corpo">
        ${linhas}
        <div class="pc-fva-nota"><b>QP</b> = vaga pelo quociente partid\u00e1rio \u00b7 <b>N\u00aa M</b> = rodada da sobra (m\u00e9dia) \u00b7 o nome \u00e9 o candidato mais votado ainda sem marca\u00e7\u00e3o naquele partido \u2014 a setinha abre o card.</div>
      </div>` : ""}
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
    const cands = aberto ? candsOrd.map((c, k) => {
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
            : `<span class="pc-sen-chip" title="Eleito pela sobra (método das médias, art. 109)${rodadaSobraCand !== undefined ? ` — foi a ${rodadaSobraCand}ª sobra distribuída de ${disputa.totalSobrasCargo} no cargo` : ""}">E-M${rodadaSobraCand !== undefined ? ` · ${rodadaSobraCand}ª` : ""}</span>`))
        : (naFila ? `<span class="pc-sen-chip fila" title="Pela vota\u00e7\u00e3o atual este candidato est\u00e1 ganhando a ${k + 1}\u00aa vaga do partido \u2014 marque no box pra confirmar o palpite.">E?</span>` : "");
      // Posição do candidato na lista do partido (pedido do usuário,
      // 24/08/2026) — discreto, só a colocação por votação de hoje.
      const posicao = `<span class="pc-dep-pos">${k + 1}º</span>`;
      const linkInsta = linkInstagramDe(c.chave);
      // Ícone do Instagram MONOCROMÁTICO à DIREITA do nome (refino 20/08) —
      // só aparece pra quem tem link alimentado na planilha/admin.
      const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 16)}</a>` : "";
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
          <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">${nomeExibicao(c)}</span>${instaDepois}${lapisAdmin}</span>
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
          <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">${nomeExibicao(c)}</span>${instaDepois}${lapisAdmin}</span>
          <span class="pc-dep-cpct" data-pc-dep-editar="${escaparAtributoHtml(c.chave)}"><span class="valNum">${cv.toLocaleString("pt-BR")}</span><span class="valRot">votos</span></span>
        </div>
        ${naFila ? `<div class="pc-dep-fila-tag">ganhando a ${k + 1}\u00aa vaga pela vota\u00e7\u00e3o \u2014 marque pra confirmar</div>` : ""}
        ${c.fonte === "ficticio" ? `<div class="pc-dep-provisorio">candidato fictício — nome de preenchimento até a ata real sair</div>` : c.fonte === "rrc" ? `<div class="pc-dep-provisorio">registro oficial (TSE) — ata de convenção ainda não publicada</div>` : ""}
        ${Number(c.votos2022) > 0 ? `<div class="pc-dep-c2022">2022: ${Number(c.votos2022).toLocaleString("pt-BR")} votos${c.eleito2022 ? " · eleito" : ""}${c.partidoOrigem2022 ? `${c.eleito2022 ? " pelo" : " · veio do"} ${c.partidoOrigem2022}` : ""}</div>` : ""}
        ${faderDepHtml("c|" + gi + "|" + c.chave, cv, capCand, true)}
      </div>`;
    }).join("") : "";
    // Card sintético "Legenda" (pedido do usuário, 31/08/2026): o voto dado
    // só na sigla, editável como um candidato — soma pro QP do partido, mas
    // nunca é marcável nem ocupa vaga. Fica fixo no fim da lista do grupo.
    const legendaCand = p.candidatos.find((c) => c.fonte === "legenda");
    const cvLeg = legendaCand ? (Number(legendaCand.votos) || 0) : 0;
    const legendaHtml = aberto && legendaCand ? `
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
      ${aberto ? `<div class="pc-dep-subpainel">
        <div class="pc-cmd-b22">
          <div class="pc-cmd-b22-ano">2022</div>
          <div class="pc-cmd-b22-metades">
            <button type="button" data-pc-ver2022="${p.nome}" title="Nominata completa de 2022">${iconeSvg("lista", 12)}</button>
            <button type="button" data-pc-reset="${p.nome}" title="Restaurar votação de 2022 deste partido">${iconeSvg("relogio", 12)}</button>
          </div>
        </div>
        <button type="button" class="pc-cmd-acao" data-pc-zerar="${p.nome}" title="Zerar votação do partido">${iconeSvg("borracha", 12)}</button>
        <button type="button" class="pc-cmd-acao" data-dep-magico="${gi}" title="Preencher só este partido automaticamente">${iconeSvg("completar", 13)}</button>
      </div>` : ""}
      ${aberto ? `<div class="pc-dep-cands">${(cands + legendaHtml) || '<div class="pc-sen-rod">Nenhum candidato carregado neste grupo.</div>'}</div>` : ""}
      ${!aberto && candsOrd.length ? `<div class="pc-dep-preview">
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
    });
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
    <div id="pcInstrucaoOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
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
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid rgba(242,244,245,.08);">
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
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="pc-sub" style="margin:0;">Plenário — ${totalVagasCargo} vagas</div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${renderBotaoLegendaBadge()}
          <button id="pcBtnColapsarPlenario" class="pc-mini-btn" title="${plenarioColapsado ? "Expandir" : "Recolher"}">
            <svg viewBox="0 0 16 16" width="13" height="13" style="transform:${plenarioColapsado ? "rotate(-90deg)" : "none"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
          </button>
        </div>
      </div>
      ${plenarioColapsado ? "" : `
      <div style="margin-top:14px;">
        ${hemiciclo}
        <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);">${legendaPlenario}</div>
      </div>`}
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
  const btnColapsarPlenario = document.getElementById("pcBtnColapsarPlenario");
  if (btnColapsarPlenario) {
    btnColapsarPlenario.addEventListener("click", () => {
      const chave = "plenarioColapsado_" + pcState.cargoAtivo;
      const atualCol = pcState.expandido[chave] === undefined ? true : !!pcState.expandido[chave];
      pcState.expandido[chave] = !atualCol;
      renderCargoEstadual();
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
      pcState.expandido[chave] = !pcState.expandido[chave];
      renderCargoEstadual();
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

// ===== Documento impresso padrão v8 (aprovado pelo usuário em 22/08/2026,
// após 8 rodadas de protótipo) ============================================
// Estrutura REUTILIZÁVEL pra todos os documentos do app: o palpite (agora),
// o de resultado na apuração (mesmas colunas, preenchendo Resultado/Dif./%/
// pontos) e o do desafio 1×1 (futuro — assinatura dupla + código validável).
// Regras visuais travadas: verde do papel é #1FA83A (o #34E84A de tela é
// claro demais sobre branco) e aparece SÓ na marca e em destaque eleitoral;
// toda distinção sobrevive à impressão monocromática por FORMA — E
// preenchido (eleito de fato) vs vazado (marcação do palpite), caixa de
// votos sólida vs quadro de pontos tracejado, negrito vs regular, ▲▼ pela
// direção. Estilos em css/estilo.css (bloco .di-*, dentro de @media print).
const DOC_APP_URL = "netofloripabr.github.io/simulador-legislativo";
// QR de https://netofloripabr.github.io/simulador-legislativo/ (33×33,
// correção M) — gerado offline uma única vez; um path SVG por linha de
// módulos, sem dependência de biblioteca nem de rede na hora de imprimir.
const DOC_QR_PATH = "M0 0h7v1h-7zM8 0h1v1h-1zM10 0h1v1h-1zM12 0h2v1h-2zM16 0h4v1h-4zM21 0h1v1h-1zM23 0h1v1h-1zM26 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h2v1h-2zM12 1h2v1h-2zM18 1h1v1h-1zM20 1h4v1h-4zM26 1h1v1h-1zM32 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM10 2h3v1h-3zM15 2h1v1h-1zM18 2h1v1h-1zM23 2h2v1h-2zM26 2h1v1h-1zM28 2h3v1h-3zM32 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h2v1h-2zM14 3h1v1h-1zM16 3h3v1h-3zM22 3h1v1h-1zM24 3h1v1h-1zM26 3h1v1h-1zM28 3h3v1h-3zM32 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM9 4h1v1h-1zM12 4h3v1h-3zM19 4h1v1h-1zM21 4h1v1h-1zM24 4h1v1h-1zM26 4h1v1h-1zM28 4h3v1h-3zM32 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h2v1h-2zM12 5h2v1h-2zM17 5h3v1h-3zM24 5h1v1h-1zM26 5h1v1h-1zM32 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h1v1h-1zM24 6h1v1h-1zM26 6h7v1h-7zM8 7h1v1h-1zM10 7h2v1h-2zM17 7h1v1h-1zM19 7h1v1h-1zM23 7h2v1h-2zM0 8h1v1h-1zM2 8h2v1h-2zM5 8h3v1h-3zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h6v1h-6zM26 8h1v1h-1zM29 8h1v1h-1zM31 8h2v1h-2zM0 9h1v1h-1zM3 9h1v1h-1zM7 9h1v1h-1zM9 9h2v1h-2zM17 9h4v1h-4zM23 9h1v1h-1zM26 9h2v1h-2zM29 9h2v1h-2zM32 9h1v1h-1zM2 10h2v1h-2zM5 10h4v1h-4zM14 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM23 10h7v1h-7zM31 10h2v1h-2zM0 11h2v1h-2zM3 11h3v1h-3zM9 11h8v1h-8zM18 11h1v1h-1zM23 11h3v1h-3zM27 11h1v1h-1zM29 11h1v1h-1zM32 11h1v1h-1zM1 12h3v1h-3zM6 12h1v1h-1zM8 12h2v1h-2zM15 12h1v1h-1zM18 12h1v1h-1zM20 12h1v1h-1zM22 12h4v1h-4zM27 12h3v1h-3zM0 13h1v1h-1zM3 13h3v1h-3zM11 13h2v1h-2zM16 13h2v1h-2zM19 13h1v1h-1zM21 13h2v1h-2zM24 13h1v1h-1zM27 13h1v1h-1zM29 13h3v1h-3zM3 14h1v1h-1zM5 14h2v1h-2zM8 14h1v1h-1zM10 14h1v1h-1zM12 14h1v1h-1zM15 14h7v1h-7zM26 14h4v1h-4zM0 15h3v1h-3zM5 15h1v1h-1zM9 15h2v1h-2zM12 15h1v1h-1zM14 15h1v1h-1zM16 15h1v1h-1zM21 15h2v1h-2zM25 15h3v1h-3zM29 15h2v1h-2zM0 16h2v1h-2zM3 16h6v1h-6zM13 16h3v1h-3zM18 16h5v1h-5zM25 16h2v1h-2zM28 16h3v1h-3zM2 17h3v1h-3zM7 17h1v1h-1zM13 17h1v1h-1zM15 17h1v1h-1zM17 17h1v1h-1zM20 17h1v1h-1zM23 17h4v1h-4zM28 17h2v1h-2zM32 17h1v1h-1zM3 18h4v1h-4zM8 18h1v1h-1zM11 18h1v1h-1zM14 18h4v1h-4zM20 18h1v1h-1zM24 18h5v1h-5zM30 18h2v1h-2zM3 19h2v1h-2zM7 19h2v1h-2zM12 19h1v1h-1zM16 19h1v1h-1zM20 19h1v1h-1zM22 19h4v1h-4zM28 19h1v1h-1zM31 19h1v1h-1zM4 20h3v1h-3zM8 20h3v1h-3zM18 20h2v1h-2zM21 20h1v1h-1zM29 20h2v1h-2zM32 20h1v1h-1zM0 21h2v1h-2zM3 21h3v1h-3zM7 21h1v1h-1zM9 21h1v1h-1zM14 21h2v1h-2zM17 21h5v1h-5zM23 21h1v1h-1zM25 21h2v1h-2zM29 21h1v1h-1zM32 21h1v1h-1zM4 22h1v1h-1zM6 22h1v1h-1zM12 22h3v1h-3zM16 22h2v1h-2zM20 22h2v1h-2zM23 22h3v1h-3zM31 22h2v1h-2zM1 23h1v1h-1zM5 23h1v1h-1zM7 23h1v1h-1zM13 23h2v1h-2zM16 23h1v1h-1zM18 23h3v1h-3zM22 23h1v1h-1zM24 23h4v1h-4zM29 23h1v1h-1zM31 23h2v1h-2zM0 24h1v1h-1zM2 24h1v1h-1zM4 24h4v1h-4zM10 24h1v1h-1zM15 24h3v1h-3zM22 24h8v1h-8zM31 24h1v1h-1zM8 25h2v1h-2zM13 25h7v1h-7zM21 25h1v1h-1zM24 25h1v1h-1zM28 25h2v1h-2zM0 26h7v1h-7zM8 26h3v1h-3zM13 26h1v1h-1zM16 26h1v1h-1zM19 26h1v1h-1zM23 26h2v1h-2zM26 26h1v1h-1zM28 26h1v1h-1zM31 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM8 27h2v1h-2zM14 27h2v1h-2zM21 27h1v1h-1zM23 27h2v1h-2zM28 27h5v1h-5zM0 28h1v1h-1zM2 28h3v1h-3zM6 28h1v1h-1zM10 28h3v1h-3zM15 28h1v1h-1zM17 28h1v1h-1zM21 28h8v1h-8zM30 28h2v1h-2zM0 29h1v1h-1zM2 29h3v1h-3zM6 29h1v1h-1zM8 29h1v1h-1zM10 29h2v1h-2zM13 29h1v1h-1zM18 29h1v1h-1zM20 29h4v1h-4zM27 29h1v1h-1zM29 29h1v1h-1zM32 29h1v1h-1zM0 30h1v1h-1zM2 30h3v1h-3zM6 30h1v1h-1zM8 30h1v1h-1zM10 30h1v1h-1zM20 30h2v1h-2zM23 30h2v1h-2zM26 30h2v1h-2zM29 30h2v1h-2zM0 31h1v1h-1zM6 31h1v1h-1zM9 31h4v1h-4zM15 31h3v1h-3zM20 31h1v1h-1zM22 31h3v1h-3zM26 31h3v1h-3zM32 31h1v1h-1zM0 32h7v1h-7zM8 32h2v1h-2zM11 32h1v1h-1zM14 32h8v1h-8zM25 32h2v1h-2zM28 32h1v1h-1zM30 32h1v1h-1z";

// Ícones do documento (SVG inline — no papel não dá pra reusar iconeSvg do
// app: os traços foram redesenhados pra imprimir nítido em 10-15px).
// variante: "meu" (vazado cinza — marcação do palpite), "fato" (preenchido
// verde — eleito de FATO na apuração), "hdr" (vazado, tom de cabeçalho).
function docIcLetra(letra, tam, variante) {
  if (variante === "fato") {
    return `<svg class="di-ic di-fato" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><circle cx="8" cy="8" r="7.2" fill="currentColor"></circle><text x="8" y="11.2" text-anchor="middle" font-size="9" font-weight="800" fill="#fff">${letra}</text></svg>`;
  }
  return `<svg class="di-ic di-${variante}" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.5"></circle><text x="8" y="11.2" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor">${letra}</text></svg>`;
}
function docIcAlvo(tam) {
  return `<svg class="di-ic di-hdr" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"></circle><circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"></circle><circle cx="8" cy="8" r="1.1" fill="currentColor"></circle></svg>`;
}
function docIcPosicao(tam) {
  return `<svg class="di-ic di-hdr" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><rect x="2.4" y="2.4" width="11.2" height="11.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.5"></rect><path d="M5 8.3l2.1 2.1 4-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
}

// Legenda de ícones — IDÊNTICA em todo documento (palpite, resultado,
// desafio): exigência do usuário depois que o protótipo divergiu entre os
// dois primeiros. Uma linha só; sem explicar ▲▼ (entende-se naturalmente).
function docLegenda() {
  return `
    <div class="di-legenda">
      <span>${docIcLetra("E", 11, "meu")} eleito no seu palpite</span>
      <span>${docIcLetra("S", 11, "meu")} suplente</span>
      <span>${docIcLetra("E", 11, "fato")} eleito de fato</span>
      <span style="margin-left:auto;">pontos: ${docIcLetra("E", 10, "hdr")} acerto de eleição · ${docIcAlvo(10)} proximidade de votos (%) · ${docIcPosicao(10)} acerto de posição · <b>Pts</b>&nbsp;= soma dos três</span>
    </div>`;
}

// Bloco "Registro do documento" (opcional — toggle Registrar na tela de
// impressão): nome do autor, lista, data/hora e linha de assinatura. O
// convidado sem cadastro ganha uma linha em branco pra escrever o nome.
function docRegistro(dataTxt, horaTxt) {
  const nomeAutor = (pcState.perfil && pcState.perfil.nome) || "";
  const nomeLista = pcState.listaSalvaNome || "";
  return `
    <div class="di-reg">
      <div class="di-reg-tit">Registro do documento</div>
      <div class="di-reg-corpo">
        <div class="di-reg-dados">
          ${nomeAutor ? `<div class="di-reg-nome">${nomeAutor}</div>` : `<div class="di-reg-nome di-reg-linha-nome">&nbsp;</div>`}
          <div class="di-reg-meta">${nomeLista ? `Lista "${nomeLista}" · ` : ""}gerado em ${dataTxt} às ${horaTxt}</div>
        </div>
        <div class="di-reg-ass"><div class="di-reg-ass-linha"></div><div class="di-reg-ass-leg">assinatura</div></div>
      </div>
    </div>`;
}

function docRodape() {
  return `
    <div class="di-rodape">
      <div class="di-convite">
        <div class="di-frase">Você faria uma lista melhor?</div>
        <div class="di-texto">Monte a sua previsão pra 2026 e dispute com quem entende de política — grátis, direto do celular.</div>
        <div class="di-url">${DOC_APP_URL}</div>
      </div>
      <div class="di-qrbox">
        <svg viewBox="0 0 33 33" width="54" height="54" shape-rendering="crispEdges"><path d="${DOC_QR_PATH}" fill="#111"></path></svg>
        <div class="di-qrleg">aponte a câmera</div>
      </div>
    </div>`;
}

// Opções do <select> "Por partido" da tela de impressão — união dos
// partidos/federações presentes nos 3 cargos do palpite atual.
function opcoesPartidosImpressao() {
  const nomes = new Set();
  CARGOS.forEach((c) => {
    const lista = pcState.palpitesPorCargo && pcState.palpitesPorCargo[c.id];
    (lista || []).forEach((p) => { if (p.nome) nomes.add(p.nome); });
  });
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt"))
    .map((n) => `<option value="${n}">${n}</option>`).join("");
}

// Uma seção de cargo do documento: cabeçalho de colunas + linhas no padrão
// v8 (posição · ícone E/S · nome/legenda · caixa de votos · quadro de
// pontos). No documento de PALPITE as colunas Resultado/Dif./%/pontos saem
// como "—" (aguardam a apuração oficial — o convite pra voltar ao app).
// op: { recorte, partido, ordenacao } — ver tela de impressão na Revisão.
function montarSecaoImpressaoCargo(cargo, op) {
  op = op || {};
  const cargoInfo = CARGOS.find((c) => c.id === cargo);
  const lista = pcState.palpitesPorCargo[cargo];
  const eleitos = classificarEleitosPorPartido(lista, cargo);
  const suplentes = proximosSuplentes(30, lista);
  const generoPorChave = new Map();
  (lista || []).forEach((p) => (p.candidatos || []).forEach((c) => generoPorChave.set(c.chave, c.genero || "")));

  let linhas = eleitos.map((c) => ({ ...c, tipo: "E" }))
    .concat(suplentes.map((c) => ({ ...c, tipo: "S" })));
  if (op.recorte === "eleitos") linhas = linhas.filter((l) => l.tipo === "E");
  else if (op.recorte === "candidatas") linhas = linhas.filter((l) => String(generoPorChave.get(l.chave) || "").toUpperCase().startsWith("FEM"));
  else if (op.recorte === "partido" && op.partido) {
    // Recorte por partido = a CHAPA COMPLETA daquele partido (bug achado
    // pelo usuário em 31/08/2026: filtrar eleitos + 30 suplentes GERAIS
    // deixava de fora quem não estava entre os 30 melhores do cargo
    // inteiro). Eleitos mantêm a etiqueta E; o resto sai como suplente
    // do partido, por votação decrescente.
    const grupoP = (lista || []).find((pp) => pp.nome === op.partido);
    const chavesE = new Set(eleitos.filter((e) => e.partido === op.partido).map((e) => e.chave));
    const eleitoPorChave = new Map(eleitos.filter((e) => e.partido === op.partido).map((e) => [e.chave, e]));
    linhas = (grupoP ? grupoP.candidatos.filter((c) => c.fonte !== "legenda" && !c.status) : [])
      .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0))
      .map((c) => chavesE.has(c.chave)
        ? { ...eleitoPorChave.get(c.chave), tipo: "E" }
        : { chave: c.chave, nome: nomeExibicao(c), partido: grupoP.nome, votos: Number(c.votos) || 0, tipo: "S" });
  }
  if (op.ordenacao === "crescente") linhas = [...linhas].sort((a, b) => a.votos - b.votos);
  else if (op.ordenacao === "decrescente") linhas = [...linhas].sort((a, b) => b.votos - a.votos);
  if (op.recorte === "top10") linhas = linhas.slice(0, 10);

  const nE = linhas.filter((l) => l.tipo === "E").length;
  const nS = linhas.length - nE;
  const rotuloRecorte = ({ eleitos: "só os eleitos", candidatas: "só as candidatas", partido: op.partido || "", top10: "top 10" })[op.recorte] || "";

  // ===== v9 (protótipo aprovado 31/08/2026): etiquetas E-QP/E-M·nª no
  // padrão da tela, chips de partido por eleitos (decrescente) e a relação
  // das rodadas de sobra ao final — SÓ em lista com eleitos de múltiplos
  // partidos (proporcionais completos; senador e recortes ficam como eram).
  const eleitosDoc = linhas.filter((l) => l.tipo === "E");
  const aplicaV9 = cargo !== "senador" && eleitosDoc.length > 0 && new Set(eleitosDoc.map((l) => l.partido)).size > 1;
  let chipsPartidos = "", sobrasHtml = "";
  const rodadaPorChave = new Map();
  if (aplicaV9) {
    const porP = new Map();
    eleitosDoc.forEach((l) => porP.set(l.partido, (porP.get(l.partido) || 0) + 1));
    chipsPartidos = `<div class="di-pchips">${[...porP.entries()].sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `<span class="di-pchip">${p} <b>${n}</b></span>`).join("")}</div>`;

    const totalVagasCargoDoc = vagasFixasCargo(pcState.estado, cargo);
    const disputa = calcularDisputaSobra(lista, totalVagasCargoDoc);
    // rodada de cada cadeira de sobra, na mesma ordenação da classificação
    // (marcados por votos desc, por partido)
    lista.forEach((p, pIdx) => {
      const marcados = [...p.candidatos.filter((c) => c.marcadoEleito && c.fonte !== "legenda")]
        .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      marcados.forEach((c, i) => {
        const r = (disputa.rodadaSobraPorPartido[pIdx] || [])[i];
        if (r !== undefined) rodadaPorChave.set(c.chave, r);
      });
    });
    if (disputa.rodadas && disputa.rodadas.length) {
      const vagasQP = totalVagasCargoDoc - disputa.totalSobrasCargo;
      sobrasHtml = `
      <div class="di-sobras">
        <div class="di-sobras-tit">Distribuição das sobras — método das médias (art. 109)</div>
        <div class="di-sobras-intro">${vagasQP} vaga${vagasQP === 1 ? " saiu" : "s saíram"} direto pelo quociente partidário (QE ${Number(disputa.qe || 0).toLocaleString("pt-BR")}). A${disputa.totalSobrasCargo === 1 ? "" : "s"} <b>${disputa.totalSobrasCargo} restante${disputa.totalSobrasCargo === 1 ? "" : "s"}</b> ${disputa.totalSobrasCargo === 1 ? "foi distribuída" : "foram distribuídas"} rodada a rodada — em cada uma, ganha o partido com a maior média (votos ÷ vagas já obtidas + 1):</div>
        ${disputa.rodadas.map((r) => `
        <div class="di-srod"><span class="rn">${r.numero}ª</span><span class="rp">${r.vencedorNome}</span><span class="rc">${r.vencedorCandidato ? "elegeu " + r.vencedorCandidato : ""}</span><span class="rm">média ${Math.round(r.vencedorMedia || 0).toLocaleString("pt-BR")}</span></div>`).join("")}
      </div>`;
    }
  }
  const sub = aplicaV9
    ? `${nE} eleito${nE === 1 ? "" : "s"}${rotuloRecorte ? ` · recorte: ${rotuloRecorte}` : ""} · votação de referência 2022 · as colunas de resultado e pontos serão preenchidas na apuração oficial — acompanhe.`
    : `${nE} eleito${nE === 1 ? "" : "s"}${nS ? ` + ${nS} suplente${nS === 1 ? "" : "s"}` : ""}${rotuloRecorte ? ` · recorte: ${rotuloRecorte}` : ""} · votação de referência 2022 · as colunas de resultado e pontos serão preenchidas na apuração oficial — acompanhe.`;

  const chipDe = (l) => {
    if (!aplicaV9) return docIcLetra(l.tipo, 15, "meu");
    if (l.tipo === "S") return '<span class="di-chip di-chip-s">S</span>';
    const rod = rodadaPorChave.get(l.chave);
    const rotulo = l.tag === "média" ? `E-M${rod !== undefined ? ` · ${rod}ª` : ""}` : "E-QP";
    return `<span class="di-chip">${rotulo}</span>`;
  };
  const linhaHtml = (l, i, ultima) => `
    <div class="di-linha${ultima ? " di-fim" : ""}">
      <span class="di-pos">${i + 1}º</span>${chipDe(l)}
      <span class="di-cand"><span class="di-n">${l.nome}</span><span class="di-p">${l.partido}</span></span>
      <span class="di-votos"><span class="di-vv di-forte">${l.votos.toLocaleString("pt-BR")}</span><span class="di-vv di-aguarda">—</span><span class="di-vd di-aguarda">—</span><span class="di-vp di-aguarda">—</span></span>
      <span class="di-painel"><span class="di-pt di-vazio">—</span><span class="di-pt di-vazio">—</span><span class="di-pt di-vazio">—</span><span class="di-pt di-tot di-aguarda">—</span></span>
    </div>`;

  return `
    <div class="di-tit">${cargoInfo.label} — meu palpite</div>
    <div class="di-sub">${sub}</div>
    ${chipsPartidos}
    <div class="di-cols">
      <span class="di-pos"></span><span style="width:${aplicaV9 ? 46 : 15}px; flex-shrink:0;"></span>
      <span class="di-cand">Candidato</span>
      <span class="di-votos di-vh"><span class="di-vv">Palpite</span><span class="di-vv">Resultado</span><span class="di-vd">Dif.</span><span class="di-vp">%</span></span>
      <span class="di-painel di-ph"><span class="di-pt">${docIcLetra("E", 10, "hdr")}</span><span class="di-pt">${docIcAlvo(10)}</span><span class="di-pt">${docIcPosicao(10)}</span><span class="di-pt di-tot">Pts</span></span>
    </div>
    ${linhas.length ? linhas.map((l, i) => linhaHtml(l, i, i === linhas.length - 1)).join("") : '<div class="di-sub" style="padding:8px 0;">Nenhum candidato neste recorte pra este cargo.</div>'}
    ${sobrasHtml}
  `;
}

// O documento inteiro: marca d'água + cabeçalho com marca + seções dos
// cargos escolhidos + legenda + registro (opcional) + rodapé com QR.
// Documento impresso do DUELO 1×1 (pedido do usuário, 30/08/2026): mesma
// estrutura do documento de palpite (marca d'água, cabeçalho, colunas
// di-*, legenda, rodapé com QR), com as DUAS colunas de palpite lado a
// lado (Você × Rival) — resultado e pontos preenchem na apuração.
function montarImpressaoDuelo(desafio, nomeDesafiante) {
  const nomeEstado = (typeof ESTADOS_BRASIL !== "undefined" && (ESTADOS_BRASIL.find((e) => e.sigla === desafio.estado) || {}).nome) || desafio.estado || "";
  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-BR");
  const horaTxt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const cargoInfo = CARGOS.find((c) => c.id === desafio.cargo) || { label: desafio.cargo };
  const meuNome = (pcState.perfil && pcState.perfil.nome) || "Você";
  const ehEleitos = desafio.tipo_disputa === "eleitos";
  const votosEu = new Map((desafio.votos_desafiado || []).map((v) => [v.chave, Number(v.votos) || 0]));
  const votosRival = new Map((desafio.votos_criador || []).map((v) => [v.chave, Number(v.votos) || 0]));
  let linhas = "";
  if (ehEleitos) {
    const meus = new Set((desafio.eleitos_desafiado || []).map((c) => c.chave));
    const dele = new Set((desafio.eleitos_criador || []).map((c) => c.chave));
    const todos = new Map();
    (desafio.eleitos_desafiado || []).forEach((c) => todos.set(c.chave, c));
    (desafio.eleitos_criador || []).forEach((c) => { if (!todos.has(c.chave)) todos.set(c.chave, c); });
    linhas = [...todos.values()].map((c, i) => `
      <div class="di-linha${i === todos.size - 1 ? " di-fim" : ""}">
        <span class="di-pos">${i + 1}º</span>${docIcLetra("E", 15, "meu")}
        <span class="di-cand"><span class="di-n">${c.nome}</span><span class="di-p">${c.partido}</span></span>
        <span class="di-votos"><span class="di-vv di-forte">${meus.has(c.chave) ? "eleito" : "—"}</span><span class="di-vv">${dele.has(c.chave) ? "eleito" : "—"}</span><span class="di-vd di-aguarda">—</span><span class="di-vp di-aguarda">—</span></span>
        <span class="di-painel"><span class="di-pt di-vazio">—</span><span class="di-pt di-tot di-aguarda">—</span></span>
      </div>`).join("");
  } else {
    const escopo = [...(desafio.escopo_candidatos || [])].sort((a, b) => (votosEu.get(b.chave) || 0) - (votosEu.get(a.chave) || 0));
    linhas = escopo.map((c, i) => `
      <div class="di-linha${i === escopo.length - 1 ? " di-fim" : ""}">
        <span class="di-pos">${i + 1}º</span>${docIcLetra("E", 15, "meu")}
        <span class="di-cand"><span class="di-n">${c.nome}</span><span class="di-p">${c.partido}</span></span>
        <span class="di-votos"><span class="di-vv di-forte">${(votosEu.get(c.chave) || 0).toLocaleString("pt-BR")}</span><span class="di-vv">${(votosRival.get(c.chave) || 0).toLocaleString("pt-BR")}</span><span class="di-vd di-aguarda">—</span><span class="di-vp di-aguarda">—</span></span>
        <span class="di-painel"><span class="di-pt di-vazio">—</span><span class="di-pt di-tot di-aguarda">—</span></span>
      </div>`).join("");
  }
  return `
    <div class="di-agua"><span><b>Simula</b>LEGIS</span></div>
    <div class="di-conteudo">
      <div class="di-cab">
        <div class="di-marca">
          <div class="di-wm"><b>Simula</b><span>LEGIS</span></div>
          <div class="di-wmsub">Simulador Eleitoral Legislativo 2026</div>
        </div>
        <div class="di-meta"><b>${nomeEstado}</b> · Duelo 1×1 "${desafio.nome}"${desafio.codigo ? ` · ${desafio.codigo}` : ""}<br>${meuNome} × ${nomeDesafiante} · selado em ${dataTxt}</div>
      </div>
      <div class="di-regra"></div>
      <div class="di-tit">${cargoInfo.label} — duelo 1×1</div>
      <div class="di-sub">${ehEleitos ? "composição do plenário indicada por cada lado" : "palpites dos dois lados"} · a coluna da esquerda é de ${meuNome}, a da direita de ${nomeDesafiante} · resultado e pontos serão preenchidos na apuração oficial — acompanhe.</div>
      <div class="di-cols">
        <span class="di-pos"></span><span style="width:15px; flex-shrink:0;"></span>
        <span class="di-cand">Candidato</span>
        <span class="di-votos di-vh"><span class="di-vv">${meuNome.split(" ")[0]}</span><span class="di-vv">${nomeDesafiante.split(" ")[0]}</span><span class="di-vd">Resultado</span><span class="di-vp">%</span></span>
        <span class="di-painel di-ph"><span class="di-pt">P·V</span><span class="di-pt di-tot">P·R</span></span>
      </div>
      ${linhas}
      <div class="di-legenda">
        <span><b>Resultado</b>&nbsp;= votação oficial da apuração de 2026</span>
        <span><b>P·V / P·R</b>&nbsp;= pontos de ${meuNome.split(" ")[0]} e de ${nomeDesafiante.split(" ")[0]} (acerto de eleição + proximidade de votos)</span>
      </div>
      ${docRodape()}
      <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dataTxt} ${horaTxt}</span></div>
    </div>`;
}

function montarDocumentoImpresso(cargosParaGerar, op) {
  op = op || {};
  const nomeEstado = (typeof ESTADOS_BRASIL !== "undefined" && (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome) || pcState.estado || "";
  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-BR");
  const horaTxt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const nomeAutor = (pcState.perfil && pcState.perfil.nome) || "";
  const ordemLabel = ({ crescente: "votos em ordem crescente", decrescente: "votos em ordem decrescente" })[op.ordenacao] || "ordem do palpite";
  return `
    <div class="di-agua"><span><b>Simula</b>LEGIS</span></div>
    <div class="di-conteudo">
      <div class="di-cab">
        <div class="di-marca">
          <div class="di-wm"><b>Simula</b><span>LEGIS</span></div>
          <div class="di-wmsub">Simulador Eleitoral Legislativo 2026</div>
        </div>
        <div class="di-meta"><b>${nomeEstado}</b>${nomeAutor ? ` · Lista de ${nomeAutor}` : ""}<br>gerada em ${dataTxt} · ${ordemLabel}</div>
      </div>
      <div class="di-regra"></div>
      ${cargosParaGerar.map((c) => montarSecaoImpressaoCargo(c, op)).join("")}
      ${docLegenda()}
      ${op.registrar ? docRegistro(dataTxt, horaTxt) : ""}
      ${docRodape()}
      <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dataTxt} ${horaTxt}</span></div>
    </div>`;
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
  pcState._statusSalvamentoMsg = msg; // o modal de slots lê isso na falha
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

// Seletor de destino do Salvar (pedido do usuário, 21/08/2026): o disquete
// abre a escolha — atualizar a lista ativa (padrão), sobrescrever outro
// slot em aberto, ou salvar como nova. As regras de acesso valem por tipo
// de usuário: depositada nunca é slot (cédula imutável); nova lista além
// das 2 grátis consome 1 crédito (logado) ou pede cadastro (convidado) —
// os mesmos gates do "+" de Minhas listas.
function renderModalSalvarDestino() {
  // Slots estilo videogame, versão B "linha com anel" (protótipo aprovado
  // 22/08/2026): cada lista em aberto é um slot com anel de progresso
  // circular (vagas preenchidas / total do estado) e o número dentro;
  // slot vazio = anel pontilhado com o campo de nome no lugar; o slot
  // além dos 2 grátis nasce TRANCADO (cadeado + preço) — a economia
  // visível como slots finitos. Sobrescrever pede o "Sobrescrever?"
  // clássico. Convidado tem o progresso (conteúdo local); logado mostra
  // anel neutro (o resumo do banco não traz os cargos).
  const destinos = (pcState._destinosSalvar || []).filter((l) => !l.depositadoEm);
  const sel = pcState._destinoSelecionado || null;
  const totalVagasEstado = CARGOS.reduce((t, c) => t + (vagasFixasCargo(pcState.estado, c.id) || 0), 0);
  const progressoDe = (l) => {
    if (!l.palpitesPorCargo || !totalVagasEstado) return null;
    let ind = 0;
    CARGOS.forEach((c) => {
      const lista = l.palpitesPorCargo[c.id];
      if (!lista) return;
      if (c.id === "senador") ind += lista.reduce((t, p) => t + (p.candidatos || []).filter((x) => x.marcadoEleito).length, 0);
      else ind += lista.reduce((t, p) => t + (Number(p.vagasIndicadas) || 0), 0);
    });
    return { ind: Math.min(ind, totalVagasEstado), total: totalVagasEstado };
  };
  const anel = (num, frac, modo) => {
    const C = 106.8; // pathLength do círculo r=17
    const arco = frac === null ? 0 : Math.max(0, Math.min(1, frac)) * C;
    const base = modo === "vazio"
      ? '<circle cx="20" cy="20" r="17" fill="none" stroke="#1E2226" stroke-width="3" stroke-dasharray="3 5"></circle>'
      : '<circle cx="20" cy="20" r="17" fill="none" stroke="#1E2226" stroke-width="3"></circle>';
    const fillArc = arco > 0 ? `<circle cx="20" cy="20" r="17" fill="none" stroke="#34E84A" stroke-width="3" stroke-linecap="round" stroke-dasharray="${arco.toFixed(1)} ${C}" pathLength="${C}"></circle>` : "";
    const centro = modo === "trancado"
      ? `<span class="pc-slotb-num">${iconeSvg("cadeadoSlot", 13)}</span>`
      : `<span class="pc-slotb-num">${String(num).padStart(2, "0")}</span>`;
    return `<div class="pc-slotb-anel"><svg viewBox="0 0 40 40" width="40" height="40" style="transform:rotate(-90deg);">${base}${fillArc}</svg>${centro}</div>`;
  };
  const linhas = [];
  destinos.forEach((l, i) => {
    const prog = progressoDe(l);
    const ativa = l.id === pcState.listaSalvaId;
    const meta = `${new Date(l.atualizadoEm).toLocaleDateString("pt-BR")}${prog ? ` · ${prog.ind}/${prog.total} vagas` : ""}${ativa ? " · em edição" : ""}`;
    linhas.push(`
    <div class="pc-slotb${l.id === sel ? " sel" : ""}" data-pc-destino-slot="${l.id}" data-pc-destino-nome="${escaparAtributoHtml(l.nome)}" data-pc-destino-num="${i + 1}">
      ${anel(i + 1, prog ? prog.ind / prog.total : null)}
      <div class="pc-slotb-corpo">
        <div class="pc-slotb-nome">${l.nome}</div>
        <div class="pc-slotb-meta">${meta}</div>
      </div>
    </div>`);
  });
  const numVazio = destinos.length + 1;
  const podeVazioGratis = destinos.length < 2;
  if (podeVazioGratis || pcState._destinoDesbloqueado) {
    linhas.push(`
    <div class="pc-slotb vazio${sel === "novo" ? " sel" : ""}" data-pc-destino-vazio data-pc-destino-num="${numVazio}">
      ${anel(numVazio, null, "vazio")}
      <div class="pc-slotb-corpo">
        ${sel === "novo"
          ? `<input class="pc-slotb-input" id="pcInputDestinoNome" placeholder="nome da lista…" maxlength="40" value="${escaparAtributoHtml(pcState._destinoNomeDigitado || "")}">`
          : `<div class="pc-slotb-nome vazia">vazio — toque pra salvar aqui</div>`}
        <div class="pc-slotb-meta">${pcState._destinoDesbloqueado && !podeVazioGratis ? "slot desbloqueado — 1 crédito ao salvar" : "&nbsp;"}</div>
      </div>
    </div>`);
  } else {
    linhas.push(`
    <div class="pc-slotb trancado" data-pc-destino-trancado data-pc-destino-num="${numVazio}">
      ${anel(numVazio, null, "trancado")}
      <div class="pc-slotb-corpo">
        <div class="pc-slotb-nome" style="color:var(--pc-ink-dim);">Bloqueado</div>
        <div class="pc-slotb-meta">${pcState.perfil ? `1 crédito (saldo: ${pcState.perfil.creditos || 0}) — ou convide um amigo` : "criar outra lista pede uma conta"}</div>
      </div>
    </div>`);
  }
  const alvoSel = destinos.find((l) => l.id === sel);
  // O botão diz só "Salvar" (decisão do usuário, 22/08): o slot
  // selecionado já mostra ONDE vai gravar — repetir o número no botão é
  // ruído. A confirmação de slot ocupado ("Salvar por cima de...?")
  // continua sendo a rede de segurança.
  const rotuloSalvar = "Salvar";
  // Padrão de save de game (pedido do usuário, 30/08/2026): a confirmação
  // SUBSTITUI a fileira Cancelar/Salvar — uma pergunta, um par de botões.
  // As duas caixas empilhadas de antes liam como duplicação.
  const confirmando = pcState._destinoConfirmando && alvoSel;
  const confirmacao = confirmando ? `
    <div class="pc-slotb-confirm">
      <div class="pc-slotb-confirm-q">Sobrepor <b>"${alvoSel.nome}"</b>?</div>
      <div class="pc-slotb-confirm-ops">
        <button type="button" class="ghost" id="pcSlotConfirmNao">Cancelar</button>
        <button type="button" class="primary" id="pcSlotConfirmSim">Sobrepor</button>
      </div>
    </div>` : "";
  return `
    <div id="pcModalSalvarDestinoOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:20px 18px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div class="pc-slotb-tit">Salvar — escolha o slot</div>
        ${linhas.join("")}
        <div class="pc-erro" id="pcErroDestino" style="min-height:16px; margin-top:2px;"></div>
        ${confirmacao}
        ${confirmando ? "" : `
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="ghost" id="pcBtnCancelarDestino" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarDestino" style="flex:1;" ${sel ? "" : "disabled"}>${rotuloSalvar}</button>
        </div>`}
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
  pcState._farolContexto = "revisao";
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
    // Quem PERDERIA a vaga se a pessoa aceitar o ajuste da matemática real
    // (teste mobile 28/08/2026): o marcado como eleito que a matemática NÃO
    // elege — havendo mais de um, o de menor média conquistada (proporcional)
    // ou menor voto (majoritário), que é exatamente quem a regra derrubaria
    // primeiro. Vira o alvo do botão "Aceitar o ajuste" no aviso.
    const marcadosQueAMatematicaNaoElege = listaCompleta.filter((c) => c.eleito && !c.consistenteComMatematicaReal);
    const perdedorAjuste = marcadosQueAMatematicaNaoElege.length
      ? [...marcadosQueAMatematicaNaoElege].sort((a, b) => cargoDef.id === "senador"
          ? ((Number(a.votos) || 0) - (Number(b.votos) || 0))
          : (((a.detalhe && a.detalhe.mediaConquistada) || 0) - ((b.detalhe && b.detalhe.mediaConquistada) || 0)))[0]
      : null;

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
        // Badge compacto na linha do nome — mesmo padrão do card da tela
        // de palpite (E-QP/E-M/E, teste mobile 28/08/2026); o antigo chip
        // "SOBRA · n/m" vira parte do title do badge E-M.
        const badgeRev = cargoDef.id === "senador"
          ? `<span class="pc-sen-chip" title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="cursor:help;">E</span>`
          : (c.tag === "QP"
            ? `<span class="pc-sen-chip" title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="cursor:help;">E-QP</span>`
            : `<span class="pc-sen-chip" title="${explicacaoTagTexto(c.tag, c.detalhe)}${c.detalhe && c.detalhe.rodadaSobra !== undefined ? ` (sobra ${c.detalhe.rodadaSobra} de ${c.detalhe.totalSobrasCargo})` : ""}" style="cursor:help;">E-M</span>`);
        return cardCandidato(`
          <div class="pc-sen-l1">
            ${badgeRev}
            <span class="pc-sen-nm pc-rev-nm">${c.nome}</span>
            <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:94px; font-size:14px; font-weight:800; text-align:right; flex-shrink:0; padding:8px 6px;">
          </div>
          <div class="pc-sen-sub">${c.posicaoEleicao}º · ${c.partido}</div>
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
        <div class="pc-sen-l1">
          <span class="pc-sen-nm pc-rev-nm">${c.nome}</span>
          <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:94px; font-size:14px; font-weight:800; text-align:right; flex-shrink:0; padding:8px 6px;">
        </div>
        <div class="pc-sen-sub">${c.partido}</div>
        ${c.consistenteComMatematicaReal ? `
        <div style="margin-top:12px; padding:10px 12px; background:rgba(198,230,42,.1); border:1px solid rgba(198,230,42,.3); border-radius:10px;">
          <div style="display:flex; gap:8px; align-items:flex-start;">
            <span style="color:var(--pc-warning); font-size:13px; flex-shrink:0;">${iconeSvg("alerta", 13)}</span>
            <span style="font-size:11.5px; color:var(--pc-warning); line-height:1.5;">${cargoDef.id === "senador"
              ? `A votação de hoje indica que ${c.nome} estaria entre os mais votados (eleição majoritária, voto direto) — mas não está no seu palpite.`
              : `A matemática real (quociente + sobra) indica que ${c.nome} garantiria vaga com a votação de hoje — mas não está no seu palpite.`}${perdedorAjuste ? ` Pela regra, quem perderia a vaga é <b>${perdedorAjuste.nome}</b> (${perdedorAjuste.partido}).` : ""} Fica valendo sua escolha; isso é só um aviso.</span>
          </div>
          ${perdedorAjuste ? `<button data-pc-aceitar-ajuste="${escaparAtributoHtml(cargoDef.id + "::" + c.chave + "::" + perdedorAjuste.chave)}" style="margin-top:10px; width:100%; display:flex; align-items:center; justify-content:center; gap:7px; font-size:12px; font-weight:700; border-radius:9px; padding:9px 10px; background:rgba(198,230,42,.14); border:1px solid rgba(198,230,42,.45); color:var(--pc-warning); cursor:pointer; font-family:var(--sans);">Aceitar o ajuste — eleger ${c.nome} no lugar de ${perdedorAjuste.nome}</button>` : ""}
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
          <button data-pc-modo-revisao="lista" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Lista única, ordenada por votos" class="pc-cmd-acao${agrupado ? "" : " ativo"}" style="flex:none; width:28px; height:28px; min-height:28px; aspect-ratio:1;">${iconeSvg("lista", 13)}</button>
          <button data-pc-modo-revisao="grupo" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Agrupado por partido/federação" class="pc-cmd-acao${agrupado ? " ativo" : ""}" style="flex:none; width:28px; height:28px; min-height:28px; aspect-ratio:1;">${iconeSvg("grupos", 13)}</button>
        </div>
      </div>`;

    return `
      <details class="pc-acc" data-pc-cargo-acc="${cargoDef.id}"${pcState.expandido["revisao-" + cargoDef.id] ? " open" : ""}>
        <summary style="align-items:flex-start;"><span style="flex:1; min-width:0; line-height:1.35;">${cargoDef.label} <span style="font-weight:400; color:var(--pc-ink-dim);">— ${totalEleitos} eleito${totalEleitos === 1 ? "" : "s"}${temInconsistencia ? ` · ${marcadosInconsistentes.length} aviso${marcadosInconsistentes.length === 1 ? "" : "s"}` : ""}</span></span><svg class="pc-chev" viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0; margin-top:3px;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary>
        <div class="pc-acc-body">
          ${listaExibida.length < listaCompleta.length ? `<div style="font-size:10.5px; color:var(--pc-ink-dim); margin-bottom:10px;">Mostrando os eleitos + ${listaExibida.length - totalEleitos} mais votados entre quem não elegeu (${listaCompleta.length - listaExibida.length} candidato${listaCompleta.length - listaExibida.length === 1 ? "" : "s"} com menos voto ficaram de fora dessa lista).</div>` : ""}
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            ${disputaSobra && disputaSobra.rodadas.length > 0 ? `<button data-pc-abrir-disputa-sobra="${cargoDef.id}" style="display:flex; align-items:center; justify-content:center; gap:8px; flex:1; font-size:12.5px; font-weight:700; border-radius:10px; padding:10px; background:rgba(52,232,74,.08); border:1px solid rgba(52,232,74,.45); color:var(--pc-accent); cursor:pointer; font-family:var(--sans);"><svg viewBox="0 0 16 16" width="13" height="13"><path d="M3 13V8M8 13V3M13 13v-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>Ver a disputa das sobras<svg viewBox="0 0 16 16" width="11" height="11"><path d="M5.5 3.5l5 4.5-5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>` : `<span style="flex:1;"></span>`}
            ${filtroAgrupado}
          </div>
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
    // Cada linha do quadro é uma JANELA da própria rodada (pedido do
    // usuário, 21/08/2026): toque abre o detalhe daquela rodada — as
    // médias de todos os partidos, com o vencedor destacado — em vez da
    // listagem única e comprida de todas as rodadas embaixo.
    const linhasResumo = disputaSobra.rodadas.map((r) => {
      const v = r.medias.find((m) => m.venceu);
      const detalheRodada = r.medias.filter((m) => m.votos > 0).map((m) => `
        <div style="display:grid; grid-template-columns:1fr auto; align-items:center; gap:8px; padding:6px 8px; border-radius:8px; font-size:12px;${m.venceu ? " background:rgba(242,244,245,.05); border:1px solid rgba(242,244,245,.18);" : ""}">
          <span style="color:${m.venceu ? "var(--pc-ink)" : "var(--pc-ink-dim)"}; min-width:0; overflow:hidden; text-overflow:ellipsis;">${m.nome}${m.venceu && r.vencedorCandidato ? `<span style="display:block; font-size:10.5px; color:#8A9096; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">vaga vai pra <b style="color:#F2F4F5;">${r.vencedorCandidato}</b> (${r.vencedorPosicao}º mais votado)</span>` : ""}</span>
          <span style="font-weight:700; font-variant-numeric:tabular-nums; color:${m.venceu ? "#F2F4F5" : "var(--pc-ink-dim)"};">${Math.round(m.media).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      return `
      <details style="border-top:1px solid rgba(242,244,245,.08);">
        <summary style="display:grid; grid-template-columns:auto 1fr auto auto; align-items:center; gap:8px; padding:6px 0; font-size:12px; cursor:pointer; list-style:none;">
          <span style="font-size:9px; font-weight:800; background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4); color:#F2F4F5; border-radius:999px; padding:2px 7px; font-variant-numeric:tabular-nums; white-space:nowrap;">${r.numero}ª</span>
          <span style="min-width:0;">
            <span style="font-weight:700; color:#F2F4F5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block;">${r.vencedorCandidato || "—"}</span>
            <span style="font-size:10.5px; color:#AEB5BB;">${r.vencedorNome}</span>
          </span>
          <span style="font-size:11px; font-weight:700; color:#AEB5BB; font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right;">${Math.round(r.vencedorMedia).toLocaleString("pt-BR")}<span style="display:block; font-weight:400; font-size:9px; color:#5C6268;">média ${v.votos.toLocaleString("pt-BR")} ÷ ${v.cadeiraAtual + 1}</span></span>
          <svg viewBox="0 0 16 16" width="12" height="12" style="color:#5C6268;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </summary>
        <div style="padding:2px 0 10px;">
          <div style="font-size:10px; color:#5C6268; margin:2px 0 6px;">Rodada ${r.numero} — votos ÷ (vagas atuais + 1)</div>
          ${detalheRodada}
        </div>
      </details>`;
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
        <div class="di-opt-tit">Cargos</div>
        <div class="pc-cargo-switch" style="margin-bottom:10px;">
          <button data-pc-imprimir-cargo="estadual">Estadual</button>
          <button data-pc-imprimir-cargo="federal">Federal</button>
          <button data-pc-imprimir-cargo="senador">Senador</button>
          <button data-pc-imprimir-cargo="tudo" class="active">Tudo</button>
        </div>
        <div class="di-opt-tit">Recorte</div>
        <div class="pc-cargo-switch di-opt-wrap" style="margin-bottom:10px;">
          <button data-pc-imprimir-recorte="completa" class="active">Lista completa</button>
          <button data-pc-imprimir-recorte="eleitos">Só os eleitos</button>
          <button data-pc-imprimir-recorte="candidatas">Candidatas</button>
          <button data-pc-imprimir-recorte="partido">Por partido</button>
          <button data-pc-imprimir-recorte="top10">Top 10</button>
        </div>
        <select id="pcImprimirPartido" class="di-opt-select" style="display:none;">${opcoesPartidosImpressao()}</select>
        <div class="di-opt-tit">Ordenação</div>
        <div class="pc-cargo-switch di-opt-wrap" style="margin-bottom:10px;">
          <button data-pc-imprimir-ordem="palpite" class="active">Ordem do palpite</button>
          <button data-pc-imprimir-ordem="crescente">Votos crescente</button>
          <button data-pc-imprimir-ordem="decrescente">Votos decrescente</button>
        </div>
        <div class="di-opt-registrar">
          <div style="min-width:0;">
            <div style="font-size:12px; font-weight:700; color:var(--pc-ink);">Registrar documento</div>
            <div style="font-size:10px; color:var(--pc-ink-dim); line-height:1.4;">Inclui o bloco de registro antes do rodapé: seu nome, a lista, data/hora e linha de assinatura.</div>
          </div>
          <label class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcImprimirRegistrar" checked><span class="pc-switch-slider"></span></label>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" id="pcBtnCancelarImpressao" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnGerarImpressao" style="flex:1;">Gerar documento</button>
        </div>
      </div>

      <div style="margin:18px 0 16px; border-top:1px solid var(--pc-glass-border);"></div>

      ${temInconsistenciaGeral ? `<details class="pc-acc" style="margin:0 0 14px;">
        <summary style="display:flex; align-items:center; gap:7px; font-size:11px; color:var(--pc-ink-dim);">${iconeSvg("alerta", 14)}<b style="color:var(--pc-ink);">Você não precisa zerar todos os avisos pra salvar</b></summary>
        <div class="pc-acc-body" style="font-size:11px; color:var(--pc-ink-dim); line-height:1.5; padding-top:6px;">— dá pra salvar assim mesmo. As vagas de cada cargo são disputadas entre todos os partidos ao mesmo tempo, então corrigir um candidato de cada vez pode não resolver (fechar uma vaga aqui pode abrir um aviso novo em outro partido — é a disputa por sobras funcionando, não um erro). Use a barra e o botão ✦ de cada candidato pendente pra ajustar aos poucos, ou edite os votos direto na caixa.</div>
      </details>` : ""}

      ${secoesHtml}
    </div>
    ${pcState.modalNomeListaAberto ? renderModalNomeLista() : ""}
`;
  if (pcState.modalNomeListaAberto) {
    attachListenersModalNomeLista(renderRevisaoDeposito, async () => {
      // Mesmo gate dos slots da Seleção (achado 5 da revisão 22/08): a
      // Revisão criava lista nova sem checar o limite de 2 grátis nem
      // cobrar o crédito — os dois botões de salvar agora cobram igual.
      const listas = await _carregarMinhasListasNormalizado();
      const abertas = listas.filter((l) => !l.depositadoEm);
      if (abertas.length >= 2) {
        if (!pcState.perfil) {
          pcState.pendenteRegistro = true;
          pcState.tela = "cadastro";
          renderColaborativo();
          return;
        }
        const { consumiu, error } = await consumirCreditoConta(pcState.perfil.id);
        if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
        if (!consumiu) {
          pcState.listaSalvaNome = null;
          await renderRevisaoDeposito();
          const st = document.getElementById("pcDepositoStatus");
          if (st) st.textContent = "Suas 2 listas grátis já estão em uso — sobreponha uma na Seleção, ou convide um amigo pra ganhar créditos.";
          return;
        }
        pcState.perfil.creditos = Math.max(0, (pcState.perfil.creditos || 0) - 1);
      }
      await executarSalvarLista();
    });
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
  // "Aceitar o ajuste" do aviso de matemática real (teste mobile
  // 28/08/2026): troca a marcação — o candidato que a regra elegeria
  // ganha o selo, quem a regra derrubaria perde. Só mexe em marcadoEleito
  // (nunca nos votos); o re-render recalcula tudo a partir da marcação.
  document.querySelectorAll("[data-pc-aceitar-ajuste]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const partes = btn.getAttribute("data-pc-aceitar-ajuste").split("::");
      const cargoId = partes[0], chaveGanha = partes[1], chavePerde = partes[2];
      const lista = pcState.palpitesPorCargo[cargoId];
      if (!lista) return;
      const achar = (chave) => {
        for (const g of lista) {
          const c = g.candidatos.find((cc) => cc.chave === chave);
          if (c) return c;
        }
        return null;
      };
      const ganha = achar(chaveGanha), perde = achar(chavePerde);
      if (!ganha || !perde) return;
      perde.marcadoEleito = false;
      ganha.marcadoEleito = true;
      if (pcState.cargoAtivo === cargoId) pcState.palpiteEdicao = lista;
      agendarAutoSaveRascunho(cargoId, lista);
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
    // Cédula é IMUTÁVEL (achado 5 da revisão 22/08): se a lista ativa foi
    // DEPOSITADA nesse meio tempo (o depósito não zera listaSalvaId), o
    // Salvar da Revisão não pode gravar em cima dela — vira lista nova.
    if (pcState.listaSalvaId) {
      const listas = await _carregarMinhasListasNormalizado();
      const ativa = listas.find((l) => l.id === pcState.listaSalvaId);
      if (ativa && ativa.depositadoEm) {
        pcState.listaSalvaId = null;
        pcState.listaSalvaNome = null;
        await persistirListaAtivaLocal();
      }
    }
    // Primeiro Salvar dessa lista (ainda sem nome) pede o nome antes de
    // gravar qualquer coisa — ver executarSalvarLista pra o que acontece
    // depois de confirmado. Salvamentos seguintes da MESMA lista (já tem
    // nome) não perguntam de novo, só atualizam. O gate de economia (2
    // grátis; crédito/conta além) roda na CONFIRMAÇÃO do nome — cancelar
    // o modal não cobra nada (mesma régua dos slots da Seleção).
    if (!pcState.listaSalvaNome) {
      pcState.modalNomeListaAberto = true;
      renderRevisaoDeposito();
      return;
    }
    await executarSalvarLista();
  });
  document.getElementById("pcBtnImprimir").addEventListener("click", (e) => {
    document.getElementById("pcImprimirPergunta").style.display = "block";
    e.currentTarget.style.display = "none";
  });
  document.getElementById("pcBtnCancelarImpressao").addEventListener("click", () => {
    document.getElementById("pcImprimirPergunta").style.display = "none";
    document.getElementById("pcBtnImprimir").style.display = "";
  });
  // Os 3 grupos de chips (cargos / recorte / ordenação) usam a mesma
  // mecânica de "active" único; o recorte "Por partido" mostra o select.
  ["cargo", "recorte", "ordem"].forEach((grupo) => {
    document.querySelectorAll(`[data-pc-imprimir-${grupo}]:not(:disabled)`).forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(`[data-pc-imprimir-${grupo}]`).forEach((b) => b.classList.toggle("active", b === btn));
        if (grupo === "recorte") {
          document.getElementById("pcImprimirPartido").style.display =
            btn.getAttribute("data-pc-imprimir-recorte") === "partido" ? "block" : "none";
        }
      });
    });
  });
  document.getElementById("pcBtnGerarImpressao").addEventListener("click", () => {
    const cargoEscolhido = document.querySelector("[data-pc-imprimir-cargo].active").getAttribute("data-pc-imprimir-cargo");
    const cargosParaGerar = cargoEscolhido === "tudo" ? CARGOS.map((c) => c.id) : [cargoEscolhido];
    const recorte = document.querySelector("[data-pc-imprimir-recorte].active").getAttribute("data-pc-imprimir-recorte");
    const op = {
      recorte,
      partido: recorte === "partido" ? document.getElementById("pcImprimirPartido").value : null,
      ordenacao: document.querySelector("[data-pc-imprimir-ordem].active").getAttribute("data-pc-imprimir-ordem"),
      registrar: document.getElementById("pcImprimirRegistrar").checked,
    };
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) {
      container = document.createElement("div");
      container.id = "pcImpressaoConteudo";
      document.body.appendChild(container);
    }
    container.innerHTML = montarDocumentoImpresso(cargosParaGerar, op);
    window.print();
  });

  if (reRenderizando) window.scrollTo(0, scrollAnterior);
}

function renderDepositoConfirmado() {
  const conteudo = document.getElementById("pcConteudo");
  const tiles = [
    { icone: "send", label: "Convide os amigos", info: "Gere um link único e envie por WhatsApp ou redes sociais. Cada amigo que entrar pelo seu link e depositar a primeira cédula rende 1 SL pra você, automaticamente." },
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
      <button class="ghost" id="pcBtnVoltarBuscaCedula" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Voltar pra busca</button>
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
  conteudo.innerHTML = telaCarregando("Calculando o Termômetro Eleitoral…");

  if (!pcState.cargoAtivoMedias) pcState.cargoAtivoMedias = "estadual";
  const cargo = pcState.cargoAtivoMedias;
  // Conta-gotas (economia v3 §4, migração 23) — mesmo backend de sempre
  // (+2 linhas/dia, acelerável com SL), só que agora abre de TRÁS pra
  // FRENTE (decisão de 24/08/2026: "vamos abrindo conforme os dias vão
  // passando", o prêmio — quem se elege — é o último a cair). O total
  // continua crescendo do mesmo jeito; só a ponta que ele revela mudou.
  const posEleicao = new Date() > DATA_ELEICAO_2026;
  let linhasReveladas = 2;
  if (pcState.perfil && !posEleicao) {
    const r = await registrarAcessoMediana();
    if (r !== null) linhasReveladas = r;
  }
  const registros = await buscarTodosRascunhosPublicos();
  const { parties, totalPalpites } = calcularMedianaPalpites(registros, cargo, pcState.estado);
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargo);
  const limiteExibicao = cargo === "senador" ? 5 : Math.round(totalVagasCargo * 1.5);
  const projecao = projetarEleitosMediana(parties, cargo, pcState.estado, limiteExibicao);

  // Votação mediana — cadeado SEPARADO, por candidato (pedido do usuário,
  // 23/08/2026: "a aba do candidato apresente a votação mediana... que
  // também fica borrado... e que será cobrado para tirar o borrão").
  // Revelar um candidato aqui (Coringa/avulso/pacote/lista) mostra nome E
  // votos daquele candidato, MESMO que o conta-gotas posicional ainda não
  // tenha chegado nele — é o "furar a fila" que dá graça ao Coringa.
  const chaveCache = `${pcState.estado}::${cargo}`;
  if (!pcState.termometroRevelacoesCache[chaveCache]) {
    const revs = pcState.perfil ? await minhasRevelacoesTermometro(pcState.estado, cargo) : [];
    pcState.termometroRevelacoesCache[chaveCache] = new Set(revs.map((r) => r.chave_candidato));
  }
  const votosRevelados = pcState.termometroRevelacoesCache[chaveCache];

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

  // ===== linha do tempo compacta (protótipo v6/v7, agulha ancorada no
  // dia de hoje — robusta a qualquer largura de tela porque a marca fica
  // posicionada relativa ao PRÓPRIO card de hoje, não a porcentagens do
  // container inteiro, que foi a fonte de 3 rodadas de ajuste fino no
  // protótipo). ==========
  const hojeDt = new Date();
  const diasVizinhos = [-2, -1, 0, 1, 2].map((delta) => {
    const d = new Date(hojeDt); d.setDate(hojeDt.getDate() + delta); return d;
  });
  const faltam = diasAteEleicao();
  const cardDia = (d, cls) => `<div class="pc-cal-d ${cls}"><b>${d.getDate()}</b><span>${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}</span></div>`;
  const linhaTempoHtml = `
    <div class="pc-lt-wrap">
      <div class="pc-cal">
        ${cardDia(diasVizinhos[0], "f2")}
        ${cardDia(diasVizinhos[1], "f1")}
        <div class="pc-cal-d hoje">
          <span class="pc-lt-marca"><span class="pc-lt-falta">${faltam} <span>dias</span></span><span class="pc-lt-ag"><svg width="9" height="6" viewBox="0 0 11 7"><path d="M5.5 7L0 0h11z" fill="currentColor"></path></svg></span></span>
          <b>${hojeDt.getDate()}</b><span>HOJE</span>
        </div>
        ${cardDia(diasVizinhos[3], "f1")}
        ${cardDia(diasVizinhos[4], "f2")}
        <div class="pc-cal-sep">···</div>
        <div class="pc-cal-d alvo"><b>${DATA_ELEICAO_2026.getDate()}</b><span>ELEIÇÃO</span></div>
      </div>
    </div>`;

  const votosOuCadeado = (c) => votosRevelados.has(c.chave)
    ? `<span class="pc-tm-votos">${Number(c.votos || 0).toLocaleString("pt-BR")} <small>votos</small></span>`
    : `<span class="pc-tm-votos-lock">${iconeSvg("cadeadoSlot", 9)}votos</span>`;

  const linha = (c, i) => {
    const nomeRevelado = (i >= projecao.length - linhasReveladas) || votosRevelados.has(c.chave);
    if (!nomeRevelado) {
      return `<div class="pc-lobby-linha" style="filter:blur(4px); opacity:.5; pointer-events:none; user-select:none;" aria-hidden="true">
        <span style="display:flex; align-items:baseline; gap:10px; min-width:0;">
          <span style="width:24px; flex-shrink:0; font-size:11px; font-weight:600; color:var(--pc-ink-dim);">${i + 1}º</span>
          <span style="min-width:0;"><div style="font-size:13px; font-weight:600;">Nome ainda fechado</div><div style="font-size:10.5px; color:var(--pc-ink-dim);">Partido · ${c.amostras} palpites</div></span>
        </span>
        <span style="font-size:12.5px; font-weight:600; color:var(--pc-ink-dim);">••••</span>
      </div>`;
    }
    return `<div class="pc-lobby-linha">
      <span style="display:flex; align-items:baseline; gap:10px; min-width:0;">
        <span style="width:24px; flex-shrink:0; font-size:11px; font-weight:600; color:${c.eleito ? "var(--pc-accent)" : "var(--pc-ink-dim)"};">${i + 1}º</span>
        <span style="min-width:0;">
          <div style="font-size:13px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.nomeUrna || c.nome}${c.eleito ? ` <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#07230C; background:var(--pc-accent); border-radius:999px; padding:1px 6px;">eleito</span>` : ""}</div>
          <div style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}${c.semPalpites ? " · sem palpite ainda" : ` · ${c.amostras} palpite${c.amostras === 1 ? "" : "s"}`}</div>
        </span>
      </span>
      ${votosOuCadeado(c)}
    </div>`;
  };

  // ===== painel "Revelar agora" — Coringa + avulso/pacote/cargo, preço
  // por escopo × prazo (decisão de 24/08/2026). ==========
  const candidatosVotoOculto = projecao.filter((c) => !votosRevelados.has(c.chave));
  const candidatosNomeAberto = projecao.filter((c, i) => (i >= projecao.length - linhasReveladas) && !votosRevelados.has(c.chave));
  const painelPrecos = pcState.perfil && candidatosVotoOculto.length ? `
    <div class="pc-tm-premium">
      <div class="pc-tm-premium-tit">${iconeSvg("credito", 15)} Revelar agora!</div>
      <div class="pc-tm-premium-sub">Não espere os dias passarem. Abre o nome e a <b>votação mediana</b> do candidato.</div>

      <div class="pc-tm-linha-op pc-tm-coringa" id="pcBtnCoringa">
        <span class="pc-tm-op-ic">${iconeSvg("desafio", 15)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Coringa</span><span class="pc-tm-op-d">O sistema sorteia 1 candidato</span></span>
        <span class="pc-tm-op-p" style="color:#E8B04A;">2 SL</span>
      </div>

      ${candidatosNomeAberto.length ? `
      <div class="pc-tm-linha-op" id="pcBtnRevelarAvulso" data-custo7="3" data-custo-def="5">
        <span class="pc-tm-op-ic">${iconeSvg("buscar", 14)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Candidato</span><span class="pc-tm-op-d">Selecione o resultado do seu candidato</span></span>
        <span class="pc-tm-op-p">5 SL</span>
      </div>
      <select class="cell" id="pcSelectCandidatoAvulso" style="width:100%; margin:-4px 0 8px;">
        ${candidatosNomeAberto.map((c) => `<option value="${c.chave}">${c.nomeUrna || c.nome} — ${c.partido}</option>`).join("")}
      </select>` : ""}

      <div class="pc-tm-linha-op" id="pcBtnRevelarPacote" data-custo7="20" data-custo-def="35">
        <span class="pc-tm-op-ic">${iconeSvg("lista", 14)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Pacote de 10</span><span class="pc-tm-op-d">Os próximos 10 ainda fechados</span></span>
        <span class="pc-tm-op-p">35 SL</span>
      </div>
      <div class="pc-tm-linha-op" id="pcBtnRevelarCargo" data-custo7="30" data-custo-def="50">
        <span class="pc-tm-op-ic">${iconeSvg("checkCirculo", 14)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Cargo inteiro</span></span>
        <span class="pc-tm-op-p">50 SL</span>
      </div>

      <div class="pc-tm-dur">
        <span data-pc-dur="7">7 dias</span>
        <span class="on" data-pc-dur="0">definitivo</span>
      </div>
      <div class="pc-status" id="pcTermometroStatus" style="margin-top:6px; min-height:12px;">${pcState.termometroStatus || ""}</div>
    </div>` : "";
  pcState.termometroStatus = "";

  const coringaOverlay = pcState.termometroCoringaResultado ? `
    <div class="pc-tm-coringa-overlay" id="pcTmCoringaOverlay">
      <div class="pc-tm-carta ${pcState.termometroCoringaResultado.raridade}">
        <span class="pc-tm-carta-rar">${pcState.termometroCoringaResultado.raridade}</span>
        <div class="pc-tm-carta-pos">${pcState.termometroCoringaResultado.posicao}º</div>
        <div class="pc-tm-carta-nome">${pcState.termometroCoringaResultado.candidato.nomeUrna || pcState.termometroCoringaResultado.candidato.nome}</div>
        <div class="pc-tm-carta-part">${pcState.termometroCoringaResultado.candidato.partido}</div>
        <div class="pc-tm-carta-votos">${Number(pcState.termometroCoringaResultado.candidato.votos || 0).toLocaleString("pt-BR")}</div>
      </div>
      <button class="primary" id="pcBtnFecharCoringa" style="margin-top:16px;">Fechar</button>
    </div>` : "";

  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Termômetro Eleitoral</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Mediana aparada de ${totalPalpites} palpite${totalPalpites === 1 ? "" : "s"} público${totalPalpites === 1 ? "" : "s"}, pela mesma regra do resultado oficial.</div>
    <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
    <div class="pc-lobby-card" style="padding:10px 12px 11px;">${posEleicao ? "" : linhaTempoHtml}</div>
    <div class="pc-lobby-card" style="padding:14px;">
      ${desenharHemiciclo(seatsProj, totalVagasCargo, { preenchido: "rgba(52,232,74,.14)", vago: "#1B1E22", borda: "var(--pc-ink)", texto: "var(--pc-ink)", porPartido: false })}
    </div>
    <div class="pc-lobby-card">
      ${projecao.length ? projecao.map((c, i) => linha(c, i)).join("") : estadoVazio({ icone: "chart", titulo: "Ninguém preencheu esse cargo", texto: "Assim que alguém depositar uma cédula pública desse cargo, o Termômetro aparece aqui." })}
    </div>
    ${!posEleicao && projecao.length > linhasReveladas ? `
    <div style="margin-top:12px; padding:12px 14px; background:#101214; border:1px solid #23262A; border-radius:10px; font-size:11.5px; color:#8A9096; line-height:1.6;">
      Todo dia abre mais um pedaço — de trás pra frente. Você já abriu <b style="color:#F2F4F5;">${linhasReveladas}</b> de ${projecao.length}.
      <button class="ghost" id="pcBtnAcelerarMediana" style="width:100%; margin-top:10px; font-size:12px; padding:9px;">+10 linhas por 2 SL</button>
      <div class="pc-status" id="pcMedianaStatus" style="margin-top:6px; min-height:12px;">${pcState.medianaStatus || ""}</div>
    </div>` : ""}
    ${painelPrecos}
    ${pcState.perfil ? `<div style="margin-top:12px; text-align:center; font-size:11.5px; color:var(--pc-ink-dim);"><span style="color:var(--pc-accent); font-weight:700; cursor:pointer;" id="pcBtnDesafiarDoTermometro">Lance o seu desafio.</span></div>` : ""}
  `;
  if (coringaOverlay) document.body.insertAdjacentHTML("beforeend", coringaOverlay);

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
        pcState.medianaStatus = "Saldo insuficiente (precisa de 2 SL) — convide um amigo ou desafie alguém pra ganhar mais.";
      } else if (r.erro) {
        pcState.medianaStatus = "Não deu: " + r.erro;
      } else {
        pcState.medianaStatus = "";
        try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (err) {}
      }
      renderQuadroMedias();
    });
  }
  const btnDesafiar = document.getElementById("pcBtnDesafiarDoTermometro");
  if (btnDesafiar) btnDesafiar.addEventListener("click", () => { pcState.subaba = "desafios"; renderAppColaborativo(); });

  // ---- painel de preços: escolha de prazo (chip 7 dias / definitivo) ----
  document.querySelectorAll("[data-pc-dur]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-pc-dur]").forEach((c) => c.classList.toggle("on", c === chip));
      const dias = chip.getAttribute("data-pc-dur");
      document.querySelectorAll("[data-custo7]").forEach((op) => {
        const custo = dias === "7" ? op.getAttribute("data-custo7") : op.getAttribute("data-custo-def");
        const preco = op.querySelector(".pc-tm-op-p");
        if (preco) preco.textContent = custo + " SL";
      });
    });
  });

  const dursAtivo = () => (document.querySelector('[data-pc-dur].on') || {}).getAttribute
    ? document.querySelector('[data-pc-dur].on').getAttribute("data-pc-dur") : "0";

  const btnCoringa = document.getElementById("pcBtnCoringa");
  if (btnCoringa) btnCoringa.addEventListener("click", async () => {
    const sorteio = sortearCoringaTermometro(projecao, votosRevelados);
    const status = document.getElementById("pcTermometroStatus");
    if (!sorteio) { status.textContent = "Já revelou tudo neste cargo!"; return; }
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, [sorteio.candidato.chave], 2, "coringa", null, sorteio.raridade);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    pcState.termometroCoringaResultado = {
      candidato: sorteio.candidato, raridade: sorteio.raridade,
      posicao: projecao.findIndex((c) => c.chave === sorteio.candidato.chave) + 1,
    };
    renderQuadroMedias();
  });
  const overlayFechar = document.getElementById("pcBtnFecharCoringa");
  if (overlayFechar) overlayFechar.addEventListener("click", () => { pcState.termometroCoringaResultado = null; renderQuadroMedias(); });

  const btnAvulso = document.getElementById("pcBtnRevelarAvulso");
  if (btnAvulso) btnAvulso.addEventListener("click", async () => {
    const sel = document.getElementById("pcSelectCandidatoAvulso");
    const dias = dursAtivo();
    const custo = Number(btnAvulso.getAttribute(dias === "7" ? "data-custo7" : "data-custo-def"));
    const status = document.getElementById("pcTermometroStatus");
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, [sel.value], custo, "candidato avulso", dias === "7" ? 7 : null, null);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    renderQuadroMedias();
  });
  const btnPacote = document.getElementById("pcBtnRevelarPacote");
  if (btnPacote) btnPacote.addEventListener("click", async () => {
    const dias = dursAtivo();
    const custo = Number(btnPacote.getAttribute(dias === "7" ? "data-custo7" : "data-custo-def"));
    const status = document.getElementById("pcTermometroStatus");
    const chaves = candidatosVotoOculto.slice(0, 10).map((c) => c.chave);
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, chaves, custo, "pacote de 10", dias === "7" ? 7 : null, null);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    renderQuadroMedias();
  });
  const btnCargo = document.getElementById("pcBtnRevelarCargo");
  if (btnCargo) btnCargo.addEventListener("click", async () => {
    const dias = dursAtivo();
    const custo = Number(btnCargo.getAttribute(dias === "7" ? "data-custo7" : "data-custo-def"));
    const status = document.getElementById("pcTermometroStatus");
    const chaves = candidatosVotoOculto.map((c) => c.chave);
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, chaves, custo, "cargo inteiro", dias === "7" ? 7 : null, null);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    renderQuadroMedias();
  });
}

// Esc fecha a janela sobreposta ativa (pedido do usuário, 21/08/2026 —
// ex.: Disputa das sobras). Uma por vez, na ordem de quem está "por cima";
// depois de limpar o estado, renderColaborativo() redesenha a tela atual.
// As buscas (partido/candidato) tratam o próprio Esc com preventDefault —
// o guard de defaultPrevented evita fechar duas coisas com um Esc só.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  if (typeof pcState === "undefined" || !pcState || !pcState.tela) return;
  const fechar = (mut) => { mut(); renderColaborativo(); };
  if (pcState.disputaSobraAberta) return fechar(() => { pcState.disputaSobraAberta = null; });
  if (pcState.top2022Aberto) return fechar(() => { pcState.top2022Aberto = false; });
  if (pcState.menuMagicoAberto) return fechar(() => { pcState.menuMagicoAberto = null; });
  if (pcState.modalSalvarDestinoAberto) return fechar(() => { pcState.modalSalvarDestinoAberto = false; pcState._destinoSelecionado = null; pcState._destinoNomeDigitado = null; pcState._destinoDesbloqueado = false; pcState._destinoConfirmando = false; });
  if (pcState.modalNomeListaAberto) return fechar(() => { pcState.modalNomeListaAberto = false; });
  if (pcState.modalInstagramInfo) return fechar(() => { pcState.modalInstagramInfo = null; });
  if (pcState.modalDepositarListaId) return fechar(() => { pcState.modalDepositarListaId = null; });
  if (pcState.modalCompartilharListaId) return fechar(() => { pcState.modalCompartilharListaId = null; });
  if (pcState.avisoLimiteVagasAberto) return fechar(() => { pcState.avisoLimiteVagasAberto = false; });
  if (pcState.avisoLimiteCedulaAberto) return fechar(() => { pcState.avisoLimiteCedulaAberto = false; });
});

// Efeito de toque padrão do app inteiro (padrão iOS: encolhe + escurece no
// toque), aprovado 28/08/2026 a partir do protótipo da barra fixa —
// delegado no document (cobre botão renderizado depois também, sem
// precisar reanexar listener em cada tela nova). Duração mínima garantida
// por código (não só :active) porque um clique bem rápido de MOUSE às
// vezes nem chega a pintar o :active — sem isso o efeito falha
// silenciosamente em cliques rápidos (achado do usuário, 28/08/2026).
// Opt-out: botão com data-pc-sem-toque (ex.: puck de arrastar do fader).
(function inicToquePadrao() {
  const DURACAO_MINIMA_TOQUE_MS = 110;
  let desde = 0;
  let alvo = null;
  function soltar() {
    if (!alvo) return;
    const el = alvo;
    alvo = null;
    const falta = Math.max(0, DURACAO_MINIMA_TOQUE_MS - (Date.now() - desde));
    setTimeout(() => el.classList.remove("pc-toque-pressionado"), falta);
  }
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("button:not([data-pc-sem-toque]):not(:disabled)");
    if (!btn) return;
    if (alvo && alvo !== btn) soltar();
    alvo = btn;
    desde = Date.now();
    btn.classList.add("pc-toque-pressionado");
  });
  document.addEventListener("pointerup", soltar);
  document.addEventListener("pointercancel", soltar);
  document.addEventListener("pointerleave", (e) => { if (e.target === alvo) soltar(); }, true);
})();
