-- Migração 61 (06/10/2026): investimento do gabinete por município (aba
-- "EM Consolidado" da planilha Controle de Recursos), pra impressão da ficha
-- com as colunas Investimento e R$/voto. Dado interno: SÓ administrador lê
-- (RLS); visitante e usuário comum não enxergam a tabela nem a opção.
create table if not exists public.investimento_municipio (
  uf text not null default 'SC',
  cargo text not null,
  candidato_numero text not null,
  municipio_chave text not null,
  valor numeric(14,2) not null default 0,
  fonte text,
  atualizado_em timestamptz not null default now(),
  primary key (uf, cargo, candidato_numero, municipio_chave)
);
alter table public.investimento_municipio enable row level security;
drop policy if exists investimento_municipio_admin_le on public.investimento_municipio;
create policy investimento_municipio_admin_le on public.investimento_municipio
  for select to authenticated
  using (exists (select 1 from public.admins a where a.perfil_id = (select auth.uid())));
revoke all on public.investimento_municipio from anon;
