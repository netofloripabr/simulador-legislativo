-- Migração 15: escolher qual cédula depositada representa a pessoa em cada
-- grupo, em vez de sempre usar a oficial global (Quadro de Médias público).
-- Colar no SQL Editor do Supabase e rodar uma vez, depois da migração 10
-- já ter rodado.
--
-- Pedido do usuário (BACKLOG.md, seção "Revisão / Lobby"): "permitir
-- escolher qual cédula depositada aparece em cada grupo (hoje é só uma
-- 'oficial' global)". Hoje uma pessoa pode ter várias cédulas depositadas
-- (cada depósito trava pra sempre, migração 5), mas só uma pode estar
-- "oficial" por perfil+estado — e é sempre essa que aparecia em TODOS os
-- grupos da pessoa ao mesmo tempo, sem opção de variar por grupo.
--
-- salvamento_escolhido_id: null = comportamento de sempre, cai na oficial
-- (não quebra nada pra quem nunca usar essa opção nova). Preenchido =
-- essa cédula específica (que pode ou não ser a oficial) é a que aparece
-- NESSE grupo, só pra essa pessoa.
alter table public.grupo_membros
  add column if not exists salvamento_escolhido_id uuid references public.salvamentos(id) on delete set null;

-- View nova: TODAS as cédulas depositadas (não só a oficial de cada
-- pessoa+estado), no mesmo formato de listas_salvas_publicas (migração 5)
-- — necessária porque a escolha por grupo pode apontar pra uma depositada
-- que não é (ou deixou de ser) a oficial.
create or replace view public.salvamentos_depositados_publicos as
select
  s.id as salvamento_id,
  s.perfil_id,
  case when s.anonimo then 'Participante anônimo' else pp.nome_exibicao end as nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pp.modo_preenchimento,
  s.estado,
  s.nome,
  s.anonimo,
  s.oficial,
  (array_agg(ls.candidatos) filter (where ls.cargo = 'estadual'))[1] as lista_estadual,
  (array_agg(ls.candidatos) filter (where ls.cargo = 'federal'))[1] as lista_federal,
  (array_agg(ls.candidatos) filter (where ls.cargo = 'senador'))[1] as lista_senador,
  s.criado_em
from public.salvamentos s
join public.perfis_publicos pp on pp.id = s.perfil_id
left join public.listas_salvas ls on ls.salvamento_id = s.id
where s.depositado_em is not null
group by s.id, s.perfil_id, s.anonimo, pp.nome_exibicao, pp.escopo, pp.partido_escopo, pp.modo_preenchimento, s.estado, s.nome, s.oficial, s.criado_em;

grant select on public.salvamentos_depositados_publicos to anon, authenticated;

-- grupo_comparacao (migração 10) passa a resolver por membro: usa a
-- cédula escolhida pra aquele grupo quando existir, senão cai na oficial
-- global — mesma lógica de antes. Nota: não deduplica por estado quando
-- uma pessoa tem oficiais em mais de um estado ao mesmo tempo (hoje só SC
-- tem dado real, então não acontece na prática — revisitar se/quando
-- outro estado ficar ativo).
drop view if exists public.grupo_comparacao;

create view public.grupo_comparacao as
select
  gm.grupo_id,
  sdp.perfil_id,
  sdp.nome_exibicao,
  sdp.escopo,
  sdp.partido_escopo,
  sdp.lista_estadual,
  sdp.lista_federal,
  sdp.lista_senador,
  sdp.criado_em as depositado_em
from public.grupo_membros gm
join public.salvamentos_depositados_publicos sdp
  on sdp.perfil_id = gm.perfil_id
  and (
    sdp.salvamento_id = gm.salvamento_escolhido_id
    or (gm.salvamento_escolhido_id is null and sdp.oficial)
  );

grant select on public.grupo_comparacao to anon, authenticated;
