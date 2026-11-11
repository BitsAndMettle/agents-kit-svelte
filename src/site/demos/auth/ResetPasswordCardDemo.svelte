<script lang="ts">
	import { ResetPasswordCard } from '$lib/auth/recovery';
	import type { AuthResult } from '$lib/auth/shared';

	let log = $state('');
	let native = $state(false);
	let german = $state(false);
	const GERMAN = {
		showLabel: 'Passwort anzeigen',
		hideLabel: 'Passwort verbergen',
		capsLockLabel: 'Feststelltaste ist an',
		metLabel: 'erfüllt',
		unmetLabel: 'nicht erfüllt',
		rulesSummary: (met: number, total: number) => `${met} von ${total} Anforderungen erfüllt`,
		strengthTitle: 'Passwortstärke',
		strengthLabels: ['Sehr schwach', 'Schwach', 'Mittel', 'Gut', 'Stark'] as [string, string, string, string, string]
	};
	let expired = $state(false);
	let score = $state<0 | 1 | 2 | 3 | 4>(0);

	const rules = [
		{ label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
		{ label: 'A number', test: (v: string) => /[0-9]/.test(v) }
	];

	/** A slow server call. "Password123456" is refused as too common. */
	async function reset({ password: next }: { password: string }): Promise<AuthResult<'password'> | void> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		if (next === 'Password123456') return { errors: { password: 'That password is too common. Choose another.' } };
		if (next === 'Failing-0123456') throw new Error('network down');
		if (next === 'Expired-0123456') {
			// The link ran out while the person typed. Returning nothing counts as success, but expired wins.
			expired = true;
			return;
		}
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
		onPasswordChange={(value) => (score = Math.min(4, Math.floor(value.length / 4)) as 0 | 1 | 2 | 3 | 4)}
		strength={score}
		{expired}
		signInHref="#reset-password-card"
		onContinue={() => (log = 'Continued to sign in')}
		forgotHref="#forgot-password-card"
		labels={german ? GERMAN : undefined}
	/>
	<p class="m-0 text-center text-[13px] text-fg-light">Last action: <span data-testid="reset-log">{log}</span></p>
	<label class="mx-auto flex items-center gap-2 text-xs text-fg-light"><input type="checkbox" bind:checked={expired} /> Show the expired-link state</label>
	<label class="mx-auto flex items-center gap-2 text-xs text-fg-light"><input type="checkbox" bind:checked={native} /> Post natively (no handler)</label>
	<label class="mx-auto flex items-center gap-2 text-xs text-fg-light"><input type="checkbox" bind:checked={german} /> Use German words for the password fields</label>
	<p class="m-0 text-center text-xs text-fg-light">Try Password123456 for a field error, Failing-0123456 for a failed request and Expired-0123456 for a link that expired.</p>
</div>
