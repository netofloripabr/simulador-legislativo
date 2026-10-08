// Corrida da Mesa — versão funcional (08/10/2026). Ver cabeçalho do mesa.html.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ni = (x) => Math.round(x || 0).toLocaleString("pt-BR");
const fm = (v) => !v ? "R$ 0" : v < 1e6 ? `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CORES = ["#34E84A", "#5A86FF", "#FFA23E", "#E85AD0", "#2ED3F0"];
const MAIORIA = 21, MESA = ["2º Vice-Presidente", "Presidente", "1º Vice-Presidente", "1º Secretário", "2º Secretário", "3º Secretário", "4º Secretário"];
const COM9 = /constitui|financas|trabalho|etica/;
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
const img = (d, cls = "av", st = "") => `<img class="${cls}" src="${foto(d.n)}" alt="" style="${st}">`;
const hole = () => `<span class="ho">+</span>`;
let DEP = [], COMS = [], EST = {}, S, UID = null, CEN_ID = null, salvarT;

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
  const [d, e, a] = await Promise.all([fetch("../dados/painel/sc-estadual.json?v=20261008a").then((r) => r.json()), fetch("../dados/painel/mesa-estruturas.json?v=1").then((r) => r.json()), fetch("../dados/painel/alesc-estrutura.json").then((r) => r.json())]);
  DEP = d.c.filter((c) => /^eleito/i.test(c.s || "")).sort((x, y) => y.t - x.t).map((c) => ({ n: c.n, u: c.u, p: c.p, t: c.t }));
  COMS = a.comissoes.map((x) => x.nome.replace(/^Comissão (de |dos |da |do )?/, (m) => m.replace("Comissão ", "")).replace(/^de /, ""));
  COMS = a.comissoes.map((x) => x.nome.replace(/^Comissão /, "").replace(/^de /, ""));
  EST = e;
  const { data: cen } = await supabaseClient.from("mesa_cenarios").select("id,dados").eq("perfil_id", UID).order("atualizado_em", { ascending: false }).limit(1);
  if (cen && cen[0] && cen[0].dados && cen[0].dados.chapas) { CEN_ID = cen[0].id; S = cen[0].dados; }
  else { try { S = JSON.parse(localStorage.getItem("sl_mesa2")); } catch (er) {} }
  if (!S || !S.chapas) S = novoCenario();
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
const slotsCom = (c) => dist(vagasCom(c)).L.flatMap((x) => Array(x.v).fill(x.b.join(" + ")));

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
    <div class="acoesch"><button class="mini" data-bancada="1">+ bancada inteira</button><button class="mini" data-aliado="1">+ aliado</button>${S.chapas.length > 1 ? `<button class="mini" data-delch="1">Excluir esta chapa</button>` : ""}<button class="mini" data-zerar="1">Recomeçar cenário</button></div>
    <section id="s1"><h2>Jogo da <i>Mesa.</i></h2>${secMesa(ch)}</section>
    <section id="s2"><h2>Composição das <i>comissões.</i></h2>${secCom(ch)}</section>
    <section id="s3"><h2>Outros <i>cargos.</i></h2>${secOut(ch)}</section>
    ${ADMIN ? `<div class="adm"><b style="color:#C6E62A">Administrador</b> · liberar acesso à Corrida da Mesa: <input id="admEmail" placeholder="e-mail da conta"> <button class="mini" data-adm="1">Liberar</button> <button class="mini" data-adm="0">Retirar</button> <span id="admMsg"></span></div>` : ""}
  </main>${secPat()}</div>`;
  scrollTo(0, y); ligar(ch); salvar();
}
function secMesa(ch) {
  const cards = MESA.map((k) => { const n = ch.mesa[k], d = n && dep(n), pres = k === "Presidente";
    return d ? `<div class="card${pres ? " pres" : ""}" style="--c:${ch.cor};--cc:${ch.cor}88" data-mesa="${k}">${img(d, "", "")}<div class="l"><span>${k}</span><b>${esc(d.u)}</b></div></div>` : `<div class="card vazio${pres ? " pres" : ""}" data-mesa="${k}"><b style="font-size:18px">+</b><span>${k}</span></div>`; }).join("");
  const al = membros(ch).filter((d) => !naMesa(ch, d.n));
  const nm = Object.keys(ch.mesa).length, falta = Math.max(0, MAIORIA - votos(ch));
  return `<div class="rot">Mesa Diretora · ${nm}/7 · fora das comissões</div><div class="cards">${cards}</div>
    <div class="rot">Votos da chapa · ${nm} na Mesa + ${al.filter((d) => !S.dep[d.n].duv).length} aliados = <b style="color:${ch.cor}">${votos(ch)}</b>/21${falta ? ` · faltam ${falta}` : " · maioria formada"}</div>
    <div class="cards">${al.map((d) => `<div class="card sm${S.dep[d.n].duv ? " duv" : ""}" style="--cc:${ch.cor}77" data-dep="${d.n}">${img(d, "")}<div class="l"><span>${esc(d.p)}</span><b>${esc(d.u)}</b></div></div>`).join("")}${Array.from({ length: Math.max(1, falta) }, () => `<div class="card sm vazio" data-aliado="1"><b>+</b></div>`).join("")}</div>`;
}
function secCom(ch) {
  const A = dist(9), Z = dist(7), f = (x) => x.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let h = `<button class="qb" data-q="1">÷ Quociente das comissões ${S.ui.qAb ? "▾" : "▸"}</button>`;
  if (S.ui.qAb) h += `<div class="qbox"><p>Regimento, art. 30: quociente = 40 ÷ (membros − 1). A vaga reservada vai ao conjunto dos partidos com menos de 5 deputados; as demais, às maiores frações (empate: maior bancada). Membros da Mesa contam na base de 40, mas não ocupam vaga. CCJ, Finanças, Trabalho e Ética têm 9 membros; as demais, 7.</p>
    <div class="conta" style="margin:0 12px 8px">Blocos parlamentares · toque em dois para juntar, toque num bloco para desfazer · toque em "res." para escolher quem leva a vaga reservada</div>
    <div class="chipsb">${S.blocos.map((b, i) => `<button data-bl="${i}" class="${b.length > 1 ? "bk" : ""}${S.ui.selB === i ? " sel" : ""}">${esc(b.join(" + "))} · ${nB(b)}</button>`).join("")}</div>
    <table class="qt"><tr><th>Partido / bloco</th><th>Deputados</th><th>Quoc. 9 (${f(A.q)})</th><th>Vagas · 9</th><th>Quoc. 7 (${f(Z.q)})</th><th>Vagas · 7</th></tr>
    ${A.L.map((x, i) => { const y = Z.L[i]; return `<tr><td>${esc(x.b.join(" + "))}</td><td>${x.d}</td><td class="f">${f(x.q)}</td><td><b>${x.v || "—"}</b>${x.res ? ` <small>res.</small>` : x.d < 5 ? ` <small data-res="${esc(x.b.join("+"))}" style="cursor:pointer;color:#4A5058">res.?</small>` : ""}</td><td class="f">${f(y.q)}</td><td><b>${y.v || "—"}</b>${y.res ? ` <small>res.</small>` : ""}</td></tr>`; }).join("")}
    <tr class="t"><td>Total</td><td>40</td><td></td><td>9</td><td></td><td>7</td></tr></table></div>`;
  const linhas = COMS.map((c) => {
    const sl = slotsCom(c), l = (ch.com[c] = (ch.com[c] || []).slice(0, sl.length)), cheio = l.filter(Boolean).length, ab = S.ui.comAb === c, p = ch.pres[c] && dep(ch.pres[c]);
    let x = `<div><div class="ln${ab ? " ab" : ""}" data-com="${esc(c)}">${p ? img(p) : hole()}<span class="n">${esc(c)}</span><span class="q">${cheio}/${sl.length}</span><span style="color:#6B7178;font-size:11px">${ab ? "▾" : "▸"}</span></div>`;
    if (ab) {
      const d = dist(sl.length), e = comEst(c);
      x += `<div class="abre"><div class="conta">${sl.length} vagas · quociente ${f(d.q)} · ${d.L.filter((y) => y.v).map((y) => `${esc(y.b.join("+"))} ${y.v}`).join(" · ")}${e ? ` · presidência: secretário de comissão ${fm(e.t)}/mês` : ""}</div>
        ${sl.map((b, i) => { const n = l[i], dd = n && dep(n), err = dd && !b.split(" + ").includes(dd.p);
          return `<div class="vg" data-vaga="${esc(c)}|${i}">${dd ? img(dd, "av" + (err ? " err" : "")) : hole()}<div>${dd ? esc(dd.u) : `<span style="color:#4A5058">vaga</span>`}${err ? `<small>${esc(dd.p)} · vaga do ${esc(b)}</small>` : ""}</div><span class="bl">${esc(b)}</span>${dd ? `<button class="pr${ch.pres[c] === n ? " on" : ""}" data-pres="${esc(c)}|${n}" title="Presidente da comissão">★</button>` : "<span></span>"}</div>`; }).join("")}</div>`;
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
      h += `<div class="er${ab ? " ab" : ""}" data-est="${esc(x.n)}">${d ? img(d) : hole()}<span>${esc(acento(x.n))}<small>${d ? esc(d.u) : "vago"}</small></span><span class="v">${x.cc[0] || "—"}</span><span class="v">${x.fc[0] || "—"}</span><span class="v">${x.fg[0] || "—"}</span><span class="tt">${fm(x.t)}</span></div>`;
      if (ab) h += `<div class="det"><div><span>Cargos comissionados</span><b>${x.cc[0]}</b><i>${fm(x.cc[1])}</i></div><div><span>Funções de confiança / gratificadas</span><b>${x.fc[0]}</b><i>${fm(x.fc[1])}</i></div><div><span>Gratificação de exercício</span><b>${x.fg[0]}</b><i>${fm(x.fg[1])}</i></div>${x.niveis ? `<div style="grid-column:1/-1"><span>Níveis ocupados</span><i style="margin:0">${esc(Object.entries(x.niveis).map(([k, v]) => `${k} ×${v}`).join(" · "))}</i></div>` : ""}<div style="grid-column:1/-1;display:flex;gap:8px;align-items:center"><button class="mini" data-atrib="${esc(x.n)}">${d ? "Trocar ocupante" : "Atribuir a um deputado da chapa"}</button>${d ? `<button class="mini" data-desatrib="${esc(x.n)}">Deixar vago</button>` : ""}</div></div>`;
    }
    if (L.length > 8) h += `<button class="mais" data-mais="${esc(g)}">${S.ui.mais[g] ? "mostrar menos" : `+ ${L.length - 8} ${g.toLowerCase()}`}</button>`;
    h += "</div>";
  }
  return h + `<p style="font-size:11.5px;color:#6B7178;margin-top:12px">Soma cargos comissionados (PL/DAS), funções de confiança e gratificadas (PL/FC e PL/FG) e gratificação de exercício. Salário de efetivo fora. Contracheques de ${esc(EST.mes || "09/2026")}, Portal da Transparência da ALESC. Cada estrutura vale uma vez por chapa.</p>`;
}
function secPat() {
  if (!S.ui.gav) return `<aside class="gav fechada" data-gav="1"><span class="vert">Patrimônio · 40</span></aside>`;
  const { col, dir } = S.ui.pat, P = DEP.map((d) => ({ d, ...patrimonio(d.n) }));
  P.sort((a, b) => col === "nome" ? dir * a.d.u.localeCompare(b.d.u, "pt-BR") : dir * ((a.v + a.cv) - (b.v + b.cv)));
  const seta = (c) => `<span class="ord"><i class="u${col === c && dir > 0 ? " on" : ""}"></i><i class="d${col === c && dir < 0 ? " on" : ""}"></i></span>`;
  return `<aside class="gav"><div class="alca" data-gav="1" title="Recolher"><i></i><i></i></div><div class="rot" style="margin-top:14px">Patrimônio dos parlamentares · 40</div>
    <div class="pcab"><span data-po="nome" class="${col === "nome" ? "on" : ""}">Nome${seta("nome")}</span><span data-po="v" class="${col === "v" ? "on" : ""}">Patrimônio${seta("v")}</span></div>
    ${P.map(({ d, it, v, cv }) => { const ch = chapa(chDe(d.n)), ab = S.ui.patAb === d.n;
      return `<div class="pl"><div class="h" data-pat="${d.n}">${img(d, "av", `box-shadow:0 0 0 2px ${ch ? ch.cor : "#3A3F45"}`)}<div style="min-width:0"><div class="nm"${ab ? ' style="font-weight:700"' : ""}>${esc(d.u)}</div><div class="pt">${esc(d.p)}${S.dep[d.n] && S.dep[d.n].duv ? " · em dúvida" : ""}</div></div><b class="v">${v ? fm(v) + "/mês" : ""}${cv ? `<br><span style="color:#A9AEB3;font-weight:500">+ ${fm(cv)}</span>` : ""}</b></div>
        ${ab ? `<div class="corpo">${it.length ? it.map(([g, t, val]) => `<div class="it"><span>${g}</span><b>${esc(t)}${val ? ` · ${fm(val)}` : ""}</b></div>`).join("") : `<div class="it"><b style="color:#6B7178">Nada atribuído</b></div>`}
          <div class="it"><span>Convênios</span><b></b></div><input data-conv="${d.n}" inputmode="numeric" placeholder="R$ — digite o valor" value="${cv ? ni(cv) : ""}"></div>` : ""}</div>`; }).join("")}</aside>`;
}

// ---------------- seletor de deputado ----------------
function escolher(titulo, desc, filtro, aoEscolher, extra) {
  const el = $("#sel");
  const lista = (q) => DEP.filter(filtro).filter((d) => !q || norm(d.u + " " + d.p).includes(norm(q))).map((d) => { const c = chapa(chDe(d.n)); return `<button class="op" data-n="${d.n}">${img(d, "av", `box-shadow:0 0 0 2px ${c ? c.cor : "#3A3F45"}`)}<span>${esc(d.u)} <small>${esc(d.p)}</small></span><small>${c ? esc(nomeCh(c)) : "sem chapa"}</small></button>`; }).join("") || `<p style="color:#6B7178;font-size:13px">Ninguém disponível.</p>`;
  el.innerHTML = `<div class="f"></div><div class="cx"><h3>${esc(titulo)}</h3><div class="ds">${desc || ""}</div><input id="selq" placeholder="Buscar nome ou partido"><div class="ls" id="sell">${lista("")}</div>${extra || ""}<button class="bt" data-fechar="1">Fechar</button></div>`;
  el.hidden = false;
  const fecha = () => { el.hidden = true; };
  $(".f", el).onclick = fecha; $("[data-fechar]", el).onclick = fecha;
  $("#selq").oninput = (e) => { $("#sell").innerHTML = lista(e.target.value); };
  el.onclick = (e) => { const b = e.target.closest(".op"); if (b) { fecha(); aoEscolher(b.dataset.n); desenhar(); } const x = e.target.closest("[data-extra]"); if (x) { fecha(); aoEscolher(null, x.dataset.extra); desenhar(); } };
}

// ---------------- eventos ----------------
function ligar(ch) {
  const A = $("#app");
  A.onclick = (e) => {
    const t = e.target.closest("[data-ch],[data-nova],[data-mesa],[data-dep],[data-aliado],[data-bancada],[data-delch],[data-zerar],[data-q],[data-bl],[data-res],[data-com],[data-vaga],[data-pres],[data-est],[data-atrib],[data-desatrib],[data-mais],[data-gav],[data-po],[data-pat],[data-adm]");
    if (!t) return; const ds = t.dataset;
    if (ds.ch) { S.ui.aba = ds.ch; return desenhar(); }
    if (ds.nova) { const id = "c" + Date.now(); S.chapas.push({ id, cor: CORES.find((c) => !S.chapas.some((x) => x.cor === c)), mesa: {}, out: {}, com: {}, pres: {} }); S.ui.aba = id; return desenhar(); }
    if (ds.delch) { DEP.forEach((d) => { if (chDe(d.n) === ch.id) delete S.dep[d.n]; }); S.chapas = S.chapas.filter((c) => c !== ch); S.ui.aba = S.chapas[0].id; return desenhar(); }
    if (ds.zerar) { if (t.dataset.ok) { const ui = S.ui; S = novoCenario(); S.ui = { ...ui, aba: "c1" }; return desenhar(); } t.dataset.ok = 1; t.textContent = "Confirmar: apagar tudo"; return; }
    if (ds.mesa) { const k = ds.mesa; return escolher(k, `${nomeCh(ch)} · quem estiver em outra chapa muda para esta`, (d) => !naMesa(ch, d.n) || ch.mesa[k] === d.n, (n, x) => { if (x === "vago") { delete ch.mesa[k]; return; } poeNaChapa(n, ch); for (const c in ch.com) ch.com[c] = ch.com[c].map((y) => y === n ? null : y); for (const c in ch.pres) if (ch.pres[c] === n) delete ch.pres[c]; ch.mesa[k] = n; }, ch.mesa[k] ? `<button class="bt" data-extra="vago">Deixar ${k} vago</button>` : ""); }
    if (ds.dep) { const n = ds.dep, d = dep(n); return escolher(d.u, "Escolha uma ação", () => false, (x, a) => { if (a === "duv") S.dep[n].duv = !S.dep[n].duv; if (a === "sai") { tiraDeTudo(n, ch); delete S.dep[n]; } }, `<button class="bt" data-extra="duv">${S.dep[n].duv ? "Tirar da dúvida (volta a contar)" : "Marcar como em dúvida (não conta voto)"}</button><button class="bt" data-extra="sai">Tirar da chapa</button>`); }
    if (ds.aliado) return escolher("Adicionar aliado", `${nomeCh(ch)}`, (d) => chDe(d.n) !== ch.id, (n) => poeNaChapa(n, ch));
    if (ds.bancada) { const ps = [...new Set(DEP.map((d) => d.p))]; return escolher("Bancada inteira", "Todos os deputados do partido entram nesta chapa", () => false, (x, p) => DEP.filter((d) => d.p === p).forEach((d) => poeNaChapa(d.n, ch)), ps.map((p) => `<button class="bt" data-extra="${esc(p)}">${esc(p)} · ${DEP.filter((d) => d.p === p).length}</button>`).join("")); }
    if (ds.q) { S.ui.qAb = !S.ui.qAb; return desenhar(); }
    if (ds.bl !== undefined) { const i = +ds.bl; if (S.blocos[i].length > 1 && S.ui.selB === null) { const b = S.blocos.splice(i, 1)[0]; b.forEach((p) => S.blocos.push([p])); } else if (S.ui.selB === null) S.ui.selB = i; else if (S.ui.selB === i) S.ui.selB = null; else { const a = S.blocos[S.ui.selB], c = S.blocos[i]; S.blocos = S.blocos.filter((_, k) => k !== S.ui.selB && k !== i); S.blocos.push(a.concat(c)); S.ui.selB = null; } S.blocos.sort((x, y) => nB(y) - nB(x)); return desenhar(); }
    if (ds.res) { S.reserva = ds.res; return desenhar(); }
    if (ds.pres) { e.stopPropagation(); const [c, n] = ds.pres.split("|"); if (ch.pres[c] === n) delete ch.pres[c]; else { for (const k in ch.pres) if (ch.pres[k] === n) delete ch.pres[k]; ch.pres[c] = n; } return desenhar(); }
    if (ds.vaga) { const [c, i] = ds.vaga.split("|"), bl = slotsCom(c)[+i]; return escolher(`${c} · vaga ${+i + 1}`, `Vaga do bloco <b>${esc(bl)}</b>. Membros da Mesa não ocupam vaga.`, (d) => !Object.values(S.chapas).some((x) => naMesa(x, d.n)) && !(ch.com[c] || []).includes(d.n), (n, x) => { if (x === "vago") { const o = ch.com[c][+i]; ch.com[c][+i] = null; if (ch.pres[c] === o) delete ch.pres[c]; return; } ch.com[c][+i] = n; }, (ch.com[c] || [])[+i] ? `<button class="bt" data-extra="vago">Deixar vaga</button>` : ""); }
    if (ds.com) { S.ui.comAb = S.ui.comAb === ds.com ? null : ds.com; return desenhar(); }
    if (ds.atrib) { const k = ds.atrib; return escolher(acento(k), `${nomeCh(ch)} · uma vez por chapa`, (d) => chDe(d.n) === ch.id, (n) => { ch.out[k] = n; }); }
    if (ds.desatrib) { delete ch.out[ds.desatrib]; return desenhar(); }
    if (ds.est) { S.ui.estAb = S.ui.estAb === ds.est ? null : ds.est; return desenhar(); }
    if (ds.mais) { S.ui.mais[ds.mais] = !S.ui.mais[ds.mais]; return desenhar(); }
    if (ds.gav) { S.ui.gav = !S.ui.gav; return desenhar(); }
    if (ds.po) { const c = ds.po; S.ui.pat = { col: c, dir: S.ui.pat.col === c ? -S.ui.pat.dir : (c === "nome" ? 1 : -1) }; return desenhar(); }
    if (ds.pat) { S.ui.patAb = S.ui.patAb === ds.pat ? null : ds.pat; return desenhar(); }
    if (ds.adm !== undefined) { supabaseClient.rpc("admin_definir_acesso_mesa", { p_email: $("#admEmail").value, p_liberar: ds.adm === "1" }).then(({ data, error }) => { $("#admMsg").textContent = error ? error.message : data; }); }
  };
  A.querySelectorAll("[data-conv]").forEach((inp) => inp.onchange = () => { const n = inp.dataset.conv; S.dep[n] = S.dep[n] || {}; S.dep[n].conv = Number(inp.value.replace(/\D/g, "")) || 0; desenhar(); });
}
iniciar();
