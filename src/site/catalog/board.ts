import type { CatalogItemMeta } from '../catalog-registry.ts';

const UPSTREAM = 'Agents Kit Svelte · Board';

/** Catalogue entries for the Board collection: StatusStrip, BoardLanes, CardFace, CardSheet. Category: 'Board'. */
export const BOARD: CatalogItemMeta[] = [
	{
		slug: 'status-strip',
		name: 'StatusStrip',
		category: 'Board',
		sveltePath: 'src/lib/board/StatusStrip.svelte',
		upstreamSource: UPSTREAM,
		description:
			'The one line above a board: what is going on right now (with a tone), the numbers that matter and your actions. One line where it fits; in a narrow container the numbers wrap under the status.',
		usageSnippet: `<script lang="ts">
  import { StatusStrip, type StatusStat } from 'agents-kit-svelte/board';
  import { Button } from 'agents-kit-svelte/primitives';

  let paused = $state(false);

  const stats: StatusStat[] = [
    { id: 'runs', label: 'Runs', value: 7.4, unit: '/h' },
    { id: 'ttm', label: 'Ready to merged', value: 2280, format: 'duration' },
    { id: 'slots', label: 'Slots', value: 4, max: 6 }
  ];
</script>

<StatusStrip status={paused ? 'Paused' : 'Running'} tone={paused ? 'warning' : 'success'} {stats}>
  {#snippet actions()}
    <Button size="sm" onclick={() => (paused = !paused)}>{paused ? 'Resume' : 'Pause'}</Button>
  {/snippet}
</StatusStrip>`
	},
	{
		slug: 'board-lanes',
		name: 'BoardLanes',
		category: 'Board',
		sveltePath: 'src/lib/board/BoardLanes.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A board whose lanes are data and whose cards are your snippet. Each lane shows its label and count, with its cards under group headings. As many lanes sit side by side as fit; the rest wrap, down to one column on a phone.',
		usageSnippet: `<script lang="ts">
  import { BoardLanes, CardFace, type BoardLane } from 'agents-kit-svelte/board';

  interface Task {
    id: number;
    title: string;
    status?: string;
  }

  // Your app sorts its cards into lanes and groups; the board draws what it is given.
  const lanes: BoardLane<Task>[] = [
    {
      id: 'ready',
      label: 'Ready',
      groups: [
        { id: 'digest', label: 'Weekly digest email', items: [{ id: 218, title: 'Send the digest every Monday' }] },
        { id: 'loose', items: [{ id: 224, title: 'Fix the flaky upload test' }] }
      ]
    },
    {
      id: 'running',
      label: 'Running',
      groups: [{ id: 'digest', label: 'Weekly digest email', items: [{ id: 217, title: 'Render the digest template', status: 'Implementing' }] }]
    },
    { id: 'done', label: 'Done', groups: [] }
  ];
</script>

<BoardLanes {lanes}>
  {#snippet card(task)}
    <CardFace reference="#{task.id}" title={task.title} status={task.status} tone="accent" href="/cards/{task.id}" />
  {/snippet}
</BoardLanes>`
	},
	{
		slug: 'card-face',
		name: 'CardFace',
		category: 'Board',
		sveltePath: 'src/lib/board/CardFace.svelte',
		upstreamSource: UPSTREAM,
		description:
			'A card in a lane: a reference, the title, one status line with a tone, your badges and your actions. With href or onSelect the whole card opens through its title, the single tab stop, and the actions stay separately clickable.',
		usageSnippet: `<script lang="ts">
  import { CardFace } from 'agents-kit-svelte/board';
  import { Badge, Button } from 'agents-kit-svelte/primitives';
</script>

<CardFace reference="#221" title="Rotate the signing key" status="Waiting for your approval" tone="warning" href="/cards/221">
  <Badge>T3</Badge>
  <Badge tone="success" dot>Checks passed</Badge>
  {#snippet actions()}
    <Button size="sm" variant="primary" onclick={() => console.log('merge 221')}>Merge</Button>
  {/snippet}
</CardFace>`
	},
	{
		slug: 'card-sheet',
		name: 'CardSheet',
		category: 'Board',
		sveltePath: 'src/lib/board/CardSheet.svelte',
		upstreamSource: UPSTREAM,
		description:
			'One card in full, in a Sheet: the title names it, with its reference and status under it, then what is known about it as a list of labelled values, a question with one button per option, your own content, and your actions at the foot. The question waits for the promise your onAnswer returns and takes no other answer meanwhile.',
		usageSnippet: `<script lang="ts">
  import { CardFace, CardSheet, type CardFact, type CardQuestion } from 'agents-kit-svelte/board';
  import { Button } from 'agents-kit-svelte/primitives';

  let open = $state(false);

  const facts: CardFact[] = [
    { label: 'Pull request', value: '#57', href: 'https://example.com/pull/57' },
    { label: 'Checks', value: 'Passed', tone: 'success' }
  ];
  let question = $state<CardQuestion | undefined>({ text: 'Which key should this card rotate?', options: ['The signing key', 'Both'] });

  // Return the promise that stores the answer; the question is busy until it settles.
  async function answer(option: string) {
    console.log('answer 221:', option);
    question = undefined;
  }
</script>

<CardFace reference="#221" title="Rotate the signing key" status="Needs your answer" tone="warning" onSelect={() => (open = true)} />

<CardSheet bind:open reference="#221" title="Rotate the signing key" status="Needs your answer" tone="warning" {facts} {question} onAnswer={answer}>
  {#snippet actions(close)}
    <Button variant="ghost" onclick={close}>Done</Button>
  {/snippet}
</CardSheet>`
	}
];
