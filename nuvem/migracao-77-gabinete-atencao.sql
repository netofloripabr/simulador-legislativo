-- Migração 77 (24/10/2026): Gabinete · marcação "atenção" do usuário num recurso do Controle (balão laranja).
-- Coluna booleana; impacto desprezível.
alter table public.gab_recursos add column if not exists atencao boolean not null default false;
