<script lang="ts" module>
	/** One section of a page: its name and where it is. */
	export interface SectionNavItem {
		label: string;
		href: string;
	}
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'aria-label'> {
		/** Names the navigation, e.g. "Settings sections". */
		'aria-label': string;
		items: SectionNavItem[];
		/** The `href` of the section on screen. It is marked as the current page; none is when it matches no item. */
		current?: string;
		class?: string;
	}

	let { items, current, class: className = '', ...rest }: Props = $props();

	export type SectionNavProps = Props;
</script>

<!-- From md a column beside the page; below it one row that scrolls sideways inside the nav, so the page never does. -->
<nav {...rest} class={cn('overflow-x-auto md:overflow-visible', className)}>
	<ul class="m-0 flex list-none gap-0.5 p-0 md:flex-col">
		{#each items as item (item.href)}
			{@const here = item.href === current}
			<li class="shrink-0">
				<!-- The focus ring is drawn inside the link, so the scrolling row does not clip it. -->
				<a
					href={item.href}
					aria-current={here ? 'page' : undefined}
					class={cn(
						'flex min-h-11 items-center whitespace-nowrap rounded-control px-3 text-sm transition-colors focus-visible:-outline-offset-2 pointer-fine:min-h-9',
						here ? 'bg-canvas-secondary font-semibold text-fg-main' : 'text-fg-light hover:bg-canvas-secondary hover:text-fg-main'
					)}
				>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
