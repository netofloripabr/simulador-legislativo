// Agenda da ALESC para a Agenda do Gabinete (14/11/2026, aprovada pelo usuário: "Sim, começar").
// Lê, das páginas públicas da Assembleia, os próximos 60 dias e grava dados/painel/agenda-alesc.json (arquivo público no
// GitHub Pages; nada vai para o Supabase):
//   · reuniões das comissões permanentes (portalelegis.alesc.sc.gov.br/comissoes-permanentes/agenda/pesquisar)
//   · composição de cada comissão (presidente, vice e membros), para o Gabinete mostrar só as do parlamentar
//   · sessões plenárias marcadas (portalelegis.alesc.sc.gov.br/sessoes-plenarias)
//   · agenda geral da Casa: sessões especiais e solenes, audiências, eventos externos, exposições (alesc.sc.gov.br/agenda)
// Uso: node ferramentas/agenda/agenda.mjs            (lê, grava o arquivo e publica se mudou)
//      node ferramentas/agenda/agenda.mjs --sem-publicar
// Roda junto da tarefa agendada "alesc-diario-servidores" (todo dia 22h30, neste Mac).
// Tamanho (REGRA DE OURO): ~40 páginas lidas por dia na ALESC (~6 MB baixados neste Mac, 1 pedido a cada 0,7 s);
// arquivo gerado ~30–60 KB; 1 commit por dia só quando muda; Supabase não é tocado.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";

const DIR = path.dirname(new URL(import.meta.url).pathname), RAIZ = path.resolve(DIR, "../.."), SAIDA = "dados/painel/agenda-alesc.json";
const CACHE = path.join(RAIZ, "ferramentas/diario/_cache"), LOG = path.join(CACHE, "rotina.log");
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh) SimulaLEGIS-agenda" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (s) => { const l = `[${new Date().toLocaleString("pt-BR")}] agenda: ${s}`; console.log(l); try { fs.appendFileSync(LOG, l + "\n"); } catch (e) {} };
async function pegar(u, h = {}) { for (let t = 1; t <= 3; t++) { try { const r = await fetch(u, { headers: { ...UA, ...h } }); if (r.ok) return await r.text(); if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} em ${u}`); } catch (e) { if (t === 3) throw e; } await espera(1500 * t); } }
const limpa = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const iso = (br) => { const m = String(br).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const hoje = new Date(), dia = (d) => d.toISOString().slice(0, 10), ate = new Date(hoje.getTime() + 60 * 864e5);
const EL = "https://portalelegis.alesc.sc.gov.br";

// ---------- comissões: composição ----------
async function comissoes() {
  const h = await pegar(`${EL}/comissoes-permanentes`), C = {};
  for (const m of h.matchAll(/href="\/comissoes-permanentes\/([A-Za-z0-9]{5})"\s+data-title="([^"]+)"/g)) {
    await espera(700); const x = await pegar(`${EL}/comissoes-permanentes/${m[1]}`, { "X-Requested-With": "XMLHttpRequest" });
    const R = { presidente: null, vice: null, membros: [] };
    for (const dl of x.matchAll(/<dt>([\s\S]*?)<\/dt>([\s\S]*?)<\/dl>/g)) { const papel = limpa(dl[1]), nomes = [...dl[2].matchAll(/<dd>([\s\S]*?)<\/dd>/g)].map((y) => limpa(y[1])).filter(Boolean);
      if (/^Presidente$/i.test(papel)) R.presidente = nomes[0] || null; else if (/^Vice/i.test(papel)) R.vice = nomes[0] || null; else R.membros.push(...nomes); }
    C[limpa(m[2])] = R; }
  return C; }

// ---------- comissões: reuniões dos próximos 60 dias ----------
async function reunioes() {
  const L = [];
  for (let pg = 1; pg <= 15; pg++) {
    const h = await pegar(`${EL}/comissoes-permanentes/agenda/pesquisar?q=&inicio=${dia(hoje)}&fim=${dia(ate)}&page=${pg}`);
    const cards = h.split('<div class="card card-alesc mb-3">').slice(1).filter((c) => /<h6 class="mb-1">/.test(c)); if (!cards.length) break;
    for (const c of cards) { const hs = [...c.matchAll(/(\d{2}:\d{2})/g)].map((x) => x[1]), d = iso((c.match(/\d{2}\/\d{2}\/\d{4}/) || [])[0]), t = limpa((c.match(/<h6 class="mb-1">([\s\S]*?)<\/h6>/) || [])[1]);
      const fx = limpa((c.match(/badge bg-secondary">([\s\S]*?)<\/div>/) || [])[1]), fim = (fx.match(/-\s*(\d{2}:\d{2})/) || [])[1] || null, pa = c.match(/href="(\/comissoes-permanentes\/agenda\/anexo\/[^"]+)"[^>]*><strong>([^<]+)/);
      const com = (t.match(/(Comiss[ãa]o [^,]+?)(?:\s+e\s+Comiss|$)/) || [])[1] || null, coms = [...t.matchAll(/Comiss[ãa]o (?:de |da |do |dos |das )[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^,]*?(?=,| e Comiss|$)/g)].map((x) => x[0].trim());
      if (d) L.push({ d, h: hs[0] || null, f: fim, t, local: limpa((c.match(/Local:\s*([\s\S]*?)<\/p>/) || [])[1]) || null, tipo: "comissao", com: coms.length ? coms : com ? [com] : [], pauta: pa ? { t: limpa(pa[2]), u: EL + pa[1] } : null }); }
    if (!/page=\d+[^"]*"[^>]*>\s*(›|&rsaquo;|Próxim)/i.test(h) && cards.length < 10) break; await espera(700); }
  return L; }

// ---------- plenário: sessões marcadas ----------
async function sessoes() {
  const h = await pegar(`${EL}/sessoes-plenarias`), t = limpa(h), L = [];
  for (const m of t.matchAll(/((?:\d+ª )?Sessão (?:Ordinária|Extraordinária|Especial|Solene)[^·]*?) (\d{2}\/\d{2}\/\d{4}) · (\d{2}:\d{2}) ([A-Za-zÀ-ú ]+?) (?:Expediente|Ordem do Dia|Comunicado|Presença|Ata|Pronunciamentos)/g)) {
    const d = iso(m[2]); if (!d || d < dia(hoje) || /Realizada/i.test(m[4])) continue; L.push({ d, h: m[3], t: m[1].trim(), local: "Plenário Deputado Osni Régis", tipo: "plenario", obs: m[4].trim() }); }
  return L; }

// ---------- agenda geral da Casa ----------
async function geral() {
  const L = []; let tot = 99;
  for (let pg = 1; pg <= Math.min(tot, 40); pg++) {
    const h = await pegar(`https://www.alesc.sc.gov.br/agenda/${pg > 1 ? `page/${pg}/` : ""}`); const n = h.match(/Página \d+ de (\d+)/); if (n) tot = +n[1];
    const arts = [...h.matchAll(/<article class="agenda-evento">([\s\S]*?)<\/article>/g)].map((x) => x[1]); if (!arts.length) break;
    for (const a of arts) { const d = iso(limpa((a.match(/agenda-evento-data">([\s\S]*?)</) || [])[1])); if (!d) continue;
      const lis = [...a.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => limpa(x[1]).replace(/^Local:\s*/, "")), t = limpa((a.match(/agenda-evento-titulo">([\s\S]*?)<\/h3>/) || [])[1]);
      const get = (rx) => (lis.find((x) => rx.test(x)) || "").replace(rx, "").trim() || null, local = lis[0] || null, periodo = get(/^Período:\s*/), hor = get(/^Horário:\s*/), un = get(/^Unidade requerente:\s*/);
      const cat = limpa((a.match(/agenda-evento-(?:categoria|tipo)[^>]*>([\s\S]*?)<\//) || [])[1]) || lis.filter((x) => !/^(Período|Horário|Unidade requerente):/.test(x)).slice(1).pop() || null;
      const ate2 = iso((periodo || "").split(/até/)[1] || ""), tipo = /sess[ãa]o/i.test(t) && /plen[áa]rio/i.test(local || "") ? "plenario" : /^Evento Externo/i.test(local || "") ? "externo" : /comiss[ãa]o/i.test(t) ? "comissao_casa" : "casa";
      L.push({ d, ate: ate2 && ate2 !== d ? ate2 : null, h: limpa((a.match(/agenda-evento-hora">([\s\S]*?)</) || [])[1]) || null, f: ((hor || "").match(/-\s*(\d{2}:\d{2})/) || [])[1] || null, t, local, tipo, cat: cat && cat !== local ? cat : null, un }); }
    await espera(700); }
  return L; }

const [C, R, S, G] = [await comissoes(), await reunioes(), await sessoes().catch((e) => { log("sessões: " + e.message); return []; }), await geral().catch((e) => { log("agenda geral: " + e.message); return []; })];
// a agenda geral repete reuniões de comissão e sessões já lidas no eLegis: fica a do eLegis
const chave = (e) => `${e.d} ${e.h}`, ja = new Set([...R, ...S].map(chave));
// exposições e eventos de vários dias vêm repetidos dia a dia na agenda geral: fica só a 1ª ocorrência
const vistos = new Set(), G2 = G.filter((e) => { if (!e.ate) return true; const k = e.t + "|" + e.ate; if (vistos.has(k)) return false; vistos.add(k); return true; });
const eventos = [...R, ...S, ...G2.filter((e) => !((e.tipo === "comissao_casa" || e.tipo === "plenario") && ja.has(chave(e))))].sort((a, b) => (a.d + (a.h || "")).localeCompare(b.d + (b.h || "")));
const novo = { fonte: "ALESC: portalelegis.alesc.sc.gov.br (comissões e sessões) e alesc.sc.gov.br/agenda", gerado: new Date().toISOString(), de: dia(hoje), ate: dia(ate), comissoes: C, eventos };
const arq = path.join(RAIZ, SAIDA), antes = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, "utf8")) : null;
const igual = antes && JSON.stringify({ ...antes, gerado: 0 }) === JSON.stringify({ ...novo, gerado: 0 });
fs.writeFileSync(arq, JSON.stringify(novo));
log(`${Object.keys(C).length} comissões, ${R.length} reuniões, ${S.length} sessões, ${G.length} da agenda geral → ${eventos.length} itens${igual ? " (sem mudança)" : ""}`);
// o aniversarios.py (rodado antes, na mesma tarefa) também grava dados/painel/sc-aniversarios.json: publica junto
const ANIV = "dados/painel/sc-aniversarios.json", gst = (f) => execFileSync("git", ["status", "--porcelain", f], { cwd: RAIZ, encoding: "utf8" }).trim();
const mudouAniv = !process.argv.includes("--sem-publicar") && !!gst(ANIV);
if (!process.argv.includes("--sem-publicar") && (!igual || mudouAniv)) {
  const g = (a) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8", env: { ...process.env, GIT_SSH_COMMAND: `ssh -o ConnectTimeout=20 -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o Hostname=ssh.github.com -p 443 -o UserKnownHostsFile=${path.join(CACHE, "known_hosts_github")} -o StrictHostKeyChecking=yes` } });
  const arqs = [...(!igual ? [SAIDA] : []), ...(mudouAniv ? [ANIV] : [])];
  g(["add", ...arqs]); g(["commit", "-m", `Agenda da ALESC: ${eventos.length} itens até ${novo.ate.split("-").reverse().join("/")}${mudouAniv ? " · aniversários das cidades" : ""} (rotina diária)`, "--", ...arqs]);
  try { g(["push", "-q", "origin", "HEAD:main"]); log("publicada"); } catch (e) { log("commit feito, push falhou (" + String(e.message).slice(0, 120) + ")"); }
}
