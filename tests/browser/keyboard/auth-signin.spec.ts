import { expect, test } from '@playwright/test';
import { openSection, press } from './helpers';

test.describe('SignInCard', () => {
	test('shows providers, a last-used badge, the passkey button, the divider and the footer; the email asks for a passkey', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		await expect(section.getByRole('heading', { name: 'Sign in', level: 3 }).first()).toBeVisible();
		await expect(section.getByRole('button', { name: /Continue with GitHub/ }).first()).toContainText('Last used');
		await expect(section.getByRole('button', { name: 'Continue with single sign-on' })).toBeVisible();
		// The providerIcon snippet draws the logo, hidden from assistive technology.
		await expect(section.getByRole('button', { name: 'Continue with single sign-on' }).locator('svg')).toHaveCount(1);
		await expect(section.getByRole('button', { name: 'Sign in with a passkey' })).toBeVisible();
		await expect(section.getByText('or', { exact: true }).first()).toBeVisible();
		await expect(section.getByRole('textbox', { name: /Email/ }).first()).toHaveAttribute('autocomplete', 'username webauthn');
		await expect(section.locator('input[name=password]').first()).toHaveAttribute('autocomplete', 'current-password');
		await expect(section.getByRole('link', { name: 'Forgot password?' }).first()).toHaveAttribute('href', 'https://example.com/forgot');
		await expect(section.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', 'https://example.com/sign-up');
		await expect(section.getByRole('checkbox', { name: 'Remember me' })).toBeVisible();
		// The native card has no providers, so no divider and a plain username autocomplete.
		const native = section.getByTestId('signin-native');
		await expect(native.getByRole('textbox', { name: /Email/ })).toHaveAttribute('autocomplete', 'username');
	});

	test('a provider and the passkey button report intent', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const result = section.getByTestId('signin-result');
		await section.getByRole('button', { name: 'Continue with single sign-on' }).focus();
		await press(page, 'Enter');
		await expect(result).toHaveText('Provider chosen: sso');
		await section.getByRole('button', { name: 'Sign in with a passkey' }).focus();
		await press(page, 'Enter');
		await expect(result).toHaveText('Passkey requested');
	});

	test('without onSubmit the form posts natively to its action, with the hidden values', async ({ page }) => {
		await page.route('**/auth-demo/sign-in', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>posted</p>' }));
		const section = await openSection(page, 'sign-in-card');
		const native = section.getByTestId('signin-native');
		await expect(native).toHaveAttribute('method', 'post');
		await expect(native).toHaveAttribute('action', '/auth-demo/sign-in');
		await native.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await native.locator('input[name=password]').fill('correct horse');
		const request = page.waitForRequest((r) => r.url().endsWith('/auth-demo/sign-in') && r.method() === 'POST');
		await press(page, 'Enter');
		const body = (await request).postData() ?? '';
		expect(body).toContain('email=ada%40example.com');
		expect(body).toContain('password=correct+horse');
		expect(body).toContain('next=%2Fdashboard');
	});

	test('while the handler is pending the button shows loading and a second submit is ignored', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await form.locator('input[name=password]').fill('correct');
		const submit = form.getByRole('button', { name: 'Sign in', exact: true });
		await submit.click();
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await form.getByRole('textbox', { name: /Email/ }).press('Enter');
		await submit.click({ force: true });
		await expect(section.getByTestId('signin-result')).toHaveText('Signed in as ada@example.com');
		await expect(submit).not.toHaveAttribute('aria-busy', 'true');
		await expect(section.getByTestId('signin-calls')).toHaveText('1');
	});

	test('a returned field error lands on the field, moves focus to it, and editing clears it', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		const password = form.locator('input[name=password]');
		await password.fill('wrong');
		await password.press('Enter');
		await expect(form.getByText('That password is not right.')).toBeVisible();
		await expect(password).toBeFocused();
		await expect(password).toHaveAttribute('aria-invalid', 'true');
		await expect(password).toHaveAccessibleDescription(/That password is not right\./);
		await password.press('x');
		await expect(form.getByText('That password is not right.')).toHaveCount(0);
		await expect(password).not.toHaveAttribute('aria-invalid', 'true');
	});

	test('a returned form error is announced and takes focus', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('locked@example.com');
		await form.locator('input[name=password]').fill('whatever');
		await form.getByRole('button', { name: 'Sign in', exact: true }).click();
		const alert = form.getByRole('alert');
		await expect(alert).toContainText('This account is locked. Try again in 15 minutes.');
		await expect(alert).toBeFocused();
	});

	test('a rejected handler shows the generic error and never the thrown message', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await form.locator('input[name=password]').fill('boom');
		await form.getByRole('button', { name: 'Sign in', exact: true }).click();
		await expect(form.getByRole('alert')).toHaveText(/Something went wrong\. Try again\./);
		await expect(section).not.toContainText('hunter2');
	});

	test('native validation blocks an empty submit and focuses the first required field', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('button', { name: 'Sign in', exact: true }).click();
		await expect(form.getByRole('textbox', { name: /Email/ })).toBeFocused();
		await expect(section.getByTestId('signin-calls')).toHaveText('0');
	});

	test('the method switch swaps the password field for an email-only link request and keeps the email', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await section.getByRole('button', { name: 'Email link', exact: true }).click();
		await expect(form.locator('input[name=password]')).toHaveCount(0);
		await expect(form.getByRole('link', { name: 'Forgot password?' })).toHaveCount(0);
		await expect(form.getByRole('textbox', { name: /Email/ })).toHaveValue('ada@example.com');
		const send = form.getByRole('button', { name: 'Email me a sign-in link' });
		await send.click();
		await expect(section.getByTestId('signin-result')).toHaveText('Link requested for ada@example.com');
		await section.getByRole('button', { name: 'Password', exact: true }).click();
		await expect(form.locator('input[name=password]')).toHaveCount(1);
		await expect(form.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
	});
});

test.describe('SignUpCard', () => {
	const fill = async (form: import('@playwright/test').Locator, email = 'ada@example.com', password = 'Longenough1', confirm = password) => {
		await form.getByRole('textbox', { name: /Email/ }).fill(email);
		await form.locator('input[name=password]').fill(password);
		await form.locator('input[name=confirmPassword]').fill(confirm);
	};

	test('asks for the right things with the right autocomplete, and the terms label holds links', async ({ page }) => {
		const section = await openSection(page, 'sign-up-card');
		const form = section.locator('form');
		await expect(form.getByRole('textbox', { name: /Name/ })).toHaveAttribute('autocomplete', 'name');
		await expect(form.getByRole('textbox', { name: /Email/ })).toHaveAttribute('autocomplete', 'email');
		await expect(form.locator('input[name=password]')).toHaveAttribute('autocomplete', 'new-password');
		await expect(form.locator('input[name=password]')).toHaveAttribute('minlength', '10');
		await expect(form.locator('input[name=confirmPassword]')).toHaveAttribute('autocomplete', 'new-password');
		await expect(form.locator('input[name=password]')).toHaveAccessibleDescription(/At least 10 characters ?: not met.*Password strength: Very weak/);
		const terms = form.getByRole('checkbox', { name: /I agree to the Terms/ });
		await expect(terms).toHaveJSProperty('required', true);
		await expect(form.getByRole('link', { name: 'Terms' })).toBeVisible();
		await expect(section.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', 'https://example.com/sign-in');
	});

	test('the name field follows nameField: optional, required, hidden', async ({ page }) => {
		const section = await openSection(page, 'sign-up-card');
		const form = section.locator('form');
		const name = form.locator('input[name=name]');
		await expect(name).toHaveJSProperty('required', false);
		await expect(form.getByText('(Optional)')).toBeVisible();
		await section.getByRole('button', { name: 'Name required' }).click();
		await expect(name).toHaveJSProperty('required', true);
		await section.getByRole('button', { name: 'Name hidden' }).click();
		await expect(name).toHaveCount(0);
	});

	test('a confirm password that differs is blocked by the browser, focused, and explained in place', async ({ page }) => {
		const section = await openSection(page, 'sign-up-card');
		const form = section.locator('form');
		await fill(form, 'ada@example.com', 'Longenough1', 'Different123');
		await form.getByRole('checkbox', { name: /I agree/ }).check();
		const confirm = form.locator('input[name=confirmPassword]');
		expect(await confirm.evaluate((input: HTMLInputElement) => input.validationMessage)).toBe('The passwords do not match.');
		await form.getByRole('button', { name: 'Create account' }).click();
		await expect(confirm).toBeFocused();
		await expect(form.getByText('The passwords do not match.')).toBeVisible();
		await expect(section.getByTestId('signup-result')).toHaveText('Nothing submitted yet.');
		await confirm.fill('Longenough1');
		expect(await confirm.evaluate((input: HTMLInputElement) => input.validationMessage)).toBe('');
		await expect(form.getByText('The passwords do not match.')).toHaveCount(0);
		await form.getByRole('button', { name: 'Create account' }).click();
		await expect(section.getByTestId('signup-result')).toHaveText('Account created for ada@example.com');
	});

	test('the terms box is required and takes focus when it is the only thing missing', async ({ page }) => {
		const section = await openSection(page, 'sign-up-card');
		const form = section.locator('form');
		await fill(form);
		await form.getByRole('button', { name: 'Create account' }).click();
		await expect(form.getByRole('checkbox', { name: /I agree/ })).toBeFocused();
		await press(page, 'Space');
		await press(page, 'Enter');
		await expect(section.getByTestId('signup-result')).toHaveText('Account created for ada@example.com');
	});

	test('a returned field error is shown, focused and cleared by editing; pending blocks a double submit', async ({ page }) => {
		const section = await openSection(page, 'sign-up-card');
		const form = section.locator('form');
		await fill(form, 'taken@example.com');
		await form.getByRole('checkbox', { name: /I agree/ }).check();
		const submit = form.getByRole('button', { name: 'Create account' });
		await submit.click();
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await submit.click({ force: true });
		const email = form.getByRole('textbox', { name: /Email/ });
		await expect(form.getByText('Use a different email address.')).toBeVisible();
		await expect(email).toBeFocused();
		await expect(email).toHaveAttribute('aria-invalid', 'true');
		await page.keyboard.type('x');
		await expect(form.getByText('Use a different email address.')).toHaveCount(0);
	});
});

test.describe('MagicLinkSent', () => {
	test('shows the address, is not a form without a code, and Use a different email calls onBack', async ({ page }) => {
		const section = await openSection(page, 'magic-link-sent');
		await expect(section.getByRole('heading', { name: 'Check your email', level: 3 })).toBeVisible();
		await expect(section.getByText('ada@example.com').first()).toBeVisible();
		await expect(section.locator('form')).toHaveCount(0);
		const back = section.getByRole('button', { name: 'Use a different email' });
		await back.focus();
		await press(page, 'Enter');
		await expect(section.getByTestId('magic-note')).toHaveText('Back to the email form');
	});

	test('Resend shows loading, counts down, says "Sent again" politely, then becomes available again', async ({ page }) => {
		const section = await openSection(page, 'magic-link-sent');
		const resend = section.getByRole('button', { name: 'Resend email' });
		await resend.focus();
		await press(page, 'Enter');
		await expect(resend).toHaveAttribute('aria-busy', 'true');
		await expect(section.getByRole('button', { name: /Resend in \d+s/ })).toHaveAttribute('aria-disabled', 'true');
		await expect(section.getByRole('status').filter({ hasText: 'Sent again' })).toBeVisible();
		await expect(section.getByTestId('magic-sends')).toHaveText('1');
		await expect(section.getByRole('button', { name: 'Resend email' })).not.toHaveAttribute('aria-disabled', 'true', { timeout: 9000 });
	});

	test('with a code length the card becomes a form: a wrong code is shown and focused, editing clears it, a right one passes', async ({ page }) => {
		const section = await openSection(page, 'magic-link-sent');
		await section.getByRole('button', { name: 'Email also has a code' }).click();
		const form = section.locator('form');
		await expect(form).toHaveCount(1);
		const code = form.locator('input[name=code]');
		await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		await code.fill('000000');
		await press(page, 'Enter');
		await expect(form.getByText('That code is not right.')).toBeVisible();
		await expect(code).toBeFocused();
		await expect(code).toHaveAttribute('aria-invalid', 'true');
		await press(page, 'Backspace');
		await expect(form.getByText('That code is not right.')).toHaveCount(0);
		await page.keyboard.type('4');
		await press(page, 'Enter');
		await expect(section.getByTestId('magic-note')).toHaveText('Code accepted: 000004');
		// The resend button sits in the form without submitting it.
		await expect(form.getByRole('button', { name: 'Resend email' })).toHaveAttribute('type', 'button');
	});
});

test.describe('TwoFactorCard', () => {
	test('asks for a one-time code, trusts a device and reports the method', async ({ page }) => {
		const section = await openSection(page, 'two-factor-card');
		const form = section.locator('form');
		await expect(section.getByRole('heading', { name: 'Two-step verification', level: 3 })).toBeVisible();
		const code = form.locator('input[name=code]');
		await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		await expect(form.locator('input[name=method]')).toHaveValue('totp');
		await code.fill('123456');
		await form.getByRole('checkbox', { name: 'Trust this device' }).check();
		await press(page, 'Enter');
		await expect(form.getByRole('button', { name: 'Verify' })).toHaveAttribute('aria-busy', 'true');
		await expect(section.getByTestId('twofactor-result')).toHaveText('Verified with an authentication code 123456 (device trusted)');
	});

	test('the backup code switch swaps the control, moves focus into it, and switches back', async ({ page }) => {
		const section = await openSection(page, 'two-factor-card');
		const form = section.locator('form');
		const toggle = form.getByRole('button', { name: 'Use a backup code instead' });
		await toggle.focus();
		await press(page, 'Enter');
		const backup = form.getByRole('textbox', { name: /Backup code/ });
		await expect(backup).toBeFocused();
		await expect(backup).toHaveAttribute('name', 'code');
		await expect(backup).toHaveAttribute('autocomplete', 'off');
		await expect(backup).toHaveAttribute('type', 'text');
		await expect(form.locator('input[name=method]')).toHaveValue('backup');
		await expect(section.getByText('Enter one of your backup codes. Each works once.')).toBeVisible();
		await page.keyboard.type('abcd-efgh');
		await press(page, 'Enter');
		await expect(section.getByTestId('twofactor-result')).toHaveText('Verified with a backup code abcd-efgh');
		await form.getByRole('button', { name: 'Use an authentication code instead' }).click();
		await expect(form.getByRole('textbox', { name: /Authentication code/ })).toBeFocused();
		await expect(form.locator('input[name=method]')).toHaveValue('totp');
		await expect(section.getByText('Enter the code from your authenticator app.')).toBeVisible();
	});

	test('a wrong code is shown on the field and focused; editing clears it; a failing server shows only the generic error', async ({ page }) => {
		const section = await openSection(page, 'two-factor-card');
		const form = section.locator('form');
		const code = form.locator('input[name=code]');
		await code.fill('000000');
		await press(page, 'Enter');
		await expect(form.getByText('That code is not right.')).toBeVisible();
		await expect(code).toBeFocused();
		await expect(code).toHaveAttribute('aria-invalid', 'true');
		await press(page, 'Backspace');
		await expect(form.getByText('That code is not right.')).toHaveCount(0);
		await code.fill('111111');
		await press(page, 'Enter');
		await expect(form.getByRole('alert')).toHaveText(/Something went wrong\. Try again\./);
		await expect(form.getByRole('alert')).toBeFocused();
		await expect(section).not.toContainText('upstream timeout');
	});

	test('the passkey and sign-in-another-way buttons report intent', async ({ page }) => {
		const section = await openSection(page, 'two-factor-card');
		const result = section.getByTestId('twofactor-result');
		await section.getByRole('button', { name: 'Sign in with a passkey' }).click();
		await expect(result).toHaveText('Passkey requested');
		const back = section.getByRole('button', { name: 'Sign in another way' });
		await back.focus();
		await press(page, 'Enter');
		await expect(result).toHaveText('Back to sign-in options');
	});
});
