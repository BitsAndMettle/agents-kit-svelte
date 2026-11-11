import assert from 'node:assert/strict';
import test from 'node:test';
import { proposalCardNumbers, dependencyLabels, normalizeProposalCards, removeProposalCard, renameProposalCard } from '../src/lib/charts/proposal.ts';
import { SAMPLE_PROPOSAL } from '../src/lib/fixtures/charts.ts';
import type { ProposalCard } from '../src/lib/charts/types.ts';

const cards: ProposalCard[] = [
	{ id: 'a', title: 'A' },
	{ id: 'b', title: 'B', dependsOn: ['a'] },
	{ id: 'c', title: 'C', dependsOn: ['a', 'b'] }
];

test('dependency labels use list numbers', () => {
	assert.deepEqual(dependencyLabels(cards[2], cards), ['after #1', 'after #2']);
	assert.deepEqual(dependencyLabels(cards[0], cards), []);
	assert.equal(proposalCardNumbers(cards).get('c'), 3);
});

test('removing a card drops it from others and renumbers', () => {
	const next = removeProposalCard(cards, 'a');
	assert.deepEqual(next.map((c) => c.id), ['b', 'c']);
	assert.deepEqual(next[0].dependsOn, []);
	assert.deepEqual(next[1].dependsOn, ['b']);
	assert.deepEqual(dependencyLabels(next[1], next), ['after #1']);
	assert.deepEqual(cards[1].dependsOn, ['a'], 'input is not mutated');
});

test('removing the middle of a chain passes its dependencies on', () => {
	const chain: ProposalCard[] = [
		{ id: 'c', title: 'C' },
		{ id: 'b', title: 'B', dependsOn: ['c'] },
		{ id: 'a', title: 'A', dependsOn: ['b'] }
	];
	const next = removeProposalCard(chain, 'b');
	assert.deepEqual(next.find((x) => x.id === 'a')?.dependsOn, ['c']);
	const twice = removeProposalCard([{ id: 'c', title: 'C' }, { id: 'b', title: 'B', dependsOn: ['c', 'a'] }, { id: 'a', title: 'A', dependsOn: ['b', 'c'] }], 'b');
	assert.deepEqual(twice.find((x) => x.id === 'a')?.dependsOn, ['c']);
});

test('rename trims and ignores blank names', () => {
	assert.equal(renameProposalCard(cards, 'a', '  New  ')[0].title, 'New');
	assert.equal(renameProposalCard(cards, 'a', '   ')[0].title, 'A');
});

test('normalize drops unknown, self and duplicate dependencies', () => {
	const out = normalizeProposalCards([{ id: 'a', title: 'A', dependsOn: ['a', 'zz'] }, { id: 'b', title: 'B', dependsOn: ['a', 'a'] }]);
	assert.deepEqual(out[0].dependsOn, []);
	assert.deepEqual(out[1].dependsOn, ['a']);
});

test('sample proposal has five cards, two with dependencies', () => {
	assert.equal(SAMPLE_PROPOSAL.cards.length, 5);
	assert.equal(SAMPLE_PROPOSAL.cards.filter((c) => c.dependsOn?.length).length, 2);
});
