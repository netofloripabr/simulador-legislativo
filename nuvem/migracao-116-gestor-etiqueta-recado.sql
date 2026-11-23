-- Migração 116 (23/11/2026): Link Gestor mostra a ETIQUETA e o RECADO de cada emenda (botão "Comentários" na página).
-- Mesma regra do link do líder (migração 114): vai a etiqueta (nome + cor da lista) e o "Recado para o líder" (nota_lider);
-- as observações internas da caderneta continuam só do gabinete.
-- Capacidade: nada novo gravado; cada abertura devolve ~30 bytes a mais por emenda (~3 KB para 90 emendas). Sem cron, sem polling.
create or replace function public.gestor_abrir(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.gab_links; li public.gab_listas;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'gestor';
  if not found then return null; end if;
  select * into li from public.gab_listas where id = l.lista_id;
  if l.ult_acesso is null or l.ult_acesso < now() - interval '1 minute' then
    update public.gab_links set acessos = acessos + 1, ult_acesso = now(), aberto_em = coalesce(aberto_em, now()) where id = l.id;
  end if;
  return jsonb_build_object(
    'nome', l.nome, 'titulo', l.titulo, 'prazo', l.prazo, 'enviado_em', l.enviado_em, 'cota', l.cota,
    'lista', coalesce(li.origem, li.apelido),
    'aberto', not l.fechado and now() < l.prazo,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'municipio', i.municipio, 'objeto', i.objeto, 'area', i.area,
        'natureza', i.natureza, 'valor', i.valor, 'lideranca', i.lideranca, 'contato', i.contato, 'justificativa', i.justificativa,
        'benef_tipo', i.benef_tipo, 'razao_social', coalesce(i.razao_social, case when i.benef_tipo = 'ent' then i.beneficiario end), 'cnpj', i.cnpj,
        'nota_lider', i.nota_lider,
        'etq', case when i.marca is null then null else jsonb_build_object('n', i.marca, 'c',
          (select e->>'c' from jsonb_array_elements(coalesce(li.regras->'etiquetas', '[]'::jsonb)) e where e->>'n' = i.marca limit 1)) end) order by i.criado_em, i.id)
        from public.gab_itens i where i.lista_id = l.lista_id and (i.municipio is not null or coalesce(i.valor, 0) > 0)), '[]'::jsonb),
    'pendentes', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'acao', p.acao, 'item_id', p.item_id, 'dados', p.dados,
        'enviado_em', p.atualizado_em) order by p.atualizado_em)
        from public.gab_link_propostas p where p.link_id = l.id and p.status = 'enviado'), '[]'::jsonb));
end $$;
