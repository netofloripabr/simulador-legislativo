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
