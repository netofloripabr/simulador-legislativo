// Capa do Gabinete · mapa 3D com vidro (16/11/2026). Padrão e decisões em DESIGN-GABINETE.md; veio do protótipo
// prototipos/capa-3d/capa-v2.html (aprovado em 16/11/2026). O mapa é painel/mapa-capa.html, num iframe do mesmo endereço,
// e a capa fala direto com ele (contentWindow.__v4).
// A capa fica FORA de #app (em #capa3d, logo antes): desenhar() redesenha #app a cada clique e o iframe não pode ser
// recriado (o 3D recarregaria). Ela é montada uma vez por parlamentar; depois só os números, a faixa e o aviso mudam.
const C3 = { n: null, REC: null, lente: "voto", MARCAS: { disco: true, pinta: false, relevo: false }, tema: null, DD: null, anal: null, EST: null, ligado: false };
const c3$ = (id) => document.getElementById("c3" + id);
const c3W = () => { const f = c3$("mapa"); try { return f && f.contentWindow; } catch (e) { return null; } };
const c3M = () => { const w = c3W(); return w && w.__v4; };
const C3_REGN = { assoc: "associação", micro: "microrregião", meso: "mesorregião" };
const C3_SVG = { seta: '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4.5 6 7.5 9 4.5"/></svg>',
  graf: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5"/></svg>',
  lado: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4.5 3 7.5 6 4.5 9"/></svg>' };

// sai da tela (primeiro acesso, troca de parlamentar, página sem conta)
function c3Fora() { const c = $("#capa3d"); if (c) c.remove(); C3.n = null; }

// recursos por município, com a chave igual ao nome do município em BASE.mun: { nome: [indicado, pago] }
function c3Rec() { const [R0] = itensCapa(), ix = {}, o = {}; BASE.mun.forEach((m) => { ix[norm(m.n)] = m.n; });
  R0.forEach((x) => { const n = ix[x.mun]; if (!n || !x.v) return; const r = o[n] || (o[n] = [0, 0]); r[0] += x.v; r[1] += x.p || 0; }); return o; }
// lista de emendas do balão do município (o mapa chama parent.emendasPorMunicipio()): { nome: [[ano, nº, objeto, beneficiário, v, vp, situação]] }
window.emendasPorMunicipio = () => { const ix = {}, o = {}; BASE.mun.forEach((m) => { ix[norm(m.n)] = m.n; });
  (E0 || []).forEach((e) => { const n = ix[norm(e.mun)]; if (!n) return; (o[n] = o[n] || []).push([+e.ano || "", esc(e.n || e.k || ""), esc(e.obj || ""), esc(e.benef || ""), e.v || 0, e.vp || 0, e.sit || ""]); });
  Object.values(o).forEach((L) => L.sort((a, b) => b[0] - a[0] || b[4] - a[4])); return o; };

function capa3d() {
  let box = $("#capa3d"); if (!box) { box = document.createElement("div"); box.id = "capa3d"; $("#app").before(box); }
  if (C3.n !== PARL.n) { C3.n = PARL.n; C3.DD = null; C3.REC = null; box.innerHTML = c3Html(); c3Ligar(); }
  c3Info(); c3Painel(); c3Cota();
  const rec = c3Rec(); if (JSON.stringify(rec) !== JSON.stringify(C3.REC)) { C3.REC = rec; C3.DD = null; c3Marca(); }
}

function c3Html() {
  const nm = PARL.u.split(" "), l1 = nm.length > 1 ? nm.slice(0, -1).join(" ") : nm[0], l2 = nm.length > 1 ? nm.slice(-1)[0] : "";
  const q = `fundo=1&tema=escuro&dado=nenhum&marcas=disco&cid=1&esq=.12&dir=.07&topo=.14&baixo=.19&d=${encodeURIComponent(PARL.n)}&v=2`;   // v: versão do mapa (cache)
  return `<section class="g3d" id="ghero">
  <iframe id="c3mapa" src="mapa-capa.html?${q}" title="Mapa de Santa Catarina em 3D"></iframe>
  <div class="vela"></div>
  <div class="id" id="c3id">
    <div class="card vidro"><button class="quem" id="c3quem" title="Trocar o parlamentar"><img class="ft" id="c3ft" src="../dados/fotos/sc-2026/estadual/${esc(PARL.n)}.jpg" alt="" onerror="this.style.visibility='hidden'"><h1 class="nome" id="c3nome"><span class="l1">${esc(l1)}</span><span class="l2">${esc(l2)}</span></h1><span class="troca">${C3_SVG.seta}</span></button></div>
    <div class="lista vidro" id="c3lista"><input placeholder="Buscar parlamentar" aria-label="Buscar parlamentar" autocomplete="off"><div class="c3ll"></div></div>
    <div class="cargo">Deputado estadual · SC · ${esc(PARL.p)}</div>
    <div class="c3info" id="c3info"></div>
  </div>
  <div class="painel vidro" id="c3painel">
    <div class="pcab"><span class="tit" id="c3tit">O mandato em números</span><span class="resumo" id="c3resumo"></span>
      <button class="min" id="c3min" title="Minimizar" aria-label="Minimizar o painel">${C3_SVG.seta}</button></div>
    <div class="pcorpo" id="c3corpo"></div>
  </div>
  <div class="ctrl">
    <div class="legm" id="c3legm"></div>
    <div class="linha1">
      <label class="lupa vidro" id="c3lupa" title="Buscar cidade ou região"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3.5 3.5"/></svg><input placeholder="Buscar cidade ou região…" list="c3lugares" autocomplete="off" aria-label="Buscar cidade ou região"><datalist id="c3lugares"></datalist></label>
      <button class="bt vidro" id="c3btF" title="Ferramentas do mapa" aria-label="Ferramentas do mapa"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 2.6a3.2 3.2 0 0 0-3.9 4.1L2.4 10.2a1.3 1.3 0 0 0 1.8 1.8l3.5-3.5a3.2 3.2 0 0 0 4.1-3.9l-1.9 1.9-1.6-.4-.4-1.6z"/></svg></button>
      <button class="bt vidro" id="c3btA" title="Análises prontas (R$ por voto, aumentos, quedas, regiões…)" aria-label="Análises prontas">${C3_SVG.graf}</button>
      <div class="anal vidro" id="c3anal">
        <div class="fcab"><span>Análises prontas</span><button class="min" id="c3analFecha" aria-label="Minimizar" title="Minimizar">${C3_SVG.seta}</button></div>
        <div class="achips" id="c3achips"></div>
        <p class="dica" id="c3anota">Escolha uma análise: o mapa limpa o que estiver ligado e pinta só as cidades daquela leitura.</p>
        <button class="outros" id="c3rankBt" hidden><span>Ranking</span>${C3_SVG.lado}</button>
        <ol class="alista" id="c3alista" hidden></ol>
      </div>
      <div class="ferr vidro" id="c3ferr">
        <div class="fcab"><span>Ferramentas do mapa</span><button id="c3reset" title="Volta tudo ao padrão">Restaurar padrão</button><button class="min" data-min aria-label="Minimizar" title="Minimizar">${C3_SVG.seta}</button></div>
        <h5>Marcadores · ligue e desligue</h5><div class="g" data-gr="marca"><button class="on" data-v="disco">Disco</button><button data-v="pinta" title="Pinta cada município pela lente escolhida (votos ou recursos)">Votos</button><button data-v="relevo">Relevo do eleitorado</button></div>
        <h5>Base</h5><div class="g" data-gr="base"><button class="on" data-v="sat">Satélite</button><button data-v="gesso">Neutro</button></div>
        <h5>Vista</h5><div class="g"><button id="c3vistaBt" class="vista" title="Clique para alternar a vista"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13 8a5 5 0 1 1-1.5-3.5"/><path d="M11.8 1.8v2.9H8.9"/></svg><span>Automática</span><small>1/5</small></button><button class="cam" data-recentra title="Travar a vista nesta posição" aria-label="Travar a vista"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 5.5h2.6l1.2-1.8h4.4l1.2 1.8H14v7H2z"/><circle cx="8" cy="8.9" r="2.3"/></svg></button></div>
        <button class="outros" id="c3outrosBt"><span>Outros</span><em id="c3outrosOn"></em>${C3_SVG.lado}</button>
        <div class="sub" id="c3sub">
          <div class="fcab"><span>Outros · camadas e dados</span></div>
          <h5>Camadas</h5><div class="g" data-gr="cam"><button data-v="rod">Rodovias</button><button data-v="rio">Rios</button><button data-v="cid">Cidades</button></div>
          <p class="dica" style="margin-top:12px">Dados abaixo: um por vez, por cima das camadas. Clique de novo para voltar à votação.</p>
          <h5>Sociais</h5><div class="g" data-gr="tema"><button data-v="pop_2022">População</button><button data-v="pct_urbana">População urbana</button><button data-v="pct_evangelicos">Evangélicos</button><button data-v="pct_catolicos">Católicos</button></div>
          <h5>Econômicos</h5><div class="g" data-gr="tema"><button data-v="renda_pc_media">Renda per capita</button><button data-v="pct_pop_pbf">Bolsa Família</button></div>
          <h5>Demais</h5><div class="g" data-gr="tema"><button data-v="pct_mulheres_eleit">Eleitoras</button><button data-v="pct_16_24_eleit">Jovens 16–24</button><button data-v="pct_60mais_eleit">Eleitores 60+</button><button data-v="pct_superior_eleit">Ensino superior</button><button disabled title="Falta a lista de cidades com Rede Feminina e o nome de cada presidente">Redes femininas</button><button disabled title="Falta a lista de Câmaras com o programa Vereador Mirim">Vereadores mirins</button></div>
        </div>
      </div>
    </div>
    <div class="sw vidro compacto" id="c3sw"><button class="on" data-l="v">Votos</button><span class="subv"><button class="on" data-a="voto">2026</button>${tem22() ? '<button data-a="v22">2022</button><button data-a="var">Variação</button>' : ""}</span><button data-l="r">Recursos</button></div>
  </div>
  <div class="apill vidro" id="c3apill">${C3_SVG.graf}<button class="ap" data-p="-1" aria-label="Análise anterior">‹</button><button class="an" id="c3apNome"></button><button class="ap" data-p="1" aria-label="Próxima análise">›</button><button class="ax" id="c3apSai" title="Sair da análise (o mapa volta como estava)">×</button></div>
</section>`;
}

// abaixo do cartão: a faixa da equipe e, explorando outro gabinete, o atalho de volta
function c3Info() { const el = c3$("info"); if (!el) return;
  el.innerHTML = `${typeof equipeFaixa === "function" ? equipeFaixa() : ""}${DURL && DURL !== VINC ? `<p class="gvinc">Explorando outro gabinete · <a href="gabinete.html">voltar ao seu</a></p>` : ""}`; }
// aviso da cota aberta: faixa fina no alto da capa (avisoCota/ligarAvisoCota, gabinete.js)
function c3Cota() { const h = $("#ghero"); if (!h) return; h.querySelector(".gloa")?.remove(); const a = avisoCota(); if (a) h.insertAdjacentHTML("afterbegin", a); h.classList.toggle("comCota", !!a); const g = h.querySelector(".gloa"), id = c3$("id"); if (id) id.style.top = g ? g.offsetHeight + 14 + "px" : ""; }

// painel "O mandato em números": recursos (itensCapa) e votos (PARL.v / PARL.v22); com um recorte, só a área dele
function c3Painel() { const corpo = c3$("corpo"); if (!corpo) return;
  const [R0, I] = itensCapa(), R = S.reg ? R0.filter((x) => S.reg.ns.has(x.mun)) : R0;
  const anos = [...new Set(R0.map((x) => x.ano).filter(Boolean))].sort(), per = anos.length ? `${anos[0]}–${String(anos.slice(-1)[0]).slice(2)}` : "";
  const tv = R.reduce((s, x) => s + x.v, 0), tp = R.reduce((s, x) => s + x.p, 0), pp = tv ? Math.min(100, tp / tv * 100) : 0;
  const PM = {}; R.forEach((x) => { if (x.mun && x.mun !== "—") PM[x.mun] = (PM[x.mun] || 0) + x.v; }); const top = Object.entries(PM).sort((a, b) => b[1] - a[1])[0];
  const nomeMun = {}; BASE.mun.forEach((m) => { nomeMun[norm(m.n)] = m.n; });
  const soma = (A) => S.reg ? [...S.reg.ix].reduce((s, i) => s + (A[i] || 0), 0) : null;
  const vR = S.reg ? soma(PARL.v || []) : PARL.t, v22 = tem22() ? (S.reg ? soma(PARL.v22) : PARL.t22) : null, dv = v22 ? (vR - v22) / v22 * 100 : null;
  c3$("tit").textContent = "O mandato em números" + (S.reg ? " · " + S.reg.n : "");
  c3$("resumo").innerHTML = `${esc(fm(tv))}<span>·</span>${ni(vR)} votos`;
  corpo.innerHTML = `<div class="bloco"><small>Recursos indicados${per ? " · " + per : ""}${I ? " · total" : " · impositivas"}</small>
      <div class="v"><b>${esc(fm(tv))}</b></div>
      ${tv ? `<div class="barra"><i style="width:${pp.toFixed(1)}%;background:var(--vd)"></i><i style="width:${(100 - pp).toFixed(1)}%;background:rgba(91,131,240,.75)"></i></div>
      <div class="leg"><span><i style="background:var(--vd)"></i>${nf(pp, 0)}% pago</span><span><i style="background:rgba(91,131,240,.75)"></i>${nf(100 - pp, 0)}% a pagar</span></div>` : `<div class="leg">Nenhum recurso indicado ${S.reg ? "para " + esc(S.reg.n) : "ainda"}.</div>`}
      <div class="mini3"><div><b>${ni(R.length)}</b>${I ? "emendas e convênios" : "emendas"}</div><div><b>${ni(Object.keys(PM).length)}</b>${Object.keys(PM).length === 1 ? "município" : "municípios"}</div>${top ? `<div><b>${esc(fm(top[1]))}</b>${esc(nomeMun[top[0]] || top[0])}</div>` : ""}</div></div>
    <div class="bloco"><small>Votos${S.reg ? " · " + esc(S.reg.n) : ""}</small>
      <div class="vcols"><div><em>2026</em><b>${ni(vR)}</b>${dv != null ? `<span class="chip${dv >= 0 ? " sobe" : ""}">${dv >= 0 ? "+" : "−"}${nf(Math.abs(dv), 1)}% vs 2022</span>` : ""}</div>${v22 != null ? `<div class="ant"><em>2022</em><b>${ni(v22)}</b></div>` : ""}</div>
      ${S.reg ? `<div class="leg">${nf(vR / (PARL.t || 1) * 100, 1)}% dos votos do mandato${S.reg.t !== "mun" ? ` · ${ni(S.reg.ix.size)} municípios` : ""}</div>` : ""}</div>`;
  c3Ajusta();
}

// nome em duas linhas: a 1ª com tamanho fixo e a 2ª (sobrenome) na mesma largura; foto redonda com a altura das duas
// linhas; o painel do mandato largo em tela grande, com a largura do cartão em tela menor
function c3Ajusta() { const h = c3$("nome"), ft = c3$("ft"), id = c3$("id"), p = c3$("painel"); if (!h || !id) return;
  const c1 = id.querySelector(".card"), [l1, l2] = h.querySelectorAll("span"), fs = Math.max(24, Math.min(34, innerWidth * .024));
  [l1, l2].forEach((s) => { s.style.display = "inline-block"; }); l1.style.fontSize = fs + "px"; l2.style.fontSize = fs + "px";
  const w1 = l1.getBoundingClientRect().width, w2 = l2.getBoundingClientRect().width || w1; l2.style.fontSize = Math.max(fs * .6, Math.min(fs * 1.5, fs * w1 / w2)) + "px";
  [l1, l2].forEach((s) => { s.style.display = s.textContent ? "block" : "none"; }); h.style.width = Math.max(w1, l2.getBoundingClientRect().width) + "px";
  ft.style.width = ft.style.height = Math.round(h.getBoundingClientRect().height) + "px";
  id.style.width = ""; const L = Math.ceil(c1.getBoundingClientRect().width); id.style.width = L + "px";
  if (p && !p.classList.contains("mini") && !$("#ghero").classList.contains("esfera")) p.style.width = innerWidth > 1100 ? "min(600px, 46vw)" : L + "px"; }

// ----- mapa: marcadores, legenda, ferramentas e análises (igual ao protótipo aprovado) -----
const C3_LEG = { voto: '<span><i style="background:#2B5FD9"></i>votos 2026 por município</span>', v22: '<span><i style="background:#2B5FD9;opacity:.6"></i>votos 2022 por município</span>', var: '<span><i style="background:#34C85A"></i>cresceu</span><span><i style="background:#E85A3C"></i>caiu</span>', rec: '<span><i style="background:#2B5FD9"></i>indicado</span><span><i style="background:#34E84A"></i>pago</span>' };
const c3fx = (cs) => '<span class="lfx">' + cs.map((c) => `<b style="background:${c}"></b>`).join("") + "</span>";
const c3Rampas = () => { const w = c3W(); return w && w.__rampas; };
const c3LegA = () => { const R = c3Rampas(); if (!R) return {}; return { voto: "menos" + c3fx(R.voto) + "mais votos 2026 <span>· sem cor = sem voto</span>", v22: "menos" + c3fx(R.voto) + "mais votos 2022 <span>· sem cor = sem voto</span>", var: "caiu" + c3fx([...R.dn].reverse()) + c3fx(R.up) + "cresceu", rec: "mais a pagar" + c3fx([...R.apagar].reverse().slice(0, 4)) + c3fx(R.pago.slice(3)) + "mais pago <span>· sem cor = sem emenda</span>" }; };
const C3_TEMA = { pop_2022: "população", renda_pc_media: "renda per capita", pct_pop_pbf: "% no Bolsa Família", pct_evangelicos: "% evangélicos", pct_mulheres_eleit: "% mulheres no eleitorado", pct_16_24_eleit: "% eleitores de 16 a 24", pct_60mais_eleit: "% eleitores 60+", pct_superior_eleit: "% eleitores com superior", pct_urbana: "% população urbana", pct_catolicos: "% católicos" };
function c3Marca() { const v = c3M(), lg = c3$("legm"); if (!v || !v.marcadores || !lg) return; v.marcadores(C3.lente, C3.REC || {}); const R = c3Rampas();
  lg.innerHTML = C3.legAnal ? C3.legAnal : C3.tema && R ? "menor" + c3fx(R.tema) + "maior " + C3_TEMA[C3.tema] : (C3.MARCAS.pinta ? (c3LegA()[C3.lente] || "") : C3.MARCAS.disco ? C3_LEG[C3.lente] : "") + (C3.MARCAS.relevo ? "<span>· altura = eleitorado</span>" : ""); }
// ferramentas (16/11/2026): as escolhas ficam guardadas no navegador até "Restaurar padrão"
const C3_VISTAS = [["auto", "Automática"], ["padrao", "Isométrica"], ["alta", "Alta"], ["sul", "Do sul"], ["cima", "De cima"]];
const C3_PADRAO = { marcas: { disco: true, pinta: false, relevo: false }, base: "sat", vista: "auto", cam: { cid: true }, tema: null };
const c3Guarda = () => { try { localStorage.setItem("gab_capa_ferr", JSON.stringify(C3.EST)); } catch (e) {} };
function c3Botoes() { const ferr = c3$("ferr"), E = C3.EST; ferr.querySelectorAll('[data-gr="marca"] button').forEach((x) => x.classList.toggle("on", !!E.marcas[x.dataset.v])); ferr.querySelectorAll('[data-gr="base"] button').forEach((x) => x.classList.toggle("on", x.dataset.v === E.base));
  ferr.querySelectorAll('[data-gr="cam"] button').forEach((x) => x.classList.toggle("on", !!E.cam[x.dataset.v])); ferr.querySelectorAll('[data-gr="tema"] button').forEach((x) => x.classList.toggle("on", x.dataset.v === E.tema));
  const i = Math.max(0, C3_VISTAS.findIndex(([k]) => k === E.vista)); c3$("vistaBt").querySelector("span").textContent = C3_VISTAS[i][1]; c3$("vistaBt").querySelector("small").textContent = `${i + 1}/${C3_VISTAS.length}`;
  c3$("outrosOn").textContent = E.tema ? C3_TEMA[E.tema] : ""; }
async function c3Aplica(inicio) { const v = c3M(); if (!v) return; const E = C3.EST; c3Botoes(); C3.MARCAS = E.marcas; C3.tema = E.tema;
  if (!inicio || JSON.stringify(E.marcas) !== JSON.stringify(C3_PADRAO.marcas)) v.marcas(E.marcas); if (!inicio || E.base !== "sat") await v.base(E.base);
  for (const c of ["rod", "rio", "cid"]) if (!inicio || !!E.cam[c] !== !!C3_PADRAO.cam[c]) await v.camada(c, !!E.cam[c]);
  if (!inicio || E.tema) await v.tema(E.tema); v.vista(E.vista); c3Marca();
  if (S.reg) selReg(S.reg, true); }   // um recorte escolhido antes do mapa ficar pronto

// Análises prontas (16/11/2026): rankings estratégicos; os 10 municípios da análise viram rótulos no mapa
const c3n = (n) => Math.round(n).toLocaleString("pt-BR"), c3mi = (v) => "R$ " + (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi", c3pc = (x) => (x * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
const C3_MIN_VOT = 50, C3_MIN_EL = 30000;   // corta dados irrisórios que distorcem a conta (ex.: 3 votos e R$ 300 mil = R$ 100 mil por voto)
const c3dd = () => C3.DD || (C3.DD = c3M().dados());
const c3RpvBase = () => c3dd().filter((x) => C3.REC && C3.REC[x.nome] && x.vot >= C3_MIN_VOT).map((x) => ({ ...x, rec: C3.REC[x.nome][0], c: C3.REC[x.nome][0] / x.vot })).sort((a, b) => a.c - b.c);
const c3Rpv = () => c3RpvBase().map((x) => ({ n: x.nome, v: "R$ " + c3n(x.c) + "/voto", s: `${c3mi(x.rec)} · ${c3n(x.vot)} votos` }));
const c3MediaRpv = () => { const L = c3RpvBase(), r = L.reduce((a, x) => a + x.rec, 0), v = L.reduce((a, x) => a + x.vot, 0); return v ? "R$ " + c3n(r / v) + "/voto" : "—"; };
const c3Difs = () => c3dd().map((x) => ({ ...x, d: x.vot - x.v22 })).sort((a, b) => b.d - a.d);
const c3Regioes = () => { const G = {}; c3dd().forEach((x) => { if (!x.regiao) return; const g = G[x.regiao] || (G[x.regiao] = { vot: 0, v22: 0 }); g.vot += x.vot; g.v22 += x.v22; });
  const L = Object.entries(G).map(([n, g]) => ({ n, d: g.vot - g.v22, g })).sort((a, b) => b.d - a.d), f = (x) => ({ n: x.n, v: (x.d >= 0 ? "+" : "−") + c3n(Math.abs(x.d)), s: `${c3n(x.g.v22)} → ${c3n(x.g.vot)}`, reg: true });
  return [{ cab: "Maior aumento" }, ...L.slice(0, 5).map(f), { cab: "Maior queda" }, ...L.slice(-5).reverse().map(f)]; };
const C3_ANALISES = [
  { id: "rpv", nome: "R$ por voto · melhor retorno", nota: () => `Recurso indicado ÷ votos 2026. Só municípios com recurso e pelo menos ${C3_MIN_VOT} votos. Média geral: ${c3MediaRpv()}.`, lista: () => c3Rpv().slice(0, 10) },
  { id: "rpvp", nome: "R$ por voto · pior retorno", nota: () => `Onde cada voto custou mais. Mesmo corte (≥ ${C3_MIN_VOT} votos). Média geral: ${c3MediaRpv()}.`, lista: () => c3Rpv().reverse().slice(0, 10) },
  { id: "sobe", nome: "10 maiores aumentos de votos", nota: () => "Votos 2026 − votos 2022, em número de votos.", lista: () => c3Difs().slice(0, 10).filter((x) => x.d > 0).map((x) => ({ n: x.nome, v: "+" + c3n(x.d), s: `${c3n(x.v22)} → ${c3n(x.vot)}` })), so22: true },
  { id: "cai", nome: "10 maiores quedas de votos", nota: () => "Votos 2026 − votos 2022, em número de votos.", lista: () => c3Difs().reverse().slice(0, 10).filter((x) => x.d < 0).map((x) => ({ n: x.nome, v: "−" + c3n(-x.d), s: `${c3n(x.v22)} → ${c3n(x.vot)}` })), so22: true },
  { id: "reg", nome: "Regiões: maior aumento × maior queda", nota: () => "Soma dos municípios de cada associação. Clique numa região para ver o recorte.", lista: () => c3Regioes(), so22: true },
  { id: "pot", nome: "Potencial: muito eleitor, pouco voto", nota: () => `Cidades com mais de ${c3n(C3_MIN_EL)} eleitores onde o % dos válidos é menor.`, lista: () => c3dd().filter((x) => x.el >= C3_MIN_EL).sort((a, b) => a.pct - b.pct).slice(0, 10).map((x) => ({ n: x.nome, v: c3pc(x.pct), s: `${c3n(x.vot)} votos · ${c3n(x.el)} eleitores` })) },
  { id: "fiel", nome: "Bases mais fiéis", nota: () => `Maior % dos válidos, entre cidades com pelo menos ${C3_MIN_VOT * 2} votos.`, lista: () => c3dd().filter((x) => x.vot >= C3_MIN_VOT * 2).sort((a, b) => b.pct - a.pct).slice(0, 10).map((x) => ({ n: x.nome, v: c3pc(x.pct), s: `${c3n(x.vot)} votos` })) },
];
const c3Analises = () => C3_ANALISES.filter((a) => !a.so22 || tem22());
const C3_CURTO = { rpv: "R$/voto · melhores", rpvp: "R$/voto · piores", sobe: "Maiores aumentos", cai: "Maiores quedas", reg: "Regiões ↑ × ↓", pot: "Potencial", fiel: "Bases fiéis" };
const C3_TOM = { rpv: "bom", rpvp: "ruim", sobe: "bom", cai: "ruim", reg: "reg", pot: "pot", fiel: "azul" };
const c3Rampa = (tom) => { const R = c3Rampas(); return { bom: R.up, ruim: R.dn, pot: R.tema, azul: R.voto }[tom]; };
const c3CorRank = (tom, i, n) => c3Rampa(tom)[6 - Math.floor(i * 7 / Math.max(n, 1))];
function c3Lista(L) { let i = 0, j = 0; c3$("alista").innerHTML = L.map((x) => x.cab ? (j = 0, `<li class="cab">${x.cab}</li>`) : `<li data-n="${esc(x.n)}"${x.reg ? ' data-reg="1"' : ""}><i>${x.reg ? ++j : ++i}</i><b>${esc(x.n)}</b><span>${x.v}<small>${x.s}</small></span></li>`).join("") || '<li class="cab">Nada para mostrar com esse corte.</li>'; }
// escolher uma análise: o mapa limpa e pinta só as cidades (ou regiões) dela; o botão vira a pílula com ‹ ›
function c3Entra(id) { const a = C3_ANALISES.find((x) => x.id === id), v = c3M(); if (!a || !v) return; C3.anal = id; const tom = C3_TOM[id], L = a.lista(), cores = {}, rot = [];
  if (tom === "reg") { const ups = L.slice(1, 6), dns = L.slice(7); c3dd().forEach((m) => { const iu = ups.findIndex((x) => x.n === m.regiao), id2 = dns.findIndex((x) => x.n === m.regiao); if (iu >= 0) cores[m.nome] = c3CorRank("bom", iu, 5); else if (id2 >= 0) cores[m.nome] = c3CorRank("ruim", id2, 5); });
    C3.legAnal = "maior aumento" + c3fx(c3Rampa("bom").slice(2).reverse()) + "&nbsp;" + c3fx(c3Rampa("ruim").slice(2)) + "maior queda <span>· associações de municípios</span>"; }
  else { const it = L.filter((x) => !x.cab); it.forEach((x, i) => { cores[x.n] = c3CorRank(tom, i, it.length); rot.push([x.n, x.v]); }); C3.legAnal = "1º" + c3fx([...c3Rampa(tom)].reverse()) + `${it.length}º <span>· ${a.nome}</span>`; }
  v.analise({ id, cores, rotulos: rot }); c3Lista(L);
  c3$("achips").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.a === id)); c3$("anota").textContent = a.nota(); c3$("rankBt").hidden = false;
  c3$("apNome").textContent = C3_CURTO[id] || a.nome; c3$("apNome").title = a.nome + " · clique para ver o quadro"; c3$("apill").classList.add("on"); c3$("btA").style.display = "none";
  $("#ghero .linha1").classList.add("emAnal"); $("#ghero").classList.add("esfera"); c3FechaFerr(); c3Marca(); }
function c3Sai() { C3.anal = null; C3.legAnal = null; const v = c3M(); if (v) { v.analise(null); v.reserva(0); } c3$("apill").classList.remove("on"); c3$("btA").style.display = ""; $("#ghero .linha1").classList.remove("emAnal"); $("#ghero").classList.remove("esfera");
  c3$("anal").classList.remove("aberta"); c3$("btA").classList.remove("on"); c3$("achips").querySelectorAll("button").forEach((b) => b.classList.remove("on")); c3$("rankBt").hidden = true; c3$("alista").hidden = true; c3$("rankBt").classList.remove("on"); c3Marca(); c3Ajusta(); }
const c3Vao = () => { const v = c3M(); if (!v || !v.vao) return; const f = c3$("ferr"), a = c3$("anal"), q = f.classList.contains("aberta") ? f : a.classList.contains("aberta") ? a : null; v.vao(q ? q.offsetWidth + 24 : 0); };   // mapa no espaço livre ao lado do quadro aberto (17/11/2026)
const c3FechaFerr = () => { c3$("ferr").classList.remove("aberta"); c3$("btF").classList.remove("on"); c3Vao(); };
const c3AbreQuadro = () => { c3FechaFerr(); c3$("anal").classList.add("aberta"); const v = c3M(); if (v) v.reserva(c3$("anal").offsetWidth + 34); c3Vao(); };
const c3FechaAnal = () => { c3$("anal").classList.remove("aberta"); c3$("btA").classList.remove("on"); const v = c3M(); if (v) v.reserva(0); c3Vao(); };

// painel minimizável (lembrado no navegador)
function c3Mini(m) { const p = c3$("painel"); p.classList.toggle("mini", m); p.style.width = m ? "" : innerWidth > 1100 ? "min(600px, 46vw)" : c3$("id").style.width; try { localStorage.setItem("gab_capa_painel_mini", m ? "1" : "0"); } catch (e) {} }

function c3Ligar() {
  C3.lente = "voto"; C3.anal = null; C3.legAnal = null;
  C3.EST = (() => { try { return { ...JSON.parse(JSON.stringify(C3_PADRAO)), ...JSON.parse(localStorage.getItem("gab_capa_ferr") || "{}") }; } catch (e) { return JSON.parse(JSON.stringify(C3_PADRAO)); } })();
  if (document.fonts) document.fonts.ready.then(c3Ajusta);
  // trocar o parlamentar (17/11/2026): lista com busca e rolagem embaixo do cartão, como na capa antiga (não a página inteira)
  c3$("quem").onclick = (e) => { e.stopPropagation(); const id = c3$("id"), L = c3$("lista"); id.classList.toggle("aberta"); if (!id.classList.contains("aberta")) return;
    const EL = EST.c.filter((c) => /^eleito/i.test(c.s || "")).sort((a, b) => a.u.localeCompare(b.u, "pt-BR")), inp = L.querySelector("input"), ll = L.querySelector(".c3ll");
    const pinta = () => { const q = norm(inp.value); ll.innerHTML = EL.filter((c) => !q || norm(c.u + " " + c.p).includes(q)).map((c) => `<button data-n="${esc(c.n)}"${c.n === PARL.n ? ' class="on"' : ""}><i style="background:${COR_P[c.p] || "#8A9096"}">${esc(c.u.split(" ").map((w) => w[0]).slice(0, 2).join(""))}</i>${esc(c.u)}<small>${esc(c.p)}</small></button>`).join("") || `<p class="mu">Nada encontrado.</p>`; };
    inp.value = ""; pinta(); inp.oninput = pinta; inp.focus();
    ll.onclick = async (ev) => { const b = ev.target.closest("[data-n]"); if (!b) return; if (b.dataset.n === PARL.n) { id.classList.remove("aberta"); return; } b.disabled = true;
      try { if (SESS) { const { error } = await supabaseClient.from("gab_vinculo").upsert({ dono: SESS.user.id, parlamentar: b.dataset.n, atualizado_em: new Date().toISOString() }); if (error) throw error; } else localStorage.setItem("gab_vinc_local", b.dataset.n); } catch (er) { b.disabled = false; alert("Não foi possível salvar o vínculo: " + (er.message || er)); return; }
      location.href = "gabinete.html"; }; };
  c3$("lista").onclick = (e) => e.stopPropagation();
  try { const g = localStorage.getItem("gab_capa_painel_mini"); if (g === "1" || (g == null && innerWidth < 760)) c3Mini(true); } catch (e) {}   // tela estreita: começa minimizado (o mapa aparece)
  c3$("min").onclick = () => { const h = $("#ghero"); if (h.classList.contains("esfera")) { h.classList.remove("esfera"); c3Mini(false); return; } c3Mini(!c3$("painel").classList.contains("mini")); };
  // busca: a cidade ou a região escolhida vira o recorte do mapa (o mapa avisa de volta e os números acompanham)
  const lupa = c3$("lupa"), li = lupa.querySelector("input");
  lupa.onclick = () => { lupa.classList.add("aberta"); li.focus(); const v = c3M(), dl = c3$("lugares"); if (v && v.nomes && !dl.children.length) dl.innerHTML = v.nomes().map((n) => `<option value="${esc(n)}">`).join(""); };
  const vai = () => { const v = c3M(); if (v && li.value.trim()) v.busca(li.value.trim()); }; li.addEventListener("change", vai); li.addEventListener("keydown", (e) => { if (e.key === "Enter") vai(); }); li.onblur = () => { if (!li.value) lupa.classList.remove("aberta"); };
  const sw = c3$("sw");
  sw.onclick = (e) => { e.stopPropagation(); /* 2026/2022/Variação fechados por padrão; tocar em Votos já ativo abre ou fecha; Recursos fecha */ const bv = e.target.closest("[data-l=v]"); if (bv && bv.classList.contains("on")) { sw.classList.toggle("compacto"); return; } if (e.target.closest("[data-l=r]")) sw.classList.add("compacto"); const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.l) { sw.querySelectorAll(":scope > button").forEach((x) => x.classList.toggle("on", x === b)); sw.classList.toggle("rec", b.dataset.l === "r"); C3.lente = b.dataset.l === "r" ? "rec" : sw.querySelector(".subv .on").dataset.a; }
    else { b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); C3.lente = b.dataset.a; }
    c3Marca(); };
  const ferr = c3$("ferr"), anal = c3$("anal"), btA = c3$("btA"), sub = c3$("sub"), alista = c3$("alista"), rankBt = c3$("rankBt");
  c3$("btF").onclick = (e) => { e.stopPropagation(); if (anal.classList.contains("aberta")) c3FechaAnal(); ferr.classList.toggle("aberta"); c3$("btF").classList.toggle("on", ferr.classList.contains("aberta")); c3Vao(); };
  c3$("outrosBt").onclick = (e) => { e.stopPropagation(); sub.classList.toggle("aberta"); c3$("outrosBt").classList.toggle("on", sub.classList.contains("aberta")); if (sub.classList.contains("aberta")) setTimeout(() => ferr.scrollTo({ top: ferr.scrollHeight, behavior: "smooth" }), 30); };
  c3$("reset").onclick = async (e) => { e.stopPropagation(); C3.EST = JSON.parse(JSON.stringify(C3_PADRAO)); c3Guarda(); await c3Aplica(false); const v = c3M(); if (v) { v.inicio(); v.recentra(); } li.value = ""; };
  c3$("vistaBt").onclick = (e) => { e.stopPropagation(); const i = C3_VISTAS.findIndex(([k]) => k === C3.EST.vista); C3.EST.vista = C3_VISTAS[(i + 1) % C3_VISTAS.length][0]; c3Guarda(); c3Botoes(); const v = c3M(); if (v) v.vista(C3.EST.vista); };
  ferr.onclick = async (e) => { e.stopPropagation(); if (e.target.closest("[data-min]")) { c3FechaFerr(); return; } const b = e.target.closest("button"); if (!b || b.disabled || !b.parentElement.dataset.gr && b.dataset.recentra == null) return; const v = c3M(); if (!v) return; const E = C3.EST;
    if (b.dataset.recentra != null) { const on = v.trava(!v.travada()); b.classList.toggle("on", on); b.title = on ? "Vista travada: abrir quadros ou trocar ferramentas não mexe no mapa. Clique para destravar." : "Travar a vista nesta posição"; return; }
    const g = b.parentElement.dataset.gr, x = b.dataset.v;
    if (g === "cam") { E.cam[x] = !E.cam[x]; c3Guarda(); c3Botoes(); await v.camada(x, E.cam[x]); return; }
    if (g === "tema") { E.tema = E.tema === x ? null : x; C3.tema = E.tema; c3Guarda(); c3Botoes(); await v.tema(C3.tema); c3Marca(); return; }
    if (g === "marca") { E.marcas = { ...E.marcas, [x]: !E.marcas[x] }; C3.MARCAS = E.marcas; c3Guarda(); c3Botoes(); v.marcas(E.marcas); c3Marca(); }
    if (g === "base") { E.base = x; c3Guarda(); c3Botoes(); await v.base(x); } };
  c3$("achips").innerHTML = c3Analises().map((a) => `<button data-a="${a.id}">${a.nome}</button>`).join("");
  c3$("achips").onclick = (e) => { e.stopPropagation(); const b = e.target.closest("button"); if (b) c3Entra(b.dataset.a); };
  rankBt.onclick = (e) => { e.stopPropagation(); alista.hidden = !alista.hidden; rankBt.classList.toggle("on", !alista.hidden); if (!alista.hidden) setTimeout(() => anal.scrollTo({ top: anal.scrollHeight, behavior: "smooth" }), 30); };
  alista.onclick = (e) => { e.stopPropagation(); const li2 = e.target.closest("li[data-n]"); if (!li2) return; const v = c3M(); if (!v) return; if (li2.dataset.reg) v.busca(li2.dataset.n + " · associação"); else v.abre(li2.dataset.n); };
  c3$("analFecha").onclick = (e) => { e.stopPropagation(); c3FechaAnal(); };
  anal.onclick = (e) => e.stopPropagation();
  c3$("apill").onclick = (e) => { e.stopPropagation(); const b = e.target.closest("button"); if (!b) return; if (b.id === "c3apSai") return c3Sai(); if (b.dataset.p) { const L = c3Analises(), i = L.findIndex((x) => x.id === C3.anal), n = L.length; return c3Entra(L[(i + +b.dataset.p + n) % n].id); } if (anal.classList.contains("aberta")) c3FechaAnal(); else c3AbreQuadro(); };
  btA.onclick = (e) => { e.stopPropagation(); if (anal.classList.contains("aberta")) return c3FechaAnal(); btA.classList.add("on"); c3AbreQuadro(); };
  if (!C3.ligado) { C3.ligado = true;
    document.addEventListener("click", (e) => { if (!c3$("ferr") || e.target.closest("#ghero .linha1")) return; c3FechaFerr(); });
    addEventListener("resize", c3Ajusta);
    document.addEventListener("keydown", (e) => { if (e.key !== "Escape" || !$("#ghero") || document.getElementById("hfm") || document.getElementById("mxPop")) return; const id = c3$("id"); if (id && id.classList.contains("aberta")) { id.classList.remove("aberta"); return; } if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "") && !document.activeElement.closest("#ghero")) return; const v = c3M(); if (v && v.onde && v.onde()) { v.inicio(); const i = $("#ghero #c3lupa input"); if (i) i.value = ""; } });
    document.addEventListener("click", (e) => { const id = c3$("id"); if (id && !e.target.closest("#c3id")) id.classList.remove("aberta"); });
    addEventListener("message", (e) => { const d = e.data; if (!d || !d.mapa3d || e.source !== c3W()) return;
      if (d.mapa3d === "pronto") c3Aplica(true);
      if (d.mapa3d === "trava") { const c = $("#ghero [data-recentra]"); if (c) { c.classList.toggle("on", !!d.on); c.title = "Travar a vista nesta posição"; } }
      // recorte escolhido no próprio mapa (busca, clique em "ver o recorte", câmera): números, ranking e região acompanham
      if (d.mapa3d === "recorte") { const r = d.niv === "uf" ? null : regioes().find((x) => x.t === d.niv && x.n === d.nome) || null; if (r !== S.reg) selReg(r, false); } }); }
}
