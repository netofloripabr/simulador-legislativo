-- Migração 16: expõe o código da cédula (SLxx-xxxx) na view pública de
-- cédulas depositadas, pra dar suporte à consulta pública por nome ou
-- código dentro da tela de Ranking (BACKLOG.md, seção "Cédula depositada
-- / Compartilhamento"). Colar no SQL Editor do Supabase e rodar uma vez,
-- depois da migração 14 (código da cédula) e da migração 15 (view
-- salvamentos_depositados_publicos) já terem rodado.
--
-- Só adiciona a coluna "codigo" à view existente — create or replace view
-- é seguro de rodar de novo, não precisa recriar índice/grant. IMPORTANTE:
-- o Postgres não deixa create or replace view mudar a ORDEM de colunas já
-- existentes (só permite acrescentar coluna nova no FINAL da lista) — por
-- isso "codigo" entra depois de "criado_em", preservando a mesma ordem das
-- 14 colunas da migração 15. Achado ao rodar de verdade (erro 42P16:
-- "cannot change name of view column ... to codigo"), corrigido antes de
-- confirmar a migração como concluída.
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
  s.criado_em,
  -- Código continua exposto mesmo pra cédula anônima — é assim que o
  -- anonimato funciona aqui (ver modal de Compartilhar, interface/
  -- prospeccao.js: renderModalCompartilhar): a pessoa depositou anônima
  -- justamente pra poder passar só o código pra quem ela quiser, sem
  -- revelar o nome. Esconder o código de quem é anônimo quebraria esse
  -- fluxo. O que já protege o anonimato aqui é nome_exibicao virar
  -- "Participante anônimo" acima — a busca por NOME nunca vai achar essa
  -- pessoa, só quem já tem o código de propósito consegue.
  s.codigo
from public.salvamentos s
join public.perfis_publicos pp on pp.id = s.perfil_id
left join public.listas_salvas ls on ls.salvamento_id = s.id
where s.depositado_em is not null
group by s.id, s.perfil_id, s.anonimo, pp.nome_exibicao, pp.escopo, pp.partido_escopo, pp.modo_preenchimento, s.estado, s.nome, s.oficial, s.codigo, s.criado_em;

grant select on public.salvamentos_depositados_publicos to anon, authenticated;
