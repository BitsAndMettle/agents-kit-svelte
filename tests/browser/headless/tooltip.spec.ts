import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectShown, isShown, logEntries, settled, type Strategy } from './helpers';

async function openGroups(page: Page, anchor?: Strategy): Promise<void> {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(anchor ? `/headless/groups/?anchor=${anchor}` : '/headless/groups/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

const tip = (page: Page, name: string): Locator => page.locator(`[id$="-tip-${name}-content"]`);
const button = (page: Page, name: string): Locator => page.getByRole('button', { name, exact: true });

/** An empty spot in the page margin, away from every trigger. */
async function moveAway(page: Page): Promise<void> {
	await page.mouse.move(5, 500);
}

/**
 * Records, in page time, when the pointer entered or focus reached each button (by its text)
 * and when each tooltip opened (by name). Timing in the page is immune to test-runner load.
 */
async function recordTimes(page: Page): Promise<void> {
	await page.evaluate(() => {
		const times: Record<string, number> = {};
		(window as unknown as { times: Record<string, number> }).times = times;
		const label = (target: EventTarget | null) =>
			target instanceof Element ? target.closest('button')?.textContent?.trim() : undefined;
		document.addEventListener('pointerover', (e) => {
			const name = label(e.target);
			if (name) times[`enter:${name}`] = performance.now();
		}, true);
		document.addEventListener('focusin', (e) => {
			const name = label(e.target);
			if (name) times[`focus:${name}`] = performance.now();
		}, true);
		for (const el of document.querySelectorAll('[role="tooltip"]')) {
			const name = /-tip-(\w+)-content$/.exec(el.id)?.[1];
			el.addEventListener('toggle', (e) => {
				if ((e as ToggleEvent).newState === 'open') times[`open:${name}`] = performance.now();
			});
		}
	});
}

/** ms from `from` (e.g. 'enter:Bold') to the tooltip `name` opening. */
async function openedAfter(page: Page, from: string, name: string): Promise<number> {
	return page.evaluate(([from, name]) => {
		const times = (window as unknown as { times: Record<string, number> }).times;
		return times[`open:${name}`] - times[from];
	}, [from, name]);
}

async function touch(locator: Locator, type: string): Promise<void> {
	await locator.evaluate((el, type) => {
		el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true, isPrimary: true, pointerId: 7 }));
	}, type);
}

test.describe('tooltip', () => {
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openGroups(page);
	});

	test('hover opens after the delay and wires aria-describedby only while shown', async ({ page }) => {
		const bold = button(page, 'Bold');
		await expect(bold).not.toHaveAttribute('aria-describedby');
		await recordTimes(page);
		await bold.hover();
		await expectShown(tip(page, 'bold'), true);
		expect(await openedAfter(page, 'enter:Bold', 'bold')).toBeGreaterThanOrEqual(580);
		await expect(tip(page, 'bold')).toHaveAttribute('role', 'tooltip');
		await expect(tip(page, 'bold')).toHaveAttribute('data-state', 'open');
		const contentId = await tip(page, 'bold').getAttribute('id');
		await expect(bold).toHaveAttribute('aria-describedby', contentId!);
		await expect(bold).toHaveAccessibleDescription('Make text bold');

		await moveAway(page);
		await expectShown(tip(page, 'bold'), false);
		await expect(bold).not.toHaveAttribute('aria-describedby');
	});

	test('moving between triggers skips the delay; the group cools down after skipDelay', async ({ page }) => {
		await recordTimes(page);
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);

		// Straight onto the next trigger: replaced at once, only one tooltip visible.
		await button(page, 'Italic').hover();
		await expectShown(tip(page, 'italic'), true);
		expect(await openedAfter(page, 'enter:Italic', 'italic')).toBeLessThan(150);
		expect(await isShown(tip(page, 'bold'))).toBe(false);
		await expect(tip(page, 'italic')).toHaveAttribute('data-instant', '');
		await expect(button(page, 'Bold')).not.toHaveAttribute('aria-describedby');

		// Leave, come back within skipDelay (300ms): still instant.
		await moveAway(page);
		await expectShown(tip(page, 'italic'), false);
		await button(page, 'Underline').hover();
		await expectShown(tip(page, 'underline'), true);
		expect(await openedAfter(page, 'enter:Underline', 'underline')).toBeLessThan(150);

		// Leave for longer than skipDelay: cold again.
		await moveAway(page);
		await expectShown(tip(page, 'underline'), false);
		await page.waitForTimeout(500);
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
		expect(await openedAfter(page, 'enter:Bold', 'bold')).toBeGreaterThanOrEqual(580);
		await expect(tip(page, 'bold')).not.toHaveAttribute('data-instant');
	});

	test('the pointer can cross onto the content without closing it', async ({ page }) => {
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
		const box = (await tip(page, 'bold').boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
		await page.waitForTimeout(300);
		expect(await isShown(tip(page, 'bold'))).toBe(true);
		await moveAway(page);
		await expectShown(tip(page, 'bold'), false);
	});

	test('keyboard focus opens it after the delay; blur closes it', async ({ page }) => {
		// Clicking the heading sets the sequential focus starting point just before the toolbar.
		await page.getByRole('heading', { name: 'Tooltips' }).click();
		await recordTimes(page);
		await page.keyboard.press('Tab');
		await expect(button(page, 'Bold')).toBeFocused();
		await expectShown(tip(page, 'bold'), true);
		expect(await openedAfter(page, 'focus:Bold', 'bold')).toBeGreaterThanOrEqual(580);
		await expect(button(page, 'Bold')).toHaveAccessibleDescription('Make text bold');
		await page.keyboard.press('Tab');
		await expectShown(tip(page, 'bold'), false);
		// Focus moved straight to the next trigger, within skipDelay: instant.
		await expect(button(page, 'Italic')).toBeFocused();
		await expectShown(tip(page, 'italic'), true);
		expect(await openedAfter(page, 'focus:Italic', 'italic')).toBeLessThan(150);
	});

	test('a press closes it, and hovering on does not reopen it until the pointer leaves', async ({ page }) => {
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
		await button(page, 'Bold').click();
		await expectShown(tip(page, 'bold'), false);
		await page.waitForTimeout(900);
		expect(await isShown(tip(page, 'bold'))).toBe(false);
		await moveAway(page);
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
	});

	test('touch never opens it; a long press does when configured', async ({ page }) => {
		const bold = button(page, 'Bold');
		await touch(bold, 'pointerenter');
		await touch(bold, 'pointerdown');
		await page.waitForTimeout(800);
		await touch(bold, 'pointerup');
		expect(await isShown(tip(page, 'bold'))).toBe(false);

		const hold = button(page, 'Hold');
		// A tap is not a long press.
		await touch(hold, 'pointerdown');
		await page.waitForTimeout(80);
		await touch(hold, 'pointerup');
		await page.waitForTimeout(400);
		expect(await isShown(tip(page, 'hold'))).toBe(false);
		// Held for longer than 300ms: opens, lingers after release, then closes.
		await touch(hold, 'pointerdown');
		await expectShown(tip(page, 'hold'), true);
		await touch(hold, 'pointerup');
		await page.waitForTimeout(800);
		expect(await isShown(tip(page, 'hold'))).toBe(true);
		await expectShown(tip(page, 'hold'), false);
	});
});

test.describe('tooltip and popover on one element', () => {
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openGroups(page);
	});

	test('both parts compose: the popover keeps its id, the tooltip adds only aria-describedby', async ({ page }) => {
		const share = button(page, 'Share');
		await expect(share).toHaveAttribute('id', /-share-trigger$/);
		await expect(share).toHaveAttribute('aria-controls', /-share-content$/);
		await share.hover();
		await expectShown(tip(page, 'share'), true);
		await expect(share).toHaveAttribute('id', /-share-trigger$/);
		await expect(share).toHaveAttribute('aria-describedby', /-tip-share-content$/);
		await expect(share).toHaveAttribute('aria-expanded', 'false');
	});

	test('a click opens the popover and closes the tooltip; hovering does not close the popover; Escape closes the tooltip first', async ({
		page
	}) => {
		const share = button(page, 'Share');
		const popover = page.locator('[role="dialog"][id$="-share-content"]');
		await share.hover();
		await expectShown(tip(page, 'share'), true);

		await share.click();
		await expectShown(popover, true);
		await expectShown(tip(page, 'share'), false);
		await expect(share).toHaveAttribute('aria-expanded', 'true');

		// Hover other triggers and come back: tooltips show, the popover stays open.
		await moveAway(page);
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
		expect(await isShown(popover)).toBe(true);
		await share.hover();
		await expectShown(tip(page, 'share'), true);
		expect(await isShown(popover)).toBe(true);

		await page.keyboard.press('Escape');
		await expectShown(tip(page, 'share'), false);
		expect(await isShown(popover)).toBe(true);

		await page.keyboard.press('Escape');
		await expectShown(popover, false);
		expect(await logEntries(page)).toEqual(['share:open:trigger', 'share:closed:escape']);
	});
});

test.describe('tooltip motion', () => {
	test('closing waits for the exit transition', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await openGroups(page);
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
		await page.waitForTimeout(250);
		await page.keyboard.press('Escape');
		await expect(tip(page, 'bold')).toHaveAttribute('data-state', 'closed');
		expect(await isShown(tip(page, 'bold'))).toBe(true);
		await expectShown(tip(page, 'bold'), false);
	});

	test('under reduced motion it hides at once', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openGroups(page);
		await button(page, 'Bold').hover();
		await expectShown(tip(page, 'bold'), true);
		await page.keyboard.press('Escape');
		expect(await isShown(tip(page, 'bold'))).toBe(false);
	});
});

for (const strategy of ['native', 'fallback'] as Strategy[]) {
	test.describe(`tooltip positioning (${strategy})`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await openGroups(page, strategy);
		});

		test('it sits centred above its trigger, which gets an id to anchor to', async ({ page }) => {
			const bold = button(page, 'Bold');
			await expect(bold).toHaveAttribute('id', /-tip-bold-trigger$/);
			await bold.hover();
			const content = tip(page, 'bold');
			await expectShown(content, true);
			await settled(content);
			await expect(content).toHaveAttribute('data-ak-position', strategy);
			await expect(content).toHaveAttribute('data-side', 'top');
			const a = (await bold.boundingBox())!;
			const f = (await content.boundingBox())!;
			expect(Math.abs(f.y + f.height - (a.y - 6))).toBeLessThanOrEqual(1.5);
			expect(Math.abs(f.x + f.width / 2 - (a.x + a.width / 2))).toBeLessThanOrEqual(1.5);
		});

		test('it anchors to a trigger shared with a popover', async ({ page }) => {
			const share = button(page, 'Share');
			await share.hover();
			const content = tip(page, 'share');
			await expectShown(content, true);
			await settled(content);
			await expect(content).toHaveAttribute('data-ak-position', strategy);
			const a = (await share.boundingBox())!;
			const f = (await content.boundingBox())!;
			expect(Math.abs(f.y + f.height - (a.y - 6))).toBeLessThanOrEqual(1.5);
		});

		test('near the top edge it flips below', async ({ page }) => {
			const edge = button(page, 'Edge');
			await edge.hover();
			const content = tip(page, 'edge');
			await expectShown(content, true);
			await settled(content);
			await expect(content).toHaveAttribute('data-side', 'bottom');
			const a = (await edge.boundingBox())!;
			const f = (await content.boundingBox())!;
			expect(Math.abs(f.y - (a.y + a.height + 6))).toBeLessThanOrEqual(1.5);
			await moveAway(page);
			await expectShown(content, false);
			const leftovers = await page.evaluate(() =>
				document.adoptedStyleSheets.flatMap((s) => [...s.cssRules].map((r) => r.cssText)).filter((t) => t.includes('tip-edge'))
			);
			expect(leftovers).toEqual([]);
		});
	});
}
