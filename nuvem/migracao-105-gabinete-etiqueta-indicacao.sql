-- Migração 105 (20/11/2026): Indicação › a "cor e status" vira ETIQUETA livre, como as listas suspensas coloridas do
-- Google Planilhas. A equipe cria etiquetas (nome + cor da paleta) para a lista e marca cada emenda com uma.
-- gab_itens.marca (migração 104) passa a guardar o NOME da etiqueta (antes: só 5 cores fixas); as etiquetas da lista
-- (nome e cor) ficam em gab_listas.regras.etiquetas. Nenhuma emenda usava a marca ainda (0 linhas).
-- Capacidade: um texto curto por emenda (< 20 KB no total). Sem tabela nova, sem rotina.
alter table public.gab_itens drop constraint if exists gab_itens_marca_check;
alter table public.gab_itens add constraint gab_itens_marca_tam check (marca is null or length(marca) <= 60);
