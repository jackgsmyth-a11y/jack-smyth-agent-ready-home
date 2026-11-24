# jacksmyth.fyi — Dual-Audience Engineering & Design Contract

This repository powers **jacksmyth.fyi** (`artifacts/home/`), Jack Smyth's dual-audience home for humans and AI agents.

## The Dual-Audience Rule of Thumb

Never treat human design and agent design as a zero-sum trade-off on the visual layer:

1. **Layout & visual rhythm — 100% human.**
   - Agents read the DOM, semantic HTML, JSON-LD, Markdown (`/llms.txt`), and MCP—not CSS whitespace.
   - Keep visual rhythm balanced across the full `1180px` container: avoid lopsided side-by-side columns where one side runs out early.
   - Keep the warm editorial palette (`#f6f4ee`, `#171714`, `#f2f64a`, `#626800`, `#3f6156`, `#696718`) cohesive; use CSS custom properties (`--surface`, `--surface-alt`, `--card`) rather than hardcoded `#fffefa` so `AGENT` lens (`data-lens="agent"` on `<html>` and `<body>`) preserves contrast on every page.

2. **Semantics, schema & MCP — 100% agent.**
   - `artifacts/home/src/knowledge.ts` and `artifacts/home/src/experiment-catalog.ts` are the single source of truth for HTML, Markdown (`/llms.txt`, `/index.md`), JSON-LD, `/knowledge.json`, MCP (`/mcp`), OpenAPI (`/openapi.json`), A2A (`/.well-known/agent-card.json`), Poppy (`/.well-known/poppy.json`), and WebMCP.
   - Keep the identity MCP (`/mcp`) strictly read-only, non-destructive, and idempotent. Never invoke transactional experiment actions (`/experiments/leaderbored/mcp`, `/experiments/field-lab/mcp`) from identity tools.
   - Keep `Cache-Control: no-store` on transactional/experiment/POST/MCP routes; allow short public caching (`public, max-age=300, stale-while-revalidate=3600`) on public read-only pages and discovery endpoints.
   - Never expose internal `s-owner` (`about:owner-brief`) URLs in public JSON, MCP, or HTML outputs.

3. **Copy & provenance — where the two audiences genuinely negotiate.**
   - Preserve strict epistemic hygiene (`SOURCED` vs `GENERATED SYNTHESIS`, accurate published bylines, `owner-reported` provenance).
   - Separate crisp human editorial copy (`Work.humanSummary`) from forensic provenance metadata (`Work.summary`, `Work.relationship`, `Work.provenanceNote`, `Work.access`) so the human UI reads naturally while agent endpoints retain full explicit provenance.
   - Keep voice consistent: natural first-person in the human CTA/framing, strict third-person + `notJackSpeaking: true` at the MCP/A2A boundary.

## Verification

Always run before committing or deploying:

```sh
pnpm --filter @workspace/home run verify
```

See `artifacts/home/ARCHITECTURE.md` for full trust boundaries and `artifacts/home/TEST-EVIDENCE.md` for verification scope.
