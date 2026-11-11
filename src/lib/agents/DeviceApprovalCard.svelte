<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { badgeClass, pillClass } from '../ui/styles';
	import { Check, Clock, Globe, Laptop, Loader, Monitor, ShieldCheck, Smartphone, Tablet, X } from '@lucide/svelte';
	import type { DeviceApprovalDevice, DeviceApprovalStatus, DeviceKind } from '../types';
	import { tick } from 'svelte';
	import { canApproveNow, formatRequestedAgo, groupCode, speakCode, timeLeft } from './device-approval';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'onApprove' | 'onDeny'> {
		/** The device asking for the same rights as this one. */
		device: DeviceApprovalDevice;
		/** Short match code shown on both screens, such as "482 913" or a few words. */
		code: string;
		/** ISO time the request was made. */
		requestedAt: string;
		/** Reference time for "requested" and "time left". Defaults to the time the card mounts. */
		now?: string | number | Date;
		/** ISO time the request stops being valid. */
		expiresAt?: string;
		/** What the device will be able to do once approved. */
		grants?: string[];
		/** Controlled state. When omitted the card tracks the person's own decision. */
		status?: DeviceApprovalStatus;
		onApprove?: () => void;
		onDeny?: () => void;
		class?: string;
	}

	let {
		device,
		code,
		requestedAt,
		now,
		expiresAt,
		grants = [],
		status,
		onApprove,
		onDeny,
		class: className = '',
		...rest
	}: Props = $props();

	const KIND_NOUN: Record<DeviceKind, string> = {
		phone: 'phone',
		tablet: 'tablet',
		laptop: 'laptop',
		desktop: 'computer',
		browser: 'browser'
	};

	let decided = $state<'approved' | 'denied' | null>(null);
	let confirmed = $state(false);
	/** Live clock, set only after mount so the server render has no time-dependent text. */
	let liveNow = $state<number | undefined>(undefined);
	let outcomeEl = $state<HTMLElement | null>(null);
	let wasOpen = false;

	// A new request (code or time) must never inherit an old tick or decision.
	$effect(() => {
		void code;
		void requestedAt;
		confirmed = false;
		decided = null;
	});

	// Release the lock once the agent answers with anything but 'pending'.
	$effect(() => {
		if (status !== undefined && status !== 'pending') decided = null;
	});

	$effect(() => {
		if (now !== undefined || !expiresAt) return;
		liveNow = Date.now();
		const id = setInterval(() => (liveNow = Date.now()), 1000);
		return () => clearInterval(id);
	});

	let clock = $derived(now ?? liveNow);
	let left = $derived(clock === undefined ? null : timeLeft(expiresAt, clock));
	let locked = $derived(decided !== null);
	let effective = $derived<DeviceApprovalStatus>(status ?? decided ?? 'pending');
	let open = $derived(effective === 'pending' || effective === 'approving');
	let busy = $derived(effective === 'approving');
	let expired = $derived(effective === 'pending' && !!left?.expired);
	let groups = $derived(groupCode(code));
	let spoken = $derived(speakCode(code));
	let noun = $derived(device.kind ? KIND_NOUN[device.kind] : 'device');
	let ago = $derived(clock === undefined ? '' : formatRequestedAgo(requestedAt, clock));
	let meta = $derived([device.platform, device.location].filter(Boolean).join(' · '));
	let canApprove = $derived(confirmed && !busy && !expired && open && !locked);

	let outcome = $derived(
		effective === 'approved'
			? { tone: 'success' as const, text: `${device.name} approved. It can now act with the same rights as this device.` }
			: effective === 'denied'
				? { tone: 'danger' as const, text: `${device.name} denied. Nothing was shared with it.` }
				: { tone: 'neutral' as const, text: `Request from ${device.name} expired. Ask it to try again.` }
	);

	$effect(() => {
		if (open) {
			wasOpen = true;
		} else if (wasOpen) {
			wasOpen = false;
			void tick().then(() => outcomeEl?.focus());
		}
	});

	function approve(): void {
		if (!canApprove) return;
		if (!canApproveNow({ confirmed, locked, open, expiresAt, now: now ?? Date.now() })) return;
		decided = 'approved';
		onApprove?.();
	}

	function deny(): void {
		if (!open || busy || locked) return;
		decided = 'denied';
		onDeny?.();
	}
</script>

{#snippet kindIcon(kind: DeviceKind | undefined)}
	{#if kind === 'phone'}
		<Smartphone aria-hidden="true" class="size-5" />
	{:else if kind === 'tablet'}
		<Tablet aria-hidden="true" class="size-5" />
	{:else if kind === 'laptop'}
		<Laptop aria-hidden="true" class="size-5" />
	{:else if kind === 'desktop'}
		<Monitor aria-hidden="true" class="size-5" />
	{:else}
		<Globe aria-hidden="true" class="size-5" />
	{/if}
{/snippet}

{#if !open}
	<div {...rest}
		bind:this={outcomeEl}
		tabindex="-1"
		role="status"
		class={cn(
			'flex w-full items-center gap-2.5 rounded-soft border border-chat-border bg-card-bg px-3.5 py-3 text-[13px] ak-shadow-soft-sm focus:outline-none focus-visible:outline-2',
			className
		)}
	>
		<span
			aria-hidden="true"
			class="inline-flex size-6 shrink-0 items-center justify-center rounded-full {outcome.tone === 'success'
				? 'bg-status-success-subtle text-status-success'
				: outcome.tone === 'danger'
					? 'bg-status-danger-subtle text-status-danger'
					: 'bg-canvas-secondary text-fg-light'}"
		>
			{#if outcome.tone === 'success'}
				<Check class="size-3.5" />
			{:else if outcome.tone === 'danger'}
				<X class="size-3.5" />
			{:else}
				<Clock class="size-3.5" />
			{/if}
		</span>
		<p class="min-w-0 flex-1 text-fg-main">{outcome.text}</p>
	</div>
{:else}
	<section {...rest}
		aria-label={`Approve ${device.name}`}
		class={cn('w-full overflow-hidden rounded-[20px] border border-chat-border bg-card-bg p-4 text-sm ak-shadow-soft sm:p-5', className)}
	>
		<div class="flex items-start gap-3">
			<span
				aria-hidden="true"
				class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-chat-accent-subtle text-chat-accent"
			>
				{@render kindIcon(device.kind)}
			</span>
			<div class="min-w-0 flex-1">
				<span class={badgeClass('accent')}>
					<ShieldCheck aria-hidden="true" />
					New {noun} wants in
				</span>
				<h4 class="mt-1.5 break-words text-base font-semibold tracking-[-0.01em] text-fg-main">{device.name}</h4>
				{#if meta}
					<p class="text-xs text-fg-light">{meta}</p>
				{/if}
				<p class="mt-0.5 text-xs text-fg-light">
					{#if ago}Requested {ago}{/if}{#if ago && left}<span aria-hidden="true">&nbsp;·&nbsp;</span><span class="sr-only">, </span>{/if}{#if left}
						<span class={left.expired ? 'font-medium text-status-danger' : left.ms < 60_000 ? 'font-medium text-status-warning' : ''}>{left.label}</span>
					{/if}
				</p>
			</div>
		</div>

		<div class="mt-4 rounded-2xl bg-chat-surface px-3 py-4 text-center">
			<p class="text-xs font-medium text-fg-light">Match code</p>
			<div role="group" aria-label="Match code" class="mt-1.5">
				<span class="sr-only">{spoken}</span>
				<div aria-hidden="true" class="flex flex-wrap items-center justify-center gap-x-4 font-mono text-3xl font-semibold tabular-nums tracking-[0.12em] text-fg-main sm:text-4xl">
					{#each groups as group, i (i)}
						<span>{group}</span>
					{/each}
				</div>
			</div>
			<p class="mx-auto mt-2 max-w-xs text-xs leading-5 text-fg-light">
				Approve only if this exact code is showing on your {noun}. If you did not start this, deny it.
			</p>
		</div>

		{#if grants.length > 0}
			<div class="mt-4">
				<p class="text-xs font-medium text-fg-light">Once approved it can</p>
				<ul class="mt-1.5 grid gap-1.5">
					{#each grants as grant, i (i)}
						<li class="flex items-start gap-2 text-[13px] leading-5 text-fg-main">
							<Check aria-hidden="true" class="mt-0.5 size-3.5 shrink-0 text-fg-light" />
							<span class="min-w-0 break-words">{grant}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<label class="mt-4 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-chat-border px-3 py-2.5 text-[13px] leading-5 text-fg-main {expired || busy ? 'opacity-60' : ''}">
			<input
				type="checkbox"
				bind:checked={confirmed}
				disabled={expired || busy || locked}
				class="mt-0.5 size-4 shrink-0 accent-accent-primary"
			/>
			<span>
				The code on my {noun} is
				<span class="font-mono font-semibold tabular-nums"><span aria-hidden="true">{groups.join(' ')}</span><span class="sr-only">{spoken}</span></span>
			</span>
		</label>

		<div class="mt-3 flex flex-wrap items-center justify-end gap-2">
			<button type="button" disabled={busy || locked} onclick={deny} class={pillClass('danger', 'md')}>
				<X aria-hidden="true" />
				Deny
			</button>
			<button type="button" disabled={!canApprove} onclick={approve} class={pillClass('primary', 'md')}>
				{#if busy}
					<Loader aria-hidden="true" class="animate-spin motion-reduce:animate-none" />
					Approving…
				{:else}
					<Check aria-hidden="true" />
					Approve
				{/if}
			</button>
		</div>
		{#if expired}
			<p role="status" class="mt-2 text-right text-xs font-medium text-status-danger">
				This request expired. Ask the {noun} to try again.
			</p>
		{:else if !confirmed}
			<p class="mt-2 text-right text-xs text-fg-light">Tick the box to turn on Approve.</p>
		{/if}
	</section>
{/if}
