import { expect, test, type Locator, type Page } from '@playwright/test';
import { press } from '../keyboard/helpers';

async function openGroups(page: Page): Promise<void> {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/headless/groups/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

const value = (page: Page, name: string) => page.getByTestId(`${name}-value`);

/** Tab into a group from the heading just before it. */
async function tabInto(page: Page, heading: string): Promise<void> {
	await page.getByRole('heading', { name: heading, exact: true }).click();
	await page.keyboard.press('Tab');
}

test.beforeEach(async ({ page }) => {
	await openGroups(page);
});

test.describe('tabs', () => {
	const tabs = (page: Page, list: string): Locator => page.getByRole('tablist', { name: list });
	const tab = (page: Page, list: string, name: string): Locator => tabs(page, list).getByRole('tab', { name });

	test('roles, ids and hidden panels: every aria-controls resolves', async ({ page }) => {
		const list = tabs(page, 'Automatic tabs');
		await expect(list).toHaveAttribute('aria-orientation', 'horizontal');
		await expect(tab(page, 'Automatic tabs', 'Runs')).toHaveAttribute('aria-selected', 'true');
		await expect(tab(page, 'Automatic tabs', 'Secrets')).toHaveAttribute('aria-disabled', 'true');
		const controls = await list.getByRole('tab').evaluateAll((els) =>
			els.map((el) => {
				const panel = document.getElementById(el.getAttribute('aria-controls')!);
				return {
					resolves: panel !== null,
					labelled: panel?.getAttribute('aria-labelledby') === el.id,
					hidden: panel?.hidden,
					selected: el.getAttribute('aria-selected') === 'true'
				};
			})
		);
		expect(controls).toHaveLength(4);
		for (const c of controls) {
			expect(c.resolves && c.labelled).toBe(true);
			expect(c.hidden).toBe(!c.selected);
		}
		await expect(page.getByRole('tabpanel', { name: 'Runs' }).first()).toBeVisible();
	});

	test('automatic: arrows move focus and select, skipping disabled, wrapping; Home/End; Tab goes to the panel', async ({
		page
	}) => {
		const t = (name: string) => tab(page, 'Automatic tabs', name);
		await tabInto(page, 'Tabs (automatic)');
		await expect(t('Runs')).toBeFocused();
		await press(page, 'ArrowRight');
		await expect(t('Logs')).toBeFocused();
		await expect(value(page, 'auto')).toHaveText('logs');
		await press(page, 'ArrowRight');
		await expect(t('Settings')).toBeFocused();
		await expect(value(page, 'auto')).toHaveText('settings');
		await press(page, 'ArrowRight');
		await expect(t('Runs')).toBeFocused();
		await expect(value(page, 'auto')).toHaveText('runs');
		await press(page, 'ArrowLeft');
		await expect(t('Settings')).toBeFocused();
		await press(page, 'Home');
		await expect(t('Runs')).toBeFocused();
		await expect(value(page, 'auto')).toHaveText('runs');
		await press(page, 'End');
		await expect(t('Settings')).toBeFocused();
		await expect(value(page, 'auto')).toHaveText('settings');
		// Vertical keys do nothing in a horizontal tablist.
		await press(page, 'ArrowDown');
		await expect(t('Settings')).toBeFocused();
		await press(page, 'Tab');
		await expect(page.getByRole('tabpanel', { name: 'Settings' }).first()).toBeFocused();
		// Back in: the selected tab owns the tab stop.
		await press(page, 'Shift+Tab');
		await expect(t('Settings')).toBeFocused();
		await expect(t('Settings')).toHaveAttribute('tabindex', '0');
		await expect(t('Runs')).toHaveAttribute('tabindex', '-1');
	});

	test('a click selects; a disabled tab cannot be selected', async ({ page }) => {
		await tab(page, 'Automatic tabs', 'Logs').click();
		await expect(value(page, 'auto')).toHaveText('logs');
		await tab(page, 'Automatic tabs', 'Secrets').click({ force: true });
		await expect(value(page, 'auto')).toHaveText('logs');
	});

	test('manual, vertical: arrows move focus only; Enter and Space select; the tab stop returns to the selected tab', async ({
		page
	}) => {
		const t = (name: string) => tab(page, 'Manual tabs', name);
		await expect(tabs(page, 'Manual tabs')).toHaveAttribute('aria-orientation', 'vertical');
		// No value given: the first enabled tab is selected on mount.
		await expect(value(page, 'manual')).toHaveText('runs');
		await tabInto(page, 'Tabs (manual, vertical)');
		await expect(t('Runs')).toBeFocused();
		await press(page, 'ArrowRight');
		await expect(t('Runs')).toBeFocused();
		await press(page, 'ArrowDown');
		await expect(t('Logs')).toBeFocused();
		await expect(value(page, 'manual')).toHaveText('runs');
		await expect(t('Runs')).toHaveAttribute('aria-selected', 'true');
		await press(page, 'Enter');
		await expect(value(page, 'manual')).toHaveText('logs');
		await press(page, 'ArrowDown');
		await expect(t('Settings')).toBeFocused();
		await press(page, ' ');
		await expect(value(page, 'manual')).toHaveText('settings');
		await press(page, 'ArrowUp', 'ArrowUp');
		await expect(t('Runs')).toBeFocused();
		await expect(value(page, 'manual')).toHaveText('settings');
		await press(page, 'Tab');
		await press(page, 'Shift+Tab');
		await expect(t('Settings')).toBeFocused();
	});

	test('RTL: ArrowLeft moves to the next tab', async ({ page }) => {
		const t = (name: string) => tab(page, 'RTL tabs', name);
		await tabInto(page, 'Tabs (RTL)');
		await expect(t('Runs')).toBeFocused();
		await press(page, 'ArrowLeft');
		await expect(t('Logs')).toBeFocused();
		await expect(t('Logs')).toHaveAttribute('aria-selected', 'true');
		await press(page, 'ArrowRight');
		await expect(t('Runs')).toBeFocused();
		await expect(t('Runs')).toHaveAttribute('aria-selected', 'true');
	});

	test('when the selected tab leaves the list, the first enabled tab is selected and its panel shows', async ({ page }) => {
		const t = (name: string) => tab(page, 'Automatic tabs', name);
		await t('Logs').click();
		await expect(value(page, 'auto')).toHaveText('logs');
		await page.getByRole('button', { name: 'Remove the Logs tab' }).click();
		await expect(t('Logs')).toHaveCount(0);
		await expect(value(page, 'auto')).toHaveText('runs');
		await expect(t('Runs')).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('tabpanel', { name: 'Runs' }).first()).toBeVisible();
		// Removing an unselected tab changes nothing.
		await page.getByRole('button', { name: 'Restore the Logs tab' }).click();
		await t('Settings').click();
		await page.getByRole('button', { name: 'Remove the Logs tab' }).click();
		await expect(t('Logs')).toHaveCount(0);
		await expect(value(page, 'auto')).toHaveText('settings');
	});
});

test.describe('accordion', () => {
	const header = (page: Page, name: string): Locator => page.getByRole('button', { name, exact: true });
	const panelOf = async (page: Page, name: string): Promise<Locator> =>
		page.locator(`#${await header(page, name).getAttribute('aria-controls')}`);
	/** The panel's content: a closed panel keeps its own (border) box but skips rendering its content. */
	const bodyOf = async (page: Page, name: string): Promise<Locator> => (await panelOf(page, name)).locator('p');

	test('headings wrap buttons; closed panels are hidden until found', async ({ page }) => {
		const what = header(page, 'What is a run?');
		await expect(page.getByRole('heading', { level: 3, name: 'What is a run?' })).toBeVisible();
		await expect(what).toHaveAttribute('aria-expanded', 'true');
		// Single and not collapsible: the open header says it cannot be collapsed.
		await expect(what).toHaveAttribute('aria-disabled', 'true');
		const open = await panelOf(page, 'What is a run?');
		await expect(open.locator('p')).toBeVisible();
		await expect(open).toHaveAttribute('role', 'region');
		await expect(open).toHaveAttribute('aria-labelledby', (await what.getAttribute('id'))!);
		const closed = await panelOf(page, 'Can I hide a run?');
		await expect(closed).toHaveAttribute('hidden', 'until-found');
		await expect(closed.locator('p')).toBeHidden();
	});

	test('single, not collapsible: a click opens one and closes the other; the open one stays open', async ({ page }) => {
		await header(page, 'Where do logs go?').click();
		await expect(value(page, 'faq')).toHaveText('where');
		await expect(header(page, 'What is a run?')).toHaveAttribute('aria-expanded', 'false');
		await expect(await bodyOf(page, 'What is a run?')).toBeHidden();
		// aria-disabled, but still a focusable button: pressing it does nothing.
		await header(page, 'Where do logs go?').click({ force: true });
		await expect(value(page, 'faq')).toHaveText('where');
	});

	test('keyboard: arrows, Home/End move between headers (wrapping); Enter and Space toggle; all headers are tabbable', async ({
		page
	}) => {
		const what = header(page, 'What is a run?');
		const where = header(page, 'Where do logs go?');
		const hide = header(page, 'Can I hide a run?');
		await tabInto(page, 'Accordion (single, not collapsible)');
		await expect(what).toBeFocused();
		await press(page, 'ArrowDown');
		await expect(where).toBeFocused();
		await press(page, 'ArrowDown');
		await expect(hide).toBeFocused();
		await press(page, 'ArrowDown');
		await expect(what).toBeFocused();
		await press(page, 'ArrowUp');
		await expect(hide).toBeFocused();
		await press(page, 'Home');
		await expect(what).toBeFocused();
		await press(page, 'End');
		await expect(hide).toBeFocused();
		await press(page, 'Enter');
		await expect(value(page, 'faq')).toHaveText('secret');
		await press(page, 'ArrowUp', ' ');
		await expect(value(page, 'faq')).toHaveText('where');
		// Every header is in the tab order (no roving tabindex).
		for (const h of [what, where, hide]) await expect(h).not.toHaveAttribute('tabindex');
		await what.focus();
		await press(page, 'Tab');
		await expect(where).toBeFocused();
	});

	test('find-in-page reveals a closed panel through beforematch', async ({ page }) => {
		const panel = await panelOf(page, 'Can I hide a run?');
		await expect(panel.locator('p')).toBeHidden();
		// Chromium's window.find matches text inside hidden="until-found" but does not fire
		// beforematch or reveal it (the real find bar does). Fire the event the find bar fires.
		await page.evaluate(() => (window as unknown as { find: (s: string) => boolean }).find('quetzalcoatl'));
		if ((await panel.getAttribute('hidden')) !== null) {
			await panel.evaluate((el) => el.dispatchEvent(new Event('beforematch', { bubbles: true })));
		}
		await expect(panel.locator('p')).toBeVisible();
		await expect(panel).not.toHaveAttribute('hidden');
		await expect(value(page, 'faq')).toHaveText('secret');
		await expect(header(page, 'Can I hide a run?')).toHaveAttribute('aria-expanded', 'true');
		await expect(await panelOf(page, 'What is a run?')).toHaveAttribute('hidden', 'until-found');
	});

	test('multiple: items open independently', async ({ page }) => {
		await header(page, 'Section alpha').click();
		await header(page, 'Section beta').click();
		await expect(value(page, 'multi')).toHaveText('alpha,beta');
		await expect(await bodyOf(page, 'Section alpha')).toBeVisible();
		await expect(header(page, 'Section alpha')).not.toHaveAttribute('aria-disabled');
		await header(page, 'Section alpha').click();
		await expect(value(page, 'multi')).toHaveText('beta');
		await expect(await bodyOf(page, 'Section alpha')).toBeHidden();
	});

	/** What the browser's find bar does: remove `hidden`, then fire `beforematch`. */
	async function findReveal(panel: Locator): Promise<void> {
		await panel.evaluate((el) => {
			el.removeAttribute('hidden');
			el.dispatchEvent(new Event('beforematch', { bubbles: true }));
		});
	}

	test('find-in-page cannot open an item the controlled owner refuses, nor a disabled one', async ({ page }) => {
		for (const name of ['Vault', 'Disabled item']) {
			const panel = await panelOf(page, name);
			await findReveal(panel);
			await expect(panel).toHaveAttribute('hidden', 'until-found');
			await expect(panel.locator('p')).toBeHidden();
			await expect(header(page, name)).toHaveAttribute('aria-expanded', 'false');
		}
		await expect(value(page, 'guarded')).toHaveText('none');
		// An item the owner accepts opens as usual, and the refused one still opens later on accept.
		const open = await panelOf(page, 'Open item');
		await findReveal(open);
		await expect(value(page, 'guarded')).toHaveText('open');
		await expect(open).not.toHaveAttribute('hidden');
		await expect(header(page, 'Open item')).toHaveAttribute('aria-expanded', 'true');
		await header(page, 'Open item').click();
		await expect(open).toHaveAttribute('hidden', 'until-found');
	});
});

test.describe('radio group', () => {
	const radio = (page: Page, name: string): Locator =>
		page.getByRole('radiogroup', { name: 'Size' }).getByRole('radio', { name });
	const formValue = (page: Page) => page.getByTestId('size-form').locator('input[name="size"]');

	test('Tab enters on the first radio without checking it; Enter does nothing; Space checks', async ({ page }) => {
		await tabInto(page, 'Radio group');
		await expect(radio(page, 'Small')).toBeFocused();
		await expect(value(page, 'size')).toHaveText('none');
		await press(page, 'Enter');
		await expect(value(page, 'size')).toHaveText('none');
		await press(page, ' ');
		await expect(value(page, 'size')).toHaveText('small');
		await expect(radio(page, 'Small')).toHaveAttribute('aria-checked', 'true');
		await expect(formValue(page)).toHaveValue('small');
	});

	test('arrows move and check, skip disabled and wrap, in both axes', async ({ page }) => {
		await tabInto(page, 'Radio group');
		await press(page, 'ArrowRight');
		await expect(radio(page, 'Medium')).toBeFocused();
		await expect(value(page, 'size')).toHaveText('medium');
		await press(page, 'ArrowDown');
		await expect(radio(page, 'Large')).toBeFocused();
		await expect(value(page, 'size')).toHaveText('large');
		await expect(radio(page, 'Huge')).toHaveAttribute('aria-checked', 'false');
		await press(page, 'ArrowRight');
		await expect(radio(page, 'Small')).toBeFocused();
		await expect(value(page, 'size')).toHaveText('small');
		await press(page, 'ArrowUp');
		await expect(radio(page, 'Large')).toBeFocused();
		await press(page, 'ArrowLeft');
		await expect(radio(page, 'Medium')).toBeFocused();
		await expect(value(page, 'size')).toHaveText('medium');
		await expect(formValue(page)).toHaveValue('medium');
		// Out and back in: focus lands on the checked radio.
		await press(page, 'Tab', 'Shift+Tab');
		await expect(radio(page, 'Medium')).toBeFocused();
	});

	test('a click checks; a disabled radio cannot be checked', async ({ page }) => {
		await radio(page, 'Large').click();
		await expect(value(page, 'size')).toHaveText('large');
		await radio(page, 'Huge').click({ force: true });
		await expect(value(page, 'size')).toHaveText('large');
	});

	test('required really blocks submit; once checked the value posts like a native radio', async ({ page }) => {
		const form = page.getByTestId('size-form');
		const submit = page.getByRole('button', { name: 'Submit sizes' });
		await expect(formValue(page)).toHaveAttribute('aria-hidden', 'true');
		await expect(formValue(page)).toHaveAttribute('tabindex', '-1');
		expect(await form.evaluate((f: HTMLFormElement) => f.checkValidity())).toBe(false);
		await submit.click();
		await expect(page.getByTestId('posted')).toHaveText('nothing');
		await radio(page, 'Medium').click();
		expect(await form.evaluate((f: HTMLFormElement) => f.checkValidity())).toBe(true);
		await submit.click();
		await expect(page.getByTestId('posted')).toHaveText('size=medium&plan=free');
	});

	test('a form reset restores the initial values, state and form input', async ({ page }) => {
		const plan = (name: string) => page.getByRole('radiogroup', { name: 'Plan' }).getByRole('radio', { name });
		await radio(page, 'Large').click();
		await plan('pro').click();
		await expect(value(page, 'plan')).toHaveText('pro');
		await page.getByRole('button', { name: 'Reset sizes' }).click();
		await expect(value(page, 'size')).toHaveText('none');
		await expect(value(page, 'plan')).toHaveText('free');
		await expect(plan('free')).toHaveAttribute('aria-checked', 'true');
		await expect(radio(page, 'Large')).toHaveAttribute('aria-checked', 'false');
		const inputs = await page.getByTestId('size-form').evaluate((f: HTMLFormElement) =>
			[...new FormData(f)].map(([k, v]) => `${k}=${v}`).join('&')
		);
		expect(inputs).toBe('plan=free');
	});
});

test.describe('toggle group', () => {
	const toggle = (page: Page, group: string, name: string): Locator =>
		page.getByRole(group === 'Alignment' ? 'toolbar' : 'group', { name: group }).getByRole('button', { name });

	test('multiple: arrows move focus without pressing; Space and Enter toggle; disabled is skipped', async ({ page }) => {
		const t = (name: string) => toggle(page, 'Marks', name);
		await tabInto(page, 'Toggle groups');
		await expect(t('bold')).toBeFocused();
		await press(page, 'ArrowRight');
		await expect(t('code')).toBeFocused();
		await expect(value(page, 'marks')).toHaveText('none');
		await press(page, ' ');
		await expect(t('code')).toHaveAttribute('aria-pressed', 'true');
		await press(page, 'ArrowRight');
		await expect(t('bold')).toBeFocused();
		await press(page, 'Enter');
		await expect(value(page, 'marks')).toHaveText('code,bold');
		await press(page, 'End', ' ');
		await expect(value(page, 'marks')).toHaveText('bold');
		await expect(t('code')).toHaveAttribute('aria-pressed', 'false');
		await press(page, 'Home');
		await expect(t('bold')).toBeFocused();
	});

	test('single, as a toolbar: one pressed at most; pressing it again releases it', async ({ page }) => {
		const t = (name: string) => toggle(page, 'Alignment', name);
		await expect(page.getByRole('toolbar', { name: 'Alignment' })).toHaveAttribute('aria-orientation', 'horizontal');
		await expect(t('left')).toHaveAttribute('aria-pressed', 'true');
		await t('left').focus();
		await press(page, 'ArrowRight', ' ');
		await expect(t('center')).toHaveAttribute('aria-pressed', 'true');
		await expect(t('left')).toHaveAttribute('aria-pressed', 'false');
		await expect(value(page, 'align')).toHaveText('center');
		await press(page, ' ');
		await expect(value(page, 'align')).toHaveText('none');
		await press(page, 'ArrowLeft', 'ArrowLeft');
		await expect(t('right')).toBeFocused();
	});
});
