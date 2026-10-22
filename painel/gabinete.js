// Gabinete · Controle de Recursos (20/10/2026). Carteira do mandato a partir dos dados públicos (Portal da
// Transparência SC + painel da SEF, coletados todo dia em ferramentas/sync_emendas.py) e, para quem tem
// acesso, a camada privada do gabinete (gab_recursos / gab_demandas, migração 71).
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x || 0).toLocaleString("pt-BR"), nf = (x, d = 1) => (x || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (v) => "R$ " + (v >= 1e9 ? nf(v / 1e9, 3) + "B" : v >= 1e6 ? nf(v / 1e6, 2) + " mi" : v >= 1e3 ? nf(v / 1e3, 1).replace(/,0$/, "") + " mil" : ni(v));
const fr = (v) => "R$ " + (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const dtBR = (s) => s ? String(s).slice(0, 10).split("-").reverse().join("/") : "";
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const PUB = LOCAL ? "../dados/gabinete/" : "https://raw.githubusercontent.com/netofloripabr/simulador-legislativo/dados-emendas/dados/gabinete/";
const DEP = { nome: "Napoleão Bernardes", n: "55777", partido: "PSD" };
const ETAPAS = [null, ["Indicada", "#5C6268"], ["Empenhada", "#8FA8E8"], ["Em pagamento", "#C6E62A"], ["Paga", "#34E84A"], ["Impedimento técnico", "#E8432A"]];
const etapa = (e) => (e.imped && /impedimento/i.test(e.imped)) ? 5 : (e.v > 0 && (e.vp || 0) >= e.v * 0.995) ? 4 : (e.vl > 0 || e.vp > 0) ? 3 : (e.ve > 0 || (e.pagamentos_sef || []).length) ? 2 : 1;
const S = { aba: "geral", fech: {}, mq: "", mano: 0, mlim: 80, ano: 0, lente: "rec", busca: "", mod: "", et: new Set([1, 2, 3, 4, 5]), aberto: null, ord: ["v", -1], lim: 60 };
let MEU = [], E = [], META = {}, BASE = null, VOT = null, PRIV = null, PODE = false, SESS = null;

async function iniciar() {
  const [m, mt, b, est] = await Promise.all([fetch(PUB + "mandato-napoleao.json").then((r) => r.json()), fetch(PUB + "meta.json").then((r) => r.json()).catch(() => ({})), fetch("../dados/painel/sc-base.json").then((r) => r.json()), fetch("../dados/painel/sc-estadual.json").then((r) => r.json())]);
  E = m.emendas.map((e) => ({ ...e, et: etapa(e) })); META = mt; BASE = b; VOT = (est.c.find((c) => c.n === DEP.n) || {}).v || [];
  const ix = {}; BASE.mun.forEach((x, i) => { ix[norm(x.n)] = i; }); E.forEach((e) => { e.mi = ix[norm(e.mun)]; });
  try { SESS = supabaseClient ? (await supabaseClient.auth.getSession()).data.session : null; if (SESS) { const r = await supabaseClient.rpc("gab_pode"); PODE = !!r.data; if (PODE) await lerPrivado(); } } catch (e) {}
  // área restrita: por enquanto só administradores (no computador local, liberado para testes)
  if (!PODE && !LOCAL) { $("#app").innerHTML = `<div style="max-width:560px;margin:12vh auto"><div class="olho">Gabinete</div><h1 style="font-size:44px">Área restrita.</h1><p class="lead">O painel Gabinete está em construção e, por enquanto, é liberado só para a administração.${SESS ? "" : " Se você tem acesso, entre com a sua conta."}</p>${SESS ? "" : `<p><a class="btn" href="../?entrar=1" onclick="try{localStorage.setItem('sl_volta',location.href)}catch(e){}" style="display:inline-block;text-decoration:none;margin-top:12px">Entrar</a></p>`}</div>`; return; }
  if (LOCAL && !MEU.length) { try { MEU = await (await fetch("../dados/gabinete/_priv-teste.json")).json(); PRIV = {}; MEU.forEach((r) => { if (r.chave) PRIV[r.chave] = r; }); PRIV._n = MEU.length; PODE = true; } catch (e) {} }
  desenhar();
}
async function lerPrivado() { const { data } = await supabaseClient.from("gab_recursos").select("*").order("origem_planilha", { nullsFirst: false }); MEU = data || []; PRIV = {}; (data || []).forEach((r) => { if (r.chave) PRIV[r.chave] = r; }); PRIV._n = (data || []).length; }

const doAno = () => E.filter((e) => !S.ano || e.ano === S.ano);
// títulos do Gabinete (mesmo formato da página Parlamentares): cada um é uma seção que abre e fecha
const TITULOS = [["rec", "Controle de Recursos", "Emendas e recursos do mandato: a análise geral dos dados oficiais e o seu controle, no formato da planilha do gabinete."],
  ["rh", "RH", "Equipe do gabinete, cargos, lotação e a cota de nomeações."], ["pl", "Processo legislativo", "Proposições, relatorias, pareceres e prazos do mandato."],
  ["ele", "Eleitoral", "Base eleitoral, lideranças e a relação entre votos e presença do mandato."], ["mail", "Mailing", "Contatos de prefeituras, entidades e lideranças, com histórico de atendimento."]];
function desenhar() {
  $("#app").innerHTML = `<div class="olho">Gabinete · ${esc(DEP.nome)}</div><h1>Gabinete<i>.</i></h1><p class="lead">A gestão do mandato em um lugar só. Cada título abaixo é uma frente de trabalho do gabinete.</p>
    ${TITULOS.map(([k, t, d], i) => `<section class="secao${S.fech[k] ?? (i > 0) ? " fech" : ""}" id="t-${k}"><div class="tag" data-t="${k}"><button class="tgs" title="Recolher ou abrir">${S.fech[k] ?? (i > 0) ? "+" : "−"}</button><h2>${t}</h2><p class="lead">${d}</p></div><div class="corpoT" id="c-${k}">${k === "rec" ? corpoRec() : `<div class="obra">Em construção. Este título entra no mesmo formato assim que começarmos a trabalhar nele.</div>`}</div></section>`).join("")}`;
  $("#app").querySelectorAll("[data-t]").forEach((h) => h.onclick = () => { const k = h.dataset.t, sec = h.parentElement; S.fech[k] = !sec.classList.contains("fech"); sec.classList.toggle("fech", S.fech[k]); h.querySelector(".tgs").textContent = S.fech[k] ? "+" : "−"; });
  $("#abas").onclick = (e) => { const b = e.target.closest("[data-aba]"); if (!b) return; S.aba = b.dataset.aba; desenhar(); };
  if (S.aba === "geral") ligarGeral(); else ligarMeu();
}
function corpoRec() {
  return `<div class="chips abas" id="abas">${[["geral", "Análise geral"], ["meu", "Meu controle"]].map(([k, r]) => `<button data-aba="${k}" class="${S.aba === k ? "on" : ""}">${r}</button>`).join("")}</div><div id="corpoAba">${S.aba === "geral" ? geral() : meu()}</div>`;
}
function geral() {
  const L = doAno(), tv = L.reduce((s, e) => s + (e.v || 0), 0), tp = L.reduce((s, e) => s + (e.vp || 0), 0), anos = [...new Set(E.map((e) => e.ano))].sort();
  const cont = [0, 0, 0, 0, 0, 0]; L.forEach((e) => cont[e.et]++);
  
  return `<p class="lead" style="margin-top:14px">Todas as emendas indicadas pelo mandato, com o andamento oficial (empenho, liquidação, pagamento e OB) atualizado todo dia.</p>
    <div class="fonte">Fontes: Portal da Transparência SC e painel de emendas da SEF${META.coletado_em ? ` · coletado em ${esc(dtBR(META.coletado_em))} ${esc(String(META.coletado_em).slice(11, 16))}` : ""}.</div>
    <div class="anos">${[0, ...anos].map((a) => `<button data-ano="${a}" class="${S.ano === a ? "on" : ""}">${a || "Todos"}</button>`).join("")}</div>
    <div class="kpis"><div><b class="a">${fm(tv)}</b><span>indicado</span></div><div><b>${fm(tp)}</b><span>pago</span></div><div><b>${tv ? nf(tp / tv * 100) : "0,0"}%</b><span>executado</span></div><div><b>${ni(L.length)}</b><span>emendas</span></div><div><b>${new Set(L.map((e) => e.mun)).size}</b><span>municípios</span></div></div>
    <div class="funil">${[1, 2, 3, 4, 5].map((k) => cont[k] ? `<i style="width:${cont[k] / L.length * 100}%;background:${ETAPAS[k][1]}" title="${ETAPAS[k][0]}: ${cont[k]}"></i>` : "").join("")}</div>
    <div class="funilL">${[1, 2, 3, 4, 5].map((k) => `<span data-et="${k}" class="${S.et.has(k) ? "" : "off"}"><i style="background:${ETAPAS[k][1]}"></i>${ETAPAS[k][0]} <b>${cont[k]}</b></span>`).join("")}</div>
    <section class="bx"><div class="bxh"><h2>Mapa</h2><p>Recursos do mandato por município e relação com os votos de 2026.</p></div>
      <div class="chips" id="lentes">${[["rec", "Recursos"], ["pago", "% pago"], ["voto", "Votos"], ["rpv", "R$ por voto"]].map(([k, r]) => `<button data-l="${k}" class="${S.lente === k ? "on" : ""}">${r}</button>`).join("")}</div>
      <div class="mapa"><div>${mapa(L)}<div class="leg" id="legM"></div></div><div>${ranking(L)}</div></div></section>
    <section class="bx"><div class="bxh"><h2>Carteira</h2><p>Clique numa emenda para ver a linha do tempo.</p></div>
      <div class="ctl"><input id="busca" placeholder="Município, objeto, beneficiário ou nº" value="${esc(S.busca)}"><select id="mod"><option value="">Todas as modalidades</option>${[...new Set(E.map((e) => e.mod).filter(Boolean))].sort().map((m) => `<option ${S.mod === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
      <div id="tab"></div></section>`;
}
function ligarGeral() {
  $("#corpoAba").querySelectorAll("[data-ano]").forEach((b) => b.onclick = () => { S.ano = +b.dataset.ano; S.aberto = null; desenhar(); });
  $("#corpoAba").querySelectorAll("[data-et]").forEach((b) => b.onclick = () => { const k = +b.dataset.et; S.et.has(k) ? S.et.delete(k) : S.et.add(k); desenhar(); });
  $("#lentes").onclick = (e) => { const b = e.target.closest("[data-l]"); if (!b) return; S.lente = b.dataset.l; desenhar(); };
  $("#busca").oninput = (e) => { S.busca = e.target.value; S.lim = 60; tabela(); };
  $("#mod").onchange = (e) => { S.mod = e.target.value; tabela(); };
  tabela();
}
// ---------- Meu controle: a planilha do gabinete (EM Consolidado), privada ----------
const supr = (r) => /^Suprimida/.test(r.status_manual || "");
function meu() {
  if (!PODE) return `<div class="obra">Entre com a sua conta para ver o seu controle.</div>`;
  if (!MEU.length) return blocoPrivado();
  const anos = [...new Set(MEU.map((r) => r.ano).filter(Boolean))].sort(), A = MEU.filter((r) => !S.mano || r.ano === S.mano), at = A.filter((r) => !supr(r)), sp = A.filter(supr);
  const tot = at.reduce((s, r) => s + (+r.valor || 0), 0), pago = at.filter((r) => r.ob || /pago|executado/i.test(r.status_manual || "")).reduce((s, r) => s + (+r.valor || 0), 0);
  return `<p class="lead" style="margin-top:14px">O controle do gabinete, no formato da planilha "Controle de Recursos". Visível só para você.</p>
    <div class="anos">${[0, ...anos].map((a) => `<button data-mano="${a}" class="${S.mano === a ? "on" : ""}">${a || "Todos"}</button>`).join("")}</div>
    <div class="kpis"><div><b class="a">${fm(tot)}</b><span>recursos ativos</span></div><div><b>${fm(pago)}</b><span>pago ou executado</span></div><div><b>${ni(at.length)}</b><span>linhas</span></div><div><b>${new Set(at.map((r) => norm(r.municipio))).size}</b><span>municípios</span></div><div><b>${ni(sp.length)}</b><span>suprimidas · ${fm(sp.reduce((s, r) => s + (+r.valor || 0), 0))}</span></div></div>
    <section class="bx"><div class="ctl"><input id="mbusca" placeholder="Município, objeto, nº, processo ou tag" value="${esc(S.mq)}"></div><div id="mtab"></div></section>`;
}
function ligarMeu() {
  $("#corpoAba").querySelectorAll("[data-mano]").forEach((b) => b.onclick = () => { S.mano = +b.dataset.mano; desenhar(); });
  const bi = $("#mbusca"); if (bi) bi.oninput = (e) => { S.mq = e.target.value; S.mlim = 80; mtab(); };
  const imp = $("#impBtn"); if (imp) imp.onclick = importar;
  if ($("#mtab")) mtab();
}
function mtab() {
  const q = norm(S.mq), L = MEU.filter((r) => (!S.mano || r.ano === S.mano) && (!q || norm([r.municipio, r.objeto, r.numero, r.processo, (r.tags || []).join(" "), r.origem].join(" ")).includes(q)));
  $("#mtab").innerHTML = `<table class="tb mt"><thead><tr><th>Ano · nº</th><th>Município</th><th class="hm">Objeto</th><th class="hm">Função · mod.</th><th class="v">R$</th><th>Status</th><th class="hm">Processo</th></tr></thead><tbody>${L.slice(0, S.mlim).map((r) => `<tr class="${supr(r) ? "sup" : ""}"><td>${r.ano || ""}${r.numero ? ` · ${esc(r.numero)}` : ""}<small>${esc(r.origem || "")}</small></td><td>${esc(r.municipio || "")}<small>${esc(r.regiao || "")}</small></td><td class="hm">${esc(r.objeto || "")}${(r.tags || []).length ? `<small>${r.tags.map((t) => `<span class="tg">${esc(t)}</span>`).join("")}</small>` : ""}</td><td class="hm">${esc(r.funcao || "")}<small>${esc(r.modalidade || "")}</small></td><td class="v">${fr(+r.valor || 0)}</td><td>${esc(r.status_manual || "")}</td><td class="hm">${esc(r.processo || "")}</td></tr>`).join("")}</tbody></table>
    ${L.length > S.mlim ? `<button class="btn sec mais" id="mmais">Mostrar mais (${L.length - S.mlim})</button>` : ""}<div class="av"><b>${ni(L.length)}</b> linhas</div>`;
  const m = $("#mmais"); if (m) m.onclick = () => { S.mlim += 200; mtab(); };
}

// ---------- mapa de SC: bolha por município (tamanho = valor; cor = lente) ----------
function mapa(L) {
  const C = BASE.contorno; let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9;
  C.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 700, Sx = W / ((lo1 - lo0) * K), H = (la0 - la1) * Sx, P = (lo, la) => [(lo - lo0) * K * Sx, (la0 - la) * Sx];
  const pth = C.map((an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("")).join("");
  const A = agregado(L), mxV = Math.max(1, ...Object.values(A).map((o) => o.v)), mxVt = Math.max(1, ...VOT), rp = Object.values(A).filter((o) => o.vt).map((o) => o.v / o.vt).sort((a, b) => a - b), r95 = rp[Math.floor(rp.length * .9)] || 1;
  let bol = "";
  BASE.mun.forEach((m, i) => { const o = A[i], [x, y] = P(m.lon, m.lat), vt = VOT[i] || 0;
    if (S.lente === "voto") { if (!vt) return; const r = 1.5 + 16 * Math.sqrt(vt / mxVt); bol += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${o ? "#2B5FD9" : "#6B7178"}" fill-opacity="${o ? .75 : .35}"><title>${esc(m.n)}: ${ni(vt)} votos${o ? " · " + fm(o.v) : " · sem recurso"}</title></circle>`; return; }
    if (!o) { bol += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.2" fill="#2A3034"/>`; return; }
    const r = 3 + 20 * Math.sqrt(o.v / mxV), pg = o.v ? o.vp / o.v : 0;
    const cor = S.lente === "pago" ? `hsl(${Math.round(pg * 120)},70%,52%)` : S.lente === "rpv" ? (o.vt ? `rgba(43,95,217,${(.25 + .75 * Math.min(1, (o.v / o.vt) / r95)).toFixed(2)})` : "#E8432A") : "#2B5FD9";
    bol += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${cor}" fill-opacity="${S.lente === "rec" ? .6 : .85}" stroke="#0B0F0D" stroke-width=".6"><title>${esc(m.n)}: ${fm(o.v)} · ${o.n} emenda${o.n > 1 ? "s" : ""} · ${nf(pg * 100, 0)}% pago · ${ni(o.vt)} votos${o.vt ? " · " + fr(o.v / o.vt) + "/voto" : ""}</title></circle>`; });
  setTimeout(() => { const lg = $("#legM"); if (lg) lg.textContent = { rec: "Tamanho: valor indicado no município.", pago: "Tamanho: valor indicado. Cor: do vermelho (nada pago) ao verde (tudo pago).", voto: "Tamanho: votos de 2026. Azul: município com recurso indicado; cinza: sem recurso.", rpv: "Tamanho: valor indicado. Quanto mais escuro, mais reais por voto; vermelho: recurso onde não houve voto." }[S.lente]; });
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}"><path d="${pth}" fill="rgba(242,244,245,.035)" stroke="rgba(242,244,245,.14)" stroke-width=".6"/>${bol}</svg>`;
}
function agregado(L) { const A = {}; L.forEach((e) => { if (e.mi == null) return; const o = A[e.mi] = A[e.mi] || { v: 0, vp: 0, n: 0, vt: VOT[e.mi] || 0 }; o.v += e.v || 0; o.vp += e.vp || 0; o.n++; }); return A; }
function ranking(L) {
  const A = agregado(L), R = Object.entries(A).map(([i, o]) => ({ m: BASE.mun[i], ...o }));
  const ord = S.lente === "voto" ? BASE.mun.map((m, i) => ({ m, vt: VOT[i] || 0, v: (A[i] || {}).v || 0 })).filter((o) => o.vt).sort((a, b) => b.vt - a.vt) : S.lente === "rpv" ? R.filter((o) => o.vt).sort((a, b) => b.v / b.vt - a.v / a.vt) : S.lente === "pago" ? R.sort((a, b) => a.vp / a.v - b.vp / b.v) : R.sort((a, b) => b.v - a.v);
  const tit = { rec: "Municípios com mais recurso", pago: "Menor execução", voto: "Municípios com mais votos", rpv: "Mais reais por voto" }[S.lente];
  const val = (o) => S.lente === "voto" ? `${ni(o.vt)}<small>${o.v ? fm(o.v) : "sem recurso"}</small>` : S.lente === "rpv" ? `${fr(o.v / o.vt)}<small>${fm(o.v)} · ${ni(o.vt)} votos</small>` : S.lente === "pago" ? `${nf(o.vp / o.v * 100, 0)}%<small>${fm(o.vp)} de ${fm(o.v)}</small>` : `${fm(o.v)}<small>${o.n} emenda${o.n > 1 ? "s" : ""} · ${ni(o.vt)} votos</small>`;
  return `<div class="olho" style="margin-bottom:6px">${tit}</div><ol class="rk">${ord.slice(0, 12).map((o, k) => `<li><i>${k + 1}º</i><span>${esc(o.m.n)}<small>${esc(o.m.assoc || "")}</small></span><b>${val(o)}</b></li>`).join("")}</ol>`;
}

// ---------- carteira ----------
function filtradas() { const q = norm(S.busca); return doAno().filter((e) => S.et.has(e.et) && (!S.mod || e.mod === S.mod) && (!q || norm([e.mun, e.obj, e.benef, e.k, e.n, e.assoc].join(" ")).includes(q))); }
function tabela() {
  const L = filtradas().sort((a, b) => { const [c, d] = S.ord, x = a[c] ?? "", y = b[c] ?? ""; return (x > y ? 1 : x < y ? -1 : 0) * d; });
  const cab = [["k", "Emenda"], ["mun", "Município"], ["obj", "Objeto", "hm"], ["v", "Valor", "v"], ["vp", "Pago", "v hm"], ["et", "Etapa"]];
  $("#tab").innerHTML = `<table class="tb"><thead><tr>${cab.map(([k, r, c]) => `<th data-o="${k}" class="${c || ""}">${r}${S.ord[0] === k ? (S.ord[1] > 0 ? " ↑" : " ↓") : ""}</th>`).join("")}</tr></thead><tbody>${L.slice(0, S.lim).map((e) => linha(e)).join("")}</tbody></table>
    ${L.length > S.lim ? `<button class="btn sec mais" id="mais">Mostrar mais (${L.length - S.lim})</button>` : ""}<div class="av"><b>${ni(L.length)}</b> emendas · ${fm(L.reduce((s, e) => s + (e.v || 0), 0))}</div>`;
  $("#tab").querySelectorAll("th[data-o]").forEach((th) => th.onclick = () => { const k = th.dataset.o; S.ord = [k, S.ord[0] === k ? -S.ord[1] : (k === "v" || k === "vp" ? -1 : 1)]; tabela(); });
  $("#tab").querySelectorAll("tr.r").forEach((tr) => tr.onclick = () => { S.aberto = S.aberto === tr.dataset.k ? null : tr.dataset.k; tabela(); });
  const m = $("#mais"); if (m) m.onclick = () => { S.lim += 100; tabela(); };
}
function linha(e) {
  const ab = S.aberto === e.k, et = [1, 2, 3, 4].map((k) => `<i class="${e.et === 5 ? (k === 1 ? "imp" : "") : k <= e.et ? "on" : ""}"></i>`).join("");
  return `<tr class="r${ab ? " ab" : ""}" data-k="${esc(e.k)}"><td>${esc(e.n || e.k)}<small>${e.ano} · ${esc(e.tipo || "")}</small></td><td>${esc(e.mun)}<small>${esc(e.assoc || "")}</small></td><td class="hm">${esc(e.obj)}<small>${esc(e.mod || "")}</small></td><td class="v">${fr(e.v)}</td><td class="v hm">${fr(e.vp)}</td><td><span class="et">${et}<em>${ETAPAS[e.et][0]}</em></span></td></tr>${ab ? `<tr class="det"><td colspan="6">${detalhe(e)}</td></tr>` : ""}`;
}
function detalhe(e) {
  const X = e.extrato_portal || {}, Id = X.emendaIdentificacao || {}, PT = X.emendaPlanoTrabalho || {};
  const ev = []; ev.push([1, "Indicada", `${e.mod || ""} · ${fr(e.v)}`]);
  (X.emendaEmpenho || []).forEach((x) => ev.push([1, "Empenho " + (x.nunotaempenho || ""), dtBR(x.dtlancamento || "")]));
  (X.emendaLiquidacao || []).forEach((x) => ev.push([1, "Liquidação " + (x.nunotaliquidacao || ""), dtBR(x.dtlancamento || "")]));
  (e.pagamentos_sef || []).forEach(([ne, nl, pp, ob, dt, v]) => ev.push([1, "Pagamento " + (ob || pp || ""), `${dtBR(dt)} · ${fr(v)}${ne ? " · " + ne : ""}${nl ? " · " + nl : ""}${pp ? " · " + pp : ""}`]));
  if (!(e.pagamentos_sef || []).length && e.et < 4) ev.push([0, "Pagamento", "ainda não pago"]);
  if (e.et === 5) ev.push([0, "Impedimento técnico", e.imped || ""]);
  const p = PRIV && PRIV[e.k];
  return `<div class="dg"><div><div class="olho" style="margin-bottom:8px">Linha do tempo</div><ul class="tl">${ev.map(([on, t, d]) => `<li class="${on ? "on" : ""}"><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ul></div>
    <div><div class="kv"><span>Beneficiário</span><b>${esc(e.benef || "")}${e.doc ? `<small style="display:block;color:var(--ter)">${esc(e.doc)}</small>` : ""}</b><span>Tipo</span><b>${esc(e.tben || "")}</b><span>Origem</span><b>${esc(e.tipo || "")}</b><span>Processo</span><b>${e.sgpe ? `<a href="https://sgpe.sea.sc.gov.br/sgpe/" target="_blank" rel="noopener">${esc(e.sgpe)}</a>` : "não informado pela SEF"}</b>${Id.nmsubacao ? `<span>Subação</span><b>${esc(Id.nmsubacao)}</b>` : ""}${PT.deobjeto ? `<span>Plano de trabalho</span><b style="font-weight:400">${esc(PT.deobjeto)}</b>` : ""}</div>
    ${p ? `<div class="priv"><div class="olho" style="margin-bottom:4px">Anotações do gabinete</div>${p.observacao ? `<div>${esc(p.observacao)}</div>` : ""}${p.status_manual ? `<div>Status anterior: <b>${esc(p.status_manual)}</b></div>` : ""}${(p.tags || []).map((t) => `<span class="tg">${esc(t)}</span>`).join("")}</div>` : ""}</div></div>`;
}

// ---------- camada privada: importar a planilha do gabinete ----------
function blocoPrivado() {
  const n = PRIV ? PRIV._n : 0;
  return `<div class="bx" style="margin-top:18px"><div class="bxh" style="margin-bottom:6px"><h2 style="font-size:20px">Dados do gabinete</h2><p>visíveis só para você</p></div>
    ${n ? `<div class="av"><b>${n}</b> recursos da planilha ligados às emendas oficiais. As anotações aparecem dentro de cada emenda.</div>` : `<div class="av">Importe a planilha "Controle de Recursos" (.xlsx). As abas EM Consolidado e Demandas são gravadas só na sua conta.</div><p style="margin:10px 0 0"><input type="file" id="impArq" accept=".xlsx" hidden><button class="btn" id="impBtn">Importar planilha</button> <span class="av" id="impMsg"></span></p>`}</div>`;
}
async function importar() {
  const inp = $("#impArq"); inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const msg = $("#impMsg"); msg.textContent = "Lendo a planilha…";
    try {
      if (!window.XLSX) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); });
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true }), linhas = (nm, h) => XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, range: h, defval: null });
      const tx = (v) => v == null || v === "" || v === "#N/A" ? null : String(v).trim(), nu = (v) => typeof v === "number" ? Math.round(v * 100) / 100 : null, dt = (v) => v instanceof Date ? v.toISOString().slice(0, 10) : null;
      const R = linhas("EM Consolidado", 1).filter((r) => r[1]).map((r) => { const ano = typeof r[2] === "number" ? r[2] : null, nr = typeof r[3] === "number" ? String(r[3]) : tx(r[3]) === "-" ? null : tx(r[3]);
        return { ano, origem: tx(r[1]) && tx(r[1]).replace(/\s+/g, " "), numero: nr, chave: ano && nr && /^\d+$/.test(nr) ? `${ano}-${nr.padStart(6, "0")}` : null, municipio: tx(r[4]), regiao: tx(r[5]), beneficiario: tx(r[6]), objeto: tx(r[7]), funcao: tx(r[8]), modalidade: tx(r[9]), valor: nu(r[10]), status_manual: tx(r[11]), info_pl: tx(r[12]), processo: tx(r[13]), observacao: tx(r[14]), tags: tx(r[15]) ? tx(r[15]).split(",").map((t) => t.trim()).filter(Boolean) : null, orientacao: tx(r[16]), publicacao: tx(r[17]), empenho: tx(r[18]), liquidacao: tx(r[19]), pagamento: tx(r[20]), ob: tx(r[21]), data_pagamento: dt(r[22]), origem_planilha: typeof r[0] === "number" ? r[0] : null }; });
      const Dm = wb.Sheets["Demandas"] ? linhas("Demandas", 2).filter((r) => r[2] || r[5]).map((r) => ({ ano: typeof r[1] === "number" ? r[1] : null, municipio: tx(r[2]), regiao: tx(r[3]), valor: nu(r[4]), objeto: tx(r[5]), demandante: tx(r[6]), data_cadastro: dt(r[7]), observacao: tx(r[8]) })) : [];
      msg.textContent = `Gravando ${R.length} recursos e ${Dm.length} demandas…`;
      for (let i = 0; i < R.length; i += 200) { const { error } = await supabaseClient.from("gab_recursos").insert(R.slice(i, i + 200)); if (error) throw error; }
      for (let i = 0; i < Dm.length; i += 200) { const { error } = await supabaseClient.from("gab_demandas").insert(Dm.slice(i, i + 200)); if (error) throw error; }
      await lerPrivado(); desenhar();
    } catch (er) { msg.textContent = "Não foi possível importar: " + (er.message || er); } };
  inp.click();
}
iniciar();
