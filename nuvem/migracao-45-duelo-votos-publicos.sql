-- Migração 45: Votos dados DENTRO de um Duelo entram no Termômetro
-- Eleitoral (Mediana pública) — decisão do usuário 04/09/2026. Colar no
-- SQL Editor e rodar UMA vez, depois da migração 43.
--
-- POR QUE:
--   Hoje o Termômetro (calcularMedianaPalpites, em nuvem/palpites.js) só
--   conta palpites salvos como lista/rascunho (view rascunhos_publicos,
--   ligada à tabela palpites). Votos indicados DENTRO de um Duelo (tabela
--   desafios, colunas jsonb votos_criador/votos_desafiado — formato
--   [{chave, votos}, ...], ver migração 33) não entravam nessa conta. O
--   usuário confirmou explicitamente que devem entrar.
--
-- O QUE FAZ:
--   As colunas votos_criador/votos_desafiado de desafios são restritas
--   por RLS/coluna aos participantes (revoke select por coluna, ver
--   migração 38) — não dá pra agregar isso publicamente com uma query
--   direta do cliente. Esta função, no mesmo espírito da view
--   rascunhos_publicos, expõe só o agregado necessário: pra um
--   estado+cargo, devolve (perfil_id, chave, votos) de cada duelo já
--   selado/em apuração/encerrado, com UMA linha por pessoa+candidato —
--   se a mesma pessoa participou de vários duelos sobre o mesmo
--   candidato, fica só o voto mais recente (regra aprovada pelo usuário).
--   security definer pra poder ler as colunas de voto apesar do revoke;
--   stable porque só lê.
--
-- COMO TESTAR:
--   select * from public.duelo_votos_publicos('SC', 'estadual') limit 5;
--   -- não precisa dar linhas (pode não haver duelos selados ainda pro
--   -- estado/cargo testado), só não pode dar erro. Testado em produção
--   -- em 04/09/2026 com SC/estadual e retornou linhas reais.
--
-- Uso no cliente: nuvem/palpites.js → buscarVotosDuelosPublicos(estado,
-- cargo) chama supabaseClient.rpc('duelo_votos_publicos', {...}) e passa
-- o resultado como 3º parâmetro de calcularMedianaPalpites, que só usa
-- um voto de duelo pra chave/pessoa que NÃO tem rascunho salvo daquele
-- candidato (o rascunho salvo tem prioridade — é o palpite "oficial").

create or replace function public.duelo_votos_publicos(p_estado text, p_cargo text)
returns table(perfil_id uuid, chave text, votos numeric)
language sql
security definer
stable
set search_path = public
as $$
  with bruto as (
    select criador_id as perfil_id, v.value->>'chave' as chave, (v.value->>'votos')::numeric as votos,
           coalesce(respondido_em, criado_em) as quando
    from public.desafios d, jsonb_array_elements(d.votos_criador) v
    where d.estado = p_estado and d.cargo = p_cargo
      and d.status in ('selado','apuracao','encerrado')
      and d.votos_criador is not null
    union all
    select desafiado_id as perfil_id, v.value->>'chave' as chave, (v.value->>'votos')::numeric as votos,
           coalesce(respondido_em, criado_em) as quando
    from public.desafios d, jsonb_array_elements(d.votos_desafiado) v
    where d.estado = p_estado and d.cargo = p_cargo
      and d.status in ('selado','apuracao','encerrado')
      and d.votos_desafiado is not null
      and d.desafiado_id is not null
  ),
  dedup as (
    select *, row_number() over (partition by perfil_id, chave order by quando desc) as rn
    from bruto
  )
  select perfil_id, chave, votos from dedup where rn = 1;
$$;
revoke all on function public.duelo_votos_publicos(text, text) from public;
grant execute on function public.duelo_votos_publicos(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
