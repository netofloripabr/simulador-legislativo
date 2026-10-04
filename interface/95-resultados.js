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
// Desde 28/09/2026 a tela abre em 2026 (dados zerados em
// dados/resultados/sc-2026/, prontos pra receber a apuração ao vivo).
// O ensaio com o resultado de 2022 continua em ?ensaio=2022.
const RES_ENSAIO_2022 = typeof location !== "undefined" && /[?&]ensaio=2022/.test(location.search);
const RES_ANO_APURADO = RES_ENSAIO_2022 ? 2022 : 2026;
const RES_ANO_ANTERIOR = RES_ENSAIO_2022 ? 2018 : 2022;
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
// 2026 só tem o elenco zerado até o TSE publicar os arquivos detalhados
// (dias depois da eleição). Virar pra true quando rodar os tratadores de 2026.
const RES_2026_DETALHE = false;
const RES_DADOS_VER = "20261002";
// Governador e Presidente só na Apuração (02/10/2026) — os palpites seguem nos 3 do legislativo
const RES_CARGOS = [...CARGOS, { id: "governador", label: "Governador" }, { id: "presidente", label: "Presidente" }];
const _resMajor = (cargo) => cargo === "senador" || cargo === "governador" || cargo === "presidente";
async function _resCarregar(ano, cargo, sufixo) {
  pcState._resCache = pcState._resCache || {};
  const k = `${ano}/${cargo}${sufixo || ""}`;
  if (pcState._resCache[k]) return pcState._resCache[k];
  if (ano >= 2026 && !RES_2026_DETALHE && (sufixo || /^(participacao|secoes\/)/.test(cargo))) { pcState._resCache[k] = null; return null; }
  try {
    // ?v= muda quando os arquivos de dados são corrigidos (01/10/2026: votos por
    // seção de 2022 estavam triplicados e o navegador seguia com a cópia velha)
    const r = await fetch(`dados/resultados/${RES_UF.toLowerCase()}-${ano}/${cargo}${sufixo || ""}.json?v=${RES_DADOS_VER}`, { cache: "force-cache" });
    if (!r.ok) throw new Error(r.status);
    pcState._resCache[k] = await r.json();
  } catch (e) {
    // 404 é esperado (ex.: 2026 ainda sem arquivos por zona/seção) — só avisa em outro erro
    if (String(e && e.message) !== "404") console.error("Resultados: falha ao carregar", k, e);
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
    const r = await fetch(`${RES_APURACAO_URL}/${RES_UF.toLowerCase()}-${ano}/${cargo}.json?t=${Math.floor(Date.now() / 10000)}`, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
// Junta o ao vivo (totais/situação) com o estático (votos por município,
// que a rotina ainda não traz) — por SQ_CANDIDATO.
function _resMesclar(vivo, estatico) {
  if (!vivo) return estatico;
  // Casa por SQ_CANDIDATO e, na falta (arquivo 2026 preparado a partir do
  // elenco, sem SQ), pelo NÚMERO do candidato — único por cargo no estado.
  const est = (estatico && estatico.candidatos) || [];
  const porSq = new Map(est.filter((c) => c.sq).map((c) => [c.sq, c]));
  const porNum = new Map(est.filter((c) => c.numero).map((c) => [String(c.numero), c]));
  const vistos = new Set();
  // sq do elenco se mantém (04/10/2026): favoritos e Painel salvos antes da apuração continuam valendo
  const lista = vivo.candidatos.map((c) => { const e = porSq.get(c.sq) || porNum.get(String(c.numero)); if (e) vistos.add(e); return e ? { ...e, ...c, sq: e.sq || c.sq, sqTse: c.sq, nome: e.nome || c.nome, nomeUrna: e.nomeUrna || c.nomeUrna, municipios: e.municipios || {} } : c; });
  est.forEach((e) => { if (!vistos.has(e)) lista.push({ ...e, total: 0 }); });
  return { ...vivo, candidatos: lista.sort((a, b) => b.total - a.total) };
}
function _resTempoRelativo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60); if (m < 60) return `há ${m} min`;
  return `há ${Math.round(m / 60)} h`;
}
function _resArmarAtualizacao(meta) {
  clearTimeout(pcState._resTimer);
  // segue conferindo também ANTES do 1º arquivo do TSE (meta nulo, apuração
  // ligada) e até a totalização final — antes parava sem meta ou em 100%
  if (meta ? meta.final : !(pcState._resApuCfg && pcState._resApuCfg.ativa)) return;
  // 04/10/2026: confere a cada 20 s e só redesenha quando o TSE gerou
  // arquivo novo (geradoEm mudou), mantendo a rolagem onde o usuário está.
  pcState._resTimer = setTimeout(async () => {
    if (!((pcState.subaba === "resultados" || pcState.tela === "resultados-convidado") && document.getElementById("pcResCorpo"))) return;
    const st = pcState.res || {};
    const novo = await _resCarregarAoVivo(st.anoApurado || RES_ANO_APURADO, st.cargo || "estadual");
    if (!novo || !novo.meta || (meta && novo.meta.geradoEm === meta.geradoEm)) { _resArmarAtualizacao(meta); return; }
    const y = window.scrollY;
    pcState._resApuCfg = null;
    await renderResultados();
    window.scrollTo(0, y);
  }, 20000);
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
// Etiquetas no padrão dos palpites (23/09/2026): cor só pra eleito —
// verde vivo E-QP (quociente), lima E-M com a ordem da sobra ("E-M · 3ª",
// igual à disputa de sobras do palpite); suplente e não eleito em etiqueta
// neutra, sem cor.
// 02/10/2026: antes da apuração o espaço da etiqueta fica opaco (vazio);
// durante a apuração E-QP/E-M ficam CINZA (eleição momentânea, parcial) e só
// ganham verde/lima quando o TSE confirma a eleição (c.eleito) ou na
// totalização final.
function _resEtiqueta(c, cargo) {
  const s = (c.situacao || "").toUpperCase();
  const meta = pcState._resMeta;
  if (!s) return meta || c.total ? "" : `<span class="pc-sen-chip pc-chip-vazio" title="Aguardando a apuração"></span>`;
  const parcial = !!meta && !meta.final && !c.eleito;
  if (parcial && (s.startsWith("ELEITO"))) {
    const em = !(s.includes("ELEITO POR QP") || _resMajor(cargo));
    return `<span class="pc-sen-chip neutro pc-chip-parcial" title="Eleito parcialmente — muda conforme a apuração avança">${_resMajor(cargo) ? "E" : em ? "E-M" : "E-QP"}</span>`;
  }
  if (s.includes("ELEITO POR QP") || (_resMajor(cargo) && s.startsWith("ELEITO"))) return `<span class="pc-sen-chip" title="${_resMajor(cargo) ? "Eleito (mais votado)" : "Eleito direto pelo quociente partidário (art. 107)"}">${cargo === "senador" ? "E" : "E-QP"}</span>`;
  if (s.includes("ELEITO POR M") || s.startsWith("ELEITO")) {
    const r = (pcState._resRodadas || {})[c.sq];
    return `<span class="pc-sen-chip em" title="Eleito pela sobra (método das médias, art. 109)${r ? ` — ${r}ª sobra distribuída` : ""}">E-M${r ? ` · ${r}ª` : ""}</span>`;
  }
  if (s.includes("SUPLENTE")) return `<span class="pc-sen-chip neutro" title="Suplente">S</span>`;
  return `<span class="pc-sen-chip neutro" title="${c.situacao || "Não eleito"}">F</span>`;
}
// Ordem das sobras: rodadas do método das médias (maior média = votos do
// partido/federação ÷ (vagas já obtidas + 1)) só entre quem de fato levou
// sobra no resultado oficial — reproduz a ordem sem contradizer o TSE.
function _resCalcRodadas(ctx) {
  const R = _resPartidos(ctx);
  const rod = {};
  const g = R.lista.map((x) => ({ total: x.total, tem: x.diretas, resta: x.sobras, em: x.cands.filter((c) => { const s = (c.situacao || "").toUpperCase(); return s.startsWith("ELEITO") && !s.includes("ELEITO POR QP"); }).sort((a, b) => b.total - a.total) }));
  let n = 0;
  for (;;) {
    let melhor = null;
    g.forEach((x) => { if (x.resta > 0 && (!melhor || x.total / (x.tem + 1) > melhor.total / (melhor.tem + 1))) melhor = x; });
    if (!melhor) break;
    n++; const c = melhor.em[melhor.sobras_i = (melhor.sobras_i || 0)]; if (c) rod[c.sq] = n;
    melhor.sobras_i++; melhor.tem++; melhor.resta--;
  }
  return rod;
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
  // federação exibida pelas siglas dos partidos (02/10/2026), não pelo nome
  2022: { "PT": "PT / PC do B / PV", "PC do B": "PT / PC do B / PV", "PV": "PT / PC do B / PV",
          "PSDB": "PSDB / CIDADANIA", "CIDADANIA": "PSDB / CIDADANIA", "PSOL": "PSOL / REDE", "REDE": "PSOL / REDE" },
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
  const qe = _resMajor(cargo) ? null : quocienteEleitoral(validos, totalVagas);
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
      <button type="button" class="pc-dd-btn" id="pcResPartMapa" style="float:right; margin-top:-2px;">${iconeSvg("mapa", 13)}Ver no mapa</button>
      <div class="pc-part-tit">${sel.nome}${sel.partidos.size > 1 ? `<i>${[...sel.partidos].join(" · ")}</i>` : ""}</div>
      <div class="pc-dep-tiles pc-part-tiles">
        ${t("votos", _resFmt(sel.total), pct(sel.total))}${t("legenda", R.temLegenda ? _resFmt(sel.legenda) : "—")}${t("eleitos", sel.eleitos)}${t("candidatos", sel.cands.length)}
        ${t("QE", R.qe ? _resFmt(R.qe) : "—")}${t("QP", sel.qp === null ? "—" : sel.qp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}${t("diretas", sel.diretas, "", "#34E84A")}${t("sobras", sel.sobras, "", "var(--pc-warning)")}
      </div>
      <div class="pc-dep-card pc-cand-lista" style="padding:0 12px;">
        ${cs.map((c, i) => `<div class="pc-cand-lin"><div class="pc-dep-cl1" style="cursor:default;"><span class="pos">${i + 1}º</span>${_resEtiqueta(c, cargo)}<span class="nome"><b>${c.nomeUrna}</b><span class="pt"> — ${nomePartidoExibicao(c.partido)}</span></span><span class="voto">${_resFmt(c.total)}</span></div></div>`).join("")}
      </div>`;
  }
  const bm = document.getElementById("pcResPartMapa");
  if (bm) bm.addEventListener("click", () => { st.partMapa = true; if (st._partMapa) st._partMapa.cenario = "P:" + st.partidoSel; _resRenderPartidoMapa(ctx); });
  document.getElementById("pcResPartVoltar").addEventListener("click", () => { if (st.partidoSel) st.partidoSel = null; else st.ferr = null; _resRenderFerramentas(ctx); });
  corpo.querySelectorAll("[data-partido]").forEach((el) => el.addEventListener("click", () => { st.partidoSel = el.dataset.partido; _resRenderPartidos(ctx); corpo.scrollIntoView({ block: "start" }); }));
}

function _resRenderFerramentas(ctx) {
  const { st, favs } = ctx;
  const corpo = document.getElementById("pcResCorpo");
  if (st.ferr === "partidos") { if (st.partMapa) _resRenderPartidoMapa(ctx); else _resRenderPartidos(ctx); return; }
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

// Documento impresso da Apuração — MESMO padrão do palpite (fundo branco,
// marca d'água, cabeçalho SimulaLEGIS, classes .di-*), pedido de 28/09/2026
// depois do PDF da tela escura sair desconfigurado. Mapa redesenhado pra
// papel: malha em cinza médio com traço fino e fundo vazado; bolhas com
// transparência pra ver sobreposição.
function _resDocImpresso(st, cargo, cands) {
  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-BR"), horaTxt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const cargoLbl = (RES_CARGOS.find((c) => c.id === cargo) || {}).label || "";
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const pct = (v, b) => b ? (v / b * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%" : "—";
  const chip = (c) => { const e = _resEtiqueta(c, cargo); const t = e.replace(/<[^>]+>/g, ""); const cls = /class="pc-sen-chip em/.test(e) ? " di-chip-em" : /neutro/.test(e) ? (t === "S" ? " di-chip-s" : " di-chip-f") : ""; return `<span class="di-chip${cls}">${t}</span>`; };
  let corpo = "", titulo = "", sub = "";
  const I = st._imp;
  if (st.aba === "mapa" && I) {
    const { cenario, cmp, lista } = I;
    titulo = cmp ? `${esc(cenario.nomeUrna)} × ${esc(cmp.nomeUrna)}` : esc(cenario.nomeUrna);
    sub = `${cargoLbl} · ${st.anoApurado} · região: ${esc(I.regiao)} · ${cmp ? "comparação" : I.modo === "var" ? `variação vs ${st.anoAnterior}` : "votos"} · mapa em ${I.bolhas ? "bolhas" : "cores"}`;
    // mapa pra papel
    const svg = document.getElementById("pcResMapaSvg");
    let mapa = "";
    if (svg) {
      const cl = svg.cloneNode(true);
      cl.removeAttribute("id"); cl.removeAttribute("class"); cl.setAttribute("class", "di-mapa");
      const mix = (c1, c2, t) => { const q = (x, i) => parseInt(x.slice(i, i + 2), 16); const f = (i) => Math.round(q(c1, i) + (q(c2, i) - q(c1, i)) * t); return `rgb(${f(1)},${f(3)},${f(5)})`; };
      const vals = Object.values(I.dados).filter(I.dentro).map((d) => d.v);
      const maxV = Math.max(1, ...vals);
      cl.querySelectorAll("path").forEach((p) => {
        const d = I.dados[p.dataset.ibge]; p.removeAttribute("style"); p.removeAttribute("class");
        let fill = "none";
        if (!I.bolhas && d && I.dentro(d)) {
          if (cmp) { const t = (d.v + d.vc) ? Math.max(-1, Math.min(1, (d.v - d.vc) / Math.max(1, (d.v + d.vc) * 0.6))) : 0; fill = t >= 0 ? mix("#FFFFFF", "#1FA83A", t) : mix("#FFFFFF", "#D9482F", -t); }
          else if (I.modo === "var") { const t = d.var === null ? 0 : Math.max(-1, Math.min(1, d.var / 50)); fill = t >= 0 ? mix("#FFFFFF", "#1FA83A", t) : mix("#FFFFFF", "#D9482F", -t); }
          else { const t = Math.pow(Math.log(1 + d.v) / Math.log(1 + maxV), 1.5); fill = mix("#FFFFFF", "#1FA83A", t); }
        }
        p.setAttribute("fill", fill); p.setAttribute("stroke", d && I.dentro(d) ? "#9AA0A6" : "#D3D6D9"); p.setAttribute("stroke-width", "0.35"); p.setAttribute("vector-effect", "non-scaling-stroke");
      });
      cl.querySelectorAll("#pcResBolhas circle").forEach((c) => { const neg = c.classList.contains("neg"); c.removeAttribute("class"); c.setAttribute("fill", neg ? "#D9482F" : "#1FA83A"); c.setAttribute("fill-opacity", "0.28"); c.setAttribute("stroke", neg ? "#B23A24" : "#178A2F"); c.setAttribute("stroke-width", "1"); c.setAttribute("stroke-opacity", "0.85"); });
      const g = cl.querySelector("#pcResBolhas"); if (g) g.removeAttribute("id");
      mapa = cl.outerHTML;
    }
    const n1 = (nm) => esc((nm || "").split(" ")[0]);
    const leg = cmp ? `<span><i style="background:#D9482F"></i>${n1(cmp.nomeUrna)} venceu</span><span><i style="background:#1FA83A"></i>${n1(cenario.nomeUrna)} venceu</span><span>${I.bolhas ? "tamanho da bolha = diferença de votos" : "cor mais forte = diferença maior"}</span>`
      : I.modo === "var" ? `<span><i style="background:#1FA83A"></i>ganhou votos</span><span><i style="background:#D9482F"></i>perdeu votos</span>` : `<span><i style="background:#1FA83A"></i>${I.bolhas ? "tamanho da bolha = votos" : "cor mais forte = mais votos"}</span>`;
    const resumo = cmp
      ? `<div class="di-rres"><div><b>${_resFmt(I.tot)}</b>${esc(cenario.nomeUrna)} · ${esc(cenario.partido)}</div><div><b>${_resFmt(I.totC)}</b>${esc(cmp.nomeUrna)} · ${esc(cmp.partido)}</div><div><b>${(I.tot >= I.totC ? "+" : "−")}${_resFmt(Math.abs(I.tot - I.totC))}</b>diferença · ${esc(I.regiao)} · ${esc(I.tot >= I.totC ? cenario.nomeUrna : cmp.nomeUrna)} à frente</div></div>`
      : `<div class="di-rres"><div><b>${_resFmt(I.tot)}</b>votos em ${esc(I.regiao)} (${pct(I.tot, cenario.total)} do total)</div><div><b>${I.tot0 === null ? "—" : _resFmt(I.tot0)}</b>votos em ${st.anoAnterior}</div><div><b>${_resFmt(cenario.total)}</b>total no estado</div></div>`;
    const cab = cmp ? `<div class="di-rlin di-rcab"><span></span><span>Município</span><span>${n1(cmp.nomeUrna)}</span><span>${n1(cenario.nomeUrna)}</span><span>Dif.</span></div>`
      : `<div class="di-rlin di-rcab"><span></span><span>Município</span><span>Pos.</span><span>Votos</span><span>${I.modo === "var" ? "Δ " + st.anoAnterior : "%"}</span></div>`;
    const linhas = lista.filter((d) => cmp ? (d.v || d.vc) : d.v).map((d, i) => cmp
      ? `<div class="di-rlin"><span>${i + 1}º</span><span>${esc(_resNomeMun(d.m.nome))}</span><span class="${d.vc > d.v ? "di-rv" : ""}">${_resFmt(d.vc)}</span><span class="${d.v >= d.vc ? "di-rv" : ""}">${_resFmt(d.v)}</span><span>${d.v - d.vc >= 0 ? "+" : "−"}${_resFmt(Math.abs(d.v - d.vc))}</span></div>`
      : `<div class="di-rlin"><span>${i + 1}º</span><span>${esc(_resNomeMun(d.m.nome))}</span><span>${_resPosicao(cands, d.m.chave, d.v, (c, k) => c.municipios[k]) || "—"}º</span><span>${_resFmt(d.v)}</span><span>${I.modo === "var" ? (d.var === null ? "—" : (d.var >= 0 ? "+" : "") + d.var.toFixed(1).replace(".", ",") + "%") : pct(d.v, cenario.total)}</span></div>`).join("");
    corpo = `${resumo}<div class="di-rmapa">${mapa}<div class="di-rleg">${leg}</div></div>${cab}${linhas}`;
  } else {
    titulo = `${cargoLbl} — apuração ${st.anoApurado}`;
    sub = `Santa Catarina · resultado oficial (TSE) · ${cands.length} candidatos`;
    const pos = new Map([...cands].sort((a, b) => b.total - a.total).map((c, i) => [c.sq, i + 1]));
    corpo = `<div class="di-rlin di-rcab di-rcand"><span></span><span></span><span>Candidato</span><span>Votos</span></div>` +
      [...cands].sort((a, b) => b.total - a.total).map((c) => `<div class="di-rlin di-rcand"><span>${pos.get(c.sq)}º</span>${chip(c)}<span><b>${esc(c.nomeUrna)}</b> <i>${esc(nomePartidoExibicao(c.partido))}</i></span><span>${_resFmt(c.total)}</span></div>`).join("");
  }
  return `
    <div class="di-agua"><span><b>Simula</b>LEGIS</span></div>
    <div class="di-conteudo">
      <div class="di-cab">
        <div class="di-marca"><div class="di-wm"><b>Simula</b><span>LEGIS</span></div><div class="di-wmsub">Simulador Eleitoral Legislativo 2026</div></div>
        <div class="di-meta"><b>Santa Catarina</b> · Apuração ${st.anoApurado}<br>gerado em ${dataTxt} · ${horaTxt}</div>
      </div>
      <div class="di-regra"></div>
      <div class="di-tit">${titulo}</div>
      <div class="di-sub">${sub}</div>
      ${corpo}
      <div class="di-sub" style="margin-top:12px;">Dados oficiais do TSE. Jogo de palpites entre participantes — não é pesquisa eleitoral.</div>
      <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dataTxt} ${horaTxt}</span></div>
    </div>`;
}

// Mapa por PARTIDO (28/09/2026): mesma tela do mapa de candidato (região,
// modo votos/variação, comparar, cores/bolhas), com o partido/federação como
// "candidato". Votos por município = soma dos candidatos (sem legenda, que
// não vem por município). Anterior agrupado pelo nome ATUAL do partido.
function _resPartidoPseudo(lista, ano) {
  const fed = RES_FEDERACOES[ano] || {};
  const fedAtual = RES_FEDERACOES[pcState.res.anoApurado] || {};
  const g = {};
  (lista || []).forEach((c) => {
    let k = fed[c.partido] || _resPartidoAtual(c.partido);
    k = fedAtual[k] || k;
    const x = g[k] = g[k] || { sq: "P:" + k, nome: k, nomeUrna: k, partido: k, total: 0, municipios: {}, eleitos: 0, situacao: "" };
    x.total += c.total;
    if (_resEleito(c)) x.eleitos++;
    for (const [m, v] of Object.entries(c.municipios || {})) x.municipios[m] = (x.municipios[m] || 0) + v;
  });
  return Object.values(g).sort((a, b) => b.total - a.total);
}
async function _resRenderPartidoMapa(ctx) {
  const st = pcState.res;
  const pm = st._partMapa = st._partMapa || { cargo: ctx.cargo, modo: "votos", ordem: "desc", regiao: "", assoc: "", mapaForma: "cores" };
  if (pm.cargo !== ctx.cargo) { pm.cargo = ctx.cargo; pm.cmpSq = null; pm.cenario = null; }
  pm.anoApurado = st.anoApurado; pm.anoAnterior = st.anoAnterior;
  const partes = _resPartidoPseudo(ctx.cands, st.anoApurado);
  const antL = _resPartidoPseudo(ctx.ant ? ctx.ant.candidatos : [], st.anoAnterior);
  const antMap = new Map(antL.map((x) => [x.nome, x]));
  if (!pm.cenario || !partes.find((x) => x.sq === pm.cenario)) pm.cenario = "P:" + (st.partidoSel || partes[0].nome);
  const cenario = partes.find((x) => x.sq === pm.cenario) || partes[0];
  const pctx = { ...ctx, st: pm, cands: partes, cenario, antDe: (x) => antMap.get(x.nome) || null, modoPartido: true, rerender: () => _resRenderPartidoMapa(ctx) };
  await _resRenderMapa(pctx);
  const corpo = document.getElementById("pcResCorpo");
  corpo.insertAdjacentHTML("afterbegin", `<button type="button" class="pc-part-voltar" id="pcResPartMapaVoltar">${iconeSvg("setaEsquerda", 13)}Partidos</button>`);
  document.getElementById("pcResPartMapaVoltar").addEventListener("click", () => { st.partMapa = false; _resRenderPartidos(ctx); });
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
  // votos por município ao vivo (munTse = código TSE do município) → chave do app (04/10/2026)
  if (vivo && apu && apu.candidatos.some((c) => c.munTse)) {
    const mj = await _resCarregar(RES_ANO_ANTERIOR, "municipios");
    const porTse = {}; Object.entries((mj && mj.municipios) || {}).forEach(([k, m]) => { if (m.tse) porTse[String(Number(m.tse))] = k; });
    apu.candidatos.forEach((c) => { if (!c.munTse) return; const m = {}; Object.entries(c.munTse).forEach(([cod, v]) => { const k = porTse[String(Number(cod))]; if (k) m[k] = (m[k] || 0) + v; }); c.municipios = m; });
  }
  const meta = vivo && vivo.meta;
  pcState._resMeta = meta || null;
  await _resGarantirLinks(cargo);
  _resArmarAtualizacao(meta);
  if (!apu) { conteudo.innerHTML = estadoVazio({ icone: "alerta", titulo: "Resultados indisponíveis", texto: "Não consegui carregar os dados deste cargo. Tente de novo em instantes." }); return; }
  const totalVagas = cargo === "governador" || cargo === "presidente" ? 1 : vagasFixasCargo(RES_UF, cargo);
  const cands = apu.candidatos.every((c) => !c.total) ? [...apu.candidatos].sort((a, b) => String(a.nomeUrna).localeCompare(String(b.nomeUrna), "pt-BR")) : apu.candidatos;
  const aguardando = !meta && cands.every((c) => !c.total);
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
  _resAvisarNovidades(cargo, meta, cands, favs);
  const cenario = cands.find((c) => c.sq === st.cenario) || cands[0];

  const botoesCargo = RES_CARGOS.map((c) => `<button data-res-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label.replace(/^Deputado /, "").replace(/^Dep\. /, "")}</button>`).join("");
  // Cadeiras por ano (2014/2018/2022 + apurado) e do meu palpite
  const seatsPorAno = {};
  anosPlen.forEach((a, i) => { seatsPorAno[a] = _resSeatsDe(a === anoApurado ? cands : (hist[i] ? hist[i].candidatos : [])); });
  const palSeats = _resPalpiteSeats(cargo);
  if (st.variacaoOn === undefined) st.variacaoOn = true;
  if (st.vivoOn === undefined) st.vivoOn = true;
  const _k = "plenarioColapsado_res_" + cargo;
  const colapsado = pcState.expandido[_k] === undefined ? true : !!pcState.expandido[_k];
  st.fonteVoto = "apurado"; // etiquetas Palpite/2022 removidas em 01/10/2026
  const tog = (id, on, ic, rotulo, extra) => `<button type="button" data-res-tog="${id}" class="${on ? "on" : ""}" ${extra || ""}>${ic}${rotulo}</button>`;
  const IC = (n) => iconeSvg(n, 14);

  conteudo.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin:2px 0 4px 2px;"><span style="display:flex; align-items:center; gap:8px;"><button type="button" class="pc-dd-btn ico" id="pcResImprimir" title="Imprimir a tela como está" style="width:32px; height:32px;">${iconeSvg("impressora", 15)}</button><button type="button" class="pc-dd-btn ico" id="pcResHome" title="Página inicial" style="width:32px; height:32px;">${iconeSvg("home", 15)}</button><span style="font-size:20px; font-weight:700;">Apuração ${anoApurado}</span></span></div>
    <div class="pc-sub" style="margin:0 0 10px 2px;">Santa Catarina · ${meta ? "apuração oficial (TSE)" : aguardando ? "aguardando a apuração" : "resultado oficial (TSE)"}</div>
    <div class="pc-res-tog">
      ${_resVivoChip(meta)}

    </div>
    ${meta && st.vivoOn ? `
    <div class="pc-heroi" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
        <span style="font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px;"><span class="pc-res-vivo${meta.final ? " fim" : ""}"></span>${meta.final ? "Totalização final" : "Apuração ao vivo"}</span>
        <span style="font-size:11.5px; font-weight:600; color:#34E84A;">${Number(meta.pctSecoes || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%<span style="color:#8A9096;"> das seções</span></span>
      </div>
      <div class="pc-lobby-barra"><div style="width:${Math.min(100, Number(meta.pctSecoes) || 0)}%; background:#34E84A;"></div></div>
      <div style="display:flex; justify-content:space-between; font-size:10.5px; color:#8A9096; margin-top:8px;"><span>${_resFmt(meta.secoesTotalizadas)} de ${_resFmt(meta.secoesTotal)} seções</span><span id="pcResAtualizado">atualizado ${meta.atualizadoEm ? _resTempoRelativo(meta.atualizadoEm) : "agora"}${meta.final ? "" : " · confere a cada 20 s"}</span></div>
    </div>` : ""}
    <div class="pc-cargo-switch pc-res-cargos" style="margin-bottom:14px;">${botoesCargo}</div>
    ${await _resPainelEleicao(cargo, meta, part, anoApurado, anoAnterior)}
    <div class="glass-card" style="padding:14px; margin-bottom:12px;${st.aba === "mapa" || st.aba === "painel" || cargo === "governador" || cargo === "presidente" ? " display:none;" : ""}">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div class="pc-sub" id="pcResPlenTit" style="margin:0;">Plenário apurado ${anoApurado} — ${totalVagas} vagas</div>
        <button id="pcResPlenToggle" class="pc-mini-btn" title="${colapsado ? "Expandir" : "Recolher"}"><svg viewBox="0 0 16 16" width="13" height="13" style="transform:${colapsado ? "rotate(-90deg)" : "none"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
      </div>
      <div id="pcResPlenCorpo" class="pc-plen-corpo${colapsado ? "" : " aberto"}"></div>
    </div>
    <div class="pc-cargo-switch pc-res-abas2" style="margin:4px 0 12px;"><button data-res-aba="candidatos" class="${st.aba === "candidatos" ? "active" : ""}">Geral</button><button data-res-aba="painel" class="${st.aba === "painel" ? "active" : ""}">Candidato</button><button data-res-aba="mapa" class="${st.aba === "mapa" ? "active" : ""}">Mapa</button></div>
    <div id="pcResCorpo"></div>
    <div class="pc-aviso-nao-pesquisa" style="margin-top:16px;">Dados oficiais do TSE. Jogo de palpites entre participantes — não é pesquisa eleitoral.</div>
  `;
  document.querySelectorAll("[data-res-cargo]").forEach((b) => b.addEventListener("click", () => { st.cargo = b.dataset.resCargo; st.partidoSel = null; st.cenario = null; st.munSel = null; st.fichaSq = null; st.plenAno = null; st.plenModo = "ano"; renderResultados(); }));
  document.querySelectorAll("[data-res-aba]").forEach((b) => b.addEventListener("click", () => { st.aba = b.dataset.resAba; renderResultados(); }));
  const bAt = document.getElementById("pcResAtualizar");
  if (bAt) bAt.addEventListener("click", async (e) => { e.stopPropagation(); bAt.classList.add("girando"); const y = window.scrollY; pcState._resApuCfg = null; await renderResultados(); window.scrollTo(0, y); });
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
  document.getElementById("pcResHome").addEventListener("click", () => {
    clearTimeout(pcState._resTimer);
    if (!pcState.perfil && pcState._telaAntesRes && pcState._telaAntesRes !== "resultados-convidado") pcState.tela = pcState._telaAntesRes;
    pcState.subaba = "painel"; renderAppColaborativo();
    window.scrollTo(0, 0);
  });
  document.getElementById("pcResImprimir").addEventListener("click", () => {
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) { container = document.createElement("div"); container.id = "pcImpressaoConteudo"; document.body.appendChild(container); }
    // Janela de filtros de impressão (aprovada 29/09/2026); o mapa segue
    // imprimindo como está na tela (_resDocImpresso).
    _resImpAbrir(pcState._resCtx);
  });
  const tgEl = document.getElementById("pcResDadosTog");
  if (tgEl) tgEl.addEventListener("click", () => { const k = "dadosEleicaoAberto_res"; pcState.expandido[k] = !pcState.expandido[k]; const box = document.getElementById("pcResDadosEl"); box.classList.toggle("fechado", !pcState.expandido[k]); tgEl.querySelector("svg").style.transform = pcState.expandido[k] ? "none" : "rotate(-90deg)"; });
  const tg = document.getElementById("pcResPlenToggle");
  tg.addEventListener("click", () => {
    const atual = pcState.expandido[_k] === undefined ? true : !!pcState.expandido[_k];
    pcState.expandido[_k] = !atual;
    document.getElementById("pcResPlenCorpo").classList.toggle("aberto", atual);
    tg.querySelector("svg").style.transform = atual ? "none" : "rotate(-90deg)";
  });

  const ctx = { st, cargo, cands, antPorNome, antDe: _antDe, ant2De: _ant2De, meu, favs, totalVagas, cenario, ant, ant2, seatsPorAno, anos: anosPlen, palSeats };
  pcState._resCtx = ctx;
  pcState._resRodadas = _resMajor(cargo) ? {} : _resCalcRodadas(ctx);
  if (!st.plenAno) st.plenAno = anoApurado;
  _resRenderPlenario(ctx);
  if (st.aba === "ferramentas") st.aba = "candidatos"; // aba removida em 29/09/2026
  if (st.aba === "painel") { await _resRenderPainel(ctx); return; }
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
  // "Eleitos primeiro": eleitos por votos, depois o resto na mesma ordem (28/09/2026)
  if (st.ordem === "eleitos") lista = [...lista].sort((a, b) => (_resEleito(b) - _resEleito(a)) || (b.total - a.total));
  const limite = Math.min(lista.length, st.limite || 60);

  // Lista compacta (aprovada 23/09/2026): etiqueta · PARTIDO — Nome ·
  // votação, uma linha por candidato. O número mostra o apurado; os botões
  // "Palpite" e "{ano anterior}" do cabeçalho trocam a fonte desse número
  // (um exclui o outro). Toque abre a ficha embaixo.
  const fonte = st.fonteVoto || "apurado";
  // Pontuação do palpite (regra de calculo/pontuacao.js, RANQUEAMENTO.md):
  // aparece só com o botão Palpite ligado e acompanha a apuração, porque
  // "oficiais" é a lista apurada do momento (ao vivo quando houver).
  let pont = null;
  if (fonte === "palpite" && meu.size && typeof pontuarCedulaCargo === "function") {
    const previstos = [...meu.entries()].map(([k, v]) => ({ chave: k, votos: v.votos, marcadoEleito: v.marcado }));
    const oficiais = cands.map((c) => ({ chave: _resNorm(c.nomeUrna), partido: c.partido, votosReais: c.total, eleitoReal: _resEleito(c), status: "valido" }));
    pont = pontuarCedulaCargo(previstos, oficiais, ctx.totalVagas);
    pont.porChave = Object.fromEntries(pont.detalhe.map((x) => [x.chave, x]));
  }
  // Posição na lista geral do cargo (pela votação apurada), a mesma com
  // busca/filtro/ordem ativos — pedido de 28/09/2026.
  const posGeral = new Map([...cands].sort((a, b) => b.total - a.total).map((c, i) => [c.sq, i + 1]));
  const marcouDe = (c) => { const p = meu.get(_resNorm(c.nomeUrna)) || meu.get(_resNorm(c.nome)); return p && p.marcado; };
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
        <span class="pos">${c.total ? posGeral.get(c.sq) + "º" : "—"}</span>
        ${_resEtiqueta(c, cargo)}
        <span class="nome nome2"><b>${c.nomeUrna}</b><span class="l2">${(() => { const a22 = ctx.antDe(c); const k = _resChaveLink(c); const ig = (pcState._resLinks || {})[k]; const fin = (pcState._resFin || {})[k];
          return `<span class="pt">${nomePartidoExibicao(c.partido)}</span><span class="v22">${st.anoAnterior} <b>${a22 && a22.total ? _resFmt(a22.total) : "—"}</b></span>`; })()}</span></span>
        ${(() => { const k = _resChaveLink(c); const ig = (pcState._resLinks || {})[k]; const fin = (pcState._resFin || {})[k];
          return `<span class="lnk">${ig ? `<a class="pc-insta-mini" href="${escaparAtributoHtml(ig)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" onclick="event.stopPropagation()">${iconeSvg("instagram", 13)}</a>` : "<i></i>"}${fin ? `<a class="pc-financeiro-mini" href="${escaparAtributoHtml(linkTseDoCandidato(fin.tseId))}" target="_blank" rel="noopener noreferrer" title="Bens e recursos no TSE" onclick="event.stopPropagation()">${iconeSvg("credito", 13)}</a>` : "<i></i>"}</span>`; })()}
        <span class="voto">${vazio ? "—" : _resFmt(num)}${pont && pont.porChave[_resNorm(c.nomeUrna)] ? (() => { const x = pont.porChave[_resNorm(c.nomeUrna)]; return `<i class="pc-acerto"><b class="${x.e ? "on" : ""}" title="acerto de eleição">E</b><b class="${x.alvo >= 5 ? "on" : ""}" title="proximidade dos votos">${Math.round(x.prox * 100)}%</b><b class="${x.posicao ? "on" : ""}" title="colocação no partido">P</b><span>${x.pts.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pts</span></i>`; })() : ""}</span>
      </div>
      ${aberta ? `<div id="pcResFicha"></div>` : ""}
    </div>`;
  };

  corpo.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
      <input class="cell" id="pcResBusca" placeholder="Buscar candidato ou partido…" value="${escaparAtributoHtml(st.busca || "")}" style="flex:1; margin:0;">
      <button type="button" class="pc-dd-btn ico${st.soFav ? " on" : ""}" id="pcResSoFav" title="Só favoritos" style="${st.soFav ? "color:#C6E62A; border-color:rgba(198,230,42,.5);" : ""}">${RES_IC_ESTRELA}</button>${_resMajor(cargo) ? "" : `<button type="button" class="pc-dd-btn ico pn-sob-btn${st.sobAberta ? " on" : ""}" id="pcResSob" title="Disputa das sobras">S</button>`}
      ${_resDropdown("pcResOrd", "", "", `<div class="pc-dd-it${st.ordem === "desc" ? " on" : ""}" data-o="desc">Maior votação</div><div class="pc-dd-it${st.ordem === "asc" ? " on" : ""}" data-o="asc">Menor votação</div><div class="pc-dd-it${st.ordem === "eleitos" ? " on" : ""}" data-o="eleitos">Eleitos primeiro</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 170, titulo: "Ordenar" })}
    </div>
    ${!_resMajor(cargo) && st.sobAberta ? `<div class="pn-sob-item"><div class="pn-sob-cab"><span>Disputa das sobras${pcState._resMeta && !pcState._resMeta.final ? " · parcial" : ""}</span></div><div id="pcResSobras"></div></div>` : ""}
    <div class="pc-dep-card pc-cand-lista" style="padding:0 12px;">
      ${pont ? `<div class="pc-pont"><div><b>${Math.round(pont.pontosTotal * 1000)}</b><span>pontos</span></div><div><b>${pont.acertosEleicao}/${pont.vagasValidas || ctx.totalVagas}</b><span>eleitos acertados</span></div><div><b>${Math.round(pont.pctProximidade * 100)}%</b><span>proximidade média</span></div></div>` : ""}
      ${fonte === "palpite" && !meu.size ? `<div class="pc-cand-aviso">Você ainda não tem palpite neste cargo.</div>` : ""}
      ${fonte !== "apurado" ? `<div class="pc-cand-aviso">Mostrando ${fonte === "palpite" ? "seu palpite" : "a votação de " + st.anoAnterior} no lugar do apurado</div>` : ""}
      ${lista.length ? lista.slice(0, limite).map(linha).join("") : estadoVazio({ icone: "buscar", titulo: "Nenhum candidato", texto: "Confira a busca ou o filtro de favoritos." })}
    </div>
    ${lista.length > limite ? `<button class="ghost" id="pcResMais" style="width:100%; margin-top:10px;">Mostrar mais (${lista.length - limite} restantes)</button>` : ""}
  `;
  const inp = document.getElementById("pcResBusca");
  inp.addEventListener("input", () => { st.busca = inp.value; clearTimeout(pcState._resBuscaT); pcState._resBuscaT = setTimeout(() => { _resRenderCandidatos(ctx); const i2 = document.getElementById("pcResBusca"); if (i2) { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } }, 250); });
  // Disputa das sobras: botão "S" ao lado da estrela liga/desliga (02/10/2026)
  const bS = document.getElementById("pcResSob");
  if (bS) bS.addEventListener("click", () => { st.sobAberta = !st.sobAberta; _resRenderCandidatos(ctx); });
  const sobEl = corpo.querySelector(".pn-sob-item");
  if (sobEl) {
    const pintarSob = () => {
      const alvoS = document.getElementById("pcResSobras");
      if (!alvoS || alvoS.dataset.ok) return;
      const leg = st.anoApurado === 2022 && typeof LEGENDA_2022 !== "undefined" ? LEGENDA_2022[cargo] : null;
      alvoS.innerHTML = _resSobrasHtml(_resSobrasDados(cands, ctx.totalVagas, leg, RES_FEDERACOES[st.anoApurado]), !!(pcState._resMeta && !pcState._resMeta.final), ctx.totalVagas);
      alvoS.dataset.ok = "1";
    };
    pintarSob();
  }
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
  // Modo 2026 com base 2022: aba Municípios vira árvore (município → bairro →
  // colégio → seção), aprovado 29/09/2026; a aba Locais sai (ficaria repetida).
  const arv = st.anoApurado >= 2026 && !!a;
  const ordemArv = RES_ARV_ORDENS.some(([o]) => o === ordem) ? ordem : "d26";
  // Locais (Zonas/Bairros/Locais/Seções) volta ao lado da árvore (29/09/2026);
  // abre no último município aberto na árvore, ou no mais votado de 2022.
  if (arv && st.fichaAba === "sec" && !st.fichaMun) st.fichaMun = Object.entries(a.municipios || {}).sort((x, y) => y[1] - x[1]).map((x) => x[0])[0] || null;
  const abas = `<div class="pc-sub-abas" style="margin:12px 0 4px;">
    <span class="${st.fichaAba === "mun" ? "on" : ""}" data-fa="mun">Municípios</span>
    <span class="${st.fichaAba === "sec" ? "on" : ""}" data-fa="sec">Locais</span>
    <span class="${st.fichaAba === "hist" ? "on" : ""}" data-fa="hist">Histórico</span>
    <span style="margin-left:auto; padding:4px 0; display:flex; gap:6px; align-items:center;"><button type="button" class="pc-dd-btn ico${_resFavoritos().has(c.sq) ? " on" : ""}" data-ficha-fav="${c.sq}" title="${_resFavoritos().has(c.sq) ? "Remover dos favoritos" : "Favoritar"}" style="${_resFavoritos().has(c.sq) ? "color:#C6E62A; border-color:rgba(198,230,42,.5);" : ""}">${RES_IC_ESTRELA}</button>${_resDropdown("pcResFichaOrd", "", "", arv ? RES_ARV_ORDENS.map(([o, t]) => `<div class="pc-dd-it${ordemArv === o ? " on" : ""}" data-o="${o}">${t}</div>`).join("") : `<div class="pc-dd-it${ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: arv ? 170 : 130, titulo: "Ordenar" })}</span>
  </div>`;
  let corpo = "";
  // Ano mais recente à direita, junto do Δ (pedido de 22/09/2026).
  const cab = (c1, c2, c3) => `<div class="pc-lin cab"><span></span><span>${c1}</span><span class="v">${c3}</span><span class="v">${c2}</span><span class="v">Δ</span></div>`;
  if (st.fichaAba === "mun" && arv) {
    corpo = await _resArvore(ctx, c, a, ordemArv);
  } else if (st.fichaAba === "mun") {
    const muns = await _resCarregar(RES_ANO_APURADO, "municipios");
    const nomeDe = (k) => (muns && muns.municipios[k] && muns.municipios[k].nome) || k;
    let linhas = Object.entries(c.municipios).map(([k, v]) => ({ k, nome: nomeDe(k), v, v0: a ? (a.municipios[k] || 0) : null }));
    linhas.sort((x, y) => (ordem === "desc" ? 1 : -1) * (y.v - x.v));
    corpo = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Município</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>` + linhas.slice(0, 40).map((l, i) => `<div class="pc-lin pc-lin-pos clic" data-fmun="${l.k}"><span class="i">${i + 1}º</span><span class="n">${_resNomeMun(l.nome)}</span><span class="c">${_resChipPos(_resPosicao(cands, l.k, l.v, (x, k) => x.municipios[k]))}</span><span class="v">${_resFmt(l.v)}</span><span class="v p">${_resPctTotal(l.v, c.total)}</span></div>`).join("") + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} municípios (use a busca do mapa)</div>` : "");
  } else if (st.fichaAba === "sec") {
    // Mesma navegação do mapa (Zonas · Bairros · Locais · Seções), pedido
    // de 28/09/2026 — reaproveita _resRenderMunDet com um estado próprio da
    // ficha, pra não mexer no município aberto no mapa.
    corpo = st.fichaMun ? `<div class="pc-mun-det" id="pcResMunDet"></div>` : `<div class="pc-sub" style="padding:8px 0;">Toque num município na aba "Municípios" pra ver zonas, bairros, colégios e seções.</div>`;
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
  if (st.fichaAba === "sec" && st.fichaMun) {
    const muns = await _resCarregar(RES_ANO_APURADO, "municipios");
    const nome = (muns && muns.municipios[st.fichaMun] && muns.municipios[st.fichaMun].nome) || st.fichaMun;
    st._fichaDet = st._fichaDet || {};
    const fd = st._fichaDet;
    if (fd.munSel !== st.fichaMun) { fd.munSel = st.fichaMun; fd.munAba = "bairros"; fd.munFiltro = null; }
    fd.semHist = true; if (fd.munAba === "hist") fd.munAba = "bairros";
    const usa22 = st.anoApurado >= 2026 && !Object.keys(c.municipios || {}).length && ctx.antDe(c);
    _resRenderMunDet({ ...ctx, st: fd, cenario: usa22 ? ctx.antDe(c) : c, anoDet: usa22 ? RES_ANO_ANTERIOR : null, rank: a ? { ctx, c, a, st, rerender: () => _resRenderFicha(ctx) } : null }, { x: { m: { chave: st.fichaMun, nome: _resNomeMun(nome) } } }, null);
  }
  alvo.querySelectorAll("[data-fa]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.fichaAba = x.dataset.fa; _resRenderFicha(ctx); }));
  alvo.querySelectorAll("[data-ficha-fav]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); _resToggleFav(b.dataset.fichaFav); ctx.favs = _resFavoritos(); const on = ctx.favs.has(b.dataset.fichaFav); b.classList.toggle("on", on); b.style.color = on ? "#C6E62A" : ""; b.style.borderColor = on ? "rgba(198,230,42,.5)" : ""; b.title = on ? "Remover dos favoritos" : "Favoritar"; }));
  if (!arv) alvo.querySelectorAll("[data-fmun]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.fichaMun = x.dataset.fmun; st.fichaAba = "sec"; _resRenderFicha(ctx); }));
  if (arv && st.fichaAba === "mun") _resArvLigar(alvo, st, () => _resRenderFicha(ctx));
  _resLigarDropdowns(alvo, (id, it) => { if (id === "pcResFichaOrd") { st.fichaOrdem = it.dataset.o; _resRenderFicha(ctx); } });
  alvo.addEventListener("click", (e) => e.stopPropagation());
}

// ---------- árvore da ficha (2026 × 2022), aprovada 29/09/2026 ----------
const RES_ARV_ORDENS = [["d26", "Maior 2026"], ["a26", "Menor 2026"], ["d22", "Maior 2022"], ["a22", "Menor 2022"], ["cresc", "Maior crescimento"], ["perda", "Maior perda"]];
const RES_IC_LISTA = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><circle cx="2.3" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="2.3" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="2.3" cy="12" r=".9" fill="currentColor" stroke="none"/></svg>';

function _resArvOrdenar(lista, ordem) {
  const f = {
    d26: (x, y) => (y.v26 - x.v26) || (y.v22 - x.v22), a26: (x, y) => (x.v26 - y.v26) || (x.v22 - y.v22),
    d22: (x, y) => y.v22 - x.v22, a22: (x, y) => x.v22 - y.v22,
    cresc: (x, y) => ((y.v26 - y.v22) - (x.v26 - x.v22)) || (y.v22 - x.v22),
    perda: (x, y) => ((x.v26 - x.v22) - (y.v26 - y.v22)) || (y.v22 - x.v22),
  }[ordem] || ((x, y) => y.v22 - x.v22);
  return lista.sort(f);
}

// Agrupa os votos de um número por bairro → local → seção num arquivo secoes/.
function _resArvAgrupar(sec, cargo, numero, alvo, campo) {
  const m = sec && sec[cargo] && sec[cargo][String(numero)];
  if (!m) return;
  for (const [k, v] of Object.entries(m)) {
    const b = (sec._bairroSec || {})[k] || "Sem bairro", l = (sec._secoes || {})[k] || "Local não informado";
    const nb = alvo[b] = alvo[b] || { v22: 0, v26: 0, locais: {} };
    const nl = nb.locais[l] = nb.locais[l] || { v22: 0, v26: 0, secoes: {} };
    const ns = nl.secoes[k] = nl.secoes[k] || { v22: 0, v26: 0 };
    nb[campo] += v; nl[campo] += v; ns[campo] += v;
  }
}

async function _resArvore(ctx, c, a, ordem) {
  const esc = (x) => escaparAtributoHtml(x).replace(/>/g, "&gt;");
  const { st, cargo } = ctx;
  st.arvAb = st.arvAb || {};
  const muns = await _resCarregar(RES_ANO_ANTERIOR, "municipios");
  const nomeDe = (k) => (muns && muns.municipios[k] && muns.municipios[k].nome) || k;
  const f1 = (x) => x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const temMun = Object.keys(c.municipios || {}).length > 0;
  const dif = (v26, v22, tem) => {
    if (!tem) return `<span class="d" style="color:#6B7178;">—</span>`;
    const d = v26 - v22, pc = v22 ? d / v22 * 100 : null, cor = d >= 0 ? "#34E84A" : "#E8432A";
    return `<span class="d" style="color:${cor};">${d >= 0 ? "+" : "−"}${_resFmt(Math.abs(d))}${pc === null ? "" : `<i class="pc-rf-pc">${d >= 0 ? "+" : "−"}${f1(Math.abs(pc))}%</i>`}</span>`;
  };
  const lista = async (chave, secKeys, rot) => st.arvRank === rot ? await _resArvRanking(ctx, c, a, chave, secKeys) : "";
  const linha = (nivel, id, nome, sub, v22, v26, tem, opts = {}) => {
    const aberto = !!st.arvAb[id];
    const chev = opts.folha ? "" : `<span class="pc-arv-chev${aberto ? " on" : ""}">${RES_IC_CHEV}</span>`;
    const ic = `<button type="button" class="pc-arv-lista${st.arvRank === id ? " on" : ""}" data-arv-rank="${esc(id)}" title="Votação completa neste local">${RES_IC_LISTA}</button>`;
    return `<div class="pc-lin pc-rf pc-arv n${nivel}${opts.folha ? "" : " clic"}${aberto ? " aberto" : ""}"${opts.folha ? "" : ` data-arv="${esc(id)}"`}><span class="i">${opts.pos || ""}</span><span class="n">${chev}<span class="pc-arv-nome">${nome}${sub ? `<i class="pc-loc-sub">${sub}</i>` : ""}</span>${opts.chip ? `<span class="pc-arv-pos">${_resChipPos(opts.chip)}</span>` : ""}${ic}</span><span class="v v-ant">${_resFmt(v22)}</span><span class="v v-atu">${tem ? _resFmt(v26) : "—"}</span>${dif(v26, v22, tem)}</div>`;
  };

  const chaves = [...new Set([...Object.keys(a.municipios || {}), ...Object.keys(c.municipios || {})])];
  const mlin = _resArvOrdenar(chaves.map((k) => ({ k, nome: nomeDe(k), v22: a.municipios[k] || 0, v26: (c.municipios || {})[k] || 0 })), ordem);
  const tot26 = c.total || 0, tem26 = tot26 > 0;
  const dTot = tot26 - a.total, pTot = a.total ? dTot / a.total * 100 : null, corTot = dTot >= 0 ? "#34E84A" : "#E8432A";
  let h = `<div class="pc-rf-tot">
      <div><b>${_resFmt(a.total)}</b><span>${RES_ANO_ANTERIOR}</span></div>
      <div><b>${_resFmt(tot26)}</b><span>${st.anoApurado}</span></div>
      <div>${tem26 ? `<b style="color:${corTot};">${dTot >= 0 ? "+" : "−"}${_resFmt(Math.abs(dTot))}</b><span style="color:${corTot};">${pTot === null ? "" : (dTot >= 0 ? "+" : "−") + f1(Math.abs(pTot)) + "%"}</span>` : `<b style="color:#6B7178;">—</b><span>diferença</span>`}</div>
    </div>
    <div class="pc-lin pc-rf cab"><span></span><span>Município</span><span class="v">${RES_ANO_ANTERIOR}</span><span class="v">${st.anoApurado}</span><span class="v">Dif.</span></div>`;
  const limM = st.arvMais && st.arvMais.__mun ? mlin.length : 40;
  for (const [i, l] of mlin.slice(0, limM).entries()) {
    const idM = "m|" + l.k, tem = temMun && l.v26 > 0;
    // etiqueta de posição do candidato no recorte (base 2022 até 2026 chegar por local)
    const chipM = tem ? _resPosicao(ctx.cands, l.k, l.v26, (x, k) => (x.municipios || {})[k]) : _resPosicao((ctx.ant && ctx.ant.candidatos) || [], l.k, l.v22, (x, k) => (x.municipios || {})[k]);
    h += linha(0, idM, _resNomeMun(l.nome), tem ? "" : "aguardando", l.v22, l.v26, tem, { pos: `${i + 1}º`, chip: l.v22 || tem ? chipM : null });
    h += await lista(l.k, null, idM);
    if (!st.arvAb[idM]) continue;
    const sec22 = await _resCarregar(RES_ANO_ANTERIOR, "secoes/" + _resSlug(l.k), "");
    const sec26 = await _resCarregar(RES_ANO_APURADO, "secoes/" + _resSlug(l.k), "");
    const arvore = {};
    _resArvAgrupar(sec22, cargo, a.numero, arvore, "v22");
    _resArvAgrupar(sec26, cargo, c.numero, arvore, "v26");
    const tem26L = !!(sec26 && sec26[cargo]);
    const secPos = tem26L ? sec26 : sec22, meuNum = String(tem26L ? c.numero : a.numero);
    const posEm = (keys) => {
      const m = (secPos && secPos[cargo]) || {}; const soma = (num) => keys.reduce((t, k) => t + ((m[num] || {})[k] || 0), 0);
      const eu = soma(meuNum); if (!eu) return null;
      let p = 1; for (const num in m) if (num !== meuNum && soma(num) > eu) p++;
      return p;
    };
    const bl = _resArvOrdenar(Object.entries(arvore).map(([nome, n]) => ({ nome, ...n })), ordem);
    if (!bl.length) { h += `<div class="pc-arv-vazio">Sem votação por local neste município.</div>`; continue; }
    const limB = st.arvMais && st.arvMais[idM] ? bl.length : 6;
    for (const b of bl.slice(0, limB)) {
      const idB = idM + "|" + b.nome;
      const secsB = Object.values(b.locais).flatMap((x) => Object.keys(x.secoes));
      h += linha(1, idB, esc(b.nome), "", b.v22, b.v26, tem26L, { chip: posEm(secsB) });
      h += await lista(l.k, secsB, idB);
      if (!st.arvAb[idB]) continue;
      for (const lc of _resArvOrdenar(Object.entries(b.locais).map(([nome, n]) => ({ nome, ...n })), ordem)) {
        const idL = idB + "|" + lc.nome;
        h += linha(2, idL, esc(lc.nome), "", lc.v22, lc.v26, tem26L, { chip: posEm(Object.keys(lc.secoes)) });
        h += await lista(l.k, Object.keys(lc.secoes), idL);
        if (!st.arvAb[idL]) continue;
        for (const sc of _resArvOrdenar(Object.entries(lc.secoes).map(([k, n]) => ({ k, ...n })), ordem)) {
          const [z, sn] = sc.k.split("::"), idS = idL + "|" + sc.k;
          h += linha(3, idS, `Seção ${sn}`, `${z}ª zona`, sc.v22, sc.v26, tem26L, { folha: true, chip: posEm([sc.k]) });
          h += await lista(l.k, [sc.k], idS);
        }
      }
    }
    if (st.arvMais && st.arvMais[idM] && bl.length > 6) h += `<div class="pc-arv-alca" data-arv-mais="${esc(idM)}"><span class="pega"></span><span class="rot">mostrar menos</span></div>`;
    else if (bl.length > limB) h += `<div class="pc-arv-alca" data-arv-mais="${esc(idM)}"><span class="pega"></span><span class="rot">${RES_IC_CHEV}+ ${bl.length - limB} bairros</span></div>`;
  }
  if (st.arvMais && st.arvMais.__mun && mlin.length > 40) h += `<div class="pc-arv-alca" data-arv-mais="__mun"><span class="pega"></span><span class="rot">mostrar menos</span></div>`;
  else if (mlin.length > limM) h += `<div class="pc-arv-alca" data-arv-mais="__mun"><span class="pega"></span><span class="rot">${RES_IC_CHEV}+ ${mlin.length - limM} municípios</span></div>`;
  return h;
}

// Votação completa de todos os candidatos num recorte (município inteiro, ou
// o conjunto de seções de um bairro/colégio/seção), no ano escolhido.
async function _resArvRanking(ctx, c, a, chave, secKeys) {
  const esc = (x) => escaparAtributoHtml(x).replace(/>/g, "&gt;");
  const { st, cargo } = ctx;
  const ano = st.arvRankAno === RES_ANO_APURADO ? RES_ANO_APURADO : RES_ANO_ANTERIOR;
  const eu = ano === RES_ANO_APURADO ? c : a;
  const cands = ano === RES_ANO_APURADO ? ctx.cands : ((ctx.ant && ctx.ant.candidatos) || []);
  const porNum = new Map(cands.map((x) => [String(x.numero), x]));
  const tot = new Map();
  if (!secKeys) {
    for (const x of cands) { const v = (x.municipios || {})[chave] || 0; if (v) tot.set(String(x.numero), v); }
  } else {
    const sec = await _resCarregar(ano, "secoes/" + _resSlug(chave), "");
    const ks = new Set(secKeys);
    for (const [num, m] of Object.entries((sec && sec[cargo]) || {})) {
      let v = 0; for (const k of ks) v += m[k] || 0;
      if (v && porNum.has(num)) tot.set(num, v);
    }
  }
  const soma = [...tot.values()].reduce((x, y) => x + y, 0);
  const ord = [...tot.entries()].sort((x, y) => y[1] - x[1]);
  const lim = st.arvRankTodos ? ord.length : 12;
  const chips = [RES_ANO_ANTERIOR, RES_ANO_APURADO].map((y) => `<span class="pc-sen-chip pc-arv-ano${y === ano ? " on" : ""}" data-arv-ano="${y}">${y}</span>`).join("");
  const f1 = (x) => x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const corpo = !ord.length ? `<div class="pc-arv-vazio">${ano === RES_ANO_APURADO ? `A votação de ${ano} neste local ainda não foi publicada.` : "Sem votos neste recorte."}</div>`
    : `<div class="pc-lin pc-arv-rk cab"><span></span><span>Candidato</span><span class="v">Votos</span><span class="v">%</span></div>` +
      ord.slice(0, lim).map(([num, v], i) => { const x = porNum.get(num); const sou = eu && String(eu.numero) === num;
        return `<div class="pc-lin pc-arv-rk${sou ? " eu" : ""}"><span class="i">${i + 1}º</span><span class="n">${esc(x.nomeUrna)}<i class="pc-loc-sub">${nomePartidoExibicao(x.partido)}</i></span><span class="v">${_resFmt(v)}</span><span class="v p">${soma ? f1(v / soma * 100) + "%" : ""}</span></div>`; }).join("") +
      (ord.length > lim ? `<div class="pc-arv-alca" data-arv-todos="1"><span class="pega"></span><span class="rot">${RES_IC_CHEV}+ ${ord.length - lim} candidatos</span></div>` : st.arvRankTodos && ord.length > 12 ? `<div class="pc-arv-alca" data-arv-todos="1"><span class="pega"></span><span class="rot">mostrar menos</span></div>` : "");
  return `<div class="pc-arv-painel"><div class="pc-arv-painel-cab">${chips}<span>${ord.length ? `${_resFmt(soma)} votos nominais` : ""}</span></div>${corpo}</div>`;
}

function _resArvLigar(alvo, st, rerender) {
  alvo.querySelectorAll("[data-arv]").forEach((x) => x.addEventListener("click", (e) => {
    e.stopPropagation(); const id = x.dataset.arv;
    if (st.arvAb[id]) Object.keys(st.arvAb).forEach((k) => { if (k === id || k.startsWith(id + "|")) delete st.arvAb[k]; });
    else { st.arvAb[id] = true; if (id.split("|").length === 2) st.fichaMun = id.split("|")[1]; }
    rerender();
  }));
  alvo.querySelectorAll("[data-arv-rank]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation(); const id = b.dataset.arvRank;
    st.arvRank = st.arvRank === id ? null : id; st.arvRankTodos = false; rerender();
  }));
  alvo.querySelectorAll("[data-arv-ano]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); st.arvRankAno = +b.dataset.arvAno; rerender(); }));
  alvo.querySelectorAll("[data-arv-todos]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); st.arvRankTodos = !st.arvRankTodos; rerender(); }));
  alvo.querySelectorAll("[data-arv-mais]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); st.arvMais = st.arvMais || {}; st.arvMais[b.dataset.arvMais] = !st.arvMais[b.dataset.arvMais]; rerender(); }));
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
  // Ano do mapa (28/09/2026): 2026 · 2022 · 2018, no lugar do modo Variação.
  st.modo = "votos";
  const anoSel = st.modoAno || st.anoApurado;
  const doAno = (c, y) => !c ? null : y === st.anoApurado ? c : y === st.anoAnterior ? ctx.antDe(c) : y === st.anoAnterior2 && ctx.ant2De ? ctx.ant2De(c) : null;
  const prevAno = anoSel === st.anoApurado ? st.anoAnterior : anoSel === st.anoAnterior ? st.anoAnterior2 : null;
  const baseCen = doAno(cenario, anoSel), basePrev = prevAno ? doAno(cenario, prevAno) : null;
  const candsAno = anoSel === st.anoApurado ? cands : anoSel === st.anoAnterior ? ((ctx.ant && ctx.ant.candidatos) || []) : ((ctx.ant2 && ctx.ant2.candidatos) || []);
  const cenTotal = baseCen ? baseCen.total : 0;

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
  const regTxt = st.assoc || st.regiao || "Estado";
  const cenTxt = `${cenario.nomeUrna}`;
  // Modo comparação (22/09/2026): a caixa grande do candidato virou o
  // próprio seletor (toque abre a busca); o antigo dropdown "Candidato"
  // deu lugar a "Comparar com" — escolher um 2º candidato troca a cor do
  // mapa, os totais e a lista pra ele vs o candidato principal.
  const cmp = st.cmpSq ? cands.find((c) => c.sq === st.cmpSq) : null;
  const baseCmp = cmp ? doAno(cmp, st.modoAno || st.anoApurado) : null;
  // Favoritos no topo da lista de seleção (30/09/2026): a estrela do cartão
  // alimenta este grupo, igual ao filtro de favoritos da lista de Candidatos.
  const itCand = (c, idAtivo) => `<div class="pc-dd-it${c.sq === idAtivo ? " on" : ""}" data-sq="${c.sq}">${c.nomeUrna} <small style="color:#8A9096;">${c.partido}</small></div>`;
  const listaCand = (idAtivo) => {
    const fav = ctx.modoPartido ? new Set() : _resFavoritos();
    const favs = cands.filter((c) => fav.has(c.sq));
    return (favs.length ? `<div class="pc-dd-grp">Favoritos</div>${favs.map((c) => itCand(c, idAtivo)).join("")}<div class="pc-dd-grp">Todos</div>` : "") + cands.slice(0, 40).map((c) => itCand(c, idAtivo)).join("");
  };
  corpo.innerHTML = `
    <div class="pc-dd" id="pcResCen" style="position:relative; margin-bottom:10px;">
      <button type="button" class="pc-dd-btn pc-cenario-btn">
        <div class="pc-cenario pc-cen2">
          <div class="l1">${cenario.total ? `<span class="pc-dep-pos">${cands.indexOf(cenario) + 1}º</span>` : ""}${ctx.modoPartido ? (cenario.eleitos ? `<span class="pc-sen-chip">${cenario.eleitos} eleito${cenario.eleitos > 1 ? "s" : ""}</span>` : "") : _resEtiqueta(cenario, cargo)}<span class="pc-dep-cnm-txt nm">${cenTxt}</span>${ctx.modoPartido ? "" : `<span class="vaga-estrela"></span>`}</div>
          <div class="l2"><span class="pt">${nomePartidoExibicao(cenario.partido)} <i>(${(RES_CARGOS.find((x) => x.id === cargo) || {}).label || ""})</i></span><span class="pc-cenario-dica">Selecionar ${ctx.modoPartido ? "partido" : "candidato"} ${RES_IC_CHEV}</span></div>
        </div>
      </button>
      ${ctx.modoPartido ? "" : `<button type="button" class="pc-dd-btn ico pc-cen-fav${_resFavoritos().has(cenario.sq) ? " on" : ""}" data-cen-fav="${cenario.sq}" title="${_resFavoritos().has(cenario.sq) ? "Remover dos favoritos" : "Favoritar"}" style="position:absolute; right:14px; top:12px; z-index:2;${_resFavoritos().has(cenario.sq) ? " color:#C6E62A; border-color:rgba(198,230,42,.5);" : ""}">${RES_IC_ESTRELA}</button>`}
      <div class="pc-dd-menu" style="min-width:260px;"><div style="padding:6px 8px;"><input class="cell" id="pcResCenBusca" placeholder="Buscar…" style="width:100%; margin:0;"></div><div id="pcResCenLista" style="max-height:240px; overflow:auto;">${listaCand(cenario.sq)}</div></div>
    </div>
    <div class="pc-map-filtros">
      ${_resDropdown("pcResReg", "Região", st.assoc || (st.regiao ? st.regiao.replace(" Catarinense", "") : "Estado"), `<div class="pc-dd-it${!st.regiao && !st.assoc ? " on" : ""}" data-r="">Estado</div><div class="pc-dd-grp">Mesorregiões (IBGE)</div><div class="pc-dd-grid">${meso.map((r) => `<div class="pc-dd-it${st.regiao === r ? " on" : ""}" data-r="${r}">${r.replace(" Catarinense", "")}</div>`).join("")}</div><div class="pc-dd-grp">Associações de municípios</div><div class="pc-dd-grid">${ASSOCIACOES_SC.map((x) => `<div class="pc-dd-it${st.assoc === x ? " on" : ""}" data-a="${x}">${x}</div>`).join("")}</div>`, { largura: 270 })}
      ${_resDropdown("pcResModo", "Ano", `${anoSel}`, [st.anoApurado, st.anoAnterior, st.anoAnterior2].filter(Boolean).map((y) => `<div class="pc-dd-it${anoSel === y ? " on" : ""}" data-y="${y}">${y}</div>`).join(""), { largura: 150 })}
      ${_resDropdown("pcResCmp", "Comparar", cmp ? cmp.nomeUrna : "ninguém", `<div class="pc-dd-it${!cmp ? " on" : ""}" data-sq="">Sem comparação</div><div style="padding:6px 8px;"><input class="cell" id="pcResCmpBusca" placeholder="Buscar…" style="width:100%; margin:0;"></div><div id="pcResCmpLista" style="max-height:240px; overflow:auto;">${listaCand(st.cmpSq)}</div>`, { largura: 260, direita: true })}
    </div>
    <div class="glass-card pc-mapa-card" style="padding:10px;"><div class="pc-mapa-forma"><button type="button" data-forma="cores" class="${st.mapaForma !== "bolhas" ? "on" : ""}">Cores</button><button type="button" data-forma="bolhas" class="${st.mapaForma === "bolhas" ? "on" : ""}">Bolhas</button></div>${pcState._resGeoSvg}
      <div class="pc-legmapa"><span id="pcResLegA"></span><i id="pcResLegBar"></i><span id="pcResLegB"></span></div>
    </div>
    <div class="pc-dep-tiles" id="pcResTotais" style="margin-top:10px;"></div>
    <div class="pc-ord"><span id="pcResOrdTit">Municípios</span>${_resDropdown("pcResMapaOrd", "", "", `<div class="pc-dd-it${st.ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${st.ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 130, titulo: "Ordenar" })}</div>
    <div id="pcResMapaLista"></div>
  `;

  // Favoritar direto do mapa (29/09/2026), mesma estrela da ficha
  corpo.querySelectorAll("[data-cen-fav]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); _resToggleFav(b.dataset.cenFav); ctx.favs = _resFavoritos(); const on = ctx.favs.has(b.dataset.cenFav); b.classList.toggle("on", on); b.style.color = on ? "#C6E62A" : ""; b.style.borderColor = on ? "rgba(198,230,42,.5)" : ""; b.title = on ? "Remover dos favoritos" : "Favoritar"; (ctx.rerender || renderResultados)(); }));
  const dados = {};
  MUNICIPIOS_SC_REGIOES.forEach((m) => {
    const v = baseCen ? (baseCen.municipios[m.chave] || 0) : 0;
    const v0 = basePrev ? (basePrev.municipios[m.chave] || 0) : null;
    const vc = cmp ? (baseCmp ? (baseCmp.municipios[m.chave] || 0) : 0) : null;
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
    // Formato "Bolhas" (pedido de 28/09/2026): círculo no centro de cada
    // município, área proporcional aos votos (ou à diferença, nos modos de
    // variação/comparação). Malha fica escura, só contorno.
    const bolhas = st.mapaForma === "bolhas";
    svg.classList.toggle("bolhas", bolhas);
    svg.querySelectorAll("path").forEach((p) => { const d = dados[p.dataset.ibge]; if (!d) return; p.style.fill = bolhas ? "" : cor(d); p.classList.toggle("fora", !dentro(d)); p.classList.toggle("sel", st.munSel === d.m.chave); });
    // Região em destaque (30/09/2026): borda clara na região, resto do estado
    // com blur suave em vez de quase apagado; região desenhada por cima.
    const comReg = !!(st.regiao || st.assoc);
    svg.classList.toggle("com-reg", comReg);
    if (comReg && !svg.querySelector("#pcResBlur")) svg.insertAdjacentHTML("afterbegin", `<defs><filter id="pcResBlur"><feGaussianBlur stdDeviation="0.9"/></filter></defs>`);
    if (comReg) svg.querySelectorAll("path:not(.fora)").forEach((p) => p.parentNode.appendChild(p));
    const gAnt = svg.querySelector("#pcResBolhas");
    if (gAnt) gAnt.remove();
    if (bolhas) {
      if (!pcState._resCentros) { pcState._resCentros = {}; svg.querySelectorAll("path").forEach((p) => { const b = p.getBBox(); pcState._resCentros[p.dataset.ibge] = [b.x + b.width / 2, b.y + b.height / 2]; }); }
      const val = (d) => cmp ? d.v - d.vc : st.modo === "var" ? (d.v0 === null ? 0 : d.v - d.v0) : d.v;
      const vis = Object.entries(dados).filter(([, d]) => dentro(d));
      const maxAbs = Math.max(1, ...vis.map(([, d]) => Math.abs(val(d))));
      const circ = vis.map(([ib, d]) => {
        const v = val(d); if (!v) return null;
        const c = pcState._resCentros[ib]; if (!c) return null;
        const r = Math.max(1.6, 30 * Math.sqrt(Math.abs(v) / maxAbs));
        return { r, html: `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${r.toFixed(1)}" data-ibge="${ib}" class="${v < 0 ? "neg" : ""}${st.munSel === d.m.chave ? " sel" : ""}"></circle>` };
      }).filter(Boolean).sort((a, b) => b.r - a.r);
      svg.insertAdjacentHTML("beforeend", `<g id="pcResBolhas">${circ.map((x) => x.html).join("")}</g>`);
      svg.querySelectorAll("#pcResBolhas circle").forEach((ci) => ci.addEventListener("click", () => { const d = dados[ci.dataset.ibge]; st.munSel = st.munSel === d.m.chave ? null : d.m.chave; pintar(); const s2 = document.querySelector("#pcResMapaLista .sel"); if (s2) s2.scrollIntoView({ block: "center", behavior: "smooth" }); }));
    }
    const primeiroNome = (nm) => (nm || "").split(" ")[0];
    const L = cmp ? [`${primeiroNome(cmp.nomeUrna)} venceu`, "linear-gradient(90deg,#E8432A,#2A2C2E,#34E84A)", `${primeiroNome(cenario.nomeUrna)} venceu`]
      : st.modo === "var" ? ["perdeu (−50%)", "linear-gradient(90deg,#E8432A,#2A2C2E,#34E84A)", "ganhou (+50%)"] : ["menos votos", "linear-gradient(90deg,#15191E,#34E84A)", "mais votos"];
    // Bolhas coladas no rótulo de cada lado (29/09/2026): a verde ficava longe
    // de "Napoleão venceu" e não dava pra associar.
    const lb = document.getElementById("pcResLegBar"); lb.style.background = bolhas ? "none" : L[1];
    const bol = (neg, t) => `<span class="pc-leg-bol${neg ? " neg" : ""}" style="width:${t}px;height:${t}px;"></span>`;
    const dois = bolhas && (cmp || st.modo === "var");
    document.getElementById("pcResLegA").innerHTML = dois ? `<span style="display:inline-flex;align-items:center;gap:5px;">${bol(true, 13)}${bol(true, 7)}<span>${L[0]}</span></span>` : L[0];
    document.getElementById("pcResLegB").innerHTML = dois ? `<span style="display:inline-flex;align-items:center;gap:5px;"><span>${L[2]}</span>${bol(false, 7)}${bol(false, 13)}</span>` : L[2];
    lb.innerHTML = !bolhas || dois ? "" : `${bol(false, 5)}${bol(false, 9)}${bol(false, 15)}`;
    const lista = Object.values(dados).filter(dentro);
    const key = cmp ? "v" : st.modo === "var" ? "var" : "v";
    lista.sort((x, y) => (st.ordem === "desc" ? 1 : -1) * (((y[key] === null ? -1e9 : y[key])) - ((x[key] === null ? -1e9 : x[key]))));
    const tot = lista.reduce((s, d) => s + d.v, 0), tot0 = basePrev ? lista.reduce((s, d) => s + (d.v0 || 0), 0) : null;
    document.getElementById("pcResOrdTit").textContent = "Municípios · " + (st.assoc || st.regiao || "todo o estado");
    // Estado do mapa pra impressão (documento no padrão do palpite, 28/09/2026)
    st._imp = { tipo: "mapa", cenario, cmp, lista, tot, totC: cmp ? lista.reduce((x, d) => x + d.vc, 0) : null, tot0,
      regiao: st.assoc || (st.regiao ? st.regiao.replace(" Catarinense", "") : "Estado"), modo: st.modo, bolhas: st.mapaForma === "bolhas", dados, dentro };
    if (cmp) {
      // Totais lado a lado (pedido de 22/09/2026): quem lidera ganha borda verde.
      const totC = lista.reduce((s, d) => s + d.vc, 0);
      const leadA = tot >= totC;
      document.getElementById("pcResTotais").outerHTML = `<div class="pc-cmp-tot" id="pcResTotais">
        <div class="pc-cmp-box${leadA ? " lead" : ""}"><div class="nm">${cenario.nomeUrna}</div><div class="vv${leadA ? " venceu" : ""}">${_resFmt(tot)}</div><div class="pc">${nomePartidoExibicao(cenario.partido)}</div></div>
        <div class="pc-cmp-box${!leadA ? " lead" : ""}"><div class="nm">${cmp.nomeUrna}</div><div class="vv${!leadA ? " venceu" : ""}">${_resFmt(totC)}</div><div class="pc">${nomePartidoExibicao(cmp.partido)}</div></div>
        <div class="pc-cmp-dif">Diferença · ${st.assoc || (st.regiao ? st.regiao.replace(" Catarinense", "") : "Estado")}<b>${(leadA ? cenario : cmp).nomeUrna} +${_resFmt(Math.abs(tot - totC))}</b></div>
      </div>`;
      // Os nomes dos candidatos aparecem uma vez só, no cabeçalho (pedido de
      // 22/09/2026: repetir o nome embaixo de cada voto poluía a lista); as
      // linhas ficam só com os números, e o vencedor daquele recorte em verde.
      const cabCmp = `<div class="pc-cmp-cab"><span></span><span></span><span class="stat">${cmp.nomeUrna}</span><span class="stat forte">${cenario.nomeUrna}</span><span></span></div>`;
      document.getElementById("pcResMapaLista").innerHTML = cabCmp + lista.slice(0, st.mapaTodos ? lista.length : 15).map((d, i) => { const dif = d.v - d.vc; const cenVenceu = d.v >= d.vc;
        return `<div class="pc-cmp-mun${st.munSel === d.m.chave ? " sel" : ""}" data-mun="${d.m.chave}">
          <span class="pos">${i + 1}º</span><span class="nome">${d.m.nome}</span>
          <span class="stat"><b class="${cenVenceu ? "" : "venceu"}">${_resFmt(d.vc)}</b></span>
          <span class="stat forte"><b class="${cenVenceu ? "venceu" : ""}">${_resFmt(d.v)}</b></span>
          <span class="dif">${dif >= 0 ? "+" : ""}${_resFmt(dif)}</span>
        </div>${st.munSel === d.m.chave ? `<div class="pc-cmp-det" id="pcResMunDet"></div>` : ""}`; }).join("") + (lista.length > 15 ? `<div class="pc-arv-alca" data-mapa-todos="1"><span class="pega"></span><span class="rot">${st.mapaTodos ? "mostrar menos" : `${RES_IC_CHEV}+ ${lista.length - 15} municípios`}</span></div>` : "");
    } else {
      // Proporção do recorte sobre o total do candidato (pedido de 22/09/2026):
      // "Vale do Itajaí = 30.205 · 81,8% do total".
      const pctDe = (v, base) => base ? ` · ${(v / base * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "";
      document.getElementById("pcResTotais").outerHTML = `<div class="pc-dep-tiles" id="pcResTotais" style="margin-top:10px;"><div class="pc-dep-tile ref"><span class="tv">${_resFmt(tot)}</span><span class="tr">votos ${anoSel}${pctDe(tot, cenTotal)}</span></div><div class="pc-dep-tile ref"><span class="tv">${tot0 === null ? "—" : _resFmt(tot0)}</span><span class="tr">${prevAno ? "votos " + prevAno : "—"}${tot0 === null || !basePrev ? "" : pctDe(tot0, basePrev.total)}</span></div><div class="pc-dep-tile ref"><span class="tv">${_resPctHtml(tot0 ? _resPct(tot, tot0) : null)}</span><span class="tr">variação</span></div></div>`;
      // Colunas no alinhamento da referência (Politique, aprovado 23/09/2026):
      // Pos. = colocação do candidato entre TODOS do cargo naquele município
      // (etiqueta verde do 1º ao 3º), Votos, % = fatia do total do candidato.
      const cab = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Município</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">${st.modo === "var" ? "Δ " + RES_ANO_ANTERIOR : "%"}</span></div>`;
      document.getElementById("pcResMapaLista").innerHTML = cab + lista.slice(0, st.mapaTodos ? lista.length : 15).map((d, i) => `<div class="pc-lin pc-lin-pos${st.munSel === d.m.chave ? " sel" : ""}" data-mun="${d.m.chave}"><span class="i">${i + 1}º</span><span class="n">${_resNomeMun(d.m.nome)}</span><span class="c">${_resChipPos(_resPosicao(candsAno, d.m.chave, d.v, (c, k) => c.municipios[k]))}</span><span class="v">${_resFmt(d.v)}</span><span class="v p">${st.modo === "var" ? _resPctHtml(d.var) : _resPctTotal(d.v, cenTotal)}</span></div>${st.munSel === d.m.chave ? `<div class="pc-mun-det" id="pcResMunDet"></div>` : ""}`).join("") + (lista.length > 15 ? `<div class="pc-arv-alca" data-mapa-todos="1"><span class="pega"></span><span class="rot">${st.mapaTodos ? "mostrar menos" : `${RES_IC_CHEV}+ ${lista.length - 15} municípios`}</span></div>` : "");
    }
    document.querySelectorAll("#pcResMapaLista [data-mapa-todos]").forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); st.mapaTodos = !st.mapaTodos; pintar(); }));
    document.querySelectorAll("#pcResMapaLista [data-mun]").forEach((el) => el.addEventListener("click", () => { st.munSel = st.munSel === el.dataset.mun ? null : el.dataset.mun; pintar(); }));
    if (st.munSel && !ctx.modoPartido) _resRenderMunDet(ctx, dados, cmp);
  };
  svg.querySelectorAll("path").forEach((p) => p.addEventListener("click", () => { const d = dados[p.dataset.ibge]; if (!d) return; st.munSel = st.munSel === d.m.chave ? null : d.m.chave; pintar(); const s = document.querySelector("#pcResMapaLista .pc-lin.sel"); if (s) s.scrollIntoView({ block: "center", behavior: "smooth" }); }));
  corpo.querySelectorAll("[data-forma]").forEach((b) => b.addEventListener("click", () => {
    st.mapaForma = b.dataset.forma;
    corpo.querySelectorAll("[data-forma]").forEach((x) => x.classList.toggle("on", x === b));
    pintar();
  }));
  _resLigarDropdowns(corpo, (id, it) => {
    const rot = (dd, t) => { const e = document.querySelector(`#${dd} [data-dd-txt]`); if (e) e.textContent = t; };
    if (id === "pcResModo") { st.modoAno = Number(it.dataset.y); st.munSel = null; (ctx.rerender || renderResultados)(); }
    if (id === "pcResReg") { st.regiao = it.dataset.r || ""; st.assoc = it.dataset.a || ""; st.munSel = null; rot("pcResReg", st.assoc || (st.regiao ? st.regiao.replace(" Catarinense", "") : "Estado")); pintar(); }
    if (id === "pcResMapaOrd") { st.ordem = it.dataset.o; pintar(); }
    if (id === "pcResCen") { st.cenario = it.dataset.sq; st.munSel = null; (ctx.rerender || renderResultados)(); }
    if (id === "pcResCmp") { st.cmpSq = it.dataset.sq || null; st.munSel = null; (ctx.rerender || renderResultados)(); }
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
  buscaCand("pcResCenBusca", "pcResCenLista", (sq) => { st.cenario = sq; st.munSel = null; (ctx.rerender || renderResultados)(); });
  buscaCand("pcResCmpBusca", "pcResCmpLista", (sq) => { st.cmpSq = sq || null; st.munSel = null; (ctx.rerender || renderResultados)(); });
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
  const abas = `<div class="pc-sub-abas" style="margin:6px 0 4px;"><span class="${st.munAba === "zonas" ? "on" : ""}" data-ma="zonas">Zonas</span>${cmp ? "" : `<span class="${st.munAba === "bairros" ? "on" : ""}" data-ma="bairros">Bairros</span><span class="${st.munAba === "locais" ? "on" : ""}" data-ma="locais">Locais</span>`}<span class="${st.munAba === "secoes" ? "on" : ""}" data-ma="secoes">Seções</span><span class="${cmp ? "" : (st.munAba === "hist" ? "on" : "")}" data-ma="hist" ${cmp || st.semHist ? "hidden" : ""}>Histórico</span><span style="margin-left:auto; padding:4px 0;">${_resDropdown("pcResMunOrd", "", "", `<div class="pc-dd-it${ordem === "desc" ? " on" : ""}" data-o="desc">Maior</div><div class="pc-dd-it${ordem === "asc" ? " on" : ""}" data-o="asc">Menor</div>`, { icone: RES_IC_FILTRO, direita: true, largura: 130 })}</span></div>`;
  const primeiroNome = (nm) => (nm || "").split(" ")[0];
  let corpo = "";
  if (cmp && st.munAba === "hist") st.munAba = "zonas";
  // Localidade real do TSE (22/09/2026): bairro por zona (do local mais
  // votado nela) e nome da escola por seção — vêm do MESMO arquivo de
  // seções que já carregamos (_zonas/_secoes), sem fetch a mais. Só 2022 e
  // 2018 têm; 2014 fica sem (o dataset do TSE não traz local por seção).
  // anoDet: a ficha 2026 abre o detalhe com 2022 enquanto 2026 não tem dado por local
  const anoDet = ctx.anoDet || RES_ANO_APURADO;
  const secLoc = await _resCarregar(anoDet, "secoes/" + _resSlug(chave), "");
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
  const linhaGrupo = (x, sub, tipo) => `<div class="pc-lin pc-lin-pos clic" data-filtra="${tipo}" data-valor="${escaparAtributoHtml(x.g)}"><span></span><span class="n">${_resNomeMun(x.g)}${subtit(sub)}</span><span class="c">${_resChipPos(x.pos)}</span><span class="v">${_resFmt(x.v)}</span><span class="v p">${_resPctTotal(x.v, cenario.total)}</span></div>`;
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
    const z = await _resCarregar(anoDet, cargo, "-zonas");
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
      corpo = `<div class="pc-lin pc-lin-pos cab"><span></span><span>Seção</span><span class="c">Pos.</span><span class="v">Votos</span><span class="v">%</span></div>` + linhas.slice(0, 40).map((l) => `<div class="pc-lin pc-lin-pos" data-sec="${l.z}::${l.s}"><span></span><span class="n">Seção ${l.s}${subtit(`${l.z}ª zona${F.local ? "" : " · " + (escolaDaSecao(`${l.z}::${l.s}`) || "")}`.replace(/ · $/, ""))}</span><span class="c">${_resChipPos(_resPosicao(sCands, `${l.z}::${l.s}`, l.v, (m, k) => m[k]))}</span><span class="v">${_resFmt(l.v)}</span><span class="v p">${_resPctTotal(l.v, cenario.total)}</span></div>`).join("") + (linhas.length > 40 ? `<div style="font-size:10px; color:#8A9096; padding:6px 0;">+ ${linhas.length - 40} seções</div>` : "");
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
    const pm = await _resCarregar(anoDet, "participacao");
    cabPart = _resPartHtml(pm && pm[cargo] && pm[cargo].mun[chave], d ? d.m.nome : "");
  }
  const avisoAno = ctx.anoDet && ctx.anoDet !== RES_ANO_APURADO ? `<div class="pc-rf-aviso">Votação de ${ctx.anoDet} por local. A de ${RES_ANO_APURADO} entra aqui quando o TSE publicar os dados por local.</div>` : "";
  alvo.innerHTML = avisoAno + cabPart + abas + trilho + corpo;
  // base 2022 com 2026 ainda sem dado por local: colunas viram 2022 | 2026 ("—" até o TSE publicar)
  if (avisoAno) alvo.querySelectorAll(".pc-lin.pc-lin-pos").forEach((l) => {
    const vs = l.querySelectorAll(".v");
    if (vs.length < 2) return;
    if (l.classList.contains("cab")) { vs[0].textContent = String(ctx.anoDet); vs[1].textContent = String(RES_ANO_APURADO); }
    else { vs[1].textContent = "—"; vs[1].style.color = "#6B7178"; }
  });
  // Ícone de votação completa também na aba Locais da ficha (29/09/2026):
  // zona, bairro, colégio e seção abrem o ranking de todos os candidatos.
  if (ctx.rank && secLoc) {
    const todas = Object.keys(secLoc._secoes || secLoc._bairroSec || {});
    const chavesDe = (el) => {
      if (el.dataset.sec) return [el.dataset.sec];
      const v = el.dataset.valor, t = el.dataset.filtra;
      if (t === "zona") return todas.filter((k) => k.split("::")[0] === v);
      if (t === "bairro") return todas.filter((k) => bairroDaSecao(k) === v);
      if (t === "local") return todas.filter((k) => escolaDaSecao(k) === v && (!F.bairro || bairroDaSecao(k) === F.bairro));
      return null;
    };
    const R = ctx.rank;
    for (const el of alvo.querySelectorAll(".pc-lin.pc-lin-pos:not(.cab)")) {
      const ks = chavesDe(el); if (!ks) continue;
      const id = `loc|${st.munAba}|${el.dataset.sec || el.dataset.valor}`;
      const n = el.querySelector(".n");
      n.style.cssText += "display:flex; align-items:center; gap:6px;";
      n.insertAdjacentHTML("beforeend", `<button type="button" class="pc-arv-lista${R.st.arvRank === id ? " on" : ""}" data-loc-rank="${escaparAtributoHtml(id)}" title="Votação completa neste local">${RES_IC_LISTA}</button>`);
      n.querySelector("[data-loc-rank]").addEventListener("click", (e) => { e.stopPropagation(); R.st.arvRank = R.st.arvRank === id ? null : id; R.st.arvRankTodos = false; R.rerender(); });
      if (R.st.arvRank === id) el.insertAdjacentHTML("afterend", await _resArvRanking(R.ctx, R.c, R.a, chave, ks));
    }
    alvo.querySelectorAll("[data-arv-ano]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); R.st.arvRankAno = +b.dataset.arvAno; R.rerender(); }));
    alvo.querySelectorAll("[data-arv-todos]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); R.st.arvRankTodos = !R.st.arvRankTodos; R.rerender(); }));
  }
  const proxima = { zona: "bairros", bairro: "locais", local: "secoes" };
  alvo.querySelectorAll("[data-filtra]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); F[x.dataset.filtra] = x.dataset.valor; st.munAba = proxima[x.dataset.filtra]; _resRenderMunDet(ctx, dados, cmp); }));
  alvo.querySelectorAll("[data-limpa]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); const ordemNiveis = ["zona", "bairro", "local"]; ordemNiveis.slice(ordemNiveis.indexOf(x.dataset.limpa)).forEach((n) => delete F[n]); _resRenderMunDet(ctx, dados, cmp); }));
  alvo.querySelectorAll("[data-ma]").forEach((x) => x.addEventListener("click", (e) => { e.stopPropagation(); st.munAba = x.dataset.ma; _resRenderMunDet(ctx, dados, cmp); }));
  _resLigarDropdowns(alvo, (id, it) => { if (id === "pcResMunOrd") { st.munOrdem = it.dataset.o; _resRenderMunDet(ctx, dados, cmp); } });
}


// ---------- Impressão com filtros (aprovada 29/09/2026) ----------
// Uma janela com um filtro pra cada coisa que a tela de Resultados mostra;
// o papel continua sendo o documento .di-* (mesma casca do _resDocImpresso).
const RES_IMP_TIPOS = [["atual", "Seleção atual"], ["lista", "Lista de candidatos"], ["ficha", "Ficha do candidato"], ["mapa", "Mapa"], ["partidos", "Partidos"], ["plenario", "Plenário"]];
const RES_IMP_DETALHES = [["mun", "Municípios"], ["zonas", "Zonas"], ["bairros", "Bairros"], ["colegios", "Colégios"], ["secoes", "Seções"], ["hist", "Histórico"]];
const RES_IMP_QTD = [[20, "20 primeiros"], [50, "50 primeiros"], [0, "Todos"]];

function _resImpAbrir(ctx) {
  if (!ctx) return;
  const st = ctx.st;
  const deTela = st.aba === "mapa" ? "mapa" : st.aba === "partidos" ? "partidos" : st.fichaSq ? "ficha" : "lista";
  st.imp = {
    tipo: "atual", sq: st.fichaSq || (ctx.cands[0] && ctx.cands[0].sq), cargo: ctx.cargo,
    ano: st.anoApurado >= 2026 ? "cmp" : String(st.anoApurado),
    recorte: st.fichaMun ? "mun" : (st.regiao || st.assoc) ? "regiao" : "estado",
    regiao: st.assoc || st.regiao || "", mun: st.fichaMun || "",
    det: new Set(st.fichaMun ? ["bairros", "colegios"] : ["mun"]), inc: new Set(["part"]),
    ordem: RES_ARV_ORDENS.some(([o]) => o === st.fichaOrdem) ? st.fichaOrdem : (st.anoApurado >= 2026 ? "d22" : "d26"), qtd: 0,
  };
  _resImpRender(ctx);
}

function _resImpFechar() { const m = document.getElementById("pcResImpModal"); if (m) m.remove(); }

function _resImpRender(ctx) {
  const st = ctx.st, I = st.imp;
  const esc = (x) => escaparAtributoHtml(x).replace(/>/g, "&gt;");
  const op = (grupo, val, rot, on, dis) => `<span class="pc-imp-op${on ? " on" : ""}${dis ? " dis" : ""}" data-imp="${grupo}" data-v="${esc(val)}">${rot}</span>`;
  const grp = (tit, corpo, extra = "") => `<div class="pc-imp-g"><div class="pc-imp-t">${tit}${extra}</div><div class="pc-imp-ops">${corpo}</div></div>`;
  const t = I.tipo, mun = I.recorte === "mun" && I.mun;
  const anos = t === "plenario" ? [["2026", "2026"], ["2022", "2022"], ["2018", "2018"]] : [["2026", "2026"], ["2022", "2022"], ["2018", "2018"], ["cmp", "2026 × 2022"]];
  if (t === "plenario" && I.ano === "cmp") I.ano = "2026";
  const c = ctx.cands.find((x) => x.sq === I.sq);
  const listaCands = [...ctx.cands].sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
  const munsOrd = [...MUNICIPIOS_SC_REGIOES].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const meso = [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.meso))].sort();
  const assoc = [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.assoc))].sort();
  let h = grp("O que imprimir", RES_IMP_TIPOS.map(([v, r]) => op("tipo", v, r, t === v)).join(""));
  if (t === "atual") {
    h += `<div class="pc-imp-nota">Imprime exatamente o que está na tela agora: a aba aberta (Candidatos, Mapa ou Painel), com os filtros, a região, o candidato e as camadas que estiverem abertas.</div>`;
  } else if (t === "mapa") {
    h += `<div class="pc-imp-nota">O mapa sai como está na tela agora (candidato, região, modo e cores/bolhas). Para mudar, ajuste o mapa e toque em imprimir de novo.</div>`;
  } else {
    if (t === "ficha") h += `<div class="pc-imp-g"><div class="pc-imp-t">Candidato</div><select class="pc-imp-sel" data-imp-sel="sq">${listaCands.map((x) => `<option value="${esc(x.sq)}"${x.sq === I.sq ? " selected" : ""}>${esc(x.nomeUrna)} — ${esc(nomePartidoExibicao(x.partido))}</option>`).join("")}</select>${I.cargo !== ctx.cargo ? `<div class="pc-imp-nota">O candidato é do cargo aberto na tela (${esc((RES_CARGOS.find((x) => x.id === ctx.cargo) || {}).label || "")}).</div>` : ""}</div>`;
    if (t !== "ficha") h += grp("Cargo", RES_CARGOS.map((x) => op("cargo", x.id, x.label.replace("Deputado", "Dep."), I.cargo === x.id)).join(""));
    h += grp("Ano", anos.map(([v, r]) => op("ano", v, r, I.ano === v)).join(""));
    if (t !== "plenario") {
      h += grp("Recorte", [["estado", "Estado"], ["regiao", "Região"], ["mun", "Município"]].map(([v, r]) => op("recorte", v, r, I.recorte === v)).join(""));
      if (I.recorte === "regiao") h += `<select class="pc-imp-sel" data-imp-sel="regiao"><option value="">Escolha a região</option><optgroup label="Mesorregiões (IBGE)">${meso.map((r) => `<option${I.regiao === r ? " selected" : ""}>${esc(r)}</option>`).join("")}</optgroup><optgroup label="Associações de municípios">${assoc.map((r) => `<option${I.regiao === r ? " selected" : ""}>${esc(r)}</option>`).join("")}</optgroup></select>`;
      if (I.recorte === "mun") h += `<select class="pc-imp-sel" data-imp-sel="mun"><option value="">Escolha o município</option>${munsOrd.map((m) => `<option value="${esc(m.chave)}"${I.mun === m.chave ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select>`;
    }
    if (t === "ficha") {
      h += grp("Detalhe", RES_IMP_DETALHES.map(([v, r]) => { const dis = ["bairros", "colegios", "secoes"].includes(v) && !mun; return op("det", v, r, I.det.has(v) && !dis, dis); }).join(""), mun ? "" : ` <i>bairros, colégios e seções: escolha um município</i>`);
      h += grp("Incluir", op("inc", "lista", "Lista completa de cada local", I.inc.has("lista") && mun, !mun) + op("inc", "part", "Participação (abstenção, brancos, nulos)", I.inc.has("part")));
    }
    if (t !== "plenario") {
      h += grp("Ordenar", RES_ARV_ORDENS.map(([v, r]) => op("ordem", v, r, I.ordem === v)).join(""));
      h += grp("Quantidade", RES_IMP_QTD.map(([v, r]) => op("qtd", String(v), r, I.qtd === v)).join(""));
    }
  }
  const resumo = _resImpResumo(ctx);
  const html = `<div class="pc-overlay-fade pc-imp-fundo"><div class="pc-imp-caixa">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;"><b style="font-size:15px; color:#F2F4F5;">Imprimir</b><span style="font-size:10.5px; color:#8A9096;">documento SimulaLEGIS</span></div>
    ${h}
    <div class="pc-imp-resumo">Vai imprimir: <b>${esc(resumo)}</b></div>
    <div style="display:flex; gap:8px;"><button type="button" class="ghost" data-imp-acao="fechar" style="flex:1;">Cancelar</button><button type="button" class="pc-imp-ok" data-imp-acao="ok"${resumo ? "" : " disabled"}>Imprimir</button></div>
  </div></div>`;
  let m = document.getElementById("pcResImpModal");
  if (!m) { m = document.createElement("div"); m.id = "pcResImpModal"; (document.getElementById("modoColaborativoWrap") || document.body).appendChild(m); }
  const rolagem = m.querySelector(".pc-imp-caixa") ? m.querySelector(".pc-imp-caixa").scrollTop : 0;
  m.innerHTML = html;
  m.querySelector(".pc-imp-caixa").scrollTop = rolagem;
  m.querySelectorAll("[data-imp]").forEach((b) => b.addEventListener("click", () => {
    if (b.classList.contains("dis")) return;
    const g = b.dataset.imp, v = b.dataset.v;
    if (g === "det" || g === "inc") { I[g].has(v) ? I[g].delete(v) : I[g].add(v); }
    else I[g] = g === "qtd" ? +v : v;
    _resImpRender(ctx);
  }));
  m.querySelectorAll("[data-imp-sel]").forEach((s) => s.addEventListener("change", () => { I[s.dataset.impSel] = s.value; _resImpRender(ctx); }));
  m.querySelector("[data-imp-acao=fechar]").addEventListener("click", _resImpFechar);
  m.querySelector(".pc-imp-fundo").addEventListener("click", (e) => { if (e.target.classList.contains("pc-imp-fundo")) _resImpFechar(); });
  m.querySelector("[data-imp-acao=ok]").addEventListener("click", async (e) => {
    if (I.tipo === "atual") {
      _resImpFechar();
      document.documentElement.classList.add("pc-print-tela");
      const tirar = () => { document.documentElement.classList.remove("pc-print-tela"); window.removeEventListener("afterprint", tirar); };
      window.addEventListener("afterprint", tirar);
      setTimeout(() => window.print(), 50);
      return;
    }
    e.target.textContent = "Montando…"; e.target.disabled = true;
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) { container = document.createElement("div"); container.id = "pcImpressaoConteudo"; document.body.appendChild(container); }
    try { container.innerHTML = I.tipo === "mapa" ? _resDocImpresso(st, ctx.cargo, ctx.cands) : await _resImpDocumento(ctx); }
    catch (err) { console.error("impressão", err); e.target.textContent = "Não foi possível montar"; return; }
    _resImpFechar();
    window.print();
  });
}

function _resImpAnoTxt(I) { return I.ano === "cmp" ? `${RES_ANO_APURADO} × ${RES_ANO_ANTERIOR}` : I.ano; }
function _resImpRecorteTxt(I) {
  if (I.recorte === "regiao") return I.regiao ? I.regiao.replace(" Catarinense", "") : "";
  if (I.recorte === "mun") { const m = MUNICIPIOS_SC_REGIOES.find((x) => x.chave === I.mun); return m ? m.nome : ""; }
  return "Santa Catarina";
}
function _resImpResumo(ctx) {
  const I = ctx.st.imp;
  if (I.tipo === "atual") return "a tela como está agora";
  if (I.tipo === "mapa") return "o mapa como está na tela";
  const rec = I.tipo === "plenario" ? "Santa Catarina" : _resImpRecorteTxt(I);
  if (!rec) return "";
  const cargoLbl = (RES_CARGOS.find((x) => x.id === (I.tipo === "ficha" ? ctx.cargo : I.cargo)) || {}).label || "";
  const ord = (RES_ARV_ORDENS.find(([o]) => o === I.ordem) || [])[1] || "";
  const qtd = I.qtd ? `${I.qtd} primeiros` : "todos";
  if (I.tipo === "ficha") {
    const c = ctx.cands.find((x) => x.sq === I.sq);
    const det = RES_IMP_DETALHES.filter(([v]) => I.det.has(v) && (I.recorte === "mun" || !["bairros", "colegios", "secoes"].includes(v))).map(([, r]) => r.toLowerCase());
    if (!c || !det.length) return "";
    const inc = [I.inc.has("lista") && I.recorte === "mun" ? "lista completa de cada local" : "", I.inc.has("part") ? "participação" : ""].filter(Boolean);
    return `${c.nomeUrna} · ${rec} · ${det.join(", ")} · ${_resImpAnoTxt(I)} · ${ord.toLowerCase()} · ${qtd}${inc.length ? " · com " + inc.join(" e ") : ""}`;
  }
  const nome = { lista: "Lista de candidatos", partidos: "Partidos", plenario: "Plenário (eleitos)" }[I.tipo];
  return `${nome} · ${cargoLbl} · ${rec} · ${_resImpAnoTxt(I)}${I.tipo === "plenario" ? "" : ` · ${ord.toLowerCase()} · ${qtd}`}`;
}

// Carrega a lista de candidatos de um ano/cargo; 2026 do cargo aberto usa a
// lista da tela (já mesclada com a apuração ao vivo).
async function _resImpCands(ctx, ano, cargo) {
  if (+ano === ctx.st.anoApurado && cargo === ctx.cargo) return ctx.cands;
  const d = await _resCarregar(+ano, cargo);
  return (d && d.candidatos) || [];
}

async function _resImpDocumento(ctx) {
  const st = ctx.st, I = st.imp;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[x]));
  const f1 = (x) => x.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (v, b) => b ? f1(v / b * 100) + "%" : "—";
  const cmp = I.ano === "cmp";
  const cargo = I.tipo === "ficha" ? ctx.cargo : I.cargo;
  const cargoLbl = (RES_CARGOS.find((x) => x.id === cargo) || {}).label || "";
  const regInfo = new Map(MUNICIPIOS_SC_REGIOES.map((m) => [m.chave, m]));
  const dentro = (k) => I.recorte === "estado" || (I.recorte === "mun" ? k === I.mun : (() => { const m = regInfo.get(k); return m && (m.meso === I.regiao || m.assoc === I.regiao); })());
  const somaRec = (c) => c ? Object.entries(c.municipios || {}).reduce((a, [k, v]) => a + (dentro(k) ? v : 0), 0) : 0;
  const nomeMun = (k) => { const m = regInfo.get(k); return m ? m.nome : _resNomeMun(k); };
  const limitar = (l) => I.qtd ? l.slice(0, I.qtd) : l;
  const difTxt = (v26, v22) => { const d = v26 - v22; return `${d >= 0 ? "+" : "−"}${_resFmt(Math.abs(d))}`; };
  // linha de 5 colunas do documento: pos | nome | A | B | C
  const lin = (pos, nome, a, b, cc, cls = "") => `<div class="di-rlin${cls}"><span>${pos}</span><span>${nome}</span><span>${a}</span><span>${b}</span><span>${cc}</span></div>`;
  const cabVal = (rot) => cmp ? lin("", rot, String(RES_ANO_ANTERIOR), String(RES_ANO_APURADO), "Dif.", " di-rcab") : lin("", rot, "", "Votos", "%", " di-rcab");
  const valCols = (x, base) => cmp ? [_resFmt(x.v22), x.v26 ? _resFmt(x.v26) : "—", x.v26 ? difTxt(x.v26, x.v22) : "—"] : ["", _resFmt(x.v26), pct(x.v26, base)];
  const partTxt = (P) => P && P[0] ? `<i class="di-rpart">comparecimento ${pct(P[1], P[0])} · abstenção ${pct(P[2], P[0])} · brancos/nulos ${pct(P[3] + P[4], P[1])}</i>` : "";
  const casar = (lista) => { const m = new Map(); lista.forEach((y) => { m.set(_resNorm(y.nome), y); m.set("URNA::" + _resNorm(y.nomeUrna), y); }); return (c) => c ? _resCasarEntreEleicoes(c, m, lista) : null; };
  let titulo = "", sub = "", corpo = "";
  const recTxt = _resImpRecorteTxt(I);

  if (I.tipo === "lista" || I.tipo === "partidos") {
    const a26 = cmp ? await _resImpCands(ctx, RES_ANO_APURADO, cargo) : await _resImpCands(ctx, I.ano, cargo);
    const a22 = cmp ? await _resImpCands(ctx, RES_ANO_ANTERIOR, cargo) : null;
    if (I.tipo === "lista") {
      const de22 = a22 ? casar(a22) : null;
      let linhas = a26.map((c) => { const v = I.recorte === "estado" ? c.total : somaRec(c); const o = de22 ? de22(c) : null; return { c, v26: v, v22: cmp ? (o ? (I.recorte === "estado" ? o.total : somaRec(o)) : 0) : v }; });
      if (cmp) { const ja = new Set(linhas.map((l) => l.c.sq)); a22.forEach((o) => { if (!a26.some((c) => de22(c) === o)) linhas.push({ c: o, v22: I.recorte === "estado" ? o.total : somaRec(o), v26: 0, so22: true }); }); }
      linhas = limitar(_resArvOrdenar(linhas.filter((l) => l.v22 || l.v26), I.ordem));
      const base = linhas.reduce((a, l) => a + l.v26, 0);
      titulo = `${cargoLbl} — ${esc(recTxt)}`;
      sub = `Lista de candidatos · ${_resImpAnoTxt(I)} · ${linhas.length} candidatos`;
      corpo = cabVal("Candidato") + linhas.map((l, i) => lin(`${i + 1}º`, `<b>${esc(l.c.nomeUrna)}</b> <i>${esc(nomePartidoExibicao(l.c.partido))}${l.so22 ? ` · não concorre em ${RES_ANO_APURADO}` : ""}</i>`, ...valCols(l, base))).join("");
    } else {
      const agrupa = (lista, ano) => { const fed = RES_FEDERACOES[ano] || {}; const g = {}; lista.forEach((c) => { const k = fed[c.partido] || _resPartidoAtual(c.partido); g[k] = (g[k] || 0) + (I.recorte === "estado" ? c.total : somaRec(c)); }); return g; };
      const g26 = agrupa(a26, cmp ? RES_ANO_APURADO : +I.ano), g22 = cmp ? agrupa(a22, RES_ANO_ANTERIOR) : null;
      let linhas = [...new Set([...Object.keys(g26), ...Object.keys(g22 || {})])].map((k) => ({ nome: k, v26: g26[k] || 0, v22: cmp ? (g22[k] || 0) : (g26[k] || 0) }));
      linhas = limitar(_resArvOrdenar(linhas.filter((l) => l.v22 || l.v26), I.ordem));
      const base = linhas.reduce((a, l) => a + l.v26, 0);
      titulo = `Partidos — ${cargoLbl}`;
      sub = `${esc(recTxt)} · ${_resImpAnoTxt(I)} · votos nominais somados por partido/federação${I.recorte === "estado" ? "" : " (legenda não vem por município)"}`;
      corpo = cabVal("Partido / federação") + linhas.map((l, i) => lin(`${i + 1}º`, `<b>${esc(nomePartidoExibicao(l.nome))}</b>`, ...valCols(l, base))).join("");
    }
  } else if (I.tipo === "plenario") {
    const lista = await _resImpCands(ctx, I.ano, cargo);
    const eleitos = lista.filter((c) => (c.situacao || "").toUpperCase().startsWith("ELEITO")).sort((a, b) => nomePartidoExibicao(a.partido).localeCompare(nomePartidoExibicao(b.partido), "pt-BR") || b.total - a.total);
    titulo = `Plenário — ${cargoLbl}`;
    sub = `Santa Catarina · ${I.ano} · ${eleitos.length} eleitos`;
    corpo = !eleitos.length ? `<div class="di-sub">Os eleitos de ${I.ano} aparecem aqui quando o TSE concluir a totalização.</div>`
      : lin("", "Eleito", "", "Votos", "Situação", " di-rcab") + eleitos.map((c, i) => lin(`${i + 1}`, `<b>${esc(c.nomeUrna)}</b> <i>${esc(nomePartidoExibicao(c.partido))}</i>`, "", _resFmt(c.total), esc((c.situacao || "").toLowerCase().replace("eleito ", "")))).join("");
  } else {
    // ficha
    const c = ctx.cands.find((x) => x.sq === I.sq);
    const a = ctx.antDe(c);
    const anoUnico = cmp ? null : +I.ano;
    const cUnico = anoUnico ? (anoUnico === st.anoApurado ? c : _resHistoricoDe(c, await _resImpCands(ctx, anoUnico, cargo))) : null;
    const c26 = cmp ? c : cUnico, c22 = cmp ? a : null;
    titulo = esc(c.nomeUrna) + ` <span style="font-weight:600; color:#6B7178;">— ${esc(nomePartidoExibicao(c.partido))}</span>`;
    sub = `${cargoLbl} · ${esc(recTxt)} · ${_resImpAnoTxt(I)}`;
    if (!c26 && !c22) corpo = `<div class="di-sub">Sem votação deste candidato em ${_resImpAnoTxt(I)}.</div>`;
    const anoA = cmp ? RES_ANO_APURADO : anoUnico, anoB = cmp ? RES_ANO_ANTERIOR : null;
    const partMun = await _resCarregar(anoB || anoA, "participacao");
    const partC = partMun && partMun[cargo];
    const tot = { v26: c26 ? (I.recorte === "estado" ? c26.total : somaRec(c26)) : 0, v22: cmp ? (c22 ? (I.recorte === "estado" ? c22.total : somaRec(c22)) : 0) : 0 };
    if (!cmp) tot.v22 = tot.v26;
    corpo += `<div class="di-rres"><div><b>${_resFmt(cmp ? tot.v22 : tot.v26)}</b>votos em ${cmp ? RES_ANO_ANTERIOR : anoUnico} · ${esc(recTxt)}</div>${cmp ? `<div><b>${tot.v26 ? _resFmt(tot.v26) : "—"}</b>votos em ${RES_ANO_APURADO}</div><div><b>${tot.v26 ? difTxt(tot.v26, tot.v22) : "—"}</b>diferença</div>` : `<div><b>${_resFmt(c26 ? c26.total : 0)}</b>total no estado</div>`}</div>`;
    const secao = (tit, cab, linhas) => `<div class="di-rsec">${tit}</div>${cab}${linhas || `<div class="di-sub">Sem dados neste recorte.</div>`}`;
    const base = tot.v26;
    if (I.det.has("mun")) {
      const ks = [...new Set([...Object.keys((c26 && c26.municipios) || {}), ...Object.keys((c22 && c22.municipios) || {})])].filter(dentro);
      const l = limitar(_resArvOrdenar(ks.map((k) => { const v26 = (c26 && c26.municipios[k]) || 0; return { k, v26, v22: cmp ? ((c22 && c22.municipios[k]) || 0) : v26 }; }), I.ordem));
      corpo += secao("Municípios", cabVal("Município"), l.map((x, i) => lin(`${i + 1}º`, `${esc(nomeMun(x.k))}${I.inc.has("part") && partC ? partTxt(partC.mun[x.k]) : ""}`, ...valCols(x, base))).join(""));
    }
    if (I.det.has("zonas")) {
      const z26 = c26 ? await _resCarregar(cmp ? RES_ANO_APURADO : anoUnico, cargo, "-zonas") : null;
      const z22 = cmp && c22 ? await _resCarregar(RES_ANO_ANTERIOR, cargo, "-zonas") : null;
      const m26 = (z26 && c26 && z26[c26.sq]) || {}, m22 = (z22 && c22 && z22[c22.sq]) || {};
      const ks = [...new Set([...Object.keys(m26), ...Object.keys(m22)])].filter((k) => dentro(k.split("::")[0]));
      const l = limitar(_resArvOrdenar(ks.map((k) => ({ k, v26: m26[k] || 0, v22: cmp ? (m22[k] || 0) : (m26[k] || 0) })), I.ordem));
      corpo += secao("Zonas eleitorais", cabVal("Zona"), l.map((x, i) => { const [mk, z] = x.k.split("::"); return lin(`${i + 1}º`, `${z}ª zona · ${esc(nomeMun(mk))}${I.inc.has("part") && partC ? partTxt(partC.zona[x.k]) : ""}`, ...valCols(x, base)); }).join(""));
    }
    const mun = I.recorte === "mun" && I.mun;
    if (mun && ["bairros", "colegios", "secoes"].some((d) => I.det.has(d))) {
      const anoSec = cmp ? RES_ANO_ANTERIOR : anoUnico;
      const secB = await _resCarregar(anoSec, "secoes/" + _resSlug(I.mun), "");
      const secA = cmp ? await _resCarregar(RES_ANO_APURADO, "secoes/" + _resSlug(I.mun), "") : null;
      const arv = {};
      _resArvAgrupar(secB, cargo, (cmp ? c22 : c26 || {}).numero, arv, "v22");
      if (cmp) _resArvAgrupar(secA, cargo, c26.numero, arv, "v26"); else Object.values(arv).forEach((b) => { b.v26 = b.v22; Object.values(b.locais).forEach((l) => { l.v26 = l.v22; Object.values(l.secoes).forEach((s) => { s.v26 = s.v22; }); }); });
      const partSec = (secB && secB._part && secB._part[cargo]) || {};
      const somaPart = (keys) => { const P = [0, 0, 0, 0, 0, 0]; let tem = false; keys.forEach((k) => { const x = partSec[k]; if (x) { tem = true; x.forEach((v, j) => { P[j] += v; }); } }); return tem ? P : null; };
      // lista completa (todos os candidatos) de um conjunto de seções, ano base
      const listaAno = await _resImpCands(ctx, anoSec, cargo);
      const porNum = new Map(listaAno.map((x) => [String(x.numero), x]));
      const eu = String((cmp ? c22 : c26 || {}).numero || "");
      const rank = (keys) => {
        const t = new Map(), ks = new Set(keys);
        for (const [num, m] of Object.entries((secB && secB[cargo]) || {})) { let v = 0; for (const k of ks) v += m[k] || 0; if (v && porNum.has(num)) t.set(num, v); }
        const soma = [...t.values()].reduce((x, y) => x + y, 0);
        return `<div class="di-rlista">${[...t.entries()].sort((x, y) => y[1] - x[1]).map(([num, v], i) => `<span class="${num === eu ? "eu" : ""}">${i + 1}º ${esc(porNum.get(num).nomeUrna)} (${esc(nomePartidoExibicao(porNum.get(num).partido))}) ${_resFmt(v)} · ${pct(v, soma)}</span>`).join("")}</div>`;
      };
      const extras = (keys) => `${I.inc.has("part") ? partTxt(somaPart(keys)) : ""}`;
      const posLista = (keys) => I.inc.has("lista") ? rank(keys) : "";
      const bl = limitar(_resArvOrdenar(Object.entries(arv).map(([nome, n]) => ({ nome, ...n })), I.ordem));
      const secKeysB = (b) => Object.values(b.locais).flatMap((x) => Object.keys(x.secoes));
      if (I.det.has("bairros")) corpo += secao(`Bairros · ${esc(nomeMun(I.mun))}`, cabVal("Bairro"), bl.map((b, i) => lin(`${i + 1}º`, `${esc(b.nome)}${extras(secKeysB(b))}`, ...valCols(b, base)) + (I.det.has("colegios") ? "" : posLista(secKeysB(b)))).join(""));
      if (I.det.has("colegios")) {
        const cl = limitar(_resArvOrdenar(Object.entries(arv).flatMap(([bn, b]) => Object.entries(b.locais).map(([nome, n]) => ({ nome, bairro: bn, ...n }))), I.ordem));
        corpo += secao(`Colégios · ${esc(nomeMun(I.mun))}`, cabVal("Local de votação"), cl.map((l, i) => lin(`${i + 1}º`, `${esc(l.nome)} <i>${esc(l.bairro)}</i>${extras(Object.keys(l.secoes))}`, ...valCols(l, base)) + posLista(Object.keys(l.secoes))).join(""));
      }
      if (I.det.has("secoes")) {
        const sl = limitar(_resArvOrdenar(Object.values(arv).flatMap((b) => Object.values(b.locais).flatMap((l) => Object.entries(l.secoes).map(([k, n]) => ({ k, ...n })))), I.ordem));
        const nomeLocal = (k) => (secB && secB._secoes && secB._secoes[k]) || "";
        corpo += secao(`Seções · ${esc(nomeMun(I.mun))}`, cabVal("Seção"), sl.map((s, i) => { const [z, n] = s.k.split("::"); return lin(`${i + 1}º`, `Seção ${n} · ${z}ª zona <i>${esc(nomeLocal(s.k))}</i>${extras([s.k])}`, ...valCols(s, base)) + (I.inc.has("lista") && !I.det.has("colegios") ? rank([s.k]) : ""); }).join(""));
      }
      if (cmp) corpo += `<div class="di-sub">Bairros, colégios e seções: a votação de ${RES_ANO_APURADO} por local entra quando o TSE publicar os dados por seção.</div>`;
    }
    if (I.det.has("hist")) {
      const hist = [];
      for (const ano of [RES_ANO_APURADO, ...RES_ANOS_HISTORICO]) { const d = ano === st.anoApurado ? { candidatos: ctx.cands } : await _resCarregar(ano, cargo); const x = d && (ano === st.anoApurado ? c : _resHistoricoDe(c, d.candidatos)); hist.push({ ano, x }); }
      corpo += secao("Histórico", lin("", "Eleição", "", "Votos", "Situação", " di-rcab"), hist.map((h) => lin("", String(h.ano), "", h.x && h.x.total ? _resFmt(h.x.total) : "—", h.x ? esc((h.x.situacao || (h.ano === RES_ANO_APURADO ? "em apuração" : "")).toLowerCase()) : "não concorreu")).join(""));
    }
  }
  return _resDocCasca(titulo, sub, corpo, st.anoApurado);
}

function _resDocCasca(titulo, sub, corpo, ano) {
  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-BR"), horaTxt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `
    <div class="di-agua"><span><b>Simula</b>LEGIS</span></div>
    <div class="di-conteudo">
      <div class="di-cab">
        <div class="di-marca"><div class="di-wm"><b>Simula</b><span>LEGIS</span></div><div class="di-wmsub">Simulador Eleitoral Legislativo 2026</div></div>
        <div class="di-meta"><b>Santa Catarina</b> · Apuração ${ano}<br>gerado em ${dataTxt} · ${horaTxt}</div>
      </div>
      <div class="di-regra"></div>
      <div class="di-tit">${titulo}</div>
      <div class="di-sub">${sub}</div>
      ${corpo}
      <div class="di-sub" style="margin-top:12px;">Dados oficiais do TSE. Jogo de palpites entre participantes — não é pesquisa eleitoral.</div>
      <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dataTxt} ${horaTxt}</span></div>
    </div>`;
}


// ---------- aba Painel (aprovada 01/10/2026) ----------
// O usuário fixa candidatos e recortes (estado, região, município, bairro,
// colégio, seção) e acompanha 2022 × 2026 e o andamento da apuração.
// Fica salvo neste aparelho (localStorage), por cargo.
const RES_PAINEL_CHAVE = "simulalegis_painel_v1";
// Com conta: também vai pra tabela painel_resultados (migração 57) e acompanha
// o usuário em qualquer aparelho; vale o mais recente (_ts).
function _resPainelChave() { return RES_PAINEL_CHAVE + ((pcState.perfil && pcState.perfil.id) ? "-" + pcState.perfil.id : ""); }
function _resPainelLer() { try { return JSON.parse(localStorage.getItem(_resPainelChave())) || JSON.parse(localStorage.getItem(RES_PAINEL_CHAVE)) || {}; } catch (e) { return {}; } }
function _resPainelGravar(d) {
  d._ts = Date.now();
  try { localStorage.setItem(_resPainelChave(), JSON.stringify(d)); } catch (e) { /* sem armazenamento: painel vale só nesta visita */ }
  const id = pcState.perfil && pcState.perfil.id;
  if (id && typeof painelResultadosSalvar === "function") { clearTimeout(pcState._pnNuvemT); pcState._pnNuvemT = setTimeout(() => painelResultadosSalvar(id, d), 800); }
}
async function _resPainelSincronizar() {
  const id = pcState.perfil && pcState.perfil.id;
  if (!id || pcState._pnSinc === id || typeof painelResultadosCarregar !== "function") return;
  pcState._pnSinc = id;
  const nuvem = await painelResultadosCarregar(id);
  const local = _resPainelLer();
  if (nuvem && nuvem.dados && (nuvem.dados._ts || 0) > (local._ts || 0)) { try { localStorage.setItem(_resPainelChave(), JSON.stringify(nuvem.dados)); } catch (e) { /* ok */ } }
  else if (Object.keys(local).some((k) => !k.startsWith("_"))) painelResultadosSalvar(id, local);
}

// votos de um candidato num quadro; sec = arquivo secoes/ do município (ou null)
function _resPainelVotos(c, q, sec, cargo) {
  if (!c) return 0;
  if (q.tipo === "estado") return c.total || 0;
  if (q.tipo === "regiao") return MUNICIPIOS_SC_REGIOES.filter((m) => m.meso === q.chave || m.assoc === q.chave).reduce((t, m) => t + ((c.municipios || {})[m.chave] || 0), 0);
  if (q.tipo === "mun") return (c.municipios || {})[q.mun] || 0;
  const m = sec && sec[cargo] && sec[cargo][String(c.numero)];
  if (!m) return 0;
  return Object.entries(m).reduce((t, [k, v]) => t + (_resPainelNaSecao(sec, q, k) ? v : 0), 0);
}
function _resPainelNaSecao(sec, q, k) {
  if (q.tipo === "bairro") return (sec._bairroSec || {})[k] === q.chave;
  if (q.tipo === "local") return (sec._secoes || {})[k] === q.chave;
  if (q.tipo === "secao") return k === q.chave;
  return false;
}
// posição do candidato no recorte entre todos os candidatos da lista
function _resPainelPos(lista, c, q, sec, cargo) {
  const eu = _resPainelVotos(c, q, sec, cargo);
  if (!eu) return null;
  let p = 1;
  for (const x of lista) if (x !== c && String(x.numero) !== String(c.numero) && _resPainelVotos(x, q, sec, cargo) > eu) p++;
  return p;
}

async function _resRenderPainel(ctx) {
  const { st, cargo, cands } = ctx;
  const corpo = document.getElementById("pcResCorpo");
  const esc = (x) => escaparAtributoHtml(x).replace(/>/g, "&gt;");
  await _resPainelSincronizar();
  const dados = _resPainelLer();
  const blocos = dados[cargo] = dados[cargo] || [];
  dados._ativa = dados._ativa || {};
  if (st.pnAbrirNum) {
    const c0 = cands.find((x) => String(x.numero) === String(st.pnAbrirNum));
    if (c0) { if (!blocos.some((b) => b.sq === c0.sq)) blocos.push({ sq: c0.sq, numero: c0.numero, quadros: [{ tipo: "estado", rotulo: "Estado" }] }); dados._ativa[cargo] = c0.sq; _resPainelGravar(dados); }
    st.pnAbrirNum = null;
  }
  if (!blocos.some((b) => b.sq === dados._ativa[cargo])) dados._ativa[cargo] = blocos[0] ? blocos[0].sq : null;
  // camadas abertas também ficam salvas (voltam abertas ao reabrir o app)
  dados._aberto = dados._aberto || {};
  st.pnAberto = dados._aberto[cargo] = dados._aberto[cargo] || {};
  const meta = pcState._resMeta;
  const pctEst = meta && meta.pctSecoes != null ? Number(meta.pctSecoes) : 0;
  const lista22 = (ctx.ant && ctx.ant.candidatos) || [];
  const f1 = (x) => x.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const cargoLbl = (RES_CARGOS.find((x) => x.id === cargo) || {}).label || "";
  const barra = (pct, cls = "") => `<div class="pn-ap${cls}"><span>Apurado</span><i><em style="width:${pct == null ? 0 : Math.min(100, pct)}%"></em></i><b>${pct == null ? "—" : f1(pct) + "%"}</b></div>`;
  const secCache = {};
  const sec = async (ano, mun) => { const k = ano + mun; if (!(k in secCache)) secCache[k] = mun ? await _resCarregar(ano, "secoes/" + _resSlug(mun), "") : null; return secCache[k]; };

  const tile = async (c, a, q, idx, bi, sub, path) => {
    const s26 = await sec(RES_ANO_APURADO, q.mun), s22 = await sec(RES_ANO_ANTERIOR, q.mun);
    const local = ["bairro", "local", "secao"].includes(q.tipo);
    const v26 = _resPainelVotos(c, q, s26, cargo), v22 = _resPainelVotos(a, q, s22, cargo);
    const tem26 = v26 > 0;
    const pos = tem26 ? _resPainelPos(cands, c, q, s26, cargo) : (a ? _resPainelPos(lista22, a, q, s22, cargo) : null);
    const pct = q.tipo === "estado" ? pctEst : await _resPctRecorte(q, meta, cargo);
    const tipoTxt = { estado: "Santa Catarina", regiao: "região", mun: "município", bairro: "bairro · " + _resNomeMun(_resPainelNomeMun(q.mun)), local: "colégio · " + _resNomeMun(_resPainelNomeMun(q.mun)), secao: (q.chave || "").split("::")[0] + "ª zona · " + _resNomeMun(_resPainelNomeMun(q.mun)) }[q.tipo];
    const id = `${bi}|${idx}`;
    const aberto = sub ? !!st.pnAberto[path] : st.pnAberto[id];
    const abre = !sub && ["regiao", "mun", "bairro", "local"].includes(q.tipo);
    return `<div class="pn-tile${aberto ? " aberto" : ""}${sub ? " sub" : ""}" ${sub ? `data-pn-b="${bi}"${q.tipo !== "secao" ? ` data-pn-subabre="${esc(path)}"` : ""}` : `data-pn-q="${idx}" data-pn-b="${bi}"${abre ? ` data-pn-abre="${id}"` : ""}`}>
      ${!sub && st.pnModo === "del" ? `<button type="button" class="pn-rm" data-pn-rm="${bi}|${idx}" title="Remover ${esc(q.rotulo)} do painel">${iconeSvg("lixeira", 12)}</button>` : pos ? `<span class="pn-pos">${_resChipPos(pos)}</span>` : ""}
      <div class="pn-t1">${sub || st.pnModo === "del" ? "" : `<span class="pn-h" data-pn-arrasta title="Arraste para reorganizar"><svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="11" r="1.2"/><circle cx="7" cy="11" r="1.2"/></svg></span>`}<b>${esc(q.rotulo)}</b></div><div class="pn-tipo"><span>${tipoTxt}</span></div>
      <div class="pn-l"><span>${RES_ANO_ANTERIOR}</span><b>${a ? _resFmt(v22) : "—"}</b></div>
      <div class="pn-l"><span>${RES_ANO_APURADO}</span><b class="${tem26 ? "" : "z"}">${tem26 ? _resFmt(v26) : "—"}</b></div>
      ${barra(pct)}
    </div>`;
  };
  // subpasta: filhos de um quadro aberto (bairros do município, colégios do bairro, seções do colégio)
  const filhos = async (c, a, q) => {
    // região abre todos os municípios dela (04/10/2026), mais votados primeiro
    if (q.tipo === "regiao") return MUNICIPIOS_SC_REGIOES.filter((m) => m.meso === q.chave || m.assoc === q.chave)
      .map((m) => { const f = { tipo: "mun", mun: m.chave, rotulo: _resNomeMun(m.nome) }; return { f, v: ((c.municipios || {})[m.chave] || 0) + ((a && a.municipios || {})[m.chave] || 0) }; })
      .sort((x, y) => y.v - x.v).map((x) => x.f);
    const s22 = await sec(RES_ANO_ANTERIOR, q.mun), s26 = await sec(RES_ANO_APURADO, q.mun);
    const base = s26 && s26[cargo] ? s26 : s22;
    if (!base) return [];
    const ks = Object.keys(base._secoes || {}).filter((k) => q.tipo === "mun" || _resPainelNaSecao(base, q, k));
    const grupos = {};
    ks.forEach((k) => {
      const nome = q.tipo === "mun" ? (base._bairroSec || {})[k] : q.tipo === "bairro" ? (base._secoes || {})[k] : k;
      if (nome) grupos[nome] = true;
    });
    const tipoF = q.tipo === "mun" ? "bairro" : q.tipo === "bairro" ? "local" : "secao";
    const arr = Object.keys(grupos).map((nome) => { const f = { tipo: tipoF, mun: q.mun, chave: nome, rotulo: tipoF === "secao" ? `Seção ${nome.split("::")[1]}` : nome }; return { f, v: _resPainelVotos(a, f, s22, cargo) + _resPainelVotos(c, f, s26, cargo) }; });
    return arr.sort((x, y) => y.v - x.v).map((x) => x.f);
  };

  // subpasta em camadas: tocar num item abre o nível de baixo dentro dela;
  // o "+" do item fixa no painel (01/10/2026)
  // subpasta em linhas (aprovado 01/10/2026): linha 1 nome + posição,
  // linha 2 2022 · 2026 · apurado; tocar abre/fecha o nível de baixo
  const linha = async (c, a, q, path, nivel) => {
    const s26 = await sec(RES_ANO_APURADO, q.mun), s22 = await sec(RES_ANO_ANTERIOR, q.mun);
    const v26 = _resPainelVotos(c, q, s26, cargo), v22 = _resPainelVotos(a, q, s22, cargo), tem26 = v26 > 0;
    const pos = tem26 ? _resPainelPos(cands, c, q, s26, cargo) : (a ? _resPainelPos(lista22, a, q, s22, cargo) : null);
    const folha = q.tipo === "secao", aberto = !!st.pnAberto[path];
    const sub = q.tipo === "local" ? "colégio" : q.tipo === "secao" ? (q.chave || "").split("::")[0] + "ª zona" : "";
    return `<div class="pn-ln n${nivel}${aberto ? " on" : ""}"${folha ? "" : ` data-pn-subabre="${esc(path)}"`}>
      <div class="l1"><span class="ch${aberto ? " on" : ""}">${folha ? "" : RES_IC_CHEV}</span><span class="nm"><b>${esc(q.rotulo)}</b>${sub ? `<i>${sub}</i>` : ""}</span><span class="ps">${pos ? _resChipPos(pos) : ""}</span></div>
      <div class="l2"><span><em>${RES_ANO_ANTERIOR}</em><b>${a ? _resFmt(v22) : "—"}</b></span><span><em>${RES_ANO_APURADO}</em><b class="${tem26 ? "" : "z"}">${tem26 ? _resFmt(v26) : "—"}</b></span>${(() => { if (!tem26 || !a) return `<span class="df z">—</span>`; const d = v26 - v22, pc = v22 ? d / v22 * 100 : null, cor = d >= 0 ? "#34E84A" : "#E8432A"; return `<span class="df" style="color:${cor};">${d >= 0 ? "+" : "−"}${_resFmt(Math.abs(d))}${pc === null ? "" : `<small>${d >= 0 ? "+" : "−"}${Math.abs(pc).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small>`}</span>`; })()}${await (async () => { const pq = await _resPctRecorte(q, meta, cargo); return `<span class="ap"><i><u style="width:${pq == null ? 0 : Math.min(100, pq)}%"></u></i><small>${pq == null ? "—" : pq.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"}</small></span>`; })()}</div>
    </div>`;
  };
  const subpasta = async (c, a, q, path, bi, nivel) => {
    const fs = await filhos(c, a, q);
    const lim = st.pnAberto[path + "|todos"] ? fs.length : 8;
    const nomeF = { regiao: "municípios", mun: "bairros", bairro: "colégios", local: "seções" }[q.tipo];
    let out = "", grade = "";
    const quadros = dados._formato === "quadros";
    for (const f of fs.slice(0, lim)) {
      const p2 = path + "|" + f.tipo + ":" + (f.chave || f.mun);
      if (quadros) {
        grade += await tile(c, a, f, -1, bi, true, p2);
        if (st.pnAberto[p2]) { out += `<div class="pn-grid sm">${grade}</div>` + `<div class="pn-sub">${await subpasta(c, a, f, p2, bi, nivel + 1)}</div>`; grade = ""; }
      } else {
        out += await linha(c, a, f, p2, nivel);
        if (st.pnAberto[p2]) out += await subpasta(c, a, f, p2, bi, nivel + 1);
      }
    }
    if (grade) out += `<div class="pn-grid sm">${grade}</div>`;
    const alca = fs.length > 8 ? `<div class="pc-arv-alca" data-pn-todos="${esc(path)}"><span class="pega"></span><span class="rot">${st.pnAberto[path + "|todos"] ? "mostrar menos" : `${RES_IC_CHEV}+ ${fs.length - 8} ${nomeF}`}</span></div>` : "";
    if (nivel > 0) return out + alca;
    return `<div class="pn-sub"><div class="pn-sub-t">${esc(q.rotulo)} · ${nomeF}<span>toque para abrir ou fechar</span></div>${fs.length ? out : `<div class="pc-sub" style="padding:6px 0;">Sem votação por local aqui.</div>`}${alca}</div>`;
  };

  let h = "";
  for (const [bi, bl] of blocos.entries()) {
    if (bl.sq !== dados._ativa[cargo]) continue;
    const c = cands.find((x) => x.sq === bl.sq) || cands.find((x) => String(x.numero) === String(bl.numero));
    if (!c) continue;
    const a = ctx.antDe(c);
    const fav = _resFavoritos().has(c.sq);
    h += `<div class="pn-cand" data-pn-bloco="${bi}">
      <div class="pn-ch"><div style="flex:1; min-width:0;"><div class="pn-nm">${esc(c.nomeUrna)}</div><div class="pn-pt">${esc(nomePartidoExibicao(c.partido))} <i>(${cargoLbl})</i> · nº ${esc(c.numero)}</div></div><span class="pn-ibs"><a class="pc-dd-btn ico" href="?painel=${esc(c.numero)}&cargo=${cargo}" target="_blank" rel="noopener" title="Abrir ${esc(c.nomeUrna)} em nova aba do navegador" data-pn-novaaba="1"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h4v4M13 3L7.5 8.5M11.5 9.5v3a1 1 0 01-1 1h-7a1 1 0 01-1-1v-7a1 1 0 011-1h3"/></svg></a><button type="button" class="pc-dd-btn ico" data-pn-fav="${c.sq}" title="${fav ? "Remover dos favoritos" : "Favoritar"}" style="flex:none;${fav ? " color:#C6E62A; border-color:rgba(198,230,42,.5);" : ""}">${RES_IC_ESTRELA}</button><button type="button" class="pc-dd-btn ico${st.pnLocal === bi ? " on" : ""}" data-pn-local="${bi}" title="Adicionar local para ${esc(c.nomeUrna)}" style="flex:none;">${iconeSvg("mais", 14)}</button></span></div>
      ${st.pnLocal === bi ? await _resPainelLocalHtml(ctx, c, a) : ""}
      <div class="pn-resumo"><div><span>${RES_ANO_ANTERIOR}</span><b>${a ? _resFmt(a.total) : "—"}</b></div><div><span>${RES_ANO_APURADO}</span><b class="${c.total ? "" : "z"}">${c.total ? _resFmt(c.total) : "—"}</b></div></div>
      ${barra(pctEst, " pn-ap-g")}
      <div class="pn-grid">`;
    let grade = "";
    for (const [qi, q] of bl.quadros.entries()) {
      grade += await tile(c, a, q, qi, bi, false);
      const id = `${bi}|${qi}`;
      if (st.pnAberto[id]) {
        h += grade + `</div>` + await subpasta(c, a, q, id, bi, 0) + `<div class="pn-grid">`;
        grade = "";
      }
    }
    h += grade + `</div>${st.pnModo === "del" ? `<button type="button" class="pn-rm-c" data-pn-rm-c="${bi}">remover candidato do painel</button>` : ""}
    </div>`;
  }
  // barra: "+" abre candidato + filtro (o último candidato fica escolhido); lixeira abre a exclusão
  const barraTopo = `<div class="pn-barra"><span>${blocos.length ? `${blocos.length} candidato${blocos.length > 1 ? "s" : ""} no painel` : "Painel vazio"}</span><span class="pn-fmt"><button type="button" class="${dados._formato !== "quadros" ? "on" : ""}" data-pn-fmt="linhas" title="Locais em linhas"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M3 8h10M3 12h10"/></svg></button><button type="button" class="${dados._formato === "quadros" ? "on" : ""}" data-pn-fmt="quadros" title="Locais em quadros"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/></svg></button></span><button type="button" class="pc-dd-btn ico${st.pnModo === "del" ? " on" : ""}" data-pn-modo="del" title="Excluir do painel"${blocos.length ? "" : " disabled"}>${iconeSvg("lixeira", 15)}</button></div>`;
  let painelAcao = "";
  if (st.pnModo === "add") painelAcao = await _resPainelFormHtml(st, cargo, cands, "cand");
  if (st.pnModo === "del") painelAcao = `<div class="pn-del-barra"><span>Toque na lixeira do quadro que quer tirar do painel.</span><button type="button" class="pn-del-tudo${st.pnConfTudo ? " conf" : ""}" data-pn-tudo="1">${st.pnConfTudo ? "Confirmar: remover tudo" : "Remover tudo"}</button></div>`;
  if (!blocos.length && !st.pnModo) h = `<div class="pc-sub" style="padding:4px 2px 12px;">Toque em + para escolher um candidato e o local que quer acompanhar. ${pcState.perfil ? "O painel fica salvo na sua conta." : "O painel fica salvo neste aparelho; entre na sua conta para levá-lo a qualquer aparelho."}</div>`;
  const abas = `<div class="pn-tabs">${blocos.map((b) => { const c = cands.find((x) => x.sq === b.sq); if (!c) return ""; const on = b.sq === dados._ativa[cargo]; return `<a class="${on ? "on" : ""}" href="?painel=${esc(c.numero)}&cargo=${cargo}" data-pn-aba="${esc(b.sq)}" title="${esc(c.nomeUrna)}"><span>${esc(c.nomeUrna.split(" ")[0])}</span>${on ? "<i></i>" : ""}</a>`; }).join("")}<button type="button" class="mais${st.pnModo === "add" ? " on" : ""}" data-pn-modo="add" title="Adicionar candidato">${iconeSvg("mais", 14)}</button></div>`;
  h = barraTopo + abas + painelAcao + h;
  corpo.innerHTML = h;
  _resPainelLigar(ctx, corpo, dados);
}

// Escolher local (aprovado 01/10/2026): menu "Local" + "Município" no padrão
// do app e uma lista sempre visível, pesquisável e selecionável, ordenada
// pelos votos do candidato (2026 quando houver, senão 2022).
async function _resPainelOpcoes(ctx, c, a, F) {
  const cargo = ctx.cargo, vt = (q, s26, s22) => _resPainelVotos(c, q, s26, cargo) || _resPainelVotos(a, q, s22, cargo);
  if (F.tipo === "regiao") {
    const nomes = [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.meso))].sort().concat([...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.assoc))].sort());
    return nomes.map((n) => { const q = { tipo: "regiao", chave: n, rotulo: n.replace(" Catarinense", "") }; return { q, sub: MUNICIPIOS_SC_REGIOES.some((m) => m.meso === n) ? "mesorregião (IBGE)" : "associação de municípios", v: vt(q) }; }).sort((x, y) => y.v - x.v);
  }
  if (F.tipo === "mun") return _resPainelMuns(c, a);
  if (!F.mun) return [];
  const s22 = await _resCarregar(RES_ANO_ANTERIOR, "secoes/" + _resSlug(F.mun), ""), s26 = await _resCarregar(RES_ANO_APURADO, "secoes/" + _resSlug(F.mun), "");
  const base = s22 || s26; if (!base) return [];
  const nm = _resNomeMun(_resPainelNomeMun(F.mun)), ks = Object.keys(base._secoes || {});
  const vistos = new Map();
  ks.forEach((k) => {
    const chave = F.tipo === "bairro" ? base._bairroSec[k] : F.tipo === "local" ? base._secoes[k] : k;
    if (!chave || vistos.has(chave)) return;
    const q = { tipo: F.tipo, mun: F.mun, chave, rotulo: F.tipo === "secao" ? `Seção ${k.split("::")[1]}` : chave };
    const sub = F.tipo === "bairro" ? nm : F.tipo === "local" ? `${base._bairroSec[k] || ""} · ${nm}` : `${k.split("::")[0]}ª zona · ${base._secoes[k] || ""}`;
    vistos.set(chave, { q, sub, v: vt(q, s26, s22) });
  });
  return [...vistos.values()].sort((x, y) => y.v - x.v);
}
function _resPainelMuns(c, a) {
  return MUNICIPIOS_SC_REGIOES.map((m) => ({ q: { tipo: "mun", mun: m.chave, rotulo: _resNomeMun(m.nome) }, sub: m.assoc, v: ((c.municipios || {})[m.chave] || 0) || ((a && a.municipios || {})[m.chave] || 0) })).sort((x, y) => y.v - x.v || x.q.rotulo.localeCompare(y.q.rotulo, "pt-BR"));
}
const RES_IC_LUPA = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>';
function _resPainelListaHtml(itens, selKey, id, ph) {
  const esc = (x) => escaparAtributoHtml(x).replace(/>/g, "&gt;");
  return `<label class="pn-busca"><span class="lupa">${RES_IC_LUPA}</span><input id="${id}" placeholder="${ph}" autocomplete="off"></label>
    <div class="pn-lista" data-pn-lista="${id}">${itens.map((x, i) => { const k = JSON.stringify(x.q); return `<div class="pn-li${k === selKey ? " on" : ""}" data-pn-q-item='${esc(k)}' data-busca="${esc(_resNorm(x.q.rotulo + " " + (x.sub || "")))}"><span class="r"></span><span class="tx"><b>${esc(x.q.rotulo)}</b>${x.sub ? `<i>${esc(x.sub)}</i>` : ""}</span><span class="v">${x.v ? _resFmt(x.v) : ""}</span></div>`; }).join("") || `<div class="pc-sub" style="padding:10px 12px;">Nada por aqui.</div>`}</div>`;
}
async function _resPainelLocalHtml(ctx, c, a) {
  const st = ctx.st, F = st.pnForm;
  const nomes = { estado: "Estado", regiao: "Região", mun: "Município", bairro: "Bairro", local: "Colégio", secao: "Seção" };
  const ddTipo = _resDropdown("pnLocTipo", "Local", nomes[F.tipo], Object.entries(nomes).map(([v, r]) => `<div class="pc-dd-it${F.tipo === v ? " on" : ""}" data-t="${v}">${r}</div>`).join(""), { largura: 180 });
  const precisaMun = ["bairro", "local", "secao"].includes(F.tipo);
  let ddMun = "";
  if (precisaMun) {
    ddMun = `<div class="pc-dd" id="pnLocMun"><button class="pc-dd-btn" type="button"><small>Município</small><span data-dd-txt>${F.mun ? escaparAtributoHtml(_resNomeMun(_resPainelNomeMun(F.mun))) : "Escolha"}</span>${RES_IC_CHEV}</button><div class="pc-dd-menu right" style="min-width:250px; padding:8px;">${_resPainelListaHtml(_resPainelMuns(c, a), F.mun ? JSON.stringify({ tipo: "mun", mun: F.mun, rotulo: _resNomeMun(_resPainelNomeMun(F.mun)) }) : "", "pcPnFiltroMun", "Filtrar municípios…")}</div></div>`;
  }
  let corpo = "";
  if (F.tipo === "estado") corpo = `<div class="pc-sub" style="padding:4px 2px;">Santa Catarina inteiro.</div>`;
  else if (precisaMun && !F.mun) corpo = `<div class="pc-sub" style="padding:4px 2px;">Escolha o município ao lado.</div>`;
  else {
    const itens = await _resPainelOpcoes(ctx, c, a, F);
    const plural = { regiao: "regiões", mun: "municípios", bairro: "bairros", local: "colégios", secao: "seções" }[F.tipo];
    corpo = `<div class="pn-lista-t">${itens.length} ${plural}${precisaMun ? " em " + _resNomeMun(_resPainelNomeMun(F.mun)) : ""} · mais votados primeiro</div>` + _resPainelListaHtml(itens, F.sel || "", "pcPnFiltro", `Filtrar ${plural}…`);
  }
  const pronto = F.tipo === "estado" || !!F.sel;
  const X = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
  const V = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  return `<div class="pn-f2"><div class="pn-f2-sec"><div class="pc-map-filtros" style="grid-template-columns:${precisaMun ? "1fr 1fr" : "1fr"}; margin:0;">${ddTipo}${ddMun}</div></div>
    <div class="pn-f2-sec">${corpo}</div>
    <div class="pn-f2-acoes2"><button type="button" class="pn-rx" data-pn-form-x="1" title="Cancelar">${X}</button><button type="button" class="pn-rv" data-pn-loc-ok="1" title="Adicionar"${pronto ? "" : " disabled"}>${V}</button></div></div>`;
}

function _resPainelNomeMun(chave) { const m = MUNICIPIOS_SC_REGIOES.find((x) => x.chave === chave); return m ? m.nome : (chave || ""); }

async function _resPainelFormHtml(st, cargo, cands, modo) {
  const F = st.pnForm = st.pnForm || { tipo: "estado" };
  if (!F.sq && modo !== "cand") F.sq = st.pnUltimo || "";
  const esc = (x) => escaparAtributoHtml(x).replace(/>/g, "&gt;");
  const op = (v, r) => `<span class="pc-imp-op${F.tipo === v ? " on" : ""}" data-pn-tipo="${v}">${r}</span>`;
  const fav = _resFavoritos();
  const ordem = [...cands].sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
  const favs = ordem.filter((c) => fav.has(c.sq));
  const opC = (c) => `<option value="${esc(c.sq)}"${F.sq === c.sq ? " selected" : ""}>${esc(c.nomeUrna)} — ${esc(nomePartidoExibicao(c.partido))}</option>`;
  // modo "cand": só o candidato (+ do topo); modo "local": filtros dentro do bloco do candidato
  let h = `<div class="pn-form">${modo === "local" ? "" : `<div class="pn-form-t">Candidato</div>${F.sq && cands.find((c) => c.sq === F.sq) ? (() => { const c = cands.find((x) => x.sq === F.sq); return `<div class="pn-cand-sel"><b>${esc(c.nomeUrna)}</b> <span>${esc(nomePartidoExibicao(c.partido))}</span><button type="button" data-pn-trocar="1">trocar</button></div>`; })() : `<label class="pn-busca"><span class="lupa">${RES_IC_LUPA}</span><input id="pcPnBuscaC" placeholder="Buscar candidato ou partido…" autocomplete="off"></label><div id="pcPnBuscaL" class="pn-busca-l"></div>`}`}${modo === "cand" ? "" : `<div class="pn-form-t">Adicionar local</div><div class="pc-imp-ops">${op("estado", "Estado")}${op("regiao", "Região")}${op("mun", "Município")}${op("bairro", "Bairro")}${op("local", "Colégio")}${op("secao", "Seção")}</div>`}`;
  if (modo !== "cand" && F.tipo === "regiao") {
    const meso = [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.meso))].sort(), assoc = [...new Set(MUNICIPIOS_SC_REGIOES.map((m) => m.assoc))].sort();
    h += `<select class="pc-imp-sel" data-pn-sel="regiao"><option value="">Escolha a região</option><optgroup label="Mesorregiões (IBGE)">${meso.map((r) => `<option${F.regiao === r ? " selected" : ""}>${esc(r)}</option>`).join("")}</optgroup><optgroup label="Associações de municípios">${assoc.map((r) => `<option${F.regiao === r ? " selected" : ""}>${esc(r)}</option>`).join("")}</optgroup></select>`;
  }
  if (modo !== "cand" && ["mun", "bairro", "local", "secao"].includes(F.tipo)) {
    h += `<select class="pc-imp-sel" data-pn-sel="mun"><option value="">Escolha o município</option>${[...MUNICIPIOS_SC_REGIOES].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((m) => `<option value="${esc(m.chave)}"${F.mun === m.chave ? " selected" : ""}>${esc(m.nome)}</option>`).join("")}</select>`;
    if (F.tipo !== "mun" && F.mun) {
      const sec = await _resCarregar(RES_ANO_ANTERIOR, "secoes/" + _resSlug(F.mun), "");
      const ks = Object.keys((sec && sec._secoes) || {});
      const opts = F.tipo === "bairro" ? [...new Set(ks.map((k) => sec._bairroSec[k]).filter(Boolean))].sort().map((x) => [x, x])
        : F.tipo === "local" ? [...new Set(ks.map((k) => sec._secoes[k]).filter(Boolean))].sort().map((x) => [x, x])
        : ks.sort((x, y) => { const [za, sa] = x.split("::").map(Number), [zb, sb] = y.split("::").map(Number); return za - zb || sa - sb; }).map((k) => [k, `Seção ${k.split("::")[1]} · ${k.split("::")[0]}ª zona · ${sec._secoes[k] || ""}`]);
      h += opts.length ? `<select class="pc-imp-sel" data-pn-sel="chave"><option value="">Escolha</option>${opts.map(([v, r]) => `<option value="${esc(v)}"${F.chave === v ? " selected" : ""}>${esc(r)}</option>`).join("")}</select>` : `<div class="pc-sub" style="padding:6px 0;">Sem dado por local neste município.</div>`;
    }
  }
  const pronto = modo === "cand" ? !!F.sq : F.sq && (F.tipo === "estado" || (F.tipo === "regiao" && F.regiao) || (F.tipo === "mun" && F.mun) || (F.chave && F.mun));
  h += `</div><div class="pn-form-acoes"><button type="button" class="pn-ic-x" data-pn-form-x="1" title="Cancelar"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button><button type="button" class="pn-ic-v" data-pn-form-ok="1" title="Adicionar ao painel"${pronto ? "" : " disabled"}><svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg></button></div>`;
  return h;
}

function _resPainelLigar(ctx, corpo, dados) {
  const st = ctx.st, cargo = ctx.cargo, blocos = dados[cargo];
  const salvar = () => { _resPainelGravar(dados); _resRenderPainel(ctx); };
  const on = (sel, fn) => corpo.querySelectorAll(sel).forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); fn(el, e); }));
  on("[data-pn-fav]", (b) => { _resToggleFav(b.dataset.pnFav); ctx.favs = _resFavoritos(); _resRenderPainel(ctx); });
  on("[data-pn-abre]", (el) => { if (el._arrastou || st.pnModo === "del") return; const id = el.dataset.pnAbre; st.pnAberto[id] = !st.pnAberto[id]; salvar(); });
  on("[data-pn-fixar]", (el) => {
    const q = JSON.parse(el.dataset.pnFixar), bl = blocos[+el.dataset.pnB];
    if (!bl.quadros.some((x) => x.tipo === q.tipo && x.chave === q.chave && x.mun === q.mun)) bl.quadros.push(q);
    salvar();
  });
  on("[data-pn-subabre]", (el) => { const k = el.dataset.pnSubabre; if (st.pnAberto[k]) Object.keys(st.pnAberto).forEach((x) => { if (x === k || x.startsWith(k + "|")) delete st.pnAberto[x]; }); else st.pnAberto[k] = true; salvar(); });
  on("[data-pn-todos]", (el) => { const k = el.dataset.pnTodos + "|todos"; st.pnAberto[k] = !st.pnAberto[k]; salvar(); });
  on("[data-pn-modo]", (el) => { const m = el.dataset.pnModo; st.pnModo = st.pnModo === m ? null : m; st.pnLocal = null; st.pnForm = { tipo: "estado" }; st.pnConfTudo = false; _resRenderPainel(ctx); });
  on("[data-pn-tipo]", (el) => { st.pnForm = { tipo: el.dataset.pnTipo, mun: st.pnForm.mun, sq: st.pnForm.sq }; _resRenderPainel(ctx); });
  corpo.querySelectorAll("[data-pn-sel]").forEach((x) => x.addEventListener("change", () => { st.pnForm[x.dataset.pnSel] = x.value; if (x.dataset.pnSel === "mun") st.pnForm.chave = ""; _resRenderPainel(ctx); }));
  on("[data-pn-trocar]", () => { st.pnForm.sq = ""; _resRenderPainel(ctx).then(() => { const b = document.getElementById("pcPnBuscaC"); if (b) b.focus(); }); });
  const bc = document.getElementById("pcPnBuscaC");
  if (bc) {
    const pintar = () => {
      const qn = _resNorm(bc.value), fav = _resFavoritos();
      const l = ctx.cands.filter((c) => qn ? _resNorm(c.nomeUrna + " " + c.partido + " " + c.numero).includes(qn) : fav.has(c.sq))
        .sort((x, y) => (fav.has(y.sq) - fav.has(x.sq)) || x.nomeUrna.localeCompare(y.nomeUrna, "pt-BR")).slice(0, 30);
      const el = document.getElementById("pcPnBuscaL");
      el.innerHTML = l.length ? (qn ? "" : `<div class="pc-dd-grp">Favoritos</div>`) + l.map((c) => `<div class="pc-dd-it" data-pn-esc="${c.sq}">${fav.has(c.sq) ? `<span style="color:#C6E62A;display:inline-flex;margin-right:5px;">${RES_IC_ESTRELA.replace('width="14" height="14"', 'width="11" height="11"')}</span>` : ""}${c.nomeUrna} <small style="color:#8A9096;">${c.partido}</small></div>`).join("")
        : `<div class="pc-sub" style="padding:6px 4px;">${qn ? "Nenhum candidato encontrado." : "Digite o nome, partido ou número."}</div>`;
      el.querySelectorAll("[data-pn-esc]").forEach((it) => it.addEventListener("click", (e) => { e.stopPropagation(); st.pnForm.sq = it.dataset.pnEsc; _resRenderPainel(ctx); }));
    };
    bc.addEventListener("input", pintar); bc.addEventListener("click", (e) => e.stopPropagation()); pintar();
  }
  _resLigarDropdowns(corpo, (id, it) => { if (id === "pnLocTipo") { st.pnForm = { tipo: it.dataset.t, sq: st.pnForm.sq, mun: st.pnForm.mun }; _resRenderPainel(ctx); } });
  corpo.querySelectorAll("[data-pn-aba]").forEach((a) => a.addEventListener("click", (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // deixa o navegador abrir em nova aba
    e.preventDefault(); e.stopPropagation(); dados._ativa[cargo] = a.dataset.pnAba; st.pnModo = null; salvar();
  }));
  corpo.querySelectorAll("[data-pn-novaaba]").forEach((a) => a.addEventListener("click", (e) => e.stopPropagation()));
  on("[data-pn-fmt]", (el) => { dados._formato = el.dataset.pnFmt; salvar(); });
  on("[data-pn-rm]", (el) => { const [bi, qi] = el.dataset.pnRm.split("|").map(Number); blocos[bi].quadros.splice(qi, 1); if (!blocos[bi].quadros.length) blocos.splice(bi, 1); Object.keys(st.pnAberto).forEach((k) => delete st.pnAberto[k]); if (!blocos.length) st.pnModo = null; salvar(); });
  on("[data-pn-rm-c]", (el) => { blocos.splice(+el.dataset.pnRmC, 1); Object.keys(st.pnAberto).forEach((k) => delete st.pnAberto[k]); if (!blocos.length) st.pnModo = null; salvar(); });
  on("[data-pn-tudo]", () => { if (!st.pnConfTudo) { st.pnConfTudo = true; _resRenderPainel(ctx); return; } blocos.splice(0); st.pnConfTudo = false; st.pnModo = null; Object.keys(st.pnAberto).forEach((k) => delete st.pnAberto[k]); salvar(); });
  // escolher local: filtro em tempo real, seleção, menus Local/Município
  corpo.querySelectorAll(".pn-busca input").forEach((inp) => {
    inp.addEventListener("click", (e) => e.stopPropagation());
    inp.addEventListener("input", () => { const q = _resNorm(inp.value); const l = corpo.querySelector(`[data-pn-lista="${inp.id}"]`); if (l) l.querySelectorAll(".pn-li").forEach((li) => { li.style.display = !q || li.dataset.busca.includes(q) ? "" : "none"; }); });
  });
  corpo.querySelectorAll("[data-pn-q-item]").forEach((li) => li.addEventListener("click", (e) => {
    e.stopPropagation();
    const q = JSON.parse(li.dataset.pnQItem);
    if (li.closest("#pnLocMun")) { st.pnForm.mun = q.mun; st.pnForm.sel = ""; _resRenderPainel(ctx); return; }
    st.pnForm.sel = li.dataset.pnQItem;
    li.parentElement.querySelectorAll(".pn-li").forEach((x) => x.classList.toggle("on", x === li));
    const ok = corpo.querySelector("[data-pn-loc-ok]"); if (ok) ok.disabled = false;
  }));
  on("[data-pn-loc-ok]", () => {
    const F = st.pnForm, bl = blocos.find((b) => b.sq === F.sq);
    const q = F.tipo === "estado" ? { tipo: "estado", rotulo: "Estado" } : JSON.parse(F.sel);
    if (bl && !bl.quadros.some((x) => x.tipo === q.tipo && x.chave === q.chave && x.mun === q.mun)) bl.quadros.push(q);
    st.pnLocal = null; salvar();
  });
  on("[data-pn-form-x]", () => { st.pnModo = null; st.pnLocal = null; _resRenderPainel(ctx); });
  on("[data-pn-local]", (el) => { const bi = +el.dataset.pnLocal; st.pnLocal = st.pnLocal === bi ? null : bi; st.pnModo = null; st.pnForm = { tipo: "mun", sq: blocos[bi].sq }; _resRenderPainel(ctx); });
  on("[data-pn-form-ok]", () => {
    const F = st.pnForm;
    if (st.pnModo === "add") {
      if (!blocos.some((b) => b.sq === F.sq)) { const c = ctx.cands.find((x) => x.sq === F.sq); blocos.push({ sq: c.sq, numero: c.numero, quadros: [{ tipo: "estado", rotulo: "Estado" }] }); }
      dados._ativa[cargo] = F.sq;
      st.pnUltimo = F.sq; st.pnModo = null; salvar(); return;
    }
    let bl = blocos.find((b) => b.sq === F.sq);
    if (!bl) { const c = ctx.cands.find((x) => x.sq === F.sq); bl = { sq: c.sq, numero: c.numero, quadros: [] }; blocos.push(bl); }
    st.pnUltimo = F.sq;
    const nomeMun = _resNomeMun(_resPainelNomeMun(F.mun));
    const q = F.tipo === "estado" ? { tipo: "estado", rotulo: "Estado" }
      : F.tipo === "regiao" ? { tipo: "regiao", chave: F.regiao, rotulo: F.regiao.replace(" Catarinense", "") }
      : F.tipo === "mun" ? { tipo: "mun", mun: F.mun, rotulo: nomeMun }
      : { tipo: F.tipo, mun: F.mun, chave: F.chave, rotulo: F.tipo === "secao" ? `Seção ${F.chave.split("::")[1]}` : F.chave };
    if (!bl.quadros.some((x) => x.tipo === q.tipo && x.chave === q.chave && x.mun === q.mun)) bl.quadros.push(q);
    st.pnModo = null; st.pnLocal = null; salvar();
  });
  // Reorganizar pela alça de 6 pontos: arrastar por cima de outro quadro troca os dois
  corpo.querySelectorAll(".pn-tile[data-pn-q] [data-pn-arrasta]").forEach((h) => {
    const el = h.closest(".pn-tile");
    let ativo = false;
    h.addEventListener("click", (e) => e.stopPropagation());
    h.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); ativo = true; el.classList.add("arrastando"); });
    // a troca de lugar tira o elemento do DOM e ele perde a captura do ponteiro,
    // então o "soltar" e o "mover" são ouvidos no documento inteiro
    const parar = () => { if (!ativo) return; ativo = false; el.classList.remove("arrastando"); document.removeEventListener("pointermove", mover); document.removeEventListener("pointerup", parar); document.removeEventListener("pointercancel", parar); _resPainelGravar(dados); _resRenderPainel(ctx); };
    h.addEventListener("pointerdown", () => { document.addEventListener("pointermove", mover, { passive: false }); document.addEventListener("pointerup", parar); document.addEventListener("pointercancel", parar); });
    const mover = (e) => {
      if (!ativo) return;
      e.preventDefault();
      const alvo = document.elementFromPoint(e.clientX, e.clientY);
      const outro = alvo && alvo.closest(".pn-tile[data-pn-q]");
      if (!outro || outro === el || outro.dataset.pnB !== el.dataset.pnB) return;
      const bl = blocos[+el.dataset.pnB], i = +el.dataset.pnQ, j = +outro.dataset.pnQ;
      [bl.quadros[i], bl.quadros[j]] = [bl.quadros[j], bl.quadros[i]];
      const marc = document.createComment(""); el.replaceWith(marc); outro.replaceWith(el); marc.replaceWith(outro);
      el.dataset.pnQ = j; outro.dataset.pnQ = i;
      if (el.dataset.pnAbre) { const [b0] = el.dataset.pnAbre.split("|"); el.dataset.pnAbre = `${b0}|${j}`; }
      if (outro.dataset.pnAbre) { const [b0] = outro.dataset.pnAbre.split("|"); outro.dataset.pnAbre = `${b0}|${i}`; }
      Object.keys(st.pnAberto).forEach((k) => delete st.pnAberto[k]);
    };
  });
}

// Contagem regressiva até a abertura das urnas (4/10/2026, 8h de Brasília),
// junto da etiqueta "Ao vivo" (01/10/2026).
const RES_ABERTURA_URNAS = Date.parse("2026-10-04T08:00:00-03:00");
function _resContagem() {
  const ms = RES_ABERTURA_URNAS - Date.now();
  if (ms <= 0) return "urnas abertas";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, sg = Math.floor(ms / 1e3) % 60;
  const p2 = (x) => String(x).padStart(2, "0");
  return `${d ? d + "d " : ""}${p2(h)}:${p2(m)}:${p2(sg)}`;
}
setInterval(() => { const el = document.getElementById("pcResCont"); if (el && !pcState._resMeta) el.textContent = _resVivoStatus(null).txt; }, 1000);

// ---------- Disputa das sobras na Apuração (protótipo 02/10/2026) ----------
// Mesmo cálculo da Revisão do palpite (calcularDisputaSobra, regime 2026 sem
// piso), alimentado com os votos apurados: partido/federação = soma dos
// nominais + legenda (quando houver).
function _resSobrasDados(cands, totalVagas, legenda, fed) {
  const g = {};
  cands.forEach((c) => { const k = (fed && fed[c.partido]) || c.partido; (g[k] = g[k] || { nome: k, candidatos: [] }).candidatos.push({ nome: c.nome, nomeUrna: c.nomeUrna, votos: c.total }); });
  if (legenda) Object.entries(legenda).forEach(([p, v]) => { const k = (fed && fed[p]) || p; if (g[k]) g[k].candidatos.push({ fonte: "legenda", nome: "legenda", votos: v }); });
  // federação aparece pelas siglas dos partidos (ex.: "PT / PC do B / PV"), não pelo nome
  Object.values(g).forEach((p) => { const sig = [...new Set(cands.filter((c) => ((fed && fed[c.partido]) || c.partido) === p.nome).map((c) => c.partido))]; if (sig.length > 1) p.nome = sig.join(" / "); });
  const lista = Object.values(g).filter((p) => partyVotos(p) > 0);
  return { lista, disputa: lista.length ? calcularDisputaSobra(lista, totalVagas) : null };
}
// Mesmo formato do documento impresso do palpite (.di-sobras): introdução,
// rodadas reais (E-M · nª, partido, quem elegeu, média) e a continuação
// "se houvesse mais vagas" até 3× o número de sobras (pedido 02/10/2026).
function _resSobrasHtml(d, parcial, totalVagas) {
  if (!d.disputa) return `<div class="pc-sub" style="padding:8px 2px;">A disputa das sobras aparece quando os votos começarem a ser apurados.</div>`;
  const D = d.disputa, F = (x) => Math.round(x || 0).toLocaleString("pt-BR");
  const vagasQP = totalVagas - D.totalSobrasCargo;
  const nExtras = D.totalSobrasCargo * 2;
  const extras = (() => {
    if (!nExtras) return [];
    const ext = dhondtComCorte(d.lista, totalVagas + nExtras);
    const votos = d.lista.map((p) => partyVotos(p)), cont = d.lista.map(() => 0);
    const filas = d.lista.map((p) => [...p.candidatos].filter((c) => c.fonte !== "legenda").sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0)));
    const out = [];
    ext.historico.forEach((pIdx, k) => { if (k >= totalVagas) { const c = filas[pIdx][cont[pIdx]]; out.push({ numero: D.totalSobrasCargo + out.length + 1, vencedorNome: d.lista[pIdx].nome, vencedorMedia: votos[pIdx] / (cont[pIdx] + 1), vencedorCandidato: c ? nomeExibicao(c) : null }); } cont[pIdx]++; });
    return out;
  })();
  const linha = (r, real) => `<div class="pn-srod${real ? "" : " fora"}"><span class="rn">${r.numero}ª</span>${real ? `<span class="pc-sen-chip ${parcial ? "neutro pc-chip-parcial" : "em"}">E-M · ${r.numero}ª</span>` : `<span class="pc-sen-chip neutro">F</span>`}<span class="rp">${nomePartidoExibicao(r.vencedorNome)}</span><span class="rc">${r.vencedorCandidato || "sem candidato na fila"}</span><span class="rm"><small>média</small><b>${F(r.vencedorMedia)}</b></span></div>`;
  return `<div class="pn-sob-box">
    ${parcial ? `<div class="pc-rf-aviso" style="margin:0 0 10px;">Cálculo parcial — muda a cada atualização da apuração.</div>` : ""}
    <div class="pn-sob-t">Distribuição das sobras — método das médias (art. 109)</div>
    <div class="pn-sob-intro">${vagasQP} vaga${vagasQP === 1 ? " saiu" : "s saíram"} direto pelo quociente partidário (QE ${F(D.qe)}). A${D.totalSobrasCargo === 1 ? "" : "s"} <b>${D.totalSobrasCargo} restante${D.totalSobrasCargo === 1 ? "" : "s"}</b> ${D.totalSobrasCargo === 1 ? "foi distribuída" : "foram distribuídas"} rodada a rodada — em cada uma, ganha o partido com a maior média (votos ÷ vagas já obtidas + 1):</div>
    ${D.rodadas.map((r) => linha(r, true)).join("")}
    ${extras.length ? `<div class="pn-sob-div">Se houvesse mais vagas — os próximos da fila, na mesma regra (${extras.length} rodadas a mais). Ninguém aqui se elege.</div>${extras.map((r) => linha(r, false)).join("")}` : ""}
  </div>`;
}

// Painel fixo com os dados da eleição (02/10/2026): % apurado, comparecimento,
// abstenção, brancos, nulos, válidos, QE e vagas. Durante a apuração vem do
// TSE (meta do arquivo ao vivo); antes, mostra a referência do ano anterior.
async function _resPainelEleicao(cargo, meta, part, ano, anoRef) {
  const F = (n) => n || n === 0 ? _resFmt(n) : "—";
  const pc = (v, b) => b && v != null ? (v / b * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%" : "—";
  const vagas = cargo === "governador" || cargo === "presidente" ? 1 : vagasFixasCargo(RES_UF, cargo);
  const deP = (P) => P ? { apt: P[0], comp: P[1], abst: P[2], br: P[3], nu: P[4], val: P[5] } : {};
  let D;
  if (meta && meta.validos != null) D = { pct: meta.pctSecoes, apt: meta.eleitorado, comp: meta.comparecimento, abst: meta.abstencao, br: meta.brancos, nu: meta.nulos, val: meta.validos };
  else { const P = part && part[cargo] && part[cargo].estado; D = P ? { pct: 100, ...deP(P) } : { pct: meta ? meta.pctSecoes : null }; }
  // coluna de referência: o ano anterior fixo como parâmetro (02/10/2026)
  const pr = anoRef ? await _resCarregar(anoRef, "participacao") : null;
  const R = deP(pr && pr[cargo] && pr[cargo].estado);
  const qe = _resMajor(cargo) || !D.val ? null : quocienteEleitoral(D.val, vagas);
  const qeR = _resMajor(cargo) || !R.val ? null : quocienteEleitoral(R.val, vagas);
  const linhas = [["Comparec.", "comp", "apt"], ["Válidos", "val", "comp"], ["Abstenção", "abst", "apt"], ["Brancos", "br", "comp"], ["Nulos", "nu", "comp"]]
    .sort((a, b) => ((D[b[1]] || R[b[1]] || 0) - (D[a[1]] || R[a[1]] || 0)));
  // nome | barra (2026) | % | nominal 2026 | nominal 2022 (02/10/2026)
  const barra = (v, b) => `<i><u style="width:${b && v ? Math.min(100, v / b * 100) : 0}%"></u></i>`;
  const ln = (rot, v, base) => `<div class="pn-el-ln"><span class="r">${rot}</span>${barra(D[v], D[base])}<span class="p">${pc(D[v], D[base])}</span><b>${F(D[v])}</b><span class="ref">${F(R[v])}</span></div>`;
  const k = "dadosEleicaoAberto_res";
  const aberto = !!pcState.expandido[k];
  return `<div class="pn-el${aberto ? "" : " fechado"}" id="pcResDadosEl">
    <div class="pn-el-t" id="pcResDadosTog"><span>Dados da eleição · ${ano}</span><button type="button" class="pc-mini-btn" title="${aberto ? "Recolher" : "Expandir"}"><svg viewBox="0 0 16 16" width="13" height="13" style="transform:${aberto ? "none" : "rotate(-90deg)"}; transition:transform .2s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button></div>
    <div class="pn-el-ln cab"><span class="r"></span><i style="visibility:hidden"></i><span class="p">%</span><b>${ano}</b><span class="ref">${anoRef || ""}</span></div>
    <div class="pn-el-ln ap"><span class="r">Seções apuradas</span>${barra(D.pct, 100)}<span class="p">${D.pct == null ? "—" : pc(D.pct, 100)}</span><b></b><span class="ref"></span></div>
    ${linhas.map((x) => ln(...x)).join("")}
    <div class="pn-el-ln qe"><span class="r">${_resMajor(cargo) ? "Vagas" : `QE <small>· ${vagas} vagas</small>`}</span><i style="visibility:hidden"></i><span class="p"></span><b>${_resMajor(cargo) ? vagas : qe ? F(qe) : "—"}</b><span class="ref">${_resMajor(cargo) ? vagas : qeR ? F(qeR) : "—"}</span></div>
  </div>`;
}

// Links do card do palpite (Instagram + bens/recursos no TSE) na lista Geral
// (02/10/2026). Chave = partido-nome-completo em slug, a mesma de candidato_links.
function _resChaveLink(c) { const sl = (x) => _resNorm(x).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return `${sl(c.partido)}-${sl(c.nome)}`; }
async function _resGarantirLinks(cargo) {
  if (!["estadual", "federal", "senador"].includes(cargo) || typeof obterLinksCandidatos !== "function") return;
  pcState._resLinksCargo = pcState._resLinksCargo || {};
  if (pcState._resLinksCargo[cargo]) { pcState._resLinks = pcState._resLinksCargo[cargo].ig; pcState._resFin = pcState._resLinksCargo[cargo].fin; return; }
  try { const [ig, fin] = await Promise.all([obterLinksCandidatos(RES_UF, cargo), obterFinanceiroCandidatos(RES_UF, cargo)]); pcState._resLinksCargo[cargo] = { ig, fin }; pcState._resLinks = ig; pcState._resFin = fin; } catch (e) { pcState._resLinks = {}; pcState._resFin = {}; }
}

// Aviso ativo de dados novos (04/10/2026): faixa no topo quando o TSE gera
// arquivo novo + mudanças dos favoritos (posição no partido / situação) e o
// percentual no título da aba do navegador.
function _resAvisarNovidades(cargo, meta, cands, favs) {
  const base = "SimulaLEGIS";
  if (!meta) { document.title = base; return; }
  const pct = (meta.pctSecoes || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  document.title = `(${pct}%) Apuração · ${base}`;
  const mem = pcState._resAvisoMem = pcState._resAvisoMem || {};
  const ant = mem[cargo];
  const posPart = new Map();
  const porPartido = {};
  cands.forEach((c) => { (porPartido[c.partido] = porPartido[c.partido] || []).push(c); });
  Object.values(porPartido).forEach((l) => l.sort((a, b) => b.total - a.total).forEach((c, i) => posPart.set(c.sq, i + 1)));
  const agora = { gerado: meta.geradoEm, fav: {} };
  cands.forEach((c) => { if (favs.has(c.sq)) agora.fav[c.sq] = { pos: posPart.get(c.sq), sit: (c.situacao || "").toUpperCase(), eleito: !!c.eleito, nome: c.nomeUrna, partido: c.partido }; });
  mem[cargo] = agora;
  if (!ant || ant.gerado === agora.gerado) return;
  const msgs = [];
  Object.entries(agora.fav).forEach(([sq, f]) => {
    const o = ant.fav[sq]; if (!o) return;
    const nm = _resNomeMun(f.nome);
    if (f.eleito && !o.eleito) msgs.push(`${nm} está eleito`);
    else if (f.sit.startsWith("ELEITO") && !o.sit.startsWith("ELEITO")) msgs.push(`${nm} aparece como eleito (parcial)`);
    else if (!f.sit.startsWith("ELEITO") && o.sit.startsWith("ELEITO")) msgs.push(`${nm} saiu da faixa de eleitos`);
    if (o.pos && f.pos && f.pos !== o.pos) msgs.push(`${nm} ${f.pos < o.pos ? "subiu" : "caiu"} para ${f.pos}º no ${nomePartidoExibicao(f.partido)}`);
  });
  _resToast(`Atualizado agora · ${pct}% das seções`, msgs);
}
function _resToast(titulo, linhas) {
  let el = document.getElementById("pcResToast");
  if (!el) { el = document.createElement("div"); el.id = "pcResToast"; document.body.appendChild(el); }
  el.innerHTML = `<b><span class="pt"></span>${titulo}</b>${(linhas || []).slice(0, 3).map((l) => `<i>${l}</i>`).join("")}`;
  el.className = "on";
  clearTimeout(pcState._resToastT);
  pcState._resToastT = setTimeout(() => { el.className = ""; }, linhas && linhas.length ? 9000 : 5000);
  el.onclick = () => { el.className = ""; };
}

// Etiqueta "Ao vivo" com o status da sessão e barra de seções apuradas
// dentro dela, mais um botão de atualizar (04/10/2026).
const RES_FECHA_URNAS = Date.parse("2026-10-04T17:00:00-03:00");
function _resVivoStatus(meta) {
  if (meta && meta.final) return { txt: "totalização final", pct: 100 };
  if (meta) return { txt: `${(meta.pctSecoes || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`, pct: meta.pctSecoes || 0 };
  const t = Date.now();
  if (t < RES_ABERTURA_URNAS) return { txt: `abre em ${_resContagem()}`, pct: null, cont: true };
  if (t < RES_FECHA_URNAS) { const ms = RES_FECHA_URNAS - t, h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60; return { txt: `fecham em ${h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`}`, pct: null }; }
  return { txt: "aguardando o TSE", pct: 0 };
}
function _resVivoChip(meta) {
  const S = _resVivoStatus(meta);
  const ativo = !!meta && !meta.final;
  return `<div class="pc-vivo${ativo ? " on" : ""}">
    <span class="pt${ativo ? " vivo" : ""}"></span><b>Ao vivo</b><span class="st" id="pcResCont">${S.txt}</span>
    ${S.pct != null ? `<i class="bar"><u style="width:${Math.min(100, S.pct)}%"></u></i>` : ""}
    <button type="button" id="pcResAtualizar" title="Atualizar agora">${iconeSvg("reset", 13)}</button>
  </div>`;
}

// % apurado de um recorte (04/10/2026): município direto do TSE (meta.munPct);
// região = média dos municípios ponderada pelo eleitorado de 2022.
async function _resPctRecorte(q, meta, cargo) {
  const mp = meta && meta.munPct; if (!mp || !["mun", "regiao"].includes(q.tipo)) return null;
  const mj = await _resCarregar(RES_ANO_ANTERIOR, "municipios");
  const cod = (k) => mj && mj.municipios[k] && mj.municipios[k].tse ? String(Number(mj.municipios[k].tse)).padStart(5, "0") : null;
  const pctDe = (k) => { const c = cod(k); return c && mp[c] != null ? mp[c] : null; };
  if (q.tipo === "mun") return pctDe(q.mun);
  const part = await _resCarregar(RES_ANO_ANTERIOR, "participacao");
  const apt = (k) => ((part && part[cargo] && part[cargo].mun[k]) || [1])[0] || 1;
  let soma = 0, peso = 0;
  MUNICIPIOS_SC_REGIOES.filter((m) => m.meso === q.chave || m.assoc === q.chave).forEach((m) => { const p = pctDe(m.chave); if (p == null) return; soma += p * apt(m.chave); peso += apt(m.chave); });
  return peso ? soma / peso : null;
}
