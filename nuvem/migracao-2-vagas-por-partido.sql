-- Migração adicional (rodar depois do nuvem/schema.sql original, no mesmo
-- SQL Editor do Supabase): adiciona a coluna que guarda quantas vagas por
-- partido a pessoa indicou na tela inicial de boxes.
alter table public.palpites add column if not exists vagas_por_partido jsonb;
