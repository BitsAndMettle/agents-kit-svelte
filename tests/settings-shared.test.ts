import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import test from 'node:test';
import { adoptCurrentAsDefaults, describeChanges, diffForm, readCurrent, readDefaults, sameValue, undescribedChanges, type ControlLike, type OptionLike } from '../src/lib/settings/shared/diff.ts';
import { InstantCore, readResult, toFormResult, UndoSlot, type InstantSnapshot } from '../src/lib/settings/shared/undo.ts';
import { LOCK_LABELS, LOCK_PRECEDENCE, lockAttrs, lockReasonText, pickLock } from '../src/lib/settings/shared/lock.ts';
import { matchesPhrase, phrasePattern } from '../src/lib/settings/shared/confirm.ts';
import { filterSettingsLinks, highlightSegments, searchSettings, toPaletteCommands } from '../src/lib/settings/shared/search.ts';
import { focusIndexAfterRemoval } from '../src/lib/settings/shared/focus.ts';
import { actionButtonProps, CQ } from '../src/lib/settings/shared/recipes.ts';
import { SAMPLE_SETTINGS_FIELDS, SAMPLE_SETTINGS_NAV, SAMPLE_SETTINGS_SAVED, SAMPLE_SETTINGS_SEARCH } from '../src/lib/fixtures/settings.ts';
import type { SettingLock, SettingsHandler, SettingsResult } from '../src/lib/settings/shared/types.ts';

// ---------- plain fixture shapes for the staged diff (no DOM) ----------

const text = (name: string, value: string, defaultValue = value): ControlLike => ({ name, type: 'text', value, defaultValue });
const box = (name: string, value: string, checked: boolean, defaultChecked: boolean, label?: string): ControlLike => ({
	name,
	type: 'checkbox',
	value,
	checked,
	defaultChecked,
	labels: label ? [{ textContent: label }] : null
});
const radio = (name: string, value: string, checked: boolean, defaultChecked: boolean, label: string): ControlLike => ({
	name,
	type: 'radio',
	value,
	checked,
	defaultChecked,
	labels: [{ textContent: ` ${label}\n ` }]
});
const option = (value: string, label: string, selected: boolean, defaultSelected: boolean, disabled = false): OptionLike => ({
	value,
	text: label,
	selected,
	defaultSelected,
	disabled
});
const select = (name: string, options: OptionLike[], multiple = false): ControlLike => ({ name, type: multiple ? 'select-multiple' : 'select-one', options });
const form = (...elements: unknown[]) => ({ elements });

test('readDefaults and readCurrent read every kind of control, skipping hidden, buttons and disabled ones', () => {
	const f = form(
		text('teamName', 'Northwind Design', 'Northwind Studio'),
		{ name: 'revision', type: 'hidden', value: '7', defaultValue: '7' },
		{ name: 'intent', type: 'submit', value: 'save' },
		{ ...text('locked', 'x', 'y'), disabled: true },
		box('digest', 'true', false, true),
		box('channels', 'email', true, true, 'Email'),
		box('channels', 'chat', true, false, 'Chat'),
		radio('theme', 'light', false, true, 'Light'),
		radio('theme', 'dark', true, false, 'Dark'),
		// No option marked: a single select resets to its first enabled option.
		select('retention', [option('x', 'Pick one', false, false, true), option('30', '30 days', false, false), option('90', '90 days', true, false)]),
		select('days', [option('mon', 'Monday', true, true), option('tue', 'Tuesday', true, false)], true),
		null,
		{ type: 'fieldset', name: '' }
	);
	assert.deepEqual(readDefaults(f), {
		teamName: 'Northwind Studio',
		digest: 'true',
		channels: ['email'],
		theme: 'light',
		retention: '30',
		days: ['mon']
	});
	assert.deepEqual(readCurrent(f), {
		teamName: 'Northwind Design',
		digest: '',
		channels: ['email', 'chat'],
		theme: 'dark',
		retention: '90',
		days: ['mon', 'tue']
	});
});

test('diffForm lists described fields that changed, with option and label text, in field order', () => {
	const f = form(
		box('channels', 'email', true, true, 'Email'),
		box('channels', 'chat', true, false, 'Chat'),
		text('teamName', 'Northwind Design', 'Northwind Studio'),
		select('retention', [option('30', '30 days', false, false), option('90', '90 days', true, true)]),
		box('digest', 'true', false, true),
		text('undescribed', 'a', 'b')
	);
	assert.deepEqual(diffForm(f, SAMPLE_SETTINGS_FIELDS), [
		{ name: 'teamName', label: 'Team name', from: 'Northwind Studio', to: 'Northwind Design' },
		{ name: 'digest', label: 'Email digest', from: 'On', to: 'Off' },
		{ name: 'channels', label: 'Channels', from: 'Email', to: 'Email, Chat' }
	]);
	// format wins over the built-in text; custom on/off words apply to lone checkboxes.
	const fields = [
		{ name: 'teamName', label: 'Team name', format: (raw: string | string[]) => `“${raw}”` },
		{ name: 'digest', label: 'Email digest' }
	];
	assert.deepEqual(diffForm(f, fields, { on: 'Yes', off: 'No' }), [
		{ name: 'teamName', label: 'Team name', from: '“Northwind Studio”', to: '“Northwind Design”' },
		{ name: 'digest', label: 'Email digest', from: 'Yes', to: 'No' }
	]);
});

test('undescribedChanges names changed controls that no field describes', () => {
	const f = form(text('teamName', 'New', 'Old'), text('forgot', 'a', 'b'), text('clean', 'same'), box('alsoForgot', 'true', true, false));
	assert.deepEqual(undescribedChanges(f, SAMPLE_SETTINGS_FIELDS), ['forgot', 'alsoForgot']);
	assert.deepEqual(undescribedChanges(f, [...SAMPLE_SETTINGS_FIELDS, { name: 'forgot', label: 'Forgot' }, { name: 'alsoForgot', label: 'Also' }]), []);
});

test('diffForm sees radio changes by label and ignores list order', () => {
	const f = form(radio('theme', 'light', false, true, 'Light'), radio('theme', 'dark', true, false, 'Dark'));
	assert.deepEqual(diffForm(f, [{ name: 'theme', label: 'Theme' }]), [{ name: 'theme', label: 'Theme', from: 'Light', to: 'Dark' }]);
	assert.equal(sameValue(['a', 'b'], ['b', 'a']), true);
	assert.equal(sameValue(['a'], ['a', 'a']), false);
	assert.equal(sameValue('a', ['a']), false);
});

test('adoptCurrentAsDefaults makes the form clean', () => {
	const retention = select('retention', [option('30', '30 days', true, false), option('90', '90 days', false, true)]);
	const f = form(text('teamName', 'New', 'Old'), box('digest', 'true', true, false), retention);
	assert.equal(diffForm(f, SAMPLE_SETTINGS_FIELDS).length, 3);
	adoptCurrentAsDefaults(f);
	assert.deepEqual(diffForm(f, SAMPLE_SETTINGS_FIELDS), []);
	assert.deepEqual(readDefaults(f), { teamName: 'New', digest: 'true', retention: '30' });
});

test('describeChanges compares a saved object and a draft for controlled apps', () => {
	const draft = { ...SAMPLE_SETTINGS_SAVED, retention: '30', digest: false, channels: ['email'] };
	assert.deepEqual(describeChanges(SAMPLE_SETTINGS_FIELDS, SAMPLE_SETTINGS_SAVED, draft), [
		{ name: 'retention', label: 'Data retention', from: '90', to: '30' },
		{ name: 'digest', label: 'Email digest', from: 'On', to: 'Off' }
	]);
	const days = (raw: string | string[]) => `${raw} days`;
	assert.deepEqual(
		describeChanges([{ name: 'retention', label: 'Retention', format: days }], { retention: 90 }, { retention: 30 }),
		[{ name: 'retention', label: 'Retention', from: '90 days', to: '30 days' }]
	);
	// Lists compare as sets; a field missing from saved has no `from`.
	assert.deepEqual(describeChanges(SAMPLE_SETTINGS_FIELDS, { channels: ['a', 'b'] }, { channels: ['b', 'a'] }), []);
	assert.deepEqual(describeChanges([{ name: 'teamName', label: 'Team name' }], {}, { teamName: 'Acme' }), [
		{ name: 'teamName', label: 'Team name', from: undefined, to: 'Acme' }
	]);
});

// ---------- instant core ----------

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function core<T>(initial: T, commit: SettingsHandler<[T]>) {
	const seen: InstantSnapshot<T>[] = [];
	const instance = new InstantCore<T>({ initial, commit: () => commit, savedForMs: () => 5, onChange: (s) => seen.push(s) });
	return { instance, seen };
}

test('a fast second set wins over a slow first one', async () => {
	const slow = deferred<void | SettingsResult>();
	const calls: boolean[] = [];
	const { instance } = core<boolean>(false, (v: boolean) => {
		calls.push(v);
		return v ? slow.promise : Promise.resolve();
	});
	const first = instance.set(true);
	assert.equal(instance.snapshot.current, true);
	assert.equal(instance.snapshot.status, 'pending');
	await instance.set(false);
	assert.equal(instance.snapshot.status, 'saved');
	assert.equal(instance.snapshot.committed, false);
	slow.resolve({ error: 'too late' });
	await first;
	// The slow failure settled after the newer set: ignored.
	assert.equal(instance.snapshot.current, false);
	assert.equal(instance.snapshot.status, 'saved');
	assert.equal(instance.snapshot.error, undefined);
	assert.deepEqual(calls, [true, false]);
});

test('a failure reverts to the last committed value; a rejection keeps no thrown text', async () => {
	const { instance } = core<string>('a', (v: string) => (v === 'b' ? Promise.resolve() : v === 'c' ? Promise.resolve({ error: 'Name taken' }) : Promise.reject(new Error('secret stack'))));
	await instance.set('b');
	assert.equal(instance.snapshot.committed, 'b');
	await instance.set('c');
	assert.deepEqual([instance.snapshot.current, instance.snapshot.status, instance.snapshot.error], ['b', 'error', 'Name taken']);
	await instance.set('d');
	assert.deepEqual([instance.snapshot.current, instance.snapshot.status, instance.snapshot.error], ['b', 'error', undefined]);
	// A synchronous throw and {errors} fail the same way.
	const sync = core<number>(1, (v: number) => {
		if (v === 2) throw new Error('boom');
		return { errors: { value: 'Too big' } };
	});
	await sync.instance.set(2);
	assert.deepEqual([sync.instance.snapshot.current, sync.instance.snapshot.status, sync.instance.snapshot.error], [1, 'error', undefined]);
	await sync.instance.set(3);
	assert.deepEqual([sync.instance.snapshot.current, sync.instance.snapshot.error], [1, 'Too big']);
});

test('retry runs the failed change again; saved returns to idle', async () => {
	let fail = true;
	const { instance } = core<boolean>(false, () => (fail ? Promise.reject(new Error('x')) : Promise.resolve()));
	await instance.set(true);
	assert.equal(instance.snapshot.status, 'error');
	fail = false;
	await instance.retry();
	assert.deepEqual([instance.snapshot.current, instance.snapshot.status], [true, 'saved']);
	await new Promise((r) => setTimeout(r, 20));
	assert.equal(instance.snapshot.status, 'idle');
});

test('the undo token is superseded by a later set, and undo creates no undo point', async () => {
	const undone: number[] = [];
	const instance = new InstantCore<number>({
		initial: 1,
		commit: () => () => undefined,
		undo: () => (v) => {
			undone.push(v);
		},
		savedForMs: () => 5
	});
	await instance.set(2);
	const first = instance.snapshot.undoToken;
	assert.equal(instance.snapshot.canUndo, true);
	await instance.set(3);
	const second = instance.snapshot.undoToken;
	assert.notEqual(first, second);
	assert.equal(instance.isCurrent(first), false);
	// A stale notice cannot undo the newer change.
	assert.equal(await instance.undo(first), false);
	assert.equal(instance.snapshot.current, 3);
	assert.equal(await instance.undo(second), true);
	assert.deepEqual(undone, [2]);
	assert.deepEqual([instance.snapshot.current, instance.snapshot.committed], [2, 2]);
	assert.equal(instance.snapshot.undoToken, undefined);
	assert.equal(instance.snapshot.canUndo, false);
	assert.equal(await instance.undo(), false);
	instance.dispose();
});

test('a failed or same-value later set still supersedes the undo token', async () => {
	for (const later of [5, 2]) {
		const undone: number[] = [];
		const instance = new InstantCore<number>({
			initial: 1,
			commit: () => (v) => (v === 5 ? { error: 'No' } : undefined),
			undo: () => (v) => {
				undone.push(v);
			},
			savedForMs: () => 5
		});
		await instance.set(2);
		const token = instance.snapshot.undoToken;
		assert.equal(instance.isCurrent(token), true);
		await instance.set(later);
		// The failure reverted to 2 (or the same value saved again): nothing is undoable any more.
		assert.equal(instance.snapshot.committed, 2);
		assert.equal(instance.isCurrent(token), false, `after set(${later})`);
		assert.equal(instance.snapshot.undoToken, undefined);
		assert.equal(instance.snapshot.canUndo, false);
		assert.equal(await instance.undo(token), false);
		assert.equal(await instance.undo(), false);
		assert.deepEqual(undone, []);
		assert.equal(instance.snapshot.current, 2);
		instance.dispose();
	}
});

test('sync adopts an outside value unless a change is pending', async () => {
	const gate = deferred<void>();
	const { instance } = core<string>('a', () => gate.promise);
	instance.sync('z');
	assert.deepEqual([instance.snapshot.current, instance.snapshot.committed], ['z', 'z']);
	const pending = instance.set('b');
	instance.sync('y');
	assert.equal(instance.snapshot.current, 'b');
	gate.resolve();
	await pending;
	assert.equal(instance.snapshot.committed, 'b');
	instance.dispose();
});

test('a superseded change that succeeded becomes the committed value a later failure reverts to', async () => {
	const first = deferred<void | SettingsResult>();
	const second = deferred<void | SettingsResult>();
	const { instance } = core<boolean>(false, (v: boolean) => (v ? first.promise : second.promise));
	const a = instance.set(true);
	const b = instance.set(false);
	first.resolve();
	await a;
	// The handler accepted `true`; the newer change is still pending and owns the status.
	assert.deepEqual([instance.snapshot.current, instance.snapshot.committed, instance.snapshot.status], [false, true, 'pending']);
	second.resolve({ error: 'No' });
	await b;
	// The failure reverts to what the handler has now, not to the starting value.
	assert.deepEqual([instance.snapshot.current, instance.snapshot.committed, instance.snapshot.status], [true, true, 'error']);
	instance.dispose();
});

test('a superseded success that lands after the newest failed shows the saved value; after a newer success it is ignored', async () => {
	const slow = deferred<void | SettingsResult>();
	const failing = core<string>('a', (v: string) => (v === 'b' ? slow.promise : { error: 'No' }));
	const pending = failing.instance.set('b');
	await failing.instance.set('c');
	assert.deepEqual([failing.instance.snapshot.current, failing.instance.snapshot.status], ['a', 'error']);
	slow.resolve();
	await pending;
	assert.deepEqual([failing.instance.snapshot.current, failing.instance.snapshot.committed, failing.instance.snapshot.status], ['b', 'b', 'error']);
	failing.instance.dispose();

	const late = deferred<void | SettingsResult>();
	const winning = core<string>('a', (v: string) => (v === 'b' ? late.promise : undefined));
	const older = winning.instance.set('b');
	await winning.instance.set('c');
	late.resolve();
	await older;
	assert.deepEqual([winning.instance.snapshot.current, winning.instance.snapshot.committed, winning.instance.snapshot.status], ['c', 'c', 'saved']);
	winning.instance.dispose();
});

test('undo resolves false when the undo itself fails', async () => {
	let calls = 0;
	const { instance } = core<boolean>(false, () => (++calls === 2 ? { error: 'Undo refused' } : undefined));
	await instance.set(true);
	const token = instance.snapshot.undoToken;
	assert.equal(await instance.undo(token), false);
	assert.deepEqual([instance.snapshot.current, instance.snapshot.status, instance.snapshot.error], [true, 'error', 'Undo refused']);
	// A rejected undo fails the same way, and a successful one resolves true.
	const rejecting = new InstantCore<number>({ initial: 1, commit: () => () => undefined, undo: () => () => Promise.reject(new Error('x')), savedForMs: () => 5 });
	await rejecting.set(2);
	assert.equal(await rejecting.undo(), false);
	assert.equal(rejecting.snapshot.status, 'error');
	const fine = new InstantCore<number>({ initial: 1, commit: () => () => Promise.resolve(), savedForMs: () => 5 });
	await fine.set(2);
	assert.equal(await fine.undo(), true);
	rejecting.dispose();
	fine.dispose();
	instance.dispose();
});

test('readResult: errors, field errors and any conflict fail and keep only returned text; anything else succeeds', () => {
	assert.deepEqual(readResult(undefined), { ok: true });
	assert.deepEqual(readResult('done'), { ok: true });
	assert.deepEqual(readResult({}), { ok: true });
	assert.deepEqual(readResult({ notice: 'Sent again.' }), { ok: true, notice: 'Sent again.' });
	assert.deepEqual(readResult({ error: '  ' }), { ok: true });
	assert.deepEqual(readResult({ errors: { reason: undefined } }), { ok: true });
	assert.deepEqual(readResult({ error: 'Offline.' }), { ok: false, error: 'Offline.' });
	assert.deepEqual(readResult({ error: 'Offline.', errors: { name: 'Too long.' } }), { ok: false, error: 'Offline.' });
	assert.deepEqual(readResult({ errors: { name: 'Too long.', email: 'Taken.' } }), { ok: false, error: 'Too long. Taken.' });
	// A conflict is a failure even without a message: never "done".
	assert.deepEqual(readResult({ conflict: {} }), { ok: false, conflict: {} });
	assert.deepEqual(readResult({ conflict: { message: 'Scope conflict text' } }), { ok: false, error: 'Scope conflict text', conflict: { message: 'Scope conflict text' } });
});

test('toFormResult: what FormSubmit shows for a settings result; a conflict fails with its message or the generic text', () => {
	assert.equal(toFormResult(undefined, 'Failed.'), undefined);
	assert.equal(toFormResult({ notice: 'Done.' }, 'Failed.'), undefined);
	assert.equal(toFormResult({ error: ' ' }, 'Failed.'), undefined);
	assert.deepEqual(toFormResult({ error: 'Offline.' }, 'Failed.'), { error: 'Offline.' });
	assert.deepEqual(toFormResult({ errors: { name: 'Too long.', other: '' } }, 'Failed.'), { errors: { name: 'Too long.' } });
	assert.deepEqual(toFormResult({ error: 'Offline.', errors: { name: 'Too long.' } }, 'Failed.'), { error: 'Offline.', errors: { name: 'Too long.' } });
	assert.deepEqual(toFormResult({ conflict: { message: 'Changed elsewhere.' } }, 'Failed.'), { error: 'Changed elsewhere.' });
	assert.deepEqual(toFormResult({ conflict: {} }, 'Failed.'), { error: 'Failed.' });
});

test('UndoSlot hands a snapshot back once, to its own token only', () => {
	const slot = new UndoSlot<string>();
	const a = slot.remember('first');
	const b = slot.remember('second');
	assert.equal(slot.take(a), null);
	assert.equal(slot.isCurrent(b), true);
	assert.equal(slot.take(b), 'second');
	assert.equal(slot.take(b), null);
	const c = slot.remember('third');
	slot.forget();
	assert.equal(slot.isCurrent(c), false);
});

// ---------- locks ----------

test('pickLock keeps the strongest lock; ties go to the earlier argument', () => {
	const plan: SettingLock = { kind: 'plan', reason: 'Upgrade' };
	const readonly: SettingLock = { kind: 'readonly' };
	const permission: SettingLock = { kind: 'permission', source: 'row' };
	const permission2: SettingLock = { kind: 'permission', source: 'page' };
	assert.equal(pickLock(), undefined);
	assert.equal(pickLock(undefined, null), undefined);
	assert.equal(pickLock(plan, undefined, readonly), readonly);
	assert.equal(pickLock(plan, permission), permission);
	assert.equal(pickLock(permission, permission2), permission);
	assert.equal(pickLock({ kind: 'unsupported' }, { kind: 'awaiting-approval' })!.kind, 'awaiting-approval');
	assert.deepEqual(LOCK_PRECEDENCE, ['readonly', 'permission', 'managed', 'inherited', 'plan', 'awaiting-approval', 'unsupported']);
	for (let i = 1; i < LOCK_PRECEDENCE.length; i++) {
		assert.equal(pickLock({ kind: LOCK_PRECEDENCE[i] }, { kind: LOCK_PRECEDENCE[i - 1] })!.kind, LOCK_PRECEDENCE[i - 1]);
	}
});

test('lockAttrs disables natively and points at the reason', () => {
	assert.deepEqual(lockAttrs(undefined, 'r1'), {});
	assert.deepEqual(lockAttrs({ kind: 'managed' }, 'r1'), { disabled: true, 'data-locked': 'managed', 'aria-describedby': 'r1' });
	assert.deepEqual(lockAttrs({ kind: 'plan' }, undefined), { disabled: true, 'data-locked': 'plan' });
	assert.equal(lockReasonText({ kind: 'plan', reason: 'Business plan only.' }), 'Business plan only.');
	assert.equal(lockReasonText({ kind: 'plan' }), LOCK_LABELS.plan);
	assert.equal(lockReasonText({ kind: 'plan' }, { plan: 'Upgrade to use this.' }), 'Upgrade to use this.');
});

// ---------- typed confirmation ----------

/** Phrases with options, and what people might type. phrasePattern must gate each exactly as matchesPhrase does. */
const confirmCases: { phrase: string; options: { caseSensitive?: boolean; trim?: boolean }; typed: string[] }[] = [
	{ phrase: 'northwind', options: {}, typed: ['northwind', ' northwind  ', 'Northwind', 'northwin', 'northwindx', ''] },
	{ phrase: 'a.b*c(d)[e]{f}|g/h\\i^j$k+?-l', options: {}, typed: ['a.b*c(d)[e]{f}|g/h\\i^j$k+?-l', 'aXb*c(d)[e]{f}|g/h\\i^j$k+?-l', 'a.bc(d)[e]{f}|g/h\\i^j$k+?-l'] },
	{ phrase: 'Team Ünïcode', options: { caseSensitive: false }, typed: ['team ünïcode', 'TEAM ÜNÏCODE', 'team unicode', ' Team Ünïcode '] },
	{ phrase: 'keep spaces', options: { trim: false }, typed: ['keep spaces', ' keep spaces', 'Keep spaces'] },
	{ phrase: 'straße', options: { caseSensitive: false }, typed: ['straße', 'STRASSE', 'Straße'] },
	{ phrase: '  padded  ', options: {}, typed: ['padded', '  padded', 'pad ded'] }
];

/** Compiles a pattern the way a browser compiles `pattern=` (whole value, `v` flag). */
const nativeGate = (pattern: string) => new RegExp(`^(?:${pattern})$`, 'v');

test('matchesPhrase compares trimmed, case-sensitive by default', () => {
	assert.equal(matchesPhrase('northwind', 'northwind'), true);
	assert.equal(matchesPhrase('  northwind ', 'northwind'), true);
	assert.equal(matchesPhrase('  northwind ', 'northwind', { trim: false }), false);
	assert.equal(matchesPhrase('Northwind', 'northwind'), false);
	assert.equal(matchesPhrase('NORTHWIND', 'northwind', { caseSensitive: false }), true);
	assert.equal(matchesPhrase('', ''), false);
	assert.equal(matchesPhrase('café', 'café'), true);
});

test('phrasePattern escapes pattern syntax and gates like matchesPhrase', () => {
	for (const { phrase, options, typed } of confirmCases) {
		const gate = nativeGate(phrasePattern(phrase, options));
		for (const value of typed) {
			assert.equal(gate.test(value), matchesPhrase(value, phrase, options), `${JSON.stringify(phrase)} vs ${JSON.stringify(value)} ${JSON.stringify(options)}`);
		}
	}
	assert.equal(phrasePattern('a.b'), '\\s*a\\.b\\s*');
	assert.equal(phrasePattern('Ab', { caseSensitive: false, trim: false }), '[aA][bB]');
});

// ---------- search ----------

test('searchSettings ranks label prefix, then label word, then keyword, then anywhere', () => {
	const entries = [
		{ id: 'desc', label: 'Activity log', section: 'Data', href: '#1', description: 'Old data is pruned.' },
		{ id: 'keyword', label: 'History', section: 'Data', href: '#2', keywords: ['data pruning'] },
		{ id: 'word', label: 'Auto prune old data', section: 'Data', href: '#3' },
		{ id: 'prefix', label: 'Pruning', section: 'Data', href: '#4' },
		{ id: 'none', label: 'Theme', section: 'Look', href: '#5' }
	];
	assert.deepEqual(
		searchSettings(entries, 'prun').map((r) => r.entry.id),
		['prefix', 'word', 'keyword', 'desc']
	);
	const order = searchSettings(entries, 'prun');
	assert.deepEqual(order.map((r) => r.score), [0, 1, 2, 3]);
	assert.deepEqual(searchSettings(entries, 'old').map((r) => r.entry.id), ['word', 'desc']);
	assert.deepEqual(searchSettings(entries, ''), []);
	assert.deepEqual(searchSettings(entries, 'zzz'), []);
});

test('searchSettings needs every word and returns merged highlight ranges', () => {
	const [hit] = searchSettings(SAMPLE_SETTINGS_SEARCH, 'data ret');
	assert.equal(hit.entry.id, 'retention');
	assert.deepEqual(hit.ranges, [
		[0, 4],
		[5, 8]
	]);
	assert.deepEqual(highlightSegments(hit.entry.label, hit.ranges), [
		{ text: 'Data', match: true },
		{ text: ' ', match: false },
		{ text: 'ret', match: true },
		{ text: 'ention', match: false }
	]);
	assert.deepEqual(searchSettings(SAMPLE_SETTINGS_SEARCH, 'retention zebra'), []);
	const [desc] = searchSettings(SAMPLE_SETTINGS_SEARCH, 'zip');
	assert.equal(desc.entry.id, 'export');
	assert.deepEqual(desc.ranges, []);
	assert.deepEqual(desc.descriptionRanges, [[25, 28]]);
});

test('searchSettings ignores case and diacritics; ranges point into the original text', () => {
	const [plain] = searchSettings(SAMPLE_SETTINGS_SEARCH, 'RESUME');
	assert.equal(plain.entry.label, 'Résumé visibility');
	assert.deepEqual(plain.ranges, [[0, 6]]);
	// Decomposed text: the combining accent stays inside the highlight.
	const decomposed = [{ id: 'x', label: 'Café hours', section: 'S', href: '#' }];
	const [hit] = searchSettings(decomposed, 'café');
	assert.deepEqual(hit.ranges, [[0, 5]]);
	assert.equal(highlightSegments(decomposed[0].label, hit.ranges)[0].text, 'Café');
});

test('searchSettings respects the limit and keeps entry order on ties', () => {
	const many = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, label: `Setting ${i}`, section: 'All', href: `#${i}` }));
	assert.equal(searchSettings(many, 'setting').length, 20);
	assert.deepEqual(searchSettings(many, 'setting', 3).map((r) => r.entry.id), ['s0', 's1', 's2']);
	assert.deepEqual(searchSettings(many, 'setting', 0), []);
});

test('filterSettingsLinks keeps matching links and drops empty groups', () => {
	assert.equal(filterSettingsLinks(SAMPLE_SETTINGS_NAV, '  '), SAMPLE_SETTINGS_NAV);
	const privacy = filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'PRIVACY');
	assert.deepEqual(privacy.map((g) => [g.id, g.items.map((i) => i.id)]), [['team', ['data']]]);
	// Group labels count: "team" keeps every Team link.
	assert.equal(filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'team')[0].items.length, 5);
	assert.deepEqual(filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'theme').map((g) => g.items.map((i) => i.id)), [['appearance']]);
	assert.deepEqual(filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'members 6').map((g) => g.items.map((i) => i.id)), [['members']]);
	assert.deepEqual(filterSettingsLinks(SAMPLE_SETTINGS_NAV, 'nothing here'), []);
});

test('toPaletteCommands groups by section and navigates on run', () => {
	const visited: string[] = [];
	const commands = toPaletteCommands(SAMPLE_SETTINGS_SEARCH.slice(0, 2), (href) => visited.push(href));
	assert.deepEqual(
		commands.map(({ id, label, group, keywords }) => ({ id, label, group, keywords })),
		[
			{ id: 'display-name', label: 'Display name', group: 'Profile', keywords: ['name', 'Profile'] },
			{ id: 'contact-email', label: 'Contact email', group: 'Profile', keywords: ['address', 'mail', 'Profile'] }
		]
	);
	commands[1].onRun?.();
	assert.deepEqual(visited, ['/settings/profile#contact-email']);
});

// ---------- focus, actions ----------

test('focusIndexAfterRemoval moves to the next item, then the previous, then nothing', () => {
	assert.equal(focusIndexAfterRemoval(1, 3), 1);
	assert.equal(focusIndexAfterRemoval(3, 3), 2);
	assert.equal(focusIndexAfterRemoval(0, 1), 0);
	assert.equal(focusIndexAfterRemoval(0, 0), null);
});

test('actionButtonProps draws links, intents and unavailable actions the same way everywhere', () => {
	assert.deepEqual(actionButtonProps({ label: 'Docs', href: '/docs', external: true }), {
		variant: 'secondary',
		href: '/docs',
		target: '_blank',
		rel: 'noopener noreferrer'
	});
	assert.deepEqual(actionButtonProps({ label: 'Reset', intent: 'reset', tone: 'danger' }), { variant: 'danger', type: 'submit', name: 'intent', value: 'reset' });
	assert.deepEqual(actionButtonProps({ label: 'Upgrade', href: '/billing', unavailable: 'Owners only.', ariaLabel: 'Upgrade plan', tone: 'accent' }, 'why'), {
		variant: 'accent',
		'aria-label': 'Upgrade plan',
		softDisabled: true,
		type: 'button',
		'aria-describedby': 'why'
	});
	assert.deepEqual(actionButtonProps({ label: 'Do it', onSelect: () => undefined }), { variant: 'secondary', type: 'button' });
});

test('actionButtonProps waits for the page to be ready before a button that only calls back', () => {
	const select = () => undefined;
	// A callback does nothing without JavaScript, and a click before hydration is lost.
	assert.deepEqual(actionButtonProps({ label: 'Regenerate', onSelect: select }, undefined, { ready: false }), { variant: 'secondary', type: 'button', softDisabled: true });
	assert.deepEqual(actionButtonProps({ label: 'Regenerate', onSelect: select }, undefined, { ready: true }), { variant: 'secondary', type: 'button' });
	// Nothing to call: unavailable for good.
	assert.deepEqual(actionButtonProps({ label: 'Nothing' }, undefined, { ready: true }), { variant: 'secondary', type: 'button', softDisabled: true });
	// Links and intents in a form work natively, so they never wait.
	assert.deepEqual(actionButtonProps({ label: 'Docs', href: '/docs' }, undefined, { ready: false }), { variant: 'secondary', href: '/docs' });
	assert.deepEqual(actionButtonProps({ label: 'Reset', intent: 'reset' }, undefined, { ready: false }), { variant: 'secondary', type: 'submit', name: 'intent', value: 'reset' });
	// An intent with no form to post it is a callback action.
	assert.deepEqual(actionButtonProps({ label: 'Reset', intent: 'reset', onSelect: select }, undefined, { ready: false, inForm: false }), { variant: 'secondary', type: 'button', softDisabled: true });
	assert.deepEqual(actionButtonProps({ label: 'Reset', intent: 'reset', onSelect: select }, undefined, { ready: true, inForm: false }), { variant: 'secondary', type: 'button' });
	assert.deepEqual(actionButtonProps({ label: 'Reset', intent: 'reset' }, undefined, { ready: true, inForm: false }), { variant: 'secondary', type: 'button', softDisabled: true });
});

// ---------- structure rules every settings component follows ----------

const settingsDir = join(process.cwd(), 'src', 'lib', 'settings');
function files(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : [path];
	});
}
const sources = files(settingsDir).map((path) => ({ rel: relative(process.cwd(), path).replace(/\\/g, '/'), source: readFileSync(path, 'utf8') }));

const GROUPS = ['shell', 'rows', 'save', 'controls'];

test('dev-only code reads isDev() (esm-env), never import.meta.env, so it works outside Vite and svelte-package stays quiet', () => {
	const offenders = sources.filter(({ source }) => /import\.meta\.env/.test(source)).map(({ rel }) => rel);
	assert.deepEqual(offenders, []);
	const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
	assert.ok(pkg.dependencies?.['esm-env'], 'esm-env is a declared dependency');
});

/** Import targets in a group file that reach another group: directly, or through a barrel that re-exports every group. */
function crossGroupImports(rel: string, source: string): string[] {
	const own = GROUPS.find((g) => rel.startsWith(`src/lib/settings/${g}/`));
	if (!own) return [];
	const bad: string[] = [];
	for (const [, , target] of source.matchAll(/(?:from|import)\s*\(?\s*(['"])([^'"]+)\1/g)) {
		if (target === 'agents-kit-svelte' || target.startsWith('agents-kit-svelte/')) {
			bad.push(target);
			continue;
		}
		let resolved: string;
		if (target.startsWith('.')) resolved = posix.normalize(posix.join(posix.dirname(rel), target));
		else if (target === '$lib' || target.startsWith('$lib/')) resolved = 'src/lib' + target.slice('$lib'.length);
		else continue;
		resolved = resolved.replace(/\/$/, '').replace(/\.(?:svelte\.)?[jt]s$/, '').replace(/\/index$/, '');
		const barrels = ['src/lib', 'src/lib/settings', 'src/lib/entries/settings'];
		const other = GROUPS.find((g) => g !== own && (resolved === `src/lib/settings/${g}` || resolved.startsWith(`src/lib/settings/${g}/`)));
		if (other || barrels.includes(resolved)) bad.push(target);
	}
	return bad;
}

test('the cross-group import check also rejects barrels and package paths', () => {
	const rel = 'src/lib/settings/save/SaveBar.svelte';
	const allowedSource = [`import { RECIPES } from '../shared/recipes';`, `import Button from '../../primitives/actions/Button.svelte';`, `import { x } from './local';`].join('\n');
	assert.deepEqual(crossGroupImports(rel, allowedSource), []);
	for (const target of ['..', '../', '../index', '../index.ts', '../rows', '../rows/SettingsRow.svelte', '$lib/settings', '$lib/settings/rows', '$lib/entries/settings', '$lib', '../..', 'agents-kit-svelte/settings', 'agents-kit-svelte']) {
		assert.deepEqual(crossGroupImports(rel, `import { SettingsRow } from '${target}';`), [target], target);
	}
	assert.deepEqual(crossGroupImports(rel, `const m = import('../rows/SettingsRow.svelte');`), ['../rows/SettingsRow.svelte']);
	// A file outside the groups (the shared layer, the root index) is not checked.
	assert.deepEqual(crossGroupImports('src/lib/settings/index.ts', `export * from './rows';`), []);
});

/** The shared readers: a component that runs a settings callback reads its result through one of these. */
const RESULT_READERS = ['readResult', 'toFormResult', 'SettingsHandlerRun', 'InstantSetting', 'InstantCore'];

/**
 * A group component that runs a callback whose result counts (a `SettingsHandler` prop it does more
 * with than pass on, or an action's `onSelect`) and imports none of the shared readers: it must be
 * reading `{error}` by hand, and a `{conflict}` then passes as success.
 */
function handRolledReader(rel: string, source: string): string | undefined {
	if (!GROUPS.some((g) => rel.startsWith(`src/lib/settings/${g}/`)) || !rel.endsWith('.svelte')) return undefined;
	const handlers = [...source.matchAll(/(\w+)\??:\s*SettingsHandler</g)].map(([, name]) => name);
	const runsHandler = handlers.some((name) => {
		const uses = [...source.matchAll(new RegExp(`(?<![\\w.'"])${name}\\b(?!\\??:)`, 'g'))].length;
		const forwards = [...source.matchAll(new RegExp(`\\{${name}\\}|\\b${name}=\\{${name}\\}`, 'g'))].length;
		// The destructuring is one use; anything beyond it that is not a plain forward runs it.
		return uses - 1 - forwards > 0;
	});
	// An action's `onSelect` (a `SettingsAction`, an item's action), called here or handed to a runner.
	const runsAction = /\??\.onSelect\b/.test(source);
	if (!runsHandler && !runsAction) return undefined;
	const imports = [...source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"][^'"]*\/shared(?:\/[^'"]*)?['"]/g)].map(([, names]) => names).join(',');
	return RESULT_READERS.some((reader) => new RegExp(`(?<!type\\s)\\b${reader}\\b`).test(imports)) ? undefined : rel;
}

test('the hand-rolled result reader check flags a component that reads a callback by hand, not one that forwards it', () => {
	const rel = 'src/lib/settings/save/Thing.svelte';
	const props = `interface Props { onRequest?: SettingsHandler<[]>; }
let { onRequest }: Props = $props();
`;
	assert.equal(handRolledReader(rel, `${props}async function go() { const r = await onRequest?.(); if (r?.error) shown = r.error; }`), rel);
	assert.equal(handRolledReader(rel, `${props}<LockReason {onRequest} />`), undefined);
	assert.equal(handRolledReader(rel, `import { readResult } from '../shared/undo';
${props}const o = readResult(await onRequest?.());`), undefined);
	assert.equal(handRolledReader(rel, `const r = await action.onSelect?.(); failure = r?.error;`), rel);
	assert.equal(handRolledReader(rel, `import { SettingsHandlerRun } from '../shared/run.svelte';
void run.run(action.onSelect);`), undefined);
	assert.equal(handRolledReader('src/lib/settings/shared/run.svelte.ts', `const r = await onSelect(); r.error;`), undefined);
});

test('every settings component that runs a callback reads its result through the shared layer (readResult and friends)', () => {
	assert.deepEqual(sources.map(({ rel, source }) => handRolledReader(rel, source)).filter(Boolean), []);
});

test('the shared layer has no .svelte files and groups never import another group', () => {
	for (const { rel, source } of sources) {
		assert.ok(!(rel.startsWith('src/lib/settings/shared/') && rel.endsWith('.svelte')), `${rel}: the shared layer is .ts and .svelte.ts only`);
		assert.deepEqual(crossGroupImports(rel, source), [], `${rel} imports another settings group (directly or through a barrel)`);
	}
});

/** Problems with layout and colour in one settings source: viewport breakpoints, non-CQ container queries, hex colours. */
function lookProblems(source: string): string[] {
	const allowed = new Set(Object.values(CQ).flatMap((v) => [v, v.replace('@', '@max-')]));
	const problems: string[] = [];
	for (const [, variant] of source.matchAll(/(@(?:max-)?[\w[\]-]+\/settings):/g)) {
		if (!allowed.has(variant)) problems.push(`uses ${variant}; use the CQ breakpoints (${[...allowed].join(', ')})`);
	}
	if (/(?<=["'`\s{])(?:max-)?(?:sm|md|lg|xl|2xl):[a-z[-]/.test(source)) problems.push('uses a viewport breakpoint; use container queries');
	if (/@media\s*\((?:min|max)-width/.test(source)) problems.push('uses a viewport media query');
	// Fragment links (`href="#add"`, `closeHref: '#feed'`) are not colours.
	const withoutLinks = source.replace(/\w*[Hh]ref\s*[:=]\s*\{?\s*(['"`])[^'"`]*\1/g, '');
	if (/(?:^|[\s:"'`=(,[])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(withoutLinks)) problems.push('hard-codes a hex colour');
	return problems;
}

test('the look check flags breakpoints and hex colours, not fragment links', () => {
	assert.deepEqual(lookProblems(`<a href="#add">Add</a> <Button href={'#feed'} /> const link = { closeHref: '#face' };`), []);
	assert.deepEqual(lookProblems(`class="@lg/settings:flex @max-3xl/settings:grid"`), []);
	assert.equal(lookProblems(`export const METER = 'text-[#fafafa]';`).length, 1);
	assert.equal(lookProblems(`const fill = "#0a0a0a";`).length, 1);
	assert.equal(lookProblems(`export const WIDE = 'md:grid';`).length, 1);
	assert.equal(lookProblems(`export const WIDE = '@md/settings:grid';`).length, 1);
});

test('settings sources use container queries from CQ only, never viewport breakpoints or hex colours', () => {
	// Every .svelte and .ts file in the collection: a group's own class-constant siblings count too.
	for (const { rel, source } of sources.filter((s) => /\.(?:svelte|ts)$/.test(s.rel))) {
		assert.deepEqual(lookProblems(source), [], rel);
	}
});
