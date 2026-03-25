/**
 * Window-level tools panel logic for batch operations across tabs.
 * Currently supports exporting Google AI Overview content to CSV.
 */

import browser from '../utils/browser-polyfill';
import { saveFile } from '../utils/file-utils';
import { toCsv, extractSearchQuery, AiOverviewRow } from '../utils/csv-export';
import { getMessage } from '../utils/i18n';
import { initializeIcons } from '../icons/icons';
import dayjs from 'dayjs';

let isPanelOpen = false;

/**
 * Self-contained extraction function injected into tabs via scripting.executeScript.
 * Must not reference any imports — it runs in the content script context.
 */
function extractAiOverviewFromPage(): string | null {
	const heading = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
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

function setStatus(message: string, type: 'success' | 'error' | '' = ''): void {
	const statusEl = document.getElementById('window-tools-status');
	if (!statusEl) return;
	statusEl.textContent = message;
	statusEl.className = 'window-tools-status';
	if (type === 'success') statusEl.classList.add('is-success');
	if (type === 'error') statusEl.classList.add('is-error');
}

function clearStatus(): void {
	setStatus('');
}

function isGoogleSearchUrl(url: string | undefined): boolean {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return parsed.hostname.includes('google.com') && parsed.pathname === '/search';
	} catch {
		return false;
	}
}

async function extractFromCurrentTab(): Promise<AiOverviewRow[]> {
	const tabs = await browser.tabs.query({ active: true, currentWindow: true });
	const tab = tabs[0];
	if (!tab?.id || !tab.url) return [];

	if (!isGoogleSearchUrl(tab.url)) {
		setStatus(getMessage('notGoogleSearch'), 'error');
		return [];
	}

	const results = await browser.scripting.executeScript({
		target: { tabId: tab.id },
		func: extractAiOverviewFromPage,
	});

	const aiOverview = results?.[0]?.result as string | null;
	if (!aiOverview) {
		setStatus(getMessage('noAiOverviewFound'), 'error');
		return [];
	}

	const query = extractSearchQuery(tab.url);
	return [{ query, aiOverview }];
}

async function extractFromAllTabs(): Promise<AiOverviewRow[]> {
	const tabs = await browser.tabs.query({ currentWindow: true });
	const googleTabs = tabs.filter(tab => isGoogleSearchUrl(tab.url));

	if (googleTabs.length === 0) {
		setStatus(getMessage('notGoogleSearch'), 'error');
		return [];
	}

	const rows: AiOverviewRow[] = [];

	for (const tab of googleTabs) {
		if (!tab.id || !tab.url) continue;
		try {
			const results = await browser.scripting.executeScript({
				target: { tabId: tab.id },
				func: extractAiOverviewFromPage,
			});
			const aiOverview = results?.[0]?.result as string | null;
			if (aiOverview) {
				const query = extractSearchQuery(tab.url);
				rows.push({ query, aiOverview });
			}
		} catch (err) {
			console.warn(`Failed to extract AI overview from tab ${tab.id}:`, err);
		}
	}

	if (rows.length === 0) {
		setStatus(getMessage('noAiOverviewFound'), 'error');
	}

	return rows;
}

async function handleExport(mode: 'current' | 'all', output: 'download' | 'clipboard'): Promise<void> {
	clearStatus();
	const rows = mode === 'current'
		? await extractFromCurrentTab()
		: await extractFromAllTabs();

	if (rows.length === 0) return;

	const csvContent = toCsv(rows);
	const count = String(rows.length);

	if (output === 'download') {
		const fileName = `ai-overviews-${dayjs().format('YYYY-MM-DD')}`;
		const tabs = await browser.tabs.query({ active: true, currentWindow: true });
		await saveFile({
			content: csvContent,
			fileName,
			mimeType: 'text/csv',
			tabId: tabs[0]?.id,
		});
		setStatus(getMessage('exportedRows', count), 'success');
	} else {
		await navigator.clipboard.writeText(csvContent);
		setStatus(getMessage('copiedToClipboard'), 'success');
	}
}

export function toggleWindowToolsPanel(): void {
	const panel = document.getElementById('window-tools-panel');
	if (!panel) return;

	isPanelOpen = !isPanelOpen;

	if (isPanelOpen) {
		panel.style.display = 'flex';
		document.body.classList.add('window-tools-open');
		// Close variables panel if open
		document.body.classList.remove('variables-panel-open');
		const variablesPanel = document.querySelector('.variables-panel');
		if (variablesPanel) variablesPanel.classList.remove('show');
	} else {
		panel.style.display = 'none';
		document.body.classList.remove('window-tools-open');
	}

	clearStatus();
	initializeIcons();
}

export function initializeWindowTools(): void {
	const toggleBtn = document.getElementById('window-tools-btn');
	if (toggleBtn) {
		toggleBtn.addEventListener('click', (e) => {
			e.preventDefault();
			toggleWindowToolsPanel();
		});
	}

	const closeBtn = document.getElementById('close-window-tools');
	if (closeBtn) {
		closeBtn.addEventListener('click', (e) => {
			e.preventDefault();
			if (isPanelOpen) toggleWindowToolsPanel();
		});
	}

	document.getElementById('export-ai-current-download')?.addEventListener('click', () => {
		handleExport('current', 'download');
	});

	document.getElementById('export-ai-current-copy')?.addEventListener('click', () => {
		handleExport('current', 'clipboard');
	});

	document.getElementById('export-ai-all-download')?.addEventListener('click', () => {
		handleExport('all', 'download');
	});

	document.getElementById('export-ai-all-copy')?.addEventListener('click', () => {
		handleExport('all', 'clipboard');
	});

	initializeIcons();
}
