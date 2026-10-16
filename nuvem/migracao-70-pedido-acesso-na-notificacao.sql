-- Migração 70: liberar o acesso direto pela notificação (pedido do usuário em 15/10/2026).
-- Aplicar via MCP apply_migration.
-- POR QUE: o pedido de acesso no sino do admin passa a levar o id de quem pediu
-- (referencia_id), para a tela de notificações mostrar as 4 áreas marcadas e os
-- botões V (liberar) / X (negar) ali mesmo. Admin não gera pedido para si.
create or replace function public.solicitar_acesso_parlamentares()
returns text language plpgsql security definer set search_path = public as $$
declare v uuid := (select auth.uid()); v_email text; v_nome text; v_admin record;
begin
  if v is null then raise exception 'Entre na sua conta para pedir acesso.'; end if;
  if exists (select 1 from public.admins where perfil_id = v) then return 'liberado'; end if;
  if exists (select 1 from public.parlamentares_acesso where perfil_id = v) then
    return (select status from public.parlamentares_acesso where perfil_id = v);
  end if;
  insert into public.parlamentares_acesso (perfil_id) values (v);
  select email into v_email from auth.users where id = v;
  select nome into v_nome from public.perfis where id = v;
  for v_admin in select perfil_id from public.admins loop
    perform public.criar_notificacao_interna(v_admin.perfil_id, 'acesso_parlamentares',
      'Pedido de acesso: Parlamentares',
      coalesce(v_nome, 'Usuário') || ' (' || coalesce(v_email, '?') || ') pediu acesso à página Parlamentares. Escolha o que liberar abaixo ou em Painel do administrador → Acessos.', v);
  end loop;
  return 'pendente';
end $$;

-- pedidos já enviados: liga a notificação a quem pediu (pelo e-mail no texto)
update public.notificacoes n set referencia_id = u.id
  from auth.users u
  where n.tipo = 'acesso_parlamentares' and n.titulo = 'Pedido de acesso: Parlamentares' and n.referencia_id is null
    and n.corpo like '%(' || u.email || ')%';

-- admin não precisa de pedido para si
delete from public.notificacoes where tipo = 'acesso_parlamentares' and titulo = 'Pedido de acesso: Parlamentares' and referencia_id in (select perfil_id from public.admins);
delete from public.parlamentares_acesso where perfil_id in (select perfil_id from public.admins);
