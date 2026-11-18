// Proposições que tramitam hoje nas comissões permanentes da ALESC (18/11/2026), para o painel Processo Legislativo ›
// Comissões. Fonte: e-Legis (portalelegis.alesc.sc.gov.br): a lista de proposições não arquivadas (setor e situação
// atuais) e, de cada uma que está numa comissão, as abas Tramitações (datas e caminho entre setores) e Comissões a
// tramitar (o caminho das comissões, com relator, data de distribuição, conclusão e parecer).
// Uso: node ferramentas/comissoes/tramitacao.mjs   → dados/painel/alesc-tramitacao.json (cache em _cache/prop/)
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), CACHE = join(AQUI, "_cache/prop");
mkdirSync(CACHE, { recursive: true });
const EL = "https://portalelegis.alesc.sc.gov.br", UA = { "User-Agent": "Mozilla/5.0 (Macintosh) SimulaLEGIS-pesquisa (painel de comissões; poucas consultas)" };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms)), log = (s) => console.log(`[${new Date().toLocaleTimeString("pt-BR")}] ${s}`);
async function pegar(u) { for (let t = 1; t <= 3; t++) { try { const r = await fetch(u, { headers: UA, redirect: "follow" }); if (r.ok) return await r.text(); if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} em ${u}`); } catch (e) { if (t === 3) throw e; } await espera(2500 * t); } }
const ent = (s) => String(s || "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const limpa = (s) => ent(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const iso = (br) => { const m = String(br || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };

// 1) lista de proposições não arquivadas (10 por página)
const LISTA = [];
for (let pg = 1, tot = 1; pg <= tot; pg++) {
  const h = await pegar(`${EL}/proposicoes/processo-legislativo?arquivados=0&page=${pg}`);
  const n = limpa(h).match(/Exibindo \d+ - \d+ de ([\d.]+)/); if (n) tot = Math.ceil(+n[1].replace(/\./g, "") / 10);
  for (const c of h.split('<div class="card card-alesc mb-3">').slice(1)) {
    const id = (c.match(/href="\/proposicoes\/([A-Za-z0-9]{5})"/) || [])[1]; if (!id) continue;
    const campo = (k) => limpa((c.match(new RegExp(`${k}\\s*</[^>]+>([\\s\\S]*?)(?:</div>\\s*</div>|</dd>)`)) || [])[1]);
    const t = c.replace(/<[^>]+>/g, "\n").split("\n").map((x) => limpa(x)).filter(Boolean);
    const pega = (rot) => { const i = t.indexOf(rot); return i >= 0 ? t[i + 1] : null; };
    LISTA.push({ id, cod: t[0], ementa: t[1], entrada: iso(pega("Entrada")), autoria: pega("Autoria"), setor: pega("Setor atual"), situacao: pega("Situação atual") }); }
  if (pg % 25 === 0) log(`lista: página ${pg}/${tot}`); await espera(600); }
log(`lista: ${LISTA.length} proposições não arquivadas`);

// 2) detalhes das que estão numa comissão
const EMCOM = LISTA.filter((p) => /^Comiss[ãa]o/i.test(p.setor || ""));
log(`em comissão: ${EMCOM.length}`);
let i = 0;
for (const p of EMCOM) { i++;
  const arq = join(CACHE, p.id + ".json"); let D = existsSync(arq) ? JSON.parse(readFileSync(arq, "utf8")) : null;
  if (!D || D.setor !== p.setor || D.situacao !== p.situacao) {
    const tr = await pegar(`${EL}/proposicoes/${p.id}/tramitacoes`); await espera(500); const ct = await pegar(`${EL}/proposicoes/${p.id}/comissoes-tramitar`); await espera(500);
    // tramitações: cada item tem a situação, a data e o caminho origem › destino
    const T = []; for (const li of tr.split('<li class="timeline-item').slice(1)) { const sit = limpa((li.match(/<p class="mb-1 fw-bold">([\s\S]*?)<\/p>/) || [])[1]), d = iso((li.match(/<small>\s*(\d{2}\/\d{2}\/\d{4})\s*<\/small>/) || [])[1]);
      const sm = [...li.matchAll(/<small class="text-center">([\s\S]*?)<\/small>/g)].map((x) => limpa(x[1])); T.push({ sit, d, de: sm[0] || null, para: sm[1] || null }); }
    // comissões a tramitar: nome, relatores (nome, distribuído, concluído) e parecer
    const C = []; for (const li of ct.split('<li class="timeline-item').slice(1)) { const nome = limpa((li.match(/<p class="mb-2 fw-bold">([\s\S]*?)<\/p>/) || [])[1]); if (!nome) continue;
      const rows = [...li.matchAll(/<div class="row">\s*<div class="col-4 col-lg-8 text-nowrap">([\s\S]*?)<\/div>\s*<div class="col-4 col-lg-2 text-nowrap">([\s\S]*?)<\/div>\s*<div class="col-4 col-lg-2 text-nowrap">([\s\S]*?)<\/div>/g)].map((r) => ({ relator: limpa(r[1]), dist: iso(r[2]), concl: iso(r[3]) }));
      const pb = li.match(/<div class="flex-grow-1">\s*<strong>([\s\S]*?)<\/strong>(?:<br>)?\s*<em[^>]*>([\s\S]*?)<\/em>\s*<\/div>\s*<div class="text-end">([\s\S]*?)<\/div>/);
      const parecer = pb && limpa(pb[1]) !== "-" ? { res: limpa(pb[1]), txt: limpa(pb[2]), d: iso(pb[3]) } : null;
      C.push({ nome, aguarda: /aguardando distribui/i.test(li), relatores: rows, parecer }); }
    D = { ...p, tram: T, comissoes: C }; writeFileSync(arq, JSON.stringify(D)); }
  Object.assign(p, D);
  if (i % 25 === 0) log(`detalhes: ${i}/${EMCOM.length}`); }

writeFileSync(join(RAIZ, "dados/painel/alesc-tramitacao.json"), JSON.stringify({ fonte: "ALESC — e-Legis (portalelegis.alesc.sc.gov.br): proposições não arquivadas, abas Tramitações e Comissões a tramitar", gerado: new Date().toISOString(), total_nao_arquivadas: LISTA.length, proposicoes: EMCOM }));
log(`ok: ${EMCOM.length} proposições em comissão → dados/painel/alesc-tramitacao.json`);
