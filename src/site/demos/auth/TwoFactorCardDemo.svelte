<script lang="ts">
	import { Button } from '$lib/primitives/actions';
	import { TwoFactorCard, type TwoFactorCardLabels, type TwoFactorValues } from '$lib/auth/signin';

	let result = $state('Nothing submitted yet.');
	let translated = $state(false);
	/** Errors a server action would hand back as props. A new object each time, as a new response is. */
	let flagged = $state.raw<{ code: string }>({ code: 'The server did not accept that code.' });

	const spanish: Partial<TwoFactorCardLabels> = { passkey: 'Entrar con una llave de acceso' };
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
	<div class="flex justify-center">
		<Button size="sm" variant={translated ? 'primary' : 'secondary'} aria-pressed={translated} onclick={() => (translated = !translated)}>Other language</Button>
	</div>
	<TwoFactorCard
		headingLevel={3}
		labels={translated ? spanish : undefined}
		showTrustDevice
		onPasskey={async () => {
			await wait(500);
			result = 'Passkey requested';
		}}
		onBack={() => (result = 'Back to sign-in options')}
		onSubmit={verify}
		data-testid="twofactor-main"
	/>
	<p class="m-0 text-center text-[13px] text-fg-light" aria-live="polite" data-testid="twofactor-result">{result}</p>
	<TwoFactorCard
		headingLevel={3}
		title="Server-flagged code"
		description="The error comes in as a prop, like a server action's."
		errors={flagged}
		data-testid="twofactor-prop"
	/>
	<div class="flex justify-center">
		<Button size="sm" variant="secondary" onclick={() => (flagged = { code: 'The server did not accept that code.' })}>Flag the code again</Button>
	</div>
</div>
