import { defineConfig } from '@playwright/test';

const updatingBaseline = Boolean(process.env.A11Y_UPDATE_BASELINE);
// Several checkouts can test side by side on one machine by giving each its own port.
const port = Number(process.env.PW_PORT ?? 5188);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: './tests/browser',
	// Stale (expects 67 components, writes screenshots to a Mac path); kept for reference, not run.
	testIgnore: ['**/trailside-claude-chat.spec.ts'],
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	// Baseline regeneration collects results in one process, so it runs on a single worker.
	workers: updatingBaseline ? 1 : process.env.CI ? 2 : undefined,
	timeout: 60000,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: origin,
		trace: 'on-first-retry'
	},
	webServer: {
		command: `corepack pnpm exec vite dev --host 127.0.0.1 --port ${port} --strictPort`,
		url: origin,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	}
});
