<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import CodeBlock from './CodeBlock.svelte';
	import { parseMarkdown, type MarkdownInline } from './markdown';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'children'> {
		/** Markdown source, e.g. a model reply. Rendered as elements only: raw HTML stays text, links need an http(s) or mailto address. */
		text: string;
		/** Whether the text is still arriving; passed to fenced code blocks. */
		streaming?: boolean;
		class?: string;
	}

	let { text, streaming = false, class: className = '', ...rest }: Props = $props();

	let blocks = $derived(parseMarkdown(text));
</script>

{#snippet inline(pieces: MarkdownInline[])}
	{#each pieces as piece, index (index)}
		{#if piece.kind === 'strong'}<strong class="font-semibold">{piece.text}</strong>
		{:else if piece.kind === 'em'}<em>{piece.text}</em>
		{:else if piece.kind === 'code'}<code class="rounded-md bg-chat-user px-1.5 py-0.5 font-mono text-[13px] [overflow-wrap:anywhere]">{piece.text}</code>
		{:else if piece.kind === 'link'}<a class="font-medium text-fg-main underline decoration-chat-accent decoration-2 underline-offset-2 hover:decoration-fg-main" href={piece.href} target="_blank" rel="noopener noreferrer nofollow">{piece.text}</a>
		{:else}{piece.text}{/if}
	{/each}
{/snippet}

<div {...rest} data-slot="markdown" class={cn('min-w-0 space-y-3 [overflow-wrap:anywhere]', className)}>
	{#each blocks as block, index (index)}
		{#if block.kind === 'heading'}
			<p class="font-semibold text-fg-main">{@render inline(block.inlines)}</p>
		{:else if block.kind === 'ul'}
			<ul class="list-disc space-y-1 pl-5 marker:text-fg-light">
				{#each block.items as item, at (at)}<li>{@render inline(item)}</li>{/each}
			</ul>
		{:else if block.kind === 'ol'}
			<ol class="list-decimal space-y-1 pl-5 marker:text-fg-light">
				{#each block.items as item, at (at)}<li>{@render inline(item)}</li>{/each}
			</ol>
		{:else if block.kind === 'quote'}
			<blockquote class="border-l-2 border-chat-border pl-3 whitespace-pre-line text-fg-light">{@render inline(block.inlines)}</blockquote>
		{:else if block.kind === 'code'}
			<CodeBlock
				code={block.text}
				language={block.language || 'text'}
				showLineNumbers={false}
				status={streaming && index === blocks.length - 1 ? 'streaming' : 'complete'}
			/>
		{:else if block.kind === 'p'}
			<p class="whitespace-pre-line">{@render inline(block.inlines)}</p>
		{/if}
	{/each}
</div>
