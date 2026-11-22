import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

// Uses real Chromium over CDP, with no mocked WebMCP object.
const base = process.argv[2] || "http://127.0.0.1:5173";
const profile = await mkdtemp(join(tmpdir(), "jack-browser-"));
const chrome = spawn("chromium", [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  "--enable-experimental-web-platform-features", "--enable-features=WebMCPTesting",
  "--enable-blink-features=WebMCP", "--remote-debugging-port=9227",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
const wait = ms => new Promise(r => setTimeout(r, ms));
let socket, count = 0;
function check(name, condition) { assert.ok(condition, name); count++; console.log(`PASS  ${name}`); }
try {
  let pages;
  for (let i = 0; i < 40; i++) {
    try { pages = await (await fetch("http://127.0.0.1:9227/json")).json(); break; }
    catch { await wait(150); }
  }
  assert.ok(pages?.length, "Chromium CDP ready");
  const tab = pages.find(p => p.type === "page" && p.url === "about:blank") || pages.find(p => p.type === "page");
  assert.ok(tab, "Normal browser tab found");
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener("open", r, { once: true }));
  let seq = 0; const pending = new Map(); const exceptions = [];
  socket.addEventListener("message", ev => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.text);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      m.error ? reject(m.error) : resolve(m.result);
    }
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await command("Runtime.enable"); await command("Page.enable");
  for (const width of [1280, 390]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    const navigation = await command("Page.navigate", { url: base });
    await wait(2200);
    console.log("Browser page:", JSON.stringify(await evaluate("({url:location.href,title:document.title,spotlights:document.querySelectorAll('.spotlight').length})")), navigation.errorText || "");
    check(`${width}px: no horizontal overflow`, await evaluate("document.documentElement.scrollWidth <= innerWidth"));
    check(`${width}px: experiment links stay inside the core app`, await evaluate("!!document.querySelector('.spotlight a[href=\"/experiments/facts-with-flair\"]') && !!document.querySelector('.spotlight a[href=\"/experiments/leaderbored\"]')"));
    const shot = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(`/tmp/jack-home-${width}.png`, Buffer.from(shot.data, "base64"));
  }
  await evaluate("document.getElementById('q').value='Flint'; document.getElementById('f').requestSubmit();");
  await wait(700);
  check("Human search produces sourced results", await evaluate("document.querySelectorAll('#answer .hit').length > 0"));
  const state = await evaluate("({native: !!document.modelContext, legacy: !!navigator.modelContext, registration: document.documentElement.dataset.webmcp})");
  console.log("WebMCP browser capability:", JSON.stringify(state));
  if (state.registration === "ready") {
    const nativeResult = await evaluate(`(async()=> {
      const api=document.modelContext||navigator.modelContext;
      if(!api.getTools||!api.executeTool) return {registration:true,canTestCalls:false};
      const tools=await api.getTools();
      const tool=tools.find(t=>t.name==='get_work');
      const result=await api.executeTool(tool,{id:'w-fwf'});
      return {names:tools.map(t=>t.name),result};
    })()`);
    if (nativeResult.canTestCalls === false) {
      console.log("SKIP native discovery/execution: browser lacks getTools/executeTool; registration only was verified.");
    } else {
      check("Native WebMCP exposes imperative tools", nativeResult.names.includes("get_profile") && nativeResult.names.includes("apply_strategy"));
      check("Native WebMCP tool retrieves the native experiment", JSON.stringify(nativeResult.result).includes("/experiments/facts-with-flair"));
      console.log("Native tools:", nativeResult.names.join(", "));
      const declarative = await evaluate(`(async()=>{
        const api=document.modelContext||navigator.modelContext;
        const tools=await api.getTools();
        return await api.executeTool(tools.find(t=>t.name==='search_knowledge_form'),{q:'Flint'});
      })()`);
      check("Native declarative WebMCP form returns search results", JSON.stringify(declarative).includes("Facts with Flair"));
    }
  } else {
    console.log("SKIP native WebMCP execution: not available/permitted in this Chromium. Remote protocols tested independently.");
  }
  check("No uncaught browser exceptions", exceptions.length === 0);
  console.log(`\n${count}/${count} browser checks passed.`);
} finally {
  socket?.close(); chrome.kill(); await wait(200); await rm(profile, { force: true, recursive: true }).catch(() => {});
}
