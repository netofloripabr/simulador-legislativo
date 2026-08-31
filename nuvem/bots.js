// Aba "Bots" do painel do administrador (migração 36, 28/08/2026) —
// lista de referência por estado + regulação dos usuários fictícios.
// FASE 1: o painel só grava referência/config no Supabase; a geração das
// contas continua no script local ferramentas/gerar_usuarios_ficticios.py,
// que lê daqui. Tudo atrás de RLS admin-only — usuário comum nem enxerga
// as tabelas.

async function botsCarregarConfig(estado) {
  const { data, error } = await supabaseClient
    .from("bots_config").select("*").eq("estado", estado).maybeSingle();
  if (error) { console.error("Erro ao carregar bots_config:", error); return null; }
  // Padrões da especificação (155 contas, ±20%) quando o estado ainda não
  // tem linha — a linha só nasce no primeiro Salvar.
  return data || { estado, ligado: false, lote: 155, variacao_pct: 20, geracao_solicitada_em: null, gerado_em: null, gerado_detalhe: null, _semLinha: true };
}

async function botsSalvarConfig(cfg) {
  const { error } = await supabaseClient.from("bots_config").upsert({
    estado: cfg.estado, ligado: !!cfg.ligado, lote: cfg.lote, variacao_pct: cfg.variacao_pct,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "estado" });
  if (error) { console.error("Erro ao salvar bots_config:", error); return false; }
  return true;
}

async function botsSolicitarGeracao(estado) {
  // Garante a linha (upsert) e carimba o pedido — o script local lê esse
  // carimbo como "pode rodar" e o limpa quando conclui.
  const { error } = await supabaseClient.from("bots_config").upsert({
    estado, geracao_solicitada_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "estado" });
  if (error) { console.error("Erro ao solicitar geração:", error); return false; }
  return true;
}

async function botsCarregarReferencias(estado) {
  const { data, error } = await supabaseClient
    .from("bots_referencia")
    .select("id, estado, salvamento_id, ativa, criado_em, referencia")
    .eq("estado", estado)
    .order("criado_em", { ascending: false })
    .limit(6);
  if (error) { console.error("Erro ao carregar bots_referencia:", error); return []; }
  return data || [];
}

// Fontes possíveis pra referência (pedido do usuário, 31/08/2026): tanto a
// cédula DEPOSITADA quanto uma LISTA SALVA comum servem — o admin escolhe.
// Lista as do próprio admin naquele estado, depositadas primeiro.
async function botsListarFontesReferencia(estado) {
  const sessao = await supabaseClient.auth.getUser();
  const uid = sessao && sessao.data && sessao.data.user ? sessao.data.user.id : null;
  if (!uid) return [];
  const { data, error } = await supabaseClient
    .from("salvamentos")
    .select("id, nome, estado, depositado_em, criado_em")
    .eq("perfil_id", uid).eq("estado", estado)
    .order("criado_em", { ascending: false })
    .limit(20);
  if (error) { console.error("Erro ao listar fontes de referência:", error); return []; }
  return (data || []).sort((a, b) => (b.depositado_em ? 1 : 0) - (a.depositado_em ? 1 : 0));
}

// Grava um salvamento específico (cédula depositada OU lista salva) como a
// nova referência ativa do estado, desativando a anterior.
async function botsUsarSalvamentoComoReferencia(estado, salvamentoId) {
  const sessao = await supabaseClient.auth.getUser();
  const uid = sessao && sessao.data && sessao.data.user ? sessao.data.user.id : null;
  if (!uid) return { ok: false, mensagem: "Sessão expirada — entre de novo." };
  const { data: salvamentos, error: erroSalv } = await supabaseClient
    .from("salvamentos")
    .select("id, nome, estado, depositado_em")
    .eq("perfil_id", uid).eq("id", salvamentoId).limit(1);
  if (erroSalv || !salvamentos || !salvamentos.length) return { ok: false, mensagem: "Não encontrei esse salvamento." };
  const salv = salvamentos[0];

  const { data: listas, error: erroListas } = await supabaseClient
    .from("listas_salvas").select("cargo, candidatos").eq("salvamento_id", salv.id);
  if (erroListas || !listas || !listas.length) {
    return { ok: false, mensagem: "Não consegui ler os cargos desse salvamento." };
  }
  const referencia = {};
  listas.forEach((l) => {
    referencia[l.cargo] = (l.candidatos || []).map((p) => ({
      nome: p.nome,
      candidatos: (p.candidatos || [])
        .filter((c) => c.fonte !== "legenda")
        .map((c) => ({ nome: c.nome, chave: c.chave, votos: Number(c.votos) || 0 })),
    }));
  });

  const { error: erroDesativa } = await supabaseClient
    .from("bots_referencia").update({ ativa: false }).eq("estado", estado).eq("ativa", true);
  if (erroDesativa) { console.error("Erro ao desativar referência anterior:", erroDesativa); return { ok: false, mensagem: "Erro ao trocar a referência: " + erroDesativa.message }; }

  const { error: erroInsere } = await supabaseClient.from("bots_referencia").insert({
    estado, salvamento_id: salv.id, referencia, ativa: true,
  });
  if (erroInsere) { console.error("Erro ao gravar referência:", erroInsere); return { ok: false, mensagem: "Erro ao gravar a referência: " + erroInsere.message }; }
  return { ok: true, nome: salv.nome, depositadaEm: salv.depositado_em };
}

// "Usar minha cédula depositada como referência": pega a cédula DEPOSITADA
// do próprio admin naquele estado (a mais recente, se houver mais de uma),
// monta o snapshot {estadual, federal, senador} no formato que o script
// gerador já entende e grava como a nova referência ativa (desativando a
// anterior). Regra mestra do produto: referência é sempre cédula
// depositada de verdade — se não houver, devolve o motivo em vez de gravar.
async function botsUsarMinhaCedulaComoReferencia(estado) {
  const sessao = await supabaseClient.auth.getUser();
  const uid = sessao && sessao.data && sessao.data.user ? sessao.data.user.id : null;
  if (!uid) return { ok: false, mensagem: "Sessão expirada — entre de novo." };

  const { data: salvamentos, error: erroSalv } = await supabaseClient
    .from("salvamentos")
    .select("id, nome, estado, depositado_em")
    .eq("perfil_id", uid).eq("estado", estado)
    .not("depositado_em", "is", null)
    .order("depositado_em", { ascending: false })
    .limit(1);
  if (erroSalv) { console.error("Erro ao buscar cédula:", erroSalv); return { ok: false, mensagem: "Erro ao buscar sua cédula: " + erroSalv.message }; }
  if (!salvamentos || !salvamentos.length) {
    return { ok: false, mensagem: `Você ainda não tem cédula depositada em ${estado}. Deposite a sua cédula primeiro — a referência dos bots é sempre uma cédula de verdade.` };
  }
  const salv = salvamentos[0];

  const { data: listas, error: erroListas } = await supabaseClient
    .from("listas_salvas").select("cargo, candidatos").eq("salvamento_id", salv.id);
  if (erroListas || !listas || !listas.length) {
    return { ok: false, mensagem: "Não consegui ler os cargos da cédula." };
  }
  // Mesmo formato que gerar_usuarios_ficticios.py lê: por cargo, lista de
  // partidos com candidatos {nome, votos}. Voto de legenda fica de fora
  // (o gerador varia candidato a candidato).
  const referencia = {};
  listas.forEach((l) => {
    referencia[l.cargo] = (l.candidatos || []).map((p) => ({
      nome: p.nome,
      candidatos: (p.candidatos || [])
        .filter((c) => c.fonte !== "legenda")
        .map((c) => ({ nome: c.nome, chave: c.chave, votos: Number(c.votos) || 0 })),
    }));
  });

  const { error: erroDesativa } = await supabaseClient
    .from("bots_referencia").update({ ativa: false }).eq("estado", estado).eq("ativa", true);
  if (erroDesativa) { console.error("Erro ao desativar referência anterior:", erroDesativa); return { ok: false, mensagem: "Erro ao trocar a referência: " + erroDesativa.message }; }

  const { error: erroInsere } = await supabaseClient.from("bots_referencia").insert({
    estado, salvamento_id: salv.id, referencia, ativa: true,
  });
  if (erroInsere) { console.error("Erro ao gravar referência:", erroInsere); return { ok: false, mensagem: "Erro ao gravar a referência: " + erroInsere.message }; }
  return { ok: true, nomeCedula: salv.nome, depositadaEm: salv.depositado_em };
}
