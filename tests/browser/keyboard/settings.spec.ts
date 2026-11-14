import { expect, test } from '@playwright/test';
import { hold, openOnClock, press } from './helpers';

/** Longer than the demos' 800 ms "server". */
const SAVED = 1000;

test('SettingsForm: a change shows at once, stays once it is saved, and snaps back when it is refused', async ({ page }) => {
	const section = await openOnClock(page, 'settings-form');
	const holds = section.getByRole('switch', { name: 'Hold protected changes' });
	const form = holds.locator('xpath=ancestor::ul[1]');
	const note = section.getByRole('status');
	await expect(holds).toBeChecked();
	await expect(holds).toHaveAccessibleDescription('A change to a protected path waits for your approval.');
	await expect(form).toHaveAttribute('aria-busy', 'false');

	await hold(page);
	await holds.click();
	await expect(holds).not.toBeChecked();
	await expect(form).toHaveAttribute('aria-busy', 'true');
	await expect(note).toHaveText('Nothing changed yet.');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Saved holds: false');
	await expect(form).toHaveAttribute('aria-busy', 'false');
	await expect(holds).not.toBeChecked();

	// The demo's server refuses this one: the switch shows the change while it is asked, then snaps back, focus kept.
	const share = section.getByRole('switch', { name: 'Share runs publicly' });
	await share.focus();
	await press(page, 'Space');
	await expect(share).toBeChecked();
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Refused: runs stay private.');
	await expect(share).not.toBeChecked();
	await expect(share).toBeFocused();
});

test('SettingsForm: a number, a choice and a text are saved once they are committed, and a number out of range never is', async ({ page }) => {
	const section = await openOnClock(page, 'settings-form');
	const limit = section.getByRole('spinbutton', { name: 'Daily run limit' });
	const note = section.getByRole('status');
	await expect(limit).toHaveValue('40');
	await expect(limit).toHaveAccessibleDescription('The most runs started per day, up to 500.');
	await hold(page);

	// Typing reports nothing; leaving the box does.
	await limit.fill('120');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Nothing changed yet.');
	await press(page, 'Tab');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Saved limit: 120');
	await expect(limit).toHaveValue('120');

	// 900 is over the most the setting allows: the browser says so, focus comes back to the box and nothing is saved.
	await limit.fill('900');
	await press(page, 'Tab');
	await expect(limit).toBeFocused();
	expect(await limit.evaluate((input: HTMLInputElement) => input.validity.rangeOverflow)).toBe(true);
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Saved limit: 120');

	await section.getByRole('combobox', { name: 'Model' }).selectOption('deep');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Saved model: deep');

	await section.getByRole('textbox', { name: 'Branch prefix' }).fill('bot/');
	await press(page, 'Tab');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Saved prefix: bot/');
	// What was typed and refused is still in its box, for the person to fix.
	await expect(limit).toHaveValue('900');
});

test('TierMatrix: a preset and a single tier both save the whole value, and a locked tier stays as it is', async ({ page }) => {
	const section = await openOnClock(page, 'tier-matrix');
	const presets = section.getByRole('group', { name: 'Presets' });
	const matrix = presets.locator('xpath=ancestor::*[@aria-busy][1]');
	const preset = (name: string) => presets.getByRole('button', { name });
	const tier = (name: string) => section.getByRole('radiogroup', { name });
	const note = section.getByRole('status');
	await expect(note).toHaveText('Merges on its own: low.');
	await expect(tier('Low risk')).toHaveAccessibleDescription('Docs, comments and tests.');
	// What is saved matches neither preset.
	await expect(preset('Careful')).toHaveAttribute('aria-pressed', 'false');
	await expect(preset('Balanced')).toHaveAttribute('aria-pressed', 'false');

	// One press sets several tiers. The choice shows at once and is saved as one value.
	await hold(page);
	await preset('Balanced').click();
	await expect(preset('Balanced')).toHaveAttribute('aria-pressed', 'true');
	await expect(tier('Medium risk').getByRole('radio', { name: 'Merge' })).toBeChecked();
	await expect(matrix).toHaveAttribute('aria-busy', 'true');
	await expect(note).toHaveText('Merges on its own: low.');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Merges on its own: low, medium.');
	await expect(matrix).toHaveAttribute('aria-busy', 'false');
	await expect(preset('Balanced')).toHaveAttribute('aria-pressed', 'true');

	// Changing one tier from the keyboard leaves the preset.
	await tier('High risk').getByRole('radio', { name: 'Ask' }).focus();
	await press(page, 'ArrowRight');
	await expect(tier('High risk').getByRole('radio', { name: 'Merge' })).toBeChecked();
	await expect(preset('Balanced')).toHaveAttribute('aria-pressed', 'false');
	await page.clock.runFor(SAVED);
	await expect(note).toHaveText('Merges on its own: low, medium, high.');

	// A locked tier shows its choice and cannot be changed.
	const critical = tier('Critical');
	await expect(critical).toHaveAttribute('aria-disabled', 'true');
	await critical.getByRole('radio', { name: 'Merge' }).click({ force: true });
	await page.clock.runFor(SAVED);
	await expect(critical.getByRole('radio', { name: 'Ask' })).toBeChecked();
	await expect(note).toHaveText('Merges on its own: low, medium, high.');
});
