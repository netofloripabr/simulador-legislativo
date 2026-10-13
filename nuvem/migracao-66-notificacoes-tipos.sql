-- Migração 66: novos tipos de notificação (13/10/2026).
-- 'acesso_parlamentares' (pedidos e decisões de acesso, migração 65 — sem isto o pedido falhava)
-- e 'desafio_apurado' (resultado dos duelos depois da apuração oficial).
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo = any (array[
  'desafio_recebido','desafio_aceito','desafio_recusado','desafio_cancelado','desafio_expirado','desafio_lembrete',
  'convite_convertido','termometro_abriu','mudanca_candidato','acesso_parlamentares','desafio_apurado']));
