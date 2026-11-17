-- Migração 102 (17/11/2026): Gabinete › Administrativo › RH do gabinete.
-- O bloco "RH - Gabinete" sai; a equipe passa a registrar as pessoas no "RH do gabinete" (botão "+"): Nome, Cargo,
-- natureza do vínculo (Comissionado, À disposição, Terceirizado, Estagiário ou outra escrita à mão), Valor e Observação,
-- com filtro e totais por natureza. Reaproveita public.gab_cargos (grupo 'outro'; pessoa, cargo, valor, obs) e só
-- acrescenta a coluna natureza. Acesso: o da migração 100 (equipe lê, Editor/Responsável grava). Tabela estava vazia.
-- Capacidade: ~40 linhas por gabinete, < 20 KB; lida 1 vez por abertura do Administrativo. Sem tabela nova.
alter table public.gab_cargos add column if not exists natureza text;
