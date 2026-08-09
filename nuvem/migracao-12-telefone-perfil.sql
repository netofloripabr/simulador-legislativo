-- Migração 12: adiciona telefone ao perfil (opcional por enquanto, sem
-- validação de formato no banco — o app formata/limpa antes de salvar).
-- Colar no SQL Editor do Supabase e rodar uma vez.
--
-- Parte da revisão da tela de Cadastro pedida pelo usuário em 09/08/2026
-- (referência: telas de cadastro da Betano, adaptadas — sem as partes de
-- jogo de azar/idade/endereço completo).
alter table public.perfis add column if not exists telefone text;
