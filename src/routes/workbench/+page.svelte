<!--
	ChatWorkbench with app-supplied data: no demo, no scripted reply. The page owns the conversation, as an
	app would, and logs every event the workbench raises. Also the fixture for tests/browser/keyboard/chat-workbench.spec.ts.
-->
<script lang="ts">
	import ChatWorkbench from '$lib/workbench/ChatWorkbench.svelte';
	import { pillClass } from '$lib/ui/styles';
	import type { ChatWorkbenchConversation, ChatWorkbenchMessage, PromptAttachment, PromptInputEffort, PromptInputOption } from '$lib/types';

	const REPLY = [
		'Two cards are **blocked**, both on review:',
		'',
		'- Card 212 · waiting on `check-boundaries`',
		'- Card 218 · needs a decision on the redirect policy',
		'',
		'```',
		'trailside cards --blocked',
		'```',
		'',
		'Details are on the [Board](https://example.com/board). This stays text: [x](javascript:alert(1)) and <img src=x onerror=alert(1)>.'
	].join('\n');

	let messages = $state<ChatWorkbenchMessage[]>([
		{ id: 'm1', role: 'user', text: 'What is blocked right now?', timestamp: '14:02' },
		{
			id: 'm2',
			role: 'assistant',
			timestamp: '14:02',
			parts: [
				{ type: 'tool', tool: 'list_cards', summary: 'Done', status: 'success' },
				{ type: 'note', text: 'About Card 212 · BitsAndMettle/example' }
			],
			text: REPLY
		}
	]);
	let conversations = $state<ChatWorkbenchConversation[]>([
		{ id: 'c1', title: 'What is blocked right now?', date: 'Nov 12, 14:02', subtitle: 'devbox', active: true },
		{ id: 'c2', title: 'Card 198 · BitsAndMettle/example', date: 'Nov 11, 09:40', subtitle: 'devbox' }
	]);
	const models: PromptInputOption[] = [
		{ id: 'sonnet', label: 'Sonnet' },
		{ id: 'opus', label: 'Opus' },
		{ id: 'haiku', label: 'Haiku' }
	];
	const efforts: PromptInputEffort[] = [
		{ id: 'low', label: 'Low' },
		{ id: 'medium', label: 'Medium' },
		{ id: 'high', label: 'High' },
		{ id: 'max', label: 'Max' }
	];
	let model = $state('sonnet');
	let effort = $state('medium');
	let attachments = $state<PromptAttachment[]>([{ id: 'card-212', label: 'Card 212 · BitsAndMettle/example', title: 'The Referee reads this card' }]);
	let draft = $state('');
	let log = $state<string[]>([]);
	let n = 0;

	function send(text: string, sent: PromptAttachment[]): void {
		log.push(`send:${text}:${sent.map((item) => item.id).join(',')}`);
		messages.push({ id: `u${++n}`, role: 'user', text });
	}
</script>

<div class="mx-auto max-w-6xl space-y-8 px-4 py-6">
	<h1 class="text-xl font-semibold text-fg-main">ChatWorkbench with your data</h1>

	<div class="h-[640px] overflow-hidden rounded-xl border border-card-border" data-testid="full">
		<ChatWorkbench
			title="Referee"
			subtitle="devbox"
			status={{ text: 'Online', tone: 'success' }}
			assistantName="Referee"
			{messages}
			{conversations}
			onSelectConversation={(id) => {
				log.push(`select:${id}`);
				conversations = conversations.map((row) => ({ ...row, active: row.id === id }));
			}}
			onNewConversation={() => log.push('new')}
			bind:value={draft}
			placeholder="Message the Referee"
			bind:attachments
			onRemoveAttachment={(id) => {
				log.push(`remove:${id}`);
				attachments = attachments.filter((item) => item.id !== id);
			}}
			{models}
			{efforts}
			bind:model
			bind:effort
			onModelChange={(choice) => log.push(`model:${choice.model}:${choice.effort}`)}
			onSend={send}
		>
			{#snippet headerActions({ button })}
				<button type="button" class={button} onclick={() => log.push('pause')}>Pause</button>
			{/snippet}
		</ChatWorkbench>
	</div>

	<section aria-labelledby="panel-heading" class="space-y-2">
		<h2 id="panel-heading" class="text-sm font-medium text-fg-light">Panel layout, 380px wide</h2>
		<div class="h-[560px] w-[380px] max-w-full overflow-hidden rounded-xl border border-card-border" data-testid="panel">
			<ChatWorkbench
				aria-label="Referee panel"
				layout="panel"
				headingLevel={3}
				title="Referee"
				status={{ text: 'Offline', tone: 'danger' }}
				presence={{ state: 'offline', subject: 'Referee on devbox', detail: 'Waiting for devbox.' }}
				messages={[]}
				conversations={[]}
				conversationsNotice="Reading the conversations on devbox…"
				disabled
				placeholder="Waiting for devbox."
			>
				{#snippet empty()}
					<p class="text-[13px] text-fg-light">Ask the Referee what is happening.</p>
				{/snippet}
				{#snippet headerActions({ icon })}
					<button type="button" class={icon} aria-label="Close panel">×</button>
				{/snippet}
			</ChatWorkbench>
		</div>
	</section>

	<section aria-labelledby="log-heading">
		<h2 id="log-heading" class="text-sm font-medium text-fg-light">Events</h2>
		<ol data-testid="events" class="mt-1 font-mono text-xs text-fg-main">
			{#each log as entry, index (index)}<li>{entry}</li>{/each}
		</ol>
		<button type="button" class={pillClass('ghost', 'xs')} onclick={() => (log = [])}>Clear events</button>
	</section>
</div>
