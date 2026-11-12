<script lang="ts" module>
	import type { AttentionItem } from '../shared/types';

	/** Every word the list shows or announces. */
	export interface AttentionListLabels {
		/** The heading. */
		title: string;
		/** Spoken with the count pill ("3 items"). */
		count: (count: number) => string;
		/** Accessible name of an item's dismiss button. */
		dismiss: (label: string) => string;
		/** Shown (as an alert) when a dismissal rejected; the item stays. A returned `{ error }` is shown instead. */
		dismissFailed: (label: string) => string;
		/** Shown after the last item was dismissed, where focus lands. */
		allClear: string;
		/** Spoken before each item's label, so the tone never rests on colour or icon alone. Empty for none. */
		tone: Record<AttentionItem['tone'], string>;
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { ChevronRight, CircleAlert, Info, OctagonAlert, TriangleAlert, X } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { isThenable } from '../../core/promise';
	import { IconButton } from '../../primitives/actions';
	import { Badge } from '../../primitives/display';
	import { getSettingsScope } from '../shared/context';
	import { nextFocusAfterRemoval } from '../shared/focus';
	import { ReadyGate } from '../shared/ready.svelte';
	import { RECIPES } from '../shared/recipes';
	import type { SettingsIcon } from '../shared/types';
	import { resultMessage } from './shell';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		/** What needs attention. Your app decides; the count is always `items.length`. With none, the list is `hidden`. */
		items: AttentionItem[];
		/** The heading. Default from `labels.title`. */
		title?: string;
		/** Level of the heading. Default 2. */
		headingLevel?: 2 | 3;
		/**
		 * `cards`: boxed cards in a grid. `list`: rows in one card. `auto`: rows in a narrow container,
		 * cards in a wide one. Either way the whole item follows its action.
		 */
		layout?: 'auto' | 'cards' | 'list';
		/**
		 * Dismissing an item marked `dismissible`. Remove it from `items`; focus moves to the next
		 * item, the previous one, or the heading. A returned promise shows loading on the button. A
		 * returned `{ error }` keeps the item and shows that error; a rejection shows
		 * `labels.dismissFailed`. Dismissing needs JavaScript, so the button appears once the page
		 * is ready (the settings scope's `ready()`, or after mount).
		 */
		onDismiss?: (id: string) => unknown;
		/** Words, merged over the English defaults. */
		labels?: Partial<AttentionListLabels>;
		class?: string;
	}

	let { items, title, headingLevel = 2, layout = 'auto', onDismiss, labels, class: className = '', ...rest }: Props = $props();

	const text = $derived<AttentionListLabels>({
		title: 'Needs attention',
		count: (count) => (count === 1 ? '1 item' : `${count} items`),
		dismiss: (label) => `Dismiss: ${label}`,
		dismissFailed: (label) => `Couldn’t dismiss “${label}”. It’s still here.`,
		allClear: 'Nothing needs attention right now.',
		...labels,
		tone: { warning: 'Warning:', danger: 'Problem:', accent: '', neutral: '', ...labels?.tone }
	});

	const id = $props.id();
	const headingTag = $derived(`h${headingLevel}`);
	const pending = new SvelteSet<string>();
	/** Item id to the message its last failed dismissal shows. */
	const failed = new SvelteMap<string, string>();
	const scope = getSettingsScope();
	const gate = new ReadyGate();
	const ready = $derived(scope ? scope.ready() : gate.current);
	/** The last item went away by a dismissal here: keep the card, so focus has somewhere to land. */
	let clearedHere = $state(false);
	let list = $state<HTMLUListElement | null>(null);
	let heading = $state<HTMLElement | null>(null);

	$effect(() => {
		if (items.length) clearedHere = false;
	});

	async function dismiss(item: AttentionItem, index: number): Promise<void> {
		if (!onDismiss || pending.has(item.id)) return;
		failed.delete(item.id);
		let result: unknown;
		try {
			result = onDismiss(item.id);
			if (isThenable(result)) {
				pending.add(item.id);
				result = await result;
			}
		} catch {
			failed.set(item.id, text.dismissFailed(item.label));
			return;
		} finally {
			pending.delete(item.id);
		}
		const message = resultMessage(result);
		if (message) {
			failed.set(item.id, message);
			return;
		}
		await tick();
		if (items.some((i) => i.id === item.id)) return;
		if (!items.length) clearedHere = true;
		await tick();
		const active = document.activeElement;
		if (active && active !== document.body && active.isConnected) return;
		const target = list ? nextFocusAfterRemoval(list, index, heading) : heading;
		(target ?? heading)?.focus();
	}

	const TONE_TILE: Record<AttentionItem['tone'], string> = {
		warning: 'bg-status-warning-subtle text-status-warning',
		danger: 'bg-status-danger-subtle text-status-danger',
		accent: 'bg-accent-subtle text-accent-primary',
		neutral: 'bg-canvas-secondary text-fg-main'
	};
	const TONE_ICON: Record<AttentionItem['tone'], SettingsIcon> = { warning: TriangleAlert, danger: OctagonAlert, accent: CircleAlert, neutral: Info };

	// Written out per layout so Tailwind finds every class; `auto` is the list look switched to cards at the wide breakpoint.
	const LIST = {
		list: 'overflow-hidden rounded-card border border-card-border bg-card-bg divide-y divide-canvas-border',
		cards: 'grid gap-3 @lg/settings:grid-cols-2',
		auto: 'overflow-hidden rounded-card border border-card-border bg-card-bg divide-y divide-canvas-border @3xl/settings:grid @3xl/settings:grid-cols-2 @3xl/settings:gap-3 @3xl/settings:overflow-visible @3xl/settings:rounded-none @3xl/settings:border-0 @3xl/settings:bg-transparent @3xl/settings:divide-y-0'
	} as const;
	const ITEM = {
		list: 'flex-row flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 @lg/settings:flex-nowrap',
		cards: 'flex-col gap-3 rounded-card border border-card-border bg-card-bg p-4',
		auto: 'flex-row flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 @lg/settings:flex-nowrap @3xl/settings:flex-col @3xl/settings:items-stretch @3xl/settings:rounded-card @3xl/settings:border @3xl/settings:border-card-border @3xl/settings:bg-card-bg @3xl/settings:p-4'
	} as const;
	const CONTROLS = {
		list: 'ms-auto shrink-0 gap-1',
		cards: 'justify-between gap-2',
		auto: 'ms-auto shrink-0 gap-1 @3xl/settings:ms-0 @3xl/settings:justify-between @3xl/settings:gap-2'
	} as const;
	const ACTION = {
		list: 'text-fg-light',
		cards: 'h-7 rounded-control border border-card-border bg-card-bg px-2.5 text-fg-main shadow-xs',
		auto: 'text-fg-light @3xl/settings:h-7 @3xl/settings:rounded-control @3xl/settings:border @3xl/settings:border-card-border @3xl/settings:bg-card-bg @3xl/settings:px-2.5 @3xl/settings:text-fg-main @3xl/settings:shadow-xs'
	} as const;
	/** The action stretches over its whole item (a ::after overlay), so the item is one big target without nesting controls. */
	const ACTION_BASE =
		'inline-flex items-center gap-1 text-xs font-medium no-underline transition-colors outline-none after:absolute after:inset-0 hover:text-fg-main focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent-primary';
	const CHEVRON = { list: '', cards: 'hidden', auto: '@3xl/settings:hidden' } as const;
</script>

<section {...rest} hidden={items.length === 0 && !clearedHere ? true : undefined} aria-labelledby="{id}-title" class={cn('@container/settings flex min-w-0 flex-col gap-2.5', className)}>
	<div class="flex items-center gap-2 px-1">
		<svelte:element this={headingTag} bind:this={heading} id="{id}-title" tabindex="-1" class="m-0 text-sm font-semibold text-fg-main outline-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary">{title ?? text.title}</svelte:element>
		{#if items.length}
			<Badge tone="neutral" size="sm" aria-hidden="true" data-attention-count>{items.length}</Badge>
			<span class="sr-only">({text.count(items.length)})</span>
		{/if}
	</div>
	{#if items.length}
		<ul bind:this={list} role="list" class={cn('m-0 list-none p-0', LIST[layout])}>
			{#each items as item, index (item.id)}
				{@const Icon = item.icon ?? TONE_ICON[item.tone]}
				{@const busy = pending.has(item.id)}
				{@const described = item.description ? `${id}-${item.id}-label ${id}-${item.id}-description` : `${id}-${item.id}-label`}
				<li data-attention-item={item.id} aria-busy={busy || undefined} class={cn('relative flex min-w-0 transition-colors has-[[data-attention-action]:hover]:bg-canvas-secondary', ITEM[layout])}>
					<div class="flex min-w-[min(100%,12rem)] flex-1 items-start gap-3">
						<span aria-hidden="true" class={cn(RECIPES.iconTile, TONE_TILE[item.tone])}><Icon /></span>
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<p id="{id}-{item.id}-label" class="m-0 text-[13px] font-medium break-words text-fg-main">
								{#if text.tone[item.tone]}<span class="sr-only">{text.tone[item.tone]} </span>{/if}{item.label}
							</p>
							{#if item.description}<p id="{id}-{item.id}-description" class="m-0 text-xs leading-5 text-fg-light">{item.description}</p>{/if}
							{#if failed.has(item.id)}<p role="alert" data-attention-error class="m-0 text-xs font-medium text-fg-main">{failed.get(item.id)}</p>{/if}
						</div>
					</div>
					<div class={cn('flex items-center', CONTROLS[layout])}>
						{#if item.action.href !== undefined}
							<a href={item.action.href} data-attention-action aria-describedby={described} onclick={() => item.action.onSelect?.()} class={cn(ACTION_BASE, ACTION[layout])}>
								{item.action.label}<ChevronRight aria-hidden="true" class={cn('size-3.5 rtl:-scale-x-100', CHEVRON[layout])} />
							</a>
						{:else}
							<button type="button" data-attention-action aria-describedby={described} onclick={() => item.action.onSelect?.()} class={cn(ACTION_BASE, ACTION[layout])}>
								{item.action.label}<ChevronRight aria-hidden="true" class={cn('size-3.5 rtl:-scale-x-100', CHEVRON[layout])} />
							</button>
						{/if}
						{#if item.dismissible && onDismiss && ready}
							<IconButton size="icon-sm" aria-label={text.dismiss(item.label)} loading={busy} onclick={() => dismiss(item, index)} class="relative z-[2]">
								<X aria-hidden="true" />
							</IconButton>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="m-0 rounded-card border border-dashed border-card-border px-4 py-3 text-[13px] text-fg-light">{text.allClear}</p>
	{/if}
</section>
