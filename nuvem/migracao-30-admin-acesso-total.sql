-- Migração 30: administrador tem acesso total às funções pagas —
-- decisão do usuário, 24/08/2026 ("No painel do administrador as funções
-- são desbloqueadas, como o termômetro. O administrador tem acesso
-- total."). Colar no SQL Editor do Supabase e rodar UMA vez, depois da
-- migração 29.
--
-- Toda cobrança em SL do app — Termômetro (Coringa, avulso, pacote,
-- cargo inteiro), mediana em conta-gotas, nova cédula, abrir 2º grupo,
-- criar desafio além dos grátis — passa por UM ponto só no banco:
-- gastar_creditos() (migração 22). É o único lugar que precisa mudar.
--
-- A conta admin (tabela "admins", migração 18) não tem saldo debitado
-- nem linha nova no ledger quando usa qualquer função paga: não é
-- "concedido" nem "gasto" — é o próprio administrador usando o app,
-- então não deve poluir o histórico financeiro nem a Carteira. Isso
-- também é coerente com a mudança da tela Financeiro de 24/08/2026
-- ("concedido" nunca deve virar dado de faturamento).
create or replace function public.gastar_creditos(
  p_perfil_id uuid,
  p_quantidade integer,
  p_tipo text,
  p_referencia text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_saldo int;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade a gastar precisa ser positiva.';
  end if;

  if exists (select 1 from public.admins where perfil_id = p_perfil_id) then
    return true;
  end if;

  insert into public.creditos_conta (perfil_id, saldo)
  values (p_perfil_id, 0)
  on conflict (perfil_id) do nothing;

  update public.creditos_conta
  set saldo = saldo - p_quantidade
  where perfil_id = p_perfil_id and saldo >= p_quantidade
  returning saldo into novo_saldo;
  if novo_saldo is null then
    return false; -- saldo insuficiente (nada muda, nada é registrado)
  end if;

  insert into public.transacoes_creditos (perfil_id, tipo, valor, saldo_apos, referencia)
  values (p_perfil_id, p_tipo, -p_quantidade, novo_saldo, nullif(trim(coalesce(p_referencia, '')), ''));
  return true;
end;
$$;
revoke all on function public.gastar_creditos(uuid, integer, text, text) from public, anon, authenticated;
