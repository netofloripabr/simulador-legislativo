-- ============================================================
-- Migração 51 — listar_meus_desafios (08/09/2026)
-- Achado do usuário: na aba Desafios, o adversário aparecia como "?" —
-- o nome só surgia ao abrir "Ver comparação". Causa: o hub lia a tabela
-- direto (nuvem/desafios.js, listarMeusDesafios) com os embeds
-- criador:criador_id(nome) / desafiado:desafiado_id(nome), e "perfis" só
-- deixa cada um ler a PRÓPRIA linha (perfis_select_proprio) — o embed do
-- outro lado vinha vazio. A comparação funciona porque desafio_detalhe
-- (migração 38) é security definer e busca os nomes do lado do servidor.
--
-- Solução: a lista passa a vir desta função, também security definer,
-- que devolve só o que o hub precisa (mesmas colunas do select antigo —
-- NUNCA votos/plenário, que continuam só em desafio_detalhe, regra da
-- migração 38) mais o nome dos dois lados. Não abre "perfis" pra ninguém:
-- a política da tabela continua a mesma.
-- ============================================================

create or replace function public.listar_meus_desafios()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'criador_id', d.criador_id, 'desafiado_id', d.desafiado_id,
    'nome', d.nome, 'estado', d.estado, 'cargo', d.cargo, 'codigo', d.codigo,
    'status', d.status, 'custo_sl', d.custo_sl, 'tipo_disputa', d.tipo_disputa,
    'votos_visiveis', d.votos_visiveis, 'escopo_candidatos', d.escopo_candidatos,
    'pontos_criador', d.pontos_criador, 'pontos_desafiado', d.pontos_desafiado,
    'vencedor_id', d.vencedor_id, 'criado_em', d.criado_em,
    'respondido_em', d.respondido_em, 'expira_em', d.expira_em, 'modelo_de', d.modelo_de,
    'criador', (select jsonb_build_object('nome', p.nome) from public.perfis p where p.id = d.criador_id),
    'desafiado', (select jsonb_build_object('nome', p.nome) from public.perfis p where p.id = d.desafiado_id)
  ) order by d.criado_em desc), '[]'::jsonb)
  from public.desafios d
  where d.criador_id = auth.uid() or d.desafiado_id = auth.uid();
$$;
revoke all on function public.listar_meus_desafios() from public, anon;
grant execute on function public.listar_meus_desafios() to authenticated;
