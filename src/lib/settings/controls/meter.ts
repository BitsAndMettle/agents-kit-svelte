/**
 * Pure rules behind UsageMeter: where a value stands against its limit, which tone that gives,
 * and the scale a bar is drawn on. A leaf (type-only imports), so node tests load it directly.
 */
import type { UiTone } from '../../ui/styles';

/** Where usage stands: below the warning threshold, near the limit, at or over it, unlimited, or unknown. */
export type UsageLevel = 'under' | 'near' | 'over' | 'unlimited' | 'none';

/** Fractions of the limit at which the meter warns and at which it is over. Defaults: 0.8 and 1. */
export interface UsageThresholds {
	warning?: number;
	danger?: number;
}

/**
 * Where `value` stands against `limit`.
 *
 * @param value - Usage, or undefined when there is no data.
 * @param limit - The limit; null means unlimited, undefined means no limit was given.
 * @param thresholds - Fractions of the limit (default warning 0.8, danger 1).
 * @returns `none` without data, `unlimited` without a limit, else `under`, `near` or `over`.
 */
export function usageLevel(value: number | undefined, limit: number | null | undefined, thresholds: UsageThresholds = {}): UsageLevel {
	if (value === undefined || !Number.isFinite(value)) return 'none';
	if (limit === null || limit === undefined || !Number.isFinite(limit)) return 'unlimited';
	const warning = thresholds.warning ?? 0.8;
	const danger = thresholds.danger ?? 1;
	if (limit <= 0) return value > 0 ? 'over' : 'under';
	const ratio = value / limit;
	if (ratio >= danger) return 'over';
	if (ratio >= warning) return 'near';
	return 'under';
}

/**
 * The tone a level carries: accent while under, warning near the limit, danger at or over it,
 * neutral when unlimited or unknown. The meter also says it in words, never by colour alone.
 */
export function usageTone(level: UsageLevel): UiTone {
	if (level === 'over') return 'danger';
	if (level === 'near') return 'warning';
	if (level === 'under') return 'accent';
	return 'neutral';
}

/**
 * The top of the scale a bar is drawn on: `max` when given (meters in a table share one), else the
 * largest of the limit, the value, the marker and the projected value, so nothing falls off the end.
 * Never below 1, so an empty meter still has a scale.
 */
export function usageScale(options: { value?: number; limit?: number | null; max?: number; marker?: number; projected?: number }): number {
	if (options.max !== undefined && Number.isFinite(options.max) && options.max > 0) return options.max;
	const candidates = [options.limit ?? undefined, options.value, options.marker, options.projected].filter(
		(n): n is number => typeof n === 'number' && Number.isFinite(n)
	);
	return Math.max(1, ...candidates);
}

/** `n` as a percentage of `scale`, clamped to 0..100 and rounded to 0.1. */
export function usagePercent(n: number, scale: number): number {
	if (!Number.isFinite(n) || scale <= 0) return 0;
	return Math.round(Math.min(100, Math.max(0, (n / scale) * 100)) * 10) / 10;
}

/** Whole days and hours from `now` until `at`, for "Resets in 3 days". Undefined once `at` has passed. */
export function timeUntil(at: number, now: number): { days: number; hours: number } | undefined {
	const ms = at - now;
	if (!Number.isFinite(ms) || ms <= 0) return undefined;
	const hours = Math.floor(ms / 3_600_000);
	return { days: Math.floor(hours / 24), hours: hours % 24 };
}
