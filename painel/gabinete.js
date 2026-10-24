// Gabinete · Controle de Recursos (20/10/2026). Carteira do mandato a partir dos dados públicos (Portal da
// Transparência SC + painel da SEF, coletados todo dia em ferramentas/sync_emendas.py) e, para quem tem
// acesso, a camada privada do gabinete (gab_recursos / gab_demandas, migração 71).
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x || 0).toLocaleString("pt-BR"), nf = (x, d = 1) => (x || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (v) => "R$ " + (v >= 1e9 ? nf(v / 1e9, 3) + "B" : v >= 1e6 ? nf(v / 1e6, 2) + " mi" : v >= 1e3 ? nf(v / 1e3, 1).replace(/,0$/, "") + " mil" : ni(v));
const fr = (v) => "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const dtBR = (s) => s ? String(s).slice(0, 10).split("-").reverse().join("/") : "";
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const PUB = LOCAL ? "../dados/gabinete/" : "https://raw.githubusercontent.com/netofloripabr/simulador-legislativo/dados-emendas/dados/gabinete/";
// gabinete do mandato que tem o controle privado (planilha) e o parlamentar aberto na página (?d=número)
const DEP = { nome: "Napoleão Bernardes", n: "55777", partido: "PSD" };
const DURL = new URLSearchParams(location.search).get("d"); // explorar outro gabinete sem mudar o vínculo
let DSEL = DURL || null, VINC = null; // VINC: parlamentar vinculado à conta (gab_vinculo, migração 72)
const COR_P = { "NOVO": "#F37021", "PL": "#3D7BFF", "PT/PC do B/PV": "#E5383B", "MDB": "#34C759", "UNIÃO/PP": "#2FB5E8", "PSD": "#2B5FD9", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PDT": "#E5484D", "PSOL/REDE": "#F5B700", "PSB": "#F2A900" };
const hexRgb = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)); };
let PARL = null; // parlamentar aberto: { n, u, p, t }
const proprio = () => PARL && PARL.n === DEP.n;
const ETAPAS = [null, ["Indicada", "#5C6268"], ["Empenhada", "#8FA8E8"], ["Em pagamento", "#C6E62A"], ["Paga", "#34E84A"], ["Impedimento técnico", "#E8432A"]];
const etapa = (e) => (e.imped && /impedimento/i.test(e.imped)) ? 5 : (e.v > 0 && (e.vp || 0) >= e.v * 0.995) ? 4 : (e.vl > 0 || e.vp > 0) ? 3 : (e.ve > 0 || (e.pagamentos_sef || []).length) ? 2 : 1;
const S = { lc: "votos", aba: "geral", outro: null, oano: 2026, oord: "v", fech: {}, mq: "", mano: 0, mlim: 80, ano: 0, lente: "rec", busca: "", mod: "", et: new Set([1, 2, 3, 4, 5]), aberto: null, ord: ["v", -1], lim: 60 };
let MEU = [], TODAS = null, E0 = [], V0 = [], EST = null, E = [], META = {}, BASE = null, VOT = null, PRIV = null, PODE = false, SESS = null;

async function iniciar() {
  const [m, mt, b, est] = await Promise.all([fetch(PUB + "mandato-napoleao.json").then((r) => r.json()), fetch(PUB + "meta.json").then((r) => r.json()).catch(() => ({})), fetch("../dados/painel/sc-base.json").then((r) => r.json()), fetch("../dados/painel/sc-estadual.json").then((r) => r.json())]);
  META = mt; BASE = b; EST = est;
  try { SESS = supabaseClient ? (await supabaseClient.auth.getSession()).data.session : null; if (SESS) { const r = await supabaseClient.rpc("gab_pode"); PODE = !!r.data; if (PODE) { const v = await supabaseClient.from("gab_vinculo").select("parlamentar").maybeSingle(); VINC = v.data ? v.data.parlamentar : null; } } } catch (e) {}
  if (!PODE && !LOCAL) return restrito();
  if (LOCAL && !VINC) { try { VINC = localStorage.getItem("gab_vinc_local"); } catch (e) {} }
  if (!VINC) return escolha(); // sem vínculo, a conta escolhe primeiro o próprio gabinete
  DSEL = DSEL || VINC;
  PARL = est.c.find((c) => c.n === DSEL) || est.c.find((c) => c.n === DEP.n);
  const cr = hexRgb(COR_P[PARL.p] || "#2B5FD9"); document.documentElement.style.setProperty("--a", COR_P[PARL.p] || "#2B5FD9"); document.documentElement.style.setProperty("--a-rgb", cr.join(","));
  VOT = PARL.v || [];
  if (proprio()) { E = m.emendas.map((e) => ({ ...e, et: etapa(e) })); const ix = {}; BASE.mun.forEach((x, i) => { ix[norm(x.n)] = i; }); E.forEach((e) => { e.mi = ix[norm(e.mun)]; }); }
  else { await lerTodas(); const ds = casaDep(PARL); E = TODAS.filter((e) => ds.has(e.dep)); }
  E0 = E; V0 = VOT;
  try { if (PODE && proprio()) await lerPrivado(); } catch (e) {}
  // área restrita: por enquanto só administradores (no computador local, liberado para testes)
  if (LOCAL && !MEU.length) { try { MEU = await (await fetch("../dados/gabinete/_priv-teste.json")).json(); PRIV = {}; MEU.forEach((r) => { if (r.chave) PRIV[r.chave] = r; }); PRIV._n = MEU.length; PODE = true; } catch (e) {} }
  desenhar();
}
function restrito() { $("#app").innerHTML = `<div style="max-width:560px;margin:12vh auto"><div class="olho">Gabinete</div><h1 style="font-size:44px">Área restrita.</h1><p class="lead">O painel Gabinete está em construção e, por enquanto, é liberado só para a administração.${SESS ? "" : " Se você tem acesso, entre com a sua conta."}</p>${SESS ? "" : `<p><a class="btn" href="../?entrar=1" onclick="try{localStorage.setItem('sl_volta',location.href)}catch(e){}" style="display:inline-block;text-decoration:none;margin-top:12px">Entrar</a></p>`}</div>`;  }
// primeira vez: a conta escolhe o parlamentar do gabinete; depois o painel abre sempre nele
function escolha(trocar) {
  const EL = EST.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => a.u.localeCompare(b.u, "pt-BR"));
  $("#app").innerHTML = `<div style="max-width:760px;margin:6vh auto 0"><div class="olho">Gabinete · ${trocar ? "trocar o vínculo" : "primeiro acesso"}</div><h1 style="font-size:48px">De qual parlamentar é este gabinete?</h1>
    <p class="lead">A sua conta fica vinculada a um parlamentar. O painel passa a abrir sempre nele; dá para trocar depois.</p><input id="escB" class="trp" style="width:100%;margin:18px 0 10px" placeholder="Buscar pelo nome"><div class="escL" id="escL"></div></div>`;
  const L = (q) => { $("#escL").innerHTML = EL.filter((c) => !q || norm(c.u + " " + c.p).includes(norm(q))).map((c) => `<button data-n="${c.n}" style="--c:${COR_P[c.p] || "#8A9096"}"><img src="../dados/fotos/sc-2026/estadual/${c.n}.jpg" alt="" onerror="this.style.visibility='hidden'"><b>${esc(c.u)}</b><span>${esc(c.p)}</span></button>`).join(""); };
  L(""); $("#escB").oninput = (e) => L(e.target.value);
  $("#escL").onclick = async (e) => { const b = e.target.closest("[data-n]"); if (!b) return; b.disabled = true;
    try { if (SESS) { const { error } = await supabaseClient.from("gab_vinculo").upsert({ dono: SESS.user.id, parlamentar: b.dataset.n, atualizado_em: new Date().toISOString() }); if (error) throw error; } else localStorage.setItem("gab_vinc_local", b.dataset.n); } catch (er) { alert("Não foi possível salvar o vínculo: " + (er.message || er)); return; }
    location.href = "gabinete.html"; };
}
async function lerPrivado() { const { data } = await supabaseClient.from("gab_recursos").select("*").order("origem_planilha", { nullsFirst: false }); MEU = data || []; PRIV = {}; (data || []).forEach((r) => { if (r.chave) PRIV[r.chave] = r; }); PRIV._n = (data || []).length; }

const doAno = () => E.filter((e) => !S.ano || e.ano === S.ano);
// títulos do Gabinete (mesmo formato da página Parlamentares): cada um é uma seção que abre e fecha
const TITULOS = [["rec", "Controle de Recursos", "Emendas e recursos do mandato: a análise geral dos dados oficiais e o seu controle, no formato da planilha do gabinete."],
  ["rh", "RH", "Equipe do gabinete, cargos, lotação e a cota de nomeações."], ["pl", "Processo legislativo", "Proposições, relatorias, pareceres e prazos do mandato."],
  ["ele", "Eleitoral", "Base eleitoral, lideranças e a relação entre votos e presença do mandato."], ["mail", "Mailing", "Contatos de prefeituras, entidades e lideranças, com histórico de atendimento."]];
function desenhar() {
  // aba Outros deputados com um deputado escolhido: a Análise geral passa a mostrar as emendas dele
  if (S.aba === "outros" && S.outro && TODAS) { E = TODAS.filter((e) => e.dep === S.outro); const c = EST.c.find((x) => norm(x.u) === norm(S.outro) || norm(x.nome) === norm(S.outro)); VOT = c ? c.v : []; } else { E = E0; VOT = V0; }
  const nm = PARL.u.split(" "), EL = EST.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => a.u.localeCompare(b.u, "pt-BR"));
  $("#app").innerHTML = `${capa(nm)}
    ${TITULOS.map(([k, t, d], i) => `<section class="secao${S.fech[k] ?? true ? " fech" : ""}" id="t-${k}"><div class="tag" data-t="${k}"><button class="tgs${S.fech[k] ?? true ? "" : " ab"}" title="Recolher ou abrir"></button><h2>${t}</h2><p class="lead">${d}</p></div><div class="corpoT" id="c-${k}">${k === "rec" ? corpoRec() : `<div class="obra">Em construção. Este título entra no mesmo formato assim que começarmos a trabalhar nele.</div>`}</div></section>`).join("")}`;
  const tv = $("#trocaV"); if (tv) tv.onclick = (e) => { e.preventDefault(); escolha(true); };
  $("#glc").onchange = (e) => { S.lc = e.target.value; capaLente(); };
  if (!GH || !document.body.contains($("#gCv")) || !GH.vivo) { capaMapa(); GH.vivo = true; }
  leque(); ligarCapaCliques();
  blocos();
  $("#app").querySelectorAll("[data-t]").forEach((h) => h.onclick = () => { const k = h.dataset.t, sec = h.parentElement; S.fech[k] = !sec.classList.contains("fech"); sec.classList.toggle("fech", S.fech[k]); h.querySelector(".tgs").classList.toggle("ab", !S.fech[k]); });
  $("#abas").onclick = (e) => { const b = e.target.closest("[data-aba]"); if (!b) return; S.aba = b.dataset.aba; S.outro = null; desenhar(); };
  if (S.aba === "geral" || (S.aba === "outros" && S.outro)) ligarGeral(); else if (S.aba === "meu") ligarMeu(); else ligarOutros();
}
// capa do gabinete: mesma dinâmica da capa de Parlamentares (mapa animado, números saltando, a cidade de
// destaque fora do mapa), com filtros que trocam o que o mapa mostra
const leq = (id, tit, ops, cur) => `<label class="leq"><span>${tit}</span><select id="${id}">${ops.map(([v, r]) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${r}</option>`).join("")}</select></label>`;
const LENTES = [["votos", "Votos 2026"], ["rec", "Recursos 2023-26"], ["pago", "% pago"], ["rpv", "R$ por voto"]];
function valoresCapa() {
  const A = agregado(E0), val = EST.val || [];
  if (S.lc === "votos") return { v: BASE.mun.map((m, i) => val[i] ? (PARL.v[i] || 0) / val[i] : 0), top: BASE.mun.map((m, i) => PARL.v[i] || 0), rot: (x) => ni(x) + " votos" };
  if (S.lc === "rec") return { v: BASE.mun.map((m, i) => (A[i] || {}).v || 0), top: BASE.mun.map((m, i) => (A[i] || {}).v || 0), rot: fm };
  if (S.lc === "pago") return { v: BASE.mun.map((m, i) => A[i] && A[i].v ? A[i].vp / A[i].v : 0), top: BASE.mun.map((m, i) => (A[i] || {}).vp || 0), rot: (x) => fm(x) + " pagos" };
  return { v: BASE.mun.map((m, i) => A[i] && PARL.v[i] ? A[i].v / PARL.v[i] : 0), top: BASE.mun.map((m, i) => A[i] && PARL.v[i] ? A[i].v / PARL.v[i] : 0), rot: (x) => "R$ " + nf(x, 0) + " por voto" };
}
function capa(nm) {
  const L = E0, tv = L.reduce((s, e) => s + (e.v || 0), 0), tp = L.reduce((s, e) => s + (e.vp || 0), 0), mun = new Set(L.map((e) => e.mun)).size;
  const pops = [[ni(PARL.t), "votos em 2026", 1], [fm(tv), "indicado em emendas 2023-26"], [tv ? nf(tp / tv * 100) + "%" : "—", "já pago"], [ni(L.length), "emendas"], [mun, "municípios atendidos"], [fm(tp), "pago até hoje"]];
  return `<section class="ghero" id="ghero"><div class="luz"></div><canvas id="gCv"></canvas><div id="gEtq"></div>
    <div class="gtxt"><img class="gft" src="../dados/fotos/sc-2026/estadual/${PARL.n}.jpg" alt="" onerror="this.remove()"><div class="olho" style="margin-top:14px">Gabinete · Deputado estadual · SC · ${esc(PARL.p)}</div>
    <h1>${esc(nm.length > 1 ? nm.slice(0, -1).join(" ") + " " : "")}<i>${esc(nm.slice(-1)[0])}.</i></h1>
    <div class="pops">${pops.map(([v, r, a], k) => `<div style="animation-delay:${.4 + k * .35}s"><b class="${a ? "a" : ""}">${esc(String(v))}</b><span>${esc(r)}</span></div>`).join("")}</div>
    <div class="leqs glc">${leq("glc", "Mapa", LENTES, S.lc)}</div>
    ${DURL && DURL !== VINC ? `<p class="gvinc">Explorando outro gabinete · <a href="gabinete.html">voltar ao seu</a></p>` : `<p class="gvinc"><a href="#" id="trocaV">Alterar o parlamentar vinculado</a></p>`}</div></section>`;
}
let gRaf = null, GH = null;
function capaMapa() {
  const cv = $("#gCv"); if (!cv) return; cancelAnimationFrame(gRaf);
  const r0 = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = r0.width, h = r0.height; cv.width = w * dpr; cv.height = h * dpr; const ctx = cv.getContext("2d");
  const movel = innerWidth < 760, cx = movel ? { x0: 16, y0: 16, x1: w - 16, y1: h - 16 } : { x0: w * .42, y0: h * .06, x1: w * .97, y1: h * .94 };
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; BASE.contorno.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), Sx = Math.min((cx.x1 - cx.x0) / ((lo1 - lo0) * K), (cx.y1 - cx.y0) / (la0 - la1)), ox = cx.x0 + ((cx.x1 - cx.x0) - (lo1 - lo0) * K * Sx) / 2, oy = cx.y0 + ((cx.y1 - cx.y0) - (la0 - la1) * Sx) / 2;
  const P = (lo, la) => [ox + (lo - lo0) * K * Sx, oy + (la0 - la) * Sx], k = Math.min(w, h) / 560, cont = new Path2D();
  BASE.contorno.forEach((an) => an.forEach((r) => { r.forEach(([lo, la], j) => { const [x, y] = P(lo, la); j ? cont.lineTo(x, y) : cont.moveTo(x, y); }); cont.closePath(); }));
  const refEl = Math.max(...BASE.mun.map((m) => m.el)) / 4;
  const B = BASE.mun.map((m, i) => { const [x, y] = P(m.lon, m.lat); return { x, y, r: (1.2 + 26 * Math.sqrt(m.el / refEl)) * k * .9, t0: 0, t1: 0, nasce: (Math.sin((i + 1) * 12.9898) * 43758.5453 % 1 + 1) % 1 * 2.2 }; });
  const ord = [...B.keys()].sort((a, b) => BASE.mun[b].el - BASE.mun[a].el), rgb = hexRgb(COR_P[PARL.p] || "#2B5FD9"), ne = [58, 64, 70], t0 = performance.now();
  GH = { B, w, h, ini: t0, top: [] };
  const quadro = (agora) => { if (!document.body.contains(cv)) return; const t = (agora - t0) / 1000, e1 = Math.min(1, (agora - GH.ini) / 650), ee = 1 - Math.pow(1 - e1, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.globalAlpha = Math.min(1, t / 1.2); ctx.fillStyle = "rgba(242,244,245,.03)"; ctx.fill(cont); ctx.strokeStyle = "rgba(242,244,245,.06)"; ctx.lineWidth = .6; ctx.stroke(cont);
    for (const i of ord) { const b = B[i], e0 = Math.min(1, Math.max(0, (t - b.nasce) / .7)); if (!e0) continue; const e = 1 - Math.pow(1 - e0, 3), tt = b.t0 + (b.t1 - b.t0) * ee, col = tt < .02 ? ne : ne.map((v, q) => Math.round(v + (rgb[q] - v) * Math.min(1, .25 + tt)));
      ctx.globalAlpha = (.22 + .72 * tt) * e; ctx.shadowColor = `rgba(${rgb},${.8 * tt})`; ctx.shadowBlur = 16 * tt; ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.4 + .6 * e) * (.8 + .3 * tt), 0, 6.2832); ctx.fill(); }
    ctx.shadowBlur = 0; GH.top.forEach((i, q) => { const b = B[i], v = (Math.sin(t * 1.4 + q) + 1) / 2; if (t < 2.6) return; ctx.globalAlpha = .25 * v; ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.2 + .5 * v), 0, 6.2832); ctx.fill(); });
    ctx.globalAlpha = 1; gRaf = requestAnimationFrame(quadro); };
  gRaf = requestAnimationFrame(quadro); capaLente();
}
function capaLente() {
  if (!GH) return; const agora = performance.now(), e1 = Math.min(1, (agora - GH.ini) / 650), ee = 1 - Math.pow(1 - e1, 3);
  GH.B.forEach((b) => { b.t0 = b.t0 + (b.t1 - b.t0) * ee; });
  const X = valoresCapa(), e95 = [...X.v].sort((a, b) => a - b)[Math.floor(X.v.length * .95)] || 1;
  GH.B.forEach((b, i) => { b.t1 = Math.min(1, X.v[i] / e95); }); GH.ini = agora;
  const ordT = [...X.top.keys()].sort((a, b) => X.top[b] - X.top[a]); GH.top = ordT.slice(0, 5);
  const i1 = ordT[0], b1 = GH.B[i1]; if (!X.top[i1]) { $("#gEtq").innerHTML = ""; return; }
  GH.i1 = i1; $("#gEtq").innerHTML = `<div class="etq" data-cid="${esc(BASE.mun[i1].n)}" title="Ver as emendas de ${esc(BASE.mun[i1].n)}" style="left:${b1.x}px;top:${b1.y - b1.r}px;animation-delay:.4s, 1.1s"><span>${esc(BASE.mun[i1].n)}</span><b>${esc(X.rot(X.top[i1]))}</b></div>`;
}
// leque de títulos no topo (mesmo papel da navegação de seções de Parlamentares): abre e leva ao título
function leque() {
  let nv = document.querySelector(".gsecs"); if (!nv) { nv = document.createElement("nav"); nv.className = "gsecs"; document.querySelector(".topo .wm").after(nv); }
  nv.innerHTML = TITULOS.map(([k, t]) => `<a href="#t-${k}" data-gt="${k}">${t.replace("Controle de Recursos", "Recursos").replace("Processo legislativo", "Legislativo")}</a>`).join("");
  nv.onclick = (e) => { const a = e.target.closest("[data-gt]"); if (!a) return; e.preventDefault(); const k = a.dataset.gt, sec = $("#t-" + k); S.fech[k] = false; sec.classList.remove("fech"); sec.querySelector(".tgs").classList.add("ab"); sec.scrollIntoView({ behavior: "smooth" }); };
}
// clicar numa cidade da capa (etiqueta ou bolha) abre Controle de Recursos com a carteira filtrada nela
function irCidade(nome) {
  S.fech.rec = false; S.aba = "geral"; S.outro = null; S.ano = 0; S.busca = nome; S.lim = 60; desenhar();
  const c = $("#busca"); if (c) { c.value = nome; tabela(); c.closest(".bx").scrollIntoView({ behavior: "smooth", block: "start" }); }
}
function ligarCapaCliques() {
  const et = $("#gEtq"); if (et) et.onclick = (e) => { const d = e.target.closest("[data-cid]"); if (d) irCidade(d.dataset.cid); };
  const cv = $("#gCv"); if (cv) { cv.onclick = (e) => { if (!GH) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let m = -1, md = 1e9;
    GH.B.forEach((b, i) => { const d = Math.hypot(b.x - x, b.y - y); if (d < Math.max(b.r, 8) && d < md) { md = d; m = i; } }); if (m >= 0) irCidade(BASE.mun[m].n); };
    cv.onmousemove = (e) => { if (!GH) return; const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; cv.style.cursor = GH.B.some((b) => Math.hypot(b.x - x, b.y - y) < Math.max(b.r, 8)) ? "pointer" : ""; }; }
}
// todo bloco com título (Mapa, Carteira...) abre e fecha pelo próprio título; o estado fica guardado na sessão da página
function blocos() {
  S.bxf = S.bxf || {};
  document.querySelectorAll(".bx").forEach((bx) => { const hd = bx.querySelector(".bxh"); if (!hd || hd.dataset.tg) return; hd.dataset.tg = 1;
    const k = (hd.querySelector("h2") || {}).textContent || ""; hd.insertAdjacentHTML("afterbegin", `<button class="tgs${S.bxf[k] ? "" : " ab"}" title="Recolher ou abrir"></button>`);
    bx.classList.toggle("fech", !!S.bxf[k]); hd.style.cursor = "pointer";
    hd.onclick = (e) => { if (e.target.closest("input,select,a")) return; S.bxf[k] = !S.bxf[k]; bx.classList.toggle("fech", S.bxf[k]); hd.querySelector(".tgs").classList.toggle("ab", !S.bxf[k]); }; });
}
function corpoRec() {
  return `<div class="chips abas" id="abas">${[["geral", "Análise geral"], ...(proprio() ? [["meu", "Meu controle"]] : []), ["outros", "Outros deputados"]].map(([k, r]) => `<button data-aba="${k}" class="${S.aba === k ? "on" : ""}">${r}</button>`).join("")}</div><div id="corpoAba">${S.aba === "geral" ? geral() : S.aba === "meu" ? meu() : outros()}</div>`;
}
function geral() {
  const L = doAno(), tv = L.reduce((s, e) => s + (e.v || 0), 0), tp = L.reduce((s, e) => s + (e.vp || 0), 0), anos = [...new Set(E.map((e) => e.ano))].sort();
  const cont = [0, 0, 0, 0, 0, 0]; L.forEach((e) => cont[e.et]++);
  
  if (!L.length && !S.outro) return `<div class="obra">Nenhuma emenda de ${esc(PARL.u)} nos dados oficiais de 2023 a 2026. O parlamentar não exerceu mandato na legislatura atual; as emendas dele começam a aparecer em 2027.</div>`;
  return `<p class="lead" style="margin-top:14px">Todas as emendas indicadas pelo mandato, com o andamento oficial (empenho, liquidação, pagamento e OB) atualizado todo dia.</p>
    <div class="fonte">Fontes: Portal da Transparência SC e painel de emendas da SEF${META.coletado_em ? ` · coletado em ${esc(dtBR(META.coletado_em))} ${esc(String(META.coletado_em).slice(11, 16))}` : ""}.</div>
    <div class="leqs">${leq("fAno", "Ano", [[0, "Todos"], ...anos.map((a) => [a, a])], S.ano)}</div>
    <div class="kpis"><div><b class="a">${fm(tv)}</b><span>indicado</span></div><div><b>${fm(tp)}</b><span>pago</span></div><div><b>${tv ? nf(tp / tv * 100) : "0,0"}%</b><span>executado</span></div><div><b>${ni(L.length)}</b><span>emendas</span></div><div><b>${new Set(L.map((e) => e.mun)).size}</b><span>municípios</span></div></div>
    <div class="funil">${[1, 2, 3, 4, 5].map((k) => cont[k] ? `<i style="width:${cont[k] / L.length * 100}%;background:${ETAPAS[k][1]}" title="${ETAPAS[k][0]}: ${cont[k]}"></i>` : "").join("")}</div>
    <div class="funilL">${[1, 2, 3, 4, 5].map((k) => `<span data-et="${k}" class="${S.et.has(k) ? "" : "off"}"><i style="background:${ETAPAS[k][1]}"></i>${ETAPAS[k][0]} <b>${cont[k]}</b></span>`).join("")}</div>
    <section class="bx"><div class="bxh"><h2>Mapa</h2><p>Recursos do mandato por município e relação com os votos de 2026.</p></div>
      <div class="chips" id="lentes">${[["rec", "Recursos"], ["pago", "% pago"], ["voto", "Votos"], ["rpv", "R$ por voto"]].map(([k, r]) => `<button data-l="${k}" class="${S.lente === k ? "on" : ""}">${r}</button>`).join("")}</div>
      <div class="mapa"><div>${mapa(L)}<div class="leg" id="legM"></div></div><div>${ranking(L)}</div></div></section>
    <section class="bx"><div class="bxh"><h2>Carteira</h2><p>Clique numa emenda para ver a linha do tempo.</p></div>
      <div class="ctl"><input id="busca" placeholder="Município, objeto, beneficiário ou nº" value="${esc(S.busca)}"><select id="mod"><option value="">Todas as modalidades</option>${[...new Set(E.map((e) => e.mod).filter(Boolean))].sort().map((m) => `<option ${S.mod === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
      <div id="tab"></div></section>`;
}
function ligarGeral() {
  const vo = $("#voltaO"); if (vo) vo.onclick = () => { S.outro = null; desenhar(); };
  $("#fAno").onchange = (e) => { S.ano = +e.target.value; S.aberto = null; desenhar(); };
  $("#corpoAba").querySelectorAll("[data-et]").forEach((b) => b.onclick = () => { const k = +b.dataset.et; S.et.has(k) ? S.et.delete(k) : S.et.add(k); desenhar(); });
  $("#lentes").onclick = (e) => { const b = e.target.closest("[data-l]"); if (!b) return; S.lente = b.dataset.l; desenhar(); };
  $("#busca").oninput = (e) => { S.busca = e.target.value; S.lim = 60; tabela(); };
  $("#mod").onchange = (e) => { S.mod = e.target.value; tabela(); };
  tabela();
}
// ---------- Meu controle: a planilha do gabinete (EM Consolidado), privada ----------
const supr = (r) => /^Suprimida/.test(r.status_manual || "");
function meu() {
  if (!PODE) return `<div class="obra">Entre com a sua conta para ver o seu controle.</div>`;
  if (!MEU.length) return blocoPrivado();
  const anos = [...new Set(MEU.map((r) => r.ano).filter(Boolean))].sort(), A = MEU.filter((r) => !S.mano || r.ano === S.mano), at = A.filter((r) => !supr(r)), sp = A.filter(supr);
  const tot = at.reduce((s, r) => s + (+r.valor || 0), 0), pago = at.filter((r) => r.ob || /pago|executado/i.test(r.status_manual || "")).reduce((s, r) => s + (+r.valor || 0), 0);
  return `<p class="lead" style="margin-top:14px">O controle do gabinete, no formato da planilha "Controle de Recursos". Visível só para você.</p>
    <div class="leqs">${leq("fMano", "Ano", [[0, "Todos"], ...anos.map((a) => [a, a])], S.mano)}</div>
    <div class="kpis"><div><b class="a">${fm(tot)}</b><span>recursos ativos</span></div><div><b>${fm(pago)}</b><span>pago ou executado</span></div><div><b>${ni(at.length)}</b><span>linhas</span></div><div><b>${new Set(at.map((r) => norm(r.municipio))).size}</b><span>municípios</span></div><div><b>${ni(sp.length)}</b><span>suprimidas · ${fm(sp.reduce((s, r) => s + (+r.valor || 0), 0))}</span></div></div>
    <section class="bx"><div class="ctl"><input id="mbusca" placeholder="Município, objeto, nº, processo ou tag" value="${esc(S.mq)}"></div><div id="mtab"></div></section>`;
}
function ligarMeu() {
  $("#fMano").onchange = (e) => { S.mano = +e.target.value; desenhar(); };
  const bi = $("#mbusca"); if (bi) bi.oninput = (e) => { S.mq = e.target.value; S.mlim = 80; mtab(); };
  const imp = $("#impBtn"); if (imp) imp.onclick = importar;
  if ($("#mtab")) mtab();
}
function mtab() {
  const q = norm(S.mq), L = MEU.filter((r) => (!S.mano || r.ano === S.mano) && (!q || norm([r.municipio, r.objeto, r.numero, r.processo, (r.tags || []).join(" "), r.origem].join(" ")).includes(q)));
  $("#mtab").innerHTML = `<table class="tb mt"><thead><tr><th>Ano · nº</th><th>Município</th><th class="hm">Objeto</th><th class="hm">Função · mod.</th><th class="v">R$</th><th>Status</th><th class="hm">Processo</th></tr></thead><tbody>${L.slice(0, S.mlim).map((r) => `<tr class="${supr(r) ? "sup" : ""}"><td>${r.ano || ""}${r.numero ? ` · ${esc(r.numero)}` : ""}<small>${esc(r.origem || "")}</small></td><td>${esc(r.municipio || "")}<small>${esc(r.regiao || "")}</small></td><td class="hm">${esc(r.objeto || "")}${(r.tags || []).length ? `<small>${r.tags.map((t) => `<span class="tg">${esc(t)}</span>`).join("")}</small>` : ""}</td><td class="hm">${esc(r.funcao || "")}<small>${esc(r.modalidade || "")}</small></td><td class="v">${fr(+r.valor || 0)}</td><td>${esc(r.status_manual || "")}</td><td class="hm">${esc(r.processo || "")}</td></tr>`).join("")}</tbody></table>
    ${L.length > S.mlim ? `<button class="btn sec mais" id="mmais">Mostrar mais (${L.length - S.mlim})</button>` : ""}<div class="av"><b>${ni(L.length)}</b> linhas</div>`;
  const m = $("#mmais"); if (m) m.onclick = () => { S.mlim += 200; mtab(); };
}

// ---------- mapa de SC: bolha por município (tamanho = valor; cor = lente) ----------
function mapa(L) {
  const C = BASE.contorno; let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9;
  C.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 700, Sx = W / ((lo1 - lo0) * K), H = (la0 - la1) * Sx, P = (lo, la) => [(lo - lo0) * K * Sx, (la0 - la) * Sx];
  const pth = C.map((an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("")).join("");
  const A = agregado(L), mxV = Math.max(1, ...Object.values(A).map((o) => o.v)), mxVt = Math.max(1, ...VOT), rp = Object.values(A).filter((o) => o.vt).map((o) => o.v / o.vt).sort((a, b) => a - b), r95 = rp[Math.floor(rp.length * .9)] || 1;
  let bol = "";
  BASE.mun.forEach((m, i) => { const o = A[i], [x, y] = P(m.lon, m.lat), vt = VOT[i] || 0;
    if (S.lente === "voto") { if (!vt) return; const r = 1.5 + 16 * Math.sqrt(vt / mxVt); bol += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${o ? "#2B5FD9" : "#6B7178"}" fill-opacity="${o ? .75 : .35}"><title>${esc(m.n)}: ${ni(vt)} votos${o ? " · " + fm(o.v) : " · sem recurso"}</title></circle>`; return; }
    if (!o) { bol += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.2" fill="#2A3034"/>`; return; }
    const r = 3 + 20 * Math.sqrt(o.v / mxV), pg = o.v ? o.vp / o.v : 0;
    const cor = S.lente === "pago" ? `hsl(${Math.round(pg * 120)},70%,52%)` : S.lente === "rpv" ? (o.vt ? `rgba(43,95,217,${(.25 + .75 * Math.min(1, (o.v / o.vt) / r95)).toFixed(2)})` : "#E8432A") : "#2B5FD9";
    bol += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${cor}" fill-opacity="${S.lente === "rec" ? .6 : .85}" stroke="#0B0F0D" stroke-width=".6"><title>${esc(m.n)}: ${fm(o.v)} · ${o.n} emenda${o.n > 1 ? "s" : ""} · ${nf(pg * 100, 0)}% pago · ${ni(o.vt)} votos${o.vt ? " · " + fr(o.v / o.vt) + "/voto" : ""}</title></circle>`; });
  setTimeout(() => { const lg = $("#legM"); if (lg) lg.textContent = { rec: "Tamanho: valor indicado no município.", pago: "Tamanho: valor indicado. Cor: do vermelho (nada pago) ao verde (tudo pago).", voto: "Tamanho: votos de 2026. Azul: município com recurso indicado; cinza: sem recurso.", rpv: "Tamanho: valor indicado. Quanto mais escuro, mais reais por voto; vermelho: recurso onde não houve voto." }[S.lente]; });
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}"><path d="${pth}" fill="rgba(242,244,245,.035)" stroke="rgba(242,244,245,.14)" stroke-width=".6"/>${bol}</svg>`;
}
function agregado(L) { const A = {}; L.forEach((e) => { if (e.mi == null) return; const o = A[e.mi] = A[e.mi] || { v: 0, vp: 0, n: 0, vt: VOT[e.mi] || 0 }; o.v += e.v || 0; o.vp += e.vp || 0; o.n++; }); return A; }
function ranking(L) {
  const A = agregado(L), R = Object.entries(A).map(([i, o]) => ({ m: BASE.mun[i], ...o }));
  const ord = S.lente === "voto" ? BASE.mun.map((m, i) => ({ m, vt: VOT[i] || 0, v: (A[i] || {}).v || 0 })).filter((o) => o.vt).sort((a, b) => b.vt - a.vt) : S.lente === "rpv" ? R.filter((o) => o.vt).sort((a, b) => b.v / b.vt - a.v / a.vt) : S.lente === "pago" ? R.sort((a, b) => a.vp / a.v - b.vp / b.v) : R.sort((a, b) => b.v - a.v);
  const tit = { rec: "Municípios com mais recurso", pago: "Menor execução", voto: "Municípios com mais votos", rpv: "Mais reais por voto" }[S.lente];
  const val = (o) => S.lente === "voto" ? `${ni(o.vt)}<small>${o.v ? fm(o.v) : "sem recurso"}</small>` : S.lente === "rpv" ? `${fr(o.v / o.vt)}<small>${fm(o.v)} · ${ni(o.vt)} votos</small>` : S.lente === "pago" ? `${nf(o.vp / o.v * 100, 0)}%<small>${fm(o.vp)} de ${fm(o.v)}</small>` : `${fm(o.v)}<small>${o.n} emenda${o.n > 1 ? "s" : ""} · ${ni(o.vt)} votos</small>`;
  return `<div class="olho" style="margin-bottom:6px">${tit}</div><ol class="rk">${ord.slice(0, 12).map((o, k) => `<li><i>${k + 1}º</i><span>${esc(o.m.n)}<small>${esc(o.m.assoc || "")}</small></span><b>${val(o)}</b></li>`).join("")}</ol>`;
}

// ---------- carteira ----------
function filtradas() { const q = norm(S.busca); return doAno().filter((e) => S.et.has(e.et) && (!S.mod || e.mod === S.mod) && (!q || norm([e.mun, e.obj, e.benef, e.k, e.n, e.assoc].join(" ")).includes(q))); }
function tabela() {
  const L = filtradas().sort((a, b) => { const [c, d] = S.ord, x = a[c] ?? "", y = b[c] ?? ""; return (x > y ? 1 : x < y ? -1 : 0) * d; });
  const cab = [["k", "Emenda"], ["mun", "Município"], ["obj", "Objeto", "hm"], ["v", "Valor", "v"], ["vp", "Pago", "v hm"], ["et", "Etapa"]];
  $("#tab").innerHTML = `<table class="tb"><thead><tr>${cab.map(([k, r, c]) => `<th data-o="${k}" class="${c || ""}">${r}${S.ord[0] === k ? (S.ord[1] > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead><tbody>${L.slice(0, S.lim).map((e) => linha(e)).join("")}</tbody></table>
    ${L.length > S.lim ? `<button class="btn sec mais" id="mais">Mostrar mais (${L.length - S.lim})</button>` : ""}<div class="av"><b>${ni(L.length)}</b> emendas · ${fm(L.reduce((s, e) => s + (e.v || 0), 0))}</div>`;
  $("#tab").querySelectorAll("th[data-o]").forEach((th) => th.onclick = () => { const k = th.dataset.o; S.ord = [k, S.ord[0] === k ? -S.ord[1] : (k === "v" || k === "vp" ? -1 : 1)]; tabela(); });
  $("#tab").querySelectorAll("tr.r").forEach((tr) => tr.onclick = () => { S.aberto = S.aberto === tr.dataset.k ? null : tr.dataset.k; tabela(); });
  const m = $("#mais"); if (m) m.onclick = () => { S.lim += 100; tabela(); };
}
function linha(e) {
  const ab = S.aberto === e.k, et = [1, 2, 3, 4].map((k) => `<i class="${e.et === 5 ? (k === 1 ? "imp" : "") : k <= e.et ? "on" : ""}"></i>`).join("");
  return `<tr class="r${ab ? " ab" : ""}" data-k="${esc(e.k)}"><td>${esc(e.n || e.k)}<small>${e.ano} · ${esc(e.tipo || "")}</small></td><td>${esc(e.mun)}<small>${esc(e.assoc || "")}</small></td><td class="hm">${esc(e.obj)}<small>${esc(e.mod || "")}</small></td><td class="v">${fr(e.v)}</td><td class="v hm">${fr(e.vp)}</td><td><span class="et">${et}<em>${ETAPAS[e.et][0]}</em></span></td></tr>${ab ? `<tr class="det"><td colspan="6">${detalhe(e)}</td></tr>` : ""}`;
}
function detalhe(e) {
  const X = e.extrato_portal || {}, Id = X.emendaIdentificacao || {}, PT = X.emendaPlanoTrabalho || {};
  const ev = []; ev.push([1, "Indicada", `${e.mod || ""} · ${fr(e.v)}`]);
  (X.emendaEmpenho || []).forEach((x) => ev.push([1, "Empenho " + (x.nunotaempenho || ""), dtBR(x.dtlancamento || "")]));
  (X.emendaLiquidacao || []).forEach((x) => ev.push([1, "Liquidação " + (x.nunotaliquidacao || ""), dtBR(x.dtlancamento || "")]));
  (e.pagamentos_sef || []).forEach(([ne, nl, pp, ob, dt, v]) => ev.push([1, "Pagamento " + (ob || pp || ""), `${dtBR(dt)} · ${fr(v)}${ne ? " · " + ne : ""}${nl ? " · " + nl : ""}${pp ? " · " + pp : ""}`]));
  if (!(e.pagamentos_sef || []).length && e.et < 4) ev.push([0, "Pagamento", "ainda não pago"]);
  if (e.et === 5) ev.push([0, "Impedimento técnico", e.imped || ""]);
  const p = PRIV && PRIV[e.k];
  return `<div class="dg"><div><div class="olho" style="margin-bottom:8px">Linha do tempo</div><ul class="tl">${ev.map(([on, t, d]) => `<li class="${on ? "on" : ""}"><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ul></div>
    <div><div class="kv"><span>Beneficiário</span><b>${esc(e.benef || "")}${e.doc ? `<small style="display:block;color:var(--ter)">${esc(e.doc)}</small>` : ""}</b><span>Tipo</span><b>${esc(e.tben || "")}</b><span>Origem</span><b>${esc(e.tipo || "")}</b><span>Processo</span><b>${e.sgpe ? `<a href="https://sgpe.sea.sc.gov.br/sgpe/" target="_blank" rel="noopener">${esc(e.sgpe)}</a>` : "não informado pela SEF"}</b>${Id.nmsubacao ? `<span>Subação</span><b>${esc(Id.nmsubacao)}</b>` : ""}${PT.deobjeto ? `<span>Plano de trabalho</span><b style="font-weight:400">${esc(PT.deobjeto)}</b>` : ""}</div>
    ${p ? `<div class="priv"><div class="olho" style="margin-bottom:4px">Anotações do gabinete</div>${p.observacao ? `<div>${esc(p.observacao)}</div>` : ""}${p.status_manual ? `<div>Status anterior: <b>${esc(p.status_manual)}</b></div>` : ""}${(p.tags || []).map((t) => `<span class="tg">${esc(t)}</span>`).join("")}</div>` : ""}</div></div>`;
}

// ---------- camada privada: importar a planilha do gabinete ----------
function blocoPrivado() {
  const n = PRIV ? PRIV._n : 0;
  return `<div class="bx" style="margin-top:18px"><div class="bxh" style="margin-bottom:6px"><h2 style="font-size:20px">Dados do gabinete</h2><p>visíveis só para você</p></div>
    ${n ? `<div class="av"><b>${n}</b> recursos da planilha ligados às emendas oficiais. As anotações aparecem dentro de cada emenda.</div>` : `<div class="av">Importe a planilha "Controle de Recursos" (.xlsx). As abas EM Consolidado e Demandas são gravadas só na sua conta.</div><p style="margin:10px 0 0"><input type="file" id="impArq" accept=".xlsx" hidden><button class="btn" id="impBtn">Importar planilha</button> <span class="av" id="impMsg"></span></p>`}</div>`;
}
async function importar() {
  const inp = $("#impArq"); inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const msg = $("#impMsg"); msg.textContent = "Lendo a planilha…";
    try {
      if (!window.XLSX) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); });
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true }), linhas = (nm, h) => XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, range: h, defval: null });
      const tx = (v) => v == null || v === "" || v === "#N/A" ? null : String(v).trim(), nu = (v) => typeof v === "number" ? Math.round(v * 100) / 100 : null, dt = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : null;
      const R = linhas("EM Consolidado", 1).filter((r) => r[1]).map((r) => { const ano = typeof r[2] === "number" ? r[2] : null, nr = typeof r[3] === "number" ? String(r[3]) : tx(r[3]) === "-" ? null : tx(r[3]);
        return { ano, origem: tx(r[1]) && tx(r[1]).replace(/\s+/g, " "), numero: nr, chave: ano && nr && /^\d+$/.test(nr) ? `${ano}-${nr.padStart(6, "0")}` : null, municipio: tx(r[4]), regiao: tx(r[5]), beneficiario: tx(r[6]), objeto: tx(r[7]), funcao: tx(r[8]), modalidade: tx(r[9]), valor: nu(r[10]), status_manual: tx(r[11]), info_pl: tx(r[12]), processo: tx(r[13]), observacao: tx(r[14]), tags: tx(r[15]) ? tx(r[15]).split(",").map((t) => t.trim()).filter(Boolean) : null, orientacao: tx(r[16]), publicacao: tx(r[17]), empenho: tx(r[18]), liquidacao: tx(r[19]), pagamento: tx(r[20]), ob: tx(r[21]), data_pagamento: dt(r[22]), origem_planilha: typeof r[0] === "number" ? r[0] : null }; });
      const Dm = wb.Sheets["Demandas"] ? linhas("Demandas", 2).filter((r) => r[2] || r[5]).map((r) => ({ ano: typeof r[1] === "number" ? r[1] : null, municipio: tx(r[2]), regiao: tx(r[3]), valor: nu(r[4]), objeto: tx(r[5]), demandante: tx(r[6]), data_cadastro: dt(r[7]), observacao: tx(r[8]) })) : [];
      msg.textContent = `Gravando ${R.length} recursos e ${Dm.length} demandas…`;
      for (let i = 0; i < R.length; i += 200) { const { error } = await supabaseClient.from("gab_recursos").insert(R.slice(i, i + 200)); if (error) throw error; }
      for (let i = 0; i < Dm.length; i += 200) { const { error } = await supabaseClient.from("gab_demandas").insert(Dm.slice(i, i + 200)); if (error) throw error; }
      await lerPrivado(); desenhar();
    } catch (er) { msg.textContent = "Não foi possível importar: " + (er.message || er); } };
  inp.click();
}
iniciar();

// ---------- Outros deputados: o que cada parlamentar indicou e recebeu (dados oficiais, todos os anos) ----------
// o nome nas emendas é o civil (às vezes abreviado); casa pelo nome de urna ou pelo nome civil do TSE
const tkN = (x) => norm(x).split(" ").filter((w) => w.length > 2 && !["DOS", "DAS", "DEL", "DELEGADO", "PADRE", "SARGENTO"].includes(w));
const contido = (a, b) => a.length && a.every((w) => b.includes(w));
function casaDep(c) { const deps = [...new Set(TODAS.map((e) => e.dep))]; return new Set(deps.filter((d) => contido(tkN(d), tkN(c.nome || "")) || contido(tkN(c.u), tkN(d)))); }
async function lerTodas() {
  if (TODAS) return; if (!BASE) BASE = await (await fetch("../dados/painel/sc-base.json")).json(); const anos = [2023, 2024, 2025, 2026];
  const fs = await Promise.all(anos.map((a) => fetch(PUB + `emendas-${a}.json`).then((r) => r.json()).catch(() => null)));
  const ix = {}; BASE.mun.forEach((x, i) => { ix[norm(x.n)] = i; });
  TODAS = []; fs.forEach((f, j) => { if (!f) return; const c = f.campos; f.linhas.forEach((l) => { const e = { ano: anos[j] }; c.forEach((k, i) => { e[k] = l[i]; }); e.et = etapa(e); e.mi = ix[norm(e.mun)]; TODAS.push(e); }); });
}
function outros() {
  if (S.outro) return `<div class="ctl" style="margin-top:16px"><button class="btn sec" id="voltaO">Todos os deputados</button><b style="font-size:18px">${esc(S.outro)}</b></div>${geral()}`;
  if (!TODAS) return `<div class="obra">Carregando as emendas de todos os deputados…</div>`;
  const L = TODAS.filter((e) => !S.oano || e.ano === S.oano), G = {};
  L.forEach((e) => { const o = G[e.dep] = G[e.dep] || { dep: e.dep, v: 0, vp: 0, n: 0, m: new Set() }; o.v += e.v || 0; o.vp += e.vp || 0; o.n++; o.m.add(e.mun); });
  const R = Object.values(G).sort((a, b) => S.oord === "x" ? b.vp / (b.v || 1) - a.vp / (a.v || 1) : b[S.oord] - a[S.oord]), mx = Math.max(1, ...R.map((o) => o.v)), meu = norm(DEP.nome);
  const tot = L.reduce((s, e) => s + (e.v || 0), 0), totp = L.reduce((s, e) => s + (e.vp || 0), 0);
  return `<p class="lead" style="margin-top:14px">O que cada parlamentar indicou e quanto já foi pago, pelos dados oficiais. Clique num deputado para abrir o painel dele.</p>
    <div class="leqs">${leq("fOano", "Ano", [[0, "Todos"], [2023, 2023], [2024, 2024], [2025, 2025], [2026, 2026]], S.oano)}</div>
    <div class="kpis"><div><b class="a">${fm(tot)}</b><span>indicado na Casa</span></div><div><b>${fm(totp)}</b><span>pago</span></div><div><b>${tot ? nf(totp / tot * 100) : "0,0"}%</b><span>executado</span></div><div><b>${ni(L.length)}</b><span>emendas</span></div><div><b>${R.length}</b><span>parlamentares</span></div></div>
    <section class="bx"><table class="tb ot"><thead><tr><th>#</th><th>Parlamentar</th><th class="v" data-oo="v">Indicado${S.oord === "v" ? " ↓" : ""}</th><th class="v" data-oo="vp">Pago${S.oord === "vp" ? " ↓" : ""}</th><th class="v hm" data-oo="x">% pago${S.oord === "x" ? " ↓" : ""}</th><th class="v hm" data-oo="n">Emendas${S.oord === "n" ? " ↓" : ""}</th><th class="v hm">Municípios</th></tr></thead><tbody>${R.map((o, i) => `<tr class="r${norm(o.dep) === meu ? " ab" : ""}" data-dep="${esc(o.dep)}"><td>${i + 1}</td><td><b>${esc(o.dep)}</b><i class="br" style="width:${(o.v / mx * 100).toFixed(1)}%"></i></td><td class="v">${fm(o.v)}</td><td class="v">${fm(o.vp)}</td><td class="v hm">${o.v ? nf(o.vp / o.v * 100) : "0,0"}%</td><td class="v hm">${o.n}</td><td class="v hm">${o.m.size}</td></tr>`).join("")}</tbody></table></section>`;
}
function ligarOutros() {
  if (!TODAS) { lerTodas().then(desenhar); return; }
  $("#fOano").onchange = (e) => { S.oano = +e.target.value; desenhar(); };
  $("#corpoAba").querySelectorAll("[data-oo]").forEach((b) => b.onclick = () => { S.oord = b.dataset.oo; desenhar(); });
  $("#corpoAba").querySelectorAll("[data-dep]").forEach((r) => r.onclick = () => { S.outro = r.dataset.dep; S.ano = 0; S.aberto = null; desenhar(); window.scrollTo({ top: $("#abas").offsetTop - 70 }); });
}
