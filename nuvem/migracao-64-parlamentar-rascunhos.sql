-- Migração 64: rascunhos da página Parlamentares salvos na conta (pedido do usuário em 13/10/2026).
-- Aplicar via MCP apply_migration.
--
-- POR QUE: sem login, o que a pessoa monta (simulador de gabinete, bloco e vagas
-- das comissões, recorte do painel eleitoral, seções do caderno) fica só no
-- navegador. Logada, ela salva aqui e abre em qualquer aparelho.
-- Uma linha por (perfil, parlamentar); RLS: cada um só vê e grava o seu.

create table if not exists public.parlamentar_rascunhos (
  perfil_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parlamentar text not null,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (perfil_id, parlamentar)
);
alter table public.parlamentar_rascunhos enable row level security;
drop policy if exists parlamentar_rascunhos_dono on public.parlamentar_rascunhos;
create policy parlamentar_rascunhos_dono on public.parlamentar_rascunhos for all to authenticated
  using (perfil_id = (select auth.uid())) with check (perfil_id = (select auth.uid()));
revoke all on table public.parlamentar_rascunhos from anon;
grant select, insert, update, delete on table public.parlamentar_rascunhos to authenticated;
