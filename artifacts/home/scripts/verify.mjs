import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const run = (command, args) => new Promise((resolve, reject) => {
  const p = spawn(command, args, { cwd: root, stdio: "inherit" });
  p.once("error", reject); p.once("exit", code => code === 0 ? resolve() : reject(Error(`${command} exited with ${code}`)));
});
let server;
try {
  await run("pnpm", ["--filter", "@workspace/home", "run", "typecheck"]);
  await run("pnpm", ["--filter", "@workspace/home", "run", "build"]);
  const probe = createServer();
  await new Promise(r => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port; await new Promise(r => probe.close(r));
  server = spawn(process.execPath, ["artifacts/home/dist/index.mjs"], { cwd: root, env: { ...process.env, NODE_ENV: "production", PORT: String(port) }, stdio: "inherit" });
  let exited = false; server.once("exit", () => { exited = true; });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 100 && !exited; i++) {
    try { const r = await fetch(base + "/healthz"); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  if (!ready) throw Error("Test server did not become healthy");
  for (const [script, origin] of [
    ["mcp-test.mjs", base + "/mcp"], ["protocol-test.mjs", base],
    ["experiments-test.mjs", base], ["browser-test.mjs", base], ["experiments-browser-test.mjs", base],
  ]) await run(process.execPath, ["artifacts/home/scripts/" + script, origin]);
  console.log("\nVerification passed. No real checkout or paid idea claim was performed. Provider generation is a separate opt-in test.");
} catch (error) { console.error("Verification failed:", error.message); process.exitCode = 1; }
finally { server?.kill(); }
