import { expect, test } from '@playwright/test';
import { content, expectShown, openFixture, settled, trigger, type Strategy } from './helpers';

for (const strategy of ['native', 'fallback'] as Strategy[]) {
	test.describe(`positioning (${strategy})`, () => {
		test.beforeEach(async ({ page }) => {
			await page.emulateMedia({ reducedMotion: 'reduce' });
			await openFixture(page, strategy);
		});

		test('a popover sits centred below its trigger', async ({ page }) => {
			await trigger(page, 'page').click();
			const popover = content(page, 'page');
			await expectShown(popover, true);
			await settled(popover);
			await expect(popover).toHaveAttribute('data-ak-position', strategy);
			await expect(popover).toHaveAttribute('data-side', 'bottom');
			const a = (await trigger(page, 'page').boundingBox())!;
			const f = (await popover.boundingBox())!;
			expect(Math.abs(f.y - (a.y + a.height + 4))).toBeLessThanOrEqual(1.5);
			expect(Math.abs(f.x + f.width / 2 - (a.x + a.width / 2))).toBeLessThanOrEqual(1.5);
			const vars = await popover.evaluate((el) => {
				const style = getComputedStyle(el);
				return [style.getPropertyValue('--ak-available-height'), style.getPropertyValue('--ak-anchor-width')];
			});
			expect(vars[0]).toMatch(/^\d+px$/);
			expect(vars[1]).toBe(`${Math.round(a.width)}px`);
		});

		test('a popover inside a dialog is positioned against its trigger in the top layer', async ({ page }) => {
			await trigger(page, 'settings').click();
			await trigger(page, 'inner').click();
			const popover = content(page, 'inner');
			await expectShown(popover, true);
			await settled(popover);
			await expect(popover).toHaveAttribute('data-ak-position', strategy);
			const a = (await trigger(page, 'inner').boundingBox())!;
			const f = (await popover.boundingBox())!;
			expect(Math.abs(f.y - (a.y + a.height + 4))).toBeLessThanOrEqual(1.5);
		});

		test('a popover near the bottom edge flips above its trigger', async ({ page }) => {
			await trigger(page, 'bottom').click();
			const popover = content(page, 'bottom');
			await expectShown(popover, true);
			await settled(popover);
			await expect(popover).toHaveAttribute('data-side', 'top');
			const a = (await trigger(page, 'bottom').boundingBox())!;
			const f = (await popover.boundingBox())!;
			expect(f.y + f.height).toBeLessThanOrEqual(a.y + 0.5);
			expect(Math.abs(f.y + f.height - (a.y - 4))).toBeLessThanOrEqual(1.5);
		});

		test('a consumer style attribute cannot clobber the position', async ({ page }) => {
			await trigger(page, 'page').click();
			const popover = content(page, 'page');
			await expectShown(popover, true);
			await settled(popover);
			const gap = async () => {
				const [a, f] = await Promise.all([trigger(page, 'page').boundingBox(), popover.boundingBox()]);
				return f!.y - (a!.y + a!.height);
			};
			expect(await gap()).toBeCloseTo(4, 0);
			await popover.evaluate((el) => el.setAttribute('style', 'color: inherit'));
			expect(await gap()).toBeCloseTo(4, 0);
			await page.keyboard.press('Escape');
			await expectShown(popover, false);
			const leftovers = await page.evaluate(() =>
				document.adoptedStyleSheets.flatMap((s) => [...s.cssRules].map((r) => r.cssText)).filter((t) => t.includes('-page-'))
			);
			expect(leftovers).toEqual([]);
		});
	});
}
