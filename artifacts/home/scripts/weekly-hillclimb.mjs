import { mkdir, readFile, writeFile } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const homeRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = path.resolve(homeRoot, "../..");
const siteOrigin = (process.env.SITE_ORIGIN || "https://jacksmyth.fyi").replace(/\/$/, "");
const month = process.env.TARGET_MONTH && /^\d{4}-\d{2}$/.test(process.env.TARGET_MONTH)
  ? process.env.TARGET_MONTH
  : new Date().toISOString().slice(0, 7);
const enableAutoPatch = process.env.ENABLE_AUTO_PATCH !== "false";

const ALLOWED_TIER1_FILES = [
  "artifacts/home/src/site.ts",
  "artifacts/home/src/telemetry-client.ts",
  "artifacts/home/src/index.ts",
  "artifacts/home/src/self-opt.ts",
];

function setGithubOutput(key, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) return;
  appendFileSync(outFile, `${key}=${String(value).replace(/\r?\n/g, " ")}\n`);
}

function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

function computeLocalScorecard(summary) {
  const views = summary?.human?.totalPageViews ?? 0;
  const variants = Object.values(summary?.human?.campaignVariants ?? {});
  const paidLandingViews = variants.reduce((s, v) => s + (v.pageViews || 0), 0);
  const paidScroll50 = variants.reduce((s, v) => s + (v.scroll50 || 0), 0);
  const paidScroll50RatePct = paidLandingViews > 0 ? Number(((paidScroll50 / paidLandingViews) * 100).toFixed(1)) : null;

  const interactions =
    (summary?.human?.lensSwitches?.human || 0) +
    (summary?.human?.lensSwitches?.agent || 0) +
    Object.values(summary?.human?.experimentClicks || {}).reduce((a, b) => a + b, 0) +
    Object.values(summary?.human?.outboundClicks || {}).reduce((a, b) => a + b, 0);
  const interactionRatePct = views > 0 ? Number(((interactions / views) * 100).toFixed(1)) : null;

  const ttfb = summary?.human?.cwvP75?.ttfbMs ?? null;
  const lcp = summary?.human?.cwvP75?.lcpMs ?? null;
  const agentReqs = summary?.agents?.totalRequests ?? 0;
  const agentErrs = summary?.agents?.errors4xx5xx ?? 0;
  const agentSuccessRatePct = agentReqs > 0 ? Number((((Math.max(0, agentReqs - agentErrs)) / agentReqs) * 100).toFixed(1)) : null;

  const ttfbScore = ttfb == null ? 80 : Math.max(0, Math.min(100, Math.round(100 - Math.max(0, ttfb - 400) / 20)));
  const lcpScore = lcp == null ? 80 : Math.max(0, Math.min(100, Math.round(100 - Math.max(0, lcp - 1200) / 25)));
  const speedScore = Math.round((ttfbScore + lcpScore) / 2);
  const paidScore = paidScroll50RatePct == null ? 50 : Math.min(100, Math.round(paidScroll50RatePct * 2));
  const engageScore = interactionRatePct == null ? 50 : Math.min(100, Math.round(interactionRatePct * 2.5));
  const agentScore = agentSuccessRatePct == null ? 85 : Math.round(agentSuccessRatePct);
  const compositeScore = Math.round(speedScore * 0.35 + paidScore * 0.25 + engageScore * 0.20 + agentScore * 0.20);

  return {
    month: summary.month,
    computedAt: new Date().toISOString(),
    totalPageViews: views,
    paidLandingViews,
    paidScroll50RatePct,
    interactionRatePct,
    ttfbP75Ms: ttfb,
    lcpP75Ms: lcp,
    agentSuccessRatePct,
    agentAvgLatencyMs: summary?.agents?.avgLatencyMs ?? 0,
    compositeScore,
    bottlenecks: [],
  };
}

function gradePreviousRun(ledger, currentScorecard) {
  const prev = ledger.runs?.[0];
  if (!prev) {
    return {
      outcome: "baseline",
      deltaComposite: 0,
      newViewsSincePrev: currentScorecard.totalPageViews,
      note: "First recorded hillclimb cycle — establishing baseline fitness scorecard.",
    };
  }
  const prevScore = prev.scorecard?.compositeScore ?? currentScorecard.compositeScore;
  const delta = currentScorecard.compositeScore - prevScore;
  const newViews = Math.max(0, currentScorecard.totalPageViews - (prev.scorecard?.totalPageViews ?? 0));

  if (!prev.patchApplied) {
    return {
      outcome: "inconclusive",
      deltaComposite: delta,
      newViewsSincePrev: newViews,
      note: `Prior cycle (${prev.week}) was snapshot/ops-only (no code patch). Composite fitness moved ${delta >= 0 ? "+" : ""}${delta} pts (${prevScore} → ${currentScorecard.compositeScore}).`,
    };
  }
  if (newViews < 25) {
    return {
      outcome: "inconclusive",
      deltaComposite: delta,
      newViewsSincePrev: newViews,
      note: `Only ${newViews} new views since "${prev.patch?.title}" — holding judgement until ≥25 new views accumulate.`,
    };
  }
  if (delta <= -5) {
    return {
      outcome: "reverted",
      deltaComposite: delta,
      newViewsSincePrev: newViews,
      note: `REGRESSION DETECTED: Composite fitness dropped ${delta} pts (${prevScore} → ${currentScorecard.compositeScore}) after "${prev.patch?.title}". Recommend reverting prior patch.`,
    };
  }
  return {
    outcome: "kept",
    deltaComposite: delta,
    newViewsSincePrev: newViews,
    note: `KEPT: "${prev.patch?.title}" held or improved fitness (${delta >= 0 ? "+" : ""}${delta} pts: ${prevScore} → ${currentScorecard.compositeScore} across ${newViews} new views).`,
  };
}

function extractJsonObject(text) {
  const trimmed = (text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function proposeAndApplyTier1Patch({ scorecard, gate, summary, ledger }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !enableAutoPatch) {
    return { patchApplied: false, tier: "tier-0-ops", patch: null, skipReason: !apiKey ? "GEMINI_API_KEY not set" : "ENABLE_AUTO_PATCH=false" };
  }

  // Load bounded excerpts of allowlisted files so Gemini can propose an exact, surgical replacement.
  const fileContents = {};
  for (const rel of ALLOWED_TIER1_FILES) {
    try {
      const content = await readFile(path.join(repoRoot, rel), "utf8");
      fileContents[rel] = content;
    } catch {
      // Skip missing files
    }
  }

  // Keep prompt compact by focusing on telemetry-client.ts and index.ts during ops-only mode,
  // or site.ts + telemetry-client.ts during full-hillclimb.
  const targetFiles = gate.mode === "ops-only"
    ? ["artifacts/home/src/telemetry-client.ts", "artifacts/home/src/index.ts"]
    : ["artifacts/home/src/site.ts", "artifacts/home/src/telemetry-client.ts"];

  const snippets = targetFiles
    .filter((f) => fileContents[f])
    .map((f) => `### FILE: ${f}\n\`\`\`ts\n${fileContents[f].slice(0, 14000)}\n\`\`\``)
    .join("\n\n");

  const recentTitles = (ledger.runs || []).slice(0, 6).map((r) => r.patch?.title).filter(Boolean);

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.HILLCLIMB_MODEL || "gemini-4-hydrogen";

  const prompt = `You are the Autonomous Weekly Hillclimber for jacksmyth.fyi.
Your job is to propose AT MOST ONE tiny, surgical, high-confidence Tier-1 code improvement OR return { "noOp": true, "reason": "..." } if no clean high-signal code edit is warranted right now.

STRICT GUARDRAILS:
- Current Hillclimb Gate: ${JSON.stringify(gate)}
- If gate.mode is "ops-only": DO NOT change visible UX copy, layout, or Field Lab A/B experiment pages. Only performance, caching headers, beacon reliability, or crawler/SEO hygiene is permitted. If nothing high-value needs changing in ops-only mode, return noOp=true!
- You may ONLY edit one of these files: ${JSON.stringify(targetFiles)}
- Never touch knowledge.ts, billing, auth, or security CSP headers.
- Do not repeat recent patches: ${JSON.stringify(recentTitles)}
- Your "find" string MUST match verbatim and appear ONCE in the chosen file. Keep "replace" concise (<= 2000 chars) and valid TypeScript.

Fitness Scorecard:
${JSON.stringify(scorecard, null, 2)}

Live Telemetry Summary:
${JSON.stringify(summary, null, 2)}

Editable Files:
${snippets}

Return ONLY valid JSON matching either:
{ "noOp": true, "reason": "string" }
OR:
{
  "noOp": false,
  "tier": "tier-1-auto",
  "file": "artifacts/home/src/...",
  "title": "short imperative title",
  "hypothesis": "concise falsifiable hypothesis",
  "targetMetric": "metric expected to improve",
  "find": "exact verbatim substring from file",
  "replace": "exact replacement substring"
}`;

  const interaction = await ai.interactions.create({
    model,
    input: prompt,
    generation_config: { max_output_tokens: 4096 },
  });

  const parsed = extractJsonObject(interaction.output_text ?? "");
  if (parsed.noOp) {
    return { patchApplied: false, tier: "tier-0-ops", patch: null, skipReason: parsed.reason || "Model selected no-op" };
  }

  if (!ALLOWED_TIER1_FILES.includes(parsed.file)) {
    return { patchApplied: false, tier: "tier-0-ops", patch: null, skipReason: `Rejected non-allowlisted file: ${parsed.file}` };
  }
  const absPath = path.join(repoRoot, parsed.file);
  const current = await readFile(absPath, "utf8");
  const occurrences = current.split(parsed.find).length - 1;
  if (!parsed.find || occurrences !== 1 || typeof parsed.replace !== "string" || parsed.replace.length > 4000) {
    return { patchApplied: false, tier: "tier-0-ops", patch: null, skipReason: `Patch target did not match uniquely (matches=${occurrences})` };
  }
  if (parsed.find === parsed.replace) {
    return { patchApplied: false, tier: "tier-0-ops", patch: null, skipReason: "No-op identical replacement" };
  }

  const updated = current.replace(parsed.find, parsed.replace);
  await writeFile(absPath, updated, "utf8");

  return {
    patchApplied: true,
    tier: "tier-1-auto",
    patch: {
      file: parsed.file,
      title: String(parsed.title || "Autonomous Tier-1 optimisation").slice(0, 140),
      hypothesis: String(parsed.hypothesis || "").slice(0, 500),
      targetMetric: String(parsed.targetMetric || "").slice(0, 200),
    },
    skipReason: null,
  };
}

// --- Main execution ---
const week = isoWeekKey();
console.log(`[hillclimb] Starting weekly hillclimb run (${week}, month=${month}) against ${siteOrigin}...`);

const summary = await fetchJson(`${siteOrigin}/api/self-opt/summary?month=${month}`);
let liveTracker = null;
try {
  liveTracker = await fetchJson(`${siteOrigin}/api/experiments/field-lab/live`);
} catch {
  console.warn("[hillclimb] Could not fetch /api/experiments/field-lab/live; continuing.");
}

let fitnessPayload = null;
try {
  fitnessPayload = await fetchJson(`${siteOrigin}/api/self-opt/fitness?month=${month}`);
} catch {
  console.warn("[hillclimb] /api/self-opt/fitness not live yet; computing scorecard locally.");
}

const scorecard = fitnessPayload?.scorecard ?? computeLocalScorecard(summary);
const gate = fitnessPayload?.gate ?? {
  mode: liveTracker?.stage === "live" || (summary?.human?.totalPageViews ?? 0) < 50 ? "ops-only" : "full-hillclimb",
  allowUxCopyEdits: liveTracker?.stage !== "live" && (summary?.human?.totalPageViews ?? 0) >= 50,
  activeFlight: liveTracker?.stage === "live",
  flightName: liveTracker?.campaignName ?? null,
  minViewsRequired: 50,
  currentViews: summary?.human?.totalPageViews ?? 0,
  reason: liveTracker?.stage === "live" ? "Active Field Lab flight — ops-only mode." : "Evaluated locally.",
};

const outDir = path.join(homeRoot, "content/reflections");
await mkdir(outDir, { recursive: true });
const ledgerPath = path.join(outDir, "hillclimb-ledger.json");

let ledger = { updatedAt: null, runs: [] };
try {
  ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
} catch {
  // Fresh ledger
}

const grade = gradePreviousRun(ledger, scorecard);
console.log(`[hillclimb] Fitness=${scorecard.compositeScore}/100 · Gate=${gate.mode} · Prior grade=${grade.outcome}`);

let liveReflection = null;
const cronSecret = process.env.SELF_OPT_CRON_SECRET;
if (cronSecret) {
  try {
    const refRes = await fetch(`${siteOrigin}/api/self-opt/reflect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ month }),
    });
    if (refRes.ok) {
      const data = await refRes.json();
      liveReflection = data.reflection ?? null;
    } else {
      console.warn(`[hillclimb] Live reflect endpoint returned HTTP ${refRes.status}`);
    }
  } catch (err) {
    console.warn(`[hillclimb] Live reflect call failed: ${err instanceof Error ? err.message : err}`);
  }
}

let patchOutcome = { patchApplied: false, tier: "tier-0-ops", patch: null, skipReason: "Not attempted" };
try {
  patchOutcome = await proposeAndApplyTier1Patch({ scorecard, gate, summary, ledger });
} catch (err) {
  patchOutcome = {
    patchApplied: false,
    tier: "tier-0-ops",
    patch: null,
    skipReason: `Auto-patcher error: ${err instanceof Error ? err.message : String(err)}`,
  };
}

const runRecord = {
  week,
  month,
  capturedAt: new Date().toISOString(),
  source: siteOrigin,
  scorecard,
  gate,
  previousCycleGrade: grade,
  tier: patchOutcome.tier,
  patchApplied: patchOutcome.patchApplied,
  patch: patchOutcome.patch,
  skipReason: patchOutcome.skipReason,
  reflectionSummary: liveReflection?.summary ?? null,
};

ledger.updatedAt = runRecord.capturedAt;
ledger.runs = [runRecord, ...(ledger.runs || []).filter((r) => r.week !== week)].slice(0, 52);

await writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
await writeFile(path.join(outDir, `${month}.json`), JSON.stringify({ ...runRecord, telemetry: summary, reflection: liveReflection }, null, 2) + "\n");

const prLines = [
  `## Autonomous Weekly Hillclimb — ${week}`,
  "",
  `| Metric | Value |`,
  `| :--- | :--- |`,
  `| **Composite Fitness** | **${scorecard.compositeScore}/100** (${grade.deltaComposite >= 0 ? "+" : ""}${grade.deltaComposite} vs prior) |`,
  `| **Hillclimb Gate** | \`${gate.mode}\` — ${gate.reason} |`,
  `| **Human Views / Paid >50% Scroll** | ${scorecard.totalPageViews} views · ${scorecard.paidScroll50RatePct ?? "n/a"}% paid scroll50 (${scorecard.paidLandingViews} UTM landings) |`,
  `| **Speed (p75)** | TTFB ${scorecard.ttfbP75Ms ?? "n/a"}ms · LCP ${scorecard.lcpP75Ms ?? "n/a"}ms |`,
  `| **Agent Surface** | ${scorecard.agentSuccessRatePct ?? "n/a"}% 2xx · ${scorecard.agentAvgLatencyMs}ms avg |`,
  "",
  `### Prior Cycle Verdict (\`${grade.outcome}\`)`,
  grade.note,
  "",
  patchOutcome.patchApplied
    ? [
        `### Applied Tier-1 Autonomous Patch`,
        `- **Title:** ${patchOutcome.patch.title}`,
        `- **File:** \`${patchOutcome.patch.file}\``,
        `- **Hypothesis:** ${patchOutcome.patch.hypothesis}`,
        `- **Target Metric:** ${patchOutcome.patch.targetMetric}`,
      ].join("\n")
    : `### Code Changes\nNo code patch applied this cycle (${patchOutcome.skipReason}). Snapshot & fitness ledger updated.`,
  "",
  `### Guardrails`,
  `- Verified by \`pnpm --filter @workspace/home run verify\` (typecheck, build, MCP, protocols, browser, axe-core a11y, self-opt).`,
  `- Autonomy tier: \`${patchOutcome.tier}\` (Tier 0/1 auto-merge eligible once CI passes; Tier 2 requires human review).`,
];

await writeFile(path.join(outDir, "latest-pr-body.md"), prLines.join("\n") + "\n");

setGithubOutput("week", week);
setGithubOutput("tier", patchOutcome.tier);
setGithubOutput("patch_applied", patchOutcome.patchApplied);
setGithubOutput("patch_title", patchOutcome.patch?.title ?? `Weekly hillclimb snapshot (${week})`);
setGithubOutput("composite_score", scorecard.compositeScore);

console.log(`[hillclimb] Done. patchApplied=${patchOutcome.patchApplied} tier=${patchOutcome.tier}`);
