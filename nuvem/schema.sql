-- Schema do modo "Prospecção Coletiva" — colar tudo isto no SQL Editor do
-- Supabase (painel do projeto -> SQL Editor -> colar -> Run) e rodar uma vez.
--
-- O que isso cria:
--   perfis              -- 1 linha por pessoa cadastrada (nome, escopo, privacidade)
--   palpites            -- 1 linha por pessoa, com a previsão completa (jsonb)
--   perfis_publicos     -- versão de "perfis" que esconde o nome de quem pediu anonimato
--   palpites_publicos   -- palpites já cruzados com o nome (ou "Participante anônimo")
--
-- Ver PROJETO.md (ponto em aberto #1, resolvido como assunção de trabalho) para
-- o motivo de "palpites" ter leitura pública mas "perfis" não.

-- ========== PERFIS ==========
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) > 0),
  escopo text not null check (escopo in ('partido','assembleia')),
  -- lista precisa bater com os nomes de partido em dados/base-2022.js.
  -- se um dia renomear um partido lá, atualize este CHECK também (rode de novo aqui).
  partido_escopo text check (
    (escopo = 'assembleia' and partido_escopo is null)
    or (escopo = 'partido' and partido_escopo in (
      'PL','MDB','PT','PSD','Podemos','União Brasil','PP',
      'PSDB','PTB','PSOL','Novo','PDT','Republicanos'
    ))
  ),
  modo_preenchimento text not null default 'detalhado' check (modo_preenchimento in ('detalhado','simplificado')),
  mostrar_nome boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "perfis_select_proprio" on public.perfis for select using (auth.uid() = id);
create policy "perfis_insert_proprio" on public.perfis for insert with check (auth.uid() = id);
create policy "perfis_update_proprio" on public.perfis for update using (auth.uid() = id) with check (auth.uid() = id);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.perfis to authenticated;

-- ========== PALPITES ==========
-- 1 palpite por pessoa (perfil_id é a própria chave primária — upsert simples).
create table public.palpites (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  -- candidatos: array de partidos no mesmo formato de state.parties (cloneBase(),
  -- ver calculo/eleitoral.js), cada candidato carregando também "chave" (slug
  -- estável nome+partido, ver chaveCandidato() em nuvem/palpites.js) — o "id"
  -- gerado no navegador (candSeq) NÃO é estável entre sessões/pessoas diferentes,
  -- por isso não pode ser usado pra comparar/agregar candidatos entre palpites.
  candidatos jsonb not null,
  atualizado_em timestamptz not null default now()
);

alter table public.palpites enable row level security;

-- leitura pública: por decisão de produto, palpites são abertos (sem "revelar")
create policy "palpites_select_publico" on public.palpites for select using (true);
create policy "palpites_insert_proprio" on public.palpites for insert with check (auth.uid() = perfil_id);
create policy "palpites_update_proprio" on public.palpites for update using (auth.uid() = perfil_id) with check (auth.uid() = perfil_id);

grant select on public.palpites to anon, authenticated;
grant insert, update on public.palpites to authenticated;

-- ========== VIEWS PÚBLICAS ==========
-- Views do Postgres rodam com o privilégio de quem as criou (aqui, o SQL Editor
-- do Supabase, que ignora RLS) — não com o privilégio de quem consulta. Por isso
-- esta view consegue ler "perfis" inteira mesmo com RLS travando o acesso direto,
-- e decide o que expor: mascara o nome quando mostrar_nome = false.
create view public.perfis_publicos as
select
  id,
  case when mostrar_nome then nome else 'Participante anônimo' end as nome_exibicao,
  escopo,
  partido_escopo,
  modo_preenchimento,
  mostrar_nome
from public.perfis;

grant select on public.perfis_publicos to anon, authenticated;

create view public.palpites_publicos as
select
  pp.id as perfil_id,
  pp.nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pp.modo_preenchimento,
  pl.candidatos,
  pl.atualizado_em
from public.palpites pl
join public.perfis_publicos pp on pp.id = pl.perfil_id;

grant select on public.palpites_publicos to anon, authenticated;
