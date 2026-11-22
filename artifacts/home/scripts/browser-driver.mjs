import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const wait = ms => new Promise(r => setTimeout(r, ms));
export async function browser() {
  const profile = await mkdtemp(join(tmpdir(), "jack-experiment-browser-"));
  const chrome = spawn("chromium", [
    "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
    "--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting",
    "--remote-debugging-port=9228", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let socket, seq = 0, interceptor;
  const pending = new Map(), errors = [], securityErrors = [];
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(Error("CDP timeout: " + method)); }, 30000);
    pending.set(id, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: r => { clearTimeout(timer); reject(r); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  try {
    let tabs;
    for (let i = 0; i < 60; i++) { try { tabs = await (await fetch("http://127.0.0.1:9228/json")).json(); break; } catch { await wait(100); } }
    const tab = tabs?.find(t => t.type === "page");
    if (!tab) throw Error("Browser did not start");
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => socket.addEventListener("open", r, { once: true }));
    socket.addEventListener("message", async ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
      if (m.method === "Log.entryAdded" && m.params.entry.source === "security" && m.params.entry.level === "error") securityErrors.push(m.params.entry.text);
      if (m.method === "Fetch.requestPaused") {
        try {
          const reply = interceptor ? await interceptor(m.params.request) : null;
          if (reply) {
            await command("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: reply.status || 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(reply.body)).toString("base64") });
          } else await command("Fetch.continueRequest", { requestId: m.params.requestId });
        } catch { errors.push("Test network-interception handler failed"); }
      }
    });
    await command("Runtime.enable"); await command("Page.enable"); await command("Log.enable");
    const evaluate = async expression => {
      const r = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (r.exceptionDetails) throw Error("Browser evaluation failed: " + r.exceptionDetails.text);
      return r.result.value;
    };
    const until = async (expression, timeout = 15000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await wait(100); }
      throw Error("Browser condition timed out");
    };
    return {
      command, evaluate, until, errors, securityErrors,
      async navigate(url, width = 1280) {
        await command("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: false });
        const result = await command("Page.navigate", { url });
        if (result.errorText) throw Error(result.errorText);
        await until("document.readyState === 'complete'"); await evaluate("document.fonts.ready.then(()=>true)");
      },
      async screenshot(path) { const r = await command("Page.captureScreenshot", { format: "png" }); await writeFile(path, Buffer.from(r.data, "base64")); },
      async intercept(fn) { interceptor = fn; await command("Fetch.enable", { patterns: [{ urlPattern: "*/api/experiments/*", requestStage: "Request" }] }); },
      async close() { socket.close(); chrome.kill(); await wait(200); await rm(profile, { recursive: true, force: true }).catch(() => {}); },
    };
  } catch (error) { socket?.close(); chrome.kill(); await rm(profile, { recursive: true, force: true }).catch(() => {}); throw error; }
}
