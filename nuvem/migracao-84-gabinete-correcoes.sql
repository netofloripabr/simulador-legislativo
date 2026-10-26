-- Migração 84 (26/10/2026): Gabinete · correções da revisão (leis × SEF) sem apagar o original da planilha: o valor corrigido
-- vai em corr (jsonb: numero, num_lei, municipio, ano, valor, pl, lei, lei_url, nota). O sistema usa o corrigido e mostra o
-- original com a correção em vermelho ao lado. Impacto desprezível.
alter table public.gab_recursos add column if not exists corr jsonb;
