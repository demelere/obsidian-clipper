# ADR-001: Google AI Overview Template Variable

## Status

Accepted

## Goal

Allow users to capture Google's AI Overview section from search result pages as a template variable `{{google_ai_overview}}`, primarily for Anki flashcard generation.

## Problem

Google AI Overviews contain useful summarized information that users want to capture into Obsidian notes or Anki flashcards. However:

1. Google obfuscates CSS class names (e.g. `.M8OgIe`, `.YzCcne`) and changes them on every deploy, making selector-based extraction fragile.
2. The AI Overview section is wrapped in multiple anonymous `<div>` layers that vary between page loads and regions.
3. Citation footnotes use non-breaking spaces (`\u00A0`) that standard whitespace patterns miss.

## Solution

A heading-anchored, structurally agnostic extractor:

1. **Anchor on text, not classes.** Find any `h1`, `h2`, `h3`, or `[role="heading"]` whose `innerText` is exactly `"AI Overview"`.
2. **Walk up the DOM** from the heading until a container has >100 characters of content (excluding the heading text itself). This heuristic handles arbitrary wrapper div nesting.
3. **Clean the output** by stripping repeated heading text, citation footnotes (with `\u00A0`), and collapsing excessive newlines.
4. **Gate on URL.** Only runs when `hostname` includes `google.com` and `pathname` is `/search`.

The extractor is a pure function that accepts a `Document`, making it testable without browser APIs beyond jsdom.

## Why This Approach

- **Class-name selectors break every Google deploy.** The heading text "AI Overview" is user-visible and stable.
- **The >100 char walk-up heuristic** is the simplest approach that handles Google's variable wrapper nesting without hardcoding depth.
- **Extracting into `extractedContent`** leverages the existing variable pipeline — no changes needed to the template compiler or variable resolution.
- **Separate module** (`google-ai-overview.ts`) keeps the extractor testable and the content script clean.

## Alternatives Considered

- **CSS selector extractor (`{{selector:...}}`)**: Would break on class name changes.
- **Prompt variable (`{{"extract the AI overview"}}`)**: Works but requires LLM, adds latency and cost for structured data that's already in the DOM.
- **Custom site extractor** (via `ExtractorRegistry`): Heavier pattern for a single variable; extractors are meant to override the full content pipeline.

## Consequences

- The variable returns `null` (empty string in template) on non-Google pages or when no AI Overview is present.
- If Google changes the heading text from "AI Overview" to something else, the extractor will need updating. This is unlikely since it's a user-facing product name.
- The `\u00A0` citation regex is coupled to Google's current footnote format.
