-- Migração 86 (27/10/2026): Gabinete · tipo de beneficiário da indicação (mun = município → TE, ent = entidade → Convênio,
-- est = Estado → Execução Direta). O instrumento é sugerido pelo tipo, mas o usuário pode trocar; por isso fica guardado à parte.
alter table public.gab_itens add column if not exists benef_tipo text;
