import { expect, test } from '@playwright/test';
import { expectFocusReturns, openSection, press } from './helpers';

test('RiskToggle: Enter opens the risk panel and focuses its checkbox; Escape closes it and returns focus', async ({
	page
}) => {
	const section = await openSection(page, 'risk-toggle');
	const toggle = section.getByRole('switch');

	await expectFocusReturns(toggle, async () => {
		await press(page, 'Enter');
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(section.getByRole('checkbox')).toBeFocused();
		await press(page, 'Escape');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});
	await expect(section.getByRole('checkbox')).toHaveCount(0);
});
