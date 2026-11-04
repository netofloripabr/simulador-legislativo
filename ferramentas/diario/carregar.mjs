// Carga dos servidores (portal da transparência) e dos atos do Diário da Assembleia no banco (migrações 89 e 90).
// Envia o que ler_diario.mjs e a leitura do portal deixaram em ferramentas/diario/_cache/ pela função adm_carga,
// com a chave temporária guardada em _cache/chave (o banco só tem o hash dela, com validade). Idempotente: pode rodar
// de novo — o que já existe não duplica. Uso:
//   node ferramentas/diario/carregar.mjs              → servidores, contracheques e todos os atos lidos
//   node ferramentas/diario/carregar.mjs atos 9100    → só atos das edições a partir da 9100 (e a releitura das ações)
import fs from "node:fs"; import path from "node:path";
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), DIR = path.join(RAIZ, "ferramentas/diario/_cache");
const cfg = fs.readFileSync(path.join(RAIZ, "nuvem/config.js"), "utf8"), URL_ = cfg.match(/SUPABASE_URL = "([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)[1];
const CHAVE = fs.readFileSync(path.join(DIR, "chave"), "utf8").trim();
const [so, desde] = process.argv.slice(2);
async function enviar(tipo, dados) {
  for (let t = 1; t <= 3; t++) {
    const r = await fetch(`${URL_}/rest/v1/rpc/adm_carga`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_chave: CHAVE, p_tipo: tipo, p_dados: dados }) });
    if (r.ok) return +(await r.text()) || 0;
    const e = await r.text(); if (t === 3 || /inválida|vencida/.test(e)) throw new Error(`${tipo}: ${r.status} ${e.slice(0, 200)}`);
    await new Promise((s) => setTimeout(s, 2000 * t));
  }
}
const lote = async (tipo, L, tam) => { let n = 0; for (let i = 0; i < L.length; i += tam) { n += await enviar(tipo, L.slice(i, i + tam)); process.stdout.write(`\r${tipo}: ${Math.min(i + tam, L.length)}/${L.length}`); } console.log(` → ${n} gravados`); return n; };
const dataBr = (d) => { const m = String(d || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const num = (s) => +String(s || "").replace(/[R$\s.]/g, "").replace(",", ".") || null;
const hoje = new Date().toISOString().slice(0, 10);

const LISTA = fs.existsSync(path.join(DIR, "portal-lista.json")) ? JSON.parse(fs.readFileSync(path.join(DIR, "portal-lista.json"), "utf8")) : [];
const naLista = new Set(LISTA.map((t) => +t[0]));
if (!so || so === "servidores") await lote("servidores", LISTA.filter((t) => t[0]).map(([m, nome, vinc, lot]) => ({ m: +m, nome, vinc: vinc === "—" ? null : vinc, lot: lot === "—" ? null : lot, sit: /Aposentado/i.test(vinc) ? "aposentado" : "ativo", portal: true, visto: hoje })), 500);

if (!so || so === "contracheques") { const f = path.join(DIR, "portal-contracheques.json");
  if (fs.existsSync(f)) { const CC = JSON.parse(fs.readFileSync(f, "utf8")); const v = (R, k) => num((R.find((x) => x[1] === k) || [])[2]);
    await lote("contracheques", Object.entries(CC).filter(([, c]) => c && c.rows && c.ref).map(([m, c]) => ({ m: +m, ref: c.ref, linhas: c.rows, bruto: v(c.rows, "BRUTO"), liq: v(c.rows, "LÍQUIDO"), cargo: v(c.rows, "Cargo comissionado") })), 300); } }

if (!so || so === "atos") {
  const ED = JSON.parse(fs.readFileSync(path.join(DIR, "edicoes.json"), "utf8"));
  const arqs = fs.readdirSync(path.join(DIR, "atos")).filter((f) => f.endsWith(".json")).map((f) => +f.replace(".json", "")).filter((e) => !desde || e >= +desde).sort((a, b) => a - b);
  const A = [], fora = new Map();
  for (const e of arqs) { const J = JSON.parse(fs.readFileSync(path.join(DIR, "atos", e + ".json"), "utf8")), pub = dataBr((ED[e] || {}).d || J.data);
    for (const a of J.atos) { A.push({ edicao: e, publicado: pub, tipo: a.tipo, numero: a.numero, data: a.data, autoridade: a.autoridade, acoes: a.acoes, efeito: a.efeito, codigos: a.codigos, cargo: a.cargo, lotacoes: a.lotacoes, sei: a.sei, disposicao: a.disposicao, texto: a.texto, url: J.url, pessoas: a.pessoas });
      for (const p of a.pessoas || []) if (p.matricula && !naLista.has(+p.matricula)) { const d = a.efeito || a.data || pub || "", o = fora.get(+p.matricula); if (!o || d >= o.d) fora.set(+p.matricula, { nome: p.nome, d, sai: (a.acoes || []).some((x) => /EXONERAR|DEMITIR/.test(x)), ap: (a.acoes || []).includes("APOSENTAR") }); } } }
  // quem aparece nos atos mas não está mais no portal entra com a situação do último ato (não sobrescreve quem está no portal)
  await lote("servidores", [...fora.entries()].map(([m, o]) => ({ m, nome: o.nome, sit: o.ap ? "aposentado" : o.sai ? "exonerado" : "desconhecido", portal: false })), 500);
  await lote("atos", A, 150);
  // releitura: atualiza as ações dos atos que já estavam gravados (o leitor aprende verbos novos com o tempo)
  await lote("acoes", A.map((a) => ({ edicao: a.edicao, tipo: a.tipo, numero: a.numero, acoes: a.acoes, disposicao: a.disposicao, efeito: a.efeito })), 1000);
}
