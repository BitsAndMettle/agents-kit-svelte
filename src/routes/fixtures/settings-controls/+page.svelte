<!--
	Browser-test fixture for the Settings controls (tests/browser/keyboard/settings-controls.spec.ts).
	Not part of the catalogue: an instant NotificationMatrix in the explicit list layout, which no demo
	shows (the catalogue's list matrix is staged, so it never shows a saving spinner).
-->
<script lang="ts">
	import { Bell, Mail, Smartphone } from '@lucide/svelte';
	import { NotificationMatrix, type NotificationChannel, type NotificationEvent } from '$lib/settings/controls';

	const events: NotificationEvent[] = [
		{ id: 'mention', label: 'Mentions', description: 'Someone mentions you or your team.' },
		{ id: 'reply', label: 'Replies' },
		{ id: 'digest', label: 'Weekly summary' }
	];
	const channels: NotificationChannel[] = [
		{ id: 'app', label: 'In app', icon: Bell },
		{ id: 'email', label: 'Email', icon: Mail },
		{ id: 'push', label: 'Push', icon: Smartphone }
	];
	let value = $state(['mention:app', 'mention:email', 'reply:app']);
	/** Answers after 600 ms, like the catalogue demos. */
	const commitCell = () => new Promise<void>((resolve) => setTimeout(resolve, 600));
</script>

<main class="mx-auto max-w-3xl p-4 text-fg-main">
	<h1 class="text-lg font-semibold">NotificationMatrix list-layout fixture</h1>
	<div class="mt-4">
		<NotificationMatrix {events} {channels} bind:value onCellCommit={commitCell} layout="list" labels={{ caption: 'Notify me' }} data-testid="nm-list-instant" />
	</div>
</main>
