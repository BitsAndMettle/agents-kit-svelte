<script lang="ts">
	import { BoardLanes, CardFace, type BoardGroup, type BoardLane } from '$lib/board';
	import { buttonClass, type UiTone } from '$lib/ui/styles';

	interface Task {
		id: number;
		title: string;
		lane: string;
		feature?: string;
		status?: string;
		tone?: UiTone;
	}

	const LANES = ['Ready', 'Running', 'Review', 'Needs you', 'Done'];

	let tasks = $state<Task[]>([
		{ id: 218, title: 'Send the digest every Monday', lane: 'Ready', feature: 'Weekly digest email' },
		{ id: 219, title: 'Add the unsubscribe link', lane: 'Ready', feature: 'Weekly digest email' },
		{ id: 224, title: 'Fix the flaky upload test', lane: 'Ready' },
		{ id: 217, title: 'Render the digest template', lane: 'Running', feature: 'Weekly digest email', status: 'Implementing', tone: 'accent' },
		{ id: 221, title: 'Rotate the signing key', lane: 'Needs you', status: 'Waiting for your approval', tone: 'warning' },
		{ id: 209, title: 'Bump the base image', lane: 'Done', status: 'Merged', tone: 'success' }
	]);

	/** The app sorts its cards into lanes and groups; the board draws what it is given. */
	let lanes = $derived(LANES.map((label): BoardLane<Task> => ({ id: label, label, groups: byFeature(tasks.filter((task) => task.lane === label)) })));

	function byFeature(items: Task[]): BoardGroup<Task>[] {
		const groups = new Map<string, BoardGroup<Task>>();
		for (const item of items) {
			const id = item.feature ?? '';
			const group = groups.get(id) ?? { id, label: item.feature, items: [] };
			groups.set(id, group);
			group.items.push(item);
		}
		return [...groups.values()];
	}

	function approve(id: number): void {
		tasks = tasks.map((task) => (task.id === id ? { ...task, lane: 'Done', status: 'Merged', tone: 'success' } : task));
	}
</script>

<BoardLanes {lanes} headingLevel={4}>
	{#snippet card(task)}
		<CardFace reference={'#' + task.id} title={task.title} status={task.status} tone={task.tone} headingLevel={6}>
			{#snippet actions()}{#if task.lane === 'Needs you'}<button type="button" class={buttonClass('primary', 'xs')} onclick={() => approve(task.id)}>Approve</button>{/if}{/snippet}
		</CardFace>
	{/snippet}
</BoardLanes>
