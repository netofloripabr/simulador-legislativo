// Comissões permanentes da ALESC na 20ª legislatura (16/11/2026): composição atual, partido de cada membro, reuniões
// desde 01/02/2023 e relatorias (lidas das pautas em PDF, onde as matérias vêm agrupadas por "DEPUTADO <relator>").
// Fontes: portalelegis.alesc.sc.gov.br (comissões, agenda e pautas) e alesc.sc.gov.br/deputados (partido atual).
// Uso: node ferramentas/comissoes/coletar.mjs            → composição + agenda + baixa as pautas que faltam (cache)
//      swift ferramentas/comissoes/pdftexto.swift ...   → (chamado daqui) extrai o texto das pautas
// Saída: dados/painel/alesc-comissoes.json. Ritmo educado: uma página por vez, 0,7 s entre pedidos.
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), CACHE = join(AQUI, "_cache"), PDFS = join(CACHE, "pautas");
mkdirSync(PDFS, { recursive: true });
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh) SimulaLEGIS-pesquisa (relatorio de comissoes; poucas consultas)" };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function pegar(u, h = {}, bin = false) { for (let t = 1; t <= 3; t++) { try { const r = await fetch(u, { headers: { ...UA, ...h } }); if (r.ok) return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} em ${u}`); } catch (e) { if (t === 3) throw e; } await espera(2000 * t); } }
const limpa = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const iso = (br) => { const m = String(br).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const EL = "https://portalelegis.alesc.sc.gov.br", INICIO = "2023-02-01", HOJE = new Date().toISOString().slice(0, 10);
const log = (s) => console.log(`[${new Date().toLocaleTimeString("pt-BR")}] ${s}`);

// partido atual de cada deputado em exercício
async function partidos() {
  const h = await pegar("https://www.alesc.sc.gov.br/deputados/"), L = limpa(h.replace(/<[^>]+>/g, "\n")).split(/\s{2,}|\n/);
  const t = h.replace(/<[^>]+>/g, "\n").split("\n").map((x) => limpa(x)).filter(Boolean), P = {};
  const SIG = /^(MDB|Novo|PDT|PL|Podemos|PP|PRD|PSD|PSDB|PSOL|PT|Republicanos|União Brasil|PSB|Cidadania|Rede|Avante|PV|PCdoB|Solidariedade)$/;
  for (let i = 1; i < t.length; i++) if (SIG.test(t[i]) && t[i - 1].length < 40 && !SIG.test(t[i - 1]) && !/partidos/i.test(t[i - 1])) P[t[i - 1]] = t[i];
  return P; }

// composição atual (presidente, vice, membros)
async function composicao() {
  const h = await pegar(`${EL}/comissoes-permanentes`), C = {};
  for (const m of h.matchAll(/href="\/comissoes-permanentes\/([A-Za-z0-9]{5})"\s+data-title="([^"]+)"/g)) {
    await espera(700); const x = await pegar(`${EL}/comissoes-permanentes/${m[1]}`, { "X-Requested-With": "XMLHttpRequest" });
    const R = { id: m[1], presidente: null, vice: null, membros: [] };
    for (const dl of x.matchAll(/<dt>([\s\S]*?)<\/dt>([\s\S]*?)<\/dl>/g)) { const papel = limpa(dl[1]), nomes = [...dl[2].matchAll(/<dd>([\s\S]*?)<\/dd>/g)].map((y) => limpa(y[1])).filter(Boolean);
      if (/^Presidente$/i.test(papel)) R.presidente = nomes[0] || null; else if (/^Vice/i.test(papel)) R.vice = nomes[0] || null; else R.membros.push(...nomes); }
    C[limpa(m[2])] = R; }
  return C; }

// agenda das comissões desde o início da legislatura (cada registro: data, título, cancelado, pauta)
async function agenda() {
  const L = []; let tot = 1;
  for (let pg = 1; pg <= tot; pg++) {
    const h = await pegar(`${EL}/comissoes-permanentes/agenda/pesquisar?q=&inicio=${INICIO}&fim=${HOJE}&page=${pg}`);
    const n = limpa(h).match(/Exibindo \d+ - \d+ de ([\d.]+)/); if (n) tot = Math.ceil(+n[1].replace(/\./g, "") / 20);
    for (const c of h.split('<div class="card card-alesc mb-3">').slice(1).filter((c) => /<h6 class="mb-1">/.test(c))) {
      const t = limpa((c.match(/<h6 class="mb-1">([\s\S]*?)<\/h6>/) || [])[1]), d = iso((c.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0]), hs = [...c.matchAll(/(\d{2}:\d{2})/g)].map((x) => x[1]);
      const anexos = [...c.matchAll(/href="\/comissoes-permanentes\/agenda\/anexo\/([0-9a-f-]{36})"[^>]*>(?:<strong>)?([^<]*)/g)].map((x) => ({ id: x[1], nome: limpa(x[2]) }));
      L.push({ d, h: hs[0] || null, t, cancelado: /Cancelad/i.test(limpa(c)), anexos }); }
    if (pg % 10 === 0) log(`agenda: página ${pg}/${tot}`); await espera(700); }
  return L; }

const P = await partidos(); log(`partidos: ${Object.keys(P).length} deputados`);
const C = await composicao(); log(`composição: ${Object.keys(C).length} comissões`);
const A = await agenda(); log(`agenda: ${A.length} registros`);
// pautas: baixa só as que ainda não estão no cache
const ids = [...new Set(A.filter((a) => !a.cancelado && /Comiss/i.test(a.t)).flatMap((a) => a.anexos.map((x) => x.id)))];
let novos = 0; for (const id of ids) { const f = join(PDFS, id + ".pdf"); if (existsSync(f)) continue; try { writeFileSync(f, await pegar(`${EL}/comissoes-permanentes/agenda/anexo/${id}`, {}, true)); novos++; } catch (e) { log(`pauta ${id} falhou: ${e.message}`); } if (novos % 50 === 0 && novos) log(`pautas: ${novos} baixadas`); await espera(700); }
log(`pautas: ${ids.length} no total, ${novos} novas`);
// texto das pautas (PDFKit do macOS), guardado em cache
const TX = join(CACHE, "pautas-texto.json"), T = existsSync(TX) ? JSON.parse(readFileSync(TX, "utf8")) : {};
const faltam = ids.filter((id) => !(id in T) && existsSync(join(PDFS, id + ".pdf")));
for (let i = 0; i < faltam.length; i += 100) { const lote = faltam.slice(i, i + 100), out = execFileSync("swift", [join(AQUI, "pdftexto.swift"), ...lote.map((id) => join(PDFS, id + ".pdf"))], { maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "ignore"] }).toString();
  Object.assign(T, JSON.parse(out)); log(`texto: ${Math.min(i + 100, faltam.length)}/${faltam.length}`); }
writeFileSync(TX, JSON.stringify(T));
writeFileSync(join(CACHE, "bruto.json"), JSON.stringify({ gerado: new Date().toISOString(), partidos: P, comissoes: C, agenda: A }));
log("bruto salvo em ferramentas/comissoes/_cache/bruto.json — agora: node ferramentas/comissoes/consolidar.mjs");
