// Indicação de recursos › links dos líderes (20/11/2026, migração 103).
// O gabinete gera um link por líder (as emendas com aquela liderança) ou avulso (uma pessoa, uma ou mais emendas).
// Quem recebe preenche em painel/indicar-lider.html?t=TOKEN, sem login. Aqui, na planilha da lista:
//  - faixa "Links": um botão por líder (anel = % preenchido; menu copiar, WhatsApp, abrir para acompanhar, prazo, fechar);
//  - coluna "Etapa": um ícone só por emenda (gerado → aberto → preenchido → enviado → aceito), legenda ao tocar;
//  - proposta enviada aparece em azul embaixo do objeto, com ✓ (aceita: os campos vão para a emenda) e ✕ (recusa);
//  - botão "Colunas": liga e desliga colunas da planilha (guardado no navegador).
// Leitura: 2 consultas pequenas ao abrir a lista (no máx. 1 vez por minuto); nada de polling.
const LK = { lista: null, links: [], props: [], lido: 0, lendo: null };
const LKI = {
  lnk: '<path d="M6.5 9.5l3-3M5 7.5L3.8 8.7a2.5 2.5 0 0 0 3.5 3.5L8.5 11M11 8.5l1.2-1.2a2.5 2.5 0 0 0-3.5-3.5L7.5 5"/>',
  rel: '<circle cx="8" cy="8" r="5.2"/><path d="M8 5.2V8l2 1.3"/>',
  lap: '<path d="M10.5 3.5l2 2-6.5 6.5H4v-2z"/>',
  env: '<path d="M13 3L6.8 9.2M13 3l-4 10-2.2-3.8L3 7z"/>',
  chk: '<path d="M3.5 8.5l3 3 6-7"/>',
  x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>',
  cop: '<rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5"/><path d="M10.5 5.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h1.5"/>',
  olh: '<path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8z"/><circle cx="8" cy="8" r="2"/>',
  cad: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/>',
  wpp: '<path d="M3 13l.9-2.6A5 5 0 1 1 5.7 12z"/>' };
const lsv = (k) => `<svg viewBox="0 0 16 16" aria-hidden="true">${LKI[k]}</svg>`;
const ETP = [["lnk", "Link gerado"], ["rel", "Link aberto pelo líder"], ["lap", "Emenda preenchida"], ["env", "Enviado ao gabinete"], ["chk", "Aceito por você"]];
// ---------- dados ----------
async function lerLinks(T, forca) {
  if (!T || !T.L || typeof supabaseClient === "undefined" || !supabaseClient || !SESS) return false;
  if (!forca && LK.lista === T.L.id && Date.now() - LK.lido < 60000) return false;
  if (LK.lendo) return LK.lendo;
  LK.lendo = (async () => { try {
    const { data: L, error } = await supabaseClient.from("gab_links").select("id,token,nome,lideranca,itens,titulo,prazo,fechado,criado_em,aberto_em,ult_acesso,acessos,enviado_em").eq("lista_id", T.L.id).order("criado_em");
    if (error) throw error; let P = [];
    if (L.length) { const r = await supabaseClient.from("gab_link_propostas").select("*").in("link_id", L.map((l) => l.id)); if (r.error) throw r.error; P = r.data || []; }
    LK.lista = T.L.id; LK.links = L || []; LK.props = P; LK.lido = Date.now(); return true;
  } catch (e) { console.warn("links dos líderes:", e.message || e); return false; } finally { LK.lendo = null; } })();
  return LK.lendo;
}
const linkUrl = (l) => new URL("indicar-lider.html?t=" + encodeURIComponent(l.token), location.href).href;
const encerrado = (l) => l.fechado || new Date(l.prazo) <= new Date();
const estadoLink = (l) => encerrado(l) ? "fechado" : l.enviado_em ? "enviado" : l.aberto_em ? "ativo" : "gerado";
const propsDe = (l) => LK.props.filter((p) => p.link_id === l.id);
const pctLink = (l) => l.itens.length ? Math.round(propsDe(l).filter((p) => p.objeto).length / l.itens.length * 100) : 0;
const linksDoItem = (id) => LK.links.filter((l) => l.itens.includes(id));
// proposta "da vez" de uma emenda: a mais recente entre os links que a contêm
const propItem = (id) => LK.props.filter((p) => p.item_id === id).sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)))[0] || null;
function etapaItem(x) { const L = linksDoItem(x.id); if (!L.length) return { n: 0 }; const p = propItem(x.id);
  if (p && p.status === "aceito") return { n: 5 }; if (p && p.status === "recusado") return { n: 5, x: true };
  if (p && p.status === "enviado") return { n: 4, esp: true }; if (p && p.objeto) return { n: 3 };
  if (L.some((l) => l.aberto_em)) return { n: 2 }; return { n: 1 }; }
const TXT_E = (e) => e.x ? "Recusado por você" : e.n === 5 ? "Aceito por você" : e.esp ? "Enviado · falta você aceitar" : e.n === 3 ? "Preenchida · falta o líder enviar" : e.n === 2 ? "Link aberto · líder preenchendo" : e.n === 1 ? "Link gerado · ainda não aberto" : "Sem link";
function anelE(e) { const c = e.n === 5 && !e.x ? "#1FA845" : "#1D2226", r = 13, C = 2 * Math.PI * r, seg = C / 5, gap = 2.2;
  return `<svg class="an" viewBox="0 0 30 30">${[0, 1, 2, 3, 4].map((k) => `<circle cx="15" cy="15" r="${r}" fill="none" stroke="${k < e.n ? c : "#E4E7E9"}" stroke-width="2.6" stroke-dasharray="${seg - gap} ${C}" stroke-dashoffset="${-k * seg}" transform="rotate(-90 15 15)"/>`).join("")}</svg>`; }
function celEtapa(x) { if (!x) return ""; const e = etapaItem(x), k = e.x ? "x" : e.n ? ETP[e.n - 1][0] : "lnk", c = e.n === 5 && !e.x ? "#1FA845" : e.n ? "#1D2226" : "#EEF0F2";
  return `<button class="lke" data-lke="${x.id}" title="${esc(TXT_E(e))}" aria-label="Etapa: ${esc(TXT_E(e))}"><span class="bd">${anelE(e)}<span class="ic" style="background:${c};color:${e.n ? "#fff" : "#AEB4B9"}">${lsv(k)}</span></span></button>`; }
// proposta enviada pelo líder, embaixo do objeto (só o que muda em relação à emenda)
function celProposta(x, fech) { if (!x) return ""; const p = propItem(x.id); if (!p || p.status !== "enviado") return "";
  const d = [];
  if (p.objeto && p.objeto !== x.objeto) d.push(`<b>${esc(p.objeto)}</b>${p.objeto_fonte === "outro" ? " <em>fora do Portfólio</em>" : ""}`);
  if (p.municipio && p.municipio !== x.municipio) d.push(`município: <b>${esc(p.municipio)}</b>`);
  if (p.benef_tipo === "ent" && (p.beneficiario || "") !== (x.razao_social || x.beneficiario || "")) d.push(`entidade: <b>${esc(p.beneficiario || "—")}</b>${p.cnpj ? " · " + esc(p.cnpj) : ""}`);
  if (p.benef_tipo === "mun" && tipoDe(x) === "ent") d.push(`quem recebe: <b>município</b>`);
  if (!d.length) d.push(`<b>mantém o que está</b>`);
  return `<div class="lkp">Proposta do líder: ${d.join(" · ")}${p.justificativa ? `<small>${esc(p.justificativa)}</small>` : ""}${fech ? `<small>Reabra a lista para aceitar.</small>` : `<span class="lkvx"><button data-lkrec="${p.id}" title="Recusar" aria-label="Recusar">${lsv("x")}</button><button class="v" data-lkac="${p.id}" title="Aceitar" aria-label="Aceitar">${lsv("chk")}</button></span>`}</div>`; }
// ---------- faixa "Links" ----------
const anelLk = (p) => { const r = 8, C = 2 * Math.PI * r; return `<svg class="rg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="${r}" fill="none" stroke="#E4E7E9" stroke-width="2.5"/>${p ? `<circle cx="10" cy="10" r="${r}" fill="none" stroke="#1D2226" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${C * p / 100} ${C}" transform="rotate(-90 10 10)"/>` : ""}</svg>`; };
function lideresLista(T) { const C = {}; AD.itens.filter((x) => x.lista_id === T.L.id && cheia(x) && x.lideranca).forEach((x) => { C[x.lideranca] = (C[x.lideranca] || 0) + 1; });
  return Object.entries(C).sort((a, b) => b[1] - a[1]).map(([n]) => n); }
const linkDoLider = (n) => LK.links.filter((l) => l.lideranca === n).pop();
function faixaLinks(T) { if (!T.L || !SESS) return "";
  const lid = lideresLista(T), av = LK.links.filter((l) => !l.lideranca);
  const bt = (l) => `<button class="lkc" data-lkl="${l.id}">${anelLk(pctLink(l))}${esc(l.nome)}<small>${pctLink(l)}% · ${estadoLink(l)}</small></button>`;
  return `<div class="lks"><span class="tt">Links</span>${lid.map((n) => { const l = linkDoLider(n); return l ? bt(l) : `<button class="lkc nw" data-lknovo="${esc(n)}">+ link · ${esc(n)}</button>`; }).join("")}${av.map(bt).join("")}<button class="lkc nw" data-lkav>+ link avulso</button></div>`; }
// ---------- colunas que ligam e desligam ----------
const COLS_IND = [["ent", "Ente · modalidade · função"], ["mun", "Município"], ["obj", "Objeto"], ["val", "Valor"], ["lid", "Líder e contato"], ["obs", "Observações"], ["etp", "Etapa"]];
let COLS_OFF = (() => { try { return JSON.parse(localStorage.getItem("ind_cols") || '["lid"]'); } catch (e) { return ["lid"]; } })();
const colOn = (k) => !COLS_OFF.includes(k);
const nColInd = () => 2 + COLS_IND.filter(([k]) => colOn(k)).length; // nº, colunas visíveis e ações
function menuCols(b) { fechaLk(); b.classList.add("on");
  abreLk(b, `<div class="h"><b>Colunas</b>escolha o que aparece na planilha</div>${COLS_IND.map(([k, n]) => `<label class="lkcol"><input type="checkbox" data-cc="${k}" ${colOn(k) ? "checked" : ""}>${n}</label>`).join("")}`, "lkm cols");
  document.querySelectorAll("[data-cc]").forEach((x) => x.onchange = () => { COLS_OFF = x.checked ? COLS_OFF.filter((k) => k !== x.dataset.cc) : [...COLS_OFF, x.dataset.cc];
    try { localStorage.setItem("ind_cols", JSON.stringify(COLS_OFF)); } catch (e) {} const y = scrollY, sc = $("#indPg").scrollTop; desenharInd(); $("#indPg").scrollTop = sc; scrollTo(0, y); menuCols($("#indPg [data-icols]")); }); }
// ---------- caixinhas (menu, legenda, "i") ----------
let LKF = null; // quem fecha a caixinha ao tocar fora (só uma por vez)
function fechaLk() { if (LKF) { document.removeEventListener("click", LKF); LKF = null; } document.querySelectorAll(".lkm").forEach((x) => x.remove()); document.querySelectorAll("#indPg .lkon, #indPg .on.lkc, #indPg .on.lke, #indPg .on.ii").forEach((x) => x.classList.remove("on", "lkon")); }
function abreLk(b, html, cls) { const m = document.createElement("div"); m.className = cls || "lkm"; m.innerHTML = html; $("#indPg").appendChild(m);
  const r = b.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight; m.style.left = Math.max(12, Math.min(r.left, innerWidth - w - 12)) + "px"; m.style.top = (r.bottom + h + 12 > innerHeight ? Math.max(12, r.top - h - 6) : r.bottom + 6) + "px";
  b.classList.add("on"); setTimeout(() => { if (!m.isConnected) return; LKF = (e) => { if (!m.contains(e.target)) fechaLk(); }; document.addEventListener("click", LKF); }, 0); return m; }
// "i": orientação curta em vez de texto longo na tela
function infoI(b, html) { const ja = document.querySelector(".lkm.inf"); fechaLk(); if (ja && ja._b === b) return; const m = abreLk(b, html, "lkm inf"); m._b = b; }
const botaoI = (k, rot) => `<button class="ii" data-iinfo="${k}" aria-label="${esc(rot || "Mais informações")}">i</button>`;
// ---------- ações ----------
async function copiar(t, aviso) { try { await navigator.clipboard.writeText(t); } catch (e) { prompt("Copie o link:", t); return; } toastLk(aviso || "Link copiado"); }
function toastLk(t) { document.getElementById("lkToast")?.remove(); const d = document.createElement("div"); d.id = "lkToast"; d.className = "lktoast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
const prazoPadrao = (T) => { const p = (T.cota && T.cota.prazo) || (T.L.regras || {}).prazo; const ja = LK.links.find((l) => !encerrado(l)); if (ja) return ja.prazo;
  const d = p ? new Date(p) : new Date(Date.now() + 7 * 864e5); if (p) d.setDate(d.getDate() - 7); d.setHours(13, 0, 0, 0); return d.toISOString(); };
async function gerarLink(T, nome, lideranca, itens) { exigeEditar();
  const { data, error } = await supabaseClient.from("gab_links").insert({ parlamentar: PARL.n, lista_id: T.L.id, nome, lideranca, itens, prazo: prazoPadrao(T), titulo: `Gabinete do dep. ${PARL.u || PARL.n} · Emendas ${T.nome}` }).select().single();
  if (error) throw error; LK.links.push(data); return data; }
async function novoLinkLider(T, n) { try { const it = AD.itens.filter((x) => x.lista_id === T.L.id && cheia(x) && x.lideranca === n).map((x) => x.id);
    const l = await gerarLink(T, n, n, it); await copiar(linkUrl(l), `Link de ${n} gerado e copiado`); desenharInd(); } catch (e) { alert("Não foi possível gerar o link: " + (e.message || e)); } }
async function novoLinkItem(T, x) { const n = prompt("Nome de quem vai receber o link desta emenda:", x.lideranca || ""); if (!n || !n.trim()) return;
  try { const l = await gerarLink(T, n.trim(), null, [x.id]); await copiar(linkUrl(l), "Link desta emenda gerado e copiado"); desenharInd(); } catch (e) { alert("Não foi possível gerar o link: " + (e.message || e)); } }
function novoLinkAvulso(T, b) { const it = AD.itens.filter((x) => x.lista_id === T.L.id && cheia(x));
  const m = abreLk(b, `<div class="h"><b>Link avulso</b>para uma pessoa, com as emendas marcadas</div><input class="lkin" id="lkNome" placeholder="Nome de quem recebe"><div class="lkls">${it.map((x) => `<label class="lkcol"><input type="checkbox" value="${x.id}"><span>${esc(x.municipio || "—")}<small>${esc(frase(x.objeto || "").slice(0, 70))} · ${rc(+x.valor || 0)}</small></span></label>`).join("")}</div><div class="lkft"><button class="lkok" id="lkGera">${lsv("lnk")}Gerar e copiar</button></div>`, "lkm av");
  m.querySelector("#lkGera").onclick = async () => { const n = m.querySelector("#lkNome").value.trim(), ids = [...m.querySelectorAll("input[type=checkbox]:checked")].map((c) => c.value);
    if (!n) return m.querySelector("#lkNome").focus(); if (!ids.length) return alert("Marque pelo menos uma emenda.");
    try { const l = await gerarLink(T, n, null, ids); fechaLk(); await copiar(linkUrl(l), `Link de ${n} gerado e copiado`); desenharInd(); } catch (e) { alert("Não foi possível gerar o link: " + (e.message || e)); } };
  setTimeout(() => m.querySelector("#lkNome").focus(), 0); }
const fmtP = (d) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", ",");
function menuLink(b, l, T) { const st = estadoLink(l), q = propsDe(l);
  const quando = l.enviado_em ? "enviado " + fmtP(l.enviado_em) : l.aberto_em ? `aberto ${l.acessos}× · último ${fmtP(l.ult_acesso || l.aberto_em)}` : "ainda não aberto";
  const m = abreLk(b, `<div class="h"><b>${esc(l.nome)} · ${pctLink(l)}%</b>${l.itens.length} ${l.itens.length === 1 ? "emenda" : "emendas"} · ${quando}<br>${encerrado(l) ? "link fechado" : "fecha em " + fmtP(l.prazo)}${q.filter((p) => p.status === "enviado").length ? ` · <b style="display:inline;font-size:12px">${q.filter((p) => p.status === "enviado").length} para você aceitar</b>` : ""}</div>
    <button data-m="cop">${lsv("cop")}Copiar link</button><button data-m="wpp">${lsv("wpp")}Enviar pelo WhatsApp</button><button data-m="abr">${lsv("olh")}Abrir para acompanhar</button><hr>
    <button data-m="prz">${lsv("rel")}Mudar o prazo</button><button data-m="fec">${lsv("cad")}${l.fechado ? "Reabrir o link" : "Fechar o link agora"}</button>${st === "gerado" && !q.length ? `<button data-m="apg" class="apg">${lsv("x")}Apagar o link</button>` : ""}`);
  const up = async (o) => { const { error } = await supabaseClient.from("gab_links").update(o).eq("id", l.id); if (error) throw error; Object.assign(l, o); };
  m.querySelectorAll("[data-m]").forEach((x) => x.onclick = async () => { const a = x.dataset.m; fechaLk();
    try { if (a === "cop") await copiar(linkUrl(l));
      if (a === "wpp") window.open("https://wa.me/?text=" + encodeURIComponent(`Olá, ${l.nome}! Seguem as emendas para você escolher o objeto até ${fmtP(l.prazo)}: ${linkUrl(l)}`), "_blank", "noopener");
      if (a === "abr") window.open(linkUrl(l), "_blank", "noopener");
      if (a === "prz") { const d = new Date(l.prazo), ini = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        const v = prompt("Novo prazo (dia/mês/ano hora:min):", ini); if (!v) return; const k = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/); if (!k) return alert("Use o formato 23/11/2026 13:00.");
        await up({ prazo: new Date(+k[3], +k[2] - 1, +k[1], +k[4], +k[5]).toISOString(), fechado: false }); desenharInd(); }
      if (a === "fec") { await up({ fechado: !l.fechado }); desenharInd(); toastLk(l.fechado ? "Link fechado" : "Link reaberto"); }
      if (a === "apg") { if (!(await confirmaVX("Apagar este link?", `O link de ${l.nome} deixa de funcionar.`))) return; const { error } = await supabaseClient.from("gab_links").delete().eq("id", l.id); if (error) throw error; LK.links = LK.links.filter((y) => y !== l); desenharInd(); }
    } catch (e) { alert("Não foi possível: " + (e.message || e)); } }); }
function legendaE(b, x, T) { const e = etapaItem(x), L = linksDoItem(x.id), p = propItem(x.id), l = (p && L.find((y) => y.id === p.link_id)) || L[L.length - 1];
  const m = abreLk(b, `<div class="h"><b>${esc(x.municipio || "—")}${l ? " · " + esc(l.nome) : ""}</b>${l ? "link " + estadoLink(l) + (l.aberto_em ? ` · aberto ${l.acessos}×` : "") : "ainda sem link"}</div>
    <div class="lkleg">${ETP.map(([k, t], j) => { const fe = j < e.n, at = j === e.n - 1, xx = e.x && j === 4; return `<div class="${at ? "at" : fe ? "fe" : ""}"><span class="ep ${xx ? "f" : fe ? (j === 4 ? "ok" : "f") : ""}">${lsv(xx ? "x" : k)}</span>${xx ? "Recusado por você" : t}${at ? "<small>agora</small>" : ""}</div>`; }).join("")}</div><hr>
    ${l ? `${x.lideranca && linkDoLider(x.lideranca) && linkDoLider(x.lideranca) !== l ? `<button data-m="lid">${lsv("cop")}Copiar link de ${esc(x.lideranca)}</button>` : ""}<button data-m="cop">${lsv("cop")}Copiar link de ${esc(l.nome)}</button><button data-m="abr">${lsv("olh")}Abrir para acompanhar</button>` : ""}
    <button data-m="um">${lsv("lnk")}Gerar link só desta emenda</button>${!l && x.lideranca && !linkDoLider(x.lideranca) ? `<button data-m="nl">${lsv("lnk")}Gerar link de ${esc(x.lideranca)}</button>` : ""}`);
  m.querySelectorAll("[data-m]").forEach((y) => y.onclick = () => { const a = y.dataset.m; fechaLk();
    if (a === "lid") copiar(linkUrl(linkDoLider(x.lideranca))); if (a === "cop") copiar(linkUrl(l)); if (a === "abr") window.open(linkUrl(l), "_blank", "noopener");
    if (a === "um") novoLinkItem(T, x); if (a === "nl") novoLinkLider(T, x.lideranca); }); }
// aceitar: os campos da proposta vão para a emenda; recusar: só marca
async function decidir(id, aceita, T) { const p = LK.props.find((q) => q.id === id); if (!p) return; const x = AD.itens.find((y) => y.id === p.item_id); if (!x) return;
  try { if (aceita) { const g = regrasInd(T), t = p.benef_tipo || tipoDe(x) || "mun", ins = t === "ent" ? "Convênio" : "Transferência Especial", o = {};
      if (p.objeto) o.objeto = p.objeto; if (p.municipio) o.municipio = p.municipio;
      if (p.benef_tipo) { o.benef_tipo = t; o.modalidade = g.mods.includes(ins) ? ins : x.modalidade || null; }
      if (t === "ent") { if (p.beneficiario) { o.razao_social = p.beneficiario; o.beneficiario = p.beneficiario; } if (p.cnpj) o.cnpj = p.cnpj; }
      else if (p.benef_tipo === "mun" && (tipoDe(x) !== "mun" || !x.beneficiario || /^(Fundo Municipal de Saúde|Prefeitura Municipal) de /.test(x.beneficiario))) o.beneficiario = benefAuto("mun", { ...x, ...o }, g);
      if (p.justificativa) o.justificativa = x.justificativa && !x.justificativa.includes(p.justificativa) ? x.justificativa + "\n" + p.justificativa : p.justificativa;
      await gravar("gab_itens", { id: x.id, ...o }); }
    const st = aceita ? "aceito" : "recusado", { error } = await supabaseClient.from("gab_link_propostas").update({ status: st, decidido_em: new Date().toISOString(), decidido_por: SESS.user.id }).eq("id", p.id);
    if (error) throw error; Object.assign(p, { status: st }); desenharInd(); toastLk(aceita ? "Proposta aceita · emenda atualizada" : "Proposta recusada");
  } catch (e) { alert("Não foi possível: " + (e.message || e)); } }
// ---------- liga tudo depois de desenhar a planilha ----------
function ligarLinks(p, T) {
  if (T && T.L && SESS) lerLinks(T).then((mudou) => { if (mudou && IND.aberto && IND.tag === T.k) { const y = $("#indPg").scrollTop; desenharInd(); $("#indPg").scrollTop = y; } });
  p.querySelectorAll("[data-lkl]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); const l = LK.links.find((y) => y.id === b.dataset.lkl); if (l) menuLink(b, l, T); });
  p.querySelectorAll("[data-lknovo]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); novoLinkLider(T, b.dataset.lknovo); });
  const av = p.querySelector("[data-lkav]"); if (av) av.onclick = (e) => { e.stopPropagation(); novoLinkAvulso(T, av); };
  p.querySelectorAll("[data-lke]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); const x = AD.itens.find((y) => y.id === b.dataset.lke); if (x) legendaE(b, x, T); });
  p.querySelectorAll("[data-lkac]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); decidir(b.dataset.lkac, true, T); });
  p.querySelectorAll("[data-lkrec]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); decidir(b.dataset.lkrec, false, T); });
  p.querySelectorAll("[data-iobs]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); const x = AD.itens.find((y) => y.id === b.dataset.iobs); if (x) popObs(b, x, T); });
  const cl = p.querySelector("[data-icols]"); if (cl) cl.onclick = (e) => { e.stopPropagation(); menuCols(cl); };
  p.querySelectorAll("[data-iinfo]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); infoI(b, (IND.infos || {})[b.dataset.iinfo] || ""); });
}

// ---------- balão de Observações (20/11/2026): o mesmo do Controle de Recursos. As anotações começam aqui, ficam em
// gab_itens.observacao (caderneta: "dd/mm/aa - texto") e vão junto para o Controle quando a lista é fechada.
const OBS_IND = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2.5 3h11v8h-6l-3 2.5V11h-2z"/></svg>';
const notasInd = (x) => typeof caderneta === "function" ? caderneta(x) : String(x.observacao || "").split(/\n+/).filter(Boolean).map((t) => ({ d: "", t }));
function balaoInd(x) { const n = notasInd(x), ul = n[n.length - 1];
  return `<button class="iobs${n.length ? " tem" : ""}" data-iobs="${x.id}" title="${esc(ul ? ul.t : "Sem observação")}" aria-label="Observações">${OBS_IND}${n.length > 1 ? `<small>${n.length}</small>` : ""}</button>`; }
function popObs(b, x, T) { const fech = T.L && (T.L.regras || {}).fechada, hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const des = () => { const n = notasInd(x); return `<div class="h"><b>Observações · ${esc(x.municipio || "—")}</b>${x.chave_emenda ? "já levada ao Controle de Recursos; lá continuam as anotações" : "vão junto para o Controle de Recursos ao fechar a lista"}</div>
    <div class="iobl">${n.length ? n.map((k) => `<div><span>${esc(k.d || "—")}</span><p>${esc(k.t)}</p></div>`).join("") : `<div class="mut" style="padding:4px 10px 8px;font-size:12px">Nenhuma anotação ainda.</div>`}</div>
    ${fech ? "" : `<div class="iobn"><input class="iobd" value="${hoje}" aria-label="Data"><input class="iobt" placeholder="Nova anotação…"><button class="lkok" data-anota>Anotar</button></div>`}`; };
  const m = abreLk(b, des(), "lkm iobm"), liga = () => { const bt = m.querySelector("[data-anota]"); if (!bt) return; const it = m.querySelector(".iobt");
    const anota = async () => { const t = it.value.trim(), d = m.querySelector(".iobd").value.trim(); if (!t) return it.focus(); bt.disabled = true;
      try { const nx = await gravar("gab_itens", { id: x.id, observacao: (x.observacao ? x.observacao.replace(/\s+$/, "") + "\n\n" : "") + (d ? d + " - " : "") + t }); Object.assign(x, nx);
        m.innerHTML = des(); liga(); const nb = $(`#indPg [data-iobs="${x.id}"]`); if (nb) { nb.outerHTML = balaoInd(x); const b2 = $(`#indPg [data-iobs="${x.id}"]`); b2.classList.add("on"); b2.onclick = (e) => { e.stopPropagation(); popObs(b2, x, T); }; }
        m.querySelector(".iobt") && m.querySelector(".iobt").focus();
      } catch (e) { alert("Não foi possível salvar: " + (e.message || e)); bt.disabled = false; } };
    bt.onclick = anota; it.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); anota(); } }; setTimeout(() => it.focus(), 0); };
  liga(); }
