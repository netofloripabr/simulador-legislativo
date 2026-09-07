// Painel do administrador (usuários, problemas, erros, pesquisa, financeiro,
// rotinas/migrações, bots, analítico, histórico de ações) e painel do
// usuário final. Ordem de carga no index.html.

// ---------- Painel do administrador ----------
// Acesso restrito por pcState.souAdmin (carregado em initColaborativo via
// souAdmin(), que só é true se a conta estiver na tabela "admins" —
// migração 18). Cada seção busca seus próprios dados sob demanda; nada é
// pré-carregado pra quem não é admin.

const ROTULO_TIPO_CONTA = { admin: "Admin", usuario_final: "Usuário final", padrao: "Padrão" };

async function montarAdminUsuarios() {
  const stats = await adminEstatisticasUsuarios();
  if (!stats) return `<div class="pc-sub">Não consegui carregar as estatísticas.</div>`;
  // Padrão 8.1: métrica em cartão de tom (mesmo .pc-metric do Painel
  // Eleitoral), não mais glass-card avulso.
  const cartao = (label, valor) => `
    <div class="pc-metric" style="text-align:center;">
      <div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${Number(valor || 0).toLocaleString("pt-BR")}</div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">${label}</div>
    </div>`;

  const f = pcState.adminUsuariosFiltro || {};
  // Lista individual abaixo do painel analítico, com filtro por categoria
  // (gênero/UF/período/status de cédula/tipo de conta) — mesma linguagem
  // visual do "relatório" já usada no documento impresso e no extrato do
  // Financeiro: nome em destaque + linha de metadados discreta + métrica
  // alinhada à direita (pedido do usuário, 24/08/2026).
  let listaHtml = "";
  if (pcState.adminUsuariosResultados) {
    const linhas = pcState.adminUsuariosResultados;
    listaHtml = !linhas.length
      ? estadoVazio({ icone: "buscar", titulo: "Nenhum usuário encontrado", texto: "Ninguém bateu com esses filtros — tenta afrouxar o recorte." })
      : `
      <div class="pc-sub" style="margin:14px 0 8px;">${linhas.length} conta${linhas.length === 1 ? "" : "s"} encontrada${linhas.length === 1 ? "" : "s"}${linhas.length === 200 ? " (mostrando as 200 mais recentes)" : ""}</div>
      <div class="pc-lobby-card">${linhas.map((u) => `
        <div class="pc-lobby-linha" style="align-items:flex-start;">
          <span style="min-width:0;">
            <div style="font-size:12.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${u.nome}${u.tipo_conta !== "padrao" ? ` <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:#07230C; background:var(--pc-accent); border-radius:999px; padding:1px 6px;">${ROTULO_TIPO_CONTA[u.tipo_conta]}</span>` : ""}</div>
            <div style="font-size:10.5px; color:var(--pc-ink-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${u.email}</div>
            <div style="font-size:10px; color:var(--pc-ink-faint); margin-top:2px;">${u.genero || "gênero —"} · ${u.uf_residencia || "UF —"} · cadastro ${new Date(u.criado_em).toLocaleDateString("pt-BR")}</div>
          </span>
          <span style="flex-shrink:0; text-align:right;">
            <b style="font-size:11px; color:${u.cedulas_depositadas > 0 ? "var(--pc-accent)" : "var(--pc-ink-faint)"};">${u.cedulas_depositadas} cédula${u.cedulas_depositadas === 1 ? "" : "s"}</b>
            ${u.cargos_depositados ? `<div style="font-size:9.5px; color:var(--pc-ink-faint); max-width:110px;">${u.cargos_depositados}</div>` : ""}
          </span>
        </div>`).join("")}</div>`;
  }

  return `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      ${cartao("Total de cadastros", stats.total_cadastros)}
      ${cartao("Cadastros (7 dias)", stats.cadastros_7_dias)}
      ${cartao("Cadastros (30 dias)", stats.cadastros_30_dias)}
      ${cartao("Grupos criados", stats.total_grupos)}
      ${cartao("Cédulas depositadas", stats.total_cedulas_depositadas)}
      ${cartao("Depositadas (7 dias)", stats.cedulas_depositadas_7_dias)}
    </div>

    <div class="glass-card" style="margin-top:14px; padding:16px;">
      <div style="font-size:13px; font-weight:700; margin-bottom:10px;">Lista de usuários</div>
      <div class="field-row"><label>Gênero</label>
        <select class="cell" id="pcAdminUsuGenero">
          <option value="">Todos</option>
          <option value="Masculino" ${f.genero === "Masculino" ? "selected" : ""}>Masculino</option>
          <option value="Feminino" ${f.genero === "Feminino" ? "selected" : ""}>Feminino</option>
          <option value="Outro" ${f.genero === "Outro" ? "selected" : ""}>Outro</option>
        </select>
      </div>
      <div class="field-row"><label>UF de residência</label><input class="cell" id="pcAdminUsuUf" value="${f.uf || ""}" placeholder="ex: SC" maxlength="2" style="text-transform:uppercase;"></div>
      <div class="field-row"><label>Cadastro de</label><input class="cell" id="pcAdminUsuDesde" type="date" value="${f.desde || ""}"></div>
      <div class="field-row"><label>Cadastro até</label><input class="cell" id="pcAdminUsuAte" type="date" value="${f.ate || ""}"></div>
      <div class="field-row"><label>Cédula</label>
        <select class="cell" id="pcAdminUsuStatusCedula">
          <option value="">Todos</option>
          <option value="depositou" ${f.statusCedula === "depositou" ? "selected" : ""}>Depositou</option>
          <option value="nao_depositou" ${f.statusCedula === "nao_depositou" ? "selected" : ""}>Não depositou</option>
        </select>
      </div>
      <div class="field-row"><label>Tipo de conta</label>
        <select class="cell" id="pcAdminUsuTipoConta">
          <option value="">Todos</option>
          <option value="padrao" ${f.tipoConta === "padrao" ? "selected" : ""}>Padrão</option>
          <option value="usuario_final" ${f.tipoConta === "usuario_final" ? "selected" : ""}>Usuário final</option>
          <option value="admin" ${f.tipoConta === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </div>
      <button class="primary" id="pcBtnAdminListarUsuarios" style="width:100%;">Buscar</button>
    </div>
    ${listaHtml}`;
}

async function montarAdminProblemas() {
  const problemas = await adminListarProblemas();
  if (!problemas.length) return estadoVazio({ icone: "alerta", titulo: "Nenhum problema reportado", texto: "Quando alguém reportar algo pelo Menu, aparece aqui." });
  return problemas.map((p) => `
    <div class="pc-mini-card" style="flex-direction:column; align-items:stretch; gap:6px; ${p.status === "resolvido" ? "opacity:.6;" : ""}">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <span style="font-size:12.5px; font-weight:600;">${p.nome || "—"}</span>
        <span style="font-size:10px; color:var(--pc-ink-dim); flex-shrink:0;">${new Date(p.criado_em).toLocaleDateString("pt-BR")}</span>
      </div>
      <div style="font-size:12.5px; color:var(--pc-ink-dim); line-height:1.5;">${p.mensagem}</div>
      ${p.tela ? `<div style="font-size:10px; color:var(--pc-ink-faint);">tela: ${p.tela}</div>` : ""}
      ${p.status === "aberto"
        ? `<button data-pc-resolver-problema="${p.id}" class="ghost" style="align-self:flex-start; font-size:11px; padding:5px 10px;">Marcar resolvido</button>`
        : `<span style="font-size:10.5px; color:var(--pc-accent);">✓ resolvido</span>`}
    </div>`).join("");
}

// Seção "Erros" — erros de JS capturados por nuvem/telemetria.js (migração
// 50). Abertos primeiro; "resolvido" marca resolvido_em e re-renderiza.
async function montarAdminErros() {
  const erros = await adminListarErrosCliente(200);
  const abertos = erros.filter((e) => !e.resolvido_em).length;
  const esc = (s) => escaparAtributoHtml(s).replace(/>/g, "&gt;");
  const titulo = `<div style="font-size:14px; font-weight:700; margin:0 0 10px 2px;">Erros · ${abertos} aberto${abertos === 1 ? "" : "s"}</div>`;
  if (!erros.length) return titulo + estadoVazio({ icone: "alerta", titulo: "Nenhum erro registrado", texto: "Quando o app quebrar no navegador de alguém, a linha aparece aqui." });
  return `${titulo}
    <div class="pc-lobby-card">${erros.map((e) => `
      <div class="pc-lobby-linha" style="align-items:flex-start; ${e.resolvido_em ? "opacity:.55;" : ""}">
        <span style="min-width:0;">
          <div style="font-size:12.5px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${esc(e.mensagem)}">${esc(String(e.mensagem || "").split("\n")[0])}</div>
          <div style="font-size:10.5px; color:var(--pc-ink-dim);">${new Date(e.criado_em).toLocaleString("pt-BR")} · ${esc(e.tela || "tela —")} · cb ${esc(e.versao_cb || "—")}</div>
          <div style="font-size:10px; color:var(--pc-ink-faint); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.nome || e.email ? `${esc(e.nome || "")}${e.email ? " · " + esc(e.email) : ""}` : "visitante sem login"}</div>
        </span>
        <span style="flex-shrink:0; text-align:right;">
          ${e.resolvido_em
            ? `<span style="font-size:10.5px; color:var(--pc-accent);">✓ resolvido</span>`
            : `<button data-pc-resolver-erro="${e.id}" class="ghost" style="font-size:11px; padding:5px 10px;">resolvido</button>`}
        </span>
      </div>`).join("")}</div>`;
}

async function montarAdminPesquisa() {
  const filtro = pcState.adminPesquisaFiltro || {};
  let resultadoHtml = "";
  if (pcState.adminPesquisaResultados) {
    const registros = pcState.adminPesquisaResultados;
    if (!registros.length) {
      resultadoHtml = estadoVazio({ icone: "buscar", titulo: "Nenhuma cédula encontrada", texto: "Ninguém oficial bateu com esses filtros — tenta afrouxar o recorte." });
    } else {
      const cargo = pcState.adminPesquisaCargo || "estadual";
      const botoesCargo = CARGOS.map((c) => `<button data-pc-admin-pesquisa-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");
      resultadoHtml = `
        <div class="pc-sub" style="margin:14px 0 8px;">${registros.length} cédula${registros.length === 1 ? "" : "s"} encontrada${registros.length === 1 ? "" : "s"}</div>
        <div class="pc-cargo-switch" style="margin-bottom:12px;">${botoesCargo}</div>
        ${montarComparacaoGrupo(registros, cargo)}`;
    }
  }
  return `
    <div class="pc-sub" style="margin-bottom:12px;">Filtra as cédulas OFICIAIS já depositadas (SC) por recorte demográfico — dado disponível hoje é só gênero e UF de residência (idade ainda não é coletada no cadastro).</div>
    <div class="field-row"><label>Gênero</label>
      <select class="cell" id="pcAdminFiltroGenero">
        <option value="">Todos</option>
        <option value="Masculino" ${filtro.genero === "Masculino" ? "selected" : ""}>Masculino</option>
        <option value="Feminino" ${filtro.genero === "Feminino" ? "selected" : ""}>Feminino</option>
        <option value="Outro" ${filtro.genero === "Outro" ? "selected" : ""}>Outro</option>
      </select>
    </div>
    <div class="field-row"><label>UF de residência</label><input class="cell" id="pcAdminFiltroUf" value="${filtro.uf || ""}" placeholder="ex: SC" maxlength="2" style="text-transform:uppercase;"></div>
    <button class="primary" id="pcBtnAdminPesquisar" style="width:100%;">Buscar</button>
    ${resultadoHtml}`;
}

// Aba "Créditos e Financeiro" (economia fase 1, MONETIZACAO.md v3 §8):
// conceder/ajustar créditos por e-mail (ferramenta dos jogadores base),
// saldos e extrato geral. Exige a migração 21 no banco — sem ela, as
// listas avisam em vez de quebrar.
async function montarAdminFinanceiro() {
  const [stats, saldos, extrato] = await Promise.all([
    adminEstatisticasCreditos(),
    adminSaldos(100),
    adminExtratoGeral(50),
  ]);
  if (!stats) return `<div class="pc-sub">Não consegui carregar os dados financeiros.</div>`;
  const s = pcState.adminCreditoStatus;
  const reais = (centavos) => (Number(centavos || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const faturamentoIndisponivel = stats.valor_faturado_centavos === undefined;
  return `
    <div class="glass-card" style="margin-bottom:10px; padding:16px; text-align:center; border-color:rgba(52,232,74,.35);">
      <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim);">Valor faturado</div>
      ${faturamentoIndisponivel
        ? `<div class="pc-sub" style="margin-top:6px;">Indisponível — rode a migração 31 (nuvem/migracao-31-financeiro-valor-faturado.sql) no SQL Editor.</div>`
        : `<div style="font-size:28px; font-weight:800; color:var(--pc-accent); margin-top:4px;">${reais(stats.valor_faturado_centavos)}</div>
           <div style="font-size:11.5px; color:var(--pc-ink-dim); margin-top:2px;">${reais(stats.valor_faturado_30_dias_centavos)} nos últimos 30 dias · ${Number(stats.pedidos_aprovados || 0).toLocaleString("pt-BR")} pedido${stats.pedidos_aprovados === 1 ? "" : "s"} aprovado${stats.pedidos_aprovados === 1 ? "" : "s"}</div>
           <div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:6px;">Só compra real pela Loja (Mercado Pago) — créditos concedidos manualmente abaixo não entram aqui.</div>`}
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <div class="glass-card" style="padding:14px 16px; text-align:center;">
        <div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${Number(stats.contas_com_credito || 0).toLocaleString("pt-BR")}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">Contas com saldo</div>
      </div>
      <div class="glass-card" style="padding:14px 16px; text-align:center;">
        <div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${Number(stats.total_creditos_em_circulacao || 0).toLocaleString("pt-BR")}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">Créditos em circulação</div>
      </div>
    </div>

    <div class="glass-card" style="margin-top:14px; padding:16px;">
      <div style="font-size:13px; font-weight:700; margin-bottom:4px;">Conceder / ajustar créditos</div>
      <div class="pc-sub" style="margin-bottom:12px;">Pra compra real feita pela Loja (Mercado Pago), o crédito já é automático — não use isto pra ela. Tudo que sai daqui entra no relatório financeiro como <b>concedido</b> (nunca como vendido) — é o que separa, no relatório, o que foi atribuído de graça do que foi de fato vendido. Tudo vira linha no extrato, nada é silencioso.</div>
      <div class="field-row"><label>E-mail da conta</label><input class="cell" id="pcAdminCreditoEmail" type="email" placeholder="pessoa@exemplo.com"></div>
      <div class="field-row"><label>Motivo</label>
        <select class="cell" id="pcAdminCreditoCanal">
          <option value="">Selecione</option>
          <option value="Cortesia">Cortesia</option>
          <option value="Correção de erro">Correção de erro</option>
          <option value="Jogador base">Jogador base</option>
          <option value="Patrocínio">Patrocínio</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div class="field-row"><label>SL (+/-)</label><input class="cell" id="pcAdminCreditoQtd" type="number" step="1" placeholder="10"></div>
      <div class="field-row"><label>Observação (vai pro extrato)</label><input class="cell" id="pcAdminCreditoMotivo" placeholder="opcional"></div>
      <button class="primary" id="pcBtnAdminConcederCredito" style="width:100%;">Aplicar</button>
      <div class="pc-status" id="pcAdminCreditoStatus" style="margin-top:8px; min-height:14px;">${s || ""}</div>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Saldos (contas com crédito)</div>
    ${saldos === null
      ? `<div class="pc-sub">Indisponível — rode a migração 21 (nuvem/migracao-21-ledger-creditos.sql) no SQL Editor.</div>`
      : saldos.length === 0
        ? `<div class="pc-sub">Nenhuma conta com saldo ainda.</div>`
        : `<div class="pc-lobby-card">${saldos.map((l) => `
          <div class="pc-lobby-linha">
            <span style="min-width:0; font-size:12.5px;"><b>${l.nome}</b> <span style="color:var(--pc-ink-dim); font-size:11px;">${l.email}</span></span>
            <span style="flex-shrink:0; font-weight:750; font-variant-numeric:tabular-nums;">${l.saldo}</span>
          </div>`).join("")}</div>`}

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Extrato geral (últimas 50)</div>
    ${extrato === null
      ? `<div class="pc-sub">Indisponível — rode a migração 21 no SQL Editor.</div>`
      : extrato.length === 0
        ? `<div class="pc-sub">Nenhuma movimentação registrada ainda.</div>`
        : `<div class="pc-lobby-card">${extrato.map((t) => `
          <div class="pc-lobby-linha" style="align-items:flex-start;">
            <span style="min-width:0; font-size:12px;">
              <b>${t.nome}</b> · ${ROTULO_TRANSACAO[t.tipo] || t.tipo}${t.referencia ? ` <span style="color:var(--pc-ink-dim);">(${t.referencia})</span>` : ""}
              <span style="display:block; font-size:10px; color:var(--pc-ink-dim);">${new Date(t.criado_em).toLocaleString("pt-BR")} · ${t.email}</span>
            </span>
            <span style="flex-shrink:0; text-align:right; font-variant-numeric:tabular-nums;">
              <b style="color:${t.valor >= 0 ? "var(--pc-accent)" : "var(--pc-ink)"};">${t.valor >= 0 ? "+" : ""}${t.valor}</b>
              <span style="display:block; font-size:9.5px; color:var(--pc-ink-faint);">saldo ${t.saldo_apos}</span>
            </span>
          </div>`).join("")}</div>`}`;
}


// Bloco "Migrações" da aba Rotinas (migração 43, 04/09/2026): o status
// vem do banco — admin_migracoes_status() confere se cada objeto que a
// migração cria existe de verdade. Substitui o "a migração 36 já rodou?"
// que o painel chutava. Nunca bloqueia nada: é diagnóstico.
function montarBlocoMigracoes(status) {
  const indice = typeof MIGRACOES_INDEX === "undefined" ? [] : MIGRACOES_INDEX;
  if (!indice.length) return "";
  if (!status) return `<div class="pc-sub" style="margin-bottom:14px;">Não consegui conferir as migrações — a migração 43 (admin_migracoes_status) já foi aplicada?</div>`;
  // `s.num` aqui é a POSIÇÃO no índice (ver adminMigracoesStatus) — números
  // de migração se repetem no histórico (21–24 têm dois arquivos cada).
  const porPos = {};
  status.forEach((s) => { porPos[s.num] = s; });
  const linhas = indice.map((m, i) => {
    const s = porPos[i];
    const semVerificacao = !m.objetos.length;
    const pendente = s && s.existem < s.total;
    return { m, s, semVerificacao, pendente };
  });
  const verificaveis = linhas.filter((l) => !l.semVerificacao);
  const aplicadas = verificaveis.filter((l) => l.s && !l.pendente).length;
  const pendentes = linhas.filter((l) => l.pendente);
  const resumoCor = pendentes.length ? "var(--pc-danger)" : "var(--pc-accent)";
  const detalhePendentes = pendentes.map((l) => `
    <div class="pc-lobby-linha" style="align-items:flex-start;">
      <span style="min-width:0;">
        <div style="font-size:12.5px; font-weight:700;">${l.m.num} · ${escaparAtributoHtml(l.m.arquivo)}</div>
        <div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:3px; line-height:1.5; word-break:break-word;">falta: ${l.s.faltando.map(escaparAtributoHtml).join(", ")}</div>
      </span>
      <span style="font-size:11px; color:var(--pc-danger); flex-shrink:0;">${l.s.existem}/${l.s.total}</span>
    </div>`).join("");
  const semVerif = linhas.filter((l) => l.semVerificacao).map((l) => `${l.m.num}`).join(", ");
  return `
    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Migrações do banco</div>
    <div class="pc-lobby-card" style="margin-bottom:18px;">
      <div class="pc-lobby-linha" style="align-items:center;">
        <span style="min-width:0;">
          <div style="font-size:12.5px; font-weight:700;">${aplicadas} de ${verificaveis.length} aplicadas</div>
          <div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:3px; line-height:1.5;">Conferido agora no banco, objeto por objeto (nuvem/migracoes-index.js).${semVerif ? ` Sem verificação possível: ${semVerif}.` : ""}</div>
        </span>
        <span style="font-size:13px; font-weight:800; color:${resumoCor}; flex-shrink:0;">${pendentes.length ? `${pendentes.length} pendente${pendentes.length === 1 ? "" : "s"}` : "✓ tudo aplicado"}</span>
      </div>
      ${detalhePendentes}
    </div>`;
}

async function montarAdminRotinas() {
  const [execucoes, statusMigracoes] = await Promise.all([adminListarExecucoesRotina(), adminMigracoesStatus()]);
  const ultimaPorRotina = {};
  execucoes.forEach((e) => { if (!ultimaPorRotina[e.rotina]) ultimaPorRotina[e.rotina] = e; }); // já vem ordenado desc

  const catalogoHtml = `<div class="pc-lobby-card">${ROTINAS_CONHECIDAS.map((r) => {
    const ultima = ultimaPorRotina[r.chave];
    return `
    <div class="pc-lobby-linha" style="align-items:flex-start;">
      <span style="min-width:0;">
        <div style="font-size:12.5px; font-weight:700;">${r.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:2px; line-height:1.5;">${r.descricao}</div>
        <div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:4px;">Programado: ${r.programado}</div>
      </span>
      <span style="flex-shrink:0; text-align:right; font-size:11px; ${ultima ? (ultima.sucesso ? "color:var(--pc-accent);" : "color:var(--pc-danger);") : "color:var(--pc-ink-faint);"}">
        ${ultima ? `${ultima.sucesso ? "✓ ok" : "✗ falhou"}<br><span style="font-size:9.5px;">${new Date(ultima.executado_em).toLocaleString("pt-BR")}</span>` : "sem execução registrada"}
      </span>
    </div>`;
  }).join("")}</div>`;

  const historicoHtml = !execucoes.length
    ? estadoVazio({ icone: "calendario", titulo: "Nenhuma execução registrada", texto: "Quando uma rotina rodar, o histórico aparece aqui." })
    : `<div class="pc-lobby-card">${execucoes.map((e) => `
      <div class="pc-lobby-linha" style="align-items:flex-start;">
        <span style="min-width:0;">
          <div style="font-size:12.5px; font-weight:600;">${e.rotina}</div>
          ${e.detalhe ? `<div style="font-size:10.5px; color:var(--pc-ink-dim); margin-top:3px; line-height:1.5; word-break:break-word;">${e.detalhe}</div>` : ""}
        </span>
        <span style="font-size:11px; color:${e.sucesso ? "var(--pc-accent)" : "var(--pc-danger)"}; flex-shrink:0; text-align:right;">${e.sucesso ? "✓ ok" : "✗ falhou"}<br><span style="font-size:9.5px; color:var(--pc-ink-faint);">${new Date(e.executado_em).toLocaleString("pt-BR")}</span></span>
      </div>`).join("")}</div>`;

  return `
    ${montarBlocoMigracoes(statusMigracoes)}
    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">Rotinas conhecidas</div>
    ${catalogoHtml}
    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Histórico de execuções</div>
    ${historicoHtml}`;
}

// ---------- Aba Bots (migração 36, estruturação aprovada 28/08/2026) ----------
// Lista de referência por estado + regulação dos 155 usuários fictícios.
// FASE 1: o painel grava referência/config; a geração de contas continua
// no script local (gerar_usuarios_ficticios.py), que lê daqui — o botão
// "Gerar" só marca o pedido. Lançamento é SC-only (decisão 28/08/2026).
async function montarAdminBots() {
  const uf = pcState.adminBotsEstado || "SC";
  // Depósitos reais e teto POR ESTADO (migração 49) — a regra regressiva
  // deixou de ser nacional.
  const [cfg, refs, depositosReais, tetoBanco] = await Promise.all([
    botsCarregarConfig(uf),
    botsCarregarReferencias(uf),
    (async () => {
      const { data, error } = await supabaseClient.rpc("contagem_depositos_reais_uf", { p_uf: uf });
      return error ? null : Number(data);
    })(),
    botsTetoAtivo(uf),
  ]);
  if (!cfg) return `<div class="pc-sub">Não consegui carregar a configuração dos bots — a migração 36 já foi rodada no Supabase?</div>`;

  const refAtiva = refs.find((r) => r.ativa) || null;
  const seletorUf = `<select id="pcAdminBotsUf" class="cell" style="width:auto; padding:8px 12px;">${[...ESTADOS_BRASIL].sort((a, b) => a.sigla.localeCompare(b.sigla)).map((e) => `<option value="${e.sigla}" ${e.sigla === uf ? "selected" : ""}>${e.sigla} — ${e.nome}</option>`).join("")}</select>`;
  const status = pcState.adminBotsStatus
    ? `<div style="margin:10px 0; font-size:12px; color:${pcState.adminBotsStatus.tipo === "ok" ? "var(--pc-accent)" : "var(--pc-danger)"};">${pcState.adminBotsStatus.texto}</div>`
    : "";

  // Pré-visualização da referência ativa: contagem por cargo + top 3.
  let previewRef = "";
  if (refAtiva) {
    const cargosRef = ["estadual", "federal", "senador"].filter((cg) => refAtiva.referencia && refAtiva.referencia[cg] && refAtiva.referencia[cg].length);
    previewRef = cargosRef.map((cg) => {
      const grupos = refAtiva.referencia[cg];
      const todos = [];
      grupos.forEach((g) => (g.candidatos || []).forEach((c) => todos.push(c)));
      todos.sort((a, b) => (b.votos || 0) - (a.votos || 0));
      const top = todos.slice(0, 3).map((c) => `${c.nome} (${(c.votos || 0).toLocaleString("pt-BR")})`).join(" · ");
      return `<div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;"><b style="color:var(--pc-ink);">${cg === "estadual" ? "Dep. Estadual" : cg === "federal" ? "Dep. Federal" : "Senador"}</b> — ${grupos.length} partidos, ${todos.length} candidatos. Top: ${top}</div>`;
    }).join("");
  }
  const historicoRef = refs.filter((r) => !r.ativa).slice(0, 4).map((r) =>
    `<div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:3px;">· substituída — criada em ${new Date(r.criado_em).toLocaleString("pt-BR")}</div>`).join("");

  // Progressão automática: barra "Dia N · X de lote ativos". O teto vem
  // do banco (bots_teto_ativo); o cálculo local só cobre "dia N"/cota e
  // serve de reserva se a RPC falhar.
  const prog = botsProgressaoCalcular(cfg, depositosReais);
  const botsAtivos = tetoBanco !== null && tetoBanco !== undefined && !isNaN(tetoBanco) ? tetoBanco : prog.teto;
  const lote = cfg.lote || 155;
  const pctBarra = Math.max(0, Math.min(100, Math.round((botsAtivos / lote) * 100)));
  const fmtData = (d) => { const [a, m, dd] = String(d).slice(0, 10).split("-"); return `${dd}/${m}/${a}`; };

  return `
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
      <span style="font-size:12px; color:var(--pc-ink-dim);">Estado:</span>${seletorUf}
    </div>
    ${status}

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:0 0 8px 2px;">① Referência</div>
    <div class="glass-card" style="padding:14px;">
      ${refAtiva ? `
        <div style="font-size:12.5px; color:var(--pc-ink);">Referência ativa desde <b>${new Date(refAtiva.criado_em).toLocaleString("pt-BR")}</b>${refAtiva.salvamento_id ? " · veio de uma cédula depositada" : ""}.</div>
        ${previewRef}` : `
        <div style="font-size:12.5px; color:var(--pc-ink-dim);">Sem referência ativa em ${uf} ainda. A referência dos bots é sempre uma <b>cédula depositada de verdade</b> — deposite a sua neste estado e aponte ela aqui.</div>`}
      <button class="ghost" id="pcBtnBotsUsarCedula" style="width:100%; margin-top:12px; display:flex; align-items:center; justify-content:center; gap:7px;">${iconeSvg("ballot", 14)}Escolher cédula ou lista salva como referência</button>
      ${pcState.adminBotsFontes ? (pcState.adminBotsFontes.length ? `
      <div style="margin-top:10px; border-top:1px solid var(--pc-glass-border); padding-top:8px;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--pc-ink-faint); margin-bottom:6px;">Minhas fontes em ${uf}</div>
        ${pcState.adminBotsFontes.map((f) => `
        <button class="ghost" data-pc-bots-fonte="${f.id}" style="width:100%; margin-bottom:6px; display:flex; align-items:center; gap:8px; text-align:left;">
          ${iconeSvg(f.depositado_em ? "ballot" : "salvar", 13)}
          <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escaparAtributoHtml(f.nome || "(sem nome)")}</span>
          <span style="flex-shrink:0; font-size:10px; color:var(--pc-ink-dim);">${f.depositado_em ? "cédula · " + new Date(f.depositado_em).toLocaleDateString("pt-BR") : "lista salva"}</span>
        </button>`).join("")}
      </div>` : `<div style="font-size:11px; color:var(--pc-ink-dim); margin-top:8px;">Nenhuma cédula ou lista salva sua em ${uf} ainda.</div>`) : ""}
      ${historicoRef ? `<div style="margin-top:10px; border-top:1px solid var(--pc-glass-border); padding-top:8px;"><div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--pc-ink-faint);">Histórico</div>${historicoRef}</div>` : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">② Regulação</div>
    <div class="glass-card" style="padding:14px;">
      <label style="display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:13px; color:var(--pc-ink); cursor:pointer;">
        <span>Bots ligados em ${uf}</span>
        <input type="checkbox" id="pcAdminBotsLigado" ${cfg.ligado ? "checked" : ""} style="width:18px; height:18px; accent-color:var(--pc-accent);">
      </label>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <label style="flex:1; font-size:11px; color:var(--pc-ink-dim);">Tamanho do lote
          <input type="number" id="pcAdminBotsLote" class="cell" value="${cfg.lote}" min="1" max="500" style="width:100%; margin-top:4px;">
        </label>
        <label style="flex:1; font-size:11px; color:var(--pc-ink-dim);">Variação por candidato (±%)
          <input type="number" id="pcAdminBotsVariacao" class="cell" value="${cfg.variacao_pct}" min="0" max="100" style="width:100%; margin-top:4px;">
        </label>
      </div>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <label style="flex:1; font-size:11px; color:var(--pc-ink-dim);">Bots iniciais (dia 1)
          <input type="number" id="pcAdminBotsIniciais" class="cell" value="${cfg.bots_iniciais === null || cfg.bots_iniciais === undefined ? "" : cfg.bots_iniciais}" placeholder="todos" min="0" max="500" style="width:100%; margin-top:4px;">
        </label>
        <label style="flex:1; font-size:11px; color:var(--pc-ink-dim);">Incremento por dia
          <input type="number" id="pcAdminBotsIncremento" class="cell" value="${cfg.incremento_dia === null || cfg.incremento_dia === undefined ? "" : cfg.incremento_dia}" placeholder="—" min="0" max="500" style="width:100%; margin-top:4px;">
        </label>
      </div>
      <div style="font-size:10.5px; color:var(--pc-ink-faint); line-height:1.5; margin-top:6px;">Deixe os dois vazios pra todos os bots do lote entrarem de uma vez. Preenchidos, entram <b>bots iniciais</b> no dia 1 e mais <b>incremento</b> a cada dia, até o lote.</div>
      <button class="primary" id="pcBtnBotsSalvarConfig" style="width:100%; margin-top:12px;">Salvar regulação</button>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">③ Progressão automática</div>
    <div class="glass-card" style="padding:14px;">
      <div id="pcAdminBotsProgressaoRotulo" style="display:flex; justify-content:space-between; align-items:baseline; gap:10px; font-size:12.5px; color:var(--pc-ink);">
        <span>${prog.temProgressao ? `<b>Dia ${prog.dia}</b> · ${botsAtivos.toLocaleString("pt-BR")} de ${lote.toLocaleString("pt-BR")} ativos` : `${botsAtivos.toLocaleString("pt-BR")} de ${lote.toLocaleString("pt-BR")} ativos`}</span>
        <span style="font-size:10.5px; color:var(--pc-ink-faint);">${prog.temProgressao ? `desde ${fmtData(cfg.progressao_inicio)} · +${cfg.incremento_dia}/dia` : "sem progressão — lote inteiro de uma vez"}</span>
      </div>
      <div style="height:8px; border-radius:99px; background:var(--pc-glass-border); margin-top:8px; overflow:hidden;">
        <div id="pcAdminBotsProgressaoBarra" style="height:100%; width:${pctBarra}%; background:var(--pc-accent); border-radius:99px; transition:width .3s;"></div>
      </div>
      <div style="font-size:10.5px; color:var(--pc-ink-faint); line-height:1.5; margin-top:8px;">${prog.temProgressao ? `Cota do dia: ${prog.cotaDia.toLocaleString("pt-BR")} bots${depositosReais ? ` − ${depositosReais.toLocaleString("pt-BR")} cédulas reais em ${uf}` : ""} = ${botsAtivos.toLocaleString("pt-BR")} na média.` : `Configure "bots iniciais" e "incremento por dia" na regulação pra escalonar a entrada.`} A data de início é gravada no primeiro Salvar/Aplicar com a progressão preenchida.</div>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">④ Aplicação</div>
    <div class="glass-card" style="padding:14px;">
      <button class="primary" id="pcBtnBotsAplicar" style="width:100%;" ${refAtiva ? "" : "disabled"}>Aplicar agora em ${uf}</button>
      <div style="font-size:10.5px; color:var(--pc-ink-faint); line-height:1.5; margin-top:8px;">
        ${refAtiva ? "Cria as contas que faltam e atualiza o palpite de todas em cima da referência ativa — direto no servidor, leva menos de 1 minuto." : "Aponte uma referência em ① pra liberar."}
        ${cfg.aplicado_em ? `<br><b style="color:var(--pc-ink-dim);">Última aplicação:</b> ${new Date(cfg.aplicado_em).toLocaleString("pt-BR")}${cfg.aplicado_detalhe ? ` — ${cfg.aplicado_detalhe}` : ""}` : `<br>Ainda não aplicado em ${uf}.`}
        ${cfg.geracao_solicitada_em ? `<br>Pedido antigo aberto desde ${new Date(cfg.geracao_solicitada_em).toLocaleString("pt-BR")} — "Aplicar agora" fecha ele.` : ""}
        <br>O script local (ferramentas/gerar_usuarios_ficticios.py) continua funcionando como reserva.
      </div>
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">⑤ Efeito boot</div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
      <div class="pc-metric" style="text-align:center;"><div style="font-size:22px; font-weight:800; color:var(--pc-accent);">${depositosReais === null ? "—" : depositosReais.toLocaleString("pt-BR")}</div><div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">cédulas reais depositadas em ${uf}</div></div>
      <div class="pc-metric" style="text-align:center;"><div style="font-size:22px; font-weight:800; color:var(--pc-ink);">${botsAtivos.toLocaleString("pt-BR")}</div><div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">bots ainda na média</div></div>
      <div class="pc-metric" style="text-align:center;"><div style="font-size:22px; font-weight:800; color:var(--pc-ink-dim);">${lote.toLocaleString("pt-BR")}</div><div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">lote total</div></div>
    </div>
    <div style="font-size:10.5px; color:var(--pc-ink-faint); line-height:1.5; margin-top:8px;">Cada cédula real depositada em ${uf} desativa 1 bot da média pública do estado (do índice mais alto pro mais baixo) — com o tempo, os usuários de verdade assumem a média sozinhos.</div>`;
}

// ---------- Aba Analítico, nível Sistema (migração 37, 28/08/2026) ----------
// Leitura de tendência do sistema com gráficos em SVG puro (sem biblioteca
// — o site é estático), no padrão Fader: grafite de base, verde só no
// destaque. Complementa Usuários/Financeiro (listas operacionais); o
// nível Usuário (busca individual + ponte com o "ver como") fica pra
// terceira etapa da estruturação.

async function montarAdminAnalitico() {
  const [d, historicoTudo] = await Promise.all([
    adminAnalitico(pcState.adminAnaliticoIncluiBots),
    adminHistoricoAcoes(300),
  ]);
  if (!d) return `<div class="pc-sub">Não consegui carregar o analítico — a migração 37 já foi rodada no Supabase?</div>`;
  pcState.adminHistCache = historicoTudo; // guardado pra os filtros do histórico não precisarem de novo round-trip a cada clique

  const cartao = (valor, label, cor) => `
    <div class="pc-metric" style="text-align:center;">
      <div style="font-size:22px; font-weight:800; color:${cor || "var(--pc-ink)"};">${valor}</div>
      <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:4px;">${label}</div>
    </div>`;

  // Linha de novos usuários por dia (30 dias) — preenche os dias sem
  // cadastro com zero pra linha não "pular" buracos do calendário.
  const porDiaBruto = {};
  (d.usuarios_por_dia || []).forEach((p) => { porDiaBruto[p.dia] = Number(p.n) || 0; });
  const serie = [];
  for (let i = 29; i >= 0; i--) {
    const dia = new Date(Date.now() - i * 86400000);
    const chave = dia.toISOString().slice(0, 10);
    serie.push({ chave, n: porDiaBruto[chave] || 0 });
  }
  const maxSerie = Math.max(1, ...serie.map((p) => p.n));
  const W = 300, H = 72, PAD = 4;
  const pontos = serie.map((p, i) => {
    const x = PAD + (i / (serie.length - 1)) * (W - PAD * 2);
    const y = H - PAD - (p.n / maxSerie) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linhaSvg = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;" preserveAspectRatio="none">
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#26292D" stroke-width="1"></line>
      <polyline points="${pontos.join(" ")}" fill="none" stroke="#34E84A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"></polyline>
      <circle cx="${pontos[pontos.length - 1].split(",")[0]}" cy="${pontos[pontos.length - 1].split(",")[1]}" r="2.6" fill="#34E84A"></circle>
    </svg>`;

  // Barras: cédulas por cargo.
  const cargosRot = { estadual: "Dep. Estadual", federal: "Dep. Federal", senador: "Senador" };
  const porCargo = ["estadual", "federal", "senador"].map((cg) => {
    const item = (d.cedulas_por_cargo || []).find((c) => c.cargo === cg);
    return { rot: cargosRot[cg], n: item ? Number(item.n) : 0 };
  });
  const maxCargo = Math.max(1, ...porCargo.map((c) => c.n));
  const barrasCargo = porCargo.map((c) => `
    <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
      <span style="flex:none; width:86px; font-size:10.5px; color:var(--pc-ink-dim); text-align:right;">${c.rot}</span>
      <div style="flex:1; height:12px; background:#0C0E10; border:1px solid #23262A; border-radius:6px; overflow:hidden;">
        <div style="width:${Math.round((c.n / maxCargo) * 100)}%; height:100%; background:linear-gradient(90deg, rgba(42,46,50,.75), rgba(60,65,70,.97));"></div>
      </div>
      <span style="flex:none; min-width:30px; font-size:11px; font-weight:700; color:var(--pc-ink); font-variant-numeric:tabular-nums;">${c.n.toLocaleString("pt-BR")}</span>
    </div>`).join("");

  // Funil cadastrou → preencheu → depositou (proporções sobre o 1º degrau).
  const funil = [
    { rot: "Cadastraram", n: Number(d.funil_cadastraram) || 0 },
    { rot: "Preencheram palpite", n: Number(d.funil_preencheram) || 0 },
    { rot: "Depositaram cédula", n: Number(d.funil_depositaram) || 0 },
  ];
  const baseFunil = Math.max(1, funil[0].n);
  const funilHtml = funil.map((f, i) => `
    <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
      <span style="flex:none; width:120px; font-size:10.5px; color:var(--pc-ink-dim); text-align:right;">${f.rot}</span>
      <div style="flex:1; height:14px; background:#0C0E10; border:1px solid #23262A; border-radius:7px; overflow:hidden;">
        <div style="width:${Math.round((f.n / baseFunil) * 100)}%; height:100%; background:${i === funil.length - 1 ? "rgba(52,232,74,.55)" : "linear-gradient(90deg, rgba(42,46,50,.75), rgba(60,65,70,.97))"};"></div>
      </div>
      <span style="flex:none; min-width:52px; font-size:11px; font-weight:700; color:var(--pc-ink); font-variant-numeric:tabular-nums;">${f.n.toLocaleString("pt-BR")} <span style="color:var(--pc-ink-faint); font-weight:600;">(${Math.round((f.n / baseFunil) * 100)}%)</span></span>
    </div>`).join("");

  const estadosTxt = (d.cedulas_por_estado || []).slice(0, 8).map((e) => `${e.estado} ${Number(e.n).toLocaleString("pt-BR")}`).join(" · ");

  return `
    <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--pc-ink-dim); margin-bottom:14px; cursor:pointer;">
      <input type="checkbox" id="pcAdminAnaliticoBots" ${pcState.adminAnaliticoIncluiBots ? "checked" : ""} style="width:16px; height:16px; accent-color:var(--pc-accent);">
      Incluir bots nos números <span style="color:var(--pc-ink-faint);">(desligado = só contas reais)</span>
    </label>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      ${cartao(Number(d.usuarios_total).toLocaleString("pt-BR"), `usuários (+${Number(d.usuarios_7d).toLocaleString("pt-BR")} na semana)`, "var(--pc-accent)")}
      ${cartao(Number(d.cedulas_total).toLocaleString("pt-BR"), "cédulas depositadas")}
      ${cartao(`${Number(d.desafios_criados).toLocaleString("pt-BR")} / ${Number(d.desafios_selados).toLocaleString("pt-BR")}`, "desafios criados / selados")}
      ${cartao(`${Number(d.sl_creditados).toLocaleString("pt-BR")} / ${Number(d.sl_gastos).toLocaleString("pt-BR")}`, "SL creditados / gastos")}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Novos usuários por dia — 30 dias</div>
    <div class="glass-card" style="padding:14px;">${linhaSvg}</div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Cédulas por cargo</div>
    <div class="glass-card" style="padding:14px;">${barrasCargo}
      ${estadosTxt ? `<div style="font-size:10.5px; color:var(--pc-ink-faint); margin-top:10px; border-top:1px solid var(--pc-glass-border); padding-top:8px;">Por estado: ${estadosTxt}</div>` : ""}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Funil</div>
    <div class="glass-card" style="padding:14px;">${funilHtml}</div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Engajamento</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
      ${cartao(Number(d.revelacoes_termometro).toLocaleString("pt-BR"), "revelações no Termômetro")}
      ${cartao(Number(d.desafios_criados).toLocaleString("pt-BR"), "desafios 1×1 criados")}
    </div>

    <div style="font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-ink-dim); margin:18px 0 8px 2px;">Histórico de ações</div>
    <div id="pcHistoricoAcoesWrap">${montarHistoricoAcoesFiltrosHtml(historicoTudo)}</div>`;
}

// Filtros client-side do "Histórico de ações" (migração 46, 05/09/2026):
// origem (todos/orgânico/bots), tipo de ação (multi-seleção) e busca livre
// — tudo roda em cima do array já carregado, sem novo round-trip ao banco.
function _historicoAcoesFiltrado(historicoTudo) {
  if (!Array.isArray(historicoTudo)) return null;
  const origem = pcState.adminHistOrigem;
  const acoesLigadas = pcState.adminHistAcoes; // null = todas
  const busca = (pcState.adminHistBusca || "").trim().toLowerCase();
  return historicoTudo.filter((h) => {
    if (origem === "organico" && h.bot) return false;
    if (origem === "bots" && !h.bot) return false;
    if (acoesLigadas && !acoesLigadas.has(h.acao)) return false;
    if (busca) {
      const alvo = `${h.nome || ""} ${h.email || ""} ${h.municipio || ""}`.toLowerCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

function montarHistoricoAcoesFiltrosHtml(historicoTudo) {
  if (historicoTudo === null) {
    return `<div class="glass-card" style="padding:6px 14px;"><div class="pc-sub" style="padding:8px 0;">Não consegui carregar o histórico — a migração 39/46 já foi rodada no Supabase?</div></div>`;
  }
  const filtrado = _historicoAcoesFiltrado(historicoTudo) || [];
  const acoesLigadas = pcState.adminHistAcoes; // null = todas ligadas

  const chipOrigem = (valor, rot, corAtiva) => {
    const ativo = pcState.adminHistOrigem === valor;
    return `<button type="button" class="pc-chip-partido ${ativo ? "sel" : ""}" data-pc-hist-origem="${valor}"${ativo ? ` style="border-color:${corAtiva}; color:${corAtiva}; background:${corAtiva}1a;"` : ""}>${rot}</button>`;
  };

  const chipsOrigemHtml = `
    <div style="margin-bottom:8px;">
      ${chipOrigem("todos", "Todos", "var(--pc-accent)")}
      ${chipOrigem("organico", "Orgânico", "var(--pc-accent)")}
      ${chipOrigem("bots", "Bots", "#FF9A2E")}
    </div>`;

  const chipsAcaoHtml = `
    <div style="margin-bottom:8px;">
      ${Object.entries(HISTORICO_ACAO_ROTULOS).map(([chave, info]) => {
        const ativo = !acoesLigadas || acoesLigadas.has(chave);
        return `<button type="button" class="pc-chip-partido ${ativo ? "sel" : ""}" data-pc-hist-acao="${chave}"${ativo ? ` style="border-color:${info.cor}; color:${info.cor}; background:${info.cor}1a;"` : ""}>${info.rot}</button>`;
      }).join("")}
    </div>`;

  const buscaHtml = `
    <input type="text" class="cell" id="pcHistBusca" placeholder="Buscar por nome, e-mail ou município…" value="${escaparAtributoHtml(pcState.adminHistBusca || "")}" style="width:100%; margin-bottom:10px;">`;

  const contadorHtml = `<div style="font-size:11px; color:var(--pc-ink-dim); margin-bottom:8px;">${filtrado.length} de ${historicoTudo.length} ações</div>`;

  const listaHtml = !filtrado.length
    ? `<div class="pc-sub" style="padding:8px 0;">${historicoTudo.length ? "Nenhuma ação bate com os filtros." : "Nenhuma ação registrada ainda."}</div>`
    : filtrado.map((h) => {
      const rot = HISTORICO_ACAO_ROTULOS[h.acao] || { rot: h.acao, cor: "var(--pc-ink-dim)" };
      const dt = new Date(h.data);
      return `
      <div style="display:flex; align-items:baseline; gap:8px; padding:7px 0; border-bottom:.5px solid #1a1d20; font-size:11px;">
        <span style="flex:none; width:78px; color:var(--pc-ink-dim); font-variant-numeric:tabular-nums;">${dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        <span style="flex:none; width:112px; font-size:9px; font-weight:800; letter-spacing:.03em; text-transform:uppercase; color:${rot.cor};">${rot.rot}</span>
        <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <b>${h.nome || "—"}</b>${h.bot ? ' <span class="pc-sen-chip" style="background:#FF9A2E; color:#2A1600;" title="Conta fictícia (bot)">BOT</span>' : ""}
          <span style="color:var(--pc-ink-dim);">${h.municipio ? " · " + h.municipio : ""}${h.email ? " · " + h.email : ""}${h.detalhe ? " · " + h.detalhe : ""}</span>
        </span>
      </div>`;
    }).join("");

  return `
    ${chipsOrigemHtml}
    ${chipsAcaoHtml}
    ${buscaHtml}
    ${contadorHtml}
    <div class="glass-card" style="padding:6px 14px;">${listaHtml}
    </div>`;
}

// Reaplica só os filtros do histórico (client-side, sem novo round-trip ao
// banco — usa pcState.adminHistCache, preenchido em montarAdminAnalitico).
// Re-renderiza só o pedaço #pcHistoricoAcoesWrap e reatacha os listeners
// dos chips/busca, em vez de renderAdminPainel() inteiro.
function renderHistoricoAcoesSecao() {
  const wrap = document.getElementById("pcHistoricoAcoesWrap");
  if (!wrap) return;
  wrap.innerHTML = montarHistoricoAcoesFiltrosHtml(pcState.adminHistCache);
  ligarListenersHistoricoAcoes();
}

function ligarListenersHistoricoAcoes() {
  document.querySelectorAll("[data-pc-hist-origem]").forEach((chip) => {
    chip.addEventListener("click", () => {
      pcState.adminHistOrigem = chip.getAttribute("data-pc-hist-origem");
      renderHistoricoAcoesSecao();
    });
  });
  document.querySelectorAll("[data-pc-hist-acao]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const chave = chip.getAttribute("data-pc-hist-acao");
      const todasChaves = Object.keys(HISTORICO_ACAO_ROTULOS);
      // null = todas ligadas; primeiro toggle materializa o Set com todas
      // menos a clicada. Se todas acabarem religadas de novo, volta a null.
      let ligadas = pcState.adminHistAcoes ? new Set(pcState.adminHistAcoes) : new Set(todasChaves);
      if (ligadas.has(chave)) ligadas.delete(chave); else ligadas.add(chave);
      pcState.adminHistAcoes = (ligadas.size === todasChaves.length) ? null : ligadas;
      renderHistoricoAcoesSecao();
    });
  });
  const inputBusca = document.getElementById("pcHistBusca");
  if (inputBusca) inputBusca.addEventListener("input", () => {
    const valor = inputBusca.value;
    clearTimeout(_pcHistBuscaDebounce);
    _pcHistBuscaDebounce = setTimeout(() => {
      pcState.adminHistBusca = valor;
      renderHistoricoAcoesSecao();
      // devolve o foco pro campo, já que o innerHTML recriou o input
      const novo = document.getElementById("pcHistBusca");
      if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
    }, 180);
  });
}

async function renderAdminPainel() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando painel do administrador…");
  if (!pcState.souAdmin) {
    // Sem isso, quem cair aqui sem ser admin (ex.: pcState.subaba="admin"
    // restaurado de uma sessão antiga, depois de perder o acesso) ficava
    // preso — nem botão de voltar nem menu fixo aparecem nessa subaba
    // (atualizarMenuFixo(null), renderAppColaborativo). Achado em revisão
    // de código, 15/08/2026, antes do primeiro teste com admin de verdade.
    el.innerHTML = `<div class="glass-card"><h2>Acesso restrito</h2><div class="pc-sub">Essa área é só pra administradores.</div><button class="ghost" id="pcBtnVoltarAdminRestrito" style="width:100%; margin-top:10px; display:flex; align-items:center; justify-content:center; gap:7px;">${iconeSvg("setaEsquerda", 14)}Voltar</button></div>`;
    document.getElementById("pcBtnVoltarAdminRestrito").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
    });
    return;
  }

  const secoes = [
    { id: "usuarios", label: "Usuários" },
    { id: "problemas", label: "Problemas" },
    { id: "erros", label: "Erros" },
    { id: "pesquisa", label: "Pesquisa" },
    { id: "financeiro", label: "Financeiro" },
    { id: "rotinas", label: "Rotinas" },
    { id: "bots", label: "Bots" },
    { id: "analitico", label: "Analítico" },
  ];
  const botoesSecao = secoes.map((s) => `<button data-pc-admin-secao="${s.id}" class="${pcState.adminSecao === s.id ? "active" : ""}">${s.label}</button>`).join("");

  let conteudoSecao = "";
  if (pcState.adminSecao === "usuarios") conteudoSecao = await montarAdminUsuarios();
  else if (pcState.adminSecao === "problemas") conteudoSecao = await montarAdminProblemas();
  else if (pcState.adminSecao === "erros") conteudoSecao = await montarAdminErros();
  else if (pcState.adminSecao === "pesquisa") conteudoSecao = await montarAdminPesquisa();
  else if (pcState.adminSecao === "financeiro") conteudoSecao = await montarAdminFinanceiro();
  else if (pcState.adminSecao === "bots") conteudoSecao = await montarAdminBots();
  else if (pcState.adminSecao === "analitico") conteudoSecao = await montarAdminAnalitico();
  else conteudoSecao = await montarAdminRotinas();

  el.innerHTML = `
    <button class="pc-mini-btn" id="pcBtnVoltarAdmin" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Painel do administrador</div>
    <div class="pc-sub" style="margin:0 0 14px 2px;">Visão operacional do sistema — não substitui o Supabase, cobre só o essencial do dia a dia.</div>
    <div class="pc-cargo-switch pc-admin-abas" style="margin-bottom:16px;">${botoesSecao}</div>
    <div id="pcAdminConteudo">${conteudoSecao}</div>`;

  document.getElementById("pcBtnVoltarAdmin").addEventListener("click", () => {
    pcState.subaba = "menu";
    renderAppColaborativo();
  });
  document.querySelectorAll("[data-pc-admin-secao]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.adminSecao = btn.getAttribute("data-pc-admin-secao");
      renderAdminPainel();
    });
  });

  if (pcState.adminSecao === "financeiro") {
    document.getElementById("pcBtnAdminConcederCredito").addEventListener("click", async (e) => {
      const email = document.getElementById("pcAdminCreditoEmail").value.trim();
      const canal = document.getElementById("pcAdminCreditoCanal").value;
      const qtd = parseInt(document.getElementById("pcAdminCreditoQtd").value, 10);
      const obs = document.getElementById("pcAdminCreditoMotivo").value.trim();
      const status = document.getElementById("pcAdminCreditoStatus");
      if (!email || !qtd) { status.textContent = "Preencha e-mail e quantidade de SL (diferente de zero)."; return; }
      if (!canal) { status.textContent = "Escolhe o motivo da concessão."; return; }
      const motivo = `${canal}${obs ? " — " + obs : ""}`;
      const resumo = `Conceder ${qtd >= 0 ? "+" : ""}${qtd} SL pra ${email}\nMotivo: ${motivo}\n\nConfirma?`;
      if (!window.confirm(resumo)) return;
      e.target.disabled = true;
      const r = await adminConcederCreditosPorEmail(email, qtd, motivo);
      e.target.disabled = false;
      pcState.adminCreditoStatus = r.ok
        ? `Feito: ${r.aplicado >= 0 ? "+" : ""}${r.aplicado} pra ${r.nome} — novo saldo ${r.novoSaldo}.`
        : `Não deu: ${r.mensagem}`;
      renderAdminPainel();
    });
  }
  if (pcState.adminSecao === "problemas") {
    document.querySelectorAll("[data-pc-resolver-problema]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await adminMarcarProblemaResolvido(btn.getAttribute("data-pc-resolver-problema"));
        renderAdminPainel();
      });
    });
  }
  if (pcState.adminSecao === "erros") {
    document.querySelectorAll("[data-pc-resolver-erro]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        await adminResolverErroCliente(btn.getAttribute("data-pc-resolver-erro"));
        renderAdminPainel();
      });
    });
  }
  if (pcState.adminSecao === "usuarios") {
    document.getElementById("pcBtnAdminListarUsuarios").addEventListener("click", async () => {
      const filtro = {
        genero: document.getElementById("pcAdminUsuGenero").value,
        uf: document.getElementById("pcAdminUsuUf").value.trim().toUpperCase(),
        desde: document.getElementById("pcAdminUsuDesde").value,
        ate: document.getElementById("pcAdminUsuAte").value,
        statusCedula: document.getElementById("pcAdminUsuStatusCedula").value,
        tipoConta: document.getElementById("pcAdminUsuTipoConta").value,
      };
      pcState.adminUsuariosFiltro = filtro;
      pcState.adminUsuariosResultados = await adminListarUsuarios(filtro);
      renderAdminPainel();
    });
  }
  if (pcState.adminSecao === "bots") {
    const selUf = document.getElementById("pcAdminBotsUf");
    if (selUf) selUf.addEventListener("change", () => {
      pcState.adminBotsEstado = selUf.value;
      pcState.adminBotsStatus = null;
      renderAdminPainel();
    });
    const btnCedula = document.getElementById("pcBtnBotsUsarCedula");
    if (btnCedula) btnCedula.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      if (pcState.adminBotsFontes) { pcState.adminBotsFontes = null; renderAdminPainel(); return; }
      btnCedula.disabled = true;
      pcState.adminBotsFontes = await botsListarFontesReferencia(uf);
      renderAdminPainel();
    });
    document.querySelectorAll("[data-pc-bots-fonte]").forEach((b) => b.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      const fonte = (pcState.adminBotsFontes || []).find((f) => String(f.id) === b.dataset.pcBotsFonte);
      const rotulo = fonte && fonte.depositado_em ? "a cédula depositada" : "a lista salva";
      if (!window.confirm(`Usar ${rotulo} "${fonte ? fonte.nome : ""}" como referência dos bots de ${uf}?\n\nA referência anterior (se houver) vira histórico. Os bots já gerados NÃO mudam sozinhos — só no próximo "Gerar".`)) return;
      b.disabled = true;
      const r = await botsUsarSalvamentoComoReferencia(uf, b.dataset.pcBotsFonte);
      pcState.adminBotsFontes = null;
      pcState.adminBotsStatus = r.ok
        ? { tipo: "ok", texto: `Referência de ${uf} atualizada a partir de ${r.depositadaEm ? `cédula depositada em ${new Date(r.depositadaEm).toLocaleDateString("pt-BR")}` : "lista salva"} — "${r.nome}".` }
        : { tipo: "erro", texto: r.mensagem };
      renderAdminPainel();
    }));
    const btnSalvarCfg = document.getElementById("pcBtnBotsSalvarConfig");
    if (btnSalvarCfg) btnSalvarCfg.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      const lote = parseInt(document.getElementById("pcAdminBotsLote").value, 10);
      const variacao = parseInt(document.getElementById("pcAdminBotsVariacao").value, 10);
      if (!lote || lote < 1 || lote > 500) { pcState.adminBotsStatus = { tipo: "erro", texto: "Lote precisa estar entre 1 e 500." }; renderAdminPainel(); return; }
      if (isNaN(variacao) || variacao < 0 || variacao > 100) { pcState.adminBotsStatus = { tipo: "erro", texto: "Variação precisa estar entre 0 e 100%." }; renderAdminPainel(); return; }
      // Progressão (migração 49): os dois juntos ou nenhum.
      const txtIni = document.getElementById("pcAdminBotsIniciais").value.trim();
      const txtInc = document.getElementById("pcAdminBotsIncremento").value.trim();
      const iniciais = txtIni === "" ? null : parseInt(txtIni, 10);
      const incremento = txtInc === "" ? null : parseInt(txtInc, 10);
      if ((iniciais === null) !== (incremento === null)) { pcState.adminBotsStatus = { tipo: "erro", texto: "Preencha \"bots iniciais\" e \"incremento por dia\" juntos (ou deixe os dois vazios)." }; renderAdminPainel(); return; }
      if (iniciais !== null && (isNaN(iniciais) || iniciais < 0 || iniciais > lote)) { pcState.adminBotsStatus = { tipo: "erro", texto: `Bots iniciais precisa estar entre 0 e o lote (${lote}).` }; renderAdminPainel(); return; }
      if (incremento !== null && (isNaN(incremento) || incremento < 0 || incremento > 500)) { pcState.adminBotsStatus = { tipo: "erro", texto: "Incremento por dia precisa estar entre 0 e 500." }; renderAdminPainel(); return; }
      const cfgAtual = await botsCarregarConfig(uf);
      const ok = await botsSalvarConfig({
        estado: uf, ligado: document.getElementById("pcAdminBotsLigado").checked, lote, variacao_pct: variacao,
        bots_iniciais: iniciais, incremento_dia: incremento,
        progressao_inicio: cfgAtual && cfgAtual.progressao_inicio ? cfgAtual.progressao_inicio : null,
      });
      pcState.adminBotsStatus = ok ? { tipo: "ok", texto: `Regulação de ${uf} salva.` } : { tipo: "erro", texto: "Não consegui salvar — as migrações 36 e 49 já foram rodadas?" };
      renderAdminPainel();
    });
    const btnAplicar = document.getElementById("pcBtnBotsAplicar");
    if (btnAplicar) btnAplicar.addEventListener("click", async () => {
      const uf = pcState.adminBotsEstado || "SC";
      if (!window.confirm(`Aplicar agora os bots de ${uf}?\n\nCria no servidor as contas que faltam (até o lote) e regrava o palpite de todas em cima da referência ativa, com a variação configurada. Rodar de novo não duplica bots.`)) return;
      btnAplicar.disabled = true;
      btnAplicar.textContent = "Aplicando…";
      const r = await botsAplicarAgora(uf);
      pcState.adminBotsStatus = r.ok
        ? { tipo: "ok", texto: `Bots de ${uf} aplicados — ${r.detalhe}.` }
        : { tipo: "erro", texto: r.mensagem || "Não consegui aplicar os bots." };
      renderAdminPainel();
    });
  }
  if (pcState.adminSecao === "analitico") {
    const chkBots = document.getElementById("pcAdminAnaliticoBots");
    if (chkBots) chkBots.addEventListener("change", () => {
      pcState.adminAnaliticoIncluiBots = chkBots.checked;
      renderAdminPainel();
    });
    ligarListenersHistoricoAcoes();
  }
  if (pcState.adminSecao === "pesquisa") {
    document.getElementById("pcBtnAdminPesquisar").addEventListener("click", async () => {
      const genero = document.getElementById("pcAdminFiltroGenero").value;
      const uf = document.getElementById("pcAdminFiltroUf").value.trim().toUpperCase();
      pcState.adminPesquisaFiltro = { genero, uf };
      pcState.adminPesquisaResultados = await adminPesquisaAgregada(pcState.estado || "SC", genero, uf);
      renderAdminPainel();
    });
    document.querySelectorAll("[data-pc-admin-pesquisa-cargo]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pcState.adminPesquisaCargo = btn.getAttribute("data-pc-admin-pesquisa-cargo");
        renderAdminPainel();
      });
    });
  }
}

// ---------- Painel do usuário final ----------
// Acesso restrito por pcState.souUsuarioFinal (migração 19, tabela
// usuarios_finais — concedido manualmente, mesmo padrão do admin). PROJETO.md
// seção 3: "parceiro estratégico" (partido, empresário) que não prevê, só
// consome dados agregados — nunca perfil individual de quem previu (ponto em
// aberto #1). Por isso reaproveita montarComparacaoGrupo, que já só agrega
// por partido/vagas, igual à seção "Pesquisa" do admin — só troca a função
// de origem dos dados (usuarioFinalPesquisaAgregada em vez de
// adminPesquisaAgregada) e não tem as outras 4 abas administrativas.
async function renderPainelUsuarioFinal() {
  const el = document.getElementById("pcConteudo");
  el.innerHTML = telaCarregando("Carregando painel de dados estratégicos…");
  if (!pcState.souUsuarioFinal) {
    // Mesmo ajuste de renderAdminPainel — sem botão de voltar, essa tela
    // vira um beco sem saída (menu fixo fica escondido nessa subaba).
    el.innerHTML = `<div class="glass-card"><h2>Acesso restrito</h2><div class="pc-sub">Essa área é só pra parceiros com acesso liberado.</div><button class="ghost" id="pcBtnVoltarUsuarioFinalRestrito" style="width:100%; margin-top:10px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Voltar</button></div>`;
    document.getElementById("pcBtnVoltarUsuarioFinalRestrito").addEventListener("click", () => {
      pcState.subaba = "menu";
      renderAppColaborativo();
    });
    return;
  }

  const filtro = pcState.ufPesquisaFiltro || {};
  let resultadoHtml = "";
  if (pcState.ufPesquisaResultados) {
    const registros = pcState.ufPesquisaResultados;
    if (!registros.length) {
      resultadoHtml = estadoVazio({ icone: "buscar", titulo: "Nenhuma cédula encontrada", texto: "Ninguém oficial bateu com esses filtros — tenta afrouxar o recorte." });
    } else {
      const cargo = pcState.ufPesquisaCargo || "estadual";
      const botoesCargo = CARGOS.map((c) => `<button data-pc-uf-pesquisa-cargo="${c.id}" class="${cargo === c.id ? "active" : ""}">${c.label}</button>`).join("");
      resultadoHtml = `
        <div class="pc-sub" style="margin:14px 0 8px;">${registros.length} cédula${registros.length === 1 ? "" : "s"} encontrada${registros.length === 1 ? "" : "s"}</div>
        <div class="pc-cargo-switch" style="margin-bottom:12px;">${botoesCargo}</div>
        ${montarComparacaoGrupo(registros, cargo)}`;
    }
  }

  el.innerHTML = `
    <button class="pc-mini-btn" id="pcBtnVoltarUsuarioFinal" title="Voltar" style="margin-bottom:14px;">${iconeSvg("setaEsquerda", 15)}</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 4px 2px;">Dados estratégicos</div>
    <div class="pc-sub" style="margin:0 0 16px 2px;">Resultados agregados das cédulas oficiais já depositadas — sem nome nem perfil individual de quem previu.</div>
    <div class="glass-card">
      <div class="pc-sub" style="margin-bottom:12px;">Filtra por recorte demográfico — dado disponível hoje é só gênero e UF de residência (idade ainda não é coletada no cadastro).</div>
      <div class="field-row"><label>Gênero</label>
        <select class="cell" id="pcUfFiltroGenero">
          <option value="">Todos</option>
          <option value="Masculino" ${filtro.genero === "Masculino" ? "selected" : ""}>Masculino</option>
          <option value="Feminino" ${filtro.genero === "Feminino" ? "selected" : ""}>Feminino</option>
          <option value="Outro" ${filtro.genero === "Outro" ? "selected" : ""}>Outro</option>
        </select>
      </div>
      <div class="field-row"><label>UF de residência</label><input class="cell" id="pcUfFiltroUf" value="${filtro.uf || ""}" placeholder="ex: SC" maxlength="2" style="text-transform:uppercase;"></div>
      <button class="primary" id="pcBtnUfPesquisar" style="width:100%;">Buscar</button>
      ${resultadoHtml}
    </div>`;

  document.getElementById("pcBtnVoltarUsuarioFinal").addEventListener("click", () => {
    pcState.subaba = "menu";
    renderAppColaborativo();
  });
  document.getElementById("pcBtnUfPesquisar").addEventListener("click", async () => {
    const genero = document.getElementById("pcUfFiltroGenero").value;
    const uf = document.getElementById("pcUfFiltroUf").value.trim().toUpperCase();
    pcState.ufPesquisaFiltro = { genero, uf };
    pcState.ufPesquisaResultados = await usuarioFinalPesquisaAgregada(pcState.estado || "SC", genero, uf);
    renderPainelUsuarioFinal();
  });
  document.querySelectorAll("[data-pc-uf-pesquisa-cargo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.ufPesquisaCargo = btn.getAttribute("data-pc-uf-pesquisa-cargo");
      renderPainelUsuarioFinal();
    });
  });
}
