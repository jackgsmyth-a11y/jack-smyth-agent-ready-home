import { BETS, CLAIMS, SITE, SOURCES, SOURCE_GAPS, STYLE_PRINCIPLES, VIDEO_BRIEFS, WORKS, sourceRefs, type Bet } from "./knowledge.js";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const bets = Object.keys(BETS) as Bet[];
export interface PageView { path: string; title: string; description: string; body: string; script?: string }

function srcLinks(ids: string[]) {
  return sourceRefs(ids)
    .filter((s) => s.id !== "s-owner")
    .map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.publisher)}</a>`)
    .join(" · ");
}

function claimLi(c: (typeof CLAIMS)[number]) {
  const tag = c.kind === "synthesis" ? `<span class="tag syn">Generated synthesis</span>` : c.kind === "reported" ? `<span class="tag rep">Reported figure</span>` : c.kind === "quote" ? `<span class="tag q">Quote</span>` : "";
  const text = c.kind === "quote" ? `<q>${esc(c.text)}</q>` : esc(c.text);
  const src = srcLinks(c.sources);
  return `<li class="${c.kind}">${tag}<p>${text}</p>${src ? `<small>${src}</small>` : ""}</li>`;
}

function betSection(b: Bet) {
  const B = BETS[b];
  const work = WORKS.filter((w) => w.bet === b);
  const spotlight = b === "differentiation"
    ? `<aside class="spotlight"><span class="wt">Focused build 01 · differentiation in practice</span><h3>Facts with flair.</h3><p>Being legible is the starting point. Giving an agent a real reason to choose you is the work.</p><p>Compare eight source-backed product reframings, then try your own. The facts stay the constraint; the buying decision becomes clearer.</p><a class="btn" href="/experiments/facts-with-flair">Try Facts with Flair →</a><small>Powered by Flint from Springboards. No measured ranking claim.</small></aside>`
    : b === "multimodality"
    ? `<aside class="spotlight"><span class="wt">Live in the Wet Lab · Team Multimodality</span><h3>Show the agent working vs. state the claim.</h3><p>Team Multimodality currently leads Cycle 01 of the Agentic Marketing Wet Lab (92/100 Judge score), pitting a 20-second screen-recorded YouTube Short against a standard claim ad on A$100 AUD.</p><a class="btn" href="/experiments/wet-lab">Inspect their pitch in the Wet Lab →</a><small>Built on Gemini, YouTube Shorts, and Google Ads MCP.</small></aside>`
    : b === "anticipation"
    ? `<aside class="spotlight"><span class="wt">Focused build 02 · anticipation in practice</span><h3>Leaderbored.</h3><p>What does an agency look like when its next client is an agent?</p><p>A small market for divergent advertising ideas: the human approves the budget; the agent gets a concept, an execution and a reason it differs. Ten credits for A$1.00. One saved idea per credit.</p><a class="btn" href="/experiments/leaderbored">Try Leaderbored →</a><small>Powered by Flint from Springboards. Category patterns are sample data.</small></aside>`
    : "";
  return `<section class="bet" id="${b}" data-bet="${b}">
  <div class="bet-head"><span class="num">0${B.n}</span><div><h2>${B.title}</h2><p class="q">${esc(B.question)}</p></div></div>
  <p class="thesis">${esc(B.thesis)}</p>
  ${spotlight}
  <div class="cols">
    <div><h3>The thinking</h3><ul class="claims">${CLAIMS.filter((c) => c.bet === b).slice(0, 3).map(claimLi).join("")}</ul><details><summary>More positions and evidence</summary><ul class="claims">${CLAIMS.filter((c) => c.bet === b).slice(3).map(claimLi).join("")}</ul></details></div>
    <div><h3>Writing, talks & research</h3><ul class="work">${work.filter(w => w.type !== "experiment")
      .map((w) => `<li class="${w.status}"><span class="wt">${esc(w.type)}</span><h4>${w.url ? `<a href="${esc(w.url)}" rel="noopener">${esc(w.title)}</a>` : esc(w.title)}</h4><p>${esc(w.summary)}</p>${w.status === "pending-details" ? `<em>Awaiting details from Jack</em>` : `<small>${srcLinks(w.sources)}</small>`}</li>`)
      .join("")}</ul>
    ${b === "multimodality" ? `<h3>Video briefs <small>(planned, not yet produced)</small></h3><ul class="briefs">${VIDEO_BRIEFS.map((v) => `<li><h4>${esc(v.title)}</h4><span class="wt">${esc(v.format)}</span><p>${esc(v.brief)}</p></li>`).join("")}</ul>` : ""}
    </div>
  </div>
</section>`;
}

export function page(base: string, view?: PageView, nonce = "") {
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
      {
        "@type": "Dataset",
        "@id": `${base}/experiments/wet-lab#dataset`,
        name: "Agentic Marketing Wet Lab — Open CMO Ad Experiments",
        description: "Monthly autonomous marketing experiments devised by three competing AI agent teams, scored by a calibrated Judge Agent, and executed within a hard-capped A$100 AUD Google Ads budget.",
        url: `${base}/experiments/wet-lab`,
        creator: { "@id": `${base}/#jack` },
        isAccessibleForFree: true,
      },
      ...(view ? [{ "@type": "WebPage", "@id": `${base}${view.path}`, url: `${base}${view.path}`, name: view.title, description: view.description, isPartOf: { "@id": `${base}/#site` }, about: { "@id": `${base}/#jack` } }] : []),
      ...WORKS.filter((w) => w.status === "documented" && w.url && (w.type === "writing" || w.type === "research")).map((w) => ({
        "@type": "Article", headline: w.title, url: w.url,
        ...(w.authors ? { author: w.authors.map((name) => name === "Jack Smyth" ? { "@id": `${base}/#jack` } : { "@type": "Person", name }) }
          : ["w-gem-paper", "w-geo-gem", "w-b2a", "w-yt-ai"].includes(w.id) ? { author: w.id === "w-gem-paper" ? [{ "@id": `${base}/#jack` }, { "@type": "Person", name: "John Dawson" }] : { "@id": `${base}/#jack` } } : {}),
      })),
    ],
  };

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(view?.title || "Jack Smyth — three bets on agents, video and anticipation")}</title>
<meta name="description" content="${esc(view?.description || SITE.tagline)}">
<link rel="canonical" href="${esc(base)}${view?.path || "/"}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preload" href="/fonts/spacegrotesk-0640890476.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/dmsans-9fea608a94.woff2" as="font" type="font/woff2" crossorigin>
<link rel="alternate" type="text/markdown" href="/index.md"><link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">
<meta property="og:type" content="website"><meta property="og:site_name" content="Jack Smyth"><meta property="og:url" content="${esc(base)}${view?.path || "/"}">
<meta property="og:title" content="${esc(view?.title || "Jack Smyth — three bets on agents, video and anticipation")}"><meta property="og:description" content="${esc(view?.description || SITE.tagline)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(view?.title || "Jack Smyth — three bets on agents, video and anticipation")}"><meta name="twitter:description" content="${esc(view?.description || SITE.tagline)}">
<script nonce="${nonce}" type="application/ld+json">${JSON.stringify(ld)}</script>
<style nonce="${nonce}">
@font-face{font-family:"DM Sans";font-style:normal;font-weight:400 800;font-display:swap;src:url("/fonts/dmsans-9fea608a94.woff2") format("woff2")}
@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:400 700;font-display:swap;src:url("/fonts/spacegrotesk-0640890476.woff2") format("woff2")}
@font-face{font-family:"DM Mono";font-style:normal;font-weight:400;font-display:swap;src:url("/fonts/dmmono-e1896b13b2.woff2") format("woff2")}
:root{--bg:#f6f4ee;--fg:#171714;--mut:#626259;--line:#d9d7cf;--acc:#171714;--b1:#626800;--b2:#3f6156;--b3:#696718;--card:#fbfaf6;--lemon:#f2f64a;--sans:"DM Sans",ui-sans-serif,system-ui,sans-serif;--display:"Space Grotesk",var(--sans);--mono:"DM Mono",ui-monospace,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 var(--sans);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--display);font-weight:600}::selection{background:var(--lemon);color:var(--fg)}
a{color:inherit;text-decoration-color:var(--acc);text-underline-offset:3px}a:hover{color:var(--acc)}
:focus-visible{outline:3px solid var(--b1);outline-offset:3px}
.sk{position:absolute;left:-999px}.sk:focus{left:12px;top:12px;background:var(--b1);color:#000;padding:8px 12px;z-index:9}
header.top{position:sticky;top:0;z-index:5;background:rgba(246,244,238,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
nav{max-width:1180px;margin:auto;padding:12px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;font:600 13px ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase}
nav b{margin-right:auto;font:700 22px var(--display);letter-spacing:-.05em;text-transform:none}
nav a{text-decoration:none;color:var(--mut)}nav a:hover,nav a.on{color:var(--fg)}
nav a{display:inline-flex;align-items:center;min-height:32px;padding:4px 0}nav b a{color:var(--fg)}.bet-nav{display:flex;gap:22px}.nav-agent{border-bottom:2px solid var(--lemon)}
main{max-width:1180px;margin:auto;padding:0 20px}
.hero{padding:64px 0 44px}
.hero-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:42px;align-items:center}
.hero h1{font-size:clamp(42px,6.2vw,84px);line-height:.98;letter-spacing:-.065em;margin:0 0 22px;font-weight:600;max-width:11ch}
.hero h1 em{font-style:normal;color:var(--fg);background:linear-gradient(transparent 64%,var(--lemon) 64%,var(--lemon) 90%,transparent 90%)}
.hero p.lead{font-size:clamp(16px,1.7vw,19.5px);max-width:44ch;color:var(--mut);margin:0 0 26px;line-height:1.6}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.hero-actions a.btn{text-decoration:none}
.circuit-wrap{border:1px solid var(--fg);background:#fffefa;border-radius:16px;padding:18px 18px 14px;position:relative}
.circuit-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.circuit-head .live-pill{display:inline-flex;align-items:center;gap:6px;background:var(--lemon);color:var(--fg);padding:3px 9px;border-radius:99px}
.circuit-toggle{background:transparent!important;color:var(--mut)!important;border:1px solid var(--line)!important;padding:4px 10px!important;font:600 11px var(--mono)!important;border-radius:99px!important;margin:0!important}
.circuit-toggle:hover{color:var(--fg)!important;border-color:var(--fg)!important}
.circuit-svg{width:100%;height:auto;display:block}
.circuit-svg .wire{fill:none;stroke:#c8c5ba;stroke-width:1.5}
.circuit-svg .wire-active{fill:none;stroke:var(--fg);stroke-width:1.75;stroke-dasharray:6 10}
@media (prefers-reduced-motion:no-preference){.circuit-wrap:not(.paused) .wire-active{animation:circuitFlow 2.6s linear infinite}}
@keyframes circuitFlow{from{stroke-dashoffset:32}to{stroke-dashoffset:0}}
.circuit-svg a{text-decoration:none}.circuit-svg .node rect{fill:var(--bg);stroke:var(--line);stroke-width:1.25;transition:stroke .15s,fill .15s}
.circuit-svg .node.lead rect{fill:#fffefa;stroke:var(--fg);stroke-width:1.75}.circuit-svg .node.accent rect{fill:var(--lemon);stroke:var(--fg);stroke-width:1.5}
.circuit-svg a:hover .node rect,.circuit-svg a:focus-visible .node rect{stroke:var(--fg);fill:#fffefa}
.circuit-svg .n-k{font:600 9.5px var(--mono);fill:#626259;letter-spacing:.08em}.circuit-svg .n-t{font:700 12.5px var(--display);fill:#171714}.circuit-svg .n-s{font:500 10px var(--sans);fill:#626259}
.creative-card{margin:0}.creative-card img{width:100%;height:auto;border-radius:10px;display:block;margin-bottom:14px;border:1px solid var(--line)}.creative-card figcaption{font-size:14px;line-height:1.5}
.sans,.tag,.wt,nav,.btn,button,small{font-family:var(--sans)}code,pre{font-family:var(--mono)}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.tile{display:block;text-decoration:none;border:1px solid var(--line);background:var(--card);padding:24px;border-radius:13px;min-height:220px;position:relative;overflow:hidden;transition:transform .2s,border-color .2s}
.tile:hover{transform:translateY(-3px);color:var(--fg)}
.tile[data-bet=differentiation]:hover{border-color:var(--b1)}.tile[data-bet=multimodality]:hover{border-color:var(--b2)}.tile[data-bet=anticipation]:hover{border-color:var(--b3)}
.tile .n{font:700 13px ui-sans-serif,system-ui;letter-spacing:.1em;color:var(--mut)}
.tile h3{font-size:28px;margin:10px 0 8px;letter-spacing:-.02em}.tile p{margin:0;color:var(--mut);font-size:15px;line-height:1.45}
.tile .home{position:absolute;left:22px;bottom:18px;font:600 12px ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.06em}
.tile[data-bet=differentiation] .home{color:var(--b1)}.tile[data-bet=multimodality] .home{color:var(--b2)}.tile[data-bet=anticipation] .home{color:var(--b3)}
.ask{margin:42px 0 0;border:1px solid var(--line);border-radius:13px;padding:24px;background:#eeede5}
.ask h2{margin:0 0 6px;font-size:22px}.ask p{margin:0 0 14px;color:var(--mut)}
.ask form{display:flex;gap:10px;flex-wrap:wrap}
.ask input{flex:1 1 280px;min-width:0;background:#fffefa;color:var(--fg);border:1px solid #bab8ad;border-radius:8px;padding:14px 16px;font:16px var(--sans)}
.btn,button{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:14px 20px;font-weight:600;font-size:14px;cursor:pointer}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
#answer{margin-top:16px;display:none}#answer .hit{border-top:1px solid var(--line);padding:12px 0}#answer small{color:var(--mut)}
.intro{padding:72px 0 8px;max-width:760px}.intro h2{font-size:clamp(28px,4vw,44px);letter-spacing:-.02em;line-height:1.1;margin:0 0 16px}
.intro p{color:var(--mut)}
.bet{padding:72px 0;border-top:1px solid var(--line);margin-top:40px}
.bet-head{display:flex;gap:20px;align-items:flex-start}
.num{font:400 clamp(44px,6vw,76px)/0.9 var(--display);letter-spacing:-.065em}
#differentiation .num,#differentiation h3{color:var(--b1)}#multimodality .num,#multimodality h3{color:var(--b2)}#anticipation .num,#anticipation h3{color:var(--b3)}
.bet h2{font-size:clamp(30px,5vw,56px);margin:0;letter-spacing:-.03em;line-height:1}.bet .q{margin:8px 0 0;color:var(--mut);font-size:19px}
.thesis{font-size:clamp(20px,2.6vw,28px);line-height:1.35;max-width:30em;margin:30px 0 36px}
.cols{display:grid;grid-template-columns:1.2fr 1fr;gap:40px}
.bet h3{font:700 12px ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.12em;margin:0 0 14px}
ul{list-style:none;padding:0;margin:0}
.claims li{padding:14px 0;border-top:1px solid var(--line)}.claims p{margin:4px 0 4px;font-size:16px}.claims small{color:var(--mut);font-size:12.5px}
.claims li.synthesis{border-left:2px solid var(--b1);padding-left:14px;background:#eeede5}
.tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:99px;border:1px solid var(--line);color:var(--mut)}
.tag.syn{color:var(--b1);border-color:var(--b1)}
.work li{border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;background:var(--card)}
.work li.pending-details{border-style:dashed;opacity:.85}
.work h4,.briefs h4{margin:4px 0 4px;font-size:19px}.work p,.briefs p{margin:0 0 8px;font-size:15px;color:var(--mut);line-height:1.45}
.wt{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut)}
.briefs{margin-top:8px}.briefs li{padding:12px 0;border-top:1px solid var(--line)}
.work small,.work em{font-size:12.5px;color:var(--mut)}
#mcp{padding:72px 0;border-top:1px solid var(--line)}
#mcp h2{font-size:clamp(30px,5vw,56px);margin:0 0 12px;letter-spacing:-.03em}
pre{background:#eeede6;border:1px solid var(--line);border-radius:10px;padding:16px;overflow:auto;font-size:13px;line-height:1.65;margin:10px 0}
code{background:#eeede6;padding:2px 6px;border-radius:5px;font-size:.86em}pre code{background:none;padding:0}
.tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin:18px 0}
.tools div{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card);font-size:14px;color:var(--mut)}.tools b{display:block;color:var(--fg);font:700 14px ui-monospace,monospace;margin-bottom:4px}
.rules{color:var(--mut);max-width:62ch}
.spotlight{border:1px solid var(--line);border-left:5px solid var(--lemon);border-radius:13px;background:var(--card);padding:28px;margin:0 0 36px}.spotlight h3{font-family:var(--display);font-size:36px!important;text-transform:none!important;letter-spacing:-.05em!important;margin:8px 0!important;color:var(--fg)!important}.spotlight p{max-width:65ch}.spotlight .btn{display:inline-block;text-decoration:none;color:#fff;margin:10px 12px 0 0}
.spotlight small{display:block;color:var(--mut);margin-top:14px;font-size:12px}summary{cursor:pointer;font:600 13px ui-sans-serif,system-ui;padding:14px 0;color:var(--mut)}
.system{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:28px 0 40px}.system a{padding:22px 0;border-top:1px solid var(--line);text-decoration:none}.system b{display:block;font-size:25px}.system small{color:var(--mut);font-size:13px}
.experiment{--tone:var(--b1);padding:38px 0 70px}.experiment[data-experiment=leaderbored]{--tone:var(--b3)}.experiment[data-experiment=wet-lab]{--tone:var(--b2)}
.wetlab-grid{display:grid;grid-template-columns:1fr;gap:20px;margin:22px 0}.wetlab-pitch h3{margin:6px 0 10px}
.glassbox{margin:28px 0 16px}.gb-rail{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:0 0 16px}
.gb-node{text-align:left;background:var(--card)!important;color:var(--fg)!important;border:1px solid var(--line)!important;border-radius:12px;padding:14px;margin:0!important;cursor:pointer;transition:border-color .15s,background .15s}
.gb-node:hover{border-color:var(--fg)!important}.gb-node[aria-selected=true]{border-color:var(--fg)!important;background:#fffefa!important;box-shadow:inset 0 -3px 0 var(--lemon)}
.gb-node .gb-step{display:block;font:600 11px var(--mono);color:var(--tone);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.gb-node strong{display:block;font:600 16px var(--display);letter-spacing:-.02em;margin-bottom:2px}
.gb-node span.gb-sub{display:block;font:12px/1.35 var(--sans);color:var(--mut)}
.gb-panel{border:1px solid var(--fg);background:#fffefa;border-radius:16px;padding:26px}.gb-panel[hidden]{display:none!important}
.gb-meta{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.gb-meta span{font:12px var(--mono);padding:4px 9px;border:1px solid var(--line);border-radius:6px;background:var(--bg)}
.rubric-row{display:grid;grid-template-columns:180px 1fr 54px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font:13px var(--sans)}
.rubric-meter{width:100%;height:10px;accent-color:var(--b2)}.cap-track{display:grid;grid-template-columns:10fr 85fr 5fr;gap:3px;height:14px;margin:14px 0 8px}
.cap-seg{border-radius:4px}.cap-seg.day{background:var(--b2)}.cap-seg.run{background:#d7d5cc}.cap-seg.stop{background:var(--lemon);border:1px solid var(--fg)}
.gb-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
.flagship{border:1px solid var(--fg);background:#fffefa;border-radius:16px;padding:28px;margin:0 0 28px;display:grid;grid-template-columns:1.4fr auto;gap:24px;align-items:center}
.flagship .fl-kicker{display:inline-flex;align-items:center;gap:8px;font:600 11px var(--mono);text-transform:uppercase;letter-spacing:.1em;background:var(--lemon);color:var(--fg);padding:4px 10px;border-radius:99px;margin-bottom:10px}
.flagship h2{font-size:clamp(24px,3.2vw,36px);line-height:1.08;letter-spacing:-.035em;margin:0 0 8px}
.flagship p{margin:0;color:var(--mut);max-width:58ch;font-size:15.5px}
.flagship .btn{text-decoration:none;white-space:nowrap}
.work-cta{border-top:1px solid var(--line);padding:64px 0 40px;margin-top:40px}
.work-cta .surface{border:1px solid var(--fg);background:#fffefa;border-radius:16px;padding:32px;display:grid;grid-template-columns:1.4fr auto;gap:24px;align-items:center}
.work-cta h2{font-size:clamp(26px,3.8vw,42px);letter-spacing:-.03em;margin:0 0 10px;line-height:1.08}
.work-cta p{margin:0;color:var(--mut);max-width:58ch}.work-cta .actions{display:flex;gap:10px;flex-wrap:wrap}.work-cta a.btn{text-decoration:none}
@media (max-width:820px){.hero-grid{grid-template-columns:1fr;gap:28px}.gb-rail{grid-template-columns:1fr 1fr}.gb-cols,.flagship,.work-cta .surface{grid-template-columns:1fr}.rubric-row{grid-template-columns:1fr 1fr 48px}}
.crumb{font:600 12px ui-sans-serif,system-ui;display:flex;gap:12px;color:var(--mut);margin-bottom:32px;flex-wrap:wrap}.crumb a{text-decoration:none}.eyebrow{font:700 11px ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.14em;color:var(--tone);margin-bottom:14px}
.experiment h1{font-size:clamp(44px,7vw,84px);line-height:1.02;letter-spacing:-.04em;max-width:15ch;margin:10px 0 24px}.experiment .deck{color:var(--mut);font-size:clamp(19px,2.4vw,25px);max-width:42ch}
.experiment .context{max-width:65ch;border-left:2px solid var(--tone);padding:0 0 0 20px;margin:24px 0 34px;font-size:15px}.context small{display:block;color:var(--mut);font-size:12px}
.experiment h2{font-size:clamp(28px,4vw,42px);line-height:1.15;letter-spacing:-.025em;margin:0 0 14px}.experiment h3{font-size:23px;line-height:1.25;margin:0 0 14px}.experiment section{scroll-margin-top:130px;margin-top:54px}
.experiment .section-top{display:flex;justify-content:space-between;align-items:baseline;gap:20px;flex-wrap:wrap}.section-top p{color:var(--mut);max-width:55ch}.experiment .section-no{font:600 12px ui-sans-serif,system-ui;color:var(--tone)}
.experiment .surface{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:26px;min-width:0}
.experiment .split{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:22px 0}.experiment .source-copy{white-space:pre-line;color:var(--mut);font-size:16px}.experiment .reframed{font-size:21px}.experiment mark{background:rgba(255,210,63,.13);color:var(--fg);border-bottom:1px solid var(--tone)}
.experiment .quiet{font:13px/1.6 ui-sans-serif,system-ui;color:var(--mut)}.experiment .fine{font:12px/1.6 ui-sans-serif,system-ui;color:var(--mut)}.experiment .muted{color:var(--mut)}
.experiment .picker{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0}.experiment .picker button{background:transparent;border:1px solid var(--line);color:var(--mut);padding:10px 14px;border-radius:99px;font-size:13px}.experiment .picker button[aria-pressed=true]{border-color:var(--tone);color:var(--fg);background:var(--card)}
.experiment .picker a{display:block;text-decoration:none;border:1px solid var(--line);color:var(--mut);padding:10px 14px;border-radius:99px;font:600 13px ui-sans-serif,system-ui}.experiment .picker a[aria-current=true]{border-color:var(--tone);color:var(--fg);background:var(--card)}
.experiment label.field{display:block;font:600 13px ui-sans-serif,system-ui;margin:18px 0 8px}.experiment input:not([type=checkbox]),.experiment textarea,.experiment select{width:100%;background:var(--bg);border:1px solid #514b40;color:var(--fg);padding:14px;border-radius:10px;font:16px ui-sans-serif,system-ui;min-width:0}.experiment textarea{min-height:150px;resize:vertical}
.experiment button{background:var(--tone);margin:10px 0}.experiment button.secondary{background:transparent;border:1px solid var(--line);color:var(--fg)}button:disabled{opacity:.45;cursor:wait}
.experiment .actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.experiment .actions a.btn{background:var(--tone);display:inline-block;text-decoration:none;margin:10px 0}.experiment .notice{font:14px/1.65 ui-sans-serif,system-ui;padding:14px 18px;border:1px solid var(--line);border-left:3px solid var(--tone);border-radius:8px;margin:18px 0;overflow-wrap:anywhere}.experiment .notice.error{border-left-color:#ff7966}
.experiment .facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.experiment .facts span{border:1px solid var(--line);padding:6px 10px;border-radius:6px;font:12px ui-sans-serif,system-ui}
.experiment .reasons{counter-reset:reason}.experiment .reasons li{padding:12px 0;border-top:1px solid var(--line);font-size:15px}.experiment .reasons b{font-weight:600;color:var(--tone)}
.experiment h1{font-family:var(--display);font-weight:600;letter-spacing:-.075em}.experiment .reframed{font-size:18px;line-height:1.8}.experiment input:not([type=checkbox]),.experiment textarea,.experiment select{background:#fffefa;border-color:#bab8ad;font-family:var(--sans)}.experiment button,.experiment .actions a.btn{background:var(--fg);color:#fff}.experiment .eyebrow,.experiment .section-no{font-family:var(--mono);font-weight:400}.experiment .split>article:first-child{background:#efeee7}.experiment .split>article:nth-child(2){border-color:var(--fg);background:#fffefa}
.experiment .method{max-width:75ch}.experiment .method p{color:var(--mut);font-size:15px}.experiment .next{margin-top:65px;border-top:1px solid var(--line);padding:28px 0;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}.experiment .next a{font-size:24px}
.experiment .theme{border-top:1px solid var(--line);padding:18px 0}.experiment .theme strong{display:block;font-size:19px}.experiment .theme p{margin:6px 0;color:var(--mut);font:13px/1.6 ui-sans-serif,system-ui}.experiment .price{font-size:44px;line-height:1.1;letter-spacing:-.03em}.experiment .price small{font:14px ui-sans-serif,system-ui;letter-spacing:0;color:var(--mut)}.experiment .check{display:flex;gap:12px;font:14px/1.6 ui-sans-serif,system-ui;margin:20px 0}.experiment .check input{width:20px;height:20px;flex:0 0 20px}
.experiment .gates li{padding:15px 0;border-top:1px solid var(--line);font:14px/1.6 ui-sans-serif,system-ui}.experiment .gates b{display:block}.experiment [hidden]{display:none!important}.experiment .agent-box{margin-top:35px}
.copy{margin-left:8px;padding:6px 12px;font-size:12px}
footer{border-top:1px solid var(--line);padding:48px 20px 80px;max-width:1180px;margin:auto;color:var(--mut);font-size:14px}
footer h3{font:700 12px ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.12em;color:var(--fg)}footer li{margin:4px 0}
@media (max-width:820px){.tiles{grid-template-columns:1fr}.cols{grid-template-columns:1fr;gap:28px}.bet-head{flex-direction:column;gap:6px}.hero{padding-top:48px}nav{gap:6px 14px}nav b{width:auto}.bet-nav{order:3;width:100%;justify-content:space-between;gap:8px;font-size:11px}.nav-agent{margin-left:auto;font-size:11px}.system{grid-template-columns:1fr;gap:0}.experiment .split{grid-template-columns:1fr}.experiment .surface{padding:20px}.experiment{padding-top:26px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
</style></head>
<body>
<a class="sk" href="#main">Skip to content</a>
<header class="top"><nav aria-label="Primary"><b><a href="/">Jack Smyth</a></b>
<div class="bet-nav"><a href="/experiments/wet-lab">Wet Lab</a><a href="/#differentiation">Differentiation</a><a href="/#multimodality">Multimodality</a><a href="/#anticipation">Anticipation</a></div><a class="nav-agent" href="/#mcp">For agents</a></nav></header>
<main id="main" tabindex="-1">
${view ? view.body : `
<section class="hero">
<div class="hero-grid">
  <div>
    <h1>Be the answer <em>agents</em> choose.</h1>
    <p class="lead">${esc(SITE.tagline)} One autonomous marketing wet lab, three bets on how brands win in the agent era, and open MCP interfaces so agents can inspect and act directly.</p>
    <div class="hero-actions">
      <a class="btn" href="/experiments/wet-lab">Inspect the Wet Lab →</a>
      <a class="btn ghost" href="/#mcp">Connect an agent</a>
    </div>
  </div>
  <figure class="circuit-wrap" id="signal-circuit">
    <div class="circuit-head">
      <span class="live-pill">Wet Lab · Cycle 01 · A$100/mo</span>
      <button type="button" class="circuit-toggle" id="circuit-motion-btn">Pause motion</button>
    </div>
    <svg class="circuit-svg" viewBox="0 0 480 330" role="img" aria-label="Interactive schematic of the Agentic Marketing Wet Lab: Industry Pulse branches into three competing agent teams (Differentiation, Multimodality, Anticipation), converges at the Calibrated Judge and A$100 Google Ads spend breaker, and publishes open CMO evidence.">
      <!-- Static guide rails -->
      <path class="wire" d="M240 58 V92 M82 92 H398 M82 92 V120 M240 92 V120 M398 92 V120 M82 194 V222 M240 194 V222 M398 194 V222 M82 222 H398 M240 222 V250"/>
      <!-- Animated signal paths (winning Team Differentiation path highlighted) -->
      <path class="wire-active" d="M240 58 V92 H82 V120 M82 194 V222 H240 V250"/>
      <path class="wire-active" d="M240 92 V120 M240 194 V222"/>
      <path class="wire-active" d="M240 92 H398 V120 M398 194 V222 H240"/>

      <!-- Node 0: Industry Pulse -->
      <a href="/experiments/wet-lab#under-the-hood">
        <g class="node">
          <rect x="120" y="10" width="240" height="48" rx="10"/>
          <text class="n-k" x="240" y="27" text-anchor="middle">01 · INDUSTRY PULSE</text>
          <text class="n-t" x="240" y="45" text-anchor="middle">Google Search &amp; Trends Scout</text>
        </g>
      </a>

      <!-- Node 1: Team Differentiation (Cycle 01 Winner) -->
      <a href="/#differentiation">
        <g class="node lead">
          <rect x="10" y="120" width="144" height="74" rx="10"/>
          <text class="n-k" x="82" y="139" text-anchor="middle">TEAM 01 · 81/100 ★</text>
          <text class="n-t" x="82" y="158" text-anchor="middle">Differentiation</text>
          <text class="n-s" x="82" y="176" text-anchor="middle">Demand Gen · Benchmark</text>
        </g>
      </a>

      <!-- Node 2: Team Multimodality -->
      <a href="/#multimodality">
        <g class="node">
          <rect x="168" y="120" width="144" height="74" rx="10"/>
          <text class="n-k" x="240" y="139" text-anchor="middle">TEAM 02 · BET 02</text>
          <text class="n-t" x="240" y="158" text-anchor="middle">Multimodality</text>
          <text class="n-s" x="240" y="176" text-anchor="middle">YouTube Shorts Proof</text>
        </g>
      </a>

      <!-- Node 3: Team Anticipation -->
      <a href="/#anticipation">
        <g class="node">
          <rect x="326" y="120" width="144" height="74" rx="10"/>
          <text class="n-k" x="398" y="139" text-anchor="middle">TEAM 03 · 76/100</text>
          <text class="n-t" x="398" y="158" text-anchor="middle">Anticipation</text>
          <text class="n-s" x="398" y="176" text-anchor="middle">CTAi Search Hooks</text>
        </g>
      </a>

      <!-- Node 4: Judge + Guardrails + Output -->
      <a href="/experiments/wet-lab">
        <g class="node accent">
          <rect x="70" y="250" width="340" height="66" rx="10"/>
          <text class="n-k" x="240" y="270" text-anchor="middle">CALIBRATED JUDGE · HARD A$100 CAP</text>
          <text class="n-t" x="240" y="289" text-anchor="middle">gemini-decision-1 → Google Ads MCP</text>
          <text class="n-s" x="240" y="305" text-anchor="middle">Open Bayesian CMO Verdict · Firestore · YouTube</text>
        </g>
      </a>
    </svg>
  </figure>
</div>
</section>

<section class="intro"><h2>Three bets. One direction.</h2>
<p>Good SEO is good GEO—and both now depend on unique expertise, verifiable evidence, and callable utility. When AI agents become the buyer, brands must pass three sequential machine tests: <strong>Differentiation</strong> (be worth choosing), <strong>Multimodality</strong> (show, don’t just claim), and <strong>Anticipation</strong> (let agents act). Every month, the <a href="/experiments/wet-lab">Wet Lab</a> pits one agent team per bet against each other on A$100 AUD to test these principles in public.</p>
<small class="muted">Editorial framing of Jack's three-bet brief; not a quotation.</small>
<div class="system"><a href="#differentiation"><b>Be worth choosing.</b><small>01 Differentiation → Facts with Flair</small></a><a href="#multimodality"><b>Be understood.</b><small>02 Multimodality → YouTube-in-AI &amp; Wet Lab</small></a><a href="#anticipation"><b>Be useful in action.</b><small>03 Anticipation → Leaderbored</small></a></div>
<h2>The person behind the bets</h2>
<p>${esc(CLAIMS.find((c) => c.id === "id-1")!.text)} ${esc(CLAIMS.find((c) => c.id === "id-2")!.text)} ${srcLinks(["s-li", "s-cta"])}</p>
<div class="ask" role="search"><h2>Ask the knowledge base</h2><p>Runs the exact same deterministic search your agent gets through <code>/mcp</code>. Zero AI-generated filler.</p>
<form id="f" toolautosubmit toolname="search_knowledge_form" tooldescription="Search Jack Smyth's source-backed positions and work." action="/search" method="get"><label class="sk" for="q">Search</label><input id="q" name="q" toolparamdescription="Keywords for Jack's profile, positions, apps and writing." placeholder="e.g. how do I get agents to recommend my brand?" autocomplete="off" minlength="2" maxlength="200" required><button type="submit">Search</button></form>
<div id="answer" aria-live="polite"></div></div>
</section>

${bets.map(betSection).join("\n")}

<section id="mcp">
<h2>Use my thinking in your agent</h2>
<p class="rules">A read-only MCP server over this same knowledge base. Every item says whether it is sourced or generated synthesis, and carries source links. No login, no actions, nothing is stored.</p>
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
<p class="rules" id="webmcp-state" role="status">Checking native WebMCP availability…</p>
<p class="rules"><a href="/protocols.json">Protocol scope and limitations</a>. This identity MCP stays read-only. Separately, the <a href="/experiments/wet-lab#guardrails">Wet Lab MCP</a> (<code>/experiments/wet-lab/mcp</code>) exposes live A$100 grant cycles and voting, and <a href="/experiments/leaderbored#for-agents">Leaderbored’s MCP</a> (<code>/experiments/leaderbored/mcp</code>) supports human-approved purchases and credit use.</p>
</section>

<section id="work-with-me" class="work-cta">
  <div class="surface">
    <div>
      <span class="wt">Work with Jack · The Brandtech Group</span>
      <h2>Bring this to your brand.</h2>
      <p>Jack Smyth is Country Lead: Australia at The Brandtech Group. If you’re a CMO looking to measure Share of Model, build a Generative Engine Marketing (GEM) strategy, or run agentic marketing experiments inside your own organisation, let’s talk.</p>
    </div>
    <div class="actions">
      <a class="btn" href="https://linkedin.com/in/jtsmyth" rel="noopener">Connect on LinkedIn →</a>
      <a class="btn ghost" href="https://thebrandtechgroup.com" rel="noopener">The Brandtech Group ↗</a>
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
<p>Jack's home for experiments, apps and thinking, built from public sources. Generated synthesis is labelled and is not Jack Smyth's own words. Structured data and agent endpoints help discoverability; they do not guarantee inclusion in AI answers.</p>
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
const cWrap=document.getElementById('signal-circuit'),cBtn=document.getElementById('circuit-motion-btn');
if(cWrap&&cBtn)cBtn.addEventListener('click',()=>{const p=cWrap.classList.toggle('paused');cBtn.textContent=p?'Play motion':'Pause motion'});
const secs=[...document.querySelectorAll('.bet,#mcp')],links=[...document.querySelectorAll('nav a')];
if ('IntersectionObserver' in window) { const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='/#'+e.target.id))}),{rootMargin:'-40% 0px -55% 0px'}); secs.forEach(s=>observer.observe(s)); }
</script>
<script src="/webmcp.js" defer></script>
${view?.script ? `<script src="${esc(view.script)}" defer></script>` : ""}
</body></html>`;
}
