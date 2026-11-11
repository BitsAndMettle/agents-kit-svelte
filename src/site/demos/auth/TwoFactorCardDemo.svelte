<script lang="ts">
	import { TwoFactorCard, type TwoFactorValues } from '$lib/auth/signin';

	let result = $state('Nothing submitted yet.');
	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** A slow fake server: 000000 is wrong, 111111 makes the server fail. */
	async function verify(values: TwoFactorValues) {
		await wait(800);
		if (values.code === '000000') return { errors: { code: 'That code is not right.' } };
		if (values.code === '111111') throw new Error('upstream timeout at 10.0.0.4');
		result = `Verified with ${values.method === 'totp' ? 'an authentication' : 'a backup'} code ${values.code}${values.trustDevice ? ' (device trusted)' : ''}`;
	}
</script>

<div class="grid gap-6">
	<TwoFactorCard
		headingLevel={3}
		showTrustDevice
		onPasskey={async () => {
			await wait(500);
			result = 'Passkey requested';
		}}
		onBack={() => (result = 'Back to sign-in options')}
		onSubmit={verify}
	/>
	<p class="m-0 text-center text-[13px] text-fg-light" aria-live="polite" data-testid="twofactor-result">{result}</p>
</div>
