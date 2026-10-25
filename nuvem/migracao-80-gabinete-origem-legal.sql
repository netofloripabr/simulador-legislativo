-- Migração 80 (25/10/2026): Gabinete · origem legal do recurso: projeto de lei (pl), lei sancionada (lei) e, para
-- convênio e outros, o acordo (termo, ofício). No resumo aparece a lei quando houver, senão o PL. Texto curto, impacto desprezível.
alter table public.gab_recursos add column if not exists pl text, add column if not exists lei text, add column if not exists acordo text;
alter table public.gab_itens add column if not exists pl text, add column if not exists lei text, add column if not exists acordo text;
