import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const siteOrigin = (process.env.SITE_ORIGIN || "https://jacksmyth.fyi").replace(/\/$/, "");
const month = process.env.TARGET_MONTH && /^\d{4}-\d{2}$/.test(process.env.TARGET_MONTH)
  ? process.env.TARGET_MONTH
  : new Date().toISOString().slice(0, 7);

console.log(`[self-opt] Fetching telemetry summary for ${month} from ${siteOrigin}...`);
const summaryRes = await fetch(`${siteOrigin}/api/self-opt/summary?month=${month}`);
if (!summaryRes.ok) {
  throw new Error(`Failed to fetch telemetry summary: HTTP ${summaryRes.status}`);
}
const summary = await summaryRes.json();

let reflection = null;
const cronSecret = process.env.SELF_OPT_CRON_SECRET;
if (cronSecret) {
  console.log(`[self-opt] Triggering live reflection endpoint for ${month}...`);
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
    reflection = data.reflection;
  } else {
    console.warn(`[self-opt] Live reflect endpoint returned HTTP ${refRes.status}; saving telemetry snapshot.`);
  }
}

const outDir = `${root}content/reflections`;
await mkdir(outDir, { recursive: true });
const outPath = `${outDir}/${month}.json`;
await writeFile(
  outPath,
  JSON.stringify(
    {
      month,
      capturedAt: new Date().toISOString(),
      source: siteOrigin,
      telemetry: summary,
      reflection,
    },
    null,
    2,
  ) + "\n",
);
console.log(`[self-opt] Wrote monthly snapshot to ${outPath}`);
