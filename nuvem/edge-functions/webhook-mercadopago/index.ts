// Edge Function "webhook-mercadopago" — colar no painel do Supabase
// (Edge Functions → New function → nome EXATO "webhook-mercadopago" →
// cole este código → Deploy). Depois do deploy, em Settings desta
// função, DESLIGUE "Verify JWT" — o Mercado Pago chama esta URL sem
// token de login nenhum, então a verificação padrão bloquearia tudo.
//
// Segurança não vem do JWT aqui — vem de NUNCA confiar no corpo da
// notificação. Ela só diz "olha, algo mudou no pagamento X"; a
// confirmação de verdade é buscar o pagamento DIRETO na API do Mercado
// Pago usando o Access Token secreto, que só existe neste servidor.
// Alguém forjando uma chamada pra essa URL não consegue fazer o
// Mercado Pago "confirmar" um pagamento que não existe.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

Deno.serve(async (req) => {
  // O Mercado Pago manda o id do pagamento tanto na query string
  // (?data.id=123&type=payment, formato mais comum) quanto no corpo
  // (formato IPN antigo) — aceita os dois pra não depender de qual
  // config a conta está usando.
  let paymentId: string | null = null;
  try {
    const url = new URL(req.url);
    paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
    if (!paymentId && req.method === "POST") {
      const body = await req.json().catch(() => null);
      paymentId = body?.data?.id ? String(body.data.id) : null;
    }
  } catch (e) { /* segue com paymentId null — respondido abaixo */ }

  if (!paymentId) {
    // Mercado Pago manda outras notificações também (ex.: teste do
    // painel) — responde 200 sem fazer nada em vez de dar erro.
    return new Response("ok", { status: 200 });
  }

  try {
    const pagResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!pagResp.ok) {
      console.error("Não consegui confirmar o pagamento", paymentId, await pagResp.text());
      return new Response("ok", { status: 200 }); // MP reenvia sozinho se for problema passageiro
    }
    const pagamento = await pagResp.json();
    const pedidoId = pagamento.external_reference;
    if (!pedidoId) return new Response("ok", { status: 200 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (pagamento.status === "approved") {
      const { data: creditou, error } = await admin.rpc("aprovar_pedido_pagamento", {
        p_pedido_id: pedidoId, p_pagamento_id: String(pagamento.id),
      });
      if (error) console.error("Erro ao aprovar pedido:", error);
      else console.log(`Pedido ${pedidoId} — creditado: ${creditou}`);
    } else if (["rejected", "cancelled"].includes(pagamento.status)) {
      await admin.rpc("rejeitar_pedido_pagamento", { p_pedido_id: pedidoId });
    }
    // "pending"/"in_process" (ex.: boleto, PIX ainda não compensado): não
    // faz nada — o Mercado Pago manda uma notificação nova quando mudar.

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("ok", { status: 200 }); // sempre 200 pro MP não ficar retentando em loop por erro nosso
  }
});
