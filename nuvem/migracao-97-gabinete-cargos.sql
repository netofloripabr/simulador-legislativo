-- Migração 97 (04/11/2026): painel Gabinete › Administrativo › RH - Gabinete.
-- A estrutura do gabinete deixa de ficar só no navegador (simulador de Parlamentares) e passa a ficar na conta:
-- cada linha é um cargo da estrutura — do parlamentar (Mesa, liderança, comissão…), do gabinete parlamentar
-- (Secretários Parlamentares PL/GAB, chefe, operação de sistemas), outro cargo da ALESC somado (liderança, comissão,
-- catálogo) ou um cargo livre (ex.: Secretário Municipal de Brusque). Mesma regra das outras tabelas do Gabinete:
-- dono = quem gravou e gab_pode() (gabinetes liberados). Capacidade: ~60 linhas por gabinete, < 30 KB; lido 1 vez
-- por abertura do Administrativo. GRANT explícito (regra do Supabase a partir de 30/10/2026).

create table if not exists public.gab_cargos (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parlamentar text not null,               -- número de urna 2026 do gabinete (ex.: 55777)
  grupo text not null check (grupo in ('parlamentar', 'gabinete', 'alesc', 'outro')),
  cargo text not null,                     -- "Secretário Parlamentar", "Líder de partido ou bloco", "Secretário Municipal"…
  codigo text,                             -- PL/GAB, PL/DAS-7, FC-5, PL/GAL, PL/GAC-59…
  nivel int,                               -- nível da tabela (PL/GAB 1 a 120)
  valor numeric(12,2),                     -- valor mensal (calculado pela tabela ou informado)
  na_cota boolean not null default false,  -- entra na cota da estrutura (gabinete ou liderança)
  estrutura text,                          -- a que estrutura soma: gabinete, lideranca, comissao, mesa, outro
  qual text,                               -- comissão, partido, órgão (ex.: Comissão de Constituição e Justiça)
  pessoa text,                             -- nome da pessoa indicada (opcional)
  matricula int,                           -- matrícula ALESC, se for servidor
  obs text,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists gab_cargos_dono on public.gab_cargos (dono, parlamentar);
alter table public.gab_cargos enable row level security;
create policy gab_cargos_dono on public.gab_cargos for all to authenticated
  using (dono = (select auth.uid()) and public.gab_pode())
  with check (dono = (select auth.uid()) and public.gab_pode());
grant select, insert, update, delete on public.gab_cargos to authenticated;
grant select, insert, update, delete on public.gab_cargos to service_role;
