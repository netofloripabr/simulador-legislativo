// Gabinete · Lista = formulário de indicações em Google Planilhas (26/10/2026).
// O usuário autoriza o Google Drive (escopo drive.file: o sistema só enxerga as planilhas que ele mesmo criar) e o
// sistema gera, no Drive dele, a planilha padrão: aba "Indicações" (colunas dos itens do sistema, listas de escolha,
// contas e alertas das regras), aba "Painel" (votos por município 2022 x 2026 e R$ por voto) e aba "Regras".
// Nada passa pelo nosso servidor: o navegador fala direto com a API do Google com o token da sessão.
// Usa os globais de gabinete.js / gabinete-adicionar.js (BASE, PARL, E0, agregado, AREAS, MODS, STATUS, PRIOR, fm, esc, modal).

const ESCOPO_DRIVE = "https://www.googleapis.com/auth/drive.file";

async function tokenGoogle() {
  const { data } = await supabaseClient.auth.getSession(); const s = data && data.session;
  return s && s.provider_token ? s.provider_token : null;
}
// pede o acesso ao Drive: refaz o login Google com o escopo extra e volta para esta página
async function pedirDrive() {
  try { sessionStorage.setItem("gab_gerar_planilha", "1"); } catch (e) {}
  await supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0], scopes: ESCOPO_DRIVE, queryParams: { access_type: "online", prompt: "consent" } } });
}
async function gapi(token, url, corpo) {
  const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || r.status); return j;
}

const COLS = [["Município", 150], ["Região", 90, 1], ["Objeto", 300], ["Justificativa", 220], ["Função / área", 120], ["Instrumento de repasse", 150], ["Natureza", 100], ["Valor (R$)", 110], ["Beneficiário", 160], ["CNPJ (convênio)", 130], ["Razão social", 160], ["Líder", 140], ["Contato", 120], ["Prioridade", 85], ["Status", 100], ["Observação", 220],
  ["Votos 2022", 80, 1], ["Votos 2026", 80, 1], ["Já repassado (R$)", 110, 1], ["R$ por voto", 85, 1], ["Alerta", 220, 1]];
const L0 = 6, LN = 205; // linhas de preenchimento (cabeçalho na 5)

function dadosPainel() {
  const A = agregado(E0);
  return BASE.mun.map((m, i) => [m.n, m.assoc || "", (PARL.v22 || [])[i] || 0, (PARL.v || [])[i] || 0, (A[i] || {}).v || 0])
    .sort((a, b) => b[3] - a[3] || a[0].localeCompare(b[0], "pt-BR"))
    .map((r, k) => [...r, `=IF(D${k + 2}=0;"";E${k + 2}/D${k + 2})`, `=IF(C${k + 2}=0;"";D${k + 2}/C${k + 2}-1)`]);
}

async function gerarPlanilha(L) {
  const token = await tokenGoogle(); if (!token) return pedirDrive();
  const r = (L && L.regras) || {}, tit = `Indicações · ${(L && (L.apelido || L.origem)) || "Gabinete"} · ${PARL.u}`;
  const col = (k) => String.fromCharCode(65 + k), cv = col(7), ul = LN;
  const cab = [[tit], [`${(L && L.origem) || ""}${r.prazo ? " · prazo " + new Date(r.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}`],
    ["Disponível", "Indicado", "Saldo", "Saúde", "Mínimo Saúde", "Itens"],
    [r.disp || "", `=SUM(${cv}${L0}:${cv}${ul})`, `=IF(A4="";"";A4-B4)`, `=SUMIF(E${L0}:E${ul};"Saúde";${cv}${L0}:${cv}${ul})`, r.saude || (r.disp ? r.disp / 2 : ""), `=COUNTA(A${L0}:A${ul})`],
    COLS.map((c) => c[0])];
  const linhas = [];
  for (let n = L0; n <= ul; n++) linhas.push([
    "", `=IF(A${n}="";"";IFERROR(VLOOKUP(A${n};Painel!A:B;2;0);""))`, "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    `=IF(A${n}="";"";IFERROR(VLOOKUP(A${n};Painel!A:C;3;0);""))`, `=IF(A${n}="";"";IFERROR(VLOOKUP(A${n};Painel!A:D;4;0);""))`, `=IF(A${n}="";"";IFERROR(VLOOKUP(A${n};Painel!A:E;5;0);""))`,
    `=IF(OR(A${n}="";R${n}="";R${n}=0);"";(S${n}+N(${cv}${n}))/R${n})`,
    `=IF(A${n}="";"";TEXTJOIN(" · ";TRUE;IF(AND(${cv}${n}<>"";${cv}${n}<Regras!B3);"abaixo do mínimo";"");IF(AND(Regras!B5<>"";COUNTA(A$${L0}:A$${ul})>Regras!B5);"passou do nº de itens";"");IF(AND($A$4<>"";$C$4<0);"saldo estourado";"");IF(B${n}="";"município não encontrado";"")))`]);
  const P = dadosPainel();
  const regras = [["Regra", "Valor"], ["Valor disponível (R$)", r.disp || ""], ["Mínimo por item (R$)", r.min || 100000], ["Mínimo para Saúde (R$)", r.saude || (r.disp ? r.disp / 2 : "")], ["Máximo de itens", r.max || ""], ["Prazo", r.prazo ? new Date(r.prazo).toLocaleString("pt-BR") : ""], ["Áreas permitidas", (r.areas || AREAS.map((a) => a[1])).join(", ")], ["Fonte", "LDO 2027 (Lei 20.043/2026), arts. 31-38"]];
  const ss = await gapi(token, "https://sheets.googleapis.com/v4/spreadsheets", { properties: { title: tit, locale: "pt_BR" },
    sheets: [{ properties: { sheetId: 1, title: "Indicações", gridProperties: { rowCount: ul, columnCount: COLS.length, frozenRowCount: 5, frozenColumnCount: 1 } } },
      { properties: { sheetId: 2, title: "Painel", gridProperties: { rowCount: P.length + 1, columnCount: 7, frozenRowCount: 1 } } },
      { properties: { sheetId: 3, title: "Regras", gridProperties: { rowCount: 20, columnCount: 2 } } }] });
  const id = ss.spreadsheetId, base = `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
  await gapi(token, base + "/values:batchUpdate", { valueInputOption: "USER_ENTERED", data: [
    { range: "Indicações!A1", values: cab }, { range: `Indicações!A${L0}`, values: linhas },
    { range: "Painel!A1", values: [["Município", "Região", "Votos 2022", "Votos 2026", "Já repassado (R$)", "R$ por voto 2026", "Variação de votos"], ...P] },
    { range: "Regras!A1", values: regras }] });
  const lista = (vals) => ({ condition: { type: "ONE_OF_LIST", values: vals.map((v) => ({ userEnteredValue: v })) }, showCustomUi: true, strict: false });
  const rng = (c, s = 1) => ({ sheetId: s, startRowIndex: L0 - 1, endRowIndex: ul, startColumnIndex: c, endColumnIndex: c + 1 });
  const fmt = (range, f, campos) => ({ repeatCell: { range, cell: { userEnteredFormat: f }, fields: "userEnteredFormat(" + campos + ")" } });
  const moeda = { numberFormat: { type: "CURRENCY", pattern: "R$ #,##0" } };
  const auto = { backgroundColor: { red: .95, green: .96, blue: .97 } };
  const req = [
    { setDataValidation: { range: rng(0), rule: { condition: { type: "ONE_OF_RANGE", values: [{ userEnteredValue: `=Painel!$A$2:$A$${P.length + 1}` }] }, showCustomUi: true, strict: false } } },
    { setDataValidation: { range: rng(4), rule: lista(r.areas && r.areas.length ? r.areas : AREAS.map((a) => a[1])) } },
    { setDataValidation: { range: rng(5), rule: lista(MODS) } }, { setDataValidation: { range: rng(6), rule: lista(["Investimento", "Custeio"]) } },
    { setDataValidation: { range: rng(13), rule: lista(PRIOR) } }, { setDataValidation: { range: rng(14), rule: lista(STATUS) } },
    fmt({ sheetId: 1, startRowIndex: 0, endRowIndex: 1 }, { textFormat: { bold: true, fontSize: 16 } }, "textFormat"),
    fmt({ sheetId: 1, startRowIndex: 2, endRowIndex: 3 }, { textFormat: { bold: true, foregroundColor: { red: .4, green: .44, blue: .47 } } }, "textFormat"),
    fmt({ sheetId: 1, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 5 }, { ...moeda, textFormat: { bold: true, fontSize: 12 } }, "numberFormat,textFormat"),
    fmt({ sheetId: 1, startRowIndex: 4, endRowIndex: 5 }, { backgroundColor: { red: .07, green: .09, blue: .1 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, wrapStrategy: "WRAP", verticalAlignment: "MIDDLE" }, "backgroundColor,textFormat,wrapStrategy,verticalAlignment"),
    fmt(rng(7), moeda, "numberFormat"), fmt(rng(18), { ...moeda, ...auto }, "numberFormat,backgroundColor"), fmt(rng(19), { ...moeda, ...auto }, "numberFormat,backgroundColor"),
    ...[1, 16, 17, 20].map((c) => fmt(rng(c), auto, "backgroundColor")),
    fmt({ sheetId: 1, startRowIndex: L0 - 1, endRowIndex: ul, startColumnIndex: 2, endColumnIndex: 4 }, { wrapStrategy: "WRAP", verticalAlignment: "TOP" }, "wrapStrategy,verticalAlignment"),
    { addConditionalFormatRule: { index: 0, rule: { ranges: [rng(20)], booleanRule: { condition: { type: "NOT_BLANK" }, format: { textFormat: { foregroundColor: { red: .8, green: .17, blue: .1 }, bold: true } } } } } },
    { addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId: 1, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 2, endColumnIndex: 3 }], booleanRule: { condition: { type: "NUMBER_LESS", values: [{ userEnteredValue: "0" }] }, format: { textFormat: { foregroundColor: { red: .8, green: .17, blue: .1 } } } } } } },
    { addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId: 1, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 3, endColumnIndex: 4 }], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=AND($E$4<>\"\";$D$4<$E$4)" }] }, format: { textFormat: { foregroundColor: { red: .85, green: .5, blue: .1 } } } } } } },
    ...COLS.map((c, k) => ({ updateDimensionProperties: { range: { sheetId: 1, dimension: "COLUMNS", startIndex: k, endIndex: k + 1 }, properties: { pixelSize: c[1] }, fields: "pixelSize" } })),
    { updateDimensionProperties: { range: { sheetId: 1, dimension: "ROWS", startIndex: 4, endIndex: 5 }, properties: { pixelSize: 42 }, fields: "pixelSize" } },
    fmt({ sheetId: 2, startRowIndex: 0, endRowIndex: 1 }, { backgroundColor: { red: .07, green: .09, blue: .1 }, textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } } }, "backgroundColor,textFormat"),
    fmt({ sheetId: 2, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 6 }, moeda, "numberFormat"),
    fmt({ sheetId: 2, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 }, { numberFormat: { type: "PERCENT", pattern: "0%" } }, "numberFormat"),
    { addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId: 2, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 }], gradientRule: { minpoint: { color: { red: 1, green: 1, blue: 1 }, type: "MIN" }, maxpoint: { color: { red: .2, green: .37, blue: .85 }, type: "MAX" } } } } },
    { autoResizeDimensions: { dimensions: { sheetId: 2, dimension: "COLUMNS", startIndex: 0, endIndex: 7 } } },
    fmt({ sheetId: 3, startRowIndex: 0, endRowIndex: 1 }, { textFormat: { bold: true } }, "textFormat"),
    { autoResizeDimensions: { dimensions: { sheetId: 3, dimension: "COLUMNS", startIndex: 0, endIndex: 2 } } }];
  await gapi(token, base + ":batchUpdate", { requests: req });
  return "https://docs.google.com/spreadsheets/d/" + id + "/edit";
}

// janela: explica, gera e guarda o link na lista
function abrirGerarPlanilha(L) {
  const url = L && L.regras && L.regras.planilha;
  modal(`<div class="mh"><div><div class="olho">${esc((L && (L.apelido || L.origem)) || "Lista")}</div><h3>Formulário de indicações</h3></div><button class="x" data-fecha>×</button></div>
    <p class="lead">O sistema cria no seu Google Drive uma planilha padrão para o Deputado preencher: aba <b>Indicações</b> com as colunas dos itens do sistema, listas de escolha e alertas das regras; aba <b>Painel</b> com os votos por município (2022 × 2026) e o R$ por voto; aba <b>Regras</b>. Pode ser impressa.</p>
    <p class="lead" style="font-size:12.5px">Na primeira vez o Google pede autorização para o sistema criar arquivos no seu Drive. O sistema só enxerga as planilhas que ele mesmo criar.</p>
    ${url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">Abrir a planilha já gerada</a></p>` : ""}
    <div class="mrod"><span class="av" data-msg></span><button class="btn sec" data-fecha>Fechar</button><button class="btn" data-gera>${url ? "Gerar nova planilha" : "Gerar planilha no meu Drive"}</button></div>`, (m) => {
    m.querySelector("[data-gera]").onclick = async () => { const msg = m.querySelector("[data-msg]"); msg.textContent = "Gerando…";
      try { const u = await gerarPlanilha(L); if (!u) return; if (L && L.id) { L.regras = { ...(L.regras || {}), planilha: u }; await gravar("gab_listas", { id: L.id, regras: L.regras }); }
        msg.innerHTML = `Pronto. <a href="${esc(u)}" target="_blank" rel="noopener">Abrir a planilha</a>`; window.open(u, "_blank"); }
      catch (er) { if (/401|invalid|credential/i.test(er.message)) { msg.textContent = "Autorização do Google expirou. Abrindo o login…"; return pedirDrive(); } msg.textContent = "Não foi possível gerar: " + er.message; } };
  });
}
// volta do login com o Drive autorizado: retoma a geração
window.addEventListener("load", () => { let p = null; try { p = sessionStorage.getItem("gab_gerar_planilha"); sessionStorage.removeItem("gab_gerar_planilha"); } catch (e) {} if (p) setTimeout(() => { const L = AD.listas.find((x) => x.id === S.lista) || AD.listas.slice(-1)[0]; abrirGerarPlanilha(L); }, 2500); });
