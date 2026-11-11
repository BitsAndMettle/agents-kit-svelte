<script lang="ts">
	import { cn } from '../../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { buttonClass } from '../../ui/styles';
	import { paginationRange } from './pagination-range';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** The current page, 1-based. Bindable. */
		page?: number;
		pageCount: number;
		/** Pages shown on each side of the current page. Default 1. */
		siblings?: number;
		/** Pages always shown at each end. Default 1. */
		boundaries?: number;
		/** Builds the URL of a page; renders links instead of buttons. */
		href?: (page: number) => string;
		onPageChange?: (page: number) => void;
		/**
		 * `auto` shows "Page 3 of 12" below the `sm` breakpoint and numbers above it;
		 * `true` always shows the short form, `false` never does.
		 */
		compact?: boolean | 'auto';
		/** Accessible name of the navigation landmark. */
		label?: string;
		class?: string;
	}

	let {
		page = $bindable(1),
		pageCount,
		siblings = 1,
		boundaries = 1,
		href,
		onPageChange,
		compact = 'auto',
		label = 'Pagination',
		class: className = '',
		...rest
	}: Props = $props();

	let count = $derived(Math.max(0, Math.floor(pageCount)));
	let current = $derived(Math.min(Math.max(1, Math.floor(page)), Math.max(1, count)));
	let tokens = $derived(paginationRange({ page: current, pageCount: count, siblings, boundaries }));

	function go(target: number): void {
		if (target < 1 || target > count || target === current) return;
		page = target;
		onPageChange?.(target);
	}

	/** Records the page for a link click and lets the browser follow the link. */
	function follow(event: MouseEvent, target: number): void {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		go(target);
	}

	const ITEM = 'min-w-8 aria-[current=page]:border aria-[current=page]:border-card-border aria-[current=page]:bg-card-bg aria-[current=page]:text-fg-main aria-[current=page]:shadow-btn';
	const DISABLED = 'cursor-not-allowed opacity-50 hover:bg-transparent';
	let numbersClass = $derived(compact === true ? 'hidden' : compact === 'auto' ? 'hidden sm:block' : 'block');
	let summaryClass = $derived(compact === true ? 'block' : compact === 'auto' ? 'sm:hidden' : 'hidden');
</script>

{#snippet step(target: number, name: string, disabled: boolean, forward: boolean)}
	{@const cls = cn(buttonClass('ghost', 'md'), disabled && DISABLED)}
	{#snippet inner()}
		{#if !forward}<ChevronLeft aria-hidden="true" />{/if}
		<span class="max-sm:sr-only">{name}</span>
		{#if forward}<ChevronRight aria-hidden="true" />{/if}
	{/snippet}
	{#if href && !disabled}
		<a href={href(target)} onclick={(event) => follow(event, target)} class={cls}>{@render inner()}</a>
	{:else if href}
		<span aria-disabled="true" class={cls}>{@render inner()}</span>
	{:else}
		<button type="button" {disabled} onclick={() => go(target)} class={cls}>{@render inner()}</button>
	{/if}
{/snippet}

<nav {...rest} aria-label={label} class={cn('text-sm', className)}>
	<ul class="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0">
		<li>{@render step(current - 1, 'Previous', current <= 1, false)}</li>
		<li class={summaryClass}>
			<span class="px-2 text-[13px] font-medium whitespace-nowrap text-fg-light">Page {current} of {count}</span>
		</li>
		{#each tokens as token (token)}
			<li class={numbersClass}>
				{#if typeof token === 'number'}
					{@const isCurrent = token === current}
					{#if href}
						<a
							href={href(token)}
							aria-label="Page {token}"
							aria-current={isCurrent ? 'page' : undefined}
							onclick={(event) => follow(event, token)}
							class={cn(buttonClass('ghost', 'md'), ITEM)}>{token}</a
						>
					{:else}
						<button
							type="button"
							aria-label="Page {token}"
							aria-current={isCurrent ? 'page' : undefined}
							onclick={() => go(token)}
							class={cn(buttonClass('ghost', 'md'), ITEM)}>{token}</button
						>
					{/if}
				{:else}
					<span aria-hidden="true" class="inline-flex h-8 min-w-8 items-center justify-center text-fg-light">…</span>
				{/if}
			</li>
		{/each}
		<li>{@render step(current + 1, 'Next', current >= count, true)}</li>
	</ul>
</nav>
