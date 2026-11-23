// Real HTTP checks. This is a scoped interoperability smoke test, not a
// certification by Google, Sierra, the A2A project or a hosted assistant.
import assert from "node:assert/strict";
const base = (process.argv[2] || "http://127.0.0.1:5173").replace(/\/$/, "");
let count = 0;
function check(name, condition) {
  assert.ok(condition, name); count++; console.log(`PASS  ${name}`);
}
const get = async (path, headers) => {
  const response = await fetch(base + path, { headers, signal: AbortSignal.timeout(15000) });
  check(`GET ${path}: HTTP 200`, response.status === 200);
  return response;
};
const json = async (path, headers) => (await get(path, headers)).json();
const post = (path, body, headers = {}) => fetch(base + path, {
  method: "POST", headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
});
const knowledge = await json("/knowledge.json");
const fwf = knowledge.work.find(w => w.id === "w-fwf");
const lb = knowledge.work.find(w => w.id === "w-leaderbored");
check("Facts with Flair is sourced and lives inside the core app", fwf.status === "documented" && fwf.url === "/experiments/facts-with-flair" && fwf.service_url === "https://pencil-product-copy.replit.app");
check("Leaderbored is sourced and correctly limits payment claims", lb.status === "documented" && /human approval/.test(lb.summary));
const hbr = knowledge.work.filter(w => w.id.startsWith("w-hbr-"));
check("Both HBR articles present with published bylines", hbr.length === 2 && hbr.every(w => w.authors.includes("John Dawson") && w.authors.includes("David Dubois")));
check("HBR owner-reported contribution is not a verified byline", hbr.every(w => !w.authors.includes("Jack Smyth") && /owner-reported/i.test(w.summary)));
check("ADWEEK and Mumbrella authored work discovered", knowledge.work.some(w => w.id === "w-adweek") && knowledge.work.some(w => w.id === "w-mumbrella"));

const md = await (await get("/llms.txt")).text();
check("llms.txt includes real app links and protocol discovery", md.includes(fwf.url) && md.includes(lb.url) && md.includes("Poppy 1.0"));
const negotiated = await get("/", { accept: "text/markdown" });
check("Markdown content negotiation and Vary header", negotiated.headers.get("content-type").includes("text/markdown") && negotiated.headers.get("vary").includes("Accept"));
check("Canonical markdown equals llms.txt", await negotiated.text() === md);
const html = await (await get("/")).text();
check("Server-rendered HTML contains all three bets", ["Differentiation", "Multimodality", "Anticipation"].every(b => html.includes(b)));
check("No JavaScript needed to discover work and sources", html.includes("Facts with flair.") && html.includes("Harvard Business Review") && html.includes("https://jacksmyth.fyi/experiments/leaderbored.md"));
const ld = JSON.parse(html.match(/<script[^>]*type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
check("HBR JSON-LD uses published authors, not Jack", ld["@graph"].filter(n => n.url?.includes("hbr.org")).every(n => Array.isArray(n.author) && !JSON.stringify(n.author).includes("#jack")));
check("WebMCP declarative search form annotated", html.includes('toolname="search_knowledge_form"') && html.includes('toolparamdescription='));
check("WebMCP progressive enhancement included", html.includes('src="/webmcp.js"'));
await get("/robots.txt"); await get("/sitemap.xml"); await get("/index.md");

const poppy = await json("/.well-known/poppy.json");
check("Poppy version, organization and at least one channel", poppy.protocol_version === "1.0" && poppy.organization.name === "Jack Smyth" && poppy.apis.length >= 1);
check("Poppy host matches served host", poppy.organization.domain === new URL(base).host);
check("Poppy is signed-out: no OAuth or session promises", !poppy.auth && !poppy.web.browser_session_endpoint && !poppy.agent && !poppy.tasks);
check("Poppy points to actual MCP and OpenAPI channels", poppy.apis.some(a => a.type === "mcp" && a.url === base + "/mcp") && poppy.apis.some(a => a.type === "openapi" && a.url === base + "/openapi.json"));
const oauth = await fetch(base + "/.well-known/oauth-protected-resource");
check("No OAuth issuer advertised (404 is required fallback)", oauth.status === 404);
const tlsPoppy = await json("/.well-known/poppy.json", { "x-forwarded-proto": "https" });
check("HTTPS discovery emits HTTPS URLs", tlsPoppy.apis.every(a => a.url.startsWith("https://")));
const openapi = await json("/openapi.json");
check("OpenAPI 3.1 has seven real tool input schemas", openapi.openapi === "3.1.0" && openapi.paths["/api/tools/call"].post.requestBody.content["application/json"].schema.oneOf.length === 7);
const tools = await json("/api/tools");
check("HTTP discovery lists same seven MCP tools", tools.tools.length === 7);
let response = await post("/api/tools/call", { name: "get_work", arguments: { id: "w-fwf" } });
let out = await response.json();
check("HTTP tool execution returns sourced app", response.status === 200 && JSON.parse(out.content[0].text).work.url === fwf.url);
response = await post("/api/tools/call", { name: "apply_strategy", arguments: { brief: "x" } });
check("HTTP validates against actual MCP schema", response.status === 400);
response = await post("/api/tools/call", { name: "buy_an_idea", arguments: {} });
check("No commerce actions accepted by identity service", response.status === 400);
const fallback = await (await get("/search?q=Flint")).json();
check("No-JS search route works", JSON.parse(fallback.content[0].text).results.length > 0);
response = await fetch(base + "/api/tools/call", { method: "OPTIONS", headers: { origin: "https://agent.example", "access-control-request-method": "POST" } });
check("Cross-origin preflight for public tools works", response.status === 204 && response.headers.get("access-control-allow-origin") === "*");

const card = await json("/.well-known/agent-card.json");
check("A2A card advertises 1.0 JSONRPC and bounded capabilities", card.supportedInterfaces[0].protocolVersion === "1.0" && card.supportedInterfaces[0].protocolBinding === "JSONRPC" && card.capabilities.streaming === false);
const rpc = async (method, params) => (await post("/a2a", { jsonrpc: "2.0", id: 42, method, params }, { "A2A-Version": "1.0" })).json();
out = await rpc("SendMessage", { message: { role: "ROLE_USER", messageId: crypto.randomUUID(), parts: [{ text: "How should a brand use video to help AI shopping agents?" }] } });
check("A2A SendMessage returns direct ROLE_AGENT message", out.result.message.role === "ROLE_AGENT" && !!out.result.message.messageId);
check("A2A response labels synthesis and not Jack speaking", out.result.message.metadata.notJackSpeaking && JSON.parse(out.result.message.parts[0].data.content[0].text).label.includes("GENERATED SYNTHESIS"));
out = await rpc("SendMessage", { message: { role: "ROLE_USER", messageId: crypto.randomUUID(), parts: [{ data: { tool: "get_work", arguments: { id: "w-hbr-2025" } } }] } });
check("A2A structured retrieval reaches same HBR record", JSON.parse(out.result.message.parts[0].data.content[0].text).work.id === "w-hbr-2025");
out = await rpc("SendStreamingMessage", {});
check("A2A refuses unadvertised streaming", out.error.code === -32004);
out = await rpc("GetTask", { id: "not-a-task" });
check("A2A does not invent task state", out.error.code === -32001);
out = await rpc("ListTasks", {});
check("A2A stores no tasks", out.result.tasks.length === 0);
out = await rpc("SendMessage", { message: { role: "ROLE_AGENT", parts: [] } });
check("A2A rejects malformed messages", out.error.code === -32602);
out = await rpc("charge_card", {});
check("A2A rejects unknown operations", out.error.code === -32601);
const matrix = await json("/protocols.json");
check("Unimplemented commerce protocols are not falsely advertised", matrix.protocols.some(p => p.protocol.includes("UCP") && p.status === "not-implemented"));
console.log(`\n${count}/${count} HTTP/protocol checks passed against ${base}.`);
console.log("Scope: MCP client checks run separately. Native WebMCP browser checks run separately. No hosted third-party assistant or public deployment is implied.");
