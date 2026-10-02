-- Migração 58 (02/10/2026): Governador e Presidente na Apuração.
-- A rotina apuracao-tse passa a coletar também os cargos 3 (Governador, mesma
-- eleição dos deputados, código 6259 em 2026) e 1 (Presidente, eleição
-- separada, código 6257). Libera os dois cargos na tabela de status e guarda
-- o código da eleição presidencial.
alter table public.apuracao_status drop constraint if exists apuracao_status_cargo_check;
alter table public.apuracao_status add constraint apuracao_status_cargo_check check (cargo in ('estadual','federal','senador','governador','presidente'));
insert into public.config_app (chave, valor) values ('apuracao_cd_eleicao_pres', '6257')
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
