import assert from 'node:assert/strict';
import test from 'node:test';
import { factCopyText, formatRequestedAgo, readOutcome, splitActions } from '../src/lib/settings/rows/helpers.ts';
import type { SettingsAction } from '../src/lib/settings/shared/types.ts';

const link = (label: string): SettingsAction => ({ label, href: `/${label}` });

test('splitActions keeps up to two as buttons and collapses the rest behind a menu', () => {
	assert.deepEqual(splitActions([]), { visible: [], overflow: [] });
	const two = [link('a'), link('b')];
	assert.deepEqual(splitActions(two), { visible: two, overflow: [] });
	const four = [link('a'), link('b'), link('c'), link('d')];
	const split = splitActions(four);
	assert.deepEqual(split.visible.map((a) => a.label), ['a']);
	assert.deepEqual(split.overflow.map((a) => a.label), ['b', 'c', 'd']);
	assert.deepEqual(splitActions(four, 3).visible.map((a) => a.label), ['a', 'b']);
});

test('splitActions never collapses a form intent: a menu item cannot submit a form', () => {
	const actions: SettingsAction[] = [link('a'), { label: 'Reset', intent: 'reset' }, link('c'), { label: 'Off', intent: 'off', unavailable: 'Owners only.' }];
	const split = splitActions(actions);
	assert.deepEqual(split.visible.map((a) => a.label), ['a', 'Reset']);
	// An unavailable intent posts nothing, so it may collapse (as a disabled menu item).
	assert.deepEqual(split.overflow.map((a) => a.label), ['c', 'Off']);
});

test('factCopyText copies the value, a given string, or nothing', () => {
	assert.equal(factCopyText({ value: 'tm_1' }), undefined);
	assert.equal(factCopyText({ value: 'tm_1', copy: false }), undefined);
	assert.equal(factCopyText({ value: 'tm_1', copy: true }), 'tm_1');
	assert.equal(factCopyText({ value: '7f3a91c', copy: '2026.11.09-7f3a91c' }), '2026.11.09-7f3a91c');
});

test('formatRequestedAgo reads an injected now and never goes negative', () => {
	const now = Date.parse('2026-11-12T10:00:00Z');
	assert.equal(formatRequestedAgo(now - 30_000, now), 'just now');
	assert.equal(formatRequestedAgo(now + 60_000, now), 'just now');
	assert.equal(formatRequestedAgo(now - 12 * 60_000, now), '12 min ago');
	assert.equal(formatRequestedAgo(new Date(now - 3 * 3_600_000), now), '3 h ago');
	assert.equal(formatRequestedAgo('2026-11-11T09:00:00Z', now), 'yesterday');
	assert.equal(formatRequestedAgo(now - 4 * 86_400_000, now), '4 days ago');
	assert.equal(formatRequestedAgo('not a time', now), '');
	assert.equal(formatRequestedAgo(now, Number.NaN), '');
});

test('readOutcome treats errors, field errors and conflicts as failures and keeps only returned text', () => {
	assert.deepEqual(readOutcome(undefined), { ok: true });
	assert.deepEqual(readOutcome({}), { ok: true, notice: undefined });
	assert.deepEqual(readOutcome({ notice: 'Sent again.' }), { ok: true, notice: 'Sent again.' });
	assert.deepEqual(readOutcome({ error: 'Offline.' }), { ok: false, error: 'Offline.' });
	assert.deepEqual(readOutcome({ errors: { reason: 'Too short.' } }), { ok: false, error: 'Too short.' });
	assert.deepEqual(readOutcome({ conflict: {} }), { ok: false, error: undefined });
	assert.deepEqual(readOutcome({ conflict: { message: 'Changed elsewhere.' } }), { ok: false, error: 'Changed elsewhere.' });
	assert.deepEqual(readOutcome({ errors: { reason: undefined } }), { ok: true, notice: undefined });
});
