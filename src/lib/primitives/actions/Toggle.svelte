<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { ButtonSize } from '../../ui/styles';

	interface Props extends Omit<HTMLButtonAttributes, 'class' | 'children' | 'type' | 'disabled' | 'aria-pressed'> {
		/** Whether the toggle is on. Bindable. */
		pressed?: boolean;
		onPressedChange?: (pressed: boolean) => void;
		size?: Extract<ButtonSize, 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon'>;
		/** The softer chat-style pill. */
		pill?: boolean;
		disabled?: boolean;
		/** Content before the label (an icon). */
		leading?: Snippet;
		children?: Snippet;
		class?: string;
	}

	export type ToggleProps = Props;
</script>

<script lang="ts">
	import { cn } from '../../ui/cn';
	import { toggleButtonClass, togglePillClass } from '../../ui/styles';

	let {
		pressed = $bindable(false),
		onPressedChange,
		size = 'sm',
		pill = false,
		disabled = false,
		leading,
		children,
		onclick,
		class: className = '',
		...rest
	}: Props = $props();

	function flip(event: MouseEvent): void {
		(onclick as ((e: MouseEvent) => void) | null | undefined)?.(event);
		if (event.defaultPrevented) return;
		pressed = !pressed;
		onPressedChange?.(pressed);
	}
</script>

<button {...rest} type="button" {disabled} aria-pressed={pressed} data-state={pressed ? 'on' : 'off'} onclick={flip} class={cn((pill ? togglePillClass : toggleButtonClass)(pressed, size), className)}>
	{@render leading?.()}
	{@render children?.()}
</button>
