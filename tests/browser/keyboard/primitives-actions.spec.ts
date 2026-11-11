import { expect, test } from '@playwright/test';
import { openSection, press } from './helpers';

test('Button: Enter and Space activate; loading blocks activation but keeps focus', async ({ page }) => {
	const section = await openSection(page, 'button');
	const send = section.getByTestId('send');
	const count = section.getByTestId('send-count');

	await send.focus();
	await press(page, 'Enter');
	await expect(count).toHaveText('Sent 1 time');
	await expect(send).toHaveAttribute('aria-busy', 'true');
	await expect(send).toBeFocused();

	const before = await send.boundingBox();
	await press(page, 'Enter', 'Space');
	await expect(count).toHaveText('Sent 1 time');
	await send.click({ force: true });
	await expect(count).toHaveText('Sent 1 time');
	const after = await send.boundingBox();
	expect(after?.width).toBe(before?.width);

	// The demo clears loading after a moment; then Space activates again.
	await expect(send).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
	await press(page, 'Space');
	await expect(count).toHaveText('Sent 2 times');
});

test('Button: a disabled button and a disabled link cannot be reached or followed', async ({ page }) => {
	const section = await openSection(page, 'button');
	const disabled = section.getByRole('button', { name: 'Disabled', exact: true });
	await expect(disabled).toBeDisabled();

	const link = section.getByTestId('link');
	const dead = section.getByTestId('disabled-link');
	await expect(link).toHaveAttribute('href', '#button');
	await expect(dead).not.toHaveAttribute('href');
	await expect(dead).toHaveAttribute('aria-disabled', 'true');

	// Tab runs send, (disabled button skipped), link, then leaves the group: never lands on the dead link.
	await section.getByTestId('send').focus();
	await press(page, 'Tab');
	await expect(link).toBeFocused();
	await press(page, 'Tab');
	await expect(dead).not.toBeFocused();
});

test('IconButton: has an accessible name and activates from the keyboard', async ({ page }) => {
	const section = await openSection(page, 'icon-button');
	const copy = section.getByRole('button', { name: 'Copy', exact: true });
	await copy.focus();
	await press(page, 'Enter');
	await expect(copy).toHaveAttribute('aria-busy', 'true');
	await expect(copy).toBeFocused();
	await expect(copy).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
});

test('ButtonGroup: is a named group and every button is its own tab stop', async ({ page }) => {
	const section = await openSection(page, 'button-group');
	const group = section.getByRole('group', { name: 'Run controls' });
	await expect(group.getByRole('button')).toHaveCount(3);
	await group.getByRole('button', { name: 'Pause' }).focus();
	await press(page, 'Tab');
	await expect(group.getByRole('button', { name: 'Retry' })).toBeFocused();
});

test('Toggle: Space and Enter flip aria-pressed and the bound state follows', async ({ page }) => {
	const section = await openSection(page, 'toggle');
	const bold = section.getByRole('button', { name: 'Bold', exact: true });
	const state = section.getByTestId('toggle-state');
	await bold.focus();
	await expect(bold).toHaveAttribute('aria-pressed', 'false');
	await press(page, 'Space');
	await expect(bold).toHaveAttribute('aria-pressed', 'true');
	await expect(state).toContainText('Bold on');
	await press(page, 'Enter');
	await expect(bold).toHaveAttribute('aria-pressed', 'false');
	await expect(state).toContainText('Bold off');
});

test('ToggleGroup: arrows, Home and End move focus without pressing; Space presses', async ({ page }) => {
	const section = await openSection(page, 'toggle-group');
	const view = section.getByRole('group', { name: 'View' });
	const list = view.getByRole('button', { name: 'List' });
	const board = view.getByRole('button', { name: 'Board' });
	const graph = view.getByRole('button', { name: 'Graph' });

	await expect(list).toHaveAttribute('aria-pressed', 'true');
	await list.focus();
	await press(page, 'ArrowRight');
	await expect(board).toBeFocused();
	await expect(board).toHaveAttribute('aria-pressed', 'false');
	// The disabled Timeline is skipped.
	await press(page, 'ArrowRight');
	await expect(graph).toBeFocused();
	await press(page, 'ArrowRight');
	await expect(list).toBeFocused();
	await press(page, 'End');
	await expect(graph).toBeFocused();
	await press(page, 'Home');
	await expect(list).toBeFocused();

	// Single mode: Space on another item moves the selection; on the pressed one, releases it.
	await press(page, 'ArrowRight', 'Space');
	await expect(board).toHaveAttribute('aria-pressed', 'true');
	await expect(list).toHaveAttribute('aria-pressed', 'false');
	await expect(section.getByTestId('view-state')).toContainText('View board');
	await press(page, 'Space');
	await expect(board).toHaveAttribute('aria-pressed', 'false');
});

test('ToggleGroup: multiple mode keeps several pressed, and the group is one tab stop', async ({ page }) => {
	const section = await openSection(page, 'toggle-group');
	const marks = section.getByRole('group', { name: 'Text marks' });
	const bold = marks.getByRole('button', { name: 'Bold' });
	const italic = marks.getByRole('button', { name: 'Italic' });

	await expect(bold).toHaveAttribute('aria-pressed', 'true');
	await bold.focus();
	await press(page, 'ArrowRight', 'Space');
	await expect(italic).toHaveAttribute('aria-pressed', 'true');
	await expect(bold).toHaveAttribute('aria-pressed', 'true');
	await expect(section.getByTestId('view-state')).toContainText('marks bold, italic');

	// Tab leaves the group in one step.
	await press(page, 'Tab');
	await expect(marks.getByRole('button').filter({ has: page.locator(':focus') })).toHaveCount(0);
});
