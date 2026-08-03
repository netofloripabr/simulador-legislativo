// Lista completa de partidos que tiveram votos para Deputado Estadual em
// Santa Catarina em 2022 — praticamente equivalente ao conjunto de partidos
// registrados no TSE naquele momento (27 partidos). Fonte: arquivo bruto do
// TSE "votação por seção" 2022/SC, mesma fonte já usada em dados/base-2022.js,
// conferido nesta mesma apuração (ver PROJETO.md).
//
// Os 13 primeiros já têm candidatos completos modelados em BASE_2022 (são os
// que elegeram alguém em 2022). Os outros 14 não elegeram ninguém em SC em
// 2022, mas existem e podem lançar candidatos em 2026 — por isso entram aqui
// como referência (nome, vagas2022 sempre 0, total de votos que já tiveram),
// mesmo sem lista de candidatos própria ainda.
//
// Atenção ao usar em 2026: partidos podem se fundir, mudar de nome ou surgir
// novos entre 2022 e 2026 (ex.: fusões e renomeações são comuns no Brasil).
// Conferir contra o registro oficial do TSE quando as candidaturas de 2026
// forem oficializadas, antes de considerar esta lista definitiva.
const PARTIDOS_BRASIL = [
  { sigla: "PL", nome: "Partido Liberal", vagas2022: 11, votos2022: 882396 },
  { sigla: "MDB", nome: "Movimento Democrático Brasileiro", vagas2022: 6, votos2022: 506374 },
  { sigla: "PT", nome: "Partido dos Trabalhadores", vagas2022: 4, votos2022: 441063 },
  { sigla: "PSD", nome: "Partido Social Democrático", vagas2022: 3, votos2022: 293675 },
  { sigla: "Podemos", nome: "Podemos", vagas2022: 3, votos2022: 237137 },
  { sigla: "União Brasil", nome: "União Brasil", vagas2022: 3, votos2022: 267018 },
  { sigla: "PP", nome: "Progressistas", vagas2022: 3, votos2022: 280630 },
  { sigla: "PSDB", nome: "Partido da Social Democracia Brasileira", vagas2022: 2, votos2022: 211313 },
  { sigla: "Republicanos", nome: "Republicanos", vagas2022: 1, votos2022: 178805 },
  { sigla: "PTB", nome: "Partido Trabalhista Brasileiro", vagas2022: 1, votos2022: 97739 },
  { sigla: "PSOL", nome: "Partido Socialismo e Liberdade", vagas2022: 1, votos2022: 83044 },
  { sigla: "Novo", nome: "Partido Novo", vagas2022: 1, votos2022: 136632 },
  { sigla: "PDT", nome: "Partido Democrático Trabalhista", vagas2022: 1, votos2022: 82155 },
  { sigla: "PSB", nome: "Partido Socialista Brasileiro", vagas2022: 0, votos2022: 92851 },
  { sigla: "Patriota", nome: "Patriota", vagas2022: 0, votos2022: 88159 },
  { sigla: "Solidariedade", nome: "Solidariedade", vagas2022: 0, votos2022: 31259 },
  { sigla: "DC", nome: "Democracia Cristã", vagas2022: 0, votos2022: 31216 },
  { sigla: "PSC", nome: "Partido Social Cristão", vagas2022: 0, votos2022: 30042 },
  { sigla: "Cidadania", nome: "Cidadania", vagas2022: 0, votos2022: 25109 },
  { sigla: "PCdoB", nome: "Partido Comunista do Brasil", vagas2022: 0, votos2022: 17985 },
  { sigla: "Avante", nome: "Avante", vagas2022: 0, votos2022: 8610 },
  { sigla: "PRTB", nome: "Partido Renovador Trabalhista Brasileiro", vagas2022: 0, votos2022: 3139 },
  { sigla: "Rede", nome: "Rede Sustentabilidade", vagas2022: 0, votos2022: 1501 },
  { sigla: "PROS", nome: "Partido Republicano da Ordem Social", vagas2022: 0, votos2022: 1290 },
  { sigla: "PSTU", nome: "Partido Socialista dos Trabalhadores Unificado", vagas2022: 0, votos2022: 1083 },
  { sigla: "PV", nome: "Partido Verde", vagas2022: 0, votos2022: 590 },
  { sigla: "PCO", nome: "Partido da Causa Operária", vagas2022: 0, votos2022: 286 },
];
