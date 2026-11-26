// Resumos das proposições nas comissões escritos por um modelo rodando NO PRÓPRIO MAC (Ollama + Gemma 4 12B, sem custo e sem
// usar o limite de nenhuma assinatura). Escolhido pelo usuário em 19/11/2026 depois de comparar 10 proposições com o Claude e
// o ChatGPT (prototipos/comissoes-tramitacao/comparacao-resumos.html). Regras e formato: RESUMOS.md (o mesmo texto vai no pedido).
// Para cada proposição em comissão sem resumo: lê o texto do projeto (_cache/textos/{id}.json, de textos.mjs), pede o resumo,
// confere o formato (campos, temas da lista fechada) e grava ferramentas/comissoes/resumos/{id}.json com "ia":"gemma4:12b".
// Se o Ollama não estiver rodando, abre o servidor e fecha no fim. Uma proposição por vez, com pausa entre elas.
// Uso: node ferramentas/comissoes/resumos-local.mjs [--max N] [--ate HH:MM] [--publicar-a-cada N] [--pausa S]
import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), RS = join(AQUI, "resumos"), TX = join(AQUI, "_cache/textos"), LOG = join(RAIZ, "ferramentas/diario/_cache/rotina.log");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = +arg("--max", 0) || Infinity, ATE = arg("--ate", ""), PUB = +arg("--publicar-a-cada", 0), PAUSA = +arg("--pausa", 20) * 1000, MODELO = arg("--modelo", "gemma4:12b"), CTX = +arg("--ctx", 8192);
// 20/11/2026: mais leve para o Mac de 16 GB, com a MESMA qualidade. Antes todo projeto usava num_ctx 24576 e o modelo
// ocupava 16 GB (o Mac inteiro). Agora o espaço é do tamanho de cada projeto: 8192 para os curtos (8 em cada 10, ~7,7 GB)
// e só o necessário (até 16384) para os longos — o texto continua indo inteiro até 30 mil caracteres, como antes.
// A pausa entre proposições subiu de 5 para 20 s e o modelo sai da memória 1 min depois de terminar.
const OL = "http://localhost:11434", BIN = "/Applications/Ollama.app/Contents/Resources/ollama";
const log = (s) => { const l = `[${new Date().toLocaleString("pt-BR")}] resumos: ${s}`; console.log(l); try { appendFileSync(LOG, l + "\n"); } catch (e) {} };
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
const TOP = ["Tributação e finanças", "Saúde", "Educação", "Segurança pública", "Servidores públicos", "Meio ambiente", "Direitos e cidadania", "Economia e desenvolvimento", "Infraestrutura e transporte", "Agricultura e pesca", "Cultura, esporte e turismo", "Administração pública", "Homenagens e datas", "Utilidade pública", "Assistência social e família"];
const no = () => { if (!ATE) return false; const [a, b] = ATE.split(":").map(Number), d = new Date(); return d.getHours() < 12 && d.getHours() * 60 + d.getMinutes() >= a * 60 + b; }; // limite de manhã (ex.: 06:30)

// servidor do Ollama
let proc = null;
const vivo = async () => { try { return (await fetch(OL + "/api/version")).ok; } catch (e) { return false; } };
if (!(await vivo())) { if (!existsSync(BIN)) { log("Ollama não instalado (/Applications/Ollama.app)"); process.exit(1); }
  proc = spawn(BIN, ["serve"], { env: { ...process.env, OLLAMA_NO_CLOUD: "1" }, stdio: "ignore", detached: false });
  for (let i = 0; i < 30 && !(await vivo()); i++) await espera(1000); if (!(await vivo())) { log("não consegui abrir o Ollama"); process.exit(1); } }
const fim = (c) => { if (proc) try { proc.kill(); } catch (e) {} process.exit(c); };

const D = JSON.parse(readFileSync(join(RAIZ, "dados/painel/alesc-comissoes-tram.json"), "utf8"));
const feitos = new Set(readdirSync(RS).map((f) => f.replace(/\.json$/, "")));
// --externos (26/11/2026): só as de autoria de fora da Assembleia (Governador, tribunais, entidades, iniciativa popular...)
const EXT = /governador|tribunal|entidade|iniciativa|minist[ée]rio|defensoria|procurador|universidade/i, SO_EXT = process.argv.includes("--externos");
const fila = D.L.filter((x) => !feitos.has(x.id) && existsSync(join(TX, x.id + ".json")) && (!SO_EXT || EXT.test(x.autor || ""))).sort((a, b) => (b.casa || 0) - (a.casa || 0) || (a.prot < b.prot ? -1 : 1)).slice(0, MAX);
const regras = readFileSync(join(AQUI, "RESUMOS.md"), "utf8"), ex = ["NxJky", "NmQ6w"].map((i) => readFileSync(join(RS, i + ".json"), "utf8")).join("\n\n");
const SYS = `Você escreve o resumo de UMA proposição legislativa da ALESC (Santa Catarina) para um painel de gabinete. Siga EXATAMENTE as regras e o formato abaixo. Responda SÓ com o objeto JSON do resumo, sem texto antes ou depois e sem cercas de código.\n\n=== REGRAS (RESUMOS.md) ===\n${regras}\n\n=== DOIS EXEMPLOS APROVADOS ===\n${ex}`;
const limpa = (t) => t.replace(/Documento assinado[\s\S]{0,400}?\d{2}:\d{2}[.:]?\d*\.?/g, "").replace(/Pág\. \d+ de \d+ - Documento assinado digitalmente[^\n]*\n?/g, "").replace(/Assinaturas do documento[\s\S]*?realizar a conferência\./g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
const confere = (z) => { const e = []; if (!z || typeof z !== "object") return ["não é objeto"]; if (!z.m || !z.f) e.push("sem manchete/frase");
  if (!Array.isArray(z.t) || !z.t.length) e.push("sem tema"); else { z.t = z.t.filter((q) => Array.isArray(q) && TOP.includes(q[0])); if (!z.t.length) e.push("tema fora da lista"); }
  if (z.muda && !Array.isArray(z.muda)) delete z.muda; if (z.m && z.m.length > 120) z.m = z.m.slice(0, 118).replace(/\s+\S*$/, "") + "…"; return e; };
async function resumir(x) { const t = JSON.parse(readFileSync(join(TX, x.id + ".json"), "utf8")), txt = limpa(t.texto || "").trim();
  const user = `${x.tipo} ${x.num}/${x.ano} · autor: ${x.autor}\nEmenta: ${x.ementa}\n\n${txt.length > 200 ? "Texto do projeto (PDF):\n" + txt.slice(0, 30000) : "O texto do PDF veio vazio: escreva só a partir da ementa e marque \"base\": \"ementa\"."}`;
  const ctx = Math.min(Math.max(CTX, Math.ceil(((SYS.length + user.length) / 2.8 + 2800) / 2048) * 2048), 16384);   // tokens ≈ caracteres ÷ 2,8 + resposta
  for (let k = 1; k <= 2; k++) { const r = await fetch(OL + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10 * 60e3),
      body: JSON.stringify({ model: MODELO, stream: false, format: "json", think: false, keep_alive: "1m", options: { num_ctx: ctx, temperature: 0.2, num_predict: 2500 }, messages: [{ role: "system", content: SYS }, { role: "user", content: user }] }) });
    const j = await r.json(); if (!r.ok) throw new Error(r.status + " " + JSON.stringify(j).slice(0, 160));
    let z; try { z = JSON.parse(String(j.message.content).trim().replace(/^```(json)?\s*|\s*```$/g, "")); } catch (e) { z = null; }
    const e = confere(z); if (!e.length) { if (txt.length <= 200) z.base = "ementa"; return { ...z, ia: MODELO }; }
    if (k === 2) throw new Error("formato: " + e.join(", ")); }
}
const publicar = () => { try { execFileSync("node", [join(AQUI, "juntar-resumos.mjs"), "--publicar"], { cwd: RAIZ, stdio: "inherit" }); } catch (e) { log("publicação falhou: " + String(e.message).slice(0, 100)); } };
log(`${fila.length} proposições na fila (${MODELO}${ATE ? ", até " + ATE : ""})`);
let ok = 0, er = 0;
for (const x of fila) { if (no()) { log("horário limite atingido"); break; }
  const t0 = Date.now();
  try { const z = await resumir(x); writeFileSync(join(RS, x.id + ".json"), JSON.stringify(z)); ok++; console.log(`${x.id} ${x.tipo} ${x.num}/${x.ano} ok (${Math.round((Date.now() - t0) / 1000)} s)`); }
  catch (e) { er++; console.log(`${x.id} ERRO ${String(e.message).slice(0, 160)}`); }
  if (PUB && ok && ok % PUB === 0) publicar();
  await espera(PAUSA); }
log(`${ok} resumos novos, ${er} com erro`);
if (PUB && ok) publicar();
fim(0);
