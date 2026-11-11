<!--
	@component
	A confirmation that interrupts: `role="alertdialog"` over the headless `Dialog`. A backdrop
	press does nothing, Escape cancels, and focus starts on the safe (cancel) action. When
	`onConfirm` returns a Promise the confirm button shows a loading state and the dialog stays
	open until it resolves; a rejection keeps it open and shows the error.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import type { ChangeReason, Part } from '../../headless/runtime/parts';

	export type AlertDialogTone = 'default' | 'danger';

	export interface Props extends Omit<HTMLDialogAttributes, 'class' | 'children' | 'open' | 'title' | 'role'> {
		/** Whether it is open. Bindable. */
		open?: boolean;
		/** The question, e.g. "Delete this run?". */
		title: string;
		/** What happens if they confirm. */
		description: string;
		/** Label of the confirm action. */
		confirmLabel?: string;
		/** Label of the confirm action while `onConfirm` is pending. */
		pendingLabel?: string;
		cancelLabel?: string;
		/** `danger` styles the confirm action as destructive. */
		tone?: AlertDialogTone;
		/**
		 * Runs on confirm. Return nothing to close at once, or a Promise to keep the dialog
		 * open (loading) until it settles: resolved closes, rejected shows the error.
		 */
		onConfirm?: () => unknown;
		/** Runs when the cancel action is pressed. */
		onCancel?: () => void;
		/** Turns a rejection into the message shown. Default: the Error's message. */
		errorMessage?: (error: unknown) => string;
		/** Renders the opener; spread the part onto a `<button>`. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		/** Extra content between the description and the actions. */
		children?: Snippet;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		class?: string;
	}
</script>

<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';
	import { Dialog } from '../../headless/patterns/dialog.svelte';
	import { cn } from '../../ui/cn';
	import { buttonClass } from '../../ui/styles';
	import { BACKDROP, FADE_SCALE_MOTION, MODAL_DESCRIPTION, MODAL_SURFACE, MODAL_TITLE } from './overlay';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		pendingLabel,
		cancelLabel = 'Cancel',
		tone = 'default',
		onConfirm,
		onCancel,
		errorMessage = defaultMessage,
		trigger,
		children,
		onOpenChange,
		class: className = '',
		...rest
	}: Props = $props();

	let pending = $state(false);
	let error = $state<string | null>(null);
	let cancelButton = $state<HTMLButtonElement | null>(null);

	const id = $props.id();
	const dialog = new Dialog({
		id,
		role: 'alertdialog',
		open: () => open,
		onOpenChange: (next, reason) => {
			open = next;
			onOpenChange?.(next, reason);
		},
		// The safe action, whatever order the buttons are in.
		initialFocus: () => cancelButton,
		// A pending confirm keeps the dialog open.
		dismiss: { escape: () => !pending }
	});

	// A fresh open starts without the last attempt's error.
	$effect(() => {
		if (open) error = null;
	});

	function defaultMessage(reason: unknown): string {
		if (reason instanceof Error && reason.message) return reason.message;
		if (typeof reason === 'string' && reason) return reason;
		return 'That did not work. Try again.';
	}

	function isThenable(value: unknown): value is PromiseLike<unknown> {
		return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
	}

	async function confirm(): Promise<void> {
		if (pending) return;
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

<dialog {...rest}
	{...dialog.content}
	aria-busy={pending}
	class={cn(MODAL_SURFACE, 'm-auto w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-card', FADE_SCALE_MOTION, BACKDROP, className)}
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
		<button {...dialog.close} bind:this={cancelButton} disabled={pending} onclick={() => onCancel?.()} class={buttonClass('secondary', 'md')}>
			{cancelLabel}
		</button>
		<button
			type="button"
			aria-disabled={pending}
			onclick={confirm}
			class={buttonClass(tone === 'danger' ? 'danger' : 'primary', 'md', 'aria-disabled:cursor-progress')}
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
