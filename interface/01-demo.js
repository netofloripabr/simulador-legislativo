// Modo demonstração (?demo=1) — mesmo cenário real de Santa Catarina
// (partidos, votos, vagas), mas com o elenco trocado por nomes fictícios
// (dados/nomes-ficticios.js), pra gravar material de marketing sem citar
// candidato real (MAQUINA-DE-VENDAS.md §1: "o app pode ter nomes reais, o
// anúncio nunca").
//
// Isolamento do sistema base (pedido explícito do usuário, 08/09/2026):
// este modo NUNCA toca em window.storage/localStorage nem em nenhuma
// chamada de rede — nasce e morre só na memória desta aba, igual olhar o
// app sem sessão nenhuma. Ele reaproveita a tela "selecao-convidado" que
// já existe pra quem não fez login, então herda de graça a mesma trava:
// sem sessão, não há como depositar cédula nem gravar nada no Supabase.
function _demoAtivadoPelaUrl() {
  try { return new URLSearchParams(window.location.search).get("demo") === "1"; }
  catch (e) { return false; }
}
window.SEL_DEMO = _demoAtivadoPelaUrl();

// Sem aviso visível de propósito (pedido do usuário, 08/09/2026): o
// acesso a este modo é por um ambiente separado (link só pra quem grava
// marketing), não pelo app que qualquer visitante vê — não precisa
// avisar quem já sabe que está ali de propósito.

// Monta o palpite dos 3 cargos a partir do elenco real de SC (mesma
// função que qualquer tela usa, REGRA MESTRA do CLAUDE.md: sempre
// origemElencoCargo() via montarEstadoPalpite, nunca o elenco de 2022
// direto) e já aplica o preenchimento automático, pra abrir com uma tela
// pronta pra gravar — sem precisar mexer em nada antes.
async function iniciarModoDemo() {
  pcState.estado = "SC";
  pcState.palpitesPorCargo = {};
  CARGOS.forEach((c) => {
    pcState.cargoAtivo = c.id;
    pcState.palpiteEdicao = montarEstadoPalpite("assembleia", null, null, c.id, "SC");
    balancearTudoSelecao();
    pcState.palpitesPorCargo[c.id] = pcState.palpiteEdicao;
  });
  pcState.cargoAtivo = "estadual";
  pcState.palpiteEdicao = pcState.palpitesPorCargo.estadual;
  pcState.tela = "selecao-convidado";
  renderColaborativo();
}

// Indicador visual de toque, só no modo demonstração (pedido do usuário,
// 12/09/2026) — ajuda a gravar vídeo de marketing mostrando onde está o
// dedo, principalmente durante o arrasto da barra (fader): o efeito de
// clique padrão do app (ver 00-estado.js, ".pulsando") é só um pulso
// rápido em botão, não acompanha o dedo num arrasto contínuo. Este é um
// círculo que nasce onde o ponteiro desce e segue o arrasto até soltar.
// Nunca aparece fora do modo demo (guarda no topo da função).
function _ligarIndicadorToqueDemo() {
  if (!window.SEL_DEMO) return;
  const el = document.createElement("div");
  el.id = "pcDemoToque";
  // Tamanho -25% (46px→35px) e opacidade -50% em todas as camadas (pedido
  // do usuário, 12/09/2026), depois de ver a captura de teste.
  el.style.cssText = "position:fixed; left:0; top:0; width:35px; height:35px; border-radius:50%; background:rgba(52,232,74,.11); border:2px solid rgba(52,232,74,.43); box-shadow:0 0 0 4.5px rgba(52,232,74,.06); pointer-events:none; z-index:99999; transform:translate(-50%,-50%) scale(0); opacity:0; transition:transform .12s ease, opacity .12s ease;";
  document.body.appendChild(el);
  const mover = (x, y) => { el.style.left = x + "px"; el.style.top = y + "px"; };
  document.addEventListener("pointerdown", (e) => {
    mover(e.clientX, e.clientY);
    el.style.opacity = "1";
    el.style.transform = "translate(-50%,-50%) scale(1)";
  });
  document.addEventListener("pointermove", (e) => {
    if (el.style.opacity !== "1") return;
    mover(e.clientX, e.clientY);
  });
  const soltar = () => { el.style.opacity = "0"; el.style.transform = "translate(-50%,-50%) scale(0)"; };
  document.addEventListener("pointerup", soltar);
  document.addEventListener("pointercancel", soltar);
}
_ligarIndicadorToqueDemo();
