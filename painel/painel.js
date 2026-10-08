// Painel "Santa Catarina em pontos" (protótipo 07/10/2026).
// 295 pontos (um por município, do tamanho do eleitorado) num canvas; as lentes
// só recalculam a posição de cada ponto e a tela anima entre elas. Qualquer
// candidato de qualquer cargo (A) e, opcional, um segundo (B) para comparar.
// Régua da comparação: mesmo cargo = diferença de votos válidos (pontos %);
// cargos diferentes = fatia do total de cada um vinda da cidade (p.p.).

const $ = (s) => document.querySelector(s);
const nf = (x, c = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const ni = (x) => Math.round(x).toLocaleString("pt-BR");
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CARGOS = [["estadual", "Dep. Estadual"], ["federal", "Dep. Federal"], ["senador", "Senador"], ["governador", "Governador"], ["presidente", "Presidente"]];
const CARGO_LBL = Object.fromEntries(CARGOS);
const COR = { a: [52, 232, 74], a2: [198, 230, 42], b: [232, 67, 42], b2: [184, 29, 18], neutro: [58, 64, 70], fundo: "#14191A", grade: "rgba(242,244,245,.07)", linha: "rgba(242,244,245,.18)", sec: "#8A9096" };

let M, N, CONT;                 // municípios, quantidade, contorno
const DADOS = {};               // por cargo
const st = { lente: "mapa", a: null, b: null, sel: -1, hover: -1 };
let atual = null, eixos = null, anim = null;
const cv = $("#cv"), ctx = cv.getContext("2d");
let W = 0, H = 0, DPR = 1;

async function cargo(c) { if (!DADOS[c]) DADOS[c] = await (await fetch(`../dados/painel/sc-${c}.json`)).json(); return DADOS[c]; }
function cand(ref) { if (!ref) return null; const d = DADOS[ref.cargo]; const c = d.c.find((x) => x.n === ref.n); return c ? { ...c, cargo: ref.cargo, val: d.val, val22: d.val22 } : null; }
const pctMun = (c, i) => c.val[i] ? c.v[i] / c.val[i] * 100 : NaN;
const pct22 = (c, i) => c.v22 && c.val22[i] ? c.v22[i] / c.val22[i] * 100 : NaN;
const fatia = (c, i) => c.t ? c.v[i] / c.t * 100 : 0;
const mesmoCargo = () => st.b && st.a.cargo === st.b.cargo;
// valor que colore/posiciona o ponto
function metrica(i) {
  const A = st.A, B = st.B;
  if (!B) return pctMun(A, i);
  return mesmoCargo() ? pctMun(A, i) - pctMun(B, i) : fatia(A, i) - fatia(B, i);
}
function mix(c1, c2, t) { return c1.map((v, k) => Math.round(v + (c2[k] - v) * t)); }
function corDe(i) {
  const m = metrica(i);
  if (Number.isNaN(m)) return `rgb(${COR.neutro})`;
  if (!st.B) { const t = Math.min(1, m / st.escala); return t < .5 ? `rgb(${mix(COR.neutro, COR.a, t * 2)})` : `rgb(${mix(COR.a, COR.a2, (t - .5) * 2)})`; }
  const t = Math.min(1, .25 + Math.abs(m) / st.escala);
  return `rgb(${mix(COR.neutro, m >= 0 ? COR.a : COR.b, t)})`;
}

// ---------------- dados ----------------
async function carregar() {
  const b = await (await fetch("../dados/painel/sc-base.json")).json();
  M = b.mun; N = M.length; CONT = b.contorno;
  M.forEach((m) => { m.chave = norm(m.n); });
  await Promise.all(CARGOS.map(([c]) => cargo(c)));
  const q = new URLSearchParams(location.search);
  st.a = { cargo: q.get("cargo") || "estadual", n: q.get("a") || DADOS[q.get("cargo") || "estadual"].c[0].n };
  if (q.get("b")) st.b = { cargo: q.get("cargob") || st.a.cargo, n: q.get("b") };
  preparar();
}
function preparar() {
  st.A = cand(st.a); st.B = cand(st.b);
  const vals = [...Array(N).keys()].map(metrica).filter((x) => !Number.isNaN(x)).map(Math.abs).sort((x, y) => x - y);
  st.escala = Math.max(1, vals[Math.floor(vals.length * .95)] || 1);
  st.cores = [...Array(N).keys()].map(corDe);
  st.ordem = [...Array(N).keys()].sort((x, y) => M[y].el - M[x].el);
}

// ---------------- seletor de candidato ----------------
function foto(c) { const p = `../dados/fotos/sc-2026/${c.cargo}/${c.n}.jpg`; return `<img src="${p}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc(c.u[0])}'}))">`; }
function caixaCand(el, lado) {
  const c = lado === "a" ? st.A : st.B;
  el.classList.toggle("vazio", !c);
  el.innerHTML = c ? `<div class="ft">${foto(c)}</div><div class="tx"><div class="nm">${esc(c.u)}</div><div class="pt">${esc(c.p)} · ${CARGO_LBL[c.cargo]} · ${ni(c.t)} votos</div></div>`
    : `<div class="ft"><span>+</span></div><div class="tx"><div class="nm">Comparar com…</div><div class="pt">qualquer candidato de SC</div></div>`;
  el.insertAdjacentHTML("beforeend", `<div class="busca" hidden><input id="q${lado}" placeholder="Nome, partido ou número"><div class="res"></div></div>`);
  const bx = el.querySelector(".busca"), inp = bx.querySelector("input"), res = bx.querySelector(".res");
  const lista = () => {
    const k = norm(inp.value); const out = [];
    if (lado === "b" && st.B) out.push(`<div class="it" data-limpar="1">Sem comparação</div>`);
    for (const [cg] of CARGOS) for (const c of DADOS[cg].c) {
      if (k && !norm(c.u + " " + c.p + " " + c.n).includes(k)) continue;
      out.push(`<div class="it" data-cg="${cg}" data-n="${c.n}"><span>${esc(c.u)} <small>${esc(c.p)}</small></span><small>${CARGO_LBL[cg]} · ${ni(c.t)}</small></div>`);
      if (out.length > 40) break;
    }
    res.innerHTML = out.join("");
  };
  el.onclick = (e) => { if (e.target.closest(".busca")) return; document.querySelectorAll(".busca").forEach((x) => { if (x !== bx) x.hidden = true; }); bx.hidden = !bx.hidden; if (!bx.hidden) { inp.value = ""; lista(); inp.focus(); } };
  inp.oninput = lista;
  res.onclick = (e) => { const it = e.target.closest(".it"); if (!it) return; if (it.dataset.limpar) st.b = null; else st[lado] = { cargo: it.dataset.cg, n: it.dataset.n }; bx.hidden = true; trocouCandidato(); };
}
function trocouCandidato() {
  preparar(); montarSeletores(); montarLentes();
  if (st.lente === "d22" && !st.A.v22) st.lente = "mapa";
  irPara(st.lente); ficha(); frase(); legenda(); placarHero();
  const q = new URLSearchParams({ cargo: st.a.cargo, a: st.a.n }); if (st.b) { q.set("b", st.b.n); q.set("cargob", st.b.cargo); }
  history.replaceState(null, "", "?" + q);
}
function montarSeletores() { caixaCand($("#candA"), "a"); caixaCand($("#candB"), "b"); }

// ---------------- lentes ----------------
const LENTES = [["mapa", "Mapa"], ["forca", "A distribuição"], ["porte", "Cidade grande × pequena"], ["regioes", "Regiões"], ["d22", "2022 → 2026"]];
function montarLentes() {
  $("#lentes").innerHTML = LENTES.map(([k, r]) => `<button data-l="${k}" class="${st.lente === k ? "on" : ""}"${k === "d22" && !(st.A.v22 && (!st.B || st.B.v22)) ? " disabled" : ""}>${r}</button>`).join("");
  $("#lentes").onclick = (e) => { const b = e.target.closest("button[data-l]"); if (!b || b.disabled) return; st.lente = b.dataset.l; montarLentes(); irPara(st.lente); frase(); legenda(); };
}
const lin = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
function area() { const p = W < 560; return { l: p ? 46 : 64, r: W - (p ? 12 : 22), t: 14, b: H - (p ? 34 : 40) }; }
const raio = (i, k = 1) => (1.2 + 26 * Math.sqrt(M[i].el / 470000)) * k;
function eixoY(e, P, ys, dom) {
  const passo = niceStep(dom[1] - dom[0]);
  for (let v = Math.ceil(dom[0] / passo) * passo; v <= dom[1]; v += passo) {
    e.linhas.push([P.l, ys(v), P.r, ys(v), v === 0 && st.B ? COR.linha : COR.grade, v === 0 && st.B ? [4, 4] : null]);
    e.textos.push([P.l - 8, ys(v), rotY(v), "right", st.B ? (v > 0 ? "a" : v < 0 ? "b" : "sec") : "sec"]);
  }
}
function niceStep(r) { const s = r / 5, p = Math.pow(10, Math.floor(Math.log10(s))), n = s / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
function rotY(v) { if (!st.B) return nf(v, 0) + "%"; const u = mesmoCargo() ? "" : " p.p."; return v === 0 ? "empate" : (v > 0 ? "+" : "−") + nf(Math.abs(v), Math.abs(v) < 1 ? 1 : 0) + u; }
function domY() {
  const v = [...Array(N).keys()].map(metrica).filter((x) => !Number.isNaN(x));
  let lo = Math.min(...v), hi = Math.max(...v);
  if (!st.B) { lo = 0; hi = Math.max(1, hi * 1.06); } else { const m = Math.max(Math.abs(lo), Math.abs(hi)) * 1.08; lo = -m; hi = m; }
  return [lo, hi];
}
function layout(nome) {
  const o = { x: new Float32Array(N), y: new Float32Array(N), r: new Float32Array(N), a: new Float32Array(N).fill(1) };
  const e = { linhas: [], textos: [], contorno: null };
  const peq = W < 560;
  if (nome === "mapa") {
    let lon0 = 1e9, lon1 = -1e9, lat0 = -1e9, lat1 = 1e9;
    M.forEach((m) => { lon0 = Math.min(lon0, m.lon); lon1 = Math.max(lon1, m.lon); lat0 = Math.max(lat0, m.lat); lat1 = Math.min(lat1, m.lat); });
    const K = Math.cos(27.5 * Math.PI / 180), pad = 22;
    lon0 -= .15; lon1 += .15; lat0 += .15; lat1 -= .15;
    const S = Math.min((W - 2 * pad) / ((lon1 - lon0) * K), (H - 2 * pad) / (lat0 - lat1));
    const ox = (W - (lon1 - lon0) * K * S) / 2, oy = (H - (lat0 - lat1) * S) / 2;
    const k = Math.min(W, H) / 520;
    for (let i = 0; i < N; i++) { o.x[i] = ox + (M[i].lon - lon0) * K * S; o.y[i] = oy + (lat0 - M[i].lat) * S; o.r[i] = raio(i, k); }
    e.contorno = { lon0, lat0, K, S, ox, oy };
    return { o, e };
  }
  const P = area(), dom = domY(), ys = lin(dom[0], dom[1], P.b, P.t), kR = Math.min(W, H) / 560;
  if (nome === "forca") {
    // histograma de pontos: colunas pela métrica, pontos empilhados
    const nb = peq ? 30 : 46, xs = lin(dom[0], dom[1], P.l + 6, P.r - 6), larg = (P.r - P.l - 12) / nb;
    const bin = (v) => Math.max(0, Math.min(nb - 1, Math.floor((v - dom[0]) / (dom[1] - dom[0]) * nb)));
    const conta = new Int32Array(nb); for (let i = 0; i < N; i++) { const v = metrica(i); if (!Number.isNaN(v)) conta[bin(v)]++; }
    const passo = Math.min(larg, (P.b - P.t - 20) / Math.max(...conta)), nivel = new Int32Array(nb);
    [...Array(N).keys()].sort((x, y) => metrica(x) - metrica(y)).forEach((i) => {
      const v = metrica(i); if (Number.isNaN(v)) { o.a[i] = 0; o.r[i] = 0; return; }
      const b = bin(v); o.x[i] = P.l + 6 + larg * (b + .5); o.y[i] = P.b - passo * (nivel[b]++ + .5); o.r[i] = Math.max(1.4, passo * .46);
    });
    e.linhas.push([P.l, P.b, P.r, P.b, COR.linha]);
    if (st.B) e.linhas.push([xs(0), P.t, xs(0), P.b, COR.linha, [4, 4]]);
    const passoX = niceStep(dom[1] - dom[0]);
    for (let v = Math.ceil(dom[0] / passoX) * passoX; v <= dom[1]; v += passoX) e.textos.push([xs(v), P.b + 16, rotY(v), "center", st.B ? (v > 0 ? "a" : v < 0 ? "b" : "sec") : "sec"]);
    if (st.B) { e.textos.push([xs(dom[0] / 2), P.t + 2, `← ${pn(st.B)} mais forte`, "center", "b", "top"]); e.textos.push([xs(dom[1] / 2), P.t + 2, `${pn(st.A)} mais forte →`, "center", "a", "top"]); }
    return { o, e };
  }
  if (nome === "porte") {
    const xs0 = lin(Math.log(1000), Math.log(480000), P.l + 10, P.r - 10), xs = (v) => xs0(Math.log(Math.max(1000, Math.min(480000, v))));
    eixoY(e, P, ys, dom);
    for (const v of peq ? [3000, 30000, 300000] : [2000, 5000, 20000, 50000, 200000, 400000]) { e.linhas.push([xs(v), P.t, xs(v), P.b, COR.grade]); e.textos.push([xs(v), P.b + 16, v >= 1000 ? ni(v / 1000) + " mil" : ni(v), "center", "sec"]); }
    e.textos.push([P.r, P.b + 30, "Eleitores na cidade (escala log) →", "right", "sec"]);
    for (let i = 0; i < N; i++) { const v = metrica(i); if (Number.isNaN(v)) { o.a[i] = 0; continue; } o.x[i] = xs(M[i].el); o.y[i] = ys(v); o.r[i] = raio(i, kR * .8); o.a[i] = .92; }
    return { o, e };
  }
  if (nome === "regioes") {
    const R = [...new Set(M.map((m) => m.meso))].sort();
    const col = (P.r - P.l) / R.length;
    eixoY(e, P, ys, dom);
    R.forEach((r, j) => { const cx = P.l + col * (j + .5); e.textos.push([cx, P.b + 16, peq ? r.split(" ")[0] : r.replace(" Catarinense", ""), "center", "sec"]); if (j) e.linhas.push([P.l + col * j, P.t, P.l + col * j, P.b, COR.grade]); });
    // enxame simples: espalha na horizontal os pontos que colidem
    const pos = R.map(() => []);
    st.ordem.forEach((i) => {
      const v = metrica(i); if (Number.isNaN(v)) { o.a[i] = 0; return; }
      const j = R.indexOf(M[i].meso), cx = P.l + col * (j + .5), y = ys(v), r = raio(i, kR * .7);
      let dx = 0;
      for (let t = 0; t < 60; t++) { const x = cx + dx; if (!pos[j].some(([px, py, pr]) => (px - x) ** 2 + (py - y) ** 2 < (pr + r + .6) ** 2)) break; dx = dx <= 0 ? -dx + 1.5 : -dx; }
      dx = Math.max(-col * .45, Math.min(col * .45, dx));
      o.x[i] = cx + dx; o.y[i] = y; o.r[i] = r; pos[j].push([o.x[i], y, r]);
    });
    return { o, e };
  }
  if (nome === "d22") {
    // X = 2022, Y = 2026 (só candidato: % válidos; duelo: a mesma régua nos dois anos)
    const m22 = (i) => { const A = st.A, B = st.B; if (!B) return pct22(A, i); return mesmoCargo() ? pct22(A, i) - pct22(B, i) : (A.t22 ? A.v22[i] / A.t22 * 100 : 0) - (B.t22 ? B.v22[i] / B.t22 * 100 : 0); };
    const vs = [...Array(N).keys()].flatMap((i) => [m22(i), metrica(i)]).filter((x) => !Number.isNaN(x));
    let lo = Math.min(...vs), hi = Math.max(...vs); if (!st.B) lo = 0; else { const m = Math.max(-lo, hi); lo = -m; hi = m; } hi *= 1.05;
    const lado = Math.min(P.r - P.l, P.b - P.t), x0 = P.l + (P.r - P.l - lado) / 2, xs = lin(lo, hi, x0, x0 + lado), y2 = lin(lo, hi, P.t + lado, P.t);
    e.linhas.push([xs(lo), y2(lo), xs(hi), y2(hi), COR.linha, [5, 5]]);
    const passo = niceStep(hi - lo);
    for (let v = Math.ceil(lo / passo) * passo; v <= hi; v += passo) { e.linhas.push([xs(v), P.t, xs(v), P.t + lado, COR.grade]); e.linhas.push([x0, y2(v), x0 + lado, y2(v), COR.grade]); e.textos.push([xs(v), P.t + lado + 14, rotY(v), "center", "sec"]); e.textos.push([x0 - 6, y2(v), rotY(v), "right", "sec"]); }
    e.textos.push([x0 + lado, P.t + lado + 30, "2022 →", "right", "sec"]); e.textos.push([x0 + 4, P.t + 2, "↑ 2026", "left", "sec", "top"]);
    e.textos.push([xs(lo + (hi - lo) * .28), y2(lo + (hi - lo) * .86), "acima da linha: cresceu", "center", "a"]);
    for (let i = 0; i < N; i++) { const x = m22(i), y = metrica(i); if (Number.isNaN(x) || Number.isNaN(y)) { o.a[i] = 0; continue; } o.x[i] = xs(x); o.y[i] = y2(y); o.r[i] = raio(i, kR * .75); o.a[i] = .92; }
    return { o, e };
  }
}
const pn = (c) => c.u.replace(/^A /, "").split(" ")[0];

// ---------------- desenho ----------------
const base = document.createElement("canvas"), brilho = document.createElement("canvas");
function medir() {
  const r = cv.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1);
  W = Math.round(r.width); H = Math.round(r.height);
  for (const c of [cv, base, brilho]) { c.width = W * DPR; c.height = H * DPR; }
}
function contorno(c, z, a) {
  if (!z) return; c.save(); c.globalAlpha = a;
  const p = new Path2D();
  for (const aneis of CONT) for (const an of aneis) { an.forEach(([lon, lat], j) => { const x = z.ox + (lon - z.lon0) * z.K * z.S, y = z.oy + (z.lat0 - lat) * z.S; j ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); }
  c.fillStyle = "rgba(242,244,245,.025)"; c.fill(p); c.strokeStyle = "rgba(242,244,245,.07)"; c.lineWidth = .6; c.stroke(p); c.restore();
}
function desenharEixos(c, e, a) {
  if (!e) return; contorno(c, e.contorno, a);
  c.save(); c.globalAlpha = a;
  for (const [x1, y1, x2, y2, cor, tr] of e.linhas) { c.strokeStyle = cor; c.lineWidth = 1; c.setLineDash(tr || []); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  c.setLineDash([]); c.font = `500 ${W < 560 ? 10 : 11.5}px Inter, system-ui`;
  for (const [x, y, s, al, cor, bl] of e.textos) { c.textAlign = al; c.textBaseline = bl || "middle"; c.fillStyle = cor === "a" ? "#7CF58A" : cor === "b" ? "#FF8A75" : COR.sec; c.fillText(s, x, y); }
  c.restore();
}
function quadro(p, ea, eb, t) {
  const c = base.getContext("2d"); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.clearRect(0, 0, W, H);
  if (ea && t < 1) desenharEixos(c, ea, 1 - t);
  desenharEixos(c, eb, t);
  // pontos; cópia desfocada por baixo = brilho (efeito de luz da referência)
  const pts = document.createElement("canvas"); pts.width = base.width; pts.height = base.height;
  const cp = pts.getContext("2d"); cp.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (const i of st.ordem) { if (p.r[i] <= 0 || p.a[i] <= 0) continue; cp.globalAlpha = p.a[i] * .9; cp.fillStyle = st.cores[i]; cp.beginPath(); cp.arc(p.x[i], p.y[i], p.r[i], 0, 6.2832); cp.fill(); }
  const cb = brilho.getContext("2d"); cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, brilho.width, brilho.height);
  cb.filter = `blur(${8 * DPR}px)`; cb.drawImage(pts, 0, 0); cb.filter = "none";
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = .55; c.globalCompositeOperation = "lighter"; c.drawImage(brilho, 0, 0);
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.drawImage(pts, 0, 0);
  sobrepor();
}
function sobrepor() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const p = atual; if (!p) return;
  for (const [i, forte] of [[st.hover, false], [st.sel, true]]) {
    if (i < 0 || p.a[i] <= 0) continue;
    const r = Math.max(4, p.r[i]);
    ctx.lineWidth = forte ? 2.2 : 1.4; ctx.strokeStyle = forte ? "#fff" : "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.arc(p.x[i], p.y[i], r, 0, 6.2832); ctx.stroke();
    if (forte) { ctx.beginPath(); ctx.arc(p.x[i], p.y[i], r + 5, 0, 6.2832); ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1; ctx.stroke(); }
    rotulo(M[i].n, p.x[i], p.y[i], r + 8, forte);
  }
}
function rotulo(s, x, y, dy, forte) {
  ctx.font = "700 12.5px Inter, system-ui"; const w = ctx.measureText(s).width + 14, h = 22;
  let bx = Math.max(4, Math.min(W - w - 4, x - w / 2)), by = y - dy - h; if (by < 4) by = y + dy;
  ctx.fillStyle = forte ? "rgba(242,244,245,.96)" : "rgba(242,244,245,.82)"; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 6); ctx.fill();
  ctx.fillStyle = "#0B0F0D"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(s, bx + 7, by + h / 2 + 1);
}
const clonar = (o) => ({ x: o.x.slice(), y: o.y.slice(), r: o.r.slice(), a: o.a.slice() });
function irPara(nome) {
  const { o, e } = layout(nome); const eAnt = eixos; eixos = e;
  if (!atual || reduzido) { atual = clonar(o); quadro(atual, null, e, 1); return; }
  const de = clonar(atual), t0 = performance.now(), dur = 900;
  cancelAnimationFrame(anim);
  // cada ponto sai com um pequeno atraso (pela posição de origem) — a nuvem "escorre" em vez de pular
  const atraso = new Float32Array(N); for (let i = 0; i < N; i++) atraso[i] = (de.x[i] / Math.max(1, W)) * .25;
  const passo = (agora) => {
    const T = (agora - t0) / dur; let vivo = false;
    for (let i = 0; i < N; i++) {
      let t = Math.max(0, Math.min(1, (T - atraso[i]) / .75)); if (t < 1) vivo = true;
      const k = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      atual.x[i] = de.x[i] + (o.x[i] - de.x[i]) * k; atual.y[i] = de.y[i] + (o.y[i] - de.y[i]) * k;
      atual.r[i] = de.r[i] + (o.r[i] - de.r[i]) * k; atual.a[i] = de.a[i] + (o.a[i] - de.a[i]) * k;
    }
    quadro(atual, eAnt, e, Math.min(1, T));
    if (vivo) anim = requestAnimationFrame(passo);
  };
  anim = requestAnimationFrame(passo);
}

// ---------------- textos ----------------
function frase() {
  const A = st.A, B = st.B, idx = [...Array(N).keys()];
  const top = (f) => idx.filter((i) => !Number.isNaN(f(i))).sort((x, y) => f(y) - f(x));
  let s = "";
  if (!B) {
    const t = top((i) => pctMun(A, i)), forte = t.slice(0, 3).map((i) => M[i].n).join(", ");
    const acima = idx.filter((i) => pctMun(A, i) > A.t / A.val.reduce((x, y) => x + y, 0) * 100).length;
    s = { mapa: `Cada ponto é um município, do tamanho do eleitorado. Quanto mais aceso, maior a fatia de <b>${esc(A.u)}</b>. Mais forte em <b>${forte}</b>.`,
      forca: `Quantas cidades deram cada fatia de votos a <b>${esc(A.u)}</b>. Em <b>${acima}</b> das ${N} cidades ele(a) ficou acima da própria média estadual.`,
      porte: `Cidade pequena à esquerda, grande à direita. Mostra se <b>${esc(A.u)}</b> depende das cidades grandes ou do interior.`,
      regioes: `Cada coluna é uma mesorregião do IBGE; cada ponto, uma cidade dela, na altura da fatia de votos.`,
      d22: `Acima da linha tracejada, a cidade deu mais a <b>${esc(A.u)}</b> em 2026 do que em 2022: <b>${idx.filter((i) => pctMun(A, i) > pct22(A, i)).length}</b> cidades.` }[st.lente];
  } else {
    const va = idx.filter((i) => metrica(i) > 0).length, vb = idx.filter((i) => metrica(i) < 0).length;
    const regua = mesmoCargo() ? "diferença em pontos dos votos válidos" : "cargos diferentes: comparamos o peso de cada cidade no total de cada um";
    s = { mapa: `Verde, <b>${esc(A.u)}</b> mais forte; vermelho, <b>${esc(B.u)}</b>. ${va} × ${vb} cidades. <span style="color:#6B7178">(${regua})</span>`,
      forca: `A divisão: <b>${va}</b> cidades pendem para ${esc(pn(A))} e <b>${vb}</b> para ${esc(pn(B))}.`,
      porte: `Quem leva as cidades grandes e quem leva o interior.`,
      regioes: `A disputa região por região: acima da linha tracejada, ${esc(pn(A))}; abaixo, ${esc(pn(B))}.`,
      d22: `O mesmo duelo em 2022 (horizontal) e em 2026 (vertical).` }[st.lente];
  }
  $("#frase").innerHTML = s;
}
function legenda() {
  const g = st.B ? `linear-gradient(90deg,rgb(${COR.b}),rgb(${COR.neutro}),rgb(${COR.a}))` : `linear-gradient(90deg,rgb(${COR.neutro}),rgb(${COR.a}),rgb(${COR.a2}))`;
  $("#leg").innerHTML = st.B ? `<span>${esc(pn(st.B))}</span><i class="grad" style="background:${g}"></i><span>${esc(pn(st.A))}</span><span style="margin-left:auto">tamanho = eleitorado</span>`
    : `<span>menos</span><i class="grad" style="background:${g}"></i><span>mais votos</span><span style="margin-left:auto">tamanho = eleitorado</span>`;
}
function placarHero() {
  const A = st.A, B = st.B;
  $("#heroOlho").textContent = `Eleições 2026 · ${CARGO_LBL[A.cargo]} · Santa Catarina`;
  $("#heroPlacar").innerHTML = `<div><b>${ni(A.t)}</b><span>${esc(A.u)}</span></div>` + (B ? `<div><b style="color:var(--b)">${ni(B.t)}</b><span>${esc(B.u)}</span></div>` : `<div><b>${nf(A.t / A.val.reduce((x, y) => x + y, 0) * 100)}%</b><span>dos válidos</span></div>`) + `<div><b>${N}</b><span>municípios</span></div>`;
}

// ---------------- ficha ----------------
function ficha() {
  const el = $("#ficha"), A = st.A, B = st.B, i = st.sel;
  if (i < 0) {
    const t = [...Array(N).keys()].sort((x, y) => (B ? metrica(y) - metrica(x) : A.v[y] - A.v[x]));
    el.innerHTML = `<h2>${B ? `${esc(pn(A))} × ${esc(pn(B))}` : esc(A.u)}</h2><div class="onde">${B ? `${CARGO_LBL[A.cargo]} × ${CARGO_LBL[B.cargo]}` : `${esc(A.p)} · ${CARGO_LBL[A.cargo]} · ${esc(A.s || "")}`}</div>
      ${B ? barra(A.t, B.t, A.t + B.t, "no estado") : ""}
      <h3>${B ? `Onde ${esc(pn(A))} vai melhor` : "Cidades com mais votos"}</h3><div class="top"><ol>${t.slice(0, 6).map((j) => `<li><span>${esc(M[j].n)}</span><b>${B ? rotY(metrica(j)) : ni(A.v[j])}</b></li>`).join("")}</ol></div>
      ${B ? `<h3>Onde ${esc(pn(B))} vai melhor</h3><div class="top"><ol>${t.slice(-6).reverse().map((j) => `<li><span>${esc(M[j].n)}</span><b style="color:#FF8A75">${rotY(metrica(j))}</b></li>`).join("")}</ol></div>` : ""}
      <p class="dica" style="margin-top:14px">Toque num ponto para ver a cidade.</p>`;
    animarBarra(el); return;
  }
  const m = M[i], cg = DADOS[A.cargo];
  const rank = cg.c.map((c) => [c, c.v[i]]).sort((x, y) => y[1] - x[1]);
  const pos = rank.findIndex(([c]) => c.n === A.n) + 1;
  const p22 = pct22(A, i), p26 = pctMun(A, i);
  el.innerHTML = `<h2>${esc(m.n)}</h2><div class="onde">${esc(m.meso)} · ${esc(m.assoc)} · ${ni(m.el)} eleitores <button class="dica" style="background:none;border:0;cursor:pointer;color:var(--sec);float:right" id="fFechar">✕</button></div>
    ${B ? barra(A.v[i], B.v[i], A.v[i] + B.v[i], "na cidade") : `<div class="fn"><div class="a"><b>${ni(A.v[i])}</b><small>votos · ${nf(p26)}% dos válidos</small></div></div>`}
    <h3>${esc(A.u)} na cidade</h3><div class="kv"><span>Posição entre ${cg.c.length} candidatos</span><b>${pos}º</b>
      <span>Fatia dos votos da cidade</span><b>${nf(p26)}%</b><i>média dele(a) no estado: ${nf(A.t / A.val.reduce((x, y) => x + y, 0) * 100)}%</i>
      <span>Peso no total dele(a)</span><b>${nf(fatia(A, i), 2)}%</b>
      ${A.v22 ? `<span>2022</span><b>${ni(A.v22[i])} · ${nf(p22)}%</b><i>${p26 >= p22 ? "cresceu" : "caiu"} ${nf(Math.abs(p26 - p22))} pontos</i>` : ""}</div>
    <h3>Mais votados na cidade · ${CARGO_LBL[A.cargo]}</h3><div class="top"><ol>${rank.slice(0, 5).map(([c, v], k) => `<li class="${c.n === A.n ? "eu" : B && c.n === B.n && B.cargo === A.cargo ? "eu2" : ""}"><span>${k + 1}º ${esc(c.u)} <small style="color:var(--ter)">${esc(c.p)}</small></span><b>${ni(v)}</b></li>`).join("")}</ol></div>
    <p style="margin-top:14px"><a href="../?painel=${A.n}&cargo=${A.cargo}" style="color:var(--a);font-weight:700;font-size:13px;text-decoration:none">Abrir bairros e locais de votação no app →</a></p>`;
  $("#fFechar").onclick = () => { st.sel = -1; ficha(); sobrepor(); };
  animarBarra(el);
}
function barra(a, b, tot, onde) {
  const pa = tot ? a / tot * 100 : 50;
  return `<div class="fb"><i class="a" data-w="${pa}"></i><i class="b" data-w="${100 - pa}"></i></div><div class="fn"><div class="a"><b>${ni(a)}</b><small>${esc(pn(st.A))} · ${nf(pa)}%</small></div><div class="b"><b>${ni(b)}</b><small>${esc(pn(st.B))} · ${nf(100 - pa)}%</small></div></div><div class="dica" style="text-align:center;margin-top:4px">votos ${onde}</div>`;
}
function animarBarra(el) { el.querySelectorAll(".fb i").forEach((b) => { b.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = b.dataset.w + "%"; })); }); }

// ---------------- interação ----------------
function perto(ev) {
  const r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top; let best = -1, bd = 1e9;
  for (let i = 0; i < N; i++) { if (atual.a[i] <= .2) continue; const d = (atual.x[i] - x) ** 2 + (atual.y[i] - y) ** 2, lim = Math.max(10, atual.r[i] + 4) ** 2; if (d < lim && d < bd) { bd = d; best = i; } }
  return best;
}
cv.addEventListener("mousemove", (e) => { const h = perto(e); if (h !== st.hover) { st.hover = h; sobrepor(); } });
cv.addEventListener("mouseleave", () => { st.hover = -1; sobrepor(); });
cv.addEventListener("click", (e) => { st.sel = perto(e); ficha(); sobrepor(); });
document.addEventListener("click", (e) => { if (!e.target.closest(".cand")) document.querySelectorAll(".busca").forEach((x) => { x.hidden = true; }); });
$("#irPainel").onclick = () => $("#painel").scrollIntoView({ behavior: "smooth" });
let esp; addEventListener("resize", () => { clearTimeout(esp); esp = setTimeout(() => { medir(); atual = null; irPara(st.lente); hero.medir(); }, 120); });

// ---------------- abertura: pontos nascendo, brilho, cintilação, reflexo e parallax ----------------
const hero = (() => {
  const cvH = $("#heroCv"), cH = cvH.getContext("2d"), camada = document.createElement("canvas"), blur = document.createElement("canvas");
  let w, h, dpr, bx, by, br, nasc, cint = [], t0 = 0, nascido = false, rodando = false;
  const NASCER = 4.5, CRESCER = .7;
  function medir() {
    const r = cvH.getBoundingClientRect(); dpr = Math.min(innerWidth < 760 ? 1.5 : 2, devicePixelRatio || 1); w = r.width; h = r.height;
    for (const c of [cvH, camada, blur]) { c.width = w * dpr; c.height = h * dpr; }
    const movel = innerWidth < 760, cx = movel ? { x0: 10, y0: 70, x1: w - 10, y1: h * .5 } : { x0: w * .4, y0: h * .06, x1: w * .98, y1: h * .94 };
    let lon0 = 1e9, lon1 = -1e9, lat0 = -1e9, lat1 = 1e9; M.forEach((m) => { lon0 = Math.min(lon0, m.lon); lon1 = Math.max(lon1, m.lon); lat0 = Math.max(lat0, m.lat); lat1 = Math.min(lat1, m.lat); });
    const K = Math.cos(27.5 * Math.PI / 180), S = Math.min((cx.x1 - cx.x0) / ((lon1 - lon0) * K), (cx.y1 - cx.y0) / (lat0 - lat1));
    const ox = cx.x0 + ((cx.x1 - cx.x0) - (lon1 - lon0) * K * S) / 2, oy = cx.y0 + ((cx.y1 - cx.y0) - (lat0 - lat1) * S) / 2, k = Math.min(w, h) / 560;
    bx = M.map((m) => ox + (m.lon - lon0) * K * S); by = M.map((m) => oy + (lat0 - m.lat) * S); br = M.map((m, i) => raio(i, k * 1.1));
    hero.z = { ox, oy, S, K, lon0, lat0, w: (lon1 - lon0) * K * S, h: (lat0 - lat1) * S };
    if (nascido) pintar(1e9);
  }
  function pintar(t) {
    const c = camada.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const z = hero.z, p = new Path2D();
    for (const aneis of CONT) for (const an of aneis) { an.forEach(([lon, lat], j) => { const x = z.ox + (lon - z.lon0) * z.K * z.S, y = z.oy + (z.lat0 - lat) * z.S; j ? p.lineTo(x, y) : p.moveTo(x, y); }); p.closePath(); }
    c.globalAlpha = Math.min(1, t / 2); c.fillStyle = "rgba(242,244,245,.03)"; c.fill(p); c.strokeStyle = "rgba(242,244,245,.06)"; c.lineWidth = .6; c.stroke(p);
    for (const i of st.ordem) { const n = Math.min(1, Math.max(0, (t - nasc[i]) / CRESCER)); if (n <= 0) continue; const e = 1 - Math.pow(1 - n, 3);
      c.globalAlpha = .9 * e; c.fillStyle = st.cores[i]; c.beginPath(); c.arc(bx[i], by[i], br[i] * (.4 + .6 * e), 0, 6.2832); c.fill(); }
    c.globalAlpha = 1;
    const b = blur.getContext("2d"); b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, blur.width, blur.height); b.filter = `blur(${10 * dpr}px)`; b.drawImage(camada, 0, 0); b.filter = "none";
  }
  function quadro(agora) {
    const t = (agora - t0) / 1000; cH.setTransform(1, 0, 0, 1, 0, 0); cH.clearRect(0, 0, cvH.width, cvH.height);
    cH.globalAlpha = .6; cH.globalCompositeOperation = "lighter"; cH.drawImage(blur, 0, 0); cH.globalCompositeOperation = "source-over"; cH.globalAlpha = 1; cH.drawImage(camada, 0, 0);
    if (nascido) { cH.setTransform(dpr, 0, 0, dpr, 0, 0); cH.globalCompositeOperation = "lighter";
      for (const q of cint) { const v = (Math.sin(t / q.per * 6.283 + q.fase) + 1) / 2, a = v * v * .5; if (a < .03) continue; cH.globalAlpha = a; cH.fillStyle = "rgb(198,230,42)"; cH.beginPath(); cH.arc(bx[q.i], by[q.i], br[q.i] * (1 + .35 * v), 0, 6.2832); cH.fill(); }
      cH.globalAlpha = 1; cH.globalCompositeOperation = "source-over"; }
    const z = hero.z, fase = (t / 12) % 1, lx = (z.ox - z.w * .4 + fase * z.w * 1.8) * dpr, ly = (z.oy + z.h * (.2 + .6 * fase)) * dpr, R = z.w * .55 * dpr;
    cH.setTransform(1, 0, 0, 1, 0, 0); const g = cH.createRadialGradient(lx, ly, 0, lx, ly, R); g.addColorStop(0, "rgba(255,255,255,.26)"); g.addColorStop(1, "rgba(255,255,255,0)");
    cH.globalCompositeOperation = "source-atop"; cH.fillStyle = g; cH.fillRect(lx - R, ly - R, 2 * R, 2 * R); cH.globalCompositeOperation = "source-over";
  }
  function passo(agora) { if (!rodando) return; const t = (agora - t0) / 1000; if (!nascido) { pintar(t); if (t > NASCER + CRESCER) { nascido = true; pintar(1e9); } } quadro(agora); requestAnimationFrame(passo); }
  function iniciar() {
    nasc = M.map((m, i) => { const x = Math.sin((i + 1) * 12.9898) * 43758.5453; return (x - Math.floor(x)) * NASCER; });
    cint = st.ordem.filter((_, k) => k % 6 === 0).map((i) => { const x = Math.sin((i + 3) * 78.233) * 43758.5453, f = x - Math.floor(x); return { i, per: 4 + f * 6, fase: f * 6.283 }; });
    medir(); t0 = performance.now();
    if (reduzido) { nascido = true; pintar(1e9); quadro(t0); return; }
    new IntersectionObserver((es) => { const v = es[0].isIntersecting; if (v && !rodando) { rodando = true; requestAnimationFrame(passo); } if (!v) rodando = false; }).observe(cvH);
  }
  function recolorir() { if (bx) pintar(nascido ? 1e9 : 0); }
  return { iniciar, medir: () => bx && medir(), recolorir };
})();
// parallax: camadas da abertura em ritmos diferentes ao rolar
addEventListener("scroll", () => {
  if (reduzido) return; const y = scrollY, hh = $("#hero").offsetHeight;
  $("#heroLuz").style.transform = `translate3d(0,${y * .35}px,0)`;
  $("#heroTxt").style.transform = `translate3d(0,${y * .18}px,0)`; $("#heroTxt").style.opacity = Math.max(0, 1 - y / (hh * .6));
  $("#heroCv").style.transform = `translate3d(0,${y * .1}px,0) scale(${1 + y / hh * .08})`; $("#heroCv").style.opacity = Math.max(0, 1 - y / (hh * .85));
}, { passive: true });

(async () => {
  await carregar();
  montarSeletores(); montarLentes(); medir(); irPara("mapa"); frase(); legenda(); ficha(); placarHero();
  hero.iniciar();
  const _t = trocouCandidato; window.trocouCandidato = _t;
})();
// recolore a abertura quando o candidato muda
const _troca = trocouCandidato;
// eslint-disable-next-line no-func-assign
trocouCandidato = function () { _troca(); hero.recolorir(); };
