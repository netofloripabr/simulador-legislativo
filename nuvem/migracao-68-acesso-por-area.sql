-- Migração 68: liberação por área na página Parlamentares (pedido do usuário em 15/10/2026).
-- Aplicar via MCP apply_migration.
-- POR QUE: todo cadastro novo vira um pedido no sino do administrador, e ele
-- escolhe, pessoa a pessoa, o que liberar: Legislativo, Administrativo,
-- Valores (R$ do Subsídio e da Casa) e Mesa. Antes era um "liberado" só
-- (valores) e a Mesa por e-mail (migração 62).
-- Quem já estava "liberado" (migração 65) fica com tudo liberado.
alter table public.parlamentares_acesso add column if not exists legislativo boolean not null default false;
alter table public.parlamentares_acesso add column if not exists administrativo boolean not null default false;
alter table public.parlamentares_acesso add column if not exists valores boolean not null default false;
update public.parlamentares_acesso set legislativo = true, administrativo = true, valores = true where status = 'liberado';
insert into public.mesa_acesso (perfil_id) select perfil_id from public.parlamentares_acesso where status = 'liberado' on conflict do nothing;

-- O que quem está logado pode ver. Admin vê tudo.
create or replace function public.acesso_parlamentares_areas()
returns jsonb language sql security definer stable set search_path = public as $$
  select case
    when (select auth.uid()) is null then jsonb_build_object('status', 'nenhum')
    when exists (select 1 from public.admins where perfil_id = (select auth.uid())) then
      jsonb_build_object('status', 'liberado', 'legislativo', true, 'administrativo', true, 'valores', true, 'mesa', true)
    else coalesce((select jsonb_build_object('status', a.status, 'legislativo', a.legislativo, 'administrativo', a.administrativo, 'valores', a.valores,
        'mesa', exists (select 1 from public.mesa_acesso m where m.perfil_id = a.perfil_id))
      from public.parlamentares_acesso a where a.perfil_id = (select auth.uid())), jsonb_build_object('status', 'nenhum')) end;
$$;
grant execute on function public.acesso_parlamentares_areas() to authenticated;

-- Compatibilidade: a trava antiga dos valores passa a olhar a coluna "valores".
create or replace function public.acesso_parlamentares()
returns text language sql security definer stable set search_path = public as $$
  select case
    when (select auth.uid()) is null then 'nenhum'
    when exists (select 1 from public.admins where perfil_id = (select auth.uid())) then 'liberado'
    else coalesce((select case when valores then 'liberado' when status = 'pendente' then 'pendente' else 'negado' end
      from public.parlamentares_acesso where perfil_id = (select auth.uid())), 'nenhum') end;
$$;

create or replace function public.admin_listar_acesso_parlamentares()
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then raise exception 'Acesso restrito a administradores.'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('perfil_id', a.perfil_id, 'status', a.status, 'solicitado_em', a.solicitado_em, 'decidido_em', a.decidido_em,
      'email', u.email::text, 'nome', p.nome, 'legislativo', a.legislativo, 'administrativo', a.administrativo, 'valores', a.valores,
      'mesa', exists (select 1 from public.mesa_acesso m where m.perfil_id = a.perfil_id))
      order by (a.status = 'pendente') desc, a.solicitado_em desc), '[]'::jsonb)
    from public.parlamentares_acesso a join auth.users u on u.id = a.perfil_id left join public.perfis p on p.id = a.perfil_id);
end $$;

-- Admin grava as 4 áreas de uma vez; avisa a pessoa no sino.
create or replace function public.admin_definir_areas_parlamentares(p_perfil uuid, p_leg boolean, p_adm boolean, p_val boolean, p_mesa boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_alguma boolean := p_leg or p_adm or p_val or p_mesa; v_lista text;
begin
  if not exists (select 1 from public.admins where perfil_id = (select auth.uid())) then raise exception 'Acesso restrito a administradores.'; end if;
  insert into public.parlamentares_acesso (perfil_id, status, legislativo, administrativo, valores, decidido_em, decidido_por)
    values (p_perfil, case when v_alguma then 'liberado' else 'negado' end, p_leg, p_adm, p_val, now(), (select auth.uid()))
    on conflict (perfil_id) do update set status = excluded.status, legislativo = p_leg, administrativo = p_adm, valores = p_val, decidido_em = now(), decidido_por = (select auth.uid());
  if p_mesa then insert into public.mesa_acesso (perfil_id, concedido_por) values (p_perfil, (select auth.uid())) on conflict (perfil_id) do nothing;
  else delete from public.mesa_acesso where perfil_id = p_perfil; end if;
  v_lista := concat_ws(', ', case when p_leg then 'Legislativo' end, case when p_adm then 'Administrativo' end, case when p_val then 'valores' end, case when p_mesa then 'Mesa' end);
  perform public.criar_notificacao_interna(p_perfil, 'acesso_parlamentares',
    case when v_alguma then 'Acesso liberado' else 'Acesso não liberado' end,
    case when v_alguma then 'Liberado para você na página Parlamentares: ' || v_lista || '.' else 'Seu pedido de acesso à página Parlamentares não foi liberado.' end);
  return case when v_alguma then 'liberado' else 'negado' end;
end $$;
revoke all on function public.admin_definir_areas_parlamentares(uuid, boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.admin_definir_areas_parlamentares(uuid, boolean, boolean, boolean, boolean) to authenticated;

-- Texto do aviso ao admin: agora é um pedido geral, ele escolhe as áreas.
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
      coalesce(v_nome, 'Usuário') || ' (' || coalesce(v_email, '?') || ') pediu acesso à página Parlamentares. Escolha o que liberar em Painel do administrador → Acessos.');
  end loop;
  return 'pendente';
end $$;
