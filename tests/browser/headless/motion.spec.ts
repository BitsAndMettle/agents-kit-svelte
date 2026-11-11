import { expect, test, type Page } from '@playwright/test';
import { content, expectShown, openFixture, trigger } from './helpers';

interface Timeline {
	escape: number;
	stateClosed: number;
	hidden: number;
	focusReturned: number;
}

/** Records, in page time, when Escape was pressed, data-state turned closed, the dialog closed and focus came back. */
async function recordClose(page: Page): Promise<Timeline> {
	await page.evaluate(() => {
		const dialog = document.querySelector<HTMLDialogElement>('[id$="-settings-content"]')!;
		const button = document.querySelector<HTMLElement>('[id$="-settings-trigger"]')!;
		const t: Partial<Timeline> = {};
		(window as unknown as { timeline: Partial<Timeline> }).timeline = t;
		document.addEventListener('keydown', (e) => e.key === 'Escape' && (t.escape ??= performance.now()), true);
		new MutationObserver(() => {
			if (dialog.dataset.state === 'closed') t.stateClosed ??= performance.now();
			if (!dialog.open) t.hidden ??= performance.now();
		}).observe(dialog, { attributes: true, attributeFilter: ['data-state', 'open'] });
		button.addEventListener('focus', () => (t.focusReturned ??= performance.now()));
	});
	await page.keyboard.press('Escape');
	await expect
		.poll(() => page.evaluate(() => (window as unknown as { timeline: Partial<Timeline> }).timeline.focusReturned))
		.toBeDefined();
	return page.evaluate(() => (window as unknown as { timeline: Timeline }).timeline);
}

test('the exit animation completes before the dialog hides and focus returns', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await openFixture(page);
	await trigger(page, 'settings').click();
	await expectShown(content(page, 'settings'), true);
	await page.waitForTimeout(300); // let the entry transition settle

	const t = await recordClose(page);
	expect(t.stateClosed - t.escape).toBeLessThan(50);
	expect(t.hidden - t.escape).toBeGreaterThanOrEqual(150);
	expect(t.hidden - t.escape).toBeLessThan(450);
	// close() restores focus synchronously; the observer stamps `hidden` a microtask later.
	expect(t.focusReturned - t.escape).toBeGreaterThanOrEqual(150);
	expect(Math.abs(t.focusReturned - t.hidden)).toBeLessThan(20);
	await expect(trigger(page, 'settings')).toBeFocused();
});

test('under reduced motion the dialog hides and focus returns immediately', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await openFixture(page);
	await trigger(page, 'settings').click();
	await expectShown(content(page, 'settings'), true);

	const t = await recordClose(page);
	expect(t.hidden - t.escape).toBeLessThan(50);
	expect(t.focusReturned - t.escape).toBeLessThan(50);
	await expect(trigger(page, 'settings')).toBeFocused();
});

test('re-opening during the exit animation cancels the close', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await openFixture(page);
	const popover = content(page, 'page');
	await trigger(page, 'page').click();
	await expectShown(popover, true);
	await page.waitForTimeout(300);
	await trigger(page, 'page').click();
	await expect(popover).toHaveAttribute('data-state', 'closed');
	await trigger(page, 'page').click();
	await expect(popover).toHaveAttribute('data-state', 'open');
	await page.waitForTimeout(500);
	await expectShown(popover, true);
	await expect(trigger(page, 'page')).toHaveAttribute('aria-expanded', 'true');
});
