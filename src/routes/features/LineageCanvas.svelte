<script lang="ts">
	import FeatureLineage from '$lib/charts/FeatureLineage.svelte';
	import CardFace from '$lib/board/CardFace.svelte';
	import Avatar from '$lib/primitives/display/Avatar.svelte';
	import type { LineageEdge, LineageNode } from '$lib/charts/types';
	import type { UiTone } from '$lib/ui/styles';
	import { Check, Circle } from '@lucide/svelte';

	/** A Feature's cards, each with what it needs. #71 is in flight, worked by the red team; #75 asks you a question. */
	type Card = { n: number; title: string; needs: number[]; status: string; tone: UiTone; merged?: boolean; worker?: string; asks?: boolean };
	const CARDS: Card[] = [
		{ n: 69, title: 'Prove a write path to the theme store', needs: [], status: 'Merged', tone: 'success', merged: true },
		{ n: 70, title: 'Read the tokens from the theme store', needs: [69], status: 'Merged', tone: 'success', merged: true },
		{ n: 73, title: 'Preview the theme beside the editor', needs: [69], status: 'Can start', tone: 'neutral' },
		{ n: 71, title: 'Keep the edited tokens in the URL hash', needs: [70], status: 'Red team, round 1', tone: 'accent', worker: 'Red team' },
		{ n: 75, title: 'Export the theme as CSS variables', needs: [70], status: 'Asks you a question', tone: 'warning', asks: true },
		{ n: 72, title: 'Controls for each token', needs: [71], status: 'Waits for #71', tone: 'neutral' },
		{ n: 76, title: 'Import a theme from a file', needs: [72, 75], status: 'Waits for #72, #75', tone: 'neutral' },
		{ n: 78, title: 'Put the page together', needs: [73, 76], status: 'Waits for #73, #76', tone: 'neutral' },
		{ n: 79, title: 'Document the theme studio', needs: [78], status: 'Waits for #78', tone: 'neutral' }
	];
	const LIVE = ['69→70', '70→71'];
	const LONGEST = ['71→72', '72→76', '76→78', '78→79'];
	const byN = new Map(CARDS.map((c) => [c.n, c]));

	const nodes: LineageNode[] = CARDS.map((c) => ({ id: String(c.n), kind: 'card', label: c.title, status: c.merged ? 'merged' : c.worker ? 'running' : 'planned', data: c }));
	const edges: LineageEdge[] = CARDS.flatMap((c) =>
		c.needs.map((n): LineageEdge => {
			const key = `${n}→${c.n}`;
			return { from: String(n), to: String(c.n), met: byN.get(n)?.merged ?? false, route: LIVE.includes(key) ? 'live' : c.asks ? 'stopped' : LONGEST.includes(key) ? 'longest' : undefined };
		})
	);

	let open = $state<Card | null>(null);
</script>

{#snippet face(node: LineageNode, upright: boolean)}
	{@const c = node.data as Card}
	<CardFace class="h-full" density="compact" reference="#{c.n}" title={c.title} status={upright ? '' : c.status} tone={c.tone} onSelect={() => (open = c)}>
		{#snippet mark()}
			<span aria-hidden="true" class="contents">
				{#if c.worker}
					<Avatar name={c.worker} decorative size="xs" class="size-4 text-[8px] ak-breathe" />
				{:else if c.merged}
					<Check class="size-3.5 text-status-success" />
				{:else}
					<Circle class={c.asks ? 'size-2.5 fill-current text-status-warning' : 'size-2.5 text-fg-light'} />
				{/if}
			</span>
		{/snippet}
	</CardFace>
{/snippet}

{#snippet legend()}
	<p class="text-[11px] text-fg-light">Live: the route to the card in flight · dashed: a need not met yet · heavier: the longest route left</p>
{/snippet}

<section aria-label="Cards of Theme Studio" class="space-y-2">
	<FeatureLineage
		title="Theme Studio · cards"
		{nodes}
		{edges}
		node={face}
		{legend}
		levels={['First', 'Then together', 'Then together', 'Then', 'Then', 'Then', 'Last']}
		selected={open ? String(open.n) : null}
	/>
	{#if open}
		<p class="rounded-card bg-canvas-secondary px-4 py-2.5 text-[13px] text-fg-main">#{open.n} would open here, in its sheet. Its route stays lit.</p>
	{/if}
</section>
