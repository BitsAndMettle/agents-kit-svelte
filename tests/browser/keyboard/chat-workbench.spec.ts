import { expect, test, type Page } from '@playwright/test';

/** Loads the data-driven ChatWorkbench fixture (src/routes/workbench) and waits for hydration. */
async function open(page: Page, width = 1280): Promise<void> {
	await page.setViewportSize({ width, height: 900 });
	await page.goto('/workbench/');
	await expect(page.getByRole('button', { name: 'Toggle global color theme' })).toBeEnabled({ timeout: 45000 });
}

const events = (page: Page) => page.getByTestId('events');
const full = (page: Page) => page.getByRole('region', { name: 'Referee', exact: true });
const panel = (page: Page) => page.getByRole('region', { name: 'Referee panel' });

test('ChatWorkbench: sending calls onSend with the text and attachments and adds no reply of its own', async ({ page }) => {
	await open(page);
	const box = full(page).getByRole('textbox', { name: 'Message the Referee' });
	await box.fill('Park Card 212');
	await box.press('Enter');
	await expect(events(page)).toContainText('send:Park Card 212:card-212');
	await expect(box).toHaveValue('');
	await expect(full(page).getByRole('log').getByText('Park Card 212')).toBeVisible();
	await page.waitForTimeout(1500);
	await expect(full(page).locator('article[data-slot="message"]')).toHaveCount(3);
});

test('ChatWorkbench: replies render as safe Markdown', async ({ page }) => {
	await open(page);
	const log = full(page).getByRole('log');
	await expect(log.locator('strong', { hasText: 'blocked' })).toBeVisible();
	await expect(log.locator('li')).toHaveCount(2);
	await expect(log.locator('a[href="https://example.com/board"]')).toHaveAttribute('rel', 'noopener noreferrer nofollow');
	await expect(log.locator('img')).toHaveCount(0);
	await expect(log.locator('a[href^="javascript"]')).toHaveCount(0);
	await expect(log.getByText('<img src=x onerror=alert(1)>', { exact: false })).toBeVisible();
	await expect(log.getByText('trailside cards --blocked')).toBeVisible();
});

test('ChatWorkbench: model and effort picker by pointer and keyboard; Escape returns focus', async ({ page }) => {
	await open(page);
	const trigger = full(page).getByRole('button', { name: 'Model: Sonnet · Medium' });
	await trigger.click();
	await full(page).getByRole('option', { name: /Opus/ }).click();
	await expect(events(page)).toContainText('model:opus:medium');
	const opus = full(page).getByRole('button', { name: 'Model: Opus · Medium' });
	await opus.click();
	await full(page).getByRole('radio', { name: 'High' }).click();
	await expect(events(page)).toContainText('model:opus:high');
	await full(page).getByRole('radio', { name: 'High' }).focus();
	await page.keyboard.press('ArrowRight');
	await expect(events(page)).toContainText('model:opus:max');
	await expect(full(page).getByRole('radio', { name: 'Max' })).toBeFocused();
	await expect(full(page).getByRole('radio', { name: 'Max' })).toHaveAttribute('aria-checked', 'true');
	await page.keyboard.press('Escape');
	await expect(full(page).getByRole('listbox')).toHaveCount(0);
	await expect(full(page).getByRole('button', { name: 'Model: Opus · Max' })).toBeFocused();
});

test('ChatWorkbench: attachments, header actions and conversations call back', async ({ page }) => {
	await open(page);
	await full(page).getByRole('button', { name: 'Remove Card 212 · BitsAndMettle/example' }).click();
	await expect(events(page)).toContainText('remove:card-212');
	await expect(full(page).getByRole('button', { name: /^Remove / })).toHaveCount(0);
	await full(page).getByRole('button', { name: 'Pause' }).click();
	await expect(events(page)).toContainText('pause');

	const sidebar = full(page).getByRole('complementary', { name: 'Conversations' });
	await expect(sidebar).toBeVisible();
	await expect(full(page).getByRole('tablist')).toBeHidden();
	await sidebar.getByRole('button', { name: /Card 198/ }).click();
	await expect(events(page)).toContainText('select:c2');
	await expect(sidebar.getByRole('button', { name: /Card 198/ })).toHaveAttribute('aria-current', 'true');
	await sidebar.getByRole('button', { name: 'New conversation' }).click();
	await expect(events(page)).toContainText('new');
});

test('ChatWorkbench: fills its parent and has no main landmark', async ({ page }) => {
	await open(page);
	const parent = await page.getByTestId('full').boundingBox();
	const section = await full(page).boundingBox();
	const composer = await full(page).locator('form').boundingBox();
	expect(section!.height).toBeCloseTo(parent!.height - 2, 0);
	expect(composer!.y + composer!.height).toBeLessThanOrEqual(section!.y + section!.height);
	await expect(page.locator('main')).toHaveCount(0);
	await expect(full(page).getByRole('heading', { level: 2, name: 'Referee' })).toBeVisible();
});

test('ChatWorkbench on a phone: Chat and Conversations tabs, arrow keys switch them', async ({ page }) => {
	await open(page, 390);
	await expect(full(page).getByRole('complementary', { name: 'Conversations' })).toBeHidden();
	const chatTab = full(page).getByRole('tab', { name: 'Chat' });
	await chatTab.focus();
	await page.keyboard.press('ArrowRight');
	const listTab = full(page).getByRole('tab', { name: /Conversations/ });
	await expect(listTab).toBeFocused();
	await expect(listTab).toHaveAttribute('aria-selected', 'true');
	await expect(full(page).getByRole('textbox', { name: 'Message the Referee' })).toBeHidden();
	await full(page).getByRole('tabpanel').getByRole('button', { name: /Card 198/ }).click();
	await expect(events(page)).toContainText('select:c2');
	await expect(chatTab).toHaveAttribute('aria-selected', 'true');
	await expect(full(page).getByRole('textbox', { name: 'Message the Referee' })).toBeVisible();
});

test('ChatWorkbench panel layout: tabs at any width, presence, empty state and a disabled composer', async ({ page }) => {
	await open(page);
	await expect(panel(page).getByRole('tablist')).toBeVisible();
	await expect(panel(page).getByRole('complementary')).toHaveCount(0);
	await expect(panel(page).getByRole('heading', { level: 3, name: 'Referee' })).toBeVisible();
	await expect(panel(page).getByRole('status').filter({ hasText: 'Offline' })).toBeVisible();
	await expect(panel(page).getByText('Ask the Referee what is happening.')).toBeVisible();
	await expect(panel(page).getByRole('textbox')).toBeDisabled();
	await panel(page).getByRole('tab', { name: /Conversations/ }).click();
	await expect(panel(page).getByText('Reading the conversations on devbox…')).toBeVisible();
});
