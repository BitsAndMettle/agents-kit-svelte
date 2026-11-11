import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/** Whether a popover is in the top layer, or a dialog is open. */
async function isShown(locator: Locator): Promise<boolean> {
	return locator.evaluate((el) => (el instanceof HTMLDialogElement ? el.open : el.matches(':popover-open')));
}

async function expectShown(locator: Locator, shown: boolean): Promise<void> {
	await expect.poll(() => isShown(locator)).toBe(shown);
}

/** The element a part's aria-controls points at. */
async function controlled(page: Page, owner: Locator): Promise<Locator> {
	const id = await owner.getAttribute('aria-controls');
	if (!id) throw new Error('no aria-controls');
	return page.locator(`[id="${id}"]`);
}

/** Visible option names of a listbox. */
async function optionNames(list: Locator): Promise<string[]> {
	return list.getByRole('option').evaluateAll((els) => els.map((el) => el.querySelector('span span')?.textContent?.trim() ?? ''));
}

test.describe('DropdownMenu', () => {
	test('opens from the trigger with Enter, Space, ArrowDown and ArrowUp, and Escape returns focus', async ({ page }) => {
		const section = await openSection(page, 'dropdown-menu');
		const trigger = section.getByRole('button', { name: 'File', exact: true });
		const menu = await controlled(page, trigger);
		for (const [key, first] of [
			['Enter', 'New file'],
			['Space', 'New file'],
			['ArrowDown', 'New file'],
			['ArrowUp', 'Delete']
		]) {
			await trigger.focus();
			await press(page, key);
			await expectShown(menu, true);
			await expect(trigger).toHaveAttribute('aria-expanded', 'true');
			await expect(section.getByRole('menuitem', { name: first })).toBeFocused();
			await press(page, 'Escape');
			await expectShown(menu, false);
			await expect(trigger).toBeFocused();
		}
		// The destructive row carries the danger tone.
		await expect(section.getByRole('menuitem', { name: 'Delete' })).toHaveClass(/text-status-danger/);
	});

	test('choosing an item closes the menu, runs it and returns focus to the trigger', async ({ page }) => {
		const section = await openSection(page, 'dropdown-menu');
		const trigger = section.getByRole('button', { name: 'File', exact: true });
		await trigger.focus();
		await press(page, 'ArrowDown', 'r');
		await expect(section.getByRole('menuitem', { name: 'Rename' })).toBeFocused();
		await press(page, 'Enter');
		await expectShown(await controlled(page, trigger), false);
		await expect(trigger).toBeFocused();
		await expect(section.getByTestId('dropdown-last')).toHaveText('Rename');
	});

	test('a submenu opens with ArrowRight, closes with ArrowLeft, and a leaf closes the whole chain', async ({ page }) => {
		const section = await openSection(page, 'dropdown-menu');
		const trigger = section.getByRole('button', { name: 'File', exact: true });
		const share = section.getByRole('menuitem', { name: 'Share' });
		await trigger.focus();
		await press(page, 'ArrowDown', 'ArrowDown', 'ArrowDown');
		await expect(share).toBeFocused();
		await expect(share).toHaveAttribute('aria-haspopup', 'menu');
		await press(page, 'ArrowRight');
		await expect(section.getByRole('menuitem', { name: 'Copy link' })).toBeFocused();
		await expect(share).toHaveAttribute('aria-expanded', 'true');
		// The disabled leaf is skipped.
		await press(page, 'ArrowDown', 'ArrowDown');
		await expect(section.getByRole('menuitem', { name: 'Copy link' })).toBeFocused();
		await press(page, 'ArrowLeft');
		await expect(share).toBeFocused();
		await expect(share).toHaveAttribute('aria-expanded', 'false');
		await press(page, 'ArrowRight', 'ArrowDown', 'Enter');
		await expectShown(await controlled(page, trigger), false);
		await expect(trigger).toBeFocused();
		await expect(section.getByTestId('dropdown-last')).toHaveText('Email');
	});

	test('checkbox and radio rows toggle and keep the menu open', async ({ page }) => {
		const section = await openSection(page, 'dropdown-menu');
		const trigger = section.getByRole('button', { name: 'File', exact: true });
		const hidden = section.getByRole('menuitemcheckbox', { name: 'Show hidden files' });
		await trigger.focus();
		await press(page, 'ArrowDown', 's', 'h', 'o');
		await expect(hidden).toBeFocused();
		await expect(hidden).toHaveAttribute('aria-checked', 'false');
		await press(page, 'Enter');
		await expect(hidden).toHaveAttribute('aria-checked', 'true');
		await expect(section.getByRole('group', { name: 'View', exact: true })).toBeVisible();
		const date = section.getByRole('menuitemradio', { name: 'Date modified' });
		await date.click();
		await expect(date).toHaveAttribute('aria-checked', 'true');
		await expect(section.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'false');
		await expect(section.getByRole('group', { name: 'Sort by', exact: true })).toBeVisible();
		expect(await isShown(await controlled(page, trigger))).toBe(true);
		await expect(section.getByTestId('dropdown-view')).toHaveText('hidden shown, wrap on, sort by date');
	});

	test('Tab and Shift+Tab close the menu without pulling focus back', async ({ page }) => {
		const section = await openSection(page, 'dropdown-menu');
		const trigger = section.getByRole('button', { name: 'File', exact: true });
		const menu = await controlled(page, trigger);
		await trigger.focus();
		await press(page, 'ArrowDown', 'ArrowDown');
		await press(page, 'Shift+Tab');
		await expectShown(menu, false);
		// The menu sits right after its trigger, so Shift+Tab lands on the trigger itself.
		await expect(trigger).toBeFocused();
		await press(page, 'ArrowDown', 'Tab');
		await expectShown(menu, false);
		await expect(section.getByRole('button', { name: 'More actions for release-notes.md' })).toBeFocused();
	});

	test('a custom trigger snippet receives the part', async ({ page }) => {
		const section = await openSection(page, 'dropdown-menu');
		const more = section.getByRole('button', { name: 'More actions for release-notes.md' });
		await expect(more).toHaveAttribute('aria-haspopup', 'menu');
		await more.focus();
		await press(page, 'Enter');
		await expect(section.getByRole('menuitem', { name: 'Pin to top' })).toBeFocused();
		await press(page, 'End', 'Enter');
		await expect(more).toBeFocused();
		await expect(section.getByTestId('dropdown-last')).toHaveText('Remove');
	});
});

test.describe('ContextMenu', () => {
	test('right-click opens at the pointer; choosing runs the action', async ({ page }) => {
		const section = await openSection(page, 'context-menu');
		const row = section.getByRole('button', { name: 'diff.patch' });
		const menu = section.getByRole('menu', { name: 'File actions', includeHidden: true });
		await row.click({ button: 'right' });
		await expectShown(menu, true);
		await expect(menu).toHaveAccessibleName('File actions');
		const rowBox = await row.boundingBox();
		const menuBox = await menu.boundingBox();
		expect(rowBox && menuBox).toBeTruthy();
		expect(Math.abs(menuBox!.y - (rowBox!.y + rowBox!.height / 2))).toBeLessThan(rowBox!.height);
		await press(page, 'ArrowDown');
		await expect(section.getByRole('menuitem', { name: 'Open diff.patch' })).toBeFocused();
		await press(page, 'Enter');
		await expectShown(menu, false);
		await expect(section.getByTestId('context-last')).toHaveText('Open diff.patch');
	});

	test('Shift+F10 opens at the focused element, focuses the first item, and Escape returns focus', async ({ page }) => {
		const section = await openSection(page, 'context-menu');
		const row = section.getByRole('button', { name: 'session.log' });
		const menu = section.getByRole('menu', { name: 'File actions', includeHidden: true });
		await row.focus();
		await press(page, 'Shift+F10');
		await expectShown(menu, true);
		await expect(section.getByRole('menuitem', { name: 'Open session.log' })).toBeFocused();
		await press(page, 'Escape');
		await expectShown(menu, false);
		await expect(row).toBeFocused();
		await press(page, 'Shift+F10', 'End', 'Enter');
		await expect(section.getByTestId('context-last')).toHaveText('Delete session.log');
		await expect(row).toBeFocused();
	});
});

test.describe('Select', () => {
	test('single: opens on the selected option, arrows skip disabled options, Enter chooses and closes', async ({ page }) => {
		const section = await openSection(page, 'select');
		const trigger = section.getByRole('combobox', { name: 'Model' });
		const list = await controlled(page, trigger);
		await expect(trigger).toHaveText(/Balanced/);
		await trigger.focus();
		await press(page, 'Enter');
		await expectShown(list, true);
		const balanced = list.getByRole('option', { name: /Balanced/ });
		await expect(balanced).toHaveAttribute('aria-selected', 'true');
		await expect(trigger).toHaveAttribute('aria-activedescendant', (await balanced.getAttribute('id'))!);
		await expect(list.getByRole('group', { name: 'Heavy' })).toBeVisible();
		// The list is as wide as its trigger.
		const [t, l] = [await trigger.boundingBox(), await list.boundingBox()];
		expect(Math.abs(t!.width - l!.width)).toBeLessThan(2);
		await press(page, 'ArrowDown', 'ArrowDown');
		const deep = list.getByRole('option', { name: /Deep/ });
		await expect(trigger).toHaveAttribute('aria-activedescendant', (await deep.getAttribute('id'))!);
		await press(page, 'Enter');
		await expectShown(list, false);
		await expect(trigger).toBeFocused();
		await expect(trigger).toHaveText(/Deep/);
		await expect(section.locator('p', { hasText: 'Model deep' })).toBeVisible();
	});

	test('multiple: toggles stay open, chips and a count summarise the choice', async ({ page }) => {
		const section = await openSection(page, 'select');
		const labels = section.getByRole('combobox', { name: 'Labels' });
		const list = await controlled(page, labels);
		await expect(list).toHaveAttribute('aria-multiselectable', 'true');
		await expect(labels).toHaveText(/bug\s*docs/);
		await labels.focus();
		await press(page, 'ArrowDown');
		await press(page, 'ArrowDown', 'ArrowDown', 'Enter');
		await expect(list.getByRole('option', { name: 'feature' })).toHaveAttribute('aria-selected', 'true');
		expect(await isShown(list)).toBe(true);
		await press(page, 'ArrowUp', 'ArrowUp', 'Space');
		await expect(list.getByRole('option', { name: 'bug' })).toHaveAttribute('aria-selected', 'false');
		await press(page, 'Escape');
		await expectShown(list, false);
		await expect(labels).toBeFocused();
		await expect(labels).toHaveText(/docs\s*feature/);
		await expect(section.getByRole('combobox', { name: 'Reviewers' })).toHaveText('2 selected');
	});

	test('in a Field: one label names the trigger; required blocks submit, focuses the trigger and links the error', async ({ page }) => {
		const section = await openSection(page, 'select');
		const priority = section.getByRole('combobox', { name: 'Priority' });
		const submit = section.getByRole('button', { name: 'Submit' });
		const out = section.getByTestId('select-submitted');
		// The Field's <label for> points at the trigger, and it is the only label.
		const triggerId = await priority.getAttribute('id');
		await expect(section.locator(`label[for="${triggerId}"]`)).toHaveText(/Priority/);
		await expect(section.locator('form label', { hasText: 'Priority' })).toHaveCount(1);
		await expect(section.locator('form span', { hasText: /^Priority$/ })).toHaveCount(0);
		await expect(priority).toHaveAttribute('aria-required', 'true');

		await submit.click();
		await expect(out).toHaveText('not sent');
		await expect(priority).toBeFocused();
		await expect(priority).toHaveAttribute('aria-invalid', 'true');
		const errorId = await priority.getAttribute('aria-errormessage');
		await expect(page.locator(`[id="${errorId}"]`)).toHaveText('Pick a priority before sending.');
		await expect(priority).toHaveAttribute('aria-describedby', new RegExp(errorId!));

		await press(page, 'Enter');
		await section.getByRole('option', { name: 'P2 · soon' }).click();
		await expect(priority).toHaveText(/P2 · soon/);
		await expect(priority).not.toHaveAttribute('aria-invalid');
		await submit.click();
		await expect(out).toHaveText('priority=p2');
		await section.getByRole('button', { name: 'Reset' }).click();
		await expect(priority).toHaveText(/Pick a priority/);
		await submit.click();
		await expect(out).toHaveText('not sent');
	});

	test('extra attributes reach the trigger: aria-label names it and its list', async ({ page }) => {
		const section = await openSection(page, 'select');
		const sort = section.getByRole('combobox', { name: 'Sort order' });
		await expect(sort).toHaveText(/Newest first/);
		await sort.click();
		await expect(section.getByRole('listbox', { name: 'Sort order' })).toBeVisible();
		await press(page, 'Escape');
	});
});

test.describe('Combobox', () => {
	test('typing filters, activedescendant always names a rendered option, and the empty state shows', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Assignee' });
		const list = await controlled(page, input);
		await input.focus();
		await page.keyboard.type('plat');
		await expectShown(list, true);
		await expect.poll(() => optionNames(list)).toEqual(['Ben Okafor', 'Chloe Martin']);
		const active = async () => {
			const id = await input.getAttribute('aria-activedescendant');
			return id ? await list.locator(`[id="${id}"]`).count() : -1;
		};
		await expect.poll(active).toBe(1);
		await press(page, 'ArrowDown');
		await expect.poll(active).toBe(1);
		await page.keyboard.type('zzz');
		await expect.poll(() => optionNames(list)).toEqual([]);
		await expect(input).not.toHaveAttribute('aria-activedescendant');
		await expect(section.getByRole('status').filter({ hasText: 'No matches' })).toBeVisible();
		await press(page, 'Backspace', 'Backspace', 'Backspace');
		await expect.poll(() => optionNames(list)).toEqual(['Ben Okafor', 'Chloe Martin']);
		await expect.poll(active).toBe(1);
		await press(page, 'Enter');
		await expectShown(list, false);
		await expect(input).toHaveValue('Ben Okafor');
		await expect(section.locator('p', { hasText: 'Assignee ben' })).toBeVisible();
		await expect(input).toBeFocused();
	});

	test('Escape closes the list first, then clears the text and the value', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Assignee' });
		const list = await controlled(page, input);
		await input.focus();
		await page.keyboard.type('dev');
		await press(page, 'Enter');
		await expect(section.locator('p', { hasText: 'Assignee dev' })).toBeVisible();
		await press(page, 'ArrowDown');
		await expectShown(list, true);
		await press(page, 'Escape');
		await expectShown(list, false);
		await expect(input).toHaveValue('Dev Patel');
		await press(page, 'Escape');
		await expect(input).toHaveValue('');
		await expect(section.locator('p', { hasText: 'Assignee none' })).toBeVisible();
	});

	test('leaving the field puts back the chosen label; the clear button empties it', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Assignee' });
		await input.focus();
		await page.keyboard.type('ana');
		await press(page, 'Enter');
		await page.keyboard.type(' typo');
		await press(page, 'Tab');
		await expect(input).toHaveValue('Ana Silva');
		await input.locator('xpath=..').getByRole('button', { name: 'Clear', exact: true }).click();
		await expect(input).toHaveValue('');
		await expect(input).toBeFocused();
		await expect(section.locator('p', { hasText: 'Assignee none' })).toBeVisible();
	});

	test('allowCustom: Enter commits free text as the value', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Branch' });
		await input.focus();
		await page.keyboard.type('fix/typo');
		await press(page, 'Enter');
		await expect(section.locator('p', { hasText: 'branch fix/typo' })).toBeVisible();
		await expect(input).toHaveValue('fix/typo');
		// Text that matches an option's label picks that option.
		await input.fill('');
		await page.keyboard.type('MAIN');
		await press(page, 'Tab');
		await expect(section.locator('p', { hasText: 'branch main' })).toBeVisible();
		await expect(input).toHaveValue('main');
	});

	test('loading marks the list busy until the options arrive', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Repository' });
		const list = await controlled(page, input);
		await input.focus();
		await page.keyboard.type('work');
		await expect(list).toHaveAttribute('aria-busy', 'true');
		await expect(list).toHaveAttribute('aria-busy', 'false');
		await expect.poll(() => optionNames(list)).toEqual(['worker']);
	});

	test('in a Field: the value posts and reset restores it', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Reviewer' });
		const out = section.getByTestId('combobox-submitted');
		await expect(section.locator(`label[for="${await input.getAttribute('id')}"]`)).toHaveText(/Reviewer/);
		await expect(input).toHaveValue('Ben Okafor');
		await section.getByRole('button', { name: 'Submit' }).click();
		await expect(out).toHaveText('reviewer=ben');
		await input.fill('fat');
		await press(page, 'Enter');
		await expect(input).toHaveValue('Fatima Zahra');
		await section.getByRole('button', { name: 'Submit' }).click();
		await expect(out).toHaveText('reviewer=fatima');
		await section.getByRole('button', { name: 'Reset' }).click();
		await expect(input).toHaveValue('Ben Okafor');
		await section.getByRole('button', { name: 'Submit' }).click();
		await expect(out).toHaveText('reviewer=ben');
	});

	test('required needs a chosen value: text that matches nothing does not submit', async ({ page }) => {
		const section = await openSection(page, 'combobox');
		const input = section.getByRole('combobox', { name: 'Reviewer' });
		const out = section.getByTestId('combobox-submitted');
		await input.focus();
		await press(page, 'Escape');
		await expect(input).toHaveValue('');
		await page.keyboard.type('zzz');
		await press(page, 'Enter');
		await expect(out).toHaveText('not sent');
		await section.getByRole('button', { name: 'Submit' }).click();
		await expect(out).toHaveText('not sent');
		await expect(input).toBeFocused();
		await expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(await input.evaluate((el: HTMLInputElement) => el.validity.customError)).toBe(true);
		await input.fill('ana');
		await press(page, 'Enter');
		await expect(input).not.toHaveAttribute('aria-invalid');
		await section.getByRole('button', { name: 'Submit' }).click();
		await expect(out).toHaveText('reviewer=ana');
	});
});

test.describe('CommandPalette', () => {
	const shortcut = 'Control+k';

	test('the global shortcut opens it, filtering and the empty state work, Escape clears then closes', async ({ page }) => {
		const section = await openSection(page, 'command-palette');
		const opener = section.getByRole('button', { name: /Search commands/ });
		const dialog = section.getByRole('dialog', { includeHidden: true });
		await opener.focus();
		await press(page, shortcut);
		await expectShown(dialog, true);
		const input = dialog.getByRole('combobox', { name: 'Search commands' });
		await expect(input).toBeFocused();
		await expect(dialog.getByRole('group', { name: 'Recent' }).getByRole('option')).toHaveCount(1);
		await page.keyboard.type('theme');
		await expect(dialog.getByRole('option')).toHaveCount(1);
		await expect(dialog.getByRole('option', { name: /Toggle dark mode/ })).toHaveAttribute('data-highlighted', '');
		await page.keyboard.type('xyz');
		await expect(dialog.getByRole('option')).toHaveCount(0);
		await expect(dialog.getByRole('status')).toHaveText('No commands found');
		await press(page, 'Escape');
		await expect(input).toHaveValue('');
		expect(await isShown(dialog)).toBe(true);
		await press(page, 'Escape');
		await expectShown(dialog, false);
		await expect(opener).toBeFocused();
	});

	test('activating a command closes the palette, runs it and moves it to Recent', async ({ page }) => {
		const section = await openSection(page, 'command-palette');
		const opener = section.getByRole('button', { name: /Search commands/ });
		const dialog = section.getByRole('dialog', { includeHidden: true });
		await opener.click();
		await expectShown(dialog, true);
		await page.keyboard.type('settings');
		await press(page, 'Enter');
		await expectShown(dialog, false);
		await expect(section.getByTestId('palette-ran')).toHaveText('Open settings');
		await expect(opener).toBeFocused();
		await press(page, shortcut);
		await expectShown(dialog, true);
		await expect(dialog.getByRole('group', { name: 'Recent' }).getByRole('option')).toHaveText([/Open settings/, /Start a run/]);
		// The same shortcut inside its own input closes it.
		await press(page, shortcut);
		await expectShown(dialog, false);
	});

	test('the shortcut is ignored while typing in another field', async ({ page }) => {
		await openSection(page, 'command-palette');
		const other = page.locator('#combobox').getByRole('combobox', { name: 'Assignee' });
		await other.focus();
		await press(page, shortcut);
		const dialog = page.locator('#command-palette').getByRole('dialog', { includeHidden: true });
		await page.waitForTimeout(200);
		expect(await isShown(dialog)).toBe(false);
		await expect(other).toBeFocused();
	});
});
