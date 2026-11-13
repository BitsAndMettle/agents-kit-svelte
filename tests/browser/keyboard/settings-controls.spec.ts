import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/**
 * The controls demos answer after 600 ms. A test that looks at an in-flight state owns that time:
 * the clock is installed before the page loads, paused before the action, and advanced by hand.
 */
async function openOnClock(page: Page, slug: string): Promise<Locator> {
	await page.clock.install();
	const section = await openSection(page, slug);
	// The installed clock runs with real time until now, so a moment a little ahead of it is never in its past.
	await page.clock.pauseAt(new Date(Date.now() + 5000));
	return section;
}

/** Longer than the demos' 600 ms answer. */
const SETTLE = 700;

/**
 * Clicks a cell's label-bearing checkbox and checks that while it saves no cell box moves, the spinner
 * stays off the cell's label and inside the cell's own box, and that nothing moves once it settles.
 */
async function expectSpinnerMovesNoCell(page: Page, matrix: Locator, cellName: string): Promise<void> {
	const cell = matrix.getByRole('checkbox', { name: cellName, exact: true });
	const td = cell.locator('xpath=ancestor::td[1]');
	const label = td.locator('label');
	// The narrow and list layouts label each cell.
	await expect(label).toBeVisible();
	await cell.scrollIntoViewIfNeeded();
	const boxes = () => matrix.locator('td[data-cell-key]').evaluateAll((tds) => tds.map((el) => { const r = el.getBoundingClientRect(); return [el.getAttribute('data-cell-key'), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
	const before = await boxes();
	await cell.click();
	await expect(cell).toHaveAttribute('aria-busy', 'true');
	const spinner = td.locator('svg.ak-spinner');
	await expect(spinner).toBeVisible();
	expect(await boxes()).toEqual(before);
	const l = (await label.boundingBox())!;
	const sp = (await spinner.boundingBox())!;
	const t = (await td.boundingBox())!;
	const overlaps = l.x < sp.x + sp.width && sp.x < l.x + l.width && l.y < sp.y + sp.height && sp.y < l.y + l.height;
	expect(overlaps, `label ${JSON.stringify(l)} spinner ${JSON.stringify(sp)}`).toBe(false);
	// It sits in the cell's own room, not over a neighbour.
	const inside = sp.x >= t.x - 0.5 && sp.x + sp.width <= t.x + t.width + 0.5 && sp.y >= t.y - 0.5 && sp.y + sp.height <= t.y + t.height + 0.5;
	expect(inside, `cell ${JSON.stringify(t)} spinner ${JSON.stringify(sp)}`).toBe(true);
	await page.clock.runFor(SETTLE);
	await expect(spinner).toHaveCount(0);
	expect(await boxes()).toEqual(before);
}

/** Opens the showcase with JavaScript off and returns the section (server-rendered markup only). */
async function openWithoutJs(browser: Browser, slug: string): Promise<{ page: Page; section: Locator; close: () => Promise<void> }> {
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	await page.goto('/');
	const section = page.locator('#' + slug);
	await section.scrollIntoViewIfNeeded();
	return { page, section, close: () => context.close() };
}

test.describe('ChoiceCards', () => {
	test('arrow keys move the choice; an instant change shows Changed and saving, then saved with Undo', async ({ page }) => {
		const section = await openOnClock(page, 'choice-cards');
		const theme = section.getByTestId('cc-theme');
		const system = theme.getByRole('radio', { name: 'System' });
		const light = theme.getByRole('radio', { name: 'Light' });
		await expect(theme).toHaveAttribute('role', 'radiogroup');
		await expect(theme).toHaveAccessibleName('Theme');
		await expect(system).toBeChecked();
		await expect(system).toHaveAccessibleDescription(/Current/);

		await system.focus();
		await press(page, 'ArrowRight');
		await expect(light).toBeChecked();
		await expect(light).toBeFocused();
		await expect(theme.getByRole('status')).toHaveText('Saving…');
		await expect(light).toHaveAccessibleDescription(/Changed/);
		await expect(section.getByTestId('cc-theme-saved')).toHaveText('Saved theme: system');

		await page.clock.runFor(SETTLE);
		await expect(theme.getByRole('status')).toHaveText('Saved');
		await expect(section.getByTestId('cc-theme-saved')).toHaveText('Saved theme: light');
		await expect(light).toHaveAccessibleDescription(/Current/);

		await theme.getByRole('button', { name: 'Undo' }).click();
		await page.clock.runFor(SETTLE);
		await expect(system).toBeChecked();
		await expect(section.getByTestId('cc-theme-saved')).toHaveText('Saved theme: system');
		await expect(theme.getByRole('button', { name: 'Undo' })).toHaveCount(0);
	});

	test('Undo from the keyboard returns focus to the radio the choice goes back to', async ({ page }) => {
		const section = await openOnClock(page, 'choice-cards');
		const theme = section.getByTestId('cc-theme');
		const system = theme.getByRole('radio', { name: 'System' });
		await system.focus();
		await press(page, 'ArrowRight');
		await page.clock.runFor(SETTLE);
		const undo = theme.getByRole('button', { name: 'Undo' });
		await undo.focus();
		await press(page, 'Enter');
		await expect(system).toBeFocused();
		await page.clock.runFor(SETTLE);
		await expect(system).toBeChecked();
		await expect(system).toBeFocused();
		await expect(section.getByTestId('cc-theme-saved')).toHaveText('Saved theme: system');
	});

	test('a failed instant change goes back and says so in an alert', async ({ page }) => {
		const section = await openOnClock(page, 'choice-cards');
		const density = section.getByTestId('cc-density');
		await density.getByText('Spacious').click();
		await expect(density.getByRole('radio', { name: 'Spacious' })).toBeChecked();
		await page.clock.runFor(SETTLE);
		await expect(density.getByRole('radio', { name: 'Default' })).toBeChecked();
		await expect(density.getByRole('alert')).toHaveText("Couldn't save. Changed back.");
	});

	test('inside a settings form the choice is staged: Changed caption, a described change, and Discard restores it', async ({ page }) => {
		const section = await openSection(page, 'choice-cards');
		const form = section.getByTestId('cc-defaults');
		const role = section.getByTestId('cc-role');
		await expect(role.getByRole('status')).toHaveCount(0);
		await role.getByRole('radio', { name: 'Viewer' }).check();
		await expect(role.getByRole('radio', { name: 'Viewer' })).toHaveAccessibleDescription(/Changed/);
		await expect(role.getByRole('radio', { name: 'Editor' })).toHaveAccessibleDescription(/Current/);
		await expect(form.getByTestId('cc-defaults-bar')).toContainText('1 unsaved change');
		await expect(form.getByTestId('cc-defaults-bar')).toContainText('Default role');
		await expect(role).toContainText('New members can read documents and comments.');
		await form.getByRole('button', { name: 'Discard' }).click();
		await expect(role.getByRole('radio', { name: 'Editor' })).toBeChecked();
		await expect(form.getByTestId('cc-defaults-bar')).toContainText('No unsaved changes');
	});

	test('a changed option still passes colour contrast in both themes', async ({ page }) => {
		// As the a11y ratchet does: no colour transitions, so a scan never sees a theme half-way.
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const section = await openSection(page, 'choice-cards');
		await section.getByTestId('cc-role').getByRole('radio', { name: 'Viewer' }).check();
		await expect(section.getByTestId('cc-role').getByRole('radio', { name: 'Viewer' })).toHaveAccessibleDescription(/Changed/);
		const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
		for (const want of ['light', 'dark']) {
			if ((await theme()) !== want) await page.getByRole('button', { name: 'Toggle global color theme' }).click();
			await expect.poll(theme).toBe(want);
			const results = await new AxeBuilder({ page }).include('#choice-cards').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
			expect(results.violations.map((v) => `${want}: ${v.id}`)).toEqual([]);
		}
	});

	test('a locked option and a locked group are disabled and described by their visible reason', async ({ page }) => {
		const section = await openSection(page, 'choice-cards');
		const admin = section.getByTestId('cc-role').getByRole('radio', { name: 'Admin' });
		await expect(admin).toBeDisabled();
		await expect(admin).toHaveAccessibleDescription(/Admin as a default role needs the Business plan\./);
		const start = section.getByTestId('cc-start');
		await expect(start.getByRole('radio', { name: 'Inbox' })).toBeDisabled();
		await expect(start).toHaveAccessibleDescription(/Your administrator sets the start page for everyone\./);
		await expect(start.getByText('Your administrator sets the start page for everyone.')).toBeVisible();
		const forever = section.getByTestId('cc-retention').getByRole('radio', { name: 'Forever' });
		await expect(forever).toBeDisabled();
		await expect(forever).toHaveAccessibleDescription(/Available on the Business plan\./);
	});

	test('without JavaScript the radios and Apply post natively', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'choice-cards');
		await page.route('**/settings-demo/appearance', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const theme = section.getByTestId('cc-theme');
		await expect(theme.getByRole('radio', { name: 'System' })).toBeChecked();
		await theme.getByRole('radio', { name: 'Dark' }).check();
		const request = page.waitForRequest((r) => r.url().endsWith('/settings-demo/appearance') && r.method() === 'POST');
		await theme.getByRole('button', { name: 'Apply' }).click();
		expect((await request).postData()).toBe('theme=dark');
		await close();
	});
});

test.describe('NotificationMatrix', () => {
	test('each cell is named "event by channel"; a locked cell is on, disabled and described by its reason', async ({ page }) => {
		const section = await openSection(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		await expect(matrix.getByRole('checkbox', { name: 'Mentions by Email', exact: true })).toBeChecked();
		await expect(matrix.getByRole('checkbox', { name: 'Replies by Push', exact: true })).not.toBeChecked();
		await expect(matrix.getByRole('columnheader', { name: /Email/ })).toBeVisible();
		await expect(matrix.getByRole('rowheader', { name: /Security alerts/ })).toBeVisible();
		const locked = matrix.getByRole('checkbox', { name: 'Security alerts by Email', exact: true });
		await expect(locked).toBeChecked();
		await expect(locked).toBeDisabled();
		await expect(locked).toHaveAccessibleDescription(/Always on\. Needed to keep your account safe\./);
		const text = matrix.getByRole('checkbox', { name: 'Mentions by Text', exact: true });
		await expect(text).toBeDisabled();
		await expect(text).toHaveAccessibleDescription(/Add a verified phone number first\./);
	});

	test('a cell commits on its own: busy, saved, and a refused cell goes back with an alert', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const cell = matrix.getByRole('checkbox', { name: 'Replies by Email', exact: true });
		await cell.focus();
		await press(page, 'Space');
		await expect(cell).toBeChecked();
		await expect(cell).toHaveAttribute('aria-busy', 'true');
		await expect(matrix.getByRole('status')).toHaveText('Saving…');
		await expect(section.getByTestId('nm-saved')).toHaveText('Saved: 7 cells');
		await page.clock.runFor(SETTLE);
		await expect(matrix.getByRole('status')).toHaveText('Saved');
		await expect(section.getByTestId('nm-saved')).toHaveText('Saved: 8 cells');

		const refused = matrix.getByRole('checkbox', { name: 'Weekly summary by Push', exact: true });
		await refused.check();
		await page.clock.runFor(SETTLE);
		await expect(refused).not.toBeChecked();
		await expect(matrix.getByRole('alert')).toHaveText("Weekly summary can't be sent by push. Changed back.");
	});

	test('a failing cell overtaken by a later change still reverts with its own alert, and saving covers every cell in flight', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const refused = matrix.getByRole('checkbox', { name: 'Weekly summary by Push', exact: true });
		const mentions = matrix.getByRole('checkbox', { name: 'Mentions by Push', exact: true });
		const message = "Weekly summary can't be sent by push. Changed back.";
		await refused.check();
		await page.clock.runFor(300);
		await mentions.check();
		await page.clock.runFor(350);
		// The refused cell has settled and gone back; the later one is still saving.
		await expect(refused).not.toBeChecked();
		await expect(matrix.getByRole('alert')).toHaveText(message);
		await expect(refused).toHaveAttribute('aria-invalid', 'true');
		await expect(refused).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
		await expect(matrix.getByRole('status')).toHaveText('Saving…');
		await page.clock.runFor(SETTLE);
		await expect(mentions).toBeChecked();
		await expect(matrix.getByRole('status')).toHaveText('Saved');
		await expect(matrix.getByRole('alert')).toHaveText(message);
		// Changing the failed cell again clears its alert.
		await refused.check();
		await expect(matrix.getByRole('alert')).toHaveCount(0);
	});

	test('instant cells are described by the shared status line', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const statusId = await matrix.getByRole('status').getAttribute('id');
		const mentions = matrix.getByRole('checkbox', { name: 'Mentions by Push', exact: true });
		expect((await mentions.getAttribute('aria-describedby'))?.split(' ')).toContain(statusId);
		await mentions.check();
		await expect(mentions).toHaveAccessibleDescription(/Saving…/);
		await page.clock.runFor(SETTLE);
		await expect(mentions).toHaveAccessibleDescription(/Saved/);
	});

	test('a column toggle shows mixed and turns every changeable cell on', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const column = matrix.getByRole('checkbox', { name: 'All events by Email' });
		expect(await column.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
		await column.click();
		await page.clock.runFor(SETTLE);
		for (const event of ['Mentions', 'Replies', 'Assigned to you', 'Weekly summary']) {
			await expect(matrix.getByRole('checkbox', { name: `${event} by Email`, exact: true })).toBeChecked();
		}
		await expect(column).toBeChecked();
		expect(await column.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(false);
	});

	test('Undo of a cell returns focus to that cell', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const cell = matrix.getByRole('checkbox', { name: 'Replies by Email', exact: true });
		await cell.focus();
		await press(page, 'Space');
		await page.clock.runFor(SETTLE);
		await matrix.getByRole('button', { name: 'Undo' }).focus();
		await press(page, 'Enter');
		await expect(cell).toBeFocused();
		await page.clock.runFor(SETTLE);
		await expect(cell).not.toBeChecked();
		await expect(cell).toBeFocused();
		await expect(section.getByTestId('nm-saved')).toHaveText('Saved: 7 cells');
	});

	test('a column toggle is one change: Undo puts back every cell it changed and focus returns to the toggle', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const column = matrix.getByRole('checkbox', { name: 'All events by In app' });
		expect(await column.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
		await column.click();
		await page.clock.runFor(SETTLE);
		await expect(column).toBeChecked();
		await expect(section.getByTestId('nm-saved')).toHaveText('Saved: 9 cells');
		await expect(matrix.getByRole('status')).toHaveText('Saved');
		await matrix.getByRole('button', { name: 'Undo' }).focus();
		await press(page, 'Enter');
		await expect(column).toBeFocused();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('nm-saved')).toHaveText('Saved: 7 cells');
		for (const event of ['Security alerts', 'Weekly summary']) {
			await expect(matrix.getByRole('checkbox', { name: `${event} by In app`, exact: true })).not.toBeChecked();
		}
		for (const event of ['Mentions', 'Replies', 'Assigned to you']) {
			await expect(matrix.getByRole('checkbox', { name: `${event} by In app`, exact: true })).toBeChecked();
		}
		expect(await column.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
		await expect(column).toBeFocused();
		await expect(matrix.getByRole('button', { name: 'Undo' })).toHaveCount(0);
	});

	test('every id a cell is described by exists, also after the browser grants a channel', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		const missing = () =>
			matrix.locator('input[data-cell]').evaluateAll((boxes) =>
				boxes.flatMap((box) => (box.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && !document.getElementById(id)))
			);
		expect(await missing()).toEqual([]);
		await matrix.getByRole('button', { name: 'Allow Push' }).click();
		await page.clock.runFor(SETTLE);
		await expect(matrix.getByText('Your browser asks before it shows Push notifications.')).toHaveCount(0);
		expect(await missing()).toEqual([]);
	});

	test('a channel the browser asks about first offers Allow, which reports the request', async ({ page }) => {
		const section = await openOnClock(page, 'notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		await expect(matrix.getByText('Your browser asks before it shows Push notifications.')).toBeVisible();
		const allow = matrix.getByRole('button', { name: 'Allow Push' });
		await allow.click();
		await expect(allow).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(matrix.getByText('Your browser asks before it shows Push notifications.')).toHaveCount(0);
	});

	test('in a narrow settings container each event stacks with labelled cells', async ({ page }) => {
		await openSection(page, 'notification-matrix');
		await page.setViewportSize({ width: 375, height: 800 });
		const section = page.locator('#notification-matrix');
		const matrix = section.getByTestId('nm-instant');
		// The header turns into a strip of column toggles; the event column header is gone.
		await expect(matrix.getByRole('columnheader', { name: 'Event', exact: true })).toBeHidden();
		await expect(matrix.getByRole('checkbox', { name: 'All events by In app' })).toBeVisible();
		await expect(matrix.getByRole('checkbox', { name: 'All events by Email' })).toBeVisible();
		const mentions = matrix.locator('tr[data-event="mention"]');
		await expect(mentions.locator('label', { hasText: 'Email' })).toBeVisible();
		await mentions.locator('label', { hasText: 'Push' }).click();
		await expect(matrix.getByRole('checkbox', { name: 'Mentions by Push', exact: true })).toBeChecked();
	});

	for (const width of [320, 360, 390]) {
		test(`at ${width}px a saving cell's spinner moves no cell and stays off the label`, async ({ page }) => {
			const section = await openOnClock(page, 'notification-matrix');
			await page.setViewportSize({ width, height: 900 });
			await expectSpinnerMovesNoCell(page, section.getByTestId('nm-instant'), 'Replies by Email');
		});
	}

	// The explicit list layout has its own classes; no catalogue demo saves a list cell on its own.
	for (const width of [320, 1440]) {
		test(`in the list layout at ${width}px a saving cell's spinner moves no cell and stays off the label`, async ({ page }) => {
			await page.clock.install();
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/fixtures/settings-controls/');
			await page.clock.pauseAt(new Date(Date.now() + 5000));
			const matrix = page.getByTestId('nm-list-instant');
			await expect(matrix).toHaveAttribute('data-layout', 'list');
			await expectSpinnerMovesNoCell(page, matrix, 'Replies by Email');
		});
	}

	test('inside a settings form cells are staged and Discard restores them', async ({ page }) => {
		const section = await openSection(page, 'notification-matrix');
		const form = section.getByTestId('nm-staged');
		await form.getByRole('checkbox', { name: 'Someone leaves the team by Email', exact: true }).check();
		await expect(form.getByTestId('nm-staged-bar')).toContainText('1 unsaved change');
		await expect(form.getByTestId('nm-staged-bar')).toContainText('Team notices');
		await expect(form.locator('[data-cell-key="left:email"]')).toHaveAttribute('data-dirty', '');
		await form.getByRole('button', { name: 'Discard' }).click();
		await expect(form.getByRole('checkbox', { name: 'Someone leaves the team by Email', exact: true })).not.toBeChecked();
		await expect(form.getByTestId('nm-staged-bar')).toContainText('No unsaved changes');
	});

	test('without JavaScript Apply posts every cell that is on, locked and unavailable ones through hidden inputs', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'notification-matrix');
		await page.route('**/settings-demo/notifications', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const matrix = section.getByTestId('nm-instant');
		await matrix.getByRole('checkbox', { name: 'Replies by Push', exact: true }).check();
		const request = page.waitForRequest((r) => r.url().endsWith('/settings-demo/notifications') && r.method() === 'POST');
		await matrix.getByRole('button', { name: 'Apply' }).click();
		const posted = new URLSearchParams((await request).postData() ?? '').getAll('notify').sort();
		expect(posted).toEqual(['assigned:app', 'assigned:email', 'digest:email', 'mention:app', 'mention:email', 'reply:app', 'reply:push', 'security:email', 'security:sms']);
		await close();
	});
});

test.describe('SettingsItemList', () => {
	test('a confirm-first action asks; Cancel does nothing; confirming removes the row and focus moves to the next row', async ({ page }) => {
		const section = await openOnClock(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		await members.getByRole('button', { name: 'More actions for Ben Ortiz' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		const dialog = page.getByRole('alertdialog', { name: 'Remove Ben Ortiz?' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
		await expect(section.getByTestId('il-log')).toHaveText('');

		await members.getByRole('button', { name: 'More actions for Ben Ortiz' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await dialog.getByRole('button', { name: 'Remove' }).click();
		await expect(members.getByRole('button', { name: 'More actions for Ben Ortiz' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(members.getByText('Ben Ortiz')).toHaveCount(0);
		await expect(members.getByRole('combobox', { name: 'Role for Chloé Martin' })).toBeFocused();
	});

	test('a confirm opened from the row menu gives focus back to that menu button on Cancel, Escape and failure', async ({ page }) => {
		const section = await openOnClock(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		const more = members.getByRole('button', { name: 'More actions for Dev Rao' });
		const dialog = page.getByRole('alertdialog', { name: 'Remove Dev Rao?' });

		await more.click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
		await expect(more).toBeFocused();

		await more.click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await expect(dialog).toBeVisible();
		await press(page, 'Escape');
		await expect(dialog).toBeHidden();
		await expect(more).toBeFocused();

		await more.click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await dialog.getByRole('button', { name: 'Remove' }).click();
		await expect(dialog).toBeHidden();
		await expect(more).toBeFocused();
		await page.clock.runFor(SETTLE);
		await expect(members.locator('li[data-item-id="m4"]').getByRole('status')).toHaveText("Couldn't finish that for Dev Rao. Try again.");
		await expect(more).toBeFocused();
	});

	test('in a narrow container a selectable row keeps its checkbox, icon and name on one line', async ({ page }) => {
		await openSection(page, 'settings-item-list');
		await page.setViewportSize({ width: 360, height: 800 });
		const row = page.locator('#settings-item-list').getByTestId('il-exports').locator('li[data-item-id="e1"]');
		await row.scrollIntoViewIfNeeded();
		const box = async (locator: Locator) => (await locator.boundingBox())!;
		const check = await box(row.getByRole('checkbox'));
		const name = await box(row.getByText('export-2026-10-01.zip'));
		expect(name.x).toBeGreaterThan(check.x + check.width);
		// Same line: the name's box overlaps the checkbox's vertical span.
		expect(name.y).toBeLessThan(check.y + check.height);
		expect(name.y + name.height).toBeGreaterThan(check.y);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
	});

	test('removing the last row of a sub-group moves focus to the heading', async ({ page }) => {
		const section = await openOnClock(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		await members.getByRole('button', { name: 'Revoke invite to erin@northwind.example' }).click();
		await page.clock.runFor(SETTLE);
		await expect(members.getByText('erin@northwind.example')).toHaveCount(0);
		await expect(members.getByRole('heading', { name: 'Members' })).toBeFocused();
	});

	test('a failed row action is announced politely on that row and the row stays', async ({ page }) => {
		const section = await openOnClock(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		await members.getByRole('button', { name: 'More actions for Dev Rao' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
		await page.clock.runFor(SETTLE);
		const row = members.locator('li[data-item-id="m4"]');
		await expect(row.getByRole('status')).toHaveText("Couldn't finish that for Dev Rao. Try again.");
		await expect(row.getByRole('status')).toBeVisible();
	});

	test('a failure on a row the filter hides is announced by the list', async ({ page }) => {
		const section = await openOnClock(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		const listStatus = members.locator('[data-list-status]');
		await expect(listStatus).toHaveAttribute('role', 'status');
		await expect(listStatus).toHaveText('');
		await members.getByRole('button', { name: 'More actions for Dev Rao' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
		await expect(page.getByRole('alertdialog')).toBeHidden();
		const filterBox = members.getByRole('searchbox', { name: 'Filter' });
		await filterBox.fill('Ben');
		await expect(filterBox).toHaveValue('Ben');
		await expect(members.locator('li[data-item-id="m4"]')).toBeHidden();
		await page.clock.runFor(SETTLE);
		await expect(listStatus).toHaveText("Couldn't finish that for Dev Rao. Try again.");
		await expect(listStatus).toBeVisible();
		// Shown again, the row carries its own failure and the list stops repeating it.
		await members.getByRole('searchbox', { name: 'Filter' }).fill('');
		await expect(members.locator('li[data-item-id="m4"]').getByRole('status')).toHaveText("Couldn't finish that for Dev Rao. Try again.");
		await expect(listStatus).toHaveText('');
	});

	test('hiding a row that already failed does not announce its failure again', async ({ page }) => {
		const section = await openOnClock(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		const listStatus = members.locator('[data-list-status]');
		await members.getByRole('button', { name: 'More actions for Dev Rao' }).click();
		await page.getByRole('menuitem', { name: 'Remove' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
		await page.clock.runFor(SETTLE);
		await expect(members.locator('li[data-item-id="m4"]').getByRole('status')).toHaveText("Couldn't finish that for Dev Rao. Try again.");
		await expect(listStatus).toHaveText('');
		await page.clock.runFor(60000);
		const filterBox = members.getByRole('searchbox', { name: 'Filter' });
		await filterBox.fill('Ben');
		await expect(members.locator('li[data-item-id="m4"]')).toBeHidden();
		await expect(listStatus).toHaveText('');
		await expect(listStatus).toHaveClass(/sr-only/);
		await filterBox.fill('');
		await filterBox.fill('Ben');
		await expect(listStatus).toHaveText('');
	});

	test('a locked row cannot be acted on or selected, and says why', async ({ page }) => {
		const section = await openSection(page, 'settings-item-list');
		await section.getByTestId('il-members').getByRole('button', { name: 'More actions for Ada Park' }).click();
		await expect(page.getByRole('menuitem', { name: 'Remove' })).toBeDisabled();
		await press(page, 'Escape');
		const locked = section.getByTestId('il-exports').getByRole('checkbox', { name: 'Select export-2026-11-01.zip' });
		await expect(locked).toBeDisabled();
		await expect(locked).toHaveAccessibleDescription('In use by a scheduled transfer.');
		const add = section.getByTestId('il-folders').getByRole('button', { name: 'Add folder' });
		await expect(add).toHaveAttribute('aria-disabled', 'true');
		await expect(add).toHaveAccessibleDescription('Your plan includes 3 folders. Remove one or upgrade to add more.');
	});

	test('a selection survives filtering, still posts hidden rows, and the summary counts it', async ({ page }) => {
		const section = await openSection(page, 'settings-item-list');
		const exports = section.getByTestId('il-exports');
		const summary = exports.locator('[data-selection] [role=status]').first();
		await expect(summary).toHaveText('2 selected · frees 2.1 GB');
		await exports.getByRole('searchbox', { name: 'Filter' }).fill('08-01');
		await expect(exports.getByRole('checkbox', { name: /^Select / })).toHaveCount(1);
		// The hidden rows keep their ticked boxes, so the selection still posts.
		await expect(exports.locator('input[type=checkbox][name=selected]:checked:not(:visible)')).toHaveCount(2);
		await exports.getByRole('checkbox', { name: 'Select export-2026-08-01.zip' }).check();
		await expect(summary).toHaveText('3 selected · frees 2.9 GB');
		await exports.getByRole('searchbox', { name: 'Filter' }).fill('nothing like this');
		await expect(exports.getByText('Nothing matches “nothing like this”.').and(page.locator(':not([role=status])'))).toBeVisible();
		await exports.getByRole('button', { name: 'Clear filter' }).click();
		for (const name of ['export-2026-10-01.zip', 'export-2026-09-01.zip', 'export-2026-08-01.zip']) {
			await expect(exports.getByRole('checkbox', { name: `Select ${name}` })).toBeChecked();
		}
	});

	test('without JavaScript a row button posts actionId=itemId and the filter is a GET form', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'settings-item-list');
		await page.route('**/settings-demo/members', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const members = section.getByTestId('il-members');
		// Before JavaScript, row actions are plain buttons (no menu).
		await expect(members.getByRole('button', { name: 'Reset sign-in' }).first()).toBeVisible();
		await expect(members.locator('form[method=get]')).toHaveCount(1);
		const request = page.waitForRequest((r) => r.url().endsWith('/settings-demo/members') && r.method() === 'POST');
		await members.getByRole('button', { name: 'Resend invite to erin@northwind.example' }).click();
		expect((await request).postData()).toBe('resend=i1');
		await close();
	});

	test('without JavaScript nothing that asks first, is locked or is unavailable posts', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'settings-item-list');
		const posts: string[] = [];
		page.on('request', (r) => {
			if (r.method() === 'POST') posts.push(`${r.url()} ${r.postData() ?? ''}`);
		});
		await page.route('**/settings-demo/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const members = section.getByTestId('il-members');
		const ben = members.locator('li[data-item-id="m2"]');
		// A confirm-first action with a route is a link to it, never a post.
		await expect(ben.getByRole('link', { name: 'Remove' })).toHaveAttribute('href', '?dialog=remove-member&member=m2');
		await expect(ben.locator('button[type=submit]', { hasText: 'Remove' })).toHaveCount(0);
		// A locked row's buttons are plain buttons: even a forced click posts nothing.
		const ada = members.locator('li[data-item-id="m1"]');
		await expect(ada.getByRole('link')).toHaveCount(0);
		for (const button of await ada.getByRole('button').all()) {
			await expect(button).toHaveAttribute('type', 'button');
			// A dispatched click: a forced mouse click can land on the sticky page header above the row.
			await button.dispatchEvent('click');
		}
		// A confirm-first bulk action without a route waits for the page.
		const bulk = section.getByTestId('il-exports').getByRole('button', { name: 'Delete selected' });
		await expect(bulk).toHaveAttribute('type', 'button');
		await expect(bulk).toHaveAttribute('aria-disabled', 'true');
		await bulk.click({ force: true });
		await page.waitForTimeout(300);
		expect(posts).toEqual([]);
		await close();
	});
});

test.describe('UsageMeter', () => {
	test('is a meter with value, range and value text, and says near or over in words', async ({ page }) => {
		const section = await openSection(page, 'usage-meter');
		const seats = section.getByTestId('um-seats').getByRole('meter', { name: 'Seats' });
		await expect(seats).toHaveAttribute('aria-valuenow', '42');
		await expect(seats).toHaveAttribute('aria-valuemin', '0');
		await expect(seats).toHaveAttribute('aria-valuemax', '50');
		await expect(seats).toHaveAttribute('aria-valuetext', '42 of 50 seats, Near the limit');
		await expect(section.getByTestId('um-seats')).toContainText('8 seats left');
		await expect(section.getByTestId('um-seats')).toContainText('Resets in 18 days');
		const over = section.getByTestId('um-over');
		await expect(over.getByText('Over the limit')).toBeVisible();
		await expect(over.getByRole('meter')).toHaveAttribute('aria-valuetext', '212 of 200 files, Over the limit');
		await expect(over.getByRole('meter')).toHaveAttribute('aria-valuemax', '212');
		const storage = section.getByTestId('um-storage').getByRole('meter', { name: 'Storage' });
		await expect(storage).toHaveAttribute('aria-valuenow', '27.7');
		await expect(storage).toHaveAccessibleDescription(/Files 18\.2 GB/);
	});

	test('unlimited and no data draw no meter and say so', async ({ page }) => {
		const section = await openSection(page, 'usage-meter');
		await expect(section.getByTestId('um-unlimited').getByRole('meter')).toHaveCount(0);
		await expect(section.getByTestId('um-unlimited')).toContainText('7 guests used · Unlimited');
		await expect(section.getByTestId('um-none').getByRole('meter')).toHaveCount(0);
		await expect(section.getByTestId('um-none').getByText('No runs yet this month')).toBeVisible();
	});

	test('meters in a table share one scale', async ({ page }) => {
		const section = await openSection(page, 'usage-meter');
		await expect(section.getByTestId('um-row-design').getByRole('meter')).toHaveAttribute('aria-valuemax', '40');
		await expect(section.getByTestId('um-row-support').getByRole('meter')).toHaveAttribute('aria-valuetext', '44 h of 40 h, Over the limit');
		const width = (id: string) => section.getByTestId(id).locator('[data-limit]').evaluate((el) => (el as HTMLElement).style.left);
		expect(await width('um-row-design')).toBe(await width('um-row-research'));
	});

	test('the action loads while its promise is pending, shows its returned error, then succeeds', async ({ page }) => {
		const section = await openOnClock(page, 'usage-meter');
		const seats = section.getByTestId('um-seats');
		const add = seats.getByRole('button', { name: 'Add seats' });
		await add.click();
		await expect(add).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(add).not.toHaveAttribute('aria-busy', 'true');
		await expect(seats.getByRole('alert')).toHaveText('Seat checkout is busy. Try again in a moment.');
		await add.click();
		await page.clock.runFor(SETTLE);
		await expect(seats.getByRole('alert')).toHaveCount(0);
		await expect(section.getByTestId('um-log')).toHaveText('Opened seat checkout');
	});
});

test.describe('CopyValue', () => {
	const TOKEN = 'nw_live_4f9c2e7a1b8d3f60c5e2a9d7b1f4c8e2';

	test('copies locally and announces it; the value is never in data attributes or the URL', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
		});
		const section = await openOnClock(page, 'copy-value');
		const command = section.getByTestId('cv-command');
		await expect(command.getByRole('textbox', { name: 'Install command' })).toHaveValue('npx northwind-cli@latest connect');
		await command.getByRole('button', { name: 'Copy Install command' }).click();
		await expect(command.getByRole('status')).toHaveText('Copied');
		await expect(section.getByTestId('cv-log')).toHaveText('Copied the install command');

		const masked = section.getByTestId('cv-masked');
		await masked.getByRole('button', { name: 'Reveal' }).click();
		await expect(masked.getByRole('textbox', { name: 'API key' })).toHaveValue(TOKEN);
		const inAttributes = await section.evaluate((root, token) => {
			for (const el of [root, ...root.querySelectorAll('*')]) {
				for (const attr of el.attributes) if (attr.name !== 'value' && attr.value.includes(token)) return `${el.tagName} ${attr.name}`;
			}
			return '';
		}, TOKEN);
		expect(inAttributes).toBe('');
		expect(page.url()).not.toContain(TOKEN);
	});

	test('when the clipboard refuses, it says so and selects the text', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true });
			document.execCommand = () => false;
		});
		const section = await openOnClock(page, 'copy-value');
		const id = section.getByTestId('cv-id');
		await id.getByRole('button', { name: 'Copy Team ID' }).click();
		await expect(id.getByRole('status')).toHaveText("Couldn't copy. The text is selected: press Ctrl+C or ⌘C.");
		const input = id.getByRole('textbox', { name: 'Team ID' });
		await expect(input).toBeFocused();
		expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([0, 'tm_8f3k2q9x'.length]);
	});

	test('when the clipboard refuses a hidden value, it says to reveal it (nothing is selected)', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true });
			document.execCommand = () => false;
		});
		const section = await openOnClock(page, 'copy-value');
		const masked = section.getByTestId('cv-masked');
		await masked.getByRole('button', { name: 'Copy API key' }).click();
		await expect(masked.getByRole('status')).toHaveText("Couldn't copy. Choose Reveal, then select the text and copy it yourself.");
		expect(await page.evaluate(() => String(window.getSelection() ?? ''))).toBe('');
		await expect(masked.getByRole('textbox', { name: 'API key' })).not.toHaveValue(TOKEN);
	});

	test('a masked value is not in the page until Reveal, and is masked again after a remount', async ({ page }) => {
		const section = await openSection(page, 'copy-value');
		const masked = section.getByTestId('cv-masked');
		const field = masked.getByRole('textbox', { name: 'API key' });
		await expect(field).not.toHaveValue(TOKEN);
		await expect(field).toHaveAccessibleDescription('Hidden. Choose Reveal to show it.');
		expect(await section.innerHTML()).not.toContain(TOKEN);
		await masked.getByRole('button', { name: 'Reveal' }).click();
		await expect(field).toHaveValue(TOKEN);
		await expect(masked.getByRole('button', { name: 'Hide' })).toBeVisible();
		await page.getByRole('button', { name: 'Replay CopyValue demo' }).click();
		await expect(section.getByTestId('cv-masked').getByRole('textbox', { name: 'API key' })).not.toHaveValue(TOKEN);
	});

	test('show once: Done waits for the acknowledgement, then reports; an expired value is removed', async ({ page }) => {
		const section = await openOnClock(page, 'copy-value');
		const once = section.getByTestId('cv-once');
		await expect(once.getByText("You won't see this again")).toBeVisible();
		const done = once.getByRole('button', { name: 'Done' });
		await expect(done).toHaveAttribute('aria-disabled', 'true');
		await expect(done).toHaveAccessibleDescription('Check the box above first.');
		await once.getByRole('checkbox', { name: "I've saved it somewhere safe" }).check();
		await expect(done).not.toHaveAttribute('aria-disabled', 'true');
		await done.click();
		await expect(done).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(section.getByText('The secret is gone from this page.')).toBeVisible();

		const expired = section.getByTestId('cv-expired');
		await expect(expired.getByText('This value has expired.')).toBeVisible();
		await expect(expired.getByRole('textbox')).toHaveCount(0);
		await expect(expired.getByRole('button', { name: /Copy/ })).toHaveCount(0);
	});

	test('before JavaScript the value is a selectable read-only field and the buttons wait', async ({ browser }) => {
		const { section, close } = await openWithoutJs(browser, 'copy-value');
		const command = section.getByTestId('cv-command');
		const input = command.getByRole('textbox', { name: 'Install command' });
		await expect(input).toHaveValue('npx northwind-cli@latest connect');
		await expect(input).toHaveAttribute('readonly', '');
		await expect(command.getByRole('button', { name: 'Copy Install command' })).toHaveAttribute('aria-disabled', 'true');
		await expect(section.getByTestId('cv-once').getByRole('button', { name: 'Done' })).toHaveAttribute('aria-disabled', 'true');
		expect(await section.getByTestId('cv-masked').innerHTML()).not.toContain(TOKEN);
		await close();
	});
});

test('NativeSelect pill: a compact chip that keeps the native select and reports the choice', async ({ page }) => {
	const section = await openSection(page, 'native-select');
	const pill = section.getByRole('combobox', { name: 'Role for Chloé Martin' });
	await expect(pill).toHaveValue('member');
	await pill.selectOption('admin');
	await expect(section.getByTestId('pill-role')).toHaveText('Chloé is now: admin');
	const face = pill.locator('xpath=..');
	await expect(face.locator('span[aria-hidden="true"]')).toHaveText('Admin');
	await pill.focus();
	await expect(face).toHaveCSS('outline-style', 'solid');
	await expect(section.getByRole('combobox', { name: 'Role for Ada Park' })).toBeDisabled();
});

/** Opens the controls fixture and waits until it is interactive (an instant cell with no `action` is enabled once mounted). */
async function openFixture(page: Page, width = 1440): Promise<void> {
	await page.setViewportSize({ width, height: 900 });
	await page.goto('/fixtures/settings-controls/');
	await expect(page.getByTestId('nm-list-instant').getByRole('checkbox', { name: 'Mentions by In app', exact: true })).toBeEnabled({ timeout: 45000 });
}

/** Opens the composed settings fixture with its scripts held back; returns the function that lets them load. */
async function openComposedHeld(page: Page): Promise<() => Promise<void>> {
	await page.setViewportSize({ width: 1440, height: 900 });
	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => (release = resolve));
	await page.route('**/_app/immutable/**/*.js', async (route) => {
		await held;
		await route.continue();
	});
	await page.goto('/fixtures/settings-composed/', { waitUntil: 'domcontentloaded' });
	return async () => {
		release();
		// An instant switch with no `action` is enabled once the page is interactive.
		await expect(page.getByRole('switch', { name: 'Play a sound' })).toBeEnabled({ timeout: 45000 });
	};
}

/** Opens the composed settings fixture once it is interactive. */
async function openComposed(page: Page, width = 1440): Promise<void> {
	await page.setViewportSize({ width, height: 900 });
	await page.goto('/fixtures/settings-composed/');
	await expect(page.getByRole('switch', { name: 'Play a sound' })).toBeEnabled({ timeout: 45000 });
}

test.describe('Readiness and staged errors', () => {
	test('below a SettingsLayout that is not ready, every JS-only control waits', async ({ page }) => {
		await openFixture(page);
		const held = page.getByTestId('not-ready');
		await expect(held.getByRole('radio', { name: 'Default' })).toBeDisabled();
		await expect(held.getByRole('button', { name: 'Copy Held ID' })).toHaveAttribute('aria-disabled', 'true');
		await expect(held.getByRole('checkbox', { name: 'Mentions by Email', exact: true })).toBeDisabled();
		await expect(held.getByRole('checkbox', { name: /^All events by/ })).toHaveCount(0);
		for (const name of ['Remove', 'Ping', 'Add held', 'Add held seats']) {
			const button = held.getByRole('button', { name, exact: true }).first();
			await expect(button, name).toHaveAttribute('aria-disabled', 'true');
			await button.click({ force: true });
		}
		await expect(page.getByRole('alertdialog')).toHaveCount(0);
		await expect(held.getByTestId('held-calls')).toHaveText('0');
	});

	test('a server error for a staged matrix or selection shows on it, marks it invalid, and clears once it is edited', async ({ page }) => {
		await openFixture(page);
		const form = page.getByRole('form', { name: 'Team policy' });
		await form.getByRole('checkbox', { name: 'Someone leaves by Email', exact: true }).check();
		await form.getByRole('button', { name: 'Save', exact: true }).click();
		const matrixError = form.locator('table').locator('xpath=..').getByRole('alert');
		await expect(matrixError).toHaveText('Pick at least one way to hear about people leaving.');
		const cell = form.getByRole('checkbox', { name: 'Someone joins by In app', exact: true });
		await expect(cell).toHaveAttribute('aria-invalid', 'true');
		await expect(cell).toHaveAccessibleDescription(/Pick at least one way/);
		const approvers = form.getByRole('region', { name: 'Approvers' });
		const ben = approvers.getByRole('checkbox', { name: 'Select Ben Ortiz' });
		await expect(approvers.getByRole('alert')).toHaveText('Choose at least two approvers.');
		await expect(ben).toHaveAttribute('aria-invalid', 'true');
		await expect(ben).toHaveAccessibleDescription('Choose at least two approvers.');

		await cell.check();
		await expect(matrixError).toHaveText('');
		await expect(cell).not.toHaveAttribute('aria-invalid', 'true');
		await expect(approvers.getByRole('alert')).toHaveText('Choose at least two approvers.');
		await ben.check();
		await expect(approvers.getByRole('alert')).toHaveText('');
		await expect(ben).not.toHaveAttribute('aria-invalid', 'true');
	});

	test('Enter in a read-only CopyValue inside a settings form does not save it', async ({ page }) => {
		await openFixture(page);
		const form = page.getByRole('form', { name: 'Team policy' });
		await form.getByRole('checkbox', { name: 'Someone leaves by Email', exact: true }).check();
		await form.getByRole('textbox', { name: 'Invite link' }).focus();
		await press(page, 'Enter');
		// Pressing Save afterwards proves the counter works; Enter alone must leave it at 0.
		await expect(page.getByTestId('staged-saves')).toHaveText('0');
		await form.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByTestId('staged-saves')).toHaveText('1');
	});

	test('inside a settings form without JavaScript the filter is disabled, so Enter cannot post the form', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/fixtures/settings-controls/');
		await expect(page.getByRole('form', { name: 'Team policy' }).getByRole('searchbox', { name: 'Filter Approvers' })).toBeDisabled();
		await context.close();
	});
});

test.describe('Action failures', () => {
	test("a meter's action shows its returned error, and a rejection shows the generic label", async ({ page }) => {
		await page.clock.install();
		await openFixture(page);
		await page.clock.pauseAt(new Date(Date.now() + 5000));
		const actions = page.getByTestId('actions');
		const error = actions.getByRole('button', { name: 'Add error seats' });
		await error.click();
		await expect(error).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(error.locator('xpath=..').getByRole('alert')).toHaveText('Could not add seats.');
		const reject = actions.getByRole('button', { name: 'Add rejecting seats' });
		await reject.click();
		await page.clock.runFor(SETTLE);
		await expect(reject.locator('xpath=..').getByRole('alert')).toHaveText("Couldn't do that. Try again.");
	});

	test("a list's add action shows its returned error, and an empty list's action runs its callback", async ({ page }) => {
		await page.clock.install();
		await openFixture(page);
		await page.clock.pauseAt(new Date(Date.now() + 5000));
		const actions = page.getByTestId('actions');
		const add = actions.getByRole('button', { name: 'Add feed' });
		await add.click();
		await expect(add).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(actions.getByRole('region', { name: 'Feeds' }).getByRole('alert')).toHaveText('Feeds are full.');
		await actions.getByRole('button', { name: 'Create first key' }).click();
		await expect(actions.getByTestId('empty-calls')).toHaveText('1');
	});
});

test.describe('SettingsItemList filter, focus and bulk actions', () => {
	test('the filter announces how many match or that nothing does; Clear filter gives focus back to the box; the search region is named', async ({ page }) => {
		const section = await openSection(page, 'settings-item-list');
		const members = section.getByTestId('il-members');
		await expect(members.getByRole('search', { name: 'Filter Members' })).toBeVisible();
		const box = members.getByRole('searchbox', { name: 'Filter Members' });
		const status = members.locator('[data-filter-status]');
		await expect(status).toHaveAttribute('role', 'status');
		await box.fill('zzz');
		await expect(status).toHaveText('Nothing matches “zzz”.');
		await press(page, 'Tab');
		await expect(members.getByRole('button', { name: 'Clear filter' })).toBeFocused();
		await press(page, 'Enter');
		await expect(box).toBeFocused();
		await expect(box).toHaveValue('');
		await expect(status).toHaveText('');
		await box.fill('ben');
		await expect(status).toHaveText('1 shown');
	});

	test('the list heading, where focus lands after a removal, shows a focus ring', async ({ page }) => {
		const section = await openSection(page, 'settings-item-list');
		const heading = section.getByTestId('il-members').getByRole('heading', { name: 'Members' });
		await press(page, 'Tab');
		await heading.evaluate((el) => (el as HTMLElement).focus());
		await expect(heading).toBeFocused();
		const style = await heading.evaluate((el) => {
			const s = getComputedStyle(el);
			return `${s.outlineStyle} ${s.outlineWidth}`;
		});
		expect(style).toBe('solid 2px');
	});

	test('a bulk action shows why it is unavailable, and a bulk link navigates', async ({ page }) => {
		await openFixture(page);
		const feeds = page.getByTestId('actions').getByRole('region', { name: 'Feeds' });
		const send = feeds.locator('[data-bulk=send]');
		await expect(send).toHaveAttribute('aria-disabled', 'true');
		await expect(send).toHaveAccessibleDescription('Send: Sending is not available here.');
		const open = feeds.locator('[data-bulk=open]');
		await expect(open).toHaveAttribute('href', '?report=1');
		await open.click();
		await expect(page).toHaveURL(/\?report=1/);
		await expect(page.getByTestId('bulk-log')).toHaveText('');
	});

	test("a row's status that changes is announced politely", async ({ page }) => {
		await openFixture(page);
		const feeds = page.getByTestId('actions').getByRole('region', { name: 'Feeds' });
		const news = feeds.locator('[data-item-status]');
		await expect(news).toHaveAttribute('role', 'status');
		await expect(news).toHaveText('');
		await page.getByRole('button', { name: 'Break audit feed' }).click();
		await expect(news).toHaveText('Audit feed: Sync failed');
	});

	test('without JavaScript a GET filter keeps the hidden fields it is given', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/fixtures/settings-controls/');
		const feeds = page.getByTestId('actions').getByRole('region', { name: 'Feeds' });
		await feeds.getByRole('searchbox').fill('Release');
		await feeds.getByRole('button', { name: 'Filter', exact: true }).click();
		await expect(page).toHaveURL(/section=feeds/);
		await expect(page).toHaveURL(/feed=Release/);
		await context.close();
	});

	test('the default badge on the current item is neutral', async ({ page }) => {
		await openFixture(page);
		await expect(page.getByTestId('not-ready').getByRole('region', { name: 'Held people' }).locator('[data-current]')).toContainText('Current');
	});
});

test.describe('Before the page is interactive', () => {
	test('a select changed, boxes ticked and a filter typed before hydration are kept, counted and applied', async ({ page }) => {
		const release = await openComposedHeld(page);
		const form = page.getByTestId('composed-form');
		await form.getByRole('combobox', { name: 'Data retention' }).selectOption('30');
		await page.getByTestId('composed-approvers').getByRole('checkbox', { name: 'Select Chloe Martin' }).check();
		await page.getByTestId('composed-members').getByRole('searchbox').fill('Ben');
		await release();

		await expect(form.getByRole('combobox', { name: 'Data retention' })).toHaveValue('30');
		await expect(form.getByText('2 unsaved changes', { exact: true })).toBeVisible();
		const approvers = page.getByTestId('composed-approvers');
		const summary = approvers.locator('[data-selection] > [role=status]').first();
		await expect(summary).toHaveText('3 selected');
		await approvers.getByRole('checkbox', { name: 'Select Dev Rao' }).check();
		await expect(summary).toHaveText('4 selected');
		const members = page.getByTestId('composed-members');
		await expect(members.locator('li[data-item-id]:visible')).toHaveCount(1);
		await expect(members.locator('li[data-item-id="m2"]')).toBeVisible();

		await form.getByRole('button', { name: 'Discard' }).click();
		await expect(summary).toHaveText('2 selected');
		await expect(form.getByRole('combobox', { name: 'Data retention' })).toHaveValue('90');
	});

	test('a box ticked before hydration on a row a filter typed before hydration hides stays selected', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		let release: () => void = () => undefined;
		const held = new Promise<void>((resolve) => (release = resolve));
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			await held;
			await route.continue();
		});
		await page.goto('/fixtures/settings-controls/', { waitUntil: 'domcontentloaded' });
		const feeds = page.getByTestId('actions').getByRole('region', { name: 'Feeds' });
		await feeds.getByRole('checkbox', { name: 'Select Audit feed' }).check();
		await feeds.getByRole('searchbox').fill('Release');
		release();
		await expect(page.getByTestId('nm-list-instant').getByRole('checkbox', { name: 'Mentions by In app', exact: true })).toBeEnabled({ timeout: 45000 });

		await expect(feeds.locator('li[data-item-id]:visible')).toHaveCount(1);
		await expect(feeds.locator('[data-selection] > [role=status]').first()).toHaveText('2 selected');
		// The hidden row keeps its ticked box, so the selection still posts.
		await expect(feeds.locator('input[type="checkbox"][name="selected"][value="f2"]')).toBeChecked();
		await feeds.getByRole('searchbox').fill('');
		await expect(feeds.getByRole('checkbox', { name: 'Select Audit feed' })).toBeChecked();
		await expect(feeds.getByRole('checkbox', { name: 'Select Release feed' })).toBeChecked();
	});

	test('the selection summary counts only selected rows that are still listed', async ({ page }) => {
		await openComposed(page);
		const approvers = page.getByTestId('composed-approvers');
		const summary = approvers.locator('[data-selection] > [role=status]').first();
		await expect(summary).toHaveText('2 selected');
		await page.getByTestId('composed-members').getByRole('button', { name: 'Remove Ben Ortiz' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
		await expect(approvers.getByRole('checkbox', { name: 'Select Ben Ortiz' })).toHaveCount(0, { timeout: 5000 });
		await expect(summary).toHaveText('1 selected');
	});
});

test.describe('Layout and forced colours', () => {
	test('an idle instant choice and matrix reserve no empty status line', async ({ page }) => {
		const section = await openSection(page, 'choice-cards');
		const density = section.getByTestId('cc-density');
		const line = density.locator('[data-instant-status]');
		expect((await line.boundingBox())!.height).toBeLessThanOrEqual(1);
		await density.getByText('Compact').click();
		await expect(line).toContainText(/Saving…|Saved/);
		expect((await line.boundingBox())!.height).toBeGreaterThan(10);
		const matrix = (await openSection(page, 'notification-matrix')).getByTestId('nm-instant');
		expect((await matrix.locator('[data-instant-status]').boundingBox())!.height).toBeLessThanOrEqual(1);
	});

	test('in forced colours the chosen segment is outlined and the meter keeps its track and fill', async ({ page }) => {
		await page.emulateMedia({ forcedColors: 'active' });
		const section = await openSection(page, 'choice-cards');
		const density = section.getByTestId('cc-density');
		const outline = (name: string) => density.getByRole('radio', { name }).locator('xpath=ancestor::label[1]').evaluate((el) => getComputedStyle(el).outlineStyle);
		expect(await outline('Default')).toBe('solid');
		expect(await outline('Compact')).toBe('none');
		const meter = (await openSection(page, 'usage-meter')).getByTestId('um-seats').getByRole('meter');
		expect(await meter.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
		const fill = meter.locator('span').first();
		expect(await fill.evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe('none');
		expect(await fill.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
	});

	test('stacked, a matrix without column toggles draws no rule of its own under the section header', async ({ page }) => {
		await openComposed(page, 360);
		const first = page.getByRole('table', { name: 'Team notices' }).locator('tbody tr').first();
		expect(await first.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px');
	});

	test('on a coarse pointer, wrapped list cells sit a full hit area apart', async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
		const page = await context.newPage();
		await page.goto('/fixtures/settings-controls/');
		const cell = page.getByTestId('nm-list-instant').locator('td[data-cell-key="mention:app"]');
		expect(await cell.evaluate((el) => getComputedStyle(el).paddingBottom)).toBe('24px');
		await context.close();
	});
});

test.describe('Final fixes: a lock shows its way forward', () => {
	test('a ChoiceCards lock action loads while it runs, ignores clicks meanwhile, and shows its failure', async ({ page }) => {
		await page.clock.install();
		await openFixture(page);
		await page.clock.pauseAt(new Date(Date.now() + 5000));
		const section = page.getByTestId('lock-actions');
		const upgrade = section.getByRole('button', { name: 'Upgrade' });
		await upgrade.scrollIntoViewIfNeeded();
		await expect(upgrade).toHaveAccessibleDescription(/Density needs the larger plan\./);
		await upgrade.click();
		await expect(upgrade).toHaveAttribute('aria-busy', 'true');
		await upgrade.click({ force: true });
		await upgrade.click({ force: true });
		await page.clock.runFor(400);
		await expect(section.getByRole('alert').filter({ hasText: 'Billing is down. Try later.' })).toBeVisible();
		await expect(section.getByTestId('upgrade-calls')).toHaveText('1');
	});

	test('a NotificationMatrix lock action loads while it runs, calls once, and shows its failure', async ({ page }) => {
		await page.clock.install();
		await openFixture(page);
		await page.clock.pauseAt(new Date(Date.now() + 5000));
		const section = page.getByTestId('lock-actions');
		const unlock = section.getByRole('button', { name: 'Unlock alerts' });
		await unlock.scrollIntoViewIfNeeded();
		await expect(unlock).toHaveAccessibleDescription(/Digest alerts need the larger plan\./);
		await unlock.click();
		await expect(unlock).toHaveAttribute('aria-busy', 'true');
		await unlock.click({ force: true });
		await page.clock.runFor(400);
		await expect(section.getByRole('alert').filter({ hasText: 'Plans are busy. Try later.' })).toBeVisible();
		await expect(section.getByTestId('alerts-calls')).toHaveText('1');
		await expect(unlock).not.toHaveAttribute('aria-busy', 'true');
	});

	test('an option lock, a matrix lock and a locked list item each show their way forward', async ({ page }) => {
		await openFixture(page);
		const section = page.getByTestId('lock-actions');
		await expect(section.getByRole('link', { name: 'See plans for Large' })).toHaveAttribute('href', '?plans=large');
		await expect(section.getByRole('link', { name: 'See plans for Large' })).toHaveAccessibleDescription(/Large needs the larger plan\./);
		const plans = section.getByRole('link', { name: 'See plans', exact: true });
		await expect(plans).toHaveAttribute('href', '?plans=text');
		await expect(plans).toHaveAccessibleDescription(/Text alerts need the larger plan\./);
		const ask = section.getByRole('button', { name: 'Ask an admin' });
		await expect(ask).toHaveAccessibleDescription(/Only admins can change Ada\./);
		await ask.click();
		await expect(section.getByRole('alert').filter({ hasText: 'No admin is around.' })).toBeVisible();
	});
});

test.describe('Final fixes: an instant choice in a row', () => {
	for (const width of [1440, 393]) {
		test(`at ${width}px the rows below an instant ChoiceCards move once, not again when Saving gives way to Saved`, async ({ page }) => {
			await page.clock.install();
			await openComposed(page, width);
			const density = page.getByRole('radiogroup', { name: 'Density' });
			const next = density.locator('xpath=ancestor::li[1]/following-sibling::li[1]');
			await density.scrollIntoViewIfNeeded();
			const top = async () => (await next.boundingBox())!.y + (await page.evaluate(() => window.scrollY));
			await page.clock.pauseAt(new Date(Date.now() + 5000));
			await density.getByText('Spacious').click();
			await expect(density.getByRole('status')).toHaveText('Saving…');
			const pending = await top();
			await page.clock.runFor(SETTLE);
			await expect(density.getByRole('status')).toHaveText('Saved');
			expect(Math.abs((await top()) - pending)).toBeLessThan(0.5);
		});
	}
});

test.describe('Integration fixes: an instant choice in a row holds still', () => {
	for (const width of [1440, 393]) {
		test(`at ${width}px choosing an instant ChoiceCards option never moves the options under the pointer`, async ({ page }) => {
			await page.clock.install();
			await openComposed(page, width);
			const density = page.getByRole('radiogroup', { name: 'Density' });
			const spacious = density.getByRole('radio', { name: 'Spacious' });
			await density.scrollIntoViewIfNeeded();
			const y = async () => (await spacious.boundingBox())!.y + (await page.evaluate(() => window.scrollY));
			const before = await y();
			await page.clock.pauseAt(new Date(Date.now() + 5000));
			await density.getByText('Spacious').click();
			await expect(density.getByRole('status')).toHaveText('Saving…');
			expect(Math.abs((await y()) - before), 'options while saving').toBeLessThan(0.5);
			await page.clock.runFor(SETTLE);
			await expect(density.getByRole('status')).toHaveText('Saved');
			expect(Math.abs((await y()) - before), 'options once saved').toBeLessThan(0.5);
		});
	}
});
