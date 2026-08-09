-- Migração 11: grupo grátis tem no máximo 5 membros. Colar no SQL Editor do
-- Supabase e rodar uma vez, depois da migração 8 (grupos) já ter rodado.
--
-- Decisão do usuário em 09/08/2026: grupos começam com cap de até 5 pessoas
-- no plano grátis — aumentar esse limite fica reservado como recurso pago
-- futuro. A trava é no BANCO (trigger), não só na tela — mesmo raciocínio
-- da migração 9 (créditos): checagem só no cliente pode ser burlada
-- chamando a tabela direto pelo console.
--
-- Por que fixo em 5 por enquanto (não uma coluna configurável ainda): não
-- existe cobrança de verdade ainda pra "aumentar o grupo" — quando existir,
-- trocar esta constante por uma coluna em "grupos" (ex. limite_membros)
-- que o pagamento incrementa, sem precisar reescrever o trigger inteiro.
create or replace function public.grupo_membros_checa_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_membros int;
begin
  select count(*) into total_membros from public.grupo_membros where grupo_id = new.grupo_id;
  if total_membros >= 5 then
    raise exception 'Este grupo já tem o máximo de 5 pessoas do plano grátis.';
  end if;
  return new;
end;
$$;

create trigger grupo_membros_antes_de_entrar
before insert on public.grupo_membros
for each row
execute function public.grupo_membros_checa_limite();
