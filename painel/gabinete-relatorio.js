// Gabinete › Controle de Recursos › impressão e planilha (05/11/2026). O botão de impressora (ao lado da borracha dos
// filtros) abre uma janela: PDF (documento no padrão do palpite impresso) ou Excel (.xlsx), sempre com o que está no
// filtro. Antes de gerar, a pessoa escolhe se quer o detalhamento: somas por instrumento, por função e pago × a pagar,
// e as legendas no fim do documento. Usa os globais de gabinete.js (MEU, S, E0, PARL, mfiltradas, sigla, etapasStatus,
// instrNome, regDe, frase, norm, esc, fm, nf, ni) e de gabinete-cotas.js (funDe) e gabinete-ind-planilha.js (piExcel).
const REL_I = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4.5 6V2.5h7V6"/><rect x="2" y="6" width="12" height="5.5" rx="1.2"/><path d="M4.5 9.5h7v4h-7z"/></svg>';
const brl = (v) => "R$ " + (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// pago de cada linha: o portal da SEF quando a emenda está ligada (número + ano); senão o status da planilha
function relPago(r) { const v = +r.valor || 0, n = String(r.numero || ""), K = /^\d+$/.test(n) ? `${r.ano}-${n.padStart(6, "0")}` : null, e = K && (E0 || []).find((x) => x.k === K), es = etapasStatus(r.status_manual);
  return e ? Math.min(v || e.vp || 0, e.vp || 0) : es.d && es.d[2] ? v : 0; }
function relLinhas() { return mfiltradas().map((r) => { const v = +r.valor || 0, es = etapasStatus(r.status_manual);
  return { r, ano: +r.ano || "", mun: r.municipio || "—", reg: regDe(r) || "", obj: frase(r.objeto || ""), fun: (typeof funDe === "function" ? funDe(r) : r.funcao) || "Não informada", ins: instrNome(r.modalidade) || "Não informado", ori: sigla(r.origem) || "", oriT: r.origem || "", st: es.t, sup: es.t === "Suprimida", v, p: es.t === "Suprimida" ? 0 : relPago(r), proc: r.processo || "", ben: r.beneficiario || "" }; })
  .sort((a, b) => (a.ano || 0) - (b.ano || 0) || a.mun.localeCompare(b.mun, "pt-BR") || b.v - a.v); }
// o que está no filtro, em texto (vai no cabeçalho do documento e da planilha)
function relFiltro() { const F = S.mf || {}, P = [];
  if (S.mano) P.push("ano " + S.mano); if (F.mun && F.mun.length) P.push((F.mun.length > 1 ? "municípios " : "município ") + F.mun.join(", "));
  [["reg", "região"], ["lid", "líder"], ["fun", "função"], ["mod", "instrumento"], ["ben", "beneficiário"], ["tag", "etiqueta"]].forEach(([k, t]) => { if (F[k]) P.push(t + " " + (F[k] === "(vazio)" ? "não informada" : F[k])); });
  if (S.mori) P.push("origem " + S.mori); if (S.met) P.push("etapa " + S.met); if (S.lista) P.push("lista de indicação"); if (F.obs) P.push({ com: "com observação", sem: "sem observação", at: "marcadas para atenção" }[F.obs] || "");
  if (S.mq) P.push(`busca "${S.mq}"`); return P.filter(Boolean).join(" · ") || "todos os recursos do Controle"; }
// somas do detalhamento
function relSomas(L0) { const L = L0.filter((x) => !x.sup), g = (f) => { const M = {}; L.forEach((x) => { const k = f(x); const o = M[k] = M[k] || { n: 0, v: 0, p: 0 }; o.n++; o.v += x.v; o.p += x.p; }); return Object.entries(M).sort((a, b) => b[1].v - a[1].v); };
  const v = L.reduce((s, x) => s + x.v, 0), p = L.reduce((s, x) => s + x.p, 0);
  return { n: L.length, ns: L0.length - L.length, vs: L0.filter((x) => x.sup).reduce((s, x) => s + x.v, 0), v, p, ap: v - p, mun: new Set(L.map((x) => norm(x.mun))).size, ins: g((x) => x.ins), fun: g((x) => x.fun), mns: g((x) => x.mun), pg: [["Pago ou executado", L.filter((x) => x.p >= x.v && x.v > 0)], ["Pago em parte", L.filter((x) => x.p > 0 && x.p < x.v)], ["A pagar", L.filter((x) => !x.p)]].map(([t, A]) => [t, { n: A.length, v: A.reduce((s, x) => s + x.v, 0), p: A.reduce((s, x) => s + x.p, 0) }]), ori: [...new Map(L.filter((x) => x.ori).map((x) => [x.ori, x.oriT])).entries()] }; }

const REL_P = [["res", "Totais", "valor, pago, a pagar e quantidade"], ["pg", "Pago × a pagar", "pago, pago em parte e a pagar"], ["ins", "Por instrumento", "transferência especial, convênio…"], ["fun", "Por função", "saúde, educação, FUNDAM…"], ["mun", "Por município", "soma de cada cidade do filtro"], ["leg", "Legendas", "siglas de origem e etapas"]];
const relPartes = () => { try { const v = JSON.parse(localStorage.getItem("gab_rel_partes") || "null"); if (Array.isArray(v)) return new Set(v); } catch (e) {} return new Set(["res", "pg", "ins", "fun", "leg"]); };
// ---------- janela de opções ----------
function relAbrir() { document.getElementById("relOv")?.remove(); const L = relLinhas(); let fmt = "pdf", det = true, PT = relPartes();
  const ov = Object.assign(document.createElement("div"), { id: "relOv", className: "relov2" });
  const pinta = () => { ov.innerHTML = `<div class="relmd" role="dialog" aria-label="Imprimir ou exportar"><div class="relh"><b>Imprimir ou exportar</b><button class="relx" data-rx aria-label="Fechar">×</button></div>
    <p class="relf"><span>Conforme o filtro</span>${esc(relFiltro())} · <b>${ni(L.length)} ${L.length === 1 ? "item" : "itens"}</b></p>
    <div class="relg"><span>Formato</span><div class="relop">${[["pdf", "Imprimir / PDF", "documento no padrão SimulaLEGIS"], ["xlsx", "Excel", "planilha .xlsx"]].map(([k, t, d]) => `<button data-fmt="${k}" class="${fmt === k ? "on" : ""}"><b>${t}</b><small>${d}</small></button>`).join("")}</div></div>
    <div class="relg"><span>Incluir o detalhamento?</span><div class="relop">${[[true, "Sim", "somas por instrumento, função e pago × a pagar, e as legendas no fim"], [false, "Não", "só a lista"]].map(([k, t, d]) => `<button data-det="${k}" class="${det === k ? "on" : ""}"><b>${t}</b><small>${d}</small></button>`).join("")}</div></div>
    ${det ? `<div class="relg"><span>O que entra no detalhamento</span><div class="relck">${REL_P.map(([k, t, d]) => `<button data-pt="${k}" class="${PT.has(k) ? "on" : ""}" aria-pressed="${PT.has(k)}"><i></i><b>${t}</b><small>${d}</small></button>`).join("")}</div></div>` : ""}
    <div class="relb"><button class="btn sec" data-rx>Cancelar</button><button class="btn" data-rgo${L.length ? "" : " disabled"}>${fmt === "pdf" ? "Gerar o documento" : "Baixar a planilha"}</button></div></div>`; };
  pinta(); document.body.appendChild(ov);
  ov.onclick = async (e) => { const t = e.target; if (t === ov || t.closest("[data-rx]")) { ov.remove(); return; }
    const f = t.closest("[data-fmt]"); if (f) { fmt = f.dataset.fmt; pinta(); return; } const d = t.closest("[data-det]"); if (d) { det = d.dataset.det === "true"; pinta(); return; }
    const pt = t.closest("[data-pt]"); if (pt) { const k = pt.dataset.pt; PT.has(k) ? PT.delete(k) : PT.add(k); try { localStorage.setItem("gab_rel_partes", JSON.stringify([...PT])); } catch (er) {} if (!PT.size) det = false; pinta(); return; }
    const g = t.closest("[data-rgo]"); if (g && !g.disabled) { g.disabled = true; try { const P = det ? PT : new Set(); if (fmt === "pdf") relPDF(L, P); else await relXLSX(L, P); ov.remove(); } catch (er) { g.disabled = false; alert("Não foi possível gerar: " + (er.message || er)); } } }; }

// ---------- documento (PDF pela impressão do navegador) ----------
function relPDF(L, P) { const det = P && P.size, tem = (k) => P && P.has(k); const T = relSomas(L), ag = new Date(), dt = ag.toLocaleDateString("pt-BR"), hr = ag.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const pc = (a, b) => b ? nf(a / b * 100, 1) + "%" : "—";
  const lin = (x, i) => `<div class="di-linha"><span class="di-pos">${i + 1}</span><span class="di-cand"><span class="di-n">${esc(x.mun)}</span><span class="di-p">${esc([x.reg, x.ano].filter(Boolean).join(" · "))}</span></span><span class="di-obj">${esc(x.obj || "—")}<small>${esc([x.fun, x.ins, x.ori].filter((y) => y && !/^N[aã]o informad/.test(y)).join(" · "))}${x.proc ? " · " + esc(x.proc) : ""}</small></span><span class="di-st">${esc(x.st)}</span><span class="di-votos"><b>${ni(Math.round(x.v))}</b>${x.p ? `<small>${x.p >= x.v ? "pago" : "pago " + ni(Math.round(x.p))}</small>` : ""}</span></div>`;
  const tab = (tit, R, tot) => `<div class="di-bloco"><div class="di-st2">${tit}</div><div class="di-tl di-th"><span>Item</span><span>Qtde.</span><span>Valor (R$)</span><span>Pago</span><span>Parte</span></div>${R.map(([k, o]) => `<div class="di-tl"><span>${esc(k)}<i style="width:${tot ? (o.v / tot * 100).toFixed(1) : 0}%"></i></span><span>${ni(o.n)}</span><span>${ni(Math.round(o.v))}</span><span>${pc(o.p, o.v)}</span><span>${pc(o.v, tot)}</span></div>`).join("")}</div>`;
  const ST = [["Indicada", "registrada no gabinete, ainda sem portaria"], ["Portaria / Aguardando", "portaria publicada ou termo assinado, aguardando pagamento"], ["A pagar / Em execução", "liberada para pagamento ou em execução"], ["Pago / Executado", "valor pago (portal da SEF quando a emenda está ligada) ou execução concluída"], ["Verificar", "item marcado para conferência"], ["Suprimida", "retirada; fica fora das contas"]];
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Controle de Recursos · ${esc(PARL.u || "")}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet"><style>
  @page{size:A4;margin:14mm 12mm} body{font-family:Inter,system-ui,sans-serif;color:#111;margin:0} .pg{position:relative}
  .di-agua{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}.di-agua span{font-size:110px;font-weight:800;color:rgba(0,0,0,.035);transform:rotate(-24deg)}
  .di-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.di-wm{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1}.di-wm span{color:#1FA83A}.di-wmsub{font-size:7px;font-weight:800;letter-spacing:.2em;color:#6B7178;text-transform:uppercase;margin-top:3px}
  .di-meta{text-align:right;font-size:9px;color:#3F454B;line-height:1.5}.di-regra{margin:10px 0 14px;height:2px;background:#A9AEB3;position:relative}.di-regra:after{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:#D3D6D8}
  .di-tit{font-size:16px;font-weight:800}.di-sub{font-size:9.5px;color:#3F454B;margin:2px 0 10px;line-height:1.45}.di-sub b{color:#111}
  .di-rres{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 14px}.di-rres div{border:1px solid #DCDFE2;border-radius:6px;padding:6px 8px;background:#F3F5F6}.di-rres b{display:block;font-size:13px;font-variant-numeric:tabular-nums}.di-rres span{font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}.di-rres .ok b{color:#1FA83A}
  .di-pbar{display:flex;height:6px;border-radius:999px;overflow:hidden;background:#E6E8EA;margin:-6px 0 14px}.di-pbar i{background:#1FA83A}
  .di-linha{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:.5px solid #DCDFE2;page-break-inside:avoid}.di-hdr{border-bottom:1.5px solid #A9AEB3;font-size:7px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7178}
  .di-pos{width:20px;flex:none;color:#6B7178;font-size:9px;text-align:right}.di-cand{width:132px;flex:none}.di-n{display:block;font-size:10.5px;font-weight:600}.di-p{display:block;font-size:7.5px;color:#9AA0A4;letter-spacing:.04em;text-transform:uppercase;margin-top:1px}
  .di-obj{flex:1;font-size:9.5px;line-height:1.4}.di-obj small{display:block;color:#6B7178;font-size:8px;margin-top:2px}.di-st{width:74px;flex:none;font-size:8.5px;color:#3F454B}
  .di-votos{flex:none;width:88px;background:#F3F5F6;border:1px solid #DCDFE2;border-radius:6px;padding:4px 8px;text-align:right;font-size:10px;font-variant-numeric:tabular-nums}.di-votos small{display:block;font-size:7.5px;color:#1FA83A;font-weight:700}.di-hdr .di-votos{background:none;border:0}
  .di-tot{display:flex;justify-content:space-between;font-weight:800;font-size:11px;padding:8px 0;border-top:1.5px solid #A9AEB3;margin-top:2px}.di-tot b{color:#1FA83A}
  .di-det{page-break-before:always;break-before:page}.di-grade{display:grid;grid-template-columns:1fr 1fr;gap:14px}.di-bloco{page-break-inside:avoid;margin-bottom:12px}
  .di-st2{font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6B7178;margin:0 0 4px;padding-bottom:4px;border-bottom:1.5px solid #A9AEB3}
  .di-tl{display:grid;grid-template-columns:minmax(0,1fr) 34px 74px 40px 40px;gap:6px;font-size:9px;padding:4px 0;border-bottom:.5px solid #DCDFE2;align-items:center;font-variant-numeric:tabular-nums}.di-tl span:nth-child(n+2){text-align:right}
  .di-tl span:first-child{position:relative;padding-bottom:3px}.di-tl span:first-child i{position:absolute;left:0;bottom:0;height:2px;background:#1FA83A;opacity:.6;border-radius:2px}.di-th{font-size:7px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7178;border-bottom:1px solid #C9CDD1}
  .di-leg{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:8.5px;color:#3F454B}.di-leg b{color:#111}
  .di-rod{margin-top:18px;font-size:8px;color:#6B7178;line-height:1.5}.di-pagfoot{display:flex;justify-content:space-between;font-size:7.5px;color:#9AA0A4;border-top:.5px solid #DCDFE2;margin-top:16px;padding-top:6px}</style></head><body><div class="di-agua"><span>SimulaLEGIS</span></div><div class="pg">
  <div class="di-cab"><div><div class="di-wm">Simula<span>LEGIS</span></div><div class="di-wmsub">Gabinete · Controle de Recursos</div></div><div class="di-meta"><b>${esc(PARL.u || "")}</b> · ${esc(PARL.p || "")}<br>gerado em ${dt} às ${hr}</div></div><div class="di-regra"></div>
  <div class="di-tit">Controle de Recursos</div><div class="di-sub"><b>Filtro:</b> ${esc(relFiltro())}</div>
  <div class="di-rres"><div><b>${brl(T.v)}</b><span>valor total</span></div><div class="ok"><b>${brl(T.p)}</b><span>pago · ${pc(T.p, T.v)}</span></div><div><b>${brl(T.ap)}</b><span>a pagar</span></div><div><b>${ni(T.n)}</b><span>${T.n === 1 ? "recurso" : "recursos"} · ${ni(T.mun)} ${T.mun === 1 ? "município" : "municípios"}</span></div></div>
  <div class="di-pbar"><i style="width:${T.v ? (T.p / T.v * 100).toFixed(1) : 0}%"></i></div>
  <div class="di-linha di-hdr"><span class="di-pos">#</span><span class="di-cand">Município</span><span class="di-obj">Objeto · função · instrumento · origem</span><span class="di-st">Etapa</span><span class="di-votos">Valor R$</span></div>
  ${L.filter((x) => !x.sup).map(lin).join("")}
  <div class="di-tot"><span>Total · ${ni(T.n)} ${T.n === 1 ? "recurso" : "recursos"}</span><b>${brl(T.v)}</b></div>
  ${T.ns ? `<div class="di-st2" style="margin-top:14px">Suprimidas · fora das contas · ${ni(T.ns)} ${T.ns === 1 ? "item" : "itens"} · ${brl(T.vs)}</div>${L.filter((x) => x.sup).map(lin).join("")}` : ""}
  ${det ? `<div class="di-det"><div class="di-tit">Detalhamento</div><div class="di-sub">Somas do que está no filtro: ${esc(relFiltro())}.</div>
    ${tem("res") ? `<div class="di-rres"><div><b>${brl(T.v)}</b><span>valor total</span></div><div class="ok"><b>${brl(T.p)}</b><span>pago · ${pc(T.p, T.v)}</span></div><div><b>${brl(T.ap)}</b><span>a pagar · ${pc(T.ap, T.v)}</span></div><div><b>${ni(T.n)}</b><span>recursos</span></div></div>` : ""}
    ${tem("pg") ? tab("Pago × a pagar", T.pg.filter(([, o]) => o.n), T.v) : ""}
    ${tem("ins") || tem("fun") ? `<div class="di-grade">${tem("ins") ? tab("Por instrumento", T.ins, T.v) : ""}${tem("fun") ? tab("Por função", T.fun, T.v) : ""}</div>` : ""}
    ${tem("mun") ? tab("Por município", T.mns, T.v) : ""}
    ${tem("leg") ? `<div class="di-grade"><div class="di-bloco"><div class="di-st2">Legenda · origem</div><div class="di-leg">${T.ori.map(([s, t]) => `<b>${esc(s)}</b><span>${esc(t)}</span>`).join("") || "<span>—</span>"}</div></div>
      <div class="di-bloco"><div class="di-st2">Legenda · etapa</div><div class="di-leg">${ST.map(([s, t]) => `<b>${esc(s)}</b><span>${esc(t)}</span>`).join("")}</div></div></div>` : ""}
    <div class="di-rod">Valores em reais. "Parte" é a fatia de cada item no valor total do filtro; "Pago" é quanto daquele item já foi pago. Pago vem do portal da SEF quando a emenda está ligada ao Controle; nos demais, da etapa registrada pelo gabinete.</div></div>` : ""}
  <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app · uso interno do gabinete</span><span>${dt} ${hr}</span></div></div><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
  const w = window.open("", "_blank"); if (!w) throw new Error("libere as janelas pop-up do navegador para este site"); w.document.write(html); w.document.close(); }

// ---------- planilha Excel ----------
async function relXLSX(L, P) { const det = P && P.size, tem = (k) => P && P.has(k); await piExcel(); const T = relSomas(L), wb = new ExcelJS.Workbook(); wb.creator = "SimulaLEGIS";
  const ws = wb.addWorksheet("Recursos", { views: [{ state: "frozen", ySplit: 4 }] }), V = "#,##0.00", B = { bold: true };
  ws.addRow([`Controle de Recursos · ${PARL.u || ""} (${PARL.p || ""})`]).font = { bold: true, size: 14 };
  ws.addRow([`Filtro: ${relFiltro()} · gerado em ${new Date().toLocaleString("pt-BR")}`]).font = { color: { argb: "FF6B7178" } }; ws.addRow([]);
  const cab = ws.addRow(["#", "Ano", "Município", "Região", "Objeto", "Função", "Instrumento", "Origem", "Etapa", "Processo", "Beneficiário", "Valor (R$)", "Pago (R$)"]);
  cab.font = { bold: true, color: { argb: "FFFFFFFF" } }; cab.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2022" } }; });
  const A = L.filter((x) => !x.sup), Sp = L.filter((x) => x.sup);
  A.forEach((x, i) => ws.addRow([i + 1, x.ano, x.mun, x.reg, x.obj, x.fun, x.ins, x.ori, x.st, x.proc, x.ben, x.v, x.p]));
  const tl = ws.addRow(["", "", "Total", "", `${T.n} recursos · ${T.mun} municípios`, "", "", "", "", "", "", T.v, T.p]); tl.font = B;
  if (Sp.length) { ws.addRow([]); ws.addRow(["", "", "Suprimidas (fora das contas)"]).font = { bold: true, color: { argb: "FF6B7178" } }; Sp.forEach((x, i) => { const r = ws.addRow([i + 1, x.ano, x.mun, x.reg, x.obj, x.fun, x.ins, x.ori, x.st, x.proc, x.ben, x.v, ""]); r.font = { color: { argb: "FF9AA0A4" } }; }); }
  ws.getColumn(12).numFmt = V; ws.getColumn(13).numFmt = V;
  [5, 6, 22, 16, 52, 18, 20, 9, 14, 16, 30, 16, 16].forEach((w, i) => { ws.getColumn(i + 1).width = w; }); ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 13 } };
  if (det) { const wd = wb.addWorksheet("Detalhamento"); wd.getColumn(1).width = 34; [2, 3, 4, 5].forEach((c) => { wd.getColumn(c).width = 16; });
    wd.addRow(["Detalhamento · " + relFiltro()]).font = { bold: true, size: 13 }; wd.addRow([]);
    const res = tem("res") ? [["Valor total", T.v], ["Pago", T.p], ["A pagar", T.ap], ["Recursos", T.n], ["Municípios", T.mun]] : []; res.forEach(([k, v]) => { const r = wd.addRow([k, v]); r.getCell(1).font = B; if (k !== "Recursos" && k !== "Municípios") r.getCell(2).numFmt = V; }); wd.addRow([]);
    const bloco = (tit, R) => { wd.addRow([tit]).font = { bold: true, size: 12 }; const h = wd.addRow(["Item", "Quantidade", "Valor (R$)", "Pago (R$)", "Parte do total"]); h.font = B;
      R.forEach(([k, o]) => { const r = wd.addRow([k, o.n, o.v, o.p, T.v ? o.v / T.v : 0]); r.getCell(3).numFmt = V; r.getCell(4).numFmt = V; r.getCell(5).numFmt = "0.0%"; }); wd.addRow([]); };
    if (tem("pg")) bloco("Pago × a pagar", T.pg.filter(([, o]) => o.n)); if (tem("ins")) bloco("Por instrumento", T.ins); if (tem("fun")) bloco("Por função", T.fun); if (tem("mun")) bloco("Por município", T.mns);
    if (tem("leg")) { wd.addRow(["Legenda · origem"]).font = { bold: true, size: 12 }; T.ori.forEach(([s, t]) => wd.addRow([s, t])); }
    wd.addRow([]); wd.addRow(["Pago vem do portal da SEF quando a emenda está ligada ao Controle; nos demais, da etapa registrada pelo gabinete."]).font = { italic: true, color: { argb: "FF6B7178" } }; }
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement("a"), nome = `Controle de Recursos - ${PARL.u || "gabinete"} - ${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
