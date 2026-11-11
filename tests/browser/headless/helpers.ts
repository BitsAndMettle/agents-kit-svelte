import { expect, type Locator, type Page } from '@playwright/test';

export type Strategy = 'native' | 'fallback';

/** Loads the headless fixture and waits for hydration (keys before it reach inert markup). */
export async function openFixture(page: Page, anchor?: Strategy, height = 800): Promise<void> {
	await page.setViewportSize({ width: 1280, height });
	await page.goto(anchor ? `/headless/?anchor=${anchor}` : '/headless/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

/** Content element of a fixture layer by its name in the page script (`settings`, `inner`, …). */
export function content(page: Page, name: string): Locator {
	return page.locator(`[id$="-${name}-content"]`);
}

export function trigger(page: Page, name: string): Locator {
	return page.getByTestId(`${name}-trigger`);
}

/** Whether a popover is in the top layer / a dialog is open. */
export async function isShown(locator: Locator): Promise<boolean> {
	return locator.evaluate((el) => (el instanceof HTMLDialogElement ? el.open : el.matches(':popover-open')));
}

export async function expectShown(locator: Locator, shown: boolean): Promise<void> {
	await expect.poll(() => isShown(locator)).toBe(shown);
}

/**
 * Waits for running transitions on `locator` to finish. The showcase's reduced-motion reset
 * gives every property a 0.01ms transition, so a fresh placement is mid-transition (at its
 * static position) for the rest of the frame in which it was written.
 */
export async function settled(locator: Locator): Promise<void> {
	await locator.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
}

export async function logEntries(page: Page): Promise<string[]> {
	return page.getByTestId('log').locator('li').allTextContents();
}
