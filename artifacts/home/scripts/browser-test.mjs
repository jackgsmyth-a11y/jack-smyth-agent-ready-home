import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

// Uses real Chromium/Chrome over CDP, with no mocked WebMCP object.
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CHROME_BIN = process.env.CHROME || (existsSync(MAC_CHROME) ? MAC_CHROME : "chromium");
const base = process.argv[2] || "http://127.0.0.1:5173";
const profile = await mkdtemp(join(tmpdir(), "jack-browser-"));
const chrome = spawn(CHROME_BIN, [
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
  for (const vp of [
    { width: 1280, height: 900, dpr: 1, mobile: false, label: "1280px" },
    { width: 393, height: 852, dpr: 2, mobile: true, label: "393px (iPhone 15)" },
    { width: 320, height: 667, dpr: 2, mobile: true, label: "320px (narrow mobile)" },
  ]) {
    await command("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: vp.mobile });
    const navigation = await command("Page.navigate", { url: base });
    await wait(2200);
    console.log("Browser page:", JSON.stringify(await evaluate("({url:location.href,title:document.title,spotlights:document.querySelectorAll('.spotlight').length})")), navigation.errorText || "");
    check(`${vp.label}: no horizontal overflow`, await evaluate("document.documentElement.scrollWidth <= innerWidth"));
    check(`${vp.label}: experiment links stay inside the core app`, await evaluate("!!document.querySelector('.spotlight a[href=\"/experiments/facts-with-flair\"]') && !!document.querySelector('.spotlight a[href=\"/experiments/leaderbored\"]')"));
    if (vp.mobile) {
      const layoutAudit = await evaluate(`(() => {
        const issues = [];
        const mainWidth = document.querySelector('main')?.getBoundingClientRect().width || innerWidth;
        for (const bet of document.querySelectorAll('.bet')) {
          const id = bet.id || 'unknown';
          const headMain = bet.querySelector('.bet-head-main');
          const ascii = bet.querySelector('.bet-head .bet-ascii');
          const thesis = bet.querySelector('.thesis');
          if (headMain) {
            const r = headMain.getBoundingClientRect();
            const childrenBottom = Math.max(...[...headMain.children].map(c => c.getBoundingClientRect().bottom));
            const deadSpace = Math.round(r.bottom - childrenBottom);
            if (deadSpace > 32) issues.push(id + ': .bet-head-main has ' + deadSpace + 'px vertical dead space');
            const next = ascii || thesis;
            if (next) {
              const gap = Math.round(next.getBoundingClientRect().top - childrenBottom);
              if (gap > 64) issues.push(id + ': gap below heading is ' + gap + 'px (> 64px)');
            }
          }
          if (ascii) {
            const ar = ascii.getBoundingClientRect();
            if (ar.right > innerWidth + 1) issues.push(id + ': .bet-ascii overflows viewport');
            if (ar.width < (mainWidth - 40) * 0.9) issues.push(id + ': .bet-ascii too narrow on mobile (' + Math.round(ar.width) + 'px)');
          }
        }
        return issues;
      })()`);
      check(`${vp.label}: no mobile vertical dead space or lopsided headers`, layoutAudit.length === 0 || (console.error("Layout issues:", layoutAudit), false));
    }
    const shot = await command("Page.captureScreenshot", { format: "png" });
    await writeFile(`/tmp/jack-home-${vp.width}.png`, Buffer.from(shot.data, "base64"));
    if (vp.width === 393) {
      for (const secId of ["differentiation", "multimodality", "anticipation"]) {
        await evaluate(`document.getElementById(${JSON.stringify(secId)})?.scrollIntoView({ behavior: 'instant', block: 'start' })`);
        await wait(250);
        const secShot = await command("Page.captureScreenshot", { format: "png" });
        await writeFile(`/tmp/jack-home-393-${secId}.png`, Buffer.from(secShot.data, "base64"));
      }
      await evaluate("window.scrollTo(0, 0)");
    }
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
