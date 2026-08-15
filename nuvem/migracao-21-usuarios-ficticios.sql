-- Migração 21: base pros 155 usuários fictícios de "cold start" do Quadro
-- de Médias — especificação de produto fechada em 08/08/2026 (memória:
-- alesc_155_usuarios_ficticios), mecanismo técnico fechado em 15/08/2026.
--
-- Fictícios são contas REAIS e PERMANENTES no Supabase (mesmo padrão das
-- 10 contas de teste usadas em 08/08/2026), que preenchem só a tabela
-- "palpites" (rascunho ao vivo, migração 6/7 — o que alimenta o Quadro de
-- Médias) com uma variação de até ±20% por candidato em cima de uma
-- lista de referência (o palpite real do usuário). NÃO depositam cédula
-- (não entram em "salvamentos"/Ranking) — decisão de escopo de 15/08/2026,
-- pra não precisar simular o fluxo inteiro de depósito.
--
-- "Efeito boot": cada cédula DEPOSITADA por uma conta real (não-fictícia)
-- cancela 1 fictício da média pública, do índice mais alto pro mais baixo
-- — ao longo do tempo, depósitos reais suficientes zeram a influência
-- fictícia por completo. Colar no SQL Editor do Supabase e rodar uma vez.

alter table public.perfis add column if not exists eh_ficticio boolean not null default false;
alter table public.perfis add column if not exists indice_ficticio smallint;
create unique index if not exists perfis_indice_ficticio_idx
  on public.perfis (indice_ficticio) where indice_ficticio is not null;

-- Conta quantas cédulas foram depositadas por contas REAIS (não-fictícias)
-- — é o número que decide quantos fictícios já foram "cancelados". Security
-- definer porque salvamentos/perfis têm RLS que só deixa cada um ler a
-- própria linha; aqui só expomos uma contagem agregada, sem dado
-- individual, então não precisa checar admin (mesmo espírito de menor
-- privilégio, mas sem risco de vazar nada sensível).
create or replace function public.contagem_depositos_reais()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from public.salvamentos s
  join public.perfis p on p.id = s.perfil_id
  where s.depositado_em is not null and not p.eh_ficticio;
$$;
revoke all on function public.contagem_depositos_reais() from public;
grant execute on function public.contagem_depositos_reais() to anon, authenticated;

-- rascunhos_publicos (migração 7) passa a filtrar os fictícios já
-- "cancelados": indice_ficticio 155 é cancelado primeiro, depois 154, e
-- assim por diante — sobrevivem só os índices <= (155 - depósitos reais).
-- Contas reais (eh_ficticio = false) nunca são filtradas por essa regra.
create or replace view public.rascunhos_publicos as
select
  pl.perfil_id,
  pp.nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pl.rascunho_estadual,
  pl.rascunho_federal,
  pl.rascunho_senador,
  pl.atualizado_em
from public.palpites pl
join public.perfis_publicos pp on pp.id = pl.perfil_id
join public.perfis p on p.id = pl.perfil_id
where not p.eh_ficticio
   or p.indice_ficticio <= (155 - public.contagem_depositos_reais());

grant select on public.rascunhos_publicos to anon, authenticated;
