// ---------- balão de avisos do Gabinete (24/11/2026, migração 117) ----------
// Canto inferior direito: quando chega um aviso do gabinete (líder enviou o link, Link Gestor enviou mudanças, líder pediu para
// reabrir...), aparece um balãozinho com a contagem. Tocar abre a janela dos avisos; cada um pode ser marcado "Resolvido"
// (grava resolvida_em e lida_em) ou ficar como está. O "x" do balão o esconde até chegar um aviso novo.
// Mesma tabela do sino do topo (notificacoes, só as do próprio usuário — RLS). Sem polling (regra de capacidade): lê ao abrir a
// página e quando a pessoa volta para a aba (no máximo a cada 60 s).
(() => {
  const TIPOS = ["gab_equipe"], DIAS = 30, CH = "gab_avisos_fechado";
  let AV = [], ult = 0, aberto = false;
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const quando = (d) => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return "agora"; if (s < 3600) return `há ${Math.floor(s / 60)} min`; if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); };
  const fechadoAte = () => { try { return localStorage.getItem(CH) || ""; } catch (e) { return ""; } };
  const SINO = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3a4.5 4.5 0 0 0-4.5 4.5v2.8L4 13h12l-1.5-2.7V7.5A4.5 4.5 0 0 0 10 3zM8.2 15.5a1.9 1.9 0 0 0 3.6 0"/></svg>';
  const OK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>', XX = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';
  async function ler(forca) { if (typeof supabaseClient === "undefined" || !supabaseClient || (!forca && Date.now() - ult < 60000)) return; ult = Date.now();
    try { const { data: s } = await supabaseClient.auth.getSession(); if (!s || !s.session) return;
      const { data, error } = await supabaseClient.from("notificacoes").select("id,tipo,titulo,corpo,criado_em,lida_em,referencia_id").in("tipo", TIPOS)
        .is("resolvida_em", null).gte("criado_em", new Date(Date.now() - DIAS * 864e5).toISOString()).order("criado_em", { ascending: false }).limit(50);
      if (error) throw error; AV = data || []; desenha(); } catch (e) { console.warn("avisos:", e.message || e); } }
  function desenha() { let b = document.getElementById("gavB"); const novo = AV.length && AV[0].criado_em > fechadoAte();
    if (!AV.length || (!novo && !aberto)) { if (b) b.remove(); document.getElementById("gavP")?.remove(); aberto = false; return; }
    if (!b) { b = document.createElement("div"); b.id = "gavB"; b.className = "gavb"; document.body.appendChild(b); }
    const nl = AV.filter((x) => !x.lida_em).length;
    b.innerHTML = `<button class="gavo" data-gav-abre aria-label="Abrir os avisos">${SINO}<span class="gavt"><b>${AV.length} ${AV.length === 1 ? "aviso" : "avisos"}</b><small>${esc(AV[0].titulo)}</small></span>${nl ? `<i>${nl}</i>` : ""}</button><button class="gavx" data-gav-fecha title="Esconder até chegar um aviso novo" aria-label="Fechar o balão">${XX}</button>`;
    b.querySelector("[data-gav-abre]").onclick = () => { aberto = !aberto; painel(); };
    b.querySelector("[data-gav-fecha]").onclick = () => { try { localStorage.setItem(CH, AV[0].criado_em); } catch (e) {} aberto = false; desenha(); };
    painel(); }
  function painel() { let p = document.getElementById("gavP"); if (!aberto) { if (p) p.remove(); return; }
    if (!p) { p = document.createElement("div"); p.id = "gavP"; p.className = "gavp"; document.body.appendChild(p); }
    p.innerHTML = `<div class="gavh"><b>Avisos</b><span>${AV.length} em aberto</span><button data-gav-x aria-label="Fechar a janela">${XX}</button></div>
      <div class="gavl">${AV.map((x) => `<div class="gavi${x.lida_em ? "" : " nv"}" data-id="${x.id}"><div class="gavq"><b>${esc(x.titulo)}</b><small>${quando(x.criado_em)}</small></div><p>${esc(x.corpo || "")}</p>
        <div class="gava">${/link/i.test(x.titulo + " " + x.corpo) && typeof abrirInd === "function" ? `<button class="gavir" data-gav-ir>Abrir a Indicação</button>` : ""}<button class="gavok" data-gav-ok>${OK}Resolvido</button></div></div>`).join("")}</div>`;
    p.querySelector("[data-gav-x]").onclick = () => { aberto = false; painel(); };
    p.querySelectorAll("[data-gav-ok]").forEach((bt) => bt.onclick = async () => { const id = bt.closest("[data-id]").dataset.id, agora = new Date().toISOString(); bt.disabled = true;
      try { const x = AV.find((y) => y.id === id); const { error } = await supabaseClient.from("notificacoes").update({ resolvida_em: agora, lida_em: (x && x.lida_em) || agora }).eq("id", id); if (error) throw error;
        AV = AV.filter((y) => y.id !== id); if (!AV.length) aberto = false; desenha(); } catch (e) { bt.disabled = false; alert("Não foi possível marcar: " + (e.message || e)); } });
    p.querySelectorAll("[data-gav-ir]").forEach((bt) => bt.onclick = () => { aberto = false; painel(); try { abrirInd(); } catch (e) {} });
    // abrir a janela conta como "lido" (o sino do topo para de contar); continua em aberto até tocar "Resolvido"
    const nl = AV.filter((x) => !x.lida_em); if (nl.length) { const agora = new Date().toISOString(); nl.forEach((x) => { x.lida_em = agora; });
      supabaseClient.from("notificacoes").update({ lida_em: agora }).in("id", nl.map((x) => x.id)).then(() => {}, () => {}); } }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && aberto) { aberto = false; painel(); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ler(); }); addEventListener("focus", () => ler());
  window.gabAvisosLer = () => ler(true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(() => ler(true), 1200)); else setTimeout(() => ler(true), 1200);
})();
