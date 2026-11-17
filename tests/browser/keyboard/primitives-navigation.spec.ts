import { expect, test } from '@playwright/test';
import { openSection, press } from './helpers';

test.describe('Tabs', () => {
	test('automatic: arrows select and skip the disabled tab; Home and End jump', async ({ page }) => {
		const section = await openSection(page, 'tabs');
		const list = section.getByRole('tablist', { name: 'Workspace sections' });
		const overview = list.getByRole('tab', { name: 'Overview' });
		const members = list.getByRole('tab', { name: 'Members' });
		const alerts = list.getByRole('tab', { name: 'Alerts' });
		await expect(list.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-disabled', 'true');

		await overview.focus();
		await expect(overview).toHaveAttribute('aria-selected', 'true');
		await press(page, 'ArrowRight');
		await expect(members).toBeFocused();
		await expect(members).toHaveAttribute('aria-selected', 'true');
		await expect(section.getByRole('tabpanel', { name: 'Members' }).first()).toBeVisible();
		await press(page, 'ArrowRight');
		await expect(alerts).toBeFocused();
		// The next tab is disabled, so focus wraps to the first one.
		await press(page, 'ArrowRight');
		await expect(overview).toBeFocused();
		await press(page, 'End');
		await expect(alerts).toBeFocused();
		await expect(alerts).toHaveAttribute('aria-selected', 'true');
		await press(page, 'Home');
		await expect(overview).toBeFocused();
		await expect(overview).toHaveAttribute('aria-selected', 'true');
	});

	test('only the selected tab is a tab stop, and Tab moves into its panel', async ({ page }) => {
		const section = await openSection(page, 'tabs');
		const list = section.getByRole('tablist', { name: 'Workspace sections' });
		const overview = list.getByRole('tab', { name: 'Overview' });
		await expect(list.getByRole('tab', { name: 'Members' })).toHaveAttribute('tabindex', '-1');
		await overview.focus();
		await press(page, 'Tab');
		await expect(section.getByRole('tabpanel', { name: 'Overview' }).first()).toBeFocused();
	});

	test('manual: arrows move focus only; Enter and Space select; lazy panels mount on first show', async ({ page }) => {
		const section = await openSection(page, 'tabs');
		const list = section.getByRole('tablist', { name: 'Manual sections' });
		const members = list.getByRole('tab', { name: 'Members' });
		const alerts = list.getByRole('tab', { name: 'Alerts' });
		const settings = list.getByRole('tab', { name: 'Settings' });

		await members.focus();
		await press(page, 'ArrowRight');
		await expect(alerts).toBeFocused();
		await expect(alerts).toHaveAttribute('aria-selected', 'false');
		await expect(members).toHaveAttribute('aria-selected', 'true');
		await press(page, 'Enter');
		await expect(alerts).toHaveAttribute('aria-selected', 'true');
		await press(page, 'ArrowRight');
		await expect(settings).toBeFocused();
		await expect(settings).toHaveAttribute('aria-selected', 'false');
		await press(page, 'Space');
		await expect(settings).toHaveAttribute('aria-selected', 'true');
		await expect(section.getByText('Selected: settings')).toBeVisible();
	});

	test('lazy mount: a never-shown panel has no content until it is selected', async ({ page }) => {
		const section = await openSection(page, 'tabs');
		const list = section.getByRole('tablist', { name: 'Manual sections' });
		const panel = section.locator('[role="tabpanel"][aria-labelledby$="-tab-alerts"]').nth(1);
		await expect(panel).toBeEmpty();
		await list.getByRole('tab', { name: 'Alerts' }).click();
		await expect(panel).not.toBeEmpty();
	});

	test('vertical: ArrowDown and ArrowUp move between tabs', async ({ page }) => {
		const section = await openSection(page, 'tabs');
		const list = section.getByRole('tablist', { name: 'Vertical sections' });
		await expect(list).toHaveAttribute('aria-orientation', 'vertical');
		const alerts = list.getByRole('tab', { name: 'Alerts' });
		await alerts.focus();
		await press(page, 'ArrowDown');
		await expect(list.getByRole('tab', { name: 'Members' })).toBeFocused();
		await press(page, 'ArrowUp', 'ArrowUp');
		await expect(list.getByRole('tab', { name: 'Overview' })).toBeFocused();
	});
});

test.describe('Accordion', () => {
	test('Enter and Space toggle a header; aria-expanded follows', async ({ page }) => {
		const section = await openSection(page, 'accordion');
		const where = section.getByRole('button', { name: 'Where do logs go?' }).first();
		await where.focus();
		await expect(where).toHaveAttribute('aria-expanded', 'false');
		await press(page, 'Enter');
		await expect(where).toHaveAttribute('aria-expanded', 'true');
		await expect(section.getByRole('button', { name: 'What is a run?' }).first()).toHaveAttribute('aria-expanded', 'false');
		await press(page, 'Space');
		await expect(where).toHaveAttribute('aria-expanded', 'false');
	});

	test('headers sit inside headings of the chosen level and ArrowDown moves between them', async ({ page }) => {
		const section = await openSection(page, 'accordion');
		await expect(section.getByRole('heading', { level: 3, name: 'What is a run?' }).first()).toBeVisible();
		await expect(section.getByRole('heading', { level: 4, name: 'Disabled item' })).toBeVisible();
		const first = section.getByRole('button', { name: 'What is a run?' }).first();
		await first.focus();
		await press(page, 'ArrowDown');
		await expect(section.getByRole('button', { name: 'Where do logs go?' }).first()).toBeFocused();
		await press(page, 'End');
		await expect(section.getByRole('button', { name: 'Who can see my keys?' })).toBeFocused();
		await press(page, 'Home');
		await expect(first).toBeFocused();
	});

	test('multiple keeps several items open; a non-collapsible item cannot be closed', async ({ page }) => {
		const section = await openSection(page, 'accordion');
		const multi = section.locator('h4').first().locator('..').locator('..');
		const runs = multi.getByRole('button', { name: 'What is a run?' });
		const logs = multi.getByRole('button', { name: 'Where do logs go?' });
		await logs.click();
		await expect(runs).toHaveAttribute('aria-expanded', 'true');
		await expect(logs).toHaveAttribute('aria-expanded', 'true');
		await expect(multi.getByRole('button', { name: 'Disabled item' })).toHaveAttribute('aria-disabled', 'true');

		const sticky = section.getByRole('button', { name: 'What is a run?' }).last();
		await expect(sticky).toHaveAttribute('aria-expanded', 'true');
		await sticky.focus();
		await press(page, 'Enter');
		await expect(sticky).toHaveAttribute('aria-expanded', 'true');
	});

	test('find-in-page reveals a closed panel through beforematch', async ({ page }) => {
		const section = await openSection(page, 'accordion');
		const keys = section.getByRole('button', { name: 'Who can see my keys?' });
		const panel = section.locator('[id="' + (await keys.getAttribute('aria-controls')) + '"]');
		await expect(panel).toHaveAttribute('hidden', 'until-found');
		// The browser's find bar removes `hidden` and fires `beforematch`; do the same.
		await panel.evaluate((el) => {
			el.removeAttribute('hidden');
			el.dispatchEvent(new Event('beforematch', { bubbles: true }));
		});
		await expect(keys).toHaveAttribute('aria-expanded', 'true');
		await expect(panel).not.toHaveAttribute('hidden');
		await expect(panel.getByText('Keys are never sent to the browser.')).toBeVisible();
	});

	test('find-in-page cannot open a disabled item', async ({ page }) => {
		const section = await openSection(page, 'accordion');
		const off = section.getByRole('button', { name: 'Disabled item' });
		const panel = section.locator('[id="' + (await off.getAttribute('aria-controls')) + '"]');
		await panel.evaluate((el) => {
			el.removeAttribute('hidden');
			el.dispatchEvent(new Event('beforematch', { bubbles: true }));
		});
		await expect(off).toHaveAttribute('aria-expanded', 'false');
		await expect(panel).toHaveAttribute('hidden', 'until-found');
	});
});

test.describe('Breadcrumb', () => {
	test('marks the current page and hides separators from assistive technology', async ({ page }) => {
		const section = await openSection(page, 'breadcrumb');
		const nav = section.getByRole('navigation', { name: 'Breadcrumb' });
		await expect(nav.locator('[aria-current="page"]')).toHaveText('Report 42');
		await expect(nav.locator('ol')).toBeVisible();
		await expect(nav.locator('span[aria-hidden="true"]')).toHaveCount(5);
		// Wide screens show every item and no ellipsis button.
		await expect(nav.getByRole('link')).toHaveCount(4);
		await expect(nav.getByRole('button')).toBeHidden();
	});

	test('narrow: the middle folds behind "…"; Enter expands and moves focus to the first revealed item', async ({ page }) => {
		const section = await openSection(page, 'breadcrumb');
		await page.setViewportSize({ width: 375, height: 800 });
		const nav = section.getByRole('navigation', { name: 'Breadcrumb' });
		await expect(nav.getByRole('link', { name: 'Teams' })).toBeHidden();
		await expect(nav.getByRole('link', { name: 'Acme' })).toBeHidden();
		await expect(nav.getByRole('link', { name: 'Workspace' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible();

		const more = nav.getByRole('button', { name: /Show 2 more levels/ });
		await expect(more).toHaveAttribute('aria-expanded', 'false');
		await more.focus();
		await press(page, 'Enter');
		await expect(nav.getByRole('link', { name: 'Teams' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Acme' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Teams' })).toBeFocused();
		await expect(nav.getByRole('button')).toHaveCount(0);
	});

	test('a breadcrumb that does not collapse never shows the button', async ({ page }) => {
		const section = await openSection(page, 'breadcrumb');
		await page.setViewportSize({ width: 375, height: 800 });
		const nav = section.getByRole('navigation', { name: 'Settings path' });
		await expect(nav.getByRole('link')).toHaveCount(2);
		await expect(nav.getByRole('button')).toHaveCount(0);
	});
});

test.describe('Pagination', () => {
	test('Enter and Space on a page button change the current page', async ({ page }) => {
		const section = await openSection(page, 'pagination');
		const nav = section.getByRole('navigation', { name: 'Run list pages' });
		await expect(nav.getByRole('button', { name: 'Page 6' })).toHaveAttribute('aria-current', 'page');
		await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);

		const seven = nav.getByRole('button', { name: 'Page 7' });
		await seven.focus();
		await press(page, 'Enter');
		await expect(seven).toHaveAttribute('aria-current', 'page');
		await expect(section.getByText('bound page: 7')).toBeVisible();
		const eight = nav.getByRole('button', { name: 'Page 8' });
		await eight.focus();
		await press(page, 'Space');
		await expect(eight).toHaveAttribute('aria-current', 'page');
		await expect(nav.getByRole('button', { name: 'Page 7' })).not.toHaveAttribute('aria-current');
	});

	test('previous and next step the page and disable at the ends', async ({ page }) => {
		const section = await openSection(page, 'pagination');
		const nav = section.getByRole('navigation', { name: 'Compact pages' });
		await page.setViewportSize({ width: 375, height: 800 });
		await expect(nav.getByText('Page 3 of 12')).toBeVisible();
		await expect(nav.getByRole('button', { name: 'Page 3' })).toBeHidden();
		const next = nav.getByRole('button', { name: 'Next' });
		await next.focus();
		await press(page, 'Enter');
		await expect(nav.getByText('Page 4 of 12')).toBeVisible();
		await expect(next).toBeFocused();
		const previous = nav.getByRole('button', { name: 'Previous' });
		for (let i = 0; i < 3; i++) await previous.click();
		await expect(nav.getByText('Page 1 of 12')).toBeVisible();
		await expect(previous).toBeDisabled();
	});

	test('with an href builder the pages are links; the current one is marked', async ({ page }) => {
		const section = await openSection(page, 'pagination');
		const nav = section.getByRole('navigation', { name: 'Search result pages' });
		const current = nav.getByRole('link', { name: 'Page 5' });
		await expect(current).toHaveAttribute('aria-current', 'page');
		await expect(current).toHaveAttribute('href', '#pagination');
		await expect(nav.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '#pagination');
		// Ellipses are decorative: not in the accessibility tree as pages.
		await expect(nav.getByRole('link')).toHaveCount(10);
	});

	test('narrow screens show the short form and hide the numbers', async ({ page }) => {
		const section = await openSection(page, 'pagination');
		await page.setViewportSize({ width: 375, height: 800 });
		const nav = section.getByRole('navigation', { name: 'Run list pages' });
		await expect(nav.getByText('Page 6 of 12')).toBeVisible();
		await expect(nav.getByRole('button', { name: 'Page 6' })).toBeHidden();
	});
});

test.describe('Pagination edge cases', () => {
	test('fewer than two pages render nothing; two and 1000 pages render a sane bar', async ({ page }) => {
		const section = await openSection(page, 'pagination');
		await expect(section.getByRole('navigation', { name: 'No pages' })).toHaveCount(0);
		await expect(section.getByRole('navigation', { name: 'One page' })).toHaveCount(0);

		const two = section.getByRole('navigation', { name: 'Two pages' });
		await expect(two.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
		await expect(two.getByRole('button', { name: 'Page 2' })).toBeVisible();
		await expect(two.getByRole('button', { name: 'Previous' })).toBeDisabled();

		const many = section.getByRole('navigation', { name: 'Many pages' });
		await expect(many.getByRole('button', { name: 'Page 500' })).toHaveAttribute('aria-current', 'page');
		await expect(many.getByRole('button', { name: 'Page 1000' })).toBeVisible();
		// Previous, Next and five page slots (the summary is hidden on wide screens); two of them ellipses hidden from assistive technology.
		await expect(many.locator('li[aria-hidden="true"]')).toHaveCount(2);
		await expect(many.getByRole('listitem')).toHaveCount(7);
	});
});

test.describe('AppShell', () => {
	test('the place on screen is the current page, and a count is part of its link until it reaches 0', async ({ page }) => {
		const section = await openSection(page, 'app-shell');
		const nav = section.getByRole('navigation', { name: 'Main' });
		const board = nav.getByRole('link', { name: 'Board' });
		const settings = nav.getByRole('link', { name: /^Settings/ });
		await expect(board).toHaveAttribute('aria-current', 'page');
		await expect(nav.locator('[aria-current]')).toHaveCount(1);
		await expect(settings).toHaveAccessibleName('Settings 2 open notices');

		// The places are links, one tab stop each.
		await board.focus();
		await press(page, 'Tab', 'Tab');
		await expect(settings).toBeFocused();
		await press(page, 'Enter');
		await expect(settings).toHaveAttribute('aria-current', 'page');
		await expect(nav.locator('[aria-current]')).toHaveCount(1);

		// The count follows what it counts, and is gone at 0.
		await section.getByRole('button', { name: 'Dismiss: Build box is offline' }).click();
		await expect(settings).toHaveAccessibleName('Settings 1 open notices');
		await section.getByRole('button', { name: 'Dismiss: A label could not be written' }).click();
		await expect(settings).toHaveAccessibleName('Settings');
	});

	test('a page scrolls under a bar that stays in view, and a place that fills gives its page exactly the space under the bar', async ({ page }) => {
		const section = await openSection(page, 'app-shell');
		const nav = section.getByRole('navigation', { name: 'Main' });
		const main = section.getByRole('main');
		// The demo's box stands in for the browser window: it is what scrolls.
		const frame = main.locator('xpath=../..');
		const fromTop = () =>
			frame.evaluate((box) => {
				const top = box.getBoundingClientRect().y;
				return { bar: box.querySelector('header')!.getBoundingClientRect().y - top, page: box.querySelector('main')!.getBoundingClientRect().y - top };
			});
		const before = await fromTop();

		await frame.evaluate((box) => box.scrollTo(0, box.scrollHeight));
		const scrolled = await fromTop();
		expect(scrolled.page).toBeLessThan(before.page - 20);
		expect(scrolled.bar).toBeCloseTo(before.bar, 0);

		await nav.getByRole('link', { name: 'Chat' }).click();
		await expect(main.getByText('Message…')).toBeVisible();
		const fill = await frame.evaluate((box) => ({
			scrolls: box.scrollHeight > box.clientHeight,
			page: box.querySelector('main')!.firstElementChild!.getBoundingClientRect().height,
			underBar: box.clientHeight - box.querySelector('header')!.getBoundingClientRect().height
		}));
		expect(fill.scrolls).toBe(false);
		expect(Math.abs(fill.page - fill.underBar)).toBeLessThan(1);
	});

	test('on a phone the places are a row of their own, from edge to edge, under the name and the controls', async ({ page }) => {
		const section = await openSection(page, 'app-shell');
		await page.setViewportSize({ width: 390, height: 800 });
		const nav = section.getByRole('navigation', { name: 'Main' });
		await nav.scrollIntoViewIfNeeded();
		const name = (await section.getByText('Acme', { exact: true }).boundingBox())!;
		const controls = (await section.getByRole('button', { name: 'Sign out' }).boundingBox())!;
		const row = (await nav.boundingBox())!;
		expect(row.y).toBeGreaterThanOrEqual(Math.max(name.y + name.height, controls.y + controls.height));
		const links = await Promise.all((await nav.getByRole('link').all()).map(async (link) => (await link.boundingBox())!));
		expect(links).toHaveLength(3);
		// One row that the places fill between them, each tall enough for a thumb.
		for (const link of links) {
			expect(link.y).toBe(links[0].y);
			expect(link.height).toBeGreaterThanOrEqual(40);
		}
		expect(links[0].x - row.x).toBeLessThanOrEqual(4);
		expect(row.x + row.width - (links[2].x + links[2].width)).toBeLessThanOrEqual(4);
		const shell = section.getByRole('main').locator('xpath=..');
		expect(await shell.evaluate((root) => root.scrollWidth <= root.clientWidth)).toBe(true);
	});
});

test.describe('SectionNav', () => {
	test('Tab walks the sections in order and Enter follows one, which becomes the current page', async ({ page }) => {
		const section = await openSection(page, 'section-nav');
		const nav = section.getByRole('navigation', { name: 'Settings sections' });
		const link = (name: string) => nav.getByRole('link', { name, exact: true });
		await expect(nav.getByRole('link')).toHaveText(['General', 'Subscriptions', 'Machines', 'Repositories', 'Notifications', 'Members']);
		await expect(link('Subscriptions')).toHaveAttribute('aria-current', 'page');

		await link('General').focus();
		for (const name of ['Subscriptions', 'Machines', 'Repositories']) {
			await press(page, 'Tab');
			await expect(link(name)).toBeFocused();
		}
		await press(page, 'Shift+Tab', 'Enter');
		await expect(link('Machines')).toHaveAttribute('aria-current', 'page');
		await expect(nav.locator('[aria-current]')).toHaveCount(1);
		await expect(section.getByRole('heading', { name: 'Machines', exact: true })).toBeVisible();
		await expect(link('Machines')).toBeFocused();
	});

	test('on a phone the sections are one row that scrolls inside the nav, and the page does not', async ({ page }) => {
		const section = await openSection(page, 'section-nav');
		await page.setViewportSize({ width: 390, height: 800 });
		const nav = section.getByRole('navigation', { name: 'Settings sections' });
		await nav.scrollIntoViewIfNeeded();
		const links = await Promise.all((await nav.getByRole('link').all()).map(async (link) => (await link.boundingBox())!));
		for (const link of links) expect(link.y).toBe(links[0].y);
		await expect(nav).toHaveCSS('overflow-x', 'auto');
		expect(await nav.evaluate((box) => box.scrollWidth > box.clientWidth)).toBe(true);
		const box = (await nav.boundingBox())!;
		expect(box.x + box.width).toBeLessThanOrEqual(390);
		expect(await section.evaluate((root) => root.scrollWidth <= root.clientWidth)).toBe(true);
	});
});
