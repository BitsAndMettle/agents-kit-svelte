import { expect, test, type Page } from '@playwright/test';

/** Opens the SettingsDraft fixture and collects page errors and console warnings. */
async function open(page: Page) {
	const errors: string[] = [];
	const warnings: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'warning') warnings.push(message.text());
		if (message.type() === 'error') errors.push(message.text());
	});
	await page.goto('/fixtures/settings-draft/');
	// Hydrated once the attachment has run and the first dirty report arrived.
	await expect(page.getByTestId('dirty-calls')).not.toHaveText('0', { timeout: 45000 });
	return { errors, warnings };
}

test('SettingsDraft: attaching to a form settles without an effect loop', async ({ page }) => {
	const { errors } = await open(page);
	await page.waitForTimeout(300);
	expect(errors).toEqual([]);
	// One report for the first (clean) reading; a loop would report hundreds of times.
	expect(Number(await page.getByTestId('dirty-calls').textContent())).toBeLessThanOrEqual(2);
	await expect(page.getByTestId('dirty')).toHaveText('0');
	await expect(page.getByTestId('status')).toHaveText('idle');
});

test('SettingsDraft: edits count, Discard resets, a save makes the form clean', async ({ page }) => {
	const { errors, warnings } = await open(page);
	const team = page.getByRole('textbox', { name: 'Team name' });
	await team.fill('Northwind Design');
	await expect(page.getByTestId('dirty')).toHaveText('1');
	await expect(page.getByTestId('changes')).toHaveText('Team name: Northwind Studio → Northwind Design');

	// A registered field is labelled and formatted too.
	await page.getByRole('combobox', { name: 'Retention' }).selectOption('30');
	await expect(page.getByTestId('dirty')).toHaveText('2');
	await expect(page.getByTestId('changes')).toContainText('Retention: 90 days → 30 days');

	// Discard is a native reset back to the saved values.
	await page.getByRole('button', { name: 'Discard' }).click();
	await expect(page.getByTestId('dirty')).toHaveText('0');
	await expect(team).toHaveValue('Northwind Studio');

	// A field error focuses the invalid control and hides once that field is edited.
	await team.fill('');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByTestId('team-error')).toHaveText('Enter a team name.');
	await expect(team).toBeFocused();
	await team.fill('Northwind Design');
	await expect(page.getByTestId('team-error')).toHaveCount(0);

	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByTestId('status')).toHaveText('saved');
	await expect(page.getByTestId('dirty')).toHaveText('0');
	// Discard now restores what was saved, not the first render.
	await team.fill('Something else');
	await page.getByRole('button', { name: 'Discard' }).click();
	await expect(team).toHaveValue('Northwind Design');

	// An undescribed control never counts; in development the draft warns about it once.
	await page.getByRole('textbox', { name: 'Not described' }).fill('a note');
	await page.getByRole('textbox', { name: 'Not described' }).fill('another note');
	await expect(page.getByTestId('dirty')).toHaveText('0');
	const about = warnings.filter((w) => w.includes('"note"'));
	if (process.env.PW_DEV) await expect.poll(() => warnings.filter((w) => w.includes('"note"')).length).toBe(1);
	else expect(about).toEqual([]);
	expect(errors).toEqual([]);
});

test('SettingsDraft: the leave guard holds a navigation while dirty and saves before leaving', async ({ page }) => {
	await open(page);
	const leave = page.getByRole('button', { name: 'Leave', exact: true });
	// Clean: nothing to lose, the navigation goes ahead.
	await leave.click();
	await expect(page.getByTestId('left')).toHaveText('1');
	await expect(page.getByRole('button', { name: 'Save and leave' })).toHaveCount(0);

	await page.getByRole('textbox', { name: 'Team name' }).fill('Northwind Design');
	await leave.click();
	await expect(page.getByTestId('left')).toHaveText('1');
	await page.getByRole('button', { name: 'Save and leave' }).click();
	await expect(page.getByTestId('left')).toHaveText('2');
	await expect(page.getByTestId('status')).toHaveText('saved');
});
