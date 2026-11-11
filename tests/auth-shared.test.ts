import assert from 'node:assert/strict';
import test from 'node:test';
import { readCheck, readText } from '../src/lib/auth/shared/form-data.ts';
import { secondsLeft } from '../src/lib/auth/shared/wait.ts';

test('secondsLeft rounds up, never goes negative, and treats missing or invalid times as no wait', () => {
	const now = Date.parse('2026-11-11T12:00:00Z');
	assert.equal(secondsLeft(undefined, now), 0);
	assert.equal(secondsLeft('not a time', now), 0);
	assert.equal(secondsLeft(now - 5000, now), 0);
	assert.equal(secondsLeft(now, now), 0);
	assert.equal(secondsLeft(now + 1, now), 1);
	assert.equal(secondsLeft(now + 29_001, now), 30);
	assert.equal(secondsLeft(new Date(now + 60_000), now), 60);
	assert.equal(secondsLeft('2026-11-11T12:00:10Z', now), 10);
});

test('readText trims text but keeps passwords as typed', () => {
	const data = new FormData();
	data.set('email', '  ada@example.com ');
	data.set('password', ' secret ');
	assert.equal(readText(data, 'email'), 'ada@example.com');
	assert.equal(readText(data, 'password', false), ' secret ');
	assert.equal(readText(data, 'missing'), '');
	data.set('file', new Blob(['x']));
	assert.equal(readText(data, 'file'), '');
});

test('readCheck is true only for a submitted checkbox', () => {
	const data = new FormData();
	data.set('remember', 'on');
	assert.equal(readCheck(data, 'remember'), true);
	assert.equal(readCheck(data, 'terms'), false);
});
