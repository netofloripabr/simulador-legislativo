-- Migração 35: revelação do Termômetro atômica (débito + revelação numa
-- transação só). Colar no SQL Editor e rodar UMA vez, depois da migração 28.
--
-- POR QUE EXISTE (achado na varredura de comportamento, 28/08/2026)
-- --------------------------------------------------------------------
-- revelarCandidatosTermometro (nuvem/termometro.js) fazia duas chamadas
-- separadas: primeiro gastar_creditos_proprio (debita de verdade), depois
-- revelar_candidatos_termometro (insere a revelação). Se a segunda falhasse
-- por qualquer motivo transitório — rede, RPC fora do ar —, o crédito já
-- tinha saído da conta e nada foi revelado, sem estorno automático. O
-- próprio texto de erro já admitia isso: "Crédito debitado, mas a
-- revelação falhou — fale com o suporte".
--
-- Esta função junta as duas coisas dentro de UMA função PL/pgSQL: se
-- qualquer parte falhar (saldo insuficiente, erro no insert), a exceção
-- desfaz a transação inteira — o crédito nunca sai da conta sem a
-- revelação acontecer junto. Não precisa de lógica de estorno no cliente.

create or replace function public.revelar_candidatos_termometro_pago(
  p_estado text, p_cargo text, p_chaves text[], p_custo integer,
  p_tipo text, p_referencia text default null,
  p_dias int default null, p_raridade text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expira timestamptz := case when p_dias is null then null else now() + (p_dias || ' days')::interval end;
  v_gastou boolean;
begin
  if p_tipo <> 'gasto_termometro' then
    raise exception 'Tipo de gasto inválido pra esta função.';
  end if;

  v_gastou := public.gastar_creditos_proprio(auth.uid(), p_custo, p_tipo, p_referencia);
  if not v_gastou then
    raise exception 'Saldo insuficiente.';
  end if;

  insert into public.termometro_revelacoes (perfil_id, estado, cargo, chave_candidato, expira_em, raridade)
  select auth.uid(), p_estado, p_cargo, chave, v_expira, p_raridade
  from unnest(p_chaves) as chave
  on conflict (perfil_id, estado, cargo, chave_candidato)
  do update set expira_em = excluded.expira_em, criado_em = now();
end;
$$;
revoke all on function public.revelar_candidatos_termometro_pago(text, text, text[], integer, text, text, int, text) from public, anon;
grant execute on function public.revelar_candidatos_termometro_pago(text, text, text[], integer, text, text, int, text) to authenticated;
