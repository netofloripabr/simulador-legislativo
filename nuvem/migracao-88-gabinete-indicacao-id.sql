-- Migração 88 (28/10/2026): vínculo da emenda do Controle (gab_recursos) com a indicação de origem (gab_itens).
-- Antes ia em "notas", mas notas é a lista de anotações do item e o objeto quebrava o desenho da tabela.
alter table public.gab_recursos add column if not exists indicacao_id uuid;
update public.gab_recursos set indicacao_id = (notas->>'indicacao')::uuid, notas = '[]'::jsonb where jsonb_typeof(notas) = 'object' and notas ? 'indicacao';
