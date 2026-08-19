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

// ===== Economia fase 1 (migração 21, MONETIZACAO.md v3) =====

// Extrato da PRÓPRIA conta (RLS só devolve as linhas do próprio usuário).
async function obterExtratoCreditos(perfilId, limite) {
  const { data, error } = await supabaseClient
    .from("transacoes_creditos")
    .select("criado_em, tipo, valor, saldo_apos, referencia")
    .eq("perfil_id", perfilId)
    .order("criado_em", { ascending: false })
    .limit(limite || 50);
  if (error) { console.error("Erro ao carregar extrato:", error); return null; }
  return data || [];
}

// Rótulos em português dos tipos do ledger — compartilhado entre o extrato
// do usuário (modal Créditos no Menu) e a aba do admin.
const ROTULO_TRANSACAO = {
  gasto: "Uso (lista/grupo extra)",
  ganho_admin: "Crédito concedido",
  ajuste_admin: "Ajuste",
  ganho_convite: "Convite convertido",
  ganho_marco: "Marco de presença",
  compra: "Compra de pacote",
  gasto_vaga: "Vaga de grupo",
  gasto_edicao: "Edição de cédula",
  gasto_cedula: "Nova cédula",
  gasto_mediana: "Aceleração da mediana",
  gasto_patrocinio: "Patrocínio a convidado",
  estorno: "Estorno",
};

// --- Admin (todas exigem sou_admin() no banco; erro vira mensagem) ---
async function adminConcederCreditosPorEmail(email, quantidade, motivo) {
  const { data, error } = await supabaseClient.rpc("admin_conceder_creditos_por_email", {
    p_email: email, p_quantidade: quantidade, p_motivo: motivo || null,
  });
  if (error) return { ok: false, mensagem: error.message };
  const linha = Array.isArray(data) ? data[0] : data;
  return { ok: true, nome: linha.nome, novoSaldo: linha.novo_saldo, aplicado: linha.aplicado };
}

async function adminExtratoGeral(limite) {
  const { data, error } = await supabaseClient.rpc("admin_extrato_geral", { p_limite: limite || 50 });
  if (error) { console.error("Erro no extrato geral:", error); return null; }
  return data || [];
}

async function adminSaldos(limite) {
  const { data, error } = await supabaseClient.rpc("admin_saldos", { p_limite: limite || 100 });
  if (error) { console.error("Erro nos saldos:", error); return null; }
  return data || [];
}

// Gasta N créditos da própria conta (migração 22) — abrir 2º grupo (10),
// nova cédula depositada (70) etc. Devolve gastou=false se saldo
// insuficiente (nada é debitado nem registrado nesse caso).
async function gastarCreditosConta(perfilId, quantidade, tipo, referencia) {
  const { data, error } = await supabaseClient.rpc("gastar_creditos_proprio", {
    p_perfil_id: perfilId, p_quantidade: quantidade, p_tipo: tipo, p_referencia: referencia || null,
  });
  if (error) return { gastou: false, error };
  return { gastou: !!data, error: null };
}

// Mediana em conta-gotas (migração 23): registra o dia de acesso (+2
// linhas/dia, idempotente) e devolve o total revelado da conta.
async function registrarAcessoMediana() {
  const { data, error } = await supabaseClient.rpc("registrar_acesso_mediana");
  if (error) { console.error("Erro no acesso à mediana:", error); return null; }
  return data;
}

// Acelera a revelação: 2 créditos = +10 linhas. Devolve { linhas } ou
// { semSaldo: true } — null em data significa saldo insuficiente.
async function acelerarMediana() {
  const { data, error } = await supabaseClient.rpc("acelerar_mediana");
  if (error) return { erro: error.message };
  if (data === null) return { semSaldo: true };
  return { linhas: data };
}
