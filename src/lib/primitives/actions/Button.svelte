<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ButtonSize, ButtonVariant } from '../../ui/styles';
	import { LoaderCircle } from '@lucide/svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { actionClass } from './shared';
	import { actionAttrs, isBlocked } from './state';

	export interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'type' | 'disabled'> {
		variant?: ButtonVariant;
		/** `xs`, `sm`, `md` or `lg`. */
		size?: Extract<ButtonSize, 'xs' | 'sm' | 'md' | 'lg'>;
		/** The softer chat-style pill instead of the standard button. */
		pill?: boolean;
		/** Shows a spinner, sets `aria-busy` and ignores activation, but stays focusable. */
		loading?: boolean;
		disabled?: boolean;
		/** Renders an `<a>` instead of a `<button>`. */
		href?: string;
		target?: string;
		rel?: string;
		download?: string | boolean;
		type?: 'button' | 'submit' | 'reset';
		/** Content before the label (an icon). */
		leading?: Snippet;
		/** Content after the label (an icon). */
		trailing?: Snippet;
		children?: Snippet;
		/** The `<button>` or `<a>` element. Bindable. */
		ref?: HTMLElement | null;
		class?: string;
	}

	let {
		variant = 'secondary',
		size = 'md',
		pill = false,
		loading = false,
		disabled = false,
		href,
		target,
		rel,
		download,
		type = 'button',
		leading,
		trailing,
		children,
		ref = $bindable(null),
		onclick,
		class: className = '',
		...rest
	}: Props = $props();

	let attrs = $derived(actionAttrs({ disabled, loading, href }));

	/** Loading blocks activation, and with it form submission (a click's default action). */
	function guard(event: MouseEvent): void {
		if (isBlocked({ disabled, loading })) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		(onclick as ((e: MouseEvent) => void) | null | undefined)?.(event);
	}
</script>

{#snippet content()}
	<span class={cn('inline-flex items-center justify-center gap-[inherit]', loading && 'opacity-0')}>
		{@render leading?.()}
		{@render children?.()}
		{@render trailing?.()}
	</span>
	{#if loading}
		<span class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
			<LoaderCircle class="animate-spin motion-reduce:animate-none" />
		</span>
	{/if}
{/snippet}

{#if href !== undefined}
	<a {...rest as HTMLAnchorAttributes} bind:this={ref} {...attrs} {target} {rel} {download} onclick={guard} class={cn(actionClass(variant, size, pill), disabled && 'cursor-not-allowed opacity-50', loading && 'cursor-progress', className)}>
		{@render content()}
	</a>
{:else}
	<button {...rest} bind:this={ref} {...attrs} {type} onclick={guard} class={cn(actionClass(variant, size, pill), loading && 'cursor-progress', className)}>
		{@render content()}
	</button>
{/if}
