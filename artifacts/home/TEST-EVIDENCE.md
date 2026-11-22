# Agent accessibility test evidence — 2026-11-21

## Current implementation

The unified experiment version was tested with `NODE_ENV=production` using the
isolated server started by `pnpm --filter @workspace/home run verify`.
These are **local execution results, not production accessibility results**.
Deployment inspection still reported `isDeployed: false`, no successful
deployment build, and no public origin on November 21, 2026. The source project's
`home` web artifact is registered. There is no claimed public or hosted-assistant
connection for this revision.

| Test | Result | What it proves |
|---|---|---|
| TypeScript typecheck | PASS | Current source compiles without type errors |
| Production bundle | PASS | Current server bundle builds |
| Official MCP client SDK | 26/26 PASS | Initialise, seven tools, annotations, three resources, evidence labels and invalid input |
| HTTP/protocol script | 50/50 PASS | Real app/HBR content, source attribution, Poppy discovery, OpenAPI/HTTP calls, A2A direct messages, negative cases, CORS, Markdown negotiation and structured data |
| Native Chromium browser/CDP | 9/9 PASS | 1280px and 390px overflow, app links, working human search, native WebMCP discovery, imperative tool execution, declarative form result, no uncaught exceptions |
| Native experiment HTTP/security | 46/46 PASS | Actual datasets, provenance, same-origin canonicals, CSP nonces, fixed validated adapters, safe errors, cache/compression, central agent guide, declared gateway ownership and free live child MCP catalog |
| Experiment browser/accessibility | 33/33 PASS | Three pages at 1280/390px, real fonts, no overflow/CSP errors, zero automated WCAG A/AA violations, explicit fixture-based checkout/claim/failure/retry flows |
| Official Poppy kit offline validator | 7 PASS, 0 FAIL, 7 SKIP | Discovery JSON schema only; network/HTTPS/redirect checks skipped, not passed |

The five app suites contain **164 assertions**. The axe result is automated
rule coverage, not a manual accessibility certification. Paid/provider browser
flows use intercepted fixtures, explicitly identified in their output; they
cannot prove real Stripe payment completion or a paid idea claim.

### Live Facts with Flair run

The opt-in `live-flair-test.mjs` made one draft and one review call through the
integrated adapter using the existing Flint service. The retailer blocked the
direct read; its dated excerpt was supplied through the real paste fallback.
The pipeline returned a narrative, three supported-line records and all six QA
gates. The returned spec block exactly matched extraction: **zero attributes**.
QA correctly remained **FAIL** (gates 1, 3, 4 and 5); the UI exposes thin-source
warnings rather than calling the result ready to publish.

An initial test incorrectly required a nonempty spec block. Inspection of the
source service and a separate extraction-only check confirmed that this excerpt
produced zero structured specs. The assertion was corrected to require exact
preservation, not invention; the bounded full workflow was then rerun and passed
the execution checks. This is not a claim that the generated copy passed QA.
Signed intermediate snapshots were neither printed nor stored. No checkout,
payment or paid idea credit was used.

### Deployment routing

Inspection caught a conflict invisible to localhost tests: a pre-existing
registered API service owns `/api`. The home service now explicitly declares
`/api/tools` and `/api/experiments` as more-specific owned paths. A static
registration regression check verifies longest-prefix ownership and preservation
of the old health route. This is configuration evidence, not yet a live Replit
gateway or production smoke test.

Native browser: **Chromium 155.0.8059.79**, headless, experimental features enabled.
`document.modelContext` existed natively; it was not replaced or mocked.
Tools discovered: `apply_strategy`, `get_positions`, `get_profile`, `get_style_guide`,
`get_work`, `list_work`, `search`, `search_knowledge_form`.
`get_work({id:"w-fwf"})` actually returned the native Facts with Flair experiment
path, its original service URL and provenance.
Executing the declarative form with `{q:"Flint"}` returned matching source-backed
search results through `SubmitEvent.respondWith`.

The test found and fixed a browser compatibility issue: older trial browsers
pass a ModelContextClient as the execute callback's second argument, rather than
an AbortSignal. The adapter now forwards a fetch signal only when it is a real
AbortSignal.

### Reproduce

```
pnpm --filter @workspace/home run verify
# Optional separate provider calls (requires an already-running server):
node artifacts/home/scripts/live-flair-test.mjs http://127.0.0.1:5181 --allow-model-call
```

The Poppy kit was downloaded from its official implementation-kit URL, with its
validator unchanged. `check --file` was run against the emitted discovery JSON
with HTTPS URL generation. It did not perform a public-domain validation.

### Separate public Leaderbored check

Using the official MCP client SDK against
`https://leaderbored.replit.app/api/agent/mcp`:

```
Leaderbored public MCP: initialize OK; tools:
leaderbored_catalog, leaderbored_category, leaderbored_trends,
leaderbored_checkout, leaderbored_credit_status, leaderbored_claim,
leaderbored_retrieve, leaderbored_history
Free catalog call: success; no purchase or credit use attempted
```

This validates the link to Jack's separate public app, **not** the publication
of this home site.

### Still not verified

- Public HTTPS origin, redirects and access of the home site after publishing.
- A connection from a hosted assistant (such as Meta Muse, Gemini or Claude).
- Native WebMCP on arbitrary browsers without experimental features or a valid
  origin trial for the production domain.
- Full A2A conformance; the adapter is a tested, stateless, message-only subset.
- Poppy account access or session identity (deliberately not implemented).
- Commerce/payment protocols (UCP/ACP/AP2), not applicable here.
- HBR's public bylines do not list Jack. His contribution remains owner-reported.

## Archived initial run (before content enrichment)

The following earlier run predates replacing the app placeholders and adding
the extra protocols. It is retained only as historical evidence.

Command: `pnpm --filter @workspace/home run test:mcp http://127.0.0.1:5173/mcp` (official MCP client SDK, Streamable HTTP)
Run: 2026-11-21T05:10:47Z

```
PASS  initialize handshake  — jack-smyth-thinking@0.1.0
PASS  tools/list exposes 7 tools  — apply_strategy, get_positions, get_profile, get_style_guide, get_work, list_work, search
PASS  every tool has description + input schema
PASS  get_profile: identity + 3 bets, sourced
PASS  get_profile: states limitations
PASS  get_positions(differentiation): all in-bet, labelled
PASS  get_positions: synthesis labelled as not Jack's words
PASS  get_positions: every item has source URLs
PASS  get_positions(include_synthesis=false) omits synthesis
PASS  list_work(anticipation) includes Leaderbored placeholder
PASS  list_work(type filter)
PASS  get_work returns item with sources
PASS  get_work unknown id → isError
PASS  get_style_guide: principles + video briefs
PASS  search returns relevant, sourced hits
PASS  search with no match returns empty set
PASS  apply_strategy labelled as generated synthesis
PASS  apply_strategy picks relevant bets + sourced principles
PASS  apply_strategy returns framework questions
PASS  apply_strategy: no impersonation (no synthesis item marked as quote)
PASS  input validation rejects too-short brief

21/21 checks passed against http://127.0.0.1:5173/mcp
```
