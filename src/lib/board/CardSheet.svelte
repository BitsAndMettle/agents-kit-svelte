<!--
	@component
	One card in full, in a `Sheet`: the card's title names it, with its reference and status under
	the title, then what is known about it as a list, a question it waits on, your own content,
	and your actions at the foot. It opens and closes as a Sheet does.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { Props as SheetProps } from '../primitives/overlays/Sheet.svelte';
	import type { UiTone } from '../ui/styles';
	import type { CardFact, CardQuestion } from './types';

	export interface Props extends Omit<SheetProps, 'ref' | 'defaultOpen' | 'description' | 'header' | 'footer'> {
		/** A short reference under the title, such as an issue number. */
		reference?: string;
		/** The one line that says where the card stands, e.g. "Waiting for your approval". */
		status?: string;
		/** Colour meaning of the status. */
		tone?: UiTone;
		/** What is known about the card, in order. */
		facts?: CardFact[];
		/** A question the card waits on. Each of its options is a button. */
		question?: CardQuestion;
		/**
		 * Called with the option the person presses. Return a promise and the question waits for it,
		 * marked busy, and takes no other answer meanwhile. The sheet shows what it is given: stop
		 * passing `question` once it is answered. A rejection is yours to handle. Without `onAnswer`
		 * the options cannot be pressed, e.g. for someone who may only look.
		 */
		onAnswer?: (option: string) => unknown;
		/** Names the question. */
		questionLabel?: string;
		/** Buttons at the foot of the sheet. They are given a function that closes it. */
		actions?: Snippet<[close: () => void]>;
		/**
		 * Where focus goes when the sheet opens. By default that is what the sheet says, not its first
		 * control: a key pressed twice on a card must not answer its question or press an action.
		 */
		initialFocus?: SheetProps['initialFocus'];
	}
</script>

<script lang="ts">
	import { CircleHelp } from '@lucide/svelte';
	import { tick } from 'svelte';
	import Button from '../primitives/actions/Button.svelte';
	import Alert from '../primitives/display/Alert.svelte';
	import Badge from '../primitives/display/Badge.svelte';
	import Sheet from '../primitives/overlays/Sheet.svelte';

	/** What the sheet says: where focus starts, and where it goes when an answered question takes its buttons away. */
	let body = $state<HTMLElement>();

	let {
		open = $bindable(false),
		title,
		reference = '',
		status = '',
		tone = 'neutral',
		facts = [],
		question,
		onAnswer,
		questionLabel = 'Question',
		actions,
		initialFocus = () => body ?? null,
		children,
		...rest
	}: Props = $props();

	/** The option whose answer is on its way. */
	let answering = $state<string>();

	async function answer(option: string): Promise<void> {
		answering = option;
		try {
			await onAnswer?.(option);
		} finally {
			answering = undefined;
		}
		// An answered question goes, and the pressed button with it: focus stays in the sheet.
		await tick();
		if (document.activeElement === document.body) body?.focus();
	}
</script>

<Sheet {...rest} bind:open {title} {initialFocus} footer={actions}>
	{#snippet header()}
		{#if reference || status}
			<p class="m-0 mt-1.5 flex flex-wrap items-center gap-2">
				{#if reference}<span class="font-mono text-xs text-fg-light">{reference}</span>{/if}
				{#if status}<Badge {tone} dot size="lg">{status}</Badge>{/if}
			</p>
		{/if}
	{/snippet}
	<div bind:this={body} tabindex="-1" class="flex flex-col gap-4 outline-none">
		{#if facts.length}
			<dl class="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
				{#each facts as fact (fact.label)}
					<dt class="text-fg-light">{fact.label}</dt>
					<dd class="m-0 [overflow-wrap:anywhere]">
						{#if fact.tone}<Badge tone={fact.tone} dot>{@render value(fact)}</Badge>{:else}{@render value(fact)}{/if}
					</dd>
				{/each}
			</dl>
		{/if}
		{#if question}
			<Alert tone="accent" title={questionLabel} aria-busy={answering !== undefined}>
				{#snippet icon()}<CircleHelp />{/snippet}
				<p class="m-0 [overflow-wrap:anywhere] whitespace-pre-line">{question.text}</p>
				<!-- An option is a sentence as often as a word, so each is a full row that wraps. -->
				<ul class="m-0 mt-2.5 flex list-none flex-col gap-1.5 p-0">
					{#each question.options as option, index (index)}
						<li>
							<Button
								disabled={!onAnswer}
								loading={answering === option}
								softDisabled={answering !== undefined && answering !== option}
								onclick={() => answer(option)}
								class="h-auto min-h-8 w-full justify-start rounded-control py-1.5 text-left whitespace-normal"
							>
								{option}
							</Button>
						</li>
					{/each}
				</ul>
			</Alert>
		{/if}
		{@render children?.()}
	</div>
</Sheet>

{#snippet value(fact: CardFact)}
	{#if fact.href}<a href={fact.href} class="rounded-sm underline decoration-fg-light/50 underline-offset-4 hover:decoration-fg-main">{fact.value}</a>{:else}{fact.value}{/if}
{/snippet}
