<script lang="ts">
	import { cn } from '../ui/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { pillClass } from '../ui/styles';
	import { Pin, Plus, Sparkle } from '@lucide/svelte';
	import { AVATAR_TINTS, toneIndexFromName } from '../primitives/display/helpers';
	import AgentActivity from '../agents/AgentActivity.svelte';
	import Markdown from '../agents/Markdown.svelte';
	import Message from '../agents/Message.svelte';
	import MessageScroller from '../agents/MessageScroller.svelte';
	import PresenceBanner from '../agents/PresenceBanner.svelte';
	import PromptInput from '../agents/PromptInput.svelte';
	import ThinkingShimmer from '../agents/ThinkingShimmer.svelte';
	import ToolResult from '../agents/ToolResult.svelte';
	import type {
		ChatWorkbenchConversation,
		ChatWorkbenchMessage,
		ChatWorkbenchStatus,
		PresenceState,
		PromptAttachment,
		PromptCommand,
		PromptContextOption,
		PromptInputEffort,
		PromptInputOption
	} from '../types';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'class' | 'children' | 'title'> {
		/** Plays the built-in scripted session instead of your data (the docs site uses it). Loaded on demand, so it renders in the browser only. */
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
		/** Draws the sparkle mark before the title. */
		headerMark?: boolean;
		/** Your controls on the right of the header, given the kit's pill classes (44px tall on phones). */
		headerActions?: Snippet<[{ button: string; icon: string }]>;
		/** A reachability banner above the messages, drawn as `PresenceBanner`. */
		presence?: { state: PresenceState; subject: string; detail?: string; since?: string };
		/** Shown when there are no messages. */
		empty?: Snippet;
		/**
		 * Drawn at the end of each message, e.g. feedback or retry buttons. Given the kit's classes for a row of quiet
		 * text actions (`actions`, each `action`) and a row of suggestion chips (`chips`, each `chip`), 44px on touch.
		 */
		messageFooter?: Snippet<[ChatWorkbenchMessage, { actions: string; action: string; chips: string; chip: string }]>;
		/** Drawn after the last message, e.g. a decision that waits for the person. */
		trailing?: Snippet;
		/** A rail on the right from 1024px, drawn as the conversations sidebar is, e.g. what needs the person at a glance. Not in `panel` layout. */
		aside?: Snippet;
		/** The rail's accessible name. */
		asideLabel?: string;

		/** Past conversations. Without them there is no list, sidebar or tabs. */
		conversations?: ChatWorkbenchConversation[];
		/** Shown in place of the list, e.g. while it loads or when it could not be read. */
		conversationsNotice?: string;
		onSelectConversation?: (id: string) => void;
		/** Shows a New conversation button. */
		onNewConversation?: () => void;
		/** The New conversation button's text. */
		newConversationLabel?: string;
		/**
		 * A search field over the list, named and captioned by this, e.g. `Search`. Typing narrows the rows to those
		 * whose title holds it. Without it there is no field.
		 */
		searchLabel?: string;
		/** Which view is on screen where they are tabs. Bindable. */
		view?: 'chat' | 'conversations';
		/** `auto`: conversations in a sidebar from 1024px, tabs below. `panel`: always tabs, for a narrow side panel. */
		layout?: 'auto' | 'panel';
		/**
		 * `quiet`: no header band from 1024px (it keeps only the phone's tabs), the title, status and actions as one line atop the chat column,
		 * rows with one leading slot and 32px pitch for a mouse, `empty` above the composer and a compact composer. `headerMark` is ignored.
		 * `studio`: quiet at the Studio design's measure. Rails of 260px and 300px, 34px rows with a 6px dot, a title line that
		 * wraps with the status at its end, a 720px log over a 656px composer, and `plain` messages.
		 */
		chrome?: 'full' | 'quiet' | 'studio';

		/** The composer's text. Bindable. */
		value?: string;
		placeholder?: string;
		/** Turns the composer off, e.g. while the agent is unreachable. */
		disabled?: boolean;
		/** Chips sent with the next message, e.g. a card. Bindable. */
		attachments?: PromptAttachment[];
		onRemoveAttachment?: (id: string) => void;
		/** Entries of the composer's `+` menu, each attaching a chip. */
		contextOptions?: PromptContextOption[];
		/** The composer's `/` menu: typing `/` lists them, choosing one puts its text in the field. */
		commands?: PromptCommand[];
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
		headerMark = true,
		headerActions,
		presence,
		empty,
		messageFooter,
		trailing,
		aside,
		asideLabel = 'At a glance',
		conversations,
		conversationsNotice = '',
		onSelectConversation,
		onNewConversation,
		newConversationLabel = 'New conversation',
		searchLabel = '',
		view = $bindable('chat'),
		layout = 'auto',
		chrome = 'full',
		value = $bindable(''),
		placeholder = 'Message',
		disabled = false,
		attachments = $bindable([]),
		onRemoveAttachment,
		contextOptions,
		commands,
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
		neutral: 'bg-fg-light',
		accent: 'bg-accent-primary'
	} as const;
	const RAIL = 'hidden min-h-0 w-60 shrink-0 flex-col gap-2 overflow-y-auto bg-canvas-secondary p-3.5 lg:flex';
	const ROW = 'flex min-h-11 w-full min-w-0 rounded-xl px-3 py-1.5 text-left transition-colors';
	const IDLE = 'text-fg-light hover:bg-card-bg hover:text-fg-main';
	// Quiet: no gaps and 32px day labels, so with a mouse (32px rows) every pitch in the sidebar is 32px.
	const QUIET_RAIL = 'hidden min-h-0 w-60 shrink-0 flex-col overflow-y-auto bg-canvas-secondary p-2 lg:flex';
	const QUIET_IDLE = 'text-fg-main hover:bg-card-bg';
	// Studio: rails of 260px (20px/14px, 18px gaps) and 300px (24px/18px, 28px gaps); 34px rows, 1px apart.
	const STUDIO_RAIL = 'hidden min-h-0 w-65 shrink-0 flex-col gap-4.5 overflow-y-auto bg-canvas-secondary px-3.5 py-5 lg:flex';
	const STUDIO_ASIDE = 'hidden min-h-0 w-75 shrink-0 flex-col gap-7 overflow-y-auto bg-canvas-secondary px-4.5 py-6 lg:flex';
	const STUDIO_ROW = 'flex min-h-11 w-full min-w-0 rounded-control px-2.5 py-2 text-left text-sm leading-[18px] transition-colors';
	const STUDIO_IDLE = 'text-fg-light hover:bg-card-bg hover:text-fg-main';
	// 44px and 16px text on touch and below 640px (iOS zooms a smaller field), as PromptInput.
	const SEARCH = 'h-11 w-full min-w-0 shrink-0 rounded-control bg-canvas-border px-3 text-base text-fg-main placeholder:text-fg-light pointer-fine:h-[35px] sm:pointer-fine:text-[13px]';
	// Given to `messageFooter`: quiet text actions (21px with a mouse) and suggestion chips, 44px on touch.
	const FOOTER = {
		actions: 'flex flex-wrap items-center gap-x-4.5 gap-y-1 text-[13px] leading-[1.3] text-fg-light',
		action: 'inline-flex min-h-11 items-center transition-colors hover:text-fg-main pointer-fine:min-h-0 pointer-fine:py-0.5',
		chips: 'flex flex-wrap gap-2',
		chip: 'inline-flex min-h-11 items-center rounded-full border border-chat-border px-3 text-[13px] leading-[1.3] text-fg-light transition-colors hover:bg-chat-user hover:text-fg-main pointer-fine:min-h-[29px]'
	};
	// Phone-sized controls are 44px tall.
	const actionClasses = {
		button: pillClass('secondary', 'sm', 'max-sm:h-11'),
		icon: pillClass('secondary', 'icon-sm', 'max-sm:size-11')
	};

	let studio = $derived(chrome === 'studio');
	// Studio is quiet's structure at the Studio design's measure.
	let quiet = $derived(chrome !== 'full');
	let marked = $derived(conversations?.some((row) => row.mark) ?? false);
	let query = $state('');
	let needle = $derived(query.trim().toLocaleLowerCase());
	let rows = $derived(needle ? (conversations ?? []).filter((row) => row.title.toLocaleLowerCase().includes(needle)) : (conversations ?? []));
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
	<!-- Loaded on demand: an app that never sets `demo` does not download it. -->
	{#await import('./ChatWorkbenchDemo.svelte') then { default: ChatWorkbenchDemo }}
		<ChatWorkbenchDemo {...rest} {initialDark} {embedded} class={cn(className)} />
	{/await}
{:else}
	<section {...rest}
		aria-label={rest['aria-label'] ?? (title || 'Chat')}
		data-layout={layout}
		class={cn('flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-chat-surface text-fg-main', className)}
	>
		{#if quiet}
			{#if hasList}
				<header class="shrink-0 bg-chat-surface px-4 pt-1.5 sm:px-6 {tabsClass}">{@render tabs('flex items-center gap-1')}</header>
			{/if}
		{:else}
			<header class="shrink-0 bg-chat-surface px-4 pt-3 sm:px-6 {hasList && layout === 'auto' ? 'lg:pb-3' : hasList ? '' : 'pb-3'}">
				<div class="flex items-start justify-between gap-3">
					<div class="flex min-w-0 items-center gap-3">
						{#if headerMark}
							<span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-chat-accent-subtle text-chat-accent">
								<Sparkle class="size-4 fill-current" />
							</span>
						{/if}
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

				{#if hasList}{@render tabs(`mt-2.5 flex items-center gap-1 ${tabsClass}`)}{/if}
			</header>
		{/if}

		<div class="flex min-h-0 flex-1 overflow-hidden">
			{#if sidebar}
				<aside aria-label="Conversations" class={studio ? STUDIO_RAIL : quiet ? QUIET_RAIL : RAIL}>
					{#if onNewConversation}
						{#if studio}
							<button type="button" class="{STUDIO_ROW} items-center gap-2.5 text-fg-main hover:bg-card-bg pointer-fine:min-h-10" onclick={startNew}>
								<Plus aria-hidden="true" class="size-4 text-fg-light" strokeWidth={1.8} />{newConversationLabel}
							</button>
						{:else}
							<button type="button" class="{ROW} {quiet ? 'pointer-fine:min-h-8 ' : ''}items-center gap-2 text-[13px] font-medium {quiet ? QUIET_IDLE : IDLE}" onclick={startNew}>
								<Plus aria-hidden="true" class="size-3.5" />{newConversationLabel}
							</button>
						{/if}
					{/if}
					{@render search(quiet && !studio ? 'my-1' : '')}{@render list(true)}
				</aside>
			{/if}

			<div class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-chat-surface">
				{#if hasList && view === 'conversations'}
					<div id="{uid}-conversations" role="tabpanel" aria-labelledby="{uid}-tab-conversations" class="flex-1 overflow-y-auto p-4 sm:p-6 {tabsClass}">
						{@render search('mb-2')}{@render list(false)}
					</div>
				{/if}

				<div
					id="{uid}-chat"
					role={hasList ? 'tabpanel' : undefined}
					aria-labelledby={hasList ? `${uid}-tab-chat` : undefined}
					class="min-h-0 flex-1 flex-col {hasList && view === 'conversations' ? (layout === 'auto' ? 'hidden lg:flex' : 'hidden') : 'flex'}"
				>
					{#if studio && (title || subtitle || status || headerActions)}
						<!-- The Studio line wraps: on a narrow column a long title puts the status under it, at the line's end. -->
						<div class="mx-auto flex w-full max-w-[45rem] shrink-0 flex-wrap items-baseline gap-2.5 px-5 pt-5.5 pb-1.5 sm:px-8">
							{#if title}
								<svelte:element this={`h${headingLevel}`} class="max-w-full shrink-0 truncate text-[15px] font-medium text-fg-main">{title}</svelte:element>
							{/if}
							{#if subtitle}<p class="min-w-0 truncate text-[13px] text-fg-light">{subtitle}</p>{/if}
							{#if status}
								<p class="ml-auto min-w-0 truncate text-[13px] text-fg-light"><span aria-hidden="true" class="mr-2 inline-block size-1.5 rounded-full align-middle {TONES[status.tone ?? 'neutral']} {status.pulse ? 'ak-breathe' : ''}"></span>{status.text}</p>
							{/if}
							{#if headerActions}
								<div class="{status ? '' : 'ml-auto '}flex min-w-0 items-center gap-1.5 *:shrink">{@render headerActions(actionClasses)}</div>
							{/if}
						</div>
					{:else if quiet && (title || subtitle || status || headerActions)}
						<!-- One line at the message text's inset. The title keeps its room; the status truncates first, then the actions give way:
						     each may shrink, and one with `min-w-0` and its text in a `truncate` span cuts that text short. -->
						<div class="mx-auto flex w-full max-w-3xl shrink-0 items-baseline gap-2 px-5 pt-4 sm:px-8">
							{#if title}
								<svelte:element this={`h${headingLevel}`} class="max-w-full shrink-0 truncate text-[15px] font-semibold text-fg-main">{title}</svelte:element>
							{/if}
							{#if status || subtitle}
								<p class="min-w-0 flex-1 truncate text-xs text-fg-light">
									{#if status}
										<span aria-hidden="true" class="mr-1 inline-block size-1.5 rounded-full align-middle {TONES[status.tone ?? 'neutral']} {status.pulse ? 'ak-breathe' : ''}"></span>
									{/if}
									{#if subtitle}<span class="text-fg-main">{subtitle}</span>{#if status}{' · '}{/if}{/if}{#if status}{status.text}{/if}
								</p>
							{/if}
							{#if headerActions}
								<div class="ml-auto flex min-w-0 items-center gap-1.5 *:shrink">{@render headerActions(actionClasses)}</div>
							{/if}
						</div>
					{/if}
					<MessageScroller navigation="none" followOutput {streaming} {busy} label={title ? `${title} conversation` : 'Conversation'} contentClass={studio ? 'max-w-[45rem] space-y-9 pb-10' : 'pb-10'}>
						{#if presence}
							<PresenceBanner state={presence.state} subject={presence.subject} detail={presence.detail} since={presence.since} />
						{/if}
						{#if messages.length === 0 && !(quiet && empty)}
							{#if empty}{@render empty()}{:else}<p class="text-center text-[13px] text-fg-light">No messages yet.</p>{/if}
						{/if}
						{#each messages as message (message.id)}
							<Message
								id={message.id}
								role={message.role}
								author={message.author ?? (message.role === 'user' ? 'You' : assistantName)}
								badge={message.badge}
								timestamp={message.timestamp}
								plain={studio}
								data-status={message.status}
								aria-busy={message.status === 'streaming' ? 'true' : undefined}
							>
								{#each message.parts ?? [] as part, index (index)}
									{#if part.type === 'text'}
										<Markdown text={part.text} />
									{:else if part.type === 'tool'}
										<ToolResult tool={part.tool} summary={part.summary} output={part.output} status={part.status} meta={part.meta} defaultOpen={Boolean(part.output)} />
									{:else if part.type === 'activity'}
										<AgentActivity items={part.items} status={part.status} />
									{:else}
										<p class="text-xs leading-5 text-fg-light">{part.text}</p>
									{/if}
								{/each}
								{#if message.text}
									<Markdown text={message.text} streaming={message.status === 'streaming'} />
								{:else if message.status === 'streaming'}
									<ThinkingShimmer spark={!studio} label={message.statusText ?? 'Thinking…'} />
								{/if}
								{#if message.status === 'error'}
									<p class="text-[13px] text-status-danger">{message.statusText ?? 'Something went wrong.'}</p>
								{/if}
								{@render messageFooter?.(message, FOOTER)}
							</Message>
						{/each}
						{@render trailing?.()}
						{#if busy}
							<ThinkingShimmer spark={!studio} label={busyLabel} />
						{/if}
					</MessageScroller>

					<div class={studio ? 'relative shrink-0 px-4 pt-2 pb-5.5 sm:px-8' : 'relative shrink-0 px-4 pt-1 pb-4 sm:px-8'}>
						<div aria-hidden="true" class="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-chat-surface to-transparent"></div>
						{#if quiet && empty && messages.length === 0}
							<div class={studio ? 'mx-auto max-w-[41rem] pb-3' : 'mx-auto max-w-3xl pb-3'}>{@render empty()}</div>
						{/if}
						<PromptInput
							compact={quiet}
							class={studio ? 'mx-auto max-w-[41rem]' : 'mx-auto max-w-3xl'}
							bind:value
							bind:attachments
							{onRemoveAttachment}
							{contextOptions}
							{commands}
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

			{#if aside && layout === 'auto'}
				<aside aria-label={asideLabel} class={studio ? STUDIO_ASIDE : RAIL}>{@render aside()}</aside>
			{/if}
		</div>
	</section>
{/if}

{#snippet tabs(rowClass: string)}
	<div class={rowClass}>
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
			<button type="button" class="{pillClass('ghost', 'sm', 'max-sm:h-11')} mb-1.5 ml-auto" onclick={startNew}>{newConversationLabel}</button>
		{/if}
	</div>
{/snippet}

{#snippet lead(row: ChatWorkbenchConversation)}
	{#if row.pinned}
		<Pin role="img" aria-label="Pinned" class="size-3.5 shrink-0 text-fg-light" />
	{:else if row.mark}
		<!-- The chart colour of the bucket an Avatar of the same name is tinted with. -->
		<span role="img" aria-label={row.mark} title={row.mark} class="{studio ? 'size-1.5' : 'size-2'} shrink-0 rounded-full" style="background-color: var(--ak-chart-{toneIndexFromName(row.mark, AVATAR_TINTS.length) + 1})"></span>
	{:else if studio && marked}
		<!-- Studio: once any row has a mark, a row without one draws a neutral dot. -->
		<span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-fg-light/20"></span>
	{/if}
{/snippet}

{#snippet search(extra: string)}
	{#if searchLabel && conversations?.length && !conversationsNotice}
		<input type="search" aria-label={searchLabel} placeholder={searchLabel} bind:value={query} class="{SEARCH} {extra}" />
	{/if}
{/snippet}

<!-- `inSidebar`: quiet rows there are 32px with a mouse; the tab panel keeps 44px rows. -->
{#snippet list(inSidebar: boolean)}
	{@const tight = quiet && inSidebar}
	<nav class="min-w-0" aria-label="Past conversations">
		{#if conversationsNotice}
			<p role="status" class="px-1 text-[13px] text-fg-light">{conversationsNotice}</p>
		{:else if !conversations?.length}
			<p role="status" class="px-1 text-[13px] text-fg-light">No conversations yet.</p>
		{:else if !rows.length}
			<p role="status" class="px-1 text-[13px] text-fg-light">No matches.</p>
		{:else}
			<ul class={studio ? 'space-y-px text-sm' : `${tight ? '' : 'space-y-0.5 '}text-[13px]`}>
				{#each rows as row, index (row.id)}
					<li>
						{#if row.group && row.group !== rows[index - 1]?.group}
							<p class={studio && inSidebar ? 'flex h-9 items-end px-2.5 pb-1.5 text-xs text-fg-light' : tight ? 'flex h-8 items-end px-3 pb-1.5 text-xs text-fg-light' : `px-3 pb-1 ${quiet ? 'text-xs' : 'text-[11px] font-medium'} text-fg-light ${index ? 'pt-3' : ''}`}>{row.group}</p>
						{/if}
						<button
							type="button"
							aria-current={row.active ? 'true' : undefined}
							onclick={() => openConversation(row.id)}
							class={studio
								? `${STUDIO_ROW} ${inSidebar ? 'pointer-fine:min-h-8.5 ' : ''}flex-col justify-center ${row.active ? 'bg-card-bg text-fg-main' : STUDIO_IDLE}`
								: quiet
								? `${ROW} ${tight ? 'pointer-fine:min-h-8 ' : ''}flex-col justify-center ${row.active ? 'bg-card-bg font-medium text-fg-main' : QUIET_IDLE}`
								: `${ROW} flex-col justify-center ${row.active ? 'bg-card-bg font-medium text-fg-main ak-shadow-soft-sm' : IDLE}`}
						>
							<span class="flex w-full min-w-0 items-center {studio ? 'gap-2.5' : 'gap-2'}">
								{#if studio}
									<!-- One 6px slot on every row; a pin overflows it into the padding and gap, so every title keeps the edge. -->
									<span class="flex w-1.5 shrink-0 items-center justify-center">{@render lead(row)}</span>
								{:else if quiet}
									<!-- One 14px slot on every row, so all titles share one edge. -->
									<span class="flex size-3.5 shrink-0 items-center justify-center">{@render lead(row)}</span>
								{:else}
									{@render lead(row)}
								{/if}
								<span class="min-w-0 flex-1 truncate">{row.title}</span>
								{#if row.date}
									<span class="shrink-0 {quiet ? 'text-xs' : 'text-[11px]'} font-normal tabular-nums text-fg-light">{row.date}</span>
								{/if}
							</span>
							{#if row.subtitle && !row.mark}
								<span class="w-full truncate {studio ? 'pl-4 ' : quiet || row.pinned ? 'pl-5.5 ' : ''}{quiet ? 'text-xs' : 'text-[11px]'} font-normal text-fg-light">{row.subtitle}</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>
{/snippet}
