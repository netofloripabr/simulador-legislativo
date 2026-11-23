// Gabinete › Processo legislativo › Comissões (18/11/2026; protótipo aprovado: prototipos/comissoes-tramitacao/painel.html).
// As proposições que tramitam hoje nas comissões permanentes da ALESC. Dados: dados/painel/alesc-comissoes-tram.json, gerado toda
// noite por ferramentas/comissoes/tramitacao.mjs + painel-comissoes.mjs --json (e-Legis). Lido só quando o bloco é aberto.
// Gerado a partir de ferramentas/comissoes/painel-comissoes.html (CSS com prefixo .cmp, JS no contêiner #cmpB).
const CMP_CSS = `.cmp{ --fundo:#0B0F0D; --sup:#14191A; --sup2:#1B2022; --sup3:#232A2C; --linha:rgba(242,244,245,.09); --linha2:rgba(242,244,245,.16);
  --texto:#F2F4F5; --sec:#A9AEB3; --ter:#6B7178; --a:#5B83F0; --ok:#34E84A; --okb:rgba(52,232,74,.14); --or:#E8822A; --erro:#E8432A;  }
.cmp .pg-x{ max-width:1320px; margin:0 auto; padding-block:28px 60px; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); }
.cmp .tag{ display:flex; align-items:center; gap:18px; flex-wrap:wrap; padding:18px 22px; border:1px solid rgba(242,244,245,.06); background:rgba(242,244,245,.018); border-radius:16px; }
.cmp .tag h1{ margin:0; font-size:clamp(30px,4.4vw,48px); font-weight:900; letter-spacing:-.05em; line-height:.95; }
.cmp .tag p{ flex:1; min-width:240px; margin:0; color:var(--sec); max-width:70ch; }
.cmp .tag .at{ font-size:11px; color:var(--ter); white-space:nowrap; }
.cmp .kpi{ display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:10px; margin:18px 0 0; }
.cmp .kpi button{ text-align:left; background:var(--sup); border:1px solid var(--linha); border-radius:14px; padding:12px 14px; cursor:pointer; transition:border-color .15s; }
.cmp .kpi button:hover{ border-color:var(--linha2); }
.cmp .kpi button.on{ border-color:var(--texto); }
.cmp .kpi b{ display:block; font-size:26px; font-weight:800; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
.cmp .kpi span{ font-size:10.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); }
.cmp .kpi small{ display:block; color:var(--sec); font-size:12px; margin-top:2px; }
.cmp .st{ font-size:10.5px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--ter); margin:24px 0 8px; display:flex; justify-content:space-between; }
.cmp .coms{ display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; }
.cmp .com{ text-align:left; background:var(--sup); border:1px solid var(--linha); border-radius:14px; padding:10px 12px; cursor:pointer; display:grid; gap:4px; transition:border-color .15s, background .15s; }
.cmp .com:hover{ border-color:var(--linha2); }
.cmp .com.on{ background:var(--texto); color:#0B0F0D; border-color:var(--texto); }
.cmp .com.on .cn,.cmp .com.on .cmd{ color:#3F454B; }
.cmp .com .cs{ display:flex; align-items:baseline; justify-content:space-between; gap:6px; }
.cmp .com .cs b{ font-size:15px; font-weight:800; letter-spacing:-.01em; }
.cmp .com .cs em{ font-style:normal; font-size:20px; font-weight:800; font-variant-numeric:tabular-nums; }
.cmp .com .cn{ font-size:11.5px; color:var(--sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cmp .com .cmd{ font-size:10.5px; color:var(--ter); }
.cmp .cbar{ display:flex; height:5px; border-radius:3px; overflow:hidden; background:var(--sup3); gap:1px; }
.cmp .cbar i{ display:block; }
.cmp .com.on .cbar{ background:#D3D6D8; }
.cmp .stdir{ display:flex; align-items:center; gap:12px; }
.cmp .cvis{ display:inline-flex; gap:3px; background:var(--sup); border:1px solid var(--linha2); border-radius:999px; padding:3px; }
.cmp .cvis button{ background:none; border:0; border-radius:999px; padding:8px 18px; color:var(--sec); font-size:13.5px; font-weight:700; letter-spacing:.02em; text-transform:none; cursor:pointer; }
.cmp .cvis button.on{ background:var(--texto); color:#0B0F0D; }
.cmp .rkw{ background:var(--sup); border:1px solid var(--linha); border-radius:16px; padding:14px; }
.cmp .rkc{ margin:0 0 10px; font-size:12px; color:var(--ter); } .cmp .rkc b{ color:var(--texto); }
.cmp .rkg{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; }
.cmp .rk{ background:var(--sup2); border:1px solid var(--linha); border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:4px; }
.cmp .rkh{ display:flex; justify-content:space-between; align-items:center; font-size:14px; }
.cmp .rkh button,.cmp .rkt{ background:none; border:0; color:var(--a); font-size:12px; cursor:pointer; padding:0; }
.cmp .rkm{ display:flex; flex-wrap:wrap; gap:4px; margin:4px 0 6px; }
.cmp .rkm button{ background:none; border:1px solid var(--linha2); border-radius:999px; padding:3px 9px; font-size:11px; color:var(--sec); cursor:pointer; }
.cmp .rkm button.on{ background:var(--texto); border-color:var(--texto); color:#0B0F0D; font-weight:700; }
.cmp .rkl{ display:grid; grid-template-columns:20px minmax(0,1fr) auto; gap:8px; align-items:center; background:none; border:0; border-radius:8px; padding:5px 6px; color:inherit; cursor:pointer; text-align:left; }
.cmp .rkl:hover{ background:rgba(242,244,245,.05); }
.cmp .rkp{ font-size:11px; color:var(--ter); text-align:right; font-variant-numeric:tabular-nums; }
.cmp .rkn{ position:relative; font-size:13px; padding-bottom:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cmp .rkn i{ position:absolute; left:0; bottom:0; height:3px; border-radius:2px; background:#647C96; }
.cmp .rkl b{ font-size:13px; font-variant-numeric:tabular-nums; }
.cmp .rkt{ margin-top:4px; text-align:left; } .cmp .rkv{ color:var(--ter); font-size:12.5px; margin:6px; }
@media (max-width:900px){ .cmp .rkg{ grid-template-columns:1fr; } }
.cmp .gr3{ display:flex; gap:18px; background:var(--sup); border:1px solid var(--linha); border-radius:16px; padding:14px 14px 10px; overflow-x:auto; }
.cmp .gg3 > small{ display:block; font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); margin:0 0 6px 2px; }
.cmp .gg3 > div{ display:flex; gap:6px; }
.cmp .gg3:first-child{ flex:4 1 0; } .cmp .gg3:last-child{ flex:20 1 0; }
.cmp .gg3:first-child{ padding-right:18px; border-right:1px dashed var(--linha2); }
.cmp .tb{ flex:1 1 34px; min-width:32px; display:flex; flex-direction:column; align-items:center; gap:5px; background:none; border:0; padding:0; cursor:pointer; color:inherit; }
.cmp .tb.of{ opacity:.35; }
.cmp .tq{ font-size:13px; font-weight:800; font-variant-numeric:tabular-nums; }
/* gráfico das comissões, versão limpa (23/11/2026): barra fina arredondada sobre uma linha de base comum, sem tubo,
   brilho ou listras; empilha o tempo na comissão em três tons de um azul (mais escuro = mais antigo); a parte sem
   relator é o mesmo tom mais claro; pedido de vista vira um ponto âmbar com o número embaixo */
.cmp .tt{ position:relative; width:14px; height:170px; display:flex; align-items:flex-end; }
.cmp .tt::after{ content:""; position:absolute; left:-10px; right:-10px; bottom:-1px; border-bottom:1px solid var(--linha2); }
.cmp .tb:hover .tf{ filter:brightness(1.15); } .cmp .tb.on .tf{ box-shadow:0 0 0 2px var(--fundo), 0 0 0 3.5px var(--texto); }
.cmp .tf{ width:100%; display:flex; flex-direction:column-reverse; border-radius:7px 7px 2px 2px; overflow:hidden; gap:2px; }
.cmp .tf i{ display:flex; flex-direction:column; min-height:2px; }
.cmp .tf i u{ display:block; background:color-mix(in srgb, var(--c) 42%, var(--sup)); }
.cmp .tf i em{ display:block; background:var(--c); }
.cmp .tvs{ display:none; }
.cmp .tvn{ font-size:10.5px; font-weight:600; color:#E8A23A; height:14px; white-space:nowrap; display:inline-flex; align-items:center; gap:4px; } .cmp .tvn::before{ content:""; width:6px; height:6px; border-radius:50%; background:#E8A23A; } .cmp .tv0{ height:14px; }
.cmp .tq{ font-size:12.5px; font-weight:700; }
/* mapa de calor relator × tempo (23/11, 3ª versão) — um tom só, do fraco ao forte */
.cmp .hm{ background:var(--sup); border:1px solid var(--linha); border-radius:16px; padding:14px 14px 10px; overflow-x:auto; }
.cmp .hm-h{ margin:0 0 10px 2px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; } .cmp .hm-s{ background:var(--sup2); color:var(--texto); border:1px solid var(--linha2); border-radius:999px; padding:7px 12px; font:inherit; font-size:12.5px; max-width:100%; } .cmp .hm-h b{ display:block; font-size:14px; color:var(--texto); } .cmp .hm-h span{ font-size:12px; color:var(--ter); }
.cmp .hm-g{ display:flex; flex-direction:column; gap:3px; min-width:620px; }
.cmp .hm-r{ display:grid; grid-template-columns:minmax(140px,1.4fr) repeat(6, minmax(52px,1fr)) 56px; gap:3px; align-items:stretch; }
.cmp .hm-n{ background:none; border:0; color:var(--sec); font:inherit; font-size:12.5px; text-align:left; padding:0 6px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; border-radius:6px; }
.cmp .hm-n:hover{ color:var(--texto); background:var(--sup2); } .cmp .hm-r.on .hm-n{ color:var(--texto); font-weight:700; } .cmp .hm-r.sem .hm-n{ color:#E8A23A; font-weight:600; }
.cmp .hm-c{ height:30px; border:0; border-radius:5px; font:inherit; font-size:12px; font-weight:600; font-variant-numeric:tabular-nums; cursor:pointer; background:rgba(242,244,245,.035); color:var(--texto); }
.cmp .hm-c:disabled{ cursor:default; } .cmp .hm-c:not(:disabled):hover{ outline:1.5px solid var(--texto); outline-offset:-1.5px; } .cmp .hm-c.on{ outline:2px solid var(--texto); outline-offset:-2px; }
.cmp .s1, .cmp .hm-k.s1{ background:#1C3048; } .cmp .s2, .cmp .hm-k.s2{ background:#24497A; } .cmp .s3, .cmp .hm-k.s3{ background:#3569AE; } .cmp .s4, .cmp .hm-k.s4{ background:#8DB6EA; color:#0B0F0D; }
.cmp .hm-k{ display:inline-block; width:22px; height:12px; border-radius:3px; }
.cmp .hm-x{ background:none; border:0; font:inherit; font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; color:var(--ter); padding:4px 2px; cursor:pointer; border-radius:6px; } .cmp .hm-x:hover{ color:var(--texto); } .cmp .hm-x.on{ color:var(--texto); background:var(--sup3); }
.cmp .hm-t{ display:flex; align-items:center; justify-content:flex-end; padding-right:6px; font-size:12px; font-variant-numeric:tabular-nums; color:var(--sec); } .cmp .hm-cab .hm-t{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--ter); }
.cmp .hm-sum{ border-top:1px solid var(--linha); padding-top:4px; margin-top:2px; } .cmp .hm-sum .hm-t, .cmp .hm-sum .hm-n{ font-weight:700; color:var(--texto); justify-content:center; } .cmp .hm-sum .hm-n{ justify-content:flex-start; cursor:default; } .cmp .hm-sum .hm-t:last-child{ justify-content:flex-end; }
.cmp .hm-sw{ display:inline-flex; gap:2px; background:var(--sup2); border:1px solid var(--linha2); border-radius:999px; padding:3px; } .cmp .hm-sw button{ background:none; border:0; border-radius:999px; padding:5px 13px; color:var(--sec); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; } .cmp .hm-sw button.on{ background:var(--texto); color:#0B0F0D; }
.cmp .leq select.lw{ width:150px; max-width:150px; }
.cmp .vsm{ margin-top:16px; border-top:1px solid var(--linha); padding-top:12px; } .cmp .vsm-h b{ display:block; font-size:13.5px; color:var(--texto); } .cmp .vsm-h span{ font-size:12px; color:var(--ter); }
.cmp .vsm-g{ display:flex; gap:14px; align-items:flex-end; height:150px; margin-top:12px; padding:0 4px; border-bottom:1px solid var(--linha2); }
.cmp .vsm-c{ flex:1 1 0; max-width:90px; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; position:relative; }
.cmp .vsm-c b{ font-size:12.5px; color:var(--texto); font-variant-numeric:tabular-nums; } .cmp .vsm-c small{ position:absolute; bottom:-20px; font-size:11px; color:var(--ter); white-space:nowrap; }
.cmp .vsm-b{ width:26px; display:flex; flex-direction:column; gap:2px; border-radius:5px 5px 0 0; overflow:hidden; min-height:2px; } .cmp .vsm-b i{ display:block; background:#3569AE; } .cmp .vsm-b i.ab{ background:#E8A23A; }
.cmp .vsm-l{ display:flex; gap:14px; margin-top:28px; font-size:11.5px; color:var(--sec); } .cmp .vsm-l i{ display:inline-block; width:10px; height:10px; border-radius:3px; background:#3569AE; margin-right:5px; vertical-align:-1px; } .cmp .vsm-l i.ab{ background:#E8A23A; }
.cmp .cdt{ grid-column:1 / -1; background:var(--sup2); border:1px solid var(--linha2); border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:12px; cursor:default; }
.cmp .cdt-h{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; } .cmp .cdt-h b{ display:block; font-size:16px; color:var(--texto); } .cmp .cdt-h span{ font-size:12px; color:var(--ter); }
.cmp .cdt-x{ width:30px; height:30px; border-radius:50%; border:1px solid var(--linha2); background:var(--sup); color:var(--sec); font-size:16px; cursor:pointer; flex:none; }
.cmp .cdt-k{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:8px; } .cmp .cdt-k div{ background:var(--sup); border:1px solid var(--linha); border-radius:12px; padding:9px 11px; } .cmp .cdt-k b{ display:block; font-size:20px; color:var(--texto); font-variant-numeric:tabular-nums; } .cmp .cdt-k span{ font-size:11.5px; color:var(--ter); }
.cmp .cdt-t{ overflow-x:auto; } .cmp .cdt-t table{ width:100%; border-collapse:collapse; font-size:12.5px; min-width:520px; } .cmp .cdt-t th, .cmp .cdt-t td{ padding:7px 8px; border-bottom:1px solid var(--linha); text-align:right; font-variant-numeric:tabular-nums; }
.cmp .cdt-t thead th{ font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--ter); font-weight:600; } .cmp .cdt-t tbody th{ text-align:left; color:var(--texto); font-weight:600; } .cmp .cdt-t tbody th small{ display:block; font-weight:400; font-size:11px; color:var(--ter); } .cmp .cdt-t td{ color:var(--sec); }
.cmp .cdt-r{ display:flex; flex-wrap:wrap; gap:6px 14px; font-size:12px; color:var(--sec); align-items:baseline; } .cmp .cdt-r b{ flex-basis:100%; font-size:12.5px; color:var(--texto); } .cmp .cdt-r em{ font-style:normal; color:var(--texto); font-weight:600; }
.cmp .cdt-n{ font-size:11.5px; color:var(--ter); line-height:1.45; }
@media (max-width:700px){ .cmp .cdt-k{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
.cmp .hm-mais{ margin-top:8px; background:none; border:0; color:var(--a); font:inherit; font-size:12.5px; cursor:pointer; }
.cmp .hgr{ display:flex; flex-direction:column; gap:14px; background:var(--sup); border:1px solid var(--linha); border-radius:16px; padding:12px 12px 8px; }
.cmp .hh, .cmp .hb{ display:grid; grid-template-columns:minmax(120px,190px) minmax(0,1fr) 78px 64px; gap:12px; align-items:center; }
.cmp .hh{ font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--ter); padding:0 8px 4px; border-bottom:1px solid var(--linha); margin-bottom:2px; } .cmp .hh span:nth-child(n+3){ text-align:right; letter-spacing:.04em; }
.cmp .hb{ width:100%; background:none; border:0; border-radius:8px; padding:5px 8px; cursor:pointer; color:inherit; text-align:left; font:inherit; } .cmp .hb:hover{ background:var(--sup2); } .cmp .hb.on{ background:var(--sup3); box-shadow:inset 0 0 0 1px var(--linha2); } .cmp .hb.of{ opacity:.4; }
.cmp .hn{ font-size:12.5px; color:var(--sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .cmp .hn b{ display:inline-block; min-width:44px; color:var(--texto); font-weight:700; font-size:12px; }
.cmp .hbar{ display:flex; align-items:center; gap:8px; min-width:0; } .cmp .hf{ display:flex; gap:2px; height:10px; min-width:0; } .cmp .hf i{ display:block; height:100%; min-width:2px; } .cmp .hf i:last-child{ border-radius:0 4px 4px 0; }
.cmp .hbar em{ font-style:normal; font-size:12.5px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--texto); flex:none; }
.cmp .hx{ text-align:right; font-size:12.5px; font-variant-numeric:tabular-nums; color:var(--sec); } .cmp .hx.z, .cmp .hb.z .hbar em{ color:var(--ter); opacity:.6; } .cmp .hx.vs{ color:#E8A23A; font-weight:600; }
@media (max-width:700px){ .cmp .hh, .cmp .hb{ grid-template-columns:minmax(0,1fr) 54px 46px; } .cmp .hh span:nth-child(2){ display:none; } .cmp .hn{ grid-column:1; } .cmp .hbar{ grid-column:1 / -1; grid-row:2; } }
.cmp .tn{ writing-mode:vertical-rl; transform:rotate(180deg); font-size:11.5px; color:var(--sec); height:96px; text-align:left; white-space:nowrap; }
.cmp .tb.on .tn{ color:var(--texto); font-weight:700; }
.cmp .gr2{ background:var(--sup); border:1px solid var(--linha); border-radius:16px; padding:14px 14px 4px; overflow-x:auto; }
.cmp .gr2 svg{ min-width:860px; }
.cmp .gr2 .pcrow:hover .ano{ fill:#fff; }
.cmp .gr{ display:flex; gap:0; background:var(--sup); border:1px solid var(--linha); border-radius:16px; padding:16px 12px 12px; overflow-x:auto; }
.cmp .gr .gg{ display:flex; gap:4px; align-items:stretch; }
.cmp .gr .gg:first-child{ flex:4 1 0; } .cmp .gr .gg:last-child{ flex:20 1 0; }
.cmp .gr .gg + .gg{ margin-left:14px; padding-left:14px; border-left:1px solid var(--linha2); }
.cmp .gr .gc{ flex:1 1 30px; min-width:30px; display:flex; flex-direction:column; align-items:center; gap:6px; background:none; border:0; padding:0; cursor:pointer; border-radius:8px; }
.cmp .gr .gc:hover .gb{ outline:1px solid var(--linha2); }
.cmp .gr .gc.on .gb{ outline:2px solid var(--texto); }
.cmp .gr .gc.of{ opacity:.35; }
.cmp .gr .gn{ writing-mode:vertical-rl; transform:rotate(180deg); font-size:11.5px; color:var(--sec); height:104px; text-align:left; white-space:nowrap; }
.cmp .gr .gc.on .gn{ color:var(--texto); font-weight:700; }
.cmp .gr .gq{ font-size:12px; font-weight:800; font-variant-numeric:tabular-nums; }
.cmp .gr .gb{ width:22px; height:var(--h); display:flex; flex-direction:column-reverse; border-radius:5px; overflow:hidden; gap:1px; }
.cmp .gr .gb i{ display:block; width:100%; }
.cmp .gr .gs{ font-size:10px; color:var(--ter); }
.cmp .gr .gv{ width:7px; height:7px; border-radius:50%; background:#E8A23A; }
.cmp .gr .gcol{ display:flex; flex-direction:column; align-items:center; gap:4px; height:var(--alt); justify-content:flex-end; }
.cmp .lg{ display:flex; gap:14px; flex-wrap:wrap; font-size:11.5px; color:var(--sec); margin-top:8px; }
.cmp .lg i{ display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
.cmp .bar{ top:64px !important; display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:22px 0 10px; position:sticky; top:0; z-index:5; padding:10px 0; background:linear-gradient(var(--fundo) 80%, rgba(11,15,13,0)); }
.cmp .busca{ flex:1 1 260px; display:flex; align-items:center; gap:8px; background:var(--sup); border:1px solid var(--linha); border-radius:999px; padding:0 14px; height:40px; }
.cmp .busca input{ flex:1; background:none; border:0; outline:none; font-size:13.5px; }
.cmp .busca svg{ width:15px; height:15px; color:var(--ter); flex:none; }
.busca.ico{ flex:0 0 40px; width:40px; padding:0; justify-content:center; cursor:pointer; transition:flex-basis .15s; } .busca.ico input{ display:none; } .busca.ico.on{ flex:1 1 260px; width:auto; padding:0 14px; justify-content:flex-start; cursor:text; } .busca.ico.on input{ display:block; }
.cmp .leq{ display:inline-flex; align-items:center; gap:8px; padding:4px 6px 4px 14px; border:1px solid var(--linha); border-radius:999px; background:var(--sup); height:40px; }
.cmp .leq .lq{ display:inline-flex; color:var(--ter); } .cmp .leq .lq svg{ width:16px; height:16px; } .cmp .leq:hover .lq{ color:var(--texto); }
.cmp .leq span{ font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); font-weight:600; }
.cmp .leq select{ background:var(--sup2); border:0; border-radius:999px; padding:6px 10px; font-size:13px; font-weight:600; max-width:200px; }
.cmp .vis{ display:flex; gap:2px; background:var(--sup); border:1px solid var(--linha); border-radius:999px; padding:3px; height:40px; }
.cmp .vis button{ background:none; border:0; border-radius:999px; padding:0 14px; color:var(--sec); font-weight:600; cursor:pointer; font-size:13px; }
.cmp .vis button.on{ background:var(--texto); color:#0B0F0D; }
.cmp .futb{ display:inline-flex; align-items:center; gap:6px; height:40px; padding:0 14px; border:1px solid var(--linha); border-radius:999px; background:var(--sup); color:var(--sec); font-weight:600; font-size:13px; cursor:pointer; }
.futb svg{ width:15px; height:15px; } .futb:hover{ color:var(--texto); } .futb.on{ background:var(--texto); color:#0B0F0D; border-color:var(--texto); }
.futs{ margin-top:26px; } .futs h3{ margin:0 0 12px; font-size:17px; font-weight:700; letter-spacing:-.01em; } .futs h3 small{ display:block; font-size:12.5px; font-weight:400; color:var(--sec); margin-top:3px; letter-spacing:0; }
.futg{ margin-bottom:16px; } .futh{ display:flex; align-items:baseline; gap:10px; margin:0 0 8px 2px; font-size:12.5px; color:var(--ter); } .futh b{ font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--sec); }
.futs .vazio{ background:var(--sup); border:1px solid var(--linha); border-radius:18px; }
.limpa{ background:none; border:0; color:var(--a); cursor:pointer; font-size:12.5px; padding:0 6px; }
.cmp .res{ font-size:12.5px; color:var(--sec); margin:2px 0 10px; }
.cmp .res b{ color:var(--texto); }
.cmp .lista{ background:var(--sup); border:1px solid var(--linha); border-radius:18px; overflow:hidden; }
.cmp .cab,.cmp .lin{ display:grid; grid-template-columns:76px minmax(0,1.6fr) minmax(120px,.6fr) minmax(300px,1.3fr) minmax(110px,.5fr); gap:14px; align-items:center; padding:12px 16px; }
.cmp .cab{ font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); font-weight:600; border-bottom:1px solid var(--linha); background:rgba(242,244,245,.015); }
.cmp .cab button{ background:none; border:0; padding:0; font:inherit; color:inherit; letter-spacing:inherit; text-transform:inherit; cursor:pointer; text-align:left; }
.cmp .cab button i{ font-style:normal; margin-left:4px; color:#3A4045; }
.cmp .cab button.on,.cmp .cab button.on i{ color:var(--texto); }
.cmp .lin{ border-bottom:1px solid rgba(242,244,245,.05); cursor:pointer; transition:background .12s; }
.cmp .cmeto.pe{ grid-template-columns:1fr; width:64px; text-align:center; }
.cmp .cmeto.pe b{ padding:5px 0 4px; font-size:11.5px; letter-spacing:.06em; }
.cmp .cmeto.pe span{ padding:6px 0; font-size:12.5px; font-weight:800; }
.cmp .le .prot{ display:block; font-size:10.5px; color:var(--ter); margin-top:7px; line-height:1.35; width:64px; text-align:center; }
.cmp .obj b{ text-align:left; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.cmp .cab2{ display:flex; gap:10px; align-items:center; }
.cmp .cab2 button{ font-size:10px !important; }
.cmp .rt{ font-variant-numeric:tabular-nums; }
.cmp .rth{ display:flex; justify-content:space-between; align-items:baseline; font-size:13px; color:var(--texto); }
.cmp .rth b{ font-weight:700; }
.cmp .rtc{ display:inline-flex; gap:5px; align-items:baseline; color:var(--sec); }
.cmp .rtc em{ font-style:normal; font-size:10.5px; font-weight:800; background:var(--texto); color:#0B0F0D; border-radius:4px; padding:1px 5px; }
.cmp .rtb{ display:flex; align-items:center; gap:3px; margin:6px 0 4px; }
.cmp .rtp{ position:relative; flex:1; display:flex; gap:2px; height:16px; }
.cmp .rtp i{ display:flex; align-items:center; justify-content:center; height:100%; min-width:3px; overflow:hidden; }
.cmp .rtp i:first-child{ border-radius:5px 0 0 5px; } .cmp .rtp i:last-of-type{ border-radius:0 5px 5px 0; }
.cmp .rtp i span{ font-size:9.5px; font-weight:800; letter-spacing:.02em; white-space:nowrap; }
.cmp .rtp .r-lei{ background:#3A4045; color:#C9CDD1; }
.cmp .rtp .r-arq{ background:repeating-linear-gradient(45deg,#3A2E1E 0 3px,#2A2218 3px 6px); color:#C9A97A; }
.cmp .rtp .r-sem{ background:repeating-linear-gradient(45deg,#2A2F33 0 3px,#202427 3px 6px); color:#8A9096; }
.cmp .rtp .r-ok{ background:#647C96; color:#F2F4F5; }
.cmp .rtp .r-ps{ background:#2E3B4B; }
.cmp .rtp .r-atual{ background:#C9D4DE; color:#14191A; }
.cmp .rtp .r-vs{ background:#F2C94C; color:#2B1A03; }
.cmp .rtp .vk, .cmp .dx .gtb .vk{ position:absolute; top:-3px; bottom:-3px; width:4px; margin-left:-2px; border-radius:2px; background:#F2C94C; box-shadow:0 0 0 1.5px var(--sup); z-index:1; }
.cmp .rtp s{ position:absolute; right:-4px; top:50%; width:9px; height:9px; margin-top:-4.5px; border-radius:50%; background:var(--texto); border:2px solid var(--sup); }
.cmp .rtb u{ text-decoration:none; font-size:9.5px; font-weight:700; color:var(--ter); border:1px dashed var(--linha2); border-radius:4px; padding:1px 4px; height:16px; display:inline-flex; align-items:center; }
.cmp .rtb u:first-of-type{ margin-left:6px; }
.cmp .rtl{ display:flex; justify-content:space-between; font-size:10px; color:var(--ter); }
.cmp .tmp{ font-variant-numeric:tabular-nums; }
.cmp .tmh{ display:flex; justify-content:space-between; align-items:baseline; gap:8px; font-size:13px; }
.cmp .tmh span{ display:inline-flex; gap:5px; align-items:baseline; }
.cmp .tmh em{ font-style:normal; font-size:10.5px; font-weight:800; background:var(--texto); color:#0B0F0D; border-radius:4px; padding:1px 5px; }
.cmp .tml{ position:relative; display:flex; height:6px; border-radius:3px; background:var(--sup3); margin:7px 0 4px; }
.cmp .tml i{ display:block; height:100%; }
.cmp .tml .tma{ background:#3A4045; border-radius:3px 0 0 3px; }
.cmp .tml .tmc{ border-radius:0 3px 3px 0; background:#A9AEB3; }
.cmp .tml .tmc.m{ background:#E9C46A; } .cmp .tml .tmc.l{ background:#E8822A; }
.cmp .tml s{ position:absolute; top:50%; width:8px; height:8px; margin:-4px 0 0 -4px; border-radius:50%; background:var(--sup); border:1.5px solid #A9AEB3; }
.cmp .tml s.hj{ background:var(--texto); border-color:var(--texto); }
.cmp .tmd{ display:flex; justify-content:space-between; font-size:10px; color:var(--ter); }
.cmp .vst{ display:block; width:max-content; max-width:100%; white-space:normal; line-height:1.3; margin-top:5px; font-size:10.5px; font-weight:700; letter-spacing:.02em; color:#F0C67A; background:rgba(232,162,58,.12); border:1px solid rgba(232,162,58,.35); border-radius:999px; padding:2px 8px; }
.cmp .com2 b{ display:inline-block; font-size:12px; font-weight:800; background:var(--texto); color:#0B0F0D; border-radius:6px; padding:3px 7px; margin-right:4px; }
.cmp .lin:hover{ background:rgba(242,244,245,.025); }
.cmp .lin.ab{ background:rgba(242,244,245,.035); }
.cmp .casa{ display:block; font-size:11px; color:var(--ter); margin-top:5px; }
.cmp .tbar{ display:flex; height:4px; border-radius:2px; overflow:hidden; background:var(--sup3); margin-top:6px; width:100%; }
.cmp .tbar i{ display:block; }
.cmp .imp{ display:inline-flex; align-items:center; gap:6px; height:40px; padding:0 14px; border:1px solid var(--linha); border-radius:999px; background:var(--sup); color:var(--sec); font-weight:600; font-size:13px; cursor:pointer; }
.cmp .imp:hover{ color:var(--texto); border-color:var(--linha2); }
.cmp .imp svg{ width:14px; height:14px; }
.cmp .impm{ position:absolute; z-index:20; background:var(--sup2); border:1px solid var(--linha2); border-radius:12px; padding:6px; display:grid; gap:2px; min-width:230px; box-shadow:0 12px 30px rgba(0,0,0,.4); }
.cmp .impm button{ text-align:left; background:none; border:0; border-radius:8px; padding:8px 10px; color:var(--texto); cursor:pointer; font-size:13px; }
.cmp .impm button small{ display:block; color:var(--ter); font-size:11.5px; }
.cmp .impm button:hover{ background:rgba(242,244,245,.06); }
.cmp .impm .impq{ display:flex; gap:8px; align-items:flex-start; border-top:1px solid var(--linha2); margin-top:4px; padding:9px 10px 6px; font-size:13px; color:var(--texto); cursor:pointer; } .cmp .impm .impq input{ margin-top:2px; accent-color:#1FA83A; } .cmp .impm .impq small{ display:block; color:var(--ter); font-size:11.5px; }
.cmp .dx{ grid-column:1 / -1; cursor:default; --sf:#EEF0F2; --tl:#F8F9FA; --bd:#DEE2E5; --tx:#1D2226; --mu:#6E767D; --ac:#1FA845; --cz:#5E666D; --tq:#E3E7EA; background:var(--sf); color:var(--tx); border-radius:16px; padding:20px 22px 18px; margin:4px 0 8px; container-type:inline-size; }
body.dm-escuro .cmp .dx{ --sf:#171C20; --tl:#1B2125; --bd:#272D33; --tx:#E6E9EB; --mu:#8C939A; --ac:#4FE36A; --cz:#9AA1A7; --tq:#20262A; }
.cmp .dx svg.i{ width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; flex:none; }
.cmp .dx .dh{ display:flex; align-items:flex-start; gap:14px; }
.cmp .dx .dst{ font-size:20px; font-weight:500; letter-spacing:-.02em; display:flex; align-items:center; gap:10px; }
.cmp .dx .dst i{ width:8px; height:8px; border-radius:50%; background:var(--cz); box-shadow:0 0 0 4px rgba(94,102,109,.16); flex:none; }
.cmp .dx .dsub{ color:var(--mu); font-size:12.5px; margin-top:4px; padding-left:18px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.cmp .dx .dsub a{ color:var(--tx); font-weight:600; text-decoration:none; display:inline-flex; gap:4px; align-items:center; border-bottom:1px solid var(--bd); }
.cmp .dx .dac{ margin-left:auto; display:flex; gap:2px; }
.cmp .dx .dac button{ width:30px; height:30px; border-radius:8px; border:0; background:none; color:var(--mu); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
.cmp .dx .dac button:hover{ background:rgba(0,0,0,.06); color:var(--tx); }
.cmp .dx .mch{ margin:16px 0 4px; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:18px; align-items:start; }
.cmp .dx .mch h2{ font-size:21px; line-height:1.25; font-weight:600; letter-spacing:-.02em; margin:0; text-wrap:pretty; }
.cmp .dx .mch p{ margin:6px 0 0; font-size:13.5px; line-height:1.55; color:var(--mu); }
.cmp .dx .tms{ display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.cmp .dx .tm{ display:inline-flex; border-radius:7px; overflow:hidden; font-size:11px; font-weight:600; border:1px solid var(--bd); background:var(--tl); }
.cmp .dx .tm span{ padding:4px 8px; display:flex; align-items:center; gap:5px; }
.cmp .dx .tm span + span{ border-left:1px solid var(--bd); color:var(--mu); font-weight:500; }
.cmp .dx .tm span:first-child{ background:var(--tx); color:var(--sf); }
.cmp .dx .anel{ width:104px; text-align:center; }
.cmp .dx .anel svg{ width:84px; height:84px; display:block; margin:0 auto; }
.cmp .dx .anel small{ display:block; font-size:10.5px; color:var(--mu); margin-top:2px; line-height:1.3; }
.cmp .dx .alerta{ display:flex; gap:10px; align-items:center; background:#FFF4E2; border:1px solid #F3D29C; color:#7A4B06; border-radius:12px; padding:9px 12px; font-size:12.5px; margin:12px 0 0; }
body.dm-escuro .cmp .dx .alerta{ background:#2B2213; border-color:#5A4521; color:#F0C67A; }
.cmp .dx .stp{ display:grid; grid-template-columns:repeat(var(--n),1fr); position:relative; margin:22px 0 18px; }
.cmp .dx .stp:before,.cmp .dx .stp:after{ content:""; position:absolute; top:16px; height:2px; left:calc(50% / var(--n)); }
.cmp .dx .stp:before{ right:calc(50% / var(--n)); background:var(--bd); }
.cmp .dx .stp:after{ width:calc((100% - 100% / var(--n)) * var(--f)); background:var(--ac); }
.cmp .dx .sp{ display:flex; flex-direction:column; align-items:center; gap:5px; position:relative; z-index:1; text-align:center; min-width:0; }
.cmp .dx .sd{ width:34px; height:34px; border-radius:50%; border:1.5px dashed #B9C0C5; background:var(--tl); color:var(--mu); display:flex; align-items:center; justify-content:center; }
.cmp .dx .sp.ok .sd{ background:var(--ac); border:1.5px solid var(--ac); color:#fff; }
.cmp .dx .sp.atual .sd{ background:var(--cz); border:1.5px solid var(--cz); color:#fff; box-shadow:0 0 0 5px rgba(94,102,109,.16); }
.cmp .dx .sp b{ font-size:13px; font-weight:700; }
.cmp .dx .sp:not(.ok):not(.atual) b{ color:var(--mu); }
.cmp .dx .sp small{ font-size:11px; color:var(--mu); line-height:1.25; }
.cmp .dx .sp.ok small{ color:#17883A; }
.cmp .dx .sp.atual small{ color:var(--tx); font-weight:600; }
.cmp .dx .gt{ background:var(--tl); border:1px solid var(--bd); border-radius:12px; padding:12px 14px 10px; margin-bottom:12px; }
.cmp .dx .gth{ display:flex; justify-content:space-between; gap:8px; font-size:11px; color:var(--mu); margin-bottom:8px; }
.cmp .dx .gth b{ color:var(--tx); font-weight:600; }
.cmp .dx .gtb{ position:relative; display:flex; height:22px; border-radius:6px; gap:2px; } .cmp .dx .gtb i:first-child{ border-radius:6px 0 0 6px; } .cmp .dx .gtb i:last-of-type{ border-radius:0 6px 6px 0; } .cmp .dx .gtb .vk{ top:-2px; bottom:-2px; }
.cmp .dx .gtb i{ display:flex; align-items:center; justify-content:center; font-style:normal; font-size:10.5px; font-weight:700; color:#fff; min-width:6px; white-space:nowrap; overflow:hidden; }
.cmp .dx .gtb .aq{ background:repeating-linear-gradient(45deg,#E9DCC6 0 3px,#F3EBDD 3px 6px); color:#7A5B2E; }
.cmp .dx .gtb .sm{ background:repeating-linear-gradient(45deg,#D3D8DB 0 3px,#E6E9EC 3px 6px); color:#6E767D; }
.cmp .dx .gtb .ex{ background:#B9C0C5; color:#3E454B; }
.cmp .dx .gtb .ok{ background:var(--ac); }
.cmp .dx .gtb .ps{ background:#D3D8DB; color:#3E454B; }
.cmp .dx .gtb .atual{ background:var(--cz); }
.cmp .dx .gtb .vs{ background:#F2C94C; color:#3B2606; }
.cmp .dx .tlr.vs .tlv i{ background:#E8A23A; border-color:#E8A23A; box-shadow:0 0 0 4px rgba(232,162,58,.18); }
.cmp .dx .vbox{ display:flex; gap:10px; align-items:center; background:#FFF4E2; border:1px solid #F3D29C; color:#7A4B06; border-radius:12px; padding:9px 12px; font-size:12.5px; margin:12px 0 0; }
body.dm-escuro .cmp .dx .vbox{ background:#2B2213; border-color:#5A4521; color:#F0C67A; }
.cmp .dx .gtl{ display:flex; justify-content:space-between; font-size:10.5px; color:var(--mu); margin-top:5px; font-variant-numeric:tabular-nums; }
.cmp .dx .bnt{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1px; background:var(--bd); border:1px solid var(--bd); border-radius:14px; overflow:hidden; }
.cmp .dx .tl2{ background:var(--tl); padding:11px 14px; display:flex; flex-direction:column; gap:6px; min-width:0; }
.cmp .dx .tl2.w2{ grid-column:span 2; } .tl2.w4{ grid-column:1 / -1; }
/* relator e votação (23/11) */
.qrl{ display:flex; align-items:center; gap:10px; } .qrl b{ display:block; font-size:14px; color:var(--tx); } .qrl small{ display:block; font-size:11.5px; color:var(--mu); }
.qri{ width:30px; height:30px; border-radius:50%; background:var(--tx); color:var(--sf); display:inline-flex; align-items:center; justify-content:center; flex:none; } .qri .i{ width:15px; height:15px; stroke:currentColor; }
.qrv{ border-top:1px dashed var(--bd); padding-top:8px; margin-top:4px; } .qrh{ display:flex; gap:8px; align-items:baseline; font-size:12px; color:var(--mu); margin-bottom:6px; } .qrh b{ font-size:12px; color:var(--tx); }
.qrm{ display:flex; flex-wrap:wrap; gap:5px; } .qrm i{ width:16px; height:16px; border-radius:50%; background:#D3D8DB; display:block; } .qrm i.fv{ background:var(--ac); } .qrm i.ct{ background:#D64545; } .qrm i.es{ background:transparent; border:1.5px dashed #AEB5BA; }
.qrn{ display:flex; flex-wrap:wrap; gap:2px 12px; font-size:11.5px; color:var(--mu); margin-top:6px; } .qrn .c{ color:#B23A2A; } .qrn .f{ color:#17883A; } .qr0{ font-size:12px; color:var(--mu); }
/* linha do tempo com ícones e degraus (23/11) */
.tlr{ display:grid !important; grid-template-columns:52px calc(22px + var(--nv, 0) * 12px) minmax(0,1fr) !important; gap:0 8px !important; padding-top:6px !important; }
.tld{ position:static !important; transform:none !important; text-align:right; padding-top:4px; font-size:11px; color:var(--mu); font-variant-numeric:tabular-nums; white-space:nowrap; }
.tlv{ position:relative; display:flex !important; flex-direction:column; align-items:flex-end !important; }
.tli{ width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; background:var(--tq); border:1.5px solid #9AA1A7; color:var(--mu); flex:none; position:relative; z-index:1; } .tli .i{ width:12px; height:12px; stroke:currentColor; }
.tlv s{ align-self:flex-end; margin:3px 10px 0 0 !important; flex:1; border-left:1.5px dashed #AEB5BA; min-height:12px; }
.tlr.on .tli{ background:rgba(31,168,69,.12); border-color:var(--ac); color:var(--ac); } .tlr.on .tlv s{ border-left-style:solid; border-color:rgba(31,168,69,.6); }
.tlr.cur .tli{ background:var(--cz); border-color:var(--cz); color:#fff; } .tlr.vs .tli{ background:#FDF1DE; border-color:#E8A23A; color:#B97A1E; }
.tlr.nt .tli{ background:var(--tq); border-color:var(--cz); color:var(--cz); } .tlr.pd .tli{ border-style:dashed; }
.tlr.sobe .tlv::before{ content:""; position:absolute; right:10px; top:-6px; width:12px; height:17px; border-left:1.5px solid rgba(31,168,69,.6); border-bottom:1.5px solid rgba(31,168,69,.6); border-bottom-left-radius:7px; }
.tlr.sobe.pd .tlv::before, .tlr.sobe.cur .tlv::before{ border-color:#AEB5BA; }
.tlv i{ display:none; }
.cmp .dx .tk{ display:flex; align-items:flex-start; gap:7px; font-size:11px; color:var(--mu); line-height:1.3; }
.cmp .dx .tv{ font-size:15px; font-weight:600; line-height:1.3; overflow-wrap:anywhere; }
.cmp .dx .tv small{ display:block; font-size:11.5px; color:var(--mu); font-weight:400; margin-top:3px; line-height:1.35; }
.cmp .dx .tv.ok0{ color:#17883A; }
.cmp .dx .av{ display:inline-flex; width:26px; height:26px; border-radius:50%; background:var(--tx); color:var(--sf); font-size:10.5px; font-weight:700; align-items:center; justify-content:center; margin-right:8px; vertical-align:middle; }
.cmp .dx .av.vz{ background:none; border:1.5px dashed #B9C0C5; color:var(--mu); }
.cmp .dx .dsp{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
.cmp .dx .dsp i{ display:inline-flex; align-items:center; justify-content:center; height:22px; min-width:30px; padding:0 7px; border-radius:6px; background:var(--tx); color:var(--sf); font-style:normal; font-size:11px; font-weight:700; }
.cmp .dx .dsp i.nv{ background:var(--ac); color:#fff; }
.cmp .dx .dsp i.pa{ background:var(--tl); color:var(--mu); border:1px solid var(--bd); font-weight:600; }
.cmp .dx .dsp em{ font-style:normal; color:var(--mu); font-size:12px; }
.cmp .dx .avn{ display:flex; align-items:baseline; gap:6px; }
.cmp .dx .avn b{ font-size:22px; font-weight:700; letter-spacing:-.02em; }
.cmp .dx .avn span{ font-size:12px; color:var(--mu); }
.cmp .dx .avs{ display:flex; gap:4px; }
.cmp .dx .avs span{ flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; }
.cmp .dx .avs i{ display:flex; align-items:center; justify-content:center; gap:3px; width:100%; height:22px; border-radius:6px; font-style:normal; font-size:11px; font-weight:700; background:var(--tl); border:1px dashed #B9C0C5; color:var(--mu); }
.cmp .dx .avs i svg{ width:11px; height:11px; }
.cmp .dx .avs .ok i{ background:var(--ac); border:1px solid var(--ac); color:#fff; }
.cmp .dx .avs .atual i{ background:var(--cz); border:1px solid var(--cz); color:#fff; }
.cmp .dx .avs small{ font-size:10px; color:var(--mu); white-space:nowrap; }
.cmp .dx .dois{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:12px 0; }
.cmp .dx .cx{ background:var(--tl); border:1px solid var(--bd); border-radius:14px; padding:12px 14px; }
.cmp .dx .cxh{ font-size:11px; color:var(--mu); display:flex; gap:7px; align-items:center; margin-bottom:8px; }
.cmp .dx .it{ display:grid; grid-template-columns:26px minmax(0,1fr); gap:8px; align-items:start; padding:6px 0; border-top:1px solid var(--bd); font-size:12.5px; line-height:1.4; }
.cmp .dx .it:first-of-type{ border-top:0; }
.cmp .dx .it .ic{ width:26px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:var(--tq); color:var(--mu); }
.cmp .dx .it .ic.v{ background:var(--tx); color:var(--sf); }
.cmp .dx .it .ic.ok{ background:#DDF3E1; color:#17883A; }
.cmp .dx .it .ic.no{ background:#FBE3DF; color:#C2341D; }
.cmp .dx .it small{ display:block; color:var(--mu); font-size:11px; }
.cmp .dx .fd{ display:flex; flex-wrap:wrap; gap:5px; }
.cmp .dx .fd span{ font-size:10.5px; font-weight:600; padding:3px 7px; border-radius:5px; background:var(--sf); border:1px solid var(--bd); }
.cmp .dx .txt{ font-size:13px; line-height:1.55; }
.cmp .dx .base{ display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:12px; align-items:start; }
.cmp .dx .tlq{ background:var(--tq); border:1px solid var(--bd); border-radius:14px; padding:18px 18px 6px 4px; }
.cmp .dx .tlh{ display:flex; justify-content:space-between; gap:8px; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--mu); margin-bottom:16px; padding-left:14px; }
.cmp .dx .tlh b{ letter-spacing:.02em; color:#17883A; font-weight:600; text-transform:none; font-size:12px; text-align:right; }
.cmp .dx .tlr{ display:grid; grid-template-columns:64px minmax(0,1fr); gap:0 4px; padding-top:18px; }
.cmp .dx .tlv{ position:relative; display:flex; flex-direction:column; align-items:center; }
.cmp .dx .tlv i{ width:11px; height:11px; border-radius:50%; border:1.5px solid #9AA1A7; background:var(--tq); margin-top:3px; flex:none; }
.cmp .dx .tlv s{ flex:1; border-left:1.5px dashed #AEB5BA; margin:4px 0; min-height:14px; }
.cmp .dx .tld{ position:absolute; top:-18px; left:50%; transform:translateX(-50%); white-space:nowrap; font-size:11px; color:var(--mu); font-variant-numeric:tabular-nums; }
.cmp .dx .tlr.on .tlv i{ background:var(--ac); border-color:var(--ac); box-shadow:0 0 0 4px rgba(31,168,69,.14); }
.cmp .dx .tlr.on .tlv s{ border-left-style:solid; border-color:rgba(31,168,69,.6); }
.cmp .dx .tlr.cur .tlv i{ background:var(--cz); border-color:var(--cz); box-shadow:0 0 0 4px rgba(94,102,109,.16); }
.cmp .dx .tlr.nt .tlv i{ width:7px; height:7px; background:var(--cz); border-color:var(--cz); box-shadow:none; margin-top:5px; }
.cmp .dx .tlc{ padding-bottom:12px; font-size:12px; color:var(--mu); }
.cmp .dx .tlc b{ display:block; font-size:13.5px; color:var(--tx); font-weight:600; margin-bottom:2px; }
.cmp .dx .tlc span{ display:block; line-height:1.5; }
.cmp .dx .tlr.pd .tlc b{ color:var(--mu); }
.cmp .dx .rel2{ display:flex; flex-direction:column; gap:8px; }
.cmp .dx .rc{ display:grid; grid-template-columns:18px minmax(0,1fr) 14px; gap:9px; align-items:start; background:var(--tl); border:1px solid var(--bd); border-radius:12px; padding:10px 12px; text-decoration:none; color:var(--tx); }
.cmp .dx a.rc:hover{ border-color:#B9C0C5; }
.cmp .dx .rc .ic,.cmp .dx .rc .go{ color:var(--mu); padding-top:1px; }
.cmp .dx .rc b{ display:block; font-size:13px; font-weight:600; line-height:1.35; }
.cmp .dx .rc small{ display:block; font-size:11.5px; color:var(--mu); line-height:1.4; margin-top:1px; }
.cmp .dx .aviso{ font-size:11.5px; color:var(--mu); margin-top:10px; }
@container (max-width:820px){ .cmp .dx .bnt{ grid-template-columns:repeat(2,minmax(0,1fr)); } .cmp .dx .base,.cmp .dx .dois{ grid-template-columns:1fr; } .cmp .dx .mch{ grid-template-columns:1fr; } .cmp .dx .anel{ display:none; } }
@container (max-width:460px){ .cmp .dx .bnt{ grid-template-columns:1fr; } .cmp .dx .tl2.w2{ grid-column:span 1; } }
.cmp .cmeto{ display:inline-grid; grid-template-columns:auto auto; border-radius:6px; overflow:hidden; font-size:11px; font-weight:700; letter-spacing:.02em; line-height:1; }
.cmp .cmeto b{ background:#E6E8EA; color:#0B0F0D; padding:5px 7px; }
.cmp .cmeto span{ background:var(--sup3); color:var(--texto); padding:5px 7px; font-variant-numeric:tabular-nums; }
.cmp .cmeto.plc b{ background:#B9BEC2; }
.cmp .cmeto.pec b{ background:#7E848A; color:#fff; }
.cmp .cmeto.out b{ background:#3F454B; color:#fff; }
.cmp .prot{ display:block; font-size:11px; color:var(--ter); margin-top:6px; }
.cmp .obj b{ display:block; font-weight:600; font-size:14px; line-height:1.35; text-wrap:pretty; }
.cmp .obj .cmvb{ display:inline-block; font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--sec); border:1px solid var(--linha2); border-radius:999px; padding:1px 7px; margin-right:6px; vertical-align:2px; }
.cmp .obj small{ display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; color:var(--ter); font-size:12px; margin-top:3px; }
.cmp .aut{ font-size:13px; color:var(--sec); }
.cmp .aut small{ display:block; font-size:11px; color:var(--ter); }
.cmp .na b{ display:inline-block; font-size:12px; font-weight:800; background:var(--texto); color:#0B0F0D; border-radius:6px; padding:3px 7px; }
.cmp .na small{ display:block; font-size:11px; color:var(--ter); margin-top:5px; }
.cmp .idade{ font-variant-numeric:tabular-nums; font-weight:700; }
.cmp .idade.v{ color:var(--sec); }
.cmp .idade.m{ color:#E9C46A; }
.cmp .idade.l{ color:var(--or); }
.cmp .rel{ font-size:13px; }
.cmp .rel small{ display:block; font-size:11px; color:var(--ter); }
.cmp .rel .sem{ color:var(--ter); font-style:italic; }
.cmp .fl{ display:flex; align-items:center; flex-wrap:wrap; gap:0; row-gap:6px; }
.cmp .fl .p{ display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700; letter-spacing:.02em; border-radius:999px; padding:3px 8px; border:1px solid var(--linha2); color:var(--ter); white-space:nowrap; }
.cmp .fl .p.ok{ background:var(--okb); border-color:rgba(52,232,74,.35); color:#8FE89B; }
.cmp .fl .p.ok::before{ content:"✓"; font-size:10px; }
.cmp .fl .p.atual{ background:var(--texto); border-color:var(--texto); color:#0B0F0D; box-shadow:0 0 0 3px rgba(242,244,245,.12); }
.cmp .fl .p.falta{ border-style:dashed; }
.cmp .fl .ln{ width:10px; height:1px; background:var(--linha2); }
.cmp .fl .ln.ok{ background:rgba(52,232,74,.45); }
.cmp .det{ grid-column:1 / -1; display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:18px; padding:4px 0 8px; cursor:default; }
.cmp .det h4{ margin:0 0 8px; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--ter); font-weight:600; }
.cmp .det p{ margin:0 0 10px; color:var(--sec); }
.cmp .passos{ display:grid; gap:6px; }
.cmp .passo{ display:grid; grid-template-columns:56px minmax(0,1fr) auto; gap:10px; align-items:start; border:1px solid var(--linha); border-radius:12px; padding:8px 10px; }
.cmp .passo .ps{ font-weight:800; font-size:12px; }
.cmp .passo .pn{ font-size:12.5px; }
.cmp .passo .pn small{ display:block; color:var(--ter); font-size:11.5px; }
.cmp .passo .pr{ text-align:right; font-size:11.5px; color:var(--sec); white-space:nowrap; }
.cmp .passo.ok{ border-color:rgba(52,232,74,.28); }
.cmp .passo.ok .ps{ color:#8FE89B; }
.cmp .passo.atual{ border-color:var(--texto); }
.cmp .passo.falta{ border-style:dashed; opacity:.75; }
.cmp .tl{ list-style:none; margin:0; padding:0; border-left:1px solid var(--linha2); margin-left:4px; }
.cmp .tl li{ position:relative; padding:0 0 8px 14px; font-size:12px; color:var(--sec); }
.cmp .tl li::before{ content:""; position:absolute; left:-4px; top:5px; width:7px; height:7px; border-radius:50%; background:var(--sup3); border:1px solid var(--linha2); }
.cmp .tl li:last-child::before{ background:var(--texto); }
.cmp .tl li b{ color:var(--texto); font-weight:600; font-variant-numeric:tabular-nums; margin-right:6px; }
.cmp .lk{ color:var(--a); font-size:12.5px; text-decoration:none; }
.cmp .lk:hover{ text-decoration:underline; }
.cmp .mais{ display:block; width:100%; background:none; border:0; border-top:1px solid var(--linha); padding:14px; color:var(--sec); font-weight:600; cursor:pointer; }
.cmp .mais:hover{ color:var(--texto); }
.cmp .vazio{ padding:40px 16px; text-align:center; color:var(--ter); }
.cmp .quadro{ display:grid; grid-auto-flow:column; grid-auto-columns:minmax(270px, 1fr); gap:10px; overflow-x:auto; padding-bottom:10px; }
.cmp .qc{ background:var(--sup); border:1px solid var(--linha); border-radius:16px; display:flex; flex-direction:column; max-height:78vh; min-width:0; }
.cmp .qc > h3{ margin:0; padding:12px 14px; font-size:14px; display:flex; justify-content:space-between; gap:8px; border-bottom:1px solid var(--linha); }
.cmp .qc > h3 small{ color:var(--ter); font-weight:600; }
.cmp .qc .qs{ overflow:auto; padding:8px; display:grid; gap:6px; align-content:start; }
.cmp .card{ background:var(--sup2); border:1px solid var(--linha); border-radius:12px; padding:9px 10px; display:grid; gap:6px; cursor:pointer; }
.cmp .card:hover{ border-color:var(--linha2); }
.cmp .card .t{ display:flex; justify-content:space-between; gap:8px; align-items:center; }
.cmp .card b{ font-size:12.5px; font-weight:600; line-height:1.35; }
.cmp .card small{ font-size:11px; color:var(--ter); }
@media (max-width:1100px){.cmp .cab{ display:none; }
.cmp .lin{ grid-template-columns:76px repeat(3, minmax(0,1fr)); grid-template-areas:"le obj obj obj" "le aut tmw tmw" "le rel tmw tmw"; gap:10px 16px; padding:14px 16px; align-items:start; }
.cmp .lin > .le{ grid-area:le; }
.cmp .lin > .obj{ grid-area:obj; }
.cmp .lin > .aut{ grid-area:aut; } .cmp .lin > .tmw{ grid-area:tmw; } .cmp .lin > .rel{ grid-area:rel; }
.cmp .lin > .fl{ grid-area:fl; }
.cmp .lin > .dx{ grid-column:1 / -1; }
.cmp .lin > [data-r]{ font-size:12.5px; border-left:1px solid var(--linha); padding-left:10px; }
.cmp .lin > [data-r]::before{ content:attr(data-r); display:block; font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--ter); margin-bottom:3px; }
.cmp .det{ grid-template-columns:minmax(0,1fr); }
.cmp .kpi{ grid-template-columns:repeat(3, minmax(0,1fr)); }}
@media (max-width:700px){ .cmp .lin{ grid-template-columns:76px minmax(0,1fr); grid-template-areas:"le obj" "le aut" "le tmw" "le rel"; } .cmp .kpi{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
@media (prefers-reduced-motion:reduce){}`;
let CMP_D = null, CMP_R = null, CMP_C = null;   // CMP_C: composição das comissões (alesc-comissoes.json), para o quórum
const corpoPL = () => `<div class="rhb${S.fech.cmpB === false ? "" : " fech"}" id="cmpB"><h3 data-bk="cmpB">Comissões · proposições em tramitação<small id="cmpAt">proposições nas comissões permanentes · e-Legis</small></h3><div id="cmpC"><p class="rh-nt">Carregando…</p></div></div>`;
async function cmpAbrir() { const R = document.getElementById("cmpC"); if (!R || R.dataset.ok) return; R.dataset.ok = "1";
  if (!document.getElementById("cmpCss")) { const st = document.createElement("style"); st.id = "cmpCss"; st.textContent = CMP_CSS; document.head.appendChild(st); }
  const v = new Date().toISOString().slice(0, 10);
  try { if (!CMP_D) [CMP_D, CMP_R] = await Promise.all([fetch("../dados/painel/alesc-comissoes-tram.json?v=" + v).then((r) => r.json()), fetch("../dados/painel/alesc-comissoes-resumos.json?v=" + v).then((r) => r.ok ? r.json() : { R: {} }).catch(() => ({ R: {} }))]); if (!CMP_C) CMP_C = await fetch("../dados/painel/alesc-comissoes.json?v=" + v).then((r) => r.ok ? r.json() : null).catch(() => null); }
  catch (e) { R.innerHTML = `<p class="rh-nt">Não foi possível carregar as comissões.</p>`; delete R.dataset.ok; return; }
  R.innerHTML = `<div class="cmp">
  
  <div class="kpi" id="kpi"></div>
  <div class="st"><span>Por comissão · toque para filtrar</span><span class="stdir"><span id="stc"></span><span class="cvis" role="group" aria-label="Formato"><button data-cv="cartoes" class="on">Card</button><button data-cv="grade">Tempo</button><button data-cv="rank">Ranking</button></span></span></div>
  <div class="coms" id="coms"></div>
  <div class="lg" id="lgc"></div>
  <div class="bar" id="bar">
    <label class="busca ico" id="buscaL" title="Buscar"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3.5 3.5"/></svg><input id="q" placeholder="Buscar número, autor, relator ou assunto" aria-label="Buscar" autocomplete="off"></label>
    <label class="leq"><span class="lq" title="Tipo" aria-label="Tipo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2h6l3 3v9H4z M10 2v3h3 M6 8.5h5 M6 11h3.5"/></svg></span><select id="fTipo"></select></label>
    <label class="leq"><span class="lq" title="Tema" aria-label="Tema"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.3V2.5h5.8l5.7 5.7-5.8 5.8z"/><circle cx="5.4" cy="5.4" r="1"/></svg></span><select id="fTema" class="lw"></select></label>
    <label class="leq"><span class="lq" title="Relator" aria-label="Relator"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="5.5" r="2.6"/><path d="M3 14c.6-2.8 2.6-4.2 5-4.2s4.4 1.4 5 4.2"/></svg></span><select id="fRel" class="lw"></select></label>
    <label class="leq"><span class="lq" title="Autor" aria-label="Autor"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 2.9l2.5 2.5-7.6 7.6-3.1.6.6-3.1z M9.2 4.3l2.5 2.5"/></svg></span><select id="fAut" class="lw"></select></label>
    <label class="leq"><span class="lq" title="Na comissão há" aria-label="Na comissão há"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2h7 M4.5 14h7 M5.5 2c0 3.2 5 3.8 5 6s-5 2.8-5 6 M10.5 2c0 3.2-5 3.8-5 6s5 2.8 5 6"/></svg></span><select id="fIdade"><option value="">Qualquer tempo</option><option value="0">Até 30 dias</option><option value="1">31 a 90 dias</option><option value="2">Mais de 90 dias</option></select></label>
    <button class="futb" id="futB" aria-pressed="false" title="Mostrar, no fim da lista, as proposições já distribuídas para a comissão escolhida que ainda não chegaram nela"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/><path d="M13.5 2.5v3h-3"/></svg>Futuro</button>
    <button class="imp" id="impB" title="Imprimir o que está filtrado"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 6V2h8v4 M4 12H2.5V6.5h11V12H12 M4 10h8v4H4z"/></svg></button>
    <button class="limpa" id="limpa">Limpar filtros</button>
  </div>
  <div class="res" id="res"></div>
  <div id="vista"></div>
</div>`; cmpIniciar(CMP_D, R.querySelector(".cmp"), (CMP_R && CMP_R.R) || {}); }
function cmpIniciar(D, R, RES) {


const $ = (s) => R.querySelector(s), esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ni = (n) => (n || 0).toLocaleString("pt-BR"), br = (d) => d ? d.split("-").reverse().join("/") : "—";
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const F = { hm: "rel", vq: "", fx: null, hall: false, fut: false, flim: { p: 30, m: 30 }, cv: "cartoes", com: "", q: "", tipo: "", tema: "", rel: "", aut: "", idade: "", kpi: "", ord: ["casa", -1], vis: "lista", lim: 60, ab: null };
const HOJE = new Date().toISOString().slice(0, 10), dd = (a, b) => a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5)) : null;
D.L.forEach((x) => { x.casa = dd(x.prot, HOJE); });
// tema: o do resumo (1º nível) quando existe; senão o da classificação automática pela ementa
const temaDe = (x) => (RES[x.id] && RES[x.id].t && RES[x.id].t[0] && RES[x.id].t[0][0]) || x.tema;
const SIGN = new Map(D.coms.map(([c, s]) => [c, s])), sigDe = (nome) => { const n = String(nome || "").replace(/^Comiss[ãa]o (de |da |do |dos |das )?/i, ""); for (const [c, s] of SIGN) if (n.startsWith(c) || c.startsWith(n)) return s; return n; };
const faixa = (d) => d == null ? "" : d <= 30 ? "v" : d <= 90 ? "m" : "l";
const ETQ = {}; // tons de cinza por tipo (20/11/2026): do mais claro (PL) ao mais escuro
const TIPO_COR = { PL: ["#E6E8EA", "#0B0F0D"], PLC: ["#C9CDD1", "#0B0F0D"], PEC: ["#A9AEB3", "#0B0F0D"], PRS: ["#8A9096", "#fff"], PDL: ["#767C82", "#fff"], MSV: ["#5E646A", "#fff"], OF: ["#4A5056", "#fff"], REQ: ["#3F454B", "#fff"] };
const tipoCor = (t) => TIPO_COR[t] || ["#33393E", "#fff"];
const etq = (x, pe) => `<span class="cmeto${pe ? " pe" : ""}"><b style="background:${tipoCor(x.tipo)[0]};color:${tipoCor(x.tipo)[1]}">${esc(x.tipo)}</b><span>${esc(x.num)}/${esc(x.ano)}</span></span>`;
const fluxo = (x) => `<div class="fl">${x.fluxo.map((c, i) => `${i ? `<i class="ln${x.fluxo[i - 1].st === "ok" ? " ok" : ""}"></i>` : ""}<span class="p ${c.st}" title="${esc(c.n)}${c.st === "ok" ? " · aprovada" + (c.par ? " (" + c.par + ")" : "") : c.st === "atual" ? " · está aqui" : " · ainda vai"}">${esc(c.s)}</span>`).join("")}</div>`;
// filtros
const passa = (x, sem) => (!F.com || x.com === F.com || sem === "com") && (!F.tipo || x.tipo === F.tipo) && (!F.tema || temaDe(x) === F.tema) && (!F.rel || (F.rel === "(sem)" ? !x.rel : x.rel === F.rel)) && (!F.aut || x.autor === F.aut)
  && (F.idade === "" || faixa(x.dias) === ["v", "m", "l"][+F.idade]) && (!F.vq || (x.vista && ((x.vista.quem || "(?)") === F.vq))) && (!F.fx || (F.hm === "vis" ? (x.vista && dd(x.vista.d, HOJE) >= F.fx[0] && dd(x.vista.d, HOJE) <= F.fx[1]) : ((x.dias || 0) >= F.fx[0] && (x.dias || 0) <= F.fx[1]))) && (!F.kpi || (F.kpi === "sem" ? !x.rel : F.kpi === "com" ? !!x.rel : F.kpi === "velhas" ? x.dias > 90 : F.kpi === "vista" ? !!x.vista : F.kpi === "andou" ? x.fluxo.some((c) => c.st === "ok") : true))
  && (!F.q || norm([x.tipo, x.num + "/" + x.ano, x.autor, x.rel, x.vista ? "vista " + x.vista.quem : "", x.resumo, x.ementa, x.com, RES[x.id] ? RES[x.id].m + " " + (RES[x.id].t || []).flat().join(" ") : ""].join(" ")).includes(norm(F.q)));
const ORD = { num: (x) => +x.ano * 1e5 + +x.num, obj: (x) => norm(x.resumo), aut: (x) => norm(x.autor), com: (x) => norm(x.com), rel: (x) => norm(x.rel || "~"), dias: (x) => x.dias ?? -1, casa: (x) => x.casa ?? -1, fl: (x) => x.fluxo.filter((c) => c.st === "ok").length };
function kpis(L) { const sem = L.filter((x) => !x.rel).length, v = L.filter((x) => x.dias > 90).length, an = L.filter((x) => x.fluxo.some((c) => c.st === "ok")).length;
  const k = [["", "Em tramitação", L.length, "em " + new Set(L.map((x) => x.com)).size + " comissões"], ["com", "Com relator", L.length - sem, Math.round((L.length - sem) / Math.max(1, L.length) * 100) + "% do total"], ["sem", "Aguardando relator", sem, "sem relator designado"], ["velhas", "Há mais de 90 dias", v, "paradas na mesma comissão"], ["vista", "Em vista", L.filter((x) => x.vista).length, "pedido de vista aberto"], ["andou", "Já aprovadas em 1+", an, "comissão no caminho"]];
  $("#kpi").innerHTML = k.map(([id, t, n, s]) => `<button data-k="${id}" class="${F.kpi === id ? "on" : ""}"><span>${t}</span><b>${ni(n)}</b><small>${s}</small></button>`).join(""); }
// gráfico das comissões na ordem da composição (altura pela raiz da quantidade, para a CCJ não achatar as demais) (as 4 de 9 membros primeiro) e barras empilhadas pelo tempo na comissão (19/11/2026)
const ORD9 = ["CCJ", "CFT", "CTA", "CED"], ORD7 = ["CAG", "CAM", "CCA", "CPD", "CDPI", "CDH", "CEC", "CEd", "CDCon", "CPA", "CPCD", "CDC", "CRI", "CSa", "CSP", "CTI", "CTu", "CEL", "CBA", "CMA"];
const CURTO = { CCJ: "CCJ", CFT: "Finanças", CTA: "Trabalho", CED: "Ética", CAG: "Agricultura", CAM: "Assuntos Mun.", CCA: "Criança", CPD: "Deficiência", CDPI: "Idoso", CDH: "Dir. Humanos", CEC: "Economia", CEd: "Educação", CDCon: "Consumidor", CPA: "Pesca", CPCD: "Drogas", CDC: "Defesa Civil", CRI: "Rel. Inst.", CSa: "Saúde", CSP: "Segurança", CTI: "Transportes", CTu: "Turismo", CEL: "Esportes", CBA: "Animal", CMA: "Meio Ambiente" };
// mesmo desenho dos gráficos das Cotas (pcEmpilhada em gabinete-cotas.js): faixas da rampa azul-acinzentada, cheio = com relator,
// listrado = aguardando relator, traço escuro entre as partes, total em cima, grade tracejada. Eixo em raiz quadrada (marcado no eixo)
// para a CCJ, com quase 700, não achatar as demais.
const FX = [["até 90 dias", (d) => d <= 90, "#2F6DB5"], ["91 a 365 dias", (d) => d > 90 && d <= 365, "#6E9BD1"], ["mais de 365 dias", (d) => d > 365, "#BFD3EA"]];
// colunas de mesma altura (20/11/2026, pedido do usuário): um tubo arredondado com fundo fundo (como as barras do sistema de
// palpites) e o preenchimento subindo de baixo, nas cores das Cotas; o nível do preenchimento é a raiz da quantidade em relação
// à maior comissão (para as pequenas aparecerem), as partes dentro dele são proporcionais
// "Gráfico" (23/11/2026, 3ª versão, pedido do usuário): o que se quer ver é o VOLUME PARADO na comissão, segmentado
// por relator e por tempo. Forma escolhida pelo guia de gráficos: MAPA DE CALOR (grade), linhas = relator ("Aguardando
// relator" no topo), colunas = há quanto tempo está na comissão; cada célula = quantas proposições, cor de um só tom
// (mais forte = mais volume), com o número escrito. Vale para a comissão escolhida na faixa ou para todas. Tocar numa
// célula filtra a lista por aquele relator e aquela faixa; no nome, só o relator; no título da coluna, só a faixa.
const HX = [["até 30 dias", 0, 30], ["31 a 90", 31, 90], ["91 a 180", 91, 180], ["181 a 365", 181, 365], ["1 a 2 anos", 366, 730], ["mais de 2 anos", 731, 1e9]];
// vistas por semestre (23/11/2026): todos os pedidos de vista registrados no e-Legis (abertos e já devolvidos), por
// semestre em que foram pedidos; colunas no tempo, da esquerda (mais antigo) para a direita; valem a comissão e os filtros
function vistasPeriodo(base) { const C = new Map();
  base.forEach((x) => (x.vistas || []).forEach(([d, q]) => { const k = d.slice(0, 4) + "·" + (+d.slice(5, 7) <= 6 ? "1º sem" : "2º sem"), ab = x.vista && x.vista.d === d;
    const o = C.get(k) || { a: 0, f: 0 }; ab ? o.a++ : o.f++; C.set(k, o); }));
  const K = [...C.keys()].sort(), mx = Math.max(1, ...K.map((k) => C.get(k).a + C.get(k).f));
  if (!K.length) return "";
  return `<div class="vsm"><div class="vsm-h"><b>Pedidos de vista por semestre</b><span>quando foram pedidos · abertos e já devolvidos</span></div><div class="vsm-g">${K.map((k) => { const o = C.get(k), n = o.a + o.f;
    return `<div class="vsm-c" title="${k}: ${n} pedidos de vista (${o.a} ainda abertos, ${o.f} devolvidos)"><b>${ni(n)}</b><span class="vsm-b" style="height:${(n / mx * 100).toFixed(1)}%"><i class="ab" style="flex:${o.a}"></i><i style="flex:${o.f}"></i></span><small>${k}</small></div>`; }).join("")}</div>
    <div class="vsm-l"><span><i class="ab"></i>ainda aberto</span><span><i></i>já devolvido</span></div></div>`; }
// detalhe da comissão (23/11/2026): ao tocar no Card, além de filtrar a lista, abre um quadro com os números da comissão.
// Por ano: SÓ as proposições que ainda tramitam na Assembleia (o e-Legis não traz as já encerradas nestes dados); reuniões e
// relatorias vêm da agenda e das pautas da comissão desde 2023 (alesc-comissoes.json).
function detCom(c) { const sg = (D.coms.find((k) => k[0] === c) || [, c])[1], A = D.L.filter((x) => x.com === c), n = A.length;
  const K = ((CMP_C && CMP_C.comissoes) || []).find((k) => norm(k.nome).endsWith(norm(c)) || norm(k.nome).includes(norm(c))), M = membrosDe(c);
  const anos = ["2023", "2024", "2025", "2026"], ano = (d) => d ? (d.slice(0, 4) < "2023" ? "antes" : d.slice(0, 4)) : null, cont = () => ({ antes: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 });
  const ch = cont(), ap = cont(), pa = cont();
  D.L.forEach((x) => { (x.h || []).forEach(([s2, d]) => { if (s2 === sg && ano(d) in ch) ch[ano(d)]++; }); x.fluxo.forEach((f) => { if (f.s === sg && f.st === "ok" && f.concl && ano(f.concl) in ap) ap[ano(f.concl)]++; }); });
  A.forEach((x) => { const a = ano(x.chegou || x.entrou); if (a in pa) pa[a]++; });
  const reu = (K && K.reunioes && K.reunioes.por_ano) || {}, sem = A.filter((x) => !x.rel).length, vs = A.filter((x) => x.vista).length, md = n ? Math.round(A.reduce((t, x) => t + (x.dias || 0), 0) / n) : 0, ano1 = A.filter((x) => x.dias > 365).length;
  const tem = (o) => Object.values(o).some(Boolean), col = ["antes", ...anos], cab = col.map((a) => `<th>${a === "antes" ? "antes de 2023" : a}</th>`).join("");
  const lin = (t, o, sub) => `<tr><th>${t}${sub ? `<small>${sub}</small>` : ""}</th>${col.map((a) => `<td>${o[a] ? ni(o[a]) : "—"}</td>`).join("")}</tr>`;
  const abertas = {}; A.forEach((x) => { if (x.rel) abertas[x.rel] = (abertas[x.rel] || 0) + 1; });
  const rel = ((K && K.relatorias) || []).slice(0, 6);
  return `<div class="cdt"><div class="cdt-h"><div><b>${esc(sg)} · ${esc(c)}</b><span>${K ? `presidente ${esc(K.presidente || "—")} · vice ${esc(K.vice || "—")} · ${M.length} membros${K.partidos ? " · " + Object.entries(K.partidos).map(([p, q]) => p + (q > 1 ? " " + q : "")).join(", ") : ""}` : ""}</span></div><button class="cdt-x" data-c="${esc(c)}" title="Fechar e tirar o filtro">×</button></div>
    <div class="cdt-k"><div><b>${ni(n)}</b><span>em tramitação aqui agora</span></div><div><b>${ni(sem)}</b><span>aguardando relator</span></div><div><b>${ni(vs)}</b><span>em pedido de vista</span></div><div><b>${ni(md)}</b><span>dias na comissão (média)</span></div><div><b>${ni(ano1)}</b><span>há mais de 1 ano aqui</span></div></div>
    <div class="cdt-t"><table><thead><tr><th></th>${cab}</tr></thead><tbody>
      ${lin("Chegaram à comissão", ch, "das que ainda tramitam")}${lin("Aprovadas aqui", ap, "parecer votado na comissão")}${lin("Ainda paradas aqui", pa, "pelo ano em que chegaram")}${tem(reu) ? lin("Reuniões", { antes: 0, ...reu }, "agenda da comissão") : ""}</tbody></table></div>
    ${rel.length ? `<div class="cdt-r"><b>Quem mais relatou desde 2023</b>${rel.map((r) => `<span><em>${esc(r.deputado)}</em> ${ni(r.materias)} matérias${abertas[r.deputado] ? ` · ${abertas[r.deputado]} abertas agora` : ""}</span>`).join("")}</div>` : ""}
    <small class="cdt-n">Por ano: só as proposições que ainda tramitam na Assembleia; as já encerradas (lei, arquivadas, rejeitadas) não estão nestes dados. Uma proposição que voltou à comissão conta de novo em "chegaram".</small></div>`; }
// quadro relator × tempo para o fim do relatório (23/11/2026): mesma conta da visão Tempo, sobre as proposições impressas
function quadroDe(L) { const VIS = F.hm === "vis", B2 = VIS ? L.filter((x) => x.vista) : L, quem = (x) => VIS ? ((x.vista && x.vista.quem) || "(?)") : x.rel || "(sem)", dias = (x) => VIS ? dd(x.vista.d, HOJE) : x.dias;
  const ci = (d) => HX.findIndex(([, a, b]) => (d || 0) >= a && (d || 0) <= b), R = new Map();
  B2.forEach((x) => { const k = quem(x); if (!R.has(k)) R.set(k, Array(HX.length).fill(0)); R.get(k)[ci(dias(x))]++; });
  const tot = (v) => v.reduce((p, q) => p + q, 0), rows = [...R].sort((p, q) => (p[0] === "(sem)" ? -1 : q[0] === "(sem)" ? 1 : tot(q[1]) - tot(p[1])));
  return { VIS, HX: HX.map((h) => h[0]), rows: rows.map(([k, v]) => [k === "(sem)" ? "Aguardando relator" : k === "(?)" ? "Não identificado" : k, v, tot(v)]), col: HX.map((_, i) => tot(rows.map(([, v]) => v[i]))), n: B2.length }; }
const barraDe = (x) => { const { S, tot } = rito(x); return { S: S.map((e) => ({ k: e.k, d: e.d, s: e.s, t: e.t })), tot, mk: vistaMarcas(x, S, tot, 60), ini: x.lido ? "lido " + br(x.lido).slice(3) : br(x.prot).slice(3) }; };
function grade() {
  const base = D.L.filter((x) => (!F.com || x.com === F.com) && (!F.tipo || x.tipo === F.tipo) && (!F.tema || temaDe(x) === F.tema) && (!F.aut || x.autor === F.aut)
    && (!F.q || norm([x.tipo, x.num, x.ano, x.autor, x.rel, x.resumo, x.ementa].join(" ")).includes(norm(F.q))));
  // modo Vista (interruptor Relatoria | Vista): linhas = quem pediu vista, colunas = há quanto tempo a vista está aberta
  const VIS = F.hm === "vis", B2 = VIS ? base.filter((x) => x.vista) : base, quem = (x) => VIS ? ((x.vista && x.vista.quem) || "(?)") : x.rel || "(sem)", dias = (x) => VIS ? dd(x.vista.d, HOJE) : x.dias;
  const ci = (d) => HX.findIndex(([, a, b]) => (d || 0) >= a && (d || 0) <= b), R = new Map();
  B2.forEach((x) => { const k = quem(x); if (!R.has(k)) R.set(k, Array(HX.length).fill(0)); R.get(k)[ci(dias(x))]++; });
  const tot = (v) => v.reduce((p, q) => p + q, 0), L = [...R].sort((p, q) => (p[0] === "(sem)" ? -1 : q[0] === "(sem)" ? 1 : tot(q[1]) - tot(p[1])));
  const rot = (k) => k === "(sem)" ? "Aguardando relator" : k === "(?)" ? "Não identificado" : k, ativo = (k) => VIS ? F.vq === k : F.rel === k;
  const mx = Math.max(1, ...L.flatMap(([, v]) => v)), passo = (v) => !v ? 0 : v / mx > .5 ? 4 : v / mx > .25 ? 3 : v / mx > .1 ? 2 : 1;
  const ver = F.hall ? L : L.slice(0, 14), col = HX.map((_, i) => tot(L.map(([, v]) => v[i])));
  const sel = (k, i) => ativo(k) && F.fx && F.fx[0] === HX[i][1];
  const lin = ([k, v]) => `<div class="hm-r${k === "(sem)" ? " sem" : ""}${ativo(k) ? " on" : ""}"><button class="hm-n" data-hr="${esc(k)}" title="Filtrar a lista por ${esc(rot(k))}">${esc(rot(k))}</button>
      ${v.map((n, i) => `<button class="hm-c s${passo(n)}${sel(k, i) ? " on" : ""}" data-hc="${esc(k)}|${i}" title="${esc(rot(k))} · ${HX[i][0]} ${VIS ? "em vista" : "na comissão"}: ${n}"${n ? "" : " disabled"}>${n ? ni(n) : ""}</button>`).join("")}<span class="hm-t">${ni(tot(v))}</span></div>`;
  return `<div class="hm"><div class="hm-h"><div><b>${VIS ? "Pedidos de vista abertos por deputado e tempo em vista" : "Proposições paradas por relator e tempo na comissão"}</b><span>${ni(B2.length)} ${VIS ? "vistas abertas" : "proposições"} · toque numa célula para ver na lista</span></div><span class="hm-sw" role="group" aria-label="Ver por"><button data-hm="rel" class="${VIS ? "" : "on"}">Relatoria</button><button data-hm="vis" class="${VIS ? "on" : ""}">Vista</button></span><select class="hm-s" data-hcom aria-label="Comissão"><option value="">Todas as comissões</option>${D.coms.map(([c, sg]) => `<option value="${esc(c)}"${F.com === c ? " selected" : ""}>${esc(sg)} · ${esc(c)}</option>`).join("")}</select></div>
    <div class="hm-g"><div class="hm-r hm-cab"><span></span>${HX.map(([t, a], i) => `<button class="hm-x${F.fx && F.fx[0] === a ? " on" : ""}" data-hx="${i}">${t}</button>`).join("")}<span class="hm-t">total</span></div>
    ${ver.map(lin).join("")}
    <div class="hm-r hm-sum"><span class="hm-n">Total</span>${col.map((n) => `<span class="hm-t">${ni(n)}</span>`).join("")}<span class="hm-t">${ni(B2.length)}</span></div></div>
    ${VIS ? vistasPeriodo(base) : ""}
    ${L.length > 14 ? `<button class="hm-mais" data-hall>${F.hall ? "Mostrar só os 14 com mais proposições" : `Ver todos os ${L.length} ${VIS ? "deputados" : "relatores"}`}</button>` : ""}</div>`; }

// ranking (20/11/2026): relatores (designados, relataram, relatorias abertas, dias com a relatoria aberta), pedidos de vista abertos
// e autores, dentro da comissão escolhida (filtro do topo) ou em todas; mais ou menos; clicar no nome filtra a lista
const RKM = { rel: [["des", "designados"], ["fez", "relataram"], ["abe", "relatorias abertas"], ["dia", "dias com a relatoria aberta (média)"]], vis: [["n", "vistas abertas"], ["dia", "dias em vista (média)"]], aut: [["n", "em tramitação"], ["l", "há mais de 365 dias na comissão"], ["dia", "dias na Assembleia (média)"]] };
function ranking() { const B = D.L.filter((x) => passa(x, "com")), naCom = (c) => !F.com || c.n === F.com || c.n === (D.coms.find((k) => k[0] === F.com) || [])[0];
  F.rk = F.rk || { rel: "des", vis: "n", aut: "n", o: { rel: -1, vis: -1, aut: -1 }, tudo: {} };
  const soma = (M, k, campo, v = 1) => { const o = M.get(k) || { des: 0, fez: 0, abe: 0, dsum: 0, dn: 0, n: 0, l: 0, ids: new Set() }; o[campo] += v; M.set(k, o); return o; };
  const R1 = new Map(); B.forEach((x) => x.fluxo.forEach((c) => { if (!naCom(c)) return; const L = c.rels || (c.rel ? [[c.rel, c.dist, c.concl]] : []);
    L.forEach(([q, , fim], i) => { if (!q) return; soma(R1, q, "des"); if (fim && (i < L.length - 1 || c.st === "ok")) soma(R1, q, "fez"); });
    if (c.st === "atual" && c.rel) { const o = soma(R1, c.rel, "abe"); const d = dd(c.dist, HOJE); if (d != null) { o.dsum += d; o.dn++; } } }));
  const R2 = new Map(); B.forEach((x) => { if (!x.vista || (F.com && x.com !== F.com)) return; (x.vista.quem || "não informado").split(", ").forEach((q) => { const o = soma(R2, q, "n"); o.dsum += dd(x.vista.d, HOJE) || 0; o.dn++; }); });
  const R3 = new Map(); B.forEach((x) => { if (F.com && x.com !== F.com) return; const o = soma(R3, x.autor, "n"); if ((x.dias || 0) > 365) o.l++; o.dsum += x.casa || 0; o.dn++; });
  const val = (o, m) => m === "dia" ? (o.dn ? Math.round(o.dsum / o.dn) : 0) : o[m];
  const card = (k, tit, M, sub, fil) => { const m = F.rk[k], ord = F.rk.o[k], L = [...M].map(([n, o]) => [n, val(o, m), o]).filter((e) => e[1] > 0 || ord > 0).sort((a, b) => (a[1] - b[1]) * ord || a[0].localeCompare(b[0], "pt-BR"));
    const mx = Math.max(1, ...L.map((e) => e[1])), lim = F.rk.tudo[k] ? L.length : 10;
    return `<section class="rk"><div class="rkh"><b>${tit}</b><button data-rko="${k}" title="Inverter a ordem">${ord < 0 ? "mais ↓" : "menos ↑"}</button></div>
      <div class="rkm">${RKM[k].map(([id, r]) => `<button data-rkm="${k}|${id}" class="${m === id ? "on" : ""}">${r}</button>`).join("")}</div>
      ${L.length ? L.slice(0, lim).map(([n, v, o], i) => `<button class="rkl" data-rkf="${k}|${esc(n)}" title="${esc(sub(o))}"><span class="rkp">${i + 1}</span><span class="rkn">${esc(n)}<i style="width:${(v / mx * 100).toFixed(1)}%"></i></span><b>${ni(v)}</b></button>`).join("") : `<p class="rkv">Nada com estes filtros.</p>`}
      ${L.length > 10 ? `<button class="rkt" data-rkt="${k}">${F.rk.tudo[k] ? "mostrar só os 10 primeiros" : `ver todos os ${L.length}`}</button>` : ""}</section>`; };
  return `<div class="rkw"><p class="rkc">${F.com ? `Na comissão de <b>${esc(F.com)}</b>` : "Em todas as comissões"} · com os filtros da lista</p><div class="rkg">
    ${card("rel", "Relatores", R1, (o) => `${o.des} designações · ${o.fez} relatadas · ${o.abe} abertas${o.dn ? " · " + Math.round(o.dsum / o.dn) + " dias em média" : ""}`)}
    ${card("vis", "Pedidos de vista abertos", R2, (o) => `${o.n} em vista · ${o.dn ? Math.round(o.dsum / o.dn) : 0} dias em média`)}
    ${card("aut", "Autores", R3, (o) => `${o.n} em tramitação · ${o.l} há mais de 365 dias na comissão · ${o.dn ? Math.round(o.dsum / o.dn) : 0} dias na Assembleia em média`)}</div></div>`; }
function comissoes() { if (F.cv === "rank") { $("#coms").innerHTML = ranking(); $("#coms").className = ""; $("#lgc").className = "lg"; $("#lgc").innerHTML = ""; $("#stc").textContent = F.com ? "filtrando: " + F.com : ""; return; }
  if (F.cv === "grade") { $("#coms").innerHTML = grade(); $("#coms").className = ""; $("#lgc").className = "pclg"; $("#lgc").innerHTML = `<span>menos</span>${[1, 2, 3, 4].map((k) => `<span><i class="hm-k s${k}"></i></span>`).join("")}<span>mais volume</span>`; $("#stc").textContent = F.com ? "filtrando: " + F.com : ""; return; }
  $("#coms").className = "coms"; $("#lgc").className = "lg"; $("#lgc").innerHTML = `<span><i style="background:#5B83F0"></i>com relator</span><span><i style="background:#3A4045"></i>aguardando relator</span><span><i style="background:#E8822A"></i>há mais de 90 dias na comissão</span>`; const B = D.L.filter((x) => passa(x, "com")), mx = Math.max(1, ...D.coms.map(([c]) => B.filter((x) => x.com === c).length));
  $("#coms").innerHTML = D.coms.map(([c, s]) => { const A = B.filter((x) => x.com === c), n = A.length, cr = A.filter((x) => x.rel).length, v = A.filter((x) => x.dias > 90).length, md = n ? Math.round(A.reduce((t, x) => t + (x.dias || 0), 0) / n) : 0;
    return `<button class="com${F.com === c ? " on" : ""}" data-c="${esc(c)}" title="${esc(c)}"><span class="cs"><b>${esc(s)}</b><em>${ni(n)}</em></span><span class="cn">${esc(c)}</span><span class="cbar" style="width:${Math.max(6, n / mx * 100)}%"><i style="flex:${cr - Math.min(cr, v)};background:#5B83F0"></i><i style="flex:${n - cr - Math.max(0, v - cr)};background:#3A4045"></i><i style="flex:${v};background:#E8822A"></i></span><span class="cmd">${n ? `média de ${md} dias na comissão` : "nada com estes filtros"}</span></button>`; }).join("");
  if (F.com) $("#coms").insertAdjacentHTML("afterbegin", detCom(F.com));
  $("#stc").textContent = F.com ? "filtrando: " + F.com : ""; }
function opcoes() { const S = (id, vals, t) => { const el = $(id), v = el.value; el.innerHTML = `<option value="">${t}</option>` + vals.map(([k, r]) => `<option value="${esc(k)}">${esc(r)}</option>`).join(""); el.value = v; };
  const cont = (f) => { const M = new Map(); D.L.forEach((x) => { const k = f(x); if (k) M.set(k, (M.get(k) || 0) + 1); }); return [...M].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, `${k} (${n})`]); };
  S("#fTipo", cont((x) => x.tipo), "Todos"); S("#fTema", cont(temaDe), "Todos"); S("#fRel", [["(sem)", "Sem relator (" + D.L.filter((x) => !x.rel).length + ")"], ...cont((x) => x.rel).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))], "Todos"); S("#fAut", cont((x) => x.autor).sort((a, b) => a[0].localeCompare(b[0], "pt-BR")), "Todos"); }
// ---------- detalhe (mesmo padrão do item do Controle de Recursos) ----------
const P = { ok: '<path d="M3.5 8.5l3 3 6-7"/>', rel: '<circle cx="8" cy="5.5" r="2.6"/><path d="M3 14c.6-2.8 2.6-4.2 5-4.2s4.4 1.4 5 4.2"/>', cal: '<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11 M5.5 2v3 M10.5 2v3"/>',
  din: '<circle cx="8" cy="8" r="5.5"/><path d="M9.8 6.2C9.5 5.5 8.8 5.2 8 5.2c-1.1 0-1.9.6-1.9 1.4 0 1.9 3.8.9 3.8 2.8 0 .8-.8 1.4-1.9 1.4-.9 0-1.6-.4-1.9-1.1 M8 4v1.2 M8 10.8V12"/>', lista: '<path d="M6 4h8 M6 8h8 M6 12h8 M2.5 4h.5 M2.5 8h.5 M2.5 12h.5"/>',
  mais: '<path d="M8 3v10 M3 8h10"/>', proib: '<circle cx="8" cy="8" r="5.5"/><path d="M4.2 11.8l7.6-7.6"/>', lei: '<path d="M8 2v12 M3 5h10 M3 5l-2 5h4z M13 5l-2 5h4z M5 14h6"/>', seta: '<path d="M6 3l5 5-5 5"/>',
  ext: '<path d="M9 3h4v4 M13 3L7 9 M11 9.5V13H3V5h3.5"/>', doc: '<path d="M4 2h6l3 3v9H4z M10 2v3h3 M6 8h5 M6 11h5"/>', elo: '<path d="M7 9a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.8.8 M9 7a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.8-.8"/>',
  bal: '<path d="M3 3h10v7H7l-3 3v-3H3z"/>', impr: '<path d="M4 6V2h8v4 M4 12H2.5V6.5h11V12H12 M4 10h8v4H4z"/>', relog: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2 1.3"/>', menos: '<path d="M3 8h10"/>',
  troca: '<path d="M3 5.5h9l-2.5-2.5 M13 10.5H4l2.5 2.5"/>', band: '<path d="M4 14V2.5 M4 3h8l-1.5 3L12 9H4"/>', entra: '<path d="M2.5 8h8 M7.5 5l3 3-3 3 M11 3h2.5v10H11"/>', olho: '<path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/>', lupa: '<circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2l3.3 3.3"/>', req: '<path d="M4 2h6l3 3v9H4z M10 2v3h3 M6 10l1.5 1.5L11 8"/>', jornal: '<path d="M2.5 3.5h9v9h-9z M11.5 6h2v6.5h-11 M4.5 6h5 M4.5 8.5h5 M4.5 11h3"/>', fecha: '<path d="M4 6l4 4 4-4"/>' };
const ic = (k) => `<svg viewBox="0 0 16 16" class="i">${P[k] || P.doc}</svg>`;
const EL = "https://portalelegis.alesc.sc.gov.br";
const situacao = (x) => /emenda/i.test(x.sit) ? `Análise de emenda na ${x.csig}` : x.vista ? `Em vista · ${x.vista.quem || "deputado"} · ${x.csig}` : /vista/i.test(x.sit) ? `Pedido de vista na ${x.csig}` : /dilig/i.test(x.sit) ? `Em diligência · ${x.csig}` : x.rel ? `Aguardando parecer na ${x.csig}` : `Aguardando relator na ${x.csig}`;
const iniciais = (n) => String(n || "").split(/\s+/).filter((s) => s.length > 2 || /^[A-Z]/.test(s)).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
function anel(x) { const d = x.dias || 0, q = Math.min(1, d / 365), c = 2 * Math.PI * 34, cor = d > 90 ? "#5E666D" : "#9AA1A7";
  return `<div class="anel"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="#DEE2E5" stroke-width="7"/><circle cx="42" cy="42" r="34" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(q * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>${d > 90 ? `<circle cx="42" cy="42" r="34" fill="none" stroke="#E8A23A" stroke-width="7" stroke-dasharray="1.5 ${c.toFixed(1)}" stroke-dashoffset="${(-(90 / 365) * c).toFixed(1)}" transform="rotate(-90 42 42)"/>` : ""}<text x="42" y="45" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${d}</text><text x="42" y="58" text-anchor="middle" font-size="9" fill="#8C939A">dias</text></svg><small>na comissão atual${d > 90 ? "<br>passou de 90" : ""}</small></div>`; }
function passos(x) { const n = x.fluxo.length, at = Math.max(0, x.fluxo.findIndex((c) => c.st === "atual"));
  return `<div class="stp" style="--n:${n};--f:${n > 1 ? at / (n - 1) : 0}">${x.fluxo.map((c) => `<div class="sp ${c.st}" title="${esc(c.n)}"><span class="sd">${c.st === "ok" ? ic("ok") : c.st === "atual" ? ic("relog") : ""}</span><b>${esc(c.s)}</b><small>${c.st === "ok" ? "aprovou" + (c.concl ? " · " + br(c.concl).slice(0, 6) + br(c.concl).slice(8) : "") : c.st === "atual" ? (c.volta ? "voltou · " : "agora · ") + (x.dias ?? "—") + " dias" : "a passar"}</small></div>`).join("")}</div>`; }
// tempo por etapa: protocolo → 1ª comissão (leitura e despacho), cada comissão concluída, intervalo, comissão atual
// o rito da proposição em trechos de tempo (20/11/2026): leitura (do protocolo até chegar à 1ª comissão, com a data em que foi lida),
// cada comissão concluída, intervalo entre comissões, a comissão atual e, dentro dela, o pedido de vista aberto; depois, as que faltam
// com o histórico inteiro (x.h, desde 20/11/2026): cada trecho real — leitura, comissões (incluindo o tempo com o relator), arquivamento,
// coordenadorias — até a comissão atual, onde entra a vista
function ritoH(x) { const H = x.h, S = [], nomeC = (s) => (D.coms.find((c) => c[1] === s) || [s])[0];
  H.forEach(([lab, ini], i) => { const fim = H[i + 1] ? H[i + 1][1] : HOJE, d = dd(ini, fim) || 0, ult = i === H.length - 1;
    if (lab === "out") S.push(i === 0 ? { k: "lei", d, s: "Leitura", a: ini, b: fim, t: `Protocolo ${br(x.prot)}${x.lido ? " · lido no Expediente em " + br(x.lido) : ""} · até ${br(fim)}` } : { k: "ps", d, s: "", a: ini, b: fim, t: `Expediente e coordenadorias: ${br(ini)} a ${br(fim)}` });
    else if (lab === "arq") S.push({ k: "arq", d, s: "arquivada", a: ini, b: fim, t: `Arquivada (fim de legislatura): ${br(ini)} a ${br(fim)} · desarquivada depois` });
    else if (ult && lab === x.csig) { const dv = x.vista ? Math.min(d, dd(x.vista.d, HOJE) || 0) : 0;
      S.push({ k: "atual", d: d - dv, s: lab, a: ini, b: x.vista ? x.vista.d : HOJE, t: `${x.com}: desde ${br(ini)} (${ni(d)} dias)${x.rel ? " · relator " + x.rel : " · aguardando relator"}` });
      if (dv) S.push({ k: "vs", d: dv, s: "vista", a: x.vista.d, b: HOJE, t: `Pedido de vista · ${x.vista.quem || "deputado"} · desde ${br(x.vista.d)} (${ni(dv)} dias)${x.vista.re ? " · " + x.vista.re : ""}` }); }
    else S.push({ k: "ok", d, s: lab, a: ini, b: fim, t: `${nomeC(lab)}: ${br(ini)} a ${br(fim)} (${ni(d)} dias)` }); });
  const at0 = x.fluxo.findIndex((c) => c.st === "atual"), falta = x.fluxo.filter((c, i) => c.st === "falta" && i > at0);
  return { S: S.filter((e) => e.d > 0 || e.k === "atual"), falta, tot: S.reduce((s, e) => s + e.d, 0) || 1 }; }
function rito(x) { if (x.h && x.h.length && x.h[x.h.length - 1][0] === x.csig) return ritoH(x); const S = [], ok = x.fluxo.filter((c) => c.st === "ok" && c.concl).sort((a, b) => a.concl < b.concl ? -1 : 1); let cur = x.prot;
  const ini = [x.entrou, ok[0] && ok[0].dist, x.chegou].filter(Boolean).sort()[0];
  // leitura: do protocolo até a leitura no Expediente (ou até a 1ª comissão, quando é curto); período longo sem nenhum registro no
  // e-Legis (proposições antigas, anteriores ao sistema) aparece à parte, como "sem registro"
  if (ini && dd(cur, ini)) { const fimL = x.lido && x.lido <= ini ? (dd(x.lido, ini) > 45 ? x.lido : ini) : dd(cur, ini) <= 150 ? ini : null;
    if (fimL && dd(cur, fimL)) S.push({ k: "lei", d: dd(cur, fimL), s: "Leitura", a: cur, b: fimL, t: `Protocolo ${br(x.prot)}${x.lido ? ` · lido no Expediente em ${br(x.lido)}` : ""}` });
    const de = fimL || cur; if (dd(de, ini) > 0) S.push({ k: "sem", d: dd(de, ini), s: fimL ? "" : "sem registro", a: de, b: ini, t: fimL ? `Do Expediente à 1ª comissão: ${br(de)} a ${br(ini)}` : `Protocolo ${br(x.prot)} · sem registro de tramitação no e-Legis até ${br(ini)}` }); }
  if (ini && ini > cur) cur = ini;
  ok.forEach((c) => { const n = dd(cur, c.concl); if (n) S.push({ k: "ok", d: n, s: c.s, a: cur, b: c.concl, t: `${c.n}: ${br(cur)} a ${br(c.concl)}${c.rel ? " · relator " + c.rel : ""}${c.par ? " · " + c.par : ""}` }); if (c.concl > cur) cur = c.concl; });
  if (x.chegou && x.chegou > cur && dd(cur, x.chegou) > 2) { S.push({ k: "ps", d: dd(cur, x.chegou), s: "", a: cur, b: x.chegou, t: `Nas comissões e em outros setores (diligências, retornos, redistribuições): ${br(cur)} a ${br(x.chegou)}` }); cur = x.chegou; }
  const dv = x.vista ? Math.min(x.dias || 0, dd(x.vista.d, HOJE) || 0) : 0, at = (x.dias || 0) - dv;
  S.push({ k: "atual", d: at, s: x.csig, a: x.chegou, b: x.vista ? x.vista.d : HOJE, t: `${x.com}: desde ${br(x.chegou)} (${ni(x.dias)} dias)${x.rel ? " · relator " + x.rel : " · aguardando relator"}` });
  if (dv) S.push({ k: "vs", d: dv, s: "vista", a: x.vista.d, b: HOJE, t: `Pedido de vista · ${x.vista.quem || "deputado"} · desde ${br(x.vista.d)} (${ni(dv)} dias)${x.vista.re ? " · " + x.vista.re : ""}` });
  const at0 = x.fluxo.findIndex((c) => c.st === "atual"), falta = x.fluxo.filter((c, i) => c.st === "falta" && i > at0);
  return { S, falta, tot: S.reduce((s, e) => s + e.d, 0) || 1 }; }
// vistas em amarelo na barra (23/11/2026): a vista aberta já é o trecho amarelo no fim; as anteriores viram uma marca amarela no
// ponto da barra em que foram pedidas (mesmo peso de cada trecho que a barra usa)
function vistaMarcas(x, S, tot, div) { const W = S.map((e) => Math.max(e.d, tot / div)), SW = W.reduce((a, b) => a + b, 0) || 1, out = [];
  (x.vistas || []).forEach(([d, q]) => { if (!d || (x.vista && d === x.vista.d)) return; let acc = 0;
    for (let i = 0; i < S.length; i++) { const e = S[i]; if (e.a && e.b && d >= e.a && d <= e.b) { out.push({ p: (acc + W[i] * Math.min(1, (dd(e.a, d) || 0) / Math.max(1, e.d))) / SW * 100, t: `Pedido de vista · ${q || "deputado"} · ${br(d)}` }); return; } acc += W[i]; } });
  return out; }
const marcasHtml = (M) => M.map((m) => `<b class="vk" style="left:${m.p.toFixed(1)}%" title="${esc(m.t)}"></b>`).join("");
function tempo(x) { const { S, tot } = rito(x), mk = marcasHtml(vistaMarcas(x, S, tot, 80)), cl = { lei: "ex", sem: "sm", arq: "aq", ok: "ok", ps: "ps", atual: "atual", vs: "vs" };
  return `<div class="gt"><div class="gth"><span>Tempo de tramitação por etapa</span><b>${ni(x.casa)} dias na Assembleia</b></div><div class="gtb">${mk}${S.map((e) => `<i class="${cl[e.k]}" style="flex:${Math.max(e.d, tot / 80)}" title="${esc(e.t)}">${e.d / tot > .14 ? esc(e.k === "vs" ? "Vista · " + (x.vista.quem || "") : e.s) + " · " + e.d + "d" : e.d / tot > .05 ? e.d + "d" : ""}</i>`).join("")}</div><div class="gtl"><span>${x.lido ? "lido " + br(x.lido) : "protocolo " + br(x.prot)}</span><span>hoje · ${br(HOJE)}</span></div></div>`; }
const tile = (k, r, v, s, c) => `<div class="tl2"><span class="tk">${ic(k)}${r}</span><span class="tv ${c || ""}">${v}${s ? `<small>${s}</small>` : ""}</span></div>`;
function dispositivos(Z) { const d = Z && Z.disp; if (!d) return "";   // só quantos são (23/11/2026)
  return `<div class="tl2"><span class="tk">${ic("lista")}Dispositivos</span><span class="tv">${d.art} ${d.art === 1 ? "artigo" : "artigos"}${d.txt ? `<small>${esc(String(d.txt).replace(/^\d+ artigos? · /, ""))}</small>` : ""}</span></div>`; }
// relator e quórum (23/11/2026): relator da comissão atual e, para cada votação de parecer registrada no e-Legis, os
// membros da comissão (alesc-comissoes.json) em bolinhas, com os votos contrários em vermelho. O e-Legis não informa
// quantos estavam presentes; "por unanimidade" = todos os presentes a favor.
function membrosDe(nome) { const C = (CMP_C && CMP_C.comissoes) || [], n = norm(nome), k = C.find((c) => norm(c.nome).endsWith(n) || norm(c.nome).includes(n));
  return k ? [...new Set([k.presidente, k.vice, ...(k.membros || [])].filter(Boolean))] : []; }
function votacoes(x) { const V = [];
  x.tram.forEach(([d, sit, para, obs]) => { if (!/Parecer|Relat[óo]rio/i.test(sit) || !/unanim|maioria/i.test(obs || "")) return;
    const contra = ((obs.match(/votos? contr[áa]rios? d[oa]s? (.+)$/i) || [])[1] || "").split(/,|\s+e\s+/).map((q) => q.replace(/^\s*(Dep\.|Deputad[oa]s?)\s*/i, "").replace(/[.;]\s*$/, "").trim()).filter(Boolean);
    V.push({ d, com: String(para || "").replace(/^Comiss[ãa]o (de |da |do |dos |das )?/i, ""), sig: sigDe(para), ok: !/rejeitad/i.test(sit + " " + obs), un: /unanim/i.test(obs), contra, txt: sit.replace(/\s+/g, " ") }); });
  return V.sort((a, b) => a.d < b.d ? -1 : 1); }
function assentos(M, contra, cl) { const nc = contra.map(norm), L = M.length ? M : contra;
  return `<span class="qrm">${L.map((m) => `<i class="${nc.some((c) => norm(m).includes(c) || c.includes(norm(m))) ? "ct" : cl}" title="${esc(m)}"></i>`).join("")}${M.length ? "" : ""}</span>`; }
function votacao(x) { const V = votacoes(x), Ma = membrosDe(x.com);
  const rel = `<div class="qrl"><span class="qri">${ic("rel")}</span><span><b>${x.rel ? esc(x.rel) : "Relator a designar"}</b><small>${x.rel ? "relator na " + esc(x.csig) + (x.relDist ? " desde " + br(x.relDist) : "") : "há " + (x.dias ?? "—") + " dias na " + esc(x.csig) + " sem relator"}</small></span></div>`;
  const agora = V.some((v) => v.sig === x.csig) ? "" : `<div class="qrv"><div class="qrh"><b>${esc(x.csig)}</b><span>aguardando votação${Ma.length ? " · " + Ma.length + " membros" : ""}</span></div>${assentos(Ma, [], "es")}</div>`;
  const feitas = V.map((v) => { const M = membrosDe(v.com), nf = M.length ? M.length - v.contra.length : null;
    return `<div class="qrv"><div class="qrh"><b>${esc(v.sig)}</b><span>${br(v.d)} · ${v.ok ? "aprovado" : "rejeitado"} ${v.un ? "por unanimidade" : "por maioria"}</span></div>${assentos(M, v.contra, v.ok ? "fv" : "es")}
      <div class="qrn">${M.length ? `<span>${M.length} membros</span>` : ""}<span class="c">${!v.un && !v.contra.length ? "contrários não identificados no e-Legis" : v.contra.length + " " + (v.contra.length === 1 ? "contrário" : "contrários") + (v.contra.length ? ": " + esc(v.contra.join(", ")) : "")}</span><span class="f">${v.un ? "favoráveis: todos os presentes" : "demais presentes a favor"}</span><span>presentes: não informado</span></div></div>`; }).join("");
  return `<div class="tl2 w4"><span class="tk">${ic("rel")}Relator e votação</span>${rel}${agora}${feitas || (agora ? "" : "")}${!V.length ? `<small class="qr0">Nenhuma votação de parecer registrada ainda.</small>` : ""}</div>`; }
const SIT = [[/Lido no Expediente/i, "Lido no Expediente"], [/Publicado no Di[áa]rio/i, "Publicado no Diário"], [/Aguardando aprecia[çc][ãa]o pela Comiss[ãa]o/i, "@chegou"], [/Aguardando An[áa]lise de Emenda/i, "Volta para análise de emenda"],
  [/^Vista ao/i, "@vista"], [/devolv.*vista|vista.*devolv|Pedido de vista resolvido/i, "Vista devolvida"], [/Voto vista/i, null], [/Dilig[êe]ncia solicitad|Em Dilig/i, "Diligência pedida"], [/Respondida a Dilig/i, "Diligência respondida"], [/apensad|tramita[çc][ãa]o conjunta/i, "Tramitação conjunta"], [/Requerimento.*APROVADO/i, "Requerimento aprovado"], [/Parecer/i, null], [/Devolvid/i, "Devolvido"]];
function eventos(x) { const E = [{ d: x.prot, t: "Protocolado", s: x.autor }];
  x.tram.forEach(([d, s, para, obs]) => { const m = SIT.find(([re]) => re.test(s)); if (!m) return; const t = m[1] === "@chegou" ? `Chegou à ${sigDe(para)}` : m[1] === "@vista" ? "Pedido de vista" : m[1] || s;
    const q = obs && (obs.match(/Vistas? (?:ao|à|aos|às)s? (?:Deputad[oa]s?|Dep\.?)\s+(.+?)(?:,|\s+solicitad|$)/i) || [])[1];
    E.push({ d, t: m[1] === "@vista" && q ? `Pedido de vista · ${q}` : t, s: m[1] === "@chegou" ? para : m[1] === "@vista" ? ((obs || "").match(/\d+ª reuni[ãa]o[^,]*/i) || [para])[0] : obs && obs.length < 140 ? obs : para || "", vs: m[1] === "@vista" }); });
  x.fluxo.forEach((c) => { if (c.dist) E.push({ d: c.dist, t: `Relator na ${c.s}`, s: c.rel || "" }); if (c.st === "ok" && c.concl) E.push({ d: c.concl, t: `${c.s} conclui`, s: c.par ? "parecer " + c.par.toLowerCase() : "" }); });
  const vis = new Set(), ORDT = (t) => /conclui|Parecer|Requerimento/i.test(t) ? 0 : /^Chegou/.test(t) ? 2 : 1, U = E.filter((e) => e.d).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : ORDT(a.t) - ORDT(b.t)).filter((e) => { const k = e.d + e.t; if (vis.has(k)) return false; vis.add(k); return true; });
  let nv = 0; U.forEach((e) => { if (/^Chegou à/.test(e.t)) nv++; e.nv = nv; e.k = tlIcone(e.t); });   // nível = em qual comissão está (sobe um degrau a cada chegada)
  const L = U.length > 9 ? [U[0], { nota: 1, t: `${U.length - 8} passos antes`, s: "ver todos no e-Legis", nv: U[U.length - 7].nv, k: "lista" }, ...U.slice(-7)] : U;
  const prox = !x.rel ? `Relator na ${x.csig}` : x.vista || /vista/i.test(x.sit) ? `Devolução da vista${x.vista && x.vista.quem ? " · " + x.vista.quem : ""}` : `Parecer da ${x.csig}`;
  return [...L.map((e, i) => ({ ...e, cl: e.nota ? "on nt" : i === L.length - 1 ? "cur" + (e.vs ? " vs" : "") : "on" + (e.vs ? " vs" : "") })), { t: prox, s: "próximo passo", cl: "pd", nv: (L[L.length - 1] || {}).nv || 0, k: /^Relator/.test(prox) ? "rel" : /vista/i.test(prox) ? "olho" : "relog" }]; }
// ícone padrão por tipo de passo da linha do tempo
function tlIcone(t) { return /^Protocolado/.test(t) ? "doc" : /^Chegou/.test(t) ? "entra" : /^Relator/.test(t) ? "rel" : /vista/i.test(t) ? "olho" : /Dilig/i.test(t) ? "lupa" : /conclui|Parecer/i.test(t) ? "ok" : /Requerimento/i.test(t) ? "req" : /conjunta/i.test(t) ? "elo" : /Devolvid|Volta/i.test(t) ? "troca" : /Lido|Publicado/i.test(t) ? "jornal" : "seta"; }
function linhaTempo(x) { const E = eventos(x);
  return `<div class="tlq"><div class="tlh"><span>Linha do tempo</span><b>${esc(situacao(x))}</b></div>${E.map((e, i) => `<div class="tlr ${e.cl}${i && (e.nv || 0) > (E[i - 1].nv || 0) ? " sobe" : ""}" style="--nv:${Math.min(6, e.nv || 0)}"><span class="tld">${e.d ? br(e.d).slice(0, 6) + br(e.d).slice(8) : ""}</span><div class="tlv"><span class="tli">${ic(e.k || "seta")}</span>${i < E.length - 1 ? "<s></s>" : ""}</div><div class="tlc"><b>${esc(e.t)}</b>${e.s ? `<span>${esc(e.s)}</span>` : ""}</div></div>`).join("")}</div>`; }
function relacionadas(x, Z) { const A = [[EL + "/proposicoes/" + x.id, "elo", "Página no e-Legis", "tramitação, documentos e emendas"]];
  ((Z && Z.d) || []).forEach(([doc, tipo, nome, d]) => A.push([EL + "/documentos/" + doc, "doc", tipo || "Documento", [nome, d ? br(d) : ""].filter(Boolean).join(" · ")]));
  ((Z && Z.rel) || []).forEach(([t, s]) => A.push(["", /PL|PEC|PLC/.test(t) ? "entra" : "lei", t, s]));
  return `<div class="rel2">${A.map(([u, k, t, s]) => `<${u ? `a href="${esc(u)}" target="_blank" rel="noopener"` : "div"} class="rc"><span class="ic">${ic(k)}</span><span><b>${esc(t)}</b>${s ? `<small>${esc(s)}</small>` : ""}</span><span class="go">${u ? ic("ext") : ""}</span></${u ? "a" : "div"}>`).join("")}</div>`; }
function detalhe(x) { const Z = RES[x.id] || null, c = x.fluxo.find((f) => f.st === "atual") || {};
  const alerta = (Z && Z.alerta) || (x.dias > 365 ? `Está há ${ni(x.dias)} dias na ${x.com}.` : "");
  const MI = { "+": ["mais", "v"], "-": ["menos", ""], "x": ["proib", "no"], "ok": ["ok", "ok"], "~": ["troca", ""], "$": ["din", "v"], "t": ["relog", ""], "p": ["band", ""] };
  return `<div class="dx" onclick="event.stopPropagation()">
  <div class="dh"><div><div class="dst"><i></i>${esc(situacao(x))}</div><div class="dsub"><a href="${EL}/proposicoes/${esc(x.id)}" target="_blank" rel="noopener">${esc(x.tipo)} ${esc(x.num)}/${esc(x.ano)} ${ic("ext")}</a><span>${esc(x.autor)}</span></div></div>
    <div class="dac"><button data-ficha="${esc(x.id)}" title="Imprimir a ficha">${ic("impr")}</button><button data-fecha title="Fechar (Esc)">${ic("fecha")}</button></div></div>
  <div class="mch"><div><h2>${esc(Z ? Z.m : x.resumo)}</h2><p>${esc(Z ? Z.f : x.ementa)}</p>${Z && Z.t ? `<div class="tms">${Z.t.map((q) => `<span class="tm"><span>${esc(q[0])}</span>${q[1] ? `<span>${esc(q.slice(1).filter(Boolean).join(" › "))}</span>` : ""}</span>`).join("")}</div>` : ""}</div>${anel(x)}</div>
  ${x.vista ? `<div class="vbox">${ic("relog")}<span><b>Pedido de vista${x.vista.quem ? " · " + esc(x.vista.quem) : ""}</b> desde ${br(x.vista.d)} (${ni(dd(x.vista.d, HOJE))} dias)${x.vista.re ? " · " + esc(x.vista.re) : ""}</span></div>` : ""}
  ${(x.vistas || []).length > (x.vista ? 1 : 0) ? `<div class="aviso" style="margin-top:6px">Vistas anteriores: ${(x.vistas || []).slice(0, x.vista ? -1 : undefined).map(([d, q]) => `${esc(q || "deputado")} (${br(d)})`).join(" · ")}</div>` : ""}
  ${alerta ? `<div class="alerta">${ic("relog")}${esc(alerta)}</div>` : ""}
  ${passos(x)}${tempo(x)}
  <div class="bnt">${tile("din", "Impacto fiscal", Z && Z.fis ? esc(Z.fis[0]) : "—", Z && Z.fis ? esc(Z.fis[1] || "") : "a ler no projeto", Z && Z.fis && /^(nenhum|R\$ 0)/i.test(Z.fis[0]) ? "ok0" : "")}
    ${tile("lei", Z && Z.lei ? Z.lei[2] || "Norma alterada" : "Norma", Z && Z.lei ? esc(Z.lei[0]) : "—", Z && Z.lei ? esc(Z.lei[1] || "") : "")}
    ${tile("cal", "Protocolo", br(x.prot), `há ${ni(x.casa)} dias na Assembleia`)}
    ${dispositivos(Z) || tile("lista", "Dispositivos", "—", "a ler no projeto")}${votacao(x)}</div>
  ${Z ? `<div class="dois"><div class="cx"><div class="cxh">${ic("lista")}O que muda</div>${(Z.muda || []).map(([k, a, b]) => { const [ik, cl] = MI[k] || ["seta", ""]; return `<div class="it"><span class="ic ${cl}">${ic(ik)}</span><span>${esc(a)}${b ? `<small>${esc(b)}</small>` : ""}</span></div>`; }).join("")}</div>
    <div class="cx"><div class="cxh">${ic("bal")}Por quê</div><div class="txt">${esc(Z.pq || "")}</div>${Z.fund && Z.fund.length ? `<div class="cxh" style="margin:14px 0 6px">${ic("lei")}Fundamentos citados</div><div class="fd">${Z.fund.map((f) => `<span>${esc(f)}</span>`).join("")}</div>` : ""}</div></div>` : `<div style="height:12px"></div>`}
  <div class="base">${linhaTempo(x)}${relacionadas(x, Z)}</div>
  ${Z ? "" : `<div class="aviso">O resumo desta proposição (o que muda e por quê) ainda está sendo preparado a partir do texto do projeto.</div>`}</div>`; }
// linha (20/11/2026): etiqueta em pé (tipo em cima, número/ano embaixo); tempo na Assembleia e na comissão numa linha do tempo
// compacta (protocolo → chegada na comissão → hoje); detalhes ficam no "title" (passar o mouse) e no detalhe ao clicar
// linha (20/11/2026): rito numa barra só (leitura, comissões, vista, hoje e as que faltam); números em texto normal, cor só no desenho;
// detalhes de cada trecho ao passar o mouse; a versão completa abre no detalhe
function ritoMini(x) { const { S, falta, tot } = rito(x), mk = marcasHtml(vistaMarcas(x, S, tot, 60));
  return `<div class="rt"><div class="rth"><b>${ni(x.casa)} d</b><span class="rtc"><em>${esc(x.csig)}</em>${ni(x.dias)} d</span></div>
    <div class="rtb"><div class="rtp">${mk}${S.map((e) => `<i class="r-${e.k}" style="flex:${Math.max(e.d, tot / 60)}" title="${esc(e.t)}">${e.d / tot > .16 && e.s ? `<span>${esc(e.s)}</span>` : ""}</i>`).join("")}<s title="hoje"></s></div>${falta.map((c) => `<u title="${esc(c.n)} · ainda vai">${esc(c.s)}</u>`).join("")}</div>
    <div class="rtl"><span>${x.lido ? "lido " + br(x.lido).slice(3) : br(x.prot).slice(3)}</span><span>hoje</span></div></div>`; }
function linha(x) {
  return `<div class="lin${F.ab === x.id ? " ab" : ""}" data-id="${esc(x.id)}"><div class="le">${etq(x, 1)}</div>
    <div class="obj"><b>${esc(RES[x.id] ? RES[x.id].m : x.resumo)}</b><small>${esc(x.ementa)}</small></div>
    <div class="aut" data-r="Autor · tema">${esc(x.autor)}<small>${esc(temaDe(x))}</small></div>
    <div class="tmw" data-r="Tramitação">${ritoMini(x)}</div>
    <div class="rel" data-r="Relator">${x.rel ? esc(x.rel) : `<span class="sem">aguardando relator</span>`}</div>
    ${F.ab === x.id ? detalhe(x) : ""}</div>`; }
const filtradas = () => { const L = D.L.filter((x) => passa(x)), [k, s] = F.ord; return L.sort((a, b) => { const p = ORD[k](a), q = ORD[k](b); return (p > q ? 1 : p < q ? -1 : 0) * s || ORD.dias(b) - ORD.dias(a); }); };
const filtroTxt = () => [F.com, F.tipo, F.tema, F.rel && (F.rel === "(sem)" ? "sem relator" : "relator " + F.rel), F.aut && "autor " + F.aut, F.vq && "vista de " + (F.vq === "(?)" ? "não identificado" : F.vq), F.fx && (F.hm === "vis" ? "em vista há " : "na comissão há ") + (HX.find((h) => h[1] === F.fx[0]) || [""])[0], F.idade !== "" && ["até 30 dias", "31 a 90 dias", "mais de 90 dias"][+F.idade] + " na comissão", F.kpi && { com: "com relator", sem: "aguardando relator", velhas: "mais de 90 dias", vista: "em vista", andou: "já aprovadas em 1+" }[F.kpi], F.q && `busca “${F.q}”`].filter(Boolean).join(" · ") || "todas as proposições em comissão";
function desenhar() { kpis(D.L.filter((x) => !F.com || x.com === F.com)); comissoes();
  const L = D.L.filter((x) => passa(x)); const [k, s] = F.ord; L.sort((a, b) => { const p = ORD[k](a), q = ORD[k](b); return (p > q ? 1 : p < q ? -1 : 0) * s || ORD.dias(b) - ORD.dias(a); });
  $("#res").innerHTML = `<b>${ni(L.length)}</b> de ${ni(D.L.length)} proposições${F.com ? " em " + esc(F.com) : ""}`;
  const col = (id, t) => `<button data-o="${id}" class="${F.ord[0] === id ? "on" : ""}">${t}<i>${F.ord[0] === id ? (F.ord[1] > 0 ? "↑" : "↓") : "↕"}</i></button>`;
  if (F.vis === "lista") $("#vista").innerHTML = `<div class="lista"><div class="cab">${col("num", "Proposição")}${col("obj", "Objetivo")}${col("aut", "Autor · tema")}<span class="cab2">Tramitação ${col("casa", "casa")}${col("dias", "comissão")}${col("fl", "caminho")}</span>${col("rel", "Relator")}</div>
    ${L.slice(0, F.lim).map(linha).join("") || `<div class="vazio">Nada com estes filtros.</div>`}${L.length > F.lim ? `<button class="mais" id="mais">Mostrar mais ${ni(Math.min(60, L.length - F.lim))} de ${ni(L.length - F.lim)}</button>` : ""}</div>`;
  else { const C = (F.com ? [F.com] : D.coms.map((c) => c[0])).filter((c) => L.some((x) => x.com === c));
    $("#vista").innerHTML = `<div class="quadro">${C.map((c) => { const A = L.filter((x) => x.com === c).sort((a, b) => (b.casa || 0) - (a.casa || 0)), md = A.length ? Math.round(A.reduce((s, x) => s + (x.casa || 0), 0) / A.length) : 0; return `<section class="qc"><h3>${esc(c)}<small>${ni(A.length)} · média ${ni(md)} dias na casa</small></h3><div class="qs">${A.slice(0, 80).map((x) => `<div class="card" data-id="${esc(x.id)}"><div class="t">${etq(x)}<span style="font-size:11.5px;text-align:right"><b class="idade ${x.casa > 365 ? "l" : x.casa > 180 ? "m" : "v"}">${ni(x.casa)} d</b> <span style="color:var(--ter)">na casa</span></span></div><b>${esc(RES[x.id] ? RES[x.id].m : x.resumo)}</b><span class="tbar" title="${ni(x.casa)} dias na Assembleia, ${x.dias ?? 0} nesta comissão"><i style="flex:${Math.max(0, (x.casa || 0) - (x.dias || 0))};background:#3A4045"></i><i style="flex:${x.dias || 0};background:${x.dias > 90 ? "#E8822A" : "#A9AEB3"}"></i></span><small>${esc(x.autor)} · ${x.rel ? "relator " + esc(x.rel) : "aguardando relator"}</small>${fluxo(x)}</div>`).join("")}${A.length > 80 ? `<small style="padding:6px;color:var(--ter)">+ ${A.length - 80} na lista</small>` : ""}</div></section>`; }).join("")}</div>`; }
  if (F.fut) $("#vista").insertAdjacentHTML("beforeend", futuro());
}
// "Futuro" (23/11/2026): proposições distribuídas para a comissão escolhida que ainda não chegaram nela (no caminho,
// situação "falta"), separadas em próxima parada e mais adiante; valem os mesmos filtros (tipo, tema, autor, busca)
function futuro() {
  if (!F.com) return `<section class="futs"><h3>Propostas designadas para esta comissão</h3><div class="vazio">Escolha uma comissão na faixa acima para ver as proposições que ainda vão chegar nela.</div></section>`;
  const ate = (x) => { const i = x.fluxo.findIndex((c) => c.n === F.com), a = x.fluxo.findIndex((c) => c.st === "atual"); return i - Math.max(0, a); };
  const L = D.L.filter((x) => x.com !== F.com && x.fluxo.some((c) => c.n === F.com && c.st === "falta") && (!F.tipo || x.tipo === F.tipo) && (!F.tema || temaDe(x) === F.tema) && (!F.aut || x.autor === F.aut) && (!F.q || norm([x.tipo, x.num, x.ano, x.autor, x.rel, x.resumo, x.ementa, RES[x.id] && RES[x.id].m].join(" ")).includes(norm(F.q))))
    .sort((a, b) => ate(a) - ate(b) || (b.casa || 0) - (a.casa || 0));
  const P = L.filter((x) => ate(x) === 1), M = L.filter((x) => ate(x) !== 1);
  const bloco = (k, t, A, sub) => A.length ? `<div class="futg"><div class="futh"><b>${t}</b><span>${ni(A.length)} · ${sub}</span></div><div class="lista">${A.slice(0, F.flim[k]).map(linha).join("")}${A.length > F.flim[k] ? `<button class="mais" data-fmais="${k}">Mostrar mais ${ni(Math.min(30, A.length - F.flim[k]))} de ${ni(A.length - F.flim[k])}</button>` : ""}</div></div>` : "";
  return `<section class="futs"><h3>Propostas designadas para esta comissão<small>${ni(L.length)} ${L.length === 1 ? "proposição distribuída" : "proposições distribuídas"} para ${esc(F.com)} que ainda não ${L.length === 1 ? "chegou" : "chegaram"}</small></h3>
    ${L.length ? bloco("p", "Próxima parada", P, "a próxima comissão do caminho é esta") + bloco("m", "Mais adiante", M, "passam antes por outras comissões") : `<div class="vazio">Nenhuma proposição a caminho desta comissão com estes filtros.</div>`}</section>`; }
// eventos
R.addEventListener("change", (e) => { const s = e.target.closest("[data-hcom]"); if (s) { F.com = s.value; F.lim = 60; F.flim = { p: 30, m: 30 }; desenhar(); } });
R.addEventListener("click", (e) => { const t = e.target;
  const rkm = t.closest("[data-rkm]"); if (rkm) { const [k, m] = rkm.dataset.rkm.split("|"); F.rk[k] = m; comissoes(); return; }
  const rko = t.closest("[data-rko]"); if (rko) { F.rk.o[rko.dataset.rko] *= -1; comissoes(); return; }
  const rkt = t.closest("[data-rkt]"); if (rkt) { F.rk.tudo[rkt.dataset.rkt] = !F.rk.tudo[rkt.dataset.rkt]; comissoes(); return; }
  const rkf = t.closest("[data-rkf]"); if (rkf) { const [k, ...nn] = rkf.dataset.rkf.split("|"), n = nn.join("|");
    if (k === "rel") { F.rel = F.rel === n ? "" : n; $("#fRel").value = F.rel; } else if (k === "aut") { F.aut = F.aut === n ? "" : n; $("#fAut").value = F.aut; } else { F.kpi = "vista"; F.q = F.q === n ? "" : n; $("#q").value = F.q; }
    F.lim = 60; desenhar(); $("#res").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const cvb = t.closest("[data-cv]"); if (cvb) { F.cv = cvb.dataset.cv; R.querySelectorAll("[data-cv]").forEach((b) => b.classList.toggle("on", b === cvb)); try { localStorage.setItem("cmp_cv", F.cv); } catch (e) {} comissoes(); return; }
  const k = t.closest("[data-k]"); if (k) { F.kpi = F.kpi === k.dataset.k ? "" : k.dataset.k; F.lim = 60; desenhar(); return; }
  const c = t.closest("[data-c]"); if (c) { F.com = F.com === c.dataset.c ? "" : c.dataset.c; F.lim = 60; F.flim = { p: 30, m: 30 }; desenhar(); return; }
  const o = t.closest("[data-o]"); if (o) { const id = o.dataset.o; F.ord = F.ord[0] === id ? [id, -F.ord[1]] : [id, id === "dias" || id === "fl" || id === "casa" ? -1 : 1]; desenhar(); return; }
  const v = t.closest("[data-v]"); if (v) { F.vis = v.dataset.v; R.querySelectorAll("[data-v]").forEach((b) => b.classList.toggle("on", b === v)); desenhar(); return; }
  if (t.closest("#mais")) { F.lim += 60; desenhar(); return; }
  const hm = t.closest("[data-hm]"); if (hm) { F.hm = hm.dataset.hm; F.rel = ""; F.vq = ""; F.fx = null; F.kpi = ""; $("#fRel").value = ""; F.hall = false; desenhar(); return; }
  const hc = t.closest("[data-hc]"); if (hc && F.hm === "vis") { const [k, i] = hc.dataset.hc.split("|"), h = HX[+i], ja = F.vq === k && F.fx && F.fx[0] === h[1]; F.vq = ja ? "" : k; F.fx = ja ? null : [h[1], h[2]]; F.kpi = ja ? "" : "vista"; F.lim = 60; desenhar(); if (!ja) $("#res").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (hc) { const [k, i] = hc.dataset.hc.split("|"), h = HX[+i], ja = F.rel === k && F.fx && F.fx[0] === h[1];
    F.rel = ja ? "" : k; F.fx = ja ? null : [h[1], h[2]]; $("#fRel").value = F.rel; F.lim = 60; desenhar(); if (!ja) $("#res").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const hrv = t.closest("[data-hr]"); if (hrv && F.hm === "vis") { const k = hrv.dataset.hr; F.vq = F.vq === k ? "" : k; F.fx = null; F.kpi = F.vq ? "vista" : ""; F.lim = 60; desenhar(); return; }
  const hr = t.closest("[data-hr]"); if (hr) { F.rel = F.rel === hr.dataset.hr ? "" : hr.dataset.hr; F.fx = null; $("#fRel").value = F.rel; F.lim = 60; desenhar(); return; }
  const hxv = t.closest("[data-hx]"); if (hxv && F.hm === "vis") { const h = HX[+hxv.dataset.hx]; F.fx = F.fx && F.fx[0] === h[1] ? null : [h[1], h[2]]; F.kpi = F.fx || F.vq ? "vista" : ""; F.lim = 60; desenhar(); return; }
  const hx = t.closest("[data-hx]"); if (hx) { const h = HX[+hx.dataset.hx]; F.fx = F.fx && F.fx[0] === h[1] ? null : [h[1], h[2]]; F.lim = 60; desenhar(); return; }
  if (t.closest("[data-hall]")) { F.hall = !F.hall; comissoes(); return; }
  const fm = t.closest("[data-fmais]"); if (fm) { F.flim[fm.dataset.fmais] += 30; desenhar(); return; }
  const fb = t.closest("#futB"); if (fb) { F.fut = !F.fut; fb.classList.toggle("on", F.fut); fb.setAttribute("aria-pressed", F.fut); desenhar(); if (F.fut) { const f = R.querySelector(".futs"); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
  if (t.closest("[data-fecha]")) { F.ab = null; desenhar(); return; }
  const fi = t.closest("[data-ficha]"); if (fi) { cmpImprimir([D.L.find((x) => x.id === fi.dataset.ficha)], { fichas: 1, so: 1, barra: barraDe }, D, RES); return; }
  if (t.closest("#impB")) { const m = R.querySelector(".impm"); if (m) { m.remove(); return; } const b = t.closest("#impB"), L = filtradas();
    const mm = document.createElement("div"); mm.className = "impm"; mm.innerHTML = `<button data-imp="l">Lista<small>${ni(L.length)} proposições, uma por linha</small></button><button data-imp="f"${L.length > 60 ? " disabled style=\"opacity:.45\"" : ""}>Lista e fichas<small>${L.length > 60 ? "filtre até 60 proposições para incluir as fichas" : "uma ficha por proposição depois da lista"}</small></button><label class="impq"><input type="checkbox" id="impQ"${F.impQ ? " checked" : ""}><span>Quadro ${F.hm === "vis" ? "vista" : "relator"} × tempo no final<small>com as proposições do recorte atual</small></span></label>`;
    mm.style.left = b.offsetLeft + "px"; mm.style.top = b.offsetTop + b.offsetHeight + 6 + "px"; b.parentNode.appendChild(mm); return; }
  const im = t.closest("[data-imp]"); if (im) { if (im.disabled) return; const qd = R.querySelector("#impQ"); F.impQ = !!(qd && qd.checked); R.querySelector(".impm").remove(); const L2 = filtradas();
    cmpImprimir(L2, { fichas: im.dataset.imp === "f", filtro: filtroTxt(), barra: barraDe, quadro: F.impQ ? quadroDe(L2) : null }, D, RES); return; }
  if (t.closest("#limpa")) { Object.assign(F, { com: "", q: "", tipo: "", tema: "", rel: "", aut: "", idade: "", kpi: "", fx: null, vq: "", lim: 60 }); ["#q", "#fTipo", "#fTema", "#fRel", "#fAut", "#fIdade"].forEach((s) => $(s).value = ""); desenhar(); return; }
  const r = t.closest("[data-id]"); if (r) { const id = r.dataset.id; if (F.vis === "quadro") { F.vis = "lista"; R.querySelectorAll("[data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === "lista")); F.q = ""; }
    F.ab = F.ab === id ? null : id; const i = D.L.findIndex((x) => x.id === id); desenhar(); const el = R.querySelector(`.lin[data-id="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: "nearest" }); } });
$("#q").oninput = (e) => { F.q = e.target.value; F.lim = 60; desenhar(); };
// busca só com o ícone (23/11/2026): abre ao tocar; fecha ao sair se estiver vazia
$("#buscaL").addEventListener("mousedown", () => { const l = $("#buscaL"); if (!l.classList.contains("on")) { l.classList.add("on"); setTimeout(() => $("#q").focus(), 0); } });
$("#q").addEventListener("blur", () => { if (!$("#q").value.trim()) $("#buscaL").classList.remove("on"); });
[["#fTipo", "tipo"], ["#fTema", "tema"], ["#fRel", "rel"], ["#fAut", "aut"], ["#fIdade", "idade"]].forEach(([s, k]) => $(s).onchange = (e) => { F[k] = e.target.value; F.lim = 60; desenhar(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && F.ab && document.body.contains(R)) { F.ab = null; desenhar(); } });
const at = document.getElementById("cmpAt"); if (at) at.textContent = "e-Legis · atualizado em " + new Date(D.gerado).toLocaleDateString("pt-BR") + " às " + new Date(D.gerado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
try { const v = localStorage.getItem("cmp_cv"); if (v === "grade" || v === "rank") { F.cv = v; R.querySelectorAll("[data-cv]").forEach((b) => b.classList.toggle("on", b.dataset.cv === v)); } } catch (e) {}
opcoes(); desenhar();

}

// ---------- relatório impresso (mesmo padrão do relatório do Controle de Recursos: relPDF em gabinete-relatorio.js) ----------
// Temas de 1º nível (os mesmos usados nos resumos) com o ícone do documento; os demais caem no ícone genérico.
const CMP_TEMAS = { "Tributação e finanças": '<path d="M3 13.5h10 M4 11V7.5 M8 11V4 M12 11V6"/>', "Saúde": '<path d="M6 2.5h4v3.5h3.5v4H10v3.5H6V10H2.5V6H6z"/>', "Educação": '<path d="M2.5 3.5c2-.8 3.8-.8 5.5.6 1.7-1.4 3.5-1.4 5.5-.6v9.5c-2-.8-3.8-.8-5.5.6-1.7-1.4-3.5-1.4-5.5-.6z M8 4.1v9.5"/>',
  "Segurança pública": '<path d="M8 2l5 2v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z"/>', "Servidores públicos": '<circle cx="8" cy="5" r="2.5"/><path d="M3.5 14c.5-2.6 2.3-4 4.5-4s4 1.4 4.5 4"/>', "Meio ambiente": '<path d="M3 13c0-6 4-9.5 10-10-.5 6-4 10-10 10z M3 13l5-5"/>',
  "Direitos e cidadania": '<path d="M8 2.5v11 M4.5 13.5h7 M3 5h10 M3 5l-1.8 4h3.6z M13 5l-1.8 4h3.6z"/>', "Economia e desenvolvimento": '<path d="M2.5 12.5l4-4 3 2.5 4-5.5 M10 5.5h3.5V9"/>', "Infraestrutura e transporte": '<path d="M6 2l-2 12 M10 2l2 12 M8 3v2 M8 7v2 M8 11v2"/>',
  "Agricultura e pesca": '<path d="M8 14V7 M8 9C5 9 3.5 7 3.5 4 6.5 4 8 6 8 9z M8 7c0-3 1.5-5 4.5-5 0 3-1.5 5-4.5 5z"/>', "Cultura, esporte e turismo": '<path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1 4.6 12.9l.7-3.8L2.5 6.5l3.8-.5z"/>', "Administração pública": '<path d="M2.5 13.5h11 M3.5 13.5V6.5 M12.5 13.5V6.5 M2 6.5L8 2.5l6 4z M6 13.5v-4h4v4"/>',
  "Homenagens e datas": '<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11 M5.5 2v3 M10.5 2v3"/>', "Utilidade pública": '<circle cx="8" cy="6.5" r="4"/><path d="M5.5 10l-1 4 3.5-1.5 3.5 1.5-1-4"/>', "Assistência social e família": '<path d="M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10.2 8 13.5 8 13.5z"/>' };
const CMP_TI0 = '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.5 M8 11v.2"/>';
function cmpImprimir(L, o, D, RES) { const w = window.open("", "_blank"); if (!w) { alert("Libere as janelas pop-up do navegador para este site."); return; }
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"), ni = (n) => (n || 0).toLocaleString("pt-BR"), br = (d) => d ? d.split("-").reverse().join("/") : "—";
  const ag = new Date(), dt = ag.toLocaleDateString("pt-BR"), hr = ag.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const tm = (x) => { const Z = RES[x.id]; return Z && Z.t && Z.t[0] ? Z.t[0] : [x.tema]; }, ico = (t) => CMP_TEMAS[t] || CMP_TI0, curto = (t) => String(t).split(/[ ,]/)[0].toUpperCase().slice(0, 10);
  const eto = (x) => `<span class="pt-eto ${x.tipo === "PL" ? "pl" : "ou"}"><b>${esc(x.tipo)}</b><span>${esc(x.num)}/${esc(String(x.ano).slice(2))}</span></span>`;
  const cam = (x) => `<span class="cam">${x.fluxo.map((c) => `<i class="${c.st === "ok" ? "ok" : c.st === "atual" ? "at" : ""}">${esc(c.s)}</i>`).join("")}</span>`;
  // linha do tempo impressa (23/11/2026): a mesma barra da tela (leitura, comissões, arquivada, comissão atual) com a vista em amarelo
  const barra = (x) => { if (!o.barra) return ""; const B = o.barra(x);
    return `<div class="tlb"><div class="tlp">${B.mk.map((m) => `<b style="left:${m.p.toFixed(1)}%" title="${esc(m.t)}"></b>`).join("")}${B.S.map((e) => `<i class="t-${e.k}" style="flex:${Math.max(e.d, B.tot / 60)}">${e.d / B.tot > .14 && e.s ? `<span>${esc(e.k === "vs" ? "vista" : e.s)}</span>` : ""}</i>`).join("")}</div><div class="tll"><span>${esc(B.ini)}</span><span>hoje</span></div></div>`; };
  const comR = L.filter((x) => x.rel).length, v90 = L.filter((x) => x.dias > 90).length, mdC = L.length ? Math.round(L.reduce((s, x) => s + (x.casa || 0), 0) / L.length) : 0;
  const linhas = L.map((x, i) => { const Z = RES[x.id], t = tm(x); return `<tbody class="pi${o.barra ? " cb" : ""}"><tr><td class="c0">${i + 1}</td><td class="c1">${eto(x)}</td><td class="c3"><b>${esc(Z ? Z.m : x.resumo)}</b><small>${esc(x.autor)}</small><span class="tg2">${esc(t.filter(Boolean).join(" › "))}</span></td>
    <td class="c4"><svg viewBox="0 0 16 16" class="pt-fi">${ico(t[0])}</svg><small>${esc(curto(t[0]))}</small></td><td class="c5">${cam(x)}</td><td class="c6"><span class="rl2${x.rel ? "" : " vz"}">${esc(x.rel || "sem relator")}${x.rel && x.relDist ? `<small>desde ${br(x.relDist)}</small>` : ""}${x.vista ? `<em class="vs2">vista · ${esc(x.vista.quem || "deputado")}</em>` : ""}</span></td>
    <td class="c8"><span class="pt-val${x.casa > 365 ? " lg" : ""}">${ni(x.casa)} d</span></td><td class="c7"><span class="pt-val${x.dias > 90 ? " lg" : ""}">${ni(x.dias)} d</span></td></tr>${o.barra ? `<tr class="tlr"><td></td><td></td><td colspan="6">${barra(x)}</td></tr>` : ""}</tbody>`; }).join("");
  const usados = [...new Set(L.map((x) => tm(x)[0]))];
  const tipos = [...new Set(L.map((x) => x.tipo))], TN = { PL: "Projeto de lei", PLC: "Projeto de lei complementar", PEC: "Proposta de emenda à Constituição", MSV: "Mensagem de veto", PRS: "Projeto de resolução", PDL: "Projeto de decreto legislativo" };
  const ficha = (x) => { const Z = RES[x.id], t = Z && Z.t ? Z.t : [[x.tema]];
    const ev = [[x.prot, "Protocolado", 1], ...x.fluxo.filter((c) => c.dist).map((c) => [c.dist, "Relator na " + c.s + (c.rel ? " · " + c.rel : ""), 1]), ...x.fluxo.filter((c) => c.st === "ok" && c.concl).map((c) => [c.concl, c.s + " conclui" + (c.par ? " · " + c.par.toLowerCase() : ""), 1]), [x.chegou, "Chegou à " + x.csig, 1]].filter((e) => e[0]).sort((a, b) => a[0] < b[0] ? -1 : 1);
    return `<div class="fi"><div class="fih">${eto(x)}<span>${esc(x.autor)}</span><span style="margin-left:auto">${esc(x.sit)} · ${esc(x.csig)}</span></div>
    <h3>${esc(Z ? Z.m : x.resumo)}</h3><p>${esc(Z ? Z.f : x.ementa)}</p>
    <div style="margin-bottom:8px">${t.map((q) => `<span class="tm2"><b>${esc(q[0])}</b>${q[1] ? `<span>${esc(q.slice(1).filter(Boolean).join(" › "))}</span>` : ""}</span>`).join("")}</div>
    <div class="fic"><div><b>${esc(Z && Z.fis ? Z.fis[0] : "—")}</b><span>impacto fiscal</span></div><div><b>${esc(x.rel || "a designar")}</b><span>relator na ${esc(x.csig)}</span></div><div><b>${ni(x.dias)} dias</b><span>na comissão</span></div><div><b>${ni(x.casa)} dias</b><span>na Assembleia · desde ${br(x.prot)}</span></div></div>
    <div style="margin-bottom:8px">${cam(x)}</div>${o.barra ? `<div style="margin-bottom:10px">${barra(x)}</div>` : ""}
    <div class="fi2"><div>${Z ? `<div class="fst">O que muda${Z.disp ? " · " + esc(Z.disp.txt || Z.disp.art + " artigos") : ""}</div><ul class="fiu">${(Z.muda || []).map(([, a, b]) => `<li>${esc(a)}${b ? ` <span style="color:#7A8085">(${esc(b)})</span>` : ""}</li>`).join("")}</ul><div class="fst" style="margin-top:8px">Por quê</div><p style="margin:0">${esc(Z.pq || "")}</p>` : `<div class="fst">Ementa</div><p style="margin:0">${esc(x.ementa)}</p>`}</div>
      <div><div class="fst">Linha do tempo</div>${ev.map(([d, s]) => `<div class="fil ok"><em>${br(d)}</em><span>${esc(s)}</span></div>`).join("")}<div class="fil"><em>—</em><span>${x.rel ? "Parecer da " + esc(x.csig) : "Relator na " + esc(x.csig)}</span></div></div></div></div>`; };
  const cab = `<div class="di-cab"><div><div class="di-wm">Simula<span>LEGIS</span></div><div class="di-wmsub">Gabinete · Processo legislativo</div></div><div class="di-meta"><b>Comissões permanentes da ALESC</b><br>gerado em ${dt} às ${hr} · dados do e-Legis de ${new Date(D.gerado).toLocaleDateString("pt-BR")}</div></div><div class="di-regra"></div>`;
  const lista = `${cab}<div class="di-tit">Proposições em tramitação nas comissões</div><div class="di-sub"><b>Filtro:</b> ${esc(o.filtro || "")} · ordem da tela</div>
  <div class="di-rres"><div><b>${ni(L.length)}</b><span>em tramitação</span></div><div class="ok"><b>${ni(comR)}</b><span>com relator · ${L.length ? Math.round(comR / L.length * 100) : 0}%</span></div><div><b>${ni(v90)}</b><span>há mais de 90 dias na comissão${L.some((x) => x.vista) ? " · " + ni(L.filter((x) => x.vista).length) + " em vista" : ""}</span></div><div><b>${ni(mdC)} dias</b><span>média na Assembleia</span></div></div>
  <div class="di-pbar"><i class="b1" style="width:${L.length ? comR / L.length * 100 : 0}%"></i><i class="b3" style="width:${L.length ? (L.length - comR) / L.length * 100 : 0}%"></i></div>
  <div class="di-pleg"><span><i class="b1"></i>Com relator ${ni(comR)}</span><span><i class="b3"></i>Aguardando relator ${ni(L.length - comR)}</span></div>
  <table class="pt"><thead><tr><th class="c0">#</th><th class="c1">Proposição</th><th class="c3">Resumo</th><th class="c4">Tema</th><th class="c5">Caminho nas comissões</th><th class="c6">Relator</th><th class="c8">Na casa</th><th class="c7">Na comissão</th></tr></thead>${linhas}</table>
  <div class="di-lgs"><div><b>Tema</b>${usados.map((t) => `<span><svg viewBox="0 0 16 16" class="pt-fi">${ico(t)}</svg>${esc(t)}</span>`).join("")}</div>
    <div><b>Caminho</b><span class="cam"><i class="ok">CCJ</i></span>já aprovou<span class="cam"><i class="at">CCJ</i></span>está agora<span class="cam"><i>CFT</i></span>ainda passará</div>
    <div><b>Tipo</b>${tipos.map((t) => `<span>${eto({ tipo: t, num: "nº", ano: "  " }).replace("nº/  ", "nº")}${esc(TN[t] || t)}</span>`).join("")}</div>
    ${o.barra ? `<div style="grid-column:1/-1"><b>Linha do tempo</b><span><i class="lgq t-lei"></i>leitura</span><span><i class="lgq t-ok"></i>comissão concluída</span><span><i class="lgq t-ps"></i>expediente e coordenadorias</span><span><i class="lgq t-arq"></i>arquivada</span><span><i class="lgq t-atual"></i>comissão atual</span><span><i class="lgq t-vs"></i>pedido de vista (marca: vista anterior)</span></div>` : ""}
    <div><b>Dias</b><span><span class="pt-val">37 d</span>até 90 na comissão · até 365 na casa</span><span><span class="pt-val lg">236 d</span>acima disso</span></div></div>`;
  const css = `@page{size:A4;margin:14mm 12mm} *{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important} body{font-family:Inter,system-ui,sans-serif;color:#111;margin:0} .folha{position:relative;padding:0 3px}
  .di-agua{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}.di-agua span{font-size:110px;font-weight:800;color:rgba(0,0,0,.03);transform:rotate(-24deg)}
  .di-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.di-wm{font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1}.di-wm span{color:#1FA83A}.di-wmsub{font-size:7px;font-weight:800;letter-spacing:.2em;color:#6B7178;text-transform:uppercase;margin-top:3px}
  .di-meta{text-align:right;font-size:9px;color:#3F454B;line-height:1.5}.di-regra{margin:10px 0 14px;height:2px;background:#A9AEB3;position:relative}.di-regra:after{content:"";position:absolute;left:0;right:0;top:4px;height:1px;background:#D3D6D8}
  .di-tit{font-size:16px;font-weight:800}.di-sub{font-size:9.5px;color:#3F454B;margin:2px 0 10px}.di-sub b{color:#111}
  .di-rres{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 8px}.di-rres div{border:1px solid #DCDFE2;border-radius:6px;padding:6px 8px;background:#F3F5F6}.di-rres b{display:block;font-size:13px;font-variant-numeric:tabular-nums}.di-rres span{font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}.di-rres .ok b{color:#1FA83A}
  .di-pbar{display:flex;height:7px;border-radius:999px;overflow:hidden;background:#E6E8EA}.di-pbar i{display:block}.b1{background:#1FA83A}.b3{background:#A9AEB3}
  .di-pleg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:8px;color:#3F454B;margin:4px 0 12px}.di-pleg i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:-1px}
  .pt{width:100%;border-collapse:collapse;font-size:9.5px}.pt thead{display:table-header-group}.pt tr{page-break-inside:avoid}
  .pt thead th{font-size:7px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6B7178;text-align:left;padding:7px 5px;border-bottom:1.5px solid #A9AEB3;white-space:nowrap}
  .pt td{padding:7px 5px;border-bottom:.5px solid #DCDFE2;vertical-align:middle}
  .pt .c0{width:16px;color:#9AA0A4;text-align:right}.pt .c1{width:62px;text-align:center}.pt .c3 b{display:block;font-weight:700;font-size:10px;line-height:1.3}.pt .c3 small{display:block;color:#7A8085;font-size:7.8px;margin-top:2px}
  .pt .tg2{display:block;font-size:7px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9AA0A4;margin-top:2px}
  .pt .c4{width:50px;text-align:center}.pt .c4 small{display:block;font-size:5.8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7178;margin-top:2px}
  .pt .c5{width:110px}.pt .c6{width:78px}.pt .c7,.pt .c8{width:50px;text-align:right}.pt th.c1,.pt th.c4{text-align:center}.pt th.c7,.pt th.c8{text-align:right}
  .pt-fi{width:14px;height:14px;fill:none;stroke:#3F454B;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;display:block;margin:0 auto}
  .pt-eto{display:inline-grid;grid-template-columns:auto auto;border-radius:4px;overflow:hidden;font-size:7.5px;font-weight:700;letter-spacing:.03em;line-height:1}
  .pt-eto b,.pt-eto span{display:flex;align-items:center;justify-content:center;padding:3px 5px;min-width:22px}.pt-eto.pl b{background:#3F454B;color:#fff}.pt-eto.pl span{background:#E4E7E9;color:#3F454B}.pt-eto.ou b{background:#8A9096;color:#fff}.pt-eto.ou span{background:#EEF0F1;color:#3F454B}
  .cam{display:inline-flex;gap:2px;align-items:center;flex-wrap:wrap}.cam i{display:flex;align-items:center;justify-content:center;font-style:normal;font-size:6px;font-weight:800;height:13px;min-width:20px;padding:0 2px;border-radius:3px;border:1px dashed #C2C6C9;color:#9AA0A4;background:#fff}
  .cam i.ok{background:#1FA83A;border:1px solid #1FA83A;color:#fff}.cam i.at{background:#3F454B;border:1px solid #3F454B;color:#fff}
  .vs2{display:block;font-style:normal;font-size:7px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#3F454B;border:1px solid #A9AEB3;border-radius:3px;padding:1px 4px;margin-top:2px;width:max-content}.rl2{font-size:9px;font-weight:600}.rl2 small{display:block;font-size:7.5px;color:#9AA0A4;font-weight:400}.rl2.vz{color:#9AA0A4;font-weight:400}
  .pt-val{display:inline-block;white-space:nowrap;min-width:42px;text-align:right;padding:3px 6px;border-radius:4px;font-size:9px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;background:#E4E7E9;color:#3F454B}.pt-val.lg{background:#3F454B;color:#fff}
  .di-lgs{display:grid;grid-template-columns:1fr 1fr;gap:7px 18px;border:1px solid #DCDFE2;border-radius:6px;padding:7px 9px;margin:12px 0 0;font-size:8px;color:#3F454B;page-break-inside:avoid}.di-lgs>div{display:flex;flex-wrap:wrap;align-items:center;gap:3px 10px}.di-lgs b{flex-basis:100%;font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}
  .di-lgs span{display:inline-flex;align-items:center;gap:4px}.di-lgs .pt-fi{width:12px;height:12px;margin:0}.di-lgs .pt-eto b,.di-lgs .pt-eto span{display:flex}
  .di-pagfoot{display:flex;justify-content:space-between;font-size:7.5px;color:#9AA0A4;border-top:.5px solid #DCDFE2;margin-top:16px;padding-top:6px}
  .fichas{break-before:page;page-break-before:always}@media screen{.fichas{margin-top:56px;padding-top:28px;border-top:1px dashed #C9CDD1}}
  .fi{border:1px solid #DCDFE2;border-radius:8px;padding:12px 14px;margin-bottom:14px;page-break-inside:avoid;background:#fff;position:relative}.fih{display:flex;gap:10px;align-items:center;font-size:9px;color:#6B7178}
  .fi h3{font-size:13.5px;margin:7px 0 3px;font-weight:800;line-height:1.3}.fi p{font-size:9.5px;color:#3F454B;margin:0 0 8px;line-height:1.5}
  .fic{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px}.fic div{background:#F3F5F6;border:1px solid #DCDFE2;border-radius:5px;padding:5px 7px}.fic b{display:block;font-size:10.5px}.fic span{font-size:6.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6B7178}
  .fi2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fst{font-size:7px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6B7178;border-bottom:1.5px solid #A9AEB3;padding-bottom:3px;margin-bottom:4px}
  .fil{font-size:9px;line-height:1.45;padding:3px 0;border-bottom:.5px solid #DCDFE2;display:grid;grid-template-columns:48px 1fr;gap:6px}.fil em{font-style:normal;color:#9AA0A4;font-variant-numeric:tabular-nums}.fil.ok em{color:#1FA83A;font-weight:700}
  .fiu{font-size:9px;line-height:1.45;margin:0;padding-left:12px}.tm2{display:inline-flex;font-size:7px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border:1px solid #DCDFE2;border-radius:3px;overflow:hidden;margin-right:4px}.tm2 b{background:#3F454B;color:#fff;padding:2px 4px}.tm2 span{padding:2px 4px;color:#6B7178}
  .pt tbody.pi{page-break-inside:avoid;break-inside:avoid}.pt tbody.cb tr:first-child td{border-bottom:0;padding-bottom:3px}.pt tr.tlr td{padding:0 5px 8px}
  .tlb{max-width:100%}.tlp{position:relative;display:flex;gap:1.5px;height:9px}.tlp i{display:flex;align-items:center;justify-content:center;min-width:2px;overflow:hidden;font-style:normal}.tlp i:first-of-type{border-radius:3px 0 0 3px}.tlp i:last-of-type{border-radius:0 3px 3px 0}
  .tlp i span{font-size:5.8px;font-weight:800;letter-spacing:.03em;white-space:nowrap;text-transform:uppercase}.tlp b{position:absolute;top:-2px;bottom:-2px;width:3px;margin-left:-1.5px;border-radius:1px;background:#E0A800;box-shadow:0 0 0 1px #fff;z-index:1}
  .tll{display:flex;justify-content:space-between;font-size:6.5px;color:#9AA0A4;margin-top:2px}
  .t-lei{background:#C9CDD1;color:#3F454B}.t-sem{background:repeating-linear-gradient(45deg,#DCDFE2 0 2px,#F3F5F6 2px 4px);color:#6B7178}.t-arq{background:repeating-linear-gradient(45deg,#D9C7A6 0 2px,#F1E8D8 2px 4px);color:#6B4F22}
  .t-ok{background:#1FA83A;color:#fff}.t-ps{background:#A9AEB3;color:#fff}.t-atual{background:#3F454B;color:#fff}.t-vs{background:#F2C94C;color:#3B2606}
  .lgq{display:inline-block;width:14px;height:7px;border-radius:2px}
  .qd{break-before:page;page-break-before:always}@media screen{.qd{margin-top:56px;padding-top:28px;border-top:1px dashed #C9CDD1}}
  .qt{width:100%;border-collapse:separate;border-spacing:3px;font-size:9px}.qt th{font-size:6.8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6B7178;text-align:center;padding:4px 2px;white-space:nowrap}.qt th.qn{text-align:left}
  .qt td{text-align:center;padding:0}.qt td.qn{text-align:left;font-weight:600;padding-right:8px;white-space:nowrap}.qt td.qn.sem{color:#B45309}.qt .qtt{text-align:right;font-weight:700;width:40px;padding-right:4px}
  .qt td span{display:block;height:17px;line-height:17px;border-radius:3px;font-weight:700;font-variant-numeric:tabular-nums}.q0{background:#F6F7F8}.q1{background:#E4E7E9;color:#3F454B}.q2{background:#A9AEB3;color:#fff}.q3{background:#6B7178;color:#fff}.q4{background:#3F454B;color:#fff}
  .qt tr.qs td{font-weight:800;border-top:1.5px solid #A9AEB3;padding-top:4px}.qt tr{page-break-inside:avoid}`;
  const Q = o.quadro, qPasso = (v, mx) => !v ? 0 : v / mx > .5 ? 4 : v / mx > .25 ? 3 : v / mx > .1 ? 2 : 1;
  const quadro = !Q ? "" : (() => { const mx = Math.max(1, ...Q.rows.flatMap((r) => r[1]));
    return `<div class="qd">${cab}<div class="di-tit">${Q.VIS ? "Pedidos de vista abertos por deputado e tempo em vista" : "Proposições paradas por relator e tempo na comissão"}</div><div class="di-sub"><b>Recorte:</b> ${esc(o.filtro || "todas")} · ${ni(Q.n)} ${Q.VIS ? "vistas abertas" : "proposições"}</div>
    <table class="qt"><thead><tr><th class="qn">${Q.VIS ? "Deputado" : "Relator"}</th>${Q.HX.map((h) => `<th>${esc(h)}</th>`).join("")}<th class="qtt">Total</th></tr></thead><tbody>
    ${Q.rows.map(([k, v, t]) => `<tr><td class="qn${k === "Aguardando relator" ? " sem" : ""}">${esc(k)}</td>${v.map((n) => `<td><span class="q${qPasso(n, mx)}">${n ? ni(n) : ""}</span></td>`).join("")}<td class="qtt">${ni(t)}</td></tr>`).join("")}
    <tr class="qs"><td class="qn">Total</td>${Q.col.map((n) => `<td>${ni(n)}</td>`).join("")}<td class="qtt">${ni(Q.n)}</td></tr></tbody></table>
    <div class="di-pleg" style="margin-top:8px"><span><i style="background:#E4E7E9"></i>poucas</span><span><i style="background:#A9AEB3"></i></span><span><i style="background:#6B7178"></i></span><span><i style="background:#3F454B"></i>mais proposições na célula</span></div></div>`; })();
  const corpo = o.so ? `${cab}<div class="di-tit">Ficha da proposição</div><div class="di-sub">${esc(L[0].tipo)} ${esc(L[0].num)}/${esc(L[0].ano)} · situação em ${new Date(D.gerado).toLocaleDateString("pt-BR")}</div>${ficha(L[0])}`
    : lista + (o.fichas ? `<div class="fichas">${cab}<div class="di-tit">Fichas das proposições</div><div class="di-sub">Uma ficha por proposição, na mesma ordem da lista.</div>${L.map(ficha).join("")}</div>` : "") + quadro;
  w.document.open(); w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comissões da ALESC · proposições em tramitação</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet"><style>${css}</style></head><body><div class="di-agua"><span>SimulaLEGIS</span></div><div class="folha">${corpo}
    <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app · uso interno do gabinete · fonte: e-Legis (ALESC)</span><span>${dt} ${hr}</span></div></div><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`); w.document.close(); }
