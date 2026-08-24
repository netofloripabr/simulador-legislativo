// Termômetro Eleitoral — revelações pagas (migração 28): nome sempre foi
// conta-gotas (registrarAcessoMediana/acelerarMediana, nuvem/creditos.js);
// a VOTAÇÃO mediana de cada candidato é um cadeado separado, por
// candidato, com o Coringa como forma de sorteio.

// Classifica raridade pela posição no ranking (já ordenado por votos
// desc): topo = mais votado = mais disputado = raro. Terços simples —
// decisão de produto de 24/08/2026, não precisa ser exata.
function classificarRaridadeTermometro(indice, total) {
  if (total <= 0) return "comum";
  if (indice < total / 3) return "raro";
  if (indice < (total * 2) / 3) return "especial";
  return "comum";
}

// Sorteio com peso invertido: quanto mais alto na lista (mais votos),
// menor o peso — "raridade decrescente" (o usuário, 24/08/2026). Peso
// cresce com o índice (posição mais baixa = peso maior).
function sortearCoringaTermometro(projecaoOrdenada, chavesJaReveladas) {
  const disponiveis = projecaoOrdenada
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !chavesJaReveladas.has(c.chave));
  if (!disponiveis.length) return null;
  const pesos = disponiveis.map(({ i }) => Math.pow(i + 1, 1.3));
  const total = pesos.reduce((s, w) => s + w, 0);
  let alvo = Math.random() * total;
  for (let k = 0; k < disponiveis.length; k++) {
    alvo -= pesos[k];
    if (alvo <= 0) {
      const { c, i } = disponiveis[k];
      return { candidato: c, raridade: classificarRaridadeTermometro(i, projecaoOrdenada.length) };
    }
  }
  const ult = disponiveis[disponiveis.length - 1];
  return { candidato: ult.c, raridade: classificarRaridadeTermometro(ult.i, projecaoOrdenada.length) };
}

async function minhasRevelacoesTermometro(estado, cargo) {
  const { data, error } = await supabaseClient.rpc("listar_minhas_revelacoes", { p_estado: estado, p_cargo: cargo });
  if (error) { console.error("Erro ao carregar revelações:", error); return []; }
  return data || [];
}

// Debita e persiste — devolve {ok:true} ou {ok:false, mensagem}. dias:
// null = definitivo. raridade: só preenchido pelo Coringa.
async function revelarCandidatosTermometro(perfilId, estado, cargo, chaves, custoSL, referencia, dias, raridade) {
  const { gastou, error } = await gastarCreditosConta(perfilId, custoSL, "gasto_termometro", referencia);
  if (error) return { ok: false, mensagem: "Erro ao conferir crédito: " + error.message };
  if (!gastou) return { ok: false, mensagem: "Saldo insuficiente." };
  const { error: erroRevelar } = await supabaseClient.rpc("revelar_candidatos_termometro", {
    p_estado: estado, p_cargo: cargo, p_chaves: chaves, p_dias: dias || null, p_raridade: raridade || null,
  });
  if (erroRevelar) return { ok: false, mensagem: "Crédito debitado, mas a revelação falhou — fale com o suporte: " + erroRevelar.message };
  return { ok: true };
}
