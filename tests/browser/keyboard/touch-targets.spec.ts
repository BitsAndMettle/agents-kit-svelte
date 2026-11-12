import { expect, test, type Locator } from '@playwright/test';
import { openSection } from './helpers';

// A touch device: `pointer: coarse` matches, so TOUCH_TARGET_CLASS grows the hit areas.
test.use({ hasTouch: true });

/** The element a tap at (x, y) reaches, as the closest button or input. */
async function hit(locator: Locator, x: number, y: number): Promise<string> {
	return locator.page().evaluate(
		([px, py]) => {
			const el = document.elementFromPoint(px, py)?.closest('button, input');
			if (!el) return 'none';
			return el instanceof HTMLInputElement ? el.id : (el.textContent?.trim() ?? '');
		},
		[x, y]
	);
}

/** What taps at the centre and 2px inside each edge of each face reach. */
async function edges(faces: Locator[]): Promise<{ own: string; top: string; bottom: string; left: string; right: string }[]> {
	const out = [];
	for (const face of faces) {
		const box = (await face.boundingBox())!;
		const midX = box.x + box.width / 2;
		const midY = box.y + box.height / 2;
		out.push({
			own: await hit(face, midX, midY),
			top: await hit(face, midX, box.y + 2),
			bottom: await hit(face, midX, box.y + box.height - 2),
			left: await hit(face, box.x + 2, midY),
			right: await hit(face, box.x + box.width - 2, midY)
		});
	}
	return out;
}

test('touch targets: a tap on a face reaches that control, never a neighbour, in tight groups', async ({ page }) => {
	expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
	const section = await openSection(page, 'button-group');
	const stacked = section.getByRole('group', { name: 'Stacked actions' }).getByRole('button');
	for (const row of await edges(await stacked.all())) {
		expect([row.top, row.bottom, row.left, row.right]).toEqual([row.own, row.own, row.own, row.own]);
	}

	// The extender still works: just below the last face reaches it.
	const last = (await stacked.last().boundingBox())!;
	expect(last.height).toBeLessThan(44);
	expect(await hit(stacked.last(), last.x + last.width / 2, last.y + last.height + 3)).toBe('Reject');

	const checkboxSection = page.locator('#checkbox');
	await checkboxSection.scrollIntoViewIfNeeded();
	const faces = await checkboxSection.getByRole('checkbox').all();
	expect(faces.length).toBeGreaterThan(3);
	const rows = await edges(faces);
	for (const [i, row] of rows.entries()) {
		const value = await faces[i].evaluate((el) => el.id);
		for (const edge of [row.own, row.top, row.bottom, row.left, row.right]) expect(edge, `checkbox ${i}`).toBe(value);
	}
});
