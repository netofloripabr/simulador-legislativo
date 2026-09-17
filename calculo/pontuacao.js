// Pontuação e ranqueamento (Fase 6, PROJETO.md) — implementa os eixos 1 e 2
// do desenho em RANQUEAMENTO.md (acertos e proximidade numérica). Timing
// (eixo 3) e tarefas (eixo 4) ficam fora daqui de propósito: dependem de
// timestamp e de estado de conta, que são dado de banco/produto, não regra
// eleitoral pura — só o multiplicador de timing (bonusTiming) mora aqui,
// porque a FÓRMULA dele é regra, mesmo a entrada vindo de fora.
//
// Funções puras: array de candidato PREVISTO (palpite) × array de
// candidato OFICIAL (resultado real) entram, pontuação sai — nada aqui
// toca em pcState, Supabase ou DOM. Isso permite testar com 2022 como
// ensaio (testes/pontuacao.test.js) mesmo sem o resultado de 2026 existir
// ainda.
//
// Decisões (RANQUEAMENTO.md + respostas de 17/09/2026, opção mais
// simples/reversível em cada uma — ver commit/changelog do documento):
// 1. Ranking por cargo (Estadual/Federal/Senador) + um geral combinado —
//    calculado aqui por cargo; combinar os 3 é responsabilidade de quem
//    chama (soma ou média simples dos 3 resultados).
// 2. Falso positivo (marcou eleito quem não se elegeu) NÃO desconta —
//    pontosAcertos nunca fica negativo.
// 3. A cédula pontua pelo conteúdo ATUAL (reflete edição paga via
//    migração 25 — editar_cedula_depositada); o bônus de timing usa
//    SEMPRE o primeiro depósito (depositado_em), nunca a data de edição —
//    editar depois não rouba nem dá bônus de "chegou cedo".
// 4. Privacidade do ranking reaproveita o campo `anonimo` que a cédula já
//    tem (mesmo usado no compartilhamento) — sem mecanismo novo.
// 5. Prêmio real por fora do escopo técnico — não muda nada aqui.
//
// Candidatura inválida/retirada/sub judice NÃO pontua (nem positivo nem
// negativo) — política já definida em RANQUEAMENTO.md, "Validade de
// candidatura", 21/08/2026: só status "valido" entra na conta.

// Pontua UM candidato: previsto (do palpite) × oficial (resultado real).
// previsto: { chave, votos, marcadoEleito }
// oficial:  { chave, votosReais, eleitoReal, status } — status esperado:
//   "valido" | "retirada" | "sub_judice" | "cassado".
// Devolve null quando o candidato não pontua (sem resultado oficial, ou
// status diferente de "valido") — quem soma trata null como "não conta
// nem no numerador nem no denominador".
function pontuarCandidato(previsto, oficial) {
  if (!oficial || oficial.status !== "valido") return null;
  const marcou = !!(previsto && previsto.marcadoEleito);
  const eleito = !!oficial.eleitoReal;
  const votosPrevisto = Number(previsto && previsto.votos) || 0;
  const votosReais = Number(oficial.votosReais) || 0;
  return { chave: oficial.chave, marcou, eleito, acertoEleicao: marcou && eleito, votosPrevisto, votosReais };
}

// Pontua a cédula inteira de UM cargo.
// previstos: array de candidato do palpite salvo (chave, votos, marcadoEleito).
// oficiais: array de candidato do resultado oficial (chave, votosReais,
//   eleitoReal, status) — só os que TÊM correspondência em `previstos`
//   entram na proximidade; os eleitos reais entram no denominador dos
//   acertos mesmo se a pessoa não tiver marcado ninguém daquele partido
//   (conta como erro, não como "não pontuável").
// vagasCargo: total de vagas do cargo (denominador do eixo 1) — vem de
// vagasFixasCargo/registro-2022.js, não é recalculado aqui.
// opcoes.pisoErro (padrão 1 = 100%): erro relativo acima disso não desconta
//   mais — evita punir infinitamente um palpite ousado num candidato
//   marginal (RANQUEAMENTO.md, eixo 2).
// opcoes.pesoAcertos/pesoProximidade (padrão 0.6/0.4): eixo 1 pesa mais,
//   por ser "o núcleo do jogo" (RANQUEAMENTO.md) — ajustável, não é regra
//   eleitoral fixa, só o valor inicial.
function pontuarCedulaCargo(previstos, oficiais, vagasCargo, opcoes) {
  opcoes = opcoes || {};
  const pisoErro = opcoes.pisoErro != null ? opcoes.pisoErro : 1;
  const pesoAcertos = opcoes.pesoAcertos != null ? opcoes.pesoAcertos : 0.6;
  const pesoProximidade = opcoes.pesoProximidade != null ? opcoes.pesoProximidade : 0.4;

  const previstosPorChave = {};
  (previstos || []).forEach((p) => { previstosPorChave[p.chave] = p; });

  const totalVotosValidosReal = (oficiais || []).reduce((s, o) => s + (o.status === "valido" ? Number(o.votosReais) || 0 : 0), 0);

  let acertosEleicao = 0;
  let vagasValidas = 0; // denominador real do eixo 1 (pode ser < vagasCargo se algum eleito ficou sub judice/cassado)
  let somaErro = 0;
  let candidatosComparados = 0;
  const detalhe = [];

  (oficiais || []).forEach((oficial) => {
    const previsto = previstosPorChave[oficial.chave];
    const r = pontuarCandidato(previsto, oficial);
    if (!r) return; // status inválido — não pontua, não conta
    if (r.eleito) {
      vagasValidas++;
      if (r.acertoEleicao) acertosEleicao++;
    }
    // Proximidade: só faz sentido pra quem o usuário efetivamente
    // preencheu (candidato ausente do palpite = votosPrevisto 0, o que já
    // é o comportamento natural — não precisa de caso especial).
    const erroRelativo = totalVotosValidosReal > 0 ? Math.abs(r.votosPrevisto - r.votosReais) / totalVotosValidosReal : 0;
    const erroLimitado = Math.min(erroRelativo, pisoErro);
    somaErro += erroLimitado;
    candidatosComparados++;
    detalhe.push({ chave: r.chave, marcou: r.marcou, eleito: r.eleito, acertoEleicao: r.acertoEleicao, erroRelativo: erroLimitado });
  });

  const denominadorAcertos = vagasValidas > 0 ? vagasValidas : (vagasCargo || 0);
  const pctAcertos = denominadorAcertos > 0 ? acertosEleicao / denominadorAcertos : 0;
  const erroMedio = candidatosComparados > 0 ? somaErro / candidatosComparados : pisoErro;
  const pctProximidade = pisoErro > 0 ? Math.max(0, 1 - erroMedio / pisoErro) : 0;

  const pontosTotal = pctAcertos * pesoAcertos + pctProximidade * pesoProximidade;

  return {
    acertosEleicao, vagasValidas, pctAcertos,
    erroMedio, pctProximidade,
    candidatosComparados,
    pontosTotal, // 0..1 — quem chama decide a escala de exibição (ex.: ×1000)
    detalhe,
  };
}

// Eixo 3 — bônus de timing. Multiplicador pequeno (nunca decide sozinho o
// ranking) pra quem travou a cédula bem antes do prazo. depositadoEm e
// prazoFinal: strings ISO ou Date. abertoDesde (opcional): quando o cargo
// abriu pra preenchimento — sem isso, usa proporção sobre 30 dias antes do
// prazo como janela padrão.
function bonusTiming(depositadoEm, prazoFinal, abertoDesde, opcoes) {
  opcoes = opcoes || {};
  const bonusMax = opcoes.bonusMax != null ? opcoes.bonusMax : 0.1; // +10% no máximo
  if (!depositadoEm || !prazoFinal) return 1;
  const prazo = new Date(prazoFinal).getTime();
  const dep = new Date(depositadoEm).getTime();
  const inicio = abertoDesde ? new Date(abertoDesde).getTime() : prazo - 30 * 24 * 60 * 60 * 1000;
  if (!(prazo > inicio) || dep >= prazo || dep <= inicio) return 1;
  // quanto mais cedo (mais perto de `inicio`), maior o bônus — linear.
  const fracaoRestante = (prazo - dep) / (prazo - inicio); // 0 (no prazo) .. 1 (no início)
  return 1 + bonusMax * fracaoRestante;
}
