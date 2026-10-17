// Parlamentares · Legislativo e Administrativo de outros estados (16/10/2026, começando por SP).
// Conteúdo vem de dados/painel/{casa}-legislativo.json e {casa}-administrativo.json, levantados nas
// fontes oficiais (cada item com a fonte). O que não foi confirmado aparece marcado "a confirmar".
// Usa as mesmas classes visuais do Legislativo/Administrativo de SC (novos.html).
let LEGUF = null, ADMUF = null, ESTUF = null;
async function carregarUF() {
  if (UF === "sc") return; const c = UFI.casa.toLowerCase();
  ESTUF = await fetch(`../dados/painel/${c}-estrutura.json?v=1`).then((r) => r.json()).catch(() => null);
  [LEGUF, ADMUF] = await Promise.all([fetch(`../dados/painel/${c}-legislativo.json?v=2`).then((r) => r.json()).catch(() => null), fetch(`../dados/painel/${c}-administrativo.json?v=2`).then((r) => r.json()).catch(() => null)]);
}
const aConf = (t) => esc(t).replace(/a confirmar/gi, '<em class="acf">a confirmar</em>');
const blocoUF = (tit, corpo, extra = "") => `<div class="bloco rv"${extra}><h3 data-bl>${tit}</h3><div class="blc">${corpo}</div></div>`;
const fechaSec = `</div></div></section>`;
// coluna da direita da tabela (.qtab) é só o valor curto; o resto do texto vai para a linha de baixo, como em SC
const curto = (v) => { const t = String(v ?? ""), rr = /R\$\s?[\d.]+,\d{2}/.exec(t); if (rr) return [rr[0], t]; const m = /^([^(;—]+?)\s*[(;—]\s*(.*?)\)?$/.exec(t); return m ? [m[1].trim(), m[2].trim()] : [t, ""]; };
const linha = (rot, sub, val) => `<tr><td>${rot}${sub ? `<small>${sub}</small>` : ""}</td><td>${val}</td></tr>`;
const fonteUF = (t) => `<p class="nota">Fonte: ${aConf(t)}</p>`;

// ---- conteúdo sistematizado de SP (ALESP): explicado em linguagem direta; a base legal fica no botão "i" ----
const ibUF = (t) => `<button class="ib" title="Base legal" onclick="event.stopPropagation(); const b=this.closest('.bloco'); b.classList.remove('fech'); const x=b.querySelector('.ibx'); x.hidden=!x.hidden">i</button>`;
const blocoI = (tit, base, corpo, extra = "") => `<div class="bloco rv"${extra}><h3 data-bl>${tit}${ibUF()}</h3><div class="ibx" hidden>${base}</div><div class="blc">${corpo}</div></div>`;
const SP_QUORUM = [["Lei ordinária · resolução · decreto legislativo", 25, 48, "maioria simples", "<b class=kw>Maioria simples</b>: maioria dos votos, com pelo menos 48 deputados presentes. Com o quórum mínimo, bastam 25 votos."], ["Lei complementar · derrubada de veto", 48, 0, "maioria absoluta · 48", "<b class=kw>Maioria absoluta</b>: metade mais um dos 94 deputados, não importa quantos estejam presentes."], ["Emenda à Constituição", 57, 0, "3/5 · 57 × 2 turnos", "<b class=kw>Três quintos</b> dos 94 deputados, em dois turnos de votação."]];
const SP_PROP = [["PEC", "Proposta de Emenda à Constituição", "32 deputados (1/3), o Governador, mais de 1/3 das câmaras municipais ou 1% do eleitorado", "3/5 em dois turnos (57 votos)", "Mudar a Constituição do Estado. É promulgada pela Mesa, sem passar pelo Governador."],
  ["PLC", "Projeto de Lei Complementar", "Deputado, comissão, Governador, Tribunal de Justiça, Procurador-Geral de Justiça ou 0,5% do eleitorado", "Maioria absoluta (48), turno único", "Temas que a Constituição reserva a lei complementar, como estatutos e organização de carreiras."],
  ["PL", "Projeto de Lei", "Os mesmos autores do PLC", "Maioria simples, turno único", "Leis em geral: políticas públicas, programas, datas comemorativas, utilidade pública."],
  ["PR", "Projeto de Resolução", "Mesa, comissão ou deputado", "Maioria simples, turno único", "Assuntos internos da Assembleia (Regimento, estrutura, cargos). Promulgado pelo Presidente da Assembleia em até 10 dias, sem sanção."],
  ["PDL", "Projeto de Decreto Legislativo", "Mesa, comissão ou deputado", "Maioria simples, turno único", "Competências exclusivas da Assembleia que valem fora da Casa. Promulgado pelo Presidente da Assembleia, sem sanção."],
  ["Indicação", "Indicação", "Deputado", "Não vai a voto", "Sugerir ao Governo do Estado ou da União uma medida de interesse público. É lida em plenário e enviada pelo Presidente; se ele recusar, o autor pode levar à comissão."],
  ["Requerimento", "Requerimento", "Deputado, líder, comissão ou Mesa", "Presidente ou Plenário, sem parecer", "Pedir informações às secretarias, urgência, preferência, adiamento, licença ou inclusão na pauta."],
  ["Moção", "Moção", "Deputado", "Comissão do tema e Plenário", "Posição da Assembleia: apelo, aplauso ou protesto. Fica 5 sessões aberta a emendas. Não cabe moção de apoio a poderes públicos nem de interesse só municipal."]];
const SP_TRILHA = {
  PL: [["Protocolo", "Entregue à Mesa"], ["Leitura", "Pequeno Expediente; publicado no Diário em até 2 dias"], ["Pauta", "5 sessões para emendas (3 em urgência ou prioridade)"], ["CCJR", "Constitucionalidade e legalidade"], ["Comissões de mérito", "Análise do tema; Finanças quando mexe no orçamento"], ["Plenário", "Maioria simples, turno único", [["Rejeitado", "arquivo", "n"]]], ["Redação final", "CCJR consolida o texto aprovado"], ["Governador", "15 dias úteis", [["Sanciona", "vira lei", "s"], ["Veta", "no todo ou em parte", "n"]]], ["Veto na Casa", "30 dias para votar", [["Derrubado", "48 votos · promulgação", "s"], ["Mantido", "arquivo", "n"]], 1]],
  PLC: [["Protocolo", "Lei complementar"], ["Leitura", "Pequeno Expediente"], ["Pauta", "Prazo para emendas"], ["CCJR", "Constitucionalidade"], ["Mérito", "Comissões do tema"], ["Plenário", "Maioria absoluta: 48 votos", [["Rejeitado", "arquivo", "n"]]], ["Governador", "15 dias úteis", [["Sanciona", "vira lei", "s"], ["Veta", "no todo ou em parte", "n"]]], ["Veto na Casa", "30 dias", [["Derrubado", "48 votos · promulgação", "s"], ["Mantido", "arquivo", "n"]], 1]],
  PEC: [["Proposta", "32 deputados, Governador, câmaras ou 1% do eleitorado"], ["Leitura", "Pequeno Expediente"], ["Comissões", "CCJR e mérito"], ["1º turno", "3/5: 57 votos", [["Rejeitada", "arquivo", "n"]]], ["2º turno", "3/5: 57 votos", [["Rejeitada", "arquivo", "n"]]], ["Promulgação", "Pela Mesa, sem sanção do Governador"]],
  "PR · PDL": [["Protocolo", "Mesa, comissão ou deputado"], ["Pauta", "Prazo para emendas"], ["Comissões", "CCJR e mérito"], ["Plenário", "Maioria simples, turno único", [["Rejeitado", "arquivo", "n"]]], ["Promulgação", "Presidente da Assembleia, em até 10 dias; sem sanção"]],
  "Urgência do Governador": [["Pedido", "O Governador pede urgência no projeto"], ["Comissões", "Regime de urgência: 2 dias em cada"], ["Dia 45", "Sem votação, tranca a pauta até a decisão", 0, 1], ["Plenário", "Decide", [["Aprovado", "segue à sanção", "s"], ["Rejeitado", "arquivo", "n"]]]] };
const SP_PRAZOS = {
  "Ordinário": { tot: "30 dias por comissão", vista: "—", obs: "no Plenário, entra na pauta em até 10 dias; a discussão pode ser encerrada depois de 12 horas", p: [["Comissões", "30 dias", 30, 0, 0, 1], ["Plenário", "em até 10 dias", 40, 0, 0, 1], ["Redação final", "10 dias", 50, 0, 0, 1], ["Autógrafo ao Governador", "10 dias", 60, 0, 0, 1], ["Governador", "15 dias úteis para sancionar ou vetar", 0, 0, 1]] },
  "Prioridade": { tot: "10 dias por comissão", vista: "—", obs: "no Plenário, entra na pauta em até 3 dias; discussão pode ser encerrada depois de 9 horas", p: [["Comissões", "10 dias", 10, 0, 0, 1], ["Plenário", "em até 3 dias", 13, 0, 0, 1], ["Redação final", "5 dias", 18, 0, 0, 1], ["Autógrafo ao Governador", "5 dias", 23, 0, 0, 1]] },
  "Urgência": { tot: "2 dias por comissão", vista: "—", obs: "entra na primeira sessão; discussão pode ser encerrada depois de 6 horas", p: [["Comissões", "2 dias", 2, 0, 0, 1], ["Plenário", "primeira sessão", 3, 0, 0, 1], ["Redação final", "1 dia", 4, 0, 0, 1], ["Autógrafo ao Governador", "1 dia", 5, 0, 0, 1]] },
  "Urgência do Governador": { tot: "45 dias no total", vista: "—", obs: "tramita em urgência; sem decisão, tranca a pauta", p: [["Dia 45", "Sem decisão do Plenário: tranca a pauta até a votação", 45, 0, 0, 1]] },
  "Veto": { tot: "30 dias para o Plenário", vista: "—", obs: "derrubada exige 48 votos", p: [["Dia 30", "Sem votação: entra na pauta e tranca as demais", 30, 0, 0, 1], ["Derrubada", "Maioria absoluta (48 votos)", 0, 0, 1]] } };
// SP usa os mesmos componentes de SC (trilha animada e simulador de prazos): troca o conteúdo das tabelas
function prepararUF() { if (UF === "sc") return; Object.keys(TRILHA).forEach((k) => delete TRILHA[k]); Object.assign(TRILHA, SP_TRILHA); Object.keys(PRAZOS).forEach((k) => delete PRAZOS[k]); Object.assign(PRAZOS, SP_PRAZOS); }

function secLegislativoUF(c) {
  prepararUF();
  const L = LEGUF || {}, V = UFI.vagas;
  const esf = (nec, pres) => `<div class="esf">${Array.from({ length: V }, (_, i) => `<i class="${i < nec ? "on" : pres && i < pres ? "pr" : ""}" style="--d:${(i * .008).toFixed(3)}s"></i>`).join("")}</div>`;
  const BASE_CONST = "Constituição do Estado de São Paulo e Regimento Interno da ALESP (Res. 576/1970, compilada com a Res. 948/2026).";
  return cabSec("s2", "02", "Legislativo", `Como funciona a ${UFI.casa}: o calendário do mandato, a rotina da semana, as regras de votação, o caminho de cada proposta e a composição.`) +
    blocoI("Calendário do mandato", "Constituição do Estado, art. 9º (sessão legislativa) e art. 11 (Mesa, 2 anos); Regimento, arts. 5º a 11 (eleição da Mesa).",
      `<ol class="vt"><li><b>1º fev 2027</b><span>Posse dos ${V} deputados e eleição da Mesa (mandato de 2 anos)</span></li><li><b>1º fev – 30 jun</b><span>1º período da sessão legislativa</span></li><li class="rc"><b>julho</b><span>Recesso</span></li><li><b>1º ago – 15 dez</b><span>2º período</span></li><li class="rc"><b>16 dez – 31 jan</b><span>Recesso</span></li><li><b>1º fev 2029</b><span>Nova Mesa (2º biênio)</span></li><li><b>jan 2031</b><span>Fim da legislatura</span></li></ol><p class="nota">A sessão legislativa não termina sem aprovar a LDO e votar o orçamento.</p>`) +
    blocoI("Rotina semanal", "Regimento, art. 99 (sessões ordinárias de 14h às 19h; sessões só de debates às segundas, quintas e sextas), arts. 100 e 102 (extraordinárias) e art. 45 (reuniões das comissões).",
      `<div class="semana"><div><b>Segunda</b><div class="it"><i>14h–19h</i>Sessão, que pode ser só de debates (sem votação)</div></div>
      <div class="on"><b>Terça</b><div class="it"><i>14h</i>Pequeno e Grande Expediente: discursos e comunicações</div><div class="it"><i>16h30</i>Ordem do Dia: votações</div></div>
      <div class="on"><b>Quarta</b><div class="it"><i>14h</i>Expedientes</div><div class="it"><i>16h30</i>Ordem do Dia: votações</div></div>
      <div><b>Quinta</b><div class="it"><i>14h–19h</i>Sessão, que pode ser só de debates</div></div><div><b>Sexta</b><div class="it"><i>14h–19h</i>Sessão, que pode ser só de debates</div></div></div>
      <p class="nota">As comissões se reúnem toda semana, em dias e horários publicados semanalmente. Sessões extraordinárias podem ser convocadas pelo Presidente ou pelos líderes, com até 2h30.</p>`) +
    blocoI("Votação e quórum", "Constituição do Estado, arts. 22 (emenda), 23 (lei complementar) e 28 (veto); Regimento, art. 183 (turno único) e art. 234 (veto).",
      `<div class="qrows">${SP_QUORUM.map(([nm, nec, pres, val, tx]) => `<div class="qr"><div class="qn"><b>${nm}</b><small>${tx}</small></div><div class="qv">${esf(nec, pres)}<em>${val}</em></div></div>`).join("")}</div><p class="nota">Cada esfera é um deputado (${V}). Aceso: votos necessários; no contorno, o quórum mínimo de presentes.</p>`) +
    blocoI("Tipos de proposição", "Constituição do Estado, arts. 22 a 24 (emenda, leis e iniciativa); Regimento, arts. 145 a 169 (resolução, decreto legislativo, moção, indicação e requerimento).",
      `<p>O que cada instrumento faz, quem pode apresentar e como é votado.</p><div class="ptab">${SP_PROP.map(([sg, nm, quem, vot, uso]) => `<div class="pr"><div class="sg">${esc(sg)}</div><div><b>${esc(nm)}</b><span>${esc(uso)}</span></div><div class="mt"><small>Quem apresenta</small>${esc(quem)}</div><div class="mt"><small>Votação</small>${esc(vot)}</div></div>`).join("")}</div>`) +
    blocoI("Trilha das propostas", "Regimento, arts. 148 (leitura e pauta para emendas), 150 a 152 (Ordem do Dia, redação final e autógrafo) e 217; Constituição do Estado, arts. 26 (urgência do Governador) e 28 (sanção e veto).",
      `<p>Escolha o tipo e acompanhe o caminho, do protocolo à lei ou ao arquivo.</p><div class="chips" id="trTipos">${Object.keys(SP_TRILHA).map((k, i) => `<button data-tr="${k}" class="${i ? "" : "on"}">${k}</button>`).join("")}</div><div class="trilha" id="trilha"></div>`) +
    blocoI("Prazos de análise", "Regimento, art. 53 (prazos das comissões por regime), art. 150 (entrada na Ordem do Dia), art. 194 (encerramento da discussão), arts. 151, 152 e 217 (redação final e autógrafo); Constituição do Estado, arts. 26 e 28.",
      `<p>Quanto tempo cada regime leva nas comissões e no Plenário. Escolha o regime e a data de entrada para estimar o calendário.</p><div class="chips" id="pzTipos"></div><div class="pzr" id="pzRes"></div><div class="pzc"><label>Entrada na comissão <input type="date" id="pzData"></label><label class="pzv" hidden><input type="checkbox" id="pzVista"> com pedido de vista</label></div><ol class="pzl" id="pzLin"></ol><p class="nota">Prazos em dias corridos, pulando os recessos de julho e de 16 de dezembro a 31 de janeiro.</p>`) +
    blocoI(`${UFI.casa}26 · cadeiras por partido (2022 → 2026)`, "TSE, dados abertos: eleitos de 2022 e 2026, agrupados nas federações de 2026.", compUF(c), ' id="comp"') +
    blocoI(`Comissões permanentes · ${(L.comissoes_permanentes || []).length}`, "Regimento, art. 26 (proporcionalidade), art. 27 (indicação pelos líderes), art. 30 (lista e tamanho) e art. 36 (presidente e vice).",
      `<p>As vagas de cada comissão são divididas pelo tamanho das bancadas: o quociente é 94 dividido pelo número de membros (7,2 nas comissões de 13; 8,5 nas de 11). As vagas que sobram vão primeiro aos partidos que ficaram sem nenhuma e depois às maiores frações. Os líderes indicam os nomes, e cada comissão elege presidente e vice.</p><table class="qtab">${(L.comissoes_permanentes || []).map((x) => `<tr><td>${esc(x.nome)}</td><td>${x.membros} membros</td></tr>`).join("")}</table>`, ' id="gcom"') +
    blocoI("Orçamento e emendas impositivas", "Constituição do Estado, art. 174, § 9º (prazos de envio), art. 175, §§ 6º a 10 (emendas impositivas; EC 45/2017 e EC 52/2022) e art. 175-A (transferência a municípios; EC 50/2021).",
      `<p>O orçamento passa por três leis enviadas pelo Governador e votadas na Assembleia: <b>PPA</b> (plano de 4 anos), <b>LDO</b> (metas e regras do ano seguinte) e <b>LOA</b> (o orçamento em si). É na LOA que o deputado apresenta suas emendas.</p>
      <div class="orc"><div><b>0,45%</b><span>da receita corrente líquida é o total das emendas individuais dos deputados</span></div><div><b>50%</b><span>no mínimo vai para ações e serviços de saúde</span></div><div><b>Obrigatória</b><span>a execução das emendas individuais é impositiva; não podem pagar pessoal nem dívida</span></div><div><b>Direto ao município</b><span>por transferência especial, sem convênio, ou com finalidade definida</span></div></div>
      <ol class="vt orcv"><li><b>30 de abril</b><span>Governador envia a LDO</span></li><li><b>15 de agosto</b><span>Envia o PPA, no 1º ano do mandato</span></li><li><b>30 de setembro</b><span>Envia a LOA, onde entram as emendas</span></li><li><b>Até 15 de dezembro</b><span>A sessão legislativa só termina depois de votar o orçamento</span></li></ol>`) +
    blocoI("Frentes parlamentares", "Resolução ALESP nº 870/2011.", `<p>Grupos suprapartidários de deputados em torno de um tema (setor econômico, região, causa). São registradas na Mesa e apresentam relatório anual; não votam projetos.</p><p><a href="https://www.al.sp.gov.br/alesp/frentes-parlamentares" target="_blank" rel="noopener" style="color:var(--a)">Lista oficial de frentes da ALESP</a></p>`) +
    fechaSec;
}
// composição: deputados por partido em 2022 (eleitos do TSE) e 2026
function compUF(c) {
  const E = eleitos(), E22 = A22.eleitos || [], ps = [...new Set(E.map((x) => x.p))], de22 = (p) => E22.filter((x) => (PART22[p] || [p]).includes(x.p)).length;
  const R = ps.map((p) => ({ p, a: de22(p), b: E.filter((x) => x.p === p).length })).sort((x, y) => y.b - x.b || y.a - x.a), mx = Math.max(...R.map((r) => Math.max(r.a, r.b))) || 1;
  return `<div class="cmob">${R.map((r) => { const d = r.b - r.a; return `<div class="cb${r.p === c.p ? " eu" : ""}"><span>${esc(r.p)}</span><div class="tk"><i class="a" style="width:${r.a / mx * 100}%"></i><i class="b" style="width:${r.b / mx * 100}%"></i></div><b>${r.a} → ${r.b}<small class="${d > 0 ? "g" : d < 0 ? "p" : ""}">${d > 0 ? "+" + d : d < 0 ? d : "="}</small></b></div>`; }).join("")}<div class="cleg"><span><i class="a"></i>2022</span><span><i class="b"></i>2026</span></div></div><p class="nota">2022: eleitos do TSE agrupados nas federações de 2026. Fonte: TSE, dados abertos.</p>`;
}

function secAdministrativoUF(c) {
  const A = ADMUF || {}, P = A.parlamentar || {}, G = A.gabinete || {}, T = A.transparencia || {}, VI = P.verba_indenizatoria || {};
  const rs = (v) => typeof v === "number" ? "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : esc(v);
  const rsDe = (t) => { const m = /R\$\s?[\d.]+,\d{2}/.exec(String(t || "")); return m ? m[0] : ""; };
  const aux = (P.auxilios || []), ax = (re) => aux.find((x) => re.test(x.nome)) || {};
  const vagas = (t) => { const m = /\((\d+) vagas?\)/.exec(t); return m ? +m[1] : 0; };
  const fixos = (G.cargos || []).filter((x) => vagas(x.cargo)), trocas = (G.cargos || []).filter((x) => !vagas(x.cargo) && /Assistente Parlamentar/.test(x.cargo));
  const cheio = fixos.reduce((t, x) => t + vagas(x.cargo) * x.vencimento, 0);
  const nomeC = (t) => esc(String(t).split("(")[0].trim());
  const E = ESTUF, soma = (L) => (L || []).reduce((t, x) => t + (x.vencimento || 0) * (x.qtd || 1), 0), mi = (v) => "R$ " + (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " mi", mil = (v) => "R$ " + (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " mil";
  const LD = E ? ((E.liderancas || {}).lotacao_real || []).map((x) => [x.lideranca.replace(/^Gabinete (DA |DO )?/i, "").replace(/^LIDERANÇA (DA |DO )?/i, "Liderança "), x.servidores_ativos, soma(x.cargos)]).sort((a, b) => b[2] - a[2]) : [];
  return cabSec("s3", "03", "Administrativo", `O que o mandato recebe e o que pode estruturar na ${UFI.casa}: subsídio, verbas, gabinete e a estrutura da Casa.`) +
    blocoI("Subsídio e verbas do parlamentar", "Subsídio: Lei estadual 17.617/2023 (valor vigente desde 01/02/2025). Verbas: Resoluções ALESP 783/1997 e 822/2001, regulamentadas pelo Ato da Mesa 33/2024; valores em UFESP convertidos pela UFESP 2026 de R$ 38,42 (Comunicado DICAR 88/2025, Sefaz-SP).",
      `<table class="qtab">${linha("Subsídio mensal", "remuneração do mandato; sofre imposto de renda e previdência", rs(P.subsidio))}
      ${linha("Auxílio-Encargos Gerais de Gabinete", "reembolso das despesas do mandato: escritório, telefone, assinaturas, aluguel de imóvel, profissionais especializados e deslocamentos · até 1.250 UFESPs", rsDe(VI.valor_mensal_teto))}
      ${linha("Auxílio-hospedagem", "estadia em São Paulo para quem mora fora · até 178 UFESPs", rsDe(ax(/hosped/i).valor))}
      ${linha("Carro de representação", "locação de veículo · 160 UFESPs; R$ 9.605,00 se blindado", rsDe(ax(/autom|locação/i).valor))}
      ${linha("Manutenção de veículo", "conserto do veículo · até 20 UFESPs", rsDe(ax(/manuten/i).valor))}</table>
      <p class="nota">Valores brutos e mensais. Os auxílios são pagos por reembolso, até o limite.</p>`) +
    blocoI("Estrutura do gabinete", `Estrutura de Pessoal do gabinete parlamentar (documento oficial da ALESP) e Resolução ALESP 776/1996; vencimentos totais da tabela de 01/03/2025 (LC 1.431/2025).`,
      `<p>O gabinete não tem uma verba em reais: o limite é o número e o tipo de cargo. A estrutura <b>cheia</b> tem 16 cargos em comissão; o deputado pode trocar cargos maiores por mais assistentes e chegar a <b>até ${G.cargos_maximos || 23} pessoas</b>.</p>
      <table class="qtab">${fixos.map((x) => linha(nomeC(x.cargo), `${vagas(x.cargo)} vaga${vagas(x.cargo) > 1 ? "s" : ""}`, rs(x.vencimento))).join("")}${linha("<b>Estrutura cheia · 16 cargos</b>", "soma dos vencimentos · conta do SimulaLEGIS", `<b>${rs(cheio)}</b>`)}</table>
      ${trocas.length ? `<p style="margin-top:14px"><b>Trocas possíveis</b></p><table class="qtab">${trocas.map((x) => linha(nomeC(x.cargo), esc((/\((.*)\)/.exec(x.cargo) || [, ""])[1]), rs(x.vencimento))).join("")}</table>` : ""}`) +
    (E ? blocoI("A estrutura da Casa", "LOA 2026 do Estado (Lei 18.387/2026, Assembleia Legislativa); lotação de servidores no portal da ALESP (consulta de 16/10/2026); vencimentos da tabela de 01/03/2025. Não foi localizada gratificação em dinheiro para membros da Mesa, presidentes de comissão ou líderes.",
      `<table class="qtab">${linha("Orçamento da Assembleia em 2026", "o que a Casa pode gastar no ano", E.orcamento_2026 ? mi(E.orcamento_2026.valor) : "")}${linha("Servidores ativos", `${(E.casa || {}).servidores_efetivos} efetivos e ${(E.casa || {}).comissionados} em comissão`, ((E.casa || {}).total_ativos_todos_regimes || "").toLocaleString("pt-BR"))}</table>
      <p style="margin-top:14px"><b>Gabinetes da Mesa</b> · quem está lotado hoje (só cargos em comissão entram na soma)</p><table class="qtab">${(E.gabinetes_mesa || []).map((g) => linha(esc(g.cargo_mesa), `${g.servidores_ativos} servidores`, mil(g.total_mensal || soma(g.cargos_extras)) + "/mês")).join("")}</table>
      <p style="margin-top:14px"><b>Lideranças</b> · ${LD.length} gabinetes</p><table class="qtab">${LD.map(([n, q, v]) => linha(esc(n), `${q} servidores`, mil(v) + "/mês")).join("")}</table>
      <p class="nota">As comissões não têm estrutura própria: o apoio é centralizado no Departamento de Comissões. Os efetivos lotados nesses gabinetes não entram nas somas, porque o salário depende do nível de cada um.</p>`) : "") +
    blocoI("Transparência", "Lei federal 12.527/2011 (Lei de Acesso à Informação) e páginas oficiais da ALESP.",
      `<table class="qtab">${[["Portal da transparência", "contratos, licitações, orçamento", T.portal || "https://www.al.sp.gov.br/transparencia/"], ["Subsídios dos deputados", "folha mensal de cada deputado", "https://www.al.sp.gov.br/alesp/folha-de-pagamento-deputados/"], ["Remuneração dos servidores", "folha nominal", "https://www.al.sp.gov.br/alesp/folha-de-pagamento/"], ["Lotação dos servidores", "quem trabalha em cada gabinete", "https://www.al.sp.gov.br/servidor/lista/"], ["Gastos de gabinete por deputado", "reembolsos do Auxílio-Encargos", "https://www.al.sp.gov.br/deputado/contas"]].map(([r, sub, u]) => linha(r, sub, `<a href="${esc(u)}" target="_blank" rel="noopener" style="color:inherit">abrir</a>`)).join("")}</table>`) +
    fechaSec;
}

// caderno impresso (outros estados): páginas de Legislativo e Administrativo no formato do caderno de SC
function cadUF(c, sec, h3) {
  const L = LEGUF || {}, A = ADMUF || {}, Q = L.quorum || {}, P = A.parlamentar || {}, G = A.gabinete || {}, VI = P.verba_indenizatoria || {}, T = A.transparencia || {};
  const tx = (t) => esc(t), tr = (a, b, sub) => `<tr><td>${a}${sub ? `<small>${tx(sub)}</small>` : ""}</td><td>${b}</td></tr>`;
  const rs = (v) => typeof v === "number" ? "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : tx(v);
  const E = eleitos(), E22 = A22.eleitos || [], ps = [...new Set(E.map((x) => x.p))], R = ps.map((p) => ({ p, a: E22.filter((x) => (PART22[p] || [p]).includes(x.p)).length, b: E.filter((x) => x.p === p).length })).sort((x, y) => y.b - x.b);
  return `<div class="pg">${sec("Legislativo", `Como funciona a ${UFI.casa}: calendário, votação, proposições, caminho do projeto e comissões.`)}<div class="duas"><div>
    ${h3("Calendário do mandato")}<ol class="vt"><li><b>1º fev 2027</b><span>Posse dos ${UFI.vagas} deputados e eleição da Mesa (2 anos)</span></li><li><b>1º fev – 30 jun</b><span>1º período</span></li><li><b>jul</b><span>Recesso</span></li><li><b>1º ago – 15 dez</b><span>2º período</span></li><li><b>16 dez – 31 jan</b><span>Recesso</span></li><li><b>fev 2029</b><span>Nova Mesa (2º biênio)</span></li></ol>
    ${h3("Votação e quórum")}<table>${tr("Lei ordinária", "maioria simples", "com a maioria absoluta presente")}${tr("Lei complementar", Q.maioria_absoluta + " votos", "maioria absoluta")}${tr("Emenda à Constituição", Q.tres_quintos + " votos", "3/5, em 2 turnos")}${tr("Derrubada de veto", Q.maioria_absoluta + " votos", "maioria absoluta")}</table>
    ${h3("Prazos de análise")}<table>${(L.regimes || []).map((r) => { const d = /(\d+)\s*dias/.exec(r.prazos); return tr(tx(r.nome), d ? d[1] + " dias" : "a confirmar", r.prazos + " · " + r.fonte); }).join("")}</table>
    ${h3("Orçamento e emendas impositivas")}<p class="tx">${tx((L.orcamento || {}).emendas_impositivas || "")}</p>
  </div><div>
    ${h3("Tipos de proposição")}<table>${(L.proposicoes || []).map((p) => tr(`<b>${tx(p.sigla)}</b> · ${tx(p.nome)}`, /a confirmar/i.test(p.aprovacao) ? "a confirmar" : tx(p.aprovacao), p.uso + " · quem propõe: " + p.quem_propoe)).join("")}</table>
    ${h3("Caminho de um projeto de lei")}<ol class="vt">${(L.trilha || []).map((t) => `<li><b>${tx(t.etapa)}</b><span>${tx(t.detalhe)}</span></li>`).join("")}</ol>
  </div></div>
  <div class="duas"><div>${h3(`${UFI.casa}26 · cadeiras por partido`)}<table>${R.map((r) => tr(tx(r.p), `${r.a} → ${r.b}`)).join("")}</table></div>
  <div>${h3(`Comissões permanentes · ${(L.comissoes_permanentes || []).length}`)}<table>${(L.comissoes_permanentes || []).map((x) => tr(tx(x.nome), x.membros + " membros")).join("")}</table></div></div></div>
  <div class="pg">${sec("Administrativo", `O que o mandato recebe e o que pode estruturar na ${UFI.casa}.`)}<div class="duas"><div>
    ${h3("Subsídio e verbas do parlamentar")}<table>${tr("Subsídio mensal", rs(P.subsidio), P.norma_subsidio)}${(() => { const [v, r] = curto(VI.valor_mensal_teto || ""); return tr(tx(VI.nome || "Verba indenizatória"), tx(v), (r ? r + " · " : "") + (VI.norma || "")); })()}${(P.auxilios || []).map((x) => { const [v, r] = curto(x.valor); return tr(tx(x.nome), tx(v), (r ? r + " · " : "") + x.norma); }).join("")}</table>
    ${h3("Transparência")}<table>${tr("Portal da transparência", "", T.portal)}${tr("Normas", "", (T.normas || []).join(" · "))}${tr("Folha de pagamento", "", T.folha)}${tr("Gastos de verba por deputado", "", T.verbas)}</table>
  </div><div>
    ${h3("Estrutura do gabinete", `até ${G.cargos_maximos || "?"} cargos`)}<table>${(G.cargos || []).map((x) => { const [c0, r] = curto(x.cargo); return tr(tx(c0), rs(x.vencimento), (r ? r + " · " : "") + (x.referencia || "")); }).join("")}</table><p class="tx">${tx(G.norma || "")}</p>
  </div></div></div>`;
}
