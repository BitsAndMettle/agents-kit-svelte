<script lang="ts" module>
	/** One column of a `Table`. */
	export interface TableColumn {
		/** The column's header. */
		label: string;
		/** Keeps the header for screen readers only. When every column hides its label the header row is not drawn. */
		hideLabel?: boolean;
		/** Sizes the column on its `<col>`, e.g. `w-28`. */
		class?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { SURFACE } from '../../ui/styles';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'aria-label'> {
		/** Names the table. */
		'aria-label': string;
		columns: TableColumn[];
		/** The rows: one `<tr>` of `<td>`s each, a row's name as `<th scope="row">`. The table styles the cells. */
		children: Snippet;
		class?: string;
	}

	let { 'aria-label': ariaLabel, columns, children, class: className = '', ...rest }: Props = $props();

	export type TableProps = Props;

	let headless = $derived(columns.every((column) => column.hideLabel));
</script>

<!-- A wide table scrolls inside its own box. -->
<div {...rest} class={cn(SURFACE.card, 'overflow-x-auto', className)}>
	<table aria-label={ariaLabel} class="w-full border-collapse text-left text-[13px] text-fg-main">
		<colgroup>
			{#each columns as column, index (index)}<col class={column.class} />{/each}
		</colgroup>
		<thead class={headless ? 'sr-only' : undefined}>
			<tr class="border-b border-canvas-border">
				{#each columns as column, index (index)}
					<th scope="col" class="px-4 pt-3 pb-2 text-left text-xs font-normal text-fg-light">
						{#if column.hideLabel}<span class="sr-only">{column.label}</span>{:else}{column.label}{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="[&>tr+tr]:border-t [&>tr+tr]:border-canvas-border [&>tr>*]:px-4 [&>tr>*]:py-3 [&>tr>th]:text-left [&>tr>th]:font-medium">
			{@render children()}
		</tbody>
	</table>
</div>
