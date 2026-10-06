// Revisão das impressões e segmentos da Apuração 2026 (05/10/2026): monta os
// documentos de impressão do app (Partidos, Plenário, Lista por recorte,
// Lista "todos os municípios", Ficha com regiões) e confere cada número da
// coluna 2026 com o TSE (tse-2026.json + arquivo estadual do TSE pros
// grupos partido/federação). Uso igual ao conferir_app.js.
const { chromium } = require("playwright");
const fs = require("fs");
const URL0 = process.argv[2] || "http://localhost:8765/";
const TSE = JSON.parse(fs.readFileSync(__dirname + "/tse-2026.json"));
const MUN = JSON.parse(fs.readFileSync(__dirname + "/../../dados/resultados/sc-2022/municipios.json")).municipios;
const cod = {}; Object.entries(MUN).forEach(([k, m]) => { cod[k] = String(Number(m.tse)).padStart(5, "0"); });
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9/]+/g, " ").trim();
const num = (s) => { s = String(s || "").trim(); if (!s || s === "—") return null; return Number(s.replace(/[^\d]/g, "")) * (/^[−-]/.test(s) ? -1 : 1); };
const CD = { estadual: ["7", "6259"], federal: ["6", "6259"], senador: ["5", "6259"], governador: ["3", "6259"], presidente: ["1", "6257"] };
const rel = {};
const ok = (c, i, n = 1) => { const r = (rel[c] = rel[c] || { ok: {}, erros: [] }); r.ok[i] = (r.ok[i] || 0) + n; };
const erro = (c, i, d) => { (rel[c] = rel[c] || { ok: {}, erros: [] }).erros.push({ item: i, ...d }); };
const cmp = (c, i, app, tse, d) => app === tse ? ok(c, i) : erro(c, i, { ...d, app, tse });

(async () => {
  // grupo (partido ou federação) de cada candidato, direto do TSE
  const grupo = {}, legMun = {};
  for (const [cargo, [cc, cd]] of Object.entries(CD)) {
    const d = await (await fetch(`https://resultados.tse.jus.br/oficial/ele2026/${cd}/dados/sc/sc-c000${cc}-e${cd.padStart(6, "0")}-u.json`, { headers: { "User-Agent": "Mozilla/5.0" } })).json();
    const cg = d.carg[0], fed = {}; (cg.fed || []).forEach((f) => { fed[String(f.n)] = f.sg; });
    grupo[cargo] = {}; cg.agr.forEach((a) => a.par.forEach((p) => { const g = (p.nfed && fed[String(p.nfed)]) || p.sg; p.cand.forEach((c) => { grupo[cargo][String(c.n)] = g; }); }));
  }
  const gNorm = (s) => norm(s).replace(/ /g, "").split("/").sort().join("/");
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => erro("_app", "erro de JS", { msg: e.message }));
  await p.goto(URL0 + "?painel=55777", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => typeof pcState !== "undefined" && pcState._resCtx, null, { timeout: 60000 });
  const R = await p.evaluate(() => MUNICIPIOS_SC_REGIOES.map((m) => [m.chave, m.meso, m.assoc]));
  const meso = [...new Set(R.map((x) => x[1]))], assoc = [...new Set(R.map((x) => x[2]))];
  const munsDe = (r) => R.filter((x) => x[1] === r || x[2] === r).map((x) => x[0]);
  // documento → linhas [pos, nome, c3, c4, c5, c6] (+ seção)
  const doc = (cargo, cfg) => p.evaluate(async ([cargo, cfg]) => {
    const st = pcState.res; if (st.cargo !== cargo) { st.cargo = cargo; st.aba = "candidatos"; await renderResultados(); }
    const ctx = pcState._resCtx; _resImpAbrir(ctx); const I = ctx.st.imp;
    Object.assign(I, { cargo, qtd: 0, ordem: "d26", recorte: "estado", regiao: "", mun: "" }, cfg); if (cfg.det) I.det = new Set(cfg.det); if (cfg.sqNum) I.sq = ctx.cands.find((c) => String(c.numero) === cfg.sqNum).sq;
    const h = await _resImpDocumento(ctx); _resImpFechar();
    const d = document.createElement("div"); d.innerHTML = h; let sec = "";
    const out = []; d.querySelectorAll(".di-rsec, .di-rlin:not(.di-rcab)").forEach((e) => { if (e.classList.contains("di-rsec")) { sec = e.textContent.trim(); return; } const s = [...e.children].map((x) => x.cloneNode(true)); s.forEach((x) => x.querySelectorAll(".di-rpart").forEach((y) => y.remove())); out.push([sec, ...s.map((x) => x.textContent.trim())]); });
    return { linhas: out, cands: ctx.cands.map((c) => [String(c.numero), c.nomeUrna, c.partido]) };
  }, [cargo, cfg]);
  const T = (cargo, n, muns) => muns ? muns.reduce((s, k) => s + ((((TSE[cargo].mun[cod[k]] || {}).cands || {})[n] || {}).votos || 0), 0) : (TSE[cargo].estado.cands[n] || {}).votos || 0;
  const Tleg = (cargo, g, muns) => muns ? muns.reduce((s, k) => s + Object.entries((TSE[cargo].mun[cod[k]] || {}).legenda || {}).filter(([x]) => gNorm(x) === gNorm(g)).reduce((a, [, v]) => a + v, 0), 0) : Object.entries(TSE[cargo].estado.legenda).filter(([x]) => gNorm(x) === gNorm(g)).reduce((a, [, v]) => a + v, 0);
  const candPorNome = (cands, txt) => { const t = norm(txt); const c = cands.filter(([, nm, pt]) => t === norm(nm + " " + pt) || t.startsWith(norm(nm) + " ")).sort((a, b) => b[1].length - a[1].length)[0]; return c && c[0]; };
  const recortes = [["estado", null, null], ...meso.map((r) => ["regiao", r, munsDe(r)]), ...assoc.map((r) => ["regiao", r, munsDe(r)]), ["mun", "BLUMENAU", ["BLUMENAU"]], ["mun", "FLORIANOPOLIS", ["FLORIANOPOLIS"]], ["mun", "CHAPECO", ["CHAPECO"]]];

  for (const cargo of Object.keys(CD)) {
    const G = grupo[cargo];
    // 1) LISTA por recorte (todas as linhas)
    for (const [rec, r, muns] of recortes) {
      const { linhas, cands } = await doc(cargo, { tipo: "lista", ano: "2026", recorte: rec, regiao: rec === "regiao" ? r : "", mun: rec === "mun" ? r : "" });
      linhas.forEach(([, , nome, , v]) => { const n = candPorNome(cands, nome); if (!n) return erro(cargo, "Lista — candidato não reconhecido", { recorte: r, nome }); cmp(cargo, "Lista por recorte (estado/região/município)", num(v), T(cargo, n, muns), { recorte: r || "estado", nome }); });
      // 2) PARTIDOS no mesmo recorte: nominais + legenda do grupo
      const P = await doc(cargo, { tipo: "partidos", ano: "2026", recorte: rec, regiao: rec === "regiao" ? r : "", mun: rec === "mun" ? r : "" });
      P.linhas.forEach(([, , g, , v]) => {
        const nomes = Object.entries(G).filter(([, x]) => gNorm(x) === gNorm(g)).map(([n]) => n);
        if (!nomes.length) return erro(cargo, "Partidos — grupo não reconhecido", { recorte: r, grupo: g });
        const valido = (n) => !TSE[cargo].estado.cands[n] || String(TSE[cargo].estado.cands[n].dvt || "Válido").startsWith("Válido");
        const nominal = nomes.filter(valido).reduce((s, n) => s + T(cargo, n, muns), 0), leg = Tleg(cargo, g, muns);
        const a = num(v); a === nominal ? ok(cargo, "Partidos por recorte (votos nominais; legenda fora, por decisão antiga)") : a === nominal + leg ? ok(cargo, "Partidos por recorte (nominal + legenda)") : erro(cargo, "Partidos por recorte", { recorte: r || "estado", grupo: g, app: a, tseNominal: nominal, tseLegenda: leg });
      });
    }
    // 3) FICHA com regiões (3 mais votados): mesorregiões e associações
    const top = Object.entries(TSE[cargo].estado.cands).sort((a, b) => b[1].votos - a[1].votos).slice(0, 3);
    for (const [n, t] of top) {
      const { linhas } = await doc(cargo, { tipo: "ficha", ano: "2026", sqNum: n, det: ["mun", "regioes"] });
      linhas.forEach(([sec, , nome, , v]) => {
        if (/Munic/.test(sec)) { const k = Object.keys(MUN).find((k) => norm(MUN[k].nome) === norm(nome)); return k ? cmp(cargo, "Ficha — municípios", num(v), T(cargo, n, [k]), { cand: t.nome, nome }) : erro(cargo, "Ficha — município não reconhecido", { nome }); }
        const r = [...meso, ...assoc].find((x) => norm(x.replace(" Catarinense", "")) === norm(nome) || norm(x) === norm(nome));
        r ? cmp(cargo, "Ficha — mesorregiões e associações", num(v), T(cargo, n, munsDe(r)), { cand: t.nome, regiao: r }) : erro(cargo, "Ficha — região não reconhecida", { sec, nome });
      });
    }
    // 4) LISTA "todos os municípios" (todas as linhas de todas as cidades)
    const { linhas, cands } = await doc(cargo, { tipo: "lista", ano: "2026", recorte: "todos" });
    linhas.forEach(([sec, , nome, , v]) => { const k = Object.keys(MUN).find((k) => norm(MUN[k].nome) === norm(sec)); const n = candPorNome(cands, nome); if (!k || !n) return erro(cargo, "Todos os municípios — linha não reconhecida", { sec, nome }); cmp(cargo, "Lista todos os municípios", num(v), T(cargo, n, [k]), { municipio: sec, nome }); });
    // 5) PLENÁRIO 2026 (proporcionais): eleitos e forma de eleição
    if (["estadual", "federal"].includes(cargo)) {
      const Pl = await doc(cargo, { tipo: "plenario", ano: "2026" });
      const appE = Pl.linhas.map(([, , nome, , v, sit]) => [candPorNome(cands, nome), num(v), norm(sit)]);
      const tseE = Object.entries(TSE[cargo].estado.cands).filter(([, t]) => norm(t.st).startsWith("ELEITO"));
      cmp(cargo, "Plenário — nº de eleitos", appE.length, tseE.length, {});
      tseE.forEach(([n, t]) => { const a = appE.find((x) => x[0] === n); if (!a) return erro(cargo, "Plenário — eleito ausente", { nome: t.nome }); cmp(cargo, "Plenário — votos do eleito", a[1], t.votos, { nome: t.nome }); cmp(cargo, "Plenário — por QP / por média", a[2].includes("MEDIA"), norm(t.st).includes("MEDIA"), { nome: t.nome, app: a[2], tse: t.st }); });
    }
    const r = rel[cargo]; console.log(`\n== ${cargo.toUpperCase()} ==`); Object.entries(r.ok).forEach(([k, v]) => console.log(`  OK   ${k}: ${v}`));
    const g = {}; r.erros.forEach((e) => { g[e.item] = (g[e.item] || 0) + 1; }); Object.entries(g).forEach(([k, v]) => console.log(`  ERRO ${k}: ${v}  (ex.: ${JSON.stringify(r.erros.find((e) => e.item === k)).slice(0, 260)})`));
  }
  if (rel._app) console.log("\nERROS DE JS:", JSON.stringify(rel._app.erros.slice(0, 5)));
  fs.writeFileSync(__dirname + "/relatorio-impressoes.json", JSON.stringify(rel, null, 1));
  await b.close();
})();
