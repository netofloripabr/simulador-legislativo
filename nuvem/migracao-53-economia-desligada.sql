-- Migração 53 — economia SL DESLIGADA por chave (19/09/2026).
-- Decisão do usuário: não houve adesão à venda de SL, então a economia
-- inteira fica desativada — sem apagar nada. Uma tabela de configuração
-- guarda a chave; gastar_creditos e consumir_credito (os DOIS pontos por
-- onde passa toda cobrança: edição paga, termômetro, cédula extra, grupo,
-- vaga, slot de lista) devolvem "true" sem debitar nem registrar no
-- extrato enquanto economia_ativa = 'false'. Religar = trocar o valor
-- pra 'true' (e ECONOMIA_ATIVA no interface/00-estado.js).
-- Objeto verificável: tabela public.config_app.

create table if not exists public.config_app (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.config_app enable row level security;
-- qualquer um logado pode LER (a interface pode consultar no futuro);
-- só o serviço/admin escreve (nenhuma policy de escrita = ninguém via API).
drop policy if exists config_app_leitura on public.config_app;
create policy config_app_leitura on public.config_app for select to authenticated using (true);

insert into public.config_app (chave, valor) values ('economia_ativa', 'false')
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();

create or replace function public.economia_ativa()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select valor = 'true' from public.config_app where chave = 'economia_ativa'), true);
$$;

-- Mesmo corpo da migração 30, com o curto-circuito na frente.
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
  if not public.economia_ativa() then
    return true; -- economia desligada: nada é cobrado nem registrado
  end if;

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
    return false;
  end if;

  insert into public.transacoes_creditos (perfil_id, tipo, valor, saldo_apos, referencia)
  values (p_perfil_id, p_tipo, -p_quantidade, novo_saldo, nullif(trim(coalesce(p_referencia, '')), ''));
  return true;
end;
$$;
revoke all on function public.gastar_creditos(uuid, integer, text, text) from public, anon, authenticated;

-- Mesmo corpo da migração 21, com o curto-circuito na frente.
create or replace function public.consumir_credito(p_perfil_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_saldo int;
begin
  if not public.economia_ativa() then
    return true; -- economia desligada
  end if;

  insert into public.creditos_conta (perfil_id, saldo)
  values (p_perfil_id, 0)
  on conflict (perfil_id) do nothing;

  update public.creditos_conta
  set saldo = saldo - 1
  where perfil_id = p_perfil_id and saldo > 0
  returning saldo into novo_saldo;
  if novo_saldo is null then
    return false;
  end if;
  insert into public.transacoes_creditos (perfil_id, tipo, valor, saldo_apos)
  values (p_perfil_id, 'gasto', -1, novo_saldo);
  return true;
end;
$$;
