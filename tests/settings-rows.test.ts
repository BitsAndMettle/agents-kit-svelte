import assert from 'node:assert/strict';
import test from 'node:test';
import { actionSoftDisabled, callbackOnly, factCopyText, flippedByPerson, formatRequestedAgo, readOutcome, splitActions, withQuery } from '../src/lib/settings/rows/helpers.ts';
import type { SettingsAction } from '../src/lib/settings/shared/types.ts';

const link = (label: string): SettingsAction => ({ label, href: `/${label}` });
const button = (label: string): SettingsAction => ({ label, onSelect: () => undefined });

test('splitActions keeps up to two as buttons and collapses the rest behind a menu', () => {
	assert.deepEqual(splitActions([]), { visible: [], overflow: [] });
	const two = [button('a'), button('b')];
	assert.deepEqual(splitActions(two), { visible: two, overflow: [] });
	const four = [button('a'), button('b'), button('c'), button('d')];
	const split = splitActions(four);
	assert.deepEqual(split.visible.map((a) => a.label), ['a']);
	assert.deepEqual(split.overflow.map((a) => a.label), ['b', 'c', 'd']);
	assert.deepEqual(splitActions(four, 3).visible.map((a) => a.label), ['a', 'b']);
});

test('splitActions never collapses a link or a form intent: a menu item is neither', () => {
	const actions: SettingsAction[] = [
		button('a'),
		{ label: 'Reset', intent: 'reset' },
		button('c'),
		link('Docs'),
		{ label: 'Off', intent: 'off', unavailable: 'Owners only.' },
		{ label: 'Portal', href: '/portal', unavailable: 'Owners only.' }
	];
	const split = splitActions(actions);
	assert.deepEqual(split.visible.map((a) => a.label), ['a', 'Reset', 'Docs']);
	// An unavailable link or intent does nothing, so it may collapse (as a disabled menu item).
	assert.deepEqual(split.overflow.map((a) => a.label), ['c', 'Off', 'Portal']);
});

test('withQuery adds fields to the query, keeping any query and fragment', () => {
	assert.equal(withQuery('/requests', undefined), '/requests');
	assert.equal(withQuery('/requests', {}), '/requests');
	assert.equal(withQuery('/requests', { request: 'rq_1' }), '/requests?request=rq_1');
	assert.equal(withQuery('?/resend', { request: 'rq 1', team: 'a&b' }), '?/resend&request=rq+1&team=a%26b');
	assert.equal(withQuery('/r?', { request: 'rq_1' }), '/r?request=rq_1');
	assert.equal(withQuery('/r?a=1#top', { request: 'rq_1' }), '/r?a=1&request=rq_1#top');
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

test("flippedByPerson trusts the browser's record of user interaction and counts any change where it has none", () => {
	const input = (matches: (selector: string) => boolean) => ({ matches }) as unknown as HTMLInputElement;
	assert.equal(flippedByPerson(input((s) => s === ':user-valid, :user-invalid')), true);
	assert.equal(flippedByPerson(input(() => false)), false);
	assert.equal(
		flippedByPerson(
			input(() => {
				throw new SyntaxError('unsupported selector');
			})
		),
		true
	);
});

test('callbackOnly: only an action with nothing but onSelect needs JavaScript', () => {
	assert.equal(callbackOnly(button('a')), true);
	assert.equal(callbackOnly(link('a')), false);
	assert.equal(callbackOnly({ label: 'a', intent: 'go', onSelect: () => undefined }), false);
	assert.equal(callbackOnly({ label: 'a', href: '/a', onSelect: () => undefined }), false);
	assert.equal(callbackOnly({ label: 'a', onSelect: () => undefined, unavailable: 'Owners only.' }), false);
	assert.equal(callbackOnly({ label: 'a' }), false);
});

test('actionSoftDisabled waits for the page only where the button needs JavaScript, and always when unavailable', () => {
	assert.equal(actionSoftDisabled(button('a'), false), true);
	assert.equal(actionSoftDisabled(button('a'), true), undefined);
	assert.equal(actionSoftDisabled(link('a'), false), undefined);
	assert.equal(actionSoftDisabled({ label: 'a', intent: 'go' }, false), undefined);
	assert.equal(actionSoftDisabled({ label: 'a', href: '/a', unavailable: 'Owners only.' }, true), true);
});
