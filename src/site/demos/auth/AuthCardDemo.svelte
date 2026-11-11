<script lang="ts">
	import { Sparkles } from '@lucide/svelte';
	import { Button } from '$lib/primitives/actions';
	import { Separator } from '$lib/primitives/display';
	import { Field, Input } from '$lib/primitives/form';
	import { AuthCard, PasswordInput, ProviderButton } from '$lib/auth/fields';
	import type { AuthProvider } from '$lib/auth/shared';

	const github: AuthProvider = { id: 'github', label: 'GitHub', icon: Sparkles };
	let picked = $state('');
</script>

<AuthCard title="Welcome back" description="Sign in to continue to your workspace." headingLevel={3}>
	{#snippet logo()}<Sparkles aria-hidden="true" />{/snippet}
	<ProviderButton provider={github} onProvider={(id) => {
			picked = id;
		}} />
	<Separator label="or" />
	<form method="post" class="grid gap-4" onsubmit={(event) => event.preventDefault()}>
		<Field label="Email">
			<Input name="email" type="email" autocomplete="username" required />
		</Field>
		<Field label="Password">
			<PasswordInput required />
		</Field>
		<Button type="submit" variant="primary" size="lg" class="w-full">Sign in</Button>
	</form>
	<output class="text-center text-xs text-fg-light">{picked ? `Provider chosen: ${picked}` : ''}</output>
	{#snippet footer()}No account? <a href="#auth-card" class="font-medium text-fg-main underline underline-offset-2">Sign up</a>{/snippet}
</AuthCard>
