// App logado: casca (renderAppColaborativo), painel principal (Lobby), perfil,
// menu da conta, ajuda, modais de créditos/reportar/excluir conta, notificações,
// carteira e loja. Ordem de carga no index.html.

// ---------- App (logado) ----------

function renderAppColaborativo() {
  const el = document.getElementById("modoColaborativoWrap");
  // O Painel tem barra própria (logo + saldo + convidar + sino + perfil,
  // ver renderPainelPrincipal) — repetir "Olá, nome" + botão de perfil
  // aqui virava duplicação visual (achado do usuário, 24/08/2026). Nas
  // demais subabas, sem barra própria, o card genérico segue existindo.
  const semCardGenerico = pcState.subaba === "painel";
  el.innerHTML = `
    ${semCardGenerico ? "" : `
    <div class="glass-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
      <div><h2 style="margin:0;">Olá, ${pcState.perfil ? pcState.perfil.nome : "visitante"}</h2>
      <div class="pc-sub" style="margin:4px 0 0;">${pcState.perfil && pcState.perfil.escopo === "partido" ? `Prevendo: ${pcState.perfil.partido_escopo}` : "Prevendo: chapa completa"}</div></div>
      <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        <button class="pc-mini-btn" id="pcBtnHomeCardGenerico" title="Ir pro início">${iconeSvg("home", 18)}</button>
        ${pcState.perfil ? `<button class="pc-mini-btn" id="pcBtnAbrirPerfil" title="Menu">${iconeSvg("perfil", 18)}</button>` : ""}
      </div>
    </div>`}
    <div id="pcConteudo"></div>
  `;
  if (!semCardGenerico) {
    const btnHomeGenerico = document.getElementById("pcBtnHomeCardGenerico");
    if (btnHomeGenerico) btnHomeGenerico.addEventListener("click", () => {
      pcState.subaba = "painel";
      renderAppColaborativo();
    });
  }
  if (pcState.perfil && !semCardGenerico) {
    document.getElementById("pcBtnAbrirPerfil").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
    });
  }

  // Seleção/Revisão/confirmação de depósito voltaram a mostrar a barra
  // (pedido do usuário, 25/08/2026: "já podemos incluir o menu fixo na
  // maioria das telas, agora que temos a função da alça") — fechada por
  // padrão, não rouba espaço do foco da tarefa. Só o Painel continua null:
  // ele já tem barra própria (logo + saldo + convidar + sino + perfil,
  // ver o header de renderPainelPrincipal), duplicar aqui seria redundante.
  if (pcState.subaba === "selecao") { renderSelecaoCandidatos(); atualizarMenuFixo("selecao"); }
  else if (pcState.subaba === "revisao") { renderRevisaoDeposito(); atualizarMenuFixo("revisao"); }
  else if (pcState.subaba === "deposito-confirmado") { renderDepositoConfirmado(); atualizarMenuFixo("deposito-confirmado"); }
  else if (pcState.subaba === "painel") { renderPainelPrincipal(); atualizarMenuFixo(null); }
  else if (pcState.subaba === "minhas-listas") { renderMinhasListas(); atualizarMenuFixo("minhas-listas"); }
  else if (pcState.subaba === "medias") { renderQuadroMedias(); atualizarMenuFixo("medias"); }
  else if (pcState.subaba === "grupo") {
    // Sub-navegação dentro de "grupo" (telaGrupo: criar/entrar/membro) —
    // antes esse roteador ignorava telaGrupo e sempre voltava pro hub
    // (bug: reabrir o app com "criar grupo" ou uma comparação de grupo
    // aberta perdia o lugar e caía no hub sem aviso). grupoAtivo some em
    // qualquer re-render fora dessa sessão (nunca persiste), então
    // "membro" sem grupoAtivo também cai no hub — não tem o que reabrir.
    if (pcState.telaGrupo === "criar") renderGrupoCriar();
    else if (pcState.telaGrupo === "entrar") renderGrupoEntrar();
    else if (pcState.telaGrupo === "membro" && pcState.grupoAtivo) renderGrupoMembro();
    else renderGrupoHub();
    atualizarMenuFixo("grupo");
  }
  else if (pcState.subaba === "menu") { renderMenuConta(); atualizarMenuFixo("menu"); }
  else if (pcState.subaba === "ranking") { renderRankingPlaceholder(); atualizarMenuFixo("ranking"); }
  // Essas 8 eram telas "sem saída" — só o botão de voltar no topo, sem
  // jeito de pular direto pro lobby ou outra aba (achado do usuário,
  // 24/08/2026). Nenhuma delas é um dos 6 destinos da barra, então
  // passar o próprio nome da subaba mostra a barra sem nada aceso —
  // mesmo efeito de "nenhum destino ativo", só que com a barra visível.
  else if (pcState.subaba === "meu-perfil") { renderMeuPerfil(); atualizarMenuFixo("meu-perfil"); }
  else if (pcState.subaba === "ajuda") { renderCentralAjuda(); atualizarMenuFixo("ajuda"); }
  else if (pcState.subaba === "admin") { renderAdminPainel(); atualizarMenuFixo("admin"); }
  else if (pcState.subaba === "usuario-final") { renderPainelUsuarioFinal(); atualizarMenuFixo("usuario-final"); }
  else if (pcState.subaba === "desafios") {
    if (pcState._abrirAceitarDueloNoBoot) {
      pcState._abrirAceitarDueloNoBoot = false;
      renderAceitarDesafio();
      atualizarMenuFixo("desafios");
    } else { renderDesafiosHub(); atualizarMenuFixo("desafios"); }
  }
  else if (pcState.subaba === "carteira") { renderCarteira(); atualizarMenuFixo("carteira"); }
  else if (pcState.subaba === "loja") { renderLoja(); atualizarMenuFixo("loja"); }
  else if (pcState.subaba === "notificacoes") { renderNotificacoes(); atualizarMenuFixo("notificacoes"); }
  // Subaba desconhecida (typo, sessão antiga restaurada): cai no PAINEL,
  // não mais no Ranking por acidente — o ranking ganhou ramo explícito
  // acima (auditoria de telas, 22/08/2026; antes 3 setters dependiam do
  // else final e qualquer valor inválido sumia calado no Ranking).
  else { pcState.subaba = "painel"; renderPainelPrincipal(); atualizarMenuFixo("painel"); }
}

// Tela "Meus dados" — só os campos editáveis da conta + trocar senha.
// Reportar problema, admin, notificações, ajuda e Sair moraram aqui até
// 16/08/2026, agora vivem na tela "Menu" (renderMenuConta, abaixo) — essa
// aqui ficou só com edição de dados de conta, acessada a partir de lá.
async function renderMeuPerfil() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando seus dados…");
  const p = pcState.perfil;
  const sessao = pcState.sessao || await sessaoAtual();
  const email = sessao ? sessao.user.email : "";

  el.innerHTML = `
    <button class="pc-mini-btn" id="pcBtnVoltarMeuPerfil" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Meus dados</div>
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <div class="pc-sub" style="margin-bottom:16px;">${email}</div>

      <div class="field-row"><label>Nome</label><input class="cell" id="pcPerfilNome" value="${p.nome || ""}"></div>
      <div class="field-row"><label>Telefone</label><input class="cell" id="pcPerfilTelefone" value="${p.telefone || ""}" placeholder="(48) 99999-9999"></div>
      <div class="field-row"><label>CEP</label><input class="cell" id="pcPerfilCep" value="${p.cep || ""}"></div>
      <div class="field-row"><label>Município</label><input class="cell" id="pcPerfilMunicipio" value="${p.municipio_residencia || ""}"></div>
      <div class="field-row"><label>Gênero</label>
        <select class="cell" id="pcPerfilGenero">
          <option value="" ${!p.genero ? "selected" : ""}>Selecione</option>
          <option value="Masculino" ${p.genero === "Masculino" ? "selected" : ""}>Masculino</option>
          <option value="Feminino" ${p.genero === "Feminino" ? "selected" : ""}>Feminino</option>
          <option value="Outro" ${p.genero === "Outro" ? "selected" : ""}>Outro</option>
        </select>
      </div>
      <div class="pc-erro" id="pcPerfilErro"></div>
      <button class="primary" id="pcBtnSalvarPerfil" style="width:100%; margin-top:6px;">Salvar alterações</button>
      <div class="pc-status" id="pcPerfilStatus" style="text-align:center; margin-top:8px;"></div>

      <div style="margin:22px 0 16px; border-top:1px solid var(--pc-glass-border);"></div>

      <h2 style="font-size:15px; margin-bottom:10px;">Trocar senha</h2>
      <div class="field-row"><label>Nova senha</label><input class="cell" type="password" id="pcPerfilNovaSenha" placeholder="mín. 8 caracteres, letra, número e símbolo"></div>
      <div class="pc-erro" id="pcSenhaErro"></div>
      <button class="ghost" id="pcBtnTrocarSenha" style="width:100%;">Trocar senha</button>
      <div class="pc-status" id="pcSenhaStatus" style="text-align:center; margin-top:8px;"></div>
    </div>`;

  document.getElementById("pcBtnVoltarMeuPerfil").addEventListener("click", () => {
    pcState.subaba = "menu";
    renderAppColaborativo();
  });
  document.getElementById("pcBtnSalvarPerfil").addEventListener("click", async () => {
    const nome = document.getElementById("pcPerfilNome").value.trim();
    const erroEl = document.getElementById("pcPerfilErro");
    if (!nome) { erroEl.textContent = "O nome não pode ficar em branco."; return; }
    erroEl.textContent = "";
    const campos = {
      nome,
      telefone: document.getElementById("pcPerfilTelefone").value.trim() || null,
      cep: document.getElementById("pcPerfilCep").value.trim() || null,
      municipio_residencia: document.getElementById("pcPerfilMunicipio").value.trim() || null,
      genero: document.getElementById("pcPerfilGenero").value || null,
    };
    const { error } = await atualizarPerfil(p.id, campos);
    const status = document.getElementById("pcPerfilStatus");
    if (error) { erroEl.textContent = error.message; return; }
    pcState.perfil = { ...p, ...campos };
    status.textContent = "Salvo.";
    setTimeout(() => { if (status) status.textContent = ""; }, 2500);
  });
  document.getElementById("pcBtnTrocarSenha").addEventListener("click", async () => {
    const novaSenha = document.getElementById("pcPerfilNovaSenha").value;
    const erroEl = document.getElementById("pcSenhaErro");
    const { error } = await trocarSenhaLogado(novaSenha);
    if (error) { erroEl.textContent = error.message; return; }
    erroEl.textContent = "";
    document.getElementById("pcPerfilNovaSenha").value = "";
    document.getElementById("pcSenhaStatus").textContent = "Senha alterada.";
  });
}

// Zera pcState e manda pro login — mesmo bloco usado no botão "Sair da
// conta" de renderMenuConta, extraído aqui só pra não duplicar.
async function executarSairDaConta() {
  await sair();
  pcState = { iniciado: true, sessao: null, perfil: null, tela: "login", subaba: "selecao", estado: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, erro: "", status: "" };
  renderColaborativo();
}

// Tela "Menu" — recepção de conta (card de perfil + Conta/Sobre/Sair),
// redesenhada em 16/08/2026 a partir de referências visuais trazidas pelo
// usuário (mockup aprovado antes de programar, ver histórico da conversa).
// Cada linha daqui é só navegação/gatilho — a lógica de verdade continua
// nas telas de destino (renderMeuPerfil, renderCentralAjuda, o modal de
// reportar problema, etc.), sem duplicar nada.
function renderMenuConta() {
  // Revalida o saldo em segundo plano ao abrir o Menu — se mudou (convite
  // que rendeu, gasto em outro aparelho), o cartão atualiza sozinho.
  if (pcState.perfil && !pcState._saldoRevalidando) {
    pcState._saldoRevalidando = true;
    obterSaldoCreditos(pcState.perfil.id).then((s2) => {
      pcState._saldoRevalidando = false;
      if (pcState.perfil && pcState.perfil.creditos !== s2) {
        pcState.perfil.creditos = s2;
        if (pcState.subaba === "menu") renderMenuConta();
      }
    }).catch(() => { pcState._saldoRevalidando = false; });
  }
  const el = document.getElementById("pcConteudo");
  const p = pcState.perfil;
  const linhaMenu = (id, icone, cor, titulo, subtitulo) => `
    <button id="${id}" style="all:unset; box-sizing:border-box; cursor:pointer; width:100%; display:flex; align-items:center; gap:13px; padding:14px 16px; border-bottom:1px solid var(--pc-glass-border);">
      <div style="width:36px; height:36px; border-radius:10px; background:${cor}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconeSvg(icone, 17)}</div>
      <div style="flex:1; text-align:left; min-width:0;">
        <div style="font-size:14px; font-weight:600; color:var(--pc-ink);">${titulo}</div>
        ${subtitulo ? `<div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:1px;">${subtitulo}</div>` : ""}
      </div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
    </button>`;

  el.innerHTML = `
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Menu</div>

    <div class="glass-card" style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
      <div style="width:52px; height:52px; border-radius:50%; background:#2C3239; border:1px solid #4D545C; display:flex; align-items:center; justify-content:center; font-size:19px; font-weight:700; color:var(--pc-accent); flex-shrink:0;">${(p.nome || "?").trim().charAt(0).toUpperCase()}</div>
      <div style="min-width:0; flex:1;">
        <div style="font-size:16px; font-weight:700;">${p.nome || "Sem nome"}</div>
        <div style="font-size:12px; color:var(--pc-ink-dim); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(pcState.sessao && pcState.sessao.user.email) || ""}</div>
      </div>
      <span title="Sua carteira — toque em Créditos pro extrato" style="flex-shrink:0; display:flex; align-items:center; gap:5px; background:#101214; border:1px solid #23262A; border-radius:999px; padding:5px 10px; font-size:11px; font-weight:750; color:var(--pc-accent); font-variant-numeric:tabular-nums;">${iconeSvg("credito", 12)}${Number(p.creditos ?? 0).toLocaleString("pt-BR")}</span>
      <button id="pcBtnEditarPerfilMenu" class="pc-mini-btn" title="Editar meus dados" style="flex-shrink:0;">${iconeSvg("editar", 15)}</button>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Conta</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuDados", "perfil", "#2C3239", "Meus dados", "Telefone, CEP, município, gênero")}
      ${linhaMenu("pcBtnMenuSenha", "chave", "#2C3239", "Trocar senha", "Atualize sua senha de acesso")}
      ${linhaMenu("pcBtnMenuCreditos", "credito", "#2C3239", "Créditos", `Saldo: ${Number(p.creditos ?? 0).toLocaleString("pt-BR")} crédito${(p.creditos ?? 0) === 1 ? "" : "s"} — toque pro extrato`)}
      <div style="display:flex; align-items:center; gap:13px; padding:14px 16px; border-bottom:1px solid var(--pc-glass-border);">
        <div style="width:36px; height:36px; border-radius:10px; background:#2C3239; border:1px solid #4D545C; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconeSvg("alerta", 17)}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:600;">Notificações por e-mail</div>
          <div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:1px;">Avisos de grupo e da eleição (em breve)</div>
        </div>
        <label class="pc-switch pc-switch-neutro" style="flex-shrink:0;"><input type="checkbox" id="pcToggleNotifEmail" ${p.notif_email ? "checked" : ""}><span class="pc-switch-slider"></span></label>
      </div>
      ${linhaMenu("pcBtnMenuReportar", "alerta", "rgba(198,230,42,.12)", "Reportar um problema", "Achou um bug? Nos conta aqui")}
      ${linhaMenu("pcBtnMenuConvidar", "convidar", "#2C3239", "Convidar amigos", "Seu grupo e código de convite")}
      ${pcState.souAdmin ? linhaMenu("pcBtnMenuAdmin", "chart", "#2C3239", "Painel do administrador", null) : ""}
      ${pcState.souUsuarioFinal ? linhaMenu("pcBtnMenuUsuarioFinal", "chart", "#2C3239", "Painel de dados estratégicos", null) : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Sobre</div>
    <div class="glass-card" style="padding:0; overflow:hidden; margin-bottom:18px;">
      ${linhaMenu("pcBtnMenuAjuda", "ajuda", "#2C3239", "Central de ajuda", "Como funciona o quociente, sobra e Senador")}
      ${linhaMenu("pcBtnMenuTermos", "ballot", "#2C3239", "Termos de uso", null)}
      ${linhaMenu("pcBtnMenuPrivacidade", "chave", "#2C3239", "Política de privacidade", null)}
    </div>

    <button id="pcBtnMenuExcluirConta" class="ghost" style="width:100%; margin-bottom:10px; color:var(--pc-danger); border-color:var(--pc-danger); opacity:.75;">Excluir conta</button>
    <button id="pcBtnMenuSair" class="ghost" style="width:100%; color:var(--pc-danger); border-color:var(--pc-danger);">Sair da conta</button>

    <div style="text-align:center; font-size:11px; color:var(--pc-ink-dim); margin-top:18px;">
      Simulador Eleitoral · Legislativo 2026
      <div style="margin-top:4px; opacity:.7;">versão ${PC_VERSAO_APP}</div>
    </div>

    ${pcState.modalReportarProblema ? renderModalReportarProblema() : ""}
    ${pcState.modalExcluirConta ? renderModalExcluirConta() : ""}
    ${pcState.modalCreditos ? renderModalCreditos() : ""}`;

  document.getElementById("pcBtnEditarPerfilMenu").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuDados").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuSenha").addEventListener("click", () => { pcState.subaba = "meu-perfil"; renderAppColaborativo(); });
  document.getElementById("pcToggleNotifEmail").addEventListener("change", async (e) => {
    const valor = e.target.checked;
    pcState.perfil = { ...p, notif_email: valor };
    await atualizarPerfil(p.id, { notif_email: valor });
  });
  document.getElementById("pcBtnMenuReportar").addEventListener("click", () => { pcState.modalReportarProblema = true; renderMenuConta(); });
  document.getElementById("pcBtnMenuCreditos").addEventListener("click", async () => {
    pcState.modalCreditos = { carregando: true };
    renderMenuConta();
    const [saldo, extrato] = await Promise.all([
      obterSaldoCreditos(p.id),
      obterExtratoCreditos(p.id, 50),
    ]);
    // extrato null = migração 21 ainda não rodou no banco — o modal avisa
    // em vez de quebrar (mesmo espírito dos outros acessos ao Supabase).
    pcState.modalCreditos = { carregando: false, saldo, extrato };
    renderMenuConta();
  });
  document.getElementById("pcBtnMenuConvidar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
  const fecharCreditos = document.getElementById("pcFecharModalCreditos");
  if (fecharCreditos) fecharCreditos.addEventListener("click", () => { pcState.modalCreditos = null; renderMenuConta(); });
  if (pcState.souAdmin) {
    document.getElementById("pcBtnMenuAdmin").addEventListener("click", () => { pcState.subaba = "admin"; renderAppColaborativo(); });
  }
  if (pcState.souUsuarioFinal) {
    document.getElementById("pcBtnMenuUsuarioFinal").addEventListener("click", () => { pcState.subaba = "usuario-final"; renderAppColaborativo(); });
  }
  document.getElementById("pcBtnMenuAjuda").addEventListener("click", () => { pcState.subaba = "ajuda"; renderAppColaborativo(); });
  document.getElementById("pcBtnMenuTermos").addEventListener("click", () => { pcState.telaLegalOrigem = "app"; pcState.tela = "termos"; renderColaborativo(); });
  document.getElementById("pcBtnMenuPrivacidade").addEventListener("click", () => { pcState.telaLegalOrigem = "app"; pcState.tela = "privacidade"; renderColaborativo(); });
  document.getElementById("pcBtnMenuExcluirConta").addEventListener("click", () => { pcState.modalExcluirConta = true; renderMenuConta(); });
  document.getElementById("pcBtnMenuSair").addEventListener("click", executarSairDaConta);

  if (pcState.modalReportarProblema) {
    document.getElementById("pcBtnFecharReportarProblema").addEventListener("click", () => {
      pcState.modalReportarProblema = false;
      renderMenuConta();
    });
    document.getElementById("pcBtnEnviarProblema").addEventListener("click", async () => {
      const mensagem = document.getElementById("pcProblemaMensagem").value.trim();
      const erroEl = document.getElementById("pcProblemaErro");
      if (!mensagem) { erroEl.textContent = "Descreve o que aconteceu, mesmo que curto."; return; }
      erroEl.textContent = "";
      const { error } = await reportarProblema(p.id, mensagem, pcState.subaba);
      if (error) { erroEl.textContent = error.message; return; }
      pcState.modalReportarProblema = false;
      pcState.status = "Problema reportado — obrigado! A gente vai olhar.";
      renderMenuConta();
    });
  }

  if (pcState.modalExcluirConta) {
    document.getElementById("pcBtnFecharExcluirConta").addEventListener("click", () => {
      pcState.modalExcluirConta = false;
      renderMenuConta();
    });
    document.getElementById("pcBtnConfirmarExcluirConta").addEventListener("click", async () => {
      const erroEl = document.getElementById("pcExcluirContaErro");
      // Não temos acesso de servidor (service_role) pra apagar a conta de
      // Auth de verdade a partir do site — só o registro da SOLICITAÇÃO,
      // na mesma tabela/fluxo de "reportar problema" (problemas_reportados,
      // já visível no Painel do administrador), pra alguém com acesso ao
      // Supabase completar a exclusão manualmente. Deixar isso claro na
      // tela em vez de fingir que já apagou tudo. Ver tarefa correspondente
      // no BACKLOG antes de prometer exclusão automática de verdade.
      const { error } = await reportarProblema(p.id, "Solicitação de exclusão de conta.", "exclusao-conta");
      if (error) { erroEl.textContent = error.message; return; }
      pcState.modalExcluirConta = false;
      await executarSairDaConta();
    });
  }
}

function renderModalExcluirConta() {
  return `
    <div id="pcModalExcluirContaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(232,67,42,.4); border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px; color:var(--pc-danger);">Excluir conta</h2>
        <div class="pc-sub" style="margin-bottom:14px; line-height:1.6;">Isso remove seu acesso e registra um pedido de exclusão dos seus dados (listas, grupos, palpites). Não dá pra desfazer depois de processado. Confirma?</div>
        <div class="pc-erro" id="pcExcluirContaErro"></div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="ghost" id="pcBtnFecharExcluirConta" style="flex:1;">Cancelar</button>
          <button id="pcBtnConfirmarExcluirConta" style="flex:1; background:var(--pc-danger); border:1px solid var(--pc-danger); color:#fff; font-family:var(--sans); font-weight:700; border-radius:8px; cursor:pointer;">Excluir</button>
        </div>
      </div>
    </div>`;
}

// Central de ajuda — consolida num só lugar as explicações de regra
// eleitoral que hoje só existem espalhadas em tooltips (ⓘ) pela tela de
// Seleção (interface/prospeccao.js) e app.js — pedido do usuário,
// 16/08/2026, junto do redesenho do Menu.
function renderCentralAjuda() {
  const el = document.getElementById("pcConteudo");
  const secao = (titulo, corpo) => `
    <div class="glass-card" style="margin-bottom:12px;">
      <h2 style="font-size:15px; margin-bottom:8px;">${titulo}</h2>
      <div style="font-size:13px; line-height:1.7; color:var(--pc-ink-dim);">${corpo}</div>
    </div>`;
  el.innerHTML = `
    <button class="pc-mini-btn" id="pcBtnVoltarAjuda" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Central de ajuda</div>

    ${secao("Dep. Estadual e Dep. Federal — proporcional", `
      Essas duas eleições distribuem as vagas por <b style="color:var(--pc-ink);">partido</b>, não direto por candidato:<br><br>
      <b style="color:var(--pc-ink);">Quociente eleitoral (QE)</b> — votos válidos ÷ vagas do cargo (art. 106). É o "preço" de uma vaga.<br>
      <b style="color:var(--pc-ink);">Quociente partidário (QP)</b> — votos do partido ÷ QE, parte inteira (art. 107). Quantas vagas o partido já garante de cara.<br>
      <b style="color:var(--pc-ink);">Sobra (método das médias, art. 109)</b> — vagas que sobram depois do QP de todos, distribuídas uma de cada vez pro partido com a maior média (votos ÷ (cadeiras atuais + 1)) naquela rodada — sem piso mínimo de votação (o piso do art. 109 §2º foi derrubado pelo STF em fevereiro/2024).<br><br>
      Dentro do partido, quem primeiro ocupa as vagas é sempre quem tem mais voto — QP e sobra decidem QUANTAS vagas o partido leva, não QUEM dentro dele.
    `)}

    ${secao("Senador — majoritário", `
      Diferente dos outros dois, o Senado é <b style="color:var(--pc-ink);">voto direto</b> (art. 46): não tem quociente, não tem partido "ganhando vagas" — os candidatos mais votados do estado inteiro, cruzando todos os partidos, são eleitos. Em SC, 2026 é ano de elegar 2 das 3 cadeiras.
    `)}

    ${secao("\"Eleito\" no simulador", `
      Quem está marcado como eleito na sua lista é sempre a <b style="color:var(--pc-ink);">sua escolha</b> — nunca é substituído automaticamente pela matemática. Quando um candidato não marcado bateria a vaga pela conta real, você recebe um aviso — mas a decisão final é sempre sua.
    `)}

    ${secao("Isso é uma simulação", `
      Os números de 2026 são estimativas (baseadas no resultado real de 2022, escalado pelo crescimento do eleitorado) até a eleição de verdade acontecer em outubro. Nenhuma lista aqui é uma pesquisa oficial nem uma aposta.
    `)}`;

  document.getElementById("pcBtnVoltarAjuda").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "menu"; renderAppColaborativo(); }
    else { pcState.tela = "painel-convidado"; renderColaborativo(); }
  });
}

// Modal "Créditos" do Menu — saldo + extrato da própria conta (economia
// fase 1, MONETIZACAO.md v3 §11.2 etapa 1). Material do padrão
// informativo (DESIGN.md §3.4b). Dados carregados no listener da linha
// do Menu; extrato null = migração 21 ainda não rodada no banco.
function renderModalCreditos() {
  const m = pcState.modalCreditos;
  if (!m) return "";
  const corpo = m.carregando
    ? `<div class="pc-sub" style="text-align:center; padding:20px 0;">Carregando…</div>`
    : `
      <div style="display:flex; align-items:baseline; justify-content:space-between; background:#101214; border:1px solid #23262A; border-radius:10px; padding:12px 14px; margin-bottom:12px;">
        <span style="font-size:12px; color:var(--pc-ink-dim);">Saldo atual</span>
        <span style="font-size:22px; font-weight:750; font-variant-numeric:tabular-nums;">${Number(m.saldo || 0).toLocaleString("pt-BR")} <span style="font-size:11px; font-weight:600; color:var(--pc-ink-dim);">crédito${m.saldo === 1 ? "" : "s"}</span></span>
      </div>
      ${m.extrato === null
        ? `<div class="pc-sub">O extrato ainda não está disponível (atualização do banco pendente).</div>`
        : m.extrato.length === 0
          ? `<div class="pc-sub" style="text-align:center; padding:8px 0;">Nenhuma movimentação ainda — convide amigos pra ganhar os primeiros créditos.</div>`
          : m.extrato.map((t) => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 2px; border-top:1px solid #23262A; font-size:12px;">
              <span style="min-width:0;">
                <span style="display:block; font-weight:600;">${ROTULO_TRANSACAO[t.tipo] || t.tipo}</span>
                <span style="font-size:10px; color:var(--pc-ink-dim);">${new Date(t.criado_em).toLocaleString("pt-BR")}${t.referencia ? " · " + t.referencia : ""}</span>
              </span>
              <span style="flex-shrink:0; text-align:right; font-variant-numeric:tabular-nums;">
                <span style="font-weight:750; color:${t.valor >= 0 ? "var(--pc-accent)" : "var(--pc-ink)"};">${t.valor >= 0 ? "+" : ""}${t.valor}</span>
                <span style="display:block; font-size:9.5px; color:var(--pc-ink-faint);">saldo ${t.saldo_apos}</span>
              </span>
            </div>`).join("")}`;
  return `
    <div id="pcModalCreditosOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; max-height:86vh; overflow-y:auto; background:rgba(29,32,35,.97); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;">
          <div>
            <h2 style="margin:0; font-size:16px;">Créditos</h2>
            <div class="pc-sub" style="margin-top:3px;">Extrato completo da sua conta — toda entrada e saída fica registrada aqui.</div>
          </div>
          <button id="pcFecharModalCreditos" class="pc-mini-btn" title="Fechar" style="font-size:16px; line-height:1;">×</button>
        </div>
        ${corpo}
      </div>
    </div>`;
}

function renderModalReportarProblema() {
  return `
    <div id="pcModalReportarProblemaOverlay" style="position:fixed; inset:0; z-index:100; background:rgba(8,9,11,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="max-width:380px; width:100%; background:rgba(29,32,35,.97); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid #2B2F33; border-radius:18px; padding:22px 20px; box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <h2 style="margin-bottom:4px; font-size:15px;">Reportar um problema</h2>
        <div class="pc-sub" style="margin-bottom:14px;">Conta o que aconteceu — bug, tela travada, número que parece errado, qualquer coisa.</div>
        <textarea class="cell" id="pcProblemaMensagem" rows="5" style="width:100%; resize:vertical; font-family:var(--sans);" placeholder="Descreva o problema..."></textarea>
        <div class="pc-erro" id="pcProblemaErro"></div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="ghost" id="pcBtnFecharReportarProblema" style="flex:1;">Cancelar</button>
          <button class="primary" id="pcBtnEnviarProblema" style="flex:1;">Enviar</button>
        </div>
      </div>
    </div>`;
}

// Primeiro domingo de outubro de 2026 (calendário eleitoral — 1º turno das
// eleições gerais). Só usado pro contador de dias do Lobby.
const DATA_ELEICAO_2026 = new Date("2026-10-04T00:00:00-03:00");

function diasAteEleicao() {
  return Math.max(0, Math.ceil((DATA_ELEICAO_2026 - new Date()) / 86400000));
}

// Painel principal ("Lobby") — padrão flat 2D confirmado com o usuário em
// 04/08/2026 depois de várias rodadas de protótipo (ver ferramenta de
// visualização da conversa): profundidade só por camada de tom (nunca
// blur/glow/gradiente), sobretons de verde, sem barra inferior de atalhos
// (ela já mostraria os mesmos destinos do menu daqui, duplicado).
// Letreiro dinâmico (protótipo aprovado 30/08/2026): faixa que rola sozinha
// alternando Orientação (como usar algo na tela) e Dica (algo que vale a
// pena saber) — só na tela principal (Painel). A lista de mensagens
// aparece 2x seguidas no trilho pra loop ficar sem costura visível (anda
// -50% da largura total, que é exatamente 1 volta da lista).
// EM STANDBY (pedido do usuário, 30/08/2026): construído e testado, mas
// desligado por enquanto — trocar LETREIRO_ATIVO pra true quando for a
// hora de ligar de novo. Não apagar as mensagens/CSS junto.
const LETREIRO_ATIVO = false;
const LETREIRO_MENSAGENS = [
  { tag: "Dica", texto: "Convide amigos: quando alguém entra pelo seu link e deposita a 1ª cédula, você ganha 1 SL" },
  { tag: "Orientação", texto: "Arraste a barra do candidato pra distribuir os votos — ou toque duas vezes pra digitar o número direto" },
  { tag: "Orientação", texto: "O botão \"Salvar\" já registra o palpite — não precisa de mais nenhum passo depois" },
  { tag: "Dica", texto: "Depois do quociente partidário, o resto das vagas vai pra aba \"Disputa das sobras\"" },
];
function montarLetreiroPainel() {
  if (!LETREIRO_ATIVO) return "";
  const itens = LETREIRO_MENSAGENS.map((m) => `<span><span class="pc-letreiro-tag">${m.tag}</span>${m.texto}</span>`).join("");
  // Velocidade reduzida (pedido do usuário, 30/08/2026): de 6.5s por
  // mensagem pra 11s — dá mais tempo de ler cada frase antes de rolar.
  const duracao = Math.max(28, LETREIRO_MENSAGENS.length * 11);
  return `
    <div class="pc-letreiro" id="pcLetreiroPainel" title="Toque pra pausar">
      <span class="pc-letreiro-marcador"></span>
      <div class="pc-letreiro-faixa">
        <div class="pc-letreiro-trilho" style="--pc-letreiro-duracao:${duracao}s;">${itens}${itens}</div>
      </div>
    </div>`;
}

async function renderPainelPrincipal() {
  pcState._farolContexto = "painel";
  const el = document.getElementById("pcConteudo");
  // Só mostra a tela de carregando própria do Painel se os dados AINDA
  // não estão quentes — logo após login/boot, initColaborativo() já
  // pré-carregou os dois caches, então esse "carregando" nem chega a
  // aparecer (era ele que piscava por cima do carregando do boot, lendo
  // como "carrega duas vezes" — achado do usuário, 24/08/2026).
  const jaQuente = pcState.rascunhosCacheEstado === pcState.estado && (!pcState.perfil || pcState.meusGrupos);
  if (!jaQuente) el.innerHTML = telaCarregando("Carregando seu painel…");

  await garantirRascunhosCarregados();
  // Convidado (sem cadastro) não tem perfil_id pra carregar grupos —
  // pcState.meusGrupos fica null, o resto da função já trata isso como
  // "sem grupo" (ver atividadeAmigo abaixo).
  if (pcState.perfil) await garantirMeusGruposCarregados();
  // Revalida o contador do sino sempre que volta pro painel — antes só
  // carregava uma vez no boot (initColaborativo), então quem recebia um
  // desafio/notificação nova enquanto navegava nunca via o indicador
  // acender sem recarregar a página inteira (achado 28/08/2026).
  if (pcState.perfil) {
    try { pcState.notificacoesNaoLidas = await contarNotificacoesNaoLidas(); } catch (e) { /* sem indicador */ }
  }

  // Status "geral" soma os 3 cargos (Estadual+Federal+Senador) — diferente
  // do resto do app, que sempre trabalha 1 cargo ativo por vez.
  let totalMarcado = 0, totalVagas = 0;
  CARGOS.forEach((c) => {
    const poolOficial = montarEstadoPalpite("assembleia", null, null, c.id, pcState.estado);
    const rascunho = pcState.rascunhosCache[c.id];
    // rascunhoEhOrfao: mesma regra de garantirPalpiteEdicaoAtivo — não
    // conta rascunho preso num elenco antigo que a fonte oficial já
    // substituiu.
    const lista = (rascunho && !rascunhoEhOrfao(rascunho, poolOficial)) ? rascunho : poolOficial;
    totalMarcado += lista.reduce((s, p) => s + p.candidatos.filter((cc) => cc.marcadoEleito).length, 0);
    totalVagas += vagasFixasCargo(pcState.estado, c.id);
  });
  const completa = totalVagas > 0 && totalMarcado >= totalVagas;
  const fracaoPreenchida = totalVagas ? Math.min(1, totalMarcado / totalVagas) : 0;
  // 3 tons de verde repartindo a barra pelo PESO de cada cargo no total de
  // vagas (não por quanto já foi preenchido em cada um) — é só pra mostrar
  // visualmente "isto soma os 3 cargos", ver conversa com o usuário.
  const pesoEstadual = totalVagas ? vagasFixasCargo(pcState.estado, "estadual") / totalVagas : 0;
  const pesoFederal = totalVagas ? vagasFixasCargo(pcState.estado, "federal") / totalVagas : 0;
  const pesoSenador = totalVagas ? 1 - pesoEstadual - pesoFederal : 0;

  // Atividade de amigos: melhor esforço, olha só o primeiro grupo da pessoa
  // (se tiver) — quem atualizou a lista por último, excluindo ela mesma.
  // Convidado nunca tem grupo carregado (ver guarda acima), então isso já
  // fica null pra ele sem precisar de checagem extra.
  let atividadeAmigo = null;
  if (pcState.meusGrupos && pcState.meusGrupos.length) {
    const comparacao = await buscarComparacaoGrupo(pcState.meusGrupos[0].id);
    const outros = comparacao
      .filter((r) => r.perfil_id !== pcState.perfil.id)
      .sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em));
    if (outros.length) atividadeAmigo = outros[0].nome_exibicao;
  }

  // Convidado só mexe na própria lista sem cadastro — compartilhar, grupos
  // e quadro de médias pedem conta (mesma regra combinada com o usuário
  // pro Lobby antigo, agora aplicada aqui). Fica visualmente apagado pra
  // sinalizar que precisa se cadastrar, em vez de sumir — mantém a
  // estrutura do painel igual pra logado e convidado.
  const gateConvidado = !pcState.perfil;
  const estiloApagado = gateConvidado ? "opacity:.45;" : "";
  const tituloApagado = gateConvidado ? "Precisa se cadastrar" : "";

  // Subtítulos dos atalhos — só dado já disponível/barato de buscar aqui
  // (rascunhosCache e meusGrupos já carregados acima); Mediana fica com
  // texto fixo porque contar palpites públicos de verdade puxaria TODOS os
  // rascunhos públicos do estado só pra um número no Painel, caro demais
  // pra essa tela. Redesenho pedido pelo usuário em 16/08/2026 (referência
  // Nubank/BYD), mockup aprovado antes de programar.
  const minhasListasPainel = await _carregarMinhasListasNormalizado();
  const totalListas = minhasListasPainel.length;
  // Lista mais recente DEPOSITADA (com código) — é o que o botão de
  // compartilhar do Painel abre agora (correção 28/08/2026: o botão
  // antigo injetava um campo de link ?ver= no RODAPÉ da tela, fora da
  // vista no celular — parecia simplesmente não funcionar).
  const listaDepositadaPainel = minhasListasPainel
    .filter((l) => l.depositadoEm && l.codigo)
    .sort((a, b) => new Date(b.depositadoEm) - new Date(a.depositadoEm))[0] || null;
  const totalGrupos = pcState.meusGrupos ? pcState.meusGrupos.length : 0;
  const totalDesafiosAtivos = gateConvidado ? 0 : await contarMeusDesafiosAtivos();

  el.innerHTML = `
    <div id="pcFarolBloco"></div>

    <div class="pc-topbar">
      <div class="pc-topbar-marca"><span class="pc-topbar-nome"><b>Simula</b>LEGIS</span><span class="pc-topbar-prevendo">${pcState.perfil && pcState.perfil.escopo === "partido" ? `Prevendo: ${pcState.perfil.partido_escopo}` : "Prevendo: chapa completa"}</span></div>
      ${pcState.perfil ? `<button class="pc-topbar-cred" id="pcBtnSaldoTopo" title="Seus créditos">${iconeSvg("credito", 14)}<span>${Number((pcState.perfil && pcState.perfil.creditos) || 0)}</span></button>` : ""}
      <button class="pc-topbar-btn" id="pcBtnConvidarTopo" title="Convidar amigos">${iconeSvg("convidar", 17)}</button>
      ${pcState.perfil ? `<button class="pc-topbar-btn" id="pcBtnSinoTopo" title="Notificações" style="position:relative;">${iconeSvg("sino", 17)}${pcState.notificacoesNaoLidas ? `<span class="pc-topbar-pip"></span>` : ""}</button>` : ""}
      <button class="pc-topbar-btn" id="pcBtnPerfilTopo" title="${gateConvidado ? "Precisa se cadastrar" : "Menu e perfil"}">${iconeSvg("perfil", 17)}</button>
    </div>

    ${montarLetreiroPainel()}

    <div class="pc-lobby-card">
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <span style="font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:6px; color:var(--pc-ink);">${completa ? `<span style="color:var(--pc-accent); display:flex;">${iconeSvg("checkCirculo", 14)}</span>Lista completa` : "Sua lista"}</span>
          <span style="font-size:11.5px; font-weight:600; color:${completa ? "var(--pc-accent)" : "var(--pc-ink-dim)"};">${totalMarcado}<span style="color:var(--pc-ink-dim);">/${totalVagas}</span></span>
        </div>
        <div class="pc-lobby-barra">
          <div style="width:${(fracaoPreenchida * pesoEstadual * 100).toFixed(1)}%; background:var(--pc-accent);"></div>
          <div style="width:${(fracaoPreenchida * pesoFederal * 100).toFixed(1)}%; background:var(--pc-lobby-verde-media);"></div>
          <div style="width:${(fracaoPreenchida * pesoSenador * 100).toFixed(1)}%; background:var(--pc-lobby-verde-forte);"></div>
        </div>
      </div>
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:6px;">${iconeSvg("calendario", 14)}Faltam ${diasAteEleicao()} dias pra eleição</span>
      </div>
      ${atividadeAmigo ? `<div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-accent); font-weight:600; display:flex; align-items:center; gap:6px;">${iconeSvg("grupos", 14)}${atividadeAmigo} atualizou a lista</span>
      </div>` : ""}
    </div>

    <div class="pc-lobby-banner">
      <div class="pc-lobby-banner-eyebrow">Convide amigos</div>
      <div class="pc-lobby-banner-titulo">Desafie quem entende de política</div>
      <div class="pc-lobby-banner-corpo">Compare sua lista lado a lado com a de amigos, num grupo só seu.</div>
      <button class="pc-lobby-banner-btn" id="pcBtnConviteBanner">Criar grupo ${iconeSvg("setaDireita", 13)}</button>
    </div>

    <button class="pc-urna" id="pcBtnUrna">
      <span class="pc-urna-btn">${iconeSvg("urna", 52)}</span>
      <span class="pc-urna-rot">Minhas listas${totalListas ? `<span class="pc-urna-badge">${totalListas}</span>` : ""}</span>
      <span class="pc-urna-sub">montar, revisar e depositar a cédula</span>
    </button>

    ${listaDepositadaPainel && !gateConvidado ? `
    <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <button class="pc-lobby-icon-btn" id="pcBtnCompartilharLobby" title="Compartilhar minha cédula (convite de duelo)">${iconeSvg("compartilhar", 16)}</button>
    </div>` : ""}

    <button class="pc-lobby-duelo" id="pcBtnDueloLobby" style="${estiloApagado}" title="${tituloApagado}">
      <span class="pc-lobby-duelo-ic">${iconeSvg("desafio", 18)}</span>
      <span class="pc-lobby-duelo-tx"><b>Duelo 1×1</b><i>desafie alguém pra bater palpite</i></span>
      ${iconeSvg("setaDireita", 14)}
    </button>

    <div class="pc-lobby-menu-tit">Atalhos</div>
    <div class="pc-lobby-tiles">
      <button class="pc-lobby-tile" id="pcMenuListas">
        <span class="pc-lobby-tile-ic">${iconeSvg("lista", 24)}</span>
        <span class="pc-lobby-tile-rot">Listas</span>
        ${totalListas ? `<span class="pc-lobby-tile-badge">${totalListas}</span>` : ""}
      </button>
      <button class="pc-lobby-tile" id="pcMenuMedias" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("termometro", 24)}</span>
        <span class="pc-lobby-tile-rot">Termômetro<br>eleitoral</span>
      </button>
      <button class="pc-lobby-tile" id="pcMenuGrupos" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("grupos", 24)}</span>
        <span class="pc-lobby-tile-rot">Grupos</span>
        ${totalGrupos ? `<span class="pc-lobby-tile-badge">${totalGrupos}</span>` : ""}
      </button>
      <button class="pc-lobby-tile" id="pcMenuRanking">
        <span class="pc-lobby-tile-ic">${iconeSvg("ranking", 24)}</span>
        <span class="pc-lobby-tile-rot">Ranking<br>(usuários)</span>
      </button>
      <button class="pc-lobby-tile" id="pcMenuDesafios" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("desafio", 24)}</span>
        <span class="pc-lobby-tile-rot">Duelos</span>
        ${totalDesafiosAtivos ? `<span class="pc-lobby-tile-badge">${totalDesafiosAtivos}</span>` : ""}
      </button>
      <button class="pc-lobby-tile" id="pcMenuLoja" ${gateConvidado ? 'data-pc-gate="1"' : ""}>
        <span class="pc-lobby-tile-ic">${iconeSvg("loja", 24)}</span>
        <span class="pc-lobby-tile-rot">Loja</span>
      </button>
    </div>

    <div class="pc-lobby-mais-tit">Mais funções</div>
    <div class="pc-lobby-mais">
      <button class="pc-lobby-mais-item" id="pcMenuTrocarEstado">${iconeSvg("mapa", 15)}<span>Trocar estado · <b style="color:var(--pc-accent);">${pcState.estado}</b></span>${iconeSvg("setaDireita", 13)}</button>
      <button class="pc-lobby-mais-item" id="pcMenuAjudaLobby">${iconeSvg("ajuda", 15)}<span>Central de ajuda</span>${iconeSvg("setaDireita", 13)}</button>
    </div>
  `;

  // Convidado sem cadastro: qualquer destino que precise de conta
  // (compartilhar, grupos, quadro de médias) leva pro cadastro em vez de
  // quebrar tentando usar pcState.perfil.id — pendenteAcao decide pra onde
  // volta depois de criar a conta (ver renderTelaCadastro).
  const irParaCadastro = (acao) => {
    pcState.pendenteRegistro = true;
    pcState.pendenteAcao = acao;
    pcState.tela = "cadastro";
    renderColaborativo();
  };
  atualizarFarol();
  const irParaListas = () => {
    if (pcState.perfil) { pcState.subaba = "minhas-listas"; renderAppColaborativo(); }
    else { pcState.tela = "minhas-listas-convidado"; renderColaborativo(); }
  };
  // A urna é a porta principal do Painel (desenho de 24/08/2026): leva pro
  // mesmo destino do atalho "Listas", que é de onde se monta, revisa e
  // deposita a cédula.
  document.getElementById("pcBtnUrna").addEventListener("click", irParaListas);
  document.getElementById("pcMenuListas").addEventListener("click", irParaListas);
  document.getElementById("pcBtnConvidarTopo").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcBtnPerfilTopo").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro(null);
    pcState.subaba = "menu"; renderAppColaborativo();
  });
  const btnSaldoTopo = document.getElementById("pcBtnSaldoTopo");
  if (btnSaldoTopo) btnSaldoTopo.addEventListener("click", () => { pcState.subaba = "carteira"; renderAppColaborativo(); });
  const btnSinoTopo = document.getElementById("pcBtnSinoTopo");
  if (btnSinoTopo) btnSinoTopo.addEventListener("click", () => { pcState.subaba = "notificacoes"; renderAppColaborativo(); });
  // Letreiro: no celular não existe hover pra pausar sozinho — um toque
  // alterna pausado/rolando (achado do próprio padrão de marquee mobile).
  const letreiro = document.getElementById("pcLetreiroPainel");
  if (letreiro) letreiro.addEventListener("click", () => letreiro.classList.toggle("pausado"));
  const btnDueloLobby = document.getElementById("pcBtnDueloLobby");
  if (btnDueloLobby) btnDueloLobby.addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("desafios");
    pcState.subaba = "desafios"; renderAppColaborativo();
  });
  const btnDesafios = document.getElementById("pcMenuDesafios");
  if (btnDesafios) btnDesafios.addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("desafios");
    pcState.subaba = "desafios"; renderAppColaborativo();
  });
  const btnLoja = document.getElementById("pcMenuLoja");
  if (btnLoja) btnLoja.addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("loja");
    pcState.subaba = "loja"; renderAppColaborativo();
  });
  document.getElementById("pcMenuRanking").addEventListener("click", () => {
    if (pcState.perfil) { pcState.subaba = "ranking"; renderAppColaborativo(); }
    else { pcState.tela = "ranking-convidado"; renderColaborativo(); }
  });
  document.getElementById("pcMenuMedias").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("medias");
    pcState.subaba = "medias"; renderAppColaborativo();
  });
  document.querySelectorAll('[data-pc-gate="1"]').forEach((b) => b.classList.add("pc-lobby-tile-gate"));
  document.getElementById("pcMenuGrupos").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcBtnConviteBanner").addEventListener("click", () => {
    if (gateConvidado) return irParaCadastro("grupo");
    pcState.subaba = "grupo"; renderAppColaborativo();
  });
  document.getElementById("pcMenuTrocarEstado").addEventListener("click", () => {
    pcState.trocaEstadoLogado = true;
    renderTelaEstado();
  });
  document.getElementById("pcMenuAjudaLobby").addEventListener("click", () => {
    // Central de ajuda é conteúdo fixo (regras do jogo), sem depender de
    // conta — diferente de Mediana/Grupos, não faz sentido pedir cadastro
    // só pra ler isso.
    if (pcState.perfil) { pcState.subaba = "ajuda"; renderAppColaborativo(); }
    else { pcState.tela = "ajuda-convidado"; renderColaborativo(); }
  });
  // Correção 28/08/2026 (achado do usuário no teste mobile: "o botão não
  // funciona"): o antigo mostrarLinkCompartilhavel injetava um campo de
  // link ?ver= no RODAPÉ do Painel — fora da vista no celular, parecia
  // morto. Agora abre o MESMO modal de compartilhar de Minhas Listas
  // (cartão-desafio + código), com a cédula depositada mais recente —
  // uma peça só de divulgação, um comportamento só no app inteiro.
  const btnCompartilhar = document.getElementById("pcBtnCompartilharLobby");
  if (btnCompartilhar && listaDepositadaPainel) btnCompartilhar.addEventListener("click", async () => {
    if (pcState.perfil) pcState.subaba = "minhas-listas";
    else pcState.tela = "minhas-listas-convidado";
    await abrirModalCompartilharLista(listaDepositadaPainel.id, minhasListasPainel);
  });
}

function _tempoRelativo(dataIso) {
  const diffMs = Date.now() - new Date(dataIso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${Math.max(1, min)}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function _iconeNotificacao(tipo) {
  if (tipo && tipo.indexOf("desafio") === 0) return "desafio";
  if (tipo === "convite_convertido") return "convidar";
  if (tipo === "termometro_abriu") return "termometro";
  return "ajuda";
}

async function renderNotificacoes() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando notificações…");
  const lista = await listarMinhasNotificacoes(40);
  await marcarNotificacoesLidas();
  pcState.notificacoesNaoLidas = 0;

  const novas = lista.filter((n) => !n.lida_em);
  const antes = lista.filter((n) => n.lida_em);
  const linha = (n) => `
    <div class="pc-notif-item">
      <div class="pc-notif-ic">${iconeSvg(_iconeNotificacao(n.tipo), 16)}</div>
      <div class="pc-notif-corpo">
        <div class="pc-notif-titulo">${n.titulo}</div>
        ${n.corpo ? `<div class="pc-notif-desc">${n.corpo}</div>` : ""}
        ${n.tipo === "desafio_recebido" ? `<button class="pc-notif-acao" data-pc-ver-desafio="${n.referencia_id}">Ver duelo</button>` : ""}
        ${n.tipo === "desafio_aceito" ? `<button class="pc-notif-acao" data-pc-ver-desafio="${n.referencia_id}">Ver o duelo selado</button>` : ""}
        ${n.tipo === "desafio_lembrete" ? `<button class="pc-notif-acao" data-pc-ver-desafio="${n.referencia_id}">Reenviar o convite</button>` : ""}
      </div>
      <div class="pc-notif-hora">${_tempoRelativo(n.criado_em)}</div>
    </div>`;

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarNotif" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
      <h2 style="margin-bottom:2px;">Notificações</h2>
      <div class="pc-sub" style="margin-bottom:14px;">Tudo que aconteceu com você no app.</div>
      ${novas.length ? `<div class="pc-lobby-menu-tit" style="margin-top:0;">Novas · ${novas.length}</div><div class="pc-lobby-card" style="padding:2px 14px;">${novas.map(linha).join("")}</div>` : ""}
      ${antes.length ? `<div class="pc-lobby-menu-tit">Antes</div><div class="pc-lobby-card" style="padding:2px 14px;">${antes.map(linha).join("")}</div>` : ""}
      ${!lista.length ? estadoVazio({ icone: "ajuda", titulo: "Nada por aqui ainda", texto: "Duelos, convites e créditos aparecem aqui conforme forem acontecendo." }) : ""}
    </div>`;
  document.getElementById("pcBtnVoltarNotif").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.querySelectorAll("[data-pc-ver-desafio]").forEach((btn) => btn.addEventListener("click", () => {
    pcState.desafioDestacadoId = btn.getAttribute("data-pc-ver-desafio");
    pcState.subaba = "desafios"; renderAppColaborativo();
  }));
}

// ===== Carteira (migração 28) =====
async function renderCarteira() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando sua carteira…");
  try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) {}
  const extrato = (await obterExtratoCreditos(pcState.perfil.id, 30)) || [];
  const saldo = Number(pcState.perfil.creditos) || 0;

  const linhaExtrato = (t) => {
    const positivo = t.valor > 0;
    return `
    <div class="pc-ex-linha">
      <span class="pc-ex-ic ${positivo ? "mais" : "menos"}">${positivo
        ? `<svg width="13" height="13" viewBox="0 0 16 16"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`
        : `<svg width="13" height="13" viewBox="0 0 16 16"><path d="M3.5 8h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`}</span>
      <span class="pc-ex-corpo">
        <span class="pc-ex-tit">${ROTULO_TRANSACAO[t.tipo] || t.tipo}</span>
        <span class="pc-ex-desc">${new Date(t.criado_em).toLocaleDateString("pt-BR")}${t.referencia ? " · " + t.referencia : ""}</span>
      </span>
      <span class="pc-ex-val ${positivo ? "mais" : "menos"}">${positivo ? "+" : ""}${t.valor}</span>
      <span class="pc-ex-saldo">${t.saldo_apos}</span>
    </div>`;
  };

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarCarteira" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
      <div class="pc-cart-hero">
        <div class="pc-cart-lbl">Seu saldo</div>
        <div class="pc-cart-num">${iconeSvg("credito", 28)}${saldo}</div>
        <div class="pc-cart-eq">dá pra ${saldo >= 10 ? "1 desafio ou 1 grupo novo" : "acumular mais um pouco"}</div>
        <div class="pc-cart-btns">
          <button class="primary" id="pcBtnIrLoja" style="flex:1;">Comprar SL</button>
          <button class="ghost" id="pcBtnIrGanhar" style="flex:1;">Ganhar convidando</button>
        </div>
      </div>

      <div class="pc-lobby-menu-tit">Histórico</div>
      ${extrato.length ? `<div class="pc-lobby-card" style="padding:4px 14px;">${extrato.map(linhaExtrato).join("")}</div>`
        : `<div class="pc-lobby-card">${estadoVazio({ icone: "credito", titulo: "Nenhuma movimentação ainda", texto: "Assim que você ganhar ou gastar SL, aparece aqui." })}</div>`}
    </div>`;
  document.getElementById("pcBtnVoltarCarteira").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.getElementById("pcBtnIrLoja").addEventListener("click", () => { pcState.subaba = "loja"; renderAppColaborativo(); });
  document.getElementById("pcBtnIrGanhar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
}

// ===== Loja (migração 28) =====
// Comprar SL ainda não tem gateway de pagamento (mesma situação de
// creditos.js: "sem cobrança de verdade ainda" — MONETIZACAO.md §2.1).
// Os pacotes aparecem por transparência de preço; o botão de fato
// funcional continua sendo "convide amigos" (ganha 1 SL por convite,
// teto 25) e os desafios/termômetro, que já gastam SL de verdade.
function renderLoja() {
  const conteudo = document.getElementById("pcConteudo");
  const saldo = Number((pcState.perfil && pcState.perfil.creditos) || 0);
  const pacote = (id, dados, desc, selo) => `
    <div class="pc-pacote ${selo ? "destaque" : ""}">
      <div class="pc-pacote-linha1">
        <span class="pc-pacote-q">${iconeSvg("credito", 16)}${dados.sl}</span>
        <span class="pc-pacote-d"><b>${desc}</b>${selo ? `<span class="pc-pacote-selo">${selo}</span>` : ""}</span>
      </div>
      <button type="button" class="primary" data-pc-comprar="${id}" style="align-self:flex-end; padding:8px 12px; font-size:12px;">${dados.preco}</button>
    </div>`;

  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:460px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarLoja" style="margin-bottom:14px; display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Painel</button>
      <h2 style="margin-bottom:2px;">Loja</h2>
      <div class="pc-sub" style="margin-bottom:4px;">Seu saldo: <b style="color:var(--pc-ink);">${saldo} SL</b></div>
      <div class="pc-sub" style="margin-bottom:14px;">Pagamento via Mercado Pago (PIX ou cartão) — você é redirecionado, paga lá e volta com o saldo já creditado.</div>

      <div class="pc-lobby-menu-tit" style="margin-top:0;">Comprar SL</div>
      ${pacote("p10", PACOTES_SL.p10, "1 desafio ou 1 vaga de grupo")}
      ${pacote("p50", PACOTES_SL.p50, "abre 10 candidatos no Termômetro", "+10% desconto")}
      ${pacote("p200", PACOTES_SL.p200, "a lista completa do Termômetro", "+25% desconto")}
      <div class="pc-status" id="pcLojaStatus" style="margin:4px 0 14px; min-height:12px;">${pcState.lojaStatus || ""}</div>

      <div class="pc-lobby-menu-tit">Como ganhar de graça</div>
      <button class="pc-mini-card" id="pcBtnLojaConvidar">
        <div class="pc-mini-card-icone">${iconeSvg("convidar", 17)}</div>
        <div style="flex:1; min-width:0; text-align:left;">
          <div style="font-size:13.5px; font-weight:600;">Convidar amigos</div>
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px;">+1 SL por amigo que depositar a cédula, até 25</div>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
      </button>
      <button class="pc-mini-card" id="pcBtnLojaDesafiar" style="margin-top:8px;">
        <div class="pc-mini-card-icone">${iconeSvg("desafio", 17)}</div>
        <div style="flex:1; min-width:0; text-align:left;">
          <div style="font-size:13.5px; font-weight:600;">Duelar com alguém</div>
          <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px;">+5 SL no 1º aceite com cada pessoa, até 5</div>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
      </button>
    </div>`;
  pcState.lojaStatus = "";
  document.getElementById("pcBtnVoltarLoja").addEventListener("click", () => { pcState.subaba = "painel"; renderAppColaborativo(); });
  document.getElementById("pcBtnLojaConvidar").addEventListener("click", () => { pcState.subaba = "grupo"; renderAppColaborativo(); });
  document.getElementById("pcBtnLojaDesafiar").addEventListener("click", () => { pcState.subaba = "desafios"; renderAppColaborativo(); });
  document.querySelectorAll("[data-pc-comprar]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll("[data-pc-comprar]").forEach((b) => (b.disabled = true));
      const status = document.getElementById("pcLojaStatus");
      status.textContent = "Abrindo o pagamento…";
      const r = await iniciarCompraSL(btn.getAttribute("data-pc-comprar"));
      if (!r.ok) {
        status.textContent = "Não deu: " + r.mensagem;
        document.querySelectorAll("[data-pc-comprar]").forEach((b) => (b.disabled = false));
      }
      // r.ok já redirecionou a página — nada mais a fazer aqui.
    });
  });
}

// Volta do Mercado Pago (?compra=ok|falhou|pendente, ver back_urls na
// Edge Function criar-pagamento) — mostra o aviso e, se "ok", tenta
// revalidar o saldo algumas vezes (o webhook costuma ser quase
// instantâneo, mas pode chegar 1-2s depois do redirect).
async function tratarVoltaDoPagamento() {
  const params = new URLSearchParams(window.location.search);
  const compra = params.get("compra");
  if (!compra) return;
  window.history.replaceState({}, "", window.location.pathname);
  pcState.lojaStatus = compra === "ok"
    ? "Pagamento aprovado — atualizando seu saldo…"
    : compra === "pendente"
      ? "Pagamento em análise (comum em boleto/PIX fora do horário) — o saldo entra assim que compensar."
      : "Pagamento não foi concluído — nada foi cobrado.";
  if (compra === "ok" && pcState.perfil) {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      await new Promise((r) => setTimeout(r, 1500));
      try { pcState.perfil.creditos = await obterSaldoCreditos(pcState.perfil.id); } catch (e) { break; }
    }
    pcState.lojaStatus = "Pagamento aprovado — saldo atualizado!";
  }
  // Essa função roda em paralelo ao primeiro render (chamada sem await
  // em initColaborativo) — se a pessoa ainda estiver na Loja quando o
  // resultado final chegar, atualiza a tela sozinha.
  if (pcState.subaba === "loja") renderAppColaborativo();
}
