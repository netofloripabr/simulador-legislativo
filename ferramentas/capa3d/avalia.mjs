// Igual ao foto-tela.mjs, mas imprime o resultado do JS (RES) e os erros do console da página (ERRS).
// Use para testar cliques (seletor, análises, balão) sem depender só de imagem. 16/11/2026.
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
const errs = []; ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.method === "Runtime.exceptionThrown") errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push(m.params.args.map((a) => a.value || a.description).join(" ")); }); if (JS) { const r = await cmd("Runtime.evaluate", { expression: JS, awaitPromise: true, returnByValue: true }); console.log("RES", JSON.stringify(r.result.value || r.exceptionDetails)); await new Promise((ok) => setTimeout(ok, 1500)); } console.log("ERRS", JSON.stringify(errs.slice(0, 5)));
const r = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 88 });
(await import("node:fs")).writeFileSync(saida, Buffer.from(r.data, "base64")); console.log("ok", saida); process.exit(0);
