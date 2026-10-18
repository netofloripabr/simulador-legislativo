// Contador de visitas (migração 63). Cada página aberta chama a RPC
// registrar_visita com: nome da página, um identificador aleatório deste
// navegador (sem dado pessoal) e se há sessão logada. Funciona sem a
// biblioteca do Supabase (fetch direto), então serve também ao painel/.
// Nunca lança erro; o mesmo navegador na mesma página conta 1x a cada 30 min
// (regra no banco). Painel do administrador → Visitas.
(function () {
  try {
    if (/[?&]embed=1/.test(location.search)) return; // painel embutido não conta como página
    var URL_SB = "https://uxqxhvzeptuedyggwguh.supabase.co", CHAVE = "sb_publishable_51xruPXb33u2lkXFuw1jjQ_fK4N-wph";
    var p = location.pathname, pagina = /\/painel\/novos\.html/.test(p) ? "parlamentares" : /\/painel\/mesa\.html/.test(p) ? "mesa" : /\/painel\//.test(p) ? (location.hash === "#ranking" ? "ranking" : "painel") : "app";
    var vis = null, token = null;
    try { vis = localStorage.getItem("sl_visitante"); if (!vis) { vis = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); localStorage.setItem("sl_visitante", vis); } } catch (e) { vis = "sem-armazenamento"; }
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { var s = JSON.parse(localStorage.getItem(k)); token = s && (s.access_token || (s.currentSession && s.currentSession.access_token)); } } } catch (e) {}
    fetch(URL_SB + "/rest/v1/rpc/registrar_visita", { method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", apikey: CHAVE, Authorization: "Bearer " + (token || CHAVE) },
      body: JSON.stringify({ p_pagina: pagina, p_visitante: vis, p_logado: !!token }) }).catch(function () {});
  } catch (e) { /* nunca quebra a página */ }
})();
