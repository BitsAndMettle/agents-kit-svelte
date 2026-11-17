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
	await expect(panel.getByRole('progressbar', { name: 'Spare usage' })).toHaveAttribute('aria-valuetext', 'Past the 98% switch point');
	await expect(pill).toBeFocused();

	await press(page, 'Space');
	await expect(pill).toHaveAttribute('aria-expanded', 'false');
	await expect(panel).toHaveCount(0);
	await expect(pill).toBeFocused();
});
