import assert from "node:assert/strict";

const base = process.argv[2] || "http://127.0.0.1:5173";

// 1. Check homepage SEO + AI visibility tags & ProfilePage JSON-LD
const homeRes = await fetch(`${base}/`);
assert.equal(homeRes.status, 200);
const homeHtml = await homeRes.text();
assert.match(homeHtml, /max-image-preview:large/, "Missing max-image-preview:large robots meta");
assert.match(homeHtml, /og:image" content="[^"]+\/og-image\.svg"/, "Missing og:image meta");
assert.match(homeHtml, /twitter:card" content="summary_large_image"/, "Missing summary_large_image");
assert.match(homeHtml, /"@type":"ProfilePage"/, "Missing ProfilePage JSON-LD on homepage");
assert.match(homeHtml, /<script src="\/telemetry\.js" defer><\/script>/, "Missing telemetry.js script");

// 2. Check /og-image.svg
const ogRes = await fetch(`${base}/og-image.svg`);
assert.equal(ogRes.status, 200);
assert.match(ogRes.headers.get("content-type") || "", /image\/svg\+xml/);

// 3. Check /sitemap.xml includes <lastmod> and /reflections
const smRes = await fetch(`${base}/sitemap.xml`);
assert.equal(smRes.status, 200);
const smXml = await smRes.text();
assert.match(smXml, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, "Missing <lastmod> in sitemap.xml");
assert.match(smXml, /\/reflections<\/loc>/, "Missing /reflections in sitemap.xml");

// 4. Check experiment page has TechArticle + BreadcrumbList JSON-LD
const expRes = await fetch(`${base}/experiments/facts-with-flair`);
assert.equal(expRes.status, 200);
const expHtml = await expRes.text();
assert.match(expHtml, /"@type":"TechArticle"/, "Missing TechArticle JSON-LD on experiment page");
assert.match(expHtml, /"@type":"BreadcrumbList"/, "Missing BreadcrumbList JSON-LD on experiment page");

// 5. Check /telemetry.js serves fetchLater() + polyfill
const telJs = await (await fetch(`${base}/telemetry.js`)).text();
assert.match(telJs, /fetchLater/, "telemetry.js must use fetchLater");

// 6. Check POST /api/telemetry ingests events + CWV and updates /api/self-opt/summary
const postRes = await fetch(`${base}/api/telemetry`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    events: [
      { type: "page_view", path: "/", detail: { refHost: "google.com" } },
      { type: "lens_switch", path: "/", detail: { mode: "agent" } },
      { type: "experiment_click", path: "/", detail: { to: "/experiments/field-lab" } },
      { type: "cwv", path: "/", detail: { lcpMs: 820, cls: 0.01, inpMs: 42, ttfbMs: 110 } },
    ],
  }),
});
assert.equal(postRes.status, 204);

// Trigger an agent crawler hit
await fetch(`${base}/llms.txt`, { headers: { "User-Agent": "Google-Extended/1.0" } });

const sumRes = await fetch(`${base}/api/self-opt/summary`);
assert.equal(sumRes.status, 200);
const summary = await sumRes.json();
assert.ok(summary.human.totalPageViews >= 1, "Expected page view recorded");
assert.ok(summary.human.lensSwitches.agent >= 1, "Expected agent lens switch recorded");
assert.equal(summary.human.cwvP75.lcpMs, 820, "Expected CWV LCP recorded");
assert.ok(summary.agents.byAgent["Google-Extended"] >= 1, "Expected Google-Extended crawler recorded");

// 7. Check /reflections (HTML + Markdown) and auth guard on /api/self-opt/reflect
const refHtmlRes = await fetch(`${base}/reflections`);
assert.equal(refHtmlRes.status, 200);
const refHtml = await refHtmlRes.text();
assert.match(refHtml, /Self-Optimising Reflections/);

const refMdRes = await fetch(`${base}/reflections.md`);
assert.equal(refMdRes.status, 200);
assert.match(await refMdRes.text(), /# Self-Optimising Reflection Log/);

const unauthReflect = await fetch(`${base}/api/self-opt/reflect`, { method: "POST" });
assert.ok([401, 503].includes(unauthReflect.status), "POST /api/self-opt/reflect must require auth/config");

console.log("Self-opt, SEO/AI visibility, and dual telemetry tests passed.");
