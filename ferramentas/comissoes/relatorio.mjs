// Relatório "Comissões Permanentes da ALESC" no padrão de documento do sistema (relPDF do Controle de Recursos:
// cabeçalho SimulaLEGIS, régua dupla, quadros de totais, tabelas com títulos em maiúsculas, etiquetas neutras, papel claro).
// Uso: node ferramentas/comissoes/relatorio.mjs <saida.html>   (lê dados/painel/alesc-comissoes.json)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "../.."), D = JSON.parse(readFileSync(join(RAIZ, "dados/painel/alesc-comissoes.json"), "utf8"));
const SAI = process.argv[2] || join(RAIZ, "relatorio-comissoes.html");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ni = (n) => Math.round(n || 0).toLocaleString("pt-BR"), pc = (a, b) => b ? (a / b * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "—";
const br = (iso) => iso.split("-").reverse().join("/");
// cores dos partidos: as mesmas do sistema (painel/novos.js COR_P); a sigla vai sempre escrita junto
const COR = { Novo: "#F37021", PL: "#3D7BFF", PT: "#E5383B", MDB: "#34C759", PP: "#2FB5E8", "União Brasil": "#2FB5E8", PSD: "#2B5FD9", Republicanos: "#4D8DFF", Podemos: "#3FB37F", PDT: "#E5484D", PSOL: "#F5B700", PSB: "#F2A900", PSDB: "#1E6FD9", PRD: "#E8833A" };
const SIG = { "União Brasil": "UNIÃO", Republicanos: "REPUB.", Podemos: "PODE", Novo: "NOVO" }, sig = (p) => SIG[p] || p;
const cor = (p) => COR[p] || "#9AA0A4", txtSobre = (p) => ["PSOL", "PSB", "MDB", "PP", "União Brasil", "Podemos"].includes(p) ? "#111" : "#fff";
const curto = (n) => n.replace(/^Comiss[ãa]o (de |da |do |dos |das )?/i, "").replace(/, das Relações Internacionais e do Mercosul/i, " e Mercosul").replace(/ e de Legislação Participativa/i, "");
const C = D.comissoes, DEPS = D.deputados.filter((d) => d.relatorias > 0 || d.comissoes > 0);
const totRel = C.reduce((s, c) => s + c.materias_relatadas, 0), totReu = C.reduce((s, c) => s + c.reunioes.total, 0);
const assentos = {}, pres = {}; C.forEach((c) => { Object.entries(c.partidos).forEach(([p, n]) => assentos[p] = (assentos[p] || 0) + n); const pp = (D.deputados.find((d) => d.deputado === c.presidente) || {}).partido; if (pp) pres[pp] = (pres[pp] || 0) + 1; });
const totAss = Object.values(assentos).reduce((a, b) => a + b, 0), ordP = Object.entries(assentos).sort((a, b) => b[1] - a[1]);
const relatores = D.deputados.filter((d) => d.relatorias > 0 && d.deputado.length >= 5 && !/-$/.test(d.deputado));   // sem fragmentos de nome cortados no PDF
const ag = new Date(D.gerado), dt = ag.toLocaleDateString("pt-BR"), hr = ag.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// barra empilhada por partido (sigla escrita no segmento quando cabe)
const barraP = (obj, tot) => `<div class="pb">${Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<i style="flex:${n};background:${cor(p)};color:${txtSobre(p)}" title="${esc(p)}: ${n}">${n / tot >= .09 ? `${esc(sig(p))}${n > 1 ? " " + n : ""}` : ""}</i>`).join("")}</div>`;
const etqP = (p) => p === "—" ? `<span class="eto ex" title="não está mais na Assembleia ou foi suplente; partido não identificado"><b>EX</b></span>` : `<span class="eto"${p.endsWith("*") ? ' title="partido em 2022"' : ""}><b>${esc(sig(p))}</b></span>`;
const pessoa = (d, papel) => { const p = (D.deputados.find((x) => x.deputado === d) || {}).partido || "—"; return `<li><span class="sw" style="background:${cor(p)}"></span><b>${esc(d)}</b>${etqP(p)}${papel ? `<em>${papel}</em>` : ""}</li>`; };

// reuniões por comissão (barras empilhadas por tipo, mesma escala)
const TIPOS = [["ordinaria", "Ordinária", "#3F454B"], ["extraordinaria", "Extraordinária", "#7E848A"], ["conjunta", "Conjunta", "#A9AEB3"], ["audiencia", "Audiência pública", "#1FA83A"], ["instalacao", "Instalação", "#D3D6D8"], ["outra", "Outra", "#E6E8EA"]];
const maxR = Math.max(...C.map((c) => c.reunioes.total)), ordR = [...C].sort((a, b) => b.reunioes.total - a.reunioes.total);
const graficoReu = `<div class="gr">${ordR.map((c) => `<div class="grl"><span class="grn">${esc(curto(c.nome))}</span><span class="grb"><span style="width:${(c.reunioes.total / maxR * 100).toFixed(1)}%">${TIPOS.map(([k, , co]) => c.reunioes[k] ? `<i style="flex:${c.reunioes[k]};background:${co}" title="${esc(k)}: ${c.reunioes[k]}"></i>` : "").join("")}</span></span><span class="grv">${ni(c.reunioes.total)}</span></div>`).join("")}</div>
  <div class="lg">${TIPOS.filter(([k]) => C.some((c) => c.reunioes[k])).map(([, t, co]) => `<span><i style="background:${co}"></i>${t}</span>`).join("")}</div>`;
const anos = D.totais.anos.filter((a) => a >= "2023");
const tabAnos = `<table class="pt"><thead><tr><th>Comissão</th>${anos.map((a) => `<th class="n">${a}</th>`).join("")}<th class="n">Total</th></tr></thead><tbody>${ordR.map((c) => `<tr><td><b>${esc(curto(c.nome))}</b></td>${anos.map((a) => `<td class="n">${ni(c.reunioes.por_ano[a] || 0)}</td>`).join("")}<td class="n"><b>${ni(c.reunioes.total)}</b></td></tr>`).join("")}</tbody></table>`;

// relatoria por deputado
const maxD = Math.max(...relatores.map((d) => d.relatorias));
const tabRel = `<table class="pt rel"><thead><tr><th class="n">#</th><th>Deputado</th><th>Partido</th><th class="n">Comissões</th><th class="n">Matérias relatadas</th><th class="n">% do total</th><th>Onde relatou mais</th></tr></thead><tbody>${relatores.map((d, i) => { const top = Object.entries(d.por_comissao).sort((a, b) => b[1] - a[1])[0];
  return `<tr><td class="n">${i + 1}</td><td><b>${esc(d.deputado)}</b></td><td>${etqP(d.partido)}</td><td class="n">${d.comissoes}${d.presidencias ? `<small>preside ${d.presidencias}</small>` : ""}</td><td class="n bar"><span style="width:${(d.relatorias / maxD * 100).toFixed(1)}%"></span><b>${ni(d.relatorias)}</b></td><td class="n">${pc(d.relatorias, totRel)}</td><td>${top ? `${esc(curto(top[0]))} <small>${ni(top[1])}</small>` : "—"}</td></tr>`; }).join("")}</tbody></table>`;

// fichas das comissões
const ficha = (c) => { const tot = Object.values(c.partidos).reduce((a, b) => a + b, 0), relM = c.relatorias.slice(0, 5), mx = Math.max(1, ...relM.map((r) => r.materias));
  return `<section class="fc"><div class="fch"><h3>${esc(c.nome)}</h3><div class="fcn"><span><b>${ni(c.reunioes.total)}</b>reuniões</span><span><b>${ni(c.materias_relatadas)}</b>matérias relatadas</span><span><b>${tot}</b>membros</span></div></div>
    ${barraP(c.partidos, tot)}
    <div class="fcb"><ul class="mb">${pessoa(c.presidente, "Presidente")}${c.vice ? pessoa(c.vice, "Vice") : ""}${c.membros.map((m) => pessoa(m)).join("")}</ul>
    <div class="rl"><div class="st">Quem mais relatou</div>${relM.length ? relM.map((r) => `<div class="rlr"><span>${esc(r.deputado)}${r.membro ? "" : ` <small>(não é membro hoje)</small>`}</span><span class="rlb"><i style="width:${(r.materias / mx * 100).toFixed(0)}%"></i></span><b>${ni(r.materias)}</b><em>${pc(r.materias, c.materias_relatadas)}</em></div>`).join("") : `<p class="mu">Nenhuma relatoria identificada nas pautas.</p>`}</div></div></section>`; };

const html = `<title>Comissões Permanentes da ALESC</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
/* Papel claro (padrão de documento do SimulaLEGIS, relPDF): um tema só, de propósito — é um relatório para ler e imprimir. */
:root{ --papel:#FFFFFF; --tinta:#111111; --sec:#3F454B; --ter:#6B7178; --apag:#9AA0A4; --fio:#DCDFE2; --quadro:#F3F5F6; --verde:#1FA83A; color-scheme:light; }
@page{ size:A4; margin:14mm 12mm } *{ box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
body{ background:var(--papel); color:var(--tinta); font:13px/1.45 Inter, system-ui, -apple-system, sans-serif; }
.folha{ max-width:980px; margin:0 auto; padding-block:24px 48px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); position:relative; }
.agua{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:0 } .agua span{ font-size:min(110px,18vw); font-weight:800; color:rgba(0,0,0,.03); transform:rotate(-24deg) }
.cab{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap } .wm{ font-size:22px; font-weight:800; letter-spacing:-.01em; line-height:1 } .wm span{ color:var(--verde) }
.wms{ font-size:8.5px; font-weight:800; letter-spacing:.2em; color:var(--ter); text-transform:uppercase; margin-top:4px } .meta{ text-align:right; font-size:11px; color:var(--sec); line-height:1.5 }
.regra{ margin:12px 0 18px; height:2px; background:#A9AEB3; position:relative } .regra:after{ content:""; position:absolute; left:0; right:0; top:4px; height:1px; background:#D3D6D8 }
h1{ font-size:24px; font-weight:800; margin:0; letter-spacing:-.02em; text-wrap:balance } .sub{ color:var(--sec); margin:4px 0 14px; max-width:70ch }
h2{ font-size:16px; font-weight:800; margin:30px 0 4px; letter-spacing:-.01em; break-after:avoid } h2 + .sub{ font-size:12px }
.tot{ display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px; margin:10px 0 6px } .tot div{ border:1px solid var(--fio); border-radius:6px; padding:8px 10px; background:var(--quadro) }
.tot b{ display:block; font-size:22px; font-variant-numeric:tabular-nums; letter-spacing:-.01em } .tot span{ font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ter) }
.st{ font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--ter); margin:0 0 6px }
.pb{ display:flex; height:18px; border-radius:4px; overflow:hidden; gap:1px; background:var(--papel) } .pb i{ min-width:0; display:flex; align-items:center; justify-content:center; font-style:normal; font-size:9px; font-weight:800; letter-spacing:.02em; white-space:nowrap; overflow:hidden }
.lg{ display:flex; flex-wrap:wrap; gap:4px 14px; font-size:11px; color:var(--sec); margin:8px 0 0 } .lg i{ display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:5px; vertical-align:-1px }
.eto{ display:inline-flex; border:1px solid #A9AEB3; border-radius:4px; overflow:hidden; font-size:9px; line-height:1; vertical-align:1px } .eto b{ background:#3F454B; color:#fff; padding:2px 5px; font-weight:800; letter-spacing:.03em } .eto.ex b{ background:#fff; color:#6B7178 }
/* gráfico de reuniões */
.gr{ display:grid; gap:4px } .grl{ display:grid; grid-template-columns:minmax(0,230px) minmax(0,1fr) 44px; align-items:center; gap:10px; font-size:12px }
.grn{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap } .grb{ height:14px; background:var(--quadro); border-radius:3px; overflow:hidden } .grb > span{ display:flex; height:100%; gap:1px } .grb i{ display:block; height:100% }
.grv{ text-align:right; font-weight:700; font-variant-numeric:tabular-nums }
/* partidos */
.pg{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:18px } .pgl{ display:grid; grid-template-columns:70px minmax(0,1fr) 96px; gap:8px; align-items:center; font-size:12px; margin:3px 0 } .pgl .b{ height:12px; border-radius:3px } .pgl b{ white-space:nowrap; text-align:right; font-variant-numeric:tabular-nums }
/* tabelas */
.tw{ overflow-x:auto } table.pt{ width:100%; border-collapse:collapse; font-size:12px; margin-top:6px } .pt th{ text-align:left; font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ter); border-bottom:1.5px solid #A9AEB3; padding:6px 8px 5px; white-space:nowrap }
.pt td{ padding:6px 8px; border-bottom:.5px solid var(--fio); vertical-align:middle } .pt .n{ text-align:right; font-variant-numeric:tabular-nums } .pt small{ display:block; color:var(--ter); font-size:10px } .pt tr{ break-inside:avoid }
.pt td.bar{ position:relative; min-width:140px } .pt td.bar span{ position:absolute; left:8px; top:50%; height:8px; transform:translateY(-50%); background:#D3D6D8; border-radius:2px; max-width:calc(100% - 60px) } .pt td.bar b{ position:relative }
/* fichas */
.fcs{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px } .fc{ border:1px solid var(--fio); border-radius:8px; padding:12px; break-inside:avoid; display:grid; gap:8px; align-content:start }
.fch h3{ margin:0; font-size:14px; letter-spacing:-.01em; text-wrap:balance } .fcn{ display:flex; gap:14px; margin-top:4px; font-size:10px; color:var(--ter); text-transform:uppercase; letter-spacing:.06em; font-weight:700 } .fcn b{ color:var(--tinta); font-size:14px; margin-right:4px; letter-spacing:0; font-variant-numeric:tabular-nums }
.fcb{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px } .mb{ list-style:none; margin:0; padding:0; display:grid; gap:3px; font-size:11.5px } .mb li{ display:flex; align-items:center; gap:6px; flex-wrap:wrap } .mb .sw{ width:8px; height:8px; border-radius:50%; flex:none } .mb em{ font-style:normal; font-size:9px; color:var(--ter); text-transform:uppercase; letter-spacing:.06em }
.rlr{ display:grid; grid-template-columns:minmax(0,1fr) 50px 26px 38px; gap:6px; align-items:center; font-size:11px; margin:2px 0 } .rlr small{ color:var(--apag) } .rlb{ height:6px; background:var(--quadro); border-radius:2px; overflow:hidden } .rlb i{ display:block; height:100%; background:#7E848A }
.rlr b{ text-align:right; font-variant-numeric:tabular-nums } .rlr em{ font-style:normal; text-align:right; color:var(--ter); font-size:10px; font-variant-numeric:tabular-nums } .mu{ color:var(--apag); font-size:11px; margin:0 }
.nota{ border:1px solid var(--fio); border-radius:6px; padding:10px 12px; font-size:11px; color:var(--sec); margin-top:26px; break-inside:avoid } .nota b{ color:var(--tinta) } .nota p{ margin:4px 0 }
@media (max-width:720px){ .tot{ grid-template-columns:repeat(2, minmax(0,1fr)) } .pg, .fcs, .fcb{ grid-template-columns:minmax(0,1fr) } .grl{ grid-template-columns:minmax(0,1fr) 44px } .grb{ grid-column:1 / -1; order:3 } .meta{ text-align:left } }
@media print{ .folha{ padding:0 3px } h2{ break-after:avoid } .quebra{ break-before:page } }
</style>
<div class="agua" aria-hidden="true"><span>SimulaLEGIS</span></div>
<main class="folha">
  <header class="cab"><div><div class="wm">Simula<span>LEGIS</span></div><div class="wms">Relatório · Comissões permanentes</div></div>
    <div class="meta">Assembleia Legislativa de Santa Catarina<br>20ª Legislatura · ${br(D.periodo.de)} a ${br(D.periodo.ate)}<br>Gerado em ${dt} às ${hr}</div></header>
  <div class="regra"></div>
  <h1>Comissões permanentes da ALESC</h1>
  <p class="sub">Composição atual de cada comissão com a divisão partidária, as reuniões realizadas nesta legislatura e as relatorias de cada deputado, lidas das pautas publicadas pela Assembleia.</p>
  <div class="tot"><div><b>${C.length}</b><span>Comissões</span></div><div><b>${ni(D.totais.reunioes_distintas)}</b><span>Reuniões realizadas</span></div><div><b>${ni(totRel)}</b><span>Matérias relatadas</span></div><div><b>${relatores.length}</b><span>Deputados relatores</span></div></div>

  <h2>Reuniões por comissão</h2>
  <p class="sub">Desde a instalação, em fevereiro de 2023. A reunião conjunta conta para cada comissão que participou; por isso a soma das barras (${ni(totReu)}) passa do total de reuniões.</p>
  ${graficoReu}

  <h2>Divisão partidária</h2>
  <p class="sub">Partido atual de cada membro (titulares, presidentes e vices), em ${totAss} assentos nas ${C.length} comissões.</p>
  <div class="pg"><div><div class="st">Assentos por partido</div>${ordP.map(([p, n]) => `<div class="pgl"><span>${etqP(p)}</span><span class="b" style="width:${(n / ordP[0][1] * 100).toFixed(1)}%;background:${cor(p)}"></span><b>${n} · ${pc(n, totAss)}</b></div>`).join("")}</div>
    <div><div class="st">Presidências por partido</div>${Object.entries(pres).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<div class="pgl"><span>${etqP(p)}</span><span class="b" style="width:${(n / Math.max(...Object.values(pres)) * 100).toFixed(1)}%;background:${cor(p)}"></span><b>${n} · ${pc(n, C.length)}</b></div>`).join("")}</div></div>

  <h2 class="quebra">Relatoria por deputado</h2>
  <p class="sub">Matérias distintas que cada deputado relatou nas comissões (uma matéria conta uma vez por comissão, mesmo voltando à pauta). "% do total" é a fatia do deputado em todas as ${ni(totRel)} relatorias.</p>
  <div class="tw">${tabRel}</div>

  <h2 class="quebra">As comissões, uma a uma</h2>
  <p class="sub">Membros com o partido, a faixa da divisão partidária e os cinco deputados que mais relataram em cada comissão (a porcentagem é a fatia dele nas matérias relatadas ali).</p>
  <div class="fcs">${C.map(ficha).join("")}</div>

  <h2 class="quebra">Reuniões por ano</h2>
  <div class="tw">${tabAnos}</div>

  <div class="nota"><b>Como os números foram feitos</b>
    <p><b>Fonte:</b> portal e-Legis da ALESC (composição das comissões, agenda das reuniões e pautas em PDF) e a página de deputados (partido atual). ${ni(D.totais.pautas_lidas)} pautas lidas.</p>
    <p><b>Reuniões:</b> ${esc(D.metodo.reunioes)}.</p>
    <p><b>Relatorias:</b> ${esc(D.metodo.relatorias)}. Pautas sem relator identificável (só audiências ou atas): ${ni(D.totais.pautas_sem_relator_identificado)}. Relatorias de quem saiu da comissão continuam contando para o deputado.</p>
    <p><b>Partido:</b> o atual, de alesc.sc.gov.br/deputados; trocas de partido durante a legislatura não aparecem. Quem já saiu da Assembleia aparece com o partido de 2022 marcado com * (quando achado no resultado da eleição) ou com a etiqueta EX.</p></div>
</main>`;
writeFileSync(SAI, html); console.log("ok", SAI);
