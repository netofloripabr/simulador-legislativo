// Gabinete › Administrativo › RH do gabinete (17/11/2026; substitui o bloco "RH - Gabinete" de 04/11/2026, que está no
// histórico do git). O bloco junta duas coisas: a estrutura pela ALESC (cota de nomeações e quem está lotado, embutida
// de Parlamentares: novos.html?so=gab) e a equipe registrada pelo gabinete, com o botão "+": Nome, Cargo, natureza do
// vínculo (Comissionado, À disposição, Terceirizado, Estagiário ou outra escrita à mão), Valor e Observação, com filtro
// e totais por natureza. Grava em public.gab_cargos (grupo 'outro', coluna natureza da migração 102); sem sessão em
// localhost, grava no navegador (teste). Usa os globais de gabinete.js (PARL, SESS, LOCAL, PODE, EDITA, proprio, esc, $).
let RHC = [], RHF = null, RHN = ""; // linhas · formulário aberto (linha em edição ou {}) · filtro de natureza
const RH_NAT = ["Comissionado", "À disposição", "Terceirizado", "Estagiário"];
const rhLocal = () => LOCAL && !SESS, rhPode = () => rhLocal() || (proprio() && PODE && (typeof EDITA !== "function" || EDITA()));
const rhR$ = (v) => "R$ " + (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rhNat = (r) => r.natureza || "Comissionado";

async function rhCarregar() {
  if (rhLocal()) { try { RHC = JSON.parse(localStorage.getItem("gab_cargos_" + PARL.n) || "[]"); } catch (e) { RHC = []; } }
  else { const { data, error } = await supabaseClient.from("gab_cargos").select("*").eq("parlamentar", PARL.n).order("criado_em"); if (error) throw error; RHC = data || []; }
  RHC = RHC.filter((r) => r.grupo === "outro" || r.pessoa); }
async function rhGravar(row) { row = { ...row, parlamentar: PARL.n, grupo: "outro", atualizado_em: new Date().toISOString() };
  if (rhLocal()) { if (!row.id) { row.id = "l" + Date.now() + Math.random().toString(36).slice(2); row.criado_em = row.atualizado_em; RHC.push(row); } else RHC = RHC.map((x) => x.id === row.id ? { ...x, ...row } : x); localStorage.setItem("gab_cargos_" + PARL.n, JSON.stringify(RHC)); return; }
  const { id, ...dados } = row; const r = id ? await supabaseClient.from("gab_cargos").update(dados).eq("id", id) : await supabaseClient.from("gab_cargos").insert(dados); if (r.error) throw r.error; }
async function rhApagar(id) { if (rhLocal()) { RHC = RHC.filter((x) => x.id !== id); localStorage.setItem("gab_cargos_" + PARL.n, JSON.stringify(RHC)); return; }
  const r = await supabaseClient.from("gab_cargos").delete().eq("id", id); if (r.error) throw r.error; }

function rhForm() { const r = RHF || {}, nat = r.natureza || "Comissionado", outra = nat && !RH_NAT.includes(nat);
  return `<form class="eq-f" id="rhF"><div class="eq-fg">
    <label>Nome<input name="pessoa" required value="${esc(r.pessoa || "")}" placeholder="Nome da pessoa"></label>
    <label>Cargo<input name="cargo" required value="${esc(r.cargo || "")}" placeholder="Ex.: Assessor de comunicação"></label>
    <label>Natureza<select name="nat">${[...RH_NAT, "Outro"].map((n) => `<option${(outra ? n === "Outro" : n === nat) ? " selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="eq-outra"${outra ? "" : " hidden"}>Qual?<input name="nat_outra" value="${outra ? esc(nat) : ""}" placeholder="Escreva a natureza"></label>
    <label>Valor mensal (R$)<input name="valor" inputmode="decimal" value="${r.valor != null ? String(r.valor).replace(".", ",") : ""}" placeholder="0,00"></label>
    <label class="eq-obs">Observação<textarea name="obs" rows="2">${esc(r.obs || "")}</textarea></label></div>
    <div class="eq-fb">${r.id ? `<button type="button" class="btn sec eq-del" data-rhdel="${esc(r.id)}">Excluir</button>` : ""}<span></span><button type="button" class="btn sec" data-rhcan>Cancelar</button><button class="btn">${r.id ? "Salvar" : "Adicionar"}</button></div></form>`; }

function rhDesenhar() { const el = $("#rhLista"); if (!el) return; const pode = rhPode();
  const nats = [...new Set(RHC.map(rhNat))].sort((a, b) => (RH_NAT.indexOf(a) + 1 || 99) - (RH_NAT.indexOf(b) + 1 || 99) || a.localeCompare(b, "pt-BR"));
  if (RHN && !nats.includes(RHN)) RHN = "";
  const L = RHC.filter((r) => !RHN || rhNat(r) === RHN), tot = (A) => A.reduce((s, r) => s + (+r.valor || 0), 0);
  const chip = (n, t, q) => `<button class="eq-ch${RHN === n ? " on" : ""}" data-rhn="${esc(n)}">${esc(t)}<b>${q}</b></button>`;
  el.innerHTML = `<div class="eq-cab"><div><h4>Equipe registrada pelo gabinete</h4><p>Quem trabalha no mandato, com a natureza do vínculo. ${RHC.length ? `${RHC.length} ${RHC.length === 1 ? "pessoa" : "pessoas"} · ${rhR$(tot(RHC))}/mês` : "Nenhuma pessoa registrada ainda."}</p></div>${pode ? `<button class="eq-mais" id="rhMais" title="Adicionar uma pessoa" aria-label="Adicionar uma pessoa">+</button>` : ""}</div>
    ${RHF ? rhForm() : ""}
    ${RHC.length ? `<div class="eq-chs">${chip("", "Todas", RHC.length)}${nats.map((n) => chip(n, n, RHC.filter((r) => rhNat(r) === n).length)).join("")}</div>
    <div class="eq-nts">${(RHN ? [RHN] : nats).map((n) => { const A = RHC.filter((r) => rhNat(r) === n); return `<div><span>${esc(n)}</span><b>${rhR$(tot(A))}</b><small>${A.length} ${A.length === 1 ? "pessoa" : "pessoas"}</small></div>`; }).join("")}</div>
    <table class="eq-t"><thead><tr><th>Nome</th><th>Cargo</th><th>Natureza</th><th class="n">Valor mensal</th><th>Observação</th></tr></thead><tbody>${L.map((r) => `<tr${pode ? ` data-rhed="${esc(r.id)}" title="Editar"` : ""}><td><b>${esc(r.pessoa || "—")}</b></td><td>${esc(r.cargo || "—")}</td><td><span class="eq-nat">${esc(rhNat(r))}</span></td><td class="n">${r.valor != null ? rhR$(r.valor) : "—"}</td><td class="eq-o">${esc(r.obs || "")}</td></tr>`).join("")}</tbody>
    <tfoot><tr><td colspan="3">Total${RHN ? " · " + esc(RHN) : ""}</td><td class="n">${rhR$(tot(L))}</td><td></td></tr></tfoot></table>` : ""}`;
  const f = $("#rhF");
  if (f) { f.nat.onchange = () => { f.querySelector(".eq-outra").hidden = f.nat.value !== "Outro"; };
    f.onsubmit = async (e) => { e.preventDefault(); const nat = f.nat.value === "Outro" ? f.nat_outra.value.trim() : f.nat.value; if (!nat) return alert("Escreva a natureza do vínculo.");
      const v = f.valor.value.trim() ? +f.valor.value.replace(/\./g, "").replace(",", ".") : null; if (v != null && !isFinite(v)) return alert("Valor inválido.");
      try { await rhGravar({ ...(RHF.id ? { id: RHF.id } : {}), pessoa: f.pessoa.value.trim(), cargo: f.cargo.value.trim(), natureza: nat, valor: v, obs: f.obs.value.trim() || null }); RHF = null; await rhCarregar(); rhDesenhar(); } catch (er) { alert("Não foi possível salvar: " + (er.message || er)); } };
    f.querySelector("[data-rhcan]").onclick = () => { RHF = null; rhDesenhar(); };
    const d = f.querySelector("[data-rhdel]"); if (d) d.onclick = async () => { if (!confirm("Excluir esta pessoa da equipe registrada?")) return; try { await rhApagar(d.dataset.rhdel); RHF = null; await rhCarregar(); rhDesenhar(); } catch (er) { alert("Não foi possível excluir: " + (er.message || er)); } };
    f.pessoa.focus(); }
  const m = $("#rhMais"); if (m) m.onclick = () => { RHF = RHF && !RHF.id ? null : {}; rhDesenhar(); };
  el.querySelectorAll("[data-rhn]").forEach((b) => b.onclick = () => { RHN = b.dataset.rhn; rhDesenhar(); });
  el.querySelectorAll("[data-rhed]").forEach((tr) => tr.onclick = () => { RHF = RHC.find((x) => String(x.id) === tr.dataset.rhed) || null; rhDesenhar(); el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }); }

async function rhGabinete() { const el = $("#rhLista"); if (!el) return;
  if (!rhLocal() && !(SESS && proprio() && PODE)) { el.innerHTML = `<p class="rh-nt">A equipe registrada é vista só pela equipe do gabinete.</p>`; return; }
  try { await rhCarregar(); rhDesenhar(); } catch (e) { el.innerHTML = `<p class="rh-nt">Não foi possível carregar a equipe: ${esc(e.message || e)}</p>`; } }
