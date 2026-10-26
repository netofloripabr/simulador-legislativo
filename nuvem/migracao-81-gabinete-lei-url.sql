-- Migração 81 (25/10/2026): Gabinete · link da lei sancionada (ex.: leis.alesc.sc.gov.br), mostrado como ícone no item aberto.
alter table public.gab_recursos add column if not exists lei_url text; alter table public.gab_itens add column if not exists lei_url text;
