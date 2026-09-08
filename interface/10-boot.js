// Boot da app e dispatcher de telas: initColaborativo, renderColaborativo,
// abertura (landing, escolha de estado, leitura ?ver=), menu fixo e Farol.
// Ordem de carga no index.html. Chamadas soltas que disparam a app ficam
// em 99-inicio.js.


async function initColaborativo() {
  if (window.SEL_DEMO) { await iniciarModoDemo(); return; }
  if (!supabaseClient) {
    pcState.tela = "erro-conexao";
    renderColaborativo();
    return;
  }
  pcState.sessao = await sessaoAtual();
  if (pcState.sessao) {
    pcState.perfil = await meuPerfil();
    if (!pcState.perfil) {
      // Sessão existe mas ainda não tem linha em "perfis" — hoje só acontece
      // com quem acabou de entrar pelo Google (o Google não manda aceite de
      // LGPD, então falta confirmar nome + LGPD antes de liberar o app).
      pcState.tela = "completar-perfil";
      renderColaborativo();
      return;
    }
    pcState.souAdmin = await souAdmin();
    // Saldo REAL da carteira (creditos_conta) — pcState.perfil vem da
    // tabela "perfis", que não tem essa coluna: sem esta carga, todo
    // "saldo: X" da interface (slot trancado, gates) mostrava 0 pra
    // sempre, mesmo com créditos (achado de 22/08/2026 na conferência do
    // caixa). A cobrança em si sempre foi validada no servidor.
    try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) { /* melhor esforço */ }
    // Pontinho do sino (migração 28) — melhor esforço, igual ao saldo:
    // sem isso a barra superior simplesmente não mostra o indicador.
    try { pcState.notificacoesNaoLidas = await contarNotificacoesNaoLidas(); } catch (e) { /* sem indicador */ }
    // Volta do Mercado Pago (?compra=ok|falhou|pendente na URL, ver
    // back_urls em nuvem/edge-functions/criar-pagamento) — só faz
    // sentido pra quem está logado, que é sempre quem inicia uma compra.
    tratarVoltaDoPagamento();
  // Presença/marcos (migração 26): registra o dia (streak) e concede
  // marcos únicos direto no banco. Fire-and-forget — se a migração não
  // rodou ainda, só loga e segue.
  if (pcState.perfil) registrarPresenca();
    pcState.souUsuarioFinal = await souUsuarioFinal();
    const salvo = await carregarMeuPalpite(pcState.perfil.id);
    if (salvo && salvo.candidatos && salvo.candidatos.length) {
      pcState.palpiteEdicao = salvo.candidatos;
      normalizarPalpiteEdicao();
    }
    // primeira vez (sem nada salvo) começa na seleção; quem já preencheu
    // antes cai direto no painel principal.
    pcState.subaba = pcState.palpiteEdicao ? "painel" : "selecao";
    // Volta do Mercado Pago: pousa direto na Loja pra mostrar o status
    // da compra, em vez de deixar a pessoa procurar.
    if (new URLSearchParams(window.location.search).get("compra")) pcState.subaba = "loja";
    // Convite de duelo pendente (?duelo=, migração 40): resolve o código
    // e pousa direto na tela de aceitar — é o caminho de quem entrou no
    // jogo POR um duelo aberto de WhatsApp.
    try {
      const codigoDuelo = localStorage.getItem("sl_duelo_pendente");
      if (codigoDuelo) {
        const d = await desafioPorCodigo(codigoDuelo);
        localStorage.removeItem("sl_duelo_pendente");
        if (!d) {
          // Molde cancelado/inexistente (migração 48): avisa no hub em
          // vez de sumir em silêncio.
          pcState.desafiosAvisoStatus = "Esse convite de duelo não está mais disponível — mas você pode criar o seu.";
          pcState.subaba = "desafios";
        } else if (d.ja_aceitei && !d.sou_o_criador) {
          // Já aceitei esse molde: não abre a tela de aceitar de novo —
          // destaca o duelo que já existe (regra 3 da migração 48).
          pcState.desafioDestacadoId = d.meu_duelo_id;
          pcState.desafiosAvisoStatus = "Você já aceitou esse convite — seu duelo está aqui.";
          pcState.subaba = "desafios";
        } else if (d && !d.sou_o_criador) {
          pcState.desafioAceitarId = d.id;
          pcState.desafioAceitarFase = "convite";
          pcState.desafioAceitarVotos = {};
          pcState.desafioAceitarCadeiras = null;
          pcState.desafioAceitarPreenchido = false;
          pcState.desafioAceitarHistorico = [];
          pcState._abrirAceitarDueloNoBoot = true;
          pcState.subaba = "desafios";
        } else if (d && d.sou_o_criador) {
          // Criador clicou no PRÓPRIO link (teste comum): em vez de
          // sumir em silêncio, leva pro card do duelo no hub — de lá
          // ele reenvia o convite (achado do usuário, 30/08/2026).
          pcState.desafioDestacadoId = d.id;
          pcState.subaba = "desafios";
        }
      }
    } catch (e) { /* código inválido/expirado — segue o boot normal */ }
    // Estado do logado (auditoria #41, 21/08/2026): lembra a última
    // escolha feita na roleta NESTE aparelho; sem escolha registrada,
    // SC segue como padrão de nascimento do produto.
    try {
      const rEstado = await window.storage.get("pc-estado-escolhido");
      pcState.estado = (rEstado && rEstado.value) || "SC";
    } catch (e) { pcState.estado = "SC"; }
    await garantirRascunhosCarregados();
    // Também pré-carrega os grupos aqui (não só dentro de
    // renderPainelPrincipal) — sem isso, o primeiro render do Painel
    // logo após login/boot sempre esbarrava num "await" ainda não
    // resolvido, e a tela de carregamento própria do Painel piscava de
    // novo por cima da que o boot já tinha acabado de mostrar (achado do
    // usuário, 24/08/2026: "parece carregar duas vezes"). Com os dois
    // caches já quentes antes do primeiro render, renderPainelPrincipal
    // (abaixo) pula a própria tela de carregamento nesse caso.
    if (pcState.perfil) await garantirMeusGruposCarregados();
    // Onboarding + mini-pesquisa obrigatória (migração 20) — PAUSADAS a
    // pedido do usuário em 15/08/2026, depois de testar ao vivo: quer
    // pensar num onboarding melhor, e trocar a mini-pesquisa por uma
    // "pesquisa estimulada" (candidatos reais pra escolher, não nome
    // livre) — os dois ficam pra depois da primeira versão do sistema.
    // Código mantido (renderTelaOnboarding/renderTelaMiniPesquisa,
    // abaixo) pra reativar fácil quando chegar a hora — só o gate abaixo
    // está desligado. Sem isso, cadastro/login cai direto no app, igual
    // era antes dessas duas telas existirem.
    pcState.tela = "app";
    renderColaborativo();
    return;
  }
  // Sem sessão: não pede login de cara — começa pela tela de abertura. Login
  // só é pedido mais adiante, quando a pessoa decide "prosseguir" (ver
  // renderPainelPrincipal, chamado como "painel-convidado" nesse fluxo).
  // EXCEÇÃO: quem chegou por um link de convite (?conv=) pula a capa e
  // vai direto pro cadastro — pedido do usuário, 24/08/2026 ("quando
  // clico ele abre o link do app, a minha ideia é que ele gere o acesso
  // direto para o site"). Antes o código ficava só guardado em silêncio
  // pro cadastro (_resolverConvidadoPor) e a pessoa caía na mesma capa
  // de sempre, sem nenhum sinal de que veio de um convite.
  if (_convitePendente) {
    pcState.pendenteRegistro = true;
    pcState.tela = "cadastro";
  } else {
    pcState.tela = "landing";
  }
  renderColaborativo();
}

// Dados salvos antes desta versão podem não ter o campo `votosEditado`
// (distingue "a pessoa mexeu nesse número" de "ainda é o valor padrão de
// 2022") — sem isso o botão "Balancear vazios" da tela de seleção
// sobrescreveria votação que a pessoa já tinha ajustado à mão.
function normalizarPalpiteEdicao() {
  pcState.palpiteEdicao.forEach((p) => {
    p.candidatos.forEach((c) => { if (c.votosEditado === undefined) c.votosEditado = false; });
  });
}

// ===== Rascunho por cargo (autosave contínuo) =====
// Chave de rascunho no modo convidado (sem perfil) — window.storage tem o
// shim pra localStorage definido em index.html, funciona igual com ou sem
// claude.ai. Logado usa Supabase (rascunho_estadual/federal/senador em
// "palpites", nuvem/palpites.js + nuvem/migracao-6-rascunho-por-cargo.sql).
function _chaveRascunhoConvidado(uf, cargo) {
  return `pc-rascunho:${uf}:${cargo}`;
}

// Qual "lista salva" (nomeada, com id) o rascunho ATUAL deste estado
// pertence — pcState.listaSalvaId/listaSalvaNome viviam só na memória,
// nunca gravados em lugar nenhum. Resultado: a pessoa editava uma lista já
// salva (via "Editar" em Minhas Listas), a página recarregava (aba
// suspensa no celular, fechar e abrir de novo...) e o app continuava
// mostrando o rascunho certinho, mas tinha esquecido COMPLETAMENTE que
// aquele conteúdo era a lista "X" — Salvar virava "criar uma lista nova
// do zero" (duplicava, em vez de atualizar) e nem mostrava o nome de
// referência. Achado pelo usuário em 17/08/2026 ("aqui não existe nenhuma
// referência sobre qual lista eu salvei"). Guardado por window.storage
// (mesmo mecanismo do rascunho) tanto pra convidado quanto logado — é só
// um atalho local, não precisa sincronizar entre aparelhos.
function _chaveListaAtivaLocal(uf) {
  return `pc-lista-ativa:${uf}`;
}
async function persistirListaAtivaLocal() {
  if (!pcState.estado) return;
  try {
    if (pcState.listaSalvaId) {
      await window.storage.set(_chaveListaAtivaLocal(pcState.estado), JSON.stringify({ id: pcState.listaSalvaId, nome: pcState.listaSalvaNome }));
    } else {
      await window.storage.delete(_chaveListaAtivaLocal(pcState.estado));
    }
  } catch (e) { /* localStorage indisponível, ignora — só perde o atalho, não o conteúdo */ }
}

// Carrega o rascunho salvo dos 3 cargos pro estado atual e guarda em
// pcState.rascunhosCache — 1x por estado escolhido (ver os 2 únicos lugares
// que atribuem pcState.estado: initColaborativo e o picker de estado). O
// resto do app consulta esse cache de forma síncrona (renderCargoEstadual,
// garantirPalpitesPorCargo) em vez de cada um precisar virar async.
async function garantirRascunhosCarregados() {
  if (!pcState.estado || pcState.rascunhosCacheEstado === pcState.estado) return;
  const cache = {};
  if (pcState.perfil) {
    const dados = await carregarRascunhosPorCargo(pcState.perfil.id);
    CARGOS.forEach((c) => {
      const coluna = COLUNA_RASCUNHO_POR_CARGO[c.id];
      const lista = dados ? dados[coluna] : null;
      cache[c.id] = (lista && lista.length) ? lista : null;
    });
  } else {
    for (const c of CARGOS) {
      try {
        const r = await window.storage.get(_chaveRascunhoConvidado(pcState.estado, c.id));
        const lista = r && r.value ? JSON.parse(r.value) : null;
        cache[c.id] = (lista && lista.length) ? lista : null;
      } catch (e) { cache[c.id] = null; }
    }
  }
  pcState.rascunhosCache = cache;
  pcState.rascunhosCacheEstado = pcState.estado;
  // Restaura de qual lista salva (se alguma) este rascunho é — só quando a
  // sessão atual ainda não sabe (não sobrescreve um listaSalvaId que já
  // veio de "Editar" nesta mesma navegação). Ver persistirListaAtivaLocal.
  if (!pcState.listaSalvaId) {
    try {
      const r = await window.storage.get(_chaveListaAtivaLocal(pcState.estado));
      const ativa = r && r.value ? JSON.parse(r.value) : null;
      if (ativa && ativa.id) {
        pcState.listaSalvaId = ativa.id;
        pcState.listaSalvaNome = ativa.nome || null;
      }
    } catch (e) { /* sem atalho local, segue como lista nova */ }
  }
}

// Salva (com debounce — não dispara 1 request por tecla) o rascunho de um
// cargo, logado ou convidado. Chamado depois de toda edição relevante nas
// telas de Seleção e Revisão.
const _timersAutoSaveRascunho = {};
function agendarAutoSaveRascunho(cargo, lista) {
  if (!pcState.estado || !lista || !lista.length) return;
  clearTimeout(_timersAutoSaveRascunho[cargo]);
  _timersAutoSaveRascunho[cargo] = setTimeout(() => {
    if (pcState.perfil) {
      salvarRascunhoCargo(pcState.perfil.id, cargo, lista, pcState.estado);
    } else {
      try { window.storage.set(_chaveRascunhoConvidado(pcState.estado, cargo), JSON.stringify(lista)); } catch (e) { /* localStorage indisponível, ignora */ }
    }
  }, 900);
}

// ===== Minhas listas (nomeadas, com id exclusivo, salvas OU depositadas) =====
// Diferente do rascunho acima (autosave silencioso, "onde eu parei"): isso
// aqui é o registro deliberado que a pessoa cria ao clicar "Salvar" na
// Revisão pela primeira vez — pede um nome, gera um id que nunca muda
// depois (mesmo id em salvamentos seguintes da mesma lista, ver
// executarSalvarLista). Guarda um ARRAY de listas por estado (não só uma):
// a pessoa vê todas em "Minhas listas" (renderMinhasListas), edita as em
// aberto e deposita (trava pra sempre) quando quiser. Hoje só persiste
// local (window.storage) — serve tanto convidado quanto logado; a
// sincronização com o Supabase (nuvem/salvamentos.js, listas_salvas) fica
// pra quando esse schema for reconferido.
function gerarIdLista() {
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "lista-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// Identifica de quem é o armazenamento local — perfil.id se logado, ou uma
// chave fixa de convidado. Sem isso, duas contas diferentes testadas no
// MESMO navegador (ex.: várias contas de teste) enxergavam as listas
// salvas umas das outras, porque a chave só levava o estado (SC) em conta.
// Achado com o usuário em 08/08/2026 testando contas de teste múltiplas.
function _idConta() {
  return pcState.perfil ? pcState.perfil.id : "convidado";
}

function _chaveListasSalvasLocal(uf) {
  return `simulador-legislativo-listas-salvas:${uf}:${_idConta()}`;
}

async function carregarListasSalvasLocais(uf) {
  if (!uf) return [];
  try {
    const r = await window.storage.get(_chaveListasSalvasLocal(uf));
    return r && r.value ? JSON.parse(r.value) : [];
  } catch (e) { return []; }
}

async function salvarListasSalvasLocais(uf, listas) {
  try { await window.storage.set(_chaveListasSalvasLocal(uf), JSON.stringify(listas)); } catch (e) { /* localStorage indisponível, ignora */ }
}

// Créditos de verdade: nuvem/creditos.js (obterSaldoCreditos/
// consumirCreditoConta), saldo mora no Supabase (creditos_conta, migração
// 9) — nunca local, nunca solto em "perfis" (ver comentário lá pro
// motivo de segurança). Só conta logada tem crédito; convidado é sempre
// redirecionado pro cadastro ao bater o limite (ver renderMinhasListas).

// Cria (1ª vez, pcState.listaSalvaId ainda null antes de executarSalvarLista
// gerar um) ou atualiza (salvamentos seguintes, mesmo id) a lista ATIVA
// dentro do array — nunca mexe nas outras listas da pessoa.
async function persistirListaSalvaLocal() {
  if (!pcState.estado || !pcState.listaSalvaId) return;
  const listas = await carregarListasSalvasLocais(pcState.estado);
  const idx = listas.findIndex((l) => l.id === pcState.listaSalvaId);
  const agora = new Date().toISOString();
  const registro = {
    id: pcState.listaSalvaId,
    nome: pcState.listaSalvaNome,
    criadoEm: idx >= 0 ? listas[idx].criadoEm : agora,
    atualizadoEm: agora,
    depositadoEm: idx >= 0 ? listas[idx].depositadoEm : null,
    anonimo: idx >= 0 ? !!listas[idx].anonimo : false,
    palpitesPorCargo: pcState.palpitesPorCargo,
  };
  if (idx >= 0) listas[idx] = registro; else listas.push(registro);
  await salvarListasSalvasLocais(pcState.estado, listas);
}

// Apaga uma lista local EM ABERTO (convidado). Espelha a trava do banco
// (excluirSalvamento, nuvem/salvamentos.js): nunca chamada pra lista já
// depositada — o botão nem aparece nesse caso (ver linhaDepositada).
async function excluirListaLocal(uf, id) {
  const listas = await carregarListasSalvasLocais(uf);
  const restantes = listas.filter((l) => l.id !== id);
  await salvarListasSalvasLocais(uf, restantes);
}

// Deposita (trava) uma lista já salva — ação separada e irreversível, só
// muda depositadoEm/anonimo, nunca os candidatos/votos da lista em si.
async function depositarListaLocal(uf, id, anonimo) {
  const listas = await carregarListasSalvasLocais(uf);
  const idx = listas.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  listas[idx] = { ...listas[idx], depositadoEm: new Date().toISOString(), anonimo: !!anonimo };
  pcState.farolTemDeposito = true; // Farol de Orientação — passo "Depositar" concluído
  await salvarListasSalvasLocais(uf, listas);
  return true;
}

// ===== Menu fixo (barra de atalhos embaixo, estilo do Painel) =====
// Substitui o botão "← Painel principal" ad-hoc que cada subaba tinha —
// combinado com o usuário em 08/08/2026 ("isso não deverá ser necessário
// se tivermos a barra de atalhos aérea"). Aparece em toda tela alcançada
// DEPOIS do Painel, exceto Seleção, Revisão e o próprio Painel (esses já
// têm os mesmos destinos embutidos ou pedem foco sem distração — mesma
// regra combinada pro filtro da Revisão não mudar mais nada da estrutura
// além do pedido). destinoAtivo null = mostra a barra sem destacar nada.
function renderMenuFixo(destinoAtivo) {
  const gateConvidado = !pcState.perfil;
  // Urna (Minhas listas) no centro, Termômetro no lugar que ela ocupava —
  // pedido do usuário, 25/08/2026. "Menu"/perfil não volta (já tem porta
  // própria no ícone do cabeçalho, pcBtnAbrirPerfil, em toda tela).
  const itens = [
    { id: "painel", icone: "home", label: "Início" },
    { id: "medias", icone: "termometro", label: "Termômetro", gate: gateConvidado },
    { id: "minhas-listas", icone: "ballot", label: "Minhas listas" },
    { id: "grupo", icone: "grupos", label: "Grupos", gate: gateConvidado },
    { id: "ranking", icone: "ranking", label: "Ranking" },
  ];
  // Pill sólido no item ativo (mesmo tratamento de .pc-cargo-switch
  // button.active e das abas do painel admin) em vez de só ponto+texto
  // verde — pedido do usuário, 24/08/2026: "melhorar o padrão visual do
  // painel fixo ao padrão atual". Sem legenda embaixo do ícone (confirmado
  // no protótipo); title/aria-label seguram a acessibilidade.
  const botoes = itens.map((it) => {
    const ativo = it.id === destinoAtivo;
    const cor = it.disabled ? "#5C6268" : (ativo ? "#04140d" : "var(--pc-ink-dim)");
    const titulo = it.disabled ? "Disponível depois do resultado oficial de 2026" : (it.gate ? `${it.label} — precisa se cadastrar` : it.label);
    return `<button data-pc-menu-fixo="${it.id}" ${it.disabled ? "disabled" : ""} title="${titulo}" aria-label="${it.label}" style="flex:1; background:none; border:none; display:flex; justify-content:center; cursor:${it.disabled ? "default" : "pointer"};">
      <span style="display:flex; align-items:center; justify-content:center; padding:11.5px; border-radius:14px; background:${ativo && !it.disabled ? "var(--pc-accent)" : "transparent"}; color:${cor};">
        ${iconeSvg(it.icone, 25)}
      </span>
    </button>`;
  }).join("");
  const aberto = !!pcState.menuFixoAberto;
  return `<div class="pc-menufixo-wrap">
    <button id="pcMenuFixoAlca" aria-label="${aberto ? "Fechar menu de navegação" : "Abrir menu de navegação"}" title="${aberto ? "Fechar menu" : "Abrir menu"}" class="pc-menufixo-grip${aberto ? "" : " fechada"}"></button>
    <div class="pc-menufixo-icones${aberto ? " aberto" : ""}" style="display:flex; padding:0 4px;">${botoes}</div>
  </div>`;
}

// Chamado no fim de todo render de tela (renderColaborativo direto pras
// telas "-convidado", renderAppColaborativo pras subabas) — mostra ou
// esconde a barra. destino null esconde a barra nessa tela. Pílula
// flutuante (redesign 28/08/2026): abre sozinha na primeira tela principal
// de cada sessão e fecha em 3s — só a alça (sempre no mesmo lugar/tamanho)
// fica visível depois disso; navegar entre telas na mesma sessão NÃO reabre
// de novo (senão ficaria piscando a cada troca de aba).
function atualizarMenuFixo(destino) {
  const existente = document.getElementById("pcMenuFixoWrap");
  if (existente) existente.remove();
  clearTimeout(pcState._menuFixoAutoCloseTimer);
  const pcConteudo = document.getElementById("pcConteudo");
  if (!destino) {
    if (pcConteudo) pcConteudo.style.paddingBottom = "";
    return;
  }
  // Respiro fixo (cabe a pílula aberta + a folga de 16px até a borda),
  // independente do estado — ela flutua por CIMA do conteúdo, então o
  // espaço reservado tem que já contar com o caso mais alto (aberta).
  if (pcConteudo) pcConteudo.style.paddingBottom = "92px";
  pcState._menuFixoDestinoAtual = destino;
  const wrap = document.getElementById("modoColaborativoWrap");
  if (!wrap) return;
  // Só a primeira tela principal da sessão abre sozinha (e arma o
  // fechamento automático); trocar de tela depois, ou reabrir manualmente
  // mais tarde, não reagenda o fechamento — senão o menu "piscaria"
  // sozinho de novo a cada navegação.
  if (!pcState._menuFixoAbriuNaSessao) {
    pcState.menuFixoAberto = true;
    pcState._menuFixoAbriuNaSessao = true;
    pcState._menuFixoAutoClosePendente = true;
  }
  const div = document.createElement("div");
  div.id = "pcMenuFixoWrap";
  div.innerHTML = renderMenuFixo(destino);
  wrap.appendChild(div);
  document.getElementById("pcMenuFixoAlca").addEventListener("click", () => {
    pcState.menuFixoAberto = !pcState.menuFixoAberto;
    clearTimeout(pcState._menuFixoAutoCloseTimer);
    pcState._menuFixoAutoClosePendente = false; // abriu/fechou na mão — o automático não interfere mais
    atualizarMenuFixo(pcState._menuFixoDestinoAtual);
  });
  document.querySelectorAll("[data-pc-menu-fixo]:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => irParaDestinoMenuFixo(btn.getAttribute("data-pc-menu-fixo")));
  });
  // Flag "pendente" em vez de armar só na abertura: qualquer re-render da
  // tela dentro dos 3s (o modal de tutorial abrindo, um refresh assíncrono)
  // passa por esta função de novo e cancelava o timer no clearTimeout do
  // topo — a barra ficava aberta pra sempre (achado do usuário, 28/08/2026,
  // testando no site publicado). Enquanto o fechamento automático estiver
  // pendente e a barra aberta, re-arma a cada render até disparar.
  if (pcState._menuFixoAutoClosePendente && pcState.menuFixoAberto) {
    pcState._menuFixoAutoCloseTimer = setTimeout(() => {
      pcState._menuFixoAutoClosePendente = false;
      pcState.menuFixoAberto = false;
      atualizarMenuFixo(pcState._menuFixoDestinoAtual);
    }, 3000);
  }
}

function irParaDestinoMenuFixo(destino) {
  // Fecha de volta pra alça ao navegar — abrir e já sair não deve deixar
  // a barra aberta "grudada" na tela seguinte.
  pcState.menuFixoAberto = false;
  const gateConvidado = !pcState.perfil;
  if (destino === "painel") {
    if (pcState.perfil) { pcState.subaba = "painel"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
    return;
  }
  if (destino === "minhas-listas") {
    if (pcState.perfil) { pcState.subaba = "minhas-listas"; renderAppColaborativo(); }
    else { pcState.tela = "minhas-listas-convidado"; renderColaborativo(); }
    return;
  }
  // Ranking: a pontuação em si depende do resultado oficial (ver aviso na
  // própria tela), mas a consulta pública de cédula por nome/código não
  // depende — por isso, diferente de Médias/Grupos, não pede cadastro.
  if (destino === "ranking") {
    if (pcState.perfil) { pcState.subaba = "ranking"; renderAppColaborativo(); }
    else { pcState.tela = "ranking-convidado"; renderColaborativo(); }
    return;
  }
  // Médias e Grupos pedem cadastro pro convidado (mesma regra do Painel) —
  // pendenteAcao já sabe levar direto pra lá depois de criar a conta.
  if (gateConvidado && (destino === "medias" || destino === "grupo" || destino === "menu")) {
    pcState.pendenteRegistro = true;
    pcState.pendenteAcao = destino;
    pcState.tela = "cadastro";
    renderColaborativo();
    return;
  }
  if (pcState.perfil) { pcState.subaba = destino; renderAppColaborativo(); }
}


// ===== Farol de Orientação (ORIENTACAO.md §3) =====
// UM elemento global que acompanha o usuário pelo projeto inteiro
// (palpite → revisão → depósito → convite). Design fechado em 20/08/2026:
// sinalizador "3 pontos" sem moldura e sem animação — a quantidade de
// pontos acesos é o nível aberto (1 bolha / 2 barra / 3 painel completo);
// sem pendência, os três ficam apagados. Ciclo pelo toque 1→2→3→1, o
// "−" volta direto pra bolha, NUNCA abre sozinho, o nível persiste.

function farolNivelAtual() {
  const n = parseInt(localStorage.getItem("pcFarolNivel"), 10);
  // Sem escolha salva (1ª visita), o painel completo vem ABERTO (nível 3)
  // — decisão do usuário em 20/08/2026; o tutorial ensina a fechar no "−".
  // Depois da primeira escolha, vale sempre o nível salvo.
  return n >= 1 && n <= 3 ? n : 3;
}

function definirFarolNivel(n) {
  localStorage.setItem("pcFarolNivel", String(Math.min(3, Math.max(1, n))));
  atualizarFarol();
}

// Lista mais fresca disponível de um cargo, sem forçar carregamento: a
// edição ativa > cache de troca de aba > rascunho carregado no boot.
function _farolListaDoCargo(cid) {
  if (cid === pcState.cargoAtivo && pcState.palpiteEdicao) return pcState.palpiteEdicao;
  if (pcState.palpitesPorCargo && pcState.palpitesPorCargo[cid]) return pcState.palpitesPorCargo[cid];
  if (pcState.rascunhosCache && pcState.rascunhosCache[cid]) return pcState.rascunhosCache[cid];
  return null;
}

// Predicados do cargo (ORIENTACAO.md §4) calculados de qualquer lista, não
// só da ativa. Vagas: pro proporcional soma vagasIndicadas (o invariante do
// tapete curto); pro Senador conta marcadoEleito. Votos: o mesmo gate de
// 99,5% que habilita o Avançar.
function _farolStatusCargo(cid) {
  const totalVagas = vagasFixasCargo(pcState.estado, cid);
  const lista = _farolListaDoCargo(cid);
  if (!lista) return { vagasOk: false, votosOk: false, ind: 0, totalVagas, pct: 0 };
  let ind;
  if (cid === "senador") {
    ind = lista.reduce((s, p) => s + p.candidatos.filter((c) => c.marcadoEleito).length, 0);
  } else {
    const { counts } = dhondtComCorte(lista, totalVagas);
    ind = lista.reduce((s, p, i) => s + vagasIndicadasDe(p, counts[i] || 0), 0);
  }
  const soma = lista.reduce((s, p) => s + p.candidatos.reduce((s2, c) => s2 + (Number(c.votos) || 0), 0), 0);
  // Mesma régua da TELA (achado 9 da revisão 22/08): no Senador a tela usa
  // a projeção oficial do estado (validosOficiaisProjetados) — o farol
  // usava só a genérica e podia marcar pendente com a barra em 100%.
  const proj = cid === "senador"
    ? (validosOficiaisProjetados() || totalValidosProjetado2026(cid))
    : totalValidosProjetado2026(cid);
  return {
    vagasOk: totalVagas > 0 && ind >= totalVagas,
    votosOk: proj > 0 && soma >= 0.995 * proj,
    ind: Math.min(ind, totalVagas), totalVagas,
    pct: proj > 0 ? Math.min(1, soma / proj) : 0,
  };
}

// O passo pendente mais eficiente a partir do estado atual — ou null quando
// está tudo em dia (aí os 3 pontos ficam apagados). Fase A: montagem dos 3
// cargos (passos 1-2 da trilha por cargo). Fase B: revisar+salvar (4),
// depositar (5... exibido como 5? ver nota), convidar. Numeração exibida
// segue ORIENTACAO.md §2.3 com o 4 e o 5 fundidos em "revise e salve"
// (revisitar a Revisão não é detectável por estado — farol, não trilho).
function farolPassoAtual() {
  if (!pcState.estado) return null;
  const pendentes = CARGOS.filter((c) => {
    const st = _farolStatusCargo(c.id);
    return !(st.vagasOk && st.votosOk);
  });
  if (pendentes.length) {
    const naTelaPalpite = pcState.tela === "selecao-convidado" || (pcState.tela === "app" && pcState.subaba === "selecao");
    // Cargo ativo completo mas outros pendentes, na tela de palpite: o
    // próximo gesto da pessoa é AVANÇAR (passo 3 da trilha do cargo), não
    // a trilha do outro cargo — achado pelo usuário em 20/08/2026 ("mesmo
    // tendo completado os passos, o sistema não pulou para a etapa 3").
    if (naTelaPalpite && !pendentes.some((c) => c.id === pcState.cargoAtivo)) {
      const ativo = CARGOS.find((c) => c.id === pcState.cargoAtivo);
      const rotuloAtivo = ativo.label.replace(/^Dep\.\s*/, "");
      return { num: 3, fase: "A", cargoId: ativo.id, rotuloCargo: rotuloAtivo, rotulo: "Avance — " + rotuloAtivo + " completo", progresso: "" };
    }
    const foco = (naTelaPalpite && pendentes.some((c) => c.id === pcState.cargoAtivo))
      ? CARGOS.find((c) => c.id === pcState.cargoAtivo)
      : pendentes[0];
    const st = _farolStatusCargo(foco.id);
    const rotuloCargo = foco.label.replace(/^Dep\.\s*/, "");
    if (!st.vagasOk) {
      if (foco.id === "senador") return { num: 1, fase: "A", cargoId: foco.id, rotuloCargo, rotulo: "Indique os " + st.totalVagas + " eleitos", progresso: st.ind + " de " + st.totalVagas };
      return { num: 1, fase: "A", cargoId: foco.id, rotuloCargo, rotulo: "Preencha as vagas por partido — " + rotuloCargo, progresso: st.ind + " de " + st.totalVagas };
    }
    return { num: 2, fase: "A", cargoId: foco.id, rotuloCargo, rotulo: "Distribua a votação — " + rotuloCargo, progresso: Math.round(st.pct * 100) + "% preenchida" };
  }
  if (!pcState.listaSalvaId) return { num: 4, fase: "B", rotulo: "Revise e salve sua lista", progresso: "" };
  if (!pcState.farolTemDeposito) return { num: 5, fase: "B", rotulo: "Deposite a cédula — vale no ranking", progresso: "" };
  if (!(pcState.meusGrupos && pcState.meusGrupos.length)) return { num: 6, fase: "B", rotulo: "Convide amigos e compare palpites", progresso: "" };
  return null;
}

// Dados que o passo 5/6 precisa e não estão em memória no boot — melhor
// esforço, sem travar render nenhum; quando chega, o farol se atualiza.
async function garantirDadosFarol() {
  if (pcState._farolDadosPedidos || !pcState.estado) return;
  pcState._farolDadosPedidos = true;
  try {
    if (pcState.farolTemDeposito === undefined) await _carregarMinhasListasNormalizado();
    if (pcState.perfil && !pcState.meusGrupos) await garantirMeusGruposCarregados();
  } catch (e) { /* melhor esforço — sem dado, o farol segue com o que tem */ }
  atualizarFarol();
}

// qtd pontos acesos; comId=true só no uso clicável da bolha (nível 1).
function farolPontosHtml(qtd, comId) {
  const pontos = [1, 2, 3].map((i) => `<i class="${i <= qtd ? "on" : ""}"></i>`).join("");
  if (comId) return `<button type="button" id="pcFarolPontos" class="pc-farol-pontos" title="Painel de orientação">${pontos}</button>`;
  return `<span class="pc-farol-pontos">${pontos}</span>`;
}

function _farolLinhaTrilha(chip, titulo, opcoes) {
  const o = opcoes || {};
  const cls = o.atual ? "atual" : (o.feito ? "feito" : "futuro");
  return `<div class="pc-farol-item ${cls}">
    <span class="pc-farol-item-chip">${chip}</span>
    <div class="pc-farol-item-corpo">
      <div class="pc-farol-item-tit">${titulo}${o.progresso ? ` <span class="pc-farol-item-prog">— ${o.progresso}</span>` : ""}</div>
      ${o.texto ? `<div class="pc-farol-item-txt">${o.texto}</div>` : ""}
    </div>
  </div>`;
}

// A trilha do nível 3. Fase A mostra a trilha do cargo em foco (miniaturas
// dos controles REAIS — box de vagas, mágico, avançar); fase B, a reta
// final. Tudo em dia = tudo com check.
function farolTrilhaHtml(passo) {
  const ck = `<svg viewBox="0 0 16 16" width="11" height="11"><path d="M3.5 8.4l3 3 6-6.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  if (passo && passo.fase === "A" && (pcState._farolContexto || "palpite") === "palpite") {
    const st = _farolStatusCargo(passo.cargoId);
    const ehSen = passo.cargoId === "senador";
    return `
      ${_farolLinhaTrilha(st.vagasOk ? ck : "1", ehSen ? "Indicar os " + st.totalVagas + " eleitos" : "Preencher as vagas por partido", {
        feito: st.vagasOk, atual: passo.num === 1, progresso: st.ind + " de " + st.totalVagas,
        texto: passo.num === 1 ? (ehSen ? "Toque no candidato ou arraste a barra dele até o selo ELEITO acender." : `Comece decidindo o tamanho das bancadas: toque no box <span class="pc-farol-minibox">− 8 +</span> de cada partido e marque quantas cadeiras ele ganha, até fechar as ${st.totalVagas}.`) : "",
      })}
      ${_farolLinhaTrilha(st.votosOk ? ck : "2", "Distribuir a votação pelos candidatos", {
        feito: st.votosOk, atual: passo.num === 2, progresso: Math.round(st.pct * 100) + "%",
        texto: passo.num === 2 ? `Atribua o seu palpite para os candidatos que você conhece: arraste a alça ou digite os votos do candidato. Depois, você palpita nos candidatos que não conhece, ou utiliza o mágico <span class="pc-farol-minicmd">${iconeSvg("completar", 11)}</span> que completa a votação com os votos proporcionais para completar o número de vagas que você selecionou — sem mexer no que você preencheu.<br><br>Repare nas agulhas que nascem na régua do partido: a cinza mostra onde o quociente fecha (N×QP) e a verde onde entra vaga pela média (N×M) — é a apuração reagindo à sua votação em tempo real.` : "",
      })}
      ${_farolLinhaTrilha("3", "Salvar e revisar", {
        atual: passo.num === 3,
        texto: `Fechou a votação? Salve com o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span>. Repita nos três cargos e siga pra Revisão por "Minhas listas".`,
      })}`;
  }
  // Fora da tela de palpite a trilha muda de conversa conforme a tela
  // (farol dinâmico, aprovado em 21/08/2026): mesma moldura e nível, mas o
  // conteúdo fala do que dá pra fazer AQUI — inclusive quando a montagem
  // (fase A) ainda está pendente, em vez de explicar controles que não
  // estão nesta tela.
  const ctx = pcState._farolContexto || "palpite";
  const faseA = !!(passo && passo.fase === "A");
  const num = passo ? (faseA ? 3 : passo.num) : 99;
  if (ctx === "listas") {
    return `
      ${_farolLinhaTrilha(num > 4 ? ck : "1", "Ter uma lista completa e salva", { feito: num > 4, atual: num <= 4, texto: num <= 4 ? (faseA ? `Seu palpite ainda não fechou os 3 cargos — toque na lista pra continuar de onde parou.` : `Confira os três cargos na Revisão e salve — o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span>.`) : "" })}
      ${_farolLinhaTrilha(num > 5 ? ck : "2", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? `A urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> deposita: trava a lista e ela passa a valer no ranking. A primeira é grátis.` : "" })}
      ${_farolLinhaTrilha(num > 6 ? ck : "3", "Convidar e comparar", { feito: num > 6, atual: num === 6, texto: num === 6 ? "Compartilhe o convite de duelo — cada amigo que entrar e depositar rende créditos." : "" })}`;
  }
  if (ctx === "duelos") {
    const temLista = !(passo && passo.fase === "A");
    return `
      ${_farolLinhaTrilha(temLista ? ck : "1", "Ter um palpite pra apostar", { feito: temLista, atual: !temLista, texto: !temLista ? "O duelo puxa os votos da sua lista — continue o palpite primeiro (o farol te guia lá dentro)." : "" })}
      ${_farolLinhaTrilha("2", "Criar o duelo e enviar o convite", { atual: temLista, texto: temLista ? `Toque em <b>Criar duelo</b>, escolha a disputa e envie o cartão pro seu amigo no WhatsApp — duelar é sempre grátis.` : "" })}
      ${_farolLinhaTrilha("3", "Acompanhar o duelo selado", { texto: "Quando o rival depositar, o sino avisa — a comparação fica aqui e em Minhas listas → Cédulas de duelo até a apuração." })}`;
  }
  if (ctx === "grupos") {
    const temDeposito = !!pcState.farolTemDeposito;
    return `
      ${_farolLinhaTrilha(temDeposito ? ck : "1", "Ter uma cédula depositada", { feito: temDeposito, atual: !temDeposito, texto: !temDeposito ? `O grupo compara cédulas DEPOSITADAS — termine o palpite e deposite a sua primeiro (a urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> em Minhas listas).` : "" })}
      ${_farolLinhaTrilha("2", "Criar ou entrar num grupo", { atual: temDeposito, texto: temDeposito ? "Crie o seu grupo (família, trabalho, bar...) ou entre com o código que te mandaram." : "" })}
      ${_farolLinhaTrilha("3", "Convidar e comparar", { texto: "Convide os amigos pro grupo — o ranking interno compara as cédulas de todo mundo na apuração." })}`;
  }
  if (ctx === "revisao") {
    return `
      ${_farolLinhaTrilha(num > 4 ? ck : "1", "Conferir os 3 cargos", { feito: num > 4, atual: num <= 4, texto: num <= 4 ? "Os blocos abaixo mostram os eleitos que a sua votação fecha em cada cargo — confira antes de salvar." : "" })}
      ${_farolLinhaTrilha(num > 4 ? ck : "2", "Salvar a lista", { feito: num > 4, atual: num === 4, texto: num === 4 ? `O botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span> guarda a lista em Minhas listas — editável até depositar.` : "" })}
      ${_farolLinhaTrilha(num > 5 ? ck : "3", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? `Em Minhas listas, a urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> deposita — trava e vale no ranking.` : "" })}`;
  }
  // ctx "painel" (e qualquer outra tela com o bloco): a reta completa; se a
  // montagem está pendente, o passo 1 vira o atual e aponta pro palpite.
  let progMontar = "";
  if (faseA) {
    const sts = CARGOS.map((c) => _farolStatusCargo(c.id));
    progMontar = sts.reduce((t, x) => t + x.ind, 0) + " de " + sts.reduce((t, x) => t + x.totalVagas, 0) + " vagas";
  }
  return `
    ${_farolLinhaTrilha(faseA ? "1" : ck, "Montar os 3 cargos", { feito: !faseA, atual: faseA, progresso: progMontar, texto: faseA ? "Toque em <b>Continuar palpite</b> — lá dentro o farol te guia cargo a cargo." : "" })}
    ${_farolLinhaTrilha(num > 4 ? ck : "4", "Revisar e salvar a lista", { feito: num > 4, atual: num === 4, texto: num === 4 ? `Confira os três cargos e salve — o botão <span class="pc-farol-minicmd">${iconeSvg("salvar", 11)}</span> na Revisão. A lista fica em Minhas listas, editável.` : "" })}
    ${_farolLinhaTrilha(num > 5 ? ck : "5", "Depositar a cédula", { feito: num > 5, atual: num === 5, texto: num === 5 ? `Em Minhas listas, a urna <span class="pc-farol-minicmd">${iconeSvg("ballot", 11)}</span> deposita — trava a lista e ela passa a valer no ranking. A primeira é grátis.` : "" })}
    ${_farolLinhaTrilha(num > 6 ? ck : "6", "Convidar e comparar", { feito: num > 6, atual: num === 6, texto: num === 6 ? `Compartilhe o convite de duelo ou crie um grupo <span class="pc-farol-minicmd">${iconeSvg("convidar", 11)}</span> — cada amigo que entrar e depositar rende créditos.` : "" })}`;
}

// O bloco dos níveis 2 e 3 (e, nas telas sem seletor de cargos, também a
// linha da bolha do nível 1 — soPontosNaLinha).
function farolConteudoBloco(soPontosNaLinha) {
  const nivel = farolNivelAtual();
  const passo = farolPassoAtual();
  if (nivel === 1) {
    return soPontosNaLinha ? `<div class="pc-farol-linha1">${farolPontosHtml(passo ? 1 : 0, true)}</div>` : "";
  }
  if (nivel === 2) {
    return `<div class="pc-farol-barra" id="pcFarolBarra" role="button" tabindex="0">
      ${farolPontosHtml(passo ? 2 : 0, false)}
      ${(() => {
        const ctxB = pcState._farolContexto || "palpite";
        if (ctxB === "duelos") return `<span class="pc-farol-txt">${passo && passo.fase === "A" ? "O duelo usa a sua lista — continue o palpite primeiro" : "Crie um duelo e envie o convite pro seu amigo — é grátis"}</span>`;
        if (ctxB === "grupos") return `<span class="pc-farol-txt">${pcState.farolTemDeposito ? "Crie ou entre num grupo e convide os amigos" : "Deposite a sua cédula primeiro — o grupo compara cédulas depositadas"}</span>`;
        return passo
          ? `<span class="pc-farol-passo">Passo ${passo.num}</span><span class="pc-farol-txt">${ctxB !== "palpite" && passo.fase === "A" ? "Continue o palpite — " + passo.rotuloCargo : passo.rotulo}${passo.progresso ? " — " + passo.progresso : ""}</span>`
          : `<span class="pc-farol-txt" style="color:var(--pc-ink-dim);">Tudo em dia — nada pendente</span>`;
      })()}
      <button type="button" class="pc-farol-min" id="pcFarolMin" title="Recolher">−</button>
    </div>`;
  }
  const ctxTitulo = pcState._farolContexto || "palpite";
  const titulo = !passo
    ? "Sua trilha — tudo em dia"
    : ctxTitulo === "listas" ? "Sua trilha — minhas listas"
    : ctxTitulo === "duelos" ? "Sua trilha — duelos"
    : ctxTitulo === "grupos" ? "Sua trilha — grupos"
    : ctxTitulo === "revisao" ? "Sua trilha — revisão"
    : ctxTitulo === "painel" ? "Sua trilha"
    : (passo.fase === "A" ? "Sua trilha — " + passo.rotuloCargo : "Sua trilha — reta final");
  return `<div class="pc-farol-painel">
    <div class="pc-farol-cab" id="pcFarolCabecalho" role="button" tabindex="0">
      ${farolPontosHtml(passo ? 3 : 0, false)}
      <span class="pc-farol-cab-tit">${titulo}</span>
      <button type="button" class="pc-farol-min" id="pcFarolMin" title="Recolher">−</button>
    </div>
    ${farolTrilhaHtml(passo)}
  </div>`;
}

// Recalcula e redesenha o farol nos slots presentes na tela atual — barato
// (predicados sobre listas já em memória), chamado no fim de todo render
// que mostra o farol e a cada troca de nível.
function atualizarFarol() {
  const bloco = document.getElementById("pcFarolBloco");
  const slotPontos = document.getElementById("pcFarolPontosSlot");
  if (!bloco && !slotPontos) return;
  const nivel = farolNivelAtual();
  if (bloco) bloco.innerHTML = farolConteudoBloco(!slotPontos);
  if (slotPontos) slotPontos.innerHTML = nivel === 1 ? farolPontosHtml(farolPassoAtual() ? 1 : 0, true) : "";
  const pontos = document.getElementById("pcFarolPontos");
  if (pontos) pontos.addEventListener("click", () => definirFarolNivel(2));
  const barra = document.getElementById("pcFarolBarra");
  if (barra) barra.addEventListener("click", (ev) => { if (ev.target.closest("#pcFarolMin")) return; definirFarolNivel(3); });
  const cab = document.getElementById("pcFarolCabecalho");
  if (cab) cab.addEventListener("click", (ev) => { if (ev.target.closest("#pcFarolMin")) return; definirFarolNivel(1); });
  const min = document.getElementById("pcFarolMin");
  if (min) min.addEventListener("click", () => definirFarolNivel(1));
  garantirDadosFarol();
}

function renderColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  // Tema Fader (identidade 2.0) agora GLOBAL em toda a Prospecção
  // Coletiva (18/08/2026 — começou só na tela de palpite, expandido pra
  // todo o app a pedido do usuário, começando pela capa). O Simulador
  // individual (fora de #modoColaborativoWrap) não é afetado.
  el.classList.add("pc-tema-fader");
  if (pcState.tela === "erro-conexao") {
    el.innerHTML = `<div class="glass-card">
      <h2>Prospecção Coletiva</h2>
      <div class="pc-erro">Não consegui conectar ao servidor agora. Verifique sua conexão e recarregue a página — seu rascunho local continua guardado neste aparelho.</div>
    </div>`;
    return;
  }
  if (pcState.tela === "carregando") {
    el.innerHTML = telaCarregando();
    return;
  }
  if (pcState.tela === "landing") return renderLanding();
  if (pcState.tela === "estado") return renderTelaEstado();
  if (pcState.tela === "selecao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderSelecaoCandidatos(); atualizarMenuFixo("selecao"); return; }
  if (pcState.tela === "revisao-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderRevisaoDeposito(); atualizarMenuFixo("revisao"); return; }
  if (pcState.tela === "deposito-confirmado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderDepositoConfirmado(); atualizarMenuFixo("deposito-confirmado"); return; }
  if (pcState.tela === "painel-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderPainelPrincipal(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "minhas-listas-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderMinhasListas(); atualizarMenuFixo("minhas-listas"); return; }
  if (pcState.tela === "ranking-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderRankingPlaceholder(); atualizarMenuFixo("ranking"); return; }
  if (pcState.tela === "ajuda-convidado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderCentralAjuda(); atualizarMenuFixo(null); return; }
  if (pcState.tela === "login") return renderTelaLogin();
  if (pcState.tela === "recuperar-senha") return renderTelaRecuperarSenha();
  if (pcState.tela === "nova-senha") return renderTelaNovaSenha();
  if (pcState.tela === "cadastro") return renderTelaCadastro();
  if (pcState.tela === "completar-perfil") return renderTelaCompletarPerfil();
  if (pcState.tela === "onboarding") return renderTelaOnboarding();
  if (pcState.tela === "mini-pesquisa") return renderTelaMiniPesquisa();
  if (pcState.tela === "termos") return renderTelaLegal("termos");
  if (pcState.tela === "privacidade") return renderTelaLegal("privacidade");
  if (pcState.tela === "app") return renderAppColaborativo();
  if (pcState.tela === "compartilhado") { el.innerHTML = `<div id="pcConteudo"></div>`; renderCompartilhado(); atualizarMenuFixo(null); return; }
}

// ---------- Abertura (sem login) ----------

function renderLanding() {
  const el = document.getElementById("modoColaborativoWrap");
  // Capa no padrão "Fader" (18/08/2026): o card central usa o mesmo
  // material do console das telas de palpite (#2C3239/#4D545C), o
  // círculo do ícone reaproveita o estilo exato dos botões do console
  // (translúcido claro), e o verde vivo aparece só no botão principal —
  // único acento de cor da tela inteira, mesma escassez do resto do app.
  el.innerHTML = `
    <div class="pc-capa-console">
      <div class="pc-capa-icone">${iconeSvg("ballot", 30)}</div>
      <div class="pc-capa-marca">
        <span class="pc-capa-wordmark"><i>Simula</i>LEGIS</span>
        <span class="pc-capa-marca-sub">Simulador Eleitoral Legislativo 2026</span>
      </div>
      <h2 class="pc-capa-h2">Pronto pra testar seu faro político?</h2>
      <div class="pc-capa-sub">Monte, publique e compare a sua lista com seus amigos.</div>
      <button class="primary pc-capa-cta" id="pcBtnComecar">Começar</button>
      <button class="ghost pc-capa-entrar" id="pcBtnJaTenhoConta">já tenho conta — entrar</button>

      <div class="pc-capa-divisor"></div>
      <div class="pc-capa-desafio">${iconeSvg("grupos", 15)}Desafie aquele seu amigo, vizinho ou familiar neste game criativo e dinâmico.</div>
      <div class="pc-capa-aviso">Este game não é aposta online ou mercado preditivo.</div>
    </div>`;
  document.getElementById("pcBtnComecar").addEventListener("click", () => {
    pcState.tela = "estado";
    renderColaborativo();
  });
  document.getElementById("pcBtnJaTenhoConta").addEventListener("click", () => {
    pcState.tela = "login";
    renderColaborativo();
  });
}

// Segunda tela do convite: escolher o estado antes de qualquer coisa. Só
// Santa Catarina tem candidatos carregados hoje (dados/estados-brasil.js) —
// os demais aparecem na lista, desabilitados, preparando a expansão futura.
function renderTelaEstado() {
  const el = document.getElementById("modoColaborativoWrap");
  // Ordem alfabética SÓ na exibição da roleta (a ordem de ESTADOS_BRASIL é
  // de dados) — com SC no meio da roda, a abertura já mostra vizinhos dos
  // dois lados e a roleta fica visualmente centrada.
  const listaEstados = [...ESTADOS_BRASIL].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  const itens = listaEstados.map((e) => `
    <div class="pc-picker-item${e.disponivel ? "" : " pc-picker-disabled"}" data-uf="${e.sigla}">${e.nome}</div>
  `).join("");

  el.innerHTML = `
    <div class="pc-acesso" style="min-height:min(70vh, 560px); display:flex; flex-direction:column; justify-content:center;">
      ${cascaAcessoTopo("pcBtnVoltarEstado")}
      <div class="pc-acesso-h2">Onde você vai palpitar?</div>
      <div class="pc-acesso-sub">Role e centralize o seu estado.</div>

      <div class="pc-picker" id="pcPicker">
        <div class="pc-picker-center-band"></div>
        <div class="pc-picker-pad"></div>
        ${itens}
        <div class="pc-picker-pad"></div>
      </div>

      <div class="pc-acesso-confirm">
        <div id="pcEstadoConfirmMsg"></div>
      </div>
      <button class="primary" id="pcBtnConfirmarEstado" disabled>Continuar</button>
    </div>`;
  document.getElementById("pcBtnVoltarEstado").addEventListener("click", () => {
    // Modo "trocar estado" do usuário logado (30/08/2026): voltar cai no
    // Painel, não na capa de acesso.
    if (pcState.trocaEstadoLogado) {
      pcState.trocaEstadoLogado = false;
      pcState.subaba = "painel";
      renderAppColaborativo();
      return;
    }
    pcState.tela = "landing";
    renderColaborativo();
  });

  const picker = document.getElementById("pcPicker");
  const itensEls = picker.querySelectorAll(".pc-picker-item");
  let ufCentralizado = null;

  function atualizarPicker() {
    const centerY = picker.scrollTop + picker.clientHeight / 2;
    let maisProximo = null, menorDist = Infinity;
    itensEls.forEach((it) => {
      const itCenter = it.offsetTop + it.offsetHeight / 2;
      const dist = Math.abs(centerY - itCenter);
      const norm = Math.min(dist / 82, 1);
      it.style.opacity = String(1 - norm * 0.75);
      it.style.transform = `scale(${1 - norm * 0.25})`;
      // Desfoque progressivo nas linhas longe do centro (pedido do usuário,
      // 20/08/2026) — junto com opacidade+escala dá o efeito de roda 3D.
      it.style.filter = `blur(${(norm * 2.2).toFixed(2)}px)`;
      it.classList.remove("pc-picker-alvo");
      if (dist < menorDist) { menorDist = dist; maisProximo = it; }
    });
    if (!maisProximo) return;
    maisProximo.classList.add("pc-picker-alvo");
    ufCentralizado = maisProximo.dataset.uf;
    const estado = ESTADOS_BRASIL.find((e) => e.sigla === ufCentralizado);
    // Sem repetir o nome (ele já está verde na própria roda) — só a legenda
    // com as vagas em disputa do estado centralizado.
    const confirmMsg = document.getElementById("pcEstadoConfirmMsg");
    const btnConfirmar = document.getElementById("pcBtnConfirmarEstado");
    // A roleta agenda este código via requestAnimationFrame — se a pessoa
    // confirmar o estado no meio de um scroll, o quadro chega DEPOIS da
    // tela trocar e os elementos já não existem (TypeError visto no
    // console em 21/08/2026). Sem eles, não há mais o que atualizar.
    if (!confirmMsg || !btnConfirmar) return;
    confirmMsg.textContent = estado.disponivel
      ? `${vagasFixasCargo(estado.sigla, "estadual")} vagas de Dep. Estadual · ${vagasFixasCargo(estado.sigla, "federal")} de Federal · ${vagasFixasCargo(estado.sigla, "senador")} de Senador`
      : "Ainda sem candidatos carregados — em breve.";
    btnConfirmar.disabled = !estado.disponivel;
  }
  picker.addEventListener("scroll", () => requestAnimationFrame(atualizarPicker));

  itensEls.forEach((it) => {
    if (it.classList.contains("pc-picker-disabled")) return;
    it.addEventListener("click", () => {
      picker.scrollTop = it.offsetTop + it.offsetHeight / 2 - picker.clientHeight / 2;
    });
  });

  // Nasce centralizada em SP (decisão 21/08/2026 — maior eleitorado e
  // tendência de mais acessos); fallback SC se SP sumir da lista.
  const scItem = picker.querySelector('[data-uf="SP"]') || picker.querySelector('[data-uf="SC"]');
  picker.scrollTop = scItem.offsetTop + scItem.offsetHeight / 2 - picker.clientHeight / 2;
  atualizarPicker();

  document.getElementById("pcBtnConfirmarEstado").addEventListener("click", async () => {
    pcState.estado = ufCentralizado;
    try { window.storage.set("pc-estado-escolhido", ufCentralizado); } catch (e) { /* sem storage, segue */ }
    // Logado trocando de estado: limpa TODO cache por-estado (rascunhos,
    // palpites em edição, ordem congelada) — cada UF tem os próprios
    // rascunhos no banco (migração 27), nada se perde na troca.
    if (pcState.trocaEstadoLogado) {
      pcState.trocaEstadoLogado = false;
      pcState.palpitesPorCargo = {};
      pcState.palpiteEdicao = null;
      pcState.ordemPartidosFixa = null;
      pcState.desafioCriarCadeiras = null;
      await garantirRascunhosCarregados();
      pcState.subaba = "painel";
      renderAppColaborativo();
      return;
    }
    await garantirRascunhosCarregados();
    if (!pcState.palpiteEdicao) pcState.palpiteEdicao = montarEstadoPalpite("assembleia", null, null, "estadual", pcState.estado);
    pcState.tela = "selecao-convidado";
    renderColaborativo();
  });
}

// Tela de leitura de um link de Compartilhar (?ver=<perfil_id>) — sem
// login, sem edição, só mostra os 3 cargos que aquela pessoa já preencheu
// (rascunho_estadual/federal/senador, ver nuvem/migracao-7-rascunhos-publicos.sql).
// Reaproveita classificarEleitosPorPartido/proximosSuplentes (mesma lógica
// de montarSecaoImpressaoCargo), só que renderizado pra tela em vez de PDF.
async function renderCompartilhado() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando();
  const dados = await buscarRascunhoPublicoDe(pcState.verPerfilId);
  if (!dados) {
    el.innerHTML = `<div class="glass-card" style="max-width:520px; margin:0 auto; text-align:center;">
      <h2>Link não encontrado</h2>
      <div class="pc-sub">Esse link não é válido, ou a pessoa apagou a própria lista.</div>
      <button class="primary" id="pcBtnCompartilhadoVoltar" style="margin-top:14px;">Montar minha própria lista</button>
    </div>`;
    document.getElementById("pcBtnCompartilhadoVoltar").addEventListener("click", () => { window.location.href = window.location.pathname; });
    return;
  }
  // Estado da lista compartilhada (coluna "estado" da migração 27) — SC
  // de reserva pra linhas antigas, de antes da coluna existir.
  pcState.estado = (dados && dados.estado) || "SC";
  const linha = (c, i, rotulo) => `
    <div style="display:flex; align-items:baseline; gap:8px; padding:6px 0; border-bottom:1px solid #23262A; font-size:12.5px;">
      <span style="width:22px; color:var(--pc-ink-dim); flex-shrink:0;">${i + 1}º</span>
      <span style="flex:1; min-width:0;">${c.nome}<br><span style="font-size:10.5px; color:var(--pc-ink-dim);">${c.partido}${rotulo ? ` · ${rotulo}` : ""}</span></span>
      <span style="flex-shrink:0; color:var(--pc-ink-dim);">${c.votos.toLocaleString("pt-BR")}</span>
    </div>`;
  const secaoCargo = (cargoDef) => {
    const lista = dados[`rascunho_${cargoDef.id}`];
    if (!lista || !lista.length) {
      return `<div class="glass-card" style="margin-bottom:12px;"><h2 style="margin-bottom:2px;">${cargoDef.label}</h2><div class="pc-sub">Ainda não preencheu esse cargo.</div></div>`;
    }
    const eleitos = classificarEleitosPorPartido(lista, cargoDef.id);
    const suplentes = proximosSuplentes(15, lista);
    return `<div class="glass-card" style="margin-bottom:12px;">
      <h2 style="margin-bottom:2px;">${cargoDef.label}</h2>
      <div class="pc-sub" style="margin-bottom:8px;">${eleitos.length} eleitos marcados${suplentes.length ? ` + ${suplentes.length} próximos da vaga` : ""}</div>
      ${eleitos.map((c, i) => linha(c, i)).join("") || estadoVazio({ icone: "ballot", titulo: "Nenhum candidato marcado", texto: "Essa pessoa ainda não marcou ninguém como eleito nesse cargo." })}
      ${suplentes.map((c, i) => linha(c, eleitos.length + i, "próximo")).join("")}
    </div>`;
  };
  el.innerHTML = `
    <div class="glass-card" style="max-width:640px; margin:0 auto 12px;">
      <div style="font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:var(--pc-accent); font-weight:700; margin-bottom:4px;">Palpite compartilhado</div>
      <div style="font-size:20px; font-weight:700; margin:0 0 4px;">${dados.nome_exibicao}</div>
      <div class="pc-sub" style="margin:0;">Simulador Eleitoral — Legislativo 2026 — ${(typeof ESTADOS_BRASIL !== "undefined" && (ESTADOS_BRASIL.find((e) => e.sigla === pcState.estado) || {}).nome) || pcState.estado}</div>
    </div>
    <div style="max-width:640px; margin:0 auto;">
      ${CARGOS.map(secaoCargo).join("")}
      <div class="glass-card" style="text-align:center;">
        <div class="pc-sub" style="margin-bottom:10px;">Curioso? Monte sua própria lista.</div>
        <button class="primary" id="pcBtnCompartilhadoMontar">Começar minha lista</button>
      </div>
    </div>`;
  document.getElementById("pcBtnCompartilhadoMontar").addEventListener("click", () => { window.location.href = window.location.pathname; });
}
