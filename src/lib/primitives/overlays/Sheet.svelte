<!--
	@component
	A modal panel that slides in from an edge of the screen, over the headless `Dialog`: full
	height on the left and right, full width on the top and bottom, clear of a phone's safe-area
	insets. Behaves like Dialog (Escape, backdrop press, focus trap and return). Bottom sheets
	show a drag handle (visual only). Supports Dialog's route mode: `closeHref`, `ssrOpen`
	and `returnFocus`.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import type { FocusTarget } from '../../headless/runtime/layers.svelte';
	import type { ChangeReason, Dismiss, Part } from '../../headless/runtime/parts';
	import type { SheetSide } from './overlay';
	import type { DialogReturnFocus } from './Dialog.svelte';

	export interface Props extends Omit<HTMLDialogAttributes, 'class' | 'children' | 'open' | 'title' | 'role'> {
		/** Whether it is open. Bindable. */
		open?: boolean;
		/** Whether it starts open when `open` is not bound. */
		defaultOpen?: boolean;
		/** The `<dialog>` element. Bindable. */
		ref?: HTMLDialogElement | null;
		/** The edge it slides from. Default `right`. */
		side?: SheetSide;
		/** Names the sheet (wired to `aria-labelledby`). */
		title: string;
		/** Describes it (wired to `aria-describedby` while rendered). */
		description?: string;
		/** Renders the opener; spread the part onto a `<button>`. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		/** Extra header content under the title and description. */
		header?: Snippet;
		/** The scrolling body. */
		children?: Snippet;
		/** Actions; receives a function that closes the sheet. */
		footer?: Snippet<[close: () => void]>;
		/** Show the corner close button. Default true. */
		showClose?: boolean;
		closeLabel?: string;
		/** Where focus goes on open; see Dialog. */
		initialFocus?: FocusTarget;
		/** Dismissal policy; function forms can veto. */
		dismiss?: Dismiss;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Route mode, as on Dialog: the close button links here, and Escape and a backdrop press follow it. */
		closeHref?: string;
		/** As on Dialog: server-rendered open when `open` is true, a real modal on mount. */
		ssrOpen?: boolean;
		/** As on Dialog: where focus goes after it closes. */
		returnFocus?: DialogReturnFocus;
		class?: string;
	}
</script>

<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Dialog } from '../../headless/patterns/dialog.svelte';
	import { followLink, NOT_MODAL, upgradeServerOpen } from './Dialog.svelte';
	import { cn } from '../../ui/cn';
	import { buttonClass } from '../../ui/styles';
	import {
		BACKDROP,
		MODAL_BODY,
		MODAL_DESCRIPTION,
		MODAL_FOOTER,
		MODAL_HEADER,
		MODAL_SURFACE,
		MODAL_TITLE,
		SLIDE_MOTION
	} from './overlay';

	let {
		defaultOpen = false,
		open = $bindable(defaultOpen),
		ref = $bindable(null),
		side = 'right',
		title,
		description,
		trigger,
		header,
		children,
		footer,
		showClose = true,
		closeLabel = 'Close',
		initialFocus,
		dismiss,
		onOpenChange,
		closeHref,
		ssrOpen = false,
		returnFocus,
		class: className = '',
		...rest
	}: Props = $props();

	const id = $props.id();
	const dialog = new Dialog({
		id,
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
			if (!next && closeHref !== undefined && (reason === 'escape' || reason === 'outside')) followLink(ref, closeHref);
		},
		get initialFocus() {
			return initialFocus;
		},
		get dismiss() {
			return dismiss;
		}
	});

	const close = () => {
		dialog.open = false;
	};

	let hydrated = $state(false);
	$effect(() => {
		hydrated = true;
	});
	/** The `open` attribute of a server-rendered route: written on the server only. */
	const serverOpen = $derived(typeof document === 'undefined' && ssrOpen && open ? { open: true } : {});
	const shownState = $derived(ssrOpen && open && !hydrated ? 'open' : dialog.state);
	const upgrade = upgradeServerOpen(() => returnFocus);

	/** Edge placement, size, the rounded inner edge and the safe-area insets of the edges it touches. */
	const SIDES: Record<SheetSide, string> = {
		right: 'my-0 mr-0 ml-auto h-dvh w-[min(24rem,100vw)] rounded-l-card border-y-0 border-r-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]',
		left: 'my-0 ml-0 mr-auto h-dvh w-[min(24rem,100vw)] rounded-r-card border-y-0 border-l-0 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)]',
		bottom: 'mx-0 mb-0 mt-auto max-h-[85dvh] w-dvw rounded-t-window border-x-0 border-b-0 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)]',
		top: 'mx-0 mt-0 mb-auto max-h-[85dvh] w-dvw rounded-b-window border-x-0 border-t-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]'
	};

	/** The close button clears the insets of the edges the sheet touches. */
	const CLOSE_POSITION: Record<SheetSide, string> = {
		right: 'absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-[calc(0.75rem+env(safe-area-inset-right))]',
		left: 'absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3',
		bottom: 'absolute top-5 right-[calc(0.75rem+env(safe-area-inset-right))]',
		top: 'absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-[calc(0.75rem+env(safe-area-inset-right))]'
	};
</script>

{@render trigger?.(dialog.trigger)}

<dialog {...rest} bind:this={ref} {...serverOpen} {@attach upgrade} {...dialog.content} data-state={shownState} aria-labelledby={dialog.content['aria-labelledby'] ?? (ssrOpen ? dialog.title.id : undefined)} data-side={side} class={cn(MODAL_SURFACE, SIDES[side], ssrOpen && NOT_MODAL, ssrOpen && (side === 'top' || side === 'bottom') && '[&:not(:modal)]:h-fit', SLIDE_MOTION[side], BACKDROP, className)}>
	{#if side === 'bottom'}
		<div aria-hidden="true" class="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-card-border"></div>
	{/if}
	<div class={cn(MODAL_HEADER, side === 'bottom' && 'pt-3')}>
		<h2 {...dialog.title} class={MODAL_TITLE}>{title}</h2>
		{#if description}
			<p {...dialog.description} class={MODAL_DESCRIPTION}>{description}</p>
		{/if}
		{@render header?.()}
	</div>
	{#if children}
		<div class={MODAL_BODY}>{@render children()}</div>
	{/if}
	{#if footer}
		<div class={MODAL_FOOTER}>{@render footer(close)}</div>
	{/if}
	{#if showClose && closeHref !== undefined}
		<a href={closeHref} aria-label={closeLabel} onclick={close} class={buttonClass('ghost', 'icon-sm', CLOSE_POSITION[side])}>
			<X aria-hidden="true" />
		</a>
	{:else if showClose}
		<button
			{...dialog.close}
			aria-label={closeLabel}
			class={buttonClass('ghost', 'icon-sm', CLOSE_POSITION[side])}
		>
			<X aria-hidden="true" />
		</button>
	{/if}
</dialog>
