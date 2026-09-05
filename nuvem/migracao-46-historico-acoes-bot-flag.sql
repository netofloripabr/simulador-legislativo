-- Migração 46: filtros client-side no "Histórico de ações" da aba
-- Analítico do painel admin (pedido do usuário 04/09/2026, aprovado em
-- protótipo visual). Colar no SQL Editor e rodar UMA vez, depois da
-- migração 45.
--
-- Antes: admin_historico_acoes(p_limite, p_incluir_bots) decidia no banco
-- se trazia bots ou não, então trocar entre "Todos/Orgânico/Bots" na tela
-- exigia um novo round-trip. Agora a função sempre traz tudo (orgânicos +
-- bots) e expõe um campo 'bot' por linha — o filtro de origem, tipo de
-- ação e busca livre passam a rodar 100% no navegador, instantâneo.
-- Simplificação: como não há mais decisão de incluir/excluir bots no
-- banco, o parâmetro p_incluir_bots sai da assinatura (função nova).

drop function if exists public.admin_historico_acoes(integer, boolean);

create or replace function public.admin_historico_acoes(
  p_limite integer default 300
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

  with perfis_validos as (
    select p.id, p.nome, p.municipio_residencia, p.criado_em, p.eh_ficticio, u.email::text as email
    from public.perfis p
    left join auth.users u on u.id = p.id
  ),
  eventos as (
    select 'cadastro' as acao, pv.criado_em as data, pv.nome, pv.municipio_residencia, pv.email,
           null::text as detalhe, pv.eh_ficticio as bot
    from perfis_validos pv

    union all
    select 'palpite_salvo', s.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           s.nome, pv.eh_ficticio
    from public.salvamentos s
    join perfis_validos pv on pv.id = s.perfil_id

    union all
    select 'cedula_depositada', s.depositado_em, pv.nome, pv.municipio_residencia, pv.email,
           s.nome || coalesce(' · ' || s.codigo, ''), pv.eh_ficticio
    from public.salvamentos s
    join perfis_validos pv on pv.id = s.perfil_id
    where s.depositado_em is not null

    union all
    select 'credito_adquirido', t.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           '+' || t.valor || ' SL · ' || t.tipo, pv.eh_ficticio
    from public.transacoes_creditos t
    join perfis_validos pv on pv.id = t.perfil_id
    where t.valor > 0

    union all
    select 'credito_utilizado', t.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           t.valor || ' SL · ' || t.tipo, pv.eh_ficticio
    from public.transacoes_creditos t
    join perfis_validos pv on pv.id = t.perfil_id
    where t.valor < 0

    union all
    select 'duelo_cadastrado', d.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           '"' || d.nome || '" · ' || d.status, pv.eh_ficticio
    from public.desafios d
    join perfis_validos pv on pv.id = d.criador_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'acao', acao, 'data', data, 'nome', nome,
           'municipio', municipio_residencia, 'email', email, 'detalhe', detalhe,
           'bot', coalesce(bot, false)
         ) order by data desc), '[]'::jsonb)
  into v_resultado
  from (select * from eventos order by data desc limit least(greatest(p_limite, 1), 1000)) ultimos;

  return v_resultado;
end;
$$;
revoke all on function public.admin_historico_acoes(integer) from public, anon;
grant execute on function public.admin_historico_acoes(integer) to authenticated;
