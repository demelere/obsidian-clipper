/**
 * Extracts the Google AI Overview section from a Google search results page.
 *
 * Anchors to the "AI Overview" heading text rather than obfuscated class names,
 * then walks up the DOM until a container with >100 chars of real content is found.
 * This makes the extractor structurally agnostic to Google's frequent layout changes.
 */
export function extractGoogleAIOverview(doc: Document): string | null {
	const heading = Array.from(doc.querySelectorAll('h1, h2, h3, [role="heading"]'))
		.find(el => (el as HTMLElement).innerText?.trim() === 'AI Overview');
	if (!heading) return null;

	let container = heading.parentElement;
	while (container) {
		if ((container.innerText || '').replace(/AI Overview\s*/gi, '').trim().length > 100) break;
		container = container.parentElement;
	}
	if (!container) return null;

	return container.innerText
		.replace(/^(AI Overview\s*){1,3}/i, '')
		.replace(/[^\n]+\n[\u00A0 ]\+\d+/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
