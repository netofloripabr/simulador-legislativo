// Parlamentares — protótipo (10/10/2026). Roda de nomes → perfil em três seções:
// 01 Eleitoral (capa com mapa + Painel embutido com filtros prontos), 02 Processo legislativo, 03 Administrativo.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x).toLocaleString("pt-BR"), nf = (x, d = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (v) => "R$ " + (v >= 1e6 ? nf(v / 1e6, 2) + " mi" : v >= 1e3 ? nf(v / 1e3, 1).replace(/,0$/, "") + " mil" : ni(v));
const DV = "20261008a";
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
// cor de destaque por partido (identidade de cada legenda, ajustada para fundo escuro)
const COR_P = { "NOVO": "#F37021", "PL": "#3D7BFF", "PT/PC do B/PV": "#E5383B", "MDB": "#34C759", "UNIÃO/PP": "#2FB5E8", "PSD": "#F2C230", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PDT": "#E5484D", "PSOL/REDE": "#F5B700" };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
const tingir = (cor) => { document.documentElement.style.setProperty("--a", cor); document.documentElement.style.setProperty("--a-rgb", hexRgb(cor)); };
let M, N, CONT, D, VAL, EST, AB = { painel: 1 };

async function carregar() {
  const [b, d, e] = await Promise.all([fetch(`../dados/painel/sc-base.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/sc-estadual.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/mesa-estruturas.json?v=11`).then((r) => r.json()).catch(() => ({}))]);
  M = b.mun; N = M.length; CONT = b.contorno; D = d; EST = e; VAL = d.val.reduce((s, x) => s + x, 0);
}
const eleitos = () => D.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => b.t - a.t);

// ---------------- entrada: roda de nomes (ordem alfabética; o do centro em destaque, os demais menores e desfocados) ----------------
function telaSelecao(foco) {
  const E = eleitos().sort((a, b) => a.u.localeCompare(b.u, "pt-BR"));
  $("#app").innerHTML = `<div class="roda" id="roda"><ol>${E.map((c) => `<li data-n="${c.n}">${esc(c.u)}</li>`).join("")}</ol></div>
    <div class="rodainfo"><div class="pt" id="spt"></div><button class="btn" id="sabrir">Abrir</button><div class="dica">role para escolher · ${E.length} parlamentares eleitos</div></div>`;
  const rd = $("#roda"), L = [...rd.querySelectorAll("li")];
  let atual = null;
  const pintar = () => { const m = rd.getBoundingClientRect().top + rd.clientHeight / 2, h = L[0].offsetHeight || 60; let melhor = null, dm = 1e9;
    L.forEach((li) => { const r = li.getBoundingClientRect(), d = (r.top + r.height / 2 - m) / h, a = Math.abs(d); if (a < dm) { dm = a; melhor = li; }
      li.style.transform = `scale(${Math.max(.5, 1 - a * .125)})`; li.style.filter = a < .5 ? "none" : `blur(${Math.min(6, (a - .4) * 1.4).toFixed(2)}px)`; li.style.opacity = a > 4.5 ? 0 : Math.max(.12, 1 - a * .2); });
    if (melhor !== atual) { atual = melhor; L.forEach((x) => x.classList.toggle("on", x === atual)); const c = D.c.find((x) => x.n === atual.dataset.n); $("#spt").textContent = `${c.p} · ${ni(c.t)} votos`; tingir(COR_P[c.p] || "#34E84A"); } };
  rd.addEventListener("scroll", () => requestAnimationFrame(pintar), { passive: true });
  rd.onclick = (e) => { const li = e.target.closest("li"); if (!li) return; if (li === atual) return ir(li.dataset.n); li.scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("#sabrir").onclick = () => atual && ir(atual.dataset.n);
  onkeydown = (e) => { if (!$("#roda")) return; if (e.key === "Enter" && atual) ir(atual.dataset.n); if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const k = L.indexOf(atual) + (e.key === "ArrowDown" ? 1 : -1); if (L[k]) L[k].scrollIntoView({ behavior: "smooth", block: "center" }); } };
  (L.find((x) => x.dataset.n === foco) || L[0]).scrollIntoView({ block: "center" }); pintar();
}
const ir = (n) => { history.pushState(null, "", "?d=" + n); perfil(n); };

// ---------------- perfil ----------------
function perfil(n) {
  const c = D.c.find((x) => x.n === n); if (!c) return telaSelecao();
  tingir(COR_P[c.p] || "#34E84A");
  const E = eleitos(), pos = E.findIndex((x) => x.n === n) + 1, idx = [...Array(N).keys()], ordM = idx.filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]), i0 = ordM[0];
  const posBase = D.c.filter((x) => (x.v[i0] || 0) > c.v[i0]).length + 1, pctMax = Math.max(...idx.map((i) => D.val[i] ? c.v[i] / D.val[i] : 0)), iPct = idx.find((i) => D.val[i] && c.v[i] / D.val[i] === pctMax);
  const nm = c.u.split(" ");
  $("#app").innerHTML = `<section class="hero" id="hero"><div class="luz"></div><canvas id="heroCv"></canvas><div id="etqs"></div>
    <div class="txt"><img class="ftp" src="${foto(n)}" alt=""><div class="olho" style="margin-top:14px">Eleições 2026 · Deputado estadual · ${esc(c.p)}</div><h1>${esc(nm.length > 1 ? nm.slice(0, -1).join(" ") : c.u)}<i>${esc(nm.length > 1 ? nm.slice(-1)[0] + "." : "")}</i></h1>
    <div class="pops">${[[ni(c.t), "votos", 1], [`${pos}º`, "entre os 40 eleitos"], [`${nf(c.t / VAL * 100, 2)}%`, "dos válidos"], [`${posBase}º`, "em " + M[i0].n], [`${nf(pctMax * 100)}%`, "em " + M[iPct].n + ", seu maior índice"], [ordM.length, "municípios com voto"]].map(([v, r, a], k) => `<div style="animation-delay:${1.2 + k * .35}s"><b class="${a ? "a" : ""}">${esc(v)}</b><span>${esc(r)}</span></div>`).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:22px"><button class="btn sec" id="trocar">Trocar parlamentar</button></div></div><a class="seta" href="#s1" title="Próxima etapa">↓</a></section>
    ${secEleitoral(c)}${secLegislativo()}${secAdministrativo()}`;
  $("#trocar").onclick = () => { history.pushState(null, "", location.pathname); telaSelecao(n); };
  heroMapa(c, ordM); ligarEleitoral(c, ordM); revelar(); scrollTo(0, 0);
}
const cabSec = (id, num, tit, lead) => `<section class="secao" id="${id}"><div class="wrap"><div class="tag rv"><b>${num}</b><h2>${tit}</h2></div><p class="lead rv">${lead}</p>`;
const fimSec = (prox) => `</div>${prox ? `<a class="seta" href="#${prox}" title="Próxima etapa">↓</a>` : ""}</section>`;

// 01 · Eleitoral: Painel completo embutido (sanfona aberta) com filtros prontos
function secEleitoral(c) {
  return cabSec("s1", "01", "Eleitoral", "O Painel completo da sua eleição. As etiquetas abrem o Painel já filtrado: sua região, sua legenda, as comparações que importam.") +
    `<div class="rv"><button class="sanf${AB.painel ? " on" : ""}" data-sec="painel"><span>Painel eleitoral</span><i>mapa, distribuição, perfil das cidades, comparação, ranking</i><em>${AB.painel ? "−" : "+"}</em></button>
    <div id="c-painel"${AB.painel ? "" : " hidden"}><div class="chips" id="chips"></div><iframe class="emb" id="emb" src="index.html?embed=1&cargo=estadual&a=${c.n}&cor=${encodeURIComponent((COR_P[c.p] || "#34E84A").slice(1))}"></iframe></div></div>` + fimSec("s2");
}
function ligarEleitoral(c, ordM) {
  const base = M[ordM[0]], reg = base.meso, leg = D.c.filter((x) => x.p === c.p && x.n !== c.n).sort((a, b) => b.t - a.t)[0], E = eleitos(), k = E.findIndex((x) => x.n === c.n), viz = E[k ? k - 1 : 1];
  const P = [["Mapa do estado", { rec: null, b: null, lente: "mapa" }], [`Sua região · ${reg.replace(" Catarinense", "")}`, { rec: { tipo: "meso", nome: reg }, b: null, lente: "mapa" }], [`Microrregião de ${base.micro}`, { rec: { tipo: "micro", nome: base.micro }, b: null, lente: "mapa" }],
    leg && [`× ${leg.u} (mais votado da legenda)`, { rec: null, b: leg.n, lente: "mapa" }], viz && [`× ${viz.u} (eleito vizinho no ranking)`, { rec: null, b: viz.n, lente: "mapa" }],
    ["Ranking da sua legenda", { vista: "ranking", partido: c.p }], ["Ranking da sua região", { vista: "ranking", rec: { tipo: "meso", nome: reg } }], c.v22 && ["2022 → 2026", { rec: null, b: null, lente: "d22" }]].filter(Boolean);
  $("#chips").innerHTML = `<span class="r">Filtros prontos</span>` + P.map(([r], i) => `<button data-p="${i}">${esc(r)}</button>`).join("");
  $("#chips").onclick = (e) => { const b = e.target.closest("[data-p]"); if (!b) return; const w = $("#emb").contentWindow; if (!w.painelPreset) return; document.querySelectorAll("#chips button").forEach((x) => x.classList.toggle("on", x === b)); w.painelPreset(P[+b.dataset.p][1]); $("#emb").scrollIntoView({ behavior: "smooth", block: "start" }); };
  const fr = $("#emb"); fr.onload = () => { const aj = () => { fr.style.height = fr.contentDocument.documentElement.scrollHeight + "px"; }; aj(); new ResizeObserver(aj).observe(fr.contentDocument.body); };
  document.querySelector('[data-sec="painel"]').onclick = (e) => { AB.painel = !AB.painel; $("#c-painel").hidden = !AB.painel; e.currentTarget.classList.toggle("on", AB.painel); e.currentTarget.querySelector("em").textContent = AB.painel ? "−" : "+"; };
}

// 02 · Processo legislativo
const TRILHA = {
  PL: [["Protocolo", "Apresentação do projeto"], ["Leitura", "Lido no Expediente da sessão"], ["1ª Secretaria", "Define as comissões que vão analisar"], ["CCJ", "Primeiro exame: constitucionalidade e legalidade"], ["Comissões de mérito", "Análise do tema; emendas"], ["Volta à CCJ", "Se houver emendas, depois da última comissão"], ["Plenário", "Maioria simples, presente a maioria absoluta"], ["Sanção ou veto", "Governador: sanciona, ou veta no todo ou em parte"], ["Veto", "Volta à Casa: CCJ e depois Plenário", 1], ["Derrubada", "Maioria absoluta: 21 votos", 1]],
  PLC: [["Protocolo", "Lei complementar"], ["Leitura", "Expediente"], ["1ª Secretaria", "Distribui às comissões"], ["CCJ", "Constitucionalidade"], ["Mérito", "Comissões temáticas"], ["Plenário", "Maioria absoluta: 21 votos"], ["Sanção ou veto", "Governador"], ["Veto", "CCJ e Plenário", 1], ["Derrubada", "21 votos", 1]],
  PEC: [["Proposta", "Por 1/3 dos deputados, pelo Governador ou por câmaras municipais"], ["Leitura", "Expediente"], ["CCJ / comissão especial", "Admissibilidade e mérito"], ["1º turno", "3/5: 24 votos"], ["2º turno", "3/5: 24 votos"], ["Promulgação", "Pela Mesa da Assembleia, sem sanção"]],
  MP: [["Edição", "Governador, em caso de relevância e urgência; vale como lei"], ["Envio imediato", "À Assembleia"], ["Comissões", "Análise com prazo curto"], ["Plenário", "Converte em lei ou rejeita"], ["30 dias", "Sem conversão, perde a eficácia desde a edição", 1]],
};
function secLegislativo() {
  return cabSec("s2", "02", "Processo legislativo", "Como funciona a Casa: o calendário do mandato, a rotina da semana, as regras de votação e o caminho de cada proposta.") +
    `<div class="bloco rv"><h3>Calendário do mandato</h3><p>Legislatura de quatro anos, dividida em dois biênios da Mesa e das comissões.</p>
      <div class="tl4"><div><b>1º fev 2027</b><span>Posse dos 40 deputados e eleição da Mesa (1º biênio)</span></div><div><b>fev 2027</b><span>Instalação das 24 comissões permanentes, com mandato de 2 anos</span></div><div><b>fev 2029</b><span>Eleição da Mesa e novas comissões (2º biênio)</span></div><div><b>jan 2031</b><span>Fim da legislatura</span></div></div>
      <div class="tl4" style="margin-top:14px"><div><b>2 fev – 17 jul</b><span>1º período da sessão legislativa</span></div><div><b>18 – 31 jul</b><span>Recesso de meio de ano</span></div><div><b>1º ago – 22 dez</b><span>2º período da sessão legislativa</span></div><div><b>23 dez – 1º fev</b><span>Recesso de fim de ano</span></div></div>
      <p class="nota">Sessão legislativa: Constituição do Estado. Datas que caem em fim de semana ou feriado passam para o dia útil seguinte.</p></div>
    <div class="bloco rv"><h3>A semana da Assembleia</h3><p>Sessões ordinárias de terça a quinta; comissões em horários fixados pelos presidentes.</p>
      <div class="semana"><div><b>Segunda</b><div class="it" style="color:var(--ter)">Base, agenda regional, gabinete</div></div>
      <div class="on"><b>Terça</b><div class="it"><i>10h</i>CCJ (tradicionalmente)</div><div class="it"><i>14h</i>Sessão: Pequeno Expediente, horário dos partidos e oradores</div><div class="it"><i>16h</i>Ordem do Dia (votações)</div></div>
      <div class="on"><b>Quarta</b><div class="it"><i>9h</i>Finanças e Tributação</div><div class="it"><i>14h</i>Sessão: Expediente</div><div class="it"><i>16h</i>Ordem do Dia</div></div>
      <div class="on"><b>Quinta</b><div class="it"><i>9h</i>Sessão sem Ordem do Dia</div><div class="it">Demais comissões conforme demanda</div></div>
      <div><b>Sexta</b><div class="it" style="color:var(--ter)">Base, agenda regional</div></div></div></div>
    <div class="bloco rv"><h3>Votação e quórum</h3><p>Quantos votos cada tipo de proposição precisa, numa Casa de 40 deputados.</p>
      <table class="qtab"><tr><td>Projeto de lei ordinária<small>maioria simples dos presentes, com a maioria absoluta (21) em plenário</small></td><td>maioria simples</td></tr>
      <tr><td>Projeto de lei complementar<small>maioria absoluta da Casa</small></td><td>21 votos</td></tr>
      <tr><td>Proposta de emenda à Constituição<small>três quintos, em dois turnos</small></td><td>24 votos × 2</td></tr>
      <tr><td>Derrubada de veto<small>maioria absoluta</small></td><td>21 votos</td></tr>
      <tr><td>Medida provisória<small>perde a eficácia se não convertida em lei em 30 dias</small></td><td>30 dias</td></tr></table>
      <p class="nota">Votação simbólica ou nominal (painel), conforme o caso. Ausência pode ser justificada pelo deputado. Conferir detalhes no Regimento Interno.</p></div>
    <div class="bloco rv"><h3>Trilha das propostas</h3><p>Escolha o tipo e acompanhe o caminho, do protocolo à lei.</p><div class="chips" id="trTipos">${Object.keys(TRILHA).map((k, i) => `<button data-tr="${k}" class="${i ? "" : "on"}">${k}</button>`).join("")}</div><div class="trilha" id="trilha"></div></div>` + fimSec("s3");
}
function trilha(k) { $("#trilha").innerHTML = TRILHA[k].map(([t, d, v], i) => `<div class="e${v ? " vt" : ""}" style="animation-delay:${i * 120}ms"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join(""); }

// 03 · Administrativo
function secAdministrativo() {
  const PA = EST.parlamentar || {}, G = EST.gabinete_parlamentar || {}, C = EST.cota_custeio || {}, I = EST.indenizatorias || {};
  const L = (a, b, d = "") => `<tr><td>${a}${d ? `<small>${d}</small>` : ""}</td><td>${b}</td></tr>`;
  return cabSec("s3", "03", "Administrativo", "O que o mandato recebe e o que pode estruturar: subsídio, gabinete, verbas e a estrutura da Casa.") +
    `<div class="bloco rv"><h3>Subsídio e verbas do parlamentar</h3><p>Valores mensais (contracheques e normas de 2026).</p><table class="qtab">
      ${L("Subsídio", fm(PA.subsidio || 0), "Lei 18.642/2023")}${L("Gestão Executiva", fm((PA.subsidio || 0) * (PA.gestao_demais || 0)), "45% do subsídio (50% para o Presidente da Mesa) · LC 828/2023")}${L("Auxílio Saúde", fm(PA.aux_saude || 0), "15% do subsídio")}${L("Auxílio Alimentação", fm(PA.aux_alim || 0))}</table></div>
    <div class="bloco rv"><h3>Estrutura do gabinete</h3><p>O que pode ser nomeado e custeado.</p><table class="qtab">
      ${L("Secretários Parlamentares", `até ${G.cargos || 27} · ${fm(G.cota || 0)}`, "cota máxima mensal de nomeações")}${L("Chefe de Gabinete", fm(G.chefe || 0), "PL/DAS-7 · 1 por gabinete")}${L("Operação de sistemas", fm(G.retrib || 0), "FC-5 + FC-4")}
      ${L("Cota de custeio do gabinete", fm(C.base || 0), "diárias, passagens, telefone, divulgação, escritório, veículo")}${L("Escritório regional", `até 2 · ${fm(I.escritorio_lim || 0)} cada`, "aluguel, dentro da cota")}${L("Veículo", `${fm(I.veiculo_proprio || 0)} ou 2 locados`, "indenização do veículo próprio, dentro da cota")}${L("Moradia na Capital", fm(C.moradia || 0))}</table>
      <p class="nota">Simulador de nomeações (vagas, níveis de GAB, gratificações e saldo): próxima etapa.</p></div>` + fimSec(null);
}

// entrada suave das seções ao rolar
function revelar() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll(".rv").forEach((x) => io.observe(x));
  const t = $("#trTipos"); if (t) t.onclick = (e) => { const b = e.target.closest("[data-tr]"); if (!b) return; t.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); trilha(b.dataset.tr); };
  const tr = $("#trilha"); if (tr) { const io2 = new IntersectionObserver((es) => { if (es[0].isIntersecting) { trilha("PL"); io2.disconnect(); } }); io2.observe(tr); }
}

// relatório do Painel embutido abre por cima (sem nova aba)
addEventListener("message", (e) => { if (e.origin !== location.origin || !e.data || e.data.tipo !== "relatorio") return;
  const ov = document.createElement("div"); ov.className = "relov"; ov.innerHTML = `<div class="bar"><button class="btn" data-imp>Imprimir</button><button class="btn sec" data-fec>Fechar</button></div><iframe></iframe>`; document.body.appendChild(ov);
  const f = ov.querySelector("iframe"); f.srcdoc = e.data.html.replace(/<script>document\.fonts\.ready\.then\(\(\)=>setTimeout\(\(\)=>print\(\),300\)\)<\/script>/, "");
  ov.querySelector("[data-imp]").onclick = () => f.contentWindow.print(); ov.querySelector("[data-fec]").onclick = () => ov.remove(); });

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
  const quadro = (agora) => { if (!document.body.contains(cv)) return; const t = (agora - t0) / 1000; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, t / 1.5); ctx.fillStyle = "rgba(242,244,245,.03)"; ctx.fill(cont); ctx.strokeStyle = "rgba(242,244,245,.06)"; ctx.lineWidth = .6; ctx.stroke(cont);
    for (const i of ord) { const b = B[i], e0 = Math.min(1, Math.max(0, (t - b.nasce) / .7)); if (!e0) continue; const e = 1 - Math.pow(1 - e0, 3), col = b.t < .02 ? ne : ne.map((v, q) => Math.round(v + (rgb[q] - v) * Math.min(1, .25 + b.t)));
      ctx.globalAlpha = (.25 + .7 * b.t) * e; ctx.shadowColor = `rgba(${rgb},${.8 * b.t})`; ctx.shadowBlur = 16 * b.t; ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.4 + .6 * e), 0, 6.2832); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ordM.slice(0, 6).forEach((i, q) => { const b = B[i], v = (Math.sin(t * 1.4 + q) + 1) / 2; if (t < 3) return; ctx.globalAlpha = .25 * v; ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.2 + .5 * v), 0, 6.2832); ctx.fill(); });
    ctx.globalAlpha = 1; heroRaf = requestAnimationFrame(quadro); };
  heroRaf = requestAnimationFrame(quadro);
  const pos0 = [], escolha = []; for (const i of ordM) { const x = Math.min(w - 80, Math.max(80, B[i].x)), y = B[i].y - B[i].r; if (pos0.some(([a, b]) => Math.abs(a - x) < 150 && Math.abs(b - y) < 34)) continue; pos0.push([x, y]); escolha.push([i, x, y]); if (escolha.length === 5) break; }
  $("#etqs").innerHTML = escolha.map(([i, x, y], q) => `<div class="etq" style="left:${x}px;top:${y}px;animation-delay:${2.6 + q * .45}s">${esc(M[i].n)}<b>${ni(c.v[i])}</b></div>`).join("");
}

(async () => {
  await carregar();
  const d = new URLSearchParams(location.search).get("d");
  d ? perfil(d) : telaSelecao();
  addEventListener("popstate", () => { const x = new URLSearchParams(location.search).get("d"); x ? perfil(x) : telaSelecao(); });
})();
