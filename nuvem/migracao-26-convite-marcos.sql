-- Migração 26: convite convertido + marcos de presença (economia fase 1,
-- a peça que FECHA O CICLO — MONETIZACAO.md v3 §7). Colar no SQL Editor
-- e rodar UMA vez, depois da migração 25.
--
-- Convite convertido [DECIDIDO]: cada perfil ganha um código pessoal;
-- quem se cadastra vindo do link ?conv=CODIGO fica marcado como
-- convidado daquela conta; quando o convidado deposita a PRIMEIRA
-- cédula, o convidante ganha 10 créditos — automático, via trigger no
-- próprio depósito (cobre qualquer caminho de código).
-- Anti-fraude (checks and balances §10): premia uma vez só por
-- convidado (convite_premiado_em), auto-convite não premia, teto de 5
-- convites premiados/dia por convidante (acima disso o convidado entra
-- normal, só não gera crédito), e CPF único já é exigido no cadastro.
--
-- Marcos únicos [DECIDIDO]: 7 dias seguidos (+5), 30 dias seguidos
-- (+20), voltar na semana da eleição (+10) — cada um premia UMA vez na
-- vida da conta (chave primária composta garante no banco).

-- ========== 1. Colunas de convite no perfil ==========
alter table public.perfis
  add column if not exists convidado_por uuid references public.perfis(id),
  add column if not exists codigo_convite text unique,
  add column if not exists convite_premiado_em timestamptz;

-- Gera código pessoal pros perfis que já existem (formato SL-XXXXXX).
update public.perfis
set codigo_convite = 'SL-' || upper(substr(md5(id::text || clock_timestamp()::text), 1, 6))
where codigo_convite is null;

-- E pros novos, um trigger preenche na criação (com re-tentativa em
-- colisão — improvável com 16^6 combinações, mas barata de cobrir).
create or replace function public.gerar_codigo_convite_perfil()
returns trigger
language plpgsql
as $$
declare
  v_tentativa int := 0;
  v_codigo text;
begin
  if new.codigo_convite is not null then return new; end if;
  loop
    v_tentativa := v_tentativa + 1;
    v_codigo := 'SL-' || upper(substr(md5(new.id::text || clock_timestamp()::text || v_tentativa), 1, 6));
    exit when not exists (select 1 from public.perfis where codigo_convite = v_codigo) or v_tentativa >= 5;
  end loop;
  new.codigo_convite := v_codigo;
  return new;
end;
$$;
drop trigger if exists perfis_codigo_convite on public.perfis;
create trigger perfis_codigo_convite
  before insert on public.perfis
  for each row execute function public.gerar_codigo_convite_perfil();

-- Resolver código → id no CADASTRO (o convidado ainda é anon nesse
-- momento). Só devolve o uuid — nenhum outro dado do convidante vaza.
create or replace function public.perfil_por_codigo_convite(p_codigo text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.perfis where codigo_convite = upper(trim(p_codigo));
$$;
revoke all on function public.perfil_por_codigo_convite(text) from public;
grant execute on function public.perfil_por_codigo_convite(text) to anon, authenticated;

-- ========== 2. Concessão interna (ganhos automáticos) ==========
-- Mesmo espírito de conceder_credito (migração 9/21), mas com tipo e
-- referência do ledger parametrizados — SEM nenhum grant: só as funções
-- deste arquivo (donas do mesmo owner) chamam.
create or replace function public.conceder_creditos_interno(
  p_perfil_id uuid, p_quantidade integer, p_tipo text, p_referencia text
)
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
  values (p_perfil_id, p_tipo, greatest(0, p_quantidade), novo_saldo, p_referencia);
  return novo_saldo;
end;
$$;
revoke all on function public.conceder_creditos_interno(uuid, integer, text, text) from public, anon, authenticated;

-- ========== 3. Conversão do convite (trigger no depósito) ==========
create or replace function public.premiar_convite_no_deposito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convidante uuid;
  v_premiado timestamptz;
  v_nome_convidado text;
  v_hoje int;
begin
  select convidado_por, convite_premiado_em, nome
    into v_convidante, v_premiado, v_nome_convidado
  from public.perfis where id = new.perfil_id;

  if v_convidante is null or v_premiado is not null or v_convidante = new.perfil_id then
    return new;
  end if;

  -- Teto de 5 convites premiados por dia por convidante — acima disso o
  -- convite vale (o convidado entra normal), só não gera crédito.
  select count(*) into v_hoje
  from public.transacoes_creditos
  where perfil_id = v_convidante
    and tipo = 'ganho_convite'
    and criado_em::date = current_date;
  if v_hoje >= 5 then
    return new;
  end if;

  perform public.conceder_creditos_interno(
    v_convidante, 10, 'ganho_convite', 'convite convertido: ' || v_nome_convidado);
  update public.perfis set convite_premiado_em = now() where id = new.perfil_id;
  return new;
end;
$$;

drop trigger if exists salvamentos_convite_convertido on public.salvamentos;
create trigger salvamentos_convite_convertido
  after update of depositado_em on public.salvamentos
  for each row
  when (old.depositado_em is null and new.depositado_em is not null)
  execute function public.premiar_convite_no_deposito();

-- ========== 4. Presença e marcos únicos ==========
create table public.presenca_conta (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  ultimo_dia date,
  streak integer not null default 0
);
alter table public.presenca_conta enable row level security;
create policy "presenca_select_proprio" on public.presenca_conta
  for select using (auth.uid() = perfil_id);
grant select on public.presenca_conta to authenticated;

create table public.marcos_conquistados (
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  marco text not null,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, marco)
);
alter table public.marcos_conquistados enable row level security;
create policy "marcos_select_proprio" on public.marcos_conquistados
  for select using (auth.uid() = perfil_id);
grant select on public.marcos_conquistados to authenticated;

-- Chamada 1x por sessão logada (o app chama no boot; repetir no mesmo
-- dia é no-op). Atualiza o streak e concede os marcos que couberem —
-- a chave primária composta garante que cada marco premia UMA vez.
create or replace function public.registrar_presenca()
returns integer -- streak atual
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_ultimo date;
  v_streak int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Precisa estar logado.';
  end if;

  select ultimo_dia, streak into v_ultimo, v_streak
  from public.presenca_conta where perfil_id = v_uid for update;

  if v_ultimo is null then
    insert into public.presenca_conta (perfil_id, ultimo_dia, streak)
    values (v_uid, current_date, 1)
    on conflict (perfil_id) do update set ultimo_dia = current_date, streak = 1;
    v_streak := 1;
  elsif v_ultimo = current_date then
    -- já contou hoje
  elsif v_ultimo = current_date - 1 then
    v_streak := v_streak + 1;
    update public.presenca_conta set ultimo_dia = current_date, streak = v_streak where perfil_id = v_uid;
  else
    v_streak := 1;
    update public.presenca_conta set ultimo_dia = current_date, streak = 1 where perfil_id = v_uid;
  end if;

  -- Marcos (únicos por construção — insert falhando no conflito = já tem)
  if v_streak >= 7 then
    insert into public.marcos_conquistados (perfil_id, marco) values (v_uid, '7dias')
    on conflict do nothing;
    if found then
      perform public.conceder_creditos_interno(v_uid, 5, 'ganho_marco', '7 dias seguidos');
    end if;
  end if;
  if v_streak >= 30 then
    insert into public.marcos_conquistados (perfil_id, marco) values (v_uid, '30dias')
    on conflict do nothing;
    if found then
      perform public.conceder_creditos_interno(v_uid, 20, 'ganho_marco', '30 dias seguidos');
    end if;
  end if;
  if current_date between date '2026-09-28' and date '2026-10-04' then
    insert into public.marcos_conquistados (perfil_id, marco) values (v_uid, 'semana_eleicao')
    on conflict do nothing;
    if found then
      perform public.conceder_creditos_interno(v_uid, 10, 'ganho_marco', 'semana da eleição');
    end if;
  end if;

  return v_streak;
end;
$$;
revoke all on function public.registrar_presenca() from public, anon;
grant execute on function public.registrar_presenca() to authenticated;
