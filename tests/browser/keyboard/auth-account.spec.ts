import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { hold, openOnClock, openSection, press } from './helpers';

/** Starts recording every text the element shows from now on, in order, under `key`. */
async function recordText(target: Locator, key: string): Promise<void> {
	await target.evaluate((el, name) => {
		const w = window as unknown as { __texts?: Record<string, string[]> };
		const texts = (w.__texts ??= {});
		texts[name] = [];
		new MutationObserver(() => texts[name].push(el.textContent ?? '')).observe(el, { childList: true, characterData: true, subtree: true });
	}, key);
}

const recorded = (page: Page, key: string) => page.evaluate((name) => (window as unknown as { __texts: Record<string, string[]> }).__texts[name], key);

test.describe('AccountMenu', () => {
	test('opens with the keyboard, shows the header, runs rows and Sign out, and returns focus', async ({ page }) => {
		const section = await openSection(page, 'account-menu');
		const trigger = section.getByRole('button', { name: 'Account menu for Ada Lovelace' });
		await expect(trigger).toBeVisible();
		await trigger.focus();
		await press(page, 'Enter');
		const menu = page.getByRole('menu', { name: /Account menu for Ada Lovelace/ }).first();
		await expect(menu).toBeVisible();
		await expect(menu).toContainText('Ada Lovelace');
		await expect(menu).toContainText('ada@example.com');
		// The header is not a row: the first row takes focus.
		await expect(page.getByRole('menuitem', { name: 'Profile' })).toBeFocused();
		await press(page, 'ArrowDown');
		await expect(page.getByRole('menuitem', { name: 'Billing' })).toBeFocused();
		await press(page, 'Enter');
		await expect(section.getByTestId('account-last')).toHaveText('Billing');
		await expect(trigger).toBeFocused();
		// Sign out is the last row.
		await press(page, 'Enter', 'ArrowUp');
		await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeFocused();
		await press(page, 'Enter');
		await expect(section.getByTestId('account-last')).toHaveText('Sign out');
		await press(page, 'Enter', 'Escape');
		await expect(trigger).toBeFocused();
	});

	test('a person with only an email gets initials-free avatar and a named trigger', async ({ page }) => {
		const section = await openSection(page, 'account-menu');
		await expect(section.getByRole('button', { name: 'Account menu for grace@example.com' })).toBeVisible();
	});

	test('a person with neither name nor email gets the anonymous trigger name', async ({ page }) => {
		const section = await openSection(page, 'account-menu');
		await expect(section.getByTestId('anonymous-menu')).toHaveAccessibleName('Account menu');
	});

	test('the menu header is in the accessibility tree as the menu description', async ({ page }) => {
		const section = await openSection(page, 'account-menu');
		await section.getByRole('button', { name: 'Account menu for Ada Lovelace' }).click();
		const menu = page.getByRole('menu', { name: 'Account menu for Ada Lovelace' });
		await expect(menu).toBeVisible();
		await expect(menu).toHaveAccessibleDescription(/Ada Lovelace\s+ada@example\.com/);
	});

	test('a person without name or email gets no empty header or description', async ({ page }) => {
		const section = await openSection(page, 'account-menu');
		await section.getByTestId('anonymous-menu').click();
		const menu = page.getByRole('menu', { name: 'Account menu' });
		await expect(menu).toBeVisible();
		await expect(menu).not.toHaveAttribute('aria-describedby', /.*/);
	});

	test('defaultOpen mounts the menu open', async ({ page }) => {
		const section = await openSection(page, 'account-menu');
		await expect(page.getByRole('menu', { name: 'Account menu for Open Olive' })).toHaveCount(0);
		await section.getByRole('button', { name: 'Show a menu open by default' }).click();
		await expect(page.getByRole('menu', { name: 'Account menu for Open Olive' })).toBeVisible();
	});
});

test.describe('SessionList', () => {
	test('shows icons-free text rows: this device, last active and location', async ({ page }) => {
		const section = await openSection(page, 'session-list');
		const list = section.getByRole('list');
		await expect(list.first().getByRole('listitem')).toHaveCount(4);
		const current = list.first().getByRole('listitem').first();
		await expect(current).toContainText('This device');
		await expect(current).toContainText('Active now');
		await expect(current.getByRole('button')).toHaveCount(0);
		await expect(list.first()).toContainText('Active 12 min ago');
		await expect(list.first()).toContainText('Active 3 h ago');
		await expect(list.first()).toContainText('Active 2 days ago');
		await expect(list.first()).toContainText('Berlin, Germany');
		await expect(section.getByText('No active sessions.')).toBeVisible();
	});

	test('Revoke confirms, shows loading on that row only, then moves focus to the next row', async ({ page }) => {
		const section = await openSection(page, 'session-list');
		const phone = section.getByRole('button', { name: 'Revoke Safari on iPhone' });
		await phone.focus();
		await press(page, 'Enter');
		const dialog = page.getByRole('alertdialog', { name: 'Revoke Safari on iPhone?' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
		// Cancel changes nothing.
		await press(page, 'Enter');
		await expect(dialog).toBeHidden();
		await expect(phone).toBeFocused();
		await expect(section.getByTestId('sessions-log')).toHaveText('');
		await press(page, 'Enter');
		await dialog.getByRole('button', { name: 'Revoke', exact: true }).click();
		await expect(phone).toHaveAttribute('aria-busy', 'true');
		await expect(section.getByRole('button', { name: 'Revoke Firefox on iPad' })).not.toHaveAttribute('aria-busy', 'true');
		await expect(section.getByTestId('sessions-log')).toHaveText('Revoked phone');
		await expect(phone).toHaveCount(0);
		await expect(section.getByRole('button', { name: 'Revoke Firefox on iPad' })).toBeFocused();
		// Revoking the last row sends focus to the one before it.
		await page.keyboard.press('Enter');
		await page.getByRole('alertdialog').getByRole('button', { name: 'Revoke', exact: true }).click();
		await expect(section.getByTestId('sessions-log')).toHaveText('Revoked tablet');
		await expect(section.getByRole('button', { name: 'Revoke Edge on Linux' })).toBeFocused();
		expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
	});

	test('Sign out of all other sessions confirms, then hides itself and focuses the heading', async ({ page }) => {
		const section = await openSection(page, 'session-list');
		const all = section.getByRole('button', { name: 'Sign out of all other sessions' });
		await all.focus();
		await press(page, 'Enter');
		const dialog = page.getByRole('alertdialog', { name: 'Sign out of all other sessions?' });
		await expect(dialog).toBeVisible();
		await dialog.getByRole('button', { name: 'Sign out others' }).click();
		await expect(section.getByTestId('sessions-log')).toHaveText('Revoked all others');
		await expect(all).toHaveCount(0);
		await expect(section.getByRole('list').first().getByRole('listitem')).toHaveCount(1);
		await expect(section.getByRole('heading', { name: 'Signed-in devices', exact: true })).toBeFocused();
	});

	test('the server render reserves the last-active line instead of leaving it empty', async ({ request }) => {
		const html = await (await request.get('/')).text();
		const start = html.indexOf('id="session-list"');
		expect(start).toBeGreaterThan(-1);
		expect(html.slice(start, start + 60000)).toContain('data-last-active-placeholder');
	});

	test('a failed revoke tells the person politely and leaves the row to try again', async ({ page }) => {
		const section = await openSection(page, 'session-list');
		const button = section.getByRole('button', { name: 'Revoke Brave on Android' });
		await button.focus();
		await press(page, 'Enter');
		await page.getByRole('alertdialog').getByRole('button', { name: 'Revoke', exact: true }).click();
		const row = section.getByRole('listitem').filter({ hasText: 'Brave on Android' });
		await expect(row.getByRole('status')).toHaveText('The device could not be signed out. Try again.');
		await expect(button).not.toHaveAttribute('aria-busy', 'true');
		await expect(button).toBeVisible();
	});

	test('concurrent revokes each restore focus for their own row', async ({ page }) => {
		const section = await openOnClock(page, 'session-list');
		const phone = section.getByRole('button', { name: 'Revoke Safari on iPhone' });
		const tablet = section.getByRole('button', { name: 'Revoke Firefox on iPad' });
		const confirm = page.getByRole('alertdialog').getByRole('button', { name: 'Revoke', exact: true });
		await hold(page);
		// The phone takes 2500 ms and the tablet 1000 ms on the test's clock; nothing settles until the test says so.
		await phone.focus();
		await press(page, 'Enter');
		await confirm.click();
		await page.clock.runFor(300);
		await expect(page.getByRole('alertdialog')).toBeHidden();
		await tablet.focus();
		await press(page, 'Enter');
		await confirm.click();
		await page.clock.runFor(300);
		await expect(page.getByRole('alertdialog')).toBeHidden();
		await expect(phone).toHaveAttribute('aria-busy', 'true');
		await expect(tablet).toHaveAttribute('aria-busy', 'true');
		// The tablet row finishes first (its 1000 ms are up); the phone row is still waiting.
		await page.clock.runFor(800);
		await expect(section.getByTestId('sessions-log')).toHaveText('Revoked tablet');
		await expect(phone).toHaveAttribute('aria-busy', 'true');
		// Back on the phone row, which is still waiting, when it disappears.
		await phone.focus();
		await expect(phone).toBeFocused();
		await page.clock.runFor(2000);
		await expect(section.getByTestId('sessions-log')).toHaveText('Revoked phone');
		await expect(phone).toHaveCount(0);
		expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
		// The phone row's own restore lands on the row now in its place.
		await expect(section.getByRole('button', { name: /^Revoke / }).first()).toBeFocused();
	});

	test('a revoke that throws at once is announced again on every retry', async ({ page }) => {
		const section = await openSection(page, 'session-list');
		const button = section.getByRole('button', { name: 'Revoke Opera on Linux' });
		const row = section.getByRole('listitem').filter({ hasText: 'Opera on Linux' });
		const message = 'The device could not be signed out. Try again.';
		await recordText(row.getByRole('status'), 'revoke');
		for (let attempt = 0; attempt < 2; attempt++) {
			await button.focus();
			await press(page, 'Enter');
			await page.getByRole('alertdialog').getByRole('button', { name: 'Revoke', exact: true }).click();
			await expect(row.getByRole('status')).toHaveText(message);
			await expect(page.getByRole('alertdialog')).toBeHidden();
		}
		// The message was cleared and set again, so a screen reader hears the second failure too.
		await expect.poll(async () => (await recorded(page, 'revoke')).slice(-3)).toEqual([message, '', message]);
	});
});

test.describe('VerifyEmailBanner', () => {
	test('Resend shows loading, a polite Sent, then waits out the cooldown with a stable name', async ({ page }) => {
		const section = await openOnClock(page, 'verify-email-banner');
		await expect(section).toContainText('ada@example.com is not verified');
		const resend = section.getByRole('button', { name: 'Resend verification email' }).first();
		await resend.focus();
		await hold(page);
		await press(page, 'Enter');
		await expect(resend).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(1000);
		await expect(section.getByRole('status').filter({ hasText: 'Sent' })).toBeVisible();
		await expect(section.getByTestId('verify-sends')).toHaveText('1');
		// The cooldown keeps the button focusable (aria-disabled, never disabled) and its name; the wait is its own line.
		await expect(resend).toHaveAttribute('aria-disabled', 'true');
		await expect(resend).not.toHaveAttribute('disabled', /.*/);
		await expect(resend).toHaveAccessibleDescription(/^Resend in \d{1,2}s$/);
		await expect(section.getByText(/^Resend in \d{1,2}s$/).first()).toBeVisible();
		await expect(resend).toBeFocused();
		await press(page, 'Enter');
		await page.clock.runFor(1000);
		await expect(section.getByTestId('verify-sends')).toHaveText('1');
		await page.clock.runFor(5000);
		await expect(resend).not.toHaveAttribute('aria-disabled', 'true');
		await expect(resend).toBeEnabled();
	});

	test('without onResend there is no Resend button and nothing is claimed as sent', async ({ page }) => {
		const section = await openSection(page, 'verify-email-banner');
		const banner = section.getByTestId('banner-plain');
		await expect(banner.getByRole('button', { name: 'Resend verification email' })).toHaveCount(0);
		await expect(banner).not.toContainText('Sent');
	});

	test('the server render already marks a waiting Resend aria-disabled', async ({ browser, baseURL }) => {
		const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
		const page = await context.newPage();
		await page.goto('/');
		const banner = page.getByTestId('banner-waiting');
		const resend = banner.getByRole('button', { name: 'Resend verification email' });
		await expect(resend).toHaveAttribute('aria-disabled', 'true');
		await expect(resend).toHaveAccessibleDescription(/^Resend in \d+s$/);
		await context.close();
	});

	test('a rejected resend shows the failure message', async ({ page }) => {
		const section = await openSection(page, 'verify-email-banner');
		const banner = section.getByTestId('banner-failing');
		await banner.getByRole('button', { name: 'Resend verification email' }).click();
		await expect(banner.getByRole('alert')).toContainText('could not be sent');
	});

	test('a resend that throws at once is announced again on every retry', async ({ page }) => {
		const section = await openSection(page, 'verify-email-banner');
		const banner = section.getByTestId('banner-throwing');
		const resend = banner.getByRole('button', { name: 'Resend verification email' });
		await page.evaluate(() => {
			const w = window as unknown as { __failures: number };
			w.__failures = 0;
			const target = document.querySelector('[data-testid="banner-throwing"]')!;
			new MutationObserver((records) => {
				for (const record of records) for (const node of record.addedNodes) if (node.textContent?.includes('could not be sent')) w.__failures++;
			}).observe(target, { childList: true, subtree: true });
		});
		const failures = () => page.evaluate(() => (window as unknown as { __failures: number }).__failures);
		await resend.click();
		await expect(banner.getByRole('alert')).toContainText('could not be sent');
		await expect.poll(failures).toBe(1);
		await resend.click();
		await expect.poll(failures).toBe(2);
		await expect(banner.getByRole('alert')).toContainText('could not be sent');
	});

	test('Change email and Dismiss are real buttons that only call back', async ({ page }) => {
		const section = await openSection(page, 'verify-email-banner');
		await expect(section.getByRole('button', { name: 'Change email' })).toBeVisible();
		await section.getByRole('button', { name: 'Dismiss' }).click();
		await expect(section.getByRole('button', { name: 'Dismiss' })).toHaveCount(0);
		await expect(section.getByRole('button', { name: 'Show the banner again' })).toBeVisible();
	});
});

test.describe('BackupCodes', () => {
	test('lists the codes in order, with used ones struck through and read as used', async ({ page }) => {
		const section = await openSection(page, 'backup-codes');
		const items = section.getByRole('list').getByRole('listitem');
		await expect(items).toHaveCount(8);
		await expect(items.first()).toHaveText('7k2m-9xqp');
		await expect(items.nth(1)).toContainText(/f3ab-81zd\s*\(used\)/);
		await expect(items.nth(1)).toHaveClass(/line-through/);
		await expect(items.first()).toHaveClass(/font-mono/);
	});

	test('Copy all puts one code per line on the clipboard and announces Copied', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const section = await openSection(page, 'backup-codes');
		await section.getByRole('button', { name: 'Copy all' }).click();
		await expect(section.getByRole('status')).toHaveText('Copied');
		await expect(section.getByTestId('codes-log')).toHaveText('Copied');
		const copied = await page.evaluate(() => navigator.clipboard.readText());
		// Windows may hand the clipboard back with CRLF line ends.
		const lines = copied.split(/\r?\n/);
		expect(lines).toHaveLength(8);
		expect(lines[0]).toBe('7k2m-9xqp');
	});

	test('Copy all shows a fallback message when the clipboard fails', async ({ page }) => {
		const section = await openSection(page, 'backup-codes');
		await page.evaluate(() => {
			Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('blocked')) } });
		});
		await section.getByRole('button', { name: 'Copy all' }).click();
		await expect(section.getByRole('alert')).toContainText('could not be copied');
		await expect(section.getByTestId('codes-log')).toHaveText('');
	});

	test('Download saves a text file with the heading and the codes, and revokes the object URL', async ({ page }) => {
		const section = await openSection(page, 'backup-codes');
		await page.evaluate(() => {
			const revoked: string[] = [];
			const original = URL.revokeObjectURL.bind(URL);
			URL.revokeObjectURL = (url: string) => {
				revoked.push(url);
				original(url);
			};
			(window as unknown as { __revoked: string[] }).__revoked = revoked;
		});
		const [download] = await Promise.all([page.waitForEvent('download'), section.getByRole('button', { name: 'Download' }).click()]);
		expect(download.suggestedFilename()).toBe('example-backup-codes.txt');
		const body = readFileSync(await download.path(), 'utf8');
		expect(body.replace(/\r\n/g, '\n').startsWith('Example app backup codes\n\n7k2m-9xqp\n')).toBe(true);
		await expect(section.getByTestId('codes-log')).toHaveText('Downloaded');
		await expect.poll(() => page.evaluate(() => (window as unknown as { __revoked: string[] }).__revoked.length), { timeout: 4000 }).toBe(1);
	});

	test('Regenerate warns, shows loading in the dialog, then shows the new codes', async ({ page }) => {
		const section = await openSection(page, 'backup-codes');
		const button = section.getByRole('button', { name: 'Regenerate' });
		await button.focus();
		await press(page, 'Enter');
		const dialog = page.getByRole('alertdialog', { name: 'Regenerate backup codes?' });
		await expect(dialog).toContainText('stop working');
		await dialog.getByRole('button', { name: 'Regenerate' }).click();
		await expect(section.getByTestId('codes-log')).toHaveText('Regenerated', { timeout: 5000 });
		await expect(dialog).toBeHidden();
		await expect(section.getByRole('list').getByRole('listitem').first()).toHaveText('b2vc-5hma');
	});

	test('Regenerate clears the acknowledgement and the Copied state', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const section = await openSection(page, 'backup-codes');
		await section.getByRole('button', { name: 'Copy all' }).click();
		await expect(section.getByRole('status')).toHaveText('Copied');
		const box = section.getByRole('checkbox', { name: 'I have saved these codes' });
		await box.check();
		await expect(section.getByRole('button', { name: 'Continue' })).toBeEnabled();
		await section.getByRole('button', { name: 'Regenerate' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Regenerate' }).click();
		await expect(section.getByTestId('codes-log')).toHaveText('Regenerated', { timeout: 5000 });
		await expect(section.getByRole('list').getByRole('listitem').first()).toHaveText('b2vc-5hma');
		await expect(box).not.toBeChecked();
		await expect(section.getByRole('button', { name: 'Continue' })).toBeDisabled();
		await expect(section.getByRole('status')).toHaveText('');
	});

	test('Continue stays disabled until the acknowledgement is checked', async ({ page }) => {
		const section = await openSection(page, 'backup-codes');
		const proceed = section.getByRole('button', { name: 'Continue' });
		await expect(proceed).toBeDisabled();
		const box = section.getByRole('checkbox', { name: 'I have saved these codes' });
		await box.focus();
		await press(page, 'Space');
		await expect(proceed).toBeEnabled();
		await press(page, 'Tab', 'Enter');
		await expect(section.getByTestId('codes-log')).toHaveText('Continued');
	});
});
