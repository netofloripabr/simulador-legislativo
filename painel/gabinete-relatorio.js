// Gabinete › Controle de Recursos › impressão e planilha (05/11/2026). O botão de impressora (ao lado da borracha dos
// filtros) abre uma janela: PDF (documento no padrão do palpite impresso) ou Excel (.xlsx), sempre com o que está no
// filtro. Antes de gerar, a pessoa escolhe se quer o detalhamento: somas por instrumento, por função e pago × a pagar,
// e as legendas no fim do documento. Usa os globais de gabinete.js (MEU, S, E0, PARL, mfiltradas, sigla, etapasStatus,
// instrNome, regDe, frase, norm, esc, fm, nf, ni) e de gabinete-cotas.js (funDe) e gabinete-ind-planilha.js (piExcel).
const REL_I = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4.5 6V2.5h7V6"/><rect x="2" y="6" width="12" height="5.5" rx="1.2"/><path d="M4.5 9.5h7v4h-7z"/></svg>';
function relObj(r) { const f = r.objeto_fmt; if (!f || !/~~/.test(f)) return { ant: "", atual: frase(r.objeto || "") };
  const ant = [...f.matchAll(/~~([\s\S]*?)~~/g)].map((m) => m[1].trim()).filter(Boolean).join(" · "), atual = f.replace(/~~[\s\S]*?~~/g, " ").replace(/\s+/g, " ").trim();
  return { ant: frase(ant), atual: frase(atual) }; }
const EI_T = { "EI - EX": "excesso", "EI - BC": "bancada", "EI - 0,55": "0,55%" };
const oriHtml = (x) => !x.ori ? `<span class="di-mu">—</span>` : /^EI/.test(x.ori) ? `EI${EI_T[x.ori] ? `<small>${EI_T[x.ori]}</small>` : ""}` : esc(x.ori === "CONV" ? "CONV" : x.ori);
const oriTxt = (x) => !x.ori ? "" : /^EI/.test(x.ori) ? `EI${EI_T[x.ori] ? " (" + EI_T[x.ori] + ")" : ""}` : x.ori;
const MOD_OK = ["TE", "CO", "CS", "ED", "TF", "TC", "AC"]; // modalidades de verdade; "Outros" e vazio viram traço
const brl = (v) => "R$ " + (+v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// pago de cada linha: o portal da SEF quando a emenda está ligada (número + ano); senão o status da planilha
function relPago(r) { const v = +r.valor || 0, n = String(r.numero || ""), K = /^\d+$/.test(n) ? `${r.ano}-${n.padStart(6, "0")}` : null, e = K && (E0 || []).find((x) => x.k === K), es = etapasStatus(r.status_manual);
  return e ? Math.min(v || e.vp || 0, e.vp || 0) : es.d && es.d[2] ? v : 0; }
function relLinhas() { return mfiltradas().map((r) => { const v = +r.valor || 0, es = etapasStatus(r.status_manual);
  return { r, ano: +r.ano || "", mun: r.municipio || "—", reg: regDe(r) || "", obj: relObj(r).atual, objAnt: relObj(r).ant, fun: (typeof funDe === "function" ? funDe(r) : r.funcao) || "Não informada", ins: instrNome(r.modalidade) || "Não informado", ori: sigla(r.origem) || "", oriT: r.origem || "", st: es.t, sup: es.t === "Suprimida", v, p: es.t === "Suprimida" ? 0 : relPago(r), proc: r.processo || "", ben: r.beneficiario || "" }; })
  .sort((a, b) => { const o = S.mord && typeof MCOL !== "undefined" && MCOL.find((c) => c[0] === S.mord[0]); if (o) { const x = o[2](a.r), y = o[2](b.r), c = (x > y ? 1 : x < y ? -1 : 0) * S.mord[1]; if (c) return c; }
    return (a.ano || 0) - (b.ano || 0) || a.mun.localeCompare(b.mun, "pt-BR") || b.v - a.v; }); }
// seta de ordem no cabeçalho: ↑ crescente, ↓ decrescente, na coluna que define a ordem
const REL_COL = { ano: "ano", mun: "cand", obj: "obj", pr: "obj", fun: "fn", mod: "in", st: "et", v: "votos" };
const relSeta = (col) => { const k = S.mord ? S.mord[0] : "ano", d = S.mord ? S.mord[1] : 1; return REL_COL[k] === col ? `<i class="di-seta">${d > 0 ? "↑" : "↓"}</i>` : ""; };
// o que está no filtro, em texto (vai no cabeçalho do documento e da planilha)
function relFiltro() { const F = S.mf || {}, P = [];
  if (S.mano) P.push("ano " + S.mano); if (F.mun && F.mun.length) P.push((F.mun.length > 1 ? "municípios " : "município ") + F.mun.join(", "));
  [["reg", "região"], ["lid", "líder"], ["fun", "função"], ["mod", "instrumento"], ["ben", "beneficiário"], ["tag", "etiqueta"]].forEach(([k, t]) => { if (F[k]) P.push(t + " " + (F[k] === "(vazio)" ? "não informada" : F[k])); });
  if (S.mori) P.push("origem " + S.mori); if (S.met) P.push("etapa " + S.met); if (S.lista) P.push("lista de indicação"); if (F.obs) P.push({ com: "com observação", sem: "sem observação", at: "marcadas para atenção" }[F.obs] || "");
  if (S.mq) P.push(`busca "${S.mq}"`); return P.filter(Boolean).join(" · ") || "todos os recursos do Controle"; }
// somas do detalhamento
function relSomas(L0) { const L = L0.filter((x) => !x.sup), g = (f) => { const M = {}; L.forEach((x) => { const k = f(x); const o = M[k] = M[k] || { n: 0, v: 0, p: 0 }; o.n++; o.v += x.v; o.p += x.p; }); return Object.entries(M).sort((a, b) => b[1].v - a[1].v); };
  const v = L.reduce((s, x) => s + x.v, 0), p = L.reduce((s, x) => s + x.p, 0);
  return { n: L.length, ns: L0.length - L.length, vs: L0.filter((x) => x.sup).reduce((s, x) => s + x.v, 0), v, p, ap: v - p, mun: new Set(L.map((x) => norm(x.mun))).size, ins: g((x) => x.ins), fun: g((x) => x.fun), mns: g((x) => x.mun), pg: [["Pago ou executado", L.filter((x) => x.p >= x.v && x.v > 0)], ["Pago em parte", L.filter((x) => x.p > 0 && x.p < x.v)], ["A pagar", L.filter((x) => !x.p)]].map(([t, A]) => [t, { n: A.length, v: A.reduce((s, x) => s + x.v, 0), p: A.reduce((s, x) => s + x.p, 0) }]), ori: [...new Map(L.filter((x) => x.ori).map((x) => [x.ori, x.oriT])).entries()] }; }

const REL_P = [["pg", "Situação do pagamento", "indicado, pago e o que falta"], ["ins", "Por instrumento", "transferência especial, convênio…"], ["fun", "Por função", "saúde, educação, FUNDAM…"], ["mun", "Por município", "soma de cada cidade do filtro"], ["leg", "Legendas", "função, instrumento, etapa e origem (na 1ª página)"], ["sup", "Suprimidas", "lista à parte, fora das contas"]];
const relPartes = () => { try { const v = JSON.parse(localStorage.getItem("gab_rel_partes") || "null"); if (Array.isArray(v)) return new Set(v); } catch (e) {} return new Set(["pg", "ins", "fun", "leg"]); };
// ---------- janela de opções ----------
function relAbrir() { document.getElementById("relOv")?.remove(); const L = relLinhas(); let fmt = "pdf", det = true, PT = relPartes();
  const ov = Object.assign(document.createElement("div"), { id: "relOv", className: "relov2" });
  const ck = (A) => A.map(([k, t, d]) => `<button data-pt="${k}" class="${PT.has(k) ? "on" : ""}" aria-pressed="${PT.has(k)}"><i></i><b>${t}</b><small>${d}</small></button>`).join("");
  const pinta = () => { ov.innerHTML = `<div class="relmd" role="dialog" aria-label="Imprimir ou exportar"><div class="relh"><b>Imprimir ou exportar</b><button class="relx" data-rx aria-label="Fechar">×</button></div>
    <p class="relf"><span>Conforme o filtro</span>${esc(relFiltro())} · <b>${ni(L.length)} ${L.length === 1 ? "item" : "itens"}</b></p>
    <div class="relg"><span>Formato</span><div class="relop">${[["pdf", "Imprimir / PDF", "documento no padrão SimulaLEGIS"], ["xlsx", "Excel", "planilha .xlsx"]].map(([k, t, d]) => `<button data-fmt="${k}" class="${fmt === k ? "on" : ""}"><b>${t}</b><small>${d}</small></button>`).join("")}</div></div>
    <div class="relg"><span>Incluir o detalhamento?</span><div class="relop">${[[true, "Sim", "página com o pagamento e as somas por instrumento e função"], [false, "Não", "só a lista"]].map(([k, t, d]) => `<button data-det="${k}" class="${det === k ? "on" : ""}"><b>${t}</b><small>${d}</small></button>`).join("")}</div></div>
    <div class="relg"><span>No documento</span><div class="relck">${ck(REL_P.filter(([k]) => k === "leg" || k === "sup"))}</div></div>
    ${det ? `<div class="relg"><span>No detalhamento (página própria)</span><div class="relck">${ck(REL_P.filter(([k]) => k !== "leg" && k !== "sup"))}</div></div>` : ""}
    <div class="relb"><button class="btn sec" data-rx>Cancelar</button><button class="btn" data-rgo${L.length ? "" : " disabled"}>${fmt === "pdf" ? "Gerar o documento" : "Baixar a planilha"}</button></div></div>`; };
  pinta(); document.body.appendChild(ov);
  ov.onclick = async (e) => { const t = e.target; if (t === ov || t.closest("[data-rx]")) { ov.remove(); return; }
    const f = t.closest("[data-fmt]"); if (f) { fmt = f.dataset.fmt; pinta(); return; } const d = t.closest("[data-det]"); if (d) { det = d.dataset.det === "true"; pinta(); return; }
    const pt = t.closest("[data-pt]"); if (pt) { const k = pt.dataset.pt; PT.has(k) ? PT.delete(k) : PT.add(k); try { localStorage.setItem("gab_rel_partes", JSON.stringify([...PT])); } catch (er) {} pinta(); return; }
    const g = t.closest("[data-rgo]"); if (g && !g.disabled) { g.disabled = true; try { const P = new Set([...PT].filter((k) => det || k === "leg" || k === "sup")); if (fmt === "pdf") relPDF(L, P, PT.has("sup")); else await relXLSX(L, P, PT.has("sup")); ov.remove(); } catch (er) { g.disabled = false; alert("Não foi possível gerar: " + (er.message || er)); } } }; }

// ícones das 3 etapas (os mesmos do Controle: indicação, portaria, pago) no lugar da palavra "pago": aceso = feito;
// pago em parte = moeda em contorno verde; vermelho = etapa travada (🛑). No papel a diferença sobrevive pela forma
function relIcs(x) { const e = etapasStatus(x.r.status_manual), d = (e.d || [false, false, false]).slice(), parte = x.p > 0 && x.p < x.v; if (x.v > 0 && x.p >= x.v) d[2] = d[1] = true; if (parte) d[1] = true;
  const trav = e.ver ? Math.min(2, d.lastIndexOf(true) + 1) : -1, P = typeof ST_I !== "undefined" ? ST_I : [];
  return `<span class="di-ics" title="${esc(e.t)}${parte ? " · pago " + brl(x.p) : ""}">${P.map((p, k) => `<svg viewBox="0 0 16 16" class="${k === trav ? "tv" : d[k] ? (k === 2 ? "pg" : "on") : k === 2 && parte ? "pp" : ""}">${p}</svg>`).join("")}</span>`; }
// ---------- documento (PDF pela impressão do navegador) ----------
function relPDF(L0, P, comSup) { const tem = (k) => P && P.has(k), det = ["pg", "ins", "fun", "mun"].some(tem), L = L0.filter((x) => !x.sup), LS = comSup ? L0.filter((x) => x.sup) : [];
  const T = relSomas(L0), ag = new Date(), dt = ag.toLocaleDateString("pt-BR"), hr = ag.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const pc = (a, b) => b ? nf(a / b * 100, 1) + "%" : "—", rs = (v) => ni(Math.round(v || 0)), proj = (n) => `${ni(n)} ${n === 1 ? "projeto" : "projetos"}`;
  // função como ícone (o mesmo da plataforma) e instrumento como sigla
  const funI = (x) => { const f = (typeof FUN_I !== "undefined" ? FUN_I : []).find(([re]) => re.test(x.r.funcao || "") || re.test(x.fun || "")); return f ? `<svg viewBox="0 0 16 16" class="di-fi" aria-label="${esc(f[1])}"><title>${esc(f[1])}</title>${f[2]}</svg>${/^FUNDAM/.test(f[1]) ? `<small class="di-fl">FUNDAM</small>` : ""}` : `<span class="di-mu">—</span>`; };
  const insS = (x) => { const g = typeof instrSig === "function" ? instrSig(x.r.modalidade) : ""; return MOD_OK.includes(g) ? g : "—"; };
  // parcelado (pago em parte): mini fracionador com a porcentagem paga, antes do valor
  const frac = (x) => { if (!(x.p > 0 && x.p < x.v)) return ""; const q = x.p / x.v, c = 2 * Math.PI * 5; return `<span class="di-fr" title="pago ${brl(x.p)} · ${Math.min(99, Math.floor(q * 100))}%"><svg viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" class="t"/><circle cx="7" cy="7" r="5" class="f" stroke-dasharray="${(q * c).toFixed(2)} ${c.toFixed(2)}"/></svg></span>`; };
  const lin = (x, i) => `<div class="di-linha${x.sup ? " di-sup" : ""}"><span class="di-pos">${i + 1}</span><span class="di-or">${oriHtml(x)}</span><span class="di-ano">${esc(String(x.ano || "—"))}</span><span class="di-cand"><span class="di-n">${esc(x.mun)}</span><span class="di-p">${esc(x.reg)}</span></span><span class="di-obj">${x.objAnt ? `<s class="di-ant">${esc(x.objAnt)}</s>` : ""}${esc(x.obj || "—")}${x.proc ? `<small>${esc(x.proc)}</small>` : ""}</span><span class="di-fn">${funI(x)}</span><span class="di-in">${insS(x) === "—" ? `<span class="di-mu">—</span>` : esc(insS(x))}</span><span class="di-et">${x.sup ? `<span class="di-mu">supr.</span>` : relIcs(x)}</span><span class="di-votos">${rs(x.v)}</span></div>`;
  // legenda (1ª página, abaixo dos totais): só o que aparece na lista
  const usados = (f) => [...new Set(L.map(f).filter(Boolean))];
  const fL = usados((x) => { const f = (typeof FUN_I !== "undefined" ? FUN_I : []).find(([re]) => re.test(x.r.funcao || "") || re.test(x.fun || "")); return f ? f[1] : ""; }).map((n) => FUN_I.find((f) => f[1] === n));
  const iL = usados((x) => insS(x) !== "—" ? insS(x) + "|" + x.ins : "").map((k) => k.split("|"));
  const ICS = (o) => `<span class="di-ics">${(typeof ST_I !== "undefined" ? ST_I : []).map((p, k) => `<svg viewBox="0 0 16 16" class="${o.tv && k === 1 ? "tv" : o.d[k] ? (k === 2 ? "pg" : "on") : o.pp && k === 2 ? "pp" : ""}">${p}</svg>`).join("")}</span>`;
  const legenda = tem("leg") ? `<div class="di-lgs">
    ${fL.length ? `<div><b>Função</b>${fL.map((f) => `<span><svg viewBox="0 0 16 16" class="di-fi">${f[2]}</svg>${esc(f[1])}</span>`).join("")}</div>` : ""}
    ${iL.length ? `<div><b>Modalidade</b>${iL.map(([s2, n]) => `<span><em>${esc(s2)}</em>${esc(n)}</span>`).join("")}</div>` : ""}
    <div><b>Etapa</b>${[[{ d: [1, 0, 0] }, "indicada"], [{ d: [1, 1, 0] }, "portaria ou termo"], [{ d: [1, 1, 1] }, "pago ou executado"], [{ d: [1, 1, 0], pp: 1 }, "pago em parte"], [{ d: [1, 0, 0], tv: 1 }, "travada (conferir)"]].map(([o, t]) => `<span>${ICS(o)}${t}</span>`).join("")}</div>
    ${T.ori.length ? `<div><b>Origem</b>${[...new Map(T.ori.map(([s2, t]) => /^EI/.test(s2) ? ["EI", "Emenda impositiva (abaixo: excesso de receita, bancada regional ou adicional 0,55%, quando não é a da LOA)"] : [s2, t])).entries()].map(([s2, t]) => `<span><em>${esc(s2)}</em>${esc(t)}</span>`).join("")}</div>` : ""}</div>` : "";
  // pagamento: uma barra só (pago, pago em parte, a pagar) e, no detalhamento, uma tabela com o que foi indicado, pago e o que falta
  const pgP = T.pg.find((x) => x[0] === "Pago ou executado")[1], pgM = T.pg.find((x) => x[0] === "Pago em parte")[1], pgA = T.pg.find((x) => x[0] === "A pagar")[1];
  const barra = `<div class="di-pag"><div class="di-pbar"><i class="b1" style="width:${T.v ? (pgP.v / T.v * 100).toFixed(1) : 0}%"></i><i class="b2" style="width:${T.v ? (pgM.v / T.v * 100).toFixed(1) : 0}%"></i></div>
    <div class="di-pleg"><span><i class="b1"></i>Pago ${pc(pgP.v, T.v)} · ${proj(pgP.n)}</span><span><i class="b2"></i>Pago em parte ${pc(pgM.v, T.v)} · ${proj(pgM.n)}</span><span><i></i>A pagar ${pc(pgA.v, T.v)} · ${proj(pgA.n)}</span></div></div>`;
  const tabPg = `<div class="di-bloco"><div class="di-st2">Situação do pagamento</div><div class="di-tp di-th"><span>Situação</span><span>Projetos</span><span>Indicado (R$)</span><span>Pago (R$)</span><span>Falta (R$)</span><span>% do total</span></div>
    ${T.pg.filter(([, o]) => o.n).map(([k, o]) => `<div class="di-tp"><span>${esc(k)}</span><span>${ni(o.n)}</span><span>${rs(o.v)}</span><span>${rs(o.p)}</span><span>${rs(o.v - o.p)}</span><span>${pc(o.v, T.v)}</span></div>`).join("")}
    <div class="di-tp di-tt"><span>Total</span><span>${ni(T.n)}</span><span>${rs(T.v)}</span><span>${rs(T.p)}</span><span>${rs(T.ap)}</span><span>100%</span></div></div>`;
  const tab = (tit, R) => `<div class="di-bloco"><div class="di-st2">${tit}</div><div class="di-tl di-th"><span>Item</span><span>Projetos</span><span>Valor (R$)</span><span>Pago (R$)</span><span>% pago</span></div>${R.map(([k, o]) => `<div class="di-tl"><span>${esc(k)}<i style="width:${T.v ? (o.v / T.v * 100).toFixed(1) : 0}%"></i></span><span>${ni(o.n)}</span><span>${rs(o.v)}</span><span>${rs(o.p)}</span><span>${pc(o.p, o.v)}</span></div>`).join("")}</div>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Controle de Recursos · ${esc(PARL.u || "")}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet"><style>
  @page{size:A4;margin:14mm 12mm} body{font-family:Inter,system-ui,sans-serif;color:#111;margin:0} .di-pag{position:relative;padding:0 3px}*{box-sizing:border-box}.di-votos{width:84px}.di-obj{min-width:0;overflow-wrap:anywhere}
  .di-agua{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}.di-agua span{font-size:110px;font-weight:800;color:rgba(0,0,0,.035);transform:rotate(-24deg)}
  .di-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.di-wm{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1}.di-wm span{color:#1FA83A}.di-wmsub{font-size:7px;font-weight:800;letter-spacing:.2em;color:#6B7178;text-transform:uppercase;margin-top:3px}
  .di-meta{text-align:right;font-size:9px;color:#3F454B;line-height:1.5}.di-regra{margin:10px 0 14px;height:2px;background:#A9AEB3;position:relative}.di-regra:after{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:#D3D6D8}
  .di-tit{font-size:16px;font-weight:800}.di-sub{font-size:9.5px;color:#3F454B;margin:2px 0 10px;line-height:1.45}.di-sub b{color:#111}
  .di-rres{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 8px}.di-rres div{border:1px solid #DCDFE2;border-radius:6px;padding:6px 8px;background:#F3F5F6}.di-rres b{display:block;font-size:13px;font-variant-numeric:tabular-nums}.di-rres span{font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}.di-rres .ok b{color:#1FA83A}
  .di-pag{margin:0 0 12px}.di-pbar{display:flex;height:7px;border-radius:999px;overflow:hidden;background:#E6E8EA}.di-pbar i.b1,.di-pleg i.b1{background:#1FA83A}.di-pbar i.b2,.di-pleg i.b2{background:#8FD49D}
  .di-pleg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:8px;color:#3F454B;margin-top:4px}.di-pleg i{display:inline-block;width:8px;height:8px;border-radius:2px;background:#E6E8EA;margin-right:4px;vertical-align:-1px}
  .di-lgs{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;border:1px solid #DCDFE2;border-radius:6px;padding:7px 9px;margin:12px 0 14px;page-break-inside:avoid;font-size:8px;color:#3F454B}.di-lgs > div{display:flex;flex-wrap:wrap;align-items:center;gap:3px 10px}.di-lgs b{flex-basis:100%;font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}
  .di-lgs span{display:inline-flex;align-items:center;gap:4px}.di-lgs em{font-style:normal;font-weight:800;color:#111}
  .di-linha{display:flex;align-items:flex-start;gap:7px;padding:5px 0;border-bottom:.5px solid #DCDFE2;page-break-inside:avoid}.di-hdr{border-bottom:1.5px solid #A9AEB3;font-size:7px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7178;align-items:flex-end}
  .di-pos{width:14px;flex:none;color:#6B7178;font-size:9px;text-align:right}.di-cand{width:82px;flex:none}.di-n{display:block;font-size:10px;font-weight:600}.di-p{display:block;font-size:7px;color:#9AA0A4;letter-spacing:.04em;text-transform:uppercase;margin-top:1px}
  .di-obj{flex:1;font-size:9.5px;line-height:1.4}.di-obj small{display:block;color:#6B7178;font-size:7.5px;margin-top:2px}
  .di-fn,.di-in,.di-et{flex:none;display:flex;align-items:center;justify-content:center;height:15px}.di-fn{width:30px}.di-in{width:30px;font-size:8.5px;font-weight:800;color:#3F454B}.di-et{width:46px}
  .di-mu{font-size:9px;line-height:1;color:#9AA0A4;font-weight:400}.di-seta{font-style:normal;color:#1FA83A;margin-right:3px;font-weight:800}.di-linha:not(.di-hdr) .di-pos,.di-linha:not(.di-hdr) .di-or,.di-linha:not(.di-hdr) .di-ano{line-height:13px !important;padding-top:0 !important}.di-or,.di-ano{text-align:center}.di-pos{width:10px !important;text-align:right !important;font-size:9px}.di-or{width:30px !important;margin-left:5px}.di-ano{width:24px !important;margin-left:5px;margin-right:14px}.di-or small{line-height:9px}
  .di-fn{flex-direction:column;height:auto !important;min-height:15px}.di-fl{display:block;font-size:5.5px;font-weight:800;letter-spacing:.04em;color:#6B7178;margin-top:1px;line-height:1}.di-ant{display:block;color:#9AA0A4;text-decoration:line-through;font-size:8.5px;margin-bottom:2px}
  .di-hdr > span, .di-hdr .di-votos, .di-hdr .di-in{font-size:7px !important;font-weight:800 !important;letter-spacing:.06em;text-transform:uppercase;color:#6B7178 !important;height:auto;background:none;border:0}
  .di-fr{display:inline-flex}.di-fr svg{width:11px;height:11px;transform:rotate(-90deg)}.di-fr .t{fill:none;stroke:#DCDFE2;stroke-width:2.4}.di-fr .f{fill:none;stroke:#1FA83A;stroke-width:2.4}
  .di-fi{width:13px;height:13px;fill:none;stroke:#3F454B;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}.di-mu{font-size:8px;color:#9AA0A4}
  .di-ics{display:inline-flex;gap:3px}.di-ics svg{width:11px;height:11px;fill:none;stroke:#C9CDD1;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.di-ics svg.on{stroke:#111}.di-ics svg.pg{stroke:#1FA83A}.di-ics svg.pp{stroke:#1FA83A;stroke-dasharray:2 1.6}.di-ics svg.tv{stroke:#E8432A}
  .di-ano{width:30px;flex:none;font-size:9px;font-weight:600;color:#3F454B;padding-top:1px;white-space:nowrap}.di-or{width:40px;flex:none;font-size:8px;font-weight:800;color:#3F454B;line-height:1.25;padding-top:2px;white-space:nowrap}.di-or small{display:block;font-size:6.5px;font-weight:600;color:#9AA0A4;letter-spacing:.02em}.di-frw{width:12px;flex:none;display:flex;align-items:center;justify-content:center;height:15px}
  .di-votos{flex:none;width:66px;display:flex;align-items:center;justify-content:flex-end;background:#F3F5F6;border:1px solid #DCDFE2;border-radius:6px;padding:4px 8px;text-align:right;font-size:10px;font-weight:700;font-variant-numeric:tabular-nums}.di-hdr .di-votos{background:none;border:0;font-weight:800}
  .di-sup{color:#9AA0A4}.di-sup .di-n,.di-sup .di-votos{color:#9AA0A4;font-weight:500}
  .di-tot{display:flex;justify-content:space-between;font-weight:800;font-size:11px;padding:8px 0;border-top:1.5px solid #A9AEB3;margin-top:2px}.di-tot b{color:#1FA83A}
  .di-det{break-before:page;page-break-before:always}@media screen{.di-det{margin-top:56px;padding-top:28px;border-top:1px dashed #C9CDD1}}.di-det .di-tit{margin-bottom:2px}.di-det .di-bloco{margin-bottom:22px}.di-det .di-sub{margin-bottom:16px}.di-grade{display:grid;grid-template-columns:1fr 1fr;gap:14px}.di-bloco{page-break-inside:avoid;margin-bottom:14px}
  .di-st2{font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6B7178;margin:0 0 4px;padding-bottom:4px;border-bottom:1.5px solid #A9AEB3}
  .di-tl,.di-tp{display:grid;gap:6px;font-size:9px;padding:4px 0;border-bottom:.5px solid #DCDFE2;align-items:center;font-variant-numeric:tabular-nums}.di-tl{grid-template-columns:minmax(0,1fr) 40px 66px 66px 38px}.di-tp{grid-template-columns:minmax(0,1fr) 50px 90px 90px 90px 56px}
  .di-tl span:nth-child(n+2),.di-tp span:nth-child(n+2){text-align:right}.di-tl span:first-child{position:relative;padding-bottom:3px}.di-tl span:first-child i{position:absolute;left:0;bottom:0;height:2px;background:#1FA83A;opacity:.6;border-radius:2px}
  .di-th{font-size:7px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6B7178;border-bottom:1px solid #C9CDD1}.di-tt{font-weight:800;border-top:1px solid #A9AEB3;border-bottom:0}
  .di-rod{margin-top:18px;font-size:8px;color:#6B7178;line-height:1.5}.di-pagfoot{display:flex;justify-content:space-between;font-size:7.5px;color:#9AA0A4;border-top:.5px solid #DCDFE2;margin-top:16px;padding-top:6px}</style></head><body><div class="di-agua"><span>SimulaLEGIS</span></div><div class="di-pag">
  <div class="di-cab"><div><div class="di-wm">Simula<span>LEGIS</span></div><div class="di-wmsub">Gabinete · Controle de Recursos</div></div><div class="di-meta"><b>${esc(PARL.u || "")}</b> · ${esc(PARL.p || "")}<br>gerado em ${dt} às ${hr}</div></div><div class="di-regra"></div>
  <div class="di-tit">Controle de Recursos</div><div class="di-sub"><b>Filtro:</b> ${esc(relFiltro())}</div>
  <div class="di-rres"><div><b>${brl(T.v)}</b><span>valor total</span></div><div class="ok"><b>${brl(T.p)}</b><span>pago · ${pc(T.p, T.v)}</span></div><div><b>${brl(T.ap)}</b><span>a pagar · ${pc(T.ap, T.v)}</span></div><div><b>${ni(T.n)}</b><span>${T.n === 1 ? "projeto" : "projetos"} · ${ni(T.mun)} ${T.mun === 1 ? "município" : "municípios"}</span></div></div>
  ${barra}
  <div class="di-linha di-hdr"><span class="di-pos">#</span><span class="di-or">Origem</span><span class="di-ano">${relSeta("ano")}Ano</span><span class="di-cand">${relSeta("cand")}Município</span><span class="di-obj">${relSeta("obj")}Objeto</span><span class="di-fn">${relSeta("fn")}Função</span><span class="di-in">${relSeta("in")}Mod.</span><span class="di-et">${relSeta("et")}Etapa</span><span class="di-votos">${relSeta("votos")}Valor R$</span></div>
  ${L.map(lin).join("")}
  <div class="di-tot"><span>Total · ${proj(T.n)}</span><b>${brl(T.v)}</b></div>
  ${legenda}
  ${LS.length ? `<div class="di-st2" style="margin-top:14px">Suprimidas · fora das contas · ${ni(LS.length)} ${LS.length === 1 ? "item" : "itens"} · ${brl(T.vs)}</div>${LS.map(lin).join("")}` : ""}
  ${det ? `<div class="di-det"><div class="di-tit">Detalhamento</div><div class="di-sub">Somas do que está no filtro: ${esc(relFiltro())}.</div>
    ${tem("pg") ? tabPg : ""}
    ${tem("ins") || tem("fun") ? `<div class="di-grade">${tem("ins") ? tab("Por instrumento", T.ins) : ""}${tem("fun") ? tab("Por função", T.fun) : ""}</div>` : ""}
    ${tem("mun") ? tab("Por município", T.mns) : ""}
    <div class="di-rod">Valores em reais. "Pago" vem do portal da SEF quando a emenda está ligada ao Controle; nos demais, da etapa registrada pelo gabinete.${LS.length ? "" : " Suprimidas ficam fora deste documento."}</div></div>` : ""}
  <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app · uso interno do gabinete</span><span>${dt} ${hr}</span></div></div><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`;
  const w = window.open("", "_blank"); if (!w) throw new Error("libere as janelas pop-up do navegador para este site"); w.document.write(html); w.document.close(); }

// ---------- planilha Excel ----------
async function relXLSX(L, P, comSup) { const det = P && P.size, tem = (k) => P && P.has(k); await piExcel(); const T = relSomas(L), wb = new ExcelJS.Workbook(); wb.creator = "SimulaLEGIS";
  const ws = wb.addWorksheet("Recursos", { views: [{ state: "frozen", ySplit: 4 }] }), V = "#,##0.00", B = { bold: true };
  ws.addRow([`Controle de Recursos · ${PARL.u || ""} (${PARL.p || ""})`]).font = { bold: true, size: 14 };
  ws.addRow([`Filtro: ${relFiltro()} · gerado em ${new Date().toLocaleString("pt-BR")}`]).font = { color: { argb: "FF6B7178" } }; ws.addRow([]);
  const cab = ws.addRow(["#", "Origem", "Ano", "Município", "Região", "Objeto", "Função", "Modalidade", "Etapa", "Processo", "Beneficiário", "Valor (R$)", "Pago (R$)"]);
  const objC = (x) => x.objAnt ? { richText: [{ text: x.objAnt, font: { strike: true, color: { argb: "FF9AA0A4" } } }, { text: "\n" + x.obj }] } : x.obj;
  const modS = (x) => { const g = typeof instrSig === "function" ? instrSig(x.r.modalidade) : ""; return MOD_OK.includes(g) ? g : ""; };
  cab.font = { bold: true, color: { argb: "FFFFFFFF" } }; cab.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2022" } }; });
  const A = L.filter((x) => !x.sup), Sp = comSup ? L.filter((x) => x.sup) : [];
  A.forEach((x, i) => { const r = ws.addRow([i + 1, oriTxt(x), x.ano, x.mun, x.reg, objC(x), x.fun, modS(x), x.st, x.proc, x.ben, x.v, x.p]); if (x.objAnt) r.getCell(6).alignment = { wrapText: true }; });
  const tl = ws.addRow(["", "", "", "Total", "", `${T.n} projetos · ${T.mun} municípios`, "", "", "", "", "", T.v, T.p]); tl.font = B;
  if (Sp.length) { ws.addRow([]); ws.addRow(["", "", "", "Suprimidas (fora das contas)"]).font = { bold: true, color: { argb: "FF6B7178" } }; Sp.forEach((x, i) => { const r = ws.addRow([i + 1, oriTxt(x), x.ano, x.mun, x.reg, objC(x), x.fun, modS(x), x.st, x.proc, x.ben, x.v, ""]); r.font = { color: { argb: "FF9AA0A4" } }; }); }
  ws.getColumn(12).numFmt = V; ws.getColumn(13).numFmt = V;
  [5, 12, 6, 22, 16, 52, 18, 12, 14, 16, 30, 16, 16].forEach((w, i) => { ws.getColumn(i + 1).width = w; }); ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 13 } };
  if (det) { const wd = wb.addWorksheet("Detalhamento"); wd.getColumn(1).width = 34; [2, 3, 4, 5].forEach((c) => { wd.getColumn(c).width = 16; });
    wd.addRow(["Detalhamento · " + relFiltro()]).font = { bold: true, size: 13 }; wd.addRow([]);
    const res = true ? [["Valor total", T.v], ["Pago", T.p], ["A pagar", T.ap], ["Projetos", T.n], ["Municípios", T.mun]] : []; res.forEach(([k, v]) => { const r = wd.addRow([k, v]); r.getCell(1).font = B; if (k !== "Projetos" && k !== "Municípios") r.getCell(2).numFmt = V; }); wd.addRow([]);
    const bloco = (tit, R) => { wd.addRow([tit]).font = { bold: true, size: 12 }; const h = wd.addRow(["Item", "Projetos", "Valor (R$)", "Pago (R$)", "% pago"]); h.font = B;
      R.forEach(([k, o]) => { const r = wd.addRow([k, o.n, o.v, o.p, o.v ? o.p / o.v : 0]); r.getCell(3).numFmt = V; r.getCell(4).numFmt = V; r.getCell(5).numFmt = "0.0%"; }); wd.addRow([]); };
    if (tem("pg")) bloco("Situação do pagamento", T.pg.filter(([, o]) => o.n)); if (tem("ins")) bloco("Por instrumento", T.ins); if (tem("fun")) bloco("Por função", T.fun); if (tem("mun")) bloco("Por município", T.mns);
    if (tem("leg")) { wd.addRow(["Legenda · origem"]).font = { bold: true, size: 12 }; new Map(T.ori.map(([s, t]) => /^EI/.test(s) ? ["EI", "Emenda impositiva (entre parênteses: excesso de receita, bancada regional ou adicional 0,55%, quando não é a da LOA)"] : [s, t])).forEach((t, s) => wd.addRow([s, t])); }
    wd.addRow([]); wd.addRow(["Pago vem do portal da SEF quando a emenda está ligada ao Controle; nos demais, da etapa registrada pelo gabinete."]).font = { italic: true, color: { argb: "FF6B7178" } }; }
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement("a"), nome = `Controle de Recursos - ${PARL.u || "gabinete"} - ${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
