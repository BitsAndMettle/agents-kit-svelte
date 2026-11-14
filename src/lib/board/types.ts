import type { Snippet } from 'svelte';
import type { Metric } from '../charts/types';
import type { UiTone } from '../ui/styles';

/**
 * Cards that belong together inside a lane, such as the cards of one feature. A `label` is drawn as
 * a heading above them; leave it out for cards that stand alone.
 */
export interface BoardGroup<T> {
	/** Unique within its lane. */
	id: string;
	label?: string;
	items: T[];
}

/** One lane of a board, with its cards already sorted into groups. */
export interface BoardLane<T> {
	id: string;
	label: string;
	groups: BoardGroup<T>[];
}

export interface BoardLanesProps<T> {
	/** The lanes, in order. A lane with no cards keeps its heading and shows a count of 0. */
	lanes: BoardLane<T>[];
	/** Draws one card. The board places the cards; what a card shows is yours. */
	card: Snippet<[T]>;
	/** Heading level of the lane labels. Group labels are one level below, and card titles belong one below those. */
	headingLevel?: 2 | 3 | 4 | 5;
	class?: string;
}

/** One number on a `StatusStrip`, formatted like a `MetricTiles` metric. With `max` it reads "value/max", e.g. busy slots. */
export type StatusStat = Pick<Metric, 'id' | 'label' | 'value' | 'format' | 'unit' | 'max'>;

/** One thing known about a card, on a `CardSheet`: what it is and what it reads. */
export interface CardFact {
	/** Unique among the card's facts. */
	label: string;
	value: string;
	/** Makes the value a link, e.g. to the pull request it names. */
	href?: string;
	/** Colour meaning of the value, e.g. `danger` for checks that failed. */
	tone?: UiTone;
}

/** A question a card waits on, on a `CardSheet`. */
export interface CardQuestion {
	/** Shown as written, line breaks included. */
	text: string;
	/** The answers to choose from, in order. */
	options: readonly string[];
}
