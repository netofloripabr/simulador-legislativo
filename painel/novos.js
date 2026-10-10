// Novos Parlamentares — protótipo (10/10/2026). Seleção de perfil → manual do mandato.
// Dados: dados/painel (sc-base, sc-estadual), seções por município e mapas de bairros (IBGE).
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x).toLocaleString("pt-BR"), nf = (x, d = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const DV = "20261008a";
const slugArq = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
// cor de destaque por partido (identidade de cada legenda, ajustada para fundo escuro)
const COR_P = { "NOVO": "#F37021", "PL": "#3D7BFF", "PT/PC do B/PV": "#E5383B", "MDB": "#34C759", "UNIÃO/PP": "#2FB5E8", "PSD": "#F2C230", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PDT": "#E5484D", "PSOL/REDE": "#F5B700" };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
// biografias: SÓ com fonte pública citada; quem não tiver fica com foto, partido e votação
const BIO = {
  "30300": { txt: ["Nascido em Campo Erê, em 1962, é formado em Direito pela UFSC, com especialização em Direito Penal e Processual Penal e mestrado em Ciência Jurídica. Professor de Direito da Furb desde 1990.", "Promotor de Justiça do Ministério Público de Santa Catarina desde 1988, atuou na comarca de Blumenau, onde foi o primeiro coordenador do Gaeco (combate ao crime organizado), de 2016 a 2018.", "No NOVO desde 2020: disputou a Prefeitura de Blumenau naquele ano (3º lugar, 22.846 votos) e o Governo do Estado em 2022. Em 2026, chega à Assembleia."], fonte: "Fontes: NSC Total, Gazeta do Povo e Partido Novo (perfis de 2022); TSE (2026)." },
};
let M, N, CONT, D, VAL;

async function carregar() {
  const [b, d] = await Promise.all([fetch(`../dados/painel/sc-base.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/sc-estadual.json?v=${DV}`).then((r) => r.json())]);
  M = b.mun; N = M.length; CONT = b.contorno; D = d; VAL = d.val.reduce((s, x) => s + x, 0);
}
const eleitos = () => D.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => b.t - a.t);

// ---------------- 1. seleção de perfil ----------------
function telaSelecao() {
  document.documentElement.style.setProperty("--a", "#34E84A"); document.documentElement.style.setProperty("--a-rgb", "52,232,74");
  const E = eleitos();
  $("#app").innerHTML = `<div class="wrap sel"><div class="olho">Legislatura 2027–2031 · Assembleia Legislativa de Santa Catarina</div><h1>Bem-vindo ao<br><i>seu mandato.</i></h1>
    <p class="lead">Escolha o deputado. Montamos juntos o retrato da eleição, a estrutura política da Casa, o calendário do mandato e o planejamento do gabinete — e no fim sai o caderno impresso.</p>
    <input class="busca" id="busca" placeholder="Buscar deputado ou partido">
    <div class="grade" id="grade">${E.map((c, i) => `<button class="perf" data-n="${c.n}" style="--pc:${COR_P[c.p] || "#8A9096"};animation-delay:${i * 25}ms"><img src="${foto(c.n)}" alt="" loading="lazy"><span class="pt">${esc(c.p)}</span><div class="tx"><b>${esc(c.u)}</b><span>${ni(c.t)} votos</span></div></button>`).join("")}</div></div>`;
  $("#busca").oninput = (e) => { const q = e.target.value.toLowerCase(); document.querySelectorAll(".perf").forEach((b) => { b.hidden = q && !b.textContent.toLowerCase().includes(q); }); };
  $("#grade").onclick = (e) => { const b = e.target.closest(".perf"); if (b) { history.pushState(null, "", "?d=" + b.dataset.n); abrir(b.dataset.n); } };
  scrollTo(0, 0);
}

// ---------------- 2. manual ----------------
async function abrir(n) {
  const c = D.c.find((x) => x.n === n); if (!c) return telaSelecao();
  const cor = COR_P[c.p] || "#34E84A"; document.documentElement.style.setProperty("--a", cor); document.documentElement.style.setProperty("--a-rgb", hexRgb(cor));
  const E = eleitos(), pos = E.findIndex((x) => x.n === n) + 1, idx = [...Array(N).keys()];
  const ordM = idx.filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]), top = ordM[0], cid = M[top];
  const reg = cid.meso, idxR = idx.filter((i) => M[i].meso === reg), totR = idxR.reduce((s, i) => s + c.v[i], 0);
  const rankR = D.c.map((x) => ({ x, v: idxR.reduce((s, i) => s + (x.v[i] || 0), 0) })).sort((a, b) => b.v - a.v), posR = rankR.findIndex((o) => o.x.n === n) + 1;
  const bio = BIO[n], nm = c.nome || c.u;
  $("#app").innerHTML = `<div class="man">
    <section class="wrap capa"><div><div class="olho">Eleições 2026 · Deputado estadual · ${esc(c.p)}</div>
      <h1>Parabéns,<br><i>${esc(c.u)}.</i></h1>
      <div class="placar"><div><b class="a">${ni(c.t)}</b><span>votos</span></div><div><b>${pos}º</b><span>entre os 40 eleitos</span></div><div><b>${nf(c.t / VAL * 100, 2)}%</b><span>dos válidos</span></div><div><b>${ordM.length}</b><span>municípios com voto</span></div></div>
      ${bio ? `<div class="bio">${bio.txt.map((t) => `<p>${esc(t)}</p>`).join("")}<div class="fonte">${esc(bio.fonte)}</div></div>` : `<div class="bio"><p>${esc(nm)} · ${esc(c.s || "")}</p></div>`}
      <div style="display:flex;gap:10px;margin-top:22px;position:relative"><a class="btn" href="#cap1">Começar ↓</a><button class="btn sec" id="trocar">Trocar deputado</button></div></div>
      <div class="ft"><img src="${foto(n)}" alt=""></div></section>

    <section class="cap" id="cap1"><div class="wrap"><div class="olho">Capítulo 1 · A eleição</div><h2>Onde estão os<br><i>seus votos.</i></h2>
      <p class="sub">Da rua ao estado: a cidade que mais votou, os bairros e colégios, a região e Santa Catarina inteira.</p>
      <div class="scr"><div class="passos">
        <div class="p" data-f="0"><div class="num">${ni(c.v[top])}</div><h3>${esc(cid.n)}, a sua base</h3><p>${nf(c.v[top] / c.t * 100)}% de toda a sua votação veio daqui — ${nf(c.v[top] / D.val[top] * 100)}% dos votos válidos da cidade.</p><p>No mapa, cada círculo é um local de votação: quanto maior, mais votos.</p><div id="topLocais"></div></div>
        <div class="p" data-f="1"><div class="num">${posR}º</div><h3>na região ${esc(reg)}</h3><p>${ni(totR)} votos em ${idxR.filter((i) => c.v[i]).length} municípios da região (${nf(totR / c.t * 100)}% do total).</p><ol class="rank">${ordM.filter((i) => M[i].meso === reg).slice(0, 8).map((i) => `<li><span>${esc(M[i].n)}</span><b>${ni(c.v[i])}</b></li>`).join("")}</ol></div>
        <div class="p" data-f="2"><div class="num">${ordM.length}</div><h3>municípios em Santa Catarina</h3><p>${nf(ordM.length / N * 100, 0)}% dos 295 municípios deram ao menos um voto. ${c.s ? esc(c.s) + "." : ""}</p><ol class="rank">${E.slice(Math.max(0, pos - 3), pos + 2).map((x) => `<li class="${x.n === n ? "eu" : ""}"><span>${E.indexOf(x) + 1}º · ${esc(x.u)} <small style="color:var(--ter)">${esc(x.p)}</small></span><b>${ni(x.t)}</b></li>`).join("")}</ol></div>
      </div>
      <div class="fig"><div class="fc"><div class="on" data-fi="0" id="fig0"><div class="olho">${esc(cid.n)} · bairros e locais de votação</div></div><div data-fi="1" id="fig1"></div><div data-fi="2" id="fig2"></div></div></div></div></div></section>
  </div>`;
  $("#trocar").onclick = () => { history.pushState(null, "", location.pathname); telaSelecao(); };
  $("#fig1").innerHTML = `<div class="olho">Região ${esc(reg)}</div>${mapaSC(c, (i) => M[i].meso === reg)}<div class="leg">Círculo = votos no município · região em destaque</div>`;
  $("#fig2").innerHTML = `<div class="olho">Santa Catarina</div>${mapaSC(c, () => true)}<div class="leg">295 municípios · tamanho = votos</div>`;
  rolagem(); scrollTo(0, 0);
  const [ml, locais] = await mapaBairros(cid.n, c); $("#fig0").insertAdjacentHTML("beforeend", ml);
  $("#topLocais").innerHTML = locais.length ? `<ol class="rank">${locais.slice(0, 6).map(([l, v]) => `<li><span>${esc(l)}</span><b>${ni(v)}</b></li>`).join("")}</ol>` : "";
}

// mapa de SC com bolhas por município; destaque = filtro de região
function mapaSC(c, dentro) {
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; CONT.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 640, S = W / ((lo1 - lo0) * K), H = (la0 - la1) * S, P = (lo, la) => [(lo - lo0) * K * S, (la0 - la) * S];
  const pth = (an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("");
  const fundo = CONT.map((an, i) => `<path d="${pth(an)}" fill="${dentro(i) ? "rgba(var(--a-rgb),.10)" : "rgba(242,244,245,.03)"}" stroke="${dentro(i) ? "rgba(var(--a-rgb),.35)" : "rgba(242,244,245,.07)"}" stroke-width=".6"/>`).join("");
  const mx = Math.max(...c.v);
  const bol = [...Array(N).keys()].filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]).map((i) => { const [x, y] = P(M[i].lon, M[i].lat), r = 2 + 22 * Math.sqrt(c.v[i] / mx), on = dentro(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(var(--a-rgb),${on ? .55 : .14})" stroke="${on ? "var(--a)" : "rgba(var(--a-rgb),.3)"}" stroke-width=".8"><title>${esc(M[i].n)}: ${ni(c.v[i])}</title></circle>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" preserveAspectRatio="xMidYMid meet"><defs><filter id="gl${dentro.length}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>${fundo}<g filter="url(#gl${dentro.length})" opacity=".5">${bol}</g>${bol}</svg>`;
}
// bairros (IBGE) + locais de votação da cidade-base
async function mapaBairros(cidade, c) {
  let g, s; try { [g, s] = await Promise.all([fetch(`../dados/mapas/bairros-sc/${slugArq(cidade)}.json`).then((r) => r.json()), fetch(`../dados/resultados/sc-2026/secoes/${slugArq(cidade)}.json`).then((r) => r.json())]); } catch (e) { return ["", []]; }
  const v = (s.estadual || {})[c.n] || {}, porLocal = {}; Object.entries(s._secoes || {}).forEach(([sk, ln]) => { porLocal[ln] = (porLocal[ln] || 0) + (v[sk] || 0); });
  const ls = Object.entries(g.l).map(([nm, [x, y]]) => ({ nm, x, y, v: porLocal[nm] || 0 })).filter((o) => o.v), mx = Math.max(1, ...ls.map((o) => o.v));
  const fundo = g.c ? `<path d="${g.c}" fill="rgba(242,244,245,.04)" stroke="rgba(242,244,245,.2)"/>` : g.b.map(([, dd]) => `<path d="${dd}" fill="rgba(242,244,245,.035)" fill-rule="evenodd" stroke="rgba(242,244,245,.12)" stroke-width=".8"/>`).join("");
  const lab = g.b ? g.b.map(([nm, , [x, y]]) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" font-weight="600" fill="rgba(242,244,245,.38)">${esc(nm)}</text>`).join("") : "";
  const bol = ls.sort((a, b) => b.v - a.v).map((o) => `<circle cx="${o.x}" cy="${o.y}" r="${(3 + 22 * Math.sqrt(o.v / mx)).toFixed(1)}" fill="rgba(var(--a-rgb),.5)" stroke="var(--a)" stroke-width="1"><title>${esc(o.nm)}: ${ni(o.v)}</title></circle>`).join("");
  const top = Object.entries(porLocal).filter(([, x]) => x).sort((a, b) => b[1] - a[1]);
  return [`<svg viewBox="0 0 ${g.w} ${g.h}" preserveAspectRatio="xMidYMid meet"><defs><filter id="gb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter></defs>${fundo}${lab}<g filter="url(#gb)" opacity=".55">${bol}</g>${bol}</svg><div class="leg">${g.c ? "Contorno do município (sem bairros no IBGE)" : "Bairros: IBGE, Censo 2022"} · círculo = local de votação · ${ls.length} locais com voto</div>`, top];
}
// rolagem em foco: o passo no centro da tela acende e troca a figura presa
function rolagem() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; const p = e.target, cap = p.closest(".cap");
    cap.querySelectorAll(".p").forEach((x) => x.classList.toggle("on", x === p)); cap.querySelectorAll("[data-fi]").forEach((f) => f.classList.toggle("on", f.dataset.fi === p.dataset.f)); }), { rootMargin: "-45% 0px -45% 0px" });
  document.querySelectorAll(".passos .p").forEach((p) => io.observe(p));
}

(async () => {
  await carregar();
  const d = new URLSearchParams(location.search).get("d");
  d ? abrir(d) : telaSelecao();
  addEventListener("popstate", () => { const x = new URLSearchParams(location.search).get("d"); x ? abrir(x) : telaSelecao(); });
})();
