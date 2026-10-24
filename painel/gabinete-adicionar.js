// Gabinete · botão "Adicionar" do Controle de Recursos (24/10/2026, migração 74).
// Item = uma indicação avulsa no formulário padrão. Lista = várias indicações de uma mesma origem legal
// (ex.: "PL nº 452/2026" com apelido "LOA27"), com regras do ano (valor disponível, mínimo por item, número
// de itens, áreas, prazo). O modelo do setor de Orçamento é o mínimo obrigatório (vai na exportação);
// os campos do gabinete (liderança, contato, justificativa, prioridade, status, observação) ficam por cima.
// Usa os globais de gabinete.js ($, esc, ni, nf, fm, norm, S, E0, PARL, EST, BASE, agregado, SESS, LOCAL, desenhar).

const AREAS = [["14240", "Saúde", 48000, 48091], ["14227", "Educação", 45000, 45001], ["14203", "FUNDAM", 52000, 52090], ["15097", "Agricultura", 44000, 44001], ["15098", "Infraestrutura e Mobilidade", 53000, 53001], ["15100", "Segurança Pública", 16000, 16091]];
const MODS = ["Transferência Especial", "Convênio", "Execução Direta"];
const STATUS = ["Em análise", "Confirmado", "Enviado", "Descartado"];
const PRIOR = ["Alta", "Média", "Baixa"];
const MODELOS = {
  superavit26: { nome: "Superávit 2026 · Saúde", origem: "Superávit de arrecadação 2026 · Saúde", apelido: "Superávit 26", regras: { disp: 718997.79, min: 100000, max: 7, areas: ["Saúde"], prazo: "2026-10-28T18:00" } },
  loa: { nome: "Emendas impositivas · LOA", origem: "PL nº 452/2026 (LOA 2027)", apelido: "LOA27", regras: { disp: null, min: null, max: null, areas: AREAS.map((a) => a[1]), prazo: "" } },
  livre: { nome: "Livre", origem: "", apelido: "", regras: { disp: null, min: null, max: null, areas: AREAS.map((a) => a[1]), prazo: "" } },
};
const AD = { listas: [], itens: [], ok: false };

// ---------- dados: Supabase com sessão; sem sessão (computador local), guarda no navegador ----------
const nuvemAd = () => SESS && supabaseClient;
async function lerAdicionar() {
  if (nuvemAd()) { const [l, i] = await Promise.all([supabaseClient.from("gab_listas").select("*").order("criado_em"), supabaseClient.from("gab_itens").select("*").order("criado_em")]); AD.listas = l.data || []; AD.itens = i.data || []; }
  else { try { const x = JSON.parse(localStorage.getItem("gab_ad_local") || "{}"); AD.listas = x.listas || []; AD.itens = x.itens || []; } catch (e) {} }
  AD.ok = true;
}
const guardaLocal = () => { try { localStorage.setItem("gab_ad_local", JSON.stringify({ listas: AD.listas, itens: AD.itens })); } catch (e) {} };
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
async function gravar(tab, reg) {
  const col = tab === "gab_listas" ? AD.listas : AD.itens, agora = new Date().toISOString();
  if (nuvemAd()) {
    const q = reg.id ? supabaseClient.from(tab).update({ ...reg, atualizado_em: agora }).eq("id", reg.id) : supabaseClient.from(tab).insert(reg);
    const { data, error } = await q.select().single(); if (error) throw error; reg = data;
  } else { reg = { ...reg, id: reg.id || novoId(), atualizado_em: agora, criado_em: reg.criado_em || agora }; }
  const k = col.findIndex((x) => x.id === reg.id); k >= 0 ? (col[k] = reg) : col.push(reg); if (!nuvemAd()) guardaLocal(); return reg;
}
async function apagar(tab, id) {
  if (nuvemAd()) { const { error } = await supabaseClient.from(tab).delete().eq("id", id); if (error) throw error; }
  if (tab === "gab_listas") { AD.listas = AD.listas.filter((x) => x.id !== id); AD.itens = AD.itens.filter((x) => x.lista_id !== id); } else AD.itens = AD.itens.filter((x) => x.id !== id);
  if (!nuvemAd()) guardaLocal();
}

// ---------- referência da cidade: o que o mandato já mandou, votos 2022 e 2026, R$ por voto ----------
function refCidade(nome) {
  const i = BASE.mun.findIndex((m) => norm(m.n) === norm(nome)); if (i < 0) return null;
  const A = agregado(E0)[i] || { v: 0 }, v26 = (PARL.v || [])[i] || 0, v22 = (PARL.v22 || [])[i] || 0;
  return { i, rec: A.v || 0, v22, v26, rpv: v26 ? (A.v || 0) / v26 : null, el: BASE.mun[i].el };
}
const refTxt = (r) => r ? `${fm(r.rec)} · ${ni(r.v22)} → ${ni(r.v26)} votos${r.rpv ? ` · R$ ${nf(r.rpv, 0)}/voto` : ""}` : "";

// ---------- botão verde: só a entrada. As listas e os itens aparecem dentro de "Meu controle" ----------
function adicionarHtml() {
  if (!(PODE && proprio())) return "";
  return `<div class="adw"><button class="adbtn" id="adBtn">+ Adicionar</button><div class="admenu" id="adMenu" hidden><button data-ad="item"><b>Item</b><span>Uma indicação, no formulário padrão</span></button><button data-ad="lista"><b>Lista</b><span>Várias indicações de uma mesma origem: lei, PL, superávit</span></button></div></div>`;
}
// filtro "Lista" de Meu controle: a planilha importada, cada lista criada e os itens avulsos
const opsListas = () => [["", "Planilha do gabinete"], ...AD.listas.map((l) => [l.id, l.apelido || l.origem]), ...(AD.itens.some((x) => !x.lista_id) ? [["avulsos", "Itens avulsos"]] : [])];
function ligarAdicionar() {
  const b = $("#adBtn"); if (!b) return; const m = $("#adMenu");
  b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; }; document.addEventListener("click", () => { if (m) m.hidden = true; }, { once: true });
  m.onclick = (e) => { const o = e.target.closest("[data-ad]"); if (!o) return; m.hidden = true; o.dataset.ad === "item" ? formItem({ lista_id: S.lista && S.lista !== "avulsos" ? S.lista : null }) : formLista(); };
  const fl = $("#fLista"); if (fl) fl.onchange = (e) => { S.lista = e.target.value || null; desenhar(); };
  const p = $("#lpainel"); if (!p) return;
  p.querySelectorAll("[data-item]").forEach((r) => r.onclick = () => formItem(AD.itens.find((x) => x.id === r.dataset.item)));
  const on = (sel, fn) => { const x = p.querySelector(sel); if (x) x.onclick = fn; };
  const L = AD.listas.find((x) => x.id === S.lista);
  on("[data-novo]", () => formItem({ lista_id: L ? L.id : null }));
  on("[data-edlista]", () => formLista(L));
  on("[data-caderno]", () => imprimir(L, "caderno"));
  on("[data-relat]", () => imprimir(L, "relatorio"));
  on("[data-xlsx]", () => exportarOrcamento(L));
}
// ---------- painel de uma lista: números, alertas das regras, itens ----------
function checar(L, it) {
  const r = (L && L.regras) || {}, tot = it.reduce((s, x) => s + (+x.valor || 0), 0), al = [];
  if (r.disp && tot > r.disp + .005) al.push(`Passou do valor disponível em ${fm(tot - r.disp)}`);
  if (r.max && it.length > r.max) al.push(`${it.length} itens; o limite é ${r.max}`);
  if (r.min) it.filter((x) => (+x.valor || 0) < r.min).forEach((x) => al.push(`${x.municipio || "Item"}: abaixo do mínimo de ${fm(r.min)}`));
  if (r.areas && r.areas.length) it.filter((x) => x.area && !r.areas.includes(x.area)).forEach((x) => al.push(`${x.municipio || "Item"}: área ${x.area} não permitida nesta lista`));
  return { tot, al, saldo: r.disp ? r.disp - tot : null };
}
function painelLista() {
  const av = S.lista === "avulsos", L = av ? null : AD.listas.find((x) => x.id === S.lista); if (!av && !L) return "";
  const it = AD.itens.filter((x) => av ? !x.lista_id : x.lista_id === L.id), r = (L && L.regras) || {}, c = checar(L, it), pz = r.prazo ? new Date(r.prazo) : null;
  const resumo = av ? `${it.length} itens · ${fm(c.tot)}` : [`<b>${fm(c.tot)}</b>${r.disp ? ` de ${fm(r.disp)}` : ""}`, c.saldo != null ? `saldo <b${c.saldo < 0 ? ' style="color:var(--erro)"' : ""}>${fm(c.saldo)}</b>` : "", `<b>${it.length}</b>${r.max ? "/" + r.max : ""} itens`, r.min ? `mín. ${fm(r.min)}` : "", r.areas && r.areas.length < AREAS.length ? r.areas.join(", ") : "", pz ? `prazo ${pz.toLocaleDateString("pt-BR")} ${pz.toTimeString().slice(0, 5)}` : ""].filter(Boolean).join(" · ");
  return `<div id="lpainel"><div class="lres"><div><div class="olho">${av ? "Fora de lista" : esc(L.origem)}</div><div class="lnum">${resumo}</div></div>
    <div class="lpacs">${av ? "" : `<button class="btn sec" data-edlista>Regras</button><button class="btn sec" data-caderno>Caderno</button><button class="btn sec" data-relat>Relatório</button><button class="btn sec" data-xlsx>Exportar para o Orçamento</button>`}</div></div>
    ${c.al.length ? `<div class="lal">${c.al.map((x) => `<div>${esc(x)}</div>`).join("")}</div>` : ""}
    <section class="bx"><table class="tb mt lt"><thead><tr><th>Município</th><th>Objeto</th><th class="hm">Área · modalidade</th><th class="v">R$</th><th class="hm">A cidade no mandato</th><th>Status</th></tr></thead><tbody>
    ${it.map((x) => { const rf = refCidade(x.municipio || ""); return `<tr class="r" data-item="${x.id}"><td><b>${esc(x.municipio || "—")}</b><small>${esc(x.lideranca || "")}</small></td><td>${esc(frase(x.objeto || ""))}<small>${esc(x.beneficiario || x.razao_social || "")}</small></td><td class="hm">${esc(x.area || "")}<small>${esc(x.modalidade || "")}</small></td><td class="v">${fr(+x.valor || 0)}</td><td class="hm"><small style="color:var(--sec)">${esc(refTxt(rf))}</small></td><td><span class="etc" style="--c:${{ Confirmado: "#34E84A", Enviado: "#8FA8E8", Descartado: "#E8432A" }[x.status] || "#8A9096"}">${esc(x.status || "Em análise")}</span></td></tr>`; }).join("")}
    <tr class="r"><td colspan="6" data-novo style="color:var(--ter);cursor:pointer">+ Adicionar item${av ? "" : " a esta lista"}</td></tr></tbody></table></section></div>`;
}

// ---------- modal genérico ----------
function modal(html, ligar) {
  let m = $("#adModal"); if (!m) { m = document.createElement("div"); m.id = "adModal"; document.body.appendChild(m); }
  m.innerHTML = `<div class="mfundo"></div><div class="mcx">${html}</div>`; m.hidden = false; document.body.style.overflow = "hidden";
  const fechar = () => { m.hidden = true; document.body.style.overflow = ""; }; m.querySelector(".mfundo").onclick = fechar; m.querySelectorAll("[data-fecha]").forEach((b) => b.onclick = fechar);
  ligar(m, fechar);
}
const campo = (rot, html, larg) => `<label class="fc${larg ? " lg" : ""}"><span>${rot}</span>${html}</label>`;
const inp = (f, v, ph = "", tipo = "text") => `<input data-f="${f}" type="${tipo}" value="${esc(v ?? "")}" placeholder="${esc(ph)}">`;
const sel = (f, ops, v, vazio) => `<select data-f="${f}">${vazio ? `<option value="">${vazio}</option>` : ""}${ops.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
const lerCampos = (m) => { const o = {}; m.querySelectorAll("[data-f]").forEach((x) => { o[x.dataset.f] = x.value.trim() === "" ? null : x.value.trim(); }); return o; };

// ---------- formulário do item ----------
function formItem(x) {
  x = x || {}; const L = AD.listas.find((l) => l.id === x.lista_id), r = (L && L.regras) || {}, areas = r.areas && r.areas.length ? r.areas : AREAS.map((a) => a[1]);
  const muns = BASE.mun.map((m) => m.n).sort((a, b) => a.localeCompare(b, "pt-BR"));
  modal(`<div class="mh"><div><div class="olho">${L ? esc(L.apelido || L.origem) : "Item avulso"}</div><h3>${x.id ? "Editar indicação" : "Nova indicação"}</h3></div><button class="x" data-fecha>×</button></div>
    <div class="fsec"><div class="fst">Onde e o quê <em>vai para o Orçamento</em></div><div class="fg">
      ${campo("Município", `<input data-f="municipio" list="adMuns" value="${esc(x.municipio || "")}" placeholder="Digite o município"><datalist id="adMuns">${muns.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`)}
      ${campo("Valor (R$)", inp("valor", x.valor, r.min ? "mínimo " + ni(r.min) : "100000", "number"))}
      ${campo("Objeto", `<textarea data-f="objeto" rows="2" placeholder="O que será feito com o recurso">${esc(x.objeto || "")}</textarea>`, 1)}
      ${campo("Área", sel("area", areas, x.area || (areas.length === 1 ? areas[0] : ""), "Escolha"))}${campo("Modalidade", sel("modalidade", MODS, x.modalidade, "Escolha"))}
      ${campo("CNPJ da entidade <em>só convênio</em>", inp("cnpj", x.cnpj, "00.000.000/0000-00"))}${campo("Razão social", inp("razao_social", x.razao_social))}</div>
      <div class="refc" id="refc"></div></div>
    <div class="fsec"><div class="fst">Gabinete <em>só para você</em></div><div class="fg">
      ${campo("Liderança", inp("lideranca", x.lideranca, "Quem pediu"))}${campo("Contato", inp("contato", x.contato, "Telefone ou e-mail"))}
      ${campo("Beneficiário", inp("beneficiario", x.beneficiario, "Prefeitura, hospital, APAE…"))}${campo("Prioridade", sel("prioridade", PRIOR, x.prioridade, "—"))}
      ${campo("Status", sel("status", STATUS, x.status || "Em análise"))}${campo("Lista", `<select data-f="lista_id"><option value="">Avulso</option>${AD.listas.map((l) => `<option value="${l.id}"${l.id === x.lista_id ? " selected" : ""}>${esc(l.apelido || l.origem)}</option>`).join("")}</select>`)}
      ${campo("Justificativa", `<textarea data-f="justificativa" rows="2" placeholder="Por que esta indicação">${esc(x.justificativa || "")}</textarea>`, 1)}
      ${campo("Observação", `<textarea data-f="observacao" rows="2">${esc(x.observacao || "")}</textarea>`, 1)}</div></div>
    <div class="mrod">${x.id ? `<button class="btn sec" data-apaga style="color:var(--erro)">Excluir</button>` : ""}<span class="av" data-msg></span><button class="btn sec" data-fecha>Cancelar</button><button class="btn" data-salva>Salvar</button></div>`, (m, fechar) => {
    const ref = () => { const rf = refCidade(m.querySelector('[data-f="municipio"]').value); m.querySelector("#refc").innerHTML = rf ? `<div><span>Já indicado 2023-26</span><b>${fm(rf.rec)}</b></div><div><span>Votos 2022</span><b>${ni(rf.v22)}</b></div><div><span>Votos 2026</span><b>${ni(rf.v26)}</b></div><div><span>R$ por voto</span><b>${rf.rpv ? "R$ " + nf(rf.rpv, 0) : "—"}</b></div><div><span>Eleitores</span><b>${ni(rf.el)}</b></div>` : ""; };
    m.querySelector('[data-f="municipio"]').oninput = ref; ref();
    m.querySelector("[data-salva]").onclick = async () => { const o = lerCampos(m), msg = m.querySelector("[data-msg]");
      if (!o.municipio || !o.objeto || !o.valor) { msg.textContent = "Preencha município, objeto e valor."; return; }
      o.valor = +o.valor; msg.textContent = "Salvando…";
      try { await gravar("gab_itens", { ...(x.id ? { id: x.id } : {}), ...o }); fechar(); S.aba = "meu"; S.lista = o.lista_id || "avulsos"; desenhar(); } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); } };
    const ap = m.querySelector("[data-apaga]"); if (ap) ap.onclick = async () => { if (ap.dataset.ok !== "1") { ap.dataset.ok = "1"; ap.textContent = "Confirmar exclusão"; return; } await apagar("gab_itens", x.id); fechar(); desenhar(); };
  });
}

// ---------- formulário da lista (origem, apelido, regras) ----------
function formLista(L) {
  L = L || {}; const r = L.regras || {};
  modal(`<div class="mh"><div><div class="olho">Lista</div><h3>${L.id ? "Regras da lista" : "Nova lista"}</h3></div><button class="x" data-fecha>×</button></div>
    ${L.id ? "" : `<div class="fsec"><div class="fst">Partir de um modelo</div><div class="mods">${Object.entries(MODELOS).map(([k, md]) => `<button data-mod="${k}">${esc(md.nome)}</button>`).join("")}</div></div>`}
    <div class="fsec"><div class="fst">Origem</div><div class="fg">${campo("Origem legal", inp("origem", L.origem, "PL nº 452/2026"), 1)}${campo("Apelido", inp("apelido", L.apelido, "LOA27"))}${campo("Prazo de entrega", inp("prazo", r.prazo, "", "datetime-local"))}</div></div>
    <div class="fsec"><div class="fst">Regras <em>o crivo mínimo do Orçamento e as suas</em></div><div class="fg">${campo("Valor disponível (R$)", inp("disp", r.disp, "", "number"))}${campo("Mínimo por item (R$)", inp("min", r.min, "", "number"))}${campo("Máximo de itens", inp("max", r.max, "", "number"))}</div>
      <div class="ars">${AREAS.map(([, a]) => `<label><input type="checkbox" data-area value="${esc(a)}"${!r.areas || r.areas.includes(a) ? " checked" : ""}> ${esc(a)}</label>`).join("")}</div></div>
    <div class="mrod">${L.id ? `<button class="btn sec" data-apaga style="color:var(--erro)">Excluir lista</button>` : ""}<span class="av" data-msg></span><button class="btn sec" data-fecha>Cancelar</button><button class="btn" data-salva>Salvar</button></div>`, (m, fechar) => {
    m.querySelectorAll("[data-mod]").forEach((b) => b.onclick = () => { const md = MODELOS[b.dataset.mod], set = (f, v) => { const x = m.querySelector(`[data-f="${f}"]`); if (x) x.value = v ?? ""; };
      set("origem", md.origem); set("apelido", md.apelido); set("prazo", md.regras.prazo); set("disp", md.regras.disp); set("min", md.regras.min); set("max", md.regras.max);
      m.querySelectorAll("[data-area]").forEach((c) => { c.checked = md.regras.areas.includes(c.value); }); m.querySelectorAll("[data-mod]").forEach((x) => x.classList.toggle("on", x === b)); });
    m.querySelector("[data-salva]").onclick = async () => { const o = lerCampos(m), msg = m.querySelector("[data-msg]"); if (!o.origem) { msg.textContent = "Informe a origem legal."; return; }
      const regras = { disp: o.disp ? +o.disp : null, min: o.min ? +o.min : null, max: o.max ? +o.max : null, prazo: o.prazo || "", areas: [...m.querySelectorAll("[data-area]:checked")].map((c) => c.value) };
      msg.textContent = "Salvando…";
      try { const nl = await gravar("gab_listas", { ...(L.id ? { id: L.id } : {}), origem: o.origem, apelido: o.apelido, modelo: (m.querySelector("[data-mod].on") || {}).dataset?.mod || L.modelo || null, regras }); fechar(); S.aba = "meu"; S.lista = nl.id; desenhar(); } catch (er) { msg.textContent = "Não foi possível salvar: " + (er.message || er); } };
    const ap = m.querySelector("[data-apaga]"); if (ap) ap.onclick = async () => { if (ap.dataset.ok !== "1") { ap.dataset.ok = "1"; ap.textContent = "Confirmar: apaga a lista e os itens"; return; } await apagar("gab_listas", L.id); fechar(); S.lista = null; desenhar(); };
  });
}

// ---------- impressão: caderno para preencher à mão e relatório ----------
function imprimir(L, tipo) {
  const it = AD.itens.filter((x) => x.lista_id === L.id), r = L.regras || {}, c = checar(L, it), vazias = Math.max((r.max || 10) - it.length, tipo === "caderno" ? 3 : 0);
  const ord = BASE.mun.map((m, i) => ({ m, i, v: (PARL.v || [])[i] || 0 })).filter((o) => o.v).sort((a, b) => b.v - a.v).slice(0, 40);
  const linha = (x, k) => { const rf = x ? refCidade(x.municipio || "") : null; return `<tr><td>${k + 1}</td><td>${x ? esc(x.municipio || "") : ""}</td><td>${x ? esc(frase(x.objeto || "")) : ""}</td><td>${x ? esc(x.area || "") : ""}</td><td>${x ? esc(x.modalidade || "") : ""}</td><td class="n">${x ? fr(+x.valor || 0) : ""}</td><td>${x ? esc([x.cnpj, x.razao_social].filter(Boolean).join(" · ")) : ""}</td><td>${x ? esc(x.lideranca || "") : ""}</td>${tipo === "relatorio" ? `<td class="n">${rf ? fm(rf.rec) : ""}</td><td class="n">${rf ? ni(rf.v22) : ""}</td><td class="n">${rf ? ni(rf.v26) : ""}</td><td class="n">${rf && rf.rpv ? nf(rf.rpv, 0) : ""}</td>` : ""}</tr>`; };
  const ref = `<h2>Referência por município · onde estão os votos</h2><p>Os 40 municípios com mais votos em 2026. Já indicado = soma das emendas do mandato de 2023 a 2026.</p><table><tr><th>#</th><th>Município</th><th class="n">Já indicado</th><th class="n">Votos 2022</th><th class="n">Votos 2026</th><th class="n">R$ / voto</th></tr>${ord.map((o, k) => { const rf = refCidade(o.m.n); return `<tr><td>${k + 1}</td><td>${esc(o.m.n)}</td><td class="n">${fm(rf.rec)}</td><td class="n">${ni(rf.v22)}</td><td class="n">${ni(rf.v26)}</td><td class="n">${rf.rpv ? nf(rf.rpv, 0) : "—"}</td></tr>`; }).join("")}</table>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(L.apelido || L.origem)} · ${tipo === "caderno" ? "Caderno" : "Relatório"}</title><style>@page{size:A4 ${tipo === "relatorio" ? "landscape" : "portrait"};margin:12mm}body{font:10px/1.4 Inter,system-ui,sans-serif;color:#0B0D0E}h1{font-size:24px;margin:2px 0 4px;letter-spacing:-.03em}h2{font-size:14px;margin:18px 0 4px}p{color:#5A6067;margin:0 0 8px}.o{font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#6B7178}.k{display:flex;gap:22px;margin:10px 0}.k b{display:block;font-size:16px}.k span{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#6B7178}table{width:100%;border-collapse:collapse}th{font-size:7.5px;text-transform:uppercase;letter-spacing:.08em;color:#6B7178;text-align:left;border-bottom:1px solid #0B0D0E;padding:4px}td{border-bottom:.5px solid #C9CDD1;padding:${tipo === "caderno" ? "11px" : "5px"} 4px;vertical-align:top}.n{text-align:right;white-space:nowrap}.al{border:1px solid #E8432A;color:#A32D2D;padding:6px 8px;border-radius:6px;margin:6px 0}.pb{break-before:page}</style></head><body>
    <div class="o">${esc(PARL.u)} · ${esc(PARL.p)} · Gabinete</div><h1>${esc(L.apelido || L.origem)}</h1><p>${esc(L.origem)}${r.prazo ? ` · prazo ${new Date(r.prazo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
    <div class="k"><div><b>${r.disp ? fr(r.disp) : "—"}</b><span>valor disponível</span></div><div><b>${fr(c.tot)}</b><span>indicado</span></div><div><b>${c.saldo != null ? fr(c.saldo) : "—"}</b><span>saldo</span></div><div><b>${it.length}${r.max ? " de " + r.max : ""}</b><span>itens</span></div><div><b>${r.min ? fr(r.min) : "—"}</b><span>mínimo por item</span></div></div>
    ${r.areas && r.areas.length < AREAS.length ? `<p>Áreas permitidas: ${esc(r.areas.join(", "))}. Modalidades: ${MODS.join(", ")}.</p>` : ""}${c.al.map((a) => `<div class="al">${esc(a)}</div>`).join("")}
    <table><tr><th>#</th><th>Município</th><th>Objeto</th><th>Área</th><th>Modalidade</th><th class="n">Valor</th><th>Entidade (convênio)</th><th>Liderança</th>${tipo === "relatorio" ? '<th class="n">Já indicado</th><th class="n">Votos 22</th><th class="n">Votos 26</th><th class="n">R$/voto</th>' : ""}</tr>
    ${it.map(linha).join("")}${Array.from({ length: vazias }, (_, k) => linha(null, it.length + k)).join("")}</table>
    <div class="pb"></div>${ref}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
  const w = window.open("", "_blank"); if (!w) { alert("Libere as janelas pop-up para imprimir."); return; } w.document.write(html); w.document.close();
}

// ---------- exportação no modelo do setor de Orçamento (mesmas colunas da planilha oficial) ----------
async function exportarOrcamento(L) {
  if (!window.XLSX) await new Promise((ok, er) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = ok; s.onerror = er; document.head.appendChild(s); });
  const it = AD.itens.filter((x) => x.lista_id === L.id), r = L.regras || {}, c = checar(L, it);
  const rows = [[L.origem], [], ["Gabinete", "GAB DEP " + norm(PARL.u)], ["Valor disponível", r.disp || ""], ["Saldo", c.saldo != null ? c.saldo : ""], [],
    ["Emenda", "Objeto", "Subação deduzida", "Valor", "Modalidade", "Município", "Órgão", "Unidade orçamentária", "CNPJ", "Razão Social"],
    ...it.map((x, k) => { const a = AREAS.find((q) => q[1] === x.area) || []; return [k + 1, frase(x.objeto || ""), a[0] ? +a[0] : "", +x.valor || 0, x.modalidade || "", x.municipio || "", a[2] || "", a[3] || "", x.modalidade === "Convênio" ? x.cnpj || "" : "", x.modalidade === "Convênio" ? x.razao_social || "" : ""]; }),
    ["TOTAL", "", "", c.tot]];
  const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new(); ws["!cols"] = [8, 50, 14, 14, 22, 22, 10, 14, 20, 32].map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, "Emendas");
  XLSX.writeFile(wb, `${(L.apelido || "lista").replace(/[^\w-]+/g, "_")}-${norm(PARL.u).replace(/ /g, "_")}.xlsx`);
}
