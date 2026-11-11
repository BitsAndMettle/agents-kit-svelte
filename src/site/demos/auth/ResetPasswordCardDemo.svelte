<script lang="ts">
	import { ResetPasswordCard } from '$lib/auth/recovery';
	import type { AuthResult } from '$lib/auth/shared';

	let log = $state('');
	let native = $state(false);
	let expired = $state(false);

	const rules = [
		{ label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
		{ label: 'A number', test: (v: string) => /[0-9]/.test(v) }
	];

	/** A slow server call. "Password123456" is refused as too common. */
	async function reset({ password: next }: { password: string }): Promise<AuthResult<'password'> | void> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (next === 'Password123456') return { errors: { password: 'That password is too common. Choose another.' } };
		if (next === 'Failing-0123456') throw new Error('network down');
		log = 'Password reset';
	}
</script>

<div class="flex flex-col gap-3">
	<ResetPasswordCard
		onSubmit={native ? undefined : reset}
		action="/demo-native-post"
		hidden={{ token: 'demo-token' }}
		email="ada@example.com"
		{rules}
		minlength={10}
		{expired}
		signInHref="#reset-password-card"
		onContinue={() => (log = 'Continued to sign in')}
		forgotHref="#forgot-password-card"
	/>
	<p class="m-0 text-center text-[13px] text-fg-light">Last action: <span data-testid="reset-log">{log}</span></p>
	<label class="mx-auto flex items-center gap-2 text-xs text-fg-light"><input type="checkbox" bind:checked={expired} /> Show the expired-link state</label>
	<label class="mx-auto flex items-center gap-2 text-xs text-fg-light"><input type="checkbox" bind:checked={native} /> Post natively (no handler)</label>
	<p class="m-0 text-center text-xs text-fg-light">Try Password123456 for a field error and Failing-0123456 for a failed request.</p>
</div>
