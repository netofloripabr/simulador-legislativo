// Edge Function "bots-aplicar" — cria/atualiza na hora os usuários
// fictícios (bots) de um estado, a partir da aba Bots do painel admin
// (migração 49, decisão do usuário em 04-05/09/2026). Substitui o
// "rode ferramentas/gerar_usuarios_ficticios.py no computador": a chave
// service_role (que cria contas no Auth e ignora RLS) fica SÓ aqui no
// servidor — nunca no site. O script Python continua como reserva e usa
// exatamente a mesma regra de identidade, então os dois podem se revezar.
//
// Deploy: pelo MCP do Supabase (deploy_edge_function) ou painel → Edge
// Functions → "bots-aplicar" → cole este arquivo. verify_jwt ligado.
//
// Entrada:  POST { estado: "SC" }  com o Authorization da sessão do admin.
// Gate:     só quem passa na RPC sou_admin() (tabela admins) executa.
// Faz:      lê bots_config + referência ATIVA do estado → pra cada índice
//           1..lote: garante conta Auth (e-mail sintético), perfil
//           (eh_ficticio=true, indice_ficticio=N) e palpite com
//           rascunho_<cargo> variando ±variacao_pct por candidato →
//           grava aplicado_em/aplicado_detalhe, progressao_inicio (se
//           ainda null = hoje) e zera geracao_solicitada_em → registra em
//           execucoes_rotina → devolve o resumo.
// Idempotente: rodar 2x não duplica — bot identificado pelo índice
//           (índice único em perfis) e pelo e-mail sintético; se já
//           existe, só o palpite é regravado (nome/perfil ficam).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Mesmo domínio sintético do script Python (--dominio-email padrão).
const DOMINIO_EMAIL = "ficticios.simulalegis.com.br";
// Quantas contas processar em paralelo — o Auth aguenta bem 5 por vez e
// 155 contas ficam em ~30 s, dentro do limite da Edge Function.
const PARALELO = 5;

const NOMES_MASCULINOS = ["José", "João", "Antônio", "Francisco", "Marcos", "Paulo", "Carlos", "Luiz", "Pedro", "Rafael", "Rodrigo", "Fábio", "Gustavo", "André", "Bruno", "Daniel", "Felipe", "Diego", "Leandro", "Thiago"];
const NOMES_FEMININOS = ["Maria", "Ana", "Francisca", "Adriana", "Márcia", "Juliana", "Fernanda", "Patrícia", "Aline", "Camila", "Bruna", "Larissa", "Vanessa", "Tatiane", "Simone", "Renata", "Priscila", "Débora", "Cristina", "Sandra"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira", "Cardoso", "Teixeira", "Correia", "Machado", "Farias", "Pinto"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Candidato = { nome: string; chave?: string; votos: number };
type Partido = { nome: string; candidatos: Candidato[] };
type Referencia = Record<string, Partido[]>;

function sorteio<T>(lista: T[]): T { return lista[Math.floor(Math.random() * lista.length)]; }

// Senha determinística (e-mail+índice), igual ao Python: permite retomar
// um lote sem guardar senha em lugar nenhum. Não é usada pra logar —
// service_role cria a conta já confirmada — mas mantém as contas
// intercambiáveis com o script de reserva.
async function senhaDeterministica(email: string, indice: number): Promise<string> {
  const bytes = new TextEncoder().encode(`${email}-${indice}-seed`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 20) + "!Aa1";
}

// Mesmo formato que o site grava em rascunho_<cargo> (nuvem/palpites.js):
// partido → candidatos {nome, chave, votos, marcadoEleito, fonte}. A chave
// é preservada quando a referência tem (o Termômetro casa por chave).
function variarReferencia(partidos: Partido[], pct: number): Partido[] {
  return partidos.map((p) => ({
    nome: p.nome,
    candidatos: (p.candidatos || []).map((c) => {
      const fator = 1 + (Math.random() * 2 - 1) * pct;
      const cand: Record<string, unknown> = {
        nome: c.nome, votos: Math.max(0, Math.round((Number(c.votos) || 0) * fator)),
        marcadoEleito: false, fonte: "real",
      };
      if (c.chave) cand.chave = c.chave;
      return cand as unknown as Candidato;
    }),
  }));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function hojeBrasilia(): string {
  // yyyy-mm-dd no fuso de Brasília — mesma régua de bots_teto_ativo (SQL).
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);

  // ---- Gate: precisa estar logado E ser admin (RPC sou_admin com o JWT
  // da própria pessoa — a chave de serviço só entra depois disso).
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ erro: "Precisa estar logado." }, 401);
  const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return json({ erro: "Precisa estar logado." }, 401);
  const { data: ehAdmin, error: adminErr } = await authClient.rpc("sou_admin");
  if (adminErr || ehAdmin !== true) return json({ erro: "Acesso restrito a administradores." }, 403);

  let estado = "";
  try { estado = String((await req.json())?.estado || "").toUpperCase(); } catch { /* corpo vazio */ }
  if (!/^[A-Z]{2}$/.test(estado)) return json({ erro: "Estado inválido." }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const inicio = Date.now();

  try {
    const { data: cfgRow } = await admin.from("bots_config").select("*").eq("estado", estado).maybeSingle();
    const cfg = cfgRow || { estado, lote: 155, variacao_pct: 20, progressao_inicio: null };
    const lote = Number(cfg.lote) || 155;
    const pct = (Number(cfg.variacao_pct) || 20) / 100;

    const { data: refs } = await admin.from("bots_referencia").select("referencia").eq("estado", estado).eq("ativa", true).limit(1);
    const referencia: Referencia | null = refs && refs.length ? refs[0].referencia : null;
    if (!referencia || !Object.keys(referencia).length) {
      return json({ erro: `Nenhuma referência ATIVA pra ${estado} — aponte uma cédula ou lista salva na aba Bots primeiro.` }, 400);
    }
    const cargos = Object.keys(referencia).filter((cg) => Array.isArray(referencia[cg]) && referencia[cg].length);

    // Bots que já existem (qualquer UF) — índice é único no sistema.
    const { data: existentes } = await admin.from("perfis").select("id, indice_ficticio, uf_residencia").eq("eh_ficticio", true).not("indice_ficticio", "is", null);
    const porIndice = new Map<number, { id: string; uf: string | null }>();
    (existentes || []).forEach((p) => porIndice.set(Number(p.indice_ficticio), { id: p.id, uf: p.uf_residencia }));

    let criados = 0, atualizados = 0, conflitos = 0;
    const erros: string[] = [];
    const agora = new Date().toISOString();

    async function processar(indice: number) {
      const email = `ficticio.sel.${indice}@${DOMINIO_EMAIL}`;
      const rascunhos: Record<string, Partido[]> = {};
      cargos.forEach((cg) => { rascunhos[`rascunho_${cg}`] = variarReferencia(referencia![cg], pct); });

      let userId: string | null = null;
      const ja = porIndice.get(indice);
      if (ja) {
        if (ja.uf && ja.uf !== estado) { conflitos++; return; } // índice já é de outro estado — não rouba
        userId = ja.id;
      } else {
        // Conta Auth pode existir de uma rodada anterior que parou no meio
        // (signup ok, perfil não) — reaproveita em vez de duplicar.
        const { data: idExistente } = await admin.rpc("bots_auth_id_por_email", { p_email: email });
        if (idExistente) {
          userId = idExistente as string;
        } else {
          const { data: novo, error: erroAuth } = await admin.auth.admin.createUser({
            email, password: await senhaDeterministica(email, indice), email_confirm: true,
          });
          if (erroAuth || !novo?.user) { erros.push(`#${indice}: auth ${erroAuth?.message || "?"}`); return; }
          userId = novo.user.id;
        }
        const genero = Math.random() < 0.5 ? "Masculino" : "Feminino";
        const nome = `${sorteio(genero === "Masculino" ? NOMES_MASCULINOS : NOMES_FEMININOS)} ${sorteio(SOBRENOMES)}`;
        const { error: erroPerfil } = await admin.from("perfis").upsert({
          id: userId, nome, escopo: "assembleia", partido_escopo: null, modo_preenchimento: "detalhado",
          mostrar_nome: true, lgpd_aceite_em: agora, cep: "88000000", municipio_residencia: "Florianópolis",
          uf_residencia: estado, genero, eh_ficticio: true, indice_ficticio: indice,
        }, { onConflict: "id" });
        if (erroPerfil) { erros.push(`#${indice}: perfil ${erroPerfil.message}`); return; }
      }

      const { error: erroPalpite } = await admin.from("palpites").upsert({
        perfil_id: userId, candidatos: [], estado, atualizado_em: agora, ...rascunhos,
      }, { onConflict: "perfil_id" });
      if (erroPalpite) { erros.push(`#${indice}: palpite ${erroPalpite.message}`); return; }
      if (ja) atualizados++; else criados++;
    }

    for (let i = 1; i <= lote; i += PARALELO) {
      const fatia: Promise<void>[] = [];
      for (let k = i; k < Math.min(i + PARALELO, lote + 1); k++) fatia.push(processar(k));
      await Promise.all(fatia);
    }

    const segundos = Math.round((Date.now() - inicio) / 1000);
    const detalhe = `${lote} bots · ${criados} criados, ${atualizados} atualizados` +
      (conflitos ? `, ${conflitos} de outro estado (pulados)` : "") +
      (erros.length ? `, ${erros.length} erros` : "") + ` · ${segundos}s`;
    const sucesso = erros.length === 0;

    const { error: erroCfg } = await admin.from("bots_config").upsert({
      estado, lote, variacao_pct: cfg.variacao_pct ?? 20,
      aplicado_em: agora, aplicado_detalhe: detalhe,
      gerado_em: agora, gerado_detalhe: detalhe,
      progressao_inicio: cfg.progressao_inicio || hojeBrasilia(),
      geracao_solicitada_em: null, atualizado_em: agora,
    }, { onConflict: "estado" });
    if (erroCfg) console.error("bots_config upsert:", erroCfg);

    await admin.from("execucoes_rotina").insert({
      rotina: "bots-aplicar", sucesso,
      detalhe: `${estado}: ${detalhe}` + (erros.length ? ` — ${erros.slice(0, 5).join("; ")}` : ""),
    });

    return json({ ok: sucesso, estado, lote, criados, atualizados, conflitos, erros: erros.slice(0, 10), detalhe, progressao_inicio: cfg.progressao_inicio || hojeBrasilia() });
  } catch (e) {
    console.error(e);
    await admin.from("execucoes_rotina").insert({ rotina: "bots-aplicar", sucesso: false, detalhe: `${estado}: erro interno — ${String(e)}` });
    return json({ erro: "Erro interno ao aplicar os bots." }, 500);
  }
});
