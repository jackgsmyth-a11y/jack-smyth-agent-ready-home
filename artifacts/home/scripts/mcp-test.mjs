// Protocol-level MCP test using the official client SDK over Streamable HTTP.
// Usage: node scripts/mcp-test.mjs [url]   (default http://localhost:5173/mcp)
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] || process.env.MCP_URL || "http://localhost:5173/mcp";
const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const json = (r) => JSON.parse(r.content[0].text);

const client = new Client({ name: "mcp-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const info = client.getServerVersion();
check("initialize handshake", info?.name === "jack-smyth-thinking", `${info?.name}@${info?.version}`);

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
const expected = ["apply_strategy", "get_positions", "get_profile", "get_style_guide", "get_work", "list_work", "search"];
check("tools/list exposes 7 tools", JSON.stringify(names) === JSON.stringify(expected), names.join(", "));
check("every tool has description + input schema", tools.every((t) => t.description && t.inputSchema));

const hasSources = (items) => items.every((i) => Array.isArray(i.sources) && i.sources.length > 0 && i.sources.every((s) => /^https?:/.test(s.url)));

let r = json(await client.callTool({ name: "get_profile", arguments: {} }));
check("get_profile: identity + 3 bets, sourced", r.identity.length >= 5 && r.bets.length === 3 && hasSources(r.identity));
check("get_profile: states limitations", r.limitations.length > 0 && /GENERATED SYNTHESIS/.test(r.notice));

r = json(await client.callTool({ name: "get_positions", arguments: { bet: "differentiation" } }));
check("get_positions(differentiation): all in-bet, labelled", r.positions.length > 5 && r.positions.every((p) => p.bet === "differentiation" && p.label));
check("get_positions: synthesis labelled as not Jack's words", r.positions.filter((p) => p.kind === "synthesis").every((p) => /GENERATED SYNTHESIS/.test(p.label)));
check("get_positions: every item has source URLs", hasSources(r.positions));
r = json(await client.callTool({ name: "get_positions", arguments: { bet: "multimodality", include_synthesis: false } }));
check("get_positions(include_synthesis=false) omits synthesis", r.positions.every((p) => p.kind !== "synthesis"));

r = json(await client.callTool({ name: "list_work", arguments: { bet: "anticipation" } }));
check("list_work(anticipation) includes native Leaderbored experiment", r.work.some((w) => w.id === "w-leaderbored" && w.status === "documented" && w.url === "/experiments/leaderbored"));
r = json(await client.callTool({ name: "list_work", arguments: { type: "experiment" } }));
check("list_work(type filter)", r.work.length >= 2 && r.work.every((w) => w.type === "experiment"));
r = json(await client.callTool({ name: "get_work", arguments: { id: "w-agent-audit" } }));
check("get_work returns item with sources", r.work.title === "Agent Audit" && r.work.sources.length > 0);
const bad = await client.callTool({ name: "get_work", arguments: { id: "nope" } });
check("get_work unknown id → isError", bad.isError === true);

r = json(await client.callTool({ name: "get_style_guide", arguments: {} }));
check("get_style_guide: principles + video briefs", r.principles.length >= 5 && r.video_briefs.length >= 3);

r = json(await client.callTool({ name: "search", arguments: { query: "YouTube video citations" } }));
check("search returns relevant, sourced hits", r.results.length > 0 && r.results.some((h) => h.type === "position"));
r = json(await client.callTool({ name: "search", arguments: { query: "zzzzqqqq" } }));
check("search with no match returns empty set", r.results.length === 0);

r = json(await client.callTool({ name: "apply_strategy", arguments: { brief: "I run a skincare brand and want AI shopping agents to recommend us, ideally using video.", audience: "brand" } }));
check("apply_strategy labelled as generated synthesis", /GENERATED SYNTHESIS/.test(r.label) && /not.*his words|not as his advice/i.test(r.how_to_cite));
check("apply_strategy picks relevant bets + sourced principles", r.applied_bets.length >= 1 && r.sourced_principles.length > 0 && hasSources(r.sourced_principles));
check("apply_strategy returns framework questions", r.framework_questions.length >= 2);
check("apply_strategy: no impersonation (no synthesis item marked as quote)", r.synthesis_moves.every((m) => m.kind === "synthesis" && /GENERATED SYNTHESIS/.test(m.label)));

let rejected = false;
try { const e = await client.callTool({ name: "apply_strategy", arguments: { brief: "x" } }); rejected = e.isError === true; } catch { rejected = true; }
check("input validation rejects too-short brief", rejected);
const toolDefs = await client.listTools();
check("All identity tools explicitly advertise read-only and idempotent hints", toolDefs.tools.every(t => t.annotations?.readOnlyHint === true && t.annotations?.destructiveHint === false && t.annotations?.idempotentHint === true));
const resources = await client.listResources();
check("MCP lists the identity, experiment and style resources", resources.resources.length === 3);
const identity = await client.readResource({ uri: "jack://identity/profile" });
check("MCP identity resource has evidence-backed claims", JSON.parse(identity.contents[0].text).identity.every(c => c.sources.length > 0));
const experiments = await client.readResource({ uri: "jack://experiments/catalog" });
check("MCP experiment resource points inside the core experience", JSON.parse(experiments.contents[0].text).experiments.every(x => x.path.startsWith("/experiments/")));
const styleResource = await client.readResource({ uri: "jack://style/principles" });
check("MCP style resource preserves the synthesis label", JSON.parse(styleResource.contents[0].text).label.includes("GENERATED SYNTHESIS"));

await client.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${url}`);
process.exit(failed ? 1 : 0);
