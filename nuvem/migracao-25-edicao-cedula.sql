-- Migração 25: edição progressiva de cédula depositada (economia fase 1,
-- etapa 6 — MONETIZACAO.md v3 §6). Colar no SQL Editor e rodar UMA vez,
-- depois da migração 24.
--
-- A regra [DECIDIDA]: cédula depositada é travada, mas pode ser editada
-- até 3 vezes com custo PROGRESSIVO — 1ª edição 20 créditos, 2ª 35,
-- 3ª 50. Esgotou as 3? Só depositando nova cédula (70, gate da etapa 3).
-- Toda edição fica marcada (editada_em) e visível — pagar destrava a
-- ação, não apaga o histórico (checks and balances §10.4).
--
-- Limitação conhecida (registrada de propósito): a cobrança e o contador
-- são do servidor, mas o BLOQUEIO de update da lista depositada ainda é
-- da interface — endurecer a policy de update pra exigir a "janela de
-- edição" fica pra uma migração futura, junto com a marca nas views
-- públicas (mediana/grupo).

alter table public.salvamentos
  add column if not exists edicoes integer not null default 0;
alter table public.salvamentos
  add column if not exists editada_em timestamptz;

-- Cobra a próxima edição e registra. Devolve o número da edição feita
-- (1, 2 ou 3); NULL = saldo insuficiente (nada muda). Limite de 3 e
-- demais violações viram exception com mensagem amigável.
create or replace function public.editar_cedula_depositada(p_salvamento_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_dono uuid;
  v_depositado timestamptz;
  v_edicoes int;
  v_custo int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Precisa estar logado.';
  end if;

  select perfil_id, depositado_em, edicoes
    into v_dono, v_depositado, v_edicoes
  from public.salvamentos where id = p_salvamento_id for update;
  if v_dono is null then
    raise exception 'Cédula não encontrada.';
  end if;
  if v_dono <> v_uid then
    raise exception 'Só o dono pode editar a própria cédula.';
  end if;
  if v_depositado is null then
    raise exception 'Essa lista ainda está em aberto — edita direto, sem custo.';
  end if;
  if v_edicoes >= 3 then
    raise exception 'Limite de 3 edições atingido — pra mudar de novo, deposite uma nova cédula.';
  end if;

  v_custo := case v_edicoes when 0 then 20 when 1 then 35 else 50 end;
  if not public.gastar_creditos(v_uid, v_custo, 'gasto_edicao',
    (v_edicoes + 1) || 'ª edição da cédula') then
    return null;
  end if;

  update public.salvamentos
  set edicoes = v_edicoes + 1, editada_em = now()
  where id = p_salvamento_id;
  return v_edicoes + 1;
end;
$$;
revoke all on function public.editar_cedula_depositada(uuid) from public, anon;
grant execute on function public.editar_cedula_depositada(uuid) to authenticated;
