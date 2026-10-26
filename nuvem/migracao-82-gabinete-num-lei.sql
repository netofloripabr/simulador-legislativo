-- Migração 82 (26/10/2026): Gabinete · número da emenda como publicado na lei (LOA). Em 2024 a numeração da lei difere
-- do código da SEF (ex.: lei 1346 = SEF 2024EP001341); em 2025/2026 coincidem. Texto curto, impacto desprezível.
alter table public.gab_recursos add column if not exists num_lei text;
