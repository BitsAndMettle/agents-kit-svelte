<script lang="ts">
	import { Button } from '$lib/primitives/actions';
	import { MagicLinkSent } from '$lib/auth/signin';

	let withCode = $state(false);
	let resendAvailableAt = $state<number | undefined>(undefined);
	let sends = $state(0);
	let resendMode = $state<'slow' | 'instant' | 'none'>('slow');
	let note = $state('Nothing yet.');

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** A slow fake server that also sets the next allowed resend. */
	async function resend() {
		await wait(800);
		sends += 1;
		resendAvailableAt = Date.now() + 5000;
	}

	/** A fake that answers at once and sets no wait, so Resend can be pressed again straight away. */
	function resendNow() {
		sends += 1;
	}

	async function verify({ code }: { code: string }) {
		await wait(800);
		if (code === '000000') return { errors: { code: 'That code is not right.' } };
		note = `Code accepted: ${code}`;
	}
</script>

<div class="grid gap-6">
	<div class="flex justify-center">
		<Button size="sm" variant={withCode ? 'primary' : 'secondary'} aria-pressed={withCode} onclick={() => (withCode = !withCode)}>Email also has a code</Button>
	</div>
	<div class="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Resend">
		{#each [['slow', 'Slow resend'], ['instant', 'Instant resend'], ['none', 'No resend']] as const as [mode, name] (mode)}
			<Button size="sm" variant={resendMode === mode ? 'primary' : 'secondary'} aria-pressed={resendMode === mode} onclick={() => (resendMode = mode)}>{name}</Button>
		{/each}
	</div>
	<MagicLinkSent
		headingLevel={3}
		email="ada@example.com"
		codeLength={withCode ? 6 : undefined}
		onResend={resendMode === 'slow' ? resend : resendMode === 'instant' ? resendNow : undefined}
		resendAvailableAt={resendMode === 'slow' ? resendAvailableAt : undefined}
		onBack={() => (note = 'Back to the email form')}
		onSubmit={verify}
	/>
	<p class="m-0 text-center text-[13px] text-fg-light" aria-live="polite">Emails sent again: <span data-testid="magic-sends">{sends}</span>. <span data-testid="magic-note">{note}</span></p>
</div>
