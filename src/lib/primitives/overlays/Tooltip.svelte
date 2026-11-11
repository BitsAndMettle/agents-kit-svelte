<!--
	@component
	A short description shown on hover and keyboard focus, over the headless `Tooltip`: it opens
	after a delay (instantly while another tooltip was just open), never takes focus, closes
	first on Escape and never closes an open popover or menu. Spread the trigger part onto any
	focusable element.

	Disabled buttons get no pointer or focus events, so a tooltip on one never shows. Wrap the
	button in `<span tabindex="0">` and spread the part on the span instead.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Part } from '../../headless/runtime/parts';
	import type { OverlayPlacement } from '../placement';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'content' | 'role'> {
		/** The text, or a snippet for short rich content (no interactive elements). */
		content: string | Snippet;
		/** Renders the element it describes; spread the part onto it. Must be focusable. */
		trigger: Snippet<[Part]>;
		/** `'top'` (default), `'bottom-start'`, … or a full placement object. */
		placement?: OverlayPlacement;
		/** Show an arrow pointing at the trigger. Default true. */
		arrow?: boolean;
		/** ms before it opens on hover or focus. Default 600. */
		delay?: number;
		/** ms after a tooltip closes during which the next one opens at once. Default 300. */
		skipDelay?: number;
		/** Never open. */
		disabled?: boolean;
		/** The tooltip surface. Bindable. */
		ref?: HTMLDivElement | null;
		class?: string;
	}
</script>

<script lang="ts">
	import { Tooltip as HeadlessTooltip } from '../../headless/patterns/tooltip.svelte';
	import { cn } from '../../ui/cn';
	import { ARROW_GAP, FLOAT_MOTION, followAnchor, tipArrowClass, TOOLTIP_SURFACE } from './overlay';
	import { toPlacement } from '../placement';

	let {
		content,
		trigger,
		placement,
		arrow = true,
		delay,
		skipDelay,
		disabled = false,
		ref = $bindable(null),
		class: className = '',
		...rest
	}: Props = $props();

	const resolved = $derived(toPlacement(placement, { side: 'top', align: 'center', offset: 6 }, arrow ? ARROW_GAP - 1 : 0));

	/** While shown, the trigger is described by the surface; its centre is where the arrow points. */
	const findTrigger = (surface: HTMLElement) => document.querySelector(`[aria-describedby~="${CSS.escape(surface.id)}"]`);

	const id = $props.id();
	const tip = new HeadlessTooltip({
		id,
		placement: () => resolved,
		get delay() {
			return delay;
		},
		get skipDelay() {
			return skipDelay;
		},
		disabled: () => disabled
	});
</script>

{@render trigger(tip.trigger)}

<div {...rest}
	bind:this={ref}
	{...tip.content}
	class={cn(TOOLTIP_SURFACE, FLOAT_MOTION, 'data-instant:transition-none', className)}
>
	{#if arrow}
		<span
			aria-hidden="true"
			data-side={tip.side ?? resolved.side}
			class={tipArrowClass(resolved.align)}
			{@attach followAnchor(findTrigger, 6)}
		></span>
	{/if}
	{#if typeof content === 'string'}
		{content}
	{:else}
		{@render content()}
	{/if}
</div>
