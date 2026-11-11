<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { CircleCheck, LoaderCircle } from '@lucide/svelte';
	import { buttonClass } from '../ui/styles';
	import { groupBlockedWork, isBlockedItemBusy } from './blocked-work';
	import type { BlockedAction, BlockedItem } from './blocked-work';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		items: BlockedItem[];
		/** Ids with a call in flight, as an alternative to `busy` on each item. */
		busyIds?: Iterable<string>;
		/** Group order by reason kind; other kinds follow in the order they appear. */
		kindOrder?: string[];
		/** Group headings by reason kind. Defaults to the kind with a capital letter. */
		kindLabels?: Record<string, string>;
		/** Text for an empty list. */
		emptyLabel?: string;
		/** Called when the person picks an action, after any confirmation. */
		onAction?: (item: BlockedItem, action: BlockedAction) => void;
		class?: string;
	}

	let { items, busyIds, kindOrder = [], kindLabels = {}, emptyLabel = 'Nothing is stuck', onAction, class: className = '', ...rest }: Props = $props();

	let groups = $derived(groupBlockedWork(items, kindOrder, kindLabels));
	let confirming = $state<{ itemId: string; actionId: string } | null>(null);

	function choose(item: BlockedItem, action: BlockedAction): void {
		if (action.confirm) {
			confirming = { itemId: item.id, actionId: action.id };
			return;
		}
		onAction?.(item, action);
	}

	function confirm(item: BlockedItem, action: BlockedAction): void {
		confirming = null;
		onAction?.(item, action);
	}
</script>

<section {...rest} aria-label="Blocked work" class={cn('rounded-card border border-card-border bg-card-bg ak-shadow-btn', className)}>
	{#if groups.length === 0}
		<p class="flex items-center gap-2 px-4 py-5 text-[13px] text-fg-light"><CircleCheck class="size-4 text-status-success" aria-hidden="true" />{emptyLabel}</p>
	{:else}
		{#each groups as group (group.kind)}
			<div class="border-b border-card-border last:border-b-0">
				<h3 class="flex items-center gap-2 px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-fg-light uppercase">
					{group.label}
					<span class="rounded-full bg-canvas-secondary px-1.5 py-0.5 font-mono text-[11px] font-medium normal-case">{group.items.length}<span class="sr-only"> {group.items.length === 1 ? 'item' : 'items'}</span></span>
				</h3>
				<ul>
					{#each group.items as item (item.id)}
						{@const busy = isBlockedItemBusy(item, busyIds)}
						{@const pending = confirming?.itemId === item.id ? (item.actions.find((a) => a.id === confirming?.actionId) ?? null) : null}
						<li class="px-4 py-3" aria-busy={busy}>
							<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
								<div class="min-w-0 flex-1 basis-48">
									<p class="text-[14px] leading-snug font-medium text-fg-main">
										{#if item.ref}<span class="mr-1.5 font-mono text-[12px] font-normal text-fg-light">{item.ref}</span>{/if}{item.title}
									</p>
									<p class="mt-0.5 text-[12px] leading-5 text-fg-light">
										<span class="font-medium text-status-warning">{item.reason.label}</span>{#if item.reason.since}<span> · {item.reason.since}</span>{/if}
									</p>
									{#if item.reason.detail}<p class="text-[12px] leading-5 text-fg-light">{item.reason.detail}</p>{/if}
								</div>
								{#if item.actions.length === 0}
									<p class="text-[12px] text-fg-light">{item.note ?? 'Nothing to do here'}</p>
								{:else if !pending}
									<div class="flex flex-wrap gap-2">
										{#each item.actions as action (action.id)}
											<button type="button" disabled={busy} class={buttonClass(action.tone === 'danger' ? 'danger' : 'secondary', 'md')} onclick={() => choose(item, action)}>
												{#if busy}<LoaderCircle class="animate-spin motion-reduce:animate-none" aria-hidden="true" /><span class="sr-only">Working: </span>{/if}{action.label}
											</button>
										{/each}
									</div>
								{/if}
							</div>
							{#if pending}
								<div role="group" aria-label="Confirm {pending.label}" class="mt-2 rounded-control bg-canvas-secondary px-3 py-2.5">
									<p class="text-[13px] leading-5 text-fg-main">{pending.confirm}</p>
									<div class="mt-2 flex flex-wrap gap-2">
										<button type="button" disabled={busy} class={buttonClass(pending.tone === 'danger' ? 'danger' : 'primary', 'md')} onclick={() => confirm(item, pending)}>Confirm {pending.label}</button>
										<button type="button" class={buttonClass('ghost', 'md')} onclick={() => (confirming = null)}>Cancel</button>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</section>
