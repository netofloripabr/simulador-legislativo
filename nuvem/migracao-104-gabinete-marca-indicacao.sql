-- Migração 104 (20/11/2026): Indicação de recursos › cor e status pessoal da emenda.
-- A equipe pinta a linha da emenda com uma cor (verde, amarelo, laranja, vermelho, azul), cada uma com um nome de status
-- (ex.: verde = "Resolvido · falta enviar", vermelho = "Crítico"). A cor fica na emenda (gab_itens.marca); os nomes dos
-- status ficam nas regras da lista (gab_listas.regras.marcas, jsonb que já existe). Acesso: o mesmo da tabela (RLS gab_edita).
-- Capacidade: uma palavra por emenda (< 10 KB no total). Sem tabela nova, sem rotina.
alter table public.gab_itens add column if not exists marca text check (marca in ('verde', 'amarelo', 'laranja', 'vermelho', 'azul'));
