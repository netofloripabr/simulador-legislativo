// Gabinete · Cotas por exercício (26/10/2026). Para cada ano: um anel por cota (LOA, adicional 0,55%, excesso de receita,
// bancada, convênios e outros), com o valor no centro e a lei de origem; abaixo, barras arredondadas por função divididas
// pela cor da cota. Clicar num anel abre a cota: saldo, barra única com um bloco por indicação e "+ indicar" no espaço livre.
// As cotas vêm do Controle (itens não suprimidos, agrupados por ano e tipo) e das listas cadastradas (gab_listas: valor disponível).
const COTA_T = { AN: ["LOA", "#C9CDD1"], "0,55": ["Adicional 0,55%", "#9AA0A6"], EX: ["Excesso de receita", "#767C82"], BC: ["Bancada regional", "#555B61"], CV: ["Convênios e outros", "#3E4449"] };
const FUN_COR = { "Saúde": "#D7DBDE", "FUNDAM": "#A9AEB3", "Educação": "#80868C", "Agricultura": "#62686E", "Infraestrutura": "#4C5257", "Segurança": "#3A4045", "Social": "#2E3338" };
const tipoCota = (r) => { const s = sigla(r.origem); return s.startsWith("EI - ") ? s.slice(5) : "CV"; };
const funDe = (r) => { const f = FUN_I.find(([re]) => re.test(r.funcao || "") || re.test(r.area || "")); return f ? f[1].replace(/ \(.*\)/, "") : "Outras"; };
function cotasDoAno(ano) {
  const C = {};
  MEU.filter((r) => +r.ano === ano && !supr(r)).forEach((r) => { const t = tipoCota(r), c = C[t] = C[t] || { t, itens: [], leis: new Set() }; c.itens.push({ mun: r.municipio, obj: r.objeto, v: +r.valor || 0, fun: funDe(r) }); if (r.lei) c.leis.add(r.lei.replace(/^Lei nº /, "Lei ")); });
  // listas cadastradas (cota com valor disponível): ano pelo prazo ou pelo apelido (LOA27 → 2027)
  (typeof AD !== "undefined" ? AD.listas : []).forEach((L) => { const g = L.regras || {}, a = +(String(L.apelido || "").match(/(\d{2})$/) || [])[1] + 2000 || (g.prazo ? +String(g.prazo).slice(0, 4) : 0);
    if (a !== ano) return; const t = /excesso/i.test(L.origem || L.apelido) ? "EX" : /0,55|adicional/i.test(L.origem || "") ? "0,55" : "AN";
    const c = C[t] = C[t] || { t, itens: [], leis: new Set() }; c.disp = (c.disp || 0) + (g.disp || 0); c.lista = L; c.prazo = g.prazo; c.leis.add(L.origem || L.apelido);
    AD.itens.filter((x) => x.lista_id === L.id).forEach((x) => c.itens.push({ mun: x.municipio, obj: x.objeto, v: +x.valor || 0, fun: funDe(x), plan: 1 })); });
  return Object.values(C).map((c) => ({ ...c, tot: c.itens.reduce((s, x) => s + x.v, 0), leis: [...c.leis] })).sort((a, b) => Object.keys(COTA_T).indexOf(a.t) - Object.keys(COTA_T).indexOf(b.t));
}
const mi = (v) => v >= 1e6 ? nf(v / 1e6, 1) : nf(v / 1e3, 0);
function anel(c, on) {
  const [nm, cor] = COTA_T[c.t], R = 37, P = 2 * Math.PI * R, fr2 = c.disp ? Math.min(1, c.tot / c.disp) : 1;
  return `<button class="cring${on ? " on" : ""}" data-cota="${c.t}"><svg width="96" height="96" viewBox="0 0 92 92"><circle cx="46" cy="46" r="${R}" fill="none" stroke="#22282B" stroke-width="10"/><circle cx="46" cy="46" r="${R}" fill="none" stroke="${cor}" stroke-width="10" stroke-dasharray="${(P * fr2).toFixed(1)} ${P.toFixed(1)}" transform="rotate(-90 46 46)" stroke-linecap="round"/><text x="46" y="45" text-anchor="middle" fill="#E8EAEB" font-size="15" font-weight="600">${mi(c.tot)}</text><text x="46" y="59" text-anchor="middle" fill="#7D838A" font-size="9.5">${c.disp ? "de " + mi(c.disp) + (c.disp >= 1e6 ? " mi" : " mil") : c.tot >= 1e6 ? "milhões" : "mil"}</text></svg>
    <b>${nm}${c.t === "AN" ? " " + S.cano : ""}</b><small>${esc(c.leis.slice(0, 2).join(" + ") || (c.t === "CV" ? "acordos e convênios" : "sem lei informada"))}${c.disp && c.disp > c.tot ? `<br><em>${fm(c.disp - c.tot)} livres</em>` : ""}</small></button>`;
}
// comparação anual: anos sobrepostos, filtro Total / Por origem / Por área e formato Anéis / Barras / Colunas
function comparacao(anos) {
  const COR = (k, n) => k === n - 1 ? "#34E84A" : ["#2E3338", "#4C5257", "#767C82", "#A9AEB3", "#D7DBDE"][Math.max(0, 4 - (n - 1 - k))];
  const grupos = {}, add = (cat, a, v) => { (grupos[cat] = grupos[cat] || {})[a] = (grupos[cat][a] || 0) + v; };
  anos.forEach((a) => cotasDoAno(a).forEach((c) => c.itens.forEach((x) => add(S.cmod === "ori" ? COTA_T[c.t][0] : S.cmod === "area" ? x.fun : "Total", a, x.v))));
  const cats = Object.entries(grupos).sort((p, q) => Object.values(q[1]).reduce((s, v) => s + v, 0) - Object.values(p[1]).reduce((s, v) => s + v, 0));
  const mx = Math.max(1, ...cats.flatMap(([, o]) => Object.values(o))), n = anos.length, tot = cats.reduce((s, [, o]) => s + Object.values(o).reduce((t, v) => t + v, 0), 0);
  const ordem = (o) => anos.map((a, k) => [a, k]).sort((p, q) => (o[q[0]] || 0) - (o[p[0]] || 0)); // maior atrás, menor na frente
  const tip = (cat, a, v) => `${cat} · ${a}: ${fm(v || 0)}`;
  let g = "";
  if (S.cfmt === "colunas") {
    g = `<div class="ccols">${cats.map(([cat, o]) => `<div class="ccol"><div class="ccb">${ordem(o).map(([a, k]) => `<i style="height:${((o[a] || 0) / mx * 100).toFixed(1)}%;background:${COR(k, n)}" title="${esc(tip(cat, a, o[a]))}"></i>`).join("")}</div><span>${esc(cat)}</span></div>`).join("")}</div>`;
  } else if (S.cfmt === "barras") {
    g = cats.map(([cat, o]) => `<div class="cbh"><span>${esc(cat)}</span><div>${ordem(o).map(([a, k]) => `<i style="width:${((o[a] || 0) / mx * 100).toFixed(1)}%;background:${COR(k, n)}" title="${esc(tip(cat, a, o[a]))}"></i>`).join("")}</div></div>`).join("");
  } else {
    const [cat, o] = cats[0] && S.cmod === "tot" ? cats[0] : [null, null];
    const serie = S.cmod === "tot" ? anos.map((a) => (o || {})[a] || 0) : anos.map((a) => cats.reduce((s, [, oo]) => s + (oo[a] || 0), 0)), m2 = Math.max(1, ...serie);
    g = `<div class="cringcomp"><svg viewBox="0 0 220 220" width="220" height="220">${anos.map((a, k) => { const r = 96 - (n - 1 - k) * (70 / Math.max(1, n - 1)) * (n > 1 ? 1 : 0), P = 2 * Math.PI * r; return `<circle cx="110" cy="110" r="${r}" fill="none" stroke="#1A1F22" stroke-width="11"/><circle cx="110" cy="110" r="${r}" fill="none" stroke="${COR(k, n)}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(P * serie[k] / m2 * .75).toFixed(1)} ${P.toFixed(1)}" transform="rotate(-90 110 110)"><title>${a}: ${fm(serie[k])}</title></circle>`; }).join("")}
      <text x="110" y="112" text-anchor="middle" fill="#E8EAEB" font-size="15" font-weight="700">${fm(tot)}</text><text x="110" y="127" text-anchor="middle" fill="#7D838A" font-size="9.5">${anos[0]}–${anos[n - 1]}</text></svg>
      ${S.cmod !== "tot" ? `<div class="cmini">${cats.map(([cat, oo]) => `<div class="cbh"><span>${esc(cat)}</span><div>${ordem(oo).map(([a, k]) => `<i style="width:${((oo[a] || 0) / mx * 100).toFixed(1)}%;background:${COR(k, n)}" title="${esc(tip(cat, a, oo[a]))}"></i>`).join("")}</div></div>`).join("")}</div>` : ""}</div>`;
  }
  return `<div class="ccomp"><div class="cctl"><div class="cabas">${[["tot", "Total"], ["ori", "Por origem"], ["area", "Por área"]].map(([k, t]) => `<button data-cmod="${k}" class="${S.cmod === k ? "on" : ""}">${t}</button>`).join("")}</div>
    <div class="cabas">${[["aneis", "Anéis"], ["barras", "Barras"], ["colunas", "Colunas"]].map(([k, t]) => `<button data-cfmt="${k}" class="${S.cfmt === k ? "on" : ""}">${t}</button>`).join("")}</div></div>
    ${g}
    <table class="ctab"><tr><th></th>${anos.map((a, k) => `<th><i style="background:${COR(k, n)}"></i>${a}</th>`).join("")}</tr>${cats.map(([cat, o]) => `<tr><td>${esc(cat)}</td>${anos.map((a) => `<td>${o[a] ? fm(o[a]) : "—"}</td>`).join("")}</tr>`).join("")}</table></div>`;
}
function cotas() {
  const anos = [...new Set([...MEU.map((r) => +r.ano).filter(Boolean), ...(typeof AD !== "undefined" ? AD.listas : []).map((L) => +(String(L.apelido || "").match(/(\d{2})$/) || [])[1] + 2000).filter((a) => a > 2000)])].sort();
  if (!anos.length) return `<div class="obra">Sem dados no Controle.</div>`;
  if (!anos.includes(S.cano)) S.cano = anos.includes(new Date().getFullYear()) ? new Date().getFullYear() : anos[anos.length - 1];
  const C = cotasDoAno(S.cano), tot = C.reduce((s, c) => s + c.tot, 0), leis = new Set(C.flatMap((c) => c.leis)).size, sel = C.find((c) => c.t === S.cota);
  const F = {}; C.forEach((c) => c.itens.forEach((x) => { const f = F[x.fun] = F[x.fun] || { v: 0, p: {} }; f.v += x.v; f.p[c.t] = (f.p[c.t] || 0) + x.v; }));
  const fmax = Math.max(1, ...Object.values(F).map((f) => f.v));
  S.cmod = S.cmod || "tot"; S.cfmt = S.cfmt || "aneis";
  return `<div class="cotas">${comparacao(anos)}<div class="clb">Cotas por exercício</div><div class="cabas">${anos.map((a) => `<button data-cano="${a}" class="${a === S.cano ? "on" : ""}">${a}</button>`).join("")}</div>
    <div class="ctot"><b>${fm(tot)}</b><span>indicados em ${S.cano} · ${C.length} cota${C.length > 1 ? "s" : ""} · ${leis} lei${leis === 1 ? "" : "s"}</span></div>
    <div class="crings">${C.map((c) => anel(c, c.t === S.cota)).join("")}</div>
    ${sel ? cotaAberta(sel) : ""}
    <div class="clb">Por função</div>
    ${Object.entries(F).sort((a, b) => b[1].v - a[1].v).map(([f, o]) => `<div class="cfb"><span>${esc(f)}</span><div class="ctr" style="width:${(o.v / fmax * 100).toFixed(1)}%">${C.filter((c) => o.p[c.t]).map((c) => `<i style="flex:${o.p[c.t]};background:${COTA_T[c.t][1]}" title="${COTA_T[c.t][0]}: ${fm(o.p[c.t])}"></i>`).join("")}</div><span class="v">${fm(o.v)}</span></div>`).join("")}
    <div class="cleg">${C.map((c) => `<span><i style="background:${COTA_T[c.t][1]}"></i>${COTA_T[c.t][0]}</span>`).join("")}</div></div>`;
}
function cotaAberta(c) {
  const [nm] = COTA_T[c.t], livre = c.disp ? Math.max(0, c.disp - c.tot) : 0, base = Math.max(c.disp || 0, c.tot) || 1;
  const it = c.itens.slice().sort((a, b) => b.v - a.v), fs = [...new Set(it.map((x) => x.fun))];
  return `<div class="caberta"><div class="ch"><b>${livre ? fm(livre) + " livres" : fm(c.tot)}</b><span>${livre ? "de " + fm(c.disp) + " · " : ""}${nm} ${S.cano} · ${it.length} indicaç${it.length === 1 ? "ão" : "ões"}</span></div>
    <div class="cbar">${it.map((x) => `<i style="flex:${x.v / base};background:${FUN_COR[x.fun] || "#6B7178"}${x.plan ? ";opacity:.6" : ""}" title="${esc(x.mun || "")} · ${esc((x.obj || "").slice(0, 80))} · ${fm(x.v)}"></i>`).join("")}${livre ? `<button class="cfree" style="flex:${livre / base}" data-cind>+ indicar</button>` : ""}</div>
    <div class="cleg">${fs.map((f) => `<span><i style="background:${FUN_COR[f] || "#6B7178"}"></i>${esc(f)}</span>`).join("")}</div>
    <div class="cits">${it.slice(0, S.call ? 999 : 8).map((x) => `<div><i style="background:${FUN_COR[x.fun] || "#6B7178"}"></i><span>${esc(x.mun || "—")} <small>· ${esc((x.obj || "").slice(0, 90))}</small></span><b>${fm(x.v)}</b></div>`).join("")}</div>
    ${it.length > 8 && !S.call ? `<button class="lk" data-call>ver as ${it.length} indicações</button>` : ""}</div>`;
}
function ligarCotas() {
  const w = $("#corpoAba .cotas"); if (!w) return;
  w.querySelectorAll("[data-cmod]").forEach((b) => b.onclick = () => { S.cmod = b.dataset.cmod; desenhar(); });
  w.querySelectorAll("[data-cfmt]").forEach((b) => b.onclick = () => { S.cfmt = b.dataset.cfmt; desenhar(); });
  w.querySelectorAll("[data-cano]").forEach((b) => b.onclick = () => { S.cano = +b.dataset.cano; S.cota = null; S.call = 0; desenhar(); });
  w.querySelectorAll("[data-cota]").forEach((b) => b.onclick = () => { S.cota = S.cota === b.dataset.cota ? null : b.dataset.cota; S.call = 0; desenhar(); });
  const ci = w.querySelector("[data-cind]"); if (ci) ci.onclick = () => { const c = cotasDoAno(S.cano).find((x) => x.t === S.cota); formItem({ lista_id: c && c.lista ? c.lista.id : null }); };
  const ca = w.querySelector("[data-call]"); if (ca) ca.onclick = () => { S.call = 1; desenhar(); };
}
