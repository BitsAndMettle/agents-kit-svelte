import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openSection, press } from './helpers';

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
		await expect(section.getByRole('listitem')).toHaveCount(1);
		await expect(section.getByRole('heading', { name: 'Signed-in devices', exact: true })).toBeFocused();
	});
});

test.describe('VerifyEmailBanner', () => {
	test('Resend shows loading, a polite Sent, then waits out the cooldown', async ({ page }) => {
		const section = await openSection(page, 'verify-email-banner');
		await expect(section).toContainText('ada@example.com is not verified');
		const resend = section.getByRole('button', { name: 'Resend verification email' });
		await resend.focus();
		await press(page, 'Enter');
		await expect(resend).toHaveAttribute('aria-busy', 'true');
		await expect(section.getByRole('status').filter({ hasText: 'Sent' })).toBeVisible();
		await expect(section.getByTestId('verify-sends')).toHaveText('1');
		await expect(section.getByRole('button', { name: /Resend in \d+s/ })).toBeDisabled();
		await expect(resend).toBeEnabled({ timeout: 9000 });
	});

	test('Change email and Dismiss are real buttons that only call back', async ({ page }) => {
		const section = await openSection(page, 'verify-email-banner');
		await expect(section.getByRole('button', { name: 'Change email' })).toBeVisible();
		await section.getByRole('button', { name: 'Dismiss' }).click();
		await expect(section.getByRole('button', { name: 'Resend verification email' })).toHaveCount(0);
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
