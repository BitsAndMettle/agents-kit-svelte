<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { resolveKey } from './helpers';

	export interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children'> {
		/** A key combination, one entry per key, e.g. `['Ctrl', 'K']`. `Mod` means ⌘ on Mac and Ctrl elsewhere. */
		keys?: string[];
		/** Text between the keys of a combination. */
		joiner?: string;
		/**
		 * `auto` checks the browser after hydration (and draws the non-Mac keys on the server).
		 * With `mac` the common modifiers (Cmd, Alt, Shift, Ctrl, Enter) are drawn as Mac symbols with spoken names.
		 */
		platform?: 'auto' | 'mac' | 'other';
		/** Spoken names that replace the built-in English ones, keyed by the key as written, e.g. { Cmd: 'Befehl' }. */
		keyLabels?: Record<string, string>;
		/** A single key cap, when `keys` is not used. */
		children?: Snippet;
		class?: string;
	}

	let {
		keys,
		joiner = '+',
		platform = 'other',
		keyLabels,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	let detectedMac = $state(false);
	$effect(() => {
		if (platform !== 'auto') return;
		const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
		detectedMac = /mac|iphone|ipad/i.test(nav.userAgentData?.platform ?? nav.platform ?? '');
	});
	let mac = $derived(platform === 'mac' || (platform === 'auto' && detectedMac));
	let caps = $derived((keys ?? []).map((key) => {
			const cap = resolveKey(key, mac);
			return { ...cap, label: keyLabels?.[key] ?? cap.label };
		}));

	const CAP =
		'inline-flex min-w-5 items-center justify-center rounded-chip border border-card-border border-b-2 bg-card-bg px-1.5 py-px font-mono text-[11px] font-medium leading-4 text-fg-main';
</script>

{#if keys && keys.length > 0}
	<kbd {...rest} class={cn('inline-flex items-center gap-1', className)}>
		{#each caps as cap, n (n)}
			{#if n > 0}<span class="text-[11px] text-fg-light">{joiner}</span>{/if}
			<kbd class={CAP}>
				{#if cap.display === cap.label}
					{cap.display}
				{:else}
					<span aria-hidden="true">{cap.display}</span><span class="sr-only">{cap.label}</span>
				{/if}
			</kbd>
		{/each}
	</kbd>
{:else}
	<kbd {...rest} class={cn(CAP, className)}>{@render children?.()}</kbd>
{/if}
