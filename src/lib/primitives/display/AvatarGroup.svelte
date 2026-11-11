<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import Avatar, { type AvatarSize } from './Avatar.svelte';

	/** One person in an `AvatarGroup`. */
	export interface AvatarGroupItem {
		name: string;
		src?: string;
		alt?: string;
	}

	export interface Props extends Omit<HTMLAttributes<HTMLUListElement>, 'class' | 'children'> {
		items: AvatarGroupItem[];
		/** How many avatars to show before collapsing the rest into `+N`. */
		max?: number;
		size?: AvatarSize;
		shape?: 'round' | 'square';
		/** Spoken text for the hidden people. Defaults to "and 2 more: Ada, Grace". */
		formatOverflow?: (hidden: AvatarGroupItem[]) => string;
		class?: string;
	}

	let {
		items,
		max = 4,
		size = 'md',
		shape = 'round',
		formatOverflow = (hidden) => `and ${hidden.length} more: ${hidden.map((item) => item.alt ?? item.name).join(', ')}`,
		class: className = '',
		...rest
	}: Props = $props();

	const COUNT_SIZES: Record<AvatarSize, string> = {
		xs: 'size-5 text-[9px]',
		sm: 'size-6 text-[10px]',
		md: 'size-8 text-xs',
		lg: 'size-10 text-sm',
		xl: 'size-14 text-lg'
	};

	let limit = $derived(Math.max(0, Math.floor(max)));
	let shown = $derived(items.length > limit ? items.slice(0, limit) : items);
	let hidden = $derived(items.slice(shown.length));
	let radius = $derived(shape === 'round' ? 'rounded-full' : 'rounded-control');
</script>

<!-- svelte-ignore a11y_no_redundant_roles -->
<ul {...rest} role="list" class={cn('m-0 flex list-none items-center p-0', className)}>
	{#each shown as item, n (n)}
		<li class="-ml-2 flex first:ml-0">
			<Avatar name={item.name} src={item.src} alt={item.alt} {size} {shape} class="ring-2 ring-card-bg" />
		</li>
	{/each}
	{#if hidden.length > 0}
		<li class="-ml-2 flex">
			<span
				class={cn('inline-flex items-center justify-center bg-[color-mix(in_oklch,var(--ak-color-fg)_10%,var(--ak-color-surface))] font-semibold leading-none text-fg-main ring-2 ring-card-bg', COUNT_SIZES[size], radius)}
			>
				<span aria-hidden="true">+{hidden.length}</span>
				<span class="sr-only">{formatOverflow(hidden)}</span>
			</span>
		</li>
	{/if}
</ul>
