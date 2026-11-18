/**
 * Small, dependency-free scale and path helpers shared by the chart components.
 */
import type { HandoffSpan, TimeBreak } from './types';

/** A linear map from a data domain to a pixel range. */
export interface LinearScale {
	(value: number): number;
	invert(pixel: number): number;
	domain: [number, number];
	range: [number, number];
}

/**
 * Creates a linear scale.
 *
 * @param domain - Data extent `[min, max]`.
 * @param range - Pixel extent `[start, end]`.
 * @returns A callable scale with `invert`.
 */
export function scaleLinear(domain: [number, number], range: [number, number]): LinearScale {
	const [d0, d1] = domain;
	const [r0, r1] = range;
	const span = d1 - d0 || 1;
	const fn = ((value: number) => r0 + ((value - d0) / span) * (r1 - r0)) as LinearScale;
	fn.invert = (pixel: number) => d0 + ((pixel - r0) / (r1 - r0 || 1)) * span;
	fn.domain = domain;
	fn.range = range;
	return fn;
}

/** The breaks inside `[from, to]`, clipped to it, sorted and merged where they overlap. */
function foldsIn(breaks: TimeBreak[], from: number, to: number): TimeBreak[] {
	const out: TimeBreak[] = [];
	for (const b of [...breaks].sort((a, c) => a.start - c.start)) {
		const start = Math.max(b.start, from);
		const end = Math.min(b.end, to);
		const last = out.at(-1);
		if (end <= start) continue;
		if (last && start <= last.end) last.end = Math.max(last.end, end);
		else out.push({ ...b, start, end });
	}
	return out;
}

/**
 * How much of `[from, to]` the breaks fold away.
 *
 * @param breaks - Folded stretches, in any order.
 * @param from - Start of the stretch measured.
 * @param to - End of the stretch measured.
 */
export function foldedTime(breaks: TimeBreak[], from: number, to: number): number {
	return foldsIn(breaks, from, to).reduce((sum, b) => sum + b.end - b.start, 0);
}

/**
 * A linear scale that gives each break `width` of the range, however long it is, and shares the rest out evenly
 * over the time left. Without breaks it is `scaleLinear`. At width 0 it drops the folded time altogether, so a
 * scrubber can run on it; `invert` at a fold's pixel then returns the fold's start.
 *
 * @param domain - Data extent `[min, max]`.
 * @param range - Pixel extent `[start, end]`, ascending.
 * @param breaks - Stretches to fold. Clipped to the domain and merged where they overlap.
 * @param width - Pixels each fold takes.
 */
export function scaleBroken(domain: [number, number], range: [number, number], breaks: TimeBreak[], width: number): LinearScale {
	const [d0, d1] = domain;
	const [r0, r1] = range;
	const folds = foldsIn(breaks, d0, d1);
	if (folds.length === 0) return scaleLinear(domain, range);
	const open = d1 - d0 - foldedTime(folds, d0, d1);
	const k = open > 0 ? Math.max(0, r1 - r0 - folds.length * width) / open : 0;
	const knots: [number, number][] = [[d0, r0]];
	let t = d0;
	let p = r0;
	for (const f of folds) {
		p += (f.start - t) * k;
		knots.push([f.start, p], [f.end, (p += width)]);
		t = f.end;
	}
	knots.push([d1, p + (d1 - t) * k]);
	const fn = ((value: number) => along(knots, value, 0)) as LinearScale;
	fn.invert = (pixel: number) => along(knots, pixel, 1);
	fn.domain = domain;
	fn.range = range;
	return fn;
}

/** Interpolates along a piecewise-linear line of `[t, px]` knots, keyed on coordinate `a`. */
function along(knots: [number, number][], v: number, a: 0 | 1): number {
	const b = a === 0 ? 1 : 0;
	let i = 0;
	while (i < knots.length - 2 && v > knots[i + 1][a]) i++;
	const [p, q] = [knots[i], knots[i + 1]];
	const span = q[a] - p[a];
	return span ? p[b] + ((v - p[a]) / span) * (q[b] - p[b]) : p[b];
}

/**
 * Every stretch of at least `min` in which no span of any lane runs, oldest first: work time's folds. A span with
 * no `end` runs to `now`, or on for good without it; with `now`, the stretch from the last span to `now` counts too.
 *
 * @param spans - Spans of every lane.
 * @param min - Shortest stretch to fold, e.g. `3600` for an hour.
 * @param now - The current time, if the spans are live.
 */
export function idleBreaks(spans: Pick<HandoffSpan, 'start' | 'end'>[], min: number, now?: number): TimeBreak[] {
	const runs = spans.map((s) => [s.start, s.end ?? now ?? Infinity]).sort((a, b) => a[0] - b[0]);
	const out: TimeBreak[] = [];
	let reach = runs[0]?.[0] ?? 0;
	for (const [start, end] of runs) {
		if (start > reach && start - reach >= min) out.push({ start: reach, end: start });
		reach = Math.max(reach, end);
	}
	if (runs.length > 0 && now !== undefined && now > reach && now - reach >= min) out.push({ start: reach, end: now });
	return out;
}

const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10_800, 21_600, 43_200, 86_400];

/**
 * Tick values on round time steps (seconds, minutes, hours, days), spaced for about `count` ticks across the time
 * left once the breaks are folded, and none inside a break.
 *
 * @param domain - Seconds `[min, max]`.
 * @param count - Desired number of ticks.
 * @param breaks - Folded stretches.
 */
export function timeTicks(domain: [number, number], count = 5, breaks: TimeBreak[] = []): number[] {
	const [d0, d1] = domain;
	const folds = foldsIn(breaks, d0, d1);
	const raw = (d1 - d0 - foldedTime(folds, d0, d1)) / Math.max(1, count);
	const step = TIME_STEPS.find((s) => s >= raw) ?? Math.ceil(raw / 86_400) * 86_400;
	const out: number[] = [];
	let from = d0;
	for (const f of [...folds, { start: d1, end: d1 }]) {
		for (let t = Math.ceil(from / step) * step; t <= f.start; t += step) out.push(t);
		from = f.end;
	}
	return out;
}

/**
 * Returns a "nice" step (1, 2 or 5 times a power of ten) that splits `span` into about `count` parts.
 *
 * @param span - Size of the domain.
 * @param count - Desired number of ticks.
 */
export function niceStep(span: number, count = 5): number {
	if (!(span > 0)) return 1;
	const raw = span / Math.max(1, count);
	const power = 10 ** Math.floor(Math.log10(raw));
	const fraction = raw / power;
	const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
	return nice * power;
}

/**
 * Evenly spaced round tick values covering `[min, max]`.
 *
 * @param min - Domain start.
 * @param max - Domain end.
 * @param count - Desired number of ticks.
 */
export function ticks(min: number, max: number, count = 5): number[] {
	if (max < min) [min, max] = [max, min];
	const step = niceStep(max - min, count);
	const out: number[] = [];
	for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
		out.push(Math.round(v / step) * step);
	}
	return out;
}

/**
 * Rounds a domain maximum up to the next nice step, so the top tick sits on the edge.
 *
 * @param max - Largest data value.
 * @param count - Desired number of ticks.
 */
export function niceMax(max: number, count = 5): number {
	if (!(max > 0)) return 1;
	const step = niceStep(max, count);
	return Math.ceil(max / step) * step;
}

/**
 * An SVG path through points with a monotone cubic curve, which never overshoots between points.
 *
 * @param points - Pixel coordinates, sorted by x.
 */
export function linePath(points: [number, number][]): string {
	const n = points.length;
	if (n === 0) return '';
	if (n === 1) return `M${points[0][0]},${points[0][1]}`;
	const tangents = monotoneTangents(points);
	let d = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
	for (let i = 0; i < n - 1; i++) {
		const [x0, y0] = points[i];
		const [x1, y1] = points[i + 1];
		const dx = (x1 - x0) / 3;
		d += `C${fmt(x0 + dx)},${fmt(y0 + tangents[i] * dx)},${fmt(x1 - dx)},${fmt(y1 - tangents[i + 1] * dx)},${fmt(x1)},${fmt(y1)}`;
	}
	return d;
}

/**
 * A closed SVG area between an upper line and a lower line (both sorted by x).
 *
 * @param upper - Top edge in pixels.
 * @param lower - Bottom edge in pixels, same x values as `upper`.
 */
export function areaPath(upper: [number, number][], lower: [number, number][]): string {
	if (upper.length === 0) return '';
	const top = linePath(upper);
	const bottom = linePath([...lower].reverse()).replace(/^M/, 'L');
	return `${top}${bottom}Z`;
}

function monotoneTangents(points: [number, number][]): number[] {
	const n = points.length;
	const slopes: number[] = [];
	for (let i = 0; i < n - 1; i++) {
		const dx = points[i + 1][0] - points[i][0];
		slopes.push(dx === 0 ? 0 : (points[i + 1][1] - points[i][1]) / dx);
	}
	const t: number[] = [slopes[0]];
	for (let i = 1; i < n - 1; i++) {
		const a = slopes[i - 1];
		const b = slopes[i];
		t.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b));
	}
	t.push(slopes[n - 2]);
	return t;
}

function fmt(n: number): string {
	return (Math.round(n * 10) / 10).toString();
}

/**
 * Stacks series that share x values. Returns, per series, the `[x, y0, y1]` band it covers.
 *
 * @param series - Each series' values keyed by x.
 * @param xs - The shared, sorted x values.
 */
export function stack(series: Map<number, number>[], xs: number[]): [number, number, number][][] {
	const base = new Map<number, number>(xs.map((x) => [x, 0]));
	return series.map((values) =>
		xs.map((x) => {
			const y0 = base.get(x) ?? 0;
			const y1 = y0 + (values.get(x) ?? 0);
			base.set(x, y1);
			return [x, y0, y1];
		})
	);
}

/**
 * Formats seconds as `m:ss` (or `h:mm:ss` past an hour).
 *
 * @param seconds - Duration in seconds.
 */
export function formatClock(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const ss = String(s % 60).padStart(2, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * Formats a number compactly: `1.2k`, `3.4M`.
 *
 * @param value - The number.
 */
export function formatCompact(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e6) return `${trim(value / 1e6)}M`;
	if (abs >= 1e3) return `${trim(value / 1e3)}k`;
	return trim(value);
}

function trim(n: number): string {
	return (Math.round(n * 10) / 10).toString();
}

/** CSS colour for series `index`, read from the `--ak-chart-*` tokens. */
export function seriesColor(index: number): string {
	return `var(--ak-chart-${(index % 6) + 1})`;
}

/** CSS colour for an agent phase. Unknown phases cycle through the series colours. */
export function phaseColor(phase: string, fallbackIndex = 0): string {
	switch (phase) {
		case 'plan':
			return 'var(--ak-chart-1)';
		case 'implement':
			return 'var(--ak-chart-2)';
		case 'review':
			return 'var(--ak-chart-3)';
		case 'verify':
			return 'var(--ak-chart-4)';
		default:
			return seriesColor(fallbackIndex + 4);
	}
}

/**
 * Formats a day offset as a short date when a start date is known (`Oct 28`), else as `Day 3`.
 *
 * @param day - Days since `start`.
 * @param start - ISO date of day 0, e.g. `2026-10-20`.
 */
export function formatDay(day: number, start?: string): string {
	if (!start) return `Day ${Math.round(day)}`;
	const base = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(base)) return `Day ${Math.round(day)}`;
	return new Date(base + Math.floor(day) * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Burn rate over the trailing `window` of samples and where spend is heading.
 * Returns the rate (spend per unit of t), the projected spend at `end`, and when the budget is crossed, if it is.
 *
 * @param points - Cumulative spend samples, in time order.
 * @param end - Time to project to.
 * @param budget - Spend limit, if any.
 * @param window - How far back (in t units) to measure the rate.
 */
export function projectBurn(points: { t: number; spent: number }[], end: number, budget?: number, window = 60): { rate: number; projected: number; crossesAt: number | null } {
	const last = points.at(-1);
	if (!last) return { rate: 0, projected: 0, crossesAt: null };
	const from = [...points].reverse().find((p) => p.t <= last.t - window) ?? points[0];
	const dt = last.t - from.t;
	const rate = dt > 0 ? Math.max(0, (last.spent - from.spent) / dt) : 0;
	const projected = last.spent + rate * Math.max(0, end - last.t);
	let crossesAt: number | null = null;
	if (budget !== undefined) {
		const over = points.find((p) => p.spent >= budget);
		if (over) crossesAt = over.t;
		else if (rate > 0 && projected >= budget) crossesAt = last.t + (budget - last.spent) / rate;
	}
	return { rate, projected, crossesAt };
}

/**
 * Where the projection's line ends: at `end`, unless spend has a `limit` (a usage window's 100%). Then it ends where it
 * meets the budget, or the limit when there is no budget, so it never reads past either; at the last sample when
 * spend is already there.
 *
 * @param points - Cumulative spend samples, in time order.
 * @param end - Time to project to.
 * @param budget - Spend limit, if any.
 * @param limit - The most spend can reach, if anything.
 */
export function projectionEnd(points: { t: number; spent: number }[], end: number, budget?: number, limit?: number): { t: number; spent: number } {
	const last = points.at(-1);
	const { rate, projected } = projectBurn(points, end, budget);
	const stop = limit === undefined ? Infinity : Math.min(limit, budget ?? limit);
	if (!last || projected <= stop) return { t: end, spent: projected };
	return last.spent >= stop ? last : { t: last.t + (stop - last.spent) / rate, spent: stop };
}
