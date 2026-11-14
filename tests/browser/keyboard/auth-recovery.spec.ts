import { expect, test, type Locator, type Page } from '@playwright/test';
import { hold, openOnClock, openSection, press } from './helpers';

/** Answers the demo's native post, so a form with no handler can be seen leaving without a real server. */
async function stubNativePost(page: Page): Promise<void> {
	await page.route('**/demo-native-post', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
}

const alertText = (section: Locator) => section.getByRole('alert').filter({ hasText: /\S/ });

test.describe('ForgotPasswordCard', () => {
	test('with no handler the form posts natively to its action, as a post with the email', async ({ page }) => {
		await stubNativePost(page);
		const section = await openSection(page, 'forgot-password-card');
		await section.getByLabel('Post natively (no handler)').check();
		const form = section.locator('form');
		await expect(form).toHaveAttribute('method', 'post');
		await expect(form).toHaveAttribute('action', '/demo-native-post');
		await expect(section.locator('input[name=email]')).toHaveAttribute('autocomplete', 'email');
		await section.locator('input[name=email]').fill('ada@example.com');
		const request = page.waitForRequest('**/demo-native-post');
		await press(page, 'Enter');
		const sent = await request;
		expect(sent.method()).toBe('POST');
		expect(sent.postData()).toContain('email=ada%40example.com');
	});

	test('a pending submit shows loading and ignores a second submit, then shows the safe confirmation and focuses its heading', async ({ page }) => {
		const section = await openOnClock(page, 'forgot-password-card');
		await section.locator('input[name=email]').fill('ada@example.com');
		await hold(page);
		const submit = section.getByRole('button', { name: 'Send reset link' });
		await press(page, 'Enter');
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		// The button keeps its name while loading, and a second submit does nothing.
		await submit.click({ force: true });
		await press(page, 'Enter');
		await expect(section.getByTestId('forgot-calls')).toHaveText('1');
		await page.clock.runFor(1000);
		const heading = section.getByRole('heading', { name: 'Check your email' });
		await expect(heading).toBeVisible();
		await expect(section.getByTestId('forgot-calls')).toHaveText('1');
		await expect(heading).toBeFocused();
		// The focused heading is read together with the confirmation.
		await expect(heading).toHaveAccessibleDescription('If an account exists for ada@example.com, we sent a link to reset the password.');
		await expect(section.getByText('If an account exists for ada@example.com, we sent a link to reset the password.')).toBeVisible();
		await expect(section.locator('form')).toHaveCount(0);
	});

	test('a returned field error shows on the email, focus moves to it, and editing clears it', async ({ page }) => {
		const section = await openSection(page, 'forgot-password-card');
		const email = section.locator('input[name=email]');
		await email.fill('nobody@example.com');
		await press(page, 'Enter');
		await expect(section.getByText('That address cannot receive mail.')).toBeVisible();
		await expect(email).toBeFocused();
		await expect(email).toHaveAttribute('aria-invalid', 'true');
		await expect(email).toHaveAccessibleDescription(/That address cannot receive mail/);
		await press(page, 'x');
		await expect(section.getByText('That address cannot receive mail.')).toBeHidden();
		await expect(email).not.toHaveAttribute('aria-invalid', 'true');
	});

	test('a rejected request shows the generic error, never the thrown message, and keeps the form', async ({ page }) => {
		const section = await openSection(page, 'forgot-password-card');
		await section.locator('input[name=email]').fill('fail@example.com');
		await press(page, 'Enter');
		const error = alertText(section);
		await expect(error).toHaveText(/Something went wrong\. Please try again\./);
		await expect(error).toBeFocused();
		await expect(section.getByText('network down')).toHaveCount(0);
		await expect(section.locator('form')).toHaveCount(1);
		await expect(section.getByRole('button', { name: 'Send reset link' })).not.toHaveAttribute('aria-busy', 'true');
	});

	test('Resend keeps its name and focus through every wait, with a separate countdown line, and announces politely', async ({ page }) => {
		const section = await openOnClock(page, 'forgot-password-card');
		await section.locator('input[name=email]').fill('ada@example.com');
		await hold(page);
		await press(page, 'Enter');
		await page.clock.runFor(1000);
		const resend = section.getByRole('button', { name: 'Resend email' });
		const countdown = section.getByText(/^Resend in \d+s$/);
		// The name never changes; the wait is a visible line the button is described by, and the line is not live.
		await expect(resend).toHaveAttribute('aria-disabled', 'true');
		await expect(resend).not.toHaveAttribute('disabled', /.*/);
		await expect(resend).toHaveAccessibleDescription(/^Resend in \d+s$/);
		await expect(countdown).toBeVisible();
		await expect(countdown).not.toHaveAttribute('aria-live', /.*/);
		await resend.focus();
		await press(page, 'Enter');
		await expect(section.getByTestId('forgot-log')).toHaveText('Requested for ada@example.com');
		await page.clock.runFor(5000);
		await expect(resend).not.toHaveAttribute('aria-disabled', 'true');
		await expect(countdown).toHaveCount(0);
		await resend.focus();
		await press(page, 'Enter');
		await expect(resend).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(1000);
		await expect(section.getByRole('status').filter({ hasText: 'We sent the link again.' })).toBeVisible();
		await expect(section.getByTestId('forgot-log')).toHaveText('Resent');
		// The whole wait after a resend keeps aria-disabled, and focus stays on the button.
		await expect(resend).toHaveAttribute('aria-disabled', 'true');
		await expect(resend).toBeFocused();
		await page.clock.runFor(2000);
		await expect(resend).toHaveAttribute('aria-disabled', 'true');
		await expect(resend).toHaveAccessibleDescription(/^Resend in \d+s$/);
		await press(page, 'Enter');
		await page.clock.runFor(1000);
		await expect(section.getByTestId('forgot-log')).toHaveText('Resent');
		await page.clock.runFor(4000);
		await expect(resend).not.toHaveAttribute('aria-disabled', 'true');
		const back = section.getByRole('link', { name: 'Back to sign in' });
		await expect(back).toHaveAttribute('href', '#forgot-password-card');
		await back.focus();
		await press(page, 'Enter');
		await expect(section.getByTestId('forgot-log')).toHaveText('Back to sign in');
	});
});

test.describe('ResetPasswordCard', () => {
	test('is a post form with a new-password pair, a hidden token and a hidden username, and shows neither', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		await expect(section.locator('form')).toHaveAttribute('method', 'post');
		await expect(section.locator('input[name=password]')).toHaveAttribute('autocomplete', 'new-password');
		await expect(section.locator('input[name=confirmPassword]')).toHaveAttribute('autocomplete', 'new-password');
		await expect(section.locator('input[type=hidden][name=token]')).toHaveValue('demo-token');
		const username = section.locator('input[name=email][autocomplete=username]');
		await expect(username).toHaveValue('ada@example.com');
		await expect(username).toBeHidden();
		await expect(section.getByText('demo-token')).toHaveCount(0);
		await expect(section.getByText('At least 10 characters')).toBeVisible();
	});

	test('with no handler the form posts natively with the token, the username and the password', async ({ page }) => {
		await stubNativePost(page);
		const section = await openSection(page, 'reset-password-card');
		await section.getByLabel('Post natively (no handler)').check();
		await section.locator('input[name=password]').fill('Longenough1');
		await section.locator('input[name=confirmPassword]').fill('Longenough1');
		const request = page.waitForRequest('**/demo-native-post');
		await section.getByRole('button', { name: 'Reset password' }).click();
		const body = (await request).postData() ?? '';
		expect(body).toContain('token=demo-token');
		expect(body).toContain('email=ada%40example.com');
		expect(body).toContain('password=Longenough1');
		expect(body).toContain('confirmPassword=Longenough1');
	});

	test('a mismatched confirmation is blocked by the browser, with its message, and nothing is sent', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		const confirm = section.locator('input[name=confirmPassword]');
		await section.locator('input[name=password]').fill('Longenough1');
		await confirm.fill('Longenough2');
		await expect.poll(() => confirm.evaluate((el: HTMLInputElement) => el.validationMessage)).toBe('The passwords do not match.');
		await section.getByRole('button', { name: 'Reset password' }).click();
		await expect(confirm).toBeFocused();
		await expect(section.getByTestId('reset-log')).toHaveText('');
		await expect(section.getByRole('button', { name: 'Reset password' })).not.toHaveAttribute('aria-busy', 'true');
		await confirm.fill('Longenough1');
		await expect.poll(() => confirm.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true);
	});

	test('the mismatch also shows in place once the browser refuses a submit, and goes when fixed', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		const confirm = section.locator('input[name=confirmPassword]');
		await section.locator('input[name=password]').fill('Longenough1');
		await confirm.fill('Longenough2');
		// Typing alone shows nothing in place; the refused submit does.
		await expect(section.getByText('The passwords do not match.')).toHaveCount(0);
		await expect(confirm).not.toHaveAttribute('aria-invalid', 'true');
		await section.getByRole('button', { name: 'Reset password' }).click();
		await expect(confirm).toBeFocused();
		await expect(section.getByText('The passwords do not match.')).toBeVisible();
		await expect(confirm).toHaveAttribute('aria-invalid', 'true');
		await expect(confirm).toHaveAccessibleDescription(/The passwords do not match/);
		await expect(section.getByTestId('reset-log')).toHaveText('');
		await confirm.fill('Longenough1');
		await expect(section.getByText('The passwords do not match.')).toHaveCount(0);
		await expect(confirm).not.toHaveAttribute('aria-invalid', 'true');
		// A later mismatch waits for another refused submit.
		await confirm.fill('Longenough3');
		await expect(section.getByText('The passwords do not match.')).toHaveCount(0);
	});

	test('onPasswordChange reports every edit, so a strength meter can follow', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		await expect(section.getByText('Password strength: Very weak')).toBeVisible();
		await section.locator('input[name=password]').fill('abcdefghijkl');
		await expect(section.getByText('Password strength: Good')).toBeVisible();
	});

	test('the password building blocks take their words from labels', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		await section.getByLabel('Use German words for the password fields').check();
		await expect(section.getByRole('button', { name: 'Passwort anzeigen' })).toHaveCount(2);
		await expect(section.getByText('Passwortstärke: Sehr schwach')).toBeVisible();
		await section.locator('input[name=password]').fill('abcdefghijkl1');
		await expect(section.getByText('Passwortstärke: Gut')).toBeVisible();
		await expect(section.getByText('Password strength')).toHaveCount(0);
		await expect(section.getByRole('button', { name: 'Show password' })).toHaveCount(0);
	});

	test('pending blocks a second submit; success shows the done state and focuses Continue to sign in', async ({ page }) => {
		const section = await openOnClock(page, 'reset-password-card');
		await section.locator('input[name=password]').fill('Longenough1');
		await section.locator('input[name=confirmPassword]').fill('Longenough1');
		await hold(page);
		const submit = section.getByRole('button', { name: 'Reset password' });
		await press(page, 'Enter');
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await submit.click({ force: true });
		await expect(section.getByRole('heading', { name: 'Password updated' })).toHaveCount(0);
		await page.clock.runFor(1000);
		await expect(section.getByRole('heading', { name: 'Password updated' })).toBeVisible();
		const next = section.getByRole('link', { name: 'Continue to sign in' });
		await expect(next).toBeFocused();
		await expect(next).toHaveAttribute('href', '#reset-password-card');
		await expect(next).toHaveAccessibleDescription(/Password updated.*You can now sign in/);
		await expect(section.locator('form')).toHaveCount(0);
		await press(page, 'Enter');
		await expect(section.getByTestId('reset-log')).toHaveText('Continued to sign in');
	});

	test('a returned field error lands on the password, focus moves to it, and editing clears it', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		const password = section.locator('input[name=password]');
		await password.fill('Password123456');
		await section.locator('input[name=confirmPassword]').fill('Password123456');
		await section.getByRole('button', { name: 'Reset password' }).click();
		await expect(section.getByText('That password is too common.')).toBeVisible();
		await expect(password).toBeFocused();
		await expect(password).toHaveAttribute('aria-invalid', 'true');
		await press(page, 'x');
		await expect(section.getByText('That password is too common.')).toBeHidden();
	});

	test('a rejected request shows the generic error and keeps the form', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		await section.locator('input[name=password]').fill('Failing-0123456');
		await section.locator('input[name=confirmPassword]').fill('Failing-0123456');
		await section.getByRole('button', { name: 'Reset password' }).click();
		await expect(alertText(section)).toHaveText(/Something went wrong\. Please try again\./);
		await expect(alertText(section)).toBeFocused();
		await expect(section.getByText('network down')).toHaveCount(0);
		await expect(section.locator('form')).toHaveCount(1);
	});

	test('an expired link replaces the form with a way to ask for a new one', async ({ page }) => {
		const section = await openSection(page, 'reset-password-card');
		await section.getByLabel('Show the expired-link state').check();
		await expect(section.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
		await expect(section.locator('form')).toHaveCount(0);
		const request = section.getByRole('link', { name: 'Request a new link' });
		await expect(request).toHaveAttribute('href', '#forgot-password-card');
		await request.focus();
		await expect(request).toBeFocused();
	});

	test('a link that expires during a submit shows the expired state, never done, and focuses its heading', async ({ page }) => {
		const section = await openOnClock(page, 'reset-password-card');
		await section.locator('input[name=password]').fill('Expired-0123456');
		await section.locator('input[name=confirmPassword]').fill('Expired-0123456');
		await hold(page);
		await press(page, 'Enter');
		await expect(section.getByRole('button', { name: 'Reset password' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(1000);
		const heading = section.getByRole('heading', { name: 'This link has expired' });
		await expect(heading).toBeVisible();
		await expect(heading).toBeFocused();
		await expect(heading).toHaveAttribute('tabindex', '-1');
		await expect(section.getByRole('heading', { name: 'Password updated' })).toHaveCount(0);
		await expect(section.locator('form')).toHaveCount(0);
		expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
	});
});

test.describe('TwoFactorSetup', () => {
	test('step 1 shows the scan step, the QR from the snippet, and a key disclosure opened with the keyboard', async ({ page }) => {
		const section = await openSection(page, 'two-factor-setup');
		await expect(section.getByRole('heading', { name: 'Set up two-factor authentication', level: 1 })).toBeVisible();
		await expect(section.getByText('Step 1 of 3')).toBeVisible();
		await expect(section.getByRole('heading', { name: 'Scan the QR code', level: 2 })).toBeVisible();
		await expect(section.getByRole('img', { name: 'Sample QR code' })).toBeVisible();
		const key = section.getByText('JBSW Y3DP EHPK 3PXP');
		await expect(key).toBeHidden();
		const summary = section.getByText("Can't scan? Enter this key");
		await summary.focus();
		await press(page, 'Enter');
		await expect(key).toBeVisible();
		await expect(key).toHaveCSS('font-family', /mono/i);
		await expect(section.getByText('Example app', { exact: true })).toBeVisible();
		await expect(section.getByText('ada@example.com')).toBeVisible();
	});

	test('the setup key is named by text before it, not by an aria-label on the code', async ({ page }) => {
		const section = await openSection(page, 'two-factor-setup');
		await section.getByText("Can't scan? Enter this key").click();
		const key = section.locator('code');
		await expect(key).not.toHaveAttribute('aria-label', /.*/);
		await expect(key).toHaveText('JBSW Y3DP EHPK 3PXP');
		await expect(section.locator('details')).toContainText('Setup key: JBSW Y3DP EHPK 3PXP');
	});

	test('Copy key puts the plain key on the clipboard and says Copied politely', async ({ page, context }) => {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
		const section = await openSection(page, 'two-factor-setup');
		await section.getByText("Can't scan? Enter this key").click();
		await section.getByRole('button', { name: 'Copy key' }).click();
		await expect(section.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('JBSWY3DPEHPK3PXP');
	});

	test('Copy key falls back to the older copy command when the clipboard is blocked, and reports a failure', async ({ page }) => {
		await page.addInitScript(() => {
			const w = window as unknown as { __copied: string; __failCopy?: boolean };
			Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) }, configurable: true });
			w.__copied = '';
			document.execCommand = (command: string) => {
				const area = document.querySelector('textarea[readonly][aria-hidden="true"]') as HTMLTextAreaElement | null;
				w.__copied = area?.value ?? '';
				return command === 'copy' && !w.__failCopy;
			};
		});
		const section = await openSection(page, 'two-factor-setup');
		await section.getByText("Can't scan? Enter this key").click();
		await section.getByRole('button', { name: 'Copy key' }).click();
		await expect(section.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
		expect(await page.evaluate(() => (window as unknown as { __copied: string }).__copied)).toBe('JBSWY3DPEHPK3PXP');
		await page.evaluate(() => ((window as unknown as { __failCopy: boolean }).__failCopy = true));
		await section.getByRole('button', { name: 'Copy key' }).click();
		await expect(alertText(section)).toHaveText(/could not be copied/);
	});

	test('the full flow: scan, a wrong code, a right code, saving the backup codes, then complete', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-setup');
		await section.getByRole('button', { name: 'Next' }).click();
		await expect(section.getByText('Step 2 of 3')).toBeVisible();
		await expect(section.getByRole('heading', { name: 'Enter the code' })).toBeFocused();
		await expect(section.locator('form')).toHaveAttribute('method', 'post');

		const code = section.locator('input[name=code]');
		await code.focus();
		await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		await page.keyboard.type('111111');
		await hold(page);
		const verify = section.getByRole('button', { name: 'Verify' });
		await press(page, 'Enter');
		await expect(verify).toHaveAttribute('aria-busy', 'true');
		await press(page, 'Enter');
		await page.clock.runFor(1000);
		await expect(section.getByText('That code is not right.')).toBeVisible();
		await expect(code).toBeFocused();
		await expect(code).toHaveAttribute('aria-invalid', 'true');
		await press(page, 'Backspace');
		await expect(section.getByText('That code is not right.')).toBeHidden();

		await code.fill('123456');
		await press(page, 'Enter');
		await page.clock.runFor(1000);
		await expect(section.getByText('Step 3 of 3')).toBeVisible();
		await expect(section.getByRole('heading', { name: 'Save your backup codes' })).toBeFocused();
		// The demo's own description and the kit's localised title both reach the codes box.
		await expect(section.getByRole('heading', { name: 'Backup codes', exact: true })).toBeVisible();
		await expect(section.getByText('Keep these somewhere safe.')).toBeVisible();
		await expect(section.getByRole('listitem').filter({ hasText: /^[a-z0-9]{4}-[a-z0-9]{4}$/ })).toHaveCount(6);
		const finish = section.getByRole('button', { name: 'Continue' });
		await expect(finish).toBeDisabled();
		await section.getByRole('checkbox', { name: 'I have saved these codes' }).check();
		await finish.click();
		await expect(section.getByTestId('setup-log')).toHaveText('Setup complete');
		await expect(section.getByText('Step 1 of 3')).toBeVisible();
	});

	test('the step total stays at three when the backup codes only arrive after the verify', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-setup');
		await section.getByLabel('Hand over the backup codes after the verify').check();
		await expect(section.getByText('Step 1 of 3')).toBeVisible();
		await section.getByRole('button', { name: 'Next' }).click();
		await expect(section.getByText('Step 2 of 3')).toBeVisible();
		await section.locator('input[name=code]').fill('123456');
		await hold(page);
		await press(page, 'Enter');
		await expect(section.getByText('Step 2 of 3')).toBeVisible();
		await page.clock.runFor(1000);
		await expect(section.getByText('Step 3 of 3')).toBeVisible();
		await expect(section.getByRole('heading', { name: 'Save your backup codes' })).toBeFocused();
		await expect(section.getByRole('listitem').filter({ hasText: /^[a-z0-9]{4}-[a-z0-9]{4}$/ })).toHaveCount(6);
	});

	test('Back returns to the scan step and moves focus to its heading; Cancel reports', async ({ page }) => {
		const section = await openSection(page, 'two-factor-setup');
		await section.getByRole('button', { name: 'Next' }).click();
		await section.getByRole('button', { name: 'Back' }).click();
		await expect(section.getByText('Step 1 of 3')).toBeVisible();
		await expect(section.getByRole('heading', { name: 'Scan the QR code' })).toBeFocused();
		await section.getByRole('button', { name: 'Cancel' }).click();
		await expect(section.getByTestId('setup-log')).toHaveText('Cancelled');
	});

	test('leaving the verify step forgets a verify in flight: no jump to step 3, no completion, no stale error', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-setup');
		await section.getByRole('button', { name: 'Next' }).click();
		await section.locator('input[name=code]').fill('123456');
		await hold(page);
		await press(page, 'Enter');
		await expect(section.getByRole('button', { name: 'Verify' })).toHaveAttribute('aria-busy', 'true');
		await section.getByRole('button', { name: 'Back' }).click();
		await expect(section.getByText('Step 1 of 3')).toBeVisible();
		await page.clock.runFor(1000);
		// The settled verify changes nothing: still on the scan step, focus kept on its heading.
		await expect(section.getByText('Step 1 of 3')).toBeVisible();
		await expect(section.getByRole('heading', { name: 'Save your backup codes' })).toHaveCount(0);
		await expect(section.getByRole('heading', { name: 'Scan the QR code' })).toBeFocused();
		await expect(section.getByTestId('setup-log')).not.toHaveText('Setup complete');
		// A wrong code that settles after leaving does not show its error when the person comes back.
		await section.getByRole('button', { name: 'Next' }).click();
		await section.locator('input[name=code]').fill('111111');
		await press(page, 'Enter');
		await section.getByRole('button', { name: 'Back' }).click();
		await page.clock.runFor(1000);
		await section.getByRole('button', { name: 'Next' }).click();
		await expect(section.getByText('Step 2 of 3')).toBeVisible();
		await expect(section.getByText('That code is not right.')).toHaveCount(0);
		await expect(section.getByRole('button', { name: 'Verify' })).not.toHaveAttribute('aria-busy', 'true');
	});

	test('a rejected verification shows the generic error and stays on the verify step', async ({ page }) => {
		const section = await openSection(page, 'two-factor-setup');
		await section.getByRole('button', { name: 'Next' }).click();
		await section.locator('input[name=code]').fill('000000');
		await section.getByRole('button', { name: 'Verify' }).click();
		await expect(alertText(section)).toHaveText(/Something went wrong\. Please try again\./);
		await expect(alertText(section)).toBeFocused();
		await expect(section.getByText('network down')).toHaveCount(0);
		await expect(section.getByText('Step 2 of 3')).toBeVisible();
	});
});
