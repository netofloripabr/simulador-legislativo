-- Migração 89 (04/11/2026): Servidores da ALESC e atos administrativos do Diário da Assembleia.
-- Por quê: o administrador quer, no painel, o perfil de qualquer servidor (matrícula, vínculo, lotação, contracheque,
-- histórico de nomeações/exonerações/níveis/lotação/disposição com o ato que publicou) e notas pessoais. O portal da
-- transparência só mostra o mês atual; o histórico vem das portarias e atos publicados no Diário (2019 em diante).
-- Quem sai dos quadros NÃO é apagado: fica com situação 'exonerado'/'aposentado' e todo o histórico.
-- Acesso: tudo só para administrador (public.gab_pode(), migração 71). Notas: cada uma só para quem escreveu.
-- Tamanho (dimensionado e aprovado pelo usuário em 04/11/2026): ~28 mil atos de 2019 a 2026 com texto completo (~1 KB
-- cada) + ~35 mil vínculos ato-pessoa + ~2,6 mil servidores e contracheques ≈ 50 MB (banco 36 → ~86 MB, ~17% de 500 MB);
-- depois ~5 MB/ano. Carga e atualização mensal por ferramentas/diario/ (sem cron, sem polling).

-- 1) servidores: uma linha por matrícula (a matrícula é o número do portal e das portarias)
create table if not exists public.adm_servidores (
  matricula integer primary key,
  nome text not null,
  vinculo text,                 -- Comissionado, Efetivo, Aposentado, Militar, Servidor à disposição…
  lotacao text,
  regime text,
  situacao text not null default 'ativo' check (situacao in ('ativo', 'exonerado', 'aposentado', 'desconhecido')),
  no_portal boolean not null default true,   -- apareceu na última leitura do portal
  primeiro_visto date,
  ultimo_visto date,
  atualizado_em timestamptz not null default now()
);
create index if not exists adm_servidores_lot_idx on public.adm_servidores (lotacao);

-- 2) atos administrativos do Diário (portarias, atos da Mesa e da Presidência, resoluções, instruções normativas)
create table if not exists public.adm_atos (
  id bigint generated always as identity primary key,
  edicao integer not null,      -- número do Diário
  publicado date,
  tipo text not null,           -- PORTARIA, ATO DA MESA…
  numero text not null,
  data_ato date,
  autoridade text,
  acoes text[] not null default '{}',   -- NOMEAR, EXONERAR, ALTERAR NÍVEL, LOTAR, COLOCAR À DISPOSIÇÃO…
  efeito date,                  -- "a contar de"
  codigos text[] not null default '{}', -- PL/GAB-71…
  cargo text,
  lotacoes text[] not null default '{}',
  sei text[] not null default '{}',
  disposicao boolean not null default false,
  texto text not null,
  url text,
  unique (edicao, tipo, numero)
);
create index if not exists adm_atos_data_idx on public.adm_atos (coalesce(efeito, data_ato));
create index if not exists adm_atos_acoes_idx on public.adm_atos using gin (acoes);

-- 3) quem cada ato atinge (a matrícula pode faltar numa nomeação nova: a pessoa ainda não tinha número)
create table if not exists public.adm_ato_pessoas (
  ato_id bigint not null references public.adm_atos(id) on delete cascade,
  matricula integer,
  nome text not null,
  nivel_de text,
  nivel text
);
create index if not exists adm_ato_pessoas_mat_idx on public.adm_ato_pessoas (matricula);
create index if not exists adm_ato_pessoas_nome_idx on public.adm_ato_pessoas (nome);
create index if not exists adm_ato_pessoas_ato_idx on public.adm_ato_pessoas (ato_id);

-- 4) contracheque: gravado só quando muda (e no mês da saída), para o recorte nas datas de exoneração
create table if not exists public.adm_contracheques (
  matricula integer not null references public.adm_servidores(matricula) on delete cascade,
  referencia text not null,     -- mm/aaaa
  linhas jsonb not null,        -- rubricas do portal: [grupo, rubrica, mês atual, atrasados]
  bruto numeric, liquido numeric, cargo_valor numeric,
  gravado_em timestamptz not null default now(),
  primary key (matricula, referencia)
);

-- 5) notas pessoais: cada nota é de quem escreveu (outro admin não vê)
create table if not exists public.adm_notas (
  id bigint generated always as identity primary key,
  matricula integer not null references public.adm_servidores(matricula) on delete cascade,
  autor uuid not null default auth.uid(),
  texto text not null check (length(texto) between 1 and 4000),
  criado_em timestamptz not null default now()
);
create index if not exists adm_notas_autor_idx on public.adm_notas (autor, matricula);

alter table public.adm_servidores enable row level security;
alter table public.adm_atos enable row level security;
alter table public.adm_ato_pessoas enable row level security;
alter table public.adm_contracheques enable row level security;
alter table public.adm_notas enable row level security;

create policy adm_servidores_admin on public.adm_servidores for select to authenticated using (public.gab_pode());
create policy adm_atos_admin on public.adm_atos for select to authenticated using (public.gab_pode());
create policy adm_ato_pessoas_admin on public.adm_ato_pessoas for select to authenticated using (public.gab_pode());
create policy adm_contracheques_admin on public.adm_contracheques for select to authenticated using (public.gab_pode());
create policy adm_notas_dono on public.adm_notas for all to authenticated
  using (autor = (select auth.uid()) and public.gab_pode()) with check (autor = (select auth.uid()) and public.gab_pode());

-- GRANTs explícitos (tabelas criadas depois de 30/10/2026). Escrita das tabelas de dados só pela carga (service_role);
-- o app só lê. Notas: o próprio admin escreve e apaga as suas.
grant select on public.adm_servidores, public.adm_atos, public.adm_ato_pessoas, public.adm_contracheques to authenticated;
grant select, insert, update, delete on public.adm_notas to authenticated;
grant select, insert, update, delete on public.adm_servidores, public.adm_atos, public.adm_ato_pessoas, public.adm_contracheques, public.adm_notas to service_role;
