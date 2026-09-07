// Telemetria mínima de erros de JavaScript no navegador (migração 50).
//
// Se uma tela quebra no celular de alguém, ninguém ficava sabendo. Aqui
// window "error" e "unhandledrejection" viram uma chamada à RPC
// registrar_erro_cliente (anon ou logado), que o painel admin → Erros lista.
//
// Regras: nunca lança erro por conta própria (try/catch em tudo), no
// máximo 10 envios por carregamento de página, ignora "Script error." sem
// informação (erros de outra origem / extensões) e, se supabaseClient
// ainda não existir na hora do erro, guarda numa fila e tenta de novo a
// cada 2 s por até 30 s. Sem dependência de nada que carregue depois.
(function () {
  var LIMITE_POR_PAGINA = 10;
  var enviados = 0;
  var fila = [];
  var tentativas = 0;

  // Versão ?cb= lida do src desta própria tag.
  var versaoCb = null;
  try {
    var tag = document.currentScript || document.querySelector('script[src*="telemetria.js"]');
    var m = tag && /[?&]cb=([^&]+)/.exec(tag.getAttribute("src") || "");
    versaoCb = m ? m[1] : null;
  } catch (e) { /* ignora */ }

  // URL sem parâmetros de convite (conv/duelo carregam código pessoal).
  function urlLimpa() {
    try {
      var u = new URL(window.location.href);
      u.searchParams.delete("conv");
      u.searchParams.delete("duelo");
      return u.toString().slice(0, 500);
    } catch (e) { return null; }
  }

  function telaAtual() {
    try {
      if (typeof pcState !== "undefined" && pcState && pcState.tela) {
        return String(pcState.tela) + "/" + String(pcState.subaba || "");
      }
    } catch (e) { /* ignora */ }
    return null;
  }

  function montar(mensagem, stack, extra) {
    return {
      p_mensagem: String(mensagem || "").slice(0, 2000),
      p_stack: stack ? String(stack).slice(0, 2000) : null,
      p_tela: telaAtual(),
      p_url: urlLimpa(),
      p_versao_cb: versaoCb,
      p_user_agent: (navigator.userAgent || "").slice(0, 300),
      p_extra: extra || null,
    };
  }

  function enviar(registro) {
    try {
      var cli = typeof supabaseClient !== "undefined" ? supabaseClient : null;
      if (!cli) {
        fila.push(registro);
        agendarFila();
        return;
      }
      var p = cli.rpc("registrar_erro_cliente", registro);
      if (p && typeof p.then === "function") p.then(null, function () { /* silencioso */ });
    } catch (e) { /* silencioso */ }
  }

  // Cliente ainda não carregou: reprocessa a fila a cada 2 s, até 15×.
  var timerFila = null;
  function agendarFila() {
    if (timerFila) return;
    timerFila = setTimeout(function () {
      timerFila = null;
      tentativas++;
      if (typeof supabaseClient === "undefined" || !supabaseClient) {
        if (tentativas < 15 && fila.length) agendarFila();
        return;
      }
      var pendentes = fila.splice(0, fila.length);
      for (var i = 0; i < pendentes.length; i++) enviar(pendentes[i]);
    }, 2000);
  }

  function registrar(mensagem, stack, extra) {
    try {
      if (enviados >= LIMITE_POR_PAGINA) return;
      var msg = String(mensagem || "").trim();
      // Sem informação útil: erro de outra origem (CDN/extensão) mascarado.
      if (!msg || msg === "Script error." || msg === "Script error") return;
      enviados++;
      enviar(montar(msg, stack, extra));
    } catch (e) { /* silencioso */ }
  }

  try {
    window.addEventListener("error", function (ev) {
      try {
        // Falha de carregamento de <script>/<img> chega aqui sem .error.
        if (ev && ev.target && ev.target !== window && !ev.error) {
          var src = ev.target.src || ev.target.href || "";
          if (/extension:\/\//.test(src)) return;
          registrar("Falha ao carregar recurso: " + String(src).slice(0, 200), null, { tipo: "recurso" });
          return;
        }
        var err = ev && ev.error;
        var stack = err && err.stack;
        if (/extension:\/\//.test(String(stack || "") + String(ev && ev.filename || ""))) return;
        registrar(
          (err && err.message) || (ev && ev.message) || "Erro desconhecido",
          stack,
          { arquivo: ev && ev.filename ? String(ev.filename).slice(0, 200) : null, linha: ev && ev.lineno || null, coluna: ev && ev.colno || null }
        );
      } catch (e) { /* silencioso */ }
    }, true);

    window.addEventListener("unhandledrejection", function (ev) {
      try {
        var r = ev && ev.reason;
        var msg = r && r.message ? r.message : (typeof r === "string" ? r : (r ? JSON.stringify(r).slice(0, 500) : "Promise rejeitada sem motivo"));
        if (/extension:\/\//.test(String(r && r.stack || ""))) return;
        registrar(msg, r && r.stack, { tipo: "promise" });
      } catch (e) { /* silencioso */ }
    });
  } catch (e) { /* silencioso */ }

  // Exposto pra teste manual no console (telemetriaRegistrarErro("x")).
  window.telemetriaRegistrarErro = registrar;
})();
