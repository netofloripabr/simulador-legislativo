-- Migração 87 (28/10/2026): tipo de notificação 'conferencia_gabinete' para o sino receber o resumo da rotina
-- de conferência do Controle de Recursos × portal da SEF (2x por semana, tarefa agendada conferencia-controle-sef).
alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo = any (array[
  'desafio_recebido','desafio_aceito','desafio_recusado','desafio_cancelado','desafio_expirado','desafio_lembrete',
  'convite_convertido','termometro_abriu','mudanca_candidato','acesso_parlamentares','desafio_apurado','conferencia_gabinete']));
