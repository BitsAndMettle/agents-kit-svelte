<!--
	@component
	The staged model's host: a real `<form method="post">` that creates a `SettingsDraft` and
	publishes it, so rows and controls inside switch to staged mode and drop their own forms.
	Dirty state is the DOM diff against the server-rendered defaults (or a controlled `changes`
	list). It posts the revision, runs `onSubmit` (or posts natively), keeps the draft on a
	conflict, and holds a navigation while dirty with a small leave dialog. It owns implicit
	submission: Enter in a field always saves, even when an intent or danger button comes first.
-->
<script lang="ts" module>
	/** Every word SettingsForm shows or announces. */
	export interface SettingsFormLabels {
		/** Shown when the submit handler throws or rejects. */
		genericError: string;
		/** Announced after a save when no SaveBar is inside the form. */
		saved: string;
		leaveTitle: string;
		leaveDescription: (count: number) => string;
		/** Names the list of what would be lost. */
		changesList: string;
		saveAndLeave: string;
		leave: string;
		stay: string;
		/** Shown in the leave dialog when "Save and leave" could not save. */
		leaveFailed: string;
		/** Change text for a lone checkbox or switch. */
		on: string;
		off: string;
		/** Spoken between a change's saved and new value ("from 90 days to 30 days"). */
		from: string;
		to: string;
		/** Stands in for an empty new value. */
		empty: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { Dialog } from '../../primitives/overlays';
	import { SettingsDraft, type SettingsSubmitHandler } from '../shared/staged.svelte';
	import { setSettingsDraft } from '../shared/context';
	import type { SettingsChange, SettingsFieldDescriptor, SettingsResult } from '../shared/types';
	import { SaveBarPresence, setSaveBarPresence } from './presence.svelte';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'onsubmit' | 'method' | 'hidden'> {
		/** Where a native post goes (a server form action). */
		action?: string;
		/** How each staged field is named in change text. Rows with a `name` add theirs. Undescribed fields never count as unsaved. */
		fields?: SettingsFieldDescriptor[];
		/** The revision the form was rendered from; posted as a hidden field so the server can detect a stale save. */
		revision?: string | number;
		/** The hidden field's name. Default `revision`. */
		revisionName?: string;
		/** Extra values for the post, rendered as hidden inputs. */
		hidden?: Record<string, string>;
		/**
		 * Saves the form: gets the posted values and `{ changes, revision, data, event }`. Return
		 * nothing (or `{}`) on success, `{ errors }`, `{ error }` or `{ conflict }`. Without it the
		 * form posts natively. A rejection shows `labels.genericError`.
		 */
		onSubmit?: SettingsSubmitHandler;
		/** A result from a native post round trip or a server form action. */
		result?: SettingsResult;
		/** Controlled pending state (SvelteKit `enhance`); wins over the handler's own. */
		pending?: boolean;
		/** A controlled change list, for apps that keep drafts across sections. Without it the form diffs its own controls. */
		changes?: SettingsChange[];
		/** Called whenever the unsaved changes change (feeds navigation dots and attention lists). */
		onDirtyChange?: (changes: SettingsChange[]) => void;
		/** Hold navigations and tab closes while there are unsaved changes. Default true. */
		guardLeave?: boolean;
		/** The draft, for your router (`controller.guard.request(proceed)` in `beforeNavigate`). Bindable, read only. */
		controller?: SettingsDraft;
		/** The rows, controls and SaveBar. Receives the draft. */
		children: Snippet<[SettingsDraft]>;
		/** The `<form>` element. Bindable. */
		ref?: HTMLFormElement | null;
		labels?: Partial<SettingsFormLabels>;
		class?: string;
	}

	let {
		action,
		fields,
		revision,
		revisionName = 'revision',
		hidden,
		onSubmit,
		result,
		pending,
		changes,
		onDirtyChange,
		guardLeave = true,
		controller = $bindable(),
		children,
		ref = $bindable(null),
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<SettingsFormLabels>({
		genericError: "Couldn't save. Your changes are still here.",
		saved: 'Changes saved.',
		leaveTitle: 'Leave without saving?',
		leaveDescription: (n) => (n === 1 ? 'You have 1 unsaved change. It will be lost if you leave.' : `You have ${n} unsaved changes. They will be lost if you leave.`),
		changesList: 'Unsaved changes',
		saveAndLeave: 'Save and leave',
		leave: 'Leave without saving',
		stay: 'Keep editing',
		leaveFailed: "Couldn't save, so you are still here. Your changes are kept.",
		on: 'On',
		off: 'Off',
		from: 'from',
		to: 'to',
		empty: 'empty',
		...labels
	});

	const draft = new SettingsDraft({
		fields: () => fields,
		changes: () => changes,
		revision: () => revision,
		submit: () => onSubmit,
		result: () => result,
		pending: () => pending,
		onDirtyChange: () => onDirtyChange,
		genericError: () => text.genericError,
		guardLeave: () => guardLeave,
		words: () => ({ on: text.on, off: text.off })
	});
	setSettingsDraft(draft);

	const presence = new SaveBarPresence();
	setSaveBarPresence(presence);

	$effect.pre(() => {
		controller = draft;
	});

	/** After "Save and leave" failed, where focus goes once the dialog closes: the invalid field, else the error. */
	function failedLeaveTarget(): HTMLElement | null {
		if (!draft.guard.failed || !ref) return null;
		return ref.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])') ?? ref.querySelector<HTMLElement>('[data-form-error]');
	}

	let leaving = $state(false);

	async function decide(decision: 'save' | 'leave' | 'stay'): Promise<void> {
		if (leaving) return;
		if (decision !== 'save') return draft.guard.decide(decision);
		leaving = true;
		try {
			await draft.guard.decide('save');
		} finally {
			leaving = false;
		}
	}
</script>

<svelte:window onbeforeunload={draft.guard.beforeunload} />

<form {...rest} bind:this={ref} method="post" {action} {@attach draft.attach} onsubmit={draft.onsubmit} aria-busy={draft.pending || undefined} class={cn('min-w-0', className)}>
	<!-- The form's default button (the first submit in it): Enter in a field saves, with or without JavaScript, never an intent or danger button further down. -->
	<button type="submit" tabindex="-1" aria-hidden="true" data-settings-default class="sr-only"></button>
	{#if revision !== undefined}
		<input type="hidden" name={revisionName} value={String(revision)} />
	{/if}
	{#each Object.entries(hidden ?? {}) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}

	{@render children(draft)}

	{#if !presence.present}
		<!-- No SaveBar inside: the form shows its own outcome. -->
		{#if draft.error}
			<Alert tone="danger" live data-form-error tabindex={-1} description={draft.error} class="mt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40" />
		{/if}
		<p role="status" class="sr-only">{draft.status === 'saved' ? (draft.notice ?? text.saved) : ''}</p>
	{/if}

	<Dialog
		open={draft.guard.pendingLeave}
		onOpenChange={(open) => {
			if (!open && !leaving) void draft.guard.decide('stay');
		}}
		dismiss={{ escape: () => !leaving, outside: () => !leaving }}
		title={text.leaveTitle}
		description={text.leaveDescription(draft.dirtyCount)}
		size="sm"
		narrow="sheet"
		returnFocus={failedLeaveTarget}
	>
		<ul role="list" aria-label={text.changesList} class="m-0 grid list-none gap-1.5 rounded-control bg-canvas-secondary p-3 text-xs">
			{#each draft.changes as change (change.name)}
				<li class="min-w-0">
					<span class="font-medium text-fg-main">{change.label}</span>
					{#if change.from !== undefined}
						<span class="text-fg-light"><span class="sr-only">{` ${text.from} `}</span>{change.from}</span>
						<span aria-hidden="true" class="text-fg-light">→</span>
					{/if}
					<span class="text-fg-main"><span class="sr-only">{`${text.to} `}</span>{#if change.to}{change.to}{:else}<em>{text.empty}</em>{/if}</span>
				</li>
			{/each}
		</ul>
		{#if draft.guard.failed}
			<Alert tone="danger" live description={text.leaveFailed} class="mt-3" />
		{/if}
		{#snippet footer()}
			<Button variant="ghost" disabled={leaving} onclick={() => decide('stay')}>{text.stay}</Button>
			<Button variant="danger" disabled={leaving} onclick={() => decide('leave')}>{text.leave}</Button>
			{#if onSubmit}
				<Button variant="primary" loading={leaving} onclick={() => decide('save')}>{text.saveAndLeave}</Button>
			{/if}
		{/snippet}
	</Dialog>
</form>
