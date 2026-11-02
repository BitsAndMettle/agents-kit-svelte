/**
 * Small, dependency-free scale and path helpers shared by the chart components.
 */

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
