// Edge Function `apuracao-tse` — coleta a apuração do painel de resultados
// do TSE e publica pro app (Fase 6, Resultados). Ver nuvem/migracao-54.
//
// Chamada pelo pg_cron a cada 20 s (public.apuracao_chamar_rotina, migração 59) com o
// header x-rotina-token; também aceita chamada manual (mesmo header) pra
// "rodar agora". Sem token válido → 401.
//
// Fluxo por cargo (1 Presidente, 3 Governador, 5 Senador, 6 Dep. Federal, 7 Dep. Estadual):
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

// cargo TSE -> [nome no app, eleição]. Governador sai na mesma eleição dos
// deputados/senador (apuracao_cd_eleicao); Presidente é outra eleição
// (apuracao_cd_eleicao_pres). Desde 02/10/2026.
const CARGOS: Record<string, [string, string]> = { "7": ["estadual", "est"], "6": ["federal", "est"], "5": ["senador", "est"], "3": ["governador", "est"], "1": ["presidente", "pres"] };

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
  const cdPres = cfg.apuracao_cd_eleicao_pres || "";
  const resumo: Record<string, unknown> = {};
  let todosFinais = true;

  for (const [cdCargo, [cargo, qual]] of Object.entries(CARGOS)) {
    const cdE = qual === "pres" ? cdPres : cd;
    if (!cdE) { resumo[cargo] = "sem código de eleição"; continue; }
    // 2026: o TSE publica .../dados/{uf}/{uf}-c000{cargo}-e{cd}-u.json (formato novo,
    // achado no dia da eleição, 04/10/2026); o -r.json de dados-simplificados (2022) fica de reserva.
    const pad = cdE.padStart(6, "0");
    const urls = [
      `https://resultados.tse.jus.br/oficial/ele${ano}/${cdE}/dados/${ufl}/${ufl}-c000${cdCargo}-e${pad}-u.json`,
      `https://resultados.tse.jus.br/oficial/ele${ano}/${cdE}/dados-simplificados/${ufl}/${ufl}-c000${cdCargo}-e${pad}-r.json`,
    ];
    let tse: any = null, url = "";
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: { "User-Agent": "SimulaLEGIS/1.0 (apuracao)" } });
        if (r.ok) { tse = await r.json(); url = u; break; }
      } catch (_e) { /* tenta o próximo */ }
    }
    if (!tse) { resumo[cargo] = "HTTP 404"; todosFinais = false; continue; }
    const geracao = `${tse.dg} ${tse.hg}`;
    const { data: st } = await sb.from("apuracao_status").select("dg, hg").eq("ano", ano).eq("uf", uf).eq("cargo", cargo).maybeSingle();
    if (st && `${st.dg} ${st.hg}` === geracao && !forcar) { resumo[cargo] = "sem mudança"; if (tse.tf !== "s") todosFinais = false; continue; }

    const num = (s: string) => Number(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0;
    let candsTse: any[] = [], legenda: Record<string, number> = {}, S: any, E: any, V: any, vagas = 0;
    if (tse.carg) {
      // formato novo: carg[0].agr[].par[].cand[]; federação pela sigla (fed[].sg)
      const cg = tse.carg[0] || {};
      vagas = num(cg.nv);
      const fedSg: Record<string, string> = {};
      (cg.fed || []).forEach((f: any) => { fedSg[String(f.n)] = String(f.sg || "").replace(/\s*\/\s*/g, " / "); });
      (cg.agr || []).forEach((a: any) => (a.par || []).forEach((p: any) => {
        const sig = (p.nfed && fedSg[String(p.nfed)]) || p.sg || a.com || "";
        if (num(p.tvtl)) legenda[sig] = (legenda[sig] || 0) + num(p.tvtl);
        (p.cand || []).forEach((c: any) => candsTse.push({ sqcand: c.sqcand, n: c.n, nm: c.nmu || c.nm, cc: sig, vap: c.vap, pvap: c.pvap, st: c.st, e: c.e }));
      }));
      S = tse.s || {}; E = tse.e || {}; V = tse.v || {};
    } else {
      candsTse = tse.cand || []; vagas = num(tse.v);
      S = { ts: tse.s, st: tse.st, pst: tse.pst }; E = { te: tse.e, c: tse.c, a: tse.a }; V = { vv: tse.vv, vb: tse.vb, tvn: tse.tvn || tse.vn, vnom: tse.vnom };
    }
    const cands = candsTse.map((c: any) => ({
      ano, uf, cargo, sq: String(c.sqcand), numero: String(c.n), nome_urna: c.nm, partido: String(c.cc || "").split(" - ")[0].trim(),
      votos: num(c.vap), pct: num(c.pvap), situacao: c.st || "", eleito: c.e === "s", atualizado_em: new Date().toISOString(),
    }));
    const status = {
      ano, uf, cargo, secoes_total: num(S.ts), secoes_totalizadas: num(S.st), pct_secoes: num(S.pst),
      eleitorado: num(E.te), votos_validos: num(V.vv), votos_nominais: num(V.vnom), vagas, qe: null,
      final: tse.tf === "s", dg: tse.dg, hg: tse.hg, fonte: url, atualizado_em: new Date().toISOString(),
    };
    const e1 = await sb.from("apuracao_status").upsert(status);
    const e2 = cands.length ? await sb.from("apuracao_candidato").upsert(cands) : { error: null };
    // JSON consolidado no formato de dados/resultados/{uf}-{ano}/{cargo}.json
    const arquivo = {
      ano, cargo, aoVivo: true,
      meta: { pctSecoes: status.pct_secoes, secoesTotalizadas: status.secoes_totalizadas, secoesTotal: status.secoes_total, final: status.final, eleitorado: num(E.te), comparecimento: num(E.c), abstencao: num(E.a), brancos: num(V.vb), nulos: num(V.tvn), validos: num(V.vv), vagas, legenda, geradoEm: geracao, atualizadoEm: status.atualizado_em, fonte: url },
      candidatos: cands.sort((a: any, b: any) => b.votos - a.votos).map((c: any) => ({
        sq: c.sq, nome: c.nome_urna, nomeUrna: c.nome_urna, numero: c.numero, partido: c.partido,
        situacao: (c.situacao || "").toUpperCase(), eleito: c.eleito, total: c.votos, municipios: {},
      })),
    };
    const up = await sb.storage.from("apuracao").upload(`${ufl}-${ano}/${cargo}.json`, new Blob([JSON.stringify(arquivo)], { type: "application/json" }), { upsert: true, contentType: "application/json", cacheControl: "10" });
    resumo[cargo] = { candidatos: cands.length, pct: status.pct_secoes, final: status.final, erros: [e1.error?.message, e2.error?.message, up.error?.message].filter(Boolean) };
  }

  if (todosFinais && cfg.apuracao_ativa === "true") {
    await sb.from("config_app").update({ valor: "false", atualizado_em: new Date().toISOString() }).eq("chave", "apuracao_ativa");
    resumo.desligou = "totalização final em todos os cargos";
  }
  await sb.from("execucoes_rotina").insert({ rotina: "apuracao-tse", sucesso: !Object.values(resumo).some((v) => typeof v === "string" && /HTTP|falha/.test(v)), detalhe: JSON.stringify(resumo).slice(0, 2000) });
  return new Response(JSON.stringify({ ok: true, ano, cd, uf, resumo }), { headers: { "Content-Type": "application/json" } });
});
