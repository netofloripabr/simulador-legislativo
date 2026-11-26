// ---------- nova emenda em card (25/11/2026) ----------
// O "+" verde da planilha de Indicação abre uma janela com um card para preencher a emenda nova (ente, modalidade, função,
// despesa, município, objeto com o Portfólio, valor, líder, contato e justificativa). Ao tocar ✓ a emenda é gravada e vai
// para a última posição da planilha, que rola até ela. ✕ ou Esc fecham sem gravar. A linha em branco do fim continua valendo.
function cardNovaEmenda(T) {
  document.getElementById("incN")?.remove();
  const g = regrasInd(T), S = { benef_tipo: "", modalidade: "", area: g.trava || "", natureza: "" };
  const ICv = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>', ICx = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>';
  const areas = AREAS.map((a) => a[1]).filter((a) => g.areas.includes(a));
  const chips = (k, ops) => `<div class="incc" data-k="${k}">${ops.map(([v, l, ic]) => `<button type="button" data-v="${esc(v)}">${ic ? ici(ic) : ""}${esc(l)}</button>`).join("")}</div>`;
  document.body.insertAdjacentHTML("beforeend", `<div id="incN" class="cfp"><div class="incb" role="dialog" aria-modal="true" aria-label="Nova emenda">
    <div class="inch"><b>Nova emenda</b><small>${esc(T.nome || "")}${g.min ? ` · mínimo ${rc(g.min)}` : ""}</small></div>
    <div class="incg">
      <div class="incl"><span>Quem recebe</span>${chips("benef_tipo", BTIPO.map(([k, l]) => [k, l, k]))}</div>
      <div class="incl"><span>Modalidade</span>${chips("modalidade", modsCurtas(g, null).map((m) => [m, m, MOD_I[m] || "doc2"]))}</div>
      <div class="incl"><span>Função</span>${g.trava ? `<div class="incc"><button type="button" class="on" disabled>${ici(AREA_I[g.trava] || "plan")}${esc(g.trava)}</button></div>` : chips("area", areas.map((a) => [a, a, AREA_I[a] || "plan"]))}</div>
      <div class="incl"><span>Despesa</span>${chips("natureza", [["Custeio", "Custeio", "cus"], ["Capital", "Capital", "cap"]])}</div>
      <div class="incl"><span>Município</span><input data-f="municipio" list="indMun" placeholder="Município" autocomplete="off"></div>
      <div class="incl incent" hidden><span>Entidade</span><div class="inc2"><input data-f="razao_social" placeholder="Razão social"><input data-f="cnpj" placeholder="CNPJ" inputmode="numeric"></div></div>
      <div class="incl incob"><span>Objeto</span><textarea data-f="objeto" rows="2" placeholder="Escreva ou escolha do Portfólio abaixo"></textarea><div class="incp"></div></div>
      <div class="incl"><span>Valor (R$)</span><input data-f="valor" inputmode="numeric" placeholder="0,00"></div>
      <div class="incl"><span>Líder · contato</span><div class="inc2"><input data-f="lideranca" list="indPes" placeholder="Líder (quem indicou)"><input data-f="contato" placeholder="Contato (quem toca o processo)"></div></div>
      <div class="incl"><span>Justificativa</span><textarea data-f="justificativa" rows="3" placeholder="Opcional"></textarea></div>
    </div>
    <div class="incm" data-msg></div>
    <div class="incf"><button class="vxb x" data-x title="Cancelar (Esc)" aria-label="Cancelar">${ICx}</button><button class="vxb v" data-ok title="Gravar a emenda" aria-label="Gravar a emenda">${ICv}</button></div>
  </div></div>`);
  const w = document.getElementById("incN"), f = (k) => w.querySelector(`[data-f="${k}"]`), msg = w.querySelector("[data-msg]");
  const fecha = () => { document.removeEventListener("keydown", tk, true); w.remove(); };
  const tk = (e) => { if (e.key === "Escape" && !document.getElementById("cfVX")) { e.preventDefault(); e.stopImmediatePropagation(); fecha(); } };
  document.addEventListener("keydown", tk, true); w.onclick = (e) => { if (e.target === w) fecha(); };
  const marca = () => { w.querySelectorAll(".incc[data-k]").forEach((c) => c.querySelectorAll("button").forEach((b) => b.classList.toggle("on", S[c.dataset.k] === b.dataset.v)));
    w.querySelector(".incent").hidden = S.benef_tipo !== "ent"; };
  w.querySelectorAll(".incc[data-k] button").forEach((b) => b.onclick = (e) => { e.preventDefault(); const k = b.closest("[data-k]").dataset.k;
    S[k] = S[k] === b.dataset.v ? "" : b.dataset.v;   // tocar de novo tira a escolha
    if (k === "benef_tipo" && S.benef_tipo) { const m = (BTIPO.find((q) => q[0] === S.benef_tipo) || [])[2]; if (m && g.mods.includes(m)) S.modalidade = m; }
    marca(); if (k === "area" || k === "natureza") port(); });
  const vl = f("valor"); vl.oninput = () => { const d = vl.value.replace(/\D/g, ""); vl.value = d ? moeda(+d / 100) : ""; };
  // Portfólio compatível com a função e a despesa escolhidas; os incluídos em 25/11/2026 aparecem em verde ("Novo")
  const pl = w.querySelector(".incp"), ob = f("objeto"), ABR = new Set();
  const port = async () => { const P = await lerPortfolio(), q = norm(ob.value || "").split(/\s+/).filter((k) => k.length > 2);
    const C = P.filter((o) => portCompat(o, S.area, S.natureza)), V = q.length ? C.filter((o) => q.every((k) => norm([o.obj, o.cat, o.desc].join(" ")).includes(k))) : C;
    if (!V.length) { pl.innerHTML = q.length ? `<div class="mut">Nada parecido no Portfólio${S.area || S.natureza ? " para esta função e despesa" : ""}.</div>` : ""; return; }
    // seções por categoria (com a área quando a função não foi escolhida), fechadas; tocar no título abre/fecha; com pesquisa, abertas
    const G = new Map(); V.forEach((o, i) => { const k = S.area ? o.cat : o.area + " · " + o.cat; if (!G.has(k)) G.set(k, []); G.get(k).push([o, i]); });
    const CH = '<svg class="sxch" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M4 2.5L7.5 6 4 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    pl.innerHTML = `<div class="incpt">Portfólio${S.area ? " · " + esc(S.area) : ""}${S.natureza ? " · " + esc(S.natureza.toLowerCase()) : ""}<small>${V.length}</small></div>` + [...G].map(([c, A]) => { const ab = !!q.length || ABR.has(c), nv = A.filter(([o]) => o.novo).length;
      return `<div class="incs${ab ? " ab" : ""}"><button type="button" class="incst" data-sec="${esc(c)}"><span>${CH}${esc(c)}</span><small>${A.length}${nv ? ` · <i class="ipnvc">${nv} ${nv === 1 ? "novo" : "novos"}</i>` : ""}</small></button>${ab ? A.map(([o, i]) => `<button type="button" class="${o.novo ? "ipnv" : ""}" data-i="${i}">${o.novo ? '<b class="ipnvt">Novo</b>' : ""}${esc(o.obj)}<em>${esc(o.nat)}${o.desc ? " · " + esc(o.desc.split("\n")[0]) : ""}</em></button>`).join("") : ""}</div>`; }).join("");
    pl.querySelectorAll("[data-sec]").forEach((b) => b.onclick = (e) => { e.preventDefault(); const c = b.dataset.sec; ABR.has(c) ? ABR.delete(c) : ABR.add(c); const y = pl.scrollTop; port().then(() => { pl.scrollTop = y; }); });
    pl.querySelectorAll("[data-i]").forEach((b) => b.onclick = (e) => { e.preventDefault(); const o = V[+b.dataset.i]; ob.value = o.obj; if (!/ ou /.test(o.nat)) S.natureza = o.nat; marca(); pl.innerHTML = `<div class="mut">Objeto do Portfólio escolhido · ${esc(o.org || "")}</div>`; }); };
  let tm; ob.oninput = () => { clearTimeout(tm); tm = setTimeout(port, 150); }; port();
  w.querySelector("[data-x]").onclick = fecha;
  w.querySelector("[data-ok]").onclick = async () => {
    const o = { ...S }; ["municipio", "objeto", "lideranca", "contato", "justificativa", "razao_social", "cnpj"].forEach((k) => { const v = f(k).value.trim(); o[k] = v || null; });
    o.valor = numBR(vl.value) || null; Object.keys(o).forEach((k) => { if (o[k] === "") o[k] = null; });
    if (o.benef_tipo !== "ent") { o.razao_social = null; o.cnpj = null; }
    if (!o.municipio && !o.valor) { msg.textContent = "Preencha pelo menos o município ou o valor."; f("municipio").focus(); return; }
    if (g.min && o.valor && o.valor < g.min) { msg.textContent = `O valor mínimo desta cota é ${rc(g.min)}.`; vl.focus(); return; }
    o.beneficiario = o.benef_tipo === "ent" ? o.razao_social : o.benef_tipo ? benefAuto(o.benef_tipo, o, g) || null : null;
    const bt = w.querySelectorAll(".incf button"); bt.forEach((b) => { b.disabled = true; }); msg.textContent = "Gravando…";
    try { const L = await garantirLista(T);
      const nx = await gravar("gab_itens", { lista_id: L ? L.id : null, tipo: T.cota ? "Emenda impositiva" : null, status: "Em análise", ...o, area: o.area || g.trava || null });
      fecha(); if (typeof temFx === "function" && temFx()) { IND.fx = {}; fxSalva(); } desenharInd();
      // vai para a última posição: a planilha rola até ela e a linha pisca em verde
      requestAnimationFrame(() => { const tr = document.querySelector(`#indPg tr.iw[data-iw="${CSS.escape(nx.id)}"]`); if (tr) { tr.scrollIntoView({ block: "center", behavior: "smooth" }); tr.classList.add("inew"); setTimeout(() => tr.classList.remove("inew"), 2400); } });
    } catch (er) { bt.forEach((b) => { b.disabled = false; }); msg.textContent = "Não foi possível gravar: " + (er.message || er); } };
  setTimeout(() => { const b = w.querySelector('.incc[data-k="benef_tipo"] button'); if (b) b.focus({ preventScroll: true }); }, 0);
}
