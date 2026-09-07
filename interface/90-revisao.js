// Revisão e depósito da cédula, documento impresso (doc*, montarSecaoImpressaoCargo,
// impressão do duelo), disputa das sobras, consulta pública de cédula (ranking)
// e Termômetro/Quadro de médias. Ordem de carga no index.html.

// ---------- Revisão + cerimônia de depósito da cédula ----------

// Tela revisora: lista nominal completa, ordem decrescente de votação
// (cruzando todos os partidos), agrupada por cargo em acordeões — hoje só
// Dep. Estadual tem dado real, os outros dois cargos entram aqui quando
// tiverem candidatos carregados (mesmo componente, ver CARGOS).
// Classifica os 40 marcados como "eleito por QP" (quociente partidário direto,
// art. 107) ou "eleito por média" (sobra distribuída pelo método das médias,
// art. 109) — mesma distinção que o TSE usa nos dados reais (ver
// ferramentas/tratar_resultados_2022.py, DS_SIT_TOT_TURNO). QE calculado com
// o total de votos de TODOS os candidatos de todos os partidos (marcados ou
// não, incluindo legenda — é assim que QP é calculado de verdade: o voto de
// legenda soma no total do partido mesmo sem elegar ninguém sozinho).
// A marcação da pessoa continua sendo o que decide quem aparece como eleito
// aqui — nunca troca ninguém sozinho. Mas cada indicação que não bateria com
// o resultado "de verdade" (calculado só a partir da votação digitada, sem
// olhar quem está marcado — ver dhondtComCorte em calculo/eleitoral.js)
// ganha um aviso com o tanto de votos que faltaria, pro partido ou pro
// próprio candidato, pra virar eleição de fato. Pura informação; a escolha
// continua inteira da pessoa.
function classificarEleitosPorPartido(listaParam, cargo) {
  const lista = listaParam || pcState.palpiteEdicao;
  // Número fixo (não soma a partir de "lista", que pode estar parcial
  // enquanto nem todo partido tem ata de 2026 processada) — precisa do
  // "cargo" explícito porque essa função é chamada com listas de cargos
  // diferentes do pcState.cargoAtivo (Revisão e impressão mostram os 3
  // cargos ao mesmo tempo, ver renderRevisaoDeposito/montarSecaoImpressaoCargo).
  const cargoResolvido = cargo || pcState.cargoAtivo;
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargoResolvido);
  // Senador é cargo MAJORITÁRIO (art. 46 da Constituição) — as vagas em
  // disputa (2 no ciclo 2026, ver VAGAS_SENADOR_2026) vão pra quem tiver
  // mais voto individual, sem quociente eleitoral nem D'Hondt: esses dois
  // são regra de proporcional (Dep. Estadual/Federal), não existem pra
  // Senado. Ramo separado, achado em 04/08/2026 — antes disso a Revisão
  // tratava Senador como se fosse proporcional, o que podia marcar como
  // "inconsistente" um candidato que na verdade venceria (ou o contrário).
  if (cargoResolvido === "senador") {
    return classificarEleitosMajoritario(lista, totalVagasCargo);
  }
  const totalValidos = lista.reduce((s, p) => s + partyVotos(p), 0);
  const qe = quocienteEleitoral(totalValidos, totalVagasCargo);
  const { counts: cadeirasPorPartido, corte } = dhondtComCorte(lista, totalVagasCargo);
  // Art. 108 (04/09/2026): mínimo nominal de 10% do QE — SÓ AVISO (flag
  // abaixoMinimoNominal em cada linha); não muda consistência, gap nem vaga.
  const minimoVotosNominal = qe ? 0.1 * qe : 0;
  const resultado = [];
  lista.forEach((p, pIdx) => {
    const marcados = p.candidatos.filter((c) => c.marcadoEleito && c.fonte !== "legenda");
    if (!marcados.length) return;
    const votosPartido = partyVotos(p);
    const qp = qe ? Math.min(marcados.length, Math.floor(votosPartido / qe)) : 0;

    // Quem o partido elegeria de verdade com a votação atual, ordenado só
    // pelos votos de cada candidato real (nunca pela marcação manual).
    const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
    const reaisOrdenados = [...p.candidatos]
      .filter((c) => c.fonte !== "legenda")
      .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const verdadeirosEleitos = new Set(reaisOrdenados.slice(0, cadeirasReais).map((c) => c.chave));
    // dhondtComCorte calcula cadeiras a partir dos VOTOS do partido, sem
    // saber quantos candidatos de verdade existem na lista (pode ficar
    // maior que reaisOrdenados.length se a chapa do partido estiver
    // incompleta — ex.: só fictício/real parcial ainda, ou um "palpite"
    // salvo de uma rodada de dados anterior). Sem essa proteção, a tela de
    // Revisão inteira quebrava com "Cannot read properties of undefined
    // (reading 'votos')" — achado em 04/08/2026.
    const ultimoEleitoDeVerdade = cadeirasReais > 0 ? reaisOrdenados[cadeirasReais - 1] : null;
    const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;

    const ordenados = [...marcados].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    ordenados.forEach((c, i) => {
      const abaixoMinimoNominal = minimoVotosNominal > 0 && (Number(c.votos) || 0) < minimoVotosNominal;
      const consistente = verdadeirosEleitos.has(c.chave);
      let gap = null;
      if (!consistente) {
        // O que importa não é "quantos foram marcados" — é se a vaga que
        // seria disputada (a última vaga real, hoje) já é de OUTRO
        // candidato marcado. Se for, ultrapassar essa pessoa por 1-2 votos
        // só troca um problema pelo outro (ping-pong). Se a vaga for de
        // alguém que não foi marcado, ultrapassar é seguro — sobra a vaga
        // real de qualquer forma.
        const gapIndividual = cadeirasReais > 0 ? Math.max(0, votosDoUltimoEleitoDeVerdade - (Number(c.votos) || 0) + 1) : null;
        const necessarioPartido = Math.floor(corte * (cadeirasReais + 1)) + 1;
        const gapPartido = Math.max(0, necessarioPartido - votosPartido);
        // Mesma correção de listaUnificadaRevisao: se tem outro não-eleito do
        // mesmo partido com mais voto que este candidato (ranqueado acima
        // dele, abaixo do corte), só bater o partido/último eleito não
        // basta — precisa também superar esse rival de cima.
        const posAtual = reaisOrdenados.findIndex((rc) => rc.chave === c.chave);
        const rivalDeCima = posAtual > cadeirasReais ? reaisOrdenados[cadeirasReais] : null;
        const gapRivalDeCima = rivalDeCima ? Math.max(0, (Number(rivalDeCima.votos) || 0) - (Number(c.votos) || 0) + 1) : 0;
        const acrescimo = Math.max(gapPartido, gapIndividual || 0, gapRivalDeCima);
        gap = { individual: gapIndividual, partido: gapPartido, acrescimo };
      }
      resultado.push({ chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos: Number(c.votos) || 0, tag: i < qp ? "QP" : "média", consistente, gap, abaixoMinimoNominal, minimoVotosNominal });
    });
  });
  return resultado.sort((a, b) => b.votos - a.votos);
}

// Vencedores de cargo MAJORITÁRIO (Senador — ver ramo em
// classificarEleitosPorPartido acima). As N vagas em disputa vão pra quem
// tiver mais votos individuais, juntando os candidatos de TODOS os
// partidos numa fila só — sem quociente eleitoral, sem D'Hondt, sem
// "cadeira por partido" (o partido/coligação só decide QUEM pode
// concorrer, não quantas vagas ele "ganha"). Mesmo formato de retorno de
// classificarEleitosPorPartido (chave/nome/partido/votos/tag/consistente/
// gap), pra servir nos mesmos lugares (Revisão, impressão, compartilhado)
// sem precisar adaptar quem chama.
function classificarEleitosMajoritario(lista, totalVagasCargo) {
  // "partido" aqui precisa ser p.nome (o nome do card/federação), igual ao
  // ramo proporcional acima — é essa string que o editor de voto da
  // Revisão (data-pc-voto-revisao) usa pra achar de volta o partido em
  // pcState.palpitesPorCargo; usar c.partidoOriginal aqui quebraria esse
  // lookup sempre que o candidato for de federação.
  const todosReais = [];
  lista.forEach((p) => {
    p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => {
      todosReais.push({ ...c, _partidoExibicao: p.nome });
    });
  });
  const ordenados = [...todosReais].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const verdadeirosEleitos = new Set(ordenados.slice(0, totalVagasCargo).map((c) => c.chave));
  const ultimoEleitoDeVerdade = totalVagasCargo > 0 ? ordenados[totalVagasCargo - 1] : null;
  const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;

  const marcados = todosReais.filter((c) => c.marcadoEleito);
  const marcadosOrdenados = [...marcados].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
  const resultado = marcadosOrdenados.map((c) => {
    const consistente = verdadeirosEleitos.has(c.chave);
    let gap = null;
    if (!consistente) {
      // gap.partido fica null de propósito (não existe "quociente
      // partidário" pra cargo majoritário) — o texto/botão da Revisão que
      // usa gap.partido (linha ~2451/2458) já trata null como "não se
      // aplica a este cargo", ver comentário lá.
      const gapIndividual = Math.max(0, votosDoUltimoEleitoDeVerdade - (Number(c.votos) || 0) + 1);
      gap = { individual: gapIndividual, partido: null, acrescimo: gapIndividual };
    }
    return { chave: c.chave, nome: nomeExibicao(c), partido: c._partidoExibicao, votos: Number(c.votos) || 0, tag: "majoritário", consistente, gap };
  });
  return resultado.sort((a, b) => b.votos - a.votos);
}

// Próximos mais votados fora dos 40 marcados — mesmo espírito de "suplente"
// (quem ficaria em seguida na fila, por votação, se algum titular saísse).
// Não é o cálculo oficial de suplência (que segue a ordem dentro do próprio
// partido do titular) — aqui é um ranking simples entre todos os partidos,
// só pra dar visibilidade a quem quase entrou.
function proximosSuplentes(limite, listaParam) {
  const lista = listaParam || pcState.palpiteEdicao;
  const todos = [];
  lista.forEach((p) => {
    p.candidatos.filter((c) => !c.marcadoEleito && c.fonte !== "legenda").forEach((c) => {
      todos.push({ chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos: Number(c.votos) || 0 });
    });
  });
  return todos.sort((a, b) => b.votos - a.votos).slice(0, limite);
}

// Garante que os 3 cargos tenham uma lista pronta em pcState.palpitesPorCargo
// — usa o palpite JÁ EM MEMÓRIA (pcState.palpiteEdicao) pro cargo ativo
// agora (preserva o que a pessoa acabou de editar), e carrega do zero (base
// 2022 + candidatos 2026) pros outros dois na primeira vez que a Revisão é
// aberta nesta sessão — depois disso, qualquer edição feita ali dentro (em
// qualquer um dos 3 cargos) fica guardada aqui e sobrevive a re-renders.
function garantirPalpitesPorCargo() {
  if (!pcState.palpitesPorCargo) pcState.palpitesPorCargo = {};
  CARGOS.forEach((c) => {
    if (c.id === pcState.cargoAtivo && pcState.palpiteEdicao) {
      pcState.palpitesPorCargo[c.id] = pcState.palpiteEdicao;
    } else if (!pcState.palpitesPorCargo[c.id]) {
      // Prioridade: rascunho salvo (já carregado em pcState.rascunhosCache
      // por garantirRascunhosCarregados, chamado antes de qualquer tela
      // aparecer — ver initColaborativo e o picker de estado) > base nova.
      // rascunhoEhOrfao: mesma regra de garantirPalpiteEdicaoAtivo — não
      // usa rascunho preso num elenco que a fonte oficial já substituiu.
      const rascunho = pcState.rascunhosCache && pcState.rascunhosCache[c.id];
      const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
      pcState.palpitesPorCargo[c.id] = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial))
        ? podarGruposForaDoPool(rascunho, poolOficial)
        : poolOficial;
    }
  });
  CARGOS.forEach((c) => agendarAutoSaveRascunho(c.id, pcState.palpitesPorCargo[c.id]));
}

// ===== Documento impresso padrão v8 (aprovado pelo usuário em 22/08/2026,
// após 8 rodadas de protótipo) ============================================
// Estrutura REUTILIZÁVEL pra todos os documentos do app: o palpite (agora),
// o de resultado na apuração (mesmas colunas, preenchendo Resultado/Dif./%/
// pontos) e o do desafio 1×1 (futuro — assinatura dupla + código validável).
// Regras visuais travadas: verde do papel é #1FA83A (o #34E84A de tela é
// claro demais sobre branco) e aparece SÓ na marca e em destaque eleitoral;
// toda distinção sobrevive à impressão monocromática por FORMA — E
// preenchido (eleito de fato) vs vazado (marcação do palpite), caixa de
// votos sólida vs quadro de pontos tracejado, negrito vs regular, ▲▼ pela
// direção. Estilos em css/estilo.css (bloco .di-*, dentro de @media print).


// Ícones do documento (SVG inline — no papel não dá pra reusar iconeSvg do
// app: os traços foram redesenhados pra imprimir nítido em 10-15px).
// variante: "meu" (vazado cinza — marcação do palpite), "fato" (preenchido
// verde — eleito de FATO na apuração), "hdr" (vazado, tom de cabeçalho).
function docIcLetra(letra, tam, variante) {
  if (variante === "fato") {
    return `<svg class="di-ic di-fato" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><circle cx="8" cy="8" r="7.2" fill="currentColor"></circle><text x="8" y="11.2" text-anchor="middle" font-size="9" font-weight="800" fill="#fff">${letra}</text></svg>`;
  }
  return `<svg class="di-ic di-${variante}" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.5"></circle><text x="8" y="11.2" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor">${letra}</text></svg>`;
}
function docIcAlvo(tam) {
  return `<svg class="di-ic di-hdr" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"></circle><circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"></circle><circle cx="8" cy="8" r="1.1" fill="currentColor"></circle></svg>`;
}
function docIcPosicao(tam) {
  return `<svg class="di-ic di-hdr" viewBox="0 0 16 16" style="width:${tam}px;height:${tam}px;"><rect x="2.4" y="2.4" width="11.2" height="11.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.5"></rect><path d="M5 8.3l2.1 2.1 4-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
}

// Legenda de ícones — IDÊNTICA em todo documento (palpite, resultado,
// desafio): exigência do usuário depois que o protótipo divergiu entre os
// dois primeiros. Uma linha só; sem explicar ▲▼ (entende-se naturalmente).
function docLegenda() {
  return `
    <div class="di-legenda">
      <span>${docIcLetra("E", 11, "meu")} eleito no seu palpite</span>
      <span>${docIcLetra("S", 11, "meu")} suplente</span>
      <span>${docIcLetra("E", 11, "fato")} eleito de fato</span>
      <span style="margin-left:auto;">pontos: ${docIcLetra("E", 10, "hdr")} acerto de eleição · ${docIcAlvo(10)} proximidade de votos (%) · ${docIcPosicao(10)} acerto de posição · <b>Pts</b>&nbsp;= soma dos três</span>
    </div>`;
}

// Bloco "Registro do documento" (opcional — toggle Registrar na tela de
// impressão): nome do autor, lista, data/hora e linha de assinatura. O
// convidado sem cadastro ganha uma linha em branco pra escrever o nome.
function docRegistro(dataTxt, horaTxt, anonimo) {
  const nomeAutor = anonimo ? "" : (pcState.perfil && pcState.perfil.nome) || "";
  const nomeLista = pcState.listaSalvaNome || "";
  return `
    <div class="di-reg">
      <div class="di-reg-tit">Registro do documento</div>
      <div class="di-reg-corpo">
        <div class="di-reg-dados">
          ${nomeAutor ? `<div class="di-reg-nome">${nomeAutor}</div>` : `<div class="di-reg-nome di-reg-linha-nome">&nbsp;</div>`}
          <div class="di-reg-meta">${nomeLista ? `Lista "${nomeLista}" · ` : ""}gerado em ${dataTxt} às ${horaTxt}</div>
        </div>
        <div class="di-reg-ass"><div class="di-reg-ass-linha"></div><div class="di-reg-ass-leg">assinatura</div></div>
      </div>
    </div>`;
}

function docRodape() {
  return `
    <div class="di-rodape">
      <div class="di-convite">
        <div class="di-frase">Você faria uma lista melhor?</div>
        <div class="di-texto">Monte a sua previsão pra 2026 e dispute com quem entende de política — grátis, direto do celular.</div>
        <div class="di-url">${DOC_APP_URL}</div>
      </div>
      <div class="di-qrbox">
        <svg viewBox="0 0 33 33" width="54" height="54" shape-rendering="crispEdges"><path d="${DOC_QR_PATH}" fill="#111"></path></svg>
        <div class="di-qrleg">aponte a câmera</div>
      </div>
    </div>
    <div class="di-aviso">Jogo de palpites entre participantes — não é pesquisa eleitoral e não tem valor estatístico.</div>`;
}

// Opções do <select> "Por partido" da tela de impressão — união dos
// partidos/federações presentes nos 3 cargos do palpite atual.
function opcoesPartidosImpressao() {
  const nomes = new Set();
  CARGOS.forEach((c) => {
    const lista = pcState.palpitesPorCargo && pcState.palpitesPorCargo[c.id];
    (lista || []).forEach((p) => { if (p.nome) nomes.add(p.nome); });
  });
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt"))
    .map((n) => `<option value="${n}">${n}</option>`).join("");
}

// Uma seção de cargo do documento: cabeçalho de colunas + linhas no padrão
// v8 (posição · ícone E/S · nome/legenda · caixa de votos · quadro de
// pontos). No documento de PALPITE as colunas Resultado/Dif./%/pontos saem
// como "—" (aguardam a apuração oficial — o convite pra voltar ao app).
// op: { recorte, partido, ordenacao } — ver tela de impressão na Revisão.
function montarSecaoImpressaoCargo(cargo, op) {
  op = op || {};
  const cargoInfo = CARGOS.find((c) => c.id === cargo);
  const lista = pcState.palpitesPorCargo[cargo];
  const eleitos = classificarEleitosPorPartido(lista, cargo);
  // Sem teto: "Lista completa" (e "Candidatas", que filtra em cima desta
  // mesma base) precisam de TODOS os não-eleitos, não só os 30 mais
  // votados — o corte em 30 aqui era o bug relatado pelo usuário
  // (03/09/2026): cargos com mais de 30 suplentes (ex.: Dep. Estadual)
  // imprimiam incompletos mesmo escolhendo "Lista completa". Continua
  // existindo um limite de exibição só pra "Top 10", aplicado depois.
  const suplentes = proximosSuplentes(Infinity, lista);
  const generoPorChave = new Map();
  (lista || []).forEach((p) => (p.candidatos || []).forEach((c) => generoPorChave.set(c.chave, c.genero || "")));

  let linhas = eleitos.map((c) => ({ ...c, tipo: "E" }))
    .concat(suplentes.map((c) => ({ ...c, tipo: "S" })));
  if (op.recorte === "eleitos") linhas = linhas.filter((l) => l.tipo === "E");
  else if (op.recorte === "candidatas") linhas = linhas.filter((l) => String(generoPorChave.get(l.chave) || "").toUpperCase().startsWith("FEM"));
  else if (op.recorte === "partido" && op.partido) {
    // Recorte por partido = a CHAPA COMPLETA daquele partido (bug achado
    // pelo usuário em 31/08/2026: filtrar eleitos + 30 suplentes GERAIS
    // deixava de fora quem não estava entre os 30 melhores do cargo
    // inteiro). Eleitos mantêm a etiqueta E; o resto sai como suplente
    // do partido, por votação decrescente.
    const grupoP = (lista || []).find((pp) => pp.nome === op.partido);
    const chavesE = new Set(eleitos.filter((e) => e.partido === op.partido).map((e) => e.chave));
    const eleitoPorChave = new Map(eleitos.filter((e) => e.partido === op.partido).map((e) => [e.chave, e]));
    linhas = (grupoP ? grupoP.candidatos.filter((c) => c.fonte !== "legenda" && !c.status) : [])
      .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0))
      .map((c) => chavesE.has(c.chave)
        ? { ...eleitoPorChave.get(c.chave), tipo: "E" }
        : { chave: c.chave, nome: nomeExibicao(c), partido: grupoP.nome, votos: Number(c.votos) || 0, tipo: "S" });
  }
  if (op.ordenacao === "crescente") linhas = [...linhas].sort((a, b) => a.votos - b.votos);
  else if (op.ordenacao === "decrescente") linhas = [...linhas].sort((a, b) => b.votos - a.votos);
  if (op.recorte === "top10") linhas = linhas.slice(0, 10);

  const nE = linhas.filter((l) => l.tipo === "E").length;
  const nS = linhas.length - nE;
  const rotuloRecorte = ({ eleitos: "só os eleitos", candidatas: "só as candidatas", partido: op.partido || "", top10: "top 10" })[op.recorte] || "";

  // ===== v9 (protótipo aprovado 31/08/2026): etiquetas E-QP/E-M·nª no
  // padrão da tela, chips de partido por eleitos (decrescente) e a relação
  // das rodadas de sobra ao final — SÓ em lista com eleitos de múltiplos
  // partidos (proporcionais completos; senador e recortes ficam como eram).
  const eleitosDoc = linhas.filter((l) => l.tipo === "E");
  const aplicaV9 = cargo !== "senador" && eleitosDoc.length > 0 && new Set(eleitosDoc.map((l) => l.partido)).size > 1;
  let chipsPartidos = "", sobrasHtml = "";
  const rodadaPorChave = new Map();
  if (aplicaV9) {
    const porP = new Map();
    eleitosDoc.forEach((l) => porP.set(l.partido, (porP.get(l.partido) || 0) + 1));
    chipsPartidos = `<div class="di-pchips">${[...porP.entries()].sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `<span class="di-pchip">${p} <b>${n}</b></span>`).join("")}</div>`;

    const totalVagasCargoDoc = vagasFixasCargo(pcState.estado, cargo);
    const disputa = calcularDisputaSobra(lista, totalVagasCargoDoc);
    // rodada de cada cadeira de sobra, na mesma ordenação da classificação
    // (marcados por votos desc, por partido)
    lista.forEach((p, pIdx) => {
      const marcados = [...p.candidatos.filter((c) => c.marcadoEleito && c.fonte !== "legenda")]
        .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      marcados.forEach((c, i) => {
        const r = (disputa.rodadaSobraPorPartido[pIdx] || [])[i];
        if (r !== undefined) rodadaPorChave.set(c.chave, r);
      });
    });
    if (disputa.rodadas && disputa.rodadas.length) {
      const vagasQP = totalVagasCargoDoc - disputa.totalSobrasCargo;
      sobrasHtml = `
      <div class="di-sobras">
        <div class="di-sobras-tit">Distribuição das sobras — método das médias (art. 109)</div>
        <div class="di-sobras-intro">${vagasQP} vaga${vagasQP === 1 ? " saiu" : "s saíram"} direto pelo quociente partidário (QE ${Number(disputa.qe || 0).toLocaleString("pt-BR")}). A${disputa.totalSobrasCargo === 1 ? "" : "s"} <b>${disputa.totalSobrasCargo} restante${disputa.totalSobrasCargo === 1 ? "" : "s"}</b> ${disputa.totalSobrasCargo === 1 ? "foi distribuída" : "foram distribuídas"} rodada a rodada — em cada uma, ganha o partido com a maior média (votos ÷ vagas já obtidas + 1):</div>
        ${disputa.rodadas.map((r) => `
        <div class="di-srod"><span class="rn">${r.numero}ª</span><span class="rp">${r.vencedorNome}</span><span class="rc">${r.vencedorCandidato ? "elegeu " + r.vencedorCandidato : ""}</span><span class="rm">média ${Math.round(r.vencedorMedia || 0).toLocaleString("pt-BR")}</span></div>`).join("")}
      </div>`;
    }
  }
  const sub = aplicaV9
    ? `${nE} eleito${nE === 1 ? "" : "s"}${rotuloRecorte ? ` · recorte: ${rotuloRecorte}` : ""} · votação de referência 2022 · as colunas de resultado e pontos serão preenchidas na apuração oficial — acompanhe.`
    : `${nE} eleito${nE === 1 ? "" : "s"}${nS ? ` + ${nS} suplente${nS === 1 ? "" : "s"}` : ""}${rotuloRecorte ? ` · recorte: ${rotuloRecorte}` : ""} · votação de referência 2022 · as colunas de resultado e pontos serão preenchidas na apuração oficial — acompanhe.`;

  const chipDe = (l) => {
    if (!aplicaV9) return docIcLetra(l.tipo, 15, "meu");
    if (l.tipo === "S") return '<span class="di-chip di-chip-s">S</span>';
    const rod = rodadaPorChave.get(l.chave);
    const eM = l.tag === "média";
    const rotulo = eM ? `E-M${rod !== undefined ? ` · ${rod}ª` : ""}` : "E-QP";
    return `<span class="di-chip${eM ? " di-chip-em" : ""}">${rotulo}</span>`;
  };
  const linhaHtml = (l, i, ultima) => `
    <div class="di-linha${ultima ? " di-fim" : ""}">
      <span class="di-pos">${i + 1}º</span>${chipDe(l)}
      <span class="di-cand"><span class="di-n">${l.nome}</span><span class="di-p">${l.partido}</span></span>
      <span class="di-votos"><span class="di-vv di-forte">${l.votos.toLocaleString("pt-BR")}</span><span class="di-vv di-aguarda">—</span><span class="di-vd di-aguarda">—</span><span class="di-vp di-aguarda">—</span></span>
      <span class="di-painel"><span class="di-pt di-vazio">—</span><span class="di-pt di-vazio">—</span><span class="di-pt di-vazio">—</span><span class="di-pt di-tot di-aguarda">—</span></span>
    </div>`;

  return `
    <div class="di-tit">${cargoInfo.label} — meu palpite</div>
    <div class="di-sub">${sub}</div>
    ${chipsPartidos}
    <div class="di-cols">
      <span class="di-pos"></span><span style="width:${aplicaV9 ? 46 : 15}px; flex-shrink:0;"></span>
      <span class="di-cand">Candidato</span>
      <span class="di-votos di-vh"><span class="di-vv">Palpite</span><span class="di-vv">Resultado</span><span class="di-vd">Dif.</span><span class="di-vp">%</span></span>
      <span class="di-painel di-ph"><span class="di-pt">${docIcLetra("E", 10, "hdr")}</span><span class="di-pt">${docIcAlvo(10)}</span><span class="di-pt">${docIcPosicao(10)}</span><span class="di-pt di-tot">Pts</span></span>
    </div>
    ${linhas.length ? linhas.map((l, i) => linhaHtml(l, i, i === linhas.length - 1)).join("") : '<div class="di-sub" style="padding:8px 0;">Nenhum candidato neste recorte pra este cargo.</div>'}
    ${sobrasHtml}
  `;
}

// O documento inteiro: marca d'água + cabeçalho com marca + seções dos
// cargos escolhidos + legenda + registro (opcional) + rodapé com QR.
// Documento impresso do DUELO 1×1 (pedido do usuário, 30/08/2026): mesma
// estrutura do documento de palpite (marca d'água, cabeçalho, colunas
// di-*, legenda, rodapé com QR), com as DUAS colunas de palpite lado a
// lado (Você × Rival) — resultado e pontos preenchem na apuração.
function montarImpressaoDuelo(desafio, nomeDesafiante) {
  const nomeEstado = (typeof ESTADOS_BRASIL !== "undefined" && (ESTADOS_BRASIL.find((e) => e.sigla === desafio.estado) || {}).nome) || desafio.estado || "";
  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-BR");
  const horaTxt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const cargoInfo = CARGOS.find((c) => c.id === desafio.cargo) || { label: desafio.cargo };
  const meuNome = (pcState.perfil && pcState.perfil.nome) || "Você";
  const ehEleitos = desafio.tipo_disputa === "eleitos";
  const votosEu = new Map((desafio.votos_desafiado || []).map((v) => [v.chave, Number(v.votos) || 0]));
  const votosRival = new Map((desafio.votos_criador || []).map((v) => [v.chave, Number(v.votos) || 0]));
  let linhas = "";
  if (ehEleitos) {
    const meus = new Set((desafio.eleitos_desafiado || []).map((c) => c.chave));
    const dele = new Set((desafio.eleitos_criador || []).map((c) => c.chave));
    const todos = new Map();
    (desafio.eleitos_desafiado || []).forEach((c) => todos.set(c.chave, c));
    (desafio.eleitos_criador || []).forEach((c) => { if (!todos.has(c.chave)) todos.set(c.chave, c); });
    linhas = [...todos.values()].map((c, i) => `
      <div class="di-linha${i === todos.size - 1 ? " di-fim" : ""}">
        <span class="di-pos">${i + 1}º</span>${docIcLetra("E", 15, "meu")}
        <span class="di-cand"><span class="di-n">${c.nome}</span><span class="di-p">${c.partido}</span></span>
        <span class="di-votos"><span class="di-vv di-forte">${meus.has(c.chave) ? "eleito" : "—"}</span><span class="di-vv">${dele.has(c.chave) ? "eleito" : "—"}</span><span class="di-vd di-aguarda">—</span><span class="di-vp di-aguarda">—</span></span>
        <span class="di-painel"><span class="di-pt di-vazio">—</span><span class="di-pt di-tot di-aguarda">—</span></span>
      </div>`).join("");
  } else {
    const escopo = [...(desafio.escopo_candidatos || [])].sort((a, b) => (votosEu.get(b.chave) || 0) - (votosEu.get(a.chave) || 0));
    linhas = escopo.map((c, i) => `
      <div class="di-linha${i === escopo.length - 1 ? " di-fim" : ""}">
        <span class="di-pos">${i + 1}º</span>${docIcLetra("E", 15, "meu")}
        <span class="di-cand"><span class="di-n">${c.nome}</span><span class="di-p">${c.partido}</span></span>
        <span class="di-votos"><span class="di-vv di-forte">${(votosEu.get(c.chave) || 0).toLocaleString("pt-BR")}</span><span class="di-vv">${(votosRival.get(c.chave) || 0).toLocaleString("pt-BR")}</span><span class="di-vd di-aguarda">—</span><span class="di-vp di-aguarda">—</span></span>
        <span class="di-painel"><span class="di-pt di-vazio">—</span><span class="di-pt di-tot di-aguarda">—</span></span>
      </div>`).join("");
  }
  return `
    <div class="di-agua"><span><b>Simula</b>LEGIS</span></div>
    <div class="di-conteudo">
      <div class="di-cab">
        <div class="di-marca">
          <div class="di-wm"><b>Simula</b><span>LEGIS</span></div>
          <div class="di-wmsub">Simulador Eleitoral Legislativo 2026</div>
        </div>
        <div class="di-meta"><b>${nomeEstado}</b> · Duelo 1×1 "${desafio.nome}"${desafio.codigo ? ` · ${desafio.codigo}` : ""}<br>${meuNome} × ${nomeDesafiante} · selado em ${dataTxt}</div>
      </div>
      <div class="di-regra"></div>
      <div class="di-tit">${cargoInfo.label} — duelo 1×1</div>
      <div class="di-sub">${ehEleitos ? "composição do plenário indicada por cada lado" : "palpites dos dois lados"} · a coluna da esquerda é de ${meuNome}, a da direita de ${nomeDesafiante} · resultado e pontos serão preenchidos na apuração oficial — acompanhe.</div>
      <div class="di-cols">
        <span class="di-pos"></span><span style="width:15px; flex-shrink:0;"></span>
        <span class="di-cand">Candidato</span>
        <span class="di-votos di-vh"><span class="di-vv">${meuNome.split(" ")[0]}</span><span class="di-vv">${nomeDesafiante.split(" ")[0]}</span><span class="di-vd">Resultado</span><span class="di-vp">%</span></span>
        <span class="di-painel di-ph"><span class="di-pt">P·V</span><span class="di-pt di-tot">P·R</span></span>
      </div>
      ${linhas}
      <div class="di-legenda">
        <span><b>Resultado</b>&nbsp;= votação oficial da apuração de 2026</span>
        <span><b>P·V / P·R</b>&nbsp;= pontos de ${meuNome.split(" ")[0]} e de ${nomeDesafiante.split(" ")[0]} (acerto de eleição + proximidade de votos)</span>
      </div>
      ${docRodape()}
      <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dataTxt} ${horaTxt}</span></div>
    </div>`;
}

function montarDocumentoImpresso(cargosParaGerar, op) {
  op = op || {};
  const nomeEstado = (typeof ESTADOS_BRASIL !== "undefined" && (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome) || pcState.estado || "";
  const agora = new Date();
  const dataTxt = agora.toLocaleDateString("pt-BR");
  const horaTxt = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const nomeAutor = op.anonimo ? "" : (pcState.perfil && pcState.perfil.nome) || "";
  const ordemLabel = ({ crescente: "votos em ordem crescente", decrescente: "votos em ordem decrescente" })[op.ordenacao] || "eleitos primeiro";
  return `
    <div class="di-agua"><span><b>Simula</b>LEGIS</span></div>
    <div class="di-conteudo">
      <div class="di-cab">
        <div class="di-marca">
          <div class="di-wm"><b>Simula</b><span>LEGIS</span></div>
          <div class="di-wmsub">Simulador Eleitoral Legislativo 2026</div>
        </div>
        <div class="di-meta"><b>${nomeEstado}</b>${nomeAutor ? ` · Lista de ${nomeAutor}` : ""}<br>gerada em ${dataTxt} · ${ordemLabel}</div>
      </div>
      <div class="di-regra"></div>
      ${cargosParaGerar.map((c) => montarSecaoImpressaoCargo(c, op)).join("")}
      ${docLegenda()}
      ${op.registrar ? docRegistro(dataTxt, horaTxt, op.anonimo) : ""}
      ${docRodape()}
      <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app</span><span>${dataTxt} ${horaTxt}</span></div>
    </div>`;
}

// Texto do tooltip "i" no selo "eleito · QP/média/majoritário" da Revisão
// — explica o MECANISMO de verdade por trás de cada tag, em vez de deixar
// a sigla sozinha. Pedido do usuário em 05/08/2026 (junto com a correção
// do texto "você não marcou esse" que estava quebrando linha feio — virou
// tooltip próprio, ver warnTip em linhaEleitoReal).
// `detalhe` (opcional, ver eleitosReaisPorPartido) acrescenta os números
// DESSE caso específico depois da explicação genérica da regra — pedido do
// usuário em 06/08/2026: "é possível indicar a votação do caso específico?
// Quantos votos para cada cargo, e qual foi a votação da sobra?".
function explicacaoTag(tag, detalhe) {
  if (tag === "QP") {
    const generico = "Elegeu-se pelo <b>quociente partidário</b> (Código Eleitoral, art. 107): o partido teve votos suficientes pra garantir essa vaga direto, sem depender de sobra.";
    if (!detalhe) return generico;
    return `${generico}<br><br>Nesse caso: o partido teve <b>${detalhe.votosPartido.toLocaleString("pt-BR")}</b> votos, o quociente eleitoral do cargo é <b>${detalhe.qe.toLocaleString("pt-BR")}</b> — ${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.qe.toLocaleString("pt-BR")} = <b>${detalhe.qp}</b> vaga${detalhe.qp === 1 ? "" : "s"} garantida${detalhe.qp === 1 ? "" : "s"} por quociente (essa é uma delas).`;
  }
  if (tag === "média") {
    // Simplificado (pedido do usuário em 12/08/2026) — a regra dos
    // 80%/20% do QE pra concorrer à sobra (art. 109 §2º) foi DERRUBADA
    // pelo STF em fevereiro/2024, valendo já a partir das eleições de
    // 2024 — por isso não aparece aqui. Não é uma simplificação nossa,
    // é a regra vigente: todo partido concorre à sobra, sem piso mínimo.
    const generico = "Elegeu-se pela <b>distribuição de sobras</b> (método das médias, art. 109): depois das vagas garantidas por quociente, o resto vai pro partido com a maior média de voto a cada rodada — não necessariamente pra quem tem mais voto individual.";
    if (!detalhe) return generico;
    // rodadaSobra pode não existir: eleito é a marcação da pessoa (ver
    // listaUnificadaRevisao), então dá pra marcar mais candidatos de um
    // partido do que a matemática real garantiria — nesse caso não tem uma
    // "rodada de sobra" de verdade pra citar, só o resto da explicação.
    if (detalhe.rodadaSobra === undefined) {
      return `${generico}<br><br>Nesse caso: a <b>${detalhe.cadeiraDoPartido}ª</b> cadeira marcada deste partido, com média de <b>${Math.round(detalhe.mediaConquistada).toLocaleString("pt-BR")}</b> votos (${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.cadeiraDoPartido}) — além do que a matemática real (quociente + sobra) garantiria hoje pra este partido.`;
    }
    return `${generico}<br><br>Nesse caso: essa foi a <b>${detalhe.rodadaSobra}ª</b> vaga de sobra distribuída nesse cargo (de <b>${detalhe.totalSobrasCargo}</b> no total, disputadas entre todos os partidos) — a <b>${detalhe.cadeiraDoPartido}ª</b> cadeira deste partido, com média de <b>${Math.round(detalhe.mediaConquistada).toLocaleString("pt-BR")}</b> votos (${detalhe.votosPartido.toLocaleString("pt-BR")} ÷ ${detalhe.cadeiraDoPartido}).`;
  }
  if (tag === "majoritário") {
    const generico = "Cargo majoritário (Senado): não existe quociente partidário nem sobra aqui — as vagas vão direto pra quem tiver mais voto individual, juntando todos os partidos numa fila só.";
    if (!detalhe) return generico;
    return `${generico}<br><br>Nesse caso: <b>${detalhe.posicaoGeral}º</b> colocado entre todos os candidatos ao cargo, que tem <b>${detalhe.totalVagasCargo}</b> vaga${detalhe.totalVagasCargo === 1 ? "" : "s"} em disputa.`;
  }
  return "";
}

// Versão sem HTML de explicacaoTag, pro atributo title="" (selo compacto
// do card de candidato eleito, Revisão — layout lateral com o campo de
// voto pedido pelo usuário em 13/08/2026: sem espaço pro ícone "i" de
// tooltip, a explicação fica só no toque/hover nativo do navegador).
function explicacaoTagTexto(tag, detalhe) {
  return explicacaoTag(tag, detalhe)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?b>/gi, "")
    .replace(/"/g, "'");
}

// Lista única da Revisão (substitui as 3 listas separadas — eleitos,
// pendentes, suplentes — usadas até 06/08/2026): TODOS os candidatos
// reais do cargo, ordenados por votação decrescente, cada um já marcado
// com "eleito" (e a tag/detalhe de por quê) ou, se não eleito, o "gap"
// (quanto falta pra fechar vaga) — a mesma informação que antes só
// existia pros candidatos marcados pelo usuário, agora calculada pra
// todo mundo. `posicaoEleicao` é sequencial só entre quem é eleito (1,
// 2, 3... até o total de vagas), na ordem em que aparecem nesta lista —
// não é a posição geral de voto, é a ordem de eleição (pedido do usuário
// em 06/08/2026: "mesmo que tenha um deputado com mais votos e não
// eleito na frente").
// Calcula a disputa de sobra completa de um cargo proporcional — QE, QP por
// partido, e o detalhe RODADA A RODADA de quem competiu e quem venceu cada
// vaga de sobra (método das médias, art. 109). Fonte única usada tanto pra
// marcar cada candidato eleito por média (rodadaSobra/totalSobrasCargo, ver
// listaUnificadaRevisao logo abaixo) quanto pro painel "Disputa de Sobra"
// na Revisão (pedido do usuário em 12/08/2026, com mockup confirmado).
// Só guarda o detalhe de médias das rodadas que SÃO sobra (depois que o
// partido já esgotou o próprio QP) — rodadas de QP não entram em `rodadas`,
// só contam pro histórico interno de cadeiras.
function calcularDisputaSobra(lista, totalVagasCargo) {
  const votosPorPartido = lista.map((p) => partyVotos(p));
  const totalValidos = votosPorPartido.reduce((s, v) => s + v, 0);
  const qe = quocienteEleitoral(totalValidos, totalVagasCargo);
  const { cadeirasPorPartido, corte, historico } = (() => {
    const r = dhondtComCorte(lista, totalVagasCargo);
    return { cadeirasPorPartido: r.counts, corte: r.corte, historico: r.historico };
  })();
  // Art. 108 (04/09/2026): mínimo nominal de 10% do QE — no app é SÓ
  // orientação (aviso na Revisão), nunca trava: não entra na distribuição.
  const minimoVotosNominal = qe ? 0.1 * qe : 0;
  const qpPorPartido = lista.map((p, pIdx) => {
    const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
    return qe ? Math.min(cadeirasReais, Math.floor(votosPorPartido[pIdx] / qe)) : 0;
  });
  const totalQP = qpPorPartido.reduce((s, n) => s + n, 0);

  const contadorPorPartido = lista.map(() => 0);
  const rodadaSobraPorPartido = lista.map(() => []); // [pIdx][cadeiraDoPartido - 1] = nº da rodada de sobra (1-based) ou undefined se essa cadeira foi por QP
  const rodadas = [];
  let totalSobrasCargo = 0;

  // Candidatos reais de cada partido em ordem de voto — a vaga de sobra que
  // o partido ganha vai pro próximo dessa fila (pedido do usuário em
  // 18/08/2026: o painel agora NOMEIA quem levou cada vaga, não só o
  // partido). Ordenação feita uma vez fora do loop de rodadas.
  const candidatosOrdenadosPorPartido = lista.map((p) => [...p.candidatos]
    .filter((c) => c.fonte !== "legenda")
    .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0)));

  historico.forEach((pIdxVencedor) => {
    const novaCadeira = contadorPorPartido[pIdxVencedor] + 1;
    if (novaCadeira > qpPorPartido[pIdxVencedor]) {
      totalSobrasCargo++;
      rodadaSobraPorPartido[pIdxVencedor][novaCadeira - 1] = totalSobrasCargo;
      // Média de TODOS os partidos nesta rodada, no instante exato da
      // disputa (contadorPorPartido ainda não incrementado pro vencedor).
      const medias = lista.map((p, pIdx) => ({
        nome: p.nome, votos: votosPorPartido[pIdx], cadeiraAtual: contadorPorPartido[pIdx],
        media: votosPorPartido[pIdx] / (contadorPorPartido[pIdx] + 1), venceu: pIdx === pIdxVencedor,
      })).sort((a, b) => b.media - a.media);
      const candidatoVencedor = candidatosOrdenadosPorPartido[pIdxVencedor][novaCadeira - 1];
      rodadas.push({
        numero: totalSobrasCargo, vencedorNome: lista[pIdxVencedor].nome,
        vencedorMedia: medias.find((m) => m.venceu).media, medias,
        vencedorCandidato: candidatoVencedor ? nomeExibicao(candidatoVencedor) : null,
        vencedorPosicao: novaCadeira,
      });
    }
    contadorPorPartido[pIdxVencedor]++;
  });

  return { qe, cadeirasPorPartido, corte, qpPorPartido, totalQP, rodadaSobraPorPartido, totalSobrasCargo, rodadas, minimoVotosNominal };
}

function listaUnificadaRevisao(listaParam, cargo) {
  const lista = listaParam || pcState.palpiteEdicao;
  const cargoResolvido = cargo || pcState.cargoAtivo;
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargoResolvido);
  const resultado = [];

  if (cargoResolvido === "senador") {
    const todos = [];
    lista.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todos.push({ ...c, _partidoExibicao: p.nome })));
    const ordenados = [...todos].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
    const votosDoUltimo = totalVagasCargo > 0 && ordenados[totalVagasCargo - 1] ? (Number(ordenados[totalVagasCargo - 1].votos) || 0) : 0;
    // Mesmo princípio do ramo proporcional abaixo (eleito soberano do
    // usuário) — Senador é majoritário (sem QP/sobra), mas a regra de
    // nunca substituir a marcação vale igual.
    ordenados.forEach((c, i) => {
      const eleito = !!c.marcadoEleito;
      const votos = Number(c.votos) || 0;
      const consistenteComMatematicaReal = i < totalVagasCargo;
      resultado.push({
        chave: c.chave, nome: nomeExibicao(c), partido: c._partidoExibicao, votos, eleito,
        tag: eleito ? "majoritário" : null,
        detalhe: (eleito || consistenteComMatematicaReal) ? { posicaoGeral: i + 1, totalVagasCargo } : null,
        gap: eleito ? null : { individual: consistenteComMatematicaReal ? 0 : Math.max(0, votosDoUltimo - votos + 1), partido: null, acrescimo: consistenteComMatematicaReal ? 0 : Math.max(0, votosDoUltimo - votos + 1) },
        marcadoPeloUsuario: eleito, consistenteComMatematicaReal,
      });
    });
  } else {
    const { qe, cadeirasPorPartido, corte, qpPorPartido, rodadaSobraPorPartido, totalSobrasCargo, minimoVotosNominal } = calcularDisputaSobra(lista, totalVagasCargo);
    lista.forEach((p, pIdx) => {
      const votosPartido = partyVotos(p);
      const cadeirasReais = cadeirasPorPartido[pIdx] || 0;
      const qp = qpPorPartido[pIdx];
      const reaisOrdenados = [...p.candidatos]
        .filter((c) => c.fonte !== "legenda")
        .sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      const ultimoEleitoDeVerdade = cadeirasReais > 0 ? reaisOrdenados[cadeirasReais - 1] : null;
      const votosDoUltimoEleitoDeVerdade = ultimoEleitoDeVerdade ? (Number(ultimoEleitoDeVerdade.votos) || 0) : 0;
      // "eleito" soberano do usuário (conceito fechado 12/08/2026, retomado
      // 14/08/2026 com mockup validado) — nunca mais é quem a matemática
      // real elegeria, é sempre e só quem a pessoa marcou em Seleção
      // (c.marcadoEleito). cadeirasReais/qp/corte continuam calculados do
      // mesmo jeito, só que agora são puramente informativos (viram aviso
      // quando divergem, nunca substituem a marcação — ver
      // consistenteComMatematicaReal abaixo e o aviso em linhaCandidato).
      const marcadosOrdenados = reaisOrdenados.filter((c) => c.marcadoEleito);
      reaisOrdenados.forEach((c, i) => {
        const eleito = !!c.marcadoEleito;
        const votos = Number(c.votos) || 0;
        // Art. 108 (04/09/2026): abaixo de 10% do QE o candidato, pela regra,
        // não seria eleito. Aqui é SÓ aviso (flag lida por linhaCandidato e
        // pelo cabeçalho agrupado da Revisão) — a marcação da pessoa, o
        // "eleito", a consistência e o gap continuam exatamente como antes.
        const abaixoMinimoNominal = minimoVotosNominal > 0 && votos < minimoVotosNominal;
        // Esse candidato específico é quem a matemática real elegeria
        // nessa posição de voto — independente de estar marcado ou não.
        const consistenteComMatematicaReal = i < cadeirasReais;
        if (eleito) {
          const cadeiraDoPartido = marcadosOrdenados.findIndex((m) => m.chave === c.chave) + 1;
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: true,
            tag: cadeiraDoPartido <= qp ? "QP" : "média",
            detalhe: { votosPartido, qe, qp, cadeirasReais, cadeiraDoPartido, mediaConquistada: votosPartido / cadeiraDoPartido, rodadaSobra: rodadaSobraPorPartido[pIdx][cadeiraDoPartido - 1], totalSobrasCargo },
            gap: null, marcadoPeloUsuario: true, consistenteComMatematicaReal, abaixoMinimoNominal, minimoVotosNominal,
          });
        } else if (consistenteComMatematicaReal) {
          // Real vencedor, mas a pessoa não marcou — vira só um aviso (ver
          // linhaCandidato), nunca reaparece como "eleito" sozinho: gap
          // zerado de propósito, já que pela matemática real essa vaga já
          // está garantida, só falta a pessoa marcar se concordar. `detalhe`
          // calculado do mesmo jeito que pro candidato eleito (mesma
          // posição real, i+1 dentro dos cadeirasReais) — alimenta a caixa
          // "como chega nessa conta" do aviso (pedido do usuário 01/09/2026).
          const cadeiraDoPartido = i + 1;
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: false,
            tag: null,
            detalhe: { votosPartido, qe, qp, cadeirasReais, cadeiraDoPartido, mediaConquistada: votosPartido / cadeiraDoPartido, rodadaSobra: rodadaSobraPorPartido[pIdx][cadeiraDoPartido - 1], totalSobrasCargo },
            gap: { individual: 0, partido: 0, acrescimo: 0, votosPartido, temRivalAcima: false },
            marcadoPeloUsuario: false, consistenteComMatematicaReal: true, abaixoMinimoNominal, minimoVotosNominal,
          });
        } else {
          const necessarioPartido = Math.floor(corte * (cadeirasReais + 1)) + 1;
          const gapPartido = Math.max(0, necessarioPartido - votosPartido);
          const gapIndividual = cadeirasReais > 0 ? Math.max(0, votosDoUltimoEleitoDeVerdade - votos + 1) : null;
          // Quando tem outro candidato NÃO ELEITO do mesmo partido com mais
          // voto que este (ranqueado entre ele e o corte — ex.: usuário
          // marcou o 2º da fila, não o 1º), só bater o partido/último eleito
          // não basta: a vaga nova iria pro rival de cima, não pra este.
          // reaisOrdenados[cadeirasReais] é sempre quem tem MAIS voto entre
          // os não eleitos (lista ordenada decrescente) — superar só ele já
          // garante superar os outros rivais de cima também.
          const rivalDeCima = i > cadeirasReais ? reaisOrdenados[cadeirasReais] : null;
          const gapRivalDeCima = rivalDeCima ? Math.max(0, (Number(rivalDeCima.votos) || 0) - votos + 1) : 0;
          const acrescimo = Math.max(gapPartido, gapIndividual || 0, gapRivalDeCima);
          resultado.push({
            chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos, eleito: false,
            tag: null, detalhe: null,
            gap: { individual: gapIndividual, partido: gapPartido, acrescimo, votosPartido, temRivalAcima: !!rivalDeCima },
            marcadoPeloUsuario: false, consistenteComMatematicaReal: false, abaixoMinimoNominal, minimoVotosNominal,
          });
        }
      });
    });

    // (Removido 14/08/2026: o fallback antigo de "sempre N eleitos" que
    // promovia candidatos extras por voto de 2022 quando o cargo inteiro
    // estava zerado. Fazia sentido enquanto "eleito" era decidido pela
    // matemática real — agora que é sempre a marcação da pessoa, forçar
    // uma promoção extra violaria exatamente o princípio que este item
    // implementa. Também ficou comprovadamente inatingível: o botão
    // "Avançar" da Seleção só libera com totalIndicado === totalVagasCargo
    // pra cada cargo, então quem chega na Revisão sempre já tem o número
    // certo de marcados.)
  }

  resultado.sort((a, b) => b.votos - a.votos);
  let contador = 0;
  resultado.forEach((c) => { if (c.eleito) { contador++; c.posicaoEleicao = contador; } });
  return resultado;
}

function renderRevisaoDeposito() {
  pcState._farolContexto = "revisao";
  const conteudo = document.getElementById("pcConteudo");
  // Toda ação dentro da Revisão (abrir o menu ✦, editar voto, trocar
  // lista/grupo...) reconstrói o HTML inteiro de novo (mesmo padrão do
  // resto do app). Sem isso, cada clique fechava os cards <details> que
  // já estavam abertos e jogava a rolagem de volta pro topo da tela —
  // achado pelo usuário em 12/08/2026 clicando no botão ✦ de um
  // candidato pendente. `reRenderizando` distingue esse caso (preservar)
  // de entrar na tela pela primeira vez (começar do topo, é o esperado).
  const reRenderizando = !!conteudo.querySelector(".pc-acc");
  const scrollAnterior = window.scrollY;
  garantirPalpitesPorCargo();

  let temInconsistenciaGeral = false;
  // Guarda a disputaSobra de cada cargo (calculada dentro do loop abaixo)
  // pra reaproveitar no painel "Disputa de Sobra" — sem precisar calcular
  // de novo fora do loop nem mudar o que CARGOS.map() devolve.
  const disputaSobraPorCargo = {};

  const secoesHtml = CARGOS.map((cargoDef) => {
    const lista = pcState.palpitesPorCargo[cargoDef.id];
    // Lista única — TODOS os candidatos reais do cargo, ordenados por
    // votação decrescente, cada um já marcado "eleito" (com a tag/detalhe
    // de por quê) ou, se não, o "gap" pra fechar vaga. Substitui as 3
    // listas separadas (eleitos/pendentes/suplentes) usadas até
    // 06/08/2026 — pedido do usuário: parecer mais com o boletim oficial
    // (uma lista só por votação, com o selo "eleito" só em quem realmente
    // ganhou, mesmo que outro acima dele na lista tenha mais voto e não
    // seja eleito).
    const listaCompleta = listaUnificadaRevisao(lista, cargoDef.id);
    const totalEleitos = listaCompleta.filter((c) => c.eleito).length;
    // Antes (até 14/08/2026) contava candidatos marcados que a matemática
    // real rejeitava — não existe mais, "eleito" agora É a marcação (ver
    // listaUnificadaRevisao). O aviso que sobra é o oposto: candidatos que
    // a matemática real elegeria e a pessoa não marcou.
    const marcadosInconsistentes = listaCompleta.filter((c) => !c.eleito && c.consistenteComMatematicaReal);
    const temInconsistencia = marcadosInconsistentes.length > 0;
    if (temInconsistencia) temInconsistenciaGeral = true;
    // Quem PERDERIA a vaga se a pessoa aceitar o ajuste da matemática real
    // (teste mobile 28/08/2026): o marcado como eleito que a matemática NÃO
    // elege — havendo mais de um, o de menor média conquistada (proporcional)
    // ou menor voto (majoritário), que é exatamente quem a regra derrubaria
    // primeiro. Vira o alvo do botão "Aceitar o ajuste" no aviso.
    const marcadosQueAMatematicaNaoElege = listaCompleta.filter((c) => c.eleito && !c.consistenteComMatematicaReal);
    const perdedorAjuste = marcadosQueAMatematicaNaoElege.length
      ? [...marcadosQueAMatematicaNaoElege].sort((a, b) => cargoDef.id === "senador"
          ? ((Number(a.votos) || 0) - (Number(b.votos) || 0))
          : (((a.detalhe && a.detalhe.mediaConquistada) || 0) - ((b.detalhe && b.detalhe.mediaConquistada) || 0)))[0]
      : null;

    // Lista de EXIBIÇÃO (pedido do usuário em 18/08/2026): nem todo
    // candidato precisa aparecer aqui, só listaCompleta continua completa
    // (usada pros cálculos acima — total de eleitos, avisos de
    // inconsistência, disputa de sobra — não pode ser cortada). Senador
    // (majoritário, poucas vagas): eleitos + os 2 próximos mais votados,
    // 4 no total. Estadual/Federal (proporcional, muitos candidatos):
    // eleitos + os 50% mais votados de quem não elegeu — sempre inclui
    // quem gerou aviso de inconsistência, mesmo fora desse corte, pra não
    // esconder um aviso real atrás do corte de exibição.
    let listaExibida;
    if (cargoDef.id === "senador") {
      listaExibida = listaCompleta.slice(0, 4);
    } else {
      const naoEleitosOrdenados = listaCompleta.filter((c) => !c.eleito);
      const corteMetade = Math.ceil(naoEleitosOrdenados.length / 2);
      const chavesVisiveis = new Set(naoEleitosOrdenados.slice(0, corteMetade).map((c) => c.chave));
      marcadosInconsistentes.forEach((c) => chavesVisiveis.add(c.chave));
      listaExibida = listaCompleta.filter((c) => c.eleito || chavesVisiveis.has(c.chave));
    }
    if (pcState.filtroEleitoRevisao[cargoDef.id]) listaExibida = listaExibida.filter((c) => c.eleito);

    // "Mínimo pra eleger" — referência única de folga/progresso, mostrada
    // em toda barra desta seção (eleito ou não): o corte de
    // dhondtComCorte (proporcional) ou o voto do último colocado real
    // (majoritário) — mesmo conceito de "linha de corte" já usado em
    // outros lugares do app, agora também visível na Revisão. Pedido do
    // usuário em 06/08/2026.
    const totalVagasCargoDef = vagasFixasCargo(pcState.estado, cargoDef.id);
    // Disputa de sobra completa deste cargo (painel "Disputa de Sobra",
    // pedido do usuário em 12/08/2026, mockup confirmado) — null pro
    // Senador, que não tem QE/QP/sobra (majoritário).
    const disputaSobra = cargoDef.id !== "senador" ? calcularDisputaSobra(lista, totalVagasCargoDef) : null;
    disputaSobraPorCargo[cargoDef.id] = disputaSobra;
    let minimoParaEleger = 0;
    if (cargoDef.id === "senador") {
      const todosReaisOrdenados = [];
      lista.forEach((p) => p.candidatos.filter((c) => c.fonte !== "legenda").forEach((c) => todosReaisOrdenados.push(c)));
      todosReaisOrdenados.sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));
      minimoParaEleger = totalVagasCargoDef > 0 && todosReaisOrdenados[totalVagasCargoDef - 1] ? (Number(todosReaisOrdenados[totalVagasCargoDef - 1].votos) || 0) : 0;
    } else {
      minimoParaEleger = Math.ceil(disputaSobra.corte);
    }

    // Barra fina (mesma família visual do termômetro da Seleção) no lugar
    // do texto corrido — eleito mostra a folga acima do mínimo, quem não
    // é eleito mostra o progresso até fechar a vaga (agora calculado pra
    // TODO mundo, não só pra quem foi marcado — pedido do usuário em
    // 06/08/2026). opacidade mais baixa pros eleitos (sempre 100% cheios
    // — não precisam chamar atenção, já estão garantidos) e cheia pros
    // demais (é o que ainda pode mudar).

    // Card fechado (fundo + borda + cantos arredondados) em vez de linha
    // com traço embaixo — separação mais visível entre candidatos, pedido
    // do usuário em 06/08/2026.
    // --pc-lobby-tom-3 é a camada de tom mais clara já definida no padrão
    // "Lobby" (css/estilo.css) — antes usava um verde quase idêntico ao
    // fundo do acordeão (#0e1f17 vs #0c1c16), então os cards praticamente
    // sumiam um dentro do outro. Pedido do usuário em 06/08/2026.
    // Tom deliberadamente mais claro que o fundo do acordeão (--pc-glass,
    // ~#1D2023) — com --pc-lobby-tom-3 (#1B1E22) os cards praticamente
    // desapareciam dentro dele (feedback do usuário, 18/08/2026).
    const cardCandidato = (conteudo) => `<div style="background:#23272C; border:1px solid #2F343A; border-radius:12px; padding:12px 14px; margin-bottom:8px;">${conteudo}</div>`;

    // Uma linha só, pra eleito ou não — o selo numerado (1, 2, 3... na
    // ORDEM DE ELEIÇÃO, não na posição de voto da lista) só aparece em
    // quem é eleito, sem reservar espaço em quem não é (senão sobrava um
    // "buraco" à esquerda nas linhas sem selo — achado testando ao vivo
    // em 06/08/2026). Etiqueta "eleito · QP/média/majoritário" só em quem
    // ganhou; ninguém mais tem etiqueta (nem "seu palpite", nem
    // "suplente" — dispensadas a pedido do usuário, a barra com "faltam X
    // votos" já carrega a informação sozinha). Botão mágico só aparece em
    // quem VOCÊ marcou — não faz sentido "consertar" a votação de gente
    // que você nem escolheu no seu palpite.
    const linhaCandidato = (c) => {
      const votos = Number(c.votos) || 0;
      // Art. 108 (04/09/2026): aviso discreto, mesmo padrão do "para eleger:"
      // do Senador (10px, cor apagada) — só informa; a marcação da pessoa e o
      // selo de eleito continuam como ela deixou (mesmo espírito do aviso de
      // "vaga não marcada"). Só aparece onde a vaga está em jogo (marcado
      // eleito pela pessoa, ou eleito pela matemática real) — em quem não
      // elege de qualquer jeito seria ruído em centenas de linhas.
      const avisoMinimoNominal = c.abaixoMinimoNominal && (c.eleito || c.consistenteComMatematicaReal)
        ? `<div style="font-size:10px; color:var(--pc-ink-dim); margin-top:6px; line-height:1.4;">abaixo de 10% do QE (mínimo ${Math.ceil(c.minimoVotosNominal || 0).toLocaleString("pt-BR")} votos) — pela regra, não eleito (art. 108)</div>`
        : "";

      if (c.eleito) {
        // "Mínimo pra eleger" só é uma comparação justa no Senador (voto
        // individual direto). Em Estadual/Federal é uma média do CARGO
        // inteiro — comparar com o voto pessoal de alguém eleito por
        // quociente partidário (QP) dava "+0 de folga" mesmo pra quem
        // está 100% garantido pelo total do partido, não pelo próprio
        // voto. Achado testando ao vivo em 06/08/2026 — só mostra o
        // mínimo onde ele é matematicamente correto. A "folga" (margem
        // acima do mínimo) foi retirada a pedido do usuário em
        // 13/08/2026 — não fazia sentido junto do conceito de sobra, que
        // nem existe no majoritário.
        const mostrarMargem = cargoDef.id === "senador";
        // Badge compacto na linha do nome — mesmo padrão do card da tela
        // de palpite (E-QP/E-M/E, teste mobile 28/08/2026); o antigo chip
        // "SOBRA · n/m" vira parte do title do badge E-M.
        const badgeRev = cargoDef.id === "senador"
          ? `<span class="pc-sen-chip" title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="cursor:help;">E</span>`
          : (c.tag === "QP"
            ? `<span class="pc-sen-chip" title="${explicacaoTagTexto(c.tag, c.detalhe)}" style="cursor:help;">E-QP</span>`
            : `<span class="pc-sen-chip em" title="${explicacaoTagTexto(c.tag, c.detalhe)}${c.detalhe && c.detalhe.rodadaSobra !== undefined ? ` (sobra ${c.detalhe.rodadaSobra} de ${c.detalhe.totalSobrasCargo})` : ""}" style="cursor:help;">E-M</span>`);
        return cardCandidato(`
          <div class="pc-sen-l1">
            ${badgeRev}
            <span class="pc-sen-nm pc-rev-nm">${c.nome}</span>
            <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:94px; font-size:14px; font-weight:800; text-align:right; flex-shrink:0; padding:8px 6px;">
          </div>
          <div class="pc-sen-sub">${c.posicaoEleicao}º · ${c.partido}</div>
          ${mostrarMargem ? `<div style="font-size:10px; color:var(--pc-ink-dim); margin-top:6px;">para eleger: ${minimoParaEleger.toLocaleString("pt-BR")}</div>` : ""}
          ${avisoMinimoNominal}
        `);
      }

      const acrescimo = c.gap.acrescimo || 0;
      const necessario = votos + acrescimo;
      const pct = necessario > 0 ? Math.round((votos / necessario) * 100) : 0;
      const usaIndividual = c.gap.individual !== null && c.gap.acrescimo === c.gap.individual;
      const legendaFaltam = acrescimo > 0
        ? (usaIndividual
            ? `faltam ${acrescimo.toLocaleString("pt-BR")} votos próprios`
            : `faltam ${acrescimo.toLocaleString("pt-BR")} votos · partido tem ${(c.gap.votosPartido || 0).toLocaleString("pt-BR")} no total`)
        : "";
      const menuAberto = pcState.menuMagicoAberto === c.chave;
      // Distribuir só ajuda quando não tem ninguém do mesmo partido, ainda
      // não eleito, com mais voto que este candidato — essa opção só mexe
      // em quem tem MENOS voto que ele, então não resolveria um rival de
      // cima (aí só "Direto pra ele" funciona, ver acrescimo acima).
      const distribuivel = c.gap.partido !== null && c.gap.partido > 0 && !c.gap.temRivalAcima;
      const mostrarMagico = c.marcadoPeloUsuario && acrescimo > 0;
      const menuMagico = menuAberto ? `
        <div style="margin-top:10px; background:#16181B; border:1px solid #2B2F33; border-radius:10px; padding:6px;">
          <div style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--pc-ink-dim); padding:6px 8px 4px;">Como completar os ${acrescimo.toLocaleString("pt-BR")} votos?</div>
          <button data-pc-fechar-vaga="${c.partido}" data-pc-chave="${c.chave}" data-pc-acrescimo="${acrescimo}" data-pc-cargo="${cargoDef.id}" style="width:100%; text-align:left; background:none; border:none; padding:9px 8px; border-radius:7px; cursor:pointer; display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12.5px; font-weight:700; color:var(--pc-ink);">Direto pra ${c.nome}</span>
            <span style="font-size:10.5px; color:var(--pc-ink-dim); line-height:1.4;">Soma os ${acrescimo.toLocaleString("pt-BR")} votos só na conta dele — mais simples, mas ele fica com um número redondo "de fora".</span>
          </button>
          ${distribuivel ? `<div style="height:1px; background:#23262A; margin:2px 4px;"></div>
          <button data-pc-distribuir-menores="${c.partido}" data-pc-chave-menores="${c.chave}" data-pc-gap-menores="${c.gap.partido}" data-pc-cargo-menores="${cargoDef.id}" style="width:100%; text-align:left; background:none; border:none; padding:9px 8px; border-radius:7px; cursor:pointer; display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:12.5px; font-weight:700; color:var(--pc-ink);">Distribuir com quem tem menos</span>
            <span style="font-size:10.5px; color:var(--pc-ink-dim); line-height:1.4;">Reparte os ${c.gap.partido.toLocaleString("pt-BR")} votos entre os colegas de partido que já têm menos voto que ele — sem passar do voto dele.</span>
          </button>` : ""}
          <div style="margin-top:4px; padding:6px 8px 2px; font-size:9.5px; color:var(--pc-warning); line-height:1.4; border-top:1px solid #23262A;">Qualquer uma das opções ainda pode mudar o resultado de outro partido — a disputa de sobra é entre todos ao mesmo tempo.</div>
        </div>` : "";

      return cardCandidato(`
        <div class="pc-sen-l1">
          <span class="pc-sen-nm pc-rev-nm">${c.nome}</span>
          <input class="cell" data-pc-voto-revisao="${cargoDef.id}::${c.partido}::${c.chave}" value="${votos.toLocaleString("pt-BR")}" style="width:94px; font-size:14px; font-weight:800; text-align:right; flex-shrink:0; padding:8px 6px;">
        </div>
        <div class="pc-sen-sub">${c.partido}</div>
        ${avisoMinimoNominal}
        ${c.consistenteComMatematicaReal ? `
        <div style="margin-top:12px; padding:10px 12px; background:rgba(198,230,42,.1); border:1px solid rgba(198,230,42,.3); border-radius:10px;">
          <div style="display:flex; gap:8px; align-items:flex-start;">
            <span style="color:var(--pc-warning); font-size:13px; flex-shrink:0;">${iconeSvg("alerta", 13)}</span>
            <span style="font-size:11.5px; color:var(--pc-warning); line-height:1.5;">${cargoDef.id === "senador"
              ? `A votação de hoje indica que ${c.nome} estaria entre os mais votados (eleição majoritária, voto direto) — mas não está no seu palpite.`
              : `A matemática real (quociente + sobra) indica que ${c.nome} garantiria vaga com a votação de hoje — mas não está no seu palpite.`}${perdedorAjuste ? ` Pela regra, quem perderia a vaga é <b>${perdedorAjuste.nome}</b> (${perdedorAjuste.partido}).` : ""}</span>
          </div>
          ${c.detalhe ? `
          <div style="margin-top:10px; background:#101214; border:1px solid #23262A; border-radius:10px; padding:9px 11px;">
            <div style="font-size:9px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; color:#5c6f65; margin-bottom:6px;">Como chega nessa conta</div>
            ${cargoDef.id === "senador" ? `
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0;"><span style="color:var(--pc-ink-dim);">Posição na votação geral</span><span style="font-weight:700; font-variant-numeric:tabular-nums;">${c.detalhe.posicaoGeral}ª de ${c.detalhe.totalVagasCargo} vaga${c.detalhe.totalVagasCargo === 1 ? "" : "s"}</span></div>
            ` : `
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0;"><span style="color:var(--pc-ink-dim);">Votação do ${c.partido}</span><span style="font-weight:700; font-variant-numeric:tabular-nums;">${Math.round(c.detalhe.votosPartido).toLocaleString("pt-BR")}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0;"><span style="color:var(--pc-ink-dim);">Quociente eleitoral (QE)</span><span style="font-weight:700; font-variant-numeric:tabular-nums;">÷ ${Math.round(c.detalhe.qe).toLocaleString("pt-BR")}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:11px; padding:2px 0;"><span style="color:var(--pc-ink-dim);">${c.detalhe.cadeiraDoPartido <= c.detalhe.qp ? "Vaga pelo quociente partidário" : `Sobra — ${c.detalhe.rodadaSobra !== undefined ? c.detalhe.rodadaSobra + "ª" : ""} rodada das médias`}</span><span style="font-weight:700; font-variant-numeric:tabular-nums;">média ${Math.round(c.detalhe.mediaConquistada).toLocaleString("pt-BR")}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:11px; padding-top:6px; margin-top:4px; border-top:1px solid #23262A;"><span style="font-weight:700;">Vaga do ${c.partido}</span><span style="font-weight:700; color:var(--pc-warning); font-variant-numeric:tabular-nums;">${c.detalhe.cadeiraDoPartido}ª cadeira</span></div>
            `}
          </div>` : ""}
          ${perdedorAjuste ? `
          <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:12px; font-weight:700; color:var(--pc-ink);">Ajustar?</span>
            <span style="display:flex; gap:8px;">
              <button type="button" data-pc-aceitar-ajuste="${escaparAtributoHtml(cargoDef.id + "::" + c.chave + "::" + perdedorAjuste.chave)}" title="Sim — eleger ${escaparAtributoHtml(c.nome)} no lugar de ${escaparAtributoHtml(perdedorAjuste.nome)}" style="width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:rgba(198,230,42,.16); border:1px solid rgba(198,230,42,.5); color:var(--pc-warning); cursor:pointer;"><svg viewBox="0 0 16 16" width="15" height="15"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
              <button type="button" data-pc-recusar-ajuste title="Não — manter sua escolha" style="width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.03); border:1px solid #33383d; color:var(--pc-ink-dim); cursor:pointer;"><svg viewBox="0 0 16 16" width="15" height="15"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg></button>
            </span>
          </div>` : ""}
        </div>` : `
        ${menuMagico}
        ${legendaFaltam ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:var(--pc-ink-dim); margin-top:8px;">
          <span>${legendaFaltam}</span>
          <span style="display:flex; align-items:center; gap:6px;">
            <span>${pct}%</span>
            ${mostrarMagico ? `<button data-pc-abrir-magico="${c.chave}" class="pc-mini-btn" title="Como completar os votos" style="width:20px; height:20px; padding:0; border-radius:50%; flex-shrink:0; ${menuAberto ? "color:#34E84A; border-color:#34E84A; background:rgba(52,232,74,.12);" : ""}"><svg viewBox="0 0 16 16" width="12" height="12" style="transform:rotate(${menuAberto ? "180deg" : "0deg"}); transition:transform .15s;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>` : ""}
          </span>
        </div>` : ""}`}
      `);
    };

    // Filtro "lista única" (default, ordem só por voto cruzando partidos) vs
    // "agrupado por partido/federação" (pedido do usuário em 08/08/2026) — só
    // muda como listaCompleta é agrupada pra exibição, cardCandidato/
    // linhaCandidato continuam os mesmos, sem mexer no resto da estrutura.
    const agrupado = !!pcState.modoAgrupadoRevisao[cargoDef.id];
    let linhas;
    if (!agrupado) {
      linhas = listaExibida.map(linhaCandidato).join("");
    } else {
      const porPartido = new Map();
      listaExibida.forEach((c) => {
        if (!porPartido.has(c.partido)) porPartido.set(c.partido, []);
        porPartido.get(c.partido).push(c);
      });
      linhas = [...porPartido.entries()]
        .sort((a, b) => b[1].filter((c) => c.eleito).length - a[1].filter((c) => c.eleito).length)
        .map(([partido, candidatosPartido]) => {
          const qtdEleitos = candidatosPartido.filter((c) => c.eleito).length;
          // Soma de votos do partido + quanto falta pra próxima vaga — pedido
          // do usuário em 09/08/2026. gap.partido é igual pra todo mundo não
          // eleito do mesmo partido (é uma conta por PARTIDO, não por
          // candidato), então pega do primeiro não-eleito que achar.
          const votosPartidoTotal = candidatosPartido.reduce((s, c) => s + (Number(c.votos) || 0), 0);
          // Prefere um não-eleito que realmente precisa de voto (ignora quem
          // já é vencedor real só não marcado — esse tem gap.partido zerado
          // de propósito, ver listaUnificadaRevisao, e não representa "falta
          // pra próxima vaga" de verdade).
          const naoEleito = candidatosPartido.find((c) => !c.eleito && c.gap && !c.consistenteComMatematicaReal)
            || candidatosPartido.find((c) => !c.eleito && c.gap);
          const faltamProximaVaga = naoEleito ? naoEleito.gap.partido : null;
          // Art. 108 (04/09/2026): eleitos marcados abaixo de 10% do QE —
          // só orientação, a marcação fica como a pessoa deixou.
          const eleitosAbaixoMinimo = candidatosPartido.filter((c) => c.eleito && c.abaixoMinimoNominal).length;
          const avisoInaptos = eleitosAbaixoMinimo > 0
            ? `<div style="flex-basis:100%; font-size:10px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--pc-ink-dim); line-height:1.4;">${eleitosAbaixoMinimo} candidato${eleitosAbaixoMinimo === 1 ? "" : "s"} abaixo do mínimo nominal (10% do QE, art. 108) — na apuração real, a vaga iria pra outro partido</div>`
            : "";
          return `
          <div style="display:flex; align-items:center; gap:6px; padding:10px 3px 6px; color:var(--pc-accent); font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; flex-wrap:wrap;">
            <span style="width:7px; height:7px; border-radius:50%; background:var(--pc-accent); display:inline-block; flex-shrink:0;"></span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${partido}</span>
            <span style="color:var(--pc-ink-dim); font-weight:400; text-transform:none; flex-shrink:0;">— ${qtdEleitos} eleito${qtdEleitos === 1 ? "" : "s"} · ${votosPartidoTotal.toLocaleString("pt-BR")} votos${faltamProximaVaga ? ` (faltam ${faltamProximaVaga.toLocaleString("pt-BR")} para a próxima vaga)` : ""}</span>
            ${avisoInaptos}
          </div>
          ${candidatosPartido.map(linhaCandidato).join("")}
        `;
        }).join("");
    }

    const filtroAgrupado = `
      <div class="pc-console" style="display:inline-block; padding:2px; flex-shrink:0; border-radius:8px;">
        <div class="pc-cmd-painel" style="width:auto; justify-content:flex-start; gap:2px; margin-bottom:0;">
          <button data-pc-modo-revisao="lista" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Lista única, ordenada por votos" class="pc-cmd-acao${agrupado ? "" : " ativo"}" style="flex:none; width:28px; height:28px; min-height:28px; aspect-ratio:1;">${iconeSvg("lista", 13)}</button>
          <button data-pc-modo-revisao="grupo" data-pc-modo-revisao-cargo="${cargoDef.id}" title="Agrupado por partido/federação" class="pc-cmd-acao${agrupado ? " ativo" : ""}" style="flex:none; width:28px; height:28px; min-height:28px; aspect-ratio:1;">${iconeSvg("grupos", 13)}</button>
          <button data-pc-filtro-eleito-revisao="${cargoDef.id}" title="${pcState.filtroEleitoRevisao[cargoDef.id] ? "Mostrar todos de novo" : "Mostrar só os eleitos"}" class="pc-cmd-acao${pcState.filtroEleitoRevisao[cargoDef.id] ? " ativo" : ""}" style="flex:none; width:28px; height:28px; min-height:28px; aspect-ratio:1; color:#34E84A;">${docIcLetra("E", 13, "fato")}</button>
        </div>
      </div>`;

    return `
      <details class="pc-acc" data-pc-cargo-acc="${cargoDef.id}"${pcState.expandido["revisao-" + cargoDef.id] ? " open" : ""}>
        <summary style="align-items:flex-start;"><span style="flex:1; min-width:0; line-height:1.35;">${cargoDef.label} <span style="font-weight:400; color:var(--pc-ink-dim);">— ${totalEleitos} eleito${totalEleitos === 1 ? "" : "s"}${temInconsistencia ? ` · ${marcadosInconsistentes.length} aviso${marcadosInconsistentes.length === 1 ? "" : "s"}` : ""}</span></span><svg class="pc-chev" viewBox="0 0 16 16" width="14" height="14" style="flex-shrink:0; margin-top:3px;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg></summary>
        <div class="pc-acc-body">
          ${listaExibida.length < listaCompleta.length ? `<div style="font-size:10.5px; color:var(--pc-ink-dim); margin-bottom:10px;">Mostrando os eleitos + ${listaExibida.length - totalEleitos} mais votados entre quem não elegeu (${listaCompleta.length - listaExibida.length} candidato${listaCompleta.length - listaExibida.length === 1 ? "" : "s"} com menos voto ficaram de fora dessa lista).</div>` : ""}
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            ${disputaSobra && disputaSobra.rodadas.length > 0 ? `<button data-pc-abrir-disputa-sobra="${cargoDef.id}" style="display:flex; align-items:center; justify-content:center; gap:8px; flex:1; font-size:12.5px; font-weight:700; border-radius:10px; padding:10px; background:rgba(52,232,74,.08); border:1px solid rgba(52,232,74,.45); color:var(--pc-accent); cursor:pointer; font-family:var(--sans);"><svg viewBox="0 0 16 16" width="13" height="13"><path d="M3 13V8M8 13V3M13 13v-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>Ver a disputa das sobras<svg viewBox="0 0 16 16" width="11" height="11"><path d="M5.5 3.5l5 4.5-5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>` : `<span style="flex:1;"></span>`}
            ${filtroAgrupado}
          </div>
          ${linhas}
        </div>
      </details>`;
  }).join("");

  // Painel "Disputa de Sobra" (overlay) — pcState.disputaSobraAberta guarda
  // o id do cargo aberto (ou null). Mesmo padrão visual dos outros overlays
  // desta tela (pcInstrucaoOverlay/pcTop2022Overlay): fundo desfocado,
  // cartão central, botão fechar. Pedido do usuário em 12/08/2026, mockup
  // confirmado antes de implementar.
  const painelDisputaSobraHtml = (() => {
    const cargoAbertoId = pcState.disputaSobraAberta;
    if (!cargoAbertoId) return "";
    const cargoDef = CARGOS.find((c) => c.id === cargoAbertoId);
    const disputaSobra = disputaSobraPorCargo[cargoAbertoId];
    if (!cargoDef || !disputaSobra) return "";

    // Quadro-resumo "quem levou cada vaga" + partidos zerados fora das
    // rodadas + candidato vencedor nomeado + "i" com a regra ilustrada
    // pela 1ª sobra real — pedidos do usuário em 18/08/2026, mockup
    // aprovado (artifact "Disputa de Sobra — proposta"). Material Fader
    // (o vidro-verde 1.0 saiu daqui na mesma rodada).
    // Cada linha do quadro é uma JANELA da própria rodada (pedido do
    // usuário, 21/08/2026): toque abre o detalhe daquela rodada — as
    // médias de todos os partidos, com o vencedor destacado — em vez da
    // listagem única e comprida de todas as rodadas embaixo.
    const linhasResumo = disputaSobra.rodadas.map((r) => {
      const v = r.medias.find((m) => m.venceu);
      const detalheRodada = r.medias.filter((m) => m.votos > 0).map((m) => `
        <div style="display:grid; grid-template-columns:1fr auto; align-items:center; gap:8px; padding:6px 8px; border-radius:8px; font-size:12px;${m.venceu ? " background:rgba(242,244,245,.05); border:1px solid rgba(242,244,245,.18);" : ""}">
          <span style="color:${m.venceu ? "var(--pc-ink)" : "var(--pc-ink-dim)"}; min-width:0; overflow:hidden; text-overflow:ellipsis;">${m.nome}${m.venceu && r.vencedorCandidato ? `<span style="display:block; font-size:10.5px; color:#8A9096; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">vaga vai pra <b style="color:#F2F4F5;">${r.vencedorCandidato}</b> (${r.vencedorPosicao}º mais votado)</span>` : ""}</span>
          <span style="font-weight:700; font-variant-numeric:tabular-nums; color:${m.venceu ? "#F2F4F5" : "var(--pc-ink-dim)"};">${Math.round(m.media).toLocaleString("pt-BR")}</span>
        </div>`).join("");
      return `
      <details style="border-top:1px solid rgba(242,244,245,.08);">
        <summary style="display:grid; grid-template-columns:auto 1fr auto auto; align-items:center; gap:8px; padding:6px 0; font-size:12px; cursor:pointer; list-style:none;">
          <span style="font-size:9px; font-weight:800; background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4); color:#F2F4F5; border-radius:999px; padding:2px 7px; font-variant-numeric:tabular-nums; white-space:nowrap;">${r.numero}ª</span>
          <span style="min-width:0;">
            <span style="font-weight:700; color:#F2F4F5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block;">${r.vencedorCandidato || "—"}</span>
            <span style="font-size:10.5px; color:#AEB5BB;">${r.vencedorNome}</span>
          </span>
          <span style="font-size:11px; font-weight:700; color:#AEB5BB; font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right;">${Math.round(r.vencedorMedia).toLocaleString("pt-BR")}<span style="display:block; font-weight:400; font-size:9px; color:#5C6268;">média ${v.votos.toLocaleString("pt-BR")} ÷ ${v.cadeiraAtual + 1}</span></span>
          <svg viewBox="0 0 16 16" width="12" height="12" style="color:#5C6268;"><path d="M4 6.2l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </summary>
        <div style="padding:2px 0 10px;">
          <div style="font-size:10px; color:#5C6268; margin:2px 0 6px;">Rodada ${r.numero} — votos ÷ (vagas atuais + 1)</div>
          ${detalheRodada}
        </div>
      </details>`;
    }).join("");

    const r1 = disputaSobra.rodadas[0];
    const v1 = r1 ? r1.medias.find((m) => m.venceu) : null;
    const infoAberta = !!pcState.sobraInfoAberta;
    const blocoInfo = infoAberta && r1 && v1 ? `
      <div style="margin-top:10px; padding:10px 12px; background:#101214; border:1px solid #23262A; border-radius:10px; font-size:11.5px; color:#8A9096; line-height:1.6;">
        Depois que as vagas por quociente partidário se esgotam, cada vaga que
        sobra vai pro partido com a <b style="color:#F2F4F5;">maior média</b>:
        votos do partido ÷ (vagas que ele já tem + 1) — art. 109 do Código
        Eleitoral, rodada a rodada.<br><br>
        <b style="color:#F2F4F5;">Exemplo real, a 1ª sobra deste cálculo:</b>
        ${r1.vencedorNome} tinha ${v1.cadeiraAtual} vaga${v1.cadeiraAtual === 1 ? "" : "s"}
        e ${v1.votos.toLocaleString("pt-BR")} votos → média
        ${v1.votos.toLocaleString("pt-BR")} ÷ ${v1.cadeiraAtual + 1} =
        <b style="color:#C6E62A;">${Math.round(r1.vencedorMedia).toLocaleString("pt-BR")}</b>,
        a maior da rodada. A vaga fica com o partido e vai pro próximo mais
        votado da lista dele${r1.vencedorCandidato ? `: <b style="color:#F2F4F5;">${r1.vencedorCandidato}</b>` : ""}.
        Ao ganhar, a média do partido cai na rodada seguinte (÷ ${v1.cadeiraAtual + 2}) —
        é o que deixa a disputa equilibrada entre todos.
      </div>` : "";


    return `
      <div id="pcDisputaSobraOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,10,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
        <div style="max-width:460px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(29,32,35,.97); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
            <div>
              <h2 style="margin:0; font-size:16px;">Disputa de sobra — ${cargoDef.label}</h2>
              <div class="pc-sub" style="margin-top:4px;">${disputaSobra.rodadas.length} vaga${disputaSobra.rodadas.length === 1 ? "" : "s"} decidida${disputaSobra.rodadas.length === 1 ? "" : "s"} por média, uma rodada de cada vez, entre os partidos com voto</div>
            </div>
            <button id="pcFecharDisputaSobra" class="pc-mini-btn" title="Fechar" style="font-size:16px; line-height:1;">×</button>
          </div>
          <div style="display:flex; gap:16px; margin:16px 0 0; padding:10px 12px; background:#0C0E10; border:1px solid #23262A; border-radius:10px;">
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Quociente eleitoral</div><div style="font-size:15px; font-weight:700; font-variant-numeric:tabular-nums;">${Math.round(disputaSobra.qe).toLocaleString("pt-BR")}</div></div>
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Vagas por QP</div><div style="font-size:15px; font-weight:700; font-variant-numeric:tabular-nums;">${disputaSobra.totalQP}</div></div>
            <div><div style="font-size:9.5px; color:var(--pc-ink-faint); margin-bottom:2px;">Vagas por sobra</div><div style="font-size:15px; font-weight:700; font-variant-numeric:tabular-nums;">${disputaSobra.totalSobrasCargo}</div></div>
          </div>
          <div style="margin-top:14px; background:#2C3239; border:1px solid #4D545C; border-radius:12px; padding:12px 14px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#AEB5BB; margin-bottom:8px;">Quem levou cada vaga de sobra <button type="button" id="pcSobraInfoToggle" class="pc-sen-inf${infoAberta ? " aberto" : ""}" title="Como funciona o cálculo da sobra">i</button></div>
            ${blocoInfo}
            ${linhasResumo}
          </div>
        </div>
      </div>`;
  })();

  conteudo.innerHTML = `
    <div id="pcFarolBloco"></div>
    ${painelDisputaSobraHtml}
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <h2>Revisão</h2>
      <div class="pc-sub">Revise os três cargos antes de salvar — dá pra ajustar cada um aqui mesmo, sem voltar pra outra tela.</div>
      ${pcState.listaSalvaId ? `<div class="pc-sub" style="color:var(--pc-warning); margin-top:6px;">${iconeSvg("alerta", 12)} Você está editando "${pcState.listaSalvaNome || "uma lista salva"}". As mudanças só ficam valendo se clicar em Salvar de novo antes de sair — senão se perdem.</div>` : ""}

      <div class="pc-console" style="margin-top:12px; padding:7px 10px;">
        <div class="pc-cmd-painel" style="margin-bottom:0;">
          <button id="pcBtnVoltarRevisao" class="pc-cmd-acao" title="Voltar e ajustar">${iconeSvg("setaEsquerda", 15)}</button>
          <button id="pcBtnImprimir" class="pc-cmd-acao" ${pcState.listaSalvaId ? "" : "disabled"} title="${pcState.listaSalvaId ? "Impressão / PDF" : "Salve a lista primeiro pra poder imprimir"}">${iconeSvg("impressora", 15)}</button>
          <button id="pcBtnConfirmarDeposito" class="pc-cmd-acao destaque" title="Salvar">${iconeSvg("salvar", 16)}</button>
        </div>
      </div>
      <div class="pc-status" id="pcDepositoStatus" style="text-align:right; margin-top:6px;"></div>
      <div id="pcImprimirPergunta" style="display:none; margin-top:10px;">
        <div class="di-opt-tit">Cargos</div>
        <div class="pc-cargo-switch" style="margin-bottom:10px;">
          <button data-pc-imprimir-cargo="estadual">Estadual</button>
          <button data-pc-imprimir-cargo="federal">Federal</button>
          <button data-pc-imprimir-cargo="senador">Senador</button>
          <button data-pc-imprimir-cargo="tudo" class="active">Tudo</button>
        </div>
        <div class="di-opt-tit">Recorte</div>
        <div class="pc-cargo-switch di-opt-wrap" style="margin-bottom:10px;">
          <button data-pc-imprimir-recorte="completa" class="active">Lista completa</button>
          <button data-pc-imprimir-recorte="eleitos">Só os eleitos</button>
          <button data-pc-imprimir-recorte="candidatas">Candidatas</button>
          <button data-pc-imprimir-recorte="partido">Por partido</button>
          <button data-pc-imprimir-recorte="top10">Top 10</button>
        </div>
        <select id="pcImprimirPartido" class="di-opt-select" style="display:none;">${opcoesPartidosImpressao()}</select>
        <div class="di-opt-tit">Ordenação</div>
        <div class="pc-cargo-switch di-opt-wrap" style="margin-bottom:10px;">
          <button data-pc-imprimir-ordem="palpite" class="active">Eleitos primeiro</button>
          <button data-pc-imprimir-ordem="crescente">Votos crescente</button>
          <button data-pc-imprimir-ordem="decrescente">Votos decrescente</button>
        </div>
        <div class="di-opt-registrar">
          <div style="min-width:0;">
            <div style="font-size:12px; font-weight:700; color:var(--pc-ink);">Registrar documento</div>
            <div style="font-size:10px; color:var(--pc-ink-dim); line-height:1.4;">Inclui o bloco de registro antes do rodapé: seu nome, a lista, data/hora e linha de assinatura.</div>
          </div>
          <label class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcImprimirRegistrar" checked><span class="pc-switch-slider"></span></label>
        </div>
        <div class="di-opt-registrar" style="margin-top:8px;">
          <div style="min-width:0;">
            <div style="font-size:12px; font-weight:700; color:var(--pc-ink);">Impressão anônima</div>
            <div style="font-size:10px; color:var(--pc-ink-dim); line-height:1.4;">Tira seu nome do cabeçalho e do bloco de registro — vira uma linha em branco pra assinar na mão.</div>
          </div>
          <label class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcImprimirAnonimo"><span class="pc-switch-slider"></span></label>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" id="pcBtnCancelarImpressao" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnGerarImpressao" style="flex:1;">Gerar documento</button>
        </div>
      </div>

      <div style="margin:18px 0 16px; border-top:1px solid var(--pc-glass-border);"></div>

      ${temInconsistenciaGeral ? `<details class="pc-acc" style="margin:0 0 14px;">
        <summary style="display:flex; align-items:center; gap:7px; font-size:11px; color:var(--pc-ink-dim);">${iconeSvg("alerta", 14)}<b style="color:var(--pc-ink);">Você não precisa zerar todos os avisos pra salvar</b></summary>
        <div class="pc-acc-body" style="font-size:11px; color:var(--pc-ink-dim); line-height:1.5; padding-top:6px;">— dá pra salvar assim mesmo. As vagas de cada cargo são disputadas entre todos os partidos ao mesmo tempo, então corrigir um candidato de cada vez pode não resolver (fechar uma vaga aqui pode abrir um aviso novo em outro partido — é a disputa por sobras funcionando, não um erro). Use a barra e o botão ✦ de cada candidato pendente pra ajustar aos poucos, ou edite os votos direto na caixa.</div>
      </details>` : ""}

      ${secoesHtml}
    </div>
    ${pcState.modalNomeListaAberto ? renderModalNomeLista() : ""}
`;
  if (pcState.modalNomeListaAberto) {
    attachListenersModalNomeLista(renderRevisaoDeposito, async () => {
      // Mesmo gate dos slots da Seleção (achado 5 da revisão 22/08): a
      // Revisão criava lista nova sem checar o limite de 2 grátis nem
      // cobrar o crédito — os dois botões de salvar agora cobram igual.
      const listas = await _carregarMinhasListasNormalizado();
      const abertas = listas.filter((l) => !l.depositadoEm);
      if (abertas.length >= 2) {
        if (!pcState.perfil) {
          pcState.pendenteRegistro = true;
          pcState.tela = "cadastro";
          renderColaborativo();
          return;
        }
        const { consumiu, error } = await consumirCreditoConta(pcState.perfil.id);
        if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
        if (!consumiu) {
          pcState.listaSalvaNome = null;
          await renderRevisaoDeposito();
          const st = document.getElementById("pcDepositoStatus");
          if (st) st.textContent = "Suas 2 listas grátis já estão em uso — sobreponha uma na Seleção, ou convide um amigo pra ganhar créditos.";
          return;
        }
        pcState.perfil.creditos = Math.max(0, (pcState.perfil.creditos || 0) - 1);
      }
      await executarSalvarLista();
    });
  }
  // Filtro lista única vs. agrupado por partido/federação, no cabeçalho de
  // cada cargo — preventDefault/stopPropagation pra não deixar o clique
  // também abrir/fechar o <details> por baixo (pedido do usuário em
  // 08/08/2026: só incluir os 2 ícones, sem mudar mais nada da estrutura).
  document.querySelectorAll("[data-pc-modo-revisao]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cargo = btn.getAttribute("data-pc-modo-revisao-cargo");
      pcState.modoAgrupadoRevisao[cargo] = btn.getAttribute("data-pc-modo-revisao") === "grupo";
      renderRevisaoDeposito();
    });
  });
  // 3º filtro — "E": só os eleitos, mesmo selo do documento impresso.
  document.querySelectorAll("[data-pc-filtro-eleito-revisao]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cargo = btn.getAttribute("data-pc-filtro-eleito-revisao");
      pcState.filtroEleitoRevisao[cargo] = !pcState.filtroEleitoRevisao[cargo];
      renderRevisaoDeposito();
    });
  });
  // Lembra se cada card de cargo (Dep. Estadual/Federal/Senador) estava
  // aberto ou fechado — sem isso, toda ação dentro da Revisão (inclusive
  // o botão ✦ abaixo) reconstrói o HTML e os <details> voltam pro estado
  // fechado do zero (ver `reRenderizando`/`scrollAnterior` no topo desta
  // função). O evento nativo "toggle" não precisa de re-render, só grava
  // o estado pra próxima vez.
  document.querySelectorAll("details.pc-acc[data-pc-cargo-acc]").forEach((det) => {
    det.addEventListener("toggle", () => {
      pcState.expandido["revisao-" + det.getAttribute("data-pc-cargo-acc")] = det.open;
    });
  });
  // Painel "Disputa de Sobra" — abre com o id do cargo clicado, fecha
  // voltando pra null. Mesmo padrão dos outros overlays desta tela.
  document.querySelectorAll("[data-pc-abrir-disputa-sobra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.disputaSobraAberta = btn.getAttribute("data-pc-abrir-disputa-sobra");
      renderRevisaoDeposito();
    });
  });
  const btnFecharDisputaSobra = document.getElementById("pcFecharDisputaSobra");
  if (btnFecharDisputaSobra) {
    btnFecharDisputaSobra.addEventListener("click", () => {
      pcState.disputaSobraAberta = null;
      pcState.sobraInfoAberta = false;
      renderRevisaoDeposito();
    });
  }
  const btnSobraInfo = document.getElementById("pcSobraInfoToggle");
  if (btnSobraInfo) {
    btnSobraInfo.addEventListener("click", () => {
      pcState.sobraInfoAberta = !pcState.sobraInfoAberta;
      renderRevisaoDeposito();
    });
  }
  // Botão mágico (✦) de cada candidato pendente — abre/fecha o menu com as
  // 2 formas de completar o voto que falta. Clique, não hover (pedido do
  // usuário em 06/08/2026). Duas entradas pro mesmo menu: o ✦ ao lado da
  // barra de progresso, e a seta ao lado de "faltam X votos" (pedido do
  // usuário em 12/08/2026, mais visível pra quem não reparou no ✦).
  document.querySelectorAll("[data-pc-abrir-magico]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const chave = btn.getAttribute("data-pc-abrir-magico");
      pcState.menuMagicoAberto = pcState.menuMagicoAberto === chave ? null : chave;
      renderRevisaoDeposito();
    });
  });
  // "Aceitar o ajuste" do aviso de matemática real (teste mobile
  // 28/08/2026): troca a marcação — o candidato que a regra elegeria
  // ganha o selo, quem a regra derrubaria perde. Só mexe em marcadoEleito
  // (nunca nos votos); o re-render recalcula tudo a partir da marcação.
  document.querySelectorAll("[data-pc-aceitar-ajuste]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const partes = btn.getAttribute("data-pc-aceitar-ajuste").split("::");
      const cargoId = partes[0], chaveGanha = partes[1], chavePerde = partes[2];
      const lista = pcState.palpitesPorCargo[cargoId];
      if (!lista) return;
      const achar = (chave) => {
        for (const g of lista) {
          const c = g.candidatos.find((cc) => cc.chave === chave);
          if (c) return c;
        }
        return null;
      };
      const ganha = achar(chaveGanha), perde = achar(chavePerde);
      if (!ganha || !perde) return;
      perde.marcadoEleito = false;
      ganha.marcadoEleito = true;
      if (pcState.cargoAtivo === cargoId) pcState.palpiteEdicao = lista;
      // Libera a ordem congelada dos cards de partido (bug achado pelo
      // usuário 01/09/2026): sem isso, a tela "distribuir votação" ficava
      // travada na posição de ANTES do ajuste pra sempre — esse é o único
      // caminho que troca marcadoEleito sem passar por aplicarVagas/
      // reordenarComTransicao, então precisa liberar a régua na mão.
      pcState.ordemPartidosFixa = null;
      pcState.ordemCandidatosFixa = null;
      agendarAutoSaveRascunho(cargoId, lista);
      renderRevisaoDeposito();
    });
  });
  // "✗" do mesmo aviso — não faz nada além de existir: recusar o ajuste
  // é simplesmente não mexer na marcação, o aviso continua aparecendo
  // até a pessoa marcar por conta própria ou os votos mudarem.
  document.querySelectorAll("[data-pc-recusar-ajuste]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.preventDefault(); });
  });
  document.querySelectorAll("[data-pc-fechar-vaga]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lista = pcState.palpitesPorCargo[btn.getAttribute("data-pc-cargo")];
      fecharVagaPartido(btn.getAttribute("data-pc-fechar-vaga"), btn.getAttribute("data-pc-chave"), Number(btn.getAttribute("data-pc-acrescimo")), lista);
      pcState.menuMagicoAberto = null;
      renderRevisaoDeposito();
    });
  });
  document.querySelectorAll("[data-pc-distribuir-menores]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lista = pcState.palpitesPorCargo[btn.getAttribute("data-pc-cargo-menores")];
      distribuirComQuemTemMenos(btn.getAttribute("data-pc-distribuir-menores"), btn.getAttribute("data-pc-chave-menores"), Number(btn.getAttribute("data-pc-gap-menores")), lista);
      pcState.menuMagicoAberto = null;
      renderRevisaoDeposito();
    });
  });
  // Ajuste manual direto na revisão — mesma lógica de edição da tela de
  // seleção (ver input[data-pc-voto] ali), só que reconstrói a revisão em
  // vez da seleção depois de salvar, pra pessoa poder corrigir um aviso
  // "no olho" sem precisar voltar pra tela anterior. O atributo carrega
  // cargo::partido::chave agora (não só partido::chave) porque a Revisão
  // edita os 3 cargos ao mesmo tempo, não só o ativo.
  document.querySelectorAll("input[data-pc-voto-revisao]").forEach((inp) => {
    inp.addEventListener("blur", (e) => {
      const [cargo, nomePartido, chave] = e.target.dataset.pcVotoRevisao.split("::");
      const lista = pcState.palpitesPorCargo[cargo];
      const p = lista.find((pp) => pp.nome === nomePartido);
      const c = p.candidatos.find((cc) => String(cc.chave) === chave);
      let val = Number(String(e.target.value).replace(/\D/g, "")) || 0;
      // Mesmo teto do input da tela de Seleção (ver data-pc-voto ali) — a
      // soma dos votos dos candidatos marcados como eleito NESSE cargo não
      // pode passar da projeção de votos válidos de 2026 pra ele.
      if (c.marcadoEleito) {
        const somaSemEste = lista.reduce((s, pp) => s + pp.candidatos
          .filter((cc) => cc.marcadoEleito && cc !== c)
          .reduce((s2, cc) => s2 + (Number(cc.votos) || 0), 0), 0);
        const tetoProjecao = Math.round(totalValidosProjetado2026(cargo));
        val = Math.min(val, Math.max(0, tetoProjecao - somaSemEste));
      }
      if (val === c.votos) return;
      // Desfazer (Seleção) só sabe voltar o cargo ativo — snapshot só faz
      // sentido pra edição desse cargo especificamente aqui na Revisão.
      if (cargo === pcState.cargoAtivo) snapshotPalpite();
      c.votos = val;
      c.votosEditado = true;
      renderRevisaoDeposito();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== "Tab") return;
      e.preventDefault();
      const todos = [...document.querySelectorAll("input[data-pc-voto-revisao]")];
      const idx = todos.indexOf(e.target);
      const voltar = e.key === "Tab" && e.shiftKey;
      const alvo = voltar ? todos[idx - 1] : todos[idx + 1];
      const atributoAlvo = alvo ? alvo.getAttribute("data-pc-voto-revisao") : null;
      e.target.blur();
      if (atributoAlvo) {
        const novo = document.querySelector(`input[data-pc-voto-revisao="${atributoAlvo}"]`);
        if (novo) { novo.focus(); novo.select(); }
      }
    });
  });
  atualizarFarol();
  document.getElementById("pcBtnVoltarRevisao").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
    else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
  });
  document.getElementById("pcBtnConfirmarDeposito").addEventListener("click", async () => {
    // Cédula é IMUTÁVEL (achado 5 da revisão 22/08): se a lista ativa foi
    // DEPOSITADA nesse meio tempo (o depósito não zera listaSalvaId), o
    // Salvar da Revisão não pode gravar em cima dela — vira lista nova.
    if (pcState.listaSalvaId) {
      const listas = await _carregarMinhasListasNormalizado();
      const ativa = listas.find((l) => l.id === pcState.listaSalvaId);
      if (ativa && ativa.depositadoEm) {
        pcState.listaSalvaId = null;
        pcState.listaSalvaNome = null;
        await persistirListaAtivaLocal();
      }
    }
    // Primeiro Salvar dessa lista (ainda sem nome) pede o nome antes de
    // gravar qualquer coisa — ver executarSalvarLista pra o que acontece
    // depois de confirmado. Salvamentos seguintes da MESMA lista (já tem
    // nome) não perguntam de novo, só atualizam. O gate de economia (2
    // grátis; crédito/conta além) roda na CONFIRMAÇÃO do nome — cancelar
    // o modal não cobra nada (mesma régua dos slots da Seleção).
    if (!pcState.listaSalvaNome) {
      pcState.modalNomeListaAberto = true;
      renderRevisaoDeposito();
      return;
    }
    await executarSalvarLista();
  });
  const btnImprimirRevisao = document.getElementById("pcBtnImprimir");
  btnImprimirRevisao.addEventListener("click", (e) => {
    document.getElementById("pcImprimirPergunta").style.display = "block";
    e.currentTarget.style.display = "none";
  });
  // Consome o pedido vindo do ícone de imprimir do cabeçalho (Seleção) —
  // abre o painel de opções direto, sem precisar de mais um clique.
  if (pcState._abrirImpressaoAoEntrar) {
    pcState._abrirImpressaoAoEntrar = false;
    if (!btnImprimirRevisao.disabled) btnImprimirRevisao.click();
    else mostrarStatusSalvamento("Salve a lista primeiro pra poder imprimir.");
  }
  document.getElementById("pcBtnCancelarImpressao").addEventListener("click", () => {
    document.getElementById("pcImprimirPergunta").style.display = "none";
    document.getElementById("pcBtnImprimir").style.display = "";
  });
  // Os 3 grupos de chips (cargos / recorte / ordenação) usam a mesma
  // mecânica de "active" único; o recorte "Por partido" mostra o select.
  ["cargo", "recorte", "ordem"].forEach((grupo) => {
    document.querySelectorAll(`[data-pc-imprimir-${grupo}]:not(:disabled)`).forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(`[data-pc-imprimir-${grupo}]`).forEach((b) => b.classList.toggle("active", b === btn));
        if (grupo === "recorte") {
          document.getElementById("pcImprimirPartido").style.display =
            btn.getAttribute("data-pc-imprimir-recorte") === "partido" ? "block" : "none";
        }
      });
    });
  });
  document.getElementById("pcBtnGerarImpressao").addEventListener("click", () => {
    const cargoEscolhido = document.querySelector("[data-pc-imprimir-cargo].active").getAttribute("data-pc-imprimir-cargo");
    const cargosParaGerar = cargoEscolhido === "tudo" ? CARGOS.map((c) => c.id) : [cargoEscolhido];
    const recorte = document.querySelector("[data-pc-imprimir-recorte].active").getAttribute("data-pc-imprimir-recorte");
    const op = {
      recorte,
      partido: recorte === "partido" ? document.getElementById("pcImprimirPartido").value : null,
      ordenacao: document.querySelector("[data-pc-imprimir-ordem].active").getAttribute("data-pc-imprimir-ordem"),
      registrar: document.getElementById("pcImprimirRegistrar").checked,
      anonimo: document.getElementById("pcImprimirAnonimo").checked,
    };
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) {
      container = document.createElement("div");
      container.id = "pcImpressaoConteudo";
      document.body.appendChild(container);
    }
    container.innerHTML = montarDocumentoImpresso(cargosParaGerar, op);
    window.print();
  });

  if (reRenderizando) window.scrollTo(0, scrollAnterior);
}

// Consulta pública de cédula (nome ou código) — pedido do usuário, ver
// BACKLOG.md "Cédula depositada / Compartilhamento": a pontuação/ranking
// de verdade depende do resultado oficial de 2026, mas achar e ver uma
// cédula específica não depende disso, então já funciona agora, dentro
// da mesma tela (placeholder do ranking em si).
function renderRankingPlaceholder() {
  const conteudo = document.getElementById("pcConteudo");

  if (pcState.buscaCedulaDetalhe) {
    const r = pcState.buscaCedulaDetalhe;
    const secoes = montarSecoesCargosDetalhe({ estadual: r.lista_estadual, federal: r.lista_federal, senador: r.lista_senador });
    conteudo.innerHTML = `
      <button class="ghost" id="pcBtnVoltarBuscaCedula" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Voltar pra busca</button>
      <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">${r.nome_exibicao}</div>
      <div class="pc-sub" style="margin:0 0 14px 2px;">${r.estado}${r.codigo ? ` · código ${r.codigo}` : ""}</div>
      ${secoes || `<div class="glass-card"><div class="pc-sub" style="margin:0;">Essa cédula não tem candidatos registrados.</div></div>`}`;
    document.getElementById("pcBtnVoltarBuscaCedula").addEventListener("click", () => {
      pcState.buscaCedulaDetalhe = null;
      renderRankingPlaceholder();
    });
    return;
  }

  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): cabeçalho vira banner de
  // destaque (o Ranking em si ainda não abriu — o banner explica quando e
  // como, no lugar de um card comum), resultados da busca viram mini-cards.
  const resultados = pcState.buscaCedulaResultados;
  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Ranking</div>
    <div class="pc-lobby-banner">
      <div class="pc-lobby-banner-eyebrow">Depois da eleição</div>
      <div class="pc-lobby-banner-titulo">Quem acertou mais, sobe</div>
      <div class="pc-lobby-banner-corpo">O ranking abre com o resultado oficial de 2026: vale quem mais acertar a lista real de eleitos; o desempate é a menor distância entre votos previstos e reais.</div>
      <div style="display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--pc-accent); font-weight:700;">${iconeSvg("calendario", 14)}Faltam ${diasAteEleicao()} dias</div>
    </div>
    <div class="pc-lobby-menu-tit">Consultar uma cédula</div>
    <div class="pc-lobby-card" style="padding:14px 16px;">
      <div class="pc-sub" style="margin:0 0 12px;">Busque pelo nome de quem depositou ou pelo código da cédula (ex.: SL01-AB3D) — isso já funciona agora, não depende do resultado oficial.</div>
      <div style="display:flex; gap:8px;">
        <input class="cell" id="pcBuscaCedulaInput" placeholder="Nome ou código" value="${pcState.buscaCedulaTermo || ""}" style="flex:1;">
        <button class="primary" id="pcBtnBuscarCedula" style="flex-shrink:0;">Buscar</button>
      </div>
    </div>
    <div id="pcBuscaCedulaResultado" style="margin-top:14px;">
      ${pcState.buscaCedulaCarregando ? `<div class="pc-sub">Buscando…</div>` : ""}
      ${!pcState.buscaCedulaCarregando && resultados && resultados.length === 0 ? estadoVazio({ icone: "buscar", titulo: "Nada encontrado", texto: "Confira o nome ou código digitado." }) : ""}
      ${!pcState.buscaCedulaCarregando && resultados && resultados.length > 0 ? resultados.map((r) => `
        <button data-pc-ver-cedula-publica="${r.salvamento_id}" class="pc-mini-card">
          <div class="pc-mini-card-icone">${iconeSvg("ballot", 17)}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.nome_exibicao}</div>
            <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px;">${r.estado}${r.codigo ? ` · <span style="font-family:var(--mono);">${r.codigo}</span>` : ""}</div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
        </button>`).join("") : ""}
    </div>`;

  const input = document.getElementById("pcBuscaCedulaInput");
  const disparar = async () => {
    pcState.buscaCedulaTermo = input.value;
    pcState.buscaCedulaCarregando = true;
    renderRankingPlaceholder();
    pcState.buscaCedulaResultados = await buscarCedulaPublica(pcState.buscaCedulaTermo);
    pcState.buscaCedulaCarregando = false;
    renderRankingPlaceholder();
  };
  document.getElementById("pcBtnBuscarCedula").addEventListener("click", disparar);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") disparar(); });
  document.querySelectorAll("[data-pc-ver-cedula-publica]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-pc-ver-cedula-publica");
      pcState.buscaCedulaDetalhe = pcState.buscaCedulaResultados.find((r) => r.salvamento_id === id);
      renderRankingPlaceholder();
    });
  });
}







// ---------- Quadro de médias ----------

// Quadro de médias — pesquisa em tempo real. Diferente do resto do app
// (que trabalha o palpite de UMA pessoa), aqui é a agregação pública de
// TODA gente cadastrada: cada candidato usa a mediana aparada dos votos
// que cada pessoa deu pra ele (calcularMedianaPalpites em
// nuvem/palpites.js — mais resistente a resposta isolada/bloco de
// respostas extremas do que média simples), e quem "estaria eleito" sai
// da MESMA regra eleitoral real usada em todo o resto do app (quociente +
// D'Hondt pra Estadual/Federal, majoritário pro Senador — ver
// projetarEleitosMediana). Concebido com o usuário em 04/08/2026.
async function renderQuadroMedias() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Calculando o Termômetro Eleitoral…");

  if (!pcState.cargoAtivoMedias) pcState.cargoAtivoMedias = "estadual";
  const cargo = pcState.cargoAtivoMedias;
  // Nomes, partidos e posições SEMPRE abertos, pra todo mundo (decisão do
  // usuário, 04/09/2026 — o conta-gotas de +2 linhas/dia da migração 23
  // saiu daqui; as RPCs continuam no banco, só não são mais chamadas).
  // A única camada de bloqueio que resta é a votação por candidato, abaixo.
  // "Referência inicial" (04/09/2026): enquanto o estado tiver menos de
  // LIMIAR_MEDIANA_REAL cédulas reais depositadas, a Mediana pública ainda
  // é sustentada majoritariamente por bots (que saem 1 a 1 a cada depósito
  // real — regra de 25/08, intacta) — o rótulo deixa isso explícito em vez
  // de apresentar como "a opinião do grupo". Acima do limiar, o rótulo some
  // sozinho (não é um evento — é só o número passando do corte).
  const LIMIAR_MEDIANA_REAL = 15;
  const { data: depositosReaisUf } = await supabaseClient.rpc("contagem_depositos_reais_uf", { p_uf: pcState.estado });
  const reaisNoEstado = Number(depositosReaisUf) || 0;
  const referenciaInicial = reaisNoEstado < LIMIAR_MEDIANA_REAL;
  const registros = await buscarTodosRascunhosPublicos();
  // Votos dados dentro de um Duelo também entram no Termômetro (decisão do
  // usuário, 04/09/2026) — ver duelo_votos_publicos (migração 45).
  const votosDuelo = await buscarVotosDuelosPublicos(pcState.estado, cargo);
  const { parties, totalPalpites } = calcularMedianaPalpites(registros, cargo, pcState.estado, votosDuelo);
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargo);
  const limiteExibicao = cargo === "senador" ? 5 : Math.round(totalVagasCargo * 1.5);
  const projecao = projetarEleitosMediana(parties, cargo, pcState.estado, limiteExibicao);

  // Votação mediana — cadeado por candidato (pedido do usuário,
  // 23/08/2026: "a aba do candidato apresente a votação mediana... que
  // também fica borrado... e que será cobrado para tirar o borrão").
  // Revelar um candidato aqui (Coringa/avulso/pacote/cargo) abre só a
  // votação dele — nome e posição já estão à vista.
  const chaveCache = `${pcState.estado}::${cargo}`;
  if (!pcState.termometroRevelacoesCache[chaveCache]) {
    const revs = pcState.perfil ? await minhasRevelacoesTermometro(pcState.estado, cargo) : [];
    pcState.termometroRevelacoesCache[chaveCache] = new Set(revs.map((r) => r.chave_candidato));
  }
  const votosRevelados = pcState.termometroRevelacoesCache[chaveCache];

  const seatsProj = cargo === "senador"
    ? Object.values(projecao.filter((c) => c.eleito).reduce((acc, c) => {
        acc[c.partido] = acc[c.partido] || { nome: c.partido, seats: 0 };
        acc[c.partido].seats++;
        return acc;
      }, {}))
    : (() => {
        const { counts } = dhondtComCorte(parties, totalVagasCargo);
        return parties.map((p, i) => ({ nome: p.nome, seats: counts[i] || 0 }));
      })();

  const botoesCargo = CARGOS.map((c) => `
    <button data-pc-cargo-medias="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");

  // Admin vê toda votação aberta, sem cadeado (decisão do usuário,
  // 04/09/2026 — nunca tinha existido um bypass real aqui; o que parecia
  // "aberto" era só o conta-gotas de nome/posição, removido hoje).
  const votosOuCadeado = (c) => (pcState.souAdmin || votosRevelados.has(c.chave))
    ? `<span class="pc-tm-votos">${Number(c.votos || 0).toLocaleString("pt-BR")} <small>votos</small></span>`
    : `<span class="pc-tm-votos-lock">${iconeSvg("cadeadoSlot", 9)}votos</span>`;

  // Faixa de incerteza (Q1-Q3) — sempre visível, em toda linha (decisão do
  // usuário, 04/09/2026). MAX é a mesma régua da barra do candidato em
  // outros lugares do app (125% do maior voto de 2022 do estado+cargo —
  // capCandidatoDeputado, achado de 21/08/2026), pra não inventar outra
  // escala. semPalpites (ou sem q1/q3 calculado) pinta a faixa 100% cheia,
  // sem números nas pontas — não tem quartil de verdade pra mostrar.
  const faixaIncertezaHtml = (c) => {
    const max = capCandidatoDeputado();
    const semDados = c.semPalpites || c.q1 === undefined || c.q3 === undefined;
    if (semDados) {
      return `<div class="pc-tm-faixa">
        <div class="pc-tm-faixa-trilho"><div class="pc-tm-faixa-seg cheia" style="left:0; width:100%;"></div></div>
      </div>`;
    }
    const pct = (v) => Math.max(0, Math.min(100, (Number(v) || 0) / max * 100));
    const pctQ1 = pct(c.q1), pctQ3 = pct(c.q3), pctMed = pct(c.votos);
    return `<div class="pc-tm-faixa">
      <div class="pc-tm-faixa-trilho">
        <div class="pc-tm-faixa-seg" style="left:${pctQ1}%; width:${Math.max(0, pctQ3 - pctQ1)}%;"></div>
        <div class="pc-tm-faixa-med" style="left:${pctMed}%;"></div>
      </div>
      <div class="pc-tm-faixa-nums"><span>${formatVotosCompacto(c.q1)}</span><span>${formatVotosCompacto(c.q3)}</span></div>
    </div>`;
  };

  const linha = (c, i) => {
    return `<div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:0;">
      <span style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <span style="display:flex; align-items:baseline; gap:10px; min-width:0;">
          <span style="width:24px; flex-shrink:0; font-size:11px; font-weight:600; color:${c.eleito ? "var(--pc-accent)" : "var(--pc-ink-dim)"};">${i + 1}º</span>
          <span style="min-width:0;">
            <div style="font-size:13px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.nomeUrna || c.nome}${c.eleito ? ` <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#07230C; background:var(--pc-accent); border-radius:999px; padding:1px 6px;">eleito</span>` : ""}</div>
            <div style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}${c.semPalpites ? " · sem palpite ainda" : ` · ${c.amostras} palpite${c.amostras === 1 ? "" : "s"}`}</div>
          </span>
        </span>
        ${votosOuCadeado(c)}
      </span>
      ${faixaIncertezaHtml(c)}
    </div>`;
  };

  // ===== painel "Revelar agora" — Coringa + avulso/pacote/cargo, preço
  // por escopo × prazo (decisão de 24/08/2026). ==========
  const candidatosVotoOculto = projecao.filter((c) => !votosRevelados.has(c.chave));
  const painelPrecos = pcState.perfil && candidatosVotoOculto.length ? `
    <div class="pc-tm-premium">
      <div class="pc-tm-premium-tit">${iconeSvg("credito", 15)} Revelar agora!</div>
      <div class="pc-tm-premium-sub">Abre a <b>votação mediana</b> do candidato — o número que o grupo projeta.</div>

      <div class="pc-tm-linha-op pc-tm-coringa" id="pcBtnCoringa">
        <span class="pc-tm-op-ic">${iconeSvg("desafio", 15)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Coringa</span><span class="pc-tm-op-d">O sistema sorteia 1 candidato e abre a votação dele</span></span>
        <span class="pc-tm-op-p" style="color:#E8B04A;">2 SL</span>
      </div>

      <div class="pc-tm-linha-op" id="pcBtnRevelarAvulso" data-custo7="3" data-custo-def="5">
        <span class="pc-tm-op-ic">${iconeSvg("buscar", 14)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Candidato</span><span class="pc-tm-op-d">Escolha de quem abrir a votação</span></span>
        <span class="pc-tm-op-p">5 SL</span>
      </div>
      <select class="cell" id="pcSelectCandidatoAvulso" style="width:100%; margin:-4px 0 8px;">
        ${candidatosVotoOculto.map((c) => `<option value="${c.chave}">${c.nomeUrna || c.nome} — ${c.partido}</option>`).join("")}
      </select>

      <div class="pc-tm-linha-op" id="pcBtnRevelarPacote" data-custo7="20" data-custo-def="35">
        <span class="pc-tm-op-ic">${iconeSvg("lista", 14)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Pacote de 10</span><span class="pc-tm-op-d">10 candidatos com a votação ainda fechada</span></span>
        <span class="pc-tm-op-p">35 SL</span>
      </div>
      <div class="pc-tm-linha-op" id="pcBtnRevelarCargo" data-custo7="30" data-custo-def="50">
        <span class="pc-tm-op-ic">${iconeSvg("checkCirculo", 14)}</span>
        <span class="pc-tm-op-c"><span class="pc-tm-op-t">Cargo inteiro</span></span>
        <span class="pc-tm-op-p">50 SL</span>
      </div>

      <div class="pc-tm-dur">
        <span data-pc-dur="7">7 dias</span>
        <span class="on" data-pc-dur="0">definitivo</span>
      </div>
      <div class="pc-status" id="pcTermometroStatus" style="margin-top:6px; min-height:12px;">${pcState.termometroStatus || ""}</div>
    </div>` : "";
  pcState.termometroStatus = "";

  const coringaOverlay = pcState.termometroCoringaResultado ? `
    <div class="pc-tm-coringa-overlay" id="pcTmCoringaOverlay">
      <div class="pc-tm-carta ${pcState.termometroCoringaResultado.raridade}">
        <span class="pc-tm-carta-rar">${pcState.termometroCoringaResultado.raridade}</span>
        <div class="pc-tm-carta-pos">${pcState.termometroCoringaResultado.posicao}º</div>
        <div class="pc-tm-carta-nome">${pcState.termometroCoringaResultado.candidato.nomeUrna || pcState.termometroCoringaResultado.candidato.nome}</div>
        <div class="pc-tm-carta-part">${pcState.termometroCoringaResultado.candidato.partido}</div>
        <div class="pc-tm-carta-votos">${Number(pcState.termometroCoringaResultado.candidato.votos || 0).toLocaleString("pt-BR")}</div>
      </div>
      <button class="primary" id="pcBtnFecharCoringa" style="margin-top:16px;">Fechar</button>
    </div>` : "";

  conteudo.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Termômetro Eleitoral</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Mediana aparada de ${totalPalpites} palpite${totalPalpites === 1 ? "" : "s"} público${totalPalpites === 1 ? "" : "s"}, pela mesma regra do resultado oficial.</div>
    ${referenciaInicial ? `
    <div style="display:flex; align-items:center; gap:8px; background:var(--pc-glass); border:1px solid var(--pc-glass-border); border-radius:10px; padding:9px 11px; margin-bottom:14px;">
      <span style="font-size:9.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--pc-ink-dim); border:1px solid var(--pc-glass-border); border-radius:999px; padding:2px 7px; flex-shrink:0;">referência inicial</span>
      <span style="font-size:11px; color:var(--pc-ink-dim); line-height:1.4;"><b style="color:var(--pc-ink);">${reaisNoEstado} pessoa${reaisNoEstado === 1 ? "" : "s"} real${reaisNoEstado === 1 ? "" : "is"}</b> já depositou${reaisNoEstado === 1 ? "" : "ram"} em ${pcState.estado}. Enquanto não chegar em ${LIMIAR_MEDIANA_REAL}, a mediana é um ponto de partida — não a opinião do grupo.</span>
    </div>
    <div style="height:6px; background:var(--pc-glass); border:1px solid var(--pc-glass-border); border-radius:4px; overflow:hidden; margin:-8px 0 4px;"><div style="width:${Math.round(Math.min(1, reaisNoEstado / LIMIAR_MEDIANA_REAL) * 100)}%; height:100%; background:var(--pc-accent); opacity:.7;"></div></div>
    <div style="font-size:10px; color:var(--pc-ink-faint); margin:0 0 14px 2px;">${reaisNoEstado} de ${LIMIAR_MEDIANA_REAL} cédulas reais pra virar "mediana do grupo"</div>` : ""}
    <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
    <div class="pc-lobby-card" style="padding:14px;">
      ${desenharHemiciclo(seatsProj, totalVagasCargo, { preenchido: "rgba(52,232,74,.14)", vago: "#1B1E22", borda: "var(--pc-ink)", texto: "var(--pc-ink)", porPartido: false })}
    </div>
    <div class="pc-lobby-card">
      ${projecao.length ? projecao.map((c, i) => linha(c, i)).join("") : estadoVazio({ icone: "chart", titulo: "Ninguém preencheu esse cargo", texto: "Assim que alguém depositar uma cédula pública desse cargo, o Termômetro aparece aqui." })}
    </div>
    ${painelPrecos}
    <div class="pc-aviso-nao-pesquisa">Jogo de palpites entre participantes. Não é pesquisa eleitoral e não tem valor estatístico.</div>
    ${pcState.perfil ? `<div style="margin-top:12px; text-align:center; font-size:11.5px; color:var(--pc-ink-dim);"><span style="color:var(--pc-accent); font-weight:700; cursor:pointer;" id="pcBtnDesafiarDoTermometro">Lance o seu desafio.</span></div>` : ""}
  `;
  if (coringaOverlay) document.body.insertAdjacentHTML("beforeend", coringaOverlay);

  document.querySelectorAll("[data-pc-cargo-medias]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoMedias = btn.getAttribute("data-pc-cargo-medias");
      renderQuadroMedias();
    });
  });
  const btnDesafiar = document.getElementById("pcBtnDesafiarDoTermometro");
  if (btnDesafiar) btnDesafiar.addEventListener("click", () => { pcState.subaba = "desafios"; renderAppColaborativo(); });

  // ---- painel de preços: escolha de prazo (chip 7 dias / definitivo) ----
  document.querySelectorAll("[data-pc-dur]").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("[data-pc-dur]").forEach((c) => c.classList.toggle("on", c === chip));
      const dias = chip.getAttribute("data-pc-dur");
      document.querySelectorAll("[data-custo7]").forEach((op) => {
        const custo = dias === "7" ? op.getAttribute("data-custo7") : op.getAttribute("data-custo-def");
        const preco = op.querySelector(".pc-tm-op-p");
        if (preco) preco.textContent = custo + " SL";
      });
    });
  });

  const dursAtivo = () => (document.querySelector('[data-pc-dur].on') || {}).getAttribute
    ? document.querySelector('[data-pc-dur].on').getAttribute("data-pc-dur") : "0";

  const btnCoringa = document.getElementById("pcBtnCoringa");
  if (btnCoringa) btnCoringa.addEventListener("click", async () => {
    const sorteio = sortearCoringaTermometro(projecao, votosRevelados);
    const status = document.getElementById("pcTermometroStatus");
    if (!sorteio) { status.textContent = "Já revelou tudo neste cargo!"; return; }
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, [sorteio.candidato.chave], 2, "coringa", null, sorteio.raridade);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    pcState.termometroCoringaResultado = {
      candidato: sorteio.candidato, raridade: sorteio.raridade,
      posicao: projecao.findIndex((c) => c.chave === sorteio.candidato.chave) + 1,
    };
    renderQuadroMedias();
  });
  const overlayFechar = document.getElementById("pcBtnFecharCoringa");
  if (overlayFechar) overlayFechar.addEventListener("click", () => { pcState.termometroCoringaResultado = null; renderQuadroMedias(); });

  const btnAvulso = document.getElementById("pcBtnRevelarAvulso");
  if (btnAvulso) btnAvulso.addEventListener("click", async () => {
    const sel = document.getElementById("pcSelectCandidatoAvulso");
    const dias = dursAtivo();
    const custo = Number(btnAvulso.getAttribute(dias === "7" ? "data-custo7" : "data-custo-def"));
    const status = document.getElementById("pcTermometroStatus");
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, [sel.value], custo, "candidato avulso", dias === "7" ? 7 : null, null);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    renderQuadroMedias();
  });
  const btnPacote = document.getElementById("pcBtnRevelarPacote");
  if (btnPacote) btnPacote.addEventListener("click", async () => {
    const dias = dursAtivo();
    const custo = Number(btnPacote.getAttribute(dias === "7" ? "data-custo7" : "data-custo-def"));
    const status = document.getElementById("pcTermometroStatus");
    const chaves = candidatosVotoOculto.slice(0, 10).map((c) => c.chave);
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, chaves, custo, "pacote de 10", dias === "7" ? 7 : null, null);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    renderQuadroMedias();
  });
  const btnCargo = document.getElementById("pcBtnRevelarCargo");
  if (btnCargo) btnCargo.addEventListener("click", async () => {
    const dias = dursAtivo();
    const custo = Number(btnCargo.getAttribute(dias === "7" ? "data-custo7" : "data-custo-def"));
    const status = document.getElementById("pcTermometroStatus");
    const chaves = candidatosVotoOculto.map((c) => c.chave);
    const r = await revelarCandidatosTermometro(pcState.perfil.id, pcState.estado, cargo, chaves, custo, "cargo inteiro", dias === "7" ? 7 : null, null);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; return; }
    delete pcState.termometroRevelacoesCache[chaveCache];
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    renderQuadroMedias();
  });
}
