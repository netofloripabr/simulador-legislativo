// Edge Function `apuracao-tse` — coleta a apuração do painel de resultados
// do TSE e publica pro app (Fase 6, Resultados). Ver nuvem/migracao-54.
//
// Chamada pelo pg_cron a cada minuto (public.apuracao_chamar_rotina) com o
// header x-rotina-token; também aceita chamada manual (mesmo header) pra
// "rodar agora". Sem token válido → 401.
//
// Fluxo por cargo (5 Senador, 6 Dep. Federal, 7 Dep. Estadual):
//   1. GET https://resultados.tse.jus.br/oficial/ele{ano}/{cd}/dados-simplificados/{uf}/{uf}-c000{cargo}-e000{cd}-r.json
//   2. Se dg/hg (geração no TSE) não mudou desde a última gravação → pula.
//   3. Upsert em apuracao_status + apuracao_candidato.
//   4. Publica storage://apuracao/{uf}-{ano}/{cargo}.json no formato de
//      dados/resultados/{uf}-{ano}/{cargo}.json (+ campo `meta`).
//   5. Registra em execucoes_rotina.
// Quando todos os cargos estão com 100% e "tf":"s" (totalização final), a
// função desliga apuracao_ativa sozinha.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CARGOS: Record<string, string> = { "7": "estadual", "6": "federal", "5": "senador" };

Deno.serve(async (req: Request) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Token na tabela config_privada (RLS sem policy = só a service role lê).
  const token = req.headers.get("x-rotina-token") || "";
  const { data: sec } = await sb.from("config_privada").select("valor").eq("chave", "apuracao_rotina_token").maybeSingle();
  if (!sec || !sec.valor || token !== sec.valor) {
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const { data: cfgRows } = await sb.from("config_app").select("chave, valor").like("chave", "apuracao_%");
  const cfg: Record<string, string> = {};
  (cfgRows || []).forEach((r: { chave: string; valor: string }) => { cfg[r.chave] = r.valor; });
  const forcar = new URL(req.url).searchParams.get("forcar") === "1";
  if (cfg.apuracao_ativa !== "true" && !forcar) {
    return new Response(JSON.stringify({ ok: true, pulado: "apuracao_ativa=false" }), { headers: { "Content-Type": "application/json" } });
  }
  const ano = Number(cfg.apuracao_ano || "2026");
  const cd = cfg.apuracao_cd_eleicao || "";
  const uf = (cfg.apuracao_uf || "SC").toUpperCase();
  const ufl = uf.toLowerCase();
  const cdPad = cd.padStart(6, "0");
  const resumo: Record<string, unknown> = {};
  let todosFinais = true;

  for (const [cdCargo, cargo] of Object.entries(CARGOS)) {
    const url = `https://resultados.tse.jus.br/oficial/ele${ano}/${cd}/dados-simplificados/${ufl}/${ufl}-c000${cdCargo}-e${cdPad}-r.json`;
    let tse: any;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "SimulaLEGIS/1.0 (apuracao)" } });
      if (!r.ok) { resumo[cargo] = `HTTP ${r.status}`; todosFinais = false; continue; }
      tse = await r.json();
    } catch (e) {
      resumo[cargo] = "falha: " + String(e); todosFinais = false; continue;
    }
    const geracao = `${tse.dg} ${tse.hg}`;
    const { data: st } = await sb.from("apuracao_status").select("dg, hg").eq("ano", ano).eq("uf", uf).eq("cargo", cargo).maybeSingle();
    if (st && `${st.dg} ${st.hg}` === geracao && !forcar) { resumo[cargo] = "sem mudança"; if (tse.tf !== "s") todosFinais = false; continue; }

    const num = (s: string) => Number(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0;
    const cands = (tse.cand || []).map((c: any) => ({
      ano, uf, cargo, sq: String(c.sqcand), numero: String(c.n), nome_urna: c.nm, partido: String(c.cc || "").split(" - ")[0].trim(),
      votos: num(c.vap), pct: num(c.pvap), situacao: c.st || "", eleito: c.e === "s", atualizado_em: new Date().toISOString(),
    }));
    const status = {
      ano, uf, cargo, secoes_total: num(tse.s), secoes_totalizadas: num(tse.st), pct_secoes: num(tse.pst),
      eleitorado: num(tse.e), votos_validos: num(tse.vv), votos_nominais: num(tse.vnom), vagas: num(tse.v), qe: null,
      final: tse.tf === "s", dg: tse.dg, hg: tse.hg, fonte: url, atualizado_em: new Date().toISOString(),
    };
    if (tse.tf !== "s") todosFinais = false;
    const e1 = await sb.from("apuracao_status").upsert(status);
    const e2 = cands.length ? await sb.from("apuracao_candidato").upsert(cands) : { error: null };
    // JSON consolidado no formato de dados/resultados/{uf}-{ano}/{cargo}.json
    const arquivo = {
      ano, cargo, aoVivo: true,
      meta: { pctSecoes: status.pct_secoes, secoesTotalizadas: status.secoes_totalizadas, secoesTotal: status.secoes_total, final: status.final, geradoEm: geracao, atualizadoEm: status.atualizado_em, fonte: url },
      candidatos: cands.sort((a: any, b: any) => b.votos - a.votos).map((c: any) => ({
        sq: c.sq, nome: c.nome_urna, nomeUrna: c.nome_urna, numero: c.numero, partido: c.partido,
        situacao: (c.situacao || "").toUpperCase(), total: c.votos, municipios: {},
      })),
    };
    const up = await sb.storage.from("apuracao").upload(`${ufl}-${ano}/${cargo}.json`, new Blob([JSON.stringify(arquivo)], { type: "application/json" }), { upsert: true, contentType: "application/json", cacheControl: "30" });
    resumo[cargo] = { candidatos: cands.length, pct: status.pct_secoes, final: status.final, erros: [e1.error?.message, e2.error?.message, up.error?.message].filter(Boolean) };
  }

  if (todosFinais && cfg.apuracao_ativa === "true") {
    await sb.from("config_app").update({ valor: "false", atualizado_em: new Date().toISOString() }).eq("chave", "apuracao_ativa");
    resumo.desligou = "totalização final em todos os cargos";
  }
  await sb.from("execucoes_rotina").insert({ rotina: "apuracao-tse", sucesso: !Object.values(resumo).some((v) => typeof v === "string" && /HTTP|falha/.test(v)), detalhe: JSON.stringify(resumo).slice(0, 2000) });
  return new Response(JSON.stringify({ ok: true, ano, cd, uf, resumo }), { headers: { "Content-Type": "application/json" } });
});
