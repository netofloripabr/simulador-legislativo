// Verificação completa da Apuração 2026 (05/10/2026): abre o app num navegador
// (Playwright), lê o que cada tela usa e compara com o TSE (tse-2026.json,
// gerado por baixar_tse.py). Uso:
//   python3 -m http.server 8765   (na raiz do repo, em outro terminal)
//   node conferir_app.js [url]     → relatorio.json + resumo no terminal
const { chromium } = require("playwright");
const fs = require("fs");
const URL0 = process.argv[2] || "http://localhost:8765/";
const TSE = JSON.parse(fs.readFileSync(__dirname + "/tse-2026.json"));
const MUN = JSON.parse(fs.readFileSync(__dirname + "/../../dados/resultados/sc-2022/municipios.json")).municipios;
const tsePorChave = {}; Object.entries(MUN).forEach(([k, m]) => { tsePorChave[k] = String(Number(m.tse)).padStart(5, "0"); });
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
const rel = {};
const _resMajorJs = (c) => ["senador", "governador", "presidente"].includes(c);
const erro = (cargo, item, det) => { (rel[cargo] = rel[cargo] || { ok: {}, erros: [] }).erros.push({ item, ...det }); };
const ok = (cargo, item, n = 1) => { const r = (rel[cargo] = rel[cargo] || { ok: {}, erros: [] }); r.ok[item] = (r.ok[item] || 0) + n; };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 900 } });
  p.on("pageerror", (e) => erro("_app", "erro de JS", { msg: e.message }));
  await p.goto(URL0 + "?painel=55777", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => typeof pcState !== "undefined" && pcState._resCtx, null, { timeout: 60000 });
  const regioes = await p.evaluate(() => ({ meso: [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.meso))], assoc: [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.assoc))], mapa: MUNICIPIOS_SC_REGIOES.map((m) => [m.chave, m.meso, m.assoc]) }));
  for (const cargo of Object.keys(TSE)) {
    const T = TSE[cargo];
    // 1) aba Geral/Candidato: dados que o app montou pra este cargo
    const A = await p.evaluate(async (cargo) => {
      const st = pcState.res; st.cargo = cargo; st.aba = "candidatos"; st.regiao = ""; st.assoc = "";
      await renderResultados();
      const ctx = pcState._resCtx, meta = pcState._resMeta || {};
      return { meta: { validos: meta.validos, eleitorado: meta.eleitorado, comparecimento: meta.comparecimento, abstencao: meta.abstencao, brancos: meta.brancos, nulos: meta.nulos, vagas: meta.vagas, final: meta.final, legenda: meta.legenda },
        totalVagas: ctx.totalVagas, part: (pcState._resPart26 || {})[cargo] || null,
        cands: ctx.cands.map((c) => ({ sq: c.sq, numero: String(c.numero), nome: c.nomeUrna, partido: c.partido, total: c.total, mun: c.municipios, sit: c.situacao || "", etq: _resEtiqueta(c, cargo).replace(/<[^>]+>/g, "").trim() })) };
    }, cargo);
    // totais estaduais e participação
    const P = T.estado.part, M = A.meta;
    [["eleitorado", 0], ["comparecimento", 1], ["abstencao", 2], ["brancos", 3], ["nulos", 4], ["validos", 5]].forEach(([k, i]) => M[k] === P[i] ? ok(cargo, "Dados da eleição (estado)") : erro(cargo, "Dados da eleição (estado)", { campo: k, app: M[k], tse: P[i] }));
    (A.meta.vagas === T.estado.vagas && A.totalVagas === T.estado.vagas) ? ok(cargo, "vagas") : erro(cargo, "vagas", { app: [A.meta.vagas, A.totalVagas], tse: T.estado.vagas });
    // candidatos: total, situação, etiqueta
    const porNum = new Map(A.cands.map((c) => [c.numero, c]));
    Object.entries(T.estado.cands).forEach(([n, t]) => {
      const c = porNum.get(n);
      if (!c) { if (t.votos) erro(cargo, "candidato ausente no app", { numero: n, nome: t.nome, votos: t.votos }); return; }
      c.total === t.votos ? ok(cargo, "total do candidato") : erro(cargo, "total do candidato", { nome: t.nome, app: c.total, tse: t.votos });
      norm(c.sit) === norm(t.st) ? ok(cargo, "situação (eleito/suplente)") : erro(cargo, "situação (eleito/suplente)", { nome: t.nome, app: c.sit, tse: t.st });
      const eleitoTse = norm(t.st).startsWith("ELEITO"), etqE = /^E/.test(c.etq);
      eleitoTse === etqE ? ok(cargo, "etiqueta na lista") : erro(cargo, "etiqueta na lista", { nome: t.nome, etiqueta: c.etq, tse: t.st });
      // por município (aba Candidato / ficha / impressão usam c.municipios)
      let soma = 0;
      Object.entries(MUN).forEach(([k]) => { const tv = ((T.mun[tsePorChave[k]] || {}).cands || {})[n]; const tvv = tv ? tv.votos : 0, av = (c.mun || {})[k] || 0; soma += av; av === tvv ? ok(cargo, "votos por município") : erro(cargo, "votos por município", { nome: t.nome, municipio: k, app: av, tse: tvv }); });
      soma === c.total ? ok(cargo, "soma dos municípios = total") : erro(cargo, "soma dos municípios = total", { nome: t.nome, soma, total: c.total });
    });
    A.cands.forEach((c) => { if (c.total && !T.estado.cands[c.numero]) erro(cargo, "candidato com voto no app e fora do TSE", { nome: c.nome, numero: c.numero }); });
    // participação por município (impressão / Dados da eleição filtrado)
    Object.entries(MUN).forEach(([k]) => { const tp = (T.mun[tsePorChave[k]] || {}).part, ap = A.part && A.part.mun[k]; JSON.stringify(tp) === JSON.stringify(ap) ? ok(cargo, "participação por município") : erro(cargo, "participação por município", { municipio: k, app: ap, tse: tp }); });
    // legenda por partido
    if (A.meta.legenda) Object.entries(T.estado.legenda).forEach(([sg, v]) => { if (!v) return; const av = Object.entries(A.meta.legenda).filter(([k]) => norm(k).replace(/\s/g, "") === norm(sg).replace(/\s/g, "")).reduce((s, [, x]) => s + x, 0); av === v ? ok(cargo, "voto de legenda") : erro(cargo, "voto de legenda", { partido: sg, app: av, tse: v }); });
    // tela Ferramentas → Partidos: QE, válidos, nominais (sem anulados), legenda, total, eleitos
    const PT = await p.evaluate(() => { const R = _resPartidos(pcState._resCtx); return { qe: R.qe, validos: R.validos, lista: R.lista.map((x) => ({ nome: x.nome, nominal: x.nominal, legenda: x.legenda, total: x.total, eleitos: x.eleitos })) }; });
    PT.validos === P[5] ? ok(cargo, "Partidos (tela) — válidos") : erro(cargo, "Partidos (tela) — válidos", { app: PT.validos, tse: P[5] });
    if (PT.qe !== null) { const qe = Math.floor(P[5] / T.estado.vagas) + ((P[5] / T.estado.vagas) % 1 > 0.5 ? 1 : 0); PT.qe === qe ? ok(cargo, "Partidos (tela) — QE") : erro(cargo, "Partidos (tela) — QE", { app: PT.qe, tse: qe }); }
    const chv = (s) => norm(s).replace(/\s/g, "").split("/").sort().join("/");
    const grupoTse = {}; Object.entries(T.estado.cands).forEach(([n, t]) => { const c = porNum.get(n); const k = chv(c ? c.partido : t.partido); const x = grupoTse[k] = grupoTse[k] || { nominal: 0, eleitos: 0 }; if (String(t.dvt || "Válido").startsWith("Válido")) x.nominal += t.votos; if (norm(t.st).startsWith("ELEITO")) x.eleitos++; });
    Object.entries(T.estado.legenda).forEach(([g, v]) => { const x = grupoTse[chv(g)]; if (x) x.legenda = (x.legenda || 0) + v; });
    PT.lista.forEach((x) => { const t = grupoTse[chv(x.nome)]; if (!t) return erro(cargo, "Partidos (tela) — partido fora do TSE", { nome: x.nome }); const tl = t.legenda || 0;
      [["nominais", x.nominal, t.nominal], ["legenda", x.legenda, _resMajorJs(cargo) ? x.legenda : tl], ["total", x.total, t.nominal + (_resMajorJs(cargo) ? x.legenda : tl)], ["eleitos", x.eleitos, t.eleitos]].forEach(([k, a, b]) => a === b ? ok(cargo, "Partidos (tela) — " + k) : erro(cargo, "Partidos (tela) — " + k, { partido: x.nome, app: a, tse: b })); });
    // 2) filtros de região (aba Mapa): top 3 candidatos × mesorregiões e associações
    const top = Object.entries(T.estado.cands).sort((a, b) => b[1].votos - a[1].votos).slice(0, 3);
    for (const [n] of top) {
      const c = porNum.get(n); if (!c) continue;
      for (const [tipo, lista] of [["meso", regioes.meso], ["assoc", regioes.assoc]]) for (const r of lista) {
        const app = await p.evaluate(async ([sq, tipo, r]) => { const st = pcState.res; st.aba = "mapa"; st.cenario = sq; st.cmpSq = null; st.modoAno = null; st.regiao = tipo === "meso" ? r : ""; st.assoc = tipo === "assoc" ? r : ""; await renderResultados(); await new Promise((x) => setTimeout(x, 150)); const I = st._imp; return I ? { tot: I.tot, lista: I.lista.map((d) => [d.m.chave, d.v]) } : null; }, [c.sq, tipo, r]);
        const chaves = regioes.mapa.filter((m) => m[tipo === "meso" ? 1 : 2] === r).map((m) => m[0]);
        const tseTot = chaves.reduce((s, k) => s + ((((T.mun[tsePorChave[k]] || {}).cands || {})[n] || {}).votos || 0), 0);
        if (!app) { erro(cargo, "filtro de região (Mapa)", { nome: c.nome, regiao: r, msg: "mapa não montou" }); continue; }
        app.tot === tseTot ? ok(cargo, "filtro de região (Mapa) — total") : erro(cargo, "filtro de região (Mapa) — total", { nome: c.nome, regiao: r, app: app.tot, tse: tseTot });
        const fora = app.lista.filter(([k, v]) => v && !chaves.includes(k));
        !fora.length ? ok(cargo, "filtro de região (Mapa) — só municípios da região") : erro(cargo, "filtro de região (Mapa) — só municípios da região", { regiao: r, fora: fora.slice(0, 5) });
      }
    }
    // 3) sobras (proporcionais): quociente e eleitos por média
    if (["estadual", "federal"].includes(cargo)) {
      const S = await p.evaluate((cargo) => { const ctx = pcState._resCtx, st = pcState.res; const leg = pcState._resMeta && pcState._resMeta.legenda; const d = _resSobrasDados(ctx.cands, ctx.totalVagas, leg, RES_FEDERACOES[st.anoApurado]); const h = document.createElement("div"); h.innerHTML = _resSobrasHtml(d, false, ctx.totalVagas); return { qe: d.disputa && d.disputa.qe, sobras: d.disputa && d.disputa.totalSobrasCargo, medias: [...h.querySelectorAll(".pn-srod:not(.fora) .rc")].map((e) => e.textContent) }; }, cargo);
      const vv = T.estado.part[5], vg = T.estado.vagas, qe = Math.floor(vv / vg) + ((vv / vg) % 1 > 0.5 ? 1 : 0);
      S.qe === qe ? ok(cargo, "quociente eleitoral (sobras)") : erro(cargo, "quociente eleitoral (sobras)", { app: S.qe, tse: qe });
      const mediaTse = Object.values(T.estado.cands).filter((t) => norm(t.st).includes("MEDIA")).map((t) => norm(t.nome)).sort();
      const mediaApp = S.medias.map(norm).sort();
      JSON.stringify(mediaTse) === JSON.stringify(mediaApp) ? ok(cargo, "eleitos por média (painel S)") : erro(cargo, "eleitos por média (painel S)", { app: mediaApp, tse: mediaTse });
    }
    const r = rel[cargo]; console.log(`\n== ${cargo.toUpperCase()} ==`); Object.entries(r.ok).forEach(([k, v]) => console.log(`  OK   ${k}: ${v}`));
    const g = {}; r.erros.forEach((e) => { g[e.item] = (g[e.item] || 0) + 1; }); Object.entries(g).forEach(([k, v]) => console.log(`  ERRO ${k}: ${v}  (ex.: ${JSON.stringify(r.erros.find((e) => e.item === k)).slice(0, 220)})`));
  }
  fs.writeFileSync(__dirname + "/relatorio.json", JSON.stringify(rel, null, 1));
  await b.close();
})();
