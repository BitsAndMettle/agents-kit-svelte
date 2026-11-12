<script lang="ts" module>
	/** Every word the navigation shows or announces. */
	export interface SettingsNavLabels {
		/** Accessible name of the `<nav>` when there is no `title`. */
		nav: string;
		/** Accessible name of the filter box. */
		filter: string;
		filterPlaceholder: string;
		/** The link that clears the filter. */
		clear: string;
		/** Shown when the filter matches nothing. */
		noMatch: (query: string) => string;
		/** Announced politely while a filter is applied. */
		matches: (count: number) => string;
		/** Screen-reader text for the unsaved-changes dot. */
		unsaved: string;
		/** Screen-reader text for the lock mark. */
		locked: string;
		/** Screen-reader text for a badge (the badge itself is drawn as given). Default: `Count: 3` for a number, a word as it is. */
		badge: (value: string | number) => string;
	}

	/** The GET filter above the links. With JavaScript it filters in place. */
	export interface SettingsNavFilter {
		/** Query parameter. Default `q`. */
		name?: string;
		/** The query the server rendered with (`?q=`). */
		value?: string;
		/** Where the GET form goes. Default: the current page. */
		action?: string;
	}
</script>

<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronRight, Search } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { Badge } from '../../primitives/display';
	import { Input } from '../../primitives/form';
	import { filterSettingsLinks } from '../shared/search';
	import { LOCK_ICONS } from '../shared/lock-icons';
	import type { SettingsLink, SettingsNavGroup } from '../shared/types';
	import { insideSettingsLayout } from './layout-context';
	import { asSentence, badgeLabel, countLinks, sentenceStop } from './shell';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		/** The links, in groups. A group without `label` draws no heading. */
		groups: SettingsNavGroup[];
		/** Id of the current link: it gets `aria-current="page"` and the accent bar. */
		current?: string | null;
		/**
		 * `rail`: compact links beside a page. `index`: 44px rows in inset cards with icon tile,
		 * description, meta and chevron. `auto`: index in a narrow settings container, rail in a wide one.
		 */
		variant?: 'rail' | 'index' | 'auto';
		/**
		 * The index look: two cards side by side when there is room (from the `@lg/settings` width).
		 * Applies to `index`, and to `auto` while it shows the index; the rail is always one column.
		 */
		columns?: 1 | 2;
		/** A heading above the links (and the nav's accessible name). */
		title?: string;
		description?: string;
		/** A GET filter over the links (`?q=`); `false` or omitted draws none. */
		filter?: SettingsNavFilter | false;
		/** Called as the filter text changes (it already filters in place). */
		onFilterChange?: (query: string) => void;
		/** Content above the links, under the title (an attention list, a scope switcher). */
		top?: Snippet;
		/** Content under the links (a help link, a version line). */
		footer?: Snippet;
		/** Level of the title; group headings sit one below it. Default 2; use 1 when the index is the whole page. */
		headingLevel?: 1 | 2 | 3;
		/** Words, merged over the English defaults. */
		labels?: Partial<SettingsNavLabels>;
		class?: string;
	}

	let {
		groups,
		current = null,
		variant = 'auto',
		columns = 1,
		title,
		description,
		filter,
		onFilterChange,
		top,
		footer,
		headingLevel = 2,
		labels,
		'aria-label': ariaLabel,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SettingsNavLabels>({
		nav: 'Settings',
		filter: 'Filter settings',
		filterPlaceholder: 'Filter',
		clear: 'Clear filter',
		noMatch: (query) => `No settings match “${query}”.`,
		matches: (count) => (count === 1 ? '1 setting shown' : `${count} settings shown`),
		unsaved: 'Unsaved changes',
		locked: 'Locked',
		badge: badgeLabel,
		...labels
	});

	const id = $props.id();
	const ownContainer = !insideSettingsLayout();
	const filterName = $derived(filter ? (filter.name ?? 'q') : 'q');
	// Starts from the server's query (and follows it when the app changes it); typing filters in place.
	const serverQuery = $derived(filter ? (filter.value ?? '') : '');
	let query = $derived(serverQuery);
	const shown = $derived(filter ? filterSettingsLinks(groups, query) : groups);
	const shownCount = $derived(countLinks(shown));
	const trimmed = $derived(query.trim());
	let input = $state<HTMLInputElement | null>(null);

	const groupLevel = $derived(Math.min(title ? headingLevel + 1 : headingLevel, 6));
	const titleTag = $derived(`h${headingLevel}`);
	const groupTag = $derived(`h${groupLevel}`);

	// Text typed into the server-rendered box before the page was interactive is the query.
	onMount(() => {
		if (!filter || !input || input.value === query) return;
		query = input.value;
		onFilterChange?.(query);
	});

	function clearFilter(event: MouseEvent): void {
		event.preventDefault();
		query = '';
		onFilterChange?.('');
		input?.focus();
	}

	// One look per variant, written out so Tailwind finds every class. `auto` is the index look,
	// switched to the rail look from the `wide` breakpoint of the settings container.
	const LIST = {
		rail: 'flex flex-col gap-0.5',
		index: 'overflow-hidden rounded-card border border-card-border bg-card-bg divide-y divide-canvas-border',
		auto: 'overflow-hidden rounded-card border border-card-border bg-card-bg divide-y divide-canvas-border @3xl/settings:flex @3xl/settings:flex-col @3xl/settings:gap-0.5 @3xl/settings:overflow-visible @3xl/settings:rounded-none @3xl/settings:border-0 @3xl/settings:bg-transparent @3xl/settings:divide-y-0'
	} as const;
	// Two-up index: tiles in a grid instead of one inset card. `auto` switches back to the rail list when wide.
	const TILES = {
		rail: LIST.rail,
		index: 'grid gap-2 @lg/settings:grid-cols-2 [&>li>a]:h-full [&>li]:overflow-hidden [&>li]:rounded-card [&>li]:border [&>li]:border-card-border [&>li]:bg-card-bg',
		auto: 'grid gap-2 @lg/settings:grid-cols-2 [&>li>a]:h-full [&>li]:overflow-hidden [&>li]:rounded-card [&>li]:border [&>li]:border-card-border [&>li]:bg-card-bg @3xl/settings:flex @3xl/settings:flex-col @3xl/settings:gap-0.5 @3xl/settings:[&>li]:overflow-visible @3xl/settings:[&>li]:rounded-none @3xl/settings:[&>li]:border-0 @3xl/settings:[&>li]:bg-transparent'
	} as const;
	const ROW = {
		rail: 'min-h-8 gap-2.5 rounded-control px-2.5 py-1.5 text-[13px]',
		index: 'min-h-11 gap-3 px-3 py-2.5 text-sm',
		auto: 'min-h-11 gap-3 px-3 py-2.5 text-sm @3xl/settings:min-h-8 @3xl/settings:gap-2.5 @3xl/settings:rounded-control @3xl/settings:px-2.5 @3xl/settings:py-1.5 @3xl/settings:text-[13px]'
	} as const;
	const TILE = {
		rail: 'inline-flex size-4 shrink-0 items-center justify-center text-fg-light [&_svg]:size-4',
		index: 'inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-canvas-secondary text-fg-main [&_svg]:size-4',
		auto: 'inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-canvas-secondary text-fg-main [&_svg]:size-4 @3xl/settings:size-4 @3xl/settings:rounded-none @3xl/settings:bg-transparent @3xl/settings:text-fg-light'
	} as const;
	/** Parts only the index look shows. */
	const INDEX_ONLY = { rail: 'hidden', index: '', auto: '@3xl/settings:hidden' } as const;
	const LINK =
		'group relative flex w-full items-center text-fg-main no-underline outline-none transition-colors hover:bg-canvas-secondary focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-primary aria-[current=page]:bg-accent-subtle aria-[current=page]:font-medium aria-[current=page]:shadow-[inset_3px_0_0_var(--color-accent-primary)] forced-colors:aria-[current=page]:border-s-4 forced-colors:aria-[current=page]:border-solid';
</script>

<!-- The link's name is its label alone. Marks, badge, description and meta describe it
     (aria-describedby); inside the link they are aria-hidden so they stay out of the name. Each
     part is spoken as its own sentence: a visible part without closing punctuation gets a zero-size
     stop (inline, so no space is spoken before it). -->
{#snippet marks(link: SettingsLink, base: string)}
	{#if link.dirty}
		<span class="inline-flex shrink-0 items-center">
			<span aria-hidden="true" data-nav-dirty class="size-1.5 rounded-full bg-accent-primary forced-colors:border-[3px] forced-colors:border-solid"></span>
			<span id="{base}-dirty" aria-hidden="true" class="sr-only">{asSentence(text.unsaved)}</span>
		</span>
	{/if}
	{#if link.lock}
		{@const LockIcon = LOCK_ICONS[link.lock]}
		<span class="inline-flex shrink-0 items-center text-fg-light [&_svg]:size-3.5">
			<span aria-hidden="true" class="inline-flex"><LockIcon /></span>
			<span id="{base}-lock" aria-hidden="true" class="sr-only">{asSentence(text.locked)}</span>
		</span>
	{/if}
{/snippet}

{#snippet entry(link: SettingsLink)}
	{@const Icon = link.icon}
	{#if link.disabled}
		<!-- Not a link: nothing to follow, so it never takes focus. The reason is visible text. -->
		<div data-nav-disabled={link.id} class={cn('flex w-full items-center text-fg-light', ROW[variant])}>
			{#if Icon}<span aria-hidden="true" class={cn(TILE[variant], 'opacity-60')}><Icon /></span>{/if}
			<span class="min-w-0 flex-1">
				<span class="block truncate">{link.label}</span>
				<span class="block text-xs leading-4 text-fg-light">{link.disabled}</span>
			</span>
		</div>
	{:else}
		{@const base = `${id}-link-${link.id}`}
		{@const hasBadge = link.badge !== undefined && link.badge !== ''}
		{@const described = [link.dirty && `${base}-dirty`, link.lock && `${base}-lock`, hasBadge && `${base}-badge`, link.description && `${base}-description`, link.meta && `${base}-meta`].filter(Boolean).join(' ')}
		<a href={link.href} aria-current={link.id === current ? 'page' : undefined} aria-describedby={described || undefined} data-nav-link={link.id} class={cn(LINK, ROW[variant])}>
			{#if Icon}<span aria-hidden="true" class={TILE[variant]}><Icon /></span>{/if}
			<span class="min-w-0 flex-1">
				<span class="flex min-w-0 items-center gap-1.5">
					<span class="truncate">{link.label}</span>
					{@render marks(link, base)}
				</span>
				{#if link.description}
					<span id="{base}-description" aria-hidden="true" class={cn('mt-0.5 block text-xs leading-4 font-normal text-fg-light', INDEX_ONLY[variant])}>{link.description}{#if sentenceStop(link.description)}<span class="text-[0px]">{sentenceStop(link.description)}</span>{/if}</span>
				{/if}
			</span>
			{#if link.meta}
				<span id="{base}-meta" aria-hidden="true" class={cn('shrink-0 text-xs font-normal text-fg-light', link.description && '@max-lg/settings:hidden', INDEX_ONLY[variant])}>{link.meta}{#if sentenceStop(link.meta)}<span class="text-[0px]">{sentenceStop(link.meta)}</span>{/if}</span>
			{/if}
			{#if hasBadge}
				<Badge tone={link.badgeTone ?? 'neutral'} size="sm" aria-hidden="true">{link.badge}</Badge>
				<span id="{base}-badge" aria-hidden="true" class="sr-only">{asSentence(text.badge(link.badge!))}</span>
			{/if}
			<ChevronRight aria-hidden="true" class={cn('size-4 shrink-0 text-fg-light rtl:-scale-x-100', INDEX_ONLY[variant])} />
		</a>
	{/if}
{/snippet}

<nav {...rest} aria-label={ariaLabel ?? title ?? text.nav} data-variant={variant} class={cn('flex min-w-0 flex-col gap-4', ownContainer && '@container/settings', className)}>
	{#if title || description}
		<div class="flex flex-col gap-0.5 px-1">
			{#if title}<svelte:element this={titleTag} class="m-0 text-base font-semibold tracking-[-0.01em] text-fg-main">{title}</svelte:element>{/if}
			{#if description}<p class="m-0 text-xs leading-5 text-fg-light">{description}</p>{/if}
		</div>
	{/if}
	{@render top?.()}
	{#if filter}
		<form method="get" action={filter.action} role="search" aria-label={text.filter} onsubmit={(event) => event.preventDefault()}>
			<Input
				type="search"
				name={filterName}
				value={query}
				bind:ref={input}
				defaultValue={filter.value ?? ''}
				aria-label={text.filter}
				placeholder={text.filterPlaceholder}
				autocomplete="off"
				spellcheck={false}
				enterkeyhint="search"
				onValueChange={(value) => {
					query = value;
					onFilterChange?.(value);
				}}
			>
				{#snippet leading()}<Search aria-hidden="true" />{/snippet}
			</Input>
		</form>
		<p role="status" class="sr-only">{trimmed ? (shownCount ? text.matches(shownCount) : text.noMatch(trimmed)) : ''}</p>
	{/if}
	{#if filter && trimmed && shownCount === 0}
		<div class="flex flex-col items-start gap-1.5 rounded-card border border-dashed border-card-border px-4 py-5 text-[13px] text-fg-light">
			<p class="m-0">{text.noMatch(trimmed)}</p>
			<a href={filter.action ?? '?'} onclick={clearFilter} class="rounded-sm font-medium text-fg-main underline underline-offset-2 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary">{text.clear}</a>
		</div>
	{/if}
	{#each shown as group (group.id)}
		<div class="flex min-w-0 flex-col gap-1.5">
			{#if group.label}
				<svelte:element this={groupTag} id="{id}-{group.id}" class="m-0 px-1 text-xs font-medium text-fg-light">{group.label}</svelte:element>
			{/if}
			{#if group.description}<p class={cn('m-0 px-1 text-xs leading-5 text-fg-light', INDEX_ONLY[variant])}>{group.description}</p>{/if}
			<ul role="list" aria-labelledby={group.label ? `${id}-${group.id}` : undefined} class={cn('m-0 list-none p-0', columns === 2 ? TILES[variant] : LIST[variant])}>
				{#each group.items as link (link.id)}
					<li class="min-w-0">{@render entry(link)}</li>
				{/each}
			</ul>
		</div>
	{/each}
	{@render footer?.()}
</nav>
