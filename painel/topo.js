// Pílula de vidro da barra superior (16/10/2026): fica sob o painel atual e,
// ao clicar em outro, desliza até ele antes de trocar de página — a página
// nova já abre com a pílula no lugar, então a transição é contínua.
(function () {
  var nav = document.querySelector("#topoSL .sl-nav"); if (!nav) return;
  var pill = document.createElement("i"); pill.className = "sl-pill"; nav.prepend(pill);
  var itens = function () { return [].slice.call(nav.querySelectorAll(":scope > a, :scope > button")).filter(function (x) { return !x.hidden; }); };
  var por = function (el, anima) { if (!el) { pill.style.opacity = 0; return; } pill.style.opacity = 1; if (!anima) pill.style.transition = "none";
    pill.style.width = el.offsetWidth + "px"; pill.style.transform = "translateX(" + el.offsetLeft + "px)"; if (!anima) { pill.offsetWidth; pill.style.transition = ""; } };
  var atual = function () { return itens().find(function (x) { return x.classList.contains("on"); }); };
  var aplicar = function () { por(atual(), false); };
  aplicar(); (document.fonts && document.fonts.ready || Promise.resolve()).then(aplicar);
  new MutationObserver(function () { if (!nav.contains(pill)) { nav.prepend(pill); por(atual(), false); return; } por(atual(), true); }).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
  nav.addEventListener("click", function (e) { var a = e.target.closest("a"); if (!a || a.parentElement !== nav || a.classList.contains("on") || e.metaKey || e.ctrlKey) return;
    e.preventDefault(); itens().forEach(function (x) { x.classList.toggle("on", x === a); }); por(a, true); setTimeout(function () { location.href = a.href; }, 300); });
})();
