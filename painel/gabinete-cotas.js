// Gabinete · Cotas (26/10/2026). Dois gráficos no mesmo padrão (barra horizontal arredondada por ano, tons de cinza,
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
    return { r, ano: +r.ano, v, t, ori: COTA_T[t][0], area: funDe(r), instr: instrNome(r.modalidade) || "Não informado", reg: regDe(r) || "Sem região", mun: r.municipio ? frase(r.municipio) : "—", obj: r.objeto, pago, sef: !!e };
  });
  (typeof AD !== "undefined" ? AD.itens : []).forEach((x) => { const Lr = AD.listas.find((l) => l.id === x.lista_id), a = Lr ? anoLista(Lr) : 0; if (a < 2000) return; const t = tipoLista(Lr);
    L.push({ x, ano: a, v: +x.valor || 0, t, ori: COTA_T[t][0], area: funDe(x), instr: x.modalidade || "Não informado", reg: regDe(x) || "Sem região", mun: x.municipio ? frase(x.municipio) : "—", obj: x.objeto, pago: 0, plan: 1 }); });
  return L.filter((i) => noEsc(i.t));
}
// cotas legais com valor disponível cadastrado pela administração (fixas): excesso de arrecadação 2026 (LDO 2026, art. 30:
// 1,55% do crescimento da RCL, só Saúde) = R$ 718.997,79 por parlamentar, até 7 indicações, prazo 28/10/2026
const COTAS_LEGAIS = { 2026: { EX: { disp: 718997.79, max: 7, min: 100000, areas: ["Saúde"], mods: ["Transferência Especial", "Convênio", "Execução Direta"], prazo: "2026-10-28T18:00", base: "LDO 2026 (Lei 19.401/2025), art. 30", doc: "Of. 004/2026 CFT · LDO 2026 art. 30", entrega: "via SEI" } } };
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
  const it = I.filter((x) => x.ano === a && (g === 1 ? S.cfil.every(([d, v]) => x[d] === v) : S.ctipo === "TODOS" || x.t === S.ctipo)).sort((p, q) => q.v - p.v);
  const tot = it.reduce((s, x) => s + x.v, 0), pg = it.reduce((s, x) => s + x.pago, 0), d = g === 2 && S.ctipo !== "TODOS" ? dispDoAno(a, S.ctipo) : 0, livre = d ? Math.max(0, d - tot) : 0;
  const rot = g === 1 ? (S.cfil.map(([, v]) => v).join(" · ") || "Todas as origens") : S.ctipo === "TODOS" ? "Todas as cotas" : COTA_T[S.ctipo][0];
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
  try { const g = JSON.parse(localStorage.getItem("gab_cotas") || "{}"); if (S.cesc == null) Object.assign(S, { cesc: g.cesc || "imp", cdim: g.cdim || "ori", cfil: g.cfil || [], ctipo: g.ctipo || "TODOS" }); } catch (e) {}
  S.cesc = S.cesc || "imp"; S.cfil = S.cfil || []; S.cdim = S.cdim || "ori";
  const I = itensCotas(), anos = [...new Set([...I.map((x) => x.ano), ...(S.cesc !== "neg" ? Object.keys(COTAS_LEGAIS).map(Number) : [])])].sort();
  const esc0 = `<div class="ctop"><div class="cabas">${ESC.map(([k, t]) => `<button data-cesc="${k}" class="${S.cesc === k ? "on" : ""}">${t}</button>`).join("")}</div>
    <span class="ctopd"><button class="lk" data-cimp>Imprimir</button><button class="ibt${S.cinfo ? " on" : ""}" data-cinfo aria-label="Como os números são calculados">i</button></span></div>${S.cinfo ? `<div class="cinfo">${INFO_COTAS}</div>` : ""}`;
  if (!anos.length) return `<div class="cotas">${esc0}<div class="obra">Sem itens neste recorte.</div></div>`;
  return `<div class="cotas">${esc0}${avisos(I)}${comparacao(anos, I)}${S.lano && S.lano.g === 1 ? listaAno(I) : ""}${porTipo(anos, I)}${S.lano && S.lano.g === 2 ? listaAno(I) : ""}</div>`;
}

// ---------- interação ----------
function guardarCotas() { try { localStorage.setItem("gab_cotas", JSON.stringify({ cesc: S.cesc, cdim: S.cdim, cfil: S.cfil, ctipo: S.ctipo })); } catch (e) {} }
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
  if (g === 1) S.cfil.forEach(([d, v]) => { if (d === "area") S.mf.fun = v; if (d === "instr") S.mf.mod = v; if (d === "reg") S.mf.reg = v; if (d === "mun") S.mq = v; if (d === "ori") { const t = Object.keys(COTA_T).find((k) => COTA_T[k][0] === v); if (T[t]) S.mori = T[t]; } });
  else if (T[S.ctipo]) S.mori = T[S.ctipo];
  desenhar(); const t = $("#mtab"); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
}
function imprimirCotas() {
  const w = $("#corpoAba .cotas"); if (!w) return; const tabs = [...w.querySelectorAll(".ccomp")].map((g) => `<h2>${g.querySelector(".ctit").textContent} · ${g.querySelector(".cfils b").textContent}</h2><table><tr><th>Ano</th><th class="n">Total</th><th>Detalhe</th></tr>${[...g.querySelectorAll(".cano")].map((l) => `<tr><td>${l.querySelector(".ca").textContent}</td><td class="n">${l.querySelector(".ct").childNodes[0].textContent}</td><td>${[...l.querySelectorAll(".cab [title]")].map((s) => esc(s.title.replace(/ · \d{4}:/, ":"))).join("<br>")}${[...l.querySelectorAll(".ct small")].map((s) => " · " + esc(s.textContent)).join("")}</td></tr>`).join("")}</table>`).join("");
  const win = window.open("", "_blank"); win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cotas · ${esc(PARL.u)}</title><style>@page{size:A4;margin:14mm}body{font:11px/1.45 Inter,system-ui,sans-serif;color:#0B0D0E}h1{font-size:20px;margin:0 0 4px}h2{font-size:13px;margin:18px 0 6px}p{color:#5A6067}table{width:100%;border-collapse:collapse}th{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#6B7178;text-align:left;border-bottom:1px solid #0B0D0E;padding:4px}td{border-bottom:.5px solid #C9CDD1;padding:5px 4px;vertical-align:top}.n{text-align:right;white-space:nowrap}</style></head><body><h1>Cotas · ${esc(PARL.u)}</h1><p>${esc(ESC.find(([k]) => k === S.cesc)[1])}${S.cfil.length ? " · " + esc(S.cfil.map(([, v]) => v).join(" · ")) : ""} · ${new Date().toLocaleDateString("pt-BR")}</p>${tabs}<p style="margin-top:14px">${INFO_COTAS.replace(/<[^>]+>/g, "")}</p><script>setTimeout(()=>print(),300)<\/script></body></html>`); win.document.close();
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
  on("[data-cind]", () => () => { const L = AD.listas.find((l) => anoLista(l) === S.lano.a && tipoLista(l) === S.ctipo); formItem({ lista_id: L ? L.id : null }); });
}
