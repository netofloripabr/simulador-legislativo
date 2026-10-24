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
const S = { lc: "votos", aba: "meu", mapa: false, outro: null, oano: 2026, oord: "v", fech: {}, mq: "", mano: 0, mlim: 80, ano: 0, lente: "rec", busca: "", mod: "", et: new Set([1, 2, 3, 4, 5]), aberto: null, ord: ["v", -1], lim: 60 };
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
  try { if ((PODE || LOCAL) && proprio() && typeof lerAdicionar === "function") await lerAdicionar(); } catch (e) {}
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
const TITULOS = [["rec", "Controle de Recursos", "O controle do gabinete (emendas, convênios e recursos informais) e, para consulta, os dados oficiais da Transparência SC."],
  ["rh", "RH", "Equipe do gabinete, cargos, lotação e a cota de nomeações."], ["pl", "Processo legislativo", "Proposições, relatorias, pareceres e prazos do mandato."],
  ["ele", "Eleitoral", "Base eleitoral, lideranças e a relação entre votos e presença do mandato."], ["mail", "Mailing", "Contatos de prefeituras, entidades e lideranças, com histórico de atendimento."]];
function desenhar() {  if (S.aba === "meu" && !(proprio() && PODE)) S.aba = "geral";
  // aba Outros deputados com um deputado escolhido: a Análise geral passa a mostrar as emendas dele
  if (S.aba === "outros" && S.outro && TODAS) { E = TODAS.filter((e) => e.dep === S.outro); const c = EST.c.find((x) => norm(x.u) === norm(S.outro) || norm(x.nome) === norm(S.outro)); VOT = c ? c.v : []; } else { E = E0; VOT = V0; }
  const nm = PARL.u.split(" "), EL = EST.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => a.u.localeCompare(b.u, "pt-BR"));
  $("#app").innerHTML = `${capa(nm)}
    ${TITULOS.map(([k, t, d], i) => `<section class="secao${S.fech[k] ?? true ? " fech" : ""}" id="t-${k}"><div class="tag" data-t="${k}"><button class="tgs${S.fech[k] ?? true ? "" : " ab"}" title="Recolher ou abrir"></button><h2>${t}</h2><p class="lead">${d}</p></div><div class="corpoT" id="c-${k}">${k === "rec" ? corpoRec() : `<div class="obra">Em construção. Este título entra no mesmo formato assim que começarmos a trabalhar nele.</div>`}</div></section>`).join("")}`;
  const tv = $("#trocaV"); if (tv) tv.onclick = (e) => { e.preventDefault(); escolha(true); };
  $("#glc").onchange = (e) => { S.lc = e.target.value; capaLente(); };
  if (!GH || !document.body.contains($("#gCv")) || !GH.vivo) { capaMapa(); GH.vivo = true; }
  leque(); ligarCapaCliques(); if (typeof ligarAdicionar === "function") ligarAdicionar();
  blocos();
  $("#app").querySelectorAll("[data-t]").forEach((h) => h.onclick = () => { const k = h.dataset.t, sec = h.parentElement; S.fech[k] = !sec.classList.contains("fech"); sec.classList.toggle("fech", S.fech[k]); h.querySelector(".tgs").classList.toggle("ab", !S.fech[k]); });
  $("#abas").onclick = (e) => { if (e.target.closest("#mapaBt")) { S.mapa = !S.mapa; desenhar(); return; } const b = e.target.closest("[data-aba]"); if (!b) return; S.aba = b.dataset.aba; S.outro = null; desenhar(); };
  if (S.mapa && S.aba !== "geral" && !(S.aba === "outros" && S.outro)) { const lt = $("#lentes"); if (lt) lt.onclick = (e) => { const b = e.target.closest("[data-l]"); if (!b) return; S.lente = b.dataset.l; desenhar(); }; }
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
  if (window.slTrilho) slTrilho();
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
  return `<div class="abar"><div class="chips abas" id="abas">${[...(proprio() && PODE ? [["meu", "Controle"]] : []), ["geral", "Transparência SC"], ["outros", "Outros deputados"]].map(([k, r]) => `<button data-aba="${k}" class="${S.aba === k ? "on" : ""}">${r}</button>`).join("")}<button id="mapaBt" class="mapab${S.mapa ? " on" : ""}" title="Abrir ou fechar o painel de indicadores"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 13.5h12 M4 11V7 M8 11V3 M12 11V8"/></svg>Painel</button></div></div>${S.mapa ? blocoMapa() : ""}<div id="corpoAba">${S.aba === "geral" ? geral() : S.aba === "meu" ? meu() : outros()}</div>`;
}
// mapa: só abre quando o botão Mapa da faixa das abas é selecionado; mostra as emendas oficiais do recorte atual
function blocoMapa() {
  const L = doAno(), tv = L.reduce((s, e) => s + (e.v || 0), 0), tp = L.reduce((s, e) => s + (e.vp || 0), 0);
  const s26 = (PARL.v || []).reduce((s, x) => s + (x || 0), 0), s22 = (PARL.v22 || []).reduce((s, x) => s + (x || 0), 0);
  const kp = (b, s, a) => `<div><b${a ? ' class="a"' : ""}>${b}</b><span>${s}</span></div>`;
  let ctl = "";
  if (proprio() && PODE && MEU.length) { const at = MEU.filter((r) => !supr(r)), sp = MEU.filter(supr), tot = at.reduce((s, r) => s + (+r.valor || 0), 0), pg = at.filter((r) => r.ob || /pago|executado/i.test(r.status_manual || "")).reduce((s, r) => s + (+r.valor || 0), 0), ext = (AD && AD.itens || []).filter((x) => x.tipo && x.tipo !== "Emenda impositiva");
    ctl = `<div class="olho pnt">Controle do gabinete</div><div class="kpis">${kp(fm(tot), "recursos ativos", 1)}${kp(fm(pg), "pago ou executado")}${kp(ni(at.length), "linhas")}${kp(new Set(at.map((r) => norm(r.municipio))).size, "municípios")}${kp(ni(sp.length), "suprimidas · " + fm(sp.reduce((s, r) => s + (+r.valor || 0), 0)))}${ext.length ? kp(fm(ext.reduce((s, x) => s + (+x.valor || 0), 0)), ext.length + " convênios e informais") : ""}</div>`; }
  return `<section class="bx" id="bxMapa"><div class="bxh"><h2>Painel</h2><p>Indicadores, comparações e o mapa do recorte escolhido.</p></div>
    ${ctl}<div class="olho pnt">Transparência SC${S.ano ? " · " + S.ano : ""}</div>
    <div class="kpis">${kp(fm(tv), "indicado no portal", 1)}${kp(fm(tp), "pago")}${kp((tv ? nf(tp / tv * 100) : "0,0") + "%", "executado")}${kp(ni(L.length), "emendas")}${kp(new Set(L.map((e) => e.mun)).size, "municípios")}</div>
    <div class="olho pnt">Votos e retorno</div>
    <div class="kpis">${kp(ni(s22), "votos 2022")}${kp(ni(s26), "votos 2026")}${kp((s22 ? (s26 >= s22 ? "+" : "") + nf((s26 / s22 - 1) * 100) : "—") + (s22 ? "%" : ""), "variação")}${kp(s26 ? "R$ " + nf(tv / s26, 0) : "—", "reais indicados por voto")}</div>
    <div class="olho pnt">Mapa</div>
    <div class="chips" id="lentes">${[["rec", "Recursos"], ["pago", "% pago"], ["voto", "Votos"], ["rpv", "R$ por voto"]].map(([k, r]) => `<button data-l="${k}" class="${S.lente === k ? "on" : ""}">${r}</button>`).join("")}</div>
    <div class="mapa"><div>${mapa(L)}<div class="leg" id="legM"></div></div><div>${ranking(L)}</div></div></section>`;
}
function geral() {
  const L = doAno(), tv = L.reduce((s, e) => s + (e.v || 0), 0), tp = L.reduce((s, e) => s + (e.vp || 0), 0), anos = [...new Set(E.map((e) => e.ano))].sort();
  const cont = [0, 0, 0, 0, 0, 0]; L.forEach((e) => cont[e.et]++);
  
  if (!L.length && !S.outro) return `<div class="obra">Nenhuma emenda de ${esc(PARL.u)} nos dados oficiais de 2023 a 2026. O parlamentar não exerceu mandato na legislatura atual; as emendas dele começam a aparecer em 2027.</div>`;
  return `<p class="lead" style="margin-top:14px">Dados oficiais do Portal da Transparência SC e da SEF, só para consulta: as emendas do mandato e o andamento (empenho, liquidação, pagamento e OB), atualizado todo dia. O controle do gabinete fica na aba Controle.</p>
    <div class="fonte">Fontes: Portal da Transparência SC e painel de emendas da SEF${META.coletado_em ? ` · coletado em ${esc(dtBR(META.coletado_em))} ${esc(String(META.coletado_em).slice(11, 16))}` : ""}.</div>
    <div class="leqs">${leq("fAno", "Ano", [[0, "Todos"], ...anos.map((a) => [a, a])], S.ano)}</div>
    <div class="funil">${[1, 2, 3, 4, 5].map((k) => cont[k] ? `<i style="width:${cont[k] / L.length * 100}%;background:${ETAPAS[k][1]}" title="${ETAPAS[k][0]}: ${cont[k]}"></i>` : "").join("")}</div>
    <div class="funilL">${[1, 2, 3, 4, 5].map((k) => `<span data-et="${k}" class="${S.et.has(k) ? "" : "off"}"><i style="background:${ETAPAS[k][1]}"></i>${ETAPAS[k][0]} <b>${cont[k]}</b></span>`).join("")}</div>
    <section class="bx"><div class="bxh"><h2>Emendas no portal</h2><p>Só consulta. Clique numa emenda para ver a linha do tempo.</p></div>
      <div class="ctl"><input id="busca" placeholder="Município, objeto, beneficiário ou nº" value="${esc(S.busca)}"><select id="mod"><option value="">Todas as modalidades</option>${[...new Set(E.map((e) => e.mod).filter(Boolean))].sort().map((m) => `<option ${S.mod === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
      <div id="tab"></div></section>`;
}
function ligarGeral() {
  const vo = $("#voltaO"); if (vo) vo.onclick = () => { S.outro = null; desenhar(); };
  $("#fAno").onchange = (e) => { S.ano = +e.target.value; S.aberto = null; desenhar(); };
  $("#corpoAba").querySelectorAll("[data-et]").forEach((b) => b.onclick = () => { const k = +b.dataset.et; S.et.has(k) ? S.et.delete(k) : S.et.add(k); desenhar(); });
  const lt = $("#lentes"); if (lt) lt.onclick = (e) => { const b = e.target.closest("[data-l]"); if (!b) return; S.lente = b.dataset.l; desenhar(); };
  $("#busca").oninput = (e) => { S.busca = e.target.value; S.lim = 60; tabela(); };
  $("#mod").onchange = (e) => { S.mod = e.target.value; tabela(); };
  tabela();
}
// ---------- Meu controle: a planilha do gabinete (EM Consolidado), privada ----------
// siglas da origem no modo fechado: Emenda impositiva = EI, Excesso = Exc, Convênio Simplificado = CS; o resto vira iniciais
const SIG = [[/emenda impositiva/i, "EI"], [/excesso/i, "Exc"], [/conv[eê]nio simplificado/i, "CS"], [/conv[eê]nio/i, "Conv"], [/bancada/i, "Banc"], [/0[,.]55|55 ?%/i, "0,55%"], [/outros|informal/i, "Outros"]];
const sigla = (o) => { o = String(o || ""); const s = SIG.filter(([re]) => re.test(o)).map(([, x]) => x).filter((x, i, a) => !(x === "Conv" && a.includes("CS"))); return s.length ? s.join(" · ") : o.split(/\s+/).filter((w) => w.length > 2).map((w) => w[0].toUpperCase()).join(""); };
const OBS_I = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 3h11v8h-6l-3 2.5V11h-2z"/></svg>';
// status da planilha (emojis) lido em 3 etapas: indicação, instrumento (portaria/termo), pagamento/execução.
// Na tela: uma palavra e três micropontos (cheio = feito, vazio = falta, vermelho = verificar). O texto original fica no title.
function etapasStatus(s) {
  s = String(s || ""); if (/^Suprimida/.test(s)) return { t: "Suprimida", d: null };
  const ok = (re) => new RegExp("✅\\s*" + re, "i").test(s), and = (re) => new RegExp("🔄\\s*" + re, "i").test(s), ver = /🛑/.test(s);
  const fim = ok("(Pago|Executado)"), inst = ok("(Portaria|Termo)") || fim, d = [true, inst, fim];
  const t = ver ? "Verificar" : fim ? (ok("Pago") ? "Pago" : "Executado") : and("A ?Pagar") ? "A pagar" : and("Execu") ? "Em execução" : and("(Portaria|Aguardando)") ? "Aguardando" : inst ? "Portaria" : /🔄/.test(s) ? "Em andamento" : s.trim() ? "Indicada" : "—";
  const k = fim || and("(A ?Pagar|Execu)") ? 2 : inst || and("(Portaria|Aguardando)") ? 1 : 0;
  return { t, d, ver, k };
}
// ícones das 3 etapas (indicação, portaria, pago): acendem as etapas feitas; vermelho = a etapa travada (🛑). A palavra só com o item aberto
const ST_I = ['<path d="M4 2.5h6l2.5 2.5v8.5H4z M10 2.5V5h2.5 M6 8h4.5 M6 10.5h3"/>', '<circle cx="8" cy="6.5" r="3.5"/><path d="M5.8 9.3L5 14l3-1.6 3 1.6-.8-4.7"/>', '<circle cx="8" cy="8" r="5.5"/><path d="M9.8 6.2c-.4-.6-1-.9-1.8-.9-1 0-1.8.5-1.8 1.3 0 1.9 3.7 1 3.7 2.9 0 .8-.8 1.3-1.9 1.3-.8 0-1.5-.3-1.9-1 M8 4v1.3 M8 10.8V12"/>'];
const ST_N = ["Indicada", "Portaria", "Pago / executado"];
const stHtml = (s, aberto) => { const e = etapasStatus(s); if (!e.d) return `<span class="stx">${e.t}</span>`; const trav = e.ver ? e.d.indexOf(false) : -1;
  return `<span class="stx" title="${esc(e.t + (s ? " · planilha: " + s : ""))}">${aberto ? `<span class="stw">${e.t}</span>` : ""}<i>${ST_I.map((p, k) => `<svg viewBox="0 0 16 16" class="${e.d[k] ? "f" : ""}${k === trav ? " v" : ""}" aria-label="${ST_N[k]}${e.d[k] ? " feito" : ""}"><title>${ST_N[k]}</title>${p}</svg>`).join("")}</i></span>`; };
const mk = (r) => r.id || "p" + (r.origem_planilha ?? MEU.indexOf(r));
const supr = (r) => /^Suprimida/.test(r.status_manual || "");
function meu() {
  if (!PODE) return `<div class="obra">Entre com a sua conta para ver o seu controle.</div>`;
  const fLista = typeof opsListas === "function" && opsListas().length > 1 ? leq("fLista", "Lista", opsListas(), S.lista || "") : "";
  const ad = typeof adicionarHtml === "function" ? adicionarHtml() : "", topoC = (f) => `<p class="lead" style="margin-top:14px">O controle do gabinete: emendas, convênios e recursos informais, inclusive os que não aparecem no portal. Visível só para você.</p><div class="leqs cbar">${f}${ad}</div>`;
  if (S.lista && typeof painelLista === "function") return topoC(fLista) + painelLista();
  if (!MEU.length) return topoC(fLista) + blocoPrivado();
  const anos = [...new Set(MEU.map((r) => r.ano).filter(Boolean))].sort(), A = MEU.filter((r) => !S.mano || r.ano === S.mano), at = A.filter((r) => !supr(r)), sp = A.filter(supr);
  const tot = at.reduce((s, r) => s + (+r.valor || 0), 0), pago = at.filter((r) => r.ob || /pago|executado/i.test(r.status_manual || "")).reduce((s, r) => s + (+r.valor || 0), 0);
  return `${topoC(fLista + leq("fMano", "Ano", [[0, "Todos"], ...anos.map((a) => [a, a])], S.mano))}
    <section class="bx"><div id="mfil"></div><div id="mtab"></div></section>`;
}
function ligarMeu() {
  const fm0 = $("#fMano"); if (fm0) fm0.onchange = (e) => { S.mano = +e.target.value; desenhar(); };
  if ($("#mfil")) mfiltros();
  const imp = $("#impBtn"); if (imp) imp.onclick = importar;
  if ($("#mtab")) mtab();
}
// filtro do Controle: ícone que abre a pesquisa (texto, origem, etapa); fechado mostra só o ícone e quantos filtros estão ativos
const ETF = [["", "Todas as etapas"], ["0", "Só indicada"], ["1", "Com portaria"], ["2", "Pago / executado"], ["v", "Verificar"], ["s", "Suprimida"]];
function mfiltros() {
  const n = [S.mq, S.mori, S.met].filter(Boolean).length, oris = [...new Set(MEU.map((r) => sigla(r.origem)).filter(Boolean))].sort();
  $("#mfil").innerHTML = `<div class="mfb"><button class="filb${S.mfa ? " on" : ""}" id="filB" title="Filtrar e pesquisar"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5z"/></svg>Filtrar${n ? `<b>${n}</b>` : ""}</button>${n ? `<button class="filx" id="filX">Limpar</button>` : ""}</div>
    ${S.mfa ? `<div class="ctl mfp"><input id="mbusca" placeholder="Município, objeto, processo ou tag" value="${esc(S.mq || "")}">${leq("fOri", "Origem", [["", "Todas"], ...oris.map((o) => [o, o])], S.mori || "")}${leq("fEt", "Etapa", ETF, S.met || "")}</div>` : ""}`;
  $("#filB").onclick = () => { S.mfa = !S.mfa; mfiltros(); const b = $("#mbusca"); if (b) b.focus(); };
  const x = $("#filX"); if (x) x.onclick = () => { S.mq = ""; S.mori = ""; S.met = ""; mfiltros(); mtab(); };
  const bi = $("#mbusca"); if (bi) bi.oninput = (e) => { S.mq = e.target.value; S.mlim = 80; mtab(); };
  const fo = $("#fOri"); if (fo) fo.onchange = (e) => { S.mori = e.target.value; mfiltros(); mtab(); };
  const fe = $("#fEt"); if (fe) fe.onchange = (e) => { S.met = e.target.value; mfiltros(); mtab(); };
}
// função como ícone (saúde, educação, FUNDAM, agricultura, infraestrutura, segurança, social); etiqueta abaixo = natureza (investimento/custeio)
const FUN_I = [[/sa[uú]de/i, "Saúde", '<path d="M6 2.5h4v3.5h3.5v4H10v3.5H6V10H2.5V6H6z"/>'], [/educa/i, "Educação", '<path d="M1.5 6L8 3l6.5 3L8 9z M4.5 7.5V11c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5V7.5 M14.5 6v3.5"/>'],
  [/fundam|munic/i, "FUNDAM (municípios)", '<path d="M2 13.5h12 M3 13.5V7l5-3.5L13 7v6.5 M6.5 13.5V10h3v3.5"/>'], [/agric/i, "Agricultura", '<path d="M8 14V7 M8 7c0-2.5 2-4 4.5-4 0 2.5-2 4-4.5 4z M8 9.5C8 7.5 6.5 6 4 6c0 2 1.5 3.5 4 3.5z"/>'],
  [/infra|mobil/i, "Infraestrutura", '<path d="M5 14l1.5-11 M11 14L9.5 3 M8 4v1.5 M8 7.5V9 M8 11v1.5"/>'], [/segur/i, "Segurança", '<path d="M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z"/>'], [/social|assist/i, "Social", '<path d="M8 13.5S2.5 10 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10 8 13.5 8 13.5z"/>']];
const funHtml = (r) => { const f = FUN_I.find(([re]) => re.test(r.funcao || "")); const nat = r.natureza ? `<span class="nat">${esc(r.natureza)}</span>` : "";
  return f ? `<span class="fun" title="${esc(r.funcao)}"><svg viewBox="0 0 16 16">${f[2]}</svg></span>${nat}` : `${esc(r.funcao || "—")}${nat}`; };
const MCOL = [["ano", "Ano", (r) => +r.ano || 0], ["mun", "Município", (r) => norm(r.municipio)], ["obj", "Objeto", (r) => norm(r.objeto), "hm"], ["fun", "Função", (r) => norm(r.funcao), "hm"], ["v", "R$", (r) => +r.valor || 0], ["st", "Status", (r) => { const e = etapasStatus(r.status_manual); return e.d ? e.d.filter(Boolean).length - (e.ver ? .5 : 0) : -1; }], ["pr", "Processo", (r) => norm(r.processo), "hm"], ["obs", "", (r) => balao(r)[1], "hm"], ["inf", "Observações", (r) => (r.tags || []).length, "hm"]];
// balão: cinza claro = sem observação; branco = tem observação; verde = nota nova (não vista); laranja = marcado para atenção
const visto = (r) => { try { return localStorage.getItem("gab_visto_" + mk(r)) || ""; } catch (e) { return ""; } };
const balao = (r) => { const ul = (r.notas || []).slice(-1)[0];
  if (r.atencao) return ["at", 4, "Marcado para atenção"]; if (ul && ul.em > visto(r)) return ["nv", 3, "Nova nota: " + ul.t]; if (r.observacao || (r.notas || []).length) return ["tem", 2, r.observacao || ul.t]; return ["", 1, "Sem observação"]; };
function mtab() {
  const q = norm(S.mq), L = MEU.filter((r) => { if (S.mano && r.ano !== S.mano) return false; if (q && !norm([r.municipio, r.objeto, r.numero, r.processo, (r.tags || []).join(" "), r.origem, r.observacao].join(" ")).includes(q)) return false;
    if (S.mori && sigla(r.origem) !== S.mori) return false;
    if (S.met) { const e = etapasStatus(r.status_manual); if (S.met === "s" ? e.d : !e.d) return false; if (S.met === "v" && !e.ver) return false; if (/^\d$/.test(S.met) && (e.d.lastIndexOf(true) !== +S.met)) return false; }
    return true; });
  if (S.mord) { const c = MCOL.find((x) => x[0] === S.mord[0]), d = S.mord[1]; L.sort((a, b) => { const x = c[2](a), y = c[2](b); return (x > y ? 1 : x < y ? -1 : 0) * d; }); }
  $("#mtab").innerHTML = `<table class="tb mt ct"><thead><tr>${MCOL.map(([k, t, , c]) => `<th data-mo="${k}" class="so${c ? " " + c : ""}${S.mord && S.mord[0] === k ? " on" : ""}">${t}<i>${S.mord && S.mord[0] === k ? (S.mord[1] > 0 ? "↑" : "↓") : "↕"}</i></th>`).join("")}</tr></thead><tbody>${L.slice(0, S.mlim).map((r) => `<tr class="r${supr(r) ? " sup" : ""}${S.maberto === mk(r) ? " ab" : ""}" data-id="${esc(mk(r))}"><td>${S.maberto === mk(r) ? (r.ano || "") : r.ano ? String(r.ano).slice(-2) : ""}<small title="${esc(r.origem || "")}">${esc(S.maberto === mk(r) ? r.origem || "" : sigla(r.origem))}</small></td><td>${esc(r.municipio || "")}<small>${esc(r.regiao || "")}</small></td><td class="hm">${esc(r.objeto || "")}</td><td class="hm">${funHtml(r)}</td><td class="vi">${"R$ " + ni(Math.round(+r.valor || 0))}</td><td>${stHtml(r.status_manual, S.maberto === mk(r))}</td><td class="hm">${(() => { const m = String(r.processo || "").match(/^\s*([A-Za-zÀ-ú]+)\s*(.*)$/); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(r.processo || ""); })()}</td><td class="hm inf">${(() => { const [c, , t] = balao(r); return `<span class="obs ${c}" title="${esc(t)}" aria-label="${esc(t)}">${OBS_I}</span>`; })()}</td><td class="hm inf">${(r.tags || []).length ? `<small>${r.tags.map((t) => `<span class="tg">${esc(t)}</span>`).join("")}</small>` : ""}</td></tr>${S.maberto === mk(r) ? `<tr class="det"><td colspan="9">${detalheMeu(r)}</td></tr>` : ""}`).join("")}</tbody></table>
    ${L.length > S.mlim ? `<button class="btn sec mais" id="mmais">Mostrar mais (${L.length - S.mlim})</button>` : ""}<div class="av"><b>${ni(L.length)}</b> linhas</div>`;
  const m = $("#mmais"); if (m) m.onclick = () => { S.mlim += 200; mtab(); };
  $("#mtab").querySelectorAll("th[data-mo]").forEach((th) => th.onclick = () => { const k = th.dataset.mo; S.mord = S.mord && S.mord[0] === k ? (S.mord[1] < 0 ? null : [k, -1]) : [k, 1]; mtab(); });
  $("#mtab").querySelectorAll("tr.r").forEach((tr) => tr.onclick = () => { S.maberto = S.maberto === tr.dataset.id ? null : tr.dataset.id; if (S.maberto) try { localStorage.setItem("gab_visto_" + S.maberto, new Date().toISOString()); } catch (e) {} mtab(); });
  const d = $("#mtab .det"); if (d) ligarMeuDet(d, MEU.find((r) => mk(r) === S.maberto));
}
// ---------- item do Controle aberto: andamento oficial (quando ligado a uma emenda do portal), dados da planilha,
// anotações e as ações Editar, Substituir (trocar a emenda oficial ligada) e Excluir ----------
function detalheMeu(r) {
  const e = r.chave && E0.find((x) => x.k === r.chave);
  const es = etapasStatus(r.status_manual), S3 = es.d || [false, false, false], dt = (x) => x ? dtBR(String(x)) : "";
  const passos = [["Indicada", true, `${r.ano || ""}${r.valor ? " · " + fr(+r.valor) : ""}`], ["Portaria / instrumento", S3[1] || es.k >= 1, r.publicacao || (S3[1] ? "concluída" : es.k === 1 ? "em andamento" : "")],
    ["Empenhada", !!r.empenho || S3[2], r.empenho || ""], ["Paga / executada", S3[2], [r.ob, dt(r.data_pagamento), r.pagamento].filter(Boolean).join(" · ")]];
  const topo = e ? detalhe(e, true).replace('<ul class="tl">', '<ul class="tl hz">') : `<div class="dg"><div><div class="olho" style="margin-bottom:8px">Andamento <small style="text-transform:none;letter-spacing:0;color:var(--ter)">pela planilha</small></div><ul class="tl hz">${passos.map(([t, on, d], i) => `<li class="${on ? "on" : ""}${es.ver && !on && (i === 0 || passos[i - 1][1]) ? " imp" : ""}"><b>${t}</b><span>${esc(d || (on ? "" : "pendente"))}</span></li>`).join("")}</ul><div class="av" style="margin:8px 0 0">Sem emenda ligada no portal. Use "Substituir" para ligar a uma emenda oficial, se houver.</div></div>
    <div><div class="kv"><span>Processo SCC</span><b>${esc(r.processo || "não informado")}</b><span>Nº na planilha</span><b>${esc(r.numero || "—")}</b><span>Origem</span><b>${esc(r.origem || "não informada")}${r.ano ? " · " + r.ano : ""}</b><span>Beneficiário</span><b>${esc(r.beneficiario || "—")}</b></div></div></div>`;
  return `${topo}<div class="anot"><div class="olho">Anotações do gabinete</div>
    <label>Liderança<input data-f="lideranca" value="${esc(r.lideranca || (r.tags || []).filter((t) => !/^(Lista|of\.|10M|1º|Set|PT aj|ñ |⁉)/.test(t)).join(", ") || "")}" placeholder="Quem indicou ou acompanha"></label>
    <label>Observação<textarea data-f="observacao" rows="3" placeholder="Situação, contatos, próximos passos">${esc(r.observacao || "")}</textarea></label>
    <div class="notas">${(r.notas || []).slice().reverse().map((n) => `<div><span>${dtBR(n.em)}</span>${esc(n.t)}</div>`).join("")}${r.status_manual ? `<div><span>planilha</span>${esc(r.status_manual)}</div>` : ""}</div>
    <div class="nova"><input data-nova placeholder="Nova nota de status (ex.: plano de trabalho enviado)"><button class="btn sec" data-addnota>Anotar</button></div>
    <div class="acs"><button class="btn" data-salvar>Salvar anotações</button><span class="av" data-msg></span><span style="margin-left:auto;display:flex;gap:8px"><button class="btn sec" data-atencao style="${r.atencao ? "color:#F29A38;border-color:#F29A38" : ""}">${r.atencao ? "Tirar atenção" : "Marcar atenção"}</button><button class="btn sec" data-editar>Editar</button><button class="btn sec" data-subst>Substituir</button><button class="btn sec" data-excl style="color:var(--erro)">Excluir</button></span></div></div>`;
}
async function gravaMeu(r, campos) {
  if (LOCAL && !SESS) { Object.assign(r, campos); }
  else { const { error } = await supabaseClient.from("gab_recursos").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", r.id); if (error) throw error; Object.assign(r, campos); }
  if (r.chave) PRIV[r.chave] = r;
}
function ligarMeuDet(d, r) {
  if (!r) return; const a = d.querySelector(".anot"), msg = a.querySelector("[data-msg]"); d.onclick = (e) => e.stopPropagation();
  const salvar = async (nova) => { msg.textContent = "Salvando…";
    try { await gravaMeu(r, { lideranca: a.querySelector('[data-f="lideranca"]').value.trim() || null, observacao: a.querySelector('[data-f="observacao"]').value.trim() || null, notas: [...(r.notas || []), ...(nova ? [{ t: nova, em: new Date().toISOString() }] : [])] }); msg.textContent = "Salvo."; if (nova) mtab(); } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); } };
  a.querySelector("[data-salvar]").onclick = () => salvar(null);
  a.querySelector("[data-addnota]").onclick = () => { const v = a.querySelector("[data-nova]").value.trim(); if (v) salvar(v); };
  a.querySelector("[data-atencao]").onclick = async () => { try { await gravaMeu(r, { atencao: !r.atencao }); mtab(); } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); } };
  a.querySelector("[data-editar]").onclick = () => modal(`<div class="mh"><div><div class="olho">Controle</div><h3>Editar recurso</h3></div><button class="x" data-fecha>×</button></div>
    <div class="fsec"><div class="fg">${campo("Município", inp("municipio", r.municipio))}${campo("Valor (R$)", inp("valor", r.valor, "", "number"))}${campo("Objeto", `<textarea data-f="objeto" rows="2">${esc(r.objeto || "")}</textarea>`, 1)}
      ${campo("Ano", inp("ano", r.ano, "", "number"))}${campo("Nº", inp("numero", r.numero))}${campo("Origem", inp("origem", r.origem, "Emenda impositiva, convênio, outros"))}${campo("Função", inp("funcao", r.funcao))}${campo("Modalidade", inp("modalidade", r.modalidade))}${campo("Natureza", sel("natureza", ["Investimento", "Custeio"], r.natureza, "—"))}${campo("Beneficiário", inp("beneficiario", r.beneficiario))}${campo("Processo SCC", inp("processo", r.processo))}${campo("Status", inp("status_manual", r.status_manual))}</div></div>
    <div class="mrod"><span class="av" data-msg></span><button class="btn sec" data-fecha>Cancelar</button><button class="btn" data-salva>Salvar</button></div>`, (m, fechar) => {
      m.querySelector("[data-salva]").onclick = async () => { const o = lerCampos(m), ms = m.querySelector("[data-msg]"); o.valor = o.valor ? +o.valor : null; o.ano = o.ano ? +o.ano : null; ms.textContent = "Salvando…";
        try { await gravaMeu(r, o); fechar(); mtab(); } catch (er) { ms.textContent = "Não foi possível salvar: " + (er.message || er); } }; });
  a.querySelector("[data-subst]").onclick = () => { const ops = E0.slice().sort((x, y) => (y.ano - x.ano) || String(x.mun).localeCompare(y.mun, "pt-BR"));
    modal(`<div class="mh"><div><div class="olho">Controle</div><h3>Substituir emenda ligada</h3></div><button class="x" data-fecha>×</button></div>
    <p class="lead">Escolha a emenda oficial do portal que corresponde a este recurso. Hoje: <b>${esc(r.chave || "nenhuma")}</b>.</p>
    <div class="fsec"><div class="fg">${campo("Emenda do portal", `<input data-f="nova" list="adEms" placeholder="Digite município, objeto ou código"><datalist id="adEms">${ops.map((e) => `<option value="${esc(e.k)}">${esc(e.ano + " · " + e.mun + " · " + frase(e.obj).slice(0, 70) + " · " + fm(e.v))}</option>`).join("")}</datalist>`, 1)}</div></div>
    <div class="mrod"><button class="btn sec" data-solta>Desligar do portal</button><span class="av" data-msg></span><button class="btn sec" data-fecha>Cancelar</button><button class="btn" data-salva>Substituir</button></div>`, (m, fechar) => {
      const ok = async (k) => { const ms = m.querySelector("[data-msg]"); if (k && !E0.some((e) => e.k === k)) { ms.textContent = "Código não encontrado no portal."; return; } ms.textContent = "Salvando…";
        try { if (r.chave && PRIV[r.chave] === r) delete PRIV[r.chave]; await gravaMeu(r, { chave: k || null }); fechar(); mtab(); } catch (er) { ms.textContent = "Não foi possível salvar: " + (er.message || er); } };
      m.querySelector("[data-salva]").onclick = () => ok(m.querySelector('[data-f="nova"]').value.trim());
      m.querySelector("[data-solta]").onclick = () => ok(null); }); };
  const ex = a.querySelector("[data-excl]"); ex.onclick = async () => { if (ex.dataset.ok !== "1") { ex.dataset.ok = "1"; ex.textContent = "Confirmar exclusão"; return; }
    try { if (!(LOCAL && !SESS)) { const { error } = await supabaseClient.from("gab_recursos").delete().eq("id", r.id); if (error) throw error; }
      MEU.splice(MEU.indexOf(r), 1); if (r.chave && PRIV[r.chave] === r) delete PRIV[r.chave]; S.maberto = null; desenhar(); } catch (er) { msg.textContent = "Não foi possível excluir: " + (er.message || er); } };
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
// ---------- Carteira (inspirada na planilha do gabinete): município primeiro, valor e pago numa barra só,
// etapa compacta; ao abrir: linha do tempo vertical, código, processo SCC, origem e anotações editáveis ----------
const frase = (t) => { t = String(t || "").trim().replace(/\s+/g, " "); return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : ""; };
const ORIGEM = { "Emenda LOA": ["Emenda impositiva", "prevista na Lei Orçamentária Anual (LOA) do ano, dentro da cota individual de cada deputado"], "Emenda 0.55%": ["Emenda impositiva adicional (0,55%)", "parcela adicional de emendas individuais, calculada sobre a receita, aprovada em lei específica do ano"], "Excesso": ["Excesso de arrecadação", "recurso extra, distribuído quando a receita do Estado supera a prevista na LOA"] };
const ETQ = { 1: ["Indicada", "#8A9096"], 2: ["Empenhada", "#8FA8E8"], 3: ["Em pagamento", "#C6E62A"], 4: ["Paga", "#34E84A"], 5: ["Impedida", "#E8432A"] };
function tabela() {
  const L = filtradas().sort((a, b) => { const [c, d] = S.ord, x = c === "obj" ? frase(a.obj) : a[c] ?? "", y = c === "obj" ? frase(b.obj) : b[c] ?? ""; return (x > y ? 1 : x < y ? -1 : 0) * d; });
  const cab = [["mun", "Município"], ["obj", "Objeto"], ["mod", "Modalidade", "hm"], ["v", "Valor · pago", "v"], ["et", "Etapa"]];
  $("#tab").innerHTML = `<table class="tb ct"><thead><tr>${cab.map(([k, r, c]) => `<th data-o="${k}" class="${c || ""}">${r}${S.ord[0] === k ? (S.ord[1] > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead><tbody>${L.slice(0, S.lim).map((e) => linha(e)).join("")}</tbody></table>
    ${L.length > S.lim ? `<button class="btn sec mais" id="mais">Mostrar mais (${L.length - S.lim})</button>` : ""}<div class="av"><b>${ni(L.length)}</b> emendas · ${fm(L.reduce((s, e) => s + (e.v || 0), 0))} indicados · ${fm(L.reduce((s, e) => s + (e.vp || 0), 0))} pagos</div>`;
  $("#tab").querySelectorAll("tr.r").forEach((tr) => tr.onclick = () => { S.aberto = S.aberto === tr.dataset.k ? null : tr.dataset.k; tabela(); });
  $("#tab").querySelectorAll("th[data-o]").forEach((th) => th.onclick = () => { const k = th.dataset.o; S.ord = [k, S.ord[0] === k ? -S.ord[1] : (k === "v" ? -1 : 1)]; tabela(); });
  const m = $("#mais"); if (m) m.onclick = () => { S.lim += 100; tabela(); };
}
function linha(e) {
  const ab = S.aberto === e.k, pc = e.v ? Math.min(1, (e.vp || 0) / e.v) : 0, [et, cor] = ETQ[e.et];
  return `<tr class="r${ab ? " ab" : ""}" data-k="${esc(e.k)}"><td><b>${esc(e.mun)}</b><small>${esc(e.assoc || "")}</small></td><td>${esc(frase(e.obj))}<small>${esc(e.benef ? frase(e.benef) : "")}</small></td><td class="hm">${esc(e.mod || "")}</td>
    <td class="v vp"><b>${fm(e.v)}</b><span class="vb"><i style="width:${(pc * 100).toFixed(0)}%"></i></span><small>${pc >= .995 ? "pago" : pc ? nf(pc * 100, 0) + "% pago" : "não pago"}</small></td>
    <td><span class="etc" style="--c:${cor}">${et}</span></td></tr>${ab ? `<tr class="det"><td colspan="5">${detalhe(e)}</td></tr>` : ""}`;
}
// priv = false (Transparência SC): só o que consta nos painéis da SEF e do TCE; true (Controle): soma os dados do gabinete
function detalhe(e, priv) {
  const X = e.extrato_portal || {}, ne = (X.emendaEmpenho || [])[0], nl = (X.emendaLiquidacao || [])[0], pg = (e.pagamentos_sef || []);
  const passos = [["Indicada", true, `${e.mod || ""} · ${fr(e.v)}`], ["Empenhada", e.et >= 2 && e.et !== 5 || !!ne, ne ? `${ne.nunotaempenho || ""} · ${dtBR(ne.dtlancamento || "")}` : ""], ["Liquidada", e.et >= 3 && e.et !== 5, nl ? `${nl.nunotaliquidacao || ""} · ${dtBR(nl.dtlancamento || "")}` : ""],
    ["Paga", e.et === 4, pg.length ? pg.map(([, , pp, ob, dt, v]) => `${dtBR(dt)} · ${fr(v)}${ob ? " · " + ob : ""}`).join("<br>") : e.vp ? fr(e.vp) + " pagos" : "ainda não paga"]];
  if (e.et === 5) passos.push(["Impedimento técnico", true, esc(e.imped || "")]);
  const p = priv && PRIV && PRIV[e.k], [o1, o2] = ORIGEM[e.tipo] || [e.tipo || "não informada", ""], scc = (p && p.processo) || e.sgpe;
  const ed = false; // Transparência SC é só consulta; anotações e controle ficam na aba Controle
  return `<div class="dg"><div><div class="olho" style="margin-bottom:8px">Andamento</div><ul class="tl">${passos.map(([t, on, d]) => `<li class="${on ? "on" : ""}${t.startsWith("Imp") ? " imp" : ""}"><b>${t}</b><span>${d || (on ? "" : "pendente")}</span></li>`).join("")}</ul></div>
    <div><div class="kv"><span>Processo SCC</span><b>${scc ? esc(scc) : "não informado"}</b><span>Código da emenda</span><b>${esc(e.n || e.k)} <small style="color:var(--ter);font-weight:400">(nº oficial na SEF)</small></b>
    <span>Origem</span><b>${esc(o1)} · ${e.ano}${o2 ? `<small style="display:block;color:var(--ter);font-weight:400">${esc(o2)}</small>` : ""}${p && p.origem && norm(p.origem) !== norm(o1) ? `<small style="display:block;color:var(--sec);font-weight:400">Na planilha: ${esc(p.origem)}</small>` : ""}</b>
    <span>Beneficiário</span><b>${esc(frase(e.benef || ""))}${e.doc ? `<small style="display:block;color:var(--ter);font-weight:400">${esc(e.doc)}</small>` : ""}</b></div>
    ${ed ? `<div class="anot" data-k="${esc(e.k)}"><div class="olho">Anotações do gabinete</div>
      <label>Liderança<input data-f="lideranca" value="${esc((p && (p.lideranca || (p.tags || []).filter((t) => !/^(Lista|of\.|10M|1º|Set|PT aj|ñ |⁉)/.test(t)).join(", "))) || "")}" placeholder="Quem indicou ou acompanha"></label>
      <label>Observação<textarea data-f="observacao" rows="3" placeholder="Situação, contatos, próximos passos">${esc((p && p.observacao) || "")}</textarea></label>
      <div class="notas">${((p && p.notas) || []).slice().reverse().map((n) => `<div><span>${dtBR(n.em)}</span>${esc(n.t)}</div>`).join("")}${p && p.status_manual ? `<div><span>planilha</span>${esc(p.status_manual)}</div>` : ""}</div>
      <div class="nova"><input data-nova placeholder="Nova nota de status (ex.: plano de trabalho enviado)"><button class="btn sec" data-addnota>Anotar</button></div>
      <div class="acs"><button class="btn" data-salvar>Salvar anotações</button><span class="av" data-msg></span></div></div>` : ""}</div></div>`;
}
function ligarNotas(d) {
  const a = d.querySelector(".anot"); if (!a) return; a.onclick = (e) => e.stopPropagation();
  const k = a.dataset.k, e0 = E.find((x) => x.k === k), msg = a.querySelector("[data-msg]");
  const salvar = async (novaNota) => {
    const p = PRIV[k] || {}, campos = { lideranca: a.querySelector('[data-f="lideranca"]').value.trim() || null, observacao: a.querySelector('[data-f="observacao"]').value.trim() || null, notas: [...(p.notas || []), ...(novaNota ? [{ t: novaNota, em: new Date().toISOString() }] : [])] };
    msg.textContent = "Salvando…";
    try {
      if (LOCAL && !SESS) { PRIV[k] = { ...p, ...campos }; }
      else if (p.id) { const { error } = await supabaseClient.from("gab_recursos").update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", p.id); if (error) throw error; PRIV[k] = { ...p, ...campos }; }
      else { const { data, error } = await supabaseClient.from("gab_recursos").insert({ chave: k, ano: e0.ano, origem: e0.tipo, municipio: e0.mun, objeto: e0.obj, valor: e0.v, modalidade: e0.mod, ...campos }).select().single(); if (error) throw error; PRIV[k] = data; MEU.push(data); }
      msg.textContent = "Salvo."; if (novaNota) tabela();
    } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); }
  };
  a.querySelector("[data-salvar]").onclick = () => salvar(null);
  a.querySelector("[data-addnota]").onclick = () => { const v = a.querySelector("[data-nova]").value.trim(); if (v) salvar(v); };
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
