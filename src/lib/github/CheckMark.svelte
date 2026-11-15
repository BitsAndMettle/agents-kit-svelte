<script lang="ts">
	import { cn } from '../ui/cn';
	import { STATUS_TEXT_CLASS, type UiTone } from '../ui/styles';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Check, Minus, X } from '@lucide/svelte';
	import type { GitHubCheckItem } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children' | 'status' | 'spoken'> {
		status: GitHubCheckItem['status'];
		/** Says the status to screen readers. Pass false where the text beside the mark already says it. */
		spoken?: boolean;
		class?: string;
	}

	let { status, spoken = true, class: className = '', ...rest }: Props = $props();

	const TONES: Record<GitHubCheckItem['status'], UiTone> = { passed: 'success', failed: 'danger', running: 'accent', skipped: 'neutral' };
</script>

<!-- A check's status as a glyph of its own, so no two differ by colour alone. -->
<span {...rest} class={cn('inline-flex size-3.5 shrink-0 items-center justify-center', STATUS_TEXT_CLASS[TONES[status]], className)}>
	{#if status === 'passed'}
		<Check aria-hidden="true" class="size-3.5" />
	{:else if status === 'failed'}
		<X aria-hidden="true" class="size-3.5" />
	{:else if status === 'skipped'}
		<Minus aria-hidden="true" class="size-3.5" />
	{:else}
		<span class="size-2 rounded-full bg-current"></span>
	{/if}
	{#if spoken}<span class="sr-only">{status}</span>{/if}
</span>
