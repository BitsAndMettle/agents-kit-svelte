/**
 * Data shapes for the Charts & Timelines collection. Times are plain numbers: seconds from
 * the start of a run for the handoff Gantt and the model stream, or any number (a timestamp,
 * an index) for `GenerativeChart`.
 */

/** A phase of agent work. Any string works; these four get their own colours. */
export type AgentPhase = 'plan' | 'implement' | 'review' | 'verify' | (string & {});

/** One agent or model's row in `AgentHandoffGantt`. */
export interface HandoffLane {
	id: string;
	/** Display name, e.g. `Planner`. */
	label: string;
	/** Model or agent id shown under the label, e.g. `claude-opus`. */
	model?: string;
}

export type HandoffSpanStatus = 'running' | 'done' | 'failed' | 'superseded';

/** A stretch of time one lane held the work. */
export interface HandoffSpan {
	id: string;
	lane: string;
	phase: AgentPhase;
	/** Seconds from the run start. */
	start: number;
	/** Seconds from the run start. Leave out while the span is still running. */
	end?: number;
	status: HandoffSpanStatus;
	/** Short label drawn inside the bar when it fits. */
	label?: string;
	attempt?: number;
	tokens?: number;
	/** Anything your click handler needs, e.g. a run or log id. The chart never reads it. */
	data?: unknown;
}

/** What kind of thing a handoff passed. Sets the icon on its label. */
export type HandoffArtifactKind = 'file' | 'diff' | 'tests' | 'review' | 'note';

/** Work passed from one span to another. */
export interface HandoffLink {
	id: string;
	from: string;
	to: string;
	/** What was passed, e.g. `plan.md`, `diff +142 −38`, `2 failing tests`. */
	artifact: string;
	kind?: HandoffArtifactKind;
	reason?: string;
	/** Anything your click handler needs to open the artifact, e.g. a patch or a file path. */
	data?: unknown;
}

/** A shaded phase band behind `ModelPhaseStream`. */
export interface PhaseBand {
	id: string;
	label: string;
	start: number;
	end: number;
	data?: unknown;
}

/** A model's reading at one sample time, passed to `ModelPhaseStream`'s `onSelectPoint`. */
export interface ModelPoint {
	t: number;
	model: string;
	value: number;
	phase?: PhaseBand;
}

/** One model's throughput over time in `ModelPhaseStream`. */
export interface ModelSeries {
	model: string;
	/** Display name; defaults to `model`. */
	label?: string;
	points: { t: number; value: number }[];
}

export type ModelEventKind = 'escalate' | 'fallback' | 'swap';

/** A routing decision marked on the stream. */
export interface ModelEvent {
	id: string;
	t: number;
	kind: ModelEventKind;
	from: string;
	to: string;
	reason?: string;
}

export type ChartKind = 'line' | 'area' | 'bar';

/** One row of chart data: any fields, read through `x`, `y` and `series`. */
export type ChartRow = Record<string, string | number | null | undefined>;

/** A note the agent pins to a point. */
export interface ChartAnnotation {
	/** The x value it points at. */
	x: string | number;
	/** The series it points at; defaults to the first. */
	series?: string;
	label: string;
	note?: string;
}

/** The JSON an agent emits to draw a `GenerativeChart`. */
export interface ChartSpec {
	kind: ChartKind;
	title?: string;
	subtitle?: string;
	data: ChartRow[];
	/** Field holding the x value. */
	x: string;
	/** Field holding the y value. */
	y: string;
	/** Field that splits rows into series. Leave out for one series. */
	series?: string;
	/** Series names in colour order, so a model keeps its colour across charts. Others follow in data order. */
	seriesOrder?: string[];
	/** Unit shown after y values, e.g. `%`, `ms`, `tokens`. */
	unit?: string;
	/** Label for the x axis. */
	xLabel?: string;
	annotations?: ChartAnnotation[];
}

/** The point a person asked about in `GenerativeChart`. */
export interface ChartPoint {
	x: string | number;
	y: number;
	series: string;
}
