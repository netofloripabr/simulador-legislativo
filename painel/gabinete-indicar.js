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
      <div class="t"><span class="tk">Livre</span><span class="iv"${livre < 0 ? ' style="color:#C0392B"' : ""}>${rc(livre)}<small>${it.length} de ${c.max || "—"} emendas</small></span>${c.saude ? "" : `<div class="ibar"><i style="width:${Math.min(100, tot / c.disp * 100)}%"></i></div>`}</div>
      <div class="t w2"><span class="tk">${c.prazo ? `Fecha ${new Date(c.prazo).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${c.prazo.slice(11, 16)}` : "Sem prazo"}${c.entrega ? " · " + esc(c.entrega) : ""}</span><div class="icd" data-prazo="${esc(c.prazo || "")}"></div></div>${c.saude ? barraSeg(c, it, tot) : ""}`;
  }
  const a = IND.ano, sv = S.cesc; S.cesc = "imp"; const I = itensCotas().filter((x) => x.ano === a); S.cesc = sv;
  const ind = I.reduce((s, x) => s + x.v, 0), pg = I.reduce((s, x) => s + x.pago, 0), q = (QUOTA[a] || 0) + Object.entries(COTAS_LEGAIS[a] || {}).filter(([t]) => t !== "AN").map(([, c]) => c).reduce((s, c) => s + (c.disp || 0), 0);
  return `<div class="t"><span class="tk">Cota legal ${a}</span><span class="iv">${q ? rc(q) : "—"}</span></div><div class="t"><span class="tk">Indicado</span><span class="iv">${rc(ind)}</span></div>
    <div class="t"><span class="tk">Pago</span><span class="iv">${rc(pg)}</span></div><div class="t"><span class="tk">Saldo a indicar</span><span class="iv">${q ? rc(Math.max(0, q - ind)) : "—"}</span>${q ? `<div class="ibar"><i style="width:${Math.min(100, ind / q * 100)}%"></i></div>` : ""}</div>`;
}
// barra única da cota (LOA): enche com Saúde, FUNDAM e demais áreas; marcadores no mínimo de Saúde (LDO art. 33) e na faixa do FUNDAM
function barraSeg(c, it, tot) {
  const soma = (f) => it.filter(f).reduce((s, x) => s + (+x.valor || 0), 0), sd = soma((x) => x.area === "Saúde"), fd = soma((x) => x.area === "FUNDAM"), ou = tot - sd - fd;
  const pc = (v) => Math.min(100, v / c.disp * 100), mS = c.disp * c.saude, mF = c.fundam ? c.disp * c.fundam : 0;
  const ok = (v, m) => v >= m - .005, lin = (cor, rot, v, m) => `<span><i style="background:${cor}"></i>${rot} <b>${rc(v)}</b>${m ? ` de ${rc(m)} ${ok(v, m) ? '<em class="ok">✓ atingido</em>' : `<em>faltam ${rc(m - v)}</em>`}` : ""}</span>`;
  return `<div class="t w4 iseg4"><div class="isbar"><i style="width:${pc(sd)}%;background:#1D2226"></i><i style="width:${pc(fd)}%;background:#6E767D"></i><i style="width:${pc(Math.max(0, ou))}%;background:#B3B9BE"></i>
    <b class="imk${ok(sd, mS) ? " ok" : ""}" style="left:${c.saude * 100}%"><span>Saúde ${c.saude * 100}%</span></b>${mF ? `<b class="imk b2${ok(fd, mF) ? " ok" : ""}" style="left:${Math.min(100, Math.max(pc(sd), c.saude * 100) + c.fundam * 100)}%" title="o FUNDAM começa onde termina a Saúde e precisa chegar a este marcador"><span>+ FUNDAM ${c.fundam * 100}%</span></b>` : ""}</div>
    <div class="islg">${lin("#1D2226", "Saúde", sd, mS)}${lin("#6E767D", "FUNDAM", fd, mF)}${lin("#B3B9BE", "Demais áreas", Math.max(0, ou), 0)}<span class="mut">${rc(tot)} de ${rc(c.disp)} · ${Math.round(tot / c.disp * 100)}%</span></div></div>`;
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
// ícones da página (traço fino, cor herdada)
const ICI = { mun: '<path d="M3 7h10v6.5H3zM5 2.5h6v2.6H5zM8 5.1V7M7 13.5v-2.5h2v2.5M4.8 9h1.4M9.8 9h1.4"/>', ent: '<path d="M2.5 7.5L8 3l5.5 4.5M4 6.3v7.2h8V6.3"/><path d="M8 11.6s-2-1.2-2-2.5a1 1 0 0 1 2-.4 1 1 0 0 1 2 .4c0 1.3-2 2.5-2 2.5z"/>', est: '<path d="M3.5 2.2v11.6M3.5 3h9.5M3.5 10h9.5"/><path d="M8.25 4.1l2.4 2.4-2.4 2.4-2.4-2.4z"/>',
  min: '<path d="M8 3v8M4.5 7.5L8 11l3.5-3.5M3.5 13.5h9"/>', sal: '<path d="M2.5 8h11M9.5 4.5L13 8l-3.5 3.5M2.5 3.5v9"/>', seta: '<path d="M4 6l4 4 4-4"/>', x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
  regras: '<path d="M3 4.5h10M3 8h10M3 11.5h10"/><circle cx="6" cy="4.5" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5" cy="11.5" r="1.3"/>', impr: '<path d="M4.5 6V2.5h7V6M4.5 11.5H3V6h10v5.5h-1.5M4.5 9.5h7v4h-7z"/>', plan: '<path d="M2.5 3h11v10h-11zM2.5 6.5h11M2.5 10h11M6.5 3v10"/>', sau: '<path d="M6.5 2.5h3v4h4v3h-4v4h-3v-4h-4v-3h4z"/>', edu: '<path d="M2.5 4.5l5.5-2 5.5 2-5.5 2zM4.5 5.5v4c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5v-4M13.5 4.5v4"/>', fun: '<path d="M2.5 13.5h11M3.5 13.5v-6h3v6M6.5 13.5V4.5h3v9M9.5 13.5v-4h3v4"/>', agr: '<path d="M8 13.5V7M8 7c0-2.5 2-4.5 5-4.5 0 3-2 4.5-5 4.5zM8 9c0-2-1.6-3.5-4.5-3.5C3.5 8 5 9 8 9z"/>', inf: '<path d="M5 13.5l2-11M11 13.5l-2-11M8 4v1.5M8 7.5v1.5M8 11v1.5"/>', seg: '<path d="M8 2.3l4.8 1.9v3.6c0 2.9-2.1 4.8-4.8 5.9-2.7-1.1-4.8-3-4.8-5.9V4.2z"/><path d="M8 5.6l.8 1.5 1.7.2-1.2 1.2.3 1.7L8 9.4l-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>', soc: '<circle cx="5.5" cy="5.5" r="2"/><circle cx="10.5" cy="5.5" r="2"/><path d="M2 12.5c.4-2 1.8-3 3.5-3s3.1 1 3.5 3M7.5 12.5c.4-2 1.5-3 3-3s2.8 1 3.2 3"/>', te: '<path d="M2.5 8h9M8.5 4.5L12 8l-3.5 3.5M13.5 3.5v9"/>', co: '<path d="M4.5 2.5h5l2 2v9h-7zM6.3 9.3l1.3 1.3 2.4-2.6"/>', ed: '<path d="M2.5 8h6M6.5 5.5L9 8l-2.5 2.5M10.5 3.5h3v9h-3"/>', doc2: '<path d="M4.5 2.5h5l2 2v9h-7zM6.5 8h3M6.5 10.5h2"/>', lixo: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5"/>' };
const ici = (k) => `<svg class="ici" viewBox="0 0 16 16" aria-hidden="true">${ICI[k]}</svg>`;
const SIG_I = { "Transferência Especial": "TE", "Convênio": "CO", "Execução Direta": "ED", "Convênio Simplificado": "CS", "Termo de Fomento": "TF", "Termo de Colaboração": "TC", "Acordo de Cooperação": "AC" };
// modalidades na linha: as três principais (TE, CO, ED) + a atual, se for outra; as demais ficam no detalhamento
const modsCurtas = (g, x) => { const P = ["Transferência Especial", "Convênio", "Execução Direta"].filter((m) => g.mods.includes(m)); return x && x.modalidade && !P.includes(x.modalidade) ? [...P, x.modalidade] : P; };
const MOD_I = { "Transferência Especial": "te", "Convênio": "co", "Execução Direta": "ed" };
const AREA_I = { "Saúde": "sau", "Educação": "edu", "FUNDAM": "fun", "Agricultura": "agr", "Infraestrutura e Mobilidade": "inf", "Segurança Pública": "seg", "Fundo Social": "soc" };
const BTIPO = [["mun", "Município", "Transferência Especial"], ["ent", "Entidade", "Convênio"], ["est", "Estado", "Execução Direta"]];
const tipoDe = (x) => x.benef_tipo || (x.modalidade === "Transferência Especial" ? "mun" : /Convênio|Termo|Acordo/.test(x.modalidade || "") ? "ent" : x.modalidade === "Execução Direta" ? "est" : "");
const benefAuto = (t, x, g) => { const a = AREAS.find((q) => q[1] === (x.area || g.trava)) || [];
  return t === "mun" ? `${a[1] === "Saúde" ? "Fundo Municipal de Saúde" : "Prefeitura Municipal"} de ${x.municipio || "…"}` : t === "est" ? `${a[1] === "Saúde" ? "Fundo Estadual de Saúde" : "Órgão estadual"}${a[3] ? " · UO " + a[3] : ""}` : ""; };
const moeda = (v) => (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function linhaInd(T, g, x, i, semExp) {
  const t = x ? tipoDe(x) : "", v = x ? +x.valor || 0 : 0;
  const ck = x ? [[x.municipio, "município"], [x.objeto, "objeto"], [t, "quem recebe"], [g.min ? v >= g.min : v > 0, g.min ? "valor ≥ " + rc(g.min) : "valor"], ...(t === "ent" ? [[String(x.cnpj || "").replace(/\D/g, "").length === 14, "CNPJ"], [x.razao_social || x.beneficiario, "razão social"]] : [])] : [];
  const quem = t === "ent" ? ""
    : t ? `<input class="iauto" value="${esc(x.beneficiario || benefAuto(t, x, g))}" data-c="beneficiario" title="Preenchido pelo tipo; pode editar">` : "";
  return `<tr class="iw${x && IND.det === "a:" + x.id ? " on" : ""}" data-iw="${x ? x.id : ""}"><td class="n">${i + 1}</td>
    <td class="itp"><div class="ilin"><div class="iseg" title="Ente">${BTIPO.map(([k, l]) => `<button data-bt="${k}" class="${t === k ? "on" : ""}" title="${l}" aria-label="${l}">${ici(k)}</button>`).join("")}</div>
      <button class="iqb" data-qm title="Modalidade: ${esc(x && x.modalidade || "escolher")}">${x && x.modalidade ? ici(MOD_I[x.modalidade] || "doc2") : '<span class="iq0">mod.</span>'}</button>${g.trava ? `<button class="iqb" data-qf title="Função ${esc(g.trava)} · definida pela cota">${ici(AREA_I[g.trava] || "plan")}</button>` : `<button class="iqb" data-qf title="Função: ${esc(x && x.area || "escolher")}">${x && x.area ? ici(AREA_I[x.area] || "plan") : '<span class="iq0">função</span>'}</button>`}</div></td>
    <td><input data-c="municipio" list="indMun" value="${esc(x ? x.municipio || "" : "")}" placeholder="${x ? "Município" : "indicar"}"></td>
    <td class="iob"><div class="iqm">${quem}</div><div><textarea data-c="objeto" rows="1" placeholder="Objeto">${esc(x ? x.objeto || "" : "")}</textarea><button class="imais" data-iobj title="Objetos de referência">+</button></div></td>
    <td class="r iv2"><input data-c="valor" inputmode="numeric" class="${x && g.min && v && v < g.min ? "ierr" : ""}" value="${v ? moeda(v) : ""}" placeholder="0,00"></td>
    <td class="iac">${x ? `<button data-iexp class="iseta${IND.det === "a:" + x.id ? " ab" : ""}" title="Detalhar">${ici("seta")}</button>` : ""}</td></tr>
    ${ck.length ? `<tr class="ick${IND.det === "a:" + x.id || IND.ativa === x.id ? " vis" : ""}" data-ick="${x.id}"><td></td><td colspan="${5}">${ck.map(([ok, l]) => `<span class="${ok ? "ok" : "no"}">${ok ? "✓" : "•"} ${l}</span>`).join("")}</td></tr>` : ""}
    ${x && !semExp && IND.det === "a:" + x.id ? `<tr class="iexp" data-iexpw="${x.id}"><td colspan="${6}">${detForm(x, T, g)}</td></tr>` : ""}`;
}
function rodapeInd(T, g, it) { it = it.filter(cheia); const tot = it.reduce((s, x) => s + (+x.valor || 0), 0);
  return `<td></td><td colspan="${3}">Total · ${it.length} ${it.length === 1 ? "item" : "itens"}${g.max ? ` de ${g.max}` : ""}</td><td class="r">${moeda(tot)}${g.disp ? `<small class="${tot > g.disp + .005 ? "ierr" : "mut"}">${tot > g.disp + .005 ? "passou " + moeda(tot - g.disp) : "saldo " + moeda(g.disp - tot)}</small>` : ""}</td><td></td>`; }
function planInd(T) {
  if (!T) return `<div class="iinf">Nenhuma lista neste ano. Use “+ nova lista” para começar.</div>`;
  const R = linhasInd(T), c = T.cota, tot = R.reduce((s, x) => s + x.v, 0), edita = T.k !== "plan", g = regrasInd(T);
  const inf = c ? `<b>Cota fixa do administrador</b> · ${esc(c.doc || c.base || "")}${c.min ? ` · mín. ${fm(c.min)}` : ""}${c.max ? ` · até ${c.max} emendas` : ""}${c.saude ? ` · Saúde no mínimo ${c.saude * 100}%` : ""}${c.abre && new Date(c.abre) > new Date() ? ` · abre em ${new Date(c.abre).toLocaleDateString("pt-BR")}` : ""}`
    : T.k === "plan" ? "Planilha do gabinete · itens do exercício " + IND.ano : T.k === "avulsos" ? "Indicações fora de lista" : `Lista do gabinete · ${esc(T.L.origem || "")}`;
  const outras = !c && edita ? (() => { const sv = S.cesc; S.cesc = "imp"; const ind = itensCotas().filter((x) => x.ano === IND.ano).reduce((s, x) => s + x.v, 0); S.cesc = sv; const q = QUOTA[IND.ano]; return q ? `<span class="isal">Impositivas ${IND.ano}: saldo <b>${rc(Math.max(0, q - ind))}</b></span>` : ""; })() : "";
  const acs = edita && (T.L || T.cota) ? `<span class="iacs">${T.L ? `<button data-ireg>${ici("regras")}Regras</button>` : ""}<button data-idoc>${ici("impr")}Documento</button><button data-ixls>${ici("plan")}Planilha de indicação</button></span>` : "";
  const trava = edita && g.trava ? `<span class="itrava">Área travada: <b>${esc(g.trava)}</b>${(AREAS.find((a) => a[1] === g.trava) || [])[0] ? ` · subação ${AREAS.find((a) => a[1] === g.trava)[0]}` : ""}</span>` : "";
  if (!edita) return `<div class="iinf">${inf}</div><div class="itw"><table class="itb"><thead><tr><th></th><th>Município</th><th>Objeto</th><th>Instr.</th><th class="r">Valor</th><th class="hm">Status</th><th></th></tr></thead><tbody>
    ${R.map((x, i) => `<tr class="ir${IND.det === x.id ? " on" : ""}" data-ir="${esc(x.id)}"><td class="n">${i + 1}</td><td>${esc(x.mun || "—")}</td><td class="ob">${esc(frase(x.obj || ""))}</td><td>${esc(x.ins)}</td><td class="r">${ni(Math.round(x.v))}</td><td class="hm st">${esc(x.st)}</td><td class="ar">›</td></tr>`).join("")}
    <tr class="itt"><td></td><td colspan="3">Total · ${R.length} itens</td><td class="r">${ni(Math.round(tot))}</td><td colspan="2" class="hm"></td></tr></tbody></table></div>`;
  const it = R.map((x) => AD.itens.find((y) => "a:" + y.id === x.id)), vaz = g.max ? Math.min(g.max > 10 ? 3 : g.max, Math.max(0, g.max - it.length)) : 1; // cota grande (LOA, 120): só 3 linhas em branco por vez
  return `<div class="iinf">${inf}${trava}${outras}${acs}</div><datalist id="indMun">${BASE.mun.map((m) => `<option value="${esc(m.n)}">`).join("")}</datalist>
    <div class="itw"><table class="itb ied"><thead><tr><th></th><th>Ente · modalidade · função</th><th>Município</th><th>Beneficiário · objeto</th><th class="r">Valor (R$)</th><th></th></tr></thead><tbody>
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
    const tmp = document.createElement("tbody"); tmp.innerHTML = linhaInd(T, g, nx, i, true); if (ck) ck.remove();
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
  { const g2 = regrasInd(T), x0 = () => AD.itens.find((y) => y.id === tr.dataset.iw) || {};
    const qm = tr.querySelector("[data-qm]"); if (qm) qm.onclick = (e) => { e.stopPropagation(); popLista(qm, ["Transferência Especial", "Convênio", "Execução Direta"].map((m) => [m, MOD_I[m] || "doc2", SIG_I[m] + " · " + m, g2.mods.includes(m)]), x0().modalidade, (v) => salvarLinha(T, tr, { modalidade: v })); };
    const qf = tr.querySelector("[data-qf]"); if (qf) qf.onclick = (e) => { e.stopPropagation(); popLista(qf, AREAS.map((q) => q[1]).map((a) => [a, AREA_I[a] || "plan", a, g2.areas.includes(a)]), x0().area || g2.trava, (v) => salvarLinha(T, tr, { area: v })); }; }
  tr.querySelectorAll("[data-bm]").forEach((b) => b.onclick = () => salvarLinha(T, tr, { modalidade: b.dataset.bm }));
  tr.querySelectorAll("[data-ba]").forEach((b) => b.onclick = () => salvarLinha(T, tr, { area: b.dataset.ba }));
  tr.querySelectorAll("[data-iq]").forEach((b) => b.onclick = () => { const it = T.L ? AD.itens.filter((y) => y.lista_id === T.L.id && y.id !== tr.dataset.iw) : [];
    const v = b.dataset.iq === "min" ? g.min : Math.max(0, Math.round((g.disp - it.reduce((s, y) => s + (+y.valor || 0), 0)) * 100) / 100); salvarLinha(T, tr, { valor: v }); });
  const abre = () => { if (!tr.dataset.iw) return; IND.det = IND.det === "a:" + tr.dataset.iw ? null : "a:" + tr.dataset.iw; desenharInd(); };
  const sx = tr.querySelector("[data-iexp]"); if (sx) sx.onclick = (e) => { e.stopPropagation(); abre(); };
  // abre o detalhamento ao tocar no espaço vazio da linha (fundo da célula), nunca em campo, botão ou texto preenchido
  tr.onclick = (e) => { if (e.target === tr || (e.target.tagName === "TD" && !e.target.classList.contains("n"))) abre(); };
  tr.addEventListener("focusin", () => marcaAtiva(tr.dataset.iw));
  const l = tr.querySelector("[data-ilimpa]"); if (l) l.onclick = async () => { if (l.dataset.ok !== "1") { l.dataset.ok = "1"; l.textContent = "limpar?"; l.classList.add("ok"); setTimeout(() => { l.dataset.ok = ""; l.innerHTML = ici("x"); l.classList.remove("ok"); }, 3000); return; }
    try { await apagar("gab_itens", tr.dataset.iw); if (IND.det === "a:" + tr.dataset.iw) IND.det = null; desenharInd(); } catch (er) { alert(er.message || er); } };
  tr.querySelector("[data-iobj]").onclick = (e) => { e.stopPropagation(); popObjeto(tr, T); };
}
function marcaAtiva(id) { if (!id || IND.ativa === id) return; IND.ativa = id; document.querySelectorAll("#indPg tr.ick").forEach((r) => r.classList.toggle("vis", r.dataset.ick === id || IND.det === "a:" + r.dataset.ick)); }
function ligarPlan(p, T) { p.querySelectorAll("tr.iw").forEach((tr) => ligarLinha(tr, T));
  p.querySelectorAll("tr.iexp").forEach((r) => { const x = AD.itens.find((y) => y.id === r.dataset.iexpw); if (x) ligarDet(r, x, T); }); }
// entidades já atendidas por emendas (portal da SEF, todos os deputados 2023-26): nome, CNPJ, município e quantas vezes recebeu
let ENTS = null;
async function entidades() { if (ENTS) return ENTS; await lerTodas(); const M = {};
  TODAS.forEach((e) => { const d = String(e.doc || "").replace(/\D/g, ""); if (d.length !== 14 || /Prefeitura|Munic/i.test(e.tben || "")) return; const k = d;
    (M[k] = M[k] || { nome: e.benef, cnpj: d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"), mun: e.mun, n: 0, v: 0 }).n++; M[k].v += +e.v || 0; });
  return (ENTS = Object.values(M)); }
function ligarEntidade(inp, tr, T, det) {
  let pop = null; const fecha = () => { if (pop) { pop.remove(); pop = null; } };
  const mostra = async () => { const q = norm(inp.value || "").split(/\s+/).filter((w) => w.length > 1); if (!q.length) { fecha(); return; }
    const E = await entidades(), mun = norm((tr.querySelector('[data-c="municipio"]') || {}).value || "");
    const L = E.filter((e) => { const n = norm(e.nome + " " + e.mun); return q.every((w) => n.includes(w)); }).sort((a, b) => (norm(b.mun) === mun) - (norm(a.mun) === mun) || b.n - a.n).slice(0, 12);
    if (!L.length) { fecha(); return; }
    if (!pop) { pop = document.createElement("div"); pop.className = "ipop ient"; $("#indPg").appendChild(pop); }
    const r = inp.getBoundingClientRect(); pop.style.top = Math.min(r.bottom + 4, innerHeight - 320) + "px"; pop.style.left = Math.max(12, Math.min(r.left, innerWidth - 450)) + "px";
    pop.innerHTML = `<div class="ipl">${L.map((e, i) => `<button data-en="${i}"><span><b>${esc(e.nome)}</b><small>${esc(e.mun)} · CNPJ ${esc(e.cnpj)}</small></span><small>${e.n}×</small></button>`).join("")}</div>`;
    pop.querySelectorAll("[data-en]").forEach((b) => b.onmousedown = (ev) => { ev.preventDefault(); const e = L[+b.dataset.en], x = AD.itens.find((y) => y.id === tr.dataset.iw) || {}; fecha();
      inp.value = e.nome; const cj = det && det.querySelector('[data-d="cnpj"]'); if (cj) cj.value = e.cnpj;
      salvarLinha(T, tr, { razao_social: e.nome, beneficiario: e.nome, cnpj: e.cnpj, ...(x.municipio ? {} : { municipio: e.mun }) }); }); };
  let tm; inp.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(mostra, 180); });
  inp.addEventListener("blur", () => setTimeout(fecha, 150)); inp.addEventListener("keydown", (e) => { if (e.key === "Escape") fecha(); });
}
// caixinhas quadradas (modalidade e função): abrem a lista com ícone e nome
function popLista(btn, itens, atual, escolhe) {
  document.querySelectorAll(".ipop").forEach((x) => x.remove()); const pop = document.createElement("div"); pop.className = "ipop iplst"; $("#indPg").appendChild(pop);
  const r = btn.getBoundingClientRect(); pop.style.top = Math.min(r.bottom + 4, innerHeight - 330) + "px"; pop.style.left = Math.max(12, Math.min(r.left, innerWidth - 300)) + "px";
  pop.innerHTML = `<div class="ipl">${itens.map(([v, ic2, rot, ok = true], i) => `<button data-li="${i}" class="${v === atual ? "on" : ""}${ok ? "" : " off"}"${ok ? "" : ' disabled title="Não permitido nesta cota"'}>${ici(ic2)}<span>${esc(rot)}</span>${ok ? "" : "<small>não permitido</small>"}</button>`).join("")}</div>`;
  pop.querySelectorAll("[data-li]:not([disabled])").forEach((b) => b.onclick = (ev) => { ev.stopPropagation(); pop.remove(); escolhe(itens[+b.dataset.li][0]); });
  setTimeout(() => document.addEventListener("click", function f(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener("click", f); } }), 0);
}
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
// planilha-painel (27/10/2026): formulário de indicação em Excel/Google Planilhas que se atualiza sozinho ao preencher — capa com
// barras de progresso (cota, Saúde, FUNDAM), soma por área e top municípios; aba Indicações com listas suspensas e conferência por linha;
// aba Por município (soma, nº de emendas, histórico e votos); aba Orçamento no modelo oficial, montada por fórmula. Sem macros.
async function xlsxInd(T) {
  const L = T.L, g = regrasInd(T), c = T.cota || {}, it = L ? AD.itens.filter((x) => x.lista_id === L.id && cheia(x)) : [];
  if (!window.ExcelJS) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); });
  const wb = new ExcelJS.Workbook(); wb.creator = "SimulaLEGIS"; wb.calcProperties.fullCalcOnLoad = true;
  const ESC = "FF1D2226", MUT = "FF6E767D", BD = "FFDEE2E5", SF = "FFEEF0F2", TL = "FFF8F9FA", OR = "FFE8822A", VD = "FF1FA845";
  const fill = (c) => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } }), fino = { style: "thin", color: { argb: BD } }, R$ = '"R$" #,##0.00', PCT = "0%";
  const N = Math.max(g.max || 0, it.length + 20, 30), r0 = 6, r1 = r0 + N - 1, rng = (col) => `'Indicações'!$${col}$${r0}:$${col}$${r1}`;
  const disp = g.disp || 0, tit = `${T.nome} · ${IND.ano}`, muns = BASE.mun.map((m) => m.n).sort((a, b) => a.localeCompare(b, "pt-BR"));
  // ---- Listas (apoio das listas suspensas e das fórmulas)
  const pn = wb.addWorksheet("Painel", { views: [{ showGridLines: false }] }), ws = wb.addWorksheet("Indicações", { views: [{ state: "frozen", ySplit: r0 - 1, xSplit: 3, showGridLines: false }] }),
    pm = wb.addWorksheet("Por município", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }] }), oc = wb.addWorksheet("Orçamento", { views: [{ showGridLines: false }] }), ls = wb.addWorksheet("Listas", { state: "hidden" });
  ls.getCell("A1").value = "Município"; muns.forEach((m, i) => { ls.getCell(2 + i, 1).value = m; });
  ls.getCell("C1").value = "Área"; ls.getCell("D1").value = "Subação"; ls.getCell("E1").value = "Órgão"; ls.getCell("F1").value = "UO";
  g.areas.forEach((a, i) => { const q = AREAS.find((x) => x[1] === a) || []; ls.getCell(2 + i, 3).value = a; ls.getCell(2 + i, 4).value = q[0] ? +q[0] : ""; ls.getCell(2 + i, 5).value = q[2] || ""; ls.getCell(2 + i, 6).value = q[3] || ""; });
  ls.getCell("H1").value = "Quem recebe"; ls.getCell("I1").value = "Instrumento"; BTIPO.forEach(([, l, ins], i) => { ls.getCell(2 + i, 8).value = l; ls.getCell(2 + i, 9).value = ins; });
  ls.getCell("K1").value = "Instrumentos"; g.mods.forEach((m, i) => { ls.getCell(2 + i, 11).value = m; });
  ls.getCell("M1").value = "Natureza"; ["Custeio", "Investimento"].forEach((m, i) => { ls.getCell(2 + i, 13).value = m; });
  const nA = g.areas.length + 1, AR = `Listas!$C$2:$F$${nA}`;
  // ---- Indicações (o formulário)
  const COLS = [["Nº", 5], ["Quem recebe", 13], ["Município", 20], ["Área", 16], ["Natureza", 12], ["Objeto", 46], ["Beneficiário", 30], ["CNPJ (convênio)", 19], ["Razão social (convênio)", 30], ["Valor (R$)", 16], ["Instrumento", 22], ["Trocar instrumento", 20], ["Subação", 9], ["Órgão", 8], ["UO", 8], ["Líder", 20], ["Observação", 30], ["Conferência", 22]];
  ws.columns = COLS.map(([, w]) => ({ width: w }));
  ws.mergeCells("A1:R1"); ws.getCell("A1").value = tit; ws.getCell("A1").font = { size: 16, bold: true, color: { argb: ESC } };
  ws.mergeCells("A2:R2"); ws.getCell("A2").value = [c.doc || (L && L.origem) || "", g.min ? "mínimo R$ " + moeda(g.min) + " por emenda" : "", g.max ? "até " + g.max + " emendas" : "", g.trava ? "área " + g.trava : "", c.prazo ? "prazo " + new Date(c.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""].filter(Boolean).join(" · "); ws.getCell("A2").font = { size: 10, color: { argb: MUT } };
  ws.mergeCells("A3:R3"); ws.getCell("A3").value = "Preencha as linhas: Quem recebe define o instrumento (Município → TE, Entidade → Convênio, Estado → Execução Direta); Subação, Órgão e UO saem da Área. A aba Painel atualiza sozinha."; ws.getCell("A3").font = { size: 9, italic: true, color: { argb: MUT } };
  const h = ws.getRow(r0 - 1); h.values = COLS.map(([t]) => t); h.height = 30; h.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
  for (let k = 0; k < N; k++) { const r = r0 + k, x = it[k], row = ws.getRow(r), t = x ? tipoDe(x) : "";
    row.getCell(1).value = k + 1;
    if (x) { row.getCell(2).value = (BTIPO.find((b) => b[0] === t) || [])[1] || ""; row.getCell(3).value = x.municipio || ""; row.getCell(4).value = x.area || g.trava || ""; row.getCell(5).value = x.natureza || ""; row.getCell(6).value = frase(x.objeto || ""); row.getCell(7).value = x.beneficiario || ""; row.getCell(8).value = x.cnpj || ""; row.getCell(9).value = x.razao_social || ""; row.getCell(10).value = +x.valor || null; row.getCell(16).value = x.lideranca || ""; row.getCell(17).value = x.observacao || "";
      const auto = (BTIPO.find((b) => b[0] === t) || [])[2]; if (x.modalidade && x.modalidade !== auto) row.getCell(12).value = x.modalidade; }
    else if (g.trava) row.getCell(4).value = g.trava;
    row.getCell(11).value = { formula: `IF(L${r}<>"",L${r},IF(B${r}="","",IFERROR(VLOOKUP(B${r},Listas!$H$2:$I$4,2,FALSE),"")))` };
    row.getCell(13).value = { formula: `IF(D${r}="","",IFERROR(VLOOKUP(D${r},${AR},2,FALSE),""))` };
    row.getCell(14).value = { formula: `IF(D${r}="","",IFERROR(VLOOKUP(D${r},${AR},3,FALSE),""))` };
    row.getCell(15).value = { formula: `IF(D${r}="","",IFERROR(VLOOKUP(D${r},${AR},4,FALSE),""))` };
    row.getCell(18).value = { formula: `IF(AND(C${r}="",J${r}=""),"",IF(C${r}="","falta município",IF(F${r}="","falta objeto",IF(B${r}="","falta quem recebe",IF(J${r}<${g.min || 0},"abaixo do mínimo",IF(AND(B${r}="Entidade",LEN(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(H${r},".",""),"/",""),"-",""))<>14),"falta CNPJ","✓ ok"))))))` };
    row.getCell(2).dataValidation = { type: "list", allowBlank: true, formulae: ["Listas!$H$2:$H$4"] };
    row.getCell(3).dataValidation = { type: "list", allowBlank: true, formulae: [`Listas!$A$2:$A$${muns.length + 1}`], showErrorMessage: true, errorTitle: "Município", error: "Escolha um município de SC da lista." };
    row.getCell(4).dataValidation = { type: "list", allowBlank: true, formulae: [`Listas!$C$2:$C$${nA}`] };
    row.getCell(5).dataValidation = { type: "list", allowBlank: true, formulae: ["Listas!$M$2:$M$3"] };
    row.getCell(12).dataValidation = { type: "list", allowBlank: true, formulae: [`Listas!$K$2:$K$${g.mods.length + 1}`] };
    row.getCell(10).numFmt = R$;
    row.eachCell({ includeEmpty: true }, (cl, n) => { cl.border = { bottom: fino }; cl.alignment = { vertical: "top", wrapText: [6, 7, 9, 17].includes(n) }; cl.font = { size: 10, color: { argb: [11, 13, 14, 15, 18].includes(n) ? MUT : ESC } }; if (k % 2) cl.fill = fill(TL); });
    [11, 13, 14, 15, 18].forEach((n) => { row.getCell(n).fill = fill(SF); }); }
  const tr = ws.getRow(r1 + 1); tr.getCell(9).value = "TOTAL"; tr.getCell(10).value = { formula: `SUM(J${r0}:J${r1})` }; tr.getCell(10).numFmt = R$; tr.font = { bold: true }; tr.eachCell((cl) => { cl.border = { top: { style: "medium", color: { argb: ESC } } }; });
  ws.addConditionalFormatting({ ref: `J${r0}:J${r1}`, rules: [{ type: "expression", formulae: [`AND(J${r0}<>"",J${r0}<${g.min || 0})`], style: { font: { color: { argb: "FFC0392B" }, bold: true }, fill: fill("FFFDE7E3") } }] });
  ws.addConditionalFormatting({ ref: `R${r0}:R${r1}`, rules: [{ type: "containsText", operator: "containsText", text: "✓", style: { font: { color: { argb: VD }, bold: true } } }, { type: "containsText", operator: "containsText", text: "falta", style: { font: { color: { argb: OR }, bold: true } } }, { type: "containsText", operator: "containsText", text: "mínimo", style: { font: { color: { argb: "FFC0392B" }, bold: true } } }] });
  // ---- Por município (soma do que foi indicado aqui + histórico do mandato e votos)
  pm.columns = [{ width: 24 }, { width: 18 }, { width: 18 }, { width: 10 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 3 }];
  pm.mergeCells("A1:G1"); pm.getCell("A1").value = "Indicações por município"; pm.getCell("A1").font = { size: 15, bold: true };
  const ph = pm.getRow(3); ph.values = ["Município", "Região", "Indicado nesta lista", "Emendas", "Já indicado 2023-26", "Votos 2022", "Votos 2026"]; ph.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", wrapText: true }; }); ph.height = 28;
  muns.forEach((m, i) => { const r = 4 + i, row = pm.getRow(r), rf = refCidade(m) || {};
    row.values = [m, regDe({ municipio: m }) || "", { formula: `SUMIF(${rng("C")},A${r},${rng("J")})` }, { formula: `COUNTIF(${rng("C")},A${r})` }, rf.rec || 0, rf.v22 || 0, rf.v26 || 0, { formula: `C${r}+ROW()/1000000000` }];
    row.getCell(3).numFmt = R$; row.getCell(5).numFmt = R$; row.getCell(6).numFmt = "#,##0"; row.getCell(7).numFmt = "#,##0"; row.getCell(8).font = { color: { argb: "FFFFFFFF" }, size: 6 };
    row.eachCell({ includeEmpty: true }, (cl, n) => { if (n < 8) { cl.border = { bottom: fino }; cl.font = { size: 10, color: { argb: n === 2 ? MUT : ESC }, bold: n === 3 }; } }); });
  const pr1 = 3 + muns.length; pm.getColumn(8).hidden = true;
  pm.addConditionalFormatting({ ref: `C4:C${pr1}`, rules: [{ type: "dataBar", cfvo: [{ type: "num", value: 0 }, { type: "max" }], color: { argb: ESC }, gradient: false }] });
  pm.addConditionalFormatting({ ref: `E4:E${pr1}`, rules: [{ type: "dataBar", cfvo: [{ type: "num", value: 0 }, { type: "max" }], color: { argb: "FFB3B9BE" }, gradient: false }] });
  // ---- Painel (capa): números, barras que enchem, Saúde/FUNDAM, por área e top 10 municípios
  pn.columns = [{ width: 3 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 44 }, { width: 18 }, { width: 3 }];
  const bar = (p) => `REPT("█",ROUND(MAX(0,MIN(1,${p}))*30,0))&REPT("░",30-ROUND(MAX(0,MIN(1,${p}))*30,0))`;
  pn.mergeCells("B2:F2"); pn.getCell("B2").value = "SimulaLEGIS · Gabinete · Indicação de recursos"; pn.getCell("B2").font = { size: 9, bold: true, color: { argb: MUT } };
  pn.mergeCells("B3:F3"); pn.getCell("B3").value = tit; pn.getCell("B3").font = { size: 22, bold: true, color: { argb: ESC } };
  pn.mergeCells("B4:F4"); pn.getCell("B4").value = `${PARL.u || ""} · ${PARL.p || ""} · ${c.doc || (L && L.origem) || ""}`; pn.getCell("B4").font = { size: 10, color: { argb: MUT } };
  const kp = [["Disponível", disp || "", R$], ["Indicado", { formula: `SUM(${rng("J")})` }, R$], ["Saldo", { formula: `C7-C8` }, R$], ["Emendas", { formula: `COUNTIF(${rng("J")},">0")` }, "0"], ["Uso da cota", { formula: `IF(C7=0,0,C8/C7)` }, PCT]];
  kp.forEach(([k, v, f], i) => { const r = 7 + i; pn.getCell(r, 2).value = k; pn.getCell(r, 2).font = { size: 10, color: { argb: MUT } }; const cl = pn.getCell(r, 3); cl.value = v; cl.numFmt = f; cl.font = { size: 14, bold: true, color: { argb: ESC } }; });
  pn.getCell("D10").value = g.max ? `de ${g.max}` : ""; pn.getCell("D10").font = { color: { argb: MUT } };
  pn.getCell("E11").value = { formula: bar("C11") }; pn.getCell("E11").font = { name: "Consolas", size: 11, color: { argb: ESC } };
  pn.getCell("E9").value = { formula: `IF(C9<0,"passou do disponível",IF(C9=0,"cota fechada","ainda livre"))` }; pn.getCell("E9").font = { bold: true, color: { argb: OR } };
  let r = 14; const tituloP = (t) => { pn.mergeCells(r, 2, r, 6); pn.getCell(r, 2).value = t; pn.getCell(r, 2).font = { size: 12, bold: true, color: { argb: ESC } }; pn.getCell(r, 2).border = { bottom: { style: "medium", color: { argb: ESC } } }; r += 1; };
  if (g.saude || c.fundam) { tituloP("Mínimos por área");
    ["Área", "Indicado", "Mínimo", "Progresso", "Situação"].forEach((t, i) => { const cl = pn.getCell(r, 2 + i); cl.value = t; cl.font = { size: 9, bold: true, color: { argb: MUT } }; }); r++;
    [["Saúde", g.saude], ["FUNDAM", c.fundam]].filter(([, p]) => p).forEach(([a, p]) => { pn.getCell(r, 2).value = `${a} (${p * 100}%)`; pn.getCell(r, 3).value = { formula: `SUMIF(${rng("D")},"${a}",${rng("J")})` }; pn.getCell(r, 4).value = { formula: `C7*${p}` }; pn.getCell(r, 5).value = { formula: bar(`IF(D${r}=0,0,C${r}/D${r})`) }; pn.getCell(r, 6).value = { formula: `IF(C${r}>=D${r}-0.005,"✓ atingido","faltam "&TEXT(D${r}-C${r},"#,##0.00"))` };
      [3, 4].forEach((n) => { pn.getCell(r, n).numFmt = R$; }); pn.getCell(r, 5).font = { name: "Consolas", color: { argb: ESC } }; pn.getCell(r, 6).font = { bold: true }; r++; });
    pn.addConditionalFormatting({ ref: `F16:F${r - 1}`, rules: [{ type: "containsText", operator: "containsText", text: "✓", style: { font: { color: { argb: VD }, bold: true } } }, { type: "containsText", operator: "containsText", text: "faltam", style: { font: { color: { argb: "FFC0392B" }, bold: true } } }] }); r++; }
  tituloP("Por área"); const ra0 = r;
  g.areas.forEach((a) => { pn.getCell(r, 2).value = a; pn.getCell(r, 3).value = { formula: `SUMIF(${rng("D")},B${r},${rng("J")})` }; pn.getCell(r, 3).numFmt = R$; pn.getCell(r, 4).value = { formula: `IF($C$8=0,0,C${r}/$C$8)` }; pn.getCell(r, 4).numFmt = PCT; pn.getCell(r, 5).value = { formula: bar(`D${r}`) }; pn.getCell(r, 5).font = { name: "Consolas", color: { argb: "FF4A5258" } }; r++; });
  r++; tituloP("Os 10 municípios com mais recurso nesta lista");
  for (let k = 1; k <= 10; k++, r++) { pn.getCell(r, 2).value = { formula: `IF(LARGE('Por município'!$H$4:$H$${pr1},${k})<1,"",INDEX('Por município'!$A$4:$A$${pr1},MATCH(LARGE('Por município'!$H$4:$H$${pr1},${k}),'Por município'!$H$4:$H$${pr1},0)))` };
    pn.getCell(r, 3).value = { formula: `IF(B${r}="","",SUMIF(${rng("C")},B${r},${rng("J")}))` }; pn.getCell(r, 3).numFmt = R$; pn.getCell(r, 4).value = { formula: `IF(OR(B${r}="",$C$8=0),"",C${r}/$C$8)` }; pn.getCell(r, 4).numFmt = PCT;
    pn.getCell(r, 5).value = { formula: `IF(B${r}="","",${bar(`D${r}`)})` }; pn.getCell(r, 5).font = { name: "Consolas", color: { argb: "FF4A5258" } }; }
  for (let i = 7; i < r; i++) pn.getRow(i).height = 18;
  // ---- Orçamento: o modelo oficial, montado por fórmula a partir das indicações
  oc.columns = [8, 50, 14, 16, 22, 22, 10, 14, 20, 34].map((w) => ({ width: w }));
  oc.mergeCells("A1:J1"); oc.getCell("A1").value = (L && L.origem) || tit; oc.getCell("A1").font = { size: 13, bold: true };
  [["Gabinete", "GAB DEP " + norm(PARL.u || "").toUpperCase()], ["Valor disponível", { formula: "Painel!C7" }], ["Saldo", { formula: "Painel!C9" }]].forEach(([k, v], i) => { oc.getCell(3 + i, 1).value = k; oc.getCell(3 + i, 1).font = { bold: true, size: 9, color: { argb: MUT } }; oc.mergeCells(3 + i, 1, 3 + i, 2); oc.getCell(3 + i, 3).value = v; oc.getCell(3 + i, 3).numFmt = R$; });
  const oh = oc.getRow(7); oh.values = ["Emenda", "Objeto", "Subação deduzida", "Valor", "Modalidade", "Município", "Órgão", "Unidade orçamentária", "CNPJ", "Razão Social"]; oh.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { wrapText: true, vertical: "middle" }; }); oh.height = 28;
  for (let k = 0; k < N; k++) { const s2 = r0 + k, row = oc.getRow(8 + k), q = (f) => ({ formula: `IF('Indicações'!$J$${s2}="","",${f})` });
    row.values = [q(`'Indicações'!A${s2}`), q(`'Indicações'!F${s2}`), q(`'Indicações'!M${s2}`), q(`'Indicações'!J${s2}`), q(`'Indicações'!K${s2}`), q(`'Indicações'!C${s2}`), q(`'Indicações'!N${s2}`), q(`'Indicações'!O${s2}`), q(`IF('Indicações'!K${s2}="Convênio",'Indicações'!H${s2},"")`), q(`IF('Indicações'!K${s2}="Convênio",'Indicações'!I${s2},"")`)];
    row.getCell(4).numFmt = R$; row.eachCell({ includeEmpty: true }, (cl, n) => { cl.border = { bottom: fino }; cl.alignment = { vertical: "top", wrapText: n === 2 || n === 10 }; cl.font = { size: 10 }; }); }
  const ot = oc.getRow(8 + N); ot.getCell(1).value = "TOTAL"; ot.getCell(4).value = { formula: `SUM(D8:D${7 + N})` }; ot.getCell(4).numFmt = R$; ot.font = { bold: true };
  // ordem das abas: Painel, Indicações, Por município, Orçamento, Listas (oculta)
  wb.views = [{ activeTab: 0, firstSheet: 0 }];
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = `Indicacao-${(L ? L.apelido || "lista" : T.nome).replace(/[^\w-]+/g, "_")}-${norm(PARL.u || "").replace(/ /g, "_")}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// detalhamento da emenda dentro da própria linha (expansão), em vez de painel lateral (27/10/2026)
function detForm(x, T, g) {
    const F = (k, rot, html, w) => `<label class="tl2 fc2${w ? " w" + w : ""}"><span class="tk">${ic(k)}${rot}</span>${html}</label>`, I = (f, v, ph = "", l = "") => `<input data-d="${f}" value="${esc(v ?? "")}" placeholder="${esc(ph)}"${l ? ` list="${l}"` : ""}>`;
    const S2 = (f, ops, v) => `<select data-d="${f}"><option value="">—</option>${ops.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}${v && !ops.includes(v) ? `<option selected>${esc(v)}</option>` : ""}</select>`, t = tipoDe(x);
    return `<div class="dm2 fm2 iexpd">
      <div class="bnt">
      ${tipoDe(x) === "ent" ? F("hash", "CNPJ", I("cnpj", x.cnpj, "00.000.000/0000-00"), 2) + F("pred", "Razão social", I("razao_social", x.razao_social || x.beneficiario), 2) : ""}${g.trava ? "" : F("lei", "Função", S2("area", g.areas, x.area), 2)}${F("moeda", "Natureza", S2("natureza", ["Investimento", "Custeio"], x.natureza), 2)}${F("ok", "Status", S2("status", STATUS, x.status || "Em análise"), 2)}
      ${F("pessoa", "Líder", I("lideranca", x.lideranca, "Escolha ou digite", "indPes"), 2)}${F("pessoa", "Contato", I("contato", x.contato, "Telefone ou e-mail"), 2)}
      ${F("band", "Prioridade", S2("prioridade", PRIOR, x.prioridade), 2)}${F("lei", "Lei / PL", I("pl", x.pl, "PL nº 0633/2026"), 2)}
      ${F("doc", "Justificativa", `<textarea data-d="justificativa" rows="2" placeholder="Por que esta indicação">${esc(x.justificativa || "")}</textarea>`, 4)}
      ${F("doc", "Observação", `<textarea data-d="observacao" rows="2">${esc(x.observacao || "")}</textarea>`, 4)}</div>
      <datalist id="indPes">${pessoas().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><div class="idrod"><span class="isv mut" data-dmsg></span><button class="ilix" data-ilimpa title="Excluir esta emenda">${ici("lixo")}Excluir emenda</button></div></div>`;
}
function ligarDet(d, x, T) {
    { const en = d.querySelector('[data-d="razao_social"]'), tr = document.querySelector(`#indPg tr.iw[data-iw="${x.id}"]`); if (en && tr) { en.placeholder = "Digite para buscar entidades já atendidas"; en.autocomplete = "off"; ligarEntidade(en, tr, T, d); } }
    const lx = d.querySelector("[data-ilimpa]"); if (lx) lx.onclick = async () => { if (lx.dataset.ok !== "1") { lx.dataset.ok = "1"; lx.innerHTML = ici("lixo") + "Confirmar exclusão"; lx.classList.add("ok"); setTimeout(() => { lx.dataset.ok = ""; lx.innerHTML = ici("lixo") + "Excluir emenda"; lx.classList.remove("ok"); }, 4000); return; }
      try { await apagar("gab_itens", x.id); IND.det = null; desenharInd(); } catch (er) { alert(er.message || er); } };
    const msg = d.querySelector("[data-dmsg]");
    d.querySelectorAll("[data-d]").forEach((el) => { const ini = el.value; el.onchange = async () => { if (el.value === ini) return; const o = { [el.dataset.d]: el.value.trim() || null }; if (o.razao_social !== undefined) o.beneficiario = o.razao_social;
      msg.textContent = "Salvando…"; const tr = document.querySelector(`#indPg tr.iw[data-iw="${x.id}"]`);
      try { if (tr && T.k) await salvarLinha(T, tr, o); else await gravar("gab_itens", { id: x.id, ...o }); msg.textContent = "Salvo"; setTimeout(() => { msg.textContent = ""; }, 1500); } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); } }; });
}
// ---------- detalhamento à direita (itens da planilha do gabinete) ----------
function detInd() {
  const id = IND.det, d = $("#indDet"); if (!d) return; if (!id) { d.classList.remove("on"); return; }
  if (id.startsWith("m:")) { const r = MEU.find((x) => "m:" + mk(x) === id); if (!r) return; d.innerHTML = `<button class="ix" data-ixd>×</button>${detalheMeu(r)}`; ligarMeuDet(d.querySelector(".dm2") || d, r); }
  else { d.classList.remove("on"); return; } // emenda da lista: abre na própria linha
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
