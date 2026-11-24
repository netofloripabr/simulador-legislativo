-- Migração 117 (24/11/2026): AVISOS dos links + "Resolvido" nas notificações.
-- Achado do usuário: o líder Valcir enviou mudanças pelo link e o gabinete só soube por mensagem — o envio do link do líder
-- (link_enviar) e do Link Gestor (gestor_enviar) não geravam notificação (só o pedido de reabrir gerava, migração 113).
-- Agora os dois avisam os responsáveis do gabinete (gab_avisar_gestores → notificacoes, o mesmo do sino), e a notificação
-- ganha resolvida_em: o balão de avisos do Gabinete mostra as não resolvidas e o botão "Resolvido" marca a data.
-- O próprio usuário já pode atualizar as notificações dele (política notificacoes_update_proprio), então não precisa de RPC.
-- Capacidade: 1 linha (~300 bytes) por envio de link; dezenas por semana na época das emendas (< 50 KB/ano). Sem cron, sem polling.

alter table public.notificacoes add column if not exists resolvida_em timestamptz;
create index if not exists notificacoes_abertas on public.notificacoes(perfil_id, criado_em desc) where resolvida_em is null;

create or replace function public.link_enviar(p_token text)
returns integer language plpgsql security definer set search_path = public as $$
declare l public.gab_links; n int; tot int;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if l.travado then raise exception 'link já enviado e trancado'; end if;
  update public.gab_link_propostas set status = 'enviado', atualizado_em = now() where link_id = l.id and status = 'rascunho';
  get diagnostics n = row_count;
  update public.gab_links set enviado_em = now(), travado = true, pedido_reabrir_em = null where id = l.id;
  select count(*) into tot from public.gab_link_propostas where link_id = l.id and status = 'enviado';
  perform public.gab_avisar_gestores(l.parlamentar, l.nome || ' enviou o link de indicação',
    l.nome || ' enviou o link' || case when tot > 0 then ' com ' || tot || case when tot = 1 then ' emenda alterada' else ' emendas alteradas' end || ' para conferir' else ' sem mudanças nas emendas' end
      || '. Confira e aceite ou recuse na planilha de Indicação.', l.id);
  return n;
end $$;

-- gestor_enviar: igual à migração 112, com o aviso no fim
create or replace function public.gestor_enviar(p_token text, p_mud jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare l public.gab_links; m jsonb; a text; it uuid; d jsonb; antes jsonb; n int := 0;
begin
  select * into l from public.gab_links where token = p_token and tipo = 'gestor';
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if jsonb_typeof(p_mud) <> 'array' or jsonb_array_length(p_mud) = 0 then raise exception 'nenhuma mudança'; end if;
  if jsonb_array_length(p_mud) > 300 or length(p_mud::text) > 800000 then raise exception 'mudanças demais de uma vez'; end if;
  if l.jan_ini is null or l.jan_ini < now() - interval '1 hour' then
    update public.gab_links set jan_ini = now(), jan_n = 1 where id = l.id;
  elsif l.jan_n >= 40 then raise exception 'muitos envios; tente de novo em alguns minutos';
  else update public.gab_links set jan_n = jan_n + 1 where id = l.id; end if;
  for m in select * from jsonb_array_elements(p_mud) loop
    a := m->>'acao';
    if a not in ('alterar', 'incluir', 'excluir') then raise exception 'ação inválida'; end if;
    d := jsonb_strip_nulls(jsonb_build_object(
      'municipio', left(m->'dados'->>'municipio', 120), 'objeto', left(m->'dados'->>'objeto', 600), 'area', left(m->'dados'->>'area', 60),
      'natureza', left(m->'dados'->>'natureza', 20), 'valor', case when (m->'dados'->>'valor') ~ '^\d+(\.\d+)?$' then (m->'dados'->>'valor')::numeric end,
      'lideranca', left(m->'dados'->>'lideranca', 120), 'contato', left(m->'dados'->>'contato', 200),
      'justificativa', left(m->'dados'->>'justificativa', 2000),
      'benef_tipo', case when m->'dados'->>'benef_tipo' in ('mun', 'ent') then m->'dados'->>'benef_tipo' end,
      'razao_social', left(m->'dados'->>'razao_social', 300), 'cnpj', left(m->'dados'->>'cnpj', 20),
      'orientacao', left(m->'dados'->>'orientacao', 2000)));
    if jsonb_typeof(m->'limpar') = 'array' then
      d := d || coalesce((select jsonb_object_agg(k, null) from jsonb_array_elements_text(m->'limpar') k
        where k in ('municipio', 'objeto', 'area', 'natureza', 'lideranca', 'contato', 'justificativa', 'razao_social', 'cnpj')), '{}'::jsonb);
    end if;
    if a = 'incluir' then
      insert into public.gab_link_propostas (link_id, item_id, acao, dados, status, atualizado_em) values (l.id, null, 'incluir', d, 'enviado', now());
    else
      it := (m->>'item_id')::uuid;
      select jsonb_build_object('municipio', i.municipio, 'objeto', i.objeto, 'area', i.area, 'natureza', i.natureza, 'valor', i.valor,
          'lideranca', i.lideranca, 'contato', i.contato, 'justificativa', i.justificativa,
          'benef_tipo', i.benef_tipo, 'razao_social', coalesce(i.razao_social, case when i.benef_tipo = 'ent' then i.beneficiario end), 'cnpj', i.cnpj) into antes
        from public.gab_itens i where i.id = it and i.lista_id = l.lista_id;
      if antes is null then raise exception 'emenda fora da lista'; end if;
      delete from public.gab_link_propostas where link_id = l.id and item_id = it and status in ('rascunho', 'enviado');
      insert into public.gab_link_propostas (link_id, item_id, acao, dados, antes, status, atualizado_em)
        values (l.id, it, a, case when a = 'excluir' then nullif(jsonb_strip_nulls(jsonb_build_object('orientacao', d->>'orientacao')), '{}'::jsonb) else d end, antes, 'enviado', now());
    end if;
    n := n + 1;
  end loop;
  update public.gab_links set enviado_em = now() where id = l.id;
  perform public.gab_avisar_gestores(l.parlamentar, coalesce(nullif(l.nome, ''), 'Gestor') || ' enviou mudanças pelo Link Gestor',
    n || case when n = 1 then ' mudança chegou' else ' mudanças chegaram' end || ' para validar. Confira e aceite ou recuse na planilha de Indicação (Revisar).', l.id);
  return n;
end $$;
