-- Migração 65: acesso controlado aos valores da página Parlamentares (pedido do usuário em 13/10/2026).
-- Aplicar via MCP apply_migration.
--
-- POR QUE: a página Parlamentares fica aberta ao público, mas as estruturas com
-- valores (Administrativo: subsídio, gabinete, simulador, liderança, Casa, mandato
-- em números) ficam trancadas. Quem quer ver faz cadastro/login; o pedido cai no
-- sino do administrador, que libera ou nega. Mesmo desenho da Corrida da Mesa
-- (migração 62), com fila de pedidos.
--
-- SEGURANÇA: RLS ligado; cada um lê só o próprio pedido. Entrada só pelas RPCs.
-- Admin decide por admin_decidir_acesso_parlamentares (gate da tabela admins).
-- Obs.: os valores em si são dados públicos estáticos do site; o cadeado é de
-- produto (controle de quem usa), não segredo.

create table if not exists public.parlamentares_acesso (
  perfil_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'liberado', 'negado')),
  solicitado_em timestamptz not null default now(),
  decidido_em timestamptz null,
  decidido_por uuid null references auth.users(id)
);
alter table public.parlamentares_acesso enable row level security;
drop policy if exists parlamentares_acesso_le_proprio on public.parlamentares_acesso;
create policy parlamentares_acesso_le_proprio on public.parlamentares_acesso for select to authenticated
  using (perfil_id = (select auth.uid()));
revoke all on table public.parlamentares_acesso from anon;
grant select on table public.parlamentares_acesso to authenticated;

-- Situação de quem está logado: 'liberado' (admin sempre), 'pendente', 'negado' ou 'nenhum'.
create or replace function public.acesso_parlamentares()
returns text language sql security definer stable set search_path = public as $$
  select case
    when (select auth.uid()) is null then 'nenhum'
    when exists (select 1 from public.admins where perfil_id = (select auth.uid())) then 'liberado'
    else coalesce((select status from public.parlamentares_acesso where perfil_id = (select auth.uid())), 'nenhum') end;
$$;
grant execute on function public.acesso_parlamentares() to authenticated;

-- Pede acesso (uma vez); avisa os administradores no sino.
create or replace function public.solicitar_acesso_parlamentares()
returns text language plpgsql security definer set search_path = public as $$
declare v uuid := (select auth.uid()); v_email text; v_nome text; v_admin record;
begin
  if v is null then raise exception 'Entre na sua conta para pedir acesso.'; end if;
  if exists (select 1 from public.parlamentares_acesso where perfil_id = v) then
    return (select status from public.parlamentares_acesso where perfil_id = v);
  end if;
  insert into public.parlamentares_acesso (perfil_id) values (v);
  select email into v_email from auth.users where id = v;
  select nome into v_nome from public.perfis where id = v;
  for v_admin in select perfil_id from public.admins loop
    perform public.criar_notificacao_interna(v_admin.perfil_id, 'acesso_parlamentares',
      'Pedido de acesso: Parlamentares',
      coalesce(v_nome, 'Usuário') || ' (' || coalesce(v_email, '?') || ') pediu acesso aos valores da página Parlamentares. Libere em Painel do administrador → Acessos.');
  end loop;
  return 'pendente';
end $$;
grant execute on function public.solicitar_acesso_parlamentares() to authenticated;

create or replace function public.admin_listar_acesso_parlamentares()
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then raise exception 'Acesso restrito a administradores.'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('perfil_id', a.perfil_id, 'status', a.status, 'solicitado_em', a.solicitado_em, 'decidido_em', a.decidido_em,
      'email', u.email::text, 'nome', p.nome) order by (a.status = 'pendente') desc, a.solicitado_em desc), '[]'::jsonb)
    from public.parlamentares_acesso a join auth.users u on u.id = a.perfil_id left join public.perfis p on p.id = a.perfil_id);
end $$;
revoke all on function public.admin_listar_acesso_parlamentares() from public, anon;
grant execute on function public.admin_listar_acesso_parlamentares() to authenticated;

create or replace function public.admin_decidir_acesso_parlamentares(p_perfil uuid, p_liberar boolean)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then raise exception 'Acesso restrito a administradores.'; end if;
  insert into public.parlamentares_acesso (perfil_id, status, decidido_em, decidido_por)
    values (p_perfil, case when p_liberar then 'liberado' else 'negado' end, now(), (select auth.uid()))
    on conflict (perfil_id) do update set status = excluded.status, decidido_em = now(), decidido_por = (select auth.uid());
  perform public.criar_notificacao_interna(p_perfil, 'acesso_parlamentares',
    case when p_liberar then 'Acesso liberado' else 'Acesso não liberado' end,
    case when p_liberar then 'Os valores da página Parlamentares estão liberados para você.' else 'Seu pedido de acesso aos valores da página Parlamentares não foi liberado.' end);
  return case when p_liberar then 'liberado' else 'negado' end;
end $$;
revoke all on function public.admin_decidir_acesso_parlamentares(uuid, boolean) from public, anon;
grant execute on function public.admin_decidir_acesso_parlamentares(uuid, boolean) to authenticated;
