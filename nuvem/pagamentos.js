// Cobrança real da Loja (migração 29 + Edge Functions em
// nuvem/edge-functions/). O site NUNCA credita SL sozinho — só chama a
// função "criar-pagamento" (que registra o pedido e devolve o link do
// Mercado Pago) e redireciona. Quem credita de verdade é o webhook,
// rodando no servidor, depois de confirmar o pagamento com o Mercado
// Pago — ver os comentários nos próprios arquivos da Edge Function.

const PACOTES_SL = {
  p10: { sl: 10, preco: "R$ 4,99" },
  p50: { sl: 50, preco: "R$ 21,99" },
  p200: { sl: 200, preco: "R$ 74,99" },
};

// Devolve { ok:true } e já redireciona o navegador, ou { ok:false, mensagem }.
async function iniciarCompraSL(pacoteId) {
  if (!supabaseClient) return { ok: false, mensagem: "Sem conexão com o servidor." };
  const { data, error } = await supabaseClient.functions.invoke("criar-pagamento", {
    body: { pacote: pacoteId },
  });
  if (error || !data || !data.init_point) {
    const mensagem = (data && data.erro) || (error && error.message) || "Não deu pra iniciar o pagamento.";
    return { ok: false, mensagem };
  }
  window.location.href = data.init_point;
  return { ok: true };
}
