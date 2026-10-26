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
// comparação anual: uma barra horizontal por ano (total indicado), segmentada pela dimensão escolhida; clicar num segmento
// filtra por ele e segmenta pela próxima dimensão (ex.: Saúde → por instrumento → por região)
const DIMS = [["ori", "Origem"], ["area", "Área"], ["instr", "Instrumento"], ["reg", "Região"], ["mun", "Município"]];
const TONS = ["#D7DBDE", "#A9AEB3", "#80868C", "#62686E", "#4C5257", "#3A4045", "#2E3338"];
function linhasComp() {
  const L = MEU.filter((r) => r.ano && !supr(r)).map((r) => ({ ano: +r.ano, v: +r.valor || 0, ori: COTA_T[tipoCota(r)][0], area: funDe(r), instr: instrNome(r.modalidade) || "Não informado", reg: regDe(r) || "Sem região", mun: r.municipio ? frase(r.municipio) : "—" }));
  (typeof AD !== "undefined" ? AD.itens : []).forEach((x) => { const Lr = AD.listas.find((l) => l.id === x.lista_id), a = Lr ? +(String(Lr.apelido || "").match(/(\d{2})$/) || [])[1] + 2000 : 0;
    if (a > 2000) L.push({ ano: a, v: +x.valor || 0, ori: "LOA", area: funDe(x), instr: x.modalidade || "Não informado", reg: regDe(x) || "Sem região", mun: x.municipio ? frase(x.municipio) : "—" }); });
  return L;
}
function comparacao(anos) {
  S.cfil = S.cfil || []; S.cdim = S.cdim || "ori";
  const L = linhasComp().filter((x) => S.cfil.every(([d, v]) => x[d] === v)), dim = S.cdim;
  const porAno = {}, cats = {}; L.forEach((x) => { const o = porAno[x.ano] = porAno[x.ano] || { t: 0, s: {} }; o.t += x.v; o.s[x[dim]] = (o.s[x[dim]] || 0) + x.v; cats[x[dim]] = (cats[x[dim]] || 0) + x.v; });
  const ord = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k]) => k), cor = (k) => TONS[Math.min(ord.indexOf(k), TONS.length - 1)];
  const mx = Math.max(1, ...Object.values(porAno).map((o) => o.t)), tot = L.reduce((s, x) => s + x.v, 0);
  return `<div class="ccomp"><div class="cctl"><div class="cfils"><b>${fm(tot)}</b><span>${anos[0]}–${anos[anos.length - 1]}</span>${S.cfil.map(([d, v], k) => `<button class="cchip" data-tira="${k}">${esc(DIMS.find((x) => x[0] === d)[1])}: ${esc(v)} ×</button>`).join("")}</div>
      <div class="cabas"><span class="cseg">Segmentar por</span>${DIMS.filter(([k]) => !S.cfil.some(([d]) => d === k)).map(([k, t]) => `<button data-cdim="${k}" class="${dim === k ? "on" : ""}">${t}</button>`).join("")}</div></div>
    ${anos.map((a) => { const o = porAno[a] || { t: 0, s: {} }; return `<div class="cano"><span class="ca">${a}</span><div class="cab"><div style="width:${(o.t / mx * 100).toFixed(2)}%">${ord.filter((k) => o.s[k]).map((k) => `<button style="flex:${o.s[k]};background:${cor(k)}" data-seg="${esc(k)}" title="${esc(k)} · ${a}: ${fm(o.s[k])} (${nf(o.s[k] / o.t * 100, 0)}%)">${o.s[k] / mx > .09 ? `<em>${esc(k)}</em>` : ""}</button>`).join("")}</div></div><b class="ct">${o.t ? fm(o.t) : "—"}</b></div>`; }).join("")}
    <div class="cleg2">${ord.slice(0, 12).map((k) => `<button data-seg="${esc(k)}"><i style="background:${cor(k)}"></i>${esc(k)} <small>${fm(cats[k])}</small></button>`).join("")}${ord.length > 12 ? `<span class="cmais">+ ${ord.length - 12}</span>` : ""}</div></div>`;
}
function cotas() {
  const anos = [...new Set([...MEU.map((r) => +r.ano).filter(Boolean), ...(typeof AD !== "undefined" ? AD.listas : []).map((L) => +(String(L.apelido || "").match(/(\d{2})$/) || [])[1] + 2000).filter((a) => a > 2000)])].sort();
  if (!anos.length) return `<div class="obra">Sem dados no Controle.</div>`;
  // cotas por exercício: um cartão por tipo de cota, com a evolução anual em barras arredondadas (mesmo padrão da comparação)
  const POR = {}; anos.forEach((a) => cotasDoAno(a).forEach((c) => { (POR[c.t] = POR[c.t] || {})[a] = c; }));
  const tipos = Object.keys(COTA_T).filter((t) => POR[t]), mx = Math.max(1, ...tipos.flatMap((t) => Object.values(POR[t]).map((c) => Math.max(c.tot, c.disp || 0))));
  const sel = S.cota && S.cano && POR[S.cota] && POR[S.cota][S.cano];
  // gráfico dinâmico: botões por tipo de cota; uma barra por ano (mesmo padrão da comparação), parte livre tracejada
  if (!S.ctipo || !POR[S.ctipo]) S.ctipo = tipos[0];
  const o = POR[S.ctipo], m2 = Math.max(1, ...Object.values(o).map((c) => Math.max(c.tot, c.disp || 0)));
  const graf = `<div class="ccomp"><div class="cctl"><div class="cfils"><b>${fm(Object.values(o).reduce((s, c) => s + c.tot, 0))}</b><span>${anos[0]}–${anos[anos.length - 1]}</span></div>
      <div class="cabas">${tipos.map((t) => `<button data-ctipo="${t}" class="${S.ctipo === t ? "on" : ""}">${COTA_T[t][0]}</button>`).join("")}</div></div>
    ${anos.map((a) => { const c = o[a]; if (!c) return `<div class="cano vz"><span class="ca">${a}</span><div class="cab"></div><b class="ct">—</b></div>`;
      const lv = c.disp ? Math.max(0, c.disp - c.tot) : 0, ant = o[a - 1], d = ant && ant.tot ? c.tot / ant.tot - 1 : null;
      return `<button class="cano cyr2${S.cota === S.ctipo && S.cano === a ? " on" : ""}" data-abre="${S.ctipo}|${a}" title="${esc(c.leis.join(" + "))}"><span class="ca">${a}</span><div class="cab"><div style="width:${(c.tot / m2 * 100).toFixed(2)}%"><i style="flex:1;background:${S.cota === S.ctipo && S.cano === a ? "#F2F4F5" : "#A9AEB3"}"><em>${esc(c.leis[0] || "")}</em></i></div>${lv ? `<s style="width:${(lv / m2 * 100).toFixed(2)}%"></s>` : ""}</div><b class="ct">${fm(c.tot)}${d != null ? `<small class="${d >= 0 ? "up" : "dn"}">${d >= 0 ? "▲" : "▼"} ${nf(Math.abs(d) * 100, 0)}%</small>` : ""}${lv ? `<small class="lv">+ ${fm(lv)} livres</small>` : ""}</b></button>`; }).join("")}</div>`;
  return `<div class="cotas">${comparacao(anos)}<div class="clb">Cotas por exercício</div>${graf}
    ${sel ? cotaAberta(sel) : ""}</div>`;
}
function cotaAberta(c) {
  const [nm] = COTA_T[c.t], livre = c.disp ? Math.max(0, c.disp - c.tot) : 0, base = Math.max(c.disp || 0, c.tot) || 1;
  const it = c.itens.slice().sort((a, b) => a.fun.localeCompare(b.fun) || b.v - a.v), fs = [...new Set(it.map((x) => x.fun))];
  return `<div class="caberta"><div class="ch"><b>${livre ? fm(livre) + " livres" : fm(c.tot)}</b><span>${livre ? "de " + fm(c.disp) + " · " : ""}${nm} ${S.cano} · ${it.length} indicaç${it.length === 1 ? "ão" : "ões"}</span></div>
    ${livre ? `<button class="lk" data-cind>+ indicar (${fm(livre)} livres)</button>` : ""}
    <div class="cits">${it.slice().sort((a, b) => b.v - a.v).slice(0, S.call ? 999 : 8).map((x) => `<div><i style="background:${FUN_COR[x.fun] || "#6B7178"}"></i><span>${esc(x.mun || "—")} <small>· ${esc((x.obj || "").slice(0, 90))}</small></span><b>${fm(x.v)}</b></div>`).join("")}</div>
    ${it.length > 8 && !S.call ? `<button class="lk" data-call>ver as ${it.length} indicações</button>` : ""}</div>`;
}
// redesenha mantendo o quadro parado: guarda a largura de cada barra, redesenha e anima da largura antiga até a nova
function redesenharSuave() {
  const ant = [...document.querySelectorAll(".cotas .cab > div, .cotas .cab > s")].map((e) => e.getBoundingClientRect().width);
  const y = window.scrollY; desenhar(); window.scrollTo(0, y);
  const nov = [...document.querySelectorAll(".cotas .cab > div, .cotas .cab > s")];
  nov.forEach((e, k) => { const alvo = e.style.width; e.style.transition = "none"; e.style.width = (ant[k] != null ? ant[k] : 0) + "px"; e.getBoundingClientRect(); e.style.transition = ""; e.style.width = alvo; });
}
function ligarCotas() {
  const w = $("#corpoAba .cotas"); if (!w) return;
  w.querySelectorAll("[data-cdim]").forEach((b) => b.onclick = () => { S.cdim = b.dataset.cdim; redesenharSuave(); });
  w.querySelectorAll("[data-seg]").forEach((b) => b.onclick = () => { S.cfil.push([S.cdim, b.dataset.seg]); const prox = DIMS.find(([k]) => !S.cfil.some(([d]) => d === k)); S.cdim = prox ? prox[0] : S.cdim; redesenharSuave(); });
  w.querySelectorAll("[data-tira]").forEach((b) => b.onclick = () => { S.cfil = S.cfil.slice(0, +b.dataset.tira); S.cdim = DIMS.find(([k]) => !S.cfil.some(([d]) => d === k))[0]; redesenharSuave(); });
  w.querySelectorAll("[data-ctipo]").forEach((b) => b.onclick = () => { S.ctipo = b.dataset.ctipo; S.cota = null; redesenharSuave(); });
  w.querySelectorAll("[data-abre]").forEach((b) => b.onclick = () => { const [t, a] = b.dataset.abre.split("|"); if (S.cota === t && S.cano === +a) { S.cota = null; } else { S.cota = t; S.cano = +a; } S.call = 0; desenhar(); const ab = $(".caberta"); if (ab) ab.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
  const ci = w.querySelector("[data-cind]"); if (ci) ci.onclick = () => { const c = cotasDoAno(S.cano).find((x) => x.t === S.cota); formItem({ lista_id: c && c.lista ? c.lista.id : null }); };
  const ca = w.querySelector("[data-call]"); if (ca) ca.onclick = () => { S.call = 1; desenhar(); };
}
