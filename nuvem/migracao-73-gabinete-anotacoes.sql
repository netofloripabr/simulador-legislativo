-- Migração 73 (24/10/2026): anotações do gabinete dentro de cada emenda da Carteira.
-- lideranca: quem indicou/acompanha o recurso; notas: histórico de notas de status
-- [{"t": "texto", "em": "2026-10-24T..."}]. Capacidade: texto curto por emenda, poucos KB no total.
-- Tabela já existente (migração 71): os GRANTs dela continuam valendo.
alter table public.gab_recursos add column if not exists lideranca text;
alter table public.gab_recursos add column if not exists notas jsonb not null default '[]'::jsonb;
