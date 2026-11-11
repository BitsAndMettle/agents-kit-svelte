<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { KeyRound, LoaderCircle } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { actionClass } from '../../primitives/actions/shared';
	import { actionAttrs, isBlocked } from '../../primitives/actions/state';

	export interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'type' | 'onclick' | 'disabled'> {
		/** Called when the person asks to use a passkey. Run your own WebAuthn here; the kit never does. May return a promise: the button shows loading until it settles. */
		onPasskey?: () => void | Promise<unknown>;
		/** The button text. */
		label?: string;
		/** Shows a spinner and ignores presses (the button keeps its name). Overrides the handler's own pending state. */
		loading?: boolean;
		disabled?: boolean;
		/** What to do when the browser has no passkey support: hide the button (`true`, the default) or show it disabled. The server render always shows it, because support can only be known in the browser. Before the page hydrates it is a plain `type="button"` that does nothing, and in an unsupported browser hiding it then moves what is below it; pass `false` for a layout that never shifts. */
		hideWhenUnsupported?: boolean;
		fullWidth?: boolean;
		size?: 'sm' | 'md' | 'lg';
		/** The `<button>` element. Bindable. */
		ref?: HTMLElement | null;
		class?: string;
	}

	let {
		onPasskey,
		label = 'Sign in with a passkey',
		loading,
		disabled = false,
		hideWhenUnsupported = true,
		fullWidth = true,
		size = 'lg',
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	let running = $state(false);
	/** Unknown until mounted, so the server render (and hydration) shows the button. */
	let supported = $state<boolean | undefined>(undefined);
	const isLoading = $derived(loading ?? running);
	const hidden = $derived(supported === false && hideWhenUnsupported);
	const isDisabled = $derived(disabled || (supported === false && !hideWhenUnsupported));
	const attrs = $derived(actionAttrs({ disabled: isDisabled, loading: isLoading, href: undefined }));

	$effect(() => {
		supported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
	});

	async function press(event: MouseEvent): Promise<void> {
		if (isBlocked({ disabled: isDisabled, loading: isLoading })) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		try {
			running = true;
			await onPasskey?.();
		} finally {
			running = false;
		}
	}
</script>

<button {...rest} bind:this={ref} {...attrs} type="button" hidden={hidden || undefined} onclick={press} class={cn(actionClass('secondary', size, false), fullWidth && 'w-full', isLoading && 'cursor-progress', hidden && 'hidden', className)}>
	<span class={cn('inline-flex min-w-0 items-center justify-center gap-[inherit]', isLoading && 'opacity-0')}>
		<KeyRound aria-hidden="true" />
		<span class="truncate">{label}</span>
	</span>
	{#if isLoading}
		<span class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
			<LoaderCircle class="animate-spin motion-reduce:animate-none" />
		</span>
	{/if}
</button>
