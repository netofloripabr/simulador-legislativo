-- Migração 55 — corrige o aviso de mudança de elenco (28/09/2026).
--
-- A migração 47 criou admin_notificar_mudanca_candidatos(), que grava
-- notificações do tipo 'mudanca_candidato'. Mas a checagem de tipos da
-- tabela notificacoes (redefinida por último na migração 41) nunca incluiu
-- esse tipo — então TODO aviso de mudança de elenco falhava em silêncio.
-- Achado ao tentar avisar a remoção de 10 entradas do elenco SC 2026.
-- Objeto verificável: a própria constraint aceitar 'mudanca_candidato'.
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo in (
  'desafio_recebido', 'desafio_aceito', 'desafio_recusado', 'desafio_cancelado',
  'desafio_expirado', 'desafio_lembrete', 'convite_convertido', 'termometro_abriu',
  'mudanca_candidato'
));
