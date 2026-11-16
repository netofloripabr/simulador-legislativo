// Captura da capa/mapa 3D com o Chrome sem janela (ver DESIGN-GABINETE.md §10). 16/11/2026.
// Uso: node foto-tela.mjs <url> <saida.jpg> [largura=1440] [altura=900] [js opcional]
// Precisa do Chrome aberto com --headless=new --remote-debugging-port=9334 --use-angle=metal --enable-webgl --ignore-gpu-blocklist
// captura com um passo de interação opcional (js) depois do mapa pronto
const [,, url, saida, LW = "1440", LH = "900", JS = ""] = process.argv;
const alvo = await (await fetch("http://127.0.0.1:9334/json/new?" + encodeURIComponent("about:blank"), { method: "PUT" })).json();
const ws = new WebSocket(alvo.webSocketDebuggerUrl); let id = 0; const esp = {};
const cmd = (method, params = {}) => new Promise((ok, err) => { const i = ++id; esp[i] = { ok, err }; ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && esp[m.id]) { m.error ? esp[m.id].err(new Error(JSON.stringify(m.error))) : esp[m.id].ok(m.result); delete esp[m.id]; } };
await new Promise((ok) => ws.onopen = ok);
await cmd("Emulation.setDeviceMetricsOverride", { width: +LW, height: +LH, deviceScaleFactor: 2, mobile: false });
await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Page.navigate", { url });
await new Promise((ok) => setTimeout(ok, 40000));
if (JS) { await cmd("Runtime.evaluate", { expression: JS, awaitPromise: true }); await new Promise((ok) => setTimeout(ok, 4000)); }
const r = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 88 });
(await import("node:fs")).writeFileSync(saida, Buffer.from(r.data, "base64")); console.log("ok", saida); process.exit(0);
