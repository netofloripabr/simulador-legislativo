-- Migração 43: controle de migrações (04/09/2026, item "controle de
-- migrações" da análise três lentes). Aplicada via MCP do Supabase (fica
-- registrada em supabase_migrations) — pode colar no SQL Editor também,
-- é idempotente.
--
-- Problema: 42 migrações soltas, aplicadas na mão, sem registro do que
-- já rodou — o painel chegou a perguntar "a migração 36 já rodou?". Em
-- vez de uma marcação manual (que alguém esquece), o status vem do
-- próprio banco: a aba Rotinas do painel admin manda a lista de objetos
-- que cada migração cria (nuvem/migracoes-index.js, gerado por
-- ferramentas/gerar_indice_migracoes.py) e esta função confere, um a um,
-- se existem.
--
-- Entrada: jsonb array de [num, tipo, nome], ex.:
--   [[23,"column","perfis.notif_email"],[36,"table","bots_config"]]
-- tipos: table | view | function | index | policy | trigger | column
-- Saída: uma linha por migração com total, quantos existem e a lista do
-- que falta. Só admin recebe linhas (sou_admin() da migração 18).

create or replace function public.admin_migracoes_status(p_objetos jsonb)
returns table(num int, total int, existem int, faltando text[])
language sql
security definer
set search_path = public, pg_catalog
as $$
  with o as (
    select (v->>0)::int as num, v->>1 as t, v->>2 as n
    from jsonb_array_elements(p_objetos) v
  ),
  c as (
    select num, t, n,
      case t
        when 'table'    then to_regclass('public.' || n) is not null
        when 'view'     then exists (select 1 from pg_views where schemaname = 'public' and viewname = n)
        when 'function' then exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
                                     where ns.nspname = 'public' and p.proname = n)
        when 'index'    then exists (select 1 from pg_indexes where schemaname = 'public' and indexname = n)
        when 'policy'   then exists (select 1 from pg_policies where schemaname = 'public' and policyname = n)
        when 'trigger'  then exists (select 1 from pg_trigger where tgname = n)
        when 'column'   then exists (select 1 from information_schema.columns
                                     where table_schema = 'public'
                                       and table_name = split_part(n, '.', 1)
                                       and column_name = split_part(n, '.', 2))
        else false
      end as existe
    from o
  )
  select num,
         count(*)::int as total,
         (count(*) filter (where existe))::int as existem,
         coalesce(array_agg(t || ':' || n order by t, n) filter (where not existe), '{}') as faltando
  from c
  where public.sou_admin()
  group by num
  order by num;
$$;

revoke all on function public.admin_migracoes_status(jsonb) from public;
grant execute on function public.admin_migracoes_status(jsonb) to authenticated;

notify pgrst, 'reload schema';
