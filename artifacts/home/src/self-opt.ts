import type { Express, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { page } from "./site.js";
import { buildTelemetrySummary, loadSelfOptDoc, saveSelfOptDoc } from "./telemetry.js";

// Self-Optimising Monthly Reflection Engine.
// Uses Gemini 4 Hydrogen to reflect on human UX, Core Web Vitals, Search Console,
// and agent/crawler telemetry each month, and stores public reflection logs in Firestore.

const REFLECT_MODEL = "gemini-4-hydrogen";

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
  const L: string[] = [
    "# Self-Optimising Reflection Log — jacksmyth.fyi",
    "",
    `Canonical page: ${base}/reflections`,
    `Live telemetry API: ${base}/api/self-opt/summary`,
    "",
    "This site observes zero-PII human UX metrics (Core Web Vitals, scroll depth, lens switches, experiment clicks) and AI crawler/MCP telemetry every day, reflects monthly using Gemini, and proposes guarded Pull Requests verified by CI.",
    "",
    `## Current Month Pulse (${telemetry.month})`,
    `- Human page views: ${telemetry.human.totalPageViews}`,
    `- Lens switches: Human=${telemetry.human.lensSwitches.human}, Agent=${telemetry.human.lensSwitches.agent}`,
    `- Core Web Vitals (p75): LCP=${telemetry.human.cwvP75.lcpMs ?? "n/a"}ms, INP=${telemetry.human.cwvP75.inpMs ?? "n/a"}ms, CLS=${telemetry.human.cwvP75.cls ?? "n/a"}`,
    `- Agent & crawler requests: ${telemetry.agents.totalRequests} (avg ${telemetry.agents.avgLatencyMs}ms, errors=${telemetry.agents.errors4xx5xx})`,
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
  const agentList = Object.entries(t.agents.byAgent)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<span>${esc(k)} · ${v}</span>`)
    .join("") || "<span>Listening for crawlers &amp; MCP clients…</span>";

  return `<div class="experiment" data-experiment="self-optimising-loop">
  <div class="crumb"><a href="/">Jack Smyth</a><span>/</span><span>Self-Optimising Reflections</span></div>
  <div class="eyebrow">Autonomous UX &amp; AI Visibility Loop</div>
  <h1>A site that learns<br>from every visit.</h1>
  <p class="deck">Zero-PII human UX + AI crawler telemetry, reflected on each month and shipped through guarded Pull Requests.</p>
  <section id="pulse">
    <div class="section-top"><div><div class="section-no">01 / Live Monthly Pulse (${esc(t.month)})</div><h2>Human &amp; agent telemetry.</h2></div><p class="quiet">Batched via <code>fetchLater()</code> on the client and zero-PII middleware on Cloud Run.</p></div>
    <div class="split">
      <article class="surface">
        <div class="eyebrow">Human Experience</div>
        <p><strong>${t.human.totalPageViews}</strong> page views · <strong>${t.human.lensSwitches.agent}</strong> Agent X-Ray switches</p>
        <div class="facts">
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
  </section>
  <section id="log">
    <div class="section-no">02 / Monthly Reflection Log</div>
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
    <p>Every monthly reflection runs via GitHub Actions on the 1st of the month, evaluates the last 30 days of human UX, Core Web Vitals, Search Console, and AI crawler signals, and opens a Pull Request verified by <code>pnpm run verify</code> (typecheck, MCP, protocol, browser, and axe-core accessibility tests) before deploying to Cloud Run.</p>
    <p><a href="/reflections.md">Read the Markdown reflection log</a> · <a href="/api/self-opt/summary">Inspect live telemetry JSON</a></p>
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
            "Live human UX, Core Web Vitals, and AI crawler telemetry powering monthly autonomous optimisations on jacksmyth.fyi.",
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

  app.post("/api/self-opt/reflect", async (req: Request, res: Response) => {
    const secret = process.env.SELF_OPT_CRON_SECRET || process.env.WET_LAB_CRON_SECRET;
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
    const previous = reflections[0];

    try {
      const ai = new GoogleGenAI({ apiKey });
      const interaction = await ai.interactions.create({
        model: REFLECT_MODEL,
        system_instruction:
          "You are the Autonomous UX & AI Visibility Reflector for jacksmyth.fyi. Analyze human UX telemetry, Core Web Vitals, Search Console data, and AI crawler/MCP logs. Grade the previous cycle honestly and propose 1–3 concrete, falsifiable, bounded optimisations. Return ONLY valid JSON.",
        input: `Month: ${month}
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
      res.json({ ok: true, persisted, reflection: nextReflection });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Reflection failed." });
    }
  });
}
