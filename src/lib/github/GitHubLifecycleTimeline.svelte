<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		Check,
		CircleDot,
		Eye,
		GitBranch,
		GitCommitHorizontal,
		GitMerge,
		GitPullRequest,
		ListChecks,
		Rocket,
		Tag,
		Tags
	} from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { fade } from 'svelte/transition';
	import { motionDuration, rise } from '../state/motion.svelte';
	import { badgeClass, PROGRESS_TRACK_CLASS, progressFillClass, TONE_SOFT_CLASS, type UiTone } from '../ui/styles';
	import type { GitHubLifecycleStage, GitHubLifecycleStageId } from '../types';
	import { LiveLoop } from './live-loop.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title' | 'description' | 'doneLabel' | 'status' | 'tone' | 'quiet' | 'headingLevel' | 'stages' | 'live' | 'current' | 'onSelectStage'> {
		/** The heading, which also names the section. */
		title?: string;
		/** A line under the heading. */
		description?: string;
		/** The badge once the last stage is reached, such as "Shipped". */
		doneLabel?: string;
		/** Where the thing stands, as the badge says it, in place of the stage in hand's label or `doneLabel`. */
		status?: string;
		/**
		 * Colour meaning of the status: the badge, the bar and the stage in hand take it. Left out, it is
		 * `accent` until the last stage and `success` after it. The badge's dot breathes only in `accent`.
		 */
		tone?: UiTone;
		/** Neutral stages: one that is done is a tick, one still ahead is muted, and only the stage in hand wears the tone. */
		quiet?: boolean;
		/** The heading's level. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		stages?: GitHubLifecycleStage[];
		/** Demo mode: plays the lifecycle stage by stage, then loops. Off by default. */
		live?: boolean;
		/** Index of the current stage when not live. Defaults to the last stage (shipped). */
		current?: number;
		onSelectStage?: (stage: GitHubLifecycleStage) => void;
		class?: string;
	}

	const ICONS: Record<GitHubLifecycleStageId, Component<{ class?: string; 'aria-hidden'?: 'true' }>> = {
		issue: CircleDot,
		triage: Tags,
		branch: GitBranch,
		commits: GitCommitHorizontal,
		'pull-request': GitPullRequest,
		review: Eye,
		checks: ListChecks,
		merge: GitMerge,
		deploy: Rocket,
		release: Tag
	};

	let {
		title,
		description,
		doneLabel,
		status,
		tone,
		quiet = false,
		headingLevel = 3,
		stages = [],
		live = false,
		current,
		onSelectStage,
		class: className = '',
		...rest
	}: Props = $props();

	const loop = new LiveLoop(() => stages.length - 1, 4);
	let selected = $state<number | null>(null);

	$effect(() => {
		if (!live) return;
		return loop.start(1100);
	});

	const activeIndex = $derived(live ? loop.step : (current ?? stages.length - 1));
	const focusIndex = $derived(selected ?? activeIndex);
	const focusStage = $derived(stages[Math.min(focusIndex, stages.length - 1)]);
	const shipped = $derived(activeIndex >= stages.length - 1);
	const look = $derived(tone ?? (shipped ? 'success' : 'accent'));
	/** The header's badge: the status, else the stage in hand, or `doneLabel` once all are done. */
	const badge = $derived(status ?? (shipped ? doneLabel : stages[activeIndex]?.label));
	const percent = $derived(Math.round((activeIndex / Math.max(1, stages.length - 1)) * 100));

	/**
	 * Pins a stage for inspection and freezes the live demo.
	 *
	 * @param index - Stage index to inspect.
	 */
	function inspect(index: number): void {
		loop.pause();
		selected = index;
		onSelectStage?.(stages[index]);
	}
</script>

<section {...rest}
	aria-label={title}
	class={cn('@container overflow-hidden rounded-card border border-card-border bg-card-bg text-sm', className)}
>
	{#if title || description || badge}
		<header class="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-border px-4 py-3">
			<div>
				{#if title}<svelte:element this={`h${headingLevel}`} class="font-semibold text-fg-main">{title}</svelte:element>{/if}
				{#if description}<p class="text-xs text-fg-light">{description}</p>{/if}
			</div>
			{#if shipped && badge}
				<span class={badgeClass(look)} in:fade={{ duration: motionDuration(160) }}>{badge}</span>
			{:else if badge}
				<span class={badgeClass(look)}>
					<!-- The accent is work under way; any other tone says nobody is at it now. -->
					{#if look === 'accent'}<span aria-hidden="true" class="ak-breathe size-1.5 rounded-full bg-accent-primary"></span>{/if}
					{badge}
				</span>
			{/if}
		</header>
	{/if}

	<div class="px-4 pt-4">
		<div class={PROGRESS_TRACK_CLASS} role="progressbar" aria-label="Lifecycle progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
			<span class={progressFillClass(look)} style="width: {percent}%"></span>
		</div>
	</div>

	<ol class="grid gap-1 p-3 @md:grid-cols-5 @md:gap-1.5 @4xl:grid-cols-10">
		{#each stages as stage, i (stage.id)}
			{@const Icon = ICONS[stage.id]}
			{@const done = i < activeIndex || shipped}
			{@const active = i === activeIndex && !shipped}
			<li>
				<button
					type="button"
					onclick={() => inspect(i)}
					aria-current={active ? 'step' : undefined}
					aria-pressed={selected === i}
					class="flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left transition-colors @md:flex-col @md:items-start @md:gap-1.5 @md:py-2 {selected ===
					i
						? 'bg-canvas-secondary'
						: 'hover:bg-canvas-primary'} {i > activeIndex && !quiet ? 'opacity-45' : ''}"
				>
					<!-- The neutral tint is a stage ahead's, so a neutral stage in hand keeps its glyph in ink. -->
					<span
						class="inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors @md:size-7 {done
							? quiet
								? 'bg-canvas-secondary text-fg-light'
								: 'bg-status-success-subtle text-status-success'
							: active
								? look === 'neutral'
									? 'bg-canvas-secondary text-fg-main'
									: TONE_SOFT_CLASS[look]
								: 'bg-canvas-secondary text-fg-light'}"
					>
						{#if done && quiet}<Check aria-hidden="true" class="size-3.5" />{:else}<Icon aria-hidden="true" class="size-3.5" />{/if}
					</span>
					<span class="text-xs font-medium {quiet && i > activeIndex ? 'text-fg-light' : 'text-fg-main'}">{stage.label}</span>
					{#if stage.timestamp && i <= activeIndex}
						<span class="ml-auto font-mono text-[10px] text-fg-light tabular-nums @md:ml-0">{stage.timestamp}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ol>

	{#if focusStage && (focusStage.actor || focusStage.detail)}
		{#key focusStage.id}
			<div class="mx-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-canvas-secondary px-3.5 py-2.5 text-xs" in:rise>
				<span class="font-semibold text-fg-main">{focusStage.label}</span>
				{#if focusStage.actor}<span class="text-fg-light">by <strong class="font-medium text-fg-main">{focusStage.actor}</strong></span>{/if}
				{#if focusStage.detail}<span class="min-w-0 flex-1 text-fg-light">{focusStage.detail}</span>{/if}
			</div>
		{/key}
	{/if}
</section>
