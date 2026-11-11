<script lang="ts">
	import { Field } from '$lib/primitives/form';
	import { OtpInput } from '$lib/auth/fields';
	import DemoForm from '../form/DemoForm.svelte';

	let code = $state('');
	let completed = $state('');
	// Values that arrive from your app are cleaned like typed text: "123 456" and a seven-digit string both fit six cells.
	let loaded = $state('1234567');
	let wrong = $derived(code.length === 6 && code === '000000');
</script>

<DemoForm label="One-time code" class="mx-auto w-full max-w-sm">
	<Field label="Verification code" description="Six digits. Paste works, and so does 123-456." error={wrong ? 'That code is not right. Try again.' : undefined} required>
		<OtpInput bind:value={code} groupSize={3} onComplete={(c) => (completed = c)} />
	</Field>
	<Field label="Backup code" description="Eight letters or digits. Submits the form when complete.">
		<OtpInput name="backup" length={8} alphanumeric groupSize={4} size="sm" autoSubmit />
	</Field>
	<Field label="Saved code" description="Starts as 123 456 and is cleaned to 123456.">
		<OtpInput name="saved" defaultValue="123 456" autoSubmit size="sm" />
	</Field>
	<Field label="Loaded code" description="A bound value of seven digits is cut to six.">
		<OtpInput name="loaded" bind:value={loaded} autoSubmit size="sm" />
	</Field>
	<p class="m-0 text-xs text-fg-light" aria-live="polite">{completed ? `Complete: ${completed}` : 'Type a code to see it complete.'}</p>
</DemoForm>
