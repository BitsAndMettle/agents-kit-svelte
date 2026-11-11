<script lang="ts">
	import { cn } from '../../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { buttonClass } from '../../ui/styles';
	import { paginationRange } from './pagination-range';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** The current page, 1-based. Bindable. */
		value?: number;
		defaultValue?: number;
		onValueChange?: (page: number) => void;
		pageCount: number;
		/** Pages shown on each side of the current page. Default 1. */
		siblings?: number;
		/** Pages always shown at each end. Default 1. */
		boundaries?: number;
		/** Builds the URL of a page; renders links instead of buttons. */
		href?: (page: number) => string;
		/**
		 * `auto` shows the short form ("Page 3 of 12") below the `sm` breakpoint and numbers above it;
		 * `true` always shows the short form, `false` never does.
		 */
		compact?: boolean | 'auto';
		/** Render the bar even when there is only one page. Nothing renders for fewer than two otherwise. */
		showSinglePage?: boolean;
		previousLabel?: string;
		nextLabel?: string;
		/** Accessible name of one page button or link. */
		pageLabel?: (page: number) => string;
		/** The short form shown on narrow screens. */
		summaryLabel?: (page: number, pageCount: number) => string;
		/** The nav element. The landmark's name is `aria-label`. */
		ref?: HTMLElement;
		class?: string;
	}

	let {
		value = $bindable(),
		defaultValue = 1,
		onValueChange,
		pageCount,
		siblings = 1,
		boundaries = 1,
		href,
		compact = 'auto',
		showSinglePage = false,
		previousLabel = 'Previous',
		nextLabel = 'Next',
		pageLabel = (n) => `Page ${n}`,
		summaryLabel = (n, total) => `Page ${n} of ${total}`,
		ref = $bindable(),
		'aria-label': ariaLabel = 'Pagination',
		class: className = '',
		...rest
	}: Props = $props();

	export type PaginationProps = Props;

	let count = $derived(Math.max(0, Math.floor(pageCount)));
	let current = $derived(Math.min(Math.max(1, Math.floor(value ?? defaultValue)), Math.max(1, count)));
	let tokens = $derived(paginationRange({ page: current, pageCount: count, siblings, boundaries }));
	let visible = $derived(count >= 2 || (showSinglePage && count === 1));

	function go(target: number): void {
		if (target < 1 || target > count || target === current) return;
		value = target;
		onValueChange?.(target);
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

{#if visible}
	<nav {...rest} bind:this={ref} aria-label={ariaLabel} class={cn('text-sm', className)}>
		<ul class="m-0 flex list-none flex-wrap items-center justify-center gap-1 p-0">
			<li>{@render step(current - 1, previousLabel, current <= 1, false)}</li>
			<li class={summaryClass}>
				<span class="px-2 text-[13px] font-medium whitespace-nowrap text-fg-light">{summaryLabel(current, count)}</span>
			</li>
			{#each tokens as token (token)}
				{#if typeof token === 'number'}
					<li class={numbersClass}>
						{#if href}
							<a
								href={href(token)}
								aria-label={pageLabel(token)}
								aria-current={token === current ? 'page' : undefined}
								onclick={(event) => follow(event, token)}
								class={cn(buttonClass('ghost', 'md'), ITEM)}>{token}</a
							>
						{:else}
							<button
								type="button"
								aria-label={pageLabel(token)}
								aria-current={token === current ? 'page' : undefined}
								onclick={() => go(token)}
								class={cn(buttonClass('ghost', 'md'), ITEM)}>{token}</button
							>
						{/if}
					</li>
				{:else}
					<li aria-hidden="true" class={numbersClass}>
						<span class="inline-flex h-8 min-w-8 items-center justify-center text-fg-light">…</span>
					</li>
				{/if}
			{/each}
			<li>{@render step(current + 1, nextLabel, current >= count, true)}</li>
		</ul>
	</nav>
{/if}
