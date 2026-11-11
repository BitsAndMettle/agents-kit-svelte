<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { badgeClass, TONE_FILL_CLASS, type UiTone } from '../../ui/styles';
	import { OUTLINE_TONE_CLASS, READABLE_TONE_TEXT, SOLID_TONE_CLASS } from './helpers';

	export type BadgeVariant = 'soft' | 'solid' | 'outline';
	export type BadgeSize = 'sm' | 'md' | 'lg';

	export interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children'> {
		/** Semantic tone. */
		tone?: UiTone;
		/** `soft` tints the background, `solid` fills it, `outline` draws a border only. */
		variant?: BadgeVariant;
		size?: BadgeSize;
		/** Shows a small status dot before the label. */
		dot?: boolean;
		/** Optional leading icon. Keep it decorative. */
		icon?: Snippet;
		children?: Snippet;
		class?: string;
	}

	let {
		tone = 'neutral',
		variant = 'soft',
		size = 'md',
		dot = false,
		icon,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	let look = $derived(
		variant === 'solid'
			? SOLID_TONE_CLASS[tone]
			: `${variant === 'outline' ? OUTLINE_TONE_CLASS[tone] : ''} ${READABLE_TONE_TEXT[tone]}`
	);
</script>

<span {...rest}
	class={cn(badgeClass(tone), look, size === 'lg' && 'px-2.5 py-0.5 text-xs [&_svg]:size-3.5', size === 'sm' && 'px-1.5 text-[10px] [&_svg]:size-2.5', className)}
>
	{#if dot}
		<span aria-hidden="true" class={cn('size-1.5 shrink-0 rounded-full', variant === 'solid' ? 'bg-current' : TONE_FILL_CLASS[tone])}></span>
	{/if}
	{#if icon}{@render icon()}{/if}
	{@render children?.()}
</span>
