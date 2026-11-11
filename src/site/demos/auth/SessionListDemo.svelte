<script lang="ts">
	import { SessionList } from '$lib/auth/account';
	import type { AuthSession } from '$lib/auth/shared';

	const MINUTE = 60_000;
	const start = Date.now();
	let sessions = $state<AuthSession[]>([
		{ id: 'this', label: 'Chrome on Windows', kind: 'desktop', location: 'Berlin, Germany', current: true },
		{ id: 'phone', label: 'Safari on iPhone', kind: 'mobile', location: 'Berlin, Germany', lastActive: start - 12 * MINUTE },
		{ id: 'tablet', label: 'Firefox on iPad', kind: 'tablet', location: 'Hamburg, Germany', lastActive: start - 3 * 60 * MINUTE },
		{ id: 'old', label: 'Edge on Linux', kind: 'desktop', location: '203.0.113.7', lastActive: start - 2 * 24 * 60 * MINUTE }
	]);
	let log = $state('');

	/** A slow server call. */
	const wait = (ms = 1000) => new Promise<void>((resolve) => setTimeout(resolve, ms));

	async function revoke(id: string) {
		await wait(id === 'phone' ? 2500 : 1000);
		sessions = sessions.filter((session) => session.id !== id);
		log = `Revoked ${id}`;
	}
	async function revokeOthers() {
		await wait();
		sessions = sessions.filter((session) => session.current);
		log = 'Revoked all others';
	}
	let failing = $state<AuthSession[]>([
		{ id: 'this', label: 'Chrome on Windows', kind: 'desktop', current: true },
		{ id: 'flaky', label: 'Brave on Android', kind: 'mobile', location: 'Oslo, Norway', lastActive: start - 20 * MINUTE }
	]);
	/** A revoke the server refuses. */
	async function refuse(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		throw new Error('refused');
	}
	let throwing = $state<AuthSession[]>([
		{ id: 'this', label: 'Chrome on Windows', kind: 'desktop', current: true },
		{ id: 'sync', label: 'Opera on Linux', kind: 'desktop', location: 'Rome, Italy', lastActive: start - 40 * MINUTE }
	]);
	/** A revoke that throws at once, before any promise exists. */
	function refuseAtOnce(): void {
		throw new Error('refused');
	}
	function reset() {
		sessions = [
			{ id: 'this', label: 'Chrome on Windows', kind: 'desktop', location: 'Berlin, Germany', current: true },
			{ id: 'phone', label: 'Safari on iPhone', kind: 'mobile', location: 'Berlin, Germany', lastActive: Date.now() - 12 * MINUTE },
			{ id: 'tablet', label: 'Firefox on iPad', kind: 'tablet', location: 'Hamburg, Germany', lastActive: Date.now() - 3 * 60 * MINUTE }
		];
		log = '';
	}
</script>

<div class="flex max-w-xl flex-col gap-3">
	<SessionList {sessions} onRevoke={revoke} onRevokeOthers={revokeOthers} />
	<div class="flex items-center gap-3">
		<button type="button" class="rounded-control border border-card-border px-3 py-1 text-[13px] text-fg-main" onclick={reset}>Reset sessions</button>
		<p class="m-0 text-[13px] text-fg-light" data-testid="sessions-log">{log}</p>
	</div>
	<SessionList sessions={failing} onRevoke={refuse} labels={{ title: 'Signed-in devices (failing)' }} />
	<SessionList sessions={throwing} onRevoke={refuseAtOnce} labels={{ title: 'Signed-in devices (throwing)' }} />
	<SessionList sessions={[]} labels={{ title: "Signed-in devices (none)" }} />
</div>
