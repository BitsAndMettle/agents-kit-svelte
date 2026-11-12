import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/**
 * Settings rows group: SettingsSection, SettingsRow, SettingsFacts, SettingsToggle, RequestedChange, LockReason.
 * The demos answer after 600 ms. A test that looks at an in-flight state owns that time: the clock is installed
 * before the page loads, paused before the action, and advanced by hand.
 */

async function openOnClock(page: Page, slug: string): Promise<Locator> {
	await page.clock.install();
	return openSection(page, slug);
}

/** Stops time, so no demo timer fires until `page.clock.runFor`. */
async function pauseClock(page: Page): Promise<void> {
	await page.clock.pauseAt(new Date(Date.now() + 5000));
}

/** The settings row (`<li>`) a control sits in. */
function rowOf(control: Locator): Locator {
	return control.locator('xpath=ancestor::li[1]');
}

/** True when the element sits in a visually hidden box (`sr-only`: 1px, overflow hidden), so nobody sees it. */
function clippedAway(control: Locator): Promise<boolean> {
	return control.evaluate((node) => {
		for (let el: Element | null = node; el; el = el.parentElement) {
			const rect = el.getBoundingClientRect();
			if ((rect.width <= 1 || rect.height <= 1) && getComputedStyle(el).overflow !== 'visible') return true;
		}
		return false;
	});
}

/** Longer than the demos' 600 ms answer. */
const SETTLE = 700;

/** A page with JavaScript off: what the server renders, and native posts. */
async function noJsPage(browser: Browser, baseURL: string | undefined): Promise<{ page: Page; close: () => Promise<void> }> {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	const page = await context.newPage();
	await page.goto('/');
	return { page, close: () => context.close() };
}

test.describe('SettingsSection', () => {
	test('a section is a region named by its heading; count, status and header actions sit in the header', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const plain = section.getByTestId('section-plain');
		await expect(plain).toHaveRole('region');
		await expect(plain).toHaveAccessibleName('Profile');
		await expect(plain.getByRole('heading', { level: 2, name: 'Profile' })).toBeVisible();
		await expect(plain.getByRole('list').first().locator('> li')).toHaveCount(3);
		const members = section.getByTestId('section-count');
		await expect(members.locator('header')).toContainText('6');
		await expect(members.locator('header')).toContainText('2 seats left');
		await expect(members.locator('header').getByRole('link', { name: 'Invite people' })).toHaveAttribute('href', '?dialog=invite');
	});

	test('more than two row actions collapse into a More actions menu once interactive; links stay links', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const row = rowOf(section.getByText('chloe@northwind.example · Member'));
		await expect(row.getByRole('link', { name: 'Change role for Chloé Martin' })).toBeVisible();
		await expect(row.getByRole('link', { name: 'Remove Chloé Martin' })).toHaveAttribute('href', '?dialog=remove&member=chloe');
		await expect(row.getByRole('button', { name: 'Reset two-step sign-in' })).toHaveCount(0);
		const more = row.getByRole('button', { name: 'More actions' });
		await more.focus();
		await press(page, 'Enter');
		await expect(page.getByRole('menuitem')).toHaveText(['Reset two-step sign-in', 'Sign out everywhere']);
		await page.getByRole('menuitem', { name: 'Reset two-step sign-in' }).click();
		await expect(section.getByTestId('section-resets')).toHaveText('1');
		await expect(more).toBeFocused();
	});

	test('without JavaScript every row action is a plain link or button', async ({ browser, baseURL }) => {
		const { page, close } = await noJsPage(browser, baseURL);
		const row = rowOf(page.locator('#settings-section').getByText('chloe@northwind.example · Member'));
		await expect(row.getByRole('link', { name: 'Remove Chloé Martin' })).toHaveAttribute('href', '?dialog=remove&member=chloe');
		await expect(row.getByRole('button', { name: 'Reset two-step sign-in' })).toBeVisible();
		await expect(row.getByRole('button', { name: 'More actions' })).toHaveCount(0);
		await close();
	});

	test('a nested section renders as a list item with the next heading level', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const columns = section.getByTestId('section-columns');
		const groups = columns.locator('ul[role=list] > li').filter({ has: page.getByRole('heading', { level: 3 }) });
		await expect(groups).toHaveCount(2);
		await expect(groups.first().getByRole('heading', { level: 3 })).toHaveText('Email');
		await expect(groups.nth(1).getByRole('heading', { level: 3 })).toHaveText('Mobile push');
		// Side by side on a wide container.
		const [a, b] = [await groups.first().boundingBox(), await groups.nth(1).boundingBox()];
		expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
		expect(b!.x).toBeGreaterThan(a!.x + 100);
	});

	test('the aside sits beside the card when wide and below it when narrow', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const box = section.getByTestId('section-aside');
		const aside = box.getByRole('complementary', { name: 'What the switch does' });
		const card = box.locator('header').first();
		let [cardBox, asideBox] = [await card.boundingBox(), await aside.boundingBox()];
		expect(asideBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width - 2);
		await page.setViewportSize({ width: 375, height: 800 });
		await box.scrollIntoViewIfNeeded();
		await expect.poll(async () => (await aside.boundingBox())!.y).toBeGreaterThan((await card.boundingBox())!.y + 100);
		[cardBox, asideBox] = [await card.boundingBox(), await aside.boundingBox()];
		expect(Math.abs(asideBox!.x - cardBox!.x)).toBeLessThan(2);
	});

	test('a locked section disables its rows and describes them by the one reason in its header', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const locked = section.getByTestId('section-locked');
		const reason = locked.locator('header').getByText("You don't have permission to change this.");
		await expect(reason).toBeVisible();
		const pay = locked.getByRole('switch', { name: 'Pay yearly' });
		await expect(pay).toBeDisabled();
		await expect(pay).toHaveAccessibleDescription(/Two months free.*You don't have permission to change this\. · Owners only/);
		await expect(locked.getByRole('button', { name: 'Request access' })).toBeVisible();
	});

	test('an empty list shows the empty state; the danger zone keeps its links', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		await expect(section.getByTestId('section-empty').getByText('No apps connected yet.')).toBeVisible();
		const danger = section.getByTestId('section-danger');
		await expect(danger).toHaveAttribute('data-tone', 'danger');
		await expect(danger.getByRole('link', { name: 'Delete team' })).toHaveAttribute('href', '?dialog=delete-team');
	});

	test('without JavaScript the empty state and the aside still render', async ({ browser, baseURL }) => {
		const { page, close } = await noJsPage(browser, baseURL);
		await expect(page.getByTestId('section-empty').getByText('No apps connected yet.')).toBeVisible();
		await expect(page.getByTestId('section-aside').getByRole('complementary')).toBeVisible();
		await close();
	});
});

test.describe('SettingsRow', () => {
	test('a switch in a row has one accessible name and is described by the description; a lock disables and describes it', async ({ page }) => {
		const section = await openSection(page, 'settings-row');
		const digest = section.getByRole('switch', { name: 'Weekly digest' });
		await expect(digest).toHaveAccessibleName('Weekly digest');
		await expect(digest).toHaveAccessibleDescription('A Monday summary of what changed.');
		const sso = section.getByRole('switch', { name: 'Single sign-on' });
		await expect(sso).toBeDisabled();
		await expect(sso).toHaveAccessibleDescription(/Require members.*Single sign-on is on the Business plan\./);
		await expect(section.getByText('Single sign-on is on the Business plan.')).toBeVisible();
		await expect(section.getByRole('button', { name: 'Ask an owner to upgrade' })).toHaveAccessibleDescription('Single sign-on is on the Business plan.');
		await expect(section.getByRole('textbox', { name: /Team name/ })).toHaveAccessibleDescription('Shown on invites and in the browser tab.');
	});

	test('editing a staged row shows Unsaved, "was X" and the impact line, and describes the control by them; Discard clears it', async ({ page }) => {
		const section = await openSection(page, 'settings-row');
		const select = section.getByRole('combobox', { name: 'Data retention' });
		const row = rowOf(select);
		await expect(row.getByText('was 90 days')).toHaveCount(0);
		await select.selectOption('30');
		await expect(row).toHaveAttribute('data-dirty', '');
		await expect(row.getByText('was 90 days')).toBeVisible();
		await expect(row.getByText('Activity older than the new period is deleted the night after you save.')).toBeVisible();
		await expect(select).toHaveAccessibleDescription(/How long activity is kept.*Unsaved, was 90 days.*Activity older/);
		await expect(section.getByTestId('row-dirty')).toHaveText('1 unsaved change');
		await section.getByRole('button', { name: 'Discard' }).click();
		await expect(row).not.toHaveAttribute('data-dirty', '');
		await expect(section.getByTestId('row-dirty')).toHaveText('No unsaved changes');
	});

	test('a field error from the save lands on its row; a good save clears the staged marks', async ({ page }) => {
		const section = await openOnClock(page, 'settings-row');
		const name = section.getByRole('textbox', { name: /Team name/ });
		await name.fill('Taken');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Save' }).click();
		await expect(section.getByTestId('row-dirty')).toHaveText('Saving…');
		await page.clock.runFor(SETTLE);
		const row = rowOf(name);
		await expect(row.getByRole('alert')).toHaveText('Another team already uses that name.');
		await expect(name).toHaveAttribute('aria-invalid', 'true');
		await expect(name).toBeFocused();
		await name.fill('Northwind Design');
		await expect(row.getByRole('alert')).toHaveText('');
		await section.getByRole('button', { name: 'Save' }).click();
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('row-saves')).toHaveText('1');
		await expect(row).not.toHaveAttribute('data-dirty', '');
		await expect(section.getByTestId('row-dirty')).toHaveText('All changes saved');
	});

	test('summary mode shows a summary and an Edit link on a narrow container', async ({ page }) => {
		const section = await openSection(page, 'settings-row');
		const select = section.getByRole('combobox', { name: 'Time zone' });
		await expect(select).toBeVisible();
		await expect(section.getByRole('link', { name: 'Edit Time zone' })).toBeHidden();
		await page.setViewportSize({ width: 375, height: 800 });
		await expect(section.getByRole('link', { name: 'Edit Time zone' })).toBeVisible();
		await expect(section.getByRole('link', { name: 'Edit Time zone' })).toHaveAttribute('href', '?dialog=time-zone');
		await expect(select).toBeHidden();
	});

	test('with JavaScript off, the staged form posts its controls natively (locked ones stay out)', async ({ browser, baseURL }) => {
		const { page, close } = await noJsPage(browser, baseURL);
		await page.route('**/settings-demo/general', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const form = page.getByTestId('row-form');
		await form.getByRole('combobox', { name: 'Data retention' }).selectOption('365');
		const request = page.waitForRequest((r) => r.url().endsWith('/settings-demo/general') && r.method() === 'POST');
		await form.getByRole('button', { name: 'Save' }).click();
		const body = (await request).postData() ?? '';
		expect(body).toContain('teamName=Northwind+Studio');
		expect(body).toContain('retention=365');
		expect(body).toContain('digest=true');
		expect(body).not.toContain('sso');
		await close();
	});
});

test.describe('SettingsFacts', () => {
	test('facts are a description list with sources, details and a described unavailable action', async ({ page }) => {
		const section = await openSection(page, 'settings-facts');
		const facts = section.getByTestId('facts-connection');
		await expect(facts.locator('dl > div > dt')).toHaveCount(6);
		await expect(facts.locator('dl > div > dd')).toHaveCount(6);
		await expect(facts.locator('[data-fact=region] dd')).toContainText('Set by your administrator');
		const version = section.getByTestId('facts-version');
		const unavailable = version.getByRole('button', { name: 'Switch to preview' });
		await expect(unavailable).toHaveAttribute('aria-disabled', 'true');
		await expect(unavailable).toHaveAccessibleDescription('Preview builds need an admin to opt the team in.');
		await expect(section.getByTestId('facts-grid').locator('dl > div')).toHaveCount(6);
	});

	test('copy announces politely and reports onCopy; no value sits in an attribute', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const section = await openSection(page, 'settings-facts');
		const version = section.getByTestId('facts-version');
		await version.getByRole('button', { name: 'Copy Build' }).click();
		await expect(version.getByRole('status')).toHaveText('Copied: Build');
		await expect(section.getByTestId('facts-copies')).toHaveText('build:copied');
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('2026.11.09-7f3a91c');
		const leaked = await version.evaluate((root) =>
			[...root.querySelectorAll('*')].some((el) => [...el.attributes].some((a) => a.value.includes('ac_2Q8m4x7Kp') || a.value.includes('7f3a91c')))
		);
		expect(leaked).toBe(false);
	});

	test('a refused copy says so, selects the value and reports failure', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true });
			document.execCommand = () => false;
		});
		const section = await openSection(page, 'settings-facts');
		const version = section.getByTestId('facts-version');
		await version.getByRole('button', { name: 'Copy Account ID' }).press('Enter');
		await expect(version.getByRole('alert')).toHaveText("Couldn't copy. The value is selected: copy it by hand.");
		await expect(section.getByTestId('facts-copies')).toHaveText('account-key:failed');
		expect(await page.evaluate(() => window.getSelection()?.toString().trim())).toBe('ac_2Q8m4x7Kp');
	});

	test('a compact value replaces the full one on a narrow container; copy waits for JavaScript', async ({ page, browser, baseURL }) => {
		const section = await openSection(page, 'settings-facts');
		const since = section.locator('[data-fact=since] dd');
		await expect(since.getByText('4 February 2026, 09:12')).toBeVisible();
		await page.setViewportSize({ width: 375, height: 800 });
		await expect(since.getByText('4 Feb 2026')).toBeVisible();
		await expect(since.getByText('4 February 2026, 09:12')).toBeHidden();
		const { page: noJs, close } = await noJsPage(browser, baseURL);
		await expect(noJs.getByTestId('facts-version').getByText('2026.11.09-7f3a91c')).toBeVisible();
		await expect(noJs.getByTestId('facts-version').getByRole('button', { name: /^Copy/ })).toHaveCount(0);
		await close();
	});
});

test.describe('SettingsToggle', () => {
	test('instant: pending, then saved; the bound value only takes the saved state; Undo changes it back', async ({ page }) => {
		const section = await openOnClock(page, 'settings-toggle');
		const instant = section.getByTestId('toggle-instant');
		const compact = instant.getByRole('switch', { name: 'Compact lists' });
		const row = rowOf(compact);
		await pauseClock(page);
		await compact.focus();
		await press(page, 'Space');
		await expect(compact).toBeChecked();
		await expect(row).toHaveAttribute('aria-busy', 'true');
		await expect(row.getByRole('status')).toHaveText('Saving…');
		await expect(section.getByTestId('toggle-compact-bound')).toHaveText('off');
		await page.clock.runFor(SETTLE);
		await expect(row.getByRole('status')).toHaveText('Saved');
		await expect(section.getByTestId('toggle-compact-bound')).toHaveText('on');
		await expect(compact).toHaveAccessibleDescription(/Tighter rows.*Saved/);
		await row.getByRole('button', { name: 'Undo Compact lists' }).click();
		await page.clock.runFor(SETTLE);
		await expect(compact).not.toBeChecked();
		await expect(row.getByRole('status')).toHaveText('Changed back');
		await expect(section.getByTestId('toggle-compact-bound')).toHaveText('off');
		await expect(row.getByRole('button', { name: /Undo/ })).toHaveCount(0);
	});

	test('a returned error switches it back and offers Retry; a rejection shows the generic text', async ({ page }) => {
		const section = await openOnClock(page, 'settings-toggle');
		const instant = section.getByTestId('toggle-instant');
		const sounds = instant.getByRole('switch', { name: 'Play sounds' });
		const row = rowOf(sounds);
		await pauseClock(page);
		await sounds.check();
		await page.clock.runFor(SETTLE);
		await expect(sounds).not.toBeChecked();
		await expect(row.getByRole('alert')).toHaveText("Couldn't turn on sounds. Changed back.");
		await expect(sounds).toHaveAttribute('aria-invalid', 'true');
		await row.getByRole('button', { name: 'Retry' }).click();
		await page.clock.runFor(SETTLE);
		await expect(sounds).toBeChecked();
		await expect(row.getByRole('alert')).toHaveText('');

		const sync = instant.getByRole('switch', { name: 'Sync across devices' });
		const syncRow = rowOf(sync);
		await sync.uncheck();
		await page.clock.runFor(SETTLE);
		await expect(sync).toBeChecked();
		await expect(syncRow.getByRole('alert')).toHaveText("Couldn't save. Changed back.");
		await expect(syncRow).not.toContainText('network down');
	});

	test('a plan lock disables the switch and describes it by the visible reason', async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		const dark = section.getByRole('switch', { name: 'Dark sidebar' });
		await expect(dark).toBeDisabled();
		await expect(dark).toHaveAccessibleDescription(/Custom sidebars are on the Business plan\./);
	});

	test('inside a form it is staged: no nested form, Unsaved after a change, Always on keeps a disabled switch', async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		const form = section.getByTestId('toggle-staged-form');
		await expect(form.locator('form')).toHaveCount(0);
		const invites = form.getByRole('switch', { name: 'Invite people outside the team' });
		await invites.check();
		await expect(rowOf(invites)).toHaveAttribute('data-dirty', '');
		await expect(invites).toHaveAccessibleDescription(/Unsaved, was Off/);
		await expect(form.getByTestId('toggle-staged-status')).toHaveText('1 unsaved');
		const downloads = form.getByRole('switch', { name: 'Allow downloads' });
		await expect(downloads).toBeDisabled();
		await expect(downloads).toBeChecked();
		await expect(downloads).toHaveAccessibleDescription(/Managed by an administrator\. · Set by Northwind IT/);
		await expect(form.getByText('Always on')).toBeVisible();
	});

	test('with JavaScript on, Apply hides only where a handler saves the change', async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		const noJs = section.getByTestId('toggle-nojs');
		await expect(noJs.getByRole('switch', { name: 'Reduce motion' })).toBeEnabled();
		await expect(noJs.getByRole('button', { name: 'Apply' })).toHaveCount(1);
		await expect(noJs.locator('li').filter({ hasText: 'Always show captions' }).getByRole('button', { name: 'Apply' })).toBeVisible();
	});

	test('with JavaScript off, Apply posts false then true; the staged form posts its switches', async ({ browser, baseURL }) => {
		const { page, close } = await noJsPage(browser, baseURL);
		await page.route('**/settings-demo/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const box = page.getByTestId('toggle-nojs');
		const motionRow = box.locator('li').filter({ hasText: 'Reduce motion' });
		await expect(motionRow.getByRole('switch', { name: 'Reduce motion' })).toBeChecked();
		const motion = page.waitForRequest((r) => r.url().endsWith('/settings-demo/motion') && r.method() === 'POST');
		await motionRow.getByRole('button', { name: 'Apply' }).click();
		expect((await motion).postData()).toBe('scope=personal&reduceMotion=false&reduceMotion=true');

		await page.goto('/');
		const staged = page.getByTestId('toggle-staged-form');
		await staged.getByRole('switch', { name: 'Invite people outside the team' }).check();
		const sharing = page.waitForRequest((r) => r.url().endsWith('/settings-demo/sharing') && r.method() === 'POST');
		await staged.getByRole('button', { name: 'Save' }).click();
		const body = (await sharing).postData() ?? '';
		expect(body).toBe('externalInvites=false&externalInvites=true&publicLinks=false&publicLinks=true');
		await close();
	});
});

test.describe('RequestedChange', () => {
	test('shows effective against requested, who it waits on and the time from the injected now', async ({ page }) => {
		const section = await openSection(page, 'requested-change');
		const row = section.getByTestId('requested-awaiting');
		await expect(row).toContainText('Awaiting approval');
		await expect(row).toContainText('Now 2');
		await expect(row).toContainText('Requested 3');
		await expect(row).toContainText('Nothing changes until it is approved. Waiting on the device owner, sent 12 min ago.');
		await expect(row.getByText('example-cli allow 7Q4K')).toBeVisible();
		await expect(section.getByTestId('requested-approved')).toContainText('Now 200 GB.');
		await expect(section.getByTestId('requested-declined')).toContainText('The request for On was declined.');
		await expect(section.getByTestId('requested-expired').getByRole('button')).toHaveCount(0);
	});

	test('Send again loads, then says it was sent, and never changes the status', async ({ page }) => {
		const section = await openOnClock(page, 'requested-change');
		const row = section.getByTestId('requested-awaiting');
		const resend = row.getByRole('button', { name: 'Send again for Parallel runs' });
		await pauseClock(page);
		await resend.focus();
		await press(page, 'Enter');
		await expect(resend).toHaveAttribute('aria-busy', 'true');
		await expect(row.getByRole('status')).toHaveText('Sending the request again…');
		await page.clock.runFor(SETTLE);
		await expect(row.getByRole('status')).toHaveText('Request sent again.');
		await expect(row).toHaveAttribute('data-status', 'awaiting');
		await expect(row).toContainText('Awaiting approval');
		await expect(section.getByTestId('requested-resends')).toHaveText('1');
	});

	test('a failed action says the request is still waiting; a status from the app is announced', async ({ page }) => {
		const section = await openOnClock(page, 'requested-change');
		const failing = section.getByTestId('requested-failing');
		await pauseClock(page);
		await failing.getByRole('button', { name: 'Cancel request for Role' }).click();
		await page.clock.runFor(SETTLE);
		await expect(failing.getByRole('alert')).toHaveText("Couldn't reach the approval service. The request is still waiting.");
		await expect(failing).toHaveAttribute('data-status', 'awaiting');

		await section.getByRole('button', { name: 'approved', exact: true }).click();
		const row = section.getByTestId('requested-awaiting');
		await expect(row).toHaveAttribute('data-status', 'approved');
		await expect(row.getByRole('status')).toHaveText('Parallel runs: Approved');
		await expect(row.getByRole('button')).toHaveCount(0);
	});

	test('Cancel request reports intent; the app removes the row', async ({ page }) => {
		const section = await openOnClock(page, 'requested-change');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Cancel request for Parallel runs' }).click();
		await expect(section.getByTestId('requested-awaiting').getByRole('status')).toHaveText('Cancelling the request…');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('requested-cancelled')).toBeVisible();
		await expect(section.getByTestId('requested-cancels')).toHaveText('1');
	});

	test('with JavaScript off, the buttons post their intent; the request id rides in the query', async ({ browser, baseURL }) => {
		const { page, close } = await noJsPage(browser, baseURL);
		await stubPosts(page, '/settings-demo/requests');
		const row = page.getByTestId('requested-nojs');
		await expect(row).toContainText('sent 4 days ago');
		const request = page.waitForRequest((r) => new URL(r.url()).pathname === '/settings-demo/requests' && r.method() === 'POST');
		await row.getByRole('button', { name: 'Send again for Billing access' }).click();
		const sent = await request;
		expect(new URL(sent.url()).search).toBe('?request=rq_4815');
		expect(sent.postData()).toBe('intent=resend');
		await close();
	});
});

test.describe('LockReason', () => {
	test('every kind shows its default sentence as visible text', async ({ page }) => {
		const section = await openSection(page, 'lock-reason');
		const kinds = section.getByTestId('lock-kinds');
		for (const text of [
			"You don't have permission to change this.",
			'Not included in your current plan.',
			'Managed by an administrator.',
			'Inherited from a higher-level setting.',
			'Read-only here.',
			'Not supported here.',
			'Waiting for approval.'
		]) {
			await expect(kinds.getByText(text)).toBeVisible();
		}
	});

	test('three controls are described by one shared, visible reason', async ({ page }) => {
		const section = await openSection(page, 'lock-reason');
		const shared = section.getByTestId('lock-shared');
		await expect(shared.locator('#security-managed')).toBeVisible();
		await expect(shared.locator('#security-managed')).toHaveText('Security settings are managed by your organisation. · Northwind IT');
		const controls = [
			shared.getByRole('switch', { name: 'Two-step sign-in' }),
			shared.getByRole('combobox', { name: 'Session length' }),
			shared.getByRole('switch', { name: 'Remember devices' })
		];
		for (const control of controls) {
			await expect(control).toBeDisabled();
			expect((await control.getAttribute('aria-describedby'))?.split(' ')).toContain('security-managed');
			await expect(control).toHaveAccessibleDescription(/Security settings are managed by your organisation\. · Northwind IT$/);
		}
		// The rows draw no reason of their own.
		await expect(shared.getByText('Security settings are managed by your organisation.')).toHaveCount(1);
	});

	test('Request access loads, then shows the request was sent; a failure says so', async ({ page }) => {
		const section = await openOnClock(page, 'lock-reason');
		const ok = section.getByTestId('lock-request-ok');
		const request = ok.getByRole('button', { name: 'Request access' });
		await expect(request).toHaveAccessibleDescription('Only billing owners can change the plan.');
		await pauseClock(page);
		await request.focus();
		await press(page, 'Enter');
		await expect(request).toHaveAttribute('aria-busy', 'true');
		await expect(ok.getByRole('status')).toHaveText('Sending request…');
		await page.clock.runFor(SETTLE);
		await expect(ok.getByRole('status')).toHaveText('Request sent');
		await expect(ok.getByText('Request sent', { exact: true }).first()).toBeVisible();
		await expect(section.getByTestId('lock-requests')).toHaveText('1');

		const fail = section.getByTestId('lock-request-fail');
		await fail.getByRole('button', { name: 'Ask for an upgrade' }).click();
		await page.clock.runFor(SETTLE);
		await expect(fail.getByRole('alert')).toHaveText("Couldn't send the request. Try again.");
		await expect(fail.getByRole('button', { name: 'Ask for an upgrade' })).toBeVisible();
	});

	test('the hidden variant is screen-reader text without buttons; links work without JavaScript', async ({ page, browser, baseURL }) => {
		const section = await openSection(page, 'lock-reason');
		const hidden = section.getByTestId('lock-hidden');
		await expect(hidden).toHaveClass(/sr-only/);
		await expect(hidden.locator('#hidden-reason')).toHaveText('Archived teams are read-only.');
		await expect(hidden.getByRole('button')).toHaveCount(0);
		const { page: noJs, close } = await noJsPage(browser, baseURL);
		await expect(noJs.locator('#lock-reason').getByRole('link', { name: 'Open billing portal' })).toHaveAttribute('href', '?page=billing-portal');
		await close();
	});
});

/** Answers a native post with a stub page, so the test can read what was posted. */
async function stubPosts(page: Page, pathname: string): Promise<void> {
	await page.route(
		(url) => url.pathname === pathname,
		(route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' })
	);
}

test.describe('Actions and failures', () => {
	test("a row action's returned error and a rejection both show in the row's alert, and nothing is left unhandled", async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const section = await openOnClock(page, 'settings-row');
		const row = section.getByTestId('row-codes');
		await pauseClock(page);
		const regenerate = row.getByRole('button', { name: 'Regenerate' });
		await regenerate.focus();
		await press(page, 'Enter');
		await expect(regenerate).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(row.getByRole('alert')).toHaveText("Couldn't make new codes. Your old ones still work.");
		await expect(regenerate).toBeFocused();

		const more = row.getByRole('button', { name: 'More actions' });
		await more.focus();
		await press(page, 'Enter');
		await expect(page.getByRole('menuitem')).toHaveText(['Email them to me', 'Mark as printed']);
		await page.getByRole('menuitem', { name: 'Email them to me' }).click();
		await page.clock.runFor(SETTLE);
		await expect(row.getByRole('alert')).toHaveText("Couldn't do that. Try again.");
		await expect(row).not.toContainText('mail service down');

		await more.click();
		await page.getByRole('menuitem', { name: 'Mark as printed' }).click();
		await expect(section.getByTestId('row-printed')).toHaveText('1');
		await expect(row.getByRole('alert')).toHaveText('');
		expect(errors).toEqual([]);
	});

	test("a fact's action loads, shows its returned error, then succeeds", async ({ page }) => {
		const section = await openOnClock(page, 'settings-facts');
		const fact = section.getByTestId('facts-connection').locator('[data-fact=synced]');
		const sync = fact.getByRole('button', { name: 'Sync now' });
		await pauseClock(page);
		await sync.focus();
		await press(page, 'Enter');
		await expect(sync).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(fact.getByRole('alert')).toHaveText("Couldn't reach the shared drive. Try again in a minute.");
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(fact.getByRole('alert')).toHaveCount(0);
	});

	test('a refused copy selects the exact text to copy, not a shortened value', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true });
			document.execCommand = () => false;
		});
		const section = await openSection(page, 'settings-facts');
		const version = section.getByTestId('facts-version');
		const selection = () => page.evaluate(() => window.getSelection()?.toString().trim());
		await version.getByRole('button', { name: 'Copy Commit' }).press('Enter');
		await expect(version.locator('[data-fact=commit]').getByRole('alert')).toBeVisible();
		await expect.poll(selection).toBe('7f3a91c2e8d04b6a5c13');
		await page.setViewportSize({ width: 375, height: 800 });
		await version.getByRole('button', { name: 'Copy Build' }).press('Enter');
		await expect(version.locator('[data-fact=build]').getByRole('alert')).toBeVisible();
		await expect(version.getByRole('alert')).toHaveCount(1);
		await expect.poll(selection).toBe('2026.11.09-7f3a91c');
	});
});

test.describe('Focus and hydration', () => {
	test('a switch flipped before the page is interactive is committed once it is', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		let release: () => void = () => undefined;
		const held = new Promise<void>((resolve) => (release = resolve));
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			await held;
			await route.continue();
		});
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const box = page.getByTestId('toggle-nojs');
		const motion = box.getByRole('switch', { name: 'Reduce motion' });
		await expect(motion).toBeChecked();
		await motion.click();
		await expect(motion).not.toBeChecked();
		release();
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		await expect(motion).not.toBeChecked();
		// Only a saved value reaches the bound prop, so this proves onCommit ran.
		await expect(page.getByTestId('toggle-motion-bound')).toHaveText('off');
		await expect(box.getByRole('button', { name: 'Apply' })).toHaveCount(1);
	});

	test('a state the browser restores on Back is not committed; the switch shows the saved value', async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		const motion = section.getByTestId('toggle-nojs').getByRole('switch', { name: 'Reduce motion' });
		await expect(motion).toHaveAttribute('autocomplete', 'off');
		await motion.click();
		await expect(page.getByTestId('toggle-motion-bound')).toHaveText('off');
		await page.goto('/?away=1');
		await page.goBack();
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		// The server renders it on; nothing was flipped on this page, so nothing is saved.
		await expect(motion).toBeChecked();
		await expect(rowOf(motion).getByRole('status')).toHaveText('');
		await expect(page.getByTestId('toggle-motion-bound')).toHaveText('on');
	});

	test('a staged switch keeps its unsaved edit on Back, like every other control in the form', async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		const form = section.getByTestId('toggle-staged-form');
		const publicLinks = form.getByRole('switch', { name: 'Public links' });
		const invites = form.getByRole('switch', { name: 'Invite people outside the team' });
		await publicLinks.click();
		await invites.click();
		await expect(form.getByTestId('toggle-staged-status')).toHaveText('2 unsaved');
		await page.goto('/?away=3');
		await page.goBack();
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		await expect(publicLinks).not.toBeChecked();
		await expect(invites).toBeChecked();
		await expect(form.getByTestId('toggle-staged-status')).toHaveText('2 unsaved');
		await expect(form.getByRole('switch', { name: 'Allow downloads' })).toBeChecked();
	});

	test('a switch changed before hydration by a script, not a person, is put back and not committed', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		let release: () => void = () => undefined;
		const held = new Promise<void>((resolve) => (release = resolve));
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			await held;
			await route.continue();
		});
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const motion = page.getByTestId('toggle-nojs').getByRole('switch', { name: 'Reduce motion' });
		await motion.evaluate((node: HTMLInputElement) => (node.checked = false));
		release();
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		await expect(motion).toBeChecked();
		await expect(rowOf(motion).getByRole('status')).toHaveText('');
		await expect(page.getByTestId('toggle-motion-bound')).toHaveText('on');
	});

	test('Undo and Retry hand focus to their switch when they leave', async ({ page }) => {
		const section = await openOnClock(page, 'settings-toggle');
		const instant = section.getByTestId('toggle-instant');
		const compact = instant.getByRole('switch', { name: 'Compact lists' });
		await pauseClock(page);
		await compact.focus();
		await press(page, 'Space');
		await page.clock.runFor(SETTLE);
		const undo = rowOf(compact).getByRole('button', { name: 'Undo Compact lists' });
		await undo.focus();
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(undo).toHaveCount(0);
		await expect(compact).not.toBeChecked();
		await expect(compact).toBeFocused();

		const sounds = instant.getByRole('switch', { name: 'Play sounds' });
		await sounds.focus();
		await press(page, 'Space');
		await page.clock.runFor(SETTLE);
		const retry = rowOf(sounds).getByRole('button', { name: 'Retry Play sounds' });
		await retry.focus();
		await press(page, 'Enter');
		await expect(retry).toHaveCount(0);
		await expect(sounds).toBeFocused();
		await page.clock.runFor(SETTLE);
		await expect(sounds).toBeChecked();
		await expect(sounds).toBeFocused();
	});

	test('after Request access is sent, focus moves to the sent line', async ({ page }) => {
		const section = await openOnClock(page, 'lock-reason');
		const ok = section.getByTestId('lock-request-ok');
		await pauseClock(page);
		await ok.getByRole('button', { name: 'Request access' }).focus();
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(ok.getByRole('button', { name: 'Request access' })).toHaveCount(0);
		const sent = ok.locator('[tabindex="-1"]');
		await expect(sent).toHaveText('Request sent');
		await expect(sent).toBeFocused();
		// Reached by keyboard, it shows where focus went.
		await expect(sent).toHaveCSS('outline-style', 'solid');
	});

	test("with a handler, a submit of the toggle's own form is not posted", async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		await stubPosts(page, '/settings-demo/motion');
		const form = section.getByTestId('toggle-nojs').locator('form').first();
		const prevented = await form.evaluate((node: HTMLFormElement) => {
			let seen = false;
			node.addEventListener('submit', (event) => (seen = event.defaultPrevented), { once: true });
			node.requestSubmit();
			return seen;
		});
		expect(prevented).toBe(true);
	});

	test('a section lock with a badge keeps one disabled switch for assistive technology', async ({ page }) => {
		const section = await openSection(page, 'settings-toggle');
		const box = section.getByTestId('toggle-section-lock');
		const two = box.getByRole('switch', { name: 'Two-step sign-in' });
		await expect(two).toHaveCount(1);
		await expect(two).toBeDisabled();
		await expect(two).toBeChecked();
		await expect(two).toHaveAccessibleDescription(/A code from your phone.*Managed by an administrator\./);
		await expect(box.getByText('Always on')).toBeVisible();
	});
});

test.describe('Group rows', () => {
	test('a group row is one group named by its label; a RadioGroup inside is not named a second time', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const box = section.getByTestId('section-group');
		const group = box.getByRole('group', { name: 'Density' });
		await expect(group).toHaveAccessibleDescription('How much space lists leave between rows.');
		const radios = group.getByRole('radiogroup');
		await expect(radios).toHaveCount(1);
		await expect(radios).toHaveAccessibleName('');
		const comfortable = group.getByRole('radio', { name: 'Comfortable' });
		await expect(comfortable).toBeChecked();
		await comfortable.focus();
		await press(page, 'ArrowRight');
		await expect(group.getByRole('radio', { name: 'Spacious' })).toBeChecked();
	});

	test('under a badge lock a group row shows its controls disabled, never an invisible tab stop', async ({ page }) => {
		const section = await openSection(page, 'settings-section');
		const box = section.getByTestId('section-managed');
		const group = box.getByRole('group', { name: 'Session length' });
		await expect(group).toHaveAccessibleDescription(/How long you stay signed in.*Managed by an administrator\./);
		const radio = group.getByRole('radio', { name: '8 hours' });
		await expect(radio).toBeDisabled();
		expect((await group.boundingBox())?.width ?? 0).toBeGreaterThan(100);
		// The single switch still hides behind the badge, disabled, so it takes no focus either.
		const remember = box.getByRole('switch', { name: 'Remember this device' });
		await expect(remember).toBeDisabled();
		expect(await clippedAway(remember)).toBe(true);
		await expect(box.getByText('Set by IT')).toHaveCount(3);
		const stops = box.locator('a[href], button, input:not([type=hidden]), select, textarea, [tabindex]');
		const hiddenStops: string[] = [];
		for (const stop of await stops.all()) {
			const focusable = await stop.evaluate((el: HTMLElement) => el.tabIndex >= 0 && !(el as HTMLInputElement).disabled);
			if (focusable && (await clippedAway(stop))) hiddenStops.push(await stop.evaluate((el) => el.outerHTML.slice(0, 80)));
		}
		expect(hiddenStops).toEqual([]);
	});

	test('a link control (labelFor false) has a plain-text label, takes the description, and no label points at a missing id', async ({ page, browser, baseURL }) => {
		const check = async (scope: Page) => {
			const link = scope.getByTestId('section-managed').getByRole('link', { name: 'See the list of authenticator apps' });
			await expect(link).toHaveAccessibleDescription(/^Only these apps can give sign-in codes\./);
			const row = rowOf(link);
			await expect(row.locator('label')).toHaveCount(0);
			await expect(row.getByText('Authenticator apps', { exact: true })).toBeVisible();
			const dangling = await scope.locator('#settings-section label[for]').evaluateAll((labels) =>
				labels.filter((l) => !document.getElementById((l as HTMLLabelElement).htmlFor)).map((l) => l.textContent)
			);
			expect(dangling).toEqual([]);
		};
		await openSection(page, 'settings-section');
		await check(page);
		const noJs = await noJsPage(browser, baseURL);
		try {
			await check(noJs.page);
		} finally {
			await noJs.close();
		}
	});

	test('under a badge lock a control that stays focusable (a link) is shown beside the badge, with and without JavaScript', async ({ page, browser, baseURL }) => {
		const linkStaysVisible = async (scope: Page) => {
			const link = scope.getByTestId('section-managed').getByRole('link', { name: 'See the list of authenticator apps' });
			await expect(link).toBeVisible();
			expect(await clippedAway(link)).toBe(false);
			await expect(rowOf(link).getByText('Set by IT')).toBeVisible();
			// The visible badge is announced too, not only drawn.
			expect(await rowOf(link).ariaSnapshot()).toContain('Set by IT');
		};
		await openSection(page, 'settings-section');
		await linkStaysVisible(page);
		const noJs = await noJsPage(browser, baseURL);
		try {
			await linkStaysVisible(noJs.page);
		} finally {
			await noJs.close();
		}
	});
});

test.describe('RequestedChange in a form', () => {
	test('Cancel is ignored while Send again is in flight', async ({ page }) => {
		const section = await openOnClock(page, 'requested-change');
		const row = section.getByTestId('requested-awaiting');
		await pauseClock(page);
		await row.getByRole('button', { name: 'Send again for Parallel runs' }).click();
		await row.getByRole('button', { name: 'Cancel request for Parallel runs' }).click();
		await expect(row.getByRole('status')).toHaveText('Sending the request again…');
		await page.clock.runFor(SETTLE);
		await expect(row.getByRole('status')).toHaveText('Request sent again.');
		await expect(section.getByTestId('requested-cancels')).toHaveText('0');
		await expect(section.getByTestId('requested-resends')).toHaveText('1');
	});

	test('inside a staged form without JavaScript, Send again posts to its action with the request id in the query', async ({ browser, baseURL }) => {
		const { page, close } = await noJsPage(browser, baseURL);
		await stubPosts(page, '/settings-demo/requests');
		const request = page.waitForRequest((r) => new URL(r.url()).pathname === '/settings-demo/requests' && r.method() === 'POST');
		await page.getByTestId('row-owner-request').getByRole('button', { name: 'Send again for Team owner' }).click();
		const sent = await request;
		expect(new URL(sent.url()).search).toBe('?request=rq_2207');
		expect(sent.postData()).toContain('intent=resend');
		await close();
	});

	test('inside a staged form with JavaScript, Send again posts its intent alone, with the request id in the query as without JavaScript', async ({ page }) => {
		const section = await openSection(page, 'settings-row');
		await stubPosts(page, '/settings-demo/requests');
		const request = page.waitForRequest((r) => new URL(r.url()).pathname === '/settings-demo/requests' && r.method() === 'POST');
		await section.getByTestId('row-owner-request').getByRole('button', { name: 'Send again for Team owner' }).click();
		const sent = await request;
		expect(new URL(sent.url()).search).toBe('?request=rq_2207');
		expect(sent.postData()).toBe('intent=resend');
	});
});
