-- Migração 22: limites do grátis (economia fase 1, etapa 3 —
-- MONETIZACAO.md v3 §3). Colar no SQL Editor e rodar UMA vez, depois da
-- migração 21 (ledger).
--
-- O que entra:
--   1. gastar_creditos — débito de N créditos de uma vez (a migração 9 só
--      tirava 1): abrir 2º grupo custa 10, nova cédula custa 70.
--   2. grupos.capacidade (default 5 = "grupo básico de 5 pessoas") +
--      trigger que impede entrar em grupo cheio — regra no SERVIDOR, não
--      só na tela (checks and balances §10.5: cliente nunca é a fonte).
--
-- Grupos que já existirem com mais de 5 membros não são tocados — o
-- trigger só barra ENTRADAS novas acima da capacidade.

-- ========== 1. Gasto de N créditos (atômico, com ledger) ==========
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

-- Mesmo padrão de consumir_credito_proprio (migração 9): a versão
-- exposta checa "é a própria conta" antes de delegar.
create or replace function public.gastar_creditos_proprio(
  p_perfil_id uuid,
  p_quantidade integer,
  p_tipo text,
  p_referencia text default null
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
  -- Só tipos de GASTO do ledger — impede usar esta rota pra registrar
  -- linhas de ganho falsas (o check da tabela já barraria valor positivo,
  -- mas aqui a intenção fica explícita).
  if p_tipo not in ('gasto', 'gasto_vaga', 'gasto_edicao', 'gasto_cedula', 'gasto_mediana', 'gasto_patrocinio') then
    raise exception 'Tipo de gasto inválido.';
  end if;
  return public.gastar_creditos(p_perfil_id, p_quantidade, p_tipo, p_referencia);
end;
$$;
revoke all on function public.gastar_creditos_proprio(uuid, integer, text, text) from public, anon;
grant execute on function public.gastar_creditos_proprio(uuid, integer, text, text) to authenticated;

-- ========== 2. Capacidade do grupo (básico = 5) ==========
alter table public.grupos
  add column if not exists capacidade integer not null default 5;

-- Entrada em grupo cheio é barrada no banco — a tela mostra a mensagem
-- amigável, mas a regra vale até pra quem chamar a API direto.
create or replace function public.checar_capacidade_grupo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membros int;
  v_capacidade int;
begin
  select count(*) into v_membros from public.grupo_membros where grupo_id = new.grupo_id;
  select capacidade into v_capacidade from public.grupos where id = new.grupo_id;
  if v_membros >= coalesce(v_capacidade, 5) then
    raise exception 'Grupo cheio — o dono pode ampliar as vagas.';
  end if;
  return new;
end;
$$;

drop trigger if exists grupo_membros_capacidade on public.grupo_membros;
create trigger grupo_membros_capacidade
  before insert on public.grupo_membros
  for each row execute function public.checar_capacidade_grupo();
