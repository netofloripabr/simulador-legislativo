-- ============================================================
-- Migração 42 — Duelo sempre grátis (31/08/2026)
-- Decisão do usuário: enviar desafios é o "motor" de aquisição do
-- sistema e não pode ter custo. A régua desafios_gratis_restantes
-- (migração 28: 10 grátis nos 10 primeiros dias, depois 10 SL) passa
-- a devolver sempre "tem grátis sobrando" — as DUAS versões de
-- criar_desafio (28 e 40) consultam ela, então nenhuma outra função
-- muda. O estorno de duelos antigos pagos (custo_sl > 0) continua
-- funcionando normalmente pra cancelamento/expiração.
-- ============================================================

create or replace function public.desafios_gratis_restantes(p_perfil_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select 999999;  -- duelo é o motor do sistema: sempre grátis
$$;
