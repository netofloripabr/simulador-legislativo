-- Migração 72 (24/10/2026): painel Gabinete · vínculo do usuário com o parlamentar.
-- O Gabinete é um sistema pessoal: cada conta fica ligada a um parlamentar e o painel abre direto nele,
-- sem escolher a cada acesso. Uma linha por usuário. Capacidade: < 1 KB no total, lida 1 vez por acesso.
-- GRANT explícito (regra do Supabase a partir de 30/10/2026).

create table if not exists public.gab_vinculo (
  dono uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  uf text not null default 'SC',
  cargo text not null default 'estadual',
  parlamentar text not null,            -- número de urna 2026 (ex.: 55777)
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.gab_vinculo enable row level security;
create policy gab_vinculo_dono on public.gab_vinculo for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode())
  with check (dono = (select auth.uid()) and public.gab_pode());
grant select, insert, update, delete on public.gab_vinculo to authenticated;
grant select, insert, update, delete on public.gab_vinculo to service_role;
