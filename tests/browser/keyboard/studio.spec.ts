import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Loads the Studio chrome fixture (src/routes/studio) and waits for hydration. */
async function open(page: Page, width = 1440): Promise<void> {
	await page.setViewportSize({ width, height: 900 });
	await page.goto('/studio/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

const box = (page: Page) => page.getByTestId('studio');
const bar = (page: Page) => box(page).locator('header').first();
const places = (page: Page) => box(page).getByRole('navigation', { name: 'Main' });
const chat = (page: Page) => box(page).getByRole('region', { name: 'Referee' });
const sidebar = (page: Page) => chat(page).getByRole('complementary', { name: 'Conversations' });
const events = (page: Page) => page.getByTestId('events');
const style = (locator: Locator, property: string) => locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);
const rect = async (locator: Locator) => (await locator.boundingBox())!;

test('Studio bar: 57px with its hairline, the name 16px bold after a 20px mark, flat places, a 36px monospace select', async ({ page }) => {
	await open(page);
	expect((await rect(bar(page))).height).toBeCloseTo(57, 0);
	const name = bar(page).locator('p').first();
	expect(await style(name, 'font-size')).toBe('16px');
	expect(await style(name, 'font-weight')).toBe('700');
	expect((await rect(name.locator('svg'))).width).toBeCloseTo(20, 0);

	const current = places(page).getByRole('link', { name: 'Referee' });
	await expect(current).toHaveAttribute('aria-current', 'page');
	expect((await rect(current)).height).toBeCloseTo(30, 0);
	expect(await style(current, 'font-weight')).toBe('600');
	expect(await style(current, 'border-top-left-radius')).toBe('8px');
	expect(await style(current, 'background-color')).not.toBe('rgba(0, 0, 0, 0)');
	const other = places(page).getByRole('link', { name: 'Settings' });
	expect(await style(other, 'font-weight')).toBe('400');
	expect(await style(other, 'background-color')).toBe('rgba(0, 0, 0, 0)');
	await expect(places(page).getByRole('link', { name: 'Dashboard 2 need you' })).toBeVisible();

	const select = box(page).getByRole('combobox', { name: 'Repository' });
	expect((await rect(select)).height).toBeCloseTo(36, 0);
	expect(await style(select, 'border-top-left-radius')).toBe('8px');
	expect(await style(select, 'font-family')).toMatch(/mono/i);
});

test('Studio bar by keyboard: Tab walks the places in order, Enter moves the current one, then the select', async ({ page }) => {
	await open(page);
	const link = (name: string | RegExp) => places(page).getByRole('link', { name });
	await link(/^Dashboard/).focus();
	await page.keyboard.press('Tab');
	await expect(link('Referee')).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(link('Settings')).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(link('Settings')).toHaveAttribute('aria-current', 'page');
	await expect(places(page).locator('[aria-current="page"]')).toHaveCount(1);
	await page.keyboard.press('Tab');
	const select = box(page).getByRole('combobox', { name: 'Repository' });
	await expect(select).toBeFocused();
	await select.selectOption('acme/api');
	await expect(events(page)).toContainText('repo:acme/api');
});

test('Studio chat: rails of 260 and 300 under the bar, a 720px log over a 656px composer, the design rows and type', async ({ page }) => {
	await open(page);
	const [header, region] = [await rect(bar(page)), await rect(chat(page))];
	const left = await rect(sidebar(page));
	const right = await rect(chat(page).getByRole('complementary', { name: 'At a glance' }));
	expect(left.width).toBeCloseTo(260, 0);
	expect(right.width).toBeCloseTo(300, 0);
	expect(left.y).toBeCloseTo(header.y + header.height, 0);
	expect(right.y).toBeCloseTo(header.y + header.height, 0);
	// The column is wider than the caps, so the caps hold the measure.
	expect(region.width - left.width - right.width).toBeGreaterThan(800);
	const log = await rect(chat(page).getByRole('log'));
	expect(log.width).toBeCloseTo(720, 0);
	expect((await rect(chat(page).locator('form').first())).width).toBeCloseTo(656, 0);

	const title = chat(page).getByRole('heading', { level: 2 });
	await expect(title).toHaveText('What is blocked right now?');
	expect(await style(title, 'font-size')).toBe('15px');
	expect(await style(title, 'font-weight')).toBe('500');
	// The status ends at the log's text inset.
	const status = await rect(chat(page).getByText('Ready · build box online'));
	expect(status.x + status.width).toBeCloseTo(log.x + log.width - 32, 0);

	const row = sidebar(page).getByRole('button', { name: /Plan the sign-in redirects/ });
	expect((await rect(row)).height).toBeCloseTo(34, 0);
	expect((await rect(row.locator('[role="img"][aria-label="acme/web"]'))).width).toBeCloseTo(6, 0);
	const neutral = sidebar(page).getByRole('button', { name: /Morning status/ }).locator('span[aria-hidden="true"]');
	await expect(neutral).toHaveCount(1);
	expect((await rect(neutral)).width).toBeCloseTo(6, 0);
	const fresh = sidebar(page).getByRole('button', { name: 'New chat' });
	expect((await rect(fresh)).height).toBeCloseTo(40, 0);
	expect(await style(fresh, 'font-size')).toBe('14px');
	expect(await style(fresh, 'font-weight')).toBe('400');

	const track = chat(page).getByRole('progressbar', { name: 'Checkout' }).locator(':scope > div').last();
	expect((await rect(track)).height).toBeCloseTo(2, 0);

	const turns = chat(page).locator('article[data-slot="message"]');
	await expect(turns).toHaveCount(2);
	const [asked, reply] = [await rect(turns.nth(0)), await rect(turns.nth(1))];
	expect(reply.y - (asked.y + asked.height)).toBeCloseTo(36, 0);
	await expect(turns.nth(1).locator('svg')).toHaveCount(0);
	await expect(turns.nth(1).locator('header')).toHaveText('Referee · 14:02');
});

test('Studio search by keyboard: the field follows New chat, typing narrows the rows, a miss says so', async ({ page }) => {
	await open(page);
	const rows = sidebar(page).getByRole('navigation', { name: 'Past conversations' }).getByRole('button');
	await expect(rows).toHaveCount(7);
	await sidebar(page).getByRole('button', { name: 'New chat' }).focus();
	await page.keyboard.press('Tab');
	const search = sidebar(page).getByRole('searchbox', { name: 'Search' });
	await expect(search).toBeFocused();
	await page.keyboard.type('plan');
	await expect(rows).toHaveCount(1);
	await expect(sidebar(page).getByText('Yesterday', { exact: true })).toBeVisible();
	await expect(sidebar(page).getByText('Today', { exact: true })).toHaveCount(0);
	await page.keyboard.press('Tab');
	await page.keyboard.press('Enter');
	await expect(events(page)).toContainText('select:plan');
	await expect(rows.first()).toHaveAttribute('aria-current', 'true');
	await expect(chat(page).getByRole('heading', { level: 2 })).toHaveText('Plan the sign-in redirects');
	await search.fill('nothing like this');
	await expect(sidebar(page).getByRole('status')).toHaveText('No matches.');
	await search.fill('');
	await expect(rows).toHaveCount(7);
});

test('Studio reply footer: quiet 13px actions, a toggle that says so, chips that fill the composer', async ({ page }) => {
	await open(page);
	const reply = chat(page).locator('article[data-slot="message"]').nth(1);
	for (const name of ['2 steps', 'Copy', 'Retry']) expect(await style(reply.getByRole('button', { name, exact: true }), 'font-size')).toBe('13px');
	const steps = reply.getByRole('button', { name: '2 steps' });
	await expect(steps).toHaveAttribute('aria-expanded', 'false');
	await steps.click();
	await expect(steps).toHaveAttribute('aria-expanded', 'true');
	await reply.getByRole('button', { name: 'Show me the review' }).click();
	await expect(chat(page).getByRole('textbox', { name: 'Message the Referee' })).toHaveValue('Show me the review');
});

test('Studio on a phone: the places are a row of 40px links under the name, the list is a tab, the title line wraps', async ({ page }) => {
	await open(page, 390);
	const name = bar(page).locator('p').first();
	expect(await style(name, 'font-size')).toBe('14px');
	expect(await style(name, 'font-weight')).toBe('600');
	const nameBox = await rect(name);
	for (const label of ['Referee', 'Settings']) {
		const link = await rect(places(page).getByRole('link', { name: label }));
		expect(link.height).toBeCloseTo(40, 0);
		expect(link.y).toBeGreaterThan(nameBox.y + nameBox.height - 1);
	}
	expect(await bar(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
	expect(await box(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

	await chat(page).getByRole('tab', { name: /Conversations/ }).click();
	const panel = chat(page).getByRole('tabpanel');
	await expect(panel.getByRole('searchbox', { name: 'Search' })).toBeVisible();
	const row = panel.getByRole('button', { name: /Why did card 203 fail review\?/ });
	expect((await rect(row)).height).toBeGreaterThanOrEqual(44);
	await row.click();
	await expect(chat(page).getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
	const title = chat(page).getByRole('heading', { level: 2 });
	await expect(title).toHaveText('Why did card 203 fail review?');
	const status = chat(page).getByText('Ready · build box online');
	await expect(status).toBeVisible();
	const titleBox = await rect(title);
	expect((await rect(status)).y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height);
	expect(await status.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('Studio chrome passes axe (WCAG 2.2 A/AA) in light and dark', async ({ page }) => {
	await open(page);
	const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
	for (const target of ['light', 'dark']) {
		if ((await theme()) !== target) await page.getByRole('button', { name: 'Toggle global color theme' }).click();
		await expect.poll(theme).toBe(target);
		const results = await new AxeBuilder({ page }).include('[data-testid="studio"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
		expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`), target).toEqual([]);
	}
});
