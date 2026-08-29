-- Migração 37: aba "Analítico" do painel do administrador (nível Sistema)
-- — estruturação aprovada 28/08/2026. Colar no SQL Editor e rodar UMA vez,
-- depois da migração 36.
--
-- Uma função só, um round-trip só: devolve TODAS as agregações da aba num
-- jsonb (usuários por dia, cédulas por cargo/estado, funil, engajamento).
-- Security definer porque as tabelas de origem têm RLS por dono; o gate de
-- admin é checado EXPLICITAMENTE no corpo (regra security-privileges do
-- guia Supabase do repositório: definer sempre revalida quem chama).
-- p_incluir_bots: false (padrão) tira as contas fictícias de todos os
-- números — é o "sistema de verdade"; true mostra o total bruto.

create or replace function public.admin_analitico(p_incluir_bots boolean default false)
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

  with perfis_validos as (
    select id, criado_em from public.perfis
    where p_incluir_bots or not eh_ficticio
  ),
  salvs_depositados as (
    select s.id, s.perfil_id, s.estado, s.depositado_em
    from public.salvamentos s
    join perfis_validos pv on pv.id = s.perfil_id
    where s.depositado_em is not null
  )
  select jsonb_build_object(
    'usuarios_total', (select count(*) from perfis_validos),
    'usuarios_7d', (select count(*) from perfis_validos where criado_em >= now() - interval '7 days'),
    'usuarios_por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'n', n) order by dia), '[]'::jsonb)
      from (
        select date_trunc('day', criado_em)::date as dia, count(*) as n
        from perfis_validos
        where criado_em >= now() - interval '30 days'
        group by 1
      ) t
    ),
    'cedulas_total', (select count(*) from salvs_depositados),
    'cedulas_por_estado', (
      select coalesce(jsonb_agg(jsonb_build_object('estado', estado, 'n', n) order by n desc), '[]'::jsonb)
      from (select estado, count(*) as n from salvs_depositados group by estado) t
    ),
    'cedulas_por_cargo', (
      select coalesce(jsonb_agg(jsonb_build_object('cargo', cargo, 'n', n)), '[]'::jsonb)
      from (
        select ls.cargo, count(*) as n
        from public.listas_salvas ls
        join salvs_depositados sd on sd.id = ls.salvamento_id
        group by ls.cargo
      ) t
    ),
    'funil_cadastraram', (select count(*) from perfis_validos),
    'funil_preencheram', (
      select count(*) from public.palpites pl
      join perfis_validos pv on pv.id = pl.perfil_id
      where coalesce(jsonb_array_length(pl.rascunho_estadual), 0) > 0
         or coalesce(jsonb_array_length(pl.rascunho_federal), 0) > 0
         or coalesce(jsonb_array_length(pl.rascunho_senador), 0) > 0
    ),
    'funil_depositaram', (select count(distinct perfil_id) from salvs_depositados),
    'desafios_criados', (select count(*) from public.desafios),
    'desafios_selados', (select count(*) from public.desafios where status in ('selado','apuracao','encerrado')),
    'revelacoes_termometro', (select count(*) from public.termometro_revelacoes),
    'sl_creditados', (select coalesce(sum(valor), 0) from public.transacoes_creditos where valor > 0),
    'sl_gastos', (select coalesce(-sum(valor), 0) from public.transacoes_creditos where valor < 0)
  ) into v_resultado;

  return v_resultado;
end;
$$;
revoke all on function public.admin_analitico(boolean) from public, anon;
grant execute on function public.admin_analitico(boolean) to authenticated;
