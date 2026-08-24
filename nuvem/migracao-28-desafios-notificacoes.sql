-- Migração 28: Desafios 1×1, notificações e ajuste do prêmio de convite —
-- protótipos v6/v7 aprovados em 23-24/08/2026 (memória: alesc_economia_
-- creditos_sl). Colar no SQL Editor do Supabase e rodar UMA vez, depois
-- da migração 26.
--
-- Escopo desta migração:
--   1. Novos tipos no ledger (transacoes_creditos) + whitelist de gasto.
--   2. Prêmio de convite: 10 → 1 SL, teto passa de 5/dia pra 25 na vida
--      da conta (MONETIZACAO.md v3 §7, decisão de 24/08/2026 — "sua
--      preocupação era gratuidade permanente do sistema").
--   3. Tabela "desafios" (duelo 1×1 entre cédulas depositadas) + RPCs de
--      ciclo de vida (criar/aceitar/recusar/cancelar/listar-com-expiração-
--      lazy) + trigger de prêmio no aceite.
--   4. Tabela "notificacoes" + função interna de criação + triggers nos
--      eventos do desafio e do convite.
--   5. Tabela "termometro_revelacoes" (Coringa + compra avulsa/pacote de
--      votação mediana no Termômetro Eleitoral).
--
-- Fora do escopo (fica pra depois, registrado em CLAUDE.md/tarefas):
--   - Pontuação real do duelo na apuração (RANQUEAMENTO.md ainda é
--     RASCUNHO — sem isso não dá pra calcular "quem fez mais pontos").
--     Os desafios ficam em "apuração" esperando essa peça.
--   - Documento do desafio (assinatura dupla + código validável).
--   - Contas corporativas / calculadora de faixas.

-- ========== 1. Ledger: novos tipos + prêmio de convite ==========
alter table public.transacoes_creditos drop constraint if exists transacoes_creditos_tipo_check;
alter table public.transacoes_creditos add constraint transacoes_creditos_tipo_check check (tipo in (
  'gasto', 'ganho_admin', 'ajuste_admin', 'ganho_convite', 'ganho_marco', 'compra',
  'gasto_vaga', 'gasto_edicao', 'gasto_cedula', 'gasto_mediana', 'gasto_patrocinio', 'estorno',
  'gasto_desafio',       -- criar desafio além dos grátis (10 SL)
  'ganho_desafio',       -- prêmio ao 1º aceite com cada pessoa (5 SL, teto 5 na vida da conta)
  'estorno_desafio',     -- cancelado/recusado/expirado devolve o gasto
  'gasto_termometro'     -- Coringa / revelação avulsa / pacote / lista completa
));

create or replace function public.gastar_creditos_proprio(
  p_perfil_id uuid, p_quantidade integer, p_tipo text, p_referencia text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() <> p_perfil_id then
    raise exception 'Só é possível gastar créditos da própria conta.';
  end if;
  if p_tipo not in ('gasto', 'gasto_vaga', 'gasto_edicao', 'gasto_cedula', 'gasto_mediana',
                     'gasto_patrocinio', 'gasto_desafio', 'gasto_termometro') then
    raise exception 'Tipo de gasto inválido.';
  end if;
  return public.gastar_creditos(p_perfil_id, p_quantidade, p_tipo, p_referencia);
end;
$$;
revoke all on function public.gastar_creditos_proprio(uuid, integer, text, text) from public, anon;
grant execute on function public.gastar_creditos_proprio(uuid, integer, text, text) to authenticated;

-- Prêmio de convite: 10 → 1 SL, teto de 5/dia vira teto de 25 na vida da
-- conta (soma de tudo que "ganho_convite" já rendeu, não por dia).
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
  v_total_ganho int;
begin
  select convidado_por, convite_premiado_em, nome
    into v_convidante, v_premiado, v_nome_convidado
  from public.perfis where id = new.perfil_id;

  if v_convidante is null or v_premiado is not null or v_convidante = new.perfil_id then
    return new;
  end if;

  select coalesce(sum(valor), 0) into v_total_ganho
  from public.transacoes_creditos
  where perfil_id = v_convidante and tipo = 'ganho_convite';
  if v_total_ganho >= 25 then
    return new; -- teto atingido — o convite ainda vale, só não gera crédito
  end if;

  perform public.conceder_creditos_interno(
    v_convidante, 1, 'ganho_convite', 'convite convertido: ' || v_nome_convidado);
  update public.perfis set convite_premiado_em = now() where id = new.perfil_id;
  return new;
end;
$$;
-- (trigger salvamentos_convite_convertido já existe, migração 26 — a
-- função é substituída no lugar, não precisa recriar o trigger.)

-- ========== 2. Notificações ==========
create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  tipo text not null check (tipo in (
    'desafio_recebido', 'desafio_aceito', 'desafio_recusado', 'desafio_cancelado',
    'desafio_expirado', 'convite_convertido', 'termometro_abriu'
  )),
  titulo text not null,
  corpo text,
  referencia_id uuid, -- id do desafio, quando aplicável — pra "Ver desafio" levar direto
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);
create index notificacoes_perfil_idx on public.notificacoes (perfil_id, criado_em desc);

alter table public.notificacoes enable row level security;
create policy "notificacoes_select_proprio" on public.notificacoes for select using (auth.uid() = perfil_id);
create policy "notificacoes_update_proprio" on public.notificacoes for update
  using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);
grant select, update on public.notificacoes to authenticated;
-- Sem insert/delete pra authenticated: só as funções internas (security
-- definer) escrevem aqui, mesmo espírito de creditos_conta.

create or replace function public.criar_notificacao_interna(
  p_perfil_id uuid, p_tipo text, p_titulo text, p_corpo text, p_referencia_id uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notificacoes (perfil_id, tipo, titulo, corpo, referencia_id)
  values (p_perfil_id, p_tipo, p_titulo, p_corpo, p_referencia_id);
$$;
revoke all on function public.criar_notificacao_interna(uuid, text, text, text, uuid) from public, anon, authenticated;

-- Marca como lidas (some o pontinho do sino) — chamado ao abrir a Central.
create or replace function public.marcar_notificacoes_lidas()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.notificacoes set lida_em = now()
  where perfil_id = (select auth.uid()) and lida_em is null;
$$;
grant execute on function public.marcar_notificacoes_lidas() to authenticated;

create or replace function public.contar_notificacoes_nao_lidas()
returns bigint
language sql
security invoker
stable
set search_path = public
as $$
  select count(*) from public.notificacoes
  where perfil_id = (select auth.uid()) and lida_em is null;
$$;
grant execute on function public.contar_notificacoes_nao_lidas() to authenticated;

create or replace function public.listar_minhas_notificacoes(p_limite int default 30)
returns setof public.notificacoes
language sql
security invoker
stable
set search_path = public
as $$
  select * from public.notificacoes
  where perfil_id = (select auth.uid())
  order by criado_em desc
  limit p_limite;
$$;
grant execute on function public.listar_minhas_notificacoes(int) to authenticated;

-- Convite convertido também vira notificação pro convidante (mesmo
-- gatilho de prêmio — reaproveita o trigger existente, só acrescenta a
-- notificação depois que o prêmio (se houver) já foi decidido acima).
create or replace function public.notificar_convite_convertido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convidante uuid;
  v_nome_convidado text;
begin
  select convidado_por, nome into v_convidante, v_nome_convidado
  from public.perfis where id = new.perfil_id;
  if v_convidante is null or v_convidante = new.perfil_id then return new; end if;
  perform public.criar_notificacao_interna(
    v_convidante, 'convite_convertido',
    v_nome_convidado || ' entrou pelo seu convite',
    'Cédula depositada — confira se rendeu crédito na sua carteira.', null);
  return new;
end;
$$;
drop trigger if exists salvamentos_notificar_convite on public.salvamentos;
create trigger salvamentos_notificar_convite
  after update of depositado_em on public.salvamentos
  for each row
  when (old.depositado_em is null and new.depositado_em is not null)
  execute function public.notificar_convite_convertido();

-- ========== 3. Desafios ==========
create table public.desafios (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis(id) on delete cascade,
  desafiado_id uuid not null references public.perfis(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 40),
  estado text not null,
  cedula_criador_id uuid not null references public.salvamentos(id) on delete cascade,
  cedula_desafiado_id uuid references public.salvamentos(id) on delete cascade,
  custo_sl integer not null default 0 check (custo_sl >= 0),
  status text not null default 'aguardando' check (status in (
    'aguardando', 'selado', 'apuracao', 'encerrado', 'recusado', 'cancelado', 'expirado'
  )),
  pontos_criador integer,
  pontos_desafiado integer,
  vencedor_id uuid references public.perfis(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days'),
  respondido_em timestamptz,
  check (criador_id <> desafiado_id)
);
create index desafios_criador_idx on public.desafios (criador_id, criado_em desc);
create index desafios_desafiado_idx on public.desafios (desafiado_id, criado_em desc);

alter table public.desafios enable row level security;
create policy "desafios_select_participante" on public.desafios for select
  using (auth.uid() = criador_id or auth.uid() = desafiado_id);
grant select on public.desafios to authenticated;
-- Sem insert/update/delete direto — tudo passa pelas RPCs abaixo, que
-- validam cédula depositada, saldo/estoque grátis e transições de status.

-- Quantos desafios grátis ainda restam: 10 no cadastro, 1 "evapora" por
-- dia corrido (decisão de 24/08/2026 — sensação de escassez), menos os
-- que a conta já usou de graça.
create or replace function public.desafios_gratis_restantes(p_perfil_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select greatest(0,
    greatest(0, 10 - floor(extract(epoch from (now() - p.criado_em)) / 86400)::int)
    - (select count(*) from public.desafios d where d.criador_id = p_perfil_id and d.custo_sl = 0)
  )
  from public.perfis p where p.id = p_perfil_id;
$$;
revoke all on function public.desafios_gratis_restantes(uuid) from public, anon;
grant execute on function public.desafios_gratis_restantes(uuid) to authenticated;

create or replace function public.criar_desafio(p_desafiado_id uuid, p_nome text, p_cedula_id uuid)
returns public.desafios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_gratis int;
  v_custo int := 0;
  v_novo public.desafios;
begin
  if p_desafiado_id = auth.uid() then
    raise exception 'Não dá pra desafiar a própria conta.';
  end if;
  select estado into v_estado from public.salvamentos
  where id = p_cedula_id and perfil_id = auth.uid() and depositado_em is not null;
  if v_estado is null then
    raise exception 'Escolha uma cédula sua já depositada.';
  end if;

  v_gratis := public.desafios_gratis_restantes(auth.uid());
  if v_gratis <= 0 then
    if not public.gastar_creditos(auth.uid(), 10, 'gasto_desafio', 'desafio: ' || p_nome) then
      raise exception 'Saldo insuficiente — precisa de 10 SL.';
    end if;
    v_custo := 10;
  end if;

  insert into public.desafios (criador_id, desafiado_id, nome, estado, cedula_criador_id, custo_sl)
  values (auth.uid(), p_desafiado_id, trim(p_nome), v_estado, p_cedula_id, v_custo)
  returning * into v_novo;

  perform public.criar_notificacao_interna(
    p_desafiado_id, 'desafio_recebido', '"' || v_novo.nome || '"',
    (select nome from public.perfis where id = auth.uid()) || ' te desafiou.', v_novo.id);
  return v_novo;
end;
$$;
revoke all on function public.criar_desafio(uuid, text, uuid) from public, anon;
grant execute on function public.criar_desafio(uuid, text, uuid) to authenticated;

-- Aceitar: só o desafiado, só enquanto "aguardando", exige cédula
-- própria depositada. Prêmio de 5 SL ao criador no 1º aceite com CADA
-- pessoa (teto de 5 prêmios na vida da conta — decisão de 24/08/2026).
create or replace function public.aceitar_desafio(p_desafio_id uuid, p_cedula_id uuid)
returns public.desafios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios;
  v_estado_ok boolean;
  v_ja_premiado boolean;
  v_premios_dados int;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if v_d.id is null or v_d.desafiado_id <> auth.uid() then
    raise exception 'Desafio não encontrado.';
  end if;
  if v_d.status <> 'aguardando' then
    raise exception 'Este desafio não está mais disponível.';
  end if;
  if v_d.expira_em < now() then
    -- Quem tenta aceitar tarde demais é quem "cobra" a expiração, já que
    -- só o criador tem sessão própria pra rodar
    -- expirar_meus_desafios_vencidos() — sem isso a linha ficaria presa
    -- em "aguardando" pra sempre até ele revisitar a tela de Desafios.
    update public.desafios set status = 'expirado', respondido_em = now() where id = v_d.id;
    if v_d.custo_sl > 0 then
      perform public.conceder_creditos_interno(v_d.criador_id, v_d.custo_sl, 'estorno_desafio', 'expirado: ' || v_d.nome);
    end if;
    perform public.criar_notificacao_interna(
      v_d.criador_id, 'desafio_expirado', '"' || v_d.nome || '" expirou',
      case when v_d.custo_sl > 0 then 'Ninguém respondeu em 7 dias — os ' || v_d.custo_sl || ' SL voltaram.' else 'Ninguém respondeu em 7 dias.' end,
      v_d.id);
    raise exception 'Este desafio expirou — peça pro criador desafiar de novo.';
  end if;
  select exists(
    select 1 from public.salvamentos
    where id = p_cedula_id and perfil_id = auth.uid() and depositado_em is not null and estado = v_d.estado
  ) into v_estado_ok;
  if not v_estado_ok then
    raise exception 'Escolha uma cédula sua, depositada, do mesmo estado do desafio.';
  end if;

  update public.desafios
  set status = 'selado', cedula_desafiado_id = p_cedula_id, respondido_em = now()
  where id = p_desafio_id
  returning * into v_d;

  -- 1º aceite entre esse par de pessoas (nas duas direções) já rendeu?
  select exists(
    select 1 from public.desafios
    where status in ('selado','apuracao','encerrado') and id <> v_d.id
      and ((criador_id = v_d.criador_id and desafiado_id = v_d.desafiado_id)
        or (criador_id = v_d.desafiado_id and desafiado_id = v_d.criador_id))
  ) into v_ja_premiado;

  select count(*) into v_premios_dados
  from public.transacoes_creditos where perfil_id = v_d.criador_id and tipo = 'ganho_desafio';

  if not v_ja_premiado and v_premios_dados < 5 then
    perform public.conceder_creditos_interno(
      v_d.criador_id, 5, 'ganho_desafio', 'aceite de ' || (select nome from public.perfis where id = auth.uid()));
  end if;

  perform public.criar_notificacao_interna(
    v_d.criador_id, 'desafio_aceito', (select nome from public.perfis where id = auth.uid()) || ' aceitou "' || v_d.nome || '"',
    case when not v_ja_premiado and v_premios_dados < 5 then 'As duas cédulas estão congeladas até a apuração — +5 SL.'
         else 'As duas cédulas estão congeladas até a apuração.' end,
    v_d.id);
  return v_d;
end;
$$;
revoke all on function public.aceitar_desafio(uuid, uuid) from public, anon;
grant execute on function public.aceitar_desafio(uuid, uuid) to authenticated;

create or replace function public.recusar_desafio(p_desafio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if v_d.id is null or v_d.desafiado_id <> auth.uid() or v_d.status <> 'aguardando' then
    raise exception 'Desafio não encontrado ou não pode mais ser recusado.';
  end if;
  update public.desafios set status = 'recusado', respondido_em = now() where id = p_desafio_id;
  if v_d.custo_sl > 0 then
    perform public.conceder_creditos_interno(v_d.criador_id, v_d.custo_sl, 'estorno_desafio', 'recusado: ' || v_d.nome);
  end if;
  perform public.criar_notificacao_interna(
    v_d.criador_id, 'desafio_recusado', (select nome from public.perfis where id = auth.uid()) || ' recusou "' || v_d.nome || '"',
    case when v_d.custo_sl > 0 then 'Os ' || v_d.custo_sl || ' SL voltaram pra sua carteira.' else null end, v_d.id);
end;
$$;
revoke all on function public.recusar_desafio(uuid) from public, anon;
grant execute on function public.recusar_desafio(uuid) to authenticated;

-- Cancelar: só o criador, só enquanto "aguardando" (antes do aceite).
create or replace function public.cancelar_desafio(p_desafio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if v_d.id is null or v_d.criador_id <> auth.uid() or v_d.status <> 'aguardando' then
    raise exception 'Desafio não encontrado ou não pode mais ser cancelado.';
  end if;
  update public.desafios set status = 'cancelado', respondido_em = now() where id = p_desafio_id;
  if v_d.custo_sl > 0 then
    perform public.conceder_creditos_interno(auth.uid(), v_d.custo_sl, 'estorno_desafio', 'cancelado: ' || v_d.nome);
  end if;
end;
$$;
revoke all on function public.cancelar_desafio(uuid) from public, anon;
grant execute on function public.cancelar_desafio(uuid) to authenticated;

-- Contagem leve pro badge do lobby (sem puxar o payload jsonb inteiro).
create or replace function public.contar_meus_desafios_ativos()
returns bigint
language sql
security invoker
stable
set search_path = public
as $$
  select count(*) from public.desafios
  where (criador_id = (select auth.uid()) or desafiado_id = (select auth.uid()))
    and status in ('aguardando', 'selado', 'apuracao');
$$;
grant execute on function public.contar_meus_desafios_ativos() to authenticated;

-- Expiração preguiçosa (mesmo espírito de registrar_acesso_mediana): sem
-- pg_cron, quem "cobra" a passagem do tempo é a própria tela de Desafios
-- ao carregar — expira e devolve o crédito de tudo que já venceu e ainda
-- estava "aguardando", só das linhas onde o chamador é o criador (só ele
-- recebe o estorno).
create or replace function public.expirar_meus_desafios_vencidos()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_d record;
begin
  for v_d in
    select * from public.desafios
    where criador_id = auth.uid() and status = 'aguardando' and expira_em < now()
  loop
    update public.desafios set status = 'expirado', respondido_em = now() where id = v_d.id;
    if v_d.custo_sl > 0 then
      perform public.conceder_creditos_interno(auth.uid(), v_d.custo_sl, 'estorno_desafio', 'expirado: ' || v_d.nome);
    end if;
    perform public.criar_notificacao_interna(
      auth.uid(), 'desafio_expirado', '"' || v_d.nome || '" expirou',
      case when v_d.custo_sl > 0 then 'Ninguém respondeu em 7 dias — os ' || v_d.custo_sl || ' SL voltaram.' else 'Ninguém respondeu em 7 dias.' end,
      v_d.id);
  end loop;
end;
$$;
grant execute on function public.expirar_meus_desafios_vencidos() to authenticated;

-- ========== 4. Termômetro — revelações pagas (Coringa e afins) ==========
create table public.termometro_revelacoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  estado text not null,
  cargo text not null check (cargo in ('estadual','federal','senador')),
  chave_candidato text not null,
  raridade text check (raridade in ('comum','especial','raro')), -- só quando veio do Coringa
  expira_em timestamptz, -- null = definitivo
  criado_em timestamptz not null default now(),
  unique (perfil_id, estado, cargo, chave_candidato)
);
alter table public.termometro_revelacoes enable row level security;
create policy "termometro_revelacoes_select_proprio" on public.termometro_revelacoes
  for select using (auth.uid() = perfil_id);
grant select on public.termometro_revelacoes to authenticated;

create or replace function public.listar_minhas_revelacoes(p_estado text, p_cargo text)
returns setof public.termometro_revelacoes
language sql
security invoker
stable
set search_path = public
as $$
  select * from public.termometro_revelacoes
  where perfil_id = (select auth.uid()) and estado = p_estado and cargo = p_cargo
    and (expira_em is null or expira_em > now());
$$;
grant execute on function public.listar_minhas_revelacoes(text, text) to authenticated;

-- Revela candidatos específicos (custo já debitado no client via
-- gastar_creditos_proprio antes de chamar esta função — ver
-- revelarCandidatosTermometro em nuvem/palpites.js).
create or replace function public.revelar_candidatos_termometro(
  p_estado text, p_cargo text, p_chaves text[], p_dias int default null, p_raridade text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_expira timestamptz := case when p_dias is null then null else now() + (p_dias || ' days')::interval end;
begin
  insert into public.termometro_revelacoes (perfil_id, estado, cargo, chave_candidato, expira_em, raridade)
  select auth.uid(), p_estado, p_cargo, chave, v_expira, p_raridade
  from unnest(p_chaves) as chave
  on conflict (perfil_id, estado, cargo, chave_candidato)
  do update set expira_em = excluded.expira_em, criado_em = now();
end;
$$;
revoke all on function public.revelar_candidatos_termometro(text, text, text[], int, text) from public, anon;
grant execute on function public.revelar_candidatos_termometro(text, text, text[], int, text) to authenticated;
