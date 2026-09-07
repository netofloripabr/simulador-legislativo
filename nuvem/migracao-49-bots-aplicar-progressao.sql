-- Migração 49: bots "Aplicar agora" (Edge Function) + progressão automática
-- + regra regressiva POR ESTADO (decisões do usuário em 04-05/09/2026).
--
-- POR QUE:
--   1. O botão "Gerar / atualizar bots" da aba Bots só marcava um pedido
--      (geracao_solicitada_em); as contas eram criadas rodando o script
--      ferramentas/gerar_usuarios_ficticios.py no computador. Agora a
--      Edge Function "bots-aplicar" faz isso na hora (chave service_role
--      fica no servidor). O script local continua como reserva.
--   2. Progressão automática: em vez de os 155 bots entrarem de uma vez,
--      o admin define "bots iniciais" (quantos ficam ativos no dia 1) e
--      "incremento por dia" (quantidade FIXA que entra por dia) até o
--      lote. Ex.: 20 iniciais, +10/dia, lote 155 → dia 1: 20, dia 2: 30,
--      ... dia 14: 150, dia 15+: 155. A data de início é progressao_inicio.
--   3. A regra regressiva da migração 21 ("cada cédula real depositada
--      tira 1 bot da média pública, índice mais alto sai primeiro") tinha
--      155 HARD-CODED e contava depósitos NACIONAIS. Pior: a migração 27
--      recriou a view rascunhos_publicos SEM esse filtro (regressão
--      silenciosa — em 07/09/2026 a view em produção não filtrava bot
--      nenhum). Aqui a regra volta, por estado e sem número mágico:
--        teto ativo (UF) = min(lote, iniciais + incremento × dias desde
--                          progressao_inicio) − depósitos reais NA UF
--      Sem progressão configurada (campos null) → lote − reais da UF,
--      exatamente o comportamento original da migração 21.
--
-- O QUE FAZ:
--   - bots_config ganha bots_iniciais, incremento_dia, progressao_inicio,
--     aplicado_em, aplicado_detalhe.
--   - função bots_teto_ativo(uf) (stable, security definer — bots_config é
--     admin-only por RLS, mas o teto é um número agregado sem dado sensível,
--     mesmo espírito de contagem_depositos_reais_uf).
--   - view rascunhos_publicos recriada com as MESMAS colunas (Termômetro/
--     Mediana em nuvem/palpites.js leem select *), agora filtrando bots
--     pelo teto do estado do palpite.
--   - função bots_auth_id_por_email(email): só a Edge Function (service_role)
--     usa, pra reaproveitar uma conta Auth já existente quando o e-mail
--     sintético do bot já foi cadastrado (idempotência). Revogada de
--     anon/authenticated.
--
-- COMO TESTAR:
--   select public.bots_teto_ativo('SC');           -- número >= 0
--   select count(*) from public.rascunhos_publicos; -- não pode dar erro

alter table public.bots_config add column if not exists bots_iniciais smallint
  check (bots_iniciais is null or bots_iniciais between 0 and 500);
alter table public.bots_config add column if not exists incremento_dia smallint
  check (incremento_dia is null or incremento_dia between 0 and 500);
alter table public.bots_config add column if not exists progressao_inicio date;
alter table public.bots_config add column if not exists aplicado_em timestamptz;
alter table public.bots_config add column if not exists aplicado_detalhe text;

-- Teto de bots ativos na média pública de uma UF (ver cabeçalho).
-- "Dia N" conta no fuso de Brasília: dia 1 = progressao_inicio.
create or replace function public.bots_teto_ativo(p_uf text)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select greatest(0,
    coalesce((
      select case
        when c.bots_iniciais is null or c.incremento_dia is null or c.progressao_inicio is null
          then c.lote::int
        else least(
          c.lote::int,
          c.bots_iniciais::int + c.incremento_dia::int
            * greatest(0, ((now() at time zone 'America/Sao_Paulo')::date - c.progressao_inicio))
        )
      end
      from public.bots_config c
      where c.estado = p_uf
    ), 155)
    - public.contagem_depositos_reais_uf(p_uf)::int
  );
$$;
revoke all on function public.bots_teto_ativo(text) from public;
grant execute on function public.bots_teto_ativo(text) to anon, authenticated;

-- Mesmas colunas da migração 27 (create or replace exige isso) — só o
-- WHERE muda: bot entra na média enquanto o índice couber no teto da UF.
create or replace view public.rascunhos_publicos as
select
  pl.perfil_id,
  pp.nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pl.estado,
  pl.rascunho_estadual,
  pl.rascunho_federal,
  pl.rascunho_senador,
  pl.atualizado_em
from public.palpites pl
join public.perfis_publicos pp on pp.id = pl.perfil_id
join public.perfis p on p.id = pl.perfil_id
where not p.eh_ficticio
   or p.indice_ficticio <= public.bots_teto_ativo(pl.estado);
grant select on public.rascunhos_publicos to anon, authenticated;

-- Só pra Edge Function (service_role): acha o id da conta Auth de um
-- e-mail sintético já cadastrado. Ninguém do site consegue chamar.
create or replace function public.bots_auth_id_por_email(p_email text)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke all on function public.bots_auth_id_por_email(text) from public, anon, authenticated;
grant execute on function public.bots_auth_id_por_email(text) to service_role;
