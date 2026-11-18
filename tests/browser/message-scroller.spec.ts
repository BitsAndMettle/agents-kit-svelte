import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSection } from './keyboard/helpers';

/** Opens the catalogue's MessageScroller with motion allowed, and returns its viewport. */
async function viewport(page: Page): Promise<Locator> {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	const section = await openSection(page, 'message-scroller');
	return section.locator('[data-slot="message-scroller"] > section');
}

/** Appends markup to the scroller's log, then lets any scroll it set off settle. */
async function append(page: Page, port: Locator, html: string): Promise<void> {
	await port.getByRole('log').evaluate((log, html) => log.insertAdjacentHTML('beforeend', html), html);
	await page.waitForTimeout(600);
}

// Each check reads two frames after the change: a follow that animates is still on its way by then.

test('MessageScroller: at the end, growth is followed at once, not animated', async ({ page }) => {
	const port = await viewport(page);
	await append(page, port, '<div style="height:900px"></div>');
	const distance = await port.evaluate(async (el) => {
		el.querySelector('[role="log"]')!.insertAdjacentHTML('beforeend', '<div style="height:400px"></div>');
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return el.scrollHeight - el.scrollTop - el.clientHeight;
	});
	expect(distance).toBeLessThan(1);
});

test('MessageScroller: scrolled up, what is in view stays put when something above it grows', async ({ page }) => {
	const port = await viewport(page);
	const jump = page.locator('#message-scroller').getByRole('button', { name: 'Jump to latest' });
	// One reply: its words still to come, a tall block under them, and more after it.
	await append(page, port, '<div><div id="k10-words"></div><div id="k10-block" style="height:1200px"></div></div><div style="height:600px"></div>');
	await port.evaluate((el) => {
		el.scrollTop += el.querySelector('#k10-block')!.getBoundingClientRect().top - el.getBoundingClientRect().top + 200;
	});
	await expect(jump).toBeVisible();
	const moved = await port.evaluate(async (el) => {
		const block = el.querySelector('#k10-block')!;
		const before = block.getBoundingClientRect().top;
		el.querySelector<HTMLElement>('#k10-words')!.style.height = '240px';
		await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
		return block.getBoundingClientRect().top - before;
	});
	expect(Math.abs(moved)).toBeLessThan(1);
	await expect(jump).toBeVisible();
});
