<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { User } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { AVATAR_TINTS, initialsFromName, toneIndexFromName } from './helpers';

	export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	export type AvatarStatus = 'online' | 'away' | 'busy' | 'offline';

	export interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children'> {
		/** Image URL. When it is missing or fails to load, the avatar shows the icon or initials instead. */
		src?: string;
		/** Display name. Gives the initials, the colour and the default accessible name. */
		name?: string;
		/** Accessible name when it differs from `name`. */
		alt?: string;
		/** Hides the avatar from assistive technology. Use it when the name is written out next to it. */
		decorative?: boolean;
		size?: AvatarSize;
		shape?: 'round' | 'square';
		/** Fallback icon, shown instead of initials. */
		icon?: Snippet;
		/** Presence dot. It is spoken as text, see `statusLabel`. */
		status?: AvatarStatus;
		/** Spoken text for the status. Defaults to the status word. */
		statusLabel?: string;
		class?: string;
	}

	let {
		src,
		name = '',
		alt,
		decorative = false,
		size = 'md',
		shape = 'round',
		icon,
		status,
		statusLabel,
		class: className = '',
		...rest
	}: Props = $props();

	const SIZES: Record<AvatarSize, string> = {
		xs: 'size-5 text-[9px] [&_svg]:size-3',
		sm: 'size-6 text-[10px] [&_svg]:size-3.5',
		md: 'size-8 text-xs [&_svg]:size-4',
		lg: 'size-10 text-sm [&_svg]:size-5',
		xl: 'size-14 text-lg [&_svg]:size-7'
	};
	const DOTS: Record<AvatarSize, string> = {
		xs: 'size-1.5',
		sm: 'size-2',
		md: 'size-2.5',
		lg: 'size-3',
		xl: 'size-3.5'
	};
	const STATUS_FILL: Record<AvatarStatus, string> = {
		online: 'bg-status-success',
		away: 'bg-status-warning',
		busy: 'bg-status-danger',
		offline: 'bg-fg-light'
	};

	let failedSrc = $state<string | null>(null);
	let img = $state<HTMLImageElement>();
	let showImage = $derived(Boolean(src) && failedSrc !== src);
	let label = $derived(alt ?? name);
	let initials = $derived(initialsFromName(name));
	let tint = $derived(AVATAR_TINTS[toneIndexFromName(name, AVATAR_TINTS.length)]);
	let radius = $derived(shape === 'round' ? 'rounded-full' : 'rounded-control');

	// An image that failed before hydration never reports it, so look at it once it is mounted.
	$effect(() => {
		if (img && src && img.complete && img.naturalWidth === 0) failedSrc = src;
	});
</script>

<span {...rest} class={cn('relative inline-flex shrink-0 align-middle', radius, SIZES[size], className)}>
	<span class={cn('relative flex size-full items-center justify-center overflow-hidden font-semibold leading-none text-fg-main', radius, tint)}>
		{#if icon}
			<span aria-hidden="true" class="inline-flex">{@render icon()}</span>
		{:else if initials}
			<span aria-hidden="true">{initials}</span>
		{:else}
			<User aria-hidden="true" />
		{/if}
		{#if showImage}
			<img
				bind:this={img}
				{src}
				alt={decorative ? '' : label}
				onerror={() => (failedSrc = src ?? null)}
				class="absolute inset-0 size-full bg-card-bg object-cover"
			/>
		{/if}
	</span>
	{#if !decorative && label && !showImage}
		<span class="sr-only">{label}</span>
	{/if}
	{#if status}
		<span aria-hidden="true" class={cn('absolute right-0 bottom-0 rounded-full ring-2 ring-card-bg', DOTS[size], STATUS_FILL[status])}></span>
		<span class="sr-only">{statusLabel ?? status}</span>
	{/if}
</span>
