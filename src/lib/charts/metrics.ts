import type { Metric, MetricFormat } from './types';

export type DeltaDirection = 'up' | 'down' | 'flat';
export type DeltaVerdict = 'better' | 'worse' | 'neutral';

export interface MetricDelta {
	/** `value - previous`, not rounded. */
	diff: number;
	direction: DeltaDirection;
	/** Change as a percentage of `previous`, or `null` when `previous` is zero. */
	percent: number | null;
}

/** Compares a value with the prior period. Differences too small to matter count as `flat`. */
export function metricDelta(value: number, previous: number): MetricDelta {
	const diff = value - previous;
	const direction: DeltaDirection = Math.abs(diff) < 1e-9 ? 'flat' : diff > 0 ? 'up' : 'down';
	return { diff, direction, percent: previous === 0 ? null : (diff / Math.abs(previous)) * 100 };
}

/** Whether a change is good, bad or neither, given which direction the metric prefers. */
export function deltaVerdict(direction: DeltaDirection, better?: 'up' | 'down'): DeltaVerdict {
	if (!better || direction === 'flat') return 'neutral';
	return direction === better ? 'better' : 'worse';
}

/** Formats a number for a tile: thousands separators, one decimal below 100, none above, no trailing ".0". */
export function formatNumber(value: number): string {
	if (!Number.isFinite(value)) return '–';
	const decimals = Math.abs(value) < 100 ? 1 : 0;
	const rounded = Number(value.toFixed(decimals));
	return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('en-US', { maximumFractionDigits: decimals });
}

/** Formats seconds as "45s", "38m", "1h 05m" or "2d 3h". */
export function formatMetricDuration(seconds: number): string {
	if (!Number.isFinite(seconds)) return '–';
	const total = Math.round(Math.abs(seconds));
	const sign = seconds < 0 ? '-' : '';
	if (total < 60) return `${sign}${total}s`;
	const minutes = Math.round(total / 60);
	if (minutes < 60) return `${sign}${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		const rest = minutes % 60;
		return rest ? `${sign}${hours}h ${String(rest).padStart(2, '0')}m` : `${sign}${hours}h`;
	}
	const days = Math.floor(hours / 24);
	const restHours = hours % 24;
	return restHours ? `${sign}${days}d ${restHours}h` : `${sign}${days}d`;
}

/** Splits a metric's value into the big text and the small unit beside it. */
export function formatMetricValue(value: number, format: MetricFormat = 'number', unit = ''): { text: string; unit: string } {
	if (format === 'duration') return { text: formatMetricDuration(value), unit: '' };
	if (format === 'percent') return { text: formatNumber(value), unit: '%' };
	return { text: formatNumber(value), unit };
}

/** The size of a change, formatted like the metric itself and without a sign. */
export function formatDeltaAmount(diff: number, format: MetricFormat = 'number', unit = ''): string {
	const { text, unit: u } = formatMetricValue(Math.abs(diff), format, unit);
	return `${text}${u}`;
}

const UNIT_WORDS: Record<string, string> = { '/h': 'per hour', '/min': 'per minute', '/s': 'per second', '/d': 'per day' };

function spokenUnit(unit: string): string {
	return UNIT_WORDS[unit] ?? unit.replace(/^\//, 'per ').trim();
}

/** What a screen reader hears for a tile, e.g. "Merges per hour, 3.2, up 1.1 from 2.1, better". */
export function describeMetric(metric: Metric): string {
	const format = metric.format ?? 'number';
	const unit = metric.unit ?? '';
	const shown = formatMetricValue(metric.value, format, unit);
	const parts = [metric.label];
	if (metric.max !== undefined) {
		parts.push(`${shown.text} of ${formatMetricValue(metric.max, format, unit).text}`);
	} else {
		parts.push(format === 'percent' ? `${shown.text} percent` : shown.text);
	}
	// Spoken unit only for plain numbers: "per hour" is clear next to a label, "min" is not.
	if (format === 'number' && unit.startsWith('/') && metric.max === undefined) parts[1] += ` ${spokenUnit(unit)}`;
	if (metric.previous !== undefined) {
		const delta = metricDelta(metric.value, metric.previous);
		const from = formatMetricValue(metric.previous, format, '').text;
		if (delta.direction === 'flat') parts.push(`unchanged from ${from}`);
		else {
			const verdict = deltaVerdict(delta.direction, metric.better);
			parts.push(`${delta.direction} ${formatDeltaAmount(delta.diff, format)} from ${from}${verdict === 'neutral' ? '' : `, ${verdict}`}`);
		}
	}
	if (metric.hint) parts.push(metric.hint);
	return parts.join(', ');
}

export interface SparklineGeometry {
	/** Points in pixel space, oldest first. Empty when there is no series. */
	points: [number, number][];
	/** SVG path for the line, or an empty string with fewer than two points. */
	line: string;
}

/**
 * Lays a series out in a `width` by `height` box with `pad` around it. An empty series gives no
 * points, a single point sits in the middle, and equal values draw a flat line in the middle.
 */
export function sparkline(series: number[], width: number, height: number, pad = 3): SparklineGeometry {
	const values = series.filter((v) => Number.isFinite(v));
	if (values.length === 0) return { points: [], line: '' };
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min;
	const innerW = Math.max(0, width - pad * 2);
	const innerH = Math.max(0, height - pad * 2);
	const points = values.map((v, i): [number, number] => [
		values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * innerW,
		span === 0 ? height / 2 : pad + innerH - ((v - min) / span) * innerH
	]);
	const line = points.length < 2 ? '' : points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
	return { points, line };
}

/** How full a capacity metric is, from 0 to 100. */
export function capacityPercent(value: number, max: number): number {
	if (!(max > 0)) return 0;
	return Math.max(0, Math.min(100, (value / max) * 100));
}
