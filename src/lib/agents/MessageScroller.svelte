<script lang="ts">
	import { cn } from '../ui/cn';
	import type { HTMLAttributes } from 'svelte/elements';
	import { rise } from '../state/motion.svelte';
	import { pillClass } from '../ui/styles';
	import { ArrowDown } from '@lucide/svelte';
	import { untrack, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	export interface RailItem {
		id: string;
		label: string;
		description?: string;
		role?: 'user' | 'assistant' | 'system';
	}

	interface ResolvedRailItem {
		id: string;
		label: string;
		description?: string;
		role: 'user' | 'assistant' | 'system';
		ariaLabel: string;
	}

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'class' | 'items' | 'navigation' | 'followOutput' | 'followThreshold' | 'smooth' | 'streaming' | 'busy' | 'label' | 'navigationLabel' | 'onFollowChange' | 'viewportClass' | 'contentClass' | 'children'> {
		items?: RailItem[];
		navigation?: 'rail' | 'none';
		followOutput?: boolean;
		followThreshold?: number;
		smooth?: boolean;
		streaming?: boolean;
		busy?: boolean;
		label?: string;
		navigationLabel?: string;
		onFollowChange?: (following: boolean) => void;
		viewportClass?: string;
		contentClass?: string;
		class?: string;
		children: Snippet;
	}

	/** Maximum character length for a rail preview title before word-boundary truncation. */
	const PREVIEW_TITLE_LENGTH = 56;
	/** Maximum character length for a rail preview description before word-boundary truncation. */
	const PREVIEW_DESCRIPTION_LENGTH = 88;
	/** Default pixel distance from the bottom edge that still counts as pinned to live output. */
	const DEFAULT_FOLLOW_THRESHOLD_PX = 56;
	/** Duration in ms to suppress scroll-listener unpinning during a programmatic smooth scroll. */
	const PROGRAMMATIC_SCROLL_LOCK_MS = 320;
	/** Height in px of each interactive tick slot along the right-hand preview rail. */
	const RAIL_ITEM_HEIGHT_PX = 16;

	let {
		items = [],
		navigation = 'rail',
		followOutput = true,
		followThreshold = DEFAULT_FOLLOW_THRESHOLD_PX,
		smooth = true,
		streaming = false,
		busy = false,
		label = 'Conversation',
		navigationLabel = 'Message navigation',
		onFollowChange,
		viewportClass = '',
		contentClass = '',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	let viewportEl = $state<HTMLElement | null>(null);
	let contentEl = $state<HTMLDivElement | null>(null);
	let isPinnedToBottom = $state(true);
	let canScrollUp = $state(false);
	let railOverflowing = $state(false);
	let discoveredItems = $state<ResolvedRailItem[]>([]);
	let activeRailId = $state('');
	let hoveredRailId = $state<string | null>(null);
	let focusedRailId = $state<string | null>(null);

	let programmaticScroll = false;
	let didInitialScroll = false;
	let scrollTimerId: ReturnType<typeof setTimeout> | undefined;
	const targetMap = new Map<string, HTMLElement>();

	/**
	 * Truncates a message string cleanly on a word boundary when possible.
	 *
	 * @param text - Raw normalized message string.
	 * @param limit - Maximum character count before ellipsis.
	 * @returns Truncated string with single-character ellipsis.
	 */
	function truncateMessageText(text: string, limit: number): string {
		if (text.length <= limit) return text;
		const excerpt = text.slice(0, limit);
		const boundary = excerpt.lastIndexOf(' ');
		/** Prefer word boundary when it falls within the trailing 35% of the excerpt. */
		const cutoff = boundary > limit * 0.65 ? boundary : limit;
		return `${excerpt.slice(0, cutoff).trim()}…`;
	}

	/**
	 * Extracts normalized plain text from a message DOM element.
	 *
	 * @param messageEl - Message container element.
	 * @returns Normalized single-line text content.
	 */
	function extractElementText(messageEl: HTMLElement): string {
		const surface =
			messageEl.querySelector<HTMLElement>('[data-slot="message-bubble-content"]') ??
			messageEl.querySelector<HTMLElement>('[data-slot="message-content"]') ??
			messageEl;
		return (surface.textContent ?? '').replace(/\s+/g, ' ').trim();
	}

	/**
	 * Builds a preview title and optional paired reply description for a message element.
	 *
	 * @param messageEl - Primary message DOM element.
	 * @param assistantEl - Optional subsequent assistant response element for user turns.
	 * @returns Object containing truncated label and optional description.
	 */
	function buildMessagePreview(
		messageEl: HTMLElement,
		assistantEl?: HTMLElement
	): { label: string; description?: string } {
		const text = extractElementText(messageEl);
		if (!text) {
			return { label: 'Message' };
		}

		if (text.length <= PREVIEW_TITLE_LENGTH) {
			const replyText = assistantEl ? extractElementText(assistantEl) : '';
			return {
				label: text,
				description: replyText
					? truncateMessageText(replyText, PREVIEW_DESCRIPTION_LENGTH)
					: undefined
			};
		}

		const titleExcerpt = text.slice(0, PREVIEW_TITLE_LENGTH);
		const titleBoundary = titleExcerpt.lastIndexOf(' ');
		const titleEnd =
			titleBoundary > PREVIEW_TITLE_LENGTH * 0.65 ? titleBoundary : PREVIEW_TITLE_LENGTH;
		const labelText = `${text.slice(0, titleEnd).trim()}…`;
		const replyText = assistantEl
			? extractElementText(assistantEl)
			: text.slice(titleEnd).trim();

		return {
			label: labelText,
			description: replyText
				? truncateMessageText(replyText, PREVIEW_DESCRIPTION_LENGTH)
				: undefined
		};
	}

	/**
	 * Updates the pinned state and notifies `onFollowChange` when the reader leaves or joins the live edge.
	 *
	 * @param next - Whether the viewport is currently following live output.
	 */
	function setFollowing(next: boolean): void {
		if (isPinnedToBottom === next) return;
		isPinnedToBottom = next;
		onFollowChange?.(next);
	}

	/**
	 * Computes which message turn is closest to the viewport center (or top/bottom edges)
	 * and highlights its corresponding tick on the right-hand rail.
	 */
	function updateActiveRailItem(): void {
		if (!viewportEl || targetMap.size === 0) return;

		const entries = [...targetMap.entries()];
		canScrollUp = viewportEl.scrollTop > 8;

		if (viewportEl.scrollTop <= followThreshold) {
			const firstId = entries[0]?.[0] ?? '';
			if (activeRailId !== firstId) activeRailId = firstId;
			return;
		}

		const distanceFromEnd =
			viewportEl.scrollHeight - viewportEl.scrollTop - viewportEl.clientHeight;
		if (distanceFromEnd <= followThreshold) {
			const lastId = entries[entries.length - 1]?.[0] ?? '';
			if (activeRailId !== lastId) activeRailId = lastId;
			return;
		}

		const viewportRect = viewportEl.getBoundingClientRect();
		const viewportCenter = viewportRect.top + viewportRect.height / 2;
		let nearestId = entries[0]?.[0] ?? '';
		let nearestDistance = Number.POSITIVE_INFINITY;

		for (const [id, element] of entries) {
			const rect = element.getBoundingClientRect();
			const messageCenter = rect.top + rect.height / 2;
			const distance = Math.abs(messageCenter - viewportCenter);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestId = id;
			}
		}

		if (activeRailId !== nearestId) {
			activeRailId = nearestId;
		}
	}

	/**
	 * Scans the scroll container for `[data-slot="message"]` nodes and merges them with any
	 * explicit `items` prop so every rail tick resolves to a real DOM node and preview card.
	 */
	function syncRailItems(): void {
		if (!contentEl || !viewportEl) return;

		const messageNodes = Array.from(
			contentEl.querySelectorAll<HTMLElement>('[data-slot="message"]')
		);
		targetMap.clear();

		const nextItems: ResolvedRailItem[] = [];

		if (items.length > 0) {
			items.forEach((item, index) => {
				const byId = contentEl?.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`);
				const fallbackNode = messageNodes[index];
				const resolvedNode = byId ?? fallbackNode;

				if (resolvedNode) {
					if (!resolvedNode.id) {
						resolvedNode.id = item.id;
					}
					targetMap.set(item.id, resolvedNode);
				}

				const autoPreview = resolvedNode
					? buildMessagePreview(
							resolvedNode,
							resolvedNode.dataset.from === 'user'
								? messageNodes
										.slice(index + 1)
										.find((candidate) => candidate.dataset.from === 'assistant')
								: undefined
						)
					: undefined;

				const role =
					item.role ??
					(resolvedNode?.dataset.from === 'user' ? 'user' : 'assistant');

				nextItems.push({
					id: item.id,
					label: item.label || autoPreview?.label || `Turn ${index + 1}`,
					description: item.description ?? autoPreview?.description,
					role,
					ariaLabel: `Jump to ${role} message ${index + 1} of ${items.length}: ${item.label}`
				});
			});
		} else {
			messageNodes.forEach((node, index) => {
				if (!node.id) {
					node.id = `aks-msg-rail-${index + 1}`;
				}
				targetMap.set(node.id, node);

				const role: 'user' | 'assistant' | 'system' =
					node.dataset.from === 'user'
						? 'user'
						: node.dataset.from === 'system'
							? 'system'
							: 'assistant';
				const nextAssistant =
					role === 'user'
						? messageNodes
								.slice(index + 1)
								.find((candidate) => candidate.dataset.from === 'assistant')
						: undefined;
				const preview = buildMessagePreview(node, nextAssistant);

				nextItems.push({
					id: node.id,
					label: preview.label,
					description: preview.description,
					role,
					ariaLabel: `Go to ${role} message ${index + 1} of ${messageNodes.length}`
				});
			});
		}

		const unchanged =
			discoveredItems.length === nextItems.length &&
			discoveredItems.every(
				(item, index) =>
					item.id === nextItems[index]?.id &&
					item.label === nextItems[index]?.label &&
					item.description === nextItems[index]?.description &&
					item.role === nextItems[index]?.role
			);
		if (!unchanged) {
			discoveredItems = nextItems;
		}
		railOverflowing = viewportEl.scrollHeight > viewportEl.clientHeight + 2;
		canScrollUp = viewportEl.scrollTop > 8;
		updateActiveRailItem();
	}

	/**
	 * Scrolls the conversation viewport to its bottom live edge without scrolling the outer document.
	 *
	 * @param behavior - Scroll animation behavior (`'smooth'` or `'auto'`).
	 */
	function scrollToEnd(behavior: ScrollBehavior = smooth ? 'smooth' : 'auto'): void {
		if (!viewportEl) return;

		programmaticScroll = true;
		viewportEl.scrollTo({
			top: viewportEl.scrollHeight,
			behavior
		});
		setFollowing(true);

		if (scrollTimerId) clearTimeout(scrollTimerId);
		scrollTimerId = setTimeout(
			() => {
				programmaticScroll = false;
				updateActiveRailItem();
			},
			behavior === 'smooth' ? PROGRAMMATIC_SCROLL_LOCK_MS : 0
		);
	}

	/**
	 * Scrolls a specific message item into the center of `viewportEl` when clicked from the rail.
	 *
	 * @param item - Target rail item to scroll to.
	 */
	function scrollToRailItem(item: ResolvedRailItem): void {
		if (!viewportEl) return;

		const isLast = discoveredItems[discoveredItems.length - 1]?.id === item.id;
		activeRailId = item.id;

		if (isLast) {
			scrollToEnd(smooth ? 'smooth' : 'auto');
			return;
		}

		const target =
			targetMap.get(item.id) ??
			contentEl?.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`);
		if (!target) return;

		setFollowing(false);
		programmaticScroll = true;

		const viewportRect = viewportEl.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();
		const centeredTop =
			viewportEl.scrollTop +
			targetRect.top -
			viewportRect.top -
			Math.max(16, (viewportEl.clientHeight - targetRect.height) / 2);
		const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

		viewportEl.scrollTo({
			top: Math.max(0, centeredTop),
			behavior
		});

		if (scrollTimerId) clearTimeout(scrollTimerId);
		scrollTimerId = setTimeout(
			() => {
				programmaticScroll = false;
				updateActiveRailItem();
			},
			behavior === 'smooth' ? PROGRAMMATIC_SCROLL_LOCK_MS : 0
		);
	}

	/**
	 * Handles user and programmatic scroll events inside the message viewport.
	 */
	function handleScroll(): void {
		if (!viewportEl) return;
		canScrollUp = viewportEl.scrollTop > 8;

		if (programmaticScroll) {
			updateActiveRailItem();
			return;
		}

		const distanceFromBottom =
			viewportEl.scrollHeight - viewportEl.scrollTop - viewportEl.clientHeight;
		setFollowing(distanceFromBottom <= followThreshold);
		updateActiveRailItem();
	}

	/**
	 * Immediately releases the programmatic scroll guard when the user interacts via wheel or touch.
	 */
	function releaseProgrammaticLock(): void {
		programmaticScroll = false;
	}

	/**
	 * Releases the live-edge lock when the user presses upward navigation keys.
	 *
	 * @param event - Keyboard event from the scrollable viewport.
	 */
	function handleViewportKeydown(event: KeyboardEvent): void {
		if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) {
			programmaticScroll = false;
		}
	}

	const displayedPreviewId = $derived(hoveredRailId ?? focusedRailId ?? null);
	const highlightedRailId = $derived(displayedPreviewId ?? activeRailId);
	const highlightedIndex = $derived(
		discoveredItems.findIndex((item) => item.id === highlightedRailId)
	);
	const activePreviewItem = $derived(
		displayedPreviewId
			? discoveredItems.find((item) => item.id === displayedPreviewId) ?? null
			: null
	);
	const activePreviewIndex = $derived(
		displayedPreviewId
			? discoveredItems.findIndex((item) => item.id === displayedPreviewId)
			: -1
	);
	const previewOffsetY = $derived.by(() => {
		if (activePreviewIndex < 0 || discoveredItems.length <= 1) return 0;
		const centerIndex = (discoveredItems.length - 1) / 2;
		const rawOffset = (activePreviewIndex - centerIndex) * RAIL_ITEM_HEIGHT_PX;
		return Math.max(-96, Math.min(96, Math.round(rawOffset)));
	});

	/**
	 * Computes the horizontal scale factor (0.28 to 1) for a rail tick based on its distance
	 * from the currently hovered or active turn, matching upstream `PreviewRail`.
	 *
	 * @param index - Index of the rail tick.
	 * @returns Scale factor between 0.28 and 1.
	 */
	function getTickScale(index: number): number {
		if (highlightedIndex < 0) return index === discoveredItems.length - 1 ? 1 : 0.35;
		const distance = Math.abs(index - highlightedIndex);
		if (distance === 0) return 1;
		if (distance === 1) return 0.68;
		if (distance === 2) return 0.44;
		return 0.28;
	}

	$effect(() => {
		const currentContent = contentEl;
		const currentViewport = viewportEl;
		const _explicitItems = items;
		if (!currentContent || !currentViewport || !_explicitItems) return;

		untrack(() => {
			syncRailItems();
			if (followOutput && !didInitialScroll) {
				didInitialScroll = true;
				scrollToEnd('auto');
			}
		});

		const resizeObserver =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => {
						untrack(() => {
							syncRailItems();
							if (followOutput && isPinnedToBottom) {
								scrollToEnd(smooth ? 'smooth' : 'auto');
							}
						});
					})
				: null;

		const mutationObserver =
			typeof MutationObserver !== 'undefined'
				? new MutationObserver(() => {
						untrack(() => {
							syncRailItems();
							if (followOutput && isPinnedToBottom) {
								scrollToEnd(smooth ? 'smooth' : 'auto');
							}
						});
					})
				: null;

		resizeObserver?.observe(currentContent);
		resizeObserver?.observe(currentViewport);
		mutationObserver?.observe(currentContent, {
			childList: true,
			characterData: true,
			subtree: true
		});

		currentViewport.addEventListener('wheel', releaseProgrammaticLock, { passive: true });
		currentViewport.addEventListener('touchstart', releaseProgrammaticLock, { passive: true });
		currentViewport.addEventListener('keydown', handleViewportKeydown);

		return () => {
			currentViewport.removeEventListener('wheel', releaseProgrammaticLock);
			currentViewport.removeEventListener('touchstart', releaseProgrammaticLock);
			currentViewport.removeEventListener('keydown', handleViewportKeydown);
			resizeObserver?.disconnect();
			mutationObserver?.disconnect();
			if (scrollTimerId) clearTimeout(scrollTimerId);
		};
	});

	$effect(() => {
		if (streaming && followOutput) {
			untrack(() => {
				if (isPinnedToBottom && viewportEl) {
					scrollToEnd('auto');
				}
			});
		}
	});
</script>

<div {...rest}
	data-slot="message-scroller"
	class={cn('relative flex min-h-0 flex-1 overflow-hidden', className)}
>
	<section
		bind:this={viewportEl}
		onscroll={handleScroll}
		aria-label={label}
		class="aks-scrollport h-full min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [overflow-anchor:none] {navigation ===
			'rail' && discoveredItems.length > 1
			? 'pr-9 sm:pr-11'
			: ''} {viewportClass}"
	>
		{#if canScrollUp}
			<div
				aria-hidden="true"
				class="pointer-events-none sticky top-0 right-0 left-0 z-10 h-4 bg-gradient-to-b from-chat-surface to-transparent"
			></div>
		{/if}

		<div
			bind:this={contentEl}
			role="log"
			aria-live="polite"
			aria-relevant="additions text"
			aria-busy={busy || streaming}
			class="mx-auto w-full max-w-3xl space-y-7 px-5 py-6 sm:px-8 {contentClass}"
		>
			{@render children()}
		</div>
	</section>

	{#if navigation === 'rail' && discoveredItems.length > 1}
		<nav
			aria-label={navigationLabel}
			onpointerleave={() => (hoveredRailId = null)}
			class="absolute inset-y-3 right-1.5 z-20 flex w-7 flex-col items-end justify-center py-1 select-none"
		>
			{#each discoveredItems as item, idx (item.id)}
				{@const isHighlighted = item.id === highlightedRailId}
				{@const scale = getTickScale(idx)}
				<button
					type="button"
					data-slot="preview-rail-item"
					aria-label={item.ariaLabel}
					aria-current={item.id === activeRailId ? 'location' : undefined}
					style="height: {RAIL_ITEM_HEIGHT_PX}px;"
					onpointerenter={() => (hoveredRailId = item.id)}
					onfocus={() => (focusedRailId = item.id)}
					onblur={() => {
						if (focusedRailId === item.id) focusedRailId = null;
					}}
					onclick={() => scrollToRailItem(item)}
					class="group relative flex w-7 items-center justify-end pr-1 focus-visible:outline-none"
				>
					<span
						data-slot="preview-rail-tick"
						aria-hidden="true"
						style="transform: scaleX({scale});"
						class="block h-[2px] w-4 origin-right rounded-full transition-transform duration-150 ease-out {isHighlighted
							? 'bg-fg-main'
							: item.role === 'user'
								? 'bg-accent-primary/70 group-hover:bg-fg-main'
								: 'bg-fg-light/60 group-hover:bg-fg-main'}"
					></span>
				</button>
			{/each}
		</nav>

		{#if activePreviewItem && activePreviewIndex >= 0}
			<div
				aria-hidden="true"
				style="top: calc(50% + {previewOffsetY}px);"
				transition:fade={{ duration: 120 }}
				class="pointer-events-none absolute right-9 z-30 w-64 max-w-[calc(100%-3rem)] -translate-y-1/2 transition-[top] duration-150 ease-out"
			>
				<div
					data-slot="preview-rail-card"
					class="overflow-hidden rounded-soft border border-chat-border bg-card-bg p-3 ak-shadow-soft"
				>
					<div class="mb-1 flex items-center justify-between gap-2">
						<span
							class="rounded-full bg-chat-user px-2 py-px text-[10px] font-medium text-fg-light"
						>
							{activePreviewItem.role === 'user' ? 'User Prompt' : 'Agent Turn'}
						</span>
						<span class="font-mono text-[10px] text-fg-light">
							{activePreviewIndex + 1} / {discoveredItems.length}
						</span>
					</div>
					<p
						data-slot="preview-rail-title"
						class="line-clamp-1 text-xs font-medium leading-4 text-fg-main"
					>
						{activePreviewItem.label}
					</p>
					{#if activePreviewItem.description}
						<p
							data-slot="preview-rail-description"
							class="mt-1 line-clamp-2 text-xs leading-4 text-fg-light"
						>
							{activePreviewItem.description}
						</p>
					{/if}
				</div>
			</div>
		{/if}
	{/if}

	{#if !isPinnedToBottom && railOverflowing}
		<button
			type="button"
			transition:rise={{ y: 4 }}
			onclick={() => scrollToEnd('smooth')}
			class={pillClass('secondary', 'sm', 'absolute bottom-3 left-1/2 z-20 -translate-x-1/2 ak-shadow-soft')}
		>
			<ArrowDown aria-hidden="true" class="size-3" />
			<span>Jump to latest</span>
		</button>
	{/if}
</div>

<style>
	.aks-scrollport {
		container-type: scroll-state;
		scrollbar-width: thin;
	}
</style>
