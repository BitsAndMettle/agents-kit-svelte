<script lang="ts">
	import { cn } from '../ui/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { Sparkle } from '@lucide/svelte';
	import AgentActivity from '../agents/AgentActivity.svelte';
	import Markdown from '../agents/Markdown.svelte';
	import Message from '../agents/Message.svelte';
	import MessageScroller from '../agents/MessageScroller.svelte';
	import PresenceBanner from '../agents/PresenceBanner.svelte';
	import PromptInput from '../agents/PromptInput.svelte';
	import ThinkingShimmer from '../agents/ThinkingShimmer.svelte';
	import ToolResult from '../agents/ToolResult.svelte';
	import ChatWorkbenchDemo from './ChatWorkbenchDemo.svelte';
	import type {
		ChatWorkbenchConversation,
		ChatWorkbenchMessage,
		ChatWorkbenchStatus,
		PresenceState,
		PromptAttachment,
		PromptInputEffort,
		PromptInputOption
	} from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		/** Plays the built-in scripted session instead of your data (the docs site uses it). */
		demo?: boolean;
		/** Demo only: start in dark mode. */
		initialDark?: boolean;
		/** Demo only: a fixed 760px height instead of the viewport's. */
		embedded?: boolean;

		/** The conversation, oldest first. */
		messages?: ChatWorkbenchMessage[];
		/** The author shown on assistant and system messages without their own. */
		assistantName?: string;
		/** Shows a thinking line after the last message. */
		busy?: boolean;
		busyLabel?: string;

		title?: string;
		subtitle?: string;
		status?: ChatWorkbenchStatus;
		/** The title's heading level. */
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Your controls on the right of the header, given the kit's pill classes (44px tall on phones). */
		headerActions?: Snippet<[{ button: string; icon: string }]>;
		/** A reachability banner above the messages, drawn as `PresenceBanner`. */
		presence?: { state: PresenceState; subject: string; detail?: string; since?: string };
		/** Shown when there are no messages. */
		empty?: Snippet;
		/** Drawn at the end of each message, e.g. feedback or retry buttons. */
		messageFooter?: Snippet<[ChatWorkbenchMessage]>;
		/** Drawn after the last message, e.g. a decision that waits for the person. */
		trailing?: Snippet;

		/** Past conversations. Without them there is no list, sidebar or tabs. */
		conversations?: ChatWorkbenchConversation[];
		/** Shown in place of the list, e.g. while it loads or when it could not be read. */
		conversationsNotice?: string;
		onSelectConversation?: (id: string) => void;
		/** Shows a New conversation button. */
		onNewConversation?: () => void;
		/** Which view is on screen where they are tabs. Bindable. */
		view?: 'chat' | 'conversations';
		/** `auto`: conversations in a sidebar from 1024px, tabs below. `panel`: always tabs, for a narrow side panel. */
		layout?: 'auto' | 'panel';

		/** The composer's text. Bindable. */
		value?: string;
		placeholder?: string;
		/** Turns the composer off, e.g. while the agent is unreachable. */
		disabled?: boolean;
		/** Chips sent with the next message, e.g. a card. Bindable. */
		attachments?: PromptAttachment[];
		onRemoveAttachment?: (id: string) => void;
		/** Models for the composer's picker. No models, no picker. */
		models?: PromptInputOption[];
		/** The current model. Bindable. */
		model?: string;
		/** Effort levels shown as a row in the same picker. */
		efforts?: PromptInputEffort[];
		/** The current effort. Bindable. */
		effort?: string;
		modelLabel?: string;
		onModelChange?: (choice: { model: string; effort: string | undefined }) => void;
		onSend?: (text: string, attachments: PromptAttachment[]) => void;
		/** Shows a Stop button while `busy`. */
		onStop?: () => void;
		class?: string;
	}

	let {
		demo = false,
		initialDark = false,
		embedded = false,
		messages = [],
		assistantName = 'Assistant',
		busy = false,
		busyLabel = 'Thinking…',
		title = '',
		subtitle = '',
		status,
		headingLevel = 2,
		headerActions,
		presence,
		empty,
		messageFooter,
		trailing,
		conversations,
		conversationsNotice = '',
		onSelectConversation,
		onNewConversation,
		view = $bindable('chat'),
		layout = 'auto',
		value = $bindable(''),
		placeholder = 'Message',
		disabled = false,
		attachments = $bindable([]),
		onRemoveAttachment,
		models = [],
		model = $bindable(),
		efforts = [],
		effort = $bindable(),
		modelLabel = 'Model',
		onModelChange,
		onSend,
		onStop,
		class: className = '',
		...rest
	}: Props = $props();

	const uid = $props.id();
	const TABS = [
		{ id: 'chat', label: 'Chat' },
		{ id: 'conversations', label: 'Conversations' }
	] as const;
	const TONES = {
		success: 'bg-status-success',
		warning: 'bg-status-warning',
		danger: 'bg-status-danger',
		info: 'bg-status-info',
		neutral: 'bg-fg-light'
	} as const;
	// Phone-sized controls are 44px tall.
	const actionClasses = {
		button: pillClass('secondary', 'sm', 'max-sm:h-11'),
		icon: pillClass('secondary', 'icon-sm', 'max-sm:size-11')
	};

	let hasList = $derived(conversations !== undefined);
	let tabsClass = $derived(layout === 'panel' ? '' : 'lg:hidden');
	let sidebar = $derived(hasList && layout === 'auto');
	let streaming = $derived(busy || messages.some((message) => message.status === 'streaming'));

	function send(text: string): void {
		view = 'chat';
		onSend?.(text, attachments);
	}

	function chooseModel(next: string): void {
		model = next;
		onModelChange?.({ model: next, effort });
	}

	function chooseEffort(next: string): void {
		effort = next;
		onModelChange?.({ model: model ?? '', effort: next });
	}

	function openConversation(id: string): void {
		view = 'chat';
		onSelectConversation?.(id);
	}

	function startNew(): void {
		view = 'chat';
		onNewConversation?.();
	}
</script>

{#if demo}
	<ChatWorkbenchDemo {...rest} {initialDark} {embedded} class={cn(className)} />
{:else}
	<section {...rest}
		aria-label={rest['aria-label'] ?? (title || 'Chat')}
		data-layout={layout}
		class={cn('flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-chat-surface text-fg-main', className)}
	>
		<header class="shrink-0 border-b border-chat-border/70 bg-chat-surface px-4 pt-3 sm:px-6 {hasList && layout === 'auto' ? 'lg:pb-3' : hasList ? '' : 'pb-3'}">
			<div class="flex items-start justify-between gap-3">
				<div class="flex min-w-0 items-center gap-3">
					<span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-chat-accent-subtle text-chat-accent">
						<Sparkle class="size-4 fill-current" />
					</span>
					<div class="min-w-0">
						{#if title}
							<svelte:element this={`h${headingLevel}`} class="truncate text-[15px] font-semibold text-fg-main">{title}</svelte:element>
						{/if}
						{#if status || subtitle}
							<p class="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-fg-light">
								{#if status}
									<span aria-hidden="true" class="size-1.5 shrink-0 rounded-full {TONES[status.tone ?? 'neutral']} {status.pulse ? 'ak-breathe' : ''}"></span>
								{/if}
								<span class="truncate">
									{#if subtitle}<span class="text-fg-main">{subtitle}</span>{#if status}{' · '}{/if}{/if}{#if status}{status.text}{/if}
								</span>
							</p>
						{/if}
					</div>
				</div>
				{#if headerActions}
					<div class="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{@render headerActions(actionClasses)}</div>
				{/if}
			</div>

			{#if hasList}
				<div class="-mb-px mt-2.5 flex items-center gap-1 {tabsClass}">
					<div role="tablist" aria-label="{title || 'Chat'} views" class="flex gap-1 overflow-x-auto [scrollbar-width:none]">
						{#each TABS as tab (tab.id)}
							<button
								type="button"
								role="tab"
								id="{uid}-tab-{tab.id}"
								aria-selected={view === tab.id}
								aria-controls="{uid}-{tab.id}"
								tabindex={view === tab.id ? 0 : -1}
								onclick={() => (view = tab.id)}
								onkeydown={(event) => {
									if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
									event.preventDefault();
									view = view === 'chat' ? 'conversations' : 'chat';
									document.getElementById(`${uid}-tab-${view}`)?.focus();
								}}
								class="inline-flex min-h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 pt-1 pb-2 text-[13px] font-medium transition-colors max-sm:min-h-11 {view === tab.id
									? 'border-chat-accent text-fg-main'
									: 'border-transparent text-fg-light hover:text-fg-main'}"
							>
								{tab.label}
								{#if tab.id === 'conversations' && conversations?.length}
									<span class="rounded-full bg-chat-user px-1.5 text-[11px] tabular-nums text-fg-light">{conversations.length}</span>
								{/if}
							</button>
						{/each}
					</div>
					{#if onNewConversation}
						<button type="button" class="{pillClass('ghost', 'sm', 'max-sm:h-11')} mb-1.5 ml-auto" onclick={startNew}>New conversation</button>
					{/if}
				</div>
			{/if}
		</header>

		<div class="flex min-h-0 flex-1 overflow-hidden">
			{#if sidebar}
				<aside aria-label="Conversations" class="hidden min-h-0 w-60 shrink-0 flex-col gap-2 overflow-y-auto border-r border-chat-border/70 bg-chat-user/30 p-3.5 lg:flex">
					<div class="flex items-center justify-between gap-2 px-1">
						<h2 class="text-[11px] font-medium text-fg-light">Conversations</h2>
						{#if onNewConversation}
							<button type="button" class={pillClass('ghost', 'xs')} onclick={startNew}>New conversation</button>
						{/if}
					</div>
					{@render list()}
				</aside>
			{/if}

			<div class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-surface">
				{#if hasList && view === 'conversations'}
					<div id="{uid}-conversations" role="tabpanel" aria-labelledby="{uid}-tab-conversations" class="flex-1 overflow-y-auto p-4 sm:p-6 {tabsClass}">
						{@render list()}
					</div>
				{/if}

				<div
					id="{uid}-chat"
					role={hasList ? 'tabpanel' : undefined}
					aria-labelledby={hasList ? `${uid}-tab-chat` : undefined}
					class="min-h-0 flex-1 flex-col {hasList && view === 'conversations' ? (layout === 'auto' ? 'hidden lg:flex' : 'hidden') : 'flex'}"
				>
					<MessageScroller navigation="none" followOutput {streaming} {busy} label={title ? `${title} conversation` : 'Conversation'} contentClass="pb-10">
						{#if presence}
							<PresenceBanner state={presence.state} subject={presence.subject} detail={presence.detail} since={presence.since} />
						{/if}
						{#if messages.length === 0}
							{#if empty}{@render empty()}{:else}<p class="text-center text-[13px] text-fg-light">No messages yet.</p>{/if}
						{/if}
						{#each messages as message (message.id)}
							<Message
								id={message.id}
								role={message.role}
								author={message.author ?? (message.role === 'user' ? 'You' : assistantName)}
								badge={message.badge}
								timestamp={message.timestamp}
								data-status={message.status}
								aria-busy={message.status === 'streaming' ? 'true' : undefined}
							>
								{#each message.parts ?? [] as part, index (index)}
									{#if part.type === 'text'}
										<Markdown text={part.text} />
									{:else if part.type === 'tool'}
										<ToolResult tool={part.tool} summary={part.summary} output={part.output ?? ''} status={part.status} meta={part.meta} defaultOpen={Boolean(part.output)} />
									{:else if part.type === 'activity'}
										<AgentActivity items={part.items} status={part.status} />
									{:else}
										<p class="text-xs leading-5 text-fg-light">{part.text}</p>
									{/if}
								{/each}
								{#if message.text}
									<Markdown text={message.text} streaming={message.status === 'streaming'} />
								{:else if message.status === 'streaming'}
									<ThinkingShimmer spark label={message.statusText ?? 'Thinking…'} />
								{/if}
								{#if message.status === 'error'}
									<p class="text-[13px] text-status-danger">{message.statusText ?? 'Something went wrong.'}</p>
								{/if}
								{@render messageFooter?.(message)}
							</Message>
						{/each}
						{@render trailing?.()}
						{#if busy}
							<ThinkingShimmer spark label={busyLabel} />
						{/if}
					</MessageScroller>

					<div class="relative shrink-0 px-4 pt-1 pb-4 sm:px-8">
						<div aria-hidden="true" class="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-chat-surface to-transparent"></div>
						<PromptInput
							class="mx-auto max-w-3xl"
							bind:value
							bind:attachments
							{onRemoveAttachment}
							{placeholder}
							{disabled}
							{busy}
							{onStop}
							agents={models}
							selectedAgentId={model}
							pickerLabel={modelLabel}
							{efforts}
							selectedEffort={effort}
							onAgentChange={chooseModel}
							onEffortChange={chooseEffort}
							onSubmit={send}
						/>
					</div>
				</div>
			</div>
		</div>
	</section>
{/if}

{#snippet list()}
	<nav class="min-w-0" aria-label="Past conversations">
		{#if conversationsNotice}
			<p role="status" class="px-1 text-[13px] text-fg-light">{conversationsNotice}</p>
		{:else if !conversations?.length}
			<p role="status" class="px-1 text-[13px] text-fg-light">No conversations yet.</p>
		{:else}
			<ul class="space-y-0.5 text-[13px]">
				{#each conversations as row (row.id)}
					<li>
						<button
							type="button"
							aria-current={row.active ? 'true' : undefined}
							onclick={() => openConversation(row.id)}
							class="flex min-h-11 w-full min-w-0 flex-col items-start justify-center rounded-xl px-3 py-1.5 text-left transition-colors {row.active
								? 'bg-card-bg font-medium text-fg-main ak-shadow-soft-sm'
								: 'text-fg-light hover:bg-chat-user/60 hover:text-fg-main'}"
						>
							<span class="w-full truncate">{row.title}</span>
							{#if row.date || row.subtitle}
								<span class="text-[11px] font-normal text-fg-light">{[row.date, row.subtitle].filter(Boolean).join(' · ')}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>
{/snippet}
