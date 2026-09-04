// Teste automatizado da regra eleitoral com 2022 como gabarito.
//
// Rodar:  node testes/eleitoral.test.js
// (sem dependências — só Node. Sai com código 1 se algo falhar.)
//
// O que prova, aplicando calculo/eleitoral.js sobre os votos OFICIAIS de
// 2022 (dados/base-2022.js):
//   A. a regra eleitoral, no regime vigente EM 2022 (piso de sobras da Lei
//      14.211/2021), reproduz exatamente a ALESC 2022 — QE, vagas por
//      partido e os 40 nomes. É o gabarito.
//   B. a função que o app usa de verdade (dhondtComCorte, regime de 2026,
//      sem piso — STF, fev/2024) continua produzindo o que se espera dela:
//      a mesma distribuição que "QP + médias" produz sem piso. Protege
//      contra alguém "simplificar" o D'Hondt ou o arredondamento.
//
// Achado do dia em que este teste nasceu (04/09/2026): sem o piso, os
// votos de 2022 dariam PL 10, PT 5, PODE 2, PDT 0, PATRIOTA 1, PSB 1 —
// saem Estener Soratto (PL), Lucas Melo (PODE) e Rodrigo Minotto (PDT);
// entram Juliano Campos (PSB), Professora Vanessa (PT) e Dr. Jonas
// Paegle (Patriota). E é EXATAMENTE isso que aconteceu de verdade: o STF
// (ADI 7228, fev/2024) derrubou o piso e, em março/2025, decidiu que a
// regra nova retroage a 2022 — a ALESC teve essa troca de cadeiras em
// 2025. Logo: o gabarito "eleito2022" da base é a diplomação ORIGINAL
// (regime com piso), e a função do app (sem piso) reproduz a composição
// pós-STF. Os dois têm que continuar batendo. Não "consertar" um pra
// bater com o outro.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.join(__dirname, "..");
const VAGAS_ALESC = 40;

// Os arquivos do app são scripts de navegador (globais, sem module.exports).
// Avalia os dois no mesmo contexto, na mesma ordem do index.html.
const ctx = { console };
vm.createContext(ctx);
for (const rel of ["dados/base-2022.js", "calculo/eleitoral.js"]) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, rel), "utf8"), ctx, { filename: rel });
}
// `const` de topo não vira propriedade do contexto (só var/function) —
// por isso pega tudo por uma expressão avaliada dentro do próprio contexto.
const { REF_2022, BASE_2022, LEGENDA_2022, quocienteEleitoral, dhondtComCorte, distribuirVagasComPiso, partyVotos } =
  vm.runInContext("({ REF_2022, BASE_2022, LEGENDA_2022, quocienteEleitoral, dhondtComCorte, distribuirVagasComPiso, partyVotos })", ctx);

let falhas = 0;
function ok(cond, msg, detalhe) {
  if (cond) { console.log("  ✔ " + msg); return; }
  falhas++;
  console.log("  ✘ " + msg);
  if (detalhe) console.log("    " + String(detalhe).split("\n").join("\n    "));
}
const fmt = (n) => Number(n).toLocaleString("pt-BR");

// ---- Monta os partidos como o app monta (candidatos + voto de legenda) ----
// O app injeta a legenda como um pseudo-candidato sem vaga
// (nuvem/palpites.js → injetarVotosLegenda); aqui faz o mesmo, pra que
// partyVotos() some tudo do jeito que a regra vê em produção.
const partidos = BASE_2022.map((p) => ({
  nome: p.nome,
  vagas2022: p.vagas2022,
  candidatos: [
    ...p.candidatos.map((c) => ({ nome: c.nome, votos: c.votos, eleito2022: !!c.eleito2022 })),
    ...(LEGENDA_2022.estadual[p.nome] ? [{ nome: "(voto de legenda)", votos: LEGENDA_2022.estadual[p.nome], legenda: true }] : []),
  ],
}));
const oficiais = new Set(partidos.flatMap((p) => p.candidatos.filter((c) => c.eleito2022).map((c) => c.nome)));
const compararNomes = (calc) => {
  const set = new Set(calc);
  const faltando = [...oficiais].filter((n) => !set.has(n));
  const sobrando = [...set].filter((n) => !oficiais.has(n));
  return { igual: !faltando.length && !sobrando.length,
    texto: [faltando.length ? "faltou eleger: " + faltando.join(", ") : "", sobrando.length ? "elegeu a mais: " + sobrando.join(", ") : ""].filter(Boolean).join("\n") };
};
const compararVagas = (counts) => {
  const div = partidos.map((p, i) => (p.vagas2022 !== counts[i] ? `${p.nome}: esperado ${p.vagas2022}, obtido ${counts[i]}` : null)).filter(Boolean);
  return { igual: !div.length, texto: div.join("\n") };
};

console.log("\nRegra eleitoral × resultado oficial ALESC 2022\n");

// ---- 1. Base de dados ----
console.log("Dados de 2022");
const totalValidos = partidos.reduce((s, p) => s + partyVotos(p), 0);
const gap = REF_2022.validos - totalValidos;
// A base lista os candidatos relevantes, não todos os ~700 de 2022 —
// faltam ~0,6% dos válidos (candidatos com votação mínima / anulados).
// Não altera nenhuma vaga (verificado abaixo com o QE oficial), mas se a
// diferença crescer é sinal de dado corrompido.
ok(gap >= 0 && gap < REF_2022.validos * 0.01,
  `soma dos votos (nominais + legenda) fica a menos de 1% dos válidos oficiais (${fmt(REF_2022.validos)})`,
  `obtido ${fmt(totalValidos)} — diferença ${fmt(gap)}`);
ok(oficiais.size === VAGAS_ALESC, `gabarito tem ${VAGAS_ALESC} eleitos marcados`, `tem ${oficiais.size}`);
ok(partidos.reduce((s, p) => s + p.vagas2022, 0) === VAGAS_ALESC, `vagas2022 dos partidos somam ${VAGAS_ALESC}`);

// ---- 2. Quociente eleitoral (art. 106) ----
console.log("\nQuociente eleitoral");
const qeEsperado = 100721; // 4.028.852 / 40 = 100.721,3 → fração ≤ 0,5 despreza
const qe = quocienteEleitoral(REF_2022.validos, VAGAS_ALESC);
ok(qe === qeEsperado, `QE 2022 = ${fmt(qeEsperado)}`, `obtido ${fmt(qe)}`);
ok(quocienteEleitoral(1000, 4) === 250, "art. 106: 250,0 → 250");
ok(quocienteEleitoral(1002, 4) === 250, "art. 106: 250,5 → 250 (fração igual a meio despreza)");
ok(quocienteEleitoral(1003, 4) === 251, "art. 106: 250,75 → 251 (fração maior que meio soma 1)");

// ---- 3. Gabarito: regime de 2022 (piso 80% / 20%) reproduz a eleição ----
console.log("\nRegime de 2022 (Lei 14.211/2021: sobra só com partido ≥ 80% e candidato ≥ 20% do QE)");
const r2022 = distribuirVagasComPiso(partidos, VAGAS_ALESC, qe, { pisoPartido: 0.8, pisoCandidato: 0.2, minNominal: 0.1 });
ok(r2022.counts.reduce((a, b) => a + b, 0) === VAGAS_ALESC, `distribui exatamente ${VAGAS_ALESC} vagas`);
{ const v = compararVagas(r2022.counts); ok(v.igual, "vagas por partido = resultado oficial (PL 11, MDB 6, PT 4, PODE/PP/PSD/UNIÃO 3…)", v.texto); }
{ const n = compararNomes(r2022.eleitos.flat()); ok(n.igual, "os 40 nomes eleitos = os 40 oficiais", n.texto); }

// ---- 4. O app (regime de 2026, sem piso) faz o que se espera dele ----
console.log("\nRegime de 2026 (STF fev/2024: sem piso de sobras; app usa dhondtComCorte)");
const app = dhondtComCorte(partidos, VAGAS_ALESC).counts;
const semPiso = distribuirVagasComPiso(partidos, VAGAS_ALESC, qe, { pisoPartido: 0, pisoCandidato: 0, minNominal: 0 }).counts;
ok(app.reduce((a, b) => a + b, 0) === VAGAS_ALESC, `distribui exatamente ${VAGAS_ALESC} vagas`);
ok(app.join(",") === semPiso.join(","), "D'Hondt numa passada ≡ QP inteiro + sobras pelas médias (sem piso)",
  `dhondt: ${app.join(",")}\nqp+médias: ${semPiso.join(",")}`);
// Documenta o efeito da mudança de regra sobre os MESMOS votos de 2022:
// é o que teria acontecido em 2022 com a regra de 2026. Se isto mudar,
// alguém mexeu na regra de produção — investigar antes de aceitar.
const esperadoSemPiso = { PL: 10, PT: 5, PODE: 2, PDT: 0, PATRIOTA: 1, PSB: 1 };
const difs = Object.entries(esperadoSemPiso).map(([nome, esperado]) => {
  const obtido = app[partidos.findIndex((p) => p.nome === nome)];
  return obtido === esperado ? null : `${nome}: esperado ${esperado}, obtido ${obtido}`;
}).filter(Boolean);
ok(difs.length === 0, "com a regra de 2026, 2022 daria PL 10, PT 5, PODE 2, PDT 0, PATRIOTA 1, PSB 1 (efeito conhecido do fim do piso)", difs.join("\n"));

// ---- 5. Sobras sem piso: cenário mínimo (não depende de 2022) ----
{
  const mini = [
    { nome: "A", candidatos: [{ nome: "a1", votos: 1000 }] },
    { nome: "B", candidatos: [{ nome: "b1", votos: 450 }] },
    { nome: "C", candidatos: [{ nome: "c1", votos: 520 }] },
  ];
  const r = dhondtComCorte(mini, 2).counts;
  ok(r.join(",") === "1,0,1", "sobra sem piso: partido abaixo de 80% do QE concorre e leva a vaga pela média", `obtido ${r.join(",")}`);
}

console.log("");
if (falhas) { console.log(`${falhas} verificação(ões) falharam.\n`); process.exit(1); }
console.log("Tudo certo: a regra reproduz a ALESC 2022 no regime de 2022, e o app segue o regime de 2026.\n");
