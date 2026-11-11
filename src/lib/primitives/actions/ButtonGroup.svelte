<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'role' | 'aria-label'> {
		/** Names the group for screen readers. */
		label: string;
		orientation?: 'horizontal' | 'vertical';
		/** Join the buttons into one bar (default). False spaces them apart. */
		attached?: boolean;
		children?: Snippet;
		class?: string;
	}

	export type ButtonGroupProps = Props;
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';

	let { label, orientation = 'horizontal', attached = true, children, class: className = '', ...rest }: Props = $props();

	const JOIN_H = '[&>*:not(:first-child)]:rounded-s-none [&>*:not(:last-child)]:rounded-e-none [&>*:not(:first-child)]:-ms-px';
	const JOIN_V = '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px';
</script>

<div {...rest} role="group" aria-label={label} data-orientation={orientation} class={cn('inline-flex [&>*:focus-visible]:z-10', orientation === 'vertical' ? 'flex-col items-stretch' : 'items-center', attached ? (orientation === 'vertical' ? JOIN_V : JOIN_H) : 'gap-2', className)}>
	{@render children?.()}
</div>
