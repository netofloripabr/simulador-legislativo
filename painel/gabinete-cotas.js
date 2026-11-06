// Gabinete · Cotas (26/10/2026; painel único com 4 formatos desde 06/11/2026 — ver painelCotas no fim). Antes: dois gráficos no mesmo padrão (barra horizontal arredondada por ano, tons de cinza,
// transição suave): "Evolução do total", segmentável e filtrável por clique (origem → área → instrumento → região →
// município), e "Por tipo de cota" (Todos, LOA, adicional 0,55%, excesso, bancada, convênios). Escopo no topo:
// Impositivas (padrão, presas à quota anual) | Negociados (convênios e outros) | Tudo. Cada ano mostra a régua da quota,
// o quanto foi pago (portal da SEF quando a emenda está ligada; senão o status da planilha) e a variação em reais.
// Fonte: Controle (itens não suprimidos) + listas cadastradas. O ano é o do exercício da lei.
const COTA_T = { AN: ["LOA", "#E4E7E9"], "0,55": ["Adicional 0,55%", "#B0B5BA"], EX: ["Excesso de receita", "#7E848A"], BC: ["Bancada regional", "#545A60"], CV: ["Convênios e outros", "#3E4449"] };
const IMPOSITIVAS = ["AN", "0,55", "EX", "BC"];
const FUN_COR = { "Saúde": "#E4E7E9", "FUNDAM": "#B0B5BA", "Educação": "#7E848A", "Agricultura": "#545A60", "Infraestrutura": "#3E4449", "Segurança": "#33383D", "Social": "#2A2E32" };
const TONS = ["#E4E7E9", "#B0B5BA", "#7E848A", "#545A60", "#3E4449"];
// quota individual legal (1% da RCL até 2024; 1,55% desde a EC estadual 96/2024), conferida nos anexos das LOAs: valor igual
// para os 40 deputados. 2024: LOA (Lei 18.836; LDO Lei 18.674/2023). 2025: LOA R$ 11.709.889,51 (Lei 19.229; LDO Lei 19.039/2024)
// + adicional 0,55% R$ 6.440.439,24 (Lei 19.458/2025, EC 96/2024). 2026: Lei 19.683 (LDO Lei 19.401/2025). 2027: LDO Lei 20.043/2026.
const QUOTA = { 2024: 10609175.54, 2025: 18150328.75, 2026: 20308908.97, 2027: 19774931 };
const DIMS = [["ori", "Origem"], ["area", "Área"], ["instr", "Instrumento"], ["reg", "Região"], ["mun", "Município"]];
const ESC = [["imp", "Impositivas"], ["neg", "Negociados"], ["tudo", "Tudo"]];
const tipoCota = (r) => { const s = sigla(r.origem); return s.startsWith("EI - ") ? s.slice(5) : "CV"; };
const funDe = (r) => { const f = FUN_I.find(([re]) => re.test(r.funcao || "") || re.test(r.area || "")); return f ? f[1].replace(/ \(.*\)/, "") : "Outras"; };
const anoLista = (L) => { const g = L.regras || {}; return +(String(L.apelido || "").match(/(\d{2})$/) || [])[1] + 2000 || (g.prazo ? +String(g.prazo).slice(0, 4) : 0); };
const tipoLista = (L) => /excesso/i.test(L.origem || L.apelido) ? "EX" : /0,55|adicional/i.test(L.origem || "") ? "0,55" : "AN";
const noEsc = (t) => S.cesc === "tudo" || (S.cesc === "neg" ? t === "CV" : t !== "CV");
const reduz = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const toque = () => window.matchMedia && matchMedia("(hover: none)").matches;

// ---------- base única de itens ----------
function itensCotas() {
  const K = {}; (E0 || []).forEach((e) => { K[e.k] = e; });
  const L = MEU.filter((r) => r.ano && !supr(r)).map((r) => {
    const t = tipoCota(r), e = /^\d+$/.test(String(r.numero || "")) && K[`${r.ano}-${String(r.numero).padStart(6, "0")}`], es = etapasStatus(r.status_manual), v = +r.valor || 0;
    const pago = e ? Math.min(v || e.vp || 0, e.vp || 0) : es.d && es.d[2] ? v : 0;
    return { r, ano: +r.ano, v, t, ori: COTA_T[t][0], area: funDe(r), instr: instrNome(r.modalidade) || "Não informado", reg: regDe(r) || "Sem região", mun: r.municipio ? frase(r.municipio) : "—", obj: objAtual(r), pago, sef: !!e };
  });
  (typeof AD !== "undefined" ? AD.itens : []).filter((x) => !x.chave_emenda).forEach((x) => { const Lr = AD.listas.find((l) => l.id === x.lista_id), a = Lr ? anoLista(Lr) : 0; if (a < 2000) return; const t = tipoLista(Lr);
    L.push({ x, ano: a, v: +x.valor || 0, t, ori: COTA_T[t][0], area: funDe(x), instr: x.modalidade || "Não informado", reg: regDe(x) || "Sem região", mun: x.municipio ? frase(x.municipio) : "—", obj: x.objeto, pago: 0, plan: 1 }); });
  return L.filter((i) => noEsc(i.t));
}
// cotas legais com valor disponível cadastrado pela administração (fixas): excesso de arrecadação 2026 (LDO 2026, art. 30:
// 1,55% do crescimento da RCL, só Saúde) = R$ 718.997,79 por parlamentar, até 7 indicações, prazo 28/10/2026
// LOA 2027 (Of./circular 036/2026 CFT, 27/10/2026): PL 0633/2026, de 29/10 a 23/11/2026 no Sistema de Orçamento Estadual; mínimo R$ 100 mil,
// até 120 emendas, R$ 19.774.931,47; LDO 2027 (Lei 20.043/2026) art. 33: no mínimo 50% em Saúde, até 50% nas demais funções.
// FUNDAM 20%: proporção da dotação do PL (R$ 158,2 mi de R$ 791 mi, subação 14203) — A CONFIRMAR com o usuário/LDO art. 38
const COTAS_LEGAIS = { 2027: { AN: { disp: 19774931.47, max: 120, min: 100000, saude: .5, fundam: .2, areas: AREAS.map((a) => a[1]), mods: ["Transferência Especial", "Convênio", "Execução Direta"], abre: "2026-10-29T00:00", prazo: "2026-11-23T23:59", base: "LDO 2027 (Lei 20.043/2026), art. 33", doc: "Of./circular 036/2026 CFT · PL 0633/2026 (LOA 2027)", entrega: "no Sistema de Orçamento Estadual" } }, 2026: { EX: { disp: 718997.79, max: 7, min: 100000, areas: ["Saúde"], mods: ["Transferência Especial", "Convênio", "Execução Direta"], prazo: "2026-10-28T18:00", base: "LDO 2026 (Lei 19.401/2025), art. 30", doc: "Of. 004/2026 CFT · LDO 2026 art. 30", entrega: "via SEI" } } };
function dispDoAno(ano, t) {
  const leg = COTAS_LEGAIS[ano] || {}, dl = t ? (leg[t] || {}).disp || 0 : Object.values(leg).reduce((s, x) => s + (x.disp || 0), 0);
  return dl || (typeof AD !== "undefined" ? AD.listas : []).filter((L) => anoLista(L) === ano && (!t || tipoLista(L) === t)).reduce((s, L) => s + ((L.regras || {}).disp || 0), 0); }

// ---------- peças comuns ----------
const varTxt = (v, ant) => { if (ant == null || !ant) return ""; const d = v - ant, p = d / ant;
  return `<small class="${d >= 0 ? "up" : "dn"}">${d >= 0 ? "▲" : "▼"} ${ant >= 5e5 ? nf(Math.abs(p) * 100, 0) + "% · " : ""}${d >= 0 ? "+" : "−"} ${fm(Math.abs(d))}</small>`; };
const regua = (mx) => `<div class="creg"><span>0</span><span>${fm(mx / 2)}</span><span>${fm(mx)}</span></div>`;
function linhaAno(a, o, mx, conteudo, extra) {
  const q = S.cesc !== "neg" && !S.cfil.length && extra && extra.quota ? QUOTA[a] : 0, pct = q ? (o.q || 0) / q : null;
  return `<div class="cano${o.t ? "" : " vz"}"><button class="ca" data-lano="${extra && extra.graf}|${a}" title="Ver as indicações de ${a}">${a}</button>
    <div class="cab">${o.t ? `<div style="width:${(o.t / mx * 100).toFixed(2)}%">${conteudo}</div>` : ""}${extra && extra.livre ? `<s style="width:${(extra.livre / mx * 100).toFixed(2)}%"></s>` : ""}${q ? `<b class="cq" style="left:${(q / mx * 100).toFixed(2)}%" title="Quota ${a}: ${fm(q)}"></b>` : ""}
      ${o.t ? `<div class="cpg" style="width:${(o.t / mx * 100).toFixed(2)}%"><i style="width:${(o.p / o.t * 100).toFixed(1)}%"></i></div>` : ""}</div>
    <b class="ct">${o.t ? fm(o.t) : "—"}${o.t ? `<small class="cpgt">${nf(o.p / o.t * 100, 0)}% pago${pct != null ? ` · ${nf(pct * 100, 0)}% da quota (LOA + adicional)` : ""}</small>` : ""}${o.t ? varTxt(o.t, extra && extra.ant) : ""}${extra && extra.livre ? `<small class="lv">+ ${fm(extra.livre)} livres</small>` : ""}</b></div>`;
}
const segBtn = (k, v, a, mx, cor, attr) => `<button style="flex:${v};background:${cor}" ${attr} aria-label="${esc(k)} ${a}: ${fm(v)}" title="${esc(k)} · ${a}: ${fm(v)}">${v / mx > .09 ? `<em>${esc(k)}</em>` : ""}</button>`;

// ---------- gráfico 1: evolução do total ----------
function comparacao(anos, I) {
  const L = I.filter((x) => S.cfil.every(([d, v]) => x[d] === v)), dim = S.cdim;
  const porAno = {}, cats = {}; L.forEach((x) => { const o = porAno[x.ano] = porAno[x.ano] || { t: 0, p: 0, s: {} }; o.t += x.v; o.p += x.pago; if (x.t === "AN" || x.t === "0,55") o.q = (o.q || 0) + x.v; o.s[x[dim]] = (o.s[x[dim]] || 0) + x.v; cats[x[dim]] = (cats[x[dim]] || 0) + x.v; });
  const ord = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k]) => k), cor = (k) => TONS[Math.min(ord.indexOf(k), TONS.length - 1)];
  const mx = Math.max(1, ...Object.values(porAno).map((o) => o.t), ...(S.cesc !== "neg" && !S.cfil.length ? anos.map((a) => QUOTA[a] || 0) : [0])), tot = L.reduce((s, x) => s + x.v, 0);
  return `<div class="ccomp"><div class="ctit">Evolução do total</div><div class="cctl"><div class="cfils"><b>${fm(tot)}</b><span>${anos[0]}–${anos[anos.length - 1]}</span>${S.cfil.map(([d, v], k) => `<button class="cchip" data-tira="${k}">${esc(DIMS.find((x) => x[0] === d)[1])}: ${esc(v)} ×</button>`).join("")}</div>
      <div class="cabas"><span class="cseg">Segmentar por</span>${DIMS.filter(([k]) => !S.cfil.some(([d]) => d === k)).map(([k, t]) => `<button data-cdim="${k}" class="${dim === k ? "on" : ""}">${t}</button>`).join("")}</div></div>
    ${S.ctip && S.ctip.g === 1 ? `<div class="ctipv">${esc(S.ctip.txt)} <span>toque de novo para filtrar</span></div>` : ""}
    ${anos.map((a, k) => { const o = porAno[a] || { t: 0, p: 0, s: {} }; return linhaAno(a, o, mx, ord.filter((c) => o.s[c]).map((c) => segBtn(c, o.s[c], a, mx, cor(c), `data-seg="${esc(c)}"`)).join(""), { graf: 1, quota: 1, ant: k ? (porAno[anos[k - 1]] || {}).t : null }); }).join("")}
    ${regua(mx)}
    <div class="cleg2">${ord.slice(0, 12).map((k) => `<button data-seg="${esc(k)}"><i style="background:${cor(k)}"></i>${esc(k)} <small>${fm(cats[k])}</small></button>`).join("")}${ord.length > 12 ? `<span class="cmais">+ ${ord.length - 12}</span>` : ""}${S.cesc !== "neg" && !S.cfil.length ? `<span class="cqleg"><b class="cq"></b>quota pela lei</span>` : ""}<span class="cqleg"><span class="cpgl"></span>pago</span></div></div>`;
}

// ---------- gráfico 2: por tipo de cota ----------
function porTipo(anos, I) {
  const tipos = Object.keys(COTA_T).filter((t) => I.some((x) => x.t === t) || (S.cesc !== "neg" && Object.values(COTAS_LEGAIS).some((g) => g[t]))); if (!S.ctipo || (S.ctipo !== "TODOS" && !tipos.includes(S.ctipo))) S.ctipo = "TODOS";
  const sel = I.filter((x) => S.ctipo === "TODOS" || x.t === S.ctipo), porAno = {};
  sel.forEach((x) => { const o = porAno[x.ano] = porAno[x.ano] || { t: 0, p: 0, s: {} }; o.t += x.v; o.p += x.pago; if (x.t === "AN" || x.t === "0,55") o.q = (o.q || 0) + x.v; o.s[x.t] = (o.s[x.t] || 0) + x.v; });
  const livre = (a) => { const d = dispDoAno(a, S.ctipo === "TODOS" ? null : S.ctipo); return d ? Math.max(0, d - ((porAno[a] || {}).t || 0)) : 0; };
  const mx = Math.max(1, ...anos.map((a) => ((porAno[a] || {}).t || 0) + livre(a)), ...(S.ctipo === "TODOS" && S.cesc !== "neg" ? anos.map((a) => QUOTA[a] || 0) : [0]));
  return `<div class="ccomp"><div class="ctit">Por tipo de cota</div><div class="cctl"><div class="cfils"><b>${fm(sel.reduce((s, x) => s + x.v, 0))}</b><span>${anos[0]}–${anos[anos.length - 1]}</span></div>
      <div class="cabas">${["TODOS", ...tipos].map((t) => `<button data-ctipo="${t}" class="${S.ctipo === t ? "on" : ""}">${t === "TODOS" ? "Todos" : COTA_T[t][0]}</button>`).join("")}</div></div>
    ${S.ctip && S.ctip.g === 2 ? `<div class="ctipv">${esc(S.ctip.txt)} <span>toque de novo para abrir</span></div>` : ""}
    ${anos.map((a, k) => { const o = porAno[a] || { t: 0, p: 0, s: {} };
      const cont = S.ctipo === "TODOS" ? Object.keys(COTA_T).filter((t) => o.s[t]).map((t) => segBtn(COTA_T[t][0], o.s[t], a, mx, COTA_T[t][1], `data-ctipo="${t}"`)).join("") : segBtn(COTA_T[S.ctipo][0], o.t, a, mx, S.lano && S.lano.g === 2 && S.lano.a === a ? "#F2F4F5" : "#B0B5BA", `data-lano="2|${a}"`);
      return linhaAno(a, o, mx, cont, { graf: 2, quota: S.ctipo === "TODOS", livre: livre(a), ant: k ? (porAno[anos[k - 1]] || {}).t : null }); }).join("")}
    ${regua(mx)}</div>`;
}

// ---------- lista do ano escolhido (qualquer gráfico) ----------
function listaAno(I) {
  if (!S.lano) return ""; const { g, a } = S.lano;
  const it = I.filter((x) => x.ano === a && (g === 1 ? S.cfil.every(([d, v]) => x[d] === v) : g === 3 ? (S.ctipo === "TODOS" || x.t === S.ctipo) && S.cfil.every(([d, v]) => x[d] === v) : S.ctipo === "TODOS" || x.t === S.ctipo)).sort((p, q) => q.v - p.v);
  const tot = it.reduce((s, x) => s + x.v, 0), pg = it.reduce((s, x) => s + x.pago, 0), d = (g === 2 || (g === 3 && !S.cfil.length)) && S.ctipo !== "TODOS" ? dispDoAno(a, S.ctipo) : 0, livre = d ? Math.max(0, d - tot) : 0;
  const rot = g === 3 ? [S.ctipo === "TODOS" ? "Todas as cotas" : COTA_T[S.ctipo][0], ...S.cfil.map(([, v]) => v)].join(" · ") : g === 1 ? (S.cfil.map(([, v]) => v).join(" · ") || "Todas as origens") : S.ctipo === "TODOS" ? "Todas as cotas" : COTA_T[S.ctipo][0];
  return `<div class="caberta"><div class="ch"><b>${fm(tot)}</b><span>${esc(rot)} · ${a} · ${it.length} indicaç${it.length === 1 ? "ão" : "ões"} · ${tot ? nf(pg / tot * 100, 0) : 0}% pago</span>
      <span class="chac"><button class="lk" data-vctl>Ver no Controle</button>${livre ? `<button class="lk" data-cind>+ indicar (${fm(livre)} livres)</button>` : ""}<button class="x" data-fl aria-label="Fechar">×</button></span></div>
    <div class="cits">${it.slice(0, S.call ? 999 : 10).map((x) => `<div><i style="background:${FUN_COR[x.area] || "#3E4449"}"></i><span>${esc(x.mun)} <small>· ${esc((x.obj || "").slice(0, 90))}</small></span><b>${fm(x.v)}<small>${x.v ? nf(x.pago / x.v * 100, 0) + "% pago" : ""}</small></b></div>`).join("")}</div>
    ${it.length > 10 && !S.call ? `<button class="lk" data-call>ver as ${it.length} indicações</button>` : ""}</div>`;
}

// ---------- avisos: suprimidas e qualidade dos dados ----------
function avisos(I) {
  const sp = MEU.filter((r) => supr(r) && noEsc(tipoCota(r))), vsp = sp.reduce((s, r) => s + (+r.valor || 0), 0);
  const n = I.filter((x) => x.r).length || 1, conta = (f) => I.filter((x) => x.r && f(x)).length;
  const Q = [["instr", "sem instrumento", (x) => !x.r.modalidade], ["fun", "sem função", (x) => !x.r.funcao], ["reg", "sem região", (x) => !regDe(x.r)], ["num", "sem nº da emenda", (x) => IMPOSITIVAS.includes(x.t) && !/^\d+$/.test(String(x.r.numero || ""))]]
    .map(([k, t, f]) => [k, t, conta(f)]).filter(([, , c]) => c);
  return `<div class="cavs">${vsp ? `<button class="cav" data-vsup>${fm(vsp)} suprimidos fora da conta (${sp.length})</button>` : ""}${Q.map(([k, t, c]) => `<button class="cav q" data-qual="${k}" title="Abrir no Controle para corrigir">${c / n < .01 ? "<1" : nf(c / n * 100, 0)}% ${t} (${c})</button>`).join("")}</div>
    ${S.vsup ? `<div class="caberta"><div class="ch"><b>${fm(vsp)}</b><span>suprimidos · fora das contas</span><span class="chac"><button class="x" data-vsup aria-label="Fechar">×</button></span></div><div class="cits">${sp.sort((a, b) => (+b.valor || 0) - (+a.valor || 0)).map((r) => `<div><i style="background:#3E4449"></i><span>${r.ano || ""} · ${esc(r.municipio || "—")} <small>· ${esc((r.objeto || "").slice(0, 90))} · ${esc(r.status_manual || "")}</small></span><b>${fm(+r.valor || 0)}</b></div>`).join("")}</div></div>` : ""}`;
}
const INFO_COTAS = `<b>O que entra:</b> itens do Controle não suprimidos e as indicações das listas cadastradas. <b>Ano:</b> o do exercício da lei (o excesso de 2023 pago em 2024 conta em 2023). <b>Impositivas:</b> LOA, adicional 0,55%, excesso de receita e bancada; <b>negociados:</b> convênios e outros, fora da quota. <b>Quota:</b> valor individual legal, igual para os 40 deputados (1% da RCL até 2024; 1,55% desde a EC estadual 96/2024): 2024 R$ 10,61 mi (Lei 18.836); 2025 R$ 18,15 mi = LOA R$ 11,71 mi (Lei 19.229) + adicional 0,55% R$ 6,44 mi (Lei 19.458); 2026 R$ 20,31 mi (Lei 19.683); 2027 R$ 19,77 mi (LDO Lei 20.043). Bancada regional segue o valor da planilha (indicação informal por ofício da bancada). <b>Pago:</b> valor pago no portal da SEF quando a emenda está ligada pelo número; sem ligação, o status da planilha. <b>Fontes:</b> planilha do gabinete, portal da SEF/Transparência SC e as leis orçamentárias.`;

function cotas() {
  try { const g = JSON.parse(localStorage.getItem("gab_cotas") || "{}"); if (S.cesc == null) Object.assign(S, { cesc: g.cesc || "imp", cdim: g.cdim || "ori", cfil: g.cfil || [], ctipo: g.ctipo || "TODOS", cfmt: g.cfmt || "bullet" }); } catch (e) {}
  S.cesc = S.cesc || "imp"; S.cfil = S.cfil || []; S.cdim = S.cdim || "ori";
  const I = itensCotas(), anos = [...new Set([...I.map((x) => x.ano), ...(S.cesc !== "neg" ? Object.keys(COTAS_LEGAIS).map(Number) : [])])].sort();
  const esc0 = `<div class="ctop"><div class="cabas">${ESC.map(([k, t]) => `<button data-cesc="${k}" class="${S.cesc === k ? "on" : ""}">${t}</button>`).join("")}</div>
    <span class="ctopd"><button class="lk" data-cimp>Imprimir</button><button class="ibt${S.cinfo ? " on" : ""}" data-cinfo aria-label="Como os números são calculados">i</button></span></div>${S.cinfo ? `<div class="cinfo">${INFO_COTAS}</div>` : ""}`;
  if (!anos.length) return `<div class="cotas">${esc0}<div class="obra">Sem itens neste recorte.</div></div>`;
  return `<div class="cotas">${esc0}${avisos(I)}${painelCotas(anos, I)}${S.lano ? listaAno(I) : ""}</div>`;
}

// ---------- interação ----------
function guardarCotas() { try { localStorage.setItem("gab_cotas", JSON.stringify({ cesc: S.cesc, cdim: S.cdim, cfil: S.cfil, ctipo: S.ctipo, cfmt: S.cfmt })); } catch (e) {} }
// redesenha mantendo o quadro parado: guarda larguras, redesenha e anima da largura antiga até a nova
function redesenharSuave() {
  guardarCotas(); const y = window.scrollY;
  if (reduz()) { desenhar(); window.scrollTo(0, y); return; }
  const SEL = ".cotas .cab > div, .cotas .cab > s", SG = ".cotas .cab > div:not(.cpg) > *";
  const chave = (e) => { const lin = e.closest(".cano"), ano = lin ? lin.querySelector(".ca").textContent : "", g = e.closest(".ccomp"); return [...document.querySelectorAll(".cotas .ccomp")].indexOf(g) + "|" + ano + "|" + (e.dataset.seg || e.dataset.ctipo || e.title.split(" · ")[0]); };
  const ant = [...document.querySelectorAll(SEL)].map((e) => e.getBoundingClientRect().width), antS = {};
  document.querySelectorAll(SG).forEach((e) => { antS[chave(e)] = e.getBoundingClientRect().width; });
  desenhar(); window.scrollTo(0, y);
  const nov = [...document.querySelectorAll(SEL)], novS = [...document.querySelectorAll(SG)], alvoS = novS.map((e) => e.getBoundingClientRect().width), alvo = nov.map((e) => e.style.width);
  nov.forEach((e, k) => { e.style.transition = "none"; e.style.width = (ant[k] != null ? ant[k] : 0) + "px"; });
  novS.forEach((e) => { e.dataset.fx = e.style.flex; e.style.transition = "none"; e.style.flex = `0 0 ${antS[chave(e)] || 0}px`; });
  document.body.getBoundingClientRect();
  nov.forEach((e, k) => { e.style.transition = ""; e.style.width = alvo[k]; });
  novS.forEach((e, k) => { e.style.transition = "flex-basis .45s linear"; e.style.flex = `0 0 ${alvoS[k]}px`; setTimeout(() => { e.style.transition = ""; e.style.flex = e.dataset.fx; }, 480); });
}
// no celular o primeiro toque mostra o valor; o segundo age
function tocarOuAgir(b, g, acao) { return () => { if (toque()) { const k = b.title; if (!S.ctip || S.ctip.txt !== k) { S.ctip = { g, txt: k }; redesenharSuave(); return; } } S.ctip = null; acao(); }; }
function verNoControle(a, g) {
  const T = { AN: "EI - AN", "0,55": "EI - 0,55", EX: "EI - EX", BC: "EI - BC" };
  S.aba = "meu"; S.mano = a; S.mq = ""; S.met = ""; S.mf = {}; S.mori = ""; S.mfa = true; S.lista = null;
  if (g === 3 && T[S.ctipo]) S.mori = T[S.ctipo];
  if (g === 1 || g === 3) S.cfil.forEach(([d, v]) => { if (d === "area") S.mf.fun = v; if (d === "instr") S.mf.mod = v; if (d === "reg") S.mf.reg = v; if (d === "mun") S.mq = v; if (d === "ori") { const t = Object.keys(COTA_T).find((k) => COTA_T[k][0] === v); if (T[t]) S.mori = T[t]; } });
  else if (T[S.ctipo]) S.mori = T[S.ctipo];
  desenhar(); const t = $("#mtab"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
}
function imprimirCotas() {
  const D = S.cDados; if (!D) return; const rot = [ESC.find(([k]) => k === S.cesc)[1], S.ctipo === "TODOS" ? "todos os tipos" : COTA_T[S.ctipo][0], ...S.cfil.map(([, v]) => v)].join(" · ");
  const lin = D.A.map((o) => `<tr><td>${o.a}</td><td class="n">${o.t ? fm(o.t) : "—"}</td><td class="n">${o.t ? fm(o.p) + " (" + nf(o.p / o.t * 100, 0) + "%)" : ""}</td><td class="n">${o.q ? fm(o.q) + (o.qv ? " · " + nf(o.qv / o.q * 100, 0) + "%" : "") : ""}</td><td>${D.partes.filter((k) => o.s[k].v).map((k) => esc(D.nome(k)) + ": " + fm(o.s[k].v)).join("<br>")}</td></tr>`).join("");
  const win = window.open("", "_blank"); win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cotas · ${esc(PARL.u)}</title><style>@page{size:A4;margin:14mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font:11px/1.45 Inter,system-ui,sans-serif;color:#0B0D0E}h1{font-size:20px;margin:0 0 4px}p{color:#5A6067}table{width:100%;border-collapse:collapse;margin-top:12px}th{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#6B7178;text-align:left;border-bottom:1.5px solid #A9AEB3;padding:5px 4px}td{border-bottom:.5px solid #DCDFE2;padding:6px 4px;vertical-align:top}.n{text-align:right;white-space:nowrap}</style></head><body><h1>Cotas · ${esc(PARL.u)}</h1><p>${esc(rot)} · ${new Date().toLocaleDateString("pt-BR")}</p><table><tr><th>Ano</th><th class="n">Indicado</th><th class="n">Pago</th><th class="n">Quota · usado</th><th>${esc((PC_DIM.find(([k]) => k === D.dim) || [, ""])[1])}</th></tr>${lin}</table><p style="margin-top:14px">${INFO_COTAS.replace(/<[^>]+>/g, "")}</p><script>setTimeout(()=>print(),300)<\/script></body></html>`); win.document.close();
}
function ligarCotas() {
  const w = $("#corpoAba .cotas"); if (!w) return;
  const on = (sel, fn) => w.querySelectorAll(sel).forEach((b) => { b.onclick = fn(b); });
  on("[data-cesc]", (b) => () => { S.cesc = b.dataset.cesc; S.cfil = []; S.lano = null; S.ctipo = "TODOS"; redesenharSuave(); });
  on("[data-cinfo]", () => () => { S.cinfo = !S.cinfo; desenhar(); });
  on("[data-cimp]", () => imprimirCotas);
  on("[data-cdim]", (b) => () => { S.cdim = b.dataset.cdim; redesenharSuave(); });
  on("[data-seg]", (b) => tocarOuAgir(b, 1, () => { S.cfil.push([S.cdim, b.dataset.seg]); const p = DIMS.find(([k]) => !S.cfil.some(([d]) => d === k)); S.cdim = p ? p[0] : S.cdim; S.lano = null; redesenharSuave(); }));
  on("[data-tira]", (b) => () => { S.cfil = S.cfil.slice(0, +b.dataset.tira); S.cdim = DIMS.find(([k]) => !S.cfil.some(([d]) => d === k))[0]; S.lano = null; redesenharSuave(); });
  on("[data-ctipo]", (b) => tocarOuAgir(b, 2, () => { S.ctipo = b.dataset.ctipo; if (S.lano && S.lano.g === 2) S.lano = null; redesenharSuave(); }));
  on("[data-lano]", (b) => () => { const [g, a] = b.dataset.lano.split("|").map(Number); S.lano = S.lano && S.lano.g === g && S.lano.a === a ? null : { g, a }; S.call = 0; redesenharSuave(); });
  on("[data-fl]", () => () => { S.lano = null; redesenharSuave(); });
  on("[data-call]", () => () => { S.call = 1; desenhar(); });
  on("[data-vctl]", () => () => verNoControle(S.lano.a, S.lano.g));
  on("[data-vsup]", () => () => { S.vsup = !S.vsup; desenhar(); });
  on("[data-qual]", (b) => () => { S.aba = "meu"; S.mano = 0; S.mq = ""; S.met = ""; S.mori = ""; S.lista = null; S.mfa = true; S.mf = { [b.dataset.qual === "instr" ? "mod" : b.dataset.qual]: "(vazio)" }; desenhar(); const t = $("#mtab"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); });
  // painel único
  if (!window.d3) pcD3().then((ok) => { if (ok && S.aba === "cotas") desenhar(); });
  const pc = (fn) => { guardarCotas(); const y = window.scrollY; fn(); desenhar(); window.scrollTo(0, y); };
  on("[data-pfmt]", (b) => () => pc(() => { S.cfmt = b.dataset.pfmt; }));
  on("[data-ptipo]", (b) => () => pc(() => { S.ctipo = b.dataset.ptipo; S.cfil = S.cfil.filter(([d]) => d !== "ori"); if (S.ctipo !== "TODOS" && S.cdim === "ori") S.cdim = "area"; S.lano = null; }));
  on("[data-pdim]", (b) => () => pc(() => { S.cdim = b.dataset.pdim; }));
  on("[data-ptira]", (b) => () => pc(() => { S.cfil = S.cfil.slice(0, +b.dataset.ptira); S.lano = null; }));
  w.querySelectorAll(".pcq [data-pseg]").forEach((g) => { g.style.cursor = "pointer"; g.onclick = (e) => { e.stopPropagation(); const k = g.dataset.pseg, D = S.cDados; if (!D || k === "Outros") return;
    pc(() => { if (D.dim === "ori") { S.ctipo = k; S.cdim = "area"; } else { S.cfil.push([D.dim, k]); const p = PC_DIM.find(([d]) => d !== "ori" && !S.cfil.some(([c]) => c === d)); if (p) S.cdim = p[0]; } S.lano = null; }); }; });
  w.querySelectorAll(".pcq [data-pano]").forEach((g) => { g.style.cursor = "pointer"; g.onclick = () => { const a = +g.dataset.pano; pc(() => { S.lano = S.lano && S.lano.a === a ? null : { g: 3, a }; S.call = 0; }); }; });
  on("[data-cind]", () => () => { const L = AD.listas.find((l) => anoLista(l) === S.lano.a && tipoLista(l) === S.ctipo); formItem({ lista_id: L ? L.id : null }); });
}

// ---------- painel único (06/11/2026): "Evolução do total" + "Por tipo de cota" num quadro só ----------
// Quatro formatos para a mesma pergunta (FT Visual Vocabulary): Bullet (valor × quota, o padrão), Barras empilhadas
// (partes de um todo), Área empilhada (mudança no tempo) e 100% (composição). Filtros: tipo de cota e "separar por"
// (tipo, área, instrumento, região, município — os 5 maiores e "Outros"); clicar num pedaço filtra; clicar no ano abre a lista.
// Os desenhos usam o d3 (carregado só quando a aba Cotas abre).
const PC_COR = { AN: "#C9D4DE", "0,55": "#93A6BA", EX: "#647C96", BC: "#455A72", CV: "#2E3B4B" };
const PC_RAMPA = ["#C9D4DE", "#93A6BA", "#647C96", "#455A72", "#34404F", "#262E38"];
const PC_FMT = [["bullet", "Bullet", "Desvio · meta", "Cada ano bateu a quota? Quanto já foi pago?"], ["empilhada", "Barras empilhadas", "Partes de um todo", "Quanto foi cada ano e de que tipo?"],
  ["area", "Área empilhada", "Mudança no tempo", "Como o total e a composição evoluíram?"], ["cem", "100%", "Composição", "O peso de cada parte mudou?"]];
const PC_DIM = [["ori", "Tipo de cota"], ["area", "Área"], ["instr", "Instrumento"], ["reg", "Região"], ["mun", "Município"]];
const PC_VERDE = "#34E84A", PC_Q = "#E8705A";
const pcMi = (v) => v >= 1e6 ? nf(v / 1e6, v >= 1e7 ? 1 : 2) + " mi" : v >= 1e3 ? nf(v / 1e3, 0) + " mil" : nf(v, 0);
async function pcD3() { if (window.d3) return true; if (pcD3.p) return pcD3.p; pcD3.p = new Promise((ok) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s); }); return pcD3.p; }
// os números do quadro: por ano, por parte (dimensão escolhida) e o que conta para a quota (LOA + adicional)
function pcDados(anos, I) {
  const L = I.filter((x) => (S.ctipo === "TODOS" || x.t === S.ctipo) && S.cfil.every(([d, v]) => x[d] === v)), dim = S.ctipo !== "TODOS" && S.cdim === "ori" ? "area" : S.cdim;
  const chave = (x) => dim === "ori" ? x.t : x[dim], tot = {}; L.forEach((x) => { tot[chave(x)] = (tot[chave(x)] || 0) + x.v; });
  let ord = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k]) => k); if (dim === "ori") ord = Object.keys(COTA_T).filter((k) => tot[k]);
  const top = dim === "ori" ? ord : ord.slice(0, 5), parte = (x) => top.includes(chave(x)) ? chave(x) : "Outros"; if (ord.length > top.length) top.push("Outros");
  const nome = (k) => dim === "ori" ? (COTA_T[k] || [k])[0] : k, cor = (k, i) => dim === "ori" ? PC_COR[k] : k === "Outros" ? "#20262E" : PC_RAMPA[i];
  const comQuota = (S.ctipo === "TODOS" || S.ctipo === "AN" || S.ctipo === "0,55") && !S.cfil.length && S.cesc !== "neg";
  const A = anos.map((a) => { const it = L.filter((x) => x.ano === a), o = { a, t: 0, p: 0, qv: 0, q: comQuota ? QUOTA[a] || 0 : 0, s: {} }; top.forEach((k) => { o.s[k] = { v: 0, p: 0 }; });
    it.forEach((x) => { o.t += x.v; o.p += x.pago; if (x.t === "AN" || x.t === "0,55") o.qv += x.v; const k = parte(x); o.s[k].v += x.v; o.s[k].p += x.pago; }); return o; });
  return { A, partes: top, nome, cor: Object.fromEntries(top.map((k, i) => [k, cor(k, i)])), dim, tot: L.reduce((s, x) => s + x.v, 0) };
}
function pcBullet(D) { const A = D.A, W = 900, rh = 62, H = A.length * rh + 34, x0 = 64, x1 = W - 190, mx = d3.max(A, (o) => Math.max(o.t, o.q)) * 1.03 || 1, x = d3.scaleLinear([0, mx], [x0, x1]);
  return `<svg viewBox="0 0 ${W} ${H}" class="pcsvg"><defs><linearGradient id="pcbG" x1="0" x2="1"><stop offset="0" stop-color="#9FB0C2"/><stop offset="1" stop-color="#DDE5EC"/></linearGradient>
      <filter id="pcGl" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${x.ticks(4).map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="4" y2="${H - 26}" stroke="rgba(242,244,245,.05)" stroke-dasharray="2 4"/><text class="mu" x="${x(t)}" y="${H - 8}" text-anchor="middle">${t ? pcMi(t) : 0}</text>`).join("")}
    ${A.map((o, i) => { const c = i * rh + 30, fora = Math.max(0, o.t - o.qv), dentro = o.q ? o.qv : o.t, pq = o.q && o.qv ? o.qv / o.q : null;
      return `<g class="pcrow" data-pano="${o.a}"><rect x="0" y="${c - 28}" width="${W}" height="${rh - 4}" fill="transparent"/><text class="ano" x="0" y="${c + 5}">${o.a}</text>
        ${o.q ? `<rect x="${x0}" y="${c - 15}" width="${x(o.q) - x0}" height="30" rx="15" fill="rgba(242,244,245,.045)"/>` : ""}
        ${o.t ? `<rect x="${x0}" y="${c - 7}" width="${Math.max(3, x(dentro) - x0)}" height="14" rx="7" fill="url(#pcbG)"><title>${o.q ? "LOA + adicional" : "Indicado"} ${o.a}: R$ ${pcMi(dentro)}</title></rect>` : ""}
        ${o.q && fora ? `<rect x="${x(dentro) + 2}" y="${c - 7}" width="${Math.max(2, x(dentro + fora) - x(dentro) - 2)}" height="14" rx="7" fill="#5D7088"><title>Excesso, bancada e outros ${o.a}: R$ ${pcMi(fora)} (fora da quota)</title></rect>` : ""}
        ${o.p ? `<rect x="${x0 + 4}" y="${c - 1.5}" width="${Math.max(0, x(o.p) - x0 - 8)}" height="3" rx="1.5" fill="${PC_VERDE}" filter="url(#pcGl)"><title>Pago ${o.a}: R$ ${pcMi(o.p)}</title></rect>` : ""}
        ${o.q ? `<line x1="${x(o.q)}" x2="${x(o.q)}" y1="${c - 19}" y2="${c + 19}" stroke="${PC_Q}" stroke-width="2" stroke-linecap="round"/><circle cx="${x(o.q)}" cy="${c - 19}" r="2.6" fill="${PC_Q}"/>` : ""}
        ${!o.t && o.q ? `<text class="mu" x="${x0 + 16}" y="${c + 4}">sem indicações ainda · quota R$ ${pcMi(o.q)}</text>` : ""}
        <text class="fo" x="${x1 + 22}" y="${c - 1}">${o.t ? "R$ " + pcMi(o.t) : "—"}</text>
        <text class="mu" x="${x1 + 22}" y="${c + 15}">${o.t ? `${nf(o.p / o.t * 100, 0)}% pago` : ""}${pq != null ? ` · <tspan fill="${pq >= 1 ? "#5FE873" : "#C9CDD1"}">${nf(pq * 100, 0)}% da quota</tspan>` : ""}</text></g>`; }).join("")}</svg>
    <div class="pclg"><span><i style="background:linear-gradient(90deg,#9FB0C2,#DDE5EC)"></i>${A.some((o) => o.q) ? "LOA + adicional (conta na quota)" : "indicado"}</span>${A.some((o) => o.q && o.t > o.qv) ? `<span><i style="background:#5D7088"></i>excesso, bancada e outros (fora da quota)</span>` : ""}<span class="p"><i></i>pago</span>${A.some((o) => o.q) ? `<span><i style="background:rgba(242,244,245,.1)"></i>até a quota</span><span class="q"><i></i>quota pela lei</span>` : ""}</div>`; }
function pcEmpilhada(D) { const A = D.A, P = D.partes, W = 900, H = 360, m = { l: 54, r: 160, t: 26, b: 30 }, x = d3.scaleBand(A.map((o) => o.a), [m.l, W - m.r]).padding(.42), mx = d3.max(A, (o) => Math.max(o.t, o.q)) * 1.1 || 1, y = d3.scaleLinear([0, mx], [H - m.b, m.t]), last = [...A].reverse().find((o) => o.t), id = (k) => "pch" + P.indexOf(k);
  return `<svg viewBox="0 0 ${W} ${H}" class="pcsvg"><defs>${P.map((k) => `<pattern id="${id(k)}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${D.cor[k]}" opacity=".14"/><line x1="0" y1="0" x2="0" y2="6" stroke="${D.cor[k]}" stroke-width="2.2"/></pattern>`).join("")}</defs>
    ${y.ticks(4).map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="rgba(242,244,245,.05)" stroke-dasharray="2 4"/><text class="mu" x="${m.l - 10}" y="${y(t) + 4}" text-anchor="end">${t ? pcMi(t) : 0}</text>`).join("")}
    ${A.map((o) => { let acc = 0; const bx = x(o.a), bw = x.bandwidth();
      return `<g class="pcrow" data-pano="${o.a}">${P.map((k) => { const s = o.s[k]; if (!s.v) return ""; const y0 = y(acc), y1 = y(acc + s.v), yp = y(acc + s.p); acc += s.v;
        return `<g data-pseg="${esc(k)}"><rect x="${bx}" y="${y1}" width="${bw}" height="${y0 - y1}" fill="url(#${id(k)})"/><rect x="${bx}" y="${yp}" width="${bw}" height="${y0 - yp}" fill="${D.cor[k]}"/><line x1="${bx}" x2="${bx + bw}" y1="${y1}" y2="${y1}" stroke="#14191A" stroke-width="2"/><title>${esc(D.nome(k))} ${o.a}: R$ ${pcMi(s.v)} · ${nf(s.p / s.v * 100, 0)}% pago</title></g>`; }).join("")}
        ${o.q ? `<line x1="${bx - 8}" x2="${bx + bw + 8}" y1="${y(o.q)}" y2="${y(o.q)}" stroke="${PC_Q}" stroke-width="2" stroke-dasharray="5 4"/>` : ""}
        <text class="fo" x="${bx + bw / 2}" y="${y(Math.max(o.t, o.q)) - 9}" text-anchor="middle">${o.t ? pcMi(o.t) : ""}</text><text class="ano" x="${bx + bw / 2}" y="${H - 8}" text-anchor="middle">${o.a}</text></g>`; }).join("")}
    ${last ? (() => { let acc = 0, yAnt = 1e9; return P.map((k) => { const s = last.s[k]; if (!s.v) return ""; let c = y(acc + s.v / 2) + 4; acc += s.v; if (yAnt - c < 13) c = yAnt - 13; yAnt = c; return `<text x="${x(last.a) + x.bandwidth() + 14}" y="${c}" fill="${D.cor[k] === "#20262E" ? "#8A9096" : D.cor[k]}" font-size="11.5">${esc(D.nome(k))}</text>`; }).join(""); })() : ""}</svg>
    <div class="pclg"><span><i style="background:#C9D4DE"></i>cheio = pago</span><span><i style="background:repeating-linear-gradient(45deg,#C9D4DE 0 2px,transparent 2px 5px)"></i>listrado = falta pagar</span>${A.some((o) => o.q) ? `<span class="q"><i></i>quota pela lei</span>` : ""}</div>`; }
function pcArea(D) { const A = D.A, P = D.partes, W = 900, H = 360, m = { l: 54, r: 170, t: 22, b: 30 }, x = d3.scalePoint(A.map((o) => o.a), [m.l, W - m.r]), mx = d3.max(A, (o) => Math.max(o.t, o.q)) * 1.1 || 1, y = d3.scaleLinear([0, mx], [H - m.b, m.t]);
  const st = d3.stack().keys(P).value((o, k) => o.s[k].v)(A), ar = d3.area().defined((d) => d.data.t > 0).x((d) => x(d.data.a)).y0((d) => y(d[0])).y1((d) => y(d[1])).curve(d3.curveMonotoneX);
  const ln = (f, def) => d3.line().defined(def || (() => true)).x((o) => x(o.a)).y((o) => y(f(o))).curve(d3.curveMonotoneX)(A), ult = [...A].reverse().find((o) => o.t);
  return `<svg viewBox="0 0 ${W} ${H}" class="pcsvg"><defs>${P.map((k, i) => `<linearGradient id="pcag${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${D.cor[k]}" stop-opacity=".95"/><stop offset="1" stop-color="${D.cor[k]}" stop-opacity=".5"/></linearGradient>`).join("")}</defs>
    ${y.ticks(4).map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="rgba(242,244,245,.05)" stroke-dasharray="2 4"/><text class="mu" x="${m.l - 10}" y="${y(t) + 4}" text-anchor="end">${t ? pcMi(t) : 0}</text>`).join("")}
    ${st.map((s, i) => `<path data-pseg="${esc(s.key)}" d="${ar(s) || ""}" fill="url(#pcag${i})" stroke="#14191A" stroke-width="1.5"><title>${esc(D.nome(s.key))}</title></path>`).join("")}
    ${A.some((o) => o.q) ? `<path d="${ln((o) => o.q)}" fill="none" stroke="${PC_Q}" stroke-width="2" stroke-dasharray="6 5"/>` : ""}
    <path d="${ln((o) => o.p, (o) => o.t > 0)}" fill="none" stroke="${PC_VERDE}" stroke-width="2.5"/>
    ${A.map((o) => `<g class="pcrow" data-pano="${o.a}">${o.t ? `<circle cx="${x(o.a)}" cy="${y(o.p)}" r="3.5" fill="${PC_VERDE}"/><text class="fo" x="${x(o.a)}" y="${y(Math.max(o.t, o.q)) - 10}" text-anchor="middle">${pcMi(o.t)}</text>` : o.q ? `<text class="mu" x="${x(o.a)}" y="${y(o.q) - 12}" text-anchor="middle">sem indicações ainda</text>` : ""}<text class="ano" x="${x(o.a)}" y="${H - 8}" text-anchor="middle">${o.a}</text></g>`).join("")}
    ${ult ? st.map((s) => { const d = s.find((v) => v.data.a === ult.a); return d && d[1] > d[0] + 1 ? `<text x="${W - m.r + 14}" y="${y((d[0] + d[1]) / 2) + 4}" fill="${D.cor[s.key] === "#20262E" ? "#8A9096" : D.cor[s.key]}" font-size="11.5">${esc(D.nome(s.key))}</text>` : ""; }).join("") : ""}</svg>
    <div class="pclg"><span class="p"><i></i>pago no ano</span>${A.some((o) => o.q) ? `<span class="q"><i></i>quota pela lei</span>` : ""}</div>`; }
function pcCem(D) { const B = D.A.filter((o) => o.t), P = D.partes, W = 900, rh = 46, H = B.length * rh + 10, x0 = 64, x1 = W - 10, x = d3.scaleLinear([0, 1], [x0, x1]);
  return `<svg viewBox="0 0 ${W} ${H}" class="pcsvg">${B.map((o, i) => { let acc = 0; const c = i * rh + 22;
    return `<g class="pcrow" data-pano="${o.a}"><text class="ano" x="0" y="${c + 5}">${o.a}</text>${P.map((k) => { const s = o.s[k]; if (!s.v) return ""; const f = s.v / o.t, a0 = x(acc); acc += f; const w = x(acc) - a0, claro = ["#C9D4DE", "#93A6BA"].includes(D.cor[k]);
      return `<g data-pseg="${esc(k)}"><rect x="${a0}" y="${c - 14}" width="${Math.max(0, w - 2)}" height="28" rx="5" fill="${D.cor[k]}"/>${w > 46 ? `<text x="${a0 + 9}" y="${c + 4}" style="fill:${claro ? "#111517" : "#F2F4F5"};font-weight:600">${nf(f * 100, 0)}%</text>` : ""}<title>${esc(D.nome(k))} ${o.a}: ${nf(f * 100, 0)}% · R$ ${pcMi(s.v)}</title></g>`; }).join("")}</g>`; }).join("")}</svg>`; }
function painelCotas(anos, I) {
  const tipos = Object.keys(COTA_T).filter((t) => I.some((x) => x.t === t)); if (!S.ctipo || (S.ctipo !== "TODOS" && !tipos.includes(S.ctipo))) S.ctipo = "TODOS";
  S.cfmt = S.cfmt || "bullet"; if (!PC_DIM.some(([k]) => k === S.cdim)) S.cdim = "ori"; const f = PC_FMT.find((x) => x[0] === S.cfmt) || PC_FMT[0];
  const D = pcDados(anos, I); S.cDados = D; const pronto = !!window.d3;
  const corpo = !pronto ? `<div class="pcload">carregando o gráfico…</div>` : S.cfmt === "empilhada" ? pcEmpilhada(D) : S.cfmt === "area" ? pcArea(D) : S.cfmt === "cem" ? pcCem(D) : pcBullet(D);
  const nomeDim = (k) => (PC_DIM.find((x) => x[0] === k) || DIMS.find((x) => x[0] === k) || [k, k])[1];
  return `<div class="ccomp pcq"><div class="pctop"><div><div class="ctit">Cotas por ano · ${esc(f[2])}</div><div class="cfils"><b>${fm(D.tot)}</b><span>${anos[0]}–${anos[anos.length - 1]}${S.ctipo !== "TODOS" ? " · " + esc(COTA_T[S.ctipo][0]) : ""}</span>${S.cfil.map(([d, v], k) => `<button class="cchip" data-ptira="${k}">${esc(nomeDim(d))}: ${esc(v)} ×</button>`).join("")}</div></div>
      <div class="pcfmt" role="tablist">${PC_FMT.map(([k, t]) => `<button role="tab" aria-selected="${S.cfmt === k}" data-pfmt="${k}" class="${S.cfmt === k ? "on" : ""}">${t}</button>`).join("")}</div></div>
    <div class="pcf"><div><span class="lb">Tipo de cota</span>${["TODOS", ...tipos].map((t) => `<button data-ptipo="${t}" class="${S.ctipo === t ? "on" : ""}">${t === "TODOS" ? "Todos" : esc(COTA_T[t][0])}</button>`).join("")}</div>
      ${S.cfmt !== "bullet" ? `<div><span class="lb">Separar por</span>${PC_DIM.filter(([k]) => !(k === "ori" && S.ctipo !== "TODOS") && !S.cfil.some(([d]) => d === k)).map(([k, t]) => `<button data-pdim="${k}" class="${D.dim === k ? "on" : ""}">${t}</button>`).join("")}</div>` : ""}</div>
    <p class="pcpq">${esc(f[3])}</p>${corpo}
    ${S.cfmt !== "bullet" ? `<div class="pclg pcpart">${D.partes.map((k) => `<button data-pseg="${esc(k)}"><i style="background:${D.cor[k]}"></i>${esc(D.nome(k))}</button>`).join("")}</div>` : ""}
    <p class="pcdica">Clique no ano para ver as indicações${S.cfmt !== "bullet" ? "; clique numa parte para filtrar" : ""}.</p></div>`;
}
