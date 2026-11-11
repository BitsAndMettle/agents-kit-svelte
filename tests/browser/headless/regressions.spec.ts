import { expect, test, type Locator, type Page } from '@playwright/test';
import { content, expectShown, isShown, logEntries, openFixture, settled, trigger, type Strategy } from './helpers';

/** Gap from the anchor's bottom edge to the surface's top, and the centre offset. */
async function placementOf(anchor: Locator, surface: Locator) {
	const [a, f] = await Promise.all([anchor.boundingBox(), surface.boundingBox()]);
	return { gap: f!.y - (a!.y + a!.height), centre: f!.x + f!.width / 2 - (a!.x + a!.width / 2), f: f! };
}

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test.describe('red-team regressions', () => {
	test('1. Space and letters typed into a text owner stay text', async ({ page }) => {
		await openFixture(page);
		const input = page.getByRole('combobox', { name: 'Fruit' });
		await input.click();
		await page.keyboard.type('a b');
		await expect(input).toHaveValue('a b');
		await expect(page.getByTestId('picked')).toHaveText('none');
	});

	test('2. revalidation and filtering never scroll the page; arrows scroll only the list', async ({ page }) => {
		await openFixture(page, undefined, 400);
		await page.waitForTimeout(300);
		expect(await scrollY(page)).toBe(0);

		const input = page.getByRole('combobox', { name: 'Fruit' });
		await input.focus();
		const y0 = await scrollY(page);
		await page.keyboard.type('e');
		await page.waitForTimeout(100);
		expect(await scrollY(page)).toBe(y0);
		await input.fill('');
		for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
		const list = page.getByTestId('fruit-list');
		await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
		expect(await scrollY(page)).toBe(y0);
	});

	test('3. a controlled consumer that refuses Escape keeps the layer open and in sync', async ({ page }) => {
		await openFixture(page);
		await trigger(page, 'sticky').click();
		const dialog = content(page, 'sticky');
		await expectShown(dialog, true);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(100);
		expect(await isShown(dialog)).toBe(true);
		await expect(page.getByTestId('sticky-open')).toHaveText('open');
		await expect(trigger(page, 'sticky')).toHaveAttribute('aria-expanded', 'true');
		await expect(dialog).toHaveAttribute('data-state', 'open');

		await page.getByRole('button', { name: 'Close sticky' }).click();
		await expectShown(dialog, false);
		await expect(page.getByTestId('sticky-open')).toHaveText('closed');
		await trigger(page, 'sticky').click();
		await expectShown(dialog, true);
		const log = await logEntries(page);
		expect(log).toContain('sticky:closed:escape');
		expect(log).toContain('sticky:closed:close-button');
		expect(log).not.toContain('sticky:closed:trigger');
	});

	test('4. a text input inside a roving toolbar keeps its typing and arrows', async ({ page }) => {
		await openFixture(page);
		const input = page.getByRole('textbox', { name: 'Font size' });
		await input.click();
		await page.keyboard.type('12');
		await page.keyboard.press('ArrowLeft');
		await page.keyboard.type('3');
		await expect(input).toHaveValue('132');
		await expect(input).toBeFocused();
	});

	test('6. pressing the anchor of an anchor-only popover is not an outside press', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openFixture(page);
		const anchor = page.getByTestId('anchored-anchor');
		const popover = content(page, 'anchored');
		await page.getByRole('button', { name: 'Open anchored' }).click();
		await expectShown(popover, true);
		await settled(popover);
		const box = (await anchor.boundingBox())!;
		const f = (await popover.boundingBox())!;
		expect(Math.abs(f.x - box.x)).toBeLessThanOrEqual(1.5);

		await anchor.click();
		await page.keyboard.type('pe');
		await expect(anchor).toHaveValue('pe');
		expect(await isShown(popover)).toBe(true);
		expect(await logEntries(page)).not.toContain('anchored:closed:outside');

		await page.getByTestId('page-heading').click();
		await expectShown(popover, false);
	});

	test('7. an Escape veto holds even when an input stops the key from propagating', async ({ page }) => {
		await openFixture(page);
		await trigger(page, 'guarded').click();
		const dialog = content(page, 'guarded');
		await expectShown(dialog, true);
		await page.getByRole('textbox', { name: 'Stops Escape' }).click();
		for (let i = 0; i < 3; i++) await page.keyboard.press('Escape');
		await page.waitForTimeout(100);
		expect(await isShown(dialog)).toBe(true);
		await page.getByRole('heading', { name: 'Guarded' }).click();
		await page.keyboard.press('Escape');
		await page.waitForTimeout(100);
		expect(await isShown(dialog)).toBe(true);
		await page.getByRole('button', { name: 'Close guarded' }).click();
		await expectShown(dialog, false);
	});

	test('8a. dialog.requestClose() closes the dialog itself, not just the popover above it', async ({ page }) => {
		await openFixture(page);
		await trigger(page, 'settings').click();
		await trigger(page, 'inner').click();
		await expectShown(content(page, 'inner'), true);
		const supported = await content(page, 'settings').evaluate((el) => 'requestClose' in el);
		test.skip(!supported, 'requestClose() not available in this browser');
		await content(page, 'settings').evaluate((el) => (el as HTMLDialogElement & { requestClose(): void }).requestClose());
		await expectShown(content(page, 'settings'), false);
		await expectShown(content(page, 'inner'), false);
		const log = await logEntries(page);
		expect(log).toContain('settings:closed:escape');
		expect(log).toContain('inner:closed:parent');
	});

	test('8b. an outside press does not pull focus back to the trigger', async ({ page }) => {
		await openFixture(page);
		await trigger(page, 'page').click();
		await expectShown(content(page, 'page'), true);
		await page.getByTestId('page-heading').click();
		await expectShown(content(page, 'page'), false);
		await page.waitForTimeout(300);
		await expect(trigger(page, 'page')).not.toBeFocused();
	});

	test('10. Tab out of a non-modal popover closes it and leaves focus where Tab put it', async ({ page }) => {
		// No exit animation: the close completes inside the focusout event itself.
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openFixture(page);
		const popover = content(page, 'page');
		await trigger(page, 'page').click();
		await expectShown(popover, true);
		await expect(popover).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(popover.getByRole('button', { name: 'Page action' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expectShown(popover, false);
		await page.waitForTimeout(300);
		await expect(trigger(page, 'alert')).toBeFocused();
		expect(await logEntries(page)).toContain('page:closed:focus-out');
	});

	test('11. focus the stack returns is marked as restored (tooltips skip it)', async ({ page }) => {
		await openFixture(page);
		const marker = page.getByTestId('page-trigger-focus');
		await trigger(page, 'page').click();
		await expect(marker).toHaveText('person');
		await expectShown(content(page, 'page'), true);
		await page.keyboard.press('Escape');
		await expectShown(content(page, 'page'), false);
		await expect(trigger(page, 'page')).toBeFocused();
		await expect(marker).toHaveText('restored');
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		await expect(trigger(page, 'page')).toBeFocused();
		await expect(marker).toHaveText('person');
	});

	test('R2-1. a tab stop naming a missing or disabled item falls back to the first enabled item', async ({ page }) => {
		await openFixture(page);
		for (const [group, first] of [
			['Gone stop', 'Gone x'],
			['Disabled stop', 'Disabled-stop a']
		]) {
			const radios = page.getByRole('radiogroup', { name: group });
			await expect(radios.locator('[tabindex="0"]')).toHaveCount(1);
			await expect(radios.getByRole('button', { name: first })).toHaveAttribute('tabindex', '0');
		}
		await page.getByRole('radiogroup', { name: 'Gone stop' }).getByRole('button', { name: 'Gone y' }).focus();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', { name: 'Disabled-stop a' })).toBeFocused();
	});

	test("R2-2. Layer.close('focus-out') leaves focus where Shift+Tab / Tab sent it", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openFixture(page);
		const popover = page.locator('[id$="-tabclose-content"]');
		const open = async () => {
			await trigger(page, 'tabclose').click();
			await expectShown(popover, true);
			await expect(page.getByRole('button', { name: 'Tab-close first' })).toBeFocused();
		};

		await open();
		await page.keyboard.press('Shift+Tab');
		await expectShown(popover, false);
		// The browser's previous element from the first item is the trigger; focus must not be
		// pulled to the trigger first and then moved past it to "Before tab-close".
		await expect(trigger(page, 'tabclose')).toBeFocused();
		await expect(page.getByRole('button', { name: 'Before tab-close' })).not.toBeFocused();

		// Any Tab closes it (menu semantics); focus continues past the hidden surface.
		await open();
		await page.keyboard.press('Tab');
		await expectShown(popover, false);
		await expect(page.getByRole('button', { name: 'After tab-close' })).toBeFocused();
		expect(await logEntries(page)).toContain('tabclose:closed:focus-out');
	});

	test('8c. removing the focused roving item moves focus to the new tab stop', async ({ page }) => {
		await openFixture(page);
		const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
		await toolbar.getByRole('button', { name: 'Dismiss' }).focus();
		await page.keyboard.press('Enter');
		await expect(toolbar.getByRole('button', { name: 'Dismiss' })).toHaveCount(0);
		await expect(toolbar.getByRole('button', { name: 'Bold' })).toBeFocused();
	});

	test('8d. the server render already has one roving tab stop', async ({ page }) => {
		const html = await (await page.request.get('/headless/')).text();
		await page.setContent('<!doctype html><title>x</title>');
		const stops = await page.evaluate(
			(source) => new DOMParser().parseFromString(source, 'text/html').querySelectorAll('[role="toolbar"] [tabindex="0"]').length,
			html
		);
		expect(stops).toBe(1);
	});

	test('9. a popover trigger on a ListNav item keeps the item id', async ({ page }) => {
		await openFixture(page);
		const more = trigger(page, 'more');
		expect(await more.getAttribute('id')).toMatch(/-toolbar-item-more$/);
		await more.focus();
		await page.keyboard.press('Enter');
		await expectShown(content(page, 'more'), true);
	});
});

for (const strategy of ['native', 'fallback'] as Strategy[]) {
	test.describe(`red-team positioning (${strategy})`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await openFixture(page, strategy);
		});

		test('5. a re-keyed trigger re-anchors (also after scrolling); a removed one freezes', async ({ page }) => {
			const popover = content(page, 'reanchor');
			// Keep it clear of the bottom edge so it does not flip.
			await trigger(page, 'reanchor').evaluate((el) => el.scrollIntoView({ block: 'center' }));
			await trigger(page, 'reanchor').click();
			await expectShown(popover, true);
			await settled(popover);
			const before = await placementOf(trigger(page, 'reanchor'), popover);
			expect(before.gap).toBeCloseTo(4, 0);

			await popover.getByRole('button', { name: 'Re-key its trigger' }).click();
			await expect.poll(async () => (await placementOf(trigger(page, 'reanchor'), popover)).centre).toBeCloseTo(0, 0);
			await settled(popover);
			const moved = await placementOf(trigger(page, 'reanchor'), popover);
			expect(moved.gap).toBeCloseTo(4, 0);
			expect(moved.f.x - before.f.x).toBeGreaterThan(50); // the new trigger sits further right

			await page.evaluate(() => window.scrollBy(0, 40));
			await expect.poll(async () => (await placementOf(trigger(page, 'reanchor'), popover)).gap).toBeCloseTo(4, 0);

			const pinned = (await popover.boundingBox())!;
			await popover.getByRole('button', { name: 'Remove its trigger' }).click();
			await expect(trigger(page, 'reanchor')).toHaveCount(0);
			await page.waitForTimeout(150);
			await settled(popover);
			const after = (await popover.boundingBox())!;
			expect(Math.abs(after.x - pinned.x)).toBeLessThanOrEqual(1.5);
			expect(Math.abs(after.y - pinned.y)).toBeLessThanOrEqual(1.5);
		});

		test('8e. a popover inside CSS zoom sits below its trigger', async ({ page }) => {
			await trigger(page, 'zoomed').click();
			const popover = content(page, 'zoomed');
			await expectShown(popover, true);
			await settled(popover);
			const { gap, centre } = await placementOf(trigger(page, 'zoomed'), popover);
			expect(gap).toBeGreaterThanOrEqual(2);
			expect(gap).toBeLessThanOrEqual(7);
			expect(Math.abs(centre)).toBeLessThanOrEqual(2);
		});

		test('9. a popover anchored to a ListNav item is placed beside it', async ({ page }) => {
			await trigger(page, 'more').click();
			const popover = content(page, 'more');
			await expectShown(popover, true);
			await settled(popover);
			const { gap, centre } = await placementOf(trigger(page, 'more'), popover);
			expect(gap).toBeCloseTo(4, 0);
			expect(Math.abs(centre)).toBeLessThanOrEqual(1.5);
			const shared = await page.evaluate(() => {
				const store = (globalThis as Record<symbol, { sheet: CSSStyleSheet | null }>)[
					Symbol.for('agents-kit-svelte/position@1')
				];
				return !!store?.sheet && document.adoptedStyleSheets.includes(store.sheet);
			});
			expect(shared).toBe(true);
		});
	});
}
