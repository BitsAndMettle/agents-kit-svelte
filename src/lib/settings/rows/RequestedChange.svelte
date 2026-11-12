<script lang="ts" module>
	/** Where a requested change stands. Only the app moves it on, by passing a new `status`. */
	export type RequestedChangeStatus = 'awaiting' | 'approved' | 'declined' | 'expired';

	/** Words of a RequestedChange. */
	export interface RequestedChangeLabels {
		awaiting: string;
		approved: string;
		declined: string;
		expired: string;
		/** The value in effect now. */
		effective: (value: string) => string;
		/** The value asked for. */
		requested: (value: string) => string;
		/** Who has to approve it ("Waiting on your administrator"). */
		waitingOn: (who: string) => string;
		/** When it was asked for; gets `formatTime`'s text ("12 min ago"). */
		sentAt: (ago: string) => string;
		/** The line while awaiting: nothing has changed yet. */
		nothingYet: string;
		/** The line once approved. */
		approvedLine: (value: string) => string;
		/** The line once declined. */
		declinedLine: (effective: string, requested: string) => string;
		/** The line once expired. */
		expiredLine: (effective: string) => string;
		cancel: string;
		resend: string;
		cancelling: string;
		resending: string;
		/** Shown after Send again went through. The change is still waiting. */
		resent: string;
		cancelFailed: string;
		resendFailed: string;
	}
</script>

<script lang="ts">
	import { ArrowRight, Hourglass } from '@lucide/svelte';
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Button } from '../../primitives/actions';
	import { Badge } from '../../primitives/display';
	import { DANGER_TEXT } from '../../primitives/form/classes';
	import type { TimeInput } from '../../core/time';
	import { cn } from '../../ui/cn';
	import type { UiTone } from '../../ui/styles';
	import { getSettingsDraft, getSettingsScope } from '../shared/context';
	import { ReadyGate } from '../shared/ready.svelte';
	import { RECIPES } from '../shared/recipes';
	import type { SettingsHandler } from '../shared/types';
	import { formatRequestedAgo, postIntent, withQuery } from './helpers';
	import { SettingsHandlerRun } from '../shared/run.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLLIElement>, 'class' | 'children' | 'hidden'> {
		/** Names the setting. */
		label: string;
		/** Help text under the label. */
		description?: string | Snippet;
		/** The value in effect now. */
		effective: string;
		/** The value asked for. */
		requested: string;
		/** Who or what has to approve it ("this device", "an administrator"). */
		waitingOn?: string;
		/** When it was asked for. */
		requestedAt?: TimeInput;
		/** The current time, injected so server and browser render the same text. Default: when the component starts. */
		now?: TimeInput;
		/** Turns `requestedAt` into text. Default: "12 min ago". */
		formatTime?: (time: TimeInput, now: number) => string;
		status: RequestedChangeStatus;
		/** How to approve it: a command to run, a place to go. Shown while awaiting. */
		instructions?: Snippet;
		/** Withdraws the request. The row only shows Cancelling; your app passes the new state. */
		onCancelRequest?: SettingsHandler<[]>;
		/** Sends the request again. It never changes `status`. */
		onResend?: SettingsHandler<[]>;
		/** No-JavaScript path: Cancel and Send again post `intent=cancel|resend` in the body to this URL. Inside a SettingsForm they post the outer form there (`formaction`), so that form's fields go along; with JavaScript and no handler they post this row's intent alone. Without it, the buttons only call your handlers, so they stay soft-disabled until the page is interactive. */
		action?: string;
		/** Extra fields for that post (a request id). They always travel in the `action` URL's query, never the body, with or without JavaScript and inside a SettingsForm or not: the server reads them from `url.searchParams`. */
		hidden?: Record<string, string>;
		labels?: Partial<RequestedChangeLabels>;
		class?: string;
	}

	let {
		label,
		description,
		effective,
		requested,
		waitingOn,
		requestedAt,
		now,
		formatTime = (time, at) => formatRequestedAgo(time, at),
		status,
		instructions,
		onCancelRequest,
		onResend,
		action,
		hidden,
		labels = {},
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const draft = getSettingsDraft();
	const scope = getSettingsScope();
	const ready = new ReadyGate(() => (scope ? scope.ready() : undefined));
	const startedAt = Date.now();
	const cancel = new SettingsHandlerRun();
	const resend = new SettingsHandlerRun();

	const words = $derived<RequestedChangeLabels>({
		awaiting: 'Awaiting approval',
		approved: 'Approved',
		declined: 'Declined',
		expired: 'Expired',
		effective: (v) => `Now ${v}`,
		requested: (v) => `Requested ${v}`,
		waitingOn: (who) => `Waiting on ${who}`,
		sentAt: (ago) => `sent ${ago}`,
		nothingYet: 'Nothing changes until it is approved.',
		approvedLine: (v) => `Now ${v}.`,
		declinedLine: (current, asked) => `Stays ${current}. The request for ${asked} was declined.`,
		expiredLine: (current) => `Stays ${current}. The request expired before anyone answered.`,
		cancel: 'Cancel request',
		resend: 'Send again',
		cancelling: 'Cancelling the request…',
		resending: 'Sending the request again…',
		resent: 'Request sent again.',
		cancelFailed: "Couldn't cancel the request. It is still waiting.",
		resendFailed: "Couldn't send the request again. It is still waiting.",
		...labels
	});

	const TONE: Record<RequestedChangeStatus, UiTone> = { awaiting: 'warning', approved: 'success', declined: 'danger', expired: 'neutral' };
	const nowMs = $derived(now === undefined ? startedAt : now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now));
	const ago = $derived(requestedAt === undefined ? '' : formatTime(requestedAt, nowMs));
	const awaiting = $derived(status === 'awaiting');
	const hasHandlers = $derived(Boolean(onCancelRequest || onResend));
	const ownForm = $derived(!draft && action !== undefined);
	const showButtons = $derived(awaiting && (hasHandlers || action !== undefined));

	// Announce a status the app passes later (not the first one).
	let announced = $state('');
	const initialStatus = untrack(() => status);
	$effect(() => {
		const next = status;
		if (next !== initialStatus) untrack(() => (announced = `${label}: ${words[next]}`));
	});

	const live = $derived(
		cancel.pending ? words.cancelling : resend.pending ? words.resending : resend.status === 'done' ? (resend.notice ?? words.resent) : announced
	);
	const failure = $derived(
		cancel.status === 'failed' ? (cancel.error ?? words.cancelFailed) : resend.status === 'failed' ? (resend.error ?? words.resendFailed) : undefined
	);

	function run(which: 'cancel' | 'resend', event: MouseEvent): void {
		const handler = which === 'cancel' ? onCancelRequest : onResend;
		if (!handler) {
			// No handler: the button posts its intent natively. Inside a SettingsForm that post would
			// go through the form's own submit handler (as if Save), so post this row's fields alone.
			if (formAction !== undefined) {
				event.preventDefault();
				postIntent(formAction, which);
			}
			return;
		}
		event.preventDefault();
		if (cancel.pending || resend.pending) return;
		(which === 'cancel' ? resend : cancel).reset();
		void (which === 'cancel' ? cancel : resend).run(handler);
	}

	/** Submit buttons need a form: their own, or (inside a SettingsForm) the outer one via `formaction`. */
	const buttonType = $derived<'submit' | 'button'>(action !== undefined ? 'submit' : 'button');
	/** Where the buttons post: `action` with the `hidden` fields in its query. Inside someone else's form they could not travel as inputs (they would post with its Save too), so every path puts them in the URL. */
	const postUrl = $derived(action !== undefined ? withQuery(action, hidden) : undefined);
	const formAction = $derived(!ownForm ? postUrl : undefined);
	/** Without `action` the buttons only call back: they wait, soft-disabled, until the page is interactive. */
	const waiting = $derived(action === undefined && !ready.current);
</script>

{#snippet buttons()}
	{#if onResend || action !== undefined}
		<Button
			type={buttonType}
			name="intent"
			value="resend"
			formaction={formAction}
			formmethod={!ownForm && action !== undefined ? 'post' : undefined}
			formnovalidate={!ownForm && action !== undefined ? true : undefined}
			size="sm"
			variant="secondary"
			loading={resend.pending}
			softDisabled={waiting || undefined}
			onclick={(event: MouseEvent) => run('resend', event)}
		>
			{words.resend}<span class="sr-only">for {label}</span>
		</Button>
	{/if}
	{#if onCancelRequest || action !== undefined}
		<Button
			type={buttonType}
			name="intent"
			value="cancel"
			formaction={formAction}
			formmethod={!ownForm && action !== undefined ? 'post' : undefined}
			formnovalidate={!ownForm && action !== undefined ? true : undefined}
			size="sm"
			variant="ghost"
			loading={cancel.pending}
			softDisabled={waiting || undefined}
			onclick={(event: MouseEvent) => run('cancel', event)}
		>
			{words.cancel}<span class="sr-only">for {label}</span>
		</Button>
	{/if}
{/snippet}

<li {...rest} data-status={status} aria-busy={cancel.pending || resend.pending ? 'true' : undefined} class={cn(RECIPES.row, '@lg/settings:flex-wrap @lg/settings:items-start @lg/settings:gap-y-2', className)}>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
			<span id="{uid}-label" class="text-[13px] leading-5 font-medium text-fg-main">{label}</span>
			<Badge tone={TONE[status]} dot={status !== 'awaiting'} size="sm">
				{#snippet icon()}{#if awaiting}<Hourglass aria-hidden="true" />{/if}{/snippet}
				{words[status]}
			</Badge>
		</div>
		{#if description}
			<p class="m-0 text-xs leading-5 text-fg-light">{#if typeof description === 'string'}{description}{:else}{@render description()}{/if}</p>
		{/if}
		{#if awaiting}
			<p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-5 text-fg-main">
				<span>{words.effective(effective)}</span>
				<ArrowRight class="size-3.5 shrink-0 text-fg-light rtl:rotate-180" aria-hidden="true" /><span class="sr-only">, </span>
				<span class="font-medium">{words.requested(requested)}</span>
			</p>
			<p class="m-0 text-xs leading-5 text-fg-light">
				{words.nothingYet}{#if waitingOn || ago}{' '}<span>{[waitingOn ? words.waitingOn(waitingOn) : '', ago ? words.sentAt(ago) : ''].filter(Boolean).join(', ')}.</span>{/if}
			</p>
			{#if instructions}
				<div class="mt-1 min-w-0 rounded-control border border-canvas-border bg-canvas-secondary/60 px-3 py-2 text-xs leading-5 text-fg-main">{@render instructions()}</div>
			{/if}
		{:else}
			<p class="m-0 text-xs leading-5 text-fg-light">
				{status === 'approved' ? words.approvedLine(effective) : status === 'declined' ? words.declinedLine(effective, requested) : words.expiredLine(effective)}
			</p>
		{/if}
	</div>
	{#if showButtons}
		{#if ownForm}
			<form method="post" action={postUrl} class="flex shrink-0 flex-wrap items-center gap-2" aria-labelledby="{uid}-label">
				{@render buttons()}
			</form>
		{:else}
			<div class="flex shrink-0 flex-wrap items-center gap-2">{@render buttons()}</div>
		{/if}
	{/if}
	<!-- After the buttons, on a line of its own: coming or going it never moves them, stacked or beside the text. On one line, so `:empty` meets no whitespace; empty, it is visually hidden, so its alert stays a live region. -->
	<div class="flex min-w-0 basis-full flex-col [&:not(:has(>:not(:empty)))]:sr-only">{#if resend.status === 'done' && awaiting}<p aria-hidden="true" class="m-0 text-xs leading-5 text-fg-light">{resend.notice ?? words.resent}</p>{/if}<div role="alert" class={cn('text-xs leading-5 font-medium empty:sr-only', DANGER_TEXT)}>{#if failure}<p class="m-0">{failure}</p>{/if}</div></div>
	<span role="status" class="sr-only">{live}</span>
</li>
