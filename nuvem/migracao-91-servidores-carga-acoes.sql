-- Migração 91 (04/11/2026): adm_carga ganha o tipo "acoes" — quando o leitor do Diário aprende verbos novos
-- (POSICIONAR, ATRIBUIR, PUBLICAR, "ficam designados" para fiscal de contrato…), os atos já gravados recebem as ações
-- reconhecidas na releitura, sem recarregar tudo. Mesmas regras da migração 90: só com a chave temporária.
create or replace function public.adm_carga(p_chave text, p_tipo text, p_dados jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; a jsonb; novo bigint;
begin
  if not exists (select 1 from adm_carga_chaves where hash = encode(extensions.digest(p_chave, 'sha256'), 'hex') and expira > now()) then
    raise exception 'chave de carga inválida ou vencida';
  end if;
  if p_tipo = 'servidores' then
    insert into adm_servidores (matricula, nome, vinculo, lotacao, situacao, no_portal, primeiro_visto, ultimo_visto)
    select (x->>'m')::int, x->>'nome', x->>'vinc', x->>'lot', coalesce(x->>'sit', 'ativo'), coalesce((x->>'portal')::boolean, true), (x->>'visto')::date, (x->>'visto')::date
    from jsonb_array_elements(p_dados) x
    on conflict (matricula) do update set nome = excluded.nome, vinculo = coalesce(excluded.vinculo, adm_servidores.vinculo),
      lotacao = coalesce(excluded.lotacao, adm_servidores.lotacao), situacao = excluded.situacao, no_portal = excluded.no_portal,
      ultimo_visto = coalesce(excluded.ultimo_visto, adm_servidores.ultimo_visto), atualizado_em = now()
      where excluded.no_portal or not adm_servidores.no_portal;   -- quem está fora do portal não sobrescreve quem está nele
    get diagnostics n = row_count;
  elsif p_tipo = 'contracheques' then
    insert into adm_contracheques (matricula, referencia, linhas, bruto, liquido, cargo_valor)
    select (x->>'m')::int, x->>'ref', x->'linhas', (x->>'bruto')::numeric, (x->>'liq')::numeric, (x->>'cargo')::numeric
    from jsonb_array_elements(p_dados) x where exists (select 1 from adm_servidores s where s.matricula = (x->>'m')::int)
    on conflict (matricula, referencia) do nothing;
    get diagnostics n = row_count;
  elsif p_tipo = 'atos' then
    for a in select * from jsonb_array_elements(p_dados) loop
      insert into adm_atos (edicao, publicado, tipo, numero, data_ato, autoridade, acoes, efeito, codigos, cargo, lotacoes, sei, disposicao, texto, url)
      values ((a->>'edicao')::int, (a->>'publicado')::date, a->>'tipo', a->>'numero', (a->>'data')::date, a->>'autoridade',
        coalesce(array(select jsonb_array_elements_text(a->'acoes')), '{}'), (a->>'efeito')::date, coalesce(array(select jsonb_array_elements_text(a->'codigos')), '{}'),
        a->>'cargo', coalesce(array(select jsonb_array_elements_text(a->'lotacoes')), '{}'), coalesce(array(select jsonb_array_elements_text(a->'sei')), '{}'),
        coalesce((a->>'disposicao')::boolean, false), a->>'texto', a->>'url')
      on conflict (edicao, tipo, numero) do nothing returning id into novo;
      if novo is not null then
        insert into adm_ato_pessoas (ato_id, matricula, nome, nivel_de, nivel)
        select novo, nullif(p->>'matricula', '')::int, p->>'nome', p->>'nivel_de', p->>'nivel' from jsonb_array_elements(coalesce(a->'pessoas', '[]')) p;
        n := n + 1;
      end if;
    end loop;
  elsif p_tipo = 'acoes' then
    -- releitura com o leitor melhorado: atualiza só o que ele extrai (ações, disposição, efeito), sem mexer no resto
    update adm_atos t set acoes = coalesce(array(select jsonb_array_elements_text(x->'acoes')), '{}'), disposicao = coalesce((x->>'disposicao')::boolean, false), efeito = coalesce((x->>'efeito')::date, t.efeito)
    from jsonb_array_elements(p_dados) x where t.edicao = (x->>'edicao')::int and t.tipo = x->>'tipo' and t.numero = x->>'numero' and (t.acoes is distinct from coalesce(array(select jsonb_array_elements_text(x->'acoes')), '{}') or t.disposicao is distinct from coalesce((x->>'disposicao')::boolean, false));
    get diagnostics n = row_count;
  else
    raise exception 'tipo de carga desconhecido: %', p_tipo;
  end if;
  return n;
end $$;
revoke all on function public.adm_carga(text, text, jsonb) from public;
grant execute on function public.adm_carga(text, text, jsonb) to anon, authenticated;
