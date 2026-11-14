<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, Copy } from '@lucide/svelte';
	import { cn } from '../../ui/cn';
	import { copyText } from '../../ui/clipboard';
	import { SURFACE } from '../../ui/styles';
	import { IconButton } from '../actions';
	import { READABLE_TONE_TEXT } from './helpers';

	export interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** The command, shown in full and copied exactly as given. */
		command: string;
		/** Names the copy button. */
		copyLabel?: string;
		/** Announced after a copy. */
		copiedLabel?: string;
		/** Shown when the clipboard refuses. One click on the command selects all of it. */
		failedLabel?: string;
		class?: string;
	}

	let {
		command,
		copyLabel = 'Copy',
		copiedLabel = 'Copied',
		failedLabel = 'Could not copy. Select the command and copy it by hand.',
		class: className = '',
		...rest
	}: Props = $props();

	/** How long the check mark shows after a copy. */
	const COPIED_MS = 2000;

	let outcome = $state<'copied' | 'failed'>();

	// A failure stays until the next press; a success clears itself.
	$effect(() => {
		if (outcome !== 'copied') return;
		const timer = setTimeout(() => (outcome = undefined), COPIED_MS);
		return () => clearTimeout(timer);
	});

	async function copy(): Promise<void> {
		outcome = (await copyText(command)) ? 'copied' : 'failed';
	}
</script>

<div {...rest} class={cn('flex flex-col gap-1.5', className)}>
	<div class="flex items-start gap-2">
		<p class={cn(SURFACE.inset, 'm-0 flex min-w-0 flex-1 gap-2 px-3 py-1.5 font-mono text-xs leading-5 text-fg-main')}>
			<span aria-hidden="true" class="text-fg-light select-none">$</span>
			<!-- Each word is one box, so a long command wraps between words and never inside a flag. -->
			<code class="min-w-0 whitespace-pre-wrap select-all">
				{#each command.split(/(\s+)/) as part, index (index)}{#if index % 2}{part}{:else}<span class="inline-block max-w-full [overflow-wrap:anywhere]">{part}</span>{/if}{/each}
			</code>
		</p>
		<IconButton aria-label={copyLabel} showTitle variant="secondary" onclick={copy}>
			{#if outcome === 'copied'}<Check aria-hidden="true" class="text-status-success" />{:else}<Copy aria-hidden="true" />{/if}
		</IconButton>
	</div>
	<!-- Always rendered, so the outcome is announced when it appears. Only a failure is shown. -->
	<p role="status" class={cn('m-0 text-xs leading-5 font-medium', READABLE_TONE_TEXT.danger, outcome !== 'failed' && 'sr-only')}>
		{outcome === 'copied' ? copiedLabel : outcome === 'failed' ? failedLabel : ''}
	</p>
</div>
