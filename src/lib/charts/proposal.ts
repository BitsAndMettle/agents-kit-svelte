import type { ProposalCard } from './types';

/**
 * Copies cards and drops `dependsOn` ids that point at nothing, at the card itself, or at a
 * duplicate.
 *
 * @param cards - Cards as supplied.
 * @returns Fresh cards safe to edit.
 */
export function normalizeProposalCards(cards: ProposalCard[]): ProposalCard[] {
	const ids = new Set(cards.map((c) => c.id));
	return cards.map((c) => ({ ...c, dependsOn: [...new Set(c.dependsOn ?? [])].filter((d) => d !== c.id && ids.has(d)) }));
}

/**
 * Maps each card id to its 1-based number in the list.
 *
 * @param cards - Cards in order.
 */
export function proposalCardNumbers(cards: ProposalCard[]): Map<string, number> {
	return new Map(cards.map((c, i) => [c.id, i + 1]));
}

/**
 * Labels like "after #2" for the cards a card waits for, in list order. Unknown ids are skipped.
 *
 * @param card - The card.
 * @param cards - All cards, for numbering.
 */
export function dependencyLabels(card: ProposalCard, cards: ProposalCard[]): string[] {
	const numbers = proposalCardNumbers(cards);
	return (card.dependsOn ?? [])
		.map((id) => numbers.get(id))
		.filter((n): n is number => n !== undefined)
		.sort((a, b) => a - b)
		.map((n) => `after #${n}`);
}

/**
 * Removes a card and drops it from every other card's `dependsOn`. Does not mutate.
 *
 * @param cards - Cards.
 * @param id - Card to remove.
 */
export function removeProposalCard(cards: ProposalCard[], id: string): ProposalCard[] {
	return cards.filter((c) => c.id !== id).map((c) => ({ ...c, dependsOn: (c.dependsOn ?? []).filter((d) => d !== id) }));
}

/**
 * Renames a card. A blank name keeps the old one. Does not mutate.
 *
 * @param cards - Cards.
 * @param id - Card to rename.
 * @param title - New title.
 */
export function renameProposalCard(cards: ProposalCard[], id: string, title: string): ProposalCard[] {
	const next = title.trim();
	return cards.map((c) => (c.id === id && next ? { ...c, title: next } : c));
}
