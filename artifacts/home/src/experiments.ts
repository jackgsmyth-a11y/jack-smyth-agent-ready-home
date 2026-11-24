import type { Express, Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import flair from "./data/flair.json";
import categories from "./data/leaderbored.json";
import { page } from "./site.js";
import { experimentScript } from "./experiment-client.js";
import { EXPERIMENTS } from "./experiment-catalog.js";
import {
  buildLeaderboredMcpServer,
  claimNativeIdea,
  createNativeCheckout,
  getNativeCategoriesPayload,
  listNativeHistory,
  verifyNativeCredits,
} from "./leaderbored-native.js";
export { EXPERIMENTS } from "./experiment-catalog.js";

export const RETAIL = flair;
export const CATEGORY_SNAPSHOT = categories;
const e = (x: unknown) => String(x ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const RESEARCH: Record<string, { title: string; url: string }> = {
  "openai-shopping": { title: "OpenAI shopping research", url: "https://openai.com/index/chatgpt-shopping-research" },
  shoppingcomp: { title: "ShoppingComp: grounding and constraints", url: "https://arxiv.org/html/2511.22978" },
  "openai-commerce": { title: "OpenAI commerce: beyond copy", url: "https://developers.openai.com/commerce/guides/key-concepts" },
};
function highlight(text: string, highlights: { phrase: string }[]) {
  const spans = highlights.map((h, n) => ({ start: text.indexOf(h.phrase), end: text.indexOf(h.phrase) + h.phrase.length, n })).filter(s => s.start >= 0).sort((a, b) => a.start - b.start);
  let out = "", cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    out += e(text.slice(cursor, s.start)) + `<mark aria-describedby="example-note-${s.n}">${e(text.slice(s.start, s.end))}</mark>`;
    cursor = s.end;
  }
  return out + e(text.slice(cursor));
}
const provider = `<a href="https://springboards.ai/models/flint-alpha" rel="noopener">Flint from Springboards</a>`;
const breadcrumb = (bet: string, name: string) => `<div class="crumb"><a href="/">Jack Smyth</a><span>/</span><a href="/#${bet}">${bet[0].toUpperCase() + bet.slice(1)}</a><span>/</span><span>${name}</span></div>`;
function comparison(example: typeof flair.examples[number]) {
  return `<div class="section-top"><h3 id="example-title">${e(example.productName)}</h3><span class="quiet">${e(example.retailer)} · checked ${e(example.sourceCheckedAt)}</span></div>
  <div class="split"><article class="surface"><div class="eyebrow">The source</div><p class="source-copy" id="source-copy">${e(example.sourceExcerpt)}</p><a id="source-link" class="quiet" href="${e(example.sourceUrl)}" rel="noopener">Open the retailer source ↗</a></article>
  <article class="surface"><div class="eyebrow">A different frame · same source facts</div><h3 id="rewrite-headline">${e(example.headline)}</h3><p class="reframed" id="rewrite-copy">${highlight(example.description, example.highlights)}</p><div class="facts" id="fact-chips">${example.facts.map(f => `<span>${e(f.label)} · ${e(f.value)}</span>`).join("")}</div></article></div>
  <div class="surface"><div class="eyebrow">What changed</div><p id="what-changed">${e(example.meaningfulChange)}</p><ul class="reasons" id="example-reasons">${example.highlights.map((h, i) => `<li id="example-note-${i}"><b>${e(h.phrase)}</b><br>${e(h.explanation)}${RESEARCH[h.researchId] ? ` <a class="fine" href="${RESEARCH[h.researchId].url}">${RESEARCH[h.researchId].title} ↗</a>` : ""}</li>`).join("")}</ul><p class="fine">Pre-generated with Flint, editorially refined and separately reviewed. This is not the live six-gate QA certification.</p></div>`;
}
function categoryView(category: typeof categories[number]) {
  return `<div class="section-top"><h3 id="category-name">${e(category.name)}</h3><span class="tag">Sample data · ${e(category.latestMonth)}</span></div><p class="quiet">These are reference themes, not verified advertising research or measured market share.</p><div id="category-patterns">${category.patterns.map(p => `<div class="theme"><strong>${e(p.theme)}</strong><p>${e(p.keywords.join(" · "))}</p><span class="fine">${p.frequency} sample ${p.frequency === 1 ? "row" : "rows"}</span></div>`).join("")}</div>`;
}
export function experimentMarkdown(id: string, base: string) {
  const exp = EXPERIMENTS.find(x => x.id === id)!;
  const lines = [`# ${exp.title}`, "", `Bet: ${exp.bet}`, `Canonical experience: ${base}${exp.path}`, "", exp.question, exp.role, "", "Powered by Flint from Springboards: https://springboards.ai/models/flint-alpha", ""];
  if (id === "facts-with-flair") {
    lines.push("## Compare before generating", `Read the same dated examples shown to humans: ${base}/api/experiments/facts-with-flair/examples`, flair.methodology, "");
    for (const x of flair.examples) lines.push(`### ${x.productName}`, `Source: ${x.sourceUrl} (checked ${x.sourceCheckedAt})`, `Source excerpt: ${x.sourceExcerpt}`, `Reframing: ${x.description}`, `What changed: ${x.meaningfulChange}`, "");
    lines.push("## Live workflow", "Human UI: enter a public HTTPS product URL; extract facts, draft, then review six QA gates. A pasted-source fallback appears if the retailer blocks access. No source or output is stored by this core app.", "The backing service retains source-fetch safeguards and signed snapshots. Do not present automated QA as independent product verification or the generated copy as Jack's own words.");
  } else {
    lines.push("## Delegation, with a boundary", "Ten credits cost A$1.00. Each saved idea costs one credit and contains a concept, an execution and a distinction. The human must approve payment and each authorized credit use.", `Transactional MCP (separate from the read-only identity MCP): ${base}/experiments/leaderbored/mcp`, "Use only catalog/category/trend tools without approval. Checkout and claim require explicit human permission. Receipts are private bearer credentials: never log them or put them in URLs.", `Category reference data: ${base}/api/experiments/leaderbored/categories`, "All category patterns are sample data, not independent advertising research; counts are theme rows, not ad volume or market share.", "Concepts are not resold inside Leaderbored. Originality elsewhere, IP exclusivity and campaign results are not guaranteed.", "The native experiment UI uses the existing Leaderbored payment, credit and claim service; it does not copy or reset balances. Stripe checkout is a deliberate external hand-off. Return to this experiment to verify and use credits.", "No receipt or idea is stored in the core app. A receipt remains in browser memory for the current page only; back it up privately before leaving.");
  }
  lines.push("", `Existing backing service: ${exp.service}`, "The framing above interprets Jack's owner-supplied three-bet brief; it is not a direct quotation.");
  return lines.join("\n") + "\n";
}
function flairBody(selected?: string) {
  const example = flair.examples.find(x => x.id === selected) || flair.examples[0];
  return `<div class="experiment" data-experiment="facts-with-flair">
  ${breadcrumb("differentiation", "Facts with Flair")}
  <div class="eyebrow">Experiment 01 · differentiation</div><h1>Facts with flair.</h1><p class="deck">Same product. Same specs.<br>A clearer reason to choose.</p>
  <div class="context"><p>A practical test of differentiation: help a shopping agent see a buying decision, not another list of interchangeable features.</p></div>
  <section id="compare"><div class="section-top"><div><div class="section-no">01 / See the difference</div><h2>A product, reframed.</h2></div><p class="quiet">Eight Australian retailer examples. See the source, the rewrite and exactly what changed before trying your own.</p></div>
  <div class="picker" id="example-picker" aria-label="Product examples">${flair.examples.map(x => `<a class="pick" href="?example=${x.id}" data-example="${x.id}" aria-current="${x.id === example.id ? "true" : "false"}">${e(x.category)}</a>`).join("")}</div>
  <div id="comparison">${comparison(example)}</div></section>
  <section id="try"><div class="section-no">02 / Try the same thinking</div><h2>Your product. The same constraint.</h2><p class="quiet">Flint reads the page, writes from its extracted facts, then checks the result. Usually 1–3 minutes. Review before publishing.</p>
  <form id="flair-form" class="surface"><label class="field" for="product-url">Public product page</label><input id="product-url" type="url" inputmode="url" placeholder="https://retailer.com/product" required maxlength="2000">
  <div id="paste-fallback" hidden><label class="field" for="source-text">The retailer blocked access. Paste its product details instead.</label><textarea id="source-text" minlength="80" maxlength="10000" placeholder="Paste the description and exact specifications from the page."></textarea><p class="fine">Keep the original product URL. This uses your pasted text, not an independently fetched page.</p></div>
  <div class="actions"><button id="optimise" type="submit">Optimise this product →</button><span class="quiet">Powered by ${provider}</span></div><div id="flair-status" role="status" aria-live="polite"></div></form>
  <div id="flair-output" hidden></div></section>
  <section class="method" id="method"><h2>The method is part of the point.</h2><p>The examples are dated source snapshots, not live prices or stock. Flint drafted; editorial refinement and a separate Flint review improved the framing. No retailer endorsement, market-uniqueness proof or ranking uplift is implied.</p><p>Live runs preserve exact source values and return specifications, narrative, three “Why this one” lines, agent-readable attributes and six QA gates. A failed gate stays visible. Automated QA checks the extracted source; it is not independent verification. Page reads and generated output are not persisted by this core app.</p><p>The experiment runs here; the existing Facts with Flair service handles page extraction, model calls and signed snapshots. ${provider} provides the generative model. <a href="https://openai.com/index/chatgpt-shopping-research">Shopping research</a> and <a href="https://arxiv.org/html/2511.22978">ShoppingComp</a> inform the emphasis on explicit, comparable facts—not a claim that a phrasing change causes better rankings.</p></section>
  <details class="agent-box"><summary>Use this experiment with your agent</summary><p class="quiet">The identity MCP's <code>get_work</code> tool, id <code>w-fwf</code>, explains the experiment. The <a href="/experiments/facts-with-flair.md">Markdown guide</a> and <a href="/api/experiments/facts-with-flair/examples">example data</a> expose exactly the same source-backed comparisons.</p></details>
  <div class="next"><div><span class="eyebrow">Return to the argument</span><br><a href="/#differentiation">Why differentiation matters →</a></div><div><span class="eyebrow">The next bet</span><br><a href="/#multimodality">Now make it understood →</a></div></div></div>`;
}
function leaderBody(selected?: string) {
  const category = categories.find(x => x.id === selected) || categories.find(x => x.id === "beauty") || categories[0];
  return `<div class="experiment" data-experiment="leaderbored">${breadcrumb("anticipation", "Leaderbored")}
  <div class="eyebrow">Experiment 02 · anticipation</div><h1>An agency<br>for agents.</h1><p class="deck">Leaderbored gives a creative agent somewhere to buy an idea—not just another answer to a prompt.</p>
  <div class="context"><p>Anticipation is useful delegation, not permissionless autonomy. The human still approves the spend.</p></div>
  <section id="categories"><div class="section-top"><div><div class="section-no">01 / Give the agent context</div><h2>Know the category.<br>Then try something different.</h2></div><p class="quiet">Browse the sample reference themes first. They supply a starting point for divergence, not proof of what the market is doing.</p></div>
  <div class="picker" id="category-picker" aria-label="Categories">${categories.map(c => `<a class="pick" href="?category=${c.id}" data-category="${c.id}" aria-current="${c.id === category.id ? "true" : "false"}">${e(c.name)}</a>`).join("")}</div>
  <div class="surface" id="category-view">${categoryView(category)}</div><p class="fine" id="category-freshness">October 2026 sample reference snapshot. Checking the existing service for the latest available snapshot…</p></section>
  <section id="delegate"><div class="section-no">02 / Authorise the hand-off</div><h2>A small budget.<br>A concrete deliverable.</h2>
  <div class="split"><div class="surface"><div class="eyebrow">A credit pack</div><p class="price">A$1.00 <small>for 10 credits</small></p><p>One credit buys one saved idea: a concept, a suggested execution and why it differs from the supplied category themes.</p><p class="quiet">Powered by ${provider}. Saved concepts are not resold within Leaderbored; originality elsewhere, IP exclusivity and campaign results are not guaranteed.</p><button id="buy-pack" type="button">Set up a 10-credit checkout</button><div id="checkout-result" aria-live="polite"></div><p class="fine">No charge happens here. Continue to Stripe in a new tab, complete payment yourself, then return here and verify it.</p></div>
  <div class="surface"><div class="eyebrow">Your private credit receipt</div><label class="field" for="receipt">Restore a receipt, or use the checkout created here</label><input id="receipt" type="password" autocomplete="off" spellcheck="false" maxlength="250" placeholder="Private checkout receipt"><div class="actions"><button id="verify-pack" class="secondary" type="button">Verify credits</button><button id="copy-receipt" class="secondary" type="button">Back up receipt</button></div><div id="credit-status" role="status" aria-live="polite"></div><p class="fine">A receipt is a bearer credential. It stays only in this page's memory—not in URLs, local storage or this site's database. Keep a private backup before leaving.</p></div></div>
  <div class="surface"><div class="eyebrow">A deliberate next action</div><h3 id="claim-category">One idea for ${e(category.name)}</h3><p class="quiet">Choose a category above, verify your credits, then explicitly approve using one. No automatic generation happens when you browse or pay.</p><label class="check"><input id="approve-credit" type="checkbox"><span>I approve using one credit (A$0.10) to generate and save one idea for the selected category.</span></label><div class="actions"><button id="claim-idea" type="button" disabled>Generate & save one idea</button><button id="load-history" class="secondary" type="button">My saved ideas</button></div><p class="fine">If you reload during generation, restore your receipt and check My saved ideas before starting a new claim. This page does not persist receipts or pending request IDs.</p><div id="idea-status" role="status" aria-live="polite"></div><div id="idea-output"></div></div></section>
  <section class="method" id="for-agents"><h2>The agent gets a real interface.</h2><p>Category discovery is free. Payment and credit use require the human's approval. The transactional MCP is deliberately separate from Jack's read-only identity MCP, so asking for his thinking can never accidentally buy an idea.</p><pre tabindex="0" aria-label="Leaderbored transactional MCP endpoint"><code>/experiments/leaderbored/mcp</code></pre><p><a href="/experiments/leaderbored.md">Read the agent guide</a> · <a href="/#mcp">Use Jack's thinking first</a></p><p>Existing balances, purchased ideas, payment verification and idempotent claims stay in the original Leaderbored service. This native interface uses those systems; it does not copy, reset or publicly expose anyone's purchase history.</p></section>
  <div class="next"><div><span class="eyebrow">Return to the argument</span><br><a href="/#anticipation">Why anticipation matters →</a></div><div><span class="eyebrow">Start with a real difference</span><br><a href="/experiments/facts-with-flair">Try Facts with Flair →</a></div></div></div>`;
}

const token = z.string().min(8).max(230000);
const receipt = z.string().regex(/^cs_[a-zA-Z0-9_]+$/).max(250);
const operations = {
  "facts-with-flair/extract": { base: EXPERIMENTS[0].service, path: "/api/copy/scrape", schema: z.object({ url: z.string().url().max(2000).refine(u => u.startsWith("https://")), sourceText: z.string().min(80).max(10000).optional() }) },
  "facts-with-flair/draft": { base: EXPERIMENTS[0].service, path: "/api/copy/draft", schema: z.object({ sourceToken: token }) },
  "facts-with-flair/review": { base: EXPERIMENTS[0].service, path: "/api/copy/review", schema: z.object({ draftToken: token }) },
  "leaderbored/checkout": { base: EXPERIMENTS[1].service, path: "/api/checkout/sessions", schema: z.object({ categoryId: z.string().regex(/^[a-z0-9-]{1,100}$/), approved: z.literal(true) }) },
  "leaderbored/credits": { base: EXPERIMENTS[1].service, path: "/api/checkout/sessions/status", schema: z.object({ checkoutSessionId: receipt }) },
  "leaderbored/claim": { base: EXPERIMENTS[1].service, path: "/api/ideas/claim/async", schema: z.object({ categoryId: z.string().regex(/^[a-z0-9-]{1,100}$/), checkoutSessionId: receipt, requestId: z.string().uuid(), approved: z.literal(true), poll: z.boolean().optional() }) },
  "leaderbored/history": { base: EXPERIMENTS[1].service, path: "/api/ideas/history", schema: z.object({ checkoutSessionId: receipt }) },
} as const;
const categorySchema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{1,100}$/), name: z.string().max(180),
  latestMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  patterns: z.array(z.object({ theme: z.string().max(600), keywords: z.array(z.string().max(300)).max(100), frequency: z.number().nonnegative().max(1000000) })).max(200),
})).max(100);
let categoryCache: { at: number; data: unknown } | undefined;
let categoryRequest: Promise<unknown> | undefined;
let inFlightOperations = 0;
async function getCategories() {
  if (categoryCache && Date.now() - categoryCache.at < 30000) return categoryCache.data;
  if (categoryRequest) return categoryRequest;
  categoryRequest = (async () => {
    let result;
    try {
      const r = await fetch(`${EXPERIMENTS[1].service}/api/categories`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw Error();
      const parsed = categorySchema.parse(await r.json());
      result = { categories: parsed.map(c => ({ ...c, source: "illustrative", sampleData: true })), delivery: "existing-service", sampleData: true, checkedAt: new Date().toISOString() };
    } catch {
      result = { categories, delivery: "bundled-october-2026-snapshot", sampleData: true, checkedAt: new Date().toISOString() };
    }
    categoryCache = { at: Date.now(), data: result };
    return result;
  })();
  try { return await categoryRequest; } finally { categoryRequest = undefined; }
}
export function registerExperiments(app: Express, origin: (r: Request) => string) {
  app.get("/experiments.js", (_req, res) => res.type("text/javascript").send(experimentScript));
  app.get("/api/experiments", (_req, res) => res.json({ experiments: EXPERIMENTS }));
  app.get("/api/experiments/facts-with-flair/examples", (_req, res) => res.json({ ...flair, research: RESEARCH }));
  app.get("/api/experiments/leaderbored/categories", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(getNativeCategoriesPayload());
  });
  // Deliberately fixed operation -> handler/host mapping. This is not an open proxy.
  // Leaderbored runs natively on Cloud Run + Firestore + Stripe + Gemini.
  app.post("/api/experiments/:experiment/:operation", async (req, res) => {
    const key = `${req.params.experiment}/${req.params.operation}`;
    const op = operations[key as keyof typeof operations];
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    if (!op) { res.status(404).json({ error: "Unknown experiment operation." }); return; }
    const parsed = op.schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request or missing explicit approval. Check the experiment form." }); return; }
    if (inFlightOperations >= 8) { res.status(429).set("Retry-After", "2").json({ error: "This instance is handling several experiment requests. Wait a moment and retry.", code: "busy" }); return; }
    inFlightOperations++;
    try {
      if (key === "leaderbored/checkout") {
        const { categoryId } = parsed.data as { categoryId: string };
        const result = await createNativeCheckout(categoryId, origin(req));
        res.status(result.status).json(result.body);
        return;
      }
      if (key === "leaderbored/credits") {
        const { checkoutSessionId } = parsed.data as { checkoutSessionId: string };
        const result = await verifyNativeCredits(checkoutSessionId);
        res.status(result.status).json(result.body);
        return;
      }
      if (key === "leaderbored/history") {
        const { checkoutSessionId } = parsed.data as { checkoutSessionId: string };
        const result = await listNativeHistory(checkoutSessionId);
        res.status(result.status).json(result.body);
        return;
      }
      if (key === "leaderbored/claim") {
        const { categoryId, checkoutSessionId, requestId } = parsed.data as {
          categoryId: string;
          checkoutSessionId: string;
          requestId: string;
        };
        const result = await claimNativeIdea({ categoryId, checkoutSessionId, requestId });
        res.status(result.status).json(result.body);
        return;
      }
      const body: Record<string, unknown> = { ...parsed.data };
      const poll = body.poll; delete body.poll; delete body.approved;
      const upstream = await fetch(op.base + op.path, {
        method: "POST", headers: { "content-type": "application/json", ...(poll ? { "X-Leaderbored-Poll": "true" } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(115000),
      });
      const text = await upstream.text();
      if (text.length > 2000000) throw Error();
      const data = JSON.parse(text);
      res.status(upstream.status).json(data);
    } catch { res.status(502).json({ error: "The experiment's existing service could not complete this step. No success is assumed; retry safely or return later.", code: "service_unavailable" }); }
    finally { inFlightOperations--; }
  });
  app.post("/experiments/leaderbored/mcp", async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const server = buildLeaderboredMcpServer(origin(req));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", id: req.body?.id ?? null, error: { code: -32603, message: "Internal Leaderbored MCP error. Retry with the same request ID for safe recovery." } });
      }
    }
  });
  app.all("/experiments/leaderbored/mcp", (_req, res) => res.status(405).set("Allow", "POST").json({ error: "Stateless Streamable HTTP: use POST." }));
  for (const exp of EXPERIMENTS.filter(x => x.id === "facts-with-flair" || x.id === "leaderbored")) {
    app.get(`${exp.path}.md`, (req, res) => res.type("text/markdown").send(experimentMarkdown(exp.id, origin(req))));
    app.get(exp.path, (req, res) => {
      res.vary("Accept");
      res.set("Link", `<${exp.path}.md>; rel="alternate"; type="text/markdown"`);
      if (req.accepts(["html", "text/markdown"]) === "text/markdown") { res.type("text/markdown").send(experimentMarkdown(exp.id, origin(req))); return; }
      const nonce = res.locals.nonce as string;
      const body = exp.id === "facts-with-flair" ? flairBody(String(req.query.example || "")) : leaderBody(String(req.query.category || ""));
      res.type("html").send(page(origin(req), {
        path: exp.path, title: `${exp.title} — ${exp.bet} in practice · Jack Smyth`,
        description: exp.question,
        body,
        script: "/experiments.js",
      }, nonce));
    });
  }
}
