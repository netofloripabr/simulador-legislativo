// Rotina automática de servidores da ALESC (04/11/2026). Roda neste Mac (tarefa agendada), sem ninguém por perto.
//   node ferramentas/diario/rotina.mjs diario   → todo dia às 22h30: edições novas do Diário da Assembleia → atos no banco
//   node ferramentas/diario/rotina.mjs portal   → todo dia 10: lista de servidores e contracheques do portal da
//                                                 transparência → banco; regera e publica dados/painel/estrutura-casa.json
// Chave de carga: ferramentas/diario/_cache/chave-rotina (1 ano; o banco guarda só o hash em adm_carga_chaves).
// Avisa os administradores no sino do app (adm_rotina_aviso, migração 95). Log em _cache/rotina.log.
// Tamanho (REGRA DE OURO, aprovado em 04/11/2026): Diário ~30 KB/dia gravados; portal ~2 MB/mês; egress quase zero.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";

const DIR = path.dirname(new URL(import.meta.url).pathname), RAIZ = path.resolve(DIR, "../.."), CACHE = path.join(DIR, "_cache");
const cfg = fs.readFileSync(path.join(RAIZ, "nuvem/config.js"), "utf8"), URL_ = cfg.match(/SUPABASE_URL = "([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)[1];
const ARQ_CHAVE = "chave-rotina", CHAVE = fs.readFileSync(path.join(CACHE, ARQ_CHAVE), "utf8").trim();
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh) SimulaLEGIS-rotina" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG = path.join(CACHE, "rotina.log"), log = (s) => { const l = `[${new Date().toLocaleString("pt-BR")}] ${s}`; console.log(l); fs.appendFileSync(LOG, l + "\n"); };
const lerJ = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(CACHE, f), "utf8")); } catch (e) { return d; } };
const gravarJ = (f, v) => fs.writeFileSync(path.join(CACHE, f), JSON.stringify(v));
async function rpc(fn, body) { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); if (!r.ok) throw new Error(`${fn}: ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : null; }
async function pegar(u, h = {}) { for (let t = 1; t <= 4; t++) { try { const r = await fetch(u, { headers: { ...UA, ...h } }); if (r.ok) return await r.text(); if (r.status < 500 && r.status !== 429) throw new Error(u + " HTTP " + r.status); } catch (e) { if (t === 4) throw e; } await espera(3000 * t); } }
const node = (args) => execFileSync(process.execPath, args, { cwd: RAIZ, stdio: "inherit", env: { ...process.env, CARGA_CHAVE_ARQ: ARQ_CHAVE } });
const aviso = (titulo, texto) => rpc("adm_rotina_aviso", { p_chave: CHAVE, p_titulo: titulo, p_texto: texto }).catch((e) => log("aviso falhou: " + e.message));

// ---------- Diário: lista oficial → edições que faltam → atos → banco ----------
async function diario() {
  const ED = lerJ("edicoes.json", {}), novas = [];
  for (let pg = 1; pg <= 10; pg++) {   // a 1ª página tem as 5 últimas; continua só se todas forem novas (computador desligado uns dias)
    const h = await pegar(`https://www.alesc.sc.gov.br/diario-da-assembleia/${pg > 1 ? `page/${pg}/` : ""}`);
    const cards = [...h.matchAll(/<article class="diario-card[\s\S]*?<\/article>/g)].map((m) => m[0]); let conhecida = false;
    for (const c of cards) { const u = (c.match(/href="(https:\/\/www\.alesc\.sc\.gov\.br\/[^"]+?(\d+)diaicp\.pdf)"/) || []), d = (c.match(/Publicação:\s*(\d{2}\/\d{2}\/\d{4})/) || [])[1];
      if (!u[1]) continue; const n = u[2]; if (ED[n]) { conhecida = true; continue; }
      ED[n] = { u: u[1], ano: d ? +d.slice(-4) : new Date().getFullYear(), d: d || null }; novas.push(+n); }
    if (conhecida || !cards.length) break; await espera(1500);
  }
  gravarJ("edicoes.json", ED);
  // edições recentes ainda sem leitura (as novas e alguma que falhou antes)
  const ult = Math.max(...Object.keys(ED).map(Number)), falta = Object.keys(ED).map(Number).filter((n) => n > ult - 30 && !fs.existsSync(path.join(CACHE, "atos", n + ".json"))).sort((a, b) => a - b);
  if (!falta.length) { log("Diário: nenhuma edição nova"); return; }
  log("Diário: lendo " + falta.join(", "));
  for (const n of falta) { try { node([path.join(DIR, "ler_diario.mjs"), path.join(CACHE, "edicoes.json"), String(n), String(n)]); } catch (e) { log(`Diário ${n}: falhou a leitura (${e.message})`); } }
  const lidas = falta.filter((n) => fs.existsSync(path.join(CACHE, "atos", n + ".json"))); if (!lidas.length) return;
  node([path.join(DIR, "carregar.mjs"), "atos", String(lidas[0])]);
  // resumo para o sino: quantos atos e o que fazem
  const C = {}; let tot = 0, pes = 0;
  for (const n of lidas) { const J = JSON.parse(fs.readFileSync(path.join(CACHE, "atos", n + ".json"), "utf8")); for (const a of J.atos || []) { tot++; pes += (a.pessoas || []).length; for (const x of a.acoes || []) C[x] = (C[x] || 0) + 1; } }
  const top = Object.entries(C).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ");
  log(`Diário: ${lidas.join(", ")} · ${tot} atos · ${pes} pessoas`);
  if (tot) await aviso(`Diário ${lidas.map((n) => n.toLocaleString("pt-BR")).join(", ")}: ${tot} ato${tot === 1 ? "" : "s"}`, `${top || "sem verbos reconhecidos"} · ${pes} pessoa${pes === 1 ? "" : "s"} citada${pes === 1 ? "" : "s"}. Ver painel admin › Servidores.`);
}

// ---------- Portal: lista + contracheques → banco → estrutura da Casa publicada ----------
const txt = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
function lerContracheque(h) {
  const ref = (h.match(/Referência\s*(\d{2}\/\d{4})/) || [])[1], i = h.indexOf("<tbody>"), j = h.indexOf("</tbody>", i); if (!ref || i < 0) return null;
  const rows = []; let g = "";
  for (const tr of h.slice(i, j).match(/<tr[\s\S]*?<\/tr>/g) || []) { const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(txt); if (td.length < 3) continue;
    if (/cc-secao/.test(tr)) { g = td[0]; continue; } if (/cc-total/.test(tr)) { rows.push(["", td[0], td[1], td[2]]); continue; } rows.push([g, td[0], td[1], td[2]]); }
  return { ref, rows };
}
async function portal() {
  const antes = lerJ("portal-lista.json", []), L = [];
  const p1 = await pegar("https://transparencia.alesc.sc.gov.br/servidores?page=1"), np = +((p1.match(/Página 1 de (\d+)/) || [])[1] || 0); if (!np) throw new Error("portal: não achei o número de páginas");
  for (let pg = 1; pg <= np; pg++) { const h = pg === 1 ? p1 : await pegar(`https://transparencia.alesc.sc.gov.br/servidores?page=${pg}`);
    const tb = h.slice(h.indexOf("<tbody>"), h.indexOf("</tbody>"));
    for (const tr of tb.match(/<tr>[\s\S]*?<\/tr>/g) || []) { const td = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(txt), m = (tr.match(/contracheque\/(\d+)/) || [])[1] || "";
      if (td.length >= 3) L.push([m, td[0], td[1] || "—", td[2] || "—"]); }
    if (pg % 20 === 0) log(`portal: página ${pg} de ${np}`); await espera(400); }
  if (L.length < antes.length * 0.8) throw new Error(`portal: lista veio com ${L.length} pessoas (antes ${antes.length}) — parei para não marcar saídas falsas`);
  const CC = {}, ms = L.map((x) => x[0]).filter(Boolean); let k = 0;
  const trab = async () => { while (k < ms.length) { const m = ms[k++]; try { const c = lerContracheque(await pegar(`https://transparencia.alesc.sc.gov.br/servidores/contracheque/${m}`, { "X-Requested-With": "XMLHttpRequest" })); if (c) CC[m] = c; } catch (e) { log(`contracheque ${m}: ${e.message}`); } await espera(250); } };
  await Promise.all([trab(), trab(), trab()]);
  const ref = Object.values(CC).map((c) => c.ref).sort().reverse()[0];
  if (fs.existsSync(path.join(CACHE, "portal-lista.json"))) fs.copyFileSync(path.join(CACHE, "portal-lista.json"), path.join(CACHE, "portal-lista.anterior.json"));
  gravarJ("portal-lista.json", L); gravarJ("portal-contracheques.json", CC);
  log(`portal: ${L.length} pessoas, ${Object.keys(CC).length} contracheques (${ref})`);
  node([path.join(DIR, "carregar.mjs"), "servidores"]); node([path.join(DIR, "carregar.mjs"), "contracheques"]);
  const agora = new Set(L.map((x) => +x[0])), saiu = antes.map((x) => +x[0]).filter((m) => m && !agora.has(m));
  const ns = saiu.length ? await rpc("adm_rotina_saidas", { p_chave: CHAVE, p_matriculas: saiu }) : 0;
  const entrou = L.filter((x) => x[0] && !new Set(antes.map((y) => +y[0])).has(+x[0])).length;
  // estrutura da Casa: chaves anônimas das pessoas (inclusive as novas) → regera o arquivo público → publica
  const CH = await rpc("adm_rotina_chaves", { p_chave: CHAVE }); if (!CH || Object.keys(CH).length < 500) throw new Error("chaves anônimas vieram incompletas"); gravarJ("chaves-estrutura.json", CH);
  execFileSync("python3", [path.join(RAIZ, "ferramentas/estrutura_casa.py"), ref], { cwd: RAIZ, stdio: "inherit" });
  publicar(`Parlamentares · estrutura da Casa com o portal de ${ref} (rotina mensal)`);
  await aviso(`Portal da transparência ${ref}`, `${L.length} pessoas na lista (${entrou} entraram, ${saiu.length} saíram; ${ns} marcadas como fora do portal) · ${Object.keys(CC).length} contracheques. Estrutura da Casa atualizada.`);
}
function publicar(msg) {
  const g = (a) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8", env: { ...process.env, GIT_SSH_COMMAND: `ssh -o ConnectTimeout=20 -o Hostname=ssh.github.com -p 443 -o UserKnownHostsFile=${path.join(CACHE, "known_hosts_github")} -o StrictHostKeyChecking=yes` } });
  if (!g(["status", "--porcelain", "dados/painel/estrutura-casa.json"]).trim()) { log("estrutura: sem mudança"); return; }
  g(["add", "dados/painel/estrutura-casa.json"]); g(["commit", "-m", msg, "--", "dados/painel/estrutura-casa.json"]);
  try { g(["push", "-q", "origin", "HEAD:main"]); log("estrutura: publicada"); } catch (e) { log("estrutura: commit feito, push falhou (" + String(e.message).slice(0, 120) + ")"); }
}

const modo = process.argv[2];
try { if (modo === "diario") await diario(); else if (modo === "portal") await portal(); else { console.log("uso: rotina.mjs diario|portal"); process.exit(1); } }
catch (e) { log(`${modo}: ERRO ${e.message}`); await aviso(`Rotina ${modo}: falhou`, String(e.message).slice(0, 400)); process.exit(1); }
