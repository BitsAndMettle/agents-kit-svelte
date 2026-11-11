<script lang="ts">
	import type { Snippet } from 'svelte';
	import { buttonClass } from '$lib/ui/styles';

	/** A real `<form>` for the form-control demos: shows what a submit posts and offers a reset. */
	interface Props {
		/** Accessible name of the form. */
		label: string;
		/** Skip the browser's own validation (the demo validates itself). */
		novalidate?: boolean;
		/** Return false to stop the submit (e.g. after showing errors). */
		validate?: (form: HTMLFormElement) => boolean;
		onreset?: () => void;
		class?: string;
		children: Snippet;
	}

	let { label, novalidate = false, validate, onreset, class: className = '', children }: Props = $props();

	let sent = $state('');

	function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }): void {
		event.preventDefault();
		if (validate && !validate(event.currentTarget)) {
			sent = '';
			return;
		}
		const pairs = [...new FormData(event.currentTarget)].map(([key, value]) => `${key}=${String(value)}`);
		sent = pairs.join(', ') || 'nothing';
	}
</script>

<form
	aria-label={label}
	{novalidate}
	onsubmit={submit}
	onreset={() => {
		sent = '';
		onreset?.();
	}}
	class={['grid gap-4', className]}
>
	{@render children()}
	<div class="flex flex-wrap items-center gap-2 border-t border-canvas-border pt-3">
		<button type="submit" class={buttonClass('primary', 'sm')}>Submit</button>
		<button type="reset" class={buttonClass('ghost', 'sm')}>Reset</button>
		<output class="min-w-0 break-all text-xs text-fg-light">{sent ? `Sent: ${sent}` : ''}</output>
	</div>
</form>
