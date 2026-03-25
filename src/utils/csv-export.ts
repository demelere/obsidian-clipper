/**
 * CSV export utilities for building and formatting CSV content
 * from Google AI Overview extractions.
 */

export interface AiOverviewRow {
	query: string;
	aiOverview: string;
}

/**
 * Escapes a value for safe inclusion in a CSV cell.
 * Wraps in double quotes if the value contains commas, newlines, or quotes.
 */
function escapeCsvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Converts an array of AI Overview rows into a CSV string
 * with header row: "Search Query","AI Overview"
 */
export function toCsv(rows: AiOverviewRow[]): string {
	const header = 'Search Query,AI Overview';
	const lines = rows.map(row =>
		`${escapeCsvField(row.query)},${escapeCsvField(row.aiOverview)}`
	);
	return [header, ...lines].join('\n');
}

/**
 * Extracts the search query from a Google search URL's `q` parameter.
 * Returns an empty string if the URL is not a valid Google search URL
 * or has no query parameter.
 */
export function extractSearchQuery(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.searchParams.get('q') || '';
	} catch {
		return '';
	}
}
