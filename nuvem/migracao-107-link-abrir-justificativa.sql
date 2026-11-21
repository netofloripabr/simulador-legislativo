-- Migração 107 (20/11/2026): o link do líder passa a abrir JÁ PREENCHIDO com o que o gabinete revisou na planilha
-- (objeto, município, quem recebe e justificativa). Antes a página mostrava "Escolha o objeto" vazio. link_abrir agora
-- devolve também a justificativa da emenda. Sem tabela nova, sem mudança de capacidade.
create or replace function public.link_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.gab_links;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then return null; end if;
  if l.ult_acesso is null or l.ult_acesso < now() - interval '1 minute' then
    update public.gab_links set acessos = acessos + 1, ult_acesso = now(), aberto_em = coalesce(aberto_em, now()) where id = l.id;
  end if;
  return jsonb_build_object(
    'nome', l.nome, 'titulo', l.titulo, 'prazo', l.prazo, 'enviado_em', l.enviado_em,
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'benef_tipo', i.benef_tipo, 'beneficiario', coalesce(i.razao_social, i.beneficiario), 'cnpj', i.cnpj,
        'justificativa', i.justificativa)
        order by array_position(l.itens, i.id)) from public.gab_itens i where i.id = any(l.itens)), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.item_id, 'municipio', p.municipio, 'benef_tipo', p.benef_tipo,
        'beneficiario', p.beneficiario, 'cnpj', p.cnpj, 'objeto', p.objeto, 'objeto_fonte', p.objeto_fonte, 'justificativa', p.justificativa, 'status', p.status))
        from public.gab_link_propostas p where p.link_id = l.id), '[]'::jsonb));
end $$;
revoke all on function public.link_abrir(text) from public;
grant execute on function public.link_abrir(text) to anon, authenticated;
