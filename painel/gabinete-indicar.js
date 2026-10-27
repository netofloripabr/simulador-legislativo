// Gabinete · página de Indicação de recursos (27/10/2026). O "+" do Controle desliza para uma página à direita, no padrão
// claro do item: capa com os números do ano (ou da cota fixa, com contador regressivo), anos no topo, etiquetas por ano
// (planilha do gabinete, listas criadas, cotas fixas do administrador em laranja, "+ nova lista") e a planilha da etiqueta.
// Clicar numa linha abre o detalhamento à direita. Tudo grava nas mesmas tabelas do Controle (gab_itens / gab_listas).
// Usa os globais de gabinete.js, gabinete-adicionar.js e gabinete-cotas.js.

const IND = { aberto: false, ano: null, tag: null, det: null, tick: null };
const anoAtual = () => new Date().getFullYear();
// linha que conta como emenda: tem município ou valor (objeto solto é rascunho, não entra em total, alerta nem documento)
const cheia = (x) => !!(x && (x.municipio || +x.valor));
// cotas fixas do administrador (COTAS_LEGAIS) viram etiquetas laranja; a lista do gabinete ligada a ela é criada no 1º item
const cotaNome = { EX: "Excesso · Saúde", "0,55": "Adicional 0,55%", AN: "Impositivas LOA" };
function listaDaCota(ano, t) { return AD.listas.find((l) => anoLista(l) === ano && tipoLista(l) === t); }
function etiquetas(ano) {
  const T = [];
  if (MEU.some((r) => +r.ano === ano && !supr(r))) T.push({ k: "plan", nome: "Planilha do gabinete" });
  Object.entries(COTAS_LEGAIS[ano] || {}).forEach(([t, c]) => { const L = listaDaCota(ano, t); T.push({ k: "cota:" + t, nome: cotaNome[t] || COTA_T[t][0], cota: { t, ...c }, L }); });
  AD.listas.filter((l) => anoLista(l) === ano && !(COTAS_LEGAIS[ano] || {})[tipoLista(l)]).forEach((l) => T.push({ k: "l:" + l.id, nome: l.apelido || l.origem, L: l }));
  if (ano === anoAtual() && AD.itens.some((x) => !x.lista_id)) T.push({ k: "avulsos", nome: "Avulsos" });
  return T;
}
function anosInd() {
  const A = new Set([...MEU.filter((r) => r.ano).map((r) => +r.ano), ...Object.keys(COTAS_LEGAIS).map(Number), ...AD.listas.map(anoLista).filter((a) => a > 2000), anoAtual()]);
  return [...A].sort((a, b) => b - a);
}
// ---------- capa ----------
function capaInd(T) {
  if (T && T.cota) {
    const c = T.cota, it = T.L ? AD.itens.filter((x) => x.lista_id === T.L.id && cheia(x)) : [], tot = it.reduce((s, x) => s + (+x.valor || 0), 0), livre = c.disp - tot;
    return `<div class="t"><span class="tk">Disponível</span><span class="iv">R$ ${nf(c.disp, 2)}<small>${esc(c.base || "")}</small></span></div>
      <div class="t"><span class="tk">Livre</span><span class="iv"${livre < 0 ? ' style="color:#C0392B"' : ""}>${rc(livre)}<small>${it.length} de ${c.max || "—"} emendas</small></span><div class="ibar"><i style="width:${Math.min(100, tot / c.disp * 100)}%"></i></div></div>
      <div class="t w2"><span class="tk">${c.prazo ? `Fecha ${new Date(c.prazo).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${c.prazo.slice(11, 16)}` : "Sem prazo"}${c.entrega ? " · " + esc(c.entrega) : ""}</span><div class="icd" data-prazo="${esc(c.prazo || "")}"></div></div>`;
  }
  const a = IND.ano, sv = S.cesc; S.cesc = "imp"; const I = itensCotas().filter((x) => x.ano === a); S.cesc = sv;
  const ind = I.reduce((s, x) => s + x.v, 0), pg = I.reduce((s, x) => s + x.pago, 0), q = (QUOTA[a] || 0) + Object.entries(COTAS_LEGAIS[a] || {}).filter(([t]) => t !== "AN").map(([, c]) => c).reduce((s, c) => s + (c.disp || 0), 0);
  return `<div class="t"><span class="tk">Cota legal ${a}</span><span class="iv">${q ? rc(q) : "—"}</span></div><div class="t"><span class="tk">Indicado</span><span class="iv">${rc(ind)}</span></div>
    <div class="t"><span class="tk">Pago</span><span class="iv">${rc(pg)}</span></div><div class="t"><span class="tk">Saldo a indicar</span><span class="iv">${q ? rc(Math.max(0, q - ind)) : "—"}</span>${q ? `<div class="ibar"><i style="width:${Math.min(100, ind / q * 100)}%"></i></div>` : ""}</div>`;
}
function contador() {
  document.querySelectorAll("#indPg .icd[data-prazo]").forEach((e) => { const p = e.dataset.prazo; if (!p) { e.innerHTML = ""; return; }
    let s = Math.max(0, (new Date(p) - new Date()) / 1000); if (!s) { e.innerHTML = `<span class="ifim">Prazo encerrado</span>`; return; }
    e.innerHTML = [[Math.floor(s / 86400), "dias"], [Math.floor(s % 86400 / 3600), "h"], [Math.floor(s % 3600 / 60), "min"], [Math.floor(s % 60), "s"]].map(([v, u]) => `<div><b>${String(v).padStart(2, "0")}</b><span>${u}</span></div>`).join(""); });
}
// ---------- planilha da etiqueta ----------
function linhasInd(T) {
  if (T.k === "plan") return MEU.filter((r) => +r.ano === IND.ano && !supr(r)).map((r) => ({ id: "m:" + mk(r), mun: r.municipio, obj: r.objeto, ins: instrSig(r.modalidade) || "—", v: +r.valor || 0, st: (etapasStatus(r.status_manual).t || r.status_manual || "") }));
  const it = T.k === "avulsos" ? AD.itens.filter((x) => !x.lista_id) : T.L ? AD.itens.filter((x) => x.lista_id === T.L.id) : [];
  return it.map((x) => ({ id: "a:" + x.id, mun: x.municipio, obj: x.objeto, ins: x.modalidade || "—", v: +x.valor || 0, st: x.status || "Em análise" }));
}
// regras da etiqueta: o que a lei/ofício fixa (cota do administrador) ou as regras da lista do gabinete
function regrasInd(T) {
  const c = T.cota || {}, r = (T.L && T.L.regras) || {};
  const areas = (c.areas || r.areas || AREAS.map((a) => a[1])), mods = c.mods || MODS;
  return { areas, mods, saude: c.saude || null, min: c.min || r.min || null, max: c.max || r.max || null, disp: c.disp || r.disp || null, trava: areas.length === 1 ? areas[0] : null };
}
// objetos de referência: histórico das emendas (planilha + indicações), sem o nome do município, do mais ao menos usado
function objetosRef(q) {
  const C = {}, tira = (t) => frase(String(t || "").replace(/[,;]?\s*(n[oa]s?|d[oa]s?|em|para)\s+(munic[ií]pios?|cidades?)\s+d[eoa]s?\s+.*$/i, "").replace(/\s+/g, " ").trim());
  [...MEU.map((r) => r.objeto), ...AD.itens.map((x) => x.objeto)].forEach((o) => { const t = tira(o); if (t.length > 6) C[t] = (C[t] || 0) + 1; });
  const n = norm(q || "").split(/\s+/).filter(Boolean);
  return Object.entries(C).filter(([t]) => n.every((w) => norm(t).includes(w))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 40);
}
// tipo de quem recebe → instrumento sugerido (o usuário pode trocar): Município → TE, Entidade → Convênio, Estado → Execução Direta
const BTIPO = [["mun", "Município", "Transferência Especial"], ["ent", "Entidade", "Convênio"], ["est", "Estado", "Execução Direta"]];
const tipoDe = (x) => x.benef_tipo || (x.modalidade === "Transferência Especial" ? "mun" : /Convênio|Termo|Acordo/.test(x.modalidade || "") ? "ent" : x.modalidade === "Execução Direta" ? "est" : "");
const benefAuto = (t, x, g) => { const a = AREAS.find((q) => q[1] === (x.area || g.trava)) || [];
  return t === "mun" ? `${a[1] === "Saúde" ? "Fundo Municipal de Saúde" : "Prefeitura Municipal"} de ${x.municipio || "…"}` : t === "est" ? `${a[1] === "Saúde" ? "Fundo Estadual de Saúde" : "Órgão estadual"}${a[3] ? " · UO " + a[3] : ""}` : ""; };
const moeda = (v) => (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function linhaInd(T, g, x, i) {
  const t = x ? tipoDe(x) : "", v = x ? +x.valor || 0 : 0;
  const ck = x ? [[x.municipio, "município"], [x.objeto, "objeto"], [t, "quem recebe"], [g.min ? v >= g.min : v > 0, g.min ? "valor ≥ " + rc(g.min) : "valor"], ...(t === "ent" ? [[String(x.cnpj || "").replace(/\D/g, "").length === 14, "CNPJ"], [x.razao_social || x.beneficiario, "razão social"]] : [])] : [];
  const quem = t === "ent" ? `<input data-c="cnpj" value="${esc(x.cnpj || "")}" placeholder="CNPJ 00.000.000/0000-00"><input data-c="razao_social" value="${esc(x.razao_social || x.beneficiario || "")}" placeholder="Razão social da entidade">`
    : t ? `<input class="iauto" value="${esc(x.beneficiario || benefAuto(t, x, g))}" data-c="beneficiario" title="Preenchido pelo tipo; pode editar">` : "";
  return `<tr class="iw${x && IND.det === "a:" + x.id ? " on" : ""}" data-iw="${x ? x.id : ""}"><td class="n">${i + 1}</td>
    <td class="itp"><div class="iseg">${BTIPO.map(([k, l]) => `<button data-bt="${k}" class="${t === k ? "on" : ""}">${l}</button>`).join("")}</div>
      ${t ? `<select data-c="modalidade" class="iins">${g.mods.concat(g.mods.includes(x.modalidade) || !x.modalidade ? [] : [x.modalidade]).map((m) => `<option${x.modalidade === m ? " selected" : ""}>${esc(m)}</option>`).join("")}</select>` : ""}</td>
    <td><input data-c="municipio" list="indMun" value="${esc(x ? x.municipio || "" : "")}" placeholder="${x ? "Município" : "indicar"}"></td>
    <td class="iob"><div class="iqm">${quem}</div><div><textarea data-c="objeto" rows="1" placeholder="Objeto">${esc(x ? x.objeto || "" : "")}</textarea><button class="imais" data-iobj title="Objetos de referência">+</button></div></td>
    ${g.trava ? "" : `<td><select data-c="area"><option value=""></option>${g.areas.map((a) => `<option${x && x.area === a ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></td>`}
    <td class="r iv2"><input data-c="valor" inputmode="numeric" class="${x && g.min && v && v < g.min ? "ierr" : ""}" value="${v ? moeda(v) : ""}" placeholder="0,00"><div class="iqk">${g.min ? `<button data-iq="min">mín.</button>` : ""}${g.disp ? `<button data-iq="sal">usar saldo</button>` : ""}</div></td>
    <td class="iac">${x ? `<button data-idet title="Detalhar">↗</button><button data-ilimpa title="Limpar linha">×</button>` : ""}</td></tr>
    ${ck.length ? `<tr class="ick" data-ick="${x.id}"><td></td><td colspan="${g.trava ? 5 : 6}">${ck.map(([ok, l]) => `<span class="${ok ? "ok" : "no"}">${ok ? "✓" : "•"} ${l}</span>`).join("")}</td></tr>` : ""}`;
}
function rodapeInd(T, g, it) { it = it.filter(cheia); const tot = it.reduce((s, x) => s + (+x.valor || 0), 0);
  return `<td></td><td colspan="${g.trava ? 3 : 4}">Total · ${it.length} ${it.length === 1 ? "item" : "itens"}${g.max ? ` de ${g.max}` : ""}</td><td class="r">${moeda(tot)}</td><td>${g.saude ? (() => { const sd = it.filter((x) => (x.area || g.trava) === "Saúde").reduce((s2, x) => s2 + (+x.valor || 0), 0), meta = g.disp * g.saude, okS = sd >= meta - .005; return `<span class="${okS ? "mut" : "ierr"}">Saúde R$ ${moeda(sd)} · ${tot ? Math.round(sd / tot * 100) : 0}% ${okS ? "✓" : `· faltam R$ ${moeda(meta - sd)} para 50%`}</span><br>`; })() : ""}${g.disp ? `<span class="${tot > g.disp + .005 ? "ierr" : "mut"}">${tot > g.disp + .005 ? "passou R$ " + moeda(tot - g.disp) : "saldo R$ " + moeda(g.disp - tot)}</span>` : ""}</td>`; }
function planInd(T) {
  if (!T) return `<div class="iinf">Nenhuma lista neste ano. Use “+ nova lista” para começar.</div>`;
  const R = linhasInd(T), c = T.cota, tot = R.reduce((s, x) => s + x.v, 0), edita = T.k !== "plan", g = regrasInd(T);
  const inf = c ? `<b>Cota fixa do administrador</b> · ${esc(c.doc || c.base || "")}${c.min ? ` · mín. ${fm(c.min)}` : ""}${c.max ? ` · até ${c.max} emendas` : ""}${c.saude ? ` · Saúde no mínimo ${c.saude * 100}%` : ""}${c.abre && new Date(c.abre) > new Date() ? ` · abre em ${new Date(c.abre).toLocaleDateString("pt-BR")}` : ""}`
    : T.k === "plan" ? "Planilha do gabinete · itens do exercício " + IND.ano : T.k === "avulsos" ? "Indicações fora de lista" : `Lista do gabinete · ${esc(T.L.origem || "")}`;
  const outras = !c && edita ? (() => { const sv = S.cesc; S.cesc = "imp"; const ind = itensCotas().filter((x) => x.ano === IND.ano).reduce((s, x) => s + x.v, 0); S.cesc = sv; const q = QUOTA[IND.ano]; return q ? `<span class="isal">Impositivas ${IND.ano}: saldo <b>${rc(Math.max(0, q - ind))}</b></span>` : ""; })() : "";
  const acs = edita && (T.L || T.cota) ? `<span class="iacs">${T.L ? `<button data-ireg>Regras</button>` : ""}<button data-idoc>Documento</button><button data-ixls>Planilha do Orçamento</button></span>` : "";
  const trava = edita && g.trava ? `<span class="itrava">Área travada: <b>${esc(g.trava)}</b>${(AREAS.find((a) => a[1] === g.trava) || [])[0] ? ` · subação ${AREAS.find((a) => a[1] === g.trava)[0]}` : ""}</span>` : "";
  if (!edita) return `<div class="iinf">${inf}</div><div class="itw"><table class="itb"><thead><tr><th></th><th>Município</th><th>Objeto</th><th>Instr.</th><th class="r">Valor</th><th class="hm">Status</th><th></th></tr></thead><tbody>
    ${R.map((x, i) => `<tr class="ir${IND.det === x.id ? " on" : ""}" data-ir="${esc(x.id)}"><td class="n">${i + 1}</td><td>${esc(x.mun || "—")}</td><td class="ob">${esc(frase(x.obj || ""))}</td><td>${esc(x.ins)}</td><td class="r">${ni(Math.round(x.v))}</td><td class="hm st">${esc(x.st)}</td><td class="ar">›</td></tr>`).join("")}
    <tr class="itt"><td></td><td colspan="3">Total · ${R.length} itens</td><td class="r">${ni(Math.round(tot))}</td><td colspan="2" class="hm"></td></tr></tbody></table></div>`;
  const it = R.map((x) => AD.itens.find((y) => "a:" + y.id === x.id)), vaz = g.max ? Math.min(g.max > 10 ? 3 : g.max, Math.max(0, g.max - it.length)) : 1; // cota grande (LOA, 120): só 3 linhas em branco por vez
  return `<div class="iinf">${inf}${trava}${outras}${acs}</div><datalist id="indMun">${BASE.mun.map((m) => `<option value="${esc(m.n)}">`).join("")}</datalist>
    <div class="itw"><table class="itb ied"><thead><tr><th></th><th>Quem recebe · instrumento</th><th>Município</th><th>Beneficiário · objeto</th>${g.trava ? "" : "<th>Área</th>"}<th class="r">Valor (R$)</th><th></th></tr></thead><tbody>
    ${it.map((x, i) => linhaInd(T, g, x, i)).join("")}${Array.from({ length: vaz }, (_, i) => linhaInd(T, g, null, it.length + i)).join("")}
    <tr class="itt" id="indRod">${rodapeInd(T, g, it)}</tr></tbody></table></div>`;
}
// ---------- edição direto na planilha: grava a célula e redesenha SÓ a linha (não perde o que está sendo digitado nas outras e não pula de campo) ----------
const numBR = (s) => +String(s || "").replace(/[^\d,]/g, "").replace(",", ".") || 0;
async function garantirLista(T) {
  if (T.L || T.k === "avulsos") return T.L || null; const c = T.cota;
  if (!c) return null; const g = regrasInd(T);
  if (!IND.criaL) IND.criaL = gravar("gab_listas", { origem: `${COTA_T[c.t][0]} ${IND.ano}${c.areas ? " · " + c.areas.join(", ") : ""}`, apelido: `${c.t === "EX" ? "Excesso" : COTA_T[c.t][0]} ${String(IND.ano).slice(2)}`, modelo: "cota:" + c.t, regras: { disp: g.disp, min: g.min, max: g.max, prazo: c.prazo || "", areas: g.areas } });
  try { T.L = await IND.criaL; } finally { IND.criaL = null; } return T.L;
}
async function salvarLinha(T, tr, campos) {
  const g = regrasInd(T);
  if (!tr.dataset.iw && tr._cria) await tr._cria;
  const id = tr.dataset.iw; let x = id ? AD.itens.find((y) => y.id === id) : null;
  if (!x && !Object.values(campos).some((v) => v != null && v !== "")) return;
  try { const L = await garantirLista(T);
    const reg = x ? { id: x.id, ...campos } : { lista_id: L ? L.id : null, tipo: T.cota ? "Emenda impositiva" : null, status: "Em análise", ...(g.trava ? { area: g.trava } : {}), ...campos };
    const pr = gravar("gab_itens", reg); if (!x) tr._cria = pr; const nx = await pr; tr._cria = null;
    const ativo = document.activeElement, campoAt = ativo && tr.contains(ativo) ? ativo.dataset.c : null, sel = ativo && ativo.selectionStart;
    const i = [...tr.parentNode.querySelectorAll("tr.iw")].indexOf(tr), ck = tr.nextElementSibling && tr.nextElementSibling.classList.contains("ick") ? tr.nextElementSibling : null;
    const tmp = document.createElement("tbody"); tmp.innerHTML = linhaInd(T, g, nx, i); if (ck) ck.remove();
    const novos = [...tmp.children]; tr.replaceWith(...novos); ligarLinha(novos[0], T);
    if (campoAt) { const el = novos[0].querySelector(`[data-c="${campoAt}"]`); if (el) { el.focus(); try { el.setSelectionRange(sel, sel); } catch (e) {} } }
    atualizarResumoInd(T);
  } catch (er) { alert("Não foi possível salvar: " + (er.message || er)); }
}
function atualizarResumoInd(T) { const g = regrasInd(T), it = T.L ? AD.itens.filter((x) => x.lista_id === T.L.id) : T.k === "avulsos" ? AD.itens.filter((x) => !x.lista_id) : [];
  const r = $("#indRod"); if (r) r.innerHTML = rodapeInd(T, g, it); const cp = $("#indPg .icapa"); if (cp) { cp.innerHTML = capaInd(T); contador(); }
  const tg = $(`#indPg [data-itag="${T.k}"] small`); if (tg && T.cota) tg.textContent = `${it.filter(cheia).length}/${T.cota.max || "—"}`; }
function ligarLinha(tr, T) {
  const g = regrasInd(T), x = () => AD.itens.find((y) => y.id === tr.dataset.iw);
  tr.querySelectorAll("[data-c]").forEach((el) => { const ini = el.value, c = el.dataset.c;
    if (c === "valor") { el.oninput = () => { const d = el.value.replace(/\D/g, ""); el.value = d ? moeda(+d / 100) : ""; el.setSelectionRange(el.value.length, el.value.length); };
      el.onchange = () => { const v = numBR(el.value); salvarLinha(T, tr, { valor: v || null }); }; return; }
    el.onchange = () => { if (el.value === ini) return; const o = { [c]: el.value.trim() || null };
      if (c === "municipio" && x() && ["mun"].includes(tipoDe(x())) && (!x().beneficiario || /^(Fundo Municipal de Saúde|Prefeitura Municipal) de /.test(x().beneficiario))) o.beneficiario = benefAuto("mun", { ...x(), municipio: o.municipio }, g);
      if (c === "razao_social") o.beneficiario = o.razao_social;
      salvarLinha(T, tr, o); };
    if (el.tagName === "TEXTAREA") { const aj = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }; el.addEventListener("input", aj); aj(); el.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); } }; } });
  tr.querySelectorAll("[data-bt]").forEach((b) => b.onclick = () => { const t = b.dataset.bt, ins = BTIPO.find((q) => q[0] === t)[2], cur = x() || {};
    salvarLinha(T, tr, { benef_tipo: t, modalidade: g.mods.includes(ins) ? ins : cur.modalidade || null, beneficiario: t === "ent" ? cur.razao_social || null : benefAuto(t, { ...cur, area: cur.area }, g) }); });
  tr.querySelectorAll("[data-iq]").forEach((b) => b.onclick = () => { const it = T.L ? AD.itens.filter((y) => y.lista_id === T.L.id && y.id !== tr.dataset.iw) : [];
    const v = b.dataset.iq === "min" ? g.min : Math.max(0, Math.round((g.disp - it.reduce((s, y) => s + (+y.valor || 0), 0)) * 100) / 100); salvarLinha(T, tr, { valor: v }); });
  const d = tr.querySelector("[data-idet]"); if (d) d.onclick = () => { IND.det = "a:" + tr.dataset.iw; desenharInd(); };
  const l = tr.querySelector("[data-ilimpa]"); if (l) l.onclick = async () => { if (l.dataset.ok !== "1") { l.dataset.ok = "1"; l.textContent = "limpar?"; l.classList.add("ok"); setTimeout(() => { l.dataset.ok = ""; l.textContent = "×"; l.classList.remove("ok"); }, 3000); return; }
    try { await apagar("gab_itens", tr.dataset.iw); if (IND.det === "a:" + tr.dataset.iw) IND.det = null; desenharInd(); } catch (er) { alert(er.message || er); } };
  tr.querySelector("[data-iobj]").onclick = (e) => { e.stopPropagation(); popObjeto(tr, T); };
}
function ligarPlan(p, T) { p.querySelectorAll("tr.iw").forEach((tr) => ligarLinha(tr, T)); }
function popObjeto(tr, T) {
  document.querySelectorAll(".ipop").forEach((x) => x.remove());
  const b = tr.querySelector("[data-iobj]"), r = b.getBoundingClientRect(), pop = document.createElement("div"); pop.className = "ipop";
  const g = regrasInd(T); pop.innerHTML = `<input placeholder="Pesquisar objetos já usados (ex.: saúde)" value="${esc(g.trava ? g.trava.toLowerCase() : "")}"><div class="ipl"></div>`;
  $("#indPg").appendChild(pop); pop.style.top = Math.min(r.bottom + 6, innerHeight - 340) + "px"; pop.style.left = Math.max(12, Math.min(r.left - 300, innerWidth - 440)) + "px";
  const q = pop.querySelector("input"), l = pop.querySelector(".ipl");
  const lista = () => { const O = objetosRef(q.value); l.innerHTML = O.length ? O.map(([t, n]) => `<button data-o="${esc(t)}"><span>${esc(t)}</span><small>${n}×</small></button>`).join("") : `<div class="mut" style="padding:10px">Nenhum objeto com esse termo.</div>`;
    l.querySelectorAll("[data-o]").forEach((o) => o.onclick = (ev) => { ev.stopPropagation(); pop.remove(); salvarLinha(T, tr, { objeto: o.dataset.o }); }); };
  q.oninput = lista; lista(); q.focus(); q.select();
  setTimeout(() => document.addEventListener("click", function f(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener("click", f); } }), 0);
}
// ---------- saída: documento no padrão do palpite e planilha .xlsx no modelo do Orçamento ----------
function documentoInd(T) {
  const L = T.L, g = regrasInd(T), it = L ? AD.itens.filter((x) => x.lista_id === L.id && cheia(x)) : [], tot = it.reduce((s, x) => s + (+x.valor || 0), 0), c = T.cota || {};
  const ag = new Date(), dt = ag.toLocaleDateString("pt-BR"), hr = ag.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), tit = T.nome + " · " + IND.ano;
  const lin = (x, i) => `<div class="di-linha"><span class="di-pos">${i + 1}</span><span class="di-cand"><span class="di-n">${esc(x ? x.municipio || "" : "")}</span><span class="di-p">${esc(x ? [x.area || g.trava, x.modalidade].filter(Boolean).join(" · ") : "")}</span></span><span class="di-obj">${esc(x ? frase(x.objeto || "") : "")}${x && (x.beneficiario || x.razao_social) ? `<small>${esc([x.beneficiario || x.razao_social, x.modalidade === "Convênio" ? x.cnpj : ""].filter(Boolean).join(" · "))}</small>` : ""}</span><span class="di-votos"><span class="di-vv di-forte">${x ? ni(Math.round(+x.valor || 0)) : ""}</span></span></div>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(tit)}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet"><style>
  @page{size:A4;margin:14mm 12mm} body{font-family:Inter,system-ui,sans-serif;color:#111;margin:0} .pg{position:relative}
  .di-agua{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}.di-agua span{font-size:110px;font-weight:800;color:rgba(0,0,0,.035);transform:rotate(-24deg)}
  .di-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.di-wm{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1}.di-wm span{color:#1FA83A}.di-wmsub{font-size:7px;font-weight:800;letter-spacing:.2em;color:#6B7178;text-transform:uppercase;margin-top:3px}
  .di-meta{text-align:right;font-size:9px;color:#3F454B;line-height:1.5}.di-regra{margin:10px 0 14px;height:2px;background:#A9AEB3}
  .di-tit{font-size:16px;font-weight:800}.di-sub{font-size:9.5px;color:#3F454B;margin:2px 0 10px}
  .di-rres{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 14px}.di-rres div{border:1px solid #DCDFE2;border-radius:6px;padding:6px 8px;background:#F3F5F6}.di-rres b{display:block;font-size:13px}.di-rres span{font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}
  .di-linha{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:.5px solid #DCDFE2;page-break-inside:avoid}.di-hdr{border-bottom:1.5px solid #A9AEB3;font-size:7px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7178}
  .di-pos{width:18px;flex:none;color:#6B7178;font-size:9.5px;text-align:right}.di-cand{width:150px;flex:none}.di-n{display:block;font-size:11px;font-weight:600}.di-p{display:block;font-size:7.5px;color:#9AA0A4;letter-spacing:.04em;text-transform:uppercase;margin-top:1px}
  .di-obj{flex:1;font-size:9.5px;line-height:1.4}.di-obj small{display:block;color:#6B7178;font-size:8px;margin-top:2px}.di-votos{flex:none;width:86px;background:#F3F5F6;border:1px solid #DCDFE2;border-radius:6px;padding:4px 8px;text-align:right;font-size:10px;font-variant-numeric:tabular-nums}.di-hdr .di-votos{background:none;border:0}
  .di-tot{display:flex;justify-content:space-between;font-weight:800;font-size:11px;padding:8px 0}.di-tot b{color:#1FA83A}.di-al{border:1px solid #E8432A;color:#A32D2D;border-radius:6px;padding:5px 8px;font-size:9px;margin:4px 0}
  .di-rod{margin-top:18px;font-size:8px;color:#6B7178;line-height:1.5}.di-pagfoot{display:flex;justify-content:space-between;font-size:7.5px;color:#9AA0A4;border-top:.5px solid #DCDFE2;margin-top:16px;padding-top:6px}</style></head><body><div class="di-agua"><span>SimulaLEGIS</span></div><div class="pg">
  <div class="di-cab"><div><div class="di-wm">Simula<span>LEGIS</span></div><div class="di-wmsub">Gabinete · Indicação de recursos</div></div><div class="di-meta"><b>${esc(PARL.u || "")}</b> · ${esc(PARL.p || "")}<br>gerado em ${dt} às ${hr}</div></div><div class="di-regra"></div>
  <div class="di-tit">${esc(tit)}</div><div class="di-sub">${esc(c.doc || (L && L.origem) || "")}${c.prazo ? ` · prazo ${new Date(c.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${c.entrega ? " " + c.entrega : ""}` : ""}${g.trava ? ` · área ${g.trava}` : ""}</div>
  <div class="di-rres"><div><b>${g.disp ? "R$ " + nf(g.disp, 2) : "—"}</b><span>disponível</span></div><div><b>R$ ${nf(tot, 2)}</b><span>indicado</span></div><div><b>${g.disp ? "R$ " + nf(g.disp - tot, 2) : "—"}</b><span>saldo</span></div><div><b>${it.length}</b><span>emendas${g.max ? " (até " + g.max + ")" : ""}</span></div></div>
  ${g.min ? it.filter((x) => +x.valor && +x.valor < g.min).map((x) => `<div class="di-al">${esc(x.municipio || "Item")}: abaixo do mínimo de ${fm(g.min)}</div>`).join("") : ""}${g.disp && tot > g.disp ? `<div class="di-al">Passou do disponível em R$ ${nf(tot - g.disp, 2)}</div>` : ""}
  <div class="di-linha di-hdr"><span class="di-pos">#</span><span class="di-cand">Município</span><span class="di-obj">Objeto · beneficiário</span><span class="di-votos">Valor R$</span></div>
  ${it.map(lin).join("")}
  <div class="di-tot"><span>Total</span><b>R$ ${nf(tot, 2)}</b></div>
  <div class="di-rod">Documento de trabalho do gabinete. A entrega oficial segue a planilha modelo do setor de Orçamento${c.entrega ? " " + esc(c.entrega) : ""}.</div>
  <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dt} ${hr}</span></div></div><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
  const w = window.open("", "_blank"); if (!w) { alert("Libere as janelas pop-up para gerar o documento."); return; } w.document.write(html); w.document.close();
}
async function xlsxInd(T) {
  const L = T.L, g = regrasInd(T), it = L ? AD.itens.filter((x) => x.lista_id === L.id && cheia(x)) : [], tot = it.reduce((s, x) => s + (+x.valor || 0), 0), c = T.cota || {};
  if (!window.ExcelJS) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); });
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet("Emendas", { views: [{ showGridLines: false }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const cols = ["Emenda", "Objeto", "Subação deduzida", "Valor", "Modalidade", "Município", "Órgão", "Unidade orçamentária", "CNPJ", "Razão Social"];
  ws.columns = [8, 52, 14, 16, 22, 22, 10, 14, 20, 34].map((w) => ({ width: w }));
  const cinza = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF0F2" } }, borda = { bottom: { style: "thin", color: { argb: "FFDEE2E5" } } }, num = '#,##0.00';
  ws.mergeCells("A1:J1"); Object.assign(ws.getCell("A1"), { value: (c.doc ? "Emendas · " : "") + T.nome + " · " + IND.ano }); ws.getCell("A1").font = { name: "Calibri", size: 15, bold: true };
  ws.mergeCells("A2:J2"); ws.getCell("A2").value = [c.base || (L && L.origem) || "", c.prazo ? "prazo " + new Date(c.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) + (c.entrega ? " " + c.entrega : "") : ""].filter(Boolean).join(" · "); ws.getCell("A2").font = { size: 10, color: { argb: "FF6E767D" } };
  [["Gabinete", "GAB DEP " + norm(PARL.u || "").toUpperCase()], ["Valor disponível", g.disp || ""], ["Indicado", tot], ["Saldo", g.disp ? g.disp - tot : ""]].forEach(([k, v], i) => { const r = ws.getRow(4 + i); r.getCell(1).value = k; r.getCell(1).font = { size: 9, bold: true, color: { argb: "FF6E767D" } }; ws.mergeCells(4 + i, 1, 4 + i, 2); r.getCell(3).value = v; r.getCell(3).font = { bold: true }; if (typeof v === "number") r.getCell(3).numFmt = num; ws.mergeCells(4 + i, 3, 4 + i, 4); });
  const h = ws.getRow(9); h.values = cols; h.height = 22; h.eachCell((cl) => { cl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D2226" } }; cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", wrapText: true }; });
  it.forEach((x, k) => { const a = AREAS.find((q) => q[1] === (x.area || g.trava)) || [], cv = x.modalidade === "Convênio", r = ws.getRow(10 + k);
    r.values = [k + 1, frase(x.objeto || ""), a[0] ? +a[0] : "", +x.valor || 0, x.modalidade || "", x.municipio || "", a[2] || "", a[3] || "", cv ? x.cnpj || "" : "", cv ? x.razao_social || x.beneficiario || "" : ""];
    r.getCell(4).numFmt = num; r.eachCell({ includeEmpty: true }, (cl, n) => { cl.border = borda; cl.alignment = { vertical: "top", wrapText: n === 2 || n === 10 }; if (k % 2) cl.fill = cinza; }); });
  const t = ws.getRow(10 + it.length); t.getCell(1).value = "TOTAL"; t.getCell(4).value = tot; t.getCell(4).numFmt = num; t.font = { bold: true }; t.eachCell({ includeEmpty: true }, (cl) => { cl.border = { top: { style: "medium", color: { argb: "FF1D2226" } } }; });
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = `${(L ? L.apelido || "lista" : T.nome).replace(/[^\w-]+/g, "_")}-${norm(PARL.u || "").replace(/ /g, "_")}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// ---------- detalhamento à direita ----------
function detInd() {
  const id = IND.det, d = $("#indDet"); if (!d) return; if (!id) { d.classList.remove("on"); return; }
  if (id.startsWith("m:")) { const r = MEU.find((x) => "m:" + mk(x) === id); if (!r) return; d.innerHTML = `<button class="ix" data-ixd>×</button>${detalheMeu(r)}`; ligarMeuDet(d.querySelector(".dm2") || d, r); }
  else { const x = AD.itens.find((y) => "a:" + y.id === id); if (!x) return; const L = AD.listas.find((l) => l.id === x.lista_id), T = etiquetas(IND.ano).find((t) => t.k === IND.tag) || {}, g = T.k ? regrasInd(T) : { areas: AREAS.map((a) => a[1]), mods: MODS };
    // detalhamento direto no painel: cada campo grava ao sair dele, e a linha da planilha acompanha (sem botão Editar)
    const F = (k, rot, html, w) => `<label class="tl2 fc2${w ? " w" + w : ""}"><span class="tk">${ic(k)}${rot}</span>${html}</label>`, I = (f, v, ph = "", l = "") => `<input data-d="${f}" value="${esc(v ?? "")}" placeholder="${esc(ph)}"${l ? ` list="${l}"` : ""}>`;
    const S2 = (f, ops, v) => `<select data-d="${f}"><option value="">—</option>${ops.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}${v && !ops.includes(v) ? `<option selected>${esc(v)}</option>` : ""}</select>`, t = tipoDe(x);
    d.innerHTML = `<button class="ix" data-ixd>×</button><div class="dm2 fm2"><div class="ttl"><span class="mut">${esc(L ? L.apelido || L.origem : "Avulso")}</span><h3>${esc(x.municipio || "—")}</h3><div class="mut">${esc(x.status || "Em análise")} · ${rc(+x.valor || 0)}</div></div>
      <div class="fgt">Indicação</div><div class="bnt">
      ${F("doc", "Objeto", `<textarea data-d="objeto" rows="3">${esc(x.objeto || "")}</textarea>`, 4)}
      ${F("selo", "Instrumento", S2("modalidade", g.mods, x.modalidade), 2)}${g.trava ? `<div class="tl2 w2"><span class="tk">${ic("lei")}Área</span><span class="tv">${esc(g.trava)}<small>travada pela cota</small></span></div>` : F("lei", "Área", S2("area", g.areas, x.area), 2)}
      ${F("moeda", "Natureza", S2("natureza", ["Investimento", "Custeio"], x.natureza), 2)}${F("ok", "Status", S2("status", STATUS, x.status || "Em análise"), 2)}
      ${t === "ent" ? F("hash", "CNPJ", I("cnpj", x.cnpj, "00.000.000/0000-00"), 2) + F("pred", "Razão social", I("razao_social", x.razao_social || x.beneficiario), 2) : F("pred", "Beneficiário", I("beneficiario", x.beneficiario || (t ? benefAuto(t, x, g) : "")), 4)}</div>
      <div class="fgt">Gabinete</div><div class="bnt">
      ${F("pessoa", "Líder", I("lideranca", x.lideranca, "Escolha ou digite", "indPes"), 2)}${F("pessoa", "Contato", I("contato", x.contato, "Telefone ou e-mail"), 2)}
      ${F("band", "Prioridade", S2("prioridade", PRIOR, x.prioridade), 2)}${F("lei", "Lei / PL", I("pl", x.pl, "PL nº 0633/2026"), 2)}
      ${F("doc", "Justificativa", `<textarea data-d="justificativa" rows="2" placeholder="Por que esta indicação">${esc(x.justificativa || "")}</textarea>`, 4)}
      ${F("doc", "Observação", `<textarea data-d="observacao" rows="2">${esc(x.observacao || "")}</textarea>`, 4)}</div>
      <datalist id="indPes">${pessoas().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><div class="isv mut" data-dmsg></div></div>`;
    const msg = d.querySelector("[data-dmsg]");
    d.querySelectorAll("[data-d]").forEach((el) => { const ini = el.value; el.onchange = async () => { if (el.value === ini) return; const o = { [el.dataset.d]: el.value.trim() || null }; if (o.razao_social !== undefined) o.beneficiario = o.razao_social;
      msg.textContent = "Salvando…"; const tr = document.querySelector(`#indPg tr.iw[data-iw="${x.id}"]`);
      try { if (tr && T.k) await salvarLinha(T, tr, o); else await gravar("gab_itens", { id: x.id, ...o }); msg.textContent = "Salvo"; setTimeout(() => { msg.textContent = ""; }, 1500); } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); } }; }); }
  d.classList.add("on"); d.querySelector("[data-ixd]").onclick = () => { IND.det = null; desenharInd(); };
}
// ---------- página ----------
function desenharInd() {
  let p = $("#indPg"); if (!p) { p = document.createElement("div"); p.id = "indPg"; document.body.appendChild(p); }
  const A = anosInd(); if (!IND.ano || !A.includes(IND.ano)) IND.ano = A.includes(anoAtual()) ? anoAtual() : A[0];
  const TS = etiquetas(IND.ano); let T = TS.find((t) => t.k === IND.tag); if (!T) { T = TS.find((t) => t.cota && t.cota.prazo && new Date(t.cota.prazo) > new Date()) || TS[0]; IND.tag = T ? T.k : null; }
  p.innerHTML = `<div class="ipg"><button class="ivolta" data-ivolta>‹ Controle de Recursos</button>
    <div class="ihd"><h2>Indicação de recursos</h2><span>${esc([PARL.u, PARL.p].filter(Boolean).join(" · "))}</span></div>
    <div class="ianos">${A.map((a) => `<button class="${a === IND.ano ? "on" : ""}" data-iano="${a}">${a}</button>`).join("")}</div>
    <div class="icapa">${capaInd(T)}</div>
    <div class="itags">${TS.map((t) => `<button class="${t.cota ? "o " : ""}${t === T ? "on" : ""}" data-itag="${esc(t.k)}">${esc(t.nome)}${t.cota ? `<small>${t.L ? AD.itens.filter((x) => x.lista_id === t.L.id && cheia(x)).length : 0}/${t.cota.max || "—"}</small>` : ""}</button>`).join("")}<button class="nw" data-inlista>+ nova lista</button></div>
    <div class="isheet">${planInd(T)}</div></div><div id="indDet"></div>`;
  contador(); detInd();
  p.querySelector("[data-ivolta]").onclick = fecharInd;
  p.querySelectorAll("[data-iano]").forEach((b) => b.onclick = () => { IND.ano = +b.dataset.iano; IND.tag = null; IND.det = null; desenharInd(); });
  p.querySelectorAll("[data-itag]").forEach((b) => b.onclick = () => { IND.tag = b.dataset.itag; IND.det = null; desenharInd(); });
  p.querySelector("[data-inlista]").onclick = () => formLista();
  p.querySelectorAll("[data-ir]").forEach((r) => r.onclick = () => { IND.det = IND.det === r.dataset.ir ? null : r.dataset.ir; desenharInd(); });
  if (T && T.k !== "plan") ligarPlan(p, T);
  const rg = p.querySelector("[data-ireg]"); if (rg) rg.onclick = () => formLista(T.L);
  const dc = p.querySelector("[data-idoc]"); if (dc) dc.onclick = () => documentoInd(T);
  const xl = p.querySelector("[data-ixls]"); if (xl) xl.onclick = () => xlsxInd(T);
}
function abrirInd() {
  IND.aberto = true; desenharInd(); const p = $("#indPg"); document.body.classList.add("ind-on");
  requestAnimationFrame(() => p.classList.add("on")); clearInterval(IND.tick); IND.tick = setInterval(contador, 1000);
}
function fecharInd() { IND.aberto = false; const p = $("#indPg"); if (p) p.classList.remove("on"); document.body.classList.remove("ind-on"); clearInterval(IND.tick); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && IND.aberto && $("#adModal")?.hidden !== false) { IND.det ? (IND.det = null, desenharInd()) : fecharInd(); } });
// quando o Controle redesenha (salvou item, lista, anotação), a página aberta acompanha
(() => { const d0 = desenhar; desenhar = function () { d0.apply(this, arguments); if (IND.aberto) desenharInd(); };
  const m0 = mtab; mtab = function () { m0.apply(this, arguments); if (IND.aberto) detInd(); }; })();
