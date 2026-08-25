// Cadastro/login/logout da Prospecção Coletiva + leitura do perfil da pessoa logada.

// Validação de CPF (algoritmo padrão de dígito verificador) — barra CPF
// obviamente inválido/inventado antes de gastar uma tentativa de cadastro.
// Não impede fraude sofisticada sozinha; combinado com o hash único no
// banco (nuvem/migracao-4-cpf.sql), impede reuso do mesmo CPF em duas contas.
function cpfValido(cpf) {
  const limpo = String(cpf || "").replace(/\D/g, "");
  if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(limpo[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto >= 10) resto = 0;
  if (resto !== Number(limpo[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(limpo[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto >= 10) resto = 0;
  return resto === Number(limpo[10]);
}

// Nunca guardamos o CPF em texto puro — só este hash (SHA-256 + um sal fixo
// da aplicação). O banco só consegue checar "esse CPF já se cadastrou?" via
// índice único no hash (ver migração 4), nunca "qual é o CPF de fulano?".
// Limite honesto: como o sal fica no código do site (não existe servidor
// próprio pra guardar segredo), isso reduz bastante o risco de vazamento
// casual, mas não é inquebrável contra alguém com acesso ao banco E disposto
// a tentar recriar todos os CPFs válidos por força bruta — ver PROJETO.md.
async function hashCPF(cpf) {
  const limpo = String(cpf || "").replace(/\D/g, "");
  const dados = new TextEncoder().encode(limpo + "alesc-simulador-sal-v1");
  const buffer = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Padrão mínimo de senha (referência usada pelo usuário, 09/08/2026): pelo
// menos 8 caracteres, 1 letra, 1 número, 1 caractere especial.
function senhaForte(senha) {
  return String(senha || "").length >= 8
    && /[a-zA-Z]/.test(senha)
    && /[0-9]/.test(senha)
    && /[^a-zA-Z0-9]/.test(senha);
}

// escopo/partidoEscopo/mostrarNome saíram da tela de Cadastro (pedido do
// usuário em 09/08/2026 — "O que você quer prever?" confundia, e a escolha
// de mostrar nome já é feita por cédula, no momento do depósito, não da
// conta inteira) — todo cadastro novo nasce com escopo "assembleia" fixo e
// mostrar_nome true (default inofensivo, não é mais lido em lugar nenhum
// que importe pra privacidade — isso agora vive em salvamentos.anonimo).

// Convite pessoal (migração 26): o link ?conv=CODIGO fica guardado no
// localStorage até o cadastro; aqui resolve o código pro uuid do
// convidante (ou null). Limpa depois que o perfil nasce com a atribuição.
async function _resolverConvidadoPor() {
  const codigo = localStorage.getItem("sl_convite_pendente");
  if (!codigo) return null;
  const { data, error } = await supabaseClient.rpc("perfil_por_codigo_convite", { p_codigo: codigo });
  if (error || !data) return null;
  return data;
}

async function cadastrar({ nome, email, senha, telefone, modoPreenchimento, cpf, lgpdAceito, cep, municipioResidencia, ufResidencia, genero }) {
  if (!cpfValido(cpf)) return { error: { message: "CPF inválido. Confira os números digitados." } };
  if (!senhaForte(senha)) return { error: { message: "A senha precisa ter pelo menos 8 caracteres, com letra, número e caractere especial." } };
  if (!lgpdAceito) return { error: { message: "Precisa marcar a concordância com o uso dos dados pra continuar." } };

  const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
  if (error) return { error };
  if (!data.session) {
    // Confirmação de e-mail ainda ligada no painel do Supabase — ver PROJETO.md.
    return { error: { message: "Cadastro criado, mas o e-mail de confirmação está ativo no Supabase. Desligue 'Confirm email' em Authentication → Providers → Email e tente de novo." } };
  }
  const cpfHash = await hashCPF(cpf);
  const convidadoPor = await _resolverConvidadoPor();
  const { error: erroPerfil } = await supabaseClient.from("perfis").insert({
    id: data.user.id,
    convidado_por: convidadoPor && convidadoPor !== data.user.id ? convidadoPor : null,
    nome,
    telefone: telefone || null,
    escopo: "assembleia",
    partido_escopo: null,
    modo_preenchimento: modoPreenchimento,
    mostrar_nome: true,
    cpf_hash: cpfHash,
    lgpd_aceite_em: new Date().toISOString(),
    cep,
    municipio_residencia: municipioResidencia,
    uf_residencia: ufResidencia,
    genero,
  });
  if (erroPerfil) {
    const duplicado = erroPerfil.code === "23505" || /duplicate|unique/i.test(erroPerfil.message || "");
    return { error: { message: duplicado ? "Este CPF já está cadastrado em outra conta." : erroPerfil.message } };
  }
  // Limpa o convite pendente AQUI (não antes) — achado em auditoria de QA,
  // 25/08/2026: a chave nunca era removida, então ficava presa no
  // localStorage pra sempre e atribuía QUALQUER cadastro futuro no mesmo
  // aparelho ao mesmo convidante antigo, mesmo meses depois e sem link
  // nenhum. O comentário de _resolverConvidadoPor já dizia "limpa depois
  // que o perfil nasce com a atribuição" — só faltava o código de verdade.
  localStorage.removeItem("sl_convite_pendente");
  return { data };
}

async function entrar({ email, senha }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  return { data, error };
}

async function sair() {
  await supabaseClient.auth.signOut();
}

// "Esqueci minha senha" — manda um e-mail com link de recuperação via
// Supabase Auth. redirectTo aponta de volta pro próprio site (mesma URL
// atual, sem querystring) — o Supabase anexa um token de recuperação na
// URL; o cliente detecta isso sozinho (onAuthStateChange dispara
// "PASSWORD_RECOVERY", ver interface/prospeccao.js) e libera a tela de
// definir nova senha.
async function solicitarRecuperacaoSenha(email) {
  const redirectTo = window.location.origin + window.location.pathname;
  return await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
}

// Chamado depois que a pessoa clicou no link do e-mail e chegou na tela de
// "defina uma nova senha" — nesse momento já existe uma sessão de
// recuperação válida (criada pelo próprio Supabase ao processar o token da
// URL), então só precisa trocar a senha.
async function redefinirSenha(novaSenha) {
  return await supabaseClient.auth.updateUser({ password: novaSenha });
}

async function sessaoAtual() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session || null;
}

async function meuPerfil() {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  const { data, error } = await supabaseClient
    .from("perfis")
    .select("*")
    .eq("id", sessao.user.id)
    .maybeSingle();
  if (error) {
    console.error("Erro ao carregar perfil:", error);
    return null;
  }
  return data;
}

// "admin" vive numa tabela própria (migração 18), não como coluna em
// "perfis" — mesmo motivo de segurança de creditos_conta (ver migração
// 9): coluna solta em "perfis" seria alterável pelo próprio dono via
// update. sou_admin() é a função SQL que só lê a própria linha da tabela
// admins, sem expor a tabela inteira.
async function souAdmin() {
  const { data, error } = await supabaseClient.rpc("sou_admin");
  if (error) { console.error("Erro ao checar admin:", error); return false; }
  return !!data;
}

// Atualiza campos editáveis do próprio perfil (Meu perfil). E-mail não
// entra aqui — trocar e-mail de login é uma operação separada do Supabase
// Auth (auth.updateUser({email})), não uma coluna de "perfis".
async function atualizarPerfil(perfilId, campos) {
  const { error } = await supabaseClient.from("perfis").update(campos).eq("id", perfilId);
  return { error };
}

// Mini-pesquisa obrigatória de cadastro (migração 20) — colunas simples em
// "perfis", mesmo caminho de atualizarPerfil() acima.
async function salvarMiniPesquisa(perfilId, respostas) {
  return await atualizarPerfil(perfilId, { mini_pesquisa_respostas: respostas, mini_pesquisa_em: new Date().toISOString() });
}

async function trocarSenhaLogado(novaSenha) {
  if (!senhaForte(novaSenha)) return { error: { message: "A senha precisa ter pelo menos 8 caracteres, com letra, número e caractere especial." } };
  return await supabaseClient.auth.updateUser({ password: novaSenha });
}

// ========== Reportar problema ==========
async function reportarProblema(perfilId, mensagem, tela) {
  const { error } = await supabaseClient.from("problemas_reportados").insert({ perfil_id: perfilId, mensagem, tela: tela || null });
  return { error };
}

// ========== Painel do administrador ==========
async function adminEstatisticasUsuarios() {
  const { data, error } = await supabaseClient.rpc("admin_estatisticas_usuarios");
  if (error) { console.error("Erro ao carregar estatísticas de usuários:", error); return null; }
  return Array.isArray(data) ? data[0] : data;
}

// RPC em vez de select("*, perfis(nome)") direto: o embed de "perfis"
// respeita a RLS da própria tabela (perfis_select_proprio — só o dono lê
// a própria linha, sem exceção pra admin), então um select client-side
// só traria o nome de quem reportou EM PROBLEMAS DO PRÓPRIO ADMIN — todo
// resto vinha null. Achado em revisão de código, 15/08/2026, antes do
// primeiro teste com admin de verdade (migração 22).
async function adminListarProblemas(status) {
  const { data, error } = await supabaseClient.rpc("admin_listar_problemas", { p_status: status || null });
  if (error) { console.error("Erro ao carregar problemas reportados:", error); return []; }
  return data || [];
}

async function adminMarcarProblemaResolvido(id) {
  const { error } = await supabaseClient.from("problemas_reportados").update({ status: "resolvido", resolvido_em: new Date().toISOString() }).eq("id", id);
  return { error };
}

async function adminPesquisaAgregada(estado, genero, ufResidencia) {
  const { data, error } = await supabaseClient.rpc("admin_pesquisa_agregada", { p_estado: estado, p_genero: genero || null, p_uf_residencia: ufResidencia || null });
  if (error) { console.error("Erro ao carregar pesquisa agregada:", error); return []; }
  return data || [];
}

async function adminEstatisticasCreditos() {
  const { data, error } = await supabaseClient.rpc("admin_estatisticas_creditos");
  if (error) { console.error("Erro ao carregar estatísticas de créditos:", error); return null; }
  return Array.isArray(data) ? data[0] : data;
}

// filtros: { genero, uf, desde, ate, statusCedula, tipoConta } — todos
// opcionais. Uma linha por conta (migração 32); admin_estatisticas_usuarios
// continua sendo os agregados do topo da tela.
async function adminListarUsuarios(filtros) {
  filtros = filtros || {};
  const { data, error } = await supabaseClient.rpc("admin_listar_usuarios", {
    p_genero: filtros.genero || null,
    p_uf: filtros.uf || null,
    p_desde: filtros.desde || null,
    p_ate: filtros.ate || null,
    p_status_cedula: filtros.statusCedula || null,
    p_tipo_conta: filtros.tipoConta || null,
    p_limite: 200,
  });
  if (error) { console.error("Erro ao listar usuários:", error); return null; }
  return data || [];
}

async function adminListarExecucoesRotina() {
  const { data, error } = await supabaseClient.from("execucoes_rotina").select("*").order("executado_em", { ascending: false }).limit(30);
  if (error) { console.error("Erro ao carregar execuções de rotina:", error); return []; }
  return data || [];
}

// ========== Painel do usuário final ==========
// "usuario_final" vive numa tabela própria (migração 19), mesmo motivo de
// segurança de admin/creditos_conta — ver souAdmin() acima.
async function souUsuarioFinal() {
  const { data, error } = await supabaseClient.rpc("sou_usuario_final");
  if (error) { console.error("Erro ao checar usuário final:", error); return false; }
  return !!data;
}

async function usuarioFinalPesquisaAgregada(estado, genero, ufResidencia) {
  const { data, error } = await supabaseClient.rpc("usuario_final_pesquisa_agregada", { p_estado: estado, p_genero: genero || null, p_uf_residencia: ufResidencia || null });
  if (error) { console.error("Erro ao carregar pesquisa agregada:", error); return []; }
  return data || [];
}

// Login social — manda pro Google e volta pro mesmo endereço do site. O
// Google não entrega CPF nem um aceite de LGPD, então quem entra por aqui
// pela primeira vez tem sessão mas ainda não tem linha em "perfis" — o app
// detecta isso (initColaborativo, interface/prospeccao.js) e pede só esses
// dois dados que faltam antes de liberar o resto (ver completarPerfilGoogle).
async function entrarComGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  return await supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

// Completa o cadastro de quem entrou pelo Google: a sessão já existe, só
// falta criar a linha em "perfis" com CPF (anti-duplicidade, mesma regra do
// cadastro por e-mail) e o aceite da LGPD.
async function completarPerfilGoogle({ nome, cpf, telefone, lgpdAceito, cep, municipioResidencia, ufResidencia, genero }) {
  if (!cpfValido(cpf)) return { error: { message: "CPF inválido. Confira os números digitados." } };
  if (!lgpdAceito) return { error: { message: "Precisa marcar a concordância com o uso dos dados pra continuar." } };
  const sessao = await sessaoAtual();
  if (!sessao) return { error: { message: "Sessão expirada. Entre novamente." } };
  const cpfHash = await hashCPF(cpf);
  const convidadoPor = await _resolverConvidadoPor();
  const { data, error: erroPerfil } = await supabaseClient.from("perfis").insert({
    id: sessao.user.id,
    convidado_por: convidadoPor && convidadoPor !== sessao.user.id ? convidadoPor : null,
    nome,
    telefone: telefone || null,
    escopo: "assembleia",
    partido_escopo: null,
    modo_preenchimento: "detalhado",
    mostrar_nome: true,
    cpf_hash: cpfHash,
    lgpd_aceite_em: new Date().toISOString(),
    cep,
    municipio_residencia: municipioResidencia,
    uf_residencia: ufResidencia,
    genero,
  }).select().maybeSingle();
  if (erroPerfil) {
    const duplicado = erroPerfil.code === "23505" || /duplicate|unique/i.test(erroPerfil.message || "");
    return { error: { message: duplicado ? "Este CPF já está cadastrado em outra conta." : erroPerfil.message } };
  }
  // Mesma limpeza de cadastrar() acima — ver comentário lá.
  localStorage.removeItem("sl_convite_pendente");
  return { data };
}
