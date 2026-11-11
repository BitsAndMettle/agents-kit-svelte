import { expect, test, type Locator, type Page } from '@playwright/test';
import { openSection, press } from './helpers';

/** Whether a dialog is open / a popover is in the top layer. */
async function isShown(locator: Locator): Promise<boolean> {
	return locator.evaluate((el) => (el instanceof HTMLDialogElement ? el.open : el.matches(':popover-open')));
}

async function expectShown(locator: Locator, shown: boolean): Promise<void> {
	await expect.poll(() => isShown(locator)).toBe(shown);
}

/** Whether focus is inside `locator`. */
async function focusInside(locator: Locator): Promise<boolean> {
	return locator.evaluate((el) => el.contains(document.activeElement));
}

/** A press on the page's top-left corner: the backdrop while a modal is open, empty page otherwise. */
async function pressOutside(page: Page): Promise<void> {
	await page.mouse.click(4, 450);
}

test.describe('overlays', () => {
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
	});

	test('Dialog: Enter on the trigger opens it with focus inside; Escape closes it and returns focus', async ({ page }) => {
		const section = await openSection(page, 'dialog');
		const trigger = section.getByRole('button', { name: 'Edit agent' });
		const dialog = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });

		await trigger.focus();
		await press(page, 'Enter');
		await expectShown(dialog, true);
		await expect(trigger).toHaveAttribute('aria-expanded', 'true');
		await expect(dialog).toHaveAccessibleDescription('The name shows on the Board and in run logs.');
		await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();

		await press(page, 'Escape');
		await expectShown(dialog, false);
		await expect(trigger).toBeFocused();
		await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});

	test('Dialog: a backdrop press and the close button close it, and focus returns', async ({ page }) => {
		// With motion the dialog is still modal when the press's mousedown lands, so focus stays
		// inside and the stack returns it. (Under reduced motion it closes at pointerdown and the
		// mousedown then puts focus on <body>, which an outside press leaves alone.)
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		const section = await openSection(page, 'dialog');
		const trigger = section.getByRole('button', { name: 'Edit agent' });
		const dialog = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });

		await trigger.click();
		await expectShown(dialog, true);
		// A press inside the dialog's own box is not the backdrop.
		await dialog.getByText('The name shows on the Board').click();
		await expectShown(dialog, true);
		await pressOutside(page);
		await expectShown(dialog, false);
		await expect(trigger).toBeFocused();

		await trigger.click();
		await expectShown(dialog, true);
		await dialog.getByRole('button', { name: 'Close' }).click();
		await expectShown(dialog, false);
		await expect(trigger).toBeFocused();
	});

	test('Dialog: Tab and Shift+Tab stay inside the open dialog', async ({ page }) => {
		const section = await openSection(page, 'dialog');
		const dialog = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });
		await section.getByRole('button', { name: 'Edit agent' }).click();
		await expectShown(dialog, true);

		const seen = new Set<string>();
		for (let i = 0; i < 7; i++) {
			await press(page, 'Tab');
			// Past the last control the browser may hand focus to its own UI for one step;
			// it never reaches the inert page behind the dialog.
			const where = await page.evaluate(() => {
				const active = document.activeElement;
				if (!active || active === document.body) return 'outside-page';
				const dialog = document.querySelector('dialog[open]');
				return dialog?.contains(active) ? (active.getAttribute('aria-label') ?? active.textContent?.trim() ?? '') : 'page';
			});
			expect(where).not.toBe('page');
			if (where !== 'outside-page') seen.add(where);
		}
		// Every control inside was reached, in a cycle.
		expect([...seen].sort()).toEqual(['', 'About models', 'Cancel', 'Close', 'Save'].sort());
		for (let i = 0; i < 7; i++) {
			await press(page, 'Shift+Tab');
			expect(await page.evaluate(() => {
				const active = document.activeElement;
				return !active || active === document.body || !!document.querySelector('dialog[open]')?.contains(active);
			})).toBe(true);
		}
	});

	test('Dialog: the footer close function closes it after Save', async ({ page }) => {
		const section = await openSection(page, 'dialog');
		const dialog = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });
		await section.getByRole('button', { name: 'Edit agent' }).click();
		await dialog.getByRole('textbox', { name: 'Name' }).fill('Triage agent');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expectShown(dialog, false);
		await expect(section.getByText('Saved “Triage agent”')).toBeVisible();
	});

	test('a Popover inside a Dialog closes first on Escape, and a tooltip before both', async ({ page }) => {
		const section = await openSection(page, 'dialog');
		const trigger = section.getByRole('button', { name: 'Edit agent' });
		const dialog = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });
		const info = dialog.getByRole('button', { name: 'About models' });
		const popover = page.getByRole('dialog', { name: 'Models', includeHidden: true });
		const tip = page.getByRole('tooltip', { name: 'About models', includeHidden: true });

		await trigger.click();
		await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
		// Keyboard focus shows the tooltip after its delay.
		await press(page, 'Tab');
		await expect(info).toBeFocused();
		await expectShown(tip, true);
		await press(page, 'Escape');
		await expectShown(tip, false);
		await expectShown(dialog, true);

		await press(page, 'Enter');
		await expectShown(popover, true);
		await expect(popover).toBeFocused();
		await press(page, 'Escape');
		await expectShown(popover, false);
		await expectShown(dialog, true);
		await expect(info).toBeFocused();
		// Focus the stack gave back does not reopen the tooltip.
		await page.waitForTimeout(800);
		expect(await isShown(tip)).toBe(false);

		await press(page, 'Escape');
		await expectShown(dialog, false);
		await expect(trigger).toBeFocused();
	});

	test('AlertDialog: focus starts on Cancel, a backdrop press is ignored, Escape cancels', async ({ page }) => {
		const section = await openSection(page, 'alert-dialog');
		const trigger = section.getByRole('button', { name: 'Delete run' });
		const dialog = page.getByRole('alertdialog', { name: 'Delete run 482?', includeHidden: true });

		await trigger.focus();
		await press(page, 'Enter');
		await expectShown(dialog, true);
		await expect(dialog).toHaveAccessibleDescription(/cannot be undone/);
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

		await pressOutside(page);
		await page.waitForTimeout(100);
		await expectShown(dialog, true);

		await press(page, 'Escape');
		await expectShown(dialog, false);
		await expect(trigger).toBeFocused();

		await trigger.click();
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expectShown(dialog, false);
		await expect(section.getByText('Kept run 482')).toBeVisible();
	});

	test('AlertDialog: an async confirm shows a loading state and keeps the dialog open until it resolves', async ({ page }) => {
		const section = await openSection(page, 'alert-dialog');
		const dialog = page.getByRole('alertdialog', { name: 'Delete run 482?', includeHidden: true });
		await section.getByRole('button', { name: 'Delete run' }).click();
		await dialog.getByRole('button', { name: 'Delete run' }).click();

		const busy = dialog.getByRole('button', { name: 'Deleting…' });
		await expect(busy).toBeVisible();
		await expect(busy).toHaveAttribute('aria-disabled', 'true');
		await expect(dialog).toHaveAttribute('aria-busy', 'true');
		await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
		// Escape is refused while the confirm is pending.
		await press(page, 'Escape');
		await page.waitForTimeout(100);
		await expectShown(dialog, true);

		await expectShown(dialog, false);
		await expect(section.getByText('Run 482 deleted')).toBeVisible();
	});

	test('AlertDialog: a rejected confirm keeps the dialog open and shows the error', async ({ page }) => {
		const section = await openSection(page, 'alert-dialog');
		const trigger = section.getByRole('button', { name: 'Delete run' });
		const dialog = page.getByRole('alertdialog', { name: 'Delete run 482?', includeHidden: true });
		await section.getByRole('checkbox', { name: 'Make the next delete fail' }).check();
		await trigger.click();
		const confirm = dialog.getByRole('button', { name: 'Delete run' });
		await confirm.click();

		await expect(dialog.getByRole('alert')).toHaveText('The run is still uploading its logs. Try again in a minute.');
		await expectShown(dialog, true);
		await expect(confirm).toBeEnabled();
		await expect(confirm).toHaveAttribute('aria-disabled', 'false');
		await expect(confirm).toBeFocused();

		// Cancel closes; the next open starts without the old error.
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expectShown(dialog, false);
		await trigger.click();
		await expectShown(dialog, true);
		await expect(dialog.getByRole('alert')).toHaveCount(0);
	});

	test('Sheet: each side sits flush against its edge and closes with Escape', async ({ page }) => {
		const section = await openSection(page, 'sheet');
		const viewport = page.viewportSize()!;
		for (const side of ['right', 'left', 'bottom', 'top'] as const) {
			const trigger = section.getByRole('button', { name: `Open ${side} sheet` });
			await trigger.click();
			const sheet = page.locator('dialog[open]');
			await expect(sheet).toHaveAccessibleName('Filter runs');
			await expect(sheet).toHaveAttribute('data-side', side);
			const box = (await sheet.boundingBox())!;
			const near = (a: number, b: number) => expect(Math.abs(a - b), `${side}: ${a} vs ${b}`).toBeLessThanOrEqual(1);
			if (side === 'right' || side === 'left') {
				near(box.y, 0);
				near(box.height, viewport.height);
				near(side === 'right' ? box.x + box.width : box.x, side === 'right' ? viewport.width : 0);
			} else {
				near(box.x, 0);
				near(box.width, viewport.width);
				near(side === 'bottom' ? box.y + box.height : box.y, side === 'bottom' ? viewport.height : 0);
			}
			// Only bottom sheets show the drag handle.
			await expect(sheet.locator(':scope > [aria-hidden="true"]')).toHaveCount(side === 'bottom' ? 1 : 0);
			await expect(sheet.getByRole('checkbox', { name: 'Waiting on a person' })).toBeFocused();
			await press(page, 'Escape');
			await expect(page.locator('dialog[open]')).toHaveCount(0);
			await expect(trigger).toBeFocused();
		}
	});

	test('Popover: Enter opens it focused, Escape closes it and returns focus; the arrow follows the side', async ({ page }) => {
		const section = await openSection(page, 'popover');
		const trigger = section.getByRole('button', { name: 'Run details' });
		const popover = page.getByRole('dialog', { name: 'Run 482', includeHidden: true });
		const arrow = popover.locator('[aria-hidden="true"]').first();

		await trigger.focus();
		await press(page, 'Enter');
		await expectShown(popover, true);
		await expect(popover).toBeFocused();
		await expect(popover).toHaveAccessibleDescription('Started 4 minutes ago on the devbox.');
		await expect(arrow).toHaveAttribute('data-side', 'bottom');
		const below = (await popover.boundingBox())!;
		const anchor = (await trigger.boundingBox())!;
		expect(below.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
		await press(page, 'Escape');
		await expectShown(popover, false);
		await expect(trigger).toBeFocused();

		await section.getByRole('button', { name: 'top', exact: true }).click();
		await trigger.click();
		await expectShown(popover, true);
		await expect(arrow).toHaveAttribute('data-side', 'top');
		const above = (await popover.boundingBox())!;
		expect(above.y + above.height).toBeLessThanOrEqual(anchor.y);
		// The arrow's tip sits between the surface and the trigger, over the trigger's middle.
		const tip = (await arrow.boundingBox())!;
		expect(Math.abs(tip.x + tip.width / 2 - (anchor.x + anchor.width / 2))).toBeLessThanOrEqual(2);
		await pressOutside(page);
		await expectShown(popover, false);
	});

	test('Popover: near the right edge the card shifts into view and the arrow still points at the trigger', async ({ page }) => {
		const section = await openSection(page, 'popover');
		await page.setViewportSize({ width: 375, height: 667 });
		const trigger = section.getByRole('button', { name: 'Share', exact: true });
		await trigger.scrollIntoViewIfNeeded();
		await trigger.click();
		const popover = page.getByRole('dialog', { name: 'Share this run', includeHidden: true });
		await expectShown(popover, true);
		const arrow = popover.locator('[aria-hidden="true"]').first();
		const t = (await trigger.boundingBox())!;
		const p = (await popover.boundingBox())!;
		const triggerCentre = t.x + t.width / 2;
		// It was shifted: its own centre is well left of the trigger's, and it stays in view.
		expect(p.x + p.width).toBeLessThanOrEqual(375);
		expect(triggerCentre - (p.x + p.width / 2)).toBeGreaterThan(20);
		await expect
			.poll(async () => {
				const a = (await arrow.boundingBox())!;
				return Math.abs(a.x + a.width / 2 - triggerCentre);
			})
			.toBeLessThanOrEqual(2);
	});

	test('Popover: focus leaving it closes it (non-modal) without pulling focus back', async ({ page }) => {
		const section = await openSection(page, 'popover');
		const trigger = section.getByRole('button', { name: 'Run details' });
		const popover = page.getByRole('dialog', { name: 'Run 482', includeHidden: true });
		await trigger.click();
		await expect(popover).toBeFocused();
		await press(page, 'Tab');
		await expectShown(popover, false);
		await expect(section.getByRole('button', { name: /Assignee/ })).toBeFocused();
	});

	test('Popover: matchWidth is at least as wide as its trigger, and bind:open closes it on a choice', async ({ page }) => {
		const section = await openSection(page, 'popover');
		const trigger = section.getByRole('button', { name: /Assignee/ });
		const popover = page.getByRole('dialog', { name: 'Choose an assignee', includeHidden: true });
		await trigger.click();
		await expectShown(popover, true);
		const t = (await trigger.boundingBox())!;
		const p = (await popover.boundingBox())!;
		expect(p.width).toBeGreaterThanOrEqual(t.width - 1);
		expect(Math.abs(p.x - t.x)).toBeLessThanOrEqual(1);
		await popover.getByRole('button', { name: 'Chiara Rossi' }).click();
		await expectShown(popover, false);
		await expect(trigger).toHaveText(/Chiara Rossi/);
	});

	test('Tooltip: hover opens after the delay, the next one opens at once, Escape closes it first', async ({ page }) => {
		const section = await openSection(page, 'tooltip');
		const copy = section.getByRole('button', { name: 'Copy output' });
		const retry = section.getByRole('button', { name: 'Retry run' });
		const copyTip = page.getByRole('tooltip', { name: 'Copy output', includeHidden: true });
		const retryTip = page.getByRole('tooltip', { name: /Retry run/, includeHidden: true });

		await page.evaluate(() => {
			const times: Record<string, number> = {};
			(window as unknown as { times: Record<string, number> }).times = times;
			document.addEventListener('pointerover', (e) => {
				const label = (e.target as Element).closest('button')?.getAttribute('aria-label');
				if (label) times[`enter:${label}`] ??= performance.now();
			}, true);
			for (const el of document.querySelectorAll('#tooltip [role="tooltip"]')) {
				el.addEventListener('toggle', (e) => {
					if ((e as ToggleEvent).newState === 'open') times[`open:${el.textContent?.trim()}`] ??= performance.now();
				});
			}
		});
		const elapsed = (from: string, to: string) =>
			page.evaluate(([from, to]) => {
				const times = (window as unknown as { times: Record<string, number> }).times;
				return times[to] - times[from];
			}, [from, to]);

		await copy.hover();
		await expectShown(copyTip, true);
		await expect(copy).toHaveAttribute('aria-describedby', (await copyTip.getAttribute('id'))!);
		expect(await elapsed('enter:Copy output', 'open:Copy output')).toBeGreaterThanOrEqual(550);

		await retry.hover();
		await expectShown(retryTip, true);
		await expectShown(copyTip, false);
		expect(await elapsed('enter:Retry run', 'open:Retry run R')).toBeLessThan(150);

		await press(page, 'Escape');
		await expectShown(retryTip, false);
		await expect(retry).not.toHaveAttribute('aria-describedby');
	});

	test('Tooltip: keyboard focus opens it, including on a span that wraps a disabled button', async ({ page }) => {
		const section = await openSection(page, 'tooltip');
		// Arrive by keyboard: only :focus-visible focus opens a tooltip.
		await section.getByRole('button', { name: 'Retry run' }).focus();
		await press(page, 'Tab');
		await expectShown(page.getByRole('tooltip', { name: 'Share a read-only link', includeHidden: true }), true);
		await press(page, 'Tab');
		const tip = page.getByRole('tooltip', { name: 'Publishing needs a linked repository', includeHidden: true });
		await expectShown(tip, true);
		const describedBy = await page.evaluate(() => document.activeElement?.getAttribute('aria-describedby'));
		expect(describedBy).toBe(await tip.getAttribute('id'));
		await press(page, 'Escape');
		await expectShown(tip, false);
	});
});

test.describe('overlay motion', () => {
	/** Page-time stamps for Escape, data-state turning closed, and the dialog actually closing. */
	async function closeTimeline(page: Page): Promise<{ stateClosed: number; hidden: number }> {
		await page.evaluate(() => {
			const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!;
			const t: Record<string, number> = {};
			(window as unknown as { timeline: Record<string, number> }).timeline = t;
			document.addEventListener('keydown', (e) => e.key === 'Escape' && (t.escape ??= performance.now()), true);
			new MutationObserver(() => {
				if (dialog.dataset.state === 'closed') t.stateClosed ??= performance.now();
				if (!dialog.open) t.hidden ??= performance.now();
			}).observe(dialog, { attributes: true, attributeFilter: ['data-state', 'open'] });
		});
		await press(page, 'Escape');
		await expect.poll(() => page.evaluate(() => (window as unknown as { timeline: Record<string, number> }).timeline.hidden)).toBeDefined();
		return page.evaluate(() => {
			const t = (window as unknown as { timeline: Record<string, number> }).timeline;
			return { stateClosed: t.stateClosed - t.escape, hidden: t.hidden - t.escape };
		});
	}

	test('Dialog: the entry and exit transitions play, and focus returns after the exit', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		const section = await openSection(page, 'dialog');
		const trigger = section.getByRole('button', { name: 'Edit agent' });
		await trigger.click();
		const dialog = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });
		// Opening runs from @starting-style.
		expect(
			await dialog.evaluate((el) => el.getAnimations().map((a) => (a as CSSTransition).transitionProperty))
		).toEqual(expect.arrayContaining(['opacity', 'scale']));
		await dialog.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

		const t = await closeTimeline(page);
		expect(t.stateClosed).toBeLessThan(50);
		expect(t.hidden - t.stateClosed).toBeGreaterThanOrEqual(150);
		// The stack caps the wait at 400ms; the rest is slack for a loaded machine.
		expect(t.hidden - t.stateClosed).toBeLessThan(700);
		await expect(trigger).toBeFocused();
	});

	test('Dialog: under reduced motion it closes at once', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const section = await openSection(page, 'dialog');
		const trigger = section.getByRole('button', { name: 'Edit agent' });
		await trigger.click();
		await expectShown(page.getByRole('dialog', { name: 'Edit agent', includeHidden: true }), true);
		const t = await closeTimeline(page);
		// Hidden in the same task closing began (the showcase page is heavy, so the task itself
		// can be long; what matters is that nothing waited for an animation).
		expect(t.hidden - t.stateClosed).toBeLessThan(20);
		await expect(trigger).toBeFocused();
	});

	test('Sheet: slides out before it hides', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		const section = await openSection(page, 'sheet');
		await section.getByRole('button', { name: 'Open right sheet' }).click();
		const sheet = page.locator('dialog[open]');
		await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
		const t = await closeTimeline(page);
		expect(t.hidden - t.stateClosed).toBeGreaterThanOrEqual(220);
		expect(t.hidden - t.stateClosed).toBeLessThan(700);
	});
});

test.describe('overlays at 375px', () => {
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
	});

	test('Dialog: md fits the screen with a margin; full fills it with the footer in view', async ({ page }, testInfo) => {
		const section = await openSection(page, 'dialog');
		await page.setViewportSize({ width: 375, height: 667 });
		await section.getByRole('button', { name: 'Edit agent' }).click();
		const edit = page.getByRole('dialog', { name: 'Edit agent', includeHidden: true });
		const box = (await edit.boundingBox())!;
		expect(Math.round(box.width)).toBe(375 - 32);
		await testInfo.attach('dialog-md-375', { body: await page.screenshot(), contentType: 'image/png' });
		await press(page, 'Escape');
		await expectShown(edit, false);

		await section.getByRole('button', { name: 'Read release notes' }).click();
		const notes = page.getByRole('dialog', { name: 'What’s new', includeHidden: true });
		await expectShown(notes, true);
		const full = (await notes.boundingBox())!;
		expect([full.x, full.y, full.width, full.height].map(Math.round)).toEqual([0, 0, 375, 667]);
		const gotIt = notes.getByRole('button', { name: 'Got it' });
		const button = (await gotIt.boundingBox())!;
		expect(button.y + button.height).toBeLessThanOrEqual(667);
		await testInfo.attach('dialog-full-375', { body: await page.screenshot(), contentType: 'image/png' });
	});

	test('Sheet: bottom and right sheets at 375px', async ({ page }, testInfo) => {
		const section = await openSection(page, 'sheet');
		await page.setViewportSize({ width: 375, height: 667 });
		for (const side of ['bottom', 'right']) {
			await section.getByRole('button', { name: `Open ${side} sheet` }).click();
			const sheet = page.locator('dialog[open]');
			const box = (await sheet.boundingBox())!;
			expect(Math.round(box.width)).toBe(side === 'bottom' ? 375 : Math.min(384, 375));
			await testInfo.attach(`sheet-${side}-375`, { body: await page.screenshot(), contentType: 'image/png' });
			await press(page, 'Escape');
			await expect(page.locator('dialog[open]')).toHaveCount(0);
		}
	});
});
