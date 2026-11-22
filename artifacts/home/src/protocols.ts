import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "./mcp.js";

// All adapters invoke the real MCP handlers through the SDK. There is one set of
// schemas, one validation path and one evidence-label policy, not parallel tools.
export async function withTools<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const server = buildServer();
  const client = new Client({ name: "public-read-only-adapter", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

export const PROTOCOL_MATRIX = [
  { protocol: "MCP", scope: "Stateless Streamable HTTP; seven read-only tools", endpoint: "/mcp", status: "implemented" },
  { protocol: "Agentic Field Lab MCP", scope: "Separate experiment MCP for reading the active A$100 AUD monthly media-grant cycle, inspecting hard-coded spend guardrails, submitting CMO research questions, and casting explicitly approved votes.", endpoint: "/experiments/field-lab/mcp", status: "implemented" },
  { protocol: "Leaderbored experiment MCP", scope: "Separate transactional relay to the existing service. Human permission required for payment and credit use. Never invoked by identity tools.", endpoint: "/experiments/leaderbored/mcp", status: "implemented" },
  { protocol: "Poppy 1.0", scope: "Signed-out discovery of public MCP, OpenAPI and website. No account access, session identity or commerce.", endpoint: "/.well-known/poppy.json", status: "implemented-limited-scope" },
  { protocol: "OpenAPI 3.1 / HTTP", scope: "List tools and call the same handlers with their input schemas", endpoint: "/openapi.json", status: "implemented" },
  { protocol: "A2A 1.0", scope: "JSON-RPC message-only adapter. No stored tasks, streaming, notifications or impersonation.", endpoint: "/.well-known/agent-card.json", status: "implemented-limited-scope" },
  { protocol: "WebMCP", scope: "Feature-detected imperative browser tools and a declarative search form. Native API requires a supporting browser.", endpoint: "/", status: "experimental-browser-dependent" },
  { protocol: "HTML / Markdown / JSON-LD", scope: "Server-rendered content, markdown negotiation, llms.txt, canonical JSON, robots and sitemap", endpoint: "/llms.txt", status: "implemented" },
  { protocol: "UCP / ACP / AP2", scope: "Not implemented. The identity MCP is read-only; the nested Leaderbored experiment uses its existing Stripe and transactional MCP service, not UCP/ACP/AP2.", status: "not-implemented" },
  { protocol: "NLWeb", scope: "Reviewed as a separate natural-language query stack; not advertised or implemented here. Search is available through MCP, HTTP and WebMCP.", status: "not-implemented" },
];

export function registerProtocols(app: Express, origin: (req: any) => string) {
  app.get("/protocols.json", (_req, res) => res.json({
    protocols: PROTOCOL_MATRIX,
    disclaimer: "Implementation scope, not certification or proof of a third-party agent connection. See CONNECT.md and TEST-EVIDENCE.md in the project for actual runs.",
  }));
  app.get("/api/tools", async (_req, res) => {
    const result = await withTools((c) => c.listTools());
    res.json(result);
  });
  app.get("/search", async (req, res) => {
    const query = String(req.query.q || "");
    if (query.length < 2 || query.length > 200) { res.status(400).json({ error: "Use 2–200 characters." }); return; }
    const result = await withTools((c) => c.callTool({ name: "search", arguments: { query } }));
    res.json(result);
  });
  app.post("/api/tools/call", async (req, res) => {
    if (!req.body || typeof req.body.name !== "string" || !req.body.arguments ||
        typeof req.body.arguments !== "object" || Array.isArray(req.body.arguments)) {
      res.status(400).json({ error: "Expected {name: string, arguments: object}." });
      return;
    }
    try {
      const result = await withTools((c) => c.callTool(req.body));
      res.status(result.isError ? 400 : 200).json(result);
    } catch {
      res.status(400).json({ error: "Unknown tool or invalid arguments. Read /api/tools." });
    }
  });
  app.get("/openapi.json", async (req, res) => {
    const { tools } = await withTools((c) => c.listTools());
    res.json({
      openapi: "3.1.0",
      info: { title: "Jack Smyth — public knowledge tools", version: "1.0.0", description: "Read-only source retrieval and deterministic framework synthesis, not messages or advice from Jack himself." },
      servers: [{ url: origin(req) }],
      paths: {
        "/api/tools": { get: { operationId: "listTools", summary: "Discover callable tools", responses: { "200": { description: "Tool names, descriptions and JSON input schemas" } } } },
        "/api/tools/call": { post: {
          operationId: "callTool", summary: "Run a read-only tool",
          requestBody: { required: true, content: { "application/json": { schema: {
            oneOf: tools.map((t) => ({
              type: "object", properties: { name: { const: t.name }, arguments: t.inputSchema },
              required: ["name", "arguments"], additionalProperties: false,
            })),
          } } } },
          responses: {
            "200": { description: "MCP-compatible content envelope; text contains source-labelled JSON", content: { "application/json": { schema: { type: "object", properties: { content: { type: "array", items: { type: "object" } }, isError: { type: "boolean" } }, required: ["content"] } } } },
            "400": { description: "Invalid input or tool error; not a successful result" },
          },
        } },
      },
    });
  });
  app.get("/.well-known/poppy.json", (req, res) => {
    const base = origin(req);
    res.json({
      protocol_version: "1.0",
      organization: { name: "Jack Smyth", domain: new URL(base).host },
      apis: [
        { type: "mcp", url: `${base}/mcp`, description: "Read Jack's public profile, ideas, work and style; apply documented principles as labelled synthesis. Signed out, no personal data or actions." },
        { type: "openapi", url: `${base}/openapi.json`, description: "The same read-only knowledge tools over HTTP." },
        { type: "mcp", url: `${base}/experiments/field-lab/mcp`, description: "Agentic Field Lab: inspect the active A$100 AUD monthly media-grant cycle, spend guardrails, submit CMO questions, or cast an explicitly approved vote." },
        { type: "mcp", url: `${base}/experiments/leaderbored/mcp`, description: "Leaderbored experiment: free category discovery and, only with explicit human permission, checkout and paid idea claims. Separate from identity tools; private receipts are required for credit use." },
      ],
      web: {},
    });
  });
  const card = (base: string) => ({
    name: "Jack Smyth — documented thinking",
    description: "Read-only research and framework adapter, not Jack himself. Send a text brief for labelled synthesis, or a data part {tool, arguments} for a specific MCP tool.",
    supportedInterfaces: [{ url: `${base}/a2a`, protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
    version: "1.0.0",
    documentationUrl: `${base}/#mcp`,
    capabilities: { streaming: false, pushNotifications: false, extendedAgentCard: false },
    defaultInputModes: ["text/plain", "application/json"], defaultOutputModes: ["application/json"],
    skills: [
      { id: "source-backed-thinking", name: "Retrieve and apply documented thinking", description: "Use profile, positions, work and style tools. Text briefs run through apply_strategy; no live conversation, actions, or memory.", tags: ["brand-to-agent", "GEO", "multimodality", "strategy"], examples: ["How can a skincare brand become useful to shopping agents?"] },
    ],
  });
  app.get("/.well-known/agent-card.json", (req, res) => res.json(card(origin(req))));
  app.post("/a2a", async (req, res) => {
    res.set("A2A-Version", "1.0");
    const { id = null, method, params } = req.body || {};
    const error = (code: number, message: string) => res.json({ jsonrpc: "2.0", id, error: { code, message } });
    if (req.body?.jsonrpc !== "2.0" || (typeof id !== "string" && typeof id !== "number") || typeof method !== "string") {
      error(-32600, "Invalid JSON-RPC request."); return;
    }
    const version = req.get("A2A-Version");
    if (version && version !== "1.0") { error(-32009, "Version not supported. Use A2A-Version: 1.0."); return; }
    if (method === "ListTasks") { res.json({ jsonrpc: "2.0", id, result: { tasks: [], totalSize: 0, nextPageToken: "" } }); return; }
    if (method === "GetTask" || method === "CancelTask") { error(-32001, "Task not found. This adapter returns direct messages and stores no tasks."); return; }
    if (method.includes("PushNotification")) { error(-32003, "Push notifications are not supported."); return; }
    if (["SendStreamingMessage", "SubscribeToTask", "GetExtendedAgentCard"].includes(method)) {
      error(-32004, "Unsupported operation. Consult the Agent Card."); return;
    }
    if (method !== "SendMessage") { error(-32601, "Method not found."); return; }
    const message = params?.message;
    if (message?.role !== "ROLE_USER" || typeof message.messageId !== "string" || !message.messageId ||
        !Array.isArray(message.parts) || !message.parts.length ||
        message.parts.some((p: any) => !p || Object.keys(p).filter((k) => ["text", "raw", "url", "data"].includes(k)).length !== 1)) {
      error(-32602, "Expected messageId, ROLE_USER and nonempty parts, each with one content field."); return;
    }
    if (message.taskId) { error(-32001, "Task not found."); return; }
    if (message.parts.some((p: any) => typeof p.text !== "string" && !p.data)) {
      error(-32005, "Only text and structured JSON parts are supported."); return;
    }
    const structured = message.parts.find((p: any) => p.data)?.data;
    const text = message.parts.map((p: any) => p.text || "").join("\n").trim();
    const tool = structured?.tool || "apply_strategy";
    const args = structured?.arguments || { brief: text };
    try {
      const result = await withTools((c) => c.callTool({ name: tool, arguments: args }));
      res.json({
        jsonrpc: "2.0", id, result: { message: {
          messageId: randomUUID(), role: "ROLE_AGENT",
          ...(message.contextId ? { contextId: message.contextId } : {}),
          parts: [{ data: result, mediaType: "application/json" }],
          metadata: { generatedSynthesis: tool === "apply_strategy", notJackSpeaking: true, memory: false },
        } },
      });
    } catch { error(-32602, "Unknown tool or invalid arguments. Read /api/tools."); }
  });
}
