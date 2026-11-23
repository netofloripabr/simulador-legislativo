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
// quadro das cotas (20/11/2026): barra empilhada com os marcadores da lei + um anel por exigência (Saúde, FUNDAM) e o uso do total
// quadro das cotas (20/11/2026, protótipo v5 aprovado: prototipos/indicacao/quadro-cotas-v5.html): o geral em cima (cota indicada
// e investimento × custeio de tudo) e, ligados a ele, os dois grupos da lei — Saúde e FUNDAM (as demais áreas são subáreas do
// FUNDAM) — cada um com o mínimo e a sua divisão. Natureza vem do botão de cada linha; sem marcação conta como "a definir".
function barraSeg(c, it, tot) {
  const val = (x) => +x.valor || 0, nat = (x) => x.natureza === "Capital" ? "cap" : x.natureza === "Custeio" ? "cus" : "def";
  const grp = (f) => { const o = { cap: 0, cus: 0, def: 0, t: 0 }; it.filter(f).forEach((x) => { o[nat(x)] += val(x); o.t += val(x); }); return o; };
  const S = grp((x) => x.area === "Saúde"), F = grp((x) => x.area !== "Saúde"), A = { cap: S.cap + F.cap, cus: S.cus + F.cus, def: S.def + F.def, t: S.t + F.t };
  const pc = (v, d) => d ? Math.round(v / d * 100) : 0, CN = { cap: "#2F5D8A", cus: "#8FB3D4", def: "#D3D8DB" };
  const ICQ = { cota: '<path d="M3 16.5h14M5 13.5V9M9 13.5V5M13 13.5V7.5"/>', sau: '<path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5z"/>', fun: '<path d="M3 17h14M4.5 17V8.5L10 4l5.5 4.5V17"/><path d="M8 17v-4.5h4V17"/>' };
  const ic = (k) => `<div class="q5i"><svg viewBox="0 0 20 20">${ICQ[k]}</svg></div>`;
  const div = (o, tit) => o.t ? `<div class="q5s"><div class="q5sh"><span>${tit}</span><b>capital ${pc(o.cap, o.t)}%</b></div><div class="q5b q5fino"><div class="q5f" style="width:100%">${["cap", "cus", "def"].map((k) => o[k] ? `<i style="flex:${o[k]};background:${CN[k]}"></i>` : "").join("")}</div></div>
    <div class="q5l"><span><i style="background:${CN.cap}"></i>capital <b>${rc(o.cap)}</b></span><span><i style="background:${CN.cus}"></i>custeio <b>${rc(o.cus)}</b></span>${o.def ? `<span><i style="background:${CN.def}"></i>a definir <b>${rc(o.def)}</b></span>` : ""}</div></div>` : "";
  // regra do usuário (20/11/2026): a cota é metade Saúde (mínimo) e metade FUNDAM, que reúne toda função que não é Saúde;
  // o FUNDAM mostra quanto da sua metade já foi usado (livre ou acima), sem "mínimo de 20%"
  const grupo = (nome, k, o, frac, sub, parte) => { if (!frac) return ""; const m = c.disp * frac, ok = o.t >= m - .005, esc = Math.max(o.t, m) * 1.05;
    if (parte) { const ac = o.t > m + .005;
      return `<div class="q5k${ac ? " fl" : ""}"><div class="q5t">${ic(k)}<span><b>${nome}</b>${sub}</span></div>
      <div class="q5n"><b>${pc(o.t, m)}%</b><small>da metade do FUNDAM</small><span class="q5c${ac ? " fl" : ""}">${ac ? "acima em " + rc(o.t - m) : "livre " + rc(m - o.t)}</span></div>
      <div class="q5b"><div class="q5f" style="width:${(Math.min(o.t, esc) / esc * 100).toFixed(1)}%"><i style="flex:1;background:#2A2F33"></i></div>${ac ? `<b class="q5m" style="left:${(m / esc * 100).toFixed(1)}%"></b>` : ""}</div>
      <div class="q5ft"><span><em>${rc(o.t)}</em></span><span>metade da cota <em>${rc(m)}</em></span></div>${div(o, "Investimento e custeio")}</div>`; }
    return `<div class="q5k ${ok ? "ok" : "fl"}"><div class="q5t">${ic(k)}<span><b>${nome}</b>${sub}</span></div>
      <div class="q5n"><b>${pc(o.t, m)}%</b><small>do mínimo</small><span class="q5c ${ok ? "ok" : "fl"}">${ok ? "✓ atingido" : "faltam " + rc(m - o.t)}</span></div>
      <div class="q5b"><div class="q5f" style="width:${(o.t / esc * 100).toFixed(1)}%"><i style="flex:1;background:${ok ? "#1FA845" : "#2A2F33"}"></i></div><b class="q5m" style="left:${(m / esc * 100).toFixed(1)}%"></b></div>
      <div class="q5ft"><span><em>${rc(o.t)}</em></span><span>mínimo <em>${rc(m)}</em></span></div>${div(o, "Investimento e custeio")}</div>`; };
  return `<div class="t w4 q5"><div class="q5k"><div class="q5t">${ic("cota")}<span><b>Cota indicada</b>R$ ${moeda(c.disp)} para indicar</span></div>
      <div class="q5n"><b>${pc(tot, c.disp)}%</b><small>R$ ${moeda(tot)} indicados</small><span class="q5c">${tot <= c.disp ? "livre R$ " + moeda(c.disp - tot) : "acima em R$ " + moeda(tot - c.disp)}</span></div>
      <div class="q5b"><div class="q5f" style="width:${Math.min(100, tot / c.disp * 100).toFixed(1)}%"><i style="flex:1;background:#2A2F33"></i></div></div>
      ${div(A, "Investimento e custeio · de tudo o que foi indicado")}</div>
    ${c.saude ? `<div class="q5tr"></div><div class="q5g">${grupo("Saúde", "sau", S, c.saude, `mínimo de ${Math.round(c.saude * 100)}% da cota`)}${grupo("FUNDAM", "fun", F, 1 - (c.saude || 0), `${Math.round((1 - (c.saude || 0)) * 100)}% da cota · todas as funções que não são Saúde`, true)}</div>` : ""}</div>`;
}
function contador() {
  document.querySelectorAll("#indPg .icd[data-prazo]").forEach((e) => { const p = e.dataset.prazo; if (!p) { e.innerHTML = ""; return; }
    let s = Math.max(0, (new Date(p) - new Date()) / 1000); if (!s) { e.innerHTML = `<span class="ifim">Prazo encerrado</span>`; return; }
    e.innerHTML = [[Math.floor(s / 86400), "dias"], [Math.floor(s % 86400 / 3600), "h"], [Math.floor(s % 3600 / 60), "min"], [Math.floor(s % 60), "s"]].map(([v, u]) => `<div><b>${String(v).padStart(2, "0")}</b><span>${u}</span></div>`).join(""); });
}
// ---------- planilha da etiqueta ----------
function linhasInd(T) {
  if (T.k === "plan") return MEU.filter((r) => +r.ano === IND.ano && !supr(r)).map((r) => ({ id: "m:" + mk(r), mun: r.municipio, obj: objAtual(r), ins: instrSig(r.modalidade) || "—", v: +r.valor || 0, st: (etapasStatus(r.status_manual).t || r.status_manual || "") }));
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
const ICI = { cus: '<path d="M12.5 5.5A5 5 0 1 0 13 9"/><path d="M13 2.8v2.9h-2.9"/><path d="M8 5.6v4.8M9.6 6.6c-.3-.5-.9-.8-1.6-.8-.9 0-1.6.5-1.6 1.2 0 1.6 3.2.8 3.2 2.4 0 .7-.7 1.2-1.6 1.2-.7 0-1.3-.3-1.6-.8"/>', cap: '<path d="M2.5 13.5h11M3.5 13.5V6.8L8 3.5l4.5 3.3v6.7"/><path d="M6.3 13.5V9.7h3.4v3.8"/>', mun: '<path d="M3 7h10v6.5H3zM5 2.5h6v2.6H5zM8 5.1V7M7 13.5v-2.5h2v2.5M4.8 9h1.4M9.8 9h1.4"/>', ent: '<path d="M2.5 7.5L8 3l5.5 4.5M4 6.3v7.2h8V6.3"/><path d="M8 11.6s-2-1.2-2-2.5a1 1 0 0 1 2-.4 1 1 0 0 1 2 .4c0 1.3-2 2.5-2 2.5z"/>', est: '<path d="M3.5 2.2v11.6M3.5 3h9.5M3.5 10h9.5"/><path d="M8.25 4.1l2.4 2.4-2.4 2.4-2.4-2.4z"/>',
  min: '<path d="M8 3v8M4.5 7.5L8 11l3.5-3.5M3.5 13.5h9"/>', sal: '<path d="M2.5 8h11M9.5 4.5L13 8l-3.5 3.5M2.5 3.5v9"/>', seta: '<path d="M4 6l4 4 4-4"/>', x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
  regras: '<path d="M3 4.5h10M3 8h10M3 11.5h10"/><circle cx="6" cy="4.5" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5" cy="11.5" r="1.3"/>', impr: '<path d="M4.5 6V2.5h7V6M4.5 11.5H3V6h10v5.5h-1.5M4.5 9.5h7v4h-7z"/>', plan: '<path d="M2.5 3h11v10h-11zM2.5 6.5h11M2.5 10h11M6.5 3v10"/>', sau: '<path d="M6.5 2.5h3v4h4v3h-4v4h-3v-4h-4v-3h4z"/>', edu: '<path d="M2.5 4.5l5.5-2 5.5 2-5.5 2zM4.5 5.5v4c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5v-4M13.5 4.5v4"/>', fun: '<path d="M2.5 13.5h11M3.5 13.5v-6h3v6M6.5 13.5V4.5h3v9M9.5 13.5v-4h3v4"/>', agr: '<path d="M8 13.5V7M8 7c0-2.5 2-4.5 5-4.5 0 3-2 4.5-5 4.5zM8 9c0-2-1.6-3.5-4.5-3.5C3.5 8 5 9 8 9z"/>', inf: '<path d="M5 13.5l2-11M11 13.5l-2-11M8 4v1.5M8 7.5v1.5M8 11v1.5"/>', seg: '<path d="M8 2.3l4.8 1.9v3.6c0 2.9-2.1 4.8-4.8 5.9-2.7-1.1-4.8-3-4.8-5.9V4.2z"/><path d="M8 5.6l.8 1.5 1.7.2-1.2 1.2.3 1.7L8 9.4l-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>', soc: '<circle cx="5.5" cy="5.5" r="2"/><circle cx="10.5" cy="5.5" r="2"/><path d="M2 12.5c.4-2 1.8-3 3.5-3s3.1 1 3.5 3M7.5 12.5c.4-2 1.5-3 3-3s2.8 1 3.2 3"/>', te: '<path d="M2.5 8h9M8.5 4.5L12 8l-3.5 3.5M13.5 3.5v9"/>', co: '<path d="M4.5 2.5h5l2 2v9h-7zM6.3 9.3l1.3 1.3 2.4-2.6"/>', ed: '<path d="M2.5 8h6M6.5 5.5L9 8l-2.5 2.5M10.5 3.5h3v9h-3"/>', doc2: '<path d="M4.5 2.5h5l2 2v9h-7zM6.5 8h3M6.5 10.5h2"/>', cad: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2M8 9.6v1.4"/>', cadab: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7M8 9.6v1.4"/>', lixo: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5"/>', borr: '<path d="M9.3 2.8l3.9 3.9-6.2 6.3H4.3L2.6 11.3a1 1 0 0 1 0-1.4z M6.2 5.9l3.9 3.9 M7 13h6.5"/>', mais: '<path d="M8 3.5v9M3.5 8h9"/>' };
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
// ente → modalidade (20/11/2026): Município = Transferência Especial, Entidade = Convênio, Estado = Execução Direta.
// Ao escolher o ente a modalidade já vem marcada; dá para trocar, mas a escolha diferente ganha uma borda laranja suave.
const modEsperada = (x) => (BTIPO.find((q) => q[0] === (x ? tipoDe(x) : "")) || [])[2] || "";
const modFora = (x) => !!(x && x.modalidade && modEsperada(x) && x.modalidade !== modEsperada(x));
const moeda = (v) => (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function linhaInd(T, g, x, i, semExp) {
  const t = x ? tipoDe(x) : "", v = x ? +x.valor || 0 : 0;
  const ck = x ? [[x.municipio, "município"], [x.objeto, "objeto"], [t, "quem recebe"], [g.min ? v >= g.min : v > 0, g.min ? "valor ≥ " + rc(g.min) : "valor"], [x.natureza, "custeio ou capital"], ...(t === "ent" ? [[String(x.cnpj || "").replace(/\D/g, "").length === 14, "CNPJ"], [x.razao_social || x.beneficiario, "razão social"]] : [])] : [];
  const quem = t === "ent" ? ""
    : "";
  const ec = x && etqDe(T, x), mk = ec && corEtq(ec.c);
  return `<tr class="iw${x && IND.det === "a:" + x.id ? " on" : ""}${mk ? " mk" : ""}" data-iw="${x ? x.id : ""}"${mk ? ` style="--mk:${mk[1]};--mkf:${mk[2]}"` : ""}><td class="n">${i + 1}</td>
    <td class="itp" data-col="ent"><div class="ilin"><div class="iseg" title="Ente">${BTIPO.map(([k, l]) => `<button data-bt="${k}" class="${t === k ? "on" : ""}" title="${l}" aria-label="${l}">${ici(k)}</button>`).join("")}</div>
      <div class="iqs"><button class="iqb${x && x.modalidade ? " on" : ""}${modFora(x) ? " warn" : ""}" data-qm title="Modalidade: ${esc(x && x.modalidade || "escolher")}${modFora(x) ? ` · o usual para ${esc((BTIPO.find((q) => q[0] === tipoDe(x)) || [])[1] || "")} é ${esc(modEsperada(x))}` : ""}">${x && x.modalidade ? ici(MOD_I[x.modalidade] || "doc2") : '<span class="iq0">mod.</span>'}</button>${g.trava ? `<button class="iqb on" data-qf title="Função ${esc(g.trava)} · definida pela cota">${ici(AREA_I[g.trava] || "plan")}</button>` : `<button class="iqb${x && x.area ? " on" : ""}" data-qf title="Função: ${esc(x && x.area || "escolher")}">${x && x.area ? ici(AREA_I[x.area] || "plan") : '<span class="iq0">função</span>'}</button>`}<button class="iqb${x && x.natureza ? " on" : ""}" data-qn title="Despesa: ${esc(x && x.natureza || "custeio ou capital")}">${x && x.natureza ? ici(x.natureza === "Capital" ? "cap" : "cus") : '<span class="iq0">desp.</span>'}</button></div></div></div></td>
    <td data-col="mun"><input data-c="municipio" list="indMun" value="${esc(x ? x.municipio || "" : "")}" placeholder="${x ? "Município" : "indicar"}"></td>
    <td class="iob" data-col="obj"><div class="iqm">${quem}</div><div class="iobw"><textarea data-c="objeto" rows="1" placeholder="Objeto">${esc(x ? x.objeto || "" : "")}</textarea><button class="imais" data-iobj title="Objetos de referência">+</button></div>${x && x.justificativa ? `<div class="ijus" data-col="jus">${esc(x.justificativa)}</div>` : ""}${celProposta(x, T.L && (T.L.regras || {}).fechada)}${typeof celGestor === "function" ? celGestor(x, T.L && (T.L.regras || {}).fechada) : ""}</td>
    <td class="r iv2" data-col="val"><input data-c="valor" inputmode="numeric" class="${x && g.min && v && v < g.min ? "ierr" : ""}" value="${v ? moeda(v) : ""}" placeholder="0,00"></td>
    <td class="ietc" data-col="etq">${celEtq(x, T)}</td><td class="ilid" data-col="lid">${x ? `<input data-c="lideranca" list="indPes" value="${esc(x.lideranca || "")}" placeholder="Líder" title="Quem indicou a emenda"><input data-c="contato" class="icont" value="${esc(x.contato || "")}" placeholder="Contato" title="Quem está tocando o processo">` : ""}</td><td class="iobsc" data-col="obs">${x ? balaoInd(x, T) : ""}</td><td class="ietp" data-col="etp">${celEtapa(x)}</td>
</tr>
    ${ck.length && ck.some(([ok]) => !ok) ? `<tr class="ick${IND.det === "a:" + x.id || IND.ativa === x.id ? " vis" : ""}${mk ? " mk" : ""}" data-ick="${x.id}"${mk ? ` style="--mk:${mk[1]};--mkf:${mk[2]}"` : ""}><td></td><td colspan="${nColInd() - 1}">${ck.map(([ok, l]) => `<span class="${ok ? "ok" : "no"}">${ok ? "✓" : "•"} ${l}</span>`).join("")}</td></tr>` : ""}
    ${x && !semExp && IND.det === "a:" + x.id ? `<tr class="iexp" data-iexpw="${x.id}"><td colspan="${nColInd()}">${detForm(x, T, g)}</td></tr>` : ""}`;
}
// com filtro ligado (23/11/2026), o rodapé soma só o que está filtrado e mostra o total da lista embaixo
function rodapeInd(T, g, it) { it = it.filter(cheia); const tot = it.reduce((s, x) => s + (+x.valor || 0), 0);
  const ant = ["ent", "mun", "obj"].filter(colOn).length, fx = typeof temFx === "function" && temFx(), F = fx ? it.filter((x) => passaFx(x, T)) : it, totF = F.reduce((s, x) => s + (+x.valor || 0), 0);
  return `<td></td>${ant ? `<td colspan="${ant}">` : "<td>"}${fx ? `<b class="ifxs">Filtrado · ${F.length} ${F.length === 1 ? "item" : "itens"}</b><small class="mut">total da lista · ${it.length} ${it.length === 1 ? "item" : "itens"}${g.max ? ` de ${g.max}` : ""}</small>` : `Total · ${it.length} ${it.length === 1 ? "item" : "itens"}${g.max ? ` de ${g.max}` : ""}`}</td><td class="r">${fx ? `<b class="ifxs">${moeda(totF)}</b><small class="mut">de ${moeda(tot)}</small>` : ""}${fx ? "" : moeda(tot)}${g.disp ? `<small class="${tot > g.disp + .005 ? "ierr" : "mut"}">${tot > g.disp + .005 ? "passou " + moeda(tot - g.disp) : "saldo " + moeda(g.disp - tot)}</small>` : ""}</td><td data-col="etq"></td><td data-col="lid"></td><td data-col="obs"></td><td data-col="etp"></td>`; }
function planInd(T) {
  if (!T) return `<div class="iinf">Nenhuma lista neste ano. Use “+ nova lista” para começar.</div>`;
  const R = linhasInd(T), c = T.cota, tot = R.reduce((s, x) => s + x.v, 0), edita = T.k !== "plan", g = regrasInd(T);
  IND.infos = IND.infos || {};
  if (c) IND.infos.cota = `<b>Cota fixa do administrador</b>${c.doc || c.base ? "<br>" + esc(c.doc || c.base) : ""}${c.min ? `<br>Valor mínimo por emenda: ${fm(c.min)}` : ""}${c.max ? `<br>Até ${c.max} emendas` : ""}${c.saude ? `<br>Saúde no mínimo ${c.saude * 100}% da cota; o FUNDAM é a outra parte` : ""}${c.abre && new Date(c.abre) > new Date() ? `<br>Abre em ${new Date(c.abre).toLocaleDateString("pt-BR")}` : ""}`;
  const inf = c ? `<b>Cota fixa do administrador</b> ${botaoI("cota", "Detalhes da cota")}${c.abre && new Date(c.abre) > new Date() ? ` · abre em ${new Date(c.abre).toLocaleDateString("pt-BR")}` : ""}`
    : T.k === "plan" ? "Planilha do gabinete · itens do exercício " + IND.ano : T.k === "avulsos" ? "Indicações fora de lista" : `Lista do gabinete · ${esc(T.L.origem || "")}`;
  const outras = !c && edita ? (() => { const sv = S.cesc; S.cesc = "imp"; const ind = itensCotas().filter((x) => x.ano === IND.ano).reduce((s, x) => s + x.v, 0); S.cesc = sv; const q = QUOTA[IND.ano]; return q ? `<span class="isal">Impositivas ${IND.ano}: saldo <b>${rc(Math.max(0, q - ind))}</b></span>` : ""; })() : "";
  const acs = edita && (T.L || T.cota) ? `<span class="iacs">${T.L && SESS ? botaoLinks(T) : ""}${botaoEtqCol()}${botaoJus()}<button data-icols>${ici("plan")}Colunas</button>${T.L ? `<button data-ireg>${ici("regras")}Regras</button>` : ""}<button data-idoc>${ici("impr")}Documento</button><button data-ixls>${ici("plan")}Planilha de indicação</button><button data-iport title="Baixar a lista de objetos do Portfólio (planilha)">${ICO_BX}Portfólio</button>${T.L && (T.L.regras || {}).fechada ? "" : `<button data-iimp>${ici("min")}Importar planilha</button>`}${T.L && (T.L.regras || {}).fechada ? `<button class="icad fech" data-icad title="Lista fechada e no Controle de Recursos. Clique para reabrir e editar." aria-label="Reabrir a lista">${ici("cad")}</button>` : `<button class="icad" data-icad title="Fechar a lista e levar as emendas ao Controle de Recursos" aria-label="Fechar a lista">${ici("cadab")}</button>`}${T.L && !(T.L.regras || {}).fechada ? `<button class="inov" data-inov title="Incluir linha" aria-label="Incluir linha">${ici("mais")}</button>` : ""}</span>` : "";
  const trava = edita && g.trava ? `<span class="itrava">Área travada: <b>${esc(g.trava)}</b>${(AREAS.find((a) => a[1] === g.trava) || [])[0] ? ` · subação ${AREAS.find((a) => a[1] === g.trava)[0]}` : ""}</span>` : "";
  if (!edita) return `<div class="iinf">${inf}</div><div class="itw"><table class="itb"><thead><tr><th></th><th>Município</th><th>Objeto</th><th>Instr.</th><th class="r">Valor</th><th class="hm">Status</th><th></th></tr></thead><tbody>
    ${R.map((x, i) => `<tr class="ir${IND.det === x.id ? " on" : ""}" data-ir="${esc(x.id)}"><td class="n">${i + 1}</td><td>${esc(x.mun || "—")}</td><td class="ob">${esc(frase(x.obj || ""))}</td><td>${esc(x.ins)}</td><td class="r">${ni(Math.round(x.v))}</td><td class="hm st">${esc(x.st)}</td><td class="ar">›</td></tr>`).join("")}
    <tr class="itt"><td></td><td colspan="3">Total · ${R.length} itens</td><td class="r">${ni(Math.round(tot))}</td><td colspan="2" class="hm"></td></tr></tbody></table></div>`;
  const it = R.map((x) => AD.itens.find((y) => "a:" + y.id === x.id)), vaz = Math.min(g.max ? Math.max(0, g.max - it.length) : 999, (g.max ? Math.min(g.max > 10 ? 3 : g.max, Math.max(0, g.max - it.length)) : 1) + (IND.extra || 0)); // cota grande (LOA, 120): 3 linhas em branco + as incluídas no botão
  return `<div class="iinf">${inf}${trava}${outras}${acs}</div>${typeof faixaGestor === "function" ? faixaGestor(T) : ""}<datalist id="indPes">${pessoas().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><datalist id="indMun">${BASE.mun.map((m) => `<option value="${esc(m.n)}">`).join("")}</datalist>
    <div class="itw"><table class="itb ied"><thead><tr><th></th><th data-col="ent">${thFx("ent", "Ente · mod. · função", T)}</th><th data-col="mun">${thFx("mun", "Município", T)}</th><th data-col="obj">${thFx("obj", "Objeto", T)}</th><th class="r" data-col="val">Valor (R$)</th><th data-col="etq">${thFx("etq", "Etiqueta", T)}</th><th data-col="lid">${thFx("lid", "Líder · contato", T)}</th><th data-col="obs" title="Observações">${thFx("obs", "Obs.", T)}</th><th data-col="etp">${thFx("etp", "Etapa", T)}</th></tr></thead><tbody>
    ${it.map((x, i) => [x, i]).filter(([x]) => passaFx(x, T)).map(([x, i]) => linhaInd(T, g, x, i)).join("")}${temFx() ? "" : Array.from({ length: vaz }, (_, i) => linhaInd(T, g, null, it.length + i)).join("")}
    ${(!g.max || it.length + (temFx() ? 0 : vaz) < g.max) ? `<tr class="iincr"><td></td><td colspan="${nColInd() - 1}"><button class="iinc" data-iinc>${ici("mais")}Incluir linha</button>${temFx() ? `<small class="mut" style="margin-left:8px">tira o filtro para abrir a linha nova</small>` : ""}</td></tr>` : ""}<tr class="itt" id="indRod">${rodapeInd(T, g, it)}</tr></tbody></table></div>`;
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
    if (campos.valor != null && Math.abs((+nx.valor || 0) - campos.valor) > .005) alert("O valor digitado não foi gravado (ficou " + rc(+nx.valor || 0) + "). Confira a linha e digite de novo.");
    const ativo = document.activeElement, campoAt = ativo && tr.contains(ativo) ? ativo.dataset.c : null, sel = ativo && ativo.selectionStart;
    const doL = T.L ? AD.itens.filter((y) => y.lista_id === T.L.id) : T.k === "avulsos" ? AD.itens.filter((y) => !y.lista_id) : [], i0 = doL.findIndex((y) => y.id === nx.id), i = i0 >= 0 ? i0 : [...tr.parentNode.querySelectorAll("tr.iw")].indexOf(tr), ck = tr.nextElementSibling && tr.nextElementSibling.classList.contains("ick") ? tr.nextElementSibling : null;
    const tmp = document.createElement("tbody"); tmp.innerHTML = linhaInd(T, g, nx, i, true); if (ck) ck.remove();
    const novos = [...tmp.children]; tr.replaceWith(...novos); ligarLinha(novos[0], T); if (typeof ligarLinks === "function") novos.forEach((n) => ligarLinks(n, T));   // religa Observações, Etapa e Etiqueta da linha redesenhada
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
    salvarLinha(T, tr, { benef_tipo: t, modalidade: g.mods.includes(ins) ? ins : cur.modalidade || null, beneficiario: t === "ent" ? cur.razao_social || null : null }); });
  { const g2 = regrasInd(T), x0 = () => AD.itens.find((y) => y.id === tr.dataset.iw) || {};
    const qm = tr.querySelector("[data-qm]"); if (qm) qm.onclick = (e) => { e.stopPropagation(); popLista(qm, ["Transferência Especial", "Convênio", "Execução Direta"].map((m) => [m, MOD_I[m] || "doc2", SIG_I[m] + " · " + m, g2.mods.includes(m)]), x0().modalidade, (v) => salvarLinha(T, tr, { modalidade: v })); };
    // custeio ou capital (20/11/2026), no mesmo padrão do botão da função
    const qn = tr.querySelector("[data-qn]"); if (qn) qn.onclick = (e) => { e.stopPropagation(); popLista(qn, [["Custeio", "cus", "Custeio · gasto do dia a dia (serviços, manutenção, consumo)", true], ["Capital", "cap", "Capital · obra ou compra de algo que fica", true]], x0().natureza, (v) => salvarLinha(T, tr, { natureza: v })); };
    const qf = tr.querySelector("[data-qf]"); if (qf) qf.onclick = (e) => { e.stopPropagation(); popLista(qf, AREAS.map((q) => q[1]).map((a) => [a, AREA_I[a] || "plan", a, g2.areas.includes(a)]), x0().area || g2.trava, (v) => salvarLinha(T, tr, { area: v })); }; }
  tr.querySelectorAll("[data-bm]").forEach((b) => b.onclick = () => salvarLinha(T, tr, { modalidade: b.dataset.bm }));
  tr.querySelectorAll("[data-ba]").forEach((b) => b.onclick = () => salvarLinha(T, tr, { area: b.dataset.ba }));
  tr.querySelectorAll("[data-iq]").forEach((b) => b.onclick = () => { const it = T.L ? AD.itens.filter((y) => y.lista_id === T.L.id && y.id !== tr.dataset.iw) : [];
    const v = b.dataset.iq === "min" ? g.min : Math.max(0, Math.round((g.disp - it.reduce((s, y) => s + (+y.valor || 0), 0)) * 100) / 100); salvarLinha(T, tr, { valor: v }); });
  const abre = () => { if (!tr.dataset.iw) return; IND.det = IND.det === "a:" + tr.dataset.iw ? null : "a:" + tr.dataset.iw; desenharInd(); };
  const sx = tr.querySelector("[data-iexp]"); if (sx) sx.onclick = (e) => { e.stopPropagation(); abre(); };
  // abre o detalhamento ao tocar no espaço vazio da linha (fundo da célula), nunca em campo, botão ou texto preenchido
  tr.onclick = (e) => { if (e.target === tr || (e.target.tagName === "TD" && !e.target.classList.contains("n")) || (e.target.closest("td.iob") && !e.target.closest("textarea,button,input,a"))) abre(); };
  tr.addEventListener("focusin", () => marcaAtiva(tr.dataset.iw));
  const l = tr.querySelector("[data-ilimpa]"); if (l) l.onclick = async () => { if (l.dataset.ok !== "1") { l.dataset.ok = "1"; l.textContent = "limpar?"; l.classList.add("ok"); setTimeout(() => { l.dataset.ok = ""; l.innerHTML = ici("x"); l.classList.remove("ok"); }, 3000); return; }
    try { await apagar("gab_itens", tr.dataset.iw); if (IND.det === "a:" + tr.dataset.iw) IND.det = null; desenharInd(); } catch (er) { alert(er.message || er); } };
  tr.querySelector("[data-iobj]").onclick = (e) => { e.stopPropagation(); popObjeto(tr, T); };
  const bo = tr.querySelector("[data-iborr]"); if (bo) bo.onclick = async (e) => { e.stopPropagation(); const y = x(); if (!y) return;
    const ok = await avisoCad("Apagar esta linha?", `<p>A emenda ${y.municipio ? `de <b>${esc(y.municipio)}</b>` : "desta linha"}${+y.valor ? ` (${rc(+y.valor)})` : ""} sai da lista. Não dá para desfazer.</p>${y.chave_emenda ? `<p class="mut">Ela já foi levada ao Controle de Recursos; a linha de lá continua e só pode ser apagada no Controle.</p>` : ""}`, `${ici("borr")}Apagar linha`, true);
    if (!ok) return; try { await apagar("gab_itens", y.id); if (IND.det === "a:" + y.id) IND.det = null; desenharInd(); } catch (er) { alert("Não foi possível apagar: " + (er.message || er)); } };
}
function marcaAtiva(id) { if (!id || IND.ativa === id) return; IND.ativa = id; document.querySelectorAll("#indPg tr.ick").forEach((r) => r.classList.toggle("vis", r.dataset.ick === id || IND.det === "a:" + r.dataset.ick)); }
function ligarPlan(p, T) {
  if (T.L && (T.L.regras || {}).fechada) { const sh = p.querySelector(".isheet"); sh.classList.add("ifech"); sh.querySelectorAll("tr.iw:not([data-iw=''])").forEach((tr) => { tr.querySelectorAll("input,select,textarea,button:not([data-lke]):not([data-iobs]):not([data-ietq])").forEach((el) => { el.disabled = true; }); tr.onclick = (e) => { if (e.target.closest("[data-lke],[data-iobs],[data-ietq]")) return; IND.det = IND.det === "a:" + tr.dataset.iw ? null : "a:" + tr.dataset.iw; desenharInd(); }; });
    sh.querySelectorAll("tr.iw[data-iw=''], tr.ick").forEach((r) => r.remove()); sh.querySelectorAll("textarea").forEach((t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }); sh.querySelectorAll("tr.iexp input, tr.iexp select, tr.iexp textarea, tr.iexp button").forEach((el) => { el.disabled = true; });
    const f = (T.L.regras || {}).fechada_em; sh.querySelector(".iinf").insertAdjacentHTML("afterend", `<div class="ifbar">${ici("cad")}Lista fechada${f ? " em " + new Date(f).toLocaleDateString("pt-BR") : ""} ${botaoI("fech", "Sobre a lista fechada")}</div>`);
    IND.infos = { ...(IND.infos || {}), fech: "A lista foi incluída no Controle de Recursos e está travada. Para editar, toque no cadeado fechado, no alto da planilha." }; ligarLinks(p, T);
    p.querySelectorAll("tr.iexp").forEach((r) => { const x = AD.itens.find((y) => y.id === r.dataset.iexpw); if (x) ligarDet(r, x, T); }); return; }
  p.querySelectorAll("tr.iw").forEach((tr) => ligarLinha(tr, T));
  // "+" verde no topo (23/11/2026): o mesmo "Incluir linha" do fim da tabela, sem precisar rolar até lá
  const inv = p.querySelector("[data-inov]"); if (inv) inv.onclick = () => { const b = p.querySelector("[data-iinc]"); if (b) b.click(); else alert("A lista já chegou ao número máximo de emendas."); };
  const inc = p.querySelector("[data-iinc]"); if (inc) inc.onclick = () => { if (temFx()) { IND.fx = {}; fxSalva(); } else IND.extra = (IND.extra || 0) + 1; desenharInd(); const v = [...document.querySelectorAll("#indPg tr.iw[data-iw='']")].pop(); if (v) { v.scrollIntoView({ block: "center" }); const m = v.querySelector('[data-c="municipio"]'); if (m) m.focus(); } };
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
// objetos de referência (20/11/2026): primeiro o Portfólio de emendas (389 objetos padronizados da Transferência Especial,
// art. 9º, §4º, da LC 898/2026; dados/painel/portfolio-objetos.json), depois os objetos já usados pelo gabinete. Ao escolher um
// objeto do Portfólio, a natureza (Capital ou Custeio) também é preenchida quando é uma só.
let PORTF = null;
async function lerPortfolio() { if (!PORTF) { try { const j = await (await fetch("../dados/painel/portfolio-objetos.json?v=2")).json(); PORTF = j.O.map(([area, cat, obj, nat, org, desc]) => ({ area, cat, obj, nat, org, desc })); } catch (e) { PORTF = []; } } return PORTF; }
// Portfólio limitado à função e à despesa da emenda (20/11/2026): Educação mostra só Educação (e Educação Especial), Saúde
// só Saúde, FUNDAM ou sem função tudo que não é Saúde; com custeio/capital marcado, só os objetos dessa despesa.
// "ver todo o Portfólio" tira o limite.
const AREA_PORT = { "Saúde": ["Saúde"], "Educação": ["Educação", "Educação Especial"], "Agricultura": ["Agricultura e Pesca"], "Infraestrutura e Mobilidade": ["Infraestrutura", "Portos, Aeroportos e Ferrovias"], "Segurança Pública": ["Segurança Pública", "Defesa Civil"] };
const portCompat = (o, area, nat) => { const A = AREA_PORT[area]; return (A ? A.includes(o.area) : area ? o.area !== "Saúde" : true) && (!nat || o.nat === nat || / ou /.test(o.nat)); };
function popObjeto(tr, T) {
  document.querySelectorAll(".ipop").forEach((x) => x.remove());
  const x0 = AD.itens.find((y) => y.id === tr.dataset.iw) || {}, areaX = x0.area || regrasInd(T).trava || "", natX = x0.natureza === "Investimento" ? "Capital" : x0.natureza || ""; let todos = !areaX && !natX;
  const b = tr.querySelector("[data-iobj]"), r = b.getBoundingClientRect(), pop = document.createElement("div"); pop.className = "ipop";
  let aba = "port";
  pop.innerHTML = `<div class="ipab"><button data-ab="port" class="on">Portfólio</button><button data-ab="hist">Já usados pelo gabinete</button></div><div class="iplim" ${todos ? "hidden" : ""}></div><input placeholder="Pesquisar (ex.: ambulância, pavimentação, saúde)"><div class="ipl"></div>`;
  $("#indPg").appendChild(pop); pop.style.top = Math.min(r.bottom + 6, innerHeight - 420) + "px"; pop.style.left = Math.max(12, Math.min(r.left - 300, innerWidth - 500)) + "px";
  const q = pop.querySelector("input"), l = pop.querySelector(".ipl"), nn = (s) => norm(s || "");
  const escolhe = (o, nat) => { pop.remove(); salvarLinha(T, tr, { objeto: o, ...(nat ? { natureza: nat } : {}) }); };
  const lista = async () => { const w = nn(q.value).split(/\s+/).filter(Boolean);
    if (aba === "hist") { const O = objetosRef(q.value); l.innerHTML = O.length ? O.map(([t2, n]) => `<button data-o="${esc(t2)}"><span>${esc(t2)}</span><small>${n}×</small></button>`).join("") : `<div class="mut" style="padding:10px">Nenhum objeto com esse termo.</div>`;
      l.querySelectorAll("[data-o]").forEach((o) => o.onclick = (ev) => { ev.stopPropagation(); escolhe(o.dataset.o); }); return; }
    const lim = pop.querySelector(".iplim"); lim.hidden = aba !== "port" || (!areaX && !natX);
    lim.innerHTML = todos ? `Todo o Portfólio · <button data-lim>só ${esc([areaX, natX.toLowerCase()].filter(Boolean).join(" · "))}</button>` : `Só ${esc([areaX === "FUNDAM" ? "FUNDAM (tudo que não é Saúde)" : areaX, natX.toLowerCase()].filter(Boolean).join(" · "))} · <button data-lim>ver todo o Portfólio</button>`;
    lim.querySelector("[data-lim]").onclick = (ev) => { ev.stopPropagation(); todos = !todos; lista(); };
    const P = (await lerPortfolio()).filter((o) => (todos || portCompat(o, areaX, natX)) && w.every((k) => nn([o.obj, o.area, o.cat, o.desc, o.org].join(" ")).includes(k)));
    const G = {}; P.forEach((o) => (G[o.area] = G[o.area] || []).push(o));
    l.innerHTML = P.length ? Object.entries(G).map(([a, L]) => `<div class="ipga">${esc(a)} <small>${L.length}</small></div>` + L.slice(0, w.length ? 80 : 12).map((o) => `<button data-p="${esc(o.obj)}" data-n="${esc(/ ou /.test(o.nat) ? "" : o.nat)}" title="${esc(o.desc)}"><span>${esc(o.obj)}<em>${esc([o.cat, o.nat, o.org].filter(Boolean).join(" · "))}</em></span></button>`).join("") + (!w.length && L.length > 12 ? `<div class="mut" style="padding:4px 10px 8px;font-size:11.5px">+ ${L.length - 12} · pesquise para ver</div>` : "")).join("") : `<div class="mut" style="padding:10px">Nenhum objeto do Portfólio com esse termo.</div>`;
    l.querySelectorAll("[data-p]").forEach((o) => o.onclick = (ev) => { ev.stopPropagation(); escolhe(o.dataset.p, o.dataset.n); }); };
  pop.querySelectorAll("[data-ab]").forEach((bt) => bt.onclick = (ev) => { ev.stopPropagation(); aba = bt.dataset.ab; pop.querySelectorAll("[data-ab]").forEach((x) => x.classList.toggle("on", x === bt)); q.placeholder = aba === "hist" ? "Pesquisar objetos já usados (ex.: saúde)" : "Pesquisar (ex.: ambulância, pavimentação, saúde)"; lista(); q.focus(); });
  q.oninput = lista; lista(); q.focus();
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
// a planilha de indicação (.xlsx / Google Drive) e a importação ficam em gabinete-ind-planilha.js (02/11/2026)
// detalhamento da emenda dentro da própria linha (expansão), em vez de painel lateral (27/10/2026)
// justificativa sugerida (23/11/2026): com modalidade e objeto escolhidos, o campo vazio mostra em cinza claro um texto
// montado a partir do objeto, do município (ou da entidade) e da área; "Usar a sugestão" copia para o campo
function sugJust(x) { if (!x || !x.modalidade || !String(x.objeto || "").trim()) return "";
  const ob = String(x.objeto).trim(), o = /^[A-ZÁÉÍÓÚ][a-záéíóúãõâêôç]/.test(ob) ? ob[0].toLowerCase() + ob.slice(1) : ob, mun = x.municipio || "", ent = tipoDe(x) === "ent" && (x.razao_social || x.beneficiario);
  const ini = /Execu[çc][ãa]o Direta/i.test(x.modalidade) ? "Execução direta pelo Estado para " : ent ? `Apoio financeiro à entidade ${ent} para ` : "Apoio financeiro para ";
  const A = { "Saúde": `, para uso das Unidades Básicas de Saúde e setores vinculados à Secretaria Municipal de Saúde${mun ? " de " + mun : ""}, para melhor atendimento do usuário.`,
    "Educação": `, em benefício das unidades escolares${mun ? " de " + mun : ""}, para melhoria das condições de ensino e aprendizagem.`,
    "Agricultura": `, em apoio aos produtores rurais${mun ? " de " + mun : ""}, para fortalecimento da produção agropecuária.`,
    "Infraestrutura e Mobilidade": `, para melhoria da infraestrutura e da mobilidade${mun ? " em " + mun : ""}, em benefício da população.`,
    "Segurança Pública": `, para reforço das ações de segurança pública${mun ? " em " + mun : ""}.` };
  return ini + o + (A[x.area] || `, para atendimento das necessidades da população${mun ? " de " + mun : ""}.`); }
function detForm(x, T, g) {
    const F = (k, rot, html, w) => `<label class="tl2 fc2${w ? " w" + w : ""}"><span class="tk">${ic(k)}${rot}</span>${html}</label>`, I = (f, v, ph = "", l = "") => `<input data-d="${f}" value="${esc(v ?? "")}" placeholder="${esc(ph)}"${l ? ` list="${l}"` : ""}>`;
    const S2 = (f, ops, v) => `<select data-d="${f}"><option value="">—</option>${ops.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}${v && !ops.includes(v) ? `<option selected>${esc(v)}</option>` : ""}</select>`, t = tipoDe(x);
    return `<div class="dm2 fm2 iexpd">
      <div class="bnt">
      ${tipoDe(x) === "ent" ? F("hash", "CNPJ", I("cnpj", x.cnpj, "00.000.000/0000-00"), 2) + F("pred", "Razão social", I("razao_social", x.razao_social || x.beneficiario), 2) : ""}${g.trava ? "" : F("lei", "Função", S2("area", g.areas, x.area), 2)}${F("ok", "Status", S2("status", STATUS, x.status || "Em análise"), 2)}
      ${F("pessoa", "Líder", I("lideranca", x.lideranca, "Escolha ou digite", "indPes"), 2)}${F("pessoa", "Contato", I("contato", x.contato, "Quem está tocando o processo"), 2)}
      ${F("band", "Prioridade", S2("prioridade", PRIOR, x.prioridade), 2)}${F("lei", "Lei / PL", I("pl", x.pl, "PL nº 0633/2026"), 2)}
      ${(() => { const sg = !x.justificativa && sugJust(x); return F("doc", `Justificativa${sg ? `<button type="button" class="isug" data-isug title="Copia a sugestão para o campo">usar a sugestão</button>` : ""}`, `<textarea data-d="justificativa" rows="5" class="ijust${sg ? " sug" : ""}" placeholder="${esc(sg || "Por que esta indicação")}">${esc(x.justificativa || "")}</textarea>`, 4); })()}
      ${F("doc", "Observação", `<textarea data-d="observacao" rows="2">${esc(x.observacao || "")}</textarea>`, 4)}</div>
      <datalist id="indPes">${pessoas().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><div class="idrod"><span class="isv mut" data-dmsg></span><button class="ilix" data-ilimpa title="Excluir esta emenda">${ici("lixo")}Excluir emenda</button></div></div>`;
}
function ligarDet(d, x, T) {
    { const en = d.querySelector('[data-d="razao_social"]'), tr = document.querySelector(`#indPg tr.iw[data-iw="${x.id}"]`); if (en && tr) { en.placeholder = "Digite para buscar entidades já atendidas"; en.autocomplete = "off"; ligarEntidade(en, tr, T, d); } }
    // excluir a emenda agora só pelo detalhamento (20/11/2026), com a confirmação ✓ ✕
    const lx = d.querySelector("[data-ilimpa]"); if (lx) lx.onclick = async () => {
      if (!(await confirmaVX("Excluir esta emenda?", `${x.municipio ? esc(x.municipio) : "A linha"}${+x.valor ? " · " + rc(+x.valor) : ""} sai da lista. Não dá para desfazer.${x.chave_emenda ? " A linha que já foi para o Controle de Recursos continua lá." : ""}`))) return;
      try { await apagar("gab_itens", x.id); IND.det = null; desenharInd(); } catch (er) { alert("Não foi possível excluir: " + (er.message || er)); } };
    const msg = d.querySelector("[data-dmsg]");
    const su = d.querySelector("[data-isug]"); if (su) su.onclick = (e) => { e.preventDefault(); const ta = d.querySelector('[data-d="justificativa"]'); ta.value = ta.placeholder; ta.classList.remove("sug"); su.remove(); ta.dispatchEvent(new Event("change")); ta.focus(); };
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
// colunas desligadas (botão "Colunas", gabinete-ind-links.js) somem por CSS
function aplicaColsInd() { let s = document.getElementById("indCols"); if (!s) { s = document.createElement("style"); s.id = "indCols"; document.head.appendChild(s); }
  s.textContent = COLS_OFF.map((k) => `#indPg [data-col="${k}"]{display:none !important}`).join(""); }
function desenharInd() {
  let p = $("#indPg"); if (!p) { p = document.createElement("div"); p.id = "indPg"; document.body.appendChild(p); }
  const A = anosInd(); if (!IND.ano || !A.includes(IND.ano)) IND.ano = A.includes(anoAtual()) ? anoAtual() : A[0];
  const TS = etiquetas(IND.ano); let T = TS.find((t) => t.k === IND.tag); if (!T) { T = TS.find((t) => t.cota && t.cota.prazo && new Date(t.cota.prazo) > new Date()) || TS[0]; IND.tag = T ? T.k : null; }
  if (IND.fxTag !== IND.tag) { IND.fx = fxLer(IND.tag); IND.fxTag = IND.tag; }   // filtros guardados de cada lista voltam ao abrir (20/11/2026)
  p.innerHTML = `<div class="ipg"><button class="ivolta" data-ivolta>‹ Controle de Recursos</button>
    <div class="ihd"><h2>Indicação de recursos</h2><span>${esc([PARL.u, PARL.p].filter(Boolean).join(" · "))}</span></div>
    <div class="ianos">${A.map((a) => `<button class="${a === IND.ano ? "on" : ""}" data-iano="${a}">${a}</button>`).join("")}</div>
    <div class="icapa">${capaInd(T)}</div>
    <div class="itags">${TS.map((t) => `<button class="${t.cota ? "o " : ""}${t === T ? "on" : ""}" data-itag="${esc(t.k)}">${esc(t.nome)}${t.cota ? `<small>${t.L ? AD.itens.filter((x) => x.lista_id === t.L.id && cheia(x)).length : 0}/${t.cota.max || "—"}</small>` : ""}</button>`).join("")}<button class="nw" data-inlista>+ nova lista</button></div>
    <div class="isheet">${planInd(T)}</div></div><div id="indDet"></div>`;
  contador(); detInd();
  p.querySelector("[data-ivolta]").onclick = fecharInd;
  p.querySelectorAll("[data-iano]").forEach((b) => b.onclick = () => { IND.ano = +b.dataset.iano; IND.tag = null; IND.det = null; IND.extra = 0; IND.fxTag = null; desenharInd(); });
  p.querySelectorAll("[data-itag]").forEach((b) => b.onclick = () => { IND.tag = b.dataset.itag; IND.det = null; IND.extra = 0; IND.fxTag = null; desenharInd(); });
  p.querySelector("[data-inlista]").onclick = () => formLista();
  p.querySelectorAll("[data-ir]").forEach((r) => r.onclick = () => { IND.det = IND.det === r.dataset.ir ? null : r.dataset.ir; desenharInd(); });
  if (T && T.k !== "plan") { ligarPlan(p, T); if (!(T.L && (T.L.regras || {}).fechada)) ligarLinks(p, T); }
  aplicaColsInd();
  const rg = p.querySelector("[data-ireg]"); if (rg) rg.onclick = () => formLista(T.L);
  const dc = p.querySelector("[data-idoc]"); if (dc) dc.onclick = () => documentoInd(T);
  const xl = p.querySelector("[data-ixls]"); if (xl) xl.onclick = () => abrirPlanilhaInd(T);
  const im = p.querySelector("[data-iimp]"); if (im) im.onclick = () => importarInd(T);
  const cd = p.querySelector("[data-icad]"); if (cd) cd.onclick = () => (T.L && (T.L.regras || {}).fechada ? reabrirLista(T) : fecharLista(T));
}
// cadeado da lista (28/10/2026): FECHAR leva as emendas ao Controle de Recursos (novas viram linhas com status "Indicada";
// as já levadas são atualizadas com o que mudou) e trava a lista; REABRIR destrava para editar — as emendas continuam no
// Controle e, ao fechar de novo, recebem as alterações. Mudanças feitas direto no Controle não voltam para a lista.
function avisoCad(titulo, html, botao, perigo) { return new Promise((ok) => { let w = document.getElementById("cfCad"); if (w) w.remove();
  document.body.insertAdjacentHTML("beforeend", `<div id="cfCad" class="cfp"><div class="cfb icfb"><b>${titulo}</b><div class="icft">${html}</div><div><button class="lk0" data-x>Cancelar</button><button class="btnp ${perigo ? "ibtd" : "ibtv"}" data-ok>${botao}</button></div></div></div>`);
  w = document.getElementById("cfCad"); const fim = (v) => { w.remove(); ok(v); }; w.querySelector("[data-x]").onclick = () => fim(false); w.onclick = (e) => { if (e.target === w) fim(false); }; w.querySelector("[data-ok]").onclick = () => fim(true); }); }
const linhaCtl = (x, T, ori, obs) => ({ parlamentar: PARL.n, ano: IND.ano, origem: ori, municipio: String(x.municipio || "").toUpperCase(), tags: T.L && T.L.apelido ? [T.L.apelido] : null, regiao: regDe(x) || null, beneficiario: tipoDe(x) === "ent" ? [x.razao_social || x.beneficiario, x.cnpj ? "CNPJ " + x.cnpj : ""].filter(Boolean).join(" · ") : tipoDe(x) === "est" ? "Estado" : "Município", objeto: x.objeto, funcao: x.area || regrasInd(T).trava || null, modalidade: SIG_I[x.modalidade] || x.modalidade || null, valor: +x.valor || null, natureza: x.natureza || null, pl: x.pl || null, ...(obs ? { status_manual: "🔄 Indicada", observacao: obs, indicacao_id: x.id, ...(x.lideranca || x.contato ? { contatos: [...String(x.lideranca || "").split(/\s*,\s*/).filter(Boolean).map((n) => ({ papel: "lider", nome: n, tel: "" })), ...String(x.contato || "").split(/\s*,\s*/).filter(Boolean).map((n) => ({ papel: "tecnico", nome: n, tel: "" }))] } : {}) } : {}) }); // o líder da lista vira o Líder do item no Controle (20/11/2026)
async function fecharLista(T) {
  const it = (T.L ? AD.itens.filter((x) => x.lista_id === T.L.id) : []).filter(cheia), nov = it.filter((x) => !x.chave_emenda), vel = it.filter((x) => x.chave_emenda);
  if (!it.length) { await avisoCad("Nada para fechar", "<p>A lista ainda não tem emendas preenchidas.</p>", "Entendi"); return; }
  const tot = it.reduce((s2, x) => s2 + (+x.valor || 0), 0);
  if (!(await avisoCad("Fechar a lista e levar ao Controle?", `<p>${it.length > 1 ? `As <b>${it.length} emendas</b>` : "A <b>emenda</b>"} (${rc(tot)}) ${it.length > 1 ? "passam" : "passa"} para o <b>Controle de Recursos</b>:</p><ul>${nov.length ? `<li>${nov.length} nova${nov.length > 1 ? "s" : ""} entra${nov.length > 1 ? "m" : ""} com status <b>Indicada</b>;</li>` : ""}${vel.length ? `<li>${vel.length} já levada${vel.length > 1 ? "s" : ""} recebe${vel.length > 1 ? "m" : ""} as alterações feitas aqui;</li>` : ""}<li>a lista fica travada para edição.</li></ul><p class="mut">Você pode reabrir a lista quando quiser, ou alterar as emendas direto no Controle de Recursos.</p>`, `${ici("cad")}Fechar lista`))) return;
  const c = T.cota || {}, ori = c.t === "EX" ? "Emenda impositiva (Excesso da receita)" : c.t === "AN" ? "Emenda impositiva" : (T.L && T.L.origem) || "Emenda impositiva", hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  try {
    if (nov.length) { const { data, error } = await supabaseClient.from("gab_recursos").insert(nov.map((x) => linhaCtl(x, T, ori, `${hoje} - Indicada ao setor de Orçamento${c.doc ? " (" + c.doc + ")" : ""}.` + (x.observacao ? "\n\n" + x.observacao : "")))).select("id,indicacao_id"); if (error) throw error;
      for (const r of data) await gravar("gab_itens", { id: r.indicacao_id, status: "Enviado", chave_emenda: r.id }); }
    for (const x of vel) { const { error } = await supabaseClient.from("gab_recursos").update({ ...linhaCtl(x, T, ori), atualizado_em: new Date().toISOString() }).eq("id", x.chave_emenda); if (error) throw error; }
    T.L = await gravar("gab_listas", { id: T.L.id, regras: { ...(T.L.regras || {}), fechada: true, fechada_em: new Date().toISOString() } });
    if (typeof lerPrivado === "function") { MEU = []; await lerPrivado(); } desenhar(); desenharInd();
  } catch (er) { await avisoCad("Não foi possível fechar", `<p>${esc(er.message || String(er))}</p>`, "Entendi"); } }
async function reabrirLista(T) {
  if (!(await avisoCad("Reabrir a lista para editar?", `<p>As emendas <b>continuam no Controle de Recursos</b>. Ao fechar de novo, o que você mudar aqui é levado para lá.</p>`, `${ici("cadab")}Reabrir`))) return;
  T.L = await gravar("gab_listas", { id: T.L.id, regras: { ...(T.L.regras || {}), fechada: false } }); desenharInd(); }
function abrirInd() {
  IND.aberto = true; desenharInd(); const p = $("#indPg"); document.body.classList.add("ind-on");
  requestAnimationFrame(() => p.classList.add("on")); clearInterval(IND.tick); IND.tick = setInterval(contador, 1000);
}
function fecharInd() { IND.aberto = false; const p = $("#indPg"); if (p) p.classList.remove("on"); document.body.classList.remove("ind-on"); clearInterval(IND.tick); }
// confirmação padrão (20/11/2026, pedido do usuário): caixa com pergunta e botões de ícone ✓ (confirma) e ✕ (cancela);
// Esc ou clique fora cancela, Enter confirma
function confirmaVX(titulo, texto) { return new Promise((ok) => { document.getElementById("cfVX")?.remove();
  const ICv = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>', ICx = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>';
  document.body.insertAdjacentHTML("beforeend", `<div id="cfVX" class="cfp"><div class="cfb cfvx" role="dialog" aria-modal="true"><b>${titulo}</b>${texto ? `<p>${texto}</p>` : ""}<div><button class="vxb x" data-x title="Cancelar (Esc)" aria-label="Cancelar">${ICx}</button><button class="vxb v" data-v title="Confirmar (Enter)" aria-label="Confirmar">${ICv}</button></div></div></div>`);
  const w = document.getElementById("cfVX"), fim = (v) => { document.removeEventListener("keydown", tk, true); w.remove(); ok(v); };
  const tk = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); fim(false); } else if (e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); fim(true); } };
  document.addEventListener("keydown", tk, true); w.onclick = (e) => { if (e.target === w) fim(false); };
  w.querySelector("[data-x]").onclick = () => fim(false); w.querySelector("[data-v]").onclick = () => fim(true); w.querySelector("[data-v]").focus(); }); }
// Esc na página de Indicação: fecha o detalhe aberto; sem detalhe, pergunta antes de sair da página
document.addEventListener("keydown", async (e) => { if (e.key !== "Escape" || !IND.aberto || $("#adModal")?.hidden === false || document.getElementById("cfVX") || document.querySelector(".cfp")) return;
  if (IND.det) { IND.det = null; desenharInd(); return; }
  if (await confirmaVX("Deseja mesmo sair?", "Você volta ao Controle de Recursos. O que já foi indicado continua salvo.")) fecharInd(); });
// quando o Controle redesenha (salvou item, lista, anotação), a página aberta acompanha
(() => { const d0 = desenhar; desenhar = function () { d0.apply(this, arguments); if (IND.aberto) desenharInd(); };
  const m0 = mtab; mtab = function () { m0.apply(this, arguments); if (IND.aberto) detInd(); }; })();
