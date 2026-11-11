import { expect, test, type Locator, type Page } from '@playwright/test';
import { content, expectShown, isShown, logEntries, settled, trigger, type Strategy } from './helpers';

/** Loads the menu fixture and waits for hydration (keys before it reach inert markup). */
async function openMenuFixture(page: Page, anchor?: Strategy): Promise<void> {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(anchor ? `/headless/menu/?anchor=${anchor}` : '/headless/menu/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

const item = (page: Page, name: string): Locator => page.getByRole('menuitem', { name, exact: true });
const checkbox = (page: Page, name: string): Locator => page.getByRole('menuitemcheckbox', { name });
const radio = (page: Page, name: string): Locator => page.getByRole('menuitemradio', { name });
const actions = (page: Page) => content(page, 'actions');
const share = (page: Page) => content(page, 'actions-sub-share');

async function box(locator: Locator) {
	const b = await locator.boundingBox();
	if (!b) throw new Error('no box');
	return b;
}

test.describe('headless menu', () => {
	test.beforeEach(async ({ page }) => {
		await openMenuFixture(page);
	});

	test('the closed trigger opens from the keyboard in all four ways', async ({ page }) => {
		const button = trigger(page, 'actions');
		for (const [key, first] of [
			['Enter', 'New file'],
			['Space', 'New file'],
			['ArrowDown', 'New file'],
			['ArrowUp', 'Delete']
		]) {
			await button.focus();
			await page.keyboard.press(key);
			await expectShown(actions(page), true);
			await expect(item(page, first)).toBeFocused();
			await expect(item(page, first)).toHaveAttribute('data-highlighted', '');
			await expect(button).toHaveAttribute('aria-expanded', 'true');
			await page.keyboard.press('Escape');
			await expectShown(actions(page), false);
			await expect(button).toBeFocused();
			await expect(button).toHaveAttribute('aria-expanded', 'false');
		}
		// A pointer click focuses the surface, with nothing highlighted yet.
		await button.click();
		await expectShown(actions(page), true);
		await expect(actions(page)).toBeFocused();
		await expect(actions(page).locator('[data-highlighted]')).toHaveCount(0);
		await page.keyboard.press('ArrowDown');
		await expect(item(page, 'New file')).toBeFocused();
		// Clicking the trigger again toggles it closed.
		await button.click();
		await expectShown(actions(page), false);
	});

	test('arrow keys rove, skip the disabled item and loop; Home and End jump', async ({ page }) => {
		await trigger(page, 'actions').focus();
		await page.keyboard.press('ArrowDown');
		const order = ['Copy', 'Share', 'Rename'];
		for (const name of order) {
			await page.keyboard.press('ArrowDown');
			await expect(item(page, name)).toBeFocused();
		}
		await page.keyboard.press('ArrowDown');
		await expect(checkbox(page, 'Show hidden files')).toBeFocused();
		await page.keyboard.press('ArrowUp');
		await expect(item(page, 'Rename')).toBeFocused();
		await page.keyboard.press('End');
		await expect(item(page, 'Delete')).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(item(page, 'New file')).toBeFocused();
		await page.keyboard.press('ArrowUp');
		await expect(item(page, 'Delete')).toBeFocused();
		await page.keyboard.press('Home');
		await expect(item(page, 'New file')).toBeFocused();
		// Exactly one item of this menu (not of its nested submenu) is the tab stop.
		await expect(actions(page).locator('[data-ak-nav$="-actions"][tabindex="0"]')).toHaveCount(1);
	});

	test('typeahead moves by label and never lands on the disabled item', async ({ page }) => {
		await trigger(page, 'actions').focus();
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('r');
		await expect(item(page, 'Rename')).toBeFocused();
		await page.waitForTimeout(600);
		// Only "Archive" starts with "a", and it is disabled.
		await page.keyboard.press('a');
		await expect(item(page, 'Rename')).toBeFocused();
		await page.waitForTimeout(600);
		await page.keyboard.press('s');
		await expect(checkbox(page, 'Show hidden files')).toBeFocused();
		await page.waitForTimeout(600);
		await page.keyboard.press('d');
		await expect(radio(page, 'Date')).toBeFocused();
		await page.keyboard.press('e');
		await expect(item(page, 'Delete')).toBeFocused();
	});

	test('a submenu opens and closes from the keyboard', async ({ page }) => {
		const shareItem = item(page, 'Share');
		await trigger(page, 'actions').focus();
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect(shareItem).toBeFocused();
		await expect(shareItem).toHaveAttribute('aria-haspopup', 'menu');
		await expect(shareItem).toHaveAttribute('aria-expanded', 'false');

		await page.keyboard.press('ArrowRight');
		await expectShown(share(page), true);
		await expect(item(page, 'Email link')).toBeFocused();
		await expect(shareItem).toHaveAttribute('aria-expanded', 'true');
		await expect(page.getByRole('menu', { name: 'Share' })).toBeVisible();

		await page.keyboard.press('ArrowLeft');
		await expectShown(share(page), false);
		await expect(shareItem).toBeFocused();
		expect(await isShown(actions(page))).toBe(true);

		await page.keyboard.press('Enter');
		await expectShown(share(page), true);
		await expect(item(page, 'Email link')).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(item(page, 'Copy link')).toBeFocused();

		await page.keyboard.press('Escape');
		await expectShown(share(page), false);
		await expect(shareItem).toBeFocused();
		expect(await isShown(actions(page))).toBe(true);

		await page.keyboard.press('Space');
		await expectShown(share(page), true);
		await expect(item(page, 'Email link')).toBeFocused();
		expect(await logEntries(page)).toEqual([
			'actions:open:trigger',
			'share:open:trigger',
			'share:closed:trigger',
			'share:open:trigger',
			'share:closed:escape',
			'share:open:trigger'
		]);
	});

	test('Escape closes the submenu, then the menu, then the dialog', async ({ page }) => {
		await trigger(page, 'dialog').click();
		await expectShown(content(page, 'dialog'), true);
		const menuButton = trigger(page, 'dmenu');
		await menuButton.focus();
		await page.keyboard.press('ArrowDown');
		await expect(item(page, 'Edit')).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowRight');
		await expect(item(page, 'Duplicate')).toBeFocused();

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'dmenu-sub-more'), false);
		await expect(item(page, 'More')).toBeFocused();
		expect(await isShown(content(page, 'dmenu'))).toBe(true);

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'dmenu'), false);
		await expect(menuButton).toBeFocused();
		expect(await isShown(content(page, 'dialog'))).toBe(true);

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'dialog'), false);
		await expect(trigger(page, 'dialog')).toBeFocused();
		expect(await logEntries(page)).toEqual([
			'dialog:open:trigger',
			'dmenu:open:trigger',
			'more:open:trigger',
			'more:closed:escape',
			'dmenu:closed:escape',
			'dialog:closed:escape'
		]);
	});

	test('choosing a leaf closes the whole chain and returns focus to the trigger once', async ({ page }) => {
		const button = trigger(page, 'actions');
		await button.evaluate((el) => {
			(window as unknown as { __focusCount: number }).__focusCount = 0;
			el.addEventListener('focus', () => (window as unknown as { __focusCount: number }).__focusCount++);
		});
		await button.focus();
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowDown');
		await expect(item(page, 'Copy link')).toBeFocused();
		await page.evaluate(() => ((window as unknown as { __focusCount: number }).__focusCount = 0));

		await page.keyboard.press('Enter');
		await expectShown(actions(page), false);
		expect(await isShown(share(page))).toBe(false);
		await expect(button).toBeFocused();
		await expect(page.getByTestId('selected')).toHaveText('link');
		await page.waitForTimeout(200);
		expect(await page.evaluate(() => (window as unknown as { __focusCount: number }).__focusCount)).toBe(1);
		const log = await logEntries(page);
		expect(log.slice(-2).sort()).toEqual(['actions:closed:select', 'share:closed:parent']);

		// The same with the pointer: hover the submenu open, click a leaf.
		await button.click();
		await item(page, 'Share').hover();
		await expectShown(share(page), true);
		await item(page, 'Messages').click();
		await expectShown(actions(page), false);
		expect(await isShown(share(page))).toBe(false);
		await expect(button).toBeFocused();
		await expect(page.getByTestId('selected')).toHaveText('link,messages');
	});

	test('checkbox and radio items toggle without closing unless configured to', async ({ page }) => {
		const state = page.getByTestId('state');
		await trigger(page, 'actions').click();
		await expectShown(actions(page), true);

		const hidden = checkbox(page, 'Show hidden files');
		await expect(hidden).toHaveAttribute('aria-checked', 'false');
		await hidden.click();
		await expect(hidden).toHaveAttribute('aria-checked', 'true');
		await expect(state).toHaveText('hidden=true wrap=false sort=name');
		await page.keyboard.press('Enter');
		await expect(hidden).toHaveAttribute('aria-checked', 'false');
		await page.keyboard.press('Space');
		await expect(hidden).toHaveAttribute('aria-checked', 'true');
		expect(await isShown(actions(page))).toBe(true);

		await expect(radio(page, 'Name')).toHaveAttribute('aria-checked', 'true');
		await radio(page, 'Date').click();
		await expect(radio(page, 'Date')).toHaveAttribute('aria-checked', 'true');
		await expect(radio(page, 'Name')).toHaveAttribute('aria-checked', 'false');
		await page.keyboard.press('ArrowDown');
		await expect(radio(page, 'Size')).toBeFocused();
		await page.keyboard.press('Space');
		await expect(radio(page, 'Size')).toHaveAttribute('aria-checked', 'true');
		await expect(state).toHaveText('hidden=true wrap=false sort=size');
		expect(await isShown(actions(page))).toBe(true);

		// onSelect + preventDefault keeps a plain item open; a disabled item does nothing.
		await item(page, 'Pin (stays open)').click();
		await expect(page.getByTestId('selected')).toHaveText('pin');
		await item(page, 'Archive').click({ force: true });
		await expect(page.getByTestId('selected')).toHaveText('pin');
		expect(await isShown(actions(page))).toBe(true);

		// closeOnSelect: true on a checkbox closes the menu.
		await checkbox(page, 'Word wrap').click();
		await expectShown(actions(page), false);
		await expect(state).toHaveText('hidden=true wrap=true sort=size');
		expect(await logEntries(page)).toEqual(['actions:open:trigger', 'actions:closed:select']);
	});

	test('a group is labelled by its label part', async ({ page }) => {
		await trigger(page, 'actions').click();
		await expect(page.getByRole('group', { name: 'View' })).toBeVisible();
		await expect(page.getByRole('group', { name: 'Sort by' })).toBeVisible();
		await expect(actions(page).getByRole('separator')).toHaveCount(3);
		await expect(page.getByRole('menu', { name: 'Actions' })).toBeVisible();
	});

	test('an outside press closes the menu and its submenu', async ({ page }) => {
		await trigger(page, 'actions').click();
		await item(page, 'Share').hover();
		await expectShown(share(page), true);
		await page.getByTestId('page-heading').click();
		await expectShown(actions(page), false);
		expect(await isShown(share(page))).toBe(false);
		const log = await logEntries(page);
		expect(log).toContain('actions:closed:outside');
		expect(log).toContain('share:closed:outside');
	});

	test('hovering opens a submenu; moving onto another item closes it', async ({ page }) => {
		await trigger(page, 'actions').click();
		const shareItem = item(page, 'Share');
		await shareItem.hover();
		await expectShown(share(page), true);
		// Hover keeps focus on the trigger item.
		await expect(shareItem).toBeFocused();
		expect(await logEntries(page)).toContain('share:open:hover');

		await item(page, 'Email link').hover();
		await expect(item(page, 'Email link')).toBeFocused();

		// Straight to an item above the trigger: outside the grace area.
		await item(page, 'Copy').hover();
		await expectShown(share(page), false);
		await expect(item(page, 'Copy')).toBeFocused();
		expect(await logEntries(page)).toContain('share:closed:hover');
		expect(await isShown(actions(page))).toBe(true);
	});

	test('moving diagonally across a sibling toward the submenu keeps it open', async ({ page }) => {
		await trigger(page, 'actions').click();
		const shareItem = item(page, 'Share');
		await shareItem.hover();
		await expectShown(share(page), true);
		await settled(share(page));
		const s = await box(shareItem);
		const sub = await box(share(page));
		const rename = await box(item(page, 'Rename'));
		// The straight line from the trigger to the submenu's lower-left crosses "Rename".
		const from = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
		const to = { x: sub.x + 10, y: sub.y + sub.height - 10 };
		const crossesAt = from.x + ((to.x - from.x) * (rename.y + rename.height / 2 - from.y)) / (to.y - from.y);
		expect(crossesAt).toBeGreaterThan(rename.x);
		expect(crossesAt).toBeLessThan(rename.x + rename.width);

		await page.mouse.move(from.x, from.y);
		await page.mouse.move(to.x, to.y, { steps: 12 });
		expect(await isShown(share(page))).toBe(true);
		await expect(item(page, 'Print')).toBeFocused();
		await expect(item(page, 'Rename')).not.toHaveAttribute('data-highlighted', '');
		expect(await logEntries(page)).not.toContain('share:closed:hover');
	});

	test('a context menu opens at the pointer on right-click', async ({ page }) => {
		const region = page.getByTestId('region');
		await region.scrollIntoViewIfNeeded();
		const r = await box(region);
		const point = { x: r.x + 40, y: r.y + 30 };
		await page.mouse.click(point.x, point.y, { button: 'right' });
		const menu = content(page, 'ctx');
		await expectShown(menu, true);
		await expect(menu).toBeFocused();
		await expect(page.getByRole('menu', { name: 'Region actions' })).toBeVisible();

		// A second right-click moves it.
		await page.mouse.click(point.x + 100, point.y + 10, { button: 'right' });
		await expectShown(menu, true);
		await settled(menu);
		await expect.poll(async () => Math.round((await box(menu)).x)).toBe(Math.round(point.x + 100));

		// A left press in the region closes it.
		await page.mouse.click(r.x + r.width - 20, r.y + r.height - 20);
		await expectShown(menu, false);
		expect(await logEntries(page)).toEqual(['ctx:open:trigger', 'ctx:closed:outside']);
	});

	for (const key of ['Shift+F10', 'ContextMenu']) {
		test(`a context menu opens from the keyboard (${key})`, async ({ page }) => {
			const button = page.getByRole('button', { name: 'Region button' });
			await button.focus();
			await page.keyboard.press(key);
			const menu = content(page, 'ctx');
			await expectShown(menu, true);
			await expect(item(page, 'Cut')).toBeFocused();
			await page.waitForTimeout(150);
			expect(await isShown(menu)).toBe(true);
			await page.keyboard.press('ArrowDown');
			await expect(item(page, 'Paste')).toBeFocused();
			await page.keyboard.press('Escape');
			await expectShown(menu, false);
			await expect(button).toBeFocused();

			await button.focus();
			await page.keyboard.press(key);
			await expect(item(page, 'Cut')).toBeFocused();
			await page.keyboard.press('Enter');
			await expectShown(menu, false);
			await expect(page.getByTestId('selected')).toHaveText('cut');
			await expect(button).toBeFocused();
		});
	}

	test('moving the highlight off a hover-opened submenu trigger by keyboard closes the submenu', async ({ page }) => {
		const button = trigger(page, 'actions');
		await button.click();
		const shareItem = item(page, 'Share');
		await shareItem.hover();
		await expectShown(share(page), true);
		await expect(shareItem).toBeFocused();

		await page.keyboard.press('ArrowDown');
		await expect(item(page, 'Rename')).toBeFocused();
		await expectShown(share(page), false);
		await expect(shareItem).toHaveAttribute('aria-expanded', 'false');

		// Escape now closes the menu itself, not a stale submenu.
		await page.keyboard.press('Escape');
		await expectShown(actions(page), false);
		await expect(button).toBeFocused();
		expect(await logEntries(page)).toEqual([
			'actions:open:trigger',
			'share:open:hover',
			'share:closed:focus-out',
			'actions:closed:escape'
		]);
	});
});

for (const motion of ['no-preference', 'reduce'] as const) {
	test.describe(`Tab out of a menu (motion: ${motion})`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: motion });
			await openMenuFixture(page);
		});

		/** Opens the menu from its button and moves to Copy, or into the Share submenu. */
		async function openAt(page: Page, level: 'menu' | 'submenu'): Promise<void> {
			await trigger(page, 'actions').focus();
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('ArrowDown');
			await expect(item(page, 'Copy')).toBeFocused();
			if (level === 'submenu') {
				await page.keyboard.press('ArrowDown');
				await page.keyboard.press('ArrowRight');
				await expect(item(page, 'Email link')).toBeFocused();
			}
		}

		for (const level of ['menu', 'submenu'] as const) {
			test(`Tab from the ${level} closes the chain and lands on the next control`, async ({ page }) => {
				await openAt(page, level);
				await page.keyboard.press('Tab');
				await expect(page.getByRole('button', { name: 'After actions' })).toBeFocused();
				await expectShown(actions(page), false);
				expect(await isShown(share(page))).toBe(false);
				await page.waitForTimeout(200);
				await expect(page.getByRole('button', { name: 'After actions' })).toBeFocused();
				expect(await logEntries(page)).toContain('actions:closed:focus-out');
			});

			test(`Shift+Tab from the ${level} closes the chain and lands on the menu button`, async ({ page }) => {
				await openAt(page, level);
				await page.keyboard.press('Shift+Tab');
				await expect(trigger(page, 'actions')).toBeFocused();
				await expectShown(actions(page), false);
				expect(await isShown(share(page))).toBe(false);
				await page.waitForTimeout(200);
				await expect(trigger(page, 'actions')).toBeFocused();
				expect(await logEntries(page)).toContain('actions:closed:focus-out');
				// Once more from the button reaches the control before it.
				await page.keyboard.press('Shift+Tab');
				await expect(page.getByRole('button', { name: 'Before actions' })).toBeFocused();
			});
		}
	});
}

for (const strategy of ['native', 'fallback'] as Strategy[]) {
	test.describe(`menu positioning (${strategy})`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await openMenuFixture(page, strategy);
		});

		test('the menu sits below its button, start-aligned; the submenu beside its item, top-aligned', async ({ page }) => {
			const button = trigger(page, 'actions');
			await button.click();
			const menu = actions(page);
			await expectShown(menu, true);
			await settled(menu);
			await expect(menu).toHaveAttribute('data-ak-position', strategy);
			await expect(menu).toHaveAttribute('data-side', 'bottom');
			const a = await box(button);
			const m = await box(menu);
			expect(Math.abs(m.y - (a.y + a.height + 4))).toBeLessThanOrEqual(1.5);
			expect(Math.abs(m.x - a.x)).toBeLessThanOrEqual(1.5);

			const shareItem = item(page, 'Share');
			await shareItem.focus();
			await page.keyboard.press('ArrowRight');
			const sub = share(page);
			await expectShown(sub, true);
			await settled(sub);
			await expect(sub).toHaveAttribute('data-ak-position', strategy);
			await expect(sub).toHaveAttribute('data-side', 'right');
			const t = await box(shareItem);
			const s = await box(sub);
			expect(Math.abs(s.x - (t.x + t.width + 2))).toBeLessThanOrEqual(1.5);
			expect(Math.abs(s.y - t.y)).toBeLessThanOrEqual(1.5);
		});

		test('a context menu is placed at the point with the fallback strategy', async ({ page }) => {
			const region = page.getByTestId('region');
			await region.scrollIntoViewIfNeeded();
			const r = await box(region);
			const point = { x: Math.round(r.x + 60), y: Math.round(r.y + 20) };
			await page.mouse.click(point.x, point.y, { button: 'right' });
			const menu = content(page, 'ctx');
			await expectShown(menu, true);
			await settled(menu);
			await expect(menu).toHaveAttribute('data-ak-position', 'fallback');
			const m = await box(menu);
			expect(Math.abs(m.x - point.x)).toBeLessThanOrEqual(1.5);
			expect(Math.abs(m.y - (point.y + 2))).toBeLessThanOrEqual(1.5);
		});
	});
}
