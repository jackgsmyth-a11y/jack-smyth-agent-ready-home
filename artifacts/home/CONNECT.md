# Connect your agent to Jack Smyth's MCP

Endpoint (Streamable HTTP, stateless, read-only, no auth): `<your-deployed-origin>/mcp`
Server card: `/.well-known/mcp.json` · Also: `/llms.txt`, `/index.md`, `/knowledge.json`

Client config:
```json
{ "mcpServers": { "jack-smyth": { "type": "http", "url": "https://<your-origin>/mcp" } } }
```
Test: `pnpm --filter @workspace/home run test:mcp https://<your-origin>/mcp`

Tools: get_profile, get_positions, list_work, get_work, get_style_guide, search, apply_strategy.
Rules: every item is labelled SOURCED or GENERATED SYNTHESIS. Synthesis is never Jack's words.
Content lives in `src/knowledge.ts`; the site, llms.txt, JSON-LD and MCP all read it.

## Protocol coverage (November 21, 2026)

All identity channels use the **same MCP handlers** and validation. `apply_strategy` is deterministic,
keyword-based selection of documented principles, not an LLM or a conversation with Jack.

| Interface | Entry point | Scope |
|---|---|---|
| Identity MCP | `/mcp` | Seven stateless read-only tools, three resources, explicit annotations and server instructions; official SDK client tested |
| Experiment MCP | `/experiments/leaderbored/mcp` | Relay to the existing transactional service, separate from identity tools. Catalog read tested; no real purchase/credit use performed. |
| Personal Agent Protocol (Poppy 1.0) | `/.well-known/poppy.json` | Signed-out discovery of identity MCP/OpenAPI, the separate experiment MCP and website. No OAuth/session identity; Poppy session claims are not trusted or forwarded. Product actions still require human permission. |
| OpenAPI 3.1 | `/openapi.json` | Lists `/api/tools` and validated `/api/tools/call` with schemas generated from the real tools |
| A2A 1.0 JSON-RPC | `/.well-known/agent-card.json` → `/a2a` | `SendMessage` returns a direct message. No stored tasks, streaming or push. `ListTasks` is empty; unknown tasks return not-found. |
| WebMCP | Native `document.modelContext` (legacy `navigator.modelContext`) | Seven imperative read-only tools plus the declarative search form. Requires a browser supporting the experimental API. Never mocked as native support. |
| HTML/Markdown/JSON-LD | `/`, `/llms.txt`, `/index.md`, `/agents.md`, `/knowledge.json` | Server-rendered, crawlable. The experiment pages also negotiate Markdown and have dedicated `.md` guides. |

UCP, ACP, AP2 and NLWeb are **not implemented or advertised**. The identity
service remains read-only; the nested Leaderbored experience uses its existing
Stripe/credit/MCP infrastructure, not a pretend UCP or payment-mandate adapter.

## One experience, existing services

Facts with Flair and Leaderbored are now **native experiment pages**:
`/experiments/facts-with-flair` and `/experiments/leaderbored`. They are not
iframes. Both use the same shell, navigation, paper/ink/lemon tokens and
self-hosted DM Sans, Space Grotesk and DM Mono fonts.

Eight original retailer comparisons and their provenance are retained. The
Facts live workflow uses a fixed, validated adapter to the existing
extraction/draft/review service. Signed snapshots remain in memory and are not
printed or stored. Retailer blocks expose the paste fallback; source warnings,
empty spec blocks, thin-source flags and failed QA remain explicit.

Leaderbored category context, checkout verification, credit fulfilment, claim
transactions and saved ideas stay in its existing service/database. No balances
or customer records are copied. Stripe checkout is a deliberate external
hand-off in a new tab; return to the experiment to verify the same receipt.
Claims require an approval checkbox plus verified credits. Retry request IDs
are preserved per receipt/category in memory until success. After reloading,
restore the privately backed-up receipt and inspect history before a new claim.
There is no promise of cross-reload idempotency without the original request ID.

`approved: true` is a caller attestation, not cryptographic proof of human
consent. The existing service enforces actual payment/credit possession.
Never expose these action interfaces as if asking Jack's identity MCP could
authorize spending.

### A2A example

POST `/a2a`, `Content-Type: application/json`, `A2A-Version: 1.0`:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "SendMessage",
  "params": {
    "message": {
      "role": "ROLE_USER",
      "messageId": "your-unique-message-id",
      "parts": [{"data": {"tool": "get_profile", "arguments": {}}}]
    }
  }
}
```

A text part invokes `apply_strategy`; structured `{tool, arguments}` requests a
specific read-only tool. Output is an MCP content envelope in a data part and
always marks synthesized advice as not Jack speaking. Stateless means no
conversational memory, even if a context ID is echoed.

### Re-run before and after publishing

Full verification, including starting and cleaning up an isolated local server:
```
pnpm --filter @workspace/home run verify
```
This performs no checkout, paid idea claim or model call. It does make free
read-only requests to the existing Leaderbored service. Browser state-machine
tests intercept paid/provider operations with explicitly labelled fixtures.

Individual checks, while a local server is running on port 5181:
```
pnpm --filter @workspace/home run typecheck
pnpm --filter @workspace/home run build
node artifacts/home/scripts/mcp-test.mjs http://127.0.0.1:5181/mcp
node artifacts/home/scripts/protocol-test.mjs http://127.0.0.1:5181
node artifacts/home/scripts/browser-test.mjs http://127.0.0.1:5181
node artifacts/home/scripts/experiments-test.mjs http://127.0.0.1:5181
node artifacts/home/scripts/experiments-browser-test.mjs http://127.0.0.1:5181
```
Optional bounded provider run (one draft and one review, no regeneration):
```
node artifacts/home/scripts/live-flair-test.mjs http://127.0.0.1:5181 --allow-model-call
```
The opt-in run verifies workflow execution, not a guaranteed QA pass or ranking
improvement. A real thin-source run returned FAIL gates; this is exposed, not
silently converted into a successful copy-quality result.
After publishing, use the **actual production origin returned by Replit** in
place of the localhost origin, and `/mcp` for the MCP test. Confirm public
visibility first. No published URL is invented in this guide.

The official Poppy implementation kit's offline validator was also run against
the emitted discovery JSON. It validates document shape only; it does not prove
HTTPS hosting, redirects, a session implementation or use by Meta Muse/Sierra.

### Source and attribution rules

- Facts with Flair was verified from `/@jackgsmyth/Pencil-Product-Copy` and its public site.
- Leaderbored was verified from `/@jackgsmyth/Leaderbored-idea-marketplace`, its agent guide and a free live catalog MCP call. No payment or credit use was tested.
- The two HBR articles were located using John Dawson and David Dubois. Jack's contribution is owner-reported. The public bylines omit Jack, so published authors are retained in structured data and no verified Jack author credit is asserted.
- ADWEEK author/date verified on its contributor page; Mumbrella co-authorship verified in its public introduction. Full subscriber-only text was not read or reproduced.

### Protocol references

- https://personalagentprotocol.org/docs/1.0/spec
- https://personalagentprotocol.org/kit/company
- https://a2a-protocol.org/v1.0.0/specification/
- https://developer.chrome.com/docs/ai/webmcp/imperative-api
- https://developer.chrome.com/docs/ai/webmcp/declarative-api
- https://developers.google.com/merchant/ucp
- https://ap2-protocol.org/
