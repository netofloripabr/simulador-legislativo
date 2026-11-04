-- Migração 95 (04/11/2026) · rotina automática de servidores (Diário diário + portal mensal)
-- Por quê: ferramentas/diario/rotina.mjs roda sozinha neste Mac (tarefa agendada) com a chave de carga de longa
-- duração (adm_carga_chaves, só o hash). Ela precisa de duas coisas além do adm_carga:
--   1) avisar os administradores no sino do app ("Diário 9.158: 12 atos…"), sem sessão de usuário;
--   2) pegar a chave anônima das pessoas (HMAC da migração 94) para regerar dados/painel/estrutura-casa.json sem
--      intervenção — o segredo continua no banco, a função devolve só matrícula → chave.
-- As duas exigem a chave de carga válida. Capacidade: 1 notificação por admin por dia com ato novo; a lista de chaves
-- (~1.000 linhas, ~30 KB) uma vez por mês. Sem cron no banco.

alter table public.notificacoes drop constraint if exists notificacoes_tipo_check;
alter table public.notificacoes add constraint notificacoes_tipo_check check (tipo = any (array[
  'desafio_recebido','desafio_aceito','desafio_recusado','desafio_cancelado','desafio_expirado','desafio_lembrete',
  'convite_convertido','termometro_abriu','mudanca_candidato','acesso_parlamentares','desafio_apurado','conferencia_gabinete',
  'rotina_servidores']));

create or replace function public.adm_carga_ok(p_chave text) returns boolean
language sql security definer set search_path = public, extensions stable as $$
  select exists (select 1 from adm_carga_chaves where hash = encode(extensions.digest(p_chave, 'sha256'), 'hex') and expira > now());
$$;
revoke all on function public.adm_carga_ok(text) from public, anon, authenticated;

create or replace function public.adm_rotina_aviso(p_chave text, p_titulo text, p_texto text)
returns integer language plpgsql security definer set search_path = public as $$
declare v record; n integer := 0;
begin
  if not public.adm_carga_ok(p_chave) then raise exception 'chave de carga inválida ou vencida'; end if;
  for v in select perfil_id from public.admins loop
    perform public.criar_notificacao_interna(v.perfil_id, 'rotina_servidores', left(p_titulo, 140), left(p_texto, 2000));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.adm_rotina_aviso(text, text, text) from public;
grant execute on function public.adm_rotina_aviso(text, text, text) to anon, authenticated;

create or replace function public.adm_rotina_chaves(p_chave text)
returns table (matricula integer, chave text) language plpgsql security definer set search_path = public, extensions as $$
declare s text;
begin
  if not public.adm_carga_ok(p_chave) then raise exception 'chave de carga inválida ou vencida'; end if;
  select v into s from public.adm_segredos where k = 'estrutura_casa';
  return query select a.matricula, substr(encode(extensions.hmac(a.matricula::text, s, 'sha256'), 'hex'), 1, 16)
    from public.adm_servidores a where a.no_portal and coalesce(a.lotacao, '') not like 'GAB DEP%';
end $$;
revoke all on function public.adm_rotina_chaves(text) from public;
grant execute on function public.adm_rotina_chaves(text) to anon, authenticated;
