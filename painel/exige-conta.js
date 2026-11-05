// Exige conta para usar o sistema (05/11/2026, decisão do usuário: "nada fica aberto para quem não entrou").
// Carregado no <head> de todas as páginas do painel, antes de qualquer outro script: sem sessão salva neste
// navegador, guarda o endereço (sl_volta, a tela de entrar volta para ele depois do login) e manda para a tela de
// entrar ou se cadastrar. A sessão é a do supabase-js (chave sb-…-auth-token no localStorage); se ela estiver
// vencida, o próprio supabase-js renova com o refresh token ao abrir a página. Em localhost não trava (testes).
(function () {
  try {
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    var ok = false;
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { var s = JSON.parse(localStorage.getItem(k) || "null"); if (s && (s.refresh_token || (s.currentSession && s.currentSession.refresh_token))) { ok = true; break; } } }
    if (ok) return;
    try { localStorage.setItem("sl_volta", location.href); } catch (e) {}
    document.documentElement.style.visibility = "hidden";
    location.replace(location.pathname.replace(/\/painel\/.*$/, "/") + "?entrar=1");
  } catch (e) { /* sem localStorage: a página segue e cada tela faz a própria checagem */ }
})();
