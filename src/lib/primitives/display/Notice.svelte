<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import type { UiTone } from '../../ui/styles';
	import Alert from './Alert.svelte';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children' | 'title'> {
		/** What is wrong, in a few words. */
		title: string;
		description?: string;
		tone?: UiTone;
		/** Buttons or links under the text, e.g. the way to fix it. */
		actions?: Snippet;
		/**
		 * Called when the person dismisses the notice; every notice can be dismissed. Return a promise and the
		 * notice waits for it, marked busy, and ignores a second press. The notice does not remove itself: stop
		 * rendering it once the dismissal is stored. If the promise rejects, it stays.
		 */
		onDismiss: () => unknown;
		/** The dismiss button is named with this and the title, so each notice in a list has its own. */
		dismissLabel?: string;
		class?: string;
	}

	let { title, description = '', tone = 'warning', actions, onDismiss, dismissLabel = 'Dismiss', class: className = '', ...rest }: Props = $props();

	let pending = $state(false);

	async function dismiss(): Promise<void> {
		if (pending) return;
		pending = true;
		try {
			await onDismiss();
		} finally {
			pending = false;
		}
	}
</script>

<div {...rest} aria-busy={pending} class={cn('w-full transition-opacity', pending && 'opacity-60', className)}>
	<Alert {tone} {title} {description} {actions} onDismiss={dismiss} dismissLabel="{dismissLabel}: {title}" />
</div>
