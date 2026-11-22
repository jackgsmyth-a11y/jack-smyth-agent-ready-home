// Automated verification for Experiment 03: Agentic Marketing Wet Lab
// Usage: node artifacts/home/scripts/wet-lab-test.mjs [baseUrl]
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = (process.argv[2] || "http://127.0.0.1:5181").replace(/\/$/, "");
let n = 0;
const check = (name, ok) => { assert.ok(ok, name); console.log("PASS ", name); n++; };

const pageRes = await fetch(base + "/experiments/wet-lab");
assert.equal(pageRes.status, 200);
const html = await pageRes.text();
check("Wet Lab HTML renders natively inside shared shell", html.includes('data-experiment="wet-lab"') && html.includes(">Jack Smyth</a>") && !html.includes("<iframe"));
check("Wet Lab Glass-Box schematic renders 5 stages with zero inline style attributes", html.includes('id="under-the-hood"') && html.includes("gemini-4-hydrogen") && html.includes("gemini-decision-1") && !html.includes('style="'));
const csp = pageRes.headers.get("content-security-policy") || "";
const nonce = html.match(/<style nonce="([^"]+)"/)?.[1];
check("Wet Lab CSP uses per-request nonce without Replit frame-ancestor", !!nonce && csp.includes(`'nonce-${nonce}'`) && !csp.includes("replit.com"));

const mdRes = await fetch(base + "/experiments/wet-lab.md");
assert.equal(mdRes.status, 200);
const md = await mdRes.text();
check("Wet Lab Markdown guide exposes pitches and A$100 cap", md.includes("Agentic Marketing Wet Lab") && md.includes("A$100 AUD"));

const negotiated = await fetch(base + "/experiments/wet-lab", { headers: { accept: "text/markdown" } });
check("Wet Lab supports text/markdown content negotiation", negotiated.headers.get("content-type")?.includes("text/markdown") && (await negotiated.text()) === md);

const cycleRes = await fetch(base + "/api/experiments/wet-lab/cycle");
const cycleData = await cycleRes.json();
check("Wet Lab cycle API returns 3 competing agent teams + hard A$100 cap", cycleData.cycle.pitches.length === 3 && cycleData.guardrails.hardCapMonthlyAud === 100);

const voteRes = await fetch(base + "/api/experiments/wet-lab/vote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ pitchId: "pitch-multimodality" }),
});
const voteData = await voteRes.json();
check("Wet Lab HTTP vote increments pitch count", voteRes.status === 200 && voteData.ok === true && voteData.votes >= 1);

const suggestRes = await fetch(base + "/api/experiments/wet-lab/suggest", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "Do verdict-first headlines outperform brand storytelling on YouTube Shorts?", submittedBy: "Test CMO" }),
});
const suggestData = await suggestRes.json();
check("Wet Lab question submission validates and stores CMO question", suggestRes.status === 201 && suggestData.ok === true);

const badSuggest = await fetch(base + "/api/experiments/wet-lab/suggest", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "too short" }),
});
check("Wet Lab rejects too-short question submissions", badSuggest.status === 400);

const client = new Client({ name: "wet-lab-mcp-test", version: "1.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(base + "/experiments/wet-lab/mcp")));
  const { tools } = await client.listTools();
  check("Wet Lab MCP exposes 4 dedicated tools", tools.length === 4 && tools.some((t) => t.name === "wet_lab_get_cycle") && tools.some((t) => t.name === "wet_lab_cast_vote"));
  const g = JSON.parse((await client.callTool({ name: "wet_lab_get_guardrails", arguments: {} })).content[0].text);
  check("Wet Lab MCP reports hard-coded A$100 cap and Google Ads MCP mode", g.hardCapMonthlyAud === 100 && g.googleAdsMcp.server === "googleads/google-ads-mcp");
  const v = JSON.parse((await client.callTool({ name: "wet_lab_cast_vote", arguments: { pitchId: "pitch-differentiation", approved: true } })).content[0].text);
  check("Wet Lab MCP casts explicitly approved vote", v.ok === true && v.votes >= 1);
} finally {
  await client.close();
}

console.log(`\n${n}/${n} Wet Lab checks passed.`);
