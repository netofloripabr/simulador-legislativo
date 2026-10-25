-- Migração 79 (25/10/2026): Gabinete · contatos do recurso (líder político que indicou e técnicos do processamento
-- administrativo) em jsonb [{papel, nome, tel}], e data da última alteração da observação (balão verde = novidade).
-- Poucos bytes por linha; impacto desprezível.
alter table public.gab_recursos add column if not exists contatos jsonb not null default '[]'::jsonb, add column if not exists obs_em timestamptz;
