// Gabinete › Administrativo › RH - Gabinete (04/11/2026, migração 97). A estrutura do gabinete salva na conta: cargos do
// parlamentar (Mesa, liderança, comissão…), o gabinete parlamentar (27 Secretários Parlamentares PL/GAB, chefe e operação de
// sistemas), outros cargos da ALESC somados e cargos livres. Cada linha mostra vagas ocupadas/previstas e valor aplicado/cota
// (mesmo desenho da Transparência). Usa os globais de gabinete.js (PARL, PODE, SESS, LOCAL, EST, proprio, esc, fr) e de
// tabelas-alesc.js (GAB_IDX, GAB_VAL, COTA_GAB). Sem sessão em localhost, grava no navegador (teste).
let RHC = [], RHE = null, RHAB = {}, RHF = null; // linhas gravadas · tabelas (mesa-estruturas + catálogo) · grupos abertos · formulário aberto
const rhGab = (n) => n >= 1 && n <= GAB_IDX.length ? GAB_IDX[n - 1] * GAB_VAL : 0;
const rhMil = (v) => v >= 1e6 ? (v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " mi" : Math.round(v / 1e3).toLocaleString("pt-BR") + " mil";
const rhLocal = () => LOCAL && !SESS, rhPode = () => proprio() && (PODE || rhLocal()) && EDITA();
// funções do parlamentar e o que cada uma soma (fase 3: somar sozinho; por ora a descrição pela norma)
const RH_PAR = [["mesa_pres", "Presidente da Mesa", "Gabinete da Presidência: até 20 Secretários Parlamentares PL/GAM e Chefe de Gabinete PL/DAS-8 · Gestão Executiva de 50% · adicional da Mesa na cota de custeio"],
  ["mesa", "Membro da Mesa (Vice-Presidente ou Secretário)", "gabinete da Mesa: até 9 Secretários Parlamentares PL/GAM · adicional da Mesa na cota de custeio"],
  ["lider", "Líder de partido ou bloco", "Liderança: Secretários Parlamentares PL/GAL e cota pelo tamanho da bancada · adicional de líder na cota de custeio"],
  ["lider_gov", "Líder do Governo ou da Oposição", "Liderança: cargos e cota pela tabela do Anexo IX-C · adicional de líder na cota de custeio"],
  ["com_pres", "Presidente de comissão permanente", "Secretário de Comissão e chefia da secretaria (PL/FG-3; FG-5 em CCJ, Finanças e Trabalho) · adicional de presidente na cota de custeio (não acumula com o de líder)"],
  ["com_vice", "Vice-presidente de comissão", "sem cargo próprio; substitui o presidente"],
  ["com_membro", "Membro de comissão permanente", "1 Assessor de Membro de Comissão Permanente PL/GAC-45 por deputado, em uma ou mais comissões"],
  ["escola", "Presidente da Escola do Legislativo", "Gestão Executiva de 45% (função administrativa reconhecida)"],
  ["outra", "Outra função (Procurador, Ouvidor, Corregedor, por Ato da Mesa)", "conforme o Ato da Mesa que reconhece a função"]];
const RH_SLOTS = [["PL/DAS-7", "Chefe de Gabinete", 1, false], ["PL/GAB", "Secretário Parlamentar", 27, true], ["FC-5", "Operação de sistemas · processos legislativos", 1, false], ["FC-4", "Operação de sistemas · processos administrativos", 1, false]];

async function rhCarregar() {
  if (!RHE) { const [m, c] = await Promise.all([fetch("../dados/painel/mesa-estruturas.json?v=15").then((r) => r.json()), fetch("../dados/painel/alesc-cargos.json?v=3").then((r) => r.json()).catch(() => ({}))]); RHE = { m, c }; }
  if (rhLocal()) { try { RHC = JSON.parse(localStorage.getItem("gab_cargos_" + PARL.n) || "[]"); } catch (e) { RHC = []; } return; }
  const { data, error } = await supabaseClient.from("gab_cargos").select("*").eq("parlamentar", PARL.n).order("ordem").order("criado_em"); if (error) throw error; RHC = data || [];
}
async function rhGravar(row) { row = { ...row, parlamentar: PARL.n, atualizado_em: new Date().toISOString() };
  if (rhLocal()) { if (!row.id) { row.id = "l" + Date.now() + Math.random().toString(36).slice(2); RHC.push(row); } else RHC = RHC.map((x) => x.id === row.id ? { ...x, ...row } : x); localStorage.setItem("gab_cargos_" + PARL.n, JSON.stringify(RHC)); return; }
  const { id, ...dados } = row; const r = id ? await supabaseClient.from("gab_cargos").update(dados).eq("id", id) : await supabaseClient.from("gab_cargos").insert(dados); if (r.error) throw r.error; }
async function rhApagar(id) { if (rhLocal()) { RHC = RHC.filter((x) => x.id !== id); localStorage.setItem("gab_cargos_" + PARL.n, JSON.stringify(RHC)); return; } const r = await supabaseClient.from("gab_cargos").delete().eq("id", id); if (r.error) throw r.error; }

// catálogo da ALESC para "Cargo da ALESC": [rótulo, código, valor fixo ou null (nível), estrutura, conta na cota]
function rhCatalogo() { const CM = RHE.m.comissao_cargos || {}, L = [["Liderança", [["Secretário Parlamentar · liderança", "PL/GAL", null, "lideranca", true]]], ["Mesa Diretora", [["Secretário Parlamentar · gabinete da Mesa", "PL/GAM", null, "mesa", true]]],
    ["Comissões", [["Secretário de Comissão", "PL/GAC-59", CM.assessor_comissao || 13460.89, "comissao", false], ["Chefia da secretaria da comissão · FG-3", "FG-3", CM.fg3 || 4424.32, "comissao", false], ["Chefia da secretaria da comissão · FG-5", "FG-5", CM.fg5 || 8982.02, "comissao", false], ["Assessor de Membro de Comissão Permanente", "PL/GAC-45", CM.assessor_membro || 8395.5, "comissao", false]]],
    ["Colegiado de Bancada", [["Secretário do Colegiado de Bancada", "PL/GAS", null, "colegiado", true]]]];
  Object.entries((RHE.c || {}).grupos || {}).forEach(([g, T]) => { const cs = []; T.forEach((t) => (t.cargos || []).forEach((x) => { const v = (x.venc || 0) + (x.grat || 0); if (!cs.some((y) => y[0] === x.cargo)) cs.push([x.cargo, x.nivel, v || null, "outro", false]); })); if (cs.length) L.push([g, cs]); });
  return L; }
// fase 3: cada função do parlamentar traz uma estrutura com vagas pela norma (Res. 002/2006: Anexos IX-B Mesa, IX-C liderança,
// IX-D e art. 18 comissões). Os cargos indicados nessas vagas ficam em gab_cargos (grupo alesc, estrutura = chave abaixo).
const RH_CHEFE_GP = 41845.49; // Chefe de Gabinete da Presidência, PL/DAS-8 (contracheque 09/2026, com o teto)
function rhDerivadas() { const M = RHE.m, LT = (M.liderancas || {}).tabela || {}, GM = M.gabinetes_mesa || {}, CM = M.comissao_cargos || {}, nb = rhBanc(), D = [], tem = (k) => D.some((x) => x.k === k);
  RHC.filter((x) => x.grupo === "parlamentar").forEach((r) => { const e = r.estrutura, q = r.qual || "";
    if ((e === "lider" || e === "lider_gov") && !tem("lideranca")) { const t = LT[Math.min(9, Math.max(1, nb))] || {}; D.push({ k: "lideranca", nome: "Liderança" + (q ? " do " + q : PARL.p ? " do " + PARL.p : ""), de: r.cargo, cota: t.cota || 0, base: `bancada de ${nb} deputado${nb === 1 ? "" : "s"} · Anexo IX-C`, slots: [{ cod: "PL/GAL", cargo: "Secretário Parlamentar · liderança", q: t.cargos || 0, niv: true, cota: true }] }); }
    if (e === "mesa_pres" && !tem("mesa")) { const g = GM["Presidente"] || {}; D.push({ k: "mesa", nome: "Gabinete da Presidência", de: r.cargo, cota: g.cota || 0, base: "Anexo IX-B · Chefe PL/DAS-8 fora da cota", slots: [{ cod: "PL/DAS-8", cargo: "Chefe de Gabinete da Presidência", q: 1, valor: RH_CHEFE_GP }, { cod: "PL/GAM", cargo: "Secretário Parlamentar · Mesa", q: g.cargos_max || 20, niv: true, cota: true }] }); }
    if (e === "mesa" && !tem("mesa")) { const g = GM["1º Secretário"] || {}; D.push({ k: "mesa", nome: "Gabinete da Mesa" + (q ? " · " + q : ""), de: r.cargo, cota: g.cota || 0, base: "Anexo IX-B", slots: [{ cod: "PL/GAM", cargo: "Secretário Parlamentar · Mesa", q: g.cargos_max || 9, niv: true, cota: true }] }); }
    if (e === "com_pres") { const k = "com:" + (q || "comissão"), fg5 = /constitui|finan|trabalho/i.test(q); if (!tem(k)) D.push({ k, nome: (q || "Comissão") + " · presidência", de: r.cargo, cota: 0, base: "art. 18 · fora da cota do gabinete", slots: [{ cod: "PL/GAC-59", cargo: "Secretário de Comissão", q: 1, valor: CM.assessor_comissao || 13460.89 }, { cod: fg5 ? "FG-5" : "FG-3", cargo: "Chefia da secretaria da comissão", q: 1, valor: fg5 ? (CM.fg5 || 8982.02) : (CM.fg3 || 4424.32) }] }); }
    if (e === "com_membro" && !tem("com_membro")) D.push({ k: "com_membro", nome: "Membro de comissão permanente", de: r.cargo, cota: 0, base: "1 por deputado, em uma ou mais comissões", slots: [{ cod: "PL/GAC-45", cargo: "Assessor de Membro de Comissão Permanente", q: 1, valor: CM.assessor_membro || 8395.5 }] });
  });
  return D; }
// o que a função soma, com os números (linha em Cargos do parlamentar)
function rhSoma(r, D) { const d = D.find((x) => x.de === r.cargo && (r.estrutura !== "com_pres" || x.k === "com:" + (r.qual || "comissão")));
  if (!d) return (RH_PAR.find((x) => x[0] === r.estrutura) || [])[2] || "";
  return d.nome + ": " + d.slots.map((s) => `${s.q} ${s.cargo}${s.cod ? " " + s.cod : ""}`).join(" + ") + (d.cota ? ` · cota de ${fr(d.cota)}` : "") + (d.base ? ` (${d.base})` : ""); }
// adicional na cota de custeio (Ato da Mesa 066/2024): o maior entre Mesa e líder/presidente de comissão, não acumula
function rhAdicional() { const C = RHE.m.cota_custeio || {}, e = RHC.filter((x) => x.grupo === "parlamentar").map((x) => x.estrutura);
  if (e.some((x) => x === "mesa_pres" || x === "mesa")) return [C.ad_mesa || 0, "da Mesa"]; if (e.some((x) => ["lider", "lider_gov", "com_pres"].includes(x))) return [C.ad_pres_lider || 0, "de líder ou presidente de comissão"]; return [0, ""]; }
const rhBanc = () => (EST && EST.c ? EST.c.filter((x) => /^eleito/i.test(x.s || "") && x.p === PARL.p).length : 0);

// ---------- desenho ----------
const rhBar = (a, b) => `<span class="rh-tr${a > b ? " x" : ""}"><i style="width:${b ? Math.min(100, a / b * 100).toFixed(1) : 0}%"></i></span>`;
const rhOc = (u, n) => n ? `<span class="rh-oc">${rhBar(u, n)}<b>${u}<em>/${n}</em></b></span>` : `<span class="rh-oc rh-sem">—</span>`;
const rhVl = (a, c, sem) => c ? `<span class="rh-oc">${rhBar(a, c)}<b>${rhMil(a)}<em>/${rhMil(c)}</em></b></span>` : `<span class="rh-oc"><span class="rh-tr vz"></span><b>${rhMil(a)}<em>/${sem || "fora da cota"}</em></b></span>`;
const ICO_P = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="5" r="2.8"/><path d="M2.8 14c.6-2.9 2.7-4.4 5.2-4.4s4.6 1.5 5.2 4.4"/></svg>`;
const rhPes = (r) => r && r.pessoa ? `<b class="rh-pn">${esc(r.pessoa)}</b>` : `<span class="rh-vg">vaga livre</span>`;
const rhVal = (r) => r.codigo === "PL/GAB" || ["PL/GAL", "PL/GAM", "PL/GAS"].includes(r.codigo) ? rhGab(r.nivel || 0) : +r.valor || 0;
const rhAcao = (r, rot = "editar") => rhPode() ? `<button class="rh-lk" data-rhe="${esc(r.id)}">${rot}</button>` : "";
function rhGrupo(k, nome, sub, oc, vl, corpo) { return `<details class="rh-g" data-rhg="${k}"${RHAB[k] ? " open" : ""}><summary><span class="rh-nm">${nome}<small>${sub}</small></span>${oc}${vl}<i class="rh-ch"></i></summary><div class="rh-cp">${corpo}</div></details>`; }
function rhTab(rows, cab = ["Cargo", "Pessoa", "Valor", ""]) { return rows.length ? `<table class="rh-tb"><thead><tr>${cab.map((h, i) => `<th${i === 2 ? ' class="r"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>` : `<p class="rh-nt">Nenhum cargo ainda.</p>`; }

function rhDesenhar() { const el = $("#rhGab"); if (!el) return;
  const M = RHE.m, P = M.parlamentar || {}, G = M.gabinete_parlamentar || {}, LT = (M.liderancas || {}).tabela || {}, nb = rhBanc();
  // 1) cargos do parlamentar: Deputado (fixo) + funções gravadas
  const par = RHC.filter((x) => x.grupo === "parlamentar"), sub = P.subsidio || 0, pres = par.some((x) => x.estrutura === "mesa_pres"), ge = sub * (pres ? P.gestao_pres : P.gestao_demais);
  const D = rhDerivadas(), [ad, adR] = rhAdicional();
  const tPar = [`<tr><td><b>Deputado Estadual</b><small>mandato</small></td><td class="mu">subsídio ${fr(sub)} · Gestão Executiva ${pres ? "50" : "45"}% ${fr(ge)}${ad ? ` · adicional ${adR} na cota de custeio ${fr(ad)} (o maior; não acumula)` : ""}</td><td></td></tr>`,
    ...par.map((r) => `<tr><td><b>${esc(r.cargo)}</b>${r.qual ? `<small>${esc(r.qual)}</small>` : ""}</td><td class="mu">${esc(rhSoma(r, D))}</td><td class="r">${rhAcao(r, "remover")}</td></tr>`)];
  const g1 = rhGrupo("par", "Cargos do parlamentar", `${par.length + 1} ${par.length ? "cargos" : "cargo"} · Mesa, liderança, comissões e funções`, `<span class="rh-oc rh-sem">—</span>`, `<span class="rh-oc"><span class="rh-tr vz"></span><b>${rhMil(sub + ge)}<em>/mês</em></b></span>`,
    `<table class="rh-tb"><thead><tr><th>Cargo do parlamentar</th><th>O que soma à estrutura</th><th></th></tr></thead><tbody>${tPar.join("")}</tbody></table>`);
  // 2) gabinete parlamentar: vagas fixas pela norma, preenchidas pelas linhas gravadas de cada código
  const gab = RHC.filter((x) => x.grupo === "gabinete"), linhas = []; let uSP = 0, vSP = 0, nOc = 0;
  RH_SLOTS.forEach(([cod, nome, q, cota]) => { const L = gab.filter((x) => x.codigo === cod).sort((a, b) => (b.nivel || 0) - (a.nivel || 0));
    for (let i = 0; i < Math.max(q, L.length); i++) { const r = L[i], v = r ? (cod === "PL/GAB" ? rhGab(r.nivel || 0) : cod === "PL/DAS-7" ? (G.chefe || 0) + (G.grat_chefe || 0) : cod === "FC-5" ? 8982.02 : 6198.2) : 0;
      if (r) { nOc++; if (cota) { uSP++; vSP += v; } }
      linhas.push(`<tr class="${r ? "" : "vz"}${i >= q ? " x" : ""}"><td>${nome}${cod === "PL/GAB" && r && r.nivel ? ` · PL/GAB nível ${r.nivel}` : ` · ${cod}`}${cota ? "" : "<small>fora da cota</small>"}${i >= q ? "<small>acima do limite</small>" : ""}</td><td>${rhPes(r)}</td><td class="r">${r ? fr(v) : "—"}</td><td class="r">${r ? rhAcao(r) : rhPode() ? `<button class="rh-lk" data-rhn="${cod}">indicar</button>` : ""}</td></tr>`); } });
  const g2 = rhGrupo("gab", "Gabinete parlamentar", `${ICO_P}${nOc} · Res. 002/2006, Anexo IX-F`, rhOc(uSP, G.cargos || 27), rhVl(vSP, COTA_GAB), rhTab(linhas));
  // 3) cargos da ALESC somados: uma subunidade por estrutura que as funções trazem (vagas pela norma) + o que veio do catálogo
  const al = RHC.filter((x) => x.grupo === "alesc"), usados = new Set(); let tV = 0, tU = 0, tUso = 0, tCota = 0, tFora = 0; const subs = [];
  D.forEach((d) => { const L = [], uS = { u: 0, n: 0, uso: 0, fora: 0 };
    d.slots.forEach((sl) => { const R = al.filter((x) => x.estrutura === d.k && x.codigo === sl.cod).sort((a, b) => (b.nivel || 0) - (a.nivel || 0)); R.forEach((x) => usados.add(x.id));
      for (let i = 0; i < Math.max(sl.q, R.length); i++) { const r = R[i], v = r ? (sl.niv ? rhGab(r.nivel || 0) : sl.valor) : 0; uS.n += i < sl.q ? 1 : 0;
        if (r) { uS.u++; if (sl.cota) uS.uso += v; else uS.fora += v; }
        L.push(`<tr class="${r ? "" : "vz"}${i >= sl.q ? " x" : ""}"><td>${esc(sl.cargo)} · ${esc(sl.cod)}${r && sl.niv && r.nivel ? " nível " + r.nivel : ""}${sl.cota ? "" : "<small>fora da cota</small>"}${i >= sl.q ? "<small>acima do limite</small>" : ""}</td><td>${rhPes(r)}</td><td class="r">${r ? fr(v) : sl.niv ? "—" : fr(sl.valor)}</td><td class="r">${r ? rhAcao(r) : rhPode() ? `<button class="rh-lk" data-rhd="${esc(d.k)}|${esc(sl.cod)}">indicar</button>` : ""}</td></tr>`); } });
    tV += uS.n; tU += uS.u; tUso += uS.uso; tCota += d.cota; tFora += uS.fora;
    subs.push(`<details class="rh-g rh-u" data-rhg="d:${esc(d.k)}"${RHAB["d:" + d.k] ? " open" : ""}><summary><span class="rh-nm">${esc(d.nome)}<small>vem de ${esc(d.de)} · ${esc(d.base)}</small></span>${rhOc(uS.u, uS.n)}${d.cota ? rhVl(uS.uso, d.cota) : rhVl(uS.fora, 0)}<i class="rh-ch"></i></summary><div class="rh-cp">${rhTab(L)}</div></details>`); });
  const cat = al.filter((x) => !usados.has(x.id)), vCat = cat.reduce((s, r) => s + rhVal(r), 0);
  if (cat.length) { tU += cat.filter((x) => x.pessoa).length; tV += cat.length; tFora += vCat;
    subs.push(`<details class="rh-g rh-u" data-rhg="d:cat"${RHAB["d:cat"] ? " open" : ""}><summary><span class="rh-nm">Do catálogo<small>cargos escolhidos à parte</small></span>${rhOc(cat.filter((x) => x.pessoa).length, cat.length)}${rhVl(vCat, 0)}<i class="rh-ch"></i></summary><div class="rh-cp">${rhTab(cat.map((r) => `<tr class="${r.pessoa ? "" : "vz"}"><td>${esc(r.cargo)}${r.codigo ? ` · ${esc(r.codigo)}${r.nivel ? " nível " + r.nivel : ""}` : ""}${r.qual ? `<small>${esc(r.qual)}</small>` : ""}</td><td>${rhPes(r)}</td><td class="r">${rhVal(r) ? fr(rhVal(r)) : "—"}</td><td class="r">${rhAcao(r)}</td></tr>`))}</div></details>`); }
  const g3 = rhGrupo("al", "Cargos da ALESC somados", `${ICO_P}${tU} · ${D.length ? D.length + (D.length > 1 ? " estruturas trazidas" : " estrutura trazida") + " pelas funções do parlamentar" : "inclua uma função do parlamentar ou um cargo do catálogo"}`, rhOc(tU, tV), tCota ? rhVl(tUso, tCota) : rhVl(tFora, 0),
    subs.join("") || `<p class="rh-nt">Nenhuma estrutura ainda. Ao incluir "Líder de partido", "Presidente de comissão" ou um cargo da Mesa em Cargos do parlamentar, as vagas que a função traz aparecem aqui.</p>`);
  // 4) outros cargos (livres)
  const ou = RHC.filter((x) => x.grupo === "outro"), vOu = ou.reduce((s, r) => s + (+r.valor || 0), 0);
  const g4 = rhGrupo("ou", "Outros cargos", `${ICO_P}${ou.filter((x) => x.pessoa).length} · cargos fora da ALESC, a critério do gabinete`, rhOc(ou.filter((x) => x.pessoa).length, ou.length), rhVl(vOu, 0),
    rhTab(ou.map((r) => `<tr class="${r.pessoa ? "" : "vz"}"><td>${esc(r.cargo)}${r.qual ? `<small>${esc(r.qual)}${r.na_cota ? " · conta na cota" : ""}</small>` : ""}</td><td>${rhPes(r)}</td><td class="r">${+r.valor ? fr(+r.valor) : "—"}</td><td class="r">${rhAcao(r)}</td></tr>`)));
  el.innerHTML = `<p class="rh-sub">Vagas ocupadas / previstas · valor aplicado / cota. ${rhPode() ? "Some à estrutura qualquer cargo da ALESC, cargos do próprio parlamentar ou um cargo livre." : "Só o próprio gabinete edita."}</p>
    <div class="rh-cab"><span></span><span>Vagas ocupadas/previstas</span><span>Valor aplicado/cota (R$)</span><span></span></div>${g1}${g2}${g3}${g4}
    ${rhPode() ? `<div class="rh-add">${RHF ? rhForm() : `<button class="rh-bt" data-rhadd>+ Adicionar cargo</button>`}</div>` : ""}`;
  rhLigar(el); }

// ---------- formulário (novo cargo ou edição) ----------
function rhForm() { const f = RHF, r = f.row || {}, tp = f.tp, opt = (v, t, s) => `<option value="${esc(v)}"${s ? " selected" : ""}>${esc(t)}</option>`;
  const tabs = f.row && f.row.id ? "" : `<div class="rh-tps">${[["alesc", "Cargo da ALESC", "do catálogo oficial"], ["parlamentar", "Cargo do parlamentar", "Mesa, liderança, comissão"], ["outro", "Outro cargo", "livre, a critério do gabinete"]].map(([k, t, d]) => `<button class="${tp === k ? "on" : ""}" data-rhtp="${k}">${t}<small>${d}</small></button>`).join("")}</div>`;
  let campos = "";
  if (tp === "deriv") { const sl = f.sl || {}; campos = `<label class="w">Cargo<input value="${esc(sl.cargo || r.cargo || "")} · ${esc(sl.cod || r.codigo || "")} · ${esc(f.nome || "")}" disabled></label>${sl.niv ? `<label>Nível (1 a ${GAB_IDX.length})<input data-rf="nivel" type="number" min="1" max="${GAB_IDX.length}" value="${esc(r.nivel || "")}"></label>` : ""}<label>Pessoa<input data-rf="pessoa" value="${esc(r.pessoa || "")}" placeholder="nome"></label>`; }
  else if (tp === "gabinete") campos = `<label class="w">Cargo<input value="${esc((RH_SLOTS.find((x) => x[0] === r.codigo) || [])[1] || "")} · ${esc(r.codigo)}" disabled></label>${r.codigo === "PL/GAB" ? `<label>Nível PL/GAB (1 a ${GAB_IDX.length})<input data-rf="nivel" type="number" min="1" max="${GAB_IDX.length}" value="${esc(r.nivel || "")}"></label>` : ""}<label>Pessoa<input data-rf="pessoa" value="${esc(r.pessoa || "")}" placeholder="nome"></label>`;
  else if (tp === "parlamentar") campos = `<label class="w">Cargo<select data-rf="estrutura">${RH_PAR.map(([k, t]) => opt(k, t, r.estrutura === k)).join("")}</select></label><label class="w">Qual (comissão, partido, bloco…)<input data-rf="qual" value="${esc(r.qual || "")}" placeholder="ex.: Comissão de Constituição e Justiça"></label><p class="rh-nt w">As vagas que a função traz (liderança, gabinete da Mesa, comissão) aparecem sozinhas em Cargos da ALESC somados, prontas para indicar.</p>`;
  else if (tp === "alesc") { const C = rhCatalogo(), sel = r.cargo ? `${r.codigo}|${r.cargo}` : "";
    campos = `<label class="w">Cargo<select data-rf="cat">${C.map(([g, L]) => `<optgroup label="${esc(g)}">${L.map(([t, cod, v, est, nc]) => opt(`${cod}|${t}`, `${t} · ${cod}${v ? " · " + fr(v) : ""}`, sel === `${cod}|${t}`)).join("")}</optgroup>`).join("")}</select></label><label>Nível (cargos com nível)<input data-rf="nivel" type="number" min="1" max="120" value="${esc(r.nivel || "")}"></label><label>Pessoa<input data-rf="pessoa" value="${esc(r.pessoa || "")}" placeholder="nome (opcional)"></label><label class="w">Qual (comissão, liderança…)<input data-rf="qual" value="${esc(r.qual || "")}" placeholder="opcional"></label>`; }
  else campos = `<label class="w">Nome do cargo<input data-rf="cargo" value="${esc(r.cargo || "")}" placeholder="ex.: Secretário Municipal de Brusque"></label><label>Órgão<input data-rf="qual" value="${esc(r.qual || "")}" placeholder="ex.: Prefeitura de Brusque"></label><label>Valor mensal (R$)<input data-rf="valor" inputmode="decimal" value="${r.valor != null ? esc(String(r.valor).replace(".", ",")) : ""}" placeholder="opcional"></label><label>Pessoa<input data-rf="pessoa" value="${esc(r.pessoa || "")}" placeholder="nome (opcional)"></label><label>Conta na cota?<select data-rf="na_cota">${opt("0", "Não (fora da ALESC)", !r.na_cota)}${opt("1", "Sim", r.na_cota)}</select></label>`;
  return `<div class="rh-fm">${tabs}<div class="rh-fc">${campos}</div><div class="rh-fb">${r.id ? `<button class="rh-lk" data-rhdel="${esc(r.id)}">remover</button>` : ""}<span></span><button class="rh-lk" data-rhx>cancelar</button><button class="rh-bt on" data-rhok>${r.id ? "Salvar" : "Adicionar"}</button></div><p class="rh-er" hidden></p></div>`; }
function rhLerForm(el) { const f = RHF, r = { ...(f.row || {}) }, v = (k) => { const x = el.querySelector(`[data-rf="${k}"]`); return x ? x.value.trim() : undefined; };
  if (f.tp === "deriv") { const sl = f.sl || {}; r.grupo = "alesc"; r.estrutura = f.k; r.codigo = sl.cod; r.cargo = sl.cargo; r.na_cota = !!sl.cota; r.qual = f.nome || null; r.pessoa = v("pessoa") || null;
    if (sl.niv) { r.nivel = +v("nivel") || null; if (!(r.nivel >= 1 && r.nivel <= GAB_IDX.length)) throw new Error("Informe o nível (1 a " + GAB_IDX.length + ")."); r.valor = Math.round(rhGab(r.nivel) * 100) / 100; } else r.valor = sl.valor; }
  else if (f.tp === "gabinete") { r.grupo = "gabinete"; if (v("nivel") !== undefined) r.nivel = +v("nivel") || null; r.pessoa = v("pessoa") || null; r.na_cota = r.codigo === "PL/GAB"; r.cargo = (RH_SLOTS.find((x) => x[0] === r.codigo) || [])[1] || r.codigo; r.estrutura = "gabinete"; if (r.codigo === "PL/GAB" && !(r.nivel >= 1 && r.nivel <= GAB_IDX.length)) throw new Error("Informe o nível PL/GAB (1 a " + GAB_IDX.length + ")."); r.valor = r.codigo === "PL/GAB" ? Math.round(rhGab(r.nivel) * 100) / 100 : null; }
  else if (f.tp === "parlamentar") { r.grupo = "parlamentar"; r.estrutura = v("estrutura"); r.cargo = (RH_PAR.find((x) => x[0] === r.estrutura) || [])[1]; r.qual = v("qual") || null; }
  else if (f.tp === "alesc") { const [cod, t] = (v("cat") || "|").split("|"), it = rhCatalogo().flatMap((x) => x[1]).find((x) => x[1] === cod && x[0] === t) || []; r.grupo = "alesc"; r.cargo = t; r.codigo = cod; r.estrutura = it[3] || "outro"; r.na_cota = !!it[4]; r.nivel = +v("nivel") || null; r.pessoa = v("pessoa") || null; r.qual = v("qual") || null;
    if (it[2] == null && !(r.nivel >= 1 && r.nivel <= 120)) throw new Error("Este cargo tem nível: informe de 1 a 120."); r.valor = it[2] != null ? it[2] : Math.round(rhGab(r.nivel) * 100) / 100; }
  else { r.grupo = "outro"; r.cargo = v("cargo"); if (!r.cargo) throw new Error("Escreva o nome do cargo."); r.qual = v("qual") || null; r.pessoa = v("pessoa") || null; r.na_cota = v("na_cota") === "1"; const n = +String(v("valor") || "").replace(/\./g, "").replace(",", "."); r.valor = v("valor") ? (isFinite(n) ? n : null) : null; r.estrutura = "outro"; }
  return r; }
function rhLigar(el) {
  el.querySelectorAll("details.rh-g").forEach((d) => d.addEventListener("toggle", () => { RHAB[d.dataset.rhg] = d.open; }));
  el.onclick = async (e) => { const t = e.target.closest("button"); if (!t) return; e.preventDefault();
    if (t.dataset.rhadd != null) { RHF = { tp: "alesc" }; rhDesenhar(); return; }
    if (t.dataset.rhtp) { RHF = { tp: t.dataset.rhtp }; rhDesenhar(); return; }
    if (t.dataset.rhx != null) { RHF = null; rhDesenhar(); return; }
    if (t.dataset.rhn) { RHF = { tp: "gabinete", row: { codigo: t.dataset.rhn } }; rhDesenhar(); el.querySelector(".rh-fm").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (t.dataset.rhd) { const [k, cod] = t.dataset.rhd.split("|"), d = rhDerivadas().find((x) => x.k === k), sl = d && d.slots.find((x) => x.cod === cod); if (!sl) return; RHF = { tp: "deriv", k, sl, nome: d.nome, row: {} }; rhDesenhar(); el.querySelector(".rh-fm").scrollIntoView({ block: "center" }); return; }
    if (t.dataset.rhe) { const r = RHC.find((x) => String(x.id) === t.dataset.rhe); if (!r) return;
      if (r.grupo === "parlamentar") { const antes = rhDerivadas().map((x) => x.k); RHC = RHC.filter((x) => x.id !== r.id); const depois = new Set(rhDerivadas().map((x) => x.k)); const some = antes.filter((k) => !depois.has(k)), ind = RHC.filter((x) => x.grupo === "alesc" && some.includes(x.estrutura));
        RHC.push(r); if (!confirm(`Remover "${r.cargo}" dos cargos do parlamentar?` + (ind.length ? `\n\nA estrutura que ela traz tem ${ind.length} indicação(ões); elas também serão removidas.` : ""))) return;
        try { await rhApagar(r.id); for (const x of ind) await rhApagar(x.id); } catch (er) { alert("Não removeu: " + (er.message || er)); } await rhCarregar(); rhDesenhar(); return; }
      if (r.grupo === "alesc") { const d = rhDerivadas().find((x) => x.k === r.estrutura), sl = d && d.slots.find((x) => x.cod === r.codigo); if (sl) { RHF = { tp: "deriv", k: d.k, sl, nome: d.nome, row: r }; rhDesenhar(); el.querySelector(".rh-fm").scrollIntoView({ block: "center" }); return; } }
      RHF = { tp: r.grupo, row: r }; rhDesenhar(); el.querySelector(".rh-fm").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (t.dataset.rhdel) { if (!confirm("Remover este cargo da estrutura?")) return; try { await rhApagar(t.dataset.rhdel); RHF = null; await rhCarregar(); rhDesenhar(); } catch (er) { alert("Não removeu: " + (er.message || er)); } return; }
    if (t.dataset.rhok != null) { const fm = el.querySelector(".rh-fm"), er = fm.querySelector(".rh-er"); try { const r = rhLerForm(fm); t.disabled = true; await rhGravar(r); const g = r.grupo === "parlamentar" ? "par" : r.grupo === "gabinete" ? "gab" : r.grupo === "alesc" ? "al" : "ou"; RHAB[g] = true; if (RHF.tp === "deriv") RHAB["d:" + RHF.k] = true; if (r.grupo === "parlamentar") RHAB.al = true; RHF = null; await rhCarregar(); rhDesenhar(); } catch (x) { t.disabled = false; er.hidden = false; er.textContent = x.message || String(x); } } };
}
// entrada: gabinete.js chama ao montar o título Administrativo
async function rhGabinete() { const el = $("#rhGab"); if (!el) return; try { await rhCarregar(); rhDesenhar(); } catch (e) { el.innerHTML = `<p class="rh-nt">Não foi possível carregar a estrutura: ${esc(e.message || e)}</p>`; } }
