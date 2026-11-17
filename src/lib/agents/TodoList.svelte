<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CircleCheck, ListTodo, X } from '@lucide/svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';
	import AgentDisclosure from './AgentDisclosure.svelte';
	import ThinkingShimmer from './ThinkingShimmer.svelte';
	import { isImeComposing, summarizeTodos } from '../state/chat-helpers';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { pillClass } from '../ui/styles';
	import type { TodoItem } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title' | 'items' | 'defaultOpen'> {
		title?: string;
		/** The rows. Bindable: an editable list writes its rows here as they stand. */
		items: TodoItem[];
		defaultOpen?: boolean;
		/** Rows can be removed, moved and added by a title, and a row's `detail` opens on a press. */
		editable?: boolean;
		/** The primary button under an editable list, given the rows as they stand. No handler, no button. */
		onSubmit?: (items: TodoItem[]) => void;
		submitLabel?: string;
		class?: string;
	}

	let {
		title = 'Implementation plan',
		items = $bindable(),
		defaultOpen = true,
		editable = false,
		onSubmit,
		submitLabel = 'Done',
		class: className = '',
		...rest
	}: Props = $props();

	let isOpen = $state(true);

	$effect(() => {
		isOpen = defaultOpen;
	});

	let summary = $derived(summarizeTodos(items));
	let panelId = $derived(`todo-list-${items[0]?.id ?? 'panel'}`);
	let completionRatio = $derived(
		summary.totalCount > 0 ? Math.round((summary.completedCount / summary.totalCount) * 100) : 0
	);

	let added = 0;
	let draft = $state('');
	let listEl: HTMLOListElement | undefined = $state();
	let addField: HTMLInputElement | undefined = $state();

	/** Once the list has redrawn, focuses `control` on row `index`, or the add field when there is no such row. */
	async function focusRow(control: string, index: number): Promise<void> {
		await tick();
		(listEl?.querySelectorAll<HTMLElement>(`[data-control="${control}"]`)[index] ?? addField)?.focus();
	}

	function move(index: number, by: -1 | 1): void {
		const to = index + by;
		if (to < 0 || to >= items.length) return;
		const next = [...items];
		[next[index], next[to]] = [next[to]!, next[index]!];
		items = next;
		void focusRow(by < 0 ? 'up' : 'down', to);
	}

	function remove(index: number): void {
		items = items.filter((_, at) => at !== index);
		void focusRow('remove', Math.min(index, items.length - 1));
	}

	function add(): void {
		const label = draft.trim();
		if (!label) return;
		items = [...items, { id: `added-${Date.now()}-${++added}`, label, status: 'pending' }];
		draft = '';
		addField?.focus();
	}

	const progressTween = new Tween(0, { duration: 280, easing: cubicOut });

	$effect(() => {
		void progressTween.set(completionRatio, {
			duration: prefersReducedMotion.current ? 0 : 280
		});
	});
</script>

<div {...rest} class={cn('w-full overflow-hidden rounded-soft border border-chat-border bg-card-bg ak-shadow-soft-sm text-sm', className)}>
	<button
		type="button"
		aria-expanded={isOpen}
		aria-controls={panelId}
		onclick={() => (isOpen = !isOpen)}
		class="group flex h-11 w-full items-center gap-2.5 px-3.5 text-left text-fg-light outline-none transition-colors hover:text-fg-main"
	>
		{#key summary.allCompleted}
			<span
				in:fade={{ duration: motionDuration(140) }}
				aria-hidden="true"
				class="inline-flex size-4 shrink-0 items-center justify-center {summary.allCompleted
					? 'text-status-success'
					: 'text-fg-light group-hover:text-fg-main'}"
			>
				{#if summary.allCompleted}
					<CircleCheck class="size-4" />
				{:else}
					<ListTodo class="size-4" />
				{/if}
			</span>
		{/key}

		<span class="font-medium text-fg-main">{title}</span>

		{#if summary.inProgressItem && !isOpen}
			<span
				in:fade={{ duration: motionDuration(140) }}
				class="min-w-0 flex-1 truncate text-xs text-fg-light"
			>
				· {summary.inProgressItem.label}
			</span>
		{/if}

		<span class="ml-auto font-mono text-xs tabular-nums text-fg-light">
			{summary.completedCount}/{summary.totalCount}
		</span>

		<ChevronDown
			aria-hidden="true"
			class="size-3.5 shrink-0 text-fg-light transition-transform duration-200 group-hover:text-fg-main {isOpen
				? 'rotate-180'
				: ''}"
		/>
	</button>

	<!-- Svelte 5 Tween progress bar -->
	<div class="h-px w-full overflow-hidden bg-canvas-border">
		<div
			class="h-full transition-colors {summary.allCompleted
				? 'bg-status-success'
				: 'bg-accent-primary'}"
			style="width: {progressTween.current}%;"
		></div>
	</div>

	<AgentDisclosure id={panelId} open={isOpen}>
		<ol bind:this={listEl} class="space-y-0.5 border-t border-chat-border/70 px-2 py-2">
			{#each items as item, index (item.id)}
				<li
					animate:flip={{ duration: motionDuration(220), easing: cubicOut }}
					in:rise
					class="flex min-h-9 items-start gap-2.5 rounded-[10px] px-1.5 py-1 text-sm leading-5 transition-colors {item.status ===
					'in-progress'
						? 'bg-chat-surface/60'
						: ''}"
				>
					{#key item.status}
						<svg
							in:scale={{ start: 0.9, opacity: 0, duration: motionDuration(140), easing: cubicOut }}
							aria-hidden="true"
							viewBox="0 0 20 20"
							fill="none"
							class="size-5 shrink-0"
						>
							{#if item.status === 'pending'}
								<circle
									cx="10"
									cy="10"
									r="7"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-dasharray="2 3"
									stroke-linecap="round"
									class="text-fg-light/60"
								/>
							{:else if item.status === 'in-progress'}
								<circle
									cx="10"
									cy="10"
									r="7"
									stroke="currentColor"
									stroke-width="1.5"
									class="text-accent-primary/25"
								/>
								<circle
									cx="10"
									cy="10"
									r="7"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-dasharray="12 32"
									class="origin-center animate-spin text-accent-primary"
								/>
							{:else if item.status === 'completed'}
								<circle cx="10" cy="10" r="7" class="fill-fg-main" />
								<path
									d="M7 10.25L9 12.25L13.25 7.75"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="text-fg-inverse"
								/>
							{:else}
								<circle
									cx="10"
									cy="10"
									r="7"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-dasharray="2 3"
									stroke-linecap="round"
									class="text-fg-light/50"
								/>
								<path
									d="M7.5 12.5L12.5 7.5"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									class="text-fg-light"
								/>
							{/if}
						</svg>
					{/key}

					<div class="min-w-0 flex-1">
						{#snippet rowLabel()}
							<span
								class="block transition-colors {item.status === 'completed' ||
								item.status === 'cancelled'
									? 'line-through text-fg-light'
									: 'text-fg-main'}"
							>
								{#if item.status === 'in-progress'}
									<ThinkingShimmer label={item.label} />
								{:else}
									{item.label}
								{/if}
							</span>
						{/snippet}
						{#if editable && item.detail}
							<details class="group/detail">
								<summary class="flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
									{@render rowLabel()}
									<ChevronRight aria-hidden="true" class="size-3.5 shrink-0 text-fg-light transition-transform group-open/detail:rotate-90" />
								</summary>
								<p class="mt-0.5 text-xs whitespace-pre-line text-fg-light">{item.detail}</p>
							</details>
						{:else}
							{@render rowLabel()}
							{#if item.detail}
								<span class="mt-0.5 block text-xs text-fg-light">{item.detail}</span>
							{/if}
						{/if}
					</div>
					{#if editable}
						<span class="flex shrink-0 items-center">
							<button type="button" data-control="up" aria-label="Move {item.label} up" aria-disabled={index === 0} onclick={() => move(index, -1)} class={pillClass('ghost', 'icon-sm', 'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed')}><ArrowUp aria-hidden="true" /></button>
							<button type="button" data-control="down" aria-label="Move {item.label} down" aria-disabled={index === items.length - 1} onclick={() => move(index, 1)} class={pillClass('ghost', 'icon-sm', 'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed')}><ArrowDown aria-hidden="true" /></button>
							<button type="button" data-control="remove" aria-label="Remove {item.label}" onclick={() => remove(index)} class={pillClass('ghost', 'icon-sm')}><X aria-hidden="true" /></button>
						</span>
					{/if}
				</li>
			{/each}
		</ol>
		{#if editable}
			<div class="flex items-center gap-2 px-3.5 pb-3">
				<input
					bind:this={addField}
					bind:value={draft}
					aria-label="Add a step"
					placeholder="Add a step"
					onkeydown={(event) => {
						if (event.key !== 'Enter' || isImeComposing(event)) return;
						event.preventDefault();
						add();
					}}
					class="h-8 min-w-0 flex-1 rounded-full bg-chat-surface px-3.5 text-base sm:pointer-fine:text-[13px] text-fg-main placeholder:text-fg-light"
				/>
				<button type="button" disabled={!draft.trim()} onclick={add} class={pillClass('ghost', 'sm')}>Add</button>
				{#if onSubmit}
					<button type="button" onclick={() => onSubmit(items)} class={pillClass('primary', 'sm')}>{submitLabel}</button>
				{/if}
			</div>
		{/if}
	</AgentDisclosure>
</div>
