import { expect, type Locator, type Page } from '@playwright/test';
import { test } from '@playwright/test';
import { expectShown, logEntries, settled, type Strategy } from './helpers';

/** Loads the option-list fixture and waits for hydration (keys before it reach inert markup). */
async function open(page: Page, anchor?: Strategy): Promise<void> {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(anchor ? `/headless/listbox/?anchor=${anchor}` : '/headless/listbox/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

/** Text of the element aria-activedescendant points at; 'MISSING' when the id does not resolve. */
function active(owner: Locator): () => Promise<string | null> {
	return () =>
		owner.evaluate((el) => {
			const id = el.getAttribute('aria-activedescendant');
			return id ? (document.getElementById(id)?.textContent?.trim() ?? 'MISSING') : null;
		});
}

/**
 * Samples `owner`'s aria-activedescendant on every animation frame (after all microtasks,
 * so after every render) and counts frames where it named an element that is not in the
 * document. Returns a reader for the count.
 */
async function watchDescendant(owner: Locator): Promise<() => Promise<number>> {
	await owner.evaluate((el) => {
		const w = window as unknown as { __stale: number };
		w.__stale = 0;
		const frame = () => {
			const id = el.getAttribute('aria-activedescendant');
			if (id && !document.getElementById(id)) w.__stale++;
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	});
	return () => owner.page().evaluate(() => (window as unknown as { __stale: number }).__stale);
}

const selectTrigger = (page: Page) => page.getByRole('combobox', { name: 'Fruit', exact: true });
const selectList = (page: Page) => page.locator('[id$="-fruit-list"]');
const comboInput = (page: Page) => page.getByRole('combobox', { name: 'Search fruit' });
const comboList = (page: Page) => page.locator('[id$="-combo-list"]');

test.describe('Select', () => {
	test.beforeEach(async ({ page }) => open(page));

	test('click opens on the first option; arrows skip disabled; Enter chooses and closes; focus stays', async ({
		page
	}) => {
		const trigger = selectTrigger(page);
		await trigger.click();
		await expectShown(selectList(page), true);
		await expect(trigger).toHaveAttribute('aria-expanded', 'true');
		await expect(trigger).toBeFocused();
		await expect.poll(active(trigger)).toBe('Apple');

		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(trigger)).toBe('Banana');
		await expect(page.getByRole('option', { name: 'Banana' })).toHaveAttribute('data-highlighted', '');
		await page.keyboard.press('Enter');
		await expectShown(selectList(page), false);
		await expect(page.getByTestId('select-value')).toHaveText('banana');
		await expect(trigger).toHaveText('Banana');
		await expect(trigger).toBeFocused();
		await expect(trigger).not.toHaveAttribute('aria-activedescendant');
		expect(await logEntries(page)).toEqual(['select:open:trigger', 'select:closed:select']);

		// Reopens on the selected option.
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(trigger)).toBe('Banana');
		await expect(page.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-selected', 'true');
		await page.keyboard.press('End');
		await expect.poll(active(trigger)).toBe('Elderberry');
		await page.keyboard.press('ArrowUp'); // Durian is disabled
		await expect.poll(active(trigger)).toBe('Cherry');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown'); // no loop by default
		await expect.poll(active(trigger)).toBe('Elderberry');
		await page.keyboard.press('Home');
		await expect.poll(active(trigger)).toBe('Apple');

		await page.keyboard.press('Escape');
		await expectShown(selectList(page), false);
		await expect(page.getByTestId('select-value')).toHaveText('banana');
		await expect(trigger).toBeFocused();
		expect((await logEntries(page)).at(-1)).toBe('select:closed:escape');
	});

	test('closed keys: ArrowUp opens on the last, Home/End on the edges, Space and Enter open', async ({ page }) => {
		const trigger = selectTrigger(page);
		await trigger.focus();
		const cases: [string, string][] = [
			['ArrowUp', 'Elderberry'],
			['Home', 'Apple'],
			['End', 'Elderberry'],
			['Enter', 'Apple'],
			[' ', 'Apple']
		];
		for (const [key, expected] of cases) {
			await page.keyboard.press(key === ' ' ? 'Space' : key);
			await expectShown(selectList(page), true);
			await expect.poll(active(trigger)).toBe(expected);
			await page.keyboard.press('Escape');
			await expectShown(selectList(page), false);
		}
	});

	test('Space opens and chooses without the button click toggling it back', async ({ page }) => {
		const trigger = selectTrigger(page);
		await trigger.focus();
		await page.keyboard.press('Space');
		await expectShown(selectList(page), true);
		await page.waitForTimeout(100);
		await expectShown(selectList(page), true);
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('Space');
		await expectShown(selectList(page), false);
		await expect(page.getByTestId('select-value')).toHaveText('apricot');
		await page.waitForTimeout(100);
		await expectShown(selectList(page), false);
		// A mouse click right after still toggles.
		await trigger.click();
		await expectShown(selectList(page), true);
	});

	test('typeahead: closed it selects the next match without opening; open it moves the highlight', async ({
		page
	}) => {
		const trigger = selectTrigger(page);
		await trigger.focus();
		await page.keyboard.press('b');
		await expect(page.getByTestId('select-value')).toHaveText('banana');
		await page.keyboard.press('b');
		await expect(page.getByTestId('select-value')).toHaveText('blueberry');
		await expectShown(selectList(page), false);
		expect(await logEntries(page)).toEqual([]);

		await page.waitForTimeout(600); // buffer reset
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(trigger)).toBe('Blueberry');
		await page.keyboard.press('c');
		await expect.poll(active(trigger)).toBe('Cherry');
		await expect(page.getByTestId('select-value')).toHaveText('blueberry');
		await page.keyboard.press('d'); // Durian is disabled: no match, highlight stays
		await expect.poll(active(trigger)).toBe('Cherry');
	});

	test('Tab closes and moves on; an outside press closes; a disabled option ignores clicks', async ({ page }) => {
		const trigger = selectTrigger(page);
		await trigger.click();
		await expectShown(selectList(page), true);
		await page.getByRole('option', { name: 'Durian' }).click({ force: true }); // aria-disabled
		await expectShown(selectList(page), true);
		await expect(page.getByTestId('select-value')).toHaveText('none');

		await page.keyboard.press('Tab');
		await expectShown(selectList(page), false);
		await expect(trigger).not.toBeFocused();
		expect((await logEntries(page)).at(-1)).toBe('select:closed:focus-out');

		await trigger.click();
		await expectShown(selectList(page), true);
		await page.getByRole('heading', { name: 'Headless option lists' }).click();
		await expectShown(selectList(page), false);
		expect((await logEntries(page)).at(-1)).toBe('select:closed:outside');

		await trigger.click();
		await page.getByRole('option', { name: 'Cherry' }).click();
		await expectShown(selectList(page), false);
		await expect(page.getByTestId('select-value')).toHaveText('cherry');
		await expect(trigger).toBeFocused();
	});
});

test.describe('Combobox', () => {
	test.beforeEach(async ({ page }) => open(page));

	test('typing opens and highlights the first match; aria-activedescendant never names a removed option', async ({
		page
	}) => {
		const input = comboInput(page);
		const stale = await watchDescendant(input);
		await input.click();
		await page.keyboard.type('b');
		await expectShown(comboList(page), true);
		expect((await logEntries(page)).at(-1)).toBe('combo:open:trigger');
		await expect.poll(active(input)).toBe('Banana');
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(input)).toBe('Blueberry');
		await page.keyboard.type('l'); // "bl": Banana is gone
		await expect.poll(active(input)).toBe('Blueberry');
		await page.keyboard.press('Backspace');
		await page.keyboard.press('Backspace'); // "": every fruit, first highlighted
		await expect.poll(active(input)).toBe('Apple');
		await page.keyboard.type('err'); // Blueberry, Cherry, Elderberry
		await expect.poll(active(input)).toBe('Blueberry');
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(input)).toBe('Cherry');
		await page.keyboard.type('x'); // nothing matches
		await expect(page.getByTestId('combo-empty')).toBeVisible();
		await expect.poll(active(input)).toBe(null);
		await page.keyboard.press('Enter'); // no target: nothing chosen
		await expect(page.getByTestId('combo-value')).toHaveText('none');
		await page.keyboard.press('Backspace');
		await expect.poll(active(input)).toBe('Blueberry');
		await expect(input).toBeFocused();
		expect(await stale()).toBe(0);
	});

	test('Enter selects; Escape closes, then clears; focus never leaves the input', async ({ page }) => {
		const input = comboInput(page);
		await input.click();
		await page.keyboard.type('ch');
		await page.keyboard.press('Enter');
		await expectShown(comboList(page), false);
		await expect(page.getByTestId('combo-value')).toHaveText('cherry');
		await expect(input).toHaveValue('Cherry');
		await expect(input).toBeFocused();
		expect((await logEntries(page)).at(-1)).toBe('combo:closed:select');

		await page.keyboard.press('ArrowDown'); // opens on the selected option
		await expectShown(comboList(page), true);
		await expect.poll(active(input)).toBe('Cherry');
		await page.keyboard.press('Escape');
		await expectShown(comboList(page), false);
		await expect(input).toHaveValue('Cherry');
		expect((await logEntries(page)).at(-1)).toBe('combo:closed:escape');
		await page.keyboard.press('Escape');
		await expect(input).toHaveValue('');
		await expect(page.getByTestId('combo-value')).toHaveText('none');
		await expectShown(comboList(page), false);
		await page.keyboard.press('Escape'); // nothing left: passes through harmlessly
		await expect(input).toBeFocused();

		// Mouse: pressing options and the list padding keeps focus in the input.
		await page.keyboard.type('a');
		await expectShown(comboList(page), true);
		await comboList(page).click({ position: { x: 100, y: 2 } }); // top padding, clear of the rounded corners
		await expect(input).toBeFocused();
		await expectShown(comboList(page), true);
		await page.getByRole('option', { name: 'Banana' }).click();
		await expect(input).toBeFocused();
		await expect(page.getByTestId('combo-value')).toHaveText('banana');
		await expect(input).toHaveValue('Banana');
	});

	test('Home/End move the caret, not the highlight; Alt+ArrowDown opens in place; Alt+ArrowUp closes', async ({
		page
	}) => {
		const input = comboInput(page);
		await input.click();
		await page.keyboard.type('an');
		await expect.poll(active(input)).toBe('Banana');
		await page.keyboard.press('ArrowDown'); // the only other match, Durian, is disabled
		await expect.poll(active(input)).toBe('Banana');
		await page.keyboard.press('Home');
		expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(0);
		await page.keyboard.press('End');
		expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(2);
		await expect.poll(active(input)).toBe('Banana');

		await page.keyboard.press('Alt+ArrowUp');
		await expectShown(comboList(page), false);
		await page.keyboard.press('Alt+ArrowDown');
		await expectShown(comboList(page), true);
		await expect.poll(active(input)).toBe('Banana');
	});

	test('an outside press and Tab close it', async ({ page }) => {
		const input = comboInput(page);
		await input.click();
		await page.keyboard.type('a');
		await expectShown(comboList(page), true);
		await page.getByRole('heading', { name: 'Headless option lists' }).click();
		await expectShown(comboList(page), false);
		expect((await logEntries(page)).at(-1)).toBe('combo:closed:outside');

		await input.click();
		await page.keyboard.type('p');
		await expectShown(comboList(page), true);
		await page.keyboard.press('Tab');
		await expectShown(comboList(page), false);
		await expect(page.getByRole('button', { name: 'After combobox' })).toBeFocused();
		expect((await logEntries(page)).at(-1)).toBe('combo:closed:focus-out');
	});
});

test.describe('CommandPalette (inline Combobox in a Dialog)', () => {
	test.beforeEach(async ({ page }) => open(page));

	test('Escape clears the query first, then closes the dialog; Enter runs a command', async ({ page }) => {
		const dialog = page.locator('[id$="-palette-content"]');
		const opener = page.getByRole('button', { name: 'Open palette' });
		const input = page.getByRole('combobox', { name: 'Command' });
		await opener.click();
		await expectShown(dialog, true);
		await expect(input).toBeFocused();
		await expect(input).toHaveAttribute('aria-expanded', 'true');
		await expect.poll(active(input)).toBe('New run');

		await page.keyboard.type('set');
		await expect.poll(active(input)).toBe('Open settings');
		await page.keyboard.press('Escape');
		await expect(input).toHaveValue('');
		await expectShown(dialog, true);
		await expect.poll(active(input)).toBe('New run');
		await page.keyboard.press('Escape');
		await expectShown(dialog, false);
		await expect(opener).toBeFocused();
		expect(await logEntries(page)).toEqual(['palette:open:trigger', 'palette:closed:escape']);

		await opener.click();
		await expect(input).toBeFocused();
		await page.keyboard.type('zzz');
		await expect(page.getByTestId('cmd-empty')).toBeVisible();
		await expect.poll(active(input)).toBe(null);
		await page.keyboard.press('Enter');
		await expectShown(dialog, true);
		await page.keyboard.press('Escape'); // clears "zzz"
		await page.keyboard.type('the');
		await page.keyboard.press('Enter');
		await expectShown(dialog, false);
		await expect(page.getByTestId('ran')).toHaveText('toggle-theme');

		await opener.click();
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(input)).toBe('Toggle theme');
		await page.getByRole('option', { name: 'Sign out' }).click();
		await expectShown(dialog, false);
		await expect(page.getByTestId('ran')).toHaveText('sign-out');
	});
});

test.describe('Listbox (multiple)', () => {
	test.beforeEach(async ({ page }) => open(page));

	const list = (page: Page) => page.getByRole('listbox', { name: 'Labels' });
	const value = (page: Page) => page.getByTestId('tags-value');

	test('keyboard: Space toggles, Shift+Arrow extends, Ctrl+A, Shift+Space and Ctrl+Shift+End', async ({ page }) => {
		const box = list(page);
		await expect(box).toHaveAttribute('aria-multiselectable', 'true');
		await box.focus();
		await expect.poll(active(box)).toBe('bug');
		await page.keyboard.press('Space');
		await expect(value(page)).toHaveText('bug');
		await expect(box.getByRole('option', { name: 'bug' })).toHaveAttribute('aria-selected', 'true');
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(box)).toBe('docs');
		await page.keyboard.press('Shift+ArrowDown');
		await expect(value(page)).toHaveText('bug,feature');
		await page.keyboard.press('Shift+ArrowDown'); // infra is disabled
		await expect.poll(active(box)).toBe('perf');
		await expect(value(page)).toHaveText('bug,feature,perf');

		await page.keyboard.press('ControlOrMeta+a');
		await expect(value(page)).toHaveText('bug,feature,perf,docs,security');
		await page.keyboard.press('ControlOrMeta+a');
		await expect(value(page)).toHaveText('none');

		await page.keyboard.press('Home');
		await page.keyboard.press('Space');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect.poll(active(box)).toBe('feature');
		await page.keyboard.press('Shift+Space');
		await expect(value(page)).toHaveText('bug,docs,feature');

		await page.keyboard.press('ControlOrMeta+Shift+End');
		await expect(value(page)).toHaveText('bug,docs,feature,perf,security');
		await expect.poll(active(box)).toBe('security');
		await page.keyboard.press('s'); // typeahead
		await expect.poll(active(box)).toBe('security');
		await page.waitForTimeout(600); // buffer reset
		await page.keyboard.press('d');
		await expect.poll(active(box)).toBe('docs');
	});

	test('mouse: click toggles, Shift+click selects a range, the list takes focus, disabled ignores', async ({
		page
	}) => {
		const box = list(page);
		await box.getByRole('option', { name: 'docs' }).click();
		await expect(box).toBeFocused();
		await expect(value(page)).toHaveText('docs');
		await box.getByRole('option', { name: 'perf' }).click({ modifiers: ['Shift'] });
		await expect(value(page)).toHaveText('docs,feature,perf');
		await box.getByRole('option', { name: 'docs' }).click();
		await expect(value(page)).toHaveText('feature,perf');
		await box.getByRole('option', { name: 'infra' }).click({ force: true }); // aria-disabled
		await expect(value(page)).toHaveText('feature,perf');
		await page.keyboard.press('ArrowUp'); // from docs, the last option clicked
		await expect.poll(active(box)).toBe('bug');
	});
});

for (const strategy of ['native', 'fallback'] as const) {
	test.describe(`list positioning (${strategy})`, () => {
		test.beforeEach(async ({ page }) => open(page, strategy));

		async function expectBelowAndAsWide(list: Locator, anchor: Locator): Promise<void> {
			await expect(list).toHaveAttribute('data-ak-position', strategy);
			await settled(list);
			await expect
				.poll(async () => {
					const [a, l] = await Promise.all([anchor.boundingBox(), list.boundingBox()]);
					if (!a || !l) return 'unmeasured';
					return {
						width: Math.round(l.width) === Math.round(a.width),
						left: Math.abs(l.x - a.x) <= 1,
						below: l.y >= a.y + a.height - 1
					};
				})
				.toEqual({ width: true, left: true, below: true });
			await expect(list).toHaveAttribute('data-side', 'bottom');
			const anchorWidth = await list.evaluate((el) => getComputedStyle(el).getPropertyValue('--ak-anchor-width'));
			expect(parseFloat(anchorWidth)).toBeCloseTo((await anchor.boundingBox())!.width, 0);
		}

		test('the combobox list matches the input width below it', async ({ page }) => {
			const input = comboInput(page);
			await input.click();
			await page.keyboard.type('e');
			await expectShown(comboList(page), true);
			await expectBelowAndAsWide(comboList(page), input);
		});

		test('the select list matches the trigger width below it', async ({ page }) => {
			const trigger = selectTrigger(page);
			await trigger.click();
			await expectShown(selectList(page), true);
			await expectBelowAndAsWide(selectList(page), trigger);
		});
	});
}
