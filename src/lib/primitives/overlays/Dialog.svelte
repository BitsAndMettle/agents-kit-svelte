<!--
	@component
	A modal dialog on a native `<dialog>`, over the headless `Dialog`: focus moves in and is
	trapped by `showModal()`, Escape and a backdrop press close it, focus returns to the
	trigger, and the page stops scrolling. The title and optional description name and
	describe it. The body scrolls between a fixed header and footer.

	Route mode: with `closeHref` the close button is a link, and Escape or a backdrop press
	follow it; with `ssrOpen` an open dialog is server-rendered open (so the route works before
	hydration and without JavaScript) and becomes a real modal on mount.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import type { FocusTarget } from '../../headless/runtime/layers.svelte';
	import type { ChangeReason, Dismiss, Part } from '../../headless/runtime/parts';

	/** Width on screens from 640px up. `full` fills a phone screen and is `lg` above it. */
	export type DialogSize = 'sm' | 'md' | 'lg' | 'full';

	/** How it looks on screens narrower than 640px: docked to the bottom edge, or filling the screen. */
	export type DialogNarrow = 'sheet' | 'fullscreen';

	/** Where focus goes after a close: an element, a selector, or a function returning either. */
	export type DialogReturnFocus = HTMLElement | string | null | (() => HTMLElement | string | null | undefined);

	/**
	 * Route-mode helpers shared by Dialog, Sheet and AlertDialog (they import them from here).
	 * @internal Not exported from the package entry.
	 */
	/** A server-rendered open dialog is not modal yet: drawn as a fixed panel over a scrim until it is. */
	export const NOT_MODAL =
		'[&:not(:modal)]:fixed [&:not(:modal)]:inset-0 [&:not(:modal)]:z-50 [&:not(:modal)]:shadow-[0_0_0_100vmax_var(--ak-color-scrim)]';

	/**
	 * Follows a close link through a real anchor inside the dialog, so the app's router (or the
	 * browser) handles it like any link the person clicked.
	 * @internal
	 */
	export function followLink(host: HTMLElement | null, href: string): void {
		if (!host) return;
		const link = document.createElement('a');
		link.href = href;
		link.hidden = true;
		host.append(link);
		link.click();
		link.remove();
	}

	/**
	 * An attachment that must come before the headless content part: a dialog the server rendered
	 * open is not modal, so it drops the attribute and lets the layer call `showModal()`. It also
	 * sends focus to `returnFocus` once the dialog has closed.
	 * @internal
	 */
	export function upgradeServerOpen(returnFocus: () => DialogReturnFocus | undefined): Attachment<HTMLDialogElement> {
		return (el) => {
			if (el.hasAttribute('open') && !el.matches(':modal')) el.removeAttribute('open');
			const onClose = () => {
				const wanted = returnFocus();
				const value = typeof wanted === 'function' ? wanted() : wanted;
				const target = typeof value === 'string' ? document.querySelector<HTMLElement>(value) : value;
				if (target?.isConnected && target !== document.activeElement) target.focus();
			};
			el.addEventListener('close', onClose);
			return () => el.removeEventListener('close', onClose);
		};
	}

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
		/**
		 * Route mode: the URL that closes it. The close button becomes a link to it, and Escape
		 * and a backdrop press follow it too (the dialog also closes at once). Your router, or
		 * the browser without JavaScript, does the rest.
		 */
		closeHref?: string;
		/**
		 * Renders it open during server rendering when `open` (or `defaultOpen`) is true, so a
		 * dialog route shows before hydration and without JavaScript (as a fixed panel over a
		 * scrim). On mount it becomes a real modal.
		 */
		ssrOpen?: boolean;
		/**
		 * Where focus goes after it closes, instead of where it was when it opened (a dialog
		 * opened by a route has no opener). Ignored when the target cannot take focus.
		 */
		returnFocus?: DialogReturnFocus;
		/** On screens narrower than 640px: `sheet` docks it to the bottom edge, `fullscreen` fills the screen. Default: centred. */
		narrow?: DialogNarrow;
		class?: string;
	}
</script>

<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Dialog as HeadlessDialog } from '../../headless/patterns/dialog.svelte';
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
		closeHref,
		ssrOpen = false,
		returnFocus,
		narrow,
		class: className = '',
		...rest
	}: Props = $props();

	const id = $props.id();
	const dialog = new HeadlessDialog({
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
	/** The `open` attribute of a server-rendered route: written on the server only, never managed on the client. */
	const serverOpen = $derived(typeof document === 'undefined' && ssrOpen && open ? { open: true } : {});
	/** Until mount, a server-rendered open dialog keeps its open look. */
	const shownState = $derived(ssrOpen && open && !hydrated ? 'open' : dialog.state);
	/** Runs before the headless layer attaches (see `upgradeServerOpen`). */
	const upgrade = upgradeServerOpen(() => returnFocus);

	const NARROW: Record<DialogNarrow, string> = {
		sheet: 'max-sm:mx-0 max-sm:mb-0 max-sm:mt-auto max-sm:h-fit max-sm:max-h-[85dvh] max-sm:w-dvw max-sm:rounded-none max-sm:rounded-t-window max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[env(safe-area-inset-bottom)]',
		fullscreen: 'max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-dvw max-sm:rounded-none max-sm:border-0 max-sm:pt-[env(safe-area-inset-top)] max-sm:pb-[env(safe-area-inset-bottom)]'
	};

	const SIZES: Record<DialogSize, string> = {
		sm: 'm-auto w-[min(24rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card',
		md: 'm-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card',
		lg: 'm-auto w-[min(48rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card',
		full: 'm-0 h-dvh w-dvw rounded-none border-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-2rem)] sm:w-[min(48rem,calc(100vw-2rem))] sm:rounded-card sm:border sm:p-0'
	};
</script>

{@render trigger?.(dialog.trigger)}

<dialog {...rest} bind:this={ref} {...serverOpen} {@attach upgrade} {...dialog.content} data-state={shownState} aria-labelledby={dialog.content['aria-labelledby'] ?? (ssrOpen ? dialog.title.id : undefined)} class={cn(MODAL_SURFACE, SIZES[size], narrow && NARROW[narrow], ssrOpen && NOT_MODAL, ssrOpen && size !== 'full' && narrow !== 'fullscreen' && '[&:not(:modal)]:h-fit', FADE_SCALE_MOTION, BACKDROP, className)}>
	{#if narrow === 'sheet'}
		<div aria-hidden="true" class="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-card-border sm:hidden"></div>
	{/if}
	<div class={cn(MODAL_HEADER, narrow === 'sheet' && 'max-sm:pt-3')}>
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
		<a href={closeHref} aria-label={closeLabel} onclick={close} class={buttonClass('ghost', 'icon-sm', 'absolute right-3 top-3')}>
			<X aria-hidden="true" />
		</a>
	{:else if showClose}
		<button {...dialog.close} aria-label={closeLabel} class={buttonClass('ghost', 'icon-sm', 'absolute right-3 top-3')}>
			<X aria-hidden="true" />
		</button>
	{/if}
</dialog>
