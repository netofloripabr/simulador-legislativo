// Gabinete · planilha da Indicação (02/11/2026). Um só modelo de planilha, gerado em .xlsx (ExcelJS) e, se o usuário quiser,
// convertido direto no Google Drive dele (aí ganha o mapa em gráfico de bolhas). Abas: Indicação (o formulário simples, só listas
// nas colunas de escolha), Painel (esta indicação + todo o histórico do mandato com 6 filtros por lista), Por município, Orçamento
// (modelo oficial, por fórmula), Listas e Dados (ocultas). Importar lê de volta a aba Indicação (do .xlsx ou do Google) pelos
// nomes das colunas — vale também para planilhas do modelo anterior — confere linha a linha e grava na lista.
// Usa os globais de gabinete.js, gabinete-adicionar.js, gabinete-planilha.js (tokenGoogle/gapi) e gabinete-indicar.js.

// colunas da aba Indicação: [título, largura, campo, tipo] — tipo: "l" lista, "a" automático
const PI_COLS = [["Nº", 5], ["Quem recebe", 14, "quem", "l"], ["Município", 22, "municipio", "l"], ["Área", 20, "area", "l"], ["Natureza", 13, "natureza", "l"], ["Objeto", 50, "objeto"], ["Valor (R$)", 16, "valor"],
  ["Entidade (razão social)", 30, "razao_social"], ["CNPJ", 19, "cnpj"], ["Conferência", 24, "", "a"], ["Instrumento", 22, "", "a"], ["Subação", 9, "", "a"], ["Órgão", 8, "", "a"], ["UO", 8, "", "a"],
  ["Trocar instrumento", 20, "modalidade", "l"], ["Líder", 20, "lideranca"], ["Observação", 30, "observacao"]];
const PI_R0 = 8; // 1ª linha de preenchimento (cabeçalho na 7)
const PI_FILT = [["Ano", "A"], ["Tipo de cota", "B"], ["Região", "C"], ["Modalidade", "D"], ["Área", "E"], ["Situação", "F"]];
const PI_TIPO = { "Emenda LOA": "LOA", "Emenda 0.55%": "Adicional 0,55%", "Excesso": "Excesso" };
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
const piMod = (m) => /Fomento/i.test(m || "") ? "Termo de Fomento" : m || "—";
const piSit = (e) => (e.vp || 0) >= (e.v || 0) - 1 && e.v ? "Pago" : (e.vp || 0) > 0 ? "Pago em parte" : "Sem pagamento";
const piTipoLista = (T) => T.cota ? ({ AN: "LOA", "0,55": "Adicional 0,55%", EX: "Excesso" }[T.cota.t] || T.nome) : "Lista do gabinete";
const piUniq = (a) => [...new Set(a.filter((x) => x != null && x !== ""))];

async function piExcel() { if (!window.ExcelJS) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); }); }

// ---------- montagem da planilha ----------
async function montarPlanilhaInd(T) {
  await piExcel();
  const L = T.L, g = regrasInd(T), c = T.cota || {}, it = L ? AD.itens.filter((x) => x.lista_id === L.id && cheia(x)) : [];
  const wb = new ExcelJS.Workbook(); wb.creator = "SimulaLEGIS"; wb.calcProperties.fullCalcOnLoad = true;
  const ESC = "FF1D2226", MUT = "FF6E767D", BD = "FFDEE2E5", SF = "FFF1F3F4", TL = "FFF8F9FA", OR = "FFE8822A", VD = "FF1FA845", AM = "FFFFFBEA";
  const fill = (x) => ({ type: "pattern", pattern: "solid", fgColor: { argb: x } }), fino = { style: "thin", color: { argb: BD } }, R$ = '"R$" #,##0.00', PCT = "0%";
  const N = Math.max(g.max || 0, it.length + 20, 30), r0 = PI_R0, r1 = r0 + N - 1, ano = IND.ano, tit = `${T.nome} · ${ano}`;
  const muns = BASE.mun.map((m, i) => ({ n: m.n, i, reg: m.assoc || "" })).sort((a, b) => a.n.localeCompare(b.n, "pt-BR"));
  const ws = wb.addWorksheet("Indicação", { views: [{ state: "frozen", ySplit: r0 - 1, xSplit: 3, showGridLines: false }] }),
    pn = wb.addWorksheet("Painel", { views: [{ showGridLines: false }] }), pm = wb.addWorksheet("Por município", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }] }),
    oc = wb.addWorksheet("Orçamento", { views: [{ showGridLines: false }] }), ls = wb.addWorksheet("Listas", { state: "hidden" }), dd = wb.addWorksheet("Dados", { state: "hidden" });
  const col = (k) => String.fromCharCode(65 + k), IC = {}; PI_COLS.forEach(([t, , f], k) => { IC[f || t] = col(k); });
  const ind = (cl) => `'Indicação'!$${cl}$${r0}:$${cl}$${r1}`;

  // ---- Listas (apoio das listas suspensas e das fórmulas)
  ls.getCell("A1").value = "Município"; ls.getCell("B1").value = "Região"; muns.forEach((m, i) => { ls.getCell(2 + i, 1).value = m.n; ls.getCell(2 + i, 2).value = m.reg; });
  ls.getCell("D1").value = "Área"; ls.getCell("E1").value = "Subação"; ls.getCell("F1").value = "Órgão"; ls.getCell("G1").value = "UO";
  g.areas.forEach((a, i) => { const q = AREAS.find((x) => x[1] === a) || []; ls.getCell(2 + i, 4).value = a; ls.getCell(2 + i, 5).value = q[0] ? +q[0] : ""; ls.getCell(2 + i, 6).value = q[2] || ""; ls.getCell(2 + i, 7).value = q[3] || ""; });
  ls.getCell("I1").value = "Quem recebe"; ls.getCell("J1").value = "Instrumento"; BTIPO.forEach(([, l, ins], i) => { ls.getCell(2 + i, 9).value = l; ls.getCell(2 + i, 10).value = ins; });
  ls.getCell("L1").value = "Instrumentos"; g.mods.forEach((m, i) => { ls.getCell(2 + i, 12).value = m; });
  ls.getCell("N1").value = "Natureza"; ["Investimento", "Custeio"].forEach((m, i) => { ls.getCell(2 + i, 14).value = m; });
  const nA = g.areas.length + 1, AR = `Listas!$D$2:$G$${nA}`, nM = muns.length + 1;

  // ---- Indicação (o formulário)
  ws.columns = PI_COLS.map(([, w]) => ({ width: w }));
  const ult = col(PI_COLS.length - 1);
  ws.mergeCells(`A1:${ult}1`); ws.getCell("A1").value = `Indicação de recursos · ${tit}`; ws.getCell("A1").font = { size: 16, bold: true, color: { argb: ESC } };
  ws.mergeCells(`A2:${ult}2`); ws.getCell("A2").value = [`${PARL.u || ""} · ${PARL.p || ""}`, c.doc || (L && L.origem) || "", g.min ? "mínimo R$ " + moeda(g.min) + " por emenda" : "", g.max ? "até " + g.max + " emendas" : "", g.trava ? "área " + g.trava : "", c.prazo ? "prazo " + new Date(c.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""].filter(Boolean).join(" · "); ws.getCell("A2").font = { size: 10, color: { argb: MUT } };
  ws.mergeCells(`A3:${ult}3`); ws.getCell("A3").value = "Preencha só as colunas brancas; as com seta aceitam apenas valores da lista. Quem recebe define o instrumento (Município → TE, Entidade → Convênio, Estado → Execução Direta); as colunas cinzas se preenchem sozinhas e a Conferência avisa o que falta."; ws.getCell("A3").font = { size: 9, italic: true, color: { argb: MUT } };
  const cv = IC.valor, cm = IC.municipio, ca = IC.area;
  const kp = [["Disponível", g.disp || "", R$], ["Indicado", { formula: `SUM(${cv}${r0}:${cv}${r1})` }, R$], ["Saldo", g.disp ? { formula: `B5-C5` } : "", R$],
    ...(g.saude ? [[`Saúde (mín. ${g.saude * 100}%)`, { formula: `SUMIF(${ca}${r0}:${ca}${r1},"Saúde",${cv}${r0}:${cv}${r1})` }, R$]] : []),
    ...(c.fundam ? [[`FUNDAM (mín. ${c.fundam * 100}%)`, { formula: `SUMIF(${ca}${r0}:${ca}${r1},"FUNDAM",${cv}${r0}:${cv}${r1})` }, R$]] : []),
    ["Emendas", { formula: `COUNTIF(${cv}${r0}:${cv}${r1},">0")` }, g.max ? `0" de ${g.max}"` : "0"]];
  kp.forEach(([k, v, f], i) => { const a = ws.getCell(4, 2 + i), b = ws.getCell(5, 2 + i); a.value = k; a.font = { size: 9, bold: true, color: { argb: MUT } }; b.value = v; b.numFmt = f; b.font = { size: 13, bold: true, color: { argb: ESC } }; });
  if (g.disp) { ws.getCell("A6").value = "Uso"; ws.getCell("A6").font = { size: 9, color: { argb: MUT } }; ws.mergeCells("B6:D6"); ws.getCell("B6").value = { formula: `REPT("█",ROUND(MAX(0,MIN(1,C5/B5))*24,0))&REPT("░",24-ROUND(MAX(0,MIN(1,C5/B5))*24,0))&"  "&TEXT(C5/B5,"0%")` }; ws.getCell("B6").font = { name: "Consolas", size: 10, color: { argb: ESC } }; }
  const h = ws.getRow(r0 - 1); h.values = PI_COLS.map(([t, , , tp]) => tp === "l" ? t + " ▾" : t); h.height = 30;
  h.eachCell((cl, n) => { const a = PI_COLS[n - 1][3] === "a"; cl.fill = fill(a ? "FF4A5258" : ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
  const cq = IC.quem, co = IC.objeto, cr = IC.razao_social, cc = IC.cnpj, ct = IC.modalidade, ci = IC.Instrumento;
  for (let k = 0; k < N; k++) { const r = r0 + k, x = it[k], row = ws.getRow(r), t = x ? tipoDe(x) : "";
    row.getCell(1).value = k + 1;
    if (x) { const auto = (BTIPO.find((b) => b[0] === t) || [])[2];
      const v = { quem: (BTIPO.find((b) => b[0] === t) || [])[1] || "", municipio: x.municipio || "", area: x.area || g.trava || "", natureza: x.natureza || "", objeto: frase(x.objeto || ""), valor: +x.valor || null,
        razao_social: t === "ent" ? x.razao_social || x.beneficiario || "" : "", cnpj: t === "ent" ? x.cnpj || "" : "", modalidade: x.modalidade && x.modalidade !== auto ? x.modalidade : "", lideranca: x.lideranca || "", observacao: x.observacao || "" };
      PI_COLS.forEach(([, , f], n) => { if (f && v[f] != null) row.getCell(n + 1).value = v[f]; }); }
    else if (g.trava) row.getCell(4).value = g.trava;
    const at = (n, f) => { row.getCell(PI_COLS.findIndex((q) => q[0] === n) + 1).value = { formula: f }; };
    at("Conferência", `IF(AND(${cm}${r}="",${cv}${r}=""),"",IF(${cm}${r}="","falta município",IF(${co}${r}="","falta objeto",IF(${cq}${r}="","falta quem recebe",IF(${ca}${r}="","falta área",IF(${cv}${r}<${g.min || 0.01},"abaixo do mínimo",IF(AND(${cq}${r}="Entidade",OR(${cr}${r}="",LEN(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${cc}${r},".",""),"/",""),"-",""))<>14)),"falta entidade ou CNPJ","✓ ok")))))))`);
    at("Instrumento", `IF(${ct}${r}<>"",${ct}${r},IF(${cq}${r}="","",IFERROR(VLOOKUP(${cq}${r},Listas!$I$2:$J$4,2,FALSE),"")))`);
    at("Subação", `IF(${ca}${r}="","",IFERROR(VLOOKUP(${ca}${r},${AR},2,FALSE),""))`); at("Órgão", `IF(${ca}${r}="","",IFERROR(VLOOKUP(${ca}${r},${AR},3,FALSE),""))`); at("UO", `IF(${ca}${r}="","",IFERROR(VLOOKUP(${ca}${r},${AR},4,FALSE),""))`);
    const dv = (f, lista, msg) => { row.getCell(PI_COLS.findIndex((q) => q[2] === f) + 1).dataValidation = { type: "list", allowBlank: true, formulae: [lista], showErrorMessage: true, errorStyle: "stop", errorTitle: "Valor fora da lista", error: msg }; };
    dv("quem", "Listas!$I$2:$I$4", "Escolha Município, Entidade ou Estado."); dv("municipio", `Listas!$A$2:$A$${nM}`, "Escolha um município de SC da lista.");
    dv("area", `Listas!$D$2:$D$${nA}`, "Escolha uma área permitida nesta cota."); dv("natureza", "Listas!$N$2:$N$3", "Escolha Investimento ou Custeio."); dv("modalidade", `Listas!$L$2:$L$${g.mods.length + 1}`, "Escolha um instrumento permitido.");
    row.getCell(7).numFmt = R$;
    row.eachCell({ includeEmpty: true }, (cl, n) => { const a = PI_COLS[n - 1] && PI_COLS[n - 1][3] === "a"; cl.border = { bottom: fino }; cl.alignment = { vertical: "top", wrapText: [6, 8, 17].includes(n) }; cl.font = { size: 10, color: { argb: a ? MUT : ESC } }; cl.fill = fill(a ? SF : k % 2 ? TL : "FFFFFFFF"); }); }
  const tr = ws.getRow(r1 + 1); tr.getCell(6).value = "TOTAL"; tr.getCell(6).alignment = { horizontal: "right" }; tr.getCell(7).value = { formula: `SUM(${cv}${r0}:${cv}${r1})` }; tr.getCell(7).numFmt = R$; tr.font = { bold: true }; tr.eachCell((cl) => { cl.border = { top: { style: "medium", color: { argb: ESC } } }; });
  ws.addConditionalFormatting({ ref: `${cv}${r0}:${cv}${r1}`, rules: [{ type: "expression", formulae: [`AND(${cv}${r0}<>"",${cv}${r0}<${g.min || 0})`], style: { font: { color: { argb: "FFC0392B" }, bold: true }, fill: fill("FFFDE7E3") } }] });
  const cf = IC["Conferência"]; ws.addConditionalFormatting({ ref: `${cf}${r0}:${cf}${r1}`, rules: [{ type: "containsText", operator: "containsText", text: "✓", style: { font: { color: { argb: VD }, bold: true } } }, { type: "containsText", operator: "containsText", text: "falta", style: { font: { color: { argb: OR }, bold: true } } }, { type: "containsText", operator: "containsText", text: "mínimo", style: { font: { color: { argb: "FFC0392B" }, bold: true } } }] });

  // ---- Dados (oculta): histórico do mandato + as linhas desta indicação (por fórmula, atualizam ao preencher)
  dd.getRow(1).values = ["Ano", "Tipo de cota", "Região", "Modalidade", "Área", "Situação", "Município", "Valor", "Pago", "Objeto"];
  const H = E0.map((e) => [String(+e.ano || String(e.k || "").slice(0, 4)), PI_TIPO[e.tipo] || e.tipo || "—", e.assoc || (BASE.mun[e.mi] || {}).assoc || "—", piMod(e.mod), piArea(e.obj, e.tben), piSit(e), (BASE.mun[e.mi] || {}).n || e.mun || "—", +e.v || 0, +e.vp || 0, frase(e.obj || "").slice(0, 200)]);
  H.forEach((l, k) => { dd.getRow(2 + k).values = l; });
  const d0 = 2 + H.length, d1 = d0 + N - 1, tl = piTipoLista(T);
  for (let k = 0; k < N; k++) { const s = r0 + k, q = (f) => ({ formula: `IF(N('Indicação'!$${cv}$${s})=0,"",${f})` });
    dd.getRow(d0 + k).values = [q(`"${ano}"`), q(`"${tl}"`), q(`IFERROR(VLOOKUP('Indicação'!$${cm}$${s},Listas!$A$2:$B$${nM},2,FALSE),"—")`), q(`IF('Indicação'!$${ci}$${s}="","—",'Indicação'!$${ci}$${s})`), q(`IF('Indicação'!$${ca}$${s}="","—",'Indicação'!$${ca}$${s})`), q(`"Indicada"`), q(`IF('Indicação'!$${cm}$${s}="","—",'Indicação'!$${cm}$${s})`), q(`'Indicação'!$${cv}$${s}`), q("0"), q(`'Indicação'!$${co}$${s}`)]; }
  const DR = (L2) => `Dados!$${L2}$2:$${L2}$${d1}`;
  // critério dos filtros do Painel: "Todos" vira coringa
  const PF = {}; PI_FILT.forEach(([, L2], i) => { PF[L2] = `Painel!$${col(1 + i)}$14`; });
  const crit = (skip) => PI_FILT.filter(([, L2]) => L2 !== skip).map(([, L2]) => `${DR(L2)},IF(${PF[L2]}="Todos","*",${PF[L2]})`).join(",");
  const somaF = (extra, campo = "H") => `SUMIFS(${DR(campo)},${crit()}${extra ? "," + extra : ""})`, contaF = (extra) => `COUNTIFS(${DR("H")},">0",${crit()}${extra ? "," + extra : ""})`;
  // listas dos filtros (com "Todos")
  const op = { A: piUniq([...H.map((l) => l[0]), String(ano)]).sort(), B: piUniq([...H.map((l) => l[1]), tl]), C: piUniq(muns.map((m) => m.reg)).sort(), D: piUniq([...H.map((l) => l[3]), ...g.mods]), E: piUniq([...H.map((l) => l[4]), ...g.areas]).sort((a, b) => a.localeCompare(b, "pt-BR")), F: ["Pago", "Pago em parte", "Sem pagamento", "Indicada"] };
  PI_FILT.forEach(([t, L2], i) => { const cn = 16 + i; ls.getCell(1, cn).value = t; ["Todos", ...op[L2]].forEach((v, j) => { ls.getCell(2 + j, cn).value = v; }); });

  // ---- Por município (com coordenadas para o mapa no Google)
  pm.columns = [24, 14, 11, 11, 18, 10, 18, 16, 10, 12, 12, 13, 3].map((w) => ({ width: w }));
  pm.mergeCells("A1:L1"); pm.getCell("A1").value = "Recursos por município · histórico com os filtros do Painel + esta indicação"; pm.getCell("A1").font = { size: 14, bold: true };
  const ph = pm.getRow(3); ph.values = ["Município", "Região", "Longitude", "Latitude", "Nesta indicação", "Emendas aqui", "Histórico (filtro)", "Pago (filtro)", "Emendas (filtro)", "Votos 2026", "Votos 2022", "R$ por voto", ""];
  ph.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { vertical: "middle", wrapText: true }; }); ph.height = 30;
  muns.forEach((m, k) => { const r = 4 + k, row = pm.getRow(r), b = BASE.mun[m.i];
    row.values = [m.n, m.reg, b.lon, b.lat, { formula: `SUMIF(${ind(cm)},A${r},${ind(cv)})` }, { formula: `COUNTIF(${ind(cm)},A${r})` }, { formula: `${somaF(`${DR("G")},A${r}`)}` }, { formula: `${somaF(`${DR("G")},A${r}`, "I")}` }, { formula: contaF(`${DR("G")},A${r}`) }, (PARL.v || [])[m.i] || 0, (PARL.v22 || [])[m.i] || 0, { formula: `IF(OR(J${r}=0,G${r}=0),"",G${r}/J${r})` }, { formula: `G${r}+ROW()/1000000000` }];
    [5, 7, 8, 12].forEach((n) => { row.getCell(n).numFmt = R$; }); [10, 11].forEach((n) => { row.getCell(n).numFmt = "#,##0"; }); row.getCell(13).font = { color: { argb: "FFFFFFFF" }, size: 6 };
    row.eachCell({ includeEmpty: true }, (cl, n) => { if (n < 13) { cl.border = { bottom: fino }; cl.font = { size: 10, color: { argb: [2, 3, 4].includes(n) ? MUT : ESC }, bold: n === 7 }; } }); });
  const pr1 = 3 + muns.length; pm.getColumn(13).hidden = true;
  pm.addConditionalFormatting({ ref: `G4:G${pr1}`, rules: [{ type: "dataBar", cfvo: [{ type: "num", value: 0 }, { type: "max" }], color: { argb: ESC }, gradient: false }] });

  // ---- Painel
  pn.columns = [3, 26, 18, 18, 18, 18, 18, 3].map((w) => ({ width: w }));
  const bar = (p, n = 24) => `REPT("█",ROUND(MAX(0,MIN(1,${p}))*${n},0))&REPT("░",${n}-ROUND(MAX(0,MIN(1,${p}))*${n},0))`;
  const cel = (r, c2, v, f, font) => { const x = pn.getCell(r, c2); x.value = v; if (f) x.numFmt = f; if (font) x.font = font; return x; };
  const tituloP = (r, t, sub) => { pn.mergeCells(r, 2, r, 7); cel(r, 2, t, null, { size: 12, bold: true, color: { argb: ESC } }).border = { bottom: { style: "medium", color: { argb: ESC } } }; if (sub) { pn.mergeCells(r + 1, 2, r + 1, 7); cel(r + 1, 2, sub, null, { size: 9, italic: true, color: { argb: MUT } }); } };
  pn.mergeCells("B2:G2"); cel(2, 2, "SimulaLEGIS · Gabinete · Indicação de recursos", null, { size: 9, bold: true, color: { argb: MUT } });
  pn.mergeCells("B3:G3"); cel(3, 2, `${PARL.u || ""} · ${PARL.p || ""}`, null, { size: 22, bold: true, color: { argb: ESC } });
  // esta indicação
  tituloP(5, `Esta indicação · ${tit}`);
  [["Disponível", { formula: "'Indicação'!B5" }, R$], ["Indicado", { formula: "'Indicação'!C5" }, R$], ["Saldo", g.disp ? { formula: "'Indicação'!D5" } : "", R$], ["Emendas", { formula: `COUNTIF(${ind(cv)},">0")` }, g.max ? `0" de ${g.max}"` : "0"], ["Uso da cota", g.disp ? { formula: "IF('Indicação'!B5=0,0,'Indicação'!C5/'Indicação'!B5)" } : "", PCT]]
    .forEach(([k, v, f], i) => { cel(6, 2 + i, k, null, { size: 9, color: { argb: MUT } }); cel(7, 2 + i, v, f, { size: 13, bold: true, color: { argb: ESC } }); });
  let r = 8;
  [["Saúde", g.saude], ["FUNDAM", c.fundam]].filter(([, p]) => p).forEach(([a, p]) => { cel(r, 2, `${a} · mínimo ${p * 100}%`, null, { size: 10, color: { argb: ESC } }); cel(r, 3, { formula: `SUMIF(${ind(ca)},"${a}",${ind(cv)})` }, R$); cel(r, 4, { formula: `'Indicação'!B5*${p}` }, R$, { color: { argb: MUT } });
    pn.mergeCells(r, 5, r, 6); cel(r, 5, { formula: bar(`IF(D${r}=0,0,C${r}/D${r})`, 20) }, null, { name: "Consolas", color: { argb: ESC } }); cel(r, 7, { formula: `IF(D${r}=0,"",IF(C${r}>=D${r}-0.005,"✓ atingido","faltam "&TEXT(D${r}-C${r},"#,##0")))` }, null, { bold: true }); r++; });
  if (r > 8) pn.addConditionalFormatting({ ref: `G8:G${r - 1}`, rules: [{ type: "containsText", operator: "containsText", text: "✓", style: { font: { color: { argb: VD }, bold: true } } }, { type: "containsText", operator: "containsText", text: "faltam", style: { font: { color: { argb: "FFC0392B" }, bold: true } } }] });
  // histórico com filtros (linha 13 rótulos, 14 listas)
  tituloP(11, "Histórico do mandato · todas as emendas + esta indicação", `Escolha nos filtros (células amarelas) e tudo abaixo muda. Fonte: portal da SEF (coleta ${META.coletado_em ? new Date(META.coletado_em).toLocaleDateString("pt-BR") : "diária"}) · a área das emendas antigas é estimada pelo objeto.`);
  PI_FILT.forEach(([t], i) => { cel(13, 2 + i, t + " ▾", null, { size: 9, bold: true, color: { argb: MUT } }); const x = cel(14, 2 + i, "Todos", null, { size: 11, bold: true, color: { argb: ESC } }); x.fill = fill(AM); x.border = { top: fino, bottom: fino, left: fino, right: fino };
    x.dataValidation = { type: "list", allowBlank: false, formulae: [`Listas!$${col(15 + i)}$2:$${col(15 + i)}$${2 + op[PI_FILT[i][1]].length}`], showErrorMessage: true, errorTitle: "Filtro", error: "Escolha um valor da lista." }; });
  [["Indicado", { formula: somaF() }, R$], ["Pago", { formula: somaF("", "I") }, R$], ["% pago", { formula: "IF(B17=0,0,C17/B17)" }, PCT], ["Emendas", { formula: contaF() }, "0"], ["Municípios", { formula: `COUNTIF('Por município'!$G$4:$G$${pr1},">0")` }, "0"], ["R$ por voto", { formula: `IFERROR(B17/SUMIF('Por município'!$G$4:$G$${pr1},">0",'Por município'!$J$4:$J$${pr1}),"")` }, '"R$" #,##0']]
    .forEach(([k, v, f], i) => { cel(16, 2 + i, k, null, { size: 9, color: { argb: MUT } }); cel(17, 2 + i, v, f, { size: 14, bold: true, color: { argb: ESC } }); });
  r = 19;
  const bloco = (titulo, L2, vals) => { tituloP(r, titulo); r++; ["", "Indicado", "Pago", "% pago", "Emendas"].forEach((t, i) => cel(r, 2 + i, t, null, { size: 9, bold: true, color: { argb: MUT } })); r++;
    const i0 = r; vals.forEach((v) => { const cr2 = `${DR(L2)},"${v}"`; cel(r, 2, v, null, { size: 10 }); cel(r, 3, { formula: `SUMIFS(${DR("H")},${crit(L2)},${cr2})` }, R$, { bold: true }); cel(r, 4, { formula: `SUMIFS(${DR("I")},${crit(L2)},${cr2})` }, R$);
      cel(r, 5, { formula: `IF(C${r}=0,"",D${r}/C${r})` }, PCT); cel(r, 6, { formula: `COUNTIFS(${DR("H")},">0",${crit(L2)},${cr2})` }, "0"); cel(r, 7, { formula: `IF(MAX($C$${i0}:$C$${i0 + vals.length - 1})=0,"",${bar(`C${r}/MAX($C$${i0}:$C$${i0 + vals.length - 1})`, 18)})` }, null, { name: "Consolas", size: 9, color: { argb: "FF4A5258" } }); r++; });
    r++; };
  const tot = (L2) => (v) => H.filter((l) => l[{ A: 0, B: 1, C: 2, D: 3, E: 4 }[L2]] === v).reduce((s, l) => s + l[7], 0), ord = (L2, a) => a.sort((x, y) => tot(L2)(y) - tot(L2)(x));
  bloco("Por ano", "A", op.A); bloco("Por tipo de cota", "B", op.B); bloco("Por modalidade", "D", ord("D", [...op.D])); bloco("Por área", "E", ord("E", [...op.E])); bloco("Por região (associação de municípios)", "C", ord("C", [...op.C]));
  tituloP(r, "Os 20 municípios com mais recurso (com os filtros)"); r++;
  ["Município", "Região", "Indicado", "Pago", "Votos 2026", "R$ por voto"].forEach((t, i) => cel(r, 2 + i, t, null, { size: 9, bold: true, color: { argb: MUT } })); r++;
  const PMH = `'Por município'!$M$4:$M$${pr1}`, PMx = (L2) => `'Por município'!$${L2}$4:$${L2}$${pr1}`;
  for (let k = 1; k <= 20; k++, r++) { const m = `MATCH(LARGE(${PMH},${k}),${PMH},0)`, ok = `LARGE(${PMH},${k})>=1`;
    cel(r, 2, { formula: `IF(${ok},INDEX(${PMx("A")},${m}),"")` }, null, { bold: true }); cel(r, 3, { formula: `IF(${ok},INDEX(${PMx("B")},${m}),"")` }, null, { color: { argb: MUT } });
    cel(r, 4, { formula: `IF(${ok},INDEX(${PMx("G")},${m}),"")` }, R$); cel(r, 5, { formula: `IF(${ok},INDEX(${PMx("H")},${m}),"")` }, R$); cel(r, 6, { formula: `IF(${ok},INDEX(${PMx("J")},${m}),"")` }, "#,##0"); cel(r, 7, { formula: `IF(${ok},INDEX(${PMx("L")},${m}),"")` }, '"R$" #,##0'); }
  pn.getCell(r + 1, 2).value = "No Google Planilhas (botão “Criar no meu Google Drive”), esta aba ganha também o mapa dos recursos ao lado."; pn.getCell(r + 1, 2).font = { size: 9, italic: true, color: { argb: MUT } };

  // ---- Orçamento: o modelo oficial, montado por fórmula a partir das indicações
  oc.columns = [8, 50, 14, 16, 22, 22, 10, 14, 20, 34].map((w) => ({ width: w }));
  oc.mergeCells("A1:J1"); oc.getCell("A1").value = (L && L.origem) || tit; oc.getCell("A1").font = { size: 13, bold: true };
  [["Gabinete", "GAB DEP " + norm(PARL.u || "").toUpperCase()], ["Valor disponível", { formula: "'Indicação'!B5" }], ["Saldo", { formula: "'Indicação'!D5" }]].forEach(([k, v], i) => { oc.getCell(3 + i, 1).value = k; oc.getCell(3 + i, 1).font = { bold: true, size: 9, color: { argb: MUT } }; oc.mergeCells(3 + i, 1, 3 + i, 2); oc.getCell(3 + i, 3).value = v; oc.getCell(3 + i, 3).numFmt = R$; });
  const oh = oc.getRow(7); oh.values = ["Emenda", "Objeto", "Subação deduzida", "Valor", "Modalidade", "Município", "Órgão", "Unidade orçamentária", "CNPJ", "Razão Social"]; oh.eachCell((cl) => { cl.fill = fill(ESC); cl.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 }; cl.alignment = { wrapText: true, vertical: "middle" }; }); oh.height = 28;
  const I2 = (n) => IC[n] || IC[PI_COLS.find((q) => q[0] === n)[0]];
  for (let k = 0; k < N; k++) { const s2 = r0 + k, row = oc.getRow(8 + k), q = (f) => ({ formula: `IF('Indicação'!$${cv}$${s2}="","",${f})` }), R = (n) => `'Indicação'!${I2(n)}${s2}`;
    row.values = [q(`'Indicação'!A${s2}`), q(R("objeto")), q(R("Subação")), q(R("valor")), q(R("Instrumento")), q(R("municipio")), q(R("Órgão")), q(R("UO")), q(`IF(${R("Instrumento")}="Convênio",${R("cnpj")},"")`), q(`IF(${R("Instrumento")}="Convênio",${R("razao_social")},"")`)];
    row.getCell(4).numFmt = R$; row.eachCell({ includeEmpty: true }, (cl, n) => { cl.border = { bottom: fino }; cl.alignment = { vertical: "top", wrapText: n === 2 || n === 10 }; cl.font = { size: 10 }; }); }
  const ot = oc.getRow(8 + N); ot.getCell(1).value = "TOTAL"; ot.getCell(4).value = { formula: `SUM(D8:D${7 + N})` }; ot.getCell(4).numFmt = R$; ot.font = { bold: true };
  wb.views = [{ activeTab: 0, firstSheet: 0 }];
  return { wb, nome: `Indicacao-${(L ? L.apelido || "lista" : T.nome).replace(/[^\w-]+/g, "_")}-${norm(PARL.u || "").replace(/ /g, "_")}`, pr1 };
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
  const { wb, nome, pr1 } = await montarPlanilhaInd(T), buf = await wb.xlsx.writeBuffer(), bd = "slb" + Date.now();
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
  const P = sid("Por município"), src = (c0) => ({ sourceRange: { sources: [{ sheetId: P, startRowIndex: 3, endRowIndex: pr1, startColumnIndex: c0, endColumnIndex: c0 + 1 }] } });
  if (P != null && sid("Painel") != null) await gapi(token, base + ":batchUpdate", { requests: [{ addChart: { chart: { spec: { title: "Mapa dos recursos (com os filtros) · bolha = valor", bubbleChart: { legendPosition: "NO_LEGEND", domain: src(2), series: src(3), bubbleSizes: src(6), bubbleMinRadiusSize: 1, bubbleMaxRadiusSize: 28, bubbleOpacity: .55, bubbleBorderColor: { red: .11, green: .13, blue: .15 } } },
    position: { overlayPosition: { anchorCell: { sheetId: sid("Painel"), rowIndex: 10, columnIndex: 8 }, widthPixels: 640, heightPixels: 560 } } } } }] });
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
const PI_CAB = { quem: /^quem recebe/, municipio: /^munic/, area: /^(area|funcao)/, natureza: /^natureza/, objeto: /^objeto/, valor: /^valor/, razao_social: /^(entidade|razao social)/, beneficiario: /^beneficiario/, cnpj: /^cnpj/, modalidade: /^trocar instrumento/, lideranca: /^lider/, observacao: /^observa/ };
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
    const q0 = get("quem"), q = piCasa(q0, QUEM, 1); const t = q.v ? BTIPO.find((b) => b[1] === q.v)[0] : ""; if (q0 && !q.v) L.er.push(`quem recebe “${q0}” fora da lista`); else if (!q0) L.aj.push("sem “quem recebe” (escolha na tela)");
    if (t) x.benef_tipo = t;
    const a0 = get("area") || g.trava || "", a = piCasa(a0, AREAS.map((z) => z[1]), 2); if (a0 && !a.v) L.er.push(`área “${a0}” fora da lista`); else if (a.v) { if (!g.areas.includes(a.v)) L.er.push(`área ${a.v} não é permitida nesta cota`); else { x.area = a.v; if (a.sug || a.aj) L.aj.push(`área “${a0}” → ${a.v}`); } }
    const n0 = get("natureza"), nt = piCasa(n0, ["Investimento", "Custeio"], 2); if (n0 && !nt.v) L.aj.push(`natureza “${n0}” ignorada`); else if (nt.v) x.natureza = nt.v;
    if (obj) x.objeto = obj; else L.aj.push("sem objeto (entra como rascunho para completar)");
    if (!val) L.er.push("sem valor"); else if (g.min && val < g.min - .005) L.er.push(`${rc(val)} abaixo do mínimo de ${rc(g.min)}`); else x.valor = Math.round(val * 100) / 100;
    const mo0 = get("modalidade"), mo = piCasa(mo0, g.mods, 2); if (mo0 && !mo.v) L.aj.push(`instrumento “${mo0}” ignorado`);
    x.modalidade = mo.v || (t ? BTIPO.find((b) => b[0] === t)[2] : null); if (x.modalidade && !g.mods.includes(x.modalidade)) x.modalidade = null;
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
