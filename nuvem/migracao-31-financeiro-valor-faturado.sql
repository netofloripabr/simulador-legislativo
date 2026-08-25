-- Migração 31: "valor faturado" no painel Financeiro do admin —
-- MONETIZACAO.md v3 §8 tinha "receitas" na lista mas a tela nunca
-- mostrou o valor real em R$. Colar no SQL Editor do Supabase e rodar
-- UMA vez, depois da migração 30 (e da 29, que cria pedidos_pagamento).
--
-- admin_estatisticas_creditos() precisa mudar de COLUNAS de retorno
-- (não só de corpo), então o Postgres exige apagar a função antes de
-- recriá-la com a nova assinatura.
drop function if exists public.admin_estatisticas_creditos();

create or replace function public.admin_estatisticas_creditos()
returns table (
  contas_com_credito bigint,
  total_creditos_em_circulacao bigint,
  valor_faturado_centavos bigint,
  valor_faturado_30_dias_centavos bigint,
  pedidos_aprovados bigint
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
    (select count(*) from public.creditos_conta where saldo > 0),
    (select coalesce(sum(saldo), 0) from public.creditos_conta),
    (select coalesce(sum(valor_centavos), 0) from public.pedidos_pagamento where status = 'aprovado'),
    (select coalesce(sum(valor_centavos), 0) from public.pedidos_pagamento
       where status = 'aprovado' and criado_em >= now() - interval '30 days'),
    (select count(*) from public.pedidos_pagamento where status = 'aprovado');
end;
$$;
revoke all on function public.admin_estatisticas_creditos() from public, anon;
grant execute on function public.admin_estatisticas_creditos() to authenticated;
