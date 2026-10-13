-- Migração 63: contador de visitas por página (pedido do usuário em 12/10/2026).
-- Aplicar via MCP apply_migration.
--
-- POR QUE: o banco só sabia quem fez login (auth.users); quem abre o Painel,
-- o Ranking ou Parlamentares sem conta não deixava rastro. Agora cada página
-- aberta grava uma linha: página, data/hora, um identificador aleatório do
-- navegador (gerado no próprio navegador, sem dado pessoal) e se havia sessão.
--
-- SEGURANÇA / ANTI-ABUSO:
--   - RLS ligado e nenhuma policy: só entra pela RPC registrar_visita
--     (security definer, anon + authenticated).
--   - O mesmo navegador na mesma página dentro de 30 min conta uma vez só.
--   - Leitura só admin (admin_visitas), mesmo gate das migrações 39/50.

create table if not exists public.visitas (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  pagina text not null,
  visitante text not null,
  logado boolean not null default false,
  perfil_id uuid null
);
alter table public.visitas enable row level security;
revoke all on table public.visitas from public, anon, authenticated;
create index if not exists visitas_criado_em_idx on public.visitas (criado_em desc);
create index if not exists visitas_dedup_idx on public.visitas (visitante, pagina, criado_em desc);

create or replace function public.registrar_visita(p_pagina text, p_visitante text, p_logado boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pag text := left(coalesce(nullif(btrim(p_pagina), ''), '?'), 60);
  v_vis text := left(coalesce(nullif(btrim(p_visitante), ''), 'sem-id'), 40);
begin
  if exists (select 1 from public.visitas where visitante = v_vis and pagina = v_pag and criado_em > now() - interval '30 minutes') then
    return false;
  end if;
  insert into public.visitas (pagina, visitante, logado, perfil_id)
  values (v_pag, v_vis, coalesce(p_logado, false) or (select auth.uid()) is not null, (select auth.uid()));
  return true;
end;
$$;
revoke all on function public.registrar_visita(text, text, boolean) from public;
grant execute on function public.registrar_visita(text, text, boolean) to anon, authenticated;

create or replace function public.admin_visitas(p_dias integer default 7)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_ini timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_dias, 7), 90)));
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return jsonb_build_object(
    'total', (select count(*) from public.visitas where criado_em >= v_ini),
    'visitantes', (select count(distinct visitante) from public.visitas where criado_em >= v_ini),
    'logados', (select count(distinct visitante) from public.visitas where criado_em >= v_ini and logado),
    'por_dia', (select coalesce(jsonb_agg(d order by d->>'dia'), '[]'::jsonb) from (
        select jsonb_build_object('dia', to_char(criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'),
          'visitas', count(*), 'visitantes', count(distinct visitante), 'logados', count(distinct visitante) filter (where logado)) d
        from public.visitas where criado_em >= v_ini group by to_char(criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')) x),
    'por_pagina', (select coalesce(jsonb_agg(d order by (d->>'visitas')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('pagina', pagina, 'visitas', count(*), 'visitantes', count(distinct visitante)) d
        from public.visitas where criado_em >= v_ini group by pagina) x)
  );
end;
$$;
revoke all on function public.admin_visitas(integer) from public, anon;
grant execute on function public.admin_visitas(integer) to authenticated;
