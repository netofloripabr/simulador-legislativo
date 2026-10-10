// Parlamentares — protótipo (10/10/2026). Seleção por rolagem → perfil em seções sanfona.
// Dados: dados/painel (sc-base, sc-estadual); a "Consulta detalhada" embute o Painel (index.html?embed=1).
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x).toLocaleString("pt-BR"), nf = (x, d = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const DV = "20261008a";
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
// cor de destaque por partido (identidade de cada legenda, ajustada para fundo escuro)
const COR_P = { "NOVO": "#F37021", "PL": "#3D7BFF", "PT/PC do B/PV": "#E5383B", "MDB": "#34C759", "UNIÃO/PP": "#2FB5E8", "PSD": "#F2C230", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PDT": "#E5484D", "PSOL/REDE": "#F5B700" };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
const tingir = (cor) => { document.documentElement.style.setProperty("--a", cor); document.documentElement.style.setProperty("--a-rgb", hexRgb(cor)); };
let M, N, CONT, D, VAL, AB = { votos: 1 }, CTX = "regiao";

async function carregar() {
  const [b, d] = await Promise.all([fetch(`../dados/painel/sc-base.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/sc-estadual.json?v=${DV}`).then((r) => r.json())]);
  M = b.mun; N = M.length; CONT = b.contorno; D = d; VAL = d.val.reduce((s, x) => s + x, 0);
}
const eleitos = () => D.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => b.t - a.t);

// ---------------- seleção por rolagem ----------------
function telaSelecao(foco) {
  const E = eleitos();
  $("#app").innerHTML = `<div class="sel"><div class="wrap" style="text-align:center"><div class="olho">Legislatura 2027–2031 · ${E.length} parlamentares</div></div>
    <div class="faixa" id="faixa">${E.map((c) => `<button class="perf" data-n="${c.n}" style="--pc:${COR_P[c.p] || "#8A9096"}"><img src="${foto(c.n)}" alt=""><div class="tx"><b>${esc(c.u)}</b><span>${esc(c.p)}</span></div></button>`).join("")}</div>
    <div class="wrap selinfo"><div class="nm" id="snm"></div><div class="pt" id="spt"></div><button class="btn" id="sabrir">Abrir perfil</button><div style="height:18px"></div><input class="busca" id="busca" placeholder="Buscar parlamentar ou partido"></div></div>`;
  const fx = $("#faixa"), cards = [...fx.children];
  let atual = null;
  const marcar = (b) => { if (!b || b === atual) return; atual = b; cards.forEach((x) => x.classList.toggle("on", x === b)); const c = D.c.find((x) => x.n === b.dataset.n); $("#snm").textContent = c.u; $("#spt").textContent = `${c.p} · ${ni(c.t)} votos · ${c.s}`; tingir(COR_P[c.p] || "#34E84A"); };
  const centro = () => { const m = fx.getBoundingClientRect().left + fx.clientWidth / 2; marcar(cards.reduce((a, b) => Math.abs(b.getBoundingClientRect().left + b.offsetWidth / 2 - m) < Math.abs(a.getBoundingClientRect().left + a.offsetWidth / 2 - m) ? b : a)); };
  fx.addEventListener("scroll", () => requestAnimationFrame(centro), { passive: true });
  fx.addEventListener("wheel", (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); fx.scrollBy({ left: e.deltaY * 1.2 }); } }, { passive: false });
  fx.onclick = (e) => { const b = e.target.closest(".perf"); if (!b) return; if (b === atual) return ir(b.dataset.n); b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); };
  $("#sabrir").onclick = () => atual && ir(atual.dataset.n);
  $("#busca").oninput = (e) => { const q = e.target.value.toLowerCase(), b = q && cards.find((x) => x.textContent.toLowerCase().includes(q)); if (b) b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); };
  const ini = cards.find((b) => b.dataset.n === foco) || cards[0]; ini.scrollIntoView({ inline: "center", block: "nearest" }); marcar(ini);
}
const ir = (n) => { history.pushState(null, "", "?d=" + n); perfil(n); };

// ---------------- perfil: seções em sanfona ----------------
function perfil(n) {
  const c = D.c.find((x) => x.n === n); if (!c) return telaSelecao();
  tingir(COR_P[c.p] || "#34E84A");
  const E = eleitos(), pos = E.findIndex((x) => x.n === n) + 1;
  const SEC = [["votos", "Onde estão seus votos", `${ni(c.t)} votos · ${pos}º entre os eleitos`], ["politica", "Estrutura política", "Mesa, comissões, lideranças"], ["calendario", "Calendário do mandato", "posse, Mesa, comissões, sessões e recessos"], ["plenario", "Plenário e processo legislativo", "votação, quórum, prazos, medida provisória"], ["gabinete", "Gabinete", "simulador de nomeações e saldo"], ["estrutura", "Subsídio e estrutura", "subsídio, verbas, escritório regional"]];
  $("#app").innerHTML = `<div class="wrap"><div class="cab"><img src="${foto(n)}" alt=""><div><h1>${esc(c.u)}</h1><div class="pt">${esc(c.p)} · Deputado estadual · ${esc(c.s)}</div></div><button class="btn sec" id="trocar">Trocar parlamentar</button></div>
    ${SEC.map(([k, t, i]) => `<button class="sanf${AB[k] ? " on" : ""}" data-sec="${k}"><span>${esc(t)}</span><i>${esc(i)}</i><em>${AB[k] ? "−" : "+"}</em></button>${AB[k] ? `<div class="corpo" id="c-${k}"></div>` : ""}`).join("")}<div style="height:60px"></div></div>`;
  $("#trocar").onclick = () => { history.pushState(null, "", location.pathname); telaSelecao(n); };
  document.querySelectorAll("[data-sec]").forEach((b) => b.onclick = () => { AB[b.dataset.sec] = !AB[b.dataset.sec]; const y = scrollY; perfil(n); scrollTo(0, y); });
  if (AB.votos) secVotos(c);
  ["politica", "calendario", "plenario", "gabinete", "estrutura"].forEach((k) => { if (AB[k]) $("#c-" + k).innerHTML = `<div class="breve">Em construção.</div>`; });
}

// "Onde estão seus votos": contextos prontos + consulta detalhada (Painel embutido, fechada por padrão)
function secVotos(c) {
  const idx = [...Array(N).keys()], ordM = idx.filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]), base = M[ordM[0]], reg = base.meso;
  const somaR = (x) => idx.reduce((s, i) => s + (M[i].meso === reg ? x.v[i] || 0 : 0), 0);
  const C = {
    regiao: ["Mais votados na sua região", () => { const L = D.c.map((x) => ({ x, v: somaR(x) })).filter((o) => o.v).sort((a, b) => b.v - a.v), p = L.findIndex((o) => o.x.n === c.n);
      return [`Região ${reg}`, `Você é o ${p + 1}º mais votado da região, com ${ni(L[p].v)} votos (${nf(L[p].v / c.t * 100)}% da sua votação).`, lista(L.slice(0, 10).concat(p >= 10 ? [L[p]] : []), (o) => o.x, (o) => o.v, c, L), mapa(c, (i) => M[i].meso === reg)]; }],
    legenda: ["Ranking da sua legenda", () => { const L = D.c.filter((x) => x.p === c.p).sort((a, b) => b.t - a.t), p = L.findIndex((x) => x.n === c.n), tot = L.reduce((s, x) => s + x.t, 0);
      return [`${c.p} · ${L.length} candidatos`, `${p + 1}º da legenda, com ${nf(c.t / tot * 100)}% dos ${ni(tot)} votos nominais do ${c.p}.`, lista(L.slice(0, 12).map((x) => ({ x, v: x.t })), (o) => o.x, (o) => o.v, c, L.map((x) => ({ x }))), mapa(c, () => true)]; }],
    base: ["Sua cidade-base", () => { const i0 = ordM[0], L = D.c.map((x) => ({ x, v: x.v[i0] || 0 })).filter((o) => o.v).sort((a, b) => b.v - a.v), p = L.findIndex((o) => o.x.n === c.n);
      return [base.n, `${ni(c.v[i0])} votos: ${nf(c.v[i0] / c.t * 100)}% da sua votação e ${nf(c.v[i0] / D.val[i0] * 100)}% dos válidos da cidade — ${p + 1}º lugar em ${base.n}.`, lista(L.slice(0, 10).concat(p >= 10 ? [L[p]] : []), (o) => o.x, (o) => o.v, c, L), mapa(c, (i) => i === i0)]; }],
    cidades: ["Suas cidades", () => [`${ordM.length} municípios com voto`, `As cidades que mais votaram em você. ${nf(ordM.length / N * 100, 0)}% dos municípios de SC.`, lista(ordM.slice(0, 12).map((i) => ({ nm: M[i].n, v: c.v[i] })), null, (o) => o.v, c), mapa(c, () => true)]],
    estado: ["No estado", () => { const p = E0().findIndex((x) => x.n === c.n);
      return ["Santa Catarina · 40 eleitos", `${p + 1}º entre os eleitos, ${nf(c.t / VAL * 100, 2)}% dos votos válidos. ${esc(c.s)}.`, lista(E0().slice(Math.max(0, p - 4), p + 5).map((x) => ({ x, v: x.t })), (o) => o.x, (o) => o.v, c, E0().map((x) => ({ x }))), mapa(c, () => true)]; }],
  };
  const [tit, txt, lst, mp] = C[CTX][1]();
  $("#c-votos").innerHTML = `<div class="ctx">${Object.entries(C).map(([k, [r]]) => `<button class="${k === CTX ? "on" : ""}" data-ctx="${k}">${esc(r)}</button>`).join("")}</div>
    <div class="quadro"><div><div class="olho">${esc(C[CTX][0])}</div><h3>${esc(tit)}</h3><p>${txt}</p>${lst}</div><div>${mp}</div></div>
    <button class="sanf sub${AB.consulta ? " on" : ""}" data-cons="1" style="margin-top:16px"><span>Consulta detalhada</span><i>Painel completo: mapa, distribuição, perfil das cidades, comparação</i><em>${AB.consulta ? "−" : "+"}</em></button>
    ${AB.consulta ? `<iframe class="emb" src="index.html?embed=1&cargo=estadual&a=${c.n}" loading="lazy"></iframe>` : ""}`;
  document.querySelectorAll("[data-ctx]").forEach((b) => b.onclick = () => { CTX = b.dataset.ctx; secVotos(c); });
  $("[data-cons]").onclick = () => { AB.consulta = !AB.consulta; secVotos(c); };
}
const E0 = () => eleitos();
// lista de ranking com o deputado em destaque (posição real mesmo quando aparece no fim)
function lista(L, cand, val, c, todos) {
  return `<ol class="rank">${L.map((o) => { const x = cand ? cand(o) : null, eu = x && x.n === c.n, p = x && todos ? todos.findIndex((t) => (t.x || t).n === x.n) + 1 : L.indexOf(o) + 1;
    return `<li class="${eu ? "eu" : ""}"><i>${p}º</i><span>${esc(x ? x.u : o.nm)}${x ? ` <small>${esc(x.p)}</small>` : ""}</span><b>${ni(val(o))}</b></li>`; }).join("")}</ol>`;
}
// mapa de SC com bolhas do deputado; destaque = filtro (região, cidade, estado)
function mapa(c, dentro) {
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; CONT.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 640, S = W / ((lo1 - lo0) * K), H = (la0 - la1) * S, P = (lo, la) => [(lo - lo0) * K * S, (la0 - la) * S];
  const pth = (an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("");
  const fundo = CONT.map((an, i) => `<path d="${pth(an)}" fill="${dentro(i) ? "rgba(var(--a-rgb),.12)" : "rgba(242,244,245,.03)"}" stroke="${dentro(i) ? "rgba(var(--a-rgb),.4)" : "rgba(242,244,245,.07)"}" stroke-width=".6"/>`).join("");
  const mx = Math.max(...c.v);
  const bol = [...Array(N).keys()].filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]).map((i) => { const [x, y] = P(M[i].lon, M[i].lat), r = 2 + 22 * Math.sqrt(c.v[i] / mx), on = dentro(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(var(--a-rgb),${on ? .55 : .14})" stroke="${on ? "var(--a)" : "rgba(var(--a-rgb),.3)"}" stroke-width=".8"><title>${esc(M[i].n)}: ${ni(c.v[i])}</title></circle>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}"><defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>${fundo}<g filter="url(#gl)" opacity=".5">${bol}</g>${bol}</svg>`;
}

(async () => {
  await carregar();
  const d = new URLSearchParams(location.search).get("d");
  d ? perfil(d) : telaSelecao();
  addEventListener("popstate", () => { const x = new URLSearchParams(location.search).get("d"); x ? perfil(x) : telaSelecao(); });
})();
