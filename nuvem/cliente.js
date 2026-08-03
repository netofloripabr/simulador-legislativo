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
