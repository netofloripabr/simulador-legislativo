// Estado escolhido nos painéis (16/10/2026): ?uf=sp na URL, senão o último escolhido
// neste navegador, senão SC. Carregado antes de novos.js / painel.js. Também põe o
// seletor de estado na barra superior (#topoSL), logo depois do logo.
(function () {
  var INFO = {
    sc: { nome: "Santa Catarina", sigla: "SC", casa: "ALESC", vagas: 40, lat: 27.5, vao: [-53.6, -27.45, -50.6, -29.4], regTipo: "Associações", regUm: "Associação", refEl: 470000, completo: true },
    sp: { nome: "São Paulo", sigla: "SP", casa: "ALESP", vagas: 94, lat: 22.5, vao: [-53.0, -23.25, -50.1, -25.2], regTipo: "Regiões intermediárias (IBGE)", regUm: "Região intermediária", refEl: 3500000, completo: false },
  };
  var q = new URLSearchParams(location.search).get("uf"), uf = (q || "").toLowerCase();
  if (!INFO[uf]) { try { uf = localStorage.getItem("sl_uf") || ""; } catch (e) {} }
  if (!INFO[uf]) uf = "sc";
  try { localStorage.setItem("sl_uf", uf); } catch (e) {}
  window.UF = uf; window.UFI = INFO[uf]; window.UF_INFO = INFO;
  var MESA = /\/mesa\.html/.test(location.pathname);
  function por() {
    var t = document.getElementById("topoSL"), wm = t && t.querySelector(".wm"); if (!wm || t.querySelector(".sl-uf")) return;
    var s = document.createElement("span"); s.className = "sl-uf";
    s.innerHTML = Object.keys(INFO).map(function (k) { return '<button type="button" data-uf="' + k + '" class="' + (k === (MESA ? "sc" : uf) ? "on" : "") + '"' + (MESA && k !== "sc" ? " disabled title=\"Mesa de SP em preparação\"" : "") + ">" + INFO[k].sigla + "</button>"; }).join("");
    wm.after(s);
    s.onclick = function (e) { var b = e.target.closest("button[data-uf]"); if (!b || b.disabled || b.dataset.uf === (MESA ? "sc" : uf)) return; try { localStorage.setItem("sl_uf", b.dataset.uf); } catch (er) {}
      var u = new URL(location.href); u.search = "?uf=" + b.dataset.uf; location.href = u.pathname + u.search + (/index\.html/.test(u.pathname) ? location.hash : ""); };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", por); else por();
})();
