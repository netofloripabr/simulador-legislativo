// Corrida da Mesa — versão funcional (08/10/2026). Ver cabeçalho do mesa.html.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ni = (x) => Math.round(x || 0).toLocaleString("pt-BR");
const fm = (v) => !v ? "R$ 0" : v < 1e6 ? `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CORES = ["#34E84A", "#5A86FF", "#FFA23E", "#E85AD0", "#2ED3F0"];
const MAIORIA = 21, MESA = ["Presidente", "1º Vice-Presidente", "2º Vice-Presidente", "1º Secretário", "2º Secretário", "3º Secretário", "4º Secretário"];
const COM9 = /constitui|financas|trabalho|etica/;
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
const img = (d, cls = "av", st = "") => `<img class="${cls}" src="${foto(d.n)}" alt="" style="${st}">`;
const hole = () => `<span class="ho">+</span>`;
let ORDEM_CH = null, ORDEM_BLOCO = null, DEP = [], COMS = [], EST = {}, S, UID = null, CEN_ID = null, salvarT;

// ---------------- dados e acesso ----------------
async function iniciar() {
  const app = $("#app");
  if (!supabaseClient) { app.innerHTML = `<div class="bloq"><h1>Sem conexão.</h1><p>Não foi possível carregar o acesso. Tente de novo.</p></div>`; return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { app.innerHTML = `<div class="bloq"><h1>Corrida da <i>Mesa.</i></h1><p style="color:#A9AEB3">Entre na sua conta para acessar o jogo.</p><a href="../?entrar=1" onclick="try{localStorage.setItem('sl_volta',location.href)}catch(e){}">Entrar</a></div>`; return; }
  UID = session.user.id;
  const { data: pode } = await supabaseClient.rpc("pode_acessar_mesa");
  if (!pode) { app.innerHTML = `<div class="bloq"><h1>Corrida da <i>Mesa.</i></h1><p style="color:#A9AEB3">O acesso à Corrida da Mesa é liberado pelo administrador. Peça a liberação informando o e-mail da sua conta.</p><a href="./">Voltar ao painel</a></div>`; return; }
  const { data: admin } = await supabaseClient.rpc("sou_admin");
  const [d, e, a] = await Promise.all([fetch("../dados/painel/sc-estadual.json?v=20261008a").then((r) => r.json()), fetch("../dados/painel/mesa-estruturas.json?v=2").then((r) => r.json()), fetch("../dados/painel/alesc-estrutura.json").then((r) => r.json())]);
  DEP = d.c.filter((c) => /^eleito/i.test(c.s || "")).sort((x, y) => y.t - x.t).map((c) => ({ n: c.n, u: c.u, p: c.p, t: c.t }));
  COMS = a.comissoes.map((x) => x.nome.replace(/^Comissão (de |dos |da |do )?/, (m) => m.replace("Comissão ", "")).replace(/^de /, ""));
  COMS = a.comissoes.map((x) => { const t = x.nome.replace(/^Comissão /, "").replace(/^(de|dos|das|da|do) /, ""); return t[0].toUpperCase() + t.slice(1); });
  EST = e;
  const { data: cen } = await supabaseClient.from("mesa_cenarios").select("id,dados").eq("perfil_id", UID).order("atualizado_em", { ascending: false }).limit(1);
  if (cen && cen[0] && cen[0].dados && cen[0].dados.chapas) { CEN_ID = cen[0].id; S = cen[0].dados; }
  else { try { S = JSON.parse(localStorage.getItem("sl_mesa2")); } catch (er) {} }
  if (!S || !S.chapas) S = novoCenario();
  // nomes antigos de comissão ("dos Direitos…") → nome atual; descarta presidências órfãs
  const chaveCom = (k) => COMS.find((c) => norm(c) === norm(k.replace(/^(de|dos|das|da|do) /i, ""))) || null;
  for (const c of S.chapas) for (const campo of ["com", "pres"]) { const o = c[campo] || {}, n = {}; for (const [k, v] of Object.entries(o)) { const k2 = chaveCom(k); if (k2 && !(k2 in n && campo === "com" && (n[k2] || []).some(Boolean))) n[k2] = v; } c[campo] = n; }
  for (const c of S.chapas) delete (c.out || {})["Diretoria de Gestao de Pessoas - Sem Lotacao"];
  for (const c of S.chapas) for (const [k, n] of Object.entries(c.pres)) if (!(c.com[k] || []).includes(n)) delete c.pres[k];
  S.ui = { aba: S.chapas[0].id, comAb: null, estAb: null, mais: {}, pat: { col: "v", dir: -1 }, patAb: null, gav: true, qAb: false, selB: null };
  desenhar(!!admin);
}
function novoCenario() {
  return { chapas: [{ id: "c1", cor: CORES[0], mesa: {}, out: {}, com: {}, pres: {} }], dep: {}, blocos: [...new Set(DEP.map((d) => d.p))].map((p) => [p]), reserva: null };
}
function salvar() {
  try { localStorage.setItem("sl_mesa2", JSON.stringify({ ...S, ui: undefined })); } catch (e) {}
  clearTimeout(salvarT); $("#salvo").textContent = "salvando…";
  salvarT = setTimeout(async () => {
    const dados = { ...S, ui: undefined };
    if (CEN_ID) await supabaseClient.from("mesa_cenarios").update({ dados, atualizado_em: new Date().toISOString() }).eq("id", CEN_ID);
    else { const { data } = await supabaseClient.from("mesa_cenarios").insert({ perfil_id: UID, dados }).select("id").single(); if (data) CEN_ID = data.id; }
    $("#salvo").textContent = "salvo";
  }, 800);
}

// ---------------- consultas ----------------
const dep = (n) => DEP.find((d) => d.n === n);
const chapa = (id) => S.chapas.find((c) => c.id === id);
const chDe = (n) => S.dep[n] && S.dep[n].ch;
const membros = (ch) => DEP.filter((d) => chDe(d.n) === ch.id);
const votos = (ch) => membros(ch).filter((d) => !S.dep[d.n].duv).length;
const presDe = (ch) => ch.mesa["Presidente"] ? dep(ch.mesa["Presidente"]) : null;
const nomeCh = (ch) => { const p = presDe(ch); return p ? `Chapa ${p.u}` : `Chapa ${S.chapas.indexOf(ch) + 1}`; };
const naMesa = (ch, n) => Object.values(ch.mesa).includes(n);
const blocoDe = (p) => S.blocos.find((b) => b.includes(p));
const nB = (b) => b.reduce((s, p) => s + DEP.filter((d) => d.p === p).length, 0);
const AC = { Relacoes: "Relações", Camaras: "Câmaras", Familia: "Família", Gestao: "Gestão", Comunicacao: "Comunicação", Inovacao: "Inovação", Comissoes: "Comissões", Orcamento: "Orçamento", Saude: "Saúde", Assistencia: "Assistência", Documentacao: "Documentação", Publicacao: "Publicação", Informacoes: "Informações", Patrimonio: "Patrimônio", Seguranca: "Segurança", Administracao: "Administração", Nucleo: "Núcleo", Gerencia: "Gerência", Execucao: "Execução", Orcamentaria: "Orçamentária", Contratacoes: "Contratações", Licitacoes: "Licitações", Memoria: "Memória", Logistico: "Logístico", Tecnico: "Técnico", Manutencao: "Manutenção", Lotacao: "Lotação", Juridica: "Jurídica", Operacoes: "Operações", Taquigrafia: "Taquigrafia", Plenario: "Plenário", Transito: "Trânsito", Informatica: "Informática", Cerimonial: "Cerimonial", Tecnologia: "Tecnologia", Expedicao: "Expedição", As: "às" };
const acento = (t) => String(t).replace(/\b[A-Z][a-z]+\b/g, (w) => AC[w] || w);
const estLista = () => Object.values(EST.grupos).flat();
const estDe = (nome) => estLista().find((x) => x.n === nome);
const comEst = (c) => (EST.grupos["Comissões · secretário de comissão"] || []).find((x) => norm(x.n).includes(norm(c).slice(0, 18)));
function poeNaChapa(n, ch) { S.dep[n] = S.dep[n] || {}; if (S.dep[n].ch && S.dep[n].ch !== ch.id) tiraDeTudo(n, chapa(S.dep[n].ch)); S.dep[n].ch = ch.id; S.dep[n].duv = false; }
function tiraDeTudo(n, ch) { if (!ch) return; for (const k in ch.mesa) if (ch.mesa[k] === n) delete ch.mesa[k]; for (const k in ch.out) if (ch.out[k] === n) delete ch.out[k]; for (const c in ch.com) ch.com[c] = ch.com[c].map((x) => x === n ? null : x); for (const c in ch.pres) if (ch.pres[c] === n) delete ch.pres[c]; }

// distribuição das vagas de comissão (RI art. 30)
function dist(n) {
  const q = 40 / (n - 1), L = S.blocos.map((b) => ({ b, d: nB(b), q: nB(b) / q }));
  L.forEach((x) => { x.v = Math.floor(x.q); });
  let r = n - L.reduce((s, x) => s + x.v, 0);
  const peq = L.filter((x) => x.d < 5).sort((a, c) => c.d - a.d || c.q - a.q);
  const res = S.reserva ? peq.find((x) => x.b.join("+") === S.reserva) || peq[0] : peq[0];
  if (r > 0 && res) { res.v++; res.res = true; r--; }
  L.filter((x) => !x.res).sort((a, c) => (c.q % 1) - (a.q % 1) || c.d - a.d).slice(0, r).forEach((x) => { x.v++; });
  return { q, L };
}
const vagasCom = (c) => COM9.test(norm(c)) ? 9 : 7;
const nomeB = (b) => (S.nomes && S.nomes[[...b].sort().join("+")]) || b.join(" + ");
// Distribuição no CONJUNTO das comissões do mesmo tamanho (08/10/2026): cada bloco tem
// mínimo = parte inteira do quociente e máximo = mínimo + 1 por comissão; as frações
// somadas nas k comissões viram vagas inteiras (maiores frações), mais as k vagas
// reservadas aos blocos com menos de 5 deputados (proporcional à bancada). Assim um
// partido com fração 0,2 entra em 1 de cada 5 comissões, em vez de nunca entrar.
let ALOC = null;
function alocar() {
  const chave = JSON.stringify([S.blocos, S.reserva]);
  if (ALOC && ALOC.chave === chave) return ALOC;
  const out = { chave, porCom: {}, resumo: {} };
  for (const n of [9, 7]) {
    const coms = COMS.filter((c) => vagasCom(c) === n), k = coms.length, D = dist(n);
    const L = D.L.map((x) => ({ b: x.b, d: x.d, q: x.q, min: Math.floor(x.q), ex: 0 }));
    const E = k * (n - L.reduce((s, x) => s + x.min, 0));
    const peq = L.filter((x) => x.d < 5), dp = peq.reduce((s, x) => s + x.d, 0);
    L.forEach((x) => { x.w = (x.q - x.min) * k + (x.d < 5 && dp ? k * x.d / dp : 0); });
    let r = E; L.forEach((x) => { x.ex = Math.min(k, Math.floor(x.w)); r -= x.ex; });
    for (let volta = 0; r > 0 && volta < 50; volta++) L.filter((x) => x.ex < k).sort((a, c) => (c.w - c.ex) - (a.w - a.ex) || c.d - a.d).forEach((x) => { if (r > 0 && x.ex < k) { x.ex++; r--; } });
    const coms0 = coms.map((c) => ({ c, l: [] }));
    L.forEach((x) => coms0.forEach((o) => { for (let t = 0; t < x.min; t++) o.l.push(x.b); }));
    // cada bloco recebe no máximo 1 vaga extra por comissão; preenche sempre as comissões que mais faltam
    const falta = coms0.map((o) => n - o.l.length);
    [...L].sort((a, c) => c.ex - a.ex || c.d - a.d).forEach((x) => {
      coms0.map((o, i) => i).sort((i, j) => falta[j] - falta[i] || i - j).slice(0, x.ex).forEach((i) => { if (falta[i] > 0) { coms0[i].l.push(x.b); falta[i]--; } });
    });
    coms0.forEach((o) => { out.porCom[o.c] = o.l.map(nomeB); });
    L.forEach((x) => { out.resumo[nomeB(x.b) + "|" + n] = { q: x.q, min: x.min, max: x.min + (x.ex ? 1 : 0), tot: x.min * k + x.ex, k }; });
  }
  ALOC = out; return out;
}
const slotsCom = (c) => alocar().porCom[c] || [];

// patrimônio: estruturas (CC + FC/FG + grat. exercício) + secretário de comissão presidida + convênios
function patrimonio(n) {
  const ch = chapa(chDe(n)); const it = []; let v = 0;
  if (ch) {
    for (const [k, x] of Object.entries(ch.mesa)) if (x === n) it.push(["Mesa", k, 0]);
    for (const [c, x] of Object.entries(ch.pres)) if (x === n) { const e = comEst(c); it.push(["Comissão", "Presidência · " + c, e ? e.t : 0]); v += e ? e.t : 0; }
    for (const [c, l] of Object.entries(ch.com)) if (l.includes(n) && ch.pres[c] !== n) it.push(["Comissão", "Membro · " + c, 0]);
    for (const [k, x] of Object.entries(ch.out)) if (x === n) { const e = estDe(k); it.push(["Estrutura", acento(k), e ? e.t : 0]); v += e ? e.t : 0; }
  }
  const cv = (S.dep[n] && S.dep[n].conv) || 0;
  return { it, v, cv };
}

// ---------------- desenho ----------------
let ADMIN = false;
function desenhar(admin) {
  if (admin !== undefined) ADMIN = admin;
  const ch = chapa(S.ui.aba) || S.chapas[0]; S.ui.aba = ch.id;
  const y = scrollY;
  $("#app").innerHTML = `<div class="pg"><main>
    <h1>Corrida da <i>Mesa.</i></h1>
    <div class="chapas">${S.chapas.map((c) => `<button data-ch="${c.id}" class="${c.id === ch.id ? "on" : ""}" style="--c:${c.cor}"><i></i>${esc(nomeCh(c))} <b>${votos(c)}</b>/21</button>`).join("")}${S.chapas.length < CORES.length ? `<button data-nova="1">+ nova chapa</button>` : ""}</div>
    <div class="placar">${S.chapas.map((c) => `<span><b style="color:${c.cor}">${votos(c)}</b> ${esc(nomeCh(c))}${votos(c) >= MAIORIA ? ` <b style="color:${c.cor}">· maioria</b>` : ""}</span>`).join("<span>×</span>")}<span>· <b>${DEP.filter((d) => S.dep[d.n] && S.dep[d.n].duv).length}</b> em dúvida · <b>${DEP.filter((d) => !chDe(d.n)).length}</b> sem chapa</span></div>
    <div class="acoesch"><button class="mini" data-bancada="1">+ bancada inteira</button><button class="mini" data-aliado="1">+ aliado</button>${S.chapas.length > 1 ? `<button class="mini" data-delch="1">Excluir esta chapa</button>` : ""}<button class="mini" data-zerar="1">Recomeçar cenário</button><button class="mini" data-imp="1" style="margin-left:auto;color:#F2F4F5;border-color:rgba(242,244,245,.3)">Imprimir</button></div>
    <section id="s1"><h2>Jogo da <i>Mesa.</i></h2>${secMesa(ch)}</section>
    <section id="s2"><h2>Composição das <i>comissões.</i></h2>${seletorCh(chCom(), "com")}${secCom(chCom())}</section>
    <section id="s3"><h2>Outros <i>cargos.</i></h2>${seletorCh(chOut(), "out")}${secOut(chOut())}</section>
    ${ADMIN ? `<div class="adm"><b style="color:#C6E62A">Administrador</b> · liberar acesso à Corrida da Mesa: <input id="admEmail" placeholder="e-mail da conta"> <button class="mini" data-adm="1">Liberar</button> <button class="mini" data-adm="0">Retirar</button> <span id="admMsg"></span></div>` : ""}
  </main>${secPat()}</div>`;
  scrollTo(0, y); ligar(ch); salvar();
}
function cartaDep(d, cor, sm = true) { const x = S.dep[d.n] || {}; return `<div class="card${sm ? " sm" : ""}${x.duv ? " duv" : ""}" draggable="true" data-arr="${d.n}" data-dep="${d.n}" style="--cc:${cor}77">${img(d, "")}<div class="l"><span>${esc(d.p)}</span><b>${esc(d.u)}</b></div></div>`; }
function secMesa(ch) {
  const ord = S.ui.ordSV || "bancada", livres = DEP.filter((d) => !chDe(d.n)).sort((a, b) => ord === "nome" ? a.u.localeCompare(b.u, "pt-BR") : ord === "votos" ? b.t - a.t : (nB([b.p]) - nB([a.p])) || a.p.localeCompare(b.p) || a.u.localeCompare(b.u, "pt-BR"));
  const opOrd = `<span style="float:right;display:inline-flex;gap:4px;text-transform:none;letter-spacing:0">${[["bancada", "Bancada"], ["nome", "Nome"], ["votos", "Votos"]].map(([k, r]) => `<button class="mini" data-ordsv="${k}" style="${ord === k ? "color:#0B0D0E;background:#F2F4F5;border-color:#F2F4F5" : ""}">${r}</button>`).join("")}</span>`;
  let grupos = "";
  if (ord === "bancada") { const ps = [...new Set(livres.map((d) => d.p))]; grupos = ps.map((p) => `<div class="gp"><div class="gpt">${esc(p)} · ${livres.filter((d) => d.p === p).length}</div><div class="cards">${livres.filter((d) => d.p === p).map((d) => cartaDep(d, "#3A3F45")).join("")}</div></div>`).join(""); }
  let h = `<p class="conta" style="max-width:640px">Monte a Mesa de cada chapa e arraste as cartas dos deputados para os votos da chapa. Cada deputado vota em uma chapa só: arrastar para outra tira o voto e o cargo da anterior. Toque numa carta para marcar dúvida ou tirar.</p>`;

  h += `<div class="chgrid" style="--n:${Math.min(3, S.chapas.length)}">`;
  for (const c of S.chapas) {
    const al = membros(c).filter((d) => !naMesa(c, d.n)), nm = Object.keys(c.mesa).length, v = votos(c), falta = Math.max(0, MAIORIA - v);
    const mesa = MESA.map((k) => { const n = c.mesa[k], d = n && dep(n), pres = k === "Presidente";
      return d ? `<div class="card${pres ? " pres" : ""}" draggable="true" data-arr="${d.n}" style="--c:${c.cor};--cc:${c.cor}88" data-mesa="${c.id}|${k}" data-dropmesa="${c.id}|${k}">${img(d, "")}<div class="l"><span>${k}</span><b>${esc(d.u)}</b></div></div>` : `<div class="card vazio${pres ? " pres" : ""}" data-mesa="${c.id}|${k}" data-dropmesa="${c.id}|${k}"><b style="font-size:18px">+</b><span>${k}</span></div>`; }).join("");
    h += `<div class="chbox${c.id === ch.id ? " at" : ""}" style="--c:${c.cor}"><div class="chcab"><b>${esc(nomeCh(c))}</b><span><b style="color:${c.cor};font-size:26px">${v}</b>/21${v >= MAIORIA ? " · maioria" : falta ? ` · faltam ${falta}` : ""}</span></div>
      <div class="bar"><i style="width:${v / 40 * 100}%"></i></div>
      <div class="rot">Mesa · ${nm}/7</div><div class="cards">${mesa}</div>
      <div class="zona" data-drop="${c.id}"><div class="rot">Votos · ${nm} na Mesa + ${al.filter((d) => !S.dep[d.n].duv).length} aliados · solte as cartas aqui</div><div class="cards">${al.map((d) => cartaDep(d, c.cor)).join("")}${Array.from({ length: Math.min(falta, 6) }, () => `<div class="card sm vazio" data-aliado="${c.id}"><b>+</b></div>`).join("")}</div></div></div>`;
  }
  h += `</div>`;
  h += `<div class="zona" data-drop="" style="margin-top:18px"><div class="rot" style="margin-top:6px">Ainda sem voto · ${livres.length} ${opOrd}</div>${!livres.length ? `<span class="conta">Todos os 40 já votam em alguma chapa.</span>` : ord === "bancada" ? `<div class="gps">${grupos}</div>` : `<div class="cards">${livres.map((d) => cartaDep(d, "#3A3F45")).join("")}</div>`}</div>`;
  return h;
}
const chCom = () => chapa(S.ui.abaCom) || chapa(S.ui.aba) || S.chapas[0];
const chOut = () => chapa(S.ui.abaOut) || chapa(S.ui.aba) || S.chapas[0];
function seletorCh(ch, sec) { return `<div class="selch"><span>Montando para</span>${S.chapas.map((c) => `<button data-chsec="${sec}|${c.id}" class="${c.id === ch.id ? "on" : ""}" style="--c:${c.cor}"><i></i>${esc(nomeCh(c))}</button>`).join("")}</div>`; }
function secCom(ch) {
  const outras = S.chapas.filter((c) => c !== ch && Object.values(c.com).some((l) => l.some(Boolean)));
  const A = dist(9), f = (x) => x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let h = outras.length ? `<div class="selch" style="margin-top:-6px"><span>Copiar composição de</span>${outras.map((c) => `<button data-copiar="${c.id}" style="--c:${c.cor}"><i></i>${esc(nomeCh(c))}</button>`).join("")}</div>` : "";
  h += `<button class="qb" data-q="1">÷ Quociente das comissões ${S.ui.qAb ? "▾" : "▸"}</button>`;
  if (S.ui.qAb) h += `<div class="qbox"><p>Regimento, art. 30: quociente = 40 ÷ (membros − 1). A vaga reservada vai ao conjunto dos partidos com menos de 5 deputados; as demais, às maiores frações (empate: maior bancada). Membros da Mesa contam na base de 40, mas não ocupam vaga. CCJ, Finanças, Trabalho e Ética têm 9 membros; as demais, 7.</p>
    <div class="conta" style="margin:0 12px 8px">Blocos parlamentares</div>
    <div style="margin:0 12px 12px">${S.blocos.filter((b) => b.length > 1).map((b) => `<div class="blk"><b>${esc(nomeB(b))}</b><span>${esc(b.join(", "))} · ${nB(b)} deputados</span><button class="mini" data-desfb="${esc(b.join("+"))}">Desfazer</button></div>`).join("")}
      ${S.ui.novoB ? `<div class="blk novo"><input id="nbNome" placeholder="Nome do bloco (ex.: Bloco Parlamentar Democrático)"><div class="chk">${S.blocos.filter((b) => b.length === 1).map((b) => `<label><input type="checkbox" value="${esc(b[0])}"> ${esc(b[0])} · ${nB(b)}</label>`).join("")}</div><button class="mini" data-salvab="1">Criar bloco</button> <button class="mini" data-novob="0">Cancelar</button></div>` : `<button class="mini" data-novob="1">+ Novo bloco</button>`}</div>
    ${(() => { const BL = A.L.map((x) => nomeB(x.b)), dep_ = A.L.map((x) => x.d), linha = (c) => { const sl = slotsCom(c); return `<tr><td>${esc(c)}</td><td class="f">${sl.length}</td>${BL.map((b) => { const v = sl.filter((y) => y === b).length; return `<td>${v ? `<b>${v}</b>` : `<span style="color:#3A3F45">·</span>`}</td>`; }).join("")}</tr>`; };
      const tot = BL.map((b) => COMS.reduce((s2, c) => s2 + slotsCom(c).filter((y) => y === b).length, 0));
      return `<div style="overflow-x:auto"><table class="qt mz"><tr><th>Comissão</th><th>Vagas</th>${BL.map((b, k) => `<th class="bc"><span class="bn">${esc(b).replace(/ \+ /g, " +<br>")}</span><span class="bd">${dep_[k]} dep.</span></th>`).join("")}</tr>
        ${[9, 7].map((n) => { const qq = 40 / (n - 1), R_ = BL.map((b) => alocar().resumo[b + "|" + n]);
          return `<tr class="grp"><td colspan="${BL.length + 2}">Comissões de ${n} membros</td></tr>
          <tr class="qrow"><td>Quociente <span>40 ÷ (${n} − 1) = ${f(qq)}</span></td><td></td>${BL.map((b, k) => `<td><b>${f(dep_[k] / qq)}</b><span>${dep_[k]} ÷ ${f(qq)}</span></td>`).join("")}</tr>
          <tr class="qrow"><td>Vagas por comissão <span>parte inteira; fração = vaga em parte das comissões</span></td><td></td>${R_.map((r) => `<td><b>${r.min === r.max ? r.min || "0" : r.min + " a " + r.max}</b><span>${r.tot} no total</span></td>`).join("")}</tr>
          ${COMS.filter((c) => vagasCom(c) === n).map(linha).join("")}`; }).join("")}
        <tr class="t"><td>Total de vagas</td><td>176</td>${tot.map((v) => `<td>${v}</td>`).join("")}</tr></table></div>
        <p style="margin-top:10px">Cada linha é uma comissão; cada coluna, um partido ou bloco: o número é quantas vagas ele tem ali. Quem tem fração de quociente entra em parte das comissões, para que os partidos menores também tenham presença.</p>`; })()}
  </div>`;;
  const linhas = COMS.map((c) => {
    const sl = slotsCom(c), l = (ch.com[c] = (ch.com[c] || []).slice(0, sl.length)), cheio = l.filter(Boolean).length, ab = S.ui.comAb === c, p = ch.pres[c] && dep(ch.pres[c]);
    let x = `<div><div class="ln${ab ? " ab" : ""}" data-com="${esc(c)}">${p ? img(p) : hole()}<span class="n">${esc(c)}</span><span class="q">${cheio}/${sl.length}</span><span style="color:#6B7178;font-size:11px">${ab ? "▾" : "▸"}</span></div>`;
    if (ab) {
      const d = dist(sl.length), e = comEst(c);
      x += `<div class="abre"><div class="conta">${sl.length} vagas · quociente ${f(d.q)} · ${Object.entries(sl.reduce((o, b) => (o[b] = (o[b] || 0) + 1, o), {})).map(([b, v]) => `${esc(b)} ${v}`).join(" · ")}${e ? ` · presidência: secretário de comissão ${fm(e.t)}/mês` : ""}</div>
        <div class="vg" data-presc="${esc(c)}" style="border-bottom:1px solid rgba(242,244,245,.12)">${p ? img(p) : hole()}<div>${p ? `<b>${esc(p.u)}</b>` : `<span style="color:#A9AEB3">Escolher presidente</span>`}<span style="display:block;font-size:10.5px;color:#6B7178">entre os membros da comissão</span></div><span class="bl" style="color:#C6E62A">Presidente</span><span style="color:#C6E62A">★</span></div>
        ${sl.map((b, i) => { const n = l[i], dd = n && dep(n), err = dd && !(S.blocos.find((x) => nomeB(x) === b) || [b]).includes(dd.p);
          return `<div class="vg" data-vaga="${esc(c)}|${i}">${dd ? img(dd, "av" + (err ? " err" : "")) : hole()}<div>${dd ? esc(dd.u) : `<span style="color:#6B7178">toque para escolher</span>`}${err ? `<small>${esc(dd.p)} · vaga do ${esc(b)}</small>` : ""}</div><span class="bl">${esc(b)}</span>${dd ? `<button class="pr${ch.pres[c] === n ? " on" : ""}" data-pres="${esc(c)}|${n}" title="Presidente da comissão">★</button>` : "<span></span>"}</div>`; }).join("")}</div>`;
    }
    return x + "</div>";
  });
  const meio = Math.ceil(linhas.length / 2);
  return h + `<div class="rot">Comissões permanentes · ${COMS.length} · toque para abrir · ★ marca o presidente</div><div class="dois"><div style="border-top:1px solid var(--linha)">${linhas.slice(0, meio).join("")}</div><div style="border-top:1px solid var(--linha)">${linhas.slice(meio).join("")}</div></div>`;
}
function secOut(ch) {
  let h = "";
  for (const [g, L] of Object.entries(EST.grupos)) {
    if (/Comiss/.test(g) || !L.length) continue;
    const lim = S.ui.mais[g] ? L.length : 8;
    h += `<div class="ec"><h3><span>${esc(g)} · ${L.length}</span><b>${fm(L.reduce((s, x) => s + x.t, 0))}/mês</b></h3><div class="er cab"><span></span><span>Estrutura</span><span>Comiss.</span><span>FC / FG</span><span>Grat. exerc.</span><span>Total/mês</span></div>`;
    for (const x of L.slice(0, lim)) {
      const n = ch.out[x.n], d = n && dep(n), ab = S.ui.estAb === x.n;
      h += `<div class="er${ab ? " ab" : ""}" data-est="${esc(x.n)}"><span data-atrib="${esc(x.n)}" title="Escolher parlamentar" style="cursor:pointer">${d ? img(d) : hole()}</span><span>${esc(acento(x.n))}<small>${d ? esc(d.u) : "vago"}</small></span><span class="v">${x.cc[0] || "—"}</span><span class="v">${x.fc[0] || "—"}</span><span class="v">${x.fg[0] || "—"}</span><span class="tt">${fm(x.t)}</span></div>`;
      if (ab) h += `<div class="det"><div><span>Cargos comissionados</span><b>${x.cc[0]}</b><i>${fm(x.cc[1])}</i></div><div><span>Funções de confiança / gratificadas</span><b>${x.fc[0]}</b><i>${fm(x.fc[1])}</i></div><div><span>Gratificação de exercício</span><b>${x.fg[0]}</b><i>${fm(x.fg[1])}</i></div>${x.niveis ? `<div style="grid-column:1/-1"><span>Níveis ocupados</span><i style="margin:0">${esc(Object.entries(x.niveis).map(([k, v]) => `${k} ×${v}`).join(" · "))}</i></div>` : ""}<div style="grid-column:1/-1;display:flex;gap:8px;align-items:center"><button class="mini" data-atrib="${esc(x.n)}">${d ? "Trocar ocupante" : "Atribuir a um deputado da chapa"}</button>${d ? `<button class="mini" data-desatrib="${esc(x.n)}">Deixar vago</button>` : ""}</div></div>`;
    }
    if (L.length > 8) h += `<button class="mais" data-mais="${esc(g)}">${S.ui.mais[g] ? "mostrar menos" : `+ ${L.length - 8} ${g.toLowerCase()}`}</button>`;
    h += "</div>";
  }
  return h + `<p style="font-size:11.5px;color:#6B7178;margin-top:12px">Soma cargos comissionados (PL/DAS), funções de confiança e gratificadas (PL/FC e PL/FG) e gratificação de exercício. Salário de efetivo fora. Contracheques de ${esc(EST.mes || "09/2026")}, Portal da Transparência da ALESC. Cada estrutura vale uma vez por chapa.</p>`;
}
function secPat() {
  
  const { col, dir } = S.ui.pat, P = DEP.map((d) => ({ d, ...patrimonio(d.n) }));
  const ordCh = (d) => { const i = S.chapas.findIndex((c) => c.id === chDe(d.n)); return i < 0 ? 99 : i; };
  P.sort((a, b) => col === "chapa" ? (ordCh(a.d) - ordCh(b.d)) || ((b.v + b.cv) - (a.v + a.cv)) : col === "nome" ? dir * a.d.u.localeCompare(b.d.u, "pt-BR") : dir * ((a.v + a.cv) - (b.v + b.cv)));
  const seta = (c) => `<span class="ord"><i class="u${col === c && dir > 0 ? " on" : ""}"></i><i class="d${col === c && dir < 0 ? " on" : ""}"></i></span>`;
  return `<aside class="gav${S.ui.gav ? "" : " fechada"}"><span class="vert" data-gav="1">Patrimônio · 40</span><div class="alca" data-gav="1" title="Recolher"><i></i><i></i></div><div class="rot" style="margin-top:14px">Patrimônio dos parlamentares · 40</div>
    <div class="pcab"><span data-po="nome" class="${col === "nome" ? "on" : ""}">Nome${seta("nome")}</span><span data-po="chapa" class="${col === "chapa" ? "on" : ""}">Chapa</span><span data-po="v" class="${col === "v" ? "on" : ""}">Patrimônio${seta("v")}</span></div>
    ${P.map(({ d, it, v, cv }, k) => { const ch = chapa(chDe(d.n)), ab = S.ui.patAb === d.n, ant = k && P[k - 1].d;
      const tit = col === "chapa" && (!k || chDe(ant.n) !== chDe(d.n)) ? `<div class="pgt" style="color:${ch ? ch.cor : "#6B7178"}">${ch ? esc(nomeCh(ch)) : "Sem chapa"} · ${fm(P.filter((x) => chDe(x.d.n) === chDe(d.n)).reduce((s2, x) => s2 + x.v, 0))}/mês</div>` : "";
      return tit + `<div class="pl"><div class="h" data-pat="${d.n}">${img(d, "av", `box-shadow:0 0 0 2px ${ch ? ch.cor : "#3A3F45"}`)}<div style="min-width:0"><div class="nm"${ab ? ' style="font-weight:700"' : ""}>${esc(d.u)}</div><div class="pt">${esc(d.p)}${S.dep[d.n] && S.dep[d.n].duv ? " · em dúvida" : ""}</div></div><b class="v">${v ? fm(v) + "/mês" : ""}${cv ? `<br><span style="color:#A9AEB3;font-weight:500">+ ${fm(cv)}</span>` : ""}</b></div>
        ${ab ? `<div class="corpo">${it.length ? it.map(([g, t, val]) => `<div class="it"><span>${g}</span><b>${esc(t)}${val ? ` · ${fm(val)}` : ""}</b></div>`).join("") : `<div class="it"><b style="color:#6B7178">Nada atribuído</b></div>`}
          <div class="it"><span>Convênios</span><b></b></div><input data-conv="${d.n}" inputmode="numeric" placeholder="R$ — digite o valor" value="${cv ? ni(cv) : ""}"></div>` : ""}</div>`; }).join("")}</aside>`;
}

// ---------------- seletor de deputado ----------------
function escolher(titulo, desc, filtro, aoEscolher, extra) {
  const el = $("#sel");
  const lista = (q) => [...DEP].sort((a, b) => ORDEM_CH ? ((chDe(b.n) === ORDEM_CH) - (chDe(a.n) === ORDEM_CH)) : ORDEM_BLOCO ? (ORDEM_BLOCO.includes(b.p) - ORDEM_BLOCO.includes(a.p)) : 0).filter(filtro).filter((d) => !q || norm(d.u + " " + d.p).includes(norm(q))).map((d) => { const c = chapa(chDe(d.n)); return `<button class="op" data-n="${d.n}">${img(d, "av", `box-shadow:0 0 0 2px ${c ? c.cor : "#3A3F45"}`)}<span>${esc(d.u)} <small>${esc(d.p)}</small></span><small>${c ? esc(nomeCh(c)) : "sem chapa"}</small></button>`; }).join("") || `<p style="color:#6B7178;font-size:13px">Ninguém disponível.</p>`;
  el.innerHTML = `<div class="f"></div><div class="cx"><h3>${esc(titulo)}</h3><div class="ds">${desc || ""}</div><input id="selq" placeholder="Buscar nome ou partido"><div class="ls" id="sell">${lista("")}</div>${extra || ""}<button class="bt" data-fechar="1">Fechar</button></div>`;
  el.hidden = false;
  const fecha = () => { el.hidden = true; ORDEM_BLOCO = null; ORDEM_CH = null; };
  $(".f", el).onclick = fecha; $("[data-fechar]", el).onclick = fecha;
  $("#selq").oninput = (e) => { $("#sell").innerHTML = lista(e.target.value); };
  el.onclick = (e) => { const b = e.target.closest(".op"); if (b) { fecha(); aoEscolher(b.dataset.n); desenhar(); } const x = e.target.closest("[data-extra]"); if (x) { fecha(); aoEscolher(null, x.dataset.extra); desenhar(); } };
}

// ---------------- eventos ----------------
function ligar(ch0) { let ch = ch0;
  // arrastar cartas (mouse) — no toque, o clique abre o seletor
  let arr = null;
  document.querySelectorAll("[data-arr]").forEach((c) => { c.ondragstart = (e) => { arr = c.dataset.arr; e.dataTransfer.setData("text/plain", arr); e.dataTransfer.effectAllowed = "move"; c.style.opacity = ".4"; }; c.ondragend = () => { c.style.opacity = ""; }; });
  document.querySelectorAll("[data-drop],[data-dropmesa]").forEach((z) => {
    z.ondragover = (e) => { e.preventDefault(); z.classList.add("sobre"); }; z.ondragleave = () => z.classList.remove("sobre");
    z.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); z.classList.remove("sobre"); const n = arr || e.dataTransfer.getData("text/plain"); arr = null; if (!n) return;
      if (z.dataset.dropmesa) { const [cid, k] = z.dataset.dropmesa.split("|"), c = chapa(cid); poeNaChapa(n, c); for (const x in c.mesa) if (c.mesa[x] === n) delete c.mesa[x]; for (const x in c.com) c.com[x] = c.com[x].map((y) => y === n ? null : y); for (const x in c.pres) if (c.pres[x] === n) delete c.pres[x]; c.mesa[k] = n; }
      else if (z.dataset.drop) { const c = chapa(z.dataset.drop); if (chDe(n) === c.id) { for (const x in c.mesa) if (c.mesa[x] === n) delete c.mesa[x]; } else poeNaChapa(n, c); }
      else { tiraDeTudo(n, chapa(chDe(n))); delete S.dep[n]; }
      desenhar(); };
  });
  const A = $("#app");
  A.onclick = (e) => {
    const t = e.target.closest("[data-ch],[data-nova],[data-mesa],[data-dep],[data-aliado],[data-bancada],[data-delch],[data-zerar],[data-chsec],[data-copiar],[data-ordsv],[data-imp],[data-gerar],[data-q],[data-desfb],[data-novob],[data-salvab],[data-res],[data-com],[data-presc],[data-vaga],[data-pres],[data-est],[data-atrib],[data-desatrib],[data-mais],[data-gav],[data-po],[data-pat],[data-adm]");
    if (!t) return; const ds = t.dataset;
    if (ds.ch) { S.ui.aba = ds.ch; return desenhar(); }
    if (ds.nova) { const id = "c" + Date.now(); S.chapas.push({ id, cor: CORES.find((c) => !S.chapas.some((x) => x.cor === c)), mesa: {}, out: {}, com: {}, pres: {} }); S.ui.aba = id; return desenhar(); }
    if (ds.delch) { DEP.forEach((d) => { if (chDe(d.n) === ch.id) delete S.dep[d.n]; }); S.chapas = S.chapas.filter((c) => c !== ch); S.ui.aba = S.chapas[0].id; return desenhar(); }
    if (ds.zerar) { if (t.dataset.ok) { const ui = S.ui; S = novoCenario(); S.ui = { ...ui, aba: "c1" }; return desenhar(); } t.dataset.ok = 1; t.textContent = "Confirmar: apagar tudo"; return; }
    if (ds.mesa) { const [cid, k] = ds.mesa.split("|"); ch = chapa(cid); return escolher(k, `${nomeCh(ch)} · quem estiver em outra chapa muda para esta`, (d) => !naMesa(ch, d.n) || ch.mesa[k] === d.n, (n, x) => { if (x === "vago") { delete ch.mesa[k]; return; } poeNaChapa(n, ch); for (const c in ch.com) ch.com[c] = ch.com[c].map((y) => y === n ? null : y); for (const c in ch.pres) if (ch.pres[c] === n) delete ch.pres[c]; ch.mesa[k] = n; }, ch.mesa[k] ? `<button class="bt" data-extra="vago">Deixar ${k} vago</button>` : ""); }
    if (ds.dep) { const n = ds.dep, d = dep(n); if (!S.dep[n]) return; return escolher(d.u, "Escolha uma ação", () => false, (x, a) => { if (a === "duv") S.dep[n].duv = !S.dep[n].duv; if (a === "sai") { tiraDeTudo(n, ch); delete S.dep[n]; } }, `<button class="bt" data-extra="duv">${S.dep[n].duv ? "Tirar da dúvida (volta a contar)" : "Marcar como em dúvida (não conta voto)"}</button><button class="bt" data-extra="sai">Tirar da chapa</button>`); }
    if (ds.aliado) { if (ds.aliado !== "1") ch = chapa(ds.aliado); } if (ds.aliado) return escolher("Adicionar aliado", `${nomeCh(ch)}`, (d) => chDe(d.n) !== ch.id, (n) => poeNaChapa(n, ch));
    if (ds.bancada) { const ps = [...new Set(DEP.map((d) => d.p))]; return escolher("Bancada inteira", "Todos os deputados do partido entram nesta chapa", () => false, (x, p) => DEP.filter((d) => d.p === p).forEach((d) => poeNaChapa(d.n, ch)), ps.map((p) => `<button class="bt" data-extra="${esc(p)}">${esc(p)} · ${DEP.filter((d) => d.p === p).length}</button>`).join("")); }
    if (ds.q) { S.ui.qAb = !S.ui.qAb; return desenhar(); }
    if (t.closest("#s2")) ch = chCom(); if (t.closest("#s3")) ch = chOut();
    if (ds.chsec) { const [sec, id] = ds.chsec.split("|"); if (sec === "com") S.ui.abaCom = id; else S.ui.abaOut = id; return desenhar(); }
    if (ds.copiar) { const o = chapa(ds.copiar); ch.com = JSON.parse(JSON.stringify(o.com)); ch.pres = JSON.parse(JSON.stringify(o.pres)); return desenhar(); }
    if (ds.ordsv) { S.ui.ordSV = ds.ordsv; return desenhar(); }
    if (ds.imp) { const el = $("#sel"); el.innerHTML = `<div class="f"></div><div class="cx"><h3>Imprimir</h3><div class="ds">Escolha o que entra no documento</div>
      <div class="rot" style="margin-top:4px">Chapas</div><div class="chk" id="impCh">${S.chapas.map((c) => `<label><input type="checkbox" value="${c.id}" checked> ${esc(nomeCh(c))}</label>`).join("")}</div>
      <div class="rot">Seções</div><div class="chk" id="impSec">${[["mesa", "Mesa e votos"], ["duelo", "Duelo (placar lado a lado)"], ["com", "Comissões"], ["out", "Outros cargos"], ["pat", "Patrimônio dos deputados"], ["quoc", "Quociente e blocos"]].map(([k, r]) => `<label><input type="checkbox" value="${k}" checked> ${r}</label>`).join("")}</div>
      <button class="bt" data-gerar="1" style="color:#0B0D0E;background:#34E84A;border-color:#34E84A;font-weight:700">Gerar documento</button><button class="bt" data-fechar="1">Fechar</button></div>`; el.hidden = false; el.onclick = (ev) => { if (ev.target.closest(".f,[data-fechar]")) el.hidden = true; if (ev.target.closest("[data-gerar]")) { const chs = [...el.querySelectorAll("#impCh input:checked")].map((x) => x.value), secs = [...el.querySelectorAll("#impSec input:checked")].map((x) => x.value); el.hidden = true; imprimir(chs, secs); } }; return; }
    if (ds.desfb) { const b = S.blocos.find((x) => x.join("+") === ds.desfb); S.blocos = S.blocos.filter((x) => x !== b); b.forEach((p) => S.blocos.push([p])); S.blocos.sort((x, y) => nB(y) - nB(x)); return desenhar(); }
    if (ds.novob !== undefined) { S.ui.novoB = ds.novob === "1"; return desenhar(); }
    if (ds.salvab) { const ps = [...document.querySelectorAll(".blk.novo input[type=checkbox]:checked")].map((x) => x.value); if (ps.length < 2) { alert("Marque pelo menos dois partidos."); return; } S.blocos = S.blocos.filter((b) => !(b.length === 1 && ps.includes(b[0]))); S.blocos.push(ps); S.nomes = S.nomes || {}; const nm = $("#nbNome").value.trim(); if (nm) S.nomes[[...ps].sort().join("+")] = nm; S.ui.novoB = false; S.blocos.sort((x, y) => nB(y) - nB(x)); return desenhar(); }
    if (ds.res) { S.reserva = ds.res; return desenhar(); }
    if (ds.pres) { e.stopPropagation(); const [c, n] = ds.pres.split("|"); if (ch.pres[c] === n) delete ch.pres[c]; else { const ja = Object.keys(ch.pres).find((k) => ch.pres[k] === n); if (ja) { alert(`${dep(n).u} já preside ${ja}. Cada deputado preside no máximo uma comissão.`); return; } ch.pres[c] = n; } return desenhar(); }
    if (ds.presc) { const c = ds.presc, l = (ch.com[c] || []).filter(Boolean); if (!l.length) return escolher(c, "Preencha as vagas da comissão primeiro; o presidente é escolhido entre os membros.", () => false, () => {}); return escolher(`Presidente · ${c}`, "Entre os membros da comissão · cada deputado preside no máximo uma comissão", (d) => l.includes(d.n) && !Object.entries(ch.pres).some(([k, v]) => v === d.n && k !== c), (n, x) => { if (x === "tirar") { delete ch.pres[c]; return; } for (const k in ch.pres) if (ch.pres[k] === n) delete ch.pres[k]; ch.pres[c] = n; }, ch.pres[c] ? `<button class="bt" data-extra="tirar">Sem presidente</button>` : ""); }
    if (ds.vaga) { const [c, i] = ds.vaga.split("|"), bl = slotsCom(c)[+i]; ORDEM_BLOCO = S.blocos.find((x) => nomeB(x) === bl) || [bl]; return escolher(`${c} · vaga ${+i + 1}`, `Vaga do bloco <b>${esc(bl)}</b>. Membros da Mesa não ocupam vaga.`, (d) => !Object.values(S.chapas).some((x) => naMesa(x, d.n)) && !(ch.com[c] || []).includes(d.n), (n, x) => { if (x === "vago") { const o = ch.com[c][+i]; ch.com[c][+i] = null; if (ch.pres[c] === o) delete ch.pres[c]; return; } ch.com[c][+i] = n; }, (ch.com[c] || [])[+i] ? `<button class="bt" data-extra="vago">Deixar vaga</button>` : ""); }
    if (ds.com) { S.ui.comAb = S.ui.comAb === ds.com ? null : ds.com; return desenhar(); }
    if (ds.atrib) { const k = ds.atrib; ORDEM_CH = ch.id; return escolher(acento(k), `${nomeCh(ch)} · uma vez por chapa · quem é de outra chapa ou sem chapa passa a votar nesta`, () => true, (n, x) => { if (x === "vago") { delete ch.out[k]; return; } if (chDe(n) !== ch.id) poeNaChapa(n, ch); ch.out[k] = n; }, ch.out[k] ? `<button class="bt" data-extra="vago">Deixar vago</button>` : ""); }
    if (ds.desatrib) { delete ch.out[ds.desatrib]; return desenhar(); }
    if (ds.est) { S.ui.estAb = S.ui.estAb === ds.est ? null : ds.est; return desenhar(); }
    if (ds.mais) { S.ui.mais[ds.mais] = !S.ui.mais[ds.mais]; return desenhar(); }
    if (ds.gav) { S.ui.gav = !S.ui.gav; const g = $(".gav"); g.classList.toggle("fechada", !S.ui.gav); return; }
    if (ds.po) { const c = ds.po; S.ui.pat = { col: c, dir: S.ui.pat.col === c ? -S.ui.pat.dir : (c === "nome" ? 1 : -1) }; return desenhar(); }
    if (ds.pat) { S.ui.patAb = S.ui.patAb === ds.pat ? null : ds.pat; return desenhar(); }
    if (ds.adm !== undefined) { supabaseClient.rpc("admin_definir_acesso_mesa", { p_email: $("#admEmail").value, p_liberar: ds.adm === "1" }).then(({ data, error }) => { $("#admMsg").textContent = error ? error.message : data; }); }
  };
  A.querySelectorAll("[data-conv]").forEach((inp) => inp.onchange = () => { const n = inp.dataset.conv; S.dep[n] = S.dep[n] || {}; S.dep[n].conv = Number(inp.value.replace(/\D/g, "")) || 0; desenhar(); });
}
iniciar();

// ---------------- impressão (padrão branco dos relatórios do painel) ----------------
function imprimir(ids, secs) {
  const CH = S.chapas.filter((c) => ids.includes(c.id)), F = (n) => location.origin + location.pathname.replace(/mesa\.html.*$/, "") + `../dados/fotos/sc-2026/estadual/${n}.jpg`;
  const av = (d, s = 26) => `<img src="${F(d.n)}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;object-position:50% 20%;vertical-align:middle">`;
  const L = (a, b, c = "", d = "") => `<div class="l"><span>${a}</span><span>${b}</span><span>${c}</span><span>${d}</span></div>`;
  let h = "";
  if (secs.includes("duelo") && CH.length > 1) h += `<div class="sec">Duelo · placar</div><div class="duo">${CH.map((c) => `<div style="border-color:${c.cor}"><b style="color:${c.cor}">${votos(c)}</b><span>${esc(nomeCh(c))}</span><i>${Object.keys(c.mesa).length}/7 na Mesa · ${membros(c).filter((d) => S.dep[d.n].duv).length} em dúvida</i></div>`).join("")}</div><div class="nota">Maioria: 21 de 40. Sem chapa: ${DEP.filter((d) => !chDe(d.n)).length}.</div>`;
  for (const c of CH) {
    h += `<div class="pb"></div><h2 style="border-color:${c.cor}">${esc(nomeCh(c))} <small>${votos(c)}/21 votos</small></h2>`;
    if (secs.includes("mesa")) {
      h += `<div class="sec">Mesa Diretora</div>` + MESA.map((k) => { const d = c.mesa[k] && dep(c.mesa[k]); return L(k, d ? `${av(d)} ${esc(d.u)}` : "<i>vago</i>", d ? esc(d.p) : ""); }).join("");
      h += `<div class="sec">Votos da chapa · ${votos(c)}</div><div class="grid">${membros(c).map((d) => `<div>${av(d, 22)} ${esc(d.u)} <i>${esc(d.p)}${S.dep[d.n].duv ? " · em dúvida" : ""}</i></div>`).join("")}</div>`;
    }
    if (secs.includes("com")) { h += `<div class="sec">Comissões</div>` + COMS.map((cm) => { const l = (c.com[cm] || []).filter(Boolean); if (!l.length && !c.pres[cm]) return ""; const p = c.pres[cm] && dep(c.pres[cm]); return L(esc(cm), p ? `Pres.: ${esc(p.u)}` : "", l.map((n) => esc(dep(n).u)).join(", ")); }).join("") || `<div class="nota">Nenhuma comissão preenchida.</div>`; }
    if (secs.includes("out")) { const o = Object.entries(c.out); h += `<div class="sec">Outros cargos</div>` + (o.length ? o.map(([k, n]) => { const e = estDe(k); return L(esc(acento(k)), esc(dep(n).u), e ? fm(e.t) + "/mês" : ""); }).join("") : `<div class="nota">Nenhuma estrutura atribuída.</div>`); }
    if (secs.includes("pat")) { const P = membros(c).map((d) => ({ d, ...patrimonio(d.n) })).sort((a, b) => (b.v + b.cv) - (a.v + a.cv)); h += `<div class="sec">Patrimônio dos deputados da chapa</div>` + L("<b>Deputado</b>", "<b>O que recebe</b>", "<b>Mensal</b>", "<b>Convênios</b>") + P.map((x) => L(`${av(x.d, 22)} ${esc(x.d.u)}`, x.it.map((i) => esc(i[1])).join(" · ") || "—", x.v ? fm(x.v) : "—", x.cv ? fm(x.cv) : "—")).join("") + L("<b>Total</b>", "", `<b>${fm(P.reduce((s, x) => s + x.v, 0))}</b>`, `<b>${fm(P.reduce((s, x) => s + x.cv, 0))}</b>`); }
  }
  if (secs.includes("quoc")) { const A = dist(9); h += `<div class="pb"></div><div class="sec">Quociente e blocos · RI art. 30</div>` + L("<b>Partido / bloco</b>", "<b>Dep.</b>", "<b>Comissões de 9</b>", "<b>Comissões de 7</b>") + A.L.map((x) => { const a = alocar().resumo[nomeB(x.b) + "|9"], z = alocar().resumo[nomeB(x.b) + "|7"]; return L(esc(nomeB(x.b)) + (x.b.length > 1 ? ` <i>(${esc(x.b.join(", "))})</i>` : ""), x.d, `${a.tot} vagas`, `${z.tot} vagas`); }).join(""); }
  const w = window.open("", "_blank");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Corrida da Mesa · SimulaLEGIS</title><style>@page{size:A4;margin:12mm 11mm}*{box-sizing:border-box}body{margin:0;font:10px/1.45 Inter,system-ui,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @font-face{font-family:Inter;src:url(${location.origin}${location.pathname.replace(/painel\/.*$/, "")}fontes/InterVariable.woff2);font-weight:100 900}
  .cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #D3D6D9;padding-bottom:8px}.wm{font-size:15px;font-weight:800}.wm b{color:#1FA83A}.meta{font-size:7.5px;letter-spacing:.14em;text-transform:uppercase;color:#6B7178;text-align:right}
  h1{font-size:28px;font-weight:900;letter-spacing:-.045em;margin:12px 0 2px}h1 i{font-style:normal;color:#1FA83A}h2{font-size:18px;font-weight:900;letter-spacing:-.03em;margin:14px 0 4px;padding-left:8px;border-left:4px solid}h2 small{font-size:11px;color:#6B7178;font-weight:600}
  .sec{font-size:7.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#6B7178;margin:12px 0 4px}.l{display:grid;grid-template-columns:150px minmax(0,1fr) 110px 90px;gap:8px;align-items:center;padding:4px 2px;border-bottom:.5px solid #E3E5E8;page-break-inside:avoid}.l span:nth-child(n+3){text-align:right}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 10px}.grid i,.l i{font-style:normal;color:#6B7178}.duo{display:flex;gap:8px}.duo div{flex:1;border:1.5px solid;border-radius:8px;padding:8px}.duo b{font-size:26px;display:block}.duo i{display:block;font-style:normal;color:#6B7178;font-size:8px}
  .nota{font-size:8px;color:#3F454B;margin:4px 0}.pb{page-break-before:auto}.rod{margin-top:14px;font-size:7px;color:#6B7178;border-top:.5px solid #D3D6D9;padding-top:5px}</style></head><body>
  <div class="cab"><div class="wm"><b>Simula</b>LEGIS</div><div class="meta"><b>Corrida da Mesa · ALESC</b><br>gerado em ${new Date().toLocaleString("pt-BR")}</div></div>
  <h1>Corrida da <i>Mesa.</i></h1>${h}<div class="rod">Simulação de cenário. Estruturas: contracheques ALESC ${esc(EST.mes || "")} (cargo comissionado, FC/FG, gratificação de exercício). Não é informação real sobre negociações.</div>
  <script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`);
  w.document.close();
}
