# Monthly refresh: preserve quality, add range

The approved collection routine runs monthly on the 21st at 17:00
Australia/Sydney. It stages a review batch in this conversation and a private
project copy; it does not publish, merge, buy credits or run paid generation.
The first scheduled collection is December 21, 2026. Manage it on Replit's
Routines page.

## A rolling refresh, not a monthly rewrite

1. Check the ledger and existing public sources before discovering new ones.
   Use conditional requests (ETag / Last-Modified) when a source supports them.
   Compare meaningful product/campaign evidence, not header, tracking, stock
   widgets or unrelated-page boilerplate.
2. Keep unchanged examples. Broken sources, changed facts and unsupported claims
   take priority over cosmetic variety. A blocked page is a gap to report, not
   a reason to bypass access controls or invent a new source.
3. Stage a small candidate set. Generate or editorially refine only accepted,
   changed candidates later; do not rerun Flint on the entire collection.
4. Review source fidelity, useful reframing, diversity and human/agent parity.
   Only an approved promotion can alter the live example datasets.
5. Archive the previous accepted snapshot and its provenance before replacing
   it. Never erase history or overwrite an unapproved draft.

The message routine needs judgment because discovery and editorial selection
are the work. Mechanical checks come first; expensive model work does not.
There is no paid generation or auto-publication hidden in the collection job.

## Facts with Flair: at most two proposed changes

The starting collection contains eight dated Australian retailer examples.
Consider at most two additions or replacements per collection. Prefer missing
product categories and new retailers; avoid repeatedly selecting a familiar
brand because it is easy to fetch. Use price bands or geography as diversity
signals only when verified from the source, not inferred from a brand name.

Select examples with concrete, comparable facts and a genuinely different
buying-decision frame. Keep all values, units and qualifications exact. A
shorter or more novel sentence alone is not enough. Preserve:

- Public product URL and publisher/retailer.
- Retrieval time, original excerpt and exact supporting fact quotes.
- A stable content hash of the relevant evidence.
- What changed, why it improves the collection, and what it replaces.
- Attribution and generation/editorial provenance.

The current gallery's editorial reviews are not live six-gate certifications.
Thin sources should be rejected or explicitly flagged, not padded with invented
attributes to manufacture a QA pass. No claims of improved AI rankings.

## Leaderbored: up to twelve curated references

Use its six current categories: Automotive, Banking, Beauty, Consumer
Electronics, QSR and Travel. Collect at most two recent public campaign
references per category, prioritising brand newsrooms and reliable campaign
coverage with a clear date, named campaign and attributable creative execution.
Cap **new-source reads at 24**; use fewer when quality sources are unavailable.

These records are **curated campaign references**, not a representative
advertising study. Keep them separate from the existing sample theme exports.
Never infer market share, ad volume, effectiveness, category prevalence or
independent verification. A source describing a campaign cannot prove how
common its theme is across a market.

Existing sample rows remain labelled `sampleData: true`. Turning a new
reference into approved category context is a later, explicit editorial
promotion. Do not copy, query or change customer ideas or credit ledgers.

## State and output

Baseline inventory: `content/refresh/ledger.json`. Its hashes describe the
already-stored source snapshots, **not fresh network verification**.

Each collection writes `content/refresh/YYYY-MM/` with:

- `candidates.json`: source-backed records, all `pending_review`.
- `report.md`: changed/stale/blocked sources, diversity improvements, proposed
  replacements, source gaps and exact next review action.
- Ledger updates: source checks, hashes, deduplication keys and candidate
  status. No promotion to accepted without explicit approval.

For every candidate record include: experiment, category, source URL, publisher,
publication date if available, retrieval time, exact excerpt, evidence kind,
relevant-content hash, reason for selection, diversity contribution, proposed
replacement, limitations and review status. Distinguish direct quotations,
paraphrases and proposed synthesis. Do not credit Flint for text it did not
generate; do not present proposed framing as Jack's direct words.

No completed monthly run exists at setup time. The baseline is deliberately not
marked as newly collected or reviewed. Do not invoke the newly created routine
as a test unless Jack explicitly requests it.

## Promotion checks

After review, use the existing service workflow for only the accepted new
Facts examples, retain its exact source/spec and QA evidence, then verify the
native gallery, Markdown/data endpoints and MCP descriptions together.
For Leaderbored, validate any curated-reference import separately from sample
theme rows. Keep provenance labels visible and retain the human approval
boundary around spending. Run the full app verification suite before proposing
the content merge; public hosting checks follow publishing.
