<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Sparkle } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { SOFT } from '../ui/styles';
	import Markdown from './Markdown.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'id' | 'role' | 'author' | 'badge' | 'timestamp' | 'children' | 'text'> {
		id?: string;
		role: 'user' | 'assistant' | 'system';
		author: string;
		badge?: string;
		timestamp?: string;
		/** The message as Markdown, rendered safely with `Markdown`. Used when there are no children. */
		text?: string;
		class?: string;
		children?: Snippet;
	}

	let {
		id,
		role,
		author,
		badge,
		timestamp,
		text = '',
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

{#snippet body()}
	{#if children}{@render children()}{:else}<Markdown {text} />{/if}
{/snippet}

<article {...rest}
	{id}
	data-slot="message"
	data-from={role}
	data-role={role}
	class={cn(`group/message flex w-full gap-3 ${role === 'user' ? 'justify-end' : 'justify-start'}`, className)}
>
	{#if role !== 'user'}
		<div aria-hidden="true" class="{SOFT.avatar} mt-0.5 max-sm:hidden">
			<Sparkle class="fill-current" />
		</div>
	{/if}

	<div class="min-w-0 {role === 'user' ? 'flex max-w-[88%] flex-col items-end sm:max-w-[80%]' : 'flex-1'} space-y-1.5">
		<header
			class="flex items-center gap-2 text-xs text-fg-light {role === 'user'
				? 'justify-end opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100'
				: 'h-7 justify-start'}"
		>
			{#if role !== 'user'}
				<span aria-hidden="true" class="{SOFT.avatar} size-6 sm:hidden [&_svg]:size-3">
					<Sparkle class="fill-current" />
				</span>
			{/if}
			<span class="font-medium {role === 'user' ? '' : 'text-fg-main'}">{author}</span>
			{#if badge}
				<span class="rounded-full bg-chat-user px-2 py-px text-[11px] text-fg-light">
					{badge}
				</span>
			{/if}
			{#if timestamp}
				<span class="tabular-nums">{timestamp}</span>
			{/if}
		</header>

		{#if role === 'user'}
			<div
				data-slot="message-content"
				class="min-w-0 rounded-bubble bg-chat-user px-4 py-2.5 text-[15px] leading-6 text-fg-main"
			>
				{@render body()}
			</div>
		{:else}
			<div data-slot="message-content" class="space-y-3.5 text-[15px] leading-7 text-fg-main">
				{@render body()}
			</div>
		{/if}
	</div>
</article>
