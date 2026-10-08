// Relatórios impressos do painel (08/10/2026). Mesmo padrão dos documentos feitos
// à mão até aqui: cabeçalho SimulaLEGIS, cartões de totais, mapa na 1ª página e
// lista em camadas. Usa o estado do painel (candidato, comparação, recorte,
// cidade selecionada) e abre o documento numa aba nova, pronto para imprimir/PDF.
//   1 Ficha do candidato · município   2 Ficha do candidato · região/estado
//   3 Duelo · município                4 Duelo · região/estado
//   5 Perfil da cidade × voto          6 Ranking do cargo

const REL = [
  ["ficha-mun", "Ficha do candidato · município", "Mapa de bairros, bairros → colégios, 2022 × 2026", (s) => !s.B && s.sel >= 0],
  ["ficha-reg", "Ficha do candidato · região", "Mapa da região, municípios e as principais cidades por bairro", (s) => !s.B],
  ["duelo-mun", "Duelo · município", "Mapa de bolhas, bairros → colégios com os dois", (s) => s.B && s.sel >= 0],
  ["duelo-reg", "Duelo · região", "Mapa, regiões → municípios e as bases de cada um por bairro", (s) => !!s.B],
  ["perfil", "Perfil da cidade × voto", "Renda, religião, Bolsa Família, escolaridade e idade cruzados com o voto", () => true],
  ["ranking", "Ranking do cargo", "Todos os candidatos no recorte, com 2022 e diferença", () => true],
];

function abrirRelatorios() {
  let m = document.getElementById("relModal");
  if (!m) { m = document.createElement("div"); m.id = "relModal"; document.body.appendChild(m); }
  const s = { B: st.B, sel: st.sel };
  const rec = st.rec ? st.rec.nome : "Santa Catarina", cid = st.sel >= 0 ? M[st.sel].n : null;
  m.innerHTML = `<div class="rel-fundo"></div><div class="rel-caixa"><h3>Relatório impresso</h3>
    <p class="dica">${st.B ? `${esc(st.A.u)} × ${esc(st.B.u)}` : esc(st.A.u)} · ${esc(cid || rec)}</p>
    ${REL.map(([k, t, d, ok]) => { const pode = ok(s); return `<button class="rel-op" data-rel="${k}"${pode ? "" : " disabled"}><b>${t}</b><span>${pode ? d : k.endsWith("-mun") ? "Toque numa cidade no mapa ou na tabela primeiro" : k.startsWith("duelo") ? "Escolha um candidato em “Comparar com…”" : "Tire a comparação para usar este"}</span></button>`; }).join("")}
    <button class="rel-fechar" id="relFechar">Fechar</button></div>`;
  m.hidden = false;
  m.querySelector(".rel-fundo").onclick = m.querySelector("#relFechar").onclick = () => { m.hidden = true; };
  m.querySelectorAll("[data-rel]").forEach((b) => b.onclick = async () => { b.querySelector("span").textContent = "Montando…"; const html = await montarRelatorio(b.dataset.rel); m.hidden = true; const w = window.open("", "_blank"); w.document.write(html); w.document.close(); });
}

// ---------- peças do documento ----------
const R_CSS = `@page{size:A4;margin:0}*{box-sizing:border-box}html,body{background:#fff}
body{margin:0;font:10px/1.45 Inter,system-ui,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@font-face{font-family:Inter;src:url(${location.origin}${location.pathname.replace(/painel\/.*$/, "")}fontes/InterVariable.woff2);font-weight:100 900}
.pg{padding:12mm 12mm 10mm;background:#fff;min-height:297mm}
.cab{display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px solid #D3D6D9}
.wm{font-size:15px;font-weight:800;letter-spacing:-.02em}.wm b{color:#1FA83A}.wm small{display:block;font-size:6px;letter-spacing:.22em;color:#6B7178;font-weight:700;text-transform:uppercase}
.meta{text-align:right;font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#6B7178;line-height:1.7}.meta b{color:#3F454B}.regra{display:none}
.olho{font-size:7.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#6B7178;margin:14px 0 4px}
.tit{font-size:30px;font-weight:900;letter-spacing:-.045em;line-height:.98}.tit span{font-weight:900;color:#1FA83A}.tit i{font-style:normal;color:#3D6FE0}
.sub{font-size:9px;color:#3F454B;margin:6px 0 12px}
.kp{display:flex;gap:26px;margin:0 0 12px}.kp div{display:flex;flex-direction:column}.kp b{font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.kp div:first-child b{color:#1FA83A}.kp span{font-size:6.5px;letter-spacing:.16em;text-transform:uppercase;color:#6B7178;margin-top:5px}
.sec{font-size:7.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#6B7178;margin:14px 0 6px;page-break-after:avoid}.nota{font-size:8px;color:#3F454B;margin:5px 0}
svg{width:100%;height:auto;display:block}.mapa{background:#fff;border:1px solid #D3D6D9;border-radius:12px;max-height:160mm}
.l{display:grid;grid-template-columns:22px minmax(0,1fr) 60px 60px 62px 50px;gap:6px;align-items:center;padding:4px 8px;border-bottom:.5px solid #E3E5E8;font-variant-numeric:tabular-nums;page-break-inside:avoid;color:#3F454B}
.l>span:nth-child(n+3){text-align:right}.l>span:first-child{color:#6B7178;font-size:7.5px}.l>span:nth-child(4){color:#111;font-weight:700}
.l.c{font-size:6.5px;letter-spacing:.12em;text-transform:uppercase;color:#6B7178;border-bottom:.5px solid #A9AEB3}.l.c>span{color:#6B7178!important;font-weight:600!important}
.l.n0{font-weight:700;color:#111;box-shadow:inset 1px 0 0 #A9AEB3}
.l.n1{font-size:9px;box-shadow:inset 1px 0 0 #C9CDD1}.l.n1>span:nth-child(2){padding-left:12px}
.l.n2{font-size:8.5px;color:#6B7178;box-shadow:inset 1px 0 0 #DDE0E3}.l.n2>span:nth-child(2){padding-left:24px}
.chip{display:inline-block;font-size:7px;font-weight:800;padding:1px 6px;border-radius:999px;margin-left:5px;vertical-align:1px}.ce{background:#34E84A;color:#0B0D0E}.cs{background:#E3E5E8;color:#3F454B}.p{color:#1FA83A;font-weight:700}.n{color:#D9482F;font-weight:700}.az{color:#3D6FE0;font-weight:700}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mini{background:#fff;border:1px solid #D3D6D9;border-radius:12px;padding:9px;page-break-inside:avoid}
.mini h4{margin:0 0 4px;font-size:9px;font-weight:700}.mini p{margin:5px 0 0;font-size:8px;color:#3F454B}
.rod{margin-top:14px;font-size:7px;letter-spacing:.04em;color:#6B7178;border-top:1px solid #D3D6D9;padding-top:6px}.pb{page-break-before:always;padding-top:12mm}`;
const fmt = (v) => Math.round(v).toLocaleString("pt-BR"), pc = (v) => nf(v) + "%";
const sinal = (d) => `${d >= 0 ? "+" : "−"}${fmt(Math.abs(d))}`;
function docHtml(titulo, sub, cards, corpo) {
  const agora = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo.replace(/<[^>]+>/g, "")} · SimulaLEGIS</title><style>${R_CSS}</style></head><body><div class="pg">
  <div class="cab"><div class="wm"><b>Simula</b>LEGIS<small>Simulador Eleitoral Legislativo 2026</small></div><div class="meta"><b>Santa Catarina</b> · Resultado 2026<br>gerado em ${agora}</div></div><div class="regra"></div>
  <div class="olho">${sub.split(" · ").slice(0, 2).join(" · ")}</div><div class="tit">${titulo}</div><div class="sub">${sub}</div>${cards ? `<div class="kp">${cards.map(([v, r]) => `<div><b>${v}</b><span>${r}</span></div>`).join("")}</div>` : ""}
  ${corpo}<div class="rod">Dados oficiais do TSE (2026 e 2022), IBGE (Censo 2022) e MDS. Não é pesquisa eleitoral. SimulaLEGIS · documento gerado pelo painel.</div></div>
  <script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
}
const linha = (cls, pos, nome, a, b, c, d) => `<div class="l ${cls}"><span>${pos}</span><span>${nome}</span><span>${a}</span><span>${b}</span><span>${c}</span><span>${d ?? ""}</span></div>`;

// mapa de SC (municípios do recorte) em SVG, bolha por município
function svgMapaSC(valor, cor, raioF) {
  const idx = [...Array(N).keys()].filter(dentro);
  let lon0 = 1e9, lon1 = -1e9, lat0 = -1e9, lat1 = 1e9;
  idx.forEach((i) => { lon0 = Math.min(lon0, M[i].lon); lon1 = Math.max(lon1, M[i].lon); lat0 = Math.max(lat0, M[i].lat); lat1 = Math.min(lat1, M[i].lat); });
  const mg = Math.max(.12, (lon1 - lon0) * .08); lon0 -= mg; lon1 += mg; lat0 += mg; lat1 -= mg;
  const K = Math.cos(27.5 * Math.PI / 180), Wd = 700, S = Wd / ((lon1 - lon0) * K), Hd = (lat0 - lat1) * S;
  const P = (lon, lat) => [(lon - lon0) * K * S, (lat0 - lat) * S];
  const pth = (an) => an.map((r) => "M" + r.map(([x, y]) => P(x, y).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("");
  const cont = CONT.map((an, i) => st.rec && dentro(i) ? "" : pth(an)).join("");
  // municípios do recorte: fundo branco e borda mais escura, para o desenho da região aparecer
  const contR = st.rec ? CONT.map((an, i) => dentro(i) ? pth(an) : "").join("") : "";
  const mx = Math.max(1, ...idx.map((i) => Math.abs(valor(i)) || 0));
  const bol = idx.filter((i) => valor(i)).sort((a, b) => Math.abs(valor(b)) - Math.abs(valor(a))).map((i) => { const [x, y] = P(M[i].lon, M[i].lat), v = valor(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(raioF(Math.abs(v) / mx) * Math.min(2.5, Math.sqrt(S / 120))).toFixed(1)}" fill="${cor(v, true)}" stroke="${cor(v)}" stroke-width=".8"/>`; }).join("");
  return `<svg class="mapa" viewBox="0 0 ${Wd} ${Hd.toFixed(0)}"><defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs><path d="${cont}" fill="${st.rec ? "#F3F4F5" : "#FAFBFB"}" stroke="${st.rec ? "#E3E5E8" : "#D3D6D9"}" stroke-width=".6"/>${contR ? `<path d="${contR}" fill="#fff" stroke="#8A9096" stroke-width="1"/>` : ""}<g filter="url(#gl)" opacity=".35">${bol}</g>${bol}</svg>`;
}
// mapa de bairros (IBGE) de um município com bolhas por local de votação
async function svgMapaBairros(k, valorLocal, cor) {
  let g; try { g = await (await fetch(`../dados/mapas/bairros-sc/${slugArq(k)}.json`)).json(); } catch (e) { return ""; }
  const ls = Object.entries(g.l).map(([n, [x, y]]) => ({ x, y, v: valorLocal(n) })).filter((o) => o.v);
  const mx = Math.max(1, ...ls.map((o) => Math.abs(o.v)));
  const fundo = g.c ? `<path d="${g.c}" fill="#FAFBFB" stroke="#A9AEB3"/>` : g.b.map(([, d]) => `<path d="${d}" fill="#FAFBFB" fill-rule="evenodd" stroke="#C9CDD1" stroke-width=".8"/>`).join("");
  const lab = g.b ? g.b.map(([n, , [x, y]]) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" font-weight="700" fill="#8A9096" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(n)}</text>`).join("") : "";
  const bol = ls.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).map((o) => `<circle cx="${o.x}" cy="${o.y}" r="${(2.5 + 20 * Math.sqrt(Math.abs(o.v) / mx)).toFixed(1)}" fill="${cor(o.v, true)}" stroke="${cor(o.v)}" stroke-width="1"/>`).join("");
  return `<svg class="mapa" viewBox="0 0 ${g.w} ${g.h}"><defs><filter id="gb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>${fundo}${lab}<g filter="url(#gb)" opacity=".3">${bol}</g>${bol}</svg><div class="nota">${g.c ? "Contorno do município (o IBGE não publica bairros dele)." : "Bairros = limites oficiais do IBGE (Censo 2022)."} Bolha = local de votação.</div>`;
}
const corVerde = (v, f) => f ? "rgba(31,168,58,.45)" : "#1FA83A";
const corDuelo = (v, f) => v >= 0 ? (f ? "rgba(31,168,58,.45)" : "#1FA83A") : (f ? "rgba(61,111,224,.45)" : "#3D6FE0");
// votos por local (nome 2026) de um candidato no município
async function votosLocal(k, c) { const s = await secoes(2026, k); const v = ((s || {})[c.cargo] || {})[c.n] || {}, o = {}; Object.entries((s || {})._secoes || {}).forEach(([sk, n]) => { o[n] = (o[n] || 0) + (v[sk] || 0); }); return o; }

// ---------- os relatórios ----------
async function montarRelatorio(tipo) {
  const A = st.A, B = st.B, rec = st.rec ? st.rec.nome : "Santa Catarina", nomeA = `${esc(A.u)} <span style="color:#6B7178;font-weight:700;font-size:16px;letter-spacing:-.01em">${esc(A.p)}</span>`;
  const idx = [...Array(N).keys()].filter(dentro), cargoA = CARGO_LBL[A.cargo];
  if (tipo === "ficha-mun" || tipo === "duelo-mun") {
    const i = st.sel, k = M[i].k, duelo = tipo === "duelo-mun", nos = await arvoreMun(k, A, duelo ? B : null);
    const vlA = await votosLocal(k, A), vlB = duelo ? await votosLocal(k, B) : null;
    const mapa = await svgMapaBairros(k, duelo ? (n) => (vlA[n] || 0) - (vlB[n] || 0) : (n) => vlA[n] || 0, duelo ? corDuelo : corVerde);
    const bs = Object.entries(nos).filter(([, b]) => b.x[0] || b.x[1]).sort((p, q) => q[1].x[1] - p[1].x[1] || q[1].x[0] - p[1].x[0]);
    if (duelo) bs.sort((p, q) => (q[1].x[0] + q[1].x[1]) - (p[1].x[0] + p[1].x[1]));
    let L = linha("c", "", "Bairro / local de votação", duelo ? esc(pn(A)) : "2022", duelo ? esc(pn(B)) : "2026", "Dif.", "%");
    bs.forEach(([bn, b], j) => {
      const d = duelo ? b.x[0] - b.x[1] : b.x[1] - b.x[0];
      L += linha("n0", `${j + 1}º`, esc(bn), fmt(b.x[0]), fmt(b.x[1]), `<span class="${d >= 0 ? "p" : duelo ? "az" : "n"}">${sinal(d)}</span>`, duelo ? "" : b.x[0] ? `<span class="${d >= 0 ? "p" : "n"}">${d >= 0 ? "+" : "−"}${nf(Math.abs(d) / b.x[0] * 100)}%</span>` : "—");
      Object.entries(b.l).filter(([, l]) => l.x[0] || l.x[1]).sort((p, q) => duelo ? (q[1].x[0] + q[1].x[1]) - (p[1].x[0] + p[1].x[1]) : (p[1].x[1] - p[1].x[0]) - (q[1].x[1] - q[1].x[0])).forEach(([ln, l]) => {
        const e = duelo ? l.x[0] - l.x[1] : l.x[1] - l.x[0];
        L += linha("n1", "", esc(ln), fmt(l.x[0]), fmt(l.x[1]), `<span class="${e >= 0 ? "p" : duelo ? "az" : "n"}">${sinal(e)}</span>`, duelo ? "" : l.x[0] ? `${e >= 0 ? "+" : "−"}${nf(Math.abs(e) / l.x[0] * 100)}%` : "—");
      });
    });
    const tA = A.v[i], t22 = A.v22 ? A.v22[i] : null;
    const cards = duelo ? [[fmt(A.v[i]), esc(A.u)], [fmt(B.v[i]), esc(B.u)], [sinal(A.v[i] - B.v[i]), "diferença"]] : [[t22 == null ? "—" : fmt(t22), "votos em 2022"], [fmt(tA), "votos em 2026 · " + pc(pctMun(A, i))], [t22 == null ? "—" : sinal(tA - t22), "diferença"]];
    return docHtml(duelo ? `${esc(A.u)} <span style="color:#6B7178">×</span> <i>${esc(B.u)}</i>` : nomeA, `${duelo ? `Duelo · ${cargoA} × ${CARGO_LBL[B.cargo]}` : cargoA} · ${esc(M[i].n)} · ${duelo ? "2026" : "2026 × 2022"}`, cards,
      `<div class="sec">Mapa · ${esc(M[i].n)}</div>${mapa}<div class="sec pb">Bairros e colégios · ${esc(M[i].n)}</div>${L}${duelo ? `<div class="nota">Verde: ${esc(pn(A))} à frente; azul: ${esc(pn(B))}.</div>` : `<div class="nota">Bairros do mais votado para o menos votado; colégios da maior perda para a maior alta. Colégios de 2022 casados com os de 2026 pelo cadastro do TSE.</div>`}`);
  }
  if (tipo === "ficha-reg" || tipo === "duelo-reg") {
    const duelo = tipo === "duelo-reg", mc = duelo && A.cargo === B.cargo;
    const val = (i) => duelo ? (mc ? A.v[i] - B.v[i] : fatia(A, i) - fatia(B, i)) : A.v[i];
    const mapa = svgMapaSC(val, duelo ? corDuelo : corVerde, (t) => 2 + 16 * Math.sqrt(t));
    const grupo = st.rec ? (st.rec.tipo === "micro" ? null : "micro") : "meso";
    const gr = {}; idx.forEach((i) => { const g = grupo ? M[i][grupo] : rec; (gr[g] = gr[g] || []).push(i); });
    const x = (i) => duelo ? [A.v[i], B.v[i]] : [A.v22 ? A.v22[i] : 0, A.v[i]];
    let L = linha("c", "", grupo ? "Região / município" : "Município", duelo ? esc(pn(A)) : "2022", duelo ? esc(pn(B)) : "2026", "Dif.", duelo ? "" : "%");
    const abrir = duelo ? [...new Set([[...idx].sort((p, q) => A.v[q] - A.v[p])[0], [...idx].sort((p, q) => B.v[q] - B.v[p])[0]])] : [...idx].sort((p, q) => A.v[q] - A.v[p]).slice(0, 3);
    const aberto = {}; for (const i of abrir) aberto[i] = await arvoreMun(M[i].k, A, duelo ? B : null);
    const soma = (l) => l.reduce((s, i) => { const v = x(i); return [s[0] + v[0], s[1] + v[1]]; }, [0, 0]);
    Object.entries(gr).sort((p, q) => soma(q[1])[1] - soma(p[1])[1]).forEach(([g, l], j) => {
      const sm = soma(l), d = duelo ? sm[0] - sm[1] : sm[1] - sm[0];
      if (grupo) L += linha("n0", `${j + 1}º`, esc(g.replace(" Catarinense", "")), fmt(sm[0]), fmt(sm[1]), `<span class="${d >= 0 ? "p" : duelo ? "az" : "n"}">${sinal(d)}</span>`, "");
      l.filter((i) => x(i)[0] || x(i)[1]).sort((p, q) => duelo ? val(q) - val(p) : A.v[q] - A.v[p]).forEach((i) => {
        const v = x(i), e = duelo ? v[0] - v[1] : v[1] - v[0];
        L += linha(grupo ? "n1" : "n0", "", `${aberto[i] ? "<b>" : ""}${esc(M[i].n)}${aberto[i] ? "</b>" : ""}`, fmt(v[0]), fmt(v[1]), `<span class="${e >= 0 ? "p" : duelo ? "az" : "n"}">${sinal(e)}</span>`, duelo ? "" : v[0] ? `${e >= 0 ? "+" : "−"}${nf(Math.abs(e) / v[0] * 100)}%` : "—");
        if (aberto[i]) Object.entries(aberto[i]).filter(([, b]) => b.x[0] || b.x[1]).sort((p, q) => (q[1].x[0] + q[1].x[1]) - (p[1].x[0] + p[1].x[1])).slice(0, 25).forEach(([bn, b]) => { const f = duelo ? b.x[0] - b.x[1] : b.x[1] - b.x[0]; L += linha("n2", "", esc(bn), fmt(b.x[0]), fmt(b.x[1]), `<span class="${f >= 0 ? "p" : duelo ? "az" : "n"}">${sinal(f)}</span>`, ""); });
      });
    });
    const tA = idx.reduce((s, i) => s + A.v[i], 0), tB = duelo ? idx.reduce((s, i) => s + B.v[i], 0) : (A.v22 ? idx.reduce((s, i) => s + A.v22[i], 0) : null);
    const cards = duelo ? [[fmt(tA), esc(A.u)], [fmt(tB), esc(B.u)], [sinal(tA - tB), "diferença"]] : [[tB == null ? "—" : fmt(tB), "votos em 2022 · " + esc(rec)], [fmt(tA), "votos em 2026"], [tB == null ? "—" : sinal(tA - tB), "diferença"]];
    return docHtml(duelo ? `${esc(A.u)} <span style="color:#6B7178">×</span> <i>${esc(B.u)}</i>` : nomeA, `${duelo ? `Duelo · ${cargoA} × ${CARGO_LBL[B.cargo]}` : cargoA} · ${esc(rec)} · ${duelo ? "2026" : "2026 × 2022"}`, cards,
      `<div class="sec">Mapa · ${esc(rec)}</div>${mapa}<div class="nota">${duelo ? `Bolha verde = ${esc(pn(A))} mais forte; azul = ${esc(pn(B))}. ${mc ? "Tamanho = diferença de votos." : "Cargos diferentes: tamanho = diferença do peso da cidade no total de cada um."}` : "Tamanho da bolha = votos em 2026."}</div>
      <div class="sec pb">${grupo ? "Regiões e municípios" : "Municípios"} · ${esc(rec)}</div>${L}<div class="nota">Em negrito, as cidades abertas por bairro (${abrir.map((i) => esc(M[i].n)).join(", ")}).</div>`);
  }
  if (tipo === "perfil") {
    const blocos = [];
    for (const [k, curto, rot, f, log] of VARS.slice(0, 7)) {
      const v0 = st.var; st.var = k; const frase = fraseSocial(); st.var = v0;
      const pts = idx.map((i) => [SOC && SOC[M[i].k] ? SOC[M[i].k][k] : null, metrica(i), M[i].el]).filter(([x, y]) => x != null && !Number.isNaN(y));
      if (pts.length < 5) continue;
      const xs = pts.map((p) => p[0]).sort((a, b) => a - b), lo = xs[Math.floor(xs.length * .01)], hi = xs[Math.floor(xs.length * .99)];
      const ys = pts.map((p) => p[1]); let ylo = Math.min(...ys), yhi = Math.max(...ys); if (st.B) { const m = Math.max(-ylo, yhi); ylo = -m; yhi = m; } else ylo = 0;
      const tf = log ? Math.log : (v) => v, X = (v) => 30 + (tf(Math.max(lo, Math.min(hi, v))) - tf(lo)) / (tf(hi) - tf(lo) || 1) * 300, Y = (v) => 150 - (v - ylo) / (yhi - ylo || 1) * 140;
      const c = pts.map(([x, y, e]) => `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${(1 + 6 * Math.sqrt(e / 470000)).toFixed(1)}" fill="${st.B ? (y >= 0 ? "rgba(31,168,58,.6)" : "rgba(61,111,224,.6)") : "rgba(31,168,58,.6)"}"/>`).join("");
      blocos.push(`<div class="mini"><h4>${rot}</h4><svg viewBox="0 0 340 172"><line x1="30" x2="330" y1="150" y2="150" stroke="#C9CDD1"/>${st.B ? `<line x1="30" x2="330" y1="${Y(0)}" y2="${Y(0)}" stroke="#A9AEB3" stroke-dasharray="3 3"/>` : ""}${c}<text x="30" y="166" font-size="8" fill="#6B7178">${f(lo)}</text><text x="330" y="166" font-size="8" fill="#6B7178" text-anchor="end">${f(hi)}</text><text x="2" y="12" font-size="8" fill="#6B7178">${st.B ? "vantagem" : "% votos"}</text></svg><p>${frase.replace(/<[^>]+>/g, "")}</p></div>`);
    }
    return docHtml(st.B ? `${esc(A.u)} × ${esc(B.u)}` : nomeA, `Perfil da cidade × voto · ${cargoA} · ${esc(rec)} · 2026`, null,
      `<div class="nota">Cada ponto é um município (tamanho = eleitorado). Eixo horizontal: o indicador da cidade; vertical: ${st.B ? "a vantagem de " + esc(pn(A)) : "a fatia de votos de " + esc(A.u)}. A frase compara o terço de cidades com menos e com mais do indicador.</div><div class="grade">${blocos.join("")}</div>`);
  }
  if (tipo === "ranking") {
    const naRk = !document.getElementById("ranking").hidden, cg = naRk ? rk.cargo : st.A.cargo;
    const dRk = naRk ? dentroRk : dentro; idx.splice(0, idx.length, ...[...Array(N).keys()].filter(dRk));
    const recR = naRk ? (rk.rec ? rk.rec.nome : "Santa Catarina") : rec, d = DADOS[cg], prop = cg === "estadual" || cg === "federal", todo = idx.length === N;
    // dados da eleição do recorte (2026, com 2022 de referência)
    const part = async (ano) => { try { const p = (await (await fetch(`../dados/resultados/sc-${ano}/participacao.json`)).json())[cg]; if (todo && p.estado) return p.estado; return idx.reduce((s, i) => { const x = p.mun[M[i].k] || [0, 0, 0, 0, 0, 0]; return s.map((v, k) => v + x[k]); }, [0, 0, 0, 0, 0, 0]); } catch (e) { return null; } };
    const P26 = await part(2026), P22 = await part(2022);
    const pp = (v, b) => b ? nf(v / b * 100) + "%" : "";
    const ld = (rot, k, base) => { const a = P22 ? P22[k] : null, b = P26 ? P26[k] : null; return linha("", "", rot, a == null ? "—" : `${fmt(a)} <span style="color:#8A9096">${base == null ? "" : pp(a, P22[base])}</span>`, b == null ? "—" : `<b>${fmt(b)}</b> <span style="color:#8A9096">${base == null ? "" : pp(b, P26[base])}</span>`, a == null || b == null ? "—" : `<span class="${b - a >= 0 ? "p" : "n"}">${sinal(b - a)}</span>`, ""); };
    let dados = linha("c", "", "Dados da eleição", "2022", "2026", "Dif.", "") + ld("Eleitorado", 0, null) + ld("Comparecimento", 1, 0) + ld("Abstenção", 2, 0) + ld("Brancos", 3, 1) + ld("Nulos", 4, 1) + ld("Válidos", 5, 1);
    if (prop && d.meta && d.meta.qe) dados += linha("n0", "", `Quociente eleitoral <span style="color:#8A9096;font-weight:500">· ${d.meta.vagas} vagas · válidos ÷ vagas</span>`, "", `<b>${fmt(d.meta.qe)}</b>`, "", "");
    const val = idx.reduce((s, i) => s + d.val[i], 0);
    const L0 = d.c.map((c) => ({ c, t: idx.reduce((s, i) => s + c.v[i], 0), t22: c.v22 ? idx.reduce((s, i) => s + c.v22[i], 0) : null })).sort((p, q) => q.t - p.t);
    const etq = (c) => { const s = String(c.s || ""); if (c.r === 0 || /qp/i.test(s)) return `<span class="chip ce">E-QP</span>`; if (c.r > 0) return `<span class="chip ce">E-M · ${c.r}ª</span>`; if (/^eleito/i.test(s)) return `<span class="chip ce">Eleito</span>`; if (/2º turno/i.test(s)) return `<span class="chip cs">2º turno</span>`; if (/suplente/i.test(s)) return `<span class="chip cs">Supl.</span>`; return ""; };
    let L = linha("c", "", "Candidato", "2022", "2026", "Dif.", "%");
    L0.forEach((x, j) => { const dif = x.t22 == null ? null : x.t - x.t22; L += linha("", `${j + 1}º`, `<b>${esc(x.c.u)}</b>${etq(x.c)} <span style="color:#8A9096">${esc(x.c.p)} · nº ${x.c.n}</span>`, x.t22 == null ? "—" : fmt(x.t22), `<b>${fmt(x.t)}</b>`, dif == null ? "—" : `<span class="${dif >= 0 ? "p" : "n"}">${sinal(dif)}</span>`, val ? nf(x.t / val * 100, 2) + "%" : ""); });
    let sob = "";
    if (prop && d.meta && d.meta.grupos) {
      const G = Object.entries(d.meta.grupos).filter(([, g]) => g.cad).sort((a, b) => b[1].cad - a[1].cad || b[1].v - a[1].v);
      sob = `<div class="sec">Cadeiras por partido/federação · QE ${fmt(d.meta.qe)}</div>` + linha("c", "", "Partido / federação", "Votos", "Por QP", "Por média", "Total") +
        G.map(([k, g]) => linha("", "", esc(k), fmt(g.v), String(g.qp), String(g.cad - g.qp), `<b>${g.cad}</b>`)).join("") +
        `<div class="sec">Rodadas das sobras (método das médias)</div>` + linha("c", "", "Rodada · eleito", "Partido", "Votos", "", "") +
        d.c.filter((c) => c.r > 0).sort((a, b) => a.r - b.r).map((c) => linha("", `${c.r}ª`, `<b>${esc(c.u)}</b>`, esc(c.p), fmt(c.t), "", "")).join("");
    }
    return docHtml(`Ranking · ${CARGO_LBL[cg]}`, `${esc(recR)} · 2026 × 2022 · ${d.c.length} candidatos`, null,
      `<div class="sec">Dados da eleição · ${esc(recR)}</div>${dados}<div class="sec">Candidatos</div>${L}${todo ? sob : prop ? `<div class="nota">Quociente e sobras são do estado inteiro (a eleição é estadual); a lista acima mostra os votos só no recorte.</div>` : ""}<div class="nota">Etiquetas: E-QP = eleito pelo quociente partidário; E-M · nª = eleito pela média, na rodada n das sobras.</div>`);
  }

}
