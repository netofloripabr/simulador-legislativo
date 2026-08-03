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

async function cadastrar({ nome, email, senha, escopo, partidoEscopo, modoPreenchimento, mostrarNome, cpf, lgpdAceito }) {
  if (!cpfValido(cpf)) return { error: { message: "CPF inválido. Confira os números digitados." } };
  if (!lgpdAceito) return { error: { message: "Precisa marcar a concordância com o uso dos dados pra continuar." } };

  const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
  if (error) return { error };
  if (!data.session) {
    // Confirmação de e-mail ainda ligada no painel do Supabase — ver PROJETO.md.
    return { error: { message: "Cadastro criado, mas o e-mail de confirmação está ativo no Supabase. Desligue 'Confirm email' em Authentication → Providers → Email e tente de novo." } };
  }
  const cpfHash = await hashCPF(cpf);
  const { error: erroPerfil } = await supabaseClient.from("perfis").insert({
    id: data.user.id,
    nome,
    escopo,
    partido_escopo: escopo === "partido" ? partidoEscopo : null,
    modo_preenchimento: modoPreenchimento,
    mostrar_nome: mostrarNome,
    cpf_hash: cpfHash,
    lgpd_aceite_em: new Date().toISOString(),
  });
  if (erroPerfil) {
    const duplicado = erroPerfil.code === "23505" || /duplicate|unique/i.test(erroPerfil.message || "");
    return { error: { message: duplicado ? "Este CPF já está cadastrado em outra conta." : erroPerfil.message } };
  }
  return { data };
}

async function entrar({ email, senha }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  return { data, error };
}

async function sair() {
  await supabaseClient.auth.signOut();
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
