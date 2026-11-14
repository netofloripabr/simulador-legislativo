// Gabinete › ALESC (Transparência) › Diário Oficial (14/11/2026). Leitura diária do Diário da Assembleia: uma ficha por
// edição, da mais recente para a mais antiga, com as movimentações funcionais (nomeação, exoneração, à disposição,
// nível salarial e outros atos funcionais) e um resumo dos atos da Mesa/Presidência sem servidor (licenças, cronogramas,
// regras). Cada edição pode ser marcada como lida (fecha e vai para o fim). Dados: adm_atos e adm_ato_pessoas, gravados
// pela rotina do Diário (ferramentas/diario/rotina.mjs, todo dia 22h30). Só administrador (RLS gab_pode); para os
// demais o bloco não aparece. Consulta por janela de 3 semanas (~150 atos, ~100 KB); "Carregar mais" busca a anterior.
// Lidas: no navegador (localStorage gab_dio_lidos). Usa os globais de gabinete.js (ADM, SESS, esc) e o supabaseClient.
let DIO = { atos: [], ate: null, carregando: false, erro: "", fim: false };
const DIO_JANELA = 21; // dias por consulta
const dioLidos = () => { try { return new Set(JSON.parse(localStorage.getItem("gab_dio_lidos") || "[]")); } catch (e) { return new Set(); } };
const dioGrava = (S) => { try { localStorage.setItem("gab_dio_lidos", JSON.stringify([...S].slice(-400))); } catch (e) {} };
const dioIso = (d) => d.toISOString().slice(0, 10);
const dioTit = (s) => String(s || "").toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase());
const dioDia = (s) => { const d = new Date(s + "T12:00:00"); return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }); };
// grupos das movimentações funcionais (mesmo critério das etiquetas do perfil do servidor)
const DIO_G = [["nom", "Nomeações"], ["exo", "Exonerações"], ["disp", "À disposição e cessões"], ["niv", "Nível salarial"], ["out", "Outros atos funcionais"]];
function dioGrupo(a) { const ac = a.acoes || [];
  // (o campo disposicao do ato não serve aqui: vem marcado também em licenças e fiscais; vale a ação)
  if (ac.some((x) => ["CEDER", "COLOCAR À DISPOSIÇÃO", "RETORNAR"].includes(x))) return "disp";
  if (ac.includes("NOMEAR")) return "nom"; if (ac.includes("EXONERAR")) return "exo";
  if (ac.some((x) => ["ALTERAR NÍVEL", "POSICIONAR", "PROMOVER", "ENQUADRAR"].includes(x))) return "niv"; return "out"; }
// resumo de um ato sem servidor: a ementa, quando o texto começa por ela; senão, o que vem depois do verbo da decisão
function dioResumo(t) { t = String(t || "").replace(/\s+/g, " ").trim(); if (!t) return "";
  let r = /^(A MESA|O PRESIDENTE|O DIRETOR|A ASSEMBLEIA)/i.test(t) ? "" : t.split(/\.\s/)[0];
  if (!r) { const m = t.match(/RESOLVE:\s*(.*)/) || t.match(/atribuições,?\s*(.*)/i); r = m ? m[1] : t; }
  r = r.split(/\s(?:PALÁCIO BARRIGA VERDE|Art\. 2|REQUERIMENTO|Processo SEI)/)[0].replace(/^Art\. 1°?\s*/, "");
  r = r.replace(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ]+)/, (w) => w.charAt(0) + w.slice(1).toLowerCase()); return r.length > 220 ? r.slice(0, 217).replace(/\s\S*$/, "") + "…" : r; }

async function dioCarregar(mais) {
  if (!ADM || !SESS || DIO.carregando || (mais && DIO.fim)) return; DIO.carregando = true; dioDesenhar();
  try { const ate = DIO.ate ? new Date(DIO.ate + "T12:00:00") : new Date(Date.now() + 7 * 864e5), de = new Date(ate.getTime() - DIO_JANELA * 864e5);
    let q = supabaseClient.from("adm_atos").select("id, edicao, publicado, tipo, numero, autoridade, acoes, cargo, lotacoes, disposicao, url, adm_ato_pessoas(nome, matricula, nivel_de, nivel)").gte("publicado", dioIso(de)).order("publicado", { ascending: false }).order("id");
    if (DIO.ate) q = q.lt("publicado", DIO.ate);
    const { data, error } = await q; if (error) throw error;
    // texto só dos atos sem servidor (o resumo da Mesa), para não trazer o texto inteiro de todos
    const sem = (data || []).filter((a) => !(a.adm_ato_pessoas || []).length).map((a) => a.id);
    if (sem.length) { const T = await supabaseClient.from("adm_atos").select("id, texto").in("id", sem); const M = {}; (T.data || []).forEach((x) => { M[x.id] = x.texto; }); data.forEach((a) => { if (M[a.id] != null) a.texto = M[a.id]; }); }
    DIO.atos = DIO.atos.concat(data || []); DIO.ate = dioIso(de); DIO.fim = !(data || []).length && mais; DIO.erro = ""; }
  catch (e) { DIO.erro = e.message || String(e); }
  DIO.carregando = false; dioDesenhar(); }

function dioFicha(ed, L, lido) {
  const fun = L.filter((a) => (a.adm_ato_pessoas || []).length), mesa = L.filter((a) => !(a.adm_ato_pessoas || []).length);
  const G = {}; fun.forEach((a) => { const g = dioGrupo(a); (G[g] = G[g] || []).push(a); });
  const conta = DIO_G.filter(([k]) => G[k]).map(([k, t]) => `<span>${G[k].reduce((s, a) => s + a.adm_ato_pessoas.length, 0)} ${t.toLowerCase()}</span>`).join("") + (mesa.length ? `<span>${mesa.length} ${mesa.length > 1 ? "atos administrativos" : "ato administrativo"}</span>` : "");
  const lk = (a) => `<a href="${esc(a.url || "#")}" target="_blank" rel="noopener">${esc(dioTit(a.tipo))} ${esc(a.numero || "")}</a>`;
  const linha = (a, p) => `<tr><td>${typeof servidorAbrir === "function" && p.matricula && p.nome ? `<button class="dio-pn" data-svab="${p.matricula}">${esc(dioTit(p.nome))}</button>` : `<b>${p.nome ? esc(dioTit(p.nome)) : "nome não identificado"}</b>`}<small>${esc((a.acoes || []).map((x) => x.toLowerCase()).join(", "))}</small></td><td class="mu">${esc(a.cargo || "")}${p.nivel ? `<small>nível ${p.nivel_de ? esc(p.nivel_de) + " → " : ""}${esc(p.nivel)}</small>` : ""}</td><td class="mu">${esc((a.lotacoes || []).join(" · "))}</td><td class="r">${lk(a)}</td></tr>`;
  const corpo = DIO_G.filter(([k]) => G[k]).map(([k, t]) => `<h5>${t}</h5><div class="dio-tw"><table>${G[k].flatMap((a) => a.adm_ato_pessoas.map((p) => linha(a, p))).join("")}</table></div>`).join("")
    + (mesa.length ? `<h5>Atos da Mesa e administrativos</h5><ul class="dio-ms">${mesa.map((a) => `<li>${lk(a)}<span>${esc(dioResumo(a.texto)) || "—"}</span></li>`).join("")}</ul>` : "");
  return `<div class="dio-ed${lido ? " lido" : ""}" data-dioed="${ed}"><div class="dio-cb"><div><b>Diário nº ${ed}</b><small>${esc(dioDia(L[0].publicado))} · ${L.length} ${L.length > 1 ? "atos" : "ato"}</small></div>
    <div class="dio-ct">${conta}</div><button class="dio-bt" data-diolido="${ed}">${lido ? "Reabrir" : "Marcar como lido"}</button></div>${lido ? "" : `<div class="dio-cp">${corpo}</div>`}</div>`; }

function dioDesenhar() { const el = document.getElementById("dioC"); if (!el) return;
  if (!DIO.atos.length && DIO.carregando) { el.innerHTML = `<p class="rh-nt">Carregando o Diário…</p>`; return; }
  if (DIO.erro && !DIO.atos.length) { el.innerHTML = `<p class="rh-nt">Não foi possível ler o Diário: ${esc(DIO.erro)}</p>`; return; }
  const E = {}; DIO.atos.forEach((a) => { (E[a.edicao] = E[a.edicao] || []).push(a); });
  const eds = Object.keys(E).sort((a, b) => String(E[b][0].publicado).localeCompare(String(E[a][0].publicado)) || b - a), S = dioLidos();
  const ab = eds.filter((e) => !S.has(+e)), li = eds.filter((e) => S.has(+e));
  const sub = document.querySelector("#dioB > h3 small"); if (sub) sub.textContent = ab.length ? `${ab.length} ${ab.length > 1 ? "edições não lidas" : "edição não lida"}` : "tudo lido";
  el.innerHTML = `<p class="rh-sub">A movimentação funcional de cada edição do Diário da Assembleia e um resumo dos atos da Mesa, da mais recente para a mais antiga. Ao marcar uma edição como lida, ela fecha e vai para o fim.${ab.length > 1 ? ` <button class="dio-lk" data-diotodos>Marcar todas como lidas</button>` : ""}</p>
    ${ab.map((e) => dioFicha(e, E[e], false)).join("") || `<p class="rh-nt">Nenhuma edição por ler neste período.</p>`}
    ${li.length ? `<details class="dio-li"><summary>Lidas · ${li.length}</summary>${li.map((e) => dioFicha(e, E[e], true)).join("")}</details>` : ""}
    <div class="dio-mais">${DIO.fim ? `<span class="rh-nt">Não há edições mais antigas gravadas.</span>` : `<button class="dio-lk" data-diomais${DIO.carregando ? " disabled" : ""}>${DIO.carregando ? "Carregando…" : `Carregar mais ${DIO_JANELA / 7} semanas (antes de ${DIO.ate ? DIO.ate.split("-").reverse().join("/") : ""})`}</button>`}</div>`; }

// chamado ao desenhar o título ALESC: só monta o bloco para o administrador; carrega uma vez
function corpoDiario() { if (!ADM || !SESS) return ""; setTimeout(() => { if (!DIO.atos.length && !DIO.erro) dioCarregar(); else dioDesenhar(); }, 0);
  return `<div class="rhb" id="dioB"><h3 onclick="this.parentElement.classList.toggle('fech')">Diário Oficial<small></small></h3><div id="dioC"><p class="rh-nt">Carregando o Diário…</p></div></div>`; }

document.addEventListener("click", (e) => { const t = e.target.closest("[data-diolido],[data-diotodos],[data-diomais]"); if (!t || !t.closest("#dioB")) return; e.preventDefault();
  if (t.dataset.diomais != null) { dioCarregar(true); return; }
  const S = dioLidos();
  if (t.dataset.diotodos != null) [...new Set(DIO.atos.map((a) => a.edicao))].forEach((x) => S.add(x));
  else { const ed = +t.dataset.diolido; S.has(ed) ? S.delete(ed) : S.add(ed); }
  dioGrava(S); dioDesenhar(); });
