<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/** One accordion item: a header (text or a snippet) and its panel content. */
	export interface AccordionItem {
		value: string;
		label: string | Snippet;
		disabled?: boolean;
		content: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';
	import { Accordion as HeadlessAccordion } from '../../headless/patterns/groups.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		items: AccordionItem[];
		/** Allow several items open at once; `value` is then a list. */
		multiple?: boolean;
		/** Single mode: may the open item be closed again? Default true. */
		collapsible?: boolean;
		/** The open item (`string | null`), or the open items (`string[]`) when `multiple`. Bindable. */
		value?: string | string[] | null;
		defaultValue?: string | string[] | null;
		onValueChange?: (value: string | string[] | null) => void;
		/** Heading level of each header, 2 to 6. Default 3. */
		headingLevel?: 2 | 3 | 4 | 5 | 6;
		/** The root element. */
		ref?: HTMLDivElement;
		class?: string;
	}

	let {
		items,
		multiple = false,
		collapsible = true,
		value = $bindable(),
		defaultValue,
		onValueChange,
		headingLevel = 3,
		ref = $bindable(),
		class: className = '',
		...rest
	}: Props = $props();

	export type AccordionProps = Props;

	const id = $props.id();

	function normalise(v: string | string[] | null | undefined): string | string[] | null {
		if (multiple) return v == null ? [] : Array.isArray(v) ? v : [v];
		return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
	}

	let current = $derived(normalise(value !== undefined ? value : defaultValue));

	function report(next: unknown): void {
		value = next as string | string[] | null;
		onValueChange?.(value);
	}

	// The headless layer fixes `multiple` at construction, so both modes are built and the
	// prop picks one.
	const single = new HeadlessAccordion({
		id,
		collapsible: () => collapsible,
		value: () => (Array.isArray(current) ? (current[0] ?? null) : current),
		onValueChange: report
	});
	const several = new HeadlessAccordion({
		id,
		multiple: true,
		value: () => (Array.isArray(current) ? current : current === null ? [] : [current]),
		onValueChange: report
	});
	const accordion = $derived<{
		root: typeof single.root;
		trigger: typeof single.trigger;
		panel: typeof single.panel;
	}>(multiple ? several : single);
</script>

<div {...rest} {...accordion.root} bind:this={ref} class={cn('divide-y divide-card-border overflow-hidden rounded-card border border-card-border bg-card-bg', className)}>
		{#each items as item (item.value)}
			<div>
				<svelte:element this={`h${headingLevel}`} class="m-0 text-sm font-medium text-fg-main">
					<button
						{...accordion.trigger({ value: item.value, disabled: item.disabled })}
						class="group flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-canvas-secondary aria-disabled:cursor-default aria-disabled:data-[state=closed]:cursor-not-allowed aria-disabled:data-[state=closed]:opacity-50 aria-disabled:hover:bg-transparent"
					>
						<span class="min-w-0">
							{#if typeof item.label === 'string'}{item.label}{:else}{@render item.label()}{/if}
						</span>
						<ChevronDown
							aria-hidden="true"
							class="size-4 shrink-0 text-fg-light motion-safe:transition-transform motion-safe:duration-200 group-data-[state=open]:rotate-180"
						/>
					</button>
				</svelte:element>
				<div {...accordion.panel(item.value)}>
					<div class="ak-acc-body px-4 pb-4 text-sm text-fg-light">{@render item.content()}</div>
				</div>
			</div>
		{/each}
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		[data-state='open'] > .ak-acc-body {
			animation: ak-acc-in 180ms ease-out;
		}
	}
	@keyframes ak-acc-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
</style>
