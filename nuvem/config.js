// Conexão com o backend compartilhado (Supabase) — Prospecção Coletiva.
//
// A chave abaixo é a "publishable" (também chamada "anon"/pública) do projeto
// Supabase. É segura para ficar visível aqui: ela só permite o que as regras
// de acesso do banco (RLS) autorizam explicitamente (ver nuvem/schema.sql) —
// nunca a chave "secret"/"service_role", essa sim precisa ficar só no painel
// do Supabase e nunca aparecer em nenhum arquivo do site.
const SUPABASE_URL = "https://uxqxhvzeptuedyggwguh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_51xruPXb33u2lkXFuw1jjQ_fK4N-wph";

// Login vencido preso no endereço (03/11/2026): um "#access_token=…" de um login antigo fica na URL (aba antiga,
// histórico, volta do login). Ao abrir, a biblioteca tenta usá-lo, recebe "token vencido" e APAGA a sessão boa
// guardada no navegador — a página pede login de novo a cada abertura (Gabinete em "Área restrita" mesmo logado).
// Roda antes de o cliente do Supabase nascer em todas as páginas e tira esse resto do endereço; login novo, com
// token ainda válido, passa normal.
(function limparLoginVencidoDaUrl() {
  try {
    const h = location.hash; if (!/access_token=/.test(h)) return;
    const p = new URLSearchParams(h.slice(1)); let ate = +p.get("expires_at") || 0;
    if (!ate) { const b = (p.get("access_token") || "").split(".")[1]; ate = b ? +JSON.parse(atob(b.replace(/-/g, "+").replace(/_/g, "/"))).exp || 0 : 0; }
    if (ate * 1000 > Date.now() + 10000) return;
    history.replaceState(null, "", location.pathname + location.search);
  } catch (e) {}
})();
