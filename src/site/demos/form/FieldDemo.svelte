<script lang="ts">
	import { Checkbox, Field, Input } from '$lib/primitives/form';
	import { INPUT_CLASS } from '$lib/ui/styles';
	import DemoForm from './DemoForm.svelte';

	let email = $state('');
	let emailError = $state('');
	let topicsError = $state('');
	let runs = $state(true);
	let reviews = $state(false);

	function validate(): boolean {
		emailError = email.includes('@') ? '' : 'Enter an email address with an @, like you@company.com.';
		topicsError = runs || reviews ? '' : 'Pick at least one topic.';
		return !emailError && !topicsError;
	}
</script>

<DemoForm
	label="Notification settings"
	novalidate
	{validate}
	onreset={() => {
		emailError = '';
		topicsError = '';
	}}
	class="mx-auto w-full max-w-xl"
>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Work email" description="Sign-in links go here." error={emailError} required>
			<Input type="email" name="email" autocomplete="email" placeholder="you@company.com" bind:value={email} />
		</Field>
		<Field label="Display name" optional description="A plain input, wired through the snippet argument.">
			{#snippet children(control)}
				<input {...control} name="display" autocomplete="nickname" class={INPUT_CLASS} />
			{/snippet}
		</Field>
	</div>
	<Field label="Notify me about" group description="Choose one or both." error={topicsError}>
		<Checkbox name="topics" value="runs" label="Finished runs" bind:checked={runs} />
		<Checkbox name="topics" value="reviews" label="Review requests" bind:checked={reviews} />
	</Field>
	<Field label="Terms" description="A single checkbox keeps its own label as its name.">
		<Checkbox name="terms" label="I agree to the terms" />
	</Field>
</DemoForm>
