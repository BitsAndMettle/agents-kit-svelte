<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import { onMount } from 'svelte';
	import { Pause, Play, RotateCcw, SkipBack, SkipForward } from '@lucide/svelte';
	import { rise } from '../state/motion.svelte';
	import { formatClock, phaseColor } from './scale';
	import type { PhaseBand, RunMark } from './types';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Length of the run, in the same unit as `now` (seconds by default). */
		duration: number;
		/** The replay position. Bind it and feed it to your charts. */
		now?: number;
		/** Whether the replay is running. Bindable. */
		playing?: boolean;
		/** Run time per real second. Bindable. */
		speed?: number;
		/** Speeds offered in the speed switch. */
		speeds?: number[];
		/** Colour the track by phase. */
		phases?: PhaseBand[];
		/** Moments to tick on the track and step between: handoffs, tool calls, errors. */
		marks?: RunMark[];
		/** Start playing from 0 when mounted (skipped when the person prefers reduced motion). */
		autoplay?: boolean;
		/** Formats a time value. Defaults to `m:ss`. */
		formatTime?: (t: number) => string;
		/** Called when the person clicks a mark on the track. */
		onSelectMark?: (mark: RunMark) => void;
		class?: string;
	}

	let {
		duration,
		now = $bindable(0),
		playing = $bindable(false),
		speed = $bindable(8),
		speeds = [4, 8, 16],
		phases = [],
		marks = [],
		autoplay = false,
		formatTime = formatClock,
		onSelectMark,
		class: className = '',
		...rest
	}: Props = $props();

	let track = $state<HTMLDivElement>();
	let dragging = $state(false);
	let hoverT = $state<number | null>(null);
	let hoverMark = $state<string | null>(null);

	/** Playhead position: follows `now` exactly while playing or dragging, springs on jumps. */
	const head = new Spring(0, { stiffness: 0.18, damping: 0.75 });
	$effect(() => {
		void head.set(now, { instant: playing || dragging || prefersReducedMotion.current });
	});

	let sorted = $derived([...marks].sort((a, b) => a.t - b.t));
	let current = $derived([...sorted].reverse().find((m) => m.t <= now) ?? null);
	let phase = $derived(phases.find((p) => now >= p.start && now < p.end) ?? (now >= duration ? phases.at(-1) : undefined));

	let frame = 0;
	let lastTs = 0;
	function tick(ts: number): void {
		if (!playing) return;
		const dt = lastTs ? (ts - lastTs) / 1000 : 0;
		lastTs = ts;
		now = Math.min(duration, now + dt * speed);
		if (now >= duration) {
			playing = false;
			return;
		}
		frame = requestAnimationFrame(tick);
	}
	$effect(() => {
		if (playing) {
			lastTs = 0;
			frame = requestAnimationFrame(tick);
		}
		return () => cancelAnimationFrame(frame);
	});
	onMount(() => {
		if (autoplay && !prefersReducedMotion.current) {
			now = 0;
			playing = true;
		}
	});

	function toggle(): void {
		if (!playing && now >= duration) now = 0;
		playing = !playing;
	}
	function restart(): void {
		now = 0;
		playing = true;
	}
	function seek(t: number): void {
		now = Math.max(0, Math.min(duration, t));
	}
	function step(dir: 1 | -1): void {
		playing = false;
		const target = dir > 0 ? sorted.find((m) => m.t > now + 0.5) : [...sorted].reverse().find((m) => m.t < now - 0.5);
		seek(target ? target.t : dir > 0 ? duration : 0);
	}

	function tAt(clientX: number): number {
		const rect = track?.getBoundingClientRect();
		if (!rect || rect.width === 0) return 0;
		return (Math.max(0, Math.min(rect.width, clientX - rect.left)) / rect.width) * duration;
	}
	function handleDown(event: PointerEvent): void {
		if (event.button !== 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragging = true;
		playing = false;
		seek(tAt(event.clientX));
	}
	function handleMove(event: PointerEvent): void {
		hoverT = tAt(event.clientX);
		if (dragging) seek(hoverT);
	}
	function handleKey(event: KeyboardEvent): void {
		const big = event.shiftKey ? duration / 10 : duration / 50;
		if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
			event.preventDefault();
			playing = false;
			seek(now + (event.key === 'ArrowRight' ? big : -big));
		} else if (event.key === 'Home' || event.key === 'End') {
			event.preventDefault();
			playing = false;
			seek(event.key === 'Home' ? 0 : duration);
		} else if (event.key === ' ' || event.key === 'k') {
			event.preventDefault();
			toggle();
		} else if (event.key === '.' || event.key === ',') {
			step(event.key === '.' ? 1 : -1);
		}
	}

	function pct(t: number): string {
		return `${(Math.max(0, Math.min(duration, t)) / Math.max(1e-9, duration)) * 100}%`;
	}
	const MARK_TONE: Record<NonNullable<RunMark['kind']>, string> = {
		handoff: 'bg-accent-primary',
		tool: 'bg-fg-light',
		decision: 'bg-status-info',
		error: 'bg-status-danger',
		done: 'bg-status-success'
	};
	let nearHover = $derived(hoverT === null ? null : (sorted.find((m) => Math.abs(m.t - (hoverT ?? 0)) < duration / 80) ?? null));
	let tipMark = $derived(hoverMark ? (marks.find((m) => m.id === hoverMark) ?? null) : nearHover);
</script>

<div {...rest} class={cn('rounded-card border border-card-border bg-card-bg px-4 py-3 ak-shadow-btn', className)}>
	<div class="flex items-center gap-3">
		<div class="flex items-center gap-0.5">
			<button type="button" class="grid size-7 place-items-center rounded-full text-fg-light transition-colors hover:bg-canvas-secondary hover:text-fg-main" onclick={() => step(-1)} aria-label="Previous moment"><SkipBack class="size-3.5" aria-hidden="true" /></button>
			<button
				type="button"
				class="relative grid size-9 place-items-center rounded-full bg-accent-primary text-fg-inverse shadow-soft-sm transition-transform duration-150 hover:scale-105 active:scale-95"
				onclick={toggle}
				aria-label={playing ? 'Pause' : now >= duration ? 'Replay' : 'Play'}
			>
				{#key playing}
					<span class="absolute inset-0 grid place-items-center" in:rise={{ y: 4, duration: 140 }}>
						{#if playing}<Pause class="size-4" aria-hidden="true" />{:else if now >= duration}<RotateCcw class="size-4" aria-hidden="true" />{:else}<Play class="ml-0.5 size-4" aria-hidden="true" />{/if}
					</span>
				{/key}
			</button>
			<button type="button" class="grid size-7 place-items-center rounded-full text-fg-light transition-colors hover:bg-canvas-secondary hover:text-fg-main" onclick={() => step(1)} aria-label="Next moment"><SkipForward class="size-3.5" aria-hidden="true" /></button>
		</div>

		<div class="min-w-0 flex-1">
			<div class="mb-1 flex items-center justify-between gap-3 text-[11px]">
				<div class="relative h-4 min-w-0 flex-1 overflow-hidden" aria-live="polite">
					{#key current?.id}
						<p class="absolute inset-0 truncate text-fg-main" in:rise={{ y: 6, duration: 200 }}>
							{#if phase}<span class="mr-1.5 font-medium tracking-wide uppercase" style:color={phaseColor(phase.id)}>{phase.label}</span>{/if}
							{current?.label ?? 'Run started'}
						</p>
					{/key}
				</div>
				<span class="shrink-0 font-mono text-fg-light tabular-nums"><span class="text-fg-main">{formatTime(now)}</span> / {formatTime(duration)}</span>
			</div>

			<div
				bind:this={track}
				class="group/track relative h-6 cursor-pointer touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
				role="slider"
				tabindex="0"
				aria-label="Replay position"
				aria-valuemin={0}
				aria-valuemax={Math.round(duration)}
				aria-valuenow={Math.round(now)}
				aria-valuetext="{formatTime(now)}{current ? `, ${current.label}` : ''}"
				onpointerdown={handleDown}
				onpointermove={handleMove}
				onpointerup={() => (dragging = false)}
				onpointerleave={() => (hoverT = null)}
				onkeydown={handleKey}
			>
				<!-- Track: phases, dimmed ahead of the playhead -->
				<div class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-canvas-secondary transition-[height] duration-150 group-hover/track:h-2.5">
					{#each phases as p (p.id)}
						<span class="absolute inset-y-0 opacity-30" style:left={pct(p.start)} style:width="calc({pct(p.end)} - {pct(p.start)})" style:background={phaseColor(p.id)}></span>
						<span class="absolute inset-y-0" style:left={pct(p.start)} style:width="calc(min({pct(p.end)}, {pct(head.current)}) - {pct(p.start)})" style:background={phaseColor(p.id)}></span>
					{/each}
					{#if !phases.length}<span class="absolute inset-y-0 left-0 bg-accent-primary" style:width={pct(head.current)}></span>{/if}
					{#if hoverT !== null && !dragging}<span class="absolute inset-y-0 left-0 bg-fg-main/10" style:width={pct(hoverT)}></span>{/if}
				</div>

				{#each sorted as m (m.id)}
					<button
						type="button"
						tabindex="-1"
						aria-label="{m.label} at {formatTime(m.t)}"
						class="absolute top-1/2 z-10 h-4 w-2.5 -translate-x-1/2 -translate-y-1/2"
						style:left={pct(m.t)}
						onpointerdown={(e) => e.stopPropagation()}
						onpointerenter={() => (hoverMark = m.id)}
						onpointerleave={() => (hoverMark = null)}
						onclick={() => {
							playing = false;
							seek(m.t);
							onSelectMark?.(m);
						}}
					>
						<span class={cn('mx-auto block h-3 w-[3px] rounded-full ring-2 ring-card-bg transition-transform duration-150', MARK_TONE[m.kind ?? 'tool'], (hoverMark === m.id || current?.id === m.id) && 'scale-y-150', m.t > now && 'opacity-50')}></span>
					</button>
				{/each}

				<span
					class={cn('pointer-events-none absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card-bg bg-fg-main shadow-soft-sm transition-transform duration-150', dragging ? 'scale-125' : 'group-hover/track:scale-110')}
					style:left={pct(head.current)}
				></span>

				{#if tipMark || (hoverT !== null && !dragging)}
					{@const tt = tipMark?.t ?? hoverT ?? 0}
					<span
						class="pointer-events-none absolute bottom-full z-30 mb-1.5 -translate-x-1/2 rounded-chip border border-card-border bg-card-bg px-2 py-1 text-[11px] whitespace-nowrap shadow-soft"
						style:left={pct(tt)}
					>
						<span class="font-mono text-fg-light tabular-nums">{formatTime(tt)}</span>{#if tipMark}<span class="ml-1.5 text-fg-main">{tipMark.label}</span>{/if}
					</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-0.5 rounded-full bg-canvas-secondary p-0.5" role="group" aria-label="Speed">
			{#each speeds as s (s)}
				<button type="button" aria-pressed={speed === s} onclick={() => (speed = s)} class={cn('rounded-full px-2 py-0.5 font-mono text-[11px] transition-colors', speed === s ? 'bg-card-bg text-fg-main ak-shadow-btn' : 'text-fg-light hover:text-fg-main')}>{s}×</button>
			{/each}
		</div>
	</div>
</div>
