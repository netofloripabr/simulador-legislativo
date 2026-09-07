// Aba "Bots" do painel do administrador (migração 36, 28/08/2026) —
// lista de referência por estado + regulação dos usuários fictícios.
// FASE 2 (migração 49, 07/09/2026): "Aplicar agora" cria/atualiza as
// contas na hora pela Edge Function "bots-aplicar" (chave service_role
// fica no servidor); o script local ferramentas/gerar_usuarios_ficticios.py
// continua funcionando como reserva. Progressão automática (bots
// iniciais + incremento por dia até o lote) e regra regressiva por
// estado ficam em bots_teto_ativo(uf), no banco. Tudo atrás de RLS
// admin-only — usuário comum nem enxerga as tabelas.

async function botsCarregarConfig(estado) {
  const { data, error } = await supabaseClient
    .from("bots_config").select("*").eq("estado", estado).maybeSingle();
  if (error) { console.error("Erro ao carregar bots_config:", error); return null; }
  // Padrões da especificação (155 contas, ±20%) quando o estado ainda não
  // tem linha — a linha só nasce no primeiro Salvar.
  return data || { estado, ligado: false, lote: 155, variacao_pct: 20, bots_iniciais: null, incremento_dia: null, progressao_inicio: null, geracao_solicitada_em: null, gerado_em: null, gerado_detalhe: null, aplicado_em: null, aplicado_detalhe: null, _semLinha: true };
}

// Salva a regulação. Progressão (bots_iniciais + incremento_dia) é
// opcional: com os dois preenchidos e sem data de início ainda, a data
// de início vira hoje (Brasília); com os dois vazios, a progressão sai e
// o teto volta a ser "lote − depósitos reais do estado".
async function botsSalvarConfig(cfg) {
  const temProgressao = cfg.bots_iniciais !== null && cfg.bots_iniciais !== undefined
    && cfg.incremento_dia !== null && cfg.incremento_dia !== undefined;
  const linha = {
    estado: cfg.estado, ligado: !!cfg.ligado, lote: cfg.lote, variacao_pct: cfg.variacao_pct,
    bots_iniciais: temProgressao ? cfg.bots_iniciais : null,
    incremento_dia: temProgressao ? cfg.incremento_dia : null,
    progressao_inicio: temProgressao ? (cfg.progressao_inicio || botsHojeBrasilia()) : null,
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from("bots_config").upsert(linha, { onConflict: "estado" });
  if (error) { console.error("Erro ao salvar bots_config:", error); return false; }
  return true;
}

// yyyy-mm-dd de hoje no fuso de Brasília — mesma régua de bots_teto_ativo.
function botsHojeBrasilia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Progressão automática calculada no cliente, igual à função SQL
// bots_teto_ativo (pra montar a barra "Dia N · X de lote ativos" mesmo
// antes de o banco responder). Devolve { dia, cotaDia, teto }:
//   dia     = dias desde progressao_inicio + 1 (dia 1 = início)
//   cotaDia = min(lote, iniciais + incremento × (dia − 1))  — sem
//             progressão configurada, = lote
//   teto    = max(0, cotaDia − depósitos reais do estado)
function botsProgressaoCalcular(cfg, depositosReaisUf) {
  const lote = Number(cfg.lote) || 155;
  const temProgressao = cfg.bots_iniciais !== null && cfg.bots_iniciais !== undefined
    && cfg.incremento_dia !== null && cfg.incremento_dia !== undefined && cfg.progressao_inicio;
  let dia = null, cotaDia = lote;
  if (temProgressao) {
    const hoje = new Date(botsHojeBrasilia() + "T00:00:00Z");
    const ini = new Date(String(cfg.progressao_inicio).slice(0, 10) + "T00:00:00Z");
    const dias = Math.max(0, Math.round((hoje - ini) / 86400000));
    dia = dias + 1;
    cotaDia = Math.min(lote, Number(cfg.bots_iniciais) + Number(cfg.incremento_dia) * dias);
  }
  return { dia, cotaDia, teto: Math.max(0, cotaDia - (Number(depositosReaisUf) || 0)), temProgressao: !!temProgressao };
}

// Teto de bots ativos na média pública do estado, direto do banco
// (função bots_teto_ativo, migração 49). null se a RPC falhar.
async function botsTetoAtivo(estado) {
  const { data, error } = await supabaseClient.rpc("bots_teto_ativo", { p_uf: estado });
  if (error) { console.error("Erro em bots_teto_ativo:", error); return null; }
  return Number(data);
}

// "Aplicar agora": Edge Function bots-aplicar cria/atualiza os bots do
// estado na hora (só admin passa no gate dela). Devolve o resumo
// { ok, detalhe, criados, atualizados, ... } ou { ok:false, mensagem }.
async function botsAplicarAgora(estado) {
  if (!supabaseClient) return { ok: false, mensagem: "Sem conexão com o servidor." };
  const { data, error } = await supabaseClient.functions.invoke("bots-aplicar", { body: { estado } });
  if (error || !data) {
    let mensagem = (data && data.erro) || (error && error.message) || "Não consegui aplicar os bots.";
    // FunctionsHttpError traz o corpo da resposta (com o "erro" legível) em context.
    try {
      if (error && error.context && typeof error.context.json === "function") {
        const corpo = await error.context.json();
        if (corpo && corpo.erro) mensagem = corpo.erro;
      }
    } catch (_) { /* corpo não era JSON */ }
    return { ok: false, mensagem };
  }
  if (data.erro) return { ok: false, mensagem: data.erro };
  return { ok: !!data.ok, ...data, mensagem: data.ok ? null : `Aplicado com erros: ${data.detalhe}` };
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
