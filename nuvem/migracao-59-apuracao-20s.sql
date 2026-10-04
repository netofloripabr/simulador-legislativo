-- Migração 59 (04/10/2026, dia da eleição): a rotina apuracao-tse passa de
-- 1 vez por minuto para a cada 20 segundos (pg_cron 1.6 aceita segundos),
-- pra seguir o ritmo de divulgação do TSE o mais de perto possível. A rotina
-- só grava quando o arquivo do TSE muda (dg/hg), então rodar mais vezes não
-- gera escrita à toa.
select cron.unschedule('apuracao-tse') where exists (select 1 from cron.job where jobname = 'apuracao-tse');
select cron.schedule('apuracao-tse', '20 seconds', $$select public.apuracao_chamar_rotina()$$);
