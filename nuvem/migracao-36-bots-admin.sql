-- Migração 36: aba "Bots" do painel do administrador — lista de
-- referência por estado + regulação (estruturação aprovada 28/08/2026).
-- Colar no SQL Editor do Supabase e rodar UMA vez, depois da migração 35.
--
-- FASE 1 (esta): o painel só GRAVA a referência e a configuração aqui;
-- a geração das contas continua sendo o script local
-- ferramentas/gerar_usuarios_ficticios.py (precisa de privilégio de
-- Auth que não pode ficar no site), que passa a LER destas tabelas.
-- O botão "Gerar" do painel marca geracao_solicitada_em — é o sinal de
-- "pode rodar o script". FASE 2 (pós-lançamento): Edge Function.
--
-- Segurança: tudo admin-only via RLS (mesmo padrão do restante do admin,
-- migração 18) — as tabelas nem aparecem pra usuário comum. auth.uid()
-- embrulhado em (select ...) pra ser avaliado uma vez só por consulta
-- (regra security-rls-performance do guia Supabase do repositório).

-- ========== CONFIG POR ESTADO (1 linha por UF) ==========
create table public.bots_config (
  estado text primary key check (estado ~ '^[A-Z]{2}$'),
  ligado boolean not null default false,
  lote smallint not null default 155 check (lote between 1 and 500),
  variacao_pct smallint not null default 20 check (variacao_pct between 0 and 100),
  -- "Gerar" apertado no painel — o script local lê e limpa ao concluir.
  geracao_solicitada_em timestamptz,
  -- carimbo da última geração CONCLUÍDA (escrito pelo script) + resumo
  -- legível ("155 contas, índices 1-155, 0 erros").
  gerado_em timestamptz,
  gerado_detalhe text,
  atualizado_em timestamptz not null default now()
);
alter table public.bots_config enable row level security;
create policy "bots_config_admin_select" on public.bots_config for select
  using (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
create policy "bots_config_admin_insert" on public.bots_config for insert
  with check (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
create policy "bots_config_admin_update" on public.bots_config for update
  using (exists (select 1 from public.admins where perfil_id = (select auth.uid())))
  with check (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
grant select, insert, update on public.bots_config to authenticated;

-- ========== REFERÊNCIA POR ESTADO (histórico de snapshots) ==========
-- Cada linha é um SNAPSHOT da cédula depositada do admin no momento em
-- que ele apertou "Usar minha cédula como referência" — trocar a
-- referência cria linha nova e desativa a anterior (histórico completo
-- preservado). A regra mestra do produto continua valendo: referência é
-- sempre uma cédula depositada de verdade, nunca lista solta.
create table public.bots_referencia (
  id uuid primary key default gen_random_uuid(),
  estado text not null check (estado ~ '^[A-Z]{2}$'),
  -- de qual salvamento veio (auditoria) — set null se a lista for apagada,
  -- o snapshot em si continua íntegro em "referencia".
  salvamento_id uuid references public.salvamentos(id) on delete set null,
  -- {"estadual":[{nome,candidatos:[{nome,votos}...]}...], "federal":..., "senador":...}
  -- mesmo formato que gerar_usuarios_ficticios.py já lê de --referencia.
  referencia jsonb not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
create index bots_referencia_estado_idx on public.bots_referencia (estado, criado_em desc);
-- No máximo UMA referência ativa por estado.
create unique index bots_referencia_ativa_unica_idx on public.bots_referencia (estado) where ativa;
alter table public.bots_referencia enable row level security;
create policy "bots_referencia_admin_select" on public.bots_referencia for select
  using (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
create policy "bots_referencia_admin_insert" on public.bots_referencia for insert
  with check (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
create policy "bots_referencia_admin_update" on public.bots_referencia for update
  using (exists (select 1 from public.admins where perfil_id = (select auth.uid())))
  with check (exists (select 1 from public.admins where perfil_id = (select auth.uid())));
grant select, insert, update on public.bots_referencia to authenticated;
