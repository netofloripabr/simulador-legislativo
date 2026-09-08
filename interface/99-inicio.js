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

// Efeito de toque padrão do app inteiro — ver a delegação única em
// interface/00-estado.js (variante "Combo", aprovada 30/08/2026). Existiu
// uma segunda implementação aqui (28/08/2026, classe .pc-toque-pressionado)
// rodando em paralelo com aquela — removida em 08/09/2026 (auditoria: os
// dois sistemas disparavam juntos no mesmo botão, com timings diferentes,
// resultando num efeito duplicado/confuso). Não recriar aqui.
