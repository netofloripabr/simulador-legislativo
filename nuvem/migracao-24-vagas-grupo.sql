-- Migração 24: vagas de grupo pagas + teto VIP (economia fase 1, etapa 5
-- — MONETIZACAO.md v3 §3.1/§5). Colar no SQL Editor e rodar UMA vez,
-- depois da migração 23.
--
-- O dono do grupo amplia a capacidade comprando vagas em créditos
-- (1 vaga = 10 créditos, a ponte validada: R$ 4,99 ≈ 10 créditos).
-- Teto de 30 IMPOSTO AQUI no banco [DECIDIDO 19/08/2026]: é a fronteira
-- da arquitetura atual (a comparação baixa a cédula completa de cada
-- membro — em 30 ainda é saudável, em centenas não). Grupo acima de 30
-- é produto institucional (etapa 8, agregação no servidor), outro trilho.

create or replace function public.ampliar_capacidade_grupo(
  p_grupo_id uuid,
  p_vagas integer
)
returns integer -- nova capacidade; NULL = saldo insuficiente (nada muda)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_dono uuid;
  v_capacidade int;
  v_custo int;
  v_nova int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Precisa estar logado.';
  end if;
  if p_vagas is null or p_vagas < 1 or p_vagas > 25 then
    raise exception 'Quantidade de vagas inválida.';
  end if;

  select criado_por, capacidade into v_dono, v_capacidade
  from public.grupos where id = p_grupo_id for update;
  if v_dono is null then
    raise exception 'Grupo não encontrado.';
  end if;
  if v_dono <> v_uid then
    raise exception 'Só o dono do grupo pode ampliar as vagas.';
  end if;
  if coalesce(v_capacidade, 5) + p_vagas > 30 then
    raise exception 'Teto de 30 pessoas por grupo — acima disso é conta institucional.';
  end if;

  v_custo := p_vagas * 10;
  if not public.gastar_creditos(v_uid, v_custo, 'gasto_vaga',
    'ampliar grupo +' || p_vagas || ' vaga' || case when p_vagas = 1 then '' else 's' end) then
    return null;
  end if;

  update public.grupos
  set capacidade = coalesce(capacidade, 5) + p_vagas
  where id = p_grupo_id
  returning capacidade into v_nova;
  return v_nova;
end;
$$;
revoke all on function public.ampliar_capacidade_grupo(uuid, integer) from public, anon;
grant execute on function public.ampliar_capacidade_grupo(uuid, integer) to authenticated;
