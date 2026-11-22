import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { browser, wait } from "./browser-driver.mjs";
const require = createRequire(import.meta.url);
const axe = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const base = (process.argv[2] || "http://127.0.0.1:5181").replace(/\/$/, "");
let count = 0;
const check = (text, value) => { assert.ok(value, text); console.log("PASS ", text); count++; };
const b = await browser();
try {
  for (const width of [1280, 390]) for (const path of ["/", "/experiments/facts-with-flair", "/experiments/leaderbored", "/experiments/field-lab"]) {
    await b.navigate(base + path, width); await wait(300);
    check(`${path} ${width}px: no horizontal overflow`, await b.evaluate("document.documentElement.scrollWidth <= innerWidth"));
    check(`${path} ${width}px: shared paper theme and actual display font`, await b.evaluate("getComputedStyle(document.body).backgroundColor==='rgb(246, 244, 238)' && document.fonts.check('600 40px \"Space Grotesk\"')"));
    await b.evaluate(axe);
    const violations = await b.evaluate("(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));})()");
    if (violations.length) console.log("Accessibility findings:", JSON.stringify(violations));
    check(`${path} ${width}px: zero automated WCAG A/AA violations`, violations.length === 0);
    await b.screenshot(`/tmp/jack-${path.split("/").filter(Boolean).at(-1) || "home"}-${width}.png`);
  }
  check("Real-page loading produced no CSP errors", b.securityErrors.length === 0);
  await b.navigate(base + "/experiments/field-lab", 1280); await wait(300);
  await b.evaluate("document.querySelector('[data-gb-tab=\"gb-p5\"]').click()");
  check("Field Lab Glass-Box tabs switch cleanly", await b.evaluate("!document.getElementById('gb-p5').hidden && document.getElementById('gb-p1').hidden"));
  await b.evaluate("document.querySelector('[data-bayes-mode=\"lower\"]').click()");
  check("Field Lab Bayesian comparator toggles down-funnel rejection readout", await b.evaluate("document.getElementById('gb-bayes-readout').textContent.includes('Automatically Rejected')"));
  // Deterministic browser-only fixtures below. They test the real page's UI
  // state machine without calling Flint, creating checkout or spending credits.
  console.log("UI workflow tests below use intercepted fixtures; they are NOT paid/provider end-to-end verification.");
  const categories = JSON.parse(await readFile(new URL("../src/data/leaderbored.json", import.meta.url), "utf8"));
  let mode = "source-blocked", claimAttempts = [], checkoutCount = 0;
  await b.intercept(req => {
    const path = new URL(req.url).pathname;
    const body = req.postData ? JSON.parse(req.postData) : {};
    if (path.endsWith("/leaderbored/categories")) return { body: { categories, sampleData: true, delivery: "bundled-october-2026-snapshot" } };
    if (path.endsWith("/facts-with-flair/extract")) {
      if (mode === "source-blocked") return { status: 422, body: { error: "Retailer blocked the page read.", code: "blocked" } };
      return { body: { token: "synthetic-source-snapshot" } };
    }
    if (path.endsWith("/facts-with-flair/draft")) {
      if (mode === "draft-error") return { status: 502, body: { error: "Draft service unavailable." } };
      return { body: { draftToken: "synthetic-draft-snapshot" } };
    }
    if (path.endsWith("/facts-with-flair/review")) return { body: {
      verdict: "FAIL", verdictLine: "One claim needs verification.", narrative: "A fixture narrative preserving a 500ml capacity.",
      specBlock: [{ label: "Capacity", value: "500ml" }], whyThisOne: [{ text: "A fixture buying decision", needsVerification: true }],
      agentSummary: ["Capacity: 500ml"], gates: Array.from({ length: 6 }, (_, i) => ({ number: i + 1, name: "Fixture QA gate", status: i === 0 ? "FAIL" : "PASS", reason: "Fixture comparison against source.", issues: i === 0 ? [{ line: "Unverified guarantee", fix: "Remove the guarantee." }] : [] })),
    } };
    if (path.endsWith("/leaderbored/checkout")) { checkoutCount++; return { status: 201, body: { sessionId: "cs_test_synthetic_receipt", checkoutUrl: "https://checkout.stripe.com/c/pay/synthetic-test", amountMinor: 100, currency: "aud", creditQuantity: 10 } }; }
    if (path.endsWith("/leaderbored/credits")) return { body: { creditsGranted: true, creditsRemaining: 10, status: "paid" } };
    if (path.endsWith("/leaderbored/claim")) {
      claimAttempts.push({ requestId: body.requestId, category: body.categoryId, approved: body.approved });
      if (claimAttempts.length === 1) return { status: 202, body: { status: "pending", pollAfterMs: 2000 } };
      if (claimAttempts.length === 2) return { status: 502, body: { error: "Simulated interrupted response." } };
      return { status: 201, body: { title: "Synthetic test concept", categoryName: "Beauty", concept: "A fixture concept.", execution: "A fixture execution.", distinction: "A fixture distinction." } };
    }
    if (path.endsWith("/leaderbored/history")) return { body: [] };
    return null;
  });
  await b.navigate(base + "/experiments/facts-with-flair", 1280); await wait(500);
  await b.evaluate("document.querySelectorAll('[data-example]')[1].click()");
  check("Product picker changes a real example without leaving the core route", await b.evaluate("document.getElementById('example-title').textContent.includes('Sony') && location.pathname==='/experiments/facts-with-flair'"));
  await b.evaluate("document.getElementById('product-url').value='https://shop.example/product';document.getElementById('flair-form').requestSubmit()");
  await b.until("!document.getElementById('paste-fallback').hidden");
  check("Blocked source read exposes paste fallback and recovers button", await b.evaluate("!document.getElementById('optimise').disabled"));
  mode = "complete";
  await b.evaluate("document.getElementById('source-text').value='A synthetic test source description with a 500ml capacity, actual materials and enough detail for a fixture-only test.';document.getElementById('flair-form').requestSubmit()");
  await b.until("!document.getElementById('flair-output').hidden");
  check("Complete staged UI renders all six gates including a failed one", await b.evaluate("document.querySelectorAll('#flair-output .gates li').length===6 && document.getElementById('flair-output').textContent.includes('FAIL')"));
  check("Failed QA is never presented as ready to publish", await b.evaluate("document.getElementById('flair-status').textContent.includes('failed QA gates')"));
  mode = "draft-error";
  await b.evaluate("document.getElementById('flair-form').requestSubmit()");
  await b.until("document.getElementById('flair-status').textContent.includes('Draft service unavailable')");
  check("Interrupted draft leaves a retryable form and no stale success", await b.evaluate("!document.getElementById('optimise').disabled && document.getElementById('flair-output').hidden"));

  await b.navigate(base + "/experiments/leaderbored", 1280); await wait(500);
  check("Browsing does not start checkout or generate an idea", checkoutCount === 0 && claimAttempts.length === 0);
  check("Claim is disabled without verified credits and human approval", await b.evaluate("document.getElementById('claim-idea').disabled && document.getElementById('approve-credit').disabled"));
  await b.evaluate("document.getElementById('buy-pack').click()");
  await b.until("!!document.querySelector('#checkout-result a')");
  check("Checkout is an explicit external hand-off, not an automatic redirect", await b.evaluate("location.pathname==='/experiments/leaderbored' && document.querySelector('#checkout-result a').target==='_blank'"));
  await b.evaluate("document.getElementById('verify-pack').click()");
  await b.until("!document.getElementById('approve-credit').disabled");
  check("Payment verification alone cannot trigger a claim", claimAttempts.length === 0 && await b.evaluate("document.getElementById('claim-idea').disabled"));
  await b.evaluate("document.getElementById('approve-credit').click();document.getElementById('claim-idea').click()");
  await b.until("document.getElementById('idea-status').textContent.includes('generating')");
  check("In-flight claim locks receipt and checkout controls", await b.evaluate("document.getElementById('receipt').readOnly && document.getElementById('buy-pack').disabled"));
  await b.until("document.getElementById('idea-status').textContent.includes('interrupted')");
  const firstId = claimAttempts[0].requestId;
  await b.evaluate("document.querySelector('[data-category=\"automotive\"]').click();document.querySelector('[data-category=\"beauty\"]').click();document.getElementById('approve-credit').click();document.getElementById('claim-idea').click()");
  await b.until("document.getElementById('idea-status').textContent.startsWith('Saved.')");
  check("Interrupted claim and manual retry reuse the identical request ID", claimAttempts.length === 3 && claimAttempts.every(x => x.requestId === firstId && x.approved));
  check("Successful claim displays deliverable and resets approval", await b.evaluate("document.getElementById('idea-output').textContent.includes('Synthetic test concept') && !document.getElementById('approve-credit').checked && document.getElementById('claim-idea').disabled"));
  check("Receipt never enters URL or local storage", await b.evaluate("!location.href.includes('cs_') && localStorage.length===0 && sessionStorage.length===0"));
  check("No uncaught JavaScript errors across real pages and fixture flows", b.errors.length === 0);
  console.log(`\n${count}/${count} experiment browser/accessibility checks passed.`);
} finally { await b.close(); }
