import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/**
 * Settings shell group: SettingsLayout, SettingsNav, SettingsPage, SettingsSearch, AttentionList.
 * The demos answer after 600 ms; a test that looks at an in-flight state installs the clock before
 * the page loads, pauses it, and advances it by hand.
 */
async function openOnClock(page: Page, slug: string): Promise<Locator> {
	await page.clock.install();
	return openSection(page, slug);
}

async function pauseClock(page: Page): Promise<void> {
	await page.clock.pauseAt(new Date(Date.now() + 5000));
}

/** Longer than the demos' 600 ms answer. */
const SETTLE = 700;

/** A page with JavaScript turned off: the server render only. */
async function openWithoutJs(browser: Browser, baseURL: string | undefined): Promise<{ page: Page; close: () => Promise<void> }> {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
	const page = await context.newPage();
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	return { page, close: () => context.close() };
}

/** Nothing inside `box` sticks out sideways, and no scroll container inside it scrolls sideways. */
async function noHorizontalScroll(box: Locator): Promise<void> {
	const outside = await box.evaluate((el) => {
		const frame = el.getBoundingClientRect();
		const problems: string[] = [];
		for (const node of el.querySelectorAll<HTMLElement>('*')) {
			const r = node.getBoundingClientRect();
			if (r.width > 0 && (r.right > frame.right + 1 || r.left < frame.left - 1)) problems.push(`${node.tagName}.${node.className}`.slice(0, 80));
			const style = getComputedStyle(node).overflowX;
			if ((style === 'auto' || style === 'scroll') && node.scrollWidth > node.clientWidth + 1) problems.push(`scrolls: ${node.tagName}`);
		}
		return problems;
	});
	expect(outside).toEqual([]);
}

test.describe('SettingsLayout', () => {
	test('a wide container shows the rail beside the page, with exactly one aria-current', async ({ page }) => {
		const section = await openSection(page, 'settings-layout');
		const frame = section.getByTestId('layout-frame');
		await expect(frame.locator('[data-settings-rail]')).toBeVisible();
		await expect(frame.locator('[data-settings-page]')).toBeVisible();
		await expect(frame.locator('[aria-current="page"]')).toHaveCount(1);
		await expect(frame.getByRole('link', { name: /^Notifications/ })).toHaveAttribute('aria-current', 'page');
		// The rail look: no index descriptions or chevrons.
		await expect(frame.getByText('Your name, photo and contact email.')).toBeHidden();
		await expect(frame.getByRole('heading', { name: 'Notifications', level: 2 })).toBeVisible();
		await expect(frame.locator('[data-settings-back]')).toBeHidden();
	});

	test('at 360px with nothing current the index shows (attention on top) and the page does not; no horizontal scroll', async ({ page }) => {
		const section = await openSection(page, 'settings-layout');
		const frame = section.getByTestId('layout-index-frame');
		expect((await frame.boundingBox())!.width).toBeLessThanOrEqual(362);
		await expect(frame.locator('[data-view="index"]')).toHaveCount(1);
		await expect(frame.locator('[data-settings-page]')).toBeHidden();
		await expect(frame.getByRole('navigation', { name: 'Settings' })).toBeVisible();
		await expect(frame.getByText('Your name, photo and contact email.')).toBeVisible();
		await expect(frame.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
		await expect(frame.locator('[aria-current="page"]')).toHaveCount(0);
		await noHorizontalScroll(frame);
	});

	test('at phone width a picked section shows alone with a back link, and back returns to the index', async ({ page }) => {
		const section = await openSection(page, 'settings-layout');
		const frame = section.getByTestId('layout-frame');
		await section.getByRole('button', { name: '360 px' }).click();
		await expect.poll(async () => (await frame.boundingBox())!.width).toBeLessThanOrEqual(362);
		await expect(frame.locator('[data-view="section"]')).toHaveCount(1);
		await expect(frame.locator('[data-settings-rail]')).toBeHidden();
		const back = frame.getByRole('link', { name: 'All settings' });
		await expect(back).toBeVisible();
		await noHorizontalScroll(frame);
		await back.focus();
		await press(page, 'Enter');
		await expect(section.getByTestId('layout-current')).toHaveText('the index');
		await expect(frame.locator('[data-settings-rail]')).toBeVisible();
		await expect(frame.getByRole('heading', { name: 'Needs attention' }).first()).toBeVisible();
		await frame.getByRole('link', { name: /^Data/ }).click();
		await expect(frame.getByRole('heading', { name: 'Data', level: 2 })).toBeVisible();
		await expect(frame.locator('[data-settings-rail]')).toBeHidden();
		await expect(frame.locator('[data-nav-link="data"]')).toHaveAttribute('aria-current', 'page');
	});

	test('the filter narrows the links in place; no match offers Clear, which restores them', async ({ page }) => {
		const section = await openSection(page, 'settings-layout');
		const frame = section.getByTestId('layout-frame');
		const filter = frame.getByRole('searchbox', { name: 'Filter settings' });
		await filter.fill('invoices');
		await expect(frame.locator('[data-nav-link]')).toHaveCount(1);
		await expect(frame.getByRole('link', { name: /^Billing/ })).toBeVisible();
		await expect(frame.getByRole('status').filter({ hasText: 'setting' })).toHaveText('1 setting shown');
		await filter.fill('webhooks');
		await expect(frame.getByText('No settings match “webhooks”.').first()).toBeVisible();
		await frame.getByRole('link', { name: 'Clear filter' }).click();
		await expect(filter).toHaveValue('');
		await expect(filter).toBeFocused();
		await expect(frame.locator('[data-nav-link]')).toHaveCount(7);
	});

	test('without JavaScript the layout switches by container alone and the server-rendered filter shows its result', async ({ browser, baseURL }) => {
		const { page, close } = await openWithoutJs(browser, baseURL);
		const section = page.locator('#settings-layout');
		const index = section.getByTestId('layout-index-frame');
		await expect(index.locator('[data-settings-page]')).toBeHidden();
		await expect(index.getByText('Your name, photo and contact email.')).toBeVisible();
		const wide = section.getByTestId('layout-frame');
		await expect(wide.locator('[data-settings-rail]')).toBeVisible();
		await expect(wide.locator('[data-settings-page]')).toBeVisible();
		const noMatch = section.getByTestId('layout-nomatch-frame');
		await expect(noMatch.getByText('No settings match “webhooks”.').last()).toBeVisible();
		await expect(noMatch.getByRole('link', { name: 'Clear filter' })).toHaveAttribute('href', '?section=#settings-layout');
		await expect(noMatch.locator('[data-nav-link]')).toHaveCount(0);
		await close();
	});
});

test.describe('SettingsNav', () => {
	test('each nav marks exactly one current link; marks and badges have spoken text', async ({ page }) => {
		const section = await openSection(page, 'settings-nav');
		for (const id of ['nav-rail', 'nav-index', 'nav-two-up']) {
			await expect(section.getByTestId(id).locator('[aria-current="page"]')).toHaveCount(1);
		}
		const index = section.getByTestId('nav-index');
		// One name (the label); the marks, badge, description and meta describe it.
		const general = index.getByRole('link', { name: 'General', exact: true });
		await expect(general).toHaveAccessibleName('General');
		await expect(general).toHaveAccessibleDescription('Unsaved changes. Team name and address.');
		await expect(index.getByRole('link', { name: 'Billing', exact: true })).toHaveAccessibleDescription('Locked. Plan, seats and invoices.');
		// Each part is its own sentence, and a count badge says it is a count. The demo writes the
		// Members description without a full stop: the nav adds one before the meta.
		await expect(index.getByRole('link', { name: 'Notifications', exact: true })).toHaveAccessibleDescription('Count: 2. What we tell you about, and where.');
		await expect(index.getByRole('link', { name: 'Members', exact: true })).toHaveAccessibleDescription('Who has access, and their roles. 6 members.');
		await expect(index.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();
		await expect(index.getByRole('heading', { name: 'Team', level: 3 })).toBeVisible();
	});

	test('two up applies to the auto look too, until the rail takes over', async ({ page }) => {
		const section = await openSection(page, 'settings-nav');
		const twoUp = section.getByTestId('nav-two-up');
		await expect(twoUp).toHaveAttribute('data-variant', 'auto');
		const list = twoUp.locator('ul').first();
		expect(await list.evaluate((ul) => getComputedStyle(ul).gridTemplateColumns.split(' ').length)).toBe(2);
		// Wider than the rail breakpoint: one column of rail links.
		await twoUp.evaluate((nav) => ((nav.parentElement as HTMLElement).style.maxWidth = '60rem'));
		await expect.poll(() => list.evaluate((ul) => getComputedStyle(ul).display)).toBe('flex');
	});

	test('an unavailable link is text with its reason and never takes focus', async ({ page }) => {
		const section = await openSection(page, 'settings-nav');
		const index = section.getByTestId('nav-index');
		await expect(index.getByRole('link', { name: /Security/ })).toHaveCount(0);
		await expect(index.locator('[data-nav-disabled="security"]')).toContainText('Available on the Business plan.');
		await index.getByRole('link', { name: /^Billing/ }).focus();
		await press(page, 'Tab');
		const landed = await page.evaluate(() => (document.activeElement?.closest('[data-nav-disabled]') ? 'disabled' : (document.activeElement?.getAttribute('data-nav-link') ?? document.activeElement?.tagName)));
		expect(landed).not.toBe('disabled');
		expect(landed).not.toBe('security');
	});

	test('the rail filter filters in place and reports each change', async ({ page }) => {
		const section = await openSection(page, 'settings-nav');
		const rail = section.getByTestId('nav-rail');
		await rail.getByRole('searchbox', { name: 'Filter settings' }).fill('dark mode');
		await expect(rail.locator('[data-nav-link]')).toHaveCount(1);
		await expect(rail.getByRole('link', { name: /^Appearance/ })).toBeVisible();
		await expect(section.getByTestId('nav-filter')).toHaveText('dark mode');
		// Enter does not leave the page: the links are already filtered.
		await press(page, 'Enter');
		await expect(rail.locator('[data-nav-link]')).toHaveCount(1);
		expect(page.url()).not.toContain('q=');
	});

	test('following a link moves aria-current (the demo stands in for the router)', async ({ page }) => {
		const section = await openSection(page, 'settings-nav');
		const rail = section.getByTestId('nav-rail');
		await rail.getByRole('link', { name: /^Members/ }).focus();
		await press(page, 'Enter');
		await expect(section.getByTestId('nav-current')).toHaveText('members');
		await expect(rail.getByRole('link', { name: /^Members/ })).toHaveAttribute('aria-current', 'page');
		await expect(rail.locator('[aria-current="page"]')).toHaveCount(1);
	});

	test('without JavaScript the filter is a GET round trip (`?q=`)', async ({ browser, baseURL }) => {
		const { page, close } = await openWithoutJs(browser, baseURL);
		const rail = page.getByTestId('nav-rail');
		const form = rail.getByRole('search', { name: 'Filter settings' });
		await expect(form).toHaveAttribute('method', 'get');
		await rail.getByRole('searchbox', { name: 'Filter settings' }).fill('billing');
		await rail.getByRole('searchbox', { name: 'Filter settings' }).press('Enter');
		await page.waitForURL(/[?&]q=billing/);
		await close();
	});
});

test.describe('SettingsPage', () => {
	test('the back link shows only in a narrow container', async ({ page }) => {
		const section = await openSection(page, 'settings-page');
		await expect(section.getByTestId('page-wide').locator('[data-settings-back]')).toBeHidden();
		const back = section.getByTestId('page-narrow').getByRole('link', { name: 'Settings' });
		await expect(back).toBeVisible();
		await expect(back).toHaveAttribute('href', '?page=index#settings-page');
		await expect(section.getByTestId('page-wide').getByRole('heading', { name: 'Notifications', level: 2 })).toBeVisible();
	});

	test('a sub-page shows its breadcrumb with the title as the current page', async ({ page }) => {
		const section = await openSection(page, 'settings-page');
		const crumbs = section.getByTestId('page-sub').getByRole('navigation', { name: 'Breadcrumb' });
		await expect(crumbs.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '?page=members#settings-page');
		await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Ben Ortiz');
	});

	test('a scope lock disables nested controls and describes them with its visible reason', async ({ page }) => {
		const section = await openSection(page, 'settings-page');
		const locked = section.getByTestId('page-locked');
		const toggle = locked.getByRole('switch', { name: 'Keep deleted items for 30 days' });
		await expect(toggle).toBeDisabled();
		await expect(toggle).toHaveAttribute('data-locked', 'permission');
		await expect(toggle).toHaveAccessibleDescription(/Only admins can change data settings\./);
		const reasonId = (await toggle.getAttribute('aria-describedby'))!.split(' ').find((id) => id.endsWith('scope-reason'))!;
		await expect(page.locator(`[id="${reasonId}"]`)).toBeVisible();
		await expect(locked.getByRole('combobox', { name: 'Keep activity for' })).toBeDisabled();
		await expect(locked.getByRole('button', { name: 'Export data' })).toBeDisabled();
	});

	test('a scope action loads while its promise runs; a failure is shown and a retry succeeds', async ({ page }) => {
		const section = await openOnClock(page, 'settings-page');
		const locked = section.getByTestId('page-locked');
		const request = locked.getByRole('button', { name: 'Request access' });
		await pauseClock(page);
		await request.focus();
		await press(page, 'Enter');
		await expect(request).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		// The page itself shows the callback's `{ error }`: the demo draws no banner of its own.
		await expect(locked.getByRole('alert')).toHaveText('Couldn’t send your request: nothing was sent. Try again.');
		await expect(request).not.toHaveAttribute('aria-busy', 'true');
		// With a callback the native post is cancelled: still the same page.
		expect(page.url()).not.toContain('intent');
		await press(page, 'Enter');
		await expect(locked.getByRole('alert')).toHaveCount(0);
		await page.clock.runFor(SETTLE);
		const done = locked.getByRole('button', { name: 'Access requested' });
		await expect(done).toHaveAttribute('aria-disabled', 'true');
		await expect(done).toHaveAccessibleDescription('An admin has your request and will get back to you.');
	});

	test('each scope action keeps its own error: another action finishing later does not clear it', async ({ page }) => {
		const section = await openOnClock(page, 'settings-page');
		const locked = section.getByTestId('page-locked');
		await pauseClock(page);
		// Request access fails at +600 ms; Notify me, started at +300 ms, succeeds at +900 ms.
		await locked.getByRole('button', { name: 'Request access' }).click();
		await page.clock.runFor(300);
		await locked.getByRole('button', { name: 'Notify me' }).click();
		await page.clock.runFor(400);
		const alert = locked.getByRole('alert');
		await expect(alert).toHaveText('Couldn’t send your request: nothing was sent. Try again.');
		await page.clock.runFor(400);
		await expect(locked.getByRole('button', { name: 'You’ll be notified' })).toHaveAttribute('aria-disabled', 'true');
		await expect(alert).toHaveText('Couldn’t send your request: nothing was sent. Try again.');
		// Running the failed action again clears its own error.
		await locked.getByRole('button', { name: 'Request access' }).click();
		await expect(alert).toHaveCount(0);
	});

	test('starting another action after an error is shown leaves that error in place', async ({ page }) => {
		const section = await openOnClock(page, 'settings-page');
		const locked = section.getByTestId('page-locked');
		await pauseClock(page);
		await locked.getByRole('button', { name: 'Request access' }).click();
		await page.clock.runFor(SETTLE);
		const alert = locked.getByRole('alert');
		await expect(alert).toHaveText('Couldn’t send your request: nothing was sent. Try again.');
		// Notify me starts (and is still running): Request access was never retried, so its error stays.
		await locked.getByRole('button', { name: 'Notify me' }).click();
		await expect(locked.getByRole('button', { name: 'Notify me' })).toHaveAttribute('aria-busy', 'true');
		await expect(alert).toHaveText('Couldn’t send your request: nothing was sent. Try again.');
		await page.clock.runFor(SETTLE);
		await expect(locked.getByRole('button', { name: 'You’ll be notified' })).toHaveAttribute('aria-disabled', 'true');
		await expect(alert).toHaveText('Couldn’t send your request: nothing was sent. Try again.');
	});

	test('focus stays on an action that finishes last, after every intent action has become unavailable', async ({ page }) => {
		const section = await openOnClock(page, 'settings-page');
		const locked = section.getByTestId('page-locked');
		await pauseClock(page);
		await locked.getByRole('button', { name: 'Notify me' }).focus();
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(locked.getByRole('button', { name: 'You’ll be notified' })).toBeFocused();
		const request = locked.getByRole('button', { name: 'Request access' });
		await request.focus();
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		await expect(request).toBeFocused();
		await press(page, 'Enter');
		await page.clock.runFor(SETTLE);
		// Nothing posts any more, yet the buttons keep their wrapper: none is rebuilt, so focus stays.
		const done = locked.getByRole('button', { name: 'Access requested' });
		await expect(done).toHaveAttribute('aria-disabled', 'true');
		await expect(done).toBeFocused();
		await expect(locked.locator('form[data-settings-scope-form]')).toHaveCount(1);
	});

	test('without JavaScript an intent scope action posts its intent from the page’s own form', async ({ browser, baseURL }) => {
		const { page, close } = await openWithoutJs(browser, baseURL);
		const request = page.getByTestId('page-locked').getByRole('button', { name: 'Request access' });
		await expect(request).toHaveAttribute('type', 'submit');
		const form = await request.evaluate((button: HTMLButtonElement) => button.form && { method: button.form.method, scope: button.form.hasAttribute('data-settings-scope-form') });
		expect(form).toEqual({ method: 'post', scope: true });
		const posted = page.waitForRequest((r) => r.method() === 'POST');
		await request.click();
		expect((await posted).postData()).toBe('intent=request-access');
		await close();
	});
});

test.describe('SettingsSearch', () => {
	test('typing finds individual settings, marks the match and names the section', async ({ page }) => {
		const section = await openSection(page, 'settings-search');
		const inline = section.getByTestId('search-inline');
		await inline.getByRole('searchbox', { name: 'Search settings' }).fill('retention');
		const result = inline.getByRole('link', { name: /Data retention/ });
		await expect(result).toHaveCount(1);
		await expect(result).toContainText('in Data');
		await expect(result.locator('mark')).toHaveText('retention');
		await expect(inline.getByRole('status')).toHaveText('1 result');
		await expect(section.getByTestId('search-query')).toHaveText('retention');
		await inline.getByRole('searchbox', { name: 'Search settings' }).fill('résumé');
		await expect(inline.getByRole('link', { name: /Résumé visibility/ })).toBeVisible();
		await inline.getByRole('searchbox', { name: 'Search settings' }).fill('zebra');
		await expect(inline.getByText('No settings match “zebra”.').last()).toBeVisible();
		await expect(inline.getByRole('status')).toHaveText('No settings match “zebra”.');
	});

	test('arrow keys move through the results; Up from the first returns to the box; Enter follows the link', async ({ page }) => {
		const section = await openSection(page, 'settings-search');
		const inline = section.getByTestId('search-inline');
		const box = inline.getByRole('searchbox', { name: 'Search settings' });
		await box.fill('name');
		const results = inline.locator('[data-search-result]');
		await expect(results).toHaveCount(2);
		await press(page, 'ArrowDown');
		await expect(results.nth(0)).toBeFocused();
		await expect(results.nth(0)).toContainText('Display name');
		await press(page, 'ArrowDown');
		await expect(results.nth(1)).toBeFocused();
		await press(page, 'ArrowUp', 'ArrowUp');
		await expect(box).toBeFocused();
		// Escape from any result returns to the box too.
		await press(page, 'ArrowDown', 'ArrowDown');
		await expect(results.nth(1)).toBeFocused();
		await press(page, 'Escape');
		await expect(box).toBeFocused();
		await expect(box).toHaveValue('name');
		await press(page, 'ArrowDown', 'ArrowDown', 'Enter');
		await expect(section.getByTestId('search-opened')).toHaveText('?setting=team-name#settings-search');
		await expect(page).toHaveURL(/\?setting=team-name#settings-search$/);
	});

	test('with JavaScript, Enter in a box without a results page stays put: the results are already shown', async ({ page }) => {
		const section = await openSection(page, 'settings-search');
		const inline = section.getByTestId('search-inline');
		const box = inline.getByRole('searchbox', { name: 'Search settings' });
		await box.fill('retention');
		await expect(inline.locator('[data-search-result]')).toHaveCount(1);
		const navigated = page.waitForEvent('framenavigated', { timeout: 1000 }).then(
			() => true,
			() => false
		);
		await press(page, 'Enter');
		expect(await navigated).toBe(false);
		expect(page.url()).not.toContain('q=');
		await expect(box).toBeFocused();
		await expect(inline.locator('[data-search-result]')).toHaveCount(1);
	});

	test('a result is named by its label and described by its section and description', async ({ page }) => {
		const section = await openSection(page, 'settings-search');
		const inline = section.getByTestId('search-inline');
		await inline.getByRole('searchbox', { name: 'Search settings' }).fill('retention');
		const result = inline.locator('[data-search-result]');
		await expect(result).toHaveAccessibleName('Data retention');
		await expect(result).toHaveAccessibleDescription(/^in Data/);
	});

	test('the shortcut focuses the box from anywhere outside a text field', async ({ page }) => {
		const section = await openSection(page, 'settings-search');
		await section.getByRole('button', { name: /Jump to a setting/ }).focus();
		await press(page, '/');
		await expect(section.getByTestId('search-inline').getByRole('searchbox')).toBeFocused();
	});

	test('the same entries feed a command palette', async ({ page }) => {
		const section = await openSection(page, 'settings-search');
		await section.getByRole('button', { name: /Jump to a setting/ }).click();
		const dialog = section.getByRole('dialog');
		const input = dialog.getByRole('combobox', { name: 'Search settings' });
		await expect(input).toBeFocused();
		await page.keyboard.type('retention');
		await expect(dialog.getByRole('option', { name: /Data retention/ })).toBeVisible();
		await press(page, 'Enter');
		await expect(section.getByTestId('search-opened')).toHaveText('?setting=retention#settings-search');
	});

	test('without JavaScript the results page is server-rendered links and the box is a GET form', async ({ browser, baseURL }) => {
		const { page, close } = await openWithoutJs(browser, baseURL);
		const results = page.getByTestId('search-page');
		await expect(results).toHaveAttribute('method', 'get');
		await expect(results.getByText('2 results').last()).toBeVisible();
		await expect(results.getByRole('link', { name: /Email digest/ })).toHaveAttribute('href', '?setting=email-digest#settings-search');
		await expect(results.getByRole('link', { name: /Contact email/ }).locator('mark')).toHaveText('email');
		const inline = page.getByTestId('search-inline');
		await inline.getByRole('searchbox', { name: 'Search settings' }).fill('theme');
		await inline.getByRole('searchbox', { name: 'Search settings' }).press('Enter');
		await page.waitForURL(/[?&]q=theme/);
		await close();
	});
});

test.describe('AttentionList', () => {
	test('the count is the number of items; with none the list is hidden', async ({ page }) => {
		const section = await openSection(page, 'attention-list');
		const wide = section.getByTestId('attention-wide');
		await expect(wide.locator('[data-attention-item]')).toHaveCount(3);
		await expect(wide.locator('[data-attention-count]')).toHaveText('3');
		await expect(wide.getByRole('heading', { name: 'Needs attention', level: 3 })).toBeVisible();
		await expect(wide).toContainText('(3 items)');
		await expect(section.getByTestId('attention-empty')).toBeHidden();
		await expect(section.getByTestId('attention-empty')).toHaveAttribute('hidden', '');
		// The tone is spoken, not only coloured.
		await expect(wide.getByText('Warning:')).toHaveCount(1);
	});

	test('the whole item follows its action, with no nested interactive elements', async ({ page }) => {
		const section = await openSection(page, 'attention-list');
		const narrow = section.getByTestId('attention-narrow');
		// The action's overlay covers the item, so a click on the description lands on the link.
		const box = (await narrow.getByText('42 of 50 seats used.').boundingBox())!;
		await page.mouse.click(box.x + 4, box.y + box.height / 2);
		await expect(section.getByTestId('attention-followed')).toHaveText('attention-narrow-seats');
		await expect(narrow.getByRole('link', { name: 'Add seats' })).toHaveAccessibleDescription(/Almost out of seats/);
		const results = await new AxeBuilder({ page }).include('#attention-list').withRules(['nested-interactive']).analyze();
		expect(results.violations).toEqual([]);
	});

	test('dismissing loads, then focus moves to the next item', async ({ page }) => {
		const section = await openOnClock(page, 'attention-list');
		const narrow = section.getByTestId('attention-narrow');
		const dismiss = narrow.getByRole('button', { name: 'Dismiss: Almost out of seats' });
		await pauseClock(page);
		await dismiss.focus();
		await press(page, 'Enter');
		await expect(dismiss).toHaveAttribute('aria-busy', 'true');
		await expect(narrow.locator('[data-attention-item="seats"]')).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		await expect(narrow.locator('[data-attention-item]')).toHaveCount(2);
		await expect(narrow.locator('[data-attention-count]')).toHaveText('2');
		await expect(narrow.getByRole('link', { name: 'Send link' })).toBeFocused();
	});

	test('a failed dismissal keeps the item and says so; an item that is not dismissible has no button', async ({ page }) => {
		const section = await openOnClock(page, 'attention-list');
		const wide = section.getByTestId('attention-wide');
		await pauseClock(page);
		const email = wide.getByRole('button', { name: 'Dismiss: Confirm your contact email' });
		await email.click();
		await page.clock.runFor(SETTLE);
		await expect(wide.getByRole('alert')).toHaveText('Couldn’t dismiss “Confirm your contact email”. It’s still here.');
		await expect(wide.locator('[data-attention-item]')).toHaveCount(3);
		await email.click();
		await page.clock.runFor(SETTLE);
		await expect(wide.locator('[data-attention-item]')).toHaveCount(2);
		// The server answers `{ error }`: the item stays, and the alert gives the server's reason.
		const seats = wide.getByRole('button', { name: 'Dismiss: Almost out of seats' });
		await seats.click();
		await page.clock.runFor(SETTLE);
		await expect(wide.getByRole('alert')).toHaveText('The server is busy, so the warning stays for now. Try again in a moment.');
		await expect(wide.locator('[data-attention-item]')).toHaveCount(2);
		await expect(seats).toBeFocused();
		await seats.click();
		await expect(wide.getByRole('alert')).toHaveCount(0);
		await page.clock.runFor(SETTLE);
		// "Unsaved changes" is not dismissible: it stays until the app resolves it.
		await expect(wide.locator('[data-attention-item]')).toHaveCount(1);
		await expect(wide.getByRole('button', { name: /Dismiss/ })).toHaveCount(0);
		await expect(wide.getByRole('link', { name: 'Review' })).toBeFocused();
	});

	test('without JavaScript there is no dismiss button: dismissing needs it, and the items and their links stay', async ({ browser, baseURL }) => {
		const { page, close } = await openWithoutJs(browser, baseURL);
		const narrow = page.getByTestId('attention-narrow');
		await expect(narrow.locator('[data-attention-item]')).toHaveCount(3);
		await expect(narrow.getByRole('button', { name: /Dismiss/ })).toHaveCount(0);
		await expect(narrow.getByRole('link', { name: 'Add seats' })).toHaveAttribute('href', '?attention=attention-narrow-seats#attention-list');
		await close();
	});

	test('dismissing the last item keeps the heading, says all is clear and takes focus there', async ({ page }) => {
		const section = await openSection(page, 'attention-list');
		const narrow = section.getByTestId('attention-narrow');
		for (const label of ['Confirm your contact email', 'Almost out of seats', 'Unsaved changes in General']) {
			await narrow.getByRole('button', { name: `Dismiss: ${label}` }).click();
			await expect(narrow.getByRole('button', { name: `Dismiss: ${label}` })).toHaveCount(0);
		}
		await expect(narrow.getByText('Nothing needs attention right now.')).toBeVisible();
		await expect(narrow.getByRole('heading', { name: 'Before you go' })).toBeFocused();
		await expect(narrow.locator('[data-attention-count]')).toHaveCount(0);
	});
});

/** The focus ring a focused element actually draws, and whether it matches :focus-visible. */
async function ring(target: Locator): Promise<{ style: string; width: string; visible: boolean }> {
	return target.evaluate((el) => {
		const style = getComputedStyle(el);
		return { style: style.outlineStyle, width: style.outlineWidth, visible: el.matches(':focus-visible') };
	});
}

test.describe('Shell: focus rings, forced colours, the index alone and early typing', () => {
	test('a keyboard-focused nav link, search result and attention heading each draw a solid ring', async ({ page }) => {
		const layout = (await openSection(page, 'settings-layout')).getByTestId('layout-frame');
		await layout.getByRole('searchbox', { name: 'Filter settings' }).focus();
		await press(page, 'Tab');
		const profile = layout.getByRole('link', { name: /^Profile/ });
		await expect(profile).toBeFocused();
		expect(await ring(profile)).toEqual({ style: 'solid', width: '2px', visible: true });

		const search = page.locator('#settings-search').getByTestId('search-inline');
		await search.getByRole('searchbox', { name: 'Search settings' }).fill('retention');
		await press(page, 'ArrowDown');
		const result = search.getByRole('link', { name: /Data retention/ });
		await expect(result).toBeFocused();
		expect(await ring(result)).toEqual({ style: 'solid', width: '2px', visible: true });

		const narrow = page.locator('#attention-list').getByTestId('attention-narrow');
		for (const label of ['Confirm your contact email', 'Almost out of seats', 'Unsaved changes in General']) {
			await narrow.getByRole('button', { name: `Dismiss: ${label}` }).focus();
			await press(page, 'Enter');
			await expect(narrow.getByRole('button', { name: `Dismiss: ${label}` })).toHaveCount(0);
		}
		const heading = narrow.getByRole('heading', { name: 'Before you go' });
		await expect(heading).toBeFocused();
		expect(await ring(heading)).toEqual({ style: 'solid', width: '2px', visible: true });
	});

	test('in forced colours the current link has an edge and the unsaved dot is drawn as a border', async ({ page }) => {
		await page.emulateMedia({ forcedColors: 'active' });
		const rail = (await openSection(page, 'settings-nav')).getByTestId('nav-rail');
		const current = rail.locator('[data-nav-link="general"]');
		await expect(current).toHaveAttribute('aria-current', 'page');
		const edge = (link: Locator) => link.evaluate((el) => getComputedStyle(el).borderInlineStartWidth);
		expect(await edge(current)).toBe('4px');
		expect(await edge(rail.locator('[data-nav-link="profile"]'))).toBe('0px');
		expect(await current.locator('[data-nav-dirty]').evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('3px');
		// Outside forced colours the accent bar and the filled dot carry it; no border.
		await page.emulateMedia({ forcedColors: 'none' });
		expect(await edge(current)).toBe('0px');
	});

	test('a wide layout with nothing current shows the index on its own, attention on top, and no empty page', async ({ page }) => {
		const section = await openSection(page, 'settings-layout');
		const frame = section.getByTestId('layout-frame');
		await section.getByRole('button', { name: '360 px' }).click();
		await frame.getByRole('link', { name: 'All settings' }).click();
		await expect(section.getByTestId('layout-current')).toHaveText('the index');
		await section.getByRole('button', { name: '1300 px' }).click();
		await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(800);
		await expect(frame.locator('[data-overview]')).toHaveCount(1);
		await expect(frame.locator('[data-settings-page]')).toHaveCount(0);
		const attention = frame.getByRole('heading', { name: 'Needs attention' });
		await expect(attention).toBeVisible();
		// The index look: descriptions show, under the attention list.
		await expect(frame.getByText('Your name, photo and contact email.')).toBeVisible();
		const profile = frame.getByRole('link', { name: /^Profile/ });
		expect((await attention.boundingBox())!.y).toBeLessThan((await profile.boundingBox())!.y);
	});

	test('the composed area with nothing current has one h1 at phone and desktop width', async ({ page }) => {
		// The fixture is prerendered on its Workspace page and reads `?section=` in the browser, so go
		// to the index the way a person does: the back link.
		await page.setViewportSize({ width: 390, height: 900 });
		await page.goto('/fixtures/settings-composed/');
		await expect(page.getByRole('switch', { name: 'Play a sound' })).toBeEnabled({ timeout: 45000 });
		await page.getByRole('link', { name: 'All settings' }).click();
		await expect(page).toHaveURL(/[?&]section=$/);
		for (const width of [390, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
			await expect(page.getByRole('heading', { level: 2, name: 'Needs attention' })).toBeVisible();
			await expect(page.locator('h1')).toHaveCount(1);
			const results = await new AxeBuilder({ page }).withRules(['page-has-heading-one', 'heading-order']).analyze();
			expect(results.violations.map((v) => v.id)).toEqual([]);
		}
	});

	test('loading the composed index directly gives one h1: heading levels follow the browser, not the prerender', async ({ page }) => {
		// The fixture is prerendered with Workspace current (nav title h2, attention h3). Loaded with
		// `?section=`, nothing is current in the browser, so once hydrated the levels are h1 and h2.
		for (const width of [1440, 390, 360]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/fixtures/settings-composed/?section=');
			await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible({ timeout: 45000 });
			await expect(page.getByRole('heading', { level: 2, name: 'Needs attention' })).toBeVisible();
			await expect(page.locator('h1')).toHaveCount(1);
			const results = await new AxeBuilder({ page }).withRules(['page-has-heading-one', 'heading-order']).analyze();
			expect(results.violations.map((v) => v.id)).toEqual([]);
		}
	});

	test('text typed into the nav filter before the page is interactive filters once it is', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		let release: () => void = () => undefined;
		const held = new Promise<void>((resolve) => (release = resolve));
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			await held;
			await route.continue();
		});
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const frame = page.getByTestId('layout-frame');
		const filter = frame.getByRole('searchbox', { name: 'Filter settings' });
		await filter.fill('invoices');
		release();
		await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
		await expect(filter).toHaveValue('invoices');
		await expect(frame.locator('[data-nav-link]')).toHaveCount(1);
		await expect(frame.getByRole('status').filter({ hasText: 'setting' })).toHaveText('1 setting shown');
	});

	test('the search clear button needs JavaScript, so it only appears once the page is ready', async ({ browser, baseURL, page }) => {
		const { page: noJs, close } = await openWithoutJs(browser, baseURL);
		await expect(noJs.getByTestId('search-page').getByRole('searchbox')).toHaveValue('email');
		await expect(noJs.getByTestId('search-page').getByRole('button', { name: 'Clear search' })).toHaveCount(0);
		await close();
		const section = await openSection(page, 'settings-search');
		const results = section.getByTestId('search-page');
		await results.getByRole('button', { name: 'Clear search' }).click();
		await expect(results.getByRole('searchbox')).toHaveValue('');
	});

	test('an attention callback action loads while it runs, shows a rejection and a refusal; a retry works', async ({ page }) => {
		const section = await openOnClock(page, 'attention-list');
		const list = section.getByTestId('attention-callback');
		const item = list.locator('[data-attention-item="export"]');
		const send = list.getByRole('button', { name: 'Email it to me' });
		await pauseClock(page);
		await send.focus();
		await press(page, 'Enter');
		await expect(item).toHaveAttribute('aria-busy', 'true');
		await expect(send).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(SETTLE);
		// The first send rejects: the generic message shows, and the item is no longer busy.
		await expect(list.getByRole('alert')).toHaveText('“Email it to me” didn’t go through. Try again.');
		await expect(item).not.toHaveAttribute('aria-busy');
		await expect(send).not.toHaveAttribute('aria-busy');
		await expect(send).toBeFocused();
		await press(page, 'Enter');
		await expect(list.getByRole('alert')).toHaveCount(0);
		await page.clock.runFor(SETTLE);
		// The second returns the server's own reason, which wins over the generic message.
		await expect(list.getByRole('alert')).toHaveText('The mail server didn’t answer. Try again.');
		await expect(item).not.toHaveAttribute('aria-busy');
		await expect(send).toBeFocused();
		await press(page, 'Enter');
		await expect(list.getByRole('alert')).toHaveCount(0);
		await page.clock.runFor(SETTLE);
		await expect(list.getByText('Sent. Check your inbox.')).toBeVisible();
		await expect(list.getByRole('alert')).toHaveCount(0);
	});
});
