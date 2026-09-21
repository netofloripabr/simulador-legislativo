// Resultados (Fase 6) — Santa Catarina. Protótipo aprovado em 19-20/09/2026:
// hub com apuração, plenário terreno com o resultado APURADO, lista de
// candidatos no card padrão (etiqueta pela situação oficial, caixas
// anterior / seu palpite / apurado, ficha com Municípios / Seções /
// Histórico e favorito) e mapa de calor com a malha real do IBGE (modos
// Votos / Variação, região por mesorregião ou associação, lista município
// → zona → seção, ordenador suspenso).
//
// ENSAIO: enquanto não existe apuração de 2026, "apurado" = resultado de
// 2022 e "anterior" = 2018 (RES_ANO_APURADO/RES_ANO_ANTERIOR). Quando o
// TSE publicar 2026, troca-se os dois números e a fonte do "apurado" vira
// a apuração ao vivo — a tela não muda.
//
// Dados: dados/resultados/sc-{ano}/{cargo}.json (candidatos + votos por
// município), {cargo}-zonas.json (por zona), secoes/{municipio}.json (por
// seção, só 2022) — carregados por fetch SOB DEMANDA, nunca pelo
// index.html (o maior tem ~3 MB). Ver ferramentas/tratar_resultados_municipio.py.

const RES_UF = "SC";
const RES_ANO_APURADO = 2022;
const RES_ANO_ANTERIOR = 2018;
const RES_ANOS_HISTORICO = [2022, 2018, 2014];

function _resNorm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();
}
function _resSlug(s) {
  return _resNorm(s).replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
function _resFmt(n) { return (Number(n) || 0).toLocaleString("pt-BR"); }
function _resPct(v, base) {
  if (!base) return null;
  return (v - base) / base * 100;
}
function _resPctHtml(p, extra) {
  if (p === null || p === undefined || !isFinite(p)) return `<span style="color:#8A9096;">—</span>`;
  const cor = p >= 0 ? "#34E84A" : "#E8432A";
  return `<span style="color:${cor};${extra || ""}">${p >= 0 ? "+" : ""}${p.toFixed(1).replace(".", ",")}%</span>`;
}

// ---------- carga sob demanda ----------
async function _resCarregar(ano, cargo, sufixo) {
  pcState._resCache = pcState._resCache || {};
  const k = `${ano}/${cargo}${sufixo || ""}`;
  if (pcState._resCache[k]) return pcState._resCache[k];
  try {
    const r = await fetch(`dados/resultados/${RES_UF.toLowerCase()}-${ano}/${cargo}${sufixo || ""}.json`, { cache: "force-cache" });
    if (!r.ok) throw new Error(r.status);
    pcState._resCache[k] = await r.json();
  } catch (e) {
    console.error("Resultados: falha ao carregar", k, e);
    pcState._resCache[k] = null;
  }
  return pcState._resCache[k];
}
// ---------- apuração AO VIVO (Fase 6, passo 2 — 21/09/2026) ----------
// A rotina apuracao-tse publica storage://apuracao/sc-{ano}/{cargo}.json no
// mesmo formato do arquivo estático (+ meta). Quando config_app diz que a
// apuração está ativa (ou ?aovivo=1 na URL, pra ensaio), o "apurado" passa
// a vir de lá, e a tela se atualiza sozinha enquanto não chegar a 100%.
const RES_APURACAO_URL = `${SUPABASE_URL}/storage/v1/object/public/apuracao`;
async function _resApuracaoConfig() {
  if (pcState._resApuCfg && Date.now() - pcState._resApuCfg.t < 60000) return pcState._resApuCfg;
  const forcado = /[?&]aovivo=1/.test(location.search);
  let cfg = { ativa: forcado, ano: RES_ANO_APURADO, t: Date.now() };
  try {
    const { data } = await supabaseClient.from("config_app").select("chave, valor").in("chave", ["apuracao_ativa", "apuracao_ano"]);
    const m = Object.fromEntries((data || []).map((r) => [r.chave, r.valor]));
    cfg = { ativa: forcado || m.apuracao_ativa === "true", ano: Number(m.apuracao_ano) || RES_ANO_APURADO, t: Date.now() };
  } catch (e) { /* sem banco: fica estático */ }
  pcState._resApuCfg = cfg;
  return cfg;
}
async function _resCarregarAoVivo(ano, cargo) {
  try {
    const r = await fetch(`${RES_APURACAO_URL}/${RES_UF.toLowerCase()}-${ano}/${cargo}.json?t=${Math.floor(Date.now() / 30000)}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
// Junta o ao vivo (totais/situação) com o estático (votos por município,
// que a rotina ainda não traz) — por SQ_CANDIDATO.
function _resMesclar(vivo, estatico) {
  if (!vivo) return estatico;
  const porSq = new Map(((estatico && estatico.candidatos) || []).map((c) => [c.sq, c]));
  return { ...vivo, candidatos: vivo.candidatos.map((c) => { const e = porSq.get(c.sq); return e ? { ...e, ...c, nome: e.nome || c.nome, nomeUrna: e.nomeUrna || c.nomeUrna, municipios: e.municipios || {} } : c; }) };
}
function _resTempoRelativo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60); if (m < 60) return `há ${m} min`;
  return `há ${Math.round(m / 60)} h`;
}
function _resArmarAtualizacao(meta) {
  clearTimeout(pcState._resTimer);
  if (!meta || meta.final || (meta.pctSecoes || 0) >= 100) return;
  pcState._resTimer = setTimeout(() => {
    if ((pcState.subaba === "resultados" || pcState.tela === "resultados-convidado") && document.getElementById("pcResCorpo")) {
      pcState._resApuCfg = null;
      renderResultados();
    }
  }, 60000);
}

async function _resCarregarSecoes(municipioChave) {
  return _resCarregar(RES_ANO_APURADO, "secoes/" + _resSlug(municipioChave), "");
}

// Etiqueta pela situação OFICIAL do TSE (não pela nossa apuração — aqui o
// dado é o resultado de verdade).
function _resEtiqueta(c, cargo) {
  const s = (c.situacao || "").toUpperCase();
  if (s.includes("ELEITO POR QP") || (cargo === "senador" && s.startsWith("ELEITO"))) return `<span class="pc-sen-chip" title="${cargo === "senador" ? "Eleito (mais votado)" : "Eleito pelo quociente partidário"}">${cargo === "senador" ? "E" : "E-QP"}</span>`;
  if (s.includes("ELEITO POR M") || s.startsWith("ELEITO")) return `<span class="pc-sen-chip em" title="Eleito pela sobra (método das médias)">E-M</span>`;
  if (s.includes("SUPLENTE")) return `<span class="pc-sen-chip sup" title="Suplente">S</span>`;
  return `<span class="pc-sen-chip sup" style="opacity:.55;" title="${c.situacao || "Não eleito"}">F</span>`;
}
function _resEleito(c) { return (c.situacao || "").toUpperCase().startsWith("ELEITO"); }

// Favoritos por conta (localStorage; migra pra banco quando o painel
// "meus candidatos" na página inicial entrar).
function _resFavChave() { return "sel-res-fav-" + ((pcState.perfil && pcState.perfil.id) || "anon"); }
function _resFavoritos() {
  try { return new Set(JSON.parse(localStorage.getItem(_resFavChave()) || "[]")); } catch (e) { return new Set(); }
}
function _resToggleFav(sq) {
  const f = _resFavoritos();
  if (f.has(sq)) f.delete(sq); else f.add(sq);
  try { localStorage.setItem(_resFavChave(), JSON.stringify([...f])); } catch (e) { /* ok */ }
}

// Meu palpite (cédula depositada mais recente, ou a lista ativa) — casa
// por nome de urna normalizado, porque o resultado do TSE usa SQ_CANDIDATO
// e o app usa `chave`.
function _resMeuPalpiteMapa(cargo) {
  const lista = pcState.palpitesPorCargo && pcState.palpitesPorCargo[cargo];
  const m = new Map();
  (lista || []).forEach((p) => (p.candidatos || []).forEach((c) => {
    if (c.fonte === "legenda") return;
    m.set(_resNorm(c.nomeUrna || c.nome), { votos: Number(c.votos) || 0, marcado: !!c.marcadoEleito });
  }));
  return m;
}

// Ícone do ordenador (padrão de filtro suspenso do app, 20/09/2026)
const RES_IC_FILTRO = '<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 4h11M4.5 8h7M6.5 12h3"/></svg>';
const RES_IC_CHEV = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';
const RES_IC_ESTRELA = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/></svg>';

function _resDropdown(id, rotulo, valorTxt, itensHtml, opcoes) {
  const o = opcoes || {};
  return `<div class="pc-dd${o.direita ? " right" : ""}" id="${id}">
    <button class="pc-dd-btn${o.icone ? " ico" : ""}" type="button" title="${o.titulo || ""}">${o.icone ? o.icone : `<small>${rotulo}</small><span data-dd-txt>${valorTxt}</span>${RES_IC_CHEV}`}</button>
    <div class="pc-dd-menu${o.direita ? " right" : ""}" style="${o.largura ? `min-width:${o.largura}px;` : ""}">${itensHtml}</div>
  </div>`;
}
function _resLigarDropdowns(raiz, aoEscolher) {
  const escopo = raiz || document;
  escopo.querySelectorAll(".pc-dd").forEach((el) => {
    const btn = el.querySelector(".pc-dd-btn");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".pc-dd.aberto").forEach((x) => { if (x !== el) x.classList.remove("aberto"); });
      el.classList.toggle("aberto");
    });
    el.querySelectorAll(".pc-dd-it").forEach((it) => it.addEventListener("click", (e) => {
      e.stopPropagation();
      el.querySelectorAll(".pc-dd-it").forEach((x) => x.classList.remove("on"));
      it.classList.add("on");
      el.classList.remove("aberto");
      const txt = el.querySelector("[data-dd-txt]");
      if (txt) txt.textContent = it.textContent.trim();
      aoEscolher(el.id, it);
    }));
  });
  if (!pcState._resDdGlobal) {
    pcState._resDdGlobal = true;
    document.addEventListener("click", () => document.querySelectorAll(".pc-dd.aberto").forEach((x) => x.classList.remove("aberto")));
  }
}

// ---------- tela ----------
async function renderResultados() {
  const conteudo = document.getElementById("pcConteudo");
  const st = pcState.res = pcState.res || { cargo: "estadual", aba: "candidatos", ordem: "desc", modo: "votos", regiao: "", assoc: "", cenario: null, munSel: null, munAba: "zonas", fichaSq: null, fichaAba: "mun", fichaMun: null, busca: "" };
  conteudo.innerHTML = telaCarregando("Carregando resultados…");
  const cargo = st.cargo;
  const apuCfg = await _resApuracaoConfig();
  const anoApurado = apuCfg.ativa ? apuCfg.ano : RES_ANO_APURADO;
  const anoAnterior = anoApurado === RES_ANO_APURADO ? RES_ANO_ANTERIOR : RES_ANO_APURADO;
  st.anoApurado = anoApurado; st.anoAnterior = anoAnterior;
  const [apuEst, ant, vivo] = await Promise.all([_resCarregar(anoApurado, cargo), _resCarregar(anoAnterior, cargo), apuCfg.ativa ? _resCarregarAoVivo(anoApurado, cargo) : null]);
  const apu = _resMesclar(vivo, apuEst);
  const meta = vivo && vivo.meta;
  _resArmarAtualizacao(meta);
  if (!apu) { conteudo.innerHTML = estadoVazio({ icone: "alerta", titulo: "Resultados indisponíveis", texto: "Não consegui carregar os dados deste cargo. Tente de novo em instantes." }); return; }
  const totalVagas = vagasFixasCargo(RES_UF, cargo);
  const cands = apu.candidatos;
  // Casamento entre eleições: nome completo, senão nome de urna (a pessoa
  // muda de sobrenome/partido/número entre um pleito e outro — ex.: Ana
  // Campagnolo ganhou "Galvao" em 2022).
  const antPorNome = new Map();
  (ant ? ant.candidatos : []).forEach((c) => { antPorNome.set(_resNorm(c.nome), c); antPorNome.set("URNA::" + _resNorm(c.nomeUrna), c); });
  const _antDe = (c) => antPorNome.get(_resNorm(c.nome)) || antPorNome.get("URNA::" + _resNorm(c.nomeUrna)) || null;
  const meu = _resMeuPalpiteMapa(cargo);
  const favs = _resFavoritos();
  const totalValidos = cands.reduce((s, c) => s + c.total, 0);
  const eleitos = cands.filter(_resEleito);
  const porPartido = {};
  eleitos.forEach((c) => { porPartido[c.partido] = (porPartido[c.partido] || 0) + 1; });
  const seats = Object.entries(porPartido).map(([nome, n]) => ({ nome, seats: n })).sort((a, b) => b.seats - a.seats);
  if (!st.cenario) st.cenario = cands[0] ? cands[0].sq : null;
  const cenario = cands.find((c) => c.sq === st.cenario) || cands[0];

  const botoesCargo = CARGOS.map((c) => `<button data-res-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");
  const chips = seats.map((p) => `<span class="pc-tm-vaga-chip">${nomePartidoExibicao(p.nome)} <b>${p.seats}</b></span>`).join("");
  const _k = "plenarioColapsado_res_" + cargo;
  const colapsado = pcState.expandido[_k] === undefined ? true : !!pcState.expandido[_k];
  const legenda = `<div style="display:flex; flex-wrap:wrap; gap:4px; opacity:0.55;">${seats.map((o, idx) => `
    <div style="display:inline-flex; align-items:center; gap:3px; padding:4px 6px; border:1px solid rgba(242,244,245,.12); border-radius:6px; white-space:nowrap;">
      <span style="width:5px; height:5px; border-radius:50%; background:${corTerreno(idx)};"></span>
      <span style="font-size:9px; font-weight:600;">${siglaCurta(o.nome)}: ${o.seats} (${(o.seats / totalVagas * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%)</span>
    </div>`).join("")}</div>`;

  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Resultados ${anoApurado}</div>
    <div class="pc-sub" style="margin:0 0 12px 2px;">Santa Catarina · ${meta ? "apuração oficial (TSE)" : "resultado oficial (TSE)"} · ${_resFmt(totalValidos)} votos nominais</div>
    ${meta ? `
    <div class="pc-heroi" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
        <span style="font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px;"><span class="pc-res-vivo${meta.final ? " fim" : ""}"></span>${meta.final ? "Totalização final" : "Apuração ao vivo"}</span>
        <span style="font-size:11.5px; font-weight:600; color:#34E84A;">${Number(meta.pctSecoes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%<span style="color:#8A9096;"> das seções</span></span>
      </div>
      <div class="pc-lobby-barra"><div style="width:${Math.min(100, Number(meta.pctSecoes) || 0)}%; background:#34E84A;"></div></div>
      <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#8A9096; margin-top:8px;"><span>${_resFmt(meta.secoesTotalizadas)} de ${_resFmt(meta.secoesTotal)} seções</span><span id="pcResAtualizado">atualizado ${_resTempoRelativo(meta.atualizadoEm)}${meta.final ? "" : " · próxima em 60 s"}</span></div>
    </div>` : `
    <div class="pc-lobby-duelo on" style="margin-bottom:12px; cursor:default;">
      <span class="pc-lobby-duelo-ic">${iconeSvg("relogio", 18)}</span>
      <span class="pc-lobby-duelo-tx"><b>Ensaio com o resultado de ${anoApurado}</b><i>na eleição de 2026 esta tela mostra a apuração ao vivo, com ${anoApurado} como "anterior"</i></span>
    </div>`}
    <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
    <div class="glass-card" style="padding:14px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="pc-sub" style="margin:0;">Plenário apurado — ${totalVagas} vagas</div>
        <button id="pcResPlenToggle" class="pc-mini-btn" title="${colapsado ? "Expandir" : "Recolher"}"><svg viewBox="0 0 16 16" width="13" height="13" style="transform:${colapsado ? "rotate(-90deg)" : "none"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
      </div>
      <div id="pcResPlenCorpo" class="pc-plen-corpo${colapsado ? "" : " aberto"}"><div style="margin-top:14px;">${renderPlenarioTerreno(seats, totalVagas)}<div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);">${legenda}</div></div></div>
    </div>
    <div class="pc-tm-vagas">${chips}</div>
    <div class="pc-sub-abas" style="margin:4px 0 12px;"><span class="${st.aba === "candidatos" ? "on" : ""}" data-res-aba="candidatos">Candidatos</span><span class="${st.aba === "mapa" ? "on" : ""}" data-res-aba="mapa">Mapa</span></div>
    <div id="pcResCorpo"></div>
    <div class="pc-aviso-nao-pesquisa" style="margin-top:16px;">Dados oficiais do TSE. Jogo de palpites entre participantes — não é pesquisa eleitoral.</div>
  `;
  document.querySelectorAll("[data-res-cargo]").forEach((b) => b.addEventListener("click", () => { st.cargo = b.dataset.resCargo; st.cenario = null; st.munSel = null; st.fichaSq = null; renderResultados(); }));
  document.querySelectorAll("[data-res-aba]").forEach((b) => b.addEventListener("click", () => { st.aba = b.dataset.resAba; renderResultados(); }));
  const tg = document.getElementById("pcResPlenToggle");
  tg.addEventListener("click", () => {
    const atual = pcState.expandido[_k] === undefined ? true : !!pcState.expandido[_k];
    pcState.expandido[_k] = !atual;
    document.getElementById("pcResPlenCorpo").classList.toggle("aberto", atual);
    tg.querySelector("svg").style.transform = atual ? "none" : "rotate(-90deg)";
  });

  const ctx = { st, cargo, cands, antPorNome, antDe: _antDe, meu, favs, totalVagas, cenario, ant };
  if (st.aba === "mapa") await _resRenderMapa(ctx); else _resRenderCandidatos(ctx);
}

// ---------- aba Candidatos ----------
function _resRenderCandidatos(ctx) {
  const { st, cargo, cands, antPorNome, meu, favs } = ctx;
  const corpo = document.getElementById("pcResCorpo");
  const busca = _resNorm(st.busca);
  let lista = cands.filter((c) => !busca || _resNorm(c.nomeUrna + " " + c.nome + " " + c.partido).includes(busca));
  if (st.soFav) lista = lista.filter((c) => favs.has(c.sq));
  if (st.ordem === "asc") lista = [...lista].sort((a, b) => a.total - b.total);
  const limite = Math.min(lista.length, st.limite || 60);

  const linha = (c, i) => {
    const a = ctx.antDe(c);
    const p = meu.get(_resNorm(c.nomeUrna)) || meu.get(_resNorm(c.nome));
    const varr = a ? _resPct(c.total, a.total) : null;
    const aberta = st.fichaSq === c.sq;
    return `
    <div class="pc-dep-crow${aberta ? " res-aberta" : ""}" data-res-cand="${c.sq}">
      <div class="pc-dep-cl1">
        <span class="pc-dep-pos">${i + 1}º</span>${_resEtiqueta(c, cargo)}
        <span class="pc-dep-cnm"><span class="pc-dep-cnm-txt">${c.nomeUrna}</span></span>
        <span class="pc-tm-partido">${nomePartidoExibicao(c.partido)}</span>
        <button type="button" class="pc-fav${favs.has(c.sq) ? " on" : ""}" data-res-fav="${c.sq}" title="Favoritar">${RES_IC_ESTRELA}</button>
      </div>
      <div class="pc-dep-tiles">
        <div class="pc-dep-tile ref" title="Votação em ${st.anoAnterior}">${a ? `<span class="tv">${_resFmt(a.total)}</span><span class="tr">${st.anoAnterior}</span>` : `<span class="tv">—</span><span class="tr">sem ${st.anoAnterior}</span>`}</div>
        <div class="pc-dep-tile ref" title="O que você indicou na sua lista">${p ? `<span class="tv">${_resFmt(p.votos)}</span><span class="tr">seu palpite${p.marcado ? " · E" : ""}</span>` : `<span class="tv">—</span><span class="tr">sem palpite</span>`}</div>
        <div class="pc-dep-tile votos" title="Resultado oficial"><span class="tv">${_resFmt(c.total)}</span><span class="tr">apurado ${st.anoApurado}</span></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#8A9096; margin-top:6px;"><span>${(c.situacao || "").toLowerCase()}</span><span>vs ${st.anoAnterior}: ${_resPctHtml(varr)}</span></div>
      ${aberta ? `<div id="pcResFicha"></div>` : ""}
    </div>`;
  };

  corpo.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
      <input class="cell" id="pcResBusca" placeholder="Buscar candidato ou partido…" value="${escaparAtributoHtml(st.busca || "")}" style="flex:1; margin:0;">
      <button type="button" class="pc-dd-btn ico${st.soFav ? " on" : ""}" id="pcResSoFav" title="Só favoritos" style="${st.soFav ? "color:#C6E62A; border-color:rgba(198,230,42,.5);" : ""}">${RES_IC_ESTRELA}</button>
      ${_resDropdown("pcResOrd", "", "", `<div class="pc-dd-it${st.ordem === "desc" ? " on" : ""}" data-o="desc">Maior votação</div><div class="pc-dd-it${st.ordem === "asc" ? " on" : ""}" data-o="asc">Menor votação</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 170, titulo: "Ordenar" })}
    </div>
    <div class="pc-dep-card" style="padding:0 12px;"><div class="pc-dep-cands">
      ${lista.length ? lista.slice(0, limite).map(linha).join("") : estadoVazio({ icone: "buscar", titulo: "Nenhum candidato", texto: "Confira a busca ou o filtro de favoritos." })}
    </div></div>
    ${lista.length > limite ? `<button class="ghost" id="pcResMais" style="width:100%; margin-top:10px;">Mostrar mais (${lista.length - limite} restantes)</button>` : ""}
  `;
  const inp = document.getElementById("pcResBusca");
  inp.addEventListener("input", () => { st.busca = inp.value; clearTimeout(pcState._resBuscaT); pcState._resBuscaT = setTimeout(() => { _resRenderCandidatos(ctx); const i2 = document.getElementById("pcResBusca"); if (i2) { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } }, 250); });
  document.getElementById("pcResSoFav").addEventListener("click", () => { st.soFav = !st.soFav; _resRenderCandidatos(ctx); });
  _resLigarDropdowns(corpo, (id, it) => { if (id === "pcResOrd") { st.ordem = it.dataset.o; _resRenderCandidatos(ctx); } });
  const mais = document.getElementById("pcResMais");
  if (mais) mais.addEventListener("click", () => { st.limite = (st.limite || 60) + 60; _resRenderCandidatos(ctx); });
  corpo.querySelectorAll("[data-res-fav]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); _resToggleFav(b.dataset.resFav); ctx.favs = _resFavoritos(); _resRenderCandidatos(ctx); }));
  corpo.querySelectorAll("[data-res-cand]").forEach((el) => el.querySelector(".pc-dep-cl1").addEventListener("click", () => {
    const sq = el.dataset.resCand;
    st.fichaSq = st.fichaSq === sq ? null : sq; st.fichaAba = "mun"; st.fichaMun = null;
    _resRenderCandidatos(ctx);
    if (st.fichaSq) _resRenderFicha(ctx);
  }));
  if (st.fichaSq) _resRenderFicha(ctx);
}

// Ficha expandida: Municípios / Seções / Histórico
async function _resRenderFicha(ctx) {
  const { st, cargo, cands, antPorNome } = ctx;
  const alvo = document.getElementById("pcResFicha");
  const c = cands.find((x) => x.sq === st.fichaSq);
  if (!alvo || !c) return;
  const a = ctx.antDe(c);
  const ordem = st.fichaOrdem || "desc";
  const abas = `<div class="pc-sub-abas" style="margin:12px 0 4px;">
    <span class="${st.fichaAba === "mun" ? "on" : ""}" data-fa="mun">Municípios</span>
    <span class="${st.fichaAba === "sec" ? "on" : ""}" data-fa="sec">Seções${st.fichaMun ? ` · ${(pcState._resCache[`${RES_ANO_APURADO}/municipios`] || { municipios: {} }).municipios[st.fichaMun]?.nome || st.fichaMun}` : ""}</span>
    <span class="${st.fichaAba === "hist" ? "on" : ""}" data-fa="hist">Histórico</span>
    <span style="margin-left:auto; padding:4px 0;">${_resDropdown("pcResFichaOrd", "", "", `<div class="pc-dd-it${ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 130, titulo: "Ordenar" })}</span>
  </div>`;
  let corpo = "";
  const cab = (c1, c2, c3) => `<div class="pc-lin cab"><span></span><span>${c1}</span><span class="v">${c2}</span><span class="v">${c3}</span><span class="v">Δ</span></div>`;
  if (st.fichaAba === "mun") {
    const muns = await _resCarregar(RES_ANO_APURADO, "municipios");
    const nomeDe = (k) => (muns && muns.municipios[k] && muns.municipios[k].nome) || k;
    let linhas = Object.entries(c.municipios).map(([k, v]) => ({ k, nome: nomeDe(k), v, v0: a ? (a.municipios[k] || 0) : null }));
    linhas.sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
    corpo = cab("Município", RES_ANO_APURADO, RES_ANO_ANTERIOR) + linhas.slice(0, 40).map((l, i) => `<div class="pc-lin" data-fmun="${l.k}"><span style="color:#8A9096;">${i + 1}º</span><span class="n">${l.nome}</span><span class="v">${_resFmt(l.v)}</span><span class="v" style="color:#8A9096;">${l.v0 === null ? "—" : _resFmt(l.v0)}</span><span class="d">${_resPctHtml(l.v0 ? _resPct(l.v, l.v0) : null)}</span></div>`).join("") + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} municípios (use a busca do mapa)</div>` : "");
  } else if (st.fichaAba === "sec") {
    if (!st.fichaMun) {
      corpo = `<div class="pc-sub" style="padding:8px 0;">Toque num município na aba "Municípios" pra ver as seções dele.</div>`;
    } else {
      const sec = await _resCarregarSecoes(st.fichaMun);
      const d = sec && sec[cargo] && sec[cargo][c.numero];
      if (!d) corpo = `<div class="pc-sub" style="padding:8px 0;">Sem dado por seção pra este município.</div>`;
      else {
        const linhas = Object.entries(d).map(([k, v]) => { const [z, s] = k.split("::"); return { z, s, v }; }).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
        corpo = `<div class="pc-lin cab"><span></span><span>Zona · seção</span><span class="v">votos</span><span class="v"></span><span class="v"></span></div>` + linhas.slice(0, 60).map((l, i) => `<div class="pc-lin"><span style="color:#8A9096;">${i + 1}º</span><span class="n" style="font-weight:600;">${l.z}ª zona · seção ${l.s}</span><span class="v">${_resFmt(l.v)}</span><span></span><span></span></div>`).join("") + (linhas.length > 60 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 60} seções</div>` : "");
      }
    }
  } else {
    const hist = [];
    for (const ano of RES_ANOS_HISTORICO) {
      const d = await _resCarregar(ano, cargo);
      const x = d && (d.candidatos.find((y) => _resNorm(y.nome) === _resNorm(c.nome)) || d.candidatos.find((y) => _resNorm(y.nomeUrna) === _resNorm(c.nomeUrna)));
      hist.push({ ano, c: x });
    }
    const max = Math.max(...hist.map((h) => h.c ? h.c.total : 0), 1);
    corpo = hist.map((h) => `<div style="display:grid; grid-template-columns:44px 1fr 76px 110px; gap:8px; align-items:center; padding:9px 0; border-top:1px solid #23262A; font-size:12px;"><b>${h.ano}</b><div style="height:6px; border-radius:999px; background:rgba(242,244,245,.08); overflow:hidden;"><div style="width:${h.c ? h.c.total / max * 100 : 0}%; height:100%; background:${h.ano === RES_ANO_APURADO ? "#34E84A" : "#6B7178"};"></div></div><span style="text-align:right; font-variant-numeric:tabular-nums;">${h.c ? _resFmt(h.c.total) : "—"}</span><span style="text-align:right; color:#8A9096;">${h.c ? (h.c.situacao || "").toLowerCase() : "não concorreu"}</span></div>`).join("");
  }
  alvo.innerHTML = abas + corpo;
  alvo.querySelectorAll("[data-fa]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.fichaAba = x.dataset.fa; _resRenderFicha(ctx); }));
  alvo.querySelectorAll("[data-fmun]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.fichaMun = x.dataset.fmun; st.fichaAba = "sec"; _resRenderFicha(ctx); }));
  _resLigarDropdowns(alvo, (id, it) => { if (id === "pcResFichaOrd") { st.fichaOrdem = it.dataset.o; _resRenderFicha(ctx); } });
  alvo.addEventListener("click", (e) => e.stopPropagation());
}

// ---------- aba Mapa ----------
async function _resRenderMapa(ctx) {
  const { st, cargo, cands, antPorNome, cenario } = ctx;
  const corpo = document.getElementById("pcResCorpo");
  if (!pcState._resGeo) {
    try { pcState._resGeo = await (await fetch("dados/mapas/sc-municipios.geojson", { cache: "force-cache" })).json(); } catch (e) { pcState._resGeo = null; }
  }
  const geo = pcState._resGeo;
  const muns = await _resCarregar(RES_ANO_APURADO, "municipios");
  if (!geo || !cenario) { corpo.innerHTML = estadoVazio({ icone: "mapa", titulo: "Mapa indisponível", texto: "Não consegui carregar a malha dos municípios." }); return; }
  const regPorIbge = new Map(MUNICIPIOS_SC_REGIOES.map((m) => [m.ibge, m]));
  const regPorChave = new Map(MUNICIPIOS_SC_REGIOES.map((m) => [m.chave, m]));
  const a = ctx.antDe(cenario);

  // projeção equiretangular pro viewBox
  if (!pcState._resGeoSvg) {
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    const walk = (c, f) => { if (typeof c[0] === "number") f(c); else c.forEach((x) => walk(x, f)); };
    geo.features.forEach((f) => walk(f.geometry.coordinates, ([x, y]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }));
    const W = 1000, k = Math.cos((miny + maxy) / 2 * Math.PI / 180), H = Math.round(W * (maxy - miny) / ((maxx - minx) * k));
    const P = ([lon, lat]) => `${((lon - minx) / (maxx - minx) * W).toFixed(1)} ${((maxy - lat) / (maxy - miny) * H).toFixed(1)}`;
    const paths = geo.features.map((f) => {
      const g = f.geometry; const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
      const d = polys.map((poly) => poly.map((ring) => "M" + ring.map(P).join(" L") + "Z").join("")).join("");
      return `<path d="${d}" data-ibge="${f.properties.ibge}"></path>`;
    }).join("");
    pcState._resGeoSvg = `<svg id="pcResMapaSvg" viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;">${paths}</svg>`;
  }

  const meso = [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.meso))].sort();
  const regTxt = st.assoc || st.regiao || "Todo o estado";
  const cenTxt = `${cenario.nomeUrna}`;
  corpo.innerHTML = `
    <div class="pc-cenario">
      <span class="pc-dep-pos">${cands.indexOf(cenario) + 1}º</span>${_resEtiqueta(cenario, cargo)}
      <span class="pc-dep-cnm" style="flex:1 1 140px;"><span class="pc-dep-cnm-txt">${cenTxt}</span></span>
      <span class="pc-tm-partido" style="max-width:none;">${nomePartidoExibicao(cenario.partido)} · ${(CARGOS.find((x) => x.id === cargo) || {}).label || ""}</span>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; align-items:center;">
      ${_resDropdown("pcResCen", "Candidato", cenTxt, `<div style="padding:6px 8px;"><input class="cell" id="pcResCenBusca" placeholder="Buscar…" style="width:100%; margin:0;"></div><div id="pcResCenLista" style="max-height:240px; overflow:auto;">${cands.slice(0, 40).map((c) => `<div class="pc-dd-it${c.sq === cenario.sq ? " on" : ""}" data-sq="${c.sq}">${c.nomeUrna} <small style="color:#8A9096;">${c.partido}</small></div>`).join("")}</div>`, { largura: 260 })}
      ${_resDropdown("pcResModo", "Modo", st.modo === "var" ? `Variação vs ${RES_ANO_ANTERIOR}` : `Votos ${RES_ANO_APURADO}`, `<div class="pc-dd-grp">Votos de ${cenario.nomeUrna}</div><div class="pc-dd-it${st.modo === "votos" ? " on" : ""}" data-m="votos">Votos ${RES_ANO_APURADO}</div><div class="pc-dd-it${st.modo === "var" ? " on" : ""}" data-m="var">Variação vs ${RES_ANO_ANTERIOR} (ganhou / perdeu)</div>`, { largura: 230 })}
      ${_resDropdown("pcResReg", "Região", regTxt, `<div class="pc-dd-it${!st.regiao && !st.assoc ? " on" : ""}" data-r="">Todo o estado</div><div class="pc-dd-grp">Mesorregiões (IBGE)</div><div class="pc-dd-grid">${meso.map((r) => `<div class="pc-dd-it${st.regiao === r ? " on" : ""}" data-r="${r}">${r.replace(" Catarinense", "")}</div>`).join("")}</div><div class="pc-dd-grp">Associações de municípios</div><div class="pc-dd-grid">${ASSOCIACOES_SC.map((x) => `<div class="pc-dd-it${st.assoc === x ? " on" : ""}" data-a="${x}">${x}</div>`).join("")}</div>`, { largura: 270 })}
    </div>
    <div class="glass-card" style="padding:10px;">${pcState._resGeoSvg}
      <div class="pc-legmapa"><span id="pcResLegA"></span><i id="pcResLegBar"></i><span id="pcResLegB"></span></div>
    </div>
    <div class="pc-dep-tiles" id="pcResTotais" style="margin-top:10px;"></div>
    <div class="pc-ord"><span id="pcResOrdTit">Municípios</span>${_resDropdown("pcResMapaOrd", "", "", `<div class="pc-dd-it${st.ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${st.ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 130, titulo: "Ordenar" })}</div>
    <div id="pcResMapaLista"></div>
  `;

  const dados = {};
  MUNICIPIOS_SC_REGIOES.forEach((m) => {
    const v = cenario.municipios[m.chave] || 0;
    const v0 = a ? (a.municipios[m.chave] || 0) : null;
    dados[m.ibge] = { m, v, v0, var: v0 ? _resPct(v, v0) : null };
  });
  const dentro = (d) => (!st.regiao || d.m.meso === st.regiao) && (!st.assoc || d.m.assoc === st.assoc);
  const maxV = Math.max(1, ...Object.values(dados).map((d) => d.v));
  const mix = (c1, c2, t) => { const p = (s, i) => parseInt(s.slice(i, i + 2), 16); const f = (i) => Math.round(p(c1, i) + (p(c2, i) - p(c1, i)) * t); return `rgb(${f(1)},${f(3)},${f(5)})`; };
  const cor = (d) => {
    if (st.modo === "var") { if (d.var === null) return "#1B1E22"; const t = Math.max(-1, Math.min(1, d.var / 50)); return t < 0 ? mix("#2A2C2E", "#E8432A", -t) : mix("#2A2C2E", "#34E84A", t); }
    const t = Math.log(1 + d.v) / Math.log(1 + maxV); return mix("#15191E", "#34E84A", Math.pow(t, 1.5));
  };
  const svg = document.getElementById("pcResMapaSvg");
  const pintar = () => {
    svg.querySelectorAll("path").forEach((p) => { const d = dados[p.dataset.ibge]; if (!d) return; p.style.fill = cor(d); p.classList.toggle("fora", !dentro(d)); p.classList.toggle("sel", st.munSel === d.m.chave); });
    const L = st.modo === "var" ? ["perdeu (−50%)", "linear-gradient(90deg,#E8432A,#2A2C2E,#34E84A)", "ganhou (+50%)"] : ["menos votos", "linear-gradient(90deg,#15191E,#34E84A)", "mais votos"];
    document.getElementById("pcResLegA").textContent = L[0]; document.getElementById("pcResLegBar").style.background = L[1]; document.getElementById("pcResLegB").textContent = L[2];
    const lista = Object.values(dados).filter(dentro);
    const key = st.modo === "var" ? "var" : "v";
    lista.sort((x, y) => (st.ordem === "desc" ? 1 : -1) * (((y[key] === null ? -1e9 : y[key])) - ((x[key] === null ? -1e9 : x[key]))));
    const tot = lista.reduce((s, d) => s + d.v, 0), tot0 = a ? lista.reduce((s, d) => s + (d.v0 || 0), 0) : null;
    document.getElementById("pcResTotais").innerHTML = `<div class="pc-dep-tile ref"><span class="tv">${_resFmt(tot)}</span><span class="tr">votos ${RES_ANO_APURADO}</span></div><div class="pc-dep-tile ref"><span class="tv">${tot0 === null ? "—" : _resFmt(tot0)}</span><span class="tr">votos ${RES_ANO_ANTERIOR}</span></div><div class="pc-dep-tile ref"><span class="tv">${_resPctHtml(tot0 ? _resPct(tot, tot0) : null)}</span><span class="tr">variação</span></div>`;
    document.getElementById("pcResOrdTit").textContent = "Municípios · " + (st.assoc || st.regiao || "todo o estado");
    const cab = `<div class="pc-lin cab"><span></span><span>Município</span><span class="v">${RES_ANO_APURADO}</span><span class="v">${RES_ANO_ANTERIOR}</span><span class="v">Δ</span></div>`;
    document.getElementById("pcResMapaLista").innerHTML = cab + lista.slice(0, 15).map((d, i) => `<div class="pc-lin${st.munSel === d.m.chave ? " sel" : ""}" data-mun="${d.m.chave}"><span style="color:#8A9096;">${i + 1}º</span><span class="n">${d.m.nome}</span><span class="v">${_resFmt(d.v)}</span><span class="v" style="color:#8A9096;">${d.v0 === null ? "—" : _resFmt(d.v0)}</span><span class="d">${_resPctHtml(d.var)}</span></div>${st.munSel === d.m.chave ? `<div class="pc-mun-det" id="pcResMunDet"></div>` : ""}`).join("") + (lista.length > 15 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${lista.length - 15} municípios — refine pela região</div>` : "");
    document.querySelectorAll("#pcResMapaLista [data-mun]").forEach((el) => el.addEventListener("click", () => { st.munSel = st.munSel === el.dataset.mun ? null : el.dataset.mun; pintar(); }));
    if (st.munSel) _resRenderMunDet(ctx, dados);
  };
  svg.querySelectorAll("path").forEach((p) => p.addEventListener("click", () => { const d = dados[p.dataset.ibge]; if (!d) return; st.munSel = st.munSel === d.m.chave ? null : d.m.chave; pintar(); const s = document.querySelector("#pcResMapaLista .pc-lin.sel"); if (s) s.scrollIntoView({ block: "center", behavior: "smooth" }); }));
  _resLigarDropdowns(corpo, (id, it) => {
    if (id === "pcResModo") { st.modo = it.dataset.m; pintar(); }
    if (id === "pcResReg") { st.regiao = it.dataset.r || ""; st.assoc = it.dataset.a || ""; st.munSel = null; pintar(); }
    if (id === "pcResMapaOrd") { st.ordem = it.dataset.o; pintar(); }
    if (id === "pcResCen") { st.cenario = it.dataset.sq; st.munSel = null; renderResultados(); }
  });
  const cb = document.getElementById("pcResCenBusca");
  if (cb) { cb.addEventListener("click", (e) => e.stopPropagation()); cb.addEventListener("input", () => { const q = _resNorm(cb.value); const l = document.getElementById("pcResCenLista"); l.innerHTML = cands.filter((c) => !q || _resNorm(c.nomeUrna + " " + c.partido).includes(q)).slice(0, 40).map((c) => `<div class="pc-dd-it" data-sq="${c.sq}">${c.nomeUrna} <small style="color:#8A9096;">${c.partido}</small></div>`).join(""); l.querySelectorAll(".pc-dd-it").forEach((it) => it.addEventListener("click", (e) => { e.stopPropagation(); st.cenario = it.dataset.sq; st.munSel = null; renderResultados(); })); }); }
  pintar();
}

// Detalhe do município dentro da lista do mapa: Zonas / Seções / Histórico
async function _resRenderMunDet(ctx, dados) {
  const { st, cargo, cenario, antPorNome } = ctx;
  const alvo = document.getElementById("pcResMunDet");
  if (!alvo) return;
  const chave = st.munSel;
  const ordem = st.munOrdem || "desc";
  const d = Object.values(dados).find((x) => x.m.chave === chave);
  const abas = `<div class="pc-sub-abas" style="margin:6px 0 4px;"><span class="${st.munAba === "zonas" ? "on" : ""}" data-ma="zonas">Zonas</span><span class="${st.munAba === "secoes" ? "on" : ""}" data-ma="secoes">Seções</span><span class="${st.munAba === "hist" ? "on" : ""}" data-ma="hist">Histórico</span><span style="margin-left:auto; padding:4px 0;">${_resDropdown("pcResMunOrd", "", "", `<div class="pc-dd-it${ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 130 })}</span></div>`;
  let corpo = "";
  if (st.munAba === "zonas") {
    const z = await _resCarregar(RES_ANO_APURADO, cargo, "-zonas");
    const z0 = await _resCarregar(RES_ANO_ANTERIOR, cargo, "-zonas");
    const a = ctx.antDe(cenario);
    const mine = (z && z[cenario.sq]) || {};
    const ant = (z0 && a && z0[a.sq]) || {};
    const linhas = Object.entries(mine).filter(([k]) => k.startsWith(chave + "::")).map(([k, v]) => ({ zona: k.split("::")[1], v, v0: ant[k] || 0 })).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
    corpo = linhas.map((l) => `<div class="pc-lin"><span class="n" style="font-weight:600;">${l.zona}ª zona</span><span class="v">${_resFmt(l.v)}</span><span class="v" style="color:#8A9096;">${l.v0 ? _resFmt(l.v0) : "—"}</span><span class="d">${_resPctHtml(l.v0 ? _resPct(l.v, l.v0) : null)}</span></div>`).join("") || `<div class="pc-sub" style="padding:6px 0;">Sem votos aqui.</div>`;
  } else if (st.munAba === "secoes") {
    const sec = await _resCarregarSecoes(chave);
    const dd = sec && sec[cargo] && sec[cargo][cenario.numero];
    if (!dd) corpo = `<div class="pc-sub" style="padding:6px 0;">Sem dado por seção.</div>`;
    else {
      const linhas = Object.entries(dd).map(([k, v]) => { const [z, s] = k.split("::"); return { z, s, v }; }).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
      corpo = linhas.slice(0, 40).map((l) => `<div class="pc-lin"><span class="n" style="font-weight:600;">${l.z}ª zona · seção ${l.s}</span><span class="v">${_resFmt(l.v)}</span><span></span><span></span></div>`).join("") + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} seções</div>` : "");
    }
  } else {
    const hist = [];
    for (const ano of RES_ANOS_HISTORICO) {
      const dta = await _resCarregar(ano, cargo);
      const x = dta && (dta.candidatos.find((y) => _resNorm(y.nome) === _resNorm(cenario.nome)) || dta.candidatos.find((y) => _resNorm(y.nomeUrna) === _resNorm(cenario.nomeUrna)));
      hist.push({ ano, v: x ? (x.municipios[chave] || 0) : null });
    }
    const max = Math.max(1, ...hist.map((h) => h.v || 0));
    corpo = hist.map((h) => `<div style="display:grid; grid-template-columns:44px 1fr 76px; gap:8px; align-items:center; padding:8px 0; border-top:1px solid #23262A; font-size:12px;"><b>${h.ano}</b><div style="height:6px; border-radius:999px; background:rgba(242,244,245,.08); overflow:hidden;"><div style="width:${h.v ? h.v / max * 100 : 0}%; height:100%; background:${h.ano === RES_ANO_APURADO ? "#34E84A" : "#6B7178"};"></div></div><span style="text-align:right; font-variant-numeric:tabular-nums;">${h.v === null ? "—" : _resFmt(h.v)}</span></div>`).join("");
  }
  alvo.innerHTML = abas + corpo;
  alvo.querySelectorAll("[data-ma]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.munAba = x.dataset.ma; _resRenderMunDet(ctx, dados); }));
  _resLigarDropdowns(alvo, (id, it) => { if (id === "pcResMunOrd") { st.munOrdem = it.dataset.o; _resRenderMunDet(ctx, dados); } });
}
