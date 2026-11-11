<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ButtonSize, ButtonVariant } from '../../ui/styles';
	import { LoaderCircle } from '@lucide/svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { actionClass } from './shared';
	import { actionAttrs, isBlocked } from './state';

	export interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'type' | 'disabled' | 'aria-label'> {
		/** The accessible name. Required: an icon alone says nothing to a screen reader. */
		'aria-label': string;
		/** Also set `title` to the name, so pointer users get the browser's own hint. Default false. */
		showTitle?: boolean;
		variant?: ButtonVariant;
		size?: Extract<ButtonSize, 'icon-xs' | 'icon-sm' | 'icon'>;
		pill?: boolean;
		loading?: boolean;
		disabled?: boolean;
		href?: string;
		target?: string;
		rel?: string;
		type?: 'button' | 'submit' | 'reset';
		/** The icon. */
		children?: Snippet;
		/** The `<button>` or `<a>` element. Bindable. */
		ref?: HTMLElement | null;
		class?: string;
	}

	let {
		'aria-label': label,
		showTitle = false,
		variant = 'ghost',
		size = 'icon',
		pill = false,
		loading = false,
		disabled = false,
		href,
		target,
		rel,
		type = 'button',
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
	<span class={cn('inline-flex items-center justify-center', loading && 'opacity-0')}>{@render children?.()}</span>
	{#if loading}
		<span class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
			<LoaderCircle class="animate-spin motion-reduce:animate-none" />
		</span>
	{/if}
{/snippet}

{#if href !== undefined}
	<a {...rest as HTMLAnchorAttributes} bind:this={ref} {...attrs} {target} {rel} aria-label={label} title={showTitle ? label : undefined} onclick={guard} class={cn(actionClass(variant, size, pill), disabled && 'cursor-not-allowed opacity-50', loading && 'cursor-progress', className)}>
		{@render content()}
	</a>
{:else}
	<button {...rest} bind:this={ref} {...attrs} {type} aria-label={label} title={showTitle ? label : undefined} onclick={guard} class={cn(actionClass(variant, size, pill), loading && 'cursor-progress', className)}>
		{@render content()}
	</button>
{/if}
