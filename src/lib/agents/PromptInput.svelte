<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { pillClass, SOFT } from '../ui/styles';
	import { fade } from 'svelte/transition';
	import { rise } from '../state/motion.svelte';
	import {
		ArrowUp,
		AtSign,
		Check,
		ChevronDown,
		FileIcon,
		GitBranch,
		Plus,
		Shield,
		Sparkle,
		Sparkles,
		Square,
		X
	} from '@lucide/svelte';
	import { isImeComposing } from '../state/chat-helpers';
	import type { PromptAttachment, PromptContextOption, PromptInputEffort, PromptInputOption, SupportedAgentId } from '../types';

	interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'value' | 'placeholder' | 'busy' | 'disabled' | 'agents' | 'selectedAgentId' | 'activeSkill' | 'onAgentChange' | 'onSubmit' | 'onStop' | 'onQuickContext'> {
		value?: string;
		placeholder?: string;
		busy?: boolean;
		/** Turns the text field and the send button off, e.g. while the other side is unreachable. */
		disabled?: boolean;
		/** The picker's options: agents, models, anything with a label. No options, no picker. */
		agents?: PromptInputOption[];
		selectedAgentId?: SupportedAgentId;
		/** The picker's heading and accessible name. */
		pickerLabel?: string;
		/** A second axis shown as a segmented row in the same picker, e.g. effort levels. */
		efforts?: PromptInputEffort[];
		selectedEffort?: string;
		onEffortChange?: (effortId: string) => void;
		/** A label shown beside the picker, e.g. the pinned skill. */
		activeSkill?: string;
		/** Chips attached to the next message. Bindable; without `onRemoveAttachment` the composer removes them itself. */
		attachments?: PromptAttachment[];
		onRemoveAttachment?: (id: string) => void;
		/** Entries of the `+` menu. No entries, no menu. */
		contextOptions?: PromptContextOption[];
		onAgentChange?: (agentId: SupportedAgentId) => void;
		onSubmit?: (prompt: string) => void;
		onStop?: () => void;
		onQuickContext?: (attachmentId: string) => void;
		class?: string;
	}

	let {
		value = $bindable(''),
		placeholder = 'Ask Claude Code or guide the current run…',
		busy = false,
		disabled = false,
		agents = [],
		selectedAgentId = '',
		pickerLabel = 'Run with',
		efforts = [],
		selectedEffort,
		onEffortChange,
		activeSkill = '',
		attachments = $bindable([]),
		onRemoveAttachment,
		contextOptions = [],
		onAgentChange,
		onSubmit,
		onStop,
		onQuickContext,
		class: className = '',
		...rest
	}: Props = $props();

	let menuOpen = $state(false);
	let agentMenuOpen = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
	let menuButton: HTMLButtonElement | undefined = $state();
	let pickerButton: HTMLButtonElement | undefined = $state();
	let canSend = $derived(value.trim().length > 0 && !disabled && !busy);
	let selectedAgent = $derived(agents.find((agentOpt) => agentOpt.id === selectedAgentId));
	let currentEffort = $derived(efforts.find((effort) => effort.id === selectedEffort));
	let pickerText = $derived(
		[selectedAgent?.label ?? 'Choose', currentEffort?.label].filter(Boolean).join(' · ')
	);

	const CHIP_ICONS = { worktree: GitBranch, skill: Sparkles, gate: Shield, file: FileIcon } as const;

	function chipIcon(kind: string | undefined) {
		return CHIP_ICONS[kind as keyof typeof CHIP_ICONS] ?? AtSign;
	}

	/** The line under an option: its own `detail`, else the agent version and sign-in state, else nothing. */
	function optionDetail(option: PromptInputOption): string {
		if (option.detail !== undefined) return option.detail;
		if (!option.version) return '';
		return `v${option.version.replace(/^v/, '')} · ${option.signedIn === false ? 'Not signed in' : 'Signed in'}`;
	}

	let ready = $state(false);

	$effect(() => {
		ready = true;
	});

	/**
	 * Submits the current prompt text when non-empty and resets the composer input.
	 */
	function submitPrompt(): void {
		const trimmed = value.trim();
		if (!trimmed || busy || disabled) return;
		value = '';
		onSubmit?.(trimmed);
	}

	/**
	 * Handles Enter-to-submit while guarding against active IME composition (`isComposing` / `keyCode === 229`).
	 *
	 * @param event - KeyboardEvent from the prompt textarea.
	 */
	function handleKeyDown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' || event.shiftKey) {
			return;
		}
		if (isImeComposing(event)) {
			return;
		}
		event.preventDefault();
		submitPrompt();
	}

	/** Attaches a `+` menu entry's chip and closes the menu. */
	function addContext(option: PromptContextOption): void {
		if (!attachments.some((item) => item.id === option.attachment.id)) {
			attachments = [...attachments, option.attachment];
		}
		menuOpen = false;
		onQuickContext?.(option.attachment.id);
	}

	/** Removes a chip: the host does it when it handles `onRemoveAttachment`, else the composer does. */
	function removeAttachment(id: string): void {
		if (onRemoveAttachment) onRemoveAttachment(id);
		else attachments = attachments.filter((item) => item.id !== id);
	}

	/**
	 * Selects an option from the picker and closes it.
	 *
	 * @param agentId - Option to run with.
	 */
	function pickAgent(agentId: SupportedAgentId): void {
		agentMenuOpen = false;
		if (agentId !== selectedAgentId) onAgentChange?.(agentId);
	}

	/**
	 * Arrow keys move between options.
	 *
	 * @param event - KeyboardEvent from the listbox.
	 */
	function handleAgentMenuKey(event: KeyboardEvent): void {
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		event.preventDefault();
		const options = Array.from(
			(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)')
		);
		const current = options.indexOf(document.activeElement as HTMLButtonElement);
		const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
		options[(next + options.length) % options.length]?.focus();
	}

	/** Arrow keys move the effort choice, as in any radio group. */
	function handleEffortKey(event: KeyboardEvent): void {
		const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
		if (!step || efforts.length === 0) return;
		event.preventDefault();
		const at = efforts.findIndex((effort) => effort.id === selectedEffort);
		const next = efforts[(at + step + efforts.length) % efforts.length]!;
		onEffortChange?.(next.id);
		(event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>(`[data-effort="${CSS.escape(next.id)}"]`)?.focus();
	}

	// Close either menu on an outside click or Escape.
	$effect(() => {
		if (!menuOpen && !agentMenuOpen) return;
		const onPointer = (event: PointerEvent) => {
			if (formEl && !formEl.contains(event.target as Node)) {
				menuOpen = false;
				agentMenuOpen = false;
			}
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			// Focus inside the closing menu goes back to the button that opened it.
			const back = formEl?.contains(document.activeElement) ? (agentMenuOpen ? pickerButton : menuButton) : undefined;
			menuOpen = false;
			agentMenuOpen = false;
			back?.focus();
		};
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<form {...rest}
	bind:this={formEl}
	onsubmit={(e) => {
		e.preventDefault();
		submitPrompt();
	}}
	data-busy={busy}
	class={cn('ak-soft-focus w-full rounded-composer border border-chat-border bg-card-bg px-3 pt-3 pb-2.5 focus-within:border-fg-light/35', className)}
>
	{#if attachments.length > 0}
		<div class="mb-1.5 flex flex-wrap items-center gap-1.5 px-1">
			{#each attachments as chip (chip.id)}
				{@const ChipIcon = chipIcon(chip.kind)}
				<span in:rise={{ y: 2 }} class="{SOFT.chip} max-w-full pr-1" title={chip.title}>
					<ChipIcon aria-hidden="true" class="text-fg-light" />
					<span class="truncate {chip.kind === 'file' || chip.kind === 'worktree' ? 'font-mono text-[11px]' : ''}">{chip.label}</span>
					<button
						type="button"
						aria-label="Remove {chip.label}"
						onclick={() => removeAttachment(chip.id)}
						class="inline-flex size-6 items-center justify-center rounded-full text-fg-light transition-colors hover:bg-fg-main/10 hover:text-fg-main sm:size-4"
					><X aria-hidden="true" class="size-3" /></button>
				</span>
			{/each}
		</div>
	{/if}

	<label class="block">
		<span class="sr-only">{placeholder}</span>
		<textarea
			rows={1}
			bind:value
			{placeholder}
			disabled={!ready || disabled}
			aria-label={placeholder}
			onkeydown={handleKeyDown}
			class="field-sizing-content max-h-60 min-h-10 w-full sm:min-h-12 resize-none bg-transparent px-1.5 py-1 text-[15px] leading-6 text-fg-main placeholder:text-fg-light/80 focus:outline-none disabled:opacity-50"
		></textarea>
	</label>

	<div class="mt-1 flex items-center justify-between gap-2">
		<div class="relative flex min-w-0 items-center gap-1">
			{#if contextOptions.length > 0}
				<button
					type="button"
					bind:this={menuButton}
					aria-label="Add context or skill"
					aria-expanded={menuOpen}
					onclick={() => {
						menuOpen = !menuOpen;
						agentMenuOpen = false;
					}}
					class={pillClass('secondary', 'icon')}
				>
					<Plus aria-hidden="true" class="transition-transform duration-200 {menuOpen ? 'rotate-45' : ''}" />
				</button>

				{#if menuOpen}
					<div
						role="menu"
						aria-label="Context attachments"
						transition:rise={{ y: 4, duration: 140 }}
						class="absolute bottom-11 left-0 z-20 w-64 rounded-soft border border-chat-border bg-card-bg p-1.5 ak-shadow-soft"
					>
						<p class="px-2.5 pt-1 pb-1.5 text-[11px] font-medium text-fg-light">Add to context</p>
						{#each contextOptions as option (option.attachment.id)}
							{@const OptionIcon = chipIcon(option.attachment.kind)}
							<button
								type="button"
								role="menuitem"
								onclick={() => addContext(option)}
								class="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-fg-main transition-colors hover:bg-chat-surface"
							>
								<OptionIcon aria-hidden="true" class="size-4 text-fg-light" />
								<span>{option.label}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/if}

			{#if agents.length > 0}
				<div class="relative min-w-0">
					<button
						type="button"
						bind:this={pickerButton}
						aria-label="{pickerLabel}: {pickerText}"
						aria-haspopup="listbox"
						aria-expanded={agentMenuOpen}
						onclick={() => {
							agentMenuOpen = !agentMenuOpen;
							menuOpen = false;
						}}
						class="inline-flex h-8 max-w-full min-w-0 items-center gap-1 rounded-full pr-2.5 pl-3 text-[13px] transition-colors hover:bg-chat-user/70 hover:text-fg-main {agentMenuOpen
							? 'bg-chat-user/70 text-fg-main'
							: 'text-fg-light'}"
					>
						<span class="truncate">{pickerText}</span>
						{#if selectedAgent?.version && !currentEffort}
							<span class="hidden text-fg-light/70 sm:inline">{selectedAgent.version}</span>
						{/if}
						<ChevronDown
							aria-hidden="true"
							class="size-3.5 transition-transform duration-200 {agentMenuOpen ? 'rotate-180' : ''}"
						/>
					</button>

					{#if agentMenuOpen}
						<div
							transition:rise={{ y: 4, duration: 140 }}
							class="absolute bottom-11 left-0 z-20 w-64 rounded-soft border border-chat-border bg-card-bg p-1.5 ak-shadow-soft"
						>
							<p class="px-2.5 pt-1 pb-1.5 text-[11px] font-medium text-fg-light">{pickerLabel}</p>
							<div role="listbox" tabindex="-1" aria-label={pickerLabel} onkeydown={handleAgentMenuKey}>
								{#each agents as agentOpt (agentOpt.id)}
									{@const isSelected = agentOpt.id === selectedAgentId}
									{@const detail = optionDetail(agentOpt)}
									<button
										type="button"
										role="option"
										aria-selected={isSelected}
										disabled={agentOpt.signedIn === false}
										onclick={() => pickAgent(agentOpt.id)}
										class="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-chat-surface focus-visible:bg-chat-surface disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent {isSelected
											? 'bg-chat-surface'
											: ''}"
									>
										<span
											class="inline-flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5 {isSelected
												? 'bg-chat-accent-subtle text-chat-accent'
												: 'bg-chat-user text-fg-light'}"
										>
											<Sparkle aria-hidden="true" class={isSelected ? 'fill-current' : ''} />
										</span>
										<span class="min-w-0 flex-1">
											<span class="block truncate text-[13px] font-medium text-fg-main">{agentOpt.label}</span>
											{#if detail}
												<span class="block text-[11px] text-fg-light">{detail}</span>
											{/if}
										</span>
										{#if isSelected}
											<Check aria-hidden="true" class="size-4 shrink-0 text-chat-accent" />
										{/if}
									</button>
								{/each}
							</div>
							{#if efforts.length > 0}
								<p aria-hidden="true" class="px-2.5 pt-2 pb-1.5 text-[11px] font-medium text-fg-light">Effort</p>
								<div
									role="radiogroup"
									aria-label="Effort"
									tabindex="-1"
									onkeydown={handleEffortKey}
									class="mx-1 mb-1 flex gap-0.5 rounded-full bg-chat-user p-0.5"
								>
									{#each efforts as effort (effort.id)}
										{@const checked = effort.id === selectedEffort}
										<button
											type="button"
											role="radio"
											aria-checked={checked}
											data-effort={effort.id}
											tabindex={checked || (!currentEffort && effort === efforts[0]) ? 0 : -1}
											onclick={() => onEffortChange?.(effort.id)}
											class="min-h-8 flex-1 rounded-full px-1.5 text-[12px] font-medium transition-colors {checked
												? 'bg-card-bg text-fg-main ak-shadow-soft-sm'
												: 'text-fg-light hover:text-fg-main'}"
										>{effort.label}</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if activeSkill}
				<span class="hidden h-7 items-center gap-1.5 rounded-full px-2.5 text-xs text-fg-light sm:inline-flex">
					<Sparkles aria-hidden="true" class="size-3.5 text-chat-accent" />
					{activeSkill}
				</span>
			{/if}
		</div>

		<div class="flex shrink-0 items-center gap-2">
			{#if busy && onStop}
				<button
					in:fade={{ duration: 120 }}
					type="button"
					onclick={onStop}
					aria-label="Stop run"
					class={pillClass('primary', 'icon')}
				>
					<Square aria-hidden="true" class="size-3 fill-current" />
				</button>
			{:else}
				<button
					type="submit"
					disabled={!canSend}
					aria-label="Send prompt"
					class="inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200 {canSend
						? 'bg-chat-accent text-white hover:bg-chat-accent/90'
						: 'bg-chat-user text-fg-light'}"
				>
					<ArrowUp aria-hidden="true" class="size-4" strokeWidth={2.25} />
				</button>
			{/if}
		</div>
	</div>
</form>
