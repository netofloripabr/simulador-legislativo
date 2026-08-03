-- Migração 6: salva o rascunho de cada cargo (Estadual/Federal/Senador)
-- automaticamente enquanto a pessoa edita, pra abrir o app de novo e
-- continuar de onde parou — em vez de recomeçar do zero, que é o que
-- acontecia até agora. Colar no SQL Editor do Supabase e rodar uma vez.
--
-- Por que 3 colunas novas em "palpites" em vez de reaproveitar a coluna
-- "candidatos" que já existe: "candidatos" alimenta a view pública
-- "palpites_publicos" (Quadro de Médias, calcularMediaPalpites em
-- nuvem/palpites.js), que espera um array de partidos "achatado" (um cargo
-- só). Trocar o formato dela pra guardar os 3 cargos juntos quebraria essa
-- agregação pública. As colunas novas são só rascunho PRIVADO de trabalho
-- em progresso — não têm relação com o Quadro de Médias nem com o fluxo
-- de "listas salvas" nomeadas (ver migracao-5-listas-salvas.sql, que é uma
-- coisa diferente: versões nomeadas que a pessoa decide guardar de
-- propósito, não o autosave contínuo daqui).

alter table public.palpites
  add column if not exists rascunho_estadual jsonb,
  add column if not exists rascunho_federal jsonb,
  add column if not exists rascunho_senador jsonb;

-- RLS já existente em "palpites" (select público, insert/update só do
-- dono) cobre as colunas novas automaticamente — não precisa de policy
-- nova, é a mesma linha/tabela.
