// Texto dos projetos em tramitação nas comissões (18/11/2026), base dos resumos do painel Processo Legislativo › Comissões.
// Para cada proposição de dados/painel/alesc-comissoes-tram.json ainda sem texto no cache: lê a aba Documentos do e-Legis,
// guarda a lista de documentos (nome, tipo, data) e baixa o "Projeto Original" (PDF), extraindo o texto com o PDFKit do macOS
// (pdftexto.swift). Fica só no computador: ferramentas/comissoes/_cache/textos/{id}.json (fora do git).
// Uso: node ferramentas/comissoes/textos.mjs [--max N]   · uma consulta por vez, com pausa (~2 por proposição nova)
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), CACHE = join(AQUI, "_cache/textos"), TMP = join(AQUI, "_cache/pdf");
mkdirSync(CACHE, { recursive: true }); mkdirSync(TMP, { recursive: true });
const EL = "https://portalelegis.alesc.sc.gov.br", UA = { "User-Agent": "Mozilla/5.0 (Macintosh) SimulaLEGIS-pesquisa (painel de comissões; poucas consultas)" };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), log = (s) => console.log(`[${new Date().toLocaleTimeString("pt-BR")}] ${s}`);
async function pegar(u, bin) { for (let t = 1; t <= 3; t++) { try { const r = await fetch(u, { headers: UA, redirect: "follow" }); if (r.ok) return bin ? Buffer.from(await r.arrayBuffer()) : await r.text(); if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} em ${u}`); } catch (e) { if (t === 3) throw e; } await espera(2500 * t); } }
const limpa = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const iso = (br) => { const m = String(br || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const D = JSON.parse(readFileSync(join(RAIZ, "dados/painel/alesc-comissoes-tram.json"), "utf8"));
const max = +(process.argv[process.argv.indexOf("--max") + 1] || 0) || Infinity;
const falta = D.L.filter((x) => !existsSync(join(CACHE, x.id + ".json"))).slice(0, max);
log(`${falta.length} proposições sem texto (de ${D.L.length})`);
let n = 0, semPdf = 0;
for (const x of falta) { n++;
  try {
    const h = await pegar(`${EL}/proposicoes/${x.id}/documentos`); await espera(500);
    const docs = h.split('<li class="timeline-item').slice(1).map((b) => { const ps = [...b.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => limpa(m[1]));
      return { doc: (b.match(/href="\/documentos\/([A-Za-z0-9]+)"/) || [])[1], nome: ps[0] || "", tipo: limpa((b.match(/<span class="badge[^>]*>([\s\S]*?)<\/span>/) || [])[1]), d: iso(ps.find((p) => /\d{2}\/\d{2}\/\d{4}/.test(p))) }; }).filter((d) => d.doc);
    const pri = docs.find((d) => /projeto original/i.test(d.tipo)) || docs.find((d) => /mensagem|projeto|proposi/i.test(d.tipo + " " + d.nome)) || docs[0];
    let texto = "", pags = 0;
    if (pri) { const pdf = join(TMP, x.id + ".pdf"); writeFileSync(pdf, await pegar(`${EL}/documentos/${pri.doc}`, true)); await espera(500);
      try { texto = JSON.parse(execFileSync("swift", [join(AQUI, "pdftexto.swift"), pdf], { encoding: "utf8", maxBuffer: 64 << 20 }))[x.id] || ""; } catch (e) { texto = ""; }
      pags = (texto.match(/\f/g) || []).length; try { unlinkSync(pdf); } catch (e) {} }
    if (!texto) semPdf++;
    writeFileSync(join(CACHE, x.id + ".json"), JSON.stringify({ id: x.id, cod: `${x.tipo} ${x.num}/${x.ano}`, principal: pri ? pri.doc : null, docs, texto: texto.slice(0, 60000), lido: new Date().toISOString() }));
  } catch (e) { log(`${x.id}: ${String(e.message).slice(0, 120)}`); }
  if (n % 50 === 0) log(`${n}/${falta.length}`); }
log(`pronto: ${n} lidas · ${semPdf} sem texto (PDF de imagem ou sem documento)`);
