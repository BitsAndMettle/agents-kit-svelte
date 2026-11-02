/**
 * Replays a finished run: given the final spans, handoffs and stream, returns what each
 * looked like at time `t`. Drive it from a timer or a scrubber to animate the chart components.
 */
import type { HandoffLink, HandoffSpan, ModelEvent, ModelSeries } from './types';

/**
 * The spans as they stood at `t`: unstarted spans are dropped, spans still in progress lose their
 * `end` and read `running`, and a superseded attempt reads `done` until its retry starts.
 *
 * @param spans - Final spans of the run.
 * @param t - Seconds from the run start.
 */
export function spansAt(spans: HandoffSpan[], t: number): HandoffSpan[] {
	return spans.flatMap((span): HandoffSpan[] => {
		if (span.start > t) return [];
		if (span.end === undefined || span.end > t) return [{ ...span, end: undefined, status: 'running' }];
		if (span.status === 'superseded') {
			const retried = spans.some(
				(other) => other.lane === span.lane && other.id !== span.id && (other.attempt ?? 0) > (span.attempt ?? 0) && other.start <= t
			);
			return [{ ...span, status: retried ? 'superseded' : 'done' }];
		}
		return [span];
	});
}

/**
 * The handoffs made by `t`: those whose sending span has finished and whose receiving span has started.
 *
 * @param handoffs - Final handoffs of the run.
 * @param spans - Final spans of the run.
 * @param t - Seconds from the run start.
 */
export function handoffsAt(handoffs: HandoffLink[], spans: HandoffSpan[], t: number): HandoffLink[] {
	const byId = new Map(spans.map((s) => [s.id, s]));
	return handoffs.filter((h) => {
		const from = byId.get(h.from);
		const to = byId.get(h.to);
		return from?.end !== undefined && from.end <= t && to !== undefined && to.start <= t;
	});
}

/**
 * Each series cut to the samples taken by `t`.
 *
 * @param series - Final model series.
 * @param t - Seconds from the run start.
 */
export function seriesAt(series: ModelSeries[], t: number): ModelSeries[] {
	return series.map((s) => ({ ...s, points: s.points.filter((p) => p.t <= t) }));
}

/**
 * Routing events that happened by `t`.
 *
 * @param events - Final routing events.
 * @param t - Seconds from the run start.
 */
export function eventsAt(events: ModelEvent[], t: number): ModelEvent[] {
	return events.filter((e) => e.t <= t);
}
