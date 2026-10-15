-- Migração 67: relatório de visitas com nomes (pedido do usuário em 15/10/2026).
-- Aplicar via MCP apply_migration.
-- POR QUE: a aba Visitas só mostrava totais; o administrador quer saber QUEM
-- acessou (usuários logados), os cadastros novos e as visitas por dia × página.
-- Mesma função admin_visitas (mesma assinatura), com 3 chaves novas.
create or replace function public.admin_visitas(p_dias integer default 7)
returns jsonb language plpgsql security definer stable set search_path = public as $$
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
        from public.visitas where criado_em >= v_ini group by pagina) x),
    'dia_pagina', (select coalesce(jsonb_agg(d), '[]'::jsonb) from (
        select jsonb_build_object('dia', to_char(criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'), 'pagina', pagina,
          'visitas', count(*), 'visitantes', count(distinct visitante)) d
        from public.visitas where criado_em >= v_ini group by to_char(criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'), pagina) x),
    'usuarios', (select coalesce(jsonb_agg(d order by (d->>'visitas')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('nome', p.nome, 'email', u.email::text, 'visitas', count(*),
          'paginas', string_agg(distinct v.pagina, ', '), 'ultima', max(v.criado_em)) d
        from public.visitas v join auth.users u on u.id = v.perfil_id left join public.perfis p on p.id = v.perfil_id
        where v.criado_em >= v_ini group by u.email, p.nome) x),
    'cadastros', (select coalesce(jsonb_agg(d order by d->>'em' desc), '[]'::jsonb) from (
        select jsonb_build_object('nome', p.nome, 'email', u.email::text, 'em', u.created_at) d
        from auth.users u left join public.perfis p on p.id = u.id where u.created_at >= v_ini) x)
  );
end;
$$;
revoke all on function public.admin_visitas(integer) from public, anon;
grant execute on function public.admin_visitas(integer) to authenticated;
