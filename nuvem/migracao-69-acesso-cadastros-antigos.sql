-- Migração 69: quem já tinha cadastro até 15/10/2026 mantém o acesso que tinha
-- (pedido do usuário). Legislativo e Administrativo estavam abertos para qualquer
-- conta logada, então ficam liberados para todos os cadastros existentes.
-- Valores R$ e Mesa continuam como estavam (já dependiam de liberação).
-- Cadastros novos (depois desta migração) seguem a regra da migração 68.
-- Aplicar via MCP apply_migration. Só INSERT/UPDATE (sem objeto verificável).
insert into public.parlamentares_acesso (perfil_id, status, legislativo, administrativo, decidido_em)
  select u.id, 'liberado', true, true, now() from auth.users u
  where u.created_at < now() and not exists (select 1 from public.admins a where a.perfil_id = u.id)
  on conflict (perfil_id) do update set legislativo = true, administrativo = true, status = 'liberado',
    decidido_em = coalesce(public.parlamentares_acesso.decidido_em, now());
