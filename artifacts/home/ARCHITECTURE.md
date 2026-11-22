# Engineering and trust boundaries

## Canonical content, not disconnected wrappers

`knowledge.ts` owns identity, work, positions and evidence labels.
`experiment-catalog.ts` owns where each experiment fits, its canonical path and
its existing backing service. Server-rendered HTML, Markdown, JSON-LD, JSON,
MCP tools/resources, HTTP adapters and WebMCP read those shared definitions.
The A2A message-only adapter invokes the real identity MCP handlers over the
official SDK's in-memory transport, rather than maintaining a second tool
implementation. OpenAPI input schemas also come from the real tools.

The registered home service explicitly owns `/api/tools` and
`/api/experiments` as well as `/`. These more-specific paths avoid the
pre-existing API scaffold's `/api` catch-all. The old `/api/healthz` remains
owned by that service. A regression check verifies these declared ownership
rules; actual preview/production gateway behaviour still needs checking after
the merge and publication, not merely against localhost.

The three bets describe a progression: differentiation makes a brand worth
choosing; multimodality makes its meaning easier to interpret; anticipation
makes it useful in an agent's workflow. This is editorial framing of Jack's
brief, not a fabricated quotation. Experiments demonstrate the arguments; they
are not three separate businesses or guaranteed performance improvements.

## Read versus act

The identity MCP has seven explicitly read-only, non-destructive, idempotent
tools and three read-only JSON resources. It never contacts a payment API or
runs a product operation. `apply_strategy` selects documented principles
deterministically; another agent supplies its own reasoning model.

Leaderbored has a separate nested MCP relay. Its original service enforces
payment verification, credit ownership, transactional saving and request-ID
deduplication. The new UI requires explicit approval before requesting a claim.
An approval boolean is an attestation, not independent verification that a
human consented. The tools must still be used only with explicit permission.

## Retain the original systems of record

- Facts with Flair: existing public-page safety, source extraction, signed
  snapshots, Flint generation and six-gate review.
- Leaderbored: existing Stripe checkout, production credit ledger, saved ideas
  and atomic/idempotent claim system.
- Core home: no new database, model key, Stripe key or copied customer records.
  Only fixed allowlisted service operations are forwarded.

The transactional MCP relay and JSON adapters forward neither browser cookies
nor caller authorization headers. Receipts and signed source/draft tokens are
sent only in request bodies and remain out of URLs and logs. The browser holds
receipts and pending request IDs only in memory. Refresh/close loses those
values; private receipt backup and saved-history recovery are explicit.

## Bounded failure handling

JSON requests are capped at 300 KiB. Operation schemas strip unknown fields.
Each forwarded JSON operation has a 115-second deadline; at most eight such
operations run per core instance. This is a per-instance resource bound, not a
distributed abuse-control or billing cap. The backing services retain their own
limits and transactional safety. No hidden background generation is introduced.

Public category reads are schema-validated, deduplicated and cached for 30
seconds per instance. Outages show a labelled October 2026 sample snapshot, not
fake live data. Counts are sample theme rows, never market share. Timeouts are
unknown outcomes, not proof that an action failed; claim retries retain the
same receipt/category/request-ID tuple until a confirmed save.

Source extraction can return no structured attributes for a pasted excerpt,
even if its prose mentions numeric facts. The UI exposes that gap and its
warnings; the live check verifies that the returned spec block exactly matches
extraction rather than inventing missing attributes. QA failure is a valid
workflow result, not a claim that the copy is ready to publish.

## Browser and transport protection

- Per-response CSP nonces; no unsafe-inline/eval, no third-party font/script
  dependency, restricted connect/form/base/object policies.
- Framing allowed only by self and the Replit editor, not arbitrary websites.
- No-referrer policy, no-sniff, HTTPS-only HSTS and safe JSON error responses.
- Per-request correlation IDs; error logs contain only method, route template,
  status, duration and ID—not raw URLs, queries, bodies or provider output.
- Content responses default to no-store. Hash-named, OFL-licensed self-hosted
  font files are immutable-cacheable. Compression excludes MCP streams and
  experiment POST responses carrying private capability tokens.
- Forwarded host input cannot rewrite canonical/discovery URLs.

## Verification is scoped

MCP uses the official SDK client. WebMCP was exercised in real Chromium with
experimental features enabled, including imperative calls and a declarative
form result; it was not mocked as native support. Browser state-machine tests
do use explicit network fixtures for checkout, credit claims and provider
failure cases, so they cannot charge or spend credits.

Poppy discovery's document schema is checked with its official offline kit;
HTTPS hosting, redirects and a real personal-agent connection still need a
public deployment. A2A is a tested 1.0 message-only subset, not a conformance
certification. UCP, ACP, AP2 and NLWeb are not implemented. Automated axe checks
cover WCAG A/AA rules at desktop/mobile sizes; they are not a manual
accessibility certification.

See `TEST-EVIDENCE.md` for actual runs and `CONNECT.md` for repeatable commands.
