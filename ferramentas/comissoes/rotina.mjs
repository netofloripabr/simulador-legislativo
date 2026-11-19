// Rotina diária do painel Processo Legislativo › Comissões (18/11/2026; roda na tarefa das 22h30, depois da agenda).
// 1) tramitacao.mjs relê a lista do e-Legis e só reabre as proposições que mudaram de setor ou situação (cache em _cache/prop);
// 2) painel-comissoes.mjs --json gera dados/painel/alesc-comissoes-tram.json (o que o site lê, ~2 MB, ~210 KB comprimido);
// 3) textos.mjs baixa o texto das proposições novas (base dos resumos) e juntar-resumos.mjs refaz alesc-comissoes-resumos.json
//    (os resumos das novas são escritos por resumos-local.mjs, com o Gemma 4 rodando no próprio Mac, seguindo RESUMOS.md);
// 4) se o conteúdo mudou (ignorando a hora), faz o commit só desses arquivos e publica. Não toca no Supabase.
// Capacidade (aprovada pelo usuário em 18/11/2026): ~160 páginas da lista + as proposições que mudaram, uma por vez; 1 commit/dia no máximo.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), SAIDA = "dados/painel/alesc-comissoes-tram.json", RES = "dados/painel/alesc-comissoes-resumos.json", LOG = join(RAIZ, "ferramentas/diario/_cache/rotina.log");
const log = (s) => { const l = `[${new Date().toLocaleString("pt-BR")}] comissões: ${s}`; console.log(l); try { appendFileSync(LOG, l + "\n"); } catch (e) {} };
const ler = () => existsSync(join(RAIZ, SAIDA)) ? JSON.parse(readFileSync(join(RAIZ, SAIDA), "utf8")) : null;
const semHora = (d) => d ? JSON.stringify({ ...d, gerado: 0 }) : "";
const lerR = () => existsSync(join(RAIZ, RES)) ? readFileSync(join(RAIZ, RES), "utf8").replace(/"gerado":"[^"]*"/, "") : "";
const antes = semHora(ler()), antesR = lerR();
try {
  execFileSync("node", [join(AQUI, "tramitacao.mjs")], { cwd: RAIZ, stdio: "inherit", timeout: 40 * 60e3 });
  execFileSync("node", [join(AQUI, "painel-comissoes.mjs"), "--json", join(RAIZ, SAIDA)], { cwd: RAIZ, stdio: "inherit" });
  try { execFileSync("node", [join(AQUI, "textos.mjs")], { cwd: RAIZ, stdio: "inherit", timeout: 30 * 60e3 }); } catch (e) { log("textos: " + String(e.message).slice(0, 120)); }
  // resumos das novas pelo Gemma 4 no próprio Mac (Ollama), sem custo; no máximo 100 por noite e nunca depois das 6h30
  try { execFileSync("node", [join(AQUI, "resumos-local.mjs"), "--max", "100", "--ate", "06:30", "--pausa", "5"], { cwd: RAIZ, stdio: "inherit", timeout: 4 * 3600e3 }); } catch (e) { log("resumos: " + String(e.message).slice(0, 120)); }
  execFileSync("node", [join(AQUI, "juntar-resumos.mjs")], { cwd: RAIZ, stdio: "inherit" });
} catch (e) { log("erro na coleta (" + String(e.message).slice(0, 160) + ")"); process.exit(1); }
const D = ler(), mudou = semHora(D) !== antes || lerR() !== antesR;
log(`${D.L.length} proposições em comissão${mudou ? "" : " (sem mudança)"}`);
if (mudou && !process.argv.includes("--sem-publicar")) {
  const g = (a) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8" });
  g(["add", SAIDA, RES, "ferramentas/comissoes/resumos"]); g(["commit", "-m", `Comissões da ALESC: ${D.L.length} proposições em tramitação (rotina diária)`, "--", SAIDA, RES, "ferramentas/comissoes/resumos"]);
  try { g(["push", "-q", "origin", "HEAD:main"]); log("publicado"); } catch (e) { log("commit feito, push falhou (" + String(e.message).slice(0, 120) + ")"); }
}
