// Conexão com o backend compartilhado (Supabase) — Prospecção Coletiva.
//
// A chave abaixo é a "publishable" (também chamada "anon"/pública) do projeto
// Supabase. É segura para ficar visível aqui: ela só permite o que as regras
// de acesso do banco (RLS) autorizam explicitamente (ver nuvem/schema.sql) —
// nunca a chave "secret"/"service_role", essa sim precisa ficar só no painel
// do Supabase e nunca aparecer em nenhum arquivo do site.
const SUPABASE_URL = "https://uxqxhvzeptuedyggwguh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_51xruPXb33u2lkXFuw1jjQ_fK4N-wph";
