import { expect, test, type Locator } from '@playwright/test';
import { openSection, press } from './helpers';

/** The demo form's "Sent: …" line (empty until a submit gets through). */
const sent = (section: Locator) => section.locator('output').last();
const submit = (section: Locator) => section.getByRole('button', { name: 'Submit' }).click();
const reset = (section: Locator) => section.getByRole('button', { name: 'Reset' }).click();

test.describe('Field', () => {
	test('names the control, describes it with the hint, and announces and wires the error', async ({ page }) => {
		const section = await openSection(page, 'field');
		const email = section.getByRole('textbox', { name: 'Work email' });

		await expect(email).toHaveAccessibleDescription('Sign-in links go here.');
		await expect(email).not.toHaveAttribute('aria-invalid');
		await expect(email).not.toHaveAttribute('aria-errormessage');

		await submit(section);
		const message = 'Enter an email address with an @, like you@company.com.';
		await expect(email).toHaveAttribute('aria-invalid', 'true');
		await expect(email).toHaveAccessibleDescription(`Sign-in links go here. ${message}`);
		const errorId = await email.getAttribute('aria-errormessage');
		const error = section.locator(`[id="${errorId}"]`);
		await expect(error).toHaveText(message);
		// The message is the content of a polite live region that was already on the page.
		await expect(error).toHaveAttribute('aria-live', 'polite');
		await expect(sent(section)).toHaveText('');

		// A plain element wired through the snippet argument gets the same treatment.
		const display = section.getByRole('textbox', { name: 'Display name (Optional)' });
		await expect(display).toHaveAccessibleDescription('A plain input, wired through the snippet argument.');

		await email.fill('ada@example.com');
		await submit(section);
		await expect(email).not.toHaveAttribute('aria-invalid');
		await expect(email).not.toHaveAttribute('aria-errormessage');
		await expect(error).toHaveText('');
		await expect(sent(section)).toHaveText('Sent: email=ada@example.com, display=, topics=runs');
	});

	test('a group field is a named fieldset whose error marks its checkboxes invalid', async ({ page }) => {
		const section = await openSection(page, 'field');
		const group = section.getByRole('group', { name: 'Notify me about' });
		await expect(group).toHaveAccessibleDescription('Choose one or both.');

		await group.getByRole('checkbox', { name: 'Finished runs' }).uncheck();
		await submit(section);
		await expect(group).toHaveAccessibleDescription('Choose one or both. Pick at least one topic.');
		for (const box of await group.getByRole('checkbox').all()) await expect(box).toHaveAttribute('aria-invalid', 'true');

		await group.getByRole('checkbox', { name: 'Review requests' }).focus();
		await press(page, 'Space');
		await section.getByRole('textbox', { name: 'Work email' }).fill('ada@example.com');
		await submit(section);
		await expect(group.getByRole('checkbox').first()).not.toHaveAttribute('aria-invalid');
		await expect(sent(section)).toHaveText('Sent: email=ada@example.com, display=, topics=reviews');
	});
});

test('Input: required blocks submit, values post, clear empties and refocuses, reset restores', async ({ page }) => {
	const section = await openSection(page, 'input');
	const search = section.getByRole('textbox', { name: 'Search runs' });
	const repo = section.getByRole('textbox', { name: 'Repository' });

	await expect(repo).toHaveAccessibleDescription('Owner and name.');
	await submit(section);
	expect(await repo.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
	await expect(sent(section)).toHaveText('');

	await repo.fill('acme/site');
	await submit(section);
	await expect(sent(section)).toHaveText('Sent: q=flaky test, repo=acme/site, budget=40');

	await section.getByRole('button', { name: 'Clear' }).click();
	await expect(search).toHaveValue('');
	await expect(search).toBeFocused();
	await expect(section.getByRole('button', { name: 'Clear' })).toHaveCount(0);

	await reset(section);
	await expect(search).toHaveValue('flaky test');
	await expect(repo).toHaveValue('');
	await expect(section.getByRole('spinbutton', { name: 'Token budget' })).toHaveValue('40');
});

test('Textarea: counts characters, speaks only near the limit, posts and resets', async ({ page }) => {
	const section = await openSection(page, 'textarea');
	const summary = section.getByRole('textbox', { name: 'Summary' });
	const live = section.locator('p.sr-only[aria-live="polite"]');

	await expect(summary).toHaveAccessibleDescription(/45 of 120 characters used/);
	await summary.fill('Short.');
	await expect(summary).toHaveAccessibleDescription(/6 of 120 characters used/);
	await page.waitForTimeout(900);
	await expect(live).toHaveText('');

	await summary.fill('x'.repeat(115));
	await expect(live).toHaveText('5 characters left');
	await summary.press('End');
	await page.keyboard.type('yyyyyyy');
	await expect(summary).toHaveValue('x'.repeat(115) + 'yyyyy');
	await expect(live).toHaveText('Character limit reached, 120 of 120 used');

	await summary.fill('');
	await submit(section);
	expect(await summary.evaluate((el: HTMLTextAreaElement) => el.validity.valueMissing)).toBe(true);
	await summary.fill('Ship it.');
	await submit(section);
	await expect(sent(section)).toHaveText('Sent: summary=Ship it., notes=');
	await reset(section);
	await expect(summary).toHaveValue('Retry the flaky checkout test before merging.');
});

test('Checkbox: indeterminate parent, Space toggles, required blocks submit, reset restores', async ({ page }) => {
	const section = await openSection(page, 'checkbox');
	const all = section.getByRole('checkbox', { name: 'Run every check' });
	const types = section.getByRole('checkbox', { name: 'Type check' });
	const terms = section.getByRole('checkbox', { name: 'I reviewed the diff' });

	await expect(all).toBeChecked({ indeterminate: true });
	await all.focus();
	await press(page, 'Space');
	await expect(all).toBeChecked();
	await expect(types).toBeChecked();

	await types.focus();
	await press(page, 'Space');
	await expect(types).not.toBeChecked();
	await expect(all).toBeChecked({ indeterminate: true });

	await expect(terms).toHaveAccessibleDescription('Required: the form will not submit until this is ticked.');
	await submit(section);
	expect(await terms.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
	await expect(sent(section)).toHaveText('');
	await terms.check();
	await submit(section);
	await expect(sent(section)).toHaveText('Sent: checks=lint, checks=tests, terms=on');

	await reset(section);
	await expect(terms).not.toBeChecked();
	await expect(section.getByRole('checkbox', { name: 'Lint' })).toBeChecked();
	await expect(section.getByRole('checkbox', { name: 'Unit tests' })).not.toBeChecked();
	await expect(all).toBeChecked({ indeterminate: true });
});

test('Switch: role switch, Space toggles, posts its value, reset restores', async ({ page }) => {
	const section = await openSection(page, 'switch');
	const retry = section.getByRole('switch', { name: 'Retry failed runs' });
	const digest = section.getByRole('switch', { name: 'Daily digest' });

	await expect(retry).toBeChecked();
	await expect(retry).toHaveAccessibleDescription('One automatic retry before a run is marked failed.');
	await expect(section.getByRole('switch', { name: /Share runs publicly/ })).toBeDisabled();

	await digest.focus();
	await press(page, 'Space');
	await expect(digest).toBeChecked();
	await press(page, 'Enter');
	await expect(digest).toBeChecked();
	await submit(section);
	await expect(sent(section)).toHaveText('Sent: autoRetry=on, digest=daily');

	await retry.focus();
	await press(page, 'Space');
	await expect(retry).not.toBeChecked();
	await expect(section.getByRole('switch', { name: 'Status off' })).not.toBeChecked();

	await reset(section);
	await expect(retry).toBeChecked();
	await expect(digest).not.toBeChecked();
});

test('RadioGroup: Tab enters, arrows move and check skipping disabled, required blocks submit, reset restores', async ({ page }) => {
	const section = await openSection(page, 'radio-group');
	const model = section.getByRole('radiogroup', { name: 'Model' });
	const radio = (name: string) => model.getByRole('radio', { name });

	await expect(model).toHaveAttribute('aria-required', 'true');
	await submit(section);
	await expect(sent(section)).toHaveText('');

	await section.locator('legend').first().click();
	await press(page, 'Tab');
	await expect(radio('Fast')).toBeFocused();
	await expect(radio('Fast')).not.toBeChecked();

	await press(page, 'ArrowDown');
	await expect(radio('Balanced')).toBeFocused();
	await expect(radio('Balanced')).toBeChecked();
	await press(page, 'ArrowDown');
	await expect(radio('Careful')).toBeChecked();
	await expect(radio('Deep')).toHaveAttribute('aria-disabled', 'true');
	await press(page, 'ArrowRight');
	await expect(radio('Fast')).toBeChecked();
	await press(page, 'ArrowUp');
	await expect(radio('Careful')).toBeChecked();
	await expect(radio('Careful')).toHaveAccessibleDescription('Reviews and risky changes.');

	await press(page, 'Tab');
	await expect(section.getByRole('radio', { name: 'Medium' })).toBeFocused();
	await press(page, 'ArrowLeft');
	await expect(section.getByRole('radio', { name: 'Low' })).toBeChecked();

	await submit(section);
	await expect(sent(section)).toHaveText('Sent: model=careful, effort=low');

	await reset(section);
	await expect(radio('Careful')).not.toBeChecked();
	await expect(section.getByRole('radio', { name: 'Medium' })).toBeChecked();
	await expect(section.getByText('Model: none · Effort: medium')).toBeVisible();
});

test('NativeSelect: the placeholder blocks a required submit, the choice posts, reset restores', async ({ page }) => {
	const section = await openSection(page, 'native-select');
	const region = section.getByRole('combobox', { name: 'Region' });

	await expect(region).toHaveValue('');
	await expect(region).toHaveAccessibleDescription('Where the runner lives.');
	await submit(section);
	expect(await region.evaluate((el: HTMLSelectElement) => el.validity.valueMissing)).toBe(true);
	await expect(sent(section)).toHaveText('');

	await region.selectOption('ams');
	await submit(section);
	await expect(sent(section)).toHaveText('Sent: region=ams, sort=recent');

	await reset(section);
	await expect(region).toHaveValue('');
});

test('Slider: arrows, Home and End move it, value text follows, posts and resets', async ({ page }) => {
	const section = await openSection(page, 'slider');
	const temperature = section.getByRole('slider', { name: 'Temperature' });

	await expect(temperature).toHaveAccessibleDescription('Higher is more varied.');
	await temperature.focus();
	await press(page, 'ArrowRight');
	await expect(temperature).toHaveValue('0.8');
	await expect(temperature).toHaveAttribute('aria-valuetext', '0.8');
	await press(page, 'Home');
	await expect(temperature).toHaveValue('0');
	await press(page, 'End');
	await expect(temperature).toHaveValue('1');
	await expect(temperature).toHaveAttribute('aria-valuetext', '1.0');
	await press(page, 'ArrowLeft');
	await expect(temperature).toHaveValue('0.9');

	const parallel = section.getByRole('slider', { name: 'Parallel agents' });
	await parallel.focus();
	await press(page, 'ArrowUp');
	await expect(parallel).toHaveAttribute('aria-valuetext', '5 agents');

	await submit(section);
	await expect(sent(section)).toHaveText('Sent: temperature=0.9, parallel=5');
	await reset(section);
	await expect(temperature).toHaveValue('0.7');
	await expect(parallel).toHaveValue('4');
});
