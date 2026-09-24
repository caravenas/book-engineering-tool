---
type: "decision"
date: 2026-09-19
status: "accepted"
reversibility: "easy"
confidence: "high"
curated: false
---

# Decision: A jsdom suite needs a browser harness beside it, not instead of it

## Decision

Add Playwright Test, Chromium only, in e2e/, alongside the Vitest suite rather than replacing it. Every claim about what a page measures lives there; pure engines and the store stay in jsdom.

## Rationale

jsdom has no layout engine: getBoundingClientRect returns zeros, so an assertion about widths or overflow passes whatever the stylesheet says. Over one project this produced two layout defects found only by measuring by hand in Chrome, and a rolled-back attempt to fake the check by parsing the stylesheet with fs from inside a jsdom test.

## Alternatives considered

- Vitest browser mode: integrates with the existing runner but still pulls in a browser, and mixes fast unit runs with slow ones under a single command.
- Keep measuring by hand: this is what failed, and it does not survive the captain forgetting.

## Evidence

- The harness was verified red before green: with the fix removed it failed at 390px naming every .app-cell at 401px, and passed with it back. Commits f28b2ce and ef3531d in book-engineering-tool.

## Follow-ups

- A harness that only runs locally is a harness that rots. Decide whether it runs in CI, and whether the project even has one.
- @types/node is absent, so the config cannot read process.env; if CI ever needs a flag, that is the first thing to resolve.
