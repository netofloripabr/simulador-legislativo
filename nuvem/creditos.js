// Créditos — a partir do 2º salvamento (lista) ou do 2º grupo CRIADO pela
// própria conta, é preciso 1 crédito (ver nuvem/migracao-9-creditos.sql).
//
// O saldo mora numa tabela própria ("creditos_conta"), separada de
// "perfis" de propósito: a política de update de "perfis" deixa o dono
// mudar qualquer coluna da própria linha, então uma coluna "creditos"
// solta ali deixaria qualquer pessoa se dar saldo infinito só chamando
// supabaseClient.from("perfis").update(...) pelo console. Em
// "creditos_conta" não existe NENHUMA permissão de escrita pra
// "authenticated" — só a função consumir_credito_proprio (RPC) consegue
// mexer no saldo, e só o da própria conta.
//
// Sem cobrança de verdade ainda (fora do escopo por enquanto) — o único
// jeito de uma conta GANHAR crédito hoje é você (administrando o banco)
// rodar "select public.conceder_credito('<uuid>', 2);" direto no SQL
// Editor do Supabase. Quando existir pagamento de verdade, ele passa a
// chamar essa mesma função; nada aqui precisa mudar.

async function obterSaldoCreditos(perfilId) {
  const { data, error } = await supabaseClient
    .from("creditos_conta")
    .select("saldo")
    .eq("perfil_id", perfilId)
    .maybeSingle();
  if (error) { console.error("Erro ao carregar saldo de créditos:", error); return 0; }
  return data ? data.saldo : 0;
}

async function consumirCreditoConta(perfilId) {
  const { data, error } = await supabaseClient.rpc("consumir_credito_proprio", { p_perfil_id: perfilId });
  if (error) return { consumiu: false, error };
  return { consumiu: !!data, error: null };
}
