// Parlamentares · Legislativo e Administrativo de outros estados (16/10/2026, começando por SP).
// Conteúdo vem de dados/painel/{casa}-legislativo.json e {casa}-administrativo.json, levantados nas
// fontes oficiais (cada item com a fonte). O que não foi confirmado aparece marcado "a confirmar".
// Usa as mesmas classes visuais do Legislativo/Administrativo de SC (novos.html).
let LEGUF = null, ADMUF = null;
async function carregarUF() {
  if (UF === "sc") return; const c = UFI.casa.toLowerCase();
  [LEGUF, ADMUF] = await Promise.all([fetch(`../dados/painel/${c}-legislativo.json?v=1`).then((r) => r.json()).catch(() => null), fetch(`../dados/painel/${c}-administrativo.json?v=1`).then((r) => r.json()).catch(() => null)]);
}
const aConf = (t) => esc(t).replace(/a confirmar/gi, '<em class="acf">a confirmar</em>');
const blocoUF = (tit, corpo, extra = "") => `<div class="bloco rv"${extra}><h3 data-bl>${tit}</h3><div class="blc">${corpo}</div></div>`;
const fechaSec = `</div></div></section>`;
// coluna da direita da tabela (.qtab) é só o valor curto; o resto do texto vai para a linha de baixo, como em SC
const curto = (v) => { const t = String(v ?? ""), m = /^([^(;—]+?)\s*[(;—]\s*(.*?)\)?$/.exec(t); return m ? [m[1].trim(), m[2].trim()] : [t, ""]; };
const linha = (rot, sub, val) => `<tr><td>${rot}${sub ? `<small>${sub}</small>` : ""}</td><td>${val}</td></tr>`;
const fonteUF = (t) => `<p class="nota">Fonte: ${aConf(t)}</p>`;

function secLegislativoUF(c) {
  const L = LEGUF || {}, Q = L.quorum || {}, V = UFI.vagas, cal = L.calendario || {};
  const esf = (nec) => `<div class="esf">${Array.from({ length: V }, (_, i) => `<i class="${i < nec ? "on" : ""}" style="--d:${(i * .01).toFixed(2)}s"></i>`).join("")}</div>`;
  const QR = [["Lei ordinária", Q.maioria_absoluta, "maioria dos votos, com a maioria absoluta presente", "maioria simples"], ["Lei complementar", Q.maioria_absoluta, "maioria absoluta dos membros", Q.maioria_absoluta + " votos"], ["Emenda à Constituição", Q.tres_quintos, "3/5 dos membros, em 2 turnos", Q.tres_quintos + " votos"], ["Derrubada de veto", Q.maioria_absoluta, "maioria absoluta dos membros", Q.maioria_absoluta + " votos"]];
  return cabSec("s2", "02", "Legislativo", `Como funciona a ${UFI.casa}: calendário, regras de votação, tipos de proposta, caminho de um projeto, comissões e composição.`) +
    blocoUF("Calendário do mandato", `<ol class="vt"><li><b>1º fev 2027</b><span>Posse dos ${V} deputados e eleição da Mesa (mandato de 2 anos)</span></li><li><b>1º fev – 30 jun</b><span>1º período da sessão legislativa</span></li><li class="rc"><b>jul</b><span>Recesso</span></li><li><b>1º ago – 15 dez</b><span>2º período</span></li><li class="rc"><b>16 dez – 31 jan</b><span>Recesso</span></li><li><b>fev 2029</b><span>Nova Mesa (2º biênio); vedada a recondução para o 3º mandato seguido</span></li></ol>${fonteUF(cal.fonte || "Constituição do Estado")}`) +
    blocoUF("Votação e quórum", `<div class="qrows">${QR.map(([nm, nec, tx, val]) => `<div class="qr"><div class="qn"><b>${nm}</b><small>${esc(tx)}</small></div><div class="qv">${esf(nec)}<em>${esc(val)}</em></div></div>`).join("")}</div><p class="nota">Cada esfera é um deputado (${V}). Aceso: votos necessários. Fonte: Constituição do Estado, arts. 22, 23 e 28.</p>`) +
    blocoUF("Tipos de proposição", `<table class="qtab">${(L.proposicoes || []).map((p) => linha(`<b>${esc(p.sigla)}</b> · ${esc(p.nome)}`, `${aConf(p.uso)} · quem propõe: ${aConf(p.quem_propoe)}`, /a confirmar/i.test(p.aprovacao) ? aConf("a confirmar") : esc(p.aprovacao))).join("")}</table>${fonteUF("Constituição do Estado e Regimento Interno (Res. 576/1970)")}`) +
    blocoUF("Caminho de um projeto de lei", `<ol class="trm">${(L.trilha || []).map((t) => `<li><b>${esc(t.etapa)}</b><span>${aConf(t.detalhe)}</span></li>`).join("")}</ol>`, ' id="trilha"') +
    blocoUF("Prazos de análise", `<table class="qtab">${(L.regimes || []).map((r) => (() => { const d = /(\d+)\s*dias/.exec(r.prazos); return linha(`<b>${esc(r.nome)}</b>`, `${aConf(r.prazos)} · ${aConf(r.fonte)}`, d ? d[1] + " dias" : aConf("a confirmar")); })()).join("")}</table>`) +
    blocoUF(`${UFI.casa}26 · cadeiras por partido (2022 → 2026)`, compUF(c), ' id="comp"') +
    blocoUF(`Comissões permanentes · ${(L.comissoes_permanentes || []).length}`, `<table class="qtab">${(L.comissoes_permanentes || []).map((x) => `<tr><td>${esc(x.nome)}</td><td>${x.membros} membros</td></tr>`).join("")}</table>${fonteUF("Regimento Interno (Res. 576/1970), art. 30")}`, ' id="gcom"') +
    blocoUF("Orçamento e emendas impositivas", `<p>${aConf((L.orcamento || {}).emendas_impositivas || "")}</p><p>Prazos do PPA, LDO e LOA: ${aConf((L.orcamento || {}).ppa_ldo_loa_prazos || "a confirmar")}</p>${fonteUF((L.orcamento || {}).fonte || "")}`) +
    `<div class="bloco rv"><p class="nota">Ainda a confirmar nas fontes da ${UFI.casa}: rotina semanal (dias e horários das sessões e comissões), prazos do plenário por regime, frentes parlamentares. Fontes consultadas: ${(L.fontes || []).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60))}</a>`).join(" · ")}</p></div>` + fechaSec;
}
// composição: deputados por partido em 2022 (eleitos do TSE) e 2026
function compUF(c) {
  const E = eleitos(), E22 = A22.eleitos || [], ps = [...new Set(E.map((x) => x.p))], de22 = (p) => E22.filter((x) => (PART22[p] || [p]).includes(x.p)).length;
  const R = ps.map((p) => ({ p, a: de22(p), b: E.filter((x) => x.p === p).length })).sort((x, y) => y.b - x.b || y.a - x.a), mx = Math.max(...R.map((r) => Math.max(r.a, r.b))) || 1;
  return `<div class="cmob">${R.map((r) => { const d = r.b - r.a; return `<div class="cb${r.p === c.p ? " eu" : ""}"><span>${esc(r.p)}</span><div class="tk"><i class="a" style="width:${r.a / mx * 100}%"></i><i class="b" style="width:${r.b / mx * 100}%"></i></div><b>${r.a} → ${r.b}<small class="${d > 0 ? "g" : d < 0 ? "p" : ""}">${d > 0 ? "+" + d : d < 0 ? d : "="}</small></b></div>`; }).join("")}<div class="cleg"><span><i class="a"></i>2022</span><span><i class="b"></i>2026</span></div></div><p class="nota">2022: eleitos do TSE agrupados nas federações de 2026. Fonte: TSE, dados abertos.</p>`;
}

function secAdministrativoUF(c) {
  const A = ADMUF || {}, P = A.parlamentar || {}, G = A.gabinete || {}, T = A.transparencia || {}, VI = P.verba_indenizatoria || {};
  const rs = (v) => typeof v === "number" ? "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : aConf(v);
  const cheio = (G.cargos || []).reduce((s, x) => { const m = /^(.*)\((\d+) vagas?\)/.exec(x.cargo); return m ? s + (+m[2]) * x.vencimento : s; }, 0);
  return cabSec("s3", "03", "Administrativo", `O que o mandato recebe e o que pode estruturar na ${UFI.casa}: subsídio, verbas, gabinete e transparência.`) +
    blocoUF("Subsídio e verbas do parlamentar", `<table class="qtab">${linha("Subsídio mensal", aConf(P.norma_subsidio || ""), rs(P.subsidio))}${(() => { const [v, r] = curto(VI.valor_mensal_teto || ""); return linha(esc(VI.nome || "Verba indenizatória"), `${aConf(r)}${r ? " · " : ""}${aConf(VI.o_que_cobre || "")} · ${aConf(VI.norma || "")}`, esc(v)); })()}${(P.auxilios || []).map((x) => { const [v, r] = curto(x.valor); return linha(esc(x.nome), `${aConf(r)}${r ? " · " : ""}${aConf(x.norma)}`, esc(v)); }).join("")}</table><p class="nota">${aConf(P.observacoes || "")}</p>`) +
    blocoUF("Estrutura do gabinete", `<p>Até <b>${G.cargos_maximos || "?"} cargos em comissão</b>. Não há cota em reais: o limite é o número e o tipo de cargo.</p><table class="qtab">${(G.cargos || []).map((x) => (() => { const [c0, r] = curto(x.cargo); return linha(esc(c0), `${aConf(r)}${r ? " · " : ""}${esc(x.referencia || "")}`, rs(x.vencimento)); })()).join("")}${cheio ? `<tr><td><b>Estrutura cheia (16 cargos)</b><small>soma dos vencimentos dos cargos acima com vagas fixas · cálculo do SimulaLEGIS</small></td><td><b>${rs(cheio)}</b></td></tr>` : ""}</table><p class="nota">Chefe de gabinete: ${aConf((G.chefe_de_gabinete || {}).cargo || "a confirmar")}. Fonte: ${aConf(G.norma || "")}</p>`) +
    blocoUF("Transparência", `<table class="qtab">${linha("Portal da transparência", esc((T.portal || "").replace(/^https?:\/\//, "")), `<a href="${esc(T.portal || "#")}" target="_blank" rel="noopener" style="color:inherit">abrir</a>`)}${linha("Normas", (T.normas || []).map(aConf).join(" · "), /a confirmar/i.test((T.normas || []).join(" ")) ? aConf("a confirmar") : "")}${linha("Folha de pagamento", aConf(T.folha || ""), /a confirmar/i.test(T.folha || "") ? aConf("a confirmar") : "")}${linha("Gastos de verba por deputado", aConf(T.verbas || ""), /a confirmar/i.test(T.verbas || "") ? aConf("a confirmar") : "")}</table>`) +
    `<div class="bloco rv"><p class="nota">Valores brutos. A UFESP do ano ainda está a confirmar, por isso os auxílios aparecem em UFESP com a conversão aproximada. Fontes consultadas: ${(A.fontes || []).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www[0-9]?\.)?/, "").slice(0, 60))}</a>`).join(" · ")}</p></div>` + fechaSec;
}
