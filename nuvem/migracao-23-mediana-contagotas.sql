-- Migração 23: mediana em conta-gotas (economia fase 1, etapa 4 —
-- MONETIZACAO.md v3 §4, mecânica definida pelo usuário). Colar no SQL
-- Editor e rodar UMA vez, depois da migração 22.
--
-- A regra: o quadro da Mediana revela 2 linhas de candidato por DIA DE
-- ACESSO (cumulativo, nunca zera) — voltar todo dia dá informação, não
-- moeda (anti-farm por natureza). Créditos aceleram: 2 créditos = +10
-- linhas (gasto_mediana no ledger). Pós-eleição o app libera tudo
-- (regra de exibição, na interface — o contador aqui continua íntegro).
--
-- As duas funções usam auth.uid() DIRETO (sem parâmetro de perfil): não
-- existe como acessar/acelerar a revelação de outra conta, nem passando
-- id alheio.

create table public.mediana_revelacao (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  linhas_reveladas integer not null default 0,
  ultimo_dia date
);

alter table public.mediana_revelacao enable row level security;
create policy "mediana_select_proprio" on public.mediana_revelacao
  for select using (auth.uid() = perfil_id);
grant select on public.mediana_revelacao to authenticated;
-- Sem grants de escrita — só as funções abaixo mexem.

-- Registra o dia de acesso: +2 linhas no primeiro acesso de cada dia
-- (idempotente — chamadas repetidas no mesmo dia devolvem o mesmo
-- número). Devolve o total de linhas reveladas da conta.
create or replace function public.registrar_acesso_mediana()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_linhas int;
begin
  v_perfil := auth.uid();
  if v_perfil is null then
    raise exception 'Precisa estar logado.';
  end if;

  insert into public.mediana_revelacao (perfil_id, linhas_reveladas, ultimo_dia)
  values (v_perfil, 2, current_date)
  on conflict (perfil_id) do update
    set linhas_reveladas = public.mediana_revelacao.linhas_reveladas
          + case when public.mediana_revelacao.ultimo_dia is distinct from current_date then 2 else 0 end,
        ultimo_dia = current_date
  returning linhas_reveladas into v_linhas;
  return v_linhas;
end;
$$;
revoke all on function public.registrar_acesso_mediana() from public, anon;
grant execute on function public.registrar_acesso_mediana() to authenticated;

-- Acelera: 2 créditos = +10 linhas. Devolve o novo total, ou NULL se o
-- saldo era insuficiente (nada muda, nada é registrado nesse caso — o
-- débito e a linha do ledger acontecem dentro de gastar_creditos, da
-- migração 22, na mesma transação do incremento).
create or replace function public.acelerar_mediana()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_linhas int;
begin
  v_perfil := auth.uid();
  if v_perfil is null then
    raise exception 'Precisa estar logado.';
  end if;

  if not public.gastar_creditos(v_perfil, 2, 'gasto_mediana', 'acelerar mediana (+10 linhas)') then
    return null;
  end if;

  insert into public.mediana_revelacao (perfil_id, linhas_reveladas, ultimo_dia)
  values (v_perfil, 12, current_date) -- 2 do dia + 10 da aceleração, se for o 1º acesso da vida
  on conflict (perfil_id) do update
    set linhas_reveladas = public.mediana_revelacao.linhas_reveladas + 10
  returning linhas_reveladas into v_linhas;
  return v_linhas;
end;
$$;
revoke all on function public.acelerar_mediana() from public, anon;
grant execute on function public.acelerar_mediana() to authenticated;
