<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { Check, LoaderCircle, ShieldCheck } from '@lucide/svelte';
	import {
		levelChanges,
		levelDirection,
		stepIndex,
		type AutonomyLevel,
		type LevelDirection
	} from './level-dial';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title' | 'onchange' | 'onChange'> {
		/** Levels in order from least to most autonomy. */
		levels: AutonomyLevel[];
		/** Id of the current level. The component never changes it itself. */
		value: string;
		title?: string;
		disabled?: boolean;
		/** A level the caller is applying: shows a spinner on it and locks the control. */
		pending?: string;
		/** Called once the person confirms (up) or applies (down) a level. */
		onChange?: (levelId: string, detail: { direction: LevelDirection }) => void;
		class?: string;
	}

	let {
		levels,
		value,
		title = '',
		disabled = false,
		pending,
		onChange,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();

	let previewId = $state<string | null>(null);
	let buttons: (HTMLButtonElement | undefined)[] = [];

	// A new current value (the caller applied a change) ends any preview.
	$effect(() => {
		void value;
		previewId = null;
	});

	let locked = $derived(disabled || pending !== undefined);
	let currentIndex = $derived(levels.findIndex((level) => level.id === value));
	let shownId = $derived(previewId ?? value);
	let shownIndex = $derived(Math.max(levels.findIndex((level) => level.id === shownId), 0));
	let shown = $derived(levels[shownIndex]);
	let current = $derived(levels[currentIndex]);
	let direction = $derived(levelDirection(levels, value, shownId));
	let changes = $derived(current && shown && direction ? levelChanges(current, shown) : null);
	let pendingLevel = $derived(levels.find((level) => level.id === pending));

	/**
	 * Moves the preview to a level, without applying it.
	 *
	 * @param index - Index of the level to preview.
	 * @param focus - Whether to move focus to its segment.
	 */
	function preview(index: number, focus = false): void {
		const level = levels[index];
		if (!level || locked) return;
		previewId = level.id === value ? null : level.id;
		if (focus) buttons[index]?.focus();
	}

	/**
	 * Arrow keys, Home and End move the preview along the track.
	 *
	 * @param event - The keydown event on a segment.
	 */
	function onKeydown(event: KeyboardEvent): void {
		let delta = 0;
		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') delta = 1;
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') delta = -1;
		else if (event.key === 'Home') delta = -levels.length;
		else if (event.key === 'End') delta = levels.length;
		else return;
		event.preventDefault();
		preview(stepIndex(shownIndex, delta, levels.length), true);
	}

	/** Reports the previewed level as the person's choice. */
	function apply(): void {
		if (!direction || !shown || locked) return;
		onChange?.(shown.id, { direction });
	}

	/** Drops the preview and returns to the current level. */
	function cancel(): void {
		previewId = null;
		buttons[Math.max(currentIndex, 0)]?.focus();
	}
</script>

<div {...rest}
	class={cn('w-full overflow-hidden rounded-[20px] border border-chat-border bg-card-bg ak-shadow-soft p-4 text-sm sm:p-5', className)}
>
	<div class="flex items-center gap-2">
		<span
			aria-hidden="true"
			class="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-chat-accent-subtle text-chat-accent"
		>
			<ShieldCheck class="size-3.5" />
		</span>
		<h4 id="{uid}-title" class="min-w-0 text-base font-semibold tracking-[-0.01em] text-fg-main">
			{title || 'Autonomy'}
		</h4>
	</div>

	<div
		role="radiogroup"
		aria-labelledby="{uid}-title"
		aria-disabled={locked}
		class="mt-4 grid gap-1"
		style="grid-template-columns: repeat({Math.max(levels.length, 1)}, minmax(0, 1fr));"
	>
		{#each levels as level, i (level.id)}
			{@const isCurrent = level.id === value}
			{@const isShown = i === shownIndex}
			<button
				bind:this={buttons[i]}
				type="button"
				role="radio"
				aria-checked={isShown}
				aria-describedby="{uid}-detail"
				tabindex={isShown ? 0 : -1}
				disabled={locked}
				onclick={() => preview(i)}
				onkeydown={onKeydown}
				class="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 pt-1 pb-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 enabled:hover:bg-chat-surface"
			>
				<span class="relative flex h-6 w-full items-center justify-center">
					<span
						aria-hidden="true"
						class="absolute inset-y-[11px] left-0 right-1/2 {i === 0 ? 'hidden' : ''} {i <= currentIndex
							? 'bg-chat-accent'
							: 'bg-chat-border'}"
					></span>
					<span
						aria-hidden="true"
						class="absolute inset-y-[11px] left-1/2 right-0 {i === levels.length - 1
							? 'hidden'
							: ''} {i < currentIndex ? 'bg-chat-accent' : 'bg-chat-border'}"
					></span>
					<span
						aria-hidden="true"
						class="relative inline-flex size-6 items-center justify-center rounded-full border-2 text-[10px] tabular-nums transition-[background-color,border-color,box-shadow] duration-200 {isCurrent
							? 'border-chat-accent bg-chat-accent text-white'
							: isShown
								? 'border-chat-accent bg-card-bg text-chat-accent ring-4 ring-chat-accent-subtle'
								: 'border-chat-border bg-card-bg text-fg-light'}"
					>
						{#if pending === level.id}
							<LoaderCircle class="size-3.5 animate-spin motion-reduce:animate-none" />
						{:else if isCurrent}
							<Check class="size-3.5" strokeWidth={3} />
						{:else}
							{i + 1}
						{/if}
					</span>
				</span>
				<span
					class="w-full text-[11px] leading-4 [overflow-wrap:normal] [word-break:keep-all] sm:text-xs {isShown
						? 'font-semibold text-fg-main'
						: 'font-medium text-fg-light'}"
				>
					{level.label}
					<span class="sr-only">
						, {i + 1} of {levels.length}{isCurrent ? ', current level' : ''}{pending === level.id
							? ', applying'
							: ''}{isShown && !isCurrent ? ', previewing' : ''}
					</span>
				</span>
			</button>
		{/each}
	</div>

	{#if shown}
		<div id="{uid}-detail" class="mt-3 rounded-2xl bg-chat-surface px-3.5 py-3">
			<p class="text-[13px] font-medium text-fg-main">
				{shown.label}
				{#if shownId === value}
					<span class="ml-1 rounded-full bg-chat-accent-subtle px-2 py-0.5 text-[11px] font-medium text-chat-accent">
						Current
					</span>
				{:else}
					<span class="ml-1 rounded-full bg-chat-user px-2 py-0.5 text-[11px] font-medium text-fg-light">
						Preview
					</span>
				{/if}
			</p>
			<p class="mt-1 text-[13px] leading-5 text-fg-light">{shown.summary}</p>

			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				{#if shown.allows?.length}
					<div>
						<p class="text-[11px] font-semibold tracking-wide text-status-success uppercase">Does on its own</p>
						<ul class="mt-1.5 space-y-1">
							{#each shown.allows as item (item)}
								<li class="flex items-start gap-1.5 text-[13px] leading-5 text-fg-main">
									<Check aria-hidden="true" class="mt-0.5 size-3.5 shrink-0 text-status-success" />
									<span class="min-w-0 break-words">{item}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if shown.asks?.length}
					<div>
						<p class="text-[11px] font-semibold tracking-wide text-fg-light uppercase">Still asks you</p>
						<ul class="mt-1.5 space-y-1">
							{#each shown.asks as item (item)}
								<li class="flex items-start gap-1.5 text-[13px] leading-5 text-fg-main">
									<span aria-hidden="true" class="mt-0.5 w-3.5 shrink-0 text-center text-fg-light">?</span>
									<span class="min-w-0 break-words">{item}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if direction === 'up' && changes && shown}
		<div
			role="group"
			aria-label="Confirm {shown.label}"
			class="mt-3 rounded-2xl border border-status-warning/40 bg-status-warning-subtle px-3.5 py-3"
		>
			<p class="text-[13px] font-medium text-fg-main">
				Moving up to {shown.label} gives the agent more freedom.
			</p>
			{#if changes.allowsAdded.length}
				<p class="mt-1.5 text-xs text-fg-light">It will newly do without asking:</p>
				<ul class="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-fg-main">
					{#each changes.allowsAdded as item (item)}
						<li class="break-words">{item}</li>
					{/each}
				</ul>
			{/if}
			{#if changes.asksRemoved.length}
				<p class="mt-1.5 text-xs text-fg-light">It will stop asking about:</p>
				<ul class="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-fg-main">
					{#each changes.asksRemoved as item (item)}
						<li class="break-words">{item}</li>
					{/each}
				</ul>
			{/if}
			<div class="mt-3 flex flex-wrap items-center justify-end gap-1.5">
				<button type="button" disabled={locked} onclick={cancel} class={pillClass('ghost', 'md')}>
					Cancel
				</button>
				<button type="button" disabled={locked} onclick={apply} class={pillClass('primary', 'md')}>
					Allow {shown.label}
				</button>
			</div>
		</div>
	{:else if direction === 'down' && shown}
		<div class="mt-3 flex flex-wrap items-center justify-end gap-1.5">
			<button type="button" disabled={locked} onclick={cancel} class={pillClass('ghost', 'md')}>
				Cancel
			</button>
			<button type="button" disabled={locked} onclick={apply} class={pillClass('primary', 'md')}>
				Switch to {shown.label}
			</button>
		</div>
	{/if}

	<p class="sr-only" role="status" aria-live="polite">
		{pendingLevel ? `Applying ${pendingLevel.label}` : ''}
	</p>
</div>
