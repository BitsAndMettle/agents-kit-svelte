import { expect, test } from '@playwright/test';
import { content, expectShown, isShown, logEntries, openFixture, trigger } from './helpers';

test.describe('headless layers', () => {
	test.beforeEach(async ({ page }) => {
		await openFixture(page);
	});

	test('Escape closes the popover inside the dialog first, then the dialog', async ({ page }) => {
		await trigger(page, 'settings').click();
		await expectShown(content(page, 'settings'), true);
		await trigger(page, 'inner').click();
		await expectShown(content(page, 'inner'), true);
		await expect(content(page, 'inner')).toBeFocused();

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'inner'), false);
		expect(await isShown(content(page, 'settings'))).toBe(true);
		await expect(trigger(page, 'inner')).toBeFocused();

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'settings'), false);
		await expect(trigger(page, 'settings')).toBeFocused();
		await expect(page.getByTestId('settings-open')).toHaveText('closed');
		expect(await logEntries(page)).toEqual([
			'settings:open:trigger',
			'inner:open:trigger',
			'inner:closed:escape',
			'settings:closed:escape'
		]);
	});

	test('an outside press closes only the layers above the press', async ({ page }) => {
		await trigger(page, 'settings').click();
		await trigger(page, 'inner').click();
		await expectShown(content(page, 'inner'), true);

		await page.getByTestId('settings-description').click();
		await expectShown(content(page, 'inner'), false);
		expect(await isShown(content(page, 'settings'))).toBe(true);
		expect(await logEntries(page)).toContain('inner:closed:outside');
		await page.keyboard.press('Escape');
		await expectShown(content(page, 'settings'), false);

		await trigger(page, 'page').click();
		await expectShown(content(page, 'page'), true);
		await page.getByTestId('page-heading').click();
		await expectShown(content(page, 'page'), false);
		expect(await logEntries(page)).toContain('page:closed:outside');
	});

	test('pressing the dialog padding keeps it open; pressing the backdrop closes it', async ({ page }) => {
		await trigger(page, 'settings').click();
		const dialog = content(page, 'settings');
		await expectShown(dialog, true);

		await dialog.click({ position: { x: 3, y: 3 } });
		await page.waitForTimeout(250);
		expect(await isShown(dialog)).toBe(true);

		await page.mouse.click(5, 790);
		await expectShown(dialog, false);
		expect(await logEntries(page)).toContain('settings:closed:outside');
		await expect(trigger(page, 'settings')).toBeFocused();
	});

	test('alertdialog ignores the backdrop, focuses autofocus, and honours Escape', async ({ page }) => {
		await trigger(page, 'alert').click();
		const dialog = page.getByRole('alertdialog', { name: 'Delete this run?' });
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAccessibleDescription('This removes the run and its logs.');
		await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();

		await page.mouse.click(5, 790);
		await page.waitForTimeout(250);
		expect(await isShown(content(page, 'alert'))).toBe(true);

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'alert'), false);
		await expect(trigger(page, 'alert')).toBeFocused();
	});

	test('Tab never leaves the modal, and the page is scroll-locked while it is open', async ({ page }) => {
		await trigger(page, 'settings').click();
		await expectShown(content(page, 'settings'), true);
		expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');

		await page.evaluate(() => {
			(window as unknown as { focusLog: string[] }).focusLog = [];
			document.addEventListener('focusin', (event) => {
				const el = event.target as HTMLElement;
				(window as unknown as { focusLog: string[] }).focusLog.push(el.closest('dialog') ? 'inside' : el.outerHTML.slice(0, 60));
			});
		});
		for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
		for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+Tab');
		const log = await page.evaluate(() => (window as unknown as { focusLog: string[] }).focusLog);
		expect(log.length).toBeGreaterThan(3);
		expect(log.filter((entry) => entry !== 'inside')).toEqual([]);

		await page.keyboard.press('Escape');
		await expectShown(content(page, 'settings'), false);
		expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
	});

	test('focus returns to the re-rendered trigger when the original was re-keyed', async ({ page }) => {
		const original = await trigger(page, 'rekeyed').elementHandle();
		await trigger(page, 'rekeyed').click();
		await expectShown(content(page, 'rekeyed'), true);
		await page.getByRole('button', { name: 'Re-key trigger' }).click();
		await expect(trigger(page, 'rekeyed')).toHaveAttribute('data-version', '1');
		expect(await original!.evaluate((el) => el.isConnected)).toBe(false);

		await page.getByRole('button', { name: 'Close re-keyed' }).click();
		await expectShown(content(page, 'rekeyed'), false);
		await expect(trigger(page, 'rekeyed')).toBeFocused();
		expect(await logEntries(page)).toContain('rekeyed:closed:close-button');
	});

	test('open and close are idempotent when the trigger is spammed', async ({ page }) => {
		const popover = content(page, 'page');
		const button = trigger(page, 'page');
		for (let i = 0; i < 5; i++) await button.click({ delay: 0 });
		await expectShown(popover, true);
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		await expect(popover).toHaveAttribute('data-state', 'open');

		await button.click();
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await expectShown(popover, false);
		await expect(popover).toHaveAttribute('data-state', 'closed');

		// Two API writes in one handler open it once; one Escape closes it.
		await page.getByRole('button', { name: 'Open page popover twice' }).click();
		await expectShown(popover, true);
		await page.keyboard.press('Escape');
		await expectShown(popover, false);
		const opens = (await logEntries(page)).filter((e) => e === 'page:open:api');
		expect(opens).toHaveLength(1);
	});

	test('a native dialog.close() is reconciled into pattern state', async ({ page }) => {
		await trigger(page, 'settings').click();
		await trigger(page, 'inner').click();
		await expectShown(content(page, 'inner'), true);

		await content(page, 'settings').evaluate((el) => (el as HTMLDialogElement).close());
		await expect(page.getByTestId('settings-open')).toHaveText('closed');
		await expect(trigger(page, 'settings')).toHaveAttribute('aria-expanded', 'false');
		await expectShown(content(page, 'inner'), false);
		const log = await logEntries(page);
		expect(log).toContain('settings:closed:native');
		// close() moves focus back to the page trigger first, so the inner popover closes
		// by focus-out (or by 'parent' if focus stayed put); either way it is closed.
		expect(log.some((e) => e === 'inner:closed:focus-out' || e === 'inner:closed:parent')).toBe(true);
		await expect(trigger(page, 'settings')).toBeFocused();
		expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');

		// And it opens again normally afterwards.
		await trigger(page, 'settings').click();
		await expectShown(content(page, 'settings'), true);
	});
});
