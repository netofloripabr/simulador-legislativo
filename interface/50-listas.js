// Minhas listas: salvas/depositadas, modal de depósito, compartilhar (cartões
// em canvas gerarImagem*), salvar (executarSalvarLista + modais de nome/
// destino/Instagram) e tela de depósito confirmado. Ordem de carga no index.html.

// (mostrarLinkCompartilhavel foi aposentada em 28/08/2026 — o link
// ?ver=<perfil_id> de rascunho ao vivo era um TERCEIRO conceito de
// compartilhamento, redundante com o cartão-desafio da cédula depositada.
// A tela de LEITURA ?ver= continua funcionando pra links antigos.)

// ---------- Minhas listas (salvas + depositadas) ----------
// Alcançada pelo atalho "Minhas listas" do Painel (pcMenuListas). Mostra as
// listas em aberto (editáveis) e as depositadas (travadas), deixa depositar
// uma lista em aberto (com aviso de irreversibilidade + opção de anonimato)
// e ver o conteúdo de uma depositada em modo leitura — nunca deixa editar
// uma lista já depositada pela mesma tela de Revisão, pra não arriscar
// mudar o conteúdo por baixo do selo "travada".
// Carrega Minhas Listas no mesmo formato não importa a fonte: conta
// logada vem do Supabase de verdade (salvamentos, trava por RLS de
// verdade); convidado continua local (window.storage), porque
// "salvamentos" exige perfil_id — sem cadastro não tem onde gravar isso
// no banco. criadoEm serve de "atualizadoEm" também pro caso logado, já
// que "salvamentos" não guarda um segundo timestamp de edição — perde um
// pouco de nuance ("editada hoje" vs "criada em X"), aceitável por ora.
async function _carregarMinhasListasNormalizado() {
  let listas;
  if (pcState.perfil) {
    const salvamentos = await carregarSalvamentosDe(pcState.perfil.id);
    listas = salvamentos.filter((s) => s.estado === pcState.estado).map((s) => ({
      id: s.id, nome: s.nome, criadoEm: s.criado_em, atualizadoEm: s.criado_em,
      depositadoEm: s.depositado_em, anonimo: !!s.anonimo, codigo: s.codigo || null,
      edicoes: s.edicoes || 0, editadaEm: s.editada_em || null,
    }));
  } else {
    listas = await carregarListasSalvasLocais(pcState.estado);
  }
  // Alimenta o passo "Depositar" do Farol de Orientação de carona — toda
  // tela que lista salvamentos já passa por aqui, então a flag se corrige
  // sozinha depois de qualquer depósito.
  pcState.farolTemDeposito = listas.some((l) => l.depositadoEm);
  return listas;
}

// Cartão-desafio "Meu palpite" (PNG de DIVULGAÇÃO, 3 cargos juntos) —
// identidade Fader 2.0, conceito convite/desafio. Protótipo aprovado pelo
// usuário em 18-19/08/2026 (artifact "Cartão-desafio — versão final",
// várias rodadas: direção C "console ao vivo", sem a palavra "aposta",
// 3 consoles na mesma proporção, etiqueta de cargo compacta): frase
// "Quem acerta mais?", console por cargo com 3 nomes (2 nítidos + 1 com
// blur de teaser; no Senador o 3º é o primeiro DE FORA, sem selo ELEITO,
// já que só 2 vagas estão em disputa em 2026), votação dentro das barras,
// CTA único verde "Agora é a sua vez" + código de convite.
// cargosCompletos (opcional) = mapa cargoId → lista completa do palpite;
// alimenta o % (fração do total de votos do cargo), o 1º de fora do
// Senador e o "+ N nomes na lista completa".

// Uma linha de candidato (chip ELEITO + nome + % à direita, barra-fader
// com votos dentro e alça de metal). Desenha em (rx,ry,rw) no ctx dado
// (pode ser um canvas offscreen, pro blur do teaser) e devolve a altura.
function _cartaoDesafioLinha(ctx, r, rx, ry, rw) {
  let xCursor = rx;
  if (r.chip) {
    ctx.font = "800 17px Inter, sans-serif";
    const wt = ctx.measureText("ELEITO").width;
    const chipW = wt + 20;
    ctx.fillStyle = "#34E84A";
    ctx.beginPath(); ctx.roundRect(rx, ry + 2, chipW, 27, 7); ctx.fill();
    ctx.fillStyle = "#07230C"; ctx.textAlign = "left";
    ctx.fillText("ELEITO", rx + 10, ry + 22);
    xCursor = rx + chipW + 14;
  }
  let pctW = 0;
  if (r.pct) {
    ctx.font = "700 20px Inter, sans-serif";
    const wPc = ctx.measureText("%").width;
    ctx.font = "800 32px Inter, sans-serif";
    const wNum = ctx.measureText(r.pct).width;
    ctx.textAlign = "right"; ctx.fillStyle = "#F2F4F5";
    ctx.fillText(r.pct, rx + rw - wPc - 3, ry + 26);
    ctx.textAlign = "left"; ctx.fillStyle = "#AEB5BB"; ctx.font = "700 20px Inter, sans-serif";
    ctx.fillText("%", rx + rw - wPc, ry + 26);
    pctW = wNum + wPc + 16;
  }
  ctx.textAlign = "left"; ctx.fillStyle = "#F2F4F5"; ctx.font = "700 28px Inter, sans-serif";
  const maxW = rx + rw - pctW - xCursor;
  let nome = r.nome;
  while (nome.length > 3 && ctx.measureText(nome === r.nome ? nome : nome + "…").width > maxW) nome = nome.slice(0, -1);
  if (nome !== r.nome) nome += "…";
  ctx.fillText(nome, xCursor, ry + 26);

  const by = ry + 42, bh = 30;
  ctx.fillStyle = "#0C0E10";
  ctx.beginPath(); ctx.roundRect(rx, by, rw, bh, 15); ctx.fill();
  ctx.strokeStyle = "#23262A"; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(rx, by, rw, bh, 15); ctx.clip();
  ctx.fillStyle = "rgba(138,144,150,.2)";
  for (let i = 1; i <= 9; i++) ctx.fillRect(rx + (rw * i) / 10, by, 1.5, bh);
  const fw = Math.max(rw * 0.14, rw * (r.frac || 0));
  const grad = ctx.createLinearGradient(rx, 0, rx + fw, 0);
  grad.addColorStop(0, "rgba(42,46,50,.85)"); grad.addColorStop(1, "rgba(60,65,70,.97)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(rx, by, fw, bh, [15, 0, 0, 15]); ctx.fill();
  const tVotos = (Number(r.votos) || 0).toLocaleString("pt-BR") + " votos";
  ctx.font = "700 17px Inter, sans-serif";
  const wV = ctx.measureText(tVotos).width;
  if (fw > wV + 30) {
    ctx.textAlign = "right"; ctx.fillStyle = "#F2F4F5";
    ctx.fillText(tVotos, rx + fw - 14, by + 21);
  }
  ctx.restore();
  if (fw <= wV + 30) {
    ctx.textAlign = "left"; ctx.fillStyle = "#8A9096"; ctx.font = "700 17px Inter, sans-serif";
    ctx.fillText(tVotos, rx + fw + 26, by + 21);
  }
  const cx = rx + fw;
  ctx.fillStyle = "rgba(10,12,14,.5)";
  ctx.beginPath(); ctx.roundRect(cx - 14, by - 11, 28, 52, 12); ctx.fill();
  const metal = ctx.createLinearGradient(0, by - 8, 0, by - 8 + 46);
  metal.addColorStop(0, "#5B6168"); metal.addColorStop(0.6, "#3A3F45"); metal.addColorStop(1, "#2A2E33");
  ctx.fillStyle = metal;
  ctx.beginPath(); ctx.roundRect(cx - 11, by - 8, 22, 46, 9); ctx.fill();
  ctx.strokeStyle = "rgba(242,244,245,.25)"; ctx.lineWidth = 1.5; ctx.stroke();
  return 72;
}

// Um console de cargo (material #2C3239/#4D545C, pílula do rótulo, N
// linhas — as com r.blur passam por um canvas offscreen com ctx.filter
// blur, mesmo truque do teaser antigo). Devolve o Y de baixo do console.
function _cartaoDesafioConsole(ctx, { rotulo, rows }, x, y, w) {
  const padIn = 28, pillH = 34, rowAlt = 72, gapRow = 26;
  const h = padIn + pillH + 16 + rows.length * rowAlt + (rows.length - 1) * gapRow + 26;
  ctx.fillStyle = "#2C3239";
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 32); ctx.fill();
  ctx.strokeStyle = "#4D545C"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = "800 20px Inter, sans-serif";
  const rot = rotulo.toUpperCase();
  const pw = ctx.measureText(rot).width + 40;
  ctx.fillStyle = "rgba(232,236,239,.35)";
  ctx.beginPath(); ctx.roundRect(x + padIn, y + padIn, pw, pillH, 10); ctx.fill();
  ctx.strokeStyle = "rgba(242,244,245,.4)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#F2F4F5"; ctx.textAlign = "left";
  ctx.fillText(rot, x + padIn + 20, y + padIn + 24);
  let ry = y + padIn + pillH + 16;
  const rx = x + padIn, rw = w - padIn * 2;
  rows.forEach((r) => {
    if (r.blur) {
      const off = document.createElement("canvas");
      off.width = rw + 44; off.height = rowAlt + 24;
      const octx = off.getContext("2d");
      octx.filter = "blur(7px)";
      _cartaoDesafioLinha(octx, r, 22, 11, rw);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(off, rx - 22, ry - 11);
      ctx.globalAlpha = 1;
    } else {
      _cartaoDesafioLinha(ctx, r, rx, ry, rw);
    }
    ry += rowAlt + gapRow;
  });
  return y + h;
}

// Cartão-imagem do CONVITE DE DUELO (arte aprovada em protótipo,
// 31/08/2026): 1080×1350 (4:5, aparece grande na conversa do WhatsApp).
// Composição: wordmark, selo Duelo 1×1, avatares [criador] VS [?] com a
// vaga do rival em círculo tracejado, nome do duelo, recorte e provocação.
// Card de VITÓRIA do duelo (arte aprovada em protótipo v6, 31/08/2026):
// vencedor grande com anel verde e faixa VENCEU, perdedor apagado, placar.
// Gerado em 4:5 (WhatsApp) e 9:16 (Stories) a partir da mesma composição.
function gerarImagemCardVitoria({ nomeVencedor, nomePerdedor, ptsV, ptsP, nomeDuelo }, H) {
  const W = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const fundo = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, H * 0.95);
  fundo.addColorStop(0, "#1B1E22"); fundo.addColorStop(0.52, "#101214"); fundo.addColorStop(1, "#0C0E10");
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);

  ctx.font = "800 44px Inter, sans-serif";
  const wSim = ctx.measureText("Simula").width, wLeg = ctx.measureText("LEGIS").width;
  const xm = W / 2 - (wSim + wLeg) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#34E84A"; ctx.fillText("Simula", xm, 120);
  ctx.fillStyle = "#F2F4F5"; ctx.fillText("LEGIS", xm + wSim, 120);
  ctx.textAlign = "center"; ctx.fillStyle = "#5C6268"; ctx.font = "800 20px Inter, sans-serif";
  ctx.fillText("S I M U L A D O R   E L E I T O R A L   L E G I S L A T I V O   2 0 2 6", W / 2, 158);

  const cy = H / 2, seloY = cy - 410;
  ctx.strokeStyle = "rgba(52,232,74,.5)"; ctx.lineWidth = 3; ctx.fillStyle = "rgba(52,232,74,.08)";
  ctx.beginPath(); ctx.roundRect(W / 2 - 215, seloY, 430, 86, 43); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 26px Inter, sans-serif";
  ctx.fillText("D U E L O   1 × 1", W / 2, seloY + 38);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 30px Inter, sans-serif";
  ctx.fillText("RESULTADO", W / 2, seloY + 72);

  const avY = cy - 110, gapAv = 250;
  ctx.save();
  ctx.shadowColor = "rgba(52,232,74,.55)"; ctx.shadowBlur = 60;
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#34E84A"; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(W / 2 - gapAv, avY, 120, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 92px Inter, sans-serif";
  ctx.fillText((nomeVencedor || "?")[0].toUpperCase(), W / 2 - gapAv, avY + 34);
  ctx.fillStyle = "#34E84A";
  ctx.beginPath(); ctx.roundRect(W / 2 - gapAv - 92, avY - 168, 184, 46, 23); ctx.fill();
  ctx.fillStyle = "#07230C"; ctx.font = "800 24px Inter, sans-serif";
  ctx.fillText("V E N C E U", W / 2 - gapAv, avY - 137);
  ctx.globalAlpha = .55;
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#4D545C"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(W / 2 + gapAv, avY, 105, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#8A9096"; ctx.font = "800 80px Inter, sans-serif";
  ctx.fillText((nomePerdedor || "?")[0].toUpperCase(), W / 2 + gapAv, avY + 28);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 60px Inter, sans-serif";
  ctx.fillText("VS", W / 2, avY + 20);
  ctx.font = "800 40px Inter, sans-serif";
  ctx.fillText(nomeVencedor, W / 2 - gapAv, avY + 188);
  ctx.fillStyle = "#8A9096"; ctx.fillText(nomePerdedor, W / 2 + gapAv, avY + 188);
  ctx.fillStyle = "#34E84A"; ctx.font = "800 64px Inter, sans-serif";
  ctx.fillText(ptsV.toLocaleString("pt-BR") + " pts", W / 2 - gapAv, avY + 266);
  ctx.fillStyle = "#8A9096"; ctx.fillText(ptsP.toLocaleString("pt-BR") + " pts", W / 2 + gapAv, avY + 266);

  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 46px Inter, sans-serif";
  ctx.fillText(nomeVencedor + " venceu o duelo", W / 2, cy + 330);
  ctx.fillText('"' + nomeDuelo + '"', W / 2, cy + 388);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 30px Inter, sans-serif";
  ctx.fillText("por " + ptsV.toLocaleString("pt-BR") + " pontos a " + ptsP.toLocaleString("pt-BR") + " \u00b7 apura\u00e7\u00e3o oficial de 2026", W / 2, cy + 444);

  ctx.fillStyle = "#5C6268"; ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText("quer medir o seu faro pol\u00edtico? monte o seu palpite", W / 2, H - 70);
  return canvas;
}

// Cartão QUADRADO (1080×1080) desde 08/09/2026: o formato 4:5 anterior
// era cortado pelo WhatsApp na própria conversa (o preview mostra um
// quadro ~1:1 e corta o topo, com a marca, e o rodapé — achado do usuário
// com print). Tudo o que importa cabe dentro do quadrado; nada fica pra
// fora do que a pessoa vê sem tocar na imagem. Nome do duelo sem aspas
// (o hub também não usa mais; aspas digitadas no nome viravam ""…"").
function gerarImagemConviteDuelo({ nomeCriador, nomeDuelo, infoRecorte }) {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const fundo = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, H * 1.05);
  fundo.addColorStop(0, "#1B1E22"); fundo.addColorStop(0.52, "#101214"); fundo.addColorStop(1, "#0C0E10");
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);

  ctx.font = "800 40px Inter, sans-serif";
  const wSim = ctx.measureText("Simula").width, wLeg = ctx.measureText("LEGIS").width;
  const xm = W / 2 - (wSim + wLeg) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#34E84A"; ctx.fillText("Simula", xm, 96);
  ctx.fillStyle = "#F2F4F5"; ctx.fillText("LEGIS", xm + wSim, 96);
  ctx.textAlign = "center"; ctx.fillStyle = "#5C6268";
  ctx.font = "800 18px Inter, sans-serif";
  ctx.fillText("S I M U L A D O R   E L E I T O R A L   L E G I S L A T I V O   2 0 2 6", W / 2, 130);

  const seloY = 182;
  ctx.strokeStyle = "rgba(52,232,74,.5)"; ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(52,232,74,.08)";
  ctx.beginPath(); ctx.roundRect(W / 2 - 160, seloY, 320, 80, 40); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 24px Inter, sans-serif";
  ctx.fillText("D U E L O", W / 2, seloY + 35);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 32px Inter, sans-serif";
  ctx.fillText("1 × 1", W / 2, seloY + 67);

  const avY = 460, avR = 100, gapAv = 240;
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#34E84A"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(W / 2 - gapAv, avY, avR, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#34E84A"; ctx.font = "800 80px Inter, sans-serif";
  ctx.fillText((nomeCriador || "?")[0].toUpperCase(), W / 2 - gapAv, avY + 29);
  ctx.fillStyle = "#101214"; ctx.strokeStyle = "#4D545C"; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.arc(W / 2 + gapAv, avY, avR, 0, 7); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#8A9096"; ctx.font = "800 88px Inter, sans-serif";
  ctx.fillText("?", W / 2 + gapAv, avY + 33);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 56px Inter, sans-serif";
  ctx.fillText("VS", W / 2, avY + 21);
  ctx.font = "800 36px Inter, sans-serif";
  ctx.fillText(nomeCriador, W / 2 - gapAv, avY + avR + 58);
  ctx.fillStyle = "#8A9096";
  ctx.fillText("Você?", W / 2 + gapAv, avY + avR + 58);

  // Título: sem aspas, e encolhe até caber na largura (nome longo não
  // pode estourar o quadrado).
  const titulo = typeof _nomeDueloLimpo === "function" ? _nomeDueloLimpo(nomeDuelo) : String(nomeDuelo || "");
  let fsTitulo = 52;
  ctx.fillStyle = "#F2F4F5"; ctx.font = `800 ${fsTitulo}px Inter, sans-serif`;
  while (ctx.measureText(titulo).width > W - 120 && fsTitulo > 30) { fsTitulo -= 2; ctx.font = `800 ${fsTitulo}px Inter, sans-serif`; }
  ctx.fillText(titulo, W / 2, 730);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 28px Inter, sans-serif";
  ctx.fillText(infoRecorte, W / 2, 776);

  ctx.fillStyle = "#34E84A"; ctx.font = "800 44px Inter, sans-serif";
  ctx.fillText("Tem coragem de encarar?", W / 2, 862);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 26px Inter, sans-serif";
  ctx.fillText("Meu palpite já está travado. Toque no link,", W / 2, 910);
  ctx.fillText("indique o seu e o duelo fica selado até a apuração.", W / 2, 946);

  ctx.fillStyle = "#5C6268"; ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText("quem chegar mais perto do resultado real vence", W / 2, H - 44);
  return canvas;
}

function gerarImagemCedulaResumo({ nomeExibido, cargosEleitos, codigo, cargosCompletos }) {
  const W = 1080, H = 1920, PAD = 60;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const fundo = ctx.createRadialGradient(W / 2, -160, 0, W / 2, -160, 1500);
  fundo.addColorStop(0, "#1B1E22"); fundo.addColorStop(0.52, "#101214"); fundo.addColorStop(1, "#0C0E10");
  ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);

  // Wordmark SimulaLEGIS (decisão 20/08/2026): "Simula" verde vivo +
  // "LEGIS" branco — mesma marca do cabeçalho do fluxo de acesso.
  ctx.font = "800 40px Inter, sans-serif";
  const wSim = ctx.measureText("Simula").width, wLeg = ctx.measureText("LEGIS").width;
  const xm = W / 2 - (wSim + wLeg) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#34E84A"; ctx.fillText("Simula", xm, 112);
  ctx.fillStyle = "#F2F4F5"; ctx.fillText("LEGIS", xm + wSim, 112);

  ctx.textAlign = "center";
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 48px Inter, sans-serif";
  ctx.fillText("Eu já cravei os meus eleitos.", W / 2, 208);
  ctx.fillStyle = "#34E84A";
  ctx.fillText("Te desafio pra um duelo 1×1.", W / 2, 268);
  ctx.fillStyle = "#8A9096"; ctx.font = "400 29px Inter, sans-serif";
  const nomeEstado = (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome || pcState.estado;
  ctx.fillText(`${nomeExibido} · ${nomeEstado} · Eleições 2026`, W / 2, 320);

  // Denominador do % = a MESMA régua única do app (DESIGN.md/PROJETO §8.2):
  // fração de T = k·E (votos válidos projetados do cargo, × votos por
  // eleitor no Senado) — nunca a soma do palpite, que faria o líder de um
  // cargo pouco preenchido mostrar 100%.
  const tetoCargo = (cid) => {
    if (cid === "senador") {
      const E = validosOficiaisProjetados() || totalValidosProjetado2026("senador");
      return E * (typeof VAGAS_SENADOR_2026 !== "undefined" ? VAGAS_SENADOR_2026 : 2);
    }
    return totalValidosProjetado2026(cid);
  };
  const fmtPct = (votos, total) => {
    if (!total) return "";
    const v = (votos / total) * 100;
    if (v >= 10) return String(Math.round(v));
    const s = v.toFixed(1).replace(".", ",");
    return s.endsWith(",0") ? s.slice(0, -2) : s;
  };

  const secoes = [];
  let eleitosExibidos = 0;
  CARGOS.forEach((cargoDef) => {
    const els = cargosEleitos[cargoDef.id] || [];
    if (!els.length) return;
    const total = tetoCargo(cargoDef.id);
    const rows = [];
    if (cargoDef.id === "senador") {
      els.slice(0, 2).forEach((c) => rows.push({ nome: c.nome, votos: c.votos, chip: true, blur: false }));
      eleitosExibidos += Math.min(2, els.length);
      const fora = cargosCompletos && cargosCompletos.senador && cargosCompletos.senador.length
        ? proximosSuplentes(1, cargosCompletos.senador)[0] : null;
      if (fora) rows.push({ nome: fora.nome, votos: fora.votos, chip: false, blur: true });
    } else {
      els.slice(0, 3).forEach((c, i) => rows.push({ nome: c.nome, votos: c.votos, chip: true, blur: i === 2 }));
      eleitosExibidos += Math.min(3, els.length);
    }
    const maxV = rows.reduce((m, r) => Math.max(m, Number(r.votos) || 0), 0) || 1;
    rows.forEach((r) => {
      r.pct = fmtPct(Number(r.votos) || 0, total);
      r.frac = ((Number(r.votos) || 0) / maxV) * 0.72;
    });
    secoes.push({ rotulo: cargoDef.label, rows });
  });

  let y = 356;
  secoes.forEach((sec) => {
    y = _cartaoDesafioConsole(ctx, sec, PAD, y, W - PAD * 2) + 24;
  });

  const totalEleitos = CARGOS.reduce((s, c) => s + ((cargosEleitos[c.id] || []).length), 0);
  const restantes = Math.max(0, totalEleitos - eleitosExibidos);
  if (restantes > 0) {
    ctx.textAlign = "center"; ctx.fillStyle = "#AEB5BB"; ctx.font = "400 22px Inter, sans-serif";
    ctx.fillText(`+ ${restantes} nomes na lista completa`, W / 2, y + 16);
  }

  const ctaH = 86, ctaY = H - 218;
  ctx.fillStyle = "#34E84A";
  ctx.beginPath(); ctx.roundRect(PAD, ctaY, W - PAD * 2, ctaH, ctaH / 2); ctx.fill();
  ctx.fillStyle = "#07230C"; ctx.font = "800 34px Inter, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("Agora é a sua vez", W / 2, ctaY + 55);

  const t1 = "entre com o código ";
  ctx.font = "400 25px Inter, sans-serif";
  const w1 = ctx.measureText(t1).width;
  ctx.font = "800 25px Inter, sans-serif";
  const w2 = ctx.measureText(codigo).width;
  const xc = W / 2 - (w1 + w2) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#8A9096"; ctx.font = "400 25px Inter, sans-serif"; ctx.fillText(t1, xc, ctaY + ctaH + 46);
  ctx.fillStyle = "#F2F4F5"; ctx.font = "800 25px Inter, sans-serif"; ctx.fillText(codigo, xc + w1, ctaY + ctaH + 46);

  ctx.textAlign = "center"; ctx.fillStyle = "#5C6268"; ctx.font = "400 21px Inter, sans-serif";
  ctx.fillText("Simulador Eleitoral · Legislativo 2026", W / 2, H - 54);

  return canvas;
}

// Painel de compartilhamento de uma cédula depositada — código + prévia da
// imagem (gerarImagemCedula) + WhatsApp/Instagram/baixar. Dados vêm de
// pcState.dadosCompartilhar, carregado de forma assíncrona pelo handler de
// "Compartilhar" (ver renderMinhasListas) antes desta função ser chamada.
function renderModalCompartilhar() {
  const d = pcState.dadosCompartilhar;
  if (!d) return "";
  const lista = d.lista;
  if (d.carregando) {
    return `
    <div id="pcModalCompartilharOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:340px; width:100%; background:rgba(29,32,35,.97); border:1px solid #2B2F33; border-radius:18px; padding:30px 20px; text-align:center;">
        <div style="color:var(--pc-ink-dim); font-size:13px; margin-bottom:16px;">Carregando…</div>
        <button class="ghost" id="pcBtnFecharCompartilhar" style="border:none; font-size:11.5px; color:var(--pc-ink-dim);">Cancelar</button>
      </div>
    </div>`;
  }
  const anonimo = lista.anonimo;
  const nomeExibido = anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || lista.nome);
  return `
    <div id="pcModalCompartilharOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:340px; width:100%; max-height:90vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("chave", 14)} CÉDULA DEPOSITADA</div>
        <h2 style="margin-bottom:4px; font-size:15px;">Compartilhar "${lista.nome}"</h2>
        <div style="font-size:12px; color:var(--pc-ink-dim); margin-bottom:16px; line-height:1.5;">Esse código é único dessa cédula — qualquer pessoa pode usá-lo pra conferir sua posição no ranking.</div>
        ${anonimo ? `<div style="font-size:11px; color:var(--pc-ink-dim); background:#101214; border:1px solid #23262A; border-radius:8px; padding:9px 11px; margin-bottom:16px; line-height:1.5; display:flex; gap:8px; align-items:flex-start;">${iconeSvg("chave", 13)}<span>Essa lista foi depositada de forma anônima — seu nome não aparece na imagem nem em nenhum link gerado aqui.</span></div>` : ""}
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#101214; border:1px solid #23262A; border-radius:10px; padding:10px 12px; margin-bottom:16px;">
          <span style="font-family:var(--mono); font-size:15px; font-weight:700; letter-spacing:.06em; color:var(--pc-ink);">${lista.codigo}</span>
          <button class="ghost" id="pcBtnCopiarCodigoCedula" style="padding:5px 10px; font-size:11px; display:flex; align-items:center; gap:4px;">${iconeSvg("copiar", 12)}COPIAR</button>
        </div>
        <div style="width:150px; aspect-ratio:9/16; margin:0 auto 16px; border-radius:14px; overflow:hidden; border:1px solid #23262A; display:flex; align-items:center; justify-content:center; background:#101214;">
          ${d.imagemUrl ? `<img src="${d.imagemUrl}" alt="Prévia da imagem compartilhável" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:11px; color:var(--pc-ink-dim);">Gerando…</span>`}
        </div>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <button class="ghost" id="pcBtnShareWhatsapp" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("send", 14)}WhatsApp</button>
          <button class="ghost" id="pcBtnShareInstagram" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("compartilhar", 14)}Instagram</button>
        </div>
        <button class="ghost" id="pcBtnBaixarImagemCedula" style="width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; padding:10px 8px;">${iconeSvg("baixar", 14)}Baixar imagem</button>
        <div id="pcCompartilharStatus" style="font-size:11px; color:var(--pc-ink-dim); text-align:center; margin-top:10px; min-height:14px;"></div>
        <div style="text-align:center; margin-top:4px;"><button class="ghost" id="pcBtnFecharCompartilhar" style="border:none; font-size:11.5px; color:var(--pc-ink-dim);">Fechar</button></div>
      </div>
    </div>`;
}

// Monta os 3 acordeões de cargo (Estadual/Federal/Senador) com a lista de
// eleitos/votos de um palpite já fechado — usado tanto em "Minhas listas"
// (ver a própria cédula) quanto na busca pública de cédula (Ranking, ver
// renderRankingPlaceholder). Extraído em 14/08/2026 pra não duplicar essa
// montagem nos dois lugares.
function montarSecoesCargosDetalhe(palpitesPorCargo) {
  return CARGOS.map((cargoDef) => {
    const listaCargo = palpitesPorCargo ? palpitesPorCargo[cargoDef.id] : null;
    if (!listaCargo || !listaCargo.length) return "";
    const unificada = listaUnificadaRevisao(listaCargo, cargoDef.id);
    const linhas = unificada.map((c) => `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 3px; border-bottom:1px solid rgba(242,244,245,.08); font-size:12.5px;">
        <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.posicaoEleicao ? `<b style="color:var(--pc-accent);">${c.posicaoEleicao}º</b> ` : ""}${c.nome} <span style="color:var(--pc-ink-dim);">· ${c.partido}</span></span>
        <span style="font-family:var(--mono); color:var(--pc-ink-dim); flex-shrink:0;">${c.votos.toLocaleString("pt-BR")}</span>
      </div>`).join("");
    return `<details class="pc-acc"><summary>${cargoDef.label}</summary><div class="pc-acc-body">${linhas}</div></details>`;
  }).join("");
}

async function renderMinhasListas() {
  pcState._farolContexto = "listas";
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando suas listas…");
  const listas = await _carregarMinhasListasNormalizado();
  // Duelos selados também são cédulas depositadas (decisão do usuário,
  // 30/08/2026): o palpite do duelo trava igual e vale na apuração —
  // então ele aparece aqui, junto das depositadas, com o código DS.
  let duelosSelados = [];
  if (pcState.perfil) {
    try {
      duelosSelados = (await listarMeusDesafios()).filter((d) => ["selado", "apuracao", "encerrado"].includes(d.status));
    } catch (e) { /* sem duelos, segue */ }
  }

  if (pcState.listaEmVisualizacao) {
    // Local já vem com os candidatos junto; logado precisa buscar o
    // salvamento completo (a lista resumida acima não traz candidatos).
    let palpitesPorCargo;
    if (pcState.perfil) {
      const completo = await carregarSalvamentoCompleto(pcState.listaEmVisualizacao);
      if (!completo) { pcState.listaEmVisualizacao = null; return renderMinhasListas(); }
      palpitesPorCargo = completo.cargos;
    } else {
      const lista = listas.find((l) => l.id === pcState.listaEmVisualizacao);
      if (!lista) { pcState.listaEmVisualizacao = null; return renderMinhasListas(); }
      palpitesPorCargo = lista.palpitesPorCargo;
    }
    const lista = listas.find((l) => l.id === pcState.listaEmVisualizacao);
    const secoes = montarSecoesCargosDetalhe(palpitesPorCargo);
    el.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px;">
        <button class="ghost" id="pcBtnVoltarMinhasListas" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Minhas listas</button>
        ${lista && lista.codigo ? `<button class="ghost" id="pcBtnCompartilharDetalheLista" style="display:flex; align-items:center; gap:6px; padding:8px 12px; font-size:12px;">${iconeSvg("compartilhar", 13)}<span class="pc-btn-label">Compartilhar</span></button>` : ""}
      </div>
      <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">${lista ? lista.nome : ""}</div>
      <div class="pc-sub" style="margin:0 0 14px 2px; display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}Depositada em ${lista ? new Date(lista.depositadoEm).toLocaleDateString("pt-BR") : ""}${lista && lista.editadaEm ? ` · <span style="color:var(--pc-warning);">editada em ${new Date(lista.editadaEm).toLocaleDateString("pt-BR")} (${lista.edicoes}ª)</span>` : ""} · travada.</div>
      ${secoes}
      ${pcState.modalCompartilharListaId ? renderModalCompartilhar() : ""}`;
    document.getElementById("pcBtnVoltarMinhasListas").addEventListener("click", () => {
      pcState.listaEmVisualizacao = null;
      renderMinhasListas();
    });
    if (lista && lista.codigo) {
      document.getElementById("pcBtnCompartilharDetalheLista").addEventListener("click", () => abrirModalCompartilharLista(lista.id, listas));
    }
    attachListenersModalCompartilhar();
    return;
  }

  const abertas = listas.filter((l) => !l.depositadoEm).sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));
  const depositadas = listas.filter((l) => l.depositadoEm).sort((a, b) => new Date(b.depositadoEm) - new Date(a.depositadoEm));
  // Economia v3 §3: 2 rascunhos (listas em aberto) grátis — depositadas
  // não contam aqui, têm limite próprio (1 grátis, ver o gate do depósito).
  const jaTemLista = listas.filter((l) => !l.depositadoEm).length >= 2;

  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): cada lista é um mini-card
  // com moldura própria em vez de linha solta dentro de um card único —
  // mesmos data-attributes de antes, listeners intactos.
  const linhaAberta = (l) => `
    <div class="pc-mini-card" data-pc-abrir-lista="${l.id}" style="flex-wrap:wrap; cursor:pointer;" title="Toque para continuar editando">
      <div class="pc-mini-card-icone">${iconeSvg("ballot", 17)}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Salva em ${new Date(l.atualizadoEm).toLocaleDateString("pt-BR")}</div>
      </div>
      <div class="pc-ml-acoes">
        <button type="button" class="pc-cmd-acao" data-pc-revisar-lista="${l.id}" title="Ver Revisão desta lista, mesmo incompleta">${iconeSvg("lista", 14)}</button>
        <button type="button" class="pc-cmd-acao" data-pc-depositar-lista="${l.id}" title="Depositar — vira sua cédula: trava e entra no ranking">${iconeSvg("ballot", 16)}</button>
        <button type="button" class="pc-cmd-acao pc-ml-excluir" data-pc-excluir-lista="${l.id}" data-pc-excluir-lista-nome="${escaparAtributoHtml(l.nome)}" title="Excluir a lista">${iconeSvg("lixeira", 14)}</button>
      </div>
    </div>`;
  const linhaDepositada = (l) => `
    <div class="pc-mini-card" style="flex-wrap:wrap; opacity:.85;">
      <div class="pc-mini-card-icone" style="background:rgba(198,230,42,.12); color:var(--pc-warning);">${iconeSvg("chave", 16)}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px;">Depositada em ${new Date(l.depositadoEm).toLocaleDateString("pt-BR")}${l.anonimo ? " · anônima" : ""}${l.codigo ? ` · <span style="font-family:var(--mono);">${l.codigo}</span>` : ""}${l.editadaEm ? ` · <span style="color:var(--pc-warning);">editada em ${new Date(l.editadaEm).toLocaleDateString("pt-BR")}</span>` : ""}</div>
      </div>
      <div class="pc-ml-acoes">
        ${l.codigo ? `<button type="button" class="pc-cmd-acao" data-pc-compartilhar-lista="${l.id}" title="Compartilhar o convite de duelo">${iconeSvg("compartilhar", 14)}</button>` : ""}
        <button type="button" class="pc-cmd-acao" data-pc-ver-lista="${l.id}" title="Ver a lista (só leitura)">${iconeSvg("buscar", 14)}</button>
      </div>
    </div>`;

  const listaModal = pcState.modalDepositarListaId ? listas.find((l) => l.id === pcState.modalDepositarListaId) : null;

  el.innerHTML = `
    <div id="pcFarolBloco"></div>
    <div style="font-size:20px; font-weight:700; margin:0 0 2px 2px;">Minhas listas</div>
    <div class="pc-sub" style="margin:4px 0 12px 2px;">Toque numa lista em aberto pra continuar editando. Depositadas ficam travadas.</div>
    <button type="button" class="pc-slotb vazio" id="pcBtnNovaLista" style="width:100%; text-align:left; margin-bottom:16px;">
      <span class="pc-slotb-anel"><svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="17" fill="none" stroke="#1E2226" stroke-width="3" stroke-dasharray="3 5"></circle></svg><span class="pc-slotb-num" style="color:var(--pc-accent);">${iconeSvg("mais", 16)}</span></span>
      <span class="pc-slotb-corpo">
        <span class="pc-slotb-nome vazia">Nova lista</span>
        <span class="pc-slotb-meta">toque pra montar sua próxima previsão</span>
      </span>
    </button>
    ${pcState.avisoEdicaoStatus ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Edição de cédula</div>
      <div class="pc-aviso-corpo">${pcState.avisoEdicaoStatus}</div>
    </div>` : ""}
    ${pcState.avisoLimiteCedulaAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Sua cédula oficial já está na urna</div>
      <div class="pc-aviso-corpo">Cada conta deposita <b>1 cédula grátis</b> — é ela que vale no ranking. Depositar uma segunda (cenário paralelo) custa <b>70 créditos</b>.<br><br>Créditos vêm de convites: cada amigo que entra e deposita a primeira cédula rende <b>10</b> (Menu → Convidar amigos).</div>
    </div>` : ""}
    ${pcState.avisoLimiteListaAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Você chegou no limite grátis</div>
      <div class="pc-aviso-corpo">Sua conta tem espaço grátis pra <b>2 listas em aberto</b> — e as duas já estão em uso. Criar mais uma custa <b>1 crédito</b>.<br><br>O jeito grátis de ganhar créditos: <b>convide um amigo</b> — quando ele criar conta e depositar a primeira cédula, você ganha <b>10 créditos</b> (Menu → Convidar amigos).</div>
    </div>` : ""}
    ${abertas.length ? `<div class="pc-lobby-menu-tit" style="display:flex; align-items:center; gap:8px;">Em aberto <button type="button" id="pcMlLegendaToggle" class="pc-ml-inf${pcState.legendaListasAberta ? " aberto" : ""}" title="O que faz cada botão">i</button></div>${pcState.legendaListasAberta ? renderLegendaComandos([
      { icone: "ballot", titulo: "Urna — depositar", legenda: "Deposita a lista: vira sua cédula pra valer — trava e entra no ranking. A primeira é grátis." },
      { icone: "lixeira", titulo: "Lixeira — excluir", legenda: "Apaga a lista em aberto pra sempre. Só existe pra listas ainda não depositadas — cédula depositada nunca pode ser excluída." },
      { icone: "buscar", titulo: "Lupa — ver", legenda: "Só olhar a lista, sem mexer (listas depositadas)." },
      { icone: "compartilhar", titulo: "Compartilhar", legenda: "Manda o convite de duelo pros amigos." },
    ]) : ""}${abertas.map(linhaAberta).join("")}` : ""}
    ${depositadas.length ? `<div class="pc-lobby-menu-tit" style="margin-top:${abertas.length ? "18px" : "0"};">Depositadas</div>${depositadas.map(linhaDepositada).join("")}` : ""}
    ${duelosSelados.length ? `<div class="pc-lobby-menu-tit" style="margin-top:18px;">Cédulas de duelo</div>${duelosSelados.map((d) => {
      const souCriador = d.criador_id === pcState.perfil.id;
      const rival = souCriador ? (d.desafiado ? d.desafiado.nome : "?") : (d.criador ? d.criador.nome : "?");
      return `
      <div class="pc-lobby-card" style="padding:12px 14px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="pc-lobby-atalho-icone" style="width:34px; height:34px; flex-shrink:0;">${iconeSvg("desafio", 16)}</span>
          <span style="flex:1; min-width:0;">
            <span style="display:block; font-size:12.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">"${_nomeDueloLimpo(d.nome)}" · vs ${rival}</span>
            <span style="display:block; font-size:10px; color:var(--pc-ink-dim);">${d.codigo || ""} · selado em ${new Date(d.respondido_em || d.criado_em).toLocaleDateString("pt-BR")} · ${d.status === "encerrado" ? "apurado" : "aguarda apuração"}</span>
          </span>
          <button type="button" class="pc-cmd-acao" data-pc-ml-duelo="${d.id}" title="Ver comparação">${iconeSvg("buscar", 14)}</button>
        </div>
      </div>`;
    }).join("")}` : ""}
    ${!listas.length && !duelosSelados.length ? estadoVazio({ icone: "lista", titulo: "Nenhuma lista ainda", texto: "Monte sua primeira previsão e ela aparece aqui.", botaoLabel: "Criar minha lista", botaoId: "pcBtnEstadoVazioNovaLista" }) : ""}
    ${listaModal ? `
    <div id="pcModalDepositarOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:center; gap:6px; color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">${iconeSvg("alerta", 14)} IMPORTANTE</div>
        <h2 style="margin-bottom:6px; font-size:15px;">Depositar "${listaModal.nome}"?</h2>
        <div style="font-size:12.5px; line-height:1.6; color:var(--pc-ink-dim);">Depois de depositada, <b style="color:var(--pc-ink);">não será mais possível alterar nem excluir essa cédula</b> — é definitivo.</div>
        ${pcState.avisoVagaNaoMarcadaResumo ? `
        <div class="pc-aviso-card" style="margin:14px 0 0;">
          <div class="pc-aviso-titulo">Lembrete</div>
          <div class="pc-aviso-corpo">Você não preencheu a lista completa.</div>
        </div>` : ""}
        ${pcState.perfil && (!pcState.perfil.cep || !pcState.perfil.genero) ? `
        <div id="pcDepPrimeiraCedula" style="margin:16px 0 4px; padding:12px 12px 2px; border:1px solid #2B2F33; border-radius:12px;">
          <div style="color:var(--pc-accent); font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:10px;">SÓ NA PRIMEIRA CÉDULA</div>
          <div class="field-row">
            <label>CEP</label>
            <input class="cell" id="pcDepCep" inputmode="numeric" placeholder="00000-000" maxlength="9" value="${escaparAtributoHtml(pcState._depCepRascunho || "")}">
          </div>
          <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Só pra saber seu município — ajuda a entender quem está usando o Simulador.</div>
          <div class="field-row">
            <label>Gênero</label>
            ${pilulasGenero("pcDepGenero", pcState._depGeneroRascunho)}
          </div>
          <div class="pc-erro" id="pcDepErro"></div>
        </div>` : ""}
        <label style="display:flex; align-items:center; gap:10px; margin:16px 0; font-size:13px; color:var(--pc-ink); cursor:pointer;">
          <span class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcCheckAnonimo"${pcState._anonimoPreAviso ? " checked" : ""}><span class="pc-switch-slider"></span></span>
          Anônimo
        </label>
        <div style="display:flex; gap:8px;">
          <button class="ghost" id="pcBtnCancelarDepositar" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarDepositar" style="flex:1;">Depositar</button>
        </div>
      </div>
    </div>` : ""}
    ${pcState.modalCompartilharListaId ? renderModalCompartilhar() : ""}
  `;

  atualizarFarol();
  document.getElementById("pcBtnNovaLista")?.addEventListener("click", async () => {
    if (jaTemLista) {
      // Convidado não tem como ter crédito de verdade (sem conta não tem
      // onde guardar isso no banco) — vai direto pro cadastro. Logado
      // consome 1 crédito de verdade via RPC (consumir_credito_proprio,
      // migração 9); sem saldo, mostra o aviso.
      if (!pcState.perfil) {
        pcState.pendenteRegistro = true;
        pcState.tela = "cadastro";
        renderColaborativo();
        return;
      }
      const { consumiu, error } = await consumirCreditoConta(pcState.perfil.id);
      if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
      if (!consumiu) {
        pcState.avisoLimiteListaAberto = true;
        renderMinhasListas();
        return;
      }
      // Limpa o aviso "compre crédito" assim que a pessoa consegue criar
      // uma lista de verdade — sem isso, o aviso de uma tentativa antiga
      // sem saldo ficava preso na tela pra sempre, mesmo depois de ela
      // conseguir crédito e criar novas listas com sucesso.
      pcState.avisoLimiteListaAberto = false;
      pcState.perfil.creditos = Math.max(0, (pcState.perfil.creditos || 0) - 1);
    }
    pcState.listaSalvaId = null;
    pcState.listaSalvaNome = null;
    pcState.palpitesPorCargo = null;
    pcState.palpiteEdicao = null;
    persistirListaAtivaLocal();
    if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
    else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
  });
  if (document.getElementById("pcBtnEstadoVazioNovaLista")) {
    document.getElementById("pcBtnEstadoVazioNovaLista").addEventListener("click", () => {
      document.getElementById("pcBtnNovaLista").click();
    });
  }
  // Carrega uma lista (aberta OU depositada já paga) no editor — corpo
  // compartilhado entre "Editar" das abertas e a edição paga das
  // depositadas (economia v3 §6).
  const abrirListaParaEdicao = async (lista) => {
      // BUG corrigido em 21/08/2026: era carregarSalvamentoCompleto(id) com
      // `id` inexistente no escopo — pra logado, o Editar falhava mudo.
      let cargosDaLista;
      if (pcState.perfil) {
        const completo = await carregarSalvamentoCompleto(lista.id);
        if (!completo) return;
        cargosDaLista = completo.cargos;
      } else {
        cargosDaLista = lista.palpitesPorCargo;
      }
      // Política de 21/08/2026: lista da era antiga (elenco de 2022
      // embutido) não abre pra edição — ver listaEhDaEraAntiga.
      if (listaEhDaEraAntiga(cargosDaLista, pcState.estado)) {
        pcState.avisoEdicaoStatus = `"${lista.nome}" foi salva numa versão antiga do elenco de candidatos e não pode mais ser editada nem depositada — os candidatos dela já não correspondem aos registrados pra 2026. Crie uma lista nova a partir do palpite atual.`;
        renderMinhasListas();
        return;
      }
      pcState.listaSalvaId = lista.id;
      pcState.listaSalvaNome = lista.nome;
      persistirListaAtivaLocal();
      pcState.palpitesPorCargo = cargosDaLista;
      // Mesma poda de grupos fantasma aplicada aos rascunhos (ver
      // podarGruposForaDoPool) — uma lista salva ANTES de uma correção de
      // dados pode carregar um grupo que não existe mais no pool oficial.
      if (pcState.palpitesPorCargo) {
        CARGOS.forEach((c) => {
          if (pcState.palpitesPorCargo[c.id]) {
            const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
            pcState.palpitesPorCargo[c.id] = podarGruposForaDoPool(pcState.palpitesPorCargo[c.id], poolOficial);
          }
        });
      }
      pcState.palpiteEdicao = pcState.palpitesPorCargo ? pcState.palpitesPorCargo[pcState.cargoAtivo] : null;
      // Continuar de onde parou (pedido do usuário, 21/08/2026): lista com
      // cargo pela metade abre direto no PALPITE, já no primeiro cargo
      // pendente — a Revisão só é destino de lista completa. Mesma régua
      // de completude do farol (vagas fechadas + votação >= 99,5%).
      const cargoPendente = CARGOS.find((c) => {
        const st = _farolStatusCargo(c.id);
        return !(st.vagasOk && st.votosOk);
      });
      if (cargoPendente) {
        pcState.cargoAtivo = cargoPendente.id;
        pcState.palpiteEdicao = pcState.palpitesPorCargo ? pcState.palpitesPorCargo[cargoPendente.id] : null;
        // SELA a chave estado::cargo da edição (CRÍTICO da revisão 22/08):
        // sem isso, garantirPalpiteEdicaoAtivo via a chave divergente e
        // SUBSTITUÍA o conteúdo da lista aberta pelo rascunho de autosave
        // (possivelmente de OUTRA lista) — e o próximo Salvar gravava esse
        // conteúdo alheio por cima da lista nomeada.
        pcState.cargoPalpiteEdicao = `${pcState.estado}::${cargoPendente.id}`;
        pcState.ordemPartidosFixa = null;
        pcState.ordemCandidatosFixa = null;
        if (pcState.perfil) { pcState.subaba = "selecao"; renderAppColaborativo(); }
        else { pcState.tela = "selecao-convidado"; renderColaborativo(); }
        return;
      }
      if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
      else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  };
  // Atalho "Revisão" dentro do card (pedido do usuário, 26/08/2026): igual
  // a abrirListaParaEdicao, mas SEM o redirecionamento pro cargo pendente —
  // vai direto pra Revisão mesmo com a lista incompleta, pra dar uma
  // conferida sem precisar terminar tudo primeiro.
  const abrirListaParaRevisao = async (lista) => {
      let cargosDaLista;
      if (pcState.perfil) {
        const completo = await carregarSalvamentoCompleto(lista.id);
        if (!completo) return;
        cargosDaLista = completo.cargos;
      } else {
        cargosDaLista = lista.palpitesPorCargo;
      }
      if (listaEhDaEraAntiga(cargosDaLista, pcState.estado)) {
        pcState.avisoEdicaoStatus = `"${lista.nome}" foi salva numa versão antiga do elenco de candidatos e não pode mais ser editada nem depositada — os candidatos dela já não correspondem aos registrados pra 2026. Crie uma lista nova a partir do palpite atual.`;
        renderMinhasListas();
        return;
      }
      pcState.listaSalvaId = lista.id;
      pcState.listaSalvaNome = lista.nome;
      persistirListaAtivaLocal();
      pcState.palpitesPorCargo = cargosDaLista;
      if (pcState.palpitesPorCargo) {
        CARGOS.forEach((c) => {
          if (pcState.palpitesPorCargo[c.id]) {
            const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
            pcState.palpitesPorCargo[c.id] = podarGruposForaDoPool(pcState.palpitesPorCargo[c.id], poolOficial);
          }
        });
      }
      pcState.palpiteEdicao = pcState.palpitesPorCargo ? pcState.palpitesPorCargo[pcState.cargoAtivo] : null;
      if (pcState.perfil) { pcState.subaba = "revisao"; renderAppColaborativo(); }
      else { pcState.tela = "revisao-convidado"; renderColaborativo(); }
  };
  document.querySelectorAll("[data-pc-revisar-lista]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const lista = listas.find((l) => l.id === btn.getAttribute("data-pc-revisar-lista"));
      if (lista) await abrirListaParaRevisao(lista);
    });
  });
  // Toque na lista inteira abre pra edição — antes era só pelo lápis
  // dedicado, que saiu (pedido do usuário, 24/08/2026: "não preciso
  // clicar no botão de editar"). O guard em .pc-ml-acoes evita que um
  // toque na urna/lixeira (dentro do mesmo card) dispare os dois.
  document.querySelectorAll("[data-pc-abrir-lista]").forEach((card) => {
    card.addEventListener("click", async (e) => {
      if (e.target.closest(".pc-ml-acoes")) return;
      const lista = listas.find((l) => l.id === card.getAttribute("data-pc-abrir-lista"));
      if (lista) await abrirListaParaEdicao(lista);
    });
  });
  document.querySelectorAll("[data-pc-excluir-lista]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-pc-excluir-lista");
      const nome = btn.getAttribute("data-pc-excluir-lista-nome") || "essa lista";
      if (!window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;
      if (pcState.perfil) {
        const { ok, error } = await excluirSalvamento(id);
        if (!ok) { pcState.erro = error && error.message ? error.message : "Não consegui excluir a lista."; renderMinhasListas(); return; }
      } else {
        await excluirListaLocal(pcState.estado, id);
      }
      // Se a lista excluída fosse a ativa no editor, solta a referência —
      // senão "Salvar" de novo revive uma lista que não existe mais.
      if (pcState.listaSalvaId === id) {
        pcState.listaSalvaId = null;
        pcState.listaSalvaNome = null;
        persistirListaAtivaLocal();
      }
      renderMinhasListas();
    });
  });
  // Edição paga de cédula depositada REMOVIDA (decisão do usuário,
  // 24/08/2026): imutabilidade é elemento de valor da cédula — o único
  // jeito de mudar de voto depois de depositar volta a ser uma cédula
  // NOVA (70 créditos, cenário paralelo), nunca reabrir a mesma. Histórico
  // de código: editarCedulaDepositada (nuvem/palpites.js) e a RPC da
  // migração 25 continuam existindo no banco, só não são mais chamadas
  // daqui — nada foi apagado no servidor, só o gatilho no app.
  const mlLegendaToggle = document.getElementById("pcMlLegendaToggle");
  if (mlLegendaToggle) {
    mlLegendaToggle.addEventListener("click", () => {
      pcState.legendaListasAberta = !pcState.legendaListasAberta;
      renderMinhasListas();
    });
  }
  document.querySelectorAll("[data-pc-depositar-lista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Depositar de verdade exige conta (é o que dá identidade — mesmo
      // anônima — pra cédula travada) — convidado vai pro cadastro antes.
      if (!pcState.perfil) {
        pcState.pendenteRegistro = true;
        pcState.tela = "cadastro";
        renderColaborativo();
        return;
      }
      pcState.modalDepositarListaId = btn.getAttribute("data-pc-depositar-lista");
      pcState.avisoVagaNaoMarcadaResumo = null;
      pcState._anonimoPreAviso = false;
      pcState.avisoVagaNaoMarcadaConfirmado = false;
      renderMinhasListas();
    });
  });
  document.querySelectorAll("[data-pc-ver-lista]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.listaEmVisualizacao = btn.getAttribute("data-pc-ver-lista");
      renderMinhasListas();
    });
  });
  document.querySelectorAll("[data-pc-ml-duelo]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioComparacaoId = btn.getAttribute("data-pc-ml-duelo");
    renderComparacaoDesafio();
  }));
  document.querySelectorAll("[data-pc-compartilhar-lista]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalCompartilharLista(btn.getAttribute("data-pc-compartilhar-lista"), listas));
  });
  if (listaModal) {
    document.getElementById("pcBtnCancelarDepositar").addEventListener("click", () => {
      pcState.modalDepositarListaId = null;
      pcState.avisoVagaNaoMarcadaResumo = null;
      pcState._anonimoPreAviso = false;
      pcState.avisoVagaNaoMarcadaConfirmado = false;
      renderMinhasListas();
    });
    attachPilulasGenero();
    document.getElementById("pcBtnConfirmarDepositar").addEventListener("click", async (e) => {
      const anonimo = document.getElementById("pcCheckAnonimo").checked;
      // Cadastro progressivo (04/09/2026): CEP/município e gênero são pedidos
      // aqui, uma vez só, no depósito da 1ª cédula (bloco "Só na primeira
      // cédula" acima). Resolve e grava ANTES de qualquer validação da lista;
      // quando o perfil já tem os dois, o bloco nem existe e isso é pulado.
      const blocoPrimeira = document.getElementById("pcDepPrimeiraCedula");
      if (blocoPrimeira && pcState.perfil) {
        const erroEl = document.getElementById("pcDepErro");
        const cep = document.getElementById("pcDepCep").value.trim();
        const genero = document.getElementById("pcDepGenero").value;
        // Preserva o que foi digitado se o modal for re-renderizado (aviso
        // de vaga não marcada etc.).
        pcState._depCepRascunho = cep;
        pcState._depGeneroRascunho = genero;
        if (!cep || !genero) { erroEl.textContent = "Preencha CEP e gênero pra depositar sua primeira cédula."; return; }
        erroEl.textContent = "";
        e.target.disabled = true;
        const cepResolvido = await buscarCep(cep);
        if (cepResolvido.error) { e.target.disabled = false; erroEl.textContent = cepResolvido.error; return; }
        const campos = { cep: cep.replace(/\D/g, ""), municipioResidencia: cepResolvido.municipio, ufResidencia: cepResolvido.uf, genero };
        const { error: erroDados } = await completarDadosPrimeiraCedula(pcState.perfil.id, campos);
        if (erroDados) { e.target.disabled = false; erroEl.textContent = "Não consegui salvar: " + erroDados.message; return; }
        pcState.perfil.cep = campos.cep;
        pcState.perfil.municipio_residencia = campos.municipioResidencia;
        pcState.perfil.uf_residencia = campos.ufResidencia;
        pcState.perfil.genero = genero;
        pcState._depCepRascunho = null;
        pcState._depGeneroRascunho = null;
        e.target.disabled = false;
      }
      // 2º clique (botão já virou "Depositar mesmo assim", o aviso abaixo
      // já está na tela) — a pessoa decidiu, não pergunta de novo.
      if (pcState.avisoVagaNaoMarcadaResumo) pcState.avisoVagaNaoMarcadaConfirmado = true;
      // Política de 21/08/2026: lista da era antiga (elenco de 2022
      // embutido) NÃO pode virar cédula — o depósito é imutável, e uma
      // cédula não pode nascer com a base errada. Valida o conteúdo real
      // antes de cobrar/depositar qualquer coisa.
      let cargosPraValidar = null;
      if (pcState.perfil) {
        const completoVal = await carregarSalvamentoCompleto(listaModal.id);
        cargosPraValidar = completoVal ? completoVal.cargos : null;
      } else {
        cargosPraValidar = listaModal.palpitesPorCargo;
      }
      if (listaEhDaEraAntiga(cargosPraValidar, pcState.estado)) {
        pcState.modalDepositarListaId = null;
        pcState.avisoEdicaoStatus = `"${listaModal.nome}" foi salva numa versão antiga do elenco de candidatos e não pode ser depositada — os candidatos dela já não correspondem aos registrados pra 2026. Monte uma lista nova a partir do palpite atual.`;
        renderMinhasListas();
        return;
      }
      // Vaga que a votação de hoje já garantiria, mas a pessoa não marcou
      // como eleito (conceito fechado 12/08/2026, retomado hoje) — não
      // bloqueia o depósito, só avisa ANTES dele virar irreversível.
      // Reaproveita listaUnificadaRevisao (mesma régua soberana-do-usuário
      // da Revisão) em vez de recalcular do zero. Só checa na 1ª tentativa
      // dessa abertura do modal — depois de "Depositar mesmo assim" o
      // 2º clique já deposita direto, sem recalcular de novo.
      if (cargosPraValidar && !pcState.avisoVagaNaoMarcadaConfirmado) {
        const resumo = [];
        CARGOS.forEach((cargoDef) => {
          const listaCargo = cargosPraValidar[cargoDef.id];
          if (!listaCargo || !listaCargo.length) return;
          const naoMarcados = listaUnificadaRevisao(listaCargo, cargoDef.id)
            .filter((c) => !c.eleito && c.consistenteComMatematicaReal);
          if (naoMarcados.length) resumo.push({ cargo: cargoDef.label, nomes: naoMarcados.map((c) => c.nome) });
        });
        if (resumo.length) {
          pcState.avisoVagaNaoMarcadaResumo = resumo;
          // Preserva a escolha "anônima" no re-render do aviso — senão o
          // checkbox voltava desmarcado no meio do fluxo.
          pcState._anonimoPreAviso = anonimo;
          renderMinhasListas();
          return;
        }
      }
      if (pcState.perfil) {
        // Economia v3 §3/§6: a 1ª cédula depositada é grátis; a partir da
        // 2ª é "nova cédula" (cenário paralelo) — 70 créditos. Cobra ANTES
        // de depositar; sem saldo, avisa e não deposita nada.
        const jaDepositou = listas.some((l) => l.depositadoEm && l.id !== listaModal.id);
        if (jaDepositou) {
          const { gastou, error: erroGasto } = await gastarCreditosConta(pcState.perfil.id, 70, "gasto_cedula", "nova cédula depositada");
          if (erroGasto) { pcState.erro = "Erro ao conferir crédito: " + erroGasto.message; }
          if (!gastou) {
            pcState.modalDepositarListaId = null;
            pcState.avisoLimiteCedulaAberto = true;
            renderMinhasListas();
            return;
          }
          pcState.avisoLimiteCedulaAberto = false;
        }
        const { error } = await depositarSalvamento(listaModal.id, anonimo);
        if (error) { pcState.erro = "Erro ao depositar: " + error.message; }
      } else {
        await depositarListaLocal(pcState.estado, listaModal.id, anonimo);
      }
      pcState.modalDepositarListaId = null;
      pcState.avisoVagaNaoMarcadaResumo = null;
      pcState._anonimoPreAviso = false;
      pcState.avisoVagaNaoMarcadaConfirmado = false;
      renderMinhasListas();
    });
  }
  attachListenersModalCompartilhar();
}

// Abre o modal de compartilhamento (código + imagem da cédula) de uma
// lista depositada — extraído em 16/08/2026 pra ser chamado tanto da
// listagem de "Minhas listas" quanto de dentro do detalhe de uma lista já
// depositada (pcState.listaEmVisualizacao), que antes não tinha como abrir
// esse modal sem voltar pra listagem primeiro.
async function abrirModalCompartilharLista(id, listas) {
  const lista = listas.find((l) => l.id === id);
  if (!lista) return;
  pcState.modalCompartilharListaId = id;
  pcState.dadosCompartilhar = { carregando: true, lista };
  renderMinhasListas();
  // Peça ÚNICA de compartilhamento desde 19/08/2026: o cartão-desafio
  // (gerarImagemCedulaResumo, 3 cargos juntos). O cartão de cargo único
  // (gerarImagemCedula) foi aposentado na mesma data — decisão do usuário,
  // uma peça só de divulgação, uma identidade só. Código no histórico git.
  const completo = pcState.perfil ? await carregarSalvamentoCompleto(id) : null;
  const cargosEleitos = {};
  CARGOS.forEach((cargoDef) => {
    const listaCargo = completo && completo.cargos ? completo.cargos[cargoDef.id] : null;
    cargosEleitos[cargoDef.id] = listaCargo && listaCargo.length ? classificarEleitosPorPartido(listaCargo, cargoDef.id) : [];
  });
  const nomeExibido = lista.anonimo ? "Eleitor(a) anônimo(a)" : ((pcState.perfil && pcState.perfil.nome) || lista.nome);
  const temEleitos = CARGOS.some((c) => cargosEleitos[c.id].length);
  const cargosCompletos = completo && completo.cargos ? completo.cargos : null;
  const imagemUrl = temEleitos && lista.codigo
    ? gerarImagemCedulaResumo({ nomeExibido, cargosEleitos, codigo: lista.codigo, cargosCompletos }).toDataURL("image/png")
    : null;
  pcState.dadosCompartilhar = { carregando: false, lista, cargosEleitos, imagemUrl, cargosCompletos };
  renderMinhasListas();
}

// Liga os botões DE DENTRO do modal de compartilhar (trocar cargo, copiar
// código, WhatsApp/Instagram/baixar) — extraído em 16/08/2026 pelo mesmo
// motivo de abrirModalCompartilharLista, chamado de qualquer tela que
// possa ter esse modal aberto (checa pcState.modalCompartilharListaId
// sozinho, seguro chamar sempre).
function attachListenersModalCompartilhar() {
  if (!pcState.modalCompartilharListaId) return;
  document.getElementById("pcBtnFecharCompartilhar").addEventListener("click", () => {
    pcState.modalCompartilharListaId = null;
    pcState.dadosCompartilhar = null;
    renderMinhasListas();
  });
  const d = pcState.dadosCompartilhar;
  if (d && !d.carregando) {
    const origem = window.location.origin + window.location.pathname;
    const textoCompartilhar = `Esta é a minha lista dos Deputados e Senadores eleitos para 2026. Agora é a sua vez!\n\n${origem} — código ${d.lista.codigo}`;
    document.getElementById("pcBtnCopiarCodigoCedula").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(d.lista.codigo);
        const status = document.getElementById("pcCompartilharStatus");
        if (status) status.textContent = "Código copiado.";
      } catch (err) { /* clipboard indisponível, ignora */ }
    });
    document.getElementById("pcBtnShareWhatsapp").addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartilhar)}`, "_blank");
    });
    document.getElementById("pcBtnShareInstagram").addEventListener("click", async () => {
      const status = document.getElementById("pcCompartilharStatus");
      if (!d.imagemUrl) return;
      if (navigator.share && navigator.canShare) {
        try {
          const resp = await fetch(d.imagemUrl);
          const blob = await resp.blob();
          const arquivo = new File([blob], "minha-lista-2026.png", { type: "image/png" });
          if (navigator.canShare({ files: [arquivo] })) {
            await navigator.share({ files: [arquivo], text: textoCompartilhar });
            return;
          }
        } catch (err) { /* cancelou o compartilhamento nativo ou falhou — cai no fallback abaixo */ }
      }
      _baixarImagemCedula(d.imagemUrl);
      if (status) status.textContent = "Imagem baixada — abra o Instagram e poste nos Stories.";
    });
    document.getElementById("pcBtnBaixarImagemCedula").addEventListener("click", () => {
      if (d.imagemUrl) _baixarImagemCedula(d.imagemUrl);
    });
  }
}

// Mensagem de erro/status de salvamento — mostrada em qualquer tela que
// chame executarSalvarLista (Revisão tem #pcDepositoStatus, Seleção tem
// #pcSelecaoStatus, ver renderCargoEstadual). Silenciosa se nenhuma das
// duas existir no momento (não deveria acontecer, mas evita TypeError).
function mostrarStatusSalvamento(msg) {
  pcState._statusSalvamentoMsg = msg; // o modal de slots lê isso na falha
  const el = document.getElementById("pcDepositoStatus") || document.getElementById("pcSelecaoStatus");
  if (el) {
    el.textContent = msg;
    // Entrada suave (08/09/2026) — antes o texto só "pipocava" na tela.
    // Precisa tirar e repor a classe (com um reflow no meio) pra reiniciar
    // a animação quando duas mensagens seguidas usam a mesma classe.
    el.classList.remove("pc-status-entrando");
    void el.offsetWidth;
    if (msg) el.classList.add("pc-status-entrando");
  }
}

// Efetiva o Salvar depois que a lista já tem nome (primeira vez, via modal
// de nomear — ver attachListenersModalNomeLista) ou já tinha (salvamento
// seguinte da mesma lista, silencioso). Gera o id exclusivo na primeira
// vez só, e reaproveita depois — cada clique de Salvar é uma ATUALIZAÇÃO
// da mesma lista, não uma lista nova.
//
// manterTela:true é o caso da Seleção (botão Salvar, ver
// attachListenersSelecao) — grava a lista, mesmo incompleta, e devolve o
// controle pra quem chamou continuar na mesma tela em vez de navegar pra
// "lista salva"/painel, que é o comportamento certo só quando o salvamento
// vem do fim da trilha (Revisão → pcBtnConfirmarDeposito). Nesse caso a
// função só GRAVA e devolve true/false — não mostra "Lista salva" nem
// re-renderiza nada, porque quem chamou ainda vai re-renderizar a tela
// (pra fechar o modal de nome) e só DEPOIS disso a mensagem tem uma caixa
// de status nova pra aparecer; mostrar aqui seria apagado pelo re-render
// logo em seguida.
// "TypeError: Load failed" (Safari/iOS) e "Failed to fetch" (Chrome) são a
// forma técnica do navegador dizer "a chamada de rede não completou" —
// geralmente sinal fraco/instável, não um bug. Mostrar isso cru pra quem
// não programa não ajuda (achado do usuário, 09/09/2026, print de erro
// "TypeError: Load failed" ao salvar com 1 barra de sinal). O botão
// Salvar continua ali pra tentar de novo — não precisa de retry automático.
function textoErroSalvar(error) {
  const msg = String(error?.message || error || "");
  if (/load failed|failed to fetch|network ?error|networkerror/i.test(msg)) {
    return "Sem conexão no momento — verifique o sinal e toque em Salvar de novo.";
  }
  return "Erro ao salvar: " + msg;
}

async function executarSalvarLista({ manterTela = false } = {}) {
  // Guarda ANTES de qualquer escrita — as duas ramificações abaixo
  // preenchem pcState.listaSalvaId assim que salvam, então precisa
  // capturar "ainda não tinha id" logo no início pra saber depois se
  // este Salvar foi o primeiro ou uma atualização de uma lista já
  // existente (ver uso no fim da função).
  const primeiraVez = !pcState.listaSalvaId;
  // Logado grava em "salvamentos"/"listas_salvas" de verdade (Supabase) —
  // cria na 1ª vez (listaSalvaId ainda null), atualiza em cima da mesma
  // linha nas vezes seguintes (nunca duplica). Convidado continua local
  // (window.storage), porque "salvamentos" exige perfil_id — sem cadastro
  // não tem onde gravar isso no banco.
  if (pcState.perfil) {
    if (!pcState.listaSalvaId) {
      const { data, error } = await salvarSalvamento(pcState.perfil.id, pcState.estado, pcState.listaSalvaNome, pcState.palpitesPorCargo);
      if (error) { mostrarStatusSalvamento(textoErroSalvar(error)); return false; }
      pcState.listaSalvaId = data.id;
    } else {
      const { error } = await atualizarSalvamento(pcState.listaSalvaId, pcState.palpitesPorCargo);
      if (error) { mostrarStatusSalvamento(textoErroSalvar(error)); return false; }
    }
  } else {
    pcState.listaSalvaId = pcState.listaSalvaId || gerarIdLista();
    await persistirListaSalvaLocal();
  }
  // Grava (ou atualiza) o atalho local "de qual lista salva é este
  // rascunho" — é o que permite um Salvar futuro, depois de recarregar a
  // página, reconhecer que já existe uma lista pra ATUALIZAR em vez de
  // criar outra (ver persistirListaAtivaLocal e o achado do usuário em
  // 17/08/2026, logo acima da função).
  await persistirListaAtivaLocal();
  // Continua gravando em "palpites" também (Quadro de Médias público) —
  // tabela separada, 1 linha por pessoa, não mexe com "salvamentos".
  if (pcState.perfil) {
    const { error } = await salvarPalpiteCompleto(pcState.perfil.id, pcState.palpiteEdicao);
    if (error) { mostrarStatusSalvamento(textoErroSalvar(error)); return false; }
    if (manterTela) return true;
    // A tela "Sua lista foi salva" (renderDepositoConfirmado) é a
    // recepção de PRIMEIRA vez — convite pra convidar amigos, criar
    // grupo etc. Salvamentos seguintes da MESMA lista (edição) não são
    // primeira vez de nada, então pulam direto pro painel, que é onde o
    // botão "Avançar" daquela tela levaria de qualquer forma. Pedido do
    // usuário em 16/08/2026.
    if (primeiraVez) { pcState.subaba = "deposito-confirmado"; } else { pcState.subaba = "painel"; }
    renderAppColaborativo();
    return true;
  } else if (manterTela) {
    return true;
  } else if (primeiraVez) {
    pcState.tela = "deposito-confirmado";
    renderColaborativo();
  } else {
    pcState.tela = "painel-convidado";
    renderColaborativo();
  }
  return true;
}

// Modal "nomeie a sua lista" — pedido só no primeiro Salvar de uma lista
// (sem nome ainda), de qualquer tela que tenha um botão Salvar (Seleção e
// Revisão, ver attachListenersModalNomeLista). Extraído em 16/08/2026 pra
// não duplicar o markup/lógica quando o Salvar ganhou um segundo ponto de
// entrada na Seleção.
function renderModalNomeLista() {
  return `
    <div id="pcModalNomeListaOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px;">Nomeie a sua lista</h2>
        <div style="font-size:11.5px; line-height:1.4; color:var(--pc-ink-dim); margin-bottom:14px;">A nomeação é importante para gerar palpites diferentes conforme determinados grupos, ou para o cadastro de novas listas por conta da mudança de cenário durante o período eleitoral.</div>
        <input class="cell" id="pcInputNomeLista" placeholder="otimista - ${new Date().toLocaleDateString("pt-BR")}" style="width:100%; margin-bottom:6px;">
        <div class="pc-erro" id="pcErroNomeLista" style="min-height:16px;"></div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" id="pcBtnCancelarNomeLista" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarNomeLista" style="flex:1;">Salvar</button>
        </div>
      </div>
    </div>`;
}

// Seletor de destino do Salvar (pedido do usuário, 21/08/2026): o disquete
// abre a escolha — atualizar a lista ativa (padrão), sobrescrever outro
// slot em aberto, ou salvar como nova. As regras de acesso valem por tipo
// de usuário: depositada nunca é slot (cédula imutável); nova lista além
// das 2 grátis consome 1 crédito (logado) ou pede cadastro (convidado) —
// os mesmos gates do "+" de Minhas listas.
function renderModalSalvarDestino() {
  // Slots estilo videogame, versão B "linha com anel" (protótipo aprovado
  // 22/08/2026): cada lista em aberto é um slot com anel de progresso
  // circular (vagas preenchidas / total do estado) e o número dentro;
  // slot vazio = anel pontilhado com o campo de nome no lugar; o slot
  // além dos 2 grátis nasce TRANCADO (cadeado + preço) — a economia
  // visível como slots finitos. Sobrescrever pede o "Sobrescrever?"
  // clássico. Convidado tem o progresso (conteúdo local); logado mostra
  // anel neutro (o resumo do banco não traz os cargos).
  const destinos = (pcState._destinosSalvar || []).filter((l) => !l.depositadoEm);
  const sel = pcState._destinoSelecionado || null;
  const totalVagasEstado = CARGOS.reduce((t, c) => t + (vagasFixasCargo(pcState.estado, c.id) || 0), 0);
  const progressoDe = (l) => {
    if (!l.palpitesPorCargo || !totalVagasEstado) return null;
    let ind = 0;
    CARGOS.forEach((c) => {
      const lista = l.palpitesPorCargo[c.id];
      if (!lista) return;
      if (c.id === "senador") ind += lista.reduce((t, p) => t + (p.candidatos || []).filter((x) => x.marcadoEleito).length, 0);
      else ind += lista.reduce((t, p) => t + (Number(p.vagasIndicadas) || 0), 0);
    });
    return { ind: Math.min(ind, totalVagasEstado), total: totalVagasEstado };
  };
  const anel = (num, frac, modo) => {
    const C = 106.8; // pathLength do círculo r=17
    const arco = frac === null ? 0 : Math.max(0, Math.min(1, frac)) * C;
    const base = modo === "vazio"
      ? '<circle cx="20" cy="20" r="17" fill="none" stroke="#1E2226" stroke-width="3" stroke-dasharray="3 5"></circle>'
      : '<circle cx="20" cy="20" r="17" fill="none" stroke="#1E2226" stroke-width="3"></circle>';
    const fillArc = arco > 0 ? `<circle cx="20" cy="20" r="17" fill="none" stroke="#34E84A" stroke-width="3" stroke-linecap="round" stroke-dasharray="${arco.toFixed(1)} ${C}" pathLength="${C}"></circle>` : "";
    const centro = modo === "trancado"
      ? `<span class="pc-slotb-num">${iconeSvg("cadeadoSlot", 13)}</span>`
      : `<span class="pc-slotb-num">${String(num).padStart(2, "0")}</span>`;
    return `<div class="pc-slotb-anel"><svg viewBox="0 0 40 40" width="40" height="40" style="transform:rotate(-90deg);">${base}${fillArc}</svg>${centro}</div>`;
  };
  const linhas = [];
  destinos.forEach((l, i) => {
    const prog = progressoDe(l);
    const ativa = l.id === pcState.listaSalvaId;
    const meta = `${new Date(l.atualizadoEm).toLocaleDateString("pt-BR")}${prog ? ` · ${prog.ind}/${prog.total} vagas` : ""}${ativa ? " · em edição" : ""}`;
    linhas.push(`
    <div class="pc-slotb${l.id === sel ? " sel" : ""}" data-pc-destino-slot="${l.id}" data-pc-destino-nome="${escaparAtributoHtml(l.nome)}" data-pc-destino-num="${i + 1}">
      ${anel(i + 1, prog ? prog.ind / prog.total : null)}
      <div class="pc-slotb-corpo">
        <div class="pc-slotb-nome">${l.nome}</div>
        <div class="pc-slotb-meta">${meta}</div>
      </div>
    </div>`);
  });
  const numVazio = destinos.length + 1;
  const podeVazioGratis = destinos.length < 2;
  if (podeVazioGratis || pcState._destinoDesbloqueado) {
    linhas.push(`
    <div class="pc-slotb vazio${sel === "novo" ? " sel" : ""}" data-pc-destino-vazio data-pc-destino-num="${numVazio}">
      ${anel(numVazio, null, "vazio")}
      <div class="pc-slotb-corpo">
        ${sel === "novo"
          ? `<input class="pc-slotb-input" id="pcInputDestinoNome" placeholder="nome da lista…" maxlength="40" value="${escaparAtributoHtml(pcState._destinoNomeDigitado || "")}">`
          : `<div class="pc-slotb-nome vazia">vazio — toque pra salvar aqui</div>`}
        <div class="pc-slotb-meta">${pcState._destinoDesbloqueado && !podeVazioGratis ? "slot desbloqueado — 1 crédito ao salvar" : "&nbsp;"}</div>
      </div>
    </div>`);
  } else {
    linhas.push(`
    <div class="pc-slotb trancado" data-pc-destino-trancado data-pc-destino-num="${numVazio}">
      ${anel(numVazio, null, "trancado")}
      <div class="pc-slotb-corpo">
        <div class="pc-slotb-nome" style="color:var(--pc-ink-dim);">Bloqueado</div>
        <div class="pc-slotb-meta">${pcState.perfil ? `1 crédito (saldo: ${pcState.perfil.creditos || 0}) — ou convide um amigo` : "criar outra lista pede uma conta"}</div>
      </div>
    </div>`);
  }
  const alvoSel = destinos.find((l) => l.id === sel);
  // O botão diz só "Salvar" (decisão do usuário, 22/08): o slot
  // selecionado já mostra ONDE vai gravar — repetir o número no botão é
  // ruído. A confirmação de slot ocupado ("Salvar por cima de...?")
  // continua sendo a rede de segurança.
  const rotuloSalvar = "Salvar";
  // Padrão de save de game (pedido do usuário, 30/08/2026): a confirmação
  // SUBSTITUI a fileira Cancelar/Salvar — uma pergunta, um par de botões.
  // As duas caixas empilhadas de antes liam como duplicação.
  const confirmando = pcState._destinoConfirmando && alvoSel;
  const confirmacao = confirmando ? `
    <div class="pc-slotb-confirm">
      <div class="pc-slotb-confirm-q">Sobrepor <b>"${alvoSel.nome}"</b>?</div>
      <div class="pc-slotb-confirm-ops">
        <button type="button" class="ghost" id="pcSlotConfirmNao">Cancelar</button>
        <button type="button" class="primary" id="pcSlotConfirmSim">Sobrepor</button>
      </div>
    </div>` : "";
  return `
    <div id="pcModalSalvarDestinoOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:20px 18px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div class="pc-slotb-tit">Salvar — escolha o slot</div>
        ${linhas.join("")}
        <div class="pc-erro" id="pcErroDestino" style="min-height:16px; margin-top:2px;"></div>
        ${confirmacao}
        ${confirmando ? "" : `
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="ghost" id="pcBtnCancelarDestino" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnConfirmarDestino" style="flex:1;" ${sel ? "" : "disabled"}>${rotuloSalvar}</button>
        </div>`}
      </div>
    </div>`;
}

// aoCancelar/aoConfirmar são callbacks de quem chamou (cada tela decide o
// que fazer depois): Revisão passa executarSalvarLista puro (navega pra
// "lista salva"/painel ao terminar); Seleção passa uma versão com
// manterTela:true seguida de um re-render da própria tela (ver
// attachListenersSelecao).
function attachListenersModalNomeLista(aoCancelar, aoConfirmar) {
  const inputNome = document.getElementById("pcInputNomeLista");
  inputNome.focus();
  const confirmar = async () => {
    const valor = inputNome.value.trim();
    if (!valor) {
      document.getElementById("pcErroNomeLista").textContent = "Digite um nome pra continuar.";
      inputNome.focus();
      return;
    }
    pcState.listaSalvaNome = valor;
    pcState.modalNomeListaAberto = false;
    await aoConfirmar();
  };
  document.getElementById("pcBtnCancelarNomeLista").addEventListener("click", () => {
    pcState.modalNomeListaAberto = false;
    aoCancelar();
  });
  document.getElementById("pcBtnConfirmarNomeLista").addEventListener("click", confirmar);
  inputNome.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } });
}

// Modal de editar o link de Instagram de UM candidato — só abre pra quem já
// tem pcState.souAdmin true (o botão de lápis nem aparece pra quem não é
// admin, ver o card do candidato em renderCargoEstadual); a escrita de
// verdade é sempre reconferida no banco (admin_definir_instagram_candidato,
// nuvem/migracao-24-instagram-candidato.sql), então nada aqui é a defesa
// real contra alguém driblar o front. pcState.modalInstagramInfo = { chave,
// nome, valorAtual } de quem está sendo editado, ou null.
function renderModalInstagram() {
  const info = pcState.modalInstagramInfo;
  return `
    <div id="pcModalInstagramOverlay" class="pc-overlay-fade" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px;">Instagram — ${info.nome}</h2>
        <div style="font-size:11.5px; line-height:1.4; color:var(--pc-ink-dim); margin-bottom:14px;">Link visível pra todo mundo, ao lado do nome do candidato na Seleção. Cole o endereço completo do perfil.</div>
        <input class="cell" id="pcInputInstagram" placeholder="https://instagram.com/..." value="${escaparAtributoHtml(info.valorAtual || "")}" style="width:100%; margin-bottom:6px;">
        <div class="pc-erro" id="pcErroInstagram" style="min-height:16px;"></div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="ghost" id="pcBtnCancelarInstagram" style="flex:1;">Cancelar</button>
          ${info.valorAtual ? `<button class="ghost" id="pcBtnRemoverInstagram" style="flex:1; color:var(--pc-danger); border-color:var(--pc-danger);">Remover</button>` : ""}
          <button class="primary" id="pcBtnConfirmarInstagram" style="flex:1;">Salvar</button>
        </div>
      </div>
    </div>`;
}

function attachListenersModalInstagram(aoFechar) {
  const info = pcState.modalInstagramInfo;
  const input = document.getElementById("pcInputInstagram");
  input.focus();
  input.select();
  const salvar = async (valor) => {
    const { error } = await definirLinkCandidato(pcState.estado, pcState.cargoAtivo, info.chave, valor);
    if (error) {
      document.getElementById("pcErroInstagram").textContent = "Erro ao salvar: " + error.message;
      return;
    }
    // Atualiza o cache local na hora — sem isso o ícone só refletiria o
    // link novo depois de trocar de cargo/estado e voltar (garantirLinksCandidatos
    // só busca de novo quando o cache daquele estado+cargo ainda não existe).
    const chaveCache = `${pcState.estado}::${pcState.cargoAtivo}`;
    if (!pcState.linksCandidatosCache[chaveCache]) pcState.linksCandidatosCache[chaveCache] = {};
    if (valor) pcState.linksCandidatosCache[chaveCache][info.chave] = valor;
    else delete pcState.linksCandidatosCache[chaveCache][info.chave];
    pcState.modalInstagramInfo = null;
    aoFechar();
  };
  document.getElementById("pcBtnConfirmarInstagram").addEventListener("click", () => salvar(input.value.trim()));
  const btnRemover = document.getElementById("pcBtnRemoverInstagram");
  if (btnRemover) btnRemover.addEventListener("click", () => salvar(""));
  document.getElementById("pcBtnCancelarInstagram").addEventListener("click", () => {
    pcState.modalInstagramInfo = null;
    aoFechar();
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); salvar(input.value.trim()); } });
}

function renderDepositoConfirmado() {
  const conteudo = document.getElementById("pcConteudo");
  const tiles = [
    { icone: "send", label: "Convide os amigos", info: "Gere um link único e envie por WhatsApp ou redes sociais. Cada amigo que entrar pelo seu link e depositar a primeira cédula rende 1 SL pra você, automaticamente." },
    { icone: "grupos", label: "Crie grupos particulares", info: "Monte um grupo, convide por código ou link, e acompanhe um ranking só entre vocês — todo mundo vê o palpite de todo mundo ali dentro." },
    { icone: "chart", label: "Avance na pontuação", info: "Você pontua por candidato eleito certo, pela proximidade da votação de cada um, pelas cadeiras por partido, pela enquete eleitoral e por um bônus de quem entrega a lista mais cedo." },
    { icone: "ranking", label: "Ranqueamento", info: "Você entra em 4 rankings ao mesmo tempo: geral (nacional), do seu estado, por categorias, e dos grupos particulares que você criar ou entrar." },
  ];
  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): os 4 quadrados antigos
  // (.pc-tile, ícone gigante com rótulo por cima) viraram a grade de
  // atalhos padrão — ícone-em-círculo + título + tooltip ⓘ preservado.
  const tilesHtml = tiles.map((t) => `
    <div class="pc-lobby-atalho" style="cursor:default;">
      <div class="pc-lobby-atalho-icone">${iconeSvg(t.icone, 19)}</div>
      <div style="display:flex; align-items:center; gap:4px;"><div class="pc-lobby-atalho-titulo" style="font-size:12.5px; text-align:left;">${t.label}</div>${infoTip(t.info)}</div>
    </div>`).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto; text-align:center; padding:2rem 1.5rem;">
      ${iconeSvg("ballot", 30)}
      <h2 style="margin-top:8px;">Sua lista foi salva</h2>
      <div style="font-size:16px; font-weight:700; color:var(--pc-accent); margin:6px 0 4px;">Agora o game começa de verdade</div>
      <div class="pc-lobby-atalhos" style="margin:18px 0; text-align:left;">${tilesHtml}</div>
      <button class="primary" id="pcBtnIrPainel">Avançar</button>
      <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:8px;">O acesso a essas ferramentas fica disponível a partir do cadastro simples.</div>
    </div>`;
  document.getElementById("pcBtnIrPainel").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "painel"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
  });
}
