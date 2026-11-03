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
// definir nova senha (renderTelaNovaSenha, interface/20-acesso.js).
// Registrado aqui (não em interface/*.js) pra já estar ativo desde o
// primeiro instante da página, antes de qualquer outra coisa carregar —
// mas só EXECUTA de verdade depois (é assíncrono), quando pcState/
// renderColaborativo já existem.
// Autorização do Google Drive (planilhas do Gabinete, 03/11/2026): o Supabase só devolve o login para a página
// inicial (lista de endereços permitidos) e entrega o token do Google UMA vez — na renovação automática do login
// ele some. Por isso o token é guardado aqui, no 1º instante, e a pessoa é mandada de volta para a página que pediu
// a autorização (sessionStorage "sl_volta_google", gravado por painel/gabinete-planilha.js).
function guardarTokenGoogle(session) {
  if (!session || !session.provider_token) return;
  try { localStorage.setItem("sl_gtoken", JSON.stringify({ t: session.provider_token, ate: Date.now() + 50 * 60 * 1000 })); } catch (e) {}
  let volta = null; try { volta = sessionStorage.getItem("sl_volta_google"); sessionStorage.removeItem("sl_volta_google"); } catch (e) {}
  if (volta && volta.indexOf(location.origin) === 0 && volta.split("#")[0] !== location.href.split("#")[0]) location.replace(volta);
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") guardarTokenGoogle(session);
    if (event === "PASSWORD_RECOVERY" && typeof pcState !== "undefined") {
      pcState.tela = "nova-senha";
      pcState.erro = "";
      renderColaborativo();
    }
  });
}
