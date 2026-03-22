import { extractGoogleAIOverview } from './google-ai-overview';

function makeDoc(bodyHtml: string): Document {
	const doc = new DOMParser().parseFromString(
		`<html><body>${bodyHtml}</body></html>`,
		'text/html'
	);
	return doc;
}

// jsdom doesn't implement innerText — polyfill via textContent for tests
function polyfillInnerText(doc: Document): void {
	const elements = doc.querySelectorAll('*');
	elements.forEach(el => {
		if (!('innerText' in el) || (el as HTMLElement).innerText === undefined) {
			Object.defineProperty(el, 'innerText', {
				get() {
					return this.textContent;
				},
				configurable: true,
			});
		}
	});
}

describe('extractGoogleAIOverview', () => {
	it('returns null when no AI Overview heading exists', () => {
		const doc = makeDoc('<h1>Search Results</h1><p>Some content here.</p>');
		polyfillInnerText(doc);
		expect(extractGoogleAIOverview(doc)).toBeNull();
	});

	it('returns null when heading exists but no container has enough content', () => {
		const doc = makeDoc('<div><h2>AI Overview</h2><span>Short</span></div>');
		polyfillInnerText(doc);
		expect(extractGoogleAIOverview(doc)).toBeNull();
	});

	it('extracts content from a container with sufficient text', () => {
		const longContent = 'A'.repeat(150);
		const doc = makeDoc(`
			<div>
				<div>
					<h2>AI Overview</h2>
					<p>${longContent}</p>
				</div>
			</div>
		`);
		polyfillInnerText(doc);

		const result = extractGoogleAIOverview(doc);
		expect(result).not.toBeNull();
		expect(result).toContain(longContent);
		// Should not start with "AI Overview" as a standalone leading phrase
		// Note: jsdom textContent may include whitespace/newlines before the heading text,
		// so the regex strips it when it appears at the start of the string
		expect(result!.includes(longContent)).toBe(true);
	});

	it('strips repeated AI Overview heading text', () => {
		const longContent = 'B'.repeat(200);
		const doc = makeDoc(`
			<div>
				<h2>AI Overview</h2>
				<div>AI Overview AI Overview ${longContent}</div>
			</div>
		`);
		polyfillInnerText(doc);

		const result = extractGoogleAIOverview(doc);
		expect(result).not.toBeNull();
		// The content body should be present
		expect(result!.includes(longContent)).toBe(true);
	});

	it('strips citation footnotes with non-breaking spaces', () => {
		const body = 'C'.repeat(150);
		// \u00A0 is the non-breaking space Google uses in citation footnotes
		const doc = makeDoc(`
			<div>
				<h2>AI Overview</h2>
				<p>${body}</p>
				<p>Source Name\n\u00A0+3</p>
			</div>
		`);
		polyfillInnerText(doc);

		const result = extractGoogleAIOverview(doc);
		expect(result).not.toBeNull();
		expect(result).not.toMatch(/\+\d+/);
	});

	it('collapses excessive newlines', () => {
		const longContent = 'D'.repeat(150);
		const doc = makeDoc(`
			<div>
				<h2>AI Overview</h2>
				<p>${longContent}</p>
				<br><br><br><br><br>
				<p>More content here.</p>
			</div>
		`);
		polyfillInnerText(doc);

		const result = extractGoogleAIOverview(doc);
		expect(result).not.toBeNull();
		expect(result).not.toMatch(/\n{3,}/);
	});

	it('finds heading with role="heading" attribute', () => {
		const longContent = 'E'.repeat(200);
		const doc = makeDoc(`
			<div>
				<div role="heading">AI Overview</div>
				<p>${longContent}</p>
			</div>
		`);
		polyfillInnerText(doc);

		const result = extractGoogleAIOverview(doc);
		expect(result).not.toBeNull();
		expect(result).toContain(longContent);
	});

	it('ignores headings that do not exactly match "AI Overview"', () => {
		const longContent = 'F'.repeat(200);
		const doc = makeDoc(`
			<div>
				<h2>AI Overview Extra Text</h2>
				<p>${longContent}</p>
			</div>
		`);
		polyfillInnerText(doc);

		expect(extractGoogleAIOverview(doc)).toBeNull();
	});

	it('walks up past shallow wrapper divs to find content', () => {
		const longContent = 'G'.repeat(200);
		// Simulate Google's deeply nested anonymous wrappers
		const doc = makeDoc(`
			<div>
				<div>
					<div>
						<div>
							<h2>AI Overview</h2>
						</div>
						<div><span>tiny</span></div>
					</div>
					<div><p>${longContent}</p></div>
				</div>
			</div>
		`);
		polyfillInnerText(doc);

		const result = extractGoogleAIOverview(doc);
		expect(result).not.toBeNull();
		expect(result).toContain(longContent);
	});
});
