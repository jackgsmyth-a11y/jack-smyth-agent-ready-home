import type { Express, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { page } from "./site.js";
import { wetLabClientScript } from "./wet-lab-client.js";

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
  status: "open-for-voting",
  mode: "dry-run-v1",
  scoutSource: "Google Search Grounding + Brandtech YouTube-in-AI findings (dry-run seed)",
  researchQuestion: "On a A$100 media budget, which creative and channel framing generates the clearest engagement signal from marketing decision-makers exploring AI visibility?",
  context: "Three competing agent teams—mapped to Jack Smyth's three bets—were given an identical A$100 AUD media cap and tasked with designing a falsifiable, Google Ads-executable experiment that produces an honest directional insight for CMOs.",
  budgetCapAud: 100,
  tokenBudgetNote: "Fixed per-team pitch allowance; Judge Agent scores against a 100-point rubric before public voting.",
  pitches: [
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
        { id: "m-a", label: "Variant A (Proof)", hook: "Watch an AI agent ignore a $40M brand in 4 seconds.", format: "20s vertical screen-recording + captions (Veo/screen capture)", cta: "See the live test" },
        { id: "m-b", label: "Variant B (Claim)", hook: "Why AI agents aren't recommending your brand in 2026.", format: "20s vertical typography + voiceover", cta: "See the live test" },
      ],
      judge: {
        cmoActionability: 28,
        statisticalFeasibility: 28,
        noveltyAndRigour: 18,
        policyAndBrandSafety: 18,
        total: 92,
        verdict: "Strongest sample-size economics at A$100 AUD. Two clean variants avoid splitting impressions too thinly, and YouTube Shorts aligns directly with Bet 2.",
      },
      votes: 0,
    },
    {
      id: "pitch-differentiation",
      team: "Team Differentiation",
      bet: "differentiation",
      title: "Verdict-first framing vs. curiosity-gap framing",
      hypothesis: "Ads that open with an explicit, falsifiable verdict ('YouTube appears in 1 in 4 AI answers—here is the structure') will outperform curiosity-gap headlines ('The secret to AI search?') on CTR and post-click scroll depth.",
      cmoRelevance: "Tests whether the same 'verdict-first' structure that earns LLM citations also wins human CMO attention in paid media.",
      channel: "Google Display / Demand Gen (In-Feed + Discover)",
      targeting: "Marketing & Advertising Professionals affinity + B2B SaaS / CMO interest segments (AU)",
      budgetAud: 100,
      primaryMetric: "CTR + On-site >50% scroll depth micro-conversion",
      expectedSampleSize: "6,000–10,000 impressions, 60–140 clicks across 2 variants",
      falsificationCondition: "If Verdict-First fails to beat Curiosity-Gap by at least +15% relative CTR with >=75% Bayesian posterior probability.",
      variants: [
        { id: "d-a", label: "Variant A (Verdict-First)", hook: "1 in 4 AI answers cite YouTube. Structure beats subscriber count.", format: "Imagen 3 editorial card + concise subhead", cta: "Read the evidence" },
        { id: "d-b", label: "Variant B (Curiosity-Gap)", hook: "What are AI engines actually citing in your category?", format: "Imagen 3 editorial card + question subhead", cta: "Find out now" },
      ],
      judge: {
        cmoActionability: 27,
        statisticalFeasibility: 27,
        noveltyAndRigour: 17,
        policyAndBrandSafety: 18,
        total: 89,
        verdict: "Clean A/B contrast with high impression volume. Slightly higher risk of accidental clicks on Display, mitigated by tracking on-site scroll depth.",
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
        cmoActionability: 26,
        statisticalFeasibility: 22,
        noveltyAndRigour: 19,
        policyAndBrandSafety: 18,
        total: 85,
        verdict: "Highest novelty and direct Brandtech prospect intent, though niche search volume in Australia may pace slowly over 14 days.",
      },
      votes: 0,
    },
  ],
  youtubeVideoBrief: {
    title: "Can 3 AI Agent Teams Run a Real A$100 Google Ads Experiment? (Wet Lab Cycle 01 Verdict)",
    chapters: [
      "00:00 — The A$100 grant question & why sample size matters",
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
    submittedBy: "Seed prompt (Wet Lab v1)",
    submittedAt: "2026-11-22T00:00:00.000Z",
  },
];

const e = (x: unknown) => String(x ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function getWetLabState() {
  return {
    cycle: activeCycle,
    guardrails: SPEND_GUARDRAILS,
    submittedQuestions: submittedQuestions.slice(-10),
    storageBackend: process.env.FIRESTORE_ENABLED === "true" ? "firestore" : "in-memory-v1",
  };
}

export function wetLabMarkdown(base: string) {
  const c = activeCycle;
  const lines = [
    "# Agentic Marketing Wet Lab",
    "",
    "Bet: multimodality (cross-cutting: differentiation, multimodality, anticipation)",
    `Canonical experience: ${base}/experiments/wet-lab`,
    `Dedicated Wet Lab MCP (read + human-approved voting/submission): ${base}/experiments/wet-lab/mcp`,
    "",
    "## What this experiment is",
    "An autonomous marketing research lab with a finite monthly budget of A$100 AUD and capped tokens. Three competing agent teams swarm a timely CMO question, pitch falsifiable Google Ads experiments, get scored by a Judge Agent, and open for public human and agent voting.",
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
    "Note: Cycle 01 is currently in dry-run-v1 voting mode prior to live Google Ads execution. No real media spend has occurred yet.",
  ];
  return lines.join("\n") + "\n";
}

function pitchCard(p: LabPitch) {
  return `<article class="surface wetlab-pitch" data-pitch-id="${e(p.id)}">
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
  return `<section id="under-the-hood" class="glassbox" aria-label="How the Wet Lab works under the hood">
    <div class="section-top">
      <div><div class="section-no">00 / Glass-box architecture</div><h2>Literally transparent, under the hood.</h2></div>
      <p class="quiet">Click any stage to inspect the exact Google AI models, rubric weights, spend circuit-breakers, and statistical rules governing this lab.</p>
    </div>
    <div class="gb-rail" role="tablist" aria-label="Wet Lab stages">
      <button type="button" class="gb-node" role="tab" aria-selected="true" aria-controls="gb-p1" data-gb-tab="gb-p1">
        <span class="gb-step">01 / Pulse</span><strong>Industry Pulse</strong><span class="gb-sub">Search + Trends</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p2" data-gb-tab="gb-p2">
        <span class="gb-step">02 / Swarm</span><strong>3 Agent Teams</strong><span class="gb-sub">Compete for A$100</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p3" data-gb-tab="gb-p3">
        <span class="gb-step">03 / Judge</span><strong>Calibrated Rubric</strong><span class="gb-sub">100-pt audit</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p4" data-gb-tab="gb-p4">
        <span class="gb-step">04 / Ads MCP</span><strong>Spend Breaker</strong><span class="gb-sub">Hard A$100 cap</span>
      </button>
      <button type="button" class="gb-node" role="tab" aria-selected="false" aria-controls="gb-p5" data-gb-tab="gb-p5">
        <span class="gb-step">05 / Verdict</span><strong>Bayesian Audit</strong><span class="gb-sub">Open CMO data</span>
      </button>
    </div>

    <div class="gb-panel" id="gb-p1" role="tabpanel">
      <div class="eyebrow">Stage 01 · Autonomous Industry Pulse (No Cold-Start Bottleneck)</div>
      <h3>Agents take the industry’s pulse before a single human votes.</h3>
      <p>Waiting for public vote volume stalls early labs. Instead, the Scout Agent queries <strong>Google Search Grounding</strong> and <strong>Google Trends</strong> each month to detect what CMOs are actively debating—combining those signals with reader-submitted questions to set one falsifiable monthly brief.</p>
      <div class="gb-meta">
        <span>Model: gemini-4-hydrogen</span>
        <span>Grounding: Google Search + Trends</span>
        <span>Community votes: Advisory signal (never blocks autonomy)</span>
      </div>
      <div class="gb-cols">
        <div class="surface"><strong>Active Pulse Signals (${e(c.month)})</strong><p class="quiet">1. Rising CMO search interest in "AI Overviews video citations" and "agentic commerce".<br>2. High skepticism of unmeasured B2B AI marketing claims.<br>3. Need for repeatable micro-budget creative tests.</p></div>
        <div class="surface"><strong>Output Artefact</strong><p class="quiet">A single JSON research brief distributed identically to all three competing teams with a fixed token allowance and A$100 AUD ceiling.</p></div>
      </div>
    </div>

    <div class="gb-panel" id="gb-p2" role="tabpanel" hidden>
      <div class="eyebrow">Stage 02 · Competing Research Swarm</div>
      <h3>Three teams, three distinct hypotheses—mirroring Jack’s three bets.</h3>
      <p>Just as frontier AI labs allocate compute to competing internal proposals, three isolated agent teams pitch against each other for the month’s A$100 AUD media grant. Every pitch must state an explicit <strong>falsification condition</strong>—what data would prove the team wrong.</p>
      <div class="gb-meta">
        <span>Strategy: gemini-4-hydrogen</span>
        <span>Stills: gemini-nano-banana-2.1</span>
        <span>Shorts: gemini-omni-1.2-flash</span>
      </div>
      <ul class="reasons">
        ${c.pitches.map((p) => `<li><b>${e(p.team)}</b> — ${e(p.title)}<br><span class="quiet">${e(p.channel)} · ${e(p.expectedSampleSize)}</span></li>`).join("")}
      </ul>
    </div>

    <div class="gb-panel" id="gb-p3" role="tabpanel" hidden>
      <div class="eyebrow">Stage 03 · Calibrated Judge Agent</div>
      <h3>Why ${e(leader.team)} currently leads (${leader.judge.total}/100).</h3>
      <p>A separate Judge Agent scores every pitch against a locked 100-point rubric using <code>gemini-decision-1</code> calibrated scoring—eliminating hype and automatically rejecting experiments that cannot reach meaningful volume on A$100 AUD.</p>
      <div class="rubric-row"><span>CMO Actionability (30)</span><meter class="rubric-meter" min="0" max="30" value="${leader.judge.cmoActionability}">${leader.judge.cmoActionability}/30</meter><strong>${leader.judge.cmoActionability}/30</strong></div>
      <div class="rubric-row"><span>Statistical Feasibility (30)</span><meter class="rubric-meter" min="0" max="30" value="${leader.judge.statisticalFeasibility}">${leader.judge.statisticalFeasibility}/30</meter><strong>${leader.judge.statisticalFeasibility}/30</strong></div>
      <div class="rubric-row"><span>Novelty &amp; Rigour (20)</span><meter class="rubric-meter" min="0" max="20" value="${leader.judge.noveltyAndRigour}">${leader.judge.noveltyAndRigour}/20</meter><strong>${leader.judge.noveltyAndRigour}/20</strong></div>
      <div class="rubric-row"><span>Policy &amp; Brand Safety (20)</span><meter class="rubric-meter" min="0" max="20" value="${leader.judge.policyAndBrandSafety}">${leader.judge.policyAndBrandSafety}/20</meter><strong>${leader.judge.policyAndBrandSafety}/20</strong></div>
      <p class="fine">Judge verdict: ${e(leader.judge.verdict)}</p>
    </div>

    <div class="gb-panel" id="gb-p4" role="tabpanel" hidden>
      <div class="eyebrow">Stage 04 · Google Ads MCP &amp; Hard-Coded Spend Circuit-Breaker</div>
      <h3>Spend limits live in code—never in a prompt.</h3>
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
      <div class="eyebrow">Stage 05 · Bayesian Audit &amp; Open CMO Flywheel</div>
      <h3>Honest confidence intervals, not fake statistical certainty.</h3>
      <p>Compare why the Judge Agent enforces upper/mid-funnel signals on A$100 AUD—and how a separate Skeptic Agent audits raw BigQuery / GAQL numbers before publishing back to <code>/llms.txt</code>, <code>/mcp</code>, and a verdict-first YouTube brief.</p>
      <div class="picker" role="group" aria-label="Compare funnel economics on A$100 AUD">
        <button type="button" class="secondary" data-bayes-mode="upper" aria-pressed="true">Upper-Funnel Shorts (Approved)</button>
        <button type="button" class="secondary" data-bayes-mode="lower" aria-pressed="false">Down-Funnel B2B Lead CPA (Rejected)</button>
      </div>
      <div id="gb-bayes-readout" class="surface">
        <strong>Upper-Funnel YouTube Shorts / Demand Gen (A$100 AUD)</strong>
        <p class="quiet">~4,000–7,500 impressions · 80–180 engagements · Beta-Binomial posterior can reliably detect a +20% relative hook lift with ≥75% directional confidence. Result is published transparently as directional evidence, never overclaimed.</p>
      </div>
    </div>
  </section>`;
}

function wetLabBody() {
  const c = activeCycle;
  return `<div class="experiment" data-experiment="wet-lab">
  <div class="crumb"><a href="/">Jack Smyth</a><span>/</span><a href="/#multimodality">Multimodality</a><span>/</span><span>Agentic Marketing Wet Lab</span></div>
  <div class="eyebrow">Experiment 03 · autonomous research lab · ${e(c.month)}</div>
  <h1>The Agentic<br>Marketing Wet Lab.</h1>
  <p class="deck">Three agent teams. One A$100 AUD monthly media budget. Real Google Ads experiments devised from live industry pulse, judged in public, and audited with Bayesian honesty.</p>
  <div class="context">
    <p>Frontier AI labs make research teams pitch for compute. Here, marketing agent teams pitch for media spend—taking the industry’s pulse via Google Search &amp; Trends, running falsifiable experiments on Google Ads MCP, and exposing every step transparently.</p>
    <small>Status: ${e(c.status)} (${e(c.mode)}). Autonomous via Industry Pulse + Judge Agent; community votes act as an advisory signal.</small>
  </div>

  ${glassBoxSchematic(c)}

  <section id="brief">
    <div class="section-top">
      <div><div class="section-no">01 / This month's scouted question</div><h2>What the swarm is testing.</h2></div>
      <span class="tag">${e(c.id)}</span>
    </div>
    <div class="surface">
      <h3>${e(c.researchQuestion)}</h3>
      <p class="quiet">${e(c.context)}</p>
      <div class="facts">
        <span>Scout · ${e(c.scoutSource)}</span>
        <span>Hard Cap · A$${SPEND_GUARDRAILS.hardCapMonthlyAud} AUD/mo</span>
        <span>Auto-Pause · A$${SPEND_GUARDRAILS.autoPauseAtSpendAud} AUD</span>
        <span>Stats · Bayesian Beta-Binomial</span>
      </div>
    </div>
  </section>

  <section id="pitches">
    <div class="section-top">
      <div><div class="section-no">02 / The grant round</div><h2>Three competing agent pitches.</h2></div>
      <p class="quiet">Each team is mapped to one of Jack's three bets. The Judge Agent scored each pitch on CMO actionability, statistical feasibility at A$100, rigour, and ad-policy safety. Cast your vote below.</p>
    </div>
    <div id="wetlab-vote-status" role="status" aria-live="polite"></div>
    <div class="wetlab-grid">
      ${c.pitches.map(pitchCard).join("\n")}
    </div>
  </section>

  <section id="suggest">
    <div class="section-no">03 / Propose next month's test</div>
    <h2>Give the swarm a CMO problem.</h2>
    <p class="quiet">Submit a real marketing question you want three agent teams to test next month on A$100 AUD. The Scout Agent reviews submissions alongside Google Search trends.</p>
    <form id="wetlab-question-form" class="surface">
      <label class="field" for="wetlab-question">Marketing hypothesis or CMO question</label>
      <textarea id="wetlab-question" minlength="15" maxlength="500" required placeholder="e.g. Does showing a transparent price in a YouTube Short lift qualified B2B clicks compared to hiding price until the landing page?"></textarea>
      <label class="field" for="wetlab-submitter">Your name, role, or agent handle (optional)</label>
      <input id="wetlab-submitter" type="text" maxlength="80" placeholder="e.g. CMO, Retail Brand · or Anonymous">
      <div class="actions">
        <button type="submit" id="wetlab-submit-btn">Submit to Scout queue →</button>
        <span class="quiet">No login required. Stored for the next monthly grant cycle.</span>
      </div>
      <div id="wetlab-question-status" role="status" aria-live="polite"></div>
    </form>
  </section>

  <section class="method" id="guardrails">
    <h2>Google-native stack &amp; spend guardrails.</h2>
    <p><strong>Why A$100 AUD works:</strong> At A$100/month, down-funnel purchase conversions have too little sample size. The Judge Agent rejects low-volume CPA tests and restricts v1 experiments to high-volume upper/mid-funnel signals (impressions, 3-second hold, CTR, on-site micro-conversions), reported with Bayesian probability of superiority rather than overclaimed p-values.</p>
    <p><strong>Google Ads MCP + Guarded Execution:</strong> Agents use Google's official <code>googleads/google-ads-mcp</code> for GAQL performance queries and dry-run asset creation (Propose &amp; Confirm). Hard-coded caps (<code>A$100/mo</code>, <code>A$10/day</code>, auto-pause at <code>A$95</code>) are enforced in code—never left to prompts.</p>
    <p><strong>YouTube-in-AI Flywheel:</strong> Every completed cycle auto-generates a verdict-first YouTube video brief (<code>${e(c.youtubeVideoBrief.title)}</code>) so the empirical findings feed directly back into multimodal AI citations.</p>
    <details class="agent-box">
      <summary>Connect your agent to the Wet Lab</summary>
      <p class="quiet">Dedicated Wet Lab MCP endpoint (separate from the read-only identity MCP):</p>
      <pre tabindex="0" aria-label="Wet Lab MCP endpoint"><code>/experiments/wet-lab/mcp</code></pre>
      <p class="quiet">Read the <a href="/experiments/wet-lab.md">Markdown guide</a> or fetch live cycle JSON at <a href="/api/experiments/wet-lab/cycle">/api/experiments/wet-lab/cycle</a>.</p>
    </details>
  </section>

  <div class="next">
    <div><span class="eyebrow">Return to the argument</span><br><a href="/#multimodality">Why multimodality matters →</a></div>
    <div><span class="eyebrow">See Experiment 02</span><br><a href="/experiments/leaderbored">Try Leaderbored →</a></div>
  </div>
</div>`;
}

function buildWetLabMcpServer() {
  const server = new McpServer(
    { name: "jack-smyth-wet-lab", version: "0.1.0" },
    {
      instructions: "Agentic Marketing Wet Lab MCP. Read the active monthly grant cycle, inspect hard-coded A$100 AUD spend guardrails, submit CMO research questions, or cast an explicitly approved vote.",
    },
  );

  server.registerTool(
    "wet_lab_get_cycle",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      title: "Get active Wet Lab grant cycle",
      description: "Returns the current monthly CMO research question, the 3 competing agent pitches, Judge scorecards, live vote tallies, and YouTube video brief.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(getWetLabState(), null, 2) }],
    }),
  );

  server.registerTool(
    "wet_lab_get_guardrails",
    {
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      title: "Get spend and statistical guardrails",
      description: "Returns the hard-coded A$100 AUD monthly spend cap, Bayesian statistical policy, and Google Ads MCP integration boundaries.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(SPEND_GUARDRAILS, null, 2) }],
    }),
  );

  server.registerTool(
    "wet_lab_cast_vote",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      title: "Cast a vote for a Wet Lab pitch",
      description: "Casts one vote for a competing agent pitch in the active Wet Lab cycle. Requires explicit approved=true attestation.",
      inputSchema: {
        pitchId: z.string().min(3).max(60),
        approved: z.literal(true).describe("Must be true to confirm intentional vote."),
      },
    },
    async ({ pitchId }) => {
      const pitch = activeCycle.pitches.find((p) => p.id === pitchId);
      if (!pitch) {
        return { isError: true, content: [{ type: "text" as const, text: `Unknown pitchId "${pitchId}". Call wet_lab_get_cycle for valid ids.` }] };
      }
      pitch.votes += 1;
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ok: true, pitchId: pitch.id, team: pitch.team, votes: pitch.votes }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "wet_lab_submit_question",
    {
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      title: "Submit a CMO research question for next month",
      description: "Submits a marketing research question to the Scout Agent queue for future A$100 AUD grant cycles.",
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
  app.get("/wet-lab.js", (_req, res) => res.type("text/javascript").send(wetLabClientScript));

  app.get("/api/experiments/wet-lab/cycle", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(getWetLabState());
  });

  app.get("/api/experiments/wet-lab/guardrails", (_req, res) => {
    res.json(SPEND_GUARDRAILS);
  });

  app.post("/api/experiments/wet-lab/vote", (req, res) => {
    res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid pitchId." }); return; }
    const pitch = activeCycle.pitches.find((p) => p.id === parsed.data.pitchId);
    if (!pitch) { res.status(404).json({ error: "Unknown pitch." }); return; }
    pitch.votes += 1;
    res.json({ ok: true, pitchId: pitch.id, votes: pitch.votes });
  });

  app.post("/api/experiments/wet-lab/suggest", (req, res) => {
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
    res.status(201).json({ ok: true, submission: entry });
  });

  app.post("/experiments/wet-lab/mcp", async (req, res) => {
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
  app.all("/experiments/wet-lab/mcp", (_req, res) =>
    res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Stateless Streamable HTTP: use POST." }, id: null }),
  );

  app.get("/experiments/wet-lab.md", (req, res) => {
    res.type("text/markdown; charset=utf-8").send(wetLabMarkdown(origin(req)));
  });

  app.get("/experiments/wet-lab", (req, res) => {
    res.vary("Accept");
    res.set("Link", `</experiments/wet-lab.md>; rel="alternate"; type="text/markdown", </experiments/wet-lab/mcp>; rel="mcp"`);
    if (req.accepts(["html", "text/markdown"]) === "text/markdown") {
      res.type("text/markdown; charset=utf-8").send(wetLabMarkdown(origin(req)));
      return;
    }
    res.type("html").send(page(origin(req), {
      path: "/experiments/wet-lab",
      title: "Agentic Marketing Wet Lab — autonomous research in practice · Jack Smyth",
      description: "Three competing agent teams, one A$100 AUD monthly Google Ads budget, Judge Agent scoring, public voting, and Bayesian CMO verdicts.",
      body: wetLabBody(),
      script: "/wet-lab.js",
    }, res.locals.nonce));
  });
}
