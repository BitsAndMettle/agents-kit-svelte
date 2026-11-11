<!--
	@component
	A modal dialog on a native `<dialog>`, over the headless `Dialog`: focus moves in and is
	trapped by `showModal()`, Escape and a backdrop press close it, focus returns to the
	trigger, and the page stops scrolling. The title and optional description name and
	describe it. The body scrolls between a fixed header and footer.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import type { FocusTarget } from '../../headless/runtime/layers.svelte';
	import type { ChangeReason, Dismiss, Part } from '../../headless/runtime/parts';

	/** Width on screens from 640px up. `full` fills a phone screen and is `lg` above it. */
	export type DialogSize = 'sm' | 'md' | 'lg' | 'full';

	export interface Props extends Omit<HTMLDialogAttributes, 'class' | 'children' | 'open' | 'title' | 'role'> {
		/** Whether it is open. Bindable. */
		open?: boolean;
		/** Whether it starts open when `open` is not bound. */
		defaultOpen?: boolean;
		/** The `<dialog>` element. Bindable. */
		ref?: HTMLDialogElement | null;
		/** Names the dialog (wired to `aria-labelledby`). */
		title: string;
		/** Describes it (wired to `aria-describedby` while rendered). */
		description?: string;
		size?: DialogSize;
		/** Renders the opener; spread the part onto a `<button>`. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		/** Extra header content under the title and description. */
		header?: Snippet;
		/** The scrolling body. */
		children?: Snippet;
		/** Actions; receives a function that closes the dialog. */
		footer?: Snippet<[close: () => void]>;
		/** Show the corner close button. Default true. */
		showClose?: boolean;
		/** Accessible name of the close button. */
		closeLabel?: string;
		/**
		 * Where focus goes on open. Default: the first `[autofocus]` element inside, else the
		 * first focusable one. 'content', 'first', 'last', 'none' or a function returning an element.
		 */
		initialFocus?: FocusTarget;
		/** Dismissal policy; function forms can veto (e.g. unsaved changes). */
		dismiss?: Dismiss;
		/** Called on every open or close the dialog makes, with the reason. */
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		class?: string;
	}
</script>

<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Dialog } from '../../headless/patterns/dialog.svelte';
	import { cn } from '../../ui/cn';
	import { buttonClass } from '../../ui/styles';
	import {
		BACKDROP,
		FADE_SCALE_MOTION,
		MODAL_BODY,
		MODAL_DESCRIPTION,
		MODAL_FOOTER,
		MODAL_HEADER,
		MODAL_SURFACE,
		MODAL_TITLE
	} from './overlay';

	let {
		defaultOpen = false,
		open = $bindable(defaultOpen),
		ref = $bindable(null),
		title,
		description,
		size = 'md',
		trigger,
		header,
		children,
		footer,
		showClose = true,
		closeLabel = 'Close',
		initialFocus,
		dismiss,
		onOpenChange,
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

	const SIZES: Record<DialogSize, string> = {
		sm: 'm-auto w-[min(24rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card',
		md: 'm-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card',
		lg: 'm-auto w-[min(48rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card',
		full: 'm-0 h-dvh w-dvw rounded-none border-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-2rem)] sm:w-[min(48rem,calc(100vw-2rem))] sm:rounded-card sm:border sm:p-0'
	};
</script>

{@render trigger?.(dialog.trigger)}

<dialog {...rest} bind:this={ref} {...dialog.content} class={cn(MODAL_SURFACE, SIZES[size], FADE_SCALE_MOTION, BACKDROP, className)}>
	<div class={MODAL_HEADER}>
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
	{#if showClose}
		<button {...dialog.close} aria-label={closeLabel} class={buttonClass('ghost', 'icon-sm', 'absolute right-3 top-3')}>
			<X aria-hidden="true" />
		</button>
	{/if}
</dialog>
