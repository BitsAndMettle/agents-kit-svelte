<!--
	@component
	The confirmed change model: a consequence review inside a real `<form method="post">`, usually
	addressed by a route (`?dialog=…`, opened by a link and closed by `closeHref`). It lists what
	happens and what stays, can ask who takes over dependents (`reassign`), and can require a typed
	phrase for unrecoverable loss (native `required` and `pattern`, so the gate works without
	JavaScript). One danger submit, a Cancel link, and a footnote that says whether it can be
	undone. It becomes a bottom sheet on a phone. Your server must check the phrase again.

	Other attributes (and `enhance`) go on its `<form>`. Inside a SettingsForm it never nests a
	form: with JavaScript its fields belong to a form of its own outside the page form; without
	it, Confirm posts the surrounding form to `action` (the `intent` tells the posts apart) and
	its fields are switched off while it is closed. There, form attributes and `enhance` belong on
	the SettingsForm: other attributes are not applied (development warns once).
-->
<script lang="ts" module>
	/** Every word ConsequenceDialog shows or announces. */
	export interface ConsequenceDialogLabels {
		cancel: string;
		/** Announced while the action runs. */
		pending: string;
		/** "Type “Northwind Studio” to confirm". */
		typeToConfirm: (phrase: string) => string;
		/** Describes the confirm button until the phrase matches. */
		phraseMismatch: string;
		/** Shown when `onConfirm` fails without a message of its own. */
		failed: string;
		irreversible: string;
		reversible: string;
		/** Accessible name of one dependent's replacement select. */
		replacementFor: (label: string) => string;
		/** Heading of a flat consequence list (its effects). */
		whatHappens: string;
		/** Heading of a flat list's `ok` items, when it has effects too. */
		whatStays: string;
	}

	/** What `onConfirm` receives. */
	export interface ConsequenceConfirmContext {
		/** The typed phrase, when one was asked for. */
		typed?: string;
		/** The chosen replacement per dependent id. */
		reassign: Record<string, string>;
		data: FormData;
	}
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn } from '../../ui/cn';
	import type { Part, ChangeReason } from '../../headless/runtime/parts';
	import { Alert } from '../../primitives/display';
	import { Button } from '../../primitives/actions';
	import { Input, NativeSelect } from '../../primitives/form';
	import { FormSubmit } from '../../primitives/form/submit.svelte';
	import { Dialog } from '../../primitives/overlays';
	import { matchesPhrase, phrasePattern, type PhraseOptions } from '../shared/confirm';
	import { getSettingsDraft } from '../shared/context';
	import { isDev } from '../shared/env';
	import { openerFor } from '../shared/focus';
	import { ReadyGate } from '../shared/ready.svelte';
	import { RECIPES, SETTINGS_CONTAINER } from '../shared/recipes';
	import type { ConsequenceGroup, ConsequenceItem, ReassignSpec, SettingsHandler, SettingsIcon, SettingsResult } from '../shared/types';
	import ConsequenceList from './ConsequenceList.svelte';
	import { groupFlatConsequences, isGroupList, readReassign, reassignDefaults, reassignFieldName, reassignOptions } from './helpers';

	export interface Props extends Omit<HTMLFormAttributes, 'class' | 'children' | 'title' | 'method' | 'onsubmit' | 'hidden'> {
		/** Names the dialog ("Delete Northwind Studio?"). */
		title: string;
		/** The lead sentence under the title. */
		description?: string | Snippet;
		/** An icon beside the identity line. */
		icon?: SettingsIcon;
		/** What is affected, as one line ("Northwind Studio · 6 members · 2.4 GB"). */
		identity?: Snippet;
		/** Whether it is open. Bindable. In route mode, derive it from the URL. */
		open?: boolean;
		/** Route mode: the URL that closes it. Cancel is a link here, and Escape and a backdrop press follow it. */
		closeHref?: string;
		/** Server-render it open (route mode), so it works before hydration and without JavaScript. */
		ssrOpen?: boolean;
		/** Renders an opener button; spread the part onto a `<button>`. Route mode uses a link instead. */
		trigger?: Snippet<[Part<HTMLButtonElement>]>;
		/** The opener's `rememberOpener` key: focus returns to it after closing, even across a navigation. */
		openerKey?: string;
		/** What happens: one list, or titled groups ("What happens", "What stays"). */
		consequences?: ConsequenceItem[] | ConsequenceGroup[];
		/** A warning shown under the consequences. */
		warning?: string | Snippet;
		/** Dependents that need a new owner first, each with a select. */
		reassign?: ReassignSpec;
		/** Require typing this phrase (for unrecoverable loss only). Posted as `confirm`. */
		confirmPhrase?: string;
		/** How the phrase is compared. Default: case-sensitive, surrounding spaces ignored. */
		phraseOptions?: PhraseOptions;
		/** The confirm button's label, naming the action ("Delete team"). */
		confirmLabel: string;
		/** `danger` (default) for destructive actions; `accent` otherwise. */
		tone?: 'danger' | 'accent';
		/** Where a native post goes. */
		action?: string;
		/** Posted as `intent`. */
		intent?: string;
		/** Extra values for the post, rendered as hidden inputs. */
		hidden?: Record<string, string>;
		/**
		 * Runs the action. A promise keeps the dialog busy (double submits ignored, Cancel off);
		 * `{ error }` or a rejection keeps it open with the failure. On success it closes, or in
		 * route mode stays for your app to navigate to `closeHref`. Without it the form posts natively.
		 */
		onConfirm?: SettingsHandler<[ConsequenceConfirmContext]>;
		/** A result from a native post round trip. */
		result?: SettingsResult;
		/** Controlled pending state (SvelteKit `enhance`). */
		pending?: boolean;
		/** Whether the action can be undone later; the footnote says so. Omit for no footnote. */
		reversible?: boolean;
		/** A footnote that replaces the reversibility line. */
		footnote?: string | Snippet;
		size?: 'sm' | 'md' | 'lg';
		/** Extra fields inside the form (a successor choice, a reason). */
		children?: Snippet;
		onOpenChange?: (open: boolean, reason: ChangeReason) => void;
		/** The `<form>` element (inside a SettingsForm, its own form outside the page form). Bindable. */
		ref?: HTMLFormElement | null;
		labels?: Partial<ConsequenceDialogLabels>;
		/** Classes for the dialog. Other attributes go on its `<form>`; inside a SettingsForm there is none, so put them (and `enhance`) on the SettingsForm. */
		class?: string;
	}

	let {
		title,
		description,
		icon: Icon,
		identity,
		open = $bindable(false),
		closeHref,
		ssrOpen = false,
		trigger,
		openerKey,
		consequences,
		warning,
		reassign,
		confirmPhrase,
		phraseOptions,
		confirmLabel,
		tone = 'danger',
		action,
		intent,
		hidden,
		onConfirm,
		result,
		pending,
		reversible,
		footnote,
		size = 'md',
		children,
		onOpenChange,
		ref = $bindable(null),
		labels,
		class: className = '',
		...rest
	}: Props = $props();

	const text = $derived<ConsequenceDialogLabels>({
		cancel: 'Cancel',
		pending: 'Working…',
		typeToConfirm: (phrase) => `Type “${phrase}” to confirm`,
		phraseMismatch: 'Type the text exactly as shown to continue.',
		failed: 'That did not work. Nothing was changed.',
		irreversible: 'This can’t be undone.',
		reversible: 'You can undo this later.',
		replacementFor: (label) => `New owner for ${label}`,
		whatHappens: 'What happens',
		whatStays: 'What stays',
		...labels
	});

	/** Inside a SettingsForm: no `<form>` of its own in the markup (forms never nest). */
	const inDraft = getSettingsDraft() !== undefined;

	// Vite (and SvelteKit) set this in development only; elsewhere it is undefined.
	if (isDev() && inDraft) {
		let warned = false;
		$effect(() => {
			// Attachments (`{@attach enhance}`) arrive under symbol keys.
			const names = Reflect.ownKeys(rest).map((key) => (typeof key === 'symbol' ? 'an attachment' : key));
			if (warned || names.length === 0) return;
			warned = true;
			console.warn(`ConsequenceDialog: inside a SettingsForm it has no <form> of its own, so ${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} not applied. Put form attributes and enhance on the SettingsForm.`);
		});
	}

	const id = $props.id();
	const formId = `${id}-form`;
	const phraseId = `${id}-phrase`;
	const mismatchId = `${id}-mismatch`;
	const summaryId = `${id}-summary`;

	let typed = $state('');
	let phraseInput = $state<HTMLInputElement | null>(null);
	let cancelRef = $state<HTMLElement | null>(null);
	let reassigned = $state<Record<string, string>>({});

	const defaults = $derived(reassign ? reassignDefaults(reassign) : {});
	const reassignValue = $derived({ ...defaults, ...reassigned });
	const matched = $derived(!confirmPhrase || matchesPhrase(typed, confirmPhrase, phraseOptions));
	// Without JavaScript the native `pattern` gates the post, so the button is never shown as blocked then.
	const ready = new ReadyGate();
	const blocked = $derived(ready.current && !matched);
	const groups = $derived.by<ConsequenceGroup[] | undefined>(() => {
		if (!consequences || consequences.length === 0) return undefined;
		if (isGroupList(consequences)) return [...consequences];
		const split = groupFlatConsequences(consequences as ConsequenceItem[], text.whatHappens, text.whatStays);
		return split.length > 1 ? split : undefined;
	});
	const flatItems = $derived<ConsequenceItem[] | undefined>(
		!groups && consequences && consequences.length > 0 && !isGroupList(consequences) ? (consequences as ConsequenceItem[]) : undefined
	);

	const submit = new FormSubmit<ConsequenceConfirmContext>({
		handler: () =>
			onConfirm &&
			((values) => {
				// The browser's pattern check already ran; this is the same rule in code.
				if (confirmPhrase && !matchesPhrase(values.typed ?? '', confirmPhrase, phraseOptions)) return { error: text.phraseMismatch };
				return onConfirm(values);
			}),
		read: (data) => ({
			typed: confirmPhrase ? String(data.get('confirm') ?? '') : undefined,
			reassign: reassign ? readReassign(data, reassign) : {},
			data
		}),
		pending: () => pending,
		error: () => result?.error,
		errors: () => result?.errors,
		genericError: () => text.failed,
		onSuccess: () => {
			if (closeHref === undefined) open = false;
		}
	});

	// Text typed before hydration counts.
	$effect(() => {
		if (phraseInput && phraseInput.value) typed = phraseInput.value;
	});

	// Every open starts fresh: no earlier error, phrase or choice. Watches `open` itself, so a
	// route that opens it again (a controlled `open`) resets it too. An open it starts with keeps
	// what was typed before hydration.
	let wasOpen = untrack(() => open);
	$effect(() => {
		const now = open;
		untrack(() => {
			if (now && !wasOpen) {
				submit.clear();
				typed = '';
				reassigned = {};
			}
			wasOpen = now;
		});
	});

	const busy = $derived(submit.pending);

	// Inside a SettingsForm, with JavaScript: a form of its own at the end of the page, which the
	// fields join through their `form` attribute, so FormSubmit and a native post work as usual.
	let ownForm = $state<HTMLFormElement | null>(null);
	$effect(() => {
		if (!inDraft) return;
		const form = document.createElement('form');
		form.id = formId;
		form.method = 'post';
		form.hidden = true;
		form.addEventListener('submit', submit.onsubmit);
		document.body.append(form);
		ownForm = form;
		ref = form;
		return () => {
			form.removeEventListener('submit', submit.onsubmit);
			form.remove();
			ownForm = null;
			if (ref === form) ref = null;
		};
	});
	$effect(() => {
		if (!ownForm) return;
		if (action === undefined) ownForm.removeAttribute('action');
		else ownForm.setAttribute('action', action);
	});

	/** Inside a SettingsForm before its own form exists (no JavaScript) its fields are the page form's: off while closed, so they never block or join a save. */
	const off = $derived(inDraft && !ownForm && !open);

	const CONTROLS = 'input, select, textarea, button, output, fieldset, object';
	/** Points every control inside (children included, and ones added later) at the own form. */
	const joinOwnForm: Attachment<HTMLElement> = (node) => {
		const join = () => node.querySelectorAll(CONTROLS).forEach((el) => el.hasAttribute('form') || el.setAttribute('form', formId));
		join();
		const observer = new MutationObserver(join);
		observer.observe(node, { childList: true, subtree: true });
		return () => observer.disconnect();
	};

	// The own form is outside the dialog, so FormSubmit cannot find the error to focus: do it here.
	let body = $state<HTMLElement | null>(null);
	$effect(() => {
		if (!inDraft || !submit.error || !body) return;
		untrack(() => body?.querySelector<HTMLElement>('[data-form-error]')?.focus());
	});
	const footnoteText = $derived(typeof footnote === 'string' ? footnote : reversible === undefined ? undefined : reversible ? text.reversible : text.irreversible);
	const FILLED: Record<'danger' | 'accent', string> = {
		danger: 'border-transparent bg-status-danger text-fg-inverse shadow-none hover:bg-status-danger/90',
		accent: ''
	};
</script>

{#snippet lead()}
	{#if typeof description === 'function'}
		<div class="mt-1 text-[13px] leading-5 text-fg-light">{@render description()}</div>
	{/if}
{/snippet}

{#snippet actions()}
	{#if footnoteText !== undefined || typeof footnote === 'function'}
		<p class={cn(RECIPES.note, 'm-0 mr-auto min-w-0 basis-full')}>
			{#if typeof footnote === 'function'}{@render footnote()}{:else}{footnoteText}{/if}
		</p>
	{/if}
	<span role="status" class="sr-only">{busy ? text.pending : ''}</span>
	{#if closeHref !== undefined}
		<Button href={closeHref} variant="ghost" bind:ref={cancelRef} disabled={busy} onclick={() => (open = false)}>{text.cancel}</Button>
	{:else}
		<Button variant="ghost" bind:ref={cancelRef} disabled={busy} onclick={() => (open = false)}>{text.cancel}</Button>
	{/if}
	<Button
		type="submit"
		form={inDraft && !ownForm ? undefined : formId}
		formaction={inDraft && !ownForm ? action : undefined}
		formmethod={inDraft && !ownForm ? 'post' : undefined}
		variant={tone === 'danger' ? 'danger' : 'accent'}
		loading={busy}
		softDisabled={blocked}
		aria-describedby={blocked ? mismatchId : undefined}
		class={FILLED[tone]}
	>
		{confirmLabel}
	</Button>
{/snippet}

<Dialog
	bind:open
	{title}
	description={typeof description === 'string' ? description : undefined}
	header={typeof description === 'function' ? lead : undefined}
	{trigger}
	{size}
	{closeHref}
	{ssrOpen}
	narrow="sheet"
	showClose={false}
	returnFocus={openerKey ? () => openerFor(openerKey) : undefined}
	initialFocus={() => phraseInput ?? cancelRef}
	dismiss={{ escape: () => !busy, outside: () => !busy }}
	{onOpenChange}
	footer={actions}
	aria-busy={busy || undefined}
	class={cn(busy && 'cursor-progress', className)}
>
	{#if inDraft}
		<!-- Forms never nest: a fieldset (off while closed) whose controls join the own form once it exists. Attributes meant for a form are not applied here. -->
		<fieldset bind:this={body} disabled={off} {@attach joinOwnForm} oninput={submit.oninput} class={cn(SETTINGS_CONTAINER, 'm-0 grid min-w-0 gap-4 border-0 p-0')}>
			{@render fields()}
		</fieldset>
	{:else}
		<form {...rest} bind:this={ref} id={formId} method="post" {action} onsubmit={submit.onsubmit} oninput={submit.oninput} class={cn(SETTINGS_CONTAINER, 'grid min-w-0 gap-4')}>
			{@render fields()}
		</form>
	{/if}
</Dialog>

{#snippet fields()}
		{#if intent !== undefined}<input type="hidden" name="intent" value={intent} />{/if}
		{#each Object.entries(hidden ?? {}) as [name, value] (name)}
			<input type="hidden" {name} {value} />
		{/each}

		{#if identity || Icon}
			<div class="flex min-w-0 items-center gap-3 rounded-control border border-card-border bg-canvas-secondary/60 px-3 py-2.5">
				{#if Icon}
					<span aria-hidden="true" class={cn(RECIPES.iconTile, tone === 'danger' ? 'bg-status-danger-subtle text-status-danger' : 'bg-accent-subtle text-accent-primary')}><Icon /></span>
				{/if}
				{#if identity}<div class="min-w-0 flex-1 text-[13px] leading-5 text-fg-main">{@render identity()}</div>{/if}
			</div>
		{/if}

		{#if groups}
			<ConsequenceList {groups} headingLevel={3} />
		{:else if flatItems}
			<ConsequenceList items={flatItems} heading={text.whatHappens} headingLevel={3} />
		{/if}

		{#if warning}
			<Alert tone="warning">
				{#if typeof warning === 'string'}{warning}{:else}{@render warning()}{/if}
			</Alert>
		{/if}

		{#if reassign}
			{@const prefix = `${id}-reassign`}
			<fieldset class="m-0 min-w-0 border-0 p-0" aria-describedby={reassign.description ? `${prefix}-description` : undefined}>
				<legend class="m-0 p-0 text-xs font-semibold text-fg-main">{reassign.label}</legend>
				{#if reassign.description}<p id={`${prefix}-description`} class="m-0 mt-0.5 text-xs leading-5 text-fg-light">{reassign.description}</p>{/if}
				<ul role="list" class="m-0 mt-2 grid list-none gap-0 overflow-hidden rounded-control border border-card-border p-0">
					{#each reassign.dependents as dependent, index (dependent.id)}
						<li class="flex min-w-0 flex-col gap-2 border-t border-canvas-border px-3 py-2.5 first:border-t-0 @lg/settings:flex-row @lg/settings:items-center @lg/settings:justify-between">
							<div class="min-w-0">
								<p class="m-0 flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-fg-main">
									{dependent.label}
									{#if dependent.tag}<span class="rounded-full bg-canvas-secondary px-1.5 text-[11px] font-medium text-fg-light">{dependent.tag}</span>{/if}
								</p>
								{#if dependent.description}<p class="m-0 text-xs text-fg-light">{dependent.description}</p>{/if}
							</div>
							<NativeSelect
								id={`${prefix}-${index}`}
								name={reassignFieldName(reassign, dependent.id)}
								aria-label={text.replacementFor(dependent.label)}
								options={reassignOptions(reassign, dependent.id)}
								value={reassignValue[dependent.id]}
								defaultValue={defaults[dependent.id]}
								onValueChange={(value) => (reassigned = { ...reassigned, [dependent.id]: value })}
								disabled={busy}
								size="sm"
								class="@lg/settings:w-48"
							/>
						</li>
					{/each}
				</ul>
				{#if reassign.summary}
					<p id={summaryId} role="status" class="m-0 mt-1.5 text-xs text-fg-light">{reassign.summary(reassignValue)}</p>
				{/if}
			</fieldset>
		{/if}

		{@render children?.()}

		{#if confirmPhrase}
			<div class="grid gap-1.5">
				<label for={phraseId} class="text-xs font-medium text-fg-main">{text.typeToConfirm(confirmPhrase)}</label>
				<Input
					id={phraseId}
					name="confirm"
					bind:ref={phraseInput}
					required
					pattern={phrasePattern(confirmPhrase, phraseOptions)}
					autocomplete="off"
					spellcheck={false}
					autocapitalize="off"
					aria-describedby={matched ? undefined : mismatchId}
					value={typed}
					onValueChange={(value) => (typed = value)}
					disabled={busy}
				/>
				<p id={mismatchId} hidden={matched} class="m-0 text-xs text-fg-light">{text.phraseMismatch}</p>
			</div>
		{/if}

		{#if submit.error}
			<Alert tone="danger" live data-form-error tabindex={-1} description={submit.error} class="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40" />
		{/if}
{/snippet}
