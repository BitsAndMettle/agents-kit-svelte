import { expect, test } from '@playwright/test';
import { openSection, press } from './helpers';

test('UsagePill: Enter opens the per-account breakdown, Space closes it, focus stays on the pill', async ({ page }) => {
	const section = await openSection(page, 'usage-pill');
	const pill = section.getByRole('button', { name: 'Claude Code · 2 of 3 free' });
	await pill.focus();
	await expect(pill).toHaveAttribute('aria-expanded', 'false');

	await press(page, 'Enter');
	await expect(pill).toHaveAttribute('aria-expanded', 'true');
	const panel = section.locator(`[id="${await pill.getAttribute('aria-controls')}"]`);
	await expect(panel.getByRole('progressbar')).toHaveCount(3);
	await expect(panel.getByRole('progressbar', { name: 'Spare usage' })).toHaveAttribute('aria-valuetext', '98%');
	await expect(pill).toBeFocused();

	await press(page, 'Space');
	await expect(pill).toHaveAttribute('aria-expanded', 'false');
	await expect(panel).toHaveCount(0);
	await expect(pill).toBeFocused();
});

test('UsageTable: on a phone the table scrolls inside its box and the page does not', async ({ page }) => {
	const section = await openSection(page, 'usage-table');
	await page.setViewportSize({ width: 390, height: 800 });
	const table = section.getByRole('table', { name: 'Claude Code accounts on the build box' });
	await table.scrollIntoViewIfNeeded();
	await expect(table.getByRole('progressbar', { name: 'Personal Week' })).toHaveAttribute('aria-valuetext', '34% left · Sat 20:00');
	const box = table.locator('xpath=..');
	await expect(box).toHaveCSS('overflow-x', 'auto');
	expect(await box.evaluate((root) => root.scrollWidth > root.clientWidth)).toBe(true);
	const edge = (await box.boundingBox())!;
	expect(edge.x + edge.width).toBeLessThanOrEqual(390);
	expect(await section.evaluate((root) => root.scrollWidth <= root.clientWidth)).toBe(true);
});
