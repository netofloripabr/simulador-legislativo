// Resultados (Fase 6) — Santa Catarina. Protótipo aprovado em 19-20/09/2026:
// hub com apuração, plenário terreno com o resultado APURADO, lista de
// candidatos no card padrão (etiqueta pela situação oficial, caixas
// seu palpite / anterior / apurado, ficha com Municípios / Seções /
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

// Casa um candidato com a eleição anterior: nome completo igual; senão nome
// de urna igual; senão um nome completo é PREFIXO do outro (≥ 2 palavras) —
// caso real: "Ana Caroline Campagnolo" (2018) → "Ana Caroline Campagnolo
// Galvao" (2022), achado do usuário em 22/09/2026. Mesma pessoa, sobrenome
// novo. Não usa número nem partido (mudam entre eleições).
function _resCasarEntreEleicoes(c, mapa, lista) {
  const N = _resNorm(c.nome), U = _resNorm(c.nomeUrna);
  const direto = mapa.get(N) || mapa.get("URNA::" + U);
  if (direto) return direto;
  for (const x of lista) {
    const M = _resNorm(x.nome);
    const curto = N.length <= M.length ? N : M;
    if ((N.startsWith(M) || M.startsWith(N)) && curto.split(/\s+/).length >= 2) return x;
  }
  return null;
}
function _resHistoricoDe(c, listaAno) {
  if (!listaAno) return null;
  const mapa = new Map();
  listaAno.forEach((y) => { mapa.set(_resNorm(y.nome), y); mapa.set("URNA::" + _resNorm(y.nomeUrna), y); });
  return _resCasarEntreEleicoes(c, mapa, listaAno);
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


// ---------- plenário por ano / evolução (22/09/2026) ----------
// Partidos que mudaram de nome ou se fundiram entre 2014 e 2022 somam na
// mesma linha — sem isso o PL "surge do zero" em 2022.
const RES_PARTIDO_RENOMEADO = { PMDB: "MDB", PRB: "REPUBLICANOS", PR: "PL", PSL: "UNIÃO", DEM: "UNIÃO", PPS: "CIDADANIA", PHS: "PODE", PTN: "PODE", "PT do B": "AVANTE", PEN: "PATRIOTA", PMB: "PMB", PTC: "AGIR", PRP: "PATRIOTA" };
function _resPartidoAtual(p) { return RES_PARTIDO_RENOMEADO[p] || p; }
function _resSeatsDe(lista) {
  const m = {};
  (lista || []).filter(_resEleito).forEach((c) => { const k = _resPartidoAtual(c.partido); m[k] = (m[k] || 0) + 1; });
  return m;
}
// Cadeiras do MEU palpite: candidatos marcados como eleitos na lista do cargo.
function _resPalpiteSeats(cargo) {
  const lista = pcState.palpitesPorCargo && pcState.palpitesPorCargo[cargo];
  if (!lista || !lista.length) return null;
  const m = {}; let n = 0;
  lista.forEach((p) => (p.candidatos || []).forEach((c) => { if (c.fonte === "legenda" || !c.marcadoEleito) return; const k = _resPartidoAtual(c.partido || p.partido); m[k] = (m[k] || 0) + 1; n++; }));
  return n ? m : null;
}
function _resVarHtml(d) {
  if (d > 0) return `<span class="var up">+${d}</span>`;
  if (d < 0) return `<span class="var dn">−${-d}</span>`;
  return `<span class="var eq">=</span>`;
}
// Renderiza só o corpo do plenário (troca de ano/evolução não redesenha a tela).
function _resRenderPlenario(ctx) {
  const { st, totalVagas, seatsPorAno, anos, palSeats } = ctx;
  const corpo = document.getElementById("pcResPlenCorpo");
  const tit = document.getElementById("pcResPlenTit");
  if (!corpo) return;
  const modo = st.plenModo || "ano";
  const anoSel = st.plenAno || st.anoApurado;
  const nomes = [...new Set([].concat(...anos.map((a) => Object.keys(seatsPorAno[a] || {})), Object.keys(palSeats || {})))]
    .sort((x, y) => ((seatsPorAno[st.anoApurado] || {})[y] || 0) - ((seatsPorAno[st.anoApurado] || {})[x] || 0));
  const botoes = `<div class="pc-plen-anos">${anos.map((a) => `<button data-plen-ano="${a}" class="${modo === "ano" && anoSel === a ? "active" : ""}">${a}</button>`).join("")}<button data-plen-ano="pal" class="pal${modo === "ano" && anoSel === "pal" ? " active" : ""}" ${palSeats ? "" : 'disabled title="Você ainda não tem palpite neste cargo"'}>Palpite</button><button data-plen-ano="evo" class="${modo === "evo" ? "active" : ""}">Evolução</button></div>`;
  if (modo === "evo") {
    if (tit) tit.textContent = "Plenário — evolução das cadeiras";
    const linhas = nomes.filter((n) => anos.some((a) => (seatsPorAno[a] || {})[n]) || (palSeats && palSeats[n])).map((n) => {
      const sq = anos.map((a) => (seatsPorAno[a] || {})[n] || 0);
      const cel = (val, i) => { const d = i > 0 ? val - sq[i - 1] : null; return `<span class="n${i === anos.length - 1 ? " at" : ""}">${val}${d === null ? '<small class="eq">&nbsp;</small>' : `<small class="${d > 0 ? "up" : d < 0 ? "dn" : "eq"}">${d > 0 ? "+" + d : d < 0 ? "−" + (-d) : "="}</small>`}</span>`; };
      const pv = palSeats ? (palSeats[n] || 0) : null; const dp = pv === null ? null : pv - sq[sq.length - 1];
      const palCel = pv === null ? `<span class="n pal">—<small class="eq">&nbsp;</small></span>` : `<span class="n pal">${pv}<small class="${dp > 0 ? "up" : dp < 0 ? "dn" : "eq"}">${dp > 0 ? "+" + dp : dp < 0 ? "−" + (-dp) : "="}</small></span>`;
      return `<div class="pc-evo-l"><span class="pn"><i style="background:${corTerreno(nomes.indexOf(n))};"></i>${nomePartidoExibicao(n)}</span>${sq.map(cel).join("")}${palCel}</div>`;
    }).join("");
    corpo.innerHTML = `<div style="margin-top:14px;">${botoes}<div class="pc-evo"><div class="pc-evo-cab"><span style="text-align:left;">Partido</span>${anos.map((a) => `<span>${a}</span>`).join("")}<span>Palpite</span></div>${linhas}</div></div>`;
  } else {
    const src = anoSel === "pal" ? (palSeats || {}) : (seatsPorAno[anoSel] || {});
    const prevAno = anoSel === "pal" ? st.anoApurado : anos[anos.indexOf(anoSel) - 1];
    const prev = prevAno ? seatsPorAno[prevAno] : null;
    if (tit) tit.textContent = anoSel === "pal" ? `Plenário do seu palpite — ${totalVagas} vagas` : `Plenário apurado ${anoSel} — ${totalVagas} vagas`;
    const seats = Object.entries(src).filter(([, n]) => n > 0).map(([nome, n]) => ({ nome, seats: n })).sort((a, b) => b.seats - a.seats);
    const mostrarVar = prev && st.variacaoOn !== false;
    const chips = seats.map((x) => `<span class="pc-tm-vaga-chip">${nomePartidoExibicao(x.nome)} <b>${x.seats}</b>${mostrarVar ? _resVarHtml(x.seats - (prev[x.nome] || 0)) : ""}</span>`).join("")
      + (mostrarVar ? Object.keys(prev).filter((n) => !src[n]).map((n) => `<span class="pc-tm-vaga-chip" style="opacity:.5;">${nomePartidoExibicao(n)} <b>0</b>${_resVarHtml(-prev[n])}</span>`).join("") : "");
    corpo.innerHTML = `<div style="margin-top:14px;">${botoes}<div>${seats.length ? renderPlenarioTerreno(seats, totalVagas) : `<div class="pc-sub" style="margin:8px 0;">Sem dados para ${anoSel}.</div>`}</div><div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--pc-glass-border);"><div class="pc-sub" style="margin:0 0 8px; font-size:10px;">Cadeiras por partido${mostrarVar ? ` · variação vs ${prevAno}` : ""}</div><div class="pc-tm-vagas" style="margin:0;">${chips}</div></div></div>`;
  }
  corpo.querySelectorAll("[data-plen-ano]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.plenAno;
    if (v === "evo") st.plenModo = "evo"; else { st.plenModo = "ano"; st.plenAno = v === "pal" ? "pal" : Number(v); }
    _resRenderPlenario(ctx);
  }));
}

// Aba Ferramentas: atalhos no vidro da página inicial (22/09/2026).
// Votos válidos oficiais (TSE, total do cargo: votos − brancos − nulos).
const RES_VALIDOS_OFICIAIS = { 2022: { estadual: 4471619 - 289065 - 153702 } };
// Federações de 2022 (TSE): contam como UM partido no quociente
// partidário e na sobra. Em 2018/2014 não existia federação.
const RES_FEDERACOES = {
  2022: { "PT": "Fed. Brasil da Esperança", "PC do B": "Fed. Brasil da Esperança", "PV": "Fed. Brasil da Esperança",
          "PSDB": "Fed. PSDB Cidadania", "CIDADANIA": "Fed. PSDB Cidadania", "PSOL": "Fed. PSOL Rede", "REDE": "Fed. PSOL Rede" },
};
// Resultado por partido (modelo de referência, 23/09/2026): QE, QP, votos
// nominais + legenda, eleitos (diretas pelo QP / sobras pela média) e o
// ranking interno. Eleitos vêm da situação OFICIAL do TSE, não de recálculo.
function _resPartidos(ctx) {
  const { st, cands, cargo, totalVagas } = ctx;
  const fed = RES_FEDERACOES[st.anoApurado] || {};
  const leg = (st.anoApurado === 2022 && typeof LEGENDA_2022 !== "undefined" && LEGENDA_2022[cargo]) || null;
  const grupos = {};
  const g = (p) => fed[p] || p;
  cands.forEach((c) => {
    const k = g(c.partido);
    const x = grupos[k] = grupos[k] || { nome: k, partidos: new Set(), nominal: 0, legenda: 0, cands: [], diretas: 0, sobras: 0 };
    x.partidos.add(c.partido); x.nominal += c.total; x.cands.push(c);
    const s = (c.situacao || "").toUpperCase();
    if (s.includes("ELEITO POR QP")) x.diretas++; else if (s.startsWith("ELEITO")) x.sobras++;
  });
  if (leg) Object.entries(leg).forEach(([p, v]) => { const k = g(p); if (grupos[k]) grupos[k].legenda += v; });
  // Soma do arquivo por município/zona fica ~25 mil abaixo do oficial em
  // 2022 (votos de candidatos com situação revista depois). Quando há o
  // total oficial, ele manda no QE — mesmo número de testes/eleitoral.test.js.
  const somaArquivo = Object.values(grupos).reduce((a, x) => a + x.nominal + x.legenda, 0);
  const validos = (RES_VALIDOS_OFICIAIS[st.anoApurado] || {})[cargo] || somaArquivo;
  const qe = cargo === "senador" ? null : quocienteEleitoral(validos, totalVagas);
  const lista = Object.values(grupos).map((x) => ({ ...x, total: x.nominal + x.legenda, eleitos: x.diretas + x.sobras, qp: qe ? (x.nominal + x.legenda) / qe : null }))
    .sort((a, b) => b.eleitos - a.eleitos || b.total - a.total);
  return { lista, validos, qe, temLegenda: !!leg };
}
function _resRenderPartidos(ctx) {
  const { st, cargo } = ctx;
  const corpo = document.getElementById("pcResCorpo");
  const R = _resPartidos(ctx);
  const pct = (v) => (v / R.validos * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  const voltar = `<button type="button" class="pc-part-voltar" id="pcResPartVoltar">${iconeSvg("setaEsquerda", 13)}${st.partidoSel ? "Partidos" : "Ferramentas"}</button>`;
  const sel = st.partidoSel && R.lista.find((x) => x.nome === st.partidoSel);
  if (!sel) {
    corpo.innerHTML = voltar + `
      <div class="pc-part-cab"><span>QE <b>${R.qe ? _resFmt(R.qe) : "—"}</b></span><span>Válidos <b>${_resFmt(R.validos)}</b></span>${R.temLegenda ? "" : `<span class="obs">sem voto de legenda em ${st.anoApurado}</span>`}</div>
      <div class="pc-dep-card" style="padding:0 12px;">
        <div class="pc-lin pc-part-lin cab"><span>Partido</span><span class="v">Votos</span><span class="v">QP</span><span class="c">Eleitos</span></div>
        ${R.lista.map((x) => `<div class="pc-lin pc-part-lin clic" data-partido="${escaparAtributoHtml(x.nome)}"><span class="n">${x.nome}${x.partidos.size > 1 ? `<i class="pc-loc-sub">${[...x.partidos].join(" · ")}</i>` : ""}</span><span class="v">${_resFmt(x.total)}<i class="pc-loc-sub" style="text-align:right;">${pct(x.total)}</i></span><span class="v p">${x.qp === null ? "—" : x.qp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span class="c">${x.eleitos ? `<span class="pc-sen-chip pos">${x.eleitos}</span>` : `<span style="color:#6B7178;">0</span>`}</span></div>`).join("")}
      </div>`;
  } else {
    const t = (rot, val, sub, cls) => `<div class="pc-dep-tile ref"><span class="tv"${cls ? ` style="color:${cls};"` : ""}>${val}</span><span class="tr">${rot}${sub ? " · " + sub : ""}</span></div>`;
    const cs = [...sel.cands].sort((a, b) => b.total - a.total);
    corpo.innerHTML = voltar + `
      <div class="pc-part-tit">${sel.nome}${sel.partidos.size > 1 ? `<i>${[...sel.partidos].join(" · ")}</i>` : ""}</div>
      <div class="pc-dep-tiles pc-part-tiles">
        ${t("votos", _resFmt(sel.total), pct(sel.total))}${t("legenda", R.temLegenda ? _resFmt(sel.legenda) : "—")}${t("eleitos", sel.eleitos)}${t("candidatos", sel.cands.length)}
        ${t("QE", R.qe ? _resFmt(R.qe) : "—")}${t("QP", sel.qp === null ? "—" : sel.qp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}${t("diretas", sel.diretas, "", "#34E84A")}${t("sobras", sel.sobras, "", "var(--pc-warning)")}
      </div>
      <div class="pc-dep-card pc-cand-lista" style="padding:0 12px;">
        ${cs.map((c) => `<div class="pc-cand-lin"><div class="pc-dep-cl1" style="cursor:default;">${_resEtiqueta(c, cargo)}<span class="nome"><span class="pt">${nomePartidoExibicao(c.partido)} — </span><b>${c.nomeUrna}</b></span><span class="voto">${_resFmt(c.total)}</span></div></div>`).join("")}
      </div>`;
  }
  document.getElementById("pcResPartVoltar").addEventListener("click", () => { if (st.partidoSel) st.partidoSel = null; else st.ferr = null; _resRenderFerramentas(ctx); });
  corpo.querySelectorAll("[data-partido]").forEach((el) => el.addEventListener("click", () => { st.partidoSel = el.dataset.partido; _resRenderPartidos(ctx); corpo.scrollIntoView({ block: "start" }); }));
}

function _resRenderFerramentas(ctx) {
  const { st, favs } = ctx;
  const corpo = document.getElementById("pcResCorpo");
  if (st.ferr === "partidos") { _resRenderPartidos(ctx); return; }
  const item = (id, ic, tit, sub, extra) => `<button type="button" class="pc-app" data-res-ferr="${id}" ${extra || ""}><span class="pc-app-ic">${ic}</span><span class="pc-app-tx"><span class="pc-app-rot">${tit}</span><span class="pc-app-sub">${sub}</span></span></button>`;
  corpo.innerHTML = `<div class="pc-res-ferr">
    ${item("favoritos", RES_IC_ESTRELA.replace('width="14" height="14"', 'width="22" height="22"'), "Favoritos", favs.size ? `${favs.size} candidato${favs.size === 1 ? "" : "s"}` : "nenhum marcado")}
    ${item("partidos", iconeSvg("grupos", 22), "Partidos", "QE, QP, eleitos e sobras")}
    ${item("comparativos", iconeSvg("desafio", 22), "Comparar", "dois candidatos no mapa", 'style="grid-column:1 / 3;"')}
  </div>`;
  corpo.querySelectorAll("[data-res-ferr]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.emBreve) { if (typeof pcToast === "function") pcToast("Em breve."); return; }
    if (b.dataset.resFerr === "favoritos") { st.soFav = true; st.aba = "candidatos"; renderResultados(); }
    if (b.dataset.resFerr === "comparativos") { st.aba = "mapa"; renderResultados().then(() => { const dd = document.querySelector("#pcResCmp"); if (dd) dd.classList.add("aberto"); }); }
    if (b.dataset.resFerr === "partidos") { st.ferr = "partidos"; st.partidoSel = null; _resRenderPartidos(ctx); }
  }));
}


// Colocação do candidato num recorte: 1 + quantos candidatos do cargo
// tiveram MAIS votos ali. Sem voto no recorte → sem colocação.
function _resPosicao(lista, k, v, votosDe) {
  if (!v) return 0;
  let n = 1;
  for (const c of lista) if ((votosDe(c, k) || 0) > v) n++;
  return n;
}
function _resChipPos(pos) {
  if (!pos) return `<span style="color:#6B7178;">—</span>`;
  return `<span class="pc-sen-chip pos${pos <= 3 ? "" : " neutro"}">${pos}º</span>`;
}
// "Jaraguá Do Sul" → "Jaraguá do Sul" (o TSE vem em maiúsculas, .title() sobe as partículas).
function _resNomeMun(n) {
  return String(n || "").replace(/ (Do|Da|De|Dos|Das|E|D') /g, (m) => m.toLowerCase()).replace(/ D' /g, " d'");
}
function _resPctTotal(v, total) {
  return total ? (v / total * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%" : "—";
}

// Cabeçalho de participação (modelo de referência, 23/09/2026):
// Apurados · Abstenção · Br/Nulos · Válidos. P = [aptos, comparecimento,
// abstenções, brancos, nulos, válidos] (ferramentas/tratar_participacao.py).
function _resPartHtml(P, titulo) {
  if (!P || !P[0]) return "";
  const pc = (v, b) => b ? (v / b * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%" : "—";
  const cx = (rot, pct, num) => `<div class="pc-part-cx"><span class="r">${rot}</span><b>${pct}</b><span class="n">${_resFmt(num)}</span></div>`;
  return `<div class="pc-part-bloco">${titulo ? `<div class="pc-part-bloco-tit">${titulo}</div>` : ""}<div class="pc-part-grade">
    ${cx("Apurados", pc(P[1], P[0]), P[1])}${cx("Abstenção", pc(P[2], P[0]), P[2])}${cx("Br/Nulos", pc(P[3] + P[4], P[1]), P[3] + P[4])}${cx("Válidos", pc(P[5], P[1]), P[5])}
  </div></div>`;
}
function _resSomaP(lista) {
  const t = [0, 0, 0, 0, 0, 0];
  lista.forEach((p) => p && p.forEach((v, j) => { t[j] += v; }));
  return t;
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
  // Duas eleições atrás: entra no lugar da caixa "seu palpite" quando o
  // usuário desliga o botão "P" (pedido de 22/09/2026).
  const anoAnterior2 = anoAnterior - 4;
  st.anoAnterior2 = anoAnterior2;
  const anosPlen = [...new Set([...RES_ANOS_HISTORICO, anoApurado])].sort((a, b) => a - b);
  const part = await _resCarregar(anoApurado, "participacao");
  const [apuEst, ant, vivo, ant2, ...hist] = await Promise.all([_resCarregar(anoApurado, cargo), _resCarregar(anoAnterior, cargo), apuCfg.ativa ? _resCarregarAoVivo(anoApurado, cargo) : null, _resCarregar(anoAnterior2, cargo), ...anosPlen.map((a) => _resCarregar(a, cargo))]);
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
  const _antDe = (c) => _resCasarEntreEleicoes(c, antPorNome, ant ? ant.candidatos : []);
  const ant2PorNome = new Map();
  (ant2 ? ant2.candidatos : []).forEach((c) => { ant2PorNome.set(_resNorm(c.nome), c); ant2PorNome.set("URNA::" + _resNorm(c.nomeUrna), c); });
  const _ant2De = (c) => _resCasarEntreEleicoes(c, ant2PorNome, ant2 ? ant2.candidatos : []);
  const meu = _resMeuPalpiteMapa(cargo);
  const favs = _resFavoritos();
  const totalValidos = cands.reduce((s, c) => s + c.total, 0);
  if (!st.cenario) st.cenario = cands[0] ? cands[0].sq : null;
  const cenario = cands.find((c) => c.sq === st.cenario) || cands[0];

  const botoesCargo = CARGOS.map((c) => `<button data-res-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");
  // Cadeiras por ano (2014/2018/2022 + apurado) e do meu palpite
  const seatsPorAno = {};
  anosPlen.forEach((a, i) => { seatsPorAno[a] = _resSeatsDe(a === anoApurado ? cands : (hist[i] ? hist[i].candidatos : [])); });
  const palSeats = _resPalpiteSeats(cargo);
  if (st.variacaoOn === undefined) st.variacaoOn = true;
  if (st.vivoOn === undefined) st.vivoOn = true;
  const _k = "plenarioColapsado_res_" + cargo;
  const colapsado = pcState.expandido[_k] === undefined ? true : !!pcState.expandido[_k];
  const tog = (id, on, ic, rotulo, extra) => `<button type="button" data-res-tog="${id}" class="${on ? "on" : ""}" ${extra || ""}>${ic}${rotulo}</button>`;
  const IC = (n) => iconeSvg(n, 14);

  conteudo.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin:2px 0 4px 2px;"><span style="font-size:20px; font-weight:700;">Resultados ${anoApurado}</span><button type="button" class="pc-dd-btn ico" id="pcResImprimir" title="Imprimir a tela como está" style="width:32px; height:32px;">${iconeSvg("impressora", 15)}</button></div>
    <div class="pc-sub" style="margin:0 0 10px 2px;">Santa Catarina · ${meta ? "apuração oficial (TSE)" : "resultado oficial (TSE)"}</div>
    <div class="pc-res-tog">
      ${tog("vivo", !!meta && st.vivoOn, `<span class="pt${meta && !meta.final ? " vivo" : ""}"></span>`, meta && meta.final ? "Totalização final" : "Ao vivo", meta ? "" : 'disabled title="A apuração ao vivo liga em 4/10/2026"')}
      ${tog("palpite", st.fonteVoto === "palpite", IC("editar"), "Palpite")}
      ${tog("anterior", st.fonteVoto === "anterior", IC("relogio"), String(anoAnterior))}
    </div>
    ${meta && st.vivoOn ? `
    <div class="pc-heroi" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
        <span style="font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px;"><span class="pc-res-vivo${meta.final ? " fim" : ""}"></span>${meta.final ? "Totalização final" : "Apuração ao vivo"}</span>
        <span style="font-size:11.5px; font-weight:600; color:#34E84A;">${Number(meta.pctSecoes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%<span style="color:#8A9096;"> das seções</span></span>
      </div>
      <div class="pc-lobby-barra"><div style="width:${Math.min(100, Number(meta.pctSecoes) || 0)}%; background:#34E84A;"></div></div>
      <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#8A9096; margin-top:8px;"><span>${_resFmt(meta.secoesTotalizadas)} de ${_resFmt(meta.secoesTotal)} seções</span><span id="pcResAtualizado">atualizado ${_resTempoRelativo(meta.atualizadoEm)}${meta.final ? "" : " · próxima em 60 s"}</span></div>
    </div>` : ""}
    <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
    ${meta ? "" : _resPartHtml(part && part[cargo] && part[cargo].estado, "Santa Catarina")}
    <div class="glass-card" style="padding:14px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="pc-sub" id="pcResPlenTit" style="margin:0;">Plenário apurado ${anoApurado} — ${totalVagas} vagas</div>
        <button id="pcResPlenToggle" class="pc-mini-btn" title="${colapsado ? "Expandir" : "Recolher"}"><svg viewBox="0 0 16 16" width="13" height="13" style="transform:${colapsado ? "rotate(-90deg)" : "none"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
      </div>
      <div id="pcResPlenCorpo" class="pc-plen-corpo${colapsado ? "" : " aberto"}"></div>
    </div>
    <div class="pc-cargo-switch" style="margin:4px 0 12px;"><button data-res-aba="candidatos" class="${st.aba === "candidatos" ? "active" : ""}">Candidatos</button><button data-res-aba="mapa" class="${st.aba === "mapa" ? "active" : ""}">Mapa</button><button data-res-aba="ferramentas" class="${st.aba === "ferramentas" ? "active" : ""}">Ferramentas</button></div>
    <div id="pcResCorpo"></div>
    <div class="pc-aviso-nao-pesquisa" style="margin-top:16px;">Dados oficiais do TSE. Jogo de palpites entre participantes — não é pesquisa eleitoral.</div>
  `;
  document.querySelectorAll("[data-res-cargo]").forEach((b) => b.addEventListener("click", () => { st.cargo = b.dataset.resCargo; st.partidoSel = null; st.cenario = null; st.munSel = null; st.fichaSq = null; st.plenAno = null; st.plenModo = "ano"; renderResultados(); }));
  document.querySelectorAll("[data-res-aba]").forEach((b) => b.addEventListener("click", () => { st.aba = b.dataset.resAba; renderResultados(); }));
  document.querySelectorAll("[data-res-tog]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.resTog;
    if (id === "vivo") st.vivoOn = !st.vivoOn;
    if (id === "palpite") st.fonteVoto = st.fonteVoto === "palpite" ? "apurado" : "palpite";
    if (id === "anterior") st.fonteVoto = st.fonteVoto === "anterior" ? "apurado" : "anterior";
    if (id === "variacao") st.variacaoOn = !st.variacaoOn;
    renderResultados();
  }));
  // Imprimir a TELA como está (não o documento .di-*): classe na raiz
  // ativa o bloco @media print de "pc-print-tela" no CSS.
  document.getElementById("pcResImprimir").addEventListener("click", () => {
    const raiz = document.documentElement;
    raiz.classList.add("pc-print-tela");
    const limpar = () => { raiz.classList.remove("pc-print-tela"); window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    setTimeout(() => window.print(), 50);
    setTimeout(limpar, 60000);
  });
  const tg = document.getElementById("pcResPlenToggle");
  tg.addEventListener("click", () => {
    const atual = pcState.expandido[_k] === undefined ? true : !!pcState.expandido[_k];
    pcState.expandido[_k] = !atual;
    document.getElementById("pcResPlenCorpo").classList.toggle("aberto", atual);
    tg.querySelector("svg").style.transform = atual ? "none" : "rotate(-90deg)";
  });

  const ctx = { st, cargo, cands, antPorNome, antDe: _antDe, ant2De: _ant2De, meu, favs, totalVagas, cenario, ant, ant2, seatsPorAno, anos: anosPlen, palSeats };
  if (!st.plenAno) st.plenAno = anoApurado;
  _resRenderPlenario(ctx);
  if (st.aba === "mapa") await _resRenderMapa(ctx); else if (st.aba === "ferramentas") _resRenderFerramentas(ctx); else _resRenderCandidatos(ctx);
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

  // Lista compacta (aprovada 23/09/2026): etiqueta · PARTIDO — Nome ·
  // votação, uma linha por candidato. O número mostra o apurado; os botões
  // "Palpite" e "{ano anterior}" do cabeçalho trocam a fonte desse número
  // (um exclui o outro). Toque abre a ficha embaixo.
  const fonte = st.fonteVoto || "apurado";
  const linha = (c) => {
    const aberta = st.fichaSq === c.sq;
    let num, vazio = false;
    if (fonte === "palpite") { const p = meu.get(_resNorm(c.nomeUrna)) || meu.get(_resNorm(c.nome)); num = p ? p.votos : null; }
    else if (fonte === "anterior") { const a = ctx.antDe(c); num = a ? a.total : null; }
    else num = c.total;
    if (num === null || num === undefined) vazio = true;
    return `
    <div class="pc-cand-lin${aberta ? " res-aberta" : ""}${fonte !== "apurado" ? " alt" : ""}" data-res-cand="${c.sq}">
      <div class="pc-dep-cl1">
        ${_resEtiqueta(c, cargo)}
        <span class="nome"><span class="pt">${nomePartidoExibicao(c.partido)} — </span><b>${c.nomeUrna}</b></span>
        <span class="voto">${vazio ? "—" : _resFmt(num)}</span>
      </div>
      ${aberta ? `<div class="pc-cand-fav"><button type="button" class="pc-fav${favs.has(c.sq) ? " on" : ""}" data-res-fav="${c.sq}">${RES_IC_ESTRELA}<span>${favs.has(c.sq) ? "Favorito" : "Favoritar"}</span></button></div><div id="pcResFicha"></div>` : ""}
    </div>`;
  };

  corpo.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
      <input class="cell" id="pcResBusca" placeholder="Buscar candidato ou partido…" value="${escaparAtributoHtml(st.busca || "")}" style="flex:1; margin:0;">
      <button type="button" class="pc-dd-btn ico${st.soFav ? " on" : ""}" id="pcResSoFav" title="Só favoritos" style="${st.soFav ? "color:#C6E62A; border-color:rgba(198,230,42,.5);" : ""}">${RES_IC_ESTRELA}</button>
      ${_resDropdown("pcResOrd", "", "", `<div class="pc-dd-it${st.ordem === "desc" ? " on" : ""}" data-o="desc">Maior votação</div><div class="pc-dd-it${st.ordem === "asc" ? " on" : ""}" data-o="asc">Menor votação</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 170, titulo: "Ordenar" })}
    </div>
    <div class="pc-dep-card pc-cand-lista" style="padding:0 12px;">
      ${fonte !== "apurado" ? `<div class="pc-cand-aviso">Mostrando ${fonte === "palpite" ? "seu palpite" : "a votação de " + st.anoAnterior} no lugar do apurado</div>` : ""}
      ${lista.length ? lista.slice(0, limite).map(linha).join("") : estadoVazio({ icone: "buscar", titulo: "Nenhum candidato", texto: "Confira a busca ou o filtro de favoritos." })}
    </div>
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
  // Ano mais recente à direita, junto do Δ (pedido de 22/09/2026).
  const cab = (c1, c2, c3) => `<div class="pc-lin cab"><span></span><span>${c1}</span><span class="v">${c3}</span><span class="v">${c2}</span><span class="v">Δ</span></div>`;
  if (st.fichaAba === "mun") {
    const muns = await _resCarregar(RES_ANO_APURADO, "municipios");
    const nomeDe = (k) => (muns && muns.municipios[k] && muns.municipios[k].nome) || k;
    let linhas = Object.entries(c.municipios).map(([k, v]) => ({ k, nome: nomeDe(k), v, v0: a ? (a.municipios[k] || 0) : null }));
    linhas.sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
    corpo = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Município</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>` + linhas.slice(0, 40).map((l, i) => `<div class="pc-lin pc-lin-pos clic" data-fmun="${l.k}"><span class="i">${i + 1}º</span><span class="n">${_resNomeMun(l.nome)}</span><span class="c">${_resChipPos(_resPosicao(cands, l.k, l.v, (x, k) => x.municipios[k]))}</span><span class="v">${_resFmt(l.v)}</span><span class="v p">${_resPctTotal(l.v, c.total)}</span></div>`).join("") + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} municípios (use a busca do mapa)</div>` : "");
  } else if (st.fichaAba === "sec") {
    if (!st.fichaMun) {
      corpo = `<div class="pc-sub" style="padding:8px 0;">Toque num município na aba "Municípios" pra ver as seções dele.</div>`;
    } else {
      const sec = await _resCarregarSecoes(st.fichaMun);
      const d = sec && sec[cargo] && sec[cargo][c.numero];
      if (!d) corpo = `<div class="pc-sub" style="padding:8px 0;">Sem dado por seção pra este município.</div>`;
      else {
        const linhas = Object.entries(d).map(([k, v]) => { const [z, s] = k.split("::"); return { z, s, v }; }).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
        const loc = sec._secoes || {}; const todos = Object.values(sec[cargo] || {});
        corpo = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Seção</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>` + linhas.slice(0, 60).map((l) => `<div class="pc-lin pc-lin-pos"><span></span><span class="n">Seção ${l.s}<i class="pc-loc-sub">${l.z}ª zona${loc[`${l.z}::${l.s}`] ? " · " + loc[`${l.z}::${l.s}`] : ""}</i></span><span class="c">${_resChipPos(_resPosicao(todos, `${l.z}::${l.s}`, l.v, (m, k) => m[k]))}</span><span class="v">${_resFmt(l.v)}</span><span class="v p">${_resPctTotal(l.v, c.total)}</span></div>`).join("") + (linhas.length > 60 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 60} seções</div>` : "");
      }
    }
  } else {
    const hist = [];
    for (const ano of RES_ANOS_HISTORICO) {
      const d = await _resCarregar(ano, cargo);
      const x = d && _resHistoricoDe(c, d.candidatos);
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
  // Modo comparação (22/09/2026): a caixa grande do candidato virou o
  // próprio seletor (toque abre a busca); o antigo dropdown "Candidato"
  // deu lugar a "Comparar com" — escolher um 2º candidato troca a cor do
  // mapa, os totais e a lista pra ele vs o candidato principal.
  const cmp = st.cmpSq ? cands.find((c) => c.sq === st.cmpSq) : null;
  const listaCand = (idAtivo) => cands.slice(0, 40).map((c) => `<div class="pc-dd-it${c.sq === idAtivo ? " on" : ""}" data-sq="${c.sq}">${c.nomeUrna} <small style="color:#8A9096;">${c.partido}</small></div>`).join("");
  corpo.innerHTML = `
    <div class="pc-dd" id="pcResCen">
      <button type="button" class="pc-dd-btn pc-cenario-btn">
        <div class="pc-cenario">
          <span class="pc-dep-pos">${cands.indexOf(cenario) + 1}º</span>${_resEtiqueta(cenario, cargo)}
          <span class="pc-dep-cnm" style="flex:1 1 140px;"><span class="pc-dep-cnm-txt">${cenTxt}</span></span>
          <span class="pc-tm-partido" style="max-width:none;">${nomePartidoExibicao(cenario.partido)} · ${(CARGOS.find((x) => x.id === cargo) || {}).label || ""}</span>
          <span class="pc-cenario-dica">toque para trocar de candidato ${RES_IC_CHEV}</span>
        </div>
      </button>
      <div class="pc-dd-menu" style="min-width:260px;"><div style="padding:6px 8px;"><input class="cell" id="pcResCenBusca" placeholder="Buscar…" style="width:100%; margin:0;"></div><div id="pcResCenLista" style="max-height:240px; overflow:auto;">${listaCand(cenario.sq)}</div></div>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; align-items:center;">
      ${_resDropdown("pcResCmp", "Comparar com", cmp ? cmp.nomeUrna : "ninguém", `<div class="pc-dd-it${!cmp ? " on" : ""}" data-sq="">Sem comparação</div><div style="padding:6px 8px;"><input class="cell" id="pcResCmpBusca" placeholder="Buscar…" style="width:100%; margin:0;"></div><div id="pcResCmpLista" style="max-height:240px; overflow:auto;">${listaCand(st.cmpSq)}</div>`, { largura: 260 })}
      ${cmp ? "" : _resDropdown("pcResModo", "Modo", st.modo === "var" ? `Variação vs ${RES_ANO_ANTERIOR}` : `Votos ${RES_ANO_APURADO}`, `<div class="pc-dd-grp">Votos de ${cenario.nomeUrna}</div><div class="pc-dd-it${st.modo === "votos" ? " on" : ""}" data-m="votos">Votos ${RES_ANO_APURADO}</div><div class="pc-dd-it${st.modo === "var" ? " on" : ""}" data-m="var">Variação vs ${RES_ANO_ANTERIOR} (ganhou / perdeu)</div>`, { largura: 230 })}
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
    const vc = cmp ? (cmp.municipios[m.chave] || 0) : null;
    dados[m.ibge] = { m, v, v0, vc, var: v0 ? _resPct(v, v0) : null };
  });
  const dentro = (d) => (!st.regiao || d.m.meso === st.regiao) && (!st.assoc || d.m.assoc === st.assoc);
  const maxV = Math.max(1, ...Object.values(dados).map((d) => d.v));
  const mix = (c1, c2, t) => { const p = (s, i) => parseInt(s.slice(i, i + 2), 16); const f = (i) => Math.round(p(c1, i) + (p(c2, i) - p(c1, i)) * t); return `rgb(${f(1)},${f(3)},${f(5)})`; };
  const cor = (d) => {
    if (cmp) { const tot = d.v + d.vc; if (!tot) return "#1B1E22"; const t = Math.max(-1, Math.min(1, (d.v - d.vc) / Math.max(1, tot * 0.6))); return t >= 0 ? mix("#2A2C2E", "#34E84A", t) : mix("#2A2C2E", "#E8432A", -t); }
    if (st.modo === "var") { if (d.var === null) return "#1B1E22"; const t = Math.max(-1, Math.min(1, d.var / 50)); return t < 0 ? mix("#2A2C2E", "#E8432A", -t) : mix("#2A2C2E", "#34E84A", t); }
    const t = Math.log(1 + d.v) / Math.log(1 + maxV); return mix("#15191E", "#34E84A", Math.pow(t, 1.5));
  };
  const svg = document.getElementById("pcResMapaSvg");
  const pintar = () => {
    svg.querySelectorAll("path").forEach((p) => { const d = dados[p.dataset.ibge]; if (!d) return; p.style.fill = cor(d); p.classList.toggle("fora", !dentro(d)); p.classList.toggle("sel", st.munSel === d.m.chave); });
    const primeiroNome = (nm) => (nm || "").split(" ")[0];
    const L = cmp ? [`${primeiroNome(cmp.nomeUrna)} venceu`, "linear-gradient(90deg,#E8432A,#2A2C2E,#34E84A)", `${primeiroNome(cenario.nomeUrna)} venceu`]
      : st.modo === "var" ? ["perdeu (−50%)", "linear-gradient(90deg,#E8432A,#2A2C2E,#34E84A)", "ganhou (+50%)"] : ["menos votos", "linear-gradient(90deg,#15191E,#34E84A)", "mais votos"];
    document.getElementById("pcResLegA").textContent = L[0]; document.getElementById("pcResLegBar").style.background = L[1]; document.getElementById("pcResLegB").textContent = L[2];
    const lista = Object.values(dados).filter(dentro);
    const key = cmp ? "v" : st.modo === "var" ? "var" : "v";
    lista.sort((x, y) => (st.ordem === "desc" ? 1 : -1) * (((y[key] === null ? -1e9 : y[key])) - ((x[key] === null ? -1e9 : x[key]))));
    const tot = lista.reduce((s, d) => s + d.v, 0), tot0 = a ? lista.reduce((s, d) => s + (d.v0 || 0), 0) : null;
    document.getElementById("pcResOrdTit").textContent = "Municípios · " + (st.assoc || st.regiao || "todo o estado");
    if (cmp) {
      // Totais lado a lado (pedido de 22/09/2026): quem lidera ganha borda verde.
      const totC = lista.reduce((s, d) => s + d.vc, 0);
      const leadA = tot >= totC;
      document.getElementById("pcResTotais").outerHTML = `<div class="pc-cmp-tot" id="pcResTotais">
        <div class="pc-cmp-box${leadA ? " lead" : ""}"><div class="nm">${cenario.nomeUrna}</div><div class="vv${leadA ? " venceu" : ""}">${_resFmt(tot)}</div><div class="pc">${nomePartidoExibicao(cenario.partido)}${leadA ? " · lidera" : ""}</div></div>
        <div class="pc-cmp-box${!leadA ? " lead" : ""}"><div class="nm">${cmp.nomeUrna}</div><div class="vv${!leadA ? " venceu" : ""}">${_resFmt(totC)}</div><div class="pc">${nomePartidoExibicao(cmp.partido)}${!leadA ? " · lidera" : ""}</div></div>
      </div>`;
      // Os nomes dos candidatos aparecem uma vez só, no cabeçalho (pedido de
      // 22/09/2026: repetir o nome embaixo de cada voto poluía a lista); as
      // linhas ficam só com os números, e o vencedor daquele recorte em verde.
      const cabCmp = `<div class="pc-cmp-cab"><span></span><span></span><span class="stat">${cmp.nomeUrna}</span><span class="stat forte">${cenario.nomeUrna}</span><span></span></div>`;
      document.getElementById("pcResMapaLista").innerHTML = cabCmp + lista.slice(0, 15).map((d, i) => { const dif = d.v - d.vc; const cenVenceu = d.v >= d.vc;
        return `<div class="pc-cmp-mun${st.munSel === d.m.chave ? " sel" : ""}" data-mun="${d.m.chave}">
          <span class="pos">${i + 1}º</span><span class="nome">${d.m.nome}</span>
          <span class="stat"><b class="${cenVenceu ? "" : "venceu"}">${_resFmt(d.vc)}</b></span>
          <span class="stat forte"><b class="${cenVenceu ? "venceu" : ""}">${_resFmt(d.v)}</b></span>
          <span class="dif">${dif >= 0 ? "+" : ""}${_resFmt(dif)}</span>
        </div>${st.munSel === d.m.chave ? `<div class="pc-cmp-det" id="pcResMunDet"></div>` : ""}`; }).join("") + (lista.length > 15 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${lista.length - 15} municípios — refine pela região</div>` : "");
    } else {
      // Proporção do recorte sobre o total do candidato (pedido de 22/09/2026):
      // "Vale do Itajaí = 30.205 · 81,8% do total".
      const pctDe = (v, base) => base ? ` · ${(v / base * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "";
      document.getElementById("pcResTotais").outerHTML = `<div class="pc-dep-tiles" id="pcResTotais" style="margin-top:10px;"><div class="pc-dep-tile ref"><span class="tv">${_resFmt(tot)}</span><span class="tr">votos ${RES_ANO_APURADO}${pctDe(tot, cenario.total)}</span></div><div class="pc-dep-tile ref"><span class="tv">${tot0 === null ? "—" : _resFmt(tot0)}</span><span class="tr">votos ${RES_ANO_ANTERIOR}${tot0 === null ? "" : pctDe(tot0, a.total)}</span></div><div class="pc-dep-tile ref"><span class="tv">${_resPctHtml(tot0 ? _resPct(tot, tot0) : null)}</span><span class="tr">variação</span></div></div>`;
      // Colunas no alinhamento da referência (Politique, aprovado 23/09/2026):
      // Pos. = colocação do candidato entre TODOS do cargo naquele município
      // (etiqueta verde do 1º ao 3º), Votos, % = fatia do total do candidato.
      const cab = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Município</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">${st.modo === "var" ? "Δ " + RES_ANO_ANTERIOR : "%"}</span></div>`;
      document.getElementById("pcResMapaLista").innerHTML = cab + lista.slice(0, 15).map((d, i) => `<div class="pc-lin pc-lin-pos${st.munSel === d.m.chave ? " sel" : ""}" data-mun="${d.m.chave}"><span class="i">${i + 1}º</span><span class="n">${_resNomeMun(d.m.nome)}</span><span class="c">${_resChipPos(_resPosicao(cands, d.m.chave, d.v, (c, k) => c.municipios[k]))}</span><span class="v">${_resFmt(d.v)}</span><span class="v p">${st.modo === "var" ? _resPctHtml(d.var) : _resPctTotal(d.v, cenario.total)}</span></div>${st.munSel === d.m.chave ? `<div class="pc-mun-det" id="pcResMunDet"></div>` : ""}`).join("") + (lista.length > 15 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${lista.length - 15} municípios — refine pela região</div>` : "");
    }
    document.querySelectorAll("#pcResMapaLista [data-mun]").forEach((el) => el.addEventListener("click", () => { st.munSel = st.munSel === el.dataset.mun ? null : el.dataset.mun; pintar(); }));
    if (st.munSel) _resRenderMunDet(ctx, dados, cmp);
  };
  svg.querySelectorAll("path").forEach((p) => p.addEventListener("click", () => { const d = dados[p.dataset.ibge]; if (!d) return; st.munSel = st.munSel === d.m.chave ? null : d.m.chave; pintar(); const s = document.querySelector("#pcResMapaLista .pc-lin.sel"); if (s) s.scrollIntoView({ block: "center", behavior: "smooth" }); }));
  _resLigarDropdowns(corpo, (id, it) => {
    if (id === "pcResModo") { st.modo = it.dataset.m; pintar(); }
    if (id === "pcResReg") { st.regiao = it.dataset.r || ""; st.assoc = it.dataset.a || ""; st.munSel = null; pintar(); }
    if (id === "pcResMapaOrd") { st.ordem = it.dataset.o; pintar(); }
    if (id === "pcResCen") { st.cenario = it.dataset.sq; st.munSel = null; renderResultados(); }
    if (id === "pcResCmp") { st.cmpSq = it.dataset.sq || null; st.munSel = null; renderResultados(); }
  });
  const buscaCand = (inputId, listaId, aoEscolher) => {
    const cb = document.getElementById(inputId);
    if (!cb) return;
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("input", () => {
      const q = _resNorm(cb.value); const l = document.getElementById(listaId);
      l.innerHTML = cands.filter((c) => !q || _resNorm(c.nomeUrna + " " + c.partido).includes(q)).slice(0, 40).map((c) => `<div class="pc-dd-it" data-sq="${c.sq}">${c.nomeUrna} <small style="color:#8A9096;">${c.partido}</small></div>`).join("");
      l.querySelectorAll(".pc-dd-it").forEach((it) => it.addEventListener("click", (e) => { e.stopPropagation(); aoEscolher(it.dataset.sq); }));
    });
  };
  buscaCand("pcResCenBusca", "pcResCenLista", (sq) => { st.cenario = sq; st.munSel = null; renderResultados(); });
  buscaCand("pcResCmpBusca", "pcResCmpLista", (sq) => { st.cmpSq = sq || null; st.munSel = null; renderResultados(); });
  pintar();
}

// Detalhe do município dentro da lista do mapa: Zonas / Seções / Histórico.
// Em modo comparação (cmp preenchido), Zonas e Seções mostram os dois
// candidatos lado a lado em vez de ano atual/anterior (pedido de 22/09/2026,
// confirmado com dados reais de Blumenau antes de implementar).
async function _resRenderMunDet(ctx, dados, cmp) {
  const { st, cargo, cenario, antPorNome } = ctx;
  const alvo = document.getElementById("pcResMunDet");
  if (!alvo) return;
  const chave = st.munSel;
  const ordem = st.munOrdem || "desc";
  const d = Object.values(dados).find((x) => x.m.chave === chave);
  if (!st.munFiltro || st.munFiltro.muni !== chave) st.munFiltro = { muni: chave };
  const F = st.munFiltro;
  if (cmp && (st.munAba === "bairros" || st.munAba === "locais")) st.munAba = "zonas";
  const abas = `<div class="pc-sub-abas" style="margin:6px 0 4px;"><span class="${st.munAba === "zonas" ? "on" : ""}" data-ma="zonas">Zonas</span>${cmp ? "" : `<span class="${st.munAba === "bairros" ? "on" : ""}" data-ma="bairros">Bairros</span><span class="${st.munAba === "locais" ? "on" : ""}" data-ma="locais">Locais</span>`}<span class="${st.munAba === "secoes" ? "on" : ""}" data-ma="secoes">Seções</span><span class="${cmp ? "" : (st.munAba === "hist" ? "on" : "")}" data-ma="hist" ${cmp ? "hidden" : ""}>Histórico</span><span style="margin-left:auto; padding:4px 0;">${_resDropdown("pcResMunOrd", "", "", `<div class="pc-dd-it${ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 130 })}</span></div>`;
  const primeiroNome = (nm) => (nm || "").split(" ")[0];
  let corpo = "";
  if (cmp && st.munAba === "hist") st.munAba = "zonas";
  // Localidade real do TSE (22/09/2026): bairro por zona (do local mais
  // votado nela) e nome da escola por seção — vêm do MESMO arquivo de
  // seções que já carregamos (_zonas/_secoes), sem fetch a mais. Só 2022 e
  // 2018 têm; 2014 fica sem (o dataset do TSE não traz local por seção).
  const secLoc = await _resCarregarSecoes(chave);
  const bairroDaZona = (zona) => secLoc && secLoc._zonas && secLoc._zonas[zona];
  const escolaDaSecao = (k) => secLoc && secLoc._secoes && secLoc._secoes[k];
  const subtit = (t) => t ? `<i class="pc-loc-sub">${t}</i>` : "";
  // Filtro em cascata (modelo de referência aprovado 23/09/2026):
  // Zona → Bairro → Local → Seção. Tocar numa linha filtra o nível seguinte;
  // cada filtro ativo vira um "trilho" com Limpar.
  const bairroDaSecao = (k) => secLoc && secLoc._bairroSec && secLoc._bairroSec[k];
  const passaFiltro = (k) => {
    const z = k.split("::")[0];
    if (F.zona && z !== F.zona) return false;
    if (F.bairro && bairroDaSecao(k) !== F.bairro) return false;
    if (F.local && escolaDaSecao(k) !== F.local) return false;
    return true;
  };
  const trilho = cmp ? "" : [["zona", F.zona && `${F.zona}ª zona`], ["bairro", F.bairro], ["local", F.local]].filter((x) => x[1]).map(([t, v]) => `<div class="pc-filtro-trilho"><span>${v}</span><button type="button" data-limpa="${t}">Limpar</button></div>`).join("");
  const cabPos = (rot) => `<div class="pc-lin pc-lin-pos cab"><span></span><span>${rot}</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>`;
  // Agrupa votos por seção num grupo (bairro/local) pra todos os candidatos
  // e devolve [{g, v, pos}] do candidato da tela.
  const agrupar = (grupoDe) => {
    const porNum = (secLoc && secLoc[cargo]) || {};
    const tot = {};
    for (const [num, mapa] of Object.entries(porNum)) {
      for (const [k, v] of Object.entries(mapa)) {
        if (!passaFiltro(k)) continue;
        const g = grupoDe(k); if (!g) continue;
        (tot[g] = tot[g] || {})[num] = (tot[g][num] || 0) + v;
      }
    }
    return Object.entries(tot).map(([g, m]) => {
      const v = m[cenario.numero] || 0;
      let pos = 0; if (v) { pos = 1; for (const x of Object.values(m)) if (x > v) pos++; }
      return { g, v, pos };
    }).filter((x) => x.v > 0).sort((a, b) => (ordem === "desc" ? 1 : -1) * (b.v - a.v));
  };
  const linhaGrupo = (x, sub, tipo) => `<div class="pc-lin pc-lin-pos clic" data-filtra="${tipo}" data-valor="${escaparAtributoHtml(x.g)}"><span></span><span class="n">${x.g}${subtit(sub)}</span><span class="c">${_resChipPos(x.pos)}</span><span class="v">${_resFmt(x.v)}</span><span class="v p">${_resPctTotal(x.v, cenario.total)}</span></div>`;
  if (st.munAba === "bairros" || st.munAba === "locais") {
    if (!secLoc || !secLoc._bairroSec) corpo = `<div class="pc-sub" style="padding:6px 0;">Sem dado de ${st.munAba === "bairros" ? "bairro" : "local"} para esta eleição.</div>`;
    else if (st.munAba === "bairros") {
      const l = agrupar(bairroDaSecao);
      corpo = cabPos("Bairro") + (l.map((x) => linhaGrupo(x, "", "bairro")).join("") || `<div class="pc-sub" style="padding:6px 0;">Sem votos aqui.</div>`);
    } else {
      const l = agrupar(escolaDaSecao);
      const bairroDoLocal = {}; Object.entries(secLoc._secoes || {}).forEach(([k, e]) => { if (!bairroDoLocal[e]) bairroDoLocal[e] = bairroDaSecao(k); });
      corpo = cabPos("Local") + (l.map((x) => linhaGrupo(x, F.bairro ? "" : bairroDoLocal[x.g], "local")).join("") || `<div class="pc-sub" style="padding:6px 0;">Sem votos aqui.</div>`);
    }
  } else if (st.munAba === "zonas") {
    const z = await _resCarregar(RES_ANO_APURADO, cargo, "-zonas");
    const mine = (z && z[cenario.sq]) || {};
    if (cmp) {
      const zc = (z && z[cmp.sq]) || {};
      const chaves = [...new Set(Object.keys(mine).concat(Object.keys(zc)).filter((k) => k.startsWith(chave + "::")))];
      const linhas = chaves.map((k) => ({ zona: k.split("::")[1], v: mine[k] || 0, vc: zc[k] || 0 })).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
      corpo = `<div class="pc-cmp-det-card"><div class="pc-cmp-cab"><span></span><span class="stat">${cmp.nomeUrna}</span><span class="stat forte">${cenario.nomeUrna}</span><span></span></div>` + (linhas.map((l) => { const dif = l.v - l.vc; const cenVenceu = l.v >= l.vc;
        return `<div class="pc-cmp-lin">
          <span class="nome">${l.zona}ª zona${subtit(bairroDaZona(l.zona))}</span>
          <span class="stat"><b class="${cenVenceu ? "" : "venceu"}">${_resFmt(l.vc)}</b></span>
          <span class="stat forte"><b class="${cenVenceu ? "venceu" : ""}">${_resFmt(l.v)}</b></span>
          <span class="dif">${dif >= 0 ? "+" : ""}${_resFmt(dif)}</span>
        </div>`; }).join("") || `<div class="pc-sub" style="padding:6px 0;">Sem votos aqui.</div>`) + `</div>`;
    } else {
      const z0 = await _resCarregar(RES_ANO_ANTERIOR, cargo, "-zonas");
      const a = ctx.antDe(cenario);
      const ant = (z0 && a && z0[a.sq]) || {};
      const linhas = Object.entries(mine).filter(([k]) => k.startsWith(chave + "::")).map(([k, v]) => ({ zona: k.split("::")[1], v, v0: ant[k] || 0 })).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
      const zCands = Object.values(z || {});
      corpo = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Zona</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>` + (linhas.map((l) => `<div class="pc-lin pc-lin-pos clic" data-filtra="zona" data-valor="${l.zona}"><span></span><span class="n">${l.zona}ª zona${subtit(bairroDaZona(l.zona))}</span><span class="c">${_resChipPos(_resPosicao(zCands, `${chave}::${l.zona}`, l.v, (m, k) => m[k]))}</span><span class="v">${_resFmt(l.v)}</span><span class="v p">${_resPctTotal(l.v, cenario.total)}</span></div>`).join("") || `<div class="pc-sub" style="padding:6px 0;">Sem votos aqui.</div>`);
    }
  } else if (st.munAba === "secoes") {
    const sec = secLoc;
    const dd = sec && sec[cargo] && sec[cargo][cenario.numero];
    if (cmp) {
      const ddc = sec && sec[cargo] && sec[cargo][cmp.numero];
      if (!dd && !ddc) corpo = `<div class="pc-sub" style="padding:6px 0;">Sem dado por seção.</div>`;
      else {
        const chaves = [...new Set(Object.keys(dd || {}).concat(Object.keys(ddc || {})))];
        const linhas = chaves.map((k) => { const [z, s] = k.split("::"); return { z, s, v: (dd && dd[k]) || 0, vc: (ddc && ddc[k]) || 0 }; }).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
        corpo = `<div class="pc-cmp-det-card"><div class="pc-cmp-cab"><span></span><span class="stat">${cmp.nomeUrna}</span><span class="stat forte">${cenario.nomeUrna}</span><span></span></div>` + linhas.slice(0, 40).map((l) => { const dif = l.v - l.vc; const cenVenceu = l.v >= l.vc;
          return `<div class="pc-cmp-lin">
            <span class="nome" style="font-size:11px;">${l.z}ª zona · seção ${l.s}${subtit(escolaDaSecao(`${l.z}::${l.s}`))}</span>
            <span class="stat"><b class="${cenVenceu ? "" : "venceu"}">${_resFmt(l.vc)}</b></span>
            <span class="stat forte"><b class="${cenVenceu ? "venceu" : ""}">${_resFmt(l.v)}</b></span>
            <span class="dif">${dif >= 0 ? "+" : ""}${_resFmt(dif)}</span>
          </div>`; }).join("") + `</div>` + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} seções</div>` : "");
      }
    } else if (!dd) corpo = `<div class="pc-sub" style="padding:6px 0;">Sem dado por seção.</div>`;
    else {
      const linhas = Object.entries(dd).filter(([k]) => passaFiltro(k)).map(([k, v]) => { const [z, s] = k.split("::"); return { z, s, v }; }).sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
      const sCands = Object.values(sec[cargo] || {});
      corpo = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Seção</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>` + linhas.slice(0, 40).map((l) => `<div class="pc-lin pc-lin-pos"><span></span><span class="n">Seção ${l.s}${subtit(`${l.z}ª zona${F.local ? "" : " · " + (escolaDaSecao(`${l.z}::${l.s}`) || "")}`.replace(/ · $/, ""))}</span><span class="c">${_resChipPos(_resPosicao(sCands, `${l.z}::${l.s}`, l.v, (m, k) => m[k]))}</span><span class="v">${_resFmt(l.v)}</span><span class="v p">${_resPctTotal(l.v, cenario.total)}</span></div>`).join("") + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} seções</div>` : "");
    }
  } else {
    const hist = [];
    for (const ano of RES_ANOS_HISTORICO) {
      const dta = await _resCarregar(ano, cargo);
      const x = dta && _resHistoricoDe(cenario, dta.candidatos);
      hist.push({ ano, v: x ? (x.municipios[chave] || 0) : null });
    }
    const max = Math.max(1, ...hist.map((h) => h.v || 0));
    corpo = hist.map((h) => `<div style="display:grid; grid-template-columns:44px 1fr 76px; gap:8px; align-items:center; padding:8px 0; border-top:1px solid #23262A; font-size:12px;"><b>${h.ano}</b><div style="height:6px; border-radius:999px; background:rgba(242,244,245,.08); overflow:hidden;"><div style="width:${h.v ? h.v / max * 100 : 0}%; height:100%; background:${h.ano === RES_ANO_APURADO ? "#34E84A" : "#6B7178"};"></div></div><span style="text-align:right; font-variant-numeric:tabular-nums;">${h.v === null ? "—" : _resFmt(h.v)}</span></div>`).join("");
  }
  let cabPart = "";
  if (secLoc && secLoc._part && secLoc._part[cargo] && (F.zona || F.bairro || F.local)) {
    const ks = Object.keys(secLoc._part[cargo]).filter(passaFiltro);
    cabPart = _resPartHtml(_resSomaP(ks.map((k) => secLoc._part[cargo][k])), [F.zona && `${F.zona}ª zona`, F.bairro, F.local].filter(Boolean).pop());
  } else {
    const pm = await _resCarregar(RES_ANO_APURADO, "participacao");
    cabPart = _resPartHtml(pm && pm[cargo] && pm[cargo].mun[chave], d ? d.m.nome : "");
  }
  alvo.innerHTML = cabPart + abas + trilho + corpo;
  const proxima = { zona: "bairros", bairro: "locais", local: "secoes" };
  alvo.querySelectorAll("[data-filtra]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); F[x.dataset.filtra] = x.dataset.valor; st.munAba = proxima[x.dataset.filtra]; _resRenderMunDet(ctx, dados, cmp); }));
  alvo.querySelectorAll("[data-limpa]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); const ordemNiveis = ["zona", "bairro", "local"]; ordemNiveis.slice(ordemNiveis.indexOf(x.dataset.limpa)).forEach((n) => delete F[n]); _resRenderMunDet(ctx, dados, cmp); }));
  alvo.querySelectorAll("[data-ma]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.munAba = x.dataset.ma; _resRenderMunDet(ctx, dados, cmp); }));
  _resLigarDropdowns(alvo, (id, it) => { if (id === "pcResMunOrd") { st.munOrdem = it.dataset.o; _resRenderMunDet(ctx, dados, cmp); } });
}
