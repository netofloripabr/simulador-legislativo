// Parlamentares — protótipo (10/10/2026). Roda de nomes → perfil em três seções:
// 01 Eleitoral (capa com mapa + Painel embutido com filtros prontos), 02 Processo legislativo, 03 Administrativo.
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ni = (x) => Math.round(x).toLocaleString("pt-BR"), nf = (x, d = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fm = (v) => "R$ " + (v >= 1e6 ? nf(v / 1e6, 2) + " mi" : v >= 1e3 ? nf(v / 1e3, 1).replace(/,0$/, "") + " mil" : ni(v));
const DV = "20261008a";
const foto = (n) => `../dados/fotos/sc-2026/estadual/${n}.jpg`;
// cor de destaque por partido (identidade de cada legenda, ajustada para fundo escuro)
const COR_P = { "NOVO": "#F37021", "PL": "#3D7BFF", "PT/PC do B/PV": "#E5383B", "MDB": "#34C759", "UNIÃO/PP": "#2FB5E8", "PSD": "#F2C230", "REPUBLICANOS": "#4D8DFF", "PODE": "#3FB37F", "PDT": "#E5484D", "PSOL/REDE": "#F5B700" };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
const tingir = (cor) => { document.documentElement.style.setProperty("--a", cor); document.documentElement.style.setProperty("--a-rgb", hexRgb(cor)); };
let M, N, CONT, D, VAL, EST, A22 = {}, AB = { painel: 0 };
// índices de vencimento PL/GAB, níveis 1–120 (Res. 002/2006, Anexo VII-E); salário = índice × R$ 296,55 (contracheques 09/2026)
const GAB_IDX = [1.6863,1.7441,1.8039,1.8658,1.9298,1.9959,2.0644,2.1352,2.2084,2.2841,2.3624,2.4434,2.5272,2.6139,2.7035,2.7962,2.8992,2.9912,3.0938,3.1999,3.3096,3.4231,3.5405,3.6619,3.7875,3.9173,4.0517,4.1906,4.3343,4.4829,4.6366,4.7956,4.9600,5.1301,5.3060,5.4879,5.6761,5.8708,6.0721,6.2803,6.4956,6.7184,6.9487,7.1870,7.4334,7.6890,7.9527,8.2253,8.5074,8.7991,9.1008,9.4129,9.7356,10.0695,10.4147,10.7718,11.1412,11.5232,11.9183,12.3270,12.7498,13.1871,13.6394,14.1072,15.0901,15.6077,16.1430,16.6967,17.2694,17.8617,18.9334,20.0694,21.2735,22.5499,23.9029,25.6503,27.3976,29.1449,30.8922,32.6395,34.3868,36.1341,37.8814,39.6287,41.3760,43.1233,44.8706,46.6179,48.3652,50.1125,51.8598,53.6071,55.3544,57.1017,58.8490,60.5963,62.3436,64.0909,65.8382,67.5873,69.3364,71.0855,72.8346,74.5837,76.3328,78.0819,79.8310,81.5801,83.3292,85.0783,86.8274,88.5765,90.3256,92.0747,93.8238,95.5729,97.3220,99.0711,100.8202,102.5693], GAB_VAL = 296.55, COTA_GAB = 525.27 * 296.55;

async function carregar() {
  const [b, d, e] = await Promise.all([fetch(`../dados/painel/sc-base.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/sc-estadual.json?v=${DV}`).then((r) => r.json()), fetch(`../dados/painel/mesa-estruturas.json?v=11`).then((r) => r.json()).catch(() => ({}))]);
  A22 = await fetch(`../dados/painel/alesc-2022.json?v=1`).then((r) => r.json()).catch(() => ({}));
  M = b.mun; N = M.length; CONT = b.contorno; D = d; EST = e; VAL = d.val.reduce((s, x) => s + x, 0);
}
const eleitos = () => D.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => b.t - a.t);

// ---------------- entrada: roda de nomes (ordem alfabética; o do centro em destaque, os demais menores e desfocados) ----------------
function telaSelecao(foco) {
  $(".topo .sep").textContent = "Parlamentares · 2027–2031"; $(".topo .sep").onclick = null; $(".topo .sep").style.cursor = ""; $(".topo .secs") && $(".topo .secs").remove(); $(".vistas").innerHTML = `<a href="./">Painel</a><a href="mesa.html">Corrida da Mesa</a><a href="novos.html" class="on">Parlamentares</a>`;
  const E = eleitos().sort((a, b) => a.u.localeCompare(b.u, "pt-BR"));
  $("#app").innerHTML = `<div class="roda" id="roda"><ol>${E.map((c) => `<li data-n="${c.n}">${esc(c.u)}</li>`).join("")}</ol></div>
    <div class="rodainfo"><div class="pt" id="spt"></div><button class="btn" id="sabrir">Abrir</button><div class="dica">role para escolher · ${E.length} parlamentares eleitos</div></div>`;
  const rd = $("#roda"), L = [...rd.querySelectorAll("li")];
  let atual = null;
  const pintar = () => { const m = rd.getBoundingClientRect().top + rd.clientHeight / 2, h = L[0].offsetHeight || 60; let melhor = null, dm = 1e9;
    L.forEach((li) => { const r = li.getBoundingClientRect(), d = (r.top + r.height / 2 - m) / h, a = Math.abs(d); if (a < dm) { dm = a; melhor = li; }
      li.style.transform = `scale(${Math.max(.5, 1 - a * .125)})`; li.style.filter = a < .5 ? "none" : `blur(${Math.min(6, (a - .4) * 1.4).toFixed(2)}px)`; li.style.opacity = a > 4.5 ? 0 : Math.max(.12, 1 - a * .2); });
    if (melhor !== atual) { atual = melhor; L.forEach((x) => x.classList.toggle("on", x === atual)); const c = D.c.find((x) => x.n === atual.dataset.n); $("#spt").textContent = `${c.p} · ${ni(c.t)} votos`; tingir(COR_P[c.p] || "#34E84A"); } };
  rd.addEventListener("scroll", () => requestAnimationFrame(pintar), { passive: true });
  rd.onclick = (e) => { const li = e.target.closest("li"); if (!li) return; if (li === atual) return ir(li.dataset.n); li.scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("#sabrir").onclick = () => atual && ir(atual.dataset.n);
  onkeydown = (e) => { if (!$("#roda")) return; if (e.key === "Enter" && atual) ir(atual.dataset.n); if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const k = L.indexOf(atual) + (e.key === "ArrowDown" ? 1 : -1); if (L[k]) L[k].scrollIntoView({ behavior: "smooth", block: "center" }); } };
  (L.find((x) => x.dataset.n === foco) || L[0]).scrollIntoView({ block: "center" }); pintar();
}
const ir = (n) => { history.pushState(null, "", "?d=" + n); perfil(n); };

// ---------------- perfil ----------------
function perfil(n) {
  const c = D.c.find((x) => x.n === n); if (!c) return telaSelecao();
  tingir(COR_P[c.p] || "#34E84A");
  const E = eleitos(), pos = E.findIndex((x) => x.n === n) + 1, idx = [...Array(N).keys()], ordM = idx.filter((i) => c.v[i]).sort((a, b) => c.v[b] - c.v[a]), i0 = ordM[0];
  const posBase = D.c.filter((x) => (x.v[i0] || 0) > c.v[i0]).length + 1, pctMax = Math.max(...idx.map((i) => D.val[i] ? c.v[i] / D.val[i] : 0)), iPct = idx.find((i) => D.val[i] && c.v[i] / D.val[i] === pctMax);
  const nm = c.u.split(" ");
  $("#app").innerHTML = `<section class="hero" id="hero"><div class="luz"></div><canvas id="heroCv"></canvas><div id="etqs"></div>
    <div class="txt"><img class="ftp" src="${foto(n)}" alt=""><div class="olho" style="margin-top:14px">Eleições 2026 · Deputado estadual · ${esc(c.p)}</div><h1>${esc(nm.length > 1 ? nm.slice(0, -1).join(" ") : c.u)}<i>${esc(nm.length > 1 ? nm.slice(-1)[0] + "." : "")}</i></h1>
    <div class="pops">${[[ni(c.t), "votos", 1], [`${pos}º`, "entre os 40 eleitos"], [`${nf(c.t / VAL * 100, 2)}%`, "dos válidos"], [`${posBase}º`, "em " + M[i0].n], [`${nf(pctMax * 100)}%`, "em " + M[iPct].n + ", seu maior índice"], [ordM.length, "municípios com voto"]].map(([v, r, a], k) => `<div style="animation-delay:${.5 + k * .55}s"><b class="${a ? "a" : ""}">${esc(v)}</b><span>${esc(r)}</span></div>`).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:22px"><button class="btn" id="caderno">Imprimir caderno</button><button class="btn sec" id="trocar">Trocar parlamentar</button></div></div></section>
    ${secEleitoral(c)}${secLegislativo(c)}${secAdministrativo(c)}`;
  $("#trocar").onclick = () => { history.pushState(null, "", location.pathname); telaSelecao(n); };
  $(".topo .sep").textContent = c.u; $(".topo .sep").style.cursor = "pointer"; $(".topo .sep").title = "Trocar parlamentar"; $(".topo .sep").onclick = () => { history.pushState(null, "", location.pathname); telaSelecao(c.n); }; const sx = $(".topo .secs") || $(".topo .sep").insertAdjacentElement("afterend", Object.assign(document.createElement("nav"), { className: "secs" })); sx.innerHTML = `<a href="#s1" data-s="s1">Eleitoral</a><a href="#s2" data-s="s2">Legislativo</a><a href="#s3" data-s="s3">Administrativo</a>`;
  $(".vistas").innerHTML = `<a href="./">Painel</a><a href="mesa.html">Corrida da Mesa</a><a href="novos.html" class="on0">Parlamentares</a>`;
  heroMapa(c, ordM); ligarEleitoral(c, ordM); ligarPolitica(c); ligarGabinete(c); revelar(); scrollTo(0, 0);
  $("#caderno").onclick = () => caderno(c, ordM);
}
const cabSec = (id, num, tit, lead) => `<section class="secao" id="${id}"><div class="wrap"><div class="tag rv"><button class="tg" data-tg="${id}" title="Recolher ou abrir">−</button><h2>${tit}</h2><p class="lead">${lead}</p></div><div class="corpoSec" id="cs-${id}">`;
const ROT = { s1: "Eleitoral", s2: "Legislativo", s3: "Administrativo" };
const seta = (alvo, rot) => `<button class="seta" data-ir="${alvo}" title="Próxima etapa"><b>↓</b><span>${esc(rot)}</span></button>`;
const fimSec = () => `</div></div></section>`;

// 01 · Eleitoral: Painel completo embutido (sanfona aberta) com filtros prontos
function secEleitoral(c) {
  return `<section class="secao s1" id="s1"><div class="wrap"><div class="rv"><button class="sanf esq${AB.painel ? " on" : ""}" data-sec="painel"><em>${AB.painel ? "−" : "+"}</em><span>Painel eleitoral</span><i>mapa, distribuição, perfil das cidades, comparação, ranking</i></button>
    <div id="c-painel"${AB.painel ? "" : " hidden"}><div class="elg"><iframe class="emb" id="emb" src="index.html?embed=1&cargo=estadual&a=${c.n}&cor=${encodeURIComponent((COR_P[c.p] || "#34E84A").slice(1))}"></iframe><aside class="cid" id="cid" hidden></aside></div></div></div></div></section>`;
}
function ligarEleitoral(c, ordM) {
  const base = M[ordM[0]], reg = base.meso, leg = D.c.filter((x) => x.p === c.p && x.n !== c.n).sort((a, b) => b.t - a.t)[0], E = eleitos(), k = E.findIndex((x) => x.n === c.n), viz = E[k ? k - 1 : 1];
  const P = [["Estado", { rec: null, b: null, lente: "mapa" }], [reg.replace(" Catarinense", ""), { rec: { tipo: "meso", nome: reg }, b: null, lente: "mapa" }], [`Microrregião de ${base.micro}`, { rec: { tipo: "micro", nome: base.micro }, b: null, lente: "mapa" }],
    c.v22 && ["2022 → 2026", { rec: null, b: null, lente: "d22" }]].filter(Boolean);
  const chipsHtml = P.map(([r], i) => `<button data-p="${i}">${esc(r)}</button>`).join("");
  const fr = $("#emb"); fr.onload = () => { const dd = fr.contentDocument, w = fr.contentWindow, cor = getComputedStyle(document.documentElement).getPropertyValue("--a").trim();
    // etiquetas de filtros prontos na mesma linha dos filtros; setas entre as subseções; cabeçalho compacto
    dd.head.insertAdjacentHTML("beforeend", `<style>.presets{ display:flex; gap:6px; flex-wrap:wrap; flex:1 1 auto; } html.embed #cv{ transition:transform .7s cubic-bezier(.2,1.4,.4,1), opacity .5s; } html.embed #cv.troca{ transform:scale(.94); opacity:.25; transition:none; } .presets button{ font:600 12.5px "Inter"; padding:7px 12px; border-radius:999px; border:1px solid var(--linha); background:none; color:var(--sec); cursor:pointer; white-space:nowrap; } .presets button.on{ color:#0B0D0E; background:${cor}; border-color:${cor}; }
      html.embed .barra-sel{ padding:8px 12px; } html.embed .cand{ padding:5px 8px; } html.embed .cand .ft{ width:34px; height:34px; } html.embed .filtros{ flex-wrap:wrap; gap:8px; } .setaE{ display:flex; align-items:center; gap:10px; margin:18px auto 6px; background:none; border:0; cursor:pointer; color:${cor}; font:600 12px "Inter"; letter-spacing:.12em; text-transform:uppercase; } .setaE b{ width:34px; height:34px; border-radius:50%; border:1px solid ${cor}; display:flex; align-items:center; justify-content:center; font-size:16px; } .setaE span{ color:#8A9096; } html.embed #ranking .rk-cab{ display:none; } html.embed #ranking.fech > :not(.rkH){ display:none; } html.embed #ranking .rkH{ margin-bottom:12px; } html.embed #ranking.embRk{ margin-top:-28px; }</style>`);
    dd.addEventListener("click", (e) => { const t = e.target.closest(".tgTab"); if (!t) return; const tb = t.closest("#ranking") || dd.querySelector("#tabela"), f = tb.classList.toggle("fech"); t.textContent = f ? "+" : "−"; });
    const fl = dd.querySelector("#painel .filtros"); if (fl && !dd.querySelector(".presets")) { (dd.querySelector("#recBusca") || fl.querySelector(".btn-rel")).insertAdjacentHTML(dd.querySelector("#recBusca") ? "afterend" : "beforebegin", `<div class="presets">${chipsHtml}</div>`);
      dd.querySelector(".presets").onclick = (e) => { const b = e.target.closest("[data-p]"); if (!b) return; dd.querySelectorAll(".presets button").forEach((x) => x.classList.toggle("on", x === b)); const y0 = scrollY, cvx = dd.querySelector("#cv"); cvx && cvx.classList.add("troca"); w.painelPreset(P[+b.dataset.p][1]); requestAnimationFrame(() => { scrollTo({ top: y0, behavior: "instant" }); cvx && requestAnimationFrame(() => cvx.classList.remove("troca")); }); setTimeout(() => scrollTo({ top: y0, behavior: "instant" }), 120); }; }
    const rk = dd.querySelector("#ranking"); if (rk && rk.hidden) { rk.hidden = false; rk.classList.add("embRk", "fech"); rk.insertAdjacentHTML("afterbegin", `<section class="tabela rkH"><h3><button class="tgTab" title="Recolher ou abrir">+</button>Ranking dos candidatos</h3></section>`); const tb0 = dd.querySelector("#tabela"); if (tb0) { tb0.classList.add("fech"); const b0 = tb0.querySelector(".tgTab"); if (b0) b0.textContent = "+"; } let k = 0; const tenta = () => { try { w.montarRanking(); } catch (e) {} if (!dd.querySelector("#rkTab").innerHTML && k++ < 30) setTimeout(tenta, 300); }; tenta(); }
    const aj = () => { const vis = [...dd.querySelectorAll("#painel, #ranking, .aviso")].filter((x) => !x.hidden && x.offsetParent !== null); fr.style.height = Math.ceil(Math.max(400, ...vis.map((x) => x.getBoundingClientRect().bottom + dd.defaultView.scrollY)) + 12) + "px"; }; aj(); new ResizeObserver(aj).observe(dd.body); };
  document.querySelector('[data-sec="painel"]').onclick = (e) => { AB.painel = !AB.painel; $("#c-painel").hidden = !AB.painel; e.currentTarget.classList.toggle("on", AB.painel); e.currentTarget.querySelector("em").textContent = AB.painel ? "−" : "+"; };
}

// 02 · Processo legislativo
const QUORUM = [["Lei ordinária · medida provisória", 11, 21, "maioria simples", "<b class=kw>Maioria simples</b>: maioria dos presentes, com quórum mínimo de 21; bastam 11 votos. A medida provisória é convertida em lei por esse quórum; prazos na trilha."], ["Lei complementar · derrubada de veto", 21, 0, "maioria absoluta · 21", "<b class=kw>Maioria absoluta</b> da Casa, independentemente dos presentes."], ["Emenda à Constituição", 24, 0, "qualificada · 24 × 2", "<b class=kw>Maioria qualificada</b>: três quintos, em dois turnos."]];
const TRILHA = {
  PL: [["Protocolo", "Apresentação do projeto"], ["Leitura", "Lido no Expediente da sessão"], ["1ª Secretaria", "Define as comissões que vão analisar"], ["CCJ", "Primeiro exame: constitucionalidade e legalidade"], ["Comissões de mérito", "Análise do tema; emendas"], ["Volta à CCJ", "Se houver emendas, depois da última comissão"], ["Plenário", "Maioria simples, presente a maioria absoluta", [["Rejeitado", "arquivo", "n"]]], ["Governador", "15 dias úteis", [["Sanciona", "vira lei", "s"], ["Veta", "no todo ou em parte", "n"]]], ["Veto na Casa", "CCJ e depois Plenário", [["Derrubado", "21 votos · promulgação", "s"], ["Mantido", "arquivo", "n"]], 1]],
  PLC: [["Protocolo", "Lei complementar"], ["Leitura", "Expediente"], ["1ª Secretaria", "Distribui às comissões"], ["CCJ", "Constitucionalidade"], ["Mérito", "Comissões temáticas"], ["Plenário", "Maioria absoluta: 21 votos", [["Rejeitado", "arquivo", "n"]]], ["Governador", "sanção ou veto", [["Sanciona", "vira lei", "s"], ["Veta", "no todo ou em parte", "n"]]], ["Veto na Casa", "CCJ e Plenário", [["Derrubado", "21 votos · promulgação", "s"], ["Mantido", "arquivo", "n"]], 1]],
  PEC: [["Proposta", "1/3 dos deputados, Governador ou câmaras municipais"], ["Leitura", "Expediente"], ["CCJ / comissão especial", "Admissibilidade e mérito"], ["1º turno", "3/5: 24 votos", [["Rejeitada", "arquivo", "n"]]], ["2º turno", "3/5: 24 votos", [["Rejeitada", "arquivo", "n"]]], ["Promulgação", "Pela Mesa, sem sanção do Governador"]],
  MP: [["Edição", "Governador, em caso de relevância e urgência; vale como lei"], ["Envio imediato", "À Assembleia"], ["Comissões", "Análise"], ["45 dias", "Sem votação, entra em urgência e tranca a pauta", 0, 1], ["60 dias", "Prorrogável uma vez por mais 60", 0, 1], ["Plenário", "Decide", [["Convertida", "vira lei", "s"], ["Rejeitada ou vencida", "perde a eficácia; decreto legislativo regula os efeitos", "n"]]]],
};
function secLegislativo(c) {
  return cabSec("s2", "02", "Legislativo", "Como funciona a Casa: o calendário do mandato, a rotina da semana, as regras de votação, o caminho de cada proposta e a composição.") +
    `<div class="legg rv"><div class="bloco cal"><h3 data-bl>Calendário do mandato</h3><div class="blc"><ol class="vt">
      <li><b>1º fev 2027</b><span>Posse dos 40 deputados e eleição da Mesa (1º biênio)</span></li><li><b>fev 2027</b><span>Instalação das 24 comissões, mandato de 2 anos</span></li><li><b>2 fev – 17 jul</b><span>1º período da sessão legislativa</span></li><li class="rc"><b>18 – 31 jul</b><span>Recesso</span></li><li><b>1º ago – 22 dez</b><span>2º período</span></li><li class="rc"><b>23 dez – 1º fev</b><span>Recesso</span></li><li><b>fev 2029</b><span>Nova Mesa e novas comissões (2º biênio)</span></li><li><b>jan 2031</b><span>Fim da legislatura</span></li></ol>
      <p class="nota">Sessão legislativa: Constituição do Estado. Datas em fim de semana ou feriado passam ao dia útil seguinte.</p></div></div>
    <div><div class="bloco"><h3 data-bl>Rotina semanal</h3><div class="blc"><div class="semana"><div><b>Segunda</b><div class="it" style="color:var(--ter)">Base, agenda regional, gabinete</div></div>
      <div class="on"><b>Terça</b><div class="it"><i>9h–14h</i>Comissões / atendimentos · CCJ às 10h</div><div class="it"><i>14h</i>Sessão: Pequeno Expediente, horário dos partidos e oradores</div><div class="it"><i>16h</i>Ordem do Dia (votações)</div></div>
      <div class="on"><b>Quarta</b><div class="it"><i>9h–14h</i>Comissões / atendimentos · Finanças às 9h</div><div class="it"><i>14h</i>Sessão: Expediente</div><div class="it"><i>16h</i>Ordem do Dia</div></div>
      <div class="on"><b>Quinta</b><div class="it"><i>9h</i>Sessão sem Ordem do Dia</div><div class="it">Demais comissões conforme demanda; horários fixados pelos presidentes</div></div>
      <div><b>Sexta</b><div class="it" style="color:var(--ter)">Base, agenda regional</div></div></div></div></div>
    <div class="bloco"><h3 data-bl>Votação e quórum</h3><div class="blc"><div class="qrows">${QUORUM.map(([nm, nec, pres, val, tx]) => `<div class="qr"><div class="qn"><b>${nm}</b><small>${tx}</small></div><div class="qv">${nec ? `<div class="esf">${Array.from({ length: 40 }, (_, i) => `<i class="${i < nec ? "on" : pres && i < pres ? "pr" : ""}" style="--d:${(i * .02).toFixed(2)}s"></i>`).join("")}</div>` : `<div class="esf dias">${Array.from({ length: 120 }, (_, i) => `<i class="${i < 45 ? "on" : i < 60 ? "ur" : "pg"}" style="--d:${(i * .006).toFixed(3)}s"></i>`).join("")}<div class="mk"><span style="left:${45 / 120 * 100}%">45 dias · urgência</span><span style="left:50%">60 dias</span><span style="left:100%">120</span></div></div>`}<em>${val}</em></div></div>`).join("")}</div>
      <p class="nota">Cada esfera é um deputado (40). Aceso: votos necessários; na lei ordinária, o contorno mostra o quórum mínimo de 21 presentes. Conferir detalhes no Regimento Interno.</p></div></div></div></div>
    <div class="bloco rv"><h3 data-bl>Trilha das propostas</h3><div class="blc"><p>Escolha o tipo e acompanhe o caminho, do protocolo à lei ou ao arquivo.</p><div class="chips" id="trTipos">${Object.keys(TRILHA).map((k, i) => `<button data-tr="${k}" class="${i ? "" : "on"}">${k}</button>`).join("")}</div><div class="trilha" id="trilha"></div></div></div>
    ${secPolitica(c)}` + fimSec("s3");
}
// trilha em nuvem de partículas (inspiração: eleicoes.tonycelestino.com): curva orgânica, concentração nos marcos,
// profundidade (tamanho/brilho) e transição animada entre os tipos; textos alternam acima e abaixo
let TR_P = null, TR_RAF = 0;
function trilha(k) {
  const T = TRILHA[k], el = $("#trilha"), W = el.clientWidth || 900, H = 300, cy = 150, x0 = 80, dx = (W - 160) / (T.length - 1);
  if (!el.querySelector("canvas")) el.innerHTML = `<canvas></canvas><div class="trl"></div>`;
  const cv = el.querySelector("canvas"), ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
  const curva = (x) => cy + Math.sin(x / W * Math.PI * 2.4 + .6) * 22, rgb = hexRgb(getComputedStyle(document.documentElement).getPropertyValue("--a").trim()).split(",").map(Number);
  const nos = T.map((t, i) => ({ x: x0 + i * dx, vt: !!t[3] }));
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5, N = 160;
  const alvo = () => { const perto = Math.random() < .4, no = nos[Math.floor(Math.random() * nos.length)], x = perto ? no.x + gauss() * 26 : 20 + Math.random() * (W - 40), dn = Math.min(...nos.map((n) => Math.abs(n.x - x))), sp = perto ? 16 : 18 + (dn / dx) * 10;
    const vt = nos.find((n) => Math.abs(n.x - x) < dx * .5)?.vt; return { x, y: curva(x) + gauss() * sp, z: Math.random(), vt, fase: Math.random() * 6.28 }; };
  const novos = Array.from({ length: N }, alvo);
  TR_P = (TR_P && TR_P.length === N ? TR_P : Array.from({ length: N }, () => ({ x: W / 2 + gauss() * W * .4, y: cy + gauss() * 120, z: Math.random() }))).map((p, i) => ({ ...novos[i], sx: novos[i].x + ((p.cx ?? p.x) - novos[i].x) * .05, sy: novos[i].y + ((p.cy ?? p.y) - novos[i].y) * .05 }));
  const t0 = performance.now(); cancelAnimationFrame(TR_RAF);
  const quadro = (agora) => { if (!document.body.contains(cv)) return; const t = (agora - t0) / 1000, e = Math.min(1, t / 1.4), ee = 1 - Math.pow(1 - e, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (const p of TR_P) { const dz = 0; p.cx = p.sx + (p.x - p.sx) * ee; p.cy = p.sy + (p.y + dz - p.sy) * ee;
      const dn = Math.min(...nos.map((n) => Math.abs(n.x - p.x))) / dx, forte = Math.max(0, 1 - dn * 2.2), r = (1.2 + p.z * p.z * 4 + forte * 2.5) * (.4 + .6 * ee), c = p.vt ? [229, 72, 77] : [58 + (rgb[0] - 58) * (.3 + .7 * forte), 64 + (rgb[1] - 64) * (.3 + .7 * forte), 70 + (rgb[2] - 70) * (.3 + .7 * forte)].map(Math.round);
      ctx.globalAlpha = (.14 + .3 * forte + .1 * p.z) * Math.min(1, t * 1.5); ctx.shadowBlur = 0; ctx.fillStyle = `rgb(${c})`; ctx.beginPath(); ctx.arc(p.cx, p.cy, r, 0, 6.2832); ctx.fill(); } ctx.shadowBlur = 0;
    ctx.globalAlpha = .45; ctx.strokeStyle = `rgba(${rgb},.6)`; ctx.lineWidth = 1.2; ctx.setLineDash([2, 6]); ctx.beginPath(); for (let x = nos[0].x; x <= nos[nos.length - 1].x; x += 4) { const yy = curva(x); x === nos[0].x ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); ctx.setLineDash([]);
    nos.forEach((n, i) => { const y = curva(n.x), c2 = n.vt ? "229,72,77" : rgb; ctx.globalAlpha = .22; ctx.fillStyle = `rgb(${c2})`; ctx.beginPath(); ctx.arc(n.x, y, 15, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = `rgb(${c2})`; ctx.fillStyle = "#14191A"; ctx.beginPath(); ctx.arc(n.x, y, 8, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.fillStyle = `rgb(${c2})`; ctx.arc(n.x, y, 4, 0, 6.2832); ctx.fill(); });
    if (0) nos.forEach((n, i) => { const y = curva(n.x), v = (Math.sin(t * 1.6 + i) + 1) / 2; ctx.globalAlpha = .18 + .2 * v; ctx.fillStyle = n.vt ? "rgb(229,72,77)" : `rgb(${rgb})`; ctx.beginPath(); ctx.arc(n.x, y, 12 + .25 * v, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(n.x, y, 5.5, 0, 6.2832); ctx.fill(); });
    ctx.globalAlpha = 1; TR_RAF = requestAnimationFrame(quadro); };
  TR_RAF = requestAnimationFrame(quadro);
  el.querySelector(".trl").innerHTML = T.map(([tt, d, alt, v, pz], i) => { const x = x0 + i * dx, y = curva(x), cima = i % 2 === 0;
    return `<div class="tl ${cima ? "c" : "b"}${v ? " vt" : ""}" style="left:${x}px;top:${cima ? y - 22 : y + 22}px;animation-delay:${(.4 + i * .12).toFixed(2)}s"><b>${esc(tt)}</b><span>${esc(d)}</span>${alt ? alt.map(([a, b, kk]) => `<em class="${kk}">${esc(a)} · ${esc(b)}</em>`).join("") : ""}</div>`; }).join("");
}


// 03 · Administrativo
function secAdministrativo(c) {
  const PA = EST.parlamentar || {}, G = EST.gabinete_parlamentar || {}, C = EST.cota_custeio || {}, I = EST.indenizatorias || {};
  const L = (a, b, d = "") => `<tr><td>${a}${d ? `<small>${d}</small>` : ""}</td><td>${b}</td></tr>`;
  return cabSec("s3", "03", "Administrativo", "O que o mandato recebe e o que pode estruturar: subsídio, gabinete, verbas e a estrutura da Casa.") +
    `<div class="bloco rv"><h3>Subsídio e verbas do parlamentar</h3><p>Valores mensais (contracheques e normas de 2026).</p><table class="qtab">
      ${L("Subsídio", fm(PA.subsidio || 0), "Lei 18.642/2023")}${L("Gestão Executiva", fm((PA.subsidio || 0) * (PA.gestao_demais || 0)), "45% do subsídio (50% para o Presidente da Mesa) · LC 828/2023")}${L("Auxílio Saúde", fm(PA.aux_saude || 0), "15% do subsídio")}${L("Auxílio Alimentação", fm(PA.aux_alim || 0))}</table></div>
    <div class="bloco rv"><h3>Estrutura do gabinete</h3><p>O que pode ser nomeado e custeado.</p><table class="qtab">
      ${L("Secretários Parlamentares", `até ${G.cargos || 27} · ${fm(G.cota || 0)}`, "cota máxima mensal de nomeações")}${L("Chefe de Gabinete", fm(G.chefe || 0), "PL/DAS-7 · 1 por gabinete")}${L("Operação de sistemas", fm(G.retrib || 0), "FC-5 + FC-4")}
      ${L("Cota de custeio do gabinete", fm(C.base || 0), "diárias, passagens, telefone, divulgação, escritório, veículo")}${L("Escritório regional", `até 2 · ${fm(I.escritorio_lim || 0)} cada`, "aluguel, dentro da cota")}${L("Veículo", `${fm(I.veiculo_proprio || 0)} ou 2 locados`, "indenização do veículo próprio, dentro da cota")}${L("Moradia na Capital", fm(C.moradia || 0))}</table>
</div>` + secGabinete(c) + `<div class="bloco rv"><h3 data-bl>Liderança do ${esc(c.p)}</h3><div class="blc" id="lid"></div></div>` + secCasa() + secPatrimonio(c) + fimSec(null);
}

// micropontos: cada unidade é um pequeno grupo de pontos; ao acender, os pontos mudam em atrasos aleatórios (transição viva)
const un = (cls = "", n = 9, st = "") => `<span class="un ${cls}" style="${st}">${Array.from({ length: n }, () => `<i style="--d:${(Math.random() * .5).toFixed(2)}s"></i>`).join("")}</span>`;

// ---------- estrutura política: composição 2027 × 2022, comissões (quociente com simulação de bloco) e liderança ----------
const PART22 = { "PT/PC do B/PV": ["PT"], "UNIÃO/PP": ["UNIÃO", "PP"], "PSOL/REDE": ["PSOL"] };
const nbanc = (p) => eleitos().filter((x) => x.p === p).length;
function secPolitica(c) {
  const ps = [...new Set(eleitos().map((x) => x.p))].sort((a, b) => nbanc(b) - nbanc(a));
  return `<div class="bloco rv"><h3 data-bl>ALESC26</h3><div class="blc"><p>À esquerda, os eleitos de 2022; à direita, os de 2026. Cada segmento é um deputado, do tamanho da sua votação. Verde: cadeiras ganhas; vermelho: perdidas.</p>
    <div class="ordc" id="ordComp"><span class="r">Ordenar</span>${[["n26", "2026"], ["n22", "2022"], ["var", "variação"], ["vot", "votos 2026"]].map(([k, r], i) => `<button data-oc="${k}" class="${i ? "" : "on"}">${r} ↓</button>`).join("")}</div><div class="comp v1" id="comp"></div>
    <p class="nota">2022: resultado da eleição (antes das trocas de partido). Federações de 2026 somam os partidos que a compõem (UNIÃO/PP = União + PP; PT/PC do B/PV = PT; PSOL/REDE = PSOL).</p></div></div>
    <div class="bloco rv"><h3 data-bl>Comissões: ${esc(c.p)}</h3><div class="blc"><p>Regimento, art. 30: quociente = 40 ÷ (membros − 1). O ${esc(c.p)} vem marcado; marque ou desmarque partidos para simular qualquer bloco.</p>
    <div class="chips" id="blocoP">${ps.map((p) => `<button data-bp="${esc(p)}" class="${p === c.p ? "on" : ""}">${esc(p)} · ${nbanc(p)}</button>`).join("")}</div><div id="quoc"></div>
    <div class="gcom3"><div class="gcom" id="gcom"></div></div><div class="distr" id="distr"></div></div></div>`;
}
// vagas no conjunto das comissões do mesmo tamanho (k comissões de n membros): direito = k × deputados ÷ quociente;
// parte inteira garantida, depois 1 vaga reservada por comissão aos partidos com menos de 5, e o resto às maiores frações
function vagas(grupos, n, k) { const q = 40 / (n - 1), L = grupos.map((g) => { const d = g.reduce((s2, p) => s2 + nbanc(p), 0), e = k * d / q; return { g, d, e, v: Math.floor(e) }; });
  let r = k * n - L.reduce((s2, x) => s2 + x.v, 0), res = Math.min(k, r); const peq = L.filter((x) => x.d < 5);
  while (res > 0 && peq.length) { peq.sort((a, b) => (b.e - b.v) - (a.e - a.v) || b.d - a.d); peq[0].v++; res--; r--; }
  while (r > 0) { L.sort((a, b) => (b.e - b.v) - (a.e - a.v) || b.d - a.d); L[0].v++; r--; } return { q, L }; }
let BLOCO = [], ORDC = "n26", COLOC = Array(24).fill(0);
const COMS9 = ["CCJ", "Finanças", "Trabalho", "Ética"], COMS7 = ["Agricultura", "Assuntos Mun.", "Criança", "Deficiência", "Idoso", "Dir. Humanos", "Economia", "Educação", "Consumidor", "Pesca", "Drogas", "Defesa Civil", "Rel. Inst.", "Saúde", "Segurança", "Transportes", "Turismo", "Esportes", "Animal", "Meio Ambiente"];
function ligarPolitica(c) {
  // composição 2022 × 2026, barras divergentes com um segmento por deputado (largura = votos)
  const E = eleitos(), E22 = A22.eleitos || [], ps = [...new Set(E.map((x) => x.p))], de22 = (p) => E22.filter((x) => (PART22[p] || [p]).includes(x.p));
  const tot = (L) => L.reduce((s2, x) => s2 + x.t, 0), mxv = Math.max(...ps.map((p) => Math.max(tot(E.filter((x) => x.p === p)), tot(de22(p))))) || 1;
  const comp = () => { const R = ps.map((p) => { const a = de22(p).sort((x, y) => y.t - x.t), b = E.filter((x) => x.p === p).sort((x, y) => y.t - x.t); return { p, a, b, d: b.length - a.length }; });
    R.sort((x, y) => ORDC === "n22" ? y.a.length - x.a.length : ORDC === "var" ? y.d - x.d : ORDC === "vot" ? tot(y.b) - tot(x.b) : y.b.length - x.b.length || tot(y.b) - tot(x.b));
    const nrm = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, "").trim(), cand26 = new Map(D.c.map((x) => [nrm(x.nome || x.u), x]));
    $("#comp").innerHTML = R.map((r, ri) => { const L = r.a.map((x, k) => `<i class="${k >= r.b.length ? "perd" : ""}" style="width:${x.t / mxv * 100}%;animation-delay:${ri * 60 + k * 25}ms" title="${esc(x.u)} · ${ni(x.t)} votos (2022)"></i>`).join(""),
      Rr = r.b.map((x, k) => `<i class="${k >= r.a.length ? "ganh" : ""}" style="width:${x.t / mxv * 100}%;animation-delay:${ri * 60 + k * 25}ms" title="${esc(x.u)} · ${ni(x.t)} votos"><img src="${foto(x.n)}" alt=""></i>`).join("");
      return `<div class="cl${r.p === c.p ? " eu" : ""}"><div class="lado e"><b>${r.a.length}</b><div class="seg">${L}</div></div><div class="pn">${esc(r.p)}<small>${r.d > 0 ? "+" + r.d : r.d < 0 ? r.d : "="}</small></div><div class="lado d"><div class="seg">${Rr}</div><b>${r.b.length}</b></div></div>`; }).join("") + `<div class="cl cab"><div class="lado e"><span>2022</span></div><div class="pn"></div><div class="lado d"><span>2026</span></div></div>`; };
  $("#ordComp").onclick = (e) => { const b = e.target.closest("[data-oc]"); if (!b) return; ORDC = b.dataset.oc; $("#ordComp").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); comp(); };
  comp();
  // simulador de bloco: vagas por cenário + grade de 176 pontos nas 24 comissões
  const desenha = () => { const meu = BLOCO; if (!meu.length) { $("#quoc").innerHTML = `<div class="cen vz"><div class="ci" style="text-align:left"><span>Nenhum partido marcado</span><small>marque um ou mais partidos acima</small></div></div>`; $("#gcom").innerHTML = ""; $("#distr").innerHTML = ""; return; }
    const grupos = [meu, ...ps.filter((p) => !meu.includes(p)).map((p) => [p])];
    const sim = (g, quem) => { const a = vagas(g, 9, 4), b = vagas(g, 7, 20), f = (r) => r.L.find((x) => x.g.includes(quem)); return { v9: f(a).v, v7: f(b).v, tot: f(a).v + f(b).v, d: f(a).d }; };
    const so1 = (p) => sim([[p], ...ps.filter((q) => q !== p).map((q) => [q])], p), cb = sim(grupos, meu[0]), so = meu.length === 1 ? cb : { ...so1(meu[0]), tot: 0 };
    const sep = meu.reduce((t, p) => t + so1(p).tot, 0);
    const card = (t, x) => `<div class="cen"><b>${x.tot}</b><div class="ci"><span>${t}</span><div>${x.v9 <= 4 ? `Presente em <b>${x.v9}</b> das 4 comissões de 9 membros` : `<b>${x.v9}</b> vagas nas 4 comissões de 9 membros`}</div><div>${x.v7 <= 20 ? `Presente em <b>${x.v7}</b> das 20 comissões de 7 membros` : `<b>${x.v7}</b> vagas nas 20 comissões de 7 membros`}</div></div></div>`;
    $("#quoc").innerHTML = `<div class="cens">${meu.length === 1 ? card(`${meu[0]} sozinho`, cb) : card(`Bloco ${meu.join(" + ")}`, cb)}</div>${meu.length > 1 ? `<p class="nota">Separados, esses partidos somam ${sep} vagas; em bloco, ${cb.tot}: ${cb.tot - sep > 0 ? "ganho" : cb.tot - sep < 0 ? "perda" : "mesmo número"}${cb.tot - sep ? " de " + Math.abs(cb.tot - sep) + " vaga(s)" : ""}. Bloco só compensa se o total continuar abaixo de 5 deputados ou se a soma das frações completar uma vaga inteira.</p>` : ""}`;
    const v = cb, nm9 = COMS9.length;
    // pontos para distribuir: o usuário escolhe as comissões (nada é preenchido sozinho)
    // limite por comissão: 1 vaga se o partido tem até uma vaga por comissão; acima disso, proporcional
    const lim9 = Math.max(1, Math.ceil(v.v9 / 4)), lim7 = Math.max(1, Math.ceil(v.v7 / 20));
    COLOC = COLOC.map((x, j) => Math.min(x, j < nm9 ? lim9 : lim7)); let u9 = COLOC.slice(0, nm9).reduce((a, b) => a + b, 0), u7 = COLOC.slice(nm9).reduce((a, b) => a + b, 0);
    while (u9 > v.v9) { const j = COLOC.slice(0, nm9).findLastIndex((x) => x > 0); COLOC[j]--; u9--; } while (u7 > v.v7) { const j = COLOC.findLastIndex((x, k) => k >= nm9 && x > 0); COLOC[j]--; u7--; }
    const pool = (n, rot) => `<div class="pool"><div>${Array.from({ length: n }, () => `<i></i>`).join("") || `<small>todas distribuídas</small>`}</div><span>${rot}</span></div>`;
    $("#distr").innerHTML = `<small class="dica">Toque numa comissão para levar uma vaga até ela; toque na vaga ocupada para devolver. Máximo de ${lim9} por comissão de 9 e ${lim7} por comissão de 7.</small>`;
    const col = (nmc, n, j) => `<div class="cc${COLOC[j] ? " tem" : ""}" data-cc="${j}"><span>${nmc}</span><div class="pts">${Array.from({ length: n }, (_, q) => `<i class="${q < COLOC[j] ? "meu" : ""}"></i>`).join("")}</div></div>`;
    $("#gcom").innerHTML = `<div class="g9"><div class="cols">${COMS9.map((nmc, j) => col(nmc, 9, j)).join("")}</div>${pool(v.v9 - u9, `${v.v9 - u9} de ${v.v9} para distribuir`)}</div><div class="sepc"></div><div class="g7"><div class="cols">${COMS7.map((nmc, j) => col(nmc, 7, j + nm9)).join("")}</div>${pool(v.v7 - u7, `${v.v7 - u7} de ${v.v7} para distribuir`)}</div>`;
    $("#gcom").onclick = (e) => { const cc = e.target.closest("[data-cc]"); if (!cc) return; const j = +cc.dataset.cc, n9 = j < nm9, livre = n9 ? v.v9 - u9 : v.v7 - u7, aceso = e.target.closest("i.meu");
      if (aceso) COLOC[j]--; else if (livre > 0 && COLOC[j] < (n9 ? lim9 : lim7)) COLOC[j]++; desenha(); }; };
  $("#blocoP").onclick = (e) => { const b = e.target.closest("[data-bp]"); if (!b) return; const p = b.dataset.bp; BLOCO = BLOCO.includes(p) ? BLOCO.filter((x) => x !== p) : [...BLOCO, p]; b.classList.toggle("on"); desenha(); };
  BLOCO = [c.p]; COLOC = Array(24).fill(0); desenha();
  // liderança (seção Administrativo)
  const T = (EST.liderancas || {}).tabela || {}, nb = nbanc(c.p), e = T[Math.min(9, nb)] || {}, F = ((EST.liderancas || {}).folha || {})[c.p];
  $("#lid").innerHTML = `<table class="qtab"><tr><td>Bancada<small>deputados do ${esc(c.p)} em 2027</small></td><td>${nb}</td></tr><tr><td>Cargos da liderança<small>Secretário Parlamentar PL/GAL · Res. 002/2006, Anexo IX-C</small></td><td>até ${e.cargos || "—"}</td></tr><tr><td>Cota mensal da liderança<small>índice de cota × R$ 356,34</small></td><td>${fm(e.cota || 0)}</td></tr>${F ? `<tr><td>Folha atual da liderança<small>contracheques 09/2026</small></td><td>${fm(F)}</td></tr>` : ""}<tr><td>Adicional de cota do líder<small>Ato da Mesa 066/2024, não cumulativo</small></td><td>${fm(((EST.cota_custeio || {}).ad_pres_lider) || 0)}</td></tr></table>`;
}

// ---------- simulador de gabinete: 27 vagas + chefe; níveis de GAB e gratificações; saldo da cota ----------
const chaveGab = (c) => "sl_gab_" + c.n;
function lerGab(c) { try { return JSON.parse(localStorage.getItem(chaveGab(c))) || null; } catch (e) { return null; } }
function secGabinete(c) { return `<div class="bloco rv" id="gabSim"><h3>Simulador de gabinete</h3><p>Indique as pessoas, escolha o nível de cada Secretário Parlamentar (PL/GAB) e as gratificações. O saldo mostra quanto da cota mensal ainda cabe.</p><div id="gab"></div></div>`; }
function ligarGabinete(c) {
  const G = EST.gabinete_parlamentar || {}, st = lerGab(c) || { chefe: "", v: Array.from({ length: G.cargos || 27 }, () => ({ nome: "", nv: 0, op: "" })) };
  const salva = () => { try { localStorage.setItem(chaveGab(c), JSON.stringify(st)); } catch (e) {} };
  const desenha = () => { const usado = st.v.reduce((s2, x) => s2 + (x.nv ? GAB_IDX[x.nv - 1] * GAB_VAL : 0), 0), saldo = COTA_GAB - usado, ocup = st.v.filter((x) => x.nv).length, ops = st.v.filter((x) => x.op).length, grat = st.v.reduce((s2, x) => s2 + (x.op === "5" ? 8982.02 : x.op === "4" ? 6198.2 : 0), 0);
    $("#gab").innerHTML = `<div class="saldo"><div><span>Cota de nomeações</span><b>${fm(COTA_GAB)}</b></div><div><span>Usado · ${ocup} de ${st.v.length} vagas</span><b>${fm(usado)}</b></div><div class="${saldo < 0 ? "neg" : "pos"}"><span>Saldo</span><b>${fm(saldo)}</b></div><div><span>Chefe + gratificações</span><b>${fm(G.chefe + grat)}</b></div></div>
      <div class="barra"><i style="width:${Math.min(100, usado / COTA_GAB * 100)}%" class="${saldo < 0 ? "neg" : ""}"></i></div>
      <div class="gl ch"><span>Chefe</span><input data-ch value="${esc(st.chefe)}" placeholder="Chefe de Gabinete (PL/DAS-7)"><span class="nv">DAS-7</span><span class="vl">${fm(G.chefe || 0)}</span><span></span></div>
      ${st.v.map((x, i) => `<div class="gl${x.nv ? " on" : ""}"><span>${i + 1}</span><input data-nm="${i}" value="${esc(x.nome)}" placeholder="Nome (opcional)"><select data-nv="${i}"><option value="0">vaga livre</option>${GAB_IDX.map((v, k) => `<option value="${k + 1}"${x.nv === k + 1 ? " selected" : ""}>GAB ${k + 1} · ${fm(v * GAB_VAL)}</option>`).join("")}</select><span class="vl">${x.nv ? fm(GAB_IDX[x.nv - 1] * GAB_VAL) : "—"}</span><select data-op="${i}" title="Retribuição por operação de sistemas (1 de cada por gabinete)"><option value="">sem gratificação</option><option value="5"${x.op === "5" ? " selected" : ""}${ops >= 2 && x.op !== "5" || st.v.some((y, j) => j !== i && y.op === "5") ? " disabled" : ""}>+ FC-5 processos legislativos</option><option value="4"${x.op === "4" ? " selected" : ""}${st.v.some((y, j) => j !== i && y.op === "4") ? " disabled" : ""}>+ FC-4 processos administrativos</option></select></div>`).join("")}
      <p class="nota">Salário de cada nível = índice do Anexo VII-E × R$ 296,55 (conferido nos contracheques 09/2026). Teto = 525,27 pontos (437,14 da lei × 1,2016 de reajustes). Chefe de Gabinete e gratificações não consomem a cota. Rascunho salvo neste navegador.</p>`; };
  $("#gab").oninput = (e) => { const t = e.target; if (t.dataset.nm !== undefined) { st.v[+t.dataset.nm].nome = t.value; salva(); } if (t.dataset.ch !== undefined) { st.chefe = t.value; salva(); } };
  $("#gab").onchange = (e) => { const t = e.target; if (t.dataset.nv !== undefined) st.v[+t.dataset.nv].nv = +t.value; if (t.dataset.op !== undefined) st.v[+t.dataset.op].op = t.value; salva(); desenha(); };
  desenha(); window._gab = st;
}

// ---------- estrutura administrativa da Casa (sanfona por grupo) ----------
function secCasa() { const GR = Object.entries(EST.grupos || {}).filter(([g, L]) => !/Comiss/.test(g) && L.length);
  return `<div class="bloco rv"><h3>A estrutura da Casa</h3><p>Secretarias, diretorias, coordenadorias e gerências: cargos comissionados, funções e gratificações por estrutura (contracheques 09/2026).</p>${GR.map(([g, L]) => `<details class="cas"><summary><span>${esc(g)}</span><i>${L.length} estruturas</i><b>${fm(L.reduce((s2, x) => s2 + x.t, 0))}/mês</b></summary><table class="qtab">${L.map((x) => `<tr><td>${esc(x.n)}<small>${x.cc[0]} comissionados · ${x.fc[0]} FC/FG · ${x.fg[0]} grat. exercício</small></td><td>${fm(x.t)}</td></tr>`).join("")}</table></details>`).join("")}</div>`; }

// ---------- patrimônio do mandato (capacidade máxima) ----------
function secPatrimonio(c) { const PA = EST.parlamentar || {}, G = EST.gabinete_parlamentar || {}, C = EST.cota_custeio || {};
  const par = PA.subsidio * (1 + PA.gestao_demais) + PA.aux_saude + PA.aux_alim, gab = G.cota + G.chefe + G.retrib, ver = C.base + C.moradia, tot = par + gab + ver;
  const L = [["Parlamentar", par, "subsídio, Gestão Executiva e auxílios"], ["Gabinete", gab, "27 Secretários Parlamentares (cota cheia), chefe e gratificações"], ["Verbas", ver, "cota de custeio e moradia"]];
  return `<div class="bloco rv"><h3>O mandato em números</h3><p>Tudo o que o mandato movimenta por mês, na capacidade máxima.</p><div class="pat">${L.map(([t, v, d]) => `<div><span>${t}</span><b>${fm(v)}</b><small>${d}</small><i style="width:${v / tot * 100}%"></i></div>`).join("")}<div class="tot"><span>Total mensal</span><b>${fm(tot)}</b><small>${fm(tot * 12)} por ano · ${fm(tot * 48)} na legislatura</small></div></div><p class="nota">Funções extras (Mesa, presidência de comissão, liderança) somam a isso. Ver Corrida da Mesa.</p></div>`; }

// ---------- caderno impresso (fundo branco) ----------
// ---------- caderno impresso: mesma estrutura do perfil, em fundo branco com a cor do partido ----------
function mapaPrint(c, cor) {
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; CONT.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), W = 700, S = W / ((lo1 - lo0) * K), H = (la0 - la1) * S, P = (lo, la) => [(lo - lo0) * K * S, (la0 - la) * S];
  const pth = (an) => an.map((r) => "M" + r.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(",")).join("L") + "Z").join("");
  const pct = M.map((m, i) => D.val[i] ? c.v[i] / D.val[i] : 0), e95 = [...pct].sort((a, b) => a - b)[Math.floor(N * .95)] || 1;
  const bol = [...Array(N).keys()].sort((a, b) => M[b].el - M[a].el).map((i) => { const [x, y] = P(M[i].lon, M[i].lat), t = Math.min(1, pct[i] / e95), r = 1.2 + 24 * Math.sqrt(M[i].el / 470000); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${t < .02 ? "#E3E5E8" : cor}" fill-opacity="${t < .02 ? 1 : (.18 + .75 * t).toFixed(2)}" stroke="#fff" stroke-width=".6"/>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" class="mp"><path d="${CONT.map(pth).join("")}" fill="#F4F5F6" stroke="#D3D6D9" stroke-width=".5"/>${bol}</svg>`;
}
function trilhaPrint(k, cor) {
  const T = TRILHA[k], W = 760, H = 150, cy = 75, x0 = 50, dx = (W - 100) / (T.length - 1), y = (x) => cy + Math.sin(x / W * Math.PI * 2.4 + .6) * 10;
  let path = ""; for (let x = x0; x <= W - 50; x += 4) path += (x === x0 ? "M" : "L") + x + "," + y(x).toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" class="tr"><path d="${path}" fill="none" stroke="${cor}" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="2 5"/>${T.map(([t, d, alt, v], i) => { const x = x0 + i * dx, yy = y(x), cima = i % 2 === 0, c2 = v ? "#E5484D" : cor, ty = cima ? yy - 16 : yy + 24;
    return `<circle cx="${x}" cy="${yy}" r="7" fill="#fff" stroke="${c2}" stroke-width="2"/><circle cx="${x}" cy="${yy}" r="3.5" fill="${c2}"/><text x="${x}" y="${ty}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${v ? "#C6363B" : "#0B0D0E"}">${esc(t)}</text><text x="${x}" y="${cima ? ty - 11 : ty + 11}" text-anchor="middle" font-size="7.5" fill="#6B7178">${esc(d.length > 34 ? d.slice(0, 32) + "…" : d)}</text>${alt ? alt.map(([a, b, kk], q) => `<text x="${x}" y="${cima ? ty - 22 - q * 10 : ty + 22 + q * 10}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${kk === "s" ? "#1F9E3B" : "#C6363B"}">${esc(a)} · ${esc(b)}</text>`).join("") : ""}`; }).join("")}</svg>`;
}
const TNOME = { PL: "Projeto de Lei", PLC: "Projeto de Lei Complementar", PEC: "Proposta de Emenda à Constituição", MP: "Medida Provisória" };
function comPrint(sel, cor) { if (!sel.length) return `<p class="nota">Nenhum partido marcado no painel.</p>`;
  const ps = [...new Set(eleitos().map((x) => x.p))], g = [sel, ...ps.filter((p) => !sel.includes(p)).map((p) => [p])], a = vagas(g, 9, 4).L.find((x) => x.g === sel), b = vagas(g, 7, 20).L.find((x) => x.g === sel);
  // mesma organização do painel: grupo das 4 comissões de 9 e das 20 de 7, colunas de pontos e a reserva de vagas a distribuir
  const u9 = COLOC.slice(0, 4).reduce((x, y) => x + y, 0), u7 = COLOC.slice(4).reduce((x, y) => x + y, 0);
  const col = (n, k, j) => `<div class="cc${COLOC[j] ? " tem" : ""}"><span>${esc(n)}</span><p>${Array.from({ length: k }, (_, q) => `<i class="${q < COLOC[j] ? "m" : ""}"></i>`).join("")}</p></div>`;
  const pool = (n, t) => `<div class="pool"><div>${Array.from({ length: n }, () => "<i></i>").join("") || "<small>todas distribuídas</small>"}</div><span>${n} de ${t} para distribuir</span></div>`;
  return `<div class="cens"><b>${a.v + b.v}</b><div><span>${sel.length > 1 ? "Bloco " + esc(sel.join(" + ")) : esc(sel[0]) + " sozinho"}</span><small>${a.d} deputado(s)</small></div></div><div class="cens2"><span>${a.v <= 4 ? `Presente em <b>${a.v}</b> das 4 comissões de 9 membros` : `<b>${a.v}</b> vagas nas 4 comissões de 9 membros`}</span><span>${b.v <= 20 ? `Presente em <b>${b.v}</b> das 20 comissões de 7 membros` : `<b>${b.v}</b> vagas nas 20 comissões de 7 membros`}</span></div>
  <div class="gc"><div class="g9"><div class="cols">${COMS9.map((n, j) => col(n, 9, j)).join("")}</div>${pool(a.v - u9, a.v)}</div><div class="sepc"></div><div class="g7"><div class="cols">${COMS7.map((n, j) => col(n, 7, j + 4)).join("")}</div>${pool(b.v - u7, b.v)}</div></div><p class="nota">Pontos em cor: vagas levadas às comissões no painel; na reserva, as que ainda faltam distribuir. Regimento, art. 30: quociente = 40 ÷ (membros − 1).</p>`; }
function caderno(c, ordM) {
  const E = eleitos(), pos = E.findIndex((x) => x.n === c.n) + 1, base = M[ordM[0]], reg = base.meso, idx = [...Array(N).keys()], st = window._gab || { v: [] };
  const cor = getComputedStyle(document.documentElement).getPropertyValue("--a").trim(), PA = EST.parlamentar || {}, G = EST.gabinete_parlamentar || {}, C = EST.cota_custeio || {}, I = EST.indenizatorias || {};
  const i0 = ordM[0], posBase = D.c.filter((x) => (x.v[i0] || 0) > c.v[i0]).length + 1, pctMax = Math.max(...idx.map((i) => D.val[i] ? c.v[i] / D.val[i] : 0)), iPct = idx.find((i) => D.val[i] && c.v[i] / D.val[i] === pctMax);
  const rk = (L, f) => `<table>${L.map((o, i) => `<tr class="${f(o) ? "eu" : ""}"><td class="n">${i + 1}º</td><td>${o[0]}</td><td>${o[1]}</td></tr>`).join("")}</table>`;
  const regL = D.c.map((x) => [x, idx.reduce((s2, i) => s2 + (M[i].meso === reg ? x.v[i] || 0 : 0), 0)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const legL = D.c.filter((x) => x.p === c.p).sort((a, b) => b.t - a.t).slice(0, 10);
  const usado = st.v.reduce((s2, x) => s2 + (x.nv ? GAB_IDX[x.nv - 1] * GAB_VAL : 0), 0);
  const sec = (t, sub) => `<div class="sec"><h1>${t}</h1>${sub ? `<p>${sub}</p>` : ""}</div>`, h3 = (t) => `<h3>${t}</h3>`;
  // ALESC26 estática
  const E22 = A22.eleitos || [], ps = [...new Set(E.map((x) => x.p))], de22 = (p) => E22.filter((x) => (PART22[p] || [p]).includes(x.p)), R = ps.map((p) => ({ p, a: de22(p).length, b: E.filter((x) => x.p === p).length })).sort((x, y) => y.b - x.b), mxs = Math.max(...R.map((r) => Math.max(r.a, r.b)));
  const alesc = R.map((r) => `<div class="cb${r.p === c.p ? " eu" : ""}"><span>${esc(r.p)}</span><div class="tk"><i class="a" style="width:${r.a / mxs * 100}%"></i><i class="b" style="width:${r.b / mxs * 100}%"></i></div><b>${r.a} → ${r.b}</b></div>`).join("");
  // comissões: bloco simulado e vagas distribuídas
  const sel = (typeof BLOCO !== "undefined" && BLOCO.length ? BLOCO : [c.p]), nm = [...COMS9, ...COMS7];
  const comHtml = comPrint(sel, cor); const coms = nm.map((n, j) => `<div class="cm${(COLOC[j] || 0) ? " on" : ""}"><span>${esc(n)}</span><b>${COLOC[j] ? "●".repeat(COLOC[j]) : "—"}</b></div>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Caderno do mandato · ${esc(c.u)}</title><style>@page{size:A4}*{box-sizing:border-box}body{margin:0;font:10px/1.5 Inter,system-ui,sans-serif;color:#0B0D0E;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @font-face{font-family:Inter;src:url(${location.origin}${location.pathname.replace(/painel\/.*$/, "")}fontes/InterVariable.woff2);font-weight:100 900}
  .pg{break-before:page}.pg:first-of-type{break-before:auto} .olho{font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#6B7178;font-weight:600}
  .capa{display:grid;grid-template-columns:1fr 1.25fr;gap:18px;align-items:end;margin-top:6px} .capa img.ft{width:62px;height:62px;border-radius:50%;object-fit:cover;object-position:50% 18%;box-shadow:0 0 0 2.5px ${cor}} .capa h1{font-size:46px;font-weight:900;letter-spacing:-.055em;line-height:.88;margin:10px 0 12px} .capa h1 i{display:block;font-style:normal;color:${cor}}
  .pops{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 14px} .pops b{display:block;font-size:20px;font-weight:800;letter-spacing:-.03em;line-height:1} .pops b.a{color:${cor}} .pops span{font-size:6.8px;letter-spacing:.12em;text-transform:uppercase;color:#6B7178}
  svg.mp{width:100%;height:auto}
  .sec{display:flex;align-items:baseline;gap:14px;border-bottom:1.5px solid #0B0D0E;padding-bottom:6px;margin:4px 0 12px} .sec h1{font-size:30px;font-weight:900;letter-spacing:-.05em;margin:0} .sec p{margin:0;color:#6B7178;font-size:9px;max-width:420px}
  h3{font-size:12.5px;font-weight:800;letter-spacing:-.01em;margin:26px 0 7px;padding-left:7px;border-left:3px solid ${cor}}
  table{width:100%;border-collapse:collapse} td{padding:3.5px 4px;border-bottom:.5px solid #E3E5E8;vertical-align:top} td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums} td.n{color:#8A9096;width:20px} tr.eu td{color:${cor};font-weight:800} small{display:block;color:#6B7178;font-size:7.5px;font-weight:400}
  .duas{display:grid;grid-template-columns:1fr 1fr;gap:18px} .tres{display:grid;grid-template-columns:.9fr 1.6fr;gap:16px}
  ol.vt{list-style:none;margin:0;padding:0 0 0 12px;border-left:1.5px solid ${cor}} ol.vt li{position:relative;padding:0 0 7px 6px} ol.vt li::before{content:"";position:absolute;left:-17px;top:3px;width:8px;height:8px;border-radius:50%;background:${cor}} ol.vt li.rc::before{background:#fff;border:1.5px solid #A9AEB3} ol.vt b{display:block;font-size:9.5px} ol.vt span{font-size:8px;color:#6B7178}
  .sem{display:grid;grid-template-columns:repeat(5,1fr);gap:5px} .sem div{border:.5px solid #E3E5E8;border-radius:6px;padding:6px} .sem div.on{border-color:${cor}} .sem b{display:block;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#6B7178;margin-bottom:3px} .sem p{margin:0 0 3px;font-size:8px;line-height:1.3} .sem i{font-style:normal;color:${cor};font-weight:700}
  .q{display:grid;grid-template-columns:1fr 1fr 74px;gap:8px;align-items:center;padding:6px 0;border-bottom:.5px solid #E3E5E8} .q b{display:block;font-size:10px} .q small b{display:inline;color:${cor}} .es{display:grid;grid-template-columns:repeat(20,1fr);gap:2px} .es i{aspect-ratio:1;border-radius:50%;background:#E3E5E8} .es i.on{background:${cor}} .es i.pr{box-shadow:inset 0 0 0 1px #8A9096} .q em{font-style:normal;font-weight:800;color:${cor};text-align:right;font-size:8px;line-height:1.25}
  svg.tr{width:100%;height:auto;margin-bottom:2px} .trt{display:flex;align-items:baseline;gap:8px;margin-top:12px;border-top:.5px solid #E3E5E8;padding-top:6px}.trt b{font-size:17px;font-weight:900;letter-spacing:-.03em;color:${cor}}.trt span{font-size:10px;font-weight:700}.trt small{display:inline;margin-left:auto}
  .cb{display:grid;grid-template-columns:90px 1fr 44px;gap:8px;align-items:center;padding:3px 0} .cb span{font-weight:700;font-size:9px} .cb.eu span,.cb.eu b{color:${cor}} .tk{position:relative;height:9px} .tk i{position:absolute;left:0;top:0;height:100%;border-radius:4px} .tk i.a{background:#E3E5E8;top:1.5px;height:6px} .tk i.b{background:#8A9096;opacity:.85} .cb.eu .tk i.b{background:${cor};opacity:1} .cb b{text-align:right;font-size:9px}
  .cms{display:grid;grid-template-columns:repeat(4,1fr);gap:3px 10px} .cm{display:flex;justify-content:space-between;border-bottom:.5px solid #E3E5E8;padding:2.5px 0;font-size:8px} .cm.on{font-weight:700} .cm b{color:${cor}}
  .pat{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.pat div{position:relative;border:.5px solid #E3E5E8;border-radius:6px;padding:7px 8px 10px;overflow:hidden}.pat span{font-size:7px;letter-spacing:.12em;text-transform:uppercase;color:#6B7178}.pat b{display:block;font-size:15px;font-weight:800}.pat i{position:absolute;left:0;bottom:0;height:3px;background:${cor}}.pat .tot{border-color:${cor}}.pat .tot b{color:${cor}}.nota{font-size:7.5px;color:#6B7178}details.cas{break-inside:avoid;margin:6px 0}details.cas summary{display:flex;gap:8px;font-weight:700;list-style:none;border-bottom:1px solid #0B0D0E;padding:3px 0}details.cas summary::-webkit-details-marker{display:none}details.cas summary span{flex:1}details.cas summary i{font-style:normal;color:#6B7178;font-weight:400}
  .cens{border:.5px solid ${cor};border-radius:8px;padding:8px 10px;display:flex;gap:12px;align-items:center;margin-bottom:8px}.cens>b{font-size:26px;font-weight:900;color:${cor}}.cens span{font-weight:800}.gc{display:flex;align-items:flex-end;gap:10px;break-inside:avoid}.gc .g9{flex:4}.gc .g7{flex:20}.gc .cols{display:flex;gap:3px}.gc .cc{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}.gc .cc span{writing-mode:vertical-rl;transform:rotate(180deg);height:62px;font-size:7.5px;color:#6B7178;white-space:nowrap}.gc .cc.tem span{color:${cor};font-weight:700}.gc .cc p{margin:0;display:flex;flex-direction:column;gap:2.5px}.gc .cc i{width:8px;height:8px;border-radius:50%;background:#E3E5E8}.gc .cc i.m{background:${cor}}.gc .sepc{width:.5px;align-self:stretch;background:#D3D6D9}.gc .pool{margin-top:8px;border:1px dashed ${cor};border-radius:8px;padding:6px;display:flex;flex-direction:column;align-items:center;gap:4px}.gc .pool div{display:flex;flex-wrap:wrap;gap:3px;justify-content:center}.gc .pool i{width:8px;height:8px;border-radius:50%;background:${cor}}.gc .pool span{font-size:7.5px;color:#6B7178}.cens2{display:flex;gap:18px;font-size:9px;margin:-2px 0 8px}.cens2 b{color:${cor}}
  .gfc{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}.gfc div{border:.5px solid #D3D6D9;border-radius:6px;padding:6px 8px;min-height:44px}.gfc span{display:block;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#6B7178}.gfc b{font-size:13px}.gfc b.ln{display:block;border-bottom:.5px solid #8A9096;height:18px}table.gf th{font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#6B7178;text-align:left;border-bottom:1px solid #0B0D0E;padding:3px 4px}table.gf td{height:19px;border-bottom:.5px solid #C9CDD1;border-right:.5px solid #E3E5E8}table.gf td:first-child{width:22px;color:#8A9096;font-weight:400;text-align:left}table.gf td:nth-child(4),table.gf td:nth-child(5){width:56px}table.gf td:last-child{width:80px;border-right:0}table.gf tr.tt td{border-bottom:1px solid #0B0D0E;font-weight:800}.gref{display:grid;grid-template-columns:repeat(8,1fr);gap:0 8px;font-size:6.5px;font-variant-numeric:tabular-nums}.gref span{display:flex;justify-content:space-between;border-bottom:.5px solid #EEF0F1}.gref i{font-style:normal;color:#8A9096}
  .rod{margin-top:14px;font-size:7px;color:#6B7178;border-top:.5px solid #D3D6D9;padding-top:5px}</style></head><body>
  <div class="pg"><div class="olho">Caderno do mandato · Legislatura 2027–2031 · SimulaLEGIS</div><div class="capa"><div><img class="ft" src="${location.origin}${location.pathname.replace(/novos\.html.*$/, "")}${foto(c.n)}" alt=""><div class="olho" style="margin-top:8px">Eleições 2026 · Deputado estadual · ${esc(c.p)}</div><h1>${esc(c.u.split(" ").slice(0, -1).join(" ") || c.u)}<i>${esc(c.u.split(" ").length > 1 ? c.u.split(" ").slice(-1)[0] + "." : "")}</i></h1>
    <div class="pops"><div><b class="a">${ni(c.t)}</b><span>votos</span></div><div><b>${pos}º</b><span>entre os 40 eleitos</span></div><div><b>${nf(c.t / VAL * 100, 2)}%</b><span>dos válidos</span></div><div><b>${posBase}º</b><span>em ${esc(M[i0].n)}</span></div><div><b>${nf(pctMax * 100)}%</b><span>em ${esc(M[iPct].n)}</span></div><div><b>${ordM.length}</b><span>municípios com voto</span></div></div></div>${mapaPrint(c, cor)}</div>
  ${sec("Painel eleitoral", "Onde estão os votos: cidades, região e legenda.")}<div class="duas"><div>${h3("Cidades com mais votos")}${rk(ordM.slice(0, 15).map((i) => [esc(M[i].n), ni(c.v[i])]), () => 0)}${h3("Votos por macrorregião")}${rk((() => { const R = {}; idx.forEach((i) => { R[M[i].meso] = (R[M[i].meso] || 0) + (c.v[i] || 0); }); return Object.entries(R).sort((x, y) => y[1] - x[1]).map(([m, v]) => [esc(m.replace(" Catarinense", "")) + ` <small style="display:inline">${nf(v / c.t * 100)}%</small>`, ni(v)]); })(), () => 0)}</div><div>${h3(`Mais votados · ${esc(reg.replace(" Catarinense", ""))}`)}${rk(regL.map(([x, v]) => [esc(x.u) + ` <small style="display:inline">${esc(x.p)}</small>`, ni(v)]), (o) => o[0].startsWith(esc(c.u)))}${h3(`Ranking do ${esc(c.p)}`)}${rk(legL.map((x) => [esc(x.u), ni(x.t)]), (o) => o[0] === esc(c.u))}</div></div></div>
  <div class="pg">${sec("Legislativo", "Calendário do mandato, rotina da semana, votação e o caminho de cada proposta.")}<div class="tres"><div>${h3("Calendário do mandato")}<ol class="vt"><li><b>1º fev 2027</b><span>Posse e eleição da Mesa (1º biênio)</span></li><li><b>fev 2027</b><span>Comissões permanentes, mandato de 2 anos</span></li><li><b>2 fev – 17 jul</b><span>1º período da sessão legislativa</span></li><li class="rc"><b>18 – 31 jul</b><span>Recesso</span></li><li><b>1º ago – 22 dez</b><span>2º período</span></li><li class="rc"><b>23 dez – 1º fev</b><span>Recesso</span></li><li><b>fev 2029</b><span>Nova Mesa e comissões (2º biênio)</span></li><li><b>jan 2031</b><span>Fim da legislatura</span></li></ol></div>
    <div>${h3("Rotina semanal")}<div class="sem"><div><b>Segunda</b><p>Base, agenda regional</p></div><div class="on"><b>Terça</b><p><i>9h–14h</i> Comissões / atendimentos · CCJ 10h</p><p><i>14h</i> Sessão</p><p><i>16h</i> Ordem do Dia</p></div><div class="on"><b>Quarta</b><p><i>9h–14h</i> Comissões / atendimentos · Finanças 9h</p><p><i>14h</i> Sessão</p><p><i>16h</i> Ordem do Dia</p></div><div class="on"><b>Quinta</b><p><i>9h</i> Sessão sem Ordem do Dia</p></div><div><b>Sexta</b><p>Base, agenda regional</p></div></div>
    ${h3("Votação e quórum")}${QUORUM.map(([nmq, nec, pres, val, tx]) => `<div class="q"><div><b>${nmq}</b><small>${tx}</small></div><div class="es">${Array.from({ length: 40 }, (_, k) => `<i class="${k < nec ? "on" : pres && k < pres ? "pr" : ""}"></i>`).join("")}</div><em>${val}</em></div>`).join("")}</div></div>
    ${h3("Trilha das propostas")}${Object.keys(TRILHA).map((k) => `<div class="trt"><b>${k}</b><span>${TNOME[k] || ""}</span></div>${trilhaPrint(k, cor)}`).join("")}
  <div style="break-inside:avoid">${h3("ALESC26 · cadeiras por partido (2022 → 2026)")}${alesc}
    ${h3(`Comissões · ${esc(sel.length > 1 ? "Bloco " + sel.join(" + ") : sel[0])}`)}${comHtml}</div>
  <div class="pg">${sec("Administrativo", "O que o mandato recebe e o que pode estruturar.")}<div class="duas"><div>${h3("Subsídio e verbas do parlamentar")}<table><tr><td>Subsídio<small>Lei 18.642/2023</small></td><td>${fm(PA.subsidio)}</td></tr><tr><td>Gestão Executiva<small>45% (50% para o Presidente da Mesa) · LC 828/2023</small></td><td>${fm(PA.subsidio * PA.gestao_demais)}</td></tr><tr><td>Auxílio Saúde</td><td>${fm(PA.aux_saude)}</td></tr><tr><td>Auxílio Alimentação</td><td>${fm(PA.aux_alim)}</td></tr></table>
    ${h3("Estrutura do gabinete")}<table><tr><td>Secretários Parlamentares<small>até ${G.cargos} · cota mensal</small></td><td>${fm(G.cota)}</td></tr><tr><td>Chefe de Gabinete<small>PL/DAS-7</small></td><td>${fm(G.chefe)}</td></tr><tr><td>Operação de sistemas<small>FC-5 + FC-4</small></td><td>${fm(G.retrib)}</td></tr><tr><td>Cota de custeio</td><td>${fm(C.base)}</td></tr><tr><td>Escritório regional<small>até 2, dentro da cota</small></td><td>${fm(I.escritorio_lim)} cada</td></tr><tr><td>Moradia na Capital</td><td>${fm(C.moradia)}</td></tr></table></div>
    <div>${h3("Simulador de gabinete")}<table><tr><td>Cota de nomeações</td><td>${fm(COTA_GAB)}</td></tr><tr><td>Usado</td><td>${fm(usado)}</td></tr><tr><td>Saldo</td><td>${fm(COTA_GAB - usado)}</td></tr><tr><td>Chefe de Gabinete${st.chefe ? `<small>${esc(st.chefe)}</small>` : ""}</td><td>${fm(G.chefe)}</td></tr>${st.v.map((x, i) => x.nv ? `<tr><td>${i + 1}. ${esc(x.nome || "a definir")}<small>GAB ${x.nv}${x.op ? " + FC-" + x.op : ""}</small></td><td>${fm(GAB_IDX[x.nv - 1] * GAB_VAL)}</td></tr>` : "").join("")}</table>${h3(`Liderança do ${esc(c.p)}`)}${($("#lid") || {}).innerHTML || ""}</div></div>
  ${h3("O mandato em números")}${secPatrimonio(c).replace(/^.*?<div class="pat">/s, '<div class="pat">').replace(/<\/div>$/, "")}
  ${h3("A estrutura da Casa")}${secCasa().replace(/<details class="cas">/g, '<details class="cas" open>').replace(/^<div class="bloco rv"><h3>.*?<\/h3>/s, "<div>")}
  <div class="pg" id="gabForm">${sec("Anexo", "Folha para preencher à mão: nomes, níveis e valores, conferindo a cota de nomeações.")}${h3("Simulador de gabinete para preencher à mão")}
    <div class="gfc"><div><span>Cota de nomeações</span><b>${fm(COTA_GAB)}</b></div><div><span>Chefe de Gabinete · PL/DAS-7</span><b>${fm(G.chefe)}</b><small>fora da cota</small></div><div><span>Usado</span><b class="ln"></b></div><div><span>Saldo</span><b class="ln"></b></div></div>
    <table class="gf"><tr><th>Nº</th><th>Nome</th><th>Função / lotação</th><th>Nível GAB</th><th>FC</th><th>Valor mensal</th></tr>${Array.from({ length: G.cargos || 27 }, (_, k) => `<tr><td>${k + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}<tr class="tt"><td></td><td colspan="4">Total</td><td></td></tr></table>
    <div class="olho" style="margin:12px 0 4px">Tabela de níveis GAB · valor mensal (índice × R$ ${nf(GAB_VAL, 2)})</div><div class="gref">${GAB_IDX.map((x, k) => `<span><i>${k + 1}</i>${ni(x * GAB_VAL)}</span>`).join("")}</div></div>
  <div class="rod">SimulaLEGIS · material de apoio, sem vínculo oficial com a Assembleia. Fontes: TSE 2026, Constituição do Estado, Res. 002/2006, Atos da Mesa, contracheques e dados abertos da ALESC (09/2026).</div></div></body></html>`;
  const ov = document.createElement("div"); ov.className = "relov"; ov.innerHTML = `<div class="bar"><span class="cadT">Escolha o que entra no caderno</span><button class="btn" data-imp>Imprimir</button><button class="btn sec" data-fec>Fechar</button></div><div class="cadCorpo"><aside class="cadSel"></aside><iframe></iframe></div>`; document.body.appendChild(ov);
  const f = ov.querySelector("iframe"); f.srcdoc = html; // cópia para impressão no próprio documento: imprime só o caderno, com paginação real (o iframe cortava no fim da altura visível)
  document.querySelector("#cadPrint")?.remove(); const css = html.match(/<style>([\s\S]*?)<\/style>/)[1], ff = (css.match(/@font-face\{[^}]*\}/) || [""])[0], corpo = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const cp = Object.assign(document.createElement("div"), { id: "cadPrint" }); cp.innerHTML = `<style>${ff} #cadPrint{display:none} @media print{ html,body{background:#fff !important;color:#0B0D0E} body>*:not(#cadPrint){display:none !important} #cadPrint{display:block !important;font:10px/1.5 Inter,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact} ${css.replace(ff, "").replace(/(^|\})\s*([^{}@]+)\{/g, (m, a, sel) => a + sel.split(",").map((x) => x.trim().startsWith("@") || /^(from|to|\d)/.test(x.trim()) ? x : "#cadPrint " + x.trim().replace(/^body\b/, "")).join(",") + "{")} }</style>${corpo}`; document.body.appendChild(cp);
  // seletor de seções e subseções: o que for desmarcado some da prévia e da impressão
  const estrutura = (doc) => { const L = []; let g = null; doc.querySelectorAll(".capa, .sec h1, h3").forEach((el) => { if (el.classList.contains("capa")) { g = { t: "Capa", el, subs: [] }; L.push(g); } else if (el.tagName === "H1") { g = { t: el.textContent, el: el.parentNode, subs: [] }; L.push(g); } else g && g.subs.push(el); }); return L; };
  const nosDe = (h) => { const R = [h]; let n = h.nextElementSibling; while (n && n.tagName !== "H3" && !n.classList.contains("rod") && !n.classList.contains("pg")) { R.push(n); n = n.nextElementSibling; } return R; };
  const OFF = new Set(["Anexo"]);
  const aplica = (doc) => { if (!doc) return; doc.querySelectorAll("[data-off]").forEach((x) => { x.style.display = ""; x.removeAttribute("data-off"); }); const esc2 = (x) => { x.style.display = "none"; x.setAttribute("data-off", ""); };
    estrutura(doc).forEach((g, gi) => { const gOff = OFF.has(g.t); let vis = 0; g.subs.forEach((h, si) => { if (gOff || OFF.has(g.t + "/" + si)) nosDe(h).forEach(esc2); else vis++; }); if (gOff || (g.subs.length && !vis)) esc2(g.el); });
    doc.querySelectorAll(".pg").forEach((pg) => { const algum = [...pg.querySelectorAll("h3, .capa")].some((x) => !x.closest("[data-off]")); if (!algum) esc2(pg); }); };
  const montaSel = () => { const L = estrutura(f.contentDocument); ov.querySelector(".cadSel").innerHTML = L.map((g) => `<div class="cg1"><label class="gt"><input type="checkbox" data-g="${esc(g.t)}" ${OFF.has(g.t) ? "" : "checked"}> ${esc(g.t)}</label>${g.subs.map((h, si) => `<label><input type="checkbox" data-g="${esc(g.t)}/${si}" ${OFF.has(g.t) || OFF.has(g.t + "/" + si) ? "" : "checked"} ${OFF.has(g.t) ? "disabled" : ""}> ${esc(h.textContent)}</label>`).join("")}</div>`).join(""); };
  f.onload = () => { montaSel(); aplica(f.contentDocument); aplica(cp); };
  ov.querySelector(".cadSel").onchange = (e) => { const k = e.target.dataset.g; e.target.checked ? OFF.delete(k) : OFF.add(k); montaSel(); aplica(f.contentDocument); aplica(cp); };
  ov.querySelector("[data-imp]").onclick = () => window.print(); ov.querySelector("[data-fec]").onclick = () => { ov.remove(); cp.remove(); };
}

// entrada suave das seções ao rolar
function irPara(alvo) { let y; const fr = $("#emb");
  if (alvo.startsWith("emb:")) { const el = fr && fr.contentDocument.querySelector(alvo.slice(4)); if (!el) return; y = fr.getBoundingClientRect().top + scrollY + el.getBoundingClientRect().top - 60; }
  else { const el = $("#" + alvo); if (!el) return; y = el.getBoundingClientRect().top + scrollY - 56; } scrollTo({ top: y, behavior: "smooth" }); }
document.addEventListener("click", (e) => { const b = e.target.closest("[data-ir]"); if (b) { e.preventDefault(); irPara(b.dataset.ir); } });
addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.tipo === "ir") irPara(e.data.alvo); });
// seta flutuante: mostra a próxima área conforme a posição da tela
function topoDe(a) { const fr = $("#emb"); if (a.startsWith("emb:")) { const el = fr && fr.contentDocument && fr.contentDocument.querySelector(a.slice(4)); return el ? fr.getBoundingClientRect().top + scrollY + el.getBoundingClientRect().top : 1e9; } const el = $("#" + a); return el ? el.getBoundingClientRect().top + scrollY : 1e9; }
let SETA_T = 0;
function setaFlutuante() { let b = $("#setaF"); if (!b) { b = Object.assign(document.createElement("button"), { id: "setaF", className: "setaF" }); document.body.appendChild(b); b.onclick = () => irPara(b.dataset.ir); }
  const y = scrollY + innerHeight * .35, alvos = [["s1", "Painel eleitoral"], ["emb:#tabela", "Votos por município"], ["s2", "Legislativo"], ["trilha", "Trilha das propostas"], ["comp", "ALESC26"], ["gcom", "Comissões"], ["s3", "Administrativo"], ["gabSim", "Simulador de gabinete"]];
  const prox = alvos.find(([a]) => topoDe(a) > y + 40); if (!prox || !$("#s1")) { b.classList.remove("vis"); return; }
  b.dataset.ir = prox[0]; b.innerHTML = `<b>↓</b><span>${esc(prox[1])}</span>`; b.classList.add("vis"); clearTimeout(SETA_T); }
addEventListener("scroll", () => { const b = $("#setaF"); if (b) b.classList.remove("vis"); clearTimeout(SETA_T); SETA_T = setTimeout(setaFlutuante, 450); }, { passive: true });
function revelar() { setTimeout(setaFlutuante, 2500); document.querySelectorAll(".bloco").forEach((b) => b.classList.add("fech"));
  document.querySelectorAll("[data-tg]").forEach((b) => b.onclick = () => { const cs = $("#cs-" + b.dataset.tg), f = !cs.hidden; cs.hidden = f; b.textContent = f ? "+" : "−"; });
  document.querySelectorAll(".bloco > h3").forEach((h) => { if (!(h.nextElementSibling && h.nextElementSibling.classList.contains("blc"))) { const w = document.createElement("div"); w.className = "blc"; while (h.nextSibling) w.appendChild(h.nextSibling); h.after(w); } h.dataset.bl = 1; h.onclick = () => h.parentElement.classList.toggle("fech"); });
  const nav = $(".topo .secs"); if (nav && $("#s1")) { const io3 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) nav.querySelectorAll("a[data-s]").forEach((a) => a.classList.toggle("on", a.dataset.s === e.target.id)); }), { rootMargin: "-40% 0px -55% 0px" }); ["hero", "s1", "s2", "s3"].forEach((id) => $("#" + id) && io3.observe($("#" + id))); }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -12% 0px" });
  document.querySelectorAll(".rv").forEach((x) => io.observe(x));
  const t = $("#trTipos"); if (t) t.onclick = (e) => { const b = e.target.closest("[data-tr]"); if (!b) return; t.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); trilha(b.dataset.tr); };
  const tr = $("#trilha"); if (tr) { const io2 = new IntersectionObserver((es) => { if (es[0].isIntersecting) { trilha("PL"); io2.disconnect(); } }); io2.observe(tr); }
}

// cidade escolhida no Painel embutido: mapa de bairros e locais de votação, preso à direita enquanto rola
const slugArq = (x) => String(x).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
let CID_FECH = null;
async function mapaCidade({ k, a, b }) {
  const el = $("#cid"); if (!el) return; if (!k) { el.hidden = true; try { $("#emb").contentDocument.documentElement.classList.remove("cidOn"); } catch (e) {} return; }
  let g, s; try { [g, s] = await Promise.all([fetch(`../dados/mapas/bairros-sc/${slugArq(k)}.json`).then((r) => r.json()), fetch(`../dados/resultados/sc-2026/secoes/${slugArq(k)}.json`).then((r) => r.json())]); } catch (e) { el.hidden = true; return; }
  const soma = (n) => { const v = ((s.estadual || {})[n]) || {}, o = {}; Object.entries(s._secoes || {}).forEach(([sk, ln]) => { o[ln] = (o[ln] || 0) + (v[sk] || 0); }); return o; };
  const vA = soma(a), vB = b ? soma(b) : null, cA = D.c.find((x) => x.n === a), cB = b && D.c.find((x) => x.n === b);
  const ls = Object.entries(g.l).map(([nm, [x, y]]) => ({ nm, x, y, v: vB ? (vA[nm] || 0) - (vB[nm] || 0) : vA[nm] || 0 })).filter((o) => o.v), mx = Math.max(1, ...ls.map((o) => Math.abs(o.v)));
  const fundo = g.c ? `<path d="${g.c}" fill="rgba(242,244,245,.04)" stroke="rgba(242,244,245,.2)"/>` : g.b.map(([, d]) => `<path d="${d}" fill="rgba(242,244,245,.035)" fill-rule="evenodd" stroke="rgba(242,244,245,.12)" stroke-width=".8"/>`).join("");
  const lab = g.b ? g.b.map(([nm, , [x, y]]) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" font-weight="600" fill="rgba(242,244,245,.35)">${esc(nm)}</text>`).join("") : "";
  const bol = ls.sort((p, q) => Math.abs(q.v) - Math.abs(p.v)).map((o) => { const az = o.v < 0; return `<circle cx="${o.x}" cy="${o.y}" r="${(3 + 20 * Math.sqrt(Math.abs(o.v) / mx)).toFixed(1)}" fill="${az ? "rgba(61,123,255,.5)" : "rgba(var(--a-rgb),.55)"}" stroke="${az ? "#3D7BFF" : "var(--a)"}" stroke-width="1"><title>${esc(o.nm)}: ${vB ? (o.v > 0 ? "+" : "") + ni(o.v) : ni(o.v)}</title></circle>`; }).join("");
  const top = Object.entries(vA).filter(([, x]) => x).sort((p, q) => q[1] - p[1]).slice(0, 5);
  el.innerHTML = `<div class="cidc"><div class="cidh"><div><div class="olho">${esc(k)}</div><b>${esc(cA ? cA.u : "")}${cB ? ` × ${esc(cB.u)}` : ""}</b></div><button class="x" title="Minimizar">–</button></div>
    <svg viewBox="0 0 ${g.w} ${g.h}" preserveAspectRatio="xMidYMid meet" class="${g.h > g.w * 1.25 ? "alto" : ""}">${fundo}${lab}${bol}</svg>
    <div class="nota">${vB ? `Na cor do partido: mais votos de ${esc(cA.u)}; azul: de ${esc(cB.u)}.` : "Círculo = local de votação, do tamanho dos votos."} ${g.c ? "Sem bairros no IBGE." : "Bairros: IBGE 2022."}</div>
    <ol class="rank">${top.map(([n, v], i) => `<li><i>${i + 1}º</i><span>${esc(n)}</span><b>${ni(v)}</b></li>`).join("")}</ol></div>`;
  const fr = $("#emb"), grande = (on) => { try { fr.contentDocument.documentElement.classList.toggle("cidOn", on); } catch (e) {} };
  el.hidden = false; el.classList.remove("min"); grande(true);
  el.querySelector(".x").onclick = () => { const m = el.classList.toggle("min"); el.querySelector(".x").textContent = m ? "+" : "–"; grande(!m); };
}
addEventListener("message", (e) => { if (e.origin === location.origin && e.data && e.data.tipo === "cidade") mapaCidade(e.data); });

// relatório do Painel embutido abre por cima (sem nova aba)
addEventListener("message", (e) => { if (e.origin !== location.origin || !e.data || e.data.tipo !== "relatorio") return;
  const ov = document.createElement("div"); ov.className = "relov"; ov.innerHTML = `<div class="bar"><button class="btn" data-imp>Imprimir</button><button class="btn sec" data-fec>Fechar</button></div><iframe></iframe>`; document.body.appendChild(ov);
  const f = ov.querySelector("iframe"); f.srcdoc = e.data.html.replace(/<script>document\.fonts\.ready\.then\(\(\)=>setTimeout\(\(\)=>print\(\),300\)\)<\/script>/, "");
  // cópia para impressão no próprio documento: imprime só o caderno, com paginação real (o iframe cortava no fim da altura visível)
  document.querySelector("#cadPrint")?.remove(); const css = html.match(/<style>([\s\S]*?)<\/style>/)[1], ff = (css.match(/@font-face\{[^}]*\}/) || [""])[0], corpo = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const cp = Object.assign(document.createElement("div"), { id: "cadPrint" }); cp.innerHTML = `<style>${ff} #cadPrint{display:none} @media print{ html,body{background:#fff !important;color:#0B0D0E} body>*:not(#cadPrint){display:none !important} #cadPrint{display:block !important;font:10px/1.5 Inter,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact} ${css.replace(ff, "").replace(/(^|\})\s*([^{}@]+)\{/g, (m, a, sel) => a + sel.split(",").map((x) => x.trim().startsWith("@") || /^(from|to|\d)/.test(x.trim()) ? x : "#cadPrint " + x.trim().replace(/^body\b/, "")).join(",") + "{")} }</style>${corpo}`; document.body.appendChild(cp);
  ov.querySelector("[data-imp]").onclick = () => window.print(); ov.querySelector("[data-fec]").onclick = () => { ov.remove(); cp.remove(); }; });

// capa: mapa de SC com bolhas (tamanho = eleitorado, cor = força do deputado na cor do partido), nascendo uma a uma
let heroRaf = null;
function heroMapa(c, ordM) {
  cancelAnimationFrame(heroRaf);
  const cv = $("#heroCv"), ctx = cv.getContext("2d"), r0 = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = r0.width, h = r0.height;
  cv.width = w * dpr; cv.height = h * dpr;
  const movel = innerWidth < 760, cx = movel ? { x0: 16, y0: 16, x1: w - 16, y1: h - 16 } : { x0: w * .4, y0: h * .06, x1: w * .97, y1: h * .94 };
  let lo0 = 1e9, lo1 = -1e9, la0 = -1e9, la1 = 1e9; CONT.forEach((an) => an.forEach((r) => r.forEach(([lo, la]) => { lo0 = Math.min(lo0, lo); lo1 = Math.max(lo1, lo); la0 = Math.max(la0, la); la1 = Math.min(la1, la); })));
  const K = Math.cos(27.5 * Math.PI / 180), S = Math.min((cx.x1 - cx.x0) / ((lo1 - lo0) * K), (cx.y1 - cx.y0) / (la0 - la1)), ox = cx.x0 + ((cx.x1 - cx.x0) - (lo1 - lo0) * K * S) / 2, oy = cx.y0 + ((cx.y1 - cx.y0) - (la0 - la1) * S) / 2;
  const P = (lo, la) => [ox + (lo - lo0) * K * S, oy + (la0 - la) * S], k = Math.min(w, h) / 560;
  const rgb = hexRgb(getComputedStyle(document.documentElement).getPropertyValue("--a").trim()).split(",").map(Number), ne = [58, 64, 70];
  const pct = M.map((m, i) => D.val[i] ? c.v[i] / D.val[i] : 0), esc95 = [...pct].sort((a, b) => a - b)[Math.floor(N * .95)] || 1;
  const B = M.map((m, i) => { const [x, y] = P(m.lon, m.lat), t = Math.min(1, pct[i] / esc95); return { x, y, r: (1.2 + 26 * Math.sqrt(m.el / 470000)) * k * 1.1, t, nasce: (Math.sin((i + 1) * 12.9898) * 43758.5453 % 1 + 1) % 1 * 2.6 }; });
  const ord = [...B.keys()].sort((a, b) => M[b].el - M[a].el), cont = new Path2D();
  CONT.forEach((an) => an.forEach((r) => { r.forEach(([lo, la], j) => { const [x, y] = P(lo, la); j ? cont.lineTo(x, y) : cont.moveTo(x, y); }); cont.closePath(); }));
  const t0 = performance.now();
  const quadro = (agora) => { if (!document.body.contains(cv)) return; const t = (agora - t0) / 1000; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, t / 1.5); ctx.fillStyle = "rgba(242,244,245,.03)"; ctx.fill(cont); ctx.strokeStyle = "rgba(242,244,245,.06)"; ctx.lineWidth = .6; ctx.stroke(cont);
    for (const i of ord) { const b = B[i], e0 = Math.min(1, Math.max(0, (t - b.nasce) / .7)); if (!e0) continue; const e = 1 - Math.pow(1 - e0, 3), col = b.t < .02 ? ne : ne.map((v, q) => Math.round(v + (rgb[q] - v) * Math.min(1, .25 + b.t)));
      ctx.globalAlpha = (.25 + .7 * b.t) * e; ctx.shadowColor = `rgba(${rgb},${.8 * b.t})`; ctx.shadowBlur = 16 * b.t; ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.4 + .6 * e), 0, 6.2832); ctx.fill(); }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ordM.slice(0, 6).forEach((i, q) => { const b = B[i], v = (Math.sin(t * 1.4 + q) + 1) / 2; if (t < 3) return; ctx.globalAlpha = .25 * v; ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1.2 + .5 * v), 0, 6.2832); ctx.fill(); });
    ctx.globalAlpha = 1; heroRaf = requestAnimationFrame(quadro); };
  heroRaf = requestAnimationFrame(quadro);
  const pos0 = [], escolha = []; for (const i of ordM.slice(0, 40)) { const x = Math.min(w - 80, Math.max(80, B[i].x)), y = B[i].y - B[i].r; if (pos0.some(([a, b]) => Math.abs(a - x) < 150 && Math.abs(b - y) < 34)) continue; pos0.push([x, y]); escolha.push([i, x, y]); if (escolha.length === 5) break; }
  $("#etqs").innerHTML = escolha.map(([i, x, y], q) => `<div class="etq" style="left:${x}px;top:${y}px;animation-delay:${(B[i].nasce + .5).toFixed(2)}s, ${(B[i].nasce + 1.3).toFixed(2)}s"><span>${esc(M[i].n)}</span><b>${ni(c.v[i])}</b></div>`).join("");
}

(async () => {
  await carregar();
  const d = new URLSearchParams(location.search).get("d");
  d ? perfil(d) : telaSelecao();
  addEventListener("popstate", () => { const x = new URLSearchParams(location.search).get("d"); x ? perfil(x) : telaSelecao(); });
})();
