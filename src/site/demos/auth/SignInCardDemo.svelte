<script lang="ts">
	import { Building2 } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { SignInCard, type SignInValues } from '$lib/auth/signin';

	let method = $state<'password' | 'magic-link'>('password');
	let result = $state('Nothing submitted yet.');
	let lastProvider = $state('github');
	let calls = $state(0);

	const providers = [
		{ id: 'github', label: 'GitHub' },
		{ id: 'sso', label: 'single sign-on', icon: Building2 }
	];

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** A slow fake server: one address is locked, one password is wrong, one makes the server fail. */
	async function signIn(values: SignInValues) {
		calls += 1;
		await wait(800);
		if (values.email === 'locked@example.com') return { error: 'This account is locked. Try again in 15 minutes.' };
		if (values.password === 'wrong') return { errors: { password: 'That password is not right.' } };
		if (values.password === 'boom') throw new Error('database password is hunter2');
		result = values.password === undefined ? `Link requested for ${values.email}` : `Signed in as ${values.email}${values.remember ? ' (remembered)' : ''}`;
	}
</script>

<div class="grid gap-6">
	<div class="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Sign-in method">
		<Button size="sm" variant={method === 'password' ? 'primary' : 'secondary'} aria-pressed={method === 'password'} onclick={() => (method = 'password')}>Password</Button>
		<Button size="sm" variant={method === 'magic-link' ? 'primary' : 'secondary'} aria-pressed={method === 'magic-link'} onclick={() => (method = 'magic-link')}>Email link</Button>
	</div>
	<SignInCard
		headingLevel={3}
		description="Try locked@example.com, or the password wrong or boom."
		{method}
		{providers}
		lastUsedProvider={lastProvider}
		onProvider={(id) => {
			lastProvider = id;
			result = `Provider chosen: ${id}`;
		}}
		onPasskey={async () => {
			await wait(500);
			result = 'Passkey requested';
		}}
		forgotHref="https://example.com/forgot"
		showRemember
		signUpHref="https://example.com/sign-up"
		onSubmit={signIn}
	/>
	<p class="m-0 text-center text-[13px] text-fg-light" aria-live="polite" data-testid="signin-result">{result}</p>
	<p class="m-0 text-center text-xs text-fg-light">Submit calls: <span data-testid="signin-calls">{calls}</span></p>
	<SignInCard
		headingLevel={3}
		title="Native post"
		description="No onSubmit: the form posts to its action, with no JavaScript needed."
		action="/auth-demo/sign-in"
		hidden={{ next: '/dashboard' }}
		forgotHref="https://example.com/forgot"
		data-testid="signin-native"
	/>
</div>
