// Gabinete › Processo legislativo › Comissões (18/11/2026; protótipo aprovado: prototipos/comissoes-tramitacao/painel.html).
// As proposições que tramitam hoje nas comissões permanentes da ALESC. Dados: dados/painel/alesc-comissoes-tram.json, gerado toda
// noite por ferramentas/comissoes/tramitacao.mjs + painel-comissoes.mjs --json (e-Legis). Lido só quando o bloco é aberto.
// Gerado a partir de ferramentas/comissoes/painel-comissoes.html (CSS com prefixo .cmp, JS no contêiner #cmpB).
const CMP_CSS = `.cmp{ --fundo:#0B0F0D; --sup:#14191A; --sup2:#1B2022; --sup3:#232A2C; --linha:rgba(242,244,245,.09); --linha2:rgba(242,244,245,.16);
  --texto:#F2F4F5; --sec:#A9AEB3; --ter:#6B7178; --a:#5B83F0; --ok:#34E84A; --okb:rgba(52,232,74,.14); --or:#E8822A; --erro:#E8432A;  }
.cmp .pg-x{ max-width:1320px; margin:0 auto; padding-block:28px 60px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }
.cmp .tag{ display:flex; align-items:center; gap:18px; flex-wrap:wrap; padding:18px 22px; border:1px solid rgba(242,244,245,.06); background:rgba(242,244,245,.018); border-radius:16px; }
.cmp .tag h1{ margin:0; font-size:clamp(30px,4.4vw,48px); font-weight:900; letter-spacing:-.05em; line-height:.95; }
.cmp .tag p{ flex:1; min-width:240px; margin:0; color:var(--sec); max-width:70ch; }
.cmp .tag .at{ font-size:11px; color:var(--ter); white-space:nowrap; }
.cmp .kpi{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; margin:18px 0 0; }
.cmp .kpi button{ text-align:left; background:var(--sup); border:1px solid var(--linha); border-radius:14px; padding:12px 14px; cursor:pointer; transition:border-color .15s; }
.cmp .kpi button:hover{ border-color:var(--linha2); }
.cmp .kpi button.on{ border-color:var(--texto); }
.cmp .kpi b{ display:block; font-size:26px; font-weight:800; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.cmp .kpi span{ font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); }
.cmp .kpi small{ display:block; color:var(--sec); font-size:12px; margin-top:2px; }
.cmp .st{ font-size:10.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--ter); margin:24px 0 8px; display:flex; justify-content:space-between; }
.cmp .coms{ display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; }
.cmp .com{ text-align:left; background:var(--sup); border:1px solid var(--linha); border-radius:14px; padding:10px 12px; cursor:pointer; display:grid; gap:4px; transition:border-color .15s, background .15s; }
.cmp .com:hover{ border-color:var(--linha2); }
.cmp .com.on{ background:var(--texto); color:#0B0F0D; border-color:var(--texto); }
.cmp .com.on .cn,.cmp .com.on .cmd{ color:#3F454B; }
.cmp .com .cs{ display:flex; align-items:baseline; justify-content:space-between; gap:6px; }
.cmp .com .cs b{ font-size:15px; font-weight:800; letter-spacing:-.01em; }
.cmp .com .cs em{ font-style:normal; font-size:20px; font-weight:800; font-variant-numeric:tabular-nums; }
.cmp .com .cn{ font-size:11.5px; color:var(--sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cmp .com .cmd{ font-size:10.5px; color:var(--ter); }
.cmp .cbar{ display:flex; height:5px; border-radius:3px; overflow:hidden; background:var(--sup3); gap:1px; }
.cmp .cbar i{ display:block; }
.cmp .com.on .cbar{ background:#D3D6D8; }
.cmp .lg{ display:flex; gap:14px; flex-wrap:wrap; font-size:11.5px; color:var(--sec); margin-top:8px; }
.cmp .lg i{ display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
.cmp .bar{ top:64px !important; display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:22px 0 10px; position:sticky; top:0; z-index:5; padding:10px 0; background:linear-gradient(var(--fundo) 80%, rgba(11,15,13,0)); }
.cmp .busca{ flex:1 1 260px; display:flex; align-items:center; gap:8px; background:var(--sup); border:1px solid var(--linha); border-radius:999px; padding:0 14px; height:40px; }
.cmp .busca input{ flex:1; background:none; border:0; outline:none; font-size:13.5px; }
.cmp .busca svg{ width:15px; height:15px; color:var(--ter); flex:none; }
.cmp .leq{ display:inline-flex; align-items:center; gap:8px; padding:4px 6px 4px 14px; border:1px solid var(--linha); border-radius:999px; background:var(--sup); height:40px; }
.cmp .leq span{ font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); font-weight:600; }
.cmp .leq select{ background:var(--sup2); border:0; border-radius:999px; padding:6px 10px; font-size:13px; font-weight:600; max-width:200px; }
.cmp .vis{ display:flex; gap:2px; background:var(--sup); border:1px solid var(--linha); border-radius:999px; padding:3px; height:40px; }
.cmp .vis button{ background:none; border:0; border-radius:999px; padding:0 14px; color:var(--sec); font-weight:600; cursor:pointer; font-size:13px; }
.cmp .vis button.on{ background:var(--texto); color:#0B0F0D; }
.cmp .limpa{ background:none; border:0; color:var(--a); cursor:pointer; font-size:12.5px; padding:0 6px; }
.cmp .res{ font-size:12.5px; color:var(--sec); margin:2px 0 10px; }
.cmp .res b{ color:var(--texto); }
.cmp .lista{ background:var(--sup); border:1px solid var(--linha); border-radius:18px; overflow:hidden; }
.cmp .cab,.cmp .lin{ display:grid; grid-template-columns:118px minmax(0,1fr) 150px 150px 140px 210px; gap:14px; align-items:center; padding:12px 16px; }
.cmp .cab{ font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); font-weight:600; border-bottom:1px solid var(--linha); background:rgba(242,244,245,.015); }
.cmp .cab button{ background:none; border:0; padding:0; font:inherit; color:inherit; letter-spacing:inherit; text-transform:inherit; cursor:pointer; text-align:left; }
.cmp .cab button i{ font-style:normal; margin-left:4px; color:#3A4045; }
.cmp .cab button.on,.cmp .cab button.on i{ color:var(--texto); }
.cmp .lin{ border-bottom:1px solid rgba(242,244,245,.05); cursor:pointer; transition:background .12s; }
.cmp .lin:hover{ background:rgba(242,244,245,.025); }
.cmp .lin.ab{ background:rgba(242,244,245,.035); }
.cmp .cmeto{ display:inline-grid; grid-template-columns:auto auto; border-radius:6px; overflow:hidden; font-size:11px; font-weight:700; letter-spacing:.02em; line-height:1; }
.cmp .cmeto b{ background:#E6E8EA; color:#0B0F0D; padding:5px 7px; }
.cmp .cmeto span{ background:var(--sup3); color:var(--texto); padding:5px 7px; font-variant-numeric:tabular-nums; }
.cmp .cmeto.plc b{ background:#B9BEC2; }
.cmp .cmeto.pec b{ background:#7E848A; color:#fff; }
.cmp .cmeto.out b{ background:#3F454B; color:#fff; }
.cmp .prot{ display:block; font-size:11px; color:var(--ter); margin-top:6px; }
.cmp .obj b{ display:block; font-weight:600; font-size:14px; line-height:1.35; text-wrap:pretty; }
.cmp .obj .cmvb{ display:inline-block; font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--sec); border:1px solid var(--linha2); border-radius:999px; padding:1px 7px; margin-right:6px; vertical-align:2px; }
.cmp .obj small{ display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; color:var(--ter); font-size:12px; margin-top:3px; }
.cmp .aut{ font-size:13px; color:var(--sec); }
.cmp .aut small{ display:block; font-size:11px; color:var(--ter); }
.cmp .na b{ display:inline-block; font-size:12px; font-weight:800; background:var(--texto); color:#0B0F0D; border-radius:6px; padding:3px 7px; }
.cmp .na small{ display:block; font-size:11px; color:var(--ter); margin-top:5px; }
.cmp .idade{ font-variant-numeric:tabular-nums; font-weight:700; }
.cmp .idade.v{ color:var(--sec); }
.cmp .idade.m{ color:#E9C46A; }
.cmp .idade.l{ color:var(--or); }
.cmp .rel{ font-size:13px; }
.cmp .rel small{ display:block; font-size:11px; color:var(--ter); }
.cmp .rel .sem{ color:var(--ter); font-style:italic; }
.cmp .fl{ display:flex; align-items:center; flex-wrap:wrap; gap:0; row-gap:6px; }
.cmp .fl .p{ display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700; letter-spacing:.02em; border-radius:999px; padding:3px 8px; border:1px solid var(--linha2); color:var(--ter); white-space:nowrap; }
.cmp .fl .p.ok{ background:var(--okb); border-color:rgba(52,232,74,.35); color:#8FE89B; }
.cmp .fl .p.ok::before{ content:"✓"; font-size:10px; }
.cmp .fl .p.atual{ background:var(--texto); border-color:var(--texto); color:#0B0F0D; box-shadow:0 0 0 3px rgba(242,244,245,.12); }
.cmp .fl .p.falta{ border-style:dashed; }
.cmp .fl .ln{ width:10px; height:1px; background:var(--linha2); }
.cmp .fl .ln.ok{ background:rgba(52,232,74,.45); }
.cmp .det{ grid-column:1 / -1; display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:18px; padding:4px 0 8px; cursor:default; }
.cmp .det h4{ margin:0 0 8px; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--ter); font-weight:600; }
.cmp .det p{ margin:0 0 10px; color:var(--sec); }
.cmp .passos{ display:grid; gap:6px; }
.cmp .passo{ display:grid; grid-template-columns:56px minmax(0,1fr) auto; gap:10px; align-items:start; border:1px solid var(--linha); border-radius:12px; padding:8px 10px; }
.cmp .passo .ps{ font-weight:800; font-size:12px; }
.cmp .passo .pn{ font-size:12.5px; }
.cmp .passo .pn small{ display:block; color:var(--ter); font-size:11.5px; }
.cmp .passo .pr{ text-align:right; font-size:11.5px; color:var(--sec); white-space:nowrap; }
.cmp .passo.ok{ border-color:rgba(52,232,74,.28); }
.cmp .passo.ok .ps{ color:#8FE89B; }
.cmp .passo.atual{ border-color:var(--texto); }
.cmp .passo.falta{ border-style:dashed; opacity:.75; }
.cmp .tl{ list-style:none; margin:0; padding:0; border-left:1px solid var(--linha2); margin-left:4px; }
.cmp .tl li{ position:relative; padding:0 0 8px 14px; font-size:12px; color:var(--sec); }
.cmp .tl li::before{ content:""; position:absolute; left:-4px; top:5px; width:7px; height:7px; border-radius:50%; background:var(--sup3); border:1px solid var(--linha2); }
.cmp .tl li:last-child::before{ background:var(--texto); }
.cmp .tl li b{ color:var(--texto); font-weight:600; font-variant-numeric:tabular-nums; margin-right:6px; }
.cmp .lk{ color:var(--a); font-size:12.5px; text-decoration:none; }
.cmp .lk:hover{ text-decoration:underline; }
.cmp .mais{ display:block; width:100%; background:none; border:0; border-top:1px solid var(--linha); padding:14px; color:var(--sec); font-weight:600; cursor:pointer; }
.cmp .mais:hover{ color:var(--texto); }
.cmp .vazio{ padding:40px 16px; text-align:center; color:var(--ter); }
.cmp .quadro{ display:grid; grid-auto-flow:column; grid-auto-columns:minmax(270px, 1fr); gap:10px; overflow-x:auto; padding-bottom:10px; }
.cmp .qc{ background:var(--sup); border:1px solid var(--linha); border-radius:16px; display:flex; flex-direction:column; max-height:78vh; min-width:0; }
.cmp .qc > h3{ margin:0; padding:12px 14px; font-size:14px; display:flex; justify-content:space-between; gap:8px; border-bottom:1px solid var(--linha); }
.cmp .qc > h3 small{ color:var(--ter); font-weight:600; }
.cmp .qc .qs{ overflow:auto; padding:8px; display:grid; gap:6px; align-content:start; }
.cmp .card{ background:var(--sup2); border:1px solid var(--linha); border-radius:12px; padding:9px 10px; display:grid; gap:6px; cursor:pointer; }
.cmp .card:hover{ border-color:var(--linha2); }
.cmp .card .t{ display:flex; justify-content:space-between; gap:8px; align-items:center; }
.cmp .card b{ font-size:12.5px; font-weight:600; line-height:1.35; }
.cmp .card small{ font-size:11px; color:var(--ter); }
@media (max-width:1100px){.cmp .cab{ display:none; }
.cmp .lin{ grid-template-columns:minmax(0,1fr) auto; gap:8px 12px; }
.cmp .lin > .obj{ grid-column:1 / -1; order:-1; }
.cmp .lin > .aut,.cmp .lin > .rel{ font-size:12px; }
.cmp .lin > .fl{ grid-column:1 / -1; }
.cmp .det{ grid-template-columns:minmax(0,1fr); }
.cmp .kpi{ grid-template-columns:repeat(2, minmax(0,1fr)); }}
@media (prefers-reduced-motion:reduce){}`;
let CMP_D = null;
const corpoPL = () => `<div class="rhb${S.fech.cmpB === false ? "" : " fech"}" id="cmpB"><h3 data-bk="cmpB">Comissões · proposições em tramitação<small id="cmpAt">proposições nas comissões permanentes · e-Legis</small></h3><div id="cmpC"><p class="rh-nt">Carregando…</p></div></div>`;
async function cmpAbrir() { const R = document.getElementById("cmpC"); if (!R || R.dataset.ok) return; R.dataset.ok = "1";
  if (!document.getElementById("cmpCss")) { const st = document.createElement("style"); st.id = "cmpCss"; st.textContent = CMP_CSS; document.head.appendChild(st); }
  try { if (!CMP_D) CMP_D = await (await fetch("../dados/painel/alesc-comissoes-tram.json?v=" + new Date().toISOString().slice(0, 10))).json(); }
  catch (e) { R.innerHTML = `<p class="rh-nt">Não foi possível carregar as comissões.</p>`; delete R.dataset.ok; return; }
  R.innerHTML = `<div class="cmp">
  
  <div class="kpi" id="kpi"></div>
  <div class="st"><span>Por comissão · toque para filtrar</span><span id="stc"></span></div>
  <div class="coms" id="coms"></div>
  <div class="lg"><span><i style="background:#5B83F0"></i>com relator</span><span><i style="background:#3A4045"></i>aguardando relator</span><span><i style="background:#E8822A"></i>há mais de 90 dias na comissão</span></div>
  <div class="bar" id="bar">
    <label class="busca"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3.5 3.5"/></svg><input id="q" placeholder="Buscar número, autor, relator ou assunto" aria-label="Buscar" autocomplete="off"></label>
    <label class="leq"><span>Tipo</span><select id="fTipo"></select></label>
    <label class="leq"><span>Tema</span><select id="fTema"></select></label>
    <label class="leq"><span>Relator</span><select id="fRel"></select></label>
    <label class="leq"><span>Autor</span><select id="fAut"></select></label>
    <label class="leq"><span>Na comissão há</span><select id="fIdade"><option value="">Qualquer tempo</option><option value="0">Até 30 dias</option><option value="1">31 a 90 dias</option><option value="2">Mais de 90 dias</option></select></label>
    <div class="vis" role="group" aria-label="Visão"><button data-v="lista" class="on">Lista</button><button data-v="quadro">Quadro</button></div>
    <button class="limpa" id="limpa">Limpar filtros</button>
  </div>
  <div class="res" id="res"></div>
  <div id="vista"></div>
</div>`; cmpIniciar(CMP_D, R.querySelector(".cmp")); }
function cmpIniciar(D, R) {


const $ = (s) => R.querySelector(s), esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ni = (n) => (n || 0).toLocaleString("pt-BR"), br = (d) => d ? d.split("-").reverse().join("/") : "—";
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const F = { com: "", q: "", tipo: "", tema: "", rel: "", aut: "", idade: "", kpi: "", ord: ["dias", -1], vis: "lista", lim: 60, ab: null };
const faixa = (d) => d == null ? "" : d <= 30 ? "v" : d <= 90 ? "m" : "l";
const ETQ = { PL: "", PLC: "plc", PEC: "pec" };
const etq = (x) => `<span class="cmeto ${ETQ[x.tipo] ?? "out"}"><b>${esc(x.tipo)}</b><span>${esc(x.num)}/${esc(x.ano)}</span></span>`;
const fluxo = (x) => `<div class="fl">${x.fluxo.map((c, i) => `${i ? `<i class="ln${x.fluxo[i - 1].st === "ok" ? " ok" : ""}"></i>` : ""}<span class="p ${c.st}" title="${esc(c.n)}${c.st === "ok" ? " · aprovada" + (c.par ? " (" + c.par + ")" : "") : c.st === "atual" ? " · está aqui" : " · ainda vai"}">${esc(c.s)}</span>`).join("")}</div>`;
// filtros
const passa = (x, sem) => (!F.com || x.com === F.com || sem === "com") && (!F.tipo || x.tipo === F.tipo) && (!F.tema || x.tema === F.tema) && (!F.rel || (F.rel === "(sem)" ? !x.rel : x.rel === F.rel)) && (!F.aut || x.autor === F.aut)
  && (F.idade === "" || faixa(x.dias) === ["v", "m", "l"][+F.idade]) && (!F.kpi || (F.kpi === "sem" ? !x.rel : F.kpi === "com" ? !!x.rel : F.kpi === "velhas" ? x.dias > 90 : F.kpi === "andou" ? x.fluxo.some((c) => c.st === "ok") : true))
  && (!F.q || norm([x.tipo, x.num + "/" + x.ano, x.autor, x.rel, x.resumo, x.ementa, x.com].join(" ")).includes(norm(F.q)));
const ORD = { num: (x) => +x.ano * 1e5 + +x.num, obj: (x) => norm(x.resumo), aut: (x) => norm(x.autor), com: (x) => norm(x.com), rel: (x) => norm(x.rel || "~"), dias: (x) => x.dias ?? -1, fl: (x) => x.fluxo.filter((c) => c.st === "ok").length };
function kpis(L) { const sem = L.filter((x) => !x.rel).length, v = L.filter((x) => x.dias > 90).length, an = L.filter((x) => x.fluxo.some((c) => c.st === "ok")).length;
  const k = [["", "Em tramitação", L.length, "em " + new Set(L.map((x) => x.com)).size + " comissões"], ["com", "Com relator", L.length - sem, Math.round((L.length - sem) / Math.max(1, L.length) * 100) + "% do total"], ["sem", "Aguardando relator", sem, "sem relator designado"], ["velhas", "Há mais de 90 dias", v, "paradas na mesma comissão"], ["andou", "Já aprovadas em 1+", an, "comissão no caminho"]];
  $("#kpi").innerHTML = k.map(([id, t, n, s]) => `<button data-k="${id}" class="${F.kpi === id ? "on" : ""}"><span>${t}</span><b>${ni(n)}</b><small>${s}</small></button>`).join(""); }
function comissoes() { const B = D.L.filter((x) => passa(x, "com")), mx = Math.max(1, ...D.coms.map(([c]) => B.filter((x) => x.com === c).length));
  $("#coms").innerHTML = D.coms.map(([c, s]) => { const A = B.filter((x) => x.com === c), n = A.length, cr = A.filter((x) => x.rel).length, v = A.filter((x) => x.dias > 90).length, md = n ? Math.round(A.reduce((t, x) => t + (x.dias || 0), 0) / n) : 0;
    return `<button class="com${F.com === c ? " on" : ""}" data-c="${esc(c)}" title="${esc(c)}"><span class="cs"><b>${esc(s)}</b><em>${ni(n)}</em></span><span class="cn">${esc(c)}</span><span class="cbar" style="width:${Math.max(6, n / mx * 100)}%"><i style="flex:${cr - Math.min(cr, v)};background:#5B83F0"></i><i style="flex:${n - cr - Math.max(0, v - cr)};background:#3A4045"></i><i style="flex:${v};background:#E8822A"></i></span><span class="cmd">${n ? `média de ${md} dias na comissão` : "nada com estes filtros"}</span></button>`; }).join("");
  $("#stc").textContent = F.com ? "filtrando: " + F.com : ""; }
function opcoes() { const S = (id, vals, t) => { const el = $(id), v = el.value; el.innerHTML = `<option value="">${t}</option>` + vals.map(([k, r]) => `<option value="${esc(k)}">${esc(r)}</option>`).join(""); el.value = v; };
  const cont = (f) => { const M = new Map(); D.L.forEach((x) => { const k = f(x); if (k) M.set(k, (M.get(k) || 0) + 1); }); return [...M].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, `${k} (${n})`]); };
  S("#fTipo", cont((x) => x.tipo), "Todos"); S("#fTema", cont((x) => x.tema), "Todos"); S("#fRel", [["(sem)", "Sem relator (" + D.L.filter((x) => !x.rel).length + ")"], ...cont((x) => x.rel).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))], "Todos"); S("#fAut", cont((x) => x.autor).sort((a, b) => a[0].localeCompare(b[0], "pt-BR")), "Todos"); }
function detalhe(x) { return `<div class="det" onclick="event.stopPropagation()"><div><h4>Ementa</h4><p>${esc(x.ementa)}</p>
    <h4>Caminho nas comissões</h4><div class="passos">${x.fluxo.map((c) => `<div class="passo ${c.st}"><span class="ps">${esc(c.s)}</span><span class="pn">${esc(c.n)}<small>${c.rel ? "Relator: " + esc(c.rel) + (c.dist ? " · desde " + br(c.dist) : "") : c.st === "falta" ? "ainda não distribuída" : "aguardando relator"}${c.part ? " · " + esc(c.part) : ""}</small></span><span class="pr">${c.st === "ok" ? `<b style="color:#8FE89B">${esc(c.par || "Concluída")}</b>${c.concl ? "<br>" + br(c.concl) : ""}` : c.st === "atual" ? "está aqui" : "a tramitar"}</span></div>`).join("")}</div></div>
    <div><h4>Tramitação</h4><ul class="tl">${x.tram.map(([d, s, p]) => `<li><b>${br(d)}</b>${esc(s)}${p ? ` · <span style="color:var(--ter)">${esc(p)}</span>` : ""}</li>`).join("")}</ul>
    <a class="lk" href="https://portalelegis.alesc.sc.gov.br/proposicoes/${esc(x.id)}/tramitacoes" target="_blank" rel="noopener">Abrir no e-Legis ↗</a></div></div>`; }
function linha(x) { const d = x.dias;
  return `<div class="lin${F.ab === x.id ? " ab" : ""}" data-id="${esc(x.id)}"><div>${etq(x)}<span class="prot">protocolo ${br(x.prot)}</span></div>
    <div class="obj"><b>${x.verbo ? `<span class="cmvb">${esc(x.verbo)}</span>` : ""}${esc(x.resumo)}</b><small>${esc(x.ementa)}</small></div>
    <div class="aut">${esc(x.autor)}<small>${esc(x.tema)}</small></div>
    <div class="na"><b title="${esc(x.com)}">${esc(x.csig)}</b><small>desde ${br(x.chegou)} · <span class="idade ${faixa(d)}">${d == null ? "—" : d + " dias"}</span></small></div>
    <div class="rel">${x.rel ? esc(x.rel) + `<small>desde ${br(x.relDist)}</small>` : `<span class="sem">aguardando relator</span>`}</div>
    ${fluxo(x)}${F.ab === x.id ? detalhe(x) : ""}</div>`; }
function desenhar() { kpis(D.L.filter((x) => !F.com || x.com === F.com)); comissoes();
  const L = D.L.filter((x) => passa(x)); const [k, s] = F.ord; L.sort((a, b) => { const p = ORD[k](a), q = ORD[k](b); return (p > q ? 1 : p < q ? -1 : 0) * s || ORD.dias(b) - ORD.dias(a); });
  $("#res").innerHTML = `<b>${ni(L.length)}</b> de ${ni(D.L.length)} proposições${F.com ? " em " + esc(F.com) : ""}`;
  const col = (id, t) => `<button data-o="${id}" class="${F.ord[0] === id ? "on" : ""}">${t}<i>${F.ord[0] === id ? (F.ord[1] > 0 ? "↑" : "↓") : "↕"}</i></button>`;
  if (F.vis === "lista") $("#vista").innerHTML = `<div class="lista"><div class="cab">${col("num", "Proposição")}${col("obj", "Objetivo")}${col("aut", "Autor · tema")}${col("dias", "Na comissão")}${col("rel", "Relator")}${col("fl", "Caminho nas comissões")}</div>
    ${L.slice(0, F.lim).map(linha).join("") || `<div class="vazio">Nada com estes filtros.</div>`}${L.length > F.lim ? `<button class="mais" id="mais">Mostrar mais ${ni(Math.min(60, L.length - F.lim))} de ${ni(L.length - F.lim)}</button>` : ""}</div>`;
  else { const C = (F.com ? [F.com] : D.coms.map((c) => c[0])).filter((c) => L.some((x) => x.com === c));
    $("#vista").innerHTML = `<div class="quadro">${C.map((c) => { const A = L.filter((x) => x.com === c); return `<section class="qc"><h3>${esc(c)}<small>${ni(A.length)}</small></h3><div class="qs">${A.slice(0, 80).map((x) => `<div class="card" data-id="${esc(x.id)}"><div class="t">${etq(x)}<span class="idade ${faixa(x.dias)}" style="font-size:11.5px">${x.dias ?? "—"} d</span></div><b>${esc(x.resumo)}</b><small>${esc(x.autor)} · ${x.rel ? "relator " + esc(x.rel) : "aguardando relator"}</small>${fluxo(x)}</div>`).join("")}${A.length > 80 ? `<small style="padding:6px;color:var(--ter)">+ ${A.length - 80} na lista</small>` : ""}</div></section>`; }).join("")}</div>`; }
}
// eventos
R.addEventListener("click", (e) => { const t = e.target;
  const k = t.closest("[data-k]"); if (k) { F.kpi = F.kpi === k.dataset.k ? "" : k.dataset.k; F.lim = 60; desenhar(); return; }
  const c = t.closest("[data-c]"); if (c) { F.com = F.com === c.dataset.c ? "" : c.dataset.c; F.lim = 60; desenhar(); return; }
  const o = t.closest("[data-o]"); if (o) { const id = o.dataset.o; F.ord = F.ord[0] === id ? [id, -F.ord[1]] : [id, id === "dias" || id === "fl" ? -1 : 1]; desenhar(); return; }
  const v = t.closest("[data-v]"); if (v) { F.vis = v.dataset.v; R.querySelectorAll("[data-v]").forEach((b) => b.classList.toggle("on", b === v)); desenhar(); return; }
  if (t.closest("#mais")) { F.lim += 60; desenhar(); return; }
  if (t.closest("#limpa")) { Object.assign(F, { com: "", q: "", tipo: "", tema: "", rel: "", aut: "", idade: "", kpi: "", lim: 60 }); ["#q", "#fTipo", "#fTema", "#fRel", "#fAut", "#fIdade"].forEach((s) => $(s).value = ""); desenhar(); return; }
  const r = t.closest("[data-id]"); if (r) { const id = r.dataset.id; if (F.vis === "quadro") { F.vis = "lista"; R.querySelectorAll("[data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === "lista")); F.q = ""; }
    F.ab = F.ab === id ? null : id; const i = D.L.findIndex((x) => x.id === id); desenhar(); const el = R.querySelector(`.lin[data-id="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: "nearest" }); } });
$("#q").oninput = (e) => { F.q = e.target.value; F.lim = 60; desenhar(); };
[["#fTipo", "tipo"], ["#fTema", "tema"], ["#fRel", "rel"], ["#fAut", "aut"], ["#fIdade", "idade"]].forEach(([s, k]) => $(s).onchange = (e) => { F[k] = e.target.value; F.lim = 60; desenhar(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && F.ab && document.body.contains(R)) { F.ab = null; desenhar(); } });
const at = document.getElementById("cmpAt"); if (at) at.textContent = "e-Legis · atualizado em " + new Date(D.gerado).toLocaleDateString("pt-BR") + " às " + new Date(D.gerado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
opcoes(); desenhar();

}
