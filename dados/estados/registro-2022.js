// Registro central: liga cada UF ao seu dado de 2022 (Deputado Estadual,
// Deputado Federal, Senador), pra montarEstadoPalpite (nuvem/palpites.js)
// não precisar mais de uma variável hardcoded por estado. Depende de todos
// os arquivos dados/estados/{uf}-2022-resultado-provisorio.js + dados/base-2022.js
// já terem sido carregados antes (ver ordem de <script> em index.html).
//
// Santa Catarina é o único com dado "promovido" à mão (dados/base-2022.js,
// revisado candidato a candidato). Os outros 26 vêm direto do processamento
// automático (ferramentas/tratar_resultados_2022.py) sobre o mesmo arquivo
// oficial do TSE — a apuração nacional bateu exatamente com os totais
// conhecidos (1.035 Dep. Estadual, 513 Dep. Federal, 27 Senador), então
// entraram direto como dado "ao vivo" também, sem revisão candidato a
// candidato como SC teve. Ver dados/estados/{uf}-2022-conferencia.md se
// precisar revisar algum estado específico depois.
const RESULTADOS_2022_POR_ESTADO = {
  SC: { "Deputado Estadual": BASE_2022, "Deputado Federal": BASE_2022_FEDERAL_SC, "Senador": BASE_2022_SENADOR_SC },
  AC: RESULTADO_2022_AC_PROVISORIO,
  AL: RESULTADO_2022_AL_PROVISORIO,
  AM: RESULTADO_2022_AM_PROVISORIO,
  AP: RESULTADO_2022_AP_PROVISORIO,
  BA: RESULTADO_2022_BA_PROVISORIO,
  CE: RESULTADO_2022_CE_PROVISORIO,
  DF: RESULTADO_2022_DF_PROVISORIO,
  ES: RESULTADO_2022_ES_PROVISORIO,
  GO: RESULTADO_2022_GO_PROVISORIO,
  MA: RESULTADO_2022_MA_PROVISORIO,
  MG: RESULTADO_2022_MG_PROVISORIO,
  MS: RESULTADO_2022_MS_PROVISORIO,
  MT: RESULTADO_2022_MT_PROVISORIO,
  PA: RESULTADO_2022_PA_PROVISORIO,
  PB: RESULTADO_2022_PB_PROVISORIO,
  PE: RESULTADO_2022_PE_PROVISORIO,
  PI: RESULTADO_2022_PI_PROVISORIO,
  PR: RESULTADO_2022_PR_PROVISORIO,
  RJ: RESULTADO_2022_RJ_PROVISORIO,
  RN: RESULTADO_2022_RN_PROVISORIO,
  RO: RESULTADO_2022_RO_PROVISORIO,
  RR: RESULTADO_2022_RR_PROVISORIO,
  RS: RESULTADO_2022_RS_PROVISORIO,
  SE: RESULTADO_2022_SE_PROVISORIO,
  SP: RESULTADO_2022_SP_PROVISORIO,
  TO: RESULTADO_2022_TO_PROVISORIO,
};

// DF não elege Deputado Estadual (elege Deputado Distrital, cargo que o app
// não modela) — os outros dois cargos existem normalmente.
const CARGO_LABEL = { estadual: "Deputado Estadual", federal: "Deputado Federal", senador: "Senador" };

// Candidatos de um estado+cargo, no formato de dados/base-2022.js (array de
// {nome, vagas2022, candidatos}) — [] quando o estado não modela esse cargo
// (ex.: Estadual no DF), pra quem chama não precisar checar undefined.
function candidatosEstadoCargo(uf, cargo) {
  const doEstado = RESULTADOS_2022_POR_ESTADO[uf];
  if (!doEstado) return [];
  return doEstado[CARGO_LABEL[cargo]] || [];
}

// Total de vagas em disputa num estado+cargo — número fixo por lei (art. 45
// da Constituição pra Federal, Constituição estadual pra Estadual, 1/3 ou
// 2/3 do Senado por ciclo pra Senador), não depende de quantos partidos já
// têm candidato cadastrado. SEMPRE soma a partir de candidatosEstadoCargo
// (o resultado real e completo de 2022, imutável) — nunca a partir de
// candidatos2026EstadoCargo nem de pcState.palpiteEdicao, que podem estar
// parciais enquanto as atas de 2026 ainda estão sendo processadas (ver
// dados/estados/registro-2026.js e .claude/agents/atualizador-atas-2026.md).
// Foi exatamente essa mistura que fez o total de vagas de SC cair de
// 40→30 (Estadual) e 16→12 (Federal) quando os primeiros dados reais de
// 2026 entraram — 02/08/2026.
function vagasFixasCargo(uf, cargo) {
  return candidatosEstadoCargo(uf, cargo).reduce((s, p) => s + (Number(p.vagas2022) || 0), 0);
}
