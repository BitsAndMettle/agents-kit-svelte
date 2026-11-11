<script lang="ts">
	import { VerifyEmailBanner } from '$lib/auth/account';

	let dismissed = $state(false);
	let resendAvailableAt = $state<number | undefined>(undefined);
	let sends = $state(0);

	/** A slow server call that also sets the next allowed resend. */
	async function resend() {
		await new Promise((resolve) => setTimeout(resolve, 800));
		sends += 1;
		resendAvailableAt = Date.now() + 5000;
	}

	async function refuse(): Promise<void> {
		throw new Error('refused');
	}
</script>

<div class="flex max-w-xl flex-col gap-3">
	{#if !dismissed}
		<VerifyEmailBanner
			email="ada@example.com"
			onResend={resend}
			{resendAvailableAt}
			onChangeEmail={() => (sends = 0)}
			onDismiss={() => (dismissed = true)}
		/>
	{:else}
		<button type="button" class="self-start rounded-control border border-card-border px-3 py-1 text-[13px] text-fg-main" onclick={() => (dismissed = false)}>Show the banner again</button>
	{/if}
	<VerifyEmailBanner data-testid="banner-plain" email="grace@example.com" labels={{ title: 'Verify without a handler' }} />
	<VerifyEmailBanner data-testid="banner-failing" email="alan@example.com" onResend={refuse} labels={{ title: 'Verify with a failing server' }} />
	<p class="m-0 text-[13px] text-fg-light">Emails sent: <span data-testid="verify-sends">{sends}</span></p>
</div>
