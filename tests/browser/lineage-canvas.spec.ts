import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Opens the Features page's canvas, with room under it so the page can still scroll down. */
async function canvas(page: Page, width = 1440): Promise<{ section: Locator; pane: Locator; world: Locator }> {
	await page.setViewportSize({ width, height: 900 });
	await page.goto('/features');
	// The page is server-rendered; a gesture before hydration reaches inert markup.
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
	await page.evaluate(() => (document.body.style.paddingBottom = '2000px'));
	const section = page.getByRole('region', { name: 'Cards of Theme Studio' });
	await section.scrollIntoViewIfNeeded();
	const pane = section.locator('.cursor-grab');
	return { section, pane, world: pane.locator('> div') };
}

/** The canvas's view, read from its transform. */
async function view(world: Locator): Promise<{ k: number; x: number; y: number }> {
	const [x, y, k] = ((await world.evaluate((el) => el.style.transform)).match(/-?[\d.]+/g) ?? []).map(Number);
	return { k, x, y };
}
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test('FeatureLineage canvas: a drag pans and opens nothing; a press opens the node', async ({ page }) => {
	const { section, world } = await canvas(page);
	const node = section.getByRole('button', { name: 'Keep the edited tokens in the URL hash' });
	const before = await view(world);
	const box = (await node.boundingBox())!;
	await page.mouse.move(box.x + 10, box.y + 5);
	await page.mouse.down();
	await page.mouse.move(box.x + 70, box.y + 35, { steps: 6 });
	await page.mouse.up();
	const after = await view(world);
	expect(after.x - before.x).toBeCloseTo(60, 0);
	expect(after.y - before.y).toBeCloseTo(30, 0);
	await expect(section.getByText(/would open here/)).toHaveCount(0);

	await node.click();
	await expect(section.getByText('#71 would open here, in its sheet. Its route stays lit.')).toBeVisible();
});

test('FeatureLineage canvas: the wheel zooms about the pointer, and at either end of the zoom it scrolls the page', async ({ page }) => {
	const { pane, world } = await canvas(page);
	// The page moves under the pointer when it scrolls, so the pointer goes back over the graph each time.
	const over = async () => {
		const box = (await pane.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	};
	await over();
	const opening = await view(world);

	// It opens on the whole graph, so a wheel down is the page's at once.
	let y = await scrollY(page);
	await page.mouse.wheel(0, 200);
	await expect.poll(() => scrollY(page)).toBeGreaterThan(y);
	expect((await view(world)).k).toBe(opening.k);

	// A wheel up zooms in, and the page stays where it is, until the zoom can go no closer.
	await over();
	y = await scrollY(page);
	await page.mouse.wheel(0, -200);
	await expect.poll(async () => (await view(world)).k).toBeGreaterThan(opening.k);
	expect(await scrollY(page)).toBe(y);
	await page.mouse.wheel(0, -400);
	await expect.poll(async () => (await view(world)).k).toBe(1.5);
	y = await scrollY(page);
	await page.mouse.wheel(0, -200);
	await expect.poll(() => scrollY(page)).toBeLessThan(y);
});

test('FeatureLineage canvas: the keys zoom, fit and pan with focus in the graph, and focus pans a node into view', async ({ page }) => {
	const { section, pane, world } = await canvas(page);
	const opening = await view(world);
	await section.getByRole('button', { name: 'Prove a write path to the theme store' }).focus();
	await page.keyboard.press('+');
	expect((await view(world)).k).toBeCloseTo(opening.k * 1.25, 5);
	await page.keyboard.press('0');
	expect((await view(world)).k).toBeCloseTo(opening.k, 5);
	const fitted = await view(world);
	await page.keyboard.press('ArrowLeft');
	expect((await view(world)).x).toBeCloseTo(fitted.x + 48, 5);

	// Zoomed in at the first level, Tab walks on to the last node, and the canvas brings it in.
	await section.getByRole('button', { name: 'Zoom in' }).click();
	await section.getByRole('button', { name: 'Zoom in' }).click();
	const last = section.getByRole('button', { name: 'Document the theme studio' });
	await section.getByRole('button', { name: 'Put the page together' }).focus();
	await page.keyboard.press('Tab');
	await expect(last).toBeFocused();
	await expect
		.poll(async () => {
			const [p, n] = [(await pane.boundingBox())!, (await last.boundingBox())!];
			return n.x >= p.x && n.x + n.width <= p.x + p.width;
		})
		.toBe(true);
});

test('FeatureLineage canvas: on a phone it stands upright, a node its number and title', async ({ page }) => {
	const { section } = await canvas(page, 390);
	await expect(section.getByRole('button', { name: 'Keep the edited tokens in the URL hash' })).toBeVisible();
	await expect(section.getByText('Red team, round 1')).toHaveCount(0);
	await expect(section.locator('svg text')).toHaveCount(0);
});

test('FeatureLineage canvas: no axe violations', async ({ page }) => {
	const { section } = await canvas(page);
	await expect(section).toBeVisible();
	const results = await new AxeBuilder({ page })
		.include('section[aria-label="Cards of Theme Studio"]')
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
});
