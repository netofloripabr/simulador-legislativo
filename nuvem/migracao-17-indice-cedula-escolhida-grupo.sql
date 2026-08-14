-- Migração 17: índice na coluna nova de chave estrangeira da migração 15
-- (grupo_membros.salvamento_escolhido_id) — achado ao rodar a skill
-- "Supabase Postgres Best Practices" (.claude/skills/supabase-postgres-
-- best-practices) sobre as migrações 15 e 16, 14/08/2026: Postgres não
-- indexa coluna de chave estrangeira automaticamente, e grupo_comparacao
-- (migração 15) faz JOIN direto nela — sem índice, isso vira um scan
-- sequencial de grupo_membros a cada consulta de comparação de grupo.
-- Colar no SQL Editor do Supabase e rodar uma vez, depois da migração 15.
create index if not exists grupo_membros_salvamento_escolhido_idx
  on public.grupo_membros (salvamento_escolhido_id);
