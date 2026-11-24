import { EXPERIMENTS } from "./experiment-catalog.js";
// Single source of truth for the website, llms.txt, JSON-LD, knowledge.json and the MCP server.
// Every claim is tagged: "quote" (verbatim), "paraphrase" (of a cited source), "reported" (a figure
// stated by the source, not independently verified) or "synthesis" (our reading; never Jack's words).

export type Bet = "differentiation" | "multimodality" | "anticipation";
export type Kind = "quote" | "paraphrase" | "reported" | "synthesis";

export interface Source {
  id: string;
  title: string;
  url: string;
  publisher: string;
  date?: string;
  type: "article" | "talk" | "interview" | "profile" | "research" | "podcast" | "press";
}

export interface Claim {
  id: string;
  bet: Bet | "identity";
  kind: Kind;
  text: string;
  sources: string[];
}

export interface Work {
  id: string;
  title: string;
  type: "experiment" | "app" | "writing" | "talk" | "research" | "product";
  bet: Bet;
  summary: string;
  humanSummary?: string;
  url?: string;
  status: "documented" | "pending-details";
  sources: string[];
  authors?: string[];
  relationship?: string;
  provenanceNote?: string;
  access?: "subscriber-only" | "paywalled";
  service_url?: string;
  experiment?: (typeof EXPERIMENTS)[number];
}

export const SITE = {
  name: "Jack Smyth",
  tagline: "Making brands legible to the most important audience they will never meet: agents.",
  canonicalNote:
    "Source-backed profile of Jack Smyth's public work and published positions, structured for people and AI agents.",
};

export const SOURCES: Source[] = [
  { id: "s-li", title: "Jack Smyth, Country Lead: Australia, The Brandtech Group (LinkedIn)", url: "https://linkedin.com/in/jtsmyth", publisher: "LinkedIn", type: "profile" },
  { id: "s-cta", title: "Jack Smyth, Jellyfish (Campaign Tech Awards finalist profile)", url: "https://www.campaigntechawards.com/finalists/jack-smyth-ln1rh9sun9p0bzs", publisher: "Campaign Tech Awards", type: "profile" },
  { id: "s-brxnd-talk", title: "The Most Important Audience You'll Never Meet (BRXND LA 2025)", url: "https://www.youtube.com/watch?v=MHm_zAgki1s", publisher: "BRXND", date: "2025-02-06", type: "talk" },
  { id: "s-brxnd-session", title: "Share of Model (BRXND LA 2025 session)", url: "https://www.brxnd.ai/sessions/share-of-model", publisher: "BRXND", date: "2025-02-06", type: "talk" },
  { id: "s-brxnd-tt", title: "Tokens & Tactics #13: Using AI to Watch AI Work", url: "https://newsletter.brxnd.ai/p/tokens-and-tactics-13-using-ai-to", publisher: "BRXND Dispatch", date: "2025-09-09", type: "interview" },
  { id: "s-drum-b2a", title: "The B2A revolution: why your brand must win over AI agents", url: "https://www.thedrum.com/open-mic/the-b2a-revolution-why-your-brand-must-win-over-ai-agents", publisher: "The Drum", date: "2025-06-11", type: "article" },
  { id: "s-drum-gem", title: "From GEO to GEM: why CMOs need to think bigger about AI visibility", url: "https://www.thedrum.com/industry-insight/from-geo-to-gem-why-cmos-need-to-think-bigger-about-ai-visibility", publisher: "The Drum", type: "article" },
  { id: "s-drum-pod", title: "As 'agentic AI' dawns, who owns the future?", url: "https://www.thedrum.com/podcast/as-agentic-ai-dawns-who-owns-the-future", publisher: "The Drum", type: "podcast" },
  { id: "s-drum-hire", title: "Brandtech Media hires Jack Smyth as partner to lead Web3, metaverse and gaming strategies", url: "https://www.thedrum.com/profile/the-brandtech-group/article/brandtech-media-hires-jack-smyth-as-partner-to-lead-web3-metaverse-and-gaming-strategies", publisher: "The Drum", date: "2022-05-17", type: "press" },
  { id: "s-btg-yt", title: "YouTube in AI: How the world's AI engines are learning to recommend video", url: "https://thebrandtechgroup.com/youtube-in-ai", publisher: "The Brandtech Group", date: "2026-07", type: "article" },
  { id: "s-hs", title: "Building a brand in the artificial intelligence era: Generative engine marketing (Journal of Brand Strategy 14(4), with John Dawson)", url: "https://doi.org/10.69554/TGWX4999", publisher: "Journal of Brand Strategy", date: "2025", type: "research" },
  { id: "s-mi3", title: "Jellyfish unveils Share of Model platform: a new frontier in gen AI marketing", url: "http://www.mi-3.com.au/05-12-2024/jellyfish-unveils-share-modeltm-platform-new-frontier-gen-ai-marketing", publisher: "Mi3", date: "2024-12-05", type: "press" },
  { id: "s-jf-som", title: "AI is influencing consumer behavior, so the way LLMs 'think' about your brand is more important than ever", url: "https://www.jellyfish.com/en-us/news/jellyfish-launches-the-share-of-model-platform", publisher: "Jellyfish", date: "2024-12-05", type: "press" },
  { id: "s-tp3", title: "Managing Marketing: Unlocking the Power of Agentic AI for Brands", url: "https://www.trinityp3.com/podcasts/unlocking-the-power-of-agentic-ai-for-brands", publisher: "TrinityP3", date: "2026-02-17", type: "podcast" },
  { id: "s-owner", title: "Brief from Jack Smyth for this project", url: "about:owner-brief", publisher: "Jack Smyth (owner-supplied, unpublished)", type: "profile" },
  { id: "s-fwf", title: "Facts with Flair — live experiment", url: "https://jacksmyth.fyi/experiments/facts-with-flair", publisher: "Jack Smyth", type: "profile" },
  { id: "s-lb", title: "Leaderbored — guide for creative agents", url: "https://jacksmyth.fyi/experiments/leaderbored.md", publisher: "Jack Smyth", type: "profile" },
  { id: "s-hbr-2025", title: "Forget What You Know About Search. Optimize Your Brand for LLMs.", url: "https://hbr.org/2025/06/forget-what-you-know-about-seo-heres-how-to-optimize-your-brand-for-llms", publisher: "Harvard Business Review", date: "2025-06-04", type: "article" },
  { id: "s-hbr-2026", title: "LLMs Misunderstand Luxury Brands. Here’s How to Optimize Your Content Strategy for AI.", url: "https://hbr.org/2026/06/llms-misunderstand-luxury-brands-heres-how-to-optimize-your-content-strategy-for-ai", publisher: "Harvard Business Review", date: "2026-06-22", type: "article" },
  { id: "s-adweek", title: "Progressive Marketers Are Tracking a New Metric: Share of Model", url: "https://www.adweek.com/media/marketers-new-metric-share-of-model-llms/", publisher: "ADWEEK", date: "2024-03-11", type: "article" },
  { id: "s-mumbrella", title: "It's video, but not as we know it", url: "https://mumbrella.com.au/john-dawson-jack-smyth-newfronts-opinion-its-video-but-not-as-we-know-it-364220", publisher: "Mumbrella", date: "2016-05-04", type: "article" },
  { id: "s-disrupt", title: "Media Worth Your Attention — interview and transcript", url: "https://disruptorsco.com/media-worth-your-attention/", publisher: "Disruptors Co", type: "interview" },
];

export const CLAIMS: Claim[] = [
  // Identity
  { id: "id-1", bet: "identity", kind: "paraphrase", text: "Jack Smyth is Country Lead: Australia at The Brandtech Group (since August 2025).", sources: ["s-li", "s-tp3"] },
  { id: "id-2", bet: "identity", kind: "paraphrase", text: "Before that he was Chief Solutions Officer for AI, Planning and Insights (CSO:API) at Jellyfish, leading a global team of strategists, researchers and engineers.", sources: ["s-cta", "s-brxnd-session"] },
  { id: "id-3", bet: "identity", kind: "paraphrase", text: "He joined Brandtech Media as Partner in May 2022 to lead global planning, including Web3, metaverse and gaming strategy.", sources: ["s-drum-hire"] },
  { id: "id-4", bet: "identity", kind: "paraphrase", text: "Earlier roles listed on LinkedIn include Mindshare (Global Strategy Partner, then Creative Technology Officer) and Brandtech Consulting.", sources: ["s-li"] },
  { id: "id-5", bet: "identity", kind: "paraphrase", text: "He led development of the Share of Model platform (2024), which analyses how large language models perceive brands, and the Jellyfish Social Agents product.", sources: ["s-cta", "s-jf-som"] },
  { id: "id-6", bet: "identity", kind: "paraphrase", text: "He has spoken at BRXND, DMEXCO and the ANA, and co-authored a Journal of Brand Strategy paper on generative engine marketing.", sources: ["s-cta", "s-brxnd-session", "s-hs"] },
  { id: "id-7", bet: "identity", kind: "paraphrase", text: "He describes his own work as solving big problems for brands, and builds proof-of-concept products himself, for example with Replit.", sources: ["s-brxnd-tt"] },

  // Differentiation
  { id: "d-1", bet: "differentiation", kind: "quote", text: "B2A is ‘brand-to-agent’ marketing.", sources: ["s-drum-b2a"] },
  { id: "d-2", bet: "differentiation", kind: "paraphrase", text: "AI agents are becoming an audience in their own right: they browse, compare brands, choose products and complete tasks, so brands must be understandable to agents as well as people.", sources: ["s-drum-b2a", "s-brxnd-talk"] },
  { id: "d-3", bet: "differentiation", kind: "quote", text: "why would my agent choose you?", sources: ["s-drum-b2a"] },
  { id: "d-4", bet: "differentiation", kind: "paraphrase", text: "Analyse a brand from the agent's point of view: start at the point of purchase and work backwards to what an agent would read, see, watch and compare.", sources: ["s-drum-b2a"] },
  { id: "d-5", bet: "differentiation", kind: "paraphrase", text: "Share of Model measures how LLMs perceive brands using metrics such as mention rate, average position and category associations.", sources: ["s-hs", "s-jf-som"] },
  { id: "d-6", bet: "differentiation", kind: "quote", text: "Not ‘are we doing GEO?’ but ‘do we have a GEM strategy?’", sources: ["s-drum-gem"] },
  { id: "d-7", bet: "differentiation", kind: "paraphrase", text: "Generative engine marketing (GEM) has three legs: GEO as the organic foundation (citable, accurate, structured content), paid placement inside AI surfaces, and earned/creator media as the signal that trains models. Treating GEO as only a technical-SEO task is too narrow.", sources: ["s-drum-gem", "s-hs"] },
  { id: "d-8", bet: "differentiation", kind: "paraphrase", text: "Third-party authority drives how models represent a brand, so influencer and earned strategy is quietly part of GEO strategy.", sources: ["s-drum-gem"] },
  { id: "d-9", bet: "differentiation", kind: "reported", text: "The B2A article reports conversion-rate improvements of up to 69% from optimising for agents browsing on behalf of customers, and a Brandtech forecast of seven active agents per customer by 2026 in beauty, auto and travel.", sources: ["s-drum-b2a"] },
  { id: "d-10", bet: "differentiation", kind: "synthesis", text: "Applied to a person or small brand: be the clearest, most citable answer in your niche. State who you are and what you believe in plain, structured language, publish it where machines can read it, and give agents a callable interface.", sources: ["s-drum-b2a", "s-drum-gem", "s-owner"] },

  // Multimodality
  { id: "m-1", bet: "multimodality", kind: "quote", text: "A paragraph of text tells an AI what a brand claims. A video can show it", sources: ["s-btg-yt"] },
  { id: "m-2", bet: "multimodality", kind: "paraphrase", text: "Brandtech's analysis of millions of local prompts found YouTube to be the platform AI engines recommend most, and the only video or social platform appearing in every category studied.", sources: ["s-btg-yt"] },
  { id: "m-3", bet: "multimodality", kind: "reported", text: "Reported figures: YouTube appears in more than 1 in 4 AI-generated answers across tracked categories, and about three in four cited YouTube links are long-form rather than Shorts; about 1 in 7 long-form citations point to an exact timestamp.", sources: ["s-btg-yt"] },
  { id: "m-4", bet: "multimodality", kind: "paraphrase", text: "Cited videos are structured like an answer before an AI touches them: comparisons, dated reviews and buying guides, with a clear question in the title and a direct verdict. Subscriber count mattered far less than structure.", sources: ["s-btg-yt"] },
  { id: "m-5", bet: "multimodality", kind: "paraphrase", text: "Strongest performers combine long-form video that gives AI something specific to cite, Shorts that build the audience, and brand content around both.", sources: ["s-btg-yt"] },
  { id: "m-6", bet: "multimodality", kind: "paraphrase", text: "The models behind agents can read text, view images, listen to audio and watch video, so multimodal brand assets are part of how agents evaluate you.", sources: ["s-drum-b2a"] },
  { id: "m-7", bet: "multimodality", kind: "paraphrase", text: "Jack uses one multimodal model to watch another AI service work, screen-recording an agent and asking Gemini to explain what it is doing.", sources: ["s-brxnd-tt"] },
  { id: "m-8", bet: "multimodality", kind: "synthesis", text: "Applied to a person or small brand: express your core idea as question-led video with a transcript, chapters and a direct verdict, then pair it with a written canonical version so humans and agents can both cite it.", sources: ["s-btg-yt", "s-owner"] },

  // Anticipation
  { id: "a-1", bet: "anticipation", kind: "quote", text: "Optimizing your CTAi, or call-to-agent, will become a core part of marketing.", sources: ["s-drum-b2a"] },
  { id: "a-2", bet: "anticipation", kind: "paraphrase", text: "Agents will increasingly act on customers' behalf, from simple commerce to holidays, cars, credit cards and mortgages; Amazon's Buy For Me and Perplexity's Buy With Pro were cited as early signs.", sources: ["s-drum-b2a"] },
  { id: "a-3", bet: "anticipation", kind: "paraphrase", text: "Agentic AI is framed as a new operating system for brands, creativity, growth and talent.", sources: ["s-tp3"] },
  { id: "a-4", bet: "anticipation", kind: "paraphrase", text: "Jellyfish Social Agents, pioneered under Jack's leadership, research, analyse and recommend social optimisations in minutes, using multimodal analysis of text, image, video and audio.", sources: ["s-cta"] },
  { id: "a-5", bet: "anticipation", kind: "paraphrase", text: "In 2018 Jack trained a model on a year of cricket matches to predict highlight moments and alert pay-per-view subscribers.", sources: ["s-brxnd-tt"] },
  { id: "a-6", bet: "anticipation", kind: "paraphrase", text: "With tools such as Replit and Stripe, he describes the shift from MVP to MVB, the minimum viable business, built in minutes.", sources: ["s-brxnd-tt"] },
  { id: "a-7", bet: "anticipation", kind: "paraphrase", text: "He built Agent Audit, a proof of concept that recommends website changes to improve shopping-agent conversion.", sources: ["s-brxnd-tt"] },
  { id: "a-8", bet: "anticipation", kind: "synthesis", text: "Applied to a person or small brand: do not wait to be asked. Expose tools that let an agent retrieve your view, apply your framework to its user's problem, and return an attributed answer.", sources: ["s-drum-b2a", "s-owner"] },
];

export const WORKS: Work[] = [
  { id: "w-som", title: "Share of Model", type: "product", bet: "differentiation", summary: "Platform from Jellyfish that analyses how LLMs perceive brands, products and services. Jack led its 2024 development.", url: "https://shareofmodel.ai/", status: "documented", sources: ["s-cta", "s-jf-som", "s-mi3"] },
  { id: "w-gem-paper", title: "Building a brand in the artificial intelligence era: Generative engine marketing", type: "research", bet: "differentiation", summary: "Journal of Brand Strategy 14(4), 2025, with John Dawson. Introduces GEM as a framework for AI systems acting as gatekeepers, audiences and buyers.", url: "https://doi.org/10.69554/TGWX4999", status: "documented", sources: ["s-hs"], authors: ["Jack Smyth", "John Dawson"] },
  { id: "w-geo-gem", title: "From GEO to GEM", type: "writing", bet: "differentiation", summary: "The Drum: why AI visibility needs organic, paid and earned legs.", url: SOURCES.find((s) => s.id === "s-drum-gem")!.url, status: "documented", sources: ["s-drum-gem"], authors: ["Jack Smyth"] },
  { id: "w-b2a", title: "The B2A revolution", type: "writing", bet: "differentiation", summary: "The Drum: brand-to-agent as an audience, the CTAi, and why brands must be chosen by agents.", url: SOURCES.find((s) => s.id === "s-drum-b2a")!.url, status: "documented", sources: ["s-drum-b2a"], authors: ["Jack Smyth"] },
  { id: "w-fwf", title: "Facts with Flair", type: "experiment", bet: "differentiation", summary: "Differentiation in practice, inside this site: the same product facts reframed around a clearer buying decision. Compare eight source-backed Australian retailer examples, then optimise a public product URL. Flint from Springboards drafts and reviews six QA gates through the existing service. These are editorial illustrations, not measured ranking gains.", url: EXPERIMENTS[0].path, service_url: EXPERIMENTS[0].service, experiment: EXPERIMENTS[0], status: "documented", sources: ["s-fwf"] },
  { id: "w-hbr-2025", title: "Forget What You Know About Search. Optimize Your Brand for LLMs.", type: "writing", bet: "differentiation", summary: "Harvard Business Review, June 2025. On brand discovery as consumers use generative AI for recommendations. Public byline: David Dubois, John Dawson and Akansh Jaiswal. Jack identifies this as work he contributed to; his contribution is owner-reported, not verified by the public byline. Full article is subscriber-only.", humanSummary: "Harvard Business Review, June 2025. On brand discovery as consumers turn to generative AI for recommendations.", url: "https://hbr.org/2025/06/forget-what-you-know-about-seo-heres-how-to-optimize-your-brand-for-llms", status: "documented", sources: ["s-hbr-2025"], authors: ["David Dubois", "John Dawson", "Akansh Jaiswal"], relationship: "Owner-reported contribution; Jack is not listed in the public byline.", provenanceNote: "Contributed (owner-reported; non-bylined)", access: "subscriber-only" },
  { id: "w-hbr-2026", title: "LLMs Misunderstand Luxury Brands. Here’s How to Optimize Your Content Strategy for AI.", type: "writing", bet: "differentiation", summary: "Harvard Business Review, June 2026. On how machines interpret luxury-brand meaning and how content strategy must adapt. Public byline: David Dubois, Allison R. Hess, John Dawson and Akansh Jaiswal. Jack identifies this as work he contributed to; his contribution is owner-reported, not verified by the public byline. Full article is subscriber-only.", humanSummary: "Harvard Business Review, June 2026. On how AI models interpret luxury-brand meaning and how content strategy must adapt.", url: "https://hbr.org/2026/06/llms-misunderstand-luxury-brands-heres-how-to-optimize-your-content-strategy-for-ai", status: "documented", sources: ["s-hbr-2026"], authors: ["David Dubois", "Allison R. Hess", "John Dawson", "Akansh Jaiswal"], relationship: "Owner-reported contribution; Jack is not listed in the public byline.", provenanceNote: "Contributed (owner-reported; non-bylined)", access: "subscriber-only" },
  { id: "w-adweek", title: "Progressive Marketers Are Tracking a New Metric: Share of Model", type: "writing", bet: "differentiation", summary: "Jack's March 2024 ADWEEK article: measuring how LLMs perceive your brand will become essential. Byline and publication date verified on ADWEEK's contributor page; full article is subscription-only.", humanSummary: "ADWEEK, March 2024. Why measuring how LLMs perceive your brand is becoming essential.", url: "https://www.adweek.com/media/marketers-new-metric-share-of-model-llms/", status: "documented", sources: ["s-adweek"], authors: ["Jack Smyth"], access: "subscriber-only" },

  { id: "w-yt-ai", title: "YouTube in AI", type: "research", bet: "multimodality", summary: "Brandtech research on why AI engines recommend YouTube and which videos get cited (July 2026).", url: SOURCES.find((s) => s.id === "s-btg-yt")!.url, status: "documented", sources: ["s-btg-yt"], authors: ["Jack Smyth"] },
  { id: "w-field-lab", title: "Agentic Field Lab", type: "experiment", bet: "multimodality", summary: "Frontier AI labs make research teams pitch for compute; here, three competing marketing agent teams (mapped to Jack's three bets) pitch falsifiable experiments for a hard-capped A$100 AUD monthly Google Ads grant, get scored by a calibrated Judge Agent, open for public human and agent voting, and publish honest Bayesian verdicts for CMOs.", url: EXPERIMENTS[2].path, service_url: EXPERIMENTS[2].service, experiment: EXPERIMENTS[2], status: "documented", sources: ["s-btg-yt", "s-drum-b2a"] },
  { id: "w-brxnd-talk", title: "The Most Important Audience You'll Never Meet", type: "talk", bet: "multimodality", summary: "BRXND LA 2025 talk (11 minutes) on how LLMs perceive brands and agents as an audience.", url: "https://www.youtube.com/watch?v=MHm_zAgki1s", status: "documented", sources: ["s-brxnd-talk", "s-brxnd-session"] },
  { id: "w-watch-ai", title: "Using AI to watch AI work", type: "writing", bet: "multimodality", summary: "BRXND Tokens & Tactics interview on screen-recording one AI service and having Gemini interpret it.", url: SOURCES.find((s) => s.id === "s-brxnd-tt")!.url, status: "documented", sources: ["s-brxnd-tt"] },
  { id: "w-mumbrella", title: "It's video, but not as we know it", type: "writing", bet: "multimodality", summary: "With John Dawson, May 2016. A NewFronts dispatch about how digital publishers pitch video like TV networks. The visible introduction establishes co-authorship; the remaining archive is paywalled.", humanSummary: "With John Dawson, May 2016. A NewFronts dispatch on how digital publishers pitch video like TV networks.", url: "https://mumbrella.com.au/john-dawson-jack-smyth-newfronts-opinion-its-video-but-not-as-we-know-it-364220", status: "documented", sources: ["s-mumbrella"], authors: ["John Dawson", "Jack Smyth"], access: "paywalled" },
  { id: "w-disrupt", title: "Media Worth Your Attention", type: "talk", bet: "multimodality", summary: "Disrupt podcast interview from Jack's Mindshare era, with a public transcript. On creating communications worth people's time and building utility rather than simply interrupting.", url: "https://disruptorsco.com/media-worth-your-attention/", status: "documented", sources: ["s-disrupt"] },

  { id: "w-leaderbored", title: "Leaderbored", type: "experiment", bet: "anticipation", summary: "Anticipation in practice, inside this site: an agency for agents. Browse sample category context; the human approves a budget; Flint from Springboards supplies a concept, execution and distinction. Ten credits cost A$1.00; each saved idea costs one and is not resold within Leaderbored. Payment and credit use require human approval. Existing credits and ideas remain in the original service. Sample patterns are not verified research; external originality and results are not guaranteed.", url: EXPERIMENTS[1].path, service_url: EXPERIMENTS[1].service, experiment: EXPERIMENTS[1], status: "documented", sources: ["s-lb"] },
  { id: "w-agent-audit", title: "Agent Audit", type: "app", bet: "anticipation", summary: "Proof of concept, built with Replit, that suggests what to change on a website to improve shopping-agent conversion.", url: "https://agentaudit.com.au/", status: "documented", sources: ["s-brxnd-tt"] },
  { id: "w-social-agents", title: "Jellyfish Social Agents", type: "product", bet: "anticipation", summary: "Autonomous social agents that research, analyse and recommend optimisations; powered by Gemini's multimodal capabilities.", status: "documented", sources: ["s-cta"] },
  { id: "w-cricket", title: "Cricket highlight predictor (2018)", type: "experiment", bet: "anticipation", summary: "A model trained to anticipate interesting moments in live cricket and alert pay-per-view subscribers.", url: "https://www.foxsports.com.au/monty", status: "documented", sources: ["s-brxnd-tt"] },
  { id: "w-agentic-pod", title: "Unlocking the Power of Agentic AI for Brands", type: "talk", bet: "anticipation", summary: "Managing Marketing podcast with Angela Tangas and Darren Woolley (Feb 2026).", url: SOURCES.find((s) => s.id === "s-tp3")!.url, status: "documented", sources: ["s-tp3"] },
];

export const BETS: Record<Bet, { n: number; title: string; question: string; thesis: string; home: string }> = {
  differentiation: {
    n: 1, title: "Differentiation",
    question: "Why would an agent shortlist you?",
    thesis: "Agents compare, filter and choose before a human ever clicks. To win preference, a brand must be the clearest, most citable answer—and measure how models actually describe it.",
    home: "Facts with Flair · Team 01",
  },
  multimodality: {
    n: 2, title: "Multimodality",
    question: "How do you show an agent—not just tell it?",
    thesis: "Text tells an AI what a brand claims; video proves it. Models now watch, listen and cite timestamps—making structured YouTube and multimodal evidence the strongest signal a brand can publish.",
    home: "YouTube-in-AI · Team 02",
  },
  anticipation: {
    n: 3, title: "Anticipation",
    question: "Can an agent act on you without asking?",
    thesis: "Discovery is no longer the finish line. As agents buy, book and brief on our behalf, marketing shifts from call-to-action to call-to-agent (CTAi): exposing clean interfaces agents can use directly.",
    home: "Leaderbored · Team 03",
  },
};

export const STYLE_PRINCIPLES: { id: string; principle: string; kind: Kind; sources: string[] }[] = [
  { id: "st-1", principle: "Name the shift with a short coined term (B2A, CTAi, GEM, MVB) and define it in one line.", kind: "synthesis", sources: ["s-drum-b2a", "s-drum-gem", "s-brxnd-tt"] },
  { id: "st-2", principle: "Make the point in short, standalone lines; use a one-sentence paragraph for the claim that matters.", kind: "synthesis", sources: ["s-drum-b2a", "s-drum-gem"] },
  { id: "st-3", principle: "Anchor claims in measured evidence (prompt-scale studies, named metrics) and state the sample.", kind: "synthesis", sources: ["s-btg-yt", "s-hs"] },
  { id: "st-4", principle: "Take the agent's point of view: start at the point of purchase and walk backwards.", kind: "paraphrase", sources: ["s-drum-b2a"] },
  { id: "st-5", principle: "Prove with a build: a working proof of concept beats a prediction.", kind: "synthesis", sources: ["s-brxnd-tt", "s-cta"] },
  { id: "st-6", principle: "Keep the tone practical and a little playful; no hype, concrete workflows.", kind: "synthesis", sources: ["s-brxnd-tt"] },
  { id: "st-7", principle: "Reframe a familiar practice as insufficient, then extend it (GEO → GEM; search → answer; MVP → MVB).", kind: "synthesis", sources: ["s-drum-gem", "s-brxnd-tt"] },
];

export const SOURCE_GAPS: string[] = [
  "HBR: both articles were located through John Dawson and David Dubois. Jack's contribution is owner-reported; neither public byline lists him. Published authors are retained accurately. Full text is subscriber-only.",
  "Mi3 coverage: only the December 2024 Share of Model launch article was located; its full text was not read.",
  "The Drum podcast \"As agentic AI dawns, who owns the future?\" was located but not transcribed.",
  "LinkedIn profile caches conflict on location. Country Lead: Australia is corroborated by Brandtech and TrinityP3; Sydney is owner-profile reporting, not an independently verified current location.",
  "App descriptions were checked against the public Facts with Flair page and Leaderbored agent guide. This profile does not execute their paid tools or claim their commercial results.",
  "Video: no produced footage is included; the multimodality bet carries production briefs and one existing public talk.",
];

export const VIDEO_BRIEFS = [
  { id: "vb-1", title: "What is B2A? (Differentiation)", format: "Long-form, 8–12 min, question-led title", brief: "Open with the question an agent would be asked. Walk backwards from the point of purchase. End with a direct verdict and three chapters with timestamps.", transcript: "Publish full transcript and a canonical written summary on this site." },
  { id: "vb-2", title: "Show, don't claim: why AI cites video (Multimodality)", format: "Comparison / demo, 6–10 min", brief: "Screen-record an agent answering a category question, then show which video it cited and the exact moment. Narrate the structure that earned the citation.", transcript: "Chapters labelled as questions; timestamps listed on the page." },
  { id: "vb-3", title: "Watching an agent shop on my behalf (Anticipation)", format: "Screen recording + commentary, 5–8 min", brief: "Record a browsing agent completing a task, use a second model to interpret it, then show what a site change would do to the outcome.", transcript: "Step-by-step log with the model's decisions quoted." },
  { id: "vb-4", title: "Shorts: one idea, one line", format: "Vertical, 20–45 sec", brief: "Each Short states one position (for example: 'Not GEO, GEM') and points to the long-form video it came from.", transcript: "Caption text equals the position's canonical wording." },
];

export function sourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}
export function sourceRefs(ids: string[]) {
  return ids.map((id) => sourceById(id)).filter(Boolean) as Source[];
}
