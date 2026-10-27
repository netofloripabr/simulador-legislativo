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
function planInd(T) {
  if (!T) return `<div class="iinf">Nenhuma lista neste ano. Use “+ nova lista” para começar.</div>`;
  const R = linhasInd(T), c = T.cota, tot = R.reduce((s, x) => s + x.v, 0), vaz = c ? Math.max(0, (c.max || 0) - R.length) : 0, edita = T.k !== "plan";
  const inf = c ? `<b>Cota fixa do administrador</b> · ${esc(c.doc || c.base || "")}${c.min ? ` · mín. ${fm(c.min)}` : ""}${c.areas ? ` · só ${esc(c.areas.join(", "))}` : ""}`
    : T.k === "plan" ? "Planilha do gabinete · itens do exercício " + IND.ano : T.k === "avulsos" ? "Indicações fora de lista" : `Lista do gabinete · ${esc(T.L.origem || "")}`;
  return `<div class="iinf">${inf}${T.L ? `<span class="iacs"><button data-ireg>Regras</button><button data-ixls>Planilha do Orçamento</button></span>` : ""}</div>
    <div class="itw"><table class="itb"><thead><tr><th></th><th>Município</th><th>Objeto</th><th>Instr.</th><th class="r">Valor</th><th class="hm">Status</th><th></th></tr></thead><tbody>
    ${R.map((x, i) => `<tr class="ir${IND.det === x.id ? " on" : ""}" data-ir="${esc(x.id)}"><td class="n">${i + 1}</td><td>${esc(x.mun || "—")}</td><td class="ob">${esc(frase(x.obj || ""))}</td><td>${esc(x.ins)}</td><td class="r">${ni(Math.round(x.v))}</td><td class="hm st">${esc(x.st)}</td><td class="ar">›</td></tr>`).join("")}
    ${Array.from({ length: vaz }, (_, i) => `<tr class="ie" data-inovo><td class="n">${R.length + i + 1}</td><td colspan="6">indicar</td></tr>`).join("")}
    ${edita && !vaz ? `<tr class="ie" data-inovo><td class="n"></td><td colspan="6">+ nova linha</td></tr>` : ""}
    <tr class="itt"><td></td><td colspan="3">Total · ${R.length} ${R.length === 1 ? "item" : "itens"}</td><td class="r">${ni(Math.round(tot))}</td><td colspan="2" class="hm"></td></tr></tbody></table></div>`;
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
  p.querySelectorAll("[data-inovo]").forEach((r) => r.onclick = () => novoInd(T));
  const rg = p.querySelector("[data-ireg]"); if (rg) rg.onclick = () => formLista(T.L);
  const xl = p.querySelector("[data-ixls]"); if (xl) xl.onclick = () => exportarOrcamento(T.L);
}
// nova linha: na cota fixa, cria a lista do gabinete ligada a ela na primeira indicação
async function novoInd(T) {
  if (T.k === "plan") return formItem({});
  if (T.cota && !T.L) { const c = T.cota;
    try { T.L = await gravar("gab_listas", { origem: `${COTA_T[c.t][0]} ${IND.ano}${c.areas ? " · " + c.areas.join(", ") : ""}`, apelido: `Excesso ${String(IND.ano).slice(2)}`, modelo: "cota:" + c.t, regras: { disp: c.disp, min: c.min || null, max: c.max || null, prazo: c.prazo || "", areas: c.areas || AREAS.map((a) => a[1]) } }); }
    catch (er) { alert("Não foi possível criar a lista: " + (er.message || er)); return; } }
  formItem({ lista_id: T.L ? T.L.id : null, area: T.cota && T.cota.areas && T.cota.areas.length === 1 ? T.cota.areas[0] : undefined, tipo: T.cota ? "Emenda impositiva" : undefined });
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
