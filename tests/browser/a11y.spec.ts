import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATALOG_ITEMS } from '../../src/site/catalog-registry';

/**
 * Accessibility ratchet over every catalogue entry.
 *
 * Each component section is scanned for WCAG 2.2 A/AA rules in both themes. Known violations live in
 * a11y-baseline.json (slug -> theme -> sorted rule ids). A new violation fails; a baseline entry that
 * no longer occurs also fails, so the baseline only ever shrinks. Components missing from the baseline
 * must be clean. Regenerate with A11Y_UPDATE_BASELINE=1 (single worker; written after every test, partial runs merge in).
 */

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];
type Baseline = Record<string, Partial<Record<Theme, string[]>>>;

const BASELINE_PATH = fileURLToPath(new URL('./a11y-baseline.json', import.meta.url));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const updating = Boolean(process.env.A11Y_UPDATE_BASELINE);

function loadBaseline(): Baseline {
	try {
		return JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
	} catch {
		return {};
	}
}

/**
 * Sections whose content changes while they play a scripted timeline, so the violations seen depend on
 * timing. They are checked for regressions only (the baseline holds the union of what has been seen),
 * and updating the baseline adds to it rather than replacing it.
 */
const VOLATILE = new Set(['chat-workbench']);

const baseline = loadBaseline();
const observed: Baseline = {};

function writeBaseline(): void {
	const merged: Baseline = { ...baseline };
	for (const [slug, themes] of Object.entries(observed)) merged[slug] = { ...merged[slug], ...themes };
	const next: Baseline = {};
	for (const slug of Object.keys(merged).sort()) {
		const entry: Partial<Record<Theme, string[]>> = {};
		for (const theme of THEMES) {
			const rules = merged[slug][theme];
			if (rules && rules.length > 0) entry[theme] = rules;
		}
		if (Object.keys(entry).length > 0) next[slug] = entry;
	}
	writeFileSync(BASELINE_PATH, JSON.stringify(next, null, '\t') + '\n');
}

let page: Page;

async function currentTheme(): Promise<string | null> {
	return page.evaluate(() => document.documentElement.getAttribute('data-theme'));
}

async function setTheme(target: Theme): Promise<void> {
	if ((await currentTheme()) !== target) {
		await page.getByRole('button', { name: 'Toggle global color theme' }).click();
	}
	await expect.poll(currentTheme).toBe(target);
}

/**
 * Scans one section. The Vite dev server can reload the page while it discovers dependencies, which
 * resets the theme mid-scan, so a scan only counts if the theme survived it; otherwise retry.
 */
async function scan(slug: string, theme: Theme) {
	let lastError: unknown;
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled();
			await setTheme(theme);
			const section = page.locator('#' + slug);
			await expect(section).toHaveCount(1);
			await section.scrollIntoViewIfNeeded();
			const results = await new AxeBuilder({ page })
				.include('#' + slug)
				.withTags(TAGS)
				.analyze();
			if ((await currentTheme()) === theme) return results;
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError ?? new Error(`${slug} (${theme}): the page kept reloading during the scan`);
}

test.describe.configure({ mode: 'parallel' });

test.beforeAll(async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		reducedMotion: 'reduce'
	});
	page = await context.newPage();
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({
		timeout: 45000
	});
	await page.waitForLoadState('networkidle');
});

test.afterAll(async () => {
	await page.context().close();
});

test('baseline names only catalogue slugs', () => {
	const known = new Set(CATALOG_ITEMS.map((item) => item.slug));
	expect(Object.keys(baseline).filter((slug) => !known.has(slug))).toEqual([]);
});

for (const theme of THEMES) {
	for (const item of CATALOG_ITEMS) {
		test(`${item.slug} (${theme})`, async () => {
			const results = await scan(item.slug, theme);
			const found = [...new Set(results.violations.map((v) => v.id))].sort();

			if (updating) {
				const previous = VOLATILE.has(item.slug) ? (baseline[item.slug]?.[theme] ?? []) : [];
				(observed[item.slug] ??= {})[theme] = [...new Set([...previous, ...found])].sort();
				writeBaseline();
				return;
			}

			const known = baseline[item.slug]?.[theme] ?? [];
			const added = found.filter((id) => !known.includes(id));
			const fixed = known.filter((id) => !found.includes(id));
			const detail = results.violations
				.filter((v) => added.includes(v.id))
				.map((v) => `${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(' ')}`);
			expect(added, `${item.slug} (${theme}) has new violations: ${detail.join('; ')}`).toEqual([]);
			expect(
				VOLATILE.has(item.slug) ? [] : fixed,
				`${item.slug} (${theme}) no longer violates ${fixed.join(', ')}: shrink a11y-baseline.json (A11Y_UPDATE_BASELINE=1)`
			).toEqual([]);
		});
	}
}
