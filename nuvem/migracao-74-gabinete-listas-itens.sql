-- Migração 74 (24/10/2026): Gabinete · botão "Adicionar" do Controle de Recursos.
-- gab_listas: uma lista por origem legal (ex.: "PL nº 452/2026" com apelido "LOA27"), com as regras do ano
--   (valor disponível, mínimo por item, máximo de itens, áreas permitidas, prazo) em jsonb.
-- gab_itens: cada indicação planejada (avulsa ou dentro de uma lista): campos do modelo do Orçamento
--   (município, objeto, área/subação, modalidade, valor, entidade) + campos do gabinete (liderança, contato,
--   beneficiário, justificativa, prioridade, status, observação, notas).
-- Capacidade: dezenas de listas e centenas de itens por gabinete, < 1 MB. Só o dono lê e grava (RLS).
create table if not exists public.gab_listas (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  origem text not null, apelido text, modelo text, regras jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create table if not exists public.gab_itens (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lista_id uuid references public.gab_listas(id) on delete cascade,
  municipio text, objeto text, area text, modalidade text, valor numeric(14,2),
  cnpj text, razao_social text, beneficiario text,
  lideranca text, contato text, justificativa text, prioridade text, status text, observacao text,
  notas jsonb not null default '[]'::jsonb, chave_emenda text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists gab_itens_lista on public.gab_itens (dono, lista_id);
alter table public.gab_listas enable row level security;
alter table public.gab_itens enable row level security;
create policy gab_listas_dono on public.gab_listas for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode()) with check (dono = (select auth.uid()) and public.gab_pode());
create policy gab_itens_dono on public.gab_itens for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode()) with check (dono = (select auth.uid()) and public.gab_pode());
grant select, insert, update, delete on public.gab_listas, public.gab_itens to authenticated;
grant select, insert, update, delete on public.gab_listas, public.gab_itens to service_role;
