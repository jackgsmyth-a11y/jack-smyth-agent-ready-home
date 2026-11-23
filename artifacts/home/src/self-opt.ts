import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { page } from "./site.js";
import { buildTelemetrySummary, loadSelfOptDoc, saveSelfOptDoc } from "./telemetry.js";
import { getLiveCampaignTracker } from "./wet-lab.js";

// Autonomous Weekly Hillclimb & Reflection Engine.
// Computes a deterministic 4-metric fitness scorecard from live human UX + agent telemetry,
// enforces a data & experiment flight gate (ops-only vs full-hillclimb), and uses Gemini
// to grade prior cycles (keep/revert) and propose bounded Tier-1/Tier-2 optimisations.

const REFLECT_MODEL = "gemini-4-hydrogen";

export const MIN_VIEWS_FOR_UX_HILLCLIMB = 50;

export const ALLOWED_TIER1_FILES = [
  "artifacts/home/src/site.ts",
  "artifacts/home/src/telemetry-client.ts",
  "artifacts/home/src/index.ts",
  "artifacts/home/src/self-opt.ts",
] as const;

export interface FitnessScorecard {
  month: string;
  computedAt: string;
  totalPageViews: number;
  paidLandingViews: number;
  paidScroll50RatePct: number | null;
  interactionRatePct: number | null;
  ttfbP75Ms: number | null;
  lcpP75Ms: number | null;
  agentSuccessRatePct: number | null;
  agentAvgLatencyMs: number;
  compositeScore: number;
  bottlenecks: string[];
}

export interface HillclimbGate {
  mode: "ops-only" | "full-hillclimb";
  allowUxCopyEdits: boolean;
  activeFlight: boolean;
  flightName: string | null;
  minViewsRequired: number;
  currentViews: number;
  reason: string;
}

export function computeFitnessScorecard(
  telemetry = buildTelemetrySummary(),
): FitnessScorecard {
  const views = telemetry.human.totalPageViews;
  const variants = Object.values(telemetry.human.campaignVariants ?? {});
  const paidLandingViews = variants.reduce((sum, v) => sum + (v.pageViews || 0), 0);
  const paidScroll50 = variants.reduce((sum, v) => sum + (v.scroll50 || 0), 0);
  const paidScroll50RatePct = paidLandingViews > 0
    ? Number(((paidScroll50 / paidLandingViews) * 100).toFixed(1))
    : null;

  const totalInteractions =
    (telemetry.human.lensSwitches.human || 0) +
    (telemetry.human.lensSwitches.agent || 0) +
    Object.values(telemetry.human.experimentClicks || {}).reduce((a, b) => a + b, 0) +
    Object.values(telemetry.human.outboundClicks || {}).reduce((a, b) => a + b, 0);
  const interactionRatePct = views > 0
    ? Number(((totalInteractions / views) * 100).toFixed(1))
    : null;

  const ttfb = telemetry.human.cwvP75.ttfbMs;
  const lcp = telemetry.human.cwvP75.lcpMs;
  const agentReqs = telemetry.agents.totalRequests;
  const agentSuccessRatePct = agentReqs > 0
    ? Number((((Math.max(0, agentReqs - telemetry.agents.errors4xx5xx)) / agentReqs) * 100).toFixed(1))
    : null;

  // Component scores (0–100 each)
  const speedScore = (() => {
    if (ttfb == null && lcp == null) return 75;
    const ttfbScore = ttfb == null ? 80 : Math.max(0, Math.min(100, Math.round(100 - Math.max(0, ttfb - 400) / 20)));
    const lcpScore = lcp == null ? 80 : Math.max(0, Math.min(100, Math.round(100 - Math.max(0, lcp - 1200) / 25)));
    return Math.round((ttfbScore + lcpScore) / 2);
  })();
  const paidScore = paidScroll50RatePct == null ? 50 : Math.min(100, Math.round(paidScroll50RatePct * 2));
  const engageScore = interactionRatePct == null ? 50 : Math.min(100, Math.round(interactionRatePct * 2.5));
  const agentScore = agentSuccessRatePct == null ? 85 : Math.round(agentSuccessRatePct);

  const compositeScore = Math.round(
    speedScore * 0.35 + paidScore * 0.25 + engageScore * 0.20 + agentScore * 0.20,
  );

  const bottlenecks: string[] = [];
  if (ttfb != null && ttfb > 800) bottlenecks.push(`High TTFB p75 (${ttfb}ms — likely Cloud Run cold starts)`);
  if (lcp != null && lcp > 2500) bottlenecks.push(`Slow LCP p75 (${lcp}ms)`);
  if (paidLandingViews >= 10 && (paidScroll50RatePct ?? 0) < 15) {
    bottlenecks.push(`Low paid >50% scroll rate (${paidScroll50RatePct}% across ${paidLandingViews} UTM landings)`);
  }
  if (agentReqs >= 10 && (agentSuccessRatePct ?? 100) < 90) {
    bottlenecks.push(`Agent/crawler 4xx/5xx rate elevated (${agentSuccessRatePct}% 2xx)`);
  }

  return {
    month: telemetry.month,
    computedAt: new Date().toISOString(),
    totalPageViews: views,
    paidLandingViews,
    paidScroll50RatePct,
    interactionRatePct,
    ttfbP75Ms: ttfb,
    lcpP75Ms: lcp,
    agentSuccessRatePct,
    agentAvgLatencyMs: telemetry.agents.avgLatencyMs,
    compositeScore,
    bottlenecks,
  };
}

export function evaluateHillclimbGate(
  telemetry = buildTelemetrySummary(),
  liveTracker = getLiveCampaignTracker(),
): HillclimbGate {
  const activeFlight = liveTracker.stage === "live";
  const currentViews = telemetry.human.totalPageViews;
  if (activeFlight) {
    return {
      mode: "ops-only",
      allowUxCopyEdits: false,
      activeFlight: true,
      flightName: liveTracker.campaignName,
      minViewsRequired: MIN_VIEWS_FOR_UX_HILLCLIMB,
      currentViews,
      reason: `Active A/B flight ("${liveTracker.campaignName}") — UX/copy edits locked to protect experiment validity; ops & performance fixes allowed.`,
    };
  }
  if (currentViews < MIN_VIEWS_FOR_UX_HILLCLIMB) {
    return {
      mode: "ops-only",
      allowUxCopyEdits: false,
      activeFlight: false,
      flightName: null,
      minViewsRequired: MIN_VIEWS_FOR_UX_HILLCLIMB,
      currentViews,
      reason: `Sample gate: ${currentViews}/${MIN_VIEWS_FOR_UX_HILLCLIMB} views — ops & performance fixes only until volume reaches threshold.`,
    };
  }
  return {
    mode: "full-hillclimb",
    allowUxCopyEdits: true,
    activeFlight: false,
    flightName: null,
    minViewsRequired: MIN_VIEWS_FOR_UX_HILLCLIMB,
    currentViews,
    reason: `Gate open (${currentViews} views, no conflicting flight) — 1 bounded Tier-1 UX/SEO/performance hillclimb change unlocked.`,
  };
}

export interface OptimisationProposal {
  id: string;
  area: "seo-ai" | "ux-copy" | "performance" | "agent-surface";
  title: string;
  hypothesis: string;
  targetMetric: string;
  tier: "tier-1-auto" | "tier-2-review";
  files: string[];
  status: "proposed" | "deployed" | "kept" | "reverted";
}

export interface MonthlyReflection {
  month: string;
  generatedAt: string;
  model: string;
  summary: string;
  humanInsights: string[];
  agentInsights: string[];
  previousCycleVerdict: string;
  proposals: OptimisationProposal[];
}

const reflectionSchema = z.object({
  summary: z.string().min(20).max(1200),
  humanInsights: z.array(z.string().min(5).max(400)).min(1).max(5),
  agentInsights: z.array(z.string().min(5).max(400)).min(1).max(5),
  previousCycleVerdict: z.string().min(5).max(600),
  proposals: z.array(
    z.object({
      id: z.string().min(2).max(60),
      area: z.enum(["seo-ai", "ux-copy", "performance", "agent-surface"]),
      title: z.string().min(5).max(160),
      hypothesis: z.string().min(10).max(600),
      targetMetric: z.string().min(3).max(200),
      tier: z.enum(["tier-1-auto", "tier-2-review"]),
      files: z.array(z.string().min(1).max(160)).min(1).max(6),
    }),
  ).min(1).max(3),
});

const INITIAL_REFLECTION: MonthlyReflection = {
  month: "2026-11",
  generatedAt: "2026-11-23T00:00:00.000Z",
  model: "baseline-audit",
  summary:
    "Baseline launch audit completed: Domain property verified in Google Search Console with Search generative AI set to Include, sitemap.xml submitted (6 URLs), all 3 experiment pages queued for priority indexing, and zero-PII human + agent telemetry activated.",
  humanInsights: [
    "Dual Human|Agent X-Ray Lens and Core Web Vitals (LCP, INP, CLS, TTFB) are now instrumented via fetchLater() batched beacons.",
    "Experiment click-throughs and scroll milestones (25%–100%) establish the baseline for December's first autonomous reflection.",
  ],
  agentInsights: [
    "robots.txt, sitemap.xml (<lastmod>), ProfilePage + Article + BreadcrumbList JSON-LD, og:image, and max-image-preview:large are live for Google AI Overviews and AI Mode.",
    "Server middleware now tracks Googlebot, Google-Extended, GPTBot, ClaudeBot, PerplexityBot, and MCP/llms.txt surface latency.",
  ],
  previousCycleVerdict: "Baseline cycle — no prior autonomous changes to grade yet.",
  proposals: [
    {
      id: "opt-2026-11-schema-og",
      area: "seo-ai",
      title: "Rich-result Schema.org + 1200x630 og:image + max-image-preview:large",
      hypothesis:
        "Adding ProfilePage, Article, BreadcrumbList JSON-LD and a large social preview image unlocks GSC Enhancements and rich visual cards in Google AI Overviews / Discover.",
      targetMetric: "GSC Enhancements valid items > 0 and AI Overview/Search CTR",
      tier: "tier-1-auto",
      files: ["artifacts/home/src/site.ts", "artifacts/home/src/index.ts"],
      status: "deployed",
    },
    {
      id: "opt-2026-11-telemetry",
      area: "ux-copy",
      title: "Zero-PII dual telemetry (fetchLater + agent crawler middleware)",
      hypothesis:
        "Capturing real-user CWV, lens switches, scroll depth, and AI crawler traffic gives the monthly reflection loop concrete evidence instead of guesswork.",
      targetMetric: "Monthly reflection grounded in real human + agent telemetry",
      tier: "tier-1-auto",
      files: ["artifacts/home/src/telemetry.ts", "artifacts/home/src/telemetry-client.ts"],
      status: "deployed",
    },
  ],
};

let reflections: MonthlyReflection[] = [INITIAL_REFLECTION];

async function hydrateReflections() {
  const saved = await loadSelfOptDoc<{ reflections: MonthlyReflection[] }>("reflections-log");
  if (saved?.reflections?.length) {
    reflections = saved.reflections;
  }
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found");
  return JSON.parse(candidate.slice(start, end + 1));
}

function reflectionsMarkdown(base: string): string {
  const telemetry = buildTelemetrySummary();
  const scorecard = computeFitnessScorecard(telemetry);
  const gate = evaluateHillclimbGate(telemetry);
  const L: string[] = [
    "# Self-Optimising Reflection Log — jacksmyth.fyi",
    "",
    `Canonical page: ${base}/reflections`,
    `Live telemetry API: ${base}/api/self-opt/summary`,
    `Live fitness & gate API: ${base}/api/self-opt/fitness`,
    "",
    "This site observes zero-PII human UX metrics (Core Web Vitals, scroll depth, lens switches, experiment clicks) and AI crawler/MCP telemetry every day, runs a weekly hillclimb loop via GitHub Actions, grades prior changes (keep/revert), and ships guarded Tier-1 improvements verified by CI.",
    "",
    `## Current Pulse & Fitness Scorecard (${telemetry.month})`,
    `- Composite fitness score: ${scorecard.compositeScore}/100`,
    `- Hillclimb gate: ${gate.mode} (${gate.reason})`,
    `- Human page views: ${telemetry.human.totalPageViews} (paid UTM landings: ${scorecard.paidLandingViews}, paid >50% scroll: ${scorecard.paidScroll50RatePct ?? "n/a"}%)`,
    `- Lens switches: Human=${telemetry.human.lensSwitches.human}, Agent=${telemetry.human.lensSwitches.agent}`,
    `- Core Web Vitals (p75): TTFB=${telemetry.human.cwvP75.ttfbMs ?? "n/a"}ms, LCP=${telemetry.human.cwvP75.lcpMs ?? "n/a"}ms, INP=${telemetry.human.cwvP75.inpMs ?? "n/a"}ms, CLS=${telemetry.human.cwvP75.cls ?? "n/a"}`,
    `- Agent & crawler requests: ${telemetry.agents.totalRequests} (${scorecard.agentSuccessRatePct ?? "n/a"}% 2xx, avg ${telemetry.agents.avgLatencyMs}ms, errors=${telemetry.agents.errors4xx5xx})`,
    ...(scorecard.bottlenecks.length ? [`- Active bottlenecks: ${scorecard.bottlenecks.join("; ")}`] : []),
    "",
  ];
  for (const r of reflections) {
    L.push(`## Reflection ${r.month} (${r.model})`, r.summary, "", `Previous cycle verdict: ${r.previousCycleVerdict}`, "");
    L.push("### Proposals");
    for (const p of r.proposals) {
      L.push(`- [${p.status}] (${p.tier}) **${p.title}** — ${p.hypothesis} (Target: ${p.targetMetric})`);
    }
    L.push("");
  }
  return L.join("\n") + "\n";
}

function reflectionsBody() {
  const t = buildTelemetrySummary();
  const scorecard = computeFitnessScorecard(t);
  const gate = evaluateHillclimbGate(t);
  const agentList = Object.entries(t.agents.byAgent)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span>${esc(k)} · ${v}</span>`)
    .join("") || "<span>Listening for crawlers &amp; MCP clients…</span>";

  return `<div class="experiment" data-experiment="self-optimising-loop">
  <div class="crumb"><a href="/">Jack Smyth</a><span>/</span><span>Self-Optimising Reflections</span></div>
  <div class="eyebrow">Autonomous Weekly Hillclimb Loop</div>
  <h1>A site that learns<br>from every visit.</h1>
  <p class="deck">Zero-PII human UX + AI crawler telemetry, graded weekly against a 4-metric fitness scorecard and shipped through CI-verified Pull Requests.</p>
  <section id="pulse">
    <div class="section-top"><div><div class="section-no">01 / Live Pulse &amp; Fitness (${esc(t.month)})</div><h2>Human &amp; agent telemetry.</h2></div><p class="quiet">Fitness: <strong>${scorecard.compositeScore}/100</strong> · Gate: <code>${esc(gate.mode)}</code></p></div>
    <div class="split">
      <article class="surface">
        <div class="eyebrow">Human Experience</div>
        <p><strong>${t.human.totalPageViews}</strong> page views · <strong>${t.human.lensSwitches.agent}</strong> Agent X-Ray switches · Paid &gt;50% scroll: <strong>${scorecard.paidScroll50RatePct ?? "n/a"}%</strong></p>
        <div class="facts">
          <span>TTFB p75 · ${t.human.cwvP75.ttfbMs ?? "collecting"}ms</span>
          <span>LCP p75 · ${t.human.cwvP75.lcpMs ?? "collecting"}ms</span>
          <span>INP p75 · ${t.human.cwvP75.inpMs ?? "collecting"}ms</span>
          <span>CLS p75 · ${t.human.cwvP75.cls ?? "collecting"}</span>
        </div>
      </article>
      <article class="surface">
        <div class="eyebrow">Agent &amp; Crawler Surface</div>
        <p><strong>${t.agents.totalRequests}</strong> crawler / MCP hits · <strong>${t.agents.avgLatencyMs}ms</strong> avg latency · <strong>${t.agents.errors4xx5xx}</strong> errors</p>
        <div class="facts">${agentList}</div>
      </article>
    </div>
    <p class="quiet"><strong>Hillclimb Gate (${esc(gate.mode)}):</strong> ${esc(gate.reason)}</p>
  </section>
  <section id="log">
    <div class="section-no">02 / Reflection &amp; Hillclimb Log</div>
    <h2>What the loop observed &amp; shipped.</h2>
    ${reflections.map((r) => `<article class="surface">
      <div class="section-top"><h3>${esc(r.month)} Reflection</h3><span class="tag">${esc(r.model)}</span></div>
      <p>${esc(r.summary)}</p>
      <p class="quiet"><strong>Prior cycle verdict:</strong> ${esc(r.previousCycleVerdict)}</p>
      <ul class="reasons">${r.proposals.map((p) => `<li><b>[${esc(p.status)}] ${esc(p.title)}</b> <span class="tag">${esc(p.tier)}</span><br>${esc(p.hypothesis)}<br><small>Target: ${esc(p.targetMetric)} · Files: ${esc(p.files.join(", "))}</small></li>`).join("")}</ul>
    </article>`).join("")}
  </section>
  <section class="method" id="guardrails">
    <h2>Guarded by design.</h2>
    <p>Every Monday via GitHub Actions, the autonomous hillclimber evaluates human UX, Core Web Vitals, and AI crawler telemetry against the prior baseline, enforces the data &amp; A/B flight gate, grades previous changes (keep/revert), and opens a Pull Request verified by <code>pnpm run verify</code> (typecheck, MCP, protocol, browser, and axe-core accessibility tests) — auto-merging bounded Tier-1 improvements while holding Tier-2 changes for human review.</p>
    <p><a href="/reflections.md">Read the Markdown reflection log</a> · <a href="/api/self-opt/summary">Live telemetry JSON</a> · <a href="/api/self-opt/fitness">Live fitness &amp; gate JSON</a></p>
  </section>
</div>`;
}

export function registerSelfOpt(app: Express, origin: (req: Request) => string) {
  void hydrateReflections();

  app.get("/reflections", (req, res) => {
    res.vary("Accept");
    if ((req.headers.accept || "").includes("text/markdown")) {
      res.type("text/markdown; charset=utf-8").send(reflectionsMarkdown(origin(req)));
      return;
    }
    res.type("html").send(
      page(
        origin(req),
        {
          path: "/reflections",
          title: "Self-Optimising Reflections — Jack Smyth",
          description:
            "Live human UX, Core Web Vitals, and AI crawler telemetry powering weekly autonomous optimisations on jacksmyth.fyi.",
          body: reflectionsBody(),
        },
        res.locals.nonce,
      ),
    );
  });

  app.get("/reflections.md", (req, res) => {
    res.type("text/markdown; charset=utf-8").send(reflectionsMarkdown(origin(req)));
  });

  app.get("/api/self-opt/reflections", (_req, res) => {
    res.json({ reflections });
  });

  app.get("/api/self-opt/fitness", (req, res) => {
    const month = typeof req.query.month === "string" && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : undefined;
    const telemetry = buildTelemetrySummary(month);
    const scorecard = computeFitnessScorecard(telemetry);
    const gate = evaluateHillclimbGate(telemetry);
    res.json({
      scorecard,
      gate,
      allowedTier1Files: ALLOWED_TIER1_FILES,
      latestReflection: reflections[0] ?? null,
    });
  });

  app.post("/api/self-opt/reflect", async (req: Request, res: Response) => {
    const secret = process.env.SELF_OPT_CRON_SECRET || process.env.FIELD_LAB_CRON_SECRET || process.env.WET_LAB_CRON_SECRET;
    if (!secret) {
      res.status(503).json({ error: "Monthly reflection trigger is not configured (missing SELF_OPT_CRON_SECRET)." });
      return;
    }
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "GEMINI_API_KEY is required for autonomous reflection." });
      return;
    }

    const month = typeof req.body?.month === "string" && /^\d{4}-\d{2}$/.test(req.body.month)
      ? req.body.month
      : new Date().toISOString().slice(0, 7);
    const gscNotes = typeof req.body?.gscSummary === "string" ? req.body.gscSummary.slice(0, 4000) : "No external GSC summary supplied.";
    const telemetry = buildTelemetrySummary(month);
    const scorecard = computeFitnessScorecard(telemetry);
    const gate = evaluateHillclimbGate(telemetry);
    const previous = reflections[0];

    try {
      const ai = new GoogleGenAI({ apiKey });
      const interaction = await ai.interactions.create({
        model: REFLECT_MODEL,
        system_instruction:
          "You are the Autonomous UX & AI Visibility Hillclimber for jacksmyth.fyi. Analyze human UX telemetry, Core Web Vitals, Search Console data, and AI crawler/MCP logs. Strictly respect the Hillclimb Gate: when mode is 'ops-only', NEVER propose UX/copy changes that could contaminate an active A/B flight or low-sample test — propose only performance/ops/crawler-hygiene improvements. Grade the previous cycle honestly (keep/iterate/revert) and propose 1–3 concrete, falsifiable, bounded optimisations. Return ONLY valid JSON.",
        input: `Month: ${month}
Fitness Scorecard:
${JSON.stringify(scorecard, null, 2)}

Hillclimb Gate:
${JSON.stringify(gate, null, 2)}

Allowlisted Tier-1 Auto-Merge Files:
${JSON.stringify(ALLOWED_TIER1_FILES)}

Live Telemetry JSON:
${JSON.stringify(telemetry, null, 2)}

Search Console Notes:
${gscNotes}

Previous Reflection:
${JSON.stringify(previous, null, 2)}

Return JSON matching:
{
  "summary": "string (concise executive summary)",
  "humanInsights": ["string"],
  "agentInsights": ["string"],
  "previousCycleVerdict": "string (keep / iterate / revert verdict on prior changes)",
  "proposals": [
    {
      "id": "opt-YYYY-MM-slug",
      "area": "seo-ai | ux-copy | performance | agent-surface",
      "title": "string",
      "hypothesis": "string",
      "targetMetric": "string",
      "tier": "tier-1-auto | tier-2-review",
      "files": ["artifacts/home/src/..."]
    }
  ]
}`,
        generation_config: { max_output_tokens: 8192 },
      });

      const text = interaction.output_text ?? "";
      const parsed = reflectionSchema.parse(extractJsonObject(text));
      const nextReflection: MonthlyReflection = {
        month,
        generatedAt: new Date().toISOString(),
        model: REFLECT_MODEL,
        summary: parsed.summary,
        humanInsights: parsed.humanInsights,
        agentInsights: parsed.agentInsights,
        previousCycleVerdict: parsed.previousCycleVerdict,
        proposals: parsed.proposals.map((p) => ({ ...p, status: "proposed" })),
      };
      reflections = [nextReflection, ...reflections.filter((r) => r.month !== month)].slice(0, 24);
      const persisted = await saveSelfOptDoc("reflections-log", { reflections });
      res.json({ ok: true, persisted, scorecard, gate, reflection: nextReflection });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Reflection failed." });
    }
  });
}
