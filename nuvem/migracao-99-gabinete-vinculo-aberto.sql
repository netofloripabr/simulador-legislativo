-- Migração 99 (11/11/2026): "Seu Gabinete" para qualquer conta (Etapa 1 do Gabinete como página inicial).
-- Por quê: o Gabinete passa a ser a página inicial de todo usuário logado e, no primeiro acesso, a pessoa escolhe o
-- parlamentar ("Seu Gabinete"). Até aqui a escolha (gab_vinculo) só podia ser gravada por administrador
-- (gab_pode()). Agora cada conta grava e lê só a própria linha. As funções privadas do Gabinete (Controle, Cotas,
-- Indicar, RH, contatos) continuam exigindo gab_pode() nas suas tabelas; isto só libera a escolha do parlamentar.
-- Capacidade: 1 linha (< 200 bytes) por usuário, lida 1 vez por acesso ao Gabinete. Desprezível.

drop policy if exists gab_vinculo_dono on public.gab_vinculo;
create policy gab_vinculo_dono on public.gab_vinculo for all to authenticated
  using (dono = (select auth.uid()))
  with check (dono = (select auth.uid()));
