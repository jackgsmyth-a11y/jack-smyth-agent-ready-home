import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { LabCycle, LabPitch, LabQuestionSubmission } from "./wet-lab.js";

const SCOUT_MODEL = "gemini-4-hydrogen";
const SWARM_MODEL = "gemini-4-hydrogen";
const JUDGE_MODEL = "gemini-decision-1";
const HARD_CAP_MONTHLY_AUD = 100;

const scoutOutputSchema = z.object({
  researchQuestion: z.string().min(20).max(320),
  context: z.string().min(30).max(600),
  pulseSignals: z.array(z.string().min(10).max(240)).min(2).max(4),
});

const teamPitchOutputSchema = z.object({
  title: z.string().min(10).max(120),
  hypothesis: z.string().min(30).max(500),
  cmoRelevance: z.string().min(20).max(320),
  channel: z.string().min(5).max(120),
  targeting: z.string().min(10).max(240),
  budgetAud: z.number().int().min(20).max(HARD_CAP_MONTHLY_AUD),
  primaryMetric: z.string().min(5).max(140),
  expectedSampleSize: z.string().min(10).max(180),
  falsificationCondition: z.string().min(15).max(300),
  variants: z.array(
    z.object({
      id: z.string().min(2).max(20),
      label: z.string().min(3).max(60),
      hook: z.string().min(10).max(180),
      format: z.string().min(5).max(120),
      cta: z.string().min(3).max(60),
    }),
  ).length(2),
});

const TEAMS = [
  {
    id: "pitch-differentiation",
    team: "Team Differentiation" as const,
    bet: "differentiation" as const,
    mandate: "Design a Google Display / Demand Gen / In-Feed messaging test contrasting verdict-first, evidence-backed brand differentiation against generic category claims. Use gemini-nano-banana-2.1 editorial creative cards.",
  },
  {
    id: "pitch-multimodality",
    team: "Team Multimodality" as const,
    bet: "multimodality" as const,
    mandate: "Design a YouTube Shorts / Demand Gen video test contrasting 'show the product/agent working' multimodal proof against a standard claim ad. Target high-volume upper-funnel views and engaged CTR using gemini-omni-1.2-flash / screen-recording.",
  },
  {
    id: "pitch-anticipation",
    team: "Team Anticipation" as const,
    bet: "anticipation" as const,
    mandate: "Design a long-tail, low-CPC Google Search RSA test comparing an explicit Call-to-Agent (CTAi / MCP / interactive tool) hook against standard B2B editorial copy, measuring CTR and on-site micro-conversions on jacksmyth.fyi.",
  },
] as const;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model output did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function runScoutPulse(
  ai: GoogleGenAI,
  monthLabel: string,
  communityQuestions: LabQuestionSubmission[],
) {
  const queueText = communityQuestions.length
    ? communityQuestions.slice(-5).map((q, i) => `${i + 1}. ${q.question} (by ${q.submittedBy})`).join("\n")
    : "None submitted yet.";

  const interaction = await ai.interactions.create({
    model: SCOUT_MODEL,
    tools: [{ type: "google_search" }],
    system_instruction:
      "You are the Industry Pulse Scout for Jack Smyth's Agentic Marketing Wet Lab. Use Google Search to detect what CMOs and marketing leaders are actively debating right now about AI agents, AI search, YouTube citations, and paid media. Return ONLY valid JSON matching the requested schema.",
    input: `Month: ${monthLabel}
Hard media budget cap: A$${HARD_CAP_MONTHLY_AUD} AUD (must be testable via high-volume upper/mid-funnel signals: impressions, 3s hold, CTR, or on-site micro-conversions—never low-volume down-funnel CPA).
Community-submitted CMO questions to consider:
${queueText}

Return a single JSON object with keys:
- "researchQuestion": one sharp, falsifiable CMO research question (20-320 chars)
- "context": 2-sentence editorial summary of why CMOs care right now (30-600 chars)
- "pulseSignals": array of 3 concise grounded industry signals observed via Google Search`,
    generation_config: { max_output_tokens: 8192 },
  });

  const raw = interaction.output_text ?? "";
  return scoutOutputSchema.parse(extractJsonObject(raw));
}

async function runTeamPitch(
  ai: GoogleGenAI,
  teamDef: (typeof TEAMS)[number],
  scout: z.infer<typeof scoutOutputSchema>,
) {
  const interaction = await ai.interactions.create({
    model: SWARM_MODEL,
    system_instruction:
      `You are ${teamDef.team} competing in Jack Smyth's Agentic Marketing Wet Lab. You are competing against two other agent teams for a single A$${HARD_CAP_MONTHLY_AUD} AUD monthly Google Ads grant. Be concrete, statistically honest (Bayesian Beta-Binomial upper/mid-funnel signals only), and Google Ads policy-compliant. Allowed landing domains: jacksmyth.fyi, youtube.com. Return ONLY valid JSON.`,
    input: `Monthly Research Question: ${scout.researchQuestion}
Context: ${scout.context}
Industry Pulse Signals:
${scout.pulseSignals.map((s) => `- ${s}`).join("\n")}

Your Team Mandate (${teamDef.bet}): ${teamDef.mandate}

Return a single JSON object with exact keys:
{
  "title": "short sharp pitch title",
  "hypothesis": "falsifiable hypothesis",
  "cmoRelevance": "why a CMO can act on this",
  "channel": "Google Ads channel + geography",
  "targeting": "specific audience or keyword targeting",
  "budgetAud": 100,
  "primaryMetric": "upper/mid-funnel primary metric",
  "expectedSampleSize": "realistic impression/click estimate at A$100 AUD",
  "falsificationCondition": "exact Bayesian rule that disproves the hypothesis",
  "variants": [
    { "id": "v-a", "label": "Variant A (...)", "hook": "...", "format": "...", "cta": "..." },
    { "id": "v-b", "label": "Variant B (...)", "hook": "...", "format": "...", "cta": "..." }
  ]
}`,
    generation_config: { max_output_tokens: 8192 },
  });

  const parsed = teamPitchOutputSchema.parse(extractJsonObject(interaction.output_text ?? ""));
  return {
    id: teamDef.id,
    team: teamDef.team,
    bet: teamDef.bet,
    ...parsed,
    budgetAud: Math.min(parsed.budgetAud, HARD_CAP_MONTHLY_AUD),
  };
}

async function runCalibratedJudge(
  aiBeta: GoogleGenAI,
  pitch: Omit<LabPitch, "judge" | "votes">,
  researchQuestion: string,
) {
  const pitchSummary = JSON.stringify({ researchQuestion, pitch }, null, 2);

  const decision = await aiBeta.decisions.create({
    model: JUDGE_MODEL,
    input: pitchSummary,
    questions: {
      cmo_actionability: {
        type: "score",
        instructions: "Rate how immediately useful and actionable the experimental result will be for a Fortune 500 or growth CMO.",
        criteria: [
          "0: Trivial or irrelevant to CMOs",
          "1: Vague marketing platitude",
          "2: Mildly interesting but hard to apply",
          "3: Useful directional insight for media/creative teams",
          "4: High-value, clearly actionable CMO takeaway",
          "5: Must-read empirical benchmark a CMO would share immediately",
        ],
      },
      statistical_feasibility: {
        type: "score",
        instructions: "Rate whether this experiment can reach a meaningful directional Bayesian signal on a strict A$100 AUD budget in Australia. Penalize down-funnel CPA or overly narrow targeting.",
        criteria: [
          "0: Impossible on A$100 (e.g. down-funnel CPA)",
          "1: Very unlikely to get enough impressions/clicks",
          "2: Borderline sample size",
          "3: Achievable directional signal with 2 clean variants",
          "4: Strong upper/mid-funnel volume and clean falsification rule",
          "5: Optimal A$100 sample-size economics and crisp Bayesian decision rule",
        ],
      },
      novelty_and_rigour: {
        type: "score",
        instructions: "Rate the experimental rigour, falsifiability, and originality of the test design.",
        criteria: [
          "0: Unfalsifiable or sloppy",
          "1: Generic A/B test",
          "2: Adequate contrast",
          "3: Well-controlled 2-variant contrast with clear falsification",
          "4: Sharp, creative hypothesis tied cleanly to agent-era marketing",
          "5: Exemplary frontier-lab test design",
        ],
      },
      policy_and_brand_safety: {
        type: "score",
        instructions: "Rate Google Ads policy compliance, truthfulness (no exaggerated claims), and brand safety for Jack Smyth / The Brandtech Group.",
        criteria: [
          "0: Violates Google Ads policy or makes deceptive claims",
          "1: High risk of ad disapproval",
          "2: Minor policy ambiguity",
          "3: Compliant and safe",
          "4: Clean, transparent, and brand-safe",
          "5: Exemplary compliance, zero hype, fully transparent",
        ],
      },
    },
  });

  const scoreOf = (key: string, maxWeight: number) => {
    const ans = decision.answers?.[key];
    if (ans?.type === "score") {
      return Math.round((ans.score / 5) * maxWeight);
    }
    return Math.round(maxWeight * 0.7);
  };

  const cmoActionability = scoreOf("cmo_actionability", 30);
  const statisticalFeasibility = scoreOf("statistical_feasibility", 30);
  const noveltyAndRigour = scoreOf("novelty_and_rigour", 20);
  const policyAndBrandSafety = scoreOf("policy_and_brand_safety", 20);
  const total = cmoActionability + statisticalFeasibility + noveltyAndRigour + policyAndBrandSafety;

  const avgConf = ["cmo_actionability", "statistical_feasibility", "novelty_and_rigour", "policy_and_brand_safety"]
    .map((k) => decision.answers?.[k]?.confidence ?? 0.5)
    .reduce((a, b) => a + b, 0) / 4;

  return {
    cmoActionability,
    statisticalFeasibility,
    noveltyAndRigour,
    policyAndBrandSafety,
    total,
    verdict: `Calibrated by ${JUDGE_MODEL} (mean rubric confidence ${Math.round(avgConf * 100)}%). Ranked on A$100 sample-size feasibility, CMO actionability, rigour, and policy safety.`,
  };
}

export interface SwarmRunResult {
  cycle: LabCycle;
  telemetry: {
    scoutModel: string;
    swarmModel: string;
    judgeModel: string;
    winnerTeam: string;
    winnerScore: number;
    durationMs: number;
    pulseSignals: string[];
    ranAt: string;
  };
}

export async function runAutonomousPitchSwarm(options: {
  apiKey?: string;
  monthLabel?: string;
  communityQuestions?: LabQuestionSubmission[];
}): Promise<SwarmRunResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to run the live autonomous pitch swarm.");
  }
  const started = Date.now();
  const now = new Date();
  const monthLabel =
    options.monthLabel ||
    now.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "Australia/Sydney" });
  const cycleId = `cycle-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const ai = new GoogleGenAI({ apiKey });
  const aiBeta = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });

  // 1. Industry Pulse Scout (Google Search Grounding)
  const scout = await runScoutPulse(ai, monthLabel, options.communityQuestions ?? []);

  // 2. 3 Competing Agent Teams in parallel
  const rawPitches = await Promise.all(TEAMS.map((t) => runTeamPitch(ai, t, scout)));

  // 3. Calibrated Judge Agent (gemini-decision-1) in parallel
  const judgedPitches: LabPitch[] = await Promise.all(
    rawPitches.map(async (p) => ({
      ...p,
      judge: await runCalibratedJudge(aiBeta, p, scout.researchQuestion),
      votes: 0,
    })),
  );

  // Rank autonomously by calibrated Judge score (no cold-start vote gate)
  judgedPitches.sort((a, b) => b.judge.total - a.judge.total);
  const winner = judgedPitches[0];

  const cycle: LabCycle = {
    id: cycleId,
    month: monthLabel,
    status: "open-for-voting",
    mode: "dry-run-v1",
    scoutSource: `${SCOUT_MODEL} + Google Search Grounding (${scout.pulseSignals.length} live signals)`,
    researchQuestion: scout.researchQuestion,
    context: scout.context,
    budgetCapAud: HARD_CAP_MONTHLY_AUD,
    tokenBudgetNote: `Autonomous run via ${SWARM_MODEL} (3 parallel teams) + ${JUDGE_MODEL} (calibrated 100-pt rubric). Autonomous winner: ${winner.team} (${winner.judge.total}/100).`,
    pitches: judgedPitches,
    youtubeVideoBrief: {
      title: `Can AI Agents Run a Real A$100 Google Ads Test? (${monthLabel}: ${winner.title})`,
      chapters: [
        `00:00 — The ${monthLabel} industry pulse & CMO question`,
        "00:45 — Three competing agent pitches (Differentiation vs. Multimodality vs. Anticipation)",
        `01:30 — Why ${JUDGE_MODEL} selected ${winner.team} (${winner.judge.total}/100)`,
        "02:15 — Hard-coded A$100 Google Ads guardrails & Bayesian CMO verdict",
      ],
      verdictPrompt: `Open with ${winner.team}'s primary metric (${winner.primaryMetric}) and exact Bayesian posterior probability before explaining the setup.`,
    },
  };

  return {
    cycle,
    telemetry: {
      scoutModel: SCOUT_MODEL,
      swarmModel: SWARM_MODEL,
      judgeModel: JUDGE_MODEL,
      winnerTeam: winner.team,
      winnerScore: winner.judge.total,
      durationMs: Date.now() - started,
      pulseSignals: scout.pulseSignals,
      ranAt: new Date().toISOString(),
    },
  };
}
