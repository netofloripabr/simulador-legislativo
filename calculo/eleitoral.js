// Regras eleitorais compartilhadas (quociente, D'Hondt, médias, escala
// proporcional) + desenho do hemiciclo. O estado do Simulador individual
// que morava aqui foi removido em 21/08/2026 (o Simulador saiu do app em
// 18/08; sobrava state/cloneBase/setPartyVotes e a corDoPartido quebrada,
// que derrubava a comparação de grupo com ReferenceError de
// PALETA_PARTIDOS — o hemiciclo colorido agora usa corPartidoIdeologico,
// a função pura da paleta P-03).



// votos efetivos do partido: soma dos candidatos se houver, senão o manual
function partyVotos(p){
  return p.candidatos.length ? p.candidatos.reduce((s,c)=>s+(Number(c.votos)||0), 0) : (Number(p.votosManual)||0);
}


// Quociente Eleitoral — Código Eleitoral, art. 106:
// "desprezada a fração se igual ou inferior a meio, equivalente a um, se superior"
function quocienteEleitoral(totalVotos, totalVagas){
  if(!totalVotos || !totalVagas) return null;
  const bruto = totalVotos / totalVagas;
  const piso = Math.floor(bruto);
  const fracao = bruto - piso;
  return fracao <= 0.5 ? piso : piso + 1;
}

function dhondt(parties, seats){
  const counts = parties.map(()=>0);
  const votes = parties.map(p => partyVotos(p));
  if(votes.every(v => v===0)) return counts;
  for(let s=0; s<seats; s++){
    let bestIdx=-1, bestAvg=-1;
    for(let i=0;i<parties.length;i++){
      const avg = votes[i] / (counts[i]+1);
      if(avg > bestAvg){ bestAvg = avg; bestIdx = i; }
    }
    if(bestIdx>=0) counts[bestIdx]++;
  }
  return counts;
}

// Mesma distribuição do dhondt() acima, só que também devolve a "linha de
// corte": a média da ÚLTIMA cadeira distribuída (a mais fraca entre as que
// ganharam) — é o número que qualquer partido precisa superar (com
// votos/(cadeiras atuais+1)) pra conquistar mais uma cadeira. Usado pra
// mostrar, na tela de Revisão, quantos votos faltam pra uma indicação virar
// eleição de verdade — sempre como informação, nunca forçando a escolha da
// pessoa (ver PROJETO.md / conversa sobre autonomia do usuário).
//
// `historico` (pedido do usuário em 12/08/2026): a ordem cronológica de
// qual partido (índice) ganhou cada uma das `seats` rodadas do D'Hondt —
// já que este método distribui QP e sobra numa passada só (equivalência
// matemática documentada no CLAUDE.md), dá pra reconstruir, cruzando com
// o QP de cada partido, em qual rodada GLOBAL de sobra (entre todos os
// partidos do cargo, não só dentro de um) uma vaga por média foi
// conquistada — ver rodadaSobra em listaUnificadaRevisao().
function dhondtComCorte(parties, seats){
  const counts = parties.map(()=>0);
  const votes = parties.map(p => partyVotos(p));
  let corte = 0;
  const historico = [];
  if(votes.every(v => v===0)) return { counts, corte, historico };
  for(let s=0; s<seats; s++){
    let bestIdx=-1, bestAvg=-1;
    for(let i=0;i<parties.length;i++){
      const avg = votes[i] / (counts[i]+1);
      if(avg > bestAvg){ bestAvg = avg; bestIdx = i; }
    }
    if(bestIdx>=0){ counts[bestIdx]++; corte = bestAvg; historico.push(bestIdx); }
  }
  return { counts, corte, historico };
}




// (Listener do #autoBalanceToggle removido em 18/08/2026 junto com o
// Simulador individual: o elemento saiu do index.html e o getElementById
// nulo derrubava a avaliação do resto DESTE arquivo — inclusive
// CORES_PARTIDO_FIXAS/desenharHemiciclo, usados pela Prospecção. DOM
// nunca deveria ter morado em calculo/ — regra do CLAUDE.md.)

const COR_VAGO = '#2a3a35';
const SIGLA_CURTA = { "Podemos":"PODE", "União Brasil":"UB", "Republicanos":"REP", "Cidadania":"CID", "Solidariedade":"SD" };


// Paleta ideológica do plenário da Prospecção Coletiva (P-03) — independente
// (paleta própria da Prospecção, independente do Simulador antigo). Partidos de base à esquerda saem da família vermelha, os demais da
// família azul; um punhado de partidos tem cor fixa pedida explicitamente.
// Função pura (sem cache/estado): a cor de cada partido vem de um hash do
// próprio nome, sempre a mesma em qualquer render.
const CORES_PARTIDO_FIXAS = {
  "PL": "#1f6b45",     // verde escuro
  "PSD": "#8ecbe8",    // azul claro
  "PT": "#c0392b",     // vermelho
  "NOVO": "#e0812f",   // laranja
  "MISSÃO": "#e8c94a", // amarelo
  "PP": "#3a6ea5",     // azul médio
  "MDB": "#7a2740",    // bordô
  "PSDB": "#d4af1f",   // amarelo
};
const PARTIDOS_ESQUERDA = new Set(["PT","PSOL","PCdoB","PDT","PSB","Rede","PV","PSTU","PCO"]);
const PALETA_ESQUERDA = ['#c0524a','#a8453d','#b23a5c','#9c3d52','#d4645a','#7a3040','#c96b6b','#8f3b46'];
const PALETA_DIREITA = ['#3f6f9e','#5b8fc9','#2f5f8a','#6a9bd1','#345b7d','#4a77a8','#7fa8c9','#264a6b','#5178a3','#2c4f70'];

function hashTexto(texto){
  let h = 0;
  for(let i=0;i<texto.length;i++){ h = (h*31 + texto.charCodeAt(i)) >>> 0; }
  return h;
}

function corPartidoIdeologico(nome){
  if(CORES_PARTIDO_FIXAS[nome]) return CORES_PARTIDO_FIXAS[nome];
  const paleta = PARTIDOS_ESQUERDA.has(nome) ? PALETA_ESQUERDA : PALETA_DIREITA;
  return paleta[hashTexto(nome) % paleta.length];
}

function siglaCurta(nome){
  if(SIGLA_CURTA[nome]) return SIGLA_CURTA[nome];
  const limpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z]/g,'');
  return limpo.length <= 5 ? limpo.toUpperCase() : limpo.slice(0,4).toUpperCase();
}

function splitProporcional(total, pesos){
  const somaPesos = pesos.reduce((a,b)=>a+b,0);
  const partes = pesos.map(w => Math.round(total * w/somaPesos));
  const diff = total - partes.reduce((a,b)=>a+b,0);
  partes[partes.length-1] += diff;
  return partes;
}

// Desenha um hemiciclo de "totalVagas" cadeiras a partir de uma lista [{nome, seats}].
// coresMono (opcional): { preenchido, vago, borda, texto, porPartido } — quando
// informado, troca a cor do texto/borda pra funcionar tanto no tema escuro do
// Simulador quanto no tema claro/glass da Prospecção Coletiva. Sem esse
// parâmetro, usa a paleta ideológica (corPartidoIdeologico).
// coresMono.porPartido (opcional, dentro de coresMono): em vez de uma borda
// única pra todo mundo, cada assento preenchido usa a cor ideológica do seu
// próprio partido (corPartidoIdeologico) — assentos vagos ficam com contorno
// tracejado branco, sem preenchimento.
function desenharHemiciclo(listaPartidos, totalVagas, coresMono){
  const ordenado = listaPartidos.filter(o=>o.seats>0).sort((a,b)=>b.seats-a.seats);
  let seatList = [];
  ordenado.forEach(o => { for(let i=0;i<o.seats;i++) seatList.push(o.nome); });
  while(seatList.length < totalVagas) seatList.push(null);
  seatList = seatList.slice(0, totalVagas);

  const RAIO_BASE = 11.5;
  let circles = '';

  function desenharAssento(x, y, raioCirculo, partido) {
    const porPartido = coresMono && coresMono.porPartido;
    let cor, corBorda, tracejado;
    if (porPartido) {
      cor = partido ? (coresMono.preenchido || 'rgba(255,255,255,.04)') : 'none';
      corBorda = partido ? corPartidoIdeologico(partido) : '#ffffff';
      tracejado = !partido;
    } else {
      cor = coresMono ? (partido ? coresMono.preenchido : coresMono.vago) : (partido ? corPartidoIdeologico(partido) : COR_VAGO);
      corBorda = coresMono ? coresMono.borda : 'var(--bg)';
      tracejado = false;
    }
    const corTexto = coresMono ? coresMono.texto : '#0d1410';
    const titulo = partido || 'vaga em aberto';
    const label = partido ? siglaCurta(partido) : '';
    const fontSize = (label.length > 3 ? 6.2 : 7.4) * (raioCirculo / RAIO_BASE);
    return `<g>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${raioCirculo.toFixed(1)}" fill="${cor}" stroke="${corBorda}" stroke-width="0.75"${tracejado ? ' stroke-dasharray="2.2,2"' : ''}><title>${titulo}</title></circle>
      <text x="${x.toFixed(1)}" y="${(y+2).toFixed(1)}" text-anchor="middle" font-size="${fontSize.toFixed(1)}" font-family="var(--sans)" font-weight="700" fill="${corTexto}" style="pointer-events:none;">${label}</text>
    </g>`;
  }

  // Grade waffle (1 quadrado = 1 cadeira) — sem sigla dentro da célula (não
  // cabe legível numa grade densa; a legenda embaixo já identifica cada
  // partido). Mesma paleta/lógica de cor do hemiciclo (porPartido ou não).
  function desenharAssentoQuadrado(x, y, lado, partido) {
    const porPartido = coresMono && coresMono.porPartido;
    let cor, corBorda, tracejado, opacidadePreenchimento;
    if (porPartido) {
      cor = partido ? corPartidoIdeologico(partido) : 'none';
      corBorda = partido ? 'none' : '#ffffff';
      tracejado = !partido;
      // Preenchimento sólido com a cor ideológica cheia fica "gritando"
      // numa grade densa de quadrados (área grande de cor, diferente do
      // hemiciclo, onde a mesma cor é só o contorno fino) — suaviza com
      // menos opacidade.
      opacidadePreenchimento = 0.8;
    } else {
      cor = coresMono ? (partido ? coresMono.preenchido : coresMono.vago) : (partido ? corPartidoIdeologico(partido) : COR_VAGO);
      corBorda = coresMono ? coresMono.borda : 'var(--bg)';
      tracejado = false;
      opacidadePreenchimento = 1;
    }
    const corTexto = coresMono ? coresMono.texto : '#0d1410';
    const titulo = partido || 'vaga em aberto';
    const label = partido ? siglaCurta(partido) : '';
    const fontSize = Math.min(lado * 0.32, label.length > 3 ? 5.6 : 6.6);
    return `<g>
      <rect x="${(x - lado / 2).toFixed(1)}" y="${(y - lado / 2).toFixed(1)}" width="${lado.toFixed(1)}" height="${lado.toFixed(1)}" rx="${(lado * 0.2).toFixed(1)}" fill="${cor}" fill-opacity="${opacidadePreenchimento}" stroke="${corBorda}" stroke-width="0.75"${tracejado ? ' stroke-dasharray="2.2,2"' : ''}><title>${titulo}</title></rect>
      ${label && fontSize >= 3 ? `<text x="${x.toFixed(1)}" y="${(y + fontSize * 0.35).toFixed(1)}" text-anchor="middle" font-size="${fontSize.toFixed(1)}" font-family="var(--sans)" font-weight="700" fill="${corTexto}" style="pointer-events:none;">${label}</text>` : ''}
    </g>`;
  }

  if (totalVagas > 40 || (coresMono && coresMono.forcarGrade)) {
    // Plenários com mais de 40 cadeiras (ex.: SP, MG, RJ) não cabem bem no
    // arco de hemiciclo pensado pra 40 — e fora de Santa Catarina o formato
    // vira grade waffle por decisão de produto (não só por causa do número
    // de cadeiras, ver coresMono.forcarGrade) — em vez de espremer mais
    // fileiras no mesmo raio, agrupa os assentos numa grade retangular
    // (linhas x colunas) de quadrados, que aproveita melhor o espaço
    // retangular do layout e se adapta a qualquer quantidade de vagas.
    const x0 = 16, x1 = 384, y0 = 22, y1 = 210;
    const larguraUtil = x1 - x0, alturaUtil = y1 - y0;
    const proporcao = larguraUtil / alturaUtil;
    const colunas = Math.max(1, Math.ceil(Math.sqrt(totalVagas * proporcao)));
    const linhasGrade = Math.ceil(totalVagas / colunas);
    const celulaW = larguraUtil / colunas, celulaH = alturaUtil / linhasGrade;
    // Com poucas vagas (grade com poucas colunas/linhas) a célula disponível
    // fica enorme e o quadrado cresce desproporcional — trava num tamanho
    // máximo (mesma referência de escala do hemiciclo, RAIO_BASE) e deixa
    // sobrar espaço vazio ao redor em vez de inflar o quadrado.
    const lado = Math.min(Math.min(celulaW, celulaH) * 0.78, RAIO_BASE * 3);

    let seatIdx = 0;
    for (let li = 0; li < linhasGrade; li++) {
      const restantes = totalVagas - seatIdx;
      const nessaLinha = Math.min(colunas, restantes);
      const offsetX = (colunas - nessaLinha) * celulaW / 2; // centraliza a última linha incompleta
      for (let i = 0; i < nessaLinha; i++) {
        const x = x0 + offsetX + celulaW * (i + 0.5);
        const y = y0 + celulaH * (li + 0.5);
        circles += desenharAssentoQuadrado(x, y, lado, seatList[seatIdx]);
        seatIdx++;
      }
    }
  } else if (totalVagas <= 5) {
    // Poucas vagas (ex.: Senador, 2) — o arco pensado pra 40 cadeiras
    // espalha os poucos assentos de forma estranha (círculos longe um do
    // outro, meio perdidos no espaço do card). Com tão poucas vagas fica
    // melhor uma fileira única, círculos grandes lado a lado, centralizada
    // e dimensionada pra aproveitar a largura disponível — mesma ideia da
    // grade waffle acima (deixar o espaço mandar no tamanho), só que em
    // círculo por ainda ser proporcional (não > 40), não quadrado. Achado
    // com o usuário em 06/08/2026 olhando o Plenário do Senador.
    const x0 = 30, x1 = 370, y0 = 90, y1 = 170;
    const larguraUtil = x1 - x0;
    const gap = 14;
    const raioCirculo = Math.min((larguraUtil - gap * (totalVagas - 1)) / (2 * totalVagas), RAIO_BASE * 4.2);
    const larguraTotal = totalVagas * (raioCirculo * 2) + (totalVagas - 1) * gap;
    const xInicial = (x0 + x1) / 2 - larguraTotal / 2 + raioCirculo;
    const y = (y0 + y1) / 2;
    seatList.forEach((partido, i) => {
      const x = xInicial + i * (raioCirculo * 2 + gap);
      circles += desenharAssento(x, y, raioCirculo, partido);
    });
  } else {
    const raios = [80,118,156];
    const linhas = splitProporcional(totalVagas, raios);
    const cx=200, cy=215;

    // Geometria (raios das fileiras, posições) é fixa — com bem menos vagas
    // (ex.: 16 pra Dep. Federal, 1 pro Senador), sobra espaço, então o raio
    // cresce até preencher esse espaço (sem encostar na vizinha), no MÁXIMO
    // o tamanho que a composição de 40 vagas (Plenário estadual de SC)
    // produz — referência máxima definida pelo usuário em 18/08/2026: o
    // Federal (16 vagas) usa círculos do mesmo tamanho do Estadual, com
    // espaço sobrando ao redor, em vez de inflar até 5x.
    const raioCirculo = (() => {
      let raioMaxAbsoluto = RAIO_BASE;
      // vizinha na MESMA fileira (distância angular, na própria raios[li])
      linhas.forEach((n, li) => {
        if (n <= 1) return;
        const passoRad = ((168-12)/(n-1)) * Math.PI/180;
        const corda = 2 * raios[li] * Math.sin(passoRad/2);
        raioMaxAbsoluto = Math.min(raioMaxAbsoluto, (corda/2) * 0.92);
      });
      // vizinha na fileira ADJACENTE (distância radial entre fileiras) — sem
      // isso, o raio calculado só pela fileira em si ficava grande demais e as
      // bolinhas de fileiras diferentes se sobrepunham (ex.: Dep. Federal).
      for (let li = 0; li < raios.length - 1; li++) {
        raioMaxAbsoluto = Math.min(raioMaxAbsoluto, ((raios[li+1] - raios[li]) / 2) * 0.92);
      }
      return Math.min(raioMaxAbsoluto, RAIO_BASE);
    })();

    let seatIdx = 0;
    linhas.forEach((n, li) => {
      const r = raios[li];
      for(let i=0;i<n;i++){
        const ang = n>1 ? 168 - (168-12)*(i/(n-1)) : 90;
        const rad = ang*Math.PI/180;
        const x = cx + r*Math.cos(rad);
        const y = cy - r*Math.sin(rad);
        circles += desenharAssento(x, y, raioCirculo, seatList[seatIdx]);
        seatIdx++;
      }
    });
  }

  return `<svg viewBox="0 0 400 225" style="width:100%; display:block; margin:0 auto;">${circles}</svg>`;
}

// ===== Plenário "terreno dinâmico" (protótipo v14, aprovado 30/08/2026,
// paleta 1 — aço frio/petróleo) — substitui o hemiciclo em arco (SC
// Estadual) e a grade de cápsulas (demais estados/cargos) por um único
// desenho: cada partido nasce no ponto mais baixo do relevo e cresce
// abraçando esse contorno (peça única fundida, não célula a célula),
// deformando como uma peça de Tetris quando o encaixe retangular perfeito
// não cabe. As cadeiras "sem grupo" são reservadas PRIMEIRO, coladas na
// extremidade inferior direita, pra nenhum partido fechar o buraco no meio
// do caminho e isolar uma cadeira solta. Geometria inteira em SVG só
// (nenhuma leitura de DOM) pra caber no padrão de render por string do
// resto do app — o protótipo original manipulava <div> via
// getElementById(); aqui vira um viewBox único, responsivo por natureza.
const PALETA_TERRENO = ['#233D4D', '#34E84A', '#5F7470', '#FF462E', '#889696']; // carvão, grama radioativa, petróleo escuro, terracota ardente, aço frio

function ajustarLuminosidadeTerreno(hex, fatorClaro) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * fatorClaro);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function corTerreno(indice) {
  const base = PALETA_TERRENO[indice % PALETA_TERRENO.length];
  const ciclo = Math.floor(indice / PALETA_TERRENO.length);
  return ciclo === 0 ? base : ajustarLuminosidadeTerreno(base, Math.min(0.55, ciclo * 0.28));
}

function _terrenoMelhorRetangulo(n, larguraMax, tolerancia, aspectoAlvo) {
  const exatos = [];
  for (let linhas = 1; linhas <= n; linhas++) {
    if (n % linhas !== 0) continue;
    const colunas = n / linhas;
    if (colunas > larguraMax) continue;
    const aspecto = colunas / linhas;
    if (aspecto <= tolerancia && aspecto >= 1 / tolerancia) exatos.push({ linhas, colunas, aspecto });
  }
  if (exatos.length) {
    exatos.sort((a, b) => Math.abs(Math.log(a.aspecto / aspectoAlvo)) - Math.abs(Math.log(b.aspecto / aspectoAlvo)));
    return exatos[0];
  }
  let melhor = null;
  for (let colunas = 1; colunas <= larguraMax; colunas++) {
    const linhas = Math.ceil(n / colunas);
    const aspecto = colunas / linhas;
    if (aspecto > tolerancia || aspecto < 1 / tolerancia) continue;
    const vazio = linhas * colunas - n;
    const score = vazio * 10 + Math.abs(Math.log(aspecto / aspectoAlvo));
    if (!melhor || score < melhor.score) melhor = { linhas, colunas, score };
  }
  if (!melhor) {
    const colunas = larguraMax, linhas = Math.ceil(n / colunas);
    melhor = { linhas, colunas };
  }
  return melhor;
}

function _terrenoTerritorio(linha, coluna, linhas, colunas, tam, gap) {
  const x0 = coluna * (tam + gap), y0 = linha * (tam + gap);
  return {
    esq: coluna === 0 ? x0 : x0 - gap / 2,
    dir: coluna === colunas - 1 ? x0 + tam : x0 + tam + gap / 2,
    topo: linha === 0 ? y0 : y0 - gap / 2,
    baixo: linha === linhas - 1 ? y0 + tam : y0 + tam + gap / 2,
  };
}

function _terrenoSegmentosDoGrupo(grupoDe, linhas, colunas, tam, gap, alvo) {
  const segs = [];
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      if (grupoDe(l, c) !== alvo) continue;
      const t = _terrenoTerritorio(l, c, linhas, colunas, tam, gap);
      if (grupoDe(l - 1, c) !== alvo) segs.push([[t.esq, t.topo], [t.dir, t.topo]]);
      if (grupoDe(l + 1, c) !== alvo) segs.push([[t.esq, t.baixo], [t.dir, t.baixo]]);
      if (grupoDe(l, c - 1) !== alvo) segs.push([[t.esq, t.topo], [t.esq, t.baixo]]);
      if (grupoDe(l, c + 1) !== alvo) segs.push([[t.dir, t.topo], [t.dir, t.baixo]]);
    }
  }
  return segs;
}

function _terrenoCosturarLaco(segs) {
  const chave = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const adj = new Map();
  segs.forEach(([a, b]) => {
    const ka = chave(a), kb = chave(b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push(b);
    adj.get(kb).push(a);
  });
  let atual = segs[0][0];
  let chaveAtual = chave(atual);
  const chaveInicial = chaveAtual;
  let veioDe = null;
  const laco = [atual];
  for (let i = 0; i < segs.length + 5; i++) {
    const vizinhos = adj.get(chaveAtual) || [];
    const proximo = vizinhos.find((p) => chave(p) !== veioDe) || vizinhos[0];
    if (!proximo) break;
    veioDe = chaveAtual;
    atual = proximo;
    chaveAtual = chave(atual);
    if (chaveAtual === chaveInicial) break;
    laco.push(atual);
  }
  return laco;
}

function _terrenoAreaAbsoluta(pontos) {
  let a = 0;
  for (let i = 0; i < pontos.length; i++) {
    const [x1, y1] = pontos[i], [x2, y2] = pontos[(i + 1) % pontos.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function _terrenoEncolherLaco(pontos, offset) {
  const n = pontos.length;
  const unit = ([dx, dy]) => { const len = Math.hypot(dx, dy) || 1; return [dx / len, dy / len]; };
  function tentativa(sinal) {
    return pontos.map((p, i) => {
      const prev = pontos[(i - 1 + n) % n], next = pontos[(i + 1) % n];
      const dIn = unit([p[0] - prev[0], p[1] - prev[1]]);
      const dOut = unit([next[0] - p[0], next[1] - p[1]]);
      const nIn = sinal > 0 ? [dIn[1], -dIn[0]] : [-dIn[1], dIn[0]];
      const nOut = sinal > 0 ? [dOut[1], -dOut[0]] : [-dOut[1], dOut[0]];
      return [p[0] + (nIn[0] + nOut[0]) * offset, p[1] + (nIn[1] + nOut[1]) * offset];
    });
  }
  const cand1 = tentativa(1), cand2 = tentativa(-1);
  return _terrenoAreaAbsoluta(cand1) < _terrenoAreaAbsoluta(cand2) ? cand1 : cand2;
}

function _terrenoSimplificarLaco(pontos) {
  const n = pontos.length;
  return pontos.filter((p, i) => {
    const prev = pontos[(i - 1 + n) % n], next = pontos[(i + 1) % n];
    const v1 = [p[0] - prev[0], p[1] - prev[1]];
    const v2 = [next[0] - p[0], next[1] - p[1]];
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    return Math.abs(cross) > 0.01;
  });
}

function _terrenoPoligonoArredondado(pontos, raio) {
  const n = pontos.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pontos[i], [x2, y2] = pontos[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const sinalGeral = Math.sign(area) || 1;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = pontos[(i - 1 + n) % n], curr = pontos[i], next = pontos[(i + 1) % n];
    const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
    const v2 = [next[0] - curr[0], next[1] - curr[1]];
    const len1 = Math.hypot(...v1), len2 = Math.hypot(...v2);
    const r = Math.min(raio, len1 / 2, len2 / 2);
    const p1 = [curr[0] - (v1[0] / len1) * r, curr[1] - (v1[1] / len1) * r];
    const p2 = [curr[0] + (v2[0] / len2) * r, curr[1] + (v2[1] / len2) * r];
    const cross = v1[0] * v2[1] - v1[1] * v2[0];
    const convexo = Math.sign(cross) === sinalGeral;
    const sweep = convexo ? 1 : 0;
    d += (i === 0 ? `M ${p1[0]} ${p1[1]} ` : `L ${p1[0]} ${p1[1]} `);
    d += `A ${r} ${r} 0 0 ${sweep} ${p2[0]} ${p2[1]} `;
  }
  return d + "Z";
}

function _terrenoBlocoFundido(grupoDe, linhas, colunas, tam, gap, taxaArredondamento, alvo) {
  const segs = _terrenoSegmentosDoGrupo(grupoDe, linhas, colunas, tam, gap, alvo);
  if (!segs.length) return null;
  const bruto = _terrenoSimplificarLaco(_terrenoCosturarLaco(segs));
  const encolhido = _terrenoSimplificarLaco(_terrenoEncolherLaco(bruto, gap / 2));
  return _terrenoPoligonoArredondado(encolhido, tam * taxaArredondamento);
}

function _terrenoCantoDoGrupo(grupoDe, linhas, colunas, tam, gap, alvo) {
  let colMin = Infinity, linMin = Infinity, existe = false;
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      if (grupoDe(l, c) !== alvo) continue;
      existe = true;
      if (l < linMin || (l === linMin && c < colMin)) { linMin = l; colMin = c; }
    }
  }
  if (!existe) return null;
  let larguraColunas = 0;
  for (let c = colMin; c < colunas && grupoDe(linMin, c) === alvo; c++) larguraColunas++;
  return { x: colMin * (tam + gap), y: linMin * (tam + gap), larguraPx: larguraColunas * (tam + gap) - gap, alturaPx: tam };
}

// Empacota o terreno: reserva "sem grupo" + sobra vazia primeiro, colado no
// canto inferior direito; depois cada partido tenta um retângulo perfeito
// e, se não couber em lugar nenhum, deforma (tipo Tetris) pro vão que sobrou.
function _terrenoEmpacotar(composicao, larguraTotal, alturaMax, n, aspectoAlvo) {
  const somaPartidos = composicao.reduce((s, p) => s + p.valor, 0);
  const semGrupo = n - somaPartidos;
  const vazio = larguraTotal * alturaMax - somaPartidos - semGrupo;
  const reservaPorColuna = new Array(larguraTotal).fill(0);
  const ordemReserva = [];
  {
    let restante = semGrupo + vazio, col = larguraTotal - 1, contados = 0;
    while (restante > 0) {
      const rotulo = contados < vazio ? "vazio" : "sem-grupo";
      ordemReserva.push({ coluna: col, rotulo });
      reservaPorColuna[col]++;
      contados++;
      restante--;
      col--;
      if (col < 0) col = larguraTotal - 1;
    }
  }
  const tetoPorColuna = reservaPorColuna.map((r) => alturaMax - r);
  const skyline = new Array(larguraTotal).fill(0);
  const grade = [];
  const garantirLinha = (l) => { while (grade.length <= l) grade.push(new Array(larguraTotal).fill(null)); };

  function tentarRetangulo(nome, valor) {
    const formatos = [];
    for (let rows = 1; rows <= valor; rows++) {
      if (valor % rows !== 0) continue;
      const cols = valor / rows;
      if (cols > larguraTotal || rows > alturaMax) continue;
      formatos.push({ rows, cols, score: Math.abs(Math.log((cols / rows) / aspectoAlvo)) });
    }
    formatos.sort((a, b) => a.score - b.score);
    for (const f of formatos) {
      let melhorX = -1, melhorY = Infinity;
      for (let x = 0; x <= larguraTotal - f.cols; x++) {
        let plano = true, y = skyline[x];
        for (let i = x; i < x + f.cols; i++) {
          if (skyline[i] !== y || y + f.rows > tetoPorColuna[i]) { plano = false; break; }
        }
        if (plano && y < melhorY) { melhorY = y; melhorX = x; }
      }
      if (melhorX >= 0) {
        for (let i = melhorX; i < melhorX + f.cols; i++) {
          for (let k = 0; k < f.rows; k++) { garantirLinha(melhorY + k); grade[melhorY + k][i] = nome; }
          skyline[i] = melhorY + f.rows;
        }
        return true;
      }
    }
    return false;
  }

  function colocarDeformado(nome, valor) {
    let x0 = 0, minH = skyline[0];
    for (let x = 1; x < larguraTotal; x++) if (skyline[x] < minH) { minH = skyline[x]; x0 = x; }
    let esq = x0, dir = x0;
    const larguraAlvo = Math.min(larguraTotal, Math.max(1, Math.ceil(Math.sqrt(valor * 1.4))));
    const capacidade = () => { let cap = 0; for (let i = esq; i <= dir; i++) cap += Math.max(0, tetoPorColuna[i] - skyline[i]); return cap; };
    while ((dir - esq + 1) < larguraAlvo || capacidade() < valor) {
      const podeEsq = esq > 0, podeDir = dir < larguraTotal - 1;
      if (!podeEsq && !podeDir) break;
      const alturaEsq = podeEsq ? skyline[esq - 1] : Infinity;
      const alturaDir = podeDir ? skyline[dir + 1] : Infinity;
      if (alturaEsq <= alturaDir) esq--; else dir++;
    }
    let absorveu = true;
    while (absorveu) {
      absorveu = false;
      if (esq > 0 && skyline[esq - 1] < skyline[esq]) { esq--; absorveu = true; }
      if (dir < larguraTotal - 1 && skyline[dir + 1] < skyline[dir]) { dir++; absorveu = true; }
    }
    let restante = valor, guarda = 0;
    while (restante > 0 && guarda++ < larguraTotal * alturaMax + 5) {
      let x = -1, minY = Infinity;
      for (let i = esq; i <= dir; i++) if (skyline[i] < tetoPorColuna[i] && skyline[i] < minY) { minY = skyline[i]; x = i; }
      if (x === -1) {
        const podeEsq = esq > 0, podeDir = dir < larguraTotal - 1;
        if (podeEsq && (!podeDir || skyline[esq - 1] <= skyline[dir + 1])) esq--;
        else if (podeDir) dir++;
        else break;
        continue;
      }
      const y = skyline[x];
      garantirLinha(y);
      grade[y][x] = nome;
      skyline[x]++;
      restante--;
    }
  }

  function colocarBloco(nome, valor) { if (!tentarRetangulo(nome, valor)) colocarDeformado(nome, valor); }
  [...composicao].sort((a, b) => b.valor - a.valor).forEach((p) => colocarBloco(p.nome, p.valor));

  const contadorPorColuna = new Array(larguraTotal).fill(0);
  ordemReserva.forEach(({ coluna, rotulo }) => {
    const l = alturaMax - 1 - contadorPorColuna[coluna];
    contadorPorColuna[coluna]++;
    garantirLinha(l);
    grade[l][coluna] = rotulo === "vazio" ? "vazio-real" : "sem-grupo";
  });

  const alturaTotal = Math.min(grade.length || 1, alturaMax);
  function grupoDe(l, c) {
    if (l < 0 || c < 0 || c >= larguraTotal || l >= alturaTotal) return "fora";
    const v = grade[l][c];
    return (!v || v === "vazio-real") ? "fora" : v;
  }
  return { grupoDe, larguraTotal, alturaTotal };
}

// Ponto de entrada: mesma assinatura de uso que o hemiciclo/case antigos —
// composicao = [{nome, seats}], totalVagas = tamanho real do plenário.
// Devolve um <svg> único com o quadrado da cadeira em TAMANHO FIXO
// (TAM_UNIDADE em px reais, igual pra 40 ou 94 vagas — padrão pedido pelo
// usuário 30/08/2026, mesma referência da antiga case de cápsulas). Só
// encolhe (max-width:100%) se a grade não couber na tela — não estica.
function renderPlenarioTerreno(composicao, totalVagas) {
  const comp = composicao.filter((o) => o.seats > 0).map((o) => ({ nome: o.nome, valor: o.seats }));
  const n = totalVagas;
  if (!n || !comp.length) return "";
  const GAP = 3, TAXA_ARREDONDAMENTO = 0.12, ASPECTO_ALVO = 1.5, TOLERANCIA = 3.2, TAM_UNIDADE = 26;

  const gGeral = _terrenoMelhorRetangulo(n, Math.ceil(Math.sqrt(n) * TOLERANCIA) + 2, TOLERANCIA, ASPECTO_ALVO);
  const { grupoDe, larguraTotal, alturaTotal } = _terrenoEmpacotar(comp, gGeral.colunas, gGeral.linhas, n, ASPECTO_ALVO);

  const larguraGrade = larguraTotal * (TAM_UNIDADE + GAP) - GAP;
  const alturaGrade = alturaTotal * (TAM_UNIDADE + GAP) - GAP;

  let svg = "";
  for (let l = 0; l < alturaTotal; l++) {
    for (let c = 0; c < larguraTotal; c++) {
      if (grupoDe(l, c) !== "sem-grupo") continue;
      const x = c * (TAM_UNIDADE + GAP), y = l * (TAM_UNIDADE + GAP);
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${TAM_UNIDADE}" height="${TAM_UNIDADE}" rx="${(TAM_UNIDADE * TAXA_ARREDONDAMENTO).toFixed(1)}" fill="#2C3239"><title>Sem grupo</title></rect>`;
    }
  }

  const ordenados = [...comp].sort((a, b) => b.valor - a.valor);
  ordenados.forEach((p, idx) => {
    const cor = corTerreno(idx);
    const d = _terrenoBlocoFundido(grupoDe, alturaTotal, larguraTotal, TAM_UNIDADE, GAP, TAXA_ARREDONDAMENTO, p.nome);
    if (!d) return;
    svg += `<path d="${d}" fill="${cor}"><title>${p.nome} — ${p.valor} (${(p.valor / n * 100).toFixed(1).replace(".", ",")}%)</title></path>`;

    const canto = _terrenoCantoDoGrupo(grupoDe, alturaTotal, larguraTotal, TAM_UNIDADE, GAP, p.nome);
    if (canto) {
      const rotulo = `${siglaCurta(p.nome)} (${p.valor})`;
      const pad = 5;
      const fonte = Math.max(8, Math.min(11, (canto.larguraPx - pad * 2) / (rotulo.length * 0.56)));
      const coube = (canto.larguraPx - pad * 2) >= rotulo.length * fonte * 0.56 && canto.alturaPx > fonte + pad * 2;
      if (coube) {
        const nCor = parseInt(cor.slice(1), 16);
        const lum = 0.299 * ((nCor >> 16) & 255) + 0.587 * ((nCor >> 8) & 255) + 0.114 * (nCor & 255);
        const corTexto = lum > 150 ? "#0A1410" : "#F2F4F5";
        svg += `<text x="${(canto.x + pad).toFixed(1)}" y="${(canto.y + pad).toFixed(1)}" dominant-baseline="hanging" font-size="${fonte.toFixed(1)}" font-weight="600" font-family="var(--sans)" fill="${corTexto}">${rotulo}</text>`;
      }
    }
  });

  // Tamanho FIXO (pedido do usuário, 30/08/2026): 1 unidade do viewBox =
  // 1px real, sempre — o quadrado da cadeira não estica nem encolhe com o
  // card, é o mesmo padrão pra 40 ou 94 vagas. max-width:100% é só uma
  // rede de segurança pra telas menores que a grade inteira (evita
  // estouro horizontal), não uma escala normal.
  return `<svg width="${larguraGrade.toFixed(1)}" height="${alturaGrade.toFixed(1)}" viewBox="0 0 ${larguraGrade.toFixed(1)} ${alturaGrade.toFixed(1)}" style="max-width:100%; height:auto; display:block; margin:0 auto;">${svg}</svg>`;
}


// ===== Fórmula Matriz de Distribuição (FMD) — PROJETO.md §8.2 =====
// Regra única do "tapete curto": distribuir votos entre unidades (candidatos
// no Senador; partidos nos proporcionais, na etapa 2) respeitando um teto
// individual por unidade e um teto coletivo do cargo. Funções puras — quem
// chama decide o que é unidade e de onde vêm os tetos.

// Trava de edição individual (arrasto/box de um único item): o valor pedido
// é limitado ao teto individual E ao espaço que sobra no teto coletivo
// considerando os OUTROS itens como estão.
function fmdTravaIndividual(pedido, tetoIndividual, tetoColetivo, somaOutros) {
  // Voto é inteiro por natureza — sem o round, o teto coletivo (que vem da
  // projeção E, decimal) vazava fração pro valor final.
  return Math.round(Math.max(0, Math.min(pedido, Math.min(tetoIndividual, tetoColetivo - somaOutros))));
}

// Escala proporcional com saturação (alça mestra): dado o vetor `base`
// (fotografado no INÍCIO do gesto — nunca iterar sobre valores já
// escalados, o arredondamento acumulado distorce as proporções) e um
// `alvo` de soma total, encontra o fator f tal que
//   Σ min(tetoIndividual, base_i · f) = alvo
// A função é monótona em f, então busca binária resolve com precisão.
// Consequências garantidas (decisão do usuário em 17/08/2026, opção (b)):
// base_i = 0 permanece 0; quem satura estaciona no teto individual; os
// não-saturados mantêm a proporção EXATA da base entre si.
function fmdEscalarProporcional(base, alvo, tetoIndividual) {
  const somaBase = base.reduce((s, v) => s + v, 0);
  if (somaBase <= 0) return base.slice();
  const somaComFator = (f) => base.reduce((s, v) => s + Math.min(tetoIndividual, v * f), 0);
  // alvo máximo alcançável: todos os itens positivos no teto individual
  const positivos = base.filter((v) => v > 0).length;
  const alvoMax = positivos * tetoIndividual;
  const alvoReal = Math.max(0, Math.min(alvo, alvoMax));
  let lo = 0, hi = 1;
  while (somaComFator(hi) < alvoReal && hi < 1e9) hi *= 2;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (somaComFator(mid) < alvoReal) lo = mid; else hi = mid;
  }
  return base.map((v) => Math.round(Math.min(tetoIndividual, v * hi)));
}
