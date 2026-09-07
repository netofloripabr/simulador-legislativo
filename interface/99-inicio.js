// SOMENTE o que dispara a app em tempo de carga: parâmetros da URL (?ver/?conv/
// ?duelo), initColaborativo()/renderColaborativo() e os listeners globais de
// teclado/toque. Último arquivo da interface — precisa que todos os anteriores
// já estejam carregados (ordem no index.html).

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
