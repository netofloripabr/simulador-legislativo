// Duelos (Desafios 1×1): hub, criar, aceitar, adaptadores de recorte,
// faders do duelo, selado, comparação e vitória.
// Ordem de carga no index.html.

// ===== Desafios 1×1 (migração 28) — protótipos v6/v7, 23-24/08/2026 =====
// Duelo entre cédulas DEPOSITADAS: quem faz mais pontos na apuração leva.
// A pontuação de verdade (RANQUEAMENTO.md) ainda não existe — desafios
// selados ficam em "apuração" esperando essa peça; tudo antes disso
// (criar/aceitar/recusar/cancelar/expirar/prêmio) já funciona de ponta a
// ponta pelas RPCs do banco.
function _iniciaisNome(nome) {
  const partes = (nome || "?").trim().split(/\s+/);
  return ((partes[0] || "")[0] || "?").toUpperCase() + ((partes[1] || "")[0] || "").toUpperCase();
}

function _chipStatusDesafio(status) {
  const mapa = {
    aguardando: `<span class="pc-chip-lima">aguardando</span>`,
    selado: `<span class="pc-chip-neutro">apuração</span>`,
    apuracao: `<span class="pc-chip-neutro">apuração</span>`,
    encerrado: `<span class="pc-chip-verde">encerrado</span>`,
    recusado: `<span class="pc-chip-neutro">recusado</span>`,
    cancelado: `<span class="pc-chip-neutro">cancelado</span>`,
    expirado: `<span class="pc-chip-neutro">expirado</span>`,
  };
  return mapa[status] || "";
}

async function renderDesafiosHub() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando seus desafios…");
  try {
    await _renderDesafiosHubCorpo(conteudo);
  } catch (e) {
    console.error("Erro ao montar o hub de desafios:", e);
    conteudo.innerHTML = `<div class="glass-card" style="text-align:center;">
      <h2 style="margin-bottom:6px;">Não consegui carregar</h2>
      <div class="pc-sub" style="margin-bottom:16px;">Algo falhou ao buscar seus desafios. Tenta de novo?</div>
      <button class="primary" id="pcBtnRetentarDesafiosHub" style="width:100%;">Tentar de novo</button>
    </div>`;
    document.getElementById("pcBtnRetentarDesafiosHub").addEventListener("click", renderDesafiosHub);
  }
}

async function _renderDesafiosHubCorpo(conteudo) {
  pcState._farolContexto = "duelos";
  pcState.telaDesafio = "hub";
  const [desafios, gratis] = await Promise.all([listarMeusDesafios(), desafiosGratisRestantes(pcState.perfil.id)]);
  pcState.desafiosCache = desafios;
  pcState.desafiosGratisRestantes = gratis;

  const meuId = pcState.perfil.id;
  const recebidos = desafios.filter((d) => d.status === "aguardando" && d.desafiado_id === meuId);
  const andamento = desafios.filter((d) =>
    (d.status === "aguardando" && d.criador_id === meuId) || d.status === "selado" || d.status === "apuracao");
  const encerrados = desafios.filter((d) => ["encerrado", "recusado", "cancelado", "expirado"].includes(d.status));

  const linhaDuelo = (d) => {
    const souCriador = d.criador_id === meuId;
    const euNome = souCriador ? "Você" : (d.criador ? d.criador.nome : "Você");
    const dueloAberto = souCriador && !d.desafiado_id && d.status === "aguardando";
    const outroNome = souCriador ? (d.desafiado ? d.desafiado.nome : (dueloAberto ? "Convite aberto" : "?")) : (d.criador ? d.criador.nome : "?");
    const outroIniciais = _iniciaisNome(outroNome);
    const pendenteRecebido = d.status === "aguardando" && d.desafiado_id === meuId;
    const pendenteEnviado = d.status === "aguardando" && d.criador_id === meuId;
    const encerradoComPontos = d.status === "encerrado" && d.pontos_criador != null && d.pontos_desafiado != null;
    const meusPontos = souCriador ? d.pontos_criador : d.pontos_desafiado;
    const pontosOutro = souCriador ? d.pontos_desafiado : d.pontos_criador;
    const venci = d.vencedor_id && d.vencedor_id === meuId;
    const destacado = pcState.desafioDestacadoId && d.id === pcState.desafioDestacadoId;
    // Cartão v2 (protótipo aprovado pelo usuário, 08/09/2026): os dois
    // lados com o mesmo peso — reaproveita o pódio da tela de vitória
    // (.pc-podio-*), avatar grande de cada lado e "VS" no meio; nome do
    // rival não é mais cortado. Contexto (UF · cargo · via convite) vira
    // uma linha pequena acima do título, que perde as aspas. Cada lado diz
    // o próprio estado (cédula selada / placar / quem aceitou).
    const outroVenceu = !!d.vencedor_id && d.vencedor_id !== meuId;
    const cargoRot = (CARGOS.find((c) => c.id === d.cargo) || {}).label || d.cargo || "";
    const contexto = `${d.estado} · ${cargoRot}${d.modelo_de ? " · via convite" : ""}`;
    const fmtPts = (n) => Number(n).toLocaleString("pt-BR");
    const dataBr = (iso) => new Date(iso).toLocaleDateString("pt-BR");
    // Estados de "encerrado sem placar" (achado do usuário, 09/09/2026: o
    // card de duelo recusado mostrava "cédula selada" do lado de quem
    // recusou, como se nada tivesse acontecido — o nome também sumia por
    // causa do bug corrigido na migração 51/52, mas o texto do card em si
    // já estava errado, independente disso).
    const subEu = encerradoComPontos
      ? `<div class="pc-podio-pts${venci ? " venceu" : ""}">${fmtPts(meusPontos)}<i> pts</i></div>`
      : (d.status === "recusado" && !souCriador)
        ? `<div class="pc-podio-sub">você recusou</div>`
        : `<div class="pc-podio-sub">${pendenteRecebido ? "falta a sua cédula" : "cédula selada"}</div>`;
    const subOutro = encerradoComPontos
      ? `<div class="pc-podio-pts${outroVenceu ? " venceu" : ""}">${fmtPts(pontosOutro)}<i> pts</i></div>`
      : d.status === "recusado" ? `<div class="pc-podio-sub">${souCriador ? "recusou o convite" : "aguardava sua resposta"}</div>`
      : d.status === "cancelado" ? `<div class="pc-podio-sub">convite cancelado</div>`
      : d.status === "expirado" ? `<div class="pc-podio-sub">expirou sem resposta</div>`
      : `<div class="pc-podio-sub">${dueloAberto
          ? (!d.aceites ? "ninguém aceitou ainda" : d.aceites === 1 ? "1 pessoa já aceitou" : d.aceites + " pessoas já aceitaram")
          : (pendenteEnviado ? "ainda não respondeu" : "cédula selada")}</div>`;
    let rodape = "";
    if (dueloAberto) rodape = `<span>criado em ${dataBr(d.criado_em)} · vale até você cancelar</span>`;
    else if (pendenteEnviado) rodape = `<span>enviado em ${dataBr(d.criado_em)}</span><span>expira ${dataBr(d.expira_em)}</span>`;
    else if (pendenteRecebido) rodape = `<span>recebido em ${dataBr(d.criado_em)}</span><span>expira ${dataBr(d.expira_em)}</span>`;
    else if (d.status === "selado" || d.status === "apuracao") rodape = `<span>selado em ${dataBr(d.respondido_em || d.criado_em)}</span><span>aguardando a apuração</span>`;
    else if (d.status === "encerrado") rodape = `<span>selado em ${dataBr(d.respondido_em || d.criado_em)}</span><span>resultado apurado</span>`;
    else if (d.status === "recusado") rodape = `<span>recusado em ${dataBr(d.respondido_em || d.criado_em)}</span><span>${d.estado}</span>`;
    else if (d.status === "cancelado") rodape = `<span>cancelado em ${dataBr(d.respondido_em || d.criado_em)}</span><span>${d.estado}</span>`;
    else if (d.status === "expirado") rodape = `<span>expirado em ${dataBr(d.respondido_em || d.criado_em)}</span><span>${d.estado}</span>`;
    else rodape = `<span>${dataBr(d.respondido_em || d.criado_em)}</span><span>${d.estado}</span>`;
    const setaSvg = '<svg viewBox="0 0 16 16" width="11" height="11"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    return `
    <div class="pc-duelo-card"${destacado ? ' id="pcDesafioDestacado" style="outline:2px solid var(--pc-accent); outline-offset:2px;"' : ""}>
      <div class="pc-duelo-cab" style="margin-bottom:0;">
        <span class="pc-duelo-eyebrow">${contexto}</span>
        ${encerradoComPontos ? `<span class="${venci ? "pc-chip-verde" : "pc-chip-neutro"}">${venci ? "vitória" : "derrota"}</span>` : _chipStatusDesafio(d.status)}
      </div>
      <div class="pc-duelo-titulo">${_nomeDueloLimpo(d.nome)}${pendenteEnviado && !dueloAberto ? ` <span style="color:var(--pc-ink-dim); font-weight:600;">· você desafiou</span>` : ""}</div>
      <div class="pc-podio pc-duelo-podio">
        <div class="pc-podio-lado">
          <div class="pc-podio-av eu${venci ? " venceu" : ""}">${_iniciaisNome(euNome)}</div>
          <div class="pc-podio-nm">Você</div>
          ${subEu}
        </div>
        <div class="pc-podio-vs">VS</div>
        <div class="pc-podio-lado">
          <div class="pc-podio-av${outroVenceu ? " venceu" : ""}${dueloAberto ? " aberto" : ""}">${dueloAberto ? "?" : outroIniciais}</div>
          <div class="pc-podio-nm${dueloAberto ? " dim" : ""}">${dueloAberto ? "quem aceitar" : outroNome}</div>
          ${subOutro}
        </div>
      </div>
      <div class="pc-duelo-rodape">${rodape}</div>
      ${pendenteRecebido ? `
      <div class="pc-duelo-acoes">
        <button class="primary" data-pc-aceitar="${d.id}" style="flex:1;">Aceitar</button>
        <button class="ghost" data-pc-recusar="${d.id}" style="flex:1;">Recusar</button>
      </div>` : ""}
      ${dueloAberto ? `
      <div class="pc-duelo-acoes">
        <button class="primary" data-pc-duelo-cartao="${d.codigo}" data-pc-duelo-nome="${escaparAtributoHtml(d.nome)}" data-pc-duelo-cargo="${d.cargo}" data-pc-duelo-ncand="${(d.escopo_candidatos || []).length}" data-pc-duelo-uf="${d.estado}" title="Enviar o convite" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px;">${iconeSvg("compartilhar", 15)} Enviar convite</button>
        <button class="ghost" data-pc-cancelar="${d.id}" title="Cancelar${d.custo_sl ? ` e recuperar ${d.custo_sl} SL` : ""}" style="font-size:16px; line-height:1; padding:9px 12px;">×</button>
      </div>` : ""}
      ${["selado", "apuracao", "encerrado"].includes(d.status) ? `<div class="pc-duelo-acoes"><button class="ghost" data-pc-comparar="${d.id}" style="flex:1; font-size:11.5px; display:flex; align-items:center; justify-content:center; gap:6px;">Ver comparação ${setaSvg}</button></div>` : ""}
    </div>`;
  };

  // Filtros (pedido do usuário, 09/09/2026): a tela virava uma lista
  // longa e sem separação clara conforme os duelos se acumulavam. Reusa
  // o mesmo padrão de abas do resto do app (.pc-cargo-switch) — filtra
  // por cima dos 3 grupos que já existiam (recebidos/andamento/
  // encerrados), não muda a regra de quem entra em cada grupo.
  if (!pcState.desafiosFiltro) pcState.desafiosFiltro = "todos";
  const filtro = pcState.desafiosFiltro;
  const abas = [
    { id: "todos", label: "Todos", n: desafios.length },
    { id: "recebidos", label: "Te desafiaram", n: recebidos.length },
    { id: "andamento", label: "Em andamento", n: andamento.length },
    { id: "encerrados", label: "Encerrados", n: encerrados.length },
  ];
  const botoesFiltro = abas.map((a) => `
    <button data-pc-duelo-filtro="${a.id}" class="${filtro === a.id ? "active" : ""}">${a.label}${a.n ? ` <span class="pc-tab-cont">${a.n}</span>` : ""}</button>`).join("");

  const mostrarRecebidos = filtro === "todos" || filtro === "recebidos";
  const mostrarAndamento = filtro === "todos" || filtro === "andamento";
  const mostrarEncerrados = filtro === "todos" || filtro === "encerrados";
  const nadaNesseFiltro = filtro !== "todos" &&
    ((filtro === "recebidos" && !recebidos.length) || (filtro === "andamento" && !andamento.length) || (filtro === "encerrados" && !encerrados.length));

  conteudo.innerHTML = `
    <div id="pcFarolBloco"></div>
    <button class="ghost" id="pcBtnVoltarDesafios" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Duelos</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Quem faz mais pontos na apuração leva. A régua é a mesma do documento e do ranking.</div>
    <button class="primary" id="pcBtnCriarDesafio" style="width:100%; margin-bottom:6px;">Criar duelo</button>
    <div style="font-size:11px; color:var(--pc-ink-dim); text-align:center; margin-bottom:18px;">Duelar é sempre grátis — desafie quantos quiser.</div>

    ${desafios.length ? `<div class="pc-cargo-switch pc-admin-abas">${botoesFiltro}</div>` : ""}

    ${mostrarRecebidos && recebidos.length ? `<div class="pc-lobby-menu-tit" style="margin-top:0;">Te desafiaram · ${recebidos.length}</div>${recebidos.map(linhaDuelo).join("")}` : ""}
    ${mostrarAndamento && andamento.length ? `<div class="pc-lobby-menu-tit">Em andamento · ${andamento.length}</div>${andamento.map(linhaDuelo).join("")}` : ""}
    ${mostrarEncerrados && encerrados.length ? `<div class="pc-lobby-menu-tit">Encerrados</div>${encerrados.slice(0, 10).map(linhaDuelo).join("")}` : ""}
    ${!desafios.length ? `<div class="pc-lobby-card">${estadoVazio({ icone: "desafio", titulo: "Nenhum duelo ainda", texto: "Crie o primeiro — o custo do duelo já está descrito acima." })}</div>` : ""}
    ${nadaNesseFiltro ? `<div class="pc-lobby-card">${estadoVazio({ icone: "desafio", titulo: "Nada por aqui", texto: "Nenhum duelo nesse filtro por enquanto." })}</div>` : ""}
    <div class="pc-status" id="pcDesafiosStatus" style="margin-top:10px; min-height:12px;">${pcState.desafiosAvisoStatus || ""}</div>
  `;
  pcState.desafiosAvisoStatus = null; // aviso do boot (?duelo=) só na primeira renderização
  atualizarFarol();
  if (pcState.desafioDestacadoId) {
    const alvo = document.getElementById("pcDesafioDestacado");
    if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    pcState.desafioDestacadoId = null; // só destaca na primeira renderização vinda da notificação
  }
  document.getElementById("pcBtnVoltarDesafios").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.querySelectorAll("[data-pc-duelo-filtro]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafiosFiltro = btn.getAttribute("data-pc-duelo-filtro");
    renderDesafiosHub();
  }));
  document.getElementById("pcBtnCriarDesafio").addEventListener("click", () => {
    pcState.desafioCriarPasso = 1; pcState.desafioCriarAlvoModo = null;
    pcState.desafioCriarNome = ""; pcState.desafioCriarAlvo = null;
    pcState.desafioCriarCodigoInput = ""; pcState.desafioCriarCodigoStatus = "";
    pcState.desafioCriarCargo = null; pcState.desafioCriarModo = null;
    pcState.desafioCriarPartidoFiltro = null; pcState.desafioCriarBusca = "";
    pcState.desafioCriarSelecionados = new Set(); pcState.desafioCriarVotos = {};
    pcState.desafioStatus = "";
    renderCriarDesafio();
  });
  document.querySelectorAll("[data-pc-aceitar]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioAceitarId = btn.getAttribute("data-pc-aceitar");
    pcState.desafioAceitarFase = "convite";
    pcState.desafioAceitarVotos = {};
    pcState.desafioAceitarPreenchido = false;
    pcState.desafioAceitarHistorico = [];
    pcState.desafioStatus = "";
    renderAceitarDesafio();
  }));
  document.querySelectorAll("[data-pc-recusar]").forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const r = await recusarDesafio(btn.getAttribute("data-pc-recusar"));
    if (!r.ok) { document.getElementById("pcDesafiosStatus").textContent = "Não deu: " + r.mensagem; btn.disabled = false; return; }
    renderDesafiosHub();
  }));
  document.querySelectorAll("[data-pc-cancelar]").forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true;
    const r = await cancelarDesafio(btn.getAttribute("data-pc-cancelar"));
    if (!r.ok) { document.getElementById("pcDesafiosStatus").textContent = "Não deu: " + r.mensagem; btn.disabled = false; return; }
    if (pcState.perfil) { try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {} }
    renderDesafiosHub();
  }));
  document.querySelectorAll("[data-pc-comparar]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioComparacaoId = btn.getAttribute("data-pc-comparar");
    renderComparacaoDesafio();
  }));
  // Convite do duelo aberto (migração 40): o link carrega o código do
  // duelo E o código de convite pessoal — a pessoa que entrar por ele
  // conta como convite convertido (1 SL) além de cair direto no duelo.
  const _linkDuelo = (codigoDuelo) => {
    const base = window.location.origin + window.location.pathname + "?duelo=" + codigoDuelo;
    return pcState.perfil && pcState.perfil.codigo_convite ? base + "&conv=" + pcState.perfil.codigo_convite : base;
  };
  document.querySelectorAll("[data-pc-duelo-cartao]").forEach((btn) => btn.addEventListener("click", async () => {
    const nomeDuelo = btn.getAttribute("data-pc-duelo-nome") || "duelo";
    const cargoInfo = CARGOS.find((c) => c.id === btn.getAttribute("data-pc-duelo-cargo")) || {};
    const nCand = Number(btn.getAttribute("data-pc-duelo-ncand")) || 0;
    const ufSigla = btn.getAttribute("data-pc-duelo-uf") || pcState.estado;
    const nomeEstado = ((ESTADOS_BRASIL.find((e) => e.sigla === ufSigla) || {}).nome) || ufSigla;
    const infoRecorte = [cargoInfo.label, nCand ? nCand + " candidatos" : null, nomeEstado].filter(Boolean).join(" \u00b7 ");
    // Texto do convite (reescrito 09/09/2026 \u2014 o anterior liderava com
    // "PITACO" sem contexto, jogava o link antes de explicar qualquer
    // coisa, e nunca dizia o mecanismo do duelo. Reescrita revisada e
    // aprovada pelo usu\u00e1rio linha por linha; n\u00e3o reformular sem pedido
    // dele \u2014 ver conversa de 09/09/2026).
    const texto = `Bora dar um PITACO na elei\u00e7\u00e3o legislativa 2026?\n\nJ\u00e1 fechei o meu palpite - "${_nomeDueloLimpo(nomeDuelo)}". Agora te convido para montar o seu (5min., sem precisar de cadastro). Quando sair o resultado oficial \u2014 quem chegar mais perto, vence.\n\n${_linkDuelo(btn.getAttribute("data-pc-duelo-cartao"))}\n\nO Pitaco \u00e9 apenas um recorte do sistema. Criando sua conta (gr\u00e1tis) voc\u00ea libera o app com ferramentas poderosas para projetar o resultado eleitoral do legislativo 2026:\n\n* Monte sua lista completa \u2014 (Estadual, Federal e Senador)\n* Matem\u00e1tica real da elei\u00e7\u00e3o (quociente, sobras, tudo)\n* Term\u00f4metro Eleitoral \u2014 a mediana dos palpites, atualizada em tempo real\n* Duelo 1\u00d71 (Pitaco) \u2014 desafie qualquer amigo, n\u00e3o s\u00f3 quem te convidou\n* Grupos \u2014 compare sua lista com uma galera inteira, n\u00e3o s\u00f3 1\u00d71\n\n\n*\u00c9 GR\u00c1TIS*`;
    const canvas = gerarImagemConviteDuelo({ nomeCriador: (pcState.perfil && pcState.perfil.nome) || "Eu", nomeDuelo, infoRecorte });
    const dataUrl = canvas.toDataURL("image/png");
    if (_ehDispositivoMovel() && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const arquivo = new File([blob], "convite-duelo.png", { type: "image/png" });
        if (navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], text: texto });
          return;
        }
      } catch (_) { /* cancelou o nativo ou falhou — cai no fallback */ }
    }
    // Computador (WhatsApp Desktop não entra no menu nativo do SO, ver
    // _ehDispositivoMovel): baixa a imagem e já abre o WhatsApp Web com o
    // texto pronto — falta só anexar a imagem baixada na conversa.
    _baixarImagemCedula(dataUrl, "convite-duelo.png");
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    try { await navigator.clipboard.writeText(texto); } catch (_) {}
  }));
}

// Achata pcState.palpitesPorCargo[cargo] (partidos → candidatos) numa
// lista simples {chave, nome, partido} — é o pool oficial do cargo (2026,
// REGRA MESTRA), a mesma fonte que a tela de palpite já usa.
function _poolCandidatosDesafio(cargo) {
  // Fonte dos palpites, em ordem: (1) a LISTA SALVA escolhida no seletor
  // do Criar duelo (pcState._desafioFonteCargos, decisão do usuário
  // 30/08/2026 — quem tem várias listas escolhe qual alimenta o duelo);
  // (2) o rascunho em edição; (3) o pool oficial 2026 zerado.
  const daFonte = pcState._desafioFonteCargos && pcState._desafioFonteCargos[cargo] && pcState._desafioFonteCargos[cargo].length
    ? pcState._desafioFonteCargos[cargo] : null;
  const grupos = daFonte
    || ((pcState.palpitesPorCargo && pcState.palpitesPorCargo[cargo] && pcState.palpitesPorCargo[cargo].length)
      ? pcState.palpitesPorCargo[cargo]
      : montarEstadoPalpite("assembleia", null, null, cargo, pcState.estado));
  const lista = [];
  (grupos || []).forEach((p) => {
    if (p.semAta2026) return;
    (p.candidatos || []).forEach((c) => {
      if (c.fonte === "legenda") return;
      // "votos" acompanha (decisão do usuário 30/08/2026): o duelo puxa
      // os palpites da lista em edição como ponto de partida — ninguém
      // digita 30 números do zero de novo.
      lista.push({ chave: c.chave, nome: nomeExibicao(c), partido: p.nome, votos: Number(c.votos) || 0, marcadoEleito: !!c.marcadoEleito });
    });
  });
  return lista;
}

// Criar desafio (protótipo aprovado 30/08/2026): pílula de CARGO + pílula
// de DISPUTA (Eleitos/Cargo/Partido/Candidato) com uma linha explicando a
// opção ativa, visibilidade dos votos (abertos/ocultos) e o recorte
// "Eleitos" — plenário com o número fixo de cadeiras do cargo, preenchido
// cadeira a cadeira pela gaveta. Tudo numa tela só, recarregada a cada
// interação (mesmo padrão do resto do app).


function _duelaCorPartido(partido) {
  return corPartidoIdeologico(partido);
}

function _duelaIniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/);
  return ((partes[0] || " ")[0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

// Grade de cadeiras do recorte Eleitos — compartilhada entre Criar e
// Aceitar. cadeiras: [{chave,nome,partido} | null]; ativa: índice da
// cadeira selecionada (anel verde) ou null.
function _duelaGradeCadeiras(cadeiras, ativa, prefixoData) {
  const poucos = cadeiras.length <= 5;
  const celulas = cadeiras.map((c, i) => {
    const cls = "pc-duelo-cadeira" + (c ? " cheia" : "") + (i === ativa ? " ativa" : "") + (poucos ? " grande" : "");
    const estilo = c ? ` style="background:${_duelaCorPartido(c.partido)};"` : "";
    const conteudo = c
      ? `<span class="ini">${_duelaIniciais(c.nome)}</span>${poucos ? `<span class="quem">${c.nome}</span><span class="pt">${siglaCurta(c.partido)}</span>` : ""}`
      : (i === ativa ? '<span class="mais">+</span>' : "");
    return `<button type="button" class="${cls}"${estilo} data-${prefixoData}="${i}" title="Cadeira ${i + 1}${c ? " — " + escaparAtributoHtml(c.nome) : ""}">${conteudo}</button>`;
  }).join("");
  return `<div class="pc-duelo-grade${poucos ? " poucos" : ""}">${celulas}</div>`;
}

// Gaveta que sobe ao tocar numa cadeira: busca no pool (menos quem já está
// sentado) + "Sentar aqui"; cadeira ocupada ganha "Esvaziar".
function _duelaGavetaCadeira(cadeiras, ativa, pool, busca, prefixoData) {
  if (ativa == null) return "";
  const sentados = new Set(cadeiras.filter(Boolean).map((c) => c.chave));
  const ocupante = cadeiras[ativa];
  const termo = (busca || "").trim().toLowerCase();
  const candidatos = pool
    .filter((c) => !sentados.has(c.chave))
    .filter((c) => !termo || c.nome.toLowerCase().includes(termo) || c.partido.toLowerCase().includes(termo))
    .slice(0, 8);
  return `
    <div class="pc-duelo-gaveta">
      <div class="pc-duelo-gaveta-alca"></div>
      <div class="pc-duelo-gaveta-cab">
        <span>Cadeira ${ativa + 1}</span>
        <span class="dim">${ocupante ? escaparAtributoHtml(ocupante.nome) : "quem ocupa?"}</span>
      </div>
      ${ocupante ? `<button type="button" class="ghost" id="pcBtnEsvaziarCadeira" style="width:100%; margin-bottom:8px; font-size:11.5px;">Esvaziar esta cadeira</button>` : ""}
      <input class="cell" id="pcBuscaCadeira" placeholder="Buscar candidato…" value="${escaparAtributoHtml(busca || "")}" style="width:100%; margin-bottom:4px;">
      ${candidatos.map((c) => `
        <div class="pc-voto-linha">
          <span class="txt"><span class="nome">${c.nome}</span><span class="partido">${c.partido}</span></span>
          <button type="button" class="pc-chip-partido sel" data-${prefixoData}-sentar="${escaparAtributoHtml(c.chave)}" style="cursor:pointer;">Sentar aqui</button>
        </div>`).join("") || `<div class="pc-sub" style="padding:8px 0;">Nenhum candidato disponível nessa busca.</div>`}
    </div>`;
}

function _duelaPoolPorChave(pool) {
  const m = new Map();
  pool.forEach((c) => m.set(c.chave, c));
  return m;
}

async function renderCriarDesafio() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando…");
  try {
    await _renderCriarDesafioCorpo(conteudo);
  } catch (e) {
    console.error("Erro ao montar a criação de desafio:", e);
    conteudo.innerHTML = `<div class="glass-card" style="text-align:center;">
      <h2 style="margin-bottom:6px;">Não consegui carregar</h2>
      <div class="pc-sub" style="margin-bottom:16px;">Algo falhou ao preparar a criação do desafio. Tenta de novo?</div>
      <button class="primary" id="pcBtnRetentarCriarDesafio" style="width:100%;">Tentar de novo</button>
    </div>`;
    document.getElementById("pcBtnRetentarCriarDesafio").addEventListener("click", renderCriarDesafio);
  }
}

async function _renderCriarDesafioCorpo(conteudo) {
  const gratis = await desafiosGratisRestantes(pcState.perfil.id);
  if (!pcState.desafioCriarCargo) pcState.desafioCriarCargo = (CARGOS.find((c) => c.disponivel) || CARGOS[0]).id;
  if (!pcState.desafioCriarTipo) pcState.desafioCriarTipo = "eleitos";
  if (!pcState.desafioCriarPasso) pcState.desafioCriarPasso = 1;
  if (!pcState.desafioCriarSelecionados) pcState.desafioCriarSelecionados = new Set();
  if (!pcState.desafioCriarPartidosSel) pcState.desafioCriarPartidosSel = new Set();
  if (!pcState.desafioCriarVotos) pcState.desafioCriarVotos = {};
  if (!pcState.desafioCriarAmigos) {
    if (pcState.perfil) await garantirMeusGruposCarregados();
    pcState.desafioCriarAmigos = await listarAmigosParaDesafio(pcState.meusGrupos);
  }
  const amigos = pcState.desafioCriarAmigos;
  const custo = gratis > 0 ? 0 : 10;
  if (!pcState._desafioMinhasListas) pcState._desafioMinhasListas = await _carregarMinhasListasNormalizado();
  const minhasListasFonte = pcState._desafioMinhasListas || [];

  const cargo = pcState.desafioCriarCargo;
  const tipo = pcState.desafioCriarTipo;
  const passo = pcState.desafioCriarPasso;
  const pool = _poolCandidatosDesafio(cargo);
  const vagas = vagasFixasCargo(pcState.estado, cargo);
  if (!pcState.desafioCriarCadeiras || pcState.desafioCriarCadeiras.length !== vagas || pcState._desafioCadeirasCargo !== cargo) {
    pcState.desafioCriarCadeiras = new Array(vagas).fill(null);
    // Cadeiras já nascem com os ELEITOS MARCADOS na fonte escolhida
    // (decisão do usuário, 30/08/2026).
    const jaEleitos = pool.filter((c) => c.marcadoEleito)
      .sort((a, b) => (b.votos || 0) - (a.votos || 0)).slice(0, vagas);
    jaEleitos.forEach((c, i) => {
      pcState.desafioCriarCadeiras[i] = { chave: c.chave, nome: c.nome, partido: c.partido };
    });
    pcState._desafioCadeirasCargo = cargo;
    pcState.desafioCriarCadeiraAtiva = null;
  }
  const cadeiras = pcState.desafioCriarCadeiras;
  const preenchidas = cadeiras.filter(Boolean).length;

  const partidos = [...new Set(pool.map((c) => c.partido))].sort();
  const contagemPartido = {};
  pool.forEach((c) => { contagemPartido[c.partido] = (contagemPartido[c.partido] || 0) + 1; });
  const busca = (pcState.desafioCriarBusca || "").trim().toLowerCase();
  const poolBusca = tipo === "candidato" ? pool.filter((c) => !busca || c.nome.toLowerCase().includes(busca)).slice(0, 30) : [];

  let selecionados = [];
  if (tipo === "cargo") selecionados = pool;
  else if (tipo === "partido") selecionados = pool.filter((c) => pcState.desafioCriarPartidosSel.has(c.partido));
  else if (tipo === "candidato") selecionados = pool.filter((c) => pcState.desafioCriarSelecionados.has(c.chave));

  const tipoInfo = DESAFIO_TIPOS.find((t) => t.id === tipo);
  const cargoRotulo = ((CARGOS.find((c) => c.id === cargo) || {}).label || "").replace(/^Dep\.\s*/, "");
  const fonteNome = pcState.desafioCriarFonteId
    ? ((minhasListasFonte.find((l) => l.id === pcState.desafioCriarFonteId) || {}).nome || "lista salva")
    : "lista em edição";

  // Indicador 1-2-3 no topo — mesma família do Farol (pontos com check).
  const ck = `<svg viewBox="0 0 16 16" width="11" height="11"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  const passosHtml = `
    <div class="pc-duelo-passos">
      ${[["Disputa", 1], ["Palpite", 2], ["Rival", 3]].map(([rot, n], i) => `
        ${i > 0 ? `<span class="pc-duelo-passo-fio${passo > i ? " on" : ""}"></span>` : ""}
        <span class="pc-duelo-passo${passo === n ? " atual" : passo > n ? " feito" : ""}">
          <span class="bol">${passo > n ? ck : n}</span><span class="rot">${rot}</span>
        </span>`).join("")}
    </div>`;

  const resumoHtml = (texto, voltaPra) => `
    <div class="pc-duelo-resumo">
      <span class="ic">${ck}</span>
      <span class="tx">${texto}</span>
      <button type="button" class="mudar" data-pc-duelo-volta="${voltaPra}">mudar</button>
    </div>`;

  const okPasso1 = tipo === "cargo" || tipo === "eleitos"
    || (tipo === "partido" && pcState.desafioCriarPartidosSel.size > 0)
    || (tipo === "candidato" && pcState.desafioCriarSelecionados.size > 0);
  const okPasso2 = tipo === "eleitos" ? (!!pcState.desafioCriarFonteId && preenchidas === vagas) : selecionados.length > 0;
  const resumoDisputa = `${cargoRotulo} · ${tipoInfo.rotulo}${tipo === "partido" ? ` · <b>${[...pcState.desafioCriarPartidosSel].join(", ")}</b> (${selecionados.length})` : tipo === "candidato" ? ` · <b>${selecionados.length} candidato${selecionados.length === 1 ? "" : "s"}</b>` : tipo === "eleitos" ? ` · <b>${vagas} cadeiras</b>` : ` · <b>${pool.length} candidatos</b>`}`;

  const maxVotoSel = Math.max(1, ...selecionados.map((c) => Number(pcState.desafioCriarVotos[c.chave] ?? c.votos) || 0));

  let corpo = "";
  if (passo === 1) {
    corpo = `
      <label class="pc-campo-label">Cargo</label>
      <div class="pc-cargo-switch" style="margin-bottom:12px;">
        ${CARGOS.filter((c) => c.disponivel).map((c) => `<button type="button" class="${c.id === cargo ? "active" : ""}" data-pc-cargo-desafio="${c.id}">${c.label.replace(/^Dep\.\s*/, "")}</button>`).join("")}
      </div>

      <label class="pc-campo-label">Disputa</label>
      <div class="pc-cargo-switch" style="margin-bottom:6px;">
        ${DESAFIO_TIPOS.map((t) => `<button type="button" class="${t.id === tipo ? "active" : ""}" data-pc-tipo-desafio="${t.id}">${t.rotulo}</button>`).join("")}
      </div>
      <div class="pc-sub" style="margin:0 2px 14px;">${tipoInfo.dica}</div>

      ${tipo === "partido" ? `
        <label class="pc-campo-label">Quais partidos</label>
        <div style="margin-bottom:8px;">
          ${partidos.map((p) => `<span class="pc-chip-partido ${pcState.desafioCriarPartidosSel.has(p) ? "sel" : ""}" data-pc-chip-partido="${escaparAtributoHtml(p)}">${p} · ${contagemPartido[p]}</span>`).join("")}
        </div>
      ` : ""}

      ${tipo === "candidato" ? `
        <label class="pc-campo-label">Quais candidatos</label>
        <input class="cell" id="pcBuscaCandDesafio" placeholder="Buscar candidato…" value="${escaparAtributoHtml(pcState.desafioCriarBusca || "")}" style="width:100%; margin-bottom:10px;">
        <div class="pc-grade-cand">
          ${poolBusca.map((c) => `
            <label class="pc-cand-row">
              <input type="checkbox" data-pc-cand-check="${escaparAtributoHtml(c.chave)}" ${pcState.desafioCriarSelecionados.has(c.chave) ? "checked" : ""}>
              <span class="txt"><span class="nome">${c.nome}</span><span class="partido">${c.partido}</span></span>
            </label>`).join("") || `<div class="pc-sub">Nenhum candidato encontrado.</div>`}
        </div>
      ` : ""}

      ${okPasso1 && tipo !== "eleitos" && tipo !== "cargo" ? `<div class="pc-sub" style="margin:2px 2px 4px;">${selecionados.length} candidato${selecionados.length === 1 ? "" : "s"} no duelo.</div>` : ""}
      ${tipo === "cargo" ? `<div class="pc-sub" style="margin:2px 2px 4px;">Todos os ${pool.length} candidatos de ${cargoRotulo} entram no duelo.</div>` : ""}

      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="ghost" id="pcBtnVoltarCriarDesafio" style="flex:1;">Cancelar</button>
        <button class="primary" id="pcBtnPassoAvancar" style="flex:2;" ${okPasso1 ? "" : "disabled"}>Continuar</button>
      </div>`;
  } else if (passo === 2) {
    corpo = `
      ${resumoHtml(resumoDisputa, 1)}

      ${tipo === "eleitos" ? "" : (minhasListasFonte.length ? `
      <label class="pc-campo-label">Puxar palpites de</label>
      <select class="cell" id="pcSelFonteDuelo" style="width:100%; margin-bottom:12px;">
        <option value="">Lista em edição (rascunho atual)</option>
        ${minhasListasFonte.map((l) => `<option value="${l.id}" ${pcState.desafioCriarFonteId === l.id ? "selected" : ""}>${escaparAtributoHtml(l.nome)}${l.depositadoEm ? " · depositada" : ""}</option>`).join("")}
      </select>` : "")}

      ${tipo === "eleitos" ? `
        ${!minhasListasFonte.length ? `
        <div class="pc-sub" style="text-align:center; padding:18px 10px; margin-bottom:4px;">Você ainda não tem uma lista salva pra usar num duelo de eleitos — duelo de eleitos é sempre sobre uma lista de verdade, não uma composição avulsa.</div>
        <button type="button" class="primary" id="pcBtnCadastrarListaDuelo" style="width:100%;">Cadastrar lista</button>
        ` : `
        <label class="pc-campo-label">Puxar sua lista de eleitos de</label>
        <select class="cell" id="pcSelFonteDuelo" style="width:100%; margin-bottom:12px;">
          <option value="">Selecione uma lista salva…</option>
          ${minhasListasFonte.map((l) => `<option value="${l.id}" ${pcState.desafioCriarFonteId === l.id ? "selected" : ""}>${escaparAtributoHtml(l.nome)}${l.depositadoEm ? " · depositada" : ""}</option>`).join("")}
        </select>
        ${pcState.desafioCriarFonteId ? `
        <div class="pc-duelo-resumo-fonte${preenchidas === vagas ? " ok" : " faltando"}" style="background:#101214; border:1px solid ${preenchidas === vagas ? "rgba(52,232,74,.4)" : "rgba(198,230,42,.4)"}; border-radius:12px; padding:12px 14px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:baseline;">
            <span style="font-size:13px; font-weight:800;">${escaparAtributoHtml(minhasListasFonte.find((l) => l.id === pcState.desafioCriarFonteId)?.nome || "")}</span>
            <span style="font-size:12px; font-weight:800; font-variant-numeric:tabular-nums; color:${preenchidas === vagas ? "var(--pc-accent)" : "var(--pc-warning)"};">${preenchidas} / ${vagas} cadeiras</span>
          </div>
          <div class="pc-sub" style="margin-top:4px;">${preenchidas === vagas ? "Plenário completo — pronta pra duelar." : `Faltam ${vagas - preenchidas} cadeiras nessa lista pra ${cargoRotulo} — complete antes, ou escolha outra.`}</div>
        </div>` : `<div class="pc-sub" style="margin:2px 2px 14px;">Escolha uma lista salva pra puxar o plenário.</div>`}
        `}
      ` : `
        <div style="font-size:11px; color:var(--pc-ink-dim); line-height:1.5; margin:0 2px 10px;">Monte a sua lista com maior precisão no painel de palpite. Por lá você consegue acessar informações eleitorais e cadastrais de cada candidato.</div>
        <label class="pc-campo-label">Seus votos indicados</label>
        <div class="pc-duelo-colcab"><span class="cand">Candidato</span><span class="rival">2022</span><span class="voce" style="width:118px;">Você</span></div>
        <div class="pc-lobby-card" style="padding:2px 14px; margin-bottom:14px; max-height:420px; overflow-y:auto;">
          ${(() => {
            // Agrupado por partido, ordenado pela referência de 2022 (não há
            // "rival" ainda nesta etapa — quem cria o duelo ainda não tem
            // adversário). Os campos usam o mesmo [data-pc-voto] já
            // conectado a pcState.desafioCriarVotos no resto deste passo.
            const grupos = new Map();
            selecionados.forEach((c) => { if (!grupos.has(c.partido)) grupos.set(c.partido, []); grupos.get(c.partido).push(c); });
            const ref2022 = (c) => Number(c.votos) || 0;
            const ordemG = [...grupos.entries()].sort((a, b) =>
              b[1].reduce((t, c) => t + ref2022(c), 0) - a[1].reduce((t, c) => t + ref2022(c), 0));
            return ordemG.map(([partido, cands]) => `
              <div class="pc-aceitar-gcab"><span class="sigla">${partido}</span></div>
              ${[...cands].sort((a, b) => ref2022(b) - ref2022(a)).map((c) => `
              <div class="pc-voto-linha">
                <span class="txt"><span class="nome">${c.nome}</span></span>
                <span class="pc-voto-rival">${ref2022(c).toLocaleString("pt-BR")}</span>
                <span class="pc-voto-ajuste">
                  <input type="number" min="0" inputmode="numeric" data-pc-voto="${escaparAtributoHtml(c.chave)}" value="${pcState.desafioCriarVotos[c.chave] ?? ""}" placeholder="0">
                </span>
              </div>`).join("")}`).join("");
          })()}
        </div>
      `}

      <div style="display:flex; gap:8px; margin-top:14px;">
        <button class="ghost" id="pcBtnPassoVoltar" style="flex:1;">Voltar</button>
        <button class="primary" id="pcBtnPassoAvancar" style="flex:2;" ${okPasso2 ? "" : "disabled"}>Continuar</button>
      </div>`;
  } else {
    const alvoModo = pcState.desafioCriarAlvoModo;
    corpo = `
      ${resumoHtml(`${resumoDisputa} · votos da <b>${escaparAtributoHtml(fonteNome)}</b>`, 2)}

      <label class="pc-campo-label">Quem você desafia</label>
      ${pcState.desafioCriarAlvo ? `
        <div class="pc-amigo-op" style="border-bottom:none; padding-left:0;">
          <span class="pc-cedula-anel" style="width:16px; height:16px; border-color:var(--pc-accent); background:radial-gradient(circle at center, var(--pc-accent) 0 40%, transparent 45%);"></span>
          <span class="pc-duelo-avatar eu" style="width:28px; height:28px; font-size:10px;">${pcState.desafioCriarAlvo.aberto ? iconeSvg("convidar", 13) : _iniciaisNome(pcState.desafioCriarAlvo.nome)}</span>
          <span style="flex:1; font-size:12.5px; font-weight:600;">${pcState.desafioCriarAlvo.nome}${pcState.desafioCriarAlvo.aberto ? `<br><span style="font-size:10px; font-weight:400; color:var(--pc-ink-dim);">o link do convite aparece depois de enviar</span>` : ""}</span>
          <button type="button" class="ghost" id="pcBtnTrocarAlvo" style="font-size:10.5px; padding:5px 10px;">Trocar</button>
        </div>
      ` : `
        <button type="button" class="pc-duelo-aberto-op" id="pcBtnDueloAberto">
          <span class="pc-duelo-aberto-ic">${iconeSvg("convidar", 16)}</span>
          <span class="pc-duelo-aberto-tx"><b>Quem ainda não está no jogo</b><i>Convite de WhatsApp — a pessoa entra e cai direto no seu duelo.</i></span>
        </button>
        ${amigos.length ? `
        <button type="button" class="pc-duelo-aberto-op neutro" id="pcBtnAlvoGrupo">
          <span class="pc-duelo-aberto-ic neutro">${iconeSvg("grupos", 16)}</span>
          <span class="pc-duelo-aberto-tx"><b>Alguém do meu grupo</b><i>${amigos.slice(0, 2).map((a) => a.nome.split(" ")[0]).join(", ")}${amigos.length > 2 ? ` e mais ${amigos.length - 2}` : ""}</i></span>
        </button>
        ${alvoModo === "grupo" ? `
        <div class="pc-lobby-card" style="padding:4px 14px; margin-bottom:8px;">${amigos.map((a) => `
          <button type="button" class="pc-amigo-op" data-pc-alvo-amigo="${a.id}" data-pc-alvo-nome="${escaparAtributoHtml(a.nome)}" style="width:100%; background:none; border:none; border-bottom:1px solid var(--pc-glass-border); cursor:pointer; font-family:inherit;">
            <span class="pc-duelo-avatar" style="width:28px; height:28px; font-size:10px;">${_iniciaisNome(a.nome)}</span>
            <span style="flex:1; font-size:12.5px; font-weight:600; text-align:left;">${a.nome}</span>
            <span style="font-size:10px; color:var(--pc-ink-dim);">${a.grupo}</span>
          </button>`).join("")}</div>` : ""}` : ""}
        <button type="button" class="pc-duelo-aberto-op neutro" id="pcBtnAlvoCodigo">
          <span class="pc-duelo-aberto-ic neutro">${iconeSvg("chave", 15)}</span>
          <span class="pc-duelo-aberto-tx"><b>Pelo código do usuário</b><i>SL-XXXXXX de quem já joga.</i></span>
        </button>
        ${alvoModo === "codigo" ? `
        <div style="display:flex; gap:8px; margin-bottom:6px;">
          <input class="cell" id="pcInputCodigoDesafio" placeholder="Código do usuário (SL-XXXXXX)" maxlength="9" value="${escaparAtributoHtml(pcState.desafioCriarCodigoInput || "")}" style="flex:1;">
          <button type="button" class="ghost" id="pcBtnBuscarCodigo" style="flex-shrink:0;">Buscar</button>
        </div>
        ${pcState.desafioCriarCodigoStatus ? `<div class="pc-sub" style="margin:-2px 0 10px;">${pcState.desafioCriarCodigoStatus}</div>` : ""}` : ""}
      `}

      <label class="pc-campo-label" style="margin-top:12px;">Nome do duelo</label>
      <input class="cell" id="pcInputNomeDesafio" placeholder="Duelo de Titãs" maxlength="40" value="${escaparAtributoHtml(pcState.desafioCriarNome || "")}" style="width:100%; margin-bottom:10px;">

      <div class="pc-precinho">
        <span class="pc-precinho-txt"><b>Grátis</b> — duelar não custa SL, desafie quantos quiser.</span>
        <span class="pc-precinho-val" style="color:var(--pc-accent);">grátis</span>
      </div>

      <div style="display:flex; gap:8px;">
        <button class="ghost" id="pcBtnPassoVoltar" style="flex:1;">Voltar</button>
        <button class="primary" id="pcBtnEnviarDesafio" style="flex:2;" ${pcState.desafioCriarAlvo ? "" : "disabled"}>Enviar duelo</button>
      </div>
      <div class="pc-status" id="pcCriarDesafioStatus" style="margin-top:8px; min-height:12px;"></div>`;
  }

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnSairCriarDesafio" style="margin-bottom:12px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Duelos</button>
      <h2 style="margin-bottom:10px;">Criar duelo</h2>
      ${passosHtml}
      ${corpo}
    </div>`;

  const irPara = (n) => { pcState.desafioCriarPasso = n; renderCriarDesafio(); };
  document.getElementById("pcBtnSairCriarDesafio").addEventListener("click", () => renderDesafiosHub());
  const btnVoltarP = document.getElementById("pcBtnPassoVoltar");
  if (btnVoltarP) btnVoltarP.addEventListener("click", () => irPara(passo - 1));
  const btnVoltarCriar = document.getElementById("pcBtnVoltarCriarDesafio");
  if (btnVoltarCriar) btnVoltarCriar.addEventListener("click", () => renderDesafiosHub());
  const btnAvancar = document.getElementById("pcBtnPassoAvancar");
  if (btnAvancar) btnAvancar.addEventListener("click", () => irPara(passo + 1));
  document.querySelectorAll("[data-pc-duelo-volta]").forEach((b) => b.addEventListener("click", () => irPara(Number(b.getAttribute("data-pc-duelo-volta")))));

  // --- Passo 1 ---
  document.querySelectorAll("[data-pc-cargo-desafio]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioCriarCargo = btn.getAttribute("data-pc-cargo-desafio");
    pcState.desafioCriarSelecionados = new Set();
    pcState.desafioCriarPartidosSel = new Set();
    pcState.desafioCriarVotos = {};
    renderCriarDesafio();
  }));
  document.querySelectorAll("[data-pc-tipo-desafio]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioCriarTipo = btn.getAttribute("data-pc-tipo-desafio");
    pcState.desafioCriarVotos = {};
    pcState.desafioCriarBusca = "";
    renderCriarDesafio();
  }));
  document.querySelectorAll("[data-pc-chip-partido]").forEach((chip) => chip.addEventListener("click", () => {
    const p = chip.getAttribute("data-pc-chip-partido");
    if (pcState.desafioCriarPartidosSel.has(p)) pcState.desafioCriarPartidosSel.delete(p);
    else pcState.desafioCriarPartidosSel.add(p);
    renderCriarDesafio();
  }));
  const inputBusca = document.getElementById("pcBuscaCandDesafio");
  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => { pcState.desafioCriarBusca = e.target.value; renderCriarDesafio(); });
    if (pcState.desafioCriarBusca) { inputBusca.focus(); inputBusca.setSelectionRange(inputBusca.value.length, inputBusca.value.length); }
  }
  document.querySelectorAll("[data-pc-cand-check]").forEach((chk) => chk.addEventListener("change", (e) => {
    const chave = chk.getAttribute("data-pc-cand-check");
    if (e.target.checked) pcState.desafioCriarSelecionados.add(chave);
    else { pcState.desafioCriarSelecionados.delete(chave); delete pcState.desafioCriarVotos[chave]; }
    renderCriarDesafio();
  }));

  // --- Passo 2 ---
  const btnCadastrarListaDuelo = document.getElementById("pcBtnCadastrarListaDuelo");
  if (btnCadastrarListaDuelo) btnCadastrarListaDuelo.addEventListener("click", () => {
    pcState.subaba = "selecao";
    renderAppColaborativo();
  });
  const selFonte = document.getElementById("pcSelFonteDuelo");
  if (selFonte) selFonte.addEventListener("change", async () => {
    const id = selFonte.value || null;
    pcState.desafioCriarFonteId = id;
    pcState.desafioCriarVotos = {};
    pcState.desafioCriarCadeiras = null;
    if (!id) {
      pcState._desafioFonteCargos = null;
      renderCriarDesafio();
      return;
    }
    selFonte.disabled = true;
    const completo = await carregarSalvamentoCompleto(id);
    pcState._desafioFonteCargos = completo ? completo.cargos : null;
    renderCriarDesafio();
  });
  document.querySelectorAll("[data-pc-cadeira]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.getAttribute("data-pc-cadeira"));
    pcState.desafioCriarCadeiraAtiva = pcState.desafioCriarCadeiraAtiva === i ? null : i;
    pcState.desafioCriarBuscaCadeira = "";
    renderCriarDesafio();
  }));
  document.querySelectorAll("[data-pc-cadeira-sentar]").forEach((btn) => btn.addEventListener("click", () => {
    const chave = btn.getAttribute("data-pc-cadeira-sentar");
    const cand = pool.find((c) => c.chave === chave);
    if (cand == null || pcState.desafioCriarCadeiraAtiva == null) return;
    cadeiras[pcState.desafioCriarCadeiraAtiva] = { chave: cand.chave, nome: cand.nome, partido: cand.partido };
    const proxima = cadeiras.findIndex((c) => !c);
    pcState.desafioCriarCadeiraAtiva = proxima === -1 ? null : proxima;
    pcState.desafioCriarBuscaCadeira = "";
    renderCriarDesafio();
  }));
  const btnEsvaziar = document.getElementById("pcBtnEsvaziarCadeira");
  if (btnEsvaziar) btnEsvaziar.addEventListener("click", () => {
    cadeiras[pcState.desafioCriarCadeiraAtiva] = null;
    renderCriarDesafio();
  });
  const buscaCadeira = document.getElementById("pcBuscaCadeira");
  if (buscaCadeira) {
    buscaCadeira.addEventListener("input", (e) => {
      pcState.desafioCriarBuscaCadeira = e.target.value;
      renderCriarDesafio();
    });
    if (pcState.desafioCriarBuscaCadeira) { buscaCadeira.focus(); buscaCadeira.setSelectionRange(buscaCadeira.value.length, buscaCadeira.value.length); }
  }
  document.querySelectorAll("[data-pc-voto]").forEach((inp) => inp.addEventListener("input", () => {
    pcState.desafioCriarVotos[inp.getAttribute("data-pc-voto")] = inp.value;
  }));

  // --- Passo 3 ---
  const btnDueloAberto = document.getElementById("pcBtnDueloAberto");
  if (btnDueloAberto) btnDueloAberto.addEventListener("click", () => {
    pcState.desafioCriarAlvo = { id: null, nome: "Convite aberto — quem clicar primeiro", aberto: true };
    pcState.desafioCriarAlvoModo = null;
    renderCriarDesafio();
  });
  const btnAlvoGrupo = document.getElementById("pcBtnAlvoGrupo");
  if (btnAlvoGrupo) btnAlvoGrupo.addEventListener("click", () => {
    pcState.desafioCriarAlvoModo = pcState.desafioCriarAlvoModo === "grupo" ? null : "grupo";
    renderCriarDesafio();
  });
  const btnAlvoCodigo = document.getElementById("pcBtnAlvoCodigo");
  if (btnAlvoCodigo) btnAlvoCodigo.addEventListener("click", () => {
    pcState.desafioCriarAlvoModo = pcState.desafioCriarAlvoModo === "codigo" ? null : "codigo";
    renderCriarDesafio();
  });
  document.querySelectorAll("[data-pc-alvo-amigo]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioCriarAlvo = { id: btn.getAttribute("data-pc-alvo-amigo"), nome: btn.getAttribute("data-pc-alvo-nome") };
    pcState.desafioCriarAlvoModo = null;
    renderCriarDesafio();
  }));
  const btnTrocarAlvo = document.getElementById("pcBtnTrocarAlvo");
  if (btnTrocarAlvo) btnTrocarAlvo.addEventListener("click", () => {
    pcState.desafioCriarAlvo = null; pcState.desafioCriarCodigoStatus = "";
    renderCriarDesafio();
  });
  const inputCodigo = document.getElementById("pcInputCodigoDesafio");
  if (inputCodigo) inputCodigo.addEventListener("input", (e) => { pcState.desafioCriarCodigoInput = e.target.value; });
  const btnBuscarCodigo = document.getElementById("pcBtnBuscarCodigo");
  if (btnBuscarCodigo) btnBuscarCodigo.addEventListener("click", async () => {
    const codigo = (document.getElementById("pcInputCodigoDesafio").value || "").trim();
    if (!codigo) { pcState.desafioCriarCodigoStatus = "Digite um código."; renderCriarDesafio(); return; }
    btnBuscarCodigo.disabled = true;
    const r = await buscarUsuarioPorCodigo(codigo);
    if (!r.ok) { pcState.desafioCriarCodigoStatus = r.mensagem; renderCriarDesafio(); return; }
    if (r.usuario.id === pcState.perfil.id) { pcState.desafioCriarCodigoStatus = "Esse é o seu próprio código."; renderCriarDesafio(); return; }
    pcState.desafioCriarAlvo = r.usuario;
    pcState.desafioCriarCodigoStatus = "";
    pcState.desafioCriarAlvoModo = null;
    renderCriarDesafio();
  });
  const inputNomeD = document.getElementById("pcInputNomeDesafio");
  if (inputNomeD) inputNomeD.addEventListener("input", (e) => { pcState.desafioCriarNome = e.target.value; });

  const btnEnviar = document.getElementById("pcBtnEnviarDesafio");
  if (btnEnviar) btnEnviar.addEventListener("click", async () => {
    // Tira aspas digitadas no campo (o placeholder antigo, '"Duelo de
    // Titãs"', induzia a pessoa a incluir as aspas no nome — 05/09/2026).
    const nome = (pcState.desafioCriarNome || "").trim().replace(/^[\s"“”']+|[\s"“”']+$/g, "");
    const status = document.getElementById("pcCriarDesafioStatus");
    if (!nome) { status.textContent = "Dê um nome pro duelo."; return; }
    if (!pcState.desafioCriarAlvo) { status.textContent = "Escolha quem você desafia."; return; }
    let escopo = [], meusVotos = [], eleitos = null;
    if (tipo === "eleitos") {
      if (preenchidas !== vagas) { status.textContent = `Preencha as ${vagas} cadeiras antes de enviar.`; return; }
      eleitos = cadeiras.map((c) => ({ chave: c.chave, nome: c.nome, partido: c.partido }));
    } else {
      if (!selecionados.length) { status.textContent = "Escolha ao menos 1 candidato."; return; }
      escopo = selecionados.map((c) => ({ chave: c.chave, nome: c.nome, partido: c.partido }));
      meusVotos = selecionados.map((c) => ({ chave: c.chave, votos: Number(pcState.desafioCriarVotos[c.chave] ?? c.votos) || 0 }));
    }
    btnEnviar.disabled = true;
    status.textContent = "Enviando…";
    const r = await criarDesafio(pcState.desafioCriarAlvo.aberto ? null : pcState.desafioCriarAlvo.id, nome, pcState.estado, cargo, escopo, meusVotos, tipo, true, eleitos);
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; btnEnviar.disabled = false; return; }
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
    if (pcState.desafioCriarAlvo.aberto && r.desafio) pcState.desafioDestacadoId = r.desafio.id;
    pcState.desafioCriarAmigos = null;
    pcState.desafioCriarCadeiras = null;
    pcState._desafioMinhasListas = null;
    pcState._desafioFonteCargos = null;
    pcState.desafioCriarFonteId = null;
    pcState.desafioCriarPasso = 1;
    pcState.desafioCriarAlvoModo = null;
    renderDesafiosHub();
  });
}


async function renderAceitarDesafio() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando…");
  // desafio_detalhe é a única porta pros votos (migração 38).
  const desafio = await desafioDetalhe(pcState.desafioAceitarId);
  if (!desafio) { renderDesafiosHub(); return; }
  if (!pcState.desafioAceitarVotos) pcState.desafioAceitarVotos = {};
  if (!pcState.desafioAceitarFase) pcState.desafioAceitarFase = "convite";
  const fase = pcState.desafioAceitarFase;
  const nomeDesafiante = desafio.criador ? desafio.criador.nome : "Alguém";
  const escopo = desafio.escopo_candidatos || [];
  const cargoLabel = (CARGOS.find((c) => c.id === desafio.cargo) || {}).label || "";
  const ehEleitos = desafio.tipo_disputa === "eleitos";
  const votosRivalPorChave = new Map((desafio.votos_criador || []).map((v) => [v.chave, Number(v.votos) || 0]));

  const vagasDuelo = ehEleitos ? (desafio.eleitos_criador ? desafio.eleitos_criador.length : vagasFixasCargo(desafio.estado, desafio.cargo)) : 0;
  if (ehEleitos && (!pcState.desafioAceitarCadeiras || pcState.desafioAceitarCadeiras.length !== vagasDuelo)) {
    pcState.desafioAceitarCadeiras = new Array(vagasDuelo).fill(null);
    pcState.desafioAceitarCadeiraAtiva = null;
  }
  const cadeiras = pcState.desafioAceitarCadeiras || [];
  const preenchidas = cadeiras.filter(Boolean).length;
  const poolAceitar = ehEleitos ? _poolCandidatosDesafio(desafio.cargo) : [];

  const vsCard = `
      <div class="pc-duelo-card" style="margin-bottom:16px;">
        <div class="pc-duelo-duo">
          <span class="pc-duelo-lado"><span class="pc-duelo-avatar">${_iniciaisNome(nomeDesafiante)}</span><span class="pc-duelo-tx"><span class="pc-duelo-p">${nomeDesafiante}</span><span class="pc-duelo-c">${desafio.estado}</span></span></span>
          <span class="pc-duelo-vs">VS</span>
          <span class="pc-duelo-lado dir"><span class="pc-duelo-avatar eu">${_iniciaisNome(pcState.perfil.nome || "Você")}</span><span class="pc-duelo-tx"><span class="pc-duelo-p">Você</span><span class="pc-duelo-c">${ehEleitos ? `${vagasDuelo} cadeiras` : `${escopo.length} candidato${escopo.length === 1 ? "" : "s"}`}</span></span></span>
        </div>
      </div>`;

  if (fase === "convite") {
    // ===== Fase 1: o CONVITE — logo centralizada, a provocação e a
    // decisão Aceitar × Rejeitar. A lista só abre depois do aceite
    // (fluxo aprovado pelo usuário, 30/08/2026). =====
    conteudo.innerHTML = `
      <div class="glass-card" style="max-width:420px; margin:0 auto; text-align:center;">
        <div class="pc-logo-mark" style="margin:6px auto 10px;">
          <div class="pc-logo-fill cheio"></div>
          <span class="pc-logo-icone">
            <svg viewBox="0 0 16 16" width="26" height="26">
              <path d="M2.5 6.5h11v7a1.2 1.2 0 01-1.2 1.2H3.7A1.2 1.2 0 012.5 13.5v-7z" fill="none" stroke="currentColor" stroke-width="1.3"></path>
              <path d="M4.5 6.5h7" stroke="currentColor" stroke-width="1.3"></path>
              <rect x="6.6" y="2" width="3.4" height="4.8" rx=".5" fill="none" stroke="currentColor" stroke-width="1.2" transform="rotate(12 8.3 4.4)"></rect>
            </svg>
          </span>
        </div>
        <div style="font-size:11px; font-weight:800; letter-spacing:.08em; color:var(--pc-ink-dim); margin-bottom:14px;"><b style="color:var(--pc-accent);">Simula</b><span style="color:var(--pc-ink);">LEGIS</span></div>

        <h2 style="margin-bottom:6px;">Duelo 1×1</h2>
        <div class="pc-sub" style="margin-bottom:16px;">${nomeDesafiante} te desafiou para o 1×1 <b style="color:var(--pc-ink);">"${_nomeDueloLimpo(desafio.nome)}"</b> — indique o seu palpite para os candidatos da lista.</div>

        ${vsCard}

        <div style="display:flex; gap:8px;">
          <button class="ghost" id="pcBtnRejeitarConvite" style="flex:1;">Rejeitar</button>
          <button class="primary" id="pcBtnAceitarConvite" style="flex:2;">Aceitar</button>
        </div>
        <div class="pc-status" id="pcAceitarStatus" style="margin-top:8px; min-height:12px;"></div>
      </div>`;
    document.getElementById("pcBtnAceitarConvite").addEventListener("click", () => {
      pcState.desafioAceitarFase = "palpite";
      renderAceitarDesafio();
    });
    document.getElementById("pcBtnRejeitarConvite").addEventListener("click", async (e) => {
      e.target.disabled = true;
      const r = await recusarDesafio(pcState.desafioAceitarId);
      if (!r.ok) { document.getElementById("pcAceitarStatus").textContent = "Não deu: " + r.mensagem; e.target.disabled = false; return; }
      renderDesafiosHub();
    });
    return;
  }

  // ===== Fase 2: o PALPITE — a lista do desafiante com a coluna do
  // desafiante visível; fecha com "Depositar" (o aceite de verdade). =====
  // Reforma de 07/09/2026 (conceito aprovado pelo usuário): quem aceita
  // COMEÇA com os votos do desafiante já preenchidos e muda só o que
  // discorda; cada candidato tem a mesma anatomia da lista principal
  // (.pc-dep-crow + faderDepHtml) e um mini console por partido no padrão
  // EXATO do console da lista (montarConsoleHtml). Sem stepper de partido,
  // sem −/+ por linha, sem botão grande de copiar (virou comando do console).
  // Voto oculto (migração 38): o banco tira votos_criador do JSON — começa
  // zerado e sem a coluna do desafiante.
  const votosOcultos = !ehEleitos && desafio.votos_visiveis === false && !(desafio.votos_criador && desafio.votos_criador.length);
  if (!pcState.desafioAceitarHistorico) pcState.desafioAceitarHistorico = [];
  if (!ehEleitos && !votosOcultos && !pcState.desafioAceitarPreenchido) {
    escopo.forEach((c) => { pcState.desafioAceitarVotos[c.chave] = votosRivalPorChave.get(c.chave) || 0; });
    pcState.desafioAceitarPreenchido = true;
  }
  const votosAceitar = pcState.desafioAceitarVotos;
  // Régua, teto E e QE vindos das MESMAS funções da lista (capCandidatoDeputado,
  // totalValidosProjetado2026, quocienteEleitoral), avaliadas no recorte
  // uf/cargo DO DUELO — não no cargo que a pessoa tinha aberto na lista.
  const metricasD = ehEleitos ? null : _metricasRecorteDuelo(desafio.estado, desafio.cargo);
  const grupos = new Map();
  escopo.forEach((c) => { if (!grupos.has(c.partido)) grupos.set(c.partido, []); grupos.get(c.partido).push(c); });
  const somaRival = (cands) => cands.reduce((t, c) => t + (votosRivalPorChave.get(c.chave) || 0), 0);
  const ordemG = [...grupos.entries()].sort((a, b) => somaRival(b[1]) - somaRival(a[1]));
  const comandosDuelo = ehEleitos ? [] : [
    {
      id: "pcDueloBtnVoltar", icone: "desfazer", tamanho: 15, titulo: "Desfazer",
      legenda: "Desfaz a última alteração feita nesta tela — um voto digitado, um arrasto de barra. Só volta um passo por vez.",
      disabled: !pcState.desafioAceitarHistorico.length,
    },
    {
      id: "pcDueloBtnZerar", icone: "borracha", tamanho: 14, titulo: "Zerar tudo",
      legenda: "Limpa de uma vez a sua votação de todos os candidatos deste duelo. Indicado pra quem quer montar do zero absoluto.",
    },
    ...(votosOcultos ? [] : [{
      id: "pcDueloBtnCopiar", icone: "copiar", tamanho: 15, titulo: `Copiar o palpite de ${nomeDesafiante.split(" ")[0]}`,
      legenda: "Recoloca os votos do desafiante em todos os candidatos — o ponto de partida desta tela.",
    }]),
  ];
  // Um console por partido do recorte; se o duelo é o cargo inteiro, um
  // console geral igual ao da lista (teto E projetado). Os comandos ficam
  // só no primeiro console (valem pro duelo inteiro).
  const consolesD = ehEleitos ? [] : (desafio.tipo_disputa === "cargo"
    ? [_consoleDueloSpec({ idx: 0, rotulo: "Votos", chaves: escopo.map((c) => c.chave), ref2022: null, metricas: metricasD })]
    : ordemG.map(([partido, cands], i) => _consoleDueloSpec({
        idx: i, rotulo: `Votos ${partido}`, chaves: cands.map((c) => c.chave),
        ref2022: _votosLegenda2022Duelo(desafio.estado, desafio.cargo, partido), metricas: metricasD,
      })));
  const consoleHtmlDe = (spec, i) => montarConsoleHtml({
    ...spec.slots(votosAceitar),
    comandos: i === 0 ? comandosDuelo : null,
    idLegendaToggle: "pcDueloCmdLegendaToggle",
    legendaAberta: !!pcState.dueloLegendaAberta,
  }) + (i === 0 && pcState.dueloLegendaAberta ? renderLegendaComandos(comandosDuelo) : "");
  // Mesmo padrão da lista de palpites (nomeExibicao, ícone do Instagram,
  // ícone/painel de bens e recursos, referência de 2022) — pedido do
  // usuário 09/09/2026, protótipo aprovado em _proto-duelo-refino.html.
  // A votação de cada lado (desafiante/você) vira duas colunas centradas
  // à direita, com um trilho vertical contínuo entre elas.
  const linhaCandidatoHtml = (c) => {
    const v = Number(votosAceitar[c.chave]) || 0;
    const linkInsta = linkInstagramDe(c.chave);
    const instaDepois = linkInsta ? `<a href="${escaparAtributoHtml(linkInsta)}" target="_blank" rel="noopener noreferrer" title="Instagram do candidato" class="pc-insta-mini" onclick="event.stopPropagation()">${iconeSvg("instagram", 14)}</a>` : "";
    const { icone: iconeFinanceiro, painel: painelFinanceiro } = financeiroIconeHtml(c);
    return `
      <div class="pc-duelo-crow${votosOcultos ? " oculto" : ""}" data-dep-cand="${escaparAtributoHtml(c.chave)}">
        <div class="pc-dep-cnm">
          <span class="pc-dep-cnm-txt">${nomeExibicao(c)}</span>
          <span class="cnm-icones">${instaDepois}${iconeFinanceiro}</span>
        </div>
        <div class="pc-dep-pos">${c.partido}</div>
        ${votosOcultos ? "" : `<div class="col-rival"><span class="pc-voto-rival">${(votosRivalPorChave.get(c.chave) || 0).toLocaleString("pt-BR")}</span></div>`}
        <div class="col-voce"><input type="number" min="0" inputmode="numeric" data-pc-voto-aceitar="${escaparAtributoHtml(c.chave)}" value="${v}" placeholder="0"></div>
        ${Number(c.votos2022) > 0 ? `<div class="pc-dep-c2022">2022: ${Number(c.votos2022).toLocaleString("pt-BR")} votos${c.eleito2022 ? " · eleito" : ""}</div>` : ""}
        ${painelFinanceiro}
        ${faderDepHtml("d|" + c.chave, v, metricasD.cap, true)}
      </div>`;
  };
  // Cabeçalho das colunas uma vez só, logo abaixo do primeiro console
  // (dentro do card, então sem o padding lateral próprio do .pc-duelo-colcab
  // — o pc-lobby-card ao redor já dá 14px). Colunas centralizadas, mesma
  // largura fixa das linhas (92px), pra alinhar com "Desafiante"/"Você".
  const colcabHtml = `<div class="pc-duelo-colcab v2${votosOcultos ? " oculto" : ""}"><span class="cand"></span>${votosOcultos ? "" : `<span class="rival">Desafiante</span>`}<span class="voce">Você</span></div>`;
  const consolesHtml = ehEleitos ? "" : (desafio.tipo_disputa === "cargo" ? consoleHtmlDe(consolesD[0], 0) + `<div style="height:12px;"></div>` : "");
  const gruposHtml = ehEleitos ? "" : ordemG.map(([partido, cands], i) => `
    ${desafio.tipo_disputa === "cargo" ? "" : consoleHtmlDe(consolesD[i], i) + (i === 0 ? "" : `<div style="height:12px;"></div>`)}
    ${i === 0 ? colcabHtml : ""}
    ${[...cands].sort((a, b) => (votosRivalPorChave.get(b.chave) || 0) - (votosRivalPorChave.get(a.chave) || 0)).map(linhaCandidatoHtml).join("")}`).join("");

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:560px; margin:0 auto;">
      <div style="text-align:center;"><div class="pc-selo-desafio" style="margin:0 auto;">
        <span class="pc-selo-desafio-ic">${iconeSvg("desafio", 17)}</span>
        <span class="pc-selo-desafio-tx">Duelo<b>1 × 1</b></span>
      </div></div>
      <h2 style="margin:10px 0 2px; text-align:center;">"${_nomeDueloLimpo(desafio.nome)}"</h2>
      <div class="pc-sub" style="margin-bottom:14px; text-align:center;">${ehEleitos
        ? `Monte o SEU plenário de ${cargoLabel} (${vagasDuelo} cadeira${vagasDuelo === 1 ? "" : "s"}). Ao depositar, fica travado até a apuração.`
        : `Indique seus votos na lista do desafio.`}</div>

      ${ehEleitos ? `
        <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:6px;">
          <label class="pc-campo-label" style="margin:0;">Seu plenário</label>
          <span style="font-size:11px; font-weight:800; color:var(--pc-accent); font-variant-numeric:tabular-nums;">${preenchidas}<span style="color:var(--pc-ink-dim); font-weight:600;"> / ${vagasDuelo}</span></span>
        </div>
        <div class="pc-duelo-progresso"><i style="width:${vagasDuelo ? (preenchidas / vagasDuelo * 100).toFixed(1) : 0}%;"></i></div>
        ${_duelaGradeCadeiras(cadeiras, pcState.desafioAceitarCadeiraAtiva, "pc-acadeira")}
        ${_duelaGavetaCadeira(cadeiras, pcState.desafioAceitarCadeiraAtiva, poolAceitar, pcState.desafioAceitarBuscaCadeira, "pc-acadeira")}
      ` : `
        ${consolesHtml}
        <div class="pc-lobby-card" style="padding:2px 14px; margin-bottom:14px;">
          ${gruposHtml}
        </div>
      `}

      <button class="primary" id="pcBtnConfirmarAceite" style="width:100%;" ${ehEleitos && preenchidas !== vagasDuelo ? "disabled" : ""}>Depositar</button>
      <button class="ghost" id="pcBtnVoltarConvite" style="width:100%; margin-top:6px; border:none; color:var(--pc-ink-dim);">Voltar</button>
      <div class="pc-status" id="pcAceitarStatus" style="margin-top:8px; min-height:12px;"></div>
    </div>`;

  document.getElementById("pcBtnVoltarConvite").addEventListener("click", () => {
    pcState.desafioAceitarFase = "convite";
    renderAceitarDesafio();
  });

  if (!ehEleitos) {
    const snapDuelo = () => {
      pcState.desafioAceitarHistorico.push(JSON.parse(JSON.stringify(votosAceitar)));
      if (pcState.desafioAceitarHistorico.length > 30) pcState.desafioAceitarHistorico.shift();
      const bV = document.getElementById("pcDueloBtnVoltar");
      if (bV) bV.disabled = false;
    };
    const atualizarConsoles = () => consolesD.forEach((spec) => spec.atualizar(votosAceitar));
    const aoMudarChave = (chave, origem) => {
      const v = Number(votosAceitar[chave]) || 0;
      if (origem !== "input") {
        const inp = document.querySelector(`[data-pc-voto-aceitar="${CSS.escape(chave)}"]`);
        if (inp) inp.value = v;
      }
      if (origem !== "fader") {
        const sl = document.querySelector(`[data-dep-fader="d|${CSS.escape(chave)}"]`);
        if (sl) atualizarFaderDep(sl, v, metricasD.cap, metricasD.E);
      }
      atualizarConsoles();
    };
    attachFadersDuelo(votosAceitar, metricasD.cap, metricasD.E, snapDuelo, (chave) => aoMudarChave(chave, "fader"));
    // Ícone de bens/recursos — mesmo padrão de toggle da lista de palpites
    // (financeiroIconeHtml/pc-toggle-financeiro), só um aberto por vez.
    document.querySelectorAll("[data-pc-toggle-financeiro]").forEach((el) => {
      el.addEventListener("click", () => {
        const chave = el.dataset.pcToggleFinanceiro;
        pcState.financeiroAbertoChave = pcState.financeiroAbertoChave === chave ? null : chave;
        renderAceitarDesafio();
      });
    });
    document.querySelectorAll("[data-pc-voto-aceitar]").forEach((inp) => {
      inp.addEventListener("focus", snapDuelo);
      inp.addEventListener("input", () => {
        votosAceitar[inp.getAttribute("data-pc-voto-aceitar")] = Math.max(0, Math.round(Number(inp.value) || 0));
        aoMudarChave(inp.getAttribute("data-pc-voto-aceitar"), "input");
      });
    });
    const bZ = document.getElementById("pcDueloBtnZerar");
    if (bZ) bZ.addEventListener("click", () => {
      snapDuelo();
      escopo.forEach((c) => { votosAceitar[c.chave] = 0; });
      renderAceitarDesafio();
    });
    const bC = document.getElementById("pcDueloBtnCopiar");
    if (bC) bC.addEventListener("click", () => {
      snapDuelo();
      escopo.forEach((c) => { votosAceitar[c.chave] = votosRivalPorChave.get(c.chave) || 0; });
      renderAceitarDesafio();
    });
    const bV = document.getElementById("pcDueloBtnVoltar");
    if (bV) bV.addEventListener("click", () => {
      if (!pcState.desafioAceitarHistorico.length) return;
      pcState.desafioAceitarVotos = pcState.desafioAceitarHistorico.pop();
      renderAceitarDesafio();
    });
    const bL = document.getElementById("pcDueloCmdLegendaToggle");
    if (bL) bL.addEventListener("click", () => {
      pcState.dueloLegendaAberta = !pcState.dueloLegendaAberta;
      renderAceitarDesafio();
    });
  }

  document.querySelectorAll("[data-pc-acadeira]").forEach((btn) => btn.addEventListener("click", () => {
    const i = Number(btn.getAttribute("data-pc-acadeira"));
    pcState.desafioAceitarCadeiraAtiva = pcState.desafioAceitarCadeiraAtiva === i ? null : i;
    pcState.desafioAceitarBuscaCadeira = "";
    renderAceitarDesafio();
  }));
  document.querySelectorAll("[data-pc-acadeira-sentar]").forEach((btn) => btn.addEventListener("click", () => {
    const chave = btn.getAttribute("data-pc-acadeira-sentar");
    const cand = poolAceitar.find((c) => c.chave === chave);
    if (cand == null || pcState.desafioAceitarCadeiraAtiva == null) return;
    cadeiras[pcState.desafioAceitarCadeiraAtiva] = { chave: cand.chave, nome: cand.nome, partido: cand.partido };
    const proxima = cadeiras.findIndex((c) => !c);
    pcState.desafioAceitarCadeiraAtiva = proxima === -1 ? null : proxima;
    pcState.desafioAceitarBuscaCadeira = "";
    renderAceitarDesafio();
  }));
  const btnEsvaziarA = document.getElementById("pcBtnEsvaziarCadeira");
  if (btnEsvaziarA) btnEsvaziarA.addEventListener("click", () => {
    cadeiras[pcState.desafioAceitarCadeiraAtiva] = null;
    renderAceitarDesafio();
  });
  const buscaCadeiraA = document.getElementById("pcBuscaCadeira");
  if (buscaCadeiraA) {
    buscaCadeiraA.addEventListener("input", (e) => {
      pcState.desafioAceitarBuscaCadeira = e.target.value;
      renderAceitarDesafio();
    });
    if (pcState.desafioAceitarBuscaCadeira) { buscaCadeiraA.focus(); buscaCadeiraA.setSelectionRange(buscaCadeiraA.value.length, buscaCadeiraA.value.length); }
  }

  document.getElementById("pcBtnConfirmarAceite").addEventListener("click", async (e) => {
    const status = document.getElementById("pcAceitarStatus");
    e.target.disabled = true;
    status.textContent = "Depositando…";
    let r;
    if (ehEleitos) {
      if (preenchidas !== vagasDuelo) { status.textContent = `Preencha as ${vagasDuelo} cadeiras.`; e.target.disabled = false; return; }
      r = await aceitarDesafio(pcState.desafioAceitarId, null, cadeiras.map((c) => ({ chave: c.chave, nome: c.nome, partido: c.partido })));
    } else {
      const meusVotos = escopo.map((c) => ({ chave: c.chave, votos: Number(pcState.desafioAceitarVotos[c.chave]) || 0 }));
      r = await aceitarDesafio(pcState.desafioAceitarId, meusVotos, null);
    }
    if (!r.ok) { status.textContent = "Não deu: " + r.mensagem; e.target.disabled = false; return; }
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (err) {}
    pcState.desafioAceitarVotos = {};
    pcState.desafioAceitarCadeiras = null;
    pcState.desafioAceitarFase = null;
    pcState.desafioAceitarPreenchido = false;
    pcState.desafioAceitarHistorico = [];
    renderDueloSelado(r.desafio || desafio, nomeDesafiante);
  });
}

// ===== Adaptadores da tela de aceitar Duelo (07/09/2026) — pontes
// mínimas pra reusar as peças da lista principal (capCandidatoDeputado,
// totalValidosProjetado2026, faderDepHtml/atualizarFaderDep, setaFinoHtml,
// montarConsoleHtml) fora de pcState.palpiteEdicao. =====

// Várias funções da lista leem pcState.estado/cargoAtivo por dentro; o
// duelo tem uf/cargo próprios. Troca, avalia e restaura (síncrono).
function _comRecorteDe(uf, cargo, fn) {
  const e0 = pcState.estado, c0 = pcState.cargoAtivo;
  pcState.estado = uf; pcState.cargoAtivo = cargo;
  try { return fn(); } finally { pcState.estado = e0; pcState.cargoAtivo = c0; }
}

// E (votos válidos projetados 2026), QE meta e régua do candidato — as
// MESMAS contas da lista (renderSelecaoCandidatos → renderPainelDeputadosFader).
function _metricasRecorteDuelo(uf, cargo) {
  return _comRecorteDe(uf, cargo, () => {
    const E = totalValidosProjetado2026(cargo);
    const totalVagas = vagasFixasCargo(uf, cargo);
    return { E, totalVagas, qe: quocienteEleitoral(Math.round(E), totalVagas) || 0, cap: capCandidatoDeputado() };
  });
}

// Votos da legenda em 2022: nominais dos candidatos do partido no
// resultado oficial + voto de legenda (LEGENDA_2022, só SC). null = sem dado.
function _votosLegenda2022Duelo(uf, cargo, partido) {
  const grupo = (candidatosEstadoCargo(uf, cargo) || []).find((p) => p.nome === partido);
  if (!grupo) return null;
  let soma = (grupo.candidatos || []).reduce((t, c) => t + (c.fonte === "legenda" ? 0 : (Number(c.votos) || 0)), 0);
  if (uf === "SC" && typeof LEGENDA_2022 !== "undefined" && LEGENDA_2022[cargo] && LEGENDA_2022[cargo][partido]) soma += Number(LEGENDA_2022[cargo][partido]) || 0;
  return soma;
}

// Spec de um console do duelo: slots pro montarConsoleHtml + atualização
// ao vivo (arrasto/digitação) pelos ids. Teto da barra: a legenda é uma
// fatia do cargo, então o teto é o maior entre 2022×1,3 e a soma atual
// (nunca estoura); no cargo inteiro (ref2022 null) o teto é o E da lista.
function _consoleDueloSpec({ idx, rotulo, chaves, ref2022, metricas }) {
  const qe = metricas.qe || 1;
  const somaDe = (votos) => chaves.reduce((t, k) => t + (Number(votos[k]) || 0), 0);
  const tetoDe = (soma) => ref2022 == null ? Math.max(metricas.E, soma) : Math.max(ref2022 * 1.3, soma, qe);
  const numHtml = (soma) => ref2022 == null
    ? `<b id="pcDueloPct-${idx}">${metricas.E > 0 ? Math.round(soma / metricas.E * 100) : 0}%</b> · <span id="pcDueloNom-${idx}">${formatVotosCompacto(soma)} de ${formatVotosCompacto(Math.round(metricas.E))}</span>`
    : `<b id="pcDueloNom-${idx}">${formatVotosCompacto(soma)}</b> · <span id="pcDueloPct-${idx}">${ref2022 > 0 ? Math.round(soma / ref2022 * 100) + "% de 2022" : "sem base 2022"}</span>`;
  const direitaHtml = (soma) => ref2022 == null
    ? formatVotosCompacto(Math.round(metricas.E))
    : (soma / qe).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " QE";
  const w = (soma) => { const t = tetoDe(soma); return t > 0 ? Math.min(100, soma / t * 100) : 0; };
  return {
    slots(votos) {
      const soma = somaDe(votos);
      const teto = tetoDe(soma);
      return {
        idConsole: `pcDueloConsole-${idx}`,
        rotuloHtml: rotulo,
        numHtml: numHtml(soma),
        reguaStyle: `background:repeating-linear-gradient(90deg, rgba(174,181,187,.55) 0 1px, transparent 1px ${(qe / teto * 100).toFixed(3)}%); background-size:100% 100%;`,
        idZone: `pcDueloZone-${idx}`, idFill: `pcDueloFill-${idx}`, idGrip: `pcDueloMg-${idx}`, w: w(soma),
        escalaHtml: `<span>0</span><span class="pc-meta-linha">${ref2022 == null ? "" : `2022: ${ref2022 > 0 ? formatVotosCompacto(ref2022) : "—"}<span style="margin:0 12px;">·</span>`}QE <b class="pc-meta-num">${formatVotosCompacto(metricas.qe)}</b></span><span id="pcDueloDir-${idx}">${direitaHtml(soma)}</span>`,
      };
    },
    atualizar(votos) {
      const soma = somaDe(votos);
      const fill = document.getElementById(`pcDueloFill-${idx}`);
      if (!fill) return;
      const larg = w(soma) + "%";
      fill.style.width = larg;
      document.getElementById(`pcDueloMg-${idx}`).style.left = larg;
      const osub = fill.closest(".pc-console").querySelector(".pc-sen-num");
      osub.innerHTML = numHtml(soma);
      document.getElementById(`pcDueloDir-${idx}`).textContent = direitaHtml(soma);
    },
  };
}

// Arrasto e setas finas dos faders "d|chave" — mesmo gesto da lista
// (attachListenersDeputadosFader), só que escrevendo em votos[chave] em
// vez de pcState.palpiteEdicao. Reusa atualizarFaderDep/posicionarVotosDep.
function attachFadersDuelo(votos, cap, E, antesDeMudar, aoMudar) {
  document.querySelectorAll('[data-dep-fader^="d|"]').forEach((sl) => {
    const chave = sl.dataset.depFader.slice(2);
    posicionarVotosDep(sl, Number(votos[chave]) || 0, cap, E);
    let arrastando = false;
    const mover = (e) => {
      const r = sl.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      votos[chave] = Math.round(frac * cap);
      atualizarFaderDep(sl, votos[chave], cap, E);
      aoMudar(chave);
    };
    // Só arrasta a partir do alvo ampliado da alça (.pc-sen-grip-alvo),
    // não da barra inteira — mesmo ajuste do fader da lista (pedido do
    // usuário, 09/09/2026: rolar a tela não pode puxar o voto sem querer).
    const arrastavel = sl.querySelector(".pc-sen-grip-alvo") || sl;
    arrastavel.addEventListener("pointerdown", (e) => {
      antesDeMudar();
      arrastando = true;
      sl.classList.add("ativo");
      try { arrastavel.setPointerCapture(e.pointerId); } catch (_) {}
      mover(e);
    });
    arrastavel.addEventListener("pointermove", (e) => { if (arrastando) mover(e); });
    const soltar = () => { arrastando = false; sl.classList.remove("ativo"); };
    arrastavel.addEventListener("pointerup", soltar);
    arrastavel.addEventListener("pointercancel", soltar);
  });
  // Setas: 1% da régua por clique; segurar repete (igual à lista).
  document.querySelectorAll('[data-pc-seta-dep^="d|"]').forEach((btn) => {
    const partes = btn.dataset.pcSetaDep.split("|"); // d|chave|dir
    const chave = partes[1];
    const delta = partes[2] === "mais" ? 1 : -1;
    const passo = Math.max(1, Math.round(cap * 0.01));
    let timerRep = null, intRep = null;
    const aplicarPasso = () => {
      votos[chave] = Math.max(0, (Number(votos[chave]) || 0) + delta * passo);
      const sl = document.querySelector(`[data-dep-fader="d|${CSS.escape(chave)}"]`);
      if (sl) atualizarFaderDep(sl, votos[chave], cap, E);
      aoMudar(chave);
    };
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      antesDeMudar();
      aplicarPasso();
      timerRep = setTimeout(() => { intRep = setInterval(aplicarPasso, 90); }, 420);
    });
    const soltarSeta = () => { clearTimeout(timerRep); clearInterval(intRep); };
    btn.addEventListener("pointerup", soltarSeta);
    btn.addEventListener("pointerleave", soltarSeta);
    btn.addEventListener("pointercancel", soltarSeta);
  });
}

// Tela pós-aceite (pedido do usuário 30/08/2026): parabeniza quem selou
// o duelo, explica que o resultado sai junto com a apuração oficial das
// eleições, aponta pro sistema de pontos (Central de ajuda) e convida a
// montar a própria lista e desafiar outras pessoas — é a porta de entrada
// de quem chegou pelo convite de WhatsApp.
function renderDueloSelado(desafio, nomeDesafiante) {
  pcState._dueloImpressao = { desafio, nomeDesafiante };
  const conteudo = document.getElementById("pcConteudo");
  const nomeLimpo = _nomeDueloLimpo(desafio && desafio.nome);
  const codigo = (desafio && desafio.codigo) || "";
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto; text-align:center;">
      <div class="pc-selo-desafio" style="margin:0 auto 12px;">
        <span class="pc-selo-desafio-ic">${iconeSvg("desafio", 17)}</span>
        <span class="pc-selo-desafio-tx">Duelo<b>1 × 1</b></span>
      </div>
      <h2 style="margin-bottom:6px;">Cédula do duelo depositada!</h2>
      <div class="pc-sub" style="margin-bottom:14px;">Seu palpite em <b style="color:var(--pc-ink);">"${nomeLimpo}"</b> contra ${nomeDesafiante} está travado até a apuração oficial de 2026 — <b style="color:var(--pc-ink);">quem chegar mais perto do resultado real vence.</b></div>

      ${codigo ? `
      <div class="pc-duelo-codigo">
        <span><span class="rot">Código do duelo</span><span class="val">${codigo}</span></span>
        <button type="button" class="cop" id="pcBtnCopiarCodigoDuelo">COPIAR</button>
      </div>` : ""}
      <div class="pc-sub" style="margin-bottom:14px;">Acesse quando quiser: aba <b style="color:var(--pc-ink);">Duelos</b> ou Minhas Listas → <b style="color:var(--pc-ink);">Cédulas de duelo</b>.</div>

      <div style="display:flex; gap:12px; justify-content:center; margin-bottom:4px;">
        <button class="pc-console-btn" id="pcBtnCompartilharDuelo" title="Compartilhar o duelo" aria-label="Compartilhar o duelo">${iconeSvg("compartilhar", 17)}</button>
        <button class="pc-console-btn" id="pcBtnImprimirDuelo" title="Imprimir o duelo" aria-label="Imprimir o duelo">${iconeSvg("impressora", 17)}</button>
        <button class="pc-console-btn" id="pcBtnComoPontua" title="Como funciona a pontuação" aria-label="Como funciona a pontuação">${iconeSvg("ajuda", 17)}</button>
      </div>
      <div style="display:flex; gap:20px; justify-content:center; font-size:8px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:var(--pc-ink-dim); margin-bottom:2px;">
        <span>compartilhar</span><span>imprimir</span><span>pontuação</span>
      </div>
      ${desafio && desafio.id ? `<button class="ghost" id="pcBtnVerDueloSelado" style="width:100%; border:none; margin-top:4px;">Ver o duelo na aba Duelos</button>` : ""}

      <div class="pc-duelo-caixa2">
        <div style="font-size:13px; font-weight:800; margin-bottom:4px;">Agora é a sua vez</div>
        <div class="pc-sub" style="margin-bottom:12px;">Você acabou de palpitar — você também pode montar o seu próprio desafio com a lista completa das eleições ou segmentada: por partido, candidatos e outras. Monte a sua lista personalizada e desafie os seus amigos.</div>
        <div style="display:flex; gap:8px; align-items:stretch;">
          <button class="ghost" id="pcBtnIrLobby" style="width:52px; flex:none; display:flex; align-items:center; justify-content:center;" title="Ir pro início">${iconeSvg("home", 16)}</button>
          <button class="primary" id="pcBtnMontarMinhaLista" style="flex:1;">Montar a minha própria lista</button>
        </div>
      </div>
    </div>`;
  const btnCopCod = document.getElementById("pcBtnCopiarCodigoDuelo");
  if (btnCopCod) btnCopCod.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(codigo); btnCopCod.textContent = "COPIADO"; setTimeout(() => { btnCopCod.textContent = "COPIAR"; }, 1600); } catch (_) {}
  });
  const btnCompartilhar = document.getElementById("pcBtnCompartilharDuelo");
  if (btnCompartilhar) btnCompartilhar.addEventListener("click", async () => {
    const texto = `Selei um duelo 1×1 "${nomeLimpo}" contra ${nomeDesafiante} no SimulaLEGIS — o resultado sai na apuração oficial de 2026. Quer medir o seu faro político também? ${window.location.origin + window.location.pathname}`;
    if (_ehDispositivoMovel() && navigator.share) { try { await navigator.share({ text: texto }); return; } catch (_) {} }
    // Computador: WhatsApp Web direto com o texto pronto, em vez do menu
    // do sistema (sem WhatsApp) ou de só jogar no clipboard sem avisar.
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    try { await navigator.clipboard.writeText(texto); } catch (_) {}
  });
  const btnVerDuelo = document.getElementById("pcBtnVerDueloSelado");
  if (btnVerDuelo) btnVerDuelo.addEventListener("click", () => { pcState.desafioComparacaoId = desafio.id; renderComparacaoDesafio(); });
  const btnImpDuelo = document.getElementById("pcBtnImprimirDuelo");
  if (btnImpDuelo) btnImpDuelo.addEventListener("click", () => {
    const info = pcState._dueloImpressao;
    if (!info || !info.desafio) return;
    let container = document.getElementById("pcImpressaoConteudo");
    if (!container) {
      container = document.createElement("div");
      container.id = "pcImpressaoConteudo";
      document.body.appendChild(container);
    }
    container.innerHTML = montarImpressaoDuelo(info.desafio, info.nomeDesafiante);
    window.print();
  });
  document.getElementById("pcBtnComoPontua").addEventListener("click", () => { pcState.subaba = "ajuda"; renderAppColaborativo(); });
  document.getElementById("pcBtnMontarMinhaLista").addEventListener("click", () => { pcState.subaba = "selecao"; renderAppColaborativo(); });
  const btnLobby = document.getElementById("pcBtnIrLobby");
  if (btnLobby) btnLobby.addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
}

// ===== Painel de comparação do duelo (protótipo aprovado 30/08/2026) =====
// A organização do documento impresso (colunas Você/Rival/Resultado/Pts,
// ícone E do eleito, legenda) nas cores do sistema. Resultado e Pts ficam
// em "—" até a apuração oficial existir — mesma promessa das outras telas.
async function renderComparacaoDesafio() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando comparação…");
  const d = await desafioDetalhe(pcState.desafioComparacaoId);
  if (!d) { renderDesafiosHub(); return; }
  const meuId = pcState.perfil.id;
  const souCriador = d.criador_id === meuId;
  const nomeEu = "Você";
  const nomeOutro = souCriador ? (d.desafiado ? d.desafiado.nome : "Rival") : (d.criador ? d.criador.nome : "Rival");
  const cargoLabel = (CARGOS.find((c) => c.id === d.cargo) || {}).label || "";
  const ehEleitos = d.tipo_disputa === "eleitos";
  const encerrado = d.status === "encerrado" && d.pontos_criador != null;
  const meusPontos = souCriador ? d.pontos_criador : d.pontos_desafiado;
  const pontosOutro = souCriador ? d.pontos_desafiado : d.pontos_criador;
  const venci = d.vencedor_id && d.vencedor_id === meuId;

  const votosEu = new Map(((souCriador ? d.votos_criador : d.votos_desafiado) || []).map((v) => [v.chave, Number(v.votos) || 0]));
  const votosOutro = new Map(((souCriador ? d.votos_desafiado : d.votos_criador) || []).map((v) => [v.chave, Number(v.votos) || 0]));
  const eleitosEu = (souCriador ? d.eleitos_criador : d.eleitos_desafiado) || [];
  const eleitosOutro = (souCriador ? d.eleitos_desafiado : d.eleitos_criador) || [];
  const setEu = new Set(eleitosEu.map((c) => c.chave));
  const setOutro = new Set(eleitosOutro.map((c) => c.chave));

  let linhas = "";
  if (ehEleitos) {
    // União das duas composições: consenso primeiro (os dois sentaram),
    // depois só-eu, depois só-rival — mostra onde o duelo diverge.
    const todos = new Map();
    eleitosEu.forEach((c) => todos.set(c.chave, c));
    eleitosOutro.forEach((c) => { if (!todos.has(c.chave)) todos.set(c.chave, c); });
    const ordenados = [...todos.values()].sort((a, b) => {
      const pesoA = (setEu.has(a.chave) ? 1 : 0) + (setOutro.has(a.chave) ? 1 : 0);
      const pesoB = (setEu.has(b.chave) ? 1 : 0) + (setOutro.has(b.chave) ? 1 : 0);
      return pesoB - pesoA || a.nome.localeCompare(b.nome);
    });
    linhas = ordenados.map((c, i) => `
      <div class="pc-cmp-linha">
        <span class="pc-cmp-pos">${i + 1}º</span>
        <span class="pc-cmp-cand"><span class="n">${c.nome}</span><span class="p">${c.partido}</span></span>
        <span class="pc-cmp-val ${setEu.has(c.chave) ? "marcado" : ""}">${setEu.has(c.chave) ? iconeSvg("confere", 13) : "—"}</span>
        <span class="pc-cmp-val ${setOutro.has(c.chave) ? "marcado" : ""}">${setOutro.has(c.chave) ? iconeSvg("confere", 13) : "—"}</span>
        <span class="pc-cmp-res">—</span>
        <span class="pc-cmp-pts">—</span><span class="pc-cmp-pts">—</span>
      </div>`).join("");
  } else {
    const escopo = d.escopo_candidatos || [];
    const ordenados = [...escopo].sort((a, b) => (votosEu.get(b.chave) || 0) - (votosEu.get(a.chave) || 0));
    linhas = ordenados.map((c, i) => {
      const vEu = votosEu.get(c.chave) || 0;
      const vOutro = votosOutro.get(c.chave) || 0;
      return `
      <div class="pc-cmp-linha">
        <span class="pc-cmp-pos">${i + 1}º</span>
        <span class="pc-cmp-cand"><span class="n">${c.nome}</span><span class="p">${c.partido}</span></span>
        <span class="pc-cmp-val num">${vEu.toLocaleString("pt-BR")}</span>
        <span class="pc-cmp-val num">${vOutro.toLocaleString("pt-BR")}</span>
        <span class="pc-cmp-res">—</span>
        <span class="pc-cmp-pts">—</span><span class="pc-cmp-pts">—</span>
      </div>`;
    }).join("");
  }

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:520px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarComparacao" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Duelos</button>

      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--pc-glass-border); padding-bottom:12px; margin-bottom:14px;">
        <div>
          <div style="font-size:18px; font-weight:800;"><b style="color:var(--pc-accent);">Simula</b>LEGIS</div>
          <div style="font-size:8px; font-weight:800; letter-spacing:.1em; color:var(--pc-ink-dim);">SIMULADOR ELEITORAL LEGISLATIVO 2026</div>
        </div>
        <div style="text-align:right; font-size:11px;">
          <b>${d.estado}</b> · Duelo "${_nomeDueloLimpo(d.nome)}"<br>
          <span style="font-size:9.5px; color:var(--pc-ink-dim);">${d.respondido_em ? "selado em " + new Date(d.respondido_em).toLocaleDateString("pt-BR") : ""} · ${encerrado ? "apurado" : "aguarda apuração"} · ${d.codigo || ""}</span>
        </div>
      </div>

      <div class="pc-podio">
        <span class="pc-podio-lado${encerrado && venci ? " venceu" : ""}">
          ${encerrado && venci ? '<span class="pc-podio-faixa">VENCEU</span>' : ""}
          <span class="pc-podio-av${encerrado && venci ? " venceu" : ""}">${_iniciaisNome(pcState.perfil.nome || "Você")}</span>
          <span class="pc-podio-nm">${nomeEu}</span>
          <span class="pc-podio-pts${encerrado && venci ? " venceu" : ""}">${encerrado ? Number(meusPontos).toLocaleString("pt-BR") + ' <i>pts</i>' : "aguarda"}</span>
        </span>
        <span class="pc-podio-vs">VS</span>
        <span class="pc-podio-lado${encerrado && !venci && d.vencedor_id ? " venceu" : ""}">
          ${encerrado && !venci && d.vencedor_id ? '<span class="pc-podio-faixa">VENCEU</span>' : ""}
          <span class="pc-podio-av${encerrado && !venci && d.vencedor_id ? " venceu" : ""}">${_iniciaisNome(nomeOutro)}</span>
          <span class="pc-podio-nm">${nomeOutro}</span>
          <span class="pc-podio-pts${encerrado && !venci && d.vencedor_id ? " venceu" : ""}">${encerrado ? Number(pontosOutro).toLocaleString("pt-BR") + ' <i>pts</i>' : "aguarda"}</span>
        </span>
      </div>
      ${encerrado && d.vencedor_id ? `
      <div style="text-align:center; font-size:10.5px; color:var(--pc-ink-dim); margin:2px 0 10px;">${venci ? "Você venceu" : nomeOutro + " venceu"} o duelo <b style="color:var(--pc-ink);">"${_nomeDueloLimpo(d.nome)}"</b> por ${Number(venci ? meusPontos : pontosOutro).toLocaleString("pt-BR")} pontos a ${Number(venci ? pontosOutro : meusPontos).toLocaleString("pt-BR")}.</div>
      <div class="pc-vitoria-box">
        ${iconeSvg("compartilhar", 16)}
        <span style="flex:1;"></span>
        <button type="button" class="pc-console-btn" style="width:42px; height:42px;" id="pcBtnVitoriaWhats" title="Enviar no WhatsApp">${iconeSvg("whatsapp", 17)}</button>
        <button type="button" class="pc-console-btn" style="width:42px; height:42px;" id="pcBtnVitoriaStories" title="Stories do Instagram">${iconeSvg("instagram", 17)}</button>
        <button type="button" class="pc-console-btn" style="width:42px; height:42px;" id="pcBtnVitoriaBaixar" title="Baixar a imagem">${iconeSvg("baixar", 17)}</button>
      </div>` : ""}

      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:2px;">
        <span style="font-size:14px; font-weight:800;">${cargoLabel} — comparação do duelo</span>
        <button type="button" class="pc-mini-btn" id="pcBtnLegendaCmp" title="O que significa cada coluna">${iconeSvg("ajuda", 13)}</button>
      </div>
      ${pcState.legendaCmpAberta ? `
      <div style="background:#15181B; border:1px solid #23262A; border-radius:10px; padding:10px 12px; font-size:9.5px; color:var(--pc-ink-dim); line-height:1.6; margin:6px 0 8px;">
        <b style="color:var(--pc-ink);">Você / Rival</b> — ${ehEleitos ? "quem cada um sentou na composição" : "os votos que cada um indicou pro candidato"}.<br>
        <b style="color:var(--pc-ink);">Result.</b> — a votação oficial da apuração de 2026.<br>
        <b style="color:var(--pc-ink);">P·V</b> — seus pontos na linha (acerto de eleição + proximidade de votos).<br>
        <b style="color:var(--pc-ink);">P·R</b> — os pontos do rival na mesma linha.
      </div>` : ""}
      <div class="pc-sub" style="margin:1px 0 12px;">${ehEleitos
        ? `${Math.max(setEu.size, setOutro.size)} cadeiras por lado · a coluna de resultado preenche na apuração oficial · pontos = acerto da composição.`
        : `${(d.escopo_candidatos || []).length} candidatos no recorte · resultado e pontos preenchem na apuração oficial · pontos = acerto de eleição + proximidade do voto.`}</div>

      <div class="pc-cmp-cols">
        <span class="pc-cmp-pos"></span>
        <span class="pc-cmp-cand">Candidato</span>
        <span class="pc-cmp-val">Você</span>
        <span class="pc-cmp-val">Rival</span>
        <span class="pc-cmp-res">Result.</span>
        <span class="pc-cmp-pts">P·V</span><span class="pc-cmp-pts">P·R</span>
      </div>
      <div style="max-height:52vh; overflow-y:auto;">${linhas}</div>

      <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:14px; padding-top:10px; border-top:1px solid var(--pc-glass-border); font-size:9px; color:var(--pc-ink-dim);">
        ${ehEleitos ? `<span style="display:flex; align-items:center; gap:4px;">${iconeSvg("confere", 11)} sentou o candidato nessa composição</span>` : ""}
        <span>Result. e pontos (P·V = seus, P·R = do rival) preenchem na apuração oficial.</span>
      </div>
    </div>`;
  document.getElementById("pcBtnVoltarComparacao").addEventListener("click", () => renderDesafiosHub());
  const btnLegCmp = document.getElementById("pcBtnLegendaCmp");
  if (btnLegCmp) btnLegCmp.addEventListener("click", () => { pcState.legendaCmpAberta = !pcState.legendaCmpAberta; renderComparacaoDesafio(); });
  // Box de vitória (só com duelo encerrado): gera o card e compartilha.
  const nomeVencedor = venci ? (pcState.perfil.nome || "Você") : nomeOutro;
  const nomePerdedor = venci ? nomeOutro : (pcState.perfil.nome || "Você");
  const ptsV = Number(venci ? meusPontos : pontosOutro) || 0;
  const ptsP = Number(venci ? pontosOutro : meusPontos) || 0;
  const dadosCard = { nomeVencedor, nomePerdedor, ptsV, ptsP, nomeDuelo: _nomeDueloLimpo(d.nome) };
  const textoVitoria = `${nomeVencedor} venceu o duelo "${dadosCard.nomeDuelo}" por ${ptsV} pontos a ${ptsP} no SimulaLEGIS. Quer medir o seu faro político? ${window.location.origin + window.location.pathname}`;
  const compartilharCard = async (altura, nomeArq, paraWhatsapp) => {
    const canvas = gerarImagemCardVitoria(dadosCard, altura);
    const dataUrl = canvas.toDataURL("image/png");
    if (_ehDispositivoMovel() && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const arquivo = new File([blob], nomeArq, { type: "image/png" });
        if (navigator.canShare({ files: [arquivo] })) { await navigator.share({ files: [arquivo], text: textoVitoria }); return; }
      } catch (_) { /* cancelou/falhou — cai no download */ }
    }
    // Computador: baixa a imagem; se o alvo é WhatsApp, abre o WhatsApp
    // Web com o texto pronto direto (sem WhatsApp no menu do sistema).
    _baixarImagemCedula(dataUrl, nomeArq);
    if (paraWhatsapp) window.open(`https://wa.me/?text=${encodeURIComponent(textoVitoria)}`, "_blank");
    try { await navigator.clipboard.writeText(textoVitoria); } catch (_) {}
  };
  const bW = document.getElementById("pcBtnVitoriaWhats");
  if (bW) bW.addEventListener("click", () => compartilharCard(1350, "vitoria-duelo.png", true));
  const bS = document.getElementById("pcBtnVitoriaStories");
  if (bS) bS.addEventListener("click", () => compartilharCard(1920, "vitoria-duelo-stories.png"));
  const bB = document.getElementById("pcBtnVitoriaBaixar");
  if (bB) bB.addEventListener("click", () => {
    _baixarImagemCedula(gerarImagemCardVitoria(dadosCard, 1350).toDataURL("image/png"), "vitoria-duelo.png");
    _baixarImagemCedula(gerarImagemCardVitoria(dadosCard, 1920).toDataURL("image/png"), "vitoria-duelo-stories.png");
  });
}

// ===== Notificações (migração 28) =====
