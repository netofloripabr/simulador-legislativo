-- Migração 21: ledger de créditos + concessão pelo painel do admin.
-- Economia fase 1, etapas 1-2 (MONETIZACAO.md v3, autorizado em
-- 19/08/2026). Colar no SQL Editor do Supabase e rodar UMA vez, depois
-- das migrações 9 (creditos_conta) e 18 (admins/sou_admin).
--
-- O que entra aqui:
--   1. transacoes_creditos — extrato imutável: NENHUM saldo muda sem
--      linha aqui (checks and balances §10.3 do MONETIZACAO.md).
--   2. consumir_credito/conceder_credito passam a registrar no ledger
--      (mesmas assinaturas, ninguém que chama precisa mudar).
--   3. admin_conceder_creditos_por_email — o admin concede/ajusta
--      créditos DE DENTRO DO APP (aba Créditos e Financeiro), achando a
--      conta pelo e-mail. Ferramenta dos "jogadores base".
--   4. admin_extrato_geral / admin_saldos — leitura administrativa.
--
-- Mesmo padrão de segurança das migrações 9/18: tabela sem NENHUM grant
-- de escrita pra authenticated; toda mutação via security definer; toda
-- função admin checa sou_admin() na entrada; revoke explícito de PUBLIC
-- em toda função nova (lição da falha achada em 08/08/2026 na migração 9).

-- ========== 1. Ledger ==========
create table public.transacoes_creditos (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null check (tipo in (
    'gasto',            -- consumo genérico atual (2ª lista / 2º grupo)
    'ganho_admin',      -- concedido pelo admin (app ou SQL Editor)
    'ajuste_admin',     -- remoção/correção pelo admin (valor negativo)
    'ganho_convite',    -- fase 1 (gancho futuro)
    'ganho_marco',      -- fase 1 (gancho futuro)
    'compra',           -- fase 2 (gancho futuro)
    'gasto_vaga', 'gasto_edicao', 'gasto_cedula', 'gasto_mediana',
    'gasto_patrocinio', 'estorno'
  )),
  valor integer not null,        -- com sinal: + entra, - sai
  saldo_apos integer not null,   -- saldo da conta DEPOIS desta linha
  referencia text,               -- motivo/vínculo (id de convite, "sql-editor"...)
  criado_em timestamptz not null default now()
);
create index transacoes_creditos_perfil_idx
  on public.transacoes_creditos (perfil_id, criado_em desc);

alter table public.transacoes_creditos enable row level security;

-- Cada um lê o próprio extrato; admin lê tudo. Escrita: NINGUÉM direto
-- (nem admin) — só as funções security definer abaixo inserem, e nada
-- nunca atualiza/apaga (extrato imutável por construção).
create policy "transacoes_select_proprio_ou_admin" on public.transacoes_creditos
  for select using (auth.uid() = perfil_id or public.sou_admin());
grant select on public.transacoes_creditos to authenticated;

-- Admin também precisa ver os saldos de todo mundo (migração 9 só deixava
-- cada um ver o próprio):
create policy "creditos_conta_select_admin" on public.creditos_conta
  for select using (public.sou_admin());

-- ========== 2. Funções existentes passam a escrever no ledger ==========
-- Mesmas assinaturas e retornos das versões da migração 9 — só ganham a
-- linha de extrato. Quem já chama (consumir_credito_proprio, você no SQL
-- Editor) continua funcionando igual.
create or replace function public.consumir_credito(p_perfil_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_saldo int;
begin
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

create or replace function public.conceder_credito(p_perfil_id uuid, p_quantidade integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_saldo int;
begin
  insert into public.creditos_conta (perfil_id, saldo)
  values (p_perfil_id, greatest(0, p_quantidade))
  on conflict (perfil_id) do update set saldo = public.creditos_conta.saldo + greatest(0, p_quantidade)
  returning saldo into novo_saldo;
  insert into public.transacoes_creditos (perfil_id, tipo, valor, saldo_apos, referencia)
  values (p_perfil_id, 'ganho_admin', greatest(0, p_quantidade), novo_saldo, 'sql-editor');
  return novo_saldo;
end;
$$;
-- (revokes/grants dessas duas já foram feitos na migração 9 e valem pro
-- CREATE OR REPLACE — Postgres preserva ACL da função substituída.)

-- ========== 3. Concessão pelo app (aba do admin), por e-mail ==========
-- p_quantidade pode ser negativa (ajuste/correção) — o saldo nunca fica
-- abaixo de zero: remove-se no máximo o que a conta tem, e a linha do
-- ledger registra o valor efetivamente aplicado.
create or replace function public.admin_conceder_creditos_por_email(
  p_email text,
  p_quantidade integer,
  p_motivo text default null
)
returns table (nome text, novo_saldo integer, aplicado integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_nome text;
  v_saldo_atual int;
  v_aplicado int;
  v_novo int;
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  if p_quantidade = 0 or p_quantidade is null then
    raise exception 'Quantidade precisa ser diferente de zero.';
  end if;

  select u.id into v_perfil
  from auth.users u
  where lower(u.email) = lower(trim(p_email));
  if v_perfil is null then
    raise exception 'Nenhuma conta com esse e-mail.';
  end if;

  select p.nome into v_nome from public.perfis p where p.id = v_perfil;
  if v_nome is null then
    raise exception 'Conta existe mas ainda não completou o cadastro (sem perfil).';
  end if;

  insert into public.creditos_conta (perfil_id, saldo)
  values (v_perfil, 0)
  on conflict (perfil_id) do nothing;

  select saldo into v_saldo_atual from public.creditos_conta
  where perfil_id = v_perfil for update;

  v_aplicado := greatest(p_quantidade, -v_saldo_atual); -- piso zero
  v_novo := v_saldo_atual + v_aplicado;

  update public.creditos_conta set saldo = v_novo where perfil_id = v_perfil;

  insert into public.transacoes_creditos (perfil_id, tipo, valor, saldo_apos, referencia)
  values (
    v_perfil,
    case when v_aplicado >= 0 then 'ganho_admin' else 'ajuste_admin' end,
    v_aplicado, v_novo, nullif(trim(coalesce(p_motivo, '')), '')
  );

  return query select v_nome, v_novo, v_aplicado;
end;
$$;
revoke all on function public.admin_conceder_creditos_por_email(text, integer, text) from public, anon;
grant execute on function public.admin_conceder_creditos_por_email(text, integer, text) to authenticated;

-- ========== 4. Leituras administrativas ==========
-- Extrato geral com nome e e-mail (e-mail mora em auth.users, que o
-- cliente nunca lê direto — só via esta função, que exige admin).
create or replace function public.admin_extrato_geral(p_limite integer default 50)
returns table (
  criado_em timestamptz, nome text, email text, tipo text,
  valor integer, saldo_apos integer, referencia text
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
  select t.criado_em, p.nome, u.email::text, t.tipo, t.valor, t.saldo_apos, t.referencia
  from public.transacoes_creditos t
  join public.perfis p on p.id = t.perfil_id
  join auth.users u on u.id = t.perfil_id
  order by t.criado_em desc
  limit least(greatest(p_limite, 1), 200);
end;
$$;
revoke all on function public.admin_extrato_geral(integer) from public, anon;
grant execute on function public.admin_extrato_geral(integer) to authenticated;

create or replace function public.admin_saldos(p_limite integer default 100)
returns table (nome text, email text, saldo integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sou_admin() then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select p.nome, u.email::text, c.saldo
  from public.creditos_conta c
  join public.perfis p on p.id = c.perfil_id
  join auth.users u on u.id = c.perfil_id
  where c.saldo > 0
  order by c.saldo desc
  limit least(greatest(p_limite, 1), 500);
end;
$$;
revoke all on function public.admin_saldos(integer) from public, anon;
grant execute on function public.admin_saldos(integer) to authenticated;
