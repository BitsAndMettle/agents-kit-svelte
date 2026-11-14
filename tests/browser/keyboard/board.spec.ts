import { expect, test } from '@playwright/test';
import { hold, openOnClock, openSection, press } from './helpers';

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

test('CardSheet: a card opens as a sheet named by it, with its facts as a list, and closing it returns to the card', async ({ page }) => {
	const section = await openSection(page, 'card-sheet');
	const card = section.getByRole('button', { name: 'Render the digest template' });
	await card.focus();
	await press(page, 'Enter');
	const sheet = page.getByRole('dialog', { name: 'Render the digest template' });
	await expect(sheet).toBeVisible();
	await expect(sheet.getByText('#217', { exact: true })).toBeVisible();
	await expect(sheet.getByText('Waiting for your approval')).toBeVisible();
	// Each fact is a term and its value, in order.
	await expect(sheet.getByRole('term')).toHaveText(['Pull request', 'Checks', 'Risk', 'Head']);
	await expect(sheet.getByRole('definition')).toHaveText(['#57', 'Passed', 'Medium', '9f2c1ab']);
	// Focus starts on what the sheet says, not on a control in it: the next Tab reaches the first one.
	await expect(sheet.locator(':focus')).toContainText('Pull request');
	await press(page, 'Tab');
	await expect(sheet.getByRole('link', { name: '#57' })).toBeFocused();

	// An action is given the function that closes the sheet, and focus goes back to the card.
	await sheet.getByRole('button', { name: 'Done' }).click();
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(card).toBeFocused();
	await press(page, 'Enter');
	await expect(sheet).toBeVisible();
	await press(page, 'Escape');
	await expect(page.locator('dialog[open]')).toHaveCount(0);
	await expect(card).toBeFocused();
});

test('CardSheet: an answer is asked once and the question is busy until it is stored; a refused one leaves the question', async ({ page }) => {
	const section = await openOnClock(page, 'card-sheet');
	const sheet = page.getByRole('dialog', { name: 'Rotate the signing key' });
	// By its whole name: the longest option also names both keys.
	const option = (name: string) => sheet.getByRole('button', { name, exact: true });
	const question = option('The signing key').locator('xpath=ancestor::*[@aria-busy][1]');
	// Enter pressed twice on the card opens the sheet and answers nothing.
	await section.getByRole('button', { name: 'Rotate the signing key' }).focus();
	await press(page, 'Enter', 'Enter');
	await expect(question).toContainText('Which one should this card rotate?');
	await expect(question).toHaveAttribute('aria-busy', 'false');

	// The demo's server refuses this one. While it is asked, no other answer is taken.
	await hold(page);
	await option('The webhook secret').click();
	await expect(question).toHaveAttribute('aria-busy', 'true');
	await expect(option('The webhook secret')).toHaveAttribute('aria-busy', 'true');
	await expect(option('The signing key')).toHaveAttribute('aria-disabled', 'true');
	await option('The signing key').click({ force: true });
	await page.clock.runFor(1000);
	await expect(question).toHaveAttribute('aria-busy', 'false');
	await expect(sheet.getByText('This card may not touch the webhook secret.')).toBeVisible();
	await expect(sheet.getByText('Needs your answer')).toBeVisible();
	await expect(option('The signing key')).toBeEnabled();

	// From the keyboard. This one is stored: the card moves on and the question is gone.
	await option('The signing key').focus();
	await press(page, 'Enter');
	await expect(option('The signing key')).toHaveAttribute('aria-busy', 'true');
	await page.clock.runFor(1000);
	await expect(sheet.getByText('Ready', { exact: true })).toBeVisible();
	await expect(sheet.getByRole('definition')).toHaveText(['Key hygiene', 'The signing key']);
	await expect(sheet.locator('[aria-busy]')).toHaveCount(0);
	// The pressed option went with its question, so focus is on what the sheet now says.
	await expect(sheet.locator(':focus')).toContainText('The signing key');
});

test('CardSheet: on a phone the sheet fits the screen, and an option that is a sentence wraps inside it', async ({ page }) => {
	const section = await openSection(page, 'card-sheet');
	await page.setViewportSize({ width: 390, height: 800 });
	const card = section.getByRole('button', { name: 'Rotate the signing key' });
	await card.scrollIntoViewIfNeeded();
	await card.click();
	const sheet = page.getByRole('dialog', { name: 'Rotate the signing key' });
	// Once it has slid in, all of it is on screen.
	await expect.poll(async () => ((box) => (box ? box.x + box.width : Infinity))(await sheet.boundingBox())).toBeLessThanOrEqual(390);
	expect((await sheet.boundingBox())!.x).toBeGreaterThanOrEqual(0);
	const short = (await sheet.getByRole('button', { name: 'The signing key', exact: true }).boundingBox())!;
	const long = (await sheet.getByRole('button', { name: /^Both, in one pull request/ }).boundingBox())!;
	// The options are rows of one width; the long one is taller, not wider.
	expect(long.width).toBe(short.width);
	expect(long.height).toBeGreaterThan(short.height * 1.5);
	expect(await sheet.evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
});
