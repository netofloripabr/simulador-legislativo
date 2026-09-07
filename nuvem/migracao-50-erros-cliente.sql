-- Migração 50: telemetria mínima de erros de JavaScript no navegador
-- (item "telemetria de erro no cliente" da análise três lentes, aprovado
-- pelo usuário em 05/09/2026). Aplicar via MCP apply_migration.
--
-- POR QUE: se uma tela quebra no celular de um usuário, hoje ninguém fica
-- sabendo. nuvem/telemetria.js captura window.onerror/unhandledrejection e
-- chama registrar_erro_cliente(); o painel admin (seção "Erros") lista e
-- marca como resolvido.
--
-- SEGURANÇA / ANTI-ABUSO:
--   - RLS ligado e NENHUMA policy: ninguém lê nem grava a tabela direto.
--     Toda entrada é pela RPC registrar_erro_cliente (security definer,
--     anon + authenticated — visitante sem login também reporta).
--   - Logado: máximo 30 registros por perfil por hora.
--   - Anônimo: mensagem/stack cortados em 2 kB e duplicata exata
--     (mesma mensagem + url) nos últimos 60 s é ignorada.
--   - Leitura só admin (admin_listar_erros_cliente) e "resolver" só admin
--     (admin_resolver_erro_cliente marca resolvido_em, não apaga) — mesmo
--     gate explícito da migração 39.

create table if not exists public.erros_cliente (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  perfil_id uuid null references public.perfis(id) on delete set null,
  mensagem text not null,
  stack text null,
  tela text null,
  url text null,
  versao_cb text null,
  user_agent text null,
  extra jsonb null,
  resolvido_em timestamptz null
);
alter table public.erros_cliente enable row level security;
revoke all on table public.erros_cliente from public, anon, authenticated;

create index if not exists erros_cliente_criado_em_idx
  on public.erros_cliente (criado_em desc);
-- Índice parcial pros abertos (o painel só lista esses; a maioria das
-- linhas vira "resolvida" com o tempo).
create index if not exists erros_cliente_abertos_idx
  on public.erros_cliente (criado_em desc) where resolvido_em is null;
-- Pro limitador por perfil/hora.
create index if not exists erros_cliente_perfil_idx
  on public.erros_cliente (perfil_id, criado_em desc) where perfil_id is not null;

-- ---------------------------------------------------------------------
-- Registrar (qualquer visitante). Retorna true se gravou, false se foi
-- descartado pelo limitador — o cliente não faz nada com isso.
-- ---------------------------------------------------------------------
create or replace function public.registrar_erro_cliente(
  p_mensagem text,
  p_stack text default null,
  p_tela text default null,
  p_url text default null,
  p_versao_cb text default null,
  p_user_agent text default null,
  p_extra jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid := (select auth.uid());
  v_mensagem text := left(coalesce(nullif(btrim(p_mensagem), ''), '(sem mensagem)'), 2000);
  v_stack text := left(p_stack, 2000);
  v_url text := left(p_url, 500);
begin
  if v_perfil is not null then
    -- Logado: no máximo 30 por hora por perfil.
    if (select count(*) from public.erros_cliente
        where perfil_id = v_perfil and criado_em > now() - interval '1 hour') >= 30 then
      return false;
    end if;
  end if;

  -- Duplicata exata (mesma mensagem + url) nos últimos 60 s é descartada
  -- (vale pra todos; essencial pro anônimo, que não tem limite por perfil).
  if exists (
    select 1 from public.erros_cliente
    where criado_em > now() - interval '60 seconds'
      and mensagem = v_mensagem
      and url is not distinct from v_url
  ) then
    return false;
  end if;

  insert into public.erros_cliente
    (perfil_id, mensagem, stack, tela, url, versao_cb, user_agent, extra)
  values
    (v_perfil, v_mensagem, v_stack, left(p_tela, 120), v_url,
     left(p_versao_cb, 20), left(p_user_agent, 300), p_extra);
  return true;
end;
$$;
revoke all on function public.registrar_erro_cliente(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.registrar_erro_cliente(text, text, text, text, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Listar (só admin): abertos primeiro, mais recentes primeiro; junta nome
-- e e-mail do perfil quando o erro veio de alguém logado.
-- ---------------------------------------------------------------------
create or replace function public.admin_listar_erros_cliente(
  p_limite integer default 200
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_resultado jsonb;
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'criado_em', e.criado_em, 'mensagem', e.mensagem,
           'stack', e.stack, 'tela', e.tela, 'url', e.url,
           'versao_cb', e.versao_cb, 'user_agent', e.user_agent,
           'extra', e.extra, 'resolvido_em', e.resolvido_em,
           'nome', p.nome, 'email', u.email::text
         ) order by (e.resolvido_em is null) desc, e.criado_em desc), '[]'::jsonb)
  into v_resultado
  from (select * from public.erros_cliente
        order by (resolvido_em is null) desc, criado_em desc
        limit least(greatest(p_limite, 1), 1000)) e
  left join public.perfis p on p.id = e.perfil_id
  left join auth.users u on u.id = e.perfil_id;

  return v_resultado;
end;
$$;
revoke all on function public.admin_listar_erros_cliente(integer) from public, anon;
grant execute on function public.admin_listar_erros_cliente(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Resolver (só admin): marca resolvido_em, não apaga.
-- ---------------------------------------------------------------------
create or replace function public.admin_resolver_erro_cliente(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  update public.erros_cliente set resolvido_em = now()
  where id = p_id and resolvido_em is null;
end;
$$;
revoke all on function public.admin_resolver_erro_cliente(uuid) from public, anon;
grant execute on function public.admin_resolver_erro_cliente(uuid) to authenticated;
