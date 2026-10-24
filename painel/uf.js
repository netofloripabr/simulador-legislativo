// Estado escolhido nos painéis (16/10/2026): ?uf=sp na URL, senão o escolhido nesta aba
// (sessionStorage), senão SC — toda visita nova começa em SC. Carregado antes de novos.js / painel.js. Também põe o
// seletor de estado na barra superior (#topoSL), logo depois do logo.
(function () {
  var INFO = {
    sc: { nome: "Santa Catarina", sigla: "SC", casa: "ALESC", vagas: 40, lat: 27.5, vao: [-53.6, -27.45, -50.6, -29.4], regTipo: "Associações", regUm: "Associação", refEl: 470000, completo: true },
    sp: { nome: "São Paulo", sigla: "SP", casa: "ALESP", vagas: 94, lat: 22.5, vao: [-53.0, -23.25, -50.1, -25.2], regTipo: "Regiões administrativas", regUm: "Região administrativa", refEl: 3500000, completo: false },
  };
  var q = new URLSearchParams(location.search).get("uf"), uf = (q || "").toLowerCase();
  if (!INFO[uf]) { try { uf = sessionStorage.getItem("sl_uf") || ""; } catch (e) {} }
  if (!INFO[uf]) uf = "sc";
  try { sessionStorage.setItem("sl_uf", uf); } catch (e) {}
  window.UF = uf; window.UFI = INFO[uf]; window.UF_INFO = INFO;
  // seções por município: SC grava tudo num arquivo; SP usa formato compacto (índice "_z" + um arquivo por cargo)
  window.lerSecoes = async function (ano, slug, cargos) {
    var B = "../dados/resultados/" + uf + "-" + ano + "/secoes/" + slug, o = await fetch(B + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); });
    if (!o._z) return o; var Z = o._z, r = { _secoes: {}, _bairroSec: {}, _part: {} };
    Z.forEach(function (z, i) { r._secoes[z] = o._secoes[i]; r._bairroSec[z] = o._bairroSec[i]; });
    Object.keys(o._part).forEach(function (cg) { var a = o._part[cg], m = r._part[cg] = {}; for (var i = 0; i < a.length; i += 7) m[Z[a[i]]] = a.slice(i + 1, i + 7); });
    await Promise.all((cargos || ["estadual"]).map(async function (cg) { try { var c = await fetch(B + "~" + cg + ".json").then(function (x) { return x.json(); }), m = r[cg] = {};
      Object.keys(c).forEach(function (n) { var a = c[n], d = m[n] = {}; for (var i = 0; i < a.length; i += 2) d[Z[a[i]]] = a[i + 1]; }); } catch (e) {} }));
    return r;
  };
  var MESA = /\/mesa\.html/.test(location.pathname);
  function por() {
    var t = document.getElementById("topoSL"), wm = t && t.querySelector(".wm"); if (!wm || t.querySelector(".sl-uf")) return;
    // lista com a sigla (16/10/2026): começa sempre em SC; a escolha vale só nesta aba
    var cur = uf, s = document.createElement("label"); s.className = "sl-uf"; s.title = "Estado";
    s.innerHTML = '<select aria-label="Estado">' + Object.keys(INFO).map(function (k) { return '<option value="' + k + '"' + (k === cur ? " selected" : "") + ">" + INFO[k].sigla + "</option>"; }).join("") + '</select><svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 4l3 3 3-3"/></svg>';
    wm.after(s);
    s.querySelector("select").onchange = function () { var v = this.value; if (v === cur) return; try { sessionStorage.setItem("sl_uf", v); } catch (er) {}
      var u = new URL(location.href); location.href = u.pathname + "?uf=" + v + (/index\.html/.test(u.pathname) ? location.hash : ""); };
  }
  window.slPorUF = por;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", por); else por();
})();
