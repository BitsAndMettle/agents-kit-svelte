/** One slot in a pagination bar: a page number, or an ellipsis standing in for hidden pages. */
export type PageToken = number | 'start-ellipsis' | 'end-ellipsis';

export interface PaginationRangeOptions {
	/** The current page, 1-based. Clamped to the valid range. */
	page: number;
	pageCount: number;
	/** Pages shown on each side of the current page. Default 1. */
	siblings?: number;
	/** Pages always shown at each end. Default 1. */
	boundaries?: number;
}

function span(from: number, to: number): number[] {
	const out: number[] = [];
	for (let n = from; n <= to; n++) out.push(n);
	return out;
}

/**
 * Computes which page numbers and ellipses a pagination bar shows.
 *
 * An ellipsis only appears where it hides two or more pages; a gap of exactly one page
 * shows that page instead. Once the pages no longer fit, the bar keeps a constant number
 * of slots so it does not jump in width while paging.
 *
 * @param options - The current page, the page count, and how many siblings and boundary pages to keep.
 * @returns The ordered slots, e.g. `[1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 12]`.
 */
export function paginationRange({ page, pageCount, siblings = 1, boundaries = 1 }: PaginationRangeOptions): PageToken[] {
	const total = Math.max(0, Math.floor(pageCount));
	if (total === 0) return [];
	const sib = Math.max(0, Math.floor(siblings));
	const bound = Math.max(0, Math.floor(boundaries));
	const current = Math.min(Math.max(1, Math.floor(page)), total);

	// Boundaries, siblings, the current page and two ellipsis slots.
	if (total <= bound * 2 + sib * 2 + 3) return span(1, total);

	const startPages = span(1, bound);
	const endPages = span(total - bound + 1, total);

	const siblingsStart = Math.max(Math.min(current - sib, total - bound - sib * 2 - 1), bound + 2);
	const siblingsEnd = Math.min(
		Math.max(current + sib, bound + sib * 2 + 2),
		endPages.length > 0 ? endPages[0] - 2 : total - 1
	);

	const out: PageToken[] = [...startPages];
	if (siblingsStart > bound + 2) out.push('start-ellipsis');
	else if (bound + 1 < total - bound) out.push(bound + 1);

	out.push(...span(siblingsStart, siblingsEnd));

	if (siblingsEnd < total - bound - 1) out.push('end-ellipsis');
	else if (total - bound > bound) out.push(total - bound);

	out.push(...endPages);
	return out;
}
