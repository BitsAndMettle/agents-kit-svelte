<script lang="ts">
	import Alert, { type Props as AlertProps } from './Alert.svelte';

	export interface Props extends Omit<AlertProps, 'children' | 'icon' | 'hideIcon' | 'live'> {
		/** What is wrong, in a few words. */
		title: string;
		/**
		 * Required: every notice can be dismissed. It works as on `Alert`: return the promise that stores the
		 * dismissal, then stop rendering the notice.
		 */
		onDismiss: () => unknown;
		/** The dismiss button is named with this and the title, so each notice in a list has its own. */
		dismissLabel?: string;
	}

	let { tone = 'warning', title, dismissLabel = 'Dismiss', ...rest }: Props = $props();
</script>

<Alert {...rest} {tone} {title} dismissLabel="{dismissLabel}: {title}" />
