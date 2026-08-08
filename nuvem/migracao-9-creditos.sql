-- Migração 9: créditos por conta — a partir do 2º salvamento (lista) ou do
-- 2º grupo CRIADO (não conta grupo que a pessoa só entrou com código de
-- outro dono), a conta precisa de 1 crédito. Colar no SQL Editor do
-- Supabase e rodar uma vez, depois da migração 5 (listas_salvas) e da
-- migração 8 (grupos) já terem rodado.
--
-- Cobrança de verdade (Pix/cartão) está fora do escopo por enquanto — essa
-- tabela guarda só o SALDO. Quando existir pagamento de verdade, o saldo
-- passa a ser incrementado por ali; nada nesta migração precisa mudar.
--
-- IMPORTANTE (achado revisando antes de publicar): créditos NÃO podem
-- morar como coluna solta em "perfis", porque a política já existente
-- "perfis_update_proprio" (nuvem/schema.sql) deixa o dono atualizar
-- QUALQUER coluna da própria linha — incluindo uma "creditos" nova, o que
-- deixaria qualquer pessoa se dar saldo infinito só chamando
-- supabaseClient.from("perfis").update({creditos: 9999}) pelo console.
-- Por isso créditos vivem numa tabela PRÓPRIA, sem nenhuma permissão de
-- update/insert/delete concedida a "authenticated" — só a função abaixo
-- (security definer, ver mais embaixo) consegue mexer no saldo.
create table public.creditos_conta (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  saldo integer not null default 0
);

alter table public.creditos_conta enable row level security;

-- Só leitura da própria linha — nenhuma policy de insert/update/delete
-- pro authenticated de propósito (ver justificativa acima).
create policy "creditos_conta_select_proprio" on public.creditos_conta for select using (auth.uid() = perfil_id);
grant select on public.creditos_conta to authenticated;
-- Sem grant de insert/update/delete pra authenticated — só o "postgres"
-- (dono das funções abaixo, security definer) consegue escrever aqui.

-- Função que decrementa 1 crédito de forma atômica (evita corrida: duas
-- abas do mesmo usuário tentando gastar o último crédito ao mesmo tempo
-- não conseguem as duas "ganhar"). Cria a linha com saldo 0 na primeira
-- vez que a conta tenta gastar (não existe cadastro prévio de créditos
-- hoje, então toda conta nova começa em 0 implicitamente). Devolve true se
-- conseguiu consumir, false se não tinha saldo.
create or replace function public.consumir_credito(p_perfil_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  linhas_afetadas int;
begin
  insert into public.creditos_conta (perfil_id, saldo)
  values (p_perfil_id, 0)
  on conflict (perfil_id) do nothing;

  update public.creditos_conta
  set saldo = saldo - 1
  where perfil_id = p_perfil_id and saldo > 0;
  get diagnostics linhas_afetadas = row_count;
  return linhas_afetadas > 0;
end;
$$;

-- Checa "é a própria conta chamando" ANTES de rodar a função acima (que
-- roda com security definer, ignora RLS por padrão) — sem essa checagem,
-- qualquer pessoa logada poderia gastar o crédito de OUTRA conta passando
-- o id dela como parâmetro.
create or replace function public.consumir_credito_proprio(p_perfil_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() <> p_perfil_id then
    raise exception 'Só é possível consumir crédito da própria conta.';
  end if;
  return public.consumir_credito(p_perfil_id);
end;
$$;

revoke all on function public.consumir_credito(uuid) from public;
grant execute on function public.consumir_credito_proprio(uuid) to authenticated;

-- Concede crédito a uma conta — SEM cobrança real ainda, então isso só é
-- pra ser chamado manualmente por quem administra o banco (você, direto
-- no SQL Editor: select public.conceder_credito('<uuid-da-conta>', 2);) —
-- nunca pelo site. Quando existir pagamento de verdade, é essa função (ou
-- uma nova no mesmo espírito) que o processo de pagamento chamaria.
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
  return novo_saldo;
end;
$$;

-- Sem grant pra "authenticated" de propósito — só quem tem acesso direto
-- ao SQL Editor do Supabase (você) consegue chamar esta função.
--
-- FALHA ENCONTRADA E CORRIGIDA em 08/08/2026, testando ao vivo: o comentário
-- acima não bastava — o Postgres concede EXECUTE pra "PUBLIC" por padrão em
-- toda função nova, a não ser que seja revogado explicitamente (foi feito
-- pra consumir_credito acima, mas ficou faltando aqui). Sem este revoke,
-- QUALQUER conta logada conseguia rodar
-- supabaseClient.rpc("conceder_credito", {p_perfil_id: ..., p_quantidade: 999})
-- direto do console do navegador e se dar crédito infinito — exatamente o
-- problema que essa tabela separada existia pra evitar, só que por um
-- caminho diferente (RPC em vez de update direto na tabela).
revoke all on function public.conceder_credito(uuid, integer) from public, anon, authenticated;
