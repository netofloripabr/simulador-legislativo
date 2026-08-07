// Estado do simulador + regras eleitorais (quociente, D'Hondt, medias, auto-balanceamento)

let state = { totalVotos: null, totalVagas: 40, eleitorado2026: ELEITORADO_2026, autoBalance:true, vincularEleitorado:true, parties: [], expanded: {}, expandedMunicipios:{} };
let candSeq = 1;
const STORAGE_KEY = "simulador-legislativo-2026-scenario-v3";

function cloneBase(){
  return BASE_2022.map(p => ({
    nome:p.nome, vagas2022:p.vagas2022,
    votosManual: 0,
    candidatos: p.candidatos.map(c => ({
      id: candSeq++, nome:c.nome, municipio:c.municipio||"", votos2022:c.votos,
      fonte:c.fonte, recandidato:true, votos:c.votos,
      eleito2022: !!c.eleito2022, invalidado2022: !!c.invalidado2022, motivoInvalidacao: c.motivoInvalidacao
    }))
  }));
}

// votos efetivos do partido: soma dos candidatos se houver, senão o manual
function partyVotos(p){
  return p.candidatos.length ? p.candidatos.reduce((s,c)=>s+(Number(c.votos)||0), 0) : (Number(p.votosManual)||0);
}

// redistribui um total fixo entre um array de valores, preservando a soma
function distributeProportional(values, idx, rawNewValue, total){
  const n = values.length;
  const newValue = Math.max(0, Math.min(rawNewValue, total));
  const result = values.slice();
  result[idx] = newValue;
  const remaining = total - newValue;
  const othersSum = values.reduce((s,v,i)=> i===idx ? s : s+v, 0);
  for(let i=0;i<n;i++){
    if(i===idx) continue;
    result[i] = othersSum > 0 ? values[i] * (remaining/othersSum) : remaining/(n-1);
  }
  const rounded = result.map(v=>Math.round(v));
  const diff = total - rounded.reduce((a,b)=>a+b,0);
  if(diff !== 0){
    // aplica a diferença de arredondamento no maior item que não seja o editado
    let bestI = -1, bestV = -1;
    rounded.forEach((v,i)=>{ if(i!==idx && v>bestV){ bestV=v; bestI=i; } });
    if(bestI>=0) rounded[bestI] += diff; else rounded[idx]+=diff;
  }
  return rounded;
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
function dhondtComCorte(parties, seats){
  const counts = parties.map(()=>0);
  const votes = parties.map(p => partyVotos(p));
  let corte = 0;
  if(votes.every(v => v===0)) return { counts, corte };
  for(let s=0; s<seats; s++){
    let bestIdx=-1, bestAvg=-1;
    for(let i=0;i<parties.length;i++){
      const avg = votes[i] / (counts[i]+1);
      if(avg > bestAvg){ bestAvg = avg; bestIdx = i; }
    }
    if(bestIdx>=0){ counts[bestIdx]++; corte = bestAvg; }
  }
  return { counts, corte };
}

function setPartyVotes(idx, newValue){
  const parties = state.parties;
  if(state.autoBalance && state.totalVotos){
    const current = parties.map(p => partyVotos(p));
    const dist = distributeProportional(current, idx, newValue, state.totalVotos);
    parties.forEach((p,i) => {
      if(i===idx){
        if(p.candidatos.length){ scaleCandidates(p, dist[i]); } else { p.votosManual = dist[i]; }
      } else {
        if(p.candidatos.length){ scaleCandidates(p, dist[i]); } else { p.votosManual = dist[i]; }
      }
    });
  } else {
    const p = parties[idx];
    if(p.candidatos.length){ scaleCandidates(p, newValue); } else { p.votosManual = Math.max(0,newValue); }
  }
}

function scaleCandidates(party, newTotal){
  const current = party.candidatos.map(c => Number(c.votos)||0);
  const oldTotal = current.reduce((a,b)=>a+b,0);
  if(oldTotal <= 0){
    // distribui igualmente
    const share = Math.round(newTotal / party.candidatos.length);
    party.candidatos.forEach((c,i) => c.votos = share);
    const diff = newTotal - party.candidatos.reduce((s,c)=>s+c.votos,0);
    if(party.candidatos.length) party.candidatos[0].votos += diff;
    return;
  }
  const scale = newTotal / oldTotal;
  let running = 0;
  party.candidatos.forEach((c,i) => {
    if(i < party.candidatos.length - 1){
      c.votos = Math.round(current[i]*scale);
      running += c.votos;
    } else {
      c.votos = newTotal - running;
    }
  });
}

function applyCandidateVoteChange(partyIdx, candIdx, newValue){
  const parties = state.parties;
  const party = parties[partyIdx];
  party.candidatos[candIdx].votos = Math.max(0, newValue);
  const newPartyTotal = partyVotos(party);

  if(state.autoBalance && state.totalVotos){
    const otherIdxs = parties.map((_,i)=>i).filter(i=>i!==partyIdx);
    const otherCurrentVotes = otherIdxs.map(i=>partyVotos(parties[i]));
    const otherCurrentSum = otherCurrentVotes.reduce((a,b)=>a+b,0);
    const desiredOthersSum = Math.max(0, state.totalVotos - newPartyTotal);
    otherIdxs.forEach((pi,k) => {
      const p = parties[pi];
      const share = otherCurrentSum > 0
        ? otherCurrentVotes[k] * (desiredOthersSum/otherCurrentSum)
        : desiredOthersSum/otherIdxs.length;
      const novoValor = Math.round(share);
      if(p.candidatos.length) scaleCandidates(p, novoValor); else p.votosManual = novoValor;
    });
  }
}

document.getElementById("autoBalanceToggle").addEventListener("change", e => {
  state.autoBalance = e.target.checked;
});

const COR_VAGO = '#2a3a35';
const SIGLA_CURTA = { "Podemos":"PODE", "União Brasil":"UB", "Republicanos":"REP", "Cidadania":"CID", "Solidariedade":"SD" };

function corDoPartido(nome){
  if(!state.partyColors) state.partyColors = {};
  if(!state.partyColors[nome]){
    const usadas = Object.values(state.partyColors);
    state.partyColors[nome] = PALETA_PARTIDOS.find(c => !usadas.includes(c)) || PALETA_PARTIDOS[usadas.length % PALETA_PARTIDOS.length];
  }
  return state.partyColors[nome];
}

// Paleta ideológica do plenário da Prospecção Coletiva (P-03) — independente
// de corDoPartido()/state acima, que é do Simulador individual e não deve
// mudar. Partidos de base à esquerda saem da família vermelha, os demais da
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
// parâmetro, mantém o comportamento colorido de sempre (corDoPartido).
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
      cor = coresMono ? (partido ? coresMono.preenchido : coresMono.vago) : (partido ? corDoPartido(partido) : COR_VAGO);
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
      cor = coresMono ? (partido ? coresMono.preenchido : coresMono.vago) : (partido ? corDoPartido(partido) : COR_VAGO);
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
    // cresce até preencher esse espaço (sem encostar na vizinha), no máximo
    // 5x o tamanho base. Com 40 vagas o próprio limite geométrico (distância
    // real entre os assentos) já trava o crescimento sozinho, sem precisar de
    // um caso especial pra esse número.
    const raioCirculo = (() => {
      let raioMaxAbsoluto = RAIO_BASE * 5;
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
      return Math.min(raioMaxAbsoluto, RAIO_BASE * 5);
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

