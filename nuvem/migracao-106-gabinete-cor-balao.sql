-- Migração 106 (20/11/2026): Indicação › cor do balão de Observações. A equipe pinta o balão da emenda de vermelho,
-- amarelo ou verde para lembrar o que está pendente (ex.: vermelho = conversei com o contato e espero o retorno).
-- É independente da etiqueta (migração 105). Acesso: o mesmo da tabela (RLS gab_edita).
-- Capacidade: uma palavra por emenda (< 5 KB no total). Sem tabela nova, sem rotina.
alter table public.gab_itens add column if not exists obs_cor text check (obs_cor in ('vermelho', 'amarelo', 'verde'));
