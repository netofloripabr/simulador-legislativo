-- Migração 96 (04/11/2026) · rotina mensal do portal: quem saiu da lista
-- Por quê: a carga 'servidores' (adm_carga) não deixa quem está fora do portal sobrescrever quem está nele — certo
-- para os atos antigos, mas aí quem SAI do portal de um mês para o outro ficaria marcado como presente para sempre.
-- A rotina (ferramentas/diario/rotina.mjs) compara a lista nova com a do mês anterior e manda aqui as matrículas que
-- sumiram: no_portal = false, e a situação 'ativo' vira 'desconhecido' até um ato do Diário dizer o que houve
-- (exoneração, aposentadoria…). Exige a chave de carga. Capacidade: dezenas de linhas por mês.
create or replace function public.adm_rotina_saidas(p_chave text, p_matriculas integer[])
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.adm_carga_ok(p_chave) then raise exception 'chave de carga inválida ou vencida'; end if;
  update public.adm_servidores set no_portal = false,
    situacao = case when situacao = 'ativo' then 'desconhecido' else situacao end, atualizado_em = now()
  where matricula = any(p_matriculas) and no_portal;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.adm_rotina_saidas(text, integer[]) from public;
grant execute on function public.adm_rotina_saidas(text, integer[]) to anon, authenticated;

-- adm_rotina_chaves passa a devolver um objeto só ({matrícula: chave}): como tabela, a API corta em 1.000 linhas
drop function if exists public.adm_rotina_chaves(text);
create or replace function public.adm_rotina_chaves(p_chave text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare s text;
begin
  if not public.adm_carga_ok(p_chave) then raise exception 'chave de carga inválida ou vencida'; end if;
  select v into s from public.adm_segredos where k = 'estrutura_casa';
  return (select coalesce(jsonb_object_agg(a.matricula::text, substr(encode(extensions.hmac(a.matricula::text, s, 'sha256'), 'hex'), 1, 16)), '{}'::jsonb)
    from public.adm_servidores a where a.no_portal and coalesce(a.lotacao, '') not like 'GAB DEP%');
end $$;
revoke all on function public.adm_rotina_chaves(text) from public;
grant execute on function public.adm_rotina_chaves(text) to anon, authenticated;
