/** Pure helpers for `CitedAnswer`. */

import type { CitedSourceCheck } from '../types';

export type SourcesState = 'none' | 'all-verified' | 'some-unverified' | 'mismatch';

export interface SourcesSummary {
	state: SourcesState;
	verified: number;
	unverified: number;
	mismatch: number;
	total: number;
	/** One sentence for the header and screen readers. */
	label: string;
}

/**
 * Summarises how far an answer's sources were checked. Any mismatch wins over everything
 * else; otherwise any unverified source makes the answer only partly checked.
 *
 * @param sources - Sources with their check state.
 * @returns Counts, an overall state and a sentence.
 */
export function summarizeSources(sources: readonly { check: CitedSourceCheck }[]): SourcesSummary {
	let verified = 0;
	let unverified = 0;
	let mismatch = 0;
	for (const s of sources) {
		if (s.check === 'verified') verified += 1;
		else if (s.check === 'mismatch') mismatch += 1;
		else unverified += 1;
	}
	const total = sources.length;
	const noun = (n: number) => `${n} ${n === 1 ? 'source' : 'sources'}`;
	let state: SourcesState;
	let label: string;
	if (total === 0) {
		state = 'none';
		label = 'No sources';
	} else if (mismatch > 0) {
		state = 'mismatch';
		label = `${noun(mismatch)} did not match the quoted text`;
	} else if (unverified > 0) {
		state = 'some-unverified';
		label = `${verified} of ${total} sources checked`;
	} else {
		state = 'all-verified';
		label = total === 1 ? 'Source checked' : `All ${total} sources checked`;
	}
	return { state, verified, unverified, mismatch, total, label };
}
