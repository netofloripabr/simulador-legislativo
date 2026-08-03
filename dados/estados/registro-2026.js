// Pool de candidatos 2026 (reais de ata + fictício de preenchimento) por
// estado+cargo — gerado por ferramentas/gerar_ficticios_2026.py em
// dados/estados/{uf}-2026-provisorio.js (carregado antes deste arquivo em
// index.html). Junta com o histórico de 2022 (RESULTADOS_2022_POR_ESTADO,
// ver registro-2022.js) por nome de urna — quem repete candidatura em 2026
// (mesmo partido ou trocando de legenda) entra com o voto real de 2022 como
// referência de projeção; quem é candidato novo ou fictício entra com 0
// (sem histórico ainda).
//
// candidatos2026EstadoCargo(uf, cargoLabel) retorna no MESMO formato de
// candidatosEstadoCargo (array de {nome, vagas2022, candidatos:[{votos,...}]})
// — quem chama (montarEstadoPalpite, nuvem/palpites.js) não precisa saber a
// diferença. Retorna null quando aquele estado+cargo ainda não tem dado 2026
// gerado, pra quem chama cair de volta pro 2022 puro.

// Federações registradas no TSE (valem pra eleição inteira, em qualquer
// estado — não é coisa específica de SC) — fonte:
// https://www.tse.jus.br/partidos/federacoes-registradas-no-tse. Partido que
// concorreu sozinho em 2022 e hoje é membro de federação passa a concorrer
// só sob o nome dela em 2026 (mesma tabela usada por
// ferramentas/gerar_ficticios_2026.py) — sem isso, a vagas2022 do grupo de
// 2026 (ex.: "PT/PC do B/PV") ficaria zerada mesmo o partido tendo elegido
// gente em 2022 sob o nome antigo ("PT"), e o app trataria os dois nomes
// como partidos diferentes.
const FEDERACOES_2026 = {
  NACIONAL: {
    PT: "PT/PC do B/PV", "PC do B": "PT/PC do B/PV", PV: "PT/PC do B/PV",
    PSOL: "PSOL/REDE", REDE: "PSOL/REDE",
    "UNIÃO": "UNIÃO/PP", PP: "UNIÃO/PP",
    PSDB: "PSDB/CIDADANIA", CIDADANIA: "PSDB/CIDADANIA",
    PRD: "PRD/SOLIDARIEDADE", SOLIDARIEDADE: "PRD/SOLIDARIEDADE",
  },
  // Exceções por estado, se algum dia precisar (nenhuma até agora).
};

function nomeFederacao2026(uf, partido2022) {
  const porEstado = FEDERACOES_2026[uf];
  if (porEstado && porEstado[partido2022]) return porEstado[partido2022];
  return FEDERACOES_2026.NACIONAL[partido2022] || partido2022;
}

// Lista de partidos membros de cada federação (derivada de FEDERACOES_2026.
// NACIONAL) — usada pra mostrar TODOS os membros na quebra de votos por
// partido (interface/prospeccao.js), mesmo quando um deles ainda não tem
// nenhum candidato cadastrado num cargo específico (ex.: PV só lançou
// candidatos a Dep. Federal em SC — na aba de Dep. Estadual ele continua
// aparecendo na lista, só que com 0 votos, em vez de sumir).
const MEMBROS_POR_FEDERACAO = {};
Object.entries(FEDERACOES_2026.NACIONAL).forEach(([partido, federacao]) => {
  if (!MEMBROS_POR_FEDERACAO[federacao]) MEMBROS_POR_FEDERACAO[federacao] = [];
  MEMBROS_POR_FEDERACAO[federacao].push(partido);
});

function _normalizarNome2026(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function candidatos2026EstadoCargo(uf, cargoLabel) {
  const dados2026 = window[`CANDIDATOS_2026_${uf}_PROVISORIO`];
  if (!dados2026 || !dados2026[cargoLabel]) return null;
  const lista2026 = dados2026[cargoLabel];

  const doEstado2022 = (RESULTADOS_2022_POR_ESTADO[uf] && RESULTADOS_2022_POR_ESTADO[uf][cargoLabel]) || [];
  // Indexado tanto pelo nome de urna quanto pelo nome civil — a ata de 2026
  // às vezes registra um apelido diferente do nome de urna completo de 2022
  // (ex.: 2026 "Marquito" × 2022 "Marquito Marcos José Abreu"), e nesses
  // casos só o nome civil (igual nos dois anos) consegue casar os registros.
  // Sem isso, candidato reeleito perde o próprio histórico de 2022 — inclusive
  // se foi eleito — e reaparece como se fosse estreante.
  const indice2022 = {};
  const indice2022PorNome = {};
  doEstado2022.forEach((p) => {
    p.candidatos.forEach((c) => {
      // guarda o partido de 2022 de duas formas: convertido pro nome da
      // federação de 2026 (só pra COMPARAR e saber se a pessoa TROCOU de
      // legenda de verdade, ou só migrou com o partido pra federação nova)
      // e o nome puro/original (pra EXIBIR — nunca mostra federação na
      // referência de 2022, só o partido de fato de quem a pessoa era).
      const registro = {
        ...c,
        _partido2022Federado: nomeFederacao2026(uf, p.nome),
        _partido2022Original: p.nome,
      };
      indice2022[_normalizarNome2026(c.nomeUrna || c.nome)] = registro;
      const chaveNome = _normalizarNome2026(c.nome);
      if (!indice2022PorNome[chaveNome]) indice2022PorNome[chaveNome] = registro;
    });
  });

  const vagas2022PorPartido26 = {};
  doEstado2022.forEach((p) => {
    const p26 = nomeFederacao2026(uf, p.nome);
    vagas2022PorPartido26[p26] = (vagas2022PorPartido26[p26] || 0) + (Number(p.vagas2022) || 0);
  });

  const grupos = {};
  lista2026.forEach((c) => {
    const partido = c.partido || "SEM PARTIDO";
    if (!grupos[partido]) {
      grupos[partido] = { nome: partido, vagas2022: vagas2022PorPartido26[partido] || 0, candidatos: [] };
    }
    const ref2022 = indice2022[_normalizarNome2026(c.nomeUrna || c.nome)] || indice2022PorNome[_normalizarNome2026(c.nome)] || null;
    // Só marca "trocou de partido" quando o partido de 2022 (já convertido
    // pra federação, se for o caso) é DIFERENTE do partido de 2026 — pra não
    // mostrar "eleito PT" em cima de alguém que só migrou pra federação
    // PT/PC do B/PV, que é o mesmo partido. A comparação usa o nome
    // federado, mas o que aparece na tela (partidoOrigem2022, logo abaixo)
    // é sempre o nome ORIGINAL do partido de 2022 — nunca uma federação.
    const trocouPartido = ref2022 && ref2022._partido2022Federado && ref2022._partido2022Federado !== partido;
    grupos[partido].candidatos.push({
      id: c.id,
      nome: c.nome,
      nomeUrna: c.nomeUrna || "",
      municipio: "",
      votos: ref2022 ? ref2022.votos : 0,
      fonte: c.fonte || "atas-2026",
      eleito2022: ref2022 ? !!ref2022.eleito2022 : false,
      invalidado2022: ref2022 ? !!ref2022.invalidado2022 : false,
      motivoInvalidacao: ref2022 ? ref2022.motivoInvalidacao : undefined,
      partidoOrigem2022: trocouPartido ? ref2022._partido2022Original : null,
      // Partido de fato do candidato (PT, PC do B, PV...) — pode ser
      // diferente do nome do grupo acima quando o grupo é uma federação
      // (PT/PC do B/PV), que só existe pra efeito de contagem/ranking de
      // vagas (quociente partidário da federação inteira). Sem override,
      // o próprio nome do grupo já É o partido de fato (não é federação).
      partidoOriginal: c.partidoOriginal || partido,
    });
  });
  return Object.values(grupos);
}
