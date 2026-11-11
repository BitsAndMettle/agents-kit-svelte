<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { motionDuration } from '../state/motion.svelte';
	import { slide } from 'svelte/transition';
	import { LoaderCircle, TriangleAlert } from '@lucide/svelte';
	import { tick } from 'svelte';

	/** The risk text shown before the setting can be turned the risky way. */
	export interface RiskNotice {
		title: string;
		points: string[];
		/** Label of the "I understand…" checkbox. */
		acknowledge: string;
	}

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'onchange' | 'onChange'> {
		label: string;
		/** Whether the setting is on. The component never changes it itself. */
		checked: boolean;
		description?: string;
		risk: RiskNotice;
		/** Which direction needs acknowledgement. */
		riskOn?: 'on' | 'off';
		/** Where the setting applies, e.g. a machine or workspace. */
		scope?: string;
		/** The caller is applying a change: shows a spinner and locks the switch. */
		pending?: boolean;
		disabled?: boolean;
		lastChanged?: { by: string; at: string };
		onChange?: (next: boolean, detail: { acknowledged: boolean }) => void;
		class?: string;
	}

	let {
		label,
		checked,
		description = '',
		risk,
		riskOn = 'on',
		scope = '',
		pending = false,
		disabled = false,
		lastChanged,
		onChange,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();

	let open = $state(false);
	let acknowledged = $state(false);
	let switchEl = $state<HTMLButtonElement>();
	let checkboxEl = $state<HTMLInputElement>();

	let locked = $derived(disabled || pending);

	// One confirmation reports once; a new checked value or pending state re-arms it.
	let sent = $state(false);
	$effect(() => {
		void checked;
		void pending;
		sent = false;
	});

	// Release the lock if the caller refused the change and nothing else moved.
	$effect(() => {
		if (!sent) return;
		const timer = setTimeout(() => (sent = false), 4000);
		return () => clearTimeout(timer);
	});
	let riskyDirection = $derived(riskOn === 'on');
	let riskyNow = $derived(checked === riskyDirection);

	/** Opens the risk panel, with the box unticked, and moves focus to the checkbox. */
	async function openPanel(): Promise<void> {
		acknowledged = false;
		open = true;
		await tick();
		checkboxEl?.focus();
	}

	/** Closes the panel without changing the setting and returns focus to the switch. */
	async function closePanel(): Promise<void> {
		open = false;
		acknowledged = false;
		await tick();
		switchEl?.focus();
	}

	/** Flips the setting: the safe way at once, the risky way after acknowledgement. */
	function toggle(): void {
		if (locked) return;
		if (open) {
			void closePanel();
			return;
		}
		const next = !checked;
		if (next === riskyDirection) void openPanel();
		else if (!sent) {
			sent = true;
			onChange?.(next, { acknowledged: false });
		}
	}

	/** Reports the risky change once the box is ticked. */
	function confirm(): void {
		if (!acknowledged || locked || sent) return;
		sent = true;
		open = false;
		acknowledged = false;
		onChange?.(riskyDirection, { acknowledged: true });
		void tick().then(() => switchEl?.focus());
	}

	/**
	 * Escape cancels the open panel.
	 *
	 * @param event - Keydown from inside the panel.
	 */
	function onPanelKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			void closePanel();
		}
	}
</script>

<div {...rest}
	class={cn('w-full overflow-hidden rounded-[20px] border bg-card-bg ak-shadow-soft p-4 text-sm sm:p-5', riskyNow ? 'border-status-warning/50' : 'border-chat-border', className)}
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<p id="{uid}-label" class="text-[13px] font-semibold text-fg-main">{label}</p>
			{#if description}
				<p id="{uid}-desc" class="mt-0.5 text-[13px] leading-5 text-fg-light">{description}</p>
			{/if}
			<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
				{#if scope}
					<span class="rounded-full bg-chat-user px-2 py-0.5 text-[11px] font-medium text-fg-light">
						<span class="sr-only">Applies to </span>{scope}
					</span>
				{/if}
				{#if riskyNow}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-status-warning-subtle px-2 py-0.5 text-[11px] font-medium text-status-warning"
					>
						<TriangleAlert aria-hidden="true" class="size-3" />
						Risk accepted
					</span>
				{/if}
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-2 pt-0.5">
			{#if pending}
				<LoaderCircle
					aria-hidden="true"
					class="size-4 animate-spin text-fg-light motion-reduce:animate-none"
				/>
			{/if}
			<button
				bind:this={switchEl}
				type="button"
				role="switch"
				aria-checked={checked}
				aria-labelledby="{uid}-label"
				aria-describedby={description ? `${uid}-desc` : undefined}
				aria-busy={pending}
				aria-expanded={open}
				aria-controls={open ? `${uid}-panel` : undefined}
				aria-disabled={locked}
				onclick={toggle}
				class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 {checked
					? riskyNow
						? 'border-status-warning bg-status-warning'
						: 'border-chat-accent bg-chat-accent'
					: 'border-chat-border bg-chat-user'}"
			>
				<span
					aria-hidden="true"
					class="inline-block size-[18px] rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none {checked
						? 'translate-x-[22px]'
						: 'translate-x-[2px]'}"
				></span>
				<span class="sr-only">{checked ? 'On' : 'Off'}</span>
			</button>
		</div>
	</div>

	{#if open}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			id="{uid}-panel"
			role="group"
			aria-labelledby="{uid}-risk-title"
			tabindex="-1"
			onkeydown={onPanelKeydown}
			transition:slide={{ duration: motionDuration(180) }}
			class="mt-3 rounded-2xl border border-status-warning/40 bg-status-warning-subtle px-3.5 py-3"
		>
			<p
				id="{uid}-risk-title"
				role="alert"
				class="flex items-start gap-2 text-[13px] font-semibold text-fg-main"
			>
				<TriangleAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-status-warning" />
				<span class="min-w-0 break-words">{risk.title}</span>
			</p>
			<ul class="mt-2 list-disc space-y-1 pl-9 text-[13px] leading-5 text-fg-main">
				{#each risk.points as point, n (n)}
					<li class="break-words">{point}</li>
				{/each}
			</ul>
			<label class="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-5 text-fg-main">
				<input
					bind:this={checkboxEl}
					bind:checked={acknowledged}
					type="checkbox"
					class="mt-0.5 size-4 shrink-0"
				/>
				<span class="min-w-0 break-words">{risk.acknowledge}</span>
			</label>
			<div class="mt-3 flex flex-wrap items-center justify-end gap-1.5">
				<button type="button" onclick={() => !locked && closePanel()} class={pillClass('ghost', 'md', 'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed')}>Cancel</button>
				<button
					type="button"
					disabled={!acknowledged}
					aria-disabled={locked}
					onclick={confirm}
					class={pillClass('primary', 'md', 'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed')}
				>
					{riskyDirection ? 'Turn on' : 'Turn off'}
				</button>
			</div>
		</div>
	{/if}

	{#if lastChanged}
		<p class="mt-2.5 text-xs text-fg-light">
			Last changed by {lastChanged.by} · {lastChanged.at}
		</p>
	{/if}
</div>
