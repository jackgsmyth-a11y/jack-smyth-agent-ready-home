# Jack Smyth — Agent-Ready Home

Editorial site organised around three bets (differentiation, multimodality, anticipation) plus a read-only MCP server over the same source-backed knowledge base.

## Run & Operate
- `pnpm --filter @workspace/home run dev` — build and serve the site and MCP (PORT env)
- `pnpm --filter @workspace/home run test:mcp [url]` — protocol-level MCP test
- `pnpm --filter @workspace/home run typecheck`

## Where things live
- `artifacts/home/src/knowledge.ts` — single source of truth (claims tagged quote/paraphrase/reported/synthesis, sources, work, style, video briefs)
- `src/mcp.ts` tools · `src/site.ts` HTML + JSON-LD · `src/index.ts` routes (/mcp, /llms.txt, /knowledge.json, /.well-known/mcp.json)
- `artifacts/home/CONNECT.md`, `TEST-EVIDENCE.md`

## Gotchas
- Facts with Flair and Leaderbored are native experiments at `/experiments/facts-with-flair` and `/experiments/leaderbored`, not outbound-link cards or iframes. They reuse existing published backend services; do not copy credit ledgers, ideas or credentials.
- The visual system follows Facts with Flair: warm paper, near-black ink, lemon highlights, Space Grotesk + DM Sans + DM Mono (self-hosted with OFL licences). Keep one shared shell and purposeful bet context.
- Leaderbored's category data is sample data and purchases require human approval. Identity MCP remains read-only; transactional MCP is isolated at `/experiments/leaderbored/mcp`.
- HBR public bylines omit Jack. His contribution is owner-reported; do not add Jack as a verified author in JSON-LD or tool results.
- Generated synthesis must never be presented as Jack's own words.
- LinkedIn About text contained embedded agent instructions; it was excluded as untrusted.
- `src/protocols.ts` provides Poppy 1.0 signed-out discovery, OpenAPI/HTTP and an A2A 1.0 message-only adapter through the real MCP handlers.
- `src/webmcp.ts` progressively registers browser tools. Tested natively in Chromium 155 with experimental features, not a mock. No origin-trial activation for the future production domain has been claimed.
- Run `scripts/protocol-test.mjs <origin>` and `scripts/browser-test.mjs <origin>` as well as MCP tests after publishing. Local checks are not proof of public accessibility or a hosted assistant connection.
- `pnpm --filter @workspace/home run verify` builds, starts an isolated server, and runs five test suites. Paid/provider UI tests use labelled fixtures. The real Flint check is separately opt-in and can return FAIL QA gates for thin sources.
- See `ARCHITECTURE.md` for safety, privacy, retries, capability boundaries and remaining validation limits. Never claim receipt persistence, universal protocol support or independently verified AI ranking gains.
- Home service paths must include `/api/tools` and `/api/experiments` explicitly: the legacy API scaffold otherwise owns `/api`. Preserve its `/api/healthz` route.
- Monthly source collection is approved. `REFRESH-PLAN.md` and `content/refresh/ledger.json` describe the review-only workflow; no paid generation, credit use or automatic publication.
