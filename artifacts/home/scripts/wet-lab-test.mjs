// Automated verification for Experiment 03: Agentic Field Lab
// Usage: node artifacts/home/scripts/wet-lab-test.mjs [baseUrl]
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = (process.argv[2] || "http://127.0.0.1:5181").replace(/\/$/, "");
let n = 0;
const check = (name, ok) => { assert.ok(ok, name); console.log("PASS ", name); n++; };

const pageRes = await fetch(base + "/experiments/field-lab?utm_source=google_ads&utm_medium=demand_gen&utm_campaign=cycle_2026_11&utm_content=variant_a", {
  headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" },
});
assert.equal(pageRes.status, 200);
const html = await pageRes.text();
check("Field Lab HTML renders natively inside shared shell", html.includes('data-experiment="field-lab"') && html.includes(">Jack Smyth</a>") && !html.includes("<iframe"));
const liveRes = await fetch(base + "/api/experiments/field-lab/live");
const liveData = await liveRes.json();
check("Field Lab records server-side UTM landing views and exposes Skeptic funnelHealth", liveData.variants.variantA.serverLandingViews >= 1 && typeof liveData.funnelHealth?.status === "string" && typeof liveData.funnelHealth?.shouldHaltSpend === "boolean");
check("Field Lab copy emphasises research/compute analogy with zero legacy Wet Lab wording", /pitch for compute/i.test(html) && !/wet lab/i.test(html));
check("Field Lab Glass-Box schematic renders 5 stages with zero inline style attributes", html.includes('id="under-the-hood"') && html.includes("gemini-4-hydrogen") && html.includes("gemini-decision-1") && !html.includes('style="'));
const csp = pageRes.headers.get("content-security-policy") || "";
const nonce = html.match(/<style nonce="([^"]+)"/)?.[1];
check("Field Lab CSP uses per-request nonce without Replit frame-ancestor", !!nonce && csp.includes(`'nonce-${nonce}'`) && !csp.includes("replit.com"));

const mdRes = await fetch(base + "/experiments/field-lab.md");
assert.equal(mdRes.status, 200);
const md = await mdRes.text();
check("Field Lab Markdown guide exposes pitches, compute analogy, and A$100 cap", md.includes("# Agentic Field Lab") && md.includes("pitch for compute") && md.includes("A$100 AUD") && !/wet lab/i.test(md));

const negotiated = await fetch(base + "/experiments/field-lab", { headers: { accept: "text/markdown" } });
check("Field Lab supports text/markdown content negotiation", negotiated.headers.get("content-type")?.includes("text/markdown") && (await negotiated.text()) === md);

// Permanent 301 redirects for legacy Wet Lab URLs (crawler/SEO hygiene)
const legacyHtml = await fetch(base + "/experiments/wet-lab", { redirect: "manual" });
check("Legacy /experiments/wet-lab returns 301 to /experiments/field-lab", legacyHtml.status === 301 && legacyHtml.headers.get("location") === "/experiments/field-lab");
const legacyMd = await fetch(base + "/experiments/wet-lab.md", { redirect: "manual" });
check("Legacy /experiments/wet-lab.md returns 301 to /experiments/field-lab.md", legacyMd.status === 301 && legacyMd.headers.get("location") === "/experiments/field-lab.md");

const cycleRes = await fetch(base + "/api/experiments/field-lab/cycle");
const cycleData = await cycleRes.json();
check("Field Lab cycle API returns 3 competing agent teams + hard A$100 cap", cycleData.cycle.pitches.length === 3 && cycleData.guardrails.hardCapMonthlyAud === 100);
check("Cycle 01 winner aligns across hero circuit and API (Team Differentiation 81/100)", cycleData.cycle.pitches[0].id === "pitch-differentiation" && cycleData.cycle.pitches[0].judge.total === 81);

const voteRes = await fetch(base + "/api/experiments/field-lab/vote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ pitchId: "pitch-multimodality" }),
});
const voteData = await voteRes.json();
check("Field Lab HTTP vote increments pitch count", voteRes.status === 200 && voteData.ok === true && voteData.votes >= 1);

const suggestRes = await fetch(base + "/api/experiments/field-lab/suggest", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "Do verdict-first headlines outperform brand storytelling on YouTube Shorts?", submittedBy: "Test CMO" }),
});
const suggestData = await suggestRes.json();
check("Field Lab question submission validates and stores CMO question", suggestRes.status === 201 && suggestData.ok === true);

const badSuggest = await fetch(base + "/api/experiments/field-lab/suggest", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "too short" }),
});
check("Field Lab rejects too-short question submissions", badSuggest.status === 400);

const unauthSwarm = await fetch(base + "/api/experiments/field-lab/run-cycle", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({}),
});
check("Field Lab autonomous swarm trigger refuses unauthenticated callers", unauthSwarm.status === 401 || unauthSwarm.status === 503);

// Agent & crawler discovery coherence checks across all surfaces
const [homeHtml, llmsTxt, agentsMd, sitemapXml, poppyJson, protocolsJson, ogSvg] = await Promise.all([
  fetch(base + "/").then((r) => r.text()),
  fetch(base + "/llms.txt").then((r) => r.text()),
  fetch(base + "/agents.md").then((r) => r.text()),
  fetch(base + "/sitemap.xml").then((r) => r.text()),
  fetch(base + "/.well-known/poppy.json").then((r) => r.json()),
  fetch(base + "/protocols.json").then((r) => r.json()),
  fetch(base + "/og-image.svg").then((r) => r.text()),
]);
check("Homepage HTML & JSON-LD Dataset use Agentic Field Lab with zero Wet Lab references", homeHtml.includes("/experiments/field-lab") && homeHtml.includes("Agentic Field Lab — Open CMO Ad Experiments") && !/wet lab/i.test(homeHtml));
check("llms.txt & agents.md advertise /experiments/field-lab and /experiments/field-lab/mcp", llmsTxt.includes("/experiments/field-lab/mcp") && agentsMd.includes("/experiments/field-lab/mcp") && !/wet lab/i.test(llmsTxt) && !/wet lab/i.test(agentsMd));
check("sitemap.xml lists /experiments/field-lab and not /experiments/wet-lab", sitemapXml.includes("/experiments/field-lab</loc>") && !sitemapXml.includes("/experiments/wet-lab"));
check("Poppy 1.0 & protocols.json advertise Agentic Field Lab MCP", poppyJson.apis.some((a) => a.url.endsWith("/experiments/field-lab/mcp")) && protocolsJson.protocols.some((p) => p.endpoint === "/experiments/field-lab/mcp"));
check("OG image SVG reflects Agentic Field Lab", ogSvg.includes("Agentic Field Lab") && !/wet lab/i.test(ogSvg));

const client = new Client({ name: "field-lab-mcp-test", version: "1.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(base + "/experiments/field-lab/mcp")));
  const { tools } = await client.listTools();
  check("Field Lab MCP exposes 4 dedicated tools", tools.length === 4 && tools.some((t) => t.name === "field_lab_get_cycle") && tools.some((t) => t.name === "field_lab_cast_vote"));
  const g = JSON.parse((await client.callTool({ name: "field_lab_get_guardrails", arguments: {} })).content[0].text);
  check("Field Lab MCP reports hard-coded A$100 cap and Google Ads MCP mode", g.hardCapMonthlyAud === 100 && g.googleAdsMcp.server === "googleads/google-ads-mcp");
  const v = JSON.parse((await client.callTool({ name: "field_lab_cast_vote", arguments: { pitchId: "pitch-differentiation", approved: true } })).content[0].text);
  check("Field Lab MCP casts explicitly approved vote", v.ok === true && v.votes >= 1);
} finally {
  await client.close();
}

console.log(`\n${n}/${n} Agentic Field Lab checks passed.`);
