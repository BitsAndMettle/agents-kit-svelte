import { expect, test } from '@playwright/test';
import { openSection, press } from './helpers';

test('CardFace: the title is the one tab stop, and the card opens from anywhere but its actions', async ({ page }) => {
	const section = await openSection(page, 'card-face');
	const title = section.getByRole('button', { name: 'Fix the flaky upload test' });
	const card = title.locator('xpath=ancestor::article[1]');
	const sendBack = card.getByRole('button', { name: 'Send back' });
	const status = (opened: number, sentBack: number) => card.getByText(`Opened ${opened} times, sent back ${sentBack} times`);
	await expect(status(0, 0)).toBeVisible();

	await sendBack.click();
	await expect(status(0, 1)).toBeVisible();

	// Empty space on the card reaches the title.
	const box = (await card.boundingBox())!;
	await page.mouse.click(box.x + box.width - 8, box.y + 8);
	await expect(status(1, 1)).toBeVisible();

	await title.focus();
	await press(page, 'Enter');
	await expect(status(2, 1)).toBeVisible();
	await press(page, 'Tab');
	await expect(sendBack).toBeFocused();
});

test('BoardLanes: a card that changes lane leaves one list for the other, and the counts follow', async ({ page }) => {
	const section = await openSection(page, 'board-lanes');
	const needsYou = section.getByRole('region', { name: 'Needs you' });
	const done = section.getByRole('region', { name: 'Done' });
	await expect(needsYou.getByRole('listitem')).toHaveCount(1);
	await expect(done.getByRole('listitem')).toHaveCount(1);
	// A lane with nothing in it is its heading and a count.
	await expect(section.getByRole('region', { name: 'Review' }).getByRole('list')).toHaveCount(0);

	await needsYou.getByRole('button', { name: 'Approve' }).click();
	await expect(needsYou.getByRole('listitem')).toHaveCount(0);
	await expect(needsYou.getByText('0', { exact: true })).toBeVisible();
	await expect(done.getByRole('listitem')).toHaveCount(2);
	await expect(done.getByRole('heading', { name: 'Rotate the signing key' })).toBeVisible();
});
