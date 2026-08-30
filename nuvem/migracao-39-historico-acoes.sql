-- Migração 39: histórico de ações no fim da aba "Analítico" do painel do
-- administrador (pedido do usuário 30/08/2026). Colar no SQL Editor e
-- rodar UMA vez, depois da migração 38.
--
-- Um relatório cronológico único, estilo documento: cada linha é uma ação
-- de usuário — cadastro, palpite salvo, cédula depositada, crédito
-- adquirido/utilizado, duelo cadastrado — com data, nome, município e
-- e-mail. Uma função só (union de 6 fontes), security definer com gate
-- explícito de admin (regra security-privileges do guia do repositório).

create or replace function public.admin_historico_acoes(
  p_limite integer default 300,
  p_incluir_bots boolean default false
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
    select p.id, p.nome, p.municipio_residencia, p.criado_em, u.email::text as email
    from public.perfis p
    left join auth.users u on u.id = p.id
    where p_incluir_bots or not p.eh_ficticio
  ),
  eventos as (
    select 'cadastro' as acao, pv.criado_em as data, pv.nome, pv.municipio_residencia, pv.email,
           null::text as detalhe
    from perfis_validos pv

    union all
    select 'palpite_salvo', s.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           s.nome
    from public.salvamentos s
    join perfis_validos pv on pv.id = s.perfil_id

    union all
    select 'cedula_depositada', s.depositado_em, pv.nome, pv.municipio_residencia, pv.email,
           s.nome || coalesce(' · ' || s.codigo, '')
    from public.salvamentos s
    join perfis_validos pv on pv.id = s.perfil_id
    where s.depositado_em is not null

    union all
    select 'credito_adquirido', t.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           '+' || t.valor || ' SL · ' || t.tipo
    from public.transacoes_creditos t
    join perfis_validos pv on pv.id = t.perfil_id
    where t.valor > 0

    union all
    select 'credito_utilizado', t.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           t.valor || ' SL · ' || t.tipo
    from public.transacoes_creditos t
    join perfis_validos pv on pv.id = t.perfil_id
    where t.valor < 0

    union all
    select 'duelo_cadastrado', d.criado_em, pv.nome, pv.municipio_residencia, pv.email,
           '"' || d.nome || '" · ' || d.status
    from public.desafios d
    join perfis_validos pv on pv.id = d.criador_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'acao', acao, 'data', data, 'nome', nome,
           'municipio', municipio_residencia, 'email', email, 'detalhe', detalhe
         ) order by data desc), '[]'::jsonb)
  into v_resultado
  from (select * from eventos order by data desc limit least(greatest(p_limite, 1), 1000)) ultimos;

  return v_resultado;
end;
$$;
revoke all on function public.admin_historico_acoes(integer, boolean) from public, anon;
grant execute on function public.admin_historico_acoes(integer, boolean) to authenticated;
