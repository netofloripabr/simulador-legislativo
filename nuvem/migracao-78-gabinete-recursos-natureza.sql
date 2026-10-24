-- Migração 78 (24/10/2026): Gabinete · natureza da despesa (Investimento | Custeio) nos recursos da planilha do Controle.
-- Aparece como etiqueta abaixo do ícone da função. Coluna de texto curta, impacto desprezível.
alter table public.gab_recursos add column if not exists natureza text;
