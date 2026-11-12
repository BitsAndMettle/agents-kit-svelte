<!--
	@component
	A confirmation that interrupts: `role="alertdialog"` over the headless `Dialog`. A backdrop
	press does nothing, Escape cancels, and focus starts on the safe (cancel) action. When
	`onConfirm` returns a Promise the confirm button shows a loading state and the dialog stays
	open until it resolves; a rejection keeps it open and shows the error. Route mode as on
	Dialog: with `closeHref` Cancel is a link and Escape follows it; `ssrOpen` renders it open on
	the server.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import type { ChangeReason, Part } from '../../headless/runtime/parts';
	import type { UiTone } from '../../ui/styles';

	export interface Props extends Omit<HTMLDialogAttributes, 'class' | 'children' | 'open' | 'title' | 'role'> {
		/** Whether it is open. Bindable. */
		open?: boolean;
		/** Whether it starts open when `open` is not bound. */
		defaultOpen?: boolean;
		/** The `<dialog>` element. Bindable. */
		ref?: HTMLDialogElement | null;
		/** The question, e.g. "Delete this run?". */
		title: string;
		/** What happens if they confirm. */
		description: string;
		/** Label of the confirm action. */
		confirmLabel?: string;
		/** Label of the confirm action while `onConfirm` is pending. */
		pendingLabel?: string;
		cancelLabel?: string;
		/** Colour of the confirm action: `danger` (destructive) and `accent` change it; the rest use the primary look. Default `neutral`. */
		tone?: UiTone;
		/**
		 * Runs on confirm. Return nothing to close at once, or a Promise to keep the dialog
		 * open (loading) until it settles: resolved closes, rejected shows the error.
		 */
		onConfirm?: () => unknown;
		/** Runs when the cancel action is pressed. */
		onCancel?: () => void;
		/** Turns a rejection into the message shown. Default: the Error's message, else `fallbackErrorMessage`. */
		errorMessage?: (error: unknown) => string;
		/** Shown when a rejection carries no message of its own. */
		fallbackErrorMessage?: string;
		/** Renders the opener; spread the part onto a `<button>`. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		/** Extra content between the description and the actions. */
		children?: Snippet;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** Route mode, as on Dialog: Cancel becomes a link to this URL, and Escape follows it. */
		closeHref?: string;
		/** As on Dialog: server-rendered open when `open` is true, a real modal on mount. */
		ssrOpen?: boolean;
		/** Blocks the confirm action (it stays focusable and says it is unavailable), e.g. until a box is ticked. */
		confirmDisabled?: boolean;
		/** Id(s) of visible text that describes the confirm action, such as why it is unavailable. */
		confirmDescribedBy?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';
	import { Dialog } from '../../headless/patterns/dialog.svelte';
	import { followLink, NOT_MODAL, upgradeServerOpen } from './Dialog.svelte';
	import { cn } from '../../ui/cn';
	import { buttonClass } from '../../ui/styles';
	import { BACKDROP, FADE_SCALE_MOTION, MODAL_DESCRIPTION, MODAL_SURFACE, MODAL_TITLE } from './overlay';

	let {
		defaultOpen = false,
		open = $bindable(defaultOpen),
		ref = $bindable(null),
		title,
		description,
		confirmLabel = 'Confirm',
		pendingLabel,
		cancelLabel = 'Cancel',
		tone = 'neutral',
		onConfirm,
		onCancel,
		errorMessage = defaultMessage,
		fallbackErrorMessage = 'That did not work. Try again.',
		trigger,
		children,
		onOpenChange,
		closeHref,
		ssrOpen = false,
		confirmDisabled = false,
		confirmDescribedBy,
		class: className = '',
		...rest
	}: Props = $props();

	let pending = $state(false);
	let error = $state<string | null>(null);
	let cancelButton = $state<HTMLElement | null>(null);

	const id = $props.id();
	const dialog = new Dialog({
		id,
		role: 'alertdialog',
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
			if (!next && closeHref !== undefined && reason === 'escape') followLink(ref, closeHref);
		},
		// The safe action, whatever order the buttons are in.
		initialFocus: () => cancelButton,
		// A pending confirm keeps the dialog open.
		dismiss: { escape: () => !pending }
	});

	let hydrated = $state(false);
	$effect(() => {
		hydrated = true;
	});
	/** The `open` attribute of a server-rendered route: written on the server only. */
	const serverOpen = $derived(typeof document === 'undefined' && ssrOpen && open ? { open: true } : {});
	const shownState = $derived(ssrOpen && open && !hydrated ? 'open' : dialog.state);
	const upgrade = upgradeServerOpen(() => undefined);

	// A fresh open starts without the last attempt's error.
	$effect(() => {
		if (open) error = null;
	});

	function defaultMessage(reason: unknown): string {
		if (reason instanceof Error && reason.message) return reason.message;
		if (typeof reason === 'string' && reason) return reason;
		return fallbackErrorMessage;
	}

	function isThenable(value: unknown): value is PromiseLike<unknown> {
		return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
	}

	async function confirm(): Promise<void> {
		if (pending || confirmDisabled) return;
		error = null;
		let result: unknown;
		try {
			result = onConfirm?.();
		} catch (reason) {
			error = errorMessage(reason);
			return;
		}
		if (!isThenable(result)) {
			dialog.open = false;
			return;
		}
		pending = true;
		try {
			await result;
			pending = false;
			dialog.open = false;
		} catch (reason) {
			pending = false;
			error = errorMessage(reason);
		}
	}
</script>

{@render trigger?.(dialog.trigger)}

<dialog {...rest} bind:this={ref}
	{...serverOpen}
	{@attach upgrade}
	{...dialog.content}
	data-state={shownState}
	aria-labelledby={dialog.content['aria-labelledby'] ?? (ssrOpen ? dialog.title.id : undefined)}
	aria-busy={pending}
	class={cn(MODAL_SURFACE, 'm-auto w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card', ssrOpen && NOT_MODAL, ssrOpen && '[&:not(:modal)]:h-fit', FADE_SCALE_MOTION, BACKDROP, className)}
>
	<div class="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-4">
		<h2 {...dialog.title} class={MODAL_TITLE}>{title}</h2>
		<p {...dialog.description} class={MODAL_DESCRIPTION}>{description}</p>
		{#if children}
			<div class="mt-3 text-[13px] leading-5 text-fg-main">{@render children()}</div>
		{/if}
		{#if error}
			<p role="alert" class="mt-3 rounded-control border border-status-danger/40 bg-status-danger-subtle px-3 py-2 text-[13px] leading-5 text-fg-main">
				{error}
			</p>
		{/if}
	</div>
	<div class="flex shrink-0 flex-wrap items-center justify-end gap-2 px-5 pb-5">
		{#if closeHref !== undefined}
			<a
				href={pending ? undefined : closeHref}
				bind:this={cancelButton}
				role={pending ? 'link' : undefined}
				aria-disabled={pending || undefined}
				onclick={() => {
					if (pending) return;
					dialog.open = false;
					onCancel?.();
				}}
				class={buttonClass('secondary', 'md', 'aria-disabled:pointer-events-none aria-disabled:opacity-50')}
			>
				{cancelLabel}
			</a>
		{:else}
			<button {...dialog.close} bind:this={cancelButton} disabled={pending} onclick={() => onCancel?.()} class={buttonClass('secondary', 'md')}>
				{cancelLabel}
			</button>
		{/if}
		<button
			type="button"
			aria-disabled={pending || confirmDisabled}
			aria-describedby={confirmDescribedBy}
			onclick={confirm}
			class={buttonClass(tone === 'danger' ? 'danger' : tone === 'accent' ? 'accent' : 'primary', 'md', pending ? 'aria-disabled:cursor-progress' : 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50')}
		>
			{#if pending}
				<LoaderCircle aria-hidden="true" class="animate-spin motion-reduce:animate-none" />
				{pendingLabel ?? confirmLabel}
			{:else}
				{confirmLabel}
			{/if}
		</button>
	</div>
</dialog>
