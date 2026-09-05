-- ============================================================
-- Migração 48 — Convite aberto vira MOLDE reutilizável (05/09/2026)
-- Decisão do usuário: o mesmo link ?duelo=CODIGO foi mandado pra muita
-- gente, mas até aqui a PRIMEIRA pessoa que aceitava "consumia" o duelo
-- (aceitar_desafio gravava desafiado_id na própria linha). Agora o
-- convite aberto (desafiado_id null, status aguardando) é um molde:
--   • cada aceite cria um duelo NOVO, já selado, com código próprio e
--     coluna modelo_de apontando pro molde; o molde nunca muda;
--   • o molde vale até o criador cancelar (não expira em 7 dias, não
--     recebe lembrete de "duelo parado");
--   • a mesma pessoa aceitando o mesmo molde duas vezes NÃO cria dois
--     duelos — devolve o que ela já tem (índice único no banco);
--   • uma notificação 'desafio_aceito' no sino do criador por aceite;
--   • duelo endereçado (desafiado_id preenchido) segue igual: aceite
--     atualiza a própria linha.
-- Os 12 convites abertos já existentes viram molde automaticamente —
-- nada é migrado/alterado neles.
-- ============================================================

-- ========== 1. Coluna modelo_de + índices ==========
alter table public.desafios
  add column if not exists modelo_de uuid null references public.desafios(id) on delete set null;
create index if not exists desafios_modelo_de_idx on public.desafios (modelo_de);
-- Regra 3 garantida no banco: um clone por pessoa por molde.
create unique index if not exists desafios_modelo_desafiado_unico
  on public.desafios (modelo_de, desafiado_id) where modelo_de is not null;

-- ========== 2. Gerador de código server-side ==========
-- Mesmo formato de gerarCodigoDesafio() em nuvem/desafios.js:
-- "DS" + 2 chars + "-" + 4 chars, alfabeto sem ambíguos (sem 0/O/1/I).
create or replace function public.gerar_codigo_duelo()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_i int;
begin
  loop
    v_codigo := 'DS';
    for v_i in 1..6 loop
      if v_i = 3 then v_codigo := v_codigo || '-'; end if;
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.desafios where codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;
revoke all on function public.gerar_codigo_duelo() from public, anon, authenticated;

-- ========== 3. aceitar_desafio: molde gera clone, endereçado atualiza a linha ==========
create or replace function public.aceitar_desafio(
  p_desafio_id uuid, p_meus_votos jsonb, p_meus_eleitos jsonb
)
returns public.desafios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios;
  v_clone public.desafios;
  v_chaves_escopo text[];
  v_chaves_votos text[];
  v_ja_premiado boolean;
  v_premios_dados int;
  v_eh_molde boolean;
  v_meu_nome text;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if v_d.id is null
     or (v_d.desafiado_id is not null and v_d.desafiado_id <> auth.uid())
     or v_d.criador_id = auth.uid() then
    raise exception 'Desafio não encontrado.';
  end if;
  if v_d.status <> 'aguardando' then
    raise exception 'Este desafio não está mais disponível.';
  end if;
  v_eh_molde := v_d.desafiado_id is null;

  -- Regra 3: já aceitei esse molde → devolve o duelo que já tenho.
  if v_eh_molde then
    select * into v_clone from public.desafios
    where modelo_de = v_d.id and desafiado_id = auth.uid();
    if v_clone.id is not null then
      return v_clone;
    end if;
  end if;

  -- Expiração só vale pra duelo endereçado — o molde vale até cancelar.
  if not v_eh_molde and v_d.expira_em < now() then
    update public.desafios set status = 'expirado', respondido_em = now() where id = v_d.id;
    if v_d.custo_sl > 0 then
      perform public.conceder_creditos_interno(v_d.criador_id, v_d.custo_sl, 'estorno_desafio', 'expirado: ' || v_d.nome);
    end if;
    perform public.criar_notificacao_interna(
      v_d.criador_id, 'desafio_expirado', '"' || v_d.nome || '" expirou',
      case when v_d.custo_sl > 0 then 'Ninguém respondeu em 7 dias — os ' || v_d.custo_sl || ' SL voltaram.' else 'Ninguém respondeu em 7 dias.' end,
      v_d.id);
    raise exception 'Este desafio expirou — peça pro criador desafiar de novo.';
  end if;

  -- Validações (iguais às da migração 40)
  if v_d.tipo_disputa = 'eleitos' then
    if p_meus_eleitos is null or jsonb_typeof(p_meus_eleitos) <> 'array'
       or jsonb_array_length(p_meus_eleitos) <> jsonb_array_length(v_d.eleitos_criador) then
      raise exception 'Preencha todas as cadeiras do plenário antes de aceitar.';
    end if;
    if (select count(distinct elem->>'chave') from jsonb_array_elements(p_meus_eleitos) elem)
       <> jsonb_array_length(p_meus_eleitos) then
      raise exception 'Tem candidato repetido em mais de uma cadeira.';
    end if;
  else
    select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_escopo
    from jsonb_array_elements(v_d.escopo_candidatos) elem;
    select array_agg(elem->>'chave' order by elem->>'chave') into v_chaves_votos
    from jsonb_array_elements(p_meus_votos) elem;
    if v_chaves_escopo is distinct from v_chaves_votos then
      raise exception 'Os votos não batem com o recorte de candidatos deste desafio.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_meus_votos) elem
      where not (elem->>'votos' ~ '^[0-9]+$')
    ) then
      raise exception 'Votação inválida.';
    end if;
  end if;

  if v_eh_molde then
    -- Molde: NÃO toca na linha do molde; nasce um duelo novo já selado.
    insert into public.desafios (
      criador_id, desafiado_id, nome, estado, cargo, codigo,
      escopo_candidatos, votos_criador, votos_desafiado, custo_sl,
      tipo_disputa, votos_visiveis, eleitos_criador, eleitos_desafiado,
      status, respondido_em, modelo_de
    ) values (
      v_d.criador_id, auth.uid(), v_d.nome, v_d.estado, v_d.cargo, public.gerar_codigo_duelo(),
      v_d.escopo_candidatos, v_d.votos_criador,
      case when v_d.tipo_disputa = 'eleitos' then null else p_meus_votos end, 0,
      v_d.tipo_disputa, v_d.votos_visiveis, v_d.eleitos_criador,
      case when v_d.tipo_disputa = 'eleitos' then p_meus_eleitos else null end,
      'selado', now(), v_d.id
    )
    returning * into v_clone;
    v_d := v_clone;
  elsif v_d.tipo_disputa = 'eleitos' then
    update public.desafios
    set status = 'selado', desafiado_id = auth.uid(), eleitos_desafiado = p_meus_eleitos, respondido_em = now()
    where id = p_desafio_id
    returning * into v_d;
  else
    update public.desafios
    set status = 'selado', desafiado_id = auth.uid(), votos_desafiado = p_meus_votos, respondido_em = now()
    where id = p_desafio_id
    returning * into v_d;
  end if;

  -- Prêmio de aceite (igual à migração 40: 1ª vez com esse rival, máx. 5)
  select exists(
    select 1 from public.desafios
    where status in ('selado','apuracao','encerrado') and id <> v_d.id
      and ((criador_id = v_d.criador_id and desafiado_id = v_d.desafiado_id)
        or (criador_id = v_d.desafiado_id and desafiado_id = v_d.criador_id))
  ) into v_ja_premiado;

  select count(*) into v_premios_dados
  from public.transacoes_creditos where perfil_id = v_d.criador_id and tipo = 'ganho_desafio';

  v_meu_nome := (select nome from public.perfis where id = auth.uid());
  if not v_ja_premiado and v_premios_dados < 5 then
    perform public.conceder_creditos_interno(
      v_d.criador_id, 5, 'ganho_desafio', 'aceite de ' || v_meu_nome);
  end if;

  perform public.criar_notificacao_interna(
    v_d.criador_id, 'desafio_aceito',
    case when v_eh_molde then '"' || v_d.nome || '"' else v_meu_nome || ' aceitou "' || v_d.nome || '"' end,
    case when v_eh_molde then v_meu_nome || ' aceitou seu convite.' || case when not v_ja_premiado and v_premios_dados < 5 then ' +5 SL.' else '' end
         when not v_ja_premiado and v_premios_dados < 5 then 'A cédula está selada até a apuração — +5 SL.'
         else 'A cédula está selada até a apuração.' end,
    v_d.id);
  return v_d;
end;
$$;
revoke all on function public.aceitar_desafio(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.aceitar_desafio(uuid, jsonb, jsonb) to authenticated;

-- ========== 4. Expiração e lembrete ignoram o molde ==========
create or replace function public.expirar_meus_desafios_vencidos()
returns void
language plpgsql
set search_path = public
as $$
declare
  v_d record;
begin
  for v_d in
    select * from public.desafios
    where criador_id = auth.uid() and status = 'aguardando' and expira_em < now()
      and desafiado_id is not null   -- molde (convite aberto) vale até cancelar
  loop
    update public.desafios set status = 'expirado', respondido_em = now() where id = v_d.id;
    if v_d.custo_sl > 0 then
      perform public.conceder_creditos_interno(auth.uid(), v_d.custo_sl, 'estorno_desafio', 'expirado: ' || v_d.nome);
    end if;
    perform public.criar_notificacao_interna(
      auth.uid(), 'desafio_expirado', '"' || v_d.nome || '" expirou',
      case when v_d.custo_sl > 0 then 'Ninguém respondeu em 7 dias — os ' || v_d.custo_sl || ' SL voltaram.' else 'Ninguém respondeu em 7 dias.' end,
      v_d.id);
  end loop;
end;
$$;
grant execute on function public.expirar_meus_desafios_vencidos() to authenticated;

create or replace function public.lembrar_meus_desafios_parados()
returns void
language plpgsql
set search_path = public
as $$
declare
  v_d record;
begin
  for v_d in
    select * from public.desafios
    where criador_id = auth.uid()
      and status = 'aguardando'
      and desafiado_id is not null   -- molde não é "duelo parado"
      and lembrete_em is null
      and criado_em < now() - interval '3 days'
      and expira_em > now()
  loop
    update public.desafios set lembrete_em = now() where id = v_d.id;
    perform public.criar_notificacao_interna(
      auth.uid(), 'desafio_lembrete', '"' || v_d.nome || '" ainda espera um rival',
      'Ninguém aceitou em 3 dias — reenvie o convite. O duelo expira em '
        || to_char(v_d.expira_em at time zone 'America/Sao_Paulo', 'DD/MM') || '.',
      v_d.id);
  end loop;
end;
$$;
grant execute on function public.lembrar_meus_desafios_parados() to authenticated;

-- ========== 5. desafio_por_codigo: ja_aceitei / meu_duelo_id / aceites ==========
create or replace function public.desafio_por_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_d public.desafios;
  v_meu uuid;
begin
  select * into v_d from public.desafios
  where codigo = upper(trim(p_codigo)) and status = 'aguardando'
    and (desafiado_id is null or desafiado_id = auth.uid());
  if v_d.id is null then
    return null;
  end if;
  select id into v_meu from public.desafios
  where modelo_de = v_d.id and desafiado_id = auth.uid();
  return jsonb_build_object(
    'id', v_d.id, 'nome', v_d.nome, 'estado', v_d.estado, 'cargo', v_d.cargo,
    'tipo_disputa', v_d.tipo_disputa,
    'criador_nome', (select nome from public.perfis where id = v_d.criador_id),
    'sou_o_criador', v_d.criador_id = auth.uid(),
    'ja_aceitei', v_meu is not null,
    'meu_duelo_id', v_meu,
    'aceites', (select count(*) from public.desafios where modelo_de = v_d.id));
end;
$$;
revoke all on function public.desafio_por_codigo(text) from public, anon;
grant execute on function public.desafio_por_codigo(text) to authenticated;

-- Observação: o hub lê a tabela direto (nuvem/desafios.js, listarMeusDesafios)
-- com colunas explícitas — passa a pedir também modelo_de e conta os
-- aceites no cliente (os clones são visíveis pro criador pela policy
-- desafios_select_participante, criador_id igual ao do molde).
-- cancelar_desafio não muda: cancela só a linha do molde (status próprio);
-- os clones já selados continuam intactos.
