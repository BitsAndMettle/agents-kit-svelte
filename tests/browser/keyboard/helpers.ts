import { expect, type Locator, type Page } from '@playwright/test';

/** Presses keys in order, e.g. `await press(page, 'Tab', 'Shift+Tab', 'Escape')`. */
export async function press(page: Page, ...keys: string[]): Promise<void> {
	for (const key of keys) await page.keyboard.press(key);
}

/** Asserts focus is on the element with this role and accessible name. */
export async function expectFocusedByRole(
	page: Page,
	role: Parameters<Page['getByRole']>[0],
	name: string | RegExp
): Promise<void> {
	await expect(page.getByRole(role, { name }).first()).toBeFocused();
}

/** Focuses `target`, runs `action`, then asserts focus is back on `target`. */
export async function expectFocusReturns(target: Locator, action: () => Promise<void>): Promise<void> {
	await target.focus();
	await action();
	await expect(target).toBeFocused();
}

/** Loads the showcase and returns the section for a catalogue slug, scrolled into view. */
export async function openSection(page: Page, slug: string): Promise<Locator> {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	// The page is server-rendered; keys pressed before hydration reach inert markup.
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
	const section = page.locator('#' + slug);
	await section.scrollIntoViewIfNeeded();
	return section;
}

/**
 * Opens a section on a clock the test owns. The install comes before the page loads; `hold` then stops time, so a
 * demo's "server" delay or a cooldown only moves when the test calls `page.clock.runFor`.
 */
export async function openOnClock(page: Page, slug: string): Promise<Locator> {
	await page.clock.install();
	return openSection(page, slug);
}

/** Stops the page's clock a moment ahead. Call it before the action whose in-flight state is under test. */
export async function hold(page: Page): Promise<void> {
	// Measured on the page clock, which may be ahead of the test process.
	const now = await page.evaluate(() => Date.now());
	await page.clock.pauseAt(new Date(now + 1000));
}
