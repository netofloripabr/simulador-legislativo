-- Migração 7: expõe os rascunhos por cargo (Estadual/Federal/Senador,
-- colunas criadas na Migração 6) numa view pública, mesmo padrão de
-- "palpites_publicos" — junta com "perfis_publicos" pra respeitar
-- mostrar_nome, sem duplicar essa lógica em outro lugar. Colar no SQL
-- Editor do Supabase e rodar uma vez.
--
-- Por que não reaproveitar "palpites_publicos": ela expõe só a coluna
-- "candidatos", que hoje só guarda o ÚLTIMO cargo que a pessoa depositou
-- (ver salvarPalpiteCompleto em nuvem/palpites.js) — não dá pra montar
-- Compartilhar/Grupos com os 3 cargos a partir dela. "rascunho_estadual/
-- federal/senador" já são atualizados sozinhos, por cargo, enquanto a
-- pessoa edita (autosave — ver agendarAutoSaveRascunho em
-- interface/prospeccao.js) — essa view só expõe o que já existe.

create view public.rascunhos_publicos as
select
  pl.perfil_id,
  pp.nome_exibicao,
  pp.escopo,
  pp.partido_escopo,
  pl.rascunho_estadual,
  pl.rascunho_federal,
  pl.rascunho_senador,
  pl.atualizado_em
from public.palpites pl
join public.perfis_publicos pp on pp.id = pl.perfil_id;

grant select on public.rascunhos_publicos to anon, authenticated;
