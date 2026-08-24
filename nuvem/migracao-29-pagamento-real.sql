-- Migração 29: cobrança real pela Loja (Mercado Pago) — 24/08/2026.
-- Colar no SQL Editor do Supabase e rodar UMA vez, depois da migração 28.
--
-- Como funciona (importante entender antes de rodar): o CLIENTE (site)
-- NUNCA credita SL sozinho — ele só pede pra criar um pedido e é
-- redirecionado pro Mercado Pago. Quem credita de verdade é a Edge
-- Function "webhook-mercadopago", rodando no SERVIDOR do Supabase, só
-- depois de CONFIRMAR o pagamento direto na API do Mercado Pago (nunca
-- confia no que o navegador diz que pagou — isso seria falsificável por
-- qualquer pessoa com o DevTools aberto). Ver nuvem/edge-functions/ pros
-- dois arquivos que precisam ser colados no painel de Edge Functions.

create table public.pedidos_pagamento (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  pacote_sl integer not null check (pacote_sl > 0),
  valor_centavos integer not null check (valor_centavos > 0),
  gateway text not null default 'mercadopago',
  gateway_preferencia text, -- id da preferência de pagamento (criada na hora do pedido)
  gateway_pagamento_id text unique, -- id do pagamento no Mercado Pago — só preenche quando aprovado; o UNIQUE é a trava de idempotência (webhook pode repetir a notificação)
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado', 'cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index pedidos_pagamento_perfil_idx on public.pedidos_pagamento (perfil_id, criado_em desc);

alter table public.pedidos_pagamento enable row level security;
create policy "pedidos_pagamento_select_proprio" on public.pedidos_pagamento
  for select using (auth.uid() = perfil_id);
grant select on public.pedidos_pagamento to authenticated;
-- Sem insert/update pra authenticated nem anon: só as Edge Functions
-- escrevem aqui, usando a chave de serviço (que ignora RLS por completo
-- — é por isso que ela só pode existir no servidor, nunca no site).

-- Chamada pela Edge Function "criar-pagamento" (service role) — registra
-- a intenção de compra ANTES de ir pro Mercado Pago, pra existir um
-- "external_reference" pra rastrear a volta do webhook.
create or replace function public.registrar_pedido_pagamento(
  p_perfil_id uuid, p_pacote_sl integer, p_valor_centavos integer
)
returns public.pedidos_pagamento
language sql
security definer
set search_path = public
as $$
  insert into public.pedidos_pagamento (perfil_id, pacote_sl, valor_centavos)
  values (p_perfil_id, p_pacote_sl, p_valor_centavos)
  returning *;
$$;
revoke all on function public.registrar_pedido_pagamento(uuid, integer, integer) from public, anon, authenticated;

create or replace function public.marcar_preferencia_pedido(p_pedido_id uuid, p_preferencia text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.pedidos_pagamento set gateway_preferencia = p_preferencia, atualizado_em = now()
  where id = p_pedido_id;
$$;
revoke all on function public.marcar_preferencia_pedido(uuid, text) from public, anon, authenticated;

-- Chamada pela Edge Function "webhook-mercadopago" (service role) DEPOIS
-- de confirmar o pagamento na API do Mercado Pago. Idempotente por
-- construção: se gateway_pagamento_id já foi usado noutro pedido, o
-- UNIQUE da tabela rejeita a segunda tentativa antes mesmo de chegar
-- aqui — e o "where status = 'pendente'" impede creditar duas vezes o
-- MESMO pedido caso o Mercado Pago reenvie a notificação.
create or replace function public.aprovar_pedido_pagamento(p_pedido_id uuid, p_pagamento_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido public.pedidos_pagamento;
begin
  select * into v_pedido from public.pedidos_pagamento
  where id = p_pedido_id and status = 'pendente' for update;
  if v_pedido.id is null then
    return false; -- já processado (ou pedido inexistente) — webhook repetido, não faz nada
  end if;

  update public.pedidos_pagamento
  set status = 'aprovado', gateway_pagamento_id = p_pagamento_id, atualizado_em = now()
  where id = p_pedido_id;

  perform public.conceder_creditos_interno(
    v_pedido.perfil_id, v_pedido.pacote_sl, 'compra',
    'Mercado Pago · pagamento ' || p_pagamento_id);
  perform public.criar_notificacao_interna(
    v_pedido.perfil_id, 'convite_convertido', -- reaproveita o tipo mais próximo (ganho de crédito) até existir um tipo "compra" na migração de notificações
    'Compra confirmada — +' || v_pedido.pacote_sl || ' SL',
    'Pagamento aprovado no Mercado Pago.', null);
  return true;
end;
$$;
revoke all on function public.aprovar_pedido_pagamento(uuid, text) from public, anon, authenticated;

create or replace function public.rejeitar_pedido_pagamento(p_pedido_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.pedidos_pagamento set status = 'rejeitado', atualizado_em = now()
  where id = p_pedido_id and status = 'pendente';
$$;
revoke all on function public.rejeitar_pedido_pagamento(uuid) from public, anon, authenticated;

-- 'convite_convertido' já existe no CHECK de notificacoes.tipo (migração
-- 28) e serve bem aqui (é só "você ganhou crédito"); se um dia quiser um
-- ícone próprio pra compra, criar o tipo 'compra_aprovada' e trocar acima.
