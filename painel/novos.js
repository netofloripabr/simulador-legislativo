// Parlamentares — protótipo (10/10/2026). Seleção por rolagem → perfil em seções sanfona.
// Dados: dados/painel (sc-base, sc-estadual); a "Consulta detalhada" embute o Painel (index.html?embed=1).
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x).toLocaleString("pt-BR"), nf = (x, d = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const DV = "20261008a";
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
// cor de destaque por partido (identidade de cada legenda, ajustada para fundo escuro)
const COR_P = { "NOVO": "#F37021", "PL": "#3D7BFF", "PT/PC do B/PV": "#E5383B", "MDB": "#34C759", "UNIÃO/PP": "#2FB5E8", "PSD": "#F2C230", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PDT": "#E5484D", "PSOL/REDE": "#F5B700" };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
const tingir = (cor) => { document.documentElement.style.setProperty("--a", cor); document.documentElement.style.setProperty("--a-rgb", hexRgb(cor)); };
let M, N, CONT, D, VAL, AB = {}, CTX = "regiao";

async function carregar() {
  const [b, d] = await Promise.all([fetch(`../dados/painel/sc-base.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/sc-estadual.json?v=${DV}`).then((r) => r.json())]);
  M = b.mun; N = M.length; CONT = b.contorno; D = d; VAL = d.val.reduce((s, x) => s + x, 0);
}
const eleitos = () => D.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => b.t - a.t);

// ---------------- seleção: roda de nomes ----------------
function telaSelecao(foco) {
  const E = eleitos();
  $("#app").innerHTML = `<div class="roda" id="roda"><ol>${E.map((c) => `<li data-n="${c.n}">${esc(c.u)}</li>`).join("")}</ol></div>
    <div class="rodainfo"><div class="pt" id="spt"></div><button class="btn" id="sabrir">Abrir</button><div class="dica">role para escolher · ${E.length} parlamentares eleitos</div></div>`;
  const rd = $("#roda"), L = [...rd.querySelectorAll("li")];
  let atual = null;
  const marcar = (li) => { if (!li || li === atual) return; atual = li; const k = L.indexOf(li); L.forEach((x, j) => { x.classList.toggle("on", j === k); x.classList.toggle("v1", Math.abs(j - k) === 1); }); const c = D.c.find((x) => x.n === li.dataset.n); $("#spt").textContent = `${c.p} · ${ni(c.t)} votos`; tingir(COR_P[c.p] || "#34E84A"); };
  const centro = () => { const m = rd.getBoundingClientRect().top + rd.clientHeight / 2; marcar(L.reduce((a, b) => Math.abs(b.getBoundingClientRect().top + b.offsetHeight / 2 - m) < Math.abs(a.getBoundingClientRect().top + a.offsetHeight / 2 - m) ? b : a)); };
  rd.addEventListener("scroll", () => requestAnimationFrame(centro), { passive: true });
  rd.onclick = (e) => { const li = e.target.closest("li"); if (!li) return; if (li === atual) return ir(li.dataset.n); li.scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("#sabrir").onclick = () => atual && ir(atual.dataset.n);
  onkeydown = (e) => { if (!$("#roda")) return; if (e.key === "Enter" && atual) ir(atual.dataset.n); if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const k = L.indexOf(atual) + (e.key === "ArrowDown" ? 1 : -1); if (L[k]) L[k].scrollIntoView({ behavior: "smooth", block: "center" }); } };
  const ini = L.find((x) => x.dataset.n === foco) || L[0]; ini.scrollIntoView({ block: "center" }); marcar(ini);
}
const ir = (n) => { history.pushState(null, "", "?d=" + n); perfil(n); };

// ---------------- perfil: seções em sanfona ----------------
function perfil(n) {
  const c = D.c.find((x) => x.n === n); if (!c) return telaSelecao();
  tingir(COR_P[c.p] || "#34E84A");
  const E = eleitos(), pos = E.findIndex((x) => x.n === n) + 1;
  const SEC = [["votos", "Contextos da eleição", "região, legenda, cidade-base, estado"], ["politica", "Estrutura política", "Mesa, comissões, lideranças"], ["calendario", "Calendário do mandato", "posse, Mesa, comissões, sessões e recessos"], ["plenario", "Plenário e processo legislativo", "votação, quórum, prazos, medida provisória"], ["gabinete", "Gabinete", "simulador de nomeações e saldo"], ["estrutura", "Subsídio e estrutura", "subsídio, verbas, escritório regional"]];
  const idx = [...Array(N).keys()], ordM = idx.filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]), i0 = ordM[0];
  const posBase = D.c.map((x) => x.v[i0] || 0).filter((v) => v > c.v[i0]).length + 1, pctMax = Math.max(...idx.map((i) => D.val[i] ? c.v[i] / D.val[i] : 0)), iPct = idx.find((i) => D.val[i] && c.v[i] / D.val[i] === pctMax);
  $("#app").innerHTML = `<section class="hero" id="hero"><div class="luz"></div><canvas id="heroCv"></canvas><div id="etqs"></div>
    <div class="txt"><img class="ftp" src="${foto(n)}" alt=""><div class="olho" style="margin-top:14px">Eleições 2026 · Deputado estadual · ${esc(c.p)}</div><h1>${esc(c.u.split(" ").slice(0, -1).join(" ") || c.u)}<i>${esc(c.u.split(" ").length > 1 ? c.u.split(" ").slice(-1)[0] + "." : "")}</i></h1>
    <div class="pops">${[[ni(c.t), "votos", 1], [`${pos}º`, "entre os 40 eleitos"], [`${nf(c.t / VAL * 100, 2)}%`, "dos válidos"], [`${posBase}º`, "em " + M[i0].n], [`${nf(pctMax * 100)}%`, "em " + M[iPct].n + ", seu maior índice"], [ordM.length, "municípios com voto"]].map(([v, r, a], k) => `<div style="animation-delay:${1.2 + k * .35}s"><b class="${a ? "a" : ""}">${esc(v)}</b><span>${esc(r)}</span></div>`).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:22px"><button class="btn sec" id="trocar">Trocar parlamentar</button></div></div></section>
    <div class="wrap"><iframe class="emb" id="emb" src="index.html?embed=1&cargo=estadual&a=${c.n}&cor=${encodeURIComponent((COR_P[c.p] || "#34E84A").slice(1))}"></iframe><div id="secs"></div><div style="height:60px"></div></div>`;
  $("#trocar").onclick = () => { history.pushState(null, "", location.pathname); telaSelecao(n); };
  heroMapa(c, ordM); secoes(c, SEC);
  const fr = $("#emb"); fr.onload = () => { const ajusta = () => { fr.style.height = fr.contentDocument.documentElement.scrollHeight + "px"; }; ajusta(); new ResizeObserver(ajusta).observe(fr.contentDocument.body); };
}
function secoes(c, SEC) {
  $("#secs").innerHTML = SEC.map(([k, t, i]) => `<button class="sanf${AB[k] ? " on" : ""}" data-sec="${k}"><span>${esc(t)}</span><i>${esc(i)}</i><em>${AB[k] ? "−" : "+"}</em></button>${AB[k] ? `<div class="corpo" id="c-${k}"></div>` : ""}`).join("");
  document.querySelectorAll("[data-sec]").forEach((b) => b.onclick = () => { AB[b.dataset.sec] = !AB[b.dataset.sec]; secoes(c, SEC); });
  if (AB.votos) secVotos(c);
  ["politica", "calendario", "plenario", "gabinete", "estrutura"].forEach((k) => { if (AB[k]) $("#c-" + k).innerHTML = `<div class="breve">Em construção.</div>`; });
}

// "Onde estão seus votos": contextos prontos + consulta detalhada (Painel embutido, fechada por padrão)
function secVotos(c) {
  const idx = [...Array(N).keys()], ordM = idx.filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]), base = M[ordM[0]], reg = base.meso;
  const somaR = (x) => idx.reduce((s, i) => s + (M[i].meso === reg ? x.v[i] || 0 : 0), 0);
  const C = {
    regiao: ["Mais votados na sua região", () => { const L = D.c.map((x) => ({ x, v: somaR(x) })).filter((o) => o.v).sort((a, b) => b.v - a.v), p = L.findIndex((o) => o.x.n === c.n);
      return [`Região ${reg}`, `Você é o ${p + 1}º mais votado da região, com ${ni(L[p].v)} votos (${nf(L[p].v / c.t * 100)}% da sua votação).`, lista(L.slice(0, 10).concat(p >= 10 ? [L[p]] : []), (o) => o.x, (o) => o.v, c, L), mapa(c, (i) => M[i].meso === reg)]; }],
    legenda: ["Ranking da sua legenda", () => { const L = D.c.filter((x) => x.p === c.p).sort((a, b) => b.t - a.t), p = L.findIndex((x) => x.n === c.n), tot = L.reduce((s, x) => s + x.t, 0);
      return [`${c.p} · ${L.length} candidatos`, `${p + 1}º da legenda, com ${nf(c.t / tot * 100)}% dos ${ni(tot)} votos nominais do ${c.p}.`, lista(L.slice(0, 12).map((x) => ({ x, v: x.t })), (o) => o.x, (o) => o.v, c, L.map((x) => ({ x }))), mapa(c, () => true)]; }],
    base: ["Sua cidade-base", () => { const i0 = ordM[0], L = D.c.map((x) => ({ x, v: x.v[i0] || 0 })).filter((o) => o.v).sort((a, b) => b.v - a.v), p = L.findIndex((o) => o.x.n === c.n);
      return [base.n, `${ni(c.v[i0])} votos: ${nf(c.v[i0] / c.t * 100)}% da sua votação e ${nf(c.v[i0] / D.val[i0] * 100)}% dos válidos da cidade — ${p + 1}º lugar em ${base.n}.`, lista(L.slice(0, 10).concat(p >= 10 ? [L[p]] : []), (o) => o.x, (o) => o.v, c, L), mapa(c, (i) => i === i0)]; }],
    cidades: ["Suas cidades", () => [`${ordM.length} municípios com voto`, `As cidades que mais votaram em você. ${nf(ordM.length / N * 100, 0)}% dos municípios de SC.`, lista(ordM.slice(0, 12).map((i) => ({ nm: M[i].n, v: c.v[i] })), null, (o) => o.v, c), mapa(c, () => true)]],
    estado: ["No estado", () => { const p = E0().findIndex((x) => x.n === c.n);
      return ["Santa Catarina · 40 eleitos", `${p + 1}º entre os eleitos, ${nf(c.t / VAL * 100, 2)}% dos votos válidos. ${esc(c.s)}.`, lista(E0().slice(Math.max(0, p - 4), p + 5).map((x) => ({ x, v: x.t })), (o) => o.x, (o) => o.v, c, E0().map((x) => ({ x }))), mapa(c, () => true)]; }],
  };
  const [tit, txt, lst, mp] = C[CTX][1]();
  $("#c-votos").innerHTML = `<div class="ctx">${Object.entries(C).map(([k, [r]]) => `<button class="${k === CTX ? "on" : ""}" data-ctx="${k}">${esc(r)}</button>`).join("")}</div>
    <div class="quadro"><div><div class="olho">${esc(C[CTX][0])}</div><h3>${esc(tit)}</h3><p>${txt}</p>${lst}</div><div>${mp}</div></div>`;
  document.querySelectorAll("[data-ctx]").forEach((b) => b.onclick = () => { CTX = b.dataset.ctx; secVotos(c); });
}
const E0 = () => eleitos();
// lista de ranking com o deputado em destaque (posição real mesmo quando aparece no fim)
function lista(L, cand, val, c, todos) {
  return `<ol class="rank">${L.map((o) => { const x = cand ? cand(o) : null, eu = x && x.n === c.n, p = x && todos ? todos.findIndex((t) => (t.x || t).n === x.n) + 1 : L.indexOf(o) + 1;
    return `<li class="${eu ? "eu" : ""}"><i>${p}º</i><span>${esc(x ? x.u : o.nm)}${x ? ` <small>${esc(x.p)}</small>` : ""}</span><b>${ni(val(o))}</b></li>`; }).join("")}</ol>`;
}
// mapa de SC com bolhas do deputado; destaque = filtro (região, cidade, estado)
function mapa(c, dentro) {
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; CONT.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 640, S = W / ((lo1 - lo0) * K), H = (la0 - la1) * S, P = (lo, la) => [(lo - lo0) * K * S, (la0 - la) * S];
  const pth = (an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("");
  const fundo = CONT.map((an, i) => `<path d="${pth(an)}" fill="${dentro(i) ? "rgba(var(--a-rgb),.12)" : "rgba(242,244,245,.03)"}" stroke="${dentro(i) ? "rgba(var(--a-rgb),.4)" : "rgba(242,244,245,.07)"}" stroke-width=".6"/>`).join("");
  const mx = Math.max(...c.v);
  const bol = [...Array(N).keys()].filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]).map((i) => { const [x, y] = P(M[i].lon, M[i].lat), r = 2 + 22 * Math.sqrt(c.v[i] / mx), on = dentro(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(var(--a-rgb),${on ? .55 : .14})" stroke="${on ? "var(--a)" : "rgba(var(--a-rgb),.3)"}" stroke-width=".8"><title>${esc(M[i].n)}: ${ni(c.v[i])}</title></circle>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}"><defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>${fundo}<g filter="url(#gl)" opacity=".5">${bol}</g>${bol}</svg>`;
}

// capa: mapa de SC com bolhas (tamanho = eleitorado, cor = força do deputado na cor do partido), nascendo uma a uma
let heroRaf = null;
function heroMapa(c, ordM) {
  cancelAnimationFrame(heroRaf);
  const cv = $("#heroCv"), ctx = cv.getContext("2d"), r0 = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = r0.width, h = r0.height;
  cv.width = w * dpr; cv.height = h * dpr;
  const movel = innerWidth < 760, cx = movel ? { x0: 16, y0: 16, x1: w - 16, y1: h - 16 } : { x0: w * .4, y0: h * .06, x1: w * .97, y1: h * .94 };
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; CONT.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), S = Math.min((cx.x1 - cx.x0) / ((lo1 - lo0) * K), (cx.y1 - cx.y0) / (la0 - la1)), ox = cx.x0 + ((cx.x1 - cx.x0) - (lo1 - lo0) * K * S) / 2, oy = cx.y0 + ((cx.y1 - cx.y0) - (la0 - la1) * S) / 2;
  const P = (lo, la) => [ox + (lo - lo0) * K * S, oy + (la0 - la) * S], k = Math.min(w, h) / 560;
  const rgb = hexRgb(getComputedStyle(document.documentElement).getPropertyValue("--a").trim()).split(",").map(Number), ne = [58, 64, 70];
  const pct = M.map((m, i) => D.val[i] ? c.v[i] / D.val[i] : 0), esc95 = [...pct].sort((a, b) => a - b)[Math.floor(N * .95)] || 1;
  const B = M.map((m, i) => { const [x, y] = P(m.lon, m.lat), t = Math.min(1, pct[i] / esc95); return { x, y, r: (1.2 + 26 * Math.sqrt(m.el / 470000)) * k * 1.1, t, nasce: (Math.sin((i + 1) * 12.9898) * 43758.5453 % 1 + 1) % 1 * 2.6 }; });
  const ord = [...B.keys()].sort((a, b) => M[b].el - M[a].el), cont = new Path2D();
  CONT.forEach((an) => an.forEach((r) => { r.forEach(([lo, la], j) => { const [x, y] = P(lo, la); j ? cont.lineTo(x, y) : cont.moveTo(x, y); }); cont.closePath(); }));
  const t0 = performance.now();
  const quadro = (agora) => { const t = (agora - t0) / 1000; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, t / 1.5); ctx.fillStyle = "rgba(242,244,245,.03)"; ctx.fill(cont); ctx.strokeStyle = "rgba(242,244,245,.06)"; ctx.lineWidth = .6; ctx.stroke(cont);
    for (const i of ord) { const b = B[i], e0 = Math.min(1, Math.max(0, (t - b.nasce) / .7)); if (!e0) continue; const e = 1 - Math.pow(1 - e0, 3), col = b.t < .02 ? ne : ne.map((v, q) => Math.round(v + (rgb[q] - v) * Math.min(1, .25 + b.t)));
      ctx.globalAlpha = (.25 + .7 * b.t) * e; ctx.shadowColor = `rgba(${rgb},${.8 * b.t})`; ctx.shadowBlur = 16 * b.t; ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.4 + .6 * e), 0, 6.2832); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    // pulso suave nas cidades mais fortes
    ordM.slice(0, 6).forEach((i, q) => { const b = B[i], v = (Math.sin(t * 1.4 + q) + 1) / 2; if (t < 3) return; ctx.globalAlpha = .25 * v; ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.2 + .5 * v), 0, 6.2832); ctx.fill(); });
    ctx.globalAlpha = 1; heroRaf = requestAnimationFrame(quadro); };
  heroRaf = requestAnimationFrame(quadro);
  // etiquetas pipocando sobre as cidades com mais votos
  const pos0 = [], escolha = []; for (const i of ordM) { const x = Math.min(w - 80, Math.max(80, B[i].x)), y = B[i].y - B[i].r; if (pos0.some(([a, b]) => Math.abs(a - x) < 150 && Math.abs(b - y) < 34)) continue; pos0.push([x, y]); escolha.push([i, x, y]); if (escolha.length === 5) break; }
  $("#etqs").innerHTML = escolha.map(([i, x, y], q) => `<div class="etq" style="left:${x}px;top:${y}px;animation-delay:${2.6 + q * .45}s">${esc(M[i].n)}<b>${ni(c.v[i])}</b></div>`).join("");
  return;
  $("#etqs").innerHTML = ordM.slice(0, 5).map((i, q) => `<div class="etq" style="left:${B[i].x}px;top:${B[i].y - B[i].r}px;animation-delay:${2.6 + q * .45}s">${esc(M[i].n)}<b>${ni(c.v[i])}</b></div>`).join("");
}

(async () => {
  await carregar();
  const d = new URLSearchParams(location.search).get("d");
  d ? perfil(d) : telaSelecao();
  addEventListener("popstate", () => { const x = new URLSearchParams(location.search).get("d"); x ? perfil(x) : telaSelecao(); });
})();
