// Diário da Assembleia (ALESC): baixa as edições, extrai o texto e separa TODOS os atos administrativos
// (portarias, atos da Mesa, atos da Presidência, resoluções e instruções normativas) com o que cada um faz e
// quem ele atinge (matrícula, nome, cargo/código, lotação, data de efeito, processo SEI).
//
// Uso:
//   node ferramentas/diario/ler_diario.mjs edicoes.json [de] [ate]   → lê as edições (números de..até) da lista
//   edicoes.json = { "9157": { "u": "https://…/9157diaicp.pdf", "d": "04/11/2026" }, … }  (lista oficial do Diário)
// Saída: ferramentas/diario/_cache/atos/NNNN.json (uma por edição). PDFs e textos ficam em _cache/ (fora do git:
// têm nomes de servidores e o repositório é público). Nada vai para o banco aqui: a carga é outro passo.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";

const DIR = path.dirname(new URL(import.meta.url).pathname), CACHE = path.join(DIR, "_cache"), BIN = path.join(CACHE, "pdftexto");
for (const d of ["pdf", "txt", "atos"]) fs.mkdirSync(path.join(CACHE, d), { recursive: true });
if (!fs.existsSync(BIN)) execFileSync("swiftc", ["-O", path.join(DIR, "pdftexto.swift"), "-o", BIN]);

const MES = { janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const dataPt = (s) => { const m = String(s || "").toLowerCase().match(/(\d{1,2})º?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/); return m && MES[m[2]] ? `${m[3]}-${String(MES[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null; };

// cabeçalhos e rodapés de página que se repetem e cortam os atos no meio
const LIXO = [/^Diário Oficial assinado eletronicamente/i, /^Coordenadoria de Publicação - Sistema/i, /^\d{2}\/\d{2}\/\d{4} DIÁRIO DA ASSEMBLEIA - SC/i, /^\d{1,2}ª?$/, /^Legislatura ESTADO DE SANTA CATARINA/i, /^Legislativa$/, /^ANO [LXVI]+ FLORIANÓPOLIS/i, /^NÚMERO [\d.]+$/, /^\f$/];
const limpar = (t) => t.split("\n").map((l) => l.trim()).filter((l) => l && !LIXO.some((r) => r.test(l))).join("\n");

const CAB = /^(PORTARIA|ATO DA MESA|ATO DA PRESID[ÊE]NCIA|ATO DO PRESIDENTE|ATO DA DIRETORIA[- ]GERAL|RESOLU[ÇC][ÃA]O|INSTRU[ÇC][ÃA]O NORMATIVA|DECIS[ÃA]O)\s+N[°ºo.]*\s*([\d.]+)(?:\s*[\/-]\s*(\d{4}))?,?\s*(?:DE\s+)?(.*)$/i;
// verbos de ação (o que o ato faz), na ordem em que costumam aparecer depois de "RESOLVE"
const ACOES = ["NOMEAR", "EXONERAR", "ALTERAR NÍVEL", "ALTERAR O NÍVEL", "LOTAR", "RELOTAR", "DESIGNAR", "DISPENSAR", "COLOCAR À DISPOSIÇÃO", "COLOCAR A DISPOSIÇÃO", "CEDER", "RETORNAR", "REMOVER", "APOSENTAR", "CONCEDER", "AUTORIZAR", "PRORROGAR", "REVOGAR", "TORNAR SEM EFEITO", "FAZER CESSAR", "RETIFICAR", "CONVALIDAR", "INSTITUIR", "ALTERAR", "AFASTAR", "SUSPENDER", "DECLARAR", "HOMOLOGAR", "CONVOCAR", "EMPOSSAR", "DEMITIR", "READAPTAR", "AVERBAR", "INCLUIR", "EXCLUIR", "POSICIONAR", "ATRIBUIR", "PUBLICAR", "ENQUADRAR", "PROMOVER", "REENQUADRAR", "RECONDUZIR", "REINTEGRAR", "REDISTRIBUIR", "ESTABELECER", "REGULAMENTAR", "APROVAR", "FIXAR"];
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

function separarAtos(txt) {
  // só a parte administrativa: a capa traz o expediente e citações (Resolução 006/2009 etc.) que não são atos novos
  let L = limpar(txt).split("\n"); const ini = L.findIndex((l) => /^(C A D E R N O A D M I N|CADERNO ADMINISTRATIVO|PORTARIAS$|ATOS? DA MESA$|ATOS? DA PRESID[ÊE]NCIA$)/i.test(l));
  if (ini > 0) L = L.slice(ini);
  const atos = []; let cur = null;
  for (const l of L) {
    const m = l.match(CAB);
    if (m && l.length < 160) { if (cur) atos.push(cur); cur = { tipo: m[1].toUpperCase().replace(/\s+/g, " "), numero: m[2].replace(/\./g, ""), ano_num: m[3] || null, cab: l, linhas: [] }; continue; }
    // fim do bloco administrativo: extratos, editais e avisos não são atos de gestão
    if (/^(E D I T A I S|EXTRATOS?$|EXTRATO N|AVISO D[EO]|ERRATA)/i.test(l) && cur) { atos.push(cur); cur = null; continue; }
    if (cur) cur.linhas.push(l);
  }
  if (cur) atos.push(cur);
  // resolução, decisão e instrução normativa só contam quando são o ato em si (com "RESOLVE" ou artigos), não citação num parecer
  return atos.map(analisar).filter((a) => a.texto.length > 40 && (/^(PORTARIA|ATO)/.test(a.tipo) || /RESOLVE|Art\. ?1[º°o]?/.test(a.texto.slice(0, 600))));
}

function analisar(a) {
  const texto = a.linhas.join(" ").replace(/\s+/g, " ").trim(), T = norm(texto);
  const data = dataPt(a.cab) || dataPt(texto.slice(0, 200));
  const aut = (texto.match(/^(O|A)\s+([A-ZÀ-Ý][A-ZÀ-Ý\s-]{5,}?)\s+DA ASSEMBLEIA LEGISLATIVA/) || [])[2] || (/^A MESA DA ASSEMBLEIA/i.test(texto) ? "MESA" : null);
  const depois = T.split("RESOLVE")[1] || T;
  // formas que não começam por verbo no infinitivo: "ficam designados" (fiscais de contrato), "fica revogada", "concede"
  const extra = [[/FICA(?:M)? DESIGNAD/, "DESIGNAR"], [/FICA(?:M)? REVOGAD/, "REVOGAR"], [/\bCONCEDE\b/, "CONCEDER"], [/FISCALIZAR A EXECU[ÇC][ÃA]O DO CONTRATO/, "FISCAL DE CONTRATO"]].filter(([r]) => r.test(depois)).map(([, v]) => v);
  const acoes = [...new Set(extra.concat(ACOES.filter((v) => new RegExp("(^|[\\s:;.(])" + norm(v) + "([\\s,:;.]|$)").test(depois)).map((v) => v.replace(/^ALTERAR O NÍVEL$/, "ALTERAR NÍVEL").replace("COLOCAR A DISPOSIÇÃO", "COLOCAR À DISPOSIÇÃO"))))].filter((v, i, A) => !(v === "ALTERAR" && A.some((w) => w !== v && w.startsWith("ALTERAR"))));
  // pessoas: "FULANO DE TAL, matrícula nº 1234" e linhas de tabela "1234 FULANO DE TAL PL/GAL-79 PL/GAL-86"
  const pes = []; const vistos = new Set();
  for (const m of texto.matchAll(/([A-ZÀ-Ý][A-ZÀ-Ý'´`\s.-]{4,}?),?\s+matr[íi]cula\s+n?[°º.]*\s*([\d.]{3,7})/g)) { const mat = String(+m[2].replace(/\./g, "")); if (vistos.has(mat)) continue; vistos.add(mat); pes.push({ matricula: mat, nome: m[1].replace(/^(?:O|A|OS|AS)\s+(?:SERVIDOR[A]?|SENHOR[A]?)\s+/i, "").replace(/^(?:servidor[a]?|senhor[a]?)\s+/i, "").trim() }); }
  for (const m of texto.matchAll(/(?:^|\s)(\d{3,6})\s+([A-ZÀ-Ý][A-ZÀ-Ý'\s.-]{5,}?)\s+(PL\/[A-Z]{2,4}-?\d{0,3})(?:\s+(PL\/[A-Z]{2,4}-?\d{0,3}))?/g)) { const mat = String(+m[1]); if (vistos.has(mat)) continue; vistos.add(mat); pes.push({ matricula: mat, nome: m[2].trim(), nivel_de: m[4] ? m[3] : null, nivel: m[4] || m[3] }); }
  // nomeação de quem ainda não tem matrícula: "NOMEAR FULANO DE TAL, para exercer o cargo…"
  for (const m of texto.matchAll(/NOMEAR\s+(?:o|a)?\s*([A-ZÀ-Ý][A-ZÀ-Ý'\s.-]{5,}?),\s+para exercer/g)) { const nm = m[1].trim(); if (!pes.some((p) => p.nome === nm)) pes.push({ matricula: null, nome: nm }); }
  // tabelas "abaixo relacionados": linhas "matrícula NOME" mesmo sem código de nível
  const tab = texto.split(/abaixo relacionad[oa]s/i)[1];
  if (tab) for (const m of tab.matchAll(/(?:^|\s)(\d{3,6})\s+((?:(?!PL[A-Z]*\/)[A-ZÀ-Ý][A-ZÀ-Ý'.-]+\s*){2,8}?)(?:\s+(PL\/?[A-Z]{2,4}[\/-]?\d{1,3}))?(?=\s+(?:\d{3,6}\s|[A-Z][a-zà-ÿ]|$))/g)) { const mat = String(+m[1]); if (vistos.has(mat)) continue; vistos.add(mat); pes.push({ matricula: mat, nome: m[2].trim(), nivel: m[3] ? m[3].replace(/^PL\/?([A-Z]+)[\/-]?(\d+)$/, "PL/$1-$2") : null }); }
  const cod = [...new Set([...texto.matchAll(/c[óo]digo\s+(PL\/[A-Z]{2,4}(?:-\d{1,3})?)/gi)].map((m) => m[1]))];
  const cargo = (texto.match(/(?:cargo|fun[çc][ãa]o)(?: de provimento em comiss[ãa]o)? de ([^,]{3,80}?),\s*c[óo]digo/i) || [])[1] || null;
  const efeito = dataPt((texto.match(/a contar de ([^,.;)]{6,40})/i) || [])[1]);
  const lot = [...new Set([...texto.matchAll(/\((LIDERAN[ÇC]A [^)]{2,60}|GAB(?:INETE)? [^)]{2,80}|[A-Z]{2,4} - [^)]{3,80})\)/g), ...texto.matchAll(/\bna ([A-Z]{2,5} - [A-ZÀ-Ý ,-]{4,90}?)(?:,| a contar)/g)].map((m) => m[1].trim()))];
  const sei = [...new Set([...texto.matchAll(/Processo SEI\s*(?:n[°º.]*)?\s*([\d.\-\/]+)/gi)].map((m) => m[1].replace(/[.\-\/]+$/, "")))];
  const disp = /DISPOSI[ÇC][ÃA]O|CEDID|CESS[ÃA]O/.test(T);
  return { tipo: a.tipo, numero: a.numero, ano_num: a.ano_num, data, autoridade: aut, acoes, pessoas: pes, codigos: cod, cargo, efeito, lotacoes: lot, sei, disposicao: disp, texto: texto.slice(0, 6000) };
}

async function baixar(n, u) {
  const pdf = path.join(CACHE, "pdf", n + ".pdf"), txt = path.join(CACHE, "txt", n + ".txt");
  if (!fs.existsSync(txt)) {
    if (!fs.existsSync(pdf)) { const r = await fetch(u); if (!r.ok) throw new Error(n + " HTTP " + r.status); fs.writeFileSync(pdf, Buffer.from(await r.arrayBuffer())); }
    fs.writeFileSync(txt, execFileSync(BIN, [pdf], { maxBuffer: 1 << 28 }).toString());
    fs.unlinkSync(pdf); // o PDF não precisa ficar: o texto basta
  }
  return fs.readFileSync(txt, "utf8");
}

const [arq, de, ate] = process.argv.slice(2), REANALISAR = process.env.REANALISAR === "1", ED = JSON.parse(fs.readFileSync(arq, "utf8"));
const nums = Object.keys(ED).map(Number).filter((n) => (!de || n >= +de) && (!ate || n <= +ate)).sort((a, b) => b - a);
let tot = 0;
for (const n of nums) {
  const out = path.join(CACHE, "atos", n + ".json"); if (fs.existsSync(out) && !REANALISAR) continue; if (REANALISAR && !fs.existsSync(path.join(CACHE, "txt", n + ".txt"))) continue;
  try { const atos = separarAtos(await baixar(String(n), ED[n].u)); fs.writeFileSync(out, JSON.stringify({ edicao: n, data: ED[n].d, url: ED[n].u, atos })); tot += atos.length; process.stdout.write(`${n}: ${atos.length} atos\n`); }
  catch (e) { process.stdout.write(`${n}: ERRO ${e.message}\n`); }
  if (!REANALISAR) await new Promise((r) => setTimeout(r, 400)); // gentil com o site da ALESC
}
console.log("total de atos novos:", tot);
