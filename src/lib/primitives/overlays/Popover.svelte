<!--
	@component
	A non-modal floating card anchored to its trigger, over the headless `Popover`: it sits in
	the top layer (no portal), flips to stay in view, and closes on Escape, an outside press or
	when focus leaves it. Optional arrow pointing at the trigger; the width can match the
	trigger's.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { FocusTarget } from '../../headless/runtime/layers.svelte';
	import type { ChangeReason, Part } from '../../headless/runtime/parts';
	import type { OverlayPlacement } from '../placement';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title' | 'role'> {
		/** Whether it is open. Bindable. */
		open?: boolean;
		/** Whether it starts open when `open` is not bound. */
		defaultOpen?: boolean;
		/** The floating surface element. Bindable. */
		ref?: HTMLDivElement | null;
		/** `'bottom'` (default), `'top-start'`, … or a full placement object. */
		placement?: OverlayPlacement;
		/** Show an arrow pointing at the trigger. */
		arrow?: boolean;
		/** At least as wide as the trigger. */
		matchWidth?: boolean;
		/** Visible heading that names the popover. Without it, pass `aria-label`. */
		title?: string;
		/** Wired to `aria-describedby` while rendered. */
		description?: string;
		/** Renders the opener; spread the part onto a `<button>`. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		children?: Snippet;
		/** Where focus goes on open. Default: an `[autofocus]` element inside, else the card itself. */
		initialFocus?: FocusTarget;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		class?: string;
	}
</script>

<script lang="ts">
	import { Popover } from '../../headless/patterns/popover.svelte';
	import { cn } from '../../ui/cn';
	import { ARROW_GAP, cardArrowClass, FLOAT_MOTION, followAnchor, POPOVER_SURFACE } from './overlay';
	import { toPlacement } from '../placement';

	let {
		defaultOpen = false,
		open = $bindable(defaultOpen),
		ref = $bindable(null),
		placement,
		arrow = false,
		matchWidth = false,
		title,
		description,
		trigger,
		children,
		initialFocus,
		onOpenChange,
		class: className = '',
		...rest
	}: Props = $props();

	const resolved = $derived({
		...toPlacement(placement, { side: 'bottom', align: 'center', offset: 6 }, arrow ? ARROW_GAP : 0),
		matchWidth
	});

	/** The trigger points at the surface with aria-controls; its centre is where the arrow points. */
	const findTrigger = (surface: HTMLElement) => document.querySelector(`[aria-controls="${CSS.escape(surface.id)}"]`);

	const id = $props.id();
	const popover = new Popover({
		id,
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		placement: () => resolved,
		get initialFocus() {
			return initialFocus;
		}
	});
</script>

{@render trigger?.(popover.trigger)}

<div {...rest}
	bind:this={ref}
	{...popover.content}
	class={cn(POPOVER_SURFACE, matchWidth && 'min-w-(--ak-anchor-width)', FLOAT_MOTION, className)}
>
	{#if arrow}
		<span
			aria-hidden="true"
			data-side={popover.side ?? resolved.side}
			class={cardArrowClass(resolved.align)}
			{@attach followAnchor(findTrigger, 12)}
		></span>
	{/if}
	{#if title}
		<p {...popover.title} class="text-[13px] font-semibold text-fg-main">{title}</p>
	{/if}
	{#if description}
		<p {...popover.description} class="mt-0.5 text-xs leading-5 text-fg-light">{description}</p>
	{/if}
	{#if children}
		<div class={cn((title || description) && 'mt-2')}>{@render children()}</div>
	{/if}
</div>
