// Acesso: login, cadastro, recuperar/nova senha, completar perfil, onboarding,
// mini-pesquisa e telas legais (Termos/Privacidade).
// Ordem de carga no index.html.

// ---------- Login / Cadastro ----------

// Volta pra onde fazia sentido antes de entrar em Login/Cadastro — pro
// Painel principal (convidado) se a pessoa já tem lista em andamento
// (veio de um gate tipo Grupos/Médias), senão pra abertura (primeira vez
// no site). Sem isso as duas telas eram becos sem saída — achado pelo
// usuário em 08/08/2026 depois de clicar num item travado do Lobby.
function voltarDeLoginOuCadastro() {
  pcState.erro = "";
  pcState.cadRascunho = null;
  if (pcState.estado) { pcState.tela = "painel-convidado"; } else { pcState.tela = "landing"; }
  renderColaborativo();
}

// ---------- Termos de Uso / Política de Privacidade ----------

// Conteúdo revisado com o usuário em 08/08/2026: sem nome pessoal nem
// e-mail dele no texto, só o nome fantasia "Simulador Eleitoral
// Legislativo, por meio de seus representantes legais".
//
// E-mail de contato dedicado (não é mais o pessoal do usuário) criado por
// ele em 09/08/2026 — resolve o placeholder temporário que existia antes.
const PC_EMAIL_CONTATO_LEGAL = "simulalegis@gmail.com";

const PC_TEXTO_TERMOS = [
  { t: "1. O que é este site", c: `O Simulador Eleitoral — Legislativo 2026 é uma ferramenta para simular e
    projetar resultados do processo eleitoral legislativo de 2026 — Deputado
    Estadual, Deputado Federal e Senador —, começando por Santa Catarina, com
    base em dados públicos oficiais de eleições anteriores e nas atas de
    convenção partidária divulgadas pelo TSE. O plano é expandir gradualmente
    esse mesmo modelo pros demais estados do país.<br><br>
    <b>Este site é independente e não tem nenhum vínculo institucional com
    nenhum órgão do poder legislativo, com o TSE, com nenhum tribunal
    eleitoral regional, partido político ou candidato.</b> As projeções aqui
    geradas são simulações feitas por você e por outros usuários — não são
    pesquisa eleitoral registrada, não têm validade oficial e não
    representam a opinião nem o resultado real da eleição.<br><br>
    Este site também é um <b>game no estilo arcade</b> — pontuação, ranking e
    disputa amistosa entre você e seus grupos — e não envolve apostas nem
    jogo de azar nos termos da lei: não há cobrança para participar da
    disputa em si, nem qualquer prêmio em dinheiro atrelado ao resultado do
    seu palpite.<br><br>
    Mantido por Simulador Eleitoral Legislativo, por meio de seus representantes legais.` },
  { t: "2. Cadastro e conta", c: `Pra usar as funções que exigem conta (salvar listas, participar de grupos,
    aparecer no ranking), você precisa se cadastrar com nome, e-mail e senha.
    Na primeira cédula que você depositar, pedimos uma vez seu CEP (só pra
    saber o município) e gênero, usados apenas em estatísticas agregadas (ver
    a Política de Privacidade). Você é responsável por manter sua senha em
    sigilo e por tudo que acontecer usando sua conta.` },
  { t: "3. Uso permitido", c: `Você pode usar o site pra montar suas próprias projeções, participar de
    grupos, comparar palpites e acompanhar o quadro de médias públicas. Não é
    permitido: tentar acessar dados de outras contas, automatizar cadastros em
    massa, usar o site pra divulgar conteúdo que não seja sobre a própria
    simulação, ou tentar burlar as regras de limite (créditos, uma lista
    oficial por vez, etc.).` },
  { t: "4. Créditos", c: `O site usa um sistema de créditos pra liberar listas e grupos extras além
    do primeiro gratuito. Hoje esse sistema ainda não processa pagamento real —
    créditos são concedidos manualmente enquanto essa parte não estiver pronta.
    Quando existir cobrança de verdade, este documento será atualizado antes
    disso entrar no ar, com as condições de preço, reembolso e forma de
    pagamento.` },
  { t: "5. Isenção de responsabilidade", c: `As projeções são estimativas baseadas em dados históricos e nos palpites
    dos usuários — não constituem previsão eleitoral, aconselhamento político
    nem qualquer garantia de resultado. O site é oferecido "como está", sem
    garantia de disponibilidade contínua. Erros de dados podem acontecer (ex.
    atas de convenção ainda não processadas); se você encontrar um, pode
    reportar pelo próprio site.` },
  { t: "6. Alterações", c: `Estes termos podem ser atualizados conforme o site evolui. Mudanças
    relevantes serão avisadas na tela. O uso continuado do site depois de uma
    atualização vale como concordância com a nova versão.` },
  { t: "7. Contato", c: `Dúvidas sobre estes termos: <b>${PC_EMAIL_CONTATO_LEGAL}</b>` },
];

const PC_TEXTO_PRIVACIDADE = [
  { t: null, c: `Esta política explica quais dados pessoais o Simulador Eleitoral —
    Legislativo 2026 coleta, por quê, e quais direitos você tem sobre eles,
    conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).` },
  { t: "1. Quem trata os seus dados", c: `Simulador Eleitoral Legislativo, por meio de seus representantes legais,
    responsável pelo tratamento dos dados coletados através deste site.
    Contato pra qualquer assunto de privacidade: <b>${PC_EMAIL_CONTATO_LEGAL}</b>` },
  { t: "2. Quais dados coletamos", c: `<ul style="margin:0; padding-left:18px;">
    <li><b>Pra criar sua conta:</b> nome, e-mail e senha.</li>
    <li><b>Na primeira cédula depositada:</b> CEP (usado só pra identificar seu
      município/UF) e gênero, pedidos uma única vez e usados apenas pra fins
      estatísticos agregados — nunca pra identificar você individualmente.</li>
    <li><b>Senha:</b> também nunca é guardada em texto puro — fica a cargo do
      provedor de autenticação (Supabase Auth), que usa hash e criptografia
      padrão de mercado.</li>
    <li><b>Dados de uso do produto:</b> as listas de candidatos que você monta e
      salva, os grupos que você cria ou participa, se prefere aparecer com
      nome ou anônimo nas cédulas depositadas, e o histórico de créditos da
      sua conta.</li>
    <li><b>Dados técnicos automáticos:</b> informações padrão de navegação
      (necessárias pro site funcionar) via nosso provedor de hospedagem
      (GitHub Pages) e banco de dados (Supabase) — não coletamos dados de
      localização, câmera, microfone ou contatos.</li>
    </ul><br>Não coletamos dados sensíveis (saúde, biometria, origem racial, opinião
    religiosa) e não pedimos nenhuma informação além do necessário pra fazer o
    site funcionar.` },
  { t: "3. Por que coletamos (base legal)", c: `<ul style="margin:0; padding-left:18px;">
    <li><b>Execução de contrato:</b> nome, e-mail e senha são necessários pra
      criar e manter sua conta — sem eles o serviço de cadastro não funciona.</li>
    <li><b>Consentimento:</b> você marca explicitamente, no cadastro, que concorda
      com o uso dos seus dados nos termos desta política.</li>
    <li><b>Legítimo interesse:</b> dados de uso (listas, grupos, créditos) são
      necessários pro funcionamento das próprias funcionalidades que você
      escolhe usar (salvar uma lista, entrar num grupo).</li>
    </ul>` },
  { t: "4. Com quem compartilhamos", c: `Não vendemos nem compartilhamos seus dados com terceiros pra fins de
    marketing ou publicidade. Seus dados ficam armazenados na infraestrutura
    dos nossos provedores técnicos — <b>Supabase</b> (banco de dados e
    autenticação) e <b>GitHub Pages</b> (hospedagem do site) — que atuam só como
    operadores técnicos, seguindo nossas instruções, não como donos dos dados.<br><br>
    Se você optar por depositar uma lista de forma pública (não anônima), seu
    nome e a lista de candidatos ficam visíveis pra outros usuários na
    Mediana — essa é uma escolha sua, feita no momento do depósito, e pode
    ser trocada pra anônima em depósitos futuros.` },
  { t: "5. Por quanto tempo guardamos", c: `Enquanto sua conta existir. Se você pedir a exclusão da conta, apagamos
    seus dados pessoais (nome, e-mail, CEP/município e gênero) — listas já depositadas de
    forma pública podem ser mantidas de forma desvinculada da sua identidade
    (anonimizadas), já que fazem parte do histórico agregado de outras
    pessoas que usaram a Mediana.` },
  { t: "6. Seus direitos", c: `Conforme o artigo 18 da LGPD, você pode a qualquer momento pedir:
    <ul style="margin:8px 0; padding-left:18px;">
    <li>Confirmação de que tratamos seus dados, e acesso a eles.</li>
    <li>Correção de dados incompletos ou desatualizados.</li>
    <li>Exclusão dos seus dados pessoais.</li>
    <li>Portabilidade dos seus dados pra outro serviço.</li>
    <li>Revogação do consentimento dado no cadastro.</li>
    </ul>
    Pra exercer qualquer um desses direitos, escreva pra
    <b>${PC_EMAIL_CONTATO_LEGAL}</b>. Vamos responder o quanto antes.` },
  { t: "7. Segurança", c: `Usamos práticas técnicas pra proteger seus dados: senhas nunca
    ficam em texto puro, o banco de dados usa controle de acesso por linha
    (cada pessoa só edita o que é dela) e toda comunicação com o site é
    criptografada (HTTPS). Nenhum sistema é 100% infalível, mas trabalhamos
    continuamente pra manter essas proteções em dia — inclusive corrigindo
    falhas assim que identificadas.` },
  { t: "8. Menores de idade", c: `Este site é voltado a eleitores(as) — pessoas com 16 anos ou mais (idade
    mínima pra votar no Brasil). Não coletamos intencionalmente dados de
    crianças.` },
  { t: "9. Cookies e armazenamento local", c: `O site usa armazenamento local do navegador (localStorage) pra guardar
    preferências e, no caso de visitantes sem conta, rascunhos temporários de
    listas — isso fica só no seu próprio dispositivo, não é enviado pra
    nenhum servidor. Não usamos cookies de rastreamento de terceiros nem
    publicidade.` },
  { t: "10. Alterações nesta política", c: `Podemos atualizar esta política conforme o site evolui. Mudanças
    relevantes serão avisadas na tela antes de valerem.` },
];

// tipo: "termos" | "privacidade". Chegável hoje só pelo link no Cadastro
// (pcState.telaLegalOrigem guarda onde a pessoa estava pra "← Voltar"
// devolver pro lugar certo, hoje sempre "cadastro").
function renderTelaLegal(tipo) {
  const el = document.getElementById("modoColaborativoWrap");
  const titulo = tipo === "termos" ? "Termos de uso" : "Política de privacidade";
  const secoes = tipo === "termos" ? PC_TEXTO_TERMOS : PC_TEXTO_PRIVACIDADE;
  el.innerHTML = `
    <div class="glass-card" style="max-width:520px; margin:0 auto;">
      <button class="pc-mini-btn" id="pcBtnVoltarLegal" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
      <div style="font-size:20px; font-weight:700; margin:0 0 4px;">${titulo}</div>
      <div class="pc-sub" style="margin-bottom:18px;">Última atualização: 08/08/2026</div>
      ${secoes.map((s) => `
        <div style="margin-bottom:18px;">
          ${s.t ? `<div style="font-size:13.5px; font-weight:600; color:var(--pc-ink); margin-bottom:6px;">${s.t}</div>` : ""}
          <div style="font-size:12.5px; line-height:1.65; color:var(--pc-ink-dim);">${s.c}</div>
        </div>`).join("")}
    </div>`;
  document.getElementById("pcBtnVoltarLegal").addEventListener("click", () => {
    pcState.tela = pcState.telaLegalOrigem || "cadastro";
    renderColaborativo();
  });
}


// ===== Casca padrão do fluxo de acesso (aprovada 20/08/2026) =====
// Card no material do console da capa + cabeçalho constante (voltar à
// esquerda quando cabível + rótulo de marca centralizado). Todas as telas
// entre a capa e o app usam esta casca — ver task de padronização.
function cascaAcessoTopo(voltarId) {
  return `<div class="pc-acesso-topo">
    ${voltarId ? `<button class="pc-acesso-voltar" id="${voltarId}" title="Voltar">${iconeSvg("setaEsquerda", 14)}</button>` : ""}
    <span class="pc-acesso-marca${voltarId ? " com-voltar" : ""}">
      <span class="pc-acesso-wordmark"><i>Simula</i>LEGIS</span>
      <span class="pc-acesso-marca-sub">Simulador Eleitoral Legislativo 2026</span>
    </span>
  </div>`;
}

// Pílulas de gênero (substituem o <select>, mesmo id num input hidden pra
// não mexer nos handlers de submit).
function pilulasGenero(idCampo, valorInicial) {
  return `<input type="hidden" id="${idCampo}" value="${valorInicial || ""}">
  <div class="pc-acesso-genero" data-pc-genero-alvo="${idCampo}">
    ${["Feminino", "Masculino", "Outro"].map((g) => `<button type="button" data-pc-genero="${g}"${g === valorInicial ? ' class="on"' : ""}>${g}</button>`).join("")}
  </div>`;
}
function attachPilulasGenero() {
  document.querySelectorAll("[data-pc-genero-alvo]").forEach((grupo) => {
    const alvo = document.getElementById(grupo.getAttribute("data-pc-genero-alvo"));
    grupo.querySelectorAll("[data-pc-genero]").forEach((btn) => {
      btn.addEventListener("click", () => {
        grupo.querySelectorAll("[data-pc-genero]").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        alvo.value = btn.getAttribute("data-pc-genero");
      });
    });
  });
}

function renderTelaLogin() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso">
      ${cascaAcessoTopo("pcBtnVoltarLogin")}
      <div class="pc-acesso-h2">Que bom te ver de novo</div>
      <div class="pc-acesso-sub">Entre pra continuar seus palpites de onde parou.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcLoginEmail" type="email"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcLoginSenha" type="password"></div>
      <div class="pc-erro" id="pcLoginErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnEntrar">Entrar</button>
      <div class="pc-acesso-divisor">ou</div>
      <button class="ghost pc-acesso-ghost" id="pcBtnEntrarGoogle">${GOOGLE_G_SVG}Entrar com Google</button>
      <div class="pc-acesso-links">
        <button type="button" class="pc-acesso-link" id="pcLinkEsqueciSenha">Esqueci minha senha</button> ·
        <button type="button" class="pc-acesso-link destaque" id="pcBtnIrCadastro">Criar conta</button>
      </div>
    </div>`;

  document.getElementById("pcBtnVoltarLogin").addEventListener("click", voltarDeLoginOuCadastro);
  document.getElementById("pcBtnIrCadastro").addEventListener("click", () => {
    pcState.erro = "";
    pcState.tela = "cadastro";
    renderColaborativo();
  });
  document.getElementById("pcLinkEsqueciSenha").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.erro = "";
    pcState.tela = "recuperar-senha";
    renderColaborativo();
  });
  document.getElementById("pcBtnEntrarGoogle").addEventListener("click", async () => {
    const { error } = await entrarComGoogle();
    if (error) { pcState.erro = "Não consegui abrir o login do Google: " + error.message; renderTelaLogin(); }
  });

  document.getElementById("pcBtnEntrar").addEventListener("click", async () => {
    const email = document.getElementById("pcLoginEmail").value.trim();
    const senha = document.getElementById("pcLoginSenha").value;
    if (!email || !senha) {
      pcState.erro = "Preencha e-mail e senha.";
      renderTelaLogin();
      return;
    }
    const { error } = await entrar({ email, senha });
    if (error) {
      pcState.erro = "Não consegui entrar: " + error.message;
      renderTelaLogin();
      return;
    }
    pcState.erro = "";
    await initColaborativo();
  });
}

function renderTelaRecuperarSenha() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso">
      ${cascaAcessoTopo("pcBtnVoltarRecuperar")}
      <div class="pc-acesso-h2">Esqueci minha senha</div>
      <div class="pc-acesso-sub">Digite o e-mail da sua conta — mandamos um link pra você definir uma senha nova.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcRecuperarEmail" type="email"></div>
      <div class="pc-erro" id="pcRecuperarErro"></div>
      <div class="pc-status" id="pcRecuperarStatus"></div>
      <button class="primary" id="pcBtnEnviarRecuperacao">Enviar link</button>
    </div>`;
  document.getElementById("pcBtnVoltarRecuperar").addEventListener("click", () => {
    pcState.tela = "login";
    renderColaborativo();
  });
  document.getElementById("pcBtnEnviarRecuperacao").addEventListener("click", async (e) => {
    const email = document.getElementById("pcRecuperarEmail").value.trim();
    if (!email) { document.getElementById("pcRecuperarErro").textContent = "Digite seu e-mail."; return; }
    e.target.disabled = true;
    const { error } = await solicitarRecuperacaoSenha(email);
    e.target.disabled = false;
    if (error) { document.getElementById("pcRecuperarErro").textContent = "Não consegui enviar: " + error.message; return; }
    document.getElementById("pcRecuperarErro").textContent = "";
    document.getElementById("pcRecuperarStatus").textContent = "Se esse e-mail tiver uma conta, o link de recuperação já foi enviado. Confira sua caixa de entrada (e o spam).";
    e.target.style.display = "none";
  });
}

function renderTelaNovaSenha() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso">
      ${cascaAcessoTopo(null)}
      <div class="pc-acesso-h2">Defina uma nova senha</div>
      <div class="pc-acesso-sub">Você clicou no link de recuperação — escolha sua nova senha abaixo.</div>
      <div class="field-row"><label>Nova senha</label><input class="cell" id="pcNovaSenhaInput" type="password"></div>
      <div class="pc-erro" id="pcNovaSenhaErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnConfirmarNovaSenha">Salvar nova senha</button>
    </div>`;
  document.getElementById("pcBtnConfirmarNovaSenha").addEventListener("click", async (e) => {
    const novaSenha = document.getElementById("pcNovaSenhaInput").value;
    if (!novaSenha || novaSenha.length < 6) {
      document.getElementById("pcNovaSenhaErro").textContent = "A senha precisa ter pelo menos 6 caracteres.";
      return;
    }
    e.target.disabled = true;
    const { error } = await redefinirSenha(novaSenha);
    e.target.disabled = false;
    if (error) { document.getElementById("pcNovaSenhaErro").textContent = "Não consegui salvar: " + error.message; return; }
    pcState.erro = "";
    await initColaborativo();
  });
}

// Resolve CEP → município/UF via ViaCEP (serviço público, sem chave). Não
// pedimos município por texto livre nem numa lista pra digitar: o CEP é
// mais rápido pra pessoa preencher e devolve o nome do município já
// padronizado, o que importa pros painéis/pesquisas que vão agregar por
// cidade (pedido do usuário, 11/08/2026).
async function buscarCep(cep) {
  const limpo = String(cep || "").replace(/\D/g, "");
  if (limpo.length !== 8) return { error: "CEP inválido. Confira os números digitados." };
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const dados = await resp.json();
    if (dados.erro) return { error: "CEP não encontrado. Confira o número." };
    return { municipio: dados.localidade, uf: dados.uf };
  } catch (e) {
    return { error: "Não consegui consultar esse CEP agora. Confira sua internet e tente de novo." };
  }
}

// Última etapa de quem entrou pelo Google: já existe sessão (nome/e-mail
// vieram do Google), só falta confirmar o nome e o aceite da LGPD, que o
// Google não fornece (cadastro progressivo, 04/09/2026). Chamada por
// initColaborativo quando há sessão sem perfil ainda.
function renderTelaCompletarPerfil() {
  const nomeGoogle = (pcState.sessao && pcState.sessao.user.user_metadata
    && (pcState.sessao.user.user_metadata.full_name || pcState.sessao.user.user_metadata.name)) || "";
  // Essa tela também é usada pelo raro caso de sessão criada por e-mail/senha
  // cujo insert em "perfis" falhou antes de terminar o cadastro (ex.: erro
  // de rede) — nesse caso não veio do Google, então o texto não pode afirmar
  // isso.
  const veioDoGoogle = pcState.sessao && pcState.sessao.user.app_metadata
    && pcState.sessao.user.app_metadata.provider === "google";
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso">
      ${cascaAcessoTopo(null)}
      <div class="pc-acesso-h2">Só mais um passo</div>
      <div class="pc-acesso-sub">${veioDoGoogle ? "Sua conta Google já está conectada — confirme seu nome pra liberar o Simulador." : "Confirme seu nome pra liberar o Simulador."}</div>
      <div class="field-row"><label>Nome</label><input class="cell" id="pcCompNome" value="${escaparAtributoHtml(nomeGoogle)}"></div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCompLgpd" style="margin-top:2px;">
        <span>Li e concordo com o uso dos meus dados (nome e e-mail) para criar minha conta, conforme a
          <a href="#" id="pcLinkPrivacidadeComp" class="pc-link">Política de Privacidade</a>
          e os
          <a href="#" id="pcLinkTermosComp" class="pc-link">Termos de Uso</a>.
          Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCompErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnConcluirPerfil">Concluir cadastro</button>
      <div class="pc-acesso-links"><button type="button" class="pc-acesso-link" id="pcBtnCancelarPerfil">Cancelar</button></div>
    </div>`;

  document.getElementById("pcLinkPrivacidadeComp").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "completar-perfil";
    pcState.tela = "privacidade";
    renderColaborativo();
  });
  document.getElementById("pcLinkTermosComp").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "completar-perfil";
    pcState.tela = "termos";
    renderColaborativo();
  });
  document.getElementById("pcBtnCancelarPerfil").addEventListener("click", async () => {
    await sair();
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "landing", subaba: "selecao", estado: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, erro: "", status: "" };
    renderColaborativo();
  });
  document.getElementById("pcBtnConcluirPerfil").addEventListener("click", async (e) => {
    const nome = document.getElementById("pcCompNome").value.trim();
    const lgpdAceito = document.getElementById("pcCompLgpd").checked;
    if (!nome) {
      pcState.erro = "Preencha seu nome.";
      renderTelaCompletarPerfil();
      return;
    }
    if (!lgpdAceito) {
      pcState.erro = "Marque a concordância com o uso dos dados pra continuar.";
      renderTelaCompletarPerfil();
      return;
    }
    e.target.disabled = true;
    const { error } = await completarPerfilGoogle({ nome, lgpdAceito });
    if (error) {
      e.target.disabled = false;
      pcState.erro = "Não consegui concluir: " + error.message;
      renderTelaCompletarPerfil();
      return;
    }
    pcState.erro = "";
    await initColaborativo();
  });
}

// Onboarding de primeiro acesso, 4 telas, uma vez só (PROJETO.md, Fase 3 —
// "telas de introdução/tutorial", nunca implementado). Mockup validado com
// o usuário em 14/08/2026. Usa o mesmo sinal de gate da mini-pesquisa
// (perfil.mini_pesquisa_em null — ver initColaborativo) porque as duas
// sempre andam juntas: não precisa de coluna própria no banco, já que
// "Pular" e terminar as 4 telas levam pro mesmo lugar (mini-pesquisa) e o
// que marca "já vi isso tudo" é sempre o fim da mini-pesquisa.
const PC_ONBOARDING_PASSOS = [
  { icone: "ballot", titulo: "O que é o Simulador", texto: "Você monta sua própria previsão de quem se elege em 2026 — como se fosse seu próprio instituto de pesquisa." },
  { icone: "lista", titulo: "Como montar sua cédula", texto: "Escolha detalhado (voto a voto) ou simplificado (só quem se elege) — os dois valem pro ranking." },
  { icone: "ranking", titulo: "Ranking e grupos", texto: "Deposite sua cédula pra entrar no ranking geral, ou compare em privado com um grupo de amigos." },
  { icone: "completar", titulo: "Pronto pra começar", texto: "Antes de entrar, um palpite rápido pra Presidente e Governador — leva 1 minuto." },
];

function renderTelaOnboarding() {
  if (!pcState.onboardingPasso) pcState.onboardingPasso = 0;
  const passo = pcState.onboardingPasso;
  const dados = PC_ONBOARDING_PASSOS[passo];
  const ultimo = passo === PC_ONBOARDING_PASSOS.length - 1;
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso" style="max-width:380px;">
      ${cascaAcessoTopo(null)}
      <div style="display:flex; justify-content:space-between; align-items:center; margin:-6px 0 14px;">
        <span style="font-size:11px; color:var(--pc-ink-dim);">${passo + 1} de ${PC_ONBOARDING_PASSOS.length}</span>
        <button class="ghost" id="pcBtnOnboardingPular" style="padding:5px 12px; font-size:11.5px;">Pular</button>
      </div>
      ${estadoVazio({ icone: dados.icone, titulo: dados.titulo, texto: dados.texto })}
      <div style="display:flex; gap:10px; margin-top:8px;">
        ${passo > 0 ? `<button class="ghost" id="pcBtnOnboardingVoltar" style="flex:1;">Voltar</button>` : ""}
        <button class="primary" id="pcBtnOnboardingProximo" style="flex:2;">${ultimo ? "Começar" : "Próximo"}</button>
      </div>
    </div>`;

  document.getElementById("pcBtnOnboardingPular").addEventListener("click", () => {
    pcState.tela = "mini-pesquisa";
    renderColaborativo();
  });
  if (passo > 0) {
    document.getElementById("pcBtnOnboardingVoltar").addEventListener("click", () => {
      pcState.onboardingPasso = passo - 1;
      renderTelaOnboarding();
    });
  }
  document.getElementById("pcBtnOnboardingProximo").addEventListener("click", () => {
    if (ultimo) {
      pcState.tela = "mini-pesquisa";
      renderColaborativo();
    } else {
      pcState.onboardingPasso = passo + 1;
      renderTelaOnboarding();
    }
  });
}

// Mini-pesquisa obrigatória, uma vez só, logo depois do cadastro (ver
// initColaborativo — só quem tem perfil.mini_pesquisa_em null cai aqui;
// contas de antes da migração 20 foram marcadas como já respondidas).
// PROJETO.md, Fase 2.7: 5 cargos (Presidente/Governador/Senador/Dep.
// Federal/Dep. Estadual) + 2º turno. Presidente e Governador são os únicos
// cargos majoritários com 2º turno de verdade no sistema eleitoral
// brasileiro (Senador é decidido em 1 turno só) — por isso só esses dois
// perguntam sobre 2º turno; "simplificar" isso pro resto seria incorreto
// (mesmo cuidado eleitoral documentado em CLAUDE.md).
function renderTelaMiniPesquisa() {
  const el = document.getElementById("modoColaborativoWrap");
  el.innerHTML = `
    <div class="pc-acesso" style="max-width:460px;">
      ${cascaAcessoTopo(null)}
      <div class="pc-acesso-h2">Antes de começar, seu palpite rápido</div>
      <div class="pc-acesso-sub" style="max-width:none;">Só uma vez: quem você acha que vence cada disputa em 2026. Pra Presidente e Governador (não cobertos em detalhe aqui), é só o nome mesmo — pra Senador, Dep. Federal e Dep. Estadual você vai montar a cédula completa daqui a pouco.</div>

      <div class="field-row"><label>Presidente</label><input class="cell" id="pcMpPresidente" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Vai ter 2º turno?</label>
        <select class="cell" id="pcMpPresidente2t">
          <option value="">Selecione</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div style="margin:16px 0; border-top:1px solid var(--pc-glass-border);"></div>

      <div class="field-row"><label>Governador (SC)</label><input class="cell" id="pcMpGovernador" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Vai ter 2º turno?</label>
        <select class="cell" id="pcMpGovernador2t">
          <option value="">Selecione</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div style="margin:16px 0; border-top:1px solid var(--pc-glass-border);"></div>

      <div class="field-row"><label>Senador (SC)</label><input class="cell" id="pcMpSenador" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Dep. Federal (SC)</label><input class="cell" id="pcMpFederal" placeholder="Nome do candidato"></div>
      <div class="field-row"><label>Dep. Estadual (SC)</label><input class="cell" id="pcMpEstadual" placeholder="Nome do candidato"></div>

      <div class="pc-erro" id="pcMpErro"></div>
      <div style="display:flex; gap:10px; margin-top:6px;">
        <button class="primary" id="pcBtnMpContinuar" style="flex:1;">Continuar</button>
        <button class="ghost" id="pcBtnMpSair">Sair</button>
      </div>
    </div>`;

  document.getElementById("pcBtnMpSair").addEventListener("click", async () => {
    await sair();
    pcState = { iniciado: true, sessao: null, perfil: null, tela: "landing", subaba: "selecao", estado: null, palpiteEdicao: null, historicoPalpite: [], expandido: {}, erro: "", status: "" };
    renderColaborativo();
  });
  document.getElementById("pcBtnMpContinuar").addEventListener("click", async (e) => {
    const respostas = {
      presidente: document.getElementById("pcMpPresidente").value.trim(),
      presidente_2_turno: document.getElementById("pcMpPresidente2t").value,
      governador: document.getElementById("pcMpGovernador").value.trim(),
      governador_2_turno: document.getElementById("pcMpGovernador2t").value,
      senador: document.getElementById("pcMpSenador").value.trim(),
      dep_federal: document.getElementById("pcMpFederal").value.trim(),
      dep_estadual: document.getElementById("pcMpEstadual").value.trim(),
    };
    const erroEl = document.getElementById("pcMpErro");
    if (!respostas.presidente || !respostas.governador || !respostas.senador || !respostas.dep_federal || !respostas.dep_estadual) {
      erroEl.textContent = "Preenche um nome pra cada cargo — pode ser um palpite rápido, dá pra errar.";
      return;
    }
    if (!respostas.presidente_2_turno || !respostas.governador_2_turno) {
      erroEl.textContent = "Falta dizer se acha que vai ter 2º turno pra Presidente e Governador.";
      return;
    }
    erroEl.textContent = "";
    e.target.disabled = true;
    const { error } = await salvarMiniPesquisa(pcState.perfil.id, respostas);
    if (error) {
      e.target.disabled = false;
      erroEl.textContent = error.message;
      return;
    }
    pcState.perfil = { ...pcState.perfil, mini_pesquisa_respostas: respostas, mini_pesquisa_em: new Date().toISOString() };
    pcState.tela = "app";
    renderColaborativo();
  });
}

function renderTelaCadastro() {
  const el = document.getElementById("modoColaborativoWrap");
  // Preserva o que a pessoa já digitou quando a tela volta por erro
  // (achado do usuário, 24/08/2026: antes o formulário inteiro limpava,
  // mesmo pra um erro isolado tipo "CEP não encontrado" — obrigava
  // redigitar tudo). Senha de propósito NÃO entra aqui — a pessoa digita
  // de novo, mesmo padrão de qualquer formulário de senha.
  const r = pcState.cadRascunho || {};
  // Convite pessoal (?conv=, ver o boot em initColaborativo): a pessoa já
  // pulou a capa direto pra cá — esse aviso é o único sinal visual de que
  // ela veio de um link de amigo, já que o código em si fica silencioso
  // no localStorage até o cadastro terminar (_resolverConvidadoPor).
  const veioDeConvite = !!localStorage.getItem("sl_convite_pendente");
  el.innerHTML = `
    <div class="pc-acesso" style="max-width:460px;">
      ${cascaAcessoTopo("pcBtnVoltarCadastro")}
      <div class="pc-acesso-h2">Crie sua conta</div>
      ${veioDeConvite ? `<div class="pc-aviso-card" style="margin-bottom:14px;"><div class="pc-aviso-corpo">Você entrou por um convite de amigo — crie sua conta grátis e cravem os palpites de 2026.</div></div>` : ""}
      <div class="pc-acesso-sub">Grátis. Deposite sua cédula, entre em grupos e dispute o ranking.</div>
      <button class="ghost pc-acesso-ghost" id="pcBtnCadastrarGoogle">${GOOGLE_G_SVG}Continuar com Google</button>
      <div class="pc-acesso-divisor">ou</div>
      <div class="field-row"><label>Nome</label><input class="cell" id="pcCadNome" value="${escaparAtributoHtml(r.nome || "")}"></div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Você pode divulgar seu palpite de forma anônima — essa escolha é feita depois, na hora de depositar cada cédula, não aqui.</div>
      <div class="field-row"><label>E-mail</label><input class="cell" id="pcCadEmail" type="email" value="${escaparAtributoHtml(r.email || "")}"></div>
      <div class="field-row"><label>Senha</label><input class="cell" id="pcCadSenha" type="password"></div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin:-10px 0 14px;">Pelo menos 8 caracteres, com letra, número e caractere especial.</div>

      <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin:14px 0;">
        <input type="checkbox" id="pcCadLgpd" style="margin-top:2px;"${r.lgpd ? " checked" : ""}>
        <span>Li e concordo com o uso dos meus dados (nome e e-mail) para criar minha conta, conforme a
          <a href="#" id="pcLinkPrivacidade" class="pc-link">Política de Privacidade</a>
          e os
          <a href="#" id="pcLinkTermos" class="pc-link">Termos de Uso</a>.
          Posso pedir a exclusão dos meus dados a qualquer momento.</span>
      </label>

      <div class="pc-erro" id="pcCadErro">${pcState.erro || ""}</div>
      <button class="primary" id="pcBtnCadastrar">Criar conta</button>
      <div class="pc-acesso-links">Já tenho conta — <button type="button" class="pc-acesso-link destaque" id="pcBtnIrLogin">entrar</button></div>
    </div>`;

  document.getElementById("pcBtnVoltarCadastro").addEventListener("click", voltarDeLoginOuCadastro);
  document.getElementById("pcBtnIrLogin").addEventListener("click", () => {
    pcState.erro = "";
    pcState.cadRascunho = null;
    pcState.tela = "login";
    renderColaborativo();
  });
  document.getElementById("pcBtnCadastrarGoogle").addEventListener("click", async () => {
    const { error } = await entrarComGoogle();
    if (error) { pcState.erro = "Não consegui abrir o cadastro com Google: " + error.message; renderTelaCadastro(); }
  });
  document.getElementById("pcLinkPrivacidade").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "cadastro";
    pcState.tela = "privacidade";
    renderColaborativo();
  });
  document.getElementById("pcLinkTermos").addEventListener("click", (e) => {
    e.preventDefault();
    pcState.telaLegalOrigem = "cadastro";
    pcState.tela = "termos";
    renderColaborativo();
  });

  document.getElementById("pcBtnCadastrar").addEventListener("click", async (e) => {
    const nome = document.getElementById("pcCadNome").value.trim();
    const email = document.getElementById("pcCadEmail").value.trim();
    const senha = document.getElementById("pcCadSenha").value;
    const lgpdAceito = document.getElementById("pcCadLgpd").checked;
    // Guarda ANTES de validar — qualquer branch de erro abaixo re-renderiza
    // a tela, e é esse rascunho que a repovoa (senha fica de fora, de
    // propósito).
    pcState.cadRascunho = { nome, email, lgpd: lgpdAceito };

    if (!nome || !email || !senha) {
      pcState.erro = "Preencha nome, e-mail e senha.";
      renderTelaCadastro();
      return;
    }
    if (!lgpdAceito) {
      pcState.erro = "Marque a concordância com o uso dos dados pra continuar.";
      renderTelaCadastro();
      return;
    }
    e.target.disabled = true;
    // Cadastro progressivo (04/09/2026): CEP e gênero saíram daqui — são
    // pedidos uma vez só no modal de depósito da 1ª cédula.
    const { error, data } = await cadastrar({ nome, email, senha, modoPreenchimento: "detalhado", lgpdAceito });
    if (error) {
      e.target.disabled = false;
      pcState.erro = "Não consegui criar sua conta: " + error.message;
      renderTelaCadastro();
      return;
    }
    pcState.erro = "";
    pcState.cadRascunho = null;
    // veio do fluxo de convidado (seleção de candidatos preenchida sem
    // login) — salva o que já foi montado direto no perfil recém-criado, em
    // vez de começar do zero.
    if (pcState.pendenteRegistro && data && data.user) {
      if (pcState.palpiteEdicao) await salvarPalpiteCompleto(data.user.id, pcState.palpiteEdicao);
      pcState.pendenteRegistro = false;
    }
    // Veio do botão "Compartilhar"/"Criar grupos" sem conta ainda — depois
    // do cadastro, cai direto na tela certa em vez do painel genérico.
    const acaoPendente = pcState.pendenteAcao;
    pcState.pendenteAcao = null;
    await initColaborativo();
    if (acaoPendente === "compartilhar") { pcState.subaba = "painel"; renderAppColaborativo(); }
    else if (acaoPendente === "grupo") { pcState.subaba = "grupo"; renderAppColaborativo(); }
    else if (acaoPendente === "medias") { pcState.subaba = "medias"; renderAppColaborativo(); }
    else if (acaoPendente === "desafios") { pcState.subaba = "desafios"; renderAppColaborativo(); }
    else if (acaoPendente === "loja") { pcState.subaba = "loja"; renderAppColaborativo(); }
  });
}
