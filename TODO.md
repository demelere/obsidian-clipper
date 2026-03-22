# TODO

## Google AI Overview

- [ ] Add integration test that loads a saved Google SERP HTML snapshot and validates end-to-end extraction through `extractedContent` pipeline
- [ ] Handle localized "AI Overview" heading text for non-English Google domains (e.g. "Apercu IA" for French)
- [ ] Consider caching the extraction result if the popup is opened multiple times on the same page
- [ ] Add a user-facing toggle in settings to enable/disable the `{{google_ai_overview}}` variable

## Testing infrastructure

- [ ] Add CI workflow (GitHub Actions) to run `npm test` on PRs
- [ ] Add test coverage reporting
- [ ] Add tests for existing extractors in `src/utils/extractors/`

## Anki integration

- [ ] Document the flashcard app API contract
- [ ] Add error handling for network timeouts when sending to flashcard app
- [ ] Add tests for the send-to-flashcard-app flow
