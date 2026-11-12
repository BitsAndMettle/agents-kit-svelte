<script lang="ts" module>
	/** Every word UsageMeter shows or announces. */
	export interface UsageMeterLabels {
		/** Value against limit: "42 of 50 seats". */
		of: (value: string, limit: string) => string;
		/** Shown in place of a limit. */
		unlimited: string;
		/** Usage without a limit: "12.4 GB used". */
		used: (value: string) => string;
		/** Reset line: "Resets in 3 days" or "Resets on 1 Dec". */
		resets: (when: string) => string;
		/** Relative reset time, when `now` is given: "in 3 days", "in 5 hours", "within the hour". */
		inTime: (days: number, hours: number) => string;
		/** Absolute reset date, when `now` is not given: "on 1 Dec". */
		onDate: (date: string) => string;
		/** Near the warning threshold. */
		near: string;
		/** At or over the limit. */
		over: string;
		/** Headroom: "8 seats left". */
		remaining: (amount: string) => string;
		/** Overage: "3 seats over". */
		overBy: (amount: string) => string;
		/** Shown (and announced) when there is no data. */
		none: string;
	}

	export type UsageMeterVariant = 'bar' | 'row' | 'compact';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { TONE_FILL_CLASS, type UiTone } from '../../ui/styles';
	import { toMillis, type TimeInput } from '../../core/time';
	import { isThenable } from '../../core/promise';
	import { Button } from '../../primitives/actions';
	import { Badge } from '../../primitives/display';
	import { actionButtonProps, type MeterSegment, type SettingsAction } from '../shared';
	import { timeUntil, usageLevel, usagePercent, usageScale, usageTone, type UsageThresholds } from './meter';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** What is measured ("Seats", "Storage"). Names the meter. */
		label: string;
		/** Usage. Undefined shows an em dash and "No data yet". With `segments`, defaults to their sum. */
		value?: number;
		/** The limit. `null` means unlimited (no meter is drawn, only the amount used). */
		limit?: number | null;
		/** Top of the scale. Pass the same `max` to every meter in a table so they share one scale. Default: the limit (or the largest value shown). */
		max?: number;
		/** Unit after plain numbers ("seats", "GB"). Ignored when `format` is given. */
		unit?: string;
		/** Turns a number into text ("18.2 GB"). Default: grouped digits, one decimal, then `unit`. */
		format?: (n: number) => string;
		/** Help text under the meter. */
		description?: string | Snippet;
		/** Fractions of the limit that turn the meter to warning (default 0.8) and danger (default 1). */
		thresholds?: UsageThresholds;
		/** Forces a tone instead of deriving it from the thresholds. The words still follow the thresholds. */
		tone?: UiTone;
		/** The billing or reset period: a label ("This month") and when it resets. */
		period?: { label?: string; resetsAt?: TimeInput };
		/** The current time, for "Resets in 3 days". Without it the reset date is shown instead. */
		now?: TimeInput;
		/** Stacked parts with a legend (storage by kind). */
		segments?: MeterSegment[];
		/** A tick on the scale with its own label (a pause floor, a soft cap). */
		marker?: { value: number; label: string };
		/** Where usage is heading (or what it drops to after a cleanup), drawn as a lighter band. */
		projected?: { value: number; label: string };
		/** Replaces the value text (and what screen readers hear). */
		valueText?: string | ((value: number, limit: number | null) => string);
		/** A way forward ("Add seats"). A returned promise makes the button load. */
		action?: SettingsAction;
		/** `bar` (stacked lines), `row` (one line in a table of meters) or `compact` (a small tile). Default `bar`. */
		variant?: UsageMeterVariant;
		/** Thickness of the bar. Default `md`. */
		size?: 'sm' | 'md' | 'lg';
		/** Words, merged over the English defaults. */
		labels?: Partial<UsageMeterLabels>;
		class?: string;
	}

	let {
		label,
		value,
		limit,
		max,
		unit,
		format,
		description,
		thresholds,
		tone,
		period,
		now,
		segments,
		marker,
		projected,
		valueText,
		action,
		variant = 'bar',
		size = 'md',
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<UsageMeterLabels>({
		of: (v, l) => `${v} of ${l}`,
		unlimited: 'Unlimited',
		used: (v) => `${v} used`,
		resets: (when) => `Resets ${when}`,
		inTime: (days, hours) => (days > 0 ? `in ${days} ${days === 1 ? 'day' : 'days'}` : hours > 0 ? `in ${hours} ${hours === 1 ? 'hour' : 'hours'}` : 'within the hour'),
		onDate: (date) => `on ${date}`,
		near: 'Near the limit',
		over: 'Over the limit',
		remaining: (amount) => `${amount} left`,
		overBy: (amount) => `${amount} over`,
		none: 'No data yet',
		...labels
	});

	const uid = $props.id();
	const labelId = `${uid}-label`;
	const descriptionId = `${uid}-description`;
	const notesId = `${uid}-notes`;
	const legendId = `${uid}-legend`;
	const reasonId = `${uid}-reason`;

	const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
	const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

	/** A number alone ("42"), for the left side of "42 of 50 seats". */
	const bare = (n: number) => (format ? format(n) : NUMBER.format(n));
	/** A number with its unit ("50 seats"). */
	const full = (n: number) => (format ? format(n) : unit ? `${NUMBER.format(n)} ${unit}` : NUMBER.format(n));

	const total = $derived(value ?? (segments?.length ? Math.round(segments.reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0) * 1e6) / 1e6 : undefined));
	const level = $derived(usageLevel(total, limit, thresholds));
	const hasLimit = $derived(typeof limit === 'number' && Number.isFinite(limit));
	const shownTone = $derived<UiTone>(tone ?? usageTone(level));
	const scale = $derived(usageScale({ value: total, limit, max, marker: marker?.value, projected: projected?.value }));
	const drawn = $derived(total !== undefined && (hasLimit || max !== undefined));

	const display = $derived.by(() => {
		if (total === undefined) return '—';
		if (typeof valueText === 'string') return valueText;
		if (valueText) return valueText(total, hasLimit ? (limit as number) : null);
		if (hasLimit) return text.of(bare(total), full(limit as number));
		return text.used(full(total));
	});
	const levelWords = $derived(level === 'over' ? text.over : level === 'near' ? text.near : '');
	const headroom = $derived.by(() => {
		if (total === undefined || !hasLimit) return '';
		const room = (limit as number) - total;
		return room >= 0 ? text.remaining(full(room)) : text.overBy(full(-room));
	});
	const resetText = $derived.by(() => {
		if (period?.resetsAt === undefined) return '';
		const at = toMillis(period.resetsAt);
		if (!Number.isFinite(at)) return '';
		if (now !== undefined) {
			const left = timeUntil(at, toMillis(now));
			return text.resets(left ? text.inTime(left.days, left.hours) : text.inTime(0, 0));
		}
		return text.resets(text.onDate(DATE.format(new Date(at))));
	});
	const ariaValueText = $derived([total === undefined ? text.none : display, levelWords].filter(Boolean).join(', '));

	const BAR: Record<NonNullable<Props['size']>, string> = { sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' };
	const fillFor = (t: UiTone | 'muted' | undefined) => (t === 'muted' ? 'bg-fg-light/40' : TONE_FILL_CLASS[t ?? 'accent']);

	let acting = $state(false);
	async function runAction(): Promise<void> {
		if (!action?.onSelect || acting) return;
		const result = action.onSelect();
		if (!isThenable(result)) return;
		acting = true;
		try {
			await result;
		} catch {
			// The app reports its own failure; the button only stops loading.
		} finally {
			acting = false;
		}
	}
	const hasNotes = $derived(Boolean(levelWords || headroom || resetText || period?.label || marker || projected));
</script>

{#snippet bar()}
	{#if drawn && total !== undefined}
		<div
			role="meter"
			aria-labelledby={labelId}
			aria-valuenow={total}
			aria-valuemin={0}
			aria-valuemax={hasLimit ? Math.max(limit as number, total) : Math.max(scale, total)}
			aria-valuetext={ariaValueText}
			aria-describedby={[description ? descriptionId : '', hasNotes ? notesId : '', segments?.length ? legendId : ''].filter(Boolean).join(' ') || undefined}
			data-level={level}
			class={cn('relative w-full min-w-0 rounded-full bg-canvas-secondary', BAR[size])}
		>
			<div class="absolute inset-0 flex overflow-hidden rounded-full">
				{#if segments?.length}
					{#each segments as segment (segment.id)}
						<span class={cn('block h-full shrink-0 border-r border-card-bg last:border-r-0 motion-safe:transition-[width] motion-safe:duration-300', fillFor(segment.tone))} style:width="{usagePercent(segment.value, scale)}%"></span>
					{/each}
				{:else}
					<span class={cn('block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300', fillFor(shownTone))} style:width="{usagePercent(total, scale)}%"></span>
				{/if}
			</div>
			{#if projected}
				{@const from = Math.min(projected.value, total)}
				{@const to = Math.max(projected.value, total)}
				<span
					aria-hidden="true"
					data-projected=""
					class={cn(
						'absolute inset-y-0 rounded-full',
						projected.value >= total ? cn(fillFor(shownTone), 'opacity-35') : 'bg-[repeating-linear-gradient(135deg,var(--color-card-bg)_0_2px,transparent_2px_5px)] opacity-80'
					)}
					style:left="{usagePercent(from, scale)}%"
					style:width="{Math.max(0, usagePercent(to, scale) - usagePercent(from, scale))}%"
				></span>
			{/if}
			{#if hasLimit && scale > (limit as number) && (limit as number) > 0}
				<span aria-hidden="true" data-limit="" class="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-fg-main/70" style:left="{usagePercent(limit as number, scale)}%"></span>
			{/if}
			{#if marker}
				<span aria-hidden="true" data-marker="" class="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-status-warning ring-2 ring-card-bg" style:left="{usagePercent(marker.value, scale)}%"></span>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet notes()}
	{#if total === undefined}
		<p id={notesId} class="m-0 text-xs leading-5 text-fg-light">{text.none}</p>
	{:else if hasNotes}
		<p id={notesId} class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-fg-light">
			{#if levelWords}<Badge tone={level === 'over' ? 'danger' : 'warning'} size="sm" dot>{levelWords}</Badge>{/if}
			{#if headroom}<span class={cn('tabular-nums', level === 'over' && 'font-medium text-fg-main')}>{headroom}</span>{/if}
			{#if period?.label || resetText}
				{#if headroom}<span aria-hidden="true">·</span>{/if}
				<span>{[period?.label, resetText].filter(Boolean).join(' · ')}</span>
			{/if}
			{#if marker}
				<span class="inline-flex items-center gap-1"><span aria-hidden="true" class="inline-block h-2.5 w-0.5 rounded-full bg-status-warning"></span>{marker.label}: <span class="tabular-nums">{full(marker.value)}</span></span>
			{/if}
			{#if projected}
				<span class="inline-flex items-center gap-1"><span aria-hidden="true" class={cn('inline-block size-2 rounded-sm', projected.value >= (total ?? 0) ? cn(fillFor(shownTone), 'opacity-35') : 'border border-fg-light/60')}></span>{projected.label}: <span class="tabular-nums">{full(projected.value)}</span></span>
			{/if}
		</p>
	{/if}
{/snippet}

{#snippet legend()}
	{#if segments?.length}
		<ul id={legendId} class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-fg-light">
			{#each segments as segment (segment.id)}
				<li class="inline-flex items-center gap-1.5">
					<span aria-hidden="true" class={cn('size-2 shrink-0 rounded-sm', fillFor(segment.tone))}></span>
					<span>{segment.label}</span>
					<span class="font-medium text-fg-main tabular-nums">{full(segment.value)}</span>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

{#snippet describe()}
	{#if description}
		<p id={descriptionId} class="m-0 text-xs leading-5 text-fg-light">
			{#if typeof description === 'string'}{description}{:else}{@render description()}{/if}
		</p>
	{/if}
{/snippet}

{#snippet actionButton()}
	{#if action}
		<span class="inline-flex flex-col items-start gap-1">
			<Button size="sm" {...actionButtonProps(action, reasonId)} loading={acting} onclick={action.onSelect && !action.unavailable ? runAction : undefined}>{action.label}</Button>
			{#if action.unavailable}<span id={reasonId} class="text-xs leading-5 text-fg-light">{action.unavailable}</span>{/if}
		</span>
	{/if}
{/snippet}

{#snippet valueLine()}
	<span class={cn('text-[13px] text-fg-main tabular-nums', total === undefined && 'text-fg-light')}>
		{#if total === undefined}<span aria-hidden="true">—</span>{:else}{display}{/if}{#if !hasLimit && limit === null && total !== undefined}<span class="text-fg-light">{` · ${text.unlimited}`}</span>{/if}
	</span>
{/snippet}

<div {...rest} data-variant={variant} data-level={level} class={cn('min-w-0 text-fg-main', variant === 'row' ? 'grid grid-cols-1 gap-1.5 @lg/settings:grid-cols-[minmax(7rem,12rem)_minmax(0,1fr)_minmax(9rem,auto)] @lg/settings:items-center @lg/settings:gap-x-4' : 'flex flex-col gap-1.5', className)}>
	{#if variant === 'row'}
		<div class="min-w-0">
			<span id={labelId} class="block truncate text-[13px] font-medium">{label}</span>
			{@render describe()}
		</div>
		<div class="flex min-w-0 flex-col gap-1.5">
			{@render bar()}
			{@render legend()}
		</div>
		<div class="flex min-w-0 flex-col gap-0.5 @lg/settings:items-end @lg/settings:text-right">
			{@render valueLine()}
			{@render notes()}
			{@render actionButton()}
		</div>
	{:else if variant === 'compact'}
		<div class="flex min-w-0 items-baseline justify-between gap-3">
			<span id={labelId} class="min-w-0 truncate text-xs font-medium text-fg-light">{label}</span>
			{@render valueLine()}
		</div>
		{@render bar()}
		{@render notes()}
		{@render describe()}
	{:else}
		<div class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
			<span id={labelId} class="text-[13px] font-medium">{label}</span>
			{@render valueLine()}
		</div>
		{@render bar()}
		{@render legend()}
		{@render notes()}
		{@render describe()}
		{#if action}<div class="mt-1">{@render actionButton()}</div>{/if}
	{/if}
</div>
