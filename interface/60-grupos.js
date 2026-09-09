// Grupos privados de comparação: hub, criar, entrar, membro e
// montarComparacaoGrupo (também usada pelo admin e pelo usuário final).
// Ordem de carga no index.html.


// ---------- Grupos privados de comparação ----------
// Ver nuvem/migracao-8-grupos.sql (schema) e nuvem/grupos.js (CRUD). Uma
// pessoa cria um grupo com nome e ganha um código de convite de 6
// caracteres; quem tem o código entra; a comparação usa os rascunhos por
// cargo (Migração 7), não o palpite público de um cargo só (mesma razão de
// Compartilhar, acima).

async function garantirMeusGruposCarregados() {
  if (pcState.meusGrupos) return;
  pcState.meusGrupos = await meusGrupos(pcState.perfil.id);
}

async function renderGrupoHub() {
  pcState._farolContexto = "grupos";
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando seus grupos…");
  await garantirMeusGruposCarregados();

  // Padrão visual 8.1 (PROJETO.md, 16/08/2026): cada grupo é um mini-card
  // com ícone-em-quadrado + nome + membros/código + seta; as duas ações de
  // "novo grupo" usam a mesma grade de atalhos do Painel (.pc-lobby-atalho),
  // substituindo a faixa horizontal antiga (.pc-lobby-menu-faixa).
  const linhasGrupo = pcState.meusGrupos.map((g) => `
    <button class="pc-mini-card" data-pc-abrir-grupo="${g.id}">
      <div class="pc-mini-card-icone">${iconeSvg("grupos", 17)}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${g.nome}</div>
        <div style="font-size:11px; color:var(--pc-ink-dim); margin-top:1px; font-family:var(--mono);">código ${g.codigo_convite}</div>
      </div>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pc-ink-dim)" stroke-width="1.8" style="flex-shrink:0;"><path d="M9 6l6 6-6 6"></path></svg>
    </button>`).join("");

  conteudo.innerHTML = `
    <div id="pcFarolBloco"></div>
    <div style="font-size:20px; font-weight:700; margin:2px 0 16px 2px;">Grupos</div>
    ${pcState.perfil && pcState.perfil.codigo_convite ? `
    <div class="pc-lobby-banner" style="margin-bottom:16px;">
      <div class="pc-lobby-banner-eyebrow">Convide e ganhe</div>
      <div class="pc-lobby-banner-titulo">Seu link pessoal de convite</div>
      <div class="pc-lobby-banner-corpo">Cada amigo que entrar pelo seu link e <b>depositar a primeira cédula</b> rende <b>1 SL</b> pra você, automaticamente. Você recebe uma notificação a cada convite convertido.</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="pc-lobby-banner-btn" id="pcBtnCopiarConvite">${iconeSvg("copiar", 13)} Copiar link</button>
        <button class="pc-lobby-banner-btn" id="pcBtnZapConvite" style="background:none; border:1px solid #4D545C; color:var(--pc-ink);">${iconeSvg("send", 13)} WhatsApp</button>
      </div>
      <div class="pc-status" id="pcConviteStatus" style="margin-top:6px; min-height:12px;"></div>
    </div>` : ""}
    ${pcState.avisoLimiteGrupoAberto ? `
    <div class="pc-aviso-card">
      <div class="pc-aviso-titulo">Você chegou no limite grátis</div>
      <div class="pc-aviso-corpo">Sua conta tem espaço grátis pra <b>1 grupo criado</b>. Abrir outro custa <b>10 SL</b> — dá pra juntar convidando amigos: cada convite que vira cédula depositada rende <b>1 SL</b> (Menu → Convidar amigos), além dos SL dos marcos de presença e da Loja.</div>
    </div>` : ""}
    ${pcState.meusGrupos.length ? `<div class="pc-lobby-menu-tit">Seus grupos</div>${linhasGrupo}` : `<div class="pc-lobby-card">${estadoVazio({ icone: "grupos", titulo: "Nenhum grupo ainda", texto: "Crie um grupo ou entre com um código de convite, logo abaixo." })}</div>`}
    <div class="pc-lobby-menu-tit" style="margin-top:18px;">Novo grupo</div>
    <div class="pc-lobby-atalhos">
      <button class="pc-lobby-atalho" id="pcBtnCriarGrupo">
        <div class="pc-lobby-atalho-icone">${iconeSvg("mais", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Criar grupo</div><div class="pc-lobby-atalho-sub">Você escolhe o nome</div></div>
      </button>
      <button class="pc-lobby-atalho" id="pcBtnEntrarGrupo">
        <div class="pc-lobby-atalho-icone">${iconeSvg("chave", 19)}</div>
        <div><div class="pc-lobby-atalho-titulo">Entrar com código</div><div class="pc-lobby-atalho-sub">Convite de um amigo</div></div>
      </button>
    </div>`;

  document.getElementById("pcBtnCriarGrupo").addEventListener("click", async () => {
    // A partir do 2º grupo criado (não conta os que a pessoa só ENTROU
    // com código de outro dono — só quem tem criado_por === o próprio
    // perfil) precisa de 1 crédito de verdade (RPC consumir_credito_proprio,
    // migração 9) — mesma regra e mesmo texto de "Minhas listas". Grupos só
    // é alcançado logado, então não precisa do desvio pro cadastro que
    // Minhas Listas tem pro convidado.
    const jaCriouGrupo = pcState.meusGrupos.some((g) => g.criado_por === pcState.perfil.id);
    if (jaCriouGrupo) {
      // Economia v3 §2.5: abrir grupo além do 1º custa 10 créditos (o
      // valor de 1 convite convertido — a promoção que virou regra).
      const { gastou, error } = await gastarCreditosConta(pcState.perfil.id, 10, "gasto", "abrir grupo");
      if (error) { pcState.erro = "Erro ao conferir crédito: " + error.message; }
      if (!gastou) {
        pcState.avisoLimiteGrupoAberto = true;
        renderGrupoHub();
        return;
      }
      pcState.avisoLimiteGrupoAberto = false;
    }
    pcState.telaGrupo = "criar";
    renderGrupoCriar();
  });
  atualizarFarol();
  document.getElementById("pcBtnEntrarGrupo").addEventListener("click", () => { pcState.telaGrupo = "entrar"; renderGrupoEntrar(); });
  const btnCopiarConvite = document.getElementById("pcBtnCopiarConvite");
  if (btnCopiarConvite) {
    const linkConvite = window.location.origin + window.location.pathname + "?conv=" + pcState.perfil.codigo_convite;
    // Mesmo texto revisado do convite de duelo (09/09/2026), adaptado —
    // este é o link de indicação genérico (sem duelo nomeado), então sem
    // a linha "já fechei meu palpite pra X". Ver interface/70-duelos.js.
    const textoConvite = `Bora dar um PITACO na eleição legislativa 2026?\n\nSimulador grátis: você monta o seu palpite pra Estadual, Federal e Senador com a matemática real da eleição (quociente, sobras, tudo), usando a votação de 2022 como base.\n\n${linkConvite}\n\nFerramentas que você libera ao criar sua conta (grátis):\n\n* Monte sua lista completa — (Estadual, Federal e Senador)\n* Matemática real da eleição (quociente, sobras, tudo)\n* Termômetro Eleitoral — a mediana dos palpites, atualizada em tempo real\n* Duelo 1×1 (Pitaco) — desafie qualquer amigo\n* Grupos — compare sua lista com uma galera inteira\n\n\n*É GRÁTIS*`;
    btnCopiarConvite.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(linkConvite);
        const s = document.getElementById("pcConviteStatus");
        if (s) s.textContent = "Link copiado.";
      } catch (err) { /* clipboard indisponível */ }
    });
    document.getElementById("pcBtnZapConvite").addEventListener("click", () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(textoConvite)}`, "_blank");
    });
  }
  document.querySelectorAll("[data-pc-abrir-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.grupoAtivo = pcState.meusGrupos.find((g) => g.id === btn.getAttribute("data-pc-abrir-grupo"));
      pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
      pcState.grupoMinhasCedulas = null;
      pcState.grupoCedulaEscolhida = null;
      pcState.telaGrupo = "membro";
      renderGrupoMembro();
    });
  });
}

function renderGrupoCriar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Grupos</button>
      <div style="font-size:20px; font-weight:700; margin:0 0 14px;">Criar grupo</div>
      <div class="field-row"><label>Nome do grupo</label><input class="cell" id="pcNomeGrupo" placeholder="ex: Amigos do bairro"></div>
      <div class="pc-erro" id="pcErroGrupo"></div>
      <button class="primary" id="pcBtnConfirmarCriarGrupo" style="margin-top:6px;">Criar</button>
    </div>`;
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => { pcState.telaGrupo = null; renderGrupoHub(); });
  document.getElementById("pcBtnConfirmarCriarGrupo").addEventListener("click", async () => {
    const nome = document.getElementById("pcNomeGrupo").value.trim();
    if (!nome) { document.getElementById("pcErroGrupo").textContent = "Dá um nome pro grupo."; return; }
    const { data, error } = await criarGrupo(pcState.perfil.id, nome);
    if (error) { document.getElementById("pcErroGrupo").textContent = error.message; return; }
    pcState.meusGrupos = [...(pcState.meusGrupos || []), data];
    pcState.grupoAtivo = data;
    pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
    // Faltava esta linha (achado em auditoria de QA, 25/08/2026) — sem
    // ela, criar um grupo e depois navegar pra outra aba e voltar pra
    // Grupos caía no formulário vazio de novo, mesmo com grupoAtivo já
    // preenchido certo. Mesmo padrão de renderGrupoEntrar logo abaixo.
    pcState.telaGrupo = "membro";
    renderGrupoMembro();
  });
}

function renderGrupoEntrar() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = `
    <div class="glass-card" style="max-width:420px; margin:0 auto;">
      <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Grupos</button>
      <div style="font-size:20px; font-weight:700; margin:0 0 14px;">Entrar com código</div>
      <div class="field-row"><label>Código de convite</label><input class="cell" id="pcCodigoGrupo" maxlength="6" style="text-transform:uppercase; font-family:var(--mono); letter-spacing:0.1em;" placeholder="ABC123"></div>
      <div class="pc-erro" id="pcErroGrupo"></div>
      <button class="primary" id="pcBtnConfirmarEntrarGrupo" style="margin-top:6px;">Entrar</button>
    </div>`;
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", () => { pcState.telaGrupo = null; renderGrupoHub(); });
  document.getElementById("pcBtnConfirmarEntrarGrupo").addEventListener("click", async () => {
    const codigo = document.getElementById("pcCodigoGrupo").value.trim();
    if (!codigo) { document.getElementById("pcErroGrupo").textContent = "Digita o código que te passaram."; return; }
    const { data, error } = await entrarNoGrupo(pcState.perfil.id, codigo);
    if (error) { document.getElementById("pcErroGrupo").textContent = error.message; return; }
    if (!pcState.meusGrupos.some((g) => g.id === data.id)) pcState.meusGrupos = [...pcState.meusGrupos, data];
    pcState.grupoAtivo = data;
    pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
    pcState.telaGrupo = "membro";
    renderGrupoMembro();
  });
}

// Mesma lógica de agregação do Quadro de Médias (calcularMedianaPalpites +
// dhondt), só que a partir da comparação de UM grupo e UM cargo por vez —
// diferente de renderQuadroMedias, não pode fixar "40"/BASE_2022, porque
// aqui o cargo muda (interruptor Estadual/Federal/Senador abaixo).
//
// Fonte trocada em 08/08/2026: só entra na comparação quem já DEPOSITOU a
// cédula daquele cargo (grupo_comparacao, migração 10, lê de
// listas_salvas_publicas) — antes usava o rascunho ao vivo (o que a pessoa
// está editando agora, mesmo sem confirmar nada), decisão revertida a
// pedido do usuário. calcularMedianaPalpites espera cada registro com uma
// chave "rascunho_<cargo>" (usada também pelo Quadro de Médias, que lê de
// rascunhos_publicos de verdade) — aqui só remapeamos "lista_<cargo>" (nome
// real da coluna nova) pra esse mesmo formato, sem tocar na função
// compartilhada.
function montarComparacaoGrupo(registros, cargo) {
  const remapeados = registros
    .filter((r) => r[`lista_${cargo}`] && r[`lista_${cargo}`].length)
    .map((r) => ({ perfil_id: r.perfil_id, [`rascunho_${cargo}`]: r[`lista_${cargo}`] }));
  if (!remapeados.length) {
    return estadoVazio({ icone: "grupos", titulo: "Ninguém depositou ainda", texto: "Assim que alguém do grupo depositar a cédula desse cargo, a comparação aparece aqui." });
  }
  // Sem votosDuelo aqui de propósito: comparação de GRUPO é escopo diferente
  // (só quem depositou naquele grupo), não a Mediana pública geral.
  // Faixa de incerteza (q1/q3, 04/09/2026) não foi replicada nesta tela de
  // comparação de grupo — o pedido do usuário foi especificamente sobre o
  // Termômetro Eleitoral (renderQuadroMedias); calcularMedianaPalpites já
  // devolve q1/q3 aqui também (mesma função), então dá pra reaproveitar
  // depois se pedirem essa tela também.
  const { parties, totalPalpites } = calcularMedianaPalpites(remapeados, cargo, pcState.estado);
  const totalVagasCargo = vagasFixasCargo(pcState.estado, cargo);
  // Senador é majoritário (mesmo motivo do branch em
  // classificarEleitosPorPartido, achado em 04/08/2026) — aqui as "vagas"
  // por partido vêm de contar quantos dos totalVagasCargo mais votados
  // (juntando todos os partidos numa fila só) são de cada um, não de
  // D'Hondt. Sem quociente eleitoral: esse conceito não existe pra cargo
  // majoritário.
  let seatsProj, qe;
  if (cargo === "senador") {
    const todosCand = [];
    parties.forEach((p, i) => p.candidatos.forEach((c) => todosCand.push({ partidoIdx: i, votos: Number(c.votos) || 0 })));
    const vencedores = [...todosCand].sort((a, b) => b.votos - a.votos).slice(0, totalVagasCargo);
    seatsProj = parties.map((_, i) => vencedores.filter((c) => c.partidoIdx === i).length);
    qe = null;
  } else {
    seatsProj = dhondt(parties, totalVagasCargo);
    qe = quocienteEleitoral(parties.reduce((s, p) => s + partyVotos(p), 0), totalVagasCargo);
  }
  const listaSeats = parties.map((p, i) => ({ nome: p.nome, seats: seatsProj[i] || 0 }));
  const linhasPartido = parties
    .map((p, i) => ({ p, votos: partyVotos(p), vagas: seatsProj[i] || 0 }))
    .sort((a, b) => b.vagas - a.vagas)
    .map(({ p, votos, vagas }) => `
      <tr><td>${p.nome}</td><td class="num">${p.vagas2022}</td>
        <td class="num" style="font-family:var(--mono)">${votos.toLocaleString("pt-BR")}</td>
        <td class="num" style="font-weight:700">${vagas}</td></tr>`).join("");
  return `
    <div class="pc-sub" style="margin-bottom:8px;">Baseado em ${totalPalpites} pessoa${totalPalpites === 1 ? "" : "s"} do grupo que já depositou a cédula desse cargo.</div>
    ${desenharHemiciclo(listaSeats, totalVagasCargo)}
    <div style="overflow-x:auto; margin-top:10px;">
    <table style="min-width:420px;">
      <thead><tr><th>Partido</th><th class="num">Vagas 22</th><th class="num">Votos (mediana)</th><th class="num">Vagas (mediana)</th></tr></thead>
      <tbody>${linhasPartido}</tbody>
    </table>
    </div>
    ${qe ? `<div class="pc-sub" style="margin-top:8px;">Quociente eleitoral (mediana do grupo): ${qe.toLocaleString("pt-BR")} votos/vaga.</div>` : ""}`;
}

async function renderGrupoMembro() {
  const conteudo = document.getElementById("pcConteudo");
  conteudo.innerHTML = telaCarregando("Carregando comparação do grupo…");
  // Não sobrescreve o estado já escolhido na sessão — SC só como padrão de
  // nascimento (grupo ainda não carrega o próprio estado; entra no guarda-
  // chuva da tarefa #36 quando os 27 abrirem de fato).
  pcState.estado = pcState.estado || "SC";
  if (!pcState.grupoComparacao) {
    pcState.grupoComparacao = await buscarComparacaoGrupo(pcState.grupoAtivo.id);
  }
  // Escolha de cédula por grupo (migração 15, pedido do usuário 13/08/2026)
  // — só faz sentido oferecer a troca se a pessoa tiver mais de uma cédula
  // depositada; com uma só não existe escolha real (cai na oficial de
  // qualquer forma).
  if (pcState.perfil && !pcState.grupoMinhasCedulas) {
    const todas = await carregarSalvamentosDe(pcState.perfil.id);
    pcState.grupoMinhasCedulas = todas.filter((s) => s.depositado_em);
    pcState.grupoCedulaEscolhida = pcState.grupoMinhasCedulas.length > 1
      ? await minhaEscolhaNoGrupo(pcState.grupoAtivo.id, pcState.perfil.id)
      : null;
  }
  const minhasCedulas = pcState.grupoMinhasCedulas || [];
  const registros = pcState.grupoComparacao;
  // Vagas (economia v3 §3.1/§5): capacidade vem do grupo (migração 22,
  // default 5 se o banco ainda não tiver a coluna); contagem de membros
  // pode falhar por policy — aí mostra só a capacidade.
  const capacidade = pcState.grupoAtivo.capacidade || 5;
  if (pcState.grupoMembrosTotal === undefined) {
    pcState.grupoMembrosTotal = await contarMembrosGrupo(pcState.grupoAtivo.id);
  }
  const souDono = pcState.perfil && pcState.grupoAtivo.criado_por === pcState.perfil.id;
  const ehVip = capacidade > 5;
  const botoesCargo = CARGOS.map((c) => `
    <button data-pc-cargo-grupo="${c.id}" class="${pcState.cargoAtivoGrupo === c.id ? "active" : ""}">${c.label}</button>`).join("");

  conteudo.innerHTML = `
    <button class="ghost" id="pcBtnVoltarGrupoHub" style="margin-bottom:14px;" style="display:flex; align-items:center; gap:6px;">${iconeSvg("setaEsquerda", 13)} Grupos</button>
    <div style="font-size:20px; font-weight:700; margin:2px 0 10px 2px;">${pcState.grupoAtivo.nome}</div>
    <div class="pc-lobby-card">
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim);">${registros.length} pessoa${registros.length === 1 ? "" : "s"} com cédula depositada</span>
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:6px;">${iconeSvg("chave", 13)}<b style="font-family:var(--mono); color:var(--pc-ink); font-weight:600;">${pcState.grupoAtivo.codigo_convite}</b></span>
      </div>
      <div class="pc-lobby-linha">
        <span style="font-size:12px; color:var(--pc-ink-dim); display:flex; align-items:center; gap:7px;">
          Vagas: <b style="color:var(--pc-ink); font-variant-numeric:tabular-nums;">${pcState.grupoMembrosTotal !== null && pcState.grupoMembrosTotal !== undefined ? `${pcState.grupoMembrosTotal}/${capacidade}` : capacidade}</b>
          ${ehVip ? `<span style="font-size:8.5px; font-weight:800; letter-spacing:.06em; background:rgba(232,236,239,.35); border:1px solid rgba(242,244,245,.4); color:var(--pc-ink); border-radius:5px; padding:2px 7px;">VIP · entrada livre pra convidados</span>` : ""}
        </span>
      </div>
      ${souDono && capacidade < 30 ? `
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:8px;">
        <span style="font-size:11px; color:var(--pc-ink-dim);">Amplie o grupo — quem entra pelo seu código nunca paga nada:</span>
        <div style="display:flex; gap:8px;">
          <button class="ghost" id="pcBtnVaga1" style="flex:1; font-size:12px; padding:9px;">+1 vaga · 10 créditos</button>
          <button class="ghost" id="pcBtnVaga5" style="flex:1; font-size:12px; padding:9px;" ${capacidade + 5 > 30 ? "disabled" : ""}>+5 vagas · 50 créditos</button>
        </div>
        <div class="pc-status" id="pcVagasStatus" style="min-height:12px;">${pcState.grupoVagasStatus || ""}</div>
      </div>` : ""}
      ${souDono && capacidade >= 30 ? `<div class="pc-lobby-linha"><span style="font-size:11px; color:var(--pc-ink-dim);">Teto de 30 pessoas atingido — grupos maiores são pra contas institucionais (fale com a gente).</span></div>` : ""}
    </div>
    ${minhasCedulas.length > 1 ? `
    <div class="pc-lobby-card" style="margin-top:10px;">
      <div class="pc-lobby-linha" style="flex-direction:column; align-items:stretch; gap:6px;">
        <span style="font-size:12px; color:var(--pc-ink-dim);">Sua cédula neste grupo</span>
        <select id="pcSelectCedulaGrupo" class="cell">
          <option value="">Oficial (a que vale na Mediana pública)</option>
          ${minhasCedulas.map((s) => `<option value="${s.id}" ${pcState.grupoCedulaEscolhida === s.id ? "selected" : ""}>${s.nome}${s.oficial ? " · oficial" : ""}</option>`).join("")}
        </select>
      </div>
    </div>` : ""}
    <div class="glass-card">
      ${registros.length > 1 ? `
      <div class="pc-cargo-switch" style="margin-bottom:14px;">${botoesCargo}</div>
      <div id="pcGrupoComparacaoConteudo">${montarComparacaoGrupo(registros, pcState.cargoAtivoGrupo)}</div>
      <div style="margin-top:14px;">
        <div class="pc-sub" style="margin-bottom:6px;">Quem já depositou:</div>
        ${registros.map((r) => `<span style="display:inline-block; margin:2px 4px 2px 0; padding:3px 10px; border-radius:999px; background:var(--pc-lobby-tom-3); font-size:11.5px; color:var(--pc-ink-dim);">${r.nome_exibicao}</span>`).join("")}
      </div>` : `
      <div style="text-align:center; padding:20px 10px;">
        ${iconeSvg("convidar", 32)}
        <h2 style="margin:10px 0 4px; font-size:15px;">Aguardando cédulas depositadas</h2>
        <div class="pc-sub" style="max-width:280px; margin:0 auto 16px;">A comparação só aparece quando pelo menos 2 pessoas do grupo tiverem depositado a própria cédula (não basta preencher, precisa confirmar o depósito). Convide mais gente com o código abaixo.</div>
        <div style="display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:999px; background:var(--pc-lobby-tom-3);">
          ${iconeSvg("chave", 14)}<b style="font-family:var(--mono); font-size:15px; letter-spacing:.05em;">${pcState.grupoAtivo.codigo_convite}</b>
        </div>
      </div>`}
    </div>
    ${pcState.perfil ? `
    <div style="text-align:center; margin-top:14px;">
      <button class="ghost" id="pcBtnSairGrupo" style="font-size:11.5px; color:var(--pc-danger);">Sair deste grupo</button>
    </div>` : ""}`;

  const btnVaga1 = document.getElementById("pcBtnVaga1");
  const btnVaga5 = document.getElementById("pcBtnVaga5");
  const comprarVagas = async (n, btn) => {
    btn.disabled = true;
    const r = await ampliarCapacidadeGrupo(pcState.grupoAtivo.id, n);
    if (r.semSaldo) {
      pcState.grupoVagasStatus = `Saldo insuficiente (precisa de ${n * 10} créditos) — convide amigos: cada convite convertido rende 10.`;
    } else if (r.erro) {
      pcState.grupoVagasStatus = "Não deu: " + r.erro;
    } else {
      pcState.grupoAtivo = { ...pcState.grupoAtivo, capacidade: r.capacidade };
      pcState.meusGrupos = pcState.meusGrupos.map((g) => g.id === pcState.grupoAtivo.id ? pcState.grupoAtivo : g);
      pcState.grupoVagasStatus = `Feito — o grupo agora tem ${r.capacidade} vagas.`;
    }
    renderGrupoMembro();
  };
  if (btnVaga1) btnVaga1.addEventListener("click", (e) => comprarVagas(1, e.target));
  if (btnVaga5) btnVaga5.addEventListener("click", (e) => comprarVagas(5, e.target));
  const voltarPraHub = () => {
    pcState.telaGrupo = null;
    pcState.grupoAtivo = null;
    pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = "";
    pcState.grupoMinhasCedulas = null;
    pcState.grupoCedulaEscolhida = null;
    pcState.meusGrupos = null; // força recarregar — a lista de grupos mudou
    renderGrupoHub();
  };
  document.getElementById("pcBtnVoltarGrupoHub").addEventListener("click", voltarPraHub);
  const btnSairGrupo = document.getElementById("pcBtnSairGrupo");
  if (btnSairGrupo) {
    btnSairGrupo.addEventListener("click", async () => {
      if (!confirm(`Sair do grupo "${pcState.grupoAtivo.nome}"? Você pode voltar depois com o código de convite.`)) return;
      btnSairGrupo.disabled = true;
      const { error } = await sairDoGrupo(pcState.grupoAtivo.id, pcState.perfil.id);
      if (error) { pcState.erro = "Erro ao sair do grupo: " + error.message; btnSairGrupo.disabled = false; return; }
      voltarPraHub();
    });
  }
  document.querySelectorAll("[data-pc-cargo-grupo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pcState.cargoAtivoGrupo = btn.getAttribute("data-pc-cargo-grupo");
      renderGrupoMembro();
    });
  });
  const selectCedula = document.getElementById("pcSelectCedulaGrupo");
  if (selectCedula) {
    selectCedula.addEventListener("change", async () => {
      const salvamentoId = selectCedula.value || null;
      selectCedula.disabled = true;
      const { error } = await escolherCedulaGrupo(pcState.grupoAtivo.id, pcState.perfil.id, salvamentoId);
      if (error) { pcState.erro = "Erro ao trocar a cédula do grupo: " + error.message; }
      pcState.grupoCedulaEscolhida = salvamentoId;
      pcState.grupoComparacao = null;
    pcState.grupoMembrosTotal = undefined;
    pcState.grupoVagasStatus = ""; // força recarregar — a view grupo_comparacao muda com a escolha
      renderGrupoMembro();
    });
  }
}
