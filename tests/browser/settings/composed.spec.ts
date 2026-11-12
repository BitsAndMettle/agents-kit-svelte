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

test('Composed settings: every component loads together and works with JavaScript', async ({ page }) => {
	const errors = watch(page);
	await page.goto('/fixtures/settings-composed/');
	// An instant toggle with no `action` waits for the page to be ready: enabled means hydrated.
	await expect(page.getByRole('switch', { name: 'Play a sound' })).toBeEnabled({ timeout: 45000 });
	await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();

	// A staged edit reaches the SaveBar, the navigation's dirty dot and the attention list.
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	await expect(page.getByText('1 unsaved change', { exact: true })).toBeVisible();
	await expect(page.locator('[data-settings-rail]').getByText('Unsaved changes.')).toBeAttached();
	await expect(page.getByTestId('composed-page').getByText('Unsaved policy changes')).toBeVisible();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByTestId('composed-log')).toContainText('Workspace name → Harbor Crew');

	// The page scope's lock reaches the staged rows.
	await page.getByTestId('as-viewer').check();
	await expect(page.getByRole('textbox', { name: 'Workspace name' })).toBeDisabled();
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
		// Buttons that only call back (no native path) wait, soft-disabled, until the page is interactive.
		for (const name of ['Send again for Storage region', 'Cancel request for Storage region']) {
			await expect(page.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');
		}
		expect(errors).toEqual([]);
	});
});
