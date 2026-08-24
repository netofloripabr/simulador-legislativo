// Edge Function "criar-pagamento" — colar no painel do Supabase
// (Edge Functions → New function → nome EXATO "criar-pagamento" → cole
// este código inteiro → Deploy). Precisa da secret MERCADOPAGO_ACCESS_
// TOKEN configurada em Edge Functions → Secrets (o valor vem do painel
// de desenvolvedor do Mercado Pago — "Credenciais de produção").
//
// O que ela faz: recebe do site qual pacote a pessoa quer comprar,
// registra um pedido "pendente" no banco (preço decidido AQUI, nunca
// confiando no que o navegador manda) e pede uma "preferência de
// pagamento" pro Mercado Pago — devolve pro site o link (init_point)
// pra onde redirecionar a pessoa. Quem credita o SL de verdade é a
// OUTRA função (webhook-mercadopago), só depois do pagamento confirmado.

import { createClient } from "npm:@supabase/supabase-js@2";

// Preço fixo no servidor — os mesmos 3 pacotes já mostrados na Loja
// (interface/prospeccao.js, renderLoja). Mudar valor aqui exige mudar
// os dois lugares (aqui é o que realmente cobra; a tela é só vitrine).
const PACOTES: Record<string, { sl: number; centavos: number; titulo: string }> = {
  p10: { sl: 10, centavos: 499, titulo: "SimulaLEGIS — 10 SL" },
  p50: { sl: 50, centavos: 2199, titulo: "SimulaLEGIS — 50 SL" },
  p200: { sl: 200, centavos: 7499, titulo: "SimulaLEGIS — 200 SL" },
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MP_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
// URL pública do site — pra onde o Mercado Pago manda a pessoa de volta
// depois de pagar (ou desistir). Ajuste se o domínio mudar.
const SITE_URL = "https://netofloripabr.github.io/simulador-legislativo";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Identifica quem está chamando pelo token da própria sessão do
    // usuário (não a chave de serviço) — é assim que sabemos que
    // perfil_id é realmente de quem está logado, não um valor que o
    // corpo da requisição poderia inventar.
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ erro: "Precisa estar logado." }), { status: 401, headers: CORS });
    }

    const { pacote } = await req.json();
    const escolha = PACOTES[pacote];
    if (!escolha) {
      return new Response(JSON.stringify({ erro: "Pacote inválido." }), { status: 400, headers: CORS });
    }

    // Chave de serviço só existe aqui dentro (nunca no navegador) —
    // ignora RLS de propósito pra escrever o pedido em nome do usuário.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    // registrar_pedido_pagamento devolve UMA linha (não setof) — o
    // PostgREST às vezes entrega isso como objeto direto, às vezes como
    // array de 1; o resto do projeto já lida com essa mesma
    // inconsistência (ver adminConcederCreditosPorEmail, nuvem/
    // creditos.js), então repete a mesma defesa aqui.
    const { data: pedidoRaw, error: pedidoErr } = await admin.rpc("registrar_pedido_pagamento", {
      p_perfil_id: userData.user.id, p_pacote_sl: escolha.sl, p_valor_centavos: escolha.centavos,
    });
    const pedido = Array.isArray(pedidoRaw) ? pedidoRaw[0] : pedidoRaw;
    if (pedidoErr || !pedido) {
      console.error("registrar_pedido_pagamento falhou:", pedidoErr);
      return new Response(JSON.stringify({ erro: "Não consegui registrar o pedido." }), { status: 500, headers: CORS });
    }

    const prefResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      body: JSON.stringify({
        items: [{ title: escolha.titulo, quantity: 1, currency_id: "BRL", unit_price: escolha.centavos / 100 }],
        external_reference: pedido.id,
        notification_url: `${SUPABASE_URL}/functions/v1/webhook-mercadopago`,
        back_urls: {
          success: `${SITE_URL}/?compra=ok`,
          failure: `${SITE_URL}/?compra=falhou`,
          pending: `${SITE_URL}/?compra=pendente`,
        },
        auto_return: "approved",
      }),
    });
    const pref = await prefResp.json();
    if (!prefResp.ok || !pref.init_point) {
      console.error("Erro do Mercado Pago:", pref);
      return new Response(JSON.stringify({ erro: "O Mercado Pago recusou o pedido — tente de novo em instantes." }), { status: 502, headers: CORS });
    }

    await admin.rpc("marcar_preferencia_pedido", { p_pedido_id: pedido.id, p_preferencia: pref.id });

    return new Response(JSON.stringify({ init_point: pref.init_point }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ erro: "Erro interno." }), { status: 500, headers: CORS });
  }
});
