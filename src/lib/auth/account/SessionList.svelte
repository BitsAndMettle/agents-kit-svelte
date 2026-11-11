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
		revokeOthers: string;
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
		revokeOthers: 'Sign out of all other sessions',
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
	let revokingOthers = $state(false);
	/** What the dialog is asking about: one session, or all the others. */
	let asking = $state<{ id: string; label: string } | 'others' | null>(null);
	let dialogOpen = $state(false);
	/** Where focus should go once the revoked row is gone. */
	let restore: { id: string; index: number } | 'others' | null = null;

	const others = $derived(sessions.filter((session) => !session.current));
	const askingOthers = $derived(asking === 'others' || asking === null);

	function rowButtons(): HTMLElement[] {
		return Array.from(root?.querySelectorAll<HTMLElement>('[data-revoke]') ?? []);
	}

	// A revoked row's button leaves with the row, which would drop focus to the page.
	$effect(() => {
		const ids = sessions.map((session) => session.id);
		const pending = restore;
		if (!pending) return;
		if (pending !== 'others' && ids.includes(pending.id)) return;
		restore = null;
		void tick().then(() => {
			const active = document.activeElement;
			if (active && active !== document.body) return;
			const buttons = rowButtons();
			const target = pending === 'others' || buttons.length === 0 ? heading : buttons[Math.min(pending.index, buttons.length - 1)];
			target?.focus();
		});
	});

	async function revoke(id: string): Promise<void> {
		const index = others.findIndex((session) => session.id === id);
		restore = { id, index: Math.max(0, index) };
		try {
			const result = onRevoke?.(id);
			if (isThenable(result)) {
				revoking[id] = true;
				await result;
			}
		} catch {
			// The app reports its own failure; the row stays and can be tried again.
			restore = null;
		} finally {
			delete revoking[id];
		}
	}

	async function revokeAll(): Promise<void> {
		restore = 'others';
		try {
			const result = onRevokeOthers?.();
			if (isThenable(result)) {
				revokingOthers = true;
				await result;
			}
		} catch {
			// The app reports its own failure.
			restore = null;
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
</script>

<section {...rest} bind:this={root} aria-labelledby={headingId} class={cn(SURFACE.card, className)}>
	<div class="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-border px-4 py-3">
		<svelte:element this={`h${headingLevel}`} id={headingId} bind:this={heading} tabindex="-1" class="m-0 text-sm font-semibold text-fg-main outline-none">{text.title}</svelte:element>
		{#if onRevokeOthers && others.length > 0}
			<Button size="sm" variant="secondary" loading={revokingOthers} onclick={() => ask('others')}>{text.revokeOthers}</Button>
		{/if}
	</div>
	{#if sessions.length === 0}
		<p class="m-0 px-4 py-6 text-center text-[13px] text-fg-light">{text.empty}</p>
	{:else}
		<ul class="m-0 list-none p-0">
			{#each sessions as session (session.id)}
				{@const Icon = ICONS[session.kind ?? 'unknown']}
				{@const active = lastActiveText(session)}
				<li class="flex items-center gap-3 border-b border-canvas-border px-4 py-3 last:border-b-0">
					<span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-canvas-secondary text-fg-light [&_svg]:size-4">
						<Icon />
					</span>
					<div class="min-w-0 flex-1">
						<p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-fg-main">
							<span class="min-w-0 break-words">{session.label}</span>
							{#if session.current}<Badge tone="accent" size="sm">{text.thisDevice}</Badge>{/if}
						</p>
						{#if session.location || active}
							<p class="m-0 mt-0.5 text-xs text-fg-light">
								{#if session.location}<span>{session.location}</span>{/if}
								{#if session.location && active}<span aria-hidden="true"> · </span>{/if}
								{#if active}<span>{active}</span>{/if}
							</p>
						{/if}
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
