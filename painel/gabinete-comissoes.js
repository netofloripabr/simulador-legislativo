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
.cmp .kpi{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; margin:18px 0 0; }
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
.cmp .lg{ display:flex; gap:14px; flex-wrap:wrap; font-size:11.5px; color:var(--sec); margin-top:8px; }
.cmp .lg i{ display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
.cmp .bar{ top:64px !important; display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:22px 0 10px; position:sticky; top:0; z-index:5; padding:10px 0; background:linear-gradient(var(--fundo) 80%, rgba(11,15,13,0)); }
.cmp .busca{ flex:1 1 260px; display:flex; align-items:center; gap:8px; background:var(--sup); border:1px solid var(--linha); border-radius:999px; padding:0 14px; height:40px; }
.cmp .busca input{ flex:1; background:none; border:0; outline:none; font-size:13.5px; }
.cmp .busca svg{ width:15px; height:15px; color:var(--ter); flex:none; }
.cmp .leq{ display:inline-flex; align-items:center; gap:8px; padding:4px 6px 4px 14px; border:1px solid var(--linha); border-radius:999px; background:var(--sup); height:40px; }
.cmp .leq span{ font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); font-weight:600; }
.cmp .leq select{ background:var(--sup2); border:0; border-radius:999px; padding:6px 10px; font-size:13px; font-weight:600; max-width:200px; }
.cmp .vis{ display:flex; gap:2px; background:var(--sup); border:1px solid var(--linha); border-radius:999px; padding:3px; height:40px; }
.cmp .vis button{ background:none; border:0; border-radius:999px; padding:0 14px; color:var(--sec); font-weight:600; cursor:pointer; font-size:13px; }
.cmp .vis button.on{ background:var(--texto); color:#0B0F0D; }
.cmp .limpa{ background:none; border:0; color:var(--a); cursor:pointer; font-size:12.5px; padding:0 6px; }
.cmp .res{ font-size:12.5px; color:var(--sec); margin:2px 0 10px; }
.cmp .res b{ color:var(--texto); }
.cmp .lista{ background:var(--sup); border:1px solid var(--linha); border-radius:18px; overflow:hidden; }
.cmp .cab,.cmp .lin{ display:grid; grid-template-columns:118px minmax(0,1fr) 150px 100px 140px 140px 200px; gap:14px; align-items:center; padding:12px 16px; }
.cmp .cab{ font-size:10.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ter); font-weight:600; border-bottom:1px solid var(--linha); background:rgba(242,244,245,.015); }
.cmp .cab button{ background:none; border:0; padding:0; font:inherit; color:inherit; letter-spacing:inherit; text-transform:inherit; cursor:pointer; text-align:left; }
.cmp .cab button i{ font-style:normal; margin-left:4px; color:#3A4045; }
.cmp .cab button.on,.cmp .cab button.on i{ color:var(--texto); }
.cmp .lin{ border-bottom:1px solid rgba(242,244,245,.05); cursor:pointer; transition:background .12s; }
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
.cmp .dx .gtb{ display:flex; height:22px; border-radius:6px; overflow:hidden; gap:2px; }
.cmp .dx .gtb i{ display:flex; align-items:center; justify-content:center; font-style:normal; font-size:10.5px; font-weight:700; color:#fff; min-width:6px; white-space:nowrap; overflow:hidden; }
.cmp .dx .gtb .ex{ background:#B9C0C5; color:#3E454B; }
.cmp .dx .gtb .ok{ background:var(--ac); }
.cmp .dx .gtb .ps{ background:#D3D8DB; color:#3E454B; }
.cmp .dx .gtb .atual{ background:var(--cz); }
.cmp .dx .gtl{ display:flex; justify-content:space-between; font-size:10.5px; color:var(--mu); margin-top:5px; font-variant-numeric:tabular-nums; }
.cmp .dx .bnt{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1px; background:var(--bd); border:1px solid var(--bd); border-radius:14px; overflow:hidden; }
.cmp .dx .tl2{ background:var(--tl); padding:11px 14px; display:flex; flex-direction:column; gap:6px; min-width:0; }
.cmp .dx .tl2.w2{ grid-column:span 2; }
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
.cmp .lin{ grid-template-columns:minmax(0,1fr) auto; gap:8px 12px; }
.cmp .lin > .obj{ grid-column:1 / -1; order:-1; }
.cmp .lin > .aut,.cmp .lin > .rel{ font-size:12px; }
.cmp .lin > .fl{ grid-column:1 / -1; }
.cmp .det{ grid-template-columns:minmax(0,1fr); }
.cmp .kpi{ grid-template-columns:repeat(2, minmax(0,1fr)); }}
@media (prefers-reduced-motion:reduce){}`;
let CMP_D = null, CMP_R = null;
const corpoPL = () => `<div class="rhb${S.fech.cmpB === false ? "" : " fech"}" id="cmpB"><h3 data-bk="cmpB">Comissões · proposições em tramitação<small id="cmpAt">proposições nas comissões permanentes · e-Legis</small></h3><div id="cmpC"><p class="rh-nt">Carregando…</p></div></div>`;
async function cmpAbrir() { const R = document.getElementById("cmpC"); if (!R || R.dataset.ok) return; R.dataset.ok = "1";
  if (!document.getElementById("cmpCss")) { const st = document.createElement("style"); st.id = "cmpCss"; st.textContent = CMP_CSS; document.head.appendChild(st); }
  const v = new Date().toISOString().slice(0, 10);
  try { if (!CMP_D) [CMP_D, CMP_R] = await Promise.all([fetch("../dados/painel/alesc-comissoes-tram.json?v=" + v).then((r) => r.json()), fetch("../dados/painel/alesc-comissoes-resumos.json?v=" + v).then((r) => r.ok ? r.json() : { R: {} }).catch(() => ({ R: {} }))]); }
  catch (e) { R.innerHTML = `<p class="rh-nt">Não foi possível carregar as comissões.</p>`; delete R.dataset.ok; return; }
  R.innerHTML = `<div class="cmp">
  
  <div class="kpi" id="kpi"></div>
  <div class="st"><span>Por comissão · toque para filtrar</span><span id="stc"></span></div>
  <div class="coms" id="coms"></div>
  <div class="lg"><span><i style="background:#5B83F0"></i>com relator</span><span><i style="background:#3A4045"></i>aguardando relator</span><span><i style="background:#E8822A"></i>há mais de 90 dias na comissão</span></div>
  <div class="bar" id="bar">
    <label class="busca"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3.5 3.5"/></svg><input id="q" placeholder="Buscar número, autor, relator ou assunto" aria-label="Buscar" autocomplete="off"></label>
    <label class="leq"><span>Tipo</span><select id="fTipo"></select></label>
    <label class="leq"><span>Tema</span><select id="fTema"></select></label>
    <label class="leq"><span>Relator</span><select id="fRel"></select></label>
    <label class="leq"><span>Autor</span><select id="fAut"></select></label>
    <label class="leq"><span>Na comissão há</span><select id="fIdade"><option value="">Qualquer tempo</option><option value="0">Até 30 dias</option><option value="1">31 a 90 dias</option><option value="2">Mais de 90 dias</option></select></label>
    <div class="vis" role="group" aria-label="Visão"><button data-v="lista" class="on">Lista</button><button data-v="quadro">Por comissão</button></div>
    <button class="imp" id="impB" title="Imprimir o que está filtrado"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 6V2h8v4 M4 12H2.5V6.5h11V12H12 M4 10h8v4H4z"/></svg>Imprimir</button>
    <button class="limpa" id="limpa">Limpar filtros</button>
  </div>
  <div class="res" id="res"></div>
  <div id="vista"></div>
</div>`; cmpIniciar(CMP_D, R.querySelector(".cmp"), (CMP_R && CMP_R.R) || {}); }
function cmpIniciar(D, R, RES) {


const $ = (s) => R.querySelector(s), esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ni = (n) => (n || 0).toLocaleString("pt-BR"), br = (d) => d ? d.split("-").reverse().join("/") : "—";
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const F = { com: "", q: "", tipo: "", tema: "", rel: "", aut: "", idade: "", kpi: "", ord: ["casa", -1], vis: "lista", lim: 60, ab: null };
const HOJE = new Date().toISOString().slice(0, 10), dd = (a, b) => a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5)) : null;
D.L.forEach((x) => { x.casa = dd(x.prot, HOJE); });
// tema: o do resumo (1º nível) quando existe; senão o da classificação automática pela ementa
const temaDe = (x) => (RES[x.id] && RES[x.id].t && RES[x.id].t[0] && RES[x.id].t[0][0]) || x.tema;
const SIGN = new Map(D.coms.map(([c, s]) => [c, s])), sigDe = (nome) => { const n = String(nome || "").replace(/^Comiss[ãa]o (de |da |do |dos |das )?/i, ""); for (const [c, s] of SIGN) if (n.startsWith(c) || c.startsWith(n)) return s; return n; };
const faixa = (d) => d == null ? "" : d <= 30 ? "v" : d <= 90 ? "m" : "l";
const ETQ = { PL: "", PLC: "plc", PEC: "pec" };
const etq = (x) => `<span class="cmeto ${ETQ[x.tipo] ?? "out"}"><b>${esc(x.tipo)}</b><span>${esc(x.num)}/${esc(x.ano)}</span></span>`;
const fluxo = (x) => `<div class="fl">${x.fluxo.map((c, i) => `${i ? `<i class="ln${x.fluxo[i - 1].st === "ok" ? " ok" : ""}"></i>` : ""}<span class="p ${c.st}" title="${esc(c.n)}${c.st === "ok" ? " · aprovada" + (c.par ? " (" + c.par + ")" : "") : c.st === "atual" ? " · está aqui" : " · ainda vai"}">${esc(c.s)}</span>`).join("")}</div>`;
// filtros
const passa = (x, sem) => (!F.com || x.com === F.com || sem === "com") && (!F.tipo || x.tipo === F.tipo) && (!F.tema || temaDe(x) === F.tema) && (!F.rel || (F.rel === "(sem)" ? !x.rel : x.rel === F.rel)) && (!F.aut || x.autor === F.aut)
  && (F.idade === "" || faixa(x.dias) === ["v", "m", "l"][+F.idade]) && (!F.kpi || (F.kpi === "sem" ? !x.rel : F.kpi === "com" ? !!x.rel : F.kpi === "velhas" ? x.dias > 90 : F.kpi === "andou" ? x.fluxo.some((c) => c.st === "ok") : true))
  && (!F.q || norm([x.tipo, x.num + "/" + x.ano, x.autor, x.rel, x.resumo, x.ementa, x.com, RES[x.id] ? RES[x.id].m + " " + (RES[x.id].t || []).flat().join(" ") : ""].join(" ")).includes(norm(F.q)));
const ORD = { num: (x) => +x.ano * 1e5 + +x.num, obj: (x) => norm(x.resumo), aut: (x) => norm(x.autor), com: (x) => norm(x.com), rel: (x) => norm(x.rel || "~"), dias: (x) => x.dias ?? -1, casa: (x) => x.casa ?? -1, fl: (x) => x.fluxo.filter((c) => c.st === "ok").length };
function kpis(L) { const sem = L.filter((x) => !x.rel).length, v = L.filter((x) => x.dias > 90).length, an = L.filter((x) => x.fluxo.some((c) => c.st === "ok")).length;
  const k = [["", "Em tramitação", L.length, "em " + new Set(L.map((x) => x.com)).size + " comissões"], ["com", "Com relator", L.length - sem, Math.round((L.length - sem) / Math.max(1, L.length) * 100) + "% do total"], ["sem", "Aguardando relator", sem, "sem relator designado"], ["velhas", "Há mais de 90 dias", v, "paradas na mesma comissão"], ["andou", "Já aprovadas em 1+", an, "comissão no caminho"]];
  $("#kpi").innerHTML = k.map(([id, t, n, s]) => `<button data-k="${id}" class="${F.kpi === id ? "on" : ""}"><span>${t}</span><b>${ni(n)}</b><small>${s}</small></button>`).join(""); }
function comissoes() { const B = D.L.filter((x) => passa(x, "com")), mx = Math.max(1, ...D.coms.map(([c]) => B.filter((x) => x.com === c).length));
  $("#coms").innerHTML = D.coms.map(([c, s]) => { const A = B.filter((x) => x.com === c), n = A.length, cr = A.filter((x) => x.rel).length, v = A.filter((x) => x.dias > 90).length, md = n ? Math.round(A.reduce((t, x) => t + (x.dias || 0), 0) / n) : 0;
    return `<button class="com${F.com === c ? " on" : ""}" data-c="${esc(c)}" title="${esc(c)}"><span class="cs"><b>${esc(s)}</b><em>${ni(n)}</em></span><span class="cn">${esc(c)}</span><span class="cbar" style="width:${Math.max(6, n / mx * 100)}%"><i style="flex:${cr - Math.min(cr, v)};background:#5B83F0"></i><i style="flex:${n - cr - Math.max(0, v - cr)};background:#3A4045"></i><i style="flex:${v};background:#E8822A"></i></span><span class="cmd">${n ? `média de ${md} dias na comissão` : "nada com estes filtros"}</span></button>`; }).join("");
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
  troca: '<path d="M3 5.5h9l-2.5-2.5 M13 10.5H4l2.5 2.5"/>', band: '<path d="M4 14V2.5 M4 3h8l-1.5 3L12 9H4"/>', entra: '<path d="M2.5 8h8 M7.5 5l3 3-3 3 M11 3h2.5v10H11"/>', fecha: '<path d="M4 6l4 4 4-4"/>' };
const ic = (k) => `<svg viewBox="0 0 16 16" class="i">${P[k] || P.doc}</svg>`;
const EL = "https://portalelegis.alesc.sc.gov.br";
const situacao = (x) => /emenda/i.test(x.sit) ? `Análise de emenda na ${x.csig}` : /vista/i.test(x.sit) ? `Pedido de vista na ${x.csig}` : /dilig/i.test(x.sit) ? `Em diligência · ${x.csig}` : x.rel ? `Aguardando parecer na ${x.csig}` : `Aguardando relator na ${x.csig}`;
const iniciais = (n) => String(n || "").split(/\s+/).filter((s) => s.length > 2 || /^[A-Z]/.test(s)).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
function anel(x) { const d = x.dias || 0, q = Math.min(1, d / 365), c = 2 * Math.PI * 34, cor = d > 90 ? "#5E666D" : "#9AA1A7";
  return `<div class="anel"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="#DEE2E5" stroke-width="7"/><circle cx="42" cy="42" r="34" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(q * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>${d > 90 ? `<circle cx="42" cy="42" r="34" fill="none" stroke="#E8A23A" stroke-width="7" stroke-dasharray="1.5 ${c.toFixed(1)}" stroke-dashoffset="${(-(90 / 365) * c).toFixed(1)}" transform="rotate(-90 42 42)"/>` : ""}<text x="42" y="45" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${d}</text><text x="42" y="58" text-anchor="middle" font-size="9" fill="#8C939A">dias</text></svg><small>na comissão atual${d > 90 ? "<br>passou de 90" : ""}</small></div>`; }
function passos(x) { const n = x.fluxo.length, at = Math.max(0, x.fluxo.findIndex((c) => c.st === "atual"));
  return `<div class="stp" style="--n:${n};--f:${n > 1 ? at / (n - 1) : 0}">${x.fluxo.map((c) => `<div class="sp ${c.st}" title="${esc(c.n)}"><span class="sd">${c.st === "ok" ? ic("ok") : c.st === "atual" ? ic("relog") : ""}</span><b>${esc(c.s)}</b><small>${c.st === "ok" ? "aprovou" + (c.concl ? " · " + br(c.concl).slice(0, 6) + br(c.concl).slice(8) : "") : c.st === "atual" ? (c.volta ? "voltou · " : "agora · ") + (x.dias ?? "—") + " dias" : "a passar"}</small></div>`).join("")}</div>`; }
// tempo por etapa: protocolo → 1ª comissão (leitura e despacho), cada comissão concluída, intervalo, comissão atual
function tempo(x) { const S = [], ok = x.fluxo.filter((c) => c.st === "ok" && c.concl).sort((a, b) => a.concl < b.concl ? -1 : 1); let cur = x.prot;
  const ini = (ok[0] && ok[0].dist) || x.chegou; if (ini && dd(cur, ini)) S.push(["ex", dd(cur, ini), "Leitura e despacho"]); if (ini && ini > cur) cur = ini;
  ok.forEach((c) => { const n = dd(cur, c.concl); if (n) S.push(["ok", n, c.s]); if (c.concl > cur) cur = c.concl; });
  if (x.chegou && x.chegou > cur && dd(cur, x.chegou) > 2) { S.push(["ps", dd(cur, x.chegou), "Entre comissões"]); cur = x.chegou; }
  S.push(["atual", x.dias || 0, x.csig]); const tot = S.reduce((s, e) => s + e[1], 0) || 1;
  return `<div class="gt"><div class="gth"><span>Tempo de tramitação por etapa</span><b>${ni(x.casa)} dias na Assembleia</b></div><div class="gtb">${S.map(([c, d, n]) => `<i class="${c}" style="flex:${Math.max(d, tot / 80)}" title="${esc(n)}: ${d} dias">${d / tot > .14 ? esc(n) + " · " + d + "d" : d / tot > .05 ? d + "d" : ""}</i>`).join("")}</div><div class="gtl"><span>protocolo ${br(x.prot)}</span><span>hoje · ${br(HOJE)}</span></div></div>`; }
const tile = (k, r, v, s, c) => `<div class="tl2"><span class="tk">${ic(k)}${r}</span><span class="tv ${c || ""}">${v}${s ? `<small>${s}</small>` : ""}</span></div>`;
function dispositivos(Z) { const d = Z && Z.disp; if (!d) return "";
  const B = (d.b || []).map((b) => typeof b === "string" ? `<i>${esc(b)}</i>` : b[0] === "→" ? "<em>→</em>" : `<i class="${b[1] || ""}">${esc(b[0])}</i>`).join("");
  return `<div class="tl2 w2"><span class="tk">${ic("lista")}Dispositivos · ${d.art} ${d.art === 1 ? "artigo" : "artigos"}</span>${B ? `<div class="dsp">${B}</div>` : ""}<span class="tv" style="font-size:12px;font-weight:500"><small style="margin:0">${esc(d.txt || "")}</small></span></div>`; }
function avanco(x) { const n = x.fluxo.length, ok = x.fluxo.filter((c) => c.st === "ok").length;
  return `<div class="tl2 w2"><span class="tk">${ic("seta")}Avanço nas comissões</span><div class="avn"><b>${ok}/${n}</b><span>${ok === 1 ? "comissão aprovou" : "comissões aprovaram"}</span></div><div class="avs">${x.fluxo.map((c) => `<span class="${c.st}"><i>${c.st === "ok" ? ic("ok") : ""}${esc(c.s)}</i><small>${c.st === "ok" ? "aprovou" : c.st === "atual" ? (c.volta ? "voltou" : "agora") : "falta"}</small></span>`).join("")}</div></div>`; }
const SIT = [[/Lido no Expediente/i, "Lido no Expediente"], [/Publicado no Di[áa]rio/i, "Publicado no Diário"], [/Aguardando aprecia[çc][ãa]o pela Comiss[ãa]o/i, "@chegou"], [/Aguardando An[áa]lise de Emenda/i, "Volta para análise de emenda"],
  [/Vista/i, "Pedido de vista"], [/Dilig[êe]ncia solicitad|Em Dilig/i, "Diligência pedida"], [/Respondida a Dilig/i, "Diligência respondida"], [/apensad|tramita[çc][ãa]o conjunta/i, "Tramitação conjunta"], [/Requerimento.*APROVADO/i, "Requerimento aprovado"], [/Parecer/i, null], [/Devolvid/i, "Devolvido"]];
function eventos(x) { const E = [{ d: x.prot, t: "Protocolado", s: x.autor }];
  x.tram.forEach(([d, s, para]) => { const m = SIT.find(([re]) => re.test(s)); if (!m) return; const t = m[1] === "@chegou" ? `Chegou à ${sigDe(para)}` : m[1] || s; E.push({ d, t, s: m[1] === "@chegou" ? para : para || "" }); });
  x.fluxo.forEach((c) => { if (c.dist) E.push({ d: c.dist, t: `Relator na ${c.s}`, s: c.rel || "" }); if (c.st === "ok" && c.concl) E.push({ d: c.concl, t: `${c.s} conclui`, s: c.par ? "parecer " + c.par.toLowerCase() : "" }); });
  const vis = new Set(), U = E.filter((e) => e.d).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0).filter((e) => { const k = e.d + e.t; if (vis.has(k)) return false; vis.add(k); return true; });
  const L = U.length > 9 ? [U[0], { nota: 1, t: `${U.length - 8} passos antes`, s: "ver todos no e-Legis" }, ...U.slice(-7)] : U;
  const prox = !x.rel ? `Relator na ${x.csig}` : /vista/i.test(x.sit) ? `Volta da vista na ${x.csig}` : `Parecer da ${x.csig}`;
  return [...L.map((e, i) => ({ ...e, cl: e.nota ? "on nt" : i === L.length - 1 ? "cur" : "on" })), { t: prox, s: "próximo passo", cl: "pd" }]; }
function linhaTempo(x) { const E = eventos(x);
  return `<div class="tlq"><div class="tlh"><span>Linha do tempo</span><b>${esc(situacao(x))}</b></div>${E.map((e, i) => `<div class="tlr ${e.cl}"><div class="tlv">${e.d ? `<span class="tld">${br(e.d).slice(0, 6) + br(e.d).slice(8)}</span>` : ""}<i></i>${i < E.length - 1 ? "<s></s>" : ""}</div><div class="tlc"><b>${esc(e.t)}</b>${e.s ? `<span>${esc(e.s)}</span>` : ""}</div></div>`).join("")}</div>`; }
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
  ${alerta ? `<div class="alerta">${ic("relog")}${esc(alerta)}</div>` : ""}
  ${passos(x)}${tempo(x)}
  <div class="bnt">${tile("din", "Impacto fiscal", Z && Z.fis ? esc(Z.fis[0]) : "—", Z && Z.fis ? esc(Z.fis[1] || "") : "a ler no projeto", Z && Z.fis && /^(nenhum|R\$ 0)/i.test(Z.fis[0]) ? "ok0" : "")}
    ${tile("lei", Z && Z.lei ? Z.lei[2] || "Norma alterada" : "Norma", Z && Z.lei ? esc(Z.lei[0]) : "—", Z && Z.lei ? esc(Z.lei[1] || "") : "")}
    ${tile("rel", "Relator na " + esc(x.csig), x.rel ? `<span class="av">${esc(iniciais(x.rel))}</span>${esc(x.rel)}` : `<span class="av vz">?</span>A designar`, x.rel ? "designado em " + br(x.relDist) : `há ${x.dias ?? "—"} dias sem relator`)}
    ${tile("cal", "Protocolo", br(x.prot), `há ${ni(x.casa)} dias na Assembleia`)}
    ${dispositivos(Z) || `<div class="tl2 w2"><span class="tk">${ic("lista")}Ementa</span><span class="tv" style="font-size:13px;font-weight:400;line-height:1.5">${esc(x.ementa)}</span></div>`}${avanco(x)}</div>
  ${Z ? `<div class="dois"><div class="cx"><div class="cxh">${ic("lista")}O que muda</div>${(Z.muda || []).map(([k, a, b]) => { const [ik, cl] = MI[k] || ["seta", ""]; return `<div class="it"><span class="ic ${cl}">${ic(ik)}</span><span>${esc(a)}${b ? `<small>${esc(b)}</small>` : ""}</span></div>`; }).join("")}</div>
    <div class="cx"><div class="cxh">${ic("bal")}Por quê</div><div class="txt">${esc(Z.pq || "")}</div>${Z.fund && Z.fund.length ? `<div class="cxh" style="margin:14px 0 6px">${ic("lei")}Fundamentos citados</div><div class="fd">${Z.fund.map((f) => `<span>${esc(f)}</span>`).join("")}</div>` : ""}</div></div>` : `<div style="height:12px"></div>`}
  <div class="base">${linhaTempo(x)}${relacionadas(x, Z)}</div>
  ${Z ? "" : `<div class="aviso">O resumo desta proposição (o que muda e por quê) ainda está sendo preparado a partir do texto do projeto.</div>`}</div>`; }
function linha(x) { const d = x.dias;
  return `<div class="lin${F.ab === x.id ? " ab" : ""}" data-id="${esc(x.id)}"><div>${etq(x)}<span class="prot">protocolo ${br(x.prot)}</span></div>
    <div class="obj"><b>${RES[x.id] ? esc(RES[x.id].m) : (x.verbo ? `<span class="cmvb">${esc(x.verbo)}</span>` : "") + esc(x.resumo)}</b><small>${esc(x.ementa)}</small></div>
    <div class="aut">${esc(x.autor)}<small>${esc(temaDe(x))}</small></div>
    <div class="na"><span class="idade ${x.casa > 365 ? "l" : x.casa > 180 ? "m" : "v"}">${ni(x.casa)} dias</span><small>desde ${br(x.prot)}</small></div>
    <div class="na"><b title="${esc(x.com)}">${esc(x.csig)}</b><small>desde ${br(x.chegou)} · <span class="idade ${faixa(d)}">${d == null ? "—" : d + " dias"}</span></small></div>
    <div class="rel">${x.rel ? esc(x.rel) + `<small>desde ${br(x.relDist)}</small>` : `<span class="sem">aguardando relator</span>`}</div>
    ${fluxo(x)}${F.ab === x.id ? detalhe(x) : ""}</div>`; }
const filtradas = () => { const L = D.L.filter((x) => passa(x)), [k, s] = F.ord; return L.sort((a, b) => { const p = ORD[k](a), q = ORD[k](b); return (p > q ? 1 : p < q ? -1 : 0) * s || ORD.dias(b) - ORD.dias(a); }); };
const filtroTxt = () => [F.com, F.tipo, F.tema, F.rel && (F.rel === "(sem)" ? "sem relator" : "relator " + F.rel), F.aut && "autor " + F.aut, F.idade !== "" && ["até 30 dias", "31 a 90 dias", "mais de 90 dias"][+F.idade] + " na comissão", F.kpi && { com: "com relator", sem: "aguardando relator", velhas: "mais de 90 dias", andou: "já aprovadas em 1+" }[F.kpi], F.q && `busca “${F.q}”`].filter(Boolean).join(" · ") || "todas as proposições em comissão";
function desenhar() { kpis(D.L.filter((x) => !F.com || x.com === F.com)); comissoes();
  const L = D.L.filter((x) => passa(x)); const [k, s] = F.ord; L.sort((a, b) => { const p = ORD[k](a), q = ORD[k](b); return (p > q ? 1 : p < q ? -1 : 0) * s || ORD.dias(b) - ORD.dias(a); });
  $("#res").innerHTML = `<b>${ni(L.length)}</b> de ${ni(D.L.length)} proposições${F.com ? " em " + esc(F.com) : ""}`;
  const col = (id, t) => `<button data-o="${id}" class="${F.ord[0] === id ? "on" : ""}">${t}<i>${F.ord[0] === id ? (F.ord[1] > 0 ? "↑" : "↓") : "↕"}</i></button>`;
  if (F.vis === "lista") $("#vista").innerHTML = `<div class="lista"><div class="cab">${col("num", "Proposição")}${col("obj", "Objetivo")}${col("aut", "Autor · tema")}${col("casa", "Na Assembleia")}${col("dias", "Na comissão")}${col("rel", "Relator")}${col("fl", "Caminho nas comissões")}</div>
    ${L.slice(0, F.lim).map(linha).join("") || `<div class="vazio">Nada com estes filtros.</div>`}${L.length > F.lim ? `<button class="mais" id="mais">Mostrar mais ${ni(Math.min(60, L.length - F.lim))} de ${ni(L.length - F.lim)}</button>` : ""}</div>`;
  else { const C = (F.com ? [F.com] : D.coms.map((c) => c[0])).filter((c) => L.some((x) => x.com === c));
    $("#vista").innerHTML = `<div class="quadro">${C.map((c) => { const A = L.filter((x) => x.com === c).sort((a, b) => (b.casa || 0) - (a.casa || 0)), md = A.length ? Math.round(A.reduce((s, x) => s + (x.casa || 0), 0) / A.length) : 0; return `<section class="qc"><h3>${esc(c)}<small>${ni(A.length)} · média ${ni(md)} dias na casa</small></h3><div class="qs">${A.slice(0, 80).map((x) => `<div class="card" data-id="${esc(x.id)}"><div class="t">${etq(x)}<span style="font-size:11.5px;text-align:right"><b class="idade ${x.casa > 365 ? "l" : x.casa > 180 ? "m" : "v"}">${ni(x.casa)} d</b> <span style="color:var(--ter)">na casa</span></span></div><b>${esc(RES[x.id] ? RES[x.id].m : x.resumo)}</b><span class="tbar" title="${ni(x.casa)} dias na Assembleia, ${x.dias ?? 0} nesta comissão"><i style="flex:${Math.max(0, (x.casa || 0) - (x.dias || 0))};background:#3A4045"></i><i style="flex:${x.dias || 0};background:${x.dias > 90 ? "#E8822A" : "#A9AEB3"}"></i></span><small>${esc(x.autor)} · ${x.rel ? "relator " + esc(x.rel) : "aguardando relator"}</small>${fluxo(x)}</div>`).join("")}${A.length > 80 ? `<small style="padding:6px;color:var(--ter)">+ ${A.length - 80} na lista</small>` : ""}</div></section>`; }).join("")}</div>`; }
}
// eventos
R.addEventListener("click", (e) => { const t = e.target;
  const k = t.closest("[data-k]"); if (k) { F.kpi = F.kpi === k.dataset.k ? "" : k.dataset.k; F.lim = 60; desenhar(); return; }
  const c = t.closest("[data-c]"); if (c) { F.com = F.com === c.dataset.c ? "" : c.dataset.c; F.lim = 60; desenhar(); return; }
  const o = t.closest("[data-o]"); if (o) { const id = o.dataset.o; F.ord = F.ord[0] === id ? [id, -F.ord[1]] : [id, id === "dias" || id === "fl" || id === "casa" ? -1 : 1]; desenhar(); return; }
  const v = t.closest("[data-v]"); if (v) { F.vis = v.dataset.v; R.querySelectorAll("[data-v]").forEach((b) => b.classList.toggle("on", b === v)); desenhar(); return; }
  if (t.closest("#mais")) { F.lim += 60; desenhar(); return; }
  if (t.closest("[data-fecha]")) { F.ab = null; desenhar(); return; }
  const fi = t.closest("[data-ficha]"); if (fi) { cmpImprimir([D.L.find((x) => x.id === fi.dataset.ficha)], { fichas: 1, so: 1 }, D, RES); return; }
  if (t.closest("#impB")) { const m = R.querySelector(".impm"); if (m) { m.remove(); return; } const b = t.closest("#impB"), L = filtradas();
    const mm = document.createElement("div"); mm.className = "impm"; mm.innerHTML = `<button data-imp="l">Lista<small>${ni(L.length)} proposições, uma por linha</small></button><button data-imp="f"${L.length > 60 ? " disabled style=\"opacity:.45\"" : ""}>Lista e fichas<small>${L.length > 60 ? "filtre até 60 proposições para incluir as fichas" : "uma ficha por proposição depois da lista"}</small></button>`;
    mm.style.left = b.offsetLeft + "px"; mm.style.top = b.offsetTop + b.offsetHeight + 6 + "px"; b.parentNode.appendChild(mm); return; }
  const im = t.closest("[data-imp]"); if (im) { if (im.disabled) return; R.querySelector(".impm").remove(); cmpImprimir(filtradas(), { fichas: im.dataset.imp === "f", filtro: filtroTxt() }, D, RES); return; }
  if (t.closest("#limpa")) { Object.assign(F, { com: "", q: "", tipo: "", tema: "", rel: "", aut: "", idade: "", kpi: "", lim: 60 }); ["#q", "#fTipo", "#fTema", "#fRel", "#fAut", "#fIdade"].forEach((s) => $(s).value = ""); desenhar(); return; }
  const r = t.closest("[data-id]"); if (r) { const id = r.dataset.id; if (F.vis === "quadro") { F.vis = "lista"; R.querySelectorAll("[data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === "lista")); F.q = ""; }
    F.ab = F.ab === id ? null : id; const i = D.L.findIndex((x) => x.id === id); desenhar(); const el = R.querySelector(`.lin[data-id="${CSS.escape(id)}"]`); if (el) el.scrollIntoView({ block: "nearest" }); } });
$("#q").oninput = (e) => { F.q = e.target.value; F.lim = 60; desenhar(); };
[["#fTipo", "tipo"], ["#fTema", "tema"], ["#fRel", "rel"], ["#fAut", "aut"], ["#fIdade", "idade"]].forEach(([s, k]) => $(s).onchange = (e) => { F[k] = e.target.value; F.lim = 60; desenhar(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && F.ab && document.body.contains(R)) { F.ab = null; desenhar(); } });
const at = document.getElementById("cmpAt"); if (at) at.textContent = "e-Legis · atualizado em " + new Date(D.gerado).toLocaleDateString("pt-BR") + " às " + new Date(D.gerado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
  const comR = L.filter((x) => x.rel).length, v90 = L.filter((x) => x.dias > 90).length, mdC = L.length ? Math.round(L.reduce((s, x) => s + (x.casa || 0), 0) / L.length) : 0;
  const linhas = L.map((x, i) => { const Z = RES[x.id], t = tm(x); return `<tr><td class="c0">${i + 1}</td><td class="c1">${eto(x)}</td><td class="c3"><b>${esc(Z ? Z.m : x.resumo)}</b><small>${esc(x.autor)}</small><span class="tg2">${esc(t.filter(Boolean).join(" › "))}</span></td>
    <td class="c4"><svg viewBox="0 0 16 16" class="pt-fi">${ico(t[0])}</svg><small>${esc(curto(t[0]))}</small></td><td class="c5">${cam(x)}</td><td class="c6"><span class="rl2${x.rel ? "" : " vz"}">${esc(x.rel || "sem relator")}${x.rel && x.relDist ? `<small>desde ${br(x.relDist)}</small>` : ""}</span></td>
    <td class="c8"><span class="pt-val${x.casa > 365 ? " lg" : ""}">${ni(x.casa)} d</span></td><td class="c7"><span class="pt-val${x.dias > 90 ? " lg" : ""}">${ni(x.dias)} d</span></td></tr>`; }).join("");
  const usados = [...new Set(L.map((x) => tm(x)[0]))];
  const tipos = [...new Set(L.map((x) => x.tipo))], TN = { PL: "Projeto de lei", PLC: "Projeto de lei complementar", PEC: "Proposta de emenda à Constituição", MSV: "Mensagem de veto", PRS: "Projeto de resolução", PDL: "Projeto de decreto legislativo" };
  const ficha = (x) => { const Z = RES[x.id], t = Z && Z.t ? Z.t : [[x.tema]];
    const ev = [[x.prot, "Protocolado", 1], ...x.fluxo.filter((c) => c.dist).map((c) => [c.dist, "Relator na " + c.s + (c.rel ? " · " + c.rel : ""), 1]), ...x.fluxo.filter((c) => c.st === "ok" && c.concl).map((c) => [c.concl, c.s + " conclui" + (c.par ? " · " + c.par.toLowerCase() : ""), 1]), [x.chegou, "Chegou à " + x.csig, 1]].filter((e) => e[0]).sort((a, b) => a[0] < b[0] ? -1 : 1);
    return `<div class="fi"><div class="fih">${eto(x)}<span>${esc(x.autor)}</span><span style="margin-left:auto">${esc(x.sit)} · ${esc(x.csig)}</span></div>
    <h3>${esc(Z ? Z.m : x.resumo)}</h3><p>${esc(Z ? Z.f : x.ementa)}</p>
    <div style="margin-bottom:8px">${t.map((q) => `<span class="tm2"><b>${esc(q[0])}</b>${q[1] ? `<span>${esc(q.slice(1).filter(Boolean).join(" › "))}</span>` : ""}</span>`).join("")}</div>
    <div class="fic"><div><b>${esc(Z && Z.fis ? Z.fis[0] : "—")}</b><span>impacto fiscal</span></div><div><b>${esc(x.rel || "a designar")}</b><span>relator na ${esc(x.csig)}</span></div><div><b>${ni(x.dias)} dias</b><span>na comissão</span></div><div><b>${ni(x.casa)} dias</b><span>na Assembleia · desde ${br(x.prot)}</span></div></div>
    <div style="margin-bottom:8px">${cam(x)}</div>
    <div class="fi2"><div>${Z ? `<div class="fst">O que muda${Z.disp ? " · " + esc(Z.disp.txt || Z.disp.art + " artigos") : ""}</div><ul class="fiu">${(Z.muda || []).map(([, a, b]) => `<li>${esc(a)}${b ? ` <span style="color:#7A8085">(${esc(b)})</span>` : ""}</li>`).join("")}</ul><div class="fst" style="margin-top:8px">Por quê</div><p style="margin:0">${esc(Z.pq || "")}</p>` : `<div class="fst">Ementa</div><p style="margin:0">${esc(x.ementa)}</p>`}</div>
      <div><div class="fst">Linha do tempo</div>${ev.map(([d, s]) => `<div class="fil ok"><em>${br(d)}</em><span>${esc(s)}</span></div>`).join("")}<div class="fil"><em>—</em><span>${x.rel ? "Parecer da " + esc(x.csig) : "Relator na " + esc(x.csig)}</span></div></div></div></div>`; };
  const cab = `<div class="di-cab"><div><div class="di-wm">Simula<span>LEGIS</span></div><div class="di-wmsub">Gabinete · Processo legislativo</div></div><div class="di-meta"><b>Comissões permanentes da ALESC</b><br>gerado em ${dt} às ${hr} · dados do e-Legis de ${new Date(D.gerado).toLocaleDateString("pt-BR")}</div></div><div class="di-regra"></div>`;
  const lista = `${cab}<div class="di-tit">Proposições em tramitação nas comissões</div><div class="di-sub"><b>Filtro:</b> ${esc(o.filtro || "")} · ordem da tela</div>
  <div class="di-rres"><div><b>${ni(L.length)}</b><span>em tramitação</span></div><div class="ok"><b>${ni(comR)}</b><span>com relator · ${L.length ? Math.round(comR / L.length * 100) : 0}%</span></div><div><b>${ni(v90)}</b><span>há mais de 90 dias na comissão</span></div><div><b>${ni(mdC)} dias</b><span>média na Assembleia</span></div></div>
  <div class="di-pbar"><i class="b1" style="width:${L.length ? comR / L.length * 100 : 0}%"></i><i class="b3" style="width:${L.length ? (L.length - comR) / L.length * 100 : 0}%"></i></div>
  <div class="di-pleg"><span><i class="b1"></i>Com relator ${ni(comR)}</span><span><i class="b3"></i>Aguardando relator ${ni(L.length - comR)}</span></div>
  <table class="pt"><thead><tr><th class="c0">#</th><th class="c1">Proposição</th><th class="c3">Resumo</th><th class="c4">Tema</th><th class="c5">Caminho nas comissões</th><th class="c6">Relator</th><th class="c8">Na casa</th><th class="c7">Na comissão</th></tr></thead><tbody>${linhas}</tbody></table>
  <div class="di-lgs"><div><b>Tema</b>${usados.map((t) => `<span><svg viewBox="0 0 16 16" class="pt-fi">${ico(t)}</svg>${esc(t)}</span>`).join("")}</div>
    <div><b>Caminho</b><span class="cam"><i class="ok">CCJ</i></span>já aprovou<span class="cam"><i class="at">CCJ</i></span>está agora<span class="cam"><i>CFT</i></span>ainda passará</div>
    <div><b>Tipo</b>${tipos.map((t) => `<span>${eto({ tipo: t, num: "nº", ano: "  " }).replace("nº/  ", "nº")}${esc(TN[t] || t)}</span>`).join("")}</div>
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
  .rl2{font-size:9px;font-weight:600}.rl2 small{display:block;font-size:7.5px;color:#9AA0A4;font-weight:400}.rl2.vz{color:#9AA0A4;font-weight:400}
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
  .fiu{font-size:9px;line-height:1.45;margin:0;padding-left:12px}.tm2{display:inline-flex;font-size:7px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border:1px solid #DCDFE2;border-radius:3px;overflow:hidden;margin-right:4px}.tm2 b{background:#3F454B;color:#fff;padding:2px 4px}.tm2 span{padding:2px 4px;color:#6B7178}`;
  const corpo = o.so ? `${cab}<div class="di-tit">Ficha da proposição</div><div class="di-sub">${esc(L[0].tipo)} ${esc(L[0].num)}/${esc(L[0].ano)} · situação em ${new Date(D.gerado).toLocaleDateString("pt-BR")}</div>${ficha(L[0])}`
    : lista + (o.fichas ? `<div class="fichas">${cab}<div class="di-tit">Fichas das proposições</div><div class="di-sub">Uma ficha por proposição, na mesma ordem da lista.</div>${L.map(ficha).join("")}</div>` : "");
  w.document.open(); w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comissões da ALESC · proposições em tramitação</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet"><style>${css}</style></head><body><div class="di-agua"><span>SimulaLEGIS</span></div><div class="folha">${corpo}
    <div class="di-pagfoot"><span><b>Simula</b>LEGIS · documento gerado pelo app · uso interno do gabinete · fonte: e-Legis (ALESC)</span><span>${dt} ${hr}</span></div></div><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`); w.document.close(); }
