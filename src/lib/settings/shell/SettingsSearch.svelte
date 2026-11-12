<script lang="ts" module>
	/** Every word the search shows or announces. */
	export interface SettingsSearchLabels {
		/** Accessible name of the search box and the search landmark. */
		label: string;
		placeholder: string;
		/** Result count, shown on the page variant and announced politely. */
		results: (count: number) => string;
		/** Shown and announced when nothing matches. */
		none: (query: string) => string;
		/** A quieter line under the "nothing matches" message. */
		noneHint: string;
		/** Where a result lives ("in Data"). */
		inSection: (section: string) => string;
		/** The clear button in the box. */
		clear: string;
	}
</script>

<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { Search } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { ListNav } from '../../headless/runtime/list-nav.svelte';
	import { Kbd } from '../../primitives/display';
	import { Input } from '../../primitives/form';
	import { highlightSegments, searchSettings, type TextRange } from '../shared/search';
	import type { SettingsSearchEntry } from '../shared/types';
	import { insideSettingsLayout } from './layout-context';
	import { matchesShortcut, parseShortcut } from './shell';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'method'> {
		/** One entry per searchable setting; `href` deep-links to the row (its SettingsSection or row `id`). */
		entries: SettingsSearchEntry[];
		/** The query. Bindable. Set it on the server from `?q=` so results render without JavaScript. */
		value?: string;
		/** Starting query when `value` is not bound. */
		defaultValue?: string;
		/** Query parameter. Default `q`. */
		name?: string;
		/** Where Enter goes (a results page). Without it, results show in place and Enter stays put. */
		action?: string;
		/** Most results shown. Default 6 inline, 20 on the page variant. */
		limit?: number;
		/** `inline`: a box with results under it (top of a rail or index). `page`: a results page. */
		variant?: 'inline' | 'page';
		/** Called as the query changes. */
		onValueChange?: (query: string) => void;
		/** Called when a result is followed (click or Enter). The link still navigates unless you call `event.preventDefault()`. */
		onSelect?: (entry: SettingsSearchEntry, event: MouseEvent | KeyboardEvent) => void;
		/** A key that focuses the box from anywhere on the page, e.g. `/` or `mod+k`. Default none. */
		shortcut?: string | false;
		/** The search `<input>`. Bindable. */
		ref?: HTMLInputElement | null;
		/** Words, merged over the English defaults. */
		labels?: Partial<SettingsSearchLabels>;
		class?: string;
	}

	let {
		entries,
		defaultValue,
		value = $bindable(defaultValue ?? ''),
		name = 'q',
		action,
		limit,
		variant = 'inline',
		onValueChange,
		onSelect,
		shortcut = false,
		ref = $bindable(null),
		labels,
		onsubmit,
		'aria-label': ariaLabel,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SettingsSearchLabels>({
		label: 'Search settings',
		placeholder: 'Search settings',
		results: (count) => (count === 1 ? '1 result' : `${count} results`),
		none: (query) => `No settings match “${query}”.`,
		noneHint: 'Try a shorter word, or a word from the setting’s description.',
		inSection: (section) => `in ${section}`,
		clear: 'Clear search',
		...labels
	});

	const id = $props.id();
	const ownContainer = !insideSettingsLayout();
	const query = $derived((value ?? '').trim());
	const results = $derived(query ? searchSettings(entries, query, limit ?? (variant === 'page' ? 20 : 6)) : []);
	const keys = $derived(parseShortcut(shortcut));

	const nav = new ListNav({
		id,
		focus: 'roving',
		loop: false,
		typeahead: false,
		onActivate: (entryId, event) => {
			const hit = results.find((r) => r.entry.id === entryId);
			if (hit) onSelect?.(hit.entry, event);
		}
	});

	let mac = $state(false);
	$effect(() => {
		const platform = navigator as Navigator & { userAgentData?: { platform?: string } };
		mac = /mac|iphone|ipad/i.test(platform.userAgentData?.platform ?? platform.platform ?? '');
	});

	function editable(target: EventTarget | null): boolean {
		return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (!keys || event.defaultPrevented || !ref) return;
		const bare = !keys.mod && !keys.ctrl && !keys.alt;
		if (bare && editable(event.target)) return;
		if (!matchesShortcut(keys, event, mac)) return;
		event.preventDefault();
		ref.focus();
		ref.select();
	}

	function onInputKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowDown' && results.length) {
			event.preventDefault();
			nav.highlight('first', { focus: true, scroll: true });
		}
	}

	function onResultKeydown(event: KeyboardEvent, index: number): void {
		if (event.key === 'Escape' || (event.key === 'ArrowUp' && index === 0)) {
			event.preventDefault();
			ref?.focus();
		}
	}

	function submit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }): void {
		onsubmit?.(event);
		// Results are already on the page; only a results page (`action`) is worth a round trip.
		if (!action) event.preventDefault();
	}

	const page = $derived(variant === 'page');
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet marked(source: string, ranges: TextRange[])}
	{#each highlightSegments(source, ranges) as piece, n (n)}{#if piece.match}<mark class="rounded-[3px] bg-accent-subtle px-px text-fg-main ring-1 ring-accent-primary/25">{piece.text}</mark>{:else}{piece.text}{/if}{/each}
{/snippet}

<form {...rest} method="get" {action} role="search" aria-label={ariaLabel ?? text.label} data-variant={variant} onsubmit={submit} class={cn('flex min-w-0 flex-col', page ? 'gap-4' : 'gap-2', ownContainer && '@container/settings', className)}>
	<Input
		type="search"
		{name}
		bind:value
		bind:ref
		defaultValue={defaultValue ?? value ?? ''}
		size={page ? 'lg' : 'md'}
		aria-label={text.label}
		placeholder={text.placeholder}
		autocomplete="off"
		spellcheck={false}
		enterkeyhint="search"
		clearable
		clearLabel={text.clear}
		onkeydown={onInputKeydown}
		onValueChange={(next) => onValueChange?.(next)}
	>
		{#snippet leading()}<Search aria-hidden="true" />{/snippet}
		{#snippet trailing()}{#if keys && !value}<Kbd keys={keys.keys} platform="auto" aria-hidden="true" />{/if}{/snippet}
	</Input>
	<p role="status" class="sr-only">{query ? (results.length ? text.results(results.length) : text.none(query)) : ''}</p>
	{#if query}
		{#if results.length}
			{#if page}<p class="m-0 text-[13px] font-medium text-fg-light">{text.results(results.length)}</p>{/if}
			<ul {...nav.root} role="list" class={cn('m-0 flex list-none flex-col p-0', page ? 'overflow-hidden rounded-card border border-card-border bg-card-bg divide-y divide-canvas-border' : 'gap-0.5 rounded-card border border-card-border bg-card-bg p-1 shadow-sm')}>
				{#each results as hit, index (hit.entry.id)}
					{@const Icon = hit.entry.icon}
					<li class="min-w-0">
						<a
							{...nav.item({ value: hit.entry.id, textValue: hit.entry.label })}
							href={hit.entry.href}
							data-search-result={hit.entry.id}
							onkeydown={(event) => onResultKeydown(event, index)}
							class={cn(
								'flex min-w-0 items-start gap-3 text-fg-main no-underline outline-none transition-colors hover:bg-canvas-secondary focus-visible:bg-canvas-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-primary',
								page ? 'px-4 py-3' : 'rounded-control px-2.5 py-2'
							)}
						>
							{#if Icon && page}<span aria-hidden="true" class="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-canvas-secondary text-fg-main [&_svg]:size-4"><Icon /></span>{/if}
							<span class="flex min-w-0 flex-1 flex-col gap-0.5">
								<span class="flex min-w-0 flex-wrap items-baseline gap-x-2">
									<span class={cn('font-medium break-words', page ? 'text-sm' : 'text-[13px]')}>{@render marked(hit.entry.label, hit.ranges)}</span>
									<span class="text-xs text-fg-light">{text.inSection(hit.entry.section)}</span>
								</span>
								{#if hit.entry.description && (page || hit.descriptionRanges.length)}
									<span class={cn('text-xs leading-5 text-fg-light', !page && 'line-clamp-1')}>{@render marked(hit.entry.description, hit.descriptionRanges)}</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<div class={cn('flex flex-col gap-1 rounded-card border border-dashed border-card-border text-[13px]', page ? 'px-5 py-8 text-center' : 'px-3 py-3')}>
				<p class="m-0 font-medium text-fg-main">{text.none(query)}</p>
				<p class="m-0 text-xs leading-5 text-fg-light">{text.noneHint}</p>
			</div>
		{/if}
	{/if}
</form>
