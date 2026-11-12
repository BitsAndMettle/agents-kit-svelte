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
		await section.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
		const posted = await catchPost(page, '/settings-demo/general');
		await section.getByRole('button', { name: 'Save', exact: true }).click();
		const body = decode(await posted());
		expect(body.get('revision')).toBe('7');
		expect(body.get('teamName')).toBe('Northwind Design');
		expect(body.get('retention')).toBe('90');
		await close();
	});
});

test.describe('SaveBar', () => {
	test('lists changes with an impact line; a failed save is an alert that takes focus; Discard restores', async ({ page }) => {
		const section = await openOnClock(page, 'save-bar');
		await section.getByRole('combobox', { name: 'Next save' }).selectOption('error');
		const mentions = section.getByRole('switch', { name: 'Mentions' });
		await mentions.click();
		const bar = section.locator('[data-layout="sticky"]');
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
		const bar = section.locator('[data-layout="sticky"]');
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
		const footer = section.locator('[data-layout="footer"]');
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
		const bar = section.locator('[data-layout="sticky"]');
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
		await expect(section.getByRole('group', { name: 'What happens' }).getByRole('listitem').first()).toContainText('Caution: The project becomes read-only');
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
		await expect(dialog.getByRole('status')).toHaveText('Ada Park takes 2 · Chloé Martin takes 1');
		await weekly.selectOption('dev');
		await expect(dialog.getByRole('status')).toHaveText('Dev Rao takes 1 · Ada Park takes 1 · Chloé Martin takes 1');

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
});
