// Junta os resumos das proposições (ferramentas/comissoes/resumos/{id}.json, escritos a partir do texto do projeto: ementa,
// artigos e justificativa) com os documentos lidos do e-Legis (_cache/textos/{id}.json) em dados/painel/alesc-comissoes-resumos.json,
// o arquivo que o painel Processo Legislativo › Comissões lê. Só entram as proposições que ainda estão nas comissões.
// Uso: node ferramentas/comissoes/juntar-resumos.mjs [--faltam] [--publicar]
//   --faltam   lista as proposições em comissão que ainda não têm resumo (e se já têm texto do projeto)
//   --publicar depois de juntar, faz o commit só dos resumos e publica (usado pela tarefa agendada das 22h30)
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const AQUI = dirname(fileURLToPath(import.meta.url)), RAIZ = join(AQUI, "../.."), RS = join(AQUI, "resumos"), TX = join(AQUI, "_cache/textos");
const D = JSON.parse(readFileSync(join(RAIZ, "dados/painel/alesc-comissoes-tram.json"), "utf8")), ids = new Set(D.L.map((x) => x.id));
// documentos que valem a pena na ficha (sem anexos e listas de assinatura)
const BOM = /projeto original|mensagem|parecer|emenda|substitutivo|requerimento|reda[çc][ãa]o|folha de vota|of[íi]cio|despacho|informa/i, ORD = [/projeto original/i, /mensagem/i, /substitutivo|emenda/i, /parecer/i, /requerimento/i, /folha de vota/i, /reda[çc]/i, /of[íi]cio/i, /informa/i, /despacho/i];
const R = {};
for (const f of existsSync(RS) ? readdirSync(RS) : []) { const id = f.replace(/\.json$/, ""); if (!ids.has(id)) continue;
  const z = JSON.parse(readFileSync(join(RS, f), "utf8")), t = join(TX, id + ".json");
  if (existsSync(t) && !z.d) { const docs = JSON.parse(readFileSync(t, "utf8")).docs || []; const rk = (d) => { const i = ORD.findIndex((re) => re.test(d.tipo)); return i < 0 ? 99 : i; };
    z.d = docs.filter((d) => BOM.test(d.tipo)).sort((a, b) => rk(a) - rk(b)).slice(0, 5).map((d) => [d.doc, d.tipo, d.nome.slice(0, 80), d.d]); }
  R[id] = z; }
writeFileSync(join(RAIZ, "dados/painel/alesc-comissoes-resumos.json"), JSON.stringify({ gerado: new Date().toISOString(), n: Object.keys(R).length, R }));
const STATUS = gravaStatus(RAIZ, { resumos: new Date().toISOString(), resumos_n: Object.keys(R).length });
console.log(`resumos: ${Object.keys(R).length} de ${D.L.length} proposições`);
if (process.argv.includes("--faltam")) { const F = D.L.filter((x) => !R[x.id]); console.log(`faltam ${F.length}:`); F.forEach((x) => console.log(`${x.id}\t${x.tipo} ${x.num}/${x.ano}\t${existsSync(join(TX, x.id + ".json")) ? "com texto" : "sem texto"}`)); }
if (process.argv.includes("--publicar")) { const g = (a) => execFileSync("git", a, { cwd: RAIZ, encoding: "utf8" }), A = ["dados/painel/alesc-comissoes-resumos.json", "dados/painel/alesc-comissoes-status.json", "ferramentas/comissoes/resumos"];
  g(["add", ...A]); if (g(["diff", "--cached", "--name-only", "--", ...A]).trim()) { g(["commit", "-m", `Comissões da ALESC: resumos de ${Object.keys(R).length} proposições\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, "--", ...A]); try { g(["push", "-q", "origin", "HEAD:main"]); console.log("publicado"); } catch (e) { console.log("commit feito, push falhou"); } } else console.log("nada novo para publicar"); }

// situação para o título "Processo legislativo" do Gabinete (22/11/2026): arquivo pequeno com a data da última coleta,
// da última verificação e dos resumos — o site lê este, sem baixar os 2,4 MB de dados
function gravaStatus(raiz, o) { const f = raiz + "/dados/painel/alesc-comissoes-status.json"; let s = {}; try { s = JSON.parse(readFileSync(f, "utf8")); } catch (e) {} writeFileSync(f, JSON.stringify({ ...s, ...o })); return f; }
