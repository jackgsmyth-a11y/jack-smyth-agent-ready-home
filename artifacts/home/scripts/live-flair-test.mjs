// Opt-in: one extracted product, one Flint draft and one Flint review. No
// regeneration, checkout, credit use or database persistence in the core app.
// Signed snapshots stay in process memory and are never printed or saved.
import assert from "node:assert/strict";
const base = (process.argv[2] || "http://127.0.0.1:5181").replace(/\/$/, "");
if (!process.argv.includes("--allow-model-call")) {
  console.error("Opt-in required: pass an origin followed by --allow-model-call. This uses the existing Facts with Flair provider service.");
  process.exit(2);
}
const deadline = Date.now() + 245000;
async function call(step, body) {
  const time = Math.min(115000, deadline - Date.now());
  if (time < 1000) throw Error("Bounded live test deadline reached; no retry attempted.");
  const r = await fetch(`${base}/api/experiments/facts-with-flair/${step}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(time),
  });
  const data = await r.json();
  if (!r.ok) {
    // Print only status and step, never signed snapshots or provider messages.
    const error = new Error(`${step}: HTTP ${r.status}`); error.status = r.status; throw error;
  }
  return data;
}
try {
  const examples = await (await fetch(base + "/api/experiments/facts-with-flair/examples")).json();
  const example = examples.examples[0];
  let source, mode = "public-page";
  try { source = await call("extract", { url: example.sourceUrl }); }
  catch (error) {
    if (![422, 502].includes(error.status)) throw error;
    mode = "pasted-retailer-excerpt";
    source = await call("extract", { url: example.sourceUrl, sourceText: example.sourceExcerpt });
  }
  assert.ok(source.token);
  console.log("PASS live source extraction via core adapter; mode:", mode);
  const draft = await call("draft", { sourceToken: source.token });
  assert.ok(draft.draftToken);
  console.log("PASS live Flint draft via core adapter (signed intermediate not logged)");
  const result = await call("review", { draftToken: draft.draftToken });
  assert.ok(["PASS", "FAIL"].includes(result.verdict));
  assert.equal(result.gates.length, 6);
  assert.ok(typeof result.narrative === "string" && result.narrative.length > 0);
  assert.equal(result.whyThisOne.length, 3);
  assert.deepEqual(result.specBlock, source.specs);
  console.log("PASS live Flint review returned narrative, an unchanged extracted spec block, three reasons and six gates");
  console.log("Extracted spec count:", source.specs.length, "; no extra attributes were invented to make the test pass.");
  console.log("QA verdict:", result.verdict, "; failed gate numbers:", result.gates.filter(g => g.status === "FAIL").map(g => g.number).join(",") || "none");
  console.log("A PASS here proves workflow execution, not independent factual verification or ranking uplift.");
  console.log("No checkout, payment or paid idea credit was used.");
} catch (error) {
  console.error("LIVE WORKFLOW NOT VERIFIED:", error.name, /^(extract|draft|review): HTTP \d+$/.test(error.message) ? error.message : "Bounded workflow check failed; no automatic model retry.");
  process.exitCode = 1;
}
