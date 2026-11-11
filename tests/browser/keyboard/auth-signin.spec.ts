import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/**
 * The demos answer after 800 ms and count a resend wait in real seconds. A test that looks at an in-flight state
 * owns that time: the clock is installed before the page loads, paused once the form is filled, and advanced by hand.
 */
async function openOnClock(page: Page, slug: string): Promise<Locator> {
	await page.clock.install();
	return openSection(page, slug);
}

/** Stops time, so no demo timer fires until `page.clock.runFor`. */
async function pauseClock(page: Page): Promise<void> {
	// The installed clock runs with real time until now, so a moment a little ahead of it is never in its past.
	await page.clock.pauseAt(new Date(Date.now() + 5000));
}

/** Longer than the demos' 800 ms answer. */
const SETTLE = 900;

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
		const section = await openOnClock(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await form.locator('input[name=password]').fill('correct');
		await pauseClock(page);
		const submit = form.getByRole('button', { name: 'Sign in', exact: true });
		await submit.click();
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await form.getByRole('textbox', { name: /Email/ }).press('Enter');
		await submit.click({ force: true });
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('signin-result')).toHaveText('Signed in as ada@example.com');
		await expect(submit).not.toHaveAttribute('aria-busy', 'true');
		await expect(section.getByTestId('signin-calls')).toHaveText('1');
	});

	test('a returned field error lands on the field, moves focus to it, and editing clears it', async ({ page }) => {
		const section = await openOnClock(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		const password = form.locator('input[name=password]');
		await password.fill('wrong');
		await pauseClock(page);
		await password.press('Enter');
		await page.clock.runFor(SETTLE);
		await expect(form.getByText('That password is not right.')).toBeVisible();
		await expect(password).toBeFocused();
		await expect(password).toHaveAttribute('aria-invalid', 'true');
		await expect(password).toHaveAccessibleDescription(/That password is not right\./);
		await password.press('x');
		await expect(form.getByText('That password is not right.')).toHaveCount(0);
		await expect(password).not.toHaveAttribute('aria-invalid', 'true');
	});

	test('a returned form error is announced and takes focus', async ({ page }) => {
		const section = await openOnClock(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('locked@example.com');
		await form.locator('input[name=password]').fill('whatever');
		await pauseClock(page);
		await form.getByRole('button', { name: 'Sign in', exact: true }).click();
		await page.clock.runFor(SETTLE);
		const alert = form.getByRole('alert');
		await expect(alert).toContainText('This account is locked. Try again in 15 minutes.');
		await expect(alert).toBeFocused();
	});

	test('a rejected handler shows the generic error and never the thrown message', async ({ page }) => {
		const section = await openOnClock(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await form.locator('input[name=password]').fill('boom');
		await pauseClock(page);
		const submit = form.getByRole('button', { name: 'Sign in', exact: true });
		await submit.click();
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
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
		const section = await openOnClock(page, 'sign-in-card');
		const form = section.locator('form').first();
		await form.getByRole('textbox', { name: /Email/ }).fill('ada@example.com');
		await section.getByRole('button', { name: 'Email link', exact: true }).click();
		await expect(form.locator('input[name=password]')).toHaveCount(0);
		await expect(form.getByRole('link', { name: 'Forgot password?' })).toHaveCount(0);
		await expect(form.getByRole('textbox', { name: /Email/ })).toHaveValue('ada@example.com');
		await pauseClock(page);
		const send = form.getByRole('button', { name: 'Email me a sign-in link' });
		await send.click();
		await expect(send).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('signin-result')).toHaveText('Link requested for ada@example.com');
		await section.getByRole('button', { name: 'Password', exact: true }).click();
		await expect(form.locator('input[name=password]')).toHaveCount(1);
		await expect(form.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
	});

	test('switching the method drops a stale error and forgets a submit in flight', async ({ page }) => {
		const section = await openOnClock(page, 'sign-in-card');
		const form = section.locator('form').first();
		const email = form.getByRole('textbox', { name: /Email/ });
		await email.fill('locked@example.com');
		await form.locator('input[name=password]').fill('whatever');
		await pauseClock(page);
		await form.getByRole('button', { name: 'Sign in', exact: true }).click();
		await page.clock.runFor(SETTLE);
		await expect(form.getByRole('alert')).toContainText('This account is locked.');
		await section.getByRole('button', { name: 'Email link', exact: true }).click();
		await expect(form.getByRole('alert')).toHaveCount(0);
		await section.getByRole('button', { name: 'Password', exact: true }).click();
		await expect(form.getByRole('alert')).toHaveCount(0);

		// A submit still running when the method changes is forgotten: its error never lands in the other form.
		await email.fill('ada@example.com');
		await form.locator('input[name=password]').fill('wrong');
		await form.getByRole('button', { name: 'Sign in', exact: true }).click();
		await expect(form.getByRole('button', { name: 'Sign in', exact: true })).toHaveAttribute('aria-busy', 'true');
		await section.getByRole('button', { name: 'Email link', exact: true }).click();
		await expect(form.getByRole('button', { name: 'Email me a sign-in link' })).not.toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await section.getByRole('button', { name: 'Password', exact: true }).click();
		await expect(form.getByText('That password is not right.')).toHaveCount(0);
	});

	test('every word of the building blocks can be replaced through labels', async ({ page }) => {
		const section = await openSection(page, 'sign-in-card');
		await section.getByRole('button', { name: 'Other language' }).click();
		await expect(section.getByRole('button', { name: 'Continuar con GitHub' })).toContainText('Último uso');
		await expect(section.getByRole('button', { name: 'Entrar con una llave de acceso' })).toBeVisible();
		await expect(section.getByRole('button', { name: 'Mostrar contraseña' }).first()).toBeVisible();
		await expect(section.getByRole('button', { name: /Continue with/ })).toHaveCount(0);
		await expect(section.getByText('Last used')).toHaveCount(0);
	});
});

test.describe('SignUpCard', () => {
	const fill = async (form: Locator, email = 'ada@example.com', password = 'Longenough1', confirm = password) => {
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
		const section = await openOnClock(page, 'sign-up-card');
		const form = section.locator('form');
		await fill(form, 'ada@example.com', 'Longenough1', 'Different123');
		await form.getByRole('checkbox', { name: /I agree/ }).check();
		await pauseClock(page);
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
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('signup-result')).toHaveText('Account created for ada@example.com');
	});

	test('the terms box is required and takes focus when it is the only thing missing', async ({ page }) => {
		const section = await openOnClock(page, 'sign-up-card');
		const form = section.locator('form');
		await fill(form);
		await pauseClock(page);
		await form.getByRole('button', { name: 'Create account' }).click();
		await expect(form.getByRole('checkbox', { name: /I agree/ })).toBeFocused();
		await press(page, 'Space');
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('signup-result')).toHaveText('Account created for ada@example.com');
	});

	test('a returned field error is shown, focused and cleared by editing; pending blocks a double submit', async ({ page }) => {
		const section = await openOnClock(page, 'sign-up-card');
		const form = section.locator('form');
		await fill(form, 'taken@example.com');
		await form.getByRole('checkbox', { name: /I agree/ }).check();
		await pauseClock(page);
		const submit = form.getByRole('button', { name: 'Create account' });
		await submit.click();
		await expect(submit).toHaveAttribute('aria-busy', 'true');
		await submit.click({ force: true });
		await page.clock.runFor(SETTLE);
		const email = form.getByRole('textbox', { name: /Email/ });
		await expect(form.getByText('Use a different email address.')).toBeVisible();
		await expect(email).toBeFocused();
		await expect(email).toHaveAttribute('aria-invalid', 'true');
		await page.keyboard.type('x');
		await expect(form.getByText('Use a different email address.')).toHaveCount(0);
	});

	test('every word of the building blocks can be replaced through labels', async ({ page }) => {
		const section = await openSection(page, 'sign-up-card');
		const form = section.locator('form');
		await expect(section.getByRole('button', { name: 'Sign up with a passkey' })).toBeVisible();
		await section.getByRole('button', { name: 'Other language' }).click();
		await expect(section.getByRole('button', { name: 'Continuar con GitHub' })).toBeVisible();
		await expect(section.getByRole('button', { name: 'Crear cuenta con una llave de acceso' })).toBeVisible();
		await expect(form.getByRole('button', { name: 'Mostrar contraseña' })).toHaveCount(2);
		await expect(form.getByText('(Opcional)')).toBeVisible();
		await expect(form.locator('input[name=password]')).toHaveAccessibleDescription(/At least 10 characters ?: no cumple.*Seguridad de la contraseña: Muy débil/);
		await expect(form.getByRole('button', { name: 'Show password' })).toHaveCount(0);
		await expect(form.getByText('(Optional)')).toHaveCount(0);
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

	test('Resend shows loading, keeps its name while a described wait runs, says "Sent again" politely, then becomes available again', async ({ page }) => {
		const section = await openOnClock(page, 'magic-link-sent');
		await pauseClock(page);
		const resend = section.getByRole('button', { name: 'Resend email' });
		await resend.focus();
		await press(page, 'Enter');
		await expect(resend).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(section.getByRole('status').filter({ hasText: 'Sent again' })).toBeVisible();
		await expect(section.getByTestId('magic-sends')).toHaveText('1');
		// The wait keeps the name stable and the focus where it was; the countdown is a described line, not live.
		await expect(resend).toHaveAccessibleName('Resend email');
		await expect(resend).toHaveAttribute('aria-disabled', 'true');
		await expect(resend).toBeFocused();
		await expect(resend).toHaveAccessibleDescription(/^You can resend in \d s$/);
		await expect(section.getByText(/^You can resend in \d s$/)).not.toHaveAttribute('aria-live', /.*/);
		await press(page, 'Enter');
		await expect(section.getByTestId('magic-sends')).toHaveText('1');
		await page.clock.runFor(6000);
		await expect(resend).not.toHaveAttribute('aria-disabled', 'true');
		await expect(resend).not.toHaveAttribute('aria-describedby', /.*/);
		await expect(section.getByText(/You can resend in/)).toHaveCount(0);
	});

	test('without onResend there is no resend button, no status and no alert', async ({ page }) => {
		const section = await openSection(page, 'magic-link-sent');
		await section.getByRole('button', { name: 'No resend' }).click();
		await expect(section.getByRole('button', { name: 'Resend email' })).toHaveCount(0);
		await expect(section.getByRole('status')).toHaveCount(0);
		await expect(section.getByRole('alert')).toHaveCount(0);
		await expect(section.getByRole('button', { name: 'Use a different email' })).toBeVisible();
	});

	test('a second successful instant resend is announced again', async ({ page }) => {
		const section = await openSection(page, 'magic-link-sent');
		await section.getByRole('button', { name: 'Instant resend' }).click();
		const status = section.getByRole('status');
		// Count how often the status text is set: a repeat of the same words must still change the DOM to be announced.
		await status.evaluate((node) => {
			const w = window as unknown as { __announced: number };
			w.__announced = 0;
			new MutationObserver((records) => {
				for (const record of records) if (record.type === 'characterData' && record.oldValue === '') w.__announced += 1;
			}).observe(node, { subtree: true, characterData: true, characterDataOldValue: true });
		});
		const resend = section.getByRole('button', { name: 'Resend email' });
		await resend.click();
		await expect(status).toHaveText('Sent again');
		await expect(section.getByTestId('magic-sends')).toHaveText('1');
		await resend.click();
		await expect(section.getByTestId('magic-sends')).toHaveText('2');
		await expect(status).toHaveText('Sent again');
		await expect.poll(() => page.evaluate(() => (window as unknown as { __announced: number }).__announced)).toBe(2);
	});

	test('with a code length the card becomes a form: a wrong code is shown and focused, editing clears it, a right one passes', async ({ page }) => {
		const section = await openOnClock(page, 'magic-link-sent');
		await section.getByRole('button', { name: 'Email also has a code' }).click();
		const form = section.locator('form');
		await expect(form).toHaveCount(1);
		const code = form.locator('input[name=code]');
		await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		await code.fill('000000');
		await pauseClock(page);
		await press(page, 'Enter');
		await expect(form.getByRole('button', { name: 'Verify code' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(form.getByText('That code is not right.')).toBeVisible();
		await expect(code).toBeFocused();
		await expect(code).toHaveAttribute('aria-invalid', 'true');
		await press(page, 'Backspace');
		await expect(form.getByText('That code is not right.')).toHaveCount(0);
		await page.keyboard.type('4');
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('magic-note')).toHaveText('Code accepted: 000004');
		// The resend button sits in the form without submitting it.
		await expect(form.getByRole('button', { name: 'Resend email' })).toHaveAttribute('type', 'button');
	});
});

test.describe('TwoFactorCard', () => {
	test('asks for a one-time code, trusts a device and reports the method', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-card');
		const form = section.getByTestId('twofactor-main');
		await expect(section.getByRole('heading', { name: 'Two-step verification', level: 3 })).toBeVisible();
		const code = form.locator('input[name=code]');
		await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		await expect(form.locator('input[name=method]')).toHaveValue('totp');
		await code.fill('123456');
		await form.getByRole('checkbox', { name: 'Trust this device' }).check();
		await pauseClock(page);
		await press(page, 'Enter');
		await expect(form.getByRole('button', { name: 'Verify' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('twofactor-result')).toHaveText('Verified with an authentication code 123456 (device trusted)');
	});

	test('the backup code switch swaps the control, moves focus into it, and switches back', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-card');
		const form = section.getByTestId('twofactor-main');
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
		await pauseClock(page);
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(section.getByTestId('twofactor-result')).toHaveText('Verified with a backup code abcd-efgh');
		await form.getByRole('button', { name: 'Use an authentication code instead' }).click();
		await expect(form.getByRole('textbox', { name: /Authentication code/ })).toBeFocused();
		await expect(form.locator('input[name=method]')).toHaveValue('totp');
		await expect(section.getByText('Enter the code from your authenticator app.')).toBeVisible();
	});

	test('a wrong code is shown on the field and focused; editing clears it; a failing server shows only the generic error', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-card');
		const form = section.getByTestId('twofactor-main');
		const code = form.locator('input[name=code]');
		await code.fill('000000');
		await pauseClock(page);
		await press(page, 'Enter');
		await expect(form.getByRole('button', { name: 'Verify' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(form.getByText('That code is not right.')).toBeVisible();
		await expect(code).toBeFocused();
		await expect(code).toHaveAttribute('aria-invalid', 'true');
		await press(page, 'Backspace');
		await expect(form.getByText('That code is not right.')).toHaveCount(0);
		await code.fill('111111');
		await press(page, 'Enter');
		await expect(form.getByRole('button', { name: 'Verify' })).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(form.getByRole('alert')).toHaveText(/Something went wrong\. Try again\./);
		await expect(form.getByRole('alert')).toBeFocused();
		await expect(section).not.toContainText('upstream timeout');
	});

	test('the passkey and sign-in-another-way buttons report intent', async ({ page }) => {
		const section = await openOnClock(page, 'two-factor-card');
		const result = section.getByTestId('twofactor-result');
		await pauseClock(page);
		await section.getByRole('button', { name: 'Sign in with a passkey' }).click();
		await page.clock.runFor(600);
		await expect(result).toHaveText('Passkey requested');
		const back = section.getByRole('button', { name: 'Sign in another way' });
		await back.focus();
		await press(page, 'Enter');
		await expect(result).toHaveText('Back to sign-in options');
	});

	test('a server error given as a prop stays hidden after editing and switching code kinds, until the props change', async ({ page }) => {
		const section = await openSection(page, 'two-factor-card');
		const card = section.getByTestId('twofactor-prop');
		const message = 'The server did not accept that code.';
		await expect(card.getByText(message)).toBeVisible();
		const code = card.locator('input[name=code]');
		await code.focus();
		await page.keyboard.type('1');
		await expect(card.getByText(message)).toHaveCount(0);
		await card.getByRole('button', { name: 'Use a backup code instead' }).click();
		await expect(card.getByRole('textbox', { name: /Backup code/ })).toBeFocused();
		await expect(card.getByText(message)).toHaveCount(0);
		await card.getByRole('button', { name: 'Use an authentication code instead' }).click();
		await expect(card.locator('input[name=code]')).toBeFocused();
		await expect(card.getByText(message)).toHaveCount(0);
		// A new response from the server is news again.
		await section.getByRole('button', { name: 'Flag the code again' }).click();
		await expect(card.getByText(message)).toBeVisible();
	});

	test('every word of the building blocks can be replaced through labels', async ({ page }) => {
		const section = await openSection(page, 'two-factor-card');
		await section.getByRole('button', { name: 'Other language' }).click();
		await expect(section.getByRole('button', { name: 'Entrar con una llave de acceso' })).toBeVisible();
		await expect(section.getByRole('button', { name: 'Sign in with a passkey' })).toHaveCount(0);
	});
});
