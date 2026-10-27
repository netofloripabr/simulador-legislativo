-- Migração 85 (26/10/2026): Gabinete · agenda de contatos do gabinete (líderes políticos e técnicos), reaproveitados nos itens
-- do Controle e em outros títulos (Mailing). Cada item guarda em contatos [{id, papel, nome, tel}]. Poucas linhas; impacto desprezível.
create table if not exists public.gab_contatos (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  papel text,                 -- lider | tecnico | outro
  tel text, email text, org text, municipio text, obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.gab_contatos enable row level security;
create policy gab_contatos_dono on public.gab_contatos for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode()) with check (dono = (select auth.uid()) and public.gab_pode());
create index if not exists gab_contatos_dono_idx on public.gab_contatos (dono);
grant select, insert, update, delete on public.gab_contatos to authenticated;
grant select, insert, update, delete on public.gab_contatos to service_role;
