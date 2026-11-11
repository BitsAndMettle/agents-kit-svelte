import { expect, test } from '@playwright/test';
import { openFixture } from './helpers';

test.beforeEach(async ({ page }) => {
	await openFixture(page);
});

test('roving toolbar: one tab stop, arrows skip disabled items, Home/End, Enter clicks', async ({ page }) => {
	const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
	const button = (name: string) => toolbar.getByRole('button', { name });
	await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);
	await button('Bold').focus();
	await page.keyboard.press('ArrowRight');
	await expect(button('Underline')).toBeFocused();
	await page.keyboard.press('End');
	await expect(button('Strike')).toBeFocused();
	await page.keyboard.press('ArrowRight');
	await expect(button('Bold')).toBeFocused();
	await page.keyboard.press('ArrowLeft');
	await expect(button('Strike')).toBeFocused();
	await expect(button('Strike')).toHaveAttribute('tabindex', '0');
	await page.keyboard.press('Enter');
	await expect(page.getByTestId('last-tool')).toHaveText('strike');
	await page.keyboard.press('s');
	await expect(button('Strike')).toBeFocused();
	await page.waitForTimeout(600); // let the typeahead buffer reset
	await page.keyboard.press('u');
	await expect(button('Underline')).toBeFocused();
});

test('active descendant: filtering revalidates the highlight so no stale id survives', async ({ page }) => {
	const input = page.getByRole('combobox', { name: 'Fruit' });
	const listbox = page.getByRole('listbox', { name: 'Fruits' });
	const activeText = () =>
		input.evaluate((el) => {
			const id = el.getAttribute('aria-activedescendant');
			return id ? (document.getElementById(id)?.textContent?.trim() ?? 'MISSING') : null;
		});

	await expect.poll(activeText).toBe('Apple'); // autoHighlight on mount
	await input.focus();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await expect.poll(activeText).toBe('Banana');
	await expect(listbox.getByRole('option', { name: 'Banana' })).toHaveAttribute('data-highlighted', '');

	await input.fill('blue');
	await expect.poll(activeText).toBe('Blueberry');
	await input.fill('zzz');
	await expect.poll(activeText).toBe(null);
	await input.fill('ch');
	await expect.poll(activeText).toBe('Cherry');
	await page.keyboard.press('Enter');
	await expect(page.getByTestId('picked')).toHaveText('Cherry');
	await expect(input).toBeFocused();
});
