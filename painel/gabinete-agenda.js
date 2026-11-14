// Gabinete › Administrativo › Agenda (14/11/2026). Calendário do mandato: prazos das emendas impositivas (COTAS_LEGAIS,
// de gabinete-cotas.js), prazos da Casa (dados/painel/prazos-casa.json, do Diário), feriados nacionais e de SC e datas
// comemorativas (calculados aqui), reuniões das comissões de que o parlamentar é membro, sessões plenárias e eventos da
// Casa (dados/painel/agenda-alesc.json, rotina diária ferramentas/agenda/agenda.mjs), aniversário dos 5 municípios com
// mais votos (dados/painel/sc-aniversarios.json) e eventos que a equipe cadastra (gab_agenda, migração 101).
// Usa os globais de gabinete.js (PARL, BASE, SESS, LOCAL, PAPEL, EDITA, esc). Sem build: script global.
let AG = { alesc: null, aniv: null, casa: null, eq: [], mes: null, dia: null, form: null, carregado: false, erro: "" };
const AG_TIPOS = [["prazo", "Prazos"], ["comissao", "Comissões"], ["plenario", "Plenário"], ["base", "Bases"], ["equipe", "Equipe"], ["data", "Feriados e datas"], ["casa", "Eventos da Casa"]];
const AG_PADRAO = ["prazo", "comissao", "plenario", "base", "equipe", "data"];
const agFiltro = () => { try { const v = JSON.parse(localStorage.getItem("gab_ag_filtro") || "null"); return new Set(Array.isArray(v) ? v : AG_PADRAO); } catch (e) { return new Set(AG_PADRAO); } };
const agGravaFiltro = (S) => { try { localStorage.setItem("gab_ag_filtro", JSON.stringify([...S])); } catch (e) {} };
const agNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const agIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const agDt = (s) => new Date(s + "T12:00:00");
const agMais = (s, n) => { const d = agDt(s); d.setDate(d.getDate() + n); return agIso(d); };
const AG_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// ---------- feriados e datas (calculados) ----------
function agPascoa(a) { const b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451), mes = Math.floor((i + m - 7 * n + 114) / 31), dia = ((i + m - 7 * n + 114) % 31) + 1; return new Date(a, mes - 1, dia, 12); }
function agDatas(ano) { const L = [], p = agPascoa(ano), rel = (n) => { const d = new Date(p); d.setDate(d.getDate() + n); return agIso(d); }, f = (m, d) => `${ano}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  [[1, 1, "Confraternização Universal"], [4, 21, "Tiradentes"], [5, 1, "Dia do Trabalho"], [9, 7, "Independência do Brasil"], [10, 12, "Nossa Senhora Aparecida"], [11, 2, "Finados"], [11, 15, "Proclamação da República"], [11, 20, "Dia Nacional de Zumbi e da Consciência Negra"], [12, 25, "Natal"]].forEach(([m, d, t]) => L.push({ d: f(m, d), t, sub: "feriado nacional", tipo: "data", fer: true }));
  L.push({ d: rel(-2), t: "Sexta-feira Santa", sub: "feriado nacional", tipo: "data", fer: true });
  L.push({ d: rel(-48), t: "Carnaval", sub: "ponto facultativo", tipo: "data" }, { d: rel(-47), t: "Carnaval", sub: "ponto facultativo", tipo: "data" }, { d: rel(60), t: "Corpus Christi", sub: "ponto facultativo", tipo: "data" });
  // Data Magna de SC (11 de agosto): transferida para o domingo subsequente pela Lei estadual 18.531/2022
  const dm = new Date(ano, 7, 11, 12); while (dm.getDay() !== 0) dm.setDate(dm.getDate() + 1);
  L.push({ d: agIso(dm), t: "Dia de Santa Catarina (Data Magna)", sub: "feriado estadual · 11/08 passa ao domingo seguinte (Lei 18.531/2022)", tipo: "data", fer: true });
  L.push({ d: f(3, 23), t: "Aniversário de Florianópolis", sub: "feriado municipal na Capital", tipo: "data" });
  [[3, 8, "Dia Internacional da Mulher"], [4, 19, "Dia dos Povos Indígenas"], [4, 22, "Descobrimento do Brasil"], [5, 13, "Abolição da Escravatura (Lei Áurea, 1888)"], [6, 5, "Dia Mundial do Meio Ambiente"], [7, 25, "Dia do Colono e do Motorista"], [10, 15, "Dia do Professor"], [10, 28, "Dia do Servidor Público"]].forEach(([m, d, t]) => L.push({ d: f(m, d), t, sub: "data comemorativa", tipo: "data" }));
  return L; }

// ---------- bases: os 5 municípios com mais votos ----------
function agBases() { if (!PARL || !BASE || !PARL.v) return []; return BASE.mun.map((m, i) => ({ n: m.n, v: PARL.v[i] || 0 })).filter((x) => x.v).sort((a, b) => b.v - a.v).slice(0, 5); }

// ---------- comissões do parlamentar ----------
function agComissoes() { const C = (AG.alesc || {}).comissoes || {}, eu = agNorm(PARL.u), R = {};
  Object.entries(C).forEach(([k, c]) => { const papel = agNorm(c.presidente) === eu ? "presidente" : agNorm(c.vice) === eu ? "vice-presidente" : (c.membros || []).some((x) => agNorm(x) === eu) ? "membro" : null; if (papel) R[agNorm(k)] = { nome: k, papel }; }); return R; }

// ---------- todos os itens de um período ----------
function agItens(de, ate) { const L = [], anos = new Set([agDt(de).getFullYear(), agDt(ate).getFullYear()]);
  anos.forEach((a) => L.push(...agDatas(a)));
  // emendas impositivas (mesma constante das Cotas e da contagem do topo)
  if (typeof COTAS_LEGAIS !== "undefined") Object.entries(COTAS_LEGAIS).forEach(([ano, o]) => Object.entries(o).forEach(([t, c]) => { const nm = ((typeof cotaNome !== "undefined" && cotaNome[t]) || t) + " " + ano;
    if (c.abre) L.push({ d: c.abre.slice(0, 10), h: c.abre.slice(11, 16) !== "00:00" ? c.abre.slice(11, 16) : null, t: `Abre a indicação · ${nm}`, sub: c.entrega || "", tipo: "prazo", gcota: `${ano}|${t}` });
    if (c.prazo) L.push({ d: c.prazo.slice(0, 10), h: c.prazo.slice(11, 16), t: `Fecha a indicação · ${nm}`, sub: c.entrega || "", tipo: "prazo", forte: true, gcota: `${ano}|${t}` }); }));
  ((AG.casa || {}).itens || []).forEach((x) => L.push({ d: x.d, t: x.t, sub: x.ato, tipo: "prazo" }));
  // ALESC: comissões do parlamentar, plenário, eventos da Casa; bases pelo nome do município no evento
  const MC = agComissoes(), BS = agBases(), bn = BS.map((b) => [b, agNorm(b.n)]);
  ((AG.alesc || {}).eventos || []).forEach((e) => { const base = bn.find(([, n]) => agNorm(e.t + " " + (e.local || "")).includes(n));
    if (e.tipo === "comissao") { const minhas = (e.com || []).map((c) => MC[agNorm(c)]).filter(Boolean); if (!minhas.length) return; L.push({ d: e.d, h: e.h, f: e.f, t: e.t, sub: [e.local, minhas.map((m) => m.papel === "membro" ? "membro" : m.papel).join(", ")].filter(Boolean).join(" · "), tipo: "comissao", url: e.pauta && e.pauta.u, link: e.pauta && e.pauta.t }); return; }
    if (e.tipo === "plenario") { L.push({ d: e.d, h: e.h, f: e.f, t: e.t, sub: e.local, tipo: "plenario" }); return; }
    L.push({ d: e.d, ate: e.ate, h: e.h, f: e.f, t: e.t, sub: [e.local, e.cat].filter(Boolean).join(" · "), tipo: base ? "base" : "casa", cidade: base && base[0].n }); });
  // aniversário das bases
  const AN = (AG.aniv || {}).m || {}; BS.forEach((b) => { const x = AN[b.n]; if (!x) return; anos.forEach((a) => { const anos2 = x[2] ? a - x[2] : null; L.push({ d: `${a}-${String(x[1]).padStart(2, "0")}-${String(x[0]).padStart(2, "0")}`, t: `Aniversário de ${b.n}${anos2 > 0 ? ` · ${anos2} anos` : ""}`, sub: `${b.v.toLocaleString("pt-BR")} votos · ${x[3] === "aniversário" ? "data do aniversário" : "data de " + x[3]} (Wikipédia)`, tipo: "base", cidade: b.n }); }); });
  // equipe
  AG.eq.forEach((x) => L.push({ d: x.data, ate: x.ate, h: x.hora, t: x.titulo, sub: [x.municipio, x.local, x.obs].filter(Boolean).join(" · "), tipo: x.tipo === "base" ? "base" : x.tipo === "prazo" ? "prazo" : "equipe", eq: x }));
  return L.filter((x) => (x.ate || x.d) >= de && x.d <= ate).sort((a, b) => (a.d + (a.h || "00:00")).localeCompare(b.d + (b.h || "00:00"))); }

// ---------- carga ----------
async function agCarregar() {
  const j = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  try { const [a, n, c] = await Promise.all([AG.alesc || j("../dados/painel/agenda-alesc.json?v=" + new Date().toISOString().slice(0, 10)), AG.aniv || j("../dados/painel/sc-aniversarios.json?v=1"), AG.casa || j("../dados/painel/prazos-casa.json?v=1")]); AG.alesc = a; AG.aniv = n; AG.casa = c;
    if (LOCAL && !SESS) { try { AG.eq = JSON.parse(localStorage.getItem("gab_agenda_" + PARL.n) || "[]"); } catch (e) { AG.eq = []; } }
    else if (SESS && (PAPEL || (typeof ADM !== "undefined" && ADM))) { const r = await supabaseClient.from("gab_agenda").select("*").eq("parlamentar", PARL.n).order("data"); if (r.error) throw r.error; AG.eq = r.data || []; }
    AG.carregado = true; AG.erro = ""; } catch (e) { AG.erro = e.message || String(e); }
  agDesenhar(); }
const agPodeEditar = () => (typeof EDITA === "function" && EDITA()) || (LOCAL && !SESS);
async function agGravar(row) { row = { ...row, parlamentar: PARL.n };
  if (LOCAL && !SESS) { if (!row.id) { row.id = "l" + Date.now(); AG.eq.push(row); } else AG.eq = AG.eq.map((x) => (x.id === row.id ? { ...x, ...row } : x)); localStorage.setItem("gab_agenda_" + PARL.n, JSON.stringify(AG.eq)); return; }
  const { id, ...dados } = row; ["dono", "criado_em", "atualizado_por", "atualizado_em"].forEach((k) => delete dados[k]);
  const r = id ? await supabaseClient.from("gab_agenda").update(dados).eq("id", id) : await supabaseClient.from("gab_agenda").insert(dados); if (r.error) throw r.error; }
async function agApagar(id) { if (LOCAL && !SESS) { AG.eq = AG.eq.filter((x) => x.id !== id); localStorage.setItem("gab_agenda_" + PARL.n, JSON.stringify(AG.eq)); return; } const r = await supabaseClient.from("gab_agenda").delete().eq("id", id); if (r.error) throw r.error; }

// ---------- desenho ----------
const AG_ROT = Object.fromEntries(AG_TIPOS);
function agMesHtml(ano, mes, F) { const ini = new Date(ano, mes, 1, 12), dIni = agIso(new Date(ano, mes, 1 - ((ini.getDay() + 6) % 7), 12)), dFim = agMais(dIni, 41), L = agItens(dIni, dFim).filter((x) => F.has(x.tipo)), hoje = agIso(new Date());
  const por = {}; L.forEach((x) => { let d = x.d < dIni ? dIni : x.d; const fim = x.ate && x.ate > x.d ? (x.ate < dFim ? x.ate : dFim) : x.d; for (let k = 0; d <= fim && k < 42; k++, d = agMais(d, 1)) (por[d] = por[d] || []).push(x); });
  let h = `<div class="ag-cal"><div class="ag-ch">${["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((s) => `<span>${s}</span>`).join("")}</div><div class="ag-cg">`;
  for (let k = 0; k < 42; k++) { const d = agMais(dIni, k), dd = agDt(d), fora = dd.getMonth() !== mes, I = por[d] || [], fer = I.some((x) => x.fer), tps = [...new Set(I.map((x) => x.tipo))];
    h += `<button class="ag-d${fora ? " fora" : ""}${d === hoje ? " hoje" : ""}${d === AG.dia ? " sel" : ""}${fer ? " fer" : ""}" data-agd="${d}"><b>${dd.getDate()}</b>${tps.length ? `<span class="ag-pt">${tps.slice(0, 5).map((t) => `<i class="ag-c-${t}"></i>`).join("")}</span>` : ""}${I.length ? `<em>${I.length}</em>` : ""}</button>`; }
  return h + `</div></div>`; }
function agLista(de, ate, F) { const L = agItens(de, ate).filter((x) => F.has(x.tipo)); if (!L.length) return `<p class="rh-nt">Nada na agenda neste período com as etiquetas marcadas.</p>`;
  const G = {}; L.forEach((x) => { const d = x.d < de ? de : x.d; (G[d] = G[d] || []).push(x); }); const hoje = agIso(new Date());
  return Object.keys(G).sort().map((d) => { const dd = agDt(d); return `<div class="ag-dia${d === hoje ? " hoje" : ""}"><div class="ag-dt"><b>${dd.getDate()}</b><span>${AG_MES[dd.getMonth()].slice(0, 3)}</span><small>${dd.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</small></div><div class="ag-its">${G[d].map((x) => `<div class="ag-it${x.forte ? " forte" : ""}"><span class="ag-h">${x.h ? esc(x.h) + (x.f ? "–" + esc(x.f) : "") : x.ate ? "até " + x.ate.slice(8, 10) + "/" + x.ate.slice(5, 7) : "dia todo"}</span><span class="ag-tx"><b>${esc(x.t)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.link || "abrir")}</a>` : ""}${x.gcota ? `<a href="#" data-gcota="${esc(x.gcota)}">abrir a indicação</a>` : ""}</span><span class="ag-tg ag-c-${x.tipo}">${esc(AG_ROT[x.tipo])}</span>${x.eq && agPodeEditar() ? `<button class="rh-lk" data-age="${esc(x.eq.id)}">editar</button>` : ""}</div>`).join("")}</div></div>`; }).join(""); }
function agForm() { const r = AG.form || {}, BS = agBases(), opt = (v, t) => `<option value="${esc(v)}"${(r.tipo || "compromisso") === v ? " selected" : ""}>${t}</option>`;
  return `<div class="rh-fm ag-fm"><div class="rh-fc"><label>Data<input type="date" data-af="data" value="${esc(r.data || AG.dia || agIso(new Date()))}"></label><label>Até (opcional)<input type="date" data-af="ate" value="${esc(r.ate || "")}"></label><label>Hora<input type="time" data-af="hora" value="${esc(r.hora || "")}"></label>
    <label>Tipo<select data-af="tipo">${opt("compromisso", "Compromisso")}${opt("base", "Evento nas bases")}${opt("prazo", "Prazo")}${opt("outro", "Outro")}</select></label><label class="w">Título<input data-af="titulo" maxlength="200" value="${esc(r.titulo || "")}" placeholder="ex.: Festa do Colono em Pomerode"></label>
    <label>Município<input data-af="municipio" list="agMuns" value="${esc(r.municipio || "")}"><datalist id="agMuns">${[...BS.map((b) => b.n), ...(BASE ? BASE.mun.map((m) => m.n) : [])].filter((v, i, a) => a.indexOf(v) === i).map((n) => `<option value="${esc(n)}">`).join("")}</datalist></label><label>Local<input data-af="local" maxlength="200" value="${esc(r.local || "")}"></label><label class="w">Observação<input data-af="obs" maxlength="1000" value="${esc(r.obs || "")}"></label></div>
    <div class="rh-fb">${r.id ? `<button class="rh-lk" data-agdel="${esc(r.id)}">remover</button>` : ""}<span></span><button class="rh-lk" data-agx>cancelar</button><button class="rh-bt on" data-agok>${r.id ? "Salvar" : "Adicionar"}</button></div><p class="rh-er" hidden></p></div>`; }
function agDesenhar() { const el = document.getElementById("agC"); if (!el) return;
  if (!AG.carregado) { el.innerHTML = AG.erro ? `<p class="rh-nt">Não foi possível carregar a agenda: ${esc(AG.erro)}</p>` : `<p class="rh-nt">Carregando a agenda…</p>`; return; }
  const F = agFiltro(), agora = new Date(); if (!AG.mes) AG.mes = [agora.getFullYear(), agora.getMonth()]; const [ano, mes] = AG.mes, hoje = agIso(agora);
  const de = AG.dia || hoje, ate = AG.dia ? AG.dia : agMais(hoje, 30), prox = agItens(hoje, agMais(hoje, 6)).filter((x) => F.has(x.tipo)).length;
  const sub = document.querySelector("#agB > h3 small"); if (sub) sub.textContent = prox ? `${prox} ${prox > 1 ? "itens" : "item"} nos próximos 7 dias` : "";
  const BS = agBases(), MC = Object.values(agComissoes()), gerado = (AG.alesc || {}).gerado;
  el.innerHTML = `<div class="ag-tps">${AG_TIPOS.map(([k, t]) => `<button class="tp${F.has(k) ? " on" : ""}" data-agt="${k}"><i class="ag-c-${k}"></i>${t}</button>`).join("")}</div>
    <div class="ag-gr"><div><div class="ag-nav"><button data-agm="-1" aria-label="Mês anterior">‹</button><b>${AG_MES[mes]} ${ano}</b><button data-agm="1" aria-label="Próximo mês">›</button>${AG.dia ? `<button class="rh-lk" data-agdx>ver os próximos 30 dias</button>` : ""}</div>${agMesHtml(ano, mes, F)}
      <div class="ag-ref"><b>Bases</b> ${BS.map((b) => esc(b.n)).join(" · ") || "—"}<br><b>Comissões</b> ${MC.map((m) => esc(m.nome.replace(/^Comissão (de |da |do |dos |das )?/, "")) + (m.papel !== "membro" ? ` (${m.papel})` : "")).join(" · ") || "—"}</div></div>
      <div><h4 class="ag-lt">${AG.dia ? agDt(AG.dia).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Próximos 30 dias"}</h4>${agLista(de, ate, F)}</div></div>
    ${agPodeEditar() ? `<div class="rh-add">${AG.form ? agForm() : `<button class="rh-bt" data-agadd>+ Adicionar à agenda</button>`}</div>` : ""}
    <p class="rh-nt">Fontes: agenda das comissões e do Plenário (e-Legis) e agenda da Casa (alesc.sc.gov.br), lidas todo dia${gerado ? `, última leitura em ${new Date(gerado).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}; prazos das emendas (Cotas) e da Casa (Diário); feriados nacionais e Data Magna de SC (Lei 18.531/2022); aniversário das cidades pela Wikipédia (data do aniversário ou, sem ela, da fundação).</p>`; }

// chamado ao desenhar o Administrativo
function corpoAgenda() { setTimeout(() => { if (!AG.carregado) agCarregar(); else agDesenhar(); }, 0);
  return `<div class="rhb" id="agB"><h3 onclick="this.parentElement.classList.toggle('fech')">Agenda<small></small></h3><div id="agC"><p class="rh-nt">Carregando a agenda…</p></div></div>`; }

document.addEventListener("click", async (e) => { const box = e.target.closest("#agB"); if (!box) return; const t = e.target.closest("button,[data-gcota]"); if (!t) return;
  if (t.dataset.gcota) { e.preventDefault(); const [ano, tp] = t.dataset.gcota.split("|"); if (typeof abrirInd === "function") { IND.ano = +ano; IND.tag = "cota:" + tp; IND.det = null; abrirInd(); } return; }
  if (t.dataset.agt) { const F = agFiltro(); F.has(t.dataset.agt) ? F.delete(t.dataset.agt) : F.add(t.dataset.agt); agGravaFiltro(F); agDesenhar(); return; }
  if (t.dataset.agm) { let [a, m] = AG.mes; m += +t.dataset.agm; if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; } AG.mes = [a, m]; agDesenhar(); return; }
  if (t.dataset.agd) { AG.dia = AG.dia === t.dataset.agd ? null : t.dataset.agd; agDesenhar(); return; }
  if (t.dataset.agdx != null) { AG.dia = null; agDesenhar(); return; }
  if (t.dataset.agadd != null) { AG.form = {}; agDesenhar(); return; }
  if (t.dataset.age) { AG.form = { ...(AG.eq.find((x) => String(x.id) === t.dataset.age) || {}) }; agDesenhar(); box.querySelector(".ag-fm").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
  if (t.dataset.agx != null) { AG.form = null; agDesenhar(); return; }
  const er = box.querySelector(".rh-er");
  if (t.dataset.agdel) { if (!confirm("Remover este item da agenda?")) return; try { await agApagar(t.dataset.agdel); AG.form = null; await agCarregar(); } catch (x) { er.hidden = false; er.textContent = "Não removeu: " + (x.message || x); } return; }
  if (t.dataset.agok != null) { const v = (k) => (box.querySelector(`[data-af="${k}"]`) || {}).value?.trim() || null, row = { ...(AG.form || {}), data: v("data"), ate: v("ate"), hora: v("hora"), tipo: v("tipo") || "compromisso", titulo: v("titulo"), municipio: v("municipio"), local: v("local"), obs: v("obs") };
    if (!row.data || !row.titulo) { er.hidden = false; er.textContent = "Preencha a data e o título."; return; } if (row.ate && row.ate < row.data) { er.hidden = false; er.textContent = "A data final é antes da inicial."; return; }
    t.disabled = true; try { await agGravar(row); AG.form = null; AG.dia = row.data; AG.mes = [agDt(row.data).getFullYear(), agDt(row.data).getMonth()]; await agCarregar(); } catch (x) { t.disabled = false; er.hidden = false; er.textContent = "Não salvou: " + (x.message || x); } } });
