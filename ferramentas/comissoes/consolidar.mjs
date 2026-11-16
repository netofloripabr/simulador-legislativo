// Consolida o que coletar.mjs baixou em dados/painel/alesc-comissoes.json (16/11/2026).
// Reuniões: registros da agenda das comissões desde 01/02/2023, sem os cancelados e sem reservas de sala; a reunião
// conjunta conta para cada comissão participante. Relatorias: nas pautas, as matérias vêm agrupadas sob
// "DEPUTADO <relator>"; cada matéria conta uma vez por relator e comissão (ela volta à pauta até ser votada).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), CACHE = join(AQUI, "_cache");
const B = JSON.parse(readFileSync(join(CACHE, "bruto.json"), "utf8")), TX = JSON.parse(readFileSync(join(CACHE, "pautas-texto.json"), "utf8"));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// comissões permanentes: chave por palavra do nome (os nomes mudaram ao longo da legislatura)
const CHAVES = [["agricultura", /agricultura/], ["municipais", /assuntos municipais/], ["ccj", /constituicao e justica/], ["defesacivil", /defesa civil/], ["crianca", /crianca/],
  ["deficiencia", /deficiencia/], ["dh", /direitos humanos/], ["economia", /economia/], ["educacao", /educacao/], ["esportes", /esporte/], ["financas", /financas/], ["pesca", /pesca/],
  ["drogas", /drogas/], ["relacoes", /relacionamento institucional|mercosul/], ["saude", /saude/], ["seguranca", /seguranca publica/], ["trabalho", /trabalho administracao/],
  ["transportes", /transportes/], ["turismo", /turismo/], ["idoso", /idos/], ["consumidor", /consumidor/], ["etica", /etica e decoro/], ["ambiente", /meio ambiente/], ["animal", /animal/]];
const chaveDe = (txt) => { const n = norm(txt); return CHAVES.filter(([, re]) => re.test(n)).map(([k]) => k); };

// deputados: nome de exibição → partido; casar nomes das pautas (maiúsculas) e da composição
const PART = B.partidos, DEP = Object.keys(PART), DN = DEP.map((d) => [d, norm(d)]);
const ALIAS = { "soratto": "Estener Soratto", "marcos jose de abreu": "Marquito", "ze milton": "José Milton Scheffer", "massoc": "Massocco", "mauro de nadal": "Mauro De Nadal", "dr vicente": "Dr. Vicente Caropreso", "vicente caropreso": "Dr. Vicente Caropreso", "padre pedro": "Padre Pedro Baldissera", "pedro baldissera": "Padre Pedro Baldissera", "jose milton": "José Milton Scheffer", "pepe collaco": "Pepê Collaço", "sergio guimaraes": "Sérgio Guimarães", "jesse lopes": "Jessé Lopes", "antidio lunelli": "Antídio Lunelli", "mario motta": "Mário Motta", "mauricio eskudlark": "Maurício Eskudlark", "mauricio peixer": "Maurício Peixer" };
// casamento de nomes: exato → apelido → todas as palavras do nome → até 2 letras de diferença (erros de digitação das
// pautas, ex.: "Fernado Krelling", "Mári Motta"); procura primeiro os deputados em exercício, depois os candidatos de 2022
// (ex-deputados e suplentes que passaram pela Casa, com o partido de 2022)
const E22 = JSON.parse(readFileSync(join(RAIZ, "dados/painel/sc-estadual.json"), "utf8")).c.filter((c) => /eleito|suplente/i.test(c.s || ""));
const ANT = {}; E22.forEach((c) => { if (!(c.u in PART)) ANT[c.u] = c.p; });
const lev = (a, b) => { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; };
const CAND = [...DEP.map((d) => [d, norm(d)]), ...Object.keys(ANT).map((d) => [d, norm(d)])];
const QC = {}; const quem = (txt) => { const n = norm(txt).replace(/^(deputad[oa]) /, "").replace(/ (pp|pl|psd|mdb|pt|novo|pdt|psol|psdb)$/, ""); if (!n) return null; if (n in QC) return QC[n];
  let r = (CAND.find(([, x]) => x === n) || [])[0];
  if (!r) for (const [k, v] of Object.entries(ALIAS)) if (n.includes(k)) { r = v; break; }
  if (!r) { const tk = n.split(" "); r = (CAND.find(([, x]) => x.split(" ").every((w) => tk.includes(w)) || (tk.length > 1 && tk.every((w) => x.split(" ").includes(w)))) || [])[0]; }
  if (!r) { const tk = n.split(" "), hit = DEP.filter((d) => { const w = norm(d).split(" "); return tk.length === 1 ? w.includes(tk[0]) : norm(d).startsWith(n); }); if (hit.length === 1) r = hit[0]; }   // nome cortado na quebra de linha do PDF
  if (!r && n.length > 5) { let b = null, bd = 3; for (const [d, x] of CAND) { const k = lev(n, x); if (k < bd) { bd = k; b = d; } } r = b; }
  if (!r) r = txt.replace(/^DEPUTAD[OA]\s+/i, "").toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase());
  return QC[n] = r; };
const partido = (d) => PART[d] || (ANT[d] ? ANT[d] + "*" : "—");

// composição atual
const COM = {}; for (const [nome, c] of Object.entries(B.comissoes)) { const [k] = chaveDe(nome); if (!k) continue;
  const mem = [c.presidente, c.vice, ...c.membros].filter(Boolean).map(quem), part = {}; mem.forEach((m) => { const p = partido(m); part[p] = (part[p] || 0) + 1; });
  COM[k] = { nome, presidente: quem(c.presidente), vice: quem(c.vice), membros: c.membros.map(quem), partidos: part, reunioes: { total: 0, ordinaria: 0, extraordinaria: 0, conjunta: 0, audiencia: 0, instalacao: 0, outra: 0, por_ano: {} }, relatorias: {}, materias: new Set() }; }

// reuniões
const TIPO = (t) => { const n = norm(t); return /audiencia publica/.test(n) ? "audiencia" : /conjunta/.test(n) ? "conjunta" : /instalacao/.test(n) ? "instalacao" : /extraordinaria/.test(n) ? "extraordinaria" : /ordinaria/.test(n) ? "ordinaria" : "outra"; };
let reun = 0; const visto = new Set();
for (const a of B.agenda) { if (a.cancelado || !/comiss/i.test(a.t) || /^reservad/i.test(a.t)) continue; const ks = chaveDe(a.t).filter((k) => COM[k]); if (!ks.length) continue;
  const id = a.d + a.h + a.t; if (visto.has(id)) continue; visto.add(id); reun++; const tp = TIPO(a.t), ano = (a.d || "").slice(0, 4);
  ks.forEach((k) => { const R = COM[k].reunioes; R.total++; R[tp]++; R.por_ano[ano] = (R.por_ano[ano] || 0) + 1; }); a._ks = ks; }

// relatorias (pautas)
const MAT = /\b(PL|PLC|PEC|PDL|PRS|MSV|MSG|OF|OFC|RQS|RQC|PR|RQ)\s*\.?\s*\/?\s*(\d{3,4})(?:\.\d)?\s*\/\s*(\d{4})/g;
let pautas = 0, semRel = 0;
// dois formatos de pauta: (a) "DEPUTADO <relator>" e as matérias embaixo; (b) a matéria e, depois dela,
// "Relator(a) Designado (a): Deputado <relator>" (pautas de 2023)
const RB = /Relator(?:\(a\))?a?(?: na Comiss[ãa]o [^:]{3,90})?\s*(?:Designad[oa]\s*(?:\(a\))?)?\s*:?\s*Deputad[oa]\s+([^;:]{3,45}?)\s*[;.]?\s*$/i;
for (const a of B.agenda) { if (!a._ks) continue;
  for (const an of a.anexos) { const t = TX[an.id]; if (!t) continue; pautas++;
    const cab = (t.match(/COMISS[ÃA]O (?:DE |DA |DO |DOS |DAS )[^\n,]{3,90}/) || [])[0], kc = (cab ? chaveDe(cab).filter((k) => COM[k]) : [])[0] || a._ks[0], C = COM[kc];
    const conta = (rel, cod) => { const R = C.relatorias[rel] = C.relatorias[rel] || new Set(); R.add(cod); C.materias.add(cod); };
    let rel = null, pend = [], achou = false;
    for (const lin of t.split(/\n/)) { const l = lin.trim();
      const ra = l.match(/^DEPUTAD[OA]\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÜ'.\- ]{2,40})$/), rb = l.match(RB);
      if (ra) { rel = /-$/.test(ra[1].trim()) || ra[1].trim().length < 5 ? null : quem(ra[1]); pend = []; continue; }   // fragmento cortado ("MAUR", "MAS-"): não conta
      if (rb) { const r = quem(rb[1]); pend.forEach((cod) => conta(r, cod)); if (pend.length) achou = true; pend = []; rel = null; continue; }
      for (const m of l.matchAll(MAT)) { const cod = `${m[1].replace("MSG", "MSV")}/${m[2].padStart(4, "0")}/${m[3]}`; if (rel) { conta(rel, cod); achou = true; } else pend.push(cod); } }
    if (!achou) semRel++; } }

// saída
const anos = [...new Set(B.agenda.map((a) => (a.d || "").slice(0, 4)).filter(Boolean))].sort();
const comissoes = Object.entries(COM).map(([k, c]) => ({ chave: k, nome: c.nome, presidente: c.presidente, vice: c.vice, membros: c.membros, partidos: c.partidos, reunioes: c.reunioes,
  materias_relatadas: c.materias.size, relatorias: Object.entries(c.relatorias).map(([d, s]) => ({ deputado: d, partido: partido(d), materias: s.size, membro: [c.presidente, c.vice, ...c.membros].includes(d) })).sort((a, b) => b.materias - a.materias) }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
const porDep = {}; comissoes.forEach((c) => { [c.presidente, c.vice, ...c.membros].filter(Boolean).forEach((d) => { const o = porDep[d] = porDep[d] || { deputado: d, partido: partido(d), comissoes: 0, presidencias: 0, relatorias: 0, por_comissao: {} }; o.comissoes++; if (d === c.presidente) o.presidencias++; });
  c.relatorias.forEach((r) => { const o = porDep[r.deputado] = porDep[r.deputado] || { deputado: r.deputado, partido: r.partido, comissoes: 0, presidencias: 0, relatorias: 0, por_comissao: {} }; o.relatorias += r.materias; o.por_comissao[c.nome] = r.materias; }); });
const out = { fonte: "ALESC — portalelegis.alesc.sc.gov.br (comissões permanentes: composição, agenda e pautas) e alesc.sc.gov.br/deputados (partido atual)", gerado: B.gerado, periodo: { de: "2023-02-01", ate: B.gerado.slice(0, 10) },
  metodo: { reunioes: "registros da agenda das comissões, sem cancelados e reservas de sala; a reunião conjunta conta para cada comissão participante", relatorias: "matérias distintas sob cada 'DEPUTADO <relator>' nas pautas; uma matéria conta uma vez por relator e comissão, mesmo voltando à pauta" },
  totais: { reunioes_distintas: reun, pautas_lidas: pautas, pautas_sem_relator_identificado: semRel, comissoes: comissoes.length, anos },
  comissoes, deputados: Object.values(porDep).sort((a, b) => b.relatorias - a.relatorias) };
writeFileSync(join(RAIZ, "dados/painel/alesc-comissoes.json"), JSON.stringify(out));
console.log(`ok: ${comissoes.length} comissões, ${reun} reuniões, ${pautas} pautas lidas (${semRel} sem relator identificado), ${out.deputados.length} deputados`);
