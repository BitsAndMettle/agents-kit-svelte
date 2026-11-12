import { expect, test, type Page } from '@playwright/test';

/** Collects page errors and console errors while the composed settings fixture is open. */
function watch(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	return errors;
}

/** Opens the fixture and waits for hydration: an instant toggle with no `action` waits for the page to be ready. */
async function open(page: Page): Promise<void> {
	await page.goto('/fixtures/settings-composed/');
	await expect(page.getByRole('switch', { name: 'Play a sound' })).toBeEnabled({ timeout: 45000 });
}

/**
 * The fake server answers after 600 ms. A test that looks at an in-flight state owns that time:
 * the clock is installed before the page loads and paused once it is ready.
 */
async function openOnClock(page: Page): Promise<void> {
	await page.clock.install();
	await open(page);
	// The installed clock runs with real time until now, so a moment a little ahead of it is never in its past.
	await page.clock.pauseAt(new Date(Date.now() + 5000));
}

const rail = (page: Page) => page.locator('[data-settings-rail]');

test('Composed settings: every component loads together and works with JavaScript', async ({ page }) => {
	const errors = watch(page);
	await open(page);
	await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();

	// A staged edit reaches the SaveBar, the navigation's dirty dot and the attention list.
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	await expect(page.getByText('1 unsaved change', { exact: true })).toBeVisible();
	await expect(rail(page).getByText('Unsaved changes.')).toBeAttached();
	await expect(page.getByTestId('composed-page').getByText('Unsaved policy changes')).toBeVisible();
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByTestId('composed-log')).toContainText('Workspace name → Harbor Crew');

	// The page scope's lock reaches the staged rows.
	await page.getByTestId('as-viewer').check();
	await expect(page.getByRole('textbox', { name: 'Workspace name' })).toBeDisabled();
	expect(errors).toEqual([]);
});

test('Composed settings: "Save and leave" while a save is in flight waits for it, then leaves', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.clock.runFor(100);
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	// Let the dialog open (still well inside the save's 600 ms).
	await page.clock.runFor(100);
	const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Save and leave' }).click();
	await page.clock.runFor(50);
	// The save already sent is waited for, not reported as a failure while it runs.
	await expect(dialog.getByText("Couldn't save")).toHaveCount(0);
	await page.clock.runFor(1000);
	await expect(page).toHaveURL(/section=members/);
	await expect(page.getByTestId('composed-log')).toHaveText('Saved revision 5: Workspace name → Racing');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: "Save and leave" saves edits made while the first save was in flight, then leaves', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	const name = page.getByRole('textbox', { name: 'Workspace name' });
	await name.fill('Racing');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.clock.runFor(100);
	// Typed while "Racing" is still being saved: not part of that save.
	await name.fill('Racing Two');
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	await page.clock.runFor(100);
	const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Save and leave' }).click();
	// The first save settles at 600 ms, then the newer edit is saved (another 600 ms).
	await page.clock.runFor(2400);
	await expect(page).toHaveURL(/section=members/);
	await expect(page.getByTestId('composed-log')).toHaveText('Saved revision 6: Workspace name → Racing Two');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: when "Save and leave" fails, Keep editing focuses the invalid field', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByTestId('reject-role').check();
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	await page.clock.runFor(100);
	const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Save and leave' }).click();
	await page.clock.runFor(1000);
	await expect(dialog.getByText("Couldn't save")).toBeVisible();
	await dialog.getByRole('button', { name: 'Keep editing' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).not.toHaveURL(/section=members/);
	// The radio group carries aria-invalid but cannot take focus: its checked radio does, not the rail link that opened the dialog.
	const group = page.getByRole('radiogroup', { name: 'Default role' });
	await expect(group).toHaveAttribute('aria-invalid', 'true');
	await expect(group.getByRole('radio', { name: /^Member/ })).toBeFocused();
	expect(errors).toEqual([]);
});

test('Composed settings: an attention item whose dismissal answers with a conflict stays, with the conflict announced', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	const attention = page.getByTestId('composed-page').getByTestId('composed-attention');
	const item = attention.locator('[data-attention-item="region"]');
	await item.getByRole('button', { name: /^Dismiss/ }).click();
	await page.clock.runFor(700);
	// A conflict is a failure even without an `error`: its message is the alert.
	await expect(item.getByRole('alert')).toHaveText('An administrator answered this a moment ago. Reload to see it.');
	await expect(item).toBeVisible();
	expect(errors).toEqual([]);
});

for (const width of [390, 360]) {
	test(`Composed settings: at ${width}px dismissing the last attention item on the index keeps the list, says all clear and keeps focus`, async ({ page }) => {
		const errors = watch(page);
		await page.clock.install();
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/fixtures/settings-composed/?section=');
		const attention = page.getByTestId('composed-attention');
		// Dismiss buttons need JavaScript: visible means hydrated.
		await expect(attention.getByRole('button', { name: /^Dismiss/ }).first()).toBeVisible({ timeout: 45000 });
		await page.clock.pauseAt(new Date(Date.now() + 5000));
		await attention.getByRole('button', { name: 'Dismiss: Seats almost full' }).click();
		await page.clock.runFor(700);
		await expect(attention.locator('[data-attention-item]')).toHaveCount(1);
		const region = attention.getByRole('button', { name: 'Dismiss: A storage change is waiting' });
		// The first try answers with a conflict; the second goes through.
		await region.click();
		await page.clock.runFor(700);
		await expect(attention.getByRole('alert')).toHaveText('An administrator answered this a moment ago. Reload to see it.');
		await region.click();
		await page.clock.runFor(700);
		await expect(attention.locator('[data-attention-item]')).toHaveCount(0);
		await expect(attention.getByText('Nothing needs attention right now.')).toBeVisible();
		await expect(attention.getByRole('heading', { name: 'Needs attention' })).toBeFocused();
		expect(errors).toEqual([]);
	});
}

test('Composed settings: a scope action answered with a conflict shows its message and can run again', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByTestId('as-viewer').check();
	const scopePage = page.getByTestId('composed-page');
	const request = scopePage.getByRole('button', { name: 'Request access' });
	await request.click();
	await page.clock.runFor(700);
	// A conflict is a failure even without an `error`: its message is the alert, and nothing says it was sent.
	await expect(scopePage.locator('[data-settings-scope-error]')).toHaveText('Your role changed a moment ago. Reload, then ask again.');
	await expect(scopePage.getByRole('button', { name: 'Access requested' })).toHaveCount(0);
	await request.click();
	await page.clock.runFor(700);
	await expect(scopePage.getByRole('button', { name: 'Access requested' })).toHaveAttribute('aria-disabled', 'true');
	await expect(scopePage.locator('[data-settings-scope-error]')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: leaving without saving clears the dirty dot and the unsaved attention item', async ({ page }) => {
	const errors = watch(page);
	await open(page);
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	const workspace = rail(page).getByRole('link', { name: /^Workspace/ });
	await expect(workspace).toContainText('Unsaved changes.');
	await rail(page).getByRole('link', { name: /^Members/ }).click();
	await page.getByRole('dialog', { name: 'Leave without saving?' }).getByRole('button', { name: 'Leave without saving' }).click();
	await expect(page).toHaveURL(/section=members/);
	// The form is gone, so nothing is unsaved: no dot, and no attention item pointing at #policy.
	await expect(workspace).not.toContainText('Unsaved changes.');
	await expect(page.getByText('Unsaved policy changes')).toHaveCount(0);
	await expect(page.locator('a[href="#policy"]')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('Composed settings: a failed save on a radio group focuses its checked radio', async ({ page }) => {
	const errors = watch(page);
	await openOnClock(page);
	await page.getByTestId('reject-role').check();
	await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.clock.runFor(700);
	await expect(page.getByText('Pick a role your plan allows.').first()).toBeVisible();
	const group = page.getByRole('radiogroup', { name: 'Default role' });
	await expect(group).toHaveAttribute('aria-invalid', 'true');
	await expect(group.getByRole('radio', { name: /^Member/ })).toBeFocused();
	expect(errors).toEqual([]);
});

test('Composed settings: callback-only actions are available once the page is ready', async ({ page }) => {
	const errors = watch(page);
	await open(page);
	await expect(page.getByRole('button', { name: 'Regenerate' })).not.toHaveAttribute('aria-disabled', 'true');
	await expect(page.getByRole('button', { name: 'Add seats' })).not.toHaveAttribute('aria-disabled', 'true');
	expect(errors).toEqual([]);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('Composed settings: the server render is complete and the staged form posts natively', async ({ page }) => {
		const errors = watch(page);
		await page.goto('/fixtures/settings-composed/');
		await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();
		const form = page.getByTestId('composed-form');
		await expect(form).toHaveAttribute('method', 'post');
		await expect(form.locator('input[name="revision"]')).toHaveValue('4');
		await expect(form.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
		await expect(page.getByRole('searchbox', { name: 'Search settings' })).toBeVisible();
		await expect(page.getByRole('meter', { name: 'Seats' })).toBeVisible();
		expect(await page.locator('form form').count()).toBe(0);
		// Buttons that only call back (no native path) wait, soft-disabled, until the page is interactive.
		for (const name of ['Send again for Storage region', 'Cancel request for Storage region']) {
			await expect(page.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');
		}
		expect(errors).toEqual([]);
	});

	test('Composed settings: filtering members without JavaScript keeps the page on its section', async ({ page }) => {
		await page.goto('/fixtures/settings-composed/?section=workspace');
		const members = page.getByTestId('composed-members');
		await members.getByRole('searchbox', { name: 'Filter' }).fill('ada');
		await members.getByRole('button', { name: 'Filter', exact: true }).click();
		await expect(page).toHaveURL(/[?&]section=workspace(&|$)/);
		await expect(page).toHaveURL(/[?&]member=ada(&|$)/);
		await expect(page.getByTestId('composed-members')).toBeVisible();
	});

	test('Composed settings: actions that only call back are unavailable, not silently dead', async ({ page }) => {
		await page.goto('/fixtures/settings-composed/');
		await expect(page.getByRole('heading', { level: 1, name: 'Workspace' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Regenerate' })).toHaveAttribute('aria-disabled', 'true');
		await expect(page.getByRole('button', { name: 'Add seats' })).toHaveAttribute('aria-disabled', 'true');
		// A link still works without JavaScript.
		await expect(page.getByRole('link', { name: 'View' })).toHaveAttribute('href', /dialog=recovery-codes/);
	});
});

test.describe('Final fixes: saving, leaving and locks', () => {
	test('Composed settings: a save that lands while the leave dialog is open lets the navigation go', async ({ page }) => {
		const errors = watch(page);
		await openOnClock(page);
		await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(100);
		await rail(page).getByRole('link', { name: /^Members/ }).click();
		await page.clock.runFor(100);
		const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
		await expect(dialog).toBeVisible();
		await page.clock.runFor(800);
		// Nothing is left to lose: no dialog over an empty change list, the navigation goes ahead.
		await expect(page).toHaveURL(/section=members/);
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByTestId('composed-log')).toHaveText('Saved revision 5: Workspace name → Racing');
		expect(errors).toEqual([]);
	});

	test('Composed settings: Escape and the backdrop leave the dialog open while "Save and leave" runs', async ({ page }) => {
		await openOnClock(page);
		await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
		await rail(page).getByRole('link', { name: /^Members/ }).click();
		await page.clock.runFor(100);
		const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
		await expect(dialog).toBeVisible();
		const saveAndLeave = dialog.getByRole('button', { name: 'Save and leave' });
		// Counts every close, even one the open state undoes at once.
		await dialog.evaluate((node) => {
			(window as unknown as { closes: number }).closes = 0;
			node.addEventListener('close', () => (window as unknown as { closes: number }).closes++);
		});
		await saveAndLeave.click();
		await page.clock.runFor(50);
		await page.keyboard.press('Escape');
		await page.mouse.click(4, 4);
		await page.clock.runFor(50);
		await expect(dialog).toBeVisible();
		expect(await page.evaluate(() => (window as unknown as { closes: number }).closes)).toBe(0);
		await expect(saveAndLeave).toHaveAttribute('aria-busy', 'true');
		await page.clock.runFor(1000);
		await expect(page).toHaveURL(/section=members/);
	});

	test('Composed settings: resolving a conflict from the keyboard keeps focus in the form', async ({ page }) => {
		await openOnClock(page);
		await page.getByTestId('someone-saves').check();
		const name = page.getByRole('textbox', { name: 'Workspace name' });
		await name.fill('Mine');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(700);
		const yours = page.getByRole('radiogroup', { name: 'Workspace name' }).getByRole('radio', { name: 'Yours' });
		await yours.focus();
		await page.keyboard.press('Space');
		await page.keyboard.press('Enter');
		await page.clock.runFor(700);
		await expect(page.getByTestId('composed-log')).toContainText('(kept workspaceName=mine, retention=theirs)');
		await expect(page.getByRole('radiogroup', { name: 'Workspace name' })).toHaveCount(0);
		await expect(name).toBeFocused();
	});

	test('Composed settings: a failed save leaves focus with a field typed in while it ran', async ({ page }) => {
		await openOnClock(page);
		await page.getByTestId('reject-role').check();
		const name = page.getByRole('textbox', { name: 'Workspace name' });
		await name.fill('Harbor Crew');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(100);
		await name.click();
		await page.keyboard.press('End');
		await page.keyboard.type(' A');
		await page.clock.runFor(600);
		await expect(page.getByText('Pick a role your plan allows.')).toBeVisible();
		await page.keyboard.type('BC');
		await expect(name).toHaveValue('Harbor Crew ABC');
		await expect(name).toBeFocused();
	});

	test('Composed settings: a lock that arrives while a field is unsaved drops it from the change list until it lifts', async ({ page }) => {
		await open(page);
		const name = page.getByRole('textbox', { name: 'Workspace name' });
		await name.fill('Harbor Crew');
		const unsaved = page.getByText('1 unsaved change', { exact: true });
		await expect(unsaved).toBeVisible();
		await page.getByTestId('as-viewer').check();
		await expect(name).toBeDisabled();
		// A disabled field neither posts nor counts: nothing stale to save, nothing to hold a navigation for.
		await expect(unsaved).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
		await page.getByTestId('as-viewer').uncheck();
		await expect(unsaved).toBeVisible();
		await page.getByTestId('as-viewer').check();
		await rail(page).getByRole('link', { name: /^Members/ }).click();
		await expect(page).toHaveURL(/section=members/);
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});
});

test.describe('Integration fixes: drafts, conflicts and focus', () => {
	test('Composed settings: a failed save sent with Enter leaves focus with someone typing on in that field', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await openOnClock(page);
		await page.getByTestId('reject-role').check();
		const name = page.getByRole('textbox', { name: 'Workspace name' });
		await name.fill('Harbor Crew');
		await name.press('Enter');
		await page.clock.runFor(100);
		await page.keyboard.type(' A');
		await page.clock.runFor(600);
		await expect(page.getByText('Pick a role your plan allows.').first()).toBeVisible();
		await page.keyboard.type('BC');
		await expect(name).toHaveValue('Harbor Crew ABC');
		await expect(name).toBeFocused();
	});

	test('Composed settings: a failed save sent with Enter and nothing typed since focuses the invalid field', async ({ page }) => {
		await openOnClock(page);
		await page.getByTestId('reject-role').check();
		const name = page.getByRole('textbox', { name: 'Workspace name' });
		await name.fill('Harbor Crew');
		await name.press('Enter');
		await page.clock.runFor(700);
		await expect(page.getByRole('radiogroup', { name: 'Default role' }).getByRole('radio', { name: /^Member/ })).toBeFocused();
	});

	test('Composed settings: a staged selection survives a filter that hides its row', async ({ page }) => {
		await open(page);
		const approvers = page.getByTestId('composed-approvers');
		const unsaved = page.getByText('1 unsaved change', { exact: true });
		await approvers.getByRole('checkbox', { name: 'Select Chloe Martin' }).check();
		await expect(unsaved).toBeVisible();
		const filter = approvers.getByRole('searchbox', { name: 'Filter Approvers' });
		await filter.fill('zzzz');
		await expect(approvers.getByRole('paragraph').filter({ hasText: 'Nothing matches “zzzz”.' })).toBeVisible();
		// Hidden, the row still holds its box: the change still counts.
		await expect(unsaved).toBeVisible();
		await filter.fill('');
		await expect(approvers.getByRole('checkbox', { name: 'Select Chloe Martin' })).toBeChecked();
		await expect(unsaved).toBeVisible();
		await rail(page).getByRole('link', { name: /^Members/ }).click();
		await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeVisible();
		await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toContainText('Approvers');
	});

	test('Composed settings: a conflict choice outlives a failed retry and the next save keeps it', async ({ page }) => {
		await openOnClock(page);
		await page.getByTestId('someone-saves').check();
		await page.getByRole('textbox', { name: 'Workspace name' }).fill('Mine');
		const save = page.getByRole('button', { name: 'Save', exact: true });
		await save.click();
		await page.clock.runFor(700);
		const resolver = page.getByRole('radiogroup', { name: 'Workspace name' });
		const latest = resolver.getByRole('radio', { name: 'Latest' });
		await latest.check();
		await page.getByTestId('reject-role').check();
		await save.click();
		await page.clock.runFor(100);
		// While the retry runs, the review stays where it was.
		await expect(resolver).toHaveCount(1);
		await page.clock.runFor(700);
		await expect(page.getByText('Pick a role your plan allows.').first()).toBeVisible();
		await expect(latest).toBeChecked();
		await page.getByTestId('reject-role').uncheck();
		await save.click();
		await page.clock.runFor(700);
		await expect(page.getByTestId('composed-log')).toContainText('(kept workspaceName=theirs');
		await expect(resolver).toHaveCount(0);
	});

	test('Composed settings: dismissing the only notice at desktop width keeps focus out of the settings rail', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await openOnClock(page);
		await page.getByRole('textbox', { name: 'Workspace name' }).fill('Harbor Crew');
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await page.clock.runFor(700);
		const notices = page.getByTestId('composed-notices');
		await notices.getByRole('button', { name: /^Dismiss/ }).focus();
		await page.keyboard.press('Enter');
		await page.clock.runFor(300);
		await expect(notices).toHaveCount(0);
		const where = await page.evaluate(() => ({ body: document.activeElement === document.body, inRail: Boolean(document.activeElement?.closest('[data-settings-rail]')) }));
		expect(where).toEqual({ body: false, inRail: false });
	});

	for (const width of [320, 1280]) {
		test(`Composed settings: at ${width}px the leave dialog's actions read in the order Tab moves through them`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await open(page);
			await page.getByRole('textbox', { name: 'Workspace name' }).fill('Racing');
			const away = width >= 1024 ? rail(page).getByRole('link', { name: /^Members/ }) : page.getByRole('link', { name: 'All settings' });
			await away.click();
			const dialog = page.getByRole('dialog', { name: 'Leave without saving?' });
			await expect(dialog).toBeVisible();
			// Measure once the dialog has finished opening (it scales in).
			await dialog.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)));
			const boxes = [];
			for (const name of ['Keep editing', 'Leave without saving', 'Save and leave']) boxes.push((await dialog.getByRole('button', { name, exact: true }).boundingBox())!);
			for (let i = 1; i < boxes.length; i++) {
				const [a, b] = [boxes[i - 1], boxes[i]];
				const below = b.y >= a.y + a.height - 0.5;
				const beside = Math.abs(b.y - a.y) < 0.5 && b.x >= a.x + a.width - 0.5;
				expect(below || beside, `button ${i + 1} comes after button ${i}`).toBe(true);
			}
			// Where they fit (desktop), the three share one line.
			if (width >= 1024) expect(Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y))).toBeLessThan(1);
		});
	}
});
