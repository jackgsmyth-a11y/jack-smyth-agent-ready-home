import { createHash, randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import categories from "./data/leaderbored.json";

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

export interface SavedIdea {
  id: string;
  requestId: string;
  categoryId: string;
  categoryName: string;
  title: string;
  concept: string;
  execution: string;
  distinction: string;
  createdAt: string;
}

interface CreditLedger {
  creditsGranted: boolean;
  creditsTotal: number;
  creditsUsed: number;
  ideas: SavedIdea[];
  updatedAt: string;
}

const memoryLedgers = new Map<string, CreditLedger>();

function sessionHash(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 40);
}

function isFirestoreEnabled(): boolean {
  return process.env.FIRESTORE_ENABLED === "true" && Boolean(process.env.GOOGLE_CLOUD_PROJECT);
}

async function getAccessToken(): Promise<string | null> {
  if (process.env.GCP_ACCESS_TOKEN) return process.env.GCP_ACCESS_TOKEN;
  try {
    const res = await fetch(METADATA_TOKEN_URL, {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function loadLedger(sessionId: string): Promise<CreditLedger | null> {
  const key = sessionHash(sessionId);
  if (isFirestoreEnabled()) {
    const project = process.env.GOOGLE_CLOUD_PROJECT!;
    const token = await getAccessToken();
    if (token) {
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/leaderbored_ledgers/${key}`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const doc = (await res.json()) as { fields?: { json?: { stringValue?: string } } };
          const raw = doc.fields?.json?.stringValue;
          if (raw) {
            const parsed = JSON.parse(raw) as CreditLedger;
            memoryLedgers.set(key, parsed);
            return parsed;
          }
        }
      } catch {
        // Fall through to memory cache
      }
    }
  }
  return memoryLedgers.get(key) ?? null;
}

async function saveLedger(sessionId: string, ledger: CreditLedger): Promise<void> {
  const key = sessionHash(sessionId);
  ledger.updatedAt = new Date().toISOString();
  memoryLedgers.set(key, ledger);
  if (!isFirestoreEnabled()) return;
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const token = await getAccessToken();
  if (!token) return;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/leaderbored_ledgers/${key}`;
  try {
    await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          json: { stringValue: JSON.stringify(ledger) },
          updatedAt: { timestampValue: ledger.updatedAt },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-fatal; memory cache remains authoritative for this instance
  }
}

export function getNativeCategoriesPayload() {
  return {
    categories: categories.map((c) => ({ ...c, source: "illustrative", sampleData: true })),
    delivery: "existing-service" as const,
    sampleData: true,
    checkedAt: new Date().toISOString(),
  };
}

export async function createNativeCheckout(categoryId: string, baseOrigin: string) {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    return { status: 400, body: { error: `Unknown category "${categoryId}".`, code: "invalid_category" } };
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return {
      status: 503,
      body: {
        error: "Stripe checkout is not yet configured on this Cloud Run service (STRIPE_SECRET_KEY secret required).",
        code: "stripe_not_configured",
      },
    };
  }
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "aud",
    "line_items[0][price_data][unit_amount]": "100",
    "line_items[0][price_data][product_data][name]": "Leaderbored — 10 Idea Credits",
    "line_items[0][price_data][product_data][description]": `10 credits (A$0.10/idea) on jacksmyth.fyi. Starting category: ${category.name}.`,
    "line_items[0][quantity]": "1",
    success_url: `${baseOrigin}/experiments/leaderbored?category=${encodeURIComponent(category.id)}&paid=1`,
    cancel_url: `${baseOrigin}/experiments/leaderbored?category=${encodeURIComponent(category.id)}`,
    "metadata[product]": "leaderbored-10-credits",
    "metadata[categoryId]": category.id,
  });
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !data.id || !data.url) {
      return {
        status: 502,
        body: { error: data.error?.message || "Stripe could not create a checkout session.", code: "stripe_error" },
      };
    }
    return {
      status: 200,
      body: {
        sessionId: data.id,
        checkoutUrl: data.url,
        currency: "AUD",
        amountAud: 1.0,
        credits: 10,
      },
    };
  } catch {
    return { status: 502, body: { error: "Could not reach Stripe Checkout. Retry safely.", code: "stripe_unreachable" } };
  }
}

export async function verifyNativeCredits(checkoutSessionId: string) {
  let ledger = await loadLedger(checkoutSessionId);
  if (ledger?.creditsGranted) {
    return {
      status: 200,
      body: {
        creditsGranted: true,
        creditsTotal: ledger.creditsTotal,
        creditsUsed: ledger.creditsUsed,
        creditsRemaining: Math.max(0, ledger.creditsTotal - ledger.creditsUsed),
      },
    };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return {
      status: 200,
      body: {
        creditsGranted: false,
        creditsTotal: 0,
        creditsUsed: 0,
        creditsRemaining: 0,
        note: "No confirmed credits for this receipt.",
      },
    };
  }

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`,
      {
        headers: { Authorization: `Bearer ${stripeKey}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) {
      return {
        status: 200,
        body: { creditsGranted: false, creditsTotal: 0, creditsUsed: 0, creditsRemaining: 0 },
      };
    }
    const session = (await res.json()) as { payment_status?: string; status?: string };
    if (session.payment_status === "paid") {
      ledger = {
        creditsGranted: true,
        creditsTotal: 10,
        creditsUsed: ledger?.creditsUsed ?? 0,
        ideas: ledger?.ideas ?? [],
        updatedAt: new Date().toISOString(),
      };
      await saveLedger(checkoutSessionId, ledger);
      return {
        status: 200,
        body: {
          creditsGranted: true,
          creditsTotal: ledger.creditsTotal,
          creditsUsed: ledger.creditsUsed,
          creditsRemaining: Math.max(0, ledger.creditsTotal - ledger.creditsUsed),
        },
      };
    }
    return {
      status: 200,
      body: { creditsGranted: false, creditsTotal: 0, creditsUsed: 0, creditsRemaining: 0 },
    };
  } catch {
    return {
      status: 502,
      body: { error: "Could not verify receipt with Stripe right now. Retry safely.", code: "stripe_unreachable" },
    };
  }
}

export async function listNativeHistory(checkoutSessionId: string) {
  const ledger = await loadLedger(checkoutSessionId);
  return { status: 200, body: ledger?.ideas ?? [] };
}

async function generateDistinctIdea(
  category: (typeof categories)[number],
  existingTitles: string[],
): Promise<{ title: string; concept: string; execution: string; distinction: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const themesText = category.patterns
    .slice(0, 6)
    .map((p) => `- ${p.theme}: ${p.keywords.slice(0, 6).join(", ")}`)
    .join("\n");

  if (apiKey) {
    try {
      const prompt = [
        `You are Leaderbored, a creative agency for agents. Generate ONE sharply differentiated advertising/creative concept for the "${category.name}" category that deliberately diverges from these common category clichés:`,
        themesText,
        existingTitles.length ? `Do NOT repeat these prior titles: ${existingTitles.join("; ")}` : "",
        `Return ONLY valid JSON with exact keys: {"title":"<=80 chars","concept":"2-3 crisp sentences","execution":"concrete channel + asset execution in 2-3 sentences","distinction":"explicitly explain how it breaks the category clichés above in 2 sentences"}.`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const model = process.env.LEADERBORED_GEMINI_MODEL || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.9, maxOutputTokens: 1024 },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(raw) as Partial<{
          title: string;
          concept: string;
          execution: string;
          distinction: string;
        }>;
        if (parsed.title && parsed.concept && parsed.execution && parsed.distinction) {
          return {
            title: parsed.title.slice(0, 120),
            concept: parsed.concept.slice(0, 800),
            execution: parsed.execution.slice(0, 800),
            distinction: parsed.distinction.slice(0, 800),
          };
        }
      }
    } catch {
      // Fall through to deterministic structured divergence fallback
    }
  }

  const topTheme = category.patterns[0]?.theme || "category convention";
  return {
    title: `The Anti-${category.name} Receipt`,
    concept: `Instead of repeating "${topTheme}", publish a plain-text, verifiable comparison sheet showing exactly where the product wins and where a rival is better.`,
    execution: `Launch a 15-second screen-capture ad paired with a machine-readable spec card so both human buyers and shopping agents can verify every claim in one glance.`,
    distinction: `Breaks away from ${category.name}'s default "${topTheme}" framing by trading vague lifestyle adjectives for falsifiable trade-offs.`,
  };
}

export async function claimNativeIdea(args: {
  categoryId: string;
  checkoutSessionId: string;
  requestId: string;
}) {
  const category = categories.find((c) => c.id === args.categoryId);
  if (!category) {
    return { status: 400, body: { error: `Unknown category "${args.categoryId}".`, code: "invalid_category" } };
  }

  // Verify credits first (hydrates from Stripe if newly paid)
  const creditCheck = await verifyNativeCredits(args.checkoutSessionId);
  if (creditCheck.status !== 200) return creditCheck;

  const ledger = await loadLedger(args.checkoutSessionId);
  if (!ledger || !ledger.creditsGranted) {
    return {
      status: 402,
      body: { error: "Payment is not confirmed for this receipt. Complete Stripe checkout and verify credits first.", code: "payment_required" },
    };
  }

  // Idempotent replay: return existing idea for the same requestId without charging another credit
  const existing = ledger.ideas.find((i) => i.requestId === args.requestId);
  if (existing) {
    return { status: 200, body: existing };
  }

  if (ledger.creditsUsed >= ledger.creditsTotal) {
    return {
      status: 402,
      body: { error: "All 10 credits on this receipt have been used. Purchase a new credit pack to generate more ideas.", code: "no_credits_remaining" },
    };
  }

  const generated = await generateDistinctIdea(
    category,
    ledger.ideas.map((i) => i.title),
  );
  const saved: SavedIdea = {
    id: `idea_${randomUUID().slice(0, 12)}`,
    requestId: args.requestId,
    categoryId: category.id,
    categoryName: category.name,
    ...generated,
    createdAt: new Date().toISOString(),
  };
  ledger.creditsUsed += 1;
  ledger.ideas.unshift(saved);
  await saveLedger(args.checkoutSessionId, ledger);
  return { status: 200, body: saved };
}

export function buildLeaderboredMcpServer(baseOrigin: string) {
  const server = new McpServer(
    { name: "leaderbored-transactional", version: "1.0.0" },
    {
      instructions:
        "Leaderbored transactional MCP on jacksmyth.fyi. Category discovery, trends, and pricing tools are free and read-only. Checkout (A$1.00 / 10 credits) and idea claims (A$0.10 / 1 credit) require explicit human approval (approved=true). Receipts are private bearer credentials: never log them or place them in URLs.",
    },
  );

  server.registerTool(
    "leaderbored_catalog",
    {
      title: "List Leaderbored categories and pricing",
      description: "Free, read-only catalog of all sample categories, theme counts, and credit pricing on Leaderbored.",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              service: `${baseOrigin}/experiments/leaderbored`,
              sampleData: true,
              pricing: { packPriceAud: 1.0, creditsPerPack: 10, pricePerIdeaAud: 0.1 },
              categories: categories.map((c) => ({
                id: c.id,
                name: c.name,
                latestMonth: c.latestMonth,
                patternCount: c.patterns.length,
              })),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "leaderbored_get_category",
    {
      title: "Get category reference themes",
      description: "Free, read-only lookup of sample creative themes and keywords for one categoryId.",
      inputSchema: { categoryId: z.string().regex(/^[a-z0-9-]{1,100}$/) },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ categoryId }) => {
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) {
        return { isError: true, content: [{ type: "text" as const, text: `Unknown categoryId "${categoryId}". Call leaderbored_catalog first.` }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({ ...cat, sampleData: true }, null, 2) }] };
    },
  );

  server.registerTool(
    "leaderbored_list_trends",
    {
      title: "Summarize recurring category clichés",
      description: "Free, read-only summary of the highest-frequency sample themes across all categories to help agents diverge.",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const top = categories.map((c) => ({
        categoryId: c.id,
        name: c.name,
        topTheme: c.patterns[0]?.theme ?? null,
        keywords: c.patterns[0]?.keywords.slice(0, 5) ?? [],
      }));
      return { content: [{ type: "text" as const, text: JSON.stringify({ sampleData: true, trends: top }, null, 2) }] };
    },
  );

  server.registerTool(
    "leaderbored_pricing",
    {
      title: "Get Leaderbored pricing and approval boundaries",
      description: "Returns exact AUD pricing, credit pack rules, and human-in-the-loop approval requirements.",
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              currency: "AUD",
              packPriceAud: 1.0,
              creditsPerPack: 10,
              costPerSavedIdeaAud: 0.1,
              humanApprovalRequired: true,
              paymentProvider: "Stripe Checkout (external human-approved hand-off)",
              receiptPolicy: "Bearer credential; never log or expose in URLs.",
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerTool(
    "leaderbored_create_checkout",
    {
      title: "Create a 10-credit Stripe checkout session",
      description: "Creates an A$1.00 AUD Stripe Checkout URL for 10 credits. Requires explicit human approval (approved=true). No charge happens until the human completes Stripe Checkout.",
      inputSchema: {
        categoryId: z.string().regex(/^[a-z0-9-]{1,100}$/),
        approved: z.literal(true),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ categoryId }) => {
      const result = await createNativeCheckout(categoryId, baseOrigin);
      return {
        isError: result.status >= 400,
        content: [{ type: "text" as const, text: JSON.stringify(result.body, null, 2) }],
      };
    },
  );

  server.registerTool(
    "leaderbored_check_credits",
    {
      title: "Verify credits for a private receipt",
      description: "Verifies payment status and remaining credits for a Stripe checkoutSessionId (cs_...).",
      inputSchema: { checkoutSessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/).max(250) },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ checkoutSessionId }) => {
      const result = await verifyNativeCredits(checkoutSessionId);
      return {
        isError: result.status >= 400,
        content: [{ type: "text" as const, text: JSON.stringify(result.body, null, 2) }],
      };
    },
  );

  server.registerTool(
    "leaderbored_claim_idea",
    {
      title: "Spend 1 credit to generate and save one idea",
      description: "Idempotently uses 1 credit (A$0.10) to generate and save a category-divergent idea. Requires explicit human approval (approved=true) and a UUID requestId for safe retries.",
      inputSchema: {
        categoryId: z.string().regex(/^[a-z0-9-]{1,100}$/),
        checkoutSessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/).max(250),
        requestId: z.string().uuid(),
        approved: z.literal(true),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ categoryId, checkoutSessionId, requestId }) => {
      const result = await claimNativeIdea({ categoryId, checkoutSessionId, requestId });
      return {
        isError: result.status >= 400,
        content: [{ type: "text" as const, text: JSON.stringify(result.body, null, 2) }],
      };
    },
  );

  server.registerTool(
    "leaderbored_list_saved_ideas",
    {
      title: "Retrieve saved ideas for a receipt",
      description: "Privately lists all saved ideas generated under a Stripe checkoutSessionId.",
      inputSchema: { checkoutSessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/).max(250) },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ checkoutSessionId }) => {
      const result = await listNativeHistory(checkoutSessionId);
      return { content: [{ type: "text" as const, text: JSON.stringify(result.body, null, 2) }] };
    },
  );

  return server;
}
