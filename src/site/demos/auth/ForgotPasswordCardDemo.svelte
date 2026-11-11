<script lang="ts">
	import { ForgotPasswordCard } from '$lib/auth/recovery';
	import type { AuthResult } from '$lib/auth/shared';

	let log = $state('');
	let calls = $state(0);
	let native = $state(false);
	let resendAvailableAt = $state<number | undefined>(undefined);

	/** A slow server call. "nobody@example.com" is refused, to show a field error. */
	async function request({ email }: { email: string }): Promise<AuthResult<'email'> | void> {
		calls += 1;
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (email === 'nobody@example.com') return { errors: { email: 'That address cannot receive mail. Check it and try again.' } };
		if (email === 'fail@example.com') throw new Error('network down');
		log = `Requested for ${email}`;
		resendAvailableAt = Date.now() + 5000;
	}

	async function resend() {
		await new Promise((resolve) => setTimeout(resolve, 800));
		log = 'Resent';
		resendAvailableAt = Date.now() + 5000;
	}
</script>

<div class="flex flex-col gap-3">
	<ForgotPasswordCard onSubmit={native ? undefined : request} action="/demo-native-post" onResend={resend} {resendAvailableAt} signInHref="#forgot-password-card" onBack={() => (log = 'Back to sign in')} />
	<p class="m-0 text-center text-[13px] text-fg-light">Last action: <span data-testid="forgot-log">{log}</span>. Requests: <span data-testid="forgot-calls">{calls}</span></p>
	<label class="mx-auto flex items-center gap-2 text-xs text-fg-light"><input type="checkbox" bind:checked={native} /> Post natively (no handler)</label>
	<p class="m-0 text-center text-xs text-fg-light">Try nobody@example.com for a field error and fail@example.com for a failed request.</p>
</div>
