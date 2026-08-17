// Renderizacao (tabelas, hemiciclo, modal) e eventos de tela

function chevron(open){
  return `<svg width="11" height="11" viewBox="0 0 16 16" style="vertical-align:middle; transform:rotate(${open?90:0}deg); transition:transform .15s;">
    <path d="M5 3 L11 8 L5 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function infoTip(html, alinhamento){
  const classeExtra = alinhamento === "right" ? " tip-box-right" : "";
  return `<span class="info-tip">i<span class="tip-box${classeExtra}">${html}</span></span>`;
}

function warnTip(html){
  return `<span class="info-tip warn">!<span class="tip-box">${html}</span></span>`;
}

// Legenda por toque mantido — o CSS (.info-tip:hover .tip-box) já mostra a
// legenda com mouse; em celular não existe hover de verdade, então esse
// listener único (delegado no document, funciona pra QUALQUER .info-tip
// da página, presente ou futuro, sem precisar religar nada a cada render)
// mostra a legenda depois de ~420ms de dedo pressionado sobre o "i"/"!", e
// esconde ao soltar. Um toque RÁPIDO nunca ativa isso — sai limpo antes do
// tempo, sem mexer em nada. Pedido do usuário em 17/08/2026: o "i" ficava
// DENTRO do próprio botão de ação em vários lugares e qualquer toque
// corria o risco de ser lido como "abrir a dica" em vez de "clicar",
// porque o navegador simula :hover no primeiro toque de um elemento com
// essa regra CSS. Continua valendo pra todo .info-tip "solto" do app
// (Quociente, Soma de Votos, nominata 2022 etc.) — a barra de ações da
// Seleção especificamente foi além disso e não usa mais .info-tip
// nenhum: virou um painel de ícones sem "i" embutido + um "i" único e
// compartilhado no fim da linha (ver renderPainelComandos em
// prospeccao.js), então nem depende deste toque-mantido pra funcionar.
(function(){
  const DEMORA_MS = 420;
  let timer = null;
  let alvoAtual = null;
  function limpar(){
    if (timer) { clearTimeout(timer); timer = null; }
    if (alvoAtual) { alvoAtual.classList.remove("pc-legenda-toque"); alvoAtual = null; }
  }
  document.addEventListener("touchstart", (e) => {
    const tip = e.target.closest(".info-tip");
    limpar();
    if (!tip) return;
    timer = setTimeout(() => { tip.classList.add("pc-legenda-toque"); alvoAtual = tip; timer = null; }, DEMORA_MS);
  }, { passive: true });
  document.addEventListener("touchend", limpar);
  document.addEventListener("touchmove", limpar);
  document.addEventListener("touchcancel", limpar);
})();

// selo "eleito 2022" (fato fixo, vem de dados/base-2022.js) + aviso de voto invalidado, se houver
function selosCandidato2022(c){
  let html = '';
  if(c.eleito2022) html += `<span class="badge-eleito2022">🏛️ eleito 2022</span>`;
  if(c.invalidado2022) html += warnTip(`<b>Voto invalidado em 2022</b><br><br>${c.motivoInvalidacao || 'Candidatura sub júdice — votação não contou no resultado final.'}`);
  return html;
}

function render(){
  // ordena os candidatos de cada partido por votos 2026 (decrescente) — reflete a ordem
  // de votação nominal (art. 108), usada tanto na projeção da bancada quanto no drill-down
  state.parties.forEach(p => p.candidatos.sort((a,b) => (Number(b.votos)||0) - (Number(a.votos)||0)));

  const seatsProj = dhondt(state.parties, state.totalVagas);
  const qe = quocienteEleitoral(state.totalVotos, state.totalVagas);

  renderBancada(seatsProj);

  document.getElementById("totalVagasEl").textContent = state.totalVagas;
  document.getElementById("totalVagasInput").value = state.totalVagas;
  document.getElementById("totalVotosInput").value = state.totalVotos ?? "";
  document.getElementById("eleitorado2026Input").value = state.eleitorado2026 ?? "";
  document.getElementById("autoBalanceToggle").checked = state.autoBalance;
  document.getElementById("vincularEleitoradoToggle").checked = state.vincularEleitorado;
  document.getElementById("totalVotosInput").disabled = state.vincularEleitorado;
  const taxaAtual = REF_2022.validos / REF_2022.eleitorado;
  document.getElementById("taxaInfo").textContent = state.vincularEleitorado
    ? `travado: eleitorado × ${(taxaAtual*100).toFixed(1)}% (taxa de válidos de 2022)`
    : "edição manual — desvinculado do eleitorado";

  const taxaValidos2022 = REF_2022.validos / REF_2022.eleitorado;
  document.getElementById("refBox").innerHTML =
    `<b>Referência oficial (TRE-SC) — Dep. Estadual 2022</b><br>
     Eleitorado: <b>${REF_2022.eleitorado.toLocaleString('pt-BR')}</b> ·
     Comparecimento: <b>${REF_2022.comparecimento.toLocaleString('pt-BR')}</b> ·
     Válidos: <b>${REF_2022.validos.toLocaleString('pt-BR')}</b><br>
     <span style="color:var(--ink-dim)">Eleitorado 2026 (TSE, 20/07/2026): <b>${ELEITORADO_2026.toLocaleString('pt-BR')}</b>
     · taxa de válidos 2022: ${(taxaValidos2022*100).toFixed(1)}%</span>`;

  if(qe){
    document.getElementById("qeBox").innerHTML =
      `Quociente eleitoral (QE)${infoTip(`<b>Fórmula (Código Eleitoral, art. 106):</b><br>
        QE = votos válidos ÷ vagas.<br><br>
        <b>Cálculo atual:</b><br>
        ${state.totalVotos.toLocaleString('pt-BR')} ÷ ${state.totalVagas} = ${(state.totalVotos/state.totalVagas).toLocaleString('pt-BR',{maximumFractionDigits:2})}<br><br>
        <b>Regra de arredondamento:</b> fração ≤ 0,5 despreza (arredonda para baixo);
        fração > 0,5 soma 1 (arredonda para cima).<br><br>
        Um partido só recebe vaga por Quociente Partidário (QP) se seus votos alcançarem
        este valor pelo menos 1 vez.`)}: <span class="qe-hero"><b>${qe.toLocaleString('pt-BR')}</b></span> votos/vaga
       &nbsp;·&nbsp; votos válidos: <b>${state.totalVotos.toLocaleString('pt-BR')}</b>
       &nbsp;·&nbsp; vagas: <b>${state.totalVagas}</b>`;
  } else {
    document.getElementById("qeBox").textContent = "Preencha os votos válidos totais para calcular o quociente eleitoral.";
  }

  // barra de alocação (soma dos partidos vs total travado)
  const somaPartidos = state.parties.reduce((s,p)=>s+partyVotos(p),0);
  const saldoBox = document.getElementById("saldoBox");
  if(state.totalVotos){
    const saldo = state.totalVotos - somaPartidos;
    const saldoPct = (saldo/state.totalVotos*100);
    const saldoColor = saldo === 0 ? 'var(--ink-dim)' : saldo > 0 ? 'var(--accent-2)' : 'var(--danger)';
    saldoBox.innerHTML =
      `Saldo de votos disponível${infoTip(`<b>O que é:</b> votos válidos totais menos a soma de
        votos já alocados a todos os partidos/candidatos no simulador.<br><br>
        <b>Cálculo atual:</b><br>
        ${state.totalVotos.toLocaleString('pt-BR')} − ${somaPartidos.toLocaleString('pt-BR')} = ${saldo.toLocaleString('pt-BR')}<br><br>
        Positivo = ainda há votos do universo total não distribuídos entre os partidos cadastrados
        (ex.: partidos menores não incluídos no simulador).<br>
        Negativo = você alocou mais votos do que o total válido definido — reduza algum partido/candidato
        ou desligue "auto-balancear" para editar livremente.`)}: <span class="qe-hero" style="color:${saldoColor}"><b>${saldo.toLocaleString('pt-BR')}</b></span>
       (${saldoPct.toFixed(1)}% do total) &nbsp;·&nbsp; alocado: <b>${somaPartidos.toLocaleString('pt-BR')}</b> / ${state.totalVotos.toLocaleString('pt-BR')}`;
  } else {
    saldoBox.textContent = "Defina os votos válidos totais para ver o saldo disponível.";
  }

  const barWrap = document.getElementById("balanceBar");
  const msg = document.getElementById("balanceMsg");
  if(state.totalVotos){
    const pct = Math.min(100, (somaPartidos/state.totalVotos)*100);
    barWrap.innerHTML = `<div class="seg" style="width:${pct}%; background:var(--accent-2)"></div><div class="seg" style="width:${100-pct}%; background:var(--panel-2)"></div>`;
    const diff = state.totalVotos - somaPartidos;
    msg.textContent = diff===0 ? "Alocação 100% do total travado." : `${diff>0?'Faltam alocar':'Excedente'}: ${Math.abs(diff).toLocaleString('pt-BR')} votos.`;
  } else {
    barWrap.innerHTML = "";
    msg.textContent = "";
  }

  const tbody = document.getElementById("partyRows");
  tbody.innerHTML = "";
  state.parties.forEach((p, idx) => {
    const votos = partyVotos(p);
    const proj = seatsProj[idx] || 0;
    const vagasQE = qe ? Math.floor(votos/qe) : 0;
    const delta = proj - p.vagas2022;
    const deltaClass = delta > 0 ? "delta-pos" : delta < 0 ? "delta-neg" : "delta-zero";
    const deltaTxt = delta > 0 ? `+${delta}` : `${delta}`;
    const pct2022 = state.totalVagas ? (p.vagas2022 / state.totalVagas * 100) : 0;
    const pct2026 = state.totalVagas ? (proj / state.totalVagas * 100) : 0;
    const isExpanded = !!state.expanded[p.nome];
    const locked = p.candidatos.length > 0;

    const tr = document.createElement("tr");
    tr.className = "party-row";
    tr.innerHTML = `
      <td><button class="expand-btn" data-toggle="${p.nome}">${chevron(isExpanded)}</button></td>
      <td><input class="cell party-name" data-field="nome" data-idx="${idx}" value="${p.nome}"></td>
      <td class="num"><input class="cell" data-field="vagas2022" data-idx="${idx}" value="${p.vagas2022}"></td>
      <td class="num" style="color:var(--ink-dim)">${pct2022.toFixed(1)}%</td>
      <td class="num">
        <input class="cell" data-field="votos" data-idx="${idx}" value="${votos}" ${locked?'disabled':''}>
        ${locked ? '<span class="locked-badge">via candidatos</span>' : ''}
      </td>
      <td class="num" style="color:var(--ink-dim)">${vagasQE}</td>
      <td class="num" style="font-weight:700">${proj}</td>
      <td class="num" style="color:var(--ink-dim)">${pct2026.toFixed(1)}%</td>
      <td class="num ${deltaClass}">${deltaTxt}</td>
      <td class="row-actions"><button class="icon-btn" data-remove="${idx}">×</button></td>
    `;
    tbody.appendChild(tr);

    if(isExpanded){
      const trPanel = document.createElement("tr");
      const tdPanel = document.createElement("td");
      tdPanel.colSpan = 10;
      tdPanel.innerHTML = renderCandidatePanel(p, idx, votos, vagasQE, proj);
      trPanel.appendChild(tdPanel);
      tbody.appendChild(trPanel);
    }
  });

  attachRowListeners();
  renderParametro();
}

function renderCandidatePanel(party, idx, votos, vagasQE, proj){
  // reordena por votos 2026 (decrescente) — reflete a ordem de votação nominal (art. 108)
  party.candidatos.sort((a,b) => (Number(b.votos)||0) - (Number(a.votos)||0));

  const rows = party.candidatos.map((c, ci) => {
    const posicao = ci + 1;
    const eleito = posicao <= proj;
    return `
    <tr>
      <td class="num" style="color:${eleito?'var(--accent-2)':'var(--ink-dim)'}; font-weight:700;">${posicao}º</td>
      <td>
        <input class="cell party-name" data-cand-field="nome" data-p="${idx}" data-c="${ci}" value="${c.nome}">
        ${c.fonte ? `<span style="font-size:9px; color:${c.fonte==='legenda'?'var(--accent)':c.fonte==='aleatório'?'var(--accent-2)':'var(--ink-dim)'}; font-family:var(--mono);">${c.fonte==='oficial'?'✓ TSE 2022':c.fonte==='legenda'?'legenda partidária':c.fonte==='aleatório'?'🎲 gerado':'manual'}</span>` : ''}
        ${selosCandidato2022(c)}
      </td>
      <td><input class="cell party-name" data-cand-field="municipio" data-p="${idx}" data-c="${ci}" value="${c.municipio||''}" placeholder="município"></td>
      <td class="num"><input class="cell" data-cand-field="votos2022" data-p="${idx}" data-c="${ci}" value="${c.votos2022||0}"></td>
      <td style="text-align:center">
        <label class="switch">
          <input type="checkbox" data-cand-field="recandidato" data-p="${idx}" data-c="${ci}" ${c.recandidato?'checked':''}>
          <span class="slider"></span>
        </label>
      </td>
      <td class="num"><input class="cell" data-cand-field="votos" data-p="${idx}" data-c="${ci}" value="${c.votos}"></td>
      <td style="font-size:10px; color:${eleito?'var(--accent-2)':'var(--ink-dim)'}; text-align:center; font-family:var(--mono);">${eleito?'eleito 26':'suplente 26'}</td>
      <td class="row-actions"><button class="icon-btn" data-cand-remove="${idx}:${ci}">×</button></td>
    </tr>
  `;
  }).join("");

  // resumo por município (subgrupo)
  const porMunicipio = {};
  party.candidatos.forEach(c => {
    const key = c.municipio && c.municipio.trim() ? c.municipio.trim() : "Sem município definido";
    if(!porMunicipio[key]) porMunicipio[key] = { votos2022:0, votos2026:0, n:0 };
    porMunicipio[key].votos2022 += Number(c.votos2022)||0;
    porMunicipio[key].votos2026 += Number(c.votos)||0;
    porMunicipio[key].n += 1;
  });
  const municipios = Object.keys(porMunicipio).sort();
  const resumoRows = municipios.map(m => {
    const d = porMunicipio[m];
    const delta = d.votos2026 - d.votos2022;
    const deltaClass = delta>0?'delta-pos':delta<0?'delta-neg':'delta-zero';
    return `<tr>
      <td>${m}</td>
      <td class="num" style="color:var(--ink-dim)">${d.n}</td>
      <td class="num" style="color:var(--ink-dim)">${d.votos2022.toLocaleString('pt-BR')}</td>
      <td class="num">${d.votos2026.toLocaleString('pt-BR')}</td>
      <td class="num ${deltaClass}">${delta>0?'+':''}${delta.toLocaleString('pt-BR')}</td>
    </tr>`;
  }).join("");

  return `
    <div class="cand-panel">
      <div class="cand-meta">
        <span>Total candidatos: <b>${votos.toLocaleString('pt-BR')}</b> votos ·
        QP: <b>${vagasQE}</b> · Vagas projetadas: <b>${proj}</b></span>
        <span style="display:flex; gap:8px;">
          <button class="add-cand-top" data-addcand="${idx}">＋ candidato</button>
          <button class="auto-dist" data-restore="${idx}">↺ restaurar votos 2022</button>
          <button class="auto-dist" data-autodist="${idx}">distribuir igualmente</button>
        </span>
      </div>
      <table>
        <thead><tr>
          <th style="width:5%">#</th>
          <th style="width:23%">Candidato</th>
          <th style="width:17%">Município (base eleitoral)</th>
          <th class="num" style="width:13%">Votos 2022 (ref.)</th>
          <th style="width:10%; text-align:center">Recandidato?</th>
          <th class="num" style="width:15%">Votos 2026</th>
          <th style="width:9%; text-align:center">Situação 2026
            <span class="info-tip">i<span class="tip-box">Candidatos são ordenados por votos 2026 (maior para menor) —
              a mesma lógica da votação nominal (art. 108). Quem está entre as posições 1 e
              "Vagas projetadas" do partido aparece como <b>eleito</b>; os demais, <b>suplente</b>.<br><br>
              Isso é sempre a <b>projeção do cenário atual</b> — muda conforme você edita os votos.
              É diferente do selo "🏛️ eleito 2022", que é o resultado real e fixo de 2022
              (não muda com a simulação).</span></span>
          </th>
          <th style="width:6%"></th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="color:var(--ink-dim)">nenhum candidato ainda</td></tr>'}</tbody>
      </table>

      ${municipios.length ? `
      <div style="margin-top:14px; padding-top:10px; border-top:1px dashed var(--line);">
        <button class="auto-dist" data-togglemuni="${idx}">${chevron(!!state.expandedMunicipios[party.nome])} 📍 votação por município</button>
        ${state.expandedMunicipios[party.nome] ? `
        <table style="margin-top:10px;">
          <thead><tr>
            <th>Município</th><th class="num">Cand.</th><th class="num">Votos 2022</th><th class="num">Votos 2026</th><th class="num">Δ</th>
          </tr></thead>
          <tbody>${resumoRows}</tbody>
        </table>` : ''}
      </div>` : ''}
    </div>
  `;
}

function attachRowListeners(){
  const tbody = document.getElementById("partyRows");

  tbody.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener("click", e => {
      const nome = e.target.dataset.toggle;
      state.expanded[nome] = !state.expanded[nome];
      render();
    });
  });

  tbody.querySelectorAll('input[data-field]').forEach(inp => {
    inp.addEventListener("input", e => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      if(field === "nome"){
        state.parties[idx].nome = e.target.value;
        return;
      }
      if(field === "vagas2022"){
        state.parties[idx].vagas2022 = Number(e.target.value.replace(/\D/g,"")) || 0;
        render();
        return;
      }
      if(field === "votos"){
        const val = Number(e.target.value.replace(/\D/g,"")) || 0;
        setPartyVotes(idx, val);
        render();
      }
    });
  });

  tbody.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener("click", e => {
      state.parties.splice(Number(e.target.dataset.remove),1);
      render();
    });
  });

  tbody.querySelectorAll('[data-addcand]').forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(e.target.dataset.addcand);
      openCandidateModal(state.parties[idx].nome);
    });
  });

  tbody.querySelectorAll('[data-togglemuni]').forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(e.target.dataset.togglemuni);
      const nome = state.parties[idx].nome;
      state.expandedMunicipios[nome] = !state.expandedMunicipios[nome];
      render();
    });
  });

  tbody.querySelectorAll('[data-restore]').forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(e.target.dataset.restore);
      const p = state.parties[idx];
      p.candidatos.forEach(c => { c.votos = c.votos2022 || 0; });
      render();
      setStatus(`Votos de ${p.nome} restaurados para 2022.`);
    });
  });

  tbody.querySelectorAll('[data-autodist]').forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = Number(e.target.dataset.autodist);
      const p = state.parties[idx];
      const total = partyVotos(p) || state.parties[idx].votosManual || 0;
      if(!p.candidatos.length) return;
      const share = Math.round(total/p.candidatos.length);
      p.candidatos.forEach(c => c.votos = share);
      const diff = total - p.candidatos.reduce((s,c)=>s+c.votos,0);
      p.candidatos[0].votos += diff;
      render();
    });
  });

  tbody.querySelectorAll('input[data-cand-field]').forEach(inp => {
    const eventName = inp.type === "checkbox" ? "change" : "input";
    inp.addEventListener(eventName, e => {
      const p = Number(e.target.dataset.p);
      const c = Number(e.target.dataset.c);
      const field = e.target.dataset.candField;
      const cand = state.parties[p].candidatos[c];
      if(field === "nome" || field === "municipio"){
        cand[field] = e.target.value;
        return;
      }
      if(field === "recandidato"){
        cand.recandidato = e.target.checked;
        return;
      }
      if(field === "votos2022"){
        cand.votos2022 = Number(e.target.value.replace(/\D/g,"")) || 0;
        return; // rerenderiza (e reordena) so ao sair do campo, ver listener de blur abaixo
      }
      if(field === "votos"){
        const val = Number(e.target.value.replace(/\D/g,"")) || 0;
        applyCandidateVoteChange(p, c, val);
        // rerenderiza (e reordena por votos) so ao sair do campo, ver listener de blur abaixo
      }
    });
  });

  // reordena/rerenderiza só quando o usuário sai do campo, para não perder o foco a cada tecla
  tbody.querySelectorAll('input[data-cand-field="votos"], input[data-cand-field="votos2022"]').forEach(inp => {
    inp.addEventListener("blur", () => render());
    inp.addEventListener("keydown", e => { if(e.key === "Enter") e.target.blur(); });
  });

  tbody.querySelectorAll('[data-cand-remove]').forEach(btn => {
    btn.addEventListener("click", e => {
      const [p,c] = e.target.dataset.candRemove.split(":").map(Number);
      state.parties[p].candidatos.splice(c,1);
      render();
    });
  });
}

document.getElementById("addPartyBtn").addEventListener("click", () => {
  state.parties.push({ nome:"Novo partido", vagas2022:0, votosManual:0, candidatos:[] });
  render();
});

function openCandidateModal(partidoPreSelecionado){
  const sel = document.getElementById("modalPartido");
  sel.innerHTML = state.parties.map(p => `<option value="${p.nome}">${p.nome}</option>`).join("");
  if(partidoPreSelecionado) sel.value = partidoPreSelecionado;

  const dl = document.getElementById("municipiosList");
  if(!dl.childElementCount){
    dl.innerHTML = MUNICIPIOS_SC.map(m => `<option value="${m}">`).join("");
  }

  document.getElementById("modalNome").value = "";
  document.getElementById("modalMunicipio").value = "";
  document.getElementById("modalVotos").value = "";
  document.getElementById("candModalOverlay").classList.add("open");
  document.getElementById("modalNome").focus();
}

function closeCandidateModal(){
  document.getElementById("candModalOverlay").classList.remove("open");
}

document.getElementById("addRandomCandBtn").addEventListener("click", () => openCandidateModal());

document.getElementById("modalCancelBtn").addEventListener("click", closeCandidateModal);
document.getElementById("candModalOverlay").addEventListener("click", e => {
  if(e.target.id === "candModalOverlay") closeCandidateModal();
});

document.getElementById("modalRandomBtn").addEventListener("click", () => {
  const { nome, municipio } = gerarCandidatoAleatorio();
  document.getElementById("modalNome").value = nome;
  document.getElementById("modalMunicipio").value = municipio;
  const sel = document.getElementById("modalPartido");
  sel.selectedIndex = Math.floor(Math.random()*sel.options.length);
});

document.getElementById("modalConfirmBtn").addEventListener("click", () => {
  const nome = document.getElementById("modalNome").value.trim();
  const partidoNome = document.getElementById("modalPartido").value;
  const municipio = document.getElementById("modalMunicipio").value.trim();
  const votos = Number(document.getElementById("modalVotos").value.replace(/\D/g,"")) || 0;

  if(!nome){ document.getElementById("modalNome").focus(); return; }
  const partyIdx = state.parties.findIndex(p => p.nome === partidoNome);
  if(partyIdx === -1) return;

  const party = state.parties[partyIdx];
  party.candidatos.push({ id: candSeq++, nome, municipio, votos2022:0, fonte:"manual", recandidato:true, votos:0 });
  applyCandidateVoteChange(partyIdx, party.candidatos.length-1, votos);
  state.expanded[party.nome] = true;
  closeCandidateModal();
  render();
  setStatus(`Candidato "${nome}" (${party.nome}${municipio?', '+municipio:''}) adicionado.`);
});

function rescaleTotalVotos(novoTotal){
  if(novoTotal && state.totalVotos && state.autoBalance){
    const current = state.parties.map(p => partyVotos(p));
    const oldTotal = current.reduce((a,b)=>a+b,0) || 1;
    state.parties.forEach((p,i) => {
      const novoValor = Math.round(current[i] * (novoTotal/oldTotal));
      if(p.candidatos.length) scaleCandidates(p, novoValor); else p.votosManual = novoValor;
    });
  }
  state.totalVotos = novoTotal;
}

document.getElementById("vincularEleitoradoToggle").addEventListener("change", e => {
  state.vincularEleitorado = e.target.checked;
  if(state.vincularEleitorado){
    const taxa = REF_2022.validos / REF_2022.eleitorado;
    rescaleTotalVotos(Math.round((state.eleitorado2026||ELEITORADO_2026) * taxa));
  }
  render();
});

document.getElementById("eleitorado2026Input").addEventListener("input", e => {
  const v = e.target.value.replace(/\D/g,"");
  state.eleitorado2026 = v ? Number(v) : null;
  if(state.vincularEleitorado && state.eleitorado2026){
    const taxa = REF_2022.validos / REF_2022.eleitorado;
    rescaleTotalVotos(Math.round(state.eleitorado2026 * taxa));
  }
  render();
});

document.getElementById("totalVotosInput").addEventListener("input", e => {
  if(state.vincularEleitorado) return; // travado enquanto vinculado ao eleitorado
  const v = e.target.value.replace(/\D/g,"");
  const novoTotal = v ? Number(v) : null;
  rescaleTotalVotos(novoTotal);
  render();
});

document.getElementById("totalVagasInput").addEventListener("input", e => {
  const v = Number(e.target.value.replace(/\D/g,"")) || 40;
  state.totalVagas = v;
  render();
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  state = { totalVotos: Math.round(ELEITORADO_2026 * (REF_2022.validos/REF_2022.eleitorado)), totalVagas: 40, eleitorado2026: ELEITORADO_2026, autoBalance:true, vincularEleitorado:true, parties: cloneBase(), expanded:{}, expandedMunicipios:{} };
  render();
  setStatus("Base 2022 restaurada.");
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  try{
    await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
    setStatus("Cenário salvo — " + new Date().toLocaleString('pt-BR'));
  }catch(err){
    setStatus("Erro ao salvar. Tente novamente.");
  }
});

function setStatus(msg){
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  setTimeout(()=>{ if(el.textContent===msg) el.textContent=""; }, 4000);
}

const PALETA_PARTIDOS = ['#c9a13b','#4f8f6d','#c0524a','#5a7fb8','#a367b3','#d68a3c','#4fa8a8','#b3567e','#8ea63c','#6c6ce0','#e0b83c','#3c8ee0','#e05c8e','#7cc47c'];
function renderHemiciclo(seatsProj){
  const totalVagas = state.totalVagas || 40;

  const lista2026 = state.parties.map((p,i)=>({ nome:p.nome, seats: seatsProj[i]||0 }));
  const lista2022 = BASE_2022.map(p=>({ nome:p.nome, seats: p.vagas2022 }));

  // mapa de vagas por nome para calcular o saldo (partido novo em 2026 conta como 0 em 2022)
  const vagas2022PorNome = {}; lista2022.forEach(o => vagas2022PorNome[o.nome] = o.seats);
  const vagas2026PorNome = {}; lista2026.forEach(o => vagas2026PorNome[o.nome] = o.seats);

  const nomesUniao = [...new Set([...lista2022.map(o=>o.nome), ...lista2026.map(o=>o.nome)])];
  const saldos = nomesUniao
    .map(nome => ({
      nome,
      v22: vagas2022PorNome[nome] || 0,
      v26: vagas2026PorNome[nome] || 0,
      novo: vagas2022PorNome[nome] === undefined
    }))
    .filter(o => o.v22>0 || o.v26>0)
    .sort((a,b) => b.v26 - a.v26);

  // legenda 2022: so partido + vagas (fixo, sem delta — nao ha "antes" pra comparar)
  const legenda2022Html = lista2022.filter(o=>o.seats>0).sort((a,b)=>b.seats-a.seats).map(o => `
    <span style="display:inline-flex; align-items:center; gap:5px; margin-right:12px; margin-bottom:6px;">
      <span style="width:10px; height:10px; border-radius:50%; background:${corDoPartido(o.nome)}; display:inline-block;"></span>
      <span style="font-size:11.5px; color:var(--ink);"><b>${o.nome}</b>: ${o.seats}</span>
    </span>`).join('');

  // legenda 2026: partido + vagas + resultado (ganhou/perdeu/manteve vs 2022)
  const legenda2026Html = saldos.map(o => {
    const delta = o.v26 - o.v22;
    const deltaClass = delta>0 ? 'delta-pos' : delta<0 ? 'delta-neg' : 'delta-zero';
    const deltaTxt = delta>0 ? `ganhou ${delta}` : delta<0 ? `perdeu ${Math.abs(delta)}` : 'manteve';
    return `
    <span style="display:inline-flex; align-items:center; gap:5px; margin-right:12px; margin-bottom:6px;">
      <span style="width:10px; height:10px; border-radius:50%; background:${corDoPartido(o.nome)}; display:inline-block;"></span>
      <span style="font-size:11.5px; color:var(--ink);"><b>${o.nome}</b>${o.novo?' <span style="color:var(--accent); font-size:9px;">novo</span>':''}: ${o.v26} <span class="${deltaClass}">(${deltaTxt})</span></span>
    </span>`;
  }).join('');

  return `
    <div class="hemi-compare">
      <div>
        <div style="text-align:center; font-family:var(--mono); font-size:11px; color:var(--ink-dim); text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px;">2022 (real, fixo)</div>
        ${desenharHemiciclo(lista2022, 40)}
        <div style="text-align:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">${legenda2022Html}</div>
      </div>
      <div>
        <div style="text-align:center; font-family:var(--mono); font-size:11px; color:var(--accent); text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px;">2026 (projeção)</div>
        ${desenharHemiciclo(lista2026, totalVagas)}
        <div style="text-align:center; margin-top:10px; padding-top:10px; border-top:1px solid var(--line);">${legenda2026Html}</div>
      </div>
    </div>
  `;
}

function renderBancada(seatsProj){
  // 2022: fato fixo — vem direto de dados/base-2022.js (eleito2022), nunca muda com a simulacao
  const eleitos2022 = [];
  BASE_2022.forEach(p => {
    p.candidatos.forEach(c => {
      if(c.eleito2022) eleitos2022.push({ partido:p.nome, nome:c.nome, municipio:c.municipio||'', votos:c.votos });
    });
  });
  eleitos2022.sort((a,b) => b.votos - a.votos);

  // 2026: projecao dinamica do cenario atual (metodo das médias sobre os votos em edicao)
  const eleitos2026 = [];
  state.parties.forEach((p, idx) => {
    const proj = seatsProj[idx] || 0;
    p.candidatos.slice(0, proj).forEach((c, pos) => {
      eleitos2026.push({ partido:p.nome, posicao:pos+1, nome:c.nome, municipio:c.municipio||'', votos:Number(c.votos)||0, fonte:c.fonte });
    });
  });
  eleitos2026.sort((a,b) => b.votos - a.votos);

  const totalVagasProj = seatsProj.reduce((a,b)=>a+b,0);

  const rows2022 = eleitos2022.map((e,i) => `
    <tr>
      <td class="num" style="color:var(--accent-2); font-weight:700;">${i+1}º</td>
      <td style="font-weight:600">${e.nome}</td>
      <td style="color:var(--ink-dim); font-size:11.5px;">${e.partido}</td>
      <td style="color:var(--ink-dim); font-size:11.5px;">${e.municipio}</td>
      <td class="num" style="font-family:var(--mono)">${e.votos.toLocaleString('pt-BR')}</td>
    </tr>`).join('');

  const rows2026 = eleitos2026.map((e,i) => `
    <tr>
      <td class="num" style="color:var(--accent); font-weight:700;">${i+1}º</td>
      <td style="font-weight:600">${e.nome}</td>
      <td style="color:var(--ink-dim); font-size:11.5px;">${e.partido}</td>
      <td style="color:var(--ink-dim); font-size:11.5px;">${e.municipio}</td>
      <td class="num" style="font-family:var(--mono)">${e.votos.toLocaleString('pt-BR')}</td>
    </tr>`).join('');

  const listaAberta = !!state.bancadaListaAberta;

  document.getElementById("bancadaCard").innerHTML = `
    <h2>🏟️ Plenário — 2022 x 2026 ${infoTip(`À esquerda, a composição real de 2022 (fixa). À direita, a
      projeção 2026: QP de cada partido mais as sobras distribuídas pelo método das médias (art. 109).
      Cadeiras cinzas = vagas ainda sem candidato cadastrado. Total projetado: ${totalVagasProj} de ${state.totalVagas} vagas.
      As legendas abaixo de cada hemiciclo mostram as vagas por partido.`)}</h2>

    ${renderHemiciclo(seatsProj)}

    <div style="text-align:center; margin-top:12px;">
      <button class="tab-btn" id="btnToggleBancadaLista">${chevron(listaAberta)} ${listaAberta ? 'ocultar' : 'ver'} lista completa dos 40 nomes</button>
    </div>

    ${listaAberta ? `
    <div class="section-divider" style="margin-top:16px;">2022 — resultado real (fixo)</div>
    <div class="param-summary" style="margin-bottom:6px;">
      Os 40 deputados que realmente tomaram posse em 2022 — não muda com a simulação.
    </div>
    <table>
      <thead><tr>
        <th style="width:6%">#</th><th style="width:32%">Candidato</th><th style="width:18%">Partido</th>
        <th style="width:24%">Município</th><th class="num" style="width:20%">Votos 2022</th>
      </tr></thead>
      <tbody>${rows2022 || '<tr><td colspan="5" style="color:var(--ink-dim)">—</td></tr>'}</tbody>
    </table>

    <div class="section-divider" style="margin-top:22px;">2026 — projeção do cenário atual (dinâmico)</div>
    <div class="param-summary" style="margin-bottom:6px;">
      ${totalVagasProj}/${state.totalVagas} vagas projetadas preenchidas com candidatos cadastrados
      ${totalVagasProj < state.totalVagas ? ' — cadastre mais candidatos nos partidos com vagas "vazias" (via candidatos) para completar a projeção.' : ''}
      Muda conforme você edita os votos.
    </div>
    <table>
      <thead><tr>
        <th style="width:6%">#</th><th style="width:32%">Candidato</th><th style="width:18%">Partido</th>
        <th style="width:24%">Município</th><th class="num" style="width:20%">Votos 2026</th>
      </tr></thead>
      <tbody>${rows2026 || '<tr><td colspan="5" style="color:var(--ink-dim)">Nenhum candidato cadastrado ainda — use "✚ Novo Candidato" no topo.</td></tr>'}</tbody>
    </table>` : ''}
  `;

  document.getElementById("btnToggleBancadaLista").addEventListener("click", () => {
    state.bancadaListaAberta = !state.bancadaListaAberta;
    renderBancada(seatsProj);
  });
}

function renderParametro(){
  const totalCandBase = BASE_2022.reduce((s,p)=>s+p.candidatos.length,0);
  const totalVotosBase = BASE_2022.reduce((s,p)=>s+p.candidatos.reduce((ss,c)=>ss+c.votos,0),0);

  const rows = BASE_2022.map(p => {
    const totalPartido = p.candidatos.reduce((s,c)=>s+c.votos,0);
    const pct = (p.vagas2022/40*100).toFixed(1);
    const reais = p.candidatos.filter(c=>c.fonte==='oficial');
    const isExpanded = !!state.expanded[p.nome];

    let candRows = '';
    if(isExpanded){
      candRows = p.candidatos.map((c,ci) => `
        <tr>
          <td class="num" style="color:${c.eleito2022?'var(--accent-2)':'var(--ink-dim)'}; font-weight:700;">${ci+1}º</td>
          <td>${c.nome} ${c.fonte==='legenda'?'<span style="font-size:9px;color:var(--accent);font-family:var(--mono);">legenda</span>':''}${selosCandidato2022(c)}</td>
          <td style="color:var(--ink-dim); font-size:11.5px;">${c.municipio||''}</td>
          <td class="num" style="font-family:var(--mono)">${c.votos.toLocaleString('pt-BR')}</td>
        </tr>`).join('');
    }

    return `
      <tr class="param-party-row">
        <td class="row-actions"><button class="expand-btn" data-toggle-param="${p.nome}">${chevron(isExpanded)}</button></td>
        <td style="font-weight:600">${p.nome}</td>
        <td class="num">${p.vagas2022}</td>
        <td class="num" style="color:var(--ink-dim)">${pct}%</td>
        <td class="num">${reais.length}</td>
        <td class="num" style="font-family:var(--mono)">${totalPartido.toLocaleString('pt-BR')}</td>
      </tr>
      ${isExpanded ? `
      <tr><td colspan="6">
        <div class="cand-panel">
          <table>
            <thead><tr><th style="width:8%">#</th><th style="width:42%">Candidato</th><th style="width:30%">Município</th><th class="num" style="width:20%">Votos 2022</th></tr></thead>
            <tbody>${candRows}</tbody>
          </table>
        </div>
      </td></tr>` : ''}`;
  }).join("");

  document.getElementById("viewParametro").innerHTML = `
    <div class="section-divider">Parâmetro — Base 2022 (fixo)</div>
    <div class="card">
      <h2>Referência oficial — Eleições 2022 (parâmetro fixo, não editável)</h2>
      <div class="qe-box">
        <b>TRE-SC — Dep. Estadual, 1º turno 2022</b><br>
        Eleitorado: <b>${REF_2022.eleitorado.toLocaleString('pt-BR')}</b> ·
        Comparecimento: <b>${REF_2022.comparecimento.toLocaleString('pt-BR')}</b> ·
        Brancos: ${REF_2022.brancos.toLocaleString('pt-BR')} ·
        Nulos: ${REF_2022.nulos.toLocaleString('pt-BR')} ·
        Válidos: <b>${REF_2022.validos.toLocaleString('pt-BR')}</b><br><br>
        <span style="color:var(--ink-dim)">Candidatos carregados (13 partidos com cadeira eleita em 2022): <b style="color:var(--ink)">${totalCandBase}</b>
        · votos somados desses candidatos + legenda: <b style="color:var(--ink)">${totalVotosBase.toLocaleString('pt-BR')}</b>
        (diferença para o total válido = votos de ~14 partidos sem cadeira, não modelados aqui)</span>
      </div>

      <table class="param-table">
        <thead>
          <tr>
            <th></th><th>Partido</th><th class="num">Vagas 22</th><th class="num">% 22</th>
            <th class="num">Candidatos</th><th class="num">Votos totais</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="param-summary">
        Clique na seta para ver todos os candidatos do partido em 2022. Abrir um partido aqui abre
        o mesmo partido no Simulador ao lado (e vice-versa) — é o mesmo estado de expansão.
        Este é o parâmetro fixo — não muda com os ajustes feitos no Simulador.<br>
        <span class="badge-eleito2022" style="margin-left:0;">🏛️ eleito 2022</span> = ocupou a cadeira de fato
        (lista oficial dos 40 eleitos, não recalculado) &nbsp;·&nbsp;
        <span class="info-tip warn" style="margin-left:0;">!</span> = candidato com voto invalidado
        pela Justiça Eleitoral (passe o mouse para o motivo).
      </div>
    </div>
  `;

  document.querySelectorAll('[data-toggle-param]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nome = btn.dataset.toggleParam;
      state.expanded[nome] = !state.expanded[nome];
      render();
    });
  });
}

document.getElementById("btnVerParametro").addEventListener("click", () => {
  const el = document.getElementById("viewParametro");
  const showing = el.style.display !== "none";
  el.style.display = showing ? "none" : "block";
  document.getElementById("btnVerParametro").innerHTML = showing
    ? `${chevron(false)} Ver parâmetro 2022 completo`
    : `${chevron(true)} Ocultar parâmetro 2022`;
  if(!showing) el.scrollIntoView({behavior:'smooth', block:'start'});
});

document.getElementById("saveBtnTop").addEventListener("click", () => document.getElementById("saveBtn").click());
document.getElementById("resetBtnTop").addEventListener("click", () => document.getElementById("resetBtn").click());

async function init(){
  try{
    const saved = await window.storage.get(STORAGE_KEY, false);
    if(saved && saved.value){
      state = JSON.parse(saved.value);
      if(state.autoBalance === undefined) state.autoBalance = true;
      if(state.vincularEleitorado === undefined) state.vincularEleitorado = true;
      if(!state.expanded) state.expanded = {};
      if(!state.expandedMunicipios) state.expandedMunicipios = {};
      if(!state.partyColors) state.partyColors = {};
      setStatus("Cenário salvo carregado.");
    } else {
      state = { totalVotos: Math.round(ELEITORADO_2026 * (REF_2022.validos/REF_2022.eleitorado)), totalVagas: 40, eleitorado2026: ELEITORADO_2026, autoBalance:true, vincularEleitorado:true, parties: cloneBase(), expanded:{}, expandedMunicipios:{} };
    }
  }catch(err){
    state = { totalVotos: Math.round(ELEITORADO_2026 * (REF_2022.validos/REF_2022.eleitorado)), totalVagas: 40, eleitorado2026: ELEITORADO_2026, autoBalance:true, vincularEleitorado:true, parties: cloneBase(), expanded:{}, expandedMunicipios:{} };
  }
  render();
  renderParametro();
}

init();
