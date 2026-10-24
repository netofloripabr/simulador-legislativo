-- Migração 76 (24/10/2026): Gabinete · tipo do recurso no Controle (Emenda impositiva | Convênio | Outros (informal)).
-- O Controle passa a ser o centro do painel e recebe recursos que não estão no portal. Coluna de texto curta, impacto desprezível.
alter table public.gab_itens add column if not exists tipo text;
