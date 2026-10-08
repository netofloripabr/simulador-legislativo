// Corrida da Mesa (protótipo 08/10/2026). Ver cabeçalho do mesa.html.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ni = (x) => Math.round(x).toLocaleString("pt-BR");
const CORES = ["#34E84A", "#5A86FF", "#FFA23E", "#E85AD0", "#2ED3F0", "#C6E62A"];
const MAIORIA = 21;
// catálogo provisório — substituído por dados/painel/alesc-estrutura.json quando existir
let CAT = {
  mesa: { rot: "Mesa Diretora", itens: ["1º Vice-Presidente", "2º Vice-Presidente", "1º Secretário", "2º Secretário", "3º Secretário", "4º Secretário"] },
  comissoes: { rot: "Presidência de comissão permanente", itens: ["Constituição e Justiça", "Finanças e Tributação", "Trabalho, Administração e Serviço Público", "Educação, Cultura e Desporto", "Saúde", "Agricultura e Política Rural", "Economia, Ciência, Tecnologia, Minas e Energia", "Transportes e Desenvolvimento Urbano", "Segurança Pública", "Direitos Humanos", "Turismo e Meio Ambiente", "Pesca e Aquicultura", "Ética e Decoro Parlamentar"] },
  alesc: { rot: "Estrutura da ALESC", itens: ["Diretoria Legislativa", "Diretoria Administrativa", "Diretoria de Comunicação Social", "Escola do Legislativo", "Procuradoria", "Coordenadoria de Imprensa", "TV ALESC", "Ouvidoria"] },
  gov1: { rot: "Governo · 1º escalão", itens: ["Secretaria de Estado (a definir)"] },
  gov2: { rot: "Governo · 2º escalão", itens: ["Autarquia / estatal (a definir)"] },
  gov3: { rot: "Governo · 3º escalão", itens: ["Regional / gerência (a definir)"] },
};
const LIVRES = [["conv", "Convênios (R$)", "valor em R$, ex.: 2.000.000"], ["outro", "Outro acordo", "ex.: apoio do partido, liderança"]];
let DEP = [], S;
const salvar = () => { try { localStorage.setItem("sl_mesa", JSON.stringify(S)); } catch (e) {} };

async function iniciar() {
  const d = await (await fetch("../dados/painel/sc-estadual.json?v=20261008a")).json();
  DEP = d.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => b.t - a.t).map((c) => ({ n: c.n, u: c.u, p: c.p, t: c.t, s: c.r > 0 ? `E-M · ${c.r}ª` : "E-QP" }));
  try { const e = await (await fetch("../dados/painel/alesc-estrutura.json")).json(); if (e && e.mesa) {
    const it = (l) => (l || []).map((x) => typeof x === "string" ? x : x.nome).filter(Boolean);
    CAT.mesa.itens = it(e.mesa.cargos).filter((x) => !/^presidente$/i.test(x));
    if (e.comissoes) CAT.comissoes.itens = it(e.comissoes);
    if (e.alesc) CAT.alesc.itens = e.alesc.flatMap((g) => it(g.itens).map((n) => `${n}`));
    if (e.governo) { CAT.gov1.itens = it(e.governo["1"]); CAT.gov2.itens = it(e.governo["2"]); CAT.gov3.itens = it(e.governo["3"]); }
  } } catch (e) { /* segue com o catálogo provisório */ }
  try { S = JSON.parse(localStorage.getItem("sl_mesa")); } catch (e) {}
  if (!S || !S.chapas) {
    S = { chapas: [{ id: "c1", cor: CORES[0], cand: DEP[0].n }, { id: "c2", cor: CORES[1], cand: DEP[1].n }], dep: {}, ativa: "c1", sel: DEP[0].n };
    S.dep[DEP[0].n] = { ch: "c1", ben: [] }; S.dep[DEP[1].n] = { ch: "c2", ben: [] };
  }
  desenhar();
}
const dep = (n) => DEP.find((d) => d.n === n);
const chapa = (id) => S.chapas.find((c) => c.id === id);
const votos = (id) => DEP.filter((d) => S.dep[d.n] && S.dep[d.n].ch === id && !S.dep[d.n].duv).length;
const foto = (n, u) => `<img src="../dados/fotos/sc-2026/estadual/${n}.jpg" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${esc((u || '?')[0])}'}))">`;
// item fixo já prometido por esta chapa? (uma vez por chapa)
function usadoNaChapa(chId, cat, nome) { for (const [n, x] of Object.entries(S.dep)) if (x.ch === chId) for (const b of x.ben) if (b.cat === cat && b.nome === nome) return n; return null; }

function desenhar() { placar(); plenario(); ficha(); comparar(); salvar(); }

function placar() {
  $("#placar").innerHTML = S.chapas.map((c, k) => { const d = dep(c.cand), v = votos(c.id);
    return `<div class="ch${S.ativa === c.id ? " on" : ""}${v >= MAIORIA ? " venc" : ""}" style="--c:${c.cor}" data-ch="${c.id}"><button class="x" data-del="${c.id}" title="Remover chapa">×</button>
      <div class="top"><div class="ft">${foto(d.n, d.u)}</div><div><div class="nm">${esc(d.u)}</div><div class="sub">Chapa ${k + 1} · ${esc(d.p)}</div></div></div>
      <div class="num"><b>${v}</b><span>de ${MAIORIA} necessários</span></div><div class="bar"><i style="width:${v / 40 * 100}%"></i></div></div>`; }).join("")
    + (S.chapas.length < CORES.length ? `<div class="ch nova" id="nova"><b style="font-size:22px">+</b>Nova chapa</div>` : "");
  const duv = DEP.filter((d) => S.dep[d.n] && S.dep[d.n].duv).length, ind = DEP.filter((d) => !S.dep[d.n] || !S.dep[d.n].ch).length;
  $("#resumo").innerHTML = S.chapas.map((c, k) => `<span><b style="color:${c.cor}">${votos(c.id)}</b> chapa ${k + 1}</span>`).join("<span>×</span>") + `<span>· <b>${duv}</b> em dúvida · <b>${ind}</b> indecisos</span>`;
  $("#placar").querySelectorAll("[data-ch]").forEach((e) => e.onclick = (ev) => { if (ev.target.closest("[data-del]")) return; S.ativa = e.dataset.ch; desenhar(); });
  $("#placar").querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { if (S.chapas.length < 2) return; const id = b.dataset.del; S.chapas = S.chapas.filter((c) => c.id !== id); Object.values(S.dep).forEach((x) => { if (x.ch === id) { x.ch = null; x.ben = []; x.duv = false; } }); S.ativa = S.chapas[0].id; desenhar(); });
  const nv = $("#nova"); if (nv) nv.onclick = () => { const livre = DEP.find((d) => !S.chapas.some((c) => c.cand === d.n)); const id = "c" + Date.now(); const cor = CORES.find((c) => !S.chapas.some((x) => x.cor === c)); S.chapas.push({ id, cor, cand: livre.n }); S.dep[livre.n] = { ch: id, ben: [] }; S.ativa = id; S.sel = livre.n; desenhar(); };
}

let ultimo = {};
function plenario() {
  // hemiciclo: 40 cadeiras em 4 fileiras (8, 9, 11, 12), ordenadas da esquerda para a direita pela chapa
  const filas = [8, 9, 11, 12], R = [150, 210, 270, 330], cx = 400, cy = 400;
  const ordemCh = (d) => { const x = S.dep[d.n]; const i = x && x.ch ? S.chapas.findIndex((c) => c.id === x.ch) : 99; return i * 2 + (x && x.duv ? 1 : 0); };
  const L = [...DEP].sort((a, b) => ordemCh(a) - ordemCh(b) || b.t - a.t);
  const pos = []; filas.forEach((n, f) => { for (let k = 0; k < n; k++) { const ang = Math.PI - (k + .5) / n * Math.PI; pos.push({ x: cx + R[f] * Math.cos(ang), y: cy - R[f] * Math.sin(ang), ang }); } });
  pos.sort((a, b) => b.ang - a.ang || a.y - b.y);
  let h = `<defs>${DEP.map((d) => `<clipPath id="cp${d.n}"><circle r="19"/></clipPath>`).join("")}<filter id="gl"><feGaussianBlur stdDeviation="5"/></filter></defs>`;
  L.forEach((d, i) => { const p = pos[i], x = S.dep[d.n], c = x && x.ch ? chapa(x.ch) : null, cor = c ? c.cor : "#3A3F45", pres = S.chapas.some((ch) => ch.cand === d.n);
    const mudou = ultimo[d.n] !== undefined && ultimo[d.n] !== (c ? c.id : null); ultimo[d.n] = c ? c.id : null;
    h += `<g class="seat${S.sel === d.n ? " sel" : ""}${x && x.duv ? " duv" : ""}" data-n="${d.n}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><g class="in">
      ${c && !(x && x.duv) ? `<circle r="22" fill="${cor}" opacity=".35" filter="url(#gl)"/>` : ""}
      <circle r="21" fill="#1B2022"/><image href="../dados/fotos/sc-2026/estadual/${d.n}.jpg" x="-19" y="-19" width="38" height="38" preserveAspectRatio="xMidYMin slice" clip-path="url(#cp${d.n})" opacity="${c ? 1 : .45}"/>
      <circle class="ring" r="21" fill="none" stroke="${cor}" stroke-width="${c ? 3 : 1.5}"/>
      ${pres ? `<circle r="7" cx="15" cy="-15" fill="${cor}" stroke="#14191A" stroke-width="2"/><text x="15" y="-12" text-anchor="middle" font-size="8" font-weight="900" fill="#0B0D0E">P</text>` : ""}
      ${mudou ? `<circle class="onda" r="22" stroke="${cor}"/>` : ""}
      <title>${esc(d.u)} · ${esc(d.p)}</title></g></g>`; });
  $("#plen").innerHTML = h;
  $("#plen").querySelectorAll(".seat").forEach((g) => g.onclick = () => { S.sel = g.dataset.n; desenhar(); });
  const lider = [...S.chapas].sort((a, b) => votos(b.id) - votos(a.id))[0], vl = votos(lider.id);
  $("#meio").innerHTML = "";
  $("#plen").insertAdjacentHTML("beforeend", `<text x="400" y="378" text-anchor="middle" font-size="58" font-weight="900" letter-spacing="-3" fill="${lider.cor}">${vl}<tspan font-size="24" fill="#6B7178" letter-spacing="0"> / ${MAIORIA}</tspan></text><text x="400" y="408" text-anchor="middle" font-size="12" letter-spacing="2" fill="#6B7178">${(vl >= MAIORIA ? "MAIORIA FORMADA" : `FALTAM ${MAIORIA - vl} PARA ${esc(dep(lider.cand).u.split(" ")[0]).toUpperCase()}`)}</text>`);
  $("#leg").innerHTML = S.chapas.map((c, k) => `<span><i style="background:${c.cor}"></i>Chapa ${k + 1}</span>`).join("") + `<span><i style="border:1.5px dashed #A9AEB3"></i>em dúvida</span><span><i style="background:#3A3F45"></i>indeciso</span><span><b style="color:var(--texto)">P</b> candidato à Presidência</span>`;
}

function ficha() {
  const d = dep(S.sel); if (!d) { $("#fic").innerHTML = `<p class="dica">Toque numa cadeira.</p>`; return; }
  const x = S.dep[d.n] = S.dep[d.n] || { ch: null, ben: [] }, c = x.ch ? chapa(x.ch) : null, pres = S.chapas.find((ch) => ch.cand === d.n);
  let h = `<div style="display:flex;gap:12px;align-items:center"><div class="ch" style="flex:none;padding:0;border:0;background:none;cursor:default;--c:${c ? c.cor : "#3A3F45"}"><div class="ft" style="width:56px;height:56px">${foto(d.n, d.u)}</div></div><div><h2>${esc(d.u)}</h2><div class="sub">${esc(d.p)} · ${ni(d.t)} votos · ${d.s}</div></div></div>
    <h3>Vota em</h3><div class="chips">${S.chapas.map((ch, k) => `<button data-v="${ch.id}" class="${x.ch === ch.id ? "on" : ""}" style="--c:${ch.cor}"${pres && pres.id !== ch.id ? " disabled" : ""}>Chapa ${k + 1}</button>`).join("")}<button data-v="" class="${!x.ch ? "on" : ""}">Indeciso</button></div>`;
  if (x.ch && !pres) h += `<div class="chips" style="margin-top:8px"><button data-duv="1" class="${x.duv ? "on" : ""}" style="--c:#A9AEB3">${x.duv ? "Em dúvida (não conta)" : "Marcar como em dúvida"}</button></div>`;
  if (!pres) h += `<div class="chips" style="margin-top:8px"><button data-pres="1" style="--c:${c ? c.cor : "#A9AEB3"}">Lançar como candidato à Presidência</button></div>`;
  else h += `<p class="dica" style="margin-top:8px">Candidato à Presidência da chapa ${S.chapas.indexOf(pres) + 1}.</p>`;
  if (x.ch) {
    h += `<h3>O que recebe</h3>${x.ben.length ? x.ben.map((b, i) => `<div class="ben"><span>${esc(b.nome)}<small>${esc(b.rot)}${b.valor ? " · " + esc(b.valor) : ""}</small></span><button data-rm="${i}">×</button></div>`).join("") : `<p class="dica">Nada atribuído ainda.</p>`}
      <h3>Atribuir</h3>${Object.entries(CAT).map(([k, g]) => `<details class="cat"><summary>${g.rot}<span>uma vez por chapa</span></summary>${g.itens.map((it) => { const u = usadoNaChapa(x.ch, k, it); return `<button class="it" data-cat="${k}" data-it="${esc(it)}"${u ? " disabled" : ""}><span>${esc(it)}</span>${u ? `<small>com ${esc(dep(u).u)}</small>` : ""}</button>`; }).join("")}</details>`).join("")}
      ${LIVRES.map(([k, r, ph]) => `<details class="cat"><summary>${r}<span>livre</span></summary><div class="livre"><input id="lv-${k}" placeholder="${ph}"><button data-lv="${k}">Adicionar</button></div></details>`).join("")}`;
  }
  $("#fic").innerHTML = h;
  const F = $("#fic");
  F.querySelectorAll("[data-v]").forEach((b) => b.onclick = () => { const v = b.dataset.v || null; if (x.ch !== v) x.ben = []; x.ch = v; x.duv = false; desenhar(); });
  F.querySelectorAll("[data-duv]").forEach((b) => b.onclick = () => { x.duv = !x.duv; desenhar(); });
  F.querySelectorAll("[data-pres]").forEach((b) => b.onclick = () => { if (!x.ch) { x.ch = S.ativa; } chapa(x.ch).cand = d.n; x.duv = false; desenhar(); });
  F.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { x.ben.splice(+b.dataset.rm, 1); desenhar(); });
  F.querySelectorAll("[data-cat]").forEach((b) => b.onclick = () => { x.ben.push({ cat: b.dataset.cat, nome: b.dataset.it, rot: CAT[b.dataset.cat].rot }); desenhar(); });
  F.querySelectorAll("[data-lv]").forEach((b) => b.onclick = () => { const k = b.dataset.lv, v = $("#lv-" + k).value.trim(); if (!v) return; x.ben.push(k === "conv" ? { cat: k, nome: "Convênios", rot: "R$", valor: "R$ " + v } : { cat: k, nome: v, rot: "Outro acordo" }); desenhar(); });
}

function comparar() {
  const conv = (id) => DEP.reduce((s, d) => { const x = S.dep[d.n]; if (!x || x.ch !== id) return s; return s + x.ben.filter((b) => b.cat === "conv").reduce((t, b) => t + (Number(String(b.valor).replace(/\D/g, "")) || 0), 0); }, 0);
  const cont = (id, cats) => DEP.reduce((s, d) => { const x = S.dep[d.n]; return x && x.ch === id ? s + x.ben.filter((b) => cats.includes(b.cat)).length : s; }, 0);
  $("#cmp").innerHTML = `<table><tr><th>Projeto</th><th>Votos</th><th>Em dúvida</th><th>Mesa</th><th>Comissões</th><th>Estrutura ALESC</th><th>Governo</th><th>Convênios</th></tr>${S.chapas.map((c, k) => { const dv = DEP.filter((d) => S.dep[d.n] && S.dep[d.n].ch === c.id && S.dep[d.n].duv).length;
    return `<tr style="--c:${c.cor}"><td><b>Chapa ${k + 1}</b> · ${esc(dep(c.cand).u)}</td><td><b>${votos(c.id)}</b></td><td>${dv}</td><td>${cont(c.id, ["mesa"])}/${CAT.mesa.itens.length}</td><td>${cont(c.id, ["comissoes"])}</td><td>${cont(c.id, ["alesc"])}</td><td>${cont(c.id, ["gov1", "gov2", "gov3"])}</td><td>R$ ${ni(conv(c.id))}</td></tr>`; }).join("")}</table>`;
}
iniciar();
