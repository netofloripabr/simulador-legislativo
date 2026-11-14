// Perfil do servidor da ALESC (só administrador · migração 89). Usado pelo Painel do administrador (aba Servidores) e
// pela estrutura da Casa em Parlamentares. Lê adm_servidores, adm_atos/adm_ato_pessoas (Diário da Assembleia),
// adm_contracheques e as notas da própria conta (adm_notas). Precisa do global supabaseClient.
// Seções em sanfona: contracheque (com o cálculo e os auxílios pela norma), histórico de movimentação (cada ato do
// Diário: nomeação, exoneração, nível, lotação, disposição), notas pessoais e outras pessoas com o mesmo sobrenome.
(function () {
  const sb = () => (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rs = (v) => "R$ " + (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (s) => +String(s || "").replace(/[R$\s.]/g, "").replace(",", ".") || 0;
  const tit = (s) => String(s || "").toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, (m) => m.toLowerCase()).replace(/^(Lideran\S* do) (.+)$/, (m, a, b) => a + " " + b.toUpperCase()); // sigla do partido em maiúsculas
  const dt = (d) => (d ? d.split("-").reverse().join("/") : "—");
  const PART = new Set(["DA", "DE", "DO", "DAS", "DOS", "E", "FILHO", "FILHA", "NETO", "NETA", "JUNIOR", "SOBRINHO"]);
  // sobrenomes de família: sem o 1º nome e partículas; até 3 palavras fica o último, com 4 ou mais os dois últimos
  const sobrenomes = (n) => { const w = String(n).toUpperCase().split(/\s+/).filter((x) => x.length > 2 && !PART.has(x)); return w.length <= 1 ? [] : w.length <= 3 ? w.slice(-1) : w.slice(-2); };
  // auxílios fora do contracheque, pela norma (mesma regra do Administrativo, painel/novos.js): saúde = maior entre a
  // 1ª faixa etária (R$ 1.416) e 15% da remuneração (Ato da Mesa 002/2015, art. 3º, II); alimentação = R$ 3.144,21
  const SAU_MIN = 1416, BEN_SAU = 0.15, ALIM = 3144.21;

  const CSS = `.svov{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
  .svmd{background:#15191C;color:#F2F4F5;border:1px solid #262C31;border-radius:18px;width:100%;max-width:680px;max-height:90vh;overflow:auto;padding:18px 20px;font:14px/1.45 Inter,system-ui,sans-serif}
  .svmd .mh{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.svmd .mh b{font-size:18px;display:block}.svmd .mh small{color:#7E848A}
  .svmd .tps{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.svmd .tp{background:#1E2327;border:1px solid #262C31;color:#B0B5BA;border-radius:999px;padding:5px 11px;font:600 12px/1 Inter,system-ui,sans-serif;cursor:pointer}.svmd .tp em{font-style:normal;font-weight:500;color:#7E848A;margin-left:6px}.svmd .tp.on{background:#F2F4F5;border-color:#F2F4F5;color:#15191C}.svmd .tp.on em{color:#545A60}
  .svmd .x{background:#1E2327;border:0;color:#F2F4F5;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;flex:none}
  .svmd .pf{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:#B0B5BA;margin:6px 0 4px}.svmd .pf b{color:#F2F4F5;font-weight:600}
  .svmd .st{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:#1E2327;color:#B0B5BA}.svmd .st.ex{background:rgba(255,159,67,.12);color:#FF9F43}
  .svmd details{border-top:1px solid #262C31}.svmd summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:12px 0;font-weight:700;font-size:13.5px}.svmd summary::-webkit-details-marker{display:none}
  .svmd summary small{font-weight:500;color:#7E848A;margin-left:auto}.svmd summary i{font-style:normal;color:#7E848A;transition:transform .2s}.svmd details[open] summary i{transform:rotate(180deg)}.svmd details > div{padding-bottom:12px}
  .svmd .tw{overflow-x:auto;border:1px solid #262C31;border-radius:12px}.svmd table{width:100%;border-collapse:collapse;font-size:12.5px}.svmd th{font-size:11px;font-weight:500;color:#7E848A;text-align:left;padding:8px 10px;border-bottom:1px solid #262C31;white-space:nowrap}
  .svmd td{padding:8px 10px;border-bottom:1px solid #262C31;vertical-align:top}.svmd tr:last-child td{border-bottom:0}.svmd .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.svmd .mu{color:#7E848A}.svmd .d{white-space:nowrap;color:#B0B5BA}.svmd td small{display:block;color:#7E848A;font-size:11.5px}
  .svmd tr.sc td{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#7E848A;font-weight:700;padding-top:12px}.svmd tr.sb td{font-weight:700;border-top:1px solid #262C31}
  .svmd tr.tt td{background:rgba(61,123,255,.10);border-top:1px solid rgba(61,123,255,.35);padding:12px 10px}.svmd tr.tt td:first-child{font-weight:700;font-size:14px}.svmd tr.tt td.r{font-size:18px;font-weight:800;color:#3D7BFF}
  .svmd .nota{color:#7E848A;font-size:12px;margin:8px 0 0}.svmd textarea{width:100%;min-height:60px;background:#0B0D0E;border:1px solid #262C31;border-radius:10px;color:#F2F4F5;font:inherit;font-size:13px;padding:8px 10px;resize:vertical;box-sizing:border-box}
  .svmd .ad{margin-top:6px;background:#F2F4F5;color:#0B0D0E;border:0;border-radius:999px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:12.5px}.svmd .nt{border-left:2px solid #262C31;padding:4px 0 4px 10px;margin-bottom:8px;font-size:13px}.svmd .nt small{display:block;color:#7E848A;font-size:11.5px}
  .svmd .nt button{background:none;border:0;color:#7E848A;cursor:pointer;font-size:11.5px;padding:0;margin-left:8px}.svmd h5{margin:10px 0 4px;font-size:12px;color:#7E848A;letter-spacing:.06em;text-transform:uppercase}.svmd .lk{background:none;border:0;color:#F2F4F5;font:inherit;cursor:pointer;padding:0;text-align:left;text-decoration:underline;text-decoration-color:#262C31;text-underline-offset:3px}`;
  const css = () => { if (!document.getElementById("svCss")) { const s = document.createElement("style"); s.id = "svCss"; s.textContent = CSS; document.head.appendChild(s); } };

  async function carregar(mat) {
    const c = sb(); if (!c) throw new Error("sem conexão");
    const [s, ap, cc, nt] = await Promise.all([c.from("adm_servidores").select("*").eq("matricula", mat).maybeSingle(),
      c.from("adm_ato_pessoas").select("nivel_de, nivel, nome, adm_atos(id, edicao, publicado, tipo, numero, data_ato, efeito, acoes, codigos, cargo, lotacoes, sei, disposicao, url, texto)").eq("matricula", mat),
      c.from("adm_contracheques").select("*").eq("matricula", mat).order("gravado_em", { ascending: false }).limit(6),
      c.from("adm_notas").select("*").eq("matricula", mat).order("criado_em", { ascending: false })]);
    if (s.error) throw s.error;
    const atos = (ap.data || []).filter((x) => x.adm_atos).map((x) => ({ ...x.adm_atos, nivel_de: x.nivel_de, nivel: x.nivel })).sort((a, b) => String(b.efeito || b.data_ato || "").localeCompare(String(a.efeito || a.data_ato || "")));
    const sv = s.data || { matricula: mat, nome: (ap.data || [])[0]?.nome || "", situacao: "desconhecido" };
    let mesmo = [];
    const sbn = sobrenomes(sv.nome);
    if (sbn.length) { const r = await c.from("adm_servidores").select("matricula, nome, vinculo, lotacao, situacao").or(sbn.map((w) => `nome.ilike.%${w}%`).join(",")).limit(1000); mesmo = (r.data || []).filter((x) => x.matricula !== mat).map((x) => ({ ...x, sb: sobrenomes(x.nome).filter((w) => sbn.includes(w)) })).filter((x) => x.sb.length); }
    return { sv, atos, cc: cc.data || [], notas: nt.data || [], sbn, mesmo };
  }

  function tabContracheque(cc) {
    if (!cc) return `<p class="nota">Sem contracheque gravado ainda.</p>`;
    const R = cc.linhas || []; let sec = "";
    const lin = R.map(([g, n, v, a]) => { if (/^(BRUTO|LÍQUIDO)$/.test(n)) return `<tr class="sb"><td>${n === "BRUTO" ? "Bruto" : "Líquido"}</td><td class="r">${esc(v)}</td><td class="r mu">${a && a !== "—" ? esc(a) : ""}</td></tr>`;
      if (!v && !a) return ""; const cab = g && g !== sec ? ((sec = g), `<tr class="sc"><td colspan="3">${esc(g)}</td></tr>`) : ""; return cab + `<tr><td>${esc(n)}</td><td class="r">${esc(v)}</td><td class="r mu">${a && a !== "—" ? esc(a) : ""}</td></tr>`; }).join("");
    const bru = cc.bruto || num((R.find((r) => r[1] === "BRUTO") || [])[2]), liq = cc.liquido || num((R.find((r) => r[1] === "LÍQUIDO") || [])[2]), q = bru * BEN_SAU, sd = Math.max(SAU_MIN, q);
    return `<div class="tw"><table><thead><tr><th>Rubrica</th><th class="r">Mês atual</th><th class="r">Atrasados</th></tr></thead><tbody>${lin}</tbody></table></div>
      <div class="tw" style="margin-top:10px"><table><thead><tr><th>Fora do contracheque · pela norma</th><th class="r">Valor</th></tr></thead><tbody>
      <tr><td>Auxílio-saúde<small>${q >= SAU_MIN ? `15% da remuneração (${rs(bru)})` : `1ª faixa etária (até 47 anos), maior que 15% da remuneração`} · Ato da Mesa 002/2015, art. 3º, II · pela idade pode ser R$ 2.160 (48 a 59) ou R$ 3.480 (60+)</small></td><td class="r">${rs(sd)}</td></tr>
      <tr><td>Auxílio-alimentação<small>valor pago aos deputados em 09/2026 · Res. 1.344/1993 · a confirmar para servidores</small></td><td class="r">${rs(ALIM)}</td></tr>
      <tr class="tt"><td>Líquido + auxílios<small>auxílios são indenizatórios: sem IR nem previdência</small></td><td class="r">${rs(liq + sd + ALIM)}</td></tr></tbody></table></div>
      <p class="nota">Fonte: portal da transparência da ALESC, contracheque ${esc(cc.referencia)}.</p>`;
  }
  const MOV = new Set(["NOMEAR", "EXONERAR", "ALTERAR NÍVEL", "LOTAR", "POSICIONAR", "PROMOVER", "DISPENSAR", "CEDER", "COLOCAR À DISPOSIÇÃO", "RETORNAR", "REMOVER", "REDISTRIBUIR", "ENQUADRAR", "APOSENTAR", "AFASTAR", "FAZER CESSAR"]);
  const tipoAto = (a) => { const ac = a.acoes || []; return ac.includes("FISCAL DE CONTRATO") ? "fis" : a.disposicao || ac.some((x) => MOV.has(x)) ? "mov" : "out"; };
  function tabHistorico(atos) {
    if (!atos.length) return `<p class="nota">Nenhum ato encontrado no Diário da Assembleia (2019 em diante) para esta matrícula.</p>`;
    // etiquetas por tipo de ato (14/11/2026): Movimentação (nomear, exonerar, nível, lotação, cessão…), Fiscal de contrato e Outros
    const N = { mov: 0, fis: 0, out: 0 }; atos.forEach((a) => { a._tp = tipoAto(a); N[a._tp]++; });
    const ini = N.mov ? "mov" : N.fis ? "fis" : "out";
    const chips = [["mov", "Movimentação"], ["fis", "Fiscal de contrato"], ["out", "Outros"]].filter(([k]) => N[k]).map(([k, t]) => `<button class="tp${k === ini ? " on" : ""}" data-svtp="${k}">${t}<em>${N[k]}</em></button>`).join("") + `<button class="tp" data-svtp="todos">Todos<em>${atos.length}</em></button>`;
    return `<div class="tps">${chips}</div><div class="tw"><table><thead><tr><th>Data</th><th>Ação</th><th>Cargo · nível</th><th>Lotação</th><th>Ato</th></tr></thead><tbody>${atos.map((a) => `<tr data-tp="${a._tp}"${a._tp === ini ? "" : " hidden"}><td class="d">${dt(a.efeito || a.data_ato)}</td><td><b>${esc((a.acoes || []).join(", ") || "—")}</b>${a.disposicao ? "<small>disposição / cessão</small>" : ""}</td><td class="mu">${esc(a.cargo || "")}${a.nivel ? `<small>${a.nivel_de ? esc(a.nivel_de) + " → " : ""}${esc(a.nivel)}</small>` : (a.codigos || []).length ? `<small>${esc(a.codigos.join(", "))}</small>` : ""}</td><td class="mu">${esc((a.lotacoes || []).join(" · "))}</td><td><a href="${esc(a.url)}" target="_blank" rel="noopener" style="color:#B0B5BA">${esc(tit(a.tipo))} ${esc(a.numero)}</a><small>Diário ${esc(a.edicao)} · ${dt(a.publicado)}</small></td></tr>`).join("")}</tbody></table></div>
      <p class="nota">Cada linha é um ato publicado no Diário da Assembleia; o link abre a edição.</p>`;
  }
  function tabNotas(mat, notas) { return `${notas.length ? notas.map((n) => `<div class="nt">${esc(n.texto)}<small>${new Date(n.criado_em).toLocaleDateString("pt-BR")}<button data-svdel="${n.id}">apagar</button></small></div>`).join("") : `<p class="nota" style="margin-top:0">Nenhuma nota sua ainda. As notas são pessoais: só você vê.</p>`}
    <textarea id="svNt" placeholder="Nota pessoal sobre este servidor"></textarea><button class="ad" data-svnt="${mat}">Adicionar nota</button>`; }
  function tabSobrenome(sbn, L) { if (!L.length) return `<p class="nota" style="margin-top:0">Ninguém com o mesmo sobrenome.</p>`;
    return sbn.map((w) => { const G = L.filter((x) => x.sb.includes(w)); return G.length ? `<h5>${esc(tit(w))} · ${G.length}</h5><div class="tw"><table><tbody>${G.slice(0, 60).map((x) => `<tr><td><button class="lk" data-svab="${x.matricula}">${esc(tit(x.nome))}</button><small>matrícula ${x.matricula}</small></td><td class="mu">${esc(x.vinculo || "")}${x.situacao !== "ativo" ? `<small>${esc(x.situacao)}</small>` : ""}</td><td class="mu">${esc(x.lotacao || "")}</td></tr>`).join("")}${G.length > 60 ? `<tr><td colspan="3" class="mu">+ ${G.length - 60} pessoas</td></tr>` : ""}</tbody></table></div>` : ""; }).join(""); }

  async function abrir(mat) {
    css(); mat = +mat; let ov = document.getElementById("svOv"); if (!ov) { ov = document.createElement("div"); ov.id = "svOv"; ov.className = "svov"; document.body.appendChild(ov); }
    ov.innerHTML = `<div class="svmd"><p class="nota">Carregando…</p></div>`; ov.style.display = "flex";
    // embutido no Gabinete (iframe alto): a janela abre perto do clique, não no meio do iframe
    const emb = document.documentElement.classList.contains("emb-adm"), topo = () => { if (emb) { const m = ov.querySelector(".svmd"); if (m) m.style.marginTop = Math.max(16, (window._embY || 0) - 140) + "px"; } }; topo();
    let D; try { D = await carregar(mat); } catch (e) { ov.innerHTML = `<div class="svmd"><div class="mh"><b>Servidor</b><button class="x" data-svx>×</button></div><p class="nota">Não foi possível abrir: ${esc(e.message || e)}</p></div>`; return; }
    const { sv, atos, cc, notas, sbn, mesmo } = D, sec = (t, s, h, ab) => `<details${ab ? " open" : ""}><summary>${t}<small>${s}</small><i>▾</i></summary><div>${h}</div></details>`;
    ov.innerHTML = `<div class="svmd"><div class="mh"><div><b>${esc(tit(sv.nome))}</b><small>${esc(sv.vinculo || "")}${sv.lotacao ? " · " + esc(sv.lotacao) : ""}</small></div><button class="x" data-svx>×</button></div>
      <div class="pf"><span>Matrícula <b>${sv.matricula}</b></span><span class="st${sv.situacao !== "ativo" ? " ex" : ""}">${esc(sv.situacao)}</span>${sv.ultimo_visto ? `<span>no portal até <b>${dt(sv.ultimo_visto)}</b></span>` : ""}</div>
      ${sec("Contracheque", cc[0] ? "referência " + esc(cc[0].referencia) : "sem leitura", tabContracheque(cc[0]), true)}${sec("Histórico de movimentação", atos.length + " ato" + (atos.length === 1 ? "" : "s"), tabHistorico(atos))}${sec("Notas", notas.length + " nota" + (notas.length === 1 ? "" : "s"), tabNotas(mat, notas))}${sec("Mesmo sobrenome", mesmo.length + " pessoa" + (mesmo.length === 1 ? "" : "s") + (sbn.length ? " · " + sbn.map(tit).join(", ") : ""), tabSobrenome(sbn, mesmo))}</div>`; topo();
  }
  async function buscar(q) { const c = sb(); q = String(q || "").trim(); if (!c || q.length < 2) return [];
    const r = /^\d+$/.test(q) ? await c.from("adm_servidores").select("matricula, nome, vinculo, lotacao, situacao").eq("matricula", +q) : await c.from("adm_servidores").select("matricula, nome, vinculo, lotacao, situacao").ilike("nome", `%${q.toUpperCase()}%`).order("nome").limit(50);
    return r.data || []; }

  document.addEventListener("click", async (e) => {
    const t = e.target;
    if (t.closest("[data-svx]") || t.id === "svOv") { document.getElementById("svOv").style.display = "none"; return; }
    const tp = t.closest("[data-svtp]"); if (tp) { const box = tp.closest("details") || document; box.querySelectorAll("[data-svtp]").forEach((x) => x.classList.toggle("on", x === tp)); box.querySelectorAll("tr[data-tp]").forEach((r) => { r.hidden = tp.dataset.svtp !== "todos" && r.dataset.tp !== tp.dataset.svtp; }); return; }
    const ab = t.closest("[data-svab]"); if (ab) { e.preventDefault(); abrir(ab.dataset.svab); return; }
    const nt = t.closest("[data-svnt]"); if (nt) { const tx = document.getElementById("svNt").value.trim(); if (!tx) return; const r = await sb().from("adm_notas").insert({ matricula: +nt.dataset.svnt, texto: tx }); if (r.error) { alert("Não gravou: " + r.error.message); return; } await abrir(nt.dataset.svnt); document.querySelectorAll("#svOv details")[2].open = true; return; }
    const dl = t.closest("[data-svdel]"); if (dl) { if (!confirm("Apagar esta nota?")) return; await sb().from("adm_notas").delete().eq("id", +dl.dataset.svdel); const m = document.querySelector("[data-svnt]").dataset.svnt; await abrir(m); document.querySelectorAll("#svOv details")[2].open = true; }
  });

  const DAS = { 12726.42: "DAS-3", 16340.59: "DAS-5", 18232.39: "DAS-6", 20173.54: "DAS-7" };
  const nivel = (v) => { const I = window.GAB_IDX, V = window.GAB_VAL || 296.55; if (!I || !v) return null; let b = null, e = 2; I.forEach((x, i) => { const d = Math.abs(x * V - v); if (d < e) { e = d; b = i + 1; } }); return b; };
  // corpo de cada gabinete da Mesa para o admin: vagas em bolinhas (vazada = livre), cota com o vazio pontilhado e quem está
  // nomeado (o nome abre o perfil). Chave = cargo da Mesa (mesma de EST.gabinetes_mesa); a Presidência junta as duas lotações.
  const MESA_K = { "Presidente": [["GP - CHEFIA DE GABINETE DA PRESIDENCIA", "GABINETE DA PRESIDENCIA"], 20, 258001.68], "1º Vice-Presidente": [["MD - 1ª VICE-PRESIDENCIA"], 9, 80797.67], "2º Vice-Presidente": [["MD - 2ª VICE-PRESIDENCIA"], 9, 80797.67], "1º Secretário": [["MD - 1ª SECRETARIA"], 9, 80797.67], "2º Secretário": [["MD - 2ª SECRETARIA"], 9, 80797.67], "3º Secretário": [["MD - 3ª SECRETARIA"], 9, 80797.67], "4º Secretário": [["MD - 4ª SECRETARIA"], 9, 80797.67] };
  const bolasH = (a, b) => `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px">${Array.from({ length: Math.max(a, b) }, (_, i) => `<i style="width:13px;height:13px;border-radius:50%;box-sizing:border-box;${i >= b ? "background:#FF9F43" : i >= a ? "border:1.5px dashed #7E848A" : "background:#B0B5BA"}"></i>`).join("")}</div>`;
  const barraH = (a, b) => a >= b ? `<div style="height:10px;border-radius:999px;margin-top:8px;background:${a > b ? "#FF9F43" : "#B0B5BA"}"></div>` : `<div style="display:flex;height:10px;margin-top:8px"><i style="width:${(a / b * 100).toFixed(1)}%;background:#B0B5BA;border-radius:999px 0 0 999px"></i><s style="flex:1;border:1.5px dashed #7E848A;border-left:0;border-radius:0 999px 999px 0;box-sizing:border-box"></s></div>`;
  async function mesaCorpos() { const c = sb(); if (!c) return null; const se = (await c.auth.getSession()).data.session; if (!se) return null; const ok = await c.rpc("gab_pode"); if (!ok.data) return null;
    const lots = Object.values(MESA_K).flatMap((x) => x[0]), S = await c.from("adm_servidores").select("matricula, nome, lotacao").in("lotacao", lots).eq("no_portal", true); if (S.error || !(S.data || []).length) return null;
    const C = await c.from("adm_contracheques").select("matricula, referencia, cargo_valor, gravado_em").in("matricula", S.data.map((x) => x.matricula)).order("gravado_em", { ascending: false });
    const ult = {}; (C.data || []).forEach((x) => { if (!ult[x.matricula]) ult[x.matricula] = x; });
    const out = {};
    for (const [k, [lot, mx, cota]] of Object.entries(MESA_K)) {
      const L = S.data.filter((x) => lot.includes(x.lotacao)).map((x) => { const u = ult[x.matricula] || {}, v = +u.cargo_valor || 0, gp = x.lotacao.startsWith("GP -"), nv = gp ? null : nivel(v);
        return { ...x, v, nv, ref: u.referencia, cg: gp ? "Chefe de Gabinete da Presidência · PL/DAS-8" : nv ? `Secretário Parlamentar · PL/GAM nível ${nv}` : DAS[v] ? `Assessor · PL/${DAS[v]}` : v ? "Cargo comissionado · nível a identificar" : "—" }; }).sort((a, b) => b.v - a.v);
      const gam = L.filter((x) => x.nv), u = gam.length, uv = gam.reduce((s2, x) => s2 + x.v, 0), tot = L.reduce((s2, x) => s2 + x.v, 0);
      const td = (h, r) => `<td style="padding:8px 10px;border-bottom:1px solid #262C31;${r ? "text-align:right;white-space:nowrap" : ""}">${h}</td>`;
      out[k] = { n: L.length, tot, html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;margin:4px 0 12px;font-size:12px;color:#7E848A"><div><span style="display:flex;justify-content:space-between">Secretários Parlamentares<b style="color:#F2F4F5">${u} de ${mx}</b></span>${bolasH(u, mx)}<small>${u > mx ? u - mx + " acima do limite" : mx - u ? mx - u + " vaga" + (mx - u === 1 ? "" : "s") + " livre" + (mx - u === 1 ? "" : "s") : "todas as vagas ocupadas"}</small></div><div><span style="display:flex;justify-content:space-between">Cota de nomeações<b style="color:#F2F4F5">${rs(uv)} de ${rs(cota)}</b></span>${barraH(uv, cota)}<small>${uv > cota ? "passa " + rs(uv - cota) : rs(cota - uv) + " disponíveis"}</small></div></div>
        <div style="overflow-x:auto;border:1px solid #262C31;border-radius:12px;margin-bottom:10px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tbody>${L.map((x) => `<tr>${td(`<button data-svab="${x.matricula}" style="background:none;border:0;color:#F2F4F5;font:inherit;font-weight:600;cursor:pointer;padding:0;text-align:left;text-decoration:underline;text-decoration-color:#262C31;text-underline-offset:3px">${esc(tit(x.nome))}</button>`)}${td(`<span style="color:#7E848A">${esc(x.cg)}</span>`)}${td(x.v ? rs(x.v) : "—", 1)}</tr>`).join("")}</tbody></table></div>` };
    }
    return out; }
  window.servidorMesaCorpos = mesaCorpos;

  // gabinete do deputado (Parlamentares › Estrutura do gabinete, só admin): quem está lotado em "GAB DEP <nome de urna>",
  // quantos ocupam as vagas de Secretário Parlamentar (valor do cargo bate com um nível PL/GAB) e quanto da cota usam
  const semAc = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
  async function gabinete(nomeUrna) { const c = sb(); if (!c) return null; const se = (await c.auth.getSession()).data.session; if (!se) return null; const ok = await c.rpc("gab_pode"); if (!ok.data) return null;
    const lot = "GAB DEP " + semAc(nomeUrna), S = await c.from("adm_servidores").select("matricula, nome, vinculo, lotacao").eq("no_portal", true).neq("vinculo", "Deputado").ilike("lotacao", lot + "%"); if (S.error || !(S.data || []).length) return null;
    const C = await c.from("adm_contracheques").select("matricula, referencia, cargo_valor, linhas, gravado_em").in("matricula", S.data.map((x) => x.matricula)).order("gravado_em", { ascending: false });
    const ult = {}; (C.data || []).forEach((x) => { if (!ult[x.matricula]) ult[x.matricula] = x; });
    // o Chefe de Gabinete vem na rubrica "Chefia de gabinete" (PL/DAS-7), não em "Cargo comissionado"
    const L = S.data.map((x) => { const u = ult[x.matricula] || {}, ch = (u.linhas || []).find((r) => /Chefia de gabinete/i.test(r[1] || "")), chefe = !!ch, v = chefe ? num(ch[2]) : +u.cargo_valor || 0, nv = chefe ? null : nivel(v); return { ...x, v, nv, ref: u.referencia, cota: !!nv && !chefe, cg: chefe ? "Chefe de Gabinete · PL/DAS-7" : nv ? `Secretário Parlamentar · PL/GAB nível ${nv}` : v ? "Cargo comissionado (nível a identificar)" : /disposi/i.test(x.vinculo || "") ? "À disposição · sem contracheque na ALESC" : "Sem valor de cargo no contracheque" }; }).sort((a, b) => b.v - a.v);
    const D = L.filter((x) => x.cota), tbl = `<details class="svgb" style="border-top:1px solid #262C31;margin-top:10px"><summary style="list-style:none;cursor:pointer;display:flex;gap:10px;align-items:baseline;padding:12px 0"><b>Quem está lotado</b><small style="margin-left:auto;color:#7E848A">${L.length} pessoa${L.length === 1 ? "" : "s"} · ${esc(S.data[0].lotacao)}${new Set(S.data.map((x) => x.lotacao)).size > 1 ? " e escritórios" : ""}</small><i style="font-style:normal;color:#7E848A">▾</i></summary>
      <div style="overflow-x:auto;border:1px solid #262C31;border-radius:12px;margin-bottom:12px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr>${["Nome", "Cargo", "Valor", "Na cota"].map((h, i) => `<th style="font-size:11px;font-weight:500;color:#7E848A;text-align:${i >= 2 ? "right" : "left"};padding:8px 10px;border-bottom:1px solid #262C31">${h}</th>`).join("")}</tr></thead><tbody>
      ${L.map((x) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #262C31"><button data-svab="${x.matricula}" style="background:none;border:0;color:#F2F4F5;font:inherit;font-weight:600;cursor:pointer;padding:0;text-align:left;text-decoration:underline;text-decoration-color:#262C31;text-underline-offset:3px">${esc(tit(x.nome))}</button><small style="display:block;color:#7E848A">${esc(x.vinculo || "")}${x.lotacao !== S.data[0].lotacao ? " · " + esc(x.lotacao) : ""}</small></td><td style="padding:8px 10px;border-bottom:1px solid #262C31;color:#7E848A">${esc(x.cg)}</td><td style="padding:8px 10px;border-bottom:1px solid #262C31;text-align:right;white-space:nowrap">${x.v ? rs(x.v) : "—"}</td><td style="padding:8px 10px;border-bottom:1px solid #262C31;text-align:right;color:#7E848A">${x.cota ? "sim" : "não"}</td></tr>`).join("")}</tbody></table></div></details>`;
    return { u: D.length, v: D.reduce((s, x) => s + x.v, 0), total: L.length, ref: (L.find((x) => x.ref) || {}).ref, html: tbl }; }
  window.servidorGabinete = gabinete;
  // estrutura da Casa (só admin): chave anônima do arquivo público → matrícula e nome (RPC adm_estrutura_nomes, migração 94).
  // Uma chamada, ~800 chaves (~40 KB de resposta). Sem sessão ainda (página abrindo), tenta de novo quando o login chegar.
  async function nomesChave(ks) { const c = sb(); if (!c || !ks.length) return null;
    let se = (await c.auth.getSession()).data.session;
    if (!se) se = await new Promise((ok) => { const t = setTimeout(() => ok(null), 8000); const { data } = c.auth.onAuthStateChange((ev, s2) => { if (s2) { clearTimeout(t); data.subscription.unsubscribe(); ok(s2); } }); });
    if (!se) return null;
    for (let i = 0; i < 2; i++) { const r = await c.rpc("adm_estrutura_nomes", { p_chaves: ks }); if (!r.error) { const N = {}; (r.data || []).forEach((x) => { N[x.chave] = { m: x.matricula, n: tit(x.nome) }; }); return N; } }
    return null; }
  window.servidorNomesChave = nomesChave;
  window.servidorAbrir = abrir; window.servidorBuscar = buscar;
})();
