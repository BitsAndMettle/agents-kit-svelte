import { expect, test, type Locator } from '@playwright/test';
import { openSection, press } from './helpers';

/** The card root around a control: the nearest ancestor that is positioned (`relative`). */
function cardOf(control: Locator): Locator {
	return control.locator('xpath=ancestor::div[contains(@class,"relative")][1]');
}

test('Avatar: a failing image falls back to initials without changing the size', async ({ page }) => {
	const section = await openSection(page, 'avatar');
	const broken = section.locator('span.inline-flex.size-8').filter({ hasText: 'Broken image' });
	await expect(broken.locator('img')).toHaveCount(0);
	await expect(broken.getByText('BI', { exact: true })).toBeVisible();
	const box = await broken.boundingBox();
	const reference = await section.locator('span.inline-flex.size-8').filter({ hasText: 'Grace Hopper' }).boundingBox();
	expect(box?.width).toBe(reference?.width);
	expect(box?.height).toBe(reference?.height);
	await expect(section.getByRole('img', { name: 'Photo' })).toBeVisible();
});

test('Avatar: status is spoken as text and a named neighbour makes it decorative', async ({ page }) => {
	const section = await openSection(page, 'avatar');
	await expect(section.getByText('In a meeting')).toBeAttached();
	await expect(section.locator('span.sr-only', { hasText: 'Ada Lovelace' }).first()).toBeAttached();
	await expect(section.locator('span.sr-only', { hasText: 'Dana Scully' })).toHaveCount(0);
	// A decorative avatar is silent, status included: only the one with a name and no decorative flag speaks.
	await expect(section.locator('span.sr-only', { hasText: 'online' })).toHaveCount(1);
});

test('AvatarGroup: is a list of named people and announces the overflow', async ({ page }) => {
	const section = await openSection(page, 'avatar-group');
	const list = section.getByRole('list', { name: 'Reviewers' });
	await expect(list.getByRole('listitem')).toHaveCount(5);
	await expect(list.getByText('Ada Lovelace')).toBeAttached();
	await expect(list.getByText('and 2 more: Dana Scully, Alan Turing')).toBeAttached();
	await expect(list.getByText('+2', { exact: true })).toBeVisible();
});

test('Card: one tab stop for the link card and the whole card is clickable', async ({ page }) => {
	const section = await openSection(page, 'card');
	const linkCard = section.getByRole('link', { name: 'Open the board' });
	// The card itself adds one tab stop (the title link); the link in its body is the only other.
	await expect(cardOf(linkCard).locator('a')).toHaveCount(2);
	await linkCard.focus();
	await press(page, 'Tab');
	await expect(section.getByRole('link', { name: 'a link in the body' })).toBeFocused();
	await press(page, 'Tab');
	await expect(section.getByRole('button', { name: 'Open settings' })).toBeFocused();
	await press(page, 'Tab');
	await expect(section.getByRole('button', { name: 'Pin' })).toBeFocused();

	const buttonCard = cardOf(section.getByRole('button', { name: 'Open settings' }));
	await expect(buttonCard.getByText('Opened 0 times.')).toBeVisible();
	const box = (await buttonCard.boundingBox())!;
	await page.mouse.click(box.x + box.width / 2, box.y + box.height - 8);
	await expect(buttonCard.getByText('Opened 1 times.')).toBeVisible();
	await section.getByRole('button', { name: 'Open settings' }).focus();
	await press(page, 'Enter');
	await expect(buttonCard.getByText('Opened 2 times.')).toBeVisible();
});

test('Card: a link inside the body of a link card is clickable, empty space still opens the card', async ({ page }) => {
	const section = await openSection(page, 'card');
	const inner = section.getByRole('link', { name: 'a link in the body' });
	await expect(inner).toBeVisible();
	await inner.click();
	await expect(page).toHaveURL(/#card-inner$/);
	const outer = section.getByRole('link', { name: 'Open the board' });
	const box = (await cardOf(outer).boundingBox())!;
	await page.mouse.click(box.x + box.width - 8, box.y + box.height - 8);
	await expect(page).toHaveURL(/#card$/);
});

test('Card: an action inside the card does not trigger the card', async ({ page }) => {
	const section = await openSection(page, 'card');
	const buttonCard = cardOf(section.getByRole('button', { name: 'Open settings' }));
	await buttonCard.getByRole('button', { name: 'Pin' }).click();
	await expect(buttonCard.getByText('Opened 0 times.')).toBeVisible();
});

test('Alert: dismiss calls back, and a live alert is announced as an alert', async ({ page }) => {
	const section = await openSection(page, 'alert');
	await expect(section.getByRole('alert')).toHaveCount(0);
	await section.getByRole('button', { name: 'Trigger live alert' }).click();
	await expect(section.getByRole('alert')).toContainText('Deploy failed');

	await section.getByRole('button', { name: 'Dismiss' }).click();
	await expect(section.getByText('Dismissible')).toHaveCount(0);
	await expect(section.getByRole('button', { name: 'Show it again' })).toBeVisible();
});

test('Alert: the dismiss button works from the keyboard', async ({ page }) => {
	const section = await openSection(page, 'alert');
	await section.getByRole('button', { name: 'Dismiss' }).focus();
	await press(page, 'Enter');
	await expect(section.getByText('Dismissible')).toHaveCount(0);
});

test('Progress: value, range and text are exposed to assistive technology', async ({ page }) => {
	const section = await openSection(page, 'progress');
	const upload = section.getByRole('progressbar', { name: 'Upload' });
	await expect(upload).toHaveAttribute('aria-valuenow', '40');
	await expect(upload).toHaveAttribute('aria-valuemin', '0');
	await expect(upload).toHaveAttribute('aria-valuemax', '100');
	await expect(upload).toHaveAttribute('aria-valuetext', '40%');

	const tasks = section.getByRole('progressbar', { name: 'Tasks done' });
	await expect(tasks).toHaveAttribute('aria-valuenow', '7');
	await expect(tasks).toHaveAttribute('aria-valuetext', '7 of 10 (70%)');

	const waiting = section.getByRole('progressbar', { name: 'Waiting for the runner' });
	await expect(waiting).not.toHaveAttribute('aria-valuenow', /.*/);

	await section.getByRole('slider').focus();
	await press(page, 'ArrowRight');
	await expect(upload).toHaveAttribute('aria-valuenow', '41');
});

test('Spinner and Skeleton: named images by default, live region only on request and filled after mount', async ({ page }) => {
	const spinners = await openSection(page, 'spinner');
	await expect(spinners.getByRole('img', { name: 'Loading small' })).toHaveCount(1);
	await expect(spinners.getByRole('button', { name: 'Saving' }).getByRole('img')).toHaveCount(0);
	// Only the opt-in spinner has a live region, and it gets its text after mounting.
	const live = spinners.getByRole('status');
	await expect(live).toHaveCount(1);
	await expect(live).toHaveText('Syncing');

	const skeleton = await openSection(page, 'skeleton');
	const busy = skeleton.locator('[aria-busy="true"]');
	await expect(busy).toHaveCount(1);
	await expect(busy.getByRole('status')).toHaveCount(0);
	await expect(busy.getByText('Loading profile')).toBeAttached();
	await expect(busy.locator('[aria-hidden="true"]').first()).toBeAttached();
});

test('Kbd: a combination is one kbd per key, Mac symbols keep a spoken name', async ({ page }) => {
	const section = await openSection(page, 'kbd');
	await expect(section.locator('kbd kbd').filter({ hasText: 'Ctrl' }).first()).toBeVisible();
	await expect(section.getByText('Command', { exact: true })).toBeAttached();
	await expect(section.getByText('Option', { exact: true })).toBeAttached();
});

test('Separator: decorative by default, semantic when asked', async ({ page }) => {
	const section = await openSection(page, 'separator');
	await expect(section.getByRole('separator')).toHaveCount(1);
	await expect(section.getByRole('separator', { name: 'End of section' })).toHaveAttribute('aria-orientation', 'horizontal');
});
