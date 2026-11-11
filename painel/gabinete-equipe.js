// Equipe do gabinete (11/11/2026, migração 100). Usa os globais de gabinete.js (PARL, PAPEL, ADM, MEUS, SESS, LOCAL,
// VINC, esc, modal, desenhar) e o supabaseClient. Papéis: responsavel (aprova, convida, remove, nomeia outro
// Responsável), editor (vê e altera o privado), leitor (só vê; Indicar não). O admin do site vale como Responsável.
// Quem já está ativo num gabinete e pede outro precisa também da autorização de um Responsável do gabinete atual.
let EQ = { lista: [], autoriz: [], nomes: {} };
const EQ_PAPEL = { responsavel: "Responsável", editor: "Editor", leitor: "Leitor" };
const EQ_DESC = { responsavel: "vê e altera tudo; aprova, muda papéis e remove pessoas", editor: "vê e altera Controle, Cotas, Contatos, RH e Indicar", leitor: "só consulta Controle, Cotas, Contatos e RH" };
const eqGere = () => PAPEL === "responsavel";
const eqMeuPedido = () => (MEUS || []).find((x) => x.parlamentar === PARL.n && x.status === "pedido");
const eqData = (s) => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " às") : "";

async function lerEquipe() {
  if (!SESS || !PARL) return;
  const [l, a] = await Promise.all([supabaseClient.rpc("gab_equipe_lista", { p: PARL.n }), supabaseClient.rpc("gab_autorizacoes_pendentes")]);
  EQ.lista = l.data || []; EQ.autoriz = a.data || []; EQ.nomes = {}; EQ.lista.forEach((x) => { EQ.nomes[x.perfil_id] = x.nome; });
}
// faixa no alto da capa: papel, botão Equipe, pedidos pendentes, outros gabinetes da conta
function equipeFaixa() {
  if (!SESS) return "";
  const ped = EQ.lista.filter((x) => x.status === "pedido").length + (EQ.autoriz || []).length, ativos = EQ.lista.filter((x) => x.status === "ativo").length;
  const outros = (MEUS || []).filter((x) => x.status === "ativo" && x.parlamentar !== PARL.n);
  let txt;
  if (PAPEL) txt = `<span class="geqp">${ADM && !EQ.lista.some((x) => x.perfil_id === SESS.user.id && x.status === "ativo") ? "Administração do site" : `Você é <b>${EQ_PAPEL[PAPEL]}</b> nesta equipe`}</span><button class="geqb" data-eq>Equipe · ${ativos}${ped && eqGere() ? `<em>${ped}</em>` : ""}</button>`;
  else { const mp = eqMeuPedido(); txt = mp ? `<span class="geqp">Pedido enviado${mp.ok_origem === false ? " · aguardando o Responsável deste gabinete e a autorização do seu gabinete atual" : " · aguardando o Responsável"}</span><button class="geqb sec" data-eq>Ver pedido</button>` : `<span class="geqp">Você vê as funções públicas deste gabinete.</span><button class="geqb" data-eq>Pedir para entrar na equipe</button>`; }
  return `<div class="geq">${txt}${outros.length ? `<span class="geqo">Seus outros gabinetes: ${outros.map((x) => `<a href="#" data-irgab="${esc(x.parlamentar)}">${esc(x.parlamentar_nome || x.parlamentar)}</a>`).join(" · ")}</span>` : ""}</div>`;
}
// liga os cliques da faixa (chamado depois de cada desenho da capa)
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-eq]")) { e.preventDefault(); abrirEquipe(); return; }
  const g = e.target.closest("[data-irgab]"); if (!g) return; e.preventDefault();
  try { const { error } = await supabaseClient.from("gab_vinculo").upsert({ dono: SESS.user.id, parlamentar: g.dataset.irgab, atualizado_em: new Date().toISOString() }); if (error) throw error; location.href = "gabinete.html"; } catch (er) { alert("Não foi possível trocar de gabinete: " + (er.message || er)); }
});
// "Alterado por Fulano em 11/11/2026 às 14:05" no detalhe de um item do Controle
function quemAlterou(r) {
  if (!r || !r.atualizado_por) return "";
  const n = EQ.nomes[r.atualizado_por] || (SESS && r.atualizado_por === SESS.user.id ? "você" : "alguém da equipe");
  return `<div class="dfx eqalt">Alterado por <b>${esc(n)}</b>${r.atualizado_em ? " em " + esc(eqData(r.atualizado_em)) : ""}</div>`;
}

function abrirEquipe() {
  const nomeG = PARL.u, mp = eqMeuPedido();
  const selPapel = (v, attr, comResp) => `<select ${attr}>${["leitor", "editor", ...(comResp ? ["responsavel"] : [])].map((k) => `<option value="${k}"${k === v ? " selected" : ""}>${EQ_PAPEL[k]}</option>`).join("")}</select>`;
  const corpo = () => {
    const P = EQ.lista.filter((x) => x.status === "pedido"), A = EQ.lista.filter((x) => x.status === "ativo"), eu = SESS.user.id;
    let h = "";
    if (!PAPEL && !mp) h += `<div class="eqsec"><h4>Pedir para entrar</h4><p class="eqtx">O Responsável deste gabinete recebe o pedido no sino e decide o seu papel. Se você já está noutra equipe, o Responsável de lá também precisa autorizar.</p>
      <div class="eqpap">${["leitor", "editor"].map((k, i) => `<label><input type="radio" name="eqp" value="${k}"${i ? "" : " checked"}><b>${EQ_PAPEL[k]}</b><small>${EQ_DESC[k]}</small></label>`).join("")}</div><button class="btn" data-pedir>Enviar pedido</button></div>`;
    if (!PAPEL && mp) h += `<div class="eqsec"><h4>Seu pedido</h4><p class="eqtx">Enviado para entrar como <b>${EQ_PAPEL[mp.papel]}</b>.${mp.ok_origem === false ? " Falta também a autorização do Responsável do seu gabinete atual." : ""} Você recebe um aviso no sino quando for decidido.</p><button class="btn sec" data-cancelar="${esc(mp.id)}">Cancelar o pedido</button></div>`;
    if (eqGere() && P.length) h += `<div class="eqsec"><h4>Pedidos aguardando · ${P.length}</h4>${P.map((x) => `<div class="eqln" data-id="${esc(x.id)}"><span class="eqn">${esc(x.nome)}<small>pediu ${EQ_PAPEL[x.papel]} · ${esc(eqData(x.criado_em))}${x.ok_origem === false ? " · aguardando a autorização do gabinete atual da pessoa" : ""}</small></span>${selPapel(x.papel, "data-pp", true)}<button class="btn" data-aprova${x.ok_origem === false && !ADM ? " disabled" : ""}>Aprovar</button><button class="btn sec" data-recusa>Recusar</button></div>`).join("")}</div>`;
    if ((EQ.autoriz || []).length) h += `<div class="eqsec"><h4>Autorizar outro gabinete · ${EQ.autoriz.length}</h4><p class="eqtx">Pessoas da sua equipe que pediram para entrar também em outro gabinete.</p>${EQ.autoriz.map((x) => `<div class="eqln" data-id="${esc(x.id)}"><span class="eqn">${esc(x.nome)}<small>quer entrar no gabinete de ${esc(x.parlamentar_nome || x.parlamentar)} como ${EQ_PAPEL[x.papel]}</small></span><button class="btn" data-autoriza>Autorizar</button><button class="btn sec" data-nega>Não autorizar</button></div>`).join("")}</div>`;
    if (PAPEL) h += `<div class="eqsec"><h4>Equipe · ${A.length}</h4>${A.length ? A.map((x) => `<div class="eqln" data-id="${esc(x.id)}"><span class="eqn">${esc(x.nome)}${x.perfil_id === eu ? " <small class='eqeu'>você</small>" : ""}<small>${EQ_PAPEL[x.papel]} · desde ${esc(eqData(x.decidido_em || x.criado_em).split(" às")[0])}</small></span>${eqGere() ? selPapel(x.papel, "data-muda", true) + `<button class="btn sec" data-remove>${x.perfil_id === eu ? "Sair" : "Remover"}</button>` : x.perfil_id === eu ? `<button class="btn sec" data-remove>Sair da equipe</button>` : `<span class="eqpl">${EQ_PAPEL[x.papel]}</span>`}</div>`).join("") : `<p class="eqtx">Ainda não há ninguém na equipe. A administração do site libera o primeiro Responsável.</p>`}</div>`;
    h += `<div class="eqleg">${Object.keys(EQ_PAPEL).map((k) => `<span><b>${EQ_PAPEL[k]}</b> ${EQ_DESC[k]}</span>`).join("")}</div>`;
    return h;
  };
  modal(`<div class="mh"><div><div class="olho">Gabinete</div><h3>Equipe · ${esc(nomeG)}</h3></div><button class="x" data-fecha>×</button></div><div class="eqbox" data-eqbox>${corpo()}</div><div class="mrod"><span class="av" data-msg></span><button class="btn sec" data-fecha>Fechar</button></div>`, (m) => {
    const msg = m.querySelector("[data-msg]"), box = m.querySelector("[data-eqbox]");
    const roda = async (fn, ok, recarrega) => { msg.textContent = "Salvando…"; try { const { error } = await fn(); if (error) throw error; if (recarrega) { location.reload(); return; } const mg = await supabaseClient.rpc("gab_meus_gabinetes"); MEUS = mg.data || []; await lerEquipe(); box.innerHTML = corpo(); msg.textContent = ok; desenhar(); } catch (er) { msg.textContent = "Não foi possível: " + (er.message || er); } };
    box.onclick = (e) => {
      const ln = e.target.closest("[data-id]"), id = ln && ln.dataset.id;
      if (e.target.closest("[data-pedir]")) { const pp = (box.querySelector("input[name=eqp]:checked") || {}).value || "leitor"; roda(() => supabaseClient.rpc("gab_pedir_entrada", { p_parlamentar: PARL.n, p_papel: pp, p_nome: PARL.u }), "Pedido enviado."); }
      else if (e.target.closest("[data-cancelar]")) roda(() => supabaseClient.rpc("gab_remover", { p_id: e.target.closest("[data-cancelar]").dataset.cancelar }), "Pedido cancelado.");
      else if (e.target.closest("[data-aprova]")) roda(() => supabaseClient.rpc("gab_decidir_pedido", { p_id: id, p_aprovar: true, p_papel: ln.querySelector("[data-pp]").value }), "Pedido aprovado.");
      else if (e.target.closest("[data-recusa]")) roda(() => supabaseClient.rpc("gab_decidir_pedido", { p_id: id, p_aprovar: false }), "Pedido recusado.");
      else if (e.target.closest("[data-autoriza]")) roda(() => supabaseClient.rpc("gab_autorizar_origem", { p_id: id, p_aprovar: true }), "Autorizado.");
      else if (e.target.closest("[data-nega]")) roda(() => supabaseClient.rpc("gab_autorizar_origem", { p_id: id, p_aprovar: false }), "Não autorizado.");
      else if (e.target.closest("[data-remove]")) { const b = e.target.closest("[data-remove]"); if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmar"; return; } roda(() => supabaseClient.rpc("gab_remover", { p_id: id }), "Feito.", !!ln.querySelector(".eqeu")); }
    };
    box.onchange = (e) => { const s = e.target.closest("[data-muda]"); if (!s) return; const id = s.closest("[data-id]").dataset.id; roda(() => supabaseClient.rpc("gab_mudar_papel", { p_id: id, p_papel: s.value }), "Papel alterado."); };
  });
}
