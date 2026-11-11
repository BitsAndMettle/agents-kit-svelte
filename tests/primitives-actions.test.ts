import assert from 'node:assert/strict';
import test from 'node:test';
import { actionAttrs, isBlocked } from '../src/lib/primitives/actions/state.ts';

test('a button is natively disabled; loading only marks it busy so it stays focusable', () => {
	const off = actionAttrs({ disabled: true, loading: false, href: undefined });
	assert.equal(off.disabled, true);
	const busy = actionAttrs({ disabled: false, loading: true, href: undefined });
	assert.equal(busy.disabled, undefined);
	assert.equal(busy['aria-busy'], true);
	assert.equal(busy['aria-disabled'], 'true');
});

test('a disabled link loses its href and says it is disabled; a busy link keeps its href', () => {
	const off = actionAttrs({ disabled: true, loading: false, href: '/x' });
	assert.equal(off.href, undefined);
	assert.equal(off.role, 'link');
	assert.equal(off['aria-disabled'], 'true');
	const busy = actionAttrs({ disabled: false, loading: true, href: '/x' });
	assert.equal(busy.href, '/x');
	assert.equal(busy['aria-busy'], true);
});

test('an idle enabled action carries no state attributes and is not blocked', () => {
	const idle = actionAttrs({ disabled: false, loading: false, href: undefined });
	assert.deepEqual(Object.values(idle).filter((v) => v !== undefined), []);
	assert.equal(isBlocked({ disabled: false, loading: false }), false);
	assert.equal(isBlocked({ disabled: false, loading: true }), true);
	assert.equal(isBlocked({ disabled: true, loading: false }), true);
});

test('a soft-disabled action stays focusable: aria-disabled, never disabled, and blocked', () => {
	const soft = actionAttrs({ disabled: false, loading: false, href: undefined, softDisabled: true });
	assert.equal(soft.disabled, undefined);
	assert.equal(soft['aria-disabled'], 'true');
	assert.equal(soft['aria-busy'], undefined);
	assert.equal(isBlocked({ disabled: false, loading: false, softDisabled: true }), true);
	const softLink = actionAttrs({ disabled: false, loading: false, href: '/x', softDisabled: true });
	assert.equal(softLink.href, '/x');
	assert.equal(softLink['aria-disabled'], 'true');
});
