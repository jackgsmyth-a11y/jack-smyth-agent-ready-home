import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { telemetryScript } from "./telemetry-client.js";

// Zero-PII dual telemetry collector (Human UX + Agent/Crawler surfaces).
// Aggregates monthly rollups in memory and periodically persists snapshots
// to Cloud Firestore (`self_opt/telemetry-YYYY-MM`) when FIRESTORE_ENABLED=true.

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

export interface CampaignVariantMetrics {
  pageViews: number;
  serverLandingViews?: number;
  scroll50: number;
  scroll75: number;
  scroll100: number;
}

export interface MonthlyTelemetry {
  month: string;
  updatedAt: string;
  human: {
    pageViews: Record<string, number>;
    events: Record<string, number>;
    lensSwitches: { human: number; agent: number };
    experimentClicks: Record<string, number>;
    outboundClicks: Record<string, number>;
    scrollMilestones: Record<string, number>;
    referrers: Record<string, number>;
    campaignVariants?: Record<string, CampaignVariantMetrics>;
    cwvSamples: {
      lcpMs: number[];
      cls: number[];
      inpMs: number[];
      ttfbMs: number[];
    };
  };
  agents: {
    totalRequests: number;
    byAgent: Record<string, number>;
    bySurface: Record<string, number>;
    errors4xx5xx: number;
    avgLatencyMs: number;
    latencyCount: number;
  };
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function createEmptyMonth(month: string): MonthlyTelemetry {
  return {
    month,
    updatedAt: new Date().toISOString(),
    human: {
      pageViews: {},
      events: {},
      lensSwitches: { human: 0, agent: 0 },
      experimentClicks: {},
      outboundClicks: {},
      scrollMilestones: {},
      referrers: {},
      campaignVariants: {},
      cwvSamples: { lcpMs: [], cls: [], inpMs: [], ttfbMs: [] },
    },
    agents: {
      totalRequests: 0,
      byAgent: {},
      bySurface: {},
      errors4xx5xx: 0,
      avgLatencyMs: 0,
      latencyCount: 0,
    },
  };
}

const MAX_CWV_SAMPLES = 200;
const store = new Map<string, MonthlyTelemetry>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function getMonthlyTelemetry(month = currentMonthKey()): MonthlyTelemetry {
  let entry = store.get(month);
  if (!entry) {
    entry = createEmptyMonth(month);
    store.set(month, entry);
  }
  return entry;
}

function inc(map: Record<string, number>, key: string, maxKeys = 50) {
  const safe = key.slice(0, 120);
  if (!(safe in map) && Object.keys(map).length >= maxKeys) return;
  map[safe] = (map[safe] || 0) + 1;
}

function pushSample(arr: number[], value: number) {
  if (!Number.isFinite(value) || value < 0) return;
  if (arr.length >= MAX_CWV_SAMPLES) arr.shift();
  arr.push(value);
}

export function p75(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.75) - 1);
  return sorted[idx];
}

export function classifyAgent(ua: string, path: string, accept: string): string | null {
  const lower = ua.toLowerCase();
  if (lower.includes("google-extended")) return "Google-Extended";
  if (lower.includes("googlebot") || lower.includes("adsbot-google")) return "Googlebot";
  if (lower.includes("gptbot") || lower.includes("oai-searchbot") || lower.includes("chatgpt-user")) return "OpenAI-Bot";
  if (lower.includes("claudebot") || lower.includes("anthropic-ai")) return "ClaudeBot";
  if (lower.includes("perplexitybot")) return "PerplexityBot";
  if (lower.includes("applebot")) return "Applebot";
  if (lower.includes("bingbot")) return "Bingbot";
  if (
    path === "/mcp" ||
    path.endsWith("/mcp") ||
    path === "/a2a" ||
    path === "/llms.txt" ||
    path === "/knowledge.json" ||
    path === "/index.md" ||
    path === "/agents.md" ||
    path.startsWith("/.well-known/") ||
    accept.includes("text/markdown")
  ) {
    return "Agent-Client";
  }
  return null;
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

function isFirestoreEnabled(): boolean {
  return process.env.FIRESTORE_ENABLED === "true" && Boolean(process.env.GOOGLE_CLOUD_PROJECT);
}

export async function saveSelfOptDoc(docId: string, payload: unknown): Promise<boolean> {
  if (!isFirestoreEnabled()) return false;
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const token = await getAccessToken();
  if (!token) return false;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/self_opt/${encodeURIComponent(docId)}`;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          json: { stringValue: JSON.stringify(payload) },
          updatedAt: { timestampValue: new Date().toISOString() },
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadSelfOptDoc<T>(docId: string): Promise<T | null> {
  if (!isFirestoreEnabled()) return null;
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const token = await getAccessToken();
  if (!token) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/self_opt/${encodeURIComponent(docId)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const doc = (await res.json()) as { fields?: { json?: { stringValue?: string } } };
    const raw = doc.fields?.json?.stringValue;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function scheduleFlush(month: string) {
  if (!isFirestoreEnabled() || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const data = store.get(month);
    if (data) void saveSelfOptDoc(`telemetry-${month}`, data);
  }, 15000);
}

export async function hydrateTelemetryFromFirestore() {
  const month = currentMonthKey();
  const saved = await loadSelfOptDoc<MonthlyTelemetry>(`telemetry-${month}`);
  if (saved && saved.month === month) {
    store.set(month, saved);
  }
}

const telemetryEventSchema = z.object({
  type: z.enum(["page_view", "lens_switch", "experiment_click", "outbound_click", "mcp_copy", "scroll_depth", "cwv"]),
  path: z.string().min(1).max(160).refine((p) => p.startsWith("/")),
  ts: z.number().int().positive().optional(),
  detail: z.record(z.string(), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
});

const telemetryBatchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(40),
});

export function agentTelemetryMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/healthz" || req.path === "/api/telemetry" || req.path.startsWith("/fonts/")) {
    next();
    return;
  }
  const ua = String(req.headers["user-agent"] || "");
  const accept = String(req.headers.accept || "");
  const agent = classifyAgent(ua, req.path, accept);
  if (!agent) {
    next();
    return;
  }
  const started = process.hrtime.bigint();
  res.once("finish", () => {
    const month = currentMonthKey();
    const m = getMonthlyTelemetry(month);
    const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
    m.agents.totalRequests += 1;
    inc(m.agents.byAgent, agent);
    inc(m.agents.bySurface, req.path);
    if (res.statusCode >= 400) m.agents.errors4xx5xx += 1;
    m.agents.latencyCount += 1;
    m.agents.avgLatencyMs = Number(
      (((m.agents.avgLatencyMs * (m.agents.latencyCount - 1)) + ms) / m.agents.latencyCount).toFixed(1),
    );
    m.updatedAt = new Date().toISOString();
    scheduleFlush(month);
  });
  next();
}

export function buildTelemetrySummary(month = currentMonthKey()) {
  const m = getMonthlyTelemetry(month);
  const totalPageViews = Object.values(m.human.pageViews).reduce((a, b) => a + b, 0);
  return {
    month: m.month,
    updatedAt: m.updatedAt,
    storage: isFirestoreEnabled() ? "firestore" : "in-memory",
    human: {
      totalPageViews,
      pageViews: m.human.pageViews,
      events: m.human.events,
      lensSwitches: m.human.lensSwitches,
      experimentClicks: m.human.experimentClicks,
      outboundClicks: m.human.outboundClicks,
      scrollMilestones: m.human.scrollMilestones,
      referrers: m.human.referrers,
      campaignVariants: m.human.campaignVariants ?? {},
      cwvP75: {
        lcpMs: p75(m.human.cwvSamples.lcpMs),
        cls: p75(m.human.cwvSamples.cls),
        inpMs: p75(m.human.cwvSamples.inpMs),
        ttfbMs: p75(m.human.cwvSamples.ttfbMs),
        sampleCount: m.human.cwvSamples.lcpMs.length,
      },
    },
    agents: {
      totalRequests: m.agents.totalRequests,
      byAgent: m.agents.byAgent,
      bySurface: m.agents.bySurface,
      errors4xx5xx: m.agents.errors4xx5xx,
      avgLatencyMs: m.agents.avgLatencyMs,
    },
  };
}

function recordCampaignVariant(
  m: MonthlyTelemetry,
  rawVariant: unknown,
  field: keyof CampaignVariantMetrics,
) {
  if (typeof rawVariant !== "string") return;
  const variant = rawVariant.toLowerCase().replace(/[^a-z0-9:_-]/g, "").slice(0, 80);
  if (!variant) return;
  m.human.campaignVariants ??= {};
  if (!(variant in m.human.campaignVariants) && Object.keys(m.human.campaignVariants).length >= 50) return;
  const bucket = (m.human.campaignVariants[variant] ??= {
    pageViews: 0,
    serverLandingViews: 0,
    scroll50: 0,
    scroll75: 0,
    scroll100: 0,
  });
  bucket[field] = (bucket[field] ?? 0) + 1;
}

const BOT_UA_RE = /bot|crawler|spider|slurp|headless|preview|facebookexternalhit|linkedinbot|whatsapp|telegram|curl|wget|python-urllib|node-fetch|undici|axios/i;

export function recordServerCampaignLanding(req: Request): string | null {
  const ua = String(req.headers["user-agent"] || "");
  const accept = String(req.headers.accept || "");
  if (classifyAgent(ua, req.path, accept) || BOT_UA_RE.test(ua)) return null;
  const clean = (v: unknown) => (typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) : "");
  const camp = clean(req.query.utm_campaign);
  const content = clean(req.query.utm_content);
  const variantKey = camp && content ? `${camp}:${content}` : (camp || content);
  if (!variantKey) return null;
  const month = currentMonthKey();
  const m = getMonthlyTelemetry(month);
  recordCampaignVariant(m, variantKey, "serverLandingViews");
  m.updatedAt = new Date().toISOString();
  scheduleFlush(month);
  return variantKey;
}

export function registerTelemetry(app: Express) {
  void hydrateTelemetryFromFirestore();
  app.use(agentTelemetryMiddleware);

  app.get("/telemetry.js", (_req, res) => {
    res.set("Cache-Control", "public, max-age=3600");
    res.type("text/javascript; charset=utf-8").send(telemetryScript);
  });

  app.post("/api/telemetry", (req: Request, res: Response) => {
    const parsed = telemetryBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid telemetry batch." });
      return;
    }
    const month = currentMonthKey();
    const m = getMonthlyTelemetry(month);
    for (const ev of parsed.data.events) {
      inc(m.human.events, ev.type);
      if (ev.type === "page_view") {
        inc(m.human.pageViews, ev.path);
        const refHost = typeof ev.detail?.refHost === "string" ? ev.detail.refHost : "";
        if (refHost) inc(m.human.referrers, refHost);
        recordCampaignVariant(m, ev.detail?.variant, "pageViews");
      } else if (ev.type === "lens_switch") {
        if (ev.detail?.mode === "agent") m.human.lensSwitches.agent += 1;
        else m.human.lensSwitches.human += 1;
      } else if (ev.type === "experiment_click" && typeof ev.detail?.to === "string") {
        inc(m.human.experimentClicks, ev.detail.to);
      } else if (ev.type === "outbound_click" && typeof ev.detail?.host === "string") {
        inc(m.human.outboundClicks, ev.detail.host);
      } else if (ev.type === "scroll_depth" && typeof ev.detail?.pct === "number") {
        inc(m.human.scrollMilestones, `${ev.detail.pct}%`);
        if (ev.detail.pct === 50) recordCampaignVariant(m, ev.detail?.variant, "scroll50");
        else if (ev.detail.pct === 75) recordCampaignVariant(m, ev.detail?.variant, "scroll75");
        else if (ev.detail.pct === 100) recordCampaignVariant(m, ev.detail?.variant, "scroll100");
      } else if (ev.type === "cwv" && ev.detail) {
        if (typeof ev.detail.lcpMs === "number" && ev.detail.lcpMs > 0) pushSample(m.human.cwvSamples.lcpMs, ev.detail.lcpMs);
        if (typeof ev.detail.cls === "number") pushSample(m.human.cwvSamples.cls, ev.detail.cls);
        if (typeof ev.detail.inpMs === "number" && ev.detail.inpMs > 0) pushSample(m.human.cwvSamples.inpMs, ev.detail.inpMs);
        if (typeof ev.detail.ttfbMs === "number" && ev.detail.ttfbMs > 0) pushSample(m.human.cwvSamples.ttfbMs, ev.detail.ttfbMs);
      }
    }
    m.updatedAt = new Date().toISOString();
    scheduleFlush(month);
    res.status(204).end();
  });

  app.get("/api/self-opt/summary", (req: Request, res: Response) => {
    const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : currentMonthKey();
    res.json(buildTelemetrySummary(month));
  });
}
