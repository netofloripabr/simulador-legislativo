-- Migração 114 (23/11/2026): o líder vê, em cada emenda do link, a ETIQUETA que o gabinete deu (ex.: verde "Resolvido")
-- e um RECADO escrito para ele (gab_itens.nota_lider, campo novo na janela do balão da planilha: "Recado para o líder").
-- As observações internas continuam só da equipe. link_abrir devolve 'etq' {n, c} (cor vinda das etiquetas da lista) e
-- 'nota_lider'. Capacidade: 1 coluna de texto curto; sem cron/polling.
alter table public.gab_itens add column if not exists nota_lider text;

create or replace function public.link_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.gab_links; li public.gab_listas;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then return null; end if;
  select * into li from public.gab_listas where id = l.lista_id;
  if l.ult_acesso is null or l.ult_acesso < now() - interval '1 minute' then
    update public.gab_links set acessos = acessos + 1, ult_acesso = now(), aberto_em = coalesce(aberto_em, now()) where id = l.id;
  end if;
  return jsonb_build_object(
    'nome', l.nome, 'titulo', l.titulo, 'limpo', l.limpo, 'travado', l.travado, 'pedido_reabrir_em', l.pedido_reabrir_em, 'prazo', l.prazo, 'enviado_em', l.enviado_em,
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'benef_tipo', i.benef_tipo, 'beneficiario', coalesce(i.razao_social, i.beneficiario), 'cnpj', i.cnpj,
        'justificativa', i.justificativa, 'nota_lider', i.nota_lider,
        'etq', case when i.marca is null then null else jsonb_build_object('n', i.marca, 'c',
          (select e->>'c' from jsonb_array_elements(coalesce(li.regras->'etiquetas', '[]'::jsonb)) e where e->>'n' = i.marca limit 1)) end)
        order by array_position(l.itens, i.id)) from public.gab_itens i where i.id = any(l.itens)), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('item_id', p.item_id, 'municipio', p.municipio, 'benef_tipo', p.benef_tipo,
        'beneficiario', p.beneficiario, 'cnpj', p.cnpj, 'objeto', p.objeto, 'objeto_fonte', p.objeto_fonte, 'justificativa', p.justificativa, 'status', p.status))
        from public.gab_link_propostas p where p.link_id = l.id), '[]'::jsonb));
end $$;

revoke all on function public.link_abrir(text) from public;
grant execute on function public.link_abrir(text) to anon, authenticated;
