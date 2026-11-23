// Indicação de recursos › LINK GESTOR (22/11/2026, migração 109). Um link por lista para uma pessoa de confiança ver e
// editar a lista inteira em gestor-lista.html?t=TOKEN (sem login). As mudanças chegam em gab_link_propostas (acao =
// alterar | incluir | excluir, campos em "dados") e o gabinete aceita ✓ ou recusa ✕ aqui: na linha da emenda (alterar
// e excluir) e no quadro "Revisar" (todas, inclusive as novas). Depende de gabinete-ind-links.js (LK, abreLk, copiar…).
const gestorUrl = (l) => new URL("gestor-lista.html?t=" + encodeURIComponent(l.token), location.href).href;
const G_COL = { municipio: "Município", objeto: "Objeto", area: "Área", natureza: "Despesa", valor: "Valor", lideranca: "Líder", contato: "Contato" };
const gPend = () => (LK.gprops || []).filter((p) => p.status === "enviado");
const gPendItem = (id) => gPend().find((p) => p.item_id === id);
const gVal = (k, v) => v == null || v === "" ? "(vazio)" : k === "valor" ? "R$ " + moeda(+v) : String(v);
// cota da lista gravada no link (a página pública não tem as regras da planilha); atualiza quando muda
const gCota = (T) => { const g = regrasInd(T); return { disp: g.disp || null, max: g.max || null, saude: g.saude || null }; };
async function gSincCota(T) { const l = LK.gestor; if (!l || !EDITA()) return; const c = gCota(T); if (JSON.stringify(c) === JSON.stringify(l.cota || {})) return;
  const { error } = await supabaseClient.from("gab_links").update({ cota: c }).eq("id", l.id); if (!error) l.cota = c; }
// ---------- seção no quadro Links ----------
function secaoGestor(T) { const l = LK.gestor, n = gPend().length;
  if (!l) return `<div class="lkst">Link Gestor</div><div class="lks"><button class="lkc nw" data-gnovo>+ Link Gestor · editar a lista inteira</button></div>`;
  const st = encerrado(l) ? "fechado" : l.enviado_em ? "enviou " + fmtP(l.enviado_em) : l.aberto_em ? "aberto " + l.acessos + "×" : "ainda não aberto";
  return `<div class="lkst">Link Gestor</div><div class="lks"><button class="lkc" data-gmenu>${lsv("lnk")}${esc(l.nome)}<small>${st}${n ? ` · <b>${n} para revisar</b>` : ""}</small></button></div>`; }
async function novoGestor(T) { const n = prompt("Nome de quem vai receber o Link Gestor (vê e edita a lista inteira):", ""); if (!n || !n.trim()) return;
  try { exigeEditar(); const { data, error } = await supabaseClient.from("gab_links").insert({ parlamentar: PARL.n, lista_id: T.L.id, nome: n.trim(), lideranca: null, itens: [], tipo: "gestor", cota: gCota(T),
      prazo: prazoPadrao(T), titulo: `Gabinete do dep. ${PARL.u || PARL.n} · Emendas ${T.nome}` }).select().single();
    if (error) throw error; LK.gestor = data; await copiar(gestorUrl(data), "Link Gestor gerado · link copiado"); desenharInd(); }
  catch (e) { alert("Não foi possível gerar o Link Gestor: " + (e.message || e)); } }
function menuGestor(b, T) { const l = LK.gestor; if (!l) return; const n = gPend().length;
  const m = abreLk(b, `<div class="h"><b>Link Gestor · ${esc(l.nome)}</b>vê e edita a lista inteira; nada muda sem você aceitar<br>${encerrado(l) ? "link fechado" : "fecha em " + fmtP(l.prazo)}${l.aberto_em ? ` · aberto ${l.acessos}×` : " · ainda não aberto"}</div>
    ${n ? `<button data-g="rev">${lsv("chk")}Revisar ${n} ${n === 1 ? "mudança" : "mudanças"}</button><hr>` : ""}
    <button data-g="cop">${lsv("lnk")}Copiar o link</button><button data-g="wpp">${lsv("wpp")}Enviar pelo WhatsApp</button><button data-g="abr">${lsv("olh")}Abrir para acompanhar</button><hr>
    <button data-g="prz">${lsv("rel")}Mudar o prazo</button><button data-g="fec">${lsv("cad")}${l.fechado ? "Reabrir o link" : "Fechar o link agora"}</button><button data-g="apg">${lsv("x")}Apagar o link</button>`, "lkm");
  const up = async (o) => { const { error } = await supabaseClient.from("gab_links").update(o).eq("id", l.id); if (error) throw error; Object.assign(l, o); };
  m.querySelectorAll("[data-g]").forEach((x) => x.onclick = async () => { const a = x.dataset.g; fechaLk();
    try { if (a === "rev") revisarGestor(T);
      if (a === "cop") await copiar(gestorUrl(l));
      if (a === "wpp") window.open("https://wa.me/?text=" + encodeURIComponent(`Olá, ${l.nome}. Segue o link da lista de emendas ${T.nome} para você revisar e ajustar. As mudanças chegam para o gabinete validar.\n\n${gestorUrl(l)}`), "_blank", "noopener");
      if (a === "abr") window.open(gestorUrl(l), "_blank", "noopener");
      if (a === "prz") { const d = new Date(l.prazo), ini = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        const v = prompt("Novo prazo (dia/mês/ano hora:min):", ini); if (!v) return; const k = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/); if (!k) return alert("Use o formato 23/11/2026 13:00.");
        await up({ prazo: new Date(+k[3], +k[2] - 1, +k[1], +k[4], +k[5]).toISOString(), fechado: false }); desenharInd(); }
      if (a === "fec") { await up({ fechado: !l.fechado }); desenharInd(); toastLk(l.fechado ? "Link Gestor fechado" : "Link Gestor reaberto"); }
      if (a === "apg") { if (!(await confirmaVX("Apagar o Link Gestor?", `O link de ${l.nome} deixa de funcionar${n ? ` e as ${n} mudanças ainda não revisadas são descartadas` : ""}.`))) return;
        const { error } = await supabaseClient.from("gab_links").delete().eq("id", l.id); if (error) throw error; LK.gestor = null; LK.gprops = []; desenharInd(); }
    } catch (e) { alert("Não foi possível: " + (e.message || e)); } }); }
// ---------- na planilha: aviso no topo e proposta na linha da emenda ----------
function faixaGestor(T) { if (!T || !T.L || !LK.gestor || LK.lista !== T.L.id) return ""; const P = gPend(); if (!P.length) return "";
  const c = (a) => P.filter((p) => p.acao === a).length, t = [[c("alterar"), "alterada", "alteradas"], [c("incluir"), "nova", "novas"], [c("excluir"), "para excluir", "para excluir"]].filter((q) => q[0]).map((q) => `${q[0]} ${q[0] > 1 ? q[2] : q[1]}`).join(" · ");
  return `<div class="gfx"><span>${lsv("lnk")}<b>Link Gestor · ${esc(LK.gestor.nome)}</b> enviou ${P.length} ${P.length === 1 ? "mudança" : "mudanças"}: ${t}</span><button data-grev>Revisar</button></div>`; }
function difGestor(p, x) { const d = p.dados || {}, a = p.antes || (x ? { municipio: x.municipio, objeto: x.objeto, area: x.area, natureza: x.natureza, valor: x.valor, lideranca: x.lideranca, contato: x.contato } : {});
  if (p.acao === "excluir") return "<b>excluir esta emenda</b>";
  if (p.acao === "incluir") return Object.keys(G_COL).filter((k) => d[k] != null).map((k) => `${G_COL[k].toLowerCase()}: <b>${esc(gVal(k, d[k]))}</b>`).join(" · ");
  const L = Object.keys(d).filter((k) => G_COL[k] && String(d[k] ?? "") !== String(a[k] ?? "")).map((k) => `${G_COL[k].toLowerCase()}: <s>${esc(gVal(k, a[k]))}</s> → <b>${esc(gVal(k, d[k]))}</b>`);
  return L.join(" · ") || "<b>mantém o que está</b>"; }
function celGestor(x, fech) { if (!x || !LK.gestor) return ""; const p = gPendItem(x.id); if (!p) return "";
  return `<div class="lkp gst"><span class="gtg ${p.acao}">${p.acao === "excluir" ? "excluir" : "alterada"}</span> Link Gestor: ${difGestor(p, x)}${fech ? `<small>Reabra a lista para aceitar.</small>` : `<span class="lkvx"><button data-grec="${p.id}" title="Recusar" aria-label="Recusar">${lsv("x")}</button><button class="v" data-gac="${p.id}" title="Aceitar" aria-label="Aceitar">${lsv("chk")}</button></span>`}</div>`; }
// ---------- decidir ----------
const gCampos = (d) => { const o = {}; Object.keys(G_COL).forEach((k) => { if (k in (d || {})) o[k] = k === "valor" ? (d[k] == null ? null : +d[k]) : d[k]; }); return o; };
async function decidirGestor(id, aceita, T, quieto) { const p = (LK.gprops || []).find((q) => q.id === id); if (!p || p.status !== "enviado") return false;
  if ((T.L.regras || {}).fechada) { alert("A lista está fechada. Reabra a lista para aceitar ou recusar."); return false; }
  const marca = async (o) => { const { error } = await supabaseClient.from("gab_link_propostas").update({ status: aceita ? "aceito" : "recusado", decidido_em: new Date().toISOString(), decidido_por: SESS.user.id, ...o }).eq("id", p.id); if (error) throw error; Object.assign(p, { status: aceita ? "aceito" : "recusado" }, o); };
  try { if (!aceita) await marca({});
    else if (p.acao === "alterar") { if (!AD.itens.find((y) => y.id === p.item_id)) throw new Error("a emenda não existe mais"); await gravar("gab_itens", { id: p.item_id, ...gCampos(p.dados) }); await marca({}); }
    else if (p.acao === "incluir") { const n = await gravar("gab_itens", { lista_id: T.L.id, ...gCampos(p.dados) }); await marca({ item_id: n.id }); }
    else if (p.acao === "excluir") { const id2 = p.item_id; await marca({ item_id: null }); if (AD.itens.find((y) => y.id === id2)) await apagar("gab_itens", id2); }
    if (!quieto) { desenharInd(); toastLk(aceita ? "Mudança aceita · lista atualizada" : "Mudança recusada"); } return true;
  } catch (e) { alert("Não foi possível: " + (e.message || e)); return false; } }
// quadro "Revisar": todas as mudanças enviadas, com ✓ ✕ por linha e aceitar/recusar todas
function revisarGestor(T) { document.getElementById("gRev")?.remove(); const P = gPend(); if (!P.length) return toastLk("Nada para revisar");
  const fech = !!(T.L.regras || {}).fechada, nome = (p) => { const x = AD.itens.find((y) => y.id === p.item_id), d = p.dados || {}; return p.acao === "incluir" ? `${esc(d.municipio || "sem município")}` : x ? esc(x.municipio || "—") + `<small>${esc(String(x.objeto || "").slice(0, 90))}</small>` : "emenda"; };
  const w = document.createElement("div"); w.id = "gRev"; w.className = "grv";
  w.innerHTML = `<div class="grb"><div class="grh"><b>Mudanças do Link Gestor</b><span>${esc(LK.gestor.nome)} · ${P.length} para revisar · nada muda na lista até você aceitar</span><button class="grx" data-gx title="Fechar">${lsv("x")}</button></div>
    <div class="grl">${P.map((p) => `<div class="grr" data-gp="${p.id}"><span class="gtg ${p.acao}">${p.acao === "incluir" ? "nova" : p.acao === "excluir" ? "excluir" : "alterada"}</span><div class="grm"><b>${nome(p)}</b><div>${difGestor(p, AD.itens.find((y) => y.id === p.item_id))}</div></div>
      ${fech ? "" : `<span class="lkvx"><button data-grec="${p.id}" title="Recusar">${lsv("x")}</button><button class="v" data-gac="${p.id}" title="Aceitar">${lsv("chk")}</button></span>`}</div>`).join("")}</div>
    <div class="grf">${fech ? `<span>A lista está fechada: reabra para aceitar ou recusar.</span>` : `<button class="lk0" data-gtodas="0">Recusar todas</button><button class="lkok" data-gtodas="1">Aceitar todas</button>`}</div></div>`;
  document.body.appendChild(w);
  const fecha = () => { w.remove(); document.removeEventListener("keydown", tecla); }, tecla = (e) => { if (e.key === "Escape") fecha(); };
  document.addEventListener("keydown", tecla); w.onclick = (e) => { if (e.target === w) fecha(); }; w.querySelector("[data-gx]").onclick = fecha;
  const tira = (id) => { w.querySelector(`[data-gp="${id}"]`)?.remove(); if (!w.querySelector(".grr")) fecha(); };
  w.querySelectorAll("[data-gac],[data-grec]").forEach((b) => b.onclick = async () => { const id = b.dataset.gac || b.dataset.grec; b.disabled = true; if (await decidirGestor(id, !!b.dataset.gac, T, true)) { tira(id); desenharInd(); } else b.disabled = false; });
  w.querySelectorAll("[data-gtodas]").forEach((b) => b.onclick = async () => { const ac = b.dataset.gtodas === "1", L = gPend();
    if (!(await confirmaVX(ac ? "Aceitar todas as mudanças?" : "Recusar todas as mudanças?", ac ? `${L.length} ${L.length === 1 ? "mudança entra" : "mudanças entram"} na lista agora.` : `${L.length} ${L.length === 1 ? "mudança é descartada" : "mudanças são descartadas"}.`))) return;
    for (const p of L) { if (!(await decidirGestor(p.id, ac, T, true))) break; tira(p.id); } desenharInd(); toastLk(ac ? "Mudanças aceitas · lista atualizada" : "Mudanças recusadas"); }); }
function ligarGestor(p, T) {
  p.querySelectorAll("[data-gac]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); decidirGestor(b.dataset.gac, true, T); });
  p.querySelectorAll("[data-grec]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); decidirGestor(b.dataset.grec, false, T); });
  const r = p.querySelector("[data-grev]"); if (r) r.onclick = (e) => { e.stopPropagation(); revisarGestor(T); };
  if (T && T.L && LK.gestor && LK.lista === T.L.id) gSincCota(T).catch(() => {}); }
