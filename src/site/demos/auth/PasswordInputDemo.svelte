<script lang="ts">
	import { Field } from '$lib/primitives/form';
	import { PasswordInput, type PasswordRule, type PasswordStrength } from '$lib/auth/fields';
	import DemoForm from '../form/DemoForm.svelte';

	const rules: PasswordRule[] = [
		{ label: 'At least 10 characters', test: (v) => v.length >= 10 },
		{ label: 'A number', test: (v) => /\d/.test(v) },
		{ label: 'A capital letter', test: (v) => /[A-Z]/.test(v) }
	];

	let fresh = $state('');
	const strength = $derived<PasswordStrength>(Math.min(4, rules.filter((r) => r.test(fresh)).length + (fresh.length >= 16 ? 1 : 0)) as PasswordStrength);
</script>

<DemoForm label="Password fields" class="mx-auto w-full max-w-sm">
	<Field label="Password" description="Press the eye to reveal it.">
		<PasswordInput defaultValue="hunter2-demo" />
	</Field>
	<Field label="New password" required>
		<PasswordInput name="newPassword" autocomplete="new-password" minlength={10} bind:value={fresh} {rules} {strength} />
	</Field>
</DemoForm>
