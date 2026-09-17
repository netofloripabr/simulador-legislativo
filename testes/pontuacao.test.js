// Teste automatizado da função de pontuação (calculo/pontuacao.js), usando
// o resultado real de 2022 (dados/base-2022.js) como ENSAIO — a eleição de
// 2026 ainda não aconteceu, então não existe resultado oficial de verdade
// pra testar contra. A pergunta que este teste responde: "se alguém
// tivesse depositado ESTE palpite específico em 2022, a função devolveria
// a pontuação que a gente espera?" — não valida o resultado eleitoral em
// si (isso é testes/eleitoral.test.js), só a MATEMÁTICA de comparação.
//
// Rodar: node testes/pontuacao.test.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.join(__dirname, "..");
const ctx = { console };
vm.createContext(ctx);
for (const rel of ["dados/base-2022.js", "calculo/pontuacao.js"]) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, rel), "utf8"), ctx, { filename: rel });
}
const { BASE_2022, pontuarCandidato, pontuarCedulaCargo, bonusTiming } =
  vm.runInContext("({ BASE_2022, pontuarCandidato, pontuarCedulaCargo, bonusTiming })", ctx);

let falhas = 0;
function ok(cond, msg, detalhe) {
  if (cond) { console.log("  ✔ " + msg); return; }
  falhas++;
  console.log("  ✘ " + msg);
  if (detalhe !== undefined) console.log("    " + JSON.stringify(detalhe));
}

// Monta o "oficial" (resultado real de 2022) no formato que a função espera.
// Todo candidato de 2022 é status "valido" aqui — não há retirada/sub judice
// nesse gabarito (é resultado já apurado e diplomado).
function chaveDe(c) { return c.nome; } // 2022 usa nome como identificador único no gabarito
const oficiais = BASE_2022.flatMap((p) =>
  p.candidatos.map((c) => ({ chave: chaveDe(c), votosReais: c.votos, eleitoReal: !!c.eleito2022, status: "valido" }))
);
const vagasCargo = BASE_2022.reduce((s, p) => s + (p.vagas2022 || 0), 0);
ok(vagasCargo === 40, "ALESC 2022 tem 40 vagas no gabarito", vagasCargo);

console.log("\nCenário 1 — palpite PERFEITO (copia o resultado real de 2022)");
{
  const previstos = oficiais.map((o) => ({ chave: o.chave, votos: o.votosReais, marcadoEleito: o.eleitoReal }));
  const r = pontuarCedulaCargo(previstos, oficiais, vagasCargo);
  ok(r.pctAcertos === 1, "acerta 100% dos eleitos", r.pctAcertos);
  ok(r.erroMedio === 0, "erro médio zero (votos idênticos)", r.erroMedio);
  ok(r.pctProximidade === 1, "proximidade 100%", r.pctProximidade);
  ok(Math.abs(r.pontosTotal - 1) < 1e-9, "pontuação total = 1 (máxima)", r.pontosTotal);
}

console.log("\nCenário 2 — palpite EM BRANCO (ninguém marcado, todos os votos zerados)");
{
  const previstos = oficiais.map((o) => ({ chave: o.chave, votos: 0, marcadoEleito: false }));
  const r = pontuarCedulaCargo(previstos, oficiais, vagasCargo);
  ok(r.pctAcertos === 0, "acerta 0% dos eleitos", r.pctAcertos);
  // erro relativo de cada candidato eleito real = votosReais/totalValidos, não é 1 pra todos
  // (candidato pequeno errado por 0 pesa menos que um grande) — só confere que o erro é > 0 e <= piso.
  ok(r.erroMedio > 0 && r.erroMedio <= 1, "erro médio entre 0 e o piso (100%)", r.erroMedio);
  ok(r.pontosTotal < 0.5, "pontuação total baixa (bem abaixo da metade)", r.pontosTotal);
  ok(r.pontosTotal >= 0, "pontuação nunca fica negativa (falso positivo não pune)", r.pontosTotal);
}

console.log("\nCenário 3 — candidatura INVÁLIDA não pontua nem positivo nem negativo");
{
  // pega o primeiro eleito real e marca como "cassado" no oficial —
  // mesmo que o previsto acerte, não deve contar.
  const primeiroEleito = oficiais.find((o) => o.eleitoReal);
  const oficiaisComCassado = oficiais.map((o) => o.chave === primeiroEleito.chave ? { ...o, status: "cassado" } : o);
  const previstos = oficiais.map((o) => ({ chave: o.chave, votos: o.votosReais, marcadoEleito: o.eleitoReal }));
  const r = pontuarCedulaCargo(previstos, oficiaisComCassado, vagasCargo);
  ok(r.vagasValidas === vagasCargo - 1, "o candidato cassado sai do denominador de vagas válidas", r.vagasValidas);
  ok(r.pctAcertos === 1, "quem acertou os OUTROS 39 continua com 100% (denominador ajustado)", r.pctAcertos);
}

console.log("\nCenário 4 — pontuarCandidato() isolado, casos de borda");
{
  ok(pontuarCandidato({ chave: "x", votos: 100, marcadoEleito: true }, null) === null, "sem oficial → null");
  ok(pontuarCandidato({ chave: "x", votos: 100, marcadoEleito: true }, { chave: "x", status: "sub_judice" }) === null, "sub judice → null");
  const r = pontuarCandidato({ chave: "x", votos: 50, marcadoEleito: false }, { chave: "x", votosReais: 100, eleitoReal: true, status: "valido" });
  ok(r && r.acertoEleicao === false, "marcou errado (não marcou quem foi eleito) → acertoEleicao false", r);
}

console.log("\nCenário 5 — bonusTiming(), casos de borda");
{
  const prazo = "2026-10-01T00:00:00Z";
  const inicio = "2026-09-01T00:00:00Z";
  ok(bonusTiming(null, prazo) === 1, "sem data de depósito → sem bônus (1x)");
  ok(bonusTiming("2026-09-01T00:00:00Z", prazo, inicio) === 1, "depositou exatamente no início → sem bônus (fração 1, mas <= início não soma)");
  ok(bonusTiming("2026-10-01T00:00:00Z", prazo, inicio) === 1, "depositou em cima do prazo → sem bônus");
  const meio = bonusTiming("2026-09-16T00:00:00Z", prazo, inicio); // bem no meio da janela
  ok(meio > 1 && meio <= 1.1, "depositou no meio da janela → bônus entre 1x e 1.1x", meio);
}

console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo: a função de pontuação se comporta como esperado nos cenários de ensaio (2022).");
process.exit(falhas ? 1 : 0);
