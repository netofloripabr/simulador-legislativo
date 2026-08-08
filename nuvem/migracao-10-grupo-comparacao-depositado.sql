-- Migração 10: a comparação do grupo passa a usar só a cédula DEPOSITADA de
-- cada membro (listas_salvas_publicas, migração 5), não mais o rascunho ao
-- vivo (rascunhos_publicos, migração 7). Colar no SQL Editor do Supabase e
-- rodar uma vez, depois da migração 5 e da migração 8 já terem rodado.
--
-- Decisão do usuário em 08/08/2026: "a ideia é que o grupo tenha acesso a
-- lista do colega apenas no momento em que ele deposita a cédula" — o
-- comportamento anterior (ver grupo_comparacao original, migração 8)
-- mostrava o que a pessoa estava editando AGORA, mesmo sem ela ter
-- confirmado nada — o que não fazia sentido pra uma comparação entre
-- amigos ("ver o que o colega está pensando" antes de ele decidir de
-- verdade). Agora só entra na comparação quem já depositou.
--
-- listas_salvas_publicas já filtra por s.oficial (a cédula que conta pra
-- aquela pessoa+estado agora) — é a mesma fonte usada pelo Quadro de
-- Médias público, então "o que o grupo vê" e "o que entra na pesquisa
-- geral" passam a ser exatamente a mesma cédula, sem duplicar conceito.
--
-- Nomes de coluna trocaram de "rascunho_<cargo>" pra "lista_<cargo>" (reflete
-- a nova origem) — o app (interface/prospeccao.js: montarComparacaoGrupo)
-- foi atualizado junto, não é só uma troca de nome aqui sem efeito.
drop view if exists public.grupo_comparacao;

create view public.grupo_comparacao as
select
  gm.grupo_id,
  lsp.perfil_id,
  lsp.nome_exibicao,
  lsp.escopo,
  lsp.partido_escopo,
  lsp.lista_estadual,
  lsp.lista_federal,
  lsp.lista_senador,
  lsp.criado_em as depositado_em
from public.grupo_membros gm
join public.listas_salvas_publicas lsp on lsp.perfil_id = gm.perfil_id;

grant select on public.grupo_comparacao to anon, authenticated;
