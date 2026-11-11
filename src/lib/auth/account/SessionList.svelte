<script lang="ts" module>
	import type { TimeInput } from '../../core/time';

	/** Every word the session list shows or announces. */
	export interface SessionListLabels {
		title: string;
		/** Badge on this browser's own session. */
		thisDevice: string;
		/** Last-active text of the current session. */
		activeNow: string;
		empty: string;
		/** Text of each row's button. */
		revoke: string;
		/** Accessible name of a row's button. */
		revokeFor: (label: string) => string;
		/** Polite message on a row whose revoke failed (the callback threw or its promise rejected). */
		revokeFailed: string;
		revokeOthers: string;
		/** Polite message when "Sign out of all other sessions" failed. */
		revokeOthersFailed: string;
		cancel: string;
		confirmRevokeTitle: (label: string) => string;
		confirmRevokeDescription: string;
		confirmRevokeAction: string;
		confirmOthersTitle: string;
		confirmOthersDescription: string;
		confirmOthersAction: string;
	}

	/** Text for "last active" from a time and the current time, e.g. "Active 12 min ago". */
	export type FormatLastActive = (lastActive: TimeInput, now: TimeInput) => string;
</script>

<script lang="ts">
	import { tick, type Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Globe, Monitor, Smartphone, Tablet } from '@lucide/svelte';
	import { isThenable } from './promise';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';
	import { formatElapsed } from '../../core/time';
	import { useClock } from '../../state/clock.svelte';
	import { Badge } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { AlertDialog } from '../../primitives/overlays';
	import type { AuthSession } from '../shared';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** The signed-in devices. */
		sessions: AuthSession[];
		/** Choosing "Revoke" on a row (after the confirm). Return a promise to show loading on that row; your app removes the session from `sessions`. */
		onRevoke?: (id: string) => unknown;
		/** Choosing "Sign out of all other sessions" (after the confirm). The button is hidden when no other session exists. */
		onRevokeOthers?: () => unknown;
		/** Ask before revoking, in an AlertDialog. Default true. */
		confirmRevoke?: boolean;
		/** Last-active text. Default: "Active 12 min ago". */
		formatLastActive?: FormatLastActive;
		/** The time to measure against. Default: the current time, refreshed every 30 seconds once mounted. */
		now?: TimeInput;
		/** Heading level of the title. Default 3. */
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		/** Words, merged over the English defaults. */
		labels?: Partial<SessionListLabels>;
		/** Classes for the outer box. */
		class?: string;
	}

	let {
		sessions,
		onRevoke,
		onRevokeOthers,
		confirmRevoke = true,
		formatLastActive = (lastActive, current) => {
			const elapsed = formatElapsed(lastActive, current);
			return elapsed ? `Active ${elapsed} ago` : '';
		},
		now,
		headingLevel = 3,
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SessionListLabels>({
		title: 'Signed-in devices',
		thisDevice: 'This device',
		activeNow: 'Active now',
		empty: 'No active sessions.',
		revoke: 'Revoke',
		revokeFor: (label) => `Revoke ${label}`,
		revokeFailed: 'The device could not be signed out. Try again.',
		revokeOthers: 'Sign out of all other sessions',
		revokeOthersFailed: 'The other devices could not be signed out. Try again.',
		cancel: 'Cancel',
		confirmRevokeTitle: (label) => `Revoke ${label}?`,
		confirmRevokeDescription: 'That device is signed out and has to sign in again.',
		confirmRevokeAction: 'Revoke',
		confirmOthersTitle: 'Sign out of all other sessions?',
		confirmOthersDescription: 'Every other device is signed out. This device stays signed in.',
		confirmOthersAction: 'Sign out others',
		...labels
	});

	const clock = useClock(() => now);
	const ICONS: Record<NonNullable<AuthSession['kind']>, Component> = { desktop: Monitor, mobile: Smartphone, tablet: Tablet, unknown: Globe };

	const headingId = $props.id();
	let root = $state<HTMLElement>();
	let heading = $state<HTMLElement>();
	let revoking = $state<Record<string, boolean>>({});
	let failed = $state<Record<string, boolean>>({});
	let revokingOthers = $state(false);
	let failedOthers = $state(false);
	/** What the dialog is asking about: one session, or all the others. */
	let asking = $state<{ id: string; label: string } | 'others' | null>(null);
	let dialogOpen = $state(false);
	/** Per revoke in flight: where focus should go once that row is gone (its position among the other sessions). */
	const restores = new Map<string, number>();
	let restoreOthers = false;

	const others = $derived(sessions.filter((session) => !session.current));
	const askingOthers = $derived(asking === 'others' || asking === null);

	function rowButtons(): HTMLElement[] {
		return Array.from(root?.querySelectorAll<HTMLElement>('[data-revoke]') ?? []);
	}

	// A revoked row's button leaves with the row, which would drop focus to the page.
	$effect(() => {
		const ids = new Set(sessions.map((session) => session.id));
		let index: number | undefined;
		for (const [id, at] of restores) {
			if (ids.has(id)) continue;
			restores.delete(id);
			index = at;
		}
		const all = restoreOthers && sessions.every((session) => session.current);
		if (all) restoreOthers = false;
		if (index === undefined && !all) return;
		void tick().then(() => {
			const active = document.activeElement;
			if (active && active !== document.body) return;
			const buttons = rowButtons();
			const target = all || index === undefined || buttons.length === 0 ? heading : buttons[Math.min(index, buttons.length - 1)];
			target?.focus();
		});
	});

	async function revoke(id: string): Promise<void> {
		const index = others.findIndex((session) => session.id === id);
		restores.set(id, Math.max(0, index));
		failed[id] = false;
		try {
			const result = onRevoke?.(id);
			if (isThenable(result)) {
				revoking[id] = true;
				await result;
			}
		} catch {
			// The row stays and can be tried again; say so politely.
			restores.delete(id);
			failed[id] = true;
		} finally {
			delete revoking[id];
		}
	}

	async function revokeAll(): Promise<void> {
		restoreOthers = true;
		failedOthers = false;
		try {
			const result = onRevokeOthers?.();
			if (isThenable(result)) {
				revokingOthers = true;
				await result;
			}
		} catch {
			restoreOthers = false;
			failedOthers = true;
		} finally {
			revokingOthers = false;
		}
	}

	function ask(target: { id: string; label: string } | 'others'): void {
		if (!confirmRevoke) {
			void (target === 'others' ? revokeAll() : revoke(target.id));
			return;
		}
		asking = target;
		dialogOpen = true;
	}

	function confirmed(): void {
		const target = asking;
		if (target === 'others') void revokeAll();
		else if (target) void revoke(target.id);
	}

	function lastActiveText(session: AuthSession): string {
		if (session.current) return text.activeNow;
		if (session.lastActive === undefined || clock.value === undefined) return '';
		return formatLastActive(session.lastActive, clock.value);
	}

	/** True on the server and the first client render, until the clock has a time: the line keeps its height meanwhile. */
	function awaitingClock(session: AuthSession): boolean {
		return !session.current && session.lastActive !== undefined && clock.value === undefined;
	}
</script>

<section {...rest} bind:this={root} aria-labelledby={headingId} class={cn(SURFACE.card, className)}>
	<div class="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-border px-4 py-3">
		<svelte:element this={`h${headingLevel}`} id={headingId} bind:this={heading} tabindex="-1" class="m-0 text-sm font-semibold text-fg-main outline-none">{text.title}</svelte:element>
		{#if onRevokeOthers && others.length > 0}
			<Button size="sm" variant="secondary" loading={revokingOthers} onclick={() => ask('others')}>{text.revokeOthers}</Button>
		{/if}
	</div>
	<p role="status" class={cn('m-0 border-b border-canvas-border px-4 py-2 text-xs font-medium text-fg-main', !failedOthers && 'sr-only border-0 p-0')}>{failedOthers ? text.revokeOthersFailed : ''}</p>
	{#if sessions.length === 0}
		<p class="m-0 px-4 py-6 text-center text-[13px] text-fg-light">{text.empty}</p>
	{:else}
		<ul class="m-0 list-none p-0">
			{#each sessions as session (session.id)}
				{@const Icon = ICONS[session.kind ?? 'unknown']}
				{@const active = lastActiveText(session)}
				{@const waiting = awaitingClock(session)}
				<li class="flex items-center gap-3 border-b border-canvas-border px-4 py-3 last:border-b-0">
					<span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-canvas-secondary text-fg-light [&_svg]:size-4">
						<Icon />
					</span>
					<div class="min-w-0 flex-1">
						<p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-fg-main">
							<span class="min-w-0 break-words">{session.label}</span>
							{#if session.current}<Badge tone="accent" size="sm">{text.thisDevice}</Badge>{/if}
						</p>
						{#if session.location || active || waiting}
							<p class="m-0 mt-0.5 text-xs text-fg-light">
								{#if session.location}<span>{session.location}</span>{/if}
								{#if session.location && (active || waiting)}<span aria-hidden="true"> · </span>{/if}
								{#if active}<span>{active}</span>{:else if waiting}<span aria-hidden="true" data-last-active-placeholder="" class="inline-block h-3 w-20 rounded-sm bg-canvas-secondary align-middle"></span>{/if}
							</p>
						{/if}
						<span role="status" class={cn('block text-xs font-medium text-fg-main', !failed[session.id] && 'sr-only')}>{failed[session.id] ? text.revokeFailed : ''}</span>
					</div>
					{#if !session.current}
						<Button
							size="sm"
							variant="secondary"
							data-revoke=""
							aria-label={text.revokeFor(session.label)}
							loading={revoking[session.id] === true}
							onclick={() => ask({ id: session.id, label: session.label })}
						>
							{text.revoke}
						</Button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<AlertDialog
	bind:open={dialogOpen}
	title={asking && asking !== 'others' ? text.confirmRevokeTitle(asking.label) : text.confirmOthersTitle}
	description={askingOthers ? text.confirmOthersDescription : text.confirmRevokeDescription}
	confirmLabel={askingOthers ? text.confirmOthersAction : text.confirmRevokeAction}
	cancelLabel={text.cancel}
	tone="danger"
	onConfirm={confirmed}
/>
