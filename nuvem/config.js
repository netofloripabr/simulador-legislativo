// Conexão com o backend compartilhado (Supabase) — Prospecção Coletiva.
//
// A chave abaixo é a "publishable" (também chamada "anon"/pública) do projeto
// Supabase. É segura para ficar visível aqui: ela só permite o que as regras
// de acesso do banco (RLS) autorizam explicitamente (ver nuvem/schema.sql) —
// nunca a chave "secret"/"service_role", essa sim precisa ficar só no painel
// do Supabase e nunca aparecer em nenhum arquivo do site.
const SUPABASE_URL = "https://qgjfkpsjveatonziwkvj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eQbVaB7fNEjgEtfat2AGyA_f4uRVPpg";
