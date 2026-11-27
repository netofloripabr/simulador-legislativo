-- Migração 121 (27/11/2026): o líder (ou contato) SEMPRE pode alterar o objeto e a justificativa, enquanto o link estiver
-- aberto (não fechado e dentro do prazo). Pedido do usuário: "o usuário sempre consiga alterar o objeto e a justificativa".
-- Antes (113): ao enviar, o link trancava e só reabria com autorização do gabinete; e emenda já aceita ou recusada não
-- podia mais ser mexida. Agora:
--  • link_salvar não olha mais o trancamento nem a decisão do gabinete. Mexer numa emenda já decidida volta a proposta
--    para 'rascunho' — ao enviar de novo, ela reaparece para o gabinete aceitar ou recusar.
--  • link_enviar não tranca mais o link (travado fica false) e aceita enviar quantas vezes for preciso.
--  • os links trancados hoje são destrancados (pedido de reabertura pendente é limpo).
-- O prazo e o "fechar link" do gabinete continuam valendo.
-- Capacidade: nada novo gravado; mesma quantidade de chamadas. Sem cron, sem polling.

create or replace function public.link_salvar(p_token text, p_item uuid, p_dados jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare l public.gab_links;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  if not (p_item = any(public.link_itens_atuais(l))) then raise exception 'emenda fora do link'; end if;
  if length(p_dados::text) > 4000 then raise exception 'dados grandes demais'; end if;
  if l.jan_ini is null or l.jan_ini < now() - interval '1 hour' then
    update public.gab_links set jan_ini = now(), jan_n = 1 where id = l.id;
  elsif l.jan_n >= 600 then raise exception 'muitas gravações; tente de novo em alguns minutos';
  else update public.gab_links set jan_n = jan_n + 1 where id = l.id; end if;
  insert into public.gab_link_propostas as p (link_id, item_id, municipio, benef_tipo, beneficiario, cnpj, objeto, objeto_fonte, justificativa, status, atualizado_em)
  values (l.id, p_item, left(p_dados->>'municipio', 120), nullif(p_dados->>'benef_tipo', ''), left(p_dados->>'beneficiario', 300), left(p_dados->>'cnpj', 20),
    left(p_dados->>'objeto', 600), nullif(p_dados->>'objeto_fonte', ''), left(p_dados->>'justificativa', 2000), 'rascunho', now())
  on conflict (link_id, item_id) do update set municipio = excluded.municipio, benef_tipo = excluded.benef_tipo, beneficiario = excluded.beneficiario,
    cnpj = excluded.cnpj, objeto = excluded.objeto, objeto_fonte = excluded.objeto_fonte, justificativa = excluded.justificativa,
    status = 'rascunho', atualizado_em = now();
  return 'ok';
end $$;

create or replace function public.link_enviar(p_token text)
returns integer language plpgsql security definer set search_path = public as $$
declare l public.gab_links; n int; tot int;
begin
  select * into l from public.gab_links where token = p_token;
  if not found then raise exception 'link inválido'; end if;
  if l.fechado or now() >= l.prazo then raise exception 'link encerrado'; end if;
  update public.gab_link_propostas set status = 'enviado', atualizado_em = now() where link_id = l.id and status = 'rascunho';
  get diagnostics n = row_count;
  update public.gab_links set enviado_em = now(), travado = false, pedido_reabrir_em = null where id = l.id;
  select count(*) into tot from public.gab_link_propostas where link_id = l.id and status = 'enviado';
  perform public.gab_avisar_gestores(l.parlamentar, l.nome || ' enviou o link de indicação',
    l.nome || ' enviou o link' || case when tot > 0 then ' com ' || tot || case when tot = 1 then ' emenda alterada' else ' emendas alteradas' end || ' para conferir' else ' sem mudanças nas emendas' end
      || '. Confira e aceite ou recuse na planilha de Indicação.', l.id);
  return n;
end $$;

update public.gab_links set travado = false, pedido_reabrir_em = null where tipo = 'lider' and (travado or pedido_reabrir_em is not null);
