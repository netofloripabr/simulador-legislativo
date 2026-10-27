// Gabinete · página de Indicação de recursos (27/10/2026). O "+" do Controle desliza para uma página à direita, no padrão
// claro do item: capa com os números do ano (ou da cota fixa, com contador regressivo), anos no topo, etiquetas por ano
// (planilha do gabinete, listas criadas, cotas fixas do administrador em laranja, "+ nova lista") e a planilha da etiqueta.
// Clicar numa linha abre o detalhamento à direita. Tudo grava nas mesmas tabelas do Controle (gab_itens / gab_listas).
// Usa os globais de gabinete.js, gabinete-adicionar.js e gabinete-cotas.js.

const IND = { aberto: false, ano: null, tag: null, det: null, tick: null };
const anoAtual = () => new Date().getFullYear();
// cotas fixas do administrador (COTAS_LEGAIS) viram etiquetas laranja; a lista do gabinete ligada a ela é criada no 1º item
const cotaNome = { EX: "Excesso · Saúde", "0,55": "Adicional 0,55%" };
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
    const c = T.cota, it = T.L ? AD.itens.filter((x) => x.lista_id === T.L.id) : [], tot = it.reduce((s, x) => s + (+x.valor || 0), 0), livre = c.disp - tot;
    return `<div class="t"><span class="tk">Disponível</span><span class="iv">R$ ${nf(c.disp, 2)}<small>${esc(c.base || "")}</small></span></div>
      <div class="t"><span class="tk">Livre</span><span class="iv"${livre < 0 ? ' style="color:#C0392B"' : ""}>${rc(livre)}<small>${it.length} de ${c.max || "—"} emendas</small></span><div class="ibar"><i style="width:${Math.min(100, tot / c.disp * 100)}%"></i></div></div>
      <div class="t w2"><span class="tk">${c.prazo ? `Fecha ${new Date(c.prazo).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${c.prazo.slice(11, 16)}` : "Sem prazo"}${c.entrega ? " · " + esc(c.entrega) : ""}</span><div class="icd" data-prazo="${esc(c.prazo || "")}"></div></div>`;
  }
  const a = IND.ano, sv = S.cesc; S.cesc = "imp"; const I = itensCotas().filter((x) => x.ano === a); S.cesc = sv;
  const ind = I.reduce((s, x) => s + x.v, 0), pg = I.reduce((s, x) => s + x.pago, 0), q = (QUOTA[a] || 0) + Object.values(COTAS_LEGAIS[a] || {}).reduce((s, c) => s + (c.disp || 0), 0);
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
  return { areas, mods, min: c.min || r.min || null, max: c.max || r.max || null, disp: c.disp || r.disp || null, trava: areas.length === 1 ? areas[0] : null };
}
// objetos de referência: histórico das emendas (planilha + indicações), sem o nome do município, do mais ao menos usado
function objetosRef(q) {
  const C = {}, tira = (t) => frase(String(t || "").replace(/[,;]?\s*(n[oa]s?|d[oa]s?|em|para)\s+(munic[ií]pios?|cidades?)\s+d[eoa]s?\s+.*$/i, "").replace(/\s+/g, " ").trim());
  [...MEU.map((r) => r.objeto), ...AD.itens.map((x) => x.objeto)].forEach((o) => { const t = tira(o); if (t.length > 6) C[t] = (C[t] || 0) + 1; });
  const n = norm(q || "").split(/\s+/).filter(Boolean);
  return Object.entries(C).filter(([t]) => n.every((w) => norm(t).includes(w))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 40);
}
function planInd(T) {
  if (!T) return `<div class="iinf">Nenhuma lista neste ano. Use “+ nova lista” para começar.</div>`;
  const R = linhasInd(T), c = T.cota, tot = R.reduce((s, x) => s + x.v, 0), edita = T.k !== "plan", g = regrasInd(T);
  const inf = c ? `<b>Cota fixa do administrador</b> · ${esc(c.doc || c.base || "")}${c.min ? ` · mín. ${fm(c.min)}` : ""}`
    : T.k === "plan" ? "Planilha do gabinete · itens do exercício " + IND.ano : T.k === "avulsos" ? "Indicações fora de lista" : `Lista do gabinete · ${esc(T.L.origem || "")}`;
  const outras = !c && edita ? (() => { const sv = S.cesc; S.cesc = "imp"; const ind = itensCotas().filter((x) => x.ano === IND.ano).reduce((s, x) => s + x.v, 0); S.cesc = sv; const q = QUOTA[IND.ano]; return q ? `<span class="isal">Impositivas ${IND.ano}: saldo <b>${rc(Math.max(0, q - ind))}</b></span>` : ""; })() : "";
  const acs = edita && (T.L || T.cota) ? `<span class="iacs">${T.L ? `<button data-ireg>Regras</button>` : ""}<button data-idoc>Documento</button><button data-ixls>Planilha do Orçamento</button></span>` : "";
  const trava = edita && g.trava ? `<span class="itrava">Área travada: <b>${esc(g.trava)}</b>${(AREAS.find((a) => a[1] === g.trava) || [])[0] ? ` · subação ${AREAS.find((a) => a[1] === g.trava)[0]}` : ""}</span>` : "";
  if (!edita) return `<div class="iinf">${inf}</div><div class="itw"><table class="itb"><thead><tr><th></th><th>Município</th><th>Objeto</th><th>Instr.</th><th class="r">Valor</th><th class="hm">Status</th><th></th></tr></thead><tbody>
    ${R.map((x, i) => `<tr class="ir${IND.det === x.id ? " on" : ""}" data-ir="${esc(x.id)}"><td class="n">${i + 1}</td><td>${esc(x.mun || "—")}</td><td class="ob">${esc(frase(x.obj || ""))}</td><td>${esc(x.ins)}</td><td class="r">${ni(Math.round(x.v))}</td><td class="hm st">${esc(x.st)}</td><td class="ar">›</td></tr>`).join("")}
    <tr class="itt"><td></td><td colspan="3">Total · ${R.length} itens</td><td class="r">${ni(Math.round(tot))}</td><td colspan="2" class="hm"></td></tr></tbody></table></div>`;
  const it = R.map((x) => AD.itens.find((y) => "a:" + y.id === x.id)), vaz = g.max ? Math.max(0, g.max - it.length) : 1;
  const linha = (x, i) => { const v = x ? +x.valor || 0 : 0, baixo = x && g.min && v && v < g.min;
    return `<tr class="iw${x && IND.det === "a:" + x.id ? " on" : ""}" data-iw="${x ? x.id : ""}"><td class="n">${i + 1}</td>
      <td><input data-c="municipio" list="indMun" value="${esc(x ? x.municipio || "" : "")}" placeholder="${x ? "" : "indicar"}"></td>
      <td class="iob"><div><textarea data-c="objeto" rows="1" placeholder="Objeto">${esc(x ? x.objeto || "" : "")}</textarea><button class="imais" data-iobj title="Objetos de referência">+</button></div></td>
      ${g.trava ? "" : `<td><select data-c="area"><option value=""></option>${g.areas.map((a) => `<option${x && x.area === a ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></td>`}
      <td><select data-c="modalidade"><option value=""></option>${g.mods.map((m) => `<option${x && x.modalidade === m ? " selected" : ""}>${esc(m)}</option>`).join("")}</select></td>
      <td class="r"><input data-c="valor" inputmode="decimal" class="${baixo ? "ierr" : ""}" value="${x && x.valor ? ni(Math.round(v)) : ""}" placeholder="${g.min ? "mín. " + ni(g.min) : "0"}" title="${baixo ? "Abaixo do mínimo de " + fm(g.min) : ""}"></td>
      <td><input data-c="beneficiario" value="${esc(x ? x.beneficiario || x.razao_social || "" : "")}" placeholder="${x && x.modalidade === "Convênio" ? "Entidade (CNPJ no detalhe)" : "Beneficiário"}"></td>
      <td class="iac">${x ? `<button data-idet title="Detalhar">↗</button><button data-ilimpa title="Limpar linha">×</button>` : ""}</td></tr>`; };
  return `<div class="iinf">${inf}${trava}${outras}${acs}</div><datalist id="indMun">${BASE.mun.map((m) => `<option value="${esc(m.n)}">`).join("")}</datalist>
    <div class="itw"><table class="itb ied"><thead><tr><th></th><th>Município</th><th>Objeto</th>${g.trava ? "" : "<th>Área</th>"}<th>Instrumento</th><th class="r">Valor</th><th>Beneficiário</th><th></th></tr></thead><tbody>
    ${it.map((x, i) => linha(x, i)).join("")}${Array.from({ length: vaz }, (_, i) => linha(null, it.length + i)).join("")}
    ${!g.max ? "" : ""}<tr class="itt"><td></td><td colspan="${g.trava ? 3 : 4}">Total · ${it.length} ${it.length === 1 ? "item" : "itens"}${g.max ? ` de ${g.max}` : ""}</td><td class="r">${ni(Math.round(tot))}</td><td colspan="2">${g.disp ? `<span class="${tot > g.disp ? "ierr" : "mut"}">${tot > g.disp ? "passou " + rc(tot - g.disp) : "saldo " + rc(g.disp - tot)}</span>` : ""}</td></tr></tbody></table></div>`;
}
// ---------- edição direto na planilha ----------
const numBR = (s) => +String(s || "").replace(/[^\d,]/g, "").replace(",", ".") || 0;
async function garantirLista(T) {
  if (T.L || T.k === "avulsos") return T.L || null; const c = T.cota;
  if (!c) return null; const g = regrasInd(T);
  T.L = await gravar("gab_listas", { origem: `${COTA_T[c.t][0]} ${IND.ano}${c.areas ? " · " + c.areas.join(", ") : ""}`, apelido: `${c.t === "EX" ? "Excesso" : COTA_T[c.t][0]} ${String(IND.ano).slice(2)}`, modelo: "cota:" + c.t, regras: { disp: g.disp, min: g.min, max: g.max, prazo: c.prazo || "", areas: g.areas } });
  return T.L;
}
async function salvarCel(T, tr, campo, val) {
  // linha nova ainda gravando: espera e passa a atualizar o item criado (evita duas linhas)
  if (!tr.dataset.iw && tr._cria) { await tr._cria; }
  const g = regrasInd(T), id = tr.dataset.iw || tr._novo; let x = id ? AD.itens.find((y) => y.id === id) : null;
  if (campo === "valor") val = numBR(val) || null; else val = String(val || "").trim() || null;
  if (!x && !val) return;
  try { const L = await garantirLista(T);
    const reg = x ? { id: x.id, [campo]: val } : { lista_id: L ? L.id : null, tipo: T.cota ? "Emenda impositiva" : null, status: "Em análise", ...(g.trava ? { area: g.trava } : {}), [campo]: val };
    const pr = gravar("gab_itens", reg); if (!x) tr._cria = pr; const nx = await pr; tr._novo = nx.id; IND.foco = { id: nx.id, c: campo }; desenharInd();
  } catch (er) { alert("Não foi possível salvar: " + (er.message || er)); }
}
function ligarPlan(p, T) {
  p.querySelectorAll("tr.iw").forEach((tr) => {
    tr.querySelectorAll("[data-c]").forEach((el) => { const ini = el.value;
      el.onchange = () => { if (el.value !== ini) salvarCel(T, tr, el.dataset.c, el.value); };
      if (el.tagName === "TEXTAREA") { const aj = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }; el.oninput = aj; aj(); el.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); } }; } });
    const d = tr.querySelector("[data-idet]"); if (d) d.onclick = () => { IND.det = "a:" + tr.dataset.iw; desenharInd(); };
    const l = tr.querySelector("[data-ilimpa]"); if (l) l.onclick = async () => { if (l.dataset.ok !== "1") { l.dataset.ok = "1"; l.textContent = "limpar?"; l.classList.add("ok"); setTimeout(() => { l.dataset.ok = ""; l.textContent = "×"; l.classList.remove("ok"); }, 3000); return; }
      try { await apagar("gab_itens", tr.dataset.iw); if (IND.det === "a:" + tr.dataset.iw) IND.det = null; desenharInd(); } catch (er) { alert(er.message || er); } };
    tr.querySelector("[data-iobj]").onclick = (e) => { e.stopPropagation(); popObjeto(tr, T); };
  });
  if (IND.foco) { const tr = p.querySelector(`tr.iw[data-iw="${IND.foco.id}"]`), ord = ["municipio", "objeto", "area", "modalidade", "valor", "beneficiario"];
    if (tr) { const prox = ord.slice(ord.indexOf(IND.foco.c) + 1).map((c) => tr.querySelector(`[data-c="${c}"]`)).find((el) => el && !el.value); if (prox) prox.focus(); } IND.foco = null; }
}
function popObjeto(tr, T) {
  document.querySelectorAll(".ipop").forEach((x) => x.remove());
  const b = tr.querySelector("[data-iobj]"), r = b.getBoundingClientRect(), pop = document.createElement("div"); pop.className = "ipop";
  const g = regrasInd(T); pop.innerHTML = `<input placeholder="Pesquisar objetos já usados (ex.: saúde)" value="${esc(g.trava ? g.trava.toLowerCase() : "")}"><div class="ipl"></div>`;
  $("#indPg").appendChild(pop); pop.style.top = Math.min(r.bottom + 6, innerHeight - 340) + "px"; pop.style.left = Math.max(12, Math.min(r.left - 300, innerWidth - 440)) + "px";
  const q = pop.querySelector("input"), l = pop.querySelector(".ipl");
  const lista = () => { const O = objetosRef(q.value); l.innerHTML = O.length ? O.map(([t, n]) => `<button data-o="${esc(t)}"><span>${esc(t)}</span><small>${n}×</small></button>`).join("") : `<div class="mut" style="padding:10px">Nenhum objeto com esse termo.</div>`;
    l.querySelectorAll("[data-o]").forEach((o) => o.onclick = () => { pop.remove(); const ta = tr.querySelector('[data-c="objeto"]'); ta.value = o.dataset.o; salvarCel(T, tr, "objeto", o.dataset.o); }); };
  q.oninput = lista; lista(); q.focus(); q.select();
  setTimeout(() => document.addEventListener("click", function f(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener("click", f); } }), 0);
}
// ---------- saída: documento no padrão do palpite e planilha .xlsx no modelo do Orçamento ----------
function documentoInd(T) {
  const L = T.L, g = regrasInd(T), it = L ? AD.itens.filter((x) => x.lista_id === L.id) : [], tot = it.reduce((s, x) => s + (+x.valor || 0), 0), c = T.cota || {};
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
  <div class="di-rres"><div><b>${g.disp ? "R$ " + nf(g.disp, 2) : "—"}</b><span>disponível</span></div><div><b>R$ ${nf(tot, 2)}</b><span>indicado</span></div><div><b>${g.disp ? "R$ " + nf(g.disp - tot, 2) : "—"}</b><span>saldo</span></div><div><b>${it.length}${g.max ? " de " + g.max : ""}</b><span>emendas</span></div></div>
  ${g.min ? it.filter((x) => (+x.valor || 0) < g.min).map((x) => `<div class="di-al">${esc(x.municipio || "Item")}: abaixo do mínimo de ${fm(g.min)}</div>`).join("") : ""}${g.disp && tot > g.disp ? `<div class="di-al">Passou do disponível em R$ ${nf(tot - g.disp, 2)}</div>` : ""}
  <div class="di-linha di-hdr"><span class="di-pos">#</span><span class="di-cand">Município</span><span class="di-obj">Objeto · beneficiário</span><span class="di-votos">Valor R$</span></div>
  ${it.map(lin).join("")}${Array.from({ length: g.max ? Math.max(0, g.max - it.length) : 0 }, (_, i) => lin(null, it.length + i)).join("")}
  <div class="di-tot"><span>Total</span><b>R$ ${nf(tot, 2)}</b></div>
  <div class="di-rod">Documento de trabalho do gabinete. A entrega oficial segue a planilha modelo do setor de Orçamento${c.entrega ? " " + esc(c.entrega) : ""}.</div>
  <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dt} ${hr}</span></div></div><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
  const w = window.open("", "_blank"); if (!w) { alert("Libere as janelas pop-up para gerar o documento."); return; } w.document.write(html); w.document.close();
}
async function xlsxInd(T) {
  const L = T.L, g = regrasInd(T), it = L ? AD.itens.filter((x) => x.lista_id === L.id) : [], tot = it.reduce((s, x) => s + (+x.valor || 0), 0), c = T.cota || {};
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
  else { const x = AD.itens.find((y) => "a:" + y.id === id); if (!x) return; const L = AD.listas.find((l) => l.id === x.lista_id);
    const tl = (k, v, w) => `<div class="tl2${w ? " w4" : ""}"><span class="tk">${k}</span><span class="tv">${v || '<span class="mut">—</span>'}</span></div>`;
    d.innerHTML = `<button class="ix" data-ixd>×</button><div class="dm2"><div class="ttl"><span class="mut">${esc(L ? L.apelido || L.origem : "Avulso")}</span><h3>${esc(x.municipio || "—")}</h3><div class="mut">${esc(x.status || "Em análise")} · ${rc(+x.valor || 0)}</div></div>
      <div class="bnt">${tl("Objeto", esc(frase(x.objeto || "")), 1)}${tl("Instrumento", esc(x.modalidade || ""))}${tl("Área", esc(x.area || ""))}${tl("Líder", esc(x.lideranca || ""))}${tl("Beneficiário", esc([x.beneficiario || x.razao_social, x.cnpj].filter(Boolean).join(" · ")))}${tl("Justificativa", esc(x.justificativa || ""), 1)}${tl("Observação", esc(x.observacao || ""), 1)}</div>
      <div class="iacs" style="margin-top:14px"><button data-iedit>Editar</button></div></div>`;
    d.querySelector("[data-iedit]").onclick = () => formItem(x); }
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
    <div class="itags">${TS.map((t) => `<button class="${t.cota ? "o " : ""}${t === T ? "on" : ""}" data-itag="${esc(t.k)}">${esc(t.nome)}${t.cota ? `<small>${t.L ? AD.itens.filter((x) => x.lista_id === t.L.id).length : 0}/${t.cota.max || "—"}</small>` : ""}</button>`).join("")}<button class="nw" data-inlista>+ nova lista</button></div>
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
