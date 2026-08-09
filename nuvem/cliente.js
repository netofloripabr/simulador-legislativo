// Cria a instância do projeto Supabase. Chamada de "supabaseClient" (não
// "supabase") porque "supabase" já é o nome global da biblioteca vinda do CDN
// (ver index.html) — usar o mesmo nome sobrescreveria a biblioteca.
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

if (!supabaseClient) {
  console.error(
    "Prospecção Coletiva: biblioteca do Supabase não carregou (CDN fora do ar ou bloqueado). " +
    "O Simulador individual continua funcionando normalmente."
  );
}

// "Esqueci minha senha": quando a pessoa clica no link do e-mail de
// recuperação, o Supabase processa o token sozinho (fica embutido na URL
// de retorno) e dispara este evento — é o sinal pra abrir a tela de
// definir nova senha (renderTelaNovaSenha, interface/prospeccao.js).
// Registrado aqui (não em prospeccao.js) pra já estar ativo desde o
// primeiro instante da página, antes de qualquer outra coisa carregar —
// mas só EXECUTA de verdade depois (é assíncrono), quando pcState/
// renderColaborativo já existem.
if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY" && typeof pcState !== "undefined") {
      pcState.tela = "nova-senha";
      pcState.erro = "";
      renderColaborativo();
    }
  });
}
