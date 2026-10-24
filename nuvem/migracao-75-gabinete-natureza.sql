-- Migração 75 (24/10/2026): Gabinete · natureza da despesa no item (Investimento | Custeio).
-- LDO 2027 art. 34 §4º: pelo menos 70% das transferências especiais em despesa de capital.
-- Capacidade: uma coluna de texto curta, sem índice; impacto desprezível.
alter table public.gab_itens add column if not exists natureza text;
