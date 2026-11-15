<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import CheckMark from './CheckMark.svelte';
	import { PR_STATES } from './pr-state';
	import type { GitHubPullRequestData } from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'children' | 'pr'> {
		pr: Pick<GitHubPullRequestData, 'number' | 'state' | 'href' | 'checksStatus'>;
		class?: string;
	}

	let { pr, class: className = '', ...rest }: Props = $props();

	let prState = $derived(PR_STATES[pr.state]);
</script>

<!-- A pull request in a line: its state as GitHub's icon, its number, and how its checks stand. -->
<span {...rest} class={cn('inline-flex items-center gap-1.5 text-xs', className)}>
	<span class="inline-flex rounded-chip p-0.5 {prState.class}">
		<prState.icon aria-hidden="true" class="size-3" />
		<span class="sr-only">{prState.label}</span>
	</span>
	<svelte:element
		this={pr.href ? 'a' : 'span'}
		href={pr.href}
		class={cn('font-mono font-medium text-fg-main', pr.href && 'rounded-sm underline decoration-fg-light/50 underline-offset-4 hover:decoration-fg-main')}
	>#{pr.number}</svelte:element>
	{#if pr.checksStatus}<CheckMark status={pr.checksStatus} />{/if}
</span>
