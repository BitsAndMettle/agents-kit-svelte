<script lang="ts">
	import { CardFace, CardSheet, type CardFact, type CardQuestion } from '$lib/board';
	import { Alert } from '$lib/primitives/display';
	import { buttonClass, type UiTone } from '$lib/ui/styles';

	interface Task {
		id: number;
		title: string;
		status: string;
		tone: UiTone;
		facts: CardFact[];
		question?: CardQuestion;
	}

	let tasks = $state<Task[]>([
		{
			id: 221,
			title: 'Rotate the signing key',
			status: 'Needs your answer',
			tone: 'warning',
			facts: [
				{ label: 'Feature', value: 'Key hygiene' },
				{ label: 'Run', value: 'Stopped while planning' }
			],
			question: {
				text: 'The plan names two keys.\nWhich one should this card rotate?',
				options: ['The signing key', 'The webhook secret', 'Both, in one pull request, with the signing key first so that a failure leaves the webhook secret as it is']
			}
		},
		{
			id: 217,
			title: 'Render the digest template',
			status: 'Waiting for your approval',
			tone: 'accent',
			facts: [
				{ label: 'Pull request', value: '#57', href: '#card-sheet' },
				{ label: 'Checks', value: 'Passed', tone: 'success' },
				{ label: 'Risk', value: 'Medium' },
				{ label: 'Head', value: '9f2c1ab' }
			]
		}
	]);

	let open = $state(false);
	let shownId = $state(221);
	let shown = $derived(tasks.find((task) => task.id === shownId) ?? tasks[0]);
	let refused = $state('');

	function show(task: Task): void {
		shownId = task.id;
		refused = '';
		open = true;
	}

	function settle(change: Partial<Task>): void {
		tasks = tasks.map((task) => (task.id === shownId ? { ...task, ...change } : task));
	}

	/** A slow server that takes every answer but one. */
	async function answer(option: string): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 800));
		refused = option === 'The webhook secret' ? 'This card may not touch the webhook secret.' : '';
		if (!refused) settle({ status: 'Ready', tone: 'success', question: undefined, facts: [{ label: 'Feature', value: 'Key hygiene' }, { label: 'Answer', value: option }] });
	}
</script>

<div class="mx-auto grid max-w-xl items-start gap-3 sm:grid-cols-2">
	{#each tasks as task (task.id)}
		<CardFace reference={'#' + task.id} title={task.title} status={task.status} tone={task.tone} onSelect={() => show(task)} />
	{/each}
</div>

<CardSheet bind:open reference={'#' + shown.id} title={shown.title} status={shown.status} tone={shown.tone} facts={shown.facts} question={shown.question} onAnswer={answer}>
	{#if refused}<Alert tone="danger" title="Not answered" description={refused} />{/if}
	{#snippet actions(close)}
		{#if shown.status === 'Waiting for your approval'}
			<button type="button" class={buttonClass('primary', 'md')} onclick={() => settle({ status: 'Merging', tone: 'success' })}>Merge</button>
		{/if}
		<button type="button" class={buttonClass('ghost', 'md')} onclick={close}>Done</button>
	{/snippet}
</CardSheet>
