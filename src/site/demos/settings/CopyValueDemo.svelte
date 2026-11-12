<script lang="ts">
	import { CopyValue } from '$lib/settings/controls';
	import { RECIPES } from '$lib/settings/shared';

	// Fictional values, made up for the demo.
	const TOKEN = 'nw_live_4f9c2e7a1b8d3f60c5e2a9d7b1f4c8e2';
	const SECRET = 'whsec_P2v9Lq7XcT4mR8nZ1kD6sF3jH5gA0bYe';

	let log = $state('');
	let secretShown = $state(true);
	let showOnceKey = $state(0);
	const expiresSoon = Date.now() + 15 * 60_000;

	async function finish(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 600));
		secretShown = false;
		log = 'Secret dismissed';
	}
</script>

<div class="@container/settings mx-auto flex w-full max-w-3xl flex-col gap-4">
	<section class={RECIPES.section} aria-labelledby="cv-connect">
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="cv-connect" class="m-0 text-sm font-semibold text-fg-main">Connect a computer</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Run the command, then paste the team ID when asked.</p>
			</div>
		</div>
		<div class="flex flex-col gap-4 px-4 py-4">
			<CopyValue label="Install command" prompt="$" value="npx northwind-cli@latest connect" onCopy={(ok) => (log = ok ? 'Copied the install command' : 'Copy failed')} data-testid="cv-command" />
			<div class="grid gap-4 @lg/settings:grid-cols-2">
				<CopyValue label="Team ID" value="tm_8f3k2q9x" size="sm" data-testid="cv-id" />
				<CopyValue label="Invite link" value="https://northwind.example/join/7QX2-PL4M" mono={false} size="sm" />
			</div>
			<CopyValue label="API key" value={TOKEN} masked onReveal={(shown) => (log = shown ? 'Key revealed' : 'Key hidden')} data-testid="cv-masked" />
			<p class="m-0 text-xs text-fg-light" data-testid="cv-log">{log}</p>
		</div>
	</section>

	<section class={RECIPES.section} aria-labelledby="cv-secret">
		<div class={RECIPES.sectionHeader}>
			<div class="min-w-0 flex-1">
				<h3 id="cv-secret" class="m-0 text-sm font-semibold text-fg-main">New signing secret</h3>
				<p class="m-0 mt-0.5 text-xs leading-5 text-fg-light">Shown once, right after it is made. It expires in 15 minutes if unused.</p>
			</div>
		</div>
		<div class="px-4 py-4">
			{#if secretShown}
				{#key showOnceKey}
					<CopyValue label="Signing secret" value={SECRET} showOnce requireAcknowledge expiresAt={expiresSoon} filename="signing-secret.txt" onDone={finish} data-testid="cv-once" />
				{/key}
			{:else}
				<div class="flex flex-wrap items-center gap-3 text-[13px] text-fg-light">
					<span>The secret is gone from this page.</span>
					<button type="button" class="text-xs text-fg-main underline underline-offset-2" onclick={() => ((secretShown = true), showOnceKey++)}>Show the demo again</button>
				</div>
			{/if}
		</div>
		<div class={RECIPES.sectionFooter}>
			<span class="min-w-0 flex-1">An expired secret is removed from the page:</span>
		</div>
		<div class="px-4 pb-4">
			<CopyValue label="Old signing secret" value={SECRET} expiresAt={Date.UTC(2026, 0, 1)} now={Date.UTC(2026, 10, 12)} size="sm" data-testid="cv-expired" />
		</div>
	</section>
</div>
