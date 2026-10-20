-- Migração 71 (20/10/2026): painel Gabinete · Controle de Recursos.
-- Dados PRIVADOS do gabinete (indicações, demandas, contatos, observações). Os dados públicos das
-- emendas (Portal da Transparência e painel da SEF) ficam em arquivos estáticos (dados/gabinete/),
-- nunca aqui. Cada linha tem um dono: hoje só o administrador acessa; no futuro, cada usuário terá
-- o próprio repositório (mesma tabela, filtrada pelo dono).
-- Capacidade: ~400 recursos + ~650 demandas ≈ 1 MB.

create or replace function public.gab_pode() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where perfil_id = (select auth.uid()));
$$;
revoke all on function public.gab_pode() from public, anon;
grant execute on function public.gab_pode() to authenticated;

create table if not exists public.gab_recursos (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ano int,
  origem text,                 -- Emenda impositiva, adicional 55%, excesso, bancada regional, convênio simplificado...
  numero text,                 -- nº da emenda como na planilha (3464)
  chave text,                  -- AAAA-NNNNNN: liga com os dados públicos
  municipio text,
  regiao text,                 -- associação de municípios
  beneficiario text,           -- Município, Entidade, Estado
  objeto text,
  funcao text,                 -- FUNDAM, Saúde, Educação
  modalidade text,             -- TE, CO, CS, ED, Outros
  valor numeric(14,2),
  status_manual text,          -- status digitado (emojis da planilha), mantido como histórico
  info_pl text,
  processo text,               -- SCC
  observacao text,
  tags text[],
  orientacao text,
  publicacao text,             -- portaria
  empenho text, liquidacao text, pagamento text, ob text, data_pagamento date,
  origem_planilha int,         -- nº da linha (coluna f) na planilha importada
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists gab_recursos_dono on public.gab_recursos (dono, ano);
create index if not exists gab_recursos_chave on public.gab_recursos (chave);

create table if not exists public.gab_demandas (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ano int,
  municipio text,
  regiao text,
  valor numeric(14,2),
  objeto text,
  demandante text,
  data_cadastro date,
  observacao text,
  recurso_id uuid references public.gab_recursos(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index if not exists gab_demandas_dono on public.gab_demandas (dono, ano);

alter table public.gab_recursos enable row level security;
alter table public.gab_demandas enable row level security;

create policy gab_recursos_dono on public.gab_recursos for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode())
  with check (dono = (select auth.uid()) and public.gab_pode());
create policy gab_demandas_dono on public.gab_demandas for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode())
  with check (dono = (select auth.uid()) and public.gab_pode());

grant select, insert, update, delete on public.gab_recursos, public.gab_demandas to authenticated;
