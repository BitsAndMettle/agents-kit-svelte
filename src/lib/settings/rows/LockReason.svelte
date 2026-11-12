<script lang="ts" module>
	import type { LockKind } from '../shared/types';

	/** Words of a LockReason: one default sentence per lock kind, plus the request flow. */
	export interface LockReasonLabels extends Record<LockKind, string> {
		/** The request button. */
		request: string;
		/** Announced while the request is being sent. */
		requesting: string;
		/** Shown once the request was sent. It is waiting now, not granted. */
		requested: string;
		/** Shown when sending the request failed. */
		requestFailed: string;
	}
</script>

<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { tick } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Button } from '../../primitives/actions';
	import { isThenable } from '../../core/promise';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import { cn } from '../../ui/cn';
	import { STATUS_TEXT_CLASS } from '../../ui/styles';
	import { getSettingsDraft, getSettingsScope } from '../shared/context';
	import { LOCK_LABELS, lockReasonText } from '../shared/lock';
	import { LOCK_ICONS } from '../shared/lock-icons';
	import { restoreFocus } from '../shared/focus';
	import { ReadyGate } from '../shared/ready.svelte';
	import { actionButtonProps } from '../shared/recipes';
	import type { SettingLock, SettingsHandler } from '../shared/types';
	import { actionSoftDisabled, focusLost, postIntent } from './helpers';
	import { HandlerRun } from './run.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'id'> {
		/** Why something cannot be changed, and an optional way forward (`lock.action`). */
		lock: SettingLock;
		/**
		 * Id of the reason text. Point any number of controls' `aria-describedby` (or a SettingsRow's
		 * `reasonId`) at it: they hear the sentence and source, never the buttons. Default: generated.
		 */
		id?: string;
		/** `inline` (a line in a row), `note` (a boxed note under or above several rows), or `hidden` (screen-reader only, still describes controls; no buttons). */
		variant?: 'inline' | 'note' | 'hidden';
		/** Shows a request button ("Request access"). Return a promise to show loading; resolving without an error shows "Request sent". Without `requestAction` the button only calls this, so it stays soft-disabled until the page is interactive. */
		onRequest?: SettingsHandler<[]>;
		/**
		 * No-JavaScript path for the request button: it posts `intent=request-access` to this URL (put any
		 * ids in its query). With `onRequest` and JavaScript the handler runs instead. Inside a
		 * SettingsForm it posts through the outer form (`formaction`) without JavaScript, and alone with it.
		 */
		requestAction?: string;
		labels?: Partial<LockReasonLabels>;
		class?: string;
	}

	let { lock, id, variant = 'inline', onRequest, requestAction, labels = {}, class: className = '', ...rest }: Props = $props();

	const uid = $props.id();
	const draft = getSettingsDraft();
	const scope = getSettingsScope();
	const ready = new ReadyGate(() => (scope ? scope.ready() : undefined));
	const REQUEST_INTENT = 'request-access';
	const words = $derived<LockReasonLabels>({
		...LOCK_LABELS,
		request: 'Request access',
		requesting: 'Sending request…',
		requested: 'Request sent',
		requestFailed: "Couldn't send the request. Try again.",
		...labels
	});
	const reasonId = $derived(id ?? `${uid}-reason`);
	const sentence = $derived(lockReasonText(lock, words));
	const Icon = $derived(LOCK_ICONS[lock.kind]);
	const request = new HandlerRun();
	const action = new HandlerRun();
	const actionReasonId = `${uid}-action-reason`;
	const visible = $derived(variant !== 'hidden');
	const waiting = $derived(lock.kind === 'awaiting-approval');
	/** The request flow is offered: by a handler, a native post, or both. */
	const requestable = $derived(Boolean(onRequest) || requestAction !== undefined);
	/** The request button sits in a form of its own, unless it is already inside someone else's (a SettingsForm). */
	const ownRequestForm = $derived(requestAction !== undefined && !draft);
	const VARIANT = {
		hidden: 'sr-only',
		note: 'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-control border border-canvas-border bg-canvas-secondary/60 px-3 py-2.5',
		inline: 'flex flex-wrap items-center gap-x-3 gap-y-1.5'
	} as const;

	/** Live text: what the request is doing now. Failures go to the alert below. */
	const live = $derived(request.status === 'pending' ? words.requesting : request.status === 'done' ? (request.notice ?? words.requested) : '');

	let sent = $state<HTMLElement | null>(null);

	/** The button gives way to "Request sent": when focus went with it, the sent line takes it. */
	async function sendRequest(event: MouseEvent): Promise<void> {
		if (!onRequest) {
			// A native post. Inside a SettingsForm it would go through that form's submit handler (as
			// if Save), so post the intent alone.
			if (requestAction !== undefined && !ownRequestForm) {
				event.preventDefault();
				postIntent(requestAction, REQUEST_INTENT);
			}
			return;
		}
		event.preventDefault();
		const button = event.currentTarget as HTMLElement;
		const ok = await request.run(onRequest);
		if (!ok) return;
		await tick();
		if (!button.isConnected && focusLost()) restoreFocus(sent);
	}

	function runAction(event: MouseEvent): void {
		const select = lock.action?.onSelect;
		if (!select) return;
		const result = select();
		if (isThenable(result)) {
			event.preventDefault();
			void action.run(() => result as Promise<void>);
		}
	}
</script>

{#snippet requestButton()}
	<Button
		type={requestAction !== undefined ? 'submit' : 'button'}
		name={requestAction !== undefined ? 'intent' : undefined}
		value={requestAction !== undefined ? REQUEST_INTENT : undefined}
		formaction={requestAction !== undefined && !ownRequestForm ? requestAction : undefined}
		formmethod={requestAction !== undefined && !ownRequestForm ? 'post' : undefined}
		formnovalidate={requestAction !== undefined && !ownRequestForm ? true : undefined}
		size="xs"
		variant="secondary"
		loading={request.pending}
		softDisabled={requestAction === undefined && !ready.current ? true : undefined}
		aria-describedby={reasonId}
		onclick={sendRequest}
	>
		{words.request}
	</Button>
{/snippet}

<div {...rest} data-lock={lock.kind} class={cn(VARIANT[variant], className)}>
	<p class={cn('m-0 flex min-w-0 items-start gap-2 text-xs leading-5 text-fg-light', variant === 'note' && 'flex-1 basis-60')}>
		{#if visible}
			<span aria-hidden="true" class={cn('mt-0.5 inline-flex shrink-0', waiting ? STATUS_TEXT_CLASS.warning : 'text-fg-light')}><Icon class="size-3.5" /></span>
		{/if}
		<span id={reasonId} class="min-w-0">
			<span class={variant === 'note' ? 'text-fg-main' : undefined}>{sentence}</span>{#if lock.source}<span class="text-fg-light">{` · ${lock.source}`}</span>{/if}
		</span>
	</p>
	{#if visible && (lock.action || requestable)}
		<div class="flex flex-wrap items-center gap-2">
			{#if lock.action}
				<Button
					{...actionButtonProps(lock.action, lock.action.unavailable ? actionReasonId : undefined)}
					softDisabled={actionSoftDisabled(lock.action, ready.current)}
					size="xs"
					loading={action.pending}
					onclick={runAction}
				>
					{lock.action.label}
				</Button>
				{#if lock.action.unavailable}<span id={actionReasonId} class="text-xs text-fg-light">{lock.action.unavailable}</span>{/if}
			{/if}
			{#if requestable}
				{#if request.status === 'done'}
					<span bind:this={sent} tabindex="-1" class={cn('inline-flex items-center gap-1 rounded-control text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary/70', STATUS_TEXT_CLASS.success)}>
						<Check class="size-3.5" aria-hidden="true" />{request.notice ?? words.requested}
					</span>
				{:else if ownRequestForm}
					<form method="post" action={requestAction} class="contents">{@render requestButton()}</form>
				{:else}
					{@render requestButton()}
				{/if}
			{/if}
		</div>
	{/if}
	{#if requestable && visible}
		<span role="status" class="sr-only">{live}</span>
		{#if request.status === 'failed'}
			<p role="alert" class="m-0 basis-full text-xs leading-5 {DANGER_TEXT}">{request.error ?? words.requestFailed}</p>
		{/if}
	{/if}
	{#if action.status === 'failed' && visible}
		<p role="alert" class="m-0 basis-full text-xs leading-5 {DANGER_TEXT}">{action.error ?? words.requestFailed}</p>
	{/if}
</div>
