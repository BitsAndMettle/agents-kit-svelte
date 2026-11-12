import { expect, test, type Page } from '@playwright/test';

/** Collects page errors and console errors while the composed settings fixture is open. */
function watch(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

/** Opens the fixture and waits for hydration: an instant toggle with no `action` waits for the page to be ready. */
async function open(page: Page): Promise<void> {
	await page.goto('/fixtures/settings-composed/');
	await expect(page.getByRole('switch', { name: 'Play a sound' })).toBeEnabled({ timeout: 45000 });
}

/**
 * The fake server answers after 600 ms. A test that looks at an in-flight state owns that time:
 * the clock is installed before the page loads and paused once it is ready.
 */
async function openOnClock(page: Page): Promise<void> {
	await page.clock.install();
	await open(page);
	// The installed clock runs with real time until now, so a moment a little ahead of it is never in its past.
	await page.clock.pauseAt(new Date(Date.now() + 5000));
}

const rail = (page: Page) => page.locator('[data-settings-rail]');

test('Composed settings: every component loads together and works with JavaScript', async ({ page }) => {
	const errors = watch(page);
	await open(page);
	await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();

	// A staged edit reaches the SaveBar, the navigation's dirty dot and the attention list.
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	await expect(page.getByText('1 unsaved change', { exact: true })).toBeVisible();
	await expect(rail(page).getByText('Unsaved changes.')).toBeAttached();
	await expect(page.getByTestId('composed-page').getByText('Unsaved policy changes')).toBeVisible();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByTestId('composed-log')).toContainText('Workspace name → Harbor Crew');

	// The page scope's lock reaches the staged rows.
	await page.getByTestId('as-viewer').check();
	await expect(page.getByRole('textbox', { name: 'Workspace name' })).toBeDisabled();
	expect(errors).toEqual([]);
});

test('Composed settings: "Save and leave" while a save is in flight waits for it, then leaves', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.clock.runFor(100);
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	// Let the dialog open (still well inside the save's 600 ms).
	await page.clock.runFor(100);
	const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Save and leave' }).click();
	await page.clock.runFor(50);
	// The save already sent is waited for, not reported as a failure while it runs.
	await expect(dialog.getByText("Couldn't save")).toHaveCount(0);
	await page.clock.runFor(1000);
	await expect(page).toHaveURL(/section=members/);
	await expect(page.getByTestId('composed-log')).toHaveText('Saved revision 5: Workspace name → Racing');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: "Save and leave" saves edits made while the first save was in flight, then leaves', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	const name = page.getByRole('textbox', { name: 'Workspace name' });
	await name.fill('Racing');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.clock.runFor(100);
	// Typed while "Racing" is still being saved: not part of that save.
	await name.fill('Racing Two');
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	await page.clock.runFor(100);
	const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Save and leave' }).click();
	// The first save settles at 600 ms, then the newer edit is saved (another 600 ms).
	await page.clock.runFor(2400);
	await expect(page).toHaveURL(/section=members/);
	await expect(page.getByTestId('composed-log')).toHaveText('Saved revision 6: Workspace name → Racing Two');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: when "Save and leave" fails, Keep editing focuses the invalid field', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByTestId('reject-role').check();
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	await page.clock.runFor(100);
	const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Save and leave' }).click();
	await page.clock.runFor(1000);
	await expect(dialog.getByText("Couldn't save")).toBeVisible();
	await dialog.getByRole('button', { name: 'Keep editing' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).not.toHaveURL(/section=members/);
	// The radio group carries aria-invalid but cannot take focus: its checked radio does, not the rail link that opened the dialog.
	const group = page.getByRole('radiogroup', { name: 'Default role' });
	await expect(group).toHaveAttribute('aria-invalid', 'true');
	await expect(group.getByRole('radio', { name: /^Member/ })).toBeFocused();
	expect(errors).toEqual([]);
});

test('Composed settings: an attention item whose dismissal answers with a conflict stays, with the conflict announced', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	const attention = page.getByTestId('composed-page').getByTestId('composed-attention');
	const item = attention.locator('[data-attention-item="region"]');
	await item.getByRole('button', { name: /^Dismiss/ }).click();
	await page.clock.runFor(700);
	// A conflict is a failure even without an `error`: its message is the alert.
	await expect(item.getByRole('alert')).toHaveText('An administrator answered this a moment ago. Reload to see it.');
	await expect(item).toBeVisible();
	expect(errors).toEqual([]);
});

test('Composed settings: leaving without saving clears the dirty dot and the unsaved attention item', async ({ page }) => {
	const errors = watch(page);
	await open(page);
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	const workspace = rail(page).getByRole('link', { name: /^Workspace/ });
	await expect(workspace).toContainText('Unsaved changes.');
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Leave without saving' }).click();
	await expect(page).toHaveURL(/section=members/);
	// The form is gone, so nothing is unsaved: no dot, and no attention item pointing at #policy.
	await expect(workspace).not.toContainText('Unsaved changes.');
	await expect(page.getByText('Unsaved policy changes')).toHaveCount(0);
	await expect(page.locator('a[href="#policy"]')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: a failed save on a radio group focuses its checked radio', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByTestId('reject-role').check();
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.clock.runFor(700);
	await expect(page.getByText('Pick a role your plan allows.').first()).toBeVisible();
	const group = page.getByRole('radiogroup', { name: 'Default role' });
	await expect(group).toHaveAttribute('aria-invalid', 'true');
	await expect(group.getByRole('radio', { name: /^Member/ })).toBeFocused();
	expect(errors).toEqual([]);
});

test('Composed settings: callback-only actions are available once the page is ready', async ({ page }) => {
	const errors = watch(page);
	await open(page);
	await expect(page.getByRole('button', { name: 'Regenerate' })).not.toHaveAttribute('aria-disabled', 'true');
	await expect(page.getByRole('button', { name: 'Add seats' })).not.toHaveAttribute('aria-disabled', 'true');
	expect(errors).toEqual([]);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('Composed settings: the server render is complete and the staged form posts natively', async ({ page }) => {
		const errors = watch(page);
		await page.goto('/fixtures/settings-composed/');
		await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();
		const form = page.getByTestId('composed-form');
		await expect(form).toHaveAttribute('method', 'post');
		await expect(form.locator('input[name="revision"]')).toHaveValue('4');
		await expect(form.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
		await expect(page.getByRole('searchbox', { name: 'Search settings' })).toBeVisible();
		await expect(page.getByRole('meter', { name: 'Seats' })).toBeVisible();
		expect(await page.locator('form form').count()).toBe(0);
		expect(errors).toEqual([]);
	});

	test('Composed settings: filtering members without JavaScript keeps the page on its section', async ({ page }) => {
		await page.goto('/fixtures/settings-composed/?section=workspace');
		const members = page.getByTestId('composed-members');
		await members.getByRole('searchbox', { name: 'Filter' }).fill('ada');
		await members.getByRole('button', { name: 'Filter', exact: true }).click();
		await expect(page).toHaveURL(/[?&]section=workspace(&|$)/);
		await expect(page).toHaveURL(/[?&]member=ada(&|$)/);
		await expect(page.getByTestId('composed-members')).toBeVisible();
	});

	test('Composed settings: actions that only call back are unavailable, not silently dead', async ({ page }) => {
		await page.goto('/fixtures/settings-composed/');
		await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Regenerate' })).toHaveAttribute('aria-disabled', 'true');
		await expect(page.getByRole('button', { name: 'Add seats' })).toHaveAttribute('aria-disabled', 'true');
		// A link still works without JavaScript.
		await expect(page.getByRole('link', { name: 'View' })).toHaveAttribute('href', /dialog=recovery-codes/);
	});
});
