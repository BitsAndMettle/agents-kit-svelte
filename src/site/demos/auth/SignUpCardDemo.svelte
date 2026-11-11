<script lang="ts">
	import { Button } from '$lib/primitives/actions';
	import type { PasswordRule, PasswordStrength } from '$lib/auth/fields';
	import { SignUpCard, type SignUpCardLabels, type SignUpValues } from '$lib/auth/signin';

	let nameField = $state<'required' | 'optional' | 'hidden'>('optional');
	let confirmPassword = $state(true);
	let password = $state('');
	let result = $state('Nothing submitted yet.');
	let translated = $state(false);

	/** The words of the card's buttons and password parts, in another language, to show that every one can be replaced. */
	const spanish: Partial<SignUpCardLabels> = {
		optional: 'Opcional',
		provider: (label) => `Continuar con ${label}`,
		lastUsed: 'Último uso',
		passkey: 'Crear cuenta con una llave de acceso',
		showPassword: 'Mostrar contraseña',
		hidePassword: 'Ocultar contraseña',
		capsLock: 'Bloq Mayús está activado',
		ruleMet: 'cumple',
		ruleUnmet: 'no cumple',
		rulesSummary: (met, total) => `${met} de ${total} requisitos cumplidos`,
		strengthTitle: 'Seguridad de la contraseña',
		strengthLabels: ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte']
	};

	const rules: PasswordRule[] = [
		{ label: 'At least 10 characters', test: (v) => v.length >= 10 },
		{ label: 'A number', test: (v) => /\d/.test(v) },
		{ label: 'A capital letter', test: (v) => /[A-Z]/.test(v) }
	];
	const strength = $derived<PasswordStrength>(Math.min(4, rules.filter((r) => r.test(password)).length + (password.length >= 16 ? 1 : 0)) as PasswordStrength);
	const providers = [{ id: 'github', label: 'GitHub' }];

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	/** A slow fake server: one address is refused. */
	async function signUp(values: SignUpValues) {
		await wait(800);
		if (values.email === 'taken@example.com') return { errors: { email: 'Use a different email address.' } };
		result = `Account created for ${values.email}${values.name ? ` (${values.name})` : ''}`;
	}
</script>

<div class="grid gap-6">
	<div class="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Options">
		{#each ['required', 'optional', 'hidden'] as const as option (option)}
			<Button size="sm" variant={nameField === option ? 'primary' : 'secondary'} aria-pressed={nameField === option} onclick={() => (nameField = option)}>Name {option}</Button>
		{/each}
		<Button size="sm" variant={confirmPassword ? 'primary' : 'secondary'} aria-pressed={confirmPassword} onclick={() => (confirmPassword = !confirmPassword)}>Confirm password</Button>
		<Button size="sm" variant={translated ? 'primary' : 'secondary'} aria-pressed={translated} onclick={() => (translated = !translated)}>Other language</Button>
	</div>
	<SignUpCard
		headingLevel={3}
		description="Try taken@example.com to see a field error."
		{nameField}
		labels={translated ? spanish : undefined}
		{confirmPassword}
		{rules}
		{strength}
		minlength={10}
		onPasskey={async () => {
			await wait(500);
			result = 'Passkey requested';
		}}
		onPasswordChange={(value) => (password = value)}
		{providers}
		signInHref="https://example.com/sign-in"
		onSubmit={signUp}
	>
		{#snippet terms()}I agree to the <a href="https://example.com/terms" class="underline underline-offset-2">Terms</a> and the <a href="https://example.com/privacy" class="underline underline-offset-2">Privacy Policy</a>{/snippet}
	</SignUpCard>
	<p class="m-0 text-center text-[13px] text-fg-light" aria-live="polite" data-testid="signup-result">{result}</p>
</div>
