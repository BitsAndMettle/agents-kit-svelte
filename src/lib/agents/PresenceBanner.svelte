<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { CircleCheck, Clock, Wifi, WifiOff, X } from '@lucide/svelte';
	import { buttonClass } from '../ui/styles';
	import { formatElapsed } from '../core/time';
	import { useClock } from '../state/clock.svelte';
	import { clockTime, type TimeInput } from './presence';
	import type { PresenceAction, PresenceState } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		state: PresenceState;
		/** What this is about, e.g. "Operator on devbox". */
		subject: string;
		/** When the state began (ISO time). Shown as clock time and, with `now`, how long ago. */
		since?: string;
		/** The current time. Pass it in so the banner renders the same on the server and in tests. Without it the "ago" text appears after mount and updates every 30 seconds. */
		now?: TimeInput;
		/** IANA time zone for the clock time. Without it the time is UTC and says so. */
		timeZone?: string;
		/** One more line of context, e.g. "Last heartbeat failed". */
		detail?: string;
		action?: PresenceAction;
		onDismiss?: () => void;
		/** Slimmer single-line look. Defaults to on for `online`. */
		compact?: boolean;
		class?: string;
	}

	let { state, subject, since = '', now, timeZone, detail = '', action, onDismiss, compact, class: className = '', ...rest }: Props = $props();

	const STATES = {
		online: { label: 'Online', tone: 'border-status-success/30 bg-status-success-subtle text-status-success', text: 'text-status-success', icon: CircleCheck },
		stale: { label: 'Not responding', tone: 'border-status-warning/30 bg-status-warning-subtle text-status-warning', text: 'text-status-warning', icon: Clock },
		offline: { label: 'Offline', tone: 'border-status-danger/30 bg-status-danger-subtle text-status-danger', text: 'text-status-danger', icon: WifiOff },
		reconnecting: { label: 'Reconnecting…', tone: 'border-status-info/30 bg-status-info-subtle text-status-info', text: 'text-status-info', icon: Wifi }
	} as const;

	let meta = $derived(STATES[state]);
	let slim = $derived(compact ?? state === 'online');
	let clock = $derived(since ? clockTime(since, timeZone ?? 'UTC') : '');
	const clockNow = useClock(() => now);
	let ago = $derived(since && clockNow.value !== undefined ? formatElapsed(since, clockNow.value) : '');
	let utcNote = $derived(!timeZone || timeZone === 'UTC' ? ' UTC' : '');
	let Icon = $derived(meta.icon);
</script>

<div {...rest} role="status" class={cn('flex items-center gap-2 rounded-control border text-[13px]', slim ? 'px-2.5 py-1' : 'flex-wrap px-3 py-2', meta.tone, className)}>
	<span class="relative grid size-4 shrink-0 place-items-center">
		<Icon class="size-4" aria-hidden="true" />
		{#if state === 'reconnecting'}
			<span aria-hidden="true" class="absolute -top-0.5 -right-0.5 grid size-2 place-items-center">
				<span class="absolute inline-flex size-full animate-ping rounded-full bg-status-info opacity-75 motion-reduce:hidden"></span>
				<span class="relative inline-flex size-1.5 rounded-full bg-status-info"></span>
			</span>
		{/if}
	</span>
	<p class="min-w-0 flex-1 text-fg-main">
		<span class="font-semibold">{subject}</span>
		<span class="text-fg-light">&nbsp;·&nbsp;</span><span class={cn('font-medium', meta.text)}>{meta.label}</span>
		{#if clock}<span class="text-fg-light">&nbsp;since {clock}{utcNote}{#if ago} · {ago} ago{/if}</span>{/if}
		{#if detail}<span class="block text-[12px] text-fg-light">{detail}</span>{/if}
	</p>
	{#if action}
		<button type="button" class={buttonClass('secondary', 'xs', 'ml-auto')} onclick={() => action?.onAction()}>{action.label}</button>
	{/if}
	{#if onDismiss}
		<button type="button" class={buttonClass('ghost', 'icon-xs', 'text-fg-light')} onclick={() => onDismiss?.()}>
			<X aria-hidden="true" /><span class="sr-only">Dismiss</span>
		</button>
	{/if}
</div>
