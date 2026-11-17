<!--
	@component
	The frame of an app: one bar with its name, the places to go and your controls, over the page.
	The page scrolls with the document and the bar stays in view. A place marked `fill` gives its
	page exactly the space under the bar instead, for a page that does its own scrolling (a chat):
	that page takes `h-full`. On a phone the places are a row of their own under the name.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { UiTone } from '../../ui/styles';

	/** One place an `AppShell` goes to. */
	export interface AppShellItem {
		label: string;
		href: string;
		/** A number after the label, e.g. how many warnings are open. Nothing shows for 0. */
		count?: number;
		/** What the number counts, said after it to a screen reader, e.g. `open notices`. */
		countLabel?: string;
		/** The count's colour. Default `accent`; `warning` for a count that waits on you. */
		countTone?: UiTone;
		/** Its page gets exactly the space under the bar and does its own scrolling, e.g. a chat. */
		fill?: boolean;
	}

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** The app's name, at the start of the bar. */
		title?: string;
		/** Your mark before the name, e.g. a 20px logo. Decorative: hide it from assistive technology. */
		mark?: Snippet;
		/**
		 * `soft`: today's bar. `studio`: the Studio design's bar. 56px on the card surface, the name at 16px bold
		 * from 640px, the places as flat links with the one on screen filled, counts solid.
		 */
		chrome?: 'soft' | 'studio';
		/** The places to go, in order. */
		items: AppShellItem[];
		/**
		 * The path of the page on screen, e.g. `page.url.pathname`. The item it is under is marked as
		 * the current page: `/board/42` is under `/board`.
		 */
		path: string;
		/** Controls at the end of the bar, e.g. an account menu. */
		actions?: Snippet;
		/**
		 * The widest the bar's content gets, centred, e.g. `72rem`. Give it the max width of a page laid
		 * out as `mx-auto max-w-6xl px-4 sm:px-6`, and the name and controls line up with that page's
		 * content. The bar's border and colour still span the window.
		 */
		maxWidth?: string;
		/** The page. */
		children?: Snippet;
		/** Names the navigation (the real attribute, passed through to it). */
		'aria-label'?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import { SEGMENT_GROUP_CLASS, segmentClass } from '../../ui/styles';
	import Badge from '../display/Badge.svelte';

	let { title = '', mark, chrome = 'soft', items, path, actions, maxWidth, children, 'aria-label': ariaLabel = 'Main', class: className = '', ...rest }: Props = $props();

	// Studio: a 56px bar on the card surface; 24px between its groups from 1024px.
	const STUDIO_HEADER = 'sticky top-0 z-40 shrink-0 border-b border-card-border bg-card-bg';
	const STUDIO_ROW = 'mx-auto flex flex-wrap items-center min-h-14 gap-x-4 gap-y-3 px-4 py-2 lg:gap-x-6';
	const STUDIO_NAME = 'text-sm font-semibold sm:text-base sm:font-bold';
	const STUDIO_LINK = 'flex h-[30px] w-full items-center justify-center gap-2 rounded-chip px-3 text-sm transition-colors max-sm:h-10';
	const STUDIO_HERE = 'bg-canvas-secondary font-semibold text-fg-main';
	const STUDIO_IDLE = 'text-fg-light hover:bg-canvas-secondary hover:text-fg-main';

	let studio = $derived(chrome === 'studio');

	/** A path ending in a slash, so `/board` is above `/board/42` and `/board/`, and not above `/boardroom`. */
	const slashed = (at: string) => (at.endsWith('/') ? at : `${at}/`);

	/** The item for the page on screen: the nearest one at or above the path. */
	let here = $derived(items.filter((item) => slashed(path).startsWith(slashed(item.href))).sort((a, b) => b.href.length - a.href.length)[0]);
</script>

<div {...rest} class={cn('flex flex-col bg-canvas-primary text-fg-main', here?.fill ? 'h-dvh' : 'min-h-dvh', className)}>
	<header class={studio ? STUDIO_HEADER : 'sticky top-0 z-40 shrink-0 border-b border-canvas-border bg-canvas-primary py-2'}>
		<div class={studio ? `${STUDIO_ROW} ${maxWidth ? 'sm:px-6' : 'sm:px-5'}` : 'mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6'} style:max-width={maxWidth}>
			{#if title || mark}<p class="m-0 {mark ? 'flex items-center gap-2 ' : ''}{studio ? STUDIO_NAME : 'text-sm font-semibold'}">{@render mark?.()}{title}</p>{/if}
			<nav aria-label={ariaLabel} class="order-last w-full sm:order-none sm:w-auto">
				<ul class={studio ? 'm-0 flex list-none items-center gap-1 p-0' : cn(SEGMENT_GROUP_CLASS, 'm-0 flex list-none')}>
					{#each items as item (item.href)}
						<li class="flex-1 sm:flex-none">
							<a href={item.href} aria-current={item === here ? 'page' : undefined} class={studio ? `${STUDIO_LINK} ${item === here ? STUDIO_HERE : STUDIO_IDLE}` : cn(segmentClass(item === here), 'w-full justify-center max-sm:h-10')}>
								{item.label}
								{#if item.count}
									<Badge tone={item.countTone ?? 'accent'} size={studio ? undefined : 'sm'} variant={studio ? 'solid' : undefined} class={studio ? 'px-[7px] leading-[14px] font-semibold' : undefined}>{item.count}{#if item.countLabel}<span class="sr-only">{` ${item.countLabel}`}</span>{/if}</Badge>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
			{#if actions}<div class={studio ? 'ml-auto flex items-center gap-1.5 lg:gap-6' : 'ml-auto flex items-center gap-1.5'}>{@render actions()}</div>{/if}
		</div>
	</header>
	<main class="min-h-0 flex-1">{@render children?.()}</main>
</div>
