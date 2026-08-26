-- Migração 34: desafiar por código de usuário, sem precisar estar no
-- mesmo grupo — pedido do usuário 25/08/2026 ("não preciso de amigo no
-- grupo pra duelar, preciso do código de usuário dele"). Colar no SQL
-- Editor do Supabase e rodar UMA vez, depois da migração 33.
--
-- Reaproveita o código pessoal que já existe (perfis.codigo_convite,
-- formato SL-XXXXXX, migração 26) — não cria um código novo só pra
-- desafio. A diferença pra perfil_por_codigo_convite (que só devolve o
-- uuid, pensada pro cadastro de um visitante anônimo) é que esta função
-- também devolve o NOME, pra tela de "Criar desafio" confirmar quem é
-- antes de enviar — por isso authenticated só, não anon.
create or replace function public.perfil_publico_por_codigo(p_codigo text)
returns table(id uuid, nome text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.nome
  from public.perfis p
  where p.codigo_convite = upper(trim(p_codigo));
$$;
revoke all on function public.perfil_publico_por_codigo(text) from public, anon;
grant execute on function public.perfil_publico_por_codigo(text) to authenticated;
