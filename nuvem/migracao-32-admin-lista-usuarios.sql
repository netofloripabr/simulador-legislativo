-- Migração 32: lista de usuários individuais no painel Financeiro/Usuários
-- do admin — MONETIZACAO.md v3 §8 e pedido do usuário, 24/08/2026 ("é
-- importante que conste a lista abaixo [do painel analítico], e eu posso
-- filtrar por categoria"). Colar no SQL Editor do Supabase e rodar UMA
-- vez, depois da migração 31.
--
-- admin_estatisticas_usuarios() (migração 18) só devolve agregados —
-- esta função nova devolve UMA LINHA POR CONTA, com os quatro filtros
-- que o usuário pediu: gênero, UF de residência, período de cadastro e
-- status de cédula (depositou ou não, em quais cargos) + tipo de conta
-- (admin / usuário final / padrão), pra separar bots/staff de gente real.
create or replace function public.admin_listar_usuarios(
  p_genero text default null,
  p_uf text default null,
  p_desde date default null,
  p_ate date default null,
  p_status_cedula text default null, -- 'depositou' | 'nao_depositou' | null (todos)
  p_tipo_conta text default null,    -- 'admin' | 'usuario_final' | 'padrao' | null (todos)
  p_limite integer default 200
)
returns table (
  id uuid,
  nome text,
  email text,
  genero text,
  uf_residencia text,
  criado_em timestamptz,
  tipo_conta text,
  cedulas_depositadas bigint,
  cargos_depositados text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select
    p.id, p.nome, u.email::text, p.genero, p.uf_residencia, p.criado_em,
    case
      when a.perfil_id is not null then 'admin'
      when uf.perfil_id is not null then 'usuario_final'
      else 'padrao'
    end,
    coalesce(dep.total, 0),
    coalesce(dep.cargos, '')
  from public.perfis p
  join auth.users u on u.id = p.id
  left join public.admins a on a.perfil_id = p.id
  left join public.usuarios_finais uf on uf.perfil_id = p.id
  left join lateral (
    select count(distinct s.id) as total, string_agg(distinct ls.cargo, ', ') as cargos
    from public.salvamentos s
    join public.listas_salvas ls on ls.salvamento_id = s.id
    where s.perfil_id = p.id and s.depositado_em is not null
  ) dep on true
  where (p_genero is null or p.genero = p_genero)
    and (p_uf is null or p.uf_residencia = p_uf)
    and (p_desde is null or p.criado_em::date >= p_desde)
    and (p_ate is null or p.criado_em::date <= p_ate)
    and (p_status_cedula is null
         or (p_status_cedula = 'depositou' and coalesce(dep.total, 0) > 0)
         or (p_status_cedula = 'nao_depositou' and coalesce(dep.total, 0) = 0))
    and (p_tipo_conta is null
         or (p_tipo_conta = 'admin' and a.perfil_id is not null)
         or (p_tipo_conta = 'usuario_final' and uf.perfil_id is not null)
         or (p_tipo_conta = 'padrao' and a.perfil_id is null and uf.perfil_id is null))
  order by p.criado_em desc
  limit least(greatest(p_limite, 1), 500);
end;
$$;
revoke all on function public.admin_listar_usuarios(text, text, date, date, text, text, integer) from public, anon;
grant execute on function public.admin_listar_usuarios(text, text, date, date, text, text, integer) to authenticated;
