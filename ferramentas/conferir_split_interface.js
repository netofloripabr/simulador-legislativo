#!/usr/bin/env node
// Confere o split de interface/prospeccao.js em interface/NN-*.js (07/09/2026).
// Sem dependências. Rodar da raiz do repo: node ferramentas/conferir_split_interface.js
//
// (a) Concatena os arquivos novos na ordem em que aparecem no index.html e
//     compara com `git show <ref>:interface/prospeccao.js` (ref = argumento
//     opcional, padrão HEAD): o multiconjunto de linhas não-vazias (ignorando
//     só os cabeçalhos de 3-5 linhas no topo de cada arquivo novo) tem que
//     ser IDÊNTICO — mesmas linhas, mesmas quantidades. Só a ordem pode
//     diferir (blocos realocados).
// (b) Lista toda declaração de topo (function/async function/const/let/var/
//     class, coluna 0) por arquivo e falha se um nome aparece em 2 arquivos.
// (c) Lista os statements de topo que NÃO são declaração (coluna 0, fora de
//     função) e em que arquivo estão — pra conferir a ordem de execução.
// Heurística de "topo" = linha começando na coluna 0 (o arquivo é indentado
// com 2 espaços de forma consistente); linhas de comentário, fechamentos e
// continuações de template literal são ignoradas.
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const raiz = path.resolve(__dirname, "..");
const ref = process.argv[2] || "HEAD";
let falhou = false;
const falha = (m) => { falhou = true; console.log("FALHA: " + m); };

// ---- ordem dos arquivos, lida do index.html ----
const indexHtml = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
const arquivos = [];
const re = /<script src="(interface\/[^"?]+\.js)(?:\?[^"]*)?"><\/script>/g;
let m;
while ((m = re.exec(indexHtml))) arquivos.push(m[1]);
if (!arquivos.length) { falha("nenhuma tag <script src=\"interface/...\"> no index.html"); process.exit(1); }
console.log("Arquivos (ordem do index.html):\n  " + arquivos.join("\n  "));

// ---- (a) multiconjunto de linhas ----
function multiconjunto(linhas) {
  const mapa = new Map();
  for (const l of linhas) {
    if (l.trim() === "") continue;
    mapa.set(l, (mapa.get(l) || 0) + 1);
  }
  return mapa;
}
let original;
try {
  original = execSync(`git show ${ref}:interface/prospeccao.js`, { cwd: raiz, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  falha(`não consegui ler ${ref}:interface/prospeccao.js do git`);
  process.exit(1);
}
const origLinhas = original.split("\n");
const novasLinhas = [];
const conteudoPorArquivo = {};
for (const a of arquivos) {
  const txt = fs.readFileSync(path.join(raiz, a), "utf8");
  const ls = txt.split("\n");
  // cabeçalho novo: bloco inicial de linhas "// " até a primeira linha vazia (máx. 6)
  let i = 0;
  while (i < ls.length && i < 6 && ls[i].startsWith("//")) i++;
  if (i === 0 || i > 5) falha(`${a}: cabeçalho esperado de 1-5 linhas de comentário no topo (achei ${i})`);
  conteudoPorArquivo[a] = ls.slice(i);
  novasLinhas.push(...ls.slice(i));
}
const mo = multiconjunto(origLinhas);
const mn = multiconjunto(novasLinhas);
let sobra = 0, faltam = 0;
for (const [l, n] of mo) {
  const k = mn.get(l) || 0;
  if (k < n) { faltam += n - k; if (faltam <= 10) console.log(`  falta (${n - k}x): ${l.slice(0, 100)}`); }
}
for (const [l, n] of mn) {
  const k = mo.get(l) || 0;
  if (k < n) { sobra += n - k; if (sobra <= 10) console.log(`  sobra (${n - k}x): ${l.slice(0, 100)}`); }
}
const totalOrig = [...mo.values()].reduce((s, n) => s + n, 0);
const totalNovo = [...mn.values()].reduce((s, n) => s + n, 0);
console.log(`\n(a) Linhas não-vazias: original ${totalOrig}, novos ${totalNovo}; faltando ${faltam}, sobrando ${sobra}`);
if (faltam || sobra) falha("(a) o conteúdo não é idêntico como multiconjunto de linhas");
else console.log("(a) OK — mesmas linhas, mesmas quantidades");

// ---- (b) declarações de topo ----
const reDecl = /^(?:async\s+function|function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/;
const reDeclMulti = /^(?:const|let|var)\s+(.+?)(?:=|;|$)/; // let a = 1, b = 2, ...
const nomes = new Map(); // nome -> [arquivo]
const statementsTopo = []; // (c)
for (const a of arquivos) {
  const ls = conteudoPorArquivo[a];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (!l || /^[\s]/.test(l)) continue; // não é coluna 0
    if (l.startsWith("//") || l.startsWith("/*") || l.startsWith("*")) continue;
    if (/^[}\)\]`]/.test(l)) continue; // fechamento / fim de template
    if (/^<\/svg>`;/.test(l) || /^`;/.test(l)) continue; // fim de template literal de topo
    const d = reDecl.exec(l);
    if (d) {
      // `let a = null, b = null;` — pega todos os nomes da mesma linha
      const listaNomes = [];
      if (/^(const|let|var)\s/.test(l)) {
        const semPrefixo = l.replace(/^(const|let|var)\s+/, "");
        // divide por vírgulas de topo (fora de parênteses/chaves/colchetes/strings)
        let prof = 0, atual = "", emStr = null;
        for (const ch of semPrefixo) {
          if (emStr) { if (ch === emStr) emStr = null; atual += ch; continue; }
          if (ch === '"' || ch === "'" || ch === "`") { emStr = ch; atual += ch; continue; }
          if ("([{".includes(ch)) prof++;
          if (")]}".includes(ch)) prof--;
          if (ch === "," && prof === 0) { listaNomes.push(atual); atual = ""; continue; }
          atual += ch;
        }
        listaNomes.push(atual);
        for (const pedaco of listaNomes) {
          const mm = /^\s*([A-Za-z_$][\w$]*)/.exec(pedaco);
          if (mm) { if (!nomes.has(mm[1])) nomes.set(mm[1], []); nomes.get(mm[1]).push(a); }
        }
      } else {
        if (!nomes.has(d[1])) nomes.set(d[1], []);
        nomes.get(d[1]).push(a);
      }
      continue;
    }
    statementsTopo.push({ arquivo: a, linha: i + 1, texto: l.slice(0, 110) });
  }
}
let dup = 0;
for (const [n, arqs] of nomes) {
  const unicos = [...new Set(arqs)];
  if (arqs.length > 1) { dup++; console.log(`  duplicada: ${n} em ${arqs.join(", ")}`); }
  void unicos;
}
console.log(`\n(b) Declarações de topo: ${nomes.size} nomes em ${arquivos.length} arquivos; duplicadas: ${dup}`);
if (dup) falha("(b) nome declarado em mais de um arquivo/lugar");
else console.log("(b) OK — nenhum nome repetido");
// resumo por arquivo
for (const a of arquivos) {
  const fns = [...nomes].filter(([, arqs]) => arqs.includes(a)).map(([n]) => n);
  console.log(`    ${a}: ${fns.length} declarações (${conteudoPorArquivo[a].length} linhas)`);
}

// ---- (c) statements de topo que não são declaração ----
console.log(`\n(c) Statements de topo (não-declaração), na ordem de carga:`);
for (const s of statementsTopo) console.log(`    ${s.arquivo}:${s.linha}  ${s.texto}`);

console.log(falhou ? "\nRESULTADO: FALHOU" : "\nRESULTADO: OK (a, b passaram; conferir (c) a olho)");
process.exit(falhou ? 1 : 0);
