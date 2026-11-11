import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/** The input covers the cells, so a click on a cell lands on the input at that spot. */
async function clickCell(page: Page, cell: Locator): Promise<void> {
	const box = (await cell.boundingBox())!;
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

const sent = (section: Locator) => section.locator('output').last();
const submit = (section: Locator) => section.getByRole('button', { name: 'Submit' }).click();
const reset = (section: Locator) => section.getByRole('button', { name: 'Reset' }).click();

test.describe('AuthCard', () => {
	test('is a titled card: heading at the chosen level, a description, an "or" divider, and a footer link', async ({ page }) => {
		const section = await openSection(page, 'auth-card');
		await expect(section.getByRole('heading', { name: 'Welcome back', level: 3 })).toBeVisible();
		await expect(section.getByText('Sign in to continue to your workspace.')).toBeVisible();
		await expect(section.getByText('or', { exact: true })).toBeVisible();
		await expect(section.getByRole('link', { name: 'Sign up' })).toBeVisible();
		const card = section.getByRole('heading', { name: 'Welcome back' }).locator('xpath=ancestor::div[contains(@class,"max-w-sm")]');
		const box = await card.boundingBox();
		expect(box!.width).toBeLessThanOrEqual(384.5);
	});

	test('the form inside is reached by Tab in reading order, and the provider button reports its id', async ({ page }) => {
		const section = await openSection(page, 'auth-card');
		const provider = section.getByRole('button', { name: 'Continue with GitHub' });
		await provider.focus();
		await press(page, 'Tab');
		await expect(section.getByRole('textbox', { name: /Email/ })).toBeFocused();
		await press(page, 'Tab');
		await expect(section.locator('input[name=password]')).toBeFocused();
		await press(page, 'Tab');
		await expect(section.getByRole('button', { name: 'Show password' })).toBeFocused();
		await provider.focus();
		await press(page, 'Enter');
		await expect(section.locator('output')).toHaveText('Provider chosen: github');
	});
});

test.describe('PasswordInput', () => {
	test('reveal toggles the input type, keeps focus on the button, and goes back to hidden on submit and reset', async ({ page }) => {
		const section = await openSection(page, 'password-input');
		const password = section.locator('input[name=password]');
		await expect(password).toHaveAttribute('type', 'password');
		await expect(password).toHaveAttribute('autocomplete', 'current-password');

		const toggle = section.getByRole('button', { name: 'Show password' }).first();
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await toggle.focus();
		await press(page, 'Space');
		await expect(password).toHaveAttribute('type', 'text');
		const hide = section.getByRole('button', { name: 'Hide password' }).first();
		await expect(hide).toHaveAttribute('aria-pressed', 'true');
		await expect(hide).toBeFocused();

		await section.locator('input[name=newPassword]').fill('Longenough1');
		await submit(section);
		await expect(password).toHaveAttribute('type', 'password');
		await expect(sent(section)).toHaveText('Sent: password=hunter2-demo, newPassword=Longenough1');

		await section.getByRole('button', { name: 'Show password' }).first().click();
		await expect(password).toHaveAttribute('type', 'text');
		await reset(section);
		await expect(password).toHaveAttribute('type', 'password');
		await expect(password).toHaveValue('hunter2-demo');
	});

	test('a Field names it and the checklist and strength describe it', async ({ page }) => {
		const section = await openSection(page, 'password-input');
		const fresh = section.locator('input[name=newPassword]');
		await expect(fresh).toHaveAccessibleName(/New password/);
		await expect(fresh).toHaveAttribute('autocomplete', 'new-password');
		await expect(fresh).toHaveAttribute('minlength', '10');
		await expect(fresh).toHaveAccessibleDescription(/At least 10 characters ?: not met.*A number ?: not met.*A capital letter ?: not met.*Password strength: Very weak/);

		await fresh.fill('abcdefghij');
		await expect(fresh).toHaveAccessibleDescription(/At least 10 characters ?: met.*A number ?: not met.*A capital letter ?: not met.*Password strength: Weak/);
		await fresh.fill('Abcdefghij1');
		await expect(fresh).toHaveAccessibleDescription(/At least 10 characters ?: met.*A number ?: met.*A capital letter ?: met.*Password strength: Good/);
	});

	test('the checklist summary is announced once typing pauses, not on every key', async ({ page }) => {
		const section = await openSection(page, 'password-input');
		const fresh = section.locator('input[name=newPassword]');
		const status = section.locator('span[role=status]');
		await fresh.focus();
		await page.keyboard.type('Abc123', { delay: 30 });
		// Still inside the quiet period: nothing new was announced.
		await expect(status).toHaveText('0 of 3 requirements met');
		await expect(status).toHaveText('2 of 3 requirements met', { timeout: 3000 });
		// The status holds one short line, not the list.
		await expect(status).not.toContainText('At least');
	});

	test('warns politely about Caps Lock only while it is on and the input has focus', async ({ page }) => {
		const section = await openSection(page, 'password-input');
		const fresh = section.locator('input[name=newPassword]');
		const warning = section.locator('p[aria-live=polite]', { hasText: 'Caps Lock is on' });
		await expect(section.locator('p[aria-live=polite]').first()).toBeAttached();
		await fresh.focus();
		await expect(warning).toHaveCount(0);
		await fresh.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', modifierCapsLock: true, bubbles: true })));
		await expect(warning).toBeVisible();
		await fresh.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keyup', { key: 'CapsLock', modifierCapsLock: false, bubbles: true })));
		await expect(warning).toHaveCount(0);
		await fresh.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', modifierCapsLock: true, bubbles: true })));
		await expect(warning).toBeVisible();
		await section.locator('input[name=password]').focus();
		await expect(warning).toHaveCount(0);
	});

	test('minlength blocks a native submit and a form post carries the typed text', async ({ page }) => {
		const section = await openSection(page, 'password-input');
		await section.locator('input[name=newPassword]').fill('short');
		await submit(section);
		await expect(sent(section)).toHaveText('');
		await section.locator('input[name=newPassword]').fill('Longenough1');
		await submit(section);
		await expect(sent(section)).toContainText('newPassword=Longenough1');
	});
});

const paste = (input: Locator, text: string) =>
	input.evaluate((el, value) => {
		const data = new DataTransfer();
		data.setData('text', value);
		el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
	}, text);

test.describe('OtpInput', () => {
	test('is one real input with the one-time-code attributes, named by its Field', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		await expect(section.locator('input')).toHaveCount(2);
		await expect(code).toHaveAccessibleName(/Verification code/);
		await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		await expect(code).toHaveAttribute('inputmode', 'numeric');
		await expect(code).toHaveAttribute('maxlength', '6');
		await expect(code).toHaveAttribute('pattern', '[0-9]{6}');
		const backup = section.locator('input[name=backup]');
		await expect(backup).toHaveAttribute('inputmode', 'text');
		await expect(backup).toHaveAttribute('pattern', '[0-9A-Za-z]{8}');
		await expect(section.locator('[data-otp-cell]')).toHaveCount(14);
	});

	test('typing fills the cells, highlights the active one, and reports completion once', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		const cells = section.locator('[data-otp-cell]');
		await code.focus();
		await expect(cells.nth(0)).toHaveAttribute('data-active', '');
		await page.keyboard.type('12');
		await expect(cells.nth(0)).toHaveText('1');
		await expect(cells.nth(1)).toHaveText('2');
		await expect(cells.nth(2)).toHaveAttribute('data-active', '');
		await expect(cells.nth(1)).not.toHaveAttribute('data-active', '');
		await page.keyboard.type('3456');
		await expect(section.getByText('Complete: 123456')).toBeVisible();
		await expect(cells.nth(5)).toHaveAttribute('data-active', '');
	});

	test('typed spaces, dashes and letters are dropped', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		await code.focus();
		await page.keyboard.type('1 2-a3');
		await expect(code).toHaveValue('123');
		await expect(section.locator('[data-otp-cell]').nth(3)).toHaveAttribute('data-active', '');
	});

	test('pasting "123 456" and "123-456" gives the clean code', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		await code.focus();
		await paste(code, '123 456');
		await expect(code).toHaveValue('123456');
		await expect(section.getByText('Complete: 123456')).toBeVisible();
		await press(page, 'Control+a', 'Backspace');
		await expect(code).toHaveValue('');
		await paste(code, ' 654-321 ');
		await expect(code).toHaveValue('654321');
	});

	test('Backspace, arrows and select-all edit like a normal text input', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		const cells = section.locator('[data-otp-cell]');
		await code.focus();
		await page.keyboard.type('1234');
		await press(page, 'Backspace');
		await expect(code).toHaveValue('123');
		await press(page, 'ArrowLeft', 'ArrowLeft');
		await expect(cells.nth(1)).toHaveAttribute('data-active', '');
		await page.keyboard.type('9');
		await expect(code).toHaveValue('1923');
		await press(page, 'Home');
		await expect(cells.nth(0)).toHaveAttribute('data-active', '');
		await press(page, 'Delete');
		await expect(code).toHaveValue('923');
		await press(page, 'Control+a');
		for (const i of [0, 1, 2]) await expect(cells.nth(i)).toHaveAttribute('data-active', '');
		await page.keyboard.type('7');
		await expect(code).toHaveValue('7');
	});

	test('a click on a cell puts the caret there, but not past the typed text', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		const cells = section.locator('[data-otp-cell]');
		await code.focus();
		await page.keyboard.type('123');
		await clickCell(page, cells.nth(1));
		await expect(cells.nth(1)).toHaveAttribute('data-active', '');
		await clickCell(page, cells.nth(5));
		await expect(cells.nth(3)).toHaveAttribute('data-active', '');
		await expect(code).toBeFocused();
	});

	test('an unfinished code does not submit; a wrong one shows the Field error on the input', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		await code.fill('123');
		await submit(section);
		await expect(sent(section)).toHaveText('');
		await code.fill('000000');
		await expect(code).toHaveAttribute('aria-invalid', 'true');
		await expect(code).toHaveAccessibleDescription(/That code is not right/);
		await code.fill('123456');
		await expect(code).not.toHaveAttribute('aria-invalid');
		await submit(section);
		await expect(sent(section)).toHaveText('Sent: code=123456, backup=');
	});

	test('autoSubmit submits the form once, when the last character arrives', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		await section.locator('input[name=code]').fill('246810');
		const backup = section.locator('input[name=backup]');
		await backup.focus();
		await page.keyboard.type('ab12cd3');
		await expect(sent(section)).toHaveText('');
		await page.keyboard.type('4');
		await expect(sent(section)).toHaveText('Sent: code=246810, backup=ab12cd34');
	});

	test('reset restores the empty value and clears the cells', async ({ page }) => {
		const section = await openSection(page, 'otp-input');
		const code = section.locator('input[name=code]');
		await code.fill('123456');
		await reset(section);
		await expect(code).toHaveValue('');
		await expect(section.locator('[data-otp-cell]').first()).toHaveText('');
	});
});

test.describe('ProviderButton', () => {
	test('shows the provider text, the last-used badge and the caller icon', async ({ page }) => {
		const section = await openSection(page, 'provider-button');
		const github = section.getByRole('button', { name: /Continue with GitHub/ });
		await expect(github).toContainText('Last used');
		await expect(github.locator('svg')).toBeVisible();
		await expect(section.getByRole('button', { name: 'Continue with Google' })).not.toContainText('Last used');
	});

	test('Enter and Space press it; loading keeps the name, blocks a second press and clears when done', async ({ page }) => {
		const section = await openSection(page, 'provider-button');
		const google = section.getByRole('button', { name: 'Continue with Google' });
		const status = section.locator('p[aria-live=polite]');
		await google.focus();
		await press(page, 'Enter');
		await expect(google).toHaveAttribute('aria-busy', 'true');
		await expect(google).toHaveAccessibleName('Continue with Google');
		await expect(status).toHaveText('Starting google...');
		await press(page, 'Space');
		await expect(status).toHaveText('Starting google...');
		await expect(status).toHaveText('google finished');
		await expect(google).not.toHaveAttribute('aria-busy');
		await press(page, 'Space');
		await expect(status).toHaveText('Starting google...');
	});

	test('a provider with an href is a link, and a disabled one cannot be pressed', async ({ page }) => {
		const section = await openSection(page, 'provider-button');
		const sso = section.getByRole('link', { name: 'Continue with single sign-on' });
		await expect(sso).toHaveAttribute('href', '#provider-button');
		const gitlab = section.getByRole('button', { name: 'Continue with GitLab' });
		await expect(gitlab).toBeDisabled();
	});
});

test.describe('PasskeyButton', () => {
	test('reports the press, shows loading with its name kept, and ignores a second press', async ({ page }) => {
		const section = await openSection(page, 'passkey-button');
		const button = section.getByRole('button', { name: 'Sign in with a passkey' });
		const status = section.locator('p[aria-live=polite]');
		await button.focus();
		await press(page, 'Enter');
		await expect(button).toHaveAttribute('aria-busy', 'true');
		await expect(button).toHaveAccessibleName('Sign in with a passkey');
		await expect(status).toHaveText('Waiting for your device...');
		await press(page, 'Space');
		await expect(status).toHaveText('Your app would verify the passkey now.');
		await expect(button).not.toHaveAttribute('aria-busy');
	});

	test('without passkey support it hides by default, or stays visible but disabled', async ({ page }) => {
		await page.addInitScript(() => {
			Reflect.deleteProperty(window, 'PublicKeyCredential');
		});
		const section = await openSection(page, 'passkey-button');
		await expect(section.getByRole('button', { name: 'Sign in with a passkey' })).toHaveCount(0);
		const kept = section.getByRole('button', { name: 'Use a passkey (stays visible)' });
		await expect(kept).toBeVisible();
		await expect(kept).toBeDisabled();
	});
});
