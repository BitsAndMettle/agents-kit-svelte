import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/**
 * Settings, save group: SettingsForm, SaveBar, ChangeNotice, ConflictResolver, ConsequenceList and
 * ConsequenceDialog. The demos answer after 600 ms. A test that looks at an in-flight state owns
 * that time: the clock is installed before the page loads, paused, and advanced by hand.
 */

async function openOnClock(page: Page, slug: string): Promise<Locator> {
	await page.clock.install();
	return openSection(page, slug);
}

/** Stops time, so no demo timer fires until `page.clock.runFor`. */
async function pauseClock(page: Page): Promise<void> {
	await page.clock.pauseAt(new Date(Date.now() + 5000));
}

/** Longer than the demos' 600 ms answer. */
const SETTLE = 700;

/** Opens the showcase with JavaScript off and returns the section. */
async function openWithoutJs(browser: Browser, slug: string, width = 1440): Promise<{ page: Page; section: Locator; close: () => Promise<void> }> {
	const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
	const page = await context.newPage();
	await page.goto('/');
	const section = page.locator('#' + slug);
	await section.scrollIntoViewIfNeeded();
	return { page, section, close: () => context.close() };
}

/** Answers a native post and hands back its body. */
async function catchPost(page: Page, path: string): Promise<() => Promise<string>> {
	let body = '';
	await page.route(`**${path}`, async (route) => {
		body = route.request().postData() ?? '';
		await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' });
	});
	const request = page.waitForRequest((r) => r.url().endsWith(path) && r.method() === 'POST');
	return async () => {
		await request;
		return body || ((await request).postData() ?? '');
	};
}

const decode = (body: string) => new URLSearchParams(body);

test.describe('SettingsForm', () => {
	test('edits stage their rows, the bar counts and lists them, and Discard resets and returns focus', async ({ page }) => {
		const section = await openSection(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		const retention = section.getByRole('combobox', { name: 'Data retention' });
		const bar = section.locator('[data-layout="sticky"]');

		await retention.selectOption('30');
		await expect(section.getByText('Unsaved · was 90 days')).toBeVisible();
		await expect(bar).toContainText('1 unsaved change');
		await expect(bar.getByRole('list', { name: 'Unsaved changes' })).toContainText('Data retention from 90 days → to 30 days');
		await expect(bar).toContainText('Members see the new name');

		await team.fill('Northwind Design');
		await expect(bar).toContainText('2 unsaved changes');
		await expect(section.getByText('Unsaved · was Northwind Studio')).toBeVisible();

		const discard = bar.getByRole('button', { name: 'Discard' });
		await discard.focus();
		await press(page, 'Enter');
		await expect(team).toHaveValue('Northwind Studio');
		await expect(retention).toHaveValue('90');
		await expect(bar.getByRole('button', { name: 'Discard' })).toHaveCount(0);
		// The bar's buttons went away: focus goes back to where the person was editing.
		await expect(team).toBeFocused();
	});

	test('Save is pending until the handler answers, ignores a second submit, then shows saved', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Northwind Design');
		await pauseClock(page);
		const save = section.getByRole('button', { name: 'Save', exact: true });
		await save.click();
		await expect(save).toHaveAttribute('aria-busy', 'true');
		await expect(section.getByRole('status').filter({ hasText: 'Saving…' })).toHaveCount(1);
		await team.press('Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → Northwind Design');
		await expect(section.getByRole('status').filter({ hasText: 'Changes saved.' })).toHaveCount(1);
		await expect(section.locator('input[name=revision]')).toHaveValue('8');
		await expect(section.getByText('Unsaved · was')).toHaveCount(0);
		await expect(team).toBeFocused();
	});

	test('an edit made while a save is in flight stays unsaved after the save', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('First');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await team.fill('Second');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → First');
		await expect(team).toHaveValue('Second');
		const bar = section.locator('[data-layout="sticky"]');
		await expect(bar).toContainText('1 unsaved change');
		await expect(section.getByText('Unsaved · was First')).toBeVisible();
		await expect(section.getByRole('status').filter({ hasText: 'Changes saved.' })).toHaveCount(0);
		// The leave guard still holds it.
		await section.getByRole('button', { name: 'Go to Members' }).click();
		await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeVisible();
	});

	test('the submitted values become the saved ones: a switch and a select changed in flight stay unsaved, and Discard restores the save', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		const digest = section.getByRole('switch', { name: 'Weekly digest' });
		const retention = section.getByRole('combobox', { name: 'Data retention' });
		const bar = section.locator('[data-layout="sticky"]');
		// Counts input events on the form, to show nothing replays an edit.
		await section.evaluate((el) => {
			const log: string[] = [];
			(window as unknown as { inputs: string[] }).inputs = log;
			el.querySelector('form')?.addEventListener('input', (e) => log.push((e.target as HTMLInputElement).name));
		});
		await team.fill('First');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await digest.click();
		await retention.selectOption('30');
		const before = await page.evaluate(() => (window as unknown as { inputs: string[] }).inputs.length);
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → First');
		await expect(bar).toContainText('2 unsaved changes');
		await expect(section.getByText('Unsaved · was On')).toBeVisible();
		await expect(section.getByText('Unsaved · was 90 days')).toBeVisible();
		await expect(section.getByText('Unsaved · was Northwind Studio')).toHaveCount(0);
		expect(await page.evaluate(() => (window as unknown as { inputs: string[] }).inputs.length)).toBe(before);
		// Discard re-reads the form on the next task.
		await page.clock.resume();
		await bar.getByRole('button', { name: 'Discard' }).click();
		await expect(team).toHaveValue('First');
		await expect(digest).toBeChecked();
		await expect(retention).toHaveValue('90');
		await expect(bar).not.toContainText('unsaved change');
	});

	test('typing in a ConsequenceDialog inside it is not an edit: Save still returns focus to the last edited field', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Edited7');
		await section.getByRole('button', { name: 'Clear…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Clear all activity?' });
		await dialog.getByRole('textbox', { name: 'Type “clear activity” to confirm' }).fill('abc');
		await press(page, 'Escape');
		await expect(dialog).toBeHidden();
		await expect(section.locator('[data-layout="sticky"]')).toContainText('1 unsaved change');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).focus();
		await press(page, 'Enter');
		await page.clock.runFor(800);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → Edited7');
		await expect(team).toBeFocused();
	});

	test('after a save, typing in a ConsequenceDialog inside it keeps "Changes saved."', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		const saved = section.getByRole('status').filter({ hasText: 'Changes saved.' });
		await expect(saved).toHaveCount(1);
		await page.clock.resume();
		await section.getByRole('button', { name: 'Clear…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Clear all activity?' });
		await dialog.getByRole('textbox', { name: 'Type “clear activity” to confirm' }).pressSequentially('c');
		await expect(saved).toHaveCount(1);
	});

	test('a field error marks and focuses the field; editing it clears the error', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await expect(team).toHaveAttribute('aria-invalid', 'true');
		await expect(team).toBeFocused();
		await expect(team).toHaveAccessibleDescription(/Enter a team name\./);
		await team.fill('N');
		await expect(section.getByText('Enter a team name.')).toHaveCount(0);
	});

	test('a conflict keeps the draft, takes focus, and the next save goes through', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		await section.getByRole('checkbox', { name: 'A teammate saves first' }).check();
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Northwind Design');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		const alert = section.getByRole('alert').filter({ hasText: 'Ben Ortiz saved these settings' });
		await expect(alert).toBeVisible();
		await expect(alert).toBeFocused();
		await expect(team).toHaveValue('Northwind Design');
		await expect(section.locator('[data-layout="sticky"]')).toContainText('1 unsaved change');
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 9: Team name → Northwind Design');
		await expect(alert).toHaveCount(0);
	});

	test('the leave guard lets a clean form go, and holds a dirty one with three choices', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const here = section.getByTestId('sf-here');
		const go = section.getByRole('button', { name: 'Go to Members' });
		await go.click();
		await expect(here).toHaveText('Members');

		// Back on General with an unsaved change.
		await page.evaluate(() => document.querySelector<HTMLElement>('#settings-form')?.scrollIntoView());
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		await go.click();
		const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAccessibleDescription('You have 1 unsaved change. It will be lost if you leave.');
		await expect(dialog.getByRole('list', { name: 'Unsaved changes' })).toContainText('Team name');
		await press(page, 'Escape');
		await expect(dialog).toBeHidden();
		await expect(here).toHaveText('Members');

		await go.click();
		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Save and leave' }).click();
		await expect(dialog.getByRole('button', { name: 'Save and leave' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeHidden();
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → Northwind Design');
	});

	test('when Save and leave fails on a field, closing the dialog focuses that field', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('');
		await section.getByRole('button', { name: 'Go to Members' }).click();
		const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Save and leave' }).click();
		await page.clock.runFor(SETTLE);
		await expect(dialog.getByRole('alert')).toContainText("Couldn't save, so you are still here.");
		await dialog.getByRole('button', { name: 'Keep editing' }).click();
		await expect(dialog).toBeHidden();
		await expect(team).toHaveAttribute('aria-invalid', 'true');
		await expect(team).toBeFocused();
		await expect(section.getByTestId('sf-here')).toHaveText('General');
	});

	test('a ConsequenceDialog inside it runs on its own form: no nested form, and Save never includes it', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (m) => {
			if (m.type() === 'error') errors.push(m.text());
		});
		page.on('pageerror', (e) => errors.push(e.message));
		const section = await openOnClock(page, 'settings-form');
		expect(await section.locator('form form').count()).toBe(0);
		await section.getByRole('button', { name: 'Clear…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Clear all activity?' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('list', { name: 'What happens' })).toContainText('All activity entries are deleted');
		await expect(dialog.getByRole('list', { name: 'What stays' })).toContainText('Documents and these settings stay');
		const phrase = dialog.getByRole('textbox', { name: 'Type “clear activity” to confirm' });
		await phrase.fill('clear activity');
		// Its fields are not the settings form's.
		expect(await phrase.evaluate((el) => (el as HTMLInputElement).form?.getAttribute('aria-label'))).toBeNull();
		await expect(section.locator('[data-layout="sticky"]')).not.toContainText('unsaved change');
		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Clear activity' }).click();
		await expect(dialog.getByRole('status').filter({ hasText: 'Working…' })).toHaveCount(1);
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeHidden();
		await expect(section.getByTestId('sf-log')).toHaveText('Activity cleared');
		await expect(section.getByRole('button', { name: 'Clear…' })).toBeFocused();
		expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
	});

	test('Leave without saving goes at once, and a later edit asks again', async ({ page }) => {
		const section = await openSection(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Northwind Design');
		await section.getByRole('button', { name: 'Go to Members' }).click();
		const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
		await dialog.getByRole('button', { name: 'Leave without saving' }).click();
		await expect(dialog).toBeHidden();
		await expect(section.getByTestId('sf-here')).toHaveText('Members');
	});

	test('edits made before hydration still count once it hydrates', async ({ page }) => {
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => (release = resolve));
		await page.route('**/_app/**/*.js', async (route) => {
			await gate;
			await route.continue();
		});
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/', { waitUntil: 'commit' });
		const section = page.locator('#settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Typed early');
		release();
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		await expect(team).toHaveValue('Typed early');
		await expect(section.locator('[data-layout="sticky"]')).toContainText('1 unsaved change');
	});

	test('without JavaScript the form posts natively, with its revision', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'settings-form');
		const form = section.locator('form[aria-label="General settings"]');
		await expect(form).toHaveAttribute('method', 'post');
		await expect(form).toHaveAttribute('action', '/settings-demo/general');
		// The bar always shows without JavaScript, with Save enabled.
		await expect(section.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
		// The closed ConsequenceDialog inside does not nest a form.
		expect(await section.locator('form').count()).toBe(1);
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		const posted = await catchPost(page, '/settings-demo/general');
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		const body = decode(await posted());
		expect(body.get('revision')).toBe('7');
		expect(body.get('teamName')).toBe('Northwind Design');
		expect(body.get('retention')).toBe('90');
		// Nor do its fields block or join the post.
		expect(body.has('intent')).toBe(false);
		expect(body.has('confirm')).toBe(false);
		await close();
	});
});

/** The save-bar demo's first form; a second one ("Push settings") shares its scrolling frame. */
const notifications = (section: Locator) => section.locator('form[aria-label="Notification settings"]');

test.describe('SaveBar', () => {
	test('lists changes with an impact line; a failed save is an alert that takes focus; Discard restores', async ({ page }) => {
		const section = await openOnClock(page, 'save-bar');
		await section.getByRole('combobox', { name: 'Next save' }).selectOption('error');
		const mentions = section.getByRole('switch', { name: 'Mentions' });
		await mentions.click();
		const bar = notifications(section).locator('[data-layout="sticky"]');
		await expect(bar).toContainText('1 unsaved change');
		await expect(bar.getByRole('list', { name: 'Unsaved changes' })).toContainText('Mentions');
		await expect(bar.getByRole('list', { name: 'Unsaved changes' })).toContainText('Off');
		await expect(bar).toContainText('You can change these again at any time.');
		await pauseClock(page);
		await bar.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		const alert = bar.getByRole('alert');
		await expect(alert).toHaveText('The notification service did not answer. Nothing was saved.');
		await expect(alert).toBeFocused();
		await bar.getByRole('button', { name: 'Discard' }).click();
		await expect(mentions).toBeChecked();
		// The draft re-reads the reset form on the next task.
		await page.clock.runFor(10);
		await expect(bar.getByRole('alert')).toHaveCount(0);
		await expect(bar.getByRole('button', { name: 'Discard' })).toHaveCount(0);
		await expect(mentions).toBeFocused();
	});

	test('more than three changes collapse into "+N more"; a conflict offers Review', async ({ page }) => {
		const section = await openOnClock(page, 'save-bar');
		await section.getByRole('combobox', { name: 'Next save' }).selectOption('conflict');
		for (const name of ['Mentions', 'Assigned to you', 'Comments on your work', 'Invites accepted']) {
			await section.getByRole('switch', { name }).click();
		}
		const bar = notifications(section).locator('[data-layout="sticky"]');
		await expect(bar).toContainText('4 unsaved changes');
		await expect(bar.getByRole('listitem')).toHaveCount(4);
		await expect(bar.getByRole('listitem').last()).toHaveText('+1 more');
		await pauseClock(page);
		await bar.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await expect(bar.getByRole('alert')).toContainText('Chloé Martin changed these notifications');
		await expect(bar.getByRole('link', { name: 'Review changes' })).toHaveAttribute('href', '#conflict-resolver');
	});

	test('footer layout always shows, with Save disabled while clean; floating is fixed to its frame', async ({ page }) => {
		const section = await openSection(page, 'save-bar');
		await section.getByRole('button', { name: 'Footer' }).click();
		const footer = notifications(section).locator('[data-layout="footer"]');
		await expect(footer).toContainText('No unsaved changes');
		await expect(footer.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
		await section.getByRole('switch', { name: 'Mentions' }).click();
		await expect(footer.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();

		await section.getByRole('button', { name: 'Floating' }).click();
		const floating = section.locator('[data-layout="floating"]');
		await expect(floating).toContainText('1 unsaved change');
		expect(await floating.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
		const frame = await section.locator('.rounded-window').first().boundingBox();
		const bar = await floating.boundingBox();
		expect(bar && frame && bar.y + bar.height).toBeLessThanOrEqual((frame?.y ?? 0) + (frame?.height ?? 0));
	});

	test('without JavaScript the bar shows and Discard resets the form natively', async ({ browser }) => {
		const { section, close } = await openWithoutJs(browser, 'save-bar');
		const bar = notifications(section).locator('[data-layout="sticky"]');
		await expect(bar.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
		const mentions = section.getByRole('switch', { name: 'Mentions' });
		await mentions.click();
		await expect(mentions).not.toBeChecked();
		await bar.getByRole('button', { name: 'Discard' }).click();
		await expect(mentions).toBeChecked();
		await close();
	});
});

test.describe('ChangeNotice', () => {
	test('at 320px every density option fits inside its section and can be chosen', async ({ page }) => {
		const section = await openSection(page, 'change-notice');
		await page.setViewportSize({ width: 320, height: 800 });
		await section.scrollIntoViewIfNeeded();
		const card = section.locator('section[aria-labelledby="cnd-heading"]');
		const density = section.getByRole('radiogroup', { name: 'Density' });
		const bounds = await card.boundingBox();
		for (const name of ['Comfortable', 'Compact', 'Spacious']) {
			const option = density.locator('label', { hasText: name });
			const box = await option.boundingBox();
			expect(box && bounds && box.x >= bounds.x && box.x + box.width <= bounds.x + bounds.width, `${name} is clipped`).toBe(true);
		}
		await density.locator('label', { hasText: 'Spacious' }).click();
		await expect(density.getByRole('radio', { name: 'Spacious' })).toBeChecked();
	});

	test('a newer change takes Undo away from the older notice, with the reason; Undo reverses the newest', async ({ page }) => {
		const section = await openOnClock(page, 'change-notice');
		const density = section.getByRole('radiogroup', { name: 'Density' });
		await pauseClock(page);
		await density.getByText('Compact').click();
		await page.clock.runFor(SETTLE);
		await density.getByText('Spacious').click();
		await page.clock.runFor(SETTLE);

		const notices = section.getByTestId('cnd-notices').getByRole('status');
		await expect(notices).toHaveCount(2);
		const newest = notices.nth(0);
		const older = notices.nth(1);
		await expect(newest).toContainText('Density set to spacious');
		await expect(older).toContainText('Density set to compact');
		const stale = older.getByRole('button', { name: 'Undo' });
		await expect(stale).toHaveAttribute('aria-disabled', 'true');
		await expect(stale).toHaveAccessibleDescription('A newer change replaced this one, so it can no longer be undone here.');

		await newest.getByRole('button', { name: 'Undo' }).click();
		await expect(newest).toContainText('Undoing…');
		await page.clock.runFor(SETTLE);
		await expect(newest).toContainText('Undone. The change was reversed.');
		await expect(density.getByRole('radio', { name: 'Compact' })).toBeChecked();
		await expect(newest.getByRole('button', { name: 'Undo' })).toHaveCount(0);
	});

	test('focus stays with the notice after Undo, and moves to the next notice or control after Dismiss', async ({ page }) => {
		const section = await openOnClock(page, 'change-notice');
		const density = section.getByRole('radiogroup', { name: 'Density' });
		await pauseClock(page);
		await density.getByText('Compact').click();
		await page.clock.runFor(SETTLE);
		await density.getByText('Spacious').click();
		await page.clock.runFor(SETTLE);
		const notices = section.getByTestId('cnd-notices').getByRole('status');
		await expect(notices).toHaveCount(2);

		// Dismiss the newest: focus goes to the notice that moved into its place.
		await notices.nth(0).getByRole('button', { name: 'Dismiss' }).focus();
		await press(page, 'Enter');
		await expect(notices).toHaveCount(1);
		await expect(notices.nth(0).getByRole('button', { name: 'Undo' })).toBeFocused();

		// Undo with the keyboard: the button goes away, focus stays on the notice that says so.
		const native = section.getByTestId('cnd-native');
		await native.getByRole('button', { name: 'Undo' }).focus();
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(native).toContainText('Undone. The change was reversed.');
		await expect(native).toBeFocused();

		// Dismiss the last notice: focus goes to the nearest control before it, never the page body.
		await native.getByRole('button', { name: 'Dismiss' }).focus();
		await press(page, 'Enter');
		await expect(native).toHaveCount(0);
		expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement !== null)).toBe(true);
		await expect(section.getByTestId('cnd-notices').getByRole('button', { name: 'Undo' })).toBeFocused();
	});

	test('a failed change reverts and adds no notice; Dismiss removes a notice', async ({ page }) => {
		const section = await openOnClock(page, 'change-notice');
		await section.getByRole('checkbox', { name: 'Make the next change fail' }).check();
		const density = section.getByRole('radiogroup', { name: 'Density' });
		await pauseClock(page);
		await density.getByText('Compact').click();
		await expect(density.getByRole('radio', { name: 'Compact' })).toBeChecked();
		await page.clock.runFor(SETTLE);
		await expect(density.getByRole('radio', { name: 'Comfortable' })).toBeChecked();
		await expect(section.getByText('Couldn’t save the density. It was changed back.')).toBeVisible();
		await expect(section.getByTestId('cnd-notices').getByRole('status')).toHaveCount(0);

		const native = section.getByTestId('cnd-native');
		await native.getByRole('button', { name: 'Dismiss' }).click();
		await expect(native).toHaveCount(0);
	});

	test('without JavaScript Undo posts the intent, the token and the hidden values', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'change-notice');
		const posted = await catchPost(page, '/settings-demo/undo');
		await section.getByTestId('cnd-native').getByRole('button', { name: 'Undo' }).click();
		const body = decode(await posted());
		expect(body.get('intent')).toBe('undo');
		expect(body.get('token')).toBe('r-42');
		expect(body.get('setting')).toBe('retention');
		await close();
	});
});

test.describe('ConflictResolver', () => {
	test('a stale save opens a review: one named radio group per setting, Both explained, then the resubmit saves', async ({ page }) => {
		const section = await openOnClock(page, 'conflict-resolver');
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await expect(section.getByRole('alert')).toContainText('Ben Ortiz saved these settings');
		await section.getByRole('button', { name: 'Review changes' }).click();

		const dialog = page.getByRole('dialog', { name: 'Review changes' });
		await expect(dialog).toBeVisible();
		const groups = dialog.getByRole('radiogroup');
		await expect(groups).toHaveCount(3);
		const team = dialog.getByRole('radiogroup', { name: 'Team name' });
		await expect(team.getByRole('radio', { name: 'Latest' })).toBeChecked();
		await expect(team.getByRole('radio', { name: 'Yours' })).toHaveAccessibleDescription('Northwind Design');
		const both = team.getByRole('radio', { name: 'Both' });
		await expect(both).toBeDisabled();
		await expect(both).toHaveAccessibleDescription('Only one of them can apply.');
		await expect(dialog.getByRole('radiogroup', { name: 'Data retention' })).toHaveAccessibleDescription('Only one retention period can apply.');
		await expect(dialog).toContainText('Ben Ortiz saved changes 5 min ago.');

		await team.getByRole('radio', { name: 'Yours' }).check();
		await dialog.getByRole('radiogroup', { name: 'Channels' }).getByRole('radio', { name: 'Both' }).check();
		await expect(dialog.getByText('Northwind Design · Email, Phone · 1 year')).toBeVisible();
		await dialog.getByRole('button', { name: 'Save with these choices' }).click();
		await expect(dialog).toBeHidden();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('crd-log')).toHaveText('Saved revision 14: Northwind Design · Email, Phone · 1 year');
	});

	test('in the wide review each Keep choice stays one segmented line', async ({ page }) => {
		const section = await openOnClock(page, 'conflict-resolver');
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await section.getByRole('button', { name: 'Review changes' }).click();
		const dialog = page.getByRole('dialog', { name: 'Review changes' });
		await expect(dialog).toBeVisible();
		for (const group of await dialog.getByRole('radiogroup').all()) {
			const box = await group.boundingBox();
			expect(box?.height ?? 0).toBeLessThan(40);
		}
	});

	test('arrow keys move the choice within a setting', async ({ page }) => {
		const section = await openSection(page, 'conflict-resolver');
		const form = section.getByTestId('crd-native');
		const channels = form.getByRole('radiogroup', { name: 'Channels' });
		await channels.getByRole('radio', { name: 'Latest' }).focus();
		await press(page, 'ArrowRight');
		await expect(channels.getByRole('radio', { name: 'Both' })).toBeChecked();
		await expect(channels.getByRole('radio', { name: 'Both' })).toBeFocused();
		await press(page, 'ArrowLeft', 'ArrowLeft');
		await expect(channels.getByRole('radio', { name: 'Yours' })).toBeChecked();
		await form.getByRole('button', { name: 'Apply choices' }).click();
		await expect(section.getByTestId('crd-native-log')).toContainText('keep.channels=mine');
	});

	test('without JavaScript the choices post as keep.<field>', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'conflict-resolver');
		const form = section.getByTestId('crd-native');
		await form.getByRole('radiogroup', { name: 'Channels' }).getByText('Both').click();
		const posted = await catchPost(page, '/settings-demo/resolve');
		await form.getByRole('button', { name: 'Apply choices' }).click();
		const body = decode(await posted());
		expect(body.get('keep.teamName')).toBe('mine');
		expect(body.get('keep.channels')).toBe('both');
		expect(body.get('keep.retention')).toBe('theirs');
		expect(body.get('revision')).toBe('13');
		await close();
	});
});

test.describe('ConsequenceList', () => {
	test('each tone is spoken with a prefix, and groups are named lists', async ({ page }) => {
		const section = await openSection(page, 'consequence-list');
		const can = section.getByRole('list', { name: 'Viewers can', exact: true });
		const cannot = section.getByRole('list', { name: 'Viewers can’t' });
		await expect(can.getByRole('listitem')).toHaveCount(3);
		await expect(can.getByRole('listitem').first()).toHaveText('Yes: Open documents shared with the team');
		await expect(cannot.getByRole('listitem').first()).toHaveText('No: Edit, move or delete documents');
		const happens = section.getByRole('group', { name: 'What happens' });
		await expect(happens.getByRole('listitem').first()).toContainText('Caution: The project becomes read-only');
		// `title` is the heading, never a tooltip on the root.
		await expect(happens).not.toHaveAttribute('title');
		await expect(section.getByText('Note: Download files')).toHaveCount(1);
		await expect(section.locator('.sr-only').filter({ hasText: /^(Yes|No|Caution|Note):/ })).toHaveCount(14);
	});
});

test.describe('ConsequenceDialog', () => {
	test('consequences only: focus starts on Cancel; a pending confirm holds the dialog; focus returns to the trigger', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		const trigger = section.getByRole('button', { name: 'Disconnect…' });
		await trigger.focus();
		await press(page, 'Enter');
		const dialog = page.getByRole('dialog', { name: 'Disconnect storage?' });
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAccessibleDescription('The team bucket stops receiving new files.');
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
		await expect(dialog.getByRole('list', { name: 'What stays' })).toContainText('Yes: Files already in the bucket stay there');
		await expect(dialog).toContainText('You can undo this later.');

		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Disconnect', exact: true }).click();
		await expect(dialog.getByRole('button', { name: 'Disconnect', exact: true })).toHaveAttribute('aria-busy', 'true');
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		await press(page, 'Escape');
		await expect(dialog).toBeVisible();
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeHidden();
		await expect(section.getByTestId('cdd-status')).toHaveText('Storage disconnected');
		await expect(trigger).toBeFocused();
	});

	test('reassignment: a select per dependent with defaults and a live summary; a failure stays inside', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		await section.getByRole('checkbox', { name: 'Make the next action fail' }).check();
		await section.getByRole('button', { name: 'Remove…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Remove Ben Ortiz from the team?' });
		await expect(dialog.getByRole('group', { name: 'Who takes over Ben’s reports?' })).toBeVisible();
		const weekly = dialog.getByRole('combobox', { name: 'New owner for Weekly summary' });
		await expect(weekly).toHaveValue('ada');
		await expect(dialog.getByRole('combobox', { name: 'New owner for Quality dashboard' })).toHaveValue('chloe');
		const summary = dialog.getByRole('status').filter({ hasText: 'takes' });
		await expect(summary).toHaveText('Ada Park takes 2 · Chloé Martin takes 1');
		await weekly.selectOption('dev');
		await expect(summary).toHaveText('Dev Rao takes 1 · Ada Park takes 1 · Chloé Martin takes 1');

		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Remove member' }).click();
		await page.clock.runFor(SETTLE);
		const alert = dialog.getByRole('alert');
		await expect(alert).toHaveText('The server did not answer in time. Nothing was changed.');
		await expect(alert).toBeFocused();
		await dialog.getByRole('button', { name: 'Remove member' }).click();
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeHidden();
		await expect(section.getByTestId('cdd-status')).toHaveText('Ben Ortiz removed (weekly→dev, churn→ada, quality→chloe)');
	});

	test('reopening starts fresh: the choices and the summary agree again', async ({ page }) => {
		const section = await openSection(page, 'consequence-dialog');
		await section.getByRole('button', { name: 'Remove…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Remove Ben Ortiz from the team?' });
		const weekly = dialog.getByRole('combobox', { name: 'New owner for Weekly summary' });
		const summary = dialog.getByRole('status').filter({ hasText: 'takes' });
		await weekly.selectOption('dev');
		await expect(summary).toHaveText('Dev Rao takes 1 · Ada Park takes 1 · Chloé Martin takes 1');
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
		await section.getByRole('button', { name: 'Remove…' }).click();
		await expect(weekly).toHaveValue('ada');
		await expect(summary).toHaveText('Ada Park takes 2 · Chloé Martin takes 1');
	});

	test('route mode: opening the route again clears the last failure and the typed phrase', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		await section.getByRole('checkbox', { name: 'Make the next action fail' }).check();
		const link = section.getByRole('link', { name: 'Delete team…' });
		await link.click();
		const dialog = page.getByRole('dialog', { name: 'Delete Northwind Studio?' });
		const phrase = dialog.getByRole('textbox', { name: 'Type “Northwind Studio” to confirm' });
		await phrase.fill('Northwind Studio');
		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Delete team' }).click();
		await page.clock.runFor(SETTLE);
		await expect(dialog.getByRole('alert')).toHaveText('The server did not answer in time. Nothing was changed.');
		// Let time run again: closing and the navigation use timers.
		await page.clock.resume();
		await press(page, 'Escape');
		await expect(dialog).toBeHidden();
		await expect(page).not.toHaveURL(/dialog=/);
		await link.click();
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('alert')).toHaveCount(0);
		await expect(phrase).toHaveValue('');
		await expect(dialog.getByRole('button', { name: 'Delete team' })).toHaveAttribute('aria-disabled', 'true');
	});

	test('route mode: a successful confirm navigates to closeHref, which closes it, and focus returns to the link', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		const link = section.getByRole('link', { name: 'Delete team…' });
		await link.click();
		await expect(page).toHaveURL(/\?dialog=delete-team/);
		const dialog = page.getByRole('dialog', { name: 'Delete Northwind Studio?' });
		await dialog.getByRole('textbox', { name: 'Type “Northwind Studio” to confirm' }).fill('Northwind Studio');
		await pauseClock(page);
		await dialog.getByRole('button', { name: 'Delete team' }).click();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('cdd-status')).toHaveText('Team deleted (typed “Northwind Studio”)');
		await expect(page).not.toHaveURL(/dialog=/);
		await expect(dialog).toBeHidden();
		await expect(link).toBeFocused();
	});

	test('route mode: a link opens it, the typed phrase gates confirm, Escape follows closeHref and focus returns to the link', async ({ page }) => {
		const section = await openSection(page, 'consequence-dialog');
		const link = section.getByRole('link', { name: 'Delete team…' });
		await link.click();
		await expect(page).toHaveURL(/\?dialog=delete-team/);
		const dialog = page.getByRole('dialog', { name: 'Delete Northwind Studio?' });
		await expect(dialog).toBeVisible();
		expect(await dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
		const phrase = dialog.getByRole('textbox', { name: 'Type “Northwind Studio” to confirm' });
		await expect(phrase).toBeFocused();
		const confirm = dialog.getByRole('button', { name: 'Delete team' });
		await expect(confirm).toHaveAttribute('aria-disabled', 'true');
		await expect(confirm).toHaveAccessibleDescription('Type the text exactly as shown to continue.');
		await phrase.fill('northwind studio');
		await expect(confirm).toHaveAttribute('aria-disabled', 'true');
		await phrase.fill('Northwind Studio');
		await expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
		// Once it matches, nothing says it does not.
		await expect(phrase).toHaveAccessibleDescription('');
		await expect(confirm).toHaveAccessibleDescription('');
		await expect(dialog).toContainText('This can’t be undone.');

		await press(page, 'Escape');
		await expect(page).not.toHaveURL(/dialog=/);
		await expect(dialog).toBeHidden();
		await expect(link).toBeFocused();
	});

	test('route mode: loading the URL opens it as a real modal after hydration; Cancel is a link that closes it', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/?dialog=delete-team');
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		const dialog = page.getByRole('dialog', { name: 'Delete Northwind Studio?' });
		await expect(dialog).toBeVisible();
		await expect.poll(() => dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
		const cancel = dialog.getByRole('link', { name: 'Cancel' });
		await expect(cancel).toHaveAttribute('href', './');
		await cancel.click();
		await expect(page).not.toHaveURL(/dialog=/);
		await expect(dialog).toBeHidden();
	});

	test('on a phone the dialog is a bottom sheet', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		await page.goto('/?dialog=delete-team');
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		const dialog = page.getByRole('dialog', { name: 'Delete Northwind Studio?' });
		await expect.poll(() => dialog.evaluate((el) => el.matches(':modal'))).toBe(true);
		await expect.poll(async () => {
			const box = await dialog.boundingBox();
			return box ? Math.round(box.y + box.height) : 0;
		}).toBe(800);
		const box = await dialog.boundingBox();
		expect(Math.round(box?.width ?? 0)).toBe(375);
	});

	test('without JavaScript the route renders open and the typed phrase blocks the post until it matches', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'consequence-dialog');
		const dialog = section.locator('dialog', { has: page.getByTestId('cdd-route') });
		await expect(dialog).toHaveAttribute('open');
		await expect(dialog).toHaveAccessibleName('Delete Northwind Studio?');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', './');
		let posts = 0;
		page.on('request', (r) => {
			if (r.method() === 'POST') posts++;
		});
		const confirm = dialog.getByRole('button', { name: 'Delete team' });
		const phrase = dialog.getByRole('textbox', { name: 'Type “Northwind Studio” to confirm' });
		await phrase.fill('Northwind');
		await confirm.click();
		await expect(phrase).toHaveJSProperty('validity.valid', false);
		expect(posts).toBe(0);
		await phrase.fill(' Northwind Studio ');
		const posted = await catchPost(page, '/settings-demo/team');
		await confirm.click();
		const body = decode(await posted());
		expect(body.get('confirm')).toBe(' Northwind Studio ');
		expect(body.get('intent')).toBe('delete');
		await close();
	});
});

test.describe('AlertDialog route and confirm props', () => {
	test('confirmDisabled keeps confirm focusable but inert, described by its reason', async ({ page }) => {
		const section = await openSection(page, 'alert-dialog');
		await section.getByRole('button', { name: 'Remove 3 members' }).click();
		const dialog = page.getByRole('alertdialog', { name: 'Remove 3 members?' });
		const confirm = dialog.getByRole('button', { name: 'Remove members' });
		await expect(confirm).toHaveAttribute('aria-disabled', 'true');
		await expect(confirm).toHaveAccessibleDescription('Tick the box to confirm.');
		await confirm.click({ force: true });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('checkbox', { name: 'They lose access at once' }).check();
		await expect(confirm).not.toHaveAttribute('aria-disabled', 'true');
		await confirm.click();
		await expect(dialog).toBeHidden();
		await expect(section.getByText('3 members removed')).toBeVisible();
	});

	test('returnFocus sends focus to the status after a removal, and back to the trigger after Cancel', async ({ page }) => {
		const section = await openSection(page, 'alert-dialog');
		const trigger = section.getByRole('button', { name: 'Remove 3 members' });
		const dialog = page.getByRole('alertdialog', { name: 'Remove 3 members?' });
		await trigger.click();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toBeHidden();
		await expect(trigger).toBeFocused();

		await trigger.click();
		await dialog.getByRole('checkbox', { name: 'They lose access at once' }).check();
		await dialog.getByRole('button', { name: 'Remove members' }).click();
		await expect(dialog).toBeHidden();
		const status = section.getByTestId('alert-dialog-demo-status');
		await expect(status).toHaveText('3 members removed');
		await expect(status).toBeFocused();
	});

	test('narrow="sheet" docks it to the bottom edge on a phone', async ({ page }) => {
		const section = await openSection(page, 'alert-dialog');
		await page.setViewportSize({ width: 375, height: 800 });
		await section.getByRole('button', { name: 'Remove 3 members' }).click();
		const dialog = page.getByRole('alertdialog', { name: 'Remove 3 members?' });
		await expect(dialog).toBeVisible();
		await expect.poll(async () => {
			const box = await dialog.boundingBox();
			return box ? [Math.round(box.x), Math.round(box.width), Math.round(box.y + box.height)] : [];
		}).toEqual([0, 375, 800]);
		// Without `narrow` it stays a centred card.
		await press(page, 'Escape');
		await section.getByRole('button', { name: 'Sign out' }).click();
		const card = page.getByRole('alertdialog', { name: 'Sign out of this computer?' });
		await expect(card).toBeVisible();
		await expect.poll(async () => Math.round((await card.boundingBox())?.width ?? 0)).toBeLessThan(375);
	});
});

test.describe('Sheet route props', () => {
	test('a link opens it; Escape and a backdrop press follow closeHref, and returnFocus puts focus back on the link', async ({ page }) => {
		const section = await openSection(page, 'sheet');
		const link = section.getByRole('link', { name: 'Filters as a link' });
		const sheet = page.getByRole('dialog', { name: 'Filter runs' });
		await link.click();
		await expect(page).toHaveURL(/\?sheet=filters/);
		await expect(sheet).toBeVisible();
		expect(await sheet.evaluate((el) => el.matches(':modal'))).toBe(true);
		await press(page, 'Escape');
		await expect(page).not.toHaveURL(/sheet=/);
		await expect(sheet).toBeHidden();
		await expect(link).toBeFocused();

		await link.click();
		await expect(sheet).toBeVisible();
		await page.mouse.click(40, 450);
		await expect(page).not.toHaveURL(/sheet=/);
		await expect(sheet).toBeHidden();
		await expect(link).toBeFocused();
	});

	test('loading the URL opens it as a real modal after hydration; its close button is a link that closes it', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/?sheet=filters');
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		const sheet = page.getByRole('dialog', { name: 'Filter runs' });
		await expect(sheet).toBeVisible();
		await expect.poll(() => sheet.evaluate((el) => el.matches(':modal'))).toBe(true);
		const close = sheet.getByRole('link', { name: 'Close' });
		await expect(close).toHaveAttribute('href', './');
		await close.click();
		await expect(page).not.toHaveURL(/sheet=/);
		await expect(sheet).toBeHidden();
		await expect(page.locator('#sheet').getByRole('link', { name: 'Filters as a link' })).toBeFocused();
	});

	test('without JavaScript ssrOpen renders the route open, with a close link', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'sheet');
		const sheet = section.locator('dialog[data-testid="sheet-route"]');
		await expect(sheet).toHaveAttribute('open');
		await expect(sheet).toHaveAccessibleName('Filter runs');
		await expect(sheet).toBeVisible();
		await expect(sheet.getByRole('link', { name: 'Close' })).toHaveAttribute('href', './');
		expect(page.url()).not.toContain('sheet=');
		await close();
	});
});

test.describe('Red-team fixes: SettingsForm owns Enter, and Save never carries an intent', () => {
	test('Enter in a field saves, even with an intent button earlier in the form', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Northwind Design');
		await pauseClock(page);
		await team.press('Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → Northwind Design');
	});

	test('without JavaScript Enter in a field posts the save, with no intent or phrase', async ({ browser }) => {
		const { page, section, close } = await openWithoutJs(browser, 'settings-form');
		const form = section.locator('form[aria-label="General settings"]');
		// The danger dialog's intent rides on its own (switched off) confirm button, never a hidden field of the page form.
		await expect(form.locator('input[name="intent"]')).toHaveCount(0);
		await expect(form.locator('button[name="intent"][value="clear-activity"]')).toBeDisabled();
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		const posted = await catchPost(page, '/settings-demo/general');
		await section.getByRole('textbox', { name: 'Team name' }).press('Enter');
		const body = decode(await posted());
		expect(body.get('teamName')).toBe('Northwind Design');
		expect(body.has('intent')).toBe(false);
		expect(body.has('confirm')).toBe(false);
		await close();
	});

	test('a conflict review inside the form adds no change, and once it is resolved focus returns to a field', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		await section.getByRole('checkbox', { name: 'A teammate saves first' }).check();
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Mine');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		const choice = section.getByRole('radiogroup', { name: 'Team name' });
		await choice.getByText('Yours').click();
		await expect(choice.getByRole('radio', { name: 'Yours' })).toBeChecked();
		// Its radios' saved state follows the choice, so the form never counts them as edits.
		const synced = await section
			.locator('input[name^="keep."]')
			.evaluateAll((radios) => radios.length > 0 && radios.every((r) => (r as HTMLInputElement).defaultChecked === (r as HTMLInputElement).checked));
		expect(synced).toBe(true);
		const bar = section.locator('[data-layout="sticky"]');
		await expect(bar).toContainText('1 unsaved change');
		await expect(bar).not.toContainText('Keep');

		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 9: Team name → Mine');
		await expect(choice).toHaveCount(0);
		await expect(team).toBeFocused();
	});

	test('Discard during a conflict review returns focus to a field, not the page', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		await section.getByRole('checkbox', { name: 'A teammate saves first' }).check();
		const team = section.getByRole('textbox', { name: 'Team name' });
		await team.fill('Mine');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(SETTLE);
		const choice = section.getByRole('radiogroup', { name: 'Team name' });
		await choice.getByText('Yours').click();
		await section.getByRole('button', { name: 'Discard' }).focus();
		await press(page, 'Enter');
		// The form re-reads its values on the task after a reset.
		await page.clock.runFor(100);
		await expect(team).toHaveValue('Northwind Studio');
		await expect(choice).toHaveCount(0);
		await expect(team).toBeFocused();
	});

	for (const layout of ['Sticky', 'Floating'] as const) {
		test(`a ${layout.toLowerCase()} bar keeps room below a field focused with Tab, so the field is never hidden under it`, async ({ page }) => {
			const section = await openSection(page, 'save-bar');
			await section.getByRole('group', { name: 'Bar layout' }).getByRole('button', { name: layout }).click();
			await section.getByRole('switch', { name: 'Mentions' }).click();
			const bar = notifications(section).locator(`[data-layout="${layout.toLowerCase()}"]`);
			await expect(bar).toContainText('1 unsaved change');
			const target = section.getByRole('switch', { name: 'Weekly digest' });
			const previous = section.getByRole('switch', { name: 'Invites accepted' });
			// Park the switch right where the bar sits in its scrolling frame, then Tab to it from the one before.
			const barTop = (await bar.boundingBox())!.y;
			await target.evaluate((el, top) => {
				const scroller = el.closest('.overflow-y-auto') as HTMLElement;
				scroller.scrollTop += el.getBoundingClientRect().bottom - (top + 20);
			}, barTop);
			const covered = (await target.boundingBox())!;
			expect(covered.y + covered.height).toBeGreaterThan((await bar.boundingBox())!.y);
			await previous.evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
			await press(page, 'Tab');
			await expect(target).toBeFocused();
			const field = (await target.boundingBox())!;
			expect(field.y + field.height).toBeLessThanOrEqual((await bar.boundingBox())!.y);
		});
	}
});

test.describe('Red-team fixes: locks, outcomes and announcements', () => {
	test('a covering lock turns off the phrase and Confirm, describes them with the reason it shows, and runs nothing', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		await section.getByRole('checkbox', { name: 'View as a viewer' }).check();
		await section.getByRole('button', { name: 'Archive…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Archive Northwind Studio?' });
		const reason = 'Only the team owner can archive the team or hand over billing.';
		await expect(dialog.getByText(reason)).toBeVisible();
		const phrase = dialog.getByRole('textbox', { name: 'Type “Archive” to confirm' });
		await expect(phrase).toBeDisabled();
		await expect(phrase).toHaveAccessibleDescription(reason);
		const confirm = dialog.getByRole('button', { name: 'Archive team' });
		await expect(confirm).toBeDisabled();
		await expect(confirm).toHaveAccessibleDescription(reason);
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
		await pauseClock(page);
		await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeVisible();
		await expect(section.getByTestId('cdd-status')).toHaveText('');
		await dialog.getByRole('button', { name: 'Cancel' }).click();

		// Unlocked, the same dialog confirms.
		await section.getByRole('checkbox', { name: 'View as a viewer' }).uncheck();
		await section.getByRole('button', { name: 'Archive…' }).click();
		await dialog.getByRole('textbox', { name: 'Type “Archive” to confirm' }).fill('Archive');
		await dialog.getByRole('button', { name: 'Archive team' }).click();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('cdd-status')).toHaveText('Team archived');
	});

	test('confirmUnavailable keeps Confirm focusable but blocked, with its reason shown and linked', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		await section.getByRole('button', { name: 'Hand over…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Hand over billing?' });
		const reason = 'Handing over billing is not available in this preview.';
		await expect(dialog.getByText(reason)).toBeVisible();
		const confirm = dialog.getByRole('button', { name: 'Hand over' });
		await expect(confirm).toHaveAttribute('aria-disabled', 'true');
		await expect(confirm).toHaveAccessibleDescription(reason);
		await pauseClock(page);
		await confirm.focus();
		await press(page, 'Enter');
		// Playwright refuses to click an aria-disabled button; a person can.
		await confirm.click({ force: true });
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeVisible();
		await expect(confirm).toBeFocused();
		await expect(section.getByTestId('cdd-status')).toHaveText('');
	});

	test('under a covering lock a ChangeNotice turns off Undo and its second action, described by the lock reason', async ({ page }) => {
		const section = await openSection(page, 'change-notice');
		const locked = section.getByTestId('cnd-locked');
		const reason = /Only admins can change the team’s theme\./;
		const undo = locked.getByRole('button', { name: 'Undo' });
		await expect(undo).toBeDisabled();
		await expect(undo).toHaveAccessibleDescription(reason);
		const reset = locked.getByRole('button', { name: 'Reset to default' });
		await expect(reset).toBeDisabled();
		await expect(reset).toHaveAccessibleDescription(reason);
	});

	test('an Undo that succeeds is never announced as replaced, even when it clears the undo point', async ({ page }) => {
		const section = await openOnClock(page, 'change-notice');
		const density = section.getByRole('radiogroup', { name: 'Density' });
		await pauseClock(page);
		await density.getByText('Compact').click();
		await page.clock.runFor(SETTLE);
		const notice = section.getByTestId('cnd-notices').getByRole('status').first();
		await expect(notice).toContainText('Density set to compact');
		await notice.evaluate((node) => {
			const seen: string[] = [];
			(window as unknown as { seen: string[] }).seen = seen;
			new MutationObserver(() => seen.push(node.textContent ?? '')).observe(node, { subtree: true, childList: true, characterData: true });
		});
		await notice.getByRole('button', { name: 'Undo' }).click();
		await page.clock.runFor(SETTLE);
		await expect(notice).toContainText('Undone. The change was reversed.');
		const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
		expect(seen.some((text) => text.includes('Undoing…'))).toBe(true);
		expect(seen.some((text) => text.includes('A newer change replaced this one'))).toBe(false);
	});

	test('a second action that returns { error } shows that failure as an alert', async ({ page }) => {
		const section = await openOnClock(page, 'change-notice');
		const density = section.getByRole('radiogroup', { name: 'Density' });
		await pauseClock(page);
		await density.getByText('Compact').click();
		await page.clock.runFor(SETTLE);
		const notice = section.getByTestId('cnd-notices').getByRole('status').first();
		await notice.getByRole('button', { name: 'Use for the whole team' }).click();
		await page.clock.runFor(SETTLE);
		await expect(notice.getByRole('alert')).toHaveText('Only admins can set the team’s density.');
	});
});

test.describe('Verifier fixes: Enter, row locks, unavailable confirms and shared scroll room', () => {
	test('Enter in an unedited field saves nothing; once a field changes it saves', async ({ page }) => {
		const section = await openOnClock(page, 'settings-form');
		const form = section.locator('form[aria-label="General settings"]');
		const team = section.getByRole('textbox', { name: 'Team name' });
		await expect(form.locator('[data-settings-default]')).toBeDisabled();
		await pauseClock(page);
		await team.press('Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('');
		await expect(form.locator('input[name="revision"]')).toHaveValue('7');

		await team.fill('Northwind Design');
		await expect(form.locator('[data-settings-default]')).toBeEnabled();
		await team.press('Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('sf-log')).toHaveText('Saved revision 8: Team name → Northwind Design');
	});

	test('a locked SettingsRow around a ConsequenceDialog turns off its phrase and Confirm, says the row’s own reason, and runs nothing', async ({ page }) => {
		const section = await openOnClock(page, 'consequence-dialog');
		await section.getByRole('button', { name: 'Transfer…' }).click();
		const dialog = page.getByRole('dialog', { name: 'Transfer Northwind Studio?' });
		// The modal hides the row, so the dialog repeats the row's reason rather than a generic one.
		const reason = 'Only the current owner can transfer the team.';
		await expect(dialog.getByText(reason)).toBeVisible();
		const phrase = dialog.getByRole('textbox', { name: 'Type “Transfer” to confirm' });
		await expect(phrase).toBeDisabled();
		await expect(phrase).toHaveAccessibleDescription(reason);
		const confirm = dialog.getByRole('button', { name: 'Transfer team' });
		await expect(confirm).toBeDisabled();
		await expect(confirm).toHaveAccessibleDescription(reason);
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
		await pauseClock(page);
		await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
		await page.clock.runFor(SETTLE);
		await expect(dialog).toBeVisible();
		await expect(section.getByTestId('cdd-status')).toHaveText('');
	});

	for (const blocked of ['confirmUnavailable', 'a covering lock'] as const) {
		test(`Enter in a dialog's own text field posts and runs nothing under ${blocked}`, async ({ page }) => {
			const section = await openOnClock(page, 'consequence-dialog');
			if (blocked === 'a covering lock') await section.getByRole('checkbox', { name: 'View as a viewer' }).check();
			let posted = false;
			await page.route('**/settings-demo/billing', async (route) => {
				posted = true;
				await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' });
			});
			await section.getByRole('button', { name: 'Hand over…' }).click();
			const dialog = page.getByRole('dialog', { name: 'Hand over billing?' });
			const note = dialog.getByRole('textbox', { name: 'Note for the new contact' });
			await note.fill('Invoices go to finance now');
			const submits = () => page.evaluate(() => (window as unknown as { submits: number }).submits);
			await page.evaluate(() => {
				(window as unknown as { submits: number }).submits = 0;
				window.addEventListener('submit', () => (window as unknown as { submits: number }).submits++, { capture: true });
			});
			await pauseClock(page);
			// The form's default button is disabled, so Enter never submits it.
			await note.press('Enter');
			expect(await submits()).toBe(0);
			// A submit that bypasses the buttons (a script, an extension) is stopped by the dialog.
			await dialog.locator('form').evaluate((form) => (form as HTMLFormElement).requestSubmit());
			expect(await submits()).toBe(1);
			await page.clock.runFor(SETTLE);
			await expect(dialog).toBeVisible();
			await expect(note).toHaveValue('Invoices go to finance now');
			await expect(section.getByTestId('cdd-status')).toHaveText('');
			expect(posted).toBe(false);
		});
	}

	test('without JavaScript Enter in the field of an unavailable dialog posts nothing', async ({ browser }) => {
		const { page, close } = await openWithoutJs(browser, 'consequence-dialog');
		let posted = false;
		await page.route('**/settings-demo/billing', async (route) => {
			posted = true;
			await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' });
		});
		// Without JavaScript the trigger cannot open it; the closed dialog's form is still in the page.
		const form = page.locator('form[action="/settings-demo/billing"]');
		const note = form.locator('input[name="note"]');
		await note.evaluate((el) => {
			(el.closest('dialog') as HTMLDialogElement).setAttribute('open', '');
		});
		await note.fill('Invoices go to finance now');
		await note.press('Enter');
		expect(posted).toBe(false);
		await expect(note).toHaveValue('Invoices go to finance now');
		// Its disabled default button stops Enter, and no intent would ride along anyway.
		await expect(form.locator('[data-consequence-default]')).toBeDisabled();
		await expect(form.locator('input[name="intent"]')).toHaveCount(0);
		await close();
	});

	test('two forms with sticky bars on one scroller put its own scroll room back once both bars hide', async ({ page }) => {
		const section = await openSection(page, 'save-bar');
		const scroller = section.locator('.overflow-y-auto').first();
		const room = () => scroller.evaluate((el) => [el.style.scrollPaddingBottom, el.style.getPropertyValue('--ak-settings-bar-space')]);
		expect(await room()).toEqual(['', '']);
		const first = notifications(section).locator('[data-layout="sticky"]');
		const second = section.getByTestId('sbd-push-bar');
		await section.getByRole('switch', { name: 'Mentions' }).click();
		await expect(first).toContainText('1 unsaved change');
		await section.getByRole('switch', { name: 'Direct messages' }).click();
		await expect(second).toContainText('1 unsaved change');
		expect((await room())[0]).toBe('var(--ak-settings-bar-space)');

		await first.getByRole('button', { name: 'Discard' }).click();
		await expect(first.getByRole('button', { name: 'Discard' })).toHaveCount(0);
		expect((await room())[1]).toMatch(/^\d+px$/);
		await second.getByRole('button', { name: 'Discard' }).click();
		await expect(second.getByRole('button', { name: 'Discard' })).toHaveCount(0);
		await expect.poll(room).toEqual(['', '']);
	});
});

/** Opens the save fixture once it is interactive (a clean form's default button is off once hydrated). */
async function openSaveFixture(page: Page): Promise<void> {
	await page.goto('/fixtures/settings-save/');
	await expect(page.getByTestId('form-conflict').locator('[data-settings-default]')).toBeDisabled({ timeout: 45000 });
}

test.describe('Final fixes: every failure is shown', () => {
	test('a SettingsForm with no SaveBar shows a conflict from its handler, announced and focused', async ({ page }) => {
		await openSaveFixture(page);
		const form = page.getByTestId('form-conflict');
		await form.getByRole('textbox', { name: 'Name one' }).fill('B');
		await form.getByRole('button', { name: 'Save name' }).click();
		const error = form.locator('[data-form-error]');
		await expect(error).toHaveText('Someone else renamed this a moment ago. Your change is kept.');
		await expect(error).toHaveAttribute('role', 'alert');
		await expect(error).toBeFocused();
		// The draft is kept.
		await expect(form.getByRole('textbox', { name: 'Name one' })).toHaveValue('B');
	});

	test('a SettingsForm with no SaveBar shows a conflict handed back as its result, with and without JavaScript', async ({ page, browser }) => {
		await openSaveFixture(page);
		await expect(page.getByTestId('form-round-trip').locator('[data-form-error]')).toHaveText('The server saw a newer revision.');
		const context = await browser.newContext({ javaScriptEnabled: false });
		const plain = await context.newPage();
		await plain.goto('/fixtures/settings-save/');
		await expect(plain.getByTestId('form-round-trip').locator('[data-form-error]')).toHaveText('The server saw a newer revision.');
		await context.close();
	});

	for (const where of ['on its own', 'inside a SettingsForm'] as const) {
		test(`a ConsequenceDialog ${where} shows the field errors of a confirm on their fields and focuses the first`, async ({ page }) => {
			await openSaveFixture(page);
			const nested = where === 'inside a SettingsForm';
			await page.getByRole('button', { name: nested ? 'Open nested field errors' : 'Open field errors' }).click();
			const dialog = page.getByRole('dialog', { name: nested ? 'Remove nested report?' : 'Remove report?' });
			const phrase = dialog.getByRole('textbox', { name: 'Type “report” to confirm' });
			await phrase.fill('report');
			await dialog.getByRole('button', { name: nested ? 'Remove nested report' : 'Remove report' }).click();
			await expect(phrase).toHaveAttribute('aria-invalid', 'true');
			await expect(phrase).toHaveAccessibleDescription('That name was changed; type the new one.');
			const owner = dialog.getByRole('combobox', { name: 'New owner for Weekly report' });
			await expect(owner).toHaveAttribute('aria-invalid', 'true');
			await expect(owner).toHaveAccessibleDescription('Pick someone who is still a member.');
			// A field the dialog does not draw: its error joins the alert, so it is never lost.
			await expect(dialog.locator('[data-form-error]')).toHaveText('Say why.');
			// The first invalid field in the dialog (the owner select comes before the phrase).
			await expect(owner).toBeFocused();
			await expect(dialog).toBeVisible();
			// Editing the phrase hides its error and keeps focus where the person types.
			await phrase.press('End');
			await page.keyboard.type('s');
			await expect(phrase).not.toHaveAttribute('aria-invalid', 'true');
			await expect(phrase).toBeFocused();
		});
	}

	test('a ConsequenceDialog confirm that answers with a conflict shows it and stays open; the next try closes it', async ({ page }) => {
		await page.clock.install();
		await openSaveFixture(page);
		await pauseClock(page);
		await page.getByRole('button', { name: 'Open conflict once' }).click();
		const dialog = page.getByRole('dialog', { name: 'Remove thing?' });
		const confirm = dialog.getByRole('button', { name: 'Remove thing' });
		await confirm.click();
		await page.clock.runFor(SETTLE);
		const error = dialog.locator('[data-form-error]');
		await expect(error).toHaveText('Someone else removed it first. Reload to see it.');
		await expect(error).toBeFocused();
		await expect(dialog).toBeVisible();
		await confirm.click();
		await page.clock.runFor(SETTLE);
		await expect(page.getByTestId('confirms')).toHaveText('2');
		await expect(dialog).toHaveCount(0);
	});

	test('a ConsequenceDialog shows a conflict handed back as its result', async ({ page }) => {
		await openSaveFixture(page);
		await page.getByRole('button', { name: 'Open round trip' }).click();
		await expect(page.getByRole('dialog', { name: 'Remove it?' }).locator('[data-form-error]')).toHaveText('Someone else removed it first.');
	});
});
