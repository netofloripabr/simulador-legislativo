-- Migração 27 (21/08/2026): estado (UF) dos rascunhos da linha de
-- "palpites" — parte da auditoria dos 27 estados (tarefa #41). Até aqui o
-- app inteiro assumia SC; com a abertura dos estados, cada linha precisa
-- dizer de QUAL estado são os rascunhos, e o link de Compartilhar precisa
-- carregar o estado certo pra montar a apuração.
-- Colar no SQL Editor do Supabase e rodar uma vez.

alter table public.palpites
  add column if not exists estado text not null default 'SC';

-- Recria a view pública expondo o estado junto (create or replace não
-- consegue ADICIONAR coluna em view — precisa dropar antes).
drop view if exists public.rascunhos_publicos;
create view public.rascunhos_publicos as
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
join public.perfis_publicos pp on pp.id = pl.perfil_id;

grant select on public.rascunhos_publicos to anon, authenticated;
