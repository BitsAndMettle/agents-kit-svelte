<script lang="ts">
	import { TwoFactorSetup, type TwoFactorStep } from '$lib/auth/recovery';
	import type { AuthResult } from '$lib/auth/shared';

	let step = $state<TwoFactorStep>(1);
	let log = $state('');

	// A stand-in for the QR code your server draws: a plain pattern, not a real code.
	const cells = Array.from({ length: 49 }, (_, i) => (i * 7 + (i % 5) * 3) % 3 !== 0);

	/** A slow server call. Any code but 123456 is refused. */
	async function verify({ code }: { code: string }): Promise<AuthResult<'code'> | void> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (code === '000000') throw new Error('network down');
		if (code !== '123456') return { errors: { code: 'That code is not right. Check your app and try again.' } };
		log = 'Verified';
	}
</script>

{#snippet qr()}
	<svg viewBox="0 0 7 7" role="img" aria-label="Sample QR code" shape-rendering="crispEdges">
		{#each cells as on, i (i)}
			{#if on}<rect x={i % 7} y={Math.floor(i / 7)} width="1" height="1" fill="currentColor" />{/if}
		{/each}
	</svg>
{/snippet}

<div class="flex flex-col gap-3">
	<TwoFactorSetup
		bind:step
		{qr}
		secret="JBSWY3DPEHPK3PXP"
		issuer="Example app"
		account="ada@example.com"
		onVerify={verify}
		backupCodes={['7k2m-9xqp', 'f3ab-81zd', 'q9wl-4tnc', 'x5rj-0vhe', 'm8dy-2gua', 'c1ps-6kbo']}
		backupCodesProps={{ filename: 'example-backup-codes.txt' }}
		onComplete={() => {
			log = 'Setup complete';
			step = 1;
		}}
		onCancel={() => (log = 'Cancelled')}
	/>
	<p class="m-0 text-center text-[13px] text-fg-light">Last action: <span data-testid="setup-log">{log}</span></p>
	<p class="m-0 text-center text-xs text-fg-light">The code that works is 123456; 000000 fails the request.</p>
</div>
