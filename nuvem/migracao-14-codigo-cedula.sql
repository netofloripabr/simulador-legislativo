-- Migração 14: código único por cédula depositada (compartilhamento/consulta
-- pública, ver interface/prospeccao.js e nuvem/salvamentos.js). Colar no SQL
-- Editor do Supabase e rodar uma vez.
--
-- Mesmo padrão do código de convite de grupo (migracao-8-grupos.sql):
-- gerado no cliente (gerarCodigoCedula, nuvem/salvamentos.js), não no banco —
-- aqui só garantimos unicidade e o formato. Preenchido só no momento do
-- depósito (depositarSalvamento), nunca antes — uma lista em aberto não tem
-- código ainda.
alter table public.salvamentos add column if not exists codigo text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'salvamentos_codigo_formato'
  ) then
    alter table public.salvamentos
      add constraint salvamentos_codigo_formato check (codigo ~ '^SL[A-Z0-9]{2}-[A-Z0-9]{4}$');
  end if;
end $$;

create unique index if not exists salvamentos_codigo_key on public.salvamentos (codigo) where codigo is not null;
