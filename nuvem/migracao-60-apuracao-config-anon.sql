-- Migração 60 (04/10/2026, dia da eleição): visitante sem login (anon) não
-- conseguia ler apuracao_ativa/apuracao_ano em config_app (a política só
-- liberava authenticated) — a tela de Apuração de quem não entrou na conta
-- nunca ligava o modo ao vivo. Libera a leitura só das chaves apuracao_*.
drop policy if exists config_app_leitura_apuracao_anon on public.config_app;
create policy config_app_leitura_apuracao_anon on public.config_app
  for select to anon using (chave like 'apuracao\_%');
