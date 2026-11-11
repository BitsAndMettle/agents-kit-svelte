<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'role'> {
		orientation?: 'horizontal' | 'vertical';
		/** Purely visual by default (`role="none"`). Set `false` to expose a `separator` to assistive technology. */
		decorative?: boolean;
		/** Text in the middle of the line. */
		label?: string;
		class?: string;
	}

	let {
		orientation = 'horizontal',
		decorative = true,
		label = '',
		class: className = '',
		...rest
	}: Props = $props();

	let vertical = $derived(orientation === 'vertical');
	const LINE = 'bg-canvas-border';
</script>

{#if label}
	<div {...rest}
		role={decorative ? 'none' : 'separator'}
		aria-orientation={decorative ? undefined : orientation}
		class={cn('flex items-center gap-3 text-xs font-medium text-fg-light', vertical ? 'min-h-8 flex-col' : 'w-full', className)}
	>
		<span aria-hidden="true" class={cn(LINE, vertical ? 'w-px flex-1' : 'h-px flex-1')}></span>
		<span>{label}</span>
		<span aria-hidden="true" class={cn(LINE, vertical ? 'w-px flex-1' : 'h-px flex-1')}></span>
	</div>
{:else}
	<div {...rest}
		role={decorative ? 'none' : 'separator'}
		aria-orientation={decorative ? undefined : orientation}
		class={cn('shrink-0', LINE, vertical ? 'inline-block min-h-4 w-px self-stretch' : 'h-px w-full', className)}
	></div>
{/if}
