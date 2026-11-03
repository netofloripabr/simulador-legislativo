// Gabinete · planilha da Indicação (02/11/2026). Um só modelo de planilha, gerado em .xlsx (ExcelJS) e, se o usuário quiser,
// convertido direto no Google Drive dele (aí ganha o mapa em gráfico de bolhas). Abas: Indicação (o formulário simples, só listas
// nas colunas de escolha), Painel (esta indicação + todo o histórico do mandato com 6 filtros por lista), Por município, Orçamento
// (modelo oficial, por fórmula), Listas e Dados (ocultas). Importar lê de volta a aba Indicação (do .xlsx ou do Google) pelos
// nomes das colunas — vale também para planilhas do modelo anterior — confere linha a linha e grava na lista.
// Usa os globais de gabinete.js, gabinete-adicionar.js, gabinete-planilha.js (tokenGoogle/gapi) e gabinete-indicar.js.

// colunas da aba Indicação (modelo aprovado em 03/11/2026: só o essencial): [título, largura, campo, tipo] — "l" lista, "a" automático, "c" só convênio
const PI_COLS = [["Nº", 5], ["Município", 22, "municipio", "l"], ["Área", 22, "area", "l"], ["Instrumento", 22, "modalidade", "l"], ["Objeto", 52, "objeto"], ["Valor (R$)", 16, "valor"],
  ["CNPJ (convênio)", 19, "cnpj", "c"], ["Razão social (convênio)", 32, "razao_social", "c"], ["Conferência", 24, "", "a"], ["Subação", 9, "", "a"], ["Órgão", 8, "", "a"], ["UO", 8, "", "a"]];
const PI_R0 = 8; // 1ª linha de preenchimento (cabeçalho na 7)
// filtros do Painel: [rótulo, coluna na aba Dados]
const PI_FILT = [["Fonte", "A"], ["Ano", "B"], ["Região", "C"], ["Município", "D"], ["Área", "E"], ["Instrumento", "F"], ["Situação", "G"]];
const PI_HIST = "Histórico 2023-26";
// área das emendas públicas: o portal não traz a função, então sai do texto do objeto (a da lista vem da coluna Área)
function piArea(o, tb) {
  o = norm(o);
  if (/SAUDE|HOSPITAL|UBS|MEDIC|AMBULAN|ODONTO|CLINIC|CNES|AUTIS|CANCER|EXCEPCION|TERAPEUT|ESTRATEGIA DA FAMILIA|UNIDADE ESTRATEGICA/.test(o) || /APAE/i.test(tb || "")) return "Saúde";
  if (/EDUCA|ESCOLA|CRECHE|ENSINO|UNIVERS|E B M/.test(o)) return "Educação";
  if (/AGRIC|RURAL|AGRO|PRODUTOR|PATRULHA/.test(o)) return "Agricultura";
  if (/SEGURAN|POLICI|BOMBEIR|VIDEOMONIT/.test(o)) return "Segurança Pública";
  if (/PAVIMENT|INFRAESTRUT|VIARI|ESTRADA|PONTE|\bRUA\b|ASFALT|MOBILID|DRENAG|MACADAM|CALCAD/.test(o)) return "Infraestrutura e Mobilidade";
  if (/ASSIST|SOCIAL|IDOSO|CRIANC|ACOLHIM|FAMILIA/.test(o)) return "Fundo Social";
  if (/ESPORT|CULTUR|TURIS|EVENTO|CLUBE|FUTSAL|VOLEI|MUSICA|PLAYGROUND|PARQUE|GINASIO|QUADRA|TEATRO/.test(o)) return "Esporte, cultura e lazer";
  return "Outras";
}
// instrumento no mesmo vocabulário da aba 1 (termo de fomento é convênio com entidade)
const piMod = (m) => /Fomento|Conv/i.test(m || "") ? "Convênio" : m || "—";
const piSit = (e) => (e.vp || 0) >= (e.v || 0) - 1 && e.v ? "Pago" : (e.vp || 0) > 0 ? "Pago em parte" : "Sem pagamento";
const piUniq = (a) => [...new Set(a.filter((x) => x != null && x !== ""))];
// função da emenda do histórico: a da planilha do gabinete quando a emenda está ligada a ela; senão, estimada pelo objeto
function piAreaHist(e) { const r = typeof PRIV !== "undefined" && PRIV && e.k && PRIV[e.k], f = r && r.funcao ? FUN_I.find(([re]) => re.test(r.funcao)) : null;
  if (f) { const a = f[1].replace(/ \(.*\)/, ""); return { Infraestrutura: "Infraestrutura e Mobilidade", "Segurança": "Segurança Pública", Social: "Fundo Social" }[a] || a; } return piArea(e.obj, e.tben); }

async function piExcel() { if (!window.ExcelJS) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); }); }

// ---------- montagem da planilha ----------
async function montarPlanilhaInd(T) {
  await piExcel();
  const L = T.L, g = regrasInd(T), c = T.cota || {}, it = L ? AD.itens.filter((x) => x.lista_id === L.id && cheia(x)) : [];
  const wb = new ExcelJS.Workbook(); wb.creator = "SimulaLEGIS"; wb.calcProperties.fullCalcOnLoad = true;
  const ESC = "FF1D2226", MUT = "FF6E767D", BD = "FFDEE2E5", SF = "FFF1F3F4", TL = "FFF8F9FA", OR = "FFE8822A", VD = "FF1FA845", AZ = "FF3D7BFF", AM = "FFFFF8DB";
  const fill = (x) => ({ type: "pattern", pattern: "solid", fgColor: { argb: x } }), fino = { style: "thin", color: { argb: BD } }, R$ = '"R$" #,##0.00', R0 = '"R$" #,##0', PCT = "0%";
  const N = Math.max(g.max || 0, it.length + 20, 30), r0 = PI_R0, r1 = r0 + N - 1, ano = IND.ano, tit = `${T.nome} · ${ano}`, FN = `Indicação ${T.cota ? ({ AN: "LOA", "0,55": "0,55%", EX: "Excesso" }[T.cota.t] || "") : ""} ${ano}`.replace(/\s+/g, " ");
  const muns = BASE.mun.map((m, i) => ({ n: m.n, i, reg: m.assoc || "—" })).sort((a, b) => a.n.localeCompare(b.n, "pt-BR"));
  const ws = wb.addWorksheet("Indicação", { views: [{ state: "frozen", ySplit: r0 - 1, xSplit: 2, showGridLines: false }] }),
    pn = wb.addWorksheet("Painel", { views: [{ showGridLines: false }] }), pm = wb.addWorksheet("Por município", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }] }),
    oc = wb.addWorksheet("Orçamento", { views: [{ showGridLines: false }] }), ls = wb.addWorksheet("Listas", { state: "hidden" }), dd = wb.addWorksheet("Dados", { state: "hidden" });
  const col = (k) => k < 26 ? String.fromCharCode(65 + k) : "A" + String.fromCharCode(65 + k - 26), IC = {}; PI_COLS.forEach(([t, , f], k) => { IC[f || t] = col(k); });
  const cm = IC.municipio, ca = IC.area, ci = IC.modalidade, co = IC.objeto, cv = IC.valor, cc = IC.cnpj, cr = IC.razao_social, cf = IC["Conferência"];
  const ind = (cl) => `'Indicação'!$${cl}$${r0}:$${cl}$${r1}`;

  // ---- Listas (apoio das listas suspensas e das fórmulas)
  ls.getCell("A1").value = "Município"; ls.getCell("B1").value = "Região"; muns.forEach((m, i) => { ls.getCell(2 + i, 1).value = m.n; ls.getCell(2 + i, 2).value = m.reg; });
  ls.getCell("D1").value = "Área"; ls.getCell("E1").value = "Subação"; ls.getCell("F1").value = "Órgão"; ls.getCell("G1").value = "UO";
  g.areas.forEach((a, i) => { const q = AREAS.find((x) => x[1] === a) || []; ls.getCell(2 + i, 4).value = a; ls.getCell(2 + i, 5).value = q[0] ? +q[0] : ""; ls.getCell(2 + i, 6).value = q[2] || ""; ls.getCell(2 + i, 7).value = q[3] || ""; });
  ls.getCell("I1").value = "Instrumento"; g.mods.forEach((m, i) => { ls.getCell(2 + i, 9).value = m; });
  const nA = g.areas.length + 1, AR = `Listas!$D$2:$G$${nA}`, nM = muns.length + 1;

  // ---- Indicação (o formulário: só o essencial)
  ws.columns = PI_COLS.map(([, w]) => ({ width: w }));
  const ult = col(PI_COLS.length - 1);
  ws.mergeCells(`A1:${ult}1`); ws.getCell("A1").value = `Indicação de recursos · ${tit}`; ws.getCell("A1").font = { size: 16, bold: true, color: { argb: ESC } };
  ws.mergeCells(`A2:${ult}2`); ws.getCell("A2").value = [`${PARL.u || ""} · ${PARL.p || ""}`, c.doc || (L && L.origem) || "", g.min ? "mínimo R$ " + moeda(g.min) + " por emenda" : "", g.max ? "até " + g.max + " emendas" : "", g.saude ? `Saúde ≥ ${g.saude * 100}%` : "", c.prazo ? "prazo " + new Date(c.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""].filter(Boolean).join(" · "); ws.getCell("A2").font = { size: 10, color: { argb: MUT } };
  ws.mergeCells(`A3:${ult}3`); ws.getCell("A3").value = "Preencha município, área, instrumento, objeto e valor (as colunas com seta só aceitam valores da lista). CNPJ e razão social só para Convênio. As colunas cinzas e a Conferência se preenchem sozinhas; o Painel acompanha."; ws.getCell("A3").font = { size: 9, italic: true, color: { argb: MUT } };
  const kp = [["Disponível", g.disp || "", R$], ["Indicado", { formula: `SUM(${cv}${r0}:${cv}${r1})` }, R$], ["Saldo", g.disp ? { formula: `B5-C5` } : "", R$],
    ...(g.saude ? [[`Saúde (mín. ${g.saude * 100}%)`, { formula: `SUMIF(${ca}${r0}:${ca}${r1},"Saúde",${cv}${r0}:${cv}${r1})` }, R$]] : []),
    ...(c.fundam ? [[`FUNDAM (mín. ${c.fundam * 100}%)`, { formula: `SUMIF(${ca}${r0}:${ca}${r1},"FUNDAM",${cv}${r0}:${cv}${r1})` }, R$]] : []),
    ["Emendas", { formula: `COUNTIF(${cv}${r0}:${cv}${r1},">0")` }, g.max ? `0" de ${g.max}"` : "0"]];
  kp.forEach(([k, v, f], i) => { const a = ws.getCell(4, 2 + i), b = ws.getCell(5, 2 + i); a.value = k; a.font = { size: 9, bold: true, color: { argb: MUT } }; b.value = v; b.numFmt = f; b.font = { size: 13, bold: true, color: { argb: ESC } }; });
  const h = ws.getRow(r0 - 1); h.values = PI_COLS.map(([t, , , tp]) => tp === "l" ? t + " ▾" : t); h.height = 30;
  h.eachCell((cl, n) => { const a = PI_COLS[n - 1][3] === "a"; cl.fill = fill(a ? "FF4A5258" : ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
  const nC = (n) => PI_COLS.findIndex((q) => q[0] === n || q[2] === n) + 1;
  for (let k = 0; k < N; k++) { const r = r0 + k, x = it[k], row = ws.getRow(r);
    row.getCell(1).value = k + 1;
    if (x) { const conv = /Conv|Termo|Acordo/.test(x.modalidade || "") || tipoDe(x) === "ent";
      const v = { municipio: x.municipio || "", area: x.area || g.trava || "", modalidade: x.modalidade || (BTIPO.find((b) => b[0] === tipoDe(x)) || [])[2] || "", objeto: frase(x.objeto || ""), valor: +x.valor || null, cnpj: conv ? x.cnpj || "" : "", razao_social: conv ? x.razao_social || x.beneficiario || "" : "" };
      PI_COLS.forEach(([, , f], n) => { if (f && v[f] != null && v[f] !== "") row.getCell(n + 1).value = v[f]; }); }
    else if (g.trava) row.getCell(nC("area")).value = g.trava;
    const at = (n, f) => { row.getCell(nC(n)).value = { formula: f }; };
    at("Conferência", `IF(AND(${cm}${r}="",${cv}${r}=""),"",IF(${cm}${r}="","falta município",IF(${ca}${r}="","falta área",IF(${ci}${r}="","falta instrumento",IF(${co}${r}="","falta objeto",IF(IF(ISNUMBER(${cv}${r}),${cv}${r},0)<${g.min || 0.01},"abaixo do mínimo",IF(AND(${ci}${r}="Convênio",OR(${cr}${r}="",LEN(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${cc}${r},".",""),"/",""),"-",""))<>14)),"falta CNPJ ou razão social","✓ ok")))))))`);
    at("Subação", `IF(${ca}${r}="","",IFERROR(VLOOKUP(${ca}${r},${AR},2,FALSE),""))`); at("Órgão", `IF(${ca}${r}="","",IFERROR(VLOOKUP(${ca}${r},${AR},3,FALSE),""))`); at("UO", `IF(${ca}${r}="","",IFERROR(VLOOKUP(${ca}${r},${AR},4,FALSE),""))`);
    const dv = (f, lista, msg) => { row.getCell(nC(f)).dataValidation = { type: "list", allowBlank: true, formulae: [lista], showErrorMessage: true, errorStyle: "stop", errorTitle: "Valor fora da lista", error: msg }; };
    dv("municipio", `Listas!$A$2:$A$${nM}`, "Escolha um município de SC da lista."); dv("area", `Listas!$D$2:$D$${nA}`, "Escolha uma área permitida nesta cota."); dv("modalidade", `Listas!$I$2:$I$${g.mods.length + 1}`, "Escolha um instrumento permitido nesta cota.");
    row.getCell(nC("valor")).numFmt = R$;
    row.eachCell({ includeEmpty: true }, (cl, n) => { const tp = PI_COLS[n - 1] && PI_COLS[n - 1][3]; cl.border = { bottom: fino }; cl.alignment = { vertical: "top", wrapText: [nC("objeto"), nC("razao_social")].includes(n) }; cl.font = { size: 10, color: { argb: tp === "a" ? MUT : ESC } }; cl.fill = fill(tp === "a" ? SF : k % 2 ? TL : "FFFFFFFF"); }); }
  const tr = ws.getRow(r1 + 1); tr.getCell(nC("objeto")).value = "TOTAL"; tr.getCell(nC("objeto")).alignment = { horizontal: "right" }; tr.getCell(nC("valor")).value = { formula: `SUM(${cv}${r0}:${cv}${r1})` }; tr.getCell(nC("valor")).numFmt = R$; tr.font = { bold: true }; tr.eachCell((cl) => { cl.border = { top: { style: "medium", color: { argb: ESC } } }; });
  ws.addConditionalFormatting({ ref: `${cc}${r0}:${cr}${r1}`, rules: [{ type: "expression", formulae: [`$${ci}${r0}<>"Convênio"`], style: { fill: fill("FFE4E7EA"), font: { color: { argb: "FFB0B5BA" } } } }] });
  ws.addConditionalFormatting({ ref: `${cv}${r0}:${cv}${r1}`, rules: [{ type: "expression", formulae: [`AND(${cv}${r0}<>"",${cv}${r0}<${g.min || 0})`], style: { font: { color: { argb: "FFC0392B" }, bold: true }, fill: fill("FFFDE7E3") } }] });
  ws.addConditionalFormatting({ ref: `${cf}${r0}:${cf}${r1}`, rules: [{ type: "containsText", operator: "containsText", text: "✓", style: { font: { color: { argb: VD }, bold: true } } }, { type: "containsText", operator: "containsText", text: "falta", style: { font: { color: { argb: OR }, bold: true } } }, { type: "containsText", operator: "containsText", text: "mínimo", style: { font: { color: { argb: "FFC0392B" }, bold: true } } }] });

  // ---- Dados (oculta): histórico + uma linha por fórmula para cada linha da aba Indicação
  dd.getRow(1).values = ["Fonte", "Ano", "Região", "Município", "Área", "Instrumento", "Situação", "Valor", "Pago", "Objeto"];
  const H = E0.map((e) => [PI_HIST, String(+e.ano || String(e.k || "").slice(0, 4)), (BASE.mun[e.mi] || {}).assoc || e.assoc || "—", (BASE.mun[e.mi] || {}).n || e.mun || "—", piAreaHist(e), piMod(e.mod), piSit(e), +e.v || 0, +e.vp || 0, frase(e.obj || "").slice(0, 200)]);
  H.forEach((l, k) => { dd.getRow(2 + k).values = l; });
  const d0 = 2 + H.length, d1 = d0 + N - 1;
  for (let k = 0; k < N; k++) { const s = r0 + k, q = (f) => ({ formula: `IF(OR('Indicação'!$${cv}$${s}="",'Indicação'!$${cv}$${s}=0),"",${f})` }), I = (cl) => `IF('Indicação'!$${cl}$${s}="","—",'Indicação'!$${cl}$${s})`;
    dd.getRow(d0 + k).values = [q(`"${FN}"`), q(`"${ano}"`), q(`IFERROR(VLOOKUP('Indicação'!$${cm}$${s},Listas!$A$2:$B$${nM},2,FALSE),"—")`), q(I(cm)), q(I(ca)), q(I(ci)), q(`"Indicada agora"`), q(`'Indicação'!$${cv}$${s}`), q("0"), q(`'Indicação'!$${co}$${s}`)]; }
  const DR = (L2) => `Dados!$${L2}$2:$${L2}$${d1}`;
  // critério dos filtros do Painel (linha 9, colunas B..H): "Todos" vira "diferente de §" (vale em qualquer planilha, sem coringa); skip deixa de fora o próprio filtro de um bloco
  const PF = {}; PI_FILT.forEach(([, L2], i) => { PF[L2] = `Painel!$${col(1 + i)}$9`; });
  const crit = (skip) => PI_FILT.filter(([, L2]) => !(skip || []).includes(L2)).map(([, L2]) => `${DR(L2)},IF(${PF[L2]}="Todos","<>§",${PF[L2]})`).join(",");
  const soma = (campo, extra, skip) => `SUMIFS(${DR(campo)},${crit(skip)}${extra ? "," + extra : ""})`, conta = (extra, skip) => `COUNTIFS(${DR("H")},">0",${crit(skip)}${extra ? "," + extra : ""})`;
  const NOVA = `${DR("A")},"${FN}"`, HIS = `${DR("A")},"${PI_HIST}"`;
  const op = { A: [PI_HIST, FN], B: piUniq([...H.map((l) => l[1]), String(ano)]).sort(), C: piUniq(muns.map((m) => m.reg)).sort(), D: muns.map((m) => m.n), E: piUniq([...H.map((l) => l[4]), ...g.areas]).sort((a, b) => a.localeCompare(b, "pt-BR")), F: piUniq([...H.map((l) => l[5]), ...g.mods]), G: ["Pago", "Pago em parte", "Sem pagamento", "Indicada agora"] };
  PI_FILT.forEach(([t, L2], i) => { const cn = 12 + i; ls.getCell(1, cn).value = t; ["Todos", ...op[L2]].forEach((v, j) => { ls.getCell(2 + j, cn).value = v; }); });

  // ---- Por município (com coordenadas e as séries do mapa)
  pm.columns = [24, 14, 11, 11, 17, 16, 17, 10, 11, 11, 17, 12, 3, 17, 3].map((w) => ({ width: w }));
  pm.mergeCells("A1:L1"); pm.getCell("A1").value = "Recursos por município · com os filtros do Painel"; pm.getCell("A1").font = { size: 14, bold: true };
  const ph = pm.getRow(3); ph.values = ["Município", "Região", "Longitude", "Latitude", "Histórico (filtro)", "Pago (filtro)", `${FN} (filtro)`, "Emendas (filtro)", "Votos 2026", "Votos 2022", "Total (filtro)", "R$ por voto", "", "Recurso total (sem filtro)", ""];
  ph.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", wrapText: true }; }); ph.height = 30;
  const regF = PF.C, munF = PF.D;
  muns.forEach((m, k) => { const r = 4 + k, row = pm.getRow(r), b = BASE.mun[m.i], aqui = `${DR("D")},A${r}`;
    row.values = [m.n, m.reg, b.lon, b.lat, { formula: soma("H", `${HIS},${aqui}`, ["A"]) + `*(OR(${PF.A}="Todos",${PF.A}="${PI_HIST}"))` }, { formula: soma("I", `${HIS},${aqui}`, ["A"]) + `*(OR(${PF.A}="Todos",${PF.A}="${PI_HIST}"))` },
      { formula: soma("H", `${NOVA},${aqui}`, ["A"]) + `*(OR(${PF.A}="Todos",${PF.A}="${FN}"))` }, { formula: conta(aqui) }, (PARL.v || [])[m.i] || 0, (PARL.v22 || [])[m.i] || 0, { formula: `E${r}+G${r}` }, { formula: `IF(OR(I${r}=0,K${r}=0),"",K${r}/I${r})` },
      { formula: `K${r}+ROW()/1000000000` }, { formula: `SUMIF(${DR("D")},A${r},${DR("H")})` },
      { formula: `IF(OR(I${r}<100,AND(${regF}<>"Todos",B${r}<>${regF}),AND(${munF}<>"Todos",A${r}<>${munF})),999999999999,N${r}/I${r}+ROW()/1000000000)` }];
    [5, 6, 7, 11, 14].forEach((n) => { row.getCell(n).numFmt = R0; }); row.getCell(12).numFmt = R0; [9, 10].forEach((n) => { row.getCell(n).numFmt = "#,##0"; });
    [13, 15].forEach((n) => { row.getCell(n).font = { color: { argb: "FFFFFFFF" }, size: 6 }; });
    row.eachCell({ includeEmpty: true }, (cl, n) => { if (![13, 15].includes(n)) { cl.border = { bottom: fino }; cl.font = { size: 10, color: { argb: [2, 3, 4].includes(n) ? MUT : ESC }, bold: n === 11 }; } }); });
  const pr1 = 3 + muns.length; pm.getColumn(13).hidden = true; pm.getColumn(15).hidden = true;
  pm.addConditionalFormatting({ ref: `K4:K${pr1}`, rules: [{ type: "dataBar", cfvo: [{ type: "num", value: 0 }, { type: "max" }], color: { argb: AZ }, gradient: false }] });
  // séries do mapa (colunas Q:U): três blocos (histórico, pago, esta indicação); vazio quando zero para o gráfico não desenhar
  const nm = muns.length, mq = 4, blocos = [["Histórico", "E"], ["Pago", "F"], [FN, "G"]];
  pm.getCell(3, 17).value = "Mapa · grupo"; pm.getCell(3, 18).value = "Longitude"; pm.getCell(3, 19).value = "Latitude"; pm.getCell(3, 20).value = "Valor"; pm.getCell(3, 21).value = "Município";
  blocos.forEach(([gr, cl], b) => muns.forEach((m, k) => { const r = mq + b * nm + k, src = 4 + k, z = `${cl}${src}=0`;
    pm.getCell(r, 17).value = gr; pm.getCell(r, 18).value = { formula: `IF(${z},"",C${src})` }; pm.getCell(r, 19).value = { formula: `IF(${z},"",D${src})` }; pm.getCell(r, 20).value = { formula: `IF(${z},"",${cl}${src})` }; pm.getCell(r, 21).value = m.n;
    for (let n = 17; n <= 21; n++) pm.getCell(r, n).font = { size: 8, color: { argb: "FFB0B5BA" } }; }));
  const mapaR = { de: mq - 1, ate: mq - 1 + 3 * nm };

  // ---- Painel
  pn.columns = [3, 24, 17, 17, 17, 17, 17, 17, 3].map((w) => ({ width: w }));
  const bar = (p, n = 20) => `REPT("█",ROUND(MAX(0,MIN(1,${p}))*${n},0))&REPT("░",${n}-ROUND(MAX(0,MIN(1,${p}))*${n},0))`;
  const cel = (r, c2, v, f, font) => { const x = pn.getCell(r, c2); x.value = v; if (f) x.numFmt = f; if (font) x.font = font; return x; };
  const titulo = (r, t, sub) => { pn.mergeCells(r, 2, r, 8); cel(r, 2, t, null, { size: 12, bold: true, color: { argb: ESC } }).border = { bottom: { style: "medium", color: { argb: ESC } } }; if (sub) { pn.mergeCells(r + 1, 2, r + 1, 8); cel(r + 1, 2, sub, null, { size: 9, italic: true, color: { argb: MUT } }); } };
  pn.mergeCells("B2:H2"); cel(2, 2, "SimulaLEGIS · Gabinete · Painel de recursos", null, { size: 9, bold: true, color: { argb: MUT } });
  pn.mergeCells("B3:H3"); cel(3, 2, `${PARL.u || ""} · ${PARL.p || ""}`, null, { size: 22, bold: true, color: { argb: ESC } });
  pn.mergeCells("B4:H4"); cel(4, 2, `${PI_HIST} (portal da SEF${META.coletado_em ? ", coleta de " + new Date(META.coletado_em).toLocaleDateString("pt-BR") : ""}) + ${FN} (aba Indicação). A área das emendas antigas sem ligação com a planilha do gabinete é estimada pelo objeto.`, null, { size: 9, italic: true, color: { argb: MUT } });
  titulo(6, "Filtros", "Escolha nas células amarelas; tudo abaixo (e o mapa, no Google Planilhas) muda junto.");
  PI_FILT.forEach(([t], i) => { cel(8, 2 + i, t + " ▾", null, { size: 9, bold: true, color: { argb: MUT } }); const x = cel(9, 2 + i, "Todos", null, { size: 11, bold: true, color: { argb: ESC } }); x.fill = fill(AM); x.border = { top: fino, bottom: fino, left: fino, right: fino };
    x.dataValidation = { type: "list", allowBlank: false, formulae: [`Listas!$${col(11 + i)}$2:$${col(11 + i)}$${2 + op[PI_FILT[i][1]].length}`], showErrorMessage: true, errorTitle: "Filtro", error: "Escolha um valor da lista." }; });
  [["Histórico indicado", { formula: soma("H", HIS) }, R0], ["Histórico pago", { formula: `IF(B12=0,0,${soma("I", HIS)}/B12)` }, PCT], [FN, { formula: soma("H", NOVA) }, R0], ["Emendas", { formula: conta() }, "0"], ["Municípios", { formula: `COUNTIF('Por município'!$K$4:$K$${pr1},">0")` }, "0"], ["R$ por voto", { formula: `IFERROR((B12+D12)/SUMIF('Por município'!$K$4:$K$${pr1},">0",'Por município'!$I$4:$I$${pr1}),"")` }, R0]]
    .forEach(([k, v, f], i) => { cel(11, 2 + i, k, null, { size: 9, color: { argb: MUT } }); cel(12, 2 + i, v, f, { size: 14, bold: true, color: { argb: ESC } }); });
  let r = 14;
  // regras da cota (só a aba Indicação, sem filtro)
  if (g.disp) { titulo(r, `Regras · ${tit}`, "Só o que está na aba Indicação, sem os filtros."); r += 2;
    const regra = (rot, v, m, ref) => { cel(r, 2, rot, null, { size: 10 }); cel(r, 3, { formula: v }, R0, { bold: true }); cel(r, 4, m ? { formula: m } : "", R0, { color: { argb: MUT } }); pn.mergeCells(r, 5, r, 7); cel(r, 5, { formula: bar(`IF(${ref}=0,0,C${r}/${ref})`) }, null, { name: "Consolas", color: { argb: ESC } });
      cel(r, 8, { formula: m ? `IF(C${r}>=D${r}-0.005,"✓ atingido","faltam "&TEXT(D${r}-C${r},"#,##0"))` : `TEXT(C${r}/${ref},"0%")&" usado"` }, null, { bold: true }); r++; };
    regra("Cota usada", `'Indicação'!C5`, null, `'Indicação'!B5`);
    if (g.saude) regra(`Saúde · mínimo ${g.saude * 100}%`, `SUMIF(${ind(ca)},"Saúde",${ind(cv)})`, `'Indicação'!B5*${g.saude}`, `D${r}`);
    if (c.fundam) regra(`FUNDAM · mínimo ${c.fundam * 100}%`, `SUMIF(${ind(ca)},"FUNDAM",${ind(cv)})`, `'Indicação'!B5*${c.fundam}`, `D${r}`);
    pn.addConditionalFormatting({ ref: `H16:H${r - 1}`, rules: [{ type: "containsText", operator: "containsText", text: "✓", style: { font: { color: { argb: VD }, bold: true } } }, { type: "containsText", operator: "containsText", text: "faltam", style: { font: { color: { argb: "FFC0392B" }, bold: true } } }] }); r++; }
  // blocos por dimensão: histórico (azul), pago, esta indicação (laranja)
  const bloco = (t, L2, vals) => { titulo(r, t); r++; ["", "Histórico", "Pago", "% pago", FN, "Total"].forEach((x, i) => cel(r, 2 + i, x, null, { size: 9, bold: true, color: { argb: MUT } })); r++;
    const i0 = r, i1 = r + vals.length - 1; vals.forEach((v) => { const cr2 = `${DR(L2)},"${v}"`; cel(r, 2, v, null, { size: 10 });
      cel(r, 3, { formula: soma("H", `${HIS},${cr2}`, [L2]) }, R0); cel(r, 4, { formula: soma("I", `${HIS},${cr2}`, [L2]) }, R0); cel(r, 5, { formula: `IF(C${r}=0,"",D${r}/C${r})` }, PCT); cel(r, 6, { formula: soma("H", `${NOVA},${cr2}`, [L2]) }, R0, { color: { argb: OR } });
      cel(r, 7, { formula: `C${r}+F${r}` }, R0, { bold: true }); cel(r, 8, { formula: `IF(MAX($G$${i0}:$G$${i1})=0,"",${bar(`G${r}/MAX($G$${i0}:$G$${i1})`, 16)})` }, null, { name: "Consolas", size: 9, color: { argb: "FF4A5258" } }); r++; });
    r++; };
  const tot = (i) => (v) => H.filter((l) => l[i] === v).reduce((s, l) => s + l[7], 0), ord = (i, a) => a.sort((x, y) => tot(i)(y) - tot(i)(x));
  bloco("Por área", "E", ord(4, [...op.E])); bloco("Por região (associação de municípios)", "C", ord(2, [...op.C])); bloco("Por instrumento", "F", ord(5, [...op.F])); bloco("Por ano", "B", op.B);
  // municípios com mais recurso (com os filtros)
  titulo(r, "Os 20 municípios com mais recurso (com os filtros)"); r++;
  ["Município", "Região", "Histórico", "% pago", FN, "Votos 2026", "R$ por voto"].forEach((t, i) => cel(r, 2 + i, t, null, { size: 9, bold: true, color: { argb: MUT } })); r++;
  const PMx = (L2) => `'Por município'!$${L2}$4:$${L2}$${pr1}`, top = (k, chave, fn) => `MATCH(${fn}(${PMx(chave)},${k}),${PMx(chave)},0)`;
  for (let k = 1; k <= 20; k++, r++) { const m = top(k, "M", "LARGE"), ok = `LARGE(${PMx("M")},${k})>=1`, I2 = (L2) => `IF(${ok},INDEX(${PMx(L2)},${m}),"")`;
    cel(r, 2, { formula: I2("A") }, null, { bold: true }); cel(r, 3, { formula: I2("B") }, null, { color: { argb: MUT } }); cel(r, 4, { formula: I2("E") }, R0); cel(r, 5, { formula: `IF(${ok},IFERROR(INDEX(${PMx("F")},${m})/INDEX(${PMx("E")},${m}),""),"")` }, PCT);
    cel(r, 6, { formula: I2("G") }, R0, { color: { argb: OR } }); cel(r, 7, { formula: I2("I") }, "#,##0"); cel(r, 8, { formula: I2("L") }, R0); }
  r++;
  // onde ainda não chegou: muitos votos em 2026 e pouco recurso (respeita só os filtros de região e município)
  titulo(r, "Onde ainda não chegou", "Municípios com 100 votos ou mais em 2026, do menor para o maior R$ por voto (todo o recurso, histórico + esta indicação)."); r += 2;
  ["Município", "Região", "Votos 2026", "Recurso total", "R$ por voto"].forEach((t, i) => cel(r, 2 + i, t, null, { size: 9, bold: true, color: { argb: MUT } })); r++;
  for (let k = 1; k <= 15; k++, r++) { const m = top(k, "O", "SMALL"), ok = `SMALL(${PMx("O")},${k})<999999999998`, I2 = (L2) => `IF(${ok},INDEX(${PMx(L2)},${m}),"")`;
    cel(r, 2, { formula: I2("A") }, null, { bold: true }); cel(r, 3, { formula: I2("B") }, null, { color: { argb: MUT } }); cel(r, 4, { formula: I2("I") }, "#,##0"); cel(r, 5, { formula: I2("N") }, R0); cel(r, 6, { formula: `IF(${ok},IFERROR(INDEX(${PMx("N")},${m})/INDEX(${PMx("I")},${m}),0),"")` }, R0); }
  pn.getCell(r + 1, 2).value = "No Google Planilhas (botão “Criar no meu Google Drive”), esta aba ganha o mapa ao lado, que acompanha os filtros."; pn.getCell(r + 1, 2).font = { size: 9, italic: true, color: { argb: MUT } };

  // ---- Orçamento: o modelo oficial, montado por fórmula a partir das indicações
  oc.columns = [8, 50, 14, 16, 22, 22, 10, 14, 20, 34].map((w) => ({ width: w }));
  oc.mergeCells("A1:J1"); oc.getCell("A1").value = (L && L.origem) || tit; oc.getCell("A1").font = { size: 13, bold: true };
  [["Gabinete", "GAB DEP " + norm(PARL.u || "").toUpperCase()], ["Valor disponível", { formula: "'Indicação'!B5" }], ["Saldo", { formula: "'Indicação'!D5" }]].forEach(([k, v], i) => { oc.getCell(3 + i, 1).value = k; oc.getCell(3 + i, 1).font = { bold: true, size: 9, color: { argb: MUT } }; oc.mergeCells(3 + i, 1, 3 + i, 2); oc.getCell(3 + i, 3).value = v; oc.getCell(3 + i, 3).numFmt = R$; });
  const oh = oc.getRow(7); oh.values = ["Emenda", "Objeto", "Subação deduzida", "Valor", "Modalidade", "Município", "Órgão", "Unidade orçamentária", "CNPJ", "Razão Social"]; oh.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { wrapText: true, vertical: "middle" }; }); oh.height = 28;
  for (let k = 0; k < N; k++) { const s2 = r0 + k, row = oc.getRow(8 + k), q = (f) => ({ formula: `IF('Indicação'!$${cv}$${s2}="","",${f})` }), R = (n) => `'Indicação'!${col(nC(n) - 1)}${s2}`;
    row.values = [q(`'Indicação'!A${s2}`), q(R("objeto")), q(R("Subação")), q(R("valor")), q(R("modalidade")), q(R("municipio")), q(R("Órgão")), q(R("UO")), q(`IF(${R("modalidade")}="Convênio",${R("cnpj")},"")`), q(`IF(${R("modalidade")}="Convênio",${R("razao_social")},"")`)];
    row.getCell(4).numFmt = R$; row.eachCell({ includeEmpty: true }, (cl, n) => { cl.border = { bottom: fino }; cl.alignment = { vertical: "top", wrapText: n === 2 || n === 10 }; cl.font = { size: 10 }; }); }
  const ot = oc.getRow(8 + N); ot.getCell(1).value = "TOTAL"; ot.getCell(4).value = { formula: `SUM(D8:D${7 + N})` }; ot.getCell(4).numFmt = R$; ot.font = { bold: true };
  wb.views = [{ activeTab: 0, firstSheet: 0 }];
  return { wb, nome: `Indicacao-${(L ? L.apelido || "lista" : T.nome).replace(/[^\w-]+/g, "_")}-${norm(PARL.u || "").replace(/ /g, "_")}`, pr1, mapaR };
}

// ---------- saídas: .xlsx e Google Drive ----------
async function xlsxInd(T) {
  const { wb, nome } = await montarPlanilhaInd(T), buf = await wb.xlsx.writeBuffer(), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = nome + ".xlsx"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// envia o .xlsx ao Drive já convertido em Planilha Google (escopo drive.file: o sistema só enxerga o que ele mesmo criou) e põe o mapa
async function googleInd(T) {
  const marca = ["gab_ind_google", JSON.stringify({ ano: IND.ano, tag: IND.tag, criar: 1 })];
  const token = await tokenGoogle(); if (!token) { if (!pedirDriveDeNovo()) throw new Error("SEM_AUTORIZACAO"); await autorizarDrive(marca); return null; }
  const { wb, nome, mapaR } = await montarPlanilhaInd(T), buf = await wb.xlsx.writeBuffer(), bd = "slb" + Date.now();
  const meta = { name: nome.replace(/_/g, " "), mimeType: "application/vnd.google-apps.spreadsheet" };
  const corpo = new Blob([`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`, buf, `\r\n--${bd}--`]);
  const up = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "multipart/related; boundary=" + bd }, body: corpo });
  const f = await up.json();
  if (!up.ok) { const msg = (f.error && f.error.message) || String(up.status);
    // token vencido ou sem o escopo do Drive: esquece e pede a autorização de novo (no máximo uma vez a cada 3 min, para não virar ciclo)
    if ((up.status === 401 || up.status === 403) && !/has not been used|is disabled|SERVICE_DISABLED/i.test(msg)) { esquecerTokenGoogle(); if (pedirDriveDeNovo()) { await autorizarDrive(marca); return null; } throw new Error("SEM_AUTORIZACAO"); }
    throw new Error(msg); }
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${f.id}`, ss = await (await fetch(base + "?fields=sheets.properties", { headers: { Authorization: "Bearer " + token } })).json();
  const sid = (t) => ((ss.sheets || []).find((s) => s.properties.title === t) || {}).properties?.sheetId;
  // mapa: gráfico de bolhas (longitude × latitude) sobre as colunas Q:U de "Por município" — três grupos (histórico, pago, esta
  // indicação), cada um com a sua cor; as linhas zeradas ficam vazias e não aparecem. Acompanha os filtros do Painel.
  const P = sid("Por município"), src = (c0) => ({ sourceRange: { sources: [{ sheetId: P, startRowIndex: mapaR.de, endRowIndex: mapaR.ate, startColumnIndex: c0, endColumnIndex: c0 + 1 }] } });
  if (P != null && sid("Painel") != null) await gapi(token, base + ":batchUpdate", { requests: [{ addChart: { chart: { spec: { title: "Mapa dos recursos · acompanha os filtros", bubbleChart: { legendPosition: "BOTTOM_LEGEND", domain: src(17), series: src(18), groupIds: src(16), bubbleSizes: src(19), bubbleMinRadiusSize: 2, bubbleMaxRadiusSize: 26, bubbleOpacity: .5 } },
    position: { overlayPosition: { anchorCell: { sheetId: sid("Painel"), rowIndex: 5, columnIndex: 9 }, widthPixels: 680, heightPixels: 560 } } } } }] });
  return "https://docs.google.com/spreadsheets/d/" + f.id + "/edit";
}
function abrirPlanilhaInd(T) {
  const url = T.L && (T.L.regras || {}).planilha_google, logado = !!(typeof SESS !== "undefined" && SESS);
  return avisoPlan(`<b>Planilha de indicação</b><div class="icft"><p>Abas <b>Indicação</b> (o formulário, com listas de escolha e conferência por linha), <b>Painel</b> (esta indicação e todo o histórico do mandato, com filtros), <b>Por município</b> e <b>Orçamento</b> (modelo oficial). Depois de preenchida, volta para cá com <b>Importar planilha</b>.</p>
    ${url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">Abrir a planilha já criada no Google</a></p>` : ""}<p class="mut" style="font-size:12px">No Google a aba Painel ganha o mapa. Na primeira vez o Google pede autorização para o sistema criar arquivos no seu Drive; ele só enxerga as planilhas que ele mesmo criar.</p></div>
    <div><button class="lk0" data-x>Fechar</button><button class="btn sec" data-xl>Baixar .xlsx</button><button class="btnp ibtv" data-gg${logado ? "" : ' disabled title="Entre com a conta Google para usar o Drive"'}>${url ? "Criar outra no Google" : "Criar no meu Google Drive"}</button></div><span class="mut" data-msg style="font-size:12px"></span>`, async (w) => {
    w.querySelector("[data-xl]").onclick = async () => { w.querySelector("[data-msg]").textContent = "Gerando…"; try { await xlsxInd(T); w.remove(); } catch (er) { w.querySelector("[data-msg]").textContent = "Não foi possível gerar: " + (er.message || er); } };
    const gg = w.querySelector("[data-gg]"); if (gg) gg.onclick = async () => { const m = w.querySelector("[data-msg]"); m.textContent = "Criando no Google Drive…";
      try { const u = await googleInd(T); if (!u) return; if (T.L) T.L = await gravar("gab_listas", { id: T.L.id, regras: { ...(T.L.regras || {}), planilha_google: u } }); m.innerHTML = `Pronto. <a href="${esc(u)}" target="_blank" rel="noopener">Abrir a planilha</a>`; window.open(u, "_blank"); }
      catch (er) { if (/has not been used in project|is disabled|SERVICE_DISABLED/i.test(er.message)) { m.innerHTML = "O Google ainda não liberou a criação de planilhas para este site (falta ativar a API do Google Drive e a do Google Planilhas no projeto do Google Cloud do sistema). Enquanto isso, use <b>Baixar .xlsx</b> e abra no Google Planilhas."; return; }
        m.innerHTML = er.message === "SEM_AUTORIZACAO" ? "O Google não devolveu a autorização do Drive. Saia do site, entre de novo com a conta Google e tente outra vez; enquanto isso, use <b>Baixar .xlsx</b>." : esc("Não foi possível criar: " + (er.message || er)); } };
  });
}
// janela simples no padrão do cadeado (cfp/cfb)
function avisoPlan(html, liga) { let w = document.getElementById("cfPlan"); if (w) w.remove();
  document.body.insertAdjacentHTML("beforeend", `<div id="cfPlan" class="cfp"><div class="cfb icfb ipl2">${html}</div></div>`); w = document.getElementById("cfPlan");
  w.onclick = (e) => { if (e.target === w) w.remove(); }; w.querySelectorAll("[data-x]").forEach((b) => b.onclick = () => w.remove()); liga(w); return w; }

// ---------- importar ----------
const PI_CAB = { quem: /^quem recebe/, municipio: /^munic/, area: /^(area|funcao)/, natureza: /^natureza/, objeto: /^objeto/, valor: /^valor/, razao_social: /^(entidade|razao social)/, beneficiario: /^beneficiario/, cnpj: /^cnpj/, modalidade: /^(trocar instrumento|instrumento)/, lideranca: /^lider/, observacao: /^observa/ };
const piTxt = (v) => v == null ? "" : typeof v === "object" ? (v.richText ? v.richText.map((t) => t.text).join("") : v.result != null ? String(v.result) : v.text || "") : String(v);
const piNum = (v) => { if (v && typeof v === "object") v = v.result; if (typeof v === "number") return v; const s = String(v || "").replace(/[^\d,.-]/g, ""); return +(/,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "")) || 0; };
function piDist(a, b) { a = norm(a); b = norm(b); const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
function piCasa(v, lista, tol = 2) { if (!v) return { v: "" }; const n = norm(v), ex = lista.find((x) => norm(x) === n); if (ex) return { v: ex, aj: ex !== v ? ex : null };
  let best = null, bd = 99; lista.forEach((x) => { const dd2 = piDist(v, x); if (dd2 < bd) { bd = dd2; best = x; } }); return bd <= tol ? { v: best, sug: best } : { v: null }; }
// lê a aba Indicação (ou Indicações, do modelo anterior) e devolve as linhas conferidas
async function lerPlanilhaInd(buf, T) {
  await piExcel(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const ws = wb.worksheets.find((w) => /^indica/i.test(norm(w.name).toLowerCase())) || wb.worksheets[0]; if (!ws) throw new Error("A planilha não tem a aba Indicação.");
  let hr = 0, mapa = {}; for (let r = 1; r <= Math.min(20, ws.rowCount); r++) { const M = {}; ws.getRow(r).eachCell((cl, n) => { const t = norm(piTxt(cl.value)).toLowerCase().replace(/ ▾$/, ""); Object.entries(PI_CAB).forEach(([f, re]) => { if (re.test(t) && !M[f]) M[f] = n; }); }); if (M.municipio && M.valor) { hr = r; mapa = M; break; } }
  if (!hr) throw new Error("Não encontrei o cabeçalho com Município e Valor na aba " + ws.name + ".");
  const g = regrasInd(T), MUNS = BASE.mun.map((m) => m.n), QUEM = BTIPO.map((b) => b[1]), out = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) { const row = ws.getRow(r), get = (f) => mapa[f] ? piTxt(row.getCell(mapa[f]).value).trim() : "";
    const val = mapa.valor ? piNum(row.getCell(mapa.valor).value) : 0, mun0 = get("municipio"), obj = get("objeto");
    if (!mun0 && !val && !obj) continue; let ehTot = false; row.eachCell((cl) => { if (norm(piTxt(cl.value)) === "TOTAL") ehTot = true; }); if (ehTot) continue;
    const L = { linha: r, ok: [], aj: [], er: [] }, x = {};
    const m = piCasa(mun0, MUNS); if (!mun0) L.er.push("falta município"); else if (m.v == null) L.er.push(`município “${mun0}” não é de SC`); else { x.municipio = m.v; if (m.sug) L.aj.push(`“${mun0}” → ${m.v}`); }
    // quem recebe: coluna própria (modelo anterior) ou, no modelo atual, pelo instrumento (TE → município, Convênio → entidade, ED → estado)
    const q0 = get("quem"), q = piCasa(q0, QUEM, 1), mo0 = get("modalidade"), mo = piCasa(mo0, [...g.mods, "Convênio Simplificado", "Termo de Fomento", "Termo de Colaboração"], 2);
    const t = q.v ? BTIPO.find((b) => b[1] === q.v)[0] : mo.v === "Transferência Especial" ? "mun" : /Conv|Termo/.test(mo.v || "") ? "ent" : mo.v === "Execução Direta" ? "est" : "";
    if (q0 && !q.v) L.er.push(`quem recebe “${q0}” fora da lista`); else if (!t) L.aj.push("sem instrumento (escolha na tela)");
    if (t) x.benef_tipo = t;
    const a0 = get("area") || g.trava || "", a = piCasa(a0, AREAS.map((z) => z[1]), 2); if (a0 && !a.v) L.er.push(`área “${a0}” fora da lista`); else if (a.v) { if (!g.areas.includes(a.v)) L.er.push(`área ${a.v} não é permitida nesta cota`); else { x.area = a.v; if (a.sug || a.aj) L.aj.push(`área “${a0}” → ${a.v}`); } }
    const n0 = get("natureza"), nt = piCasa(n0, ["Investimento", "Custeio"], 2); if (n0 && !nt.v) L.aj.push(`natureza “${n0}” ignorada`); else if (nt.v) x.natureza = nt.v;
    if (obj) x.objeto = obj; else L.aj.push("sem objeto (entra como rascunho para completar)");
    if (!val) L.er.push("sem valor"); else if (g.min && val < g.min - .005) L.er.push(`${rc(val)} abaixo do mínimo de ${rc(g.min)}`); else x.valor = Math.round(val * 100) / 100;
    if (mo0 && !mo.v) L.er.push(`instrumento “${mo0}” fora da lista`); else if (mo.v && !g.mods.includes(mo.v) && !/Conv|Termo/.test(mo.v)) L.er.push(`instrumento ${mo.v} não é permitido nesta cota`);
    x.modalidade = /Conv|Termo/.test(mo.v || "") ? "Convênio" : mo.v || (t ? BTIPO.find((b) => b[0] === t)[2] : null); if (x.modalidade && !g.mods.includes(x.modalidade)) x.modalidade = null;
    const rz = get("razao_social") || (t === "ent" ? get("beneficiario") : ""), cj = get("cnpj").replace(/\D/g, "");
    if (t === "ent") { if (rz) { x.razao_social = rz; x.beneficiario = rz; } if (cj.length === 14) x.cnpj = cj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"); if (!rz || cj.length !== 14) L.aj.push("entidade sem razão social ou CNPJ completo"); }
    else if (t === "mun") x.beneficiario = benefAuto("mun", x, g); else if (t === "est") x.beneficiario = benefAuto("est", x, g);
    if (get("lideranca")) x.lideranca = get("lideranca"); if (get("observacao")) x.observacao = get("observacao");
    L.x = x; L.rot = `${x.municipio || mun0 || "—"} · ${val ? rc(val) : "sem valor"}`; out.push(L); }
  return { linhas: out, aba: ws.name };
}
function importarInd(T) {
  const url = T.L && (T.L.regras || {}).planilha_google, logado = !!(typeof SESS !== "undefined" && SESS);
  const w = avisoPlan(`<b>Importar planilha</b><div class="icft" data-corpo><p>O sistema lê a aba <b>Indicação</b>, confere cada linha contra as listas desta cota (municípios de SC, áreas, instrumentos, mínimo e máximo) e mostra o resultado <b>antes de gravar</b>.</p>
    <label class="idrop"><input type="file" accept=".xlsx" hidden><b>Escolher o arquivo .xlsx</b><span>No Google Planilhas: Arquivo › Fazer download › Microsoft Excel (.xlsx)</span></label>
    ${url ? `<button class="btn sec" data-gl style="width:100%;margin-top:8px"${logado ? "" : " disabled"}>Ler a planilha criada no Google Drive</button>` : ""}</div>
    <div><button class="lk0" data-x>Cancelar</button></div><span class="mut" data-msg style="font-size:12px"></span>`, (w2) => {
    const msg = w2.querySelector("[data-msg]");
    const seguir = async (buf) => { msg.textContent = "Lendo…"; try { const R = await lerPlanilhaInd(buf, T); msg.textContent = ""; conferenciaImp(w2, T, R); } catch (er) { msg.textContent = "Não foi possível ler: " + (er.message || er); } };
    w2.querySelector("input[type=file]").onchange = async (e) => { const f = e.target.files[0]; if (f) seguir(await f.arrayBuffer()); };
    const gl = w2.querySelector("[data-gl]"); if (gl) gl.onclick = async () => { const token = await tokenGoogle(); if (!token) { msg.textContent = "Entre de novo com a conta Google (Criar no meu Google Drive) para liberar a leitura."; return; }
      const id = (url.match(/\/d\/([\w-]+)/) || [])[1]; msg.textContent = "Baixando do Google…";
      try { const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}`, { headers: { Authorization: "Bearer " + token } }); if (!r.ok) throw new Error(r.status === 401 ? "autorização do Google expirou" : "erro " + r.status); seguir(await r.arrayBuffer()); }
      catch (er) { msg.textContent = "Não foi possível ler do Google: " + (er.message || er); } };
  });
}
function conferenciaImp(w, T, R) {
  const g = regrasInd(T), entra = R.linhas.filter((l) => !l.er.length), fora = R.linhas.filter((l) => l.er.length), aj = entra.filter((l) => l.aj.length);
  const atuais = T.L ? AD.itens.filter((x) => x.lista_id === T.L.id && cheia(x)) : [], soma = (L2) => L2.reduce((s, x) => s + (+x.valor || 0), 0);
  const regras = (modo) => { const base = modo === "subst" ? [] : atuais, tudo = [...base, ...entra.map((l) => l.x)], tot = soma(tudo), sd = soma(tudo.filter((x) => x.area === "Saúde"));
    return [[`Total depois de importar`, rc(tot), ""], g.disp ? [`Cabe no disponível (${rc(g.disp)})`, tot <= g.disp + .005 ? "✓ saldo " + rc(g.disp - tot) : "passa " + rc(tot - g.disp), tot <= g.disp + .005 ? "ok" : "er"] : null,
      g.saude && g.disp ? [`Saúde ≥ ${g.saude * 100}% do disponível`, sd >= g.disp * g.saude - .005 ? "✓ atingido" : "faltam " + rc(g.disp * g.saude - sd), sd >= g.disp * g.saude - .005 ? "ok" : "av"] : null,
      g.max ? [`Até ${g.max} emendas`, tudo.length <= g.max ? "✓ " + tudo.length : "passa: " + tudo.length, tudo.length <= g.max ? "ok" : "er"] : null].filter(Boolean); };
  const corpo = w.querySelector("[data-corpo]"), cab = w.querySelector(".cfb > div:last-of-type");
  const desenha = () => { const modo = (w.querySelector("[name=impm]:checked") || {}).value || "acr", rg = regras(modo), bloq = rg.some((x) => x[2] === "er");
    corpo.innerHTML = `<p class="mut" style="margin:0 0 8px">Aba <b>${esc(R.aba)}</b> · ${R.linhas.length} linha${R.linhas.length === 1 ? "" : "s"} com dados</p>
      <div class="irsm"><div><b class="ok">${entra.length - aj.length}</b><span>prontas</span></div><div><b class="av">${aj.length}</b><span>com ajuste</span></div><div><b class="er">${fora.length}</b><span>ficam fora</span></div></div>
      <div class="irel">${[...fora.map((l) => `<div><span class="er">✕</span><div>Linha ${l.linha} · ${esc(l.rot)}<small>${esc(l.er.join(" · "))}</small></div></div>`), ...aj.map((l) => `<div><span class="av">!</span><div>Linha ${l.linha} · ${esc(l.rot)}<small>${esc(l.aj.join(" · "))}</small></div></div>`), entra.length - aj.length ? `<div><span class="ok">✓</span><div>${entra.length - aj.length} emenda${entra.length - aj.length === 1 ? "" : "s"} conferida${entra.length - aj.length === 1 ? "" : "s"}<small>dentro das regras da cota</small></div></div>` : ""].join("")}</div>
      <div class="irg">${rg.map(([k, v, c2]) => `<div><span>${esc(k)}</span><b class="${c2}">${esc(v)}</b></div>`).join("")}</div>
      ${atuais.length ? `<div class="iopc"><label><input type="radio" name="impm" value="acr"${modo === "acr" ? " checked" : ""}><span>Acrescentar às ${atuais.length} emendas da lista</span></label><label><input type="radio" name="impm" value="subst"${modo === "subst" ? " checked" : ""}><span>Substituir: a lista fica igual à planilha <small>(as ${atuais.length} atuais são apagadas)</small></span></label></div>` : ""}`;
    cab.innerHTML = `<button class="lk0" data-x>Cancelar</button><button class="btnp ibtv" data-ok${!entra.length || bloq ? " disabled" : ""}>${bloq ? "Ajuste a planilha: passa das regras" : `Importar ${entra.length} emenda${entra.length === 1 ? "" : "s"}`}</button>`;
    cab.querySelector("[data-x]").onclick = () => w.remove(); corpo.querySelectorAll("[name=impm]").forEach((i) => i.onchange = desenha);
    const ok = cab.querySelector("[data-ok]"); if (ok && !ok.disabled) ok.onclick = () => gravarImp(w, T, entra, modo); };
  desenha();
}
async function gravarImp(w, T, entra, modo) {
  const msg = w.querySelector("[data-msg]"), g = regrasInd(T); w.querySelectorAll("button").forEach((b) => { b.disabled = true; }); msg.textContent = "Gravando…";
  try { const L = await garantirLista(T);
    if (modo === "subst" && L) for (const x of AD.itens.filter((y) => y.lista_id === L.id)) await apagar("gab_itens", x.id);
    let n = 0; for (const l of entra) { await gravar("gab_itens", { lista_id: L ? L.id : null, tipo: T.cota ? "Emenda impositiva" : null, status: "Em análise", ...(g.trava ? { area: g.trava } : {}), ...l.x }); n++; msg.textContent = `Gravando… ${n} de ${entra.length}`; }
    w.remove(); IND.det = null; desenharInd();
  } catch (er) { msg.textContent = "Parou no meio: " + (er.message || er) + ". O que já foi gravado continua na lista."; w.querySelectorAll("[data-x]").forEach((b) => { b.disabled = false; }); }
}
// volta do login do Google (autorização do Drive): reabre a Indicação na mesma lista
window.addEventListener("load", () => { let p = null; try { p = JSON.parse(sessionStorage.getItem("gab_ind_google") || "null"); sessionStorage.removeItem("gab_ind_google"); } catch (e) {}
  if (p) setTimeout(() => { if (typeof abrirInd !== "function") return; IND.ano = p.ano; IND.tag = p.tag; abrirInd(); const T = etiquetas(IND.ano).find((t) => t.k === IND.tag); if (!T) return; const w = abrirPlanilhaInd(T), gg = w && w.querySelector("[data-gg]"); if (p.criar && gg && !gg.disabled) gg.click(); }, 2500); });
