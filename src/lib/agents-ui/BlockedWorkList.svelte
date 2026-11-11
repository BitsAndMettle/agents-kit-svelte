<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { tick } from 'svelte';
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

	let root = $state<HTMLElement>();

	/** Items the person just acted on; busy until the caller reports busy and then done, or the item changes. */
	let pressed = $state<Record<string, { key: string; seenBusy: boolean }>>({});
	$effect(() => {
		for (const [id, entry] of Object.entries(pressed)) {
			const current = items.find((i) => i.id === id);
			if (!current || JSON.stringify(current) !== entry.key) {
				delete pressed[id];
			} else if (isBlockedItemBusy(current, busyIds)) {
				if (!entry.seenBusy) entry.seenBusy = true;
			} else if (entry.seenBusy) {
				delete pressed[id];
			}
		}
	});

	/** Fallback: if the caller refuses without changing anything, release the lock after 4 seconds. */
	$effect(() => {
		const ids = Object.keys(pressed);
		if (ids.length === 0) return;
		const timer = setTimeout(() => {
			for (const id of ids) delete pressed[id];
		}, 4000);
		return () => clearTimeout(timer);
	});

	function find(selector: string): HTMLElement | null {
		return root?.querySelector<HTMLElement>(selector) ?? null;
	}

	async function focusLater(selector: string): Promise<void> {
		await tick();
		find(selector)?.focus();
	}

	function needsConfirm(action: BlockedAction): boolean {
		return action.confirm !== undefined;
	}

	function confirmText(action: BlockedAction): string {
		return action.confirm?.trim() ? action.confirm : `Are you sure you want to ${action.label.toLowerCase()}?`;
	}

	function fire(item: BlockedItem, action: BlockedAction): void {
		pressed[item.id] = { key: JSON.stringify(item), seenBusy: false };
		onAction?.(item, action);
	}

	function choose(item: BlockedItem, action: BlockedAction): void {
		if (pressed[item.id]) return;
		if (needsConfirm(action)) {
			confirming = { itemId: item.id, actionId: action.id };
			void focusLater(`[data-confirm="${CSS.escape(item.id)}"]`);
			return;
		}
		fire(item, action);
	}

	function cancel(item: BlockedItem, action: BlockedAction): void {
		confirming = null;
		void focusLater(`[data-action="${CSS.escape(item.id + '/' + action.id)}"]`);
	}

	function confirm(item: BlockedItem, action: BlockedAction): void {
		confirming = null;
		fire(item, action);
		void focusLater(`[data-row="${CSS.escape(item.id)}"]`);
	}
</script>

<section {...rest} bind:this={root} aria-label="Blocked work" class={cn('rounded-card border border-card-border bg-card-bg ak-shadow-btn', className)}>
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
						{@const busy = isBlockedItemBusy(item, busyIds) || !!pressed[item.id]}
						{@const pending = confirming?.itemId === item.id ? (item.actions.find((a) => a.id === confirming?.actionId) ?? null) : null}
						<li data-row={item.id} tabindex="-1" class="px-4 py-3 outline-none" aria-busy={busy}>
							<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
								<div class="min-w-0 flex-1 basis-48">
									<p class="text-[14px] leading-snug font-medium text-fg-main">
										{#if item.ref}<span class="mr-1.5 font-mono text-[12px] font-normal text-fg-light">{item.ref}</span>{/if}{item.title}
									</p>
									<p class="mt-0.5 text-[12px] leading-5 text-fg-light">
										<span class="font-medium text-status-warning">{item.reason.label}</span>{#if item.reason.since}<span>&nbsp;· {item.reason.since}</span>{/if}
									</p>
									{#if item.reason.detail}<p class="text-[12px] leading-5 text-fg-light">{item.reason.detail}</p>{/if}
								</div>
								{#if item.actions.length === 0}
									<p class="text-[12px] text-fg-light">{item.note ?? 'Nothing to do here'}</p>
								{:else if !pending}
									<div class="flex flex-wrap gap-2">
										{#each item.actions as action (action.id)}
											<button type="button" data-action="{item.id}/{action.id}" disabled={busy} class={buttonClass(action.tone === 'danger' ? 'danger' : 'secondary', 'md')} onclick={() => choose(item, action)}>
												{#if busy}<LoaderCircle class="animate-spin motion-reduce:animate-none" aria-hidden="true" /><span class="sr-only">Working: </span>{/if}{action.label}
											</button>
										{/each}
									</div>
								{/if}
							</div>
							{#if pending}
								<div role="group" aria-label="Confirm {pending.label}" class="mt-2 rounded-control bg-canvas-secondary px-3 py-2.5">
									<p class="text-[13px] leading-5 text-fg-main">{confirmText(pending)}</p>
									<div class="mt-2 flex flex-wrap gap-2">
										<button type="button" data-confirm={item.id} disabled={busy} class={buttonClass(pending.tone === 'danger' ? 'danger' : 'primary', 'md')} onclick={() => confirm(item, pending)}>Confirm {pending.label}</button>
										<button type="button" class={buttonClass('ghost', 'md')} onclick={() => cancel(item, pending)}>Cancel</button>
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
