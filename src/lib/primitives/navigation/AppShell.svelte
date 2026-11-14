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

	/** One place an `AppShell` goes to. */
	export interface AppShellItem {
		label: string;
		href: string;
		/** A number after the label, e.g. how many warnings are open. Nothing shows for 0. */
		count?: number;
		/** What the number counts, said after it to a screen reader, e.g. `open notices`. */
		countLabel?: string;
		/** Its page gets exactly the space under the bar and does its own scrolling, e.g. a chat. */
		fill?: boolean;
	}

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** The app's name, at the start of the bar. */
		title?: string;
		/** The places to go, in order. */
		items: AppShellItem[];
		/**
		 * The path of the page on screen, e.g. `page.url.pathname`. The item it is under is marked as
		 * the current page: `/board/42` is under `/board`.
		 */
		path: string;
		/** Controls at the end of the bar, e.g. an account menu. */
		actions?: Snippet;
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

	let { title = '', items, path, actions, children, 'aria-label': ariaLabel = 'Main', class: className = '', ...rest }: Props = $props();

	/** A path ending in a slash, so `/board` is above `/board/42` and `/board/`, and not above `/boardroom`. */
	const slashed = (at: string) => (at.endsWith('/') ? at : `${at}/`);

	/** The item for the page on screen: the nearest one at or above the path. */
	let here = $derived(items.filter((item) => slashed(path).startsWith(slashed(item.href))).sort((a, b) => b.href.length - a.href.length)[0]);
</script>

<div {...rest} class={cn('flex flex-col bg-canvas-primary text-fg-main', here?.fill ? 'h-dvh' : 'min-h-dvh', className)}>
	<header class="sticky top-0 z-40 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-canvas-border bg-canvas-primary px-4 py-2 sm:px-6">
		{#if title}<p class="m-0 text-sm font-semibold">{title}</p>{/if}
		<nav aria-label={ariaLabel} class="order-last w-full sm:order-none sm:w-auto">
			<ul class={cn(SEGMENT_GROUP_CLASS, 'm-0 flex list-none')}>
				{#each items as item (item.href)}
					<li class="flex-1 sm:flex-none">
						<a href={item.href} aria-current={item === here ? 'page' : undefined} class={cn(segmentClass(item === here), 'w-full justify-center max-sm:h-10')}>
							{item.label}
							{#if item.count}
								<Badge tone="accent" size="sm">{item.count}{#if item.countLabel}<span class="sr-only">{` ${item.countLabel}`}</span>{/if}</Badge>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		{#if actions}<div class="ml-auto flex items-center gap-1.5">{@render actions()}</div>{/if}
	</header>
	<main class="min-h-0 flex-1">{@render children?.()}</main>
</div>
