<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { LoaderCircle } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { actionClass } from '../../primitives/actions/shared';
	import { actionAttrs, isBlocked } from '../../primitives/actions/state';
	import { Badge } from '../../primitives/display';
	import type { AuthProvider } from '../shared/types';

	export interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'type' | 'onclick' | 'disabled'> {
		/** The provider: `id` (passed to `onProvider`), `label`, your `icon`, and `href` for a link. */
		provider: AuthProvider;
		/** Called with the provider's `id` when the button is pressed. May return a promise: the button shows loading until it settles. Not used when the provider has an `href`. */
		onProvider?: (id: string) => void | Promise<unknown>;
		/** The button text for a provider. */
		formatLabel?: (provider: AuthProvider) => string;
		/** Shows a spinner and ignores presses (the button keeps its name). Overrides the handler's own pending state. */
		loading?: boolean;
		/** Your logo as a snippet; wins over `provider.icon`. Decorative. */
		icon?: Snippet;
		/** Marks this provider as the one the person used last. */
		lastUsed?: boolean;
		/** Text of the "last used" badge. */
		lastUsedLabel?: string;
		disabled?: boolean;
		/** Stretches to the full width of its container. */
		fullWidth?: boolean;
		size?: 'sm' | 'md' | 'lg';
		/** The `<button>` or `<a>` element. Bindable. */
		ref?: HTMLElement | null;
		class?: string;
	}

	let {
		provider,
		onProvider,
		formatLabel = (p: AuthProvider) => `Continue with ${p.label}`,
		loading,
		icon,
		lastUsed = false,
		lastUsedLabel = 'Last used',
		disabled,
		fullWidth = true,
		size = 'lg',
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	let running = $state(false);
	const isLoading = $derived(loading ?? running);
	const isDisabled = $derived(Boolean(disabled ?? provider.disabled));
	const attrs = $derived(actionAttrs({ disabled: isDisabled, loading: isLoading, href: provider.href }));
	const Icon = $derived(provider.icon);

	async function press(event: MouseEvent): Promise<void> {
		if (isBlocked({ disabled: isDisabled, loading: isLoading })) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if (provider.href !== undefined) return;
		try {
			running = true;
			await onProvider?.(provider.id);
		} finally {
			running = false;
		}
	}

	const LOOK = $derived(cn(actionClass('secondary', size, false), fullWidth && 'w-full', isDisabled && 'cursor-not-allowed opacity-50', isLoading && 'cursor-progress'));
</script>

{#snippet content()}
	<span class={cn('inline-flex min-w-0 items-center justify-center gap-[inherit]', isLoading && 'opacity-0')}>
		{#if icon}
			<span aria-hidden="true" class="inline-flex shrink-0 items-center [&_svg]:size-4">{@render icon()}</span>
		{:else if Icon}
			<span aria-hidden="true" class="inline-flex shrink-0 items-center [&_svg]:size-4"><Icon /></span>
		{/if}
		<span class="truncate">{formatLabel(provider)}</span>
		{#if lastUsed}
			<Badge size="sm" tone="accent">{lastUsedLabel}</Badge>
		{/if}
	</span>
	{#if isLoading}
		<span class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
			<LoaderCircle class="animate-spin motion-reduce:animate-none" />
		</span>
	{/if}
{/snippet}

{#if provider.href !== undefined}
	<a {...rest as Record<string, unknown>} bind:this={ref} {...attrs} data-provider={provider.id} onclick={press} class={cn(LOOK, className)}>
		{@render content()}
	</a>
{:else}
	<button {...rest} bind:this={ref} {...attrs} type="button" data-provider={provider.id} onclick={press} class={cn(LOOK, className)}>
		{@render content()}
	</button>
{/if}
