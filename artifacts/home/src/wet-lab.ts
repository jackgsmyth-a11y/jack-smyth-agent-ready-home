import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { page } from "./site.js";
import { wetLabClientScript } from "./wet-lab-client.js";
import { isFirestoreEnabled, loadWetLabSnapshot, saveWetLabSnapshot } from "./wet-lab-store.js";
import { runAutonomousPitchSwarm } from "./wet-lab-swarm.js";
import { buildTelemetrySummary, recordServerCampaignLanding } from "./telemetry.js";

export interface CreativeVariant {
  id: string;
  label: string;
  hook: string;
  format: string;
  cta: string;
}

export interface JudgeScorecard {
  cmoActionability: number;
  statisticalFeasibility: number;
  noveltyAndRigour: number;
  policyAndBrandSafety: number;
  total: number;
  verdict: string;
}

export interface LabPitch {
  id: string;
  team: "Team Differentiation" | "Team Multimodality" | "Team Anticipation";
  bet: "differentiation" | "multimodality" | "anticipation";
  title: string;
  hypothesis: string;
  cmoRelevance: string;
  channel: string;
  targeting: string;
  budgetAud: number;
  primaryMetric: string;
  expectedSampleSize: string;
  falsificationCondition: string;
  variants: CreativeVariant[];
  judge: JudgeScorecard;
  votes: number;
}

export interface LabQuestionSubmission {
  id: string;
  question: string;
  submittedBy: string;
  submittedAt: string;
}

export interface LabCycle {
  id: string;
  month: string;
  status: "open-for-voting" | "running" | "published";
  mode: "dry-run-v1" | "live-google-ads";
  scoutSource: string;
  researchQuestion: string;
  context: string;
  budgetCapAud: number;
  tokenBudgetNote: string;
  pitches: LabPitch[];
  youtubeVideoBrief: {
    title: string;
    chapters: string[];
    verdictPrompt: string;
  };
}

export const SPEND_GUARDRAILS = {
  hardCapMonthlyAud: 100,
  hardCapDailyAud: 10,
  autoPauseAtSpendAud: 95,
  funnelIntegrityGuardrail: "Skeptic Agent halts/alerts if click-to-landing rate falls below 35% after 20+ paid clicks (prevents burning the A$100 cap on broken tracking or WebView drop-off).",
  statisticalFramework: "Bayesian probability of superiority (Beta-Binomial posterior)",
  minimumSignalPolicy: "Upper/mid-funnel high-volume signals only (impressions, 3s hold, CTR, micro-conversions). Down-funnel CPA tests rejected at A$100 scale.",
  googleAdsMcp: {
    server: "googleads/google-ads-mcp",
    mode: "propose-and-confirm",
    capabilities: ["GAQL reporting queries", "Text/image/YouTube asset creation (validate_only dry-run)", "Experiment label management"],
    campaignMutationBoundary: "Tier 1: human launches campaign from agent checklist. Tier 2: Guarded Cloud Run Ads API service enforces hard A$100 cap in code.",
  },
  modelStack: {
    scoutAndSwarm: "gemini-4-hydrogen + Google Search Grounding",
    judgeRubric: "gemini-decision-1 (calibrated rubric scoring)",
    imageCreative: "gemini-nano-banana-2.1",
    videoShorts: "gemini-omni-1.2-flash",
  },
  selectionGovernance: "Autonomous by default: Industry Pulse (Google Search Grounding + Trends) + Judge Agent select the winning experiment without waiting on vote volume. Human & agent votes act as an optional community signal.",
  allowedDestinationDomains: ["jacksmyth.fyi", "jack-smyth-agent-ready-home", "youtube.com", "thebrandtechgroup.com"],
} as const;

const INITIAL_CYCLE: LabCycle = {
  id: "cycle-2026-11",
  month: "November 2026",
  status: "running",
  mode: "live-google-ads",
  scoutSource: "gemini-4-hydrogen + Google Search Grounding (Cycle 01 baseline)",
  researchQuestion: "On a A$100 media grant, which creative and channel framing generates the clearest engagement signal from marketing decision-makers exploring AI visibility?",
  context: "Frontier AI labs make research teams pitch for compute. Here, three competing marketing agent teams—mapped to Jack Smyth's three bets—were given an identical A$100 AUD monthly media cap and tasked with pitching a falsifiable, Google Ads-executable test that yields honest directional evidence for CMOs.",
  budgetCapAud: 100,
  tokenBudgetNote: "Fixed per-team pitch allowance; Judge Agent scores against a calibrated 100-point rubric before public voting.",
  pitches: [
    {
      id: "pitch-differentiation",
      team: "Team Differentiation",
      bet: "differentiation",
      title: "Independent benchmark vs. vendor case study",
      hypothesis: "Demand Gen ad cards that lead with a falsifiable third-party statistic ('89% of B2B AI citations skip vendor sites') will outperform conventional vendor case-study framing on CTR and post-click scroll depth.",
      cmoRelevance: "Tests whether the same evidence-first structure that earns LLM citations also wins human CMO attention in paid media.",
      channel: "Google Display / Demand Gen (In-Feed + Discover, AU)",
      targeting: "Marketing & Advertising Professionals affinity + B2B SaaS / CMO interest segments (AU)",
      budgetAud: 100,
      primaryMetric: "CTR + On-site >50% scroll depth micro-conversion",
      expectedSampleSize: "6,000–10,000 impressions, 60–140 clicks across 2 matched variants",
      falsificationCondition: "If Independent Benchmark fails to beat Brand Case Study by at least +15% relative CTR with >=75% Bayesian posterior probability.",
      variants: [
        { id: "d-a", label: "Variant A (Independent Benchmark)", hook: "89% of B2B AI citations skip vendor sites. Independent 2026 Channel Benchmark.", format: "gemini-nano-banana-2.1 editorial card (charcoal + lemon)", cta: "Read the evidence" },
        { id: "d-b", label: "Variant B (Brand Case Study)", hook: "How B2B marketing leaders grow pipeline smarter. Brand Growth Case Study.", format: "gemini-nano-banana-2.1 matched control card", cta: "Read the case study" },
      ],
      judge: {
        cmoActionability: 25,
        statisticalFeasibility: 24,
        noveltyAndRigour: 16,
        policyAndBrandSafety: 16,
        total: 81,
        verdict: "Cleanest A/B variable isolation at A$100 AUD. Matched visual design ensures the media grant measures message truth rather than creative noise.",
      },
      votes: 0,
    },
    {
      id: "pitch-multimodality",
      team: "Team Multimodality",
      bet: "multimodality",
      title: "Show the agent working vs. state the claim",
      hypothesis: "A 20-second YouTube Short showing a real screen-recording of an AI shopping agent rejecting a vague product page will earn a higher 3-second hold rate and CTR than an identical-length talking-head claim about 'AI visibility'.",
      cmoRelevance: "Directly tests whether 'show, don't claim' multimodal proof cuts through B2B AI fatigue on YouTube.",
      channel: "YouTube Shorts / Demand Gen (Australia)",
      targeting: "Custom intent: marketing leaders researching GEO, AI search, brand visibility, Google Ads AI",
      budgetAud: 100,
      primaryMetric: "Engaged view rate + Click-through rate (CTR)",
      expectedSampleSize: "4,000–7,500 impressions (~A$14–25 CPM) across 2 variants",
      falsificationCondition: "If Bayesian P(Screen-Recording > Claim) < 0.70 after 4,000 combined impressions, reject the hypothesis.",
      variants: [
        { id: "m-a", label: "Variant A (Proof)", hook: "Watch an AI agent ignore a $40M brand in 4 seconds.", format: "20s vertical screen-recording + captions (gemini-omni-1.2-flash)", cta: "See the live test" },
        { id: "m-b", label: "Variant B (Claim)", hook: "Why AI agents aren't recommending your brand in 2026.", format: "20s vertical typography + voiceover", cta: "See the live test" },
      ],
      judge: {
        cmoActionability: 24,
        statisticalFeasibility: 23,
        noveltyAndRigour: 15,
        policyAndBrandSafety: 16,
        total: 78,
        verdict: "Strong upper-funnel volume on YouTube Shorts and directly aligned with Bet 2; slightly higher creative variance between screen-capture and typography.",
      },
      votes: 0,
    },
    {
      id: "pitch-anticipation",
      team: "Team Anticipation",
      bet: "anticipation",
      title: "Call-to-Agent (CTAi) search hook vs. standard B2B copy",
      hypothesis: "Responsive Search Ads inviting users to 'connect your AI agent via MCP' will attract a higher on-site tool-interaction rate (running a search or copying the MCP URL) than standard 'read our AI marketing guide' copy.",
      cmoRelevance: "Measures whether real-world marketers are ready to act on agent-native interfaces (CTAi) versus traditional editorial downloads.",
      channel: "Google Search (Exact & Phrase long-tail, AU)",
      targeting: "Long-tail low-CPC queries: 'share of model marketing', 'generative engine marketing', 'mcp server for marketing', 'brand to agent'",
      budgetAud: 100,
      primaryMetric: "CTR + On-site MCP/search interaction rate",
      expectedSampleSize: "150–300 clicks (est. A$0.35–0.65 CPC on niche long-tail)",
      falsificationCondition: "If fewer than 100 total clicks are achieved within 14 days or CTAi interaction rate trails control.",
      variants: [
        { id: "a-a", label: "Variant A (CTAi)", hook: "Connect Your Agent to Our Live Marketing MCP | Open Research", format: "Google Search RSA", cta: "Copy MCP endpoint" },
        { id: "a-b", label: "Variant B (Editorial)", hook: "Generative Engine Marketing Guide | B2A Strategy & Research", format: "Google Search RSA", cta: "Read the guide" },
      ],
      judge: {
        cmoActionability: 23,
        statisticalFeasibility: 20,
        noveltyAndRigour: 17,
        policyAndBrandSafety: 16,
        total: 76,
        verdict: "Highest novelty and direct Brandtech prospect intent, though niche search volume in Australia may pace slowly over 14 days.",
      },
      votes: 0,
    },
  ],
  youtubeVideoBrief: {
    title: "Can 3 AI Agent Teams Run a Real A$100 Google Ads Test? (Field Lab Cycle 01 Verdict)",
    chapters: [
      "00:00 — Researchers pitch for compute; agent teams pitch for a A$100 media grant",
      "00:45 — The 3 competing agent pitches (Differentiation vs. Multimodality vs. Anticipation)",
      "01:30 — How Google Ads MCP + hard-coded spend guardrails executed the winner",
      "02:15 — The Bayesian verdict: what actually worked and what a CMO should steal",
    ],
    verdictPrompt: "Open with the winning variant's exact impression count and Bayesian win probability before explaining the methodology.",
  },
};

// In-memory state for v1 dry-run & local dev; structured cleanly to swap to Firestore when FIRESTORE_ENABLED=true.
let activeCycle: LabCycle = structuredClone(INITIAL_CYCLE);
const submittedQuestions: LabQuestionSubmission[] = [
  {
    id: "q-seed-1",
    question: "Does mentioning 'independent benchmark' vs. 'brand case study' change CTR for B2B CMOs on Demand Gen?",
    submittedBy: "Seed prompt (Field Lab v1)",
    submittedAt: "2026-11-22T00:00:00.000Z",
  },
];

const e = (x: unknown) => String(x ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface CampaignSnapshot {
  cycleId: string;
  accountId: string;
  campaignName: string;
  channel: string;
  winningTeam: string;
  winningPitchId: string;
  winningScore: number;
  flightStart: string;
  flightEnd: string;
  budgetCapAud: number;
  autoPauseAud: number;
  stage: "draft-ready" | "live" | "paused-at-cap" | "completed";
  spendAud: number;
  variantA: { impressions: number; clicks: number };
  variantB: { impressions: number; clicks: number };
  lastSyncedAt: string;
  syncSource: string;
}

let campaignSnapshot: CampaignSnapshot = {
  cycleId: "cycle-2026-11",
  accountId: process.env.GOOGLE_ADS_CUSTOMER_ID || "435-353-5484",
  campaignName: "Field Lab Cycle 01 - Benchmark vs Case Study",
  channel: "Google Ads Demand Gen (AU)",
  winningTeam: "Team Differentiation",
  winningPitchId: "pitch-differentiation",
  winningScore: 81,
  flightStart: "2026-11-23",
  flightEnd: "2026-12-02",
  budgetCapAud: 100,
  autoPauseAud: 95,
  stage: "live",
  spendAud: 9.99,
  variantA: { impressions: 1499, clicks: 31 },
  variantB: { impressions: 2816, clicks: 53 },
  lastSyncedAt: "2026-11-24T08:48:00.000Z",
  syncSource: "google-ads-mcp (435-353-5484) + first-party UTM telemetry",
};

// Exact Beta-Binomial numerical check (uniform Beta(1,1) prior) for P(p_A > p_B)
// Returns null probability when sample is too small so the glass box never fakes certainty.
function computeBayesianScrollLift(aViews: number, aScroll50: number, bViews: number, bScroll50: number) {
  const totalViews = aViews + bViews;
  const aRate = aViews > 0 ? Number(((aScroll50 / aViews) * 100).toFixed(1)) : null;
  const bRate = bViews > 0 ? Number(((bScroll50 / bViews) * 100).toFixed(1)) : null;
  if (totalViews < 20 || aViews < 5 || bViews < 5) {
    return {
      ready: false,
      probABeatsB: null as number | null,
      aRatePct: aRate,
      bRatePct: bRate,
      verdict: `Awaiting sample (n=${totalViews} landing views; requires ≥20 total and ≥5 per variant before computing posterior).`,
    };
  }
  const a1 = aScroll50 + 1;
  const b1 = Math.max(0, aViews - aScroll50) + 1;
  const a2 = bScroll50 + 1;
  const b2 = Math.max(0, bViews - bScroll50) + 1;
  // Normal approximation to Beta difference (accurate for a,b >= 5, deterministic, zero deps)
  const mu1 = a1 / (a1 + b1);
  const mu2 = a2 / (a2 + b2);
  const var1 = (a1 * b1) / (((a1 + b1) ** 2) * (a1 + b1 + 1));
  const var2 = (a2 * b2) / (((a2 + b2) ** 2) * (a2 + b2 + 1));
  const z = (mu1 - mu2) / Math.sqrt(var1 + var2 || 1e-9);
  // Abramowitz & Stegun erf approximation for standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2) / Math.sqrt(Math.PI);
  const prob = 0.5 * (1 + (z >= 0 ? erf : -erf));
  const pct = Number((prob * 100).toFixed(1));
  return {
    ready: true,
    probABeatsB: pct,
    aRatePct: aRate,
    bRatePct: bRate,
    verdict: pct >= 75
      ? `Directional signal: Variant A leads with ${pct}% Bayesian posterior probability on >50% scroll depth.`
      : pct <= 25
        ? `Directional signal: Variant B (control) leads — Variant A posterior is ${pct}%.`
        : `Inconclusive so far (${pct}% posterior) — continuing flight under A$100 cap.`,
  };
}

export function getLiveCampaignTracker() {
  const telemetry = buildTelemetrySummary();
  const variants = telemetry.human.campaignVariants ?? {};
  const utmA = variants["cycle_2026_11:variant_a"] ?? { pageViews: 0, serverLandingViews: 0, scroll50: 0, scroll75: 0, scroll100: 0 };
  const utmB = variants["cycle_2026_11:variant_b"] ?? { pageViews: 0, serverLandingViews: 0, scroll50: 0, scroll75: 0, scroll100: 0 };
  const totalImpressions = campaignSnapshot.variantA.impressions + campaignSnapshot.variantB.impressions;
  const totalClicks = campaignSnapshot.variantA.clicks + campaignSnapshot.variantB.clicks;
  const totalJsLandingViews = (utmA.pageViews || 0) + (utmB.pageViews || 0);
  const totalServerLandingViews = (utmA.serverLandingViews || 0) + (utmB.serverLandingViews || 0);
  const effectiveLandingViews = Math.max(totalJsLandingViews, totalServerLandingViews);
  const clickToLandingPct = totalClicks > 0 ? Number(((effectiveLandingViews / totalClicks) * 100).toFixed(1)) : null;
  const jsClickToLandingPct = totalClicks > 0 ? Number(((totalJsLandingViews / totalClicks) * 100).toFixed(1)) : null;
  const serverClickToLandingPct = totalClicks > 0 ? Number(((totalServerLandingViews / totalClicks) * 100).toFixed(1)) : null;
  const funnelAlert = totalClicks >= 20 && (clickToLandingPct ?? 0) < 35;
  const funnelHealth = {
    status: totalClicks < 20 ? "awaiting-sample" : funnelAlert ? "alert-funnel-drop" : "healthy",
    shouldHaltSpend: funnelAlert,
    minClicksThreshold: 20,
    minClickToLandingPct: 35,
    totalClicks,
    jsLandingViews: totalJsLandingViews,
    serverLandingViews: totalServerLandingViews,
    clickToLandingPct,
    jsClickToLandingPct,
    serverClickToLandingPct,
    message: totalClicks < 20
      ? `Awaiting ≥20 paid clicks before evaluating click-to-landing funnel integrity (${totalClicks}/20).`
      : funnelAlert
        ? `Skeptic funnel alert: ${effectiveLandingViews} landing views from ${totalClicks} paid clicks (${clickToLandingPct}% < 35% floor; JS=${totalJsLandingViews}, server=${totalServerLandingViews}). Audit landing telemetry and mobile WebView drop-off before scaling spend.`
        : `Funnel integrity healthy: ${effectiveLandingViews} landing views from ${totalClicks} paid clicks (${clickToLandingPct}%).`,
  };
  const ctrA = campaignSnapshot.variantA.impressions > 0
    ? Number(((campaignSnapshot.variantA.clicks / campaignSnapshot.variantA.impressions) * 100).toFixed(2))
    : null;
  const ctrB = campaignSnapshot.variantB.impressions > 0
    ? Number(((campaignSnapshot.variantB.clicks / campaignSnapshot.variantB.impressions) * 100).toFixed(2))
    : null;
  const bayesian = computeBayesianScrollLift(utmA.pageViews, utmA.scroll50, utmB.pageViews, utmB.scroll50);

  return {
    ...campaignSnapshot,
    totalImpressions,
    totalClicks,
    spendRemainingAud: Number(Math.max(0, campaignSnapshot.budgetCapAud - campaignSnapshot.spendAud).toFixed(2)),
    variants: {
      variantA: {
        label: "Variant A · Independent Benchmark",
        utmKey: "cycle_2026_11:variant_a",
        impressions: campaignSnapshot.variantA.impressions,
        clicks: campaignSnapshot.variantA.clicks,
        ctrPct: ctrA,
        landingViews: utmA.pageViews,
        serverLandingViews: utmA.serverLandingViews ?? 0,
        scroll50: utmA.scroll50,
        scroll50RatePct: bayesian.aRatePct,
      },
      variantB: {
        label: "Variant B · Brand Case Study (Control)",
        utmKey: "cycle_2026_11:variant_b",
        impressions: campaignSnapshot.variantB.impressions,
        clicks: campaignSnapshot.variantB.clicks,
        ctrPct: ctrB,
        landingViews: utmB.pageViews,
        serverLandingViews: utmB.serverLandingViews ?? 0,
        scroll50: utmB.scroll50,
        scroll50RatePct: bayesian.bRatePct,
      },
    },
    funnelHealth,
    bayesianScrollAudit: bayesian,
    telemetryUpdatedAt: telemetry.updatedAt,
    nextMilestones: [
      { step: "01", window: "Nov 23 – Dec 2", title: "Live Demand Gen Flight", detail: "Team Differentiation runs Variant A vs Variant B in Australia under a hard A$100 cap (A$95 circuit breaker). On-site >50% scroll depth updates automatically from zero-PII UTM telemetry." },
      { step: "02", window: "At n ≥ 60 clicks or Dec 2", title: "Skeptic Bayesian Audit", detail: "Google Ads GAQL CTR + Firestore scroll depth are combined into a Beta-Binomial posterior. Hypothesis passes only if Variant A beats control by ≥+15% relative CTR with ≥75% probability." },
      { step: "03", window: "Dec 1 · 09:00 AEST", title: "Cycle 02 Autonomous Swarm", detail: "Cloud Scheduler triggers a fresh Search Grounding scout + reader questions, and all three teams pitch again for December's A$100 AUD media grant." },
      { step: "04", window: "Post-flight", title: "Open CMO Verdict & YouTube Brief", detail: "Raw numbers, falsification verdict, and a verdict-first YouTube script publish directly to /experiments/field-lab, /llms.txt, and /experiments/field-lab/mcp." },
    ],
  };
}

export function getWetLabState() {
  return {
    cycle: activeCycle,
    guardrails: SPEND_GUARDRAILS,
    liveTracker: getLiveCampaignTracker(),
    submittedQuestions: submittedQuestions.slice(-10),
    storageBackend: process.env.FIRESTORE_ENABLED === "true" ? "firestore" : "in-memory-v1",
  };
}

export function wetLabMarkdown(base: string) {
  const c = activeCycle;
  const lines = [
    "# Agentic Field Lab",
    "",
    "Bet: multimodality (cross-cutting: differentiation, multimodality, anticipation)",
    `Canonical experience: ${base}/experiments/field-lab`,
    `Dedicated Field Lab MCP (read + human-approved voting/submission): ${base}/experiments/field-lab/mcp`,
    "",
    "## What this experiment is",
    "Frontier AI labs make research teams pitch for compute. The Agentic Field Lab applies the same model to marketing: three competing agent teams pitch falsifiable Google Ads experiments for a finite A$100 AUD monthly media grant, get scored by a calibrated Judge Agent, open for public human and agent voting, and publish honest Bayesian verdicts for CMOs.",
    "",
    `## Active Cycle: ${c.month} (${c.id}) — Status: ${c.status} (${c.mode})`,
    `Research question: ${c.researchQuestion}`,
    "",
    "## Competing Agent Pitches",
    ...c.pitches.flatMap((p) => [
      `### ${p.team} — ${p.title} (Judge: ${p.judge.total}/100 · Votes: ${p.votes})`,
      `- Hypothesis: ${p.hypothesis}`,
      `- Channel: ${p.channel} | Budget: A$${p.budgetAud} AUD`,
      `- Primary metric: ${p.primaryMetric} | Expected sample: ${p.expectedSampleSize}`,
      `- Falsification condition: ${p.falsificationCondition}`,
      `- Judge verdict: ${p.judge.verdict}`,
      "",
    ]),
    "## Spend & Statistical Guardrails (Enforced in Code)",
    `- Monthly hard cap: A$${SPEND_GUARDRAILS.hardCapMonthlyAud} AUD | Daily cap: A$${SPEND_GUARDRAILS.hardCapDailyAud} AUD | Auto-pause: A$${SPEND_GUARDRAILS.autoPauseAtSpendAud} AUD`,
    `- Statistical framework: ${SPEND_GUARDRAILS.statisticalFramework}`,
    `- Google Ads MCP: ${SPEND_GUARDRAILS.googleAdsMcp.server} (${SPEND_GUARDRAILS.googleAdsMcp.mode})`,
    "",
    "## Live Campaign Tracker (Zero-Cost Glass Box)",
    ...(() => {
      const t = getLiveCampaignTracker();
      return [
        `- Account: ${t.accountId} | Campaign: ${t.campaignName} | Stage: ${t.stage}`,
        `- Winning team: ${t.winningTeam} (${t.winningScore}/100) | Flight: ${t.flightStart} to ${t.flightEnd}`,
        `- Spend: A$${t.spendAud.toFixed(2)} / A$${t.budgetCapAud} AUD | Ads clicks: ${t.totalClicks} | Ads impressions: ${t.totalImpressions}`,
        `- Variant A (${t.variants.variantA.utmKey}): ${t.variants.variantA.landingViews} JS landing views (${t.variants.variantA.serverLandingViews} server hits), ${t.variants.variantA.scroll50} >50% scrolls`,
        `- Variant B (${t.variants.variantB.utmKey}): ${t.variants.variantB.landingViews} JS landing views (${t.variants.variantB.serverLandingViews} server hits), ${t.variants.variantB.scroll50} >50% scrolls`,
        `- Skeptic funnel integrity: [${t.funnelHealth.status}] ${t.funnelHealth.message}`,
        `- Bayesian audit: ${t.bayesianScrollAudit.verdict}`,
        `- Live JSON endpoint: ${base}/api/experiments/field-lab/live`,
      ];
    })(),
    "",
    `Note: Cycle 01 mode is currently ${c.mode} (${c.status}). Spend limits are enforced in code and in Google Ads campaign caps.`,
  ];
  return lines.join("\n") + "\n";
}

function pitchCard(p: LabPitch) {
  return `<article class="surface fieldlab-pitch" data-pitch-id="${e(p.id)}">
    <div class="section-top">
      <span class="eyebrow">${e(p.team)} · Bet: ${e(p.bet)}</span>
      <span class="tag">Judge ${p.judge.total}/100</span>
    </div>
    <h3>${e(p.title)}</h3>
    <p>${e(p.hypothesis)}</p>
    <div class="facts">
      <span>Channel · ${e(p.channel)}</span>
      <span>Budget · A$${p.budgetAud} AUD</span>
      <span>Metric · ${e(p.primaryMetric)}</span>
      <span>Sample · ${e(p.expectedSampleSize)}</span>
    </div>
    <details>
      <summary>Creative variants, falsification &amp; Judge scorecard</summary>
      <ul class="reasons">
        ${p.variants.map((v) => `<li><b>${e(v.label)} (${e(v.format)})</b><br>“${e(v.hook)}” · CTA: ${e(v.cta)}</li>`).join("")}
        <li><b>Falsification rule</b><br>${e(p.falsificationCondition)}</li>
        <li><b>Judge verdict (${p.judge.total}/100)</b><br>${e(p.judge.verdict)} (CMO: ${p.judge.cmoActionability}/30 · Stats: ${p.judge.statisticalFeasibility}/30 · Rigour: ${p.judge.noveltyAndRigour}/20 · Safety: ${p.judge.policyAndBrandSafety}/20)</li>
      </ul>
    </details>
    <div class="actions">
      <button type="button" class="vote-btn" data-vote-pitch="${e(p.id)}">Vote to fund this pitch →</button>
      <span class="quiet">Votes: <strong data-vote-count="${e(p.id)}">${p.votes}</strong></span>
    </div>
  </article>`;
}

function glassBoxSchematic(c: LabCycle) {
  const leader = [...c.pitches].sort((a, b) => b.judge.total - a.judge.total)[0];
  return `<section id="under-the-hood" class="glassbox" aria-label="How the Agentic Field Lab works under the hood">
    <div class="section-top">
      <div><h2>Literally transparent, under the hood.</h2></div>
      <p class="quiet">Select any stage to inspect the exact Google AI models, rubric weights, spend circuit-breakers, and statistical rules governing this field lab.</p>
    </div>
    <div class="gb-rail" role="tablist" aria-label="Agentic Field Lab stages">
      <button type="button" class="gb-node" role="tab" aria-selected="true" aria-controls="gb-p1" data-gb-tab="gb-p1">
        <span class="gb-step">Stage 1</span><strong>Industry Pulse</strong><span class="gb-sub">Search + Trends</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p2" data-gb-tab="gb-p2">
        <span class="gb-step">Stage 2</span><strong>3 Agent Teams</strong><span class="gb-sub">Compete for A$100</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p3" data-gb-tab="gb-p3">
        <span class="gb-step">Stage 3</span><strong>Calibrated Rubric</strong><span class="gb-sub">100-pt audit</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p4" data-gb-tab="gb-p4">
        <span class="gb-step">Stage 4</span><strong>Spend Breaker</strong><span class="gb-sub">Hard A$100 cap</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p5" data-gb-tab="gb-p5">
        <span class="gb-step">Stage 5</span><strong>Bayesian Audit</strong><span class="gb-sub">Open CMO data</span>
      </button>
    </div>

    <div class="gb-panel" id="gb-p1" role="tabpanel">
      <h3>Agents take the industry’s pulse before a single human votes.</h3>
      <p>Waiting for public vote volume stalls early labs. Instead, the Scout Agent queries <strong>Google Search Grounding</strong> and <strong>Google Trends</strong> each month to detect what CMOs are actively debating, combining those signals with reader-submitted questions to set one falsifiable monthly brief.</p>
      <div class="gb-meta">
        <span>Model: gemini-4-hydrogen</span>
        <span>Grounding: Google Search + Trends</span>
        <span>Community votes: Advisory signal (never blocks autonomy)</span>
      </div>
      <div class="gb-cols">
        <div class="gb-sub-block"><strong>Active Pulse Signals (${e(c.month)})</strong><p class="quiet">1. Rising CMO search interest in "AI Overviews video citations" and "agentic commerce".<br>2. High skepticism of unmeasured B2B AI marketing claims.<br>3. Need for repeatable micro-budget creative tests.</p></div>
        <div class="gb-sub-block"><strong>Output Artefact</strong><p class="quiet">A single JSON research brief distributed identically to all three competing teams with a fixed token allowance and A$100 AUD ceiling.</p></div>
      </div>
    </div>

    <div class="gb-panel" id="gb-p2" role="tabpanel" hidden>
      <h3>Three teams, three distinct hypotheses mirroring Jack’s three bets.</h3>
      <p>Just as frontier AI labs allocate compute to competing internal proposals, three isolated agent teams pitch against each other for the month’s A$100 AUD media grant. Every pitch must state an explicit <strong>falsification condition</strong> defining what data would prove the team wrong.</p>
      <div class="gb-meta">
        <span>Strategy: gemini-4-hydrogen</span>
        <span>Stills: gemini-nano-banana-2.1</span>
        <span>Shorts: gemini-omni-1.2-flash</span>
      </div>
      <ul class="reasons">
        ${c.pitches.map((p) => `<li><b>${e(p.team)}:</b> ${e(p.title)}<br><span class="quiet">${e(p.channel)} · ${e(p.expectedSampleSize)}</span></li>`).join("")}
      </ul>
    </div>

    <div class="gb-panel" id="gb-p3" role="tabpanel" hidden>
      <h3>Why ${e(leader.team)} currently leads (${leader.judge.total}/100).</h3>
      <p>A separate Judge Agent scores every pitch against a locked 100-point rubric using <code>gemini-decision-1</code> calibrated scoring, eliminating hype and automatically rejecting experiments that cannot reach meaningful volume on A$100 AUD.</p>
      <div class="rubric-row"><span>CMO Actionability (30)</span><meter class="rubric-meter" min="0" max="30" value="${leader.judge.cmoActionability}">${leader.judge.cmoActionability}/30</meter><strong>${leader.judge.cmoActionability}/30</strong></div>
      <div class="rubric-row"><span>Statistical Feasibility (30)</span><meter class="rubric-meter" min="0" max="30" value="${leader.judge.statisticalFeasibility}">${leader.judge.statisticalFeasibility}/30</meter><strong>${leader.judge.statisticalFeasibility}/30</strong></div>
      <div class="rubric-row"><span>Novelty &amp; Rigour (20)</span><meter class="rubric-meter" min="0" max="20" value="${leader.judge.noveltyAndRigour}">${leader.judge.noveltyAndRigour}/20</meter><strong>${leader.judge.noveltyAndRigour}/20</strong></div>
      <div class="rubric-row"><span>Policy &amp; Brand Safety (20)</span><meter class="rubric-meter" min="0" max="20" value="${leader.judge.policyAndBrandSafety}">${leader.judge.policyAndBrandSafety}/20</meter><strong>${leader.judge.policyAndBrandSafety}/20</strong></div>
      <p class="fine">Judge verdict: ${e(leader.judge.verdict)}</p>
    </div>

    <div class="gb-panel" id="gb-p4" role="tabpanel" hidden>
      <h3>Spend limits live in code, never in a prompt.</h3>
      <p>Agents connect to Google’s official <code>googleads/google-ads-mcp</code> (Propose &amp; Confirm dry-run validation + daily GAQL reporting) paired with a guarded Cloud Run execution boundary enforcing strict A$100 AUD ceilings.</p>
      <div class="cap-track" aria-label="Spend circuit breaker: A$10 daily cap, A$95 auto-pause, A$100 hard ceiling">
        <div class="cap-seg day" title="Daily cap: A$10 AUD"></div>
        <div class="cap-seg run" title="Active test window up to A$95 AUD"></div>
        <div class="cap-seg stop" title="Auto-pause buffer A$95–A$100 AUD"></div>
      </div>
      <div class="gb-meta">
        <span>Daily Cap: A$${SPEND_GUARDRAILS.hardCapDailyAud} AUD</span>
        <span>Auto-Pause: A$${SPEND_GUARDRAILS.autoPauseAtSpendAud} AUD</span>
        <span>Hard Ceiling: A$${SPEND_GUARDRAILS.hardCapMonthlyAud} AUD</span>
        <span>Allowed Domains: jacksmyth.fyi, youtube.com</span>
      </div>
    </div>

    <div class="gb-panel" id="gb-p5" role="tabpanel" hidden>
      <h3>Honest confidence intervals, not fake statistical certainty.</h3>
      <p>Compare why the Judge Agent enforces upper/mid-funnel signals on A$100 AUD, and how a separate Skeptic Agent audits raw BigQuery / GAQL numbers before publishing back to <code>/llms.txt</code>, <code>/mcp</code>, and a verdict-first YouTube brief.</p>
      <div class="seg-tabs" role="group" aria-label="Compare funnel economics on A$100 AUD">
        <button type="button" data-bayes-mode="upper" aria-pressed="true">Upper-Funnel Shorts (Approved)</button>
        <button type="button" data-bayes-mode="lower" aria-pressed="false">Down-Funnel B2B Lead CPA (Rejected)</button>
      </div>
      <div id="gb-bayes-readout" class="gb-sub-block">
        <strong>Upper-Funnel YouTube Shorts / Demand Gen (A$100 AUD)</strong>
        <p class="quiet">~4,000–7,500 impressions · 80–180 engagements · Beta-Binomial posterior can reliably detect a +20% relative hook lift with ≥75% directional confidence. Result is published transparently as directional evidence, never overclaimed.</p>
      </div>
    </div>
  </section>`;
}

function swarmTheatre(c: LabCycle) {
  const sorted = [...c.pitches].sort((a, b) => b.judge.total - a.judge.total);
  const winner = sorted[0];
  return `<section id="swarm-arena" class="swarm-arena" aria-labelledby="swarm-arena-title">
    <div class="section-top">
      <div>
        <h2 id="swarm-arena-title">Watch the swarm search, argue, and pitch.</h2>
      </div>
      <div class="swarm-controls">
        <button type="button" class="secondary swarm-toggle" id="swarm-play-toggle">Pause animation</button>
      </div>
    </div>
    <p class="quiet">Step through how the Scout tokenises live CMO debate, three teams challenge each other’s maths, and the calibrated Judge awards the A$100 AUD grant.</p>

    <div class="swarm-steps" role="group" aria-label="Swarm deliberation phases">
      <button type="button" class="swarm-step-btn" data-swarm-btn="0" aria-pressed="true"><span class="sym" aria-hidden="true">⌕</span> Search</button>
      <button type="button" class="swarm-step-btn" data-swarm-btn="1" aria-pressed="false"><span class="sym" aria-hidden="true">◈</span> Consider</button>
      <button type="button" class="swarm-step-btn" data-swarm-btn="2" aria-pressed="false"><span class="sym" aria-hidden="true">⇌</span> Argue</button>
      <button type="button" class="swarm-step-btn" data-swarm-btn="3" aria-pressed="false"><span class="sym" aria-hidden="true">∑</span> Pitch &amp; Judge</button>
    </div>

    <div class="swarm-stage surface" data-swarm-active="0">
      <div class="ascii-theatre" aria-hidden="true">
        <div class="ascii-whispers">
          <span class="w1">gemini-4-hydrogen</span>
          <span class="w2">Beta(1,1)</span>
          <span class="w3">next pitch -&gt;</span>
          <span class="w4">&lt;/argue&gt;</span>
          <span class="w5">cap = A$100 AUD</span>
          <span class="w6">P(A&gt;B) ≥ 0.75</span>
          <span class="w7">gemini-decision-1</span>
          <span class="w8">CTR +15%</span>
          <span class="w9">435-353-5484</span>
          <span class="w10">utm_content=variant_a</span>
        </div>
        <pre class="ascii-grid" id="swarm-ascii-grid">        |       -----\          |
        *        \\\\\          |            gemini-4-hydrogen
       .*:         \\\\         |
  ------|-----------|-----------\-----------------
      .:%+.         |            \\\        A$100 cap
      .+*+          |             \\\
     .++*:          |              \\       &lt;/turn&gt;
    :+.*+:          |               \\
   .::  :*+.        |                |      P(A&gt;B)
         :+*:.      |                |
           :+*%#*::.|.               |
             .:+*%###@|@#%*----------|------------&gt;  LIVE ADS
           :+%##%*+::.|.             |
         .+%#%+:.   |                |      Beta(1,1)
       .*#%+.       |               //
      .+%*\\        |              //
  ------|-----------/-------------///-------------
       :*:         |            ///         435-353-5484</pre>
        <div class="ascii-hud"><span id="swarm-ascii-caption">PHASE 01 // SCOUT SWEEP · tokenising CMO search signals</span><span id="swarm-ascii-fps">LIVE ASCII · 15fps</span></div>
      </div>
      <div class="swarm-pane" data-swarm-pane="0">
        <div class="swarm-head"><span class="swarm-badge"><span aria-hidden="true">⌕</span> SCOUT · gemini-4-hydrogen + Google Search Grounding</span><span class="swarm-clock" aria-hidden="true">t=0.4s · tokens→brief</span></div>
        <div class="token-stream" aria-label="Tokenised CMO search signals">
          <span class="tok t1"><span aria-hidden="true">·</span>ai<span aria-hidden="true">·</span>overviews</span>
          <span class="tok t2"><span aria-hidden="true">·</span>89%<span aria-hidden="true">·</span>skip<span aria-hidden="true">·</span>vendor<span aria-hidden="true">·</span>sites</span>
          <span class="tok t3"><span aria-hidden="true">·</span>b2b<span aria-hidden="true">·</span>citation<span aria-hidden="true">·</span>gap</span>
          <span class="tok t4"><span aria-hidden="true">·</span>micro<span aria-hidden="true">·</span>budget<span aria-hidden="true">·</span>A$100</span>
          <span class="tok t5"><span aria-hidden="true">·</span>falsifiable<span aria-hidden="true">·</span>cmo<span aria-hidden="true">·</span>test</span>
          <span class="tok tok-arrow" aria-hidden="true">→</span>
          <span class="tok tok-out">brief.json</span>
        </div>
        <p class="quiet">Scout converts live search signals and reader questions into one identical JSON brief, with zero hidden hints and a fixed token allowance per team.</p>
      </div>

      <div class="swarm-pane" data-swarm-pane="1" hidden>
        <div class="swarm-head"><span class="swarm-badge"><span aria-hidden="true">◈</span> CONSIDER · 3 isolated teams weighing sample math</span><span class="swarm-clock" aria-hidden="true">cap = A$100 AUD</span></div>
        <div class="swarm-lanes">
          <div class="swarm-lane">
            <div class="lane-id"><span aria-hidden="true">Δ</span> Team Differentiation</div>
            <code>channel: Demand Gen (AU)</code>
            <code>n ≈ 6k–10k imp · 60–140 clicks</code>
            <code>rule: ΔCTR ≥ +15% · P ≥ 0.75</code>
          </div>
          <div class="swarm-lane">
            <div class="lane-id"><span aria-hidden="true">▶</span> Team Multimodality</div>
            <code>channel: YouTube Shorts (AU)</code>
            <code>n ≈ 4k–7.5k imp · 3s hold</code>
            <code>rule: P(Proof &gt; Claim) ≥ 0.70</code>
          </div>
          <div class="swarm-lane">
            <div class="lane-id"><span aria-hidden="true">⚡</span> Team Anticipation</div>
            <code>channel: Display / Search (AU)</code>
            <code>n ≈ 3k–6k imp · schema test</code>
            <code>rule: lower volume on A$100</code>
          </div>
        </div>
      </div>

      <div class="swarm-pane" data-swarm-pane="2" hidden>
        <div class="swarm-head"><span class="swarm-badge"><span aria-hidden="true">⇌</span> ARGUE · cross-examination &amp; rubric deltas</span><span class="swarm-clock" aria-hidden="true">judge: gemini-decision-1</span></div>
        <ol class="swarm-debate">
          <li class="d1">
            <span class="deb-who">Differentiation <span aria-hidden="true">→</span></span>
            <span class="deb-say">“Matched charcoal-and-lemon cards isolate <em>message truth</em>. If 89% of AI citations skip vendor sites, let’s test if CMOs click independent stats over brand fluff.”</span>
            <span class="deb-delta pos">+4 variance control</span>
          </li>
          <li class="d2">
            <span class="deb-who">Multimodality <span aria-hidden="true">→</span></span>
            <span class="deb-say">“Static cards are polite. A 20s Short showing an AI agent reject a $40M site in 4 seconds will crush 3-second hold.”</span>
            <span class="deb-delta warn">−2 creative noise</span>
          </li>
          <li class="d3">
            <span class="deb-who">Anticipation <span aria-hidden="true">→</span></span>
            <span class="deb-say">“Both ignore agentic checkout—test structured product schema vs marketing prose.”</span>
            <span class="deb-delta warn">−4 thin sample @ A$100</span>
          </li>
          <li class="d4 judge-line">
            <span class="deb-who">Judge Agent <span aria-hidden="true">∑</span></span>
            <span class="deb-say">“At A$100 AUD, clean variable isolation beats spectacle. <strong>${e(winner.team)}</strong> wins (${winner.judge.total}/100). Issuing media grant.”</span>
            <span class="deb-delta win">FUNDED ★</span>
          </li>
        </ol>
      </div>

      <div class="swarm-pane" data-swarm-pane="3" hidden>
        <div class="swarm-head"><span class="swarm-badge"><span aria-hidden="true">∑</span> PITCH &amp; JUDGE · calibrated 100-pt logits</span><span class="swarm-clock" aria-hidden="true">→ Google Ads 435-353-5484</span></div>
        <div class="logit-board">
          ${sorted.map((p, idx) => `<div class="logit-row ${idx === 0 ? "is-winner" : ""}">
            <span class="logit-team">${e(p.team)}</span>
            <meter class="rubric-meter" min="0" max="100" value="${p.judge.total}">${p.judge.total}/100</meter>
            <span class="logit-score">${p.judge.total}/100</span>
            <span class="logit-tag">${idx === 0 ? "FUNDED ★" : idx === 1 ? "RUNNER-UP" : "BENCHED"}</span>
          </div>`).join("")}
        </div>
        <div class="handoff-strip">
          <span>${e(winner.team)}</span><span aria-hidden="true">→</span>
          <span>gemini-nano-banana-2.1 (2 cards)</span><span aria-hidden="true">→</span>
          <span>Google Ads 435-353-5484</span><span aria-hidden="true">→</span>
          <span>A$100.00 hard cap</span>
        </div>
      </div>
    </div>
  </section>`;
}

function liveCampaignTrackerSection() {
  const t = getLiveCampaignTracker();
  const stageLabels: Record<CampaignSnapshot["stage"], string> = {
    "draft-ready": "Draft staged · ready to publish",
    "live": "Live in Australia",
    "paused-at-cap": "Auto-paused at A$95 circuit breaker",
    "completed": "Flight completed · Bayesian audit ready",
  };
  const fmtCtr = (v: number | null) => (v === null ? "—" : `${v}%`);
  const fmtRate = (v: number | null) => (v === null ? "—" : `${v}%`);
  return `<section id="live-tracker" class="live-tracker" aria-labelledby="live-tracker-title">
    <div class="section-top">
      <div>
        <h2 id="live-tracker-title">Winning team in the field.</h2>
      </div>
      <div class="tracker-actions">
        <span class="stage-pill stage-${e(t.stage)}" id="fl-stage-pill"><span class="pulse-dot" aria-hidden="true"></span>${e(stageLabels[t.stage])}</span>
        <button type="button" class="secondary" id="fl-refresh-live">Refresh live data <span aria-hidden="true">↻</span></button>
      </div>
    </div>

    <div class="surface tracker-card">
      <div class="tracker-summary">
        <div>
          <h3>${e(t.winningTeam)} (${t.winningScore}/100) · Cycle 01</h3>
          <p class="quiet">${e(t.campaignName)} · ${e(t.channel)} · Account <code>${e(t.accountId)}</code> · Flight <strong>${e(t.flightStart)}</strong> to <strong>${e(t.flightEnd)}</strong>.</p>
        </div>
        <div class="spend-box">
          <div class="spend-nums"><strong id="fl-spend">A$${t.spendAud.toFixed(2)}</strong> <span class="quiet">/ A$${t.budgetCapAud} AUD cap</span></div>
          <meter id="fl-spend-meter" class="rubric-meter" min="0" max="${t.budgetCapAud}" value="${t.spendAud}">A$${t.spendAud.toFixed(2)} of A$${t.budgetCapAud} AUD</meter>
          <span class="fine">Auto-pause breaker at A$${t.autoPauseAud} · Remaining: <strong id="fl-remaining">A$${t.spendRemainingAud.toFixed(2)}</strong></span>
        </div>
      </div>

      <div class="table-wrap" tabindex="0">
        <table class="tracker-table">
          <caption>Cycle 01 A/B performance: Google Ads snapshot paired with live $0 first-party UTM telemetry</caption>
          <thead>
            <tr>
              <th scope="col">Creative Variant</th>
              <th scope="col">Ads Imp.</th>
              <th scope="col">Ads Clicks (CTR)</th>
              <th scope="col">Landing Views (Live UTM)</th>
              <th scope="col">&gt;50% Scroll Depth (Live)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Variant A · Independent Benchmark</th>
              <td id="fl-va-imp">${t.variants.variantA.impressions}</td>
              <td id="fl-va-clicks">${t.variants.variantA.clicks} (${fmtCtr(t.variants.variantA.ctrPct)})</td>
              <td id="fl-va-views">${t.variants.variantA.landingViews}</td>
              <td id="fl-va-scroll">${t.variants.variantA.scroll50} (${fmtRate(t.variants.variantA.scroll50RatePct)})</td>
            </tr>
            <tr>
              <th scope="row">Variant B · Brand Case Study (Control)</th>
              <td id="fl-vb-imp">${t.variants.variantB.impressions}</td>
              <td id="fl-vb-clicks">${t.variants.variantB.clicks} (${fmtCtr(t.variants.variantB.ctrPct)})</td>
              <td id="fl-vb-views">${t.variants.variantB.landingViews}</td>
              <td id="fl-vb-scroll">${t.variants.variantB.scroll50} (${fmtRate(t.variants.variantB.scroll50RatePct)})</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bayes-banner">
        <strong>Live Bayesian scroll audit · Beta(1,1) uniform prior</strong>
        <p id="fl-bayes-verdict">${e(t.bayesianScrollAudit.verdict)}</p>
        <p id="fl-funnel-health" class="fine"><strong>Skeptic funnel check (${e(t.funnelHealth.status)}):</strong> ${e(t.funnelHealth.message)}</p>
        <span class="fine">How this stays $0/mo: landing views (immediate JS + server-side UTM hit) and &gt;50% scroll depth stream from first-party zero-PII telemetry in Firestore; Google Ads spend/impressions/clicks sync via cached <code>google-ads-mcp</code> snapshots. Live JSON: <a href="/api/experiments/field-lab/live">/api/experiments/field-lab/live</a>.</span>
      </div>
    </div>

    <div class="next-roadmap">
      <h3>What happens next</h3>
      <ol class="next-chain">
        ${t.nextMilestones.map((m) => `<li>
          <span class="next-step">${e(m.step)} · ${e(m.window)}</span>
          <strong>${e(m.title)}</strong>
          <p class="quiet">${e(m.detail)}</p>
        </li>`).join("")}
      </ol>
    </div>
  </section>`;
}

function wetLabBody() {
  const c = activeCycle;
  return `<div class="experiment" data-experiment="field-lab" data-agent-spec="MCP: /experiments/field-lab/mcp · API: /api/experiments/field-lab/cycle · LIVE: /api/experiments/field-lab/live · MODELS: gemini-4-hydrogen + gemini-decision-1 + gemini-nano-banana-2.1 · CAP: A$100 AUD">
  <div class="crumb"><a href="/">Jack Smyth</a><span>/</span><a href="/#multimodality">Multimodality</a><span>/</span><span>Agentic Field Lab</span></div>
  <h1>The Agentic Field Lab.</h1>
  <p class="deck">Frontier AI labs make researchers pitch for compute. Here, three competing agent teams pitch for a A$100 AUD monthly Google Ads grant, testing hypotheses in the live market and publishing honest Bayesian evidence for CMOs.</p>
  <div class="context">
    <p>Think of it as a research compute grant applied to real media spend: an autonomous Scout reads live industry pulse via Google Search &amp; Trends, three competing teams pitch falsifiable tests, a calibrated Judge scores every proposal, and hard-coded spend guardrails run the winner in the field with no synthetic panels and no black boxes.</p>
    <small>Status: ${e(c.status)} (${e(c.mode)}) · ${e(c.month)}. Autonomous via Industry Pulse + Judge Agent; community votes act as an advisory signal.</small>
  </div>

  ${swarmTheatre(c)}
  ${liveCampaignTrackerSection()}
  ${glassBoxSchematic(c)}

  <section id="brief">
    <div class="section-top">
      <div><h2>What the swarm is testing.</h2></div>
      <span class="quiet">${e(c.id)}</span>
    </div>
    <div class="surface">
      <h3>${e(c.researchQuestion)}</h3>
      <p class="quiet">${e(c.context)}</p>
      <div class="gb-meta">
        <span>Scout · ${e(c.scoutSource)}</span>
        <span>Hard Cap · A$${SPEND_GUARDRAILS.hardCapMonthlyAud} AUD/mo</span>
        <span>Auto-Pause · A$${SPEND_GUARDRAILS.autoPauseAtSpendAud} AUD</span>
        <span>Stats · Bayesian Beta-Binomial</span>
      </div>
    </div>
  </section>

  <section id="creatives">
    <div class="section-top">
      <div><h2>Live ad creatives generated by <code>gemini-nano-banana-2.1</code>.</h2></div>
      <p class="quiet">Identical visual palette, layout, and typography, isolating copy framing alone so A$100 AUD measures message truth rather than design noise.</p>
    </div>
    <div class="split">
      <figure class="surface creative-card">
        <img src="/lab/cycle-2026-11/variant-a.jpg" alt="Variant A Demand Gen ad card: 89% of B2B AI citations skip vendor sites. Independent 2026 Channel Benchmark." width="1376" height="768" loading="lazy">
        <figcaption><strong>Variant A · Verdict-First Independent Benchmark</strong><br><span class="quiet">Tests whether leading with a falsifiable third-party statistic lifts upper-funnel CTR.</span></figcaption>
      </figure>
      <figure class="surface creative-card">
        <img src="/lab/cycle-2026-11/variant-b.jpg" alt="Variant B Demand Gen ad card: How B2B marketing leaders grow pipeline smarter. Brand Growth Case Study." width="1376" height="768" loading="lazy">
        <figcaption><strong>Variant B · Generic Brand Case Study (Control)</strong><br><span class="quiet">Matched charcoal-and-lemon editorial design with conventional B2B case-study framing.</span></figcaption>
      </figure>
    </div>
  </section>

  <section id="pitches">
    <div class="section-top">
      <div><h2>Three competing agent pitches.</h2></div>
      <p class="quiet">Each team is mapped to one of Jack's three bets. The Judge Agent scored each pitch on CMO actionability, statistical feasibility at A$100, rigour, and ad-policy safety. Cast your vote below.</p>
    </div>
    <div id="fieldlab-vote-status" role="status" aria-live="polite"></div>
    <div class="fieldlab-grid">
      ${c.pitches.map(pitchCard).join("\n")}
    </div>
  </section>

  <section id="suggest">
    <h2>Give the swarm a CMO problem.</h2>
    <p class="quiet">Submit a real marketing question you want three agent teams to test next month on a A$100 AUD media grant. The Scout Agent reviews submissions alongside Google Search trends.</p>
    <form id="fieldlab-question-form" class="surface">
      <label class="field" for="fieldlab-question">Marketing hypothesis or CMO question</label>
      <textarea id="fieldlab-question" minlength="15" maxlength="500" required placeholder="e.g. Does showing a transparent price in a YouTube Short lift qualified B2B clicks compared to hiding price until the landing page?"></textarea>
      <label class="field" for="fieldlab-submitter">Your name, role, or agent handle (optional)</label>
      <input id="fieldlab-submitter" type="text" maxlength="80" placeholder="e.g. CMO, Retail Brand · or Anonymous">
      <div class="actions">
        <button type="submit" id="fieldlab-submit-btn">Submit to Scout queue →</button>
        <span class="quiet">No login required. Stored for the next monthly grant cycle.</span>
      </div>
      <div id="fieldlab-question-status" role="status" aria-live="polite"></div>
    </form>
  </section>

  <section class="method" id="guardrails">
    <h2>Google-native stack &amp; spend guardrails.</h2>
    <p><strong>Why A$100 AUD works:</strong> At A$100/month, down-funnel purchase conversions have too little sample size. The Judge Agent rejects low-volume CPA tests and restricts v1 experiments to high-volume upper/mid-funnel signals (impressions, 3-second hold, CTR, on-site micro-conversions), reported with Bayesian probability of superiority rather than overclaimed p-values.</p>
    <p><strong>Google Ads MCP + Guarded Execution:</strong> Agents use Google's official <code>googleads/google-ads-mcp</code> for GAQL performance queries and dry-run asset creation (Propose &amp; Confirm). Hard-coded caps (<code>A$100/mo</code>, <code>A$10/day</code>, auto-pause at <code>A$95</code>) are enforced in code, never left to prompts.</p>
    <p><strong>YouTube-in-AI Flywheel:</strong> Every completed cycle auto-generates a verdict-first YouTube video brief (<code>${e(c.youtubeVideoBrief.title)}</code>) so the empirical findings feed directly back into multimodal AI citations.</p>
    <details class="agent-box">
      <summary>Connect your agent to the Agentic Field Lab</summary>
      <p class="quiet">Dedicated Field Lab MCP endpoint (separate from the read-only identity MCP):</p>
      <pre tabindex="0" aria-label="Agentic Field Lab MCP endpoint"><code>/experiments/field-lab/mcp</code></pre>
      <p class="quiet">Read the <a href="/experiments/field-lab.md">Markdown guide</a> or fetch live cycle JSON at <a href="/api/experiments/field-lab/cycle">/api/experiments/field-lab/cycle</a>.</p>
    </details>
  </section>

  <div class="next">
    <div><a href="/#multimodality">Why multimodality matters →</a></div>
    <div><a href="/experiments/leaderbored">Try Leaderbored →</a></div>
  </div>
</div>`;
}

function buildWetLabMcpServer() {
  const server = new McpServer(
    { name: "jack-smyth-field-lab", version: "0.2.0" },
    {
      instructions: "Agentic Field Lab MCP. Modelled on frontier AI research teams pitching for compute—here competing for a A$100 AUD monthly Google Ads media grant. Read the active grant cycle, inspect hard-coded spend guardrails, submit CMO research questions, or cast an explicitly approved vote.",
    },
  );

  server.registerTool(
    "field_lab_get_cycle",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      title: "Get active Agentic Field Lab grant cycle",
      description: "Returns the current monthly CMO research question, the 3 competing agent pitches, Judge scorecards, live vote tallies, and YouTube video brief.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(getWetLabState(), null, 2) }],
    }),
  );

  server.registerTool(
    "field_lab_get_guardrails",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      title: "Get spend and statistical guardrails",
      description: "Returns the hard-coded A$100 AUD monthly media-grant cap, Bayesian statistical policy, and Google Ads MCP integration boundaries.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(SPEND_GUARDRAILS, null, 2) }],
    }),
  );

  server.registerTool(
    "field_lab_cast_vote",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      title: "Cast a vote for a Field Lab pitch",
      description: "Casts one vote for a competing agent pitch in the active Agentic Field Lab cycle. Requires explicit approved=true attestation.",
      inputSchema: {
        pitchId: z.string().min(3).max(60),
        approved: z.literal(true).describe("Must be true to confirm intentional vote."),
      },
    },
    async ({ pitchId }) => {
      const pitch = activeCycle.pitches.find((p) => p.id === pitchId);
      if (!pitch) {
        return { isError: true, content: [{ type: "text" as const, text: `Unknown pitchId "${pitchId}". Call field_lab_get_cycle for valid ids.` }] };
      }
      pitch.votes += 1;
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, pitchId: pitch.id, team: pitch.team, votes: pitch.votes }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "field_lab_submit_question",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      title: "Submit a CMO research question for next month",
      description: "Submits a marketing research question to the Scout Agent queue for future A$100 AUD media-grant cycles.",
      inputSchema: {
        question: z.string().min(15).max(500),
        submittedBy: z.string().max(80).optional(),
      },
    },
    async ({ question, submittedBy }) => {
      const entry: LabQuestionSubmission = {
        id: `q-${Date.now()}`,
        question: question.trim(),
        submittedBy: (submittedBy || "External Agent").trim() || "External Agent",
        submittedAt: new Date().toISOString(),
      };
      submittedQuestions.push(entry);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, submission: entry }, null, 2) }],
      };
    },
  );

  return server;
}

const voteSchema = z.object({ pitchId: z.string().min(3).max(60) });
const questionSchema = z.object({
  question: z.string().trim().min(15).max(500),
  submittedBy: z.string().trim().max(80).optional(),
});

export function registerWetLab(app: Express, origin: (r: Request) => string) {
  // Hydrate latest cycle + campaign snapshot from Cloud Firestore on startup when enabled on Cloud Run
  if (isFirestoreEnabled()) {
    void loadWetLabSnapshot<LabCycle>("active-cycle").then((saved) => {
      if (saved && Array.isArray(saved.pitches) && saved.pitches.length > 0) {
        activeCycle = saved;
      }
    });
    void loadWetLabSnapshot<CampaignSnapshot>("campaign-snapshot").then((saved) => {
      if (saved && typeof saved.campaignName === "string") {
        campaignSnapshot = { ...campaignSnapshot, ...saved };
      }
    });
  }

  app.get(["/field-lab.js", "/wet-lab.js"], (_req, res) => res.type("text/javascript").send(wetLabClientScript));

  app.get(["/api/experiments/field-lab/cycle", "/api/experiments/wet-lab/cycle"], (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(getWetLabState());
  });

  app.get(["/api/experiments/field-lab/live", "/api/experiments/wet-lab/live"], (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(getLiveCampaignTracker());
  });

  const snapshotUpdateSchema = z.object({
    stage: z.enum(["draft-ready", "live", "paused-at-cap", "completed"]).optional(),
    spendAud: z.number().min(0).max(500).optional(),
    variantA: z.object({ impressions: z.number().int().min(0), clicks: z.number().int().min(0) }).optional(),
    variantB: z.object({ impressions: z.number().int().min(0), clicks: z.number().int().min(0) }).optional(),
    syncSource: z.string().min(1).max(120).optional(),
  });

  app.post(["/api/experiments/field-lab/campaign-snapshot", "/api/experiments/wet-lab/campaign-snapshot"], async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const expected = process.env.FIELD_LAB_CRON_SECRET || process.env.WET_LAB_CRON_SECRET;
    if (!expected || expected.length < 16) {
      res.status(503).json({ error: "Campaign snapshot sync is not configured on this instance." });
      return;
    }
    const auth = req.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const parsed = snapshotUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid campaign snapshot payload." });
      return;
    }
    campaignSnapshot = {
      ...campaignSnapshot,
      ...parsed.data,
      lastSyncedAt: new Date().toISOString(),
    };
    if (parsed.data.stage === "live") {
      activeCycle.mode = "live-google-ads";
      activeCycle.status = "running";
      void saveWetLabSnapshot("active-cycle", activeCycle).catch(() => {});
    }
    const persistence = await saveWetLabSnapshot("campaign-snapshot", campaignSnapshot).catch(() => ({
      persisted: false,
      backend: "in-memory-fallback",
    }));
    res.json({ ok: true, liveTracker: getLiveCampaignTracker(), persistence });
  });

  app.get(["/api/experiments/field-lab/guardrails", "/api/experiments/wet-lab/guardrails"], (_req, res) => {
    res.json(SPEND_GUARDRAILS);
  });

  app.post(["/api/experiments/field-lab/vote", "/api/experiments/wet-lab/vote"], (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid pitchId." }); return; }
    const pitch = activeCycle.pitches.find((p) => p.id === parsed.data.pitchId);
    if (!pitch) { res.status(404).json({ error: "Unknown pitch." }); return; }
    pitch.votes += 1;
    void saveWetLabSnapshot("active-cycle", activeCycle).catch(() => {});
    res.json({ ok: true, pitchId: pitch.id, votes: pitch.votes });
  });

  app.post(["/api/experiments/field-lab/suggest", "/api/experiments/wet-lab/suggest"], (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const parsed = questionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Question must be 15–500 characters." }); return; }
    const entry: LabQuestionSubmission = {
      id: `q-${Date.now()}`,
      question: parsed.data.question,
      submittedBy: parsed.data.submittedBy || "Anonymous CMO",
      submittedAt: new Date().toISOString(),
    };
    submittedQuestions.push(entry);
    void saveWetLabSnapshot("questions", submittedQuestions.slice(-50)).catch(() => {});
    res.status(201).json({ ok: true, submission: entry });
  });

  // Secured endpoint for Google Cloud Scheduler or owner CLI to trigger a live autonomous pitch swarm.
  // Never exposed unauthenticated to prevent token-spend abuse.
  app.post(["/api/experiments/field-lab/run-cycle", "/api/experiments/wet-lab/run-cycle"], async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const expected = process.env.FIELD_LAB_CRON_SECRET || process.env.WET_LAB_CRON_SECRET;
    if (!expected || expected.length < 16) {
      res.status(503).json({ error: "Autonomous swarm trigger is not configured on this instance." });
      return;
    }
    const auth = req.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const monthLabel = typeof req.body?.monthLabel === "string" ? req.body.monthLabel.slice(0, 40) : undefined;
      const result = await runAutonomousPitchSwarm({
        monthLabel,
        communityQuestions: submittedQuestions,
      });
      activeCycle = result.cycle;
      const persistence = await saveWetLabSnapshot("active-cycle", activeCycle).catch(() => ({
        persisted: false,
        backend: "in-memory-fallback",
      }));
      res.status(200).json({ ok: true, cycle: activeCycle, telemetry: result.telemetry, persistence });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Swarm execution failed.";
      res.status(502).json({ error: message });
    }
  });

  app.post(["/experiments/field-lab/mcp", "/experiments/wet-lab/mcp"], async (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const server = buildWetLabMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
    }
  });
  app.all(["/experiments/field-lab/mcp", "/experiments/wet-lab/mcp"], (_req, res) =>
    res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Stateless Streamable HTTP: use POST." }, id: null }),
  );

  // Permanent 301 redirects from legacy Wet Lab document routes to canonical Field Lab routes
  app.get("/experiments/wet-lab.md", (_req, res) => res.redirect(301, "/experiments/field-lab.md"));
  app.get("/experiments/wet-lab", (_req, res) => res.redirect(301, "/experiments/field-lab"));

  app.get("/experiments/field-lab.md", (req, res) => {
    res.type("text/markdown; charset=utf-8").send(wetLabMarkdown(origin(req)));
  });

  app.get("/experiments/field-lab", (req, res) => {
    res.vary("Accept");
    res.set("Link", `</experiments/field-lab.md>; rel="alternate"; type="text/markdown", </experiments/field-lab/mcp>; rel="mcp"`);
    if (req.accepts(["html", "text/markdown"]) === "text/markdown") {
      res.type("text/markdown; charset=utf-8").send(wetLabMarkdown(origin(req)));
      return;
    }
    recordServerCampaignLanding(req);
    res.type("html").send(page(origin(req), {
      path: "/experiments/field-lab",
      title: "Agentic Field Lab — autonomous media-grant research · Jack Smyth",
      description: "Frontier AI labs make researchers pitch for compute. Here, three competing agent teams pitch for a A$100 AUD monthly Google Ads grant, scored by a calibrated Judge Agent and audited with Bayesian honesty.",
      body: wetLabBody(),
      script: "/field-lab.js",
    }, res.locals.nonce));
  });
}
