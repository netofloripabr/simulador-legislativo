-- Migração 22: corrige um bug real no Painel do administrador, aba
-- "Problemas" — achado em revisão de código em 15/08/2026, antes do
-- primeiro teste com admin de verdade.
--
-- adminListarProblemas() (nuvem/autenticacao.js) faz
-- select("*, perfis(nome)") em problemas_reportados — o embed de
-- "perfis" respeita a RLS da própria tabela "perfis"
-- (perfis_select_proprio: só auth.uid() = id), que NÃO tem exceção pra
-- admin. Resultado: mesmo um admin de verdade (que pode ler TODOS os
-- problemas via a policy de problemas_reportados) só enxergaria o nome
-- de quem reportou nos problemas que ELE MESMO reportou — todos os
-- outros vinham com perfis:null, virando "—" na tela. Não dava pra
-- perceber isso testando com dado fake (não passa pela RLS de verdade).
--
-- Corrigido com uma função security definer (mesmo padrão das outras
-- funções de admin, migração 18) que já devolve o nome pronto, sem
-- depender de embed cross-tabela sujeito a RLS. Colar no SQL Editor do
-- Supabase e rodar uma vez, depois da migração 18.
create or replace function public.admin_listar_problemas(p_status text default null)
returns table (
  id uuid,
  perfil_id uuid,
  nome text,
  mensagem text,
  tela text,
  status text,
  criado_em timestamptz,
  resolvido_em timestamptz
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
  select pr.id, pr.perfil_id, p.nome, pr.mensagem, pr.tela, pr.status, pr.criado_em, pr.resolvido_em
  from public.problemas_reportados pr
  join public.perfis p on p.id = pr.perfil_id
  where p_status is null or pr.status = p_status
  order by pr.criado_em desc;
end;
$$;
revoke all on function public.admin_listar_problemas(text) from public, anon;
grant execute on function public.admin_listar_problemas(text) to authenticated;

-- Achado junto (skill Supabase Postgres Best Practices): problemas_reportados
-- tinha índice em (status, criado_em) mas nenhum em perfil_id — chave
-- estrangeira nunca é indexada automaticamente pelo Postgres, e essa
-- função faz JOIN direto nela (e "on delete cascade" também usa isso pra
-- apagar em cascata se um perfil for excluído).
create index if not exists problemas_reportados_perfil_id_idx
  on public.problemas_reportados (perfil_id);
