// Gabinete · Caderno de recursos (03/11/2026). Documento impresso (A4) para análise dos recursos e da indicação, gerado na hora com os
// dados que a página já tem: capa (cota aberta + Controle), quadro analítico (mapa + ranking), estudo de dois candidatos (votos ×
// emendas), cruzamento, região (Vale Europeu por padrão), taxa de conversão dos líderes (etiquetas do Controle) e relatório científico.
// Abre como o caderno do Eleitoral: prévia à direita, seções e subseções para marcar à esquerda, e Imprimir.
// Nasceu do protótipo em Python (Outros documentos/apostila-napoleao/gerar.py). Usa os globais de gabinete.js, gabinete-adicionar.js,
// gabinete-cotas.js, gabinete-indicar.js e gabinete-ind-planilha.js (piArea).

const CG_CFG0 = { cand: [{ n: "55055", de: "" }, { n: "55123", de: "JULIO CESAR GARCIA" }] };
const cgNi = (n) => Math.round(+n || 0).toLocaleString("pt-BR");
const cgNf = (x, k = 1) => (+x || 0).toLocaleString("pt-BR", { minimumFractionDigits: k, maximumFractionDigits: k });
const cgFm = (v) => Math.abs(v) >= 1e6 ? "R$ " + cgNf(v / 1e6, 2) + " mi" : Math.abs(v) >= 1e3 ? "R$ " + cgNf(v / 1e3, 0) + " mil" : "R$ " + cgNf(v, 0);
const cgFr = (v) => "R$ " + cgNf(v, 2);
const cgPct = (a, b) => b ? cgNf(a / b * 100, 1) + "%" : "—";
const cgVar = (a, b) => b ? (a >= b ? "+" : "") + cgPct(a - b, b) : "—";
const cgE = (s) => esc(String(s == null ? "" : s));
function cgCfg() { try { return { ...CG_CFG0, ...JSON.parse(localStorage.getItem("gab_cad_cfg") || "{}") }; } catch (e) { return { ...CG_CFG0 }; } }
function cgGuarda(c) { try { localStorage.setItem("gab_cad_cfg", JSON.stringify(c)); } catch (e) {} }

// ---------- estatística ----------
function cgRank(a) { const o = [...a.keys()].sort((x, y) => a[x] - a[y]), r = new Array(a.length).fill(0); let i = 0;
  while (i < o.length) { let j = i; while (j + 1 < o.length && a[o[j + 1]] === a[o[i]]) j++; for (let k = i; k <= j; k++) r[o[k]] = (i + j) / 2 + 1; i = j + 1; } return r; }
function cgPearson(x, y) { const n = x.length; if (!n) return 0; const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return sx && sy ? sxy / Math.sqrt(sx * sy) : 0; }
const cgSpear = (x, y) => cgPearson(cgRank(x), cgRank(y));
function cgOls(X, y) { const k = X[0].length, A = [...Array(k)].map((_, a) => [...Array(k)].map((_, b) => X.reduce((s, r) => s + r[a] * r[b], 0))), bb = [...Array(k)].map((_, a) => X.reduce((s, r, i) => s + r[a] * y[i], 0));
  for (let c = 0; c < k; c++) { let p = c; for (let r = c; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [bb[c], bb[p]] = [bb[p], bb[c]];
    for (let r = 0; r < k; r++) if (r !== c && A[c][c]) { const f = A[r][c] / A[c][c]; A[r] = A[r].map((u, w) => u - f * A[c][w]); bb[r] -= f * bb[c]; } }
  const beta = bb.map((v, i) => v / A[i][i]), yh = X.map((r) => r.reduce((s, v, i) => s + v * beta[i], 0)), my = y.reduce((s, v) => s + v, 0) / y.length;
  const sse = y.reduce((s, v, i) => s + (v - yh[i]) ** 2, 0), sst = y.reduce((s, v) => s + (v - my) ** 2, 0); return { beta, r2: sst ? 1 - sse / sst : 0 }; }
const cgMed = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };

// ---------- dados ----------
let CG_FED = null;
async function cgDados(cfg) {
  await lerTodas(); if (!CG_FED) CG_FED = await (await fetch("../dados/painel/sc-federal.json")).json();
  const M = BASE.mun, N = M.length, IX = {}; M.forEach((m, i) => { IX[norm(m.n)] = i; });
  const tot = (o) => o.E + o.C + o.O, pag = (o) => o.Ep + o.Cp + o.Op;
  // Napoleão (o parlamentar do gabinete): emendas do portal da SEF + convênios e outros do Controle
  const P = M.map(() => ({ E: 0, Ep: 0, C: 0, Cp: 0, O: 0, Op: 0 })), reg = [], CT = [], tipoR = (r) => { const s = sigla(r.origem); return s.startsWith("EI") ? "E" : s === "CONV" || s === "CS" ? "C" : "O"; };
  E0.forEach((e) => { if (e.mi == null) return; const o = P[e.mi]; o.E += e.v || 0; o.Ep += Math.min(e.vp || 0, e.v || 0); });
  MEU.filter((r) => !supr(r)).forEach((r) => { const t = tipoR(r), v = +r.valor || 0, pg = /✅\s*(Pago|Executado)/i.test(r.status_manual || ""); CT.push({ r, t, v, pg });
    if (t === "E") return; const i = IX[norm(r.municipio)]; if (i == null) { reg.push({ mun: r.municipio, t, v, pg, ano: +r.ano }); return; } P[i][t] += v; P[i][t + "p"] += pg ? v : 0; });
  // todos os deputados 2023-2026 (pessoa → candidatura de 2026), como no protótipo
  const tk = (x) => norm(x).split(" ").filter((w) => w.length > 2 && !["DOS", "DAS", "DEL", "DELEGADO", "PADRE", "SARGENTO", "DEPUTADO"].includes(w)), cont = (a, b) => a.length && a.every((w) => b.includes(w));
  const NAO = new Set(["MAURICIO ESKUDLARK", "SARGENTO LIMA", "NAZARENO MARTINS", "MILTON HOBUS"]);
  const FORCA = { "JOSE MILTON SCHEFFER": ["F", "Zé Milton"], PAULINHA: ["F", "Paulinha"], "JULIO GARCIA": ["F", "Julio Garcia"], "JULIO CESAR GARCIA": ["F", "Julio Garcia"], "VALDIR VITAL COBALCHINI": ["F", "Valdir Cobalchini"], "ISMAEL DOS SANTOS": ["F", "Ismael Dos Santos"], "RICARDO ALBA": ["E", "Alba"], "MARIO PINTO DA MOTTA JUNIOE": ["E", "Mário Motta"] };
  const cand = (dep) => { const n = norm(dep); if (NAO.has(n)) return null; if (FORCA[n]) { const [cg, u] = FORCA[n], c = (cg === "E" ? EST : CG_FED).c.find((x) => x.u === u); return c ? [cg, c] : null; }
    const c = EST.c.find((x) => cont(tk(dep), tk(x.nome || "")) || cont(tk(x.u), tk(dep))); return c ? ["E", c] : null; };
  const PESS = {}, cache = {};
  TODAS.forEach((x) => { if (/^BANCADA/.test(norm(x.dep))) return; const cd = cache[x.dep] !== undefined ? cache[x.dep] : (cache[x.dep] = cand(x.dep)), k = cd ? cd[0] + ":" + cd[1].n : "-:" + norm(x.dep);
    const p = PESS[k] = PESS[k] || { k, dep: x.dep, deps: new Set(), cg: cd ? cd[0] : null, c: cd ? cd[1] : null, rec: new Array(N).fill(0), rp: new Array(N).fill(0), tot: 0 };
    p.deps.add(norm(x.dep)); p.tot += x.v || 0; if (x.mi != null) { p.rec[x.mi] += x.v || 0; p.rp[x.mi] += Math.min(x.vp || 0, x.v || 0); } });
  const porDep = (n) => Object.values(PESS).find((p) => p.deps.has(norm(n))) || null;
  const LOA = (() => { const c = (COTAS_LEGAIS[2027] || {}).AN, L = c && typeof listaDaCota === "function" ? listaDaCota(2027, "AN") : null; return { c, it: L ? AD.itens.filter((x) => x.lista_id === L.id && cheia(x)) : [] }; })();
  // líderes: etiquetas com nome de pessoa (uma palavra, inicial maiúscula, sem números) nos recursos do Controle
  const LL = {}, semMun = {};
  CT.forEach(({ r, v }) => (r.tags || []).filter((t) => /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(t)).forEach((t) => { const i = IX[norm(r.municipio)]; if (i == null) { semMun[t] = (semMun[t] || 0) + v; return; } (LL[t] = LL[t] || {}); LL[t][i] = (LL[t][i] || 0) + v; }));
  return { M, N, IX, P, tot, pag, reg, CT, PESS, porDep, LOA, LL, semMun, FED: CG_FED, cfg };
}

// ---------- mapas (SVG) ----------
function cgProj() { const C = BASE.contorno; let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; C.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 760, S = W / ((lo1 - lo0) * K), H = (la0 - la1) * S, P = (lo, la) => [(lo - lo0) * K * S, (la0 - la) * S];
  const fundo = `<path d="${C.map((an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("")).join("")}" fill="#F4F5F6" stroke="#D5D9DC" stroke-width=".45"/>`; return { W, H, P, fundo }; }
const CG_AZ = "#2B5FD9", CG_LJ = "#E8822A", CG_CZ = "#9AA0A6", CG_VD = "#1FA845";
function cgArco(cx, cy, r, a0, a1, cor) { if (a1 - a0 >= 2 * Math.PI - 1e-6) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${cor}" fill-opacity=".78" stroke="#fff" stroke-width=".5"/>`;
  const x0 = cx + r * Math.sin(a0), y0 = cy - r * Math.cos(a0), x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1);
  return `<path d="M${cx.toFixed(1)},${cy.toFixed(1)}L${x0.toFixed(1)},${y0.toFixed(1)}A${r.toFixed(1)},${r.toFixed(1)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}Z" fill="${cor}" fill-opacity=".78" stroke="#fff" stroke-width=".5"/>`; }
function cgAnel(cx, cy, r, f) { if (f <= 0) return ""; if (f >= .999) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${CG_VD}" stroke-width="1.8"/>`;
  const a1 = 2 * Math.PI * f, x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1); return `<path d="M${cx.toFixed(1)},${(cy - r).toFixed(1)}A${r.toFixed(1)},${r.toFixed(1)} 0 ${f > .5 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="${CG_VD}" stroke-width="1.8"/>`; }

// ---------- documento ----------
// Ordem (03/11/2026, pedido do usuário): capa (cota aberta + distribuição do mandato) · lista de indicação para preencher ·
// avaliação regional · líderes · simulação da cota por região · análise de outros parlamentares (por último).
// Mais visual e menos texto; a coluna pela qual a tabela está ordenada leva a seta verde (▼ maior primeiro, ▲ menor primeiro).
const CG_IC = { sau: '<path d="M6.5 2.5h3v4h4v3h-4v4h-3v-4h-4v-3h4z"/>', fun: '<path d="M2.5 13.5h11M3.5 13.5v-6h3v6M6.5 13.5V4.5h3v9M9.5 13.5v-4h3v4"/>',
  cus: '<ellipse cx="8" cy="4.3" rx="4.5" ry="1.8"/><path d="M3.5 4.3v7.4c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8V4.3M3.5 8c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8"/>', inv: '<path d="M2.5 13.5h11M4 13.5V8l4-3 4 3v5.5M8 1.8v3.6M6.4 3.2L8 1.6l1.6 1.6"/>' };
const CG_PAL = ["#1F8F4A", "#2B5FD9", "#E8822A", "#5DB77C", "#7FA2EC", "#F3B98A", "#8A4FBF", "#0E7C66", "#C9CDD1"];
const cgOrd = (t, cima) => `${t} <span class="ord">${cima ? "▲" : "▼"}</span>`;
function cgDoc(G) {
  const { M, N, P, tot, pag, reg, CT, PESS, porDep, LOA, LL, semMun, FED, cfg } = G, PJ = cgProj(), { W, H, fundo } = PJ, v26 = PARL.v || [], v22 = PARL.v22 || [];
  const all = [...Array(N).keys()], somaV = (L, a) => L.reduce((s, i) => s + (a[i] || 0), 0), pnome = PARL.u.split(" ")[0];
  const kp = (L, cls = "") => `<div class="kp ${cls}">${L.map(([v, k, c]) => `<div${c ? ` class="${c}"` : ""}><b>${v}</b><span>${k}</span></div>`).join("")}</div>`;
  const sec = (n, t, sub) => `<div class="sec"><span class="sn">${n}</span><div><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ""}</div></div>`;
  const sub = (t, html) => `<div class="sub" data-s="${cgE(t)}">${html}</div>`, pg = (t, html) => `<section class="pg" data-t="${cgE(t)}">${html}</section>`;
  const h4 = (t, s) => `<h4>${t}${s ? ` <small>${s}</small>` : ""}</h4>`;
  const foto = (n, cg = "estadual") => `../dados/fotos/sc-2026/${cg}/${n}.jpg`;
  const MUNS = all.filter((i) => tot(P[i]) > 0), T = { E: 0, Ep: 0, C: 0, Cp: 0, O: 0, Op: 0 }; MUNS.forEach((i) => Object.keys(T).forEach((k) => { T[k] += P[i][k]; }));
  const TR = reg.reduce((s, r) => s + r.v, 0), TRp = reg.reduce((s, r) => s + (r.pg ? r.v : 0), 0), TOT = T.E + T.C + T.O + TR, PAG = T.Ep + T.Cp + T.Op + TRp, RN = all.map((i) => tot(P[i]));
  const anos = [2023, 2024, 2025, 2026], porAno = Object.fromEntries(anos.map((a) => [a, { E: E0.filter((e) => +e.ano === a).reduce((s, e) => s + (e.v || 0), 0), C: CT.filter((x) => x.t === "C" && +x.r.ano === a).reduce((s, x) => s + x.v, 0), O: CT.filter((x) => x.t === "O" && +x.r.ano === a).reduce((s, x) => s + x.v, 0) }]));
  const CORT = { E: CG_AZ, C: CG_LJ, O: CG_CZ }, ROTT = { E: "Emendas impositivas", C: "Convênios", O: "Outros" };
  const path = (i) => BASE.contorno[i].map((r) => "M" + r.map(([lo, la]) => PJ.P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("");
  // ===== capa: cota aberta (visual) + distribuição do mandato (visual)
  const c = LOA.c, nm = PARL.u.split(" "), ind = LOA.it.reduce((s, x) => s + (+x.valor || 0), 0), sd = LOA.it.filter((x) => x.area === "Saúde").reduce((s, x) => s + (+x.valor || 0), 0), fd = LOA.it.filter((x) => x.area === "FUNDAM").reduce((s, x) => s + (+x.valor || 0), 0);
  const medidor = (rot, v, m, ref) => { const ok = m ? v >= m - .005 : null;
    return `<div class="rg"><span>${rot}</span><div class="rb"><i style="width:${Math.min(100, v / ref * 100).toFixed(1)}%"></i>${m ? `<b style="left:${(m / ref * 100).toFixed(1)}%"></b>` : ""}</div><em class="${m ? (ok ? "ok" : "av") : ""}">${m ? (ok ? "✓ " + cgFm(v) : "faltam " + cgFm(m - v)) : cgPct(v, ref)}</em></div>`; };
  const chips = c ? [["mín.", cgFm(c.min) + " por emenda"], ["até", c.max + " emendas"], c.saude ? ["Saúde", "≥ " + c.saude * 100 + "%"] : null, c.fundam ? ["FUNDAM", c.fundam * 100 + "% · a confirmar"] : null, ["TE", "município"], ["Convênio", "entidade · CNPJ"], ["ED", "Estado"], ["capital", "70% das TE"]].filter(Boolean) : [];
  const blocoLoa = c ? `<div class="blk"><div class="bh"><h3>Impositivas LOA 2027</h3><span class="tag lj">fecha ${new Date(c.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span></div>
    ${kp([[cgFm(c.disp), "cota"], [cgFm(ind), "indicado"], [cgFm(c.disp - ind), "saldo"], [`${LOA.it.length}<small>/${c.max}</small>`, "emendas"]])}
    <div class="med">${medidor("Cota usada", ind, 0, c.disp)}${c.saude ? medidor(`Saúde ≥ ${c.saude * 100}%`, sd, c.disp * c.saude, c.disp) : ""}${c.fundam ? medidor(`FUNDAM ${c.fundam * 100}%`, fd, c.disp * c.fundam, c.disp) : ""}</div>
    <div class="chips">${chips.map(([a, b]) => `<span><b>${cgE(a)}</b> ${cgE(b)}</span>`).join("")}</div>
    <p class="fonte">${cgE(c.doc || "")} · ${cgE(c.base || "")} · entrega ${cgE(c.entrega || "")}</p></div>` : "";
  const mxAno = Math.max(1, ...anos.map((a) => porAno[a].E + porAno[a].C + porAno[a].O));
  const barrasAno = `<div class="anos">${anos.map((a) => { const o = porAno[a], t = o.E + o.C + o.O; return `<div class="an"><span>${a}</span><div class="ab" style="width:${(t / mxAno * 100).toFixed(1)}%">${["E", "C", "O"].map((k) => o[k] > 0 ? `<i style="width:${(o[k] / t * 100).toFixed(1)}%;background:${CORT[k]}"></i>` : "").join("")}</div><b>${cgFm(t)}</b></div>`; }).join("")}</div>`;
  const mxP = Math.max(1, ...MUNS.map((i) => RN[i])); let pies = "";
  [...MUNS].sort((a, b) => RN[b] - RN[a]).forEach((i) => { const o = P[i], t = RN[i], [x, y] = PJ.P(M[i].lon, M[i].lat), r = 2.2 + 24 * Math.sqrt(t / mxP); let a = 0;
    ["E", "C", "O"].forEach((k) => { if (o[k] <= 0) return; const b = a + 2 * Math.PI * o[k] / t; pies += cgArco(x, y, r, a, b, CORT[k]); a = b; }); pies += cgAnel(x, y, r + 1.8, pag(o) / t); });
  const mapaTipos = `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mp">${fundo}${pies}</svg>`;
  const blocoMand = `<div class="blk"><div class="bh"><h3>Distribuição do mandato · 2023-2026</h3><span class="tag">${cgFm(TOT)} · ${cgPct(PAG, TOT)} pago</span></div>
    ${kp([[cgFm(TOT), "total indicado"], [cgPct(PAG, TOT), "já pago", "vd"], [cgNi(MUNS.length), "municípios"], [cgNi(PARL.t), "votos 2026"], ["R$ " + cgNi(TOT / PARL.t), "por voto"]])}
    <div class="duas cm"><div>${h4("Por tipo")}<div class="tipos">${["E", "C", "O"].map((k) => { const v = k === "C" ? T.C + TR : T[k], p = k === "C" ? T.Cp + TRp : T[k + "p"]; return `<div class="tp"><i style="background:${CORT[k]}"></i><span>${ROTT[k]}</span><b>${cgFm(v)}</b><em>${cgPct(p, v)} pago</em></div>`; }).join("")}</div>
      ${h4("Por ano")}${barrasAno}</div><div><div class="mapw">${mapaTipos}</div><div class="leg"><span><i style="background:${CG_AZ}"></i>emenda</span><span><i style="background:${CG_LJ}"></i>convênio</span><span><i style="background:${CG_CZ}"></i>outros</span><span><i class="ring"></i>pago</span></div></div></div>
    <p class="fonte">Emendas: portal da SEF · convênios e outros: Controle do gabinete${reg.length ? ` · ${cgFm(TR)} sem município` : ""}</p></div>`;
  const capa = `<section class="pg capa" data-t="1 · Capa"><div class="topo"><span class="wm">Simula<b>LEGIS</b></span><span>Caderno de recursos</span></div>
    <div class="cid"><img src="${foto(PARL.n)}" alt="" onerror="this.style.visibility='hidden'"><div><div class="olho">Deputado estadual · SC · ${cgE(PARL.p)}</div><h1>${cgE(nm.slice(0, -1).join(" "))} <i>${cgE(nm.slice(-1)[0])}.</i></h1></div></div>
    ${c ? sub("Impositivas LOA 2027", blocoLoa) : ""}${sub("Distribuição do mandato", blocoMand)}</section>`;
  // ===== 2 · lista para preencher à caneta: ícones para marcar (área Saúde/FUNDAM, instrumento, natureza) e o líder; 120 linhas
  const icn = (k, on, t) => `<span class="ic${on ? " on" : ""}" title="${t || ""}"><svg viewBox="0 0 16 16">${CG_IC[k]}</svg></span>`, box = (t, on) => `<span class="bx${on ? " on" : ""}">${t}</span>`;
  const linF = (x, k) => `<tr><td class="n">${k + 1}</td><td>${x ? cgE(x.municipio || "") : ""}</td><td class="ico">${icn("sau", x && x.area === "Saúde")}${icn("fun", x && x.area === "FUNDAM")}</td><td class="ico">${["TE", "CO", "ED"].map((s2) => box(s2, x && SIG_I[x.modalidade] === s2)).join("")}</td><td>${x ? cgE(frase(x.objeto || "")) : ""}</td><td class="r">${x && +x.valor ? cgNf(+x.valor, 2) : ""}</td><td class="ico">${icn("cus", x && x.natureza === "Custeio")}${icn("inv", x && x.natureza === "Investimento")}</td><td>${x ? cgE(x.lideranca || "") : ""}</td></tr>`;
  const legIc = `<div class="legic"><span>${icn("sau", 1)} Saúde</span><span>${icn("fun", 1)} FUNDAM</span><span class="mut">demais áreas: escreva no objeto</span><span>${box("TE", 1)} Transferência Especial · município</span><span>${box("CO", 1)} Convênio · entidade</span><span>${box("ED", 1)} Execução Direta · Estado</span><span>${icn("cus", 1)} Custeio</span><span>${icn("inv", 1)} Investimento</span></div>`;
  const lista = c ? `<section class="pg so" data-t="2 · Lista de indicação">${sec("2", "Lista de indicação · LOA 2027", "Para preencher à caneta: marque os ícones e escreva município, objeto, valor e líder.")}
    ${sub("Lista", `${legIc}<table class="tb form"><thead><tr><th class="n">Nº</th><th style="width:16%">Município</th><th style="width:7%">Área</th><th style="width:10%">Instrumento</th><th>Objeto</th><th class="r" style="width:12%">Valor (R$)</th><th style="width:7%">Natureza</th><th style="width:13%">Líder</th></tr></thead><tbody>
    ${Array.from({ length: Math.max(c.max || 120, LOA.it.length) }, (_, k) => linF(LOA.it[k], k)).join("")}</tbody></table>
    <div class="fim">${["Total", "Saúde", "FUNDAM", "Saldo"].map((t) => `<div><span>${t}</span><b></b></div>`).join("")}</div>`)}</section>` : "";
  // ===== 3 · avaliação regional
  const RG = {}; all.forEach((i) => { const k = M[i].assoc || "—"; const o = RG[k] = RG[k] || { k, mun: [], R: 0, V: 0, V2: 0, at: 0 }; o.mun.push(i); o.R += RN[i]; o.Rp = (o.Rp || 0) + (RN[i] > 0 ? pag(P[i]) : 0); o.V += v26[i] || 0; o.V2 += v22[i] || 0; if (RN[i] > 0) o.at++; });
  const REG = Object.values(RG).sort((a, b) => b.R - a.R), conv = (o) => o.R ? o.V / (o.R / 1e5) : null, medConv = cgMed(REG.filter((o) => o.R > 0).map(conv));
  const escala = (v, L) => { const s = [...L].sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))]; return v == null ? 0 : v <= q(.25) ? 1 : v <= q(.5) ? 2 : v <= q(.75) ? 3 : 4; };
  const TONS_V = ["#E9EBED", "#CFE8D6", "#9FD3AE", "#5DB77C", "#1F8F4A"], convs = REG.map(conv).filter((v) => v != null);
  const mapaReg = (valor, rot) => { const L = REG.map(valor).filter((v) => v != null); let s = "";
    REG.forEach((o) => { const cor = TONS_V[escala(valor(o), L)]; o.mun.forEach((i) => { s += `<path d="${path(i)}" fill="${cor}" stroke="#fff" stroke-width=".35"/>`; }); });
    REG.forEach((o) => { const x = o.mun.reduce((a, i) => a + PJ.P(M[i].lon, M[i].lat)[0], 0) / o.mun.length, y = o.mun.reduce((a, i) => a + PJ.P(M[i].lon, M[i].lat)[1], 0) / o.mun.length; s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="rl"><tspan x="${x.toFixed(1)}">${cgE(o.k)}</tspan><tspan x="${x.toFixed(1)}" dy="11" class="rv">${rot(o)}</tspan></text>`; });
    return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mp">${s}</svg>`; };
  const legEsc = (tit) => `<div class="esc"><span>${tit}</span>${TONS_V.map((cr, k) => `<i style="background:${cr}"></i>`).join("")}<span>menor → maior</span></div>`;
  const ordem = [...MUNS].sort((a, b) => RN[b] - RN[a]), rpv = (i) => v26[i] ? RN[i] / v26[i] : null;
  const regional = pg("3 · Avaliação regional", `${sec("3", "Avaliação regional", "Recurso do mandato e conversão em voto por associação de municípios.")}
    ${sub("Mapa das regiões", `<div class="duas" style="grid-template-columns:1.25fr 1fr;align-items:start"><div><div class="mapw">${mapaReg(conv, (o) => o.R ? cgFm(o.R) : "—")}</div>${legEsc("Conversão (votos por R$ 100 mil)")}</div>
      <div>${kp([[cgNi(REG.filter((o) => o.R > 0).length), "regiões com recurso"], [cgNf(medConv, 0), "conversão mediana"]], "k2")}
      ${(() => { const mx = Math.max(...REG.map((o) => o.R)); return `<div class="rbar"><div class="rh"><span>Região</span><span>${cgOrd("Recurso")} · <em>pago</em></span><span></span><span>Conversão</span></div>${REG.filter((o) => o.R > 0).slice(0, 14).map((o) => `<div><span>${cgE(o.k)}</span><div class="bt"><i style="width:${(o.R / mx * 100).toFixed(1)}%"></i><u style="width:${(o.Rp / mx * 100).toFixed(1)}%"></u></div><b>${cgFm(o.R)}</b><em>${cgNf(conv(o), 0)}</em></div>`).join("")}</div>`; })()}</div></div>`)}
    ${sub("Tabela por região", `<table class="tb"><tr><th>Região</th><th class="r">Municípios</th><th class="r">${cgOrd("Recurso")}</th><th class="r">% do total</th><th class="r">Votos 2022</th><th class="r">Votos 2026</th><th class="r">Variação</th><th class="r">R$/voto</th><th class="r">Conversão</th></tr>
      ${REG.map((o) => `<tr><td><b>${cgE(o.k)}</b></td><td class="r">${o.at}/${o.mun.length}</td><td class="r">${o.R ? cgFm(o.R) : "—"}</td><td class="r">${cgPct(o.R, TOT)}</td><td class="r">${cgNi(o.V2)}</td><td class="r">${cgNi(o.V)}</td><td class="r ${o.V >= o.V2 ? "ok" : "av"}">${cgVar(o.V, o.V2)}</td><td class="r">${o.R && o.V ? "R$ " + cgNi(o.R / o.V) : "—"}</td><td class="r"><b>${conv(o) != null ? cgNf(conv(o), 0) : "—"}</b></td></tr>`).join("")}</table>
      <p class="fonte">Conversão = votos de ${cgE(pnome)} em 2026 na região para cada R$ 100 mil do mandato ali (2023-2026).</p>`)}
    ${sub("Ranking dos municípios", `${h4("Municípios com recurso", cgNi(MUNS.length))}<table class="tb rk"><thead><tr><th class="n">#</th><th>Município</th><th>Região</th><th class="r">Emendas</th><th class="r">Convênios</th><th class="r">Outros</th><th class="r">${cgOrd("Total")}</th><th class="r">Pago</th><th class="r">Votos 2022</th><th class="r">Votos 2026</th><th class="r">R$/voto</th></tr></thead><tbody>
      ${ordem.map((i, k) => `<tr><td class="n">${k + 1}</td><td><b>${cgE(M[i].n)}</b></td><td class="mut">${cgE(M[i].assoc || "")}</td><td class="r">${P[i].E ? cgFm(P[i].E) : "—"}</td><td class="r">${P[i].C ? cgFm(P[i].C) : "—"}</td><td class="r">${P[i].O ? cgFm(P[i].O) : "—"}</td><td class="r"><b>${cgFm(RN[i])}</b></td><td class="r">${cgPct(pag(P[i]), RN[i])}</td><td class="r">${cgNi(v22[i])}</td><td class="r">${cgNi(v26[i])}</td><td class="r">${rpv(i) != null ? "R$ " + cgNi(rpv(i)) : "—"}</td></tr>`).join("")}</tbody></table>`)}`);
  // ===== 4 · líderes
  const TC = all.map((i) => Math.max(RN[i], Object.values(LL).reduce((s, L) => s + (L[i] || 0), 0))), convI = (i) => TC[i] ? v26[i] / (TC[i] / 1e5) : 0, atrib = (i, r) => TC[i] ? v26[i] * r / TC[i] : 0;
  const ordL = Object.keys(LL).sort((a, b) => Object.values(LL[b]).reduce((s, v) => s + v, 0) - Object.values(LL[a]).reduce((s, v) => s + v, 0));
  const resL = ordL.map((l) => { const idx = Object.keys(LL[l]).map(Number), R0 = idx.reduce((s, i) => s + LL[l][i], 0), va = idx.reduce((s, i) => s + atrib(i, LL[l][i]), 0); return { l, idx, R0, va, cv: R0 ? va / (R0 / 1e5) : 0, rpv: va ? R0 / va : null, med: cgMed(idx.map(convI)), v26: somaV(idx, v26), v22: somaV(idx, v22) }; }).sort((a, b) => b.cv - a.cv);
  const blocoL = (o) => { const cid = LL[o.l], mx2 = Math.max(...o.idx.map((i) => cid[i])), cs = [...o.idx].sort((a, b) => convI(b) - convI(a));
    const mp = [...o.idx].sort((a, b) => cid[b] - cid[a]).map((i) => { const [x, y] = PJ.P(M[i].lon, M[i].lat), c2 = convI(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + 18 * Math.sqrt(cid[i] / mx2)).toFixed(1)}" fill="${c2 >= 100 ? "#3E4449" : c2 >= 40 ? "#7E848A" : "#B0B5BA"}" stroke="#fff" stroke-width=".6"/>`; }).join("");
    return sub("Líder · " + o.l, `<div class="lid"><div class="lh"><b>${cgE(o.l)}</b><span>${cgFm(o.R0)} · ${o.idx.length} município${o.idx.length > 1 ? "s" : ""}${semMun[o.l] ? " · " + cgFm(semMun[o.l]) + " sem município" : ""}</span></div>
      <div class="duas" style="grid-template-columns:.85fr 1.5fr"><div><div class="mapw">${`<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mp">${fundo}${mp}</svg>`}</div>${kp([[cgNf(o.cv, 0), "votos por R$ 100 mil"], [o.rpv ? "R$ " + cgNi(o.rpv) : "—", "por voto"], [cgVar(o.v26, o.v22), "votos 2022 → 2026", o.v26 >= o.v22 ? "vd" : "vm"]], "k3")}</div>
      <div><table class="tb mini"><tr><th class="n">#</th><th>Município</th><th class="r">Recurso</th><th class="r">Votos 2022</th><th class="r">Votos 2026</th><th class="r">Variação</th><th class="r">${cgOrd("Conversão")}</th></tr>
      ${cs.map((i, k) => `<tr><td class="n">${k + 1}</td><td><b>${cgE(M[i].n)}</b></td><td class="r">${cgFm(cid[i])}</td><td class="r">${cgNi(v22[i])}</td><td class="r">${cgNi(v26[i])}</td><td class="r ${v26[i] >= v22[i] ? "ok" : "av"}">${cgVar(v26[i], v22[i])}</td><td class="r"><b>${cgNf(convI(i), 0)}</b></td></tr>`).join("")}</table></div></div></div>`); };
  const lideres = ordL.length ? pg("4 · Líderes", `${sec("4", "Taxa de conversão dos líderes", `Votos de ${cgE(pnome)} em 2026 para cada R$ 100 mil que o líder trouxe.`)}
    ${sub("Ranking dos líderes", `${(() => { const mx = Math.max(...resL.map((o) => o.cv)); return `<table class="tb"><tr><th class="n">#</th><th>Líder</th><th class="r">Recurso</th><th class="r">Municípios</th><th class="r">Votos atribuídos</th><th style="width:26%">${cgOrd("Conversão")} <span class="mut" style="text-transform:none;letter-spacing:0">votos por R$ 100 mil</span></th><th class="r">R$ por voto</th><th class="r">Votos 2022 → 2026</th></tr>
      ${resL.map((o, k) => `<tr><td class="n">${k + 1}</td><td><b>${cgE(o.l)}</b></td><td class="r">${cgFm(o.R0)}</td><td class="r">${o.idx.length}</td><td class="r">${cgNi(o.va)}</td><td><div class="cvb"><i style="width:${(o.cv / mx * 100).toFixed(1)}%"></i><b>${cgNf(o.cv, 0)}</b></div></td><td class="r"><b>${o.rpv ? "R$ " + cgNi(o.rpv) : "—"}</b></td><td class="r ${o.v26 >= o.v22 ? "ok" : "av"}">${cgVar(o.v26, o.v22)}</td></tr>`).join("")}</table>`; })()}
      <div class="como" style="margin-top:12px"><b>Como ler.</b> <b>R$ por voto</b> é quanto de recurso o líder trouxe para cada voto de ${cgE(pnome)} nas cidades dele: recurso ÷ votos atribuídos. <b>Conversão</b> é a mesma conta ao contrário, em votos para cada R$ 100 mil (conversão 50 = R$ 2.000 por voto). Exemplo: ${(() => { const o = resL[0]; return o ? `${cgE(o.l)} trouxe ${cgFm(o.R0)} e ficou com ${cgNi(o.va)} votos atribuídos: ${o.rpv ? "R$ " + cgNi(o.rpv) : "—"} por voto, ou ${cgNf(o.cv, 0)} votos por R$ 100 mil.` : ""; })()} <b>Votos atribuídos:</b> quando mais de um líder atua no mesmo município, os votos dali são divididos entre eles pelo tamanho do recurso de cada um, para ninguém ser contado duas vezes.</div>`)}
    ${resL.map(blocoL).join("")}`) : "";
  // ===== 5 · simulação da cota por região (LOA 2027)
  let simul = "";
  if (c) {
    const regV = REG.filter((o) => o.V > 0), totV = regV.reduce((s, o) => s + o.V, 0), totR = regV.reduce((s, o) => s + o.R, 0);
    const cvR = (o) => conv(o) != null ? conv(o) : medConv, peso = (o) => (o.V / totV) * Math.sqrt(cvR(o) / medConv), sp = regV.reduce((s, o) => s + peso(o), 0);
    const unid = Math.floor(c.disp / 1e5), resto = c.disp - unid * 1e5, base = regV.map((o) => ({ o, q: peso(o) / sp * unid }));
    base.forEach((b) => { b.u = Math.floor(b.q); }); let falta = unid - base.reduce((s, b) => s + b.u, 0); [...base].sort((a, b) => (b.q - b.u) - (a.q - a.u)).forEach((b) => { if (falta > 0) { b.u++; falta--; } });
    base.sort((a, b) => b.u - a.u); if (base[0]) base[0].extra = resto;
    const cota = (b) => b.u * 1e5 + (b.extra || 0), hist = (b) => totR ? b.o.R / totR * c.disp : 0, prop = (b) => b.o.V / totV * c.disp, esper = (v, b) => v * cvR(b.o) / 1e5;
    const eS = base.reduce((s, b) => s + esper(cota(b), b), 0), eH = base.reduce((s, b) => s + esper(hist(b), b), 0), eP = base.reduce((s, b) => s + esper(prop(b), b), 0);
    const SIM = Object.fromEntries(base.map((b) => [b.o.k, cota(b)])), Ls = Object.values(SIM);
    let mS = ""; REG.forEach((o) => { const v = SIM[o.k] || 0, cor = v ? TONS_V[1 + Math.min(3, Math.floor(escala(v, Ls) - .01))] : TONS_V[0]; o.mun.forEach((i) => { mS += `<path d="${path(i)}" fill="${v ? cor : TONS_V[0]}" stroke="#fff" stroke-width=".35"/>`; }); });
    REG.forEach((o) => { if (!SIM[o.k]) return; const x = o.mun.reduce((a, i) => a + PJ.P(M[i].lon, M[i].lat)[0], 0) / o.mun.length, y = o.mun.reduce((a, i) => a + PJ.P(M[i].lon, M[i].lat)[1], 0) / o.mun.length; mS += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="rl"><tspan x="${x.toFixed(1)}">${cgE(o.k)}</tspan><tspan x="${x.toFixed(1)}" dy="11" class="rv">${cgFm(SIM[o.k])}</tspan></text>`; });
    const pp = (a, b) => { const d = (a - b) / c.disp * 100; return `<span class="${d >= 0 ? "ok" : "av"}">${d >= 0 ? "+" : ""}${cgNf(d, 1)} p.p.</span>`; };
    simul = pg("5 · Simulação LOA 2027", `${sec("5", "Sugestão de cota por região · LOA 2027", "Distribuição da cota de " + cgFm(c.disp) + " pelo voto de 2026 e pela conversão de cada região.")}
      ${sub("Cenários", `<div class="como"><b>Regra da sugestão.</b> Cada região recebe pela sua parte nos votos de 2026, corrigida pela conversão (regiões que convertem mais ganham peso; a correção é suavizada pela raiz quadrada para não concentrar demais). Valores em múltiplos de R$ 100 mil, o mínimo por emenda. A regra da Saúde (≥ ${c.saude ? c.saude * 100 : 50}%) vale dentro de cada região.</div>
      <div class="duas" style="grid-template-columns:1.25fr 1fr;align-items:start"><div><div class="mapw">${`<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mp">${mS}</svg>`}</div></div>
      <div>${h4("Votos esperados", "no ritmo de conversão atual")}${kp([[cgNi(eH), "repetir o histórico"], [cgNi(eP), "proporcional ao voto"], [cgNi(eS), "sugestão", "vd"]], "k3")}
      <p class="fonte">Votos esperados = cota × conversão atual da região. É uma referência de ordem de grandeza: a conversão média de 2023-2026 não garante o mesmo retorno para cada real novo.</p>
      ${h4("Como a cota se divide", "cada cor é uma região")}<div class="cen">${[["Repetir o histórico", hist], ["Proporcional ao voto", prop], ["Sugestão", cota]].map(([t, f]) => `<div><span>${t}</span><div class="cb">${base.map((b, k) => `<i style="width:${(f(b) / c.disp * 100).toFixed(2)}%;background:${CG_PAL[Math.min(k, CG_PAL.length - 1)]}"></i>`).join("")}</div></div>`).join("")}</div>
      <div class="leg" style="justify-content:flex-start;margin-top:8px">${base.slice(0, CG_PAL.length - 1).map((b, k) => `<span><i style="background:${CG_PAL[k]}"></i>${cgE(b.o.k)}</span>`).join("")}${base.length >= CG_PAL.length ? `<span><i style="background:${CG_PAL[CG_PAL.length - 1]}"></i>demais</span>` : ""}</div></div></div>`)}
      ${sub("Tabela da sugestão", `<table class="tb"><tr><th>Região</th><th class="r">Votos 2026</th><th class="r">% votos</th><th class="r">% histórico</th><th class="r">Conversão</th><th class="r">${cgOrd("Cota sugerida")}</th><th class="r">%</th><th class="r">vs histórico</th><th class="r">Emendas de R$ 100 mil</th></tr>
        ${base.map((b) => `<tr><td><b>${cgE(b.o.k)}</b></td><td class="r">${cgNi(b.o.V)}</td><td class="r">${cgPct(b.o.V, totV)}</td><td class="r">${cgPct(b.o.R, totR)}</td><td class="r">${conv(b.o) != null ? cgNf(conv(b.o), 0) : "<span class=mut>sem histórico</span>"}</td><td class="r"><b>${cgFm(cota(b))}</b></td><td class="r">${cgPct(cota(b), c.disp)}</td><td class="r">${pp(cota(b), hist(b))}</td><td class="r">até ${b.u}</td></tr>`).join("")}
        <tr class="tt"><td>Total</td><td class="r">${cgNi(totV)}</td><td class="r">100%</td><td class="r">100%</td><td class="r">${cgNf(medConv, 0)} <small>mediana</small></td><td class="r">${cgFm(c.disp)}</td><td class="r">100%</td><td></td><td class="r">${unid}</td></tr></table>`)}`);
  }
  // ===== 6 · outros parlamentares (por último): estudo de candidatos, cruzamento e pares
  const slots = (cfg.cand || []).filter((s) => s && s.n), cores = ["#0E7C66", "#8A4FBF"], pesOf = (s, cc) => s.de ? porDep(s.de) : PESS["E:" + cc.n] || null;
  const estudo = (s, cor) => { const cc = EST.c.find((x) => String(x.n) === String(s.n)); if (!cc) return ""; const pe = pesOf(s, cc), rec = pe ? pe.rec : new Array(N).fill(0), vot = cc.v, trec = rec.reduce((a, v) => a + v, 0);
    const ambos = all.filter((i) => vot[i] && rec[i]), va = somaV(ambos, vot), ra = somaV(ambos, rec), efic = ambos.filter((i) => vot[i] >= 200).sort((a, b) => rec[a] / vot[a] - rec[b] / vot[b]).slice(0, 12), topv = [...all].sort((a, b) => vot[b] - vot[a]).slice(0, 12);
    const rv = ambos.filter((i) => vot[i] >= 50).map((i) => rec[i] / vot[i]).sort((a, b) => a - b), q = (p) => rv.length ? rv[Math.min(rv.length - 1, Math.floor(rv.length * p))] : 1, mxv = Math.max(1, ...vot);
    let mp = ""; [...all].sort((a, b) => vot[b] - vot[a]).forEach((i) => { if (!vot[i]) return; const [x, y] = PJ.P(M[i].lon, M[i].lat), r = 1.4 + 22 * Math.sqrt(vot[i] / mxv);
      mp += rec[i] > 0 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${cor}" fill-opacity="${rec[i] / vot[i] <= q(.33) ? .9 : rec[i] / vot[i] <= q(.66) ? .6 : .32}" stroke="#fff" stroke-width=".5"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#B9BEC3" fill-opacity=".55" stroke="#fff" stroke-width=".5"/>`; });
    const lin = (i) => `<tr><td><b>${cgE(M[i].n)}</b></td><td class="r">${cgNi(vot[i])}</td><td class="r">${rec[i] ? cgFm(rec[i]) : "—"}</td><td class="r">${rec[i] && vot[i] ? "R$ " + cgNi(rec[i] / vot[i]) : "—"}</td><td class="r mut">${cgNi(v26[i])}</td></tr>`;
    const cab = (o) => `<tr><th>Município</th><th class="r">${o === "v" ? cgOrd("Votos") : "Votos"}</th><th class="r">Emendas</th><th class="r">${o === "r" ? cgOrd("R$/voto", true) : "R$/voto"}</th><th class="r">${cgE(pnome)}</th></tr>`;
    return sub("Estudo · " + cc.u, `<div class="est"><div class="eh"><img src="${foto(cc.n)}" alt="" style="border-color:${cor}" onerror="this.style.visibility='hidden'"><div><b>${cgE(cc.u)}</b><small>${cgE(cc.p)} · ${cgE(String(cc.s).toLowerCase())}${pe && pe.c && pe.c.n !== cc.n ? " · emendas de " + cgE(pe.c.u) : ""}</small></div></div>
      ${kp([[cgNi(cc.t), "votos 2026"], [cgFm(trec), "emendas 2023-26"], [cgNi(ambos.length), "municípios com voto e emenda"], [cgPct(va, cc.t), "dos votos onde houve emenda"], ["R$ " + (va ? cgNi(ra / va) : "0"), "por voto"]])}
      <div class="duas" style="grid-template-columns:1fr 1.25fr"><div><div class="mapw">${`<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mp">${fundo}${mp}</svg>`}</div><div class="leg"><span><i style="background:${cor}"></i>voto com emenda</span><span><i style="background:#B9BEC3"></i>sem emenda</span></div></div>
      <div>${h4("Melhor R$ por voto", "200 votos ou mais")}<table class="tb mini">${cab("r")}${efic.map(lin).join("")}</table></div></div>
      ${h4("Maiores bases")}<table class="tb mini">${cab("v")}${topv.map(lin).join("")}</table></div>`); };
  const cruzL = []; all.forEach((i) => { const L = []; slots.forEach((s, k) => { const cc = EST.c.find((x) => String(x.n) === String(s.n)); if (!cc) return; const pe = pesOf(s, cc), v = cc.v[i]; if (pe && v >= 200 && pe.rec[i] > 0 && pe.rec[i] / v <= 600) L.push({ cc, v, rpv: pe.rec[i] / v, k }); }); if (L.length && RN[i] < 300000) cruzL.push({ i, L, s: L.reduce((a, x) => a + x.v, 0) }); });
  cruzL.sort((a, b) => b.s - a.s);
  const cruz = slots.length ? sub("Cruzamento com o mandato", `${h4("Onde estudar", `boa relação dos candidatos e menos de R$ 300 mil do mandato de ${cgE(pnome)}`)}
    <table class="tb"><tr><th>Município</th><th>Região</th>${slots.map((s, k) => { const cc = EST.c.find((x) => String(x.n) === String(s.n)); return cc ? `<th class="r" style="color:${cores[k]}">${cgE(cc.u)} · votos</th><th class="r">R$/voto</th>` : ""; }).join("")}<th class="r">${cgOrd(cgE(pnome) + " · votos")}</th><th class="r">Recurso do mandato</th></tr>
    ${cruzL.slice(0, 20).sort((a, b) => v26[b.i] - v26[a.i]).map((o) => `<tr><td><b>${cgE(M[o.i].n)}</b></td><td class="mut">${cgE(M[o.i].assoc || "")}</td>${slots.map((s, k) => { const x = o.L.find((y) => y.k === k); return EST.c.find((z) => String(z.n) === String(s.n)) ? `<td class="r">${x ? cgNi(x.v) : "—"}</td><td class="r">${x ? "R$ " + cgNi(x.rpv) : ""}</td>` : ""; }).join("")}<td class="r"><b>${cgNi(v26[o.i])}</b></td><td class="r">${RN[o.i] ? cgFm(RN[o.i]) : "—"}</td></tr>`).join("") || "<tr><td colspan=9>nenhum município</td></tr>"}</table>
    <p class="fonte">Boa relação: 200 votos ou mais e até R$ 600 por voto nas emendas de cada candidato.</p>`) : "";
  // pares: só quem disputou a Assembleia em 2022 e em 2026 (sem Ana Campagnolo), ordenados pela melhor conversão (menor R$ por voto)
  const lg = (v) => Math.log(1 + v);
  const PAR = Object.values(PESS).filter((p) => p.c && p.cg === "E" && norm(p.c.u) !== "ANA CAMPAGNOLO" && p.tot >= 5e6 && (p.c.t22 || 0) > 0).map((p) => { const cc = p.c, rec = p.rec, v = cc.v, mun = all.filter((i) => rec[i] > 0);
    return { u: cc.u, p: cc.p, s: cc.s, t: cc.t, t22: cc.t22, rec: p.tot, rpv: p.tot / cc.t, rho: cgSpear(rec, v), cob: cc.t ? somaV(mun, v) / cc.t : 0, vr: cc.t / cc.t22 - 1, c: cc, pr: p }; }).sort((a, b) => a.rpv - b.rpv);
  const eu = PAR.find((d) => String(d.c.n) === String(PARL.n));
  let pares = "";
  if (PAR.length > 5) {
    const X = M.map((m, i) => [1, lg(RN[i]), lg(v22[i]), lg(m.el)]), y = M.map((m, i) => lg(v26[i])), o1 = cgOls(X, y), o0 = cgOls(X.map((r) => [1, r[2], r[3]]), y), b = o1.beta[1];
    const rho_v = cgSpear(PAR.map((d) => d.rho), PAR.map((d) => d.vr)), mxr = Math.max(...PAR.map((d) => d.rpv));
    const perdeu = PAR.filter((d) => !/^Eleito/.test(d.s));
    const orfa = (d) => all.filter((i) => d.c.v[i] >= 300).sort((a, b2) => d.c.v[b2] - d.c.v[a]).slice(0, 4).map((i) => `${cgE(M[i].n)} <b>${cgNi(d.c.v[i])}</b>`).join(" · ");
    pares = `${sub("Pares · conversão R$ × voto", `${h4("Deputados que disputaram a Assembleia em 2022 e em 2026", `${PAR.length} pares · sem Ana Campagnolo`)}
      ${eu ? kp([[`${PAR.indexOf(eu) + 1}º`, "posição de " + cgE(pnome)], ["R$ " + cgNi(eu.rpv), "por voto"], [cgVar(eu.t, eu.t22), "votos 2022 → 2026", eu.t >= eu.t22 ? "vd" : "vm"], [cgNf(eu.rho, 2), "aderência emenda × voto"]]) : ""}
      <table class="tb mini"><tr><th class="n">#</th><th>Deputado</th><th class="r">Votos 2022</th><th class="r">Votos 2026</th><th class="r">Variação</th><th style="width:22%">${cgOrd("R$ por voto", true)}</th><th class="r">Aderência</th><th class="r">Cobertura</th></tr>
      ${PAR.map((d, k) => `<tr class="${d === eu ? "eu" : ""}"><td class="n">${k + 1}</td><td><b>${cgE(d.u)}</b><small>${cgE(d.p)} · ${/^Eleito/.test(d.s) ? "eleito" : cgE(String(d.s).toLowerCase())}</small></td><td class="r">${cgNi(d.t22)}</td><td class="r">${cgNi(d.t)}</td><td class="r ${d.vr >= 0 ? "ok" : "av"}">${(d.vr >= 0 ? "+" : "") + cgNf(d.vr * 100, 0)}%</td><td><div class="cvb inv"><i style="width:${(d.rpv / mxr * 100).toFixed(1)}%"></i><b>R$ ${cgNi(d.rpv)}</b></div></td><td class="r">${cgNf(d.rho, 2)}</td><td class="r">${cgNf(d.cob * 100, 0)}%</td></tr>`).join("")}</table>
      <p class="fonte">R$ por voto = emendas 2023-2026 ÷ votos de 2026 (menor é melhor). Aderência: correlação (Spearman) entre emenda e voto por município. Cobertura: parte dos votos vinda de municípios com emenda.</p>`)}
      ${sub("Modelo e oportunidades", `<div class="duas"><div>${h4("O caso " + cgE(PARL.u))}${kp([[cgNf(b * 10, 1) + "%", "mais voto a cada 10% de recurso"], [cgNf(o1.r2, 2), "R² com recurso"], [cgNf(o0.r2, 2), "R² sem recurso"]], "k3")}
        <p class="fonte">Regressão nos ${N} municípios: log(votos 2026) ~ log(recurso) + log(votos 2022) + log(eleitorado). Associação, não causa. Entre os pares, aderência × crescimento de votos: ρ = ${cgNf(rho_v, 2)}.</p></div>
        <div>${h4("Bases de quem perdeu o mandato", "cidades com 300 votos ou mais")}<table class="tb mini"><tr><th>Deputado</th><th class="r">Votos 2026</th><th>Maiores bases</th></tr>${perdeu.map((d) => `<tr><td><b>${cgE(d.u)}</b><small>${cgE(d.p)}</small></td><td class="r">${cgNi(d.t)}</td><td style="font-size:7.4px">${orfa(d)}</td></tr>`).join("") || "<tr><td colspan=3>nenhum</td></tr>"}</table></div></div>`)}`;
  }
  const outros = slots.length || pares ? pg("6 · Outros parlamentares", `${sec("6", "Análise de outros parlamentares", "Comparações para estudar: candidatos escolhidos, cruzamento com o mandato e os pares da Assembleia.")}
    ${slots.map((s, k) => estudo(s, cores[k % 2])).join("")}${cruz}${pares}`) : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${location.href.split("#")[0]}"><title>Caderno de recursos · ${cgE(PARL.u)}</title><style>${CG_CSS}</style></head><body>${capa}${lista}${regional}${lideres}${simul}${outros}<div class="rod">SimulaLEGIS · Caderno de recursos · ${new Date().toLocaleDateString("pt-BR")} · Emendas: portal da SEF${META.coletado_em ? " (" + new Date(META.coletado_em).toLocaleDateString("pt-BR") + ")" : ""} · Controle do gabinete · Votos: TSE</div></body></html>`;
}

// escala de espaço: 4 · 8 · 12 · 16 · 24 · 32 (px); uma só largura de texto; títulos com o mesmo recuo
const CG_CSS = `@font-face{font-family:Inter;src:url(../fontes/InterVariable.woff2) format("woff2");font-weight:100 900}
@page{size:A4;margin:14mm 13mm 14mm} *{box-sizing:border-box} body{font-family:Inter,system-ui,sans-serif;color:#15191C;margin:0;font-size:9.5px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}
.pg{break-before:page} .pg.prim{break-before:auto} .sub{margin-bottom:16px} .sub:last-child{margin-bottom:0}
.topo{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #15191C;padding-bottom:8px;margin-bottom:24px;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#6B7178;font-weight:700} .wm{font-size:17px;letter-spacing:-.01em;text-transform:none;color:#15191C;font-weight:800} .wm b{color:#1FA83A}
.cid{display:flex;gap:16px;align-items:center;margin-bottom:24px} .cid img{width:72px;height:72px;border-radius:50%;object-fit:cover;object-position:50% 18%;border:2.5px solid #2B5FD9}
.olho{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#6B7178;font-weight:700} h1{font-size:40px;line-height:.95;letter-spacing:-.04em;margin:4px 0 0;font-weight:900} h1 i{font-style:normal;color:#2B5FD9}
.blk{border:1px solid #DCDFE2;border-radius:12px;padding:16px;break-inside:avoid} .bh{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px} h3{font-size:14px;margin:0;letter-spacing:-.01em} h4{font-size:10px;margin:16px 0 8px;letter-spacing:.02em} h4 small{font-weight:400;color:#6B7178;margin-left:4px} .blk h4:first-child, .duas > div > h4:first-child{margin-top:0}
.tag{font-size:8.5px;font-weight:700;padding:4px 10px;border-radius:999px;background:#EEF0F2;white-space:nowrap} .tag.lj{background:#FDEBD8;color:#A35410} .mut{color:#6B7178} .fonte{font-size:7.6px;color:#8A9096;margin:8px 0 0;line-height:1.4}
.kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:8px;margin:0 0 12px} .kp div{padding:10px 12px;border-radius:8px;background:#F4F5F6} .kp b{display:block;font-size:15px;letter-spacing:-.02em;white-space:nowrap;font-variant-numeric:tabular-nums} .kp b small{font-size:10px;color:#8A9096;font-weight:600} .kp span{display:block;font-size:6.8px;letter-spacing:.1em;text-transform:uppercase;color:#6B7178;font-weight:700;margin-top:2px}
.kp .vd b{color:#1F8F4A} .kp .vm b{color:#C0392B} .kp.k2{grid-template-columns:1fr 1fr} .kp.k3{grid-template-columns:repeat(3,1fr)}
.med{display:grid;gap:8px;margin:4px 0 12px} .rg{display:grid;grid-template-columns:96px 1fr 104px;gap:12px;align-items:center} .rg span{font-weight:600} .rb{position:relative;height:8px;background:#EEF0F2;border-radius:999px} .rb i{position:absolute;left:0;top:0;bottom:0;background:#E8822A;border-radius:999px} .rb b{position:absolute;top:-3px;bottom:-3px;width:2px;background:#15191C;border-radius:1px} .rg em{font-style:normal;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.ok{color:#1F8F4A} .av{color:#C0392B} .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 4px} .chips span{font-size:8px;padding:4px 9px;border-radius:999px;background:#F4F5F6;color:#3F454B} .chips b{color:#15191C}
.duas{display:grid;grid-template-columns:1fr 1fr;gap:16px} .duas.cm{grid-template-columns:1fr 1.1fr;align-items:start}
.tipos{display:grid;gap:6px} .tp{display:grid;grid-template-columns:10px 1fr auto 64px;gap:8px;align-items:center} .tp i{width:10px;height:10px;border-radius:50%} .tp b{font-variant-numeric:tabular-nums} .tp em{font-style:normal;color:#6B7178;text-align:right}
.anos{display:grid;gap:6px} .an{display:grid;grid-template-columns:28px 1fr 64px;gap:8px;align-items:center} .an span{color:#6B7178;font-weight:600} .ab{display:flex;gap:1px;height:12px;border-radius:999px;overflow:hidden;min-width:3px} .ab i{display:block;height:100%} .an b{text-align:right;font-variant-numeric:tabular-nums}
.leg{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;font-size:8px;color:#3F454B;margin:4px 0 0} .leg span{display:inline-flex;align-items:center;gap:4px} .leg i{width:8px;height:8px;border-radius:50%;display:inline-block} .leg i.ring{background:none;border:2px solid #1FA845}
.tb{width:100%;border-collapse:collapse} .tb th{text-align:left;font-size:6.8px;letter-spacing:.08em;text-transform:uppercase;color:#6B7178;border-bottom:1.5px solid #15191C;padding:4px 6px;white-space:nowrap} .tb td{border-bottom:.5px solid #E6E8EA;padding:4px 6px;vertical-align:middle} .tb .r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap} .tb tr.tt td{font-weight:800;border-top:1.5px solid #15191C;border-bottom:0}
.tb td small{display:block;color:#9AA0A4;font-size:7px} .tb .n{color:#9AA0A4;text-align:right;width:18px} .tb.mini{font-size:8.2px} .tb.mini td{padding:3px 6px} .rk{font-size:8.2px} .rk thead{display:table-header-group} .rk tr, .tb tr{break-inside:avoid} .eu td{background:#EAF0FD}
.ord{color:#1FA83A;font-size:8px;margin-left:2px}
.form td{height:22px;padding-top:2px;padding-bottom:2px} .form td.ico{white-space:nowrap} .ic{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border:1px solid #D5D9DC;border-radius:4px;margin-right:3px;color:#B0B5BA;vertical-align:middle} .ic svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round}
.ic.on{color:#fff;background:#15191C;border-color:#15191C} .bx{display:inline-flex;align-items:center;justify-content:center;height:17px;min-width:21px;font-size:7px;font-weight:700;color:#B0B5BA;border:1px solid #D5D9DC;border-radius:4px;margin-right:3px;vertical-align:middle} .bx.on{color:#fff;background:#15191C;border-color:#15191C}
.legic{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:8px;color:#3F454B;margin:0 0 12px;padding:8px 10px;background:#F4F5F6;border-radius:8px} .legic span{display:inline-flex;align-items:center;gap:2px} .legic .ic, .legic .bx{color:#3F454B;border-color:#9AA0A6;background:#fff}
.pg.so + .pg{break-before:page} .form thead{display:table-header-group}
.fim{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px} .fim div{border:1px solid #DCDFE2;border-radius:8px;padding:8px 10px;height:40px} .fim span{font-size:6.8px;letter-spacing:.1em;text-transform:uppercase;color:#6B7178;font-weight:700}
.sec{display:flex;gap:12px;align-items:baseline;border-bottom:2px solid #15191C;padding-bottom:8px;margin-bottom:16px} .sn{font-size:24px;font-weight:900;color:#2B5FD9;line-height:1} .sec h2{font-size:18px;margin:0;letter-spacing:-.02em} .sec p{margin:2px 0 0;color:#6B7178;font-size:9px}
.mapw{margin:0 auto;max-width:640px} .mp{width:100%;height:auto;display:block} .rl{font-size:10px;font-weight:700;fill:#15191C;paint-order:stroke;stroke:#fff;stroke-width:2.5px;stroke-linejoin:round} .rl .rv{font-weight:500;fill:#3F454B;font-size:9px}
.esc{display:flex;align-items:center;justify-content:center;gap:3px;font-size:7.4px;color:#6B7178;margin-top:4px} .esc i{width:18px;height:8px;border-radius:2px} .esc span{margin:0 4px}
.rbar{display:grid;gap:5px} .rbar > div{display:grid;grid-template-columns:72px 1fr 54px 44px;gap:8px;align-items:center;font-size:8px} .rbar .rh{font-size:6.6px;letter-spacing:.08em;text-transform:uppercase;color:#6B7178;font-weight:700} .rbar .rh em{font-style:normal;color:#1F8F4A} .rbar .rh span:last-child{text-align:right}
.bt{position:relative;height:10px} .bt i{position:absolute;left:0;top:0;height:7px;border-radius:999px;background:#7E848A} .bt u{position:absolute;left:0;bottom:0;height:2px;border-radius:2px;background:#1FA845;text-decoration:none} .rbar b{text-align:right;font-variant-numeric:tabular-nums} .rbar > div > em{font-style:normal;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.cvb{position:relative;height:12px;background:#EEF0F1;border-radius:999px} .cvb i{position:absolute;left:0;top:0;bottom:0;background:#7E848A;border-radius:999px} .cvb b{position:absolute;right:6px;top:0;line-height:12px;font-size:7.6px;color:#15191C} .cvb.inv i{background:#B0B5BA}
.cen{display:grid;gap:8px;margin-top:12px} .cen span{font-size:7.4px;font-weight:700;color:#6B7178;text-transform:uppercase;letter-spacing:.08em} .cb{display:flex;gap:1px;height:12px;border-radius:999px;overflow:hidden;margin-top:3px} .cb i{display:block;height:100%}
.como{background:#F4F5F6;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:8.6px;color:#3F454B}
.est{margin-bottom:24px} .est .eh{display:flex;gap:10px;align-items:center;margin-bottom:12px} .est .eh img{width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:50% 18%;border:2.5px solid} .est .eh b{font-size:14px;display:block} .est .eh small{color:#6B7178}
.lid{border-top:1.5px solid #15191C;padding-top:8px;margin-top:16px;break-inside:avoid} .lh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px} .lh b{font-size:13px} .lh span{color:#6B7178}
.rod{margin-top:24px;border-top:.5px solid #DCDFE2;padding-top:6px;font-size:7.4px;color:#9AA0A4} [data-off]{display:none !important}`;

// ---------- janela: prévia + seções para marcar + Imprimir (mesmo modelo do caderno do Eleitoral) ----------
async function cadernoGab() {
  const ov = document.createElement("div"); ov.className = "relov"; ov.innerHTML = `<div class="bar"><span class="cadT">Caderno · escolha o que entra</span><button class="btn" data-imp disabled>Imprimir</button><button class="btn sec" data-fec>Fechar</button></div><div class="cadCorpo"><aside class="cadSel"><p class="mut">Montando o caderno…</p></aside><iframe title="Prévia do caderno"></iframe></div>`;
  document.body.appendChild(ov); ov.querySelector("[data-fec]").onclick = () => ov.remove();
  let cfg = cgCfg(), OFF = new Set(cfg.off || []), G = null, html = "";
  const f = ov.querySelector("iframe"), sel = ov.querySelector(".cadSel");
  const aplica = (doc) => { if (!doc) return; doc.querySelectorAll("[data-off]").forEach((x) => x.removeAttribute("data-off"));
    doc.querySelectorAll("section.pg").forEach((s) => { const t = s.dataset.t; if (OFF.has(t)) { s.setAttribute("data-off", ""); return; } const subs = [...s.querySelectorAll(".sub")]; subs.forEach((d) => { if (OFF.has(t + "/" + d.dataset.s)) d.setAttribute("data-off", ""); }); if (subs.length && subs.every((d) => d.hasAttribute("data-off"))) s.setAttribute("data-off", ""); });
    let prim = true; doc.querySelectorAll("section.pg").forEach((s) => { if (s.hasAttribute("data-off")) return; s.classList.toggle("prim", prim); prim = false; }); };
  const opsCand = () => EST.c.slice().sort((a, b) => b.t - a.t).map((x) => `<option value="${cgE(`${x.u} · ${x.p} · ${x.n}`)}">`).join("");
  const opsDep = () => [...new Set(Object.values(G.PESS).filter((p) => p.tot > 0).map((p) => p.c ? p.c.u + " · " + norm(p.dep) : norm(p.dep)))].sort().map((v) => `<option value="${cgE(v)}">`).join("");
  const montaSel = () => { const doc = f.contentDocument; if (!doc) return; const S = [...doc.querySelectorAll("section.pg")];
    const nomeC = (n) => { const x = EST.c.find((c) => String(c.n) === String(n)); return x ? `${x.u} · ${x.p} · ${x.n}` : ""; }, nomeD = (d) => { if (!d) return ""; const p = G.porDep(d); return p ? (p.c ? p.c.u + " · " : "") + norm(p.dep) : d; };
    sel.innerHTML = `<div class="cg1 cmd"><label class="gt">Outros parlamentares</label><p class="mut" style="font-size:11.5px;margin:0 0 6px">Até dois candidatos para estudar (seção 6). Deixe em branco para não incluir.</p>${[0, 1].map((k) => { const sl = cfg.cand[k] || {};
        return `<div class="cgsl"><input data-cand="${k}" list="cgCandL" placeholder="Candidato ${k + 1}" value="${cgE(nomeC(sl.n))}">${sl.n ? `<button data-limpa="${k}" title="Limpar">×</button>` : ""}</div>${sl.n ? `<div class="cgsl"><input data-de="${k}" list="cgDepL" placeholder="Emendas de: do próprio" value="${cgE(nomeD(sl.de))}">${sl.de ? `<button data-limpade="${k}" title="Usar as emendas do próprio candidato">×</button>` : ""}</div>` : ""}`; }).join("")}<datalist id="cgCandL">${opsCand()}</datalist><datalist id="cgDepL">${opsDep()}</datalist></div>
      ${S.map((s) => { const t = s.dataset.t, subs = [...s.querySelectorAll(".sub")]; return `<div class="cg1"><label class="gt"><input type="checkbox" data-g="${cgE(t)}" ${OFF.has(t) ? "" : "checked"}> ${cgE(t)}</label>${subs.map((d) => `<label><input type="checkbox" data-g="${cgE(t + "/" + d.dataset.s)}" ${OFF.has(t) || OFF.has(t + "/" + d.dataset.s) ? "" : "checked"} ${OFF.has(t) ? "disabled" : ""}> ${cgE(d.dataset.s)}</label>`).join("")}</div>`; }).join("")}`; };
  const gera = async () => { sel.innerHTML = `<p class="mut">Montando o caderno…</p>`; ov.querySelector("[data-imp]").disabled = true;
    try { G = await cgDados(cfg); html = cgDoc(G); } catch (er) { sel.innerHTML = `<p class="mut">Não foi possível montar o caderno: ${cgE(er.message || er)}</p>`; return; }
    f.onload = () => { aplica(f.contentDocument); montaSel(); ov.querySelector("[data-imp]").disabled = false; }; f.srcdoc = html; };
  sel.addEventListener("change", (e) => { const t = e.target;
    if (t.dataset.g) { t.checked ? OFF.delete(t.dataset.g) : OFF.add(t.dataset.g); cfg.off = [...OFF]; cgGuarda(cfg); aplica(f.contentDocument); montaSel(); return; }
    if (t.dataset.cand != null) { const k = +t.dataset.cand, m = /· (\d+)$/.exec(t.value.trim()); cfg.cand = [...cfg.cand]; cfg.cand[k] = { ...(cfg.cand[k] || {}), n: m ? m[1] : "" }; cgGuarda(cfg); return gera(); }
    if (t.dataset.de != null) { const k = +t.dataset.de, v = t.value.trim(); cfg.cand = [...cfg.cand]; cfg.cand[k] = { ...(cfg.cand[k] || {}), de: v ? v.split(" · ").slice(-1)[0] : "" }; cgGuarda(cfg); return gera(); } });
  sel.addEventListener("click", (e) => { const a = e.target.closest("[data-limpa]"), b = e.target.closest("[data-limpade]"); if (!a && !b) return; cfg.cand = [...cfg.cand];
    if (a) cfg.cand[+a.dataset.limpa] = { n: "", de: "" }; else cfg.cand[+b.dataset.limpade] = { ...(cfg.cand[+b.dataset.limpade] || {}), de: "" }; cgGuarda(cfg); gera(); });
  // imprimir: só o que está marcado, numa janela própria (paginação real)
  ov.querySelector("[data-imp]").onclick = () => { const d = f.contentDocument; if (!d) return; const c2 = d.documentElement.cloneNode(true); c2.querySelectorAll("[data-off]").forEach((x) => x.remove());
    const w = window.open("", "_blank"); if (!w) { alert("Libere as janelas pop-up para imprimir o caderno."); return; }
    w.document.write("<!doctype html>" + c2.outerHTML.replace("</body>", "<script>document.fonts.ready.then(()=>setTimeout(()=>print(),400))<\/script></body>")); w.document.close(); };
  gera();
}
