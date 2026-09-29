-- Migração 56 — a apuração de 2026 liga SOZINHA no servidor (29/09/2026).
--
-- Pedido do usuário: acompanhar a apuração em tempo real mesmo sem estar
-- online. A coleta já roda no servidor (pg_cron → Edge Function apuracao-tse
-- a cada minuto, migração 54); a única peça que dependia do Mac aberto era a
-- tarefa agendada de 03/10 que troca o ano para 2026 e liga a chave. Aqui o
-- próprio pg_cron faz isso em 04/10/2026 às 07:00 de Brasília (10:00 UTC).
-- O código da eleição 2026 (apuracao_cd_eleicao) ainda depende do TSE
-- publicar o novo portal de resultados; a rotina só coleta com ele preenchido.
-- Objeto verificável: função public.apuracao_ligar_2026.
create or replace function public.apuracao_ligar_2026()
returns void language plpgsql security definer set search_path = public as $$
begin
  if extract(year from now()) <> 2026 then return; end if;
  update public.config_app set valor = '2026', atualizado_em = now() where chave = 'apuracao_ano';
  update public.config_app set valor = 'true', atualizado_em = now() where chave = 'apuracao_ativa';
  perform cron.unschedule('apuracao-ligar-2026');
end; $$;
revoke all on function public.apuracao_ligar_2026() from public, anon, authenticated;
select cron.unschedule('apuracao-ligar-2026') where exists (select 1 from cron.job where jobname = 'apuracao-ligar-2026');
select cron.schedule('apuracao-ligar-2026', '0 10 4 10 *', $$select public.apuracao_ligar_2026()$$);
