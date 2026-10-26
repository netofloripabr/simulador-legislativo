-- Migração 83 (26/10/2026): Gabinete · objeto com marcação de tachado (~~texto~~) copiada da planilha: o trecho tachado
-- é o objeto antigo, substituído por alteração. Texto curto, 13 linhas; impacto desprezível.
alter table public.gab_recursos add column if not exists objeto_fmt text;
