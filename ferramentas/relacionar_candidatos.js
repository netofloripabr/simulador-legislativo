#!/usr/bin/env node
/**
 * relacionar_candidatos.js — liga candidatos 2026 (provisório, das atas) aos
 * candidatos 2022 (base real, dados/base-2022.js + candidatos-extra-2022.js)
 * quando é provavelmente a mesma pessoa recandidatando.
 *
 * Por quê: o projeto já decidiu (ver PROJETO.md, "Achado técnico" e pendência
 * da Fase 2.6) que cada candidato precisa de uma identidade estável ligada ao
 * `id` de 2022 quando for a mesma pessoa — assim o Code consegue, por
 * exemplo, mostrar "recandidato(a), teve X votos em 2022" e manter
 * continuidade de histórico entre eleições.
 *
 * Como decide "é a mesma pessoa": compara o nome de registro de 2026 (e o
 * nome de urna) contra o nome de registro de todos os candidatos a Deputado
 * Estadual de 2022, usando distância de Levenshtein normalizada. Só cobre
 * Deputado Estadual — é o único cargo que tem base 2022 no projeto hoje.
 *
 * NUNCA escreve em base-2022.js / candidatos-extra-2022.js / no arquivo
 * provisório de 2026. Só gera um arquivo novo de vínculo + relatório de
 * conferência, pro mesmo processo de revisão humana de sempre.
 *
 * Uso: node relacionar_candidatos.js
 *   (rodar de dentro da pasta do projeto, ou ajustar os caminhos abaixo)
 */

const fs = require("fs");
const path = require("path");

const DIR_PROJETO = path.resolve(__dirname, "..");
const CAMINHO_BASE_2022 = path.join(DIR_PROJETO, "dados", "base-2022.js");
const CAMINHO_EXTRA_2022 = path.join(DIR_PROJETO, "dados", "candidatos-extra-2022.js");
const CAMINHO_2026 = path.join(DIR_PROJETO, "dados", "estados", "sc-2026-provisorio.js");
const CAMINHO_SAIDA_JS = path.join(DIR_PROJETO, "dados", "estados", "sc-2026-vinculo-2022.js");
const CAMINHO_SAIDA_MD = path.join(DIR_PROJETO, "dados", "estados", "sc-2026-vinculo-2022-conferencia.md");

function carregarConst(caminhoArquivo, nomeConst) {
  const texto = fs.readFileSync(caminhoArquivo, "utf-8");
  // eslint-disable-next-line no-new-func
  const fn = new Function(`${texto}\nreturn ${nomeConst};`);
  return fn();
}

function normalizar(nome) {
  return (nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + custo);
    }
  }
  return dp[m][n];
}

function similaridade(a, b) {
  const na = normalizar(a), nb = normalizar(b);
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length, 1);
}

function listar2022() {
  const base = carregarConst(CAMINHO_BASE_2022, "BASE_2022");
  const extra = carregarConst(CAMINHO_EXTRA_2022, "CANDIDATOS_EXTRA_2022");
  const lista = [];
  for (const grupoPartido of base) {
    for (const c of grupoPartido.candidatos) {
      if (c.fonte === "legenda") continue; // "voto de legenda" não é pessoa
      lista.push({ id: c.id, nome: c.nome, partido: grupoPartido.nome, arquivo: "base-2022.js", eleito2022: !!c.eleito2022 });
    }
  }
  for (const [partido, candidatos] of Object.entries(extra)) {
    for (const c of candidatos) {
      if (c.fonte === "legenda") continue;
      lista.push({ id: c.id, nome: c.nome, partido, arquivo: "candidatos-extra-2022.js", eleito2022: false });
    }
  }
  return lista;
}

function listar2026Estadual() {
  const provisorio = carregarConst(CAMINHO_2026, "CANDIDATOS_2026_SC_PROVISORIO");
  return (provisorio["Deputado Estadual"] || []).map((c) => ({
    id: c.id, nome: c.nome, nomeUrna: c.nomeUrna, partido: c.partido, numero: c.numero,
  }));
}

function jsString(v) {
  return v === null || v === undefined ? "null" : JSON.stringify(v);
}

function main() {
  const cand2022 = listar2022();
  const cand2026 = listar2026Estadual();

  const vinculos = [];
  const semCorrespondencia = [];

  for (const c26 of cand2026) {
    let melhor = null;
    for (const c22 of cand2022) {
      const score = Math.max(
        similaridade(c26.nome, c22.nome),
        c26.nomeUrna ? similaridade(c26.nomeUrna, c22.nome) : 0
      );
      if (!melhor || score > melhor.score) melhor = { ...c22, score };
    }
    if (!melhor || melhor.score < 0.72) {
      semCorrespondencia.push(c26);
      continue;
    }
    const classificacao = melhor.score >= 0.92 ? "alta" : "media";
    vinculos.push({
      id2026: c26.id,
      nome2026: c26.nome,
      nomeUrna2026: c26.nomeUrna,
      partido2026: c26.partido,
      id2022: melhor.id,
      nome2022: melhor.nome,
      partido2022: melhor.partido,
      eleito2022: melhor.eleito2022,
      mudouPartido: normalizar(melhor.partido) !== normalizar(c26.partido || ""),
      scoreConfianca: Math.round(melhor.score * 1000) / 1000,
      classificacao,
    });
  }

  vinculos.sort((a, b) => b.scoreConfianca - a.scoreConfianca);

  const hoje = new Date().toISOString().slice(0, 10);
  const linhasJs = [
    "// Vínculo candidato 2026 (SC, Deputado Estadual, provisório) <-> candidato 2022",
    "// Gerado por ferramentas/relacionar_candidatos.js — NÃO edita base-2022.js,",
    "// candidatos-extra-2022.js nem sc-2026-provisorio.js. Serve pro Code usar como",
    "// referência de continuidade (\"recandidato(a), teve X votos em 2022\") sem",
    "// perder rastro de qual comparação foi automática vs. confirmada.",
    "//",
    "// scoreConfianca: 1.0 = nomes idênticos após normalizar. >=0.92 = 'alta'",
    "// (nomes praticamente iguais, inclusive por nome de urna). 0.72–0.92 = 'media'",
    "// (parecido, mas pode ser coincidência de sobrenome/homônimo — conferir).",
    "// Abaixo de 0.72 não entra aqui (fica em sc-2026-vinculo-2022-conferencia.md",
    "// como 'sem correspondência' — pode ser candidato novo, ou nome mudou demais",
    "// pra bater automaticamente).",
    "//",
    `// Gerado em ${hoje}.`,
    "const VINCULO_2026_2022_SC = [",
  ];
  for (const v of vinculos) {
    const campos = [
      `id2026:${jsString(v.id2026)}`,
      `nome2026:${jsString(v.nome2026)}`,
      `id2022:${jsString(v.id2022)}`,
      `nome2022:${jsString(v.nome2022)}`,
      `partido2026:${jsString(v.partido2026)}`,
      `partido2022:${jsString(v.partido2022)}`,
      `mudouPartido:${v.mudouPartido}`,
      `eleito2022:${v.eleito2022}`,
      `scoreConfianca:${v.scoreConfianca}`,
      `classificacao:${jsString(v.classificacao)}`,
    ];
    linhasJs.push(`  { ${campos.join(", ")} },`);
  }
  linhasJs.push("];");
  fs.writeFileSync(CAMINHO_SAIDA_JS, linhasJs.join("\n") + "\n", "utf-8");

  const alta = vinculos.filter((v) => v.classificacao === "alta");
  const media = vinculos.filter((v) => v.classificacao === "media");
  const mudouPartido = vinculos.filter((v) => v.mudouPartido);

  const linhasMd = [
    "# Conferência — vínculo candidato 2026 ↔ 2022 (SC, Deputado Estadual)",
    "",
    `Gerado em ${hoje} por \`ferramentas/relacionar_candidatos.js\`.`,
    "",
    "**Nenhum vínculo aqui é definitivo sem revisão humana** — mesmo processo de",
    "`dados/correcoes-nomes.md`. Isto é um cruzamento por semelhança de nome, não",
    "um dado oficial do TSE (o TSE não publica esse vínculo).",
    "",
    `- Candidatos 2026 a Deputado Estadual analisados: **${cand2026.length}**`,
    `- Vínculo de confiança alta (>=0,92): **${alta.length}**`,
    `- Vínculo a conferir (0,72–0,92): **${media.length}**`,
    `- Sem correspondência em 2022 (candidato novo ou nome mudou muito): **${semCorrespondencia.length}**`,
    `- Entre os vinculados, mudaram de partido desde 2022: **${mudouPartido.length}**`,
    "",
  ];

  if (media.length) {
    linhasMd.push("## A conferir (confiança média)");
    linhasMd.push("");
    linhasMd.push("| 2026 | Partido 2026 | 2022 | Partido 2022 | Score |");
    linhasMd.push("|---|---|---|---|---|");
    for (const v of media) {
      linhasMd.push(`| ${v.nome2026} | ${v.partido2026} | ${v.nome2022} | ${v.partido2022} | ${v.scoreConfianca} |`);
    }
    linhasMd.push("");
  }

  if (mudouPartido.length) {
    linhasMd.push("## Vinculados que mudaram de partido desde 2022");
    linhasMd.push("");
    linhasMd.push("| Nome | Partido 2022 | Partido 2026 | Confiança do vínculo |");
    linhasMd.push("|---|---|---|---|");
    for (const v of mudouPartido) {
      linhasMd.push(`| ${v.nome2026} | ${v.partido2022} | ${v.partido2026} | ${v.classificacao} |`);
    }
    linhasMd.push("");
  }

  linhasMd.push("## Status de confirmação");
  linhasMd.push("");
  linhasMd.push("_(preencher conforme for revisando)_");
  linhasMd.push("");
  linhasMd.push("| Nome 2026 | Nome 2022 | Status | Observação |");
  linhasMd.push("|---|---|---|---|");

  fs.writeFileSync(CAMINHO_SAIDA_MD, linhasMd.join("\n") + "\n", "utf-8");

  console.log(`Candidatos 2026 (Dep. Estadual) analisados: ${cand2026.length}`);
  console.log(`Vínculos alta confiança: ${alta.length}`);
  console.log(`Vínculos a conferir: ${media.length}`);
  console.log(`Sem correspondência: ${semCorrespondencia.length}`);
  console.log(`Escrito: ${CAMINHO_SAIDA_JS}`);
  console.log(`Escrito: ${CAMINHO_SAIDA_MD}`);
}

main();
