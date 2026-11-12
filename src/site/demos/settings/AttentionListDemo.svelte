<script lang="ts">
	import { Mail, PencilLine, UsersRound } from '@lucide/svelte';
	import { AttentionList } from '$lib/settings/shell';
	import type { AttentionItem, SettingsIcon } from '$lib/settings/shared';
	import { SAMPLE_ATTENTION } from '$lib/fixtures/settings';

	const ICONS: Record<string, SettingsIcon> = { unsaved: PencilLine, seats: UsersRound, email: Mail };

	/** The sample items with in-page links; the app decides what needs attention. */
	function fresh(prefix: string, dismissible = false): AttentionItem[] {
		return SAMPLE_ATTENTION.map((item) => ({ ...item, icon: ICONS[item.id], dismissible: dismissible || item.dismissible, action: { ...item.action, href: `?attention=${prefix}-${item.id}#attention-list` } }));
	}

	let wide = $state(fresh('attention-wide'));
	let narrow = $state(fresh('attention-narrow', true));
	let attempts = $state(0);
	let followed = $state('');

	/** A slow server call. In the wide list, dismissing the email reminder fails the first time, so the error shows. */
	function dismisser(list: 'wide' | 'narrow') {
		return async (id: string): Promise<void> => {
			await new Promise((resolve) => setTimeout(resolve, 600));
			if (list === 'wide' && id === 'email' && attempts++ === 0) throw new Error('offline');
			if (list === 'wide') wide = wide.filter((item) => item.id !== id);
			else narrow = narrow.filter((item) => item.id !== id);
		};
	}

	function follow(event: MouseEvent): void {
		const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href$="#attention-list"]');
		if (!anchor) return;
		event.preventDefault();
		followed = new URL(anchor.href).searchParams.get('attention') ?? '';
	}

	function reset(): void {
		wide = fresh('attention-wide');
		narrow = fresh('attention-narrow', true);
		attempts = 0;
		followed = '';
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="flex min-w-0 flex-col gap-5" onclick={follow}>
	<div class="flex min-w-0 flex-col gap-2">
		<p class="m-0 text-xs font-medium text-fg-light">Wide: boxed cards</p>
		<AttentionList data-testid="attention-wide" items={wide} onDismiss={dismisser('wide')} headingLevel={3} />
	</div>
	<div class="flex min-w-0 flex-wrap items-start gap-6">
		<div class="flex w-[360px] max-w-full flex-col gap-2">
			<p class="m-0 text-xs font-medium text-fg-light">Narrow: the whole row follows its action</p>
			<div class="rounded-window border border-card-border bg-canvas-secondary p-3">
				<AttentionList data-testid="attention-narrow" items={narrow} onDismiss={dismisser('narrow')} headingLevel={3} title="Before you go" />
			</div>
		</div>
		<div class="flex min-w-0 flex-1 basis-60 flex-col items-start gap-2 text-xs text-fg-light">
			<p class="m-0">With nothing to show, the list renders <code>hidden</code>:</p>
			<AttentionList data-testid="attention-empty" items={[]} headingLevel={3} />
			<p class="m-0">Followed: <span data-testid="attention-followed" class="text-fg-main">{followed || '—'}</span></p>
			<button type="button" class="rounded-control border border-card-border bg-card-bg px-3 py-1 text-[13px] text-fg-main hover:bg-canvas-secondary" onclick={reset}>Reset the demo</button>
		</div>
	</div>
</div>
