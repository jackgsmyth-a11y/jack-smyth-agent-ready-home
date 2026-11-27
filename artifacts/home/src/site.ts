import { createHash } from "node:crypto";
import { BETS, CLAIMS, SITE, SOURCES, SOURCE_GAPS, STYLE_PRINCIPLES, VIDEO_BRIEFS, WORKS, sourceRefs, type Bet } from "./knowledge.js";
import { homeClientScript } from "./home-client.js";
import flairData from "./data/flair.json" with { type: "json" };
import leaderboredData from "./data/leaderbored.json" with { type: "json" };

const HOME_UI_VER = createHash("sha256").update(homeClientScript).digest("hex").slice(0, 8);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const bets = Object.keys(BETS) as Bet[];
export interface PageView { path: string; title: string; description: string; body: string; script?: string }

function highlightFlair(text: string, highlights: Array<{ phrase: string }>) {
  let out = esc(text);
  for (const h of highlights) {
    const target = esc(h.phrase);
    if (target && out.includes(target)) out = out.replace(target, `<mark>${target}</mark>`);
  }
  return out;
}

const HOME_FLAIR_IDS = ["bambino-plus", "sony-xm5", "ordinary-niacinamide", "kathmandu-litehaul"];
const HOME_LB_IDS = ["automotive", "banking", "beauty", "travel"];

function renderHomeFlairSpotlight() {
  const examples = HOME_FLAIR_IDS
    .map((id) => flairData.examples.find((x) => x.id === id))
    .filter((x): x is (typeof flairData.examples)[number] => Boolean(x));
  const tabs = examples.map((x, i) =>
    `<button type="button" data-flair-tab="${esc(x.id)}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(x.category)}</button>`
  ).join("");
  const panels = examples.map((x, i) => {
    const factsLine = x.facts.map((f) => `${esc(f.label)}: ${esc(f.value)}`).join(" · ");
    return `<div class="flair-panel" data-flair-panel="${esc(x.id)}"${i === 0 ? "" : " hidden"}>
      <div class="flair-compare">
        <div class="flair-col flair-before">
          <div class="flair-col-label">Retailer copy · ${esc(x.retailer)}</div>
          <h4>${esc(x.productName)}</h4>
          <p class="flair-excerpt">${esc(x.sourceExcerpt)}</p>
          <small><a href="${esc(x.sourceUrl)}" rel="noopener">Source snapshot (${esc(x.sourceCheckedAt)}) ↗</a></small>
        </div>
        <div class="flair-col flair-after">
          <div class="flair-col-label">Reframed with the same facts</div>
          <h4>${esc(x.headline)}</h4>
          <p>${highlightFlair(x.description, x.highlights)}</p>
          <p class="flair-facts"><strong>Locked facts:</strong> ${factsLine}</p>
          <small>${esc(x.meaningfulChange)}</small>
        </div>
      </div>
    </div>`;
  }).join("");
  return `<aside class="spotlight spotlight-flair">
    <div class="spotlight-bar">
      <div>
        <h3>Facts with flair.</h3>
        <p>Being legible is the starting point. Giving an agent a real reason to choose you is the work. Switch products below to compare verbatim retailer copy against a source-locked reframing.</p>
      </div>
      <div class="seg-tabs" role="group" aria-label="Facts with Flair product examples">${tabs}</div>
    </div>
    ${panels}
    <div class="spotlight-foot">
      <a class="btn" href="/experiments/facts-with-flair">Try your own product URL →</a>
      <small>Powered by Flint from Springboards. Dated retailer snapshots; no measured ranking claim.</small>
    </div>
  </aside>`;
}

function renderHomeMultimodalitySpotlight() {
  return `<aside class="spotlight spotlight-mm">
    <div class="spotlight-bar">
      <div>
        <h3>Beyond the metadata.</h3>
        <p>Text tells an AI what a brand claims; video shows it. Compare what a text-only crawler sees from Jack’s BRXND LA 2025 talk against the multimodal signals an AI model actually extracts.</p>
      </div>
      <div class="seg-tabs" role="group" aria-label="Multimodal signal layers">
        <button type="button" data-mm-tab="meta" aria-pressed="true">Metadata only</button>
        <button type="button" data-mm-tab="av" aria-pressed="false">Audio + visual</button>
        <button type="button" data-mm-tab="verdict" aria-pressed="false">Agent verdict</button>
      </div>
    </div>
    <div class="mm-grid">
      <div class="mm-media">
        <a class="mm-poster" href="https://www.youtube.com/watch?v=MHm_zAgki1s" rel="noopener" aria-label="Watch Jack Smyth's BRXND LA 2025 talk on YouTube: The Most Important Audience You'll Never Meet (11 minutes)">
          <img src="/lab/brxnd-la-2025.jpg" alt="Jack Smyth presenting The Most Important Audience You'll Never Meet at BRXND Marketing X AI Conf LA 2025" width="1280" height="720" loading="lazy" decoding="async">
          <span class="mm-play" aria-hidden="true">▶ Watch on YouTube · 11 min</span>
        </a>
        <pre class="bet-ascii" data-bet-ascii="multimodality" aria-hidden="true">  .:*@#*:..   [▶ VIDEO]\n  --WAVEFORM-----> ★\n  :*#@*:.     AI CITED</pre>
      </div>
      <div class="mm-signals">
        <div class="mm-panel" data-mm-panel="meta">
          <div class="flair-col-label">Literal YouTube metadata on MHm_zAgki1s (verified live)</div>
          <h4>11 words of description. Zero keywords. Zero chapters.</h4>
          <p class="mm-muted">“Jack Smyth of Jellyfish on how large language models perceive brands.” · Duration: 11:22 (682s) · Keywords: [] · Captions: auto-ASR only</p>
          <p>Beyond that single 11-word sentence, the YouTube description is generic conference boilerplate. A text-only crawler sees a title and a speaker name, with none of the thesis, frameworks, or examples inside the 11-minute talk.</p>
        </div>
        <div class="mm-panel" data-mm-panel="av" hidden>
          <div class="flair-col-label">3 real moments Gemini 4 extracted from the 11:22 video (0% in metadata)</div>
          <ul class="mm-nuggets">
            <li><a href="https://www.youtube.com/watch?v=MHm_zAgki1s&amp;t=312s" rel="noopener"><strong>05:12 ↗</strong></a> <strong>Delta’s 91% mention rate vs. position 7:</strong> On-screen Share of Model chart modal shows Delta mentioned in 91% of airline answers yet averaging rank 7, too low when AI agents surface only 2–3 options.</li>
            <li><a href="https://www.youtube.com/watch?v=MHm_zAgki1s&amp;t=361s" rel="noopener"><strong>06:01 ↗</strong></a> <strong>American Airlines’ Llama vs. Gemini gap:</strong> Isolating the stacked bar chart shows a wide share of top recommendations in Meta Llama 3.1 compared to a sliver in Gemini 1.5.</li>
            <li><a href="https://www.youtube.com/watch?v=MHm_zAgki1s&amp;t=645s" rel="noopener"><strong>10:45 ↗</strong></a> <strong>Gemini scoring a Bud Light Super Bowl gag:</strong> Asset Evaluation modal (7.5 overall, 8.0 Humor) where Gemini recognizes the visual gag of using leaf blowers to shoo guests out of a house party and critiques its timing.</li>
          </ul>
        </div>
        <div class="mm-panel" data-mm-panel="verdict" hidden>
          <div class="flair-col-label">Why this changes the Field Lab &amp; Share of Model</div>
          <h4>Show the agent working, not just the claim</h4>
          <p>Brandtech’s Share of Model analysis found YouTube is the platform AI engines recommend most, with about 1 in 7 long-form citations pointing to an exact timestamp. In the Field Lab, Team Multimodality tests that directly: a 20-second screen-recorded YouTube Short against a standard claim ad on A$100 AUD.</p>
        </div>
      </div>
    </div>
    <div class="spotlight-foot">
      <a class="btn" href="/experiments/field-lab">Inspect Team Multimodality in the Field Lab →</a>
      <small>Source talk: <a href="https://www.youtube.com/watch?v=MHm_zAgki1s" rel="noopener">BRXND LA 2025 (YouTube) ↗</a> · Zero third-party embeds or cookies.</small>
    </div>
  </aside>`;
}

function renderHomeLeaderboredSpotlight() {
  const categories = HOME_LB_IDS
    .map((id) => leaderboredData.find((c) => c.id === id))
    .filter((c): c is (typeof leaderboredData)[number] => Boolean(c));
  const tabs = categories.map((c, i) =>
    `<button type="button" data-lb-tab="${esc(c.id)}" aria-pressed="${i === 0 ? "true" : "false"}">${esc(c.name)}</button>`
  ).join("");
  const panels = categories.map((c, i) => {
    const p = c.patterns[0];
    const challenge = p?.notes?.challenges?.[0] || "";
    const exampleCopy = p?.notes?.exampleCopy?.[0] || "";
    const rawDir = p?.notes?.creativeDirection?.[0] || "";
    const direction = rawDir.replace(/\s*Generate three divergent[\s\S]*$/i, "").trim();
    const verify = p?.notes?.factsToVerify?.[0] || "";
    return `<div class="lb-panel" data-lb-panel="${esc(c.id)}"${i === 0 ? "" : " hidden"}>
      <div class="lb-row">
        <span class="lb-label">Category cliché · ${esc(c.name)} (sample data)</span>
        <strong>${esc(p?.theme || "")}</strong>
        <p>${esc(challenge)}${exampleCopy ? ` Example: “${esc(exampleCopy)}”` : ""}</p>
      </div>
      <div class="lb-row lb-diverge">
        <span class="lb-label">Divergent agent brief</span>
        <p>${esc(direction)}</p>
        ${verify ? `<small>Verify before publishing: ${esc(verify)}</small>` : ""}
      </div>
    </div>`;
  }).join("");
  return `<aside class="spotlight spotlight-lb">
    <h3>Leaderbored.</h3>
    <p>What does an agency look like when its next client is an agent? Inspect a category cliché and the brief an agent uses to diverge.</p>
    <div class="seg-tabs" role="group" aria-label="Leaderbored sample categories">${tabs}</div>
    ${panels}
    <div class="spotlight-foot">
      <a class="btn" href="/experiments/leaderbored">Try Leaderbored (A$1.00 / 10 credits) →</a>
      <small>Powered by Flint from Springboards. Category patterns are sample data. Human approves budget.</small>
    </div>
  </aside>`;
}

function srcLinks(ids: string[]) {
  return sourceRefs(ids)
    .filter((s) => s.id !== "s-owner")
    .map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.publisher)}</a>`)
    .join(" · ");
}

function claimLi(c: (typeof CLAIMS)[number]) {
  const kindLabel = c.kind === "synthesis" ? `<span class="claim-kind syn">Generated synthesis</span>` : c.kind === "reported" ? `<span class="claim-kind">Reported figure</span>` : c.kind === "quote" ? `<span class="claim-kind">Quote</span>` : "";
  const text = c.kind === "quote" ? `<q>${esc(c.text)}</q>` : esc(c.text);
  const src = srcLinks(c.sources);
  return `<li class="${c.kind}">${kindLabel}<p>${text}</p>${src ? `<small>${src}</small>` : ""}</li>`;
}

function workCard(w: (typeof WORKS)[number]) {
  const body = w.humanSummary || w.summary;
  const prov = w.provenanceNote
    ? `<span class="prov" title="${esc(w.relationship || "")}">${esc(w.provenanceNote)}${w.authors ? ` · Byline: ${esc(w.authors.join(", "))}` : ""}</span>`
    : "";
  const footer = w.status === "pending-details"
    ? `<em>Awaiting details from Jack</em>`
    : `<small>${srcLinks(w.sources)}</small>`;
  const typeLabel = w.type.charAt(0).toUpperCase() + w.type.slice(1);
  const metaLine = w.access ? `${esc(typeLabel)} · ${esc(w.access)}` : esc(typeLabel);
  return `<li class="${w.status}">
    <div class="work-kicker"><span class="work-meta">${metaLine}</span></div>
    <h4>${w.url ? `<a href="${esc(w.url)}" rel="noopener">${esc(w.title)}</a>` : esc(w.title)}</h4>
    <p>${esc(body)}</p>
    <div class="work-foot">${prov}${footer}</div>
  </li>`;
}

function betSection(b: Bet) {
  const B = BETS[b];
  const betClaims = CLAIMS.filter((c) => c.bet === b);
  const archiveWork = WORKS.filter((w) => w.bet === b && !w.experiment);
  const spotlight = b === "differentiation"
    ? renderHomeFlairSpotlight()
    : b === "multimodality"
    ? renderHomeMultimodalitySpotlight()
    : b === "anticipation"
    ? renderHomeLeaderboredSpotlight()
    : "";
  const agentSpec = b === "differentiation"
    ? 'MCP: get_positions({ bet: "differentiation" }) · BUILD: /experiments/facts-with-flair'
    : b === "multimodality"
    ? 'MCP: get_positions({ bet: "multimodality" }) · LAB: /experiments/field-lab/mcp'
    : 'MCP: get_positions({ bet: "anticipation" }) · ACTION MCP: /experiments/leaderbored/mcp';
  const asciiFallback = b === "differentiation"
    ? "  ==== commodity copy ====\n >[SPEC|PROOF · 89% CITED]<\n  ==== generic hype   ===="
    : b === "multimodality"
    ? "  .:*@#*:..   [▶ VIDEO]\n  --WAVEFORM-----> ★\n  :*#@*:.     AI CITED"
    : "  [HUMAN]        [AGENT]\n     +--✓--> +====> [IDEA]\n   MCP: /leaderbored/mcp";
  const initialClaims = betClaims.slice(0, 4);
  const moreClaims = betClaims.slice(4);
  const claimsBlock = `<div class="thinking-band">
      <h3>The thinking</h3>
      <ul class="claims claims-grid">${initialClaims.map(claimLi).join("")}</ul>
      ${moreClaims.length ? `<details><summary>All ${betClaims.length} sourced positions &amp; evidence (+${moreClaims.length} more)</summary><ul class="claims claims-grid">${moreClaims.map(claimLi).join("")}</ul></details>` : ""}
    </div>`;
  const workBlock = `<div class="work-band">
      <h3>Writing, talks &amp; research</h3>
      <ul class="work work-grid">${archiveWork.map(workCard).join("")}</ul>
      ${b === "multimodality" ? `<details><summary>Video briefs (planned, not yet produced: ${VIDEO_BRIEFS.length})</summary><ul class="briefs">${VIDEO_BRIEFS.map((v) => `<li><h4>${esc(v.title)}</h4><span class="work-meta">${esc(v.format)}</span><p>${esc(v.brief)}</p></li>`).join("")}</ul></details>` : ""}
    </div>`;

  if (b === "differentiation") {
    return `<section class="bet bet-editorial" id="${b}" data-bet="${b}" data-agent-spec="${esc(agentSpec)}">
  <div class="bet-head">
    <div class="bet-head-main"><span class="num">0${B.n}</span><div><h2>${B.title}</h2><p class="q">${esc(B.question)}</p></div></div>
    <pre class="bet-ascii" data-bet-ascii="${b}" aria-hidden="true">${asciiFallback}</pre>
  </div>
  <p class="thesis">${esc(B.thesis)}</p>
  ${spotlight}
  <div class="bet-bands">
    ${claimsBlock}
    ${workBlock}
  </div>
</section>`;
  }

  if (b === "multimodality") {
    return `<section class="bet bet-stage" id="${b}" data-bet="${b}" data-agent-spec="${esc(agentSpec)}">
  <div class="bet-head">
    <div class="bet-head-main"><span class="num">0${B.n}</span><div><h2>${B.title}</h2><p class="q">${esc(B.question)}</p></div></div>
  </div>
  <p class="thesis">${esc(B.thesis)}</p>
  ${spotlight}
  <div class="bet-bands">
    ${claimsBlock}
    ${workBlock}
  </div>
</section>`;
  }

  return `<section class="bet bet-workbench" id="${b}" data-bet="${b}" data-agent-spec="${esc(agentSpec)}">
  <div class="bet-head">
    <div class="bet-head-main"><span class="num">0${B.n}</span><div><h2>${B.title}</h2><p class="q">${esc(B.question)}</p></div></div>
    <pre class="bet-ascii" data-bet-ascii="${b}" aria-hidden="true">${asciiFallback}</pre>
  </div>
  <p class="thesis">${esc(B.thesis)}</p>
  <div class="bet-workbench-split">
    ${spotlight}
    ${claimsBlock}
  </div>
  <div class="bet-bands">
    ${workBlock}
  </div>
</section>`;
}

export function page(base: string, view?: PageView, nonce = "") {
  const pageUrl = `${base}${view?.path || "/"}`;
  const pageTitle = view?.title || "Jack Smyth — three bets on agents, video and anticipation";
  const pageDesc = view?.description || SITE.tagline;
  const ogImage = `${base}/og-image.png`;
  const lastMod = "2026-11-27";
  const isFieldLab = !view || view.path === "/experiments/field-lab";
  const isInteractiveApp = view?.path === "/experiments/facts-with-flair" || view?.path === "/experiments/leaderbored";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person", "@id": `${base}/#jack`, name: "Jack Smyth", url: base,
        jobTitle: "Country Lead: Australia", worksFor: { "@type": "Organization", name: "The Brandtech Group", url: "https://thebrandtechgroup.com" },
        sameAs: ["https://linkedin.com/in/jtsmyth"],
        knowsAbout: ["Generative engine marketing", "Brand-to-agent (B2A) marketing", "Share of Model", "Agentic AI", "Agentic marketing", "Multimodal brand content", "YouTube AI citations", "Google Ads automation"],
        description: SITE.tagline,
      },
      { "@type": "WebSite", "@id": `${base}/#site`, url: base, name: "Jack Smyth", about: { "@id": `${base}/#jack` } },
      ...(!view ? [{
        "@type": "ProfilePage",
        "@id": `${base}/#profile-page`,
        url: `${base}/`,
        name: pageTitle,
        description: pageDesc,
        dateCreated: "2026-11-20",
        dateModified: lastMod,
        mainEntity: { "@id": `${base}/#jack` },
        isPartOf: { "@id": `${base}/#site` },
      }] : []),
      ...(isFieldLab ? [{
        "@type": "Dataset",
        "@id": `${base}/experiments/field-lab#dataset`,
        name: "Agentic Field Lab — Open CMO Ad Experiments",
        description: "Modelled on frontier AI research teams pitching for compute: monthly autonomous marketing experiments devised by three competing AI agent teams, scored by a calibrated Judge Agent, and executed within a hard-capped A$100 AUD Google Ads media grant.",
        url: `${base}/experiments/field-lab`,
        creator: { "@id": `${base}/#jack` },
        isAccessibleForFree: true,
      }] : []),
      ...(view ? [
        { "@type": "WebPage", "@id": pageUrl, url: pageUrl, name: pageTitle, description: pageDesc, isPartOf: { "@id": `${base}/#site` }, about: { "@id": `${base}/#jack` } },
        {
          "@type": "TechArticle",
          "@id": `${pageUrl}#article`,
          headline: pageTitle,
          description: pageDesc,
          url: pageUrl,
          image: ogImage,
          dateModified: lastMod,
          author: { "@id": `${base}/#jack` },
          publisher: { "@id": `${base}/#jack` },
          mainEntityOfPage: { "@id": pageUrl },
        },
        ...(isInteractiveApp ? [{
          "@type": "WebApplication",
          "@id": `${pageUrl}#app`,
          name: pageTitle,
          description: pageDesc,
          url: pageUrl,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          author: { "@id": `${base}/#jack` },
        }] : []),
        {
          "@type": "BreadcrumbList",
          "@id": `${pageUrl}#breadcrumb`,
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Jack Smyth", item: `${base}/` },
            { "@type": "ListItem", position: 2, name: pageTitle, item: pageUrl },
          ],
        },
      ] : []),
      ...WORKS.filter((w) => w.status === "documented" && w.url && (w.type === "writing" || w.type === "research")).map((w) => {
        const primarySrc = sourceRefs(w.sources).find((s) => s.id !== "s-owner");
        return {
          "@type": "Article",
          headline: w.title,
          url: w.url,
          ...(primarySrc?.publisher ? { publisher: { "@type": "Organization", name: primarySrc.publisher } } : {}),
          ...(primarySrc?.date ? { datePublished: primarySrc.date } : {}),
          ...(w.authors ? { author: w.authors.map((name) => name === "Jack Smyth" ? { "@id": `${base}/#jack` } : { "@type": "Person", name }) } : {}),
        };
      }),
    ],
  };

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(pageDesc)}">
<link rel="canonical" href="${esc(pageUrl)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preload" href="/fonts/spacegrotesk-0640890476.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dmsans-9fea608a94.woff2" as="font" type="font/woff2" crossorigin>
<link rel="alternate" type="text/markdown" href="/index.md"><link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">
<meta property="og:type" content="${view ? "article" : "website"}"><meta property="og:site_name" content="Jack Smyth"><meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(pageDesc)}">
<meta property="og:image" content="${esc(ogImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(pageTitle)}"><meta name="twitter:description" content="${esc(pageDesc)}"><meta name="twitter:image" content="${esc(ogImage)}">
<script nonce="${nonce}" type="application/ld+json">${JSON.stringify(ld)}</script>
<style nonce="${nonce}">
@font-face{font-family:"DM Sans";font-style:normal;font-weight:400 800;font-display:swap;src:url("/fonts/dmsans-9fea608a94.woff2") format("woff2")}
@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:400 700;font-display:swap;src:url("/fonts/spacegrotesk-0640890476.woff2") format("woff2")}
@font-face{font-family:"DM Mono";font-style:normal;font-weight:400;font-display:swap;src:url("/fonts/dmmono-e1896b13b2.woff2") format("woff2")}
:root{color-scheme:light;--bg:#f6f4ee;--fg:#171714;--mut:#626259;--line:#d9d7cf;--acc:#171714;--b1:#626800;--b2:#3f6156;--b3:#696718;--card:#fbfaf6;--surface:#fffefa;--surface-alt:#eeede5;--lemon:#f2f64a;--sans:"DM Sans",ui-sans-serif,system-ui,sans-serif;--display:"Space Grotesk",var(--sans);--mono:"DM Mono",ui-monospace,monospace;--text-heading:clamp(1.75rem,3.4vw,2.75rem);--text-body:1rem;--text-sm:0.875rem;--ease:cubic-bezier(0.22,1,0.36,1)}
:root[data-lens=agent]{color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:84px}
body{margin:0;background:var(--bg);color:var(--fg);font:400 var(--text-body)/1.65 var(--sans);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;overflow-wrap:break-word}
h1,h2,h3,h4{font-family:var(--display);font-weight:600}h1,h2,h3{text-wrap:balance}p{text-wrap:pretty}::selection{background:var(--lemon);color:var(--fg)}
:where(a,code){overflow-wrap:anywhere}
a{color:inherit;text-decoration-color:var(--acc);text-underline-offset:3px}a:hover{color:var(--acc)}
:focus-visible{outline:3px solid var(--b1);outline-offset:3px}
.sk{position:absolute;left:-999px}.sk:focus{left:12px;top:12px;background:var(--b1);color:#000;padding:8px 12px;z-index:9}
header.top{position:sticky;top:0;z-index:5;background:rgba(246,244,238,0);border-bottom:1px solid transparent;transition:background-color 180ms var(--ease),border-color 180ms var(--ease),backdrop-filter 180ms var(--ease)}
header.top[data-scrolled=true]{background:rgba(246,244,238,.94);backdrop-filter:blur(10px);border-bottom-color:var(--line)}
nav{max-width:1180px;margin:auto;padding:14px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;font:500 var(--text-sm) var(--sans)}
nav b{margin-right:auto;font:700 1.375rem var(--display);letter-spacing:-.045em}
nav a{text-decoration:none;color:var(--mut);transition:color 160ms var(--ease)}nav a:hover,nav a.on{color:var(--fg)}
nav a{display:inline-flex;align-items:center;min-height:32px;padding:4px 0}nav b a{color:var(--fg)}.bet-nav{display:flex;gap:22px}.nav-agent{border-bottom:2px solid var(--lemon)}
main{max-width:1180px;margin:auto;padding:0 20px}
.hero{padding:52px 0 36px}
.hero-header{margin-bottom:32px}
.hero h1{font-size:clamp(3rem,6.8vw,5.75rem);line-height:.94;letter-spacing:-.055em;margin:0 0 20px;font-weight:600;max-width:16ch}
.hero h1 em{font-style:normal;color:var(--fg);background:linear-gradient(transparent 66%,var(--lemon) 66%,var(--lemon) 92%,transparent 92%)}
.hero-sub{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}
.hero p.lead{font-size:var(--text-body);max-width:54ch;color:var(--mut);margin:0;line-height:1.65}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.hero-actions a.btn{text-decoration:none}
.circuit-wrap{margin:0;border:1px solid var(--fg);background:var(--surface);border-radius:16px;padding:20px 22px 16px;position:relative}
.circuit-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;font:500 var(--text-sm) var(--sans);color:var(--mut)}
.circuit-title{color:var(--fg);font-weight:600}
.circuit-toggle{background:transparent!important;color:var(--mut)!important;border:1px solid var(--line)!important;padding:6px 12px!important;font:500 0.8125rem var(--sans)!important;border-radius:99px!important;margin:0!important;white-space:nowrap;flex-shrink:0;transition:color 160ms var(--ease),border-color 160ms var(--ease)}
.circuit-toggle:hover{color:var(--fg)!important;border-color:var(--fg)!important}
.circuit-svg{width:100%;height:auto;display:block}
.circuit-svg .wire{fill:none;stroke:#c8c5ba;stroke-width:1.5}
.circuit-svg .wire-active{fill:none;stroke:var(--fg);stroke-width:1.75;stroke-dasharray:6 10}
@media (prefers-reduced-motion:no-preference){.circuit-wrap:not(.paused) .wire-active{animation:circuitFlow 2.6s linear infinite}}
@keyframes circuitFlow{from{stroke-dashoffset:32}to{stroke-dashoffset:0}}
.circuit-svg a{text-decoration:none}.circuit-svg .node rect{fill:var(--bg);stroke:var(--line);stroke-width:1.25;transition:stroke 160ms var(--ease),fill 160ms var(--ease)}
.circuit-svg .node.lead rect{fill:var(--surface);stroke:var(--fg);stroke-width:1.75}.circuit-svg .node.accent rect{fill:var(--lemon);stroke:var(--fg);stroke-width:1.5}
.circuit-svg a:hover .node rect,.circuit-svg a:focus-visible .node rect{stroke:var(--fg);fill:var(--surface)}
.circuit-svg .n-k{font:600 13px var(--sans);fill:var(--mut)}.circuit-svg .n-t{font:700 15px var(--display);fill:var(--fg)}.circuit-svg .n-s{font:500 13px var(--sans);fill:var(--mut)}
.creative-card{margin:0}.creative-card img{width:100%;height:auto;border-radius:10px;display:block;margin-bottom:14px;border:1px solid var(--line)}.creative-card figcaption{font-size:var(--text-sm);line-height:1.5}
.circuit-readout{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font:400 var(--text-sm)/1.5 var(--sans);color:var(--mut);min-height:38px}
.circuit-readout strong{color:var(--fg);font-weight:600}
.lens-switch{display:inline-flex;border:1px solid var(--line);border-radius:99px;padding:2px;background:var(--card);gap:2px}
.lens-switch button{background:transparent!important;color:var(--mut)!important;border:0!important;border-radius:99px!important;padding:5px 12px!important;font:600 0.8125rem var(--sans)!important;margin:0!important;line-height:1.1;transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.lens-switch button[aria-pressed=true]{background:var(--fg)!important;color:var(--lemon)!important}
body[data-lens=agent]{--bg:#11110f;--fg:#f4f3ec;--mut:#a6a59a;--line:#2d2d27;--acc:#f2f64a;--card:#181814;--surface:#161612;--surface-alt:#1b1b16;--b1:#f2f64a;--b2:#7ee0b8;--b3:#e5d96b;background-image:radial-gradient(rgba(242,246,74,.11) 1px,transparent 1px);background-size:22px 22px}
body[data-lens=agent] .ascii-theatre,body[data-lens=agent] .bet-ascii,body[data-lens=agent] .species-pulse,body[data-lens=agent] .mcp-console{background:#151511!important;border-color:rgba(242,246,74,.4)!important}
body[data-lens=agent] .ascii-grid,body[data-lens=agent] .bet-ascii{color:var(--lemon)!important}
body[data-lens=agent] .ascii-whispers{color:rgba(242,246,74,.22)!important}
body[data-lens=agent] .xray-banner{display:flex}
.xray-banner{display:none;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:18px 0 0;padding:10px 14px;border:1px dashed var(--lemon);border-radius:10px;background:rgba(242,246,74,.08);font:500 var(--text-sm)/1.5 var(--mono);color:var(--lemon)}
.xray-banner a{color:#fff;text-decoration:underline}
.cmd-trigger{background:var(--card)!important;color:var(--mut)!important;border:1px solid var(--line)!important;border-radius:8px!important;padding:5px 10px!important;font:600 0.8125rem var(--mono)!important;margin:0!important;line-height:1;min-block-size:30px;transition:color 160ms var(--ease),border-color 160ms var(--ease)}
.cmd-trigger:hover{color:var(--fg)!important;border-color:var(--fg)!important}
.bet-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px 24px;align-items:start}
.bet-head-main{display:flex;gap:18px;align-items:flex-start;min-inline-size:0}
.bet-ascii{margin:0!important;padding:12px 14px!important;border:1px solid var(--line)!important;border-radius:12px!important;background:var(--surface)!important;font:400 var(--text-sm)/1.35 var(--mono)!important;color:var(--b1);min-inline-size:0;max-inline-size:100%;white-space:pre;overflow-x:auto}
#multimodality .bet-ascii{color:var(--b2)}#anticipation .bet-ascii{color:var(--b3)}
.species-pulse{margin:24px 0 0;padding:14px 18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;font:400 var(--text-sm) var(--sans);color:var(--mut)}
.species-pulse strong{color:var(--fg);font-weight:600}.pulse-bar{font-family:var(--mono);letter-spacing:.08em;color:var(--b1);font-weight:700}
.species-pulse a{font-weight:600;color:var(--fg);text-decoration:none}.species-pulse a:hover{text-decoration:underline}
.mcp-console{border:1px solid var(--fg);border-radius:14px;background:var(--surface);padding:22px;margin:22px 0 28px}
.mcp-console-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.mcp-console-top strong{font-family:var(--display);font-size:var(--text-body);font-weight:600}
.mcp-console-btns{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:3px;background:var(--bg);gap:3px;margin-bottom:14px}
.mcp-console-btns button{background:transparent!important;color:var(--mut)!important;border:0!important;border-radius:8px!important;padding:8px 13px!important;font:500 var(--text-sm) var(--mono)!important;margin:0!important;min-block-size:36px;transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.mcp-console-btns button:hover{color:var(--fg)!important}
.mcp-console-btns button[aria-pressed=true]{background:var(--fg)!important;color:var(--lemon)!important}
.mcp-console-badge{font:500 var(--text-sm) var(--mono);color:var(--b1)}
.mcp-console-meta{font:400 var(--text-sm) var(--mono);color:var(--mut);margin-bottom:10px}
.mcp-console pre{max-height:280px;margin:0}
dialog.cmd-palette{padding:0;border:1px solid var(--fg);border-radius:16px;background:var(--card);color:var(--fg);width:min(560px,calc(100vw - 32px));max-height:min(78vh,560px);box-shadow:0 24px 64px rgba(0,0,0,.22)}
dialog.cmd-palette:modal{overscroll-behavior:contain}
dialog.cmd-palette::backdrop{background:rgba(20,20,18,.52);backdrop-filter:blur(3px);overflow:hidden;overscroll-behavior:contain}
dialog.cmd-palette[open]{display:flex;flex-direction:column}
.cmd-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.cmd-head h2{margin:0;font:600 var(--text-sm) var(--sans);color:var(--mut)}
.cmd-head form{margin:0}.cmd-head button{background:transparent!important;color:var(--mut)!important;border:1px solid var(--line)!important;padding:4px 10px!important;font:500 var(--text-sm) var(--sans)!important;margin:0!important;min-block-size:28px}
.cmd-search-wrap{padding:12px 16px;border-bottom:1px solid var(--line)}
.cmd-search-wrap input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);font:400 var(--text-body) var(--sans)}
.cmd-list{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px}
.cmd-item{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left;text-decoration:none;padding:10px 12px;border-radius:10px;border:1px solid transparent;background:transparent!important;color:var(--fg)!important;font:500 var(--text-sm) var(--sans);cursor:pointer;margin:0!important;min-block-size:40px;transition:background-color 140ms var(--ease),border-color 140ms var(--ease)}
.cmd-item:hover,.cmd-item:focus-visible{background:var(--bg)!important;border-color:var(--fg)!important;outline:none}
.cmd-item code{font:500 var(--text-sm) var(--mono);color:var(--mut);background:var(--bg);padding:2px 7px;border-radius:6px;white-space:nowrap}
.cmd-item[hidden]{display:none!important}
body[data-lens=agent] header.top[data-scrolled=true]{background:rgba(17,17,15,.94)}
body[data-lens=agent] .lens-switch button[aria-pressed=true],body[data-lens=agent] .mcp-console-btns button[aria-pressed=true],body[data-lens=agent] .seg-tabs button[aria-pressed=true]{background:var(--lemon)!important;color:#11110f!important}
body[data-lens=agent] .flair-after mark{background:rgba(242,246,74,.22);color:var(--fg)}
body[data-lens=agent] .btn,body[data-lens=agent] button{background:var(--lemon);color:#11110f}
body[data-lens=agent] .btn.ghost,body[data-lens=agent] button.secondary{background:transparent;color:var(--fg);border-color:var(--line)}
body[data-lens=agent] .hero h1 em{color:#11110f;background:var(--lemon);padding:0 6px}
body[data-lens=agent] .circuit-wrap,body[data-lens=agent] .work-cta .surface,body[data-lens=agent] .gb-panel,body[data-lens=agent] .experiment .split>article:nth-child(2){background:var(--surface);border-color:var(--lemon)}
body[data-lens=agent] .ask,body[data-lens=agent] .claims li.synthesis,body[data-lens=agent] pre,body[data-lens=agent] code,body[data-lens=agent] .experiment .split>article:first-child{background:var(--surface-alt)}
body[data-lens=agent] .ask input,body[data-lens=agent] .experiment input:not([type=checkbox]),body[data-lens=agent] .experiment textarea{background:var(--bg);color:var(--fg);border-color:#3a3a32}
body[data-lens=agent] .circuit-svg .node rect{fill:#181814;stroke:#3d3d35}
body[data-lens=agent] .circuit-svg .node.lead rect{fill:#1f1f18;stroke:var(--lemon)}
body[data-lens=agent] .circuit-svg .node.accent rect{fill:var(--lemon);stroke:var(--lemon)}
body[data-lens=agent] .circuit-svg .n-t{fill:#f4f3ec}body[data-lens=agent] .circuit-svg .n-k,body[data-lens=agent] .circuit-svg .n-s{fill:#a6a59a}
body[data-lens=agent] .circuit-svg .node.accent .n-t,body[data-lens=agent] .circuit-svg .node.accent .n-k,body[data-lens=agent] .circuit-svg .node.accent .n-s{fill:#11110f}
body[data-lens=agent] .circuit-svg .wire{stroke:#3a3a32}body[data-lens=agent] .circuit-svg .wire-active{stroke:var(--lemon)}
body[data-lens=agent] [data-agent-spec]::before{content:"[ AGENT X-RAY ]  " attr(data-agent-spec);display:block;font:500 var(--text-sm)/1.5 var(--mono);color:var(--lemon);border:1px dashed rgba(242,246,74,.45);background:rgba(242,246,74,.06);padding:7px 12px;border-radius:8px;margin-bottom:18px;letter-spacing:.02em;overflow-wrap:anywhere}
.sans,.tag,.wt,nav,.btn,button,small{font-family:var(--sans)}code,pre{font-family:var(--mono)}
.ask{margin:40px 0 0;border:1px solid var(--line);border-radius:14px;padding:24px;background:var(--surface-alt)}
.ask h2{margin:0 0 6px;font-size:var(--text-body);font-weight:700}.ask p{margin:0 0 14px;color:var(--mut);max-width:65ch}
.ask form{display:flex;gap:10px;flex-wrap:wrap}
.ask input{flex:1 1 280px;min-width:0;background:var(--surface);color:var(--fg);border:1px solid #bab8ad;border-radius:8px;padding:13px 16px;font:400 var(--text-body) var(--sans)}
.btn,button{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:13px 20px;font-weight:600;font-size:var(--text-sm);cursor:pointer;transition:opacity 160ms var(--ease),background-color 160ms var(--ease),color 160ms var(--ease),border-color 160ms var(--ease)}
.btn:hover,button:hover{opacity:.9}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
#answer{margin-top:16px;display:none}#answer .hit{border-top:1px solid var(--line);padding:12px 0}#answer small{color:var(--mut);font-size:var(--text-sm)}
.intro{padding:56px 0 8px}.intro h2{font-size:var(--text-heading);letter-spacing:-.03em;line-height:1.1;margin:0 0 14px}
.intro>p{color:var(--mut);max-width:65ch;margin:0 0 18px}
.bet{padding:72px 0;border-top:1px solid var(--line);margin-top:40px}
.num{font:600 var(--text-heading)/1 var(--display);letter-spacing:-.04em}
#differentiation .num,#differentiation h3{color:var(--b1)}#multimodality .num,#multimodality h3{color:var(--b2)}#anticipation .num,#anticipation h3{color:var(--b3)}
.bet h2{font-size:var(--text-heading);margin:0;letter-spacing:-.03em;line-height:1.05}.bet .q{margin:6px 0 0;color:var(--mut);font-size:var(--text-body)}
.thesis{font-size:var(--text-body);font-weight:500;line-height:1.65;max-width:62ch;margin:24px 0 32px;color:var(--fg)}
.bet-lead-split{display:grid;grid-template-columns:1fr 1.15fr;gap:32px;align-items:start;margin:24px 0 40px}
.bet-lead-split .thesis{margin:0}
.bet-lead-split .spotlight{margin:0}
.bet-workbench-split{display:grid;grid-template-columns:1fr 1.15fr;gap:32px;align-items:start;margin:0 0 40px}
.bet-workbench-split .spotlight{margin:0}
.bet-workbench-split .claims-grid{grid-template-columns:1fr}
.bet-bands{display:flex;flex-direction:column;gap:40px}
.bet h3{font:600 var(--text-body) var(--display);margin:0 0 16px}
ul{list-style:none;padding:0;margin:0}
.claims-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 32px}
.claims li{padding:14px 0;border-top:1px solid var(--line)}.claims p{margin:4px 0 6px;font-size:var(--text-body);max-width:65ch}.claims small{color:var(--mut);font-size:var(--text-sm)}
.claims li.synthesis{border-left:2px solid var(--b1);padding:14px 16px;background:var(--surface-alt);border-radius:0 10px 10px 0}
.claim-kind{display:block;font-size:var(--text-sm);font-weight:600;color:var(--mut);margin-bottom:4px}
.claim-kind.syn{color:var(--b1)}
.work-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(310px,100%),1fr));gap:16px}
.work li{border:1px solid var(--line);border-radius:14px;padding:18px;background:var(--card);display:grid;grid-row:span 4;grid-template-rows:auto auto 1fr auto;grid-template-rows:subgrid;gap:8px;min-inline-size:0}
.work li.pending-details{border-style:dashed;opacity:.85}
.work-kicker{display:flex;align-items:center;justify-content:space-between;gap:8px}
.work-meta{font-size:var(--text-sm);font-weight:500;color:var(--mut)}
.work h4,.briefs h4{margin:0;font-size:var(--text-body);font-weight:600;line-height:1.35}.work p,.briefs p{margin:0;font-size:var(--text-body);color:var(--mut);line-height:1.55}
.work-foot{display:flex;flex-direction:column;gap:4px;padding-top:10px;border-top:1px solid var(--line)}
.work-foot .prov{font:400 var(--text-sm)/1.45 var(--sans);color:var(--mut)}
.wt{font-size:var(--text-sm);font-weight:600;color:var(--mut)}
.briefs{margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));gap:16px}.briefs li{padding:14px 0;border-top:1px solid var(--line)}
.work small,.work em{font-size:var(--text-sm);color:var(--mut)}
#mcp{padding:72px 0;border-top:1px solid var(--line)}
#mcp h2{font-size:var(--text-heading);margin:0 0 12px;letter-spacing:-.03em}
#mcp h3{font-size:var(--text-body);font-weight:600;margin:24px 0 8px}
pre{background:var(--surface-alt);border:1px solid var(--line);border-radius:10px;padding:16px;overflow:auto;font-size:var(--text-sm);line-height:1.6;margin:10px 0}
code{background:var(--surface-alt);padding:2px 6px;border-radius:5px;font-size:.9em}pre code{background:none;padding:0}
.tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin:18px 0}
.tools div{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--card);font-size:var(--text-sm);color:var(--mut)}.tools b{display:block;color:var(--fg);font:600 var(--text-sm) var(--mono);margin-bottom:4px}
.rules{color:var(--mut);max-width:65ch}
.spotlight{border:1px solid var(--line);border-left:4px solid var(--lemon);border-radius:14px;background:var(--card);padding:26px;margin:0 0 36px}
.spotlight.spotlight-stage{display:grid;grid-template-columns:1.25fr auto;gap:24px;align-items:center;background:var(--surface-alt);border-left-color:var(--b2)}
.spotlight h3{font-family:var(--display);font-size:var(--text-heading)!important;letter-spacing:-.035em!important;line-height:1.1!important;margin:0 0 10px!important;color:var(--fg)!important}
.spotlight p{max-width:60ch;margin:0 0 14px}.spotlight .btn{display:inline-block;text-decoration:none;color:#fff;margin:4px 0 0}
.spotlight small{display:block;color:var(--mut);margin-top:14px;font-size:var(--text-sm)}
.spotlight-bar{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:20px}
.spotlight-bar p{margin:0;color:var(--mut)}
.seg-tabs{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:3px;background:var(--bg);gap:3px}
.seg-tabs button{background:transparent!important;color:var(--mut)!important;border:0!important;border-radius:8px!important;padding:7px 13px!important;font:600 var(--text-sm) var(--sans)!important;margin:0!important;min-block-size:34px;transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.seg-tabs button:hover{color:var(--fg)!important}
.seg-tabs button[aria-pressed=true]{background:var(--fg)!important;color:var(--lemon)!important}
.flair-panel[hidden],.mm-panel[hidden],.lb-panel[hidden]{display:none!important}
.spotlight-mm{border-left-color:var(--b2);background:var(--surface-alt)}
.mm-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;align-items:start}
.mm-media{display:flex;flex-direction:column;gap:12px;min-width:0}
.mm-poster{position:relative;display:block;border-radius:12px;overflow:hidden;border:1px solid var(--fg);text-decoration:none;background:#11110f}
.mm-poster img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;transition:transform 200ms var(--ease)}
.mm-poster:hover img{transform:scale(1.02)}
.mm-play{position:absolute;left:14px;bottom:14px;background:rgba(17,17,15,.88);color:var(--lemon);padding:7px 13px;border-radius:8px;font:600 var(--text-sm) var(--sans);border:1px solid rgba(242,246,74,.45)}
.mm-signals{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--b2);border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:10px;min-width:0}
.mm-panel{display:flex;flex-direction:column;gap:10px}
.mm-panel h4{margin:0;font-size:var(--text-body);font-weight:600;color:var(--fg)}
.mm-panel p{margin:0;font-size:var(--text-body);line-height:1.6;max-width:none}
.mm-muted{color:var(--mut);font-size:var(--text-sm)!important}
.mm-nuggets{display:flex;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none}
.mm-nuggets li{font-size:var(--text-sm);line-height:1.55;color:var(--mut);padding-top:10px;border-top:1px solid var(--line)}
.mm-nuggets li:first-child{border-top:0;padding-top:0}
.mm-nuggets strong{color:var(--fg);font-weight:600}
.mm-nuggets a{font-family:var(--mono);color:var(--b2);text-decoration:none;margin-right:6px;white-space:nowrap}
.mm-nuggets a:hover{text-decoration:underline}
.flair-compare{display:grid;grid-template-columns:1fr 1.15fr;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
.flair-col{padding:20px 22px;display:flex;flex-direction:column;gap:10px;min-width:0}
.flair-before{background:var(--surface-alt)}
.flair-after{background:var(--surface);border-left:3px solid var(--lemon)}
.flair-col-label{font:600 var(--text-sm) var(--sans);color:var(--mut)}
.flair-col h4{margin:0;font-size:var(--text-body);font-weight:600;line-height:1.35;color:var(--fg)}
.flair-col p{margin:0;font-size:var(--text-body);line-height:1.6;max-width:none}
.flair-before .flair-excerpt{color:var(--mut);white-space:pre-line}
.flair-after mark{background:rgba(242,246,74,.45);color:var(--fg);padding:0 2px;border-radius:3px}
.flair-facts{font-size:var(--text-sm)!important;color:var(--mut);padding-top:10px;border-top:1px solid var(--line)}
.flair-facts strong{color:var(--fg);font-weight:600}
.flair-col small{margin-top:auto;color:var(--mut);font-size:var(--text-sm)}
.spotlight-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:20px}
.spotlight-foot small{margin-top:0}
.spotlight-lb .seg-tabs{margin:4px 0 18px}
.lb-row{padding:14px 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.lb-row strong{font-family:var(--display);font-size:var(--text-body);font-weight:600;color:var(--fg)}
.lb-row p{margin:0;color:var(--mut);font-size:var(--text-body);line-height:1.55}
.lb-row.lb-diverge p{color:var(--fg)}
.lb-label{font:600 var(--text-sm) var(--sans);color:var(--b3)}
.lb-row small{margin-top:4px;color:var(--mut);font-size:var(--text-sm)}
summary{cursor:pointer;font:600 var(--text-sm) var(--sans);padding:14px 0;color:var(--mut)}
.system{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:28px 0 44px}.system a{padding:18px 0;border-top:1px solid var(--line);text-decoration:none;transition:border-color 160ms var(--ease)}.system a:hover{border-top-color:var(--fg)}.system b{display:block;font-family:var(--display);font-size:var(--text-body);font-weight:600;margin-bottom:4px}.system small{color:var(--mut);font-size:var(--text-sm)}
.experiment{--tone:var(--b1);padding:38px 0 70px}.experiment[data-experiment=leaderbored]{--tone:var(--b3)}.experiment[data-experiment=field-lab]{--tone:var(--b2)}
.fieldlab-grid{display:grid;grid-template-columns:1fr;gap:20px;margin:22px 0}.fieldlab-pitch h3{margin:6px 0 10px}
.glassbox{margin:28px 0 16px}.gb-rail{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:0 0 16px}
.gb-node{text-align:left;background:var(--card)!important;color:var(--fg)!important;border:1px solid var(--line)!important;border-radius:12px;padding:14px;margin:0!important;cursor:pointer;transition:border-color .15s,background .15s}
.gb-node:hover{border-color:var(--fg)!important}.gb-node[aria-selected=true]{border-color:var(--fg)!important;background:var(--surface)!important;box-shadow:inset 0 -3px 0 var(--lemon)}
.gb-node .gb-step{display:block;font:600 var(--text-sm) var(--mono);color:var(--tone);margin-bottom:4px}
.gb-node strong{display:block;font:600 var(--text-body) var(--display);letter-spacing:-.02em;margin-bottom:2px}
.gb-node span.gb-sub{display:block;font:400 var(--text-sm)/1.35 var(--sans);color:var(--mut)}
.gb-panel{border:1px solid var(--fg);background:var(--surface);border-radius:16px;padding:26px}.gb-panel[hidden]{display:none!important}
.gb-meta{display:flex;flex-wrap:wrap;gap:8px 18px;margin:14px 0;padding-top:12px;border-top:1px solid var(--line)}.gb-meta span{font:500 var(--text-sm) var(--mono);color:var(--mut)}
.gb-sub-block{padding-top:14px;border-top:1px solid var(--line)}
.gb-sub-block strong{display:block;font-family:var(--display);font-size:var(--text-body);font-weight:600;margin-bottom:6px}
.rubric-row{display:grid;grid-template-columns:180px 1fr 54px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font:400 var(--text-sm) var(--sans)}
.rubric-meter{width:100%;height:10px;accent-color:var(--b2)}.cap-track{display:grid;grid-template-columns:10fr 85fr 5fr;gap:3px;height:14px;margin:14px 0 8px}
.cap-seg{border-radius:4px}.cap-seg.day{background:var(--b2)}.cap-seg.run{background:#d7d5cc}.cap-seg.stop{background:var(--lemon);border:1px solid var(--fg)}
.gb-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px}
.swarm-arena,.live-tracker{margin:34px 0 24px}
.swarm-controls,.tracker-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.swarm-steps{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:3px;background:var(--bg);gap:3px;margin:16px 0 14px}
.swarm-step-btn{background:transparent!important;color:var(--mut)!important;border:0!important;border-radius:8px!important;padding:8px 14px!important;min-block-size:36px;font:600 var(--text-sm) var(--sans)!important;cursor:pointer;margin:0!important;transition:color 160ms var(--ease),background-color 160ms var(--ease)}
.swarm-step-btn:hover{color:var(--fg)!important}
.swarm-step-btn[aria-pressed=true]{background:var(--fg)!important;color:var(--lemon)!important}
body[data-lens=agent] .swarm-step-btn[aria-pressed=true]{background:var(--lemon)!important;color:#11110f!important}
.swarm-step-btn .sym{color:var(--tone);margin-right:4px}.swarm-step-btn[aria-pressed=true] .sym{color:inherit}
.swarm-stage{border:1px solid var(--fg)!important;background:var(--surface)!important}
.ascii-theatre{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:linear-gradient(135deg,#f8f9fc 0%,#f5f3ec 55%,#eef2f9 100%);margin-bottom:20px;padding:18px 20px 12px}
.ascii-whispers{position:absolute;inset:0;pointer-events:none;font:500 11.5px var(--mono);color:rgba(38,67,138,.22);user-select:none}
.ascii-whispers span{position:absolute;white-space:nowrap}
.ascii-whispers .w1{top:10%;left:62%}.ascii-whispers .w2{top:24%;left:78%}.ascii-whispers .w3{top:38%;left:68%}
.ascii-whispers .w4{top:14%;left:36%}.ascii-whispers .w5{top:56%;left:72%}.ascii-whispers .w6{top:72%;left:60%}
.ascii-whispers .w7{top:82%;left:76%}.ascii-whispers .w8{top:30%;left:48%}.ascii-whispers .w9{top:68%;left:38%}.ascii-whispers .w10{top:84%;left:18%}
.ascii-grid{position:relative;z-index:1;margin:0;padding:0;background:transparent!important;border:none!important;font:500 12.5px/1.28 var(--mono);color:#2c4d9b;letter-spacing:.04em;overflow-x:auto;white-space:pre}
.ascii-hud{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding-top:10px;border-top:1px dashed rgba(44,77,155,.22);font:500 var(--text-sm) var(--mono);color:var(--mut)}
@keyframes fl-drift{0%,100%{transform:translateX(0);opacity:.22}50%{transform:translateX(10px);opacity:.42}}
@media (prefers-reduced-motion:no-preference){
  .ascii-whispers span{animation:fl-drift 7s ease-in-out infinite}
  .ascii-whispers .w2,.ascii-whispers .w5,.ascii-whispers .w8{animation-delay:-2.3s}
  .ascii-whispers .w3,.ascii-whispers .w6,.ascii-whispers .w9{animation-delay:-4.6s}
}
.swarm-pane[hidden]{display:none!important}
.swarm-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:14px;margin-bottom:16px;border-bottom:1px solid var(--line);font:600 var(--text-sm) var(--mono)}
.swarm-badge{color:var(--fg);letter-spacing:.04em}.swarm-clock{color:var(--mut)}
.token-stream{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 16px}
.tok{display:inline-flex;align-items:center;font:500 var(--text-sm) var(--mono);padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}
.tok-arrow{border:none;background:transparent;color:var(--tone);font-weight:700;padding:0 4px}
.tok-out{background:var(--lemon);border-color:var(--fg);font-weight:700}
.swarm-lanes{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:8px 0}
.swarm-lane{border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--bg);display:flex;flex-direction:column;gap:6px}
.lane-id{font:700 var(--text-sm) var(--display);color:var(--fg);margin-bottom:4px}
.swarm-lane code{display:block;font:400 var(--text-sm)/1.45 var(--mono);background:var(--surface);border:1px solid var(--line);padding:4px 8px;border-radius:6px}
.swarm-debate{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.swarm-debate li{display:grid;grid-template-columns:150px 1fr auto;gap:12px;align-items:baseline;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);font-size:var(--text-sm)}
.swarm-debate li.judge-line{border-color:var(--fg);background:var(--surface);box-shadow:inset 4px 0 0 var(--lemon)}
.deb-who{font:700 var(--text-sm) var(--mono);color:var(--fg)}.deb-say{color:var(--fg);line-height:1.45}
.deb-delta{font:600 var(--text-sm) var(--mono);white-space:nowrap}
.deb-delta.pos{color:#14532d}
.deb-delta.warn{color:#78350f}
.deb-delta.win{color:var(--fg);background:var(--lemon);padding:2px 8px;border-radius:6px}
.logit-board{display:flex;flex-direction:column;gap:10px;margin:8px 0 16px}
.logit-row{display:grid;grid-template-columns:180px 1fr 64px 96px;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);font:400 var(--text-sm) var(--mono)}
.logit-row.is-winner{border-color:var(--fg);background:var(--surface);box-shadow:inset 4px 0 0 var(--lemon)}
.logit-team{font-weight:700;color:var(--fg)}.logit-score{text-align:right;font-weight:700}
.logit-tag{font-size:var(--text-sm);text-align:right;color:var(--mut)}
.logit-row.is-winner .logit-tag{color:var(--fg);font-weight:700}
.handoff-strip{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:600 var(--text-sm) var(--mono);padding:10px 14px;border-radius:10px;background:var(--fg);color:var(--surface)}
body[data-lens=agent] .handoff-strip{background:var(--surface-alt);color:var(--fg);border:1px solid var(--line)}
body[data-lens=agent] .deb-delta.pos{color:#7ee0b8}body[data-lens=agent] .deb-delta.warn{color:#e5d96b}body[data-lens=agent] .deb-delta.win{color:#11110f}
.handoff-strip span[aria-hidden=true]{color:var(--lemon)}
@keyframes fl-rise{from{opacity:.85;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes fl-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:no-preference){
  .swarm-pane:not([hidden]) .tok{animation:fl-rise .18s var(--ease) backwards}
  .swarm-pane:not([hidden]) .tok.t2{animation-delay:.04s}
  .swarm-pane:not([hidden]) .tok.t3{animation-delay:.08s}
  .swarm-pane:not([hidden]) .tok.t4{animation-delay:.12s}
  .swarm-pane:not([hidden]) .tok.t5{animation-delay:.16s}
  .swarm-pane:not([hidden]) .tok-out{animation-delay:.20s}
  .swarm-pane:not([hidden]) .swarm-debate li{animation:fl-rise .2s var(--ease) backwards}
  .swarm-pane:not([hidden]) .swarm-debate li.d2{animation-delay:.06s}
  .swarm-pane:not([hidden]) .swarm-debate li.d3{animation-delay:.12s}
  .swarm-pane:not([hidden]) .swarm-debate li.d4{animation-delay:.18s}
  .pulse-dot{animation:fl-pulse 2.4s ease-in-out infinite}
}
.stage-pill{display:inline-flex;align-items:center;gap:8px;font:600 var(--text-sm) var(--sans);color:var(--fg)}
.sync-badge{display:inline-flex;align-items:center;gap:4px;font:500 var(--text-sm) var(--mono);color:var(--mut);padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:var(--bg)}
.sync-badge.sync-stale{color:#78350f;border-color:#d97706;background:#fef3c7}
body[data-lens=agent] .sync-badge.sync-stale{color:#fde68a;border-color:#d97706;background:rgba(217,119,6,.16)}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:var(--b2);display:inline-block}
.stage-live .pulse-dot{background:#15803d}
.tracker-card{border:1px solid var(--fg)!important;background:var(--surface)!important}
.tracker-summary{display:grid;grid-template-columns:1.35fr 1fr;gap:20px;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--line)}
.spend-box{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px}
.spend-nums strong{font:700 var(--text-heading) var(--display);letter-spacing:-.03em}
.table-wrap{overflow-x:auto;margin:18px 0}
.tracker-table{width:100%;border-collapse:collapse;font:400 var(--text-sm) var(--sans)}
.tracker-table caption{text-align:left;font:500 var(--text-sm) var(--sans);color:var(--mut);margin-bottom:10px}
.tracker-table th,.tracker-table td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;font-variant-numeric:tabular-nums}
.tracker-table thead th{font:600 var(--text-sm) var(--sans);color:var(--mut);background:var(--bg)}
.tracker-table tbody th{font-weight:600;color:var(--fg)}
.bayes-banner{padding:14px 16px;border-radius:12px;background:var(--bg);border-left:4px solid var(--lemon);margin-top:8px}
.bayes-banner p{margin:4px 0 6px;font-weight:600}
.next-roadmap{margin-top:22px}.next-roadmap h3{margin:0 0 12px}
.next-chain{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.next-chain li{border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--card);display:flex;flex-direction:column;gap:6px}
.next-step{font:600 var(--text-sm) var(--mono);color:var(--tone)}
.next-chain strong{font:600 var(--text-body) var(--display);color:var(--fg)}
.next-chain p{margin:0}
:where(.swarm-step-btn,.swarm-toggle,#fl-refresh-live):focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.work-cta{border-top:1px solid var(--line);padding:64px 0 40px;margin-top:40px}
.work-cta .surface{border:1px solid var(--fg);background:var(--surface);border-radius:16px;padding:32px;display:grid;grid-template-columns:1.4fr auto;gap:24px;align-items:center}
.work-cta h2{font-size:var(--text-heading);letter-spacing:-.03em;margin:0 0 10px;line-height:1.08}
.work-cta p{margin:0;color:var(--mut);max-width:58ch}.work-cta .actions{display:flex;gap:10px;flex-wrap:wrap}.work-cta a.btn{text-decoration:none}
@media (max-width:820px){.bet-lead-split,.bet-workbench-split,.spotlight.spotlight-stage,.flair-compare,.mm-grid{grid-template-columns:1fr;gap:20px}.flair-compare{gap:0}.flair-after{border-left:0;border-top:3px solid var(--lemon)}.gb-rail{grid-template-columns:1fr 1fr}.gb-cols,.work-cta .surface,.swarm-lanes,.tracker-summary,.next-chain,.claims-grid{grid-template-columns:1fr}.rubric-row{grid-template-columns:1fr 1fr 48px}.swarm-debate li,.logit-row{grid-template-columns:1fr;gap:6px}}
.crumb{font:500 var(--text-sm) var(--sans);display:flex;gap:12px;color:var(--mut);margin-bottom:32px;flex-wrap:wrap}.crumb a{text-decoration:none}.eyebrow{font:600 var(--text-sm) var(--sans);color:var(--tone);margin-bottom:12px}
.experiment h1{font-size:clamp(2.75rem,6.5vw,5rem);line-height:1.02;letter-spacing:-.04em;max-width:15ch;margin:10px 0 24px}.experiment .deck{color:var(--mut);font-size:var(--text-body);max-width:56ch}
.experiment .context{max-width:65ch;border-left:2px solid var(--tone);padding:0 0 0 20px;margin:24px 0 34px;font-size:var(--text-body)}.context small{display:block;color:var(--mut);font-size:var(--text-sm)}
.experiment h2{font-size:var(--text-heading);line-height:1.12;letter-spacing:-.025em;margin:0 0 14px}.experiment h3{font-size:var(--text-body);font-weight:600;line-height:1.3;margin:0 0 14px}.experiment section{scroll-margin-top:130px;margin-top:54px}
.experiment .section-top{display:flex;justify-content:space-between;align-items:baseline;gap:20px;flex-wrap:wrap}.section-top p{color:var(--mut);max-width:55ch}.experiment .section-no{font:600 var(--text-sm) var(--mono);color:var(--tone)}
.experiment .surface{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:26px;min-width:0}
.experiment .split{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:22px 0}.experiment .source-copy{white-space:pre-line;color:var(--mut);font-size:var(--text-body)}.experiment .reframed{font-size:var(--text-body);line-height:1.75}.experiment mark{background:rgba(255,210,63,.13);color:var(--fg);border-bottom:1px solid var(--tone)}
.experiment .quiet{font:400 var(--text-sm)/1.6 var(--sans);color:var(--mut)}.experiment .fine{font:400 var(--text-sm)/1.6 var(--sans);color:var(--mut)}.experiment .muted{color:var(--mut)}
.experiment .picker{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:3px;background:var(--bg);gap:3px;margin:22px 0}.experiment .picker button{background:transparent;border:0;color:var(--mut);padding:8px 13px;border-radius:8px;font-size:var(--text-sm);margin:0;transition:background-color 160ms var(--ease),color 160ms var(--ease)}.experiment .picker button[aria-pressed=true]{background:var(--fg);color:var(--lemon)}
.experiment .picker a{display:block;text-decoration:none;border:0;color:var(--mut);padding:8px 13px;border-radius:8px;font:600 var(--text-sm) var(--sans);transition:background-color 160ms var(--ease),color 160ms var(--ease)}.experiment .picker a:hover{color:var(--fg)}.experiment .picker a[aria-current=true]{background:var(--fg);color:var(--lemon)}
body[data-lens=agent] .experiment .picker a[aria-current=true],body[data-lens=agent] .experiment .picker button[aria-pressed=true]{background:var(--lemon);color:#11110f}
.tag{font:600 var(--text-sm) var(--sans);color:var(--mut)}
.experiment label.field{display:block;font:600 var(--text-sm) var(--sans);margin:18px 0 8px}.experiment input:not([type=checkbox]),.experiment textarea,.experiment select{width:100%;background:var(--surface);border:1px solid #bab8ad;color:var(--fg);padding:14px;border-radius:10px;font:400 var(--text-body) var(--sans);min-width:0}.experiment textarea{min-height:150px;resize:vertical}
.experiment button{background:var(--fg);color:#fff;margin:10px 0}.experiment button.secondary{background:transparent;border:1px solid var(--line);color:var(--fg)}button:disabled{opacity:.45;cursor:wait}
.experiment .actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.experiment .actions a.btn{background:var(--fg);color:#fff;display:inline-block;text-decoration:none;margin:10px 0}.experiment .notice{font:400 var(--text-sm)/1.65 var(--sans);padding:14px 18px;border:1px solid var(--line);border-left:3px solid var(--tone);border-radius:8px;margin:18px 0;overflow-wrap:anywhere}.experiment .notice.error{border-left-color:#ff7966}
.experiment .facts{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}.experiment .facts span{font:500 var(--text-sm) var(--sans);color:var(--mut)}
.experiment .reasons{counter-reset:reason}.experiment .reasons li{padding:12px 0;border-top:1px solid var(--line);font-size:var(--text-body)}.experiment .reasons b{font-weight:600;color:var(--tone)}
.experiment .split>article:first-child{background:var(--surface-alt)}.experiment .split>article:nth-child(2){border-color:var(--fg);background:var(--surface)}
.experiment .method{max-width:65ch}.experiment .method p{color:var(--mut);font-size:var(--text-body)}.experiment .next{margin-top:65px;border-top:1px solid var(--line);padding:28px 0;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}.experiment .next a{font-size:var(--text-body);font-weight:600}
.experiment .theme{border-top:1px solid var(--line);padding:18px 0}.experiment .theme strong{display:block;font-size:var(--text-body)}.experiment .theme p{margin:6px 0;color:var(--mut);font:400 var(--text-sm)/1.6 var(--sans)}.experiment .price{font-size:var(--text-heading);line-height:1.1;letter-spacing:-.03em}.experiment .price small{font:400 var(--text-sm) var(--sans);letter-spacing:0;color:var(--mut)}.experiment .check{display:flex;gap:12px;font:400 var(--text-sm)/1.6 var(--sans);margin:20px 0}.experiment .check input{width:20px;height:20px;flex:0 0 20px}
.experiment .gates li{padding:15px 0;border-top:1px solid var(--line);font:400 var(--text-sm)/1.6 var(--sans)}.experiment .gates b{display:block}.experiment [hidden]{display:none!important}.experiment .agent-box{margin-top:35px}
.copy{margin-left:8px;padding:6px 12px;font-size:var(--text-sm)}
footer{border-top:1px solid var(--line);padding:48px 20px 80px;max-width:1180px;margin:auto;color:var(--mut);font-size:var(--text-sm)}
footer h3{font:600 var(--text-sm) var(--display);color:var(--fg);margin:18px 0 8px}footer li{margin:4px 0}
@media (max-width:820px){html{scroll-padding-top:116px}.tiles{grid-template-columns:1fr}.cols{grid-template-columns:1fr;gap:28px}.bet{padding:48px 0;margin-top:24px}.bet-head{grid-template-columns:minmax(0,1fr);gap:14px}.bet-head-main{gap:14px}.bet-ascii{inline-size:100%;font-size:0.8125rem!important}.thesis{margin:18px 0 24px}.spotlight{padding:18px;margin-bottom:24px}.flair-col,.mm-signals,.mcp-console{padding:16px}.hero{padding-top:32px}.hero-sub{flex-direction:column;align-items:flex-start}nav{padding:10px 16px;gap:6px 12px}nav b{width:auto}.cmd-trigger{display:none}.bet-nav{order:3;width:100%;justify-content:space-between;gap:8px;font-size:0.8125rem}.nav-agent{font-size:0.8125rem}.system{grid-template-columns:1fr;gap:0}.experiment .split{grid-template-columns:1fr}.experiment .surface{padding:20px}.experiment{padding-top:26px}.circuit-wrap{padding:16px}}
@media (pointer:coarse){nav a{min-block-size:40px}.lens-switch button{min-block-size:36px}.seg-tabs button,.mcp-console-btns button,.swarm-step-btn,.circuit-toggle{min-block-size:44px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
</style></head>
<body>
<a class="sk" href="#main">Skip to content</a>
<header class="top"><nav aria-label="Primary"><b><a href="/">Jack Smyth</a></b>
<div class="bet-nav"><a href="/experiments/field-lab">Field Lab</a><a href="/#differentiation">Differentiation</a><a href="/#multimodality">Multimodality</a><a href="/#anticipation">Anticipation</a></div>
<div class="lens-switch" role="group" aria-label="View lens"><button type="button" data-lens-btn="human" aria-pressed="true">Human</button><button type="button" data-lens-btn="agent" aria-pressed="false">Agent</button></div>
<button type="button" class="cmd-trigger" id="cmd-open" aria-label="Open command palette">⌘K</button>
<a class="nav-agent" href="/#mcp">MCP</a></nav></header>
<main id="main" tabindex="-1">
<div class="xray-banner" aria-hidden="true"><span>[ AGENT X-RAY ]  Dual-audience surface · Clean Markdown at /llms.txt · JSON-LD: Person + ProfilePage + Dataset · 7 Read-Only MCP Tools</span><a href="/llms.txt">Inspect /llms.txt ↗</a></div>
${view ? view.body : `
<section class="hero" data-agent-spec="ENTITY: schema.org/Person + Dataset · DISCOVERY: /llms.txt · /.well-known/agent-card.json · /mcp">
<div class="hero-header">
  <h1>Make it for humans. Prove it to <em>agents</em>.</h1>
  <div class="hero-sub">
    <p class="lead">Three bets on differentiation, multimodality, and anticipation, tested monthly on an A$100 Google Ads grant and inspectable by both audiences.</p>
    <div class="hero-actions">
      <a class="btn" href="/experiments/field-lab">Inspect the Field Lab →</a>
    </div>
  </div>
</div>
<figure class="circuit-wrap" id="signal-circuit">
  <div class="circuit-head">
    <span class="circuit-title">Agentic Field Lab · Cycle 01 · A$100/mo media grant</span>
    <button type="button" class="circuit-toggle" id="circuit-motion-btn">Pause motion</button>
  </div>
  <svg class="circuit-svg" viewBox="0 0 960 228" role="group" aria-label="Interactive schematic of the Agentic Field Lab: Industry Pulse branches into three competing agent teams (Differentiation, Multimodality, Anticipation) pitching for a A$100 monthly media grant, converges at the Calibrated Judge and Google Ads spend breaker, and publishes open CMO evidence.">
    <!-- Static guide rails (left-to-right horizontal flow) -->
    <path class="wire" d="M236 114 H284 M284 42 V186 M284 42 H324 M284 114 H324 M284 186 H324 M616 42 H656 M616 114 H656 M616 186 H656 M656 42 V186 M656 114 H700"/>
    <!-- Animated signal paths -->
    <path class="wire-active" d="M236 114 H284 V42 H324 M616 42 H656 V114 H700"/>
    <path class="wire-active" d="M284 114 H324 M616 114 H656"/>
    <path class="wire-active" d="M284 114 V186 H324 M616 186 H656 V114"/>

    <!-- Node 0: Industry Pulse -->
    <a href="/experiments/field-lab#under-the-hood" data-circuit-info="Industry Pulse: gemini-4-hydrogen + Google Search Grounding sets the monthly CMO brief automatically.">
      <g class="node">
        <rect x="12" y="72" width="224" height="84" rx="12"/>
        <text class="n-k" x="124" y="96" text-anchor="middle">Industry Pulse</text>
        <text class="n-t" x="124" y="118" text-anchor="middle">Search &amp; Trends Scout</text>
        <text class="n-s" x="124" y="138" text-anchor="middle">Monthly CMO brief</text>
      </g>
    </a>

    <!-- Node 1: Team Differentiation (Cycle 01 Winner) -->
    <a href="/#differentiation" data-circuit-info="Team Differentiation (81/100 ★): Independent Benchmark vs. Vendor Case Study on Demand Gen (A$100 AUD).">
      <g class="node lead">
        <rect x="324" y="12" width="292" height="60" rx="12"/>
        <text class="n-t" x="342" y="38">Differentiation</text>
        <text class="n-k" x="598" y="38" text-anchor="end">81/100 ★</text>
        <text class="n-s" x="342" y="57">Demand Gen · Benchmark vs. case study</text>
      </g>
    </a>

    <!-- Node 2: Team Multimodality -->
    <a href="/#multimodality" data-circuit-info="Team Multimodality (78/100): Multimodal YouTube Shorts proof vs. standard claim ad (gemini-omni-1.2-flash).">
      <g class="node">
        <rect x="324" y="84" width="292" height="60" rx="12"/>
        <text class="n-t" x="342" y="110">Multimodality</text>
        <text class="n-k" x="598" y="110" text-anchor="end">78/100</text>
        <text class="n-s" x="342" y="129">YouTube Shorts proof vs. claim ad</text>
      </g>
    </a>

    <!-- Node 3: Team Anticipation -->
    <a href="/#anticipation" data-circuit-info="Team Anticipation (76/100): Call-to-Agent (CTAi / MCP) Search RSA vs. editorial copy on jacksmyth.fyi.">
      <g class="node">
        <rect x="324" y="156" width="292" height="60" rx="12"/>
        <text class="n-t" x="342" y="182">Anticipation</text>
        <text class="n-k" x="598" y="182" text-anchor="end">76/100</text>
        <text class="n-s" x="342" y="201">CTAi Search hooks on jacksmyth.fyi</text>
      </g>
    </a>

    <!-- Node 4: Judge + Guardrails + Output -->
    <a href="/experiments/field-lab" data-circuit-info="Calibrated Judge + Cap: gemini-decision-1 rubric + hard-coded A$100 Google Ads MCP spend breaker.">
      <g class="node accent">
        <rect x="700" y="64" width="248" height="100" rx="12"/>
        <text class="n-k" x="824" y="90" text-anchor="middle">Calibrated Judge · A$100 cap</text>
        <text class="n-t" x="824" y="114" text-anchor="middle">gemini-decision-1</text>
        <text class="n-s" x="824" y="136" text-anchor="middle">Google Ads MCP · Firestore</text>
        <text class="n-s" x="824" y="152" text-anchor="middle">Open Bayesian CMO verdict</text>
      </g>
    </a>
  </svg>
  <figcaption class="circuit-readout" id="circuit-readout"><strong>Active winner:</strong> Team Differentiation (81/100), testing Independent Benchmark vs. Vendor Case Study on Demand Gen.</figcaption>
</figure>
</section>

<section class="intro" data-agent-spec="THESIS: B2A (Brand-to-Agent) + GEM (Generative Engine Marketing) · AUTHOR: Jack Smyth, Country Lead AU, The Brandtech Group"><h2>Three bets. One direction.</h2>
<p>Agents compare, watch, and act before a human ever clicks. Three bets (<strong>Differentiation</strong>, <strong>Multimodality</strong>, and <strong>Anticipation</strong>) are tested live every month on an A$100 AUD Google Ads grant in the <a href="/experiments/field-lab">Agentic Field Lab</a>.</p>
<div class="system"><a href="#differentiation"><b>Be worth choosing.</b><small>01 Differentiation → Facts with Flair</small></a><a href="#multimodality"><b>Be understood.</b><small>02 Multimodality → YouTube-in-AI &amp; Field Lab</small></a><a href="#anticipation"><b>Be useful in action.</b><small>03 Anticipation → Leaderbored</small></a></div>
<h2>The person behind the bets</h2>
<p>${esc(CLAIMS.find((c) => c.id === "id-1")!.text)} ${esc(CLAIMS.find((c) => c.id === "id-2")!.text)} ${srcLinks(["s-li", "s-cta"])}</p>
<div class="ask" role="search"><h2>Ask the knowledge base</h2><p>Runs the exact same deterministic search your agent gets through <code>/mcp</code>. Zero AI-generated filler.</p>
<form id="f" toolautosubmit toolname="search_knowledge_form" tooldescription="Search Jack Smyth's source-backed positions and work." action="/search" method="get"><label class="sk" for="q">Search</label><input id="q" name="q" toolparamdescription="Keywords for Jack's profile, positions, apps and writing." placeholder="e.g. how do I get agents to recommend my brand?" autocomplete="off" minlength="2" maxlength="200" required><button type="submit">Search</button></form>
<div id="answer" aria-live="polite"></div></div>
</section>

${bets.map(betSection).join("\n")}

<section id="mcp" data-agent-spec="TRANSPORT: Streamable HTTP · AUTH: none (read-only) · PROTOCOLS: MCP, A2A 1.0, Poppy 1.0, OpenAPI, WebMCP">
<h2>Use my thinking in your agent</h2>
<p class="rules">A read-only MCP server over this same knowledge base. Every item says whether it is sourced or generated synthesis, and carries source links. No login, no actions, nothing is stored.</p>
<aside class="species-pulse" id="species-pulse" aria-label="Live monthly human and AI agent readership">
  <span><strong>Dual-Species Pulse</strong> · Humans: <strong id="pulse-humans">—</strong> · AI Agents: <strong id="pulse-agents">—</strong></span>
  <span class="pulse-bar" id="pulse-bar" aria-hidden="true">█████░░░░░</span>
  <span>Top agents: <strong id="pulse-bots">Googlebot · ClaudeBot · Agent-Client</strong> · <span id="pulse-cwv">Zero-PII Firestore</span></span>
  <a href="/reflections">Live reflections →</a>
</aside>
<div class="mcp-console">
  <div class="mcp-console-top">
    <strong>Try the live MCP right now</strong>
    <span class="mcp-console-badge" id="mcp-console-badge">Ready · Streamable HTTP</span>
  </div>
  <div class="mcp-console-btns" role="group" aria-label="Live MCP tool presets">
    <button type="button" data-mcp-demo="profile" aria-pressed="false">get_profile()</button>
    <button type="button" data-mcp-demo="strategy" aria-pressed="false">apply_strategy("Invisible in AI Overviews")</button>
    <button type="button" data-mcp-demo="youtube" aria-pressed="false">search("YouTube")</button>
  </div>
  <div class="mcp-console-meta" id="mcp-console-meta">Click any preset to fire a real JSON-RPC 2.0 call to <code>/mcp</code>.</div>
  <pre tabindex="0" aria-label="Live MCP JSON response"><code id="mcp-console-out">// Live JSON-RPC output appears here: exact payload any AI agent receives.</code></pre>
</div>
<h3 class="wt">Endpoint <button class="btn ghost copy" data-copy="MCP_URL" type="button">Copy</button></h3>
<pre tabindex="0" aria-label="MCP endpoint"><code id="mcpurl">${esc(base)}/mcp</code></pre>
<h3 class="wt">Client config (Streamable HTTP)</h3>
<pre tabindex="0" aria-label="MCP client configuration"><code>{
  "mcpServers": {
    "jack-smyth": { "type": "http", "url": "${esc(base)}/mcp" }
  }
}</code></pre>
<div class="tools">
<div><b>get_profile</b>Who Jack is, roles, the three bets, limits.</div>
<div><b>get_positions</b>Documented positions by bet, labelled by evidence.</div>
<div><b>list_work / get_work</b>Experiments, apps, writing, talks.</div>
<div><b>get_style_guide</b>Observed writing principles and video briefs.</div>
<div><b>search</b>Keyword search across everything.</div>
<div><b>apply_strategy</b>Runs a brief through the framework. Output is generated synthesis.</div>
</div>
<p class="rules">Also for agents: <a href="/llms.txt">llms.txt</a>, <a href="/index.md">index.md</a>, <a href="/knowledge.json">knowledge.json</a>, <a href="/.well-known/mcp.json">server card</a>. Sending <code>Accept: text/markdown</code> to <code>/</code> returns the markdown version.</p>
<h3>More than MCP</h3>
<p class="rules">Personal agents can discover this service through <a href="/.well-known/poppy.json">Poppy 1.0</a>, or use the same tools through <a href="/openapi.json">OpenAPI / HTTP</a>. An <a href="/.well-known/agent-card.json">A2A 1.0 agent card</a> advertises a message-only adapter; it does not speak as Jack or store a conversation.</p>
<p class="rules" id="webmcp-state" role="status">WebMCP requires a supporting browser with JavaScript enabled; remote MCP (<code>/mcp</code>) and HTTP (<code>/openapi.json</code>) work everywhere.</p>
<p class="rules"><a href="/protocols.json">Protocol scope and limitations</a>. This identity MCP stays read-only. Separately, the <a href="/experiments/field-lab#guardrails">Agentic Field Lab MCP</a> (<code>/experiments/field-lab/mcp</code>) exposes live A$100 media-grant cycles and voting, and <a href="/experiments/leaderbored#for-agents">Leaderbored’s MCP</a> (<code>/experiments/leaderbored/mcp</code>) supports human-approved purchases and credit use.</p>
</section>

<section id="work-with-me" class="work-cta">
  <div class="surface">
    <div>
      <h2>Bring this to your brand.</h2>
      <p>I’m Country Lead: Australia at <a href="https://thebrandtechgroup.com" rel="noopener">The Brandtech Group</a>. If you’re a CMO looking to measure Share of Model, build a Generative Engine Marketing (GEM) strategy, or run agentic marketing experiments inside your own organisation, let’s talk.</p>
    </div>
    <div class="actions">
      <a class="btn" href="https://linkedin.com/in/jtsmyth" rel="noopener">Connect on LinkedIn →</a>
    </div>
  </div>
</section>
`}
</main>
<footer>
${view ? `<h3>Three bets. One body of work.</h3><p><a href="/#differentiation">Differentiation</a> · <a href="/#multimodality">Multimodality</a> · <a href="/#anticipation">Anticipation</a></p><p><a href="/#sources">Sources & limitations</a> · <a href="/#mcp">Use the thinking in your agent</a></p><p>Experiment framing is an interpretation of Jack's brief, not a quotation or a promise of results.</p>` : `
<details id="sources"><summary>Sources, evidence and limitations</summary><h3>Sources</h3>
<ul>${SOURCES.filter((s) => s.id !== "s-owner").map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a> — ${esc(s.publisher)}${s.date ? `, ${esc(s.date)}` : ""}</li>`).join("")}</ul>
<h3>Known gaps</h3><ul>${SOURCE_GAPS.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
<h3>Style principles (generated synthesis from published work)</h3>
<ul>${STYLE_PRINCIPLES.map((p) => `<li>${esc(p.principle)}</li>`).join("")}</ul>
<p>Jack's home for experiments, apps and thinking, built from public sources. Generated synthesis is labelled and is not Jack Smyth's own words. Structured data and agent endpoints help discoverability; they do not guarantee inclusion in AI answers. <a href="/reflections">Self-Optimising Reflections</a>.</p>
</details>
`}
</footer>
<script nonce="${nonce}">
const f=document.getElementById('f'),a=document.getElementById('answer');
async function rpc(method,params){const r=await fetch('/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const t=await r.text();const line=t.split('\\n').find(l=>l.startsWith('data:'));return JSON.parse(line?line.slice(5):t)}
async function runSearch(){a.style.display='block';a.textContent='Searching…';
try{const r=await rpc('tools/call',{name:'search',arguments:{query:f.q.value,limit:6}});const d=JSON.parse(r.result.content[0].text);
if(!d.results.length){a.textContent='No matches. Try broader terms.';return d}
a.innerHTML=d.results.map(h=>{const i=h.item;const t=h.type==='source'?i.title:h.type==='work'?i.title+' — '+i.summary:i.text;const s=(i.sources||[]).filter(x=>x.url&&!x.url.startsWith('about:')).map(x=>'<a href="'+x.url+'" rel="noopener">'+(x.publisher||x.title)+'</a>').join(' · ')||(h.type==='source'?'<a href="'+i.url+'" rel="noopener">open</a>':'');
return '<div class="hit"><small>'+h.type+(i.label?' · '+i.label:'')+'</small><div>'+t.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'})[c])+'</div><small>'+s+'</small></div>'}).join('');return d}catch(err){a.textContent='Search failed.';return {error:'Search failed'}}}
if(f)f.addEventListener('submit',e=>{e.preventDefault();const result=runSearch();if(e.agentInvoked&&typeof e.respondWith==='function')e.respondWith(result)});
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+'/mcp');b.textContent='Copied';}catch{b.textContent='Select endpoint to copy';}setTimeout(()=>b.textContent='Copy',1800)}));
const cWrap=document.getElementById('signal-circuit'),cBtn=document.getElementById('circuit-motion-btn'),cRead=document.getElementById('circuit-readout');
if(cWrap&&cBtn)cBtn.addEventListener('click',()=>{const p=cWrap.classList.toggle('paused');cBtn.textContent=p?'Play motion':'Pause motion'});
if(cRead)document.querySelectorAll('[data-circuit-info]').forEach(el=>{const show=()=>{cRead.textContent=el.getAttribute('data-circuit-info')||''};el.addEventListener('mouseenter',show);el.addEventListener('focus',show)});
const lBtns=document.querySelectorAll('[data-lens-btn]');
function setLens(mode){const apply=()=>{if(mode==='agent'){document.documentElement.setAttribute('data-lens','agent');document.body.setAttribute('data-lens','agent')}else{document.documentElement.removeAttribute('data-lens');document.body.removeAttribute('data-lens')}lBtns.forEach(b=>b.setAttribute('aria-pressed',b.getAttribute('data-lens-btn')===mode?'true':'false'));try{localStorage.setItem('js-lens',mode)}catch{}};if(document.startViewTransition&&window.matchMedia('(prefers-reduced-motion: no-preference)').matches)document.startViewTransition(apply);else apply()}
try{if(localStorage.getItem('js-lens')==='agent')setLens('agent')}catch{}
lBtns.forEach(b=>b.addEventListener('click',()=>setLens(b.getAttribute('data-lens-btn')||'human')));
const secs=[...document.querySelectorAll('.bet,#mcp')],links=[...document.querySelectorAll('nav a')];
if ('IntersectionObserver' in window) { const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='/#'+e.target.id))}),{rootMargin:'-40% 0px -55% 0px'}); secs.forEach(s=>observer.observe(s)); }
const topHdr=document.querySelector('header.top');
if(topHdr){const onScroll=()=>{if(window.scrollY>8)topHdr.setAttribute('data-scrolled','true');else topHdr.removeAttribute('data-scrolled')};onScroll();window.addEventListener('scroll',onScroll,{passive:true})}
</script>
<dialog id="cmd-palette" class="cmd-palette" closedby="any" aria-labelledby="cmd-title">
  <div class="cmd-head">
    <h2 id="cmd-title">Command Palette · Human &amp; Agent Grammar</h2>
    <form method="dialog"><button type="submit" value="close">Close</button></form>
  </div>
  <div class="cmd-search-wrap">
    <label class="sk" for="cmd-filter">Filter commands</label>
    <input id="cmd-filter" type="search" placeholder="Jump to an experiment, protocol, or MCP tool…" autocomplete="off" autofocus>
  </div>
  <div class="cmd-list">
    <a class="cmd-item" data-cmd-item href="/experiments/field-lab"><span>Inspect Agentic Field Lab (Cycle 01 Live)</span><code>field_lab_get_cycle</code></a>
    <a class="cmd-item" data-cmd-item href="/experiments/facts-with-flair"><span>Try Facts with Flair (Bet 01)</span><code>get_work("w-fwf")</code></a>
    <a class="cmd-item" data-cmd-item href="/experiments/leaderbored"><span>Try Leaderbored (Bet 03 · Transactional)</span><code>leaderbored_catalog</code></a>
    <button type="button" class="cmd-item" data-cmd-item data-cmd-action="toggle-lens"><span>Toggle Human / Agent X-Ray Lens</span><code>view:dual-vision</code></button>
    <button type="button" class="cmd-item" data-cmd-item data-cmd-action="copy-mcp"><span>Copy Identity MCP Endpoint URL</span><code>/mcp</code></button>
    <a class="cmd-item" data-cmd-item href="/#mcp"><span>Open Live MCP Console</span><code>apply_strategy</code></a>
    <a class="cmd-item" data-cmd-item href="/llms.txt"><span>Read Markdown Knowledge Base</span><code>GET /llms.txt</code></a>
    <a class="cmd-item" data-cmd-item href="/.well-known/poppy.json"><span>Inspect Poppy 1.0 Discovery</span><code>/.well-known/poppy.json</code></a>
    <a class="cmd-item" data-cmd-item href="/.well-known/agent-card.json"><span>Inspect A2A 1.0 Agent Card</span><code>/.well-known/agent-card.json</code></a>
    <a class="cmd-item" data-cmd-item href="/reflections"><span>View Monthly Self-Optimising Reflections</span><code>/api/self-opt/summary</code></a>
  </div>
</dialog>
<script src="/webmcp.js" defer></script>
<script src="/telemetry.js" defer></script>
<script src="/home-ui.js?v=${HOME_UI_VER}" defer></script>
${view?.script ? `<script src="${esc(view.script)}" defer></script>` : ""}
</body></html>`;
}
